'use client';

import { Fragment } from 'react';

import { useReactFlow, useStore } from '@xyflow/react';
import {
  BoxSelectIcon,
  CameraIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  MaximizeIcon,
  MessageSquareIcon,
  MessageSquarePlusIcon,
  PaletteIcon,
  PencilIcon,
  PlusIcon,
  SlidersHorizontalIcon,
  StickyNoteIcon,
  Trash2Icon,
  UngroupIcon,
} from 'lucide-react';

import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';

import { cn } from '@/lib/utils';

import { useT } from '@/hooks/useT';

import { useCollapseContext } from '../collapseContext';
import { useHistory } from '../historyContext';
import { STATUS_COLORS, getNodeColorStyle } from '../lib/nodeColors';
import { getAbsolutePosition, recomputeGroupZIndexes } from '../lib/nodeUtils';
import { useScreenshotContext } from '../screenshotContext';
import type { ContextMenuState, DialogRequest } from '../types';
import type { EdgeLineStyle, FlowEdgeData } from './FlowEdge';
import type { FlowNodeData } from './FlowNode';

const ICON = 'size-3.5 shrink-0';

const MenuItem = (props: React.ComponentProps<typeof ContextMenuItem>) => (
  <ContextMenuItem {...props} className={cn('cursor-pointer', props.className)} />
);

const SubTrigger = (props: React.ComponentProps<typeof ContextMenuSubTrigger>) => (
  <ContextMenuSubTrigger {...props} className={cn('cursor-pointer', props.className)} />
);

type MenuSection = (React.ReactNode | null | false)[];

function MenuGroups({ sections }: { sections: MenuSection[] }) {
  const nonEmpty = sections.filter((s) => s.some((x) => !!x));
  return (
    <>
      {nonEmpty.map((section, i) => (
        <Fragment key={i}>
          {i > 0 && <ContextMenuSeparator />}
          {section}
        </Fragment>
      ))}
    </>
  );
}

const EDGE_LINE_STYLES: { value: EdgeLineStyle; dotClass: string }[] = [
  { value: 'solid', dotClass: 'h-px w-5 bg-foreground' },
  { value: 'dashed', dotClass: 'w-5 border-t-2 border-dashed border-foreground' },
];

type Props = {
  state: ContextMenuState;
  onOpenDialog: (req: DialogRequest) => void;
};

