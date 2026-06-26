import path from 'path';

import { extractEdges } from './ast-parser';
import { buildGraph } from './graph-builder';
import { scanLayouts, scanRoutes } from './route-scanner';
import type { FlowEdge } from './types';
import type { FlowGraph } from './types';
import { routeLastSegmentLabel } from './utils';

export async function analyzeProject(
  projectPath: string,
  onProgress?: (done: number, total: number, currentFile: string) => void,
): Promise<FlowGraph> {
  const routes = scanRoutes(projectPath);
  const layouts = scanLayouts(projectPath);
  const total = routes.length;
  const routeSet = new Set(routes.map((r) => r.route));
  const rawEdges = await extractEdges(routes, projectPath, (done, currentFile) =>
    onProgress?.(done, total, path.relative(projectPath, currentFile)),
  );
  const layoutEdges = await extractEdges(layouts, projectPath);
  const layoutGroupMap = buildLayoutGroupMap(routeSet, layouts, layoutEdges);

  // Only add edges that exit the layout to the flow graph (internal links are replaced by the group)
  const externalLayoutEdges = layoutEdges.filter((e) => {
    const layout = layouts.find((l) => l.route === e.source);
    if (!layout || !routeSet.has(e.source)) return false;
    const prefix = `${layout.route}/`;
    return e.target !== layout.route && !e.target.startsWith(prefix);
  });

  // Reassign IDs after merging: both extractEdges calls start from e0
  const allEdges = [...rawEdges, ...externalLayoutEdges].map((e, i) => ({ ...e, id: `e${i}` }));
  return buildGraph(routes, allEdges, projectPath, layoutGroupMap);
}

function buildLayoutGroupMap(
  routeSet: Set<string>,
  layouts: { route: string; filePath: string }[],
  layoutEdges: FlowEdge[],
): Map<string, { id: string; label: string }> {
  const map = new Map<string, { id: string; label: string }>();

  // layout route → set of routes linked from that layout
  const layoutLinks = new Map<string, Set<string>>();
  for (const edge of layoutEdges) {
    if (!layoutLinks.has(edge.source)) layoutLinks.set(edge.source, new Set());
    layoutLinks.get(edge.source)!.add(edge.target);
  }

  // Deepest (most specific) layout wins — sort by depth descending
  const sorted = [...layouts].sort(
    (a, b) => b.route.split('/').filter(Boolean).length - a.route.split('/').filter(Boolean).length,
  );

  for (const layout of sorted) {
    if (layout.route === '/') continue; // root layout is excluded from groups
    const links = layoutLinks.get(layout.route);
    if (!links) continue;

    // Only include routes that exist under this layout's prefix
    const prefix = `${layout.route}/`;
    const members = [...links].filter(
      (r) => routeSet.has(r) && (r === layout.route || r.startsWith(prefix)),
    );
    if (members.length < 2) continue;

    const groupId = `lg:${layout.route}`;
    const label = routeLastSegmentLabel(layout.route);
    for (const member of members) {
      if (!map.has(member)) {
        map.set(member, { id: groupId, label });
      }
    }
  }

  return map;
}

export type { FlowEdge, FlowGraph, FlowNode, ParamSet } from './types';
