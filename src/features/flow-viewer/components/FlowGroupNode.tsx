'use client';

import { useEffect, useState } from 'react';

import { type Node, type NodeProps, NodeResizer, NodeToolbar, Position } from '@xyflow/react';

import { cn } from '@/lib/utils';

import { Z_INDEX } from '@/constants/zIndex';

import { useFlowActions } from '../actionsContext';
import { useCollapseContext } from '../collapseContext';
import { useHistory } from '../historyContext';
import { getGroupColorStyle } from '../lib/nodeColors';
import type { GroupNodeData } from '../types';

export type { GroupNodeData };

type Props = NodeProps<Node<GroupNodeData>>;

export function FlowGroupNode({ id, data, width, height, selected }: Props) {
  const { readOnly } = useFlowActions();
  const colorStyle = getGroupColorStyle(data.color);
  const { dragOverGroupId } = useCollapseContext();
  const isDragOver = dragOverGroupId === id;
  const { pushSnapshot } = useHistory();
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isResizing) return;
    const handlePointerUp = () => setIsResizing(false);
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, [isResizing]);

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

      <div
        style={{ width, height }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'rounded-2xl border-2 border-dashed transition-shadow',
          colorStyle.border,
          colorStyle.bg,
          selected && 'ring-2 ring-brand-primary ring-offset-1',
          isDragOver && 'ring-2 ring-blue-400 ring-offset-2',
        )}
      >
        <NodeResizer
          isVisible={!readOnly && (isHovered || isResizing)}
          minWidth={120}
          minHeight={80}
          onResizeStart={() => {
            pushSnapshot();
            setIsResizing(true);
          }}
          onResizeEnd={() => setIsResizing(false)}
        />
      </div>
    </>
  );
}
