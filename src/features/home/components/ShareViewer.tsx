'use client';

import { FlowViewer } from '@/features/flow-viewer';

import { AppHeader } from '@/components/AppHeader';

import type { FlowData } from '@/lib/adapters';

import { useT } from '@/hooks/useT';

type Props = {
  name: string;
  data: FlowData;
};

export function ShareViewer({ name, data }: Props) {
  const t = useT();
  return (
    <div className="flex h-screen flex-col bg-background">
      <AppHeader isCloudMode={true} pageTitle={name} readOnlyLabel={t.shareViewer.readOnly} />
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
