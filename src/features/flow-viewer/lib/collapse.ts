import type { Edge, Node } from '@xyflow/react';

export function buildChildrenMap(edges: Edge[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const edge of edges) {
    if (!map.has(edge.source)) map.set(edge.source, []);
    map.get(edge.source)!.push(edge.target);
  }
  return map;
}

// A node is hidden if every path from a root reaches it only through collapsed nodes.
export function computeHiddenIds(
  nodes: Node[],
  edges: Edge[],
  collapsedIds: Set<string>,
): Set<string> {
  if (collapsedIds.size === 0) return new Set();

  const children = buildChildrenMap(edges);
  const hasIncoming = new Set(edges.map((e) => e.target));
  const rootIds = nodes.filter((n) => !hasIncoming.has(n.id)).map((n) => n.id);

  const visited = new Set<string>();
  const queue = [...rootIds];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    if (!collapsedIds.has(id)) {
      for (const child of children.get(id) ?? []) {
        if (!visited.has(child)) queue.push(child);
      }
    }
  }

  const allIds = new Set(nodes.map((n) => n.id));
  return new Set([...allIds].filter((id) => !visited.has(id)));
}

// Count all hidden descendants of a collapsed node (BFS through hiddenIds).
export function countHiddenSubtree(
  nodeId: string,
  childrenMap: Map<string, string[]>,
  hiddenIds: Set<string>,
): number {
  let count = 0;
  const queue = [...(childrenMap.get(nodeId) ?? [])];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id) || !hiddenIds.has(id)) continue;
    visited.add(id);
    count++;
    queue.push(...(childrenMap.get(id) ?? []));
  }
  return count;
}
