'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Background,
  type Connection,
  ControlButton,
  Controls,
  type Edge,
  MarkerType,
  MiniMap,
  type Node,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  useStore,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { LockIcon, Redo2Icon, TagIcon, Undo2Icon, UnlockIcon } from 'lucide-react';
import { toast } from 'sonner';

import type { AuthInput } from '@/features/project-input';

import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from '@/components/ui/context-menu';

import type { FlowGraph } from '@/lib/analyzer';

import { useT } from '@/hooks/useT';

import { useUIStore } from '@/store/uiStore';

import { Z_INDEX } from '@/constants/zIndex';

import { FlowActionsProvider } from '../actionsContext';
import { CollapseContext } from '../collapseContext';
import { HistoryProvider, useHistory } from '../historyContext';
import { useDragIntoGroup } from '../hooks/useDragIntoGroup';
import { useEdgeCpSync } from '../hooks/useEdgeCpSync';
import { buildChildrenMap, computeHiddenIds, countHiddenSubtree } from '../lib/collapse';
import { applyDagreLayout } from '../lib/layout';
import { graphToFlow } from '../lib/transform';
import { ScreenshotContext } from '../screenshotContext';
import type { ContextMenuState, ContextMenuTarget, DialogRequest } from '../types';
import { ContextMenuController } from './ContextMenuController';
import { DialogRenderer } from './DialogRenderer';
import { FlowCommentNode } from './FlowCommentNode';
import { FlowEdge, type FlowEdgeData } from './FlowEdge';
import { FlowGroupNode } from './FlowGroupNode';
import { FlowNode, type FlowNodeData } from './FlowNode';

const nodeTypes = {
  flowNode: FlowNode,
  groupNode: FlowGroupNode,
  commentNode: FlowCommentNode,
};
const edgeTypes = { flowEdge: FlowEdge };
const defaultEdgeOptions = {
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
  zIndex: Z_INDEX.edge,
};

// 노드를 배열 끝으로 올려 z-index 상승. groupNode인 경우 자식도 함께 이동 (부모가 자식보다 앞에 있어야 함)
function bringToFront(nds: Node[], nodeId: string): Node[] {
  const node = nds.find((n) => n.id === nodeId);
  if (!node) return nds;
  if (node.type === 'groupNode') {
    const rest = nds.filter((n) => n.id !== nodeId && n.parentId !== nodeId);
    const children = nds.filter((n) => n.parentId === nodeId);
    return [...rest, node, ...children];
  }
  const idx = nds.findIndex((n) => n.id === nodeId);
  if (idx === -1 || idx === nds.length - 1) return nds;
  return [...nds.slice(0, idx), ...nds.slice(idx + 1), nds[idx]];
}

// 노드 바디에 드롭 시 가장 가까운 핸들 ID 반환 (flow 좌표 기준)
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

type ConnectBridgeFns = {
  screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number };
};

function ConnectBridge({
  bridgeRef,
}: {
  bridgeRef: React.MutableRefObject<ConnectBridgeFns | null>;
}) {
  const { screenToFlowPosition } = useReactFlow();
  bridgeRef.current = { screenToFlowPosition };
  return null;
}

function AutoLayout({
  edges,
  onLayout,
  skipLayout,
}: {
  edges: Edge[];
  onLayout: (nodes: Node[]) => void;
  skipLayout?: boolean;
}) {
  const nodesInitialized = useNodesInitialized();
  const { getNodes, fitView } = useReactFlow();
  const doneRef = useRef(false);

  useEffect(() => {
    if (!nodesInitialized || doneRef.current) return;
    doneRef.current = true;
    if (!skipLayout) {
      const relayouted = applyDagreLayout(getNodes(), edges);
      onLayout(relayouted);
    }
    requestAnimationFrame(() => fitView());
  }, [nodesInitialized, edges, onLayout, getNodes, fitView, skipLayout]);

  return null;
}

