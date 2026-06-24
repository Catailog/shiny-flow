import type { FlowEdge, FlowGraph, FlowNode } from './types';

// Checks if a concrete path matches a Next.js dynamic route pattern.
// Handles [param], [...param] (required catch-all), [[...param]] (optional catch-all).
function matchesDynamicPattern(path: string, pattern: string): boolean {
  const pathSegs = path.split('/').filter(Boolean);
  const patternSegs = pattern.split('/').filter(Boolean);
  let pi = 0;
  for (let si = 0; si < patternSegs.length; si++) {
    const seg = patternSegs[si];
    if (/^\[\[\.\.\./.test(seg)) return si === patternSegs.length - 1;
    if (/^\[\.\.\./.test(seg)) return pi < pathSegs.length && si === patternSegs.length - 1;
    if (pi >= pathSegs.length) return false;
    if (!/^\[/.test(seg) && pathSegs[pi] !== seg) return false;
    pi++;
  }
  return pi === pathSegs.length;
}

export function buildGraph(
  routes: { route: string; filePath: string }[],
  rawEdges: FlowEdge[],
  projectPath: string,
  layoutGroupMap: Map<string, { id: string; label: string }> = new Map(),
): FlowGraph {
  const routeSet = new Set(routes.map((r) => r.route));

  const nodes: FlowNode[] = routes.map(({ route, filePath }) => ({
    id: route,
    label: route,
    filePath,
    isDeadEnd: false,
    layoutGroupId: layoutGroupMap.get(route)?.id,
    layoutGroupLabel: layoutGroupMap.get(route)?.label,
  }));

  const filteredEdges: FlowEdge[] = rawEdges.filter(
    (edge) => edge.source && edge.target.startsWith('/'),
  );

  // Remap edge targets that don't exist as real routes but match a non-catch-all dynamic
  // route pattern. This prevents phantom node accumulation and keeps back-links visible on
  // the correct pattern node (e.g., /gallery/photo/2 → /gallery/photo/[id]).
  // Catch-all patterns are excluded here because their concrete variants are created by the
  // expansion step in analyze/route.ts — remapping them would lose per-variant edge accuracy.
  const dynamicPatterns = [...routeSet].filter((r) => r.includes('[') && !/\[\.\.\./.test(r));
  const edgeSeen = new Set<string>();
  const edges: FlowEdge[] = [];
  for (const e of filteredEdges) {
    let target = e.target;
    if (!routeSet.has(target) && dynamicPatterns.length > 0) {
      const match = dynamicPatterns.find((p) => matchesDynamicPattern(target, p));
      if (match) target = match;
    }
    const key = `${e.source}|${target}|${e.trigger}`;
    if (!edgeSeen.has(key)) {
      edgeSeen.add(key);
      edges.push(target !== e.target ? { ...e, target } : e);
    }
  }

  // dead-end 탐지: 나가는 edge가 없는 노드
  const sourcesWithOutgoing = new Set(edges.map((e) => e.source));
  for (const node of nodes) {
    node.isDeadEnd = !sourcesWithOutgoing.has(node.id);
  }

  // 알려지지 않은 target → 노드로 추가 (동적 라우트 등)
  const knownTargets = new Set(edges.map((e) => e.target));
  for (const target of knownTargets) {
    if (!routeSet.has(target)) {
      nodes.push({
        id: target,
        label: target,
        filePath: '',
        isDeadEnd: true,
      });
    }
  }

  return {
    nodes,
    edges,
    analyzedAt: new Date().toISOString(),
    projectPath,
  };
}
