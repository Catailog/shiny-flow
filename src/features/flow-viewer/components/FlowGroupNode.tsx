'use client';

import { type Node, type NodeProps, NodeResizer, NodeToolbar, Position } from '@xyflow/react';

import { cn } from '@/lib/utils';

import { useCollapseContext } from '../collapseContext';
import { GROUP_COLOR_STYLES } from '../lib/nodeColors';

export type GroupNodeData = {
  label: string;
  color: string;
};

type Props = NodeProps<Node<GroupNodeData>>;

export function FlowGroupNode({ id, data, width, height, selected }: Props) {
  const colorStyle = GROUP_COLOR_STYLES[data.color] ?? GROUP_COLOR_STYLES.gray;
  const { dragOverGroupId } = useCollapseContext();
  const isDragOver = dragOverGroupId === id;

  return (
    <>
      <NodeToolbar position={Position.Top} align="start" isVisible offset={6}>
        <span className={cn('cursor-default text-xs font-semibold select-none', colorStyle.text)}>
          {data.label}
        </span>
      </NodeToolbar>

      <NodeResizer isVisible={selected} minWidth={120} minHeight={80} />

      <div
        style={{ width, height }}
        className={cn(
          'rounded-2xl border-2 border-dashed transition-shadow',
          colorStyle.border,
          colorStyle.bg,
          isDragOver && 'ring-2 ring-blue-400 ring-offset-2',
        )}
      />
    </>
  );
}
