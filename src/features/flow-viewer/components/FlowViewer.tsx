'use client';

import { useCallback } from 'react';

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { FlowGraph } from '@/lib/analyzer';

import { applyDagreLayout } from '../lib/layout';
import { graphToFlow } from '../lib/transform';
import { FlowNode } from './FlowNode';

const nodeTypes = { flowNode: FlowNode };

type Props = { graph: FlowGraph };

export function FlowViewer({ graph }: Props) {
  const { nodes: initialNodes, edges: initialEdges } = graphToFlow(graph);
  const layoutedNodes = applyDagreLayout(initialNodes, initialEdges);

  const [nodes, , onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => (node.data?.isDeadEnd ? '#D4A373' : '#708A70')}
          maskColor="rgba(244,247,244,0.7)"
        />
      </ReactFlow>
    </div>
  );
}
