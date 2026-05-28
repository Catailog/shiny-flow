import type { Node } from '@xyflow/react';

import { GROUP_Z_INDEX } from './layout';

export function getAbsolutePosition(node: Node, allNodes: Node[]): { x: number; y: number } {
  if (!node.parentId) return node.position;
  const parent = allNodes.find((n) => n.id === node.parentId);
  if (!parent) return node.position;
  const parentAbs = getAbsolutePosition(parent, allNodes);
  return { x: parentAbs.x + node.position.x, y: parentAbs.y + node.position.y };
}

export function isDescendantOf(nodeId: string, ancestorId: string, allNodes: Node[]): boolean {
  const node = allNodes.find((n) => n.id === nodeId);
  if (!node?.parentId) return false;
  if (node.parentId === ancestorId) return true;
  return isDescendantOf(node.parentId, ancestorId, allNodes);
}

function groupDepth(nodeId: string, allNodes: Node[], visited = new Set<string>()): number {
  if (visited.has(nodeId)) return 0;
  visited.add(nodeId);
  const node = allNodes.find((n) => n.id === nodeId);
  if (!node?.parentId) return 0;
  const parent = allNodes.find((n) => n.id === node.parentId);
  if (!parent || parent.type !== 'groupNode') return 0;
  return 1 + groupDepth(node.parentId, allNodes, visited);
}

export function recomputeGroupZIndexes(nodes: Node[]): Node[] {
  return nodes.map((n) => {
    if (n.type !== 'groupNode') return n;
    const zIndex = GROUP_Z_INDEX + groupDepth(n.id, nodes);
    return n.zIndex === zIndex ? n : { ...n, zIndex };
  });
}
