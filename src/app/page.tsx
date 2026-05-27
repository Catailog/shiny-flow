'use client';

import { useRef, useState } from 'react';

import type { Edge, Node } from '@xyflow/react';
import { Loader2Icon } from 'lucide-react';

import { FlowViewer, type FlowViewerHandle } from '@/features/flow-viewer';
import { type AnalyzeOptions, type AuthInput, ProjectInput } from '@/features/project-input';

import { Button } from '@/components/ui/button';

import type { FlowGraph } from '@/lib/analyzer';

const SLOW_TIMEOUT_MS = 20000;

type RfSnapshot = { rfNodes: Node[]; rfEdges: Edge[] };

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; graph: FlowGraph; snapshot?: RfSnapshot }
  | { status: 'error'; message: string };

export default function Home() {
  const [state, setState] = useState<State>({ status: 'idle' });
  const [graphKey, setGraphKey] = useState(0);
  const [slowWarning, setSlowWarning] = useState(false);
  const [overlayError, setOverlayError] = useState<string | null>(null);
  const [screenshotOptions, setScreenshotOptions] = useState<{
    baseUrl: string;
    auth?: AuthInput;
  } | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const viewerRef = useRef<FlowViewerHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ref로 현재 slowWarning 값 추적 — async catch 클로저에서 stale state 방지
  const slowWarningRef = useRef(false);

  const clearTimers = () => {
    if (slowTimerRef.current) {
      clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
  };

  const setSlowWarningSync = (val: boolean) => {
    slowWarningRef.current = val;
    setSlowWarning(val);
  };

  const startSlowTimer = () => {
    clearTimers();
    slowTimerRef.current = setTimeout(() => {
      slowWarningRef.current = true;
      setSlowWarning(true);
    }, SLOW_TIMEOUT_MS);
  };

  const handleCancel = () => {
    clearTimers();
    abortRef.current?.abort();
    abortRef.current = null;
    setSlowWarningSync(false);
    setOverlayError(null);
    setState({ status: 'idle' });
  };

  const handleKeepWaiting = () => {
    setSlowWarningSync(false);
    startSlowTimer();
  };

  const handleOverlayErrorDismiss = () => {
    setOverlayError(null);
    setState({ status: 'idle' });
  };

  const handleExport = () => {
    if (state.status !== 'success') return;
    const rfNodes = viewerRef.current?.getNodes() ?? [];
    const rfEdges = viewerRef.current?.getEdges() ?? [];
    const payload = { graph: state.graph, rfNodes, rfEdges };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const projectName = state.graph.projectPath.split(/[\\/]/).at(-1) ?? 'flow';
    a.download = `${projectName}.flow.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as Record<string, unknown>;
        const graphRaw = parsed.graph as Record<string, unknown> | undefined;
        if (graphRaw && Array.isArray(graphRaw.nodes) && Array.isArray(graphRaw.edges)) {
          // 현재 포맷: { graph, rfNodes, rfEdges }
          const snapshot: RfSnapshot | undefined =
            Array.isArray(parsed.rfNodes) && Array.isArray(parsed.rfEdges)
              ? { rfNodes: parsed.rfNodes as Node[], rfEdges: parsed.rfEdges as Edge[] }
              : undefined;
          setState({ status: 'success', graph: graphRaw as FlowGraph, snapshot });
          setGraphKey((k) => k + 1);
        } else if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
          // 구 포맷: FlowGraph 직접 저장
          setState({ status: 'success', graph: parsed as FlowGraph });
          setGraphKey((k) => k + 1);
        } else {
          throw new Error('유효한 shiny-flow JSON 파일이 아닙니다.');
        }
        setScreenshotOptions(null);
      } catch (err) {
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : 'JSON 파싱 실패',
        });
      }
    };
    reader.readAsText(file);
  };

  const handleAnalyze = async ({ path, screenshot, baseUrl, auth }: AnalyzeOptions) => {
    clearTimers();
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSlowWarningSync(false);
    setOverlayError(null);
    setState({ status: 'loading' });
    setScreenshotOptions(screenshot && baseUrl ? { baseUrl, auth } : null);
    startSlowTimer();

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, screenshot, baseUrl, auth }),
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;
      clearTimers();
      setSlowWarningSync(false);

      const data = await res.json();
      if (controller.signal.aborted) return;

      if (!res.ok) throw new Error(data.error ?? '분석 실패');
      setState({ status: 'success', graph: data });
      setGraphKey((k) => k + 1);
    } catch (err) {
      if (controller.signal.aborted) return;
      clearTimers();
      const message = err instanceof Error ? err.message : '알 수 없는 오류';

      // 경고가 떠 있는 상태에서 에러가 도착하면 전체 UI 교체 없이
      // 경고 박스를 에러 박스로 자연스럽게 전환
      if (slowWarningRef.current) {
        setSlowWarningSync(false);
        setOverlayError(message);
      } else {
        setSlowWarningSync(false);
        setState({ status: 'error', message });
      }
    }
  };

  const isLoading = state.status === 'loading';

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center gap-4 border-b border-border px-6 py-4">
        <h1 className="shrink-0 text-lg font-semibold text-brand-dark">shiny-flow</h1>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImportFile}
        />
        <ProjectInput
          onAnalyze={handleAnalyze}
          isLoading={isLoading}
          onImport={() => fileInputRef.current?.click()}
          onExport={handleExport}
          canExport={state.status === 'success'}
        />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center overflow-hidden">
        {state.status === 'idle' && (
          <p className="text-sm text-muted-foreground">
            프로젝트 경로를 입력하고 분석 버튼을 눌러보세요.
          </p>
        )}

        {state.status === 'loading' && (
          <div className="flex flex-col items-center gap-3">
            {!overlayError && (
              <>
                <Loader2Icon size={36} className="animate-spin text-brand-primary" />
                <p className="text-sm text-muted-foreground">분석 중...</p>
              </>
            )}

            {overlayError ? (
              // 경고가 떠 있는 동안 에러 도착 → 경고 박스를 에러 박스로 전환
              <div className="flex flex-col items-center gap-2 rounded-lg border border-destructive bg-destructive/10 px-5 py-3 text-sm">
                <p className="font-medium text-destructive">{overlayError}</p>
                <Button size="sm" variant="outline" onClick={handleOverlayErrorDismiss}>
                  확인
                </Button>
              </div>
            ) : slowWarning ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-warning bg-warning/10 px-5 py-3 text-sm">
                <p className="font-medium text-warning">
                  서버 응답이 늦고 있습니다. 계속 기다리시겠습니까?
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleKeepWaiting}>
                    계속 기다리기
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleCancel}>
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                className="text-muted-foreground"
              >
                취소
              </Button>
            )}
          </div>
        )}

        {state.status === 'error' && <p className="text-sm text-destructive">{state.message}</p>}

        {state.status === 'success' && (
          <FlowViewer
            key={graphKey}
            ref={viewerRef}
            graph={state.graph}
            screenshotOptions={screenshotOptions}
            savedRfNodes={state.snapshot?.rfNodes}
            savedRfEdges={state.snapshot?.rfEdges}
          />
        )}
      </main>
    </div>
  );
}
