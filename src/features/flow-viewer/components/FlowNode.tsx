'use client';

import Image from 'next/image';

import { Handle, Position } from '@xyflow/react';

import { cn } from '@/lib/utils';

type FlowNodeData = {
  label: string;
  route: string;
  isDeadEnd: boolean;
  screenshot?: string;
};

type Props = { data: FlowNodeData };

export function FlowNode({ data }: Props) {
  return (
    <div
      className={cn(
        'flex min-w-[180px] flex-col overflow-hidden rounded-lg border shadow-sm',
        data.isDeadEnd
          ? 'border-brand-accent/60 bg-brand-accent/10 text-brand-dark'
          : 'border-brand-secondary bg-brand-light text-brand-dark',
      )}
    >
      {data.screenshot && (
        <div className="relative h-[100px] w-full border-b border-inherit">
          <Image
            src={`data:image/png;base64,${data.screenshot}`}
            alt={data.label}
            fill
            className="object-cover object-top"
          />
        </div>
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
  );
}
