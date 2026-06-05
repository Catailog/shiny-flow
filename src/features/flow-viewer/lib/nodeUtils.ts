import type { Node } from '@xyflow/react';

import { GROUP_Z_INDEX, NODE_WIDTH } from './layout';

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

// ReactFlow requires parent nodes to appear BEFORE their children in the array.
// When a node's parentId is newly set, call this to move it after its parent if needed.
export function placeAfterParent(nodes: Node[], nodeId: string, parentId: string): Node[] {
  const nodeIdx = nodes.findIndex((n) => n.id === nodeId);
  const parentIdx = nodes.findIndex((n) => n.id === parentId);
  if (nodeIdx < 0 || parentIdx < 0 || nodeIdx > parentIdx) return nodes;
  const node = nodes[nodeIdx];
  const without = [...nodes.slice(0, nodeIdx), ...nodes.slice(nodeIdx + 1)];
  const newParentIdx = without.findIndex((n) => n.id === parentId);
  return [...without.slice(0, newParentIdx + 1), node, ...without.slice(newParentIdx + 1)];
}

export function computeGroupBounds(selected: Node[], allNodes: Node[], padding = 48) {
  const absPositions = selected.map((n) => getAbsolutePosition(n, allNodes));
  const minX = Math.min(...absPositions.map((p) => p.x)) - padding;
  const minY = Math.min(...absPositions.map((p) => p.y)) - padding;
  const maxX =
    Math.max(...selected.map((n, i) => absPositions[i].x + (n.measured?.width ?? NODE_WIDTH))) +
    padding;
  const maxY =
    Math.max(...selected.map((n, i) => absPositions[i].y + (n.measured?.height ?? 100))) + padding;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function recomputeGroupZIndexes(nodes: Node[]): Node[] {
  return nodes.map((n) => {
    if (n.type !== 'groupNode') return n;
    const zIndex = GROUP_Z_INDEX + groupDepth(n.id, nodes);
    return n.zIndex === zIndex ? n : { ...n, zIndex };
  });
}
