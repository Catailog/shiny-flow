'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
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

import { useT } from '@/hooks/useT';

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

// 메뉴 그룹 시스템: 비어 있지 않은 그룹 사이에만 구분선을 삽입한다.
type MenuSection = (React.ReactNode | null | false)[];

function MenuGroups({ sections }: { sections: MenuSection[] }) {
  const nonEmpty = sections.filter((s) => s.some((x) => !!x));
  return (
    <>
      {nonEmpty.map((section, i) => (
        <Fragment key={i}>
          {i > 0 && <div className={SEPARATOR} />}
          {section}
        </Fragment>
      ))}
    </>
  );
}

function ColorSubMenu({
  nodeId,
  nodeColor,
  onClose,
}: {
  nodeId: string;
  nodeColor?: string;
  onClose: () => void;
}) {
  const { setNodes } = useReactFlow();
  const t = useT();
  return (
    <div className="absolute top-0 left-full min-w-[8rem] rounded-md border bg-popover p-1 shadow-md">
      {STATUS_COLORS.map(({ value }) => {
        const statusKey = (value ?? 'default') as keyof typeof t.nodeColors.status;
        const label = t.nodeColors.status[statusKey] ?? value;
        return (
          <div
            key={value ?? 'default'}
            role="menuitem"
            className={ITEM}
            onClick={() => {
              setNodes((prev) =>
                prev.map((n) =>
                  n.id === nodeId ? { ...n, data: { ...n.data, color: value } } : n,
                ),
              );
              onClose();
            }}
          >
            <span
              className={cn(
                'inline-block size-2.5 rounded-full border',
                getNodeColorStyle(value)?.dot ?? 'border-border bg-transparent',
              )}
            />
            {label}
            {nodeColor === value && <span className="ml-auto text-xs">✓</span>}
          </div>
        );
      })}
    </div>
  );
}

type Props = {
  state: ContextMenuState;
  onClose: () => void;
  onOpenDialog: (req: DialogRequest) => void;
};

