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
      layoutGroupId: n.layoutGroupId,
      layoutGroupLabel: n.layoutGroupLabel,
      screenshot: n.redirected ? undefined : n.screenshot,
      redirected: n.redirected,
      redirectedScreenshot: n.redirected ? n.screenshot : undefined,
    },
  }));

  const edges: Edge[] = graph.edges.map((e) => ({
    id: e.id,
    type: 'flowEdge',
    source: e.source,
    target: e.target,
    label: e.label ?? e.trigger,
    animated: e.trigger === 'redirect',
  }));

  return { nodes, edges };
}
