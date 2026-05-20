'use client';

import { useState } from 'react';

import { FlowViewer } from '@/features/flow-viewer';
import { type AnalyzeOptions, ProjectInput } from '@/features/project-input';

import type { FlowGraph } from '@/lib/analyzer';

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; graph: FlowGraph }
  | { status: 'error'; message: string };

export default function Home() {
  const [state, setState] = useState<State>({ status: 'idle' });

  const handleAnalyze = async ({ path, screenshot, baseUrl, auth }: AnalyzeOptions) => {
    setState({ status: 'loading' });
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, screenshot, baseUrl, auth }),
      });
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
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center gap-4 border-b border-border px-6 py-4">
        <h1 className="shrink-0 text-lg font-semibold text-brand-dark">shiny-flow</h1>
        <ProjectInput onAnalyze={handleAnalyze} isLoading={state.status === 'loading'} />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center overflow-hidden">
        {state.status === 'idle' && (
          <p className="text-sm text-muted-foreground">
            프로젝트 경로를 입력하고 분석 버튼을 눌러보세요.
          </p>
        )}
        {state.status === 'loading' && <p className="text-sm text-muted-foreground">분석 중...</p>}
        {state.status === 'error' && <p className="text-sm text-destructive">{state.message}</p>}
        {state.status === 'success' && <FlowViewer graph={state.graph} />}
      </main>
    </div>
  );
}
