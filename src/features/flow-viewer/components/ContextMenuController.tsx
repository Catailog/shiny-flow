'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useReactFlow, useStore } from '@xyflow/react';
import {
  BoxSelectIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  MaximizeIcon,
  MessageSquareIcon,
  MessageSquarePlusIcon,
  PaletteIcon,
  PencilIcon,
  PlusIcon,
  StickyNoteIcon,
  Trash2Icon,
  UngroupIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';

import { useCollapseContext } from '../collapseContext';
import { STATUS_COLORS, getNodeColorStyle } from '../lib/nodeColors';
import { getAbsolutePosition, recomputeGroupZIndexes } from '../lib/nodeUtils';
import type { ContextMenuState, DialogRequest } from '../types';
import type { FlowEdgeData } from './FlowEdge';
import type { FlowNodeData } from './FlowNode';

const ITEM =
  'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground';
const ICON = 'size-3.5 shrink-0';
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
  const selectedNodes = useStore((s) =>
    s.nodes.filter((n) => n.selected && (n.type === 'flowNode' || n.type === 'groupNode')),
  );
  const parentIdSet = new Set(selectedNodes.map((n) => n.parentId ?? null));
  const canGroupSelected = selectedNodes.length >= 2 && parentIdSet.size === 1;
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
    if (canGroupSelected) {
      items = (
        <div
          role="menuitem"
          className={ITEM}
          onClick={() => {
            onOpenDialog({ type: 'groupCreate', nodes: selectedNodes });
            close();
          }}
        >
          <BoxSelectIcon className={ICON} />
          그룹 생성
        </div>
      );
    } else {
      items = (
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
          <PlusIcon className={ICON} />
          노드 생성
        </div>
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
          <PencilIcon className={ICON} />
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
          <Trash2Icon className={ICON} />
          삭제
        </div>
      </>
    );
  } else if (target.type === 'flowNode') {
    if (canGroupSelected) {
      items = (
        <div
          role="menuitem"
          className={ITEM}
          onClick={() => {
            onOpenDialog({ type: 'groupCreate', nodes: selectedNodes });
            close();
          }}
        >
          <BoxSelectIcon className={ICON} />
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
                {isCollapsed ? (
                  <ChevronDownIcon className={ICON} />
                ) : (
                  <ChevronRightIcon className={ICON} />
                )}
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
            <StickyNoteIcon className={ICON} />
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
              <Trash2Icon className={ICON} />
              메모 삭제
            </div>
          )}
          <div
            role="menuitem"
            className={cn(ITEM, 'relative')}
            onMouseEnter={() => setColorSubOpen(true)}
            onMouseLeave={() => setColorSubOpen(false)}
          >
            <PaletteIcon className={ICON} />
            색상 태그
            <ChevronRightIcon size={14} className="ml-auto" />
            {colorSubOpen && (
              <div className="absolute top-0 left-full min-w-[8rem] rounded-md border bg-popover p-1 shadow-md">
                {STATUS_COLORS.map(({ label, value }) => (
                  <div
                    key={label}
                    role="menuitem"
                    className={ITEM}
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
                <MaximizeIcon className={ICON} />
                크게 보기
              </div>
            </>
          )}
        </>
      );
    } // end else (single selection)
  } else if (target.type === 'groupNode') {
    const group = getNode(target.nodeId);
    const otherNodesSelected = selectedNodes.some((n) => n.id !== target.nodeId);

    items = (
      <>
        <div
          role="menuitem"
          className={ITEM}
          onClick={() => {
            onOpenDialog({ type: 'groupEdit', nodeId: target.nodeId });
            close();
          }}
        >
          <PencilIcon className={ICON} />
          그룹 수정
        </div>
        {!otherNodesSelected && (
          <div
            role="menuitem"
            className={ITEM_DESTRUCTIVE}
            onClick={() => {
              if (group?.parentId) {
                onOpenDialog({ type: 'groupUngroup', nodeId: target.nodeId });
                close();
              } else {
                setNodes((prev) => {
                  const result = prev
                    .filter((n) => n.id !== target.nodeId)
                    .map((n) => {
                      if (n.parentId !== target.nodeId) return n;
                      const absPos = getAbsolutePosition(n, prev);
                      return { ...n, parentId: undefined, extent: undefined, position: absPos };
                    });
                  return recomputeGroupZIndexes(result);
                });
                close();
              }
            }}
          >
            <UngroupIcon className={ICON} />
            그룹 해제
          </div>
        )}
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
          <MessageSquareIcon className={ICON} />
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
            <Trash2Icon className={ICON} />
            코멘트 삭제
          </div>
        )}
        <div
          role="menuitem"
          className={ITEM_DESTRUCTIVE}
          onClick={() => {
            deleteElements({ edges: [{ id: target.edgeId }] });
            close();
          }}
        >
          <Trash2Icon className={ICON} />
          엣지 삭제
        </div>
      </>
    );
  }

  const addCommentItem = (
    <>
      <div className={SEPARATOR} />
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
              data: { content: '', author: 'localhost', createdAt: new Date().toISOString() },
            },
          ]);
          close();
        }}
      >
        <MessageSquarePlusIcon className={ICON} />
        댓글 생성
      </div>
    </>
  );

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[8rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      style={{ left: screenX, top: screenY }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items}
      {addCommentItem}
    </div>,
    document.body,
  );
}
