'use client';

import { FlowViewer } from '@/features/flow-viewer';

import type { FlowData } from '@/lib/adapters';

type Props = {
  name: string;
  data: FlowData;
};

export function ShareViewer({ name, data }: Props) {
  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-6 py-4">
        <h1 className="text-sm font-medium">{name}</h1>
        <span className="text-xs text-muted-foreground">읽기 전용</span>
      </header>
      <main className="flex flex-1 overflow-hidden">
        <FlowViewer
          graph={data.graph}
          screenshotOptions={null}
          savedRfNodes={data.rfNodes}
          savedRfEdges={data.rfEdges}
        />
      </main>
    </div>
  );
}
