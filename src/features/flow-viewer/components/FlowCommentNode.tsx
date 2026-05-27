'use client';

import { useState } from 'react';

import { Handle, type Node, type NodeProps, Position, useReactFlow, useStore } from '@xyflow/react';
import { MessageCircleIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

import { useFlowActions } from '../actionsContext';

export type CommentNodeData = {
  content: string;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
};

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}초 전`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월 전`;
  return `${Math.floor(months / 12)}년 전`;
}

type Props = NodeProps<Node<CommentNodeData>>;

export function FlowCommentNode({ id, data }: Props) {
  const { openDialog } = useFlowActions();
  const { setNodes } = useReactFlow();
  const [hovered, setHovered] = useState(false);
  const hasContent = !!data.content;
  const zoom = useStore((s) => s.transform[2]);

  const timeRef = data.updatedAt ?? data.createdAt;

  const handleMouseEnter = () => {
    setHovered(true);
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, zIndex: 9999 } : n)));
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, zIndex: 0 } : n)));
  };

  return (
    <>
      <div
        style={{ width: 48, height: 48 }}
        className="relative overflow-visible"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => openDialog({ type: 'comment', nodeId: id })}
      >
        <div
          className="absolute inset-0 overflow-visible"
          style={{ transform: `scale(${Math.min(1, 1 / zoom)})` }}
        >
          <div className="flex h-full items-center justify-center">
            <div
              className={cn(
                'flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-2 bg-white shadow-md transition-colors',
                hasContent ? 'border-blue-400 bg-blue-50' : 'border-gray-300',
              )}
            >
              <MessageCircleIcon
                size={20}
                className={hasContent ? 'text-blue-400' : 'text-gray-400'}
              />
            </div>
          </div>

          {hovered && (
            <div className="absolute top-0 left-14 z-50 w-max max-w-52 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-lg">
              {(data.author || timeRef) && (
                <>
                  <p className="text-xs text-muted-foreground">
                    {data.author}
                    {data.author && timeRef && ' · '}
                    {timeRef && relativeTime(timeRef)}
                    {data.updatedAt && ' (수정됨)'}
                  </p>
                  <div className="-mx-3 my-2 h-px bg-border" />
                </>
              )}
              {hasContent ? (
                <p className="whitespace-pre-wrap text-gray-700">{data.content}</p>
              ) : (
                <p className="text-xs whitespace-nowrap text-muted-foreground">
                  클릭하여 댓글 추가
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="opacity-0" />
      <Handle type="target" position={Position.Top} className="opacity-0" />
    </>
  );
}
