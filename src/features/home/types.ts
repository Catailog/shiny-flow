import type { Edge, Node } from '@xyflow/react';

import type { AuthInput } from '@/features/project-input';

import type { FlowGraph } from '@/lib/analyzer';

export type RfSnapshot = { rfNodes: Node[]; rfEdges: Edge[] };

export type HomeState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; graph: FlowGraph; snapshot?: RfSnapshot }
  | { status: 'error'; message: string };

export type ScreenshotOptions = {
  baseUrl: string;
  auth?: AuthInput;
  projectPath: string;
};
