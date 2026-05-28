import { useCallback, useState } from 'react';

import type { Node } from '@xyflow/react';

import { NODE_WIDTH } from '../lib/layout';

export function useDragIntoGroup(nodes: Node[], setNodes: (fn: (prev: Node[]) => Node[]) => void) {
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  const findTargetGroup = useCallback((draggedNode: Node, allNodes: Node[]) => {
    const groups = allNodes.filter((n) => n.type === 'groupNode');
    const nodeW = draggedNode.measured?.width ?? NODE_WIDTH;
    const nodeH = draggedNode.measured?.height ?? 100;
    const parent = draggedNode.parentId
      ? allNodes.find((n) => n.id === draggedNode.parentId)
      : null;
    const absX = parent ? parent.position.x + draggedNode.position.x : draggedNode.position.x;
    const absY = parent ? parent.position.y + draggedNode.position.y : draggedNode.position.y;
    const centerX = absX + nodeW / 2;
    const centerY = absY + nodeH / 2;
    return {
      group: groups.find((g) => {
        const gW = g.width ?? (g.style?.width as number | undefined) ?? 0;
        const gH = g.height ?? (g.style?.height as number | undefined) ?? 0;
        return (
          centerX >= g.position.x &&
          centerX <= g.position.x + gW &&
          centerY >= g.position.y &&
          centerY <= g.position.y + gH
        );
      }),
      absX,
      absY,
    };
  }, []);

  const handleNodeDrag = useCallback(
    (_e: React.MouseEvent, draggedNode: Node) => {
      if (draggedNode.type !== 'flowNode') return;
      const { group } = findTargetGroup(draggedNode, nodes);
      setDragOverGroupId(group?.id ?? null);
    },
    [nodes, findTargetGroup],
  );

  const handleNodeDragStop = useCallback(
    (_e: React.MouseEvent, draggedNode: Node) => {
      setDragOverGroupId(null);
      if (draggedNode.type !== 'flowNode') return;

      setNodes((prev) => {
        const { group: targetGroup, absX, absY } = findTargetGroup(draggedNode, prev);

        return prev.map((n) => {
          if (n.id !== draggedNode.id) return n;

          if (targetGroup) {
            if (n.parentId === targetGroup.id) return n;
            return {
              ...n,
              parentId: targetGroup.id,
              extent: undefined,
              position: {
                x: absX - targetGroup.position.x,
                y: absY - targetGroup.position.y,
              },
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
