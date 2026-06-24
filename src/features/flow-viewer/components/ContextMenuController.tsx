'use client';

import { useReactFlow, useStore } from '@xyflow/react';
import { MaximizeIcon } from 'lucide-react';

import { useT } from '@/hooks/useT';

import type { ContextMenuState, DialogRequest } from '../types';
import type { FlowNodeData } from './FlowNode';
import { CommentNodeMenu } from './menus/CommentNodeMenu';
import { EdgeMenu } from './menus/EdgeMenu';
import { FlowNodeMenu } from './menus/FlowNodeMenu';
import { GroupNodeMenu } from './menus/GroupNodeMenu';
import { GroupSelectMenu } from './menus/GroupSelectMenu';
import { PaneMenu } from './menus/PaneMenu';
import { ICON, MenuItem } from './menus/shared';

type Props = {
  state: ContextMenuState;
  onOpenDialog: (req: DialogRequest) => void;
  readOnly?: boolean;
};

export function ContextMenuController({ state, onOpenDialog, readOnly }: Props) {
  const { getNode } = useReactFlow();
  const t = useT();
  const selectedNodes = useStore((s) =>
    s.nodes.filter((n) => n.selected && (n.type === 'flowNode' || n.type === 'groupNode')),
  );
  const selectedEdges = useStore((s) => s.edges.filter((e) => e.selected));
  const parentIdSet = new Set(selectedNodes.map((n) => n.parentId ?? null));
  const canGroupSelected = selectedNodes.length >= 2 && parentIdSet.size === 1;

  if (!state) return null;
  const { screenX, screenY, target } = state;

  if (readOnly) {
    if (target.type === 'flowNode') {
      const node = getNode(target.nodeId);
      const nodeData = node?.data as FlowNodeData | undefined;
      if (!nodeData?.screenshot) return null;
      return (
        <MenuItem
          onClick={() =>
            onOpenDialog({
              type: 'screenshot',
              src: `data:image/png;base64,${nodeData.screenshot}`,
              label: nodeData.label,
            })
          }
        >
          <MaximizeIcon className={ICON} />
          {t.menu.viewLarge}
        </MenuItem>
      );
    }
    return null;
  }

  if (canGroupSelected) {
    return (
      <GroupSelectMenu
        screenX={screenX}
        screenY={screenY}
        onOpenDialog={onOpenDialog}
        selectedNodes={selectedNodes}
        selectedEdges={selectedEdges}
      />
    );
  }

  if (target.type === 'pane') {
    return <PaneMenu screenX={screenX} screenY={screenY} onOpenDialog={onOpenDialog} />;
  }
  if (target.type === 'commentNode') {
    return (
      <CommentNodeMenu
        nodeId={target.nodeId}
        screenX={screenX}
        screenY={screenY}
        onOpenDialog={onOpenDialog}
      />
    );
  }
  if (target.type === 'flowNode') {
    return (
      <FlowNodeMenu
        nodeId={target.nodeId}
        screenX={screenX}
        screenY={screenY}
        onOpenDialog={onOpenDialog}
        selectedNodes={selectedNodes}
        selectedEdges={selectedEdges}
      />
    );
  }
  if (target.type === 'groupNode') {
    return (
      <GroupNodeMenu
        nodeId={target.nodeId}
        screenX={screenX}
        screenY={screenY}
        onOpenDialog={onOpenDialog}
        selectedNodes={selectedNodes}
        selectedEdges={selectedEdges}
      />
    );
  }
  if (target.type === 'edge') {
    return (
      <EdgeMenu
        edgeId={target.edgeId}
        screenX={screenX}
        screenY={screenY}
        onOpenDialog={onOpenDialog}
        selectedNodes={selectedNodes}
        selectedEdges={selectedEdges}
      />
    );
  }

  return <PaneMenu screenX={screenX} screenY={screenY} onOpenDialog={onOpenDialog} />;
}