export function ContextMenuController({ state, onOpenDialog }: Props) {
  const { setNodes, setEdges, deleteElements, getNode, getEdge, screenToFlowPosition } =
    useReactFlow();
  const { pushSnapshot } = useHistory();
  const t = useT();
  const { available, captureNode, validateForCapture } = useScreenshotContext();
  const { collapsedIds, toggleCollapse, hasChildren } = useCollapseContext();
  const selectedNodes = useStore((s) =>
    s.nodes.filter((n) => n.selected && (n.type === 'flowNode' || n.type === 'groupNode')),
  );
  const selectedEdges = useStore((s) => s.edges.filter((e) => e.selected));
  const parentIdSet = new Set(selectedNodes.map((n) => n.parentId ?? null));
  const canGroupSelected = selectedNodes.length >= 2 && parentIdSet.size === 1;
  const isMultiSelected = selectedNodes.length + selectedEdges.length >= 2;

  if (!state) return null;

  const { screenX, screenY, target } = state;

  const addCommentItem = (
    <MenuItem
      key="addComment"
      onClick={() => {
        pushSnapshot();
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
      }}
    >
      <MessageSquarePlusIcon className={ICON} />
      {t.menu.addComment}
    </MenuItem>
  );

  const deleteSelectedItem = isMultiSelected ? (
    <MenuItem
      key="deleteSelected"
      variant="destructive"
      onClick={() => {
        pushSnapshot();
        deleteElements({ nodes: selectedNodes, edges: selectedEdges });
      }}
    >
      <Trash2Icon className={ICON} />
      {t.menu.deleteSelected}
    </MenuItem>
  ) : null;

  let sections: MenuSection[];

  if (canGroupSelected) {
    sections = [
      [
        <MenuItem
          key="groupCreate"
          onClick={() => {
            onOpenDialog({ type: 'groupCreate', nodes: selectedNodes });
          }}
        >
          <BoxSelectIcon className={ICON} />
          {t.menu.createGroup}
        </MenuItem>,
      ],
      [addCommentItem],
      [deleteSelectedItem],
    ];
  } else if (target.type === 'pane') {
    sections = [
      [
        <MenuItem
          key="nodeCreate"
          onClick={() => {
            onOpenDialog({
              type: 'nodeCreate',
              pos: screenToFlowPosition({ x: screenX, y: screenY }),
            });
          }}
        >
          <PlusIcon className={ICON} />
          {t.menu.createNode}
        </MenuItem>,
      ],
      [addCommentItem],
    ];
  } else if (target.type === 'commentNode') {
    sections = [
      [
        <MenuItem
          key="edit"
          onClick={() => {
            onOpenDialog({ type: 'comment', nodeId: target.nodeId });
          }}
        >
          <PencilIcon className={ICON} />
          {t.menu.editComment}
        </MenuItem>,
      ],
      [addCommentItem],
      [
        <MenuItem
          key="delete"
          variant="destructive"
          onClick={() => {
            pushSnapshot();
            deleteElements({ nodes: [{ id: target.nodeId }] });
          }}
        >
          <Trash2Icon className={ICON} />
          {t.menu.deleteComment}
        </MenuItem>,
      ],
    ];
  } else if (target.type === 'flowNode') {
    const node = getNode(target.nodeId);
    const nodeData = node?.data as FlowNodeData | undefined;
    const isCollapsed = collapsedIds.has(target.nodeId);
    const canCollapse = hasChildren(target.nodeId);
    const hasMemo = !!nodeData?.memo;
    const hasSrc = !!nodeData?.screenshot;

    const handleRecapture = () => {
      if (!nodeData) return;
      if (!available) {
        validateForCapture();
        return;
      }
      const paramValues = nodeData.paramValues ?? {};
      let resolvedRoute = nodeData.route.replace(
        /\[\.{0,3}([^\]]+)\]/g,
        (_, key: string) => paramValues[key] ?? key,
      );
      if (nodeData.catchAllParam) {
        const val = paramValues[nodeData.catchAllParam]?.trim();
        if (val) resolvedRoute = `${resolvedRoute}/${val}`;
      }
      captureNode(target.nodeId, resolvedRoute, paramValues);
    };

    sections = [
      [
        canCollapse ? (
          <MenuItem
            key="collapse"
            onClick={() => {
              toggleCollapse(target.nodeId);
            }}
          >
            {isCollapsed ? (
              <ChevronDownIcon className={ICON} />
            ) : (
              <ChevronRightIcon className={ICON} />
            )}
            {isCollapsed ? t.menu.expand : t.menu.collapse}
          </MenuItem>
        ) : null,
      ],
      [
        <MenuItem
          key="labelEdit"
          onClick={() => {
            onOpenDialog({ type: 'labelEdit', nodeId: target.nodeId });
          }}
        >
          <PencilIcon className={ICON} />
          {t.menu.editNodeLabel}
        </MenuItem>,
        <MenuItem
          key="routeEdit"
          onClick={() => {
            onOpenDialog({ type: 'routeEdit', nodeId: target.nodeId });
          }}
        >
          <PencilIcon className={ICON} />
          {t.menu.editNodeRoute}
        </MenuItem>,
        <MenuItem
          key="memo"
          onClick={() => {
            onOpenDialog({ type: 'memo', nodeId: target.nodeId });
          }}
        >
          <StickyNoteIcon className={ICON} />
          {hasMemo ? t.menu.editMemo : t.menu.addMemo}
        </MenuItem>,
        hasMemo ? (
          <MenuItem
            key="memoDelete"
            variant="destructive"
            onClick={() => {
              pushSnapshot();
              setNodes((prev) =>
                prev.map((n) =>
                  n.id === target.nodeId ? { ...n, data: { ...n.data, memo: undefined } } : n,
                ),
              );
            }}
          >
            <Trash2Icon className={ICON} />
            {t.menu.deleteMemo}
          </MenuItem>
        ) : null,
        <ContextMenuSub key="colorTag">
          <SubTrigger>
            <PaletteIcon className={ICON} />
            {t.menu.colorTag}
          </SubTrigger>
          <ContextMenuSubContent>
            {STATUS_COLORS.map(({ value }) => {
              const statusKey = (value ?? 'default') as keyof typeof t.nodeColors.status;
              const label = t.nodeColors.status[statusKey] ?? value;
              return (
                <MenuItem
                  key={value ?? 'default'}
                  onClick={() => {
                    pushSnapshot();
                    setNodes((prev) =>
                      prev.map((n) =>
                        n.id === target.nodeId ? { ...n, data: { ...n.data, color: value } } : n,
                      ),
                    );
                  }}
                >
                  <span
                    className={cn(
                      'inline-block size-2.5 rounded-full border',
                      getNodeColorStyle(value)?.dot ?? 'border-border bg-transparent',
                    )}
                  />
                  {label}
                  {nodeData?.color === value && <span className="ml-auto text-xs">&#10003;</span>}
                </MenuItem>
              );
            })}
          </ContextMenuSubContent>
        </ContextMenuSub>,
        <MenuItem key="recapture" onClick={handleRecapture}>
          <CameraIcon className={ICON} />
          {t.menu.recapture}
        </MenuItem>,
        hasSrc ? (
          <MenuItem
            key="screenshot"
            onClick={() => {
              onOpenDialog({
                type: 'screenshot',
                src: `data:image/png;base64,${nodeData!.screenshot}`,
                label: nodeData!.label,
              });
            }}
          >
            <MaximizeIcon className={ICON} />
            {t.menu.viewLarge}
          </MenuItem>
        ) : null,
      ],
      [addCommentItem],
      [
        <MenuItem
          key="nodeDelete"
          variant="destructive"
          onClick={() => {
            pushSnapshot();
            deleteElements({ nodes: [{ id: target.nodeId }] });
          }}
        >
          <Trash2Icon className={ICON} />
          {t.menu.deleteNode}
        </MenuItem>,
        deleteSelectedItem,
      ],
    ];
  } else if (target.type === 'groupNode') {
    const group = getNode(target.nodeId);
    const otherNodesSelected = selectedNodes.some(
      (n) => n.id !== target.nodeId && n.type === 'groupNode',
    );

    sections = [
      [
        !otherNodesSelected ? (
          <MenuItem
            key="groupEdit"
            onClick={() => {
              onOpenDialog({ type: 'groupEdit', nodeId: target.nodeId });
            }}
          >
            <PencilIcon className={ICON} />
            {t.menu.editGroup}
          </MenuItem>
        ) : null,
        !otherNodesSelected ? (
          <MenuItem
            key="groupUngroup"
            variant="destructive"
            onClick={() => {
              if (group?.parentId) {
                onOpenDialog({ type: 'groupUngroup', nodeId: target.nodeId });
              } else {
                pushSnapshot();
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
              }
            }}
          >
            <UngroupIcon className={ICON} />
            {t.menu.ungroup}
          </MenuItem>
        ) : null,
      ],
      [addCommentItem],
      [
        <MenuItem
          key="groupDelete"
          variant="destructive"
          onClick={() => {
            pushSnapshot();
            deleteElements({ nodes: [{ id: target.nodeId }] });
          }}
        >
          <Trash2Icon className={ICON} />
          {t.menu.deleteGroup}
        </MenuItem>,
        deleteSelectedItem,
      ],
    ];
  } else if (target.type === 'edge') {
    const edge = getEdge(target.edgeId);
    const edgeData = edge?.data as FlowEdgeData | undefined;
    const edgeComment = edgeData?.comment;
    const hasVisibleLabel = edgeComment !== undefined ? edgeComment !== '' : !!edge?.label;
    const currentStyle = edgeData?.lineStyle;

    sections = [
      [
        <MenuItem
          key="edgeCommentEdit"
          onClick={() => {
            onOpenDialog({ type: 'edgeComment', edgeId: target.edgeId });
          }}
        >
          <MessageSquareIcon className={ICON} />
          {t.menu.editEdgeComment}
        </MenuItem>,
        <ContextMenuSub key="edgeLineStyle">
          <SubTrigger>
            <SlidersHorizontalIcon className={ICON} />
            {t.menu.edgeLineStyle}
          </SubTrigger>
          <ContextMenuSubContent>
            {EDGE_LINE_STYLES.map(({ value, dotClass }) => (
              <MenuItem
                key={value}
                onClick={() => {
                  pushSnapshot();
                  setEdges((prev) =>
                    prev.map((e) =>
                      e.id === target.edgeId
                        ? {
                            ...e,
                            animated: false,
                            data: { ...e.data, lineStyle: value },
                          }
                        : e,
                    ),
                  );
                }}
              >
                <span className={cn('inline-block shrink-0', dotClass)} />
                {t.edgeLineStyles[value]}
                {(currentStyle ?? 'solid') === value && (
                  <span className="ml-auto text-xs">&#10003;</span>
                )}
              </MenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>,
      ],
      [addCommentItem],
      [
        hasVisibleLabel ? (
          <MenuItem
            key="edgeCommentDelete"
            variant="destructive"
            onClick={() => {
              pushSnapshot();
              setEdges((prev) =>
                prev.map((e) =>
                  e.id === target.edgeId ? { ...e, data: { ...e.data, comment: '' } } : e,
                ),
              );
            }}
          >
            <Trash2Icon className={ICON} />
            {t.menu.deleteEdgeComment}
          </MenuItem>
        ) : null,
        <MenuItem
          key="edgeDelete"
          variant="destructive"
          onClick={() => {
            pushSnapshot();
            deleteElements({ edges: [{ id: target.edgeId }] });
          }}
        >
          <Trash2Icon className={ICON} />
          {t.menu.deleteEdge}
        </MenuItem>,
        deleteSelectedItem,
      ],
    ];
  } else {
    sections = [[addCommentItem]];
  }

  return <MenuGroups sections={sections} />;
}