function KeyboardDeleteHandler() {
  const { pushSnapshot } = useHistory();
  const { deleteElements } = useReactFlow();

  const selectedNodes = useStore((s) => s.nodes.filter((n) => n.selected));
  const selectedEdges = useStore((s) => s.edges.filter((e) => e.selected));
  const selectedNodesRef = useRef(selectedNodes);
  const selectedEdgesRef = useRef(selectedEdges);
  selectedNodesRef.current = selectedNodes;
  selectedEdgesRef.current = selectedEdges;

  const pushSnapshotRef = useRef(pushSnapshot);
  pushSnapshotRef.current = pushSnapshot;
  const deleteElementsRef = useRef(deleteElements);
  deleteElementsRef.current = deleteElements;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const hasSelection =
        selectedNodesRef.current.length > 0 || selectedEdgesRef.current.length > 0;
      if ((e.code === 'Backspace' || e.code === 'Delete') && !e.repeat && hasSelection) {
        pushSnapshotRef.current();
        void deleteElementsRef.current({
          nodes: selectedNodesRef.current,
          edges: selectedEdgesRef.current,
        });
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, []);

  return null;
}

// --- Main component ---

export type FlowViewerHandle = {
  getNodes: () => Node[];
  getEdges: () => Edge[];
};

type Props = {
  graph: FlowGraph;
  screenshotOptions: { baseUrl: string; auth?: AuthInput; projectPath: string } | null;
  savedRfNodes?: Node[];
  savedRfEdges?: Edge[];
  onValidateForCapture?: () => Promise<void>;
};

