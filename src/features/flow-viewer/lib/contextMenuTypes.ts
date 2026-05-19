import type { Node } from '@xyflow/react';

export type ContextMenuTarget =
  | { type: 'pane' }
  | { type: 'flowNode'; nodeId: string }
  | { type: 'groupNode'; nodeId: string }
  | { type: 'commentNode'; nodeId: string }
  | { type: 'edge'; edgeId: string };

export type ContextMenuState = {
  screenX: number;
  screenY: number;
  target: ContextMenuTarget;
} | null;

export type DialogRequest =
  | { type: 'screenshot'; src: string; label: string }
  | { type: 'memo'; nodeId: string }
  | { type: 'comment'; nodeId: string }
  | { type: 'groupRename'; nodeId: string }
  | { type: 'edgeComment'; edgeId: string }
  | { type: 'groupCreate'; nodes: Node[] }
  | { type: 'nodeCreate'; pos: { x: number; y: number } };
