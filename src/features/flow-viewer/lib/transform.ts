import type { Edge, Node } from '@xyflow/react';

import type { FlowGraph } from '@/lib/analyzer';

export function graphToFlow(graph: FlowGraph): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = graph.nodes.map((n) => {
    const catchAllParam = n.filePath.replace(/\\/g, '/').match(/\[\[\.\.\.([^\]]+)\]\]/)?.[1];
    const rawParamEntry = graph.defaultParams?.[n.id];
    const rawParams = Array.isArray(rawParamEntry) ? rawParamEntry[0] : rawParamEntry;
    const paramValues = rawParams ? { ...rawParams } : undefined;
    return {
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
        paramValues,
        catchAllParam,
      },
    };
  });

  const edges: Edge[] = graph.edges.map((e) => {
    const isRedirect = e.trigger === 'redirect';
    return {
      id: e.id,
      type: 'flowEdge',
      source: e.source,
      target: e.target,
      label: e.label ?? e.trigger,
      data: { lineStyle: isRedirect ? 'dashed' : 'solid' },
    };
  });

  return { nodes, edges };
}
