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

import type { AuthInput } from '@/features/project-input';

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
import type { ContextMenuState, DialogRequest } from '../types';
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
  const pushSnapshotRef = useRef(pushSnapshot);
  pushSnapshotRef.current = pushSnapshot;

  const hasSelection = useStore(
    (s) => s.nodes.some((n) => n.selected) || s.edges.some((e) => e.selected),
  );
  const hasSelectionRef = useRef(hasSelection);
  hasSelectionRef.current = hasSelection;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.code === 'Backspace' || e.code === 'Delete') && !e.repeat && hasSelectionRef.current) {
        pushSnapshotRef.current();
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
    },
    [pushSnapshot, onDragStart],
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

  const handleNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault();
    const type =
      node.type === 'groupNode'
        ? 'groupNode'
        : node.type === 'commentNode'
          ? 'commentNode'
          : 'flowNode';
    setContextMenuState({
      screenX: e.clientX,
      screenY: e.clientY,
      target: { type, nodeId: node.id },
    });
  }, []);

  const handleEdgeContextMenu = useCallback((e: React.MouseEvent, edge: Edge) => {
    e.preventDefault();
    setContextMenuState({
      screenX: e.clientX,
      screenY: e.clientY,
      target: { type: 'edge', edgeId: edge.id },
    });
  }, []);

  const handlePaneContextMenu = useCallback((e: MouseEvent | React.MouseEvent) => {
    e.preventDefault();
    setContextMenuState({
      screenX: e.clientX,
      screenY: e.clientY,
      target: { type: 'pane' },
    });
  }, []);

  const captureNode = useCallback(
    async (nodeId: string, resolvedRoute: string, paramValues: Record<string, string>) => {
      if (!screenshotOptions) return;
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
      if (!res.ok) return;
      const { imageBase64, redirected, redirectedImageBase64 } = await res.json();
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== nodeId) return n;
          const oldData = n.data as FlowNodeData;
          const redirectedScreenshot = !redirected
            ? (redirectedImageBase64 ?? oldData.redirectedScreenshot)
            : oldData.redirectedScreenshot;
          return {
            ...n,
            data: {
              ...oldData,
              screenshot: redirected ? oldData.screenshot : imageBase64,
              redirected,
              paramValues,
              redirectedScreenshot,
            },
          };
        }),
      );
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
            <div
              className="h-full w-full"
              onContextMenu={(e) => {
                if (!e.defaultPrevented) {
                  e.preventDefault();
                  setContextMenuState({
                    screenX: e.clientX,
                    screenY: e.clientY,
                    target: { type: 'pane' },
                  });
                }
              }}
            >
              <ReactFlow
                nodes={displayNodes}
                edges={displayEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeDragStart={handleNodeDragStart}
                onNodeDrag={handleNodeDragWithCp}
                onNodeDragStop={handleNodeDragStopWithCp}
                onNodeContextMenu={handleNodeContextMenu}
                onEdgeContextMenu={handleEdgeContextMenu}
                onPaneContextMenu={handlePaneContextMenu}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                fitView
                minZoom={0.05}
                maxZoom={2}
                nodesDraggable={nodesDraggable}
                zoomOnDoubleClick={false}
                deleteKeyCode={['Backspace', 'Delete']}
                multiSelectionKeyCode="Shift"
              >
                <KeyboardDeleteHandler />
                <AutoLayout edges={initialEdges} onLayout={setNodes} skipLayout={!!savedRfNodes} />
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
                <ContextMenuController
                  state={contextMenuState}
                  onClose={() => setContextMenuState(null)}
                  onOpenDialog={setDialogRequest}
                />
              </ReactFlow>
            </div>

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
