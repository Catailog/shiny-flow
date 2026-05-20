import type { FlowEdge, FlowGraph, FlowNode } from './types';

export function buildGraph(
  routes: { route: string; filePath: string }[],
  rawEdges: FlowEdge[],
  projectPath: string,
): FlowGraph {
  const routeSet = new Set(routes.map((r) => r.route));

  const nodes: FlowNode[] = routes.map(({ route, filePath }) => ({
    id: route,
    label: routeToLabel(route),
    filePath,
    isDeadEnd: false,
  }));

  const edges: FlowEdge[] = rawEdges.filter((edge) => edge.source && edge.target.startsWith('/'));

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
        label: routeToLabel(target),
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

function routeToLabel(route: string): string {
  if (route === '/') return 'Home';
  return route
    .split('/')
    .filter(Boolean)
    .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1))
    .join(' / ');
}
