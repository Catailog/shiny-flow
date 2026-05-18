'use client';

import { useState } from 'react';

import type { FlowGraph } from '@/lib/analyzer';
import { FlowViewer } from '@/features/flow-viewer';
import { ProjectInput } from '@/features/project-input';

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; graph: FlowGraph }
  | { status: 'error'; message: string };

export default function Home() {
  const [state, setState] = useState<State>({ status: 'idle' });

  const handleAnalyze = async (path: string) => {
    setState({ status: 'loading' });
    try {
      const res = await fetch(`/api/analyze?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '분석 실패');
      setState({ status: 'success', graph: data });
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : '알 수 없는 오류',
      });
    }
  };

  return (
    <div className="bg-background flex h-screen flex-col">
      <header className="border-border flex items-center gap-4 border-b px-6 py-4">
        <h1 className="text-brand-dark text-lg font-semibold">shiny-flow</h1>
        <ProjectInput
          onAnalyze={handleAnalyze}
          isLoading={state.status === 'loading'}
        />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center overflow-hidden">
        {state.status === 'idle' && (
          <p className="text-muted-foreground text-sm">
            프로젝트 경로를 입력하고 분석 버튼을 눌러보세요.
          </p>
        )}
        {state.status === 'loading' && (
          <p className="text-muted-foreground text-sm">분석 중...</p>
        )}
        {state.status === 'error' && (
          <p className="text-destructive text-sm">{state.message}</p>
        )}
        {state.status === 'success' && (
          <FlowViewer graph={state.graph} />
        )}
      </main>
    </div>
  );
}