export function ContextMenuController({ state, onClose, onOpenDialog }: Props) {
  const { setNodes, setEdges, deleteElements, getNode, getEdge, screenToFlowPosition } =
    useReactFlow();
  const t = useT();
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

  const addCommentItem = (
    <div
      key="addComment"
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
      {t.menu.addComment}
    </div>
  );

  let sections: MenuSection[];

  // 다중 선택 그룹 생성 조건이 충족되면 우클릭 대상과 무관하게 그룹 생성 메뉴를 보여 준다.
  if (canGroupSelected) {
    sections = [
      [
        <div
          key="groupCreate"
          role="menuitem"
          className={ITEM}
          onClick={() => {
            onOpenDialog({ type: 'groupCreate', nodes: selectedNodes });
            close();
          }}
        >
          <BoxSelectIcon className={ICON} />
          {t.menu.createGroup}
        </div>,
      ],
      [addCommentItem],
    ];
  } else if (target.type === 'pane') {
    sections = [
      [
        <div
          key="nodeCreate"
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
          {t.menu.createNode}
        </div>,
      ],
      [addCommentItem],
    ];
  } else if (target.type === 'commentNode') {
    sections = [
      [
        <div
          key="edit"
          role="menuitem"
          className={ITEM}
          onClick={() => {
            onOpenDialog({ type: 'comment', nodeId: target.nodeId });
            close();
          }}
        >
          <PencilIcon className={ICON} />
          {t.menu.edit}
        </div>,
        <div
          key="delete"
          role="menuitem"
          className={ITEM_DESTRUCTIVE}
          onClick={() => {
            deleteElements({ nodes: [{ id: target.nodeId }] });
            close();
          }}
        >
          <Trash2Icon className={ICON} />
          {t.menu.delete}
        </div>,
      ],
      [addCommentItem],
    ];
  } else if (target.type === 'flowNode') {
    const node = getNode(target.nodeId);
    const nodeData = node?.data as FlowNodeData | undefined;
    const isCollapsed = collapsedIds.has(target.nodeId);
    const canCollapse = hasChildren(target.nodeId);
    const hasMemo = !!nodeData?.memo;
    const hasSrc = !!nodeData?.screenshot;

    sections = [
      // 그룹 1: 탐색 (접기/펼치기) — 조건부, 없으면 구분선 사라짐
      [
        canCollapse ? (
          <div
            key="collapse"
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
            {isCollapsed ? t.menu.expand : t.menu.collapse}
          </div>
        ) : null,
      ],
      // 그룹 2: 노드 속성 (메모, 상태 태그, 스크린샷)
      [
        <div
          key="memo"
          role="menuitem"
          className={ITEM}
          onClick={() => {
            onOpenDialog({ type: 'memo', nodeId: target.nodeId });
            close();
          }}
        >
          <StickyNoteIcon className={ICON} />
          {hasMemo ? t.menu.editMemo : t.menu.addMemo}
        </div>,
        hasMemo ? (
          <div
            key="memoDelete"
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
            {t.menu.deleteMemo}
          </div>
        ) : null,
        <div
          key="colorTag"
          role="menuitem"
          className={cn(ITEM, 'relative')}
          onMouseEnter={() => setColorSubOpen(true)}
          onMouseLeave={() => setColorSubOpen(false)}
        >
          <PaletteIcon className={ICON} />
          {t.menu.colorTag}
          <ChevronRightIcon size={14} className="ml-auto" />
          {colorSubOpen && (
            <ColorSubMenu nodeId={target.nodeId} nodeColor={nodeData?.color} onClose={close} />
          )}
        </div>,
        hasSrc ? (
          <div
            key="screenshot"
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
            {t.menu.viewLarge}
          </div>
        ) : null,
      ],
      // 그룹 3: 댓글 생성
      [addCommentItem],
    ];
  } else if (target.type === 'groupNode') {
    const group = getNode(target.nodeId);
    const otherNodesSelected = selectedNodes.some((n) => n.id !== target.nodeId);

    sections = [
      // 단일 선택일 때만 그룹 액션 노출; 다중 선택 시 모두 null → 구분선 없이 댓글 생성만 표시
      [
        !otherNodesSelected ? (
          <div
            key="groupEdit"
            role="menuitem"
            className={ITEM}
            onClick={() => {
              onOpenDialog({ type: 'groupEdit', nodeId: target.nodeId });
              close();
            }}
          >
            <PencilIcon className={ICON} />
            {t.menu.editGroup}
          </div>
        ) : null,
        !otherNodesSelected ? (
          <div
            key="groupUngroup"
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
            {t.menu.ungroup}
          </div>
        ) : null,
      ],
      [addCommentItem],
    ];
  } else if (target.type === 'edge') {
    const edge = getEdge(target.edgeId);
    const edgeData = edge?.data as FlowEdgeData | undefined;
    const edgeComment = edgeData?.comment;
    const hasVisibleLabel = edgeComment !== undefined ? edgeComment !== '' : !!edge?.label;

    sections = [
      [
        <div
          key="edgeCommentEdit"
          role="menuitem"
          className={ITEM}
          onClick={() => {
            onOpenDialog({ type: 'edgeComment', edgeId: target.edgeId });
            close();
          }}
        >
          <MessageSquareIcon className={ICON} />
          {t.menu.editEdgeComment}
        </div>,
        hasVisibleLabel ? (
          <div
            key="edgeCommentDelete"
            role="menuitem"
            className={ITEM_DESTRUCTIVE}
            onClick={() => {
              setEdges((prev) =>
                prev.map((e) =>
                  e.id === target.edgeId ? { ...e, data: { ...e.data, comment: '' } } : e,
                ),
              );
              close();
            }}
          >
            <Trash2Icon className={ICON} />
            {t.menu.deleteEdgeComment}
          </div>
        ) : null,
        <div
          key="edgeDelete"
          role="menuitem"
          className={ITEM_DESTRUCTIVE}
          onClick={() => {
            deleteElements({ edges: [{ id: target.edgeId }] });
            close();
          }}
        >
          <Trash2Icon className={ICON} />
          {t.menu.deleteEdge}
        </div>,
      ],
      [addCommentItem],
    ];
  } else {
    sections = [[addCommentItem]];
  }

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[8rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      style={{ left: screenX, top: screenY }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <MenuGroups sections={sections} />
    </div>,
    document.body,
  );
}
