'use client';

import type { ReactNode } from 'react';

import type { Edge, Node } from '@xyflow/react';

import type { DialogRequest } from '../types';
import { CommentNodeDialog } from './dialogs/CommentNodeDialog';
import { EdgeCommentDialog } from './dialogs/EdgeCommentDialog';
import { GroupCreateDialog } from './dialogs/GroupCreateDialog';
import { GroupEditDialog } from './dialogs/GroupEditDialog';
import { GroupUngroupDialog } from './dialogs/GroupUngroupDialog';
import { LabelEditDialog } from './dialogs/LabelEditDialog';
import { MemoDialog } from './dialogs/MemoDialog';
import { NodeCreateDialog } from './dialogs/NodeCreateDialog';
import { RouteEditDialog } from './dialogs/RouteEditDialog';
import { ScreenshotDialog } from './dialogs/ScreenshotDialog';

type Props = {
  dialogRequest: DialogRequest | null;
  nodes: Node[];
  setNodes: (fn: (prev: Node[]) => Node[]) => void;
  edges: Edge[];
  setEdges: (fn: (prev: Edge[]) => Edge[]) => void;
  onClose: () => void;
};

type CommonProps = Omit<Props, 'dialogRequest'>;

type RendererMap = {
  [K in DialogRequest['type']]: (
    req: Extract<DialogRequest, { type: K }>,
    props: CommonProps,
  ) => ReactNode;
};

const RENDERERS: RendererMap = {
  screenshot: (req, { onClose }) => (
    <ScreenshotDialog src={req.src} label={req.label} onClose={onClose} />
  ),
  memo: (req, { nodes, setNodes, onClose }) => (
    <MemoDialog nodeId={req.nodeId} nodes={nodes} setNodes={setNodes} onClose={onClose} />
  ),
  comment: (req, { nodes, setNodes, onClose }) => (
    <CommentNodeDialog nodeId={req.nodeId} nodes={nodes} setNodes={setNodes} onClose={onClose} />
  ),
  groupEdit: (req, { nodes, setNodes, onClose }) => (
    <GroupEditDialog nodeId={req.nodeId} nodes={nodes} setNodes={setNodes} onClose={onClose} />
  ),
  groupUngroup: (req, { nodes, setNodes, onClose }) => (
    <GroupUngroupDialog nodeId={req.nodeId} nodes={nodes} setNodes={setNodes} onClose={onClose} />
  ),
  edgeComment: (req, { edges, setEdges, onClose }) => (
    <EdgeCommentDialog edgeId={req.edgeId} edges={edges} setEdges={setEdges} onClose={onClose} />
  ),
  groupCreate: (req, { nodes, setNodes, onClose }) => (
    <GroupCreateDialog
      pendingNodes={req.nodes}
      nodes={nodes}
      setNodes={setNodes}
      onClose={onClose}
    />
  ),
  nodeCreate: (req, { setNodes, onClose }) => (
    <NodeCreateDialog pos={req.pos} setNodes={setNodes} onClose={onClose} />
  ),
  labelEdit: (req, { nodes, setNodes, onClose }) => (
    <LabelEditDialog nodeId={req.nodeId} nodes={nodes} setNodes={setNodes} onClose={onClose} />
  ),
  routeEdit: (req, { nodes, setNodes, onClose }) => (
    <RouteEditDialog nodeId={req.nodeId} nodes={nodes} setNodes={setNodes} onClose={onClose} />
  ),
};

export function DialogRenderer({ dialogRequest, ...commonProps }: Props) {
  if (!dialogRequest) return null;

  const render = RENDERERS[dialogRequest.type] as (
    req: DialogRequest,
    props: CommonProps,
  ) => ReactNode;

  return render(dialogRequest, commonProps);
}
