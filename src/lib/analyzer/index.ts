import { extractEdges } from './ast-parser';
import { buildGraph } from './graph-builder';
import { scanRoutes } from './route-scanner';
import type { FlowGraph } from './types';

export async function analyzeProject(projectPath: string): Promise<FlowGraph> {
  const routes = scanRoutes(projectPath);
  const filePaths = routes.map((r) => r.filePath);
  const rawEdges = extractEdges(filePaths);
  return buildGraph(routes, rawEdges, projectPath);
}

export type { FlowEdge, FlowGraph, FlowNode } from './types';
