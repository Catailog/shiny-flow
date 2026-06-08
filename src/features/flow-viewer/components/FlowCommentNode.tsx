'use client';

import { useState } from 'react';

import type { Translations } from '@/locales/en';
import { Handle, type Node, type NodeProps, Position, useReactFlow, useStore } from '@xyflow/react';
import { MessageCircleIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

import { useT } from '@/hooks/useT';

import { Z_INDEX } from '@/constants/zIndex';

import { useFlowActions } from '../actionsContext';

export type CommentNodeData = {
  content: string;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
};

function relativeTime(isoString: string, tn: Translations['commentNode']): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return tn.secondsAgo(seconds);
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return tn.minutesAgo(minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return tn.hoursAgo(hours);
  const days = Math.floor(hours / 24);
  if (days < 30) return tn.daysAgo(days);
  const months = Math.floor(days / 30);
  if (months < 12) return tn.monthsAgo(months);
  return tn.yearsAgo(Math.floor(months / 12));
}

type Props = NodeProps<Node<CommentNodeData>>;

export function FlowCommentNode({ id, data }: Props) {
  const { openDialog } = useFlowActions();
  const t = useT();
  const { setNodes } = useReactFlow();
  const [hovered, setHovered] = useState(false);
  const hasContent = !!data.content;
  const zoom = useStore((s) => s.transform[2]);

  const timeRef = data.updatedAt ?? data.createdAt;

  const handleMouseEnter = () => {
    setHovered(true);
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, zIndex: Z_INDEX.commentNodeHover } : n)),
    );
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, zIndex: Z_INDEX.nodeBase } : n)));
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
                'flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-2 bg-background shadow-md transition-colors',
                hasContent ? 'border-blue-400 bg-blue-50 dark:bg-blue-950' : 'border-border',
              )}
            >
              <MessageCircleIcon
                size={20}
                className={hasContent ? 'text-blue-400' : 'text-muted-foreground'}
              />
            </div>
          </div>

          {hovered && (
            <div className="absolute top-0 left-14 z-50 w-max max-w-52 rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-lg">
              {(data.author || timeRef) && (
                <>
                  <p className="text-xs text-muted-foreground">
                    {data.author}
                    {data.author && timeRef && ' · '}
                    {timeRef && relativeTime(timeRef, t.commentNode)}
                    {data.updatedAt && ' ' + t.commentNode.edited}
                  </p>
                  <div className="-mx-3 my-2 h-px bg-border" />
                </>
              )}
              {hasContent ? (
                <p className="whitespace-pre-wrap text-foreground">{data.content}</p>
              ) : (
                <p className="text-xs whitespace-nowrap text-muted-foreground">
                  {t.commentNode.clickToAdd}
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
