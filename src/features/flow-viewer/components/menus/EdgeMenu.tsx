'use client';

import { type Edge, type Node, useReactFlow } from '@xyflow/react';
import { MessageSquareIcon, SlidersHorizontalIcon, Trash2Icon } from 'lucide-react';

import { ContextMenuSub, ContextMenuSubContent } from '@/components/ui/context-menu';

import { cn } from '@/lib/utils';

import { useT } from '@/hooks/useT';

import { useHistory } from '../../historyContext';
import { useEdgeUpdate } from '../../hooks/useEdgeUpdate';
import type { DialogRequest } from '../../types';
import type { EdgeLineStyle, FlowEdgeData } from '../FlowEdge';
import { AddCommentItem, ICON, MenuGroups, MenuItem, type MenuSection, SubTrigger } from './shared';

const EDGE_LINE_STYLES: { value: EdgeLineStyle; dotClass: string }[] = [
  { value: 'solid', dotClass: 'h-px w-5 bg-foreground' },
  { value: 'dashed', dotClass: 'w-5 border-t-2 border-dashed border-foreground' },
];

type Props = {
  edgeId: string;
  screenX: number;
  screenY: number;
  onOpenDialog: (req: DialogRequest) => void;
  selectedNodes: Node[];
  selectedEdges: Edge[];
};

export function EdgeMenu({
  edgeId,
  screenX,
  screenY,
  onOpenDialog,
  selectedNodes,
  selectedEdges,
}: Props) {
  const { deleteElements, getEdge } = useReactFlow();
  const { pushSnapshot } = useHistory();
  const updateEdge = useEdgeUpdate();
  const t = useT();

  const edge = getEdge(edgeId);
  const edgeData = edge?.data as FlowEdgeData | undefined;
  const edgeComment = edgeData?.comment;
  const hasVisibleLabel = edgeComment !== undefined ? edgeComment !== '' : !!edge?.label;
  const currentStyle = edgeData?.lineStyle;
  const isMultiSelected = selectedNodes.length + selectedEdges.length >= 2;

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

  const sections: MenuSection[] = [
    [
      <MenuItem key="edgeCommentEdit" onClick={() => onOpenDialog({ type: 'edgeComment', edgeId })}>
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
                updateEdge(edgeId, { lineStyle: value }, { animated: false });
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
    [<AddCommentItem key="addComment" screenX={screenX} screenY={screenY} />],
    [
      hasVisibleLabel ? (
        <MenuItem
          key="edgeCommentDelete"
          variant="destructive"
          onClick={() => {
            pushSnapshot();
            updateEdge(edgeId, { comment: '' });
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
          deleteElements({ edges: [{ id: edgeId }] });
        }}
      >
        <Trash2Icon className={ICON} />
        {t.menu.deleteEdge}
      </MenuItem>,
      deleteSelectedItem,
    ],
  ];

  return <MenuGroups sections={sections} />;
}
