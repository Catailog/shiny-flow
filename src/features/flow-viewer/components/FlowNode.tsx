'use client';

import { useState } from 'react';

import { Handle, NodeToolbar, Position } from '@xyflow/react';

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
      <NodeToolbar position={Position.Top} align="start" isVisible offset={6}>
        <span className="cursor-default select-none text-sm font-medium text-brand-dark">{data.route}</span>
      </NodeToolbar>

      <div
        className={cn(
          'flex w-[280px] flex-col overflow-hidden rounded-lg border shadow-sm',
          data.isDeadEnd
            ? 'border-brand-accent/60 bg-brand-accent/10'
            : 'border-brand-secondary bg-brand-light',
        )}
        onDoubleClick={() => { if (src) setOpen(true); }}
      >
        {src && (
          <ContextMenu>
            <ContextMenuTrigger>
              <img
                src={src}
                alt={data.label}
                className="block w-full cursor-context-menu"
              />
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => setOpen(true)}>크게 보기</ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        )}
        {!src && (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            스크린샷 없음
          </div>
        )}
        <Handle type="target" position={Position.Top} className="opacity-0" />
        <Handle type="source" position={Position.Bottom} className="opacity-0" />
      </div>

      {src && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="w-auto max-w-[90vw] sm:max-w-[90vw] max-h-[90vh] overflow-hidden p-0 gap-0">
            <DialogTitle className="sr-only">{data.label} 스크린샷</DialogTitle>
            <img
              src={src}
              alt={data.label}
              className="block max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
