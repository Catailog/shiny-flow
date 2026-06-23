'use client';

import {
  type Node,
  type NodeProps,
  NodeResizer,
  NodeToolbar,
  Position,
  useStore,
} from '@xyflow/react';

import { cn } from '@/lib/utils';

import { Z_INDEX } from '@/constants/zIndex';

import { useCollapseContext } from '../collapseContext';
import { useHistory } from '../historyContext';
import { getGroupColorStyle } from '../lib/nodeColors';
import type { GroupNodeData } from '../types';

export type { GroupNodeData };

type Props = NodeProps<Node<GroupNodeData>>;

export function FlowGroupNode({ id, data, width, height, selected }: Props) {
  const colorStyle = getGroupColorStyle(data.color);
  const { dragOverGroupId } = useCollapseContext();
  const isDragOver = dragOverGroupId === id;
  const { pushSnapshot } = useHistory();
  const isMultiSelected = useStore((s) => s.nodes.filter((n) => n.selected).length > 1);

  return (
    <>
      <NodeToolbar
        position={Position.Top}
        align="start"
        isVisible
        offset={6}
        style={{ zIndex: Z_INDEX.groupToolbar }}
      >
        <span className={cn('cursor-default text-xs font-semibold select-none', colorStyle.text)}>
          {data.label}
        </span>
      </NodeToolbar>

      <NodeResizer
        isVisible={selected && !isMultiSelected}
        minWidth={120}
        minHeight={80}
        onResizeStart={pushSnapshot}
      />

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
