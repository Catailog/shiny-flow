export type FlowNode = {
  id: string;
  label: string;
  filePath: string;
  isDeadEnd: boolean;
  screenshot?: string;
};

export type EdgeTrigger = 'link' | 'router.push' | 'redirect' | 'unknown';

export type FlowEdge = {
  id: string;
  source: string;
  target: string;
  trigger: EdgeTrigger;
  label?: string;
  sourceFile: string;
  sourceLine: number;
};

export type FlowGraph = {
  nodes: FlowNode[];
  edges: FlowEdge[];
  analyzedAt: string;
  projectPath: string;
};
