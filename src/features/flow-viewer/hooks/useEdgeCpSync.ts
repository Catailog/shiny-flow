import { useCallback, useLayoutEffect, useRef } from 'react';

import type { Edge, Node } from '@xyflow/react';

import { getAbsolutePosition } from '../lib/nodeUtils';

export function useEdgeCpSync(nodes: Node[], setEdges: (fn: (prev: Edge[]) => Edge[]) => void) {
  const nodesRef = useRef(nodes);
  useLayoutEffect(() => {
    nodesRef.current = nodes;
  });

  const prevAbsPos = useRef<{ x: number; y: number } | null>(null);

  const onDragStart = useCallback((node: Node) => {
    prevAbsPos.current = getAbsolutePosition(node, nodesRef.current);
  }, []);

  const syncCp = useCallback(
    (primaryNode: Node, draggedNodes: Node[]) => {
      const prev = prevAbsPos.current;
      if (!prev) return;

      const allNodes = nodesRef.current;
      const curr = getAbsolutePosition(primaryNode, allNodes);
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      prevAbsPos.current = curr;

      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return;

      // Build moving set: explicitly dragged nodes + their descendants
      const draggedIds = new Set(draggedNodes.map((n) => n.id));
      const movingIds = new Set(draggedIds);
      for (const n of allNodes) {
        if (movingIds.has(n.id) || !n.parentId) continue;
        let cur: Node | undefined = n;
        while (cur?.parentId) {
          if (draggedIds.has(cur.parentId)) {
            movingIds.add(n.id);
            break;
          }
          cur = allNodes.find((x) => x.id === cur!.parentId);
        }
      }

      setEdges((eds) =>
        eds.map((edge) => {
          const cp = (edge.data as { cp?: { x: number; y: number } })?.cp;
          if (!cp) return edge;

          const sourceMoving = movingIds.has(edge.source);
          const targetMoving = movingIds.has(edge.target);
          if (!sourceMoving && !targetMoving) return edge;

          // Both endpoints move: preserve curve shape (cp follows)
          // One endpoint moves: keep label fixed (cp compensates)
          const cpDx = sourceMoving && targetMoving ? dx : -0.5 * dx;
          const cpDy = sourceMoving && targetMoving ? dy : -0.5 * dy;

          return {
            ...edge,
            data: { ...edge.data, cp: { x: cp.x + cpDx, y: cp.y + cpDy } },
          };
        }),
      );
    },
    [setEdges],
  );

  return { onDragStart, syncCp };
}
