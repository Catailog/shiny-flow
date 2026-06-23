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
  ControlButton,
  Controls,
  type Edge,
  MarkerType,
  MiniMap,
  type Node,
  ReactFlow,
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
import { type ConnectBridgeFns, useFlowConnect } from '../hooks/useFlowConnect';
import { useFlowEdgeSelect } from '../hooks/useFlowEdgeSelect';
import { useFlowKeyboard } from '../hooks/useFlowKeyboard';
import { buildChildrenMap, computeHiddenIds, countHiddenSubtree } from '../lib/collapse';
import { applyDagreLayout } from '../lib/layout';
import { graphToFlow } from '../lib/transform';
import { ScreenshotContext } from '../screenshotContext';
import type { ContextMenuState, ContextMenuTarget, DialogRequest } from '../types';
import { ContextMenuController } from './ContextMenuController';
import { DialogRenderer } from './DialogRenderer';
import { FlowCommentNode } from './FlowCommentNode';
import { FlowEdge } from './FlowEdge';
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

function ConnectBridge({ bridgeRef }: { bridgeRef: React.RefObject<ConnectBridgeFns | null> }) {
  const { screenToFlowPosition } = useReactFlow();
  useEffect(() => {
    bridgeRef.current = { screenToFlowPosition };
  });
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
  const pushSnapshotRef = useRef(pushSnapshot);
  const deleteElementsRef = useRef(deleteElements);
  useEffect(() => {
    selectedNodesRef.current = selectedNodes;
    selectedEdgesRef.current = selectedEdges;
    pushSnapshotRef.current = pushSnapshot;
    deleteElementsRef.current = deleteElements;
  });

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
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState(savedRfEdges ?? initialEdges);

  const { onEdgesChange, handleEdgeClick } = useFlowEdgeSelect({
    onEdgesChangeBase,
    setEdges,
    setNodes,
  });

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
  const edgesRef = useRef(edges);
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  });
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const collapsedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    collapsedIdsRef.current = collapsedIds;
  });

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
  }, [setNodes, setEdges, setCollapsedIds]);

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
  }, [setNodes, setEdges, setCollapsedIds]);

  const { isLocked, spacebarLocked, isShiftHeld, toggleLock } = useFlowKeyboard({ undo, redo });
  const { onConnect, onConnectStart, onConnectEnd, connectBridgeRef } = useFlowConnect({
    pushSnapshot,
    setEdges,
  });

  // --- Collapse ---
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
    [pushSnapshot, setCollapsedIds],
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
                  selectionKeyCode="Shift"
                  multiSelectionKeyCode="Shift"
                  panOnDrag={!isShiftHeld}
                  selectionOnDrag={isShiftHeld}
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
                      onClick={toggleLock}
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
                    maskStrokeColor="var(--color-brand-primary)"
                    maskStrokeWidth={3}
                    pannable
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
