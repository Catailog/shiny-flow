import path from 'path';

import { extractEdges } from './ast-parser';
import { buildGraph } from './graph-builder';
import { scanLayouts, scanRoutes } from './route-scanner';
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

  // layout 외부로 나가는 엣지만 flow graph에 추가 (내부 링크는 그룹으로 대체)
  const externalLayoutEdges = layoutEdges.filter((e) => {
    const layout = layouts.find((l) => l.route === e.source);
    if (!layout || !routeSet.has(e.source)) return false;
    const prefix = `${layout.route}/`;
    return e.target !== layout.route && !e.target.startsWith(prefix);
  });

  // ID 중복 방지: 두 extractEdges 호출이 각각 e0부터 시작하므로 합친 뒤 재부여
  const allEdges = [...rawEdges, ...externalLayoutEdges].map((e, i) => ({ ...e, id: `e${i}` }));
  return buildGraph(routes, allEdges, projectPath, layoutGroupMap);
}

function buildLayoutGroupMap(
  routeSet: Set<string>,
  layouts: { route: string; filePath: string }[],
  layoutEdges: FlowEdge[],
): Map<string, { id: string; label: string }> {
  const map = new Map<string, { id: string; label: string }>();

  // layout route → 해당 layout이 링크하는 route 목록
  const layoutLinks = new Map<string, Set<string>>();
  for (const edge of layoutEdges) {
    if (!layoutLinks.has(edge.source)) layoutLinks.set(edge.source, new Set());
    layoutLinks.get(edge.source)!.add(edge.target);
  }

  // 가장 깊은(구체적인) 레이아웃이 우선 — 길이 내림차순 정렬
  const sorted = [...layouts].sort(
    (a, b) => b.route.split('/').filter(Boolean).length - a.route.split('/').filter(Boolean).length,
  );

  for (const layout of sorted) {
    if (layout.route === '/') continue; // 루트 레이아웃은 그룹 제외
    const links = layoutLinks.get(layout.route);
    if (!links) continue;

    // layout 하위 route이면서 실제로 존재하는 것만 멤버로 포함
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

export type { FlowEdge, FlowGraph, FlowNode } from './types';
