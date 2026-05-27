'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useReactFlow, useStore } from '@xyflow/react';
import { ChevronRightIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

import { useCollapseContext } from '../collapseContext';
import { STATUS_COLORS, getNodeColorStyle } from '../lib/nodeColors';
import type { ContextMenuState, DialogRequest } from '../types';
import type { FlowEdgeData } from './FlowEdge';
import type { FlowNodeData } from './FlowNode';

const ITEM =
  'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground';
const ITEM_DESTRUCTIVE = cn(ITEM, 'text-destructive hover:text-destructive focus:text-destructive');
const SEPARATOR = '-mx-1 my-1 h-px bg-border';

type Props = {
  state: ContextMenuState;
  onClose: () => void;
  onOpenDialog: (req: DialogRequest) => void;
};

export function ContextMenuController({ state, onClose, onOpenDialog }: Props) {
  const { setNodes, setEdges, deleteElements, getNode, getEdge, screenToFlowPosition } =
    useReactFlow();
  const { collapsedIds, toggleCollapse, hasChildren } = useCollapseContext();
  const selectedFlowNodes = useStore((s) =>
    s.nodes.filter((n) => n.selected && n.type === 'flowNode'),
  );
  const [colorSubOpen, setColorSubOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setColorSubOpen(false);
        onClose();
      }
    };
    document.addEventListener('mousedown', handleMouseDown, true);
    return () => document.removeEventListener('mousedown', handleMouseDown, true);
  }, [state, onClose]);

  if (!state) return null;

  const { screenX, screenY, target } = state;

  const close = () => {
    setColorSubOpen(false);
    onClose();
  };

  let items: React.ReactNode;

  if (target.type === 'pane') {
    if (selectedFlowNodes.length >= 2) {
      items = (
        <div
          role="menuitem"
          className={ITEM}
          onClick={() => {
            onOpenDialog({ type: 'groupCreate', nodes: selectedFlowNodes });
            close();
          }}
        >
          그룹 생성
        </div>
      );
    } else {
      items = (
        <>
          <div
            role="menuitem"
            className={ITEM}
            onClick={() => {
              onOpenDialog({
                type: 'nodeCreate',
                pos: screenToFlowPosition({ x: screenX, y: screenY }),
              });
              close();
            }}
          >
            노드 생성
          </div>
          <div
            role="menuitem"
            className={ITEM}
            onClick={() => {
              const pos = screenToFlowPosition({ x: screenX, y: screenY });
              setNodes((prev) => [
                ...prev,
                {
                  id: `comment-${Date.now()}`,
                  type: 'commentNode',
                  position: pos,
                  data: { content: '' },
                },
              ]);
              close();
            }}
          >
            댓글 생성
          </div>
        </>
      );
    }
  } else if (target.type === 'commentNode') {
    items = (
      <>
        <div
          role="menuitem"
          className={ITEM}
          onClick={() => {
            onOpenDialog({ type: 'comment', nodeId: target.nodeId });
            close();
          }}
        >
          수정
        </div>
        <div
          role="menuitem"
          className={ITEM_DESTRUCTIVE}
          onClick={() => {
            deleteElements({ nodes: [{ id: target.nodeId }] });
            close();
          }}
        >
          삭제
        </div>
      </>
    );
  } else if (target.type === 'flowNode') {
    if (selectedFlowNodes.length >= 2) {
      items = (
        <div
          role="menuitem"
          className={ITEM}
          onClick={() => {
            onOpenDialog({ type: 'groupCreate', nodes: selectedFlowNodes });
            close();
          }}
        >
          그룹 생성
        </div>
      );
    } else {
      const node = getNode(target.nodeId);
      const nodeData = node?.data as FlowNodeData | undefined;
      const isCollapsed = collapsedIds.has(target.nodeId);
      const canCollapse = hasChildren(target.nodeId);
      const hasMemo = !!nodeData?.memo;
      const hasSrc = !!nodeData?.screenshot;

      items = (
        <>
          {canCollapse && (
            <>
              <div
                role="menuitem"
                className={ITEM}
                onClick={() => {
                  toggleCollapse(target.nodeId);
                  close();
                }}
              >
                {isCollapsed ? '펼치기' : '접기'}
              </div>
              <div className={SEPARATOR} />
            </>
          )}
          <div
            role="menuitem"
            className={ITEM}
            onClick={() => {
              onOpenDialog({ type: 'memo', nodeId: target.nodeId });
              close();
            }}
          >
            {hasMemo ? '메모 수정' : '메모 추가'}
          </div>
          {hasMemo && (
            <div
              role="menuitem"
              className={ITEM_DESTRUCTIVE}
              onClick={() => {
                setNodes((prev) =>
                  prev.map((n) =>
                    n.id === target.nodeId ? { ...n, data: { ...n.data, memo: undefined } } : n,
                  ),
                );
                close();
              }}
            >
              메모 삭제
            </div>
          )}
          <div
            role="menuitem"
            className={cn(ITEM, 'relative')}
            onMouseEnter={() => setColorSubOpen(true)}
            onMouseLeave={() => setColorSubOpen(false)}
          >
            색상 태그
            <ChevronRightIcon size={14} className="ml-auto" />
            {colorSubOpen && (
              <div className="absolute top-0 left-full min-w-[8rem] rounded-md border bg-popover p-1 shadow-md">
                {STATUS_COLORS.map(({ label, value }) => (
                  <div
                    key={label}
                    role="menuitem"
                    className={cn(ITEM, 'gap-2')}
                    onClick={() => {
                      setNodes((prev) =>
                        prev.map((n) =>
                          n.id === target.nodeId ? { ...n, data: { ...n.data, color: value } } : n,
                        ),
                      );
                      close();
                    }}
                  >
                    <span
                      className={cn(
                        'inline-block size-2.5 rounded-full border',
                        getNodeColorStyle(value)?.dot ?? 'border-gray-300 bg-transparent',
                      )}
                    />
                    {label}
                    {nodeData?.color === value && <span className="ml-auto text-xs">✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          {hasSrc && (
            <>
              <div className={SEPARATOR} />
              <div
                role="menuitem"
                className={ITEM}
                onClick={() => {
                  onOpenDialog({
                    type: 'screenshot',
                    src: `data:image/png;base64,${nodeData!.screenshot}`,
                    label: nodeData!.label,
                  });
                  close();
                }}
              >
                크게 보기
              </div>
            </>
          )}
        </>
      );
    } // end else (single selection)
  } else if (target.type === 'groupNode') {
    items = (
      <>
        <div
          role="menuitem"
          className={ITEM}
          onClick={() => {
            onOpenDialog({ type: 'groupRename', nodeId: target.nodeId });
            close();
          }}
        >
          이름 변경
        </div>
        <div
          role="menuitem"
          className={ITEM_DESTRUCTIVE}
          onClick={() => {
            const group = getNode(target.nodeId);
            setNodes((prev) => {
              if (!group) return prev.filter((n) => n.id !== target.nodeId);
              return prev
                .filter((n) => n.id !== target.nodeId)
                .map((n) => {
                  if (n.parentId !== target.nodeId) return n;
                  return {
                    ...n,
                    parentId: undefined,
                    extent: undefined,
                    position: {
                      x: n.position.x + group.position.x,
                      y: n.position.y + group.position.y,
                    },
                  };
                });
            });
            close();
          }}
        >
          그룹 해제
        </div>
      </>
    );
  } else if (target.type === 'edge') {
    const edge = getEdge(target.edgeId);
    const edgeData = edge?.data as FlowEdgeData | undefined;
    const hasComment = !!edgeData?.comment;

    items = (
      <>
        <div
          role="menuitem"
          className={ITEM}
          onClick={() => {
            onOpenDialog({ type: 'edgeComment', edgeId: target.edgeId });
            close();
          }}
        >
          코멘트 편집
        </div>
        {hasComment && (
          <div
            role="menuitem"
            className={ITEM_DESTRUCTIVE}
            onClick={() => {
              setEdges((prev) =>
                prev.map((e) =>
                  e.id === target.edgeId ? { ...e, data: { comment: undefined } } : e,
                ),
              );
              close();
            }}
          >
            코멘트 삭제
          </div>
        )}
        <div className={SEPARATOR} />
        <div
          role="menuitem"
          className={ITEM_DESTRUCTIVE}
          onClick={() => {
            deleteElements({ edges: [{ id: target.edgeId }] });
            close();
          }}
        >
          엣지 삭제
        </div>
      </>
    );
  }

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[8rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      style={{ left: screenX, top: screenY }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items}
    </div>,
    document.body,
  );
}
