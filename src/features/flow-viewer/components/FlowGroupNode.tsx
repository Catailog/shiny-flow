'use client';

import { type Node, type NodeProps, NodeResizer, NodeToolbar, Position } from '@xyflow/react';

import { cn } from '@/lib/utils';

import { GROUP_COLOR_STYLES } from '../lib/nodeColors';

export type GroupNodeData = {
  label: string;
  color: string;
};

type Props = NodeProps<Node<GroupNodeData>>;

export function FlowGroupNode({ id, data, width, height, selected }: Props) {
  const colorStyle = GROUP_COLOR_STYLES[data.color] ?? GROUP_COLOR_STYLES.gray;

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
        className={cn('rounded-2xl border-2 border-dashed', colorStyle.border, colorStyle.bg)}
      />
    </>
  );
}
