import dagre from 'dagre';
import type { Edge, Node } from '@xyflow/react';

export const NODE_WIDTH = 280;
export const NODE_HEIGHT = 600; // 측정 전 초기 추정값

export function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 100 });

  for (const node of nodes) {
    const width = node.measured?.width ?? NODE_WIDTH;
    const height = node.measured?.height ?? NODE_HEIGHT;
    graph.setNode(node.id, { width, height });
  }

  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  return nodes.map((node) => {
    const width = node.measured?.width ?? NODE_WIDTH;
    const height = node.measured?.height ?? NODE_HEIGHT;
    const { x, y } = graph.node(node.id);
    return {
      ...node,
      position: { x: x - width / 2, y: y - height / 2 },
    };
  });
}
