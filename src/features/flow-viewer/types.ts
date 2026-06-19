import type { Node } from '@xyflow/react';

export type FlowNodeData = {
  label: string;
  route: string;
  isDeadEnd: boolean;
  layoutGroupId?: string;
  layoutGroupLabel?: string;
  screenshot?: string;
  redirected?: boolean;
  redirectedScreenshot?: string;
  paramValues?: Record<string, string>;
  catchAllParam?: string;
  color?: string;
  memo?: string;
};

export type GroupNodeData = {
  label: string;
  color: string;
};

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
  | { type: 'groupEdit'; nodeId: string }
  | { type: 'groupUngroup'; nodeId: string }
  | { type: 'edgeComment'; edgeId: string }
  | { type: 'groupCreate'; nodes: Node[] }
  | { type: 'nodeCreate'; pos: { x: number; y: number } }
  | { type: 'labelEdit'; nodeId: string }
  | { type: 'routeEdit'; nodeId: string };
