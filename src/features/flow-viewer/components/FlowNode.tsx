'use client';

import { useState } from 'react';

import Image from 'next/image';

import { Handle, Position } from '@xyflow/react';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type FlowNodeData = {
  label: string;
  route: string;
  isDeadEnd: boolean;
  screenshot?: string;
};

type Props = { data: FlowNodeData };

export function FlowNode({ data }: Props) {
  const [open, setOpen] = useState(false);
  const src = data.screenshot ? `data:image/png;base64,${data.screenshot}` : null;

  return (
    <>
      <div
        className={cn(
          'flex min-w-[180px] flex-col overflow-hidden rounded-lg border shadow-sm',
          data.isDeadEnd
            ? 'border-brand-accent/60 bg-brand-accent/10 text-brand-dark'
            : 'border-brand-secondary bg-brand-light text-brand-dark',
        )}
      >
        {src && (
          <ContextMenu>
            <ContextMenuTrigger>
              <div className="relative h-[100px] w-full cursor-context-menu border-b border-inherit">
                <Image src={src} alt={data.label} fill className="object-cover object-top" />
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => setOpen(true)}>크게 보기</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        )}
        <div className="flex flex-col px-4 py-3">
          <span className="text-sm font-semibold">{data.label}</span>
          <span className="text-muted-foreground mt-0.5 text-xs">{data.route}</span>
          {data.isDeadEnd && (
            <span className="text-brand-accent mt-1 text-xs font-medium">dead-end</span>
          )}
        </div>
        <Handle type="target" position={Position.Top} className="opacity-0" />
        <Handle type="source" position={Position.Bottom} className="opacity-0" />
      </div>

      {src && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-5xl p-0">
            <DialogTitle className="sr-only">{data.label} 스크린샷</DialogTitle>
            <img src={src} alt={data.label} className="w-full rounded-lg" />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
