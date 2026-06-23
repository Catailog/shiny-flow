'use client';

import { useStore } from '@xyflow/react';

import type { ContextMenuState, DialogRequest } from '../types';
import { CommentNodeMenu } from './menus/CommentNodeMenu';
import { EdgeMenu } from './menus/EdgeMenu';
import { FlowNodeMenu } from './menus/FlowNodeMenu';
import { GroupNodeMenu } from './menus/GroupNodeMenu';
import { GroupSelectMenu } from './menus/GroupSelectMenu';
import { PaneMenu } from './menus/PaneMenu';

type Props = {
  state: ContextMenuState;
  onOpenDialog: (req: DialogRequest) => void;
};

export function ContextMenuController({ state, onOpenDialog }: Props) {
  const selectedNodes = useStore((s) =>
    s.nodes.filter((n) => n.selected && (n.type === 'flowNode' || n.type === 'groupNode')),
  );
  const selectedEdges = useStore((s) => s.edges.filter((e) => e.selected));
  const parentIdSet = new Set(selectedNodes.map((n) => n.parentId ?? null));
  const canGroupSelected = selectedNodes.length >= 2 && parentIdSet.size === 1;

  if (!state) return null;
  const { screenX, screenY, target } = state;

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
