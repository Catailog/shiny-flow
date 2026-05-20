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

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import type { FlowGraph } from '@/lib/analyzer';
import { cn } from '@/lib/utils';

import { FlowActionsProvider } from '../actionsContext';
import { CollapseContext } from '../collapseContext';
import { buildChildrenMap, computeHiddenIds, countHiddenSubtree } from '../lib/collapse';
import type { DialogRequest } from '../lib/contextMenuTypes';
import type { ContextMenuState } from '../lib/contextMenuTypes';
import { applyDagreLayout } from '../lib/layout';
import { GROUP_COLORS, GROUP_COLOR_STYLES } from '../lib/nodeColors';
import { graphToFlow } from '../lib/transform';
import { ScreenshotContext } from '../screenshotContext';
import { ContextMenuController } from './ContextMenuController';
import { FlowCommentNode } from './FlowCommentNode';
import { FlowEdge } from './FlowEdge';
import { FlowGroupNode, type GroupNodeData } from './FlowGroupNode';
import { FlowNode, type FlowNodeData } from './FlowNode';
import { MemoEditor } from './MemoEditor';

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

function computeGroupBounds(selected: Node[], padding = 48) {
  const minX = Math.min(...selected.map((n) => n.position.x)) - padding;
  const minY = Math.min(...selected.map((n) => n.position.y)) - padding;
  const maxX =
    Math.max(...selected.map((n) => n.position.x + (n.measured?.width ?? 280))) + padding;
  const maxY =
    Math.max(...selected.map((n) => n.position.y + (n.measured?.height ?? 100))) + padding;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// --- Dialog sub-components ---

function ScreenshotDialog({
  src,
  label,
  onClose,
}: {
  src: string;
  label: string;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-h-[90vh] w-auto max-w-[90vw] gap-0 overflow-hidden p-0 sm:max-w-[90vw]"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{label} 스크린샷</DialogTitle>
        <img
          src={src}
          alt={label}
          className="block max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
        />
      </DialogContent>
    </Dialog>
  );
}

function MemoDialog({
  nodeId,
  nodes,
  setNodes,
  onClose,
}: {
  nodeId: string;
  nodes: Node[];
  setNodes: (fn: (prev: Node[]) => Node[]) => void;
  onClose: () => void;
}) {
  const node = nodes.find((n) => n.id === nodeId);
  const [value, setValue] = useState((node?.data as FlowNodeData | undefined)?.memo ?? '');

  const save = () => {
    const isEmpty = value === '' || value === '<p></p>';
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, memo: isEmpty ? undefined : value } } : n,
      ),
    );
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>메모</DialogTitle>
        </DialogHeader>
        <MemoEditor value={value} onChange={setValue} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={save}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CommentNodeDialog({
  nodeId,
  nodes,
  setNodes,
  onClose,
}: {
  nodeId: string;
  nodes: Node[];
  setNodes: (fn: (prev: Node[]) => Node[]) => void;
  onClose: () => void;
}) {
  const node = nodes.find((n) => n.id === nodeId);
  const [value, setValue] = useState(
    (node?.data as { content?: string } | undefined)?.content ?? '',
  );

  const save = () => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, content: value } } : n)),
    );
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>댓글</DialogTitle>
        </DialogHeader>
        <Textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="댓글을 입력하세요..."
          className="min-h-24 resize-none"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={save}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GroupRenameDialog({
  nodeId,
  nodes,
  setNodes,
  onClose,
}: {
  nodeId: string;
  nodes: Node[];
  setNodes: (fn: (prev: Node[]) => Node[]) => void;
  onClose: () => void;
}) {
  const node = nodes.find((n) => n.id === nodeId);
  const [value, setValue] = useState((node?.data as GroupNodeData | undefined)?.label ?? '');

  const save = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, label: trimmed } } : n)),
    );
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>그룹 이름 변경</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={save}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EdgeCommentDialog({
  edgeId,
  edges,
  setEdges,
  onClose,
}: {
  edgeId: string;
  edges: Edge[];
  setEdges: (fn: (prev: Edge[]) => Edge[]) => void;
  onClose: () => void;
}) {
  const edge = edges.find((e) => e.id === edgeId);
  const [value, setValue] = useState(
    (edge?.data as { comment?: string } | undefined)?.comment ?? '',
  );

  const save = () => {
    const trimmed = value.trim();
    setEdges((prev) =>
      prev.map((e) => (e.id === edgeId ? { ...e, data: { comment: trimmed || undefined } } : e)),
    );
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>엣지 코멘트</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="코멘트..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={save}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GroupCreateDialog({
  pendingNodes,
  setNodes,
  onClose,
}: {
  pendingNodes: Node[];
  setNodes: (fn: (prev: Node[]) => Node[]) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('gray');

  const confirm = () => {
    const trimmed = label.trim() || '그룹';
    const { x, y, width, height } = computeGroupBounds(pendingNodes);
    const groupId = `group-${Date.now()}`;
    const pendingIds = new Set(pendingNodes.map((n) => n.id));

    const groupNode: Node<GroupNodeData> = {
      id: groupId,
      type: 'groupNode',
      position: { x, y },
      style: { width, height },
      data: { label: trimmed, color },
      selectable: true,
      zIndex: -1000,
    };

    setNodes((prev) => {
      const updated = prev.map((n) => {
        if (!pendingIds.has(n.id)) return n;
        return {
          ...n,
          parentId: groupId,
          extent: undefined,
          position: { x: n.position.x - x, y: n.position.y - y },
        };
      });
      return [groupNode, ...updated];
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>그룹 만들기</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            autoFocus
            placeholder="그룹 이름"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirm();
            }}
          />
          <div className="flex gap-2">
            {GROUP_COLORS.map(({ label: colorLabel, value: colorValue }) => {
              const s = GROUP_COLOR_STYLES[colorValue];
              return (
                <Button
                  key={colorValue}
                  variant="ghost"
                  size="icon"
                  title={colorLabel}
                  onClick={() => setColor(colorValue)}
                  className={cn(
                    'h-6 w-6 rounded-full border-2 p-0 transition-transform',
                    s.bg.replace('/70', ''),
                    color === colorValue ? `${s.border} scale-125` : 'border-gray-300',
                  )}
                />
              );
            })}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={confirm}>만들기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NodeCreateDialog({
  pos,
  setNodes,
  onClose,
}: {
  pos: { x: number; y: number };
  setNodes: (fn: (prev: Node[]) => Node[]) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState('');

  const confirm = () => {
    const trimmed = label.trim() || '새 페이지';
    setNodes((prev) => [
      ...prev,
      {
        id: `node-${Date.now()}`,
        type: 'flowNode',
        position: pos,
        data: { label: trimmed, route: trimmed, isDeadEnd: false },
      },
    ]);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>노드 생성</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          placeholder="페이지 이름"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') confirm();
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={confirm}>만들기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    const nodeW = draggedNode.measured?.width ?? 280;
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
            ? (redirectedImageBase64 ?? oldData.redirectedScreenshot ?? oldData.screenshot)
            : oldData.redirectedScreenshot;
          return {
            ...n,
            data: {
              ...oldData,
              screenshot: imageBase64,
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

          {dialogRequest?.type === 'screenshot' && (
            <ScreenshotDialog
              src={dialogRequest.src}
              label={dialogRequest.label}
              onClose={() => setDialogRequest(null)}
            />
          )}
          {dialogRequest?.type === 'memo' && (
            <MemoDialog
              nodeId={dialogRequest.nodeId}
              nodes={nodes}
              setNodes={setNodes}
              onClose={() => setDialogRequest(null)}
            />
          )}
          {dialogRequest?.type === 'comment' && (
            <CommentNodeDialog
              nodeId={dialogRequest.nodeId}
              nodes={nodes}
              setNodes={setNodes}
              onClose={() => setDialogRequest(null)}
            />
          )}
          {dialogRequest?.type === 'groupRename' && (
            <GroupRenameDialog
              nodeId={dialogRequest.nodeId}
              nodes={nodes}
              setNodes={setNodes}
              onClose={() => setDialogRequest(null)}
            />
          )}
          {dialogRequest?.type === 'edgeComment' && (
            <EdgeCommentDialog
              edgeId={dialogRequest.edgeId}
              edges={edges}
              setEdges={setEdges}
              onClose={() => setDialogRequest(null)}
            />
          )}
          {dialogRequest?.type === 'groupCreate' && (
            <GroupCreateDialog
              pendingNodes={dialogRequest.nodes}
              setNodes={setNodes}
              onClose={() => setDialogRequest(null)}
            />
          )}
          {dialogRequest?.type === 'nodeCreate' && (
            <NodeCreateDialog
              pos={dialogRequest.pos}
              setNodes={setNodes}
              onClose={() => setDialogRequest(null)}
            />
          )}
        </CollapseContext.Provider>
      </ScreenshotContext.Provider>
    </FlowActionsProvider>
  );
}
