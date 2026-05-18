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

  // source를 파일 경로 → 라우트로 매핑
  const fileToRoute = new Map(routes.map((r) => [r.filePath, r.route]));

  const edges: FlowEdge[] = rawEdges
    .map((edge) => ({
      ...edge,
      source: fileToRoute.get(edge.sourceFile) ?? inferRouteFromPath(edge.sourceFile),
    }))
    .filter((edge) => {
      // source와 target이 모두 알려진 라우트여야 함
      // target이 없는 경우도 포함 (외부 링크 제외)
      return edge.source && edge.target.startsWith('/');
    });

  // dead-end 탐지: 나가는 edge가 없는 노드
  const sourcesWithOutgoing = new Set(edges.map((e) => e.source));
  for (const node of nodes) {
    node.isDeadEnd = !sourcesWithOutgoing.has(node.id);
  }

  // 알려지지 않은 target이 있으면 노드로 추가 (동적 라우트 등)
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

function inferRouteFromPath(filePath: string): string {
  const match = filePath.match(/[/\\]app[/\\](.*)[/\\]page\./);
  if (!match) return '/unknown';
  const segments = match[1].split(/[/\\]/).filter((s) => !s.startsWith('(') && !s.startsWith('@'));
  return '/' + segments.join('/');
}
