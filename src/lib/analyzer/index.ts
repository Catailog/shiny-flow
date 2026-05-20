import { extractEdges } from './ast-parser';
import { buildGraph } from './graph-builder';
import { scanLayouts, scanRoutes } from './route-scanner';
import type { FlowGraph } from './types';

export async function analyzeProject(projectPath: string): Promise<FlowGraph> {
  const routes = scanRoutes(projectPath);
  const layouts = scanLayouts(projectPath);
  const entryPoints = [...routes, ...layouts];
  const rawEdges = extractEdges(entryPoints, projectPath);
  return buildGraph(routes, rawEdges, projectPath);
}

export type { FlowEdge, FlowGraph, FlowNode } from './types';
