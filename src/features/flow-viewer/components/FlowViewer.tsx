'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
import { BoxSelectIcon, LockIcon, UnlockIcon } from 'lucide-react';

import type { AuthInput } from '@/features/project-input';

import type { FlowGraph } from '@/lib/analyzer';

import { FlowActionsProvider } from '../actionsContext';
import { CollapseContext } from '../collapseContext';
import { buildChildrenMap, computeHiddenIds, countHiddenSubtree } from '../lib/collapse';
import type { ContextMenuState, DialogRequest } from '../lib/contextMenuTypes';
import { NODE_WIDTH, applyDagreLayout } from '../lib/layout';
import { graphToFlow } from '../lib/transform';
import { ScreenshotContext } from '../screenshotContext';
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
  zIndex: 1,
};

function AutoLayout({ edges, onLayout }: { edges: Edge[]; onLayout: (nodes: Node[]) => void }) {
  const nodesInitialized = useNodesInitialized();
  const { getNodes, fitView } = useReactFlow();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!nodesInitialized || done) return;
    const relayouted = applyDagreLayout(getNodes(), edges);
    onLayout(relayouted);
    setDone(true);
    requestAnimationFrame(() => fitView());
  }, [nodesInitialized, done, edges, onLayout, getNodes, fitView]);

  return null;
}

function GroupButton({ onOpenDialog }: { onOpenDialog: (req: DialogRequest) => void }) {
  const selected = useStore((s) => s.nodes.filter((n) => n.selected && n.type === 'flowNode'));
  const disabled = selected.length < 2;

  return (
    <ControlButton
      onClick={() => !disabled && onOpenDialog({ type: 'groupCreate', nodes: selected })}
      title={disabled ? '2개 이상 노드를 선택하세요' : `${selected.length}개 노드 그룹화`}
      style={{ opacity: disabled ? 0.35 : 1 }}
    >
      <BoxSelectIcon size={12} style={{ fill: 'none' }} />
    </ControlButton>
  );
}

// --- Main component ---

type Props = {
  graph: FlowGraph;
  screenshotOptions: { baseUrl: string; auth?: AuthInput } | null;
};

export function FlowViewer({ graph, screenshotOptions }: Props) {
  const { nodes: initialNodes, edges: initialEdges } = graphToFlow(graph);
  const layoutedNodes = applyDagreLayout(initialNodes, initialEdges);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const [isLocked, setIsLocked] = useState(false);
  const [spacebarLocked, setSpacebarLocked] = useState(false);
  const isLockedRef = useRef(isLocked);
  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
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
    (connection: Connection) =>
      setEdges((eds) => addEdge({ ...connection, type: 'flowEdge' }, eds)),
    [setEdges],
  );

  // --- Collapse ---
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const childrenMap = useMemo(() => buildChildrenMap(edges), [edges]);
  const hiddenIds = useMemo(
    () => computeHiddenIds(nodes, edges, collapsedIds),
    [nodes, edges, collapsedIds],
  );
  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const hasChildren = useCallback(
    (id: string) => (childrenMap.get(id)?.length ?? 0) > 0,
    [childrenMap],
  );
  const hiddenCount = useCallback(
    (id: string) => countHiddenSubtree(id, childrenMap, hiddenIds),
    [childrenMap, hiddenIds],
  );
  const displayNodes = useMemo(
    () => nodes.map((n) => ({ ...n, hidden: hiddenIds.has(n.id) })),
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
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  const collapseContext = useMemo(
    () => ({ collapsedIds, toggleCollapse, hasChildren, hiddenCount, dragOverGroupId }),
    [collapsedIds, toggleCollapse, hasChildren, hiddenCount, dragOverGroupId],
  );

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

  const screenshotContextValue = useMemo(
    () => ({ available: !!screenshotOptions, captureNode }),
    [screenshotOptions, captureNode],
  );

  const flowActionsValue = useMemo(() => ({ openDialog: setDialogRequest }), []);
  const nodesDraggable = !isLocked && !spacebarLocked;

  return (
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
              onNodeDrag={handleNodeDrag}
              onNodeDragStop={handleNodeDragStop}
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
            >
              <AutoLayout edges={initialEdges} onLayout={setNodes} />
              <Background />
              <Controls style={{ bottom: 48 }} showInteractive={false}>
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
                <GroupButton onOpenDialog={setDialogRequest} />
              </Controls>
              <MiniMap
                nodeColor={(node) => (node.data?.isDeadEnd ? '#D4A373' : '#708A70')}
                maskColor="rgba(244,247,244,0.7)"
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
  );
}
