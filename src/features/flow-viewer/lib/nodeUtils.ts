import type { Node } from '@xyflow/react';

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
