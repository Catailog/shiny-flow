import type { Edge, Node } from '@xyflow/react';

import type { FlowGraph } from '@/lib/analyzer';

export function graphToFlow(graph: FlowGraph): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = graph.nodes.map((n) => ({
    id: n.id,
    type: 'flowNode',
    position: { x: 0, y: 0 },
    data: {
      label: n.label,
      route: n.id,
      isDeadEnd: n.isDeadEnd,
    },
  }));

  const edges: Edge[] = graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label ?? e.trigger,
    animated: e.trigger === 'redirect',
  }));

  return { nodes, edges };
}
