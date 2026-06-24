'use client';

import { type Edge, type Node, useReactFlow } from '@xyflow/react';
import {
  CameraIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  MaximizeIcon,
  PaletteIcon,
  PencilIcon,
  StickyNoteIcon,
  Trash2Icon,
} from 'lucide-react';

import { ContextMenuSub, ContextMenuSubContent } from '@/components/ui/context-menu';

import { cn } from '@/lib/utils';

import { useT } from '@/hooks/useT';

import { useCollapseContext } from '../../collapseContext';
import { useHistory } from '../../historyContext';
import { useNodeUpdate } from '../../hooks/useNodeUpdate';
import { STATUS_COLORS, getNodeColorStyle } from '../../lib/nodeColors';
import { useScreenshotContext } from '../../screenshotContext';
import type { DialogRequest } from '../../types';
import type { FlowNodeData } from '../FlowNode';
import { AddCommentItem, ICON, MenuGroups, MenuItem, type MenuSection, SubTrigger } from './shared';

type Props = {
  nodeId: string;
  screenX: number;
  screenY: number;
  onOpenDialog: (req: DialogRequest) => void;
  selectedNodes: Node[];
  selectedEdges: Edge[];
};

export function FlowNodeMenu({
  nodeId,
  screenX,
  screenY,
  onOpenDialog,
  selectedNodes,
  selectedEdges,
}: Props) {
  const { deleteElements, getNode } = useReactFlow();
  const { pushSnapshot } = useHistory();
  const updateNode = useNodeUpdate();
  const { collapsedIds, toggleCollapse, hasChildren } = useCollapseContext();
  const { available, captureNode, validateForCapture } = useScreenshotContext();
  const t = useT();

  const node = getNode(nodeId);
  const nodeData = node?.data as FlowNodeData | undefined;
  const isCollapsed = collapsedIds.has(nodeId);
  const canCollapse = hasChildren(nodeId);
  const hasMemo = !!nodeData?.memo;
  const hasSrc = !!nodeData?.screenshot;
  const isMultiSelected = selectedNodes.length + selectedEdges.length >= 2;

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
    captureNode(nodeId, resolvedRoute, paramValues);
  };

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
      canCollapse ? (
        <MenuItem key="collapse" onClick={() => toggleCollapse(nodeId)}>
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
      <MenuItem key="labelEdit" onClick={() => onOpenDialog({ type: 'labelEdit', nodeId })}>
        <PencilIcon className={ICON} />
        {t.menu.editNodeLabel}
      </MenuItem>,
      <MenuItem key="routeEdit" onClick={() => onOpenDialog({ type: 'routeEdit', nodeId })}>
        <PencilIcon className={ICON} />
        {t.menu.editNodeRoute}
      </MenuItem>,
      <MenuItem key="memo" onClick={() => onOpenDialog({ type: 'memo', nodeId })}>
        <StickyNoteIcon className={ICON} />
        {hasMemo ? t.menu.editMemo : t.menu.addMemo}
      </MenuItem>,
      hasMemo ? (
        <MenuItem
          key="memoDelete"
          variant="destructive"
          onClick={() => {
            pushSnapshot();
            updateNode(nodeId, { memo: undefined });
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
                  updateNode(nodeId, { color: value });
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
          onClick={() =>
            onOpenDialog({
              type: 'screenshot',
              src: `data:image/png;base64,${nodeData!.screenshot}`,
              label: nodeData!.label,
            })
          }
        >
          <MaximizeIcon className={ICON} />
          {t.menu.viewLarge}
        </MenuItem>
      ) : null,
    ],
    [<AddCommentItem key="addComment" screenX={screenX} screenY={screenY} />],
    [
      <MenuItem
        key="nodeDelete"
        variant="destructive"
        onClick={() => {
          pushSnapshot();
          deleteElements({ nodes: [{ id: nodeId }] });
        }}
      >
        <Trash2Icon className={ICON} />
        {t.menu.deleteNode}
      </MenuItem>,
      deleteSelectedItem,
    ],
  ];

  return <MenuGroups sections={sections} />;
}
