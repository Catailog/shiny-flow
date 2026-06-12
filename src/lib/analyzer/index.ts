import { extractEdges } from './ast-parser';
import { buildGraph } from './graph-builder';
import { scanLayouts, scanRoutes } from './route-scanner';
import type { FlowGraph } from './types';
import { routeLastSegmentLabel } from './utils';

export async function analyzeProject(
  projectPath: string,
  onProgress?: (done: number, total: number) => void,
): Promise<FlowGraph> {
  const routes = scanRoutes(projectPath);
  const layouts = scanLayouts(projectPath);
  const total = routes.length;
  const rawEdges = await extractEdges(routes, projectPath, (done) => onProgress?.(done, total));
  const layoutGroupMap = buildLayoutGroupMap(routes, layouts);
  return buildGraph(routes, rawEdges, projectPath, layoutGroupMap);
}

function buildLayoutGroupMap(
  routes: { route: string }[],
  layouts: { route: string }[],
): Map<string, { id: string; label: string }> {
  const map = new Map<string, { id: string; label: string }>();

  // 가장 깊은(구체적인) 레이아웃이 우선 — 길이 내림차순 정렬
  const sorted = [...layouts].sort(
    (a, b) => b.route.split('/').filter(Boolean).length - a.route.split('/').filter(Boolean).length,
  );

  for (const layout of sorted) {
    if (layout.route === '/') continue; // 루트 레이아웃은 그룹 제외
    const prefix = `${layout.route}/`;
    const children = routes.filter((r) => r.route === layout.route || r.route.startsWith(prefix));
    if (children.length < 2) continue; // 1개짜리는 그룹 불필요

    const groupId = `lg:${layout.route}`;
    const label = routeLastSegmentLabel(layout.route);
    for (const child of children) {
      if (!map.has(child.route)) {
        map.set(child.route, { id: groupId, label });
      }
    }
  }

  return map;
}

export type { FlowEdge, FlowGraph, FlowNode } from './types';
