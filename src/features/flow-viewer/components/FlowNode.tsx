'use client';

import { Handle, Position } from '@xyflow/react';

import { cn } from '@/lib/utils';

type FlowNodeData = {
  label: string;
  route: string;
  isDeadEnd: boolean;
};

type Props = { data: FlowNodeData };

export function FlowNode({ data }: Props) {
  return (
    <div
      className={cn(
        'flex min-w-[180px] flex-col rounded-lg border px-4 py-3 shadow-sm',
        data.isDeadEnd
          ? 'border-brand-accent/60 bg-brand-accent/10 text-brand-dark'
          : 'border-brand-secondary bg-brand-light text-brand-dark',
      )}
    >
      <span className="text-sm font-semibold">{data.label}</span>
      <span className="text-muted-foreground mt-0.5 text-xs">{data.route}</span>
      {data.isDeadEnd && (
        <span className="text-brand-accent mt-1 text-xs font-medium">dead-end</span>
      )}
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}
