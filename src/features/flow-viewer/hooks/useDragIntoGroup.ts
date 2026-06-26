import { useCallback, useState } from 'react';

import type { Node } from '@xyflow/react';

import { NODE_WIDTH } from '../lib/layout';
import {
  getAbsolutePosition,
  isDescendantOf,
  placeAfterParent,
  recomputeGroupZIndexes,
} from '../lib/nodeUtils';

export function useDragIntoGroup(nodes: Node[], setNodes: (fn: (prev: Node[]) => Node[]) => void) {
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  const findTargetGroup = useCallback((draggedNode: Node, allNodes: Node[]) => {
    const nodeW = draggedNode.measured?.width ?? NODE_WIDTH;
    const nodeH = draggedNode.measured?.height ?? 100;
    const { x: absX, y: absY } = getAbsolutePosition(draggedNode, allNodes);
    const centerX = absX + nodeW / 2;
    const centerY = absY + nodeH / 2;

    const groups = allNodes.filter(
      (n) =>
        n.type === 'groupNode' &&
        n.id !== draggedNode.id &&
        !isDescendantOf(n.id, draggedNode.id, allNodes),
    );

    const matching = groups.filter((g) => {
      const gAbs = getAbsolutePosition(g, allNodes);
      const gW = g.width ?? (g.style?.width as number | undefined) ?? 0;
      const gH = g.height ?? (g.style?.height as number | undefined) ?? 0;
      return (
        centerX >= gAbs.x && centerX <= gAbs.x + gW && centerY >= gAbs.y && centerY <= gAbs.y + gH
      );
    });

    // If multiple groups overlap, prefer the innermost (deepest child) group
    const group = matching.find(
      (g) => !matching.some((other) => isDescendantOf(other.id, g.id, allNodes)),
    );

    return { group, absX, absY };
  }, []);

  const handleNodeDrag = useCallback(
    (_e: React.MouseEvent, draggedNode: Node) => {
      if (draggedNode.type !== 'flowNode' && draggedNode.type !== 'groupNode') return;
      const { group } = findTargetGroup(draggedNode, nodes);
      setDragOverGroupId(group?.id ?? null);
    },
    [nodes, findTargetGroup],
  );

  const handleNodeDragStop = useCallback(
    (_e: React.MouseEvent, draggedNode: Node) => {
      setDragOverGroupId(null);
      if (draggedNode.type !== 'flowNode' && draggedNode.type !== 'groupNode') return;

      setNodes((prev) => {
        const { group: targetGroup, absX, absY } = findTargetGroup(draggedNode, prev);

        // Other selected nodes besides the drag target (only types that can enter a group)
        const otherSelected = prev.filter(
          (n) =>
            n.selected &&
            n.id !== draggedNode.id &&
            (n.type === 'flowNode' || n.type === 'groupNode') &&
            // Prevent circular nesting: exclude nodes that are ancestors of the target group
            !(targetGroup && isDescendantOf(targetGroup.id, n.id, prev)),
        );

        // Compute updates for the dragged node and all other selected nodes
        const updates = new Map<string, Partial<Node>>();

        // If parentId points to another selected node, it's moving with its parent — skip reparenting
        const selectedIds = new Set([draggedNode.id, ...otherSelected.map((n) => n.id)]);
        const movedWithParent = (n: Node) => !!n.parentId && selectedIds.has(n.parentId);

        if (targetGroup) {
          const tAbs = getAbsolutePosition(targetGroup, prev);
          if (draggedNode.parentId !== targetGroup.id && !movedWithParent(draggedNode)) {
            updates.set(draggedNode.id, {
              parentId: targetGroup.id,
              extent: undefined,
              position: { x: absX - tAbs.x, y: absY - tAbs.y },
            });
          }
          for (const n of otherSelected) {
            if (n.parentId === targetGroup.id) continue;
            if (movedWithParent(n)) continue;
            const nodeAbs = getAbsolutePosition(n, prev);
            updates.set(n.id, {
              parentId: targetGroup.id,
              extent: undefined,
              position: { x: nodeAbs.x - tAbs.x, y: nodeAbs.y - tAbs.y },
            });
          }
        } else {
          // Dragged outside any group
          if (draggedNode.parentId && !movedWithParent(draggedNode)) {
            updates.set(draggedNode.id, {
              parentId: undefined,
              extent: undefined,
              position: { x: absX, y: absY },
            });
          }
          for (const n of otherSelected) {
            if (!n.parentId) continue;
            if (movedWithParent(n)) continue;
            const nodeAbs = getAbsolutePosition(n, prev);
            updates.set(n.id, { parentId: undefined, extent: undefined, position: nodeAbs });
          }
        }

        if (updates.size === 0) return prev;

        let mapped = prev.map((n) => {
          const update = updates.get(n.id);
          return update ? { ...n, ...update } : n;
        });

        // ReactFlow requires parent before children — place moved nodes after their parent
        if (targetGroup) {
          const movedIds = [...updates.keys()];
          const withoutMoved = mapped.filter((n) => !movedIds.includes(n.id));
          const parentIdx = withoutMoved.findIndex((n) => n.id === targetGroup.id);
          const movedNodes = movedIds
            .map((id) => mapped.find((n) => n.id === id))
            .filter((n): n is Node => !!n);
          if (parentIdx >= 0) {
            mapped = [
              ...withoutMoved.slice(0, parentIdx + 1),
              ...movedNodes,
              ...withoutMoved.slice(parentIdx + 1),
            ];
          }
        } else if (updates.size === 1) {
          // Single node leaving a group — preserve existing ordering
          mapped = placeAfterParent(mapped, draggedNode.id, draggedNode.parentId ?? '');
        }

        return recomputeGroupZIndexes(mapped);
      });
    },
    [setNodes, findTargetGroup],
  );

  return { dragOverGroupId, handleNodeDrag, handleNodeDragStop };
}
