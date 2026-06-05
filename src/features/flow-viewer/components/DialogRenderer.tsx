'use client';

import type { Edge, Node } from '@xyflow/react';

import type { DialogRequest } from '../types';
import { CommentNodeDialog } from './dialogs/CommentNodeDialog';
import { EdgeCommentDialog } from './dialogs/EdgeCommentDialog';
import { GroupCreateDialog } from './dialogs/GroupCreateDialog';
import { GroupEditDialog } from './dialogs/GroupEditDialog';
import { GroupUngroupDialog } from './dialogs/GroupUngroupDialog';
import { MemoDialog } from './dialogs/MemoDialog';
import { NodeCreateDialog } from './dialogs/NodeCreateDialog';
import { ScreenshotDialog } from './dialogs/ScreenshotDialog';

type Props = {
  dialogRequest: DialogRequest | null;
  nodes: Node[];
  setNodes: (fn: (prev: Node[]) => Node[]) => void;
  edges: Edge[];
  setEdges: (fn: (prev: Edge[]) => Edge[]) => void;
  onClose: () => void;
};

export function DialogRenderer({
  dialogRequest,
  nodes,
  setNodes,
  edges,
  setEdges,
  onClose,
}: Props) {
  if (!dialogRequest) return null;

  switch (dialogRequest.type) {
    case 'screenshot':
      return (
        <ScreenshotDialog src={dialogRequest.src} label={dialogRequest.label} onClose={onClose} />
      );
    case 'memo':
      return (
        <MemoDialog
          nodeId={dialogRequest.nodeId}
          nodes={nodes}
          setNodes={setNodes}
          onClose={onClose}
        />
      );
    case 'comment':
      return (
        <CommentNodeDialog
          nodeId={dialogRequest.nodeId}
          nodes={nodes}
          setNodes={setNodes}
          onClose={onClose}
        />
      );
    case 'groupEdit':
      return (
        <GroupEditDialog
          nodeId={dialogRequest.nodeId}
          nodes={nodes}
          setNodes={setNodes}
          onClose={onClose}
        />
      );
    case 'groupUngroup':
      return (
        <GroupUngroupDialog
          nodeId={dialogRequest.nodeId}
          nodes={nodes}
          setNodes={setNodes}
          onClose={onClose}
        />
      );
    case 'edgeComment':
      return (
        <EdgeCommentDialog
          edgeId={dialogRequest.edgeId}
          edges={edges}
          setEdges={setEdges}
          onClose={onClose}
        />
      );
    case 'groupCreate':
      return (
        <GroupCreateDialog
          pendingNodes={dialogRequest.nodes}
          nodes={nodes}
          setNodes={setNodes}
          onClose={onClose}
        />
      );
    case 'nodeCreate':
      return <NodeCreateDialog pos={dialogRequest.pos} setNodes={setNodes} onClose={onClose} />;
  }
}
