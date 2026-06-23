import { useCallback, useRef } from 'react';

import type { Connection, Edge } from '@xyflow/react';

export type ConnectBridgeFns = {
  screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number };
};

function getNearestHandleId(
  nodeX: number,
  nodeY: number,
  nodeW: number,
  nodeH: number,
  mousePos: { x: number; y: number },
  handleType: 'source' | 'target',
): string | null {
  const cx = nodeX + nodeW / 2;
  const cy = nodeY + nodeH / 2;
  const candidates =
    handleType === 'target'
      ? [
          { id: null as string | null, x: cx, y: nodeY },
          { id: 'target-left', x: nodeX, y: cy },
          { id: 'target-right', x: nodeX + nodeW, y: cy },
        ]
      : [
          { id: null as string | null, x: cx, y: nodeY + nodeH },
          { id: 'source-left', x: nodeX, y: cy },
          { id: 'source-right', x: nodeX + nodeW, y: cy },
        ];
  return candidates.reduce((best, c) =>
    Math.hypot(mousePos.x - c.x, mousePos.y - c.y) <
    Math.hypot(mousePos.x - best.x, mousePos.y - best.y)
      ? c
      : best,
  ).id;
}

type Options = {
  pushSnapshot: () => void;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
};

export function useFlowConnect({ pushSnapshot, setEdges }: Options) {
  const connectingRef = useRef<{ nodeId: string; handleId: string | null } | null>(null);
  const connectBridgeRef = useRef<ConnectBridgeFns | null>(null);
  const connectHighlightCleanupRef = useRef<(() => void) | null>(null);

  const onConnect = useCallback(
    (connection: Connection) => {
      const connecting = connectingRef.current;
      // 시작 노드가 항상 source가 되도록 보정
      const conn =
        connecting && connection.source !== connecting.nodeId
          ? {
              source: connection.target!,
              sourceHandle: connection.targetHandle,
              target: connection.source,
              targetHandle: connection.sourceHandle,
            }
          : connection;
      pushSnapshot();
      setEdges((eds) => [...eds, { ...conn, id: crypto.randomUUID(), type: 'flowEdge' } as Edge]);
    },
    [pushSnapshot, setEdges],
  );

  const onConnectStart = useCallback(
    (
      _event: MouseEvent | TouchEvent,
      params: {
        nodeId: string | null;
        handleId: string | null;
        handleType: 'source' | 'target' | null;
      },
    ) => {
      if (!params.nodeId || !params.handleType) return;
      connectingRef.current = { nodeId: params.nodeId, handleId: params.handleId };
      // 드래그 중 노드 바디 호버 하이라이트
      // ReactFlow가 드래그 중 이벤트 캡처 레이어를 올리므로 elementsFromPoint로 탐색
      let highlightedEl: HTMLElement | null = null;
      const onMouseMove = (e: MouseEvent) => {
        const stack = document.elementsFromPoint(e.clientX, e.clientY);
        const hasHandle = stack.some((el) => el.classList.contains('react-flow__handle'));
        const nodeEl = stack.find((el) =>
          el.classList.contains('react-flow__node'),
        ) as HTMLElement | null;
        const newTarget = hasHandle ? null : (nodeEl ?? null);
        if (highlightedEl !== newTarget) {
          highlightedEl?.classList.remove('rf-connect-target');
          newTarget?.classList.add('rf-connect-target');
          highlightedEl = newTarget;
        }
      };
      window.addEventListener('mousemove', onMouseMove);
      connectHighlightCleanupRef.current = () => {
        window.removeEventListener('mousemove', onMouseMove);
        highlightedEl?.classList.remove('rf-connect-target');
      };
    },
    [],
  );

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      connectHighlightCleanupRef.current?.();
      connectHighlightCleanupRef.current = null;
      const connecting = connectingRef.current;
      connectingRef.current = null;
      if (!connecting || !connectBridgeRef.current) return;

      const clientX = 'clientX' in event ? event.clientX : event.changedTouches[0].clientX;
      const clientY = 'clientY' in event ? event.clientY : event.changedTouches[0].clientY;
      const stack = document.elementsFromPoint(clientX, clientY);
      // 핸들 위에 드롭 → onConnect가 이미 처리
      if (stack.some((el) => el.classList.contains('react-flow__handle'))) return;
      // 노드 바디 위에 드롭?
      const nodeEl = stack.find((el) =>
        el.classList.contains('react-flow__node'),
      ) as HTMLElement | null;
      if (!nodeEl) return;
      const targetNodeId = nodeEl.getAttribute('data-id');
      if (!targetNodeId) return;

      const { screenToFlowPosition } = connectBridgeRef.current;
      const mousePos = screenToFlowPosition({ x: clientX, y: clientY });

      // 노드 DOM에서 flow 좌표 계산
      const rect = nodeEl.getBoundingClientRect();
      const tl = screenToFlowPosition({ x: rect.left, y: rect.top });
      const br = screenToFlowPosition({ x: rect.right, y: rect.bottom });
      const nodeW = br.x - tl.x;
      const nodeH = br.y - tl.y;

      // 시작 노드가 항상 source가 되도록: neededType은 항상 'target'
      const nearestId = getNearestHandleId(tl.x, tl.y, nodeW, nodeH, mousePos, 'target');

      const newConnection = {
        source: connecting.nodeId,
        sourceHandle: connecting.handleId,
        target: targetNodeId,
        targetHandle: nearestId,
      };
      pushSnapshot();
      setEdges((eds) => [
        ...eds,
        { ...newConnection, id: crypto.randomUUID(), type: 'flowEdge' } as Edge,
      ]);
    },
    [pushSnapshot, setEdges],
  );

  return { onConnect, onConnectStart, onConnectEnd, connectBridgeRef };
}