export const FlowViewer = forwardRef<FlowViewerHandle, Props>(function FlowViewer(
  { graph, screenshotOptions, savedRfNodes, savedRfEdges, onValidateForCapture },
  ref,
) {
  const t = useT();
  const { nodes: initialNodes, edges: initialEdges } = graphToFlow(graph);
  const layoutedNodes = applyDagreLayout(initialNodes, initialEdges);

  const [nodes, setNodes, onNodesChange] = useNodesState(savedRfNodes ?? layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(savedRfEdges ?? initialEdges);

  useImperativeHandle(ref, () => ({ getNodes: () => nodes, getEdges: () => edges }), [
    nodes,
    edges,
  ]);

  // --- History ---
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const past = useRef<Array<{ nodes: Node[]; edges: Edge[]; collapsedIds: Set<string> }>>([]);
  const future = useRef<Array<{ nodes: Node[]; edges: Edge[]; collapsedIds: Set<string> }>>([]);

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;
  const collapsedIdsRef = useRef<Set<string>>(new Set());

  const pushSnapshot = useCallback(() => {
    past.current.push({
      nodes: nodesRef.current,
      edges: edgesRef.current,
      collapsedIds: new Set(collapsedIdsRef.current),
    });
    future.current = [];
    if (past.current.length > 100) past.current.shift();
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const undo = useCallback(() => {
    const snapshot = past.current.pop();
    if (!snapshot) return;
    future.current.push({
      nodes: nodesRef.current,
      edges: edgesRef.current,
      collapsedIds: new Set(collapsedIdsRef.current),
    });
    setNodes(snapshot.nodes);
    setEdges(snapshot.edges);
    setCollapsedIds(new Set(snapshot.collapsedIds));
    setCanUndo(past.current.length > 0);
    setCanRedo(true);
    // setCollapsedIds is a stable React setter, safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    const snapshot = future.current.pop();
    if (!snapshot) return;
    past.current.push({
      nodes: nodesRef.current,
      edges: edgesRef.current,
      collapsedIds: new Set(collapsedIdsRef.current),
    });
    setNodes(snapshot.nodes);
    setEdges(snapshot.edges);
    setCollapsedIds(new Set(snapshot.collapsedIds));
    setCanUndo(true);
    setCanRedo(future.current.length > 0);
    // setCollapsedIds is a stable React setter, safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setNodes, setEdges]);

  const undoRef = useRef(undo);
  undoRef.current = undo;
  const redoRef = useRef(redo);
  redoRef.current = redo;
  const pushSnapshotRef = useRef(pushSnapshot);
  pushSnapshotRef.current = pushSnapshot;

  const [isLocked, setIsLocked] = useState(false);
  const [spacebarLocked, setSpacebarLocked] = useState(false);
  const isLockedRef = useRef(isLocked);
  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault();
        undoRef.current();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey))) {
        e.preventDefault();
        redoRef.current();
        return;
      }
      if (e.code === 'KeyL' && !e.repeat) {
        setIsLocked((v) => !v);
        setSpacebarLocked(false);
      }
      if (e.code === 'Space' && !e.repeat && !isLockedRef.current) {
        e.preventDefault();
        setSpacebarLocked(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacebarLocked(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      pushSnapshot();
      setEdges((eds) => addEdge({ ...connection, type: 'flowEdge' }, eds));
    },
    [pushSnapshot, setEdges],
  );

  const connectBridgeRef = useRef<ConnectBridgeFns | null>(null);
  const connectingRef = useRef<{
    nodeId: string;
    handleId: string | null;
    handleType: 'source' | 'target';
  } | null>(null);
  const connectHighlightCleanupRef = useRef<(() => void) | null>(null);

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
      connectingRef.current = {
        nodeId: params.nodeId,
        handleId: params.handleId,
        handleType: params.handleType,
      };
      // 드래그 중 노드 바디 호버 하이라이트
      let highlightedEl: HTMLElement | null = null;
      const onMouseMove = (e: MouseEvent) => {
        // 드래그 중 ReactFlow가 이벤트 캡처 레이어를 올리므로
        // event.target 대신 elementsFromPoint로 실제 노드 엘리먼트를 탐색
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

      const neededType = connecting.handleType === 'source' ? 'target' : 'source';
      const nearestId = getNearestHandleId(tl.x, tl.y, nodeW, nodeH, mousePos, neededType);

      pushSnapshot();
      setEdges((eds) =>
        addEdge(
          {
            source: connecting.handleType === 'source' ? connecting.nodeId : targetNodeId,
            sourceHandle: connecting.handleType === 'source' ? connecting.handleId : nearestId,
            target: connecting.handleType === 'source' ? targetNodeId : connecting.nodeId,
            targetHandle: connecting.handleType === 'source' ? nearestId : connecting.handleId,
            type: 'flowEdge',
          },
          eds,
        ),
      );
    },
    [pushSnapshot, setEdges],
  );

  // --- Collapse ---
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  collapsedIdsRef.current = collapsedIds;
  const childrenMap = useMemo(() => buildChildrenMap(edges), [edges]);
  const hiddenIds = useMemo(
    () => computeHiddenIds(nodes, edges, collapsedIds),
    [nodes, edges, collapsedIds],
  );
  const toggleCollapse = useCallback(
    (id: string) => {
      pushSnapshot();
      setCollapsedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [pushSnapshot],
  );
  const hasChildren = useCallback(
    (id: string) => (childrenMap.get(id)?.length ?? 0) > 0,
    [childrenMap],
  );
  const hiddenCount = useCallback(
    (id: string) => countHiddenSubtree(id, childrenMap, hiddenIds),
    [childrenMap, hiddenIds],
  );
  const displayNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        hidden: hiddenIds.has(n.id),
        // flowNode에 'nokey' 추가: Shift+드래그가 리사이즈 핸들에서 시작할 때
        // ReactFlow 러버밴드 선택을 건너뛰어 비율 고정 리사이즈로 처리되도록 함
        className:
          n.type === 'flowNode' ? [n.className, 'nokey'].filter(Boolean).join(' ') : n.className,
      })),
    [nodes, hiddenIds],
  );
  const displayEdges = useMemo(
    () =>
      edges.map((e) => ({
        ...e,
        hidden: hiddenIds.has(e.source) || hiddenIds.has(e.target),
      })),
    [edges, hiddenIds],
  );
  // --- Drag into group ---
  const { dragOverGroupId, handleNodeDrag, handleNodeDragStop } = useDragIntoGroup(nodes, setNodes);

  // --- Edge cp sync ---
  const { onDragStart, syncCp } = useEdgeCpSync(nodes, setEdges);
  const handleNodeDragStart = useCallback(
    (_e: React.MouseEvent, node: Node) => {
      pushSnapshot();
      onDragStart(node);
      setNodes((nds) => bringToFront(nds, node.id));
    },
    [pushSnapshot, onDragStart, setNodes],
  );
  const handleNodeDragWithCp = useCallback(
    (e: React.MouseEvent, node: Node, draggedNodes: Node[]) => {
      handleNodeDrag(e, node);
      syncCp(node, draggedNodes);
    },
    [handleNodeDrag, syncCp],
  );
  const handleNodeDragStopWithCp = useCallback(
    (e: React.MouseEvent, node: Node, draggedNodes: Node[]) => {
      syncCp(node, draggedNodes);
      handleNodeDragStop(e, node);
    },
    [syncCp, handleNodeDragStop],
  );

  const collapseContext = useMemo(
    () => ({ collapsedIds, toggleCollapse, hasChildren, hiddenCount, dragOverGroupId }),
    [collapsedIds, toggleCollapse, hasChildren, hiddenCount, dragOverGroupId],
  );

  // --- Context menu & dialogs ---
  const [contextMenuState, setContextMenuState] = useState<ContextMenuState>(null);
  const [dialogRequest, setDialogRequest] = useState<DialogRequest | null>(null);

  // pendingTargetRef: node/edge handlers set this synchronously before the contextmenu
  // event bubbles up to ContextMenuTrigger, so the trigger can read the correct target.
  const pendingTargetRef = useRef<ContextMenuTarget>({ type: 'pane' });

  const handleNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault();
    const type =
      node.type === 'groupNode'
        ? 'groupNode'
        : node.type === 'commentNode'
          ? 'commentNode'
          : 'flowNode';
    pendingTargetRef.current = { type, nodeId: node.id };
  }, []);

  const handleEdgeContextMenu = useCallback((e: React.MouseEvent, edge: Edge) => {
    e.preventDefault();
    pendingTargetRef.current = { type: 'edge', edgeId: edge.id };
  }, []);

  // NodeResizer가 있는 노드는 ReactFlow 내부 클릭→단독 선택 로직이 동작하지 않아
  // Shift 없이 클릭해도 다중 선택이 유지되는 버그가 있음. 명시적으로 처리.
  const handleNodeClick = useCallback(
    (e: React.MouseEvent, clickedNode: Node) => {
      if (e.shiftKey) return;
      setNodes((nds) => {
        const updated = nds.map((n) => ({ ...n, selected: n.id === clickedNode.id }));
        return bringToFront(updated, clickedNode.id);
      });
      setEdges((eds) => eds.map((ed) => ({ ...ed, selected: false })));
    },
    [setNodes, setEdges],
  );

  const handleEdgeClick = useCallback(
    (_e: React.MouseEvent, clickedEdge: Edge) => {
      setEdges((eds) => {
        const maxZ = Math.max(0, ...eds.map((e) => (e.data as FlowEdgeData)?.labelZIndex ?? 0));
        const idx = eds.findIndex((e) => e.id === clickedEdge.id);
        const reordered =
          idx === -1 || idx === eds.length - 1
            ? eds
            : [...eds.slice(0, idx), ...eds.slice(idx + 1), eds[idx]];
        return reordered.map((e) => ({
          ...e,
          selected: e.id === clickedEdge.id,
          ...(e.id === clickedEdge.id && { data: { ...(e.data ?? {}), labelZIndex: maxZ + 1 } }),
        }));
      });
      setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
    },
    [setEdges, setNodes],
  );

  const handleContextMenuOpen = useCallback((e: React.MouseEvent) => {
    const target = pendingTargetRef.current;
    pendingTargetRef.current = { type: 'pane' };
    setContextMenuState({ screenX: e.clientX, screenY: e.clientY, target });
  }, []);

  const captureNode = useCallback(
    async (nodeId: string, resolvedRoute: string, paramValues: Record<string, string>) => {
      if (!screenshotOptions) return;
      setNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, isCapturing: true } } : n)),
      );
      const resetCapturing = () =>
        setNodes((prev) =>
          prev.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, isCapturing: false } } : n,
          ),
        );
      try {
        const res = await fetch('/api/screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            baseUrl: screenshotOptions.baseUrl,
            route: resolvedRoute,
            auth: screenshotOptions.auth,
            projectPath: screenshotOptions.projectPath,
          }),
        });
        if (!res.ok) {
          resetCapturing();
          toast.error('재캡처 실패');
          return;
        }
        const { imageBase64, redirected } = await res.json();
        setNodes((prev) =>
          prev.map((n) => {
            if (n.id !== nodeId) return n;
            const oldData = n.data as FlowNodeData;
            return {
              ...n,
              data: {
                ...oldData,
                screenshot: redirected ? oldData.screenshot : imageBase64,
                redirected,
                paramValues,
                redirectedScreenshot: redirected ? oldData.redirectedScreenshot : undefined,
                isCapturing: false,
              },
            };
          }),
        );
      } catch {
        resetCapturing();
        toast.error('재캡처 실패');
      }
    },
    [screenshotOptions, setNodes],
  );

  const validateForCapture = useMemo(
    () => onValidateForCapture ?? (async () => {}),
    [onValidateForCapture],
  );

  const screenshotContextValue = useMemo(
    () => ({ available: !!screenshotOptions, captureNode, validateForCapture }),
    [screenshotOptions, captureNode, validateForCapture],
  );

  const historyValue = useMemo(() => ({ pushSnapshot }), [pushSnapshot]);
  const flowActionsValue = useMemo(() => ({ openDialog: setDialogRequest }), []);
  const nodesDraggable = !isLocked && !spacebarLocked;
  const { showNodeLabels, toggleNodeLabels } = useUIStore();

  return (
    <HistoryProvider value={historyValue}>
      <FlowActionsProvider value={flowActionsValue}>
        <ScreenshotContext.Provider value={screenshotContextValue}>
          <CollapseContext.Provider value={collapseContext}>
            <ContextMenu
              onOpenChangeComplete={(open) => {
                if (!open) setContextMenuState(null);
              }}
            >
              <ContextMenuTrigger className="h-full w-full" onContextMenu={handleContextMenuOpen}>
                <ReactFlow
                  nodes={displayNodes}
                  edges={displayEdges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onConnectStart={onConnectStart}
                  onConnectEnd={onConnectEnd}
                  isValidConnection={() => true}
                  onNodeDragStart={handleNodeDragStart}
                  onNodeDrag={handleNodeDragWithCp}
                  onNodeDragStop={handleNodeDragStopWithCp}
                  onNodeClick={handleNodeClick}
                  onEdgeClick={handleEdgeClick}
                  onNodeContextMenu={handleNodeContextMenu}
                  onEdgeContextMenu={handleEdgeContextMenu}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  defaultEdgeOptions={defaultEdgeOptions}
                  fitView
                  minZoom={0.05}
                  maxZoom={2}
                  nodesDraggable={nodesDraggable}
                  zoomOnDoubleClick={false}
                  deleteKeyCode={null}
                  multiSelectionKeyCode="Shift"
                >
                  <KeyboardDeleteHandler />
                  <ConnectBridge bridgeRef={connectBridgeRef} />
                  <AutoLayout
                    edges={initialEdges}
                    onLayout={setNodes}
                    skipLayout={!!savedRfNodes}
                  />
                  <Background />
                  <Controls showInteractive={false}>
                    <ControlButton
                      onClick={undo}
                      title={t.menu.undo}
                      style={{ opacity: canUndo ? 1 : 0.4 }}
                    >
                      <Undo2Icon size={12} style={{ fill: 'none' }} />
                    </ControlButton>
                    <ControlButton
                      onClick={redo}
                      title={t.menu.redo}
                      style={{ opacity: canRedo ? 1 : 0.4 }}
                    >
                      <Redo2Icon size={12} style={{ fill: 'none' }} />
                    </ControlButton>
                    <ControlButton
                      onClick={() => {
                        setIsLocked((v) => !v);
                        setSpacebarLocked(false);
                      }}
                      title={nodesDraggable ? 'Lock (L)' : 'Unlock (L)'}
                    >
                      {nodesDraggable ? (
                        <UnlockIcon size={12} style={{ fill: 'none' }} />
                      ) : (
                        <LockIcon size={12} style={{ fill: 'none' }} />
                      )}
                    </ControlButton>
                    <ControlButton
                      onClick={toggleNodeLabels}
                      title={t.menu.toggleNodeLabels}
                      style={{ opacity: showNodeLabels ? 1 : 0.4 }}
                    >
                      <TagIcon size={12} style={{ fill: 'none' }} />
                    </ControlButton>
                  </Controls>
                  <MiniMap
                    nodeColor={(node) =>
                      node.data?.isDeadEnd
                        ? 'var(--color-brand-accent)'
                        : 'var(--color-brand-primary)'
                    }
                    maskColor="color-mix(in srgb, var(--background) 70%, transparent)"
                    className="rounded-lg border border-border shadow-sm"
                  />
                  <ContextMenuContent>
                    <ContextMenuController
                      state={contextMenuState}
                      onOpenDialog={setDialogRequest}
                    />
                  </ContextMenuContent>
                </ReactFlow>
              </ContextMenuTrigger>
            </ContextMenu>

            <DialogRenderer
              dialogRequest={dialogRequest}
              nodes={nodes}
              setNodes={setNodes}
              edges={edges}
              setEdges={setEdges}
              onClose={() => setDialogRequest(null)}
            />
          </CollapseContext.Provider>
        </ScreenshotContext.Provider>
      </FlowActionsProvider>
    </HistoryProvider>
  );
});
