import { useCallback, useState } from 'react';

import type { Node } from '@xyflow/react';

import { NODE_WIDTH } from '../lib/layout';
import { getAbsolutePosition, isDescendantOf } from '../lib/nodeUtils';

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

    const group = groups.find((g) => {
      const gAbs = getAbsolutePosition(g, allNodes);
      const gW = g.width ?? (g.style?.width as number | undefined) ?? 0;
      const gH = g.height ?? (g.style?.height as number | undefined) ?? 0;
      return (
        centerX >= gAbs.x && centerX <= gAbs.x + gW && centerY >= gAbs.y && centerY <= gAbs.y + gH
      );
    });

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

        return prev.map((n) => {
          if (n.id !== draggedNode.id) return n;

          if (targetGroup) {
            if (n.parentId === targetGroup.id) return n;
            const tAbs = getAbsolutePosition(targetGroup, prev);
            return {
              ...n,
              parentId: targetGroup.id,
              extent: undefined,
              position: { x: absX - tAbs.x, y: absY - tAbs.y },
            };
          }

          if (n.parentId) {
            return { ...n, parentId: undefined, extent: undefined, position: { x: absX, y: absY } };
          }

          return n;
        });
      });
    },
    [setNodes, findTargetGroup],
  );

  return { dragOverGroupId, handleNodeDrag, handleNodeDragStop };
}
