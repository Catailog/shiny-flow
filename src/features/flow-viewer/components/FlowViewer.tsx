'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  Background,
  ControlButton,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { LockIcon, UnlockIcon } from 'lucide-react';

import type { FlowGraph } from '@/lib/analyzer';

import { applyDagreLayout } from '../lib/layout';
import { graphToFlow } from '../lib/transform';
import { FlowEdge } from './FlowEdge';
import { FlowNode } from './FlowNode';

const nodeTypes = { flowNode: FlowNode };
const edgeTypes = { flowEdge: FlowEdge };

// ReactFlow 컨텍스트 안에서 실행 — 실제 렌더된 노드 높이로 dagre 재실행
function AutoLayout({ edges, onLayout }: { edges: Edge[]; onLayout: (nodes: Node[]) => void }) {
  const nodesInitialized = useNodesInitialized();
  const { getNodes, fitView } = useReactFlow();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!nodesInitialized || done) return;
    const relayouted = applyDagreLayout(getNodes(), edges);
    onLayout(relayouted);
    setDone(true);
    requestAnimationFrame(() => fitView());
  }, [nodesInitialized, done, edges, onLayout, getNodes, fitView]);

  return null;
}

type Props = { graph: FlowGraph };

export function FlowViewer({ graph }: Props) {
  const { nodes: initialNodes, edges: initialEdges } = graphToFlow(graph);
  const layoutedNodes = applyDagreLayout(initialNodes, initialEdges);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const [isLocked, setIsLocked] = useState(false);
  const [spacebarLocked, setSpacebarLocked] = useState(false);
  const isLockedRef = useRef(isLocked);
  useEffect(() => { isLockedRef.current = isLocked; }, [isLocked]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'KeyL' && !e.repeat) {
        setIsLocked((v) => !v);
        setSpacebarLocked(false);
      }
      if (e.code === 'Space' && !e.repeat && !isLockedRef.current) {
        e.preventDefault();
        setSpacebarLocked(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacebarLocked(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  const nodesDraggable = !isLocked && !spacebarLocked;

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.05}
        maxZoom={2}
        nodesDraggable={nodesDraggable}
        zoomOnDoubleClick={false}
      >
        <AutoLayout edges={initialEdges} onLayout={setNodes} />
        <Background />
        <Controls style={{ bottom: 48 }} showInteractive={false}>
          <ControlButton
            onClick={() => { setIsLocked((v) => !v); setSpacebarLocked(false); }}
            title={isLocked ? 'Unlock (L)' : 'Lock (L)'}
          >
            {isLocked
              ? <LockIcon size={12} style={{ fill: 'none' }} />
              : <UnlockIcon size={12} style={{ fill: 'none' }} />
            }
          </ControlButton>
        </Controls>
        <MiniMap
          nodeColor={(node) => (node.data?.isDeadEnd ? '#D4A373' : '#708A70')}
          maskColor="rgba(244,247,244,0.7)"
          className="rounded-lg border border-border shadow-sm"
        />
      </ReactFlow>
    </div>
  );
}
