'use client';

import { useState } from 'react';

import { Handle, type Node, type NodeProps, Position } from '@xyflow/react';
import { MessageCircleIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

import { useFlowActions } from '../actionsContext';

export type CommentNodeData = {
  content: string;
};

type Props = NodeProps<Node<CommentNodeData>>;

export function FlowCommentNode({ id, data }: Props) {
  const { openDialog } = useFlowActions();
  const [hovered, setHovered] = useState(false);
  const hasContent = !!data.content;

  return (
    <>
      <div
        style={{ width: 48, height: 48 }}
        className="relative"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => openDialog({ type: 'comment', nodeId: id })}
      >
        <div
          className={cn(
            'flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-2 bg-white shadow-md transition-colors',
            hasContent ? 'border-blue-400 bg-blue-50' : 'border-gray-300',
          )}
        >
          <MessageCircleIcon size={20} className={hasContent ? 'text-blue-400' : 'text-gray-400'} />
        </div>

        {hovered && (
          <div className="absolute top-0 left-14 z-10 w-max max-w-52 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-lg">
            {hasContent ? (
              <p className="whitespace-pre-wrap text-gray-700">{data.content}</p>
            ) : (
              <p className="text-xs whitespace-nowrap text-muted-foreground">클릭하여 댓글 추가</p>
            )}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="opacity-0" />
      <Handle type="target" position={Position.Top} className="opacity-0" />
    </>
  );
}
