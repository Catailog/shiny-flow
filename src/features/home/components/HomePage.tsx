'use client';

import { useEffect, useRef, useState } from 'react';

import type { Edge, Node } from '@xyflow/react';
import { Loader2Icon } from 'lucide-react';

import { FlowViewer, type FlowViewerHandle } from '@/features/flow-viewer';
import {
  type AnalyzeFormValues,
  type AnalyzeOptions,
  type AuthInput,
  ProjectInput,
  type ProjectInputHandle,
} from '@/features/project-input';

import { Button } from '@/components/ui/button';

import type { FlowData } from '@/lib/adapters';
import type { FlowGraph } from '@/lib/analyzer';

import { useCloudFlow } from '../hooks/useCloudFlow';
import { CloudToolbar } from './CloudToolbar';

const SLOW_TIMEOUT_MS = 20000;

type RfSnapshot = { rfNodes: Node[]; rfEdges: Edge[] };

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; graph: FlowGraph; snapshot?: RfSnapshot }
  | { status: 'error'; message: string };

type PendingImport = {
  graph: FlowGraph;
  snapshot?: RfSnapshot;
  analyzeConfig: AnalyzeFormValues;
};

type Props = {
  isCloudMode: boolean;
};

export function HomePage({ isCloudMode }: Props) {
  const [state, setState] = useState<State>({ status: 'idle' });
  const [graphKey, setGraphKey] = useState(0);
  const [slowWarning, setSlowWarning] = useState(false);
  const [overlayError, setOverlayError] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [screenshotOptions, setScreenshotOptions] = useState<{
    baseUrl: string;
    auth?: AuthInput;
    projectPath: string;
  } | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const viewerRef = useRef<FlowViewerHandle>(null);
  const projectInputRef = useRef<ProjectInputHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    const analyzeConfig = projectInputRef.current?.getConfig();
    const payload = { graph: state.graph, rfNodes, rfEdges, analyzeConfig };
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
        const analyzeConfig = parsed.analyzeConfig as AnalyzeFormValues | undefined;

        let graph: FlowGraph;
        let snapshot: RfSnapshot | undefined;

        if (graphRaw && Array.isArray(graphRaw.nodes) && Array.isArray(graphRaw.edges)) {
          graph = graphRaw as FlowGraph;
          snapshot =
            Array.isArray(parsed.rfNodes) && Array.isArray(parsed.rfEdges)
              ? { rfNodes: parsed.rfNodes as Node[], rfEdges: parsed.rfEdges as Edge[] }
              : undefined;
        } else if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
          graph = parsed as FlowGraph;
        } else {
          throw new Error('유효한 shiny-flow JSON 파일이 아닙니다.');
        }

        setScreenshotOptions(null);

        if (analyzeConfig) {
          setPendingImport({ graph, snapshot, analyzeConfig });
        } else {
          setState({ status: 'success', graph, snapshot });
          setGraphKey((k) => k + 1);
        }
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
    setScreenshotOptions(screenshot && baseUrl ? { baseUrl, auth, projectPath: path } : null);
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

      if (slowWarningRef.current) {
        setSlowWarningSync(false);
        setOverlayError(message);
      } else {
        setSlowWarningSync(false);
        setState({ status: 'error', message });
      }
    }
  };

  const applyPendingImport = (restoreConfig: boolean) => {
    if (!pendingImport) return;
    const { graph, snapshot, analyzeConfig } = pendingImport;
    if (restoreConfig) projectInputRef.current?.restoreConfig(analyzeConfig);
    setState({ status: 'success', graph, snapshot });
    setGraphKey((k) => k + 1);
    setPendingImport(null);
  };

  const handleAnalyzeRef = useRef(handleAnalyze);
  useEffect(() => {
    handleAnalyzeRef.current = handleAnalyze;
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cliPath = params.get('path');
    if (!cliPath) return;

    const cliScreenshot = params.get('screenshot') === 'true';
    const cliUrl = params.get('url') ?? '';
    const cliAuthType = (params.get('authType') ?? 'none') as 'none' | 'cookies' | 'script';
    const cliScriptPath = params.get('scriptPath') ?? 'shiny-flow.auth.js';

    window.history.replaceState({}, '', '/');

    projectInputRef.current?.restoreConfig({
      path: cliPath,
      screenshot: cliScreenshot,
      baseUrl: cliUrl,
      authType: cliAuthType,
      cookiesJson: '',
      scriptPath: cliScriptPath,
    });

    const auth =
      cliAuthType === 'script' ? { type: 'script' as const, scriptPath: cliScriptPath } : undefined;

    handleAnalyzeRef.current({ path: cliPath, screenshot: cliScreenshot, baseUrl: cliUrl, auth });
  }, []);

  const getCurrentFlowData = (): FlowData | null => {
    if (state.status !== 'success') return null;
    return {
      graph: state.graph,
      rfNodes: viewerRef.current?.getNodes() ?? [],
      rfEdges: viewerRef.current?.getEdges() ?? [],
      analyzeConfig: projectInputRef.current?.getConfig() as Record<string, unknown> | undefined,
    };
  };

  const {
    session,
    state: cloudState,
    actions: cloudActions,
  } = useCloudFlow({
    getCurrentFlowData,
    onFlowLoaded: ({ graph, rfNodes, rfEdges, analyzeConfig, id: _id, name: _name }) => {
      setState({ status: 'success', graph, snapshot: { rfNodes, rfEdges } });
      setGraphKey((k) => k + 1);
      setScreenshotOptions(null);
      if (analyzeConfig) {
        projectInputRef.current?.restoreConfig(analyzeConfig);
      }
    },
  });

  const isLoading = state.status === 'loading';
  const hasFlow = state.status === 'success';

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center gap-4 border-b border-border px-6 py-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImportFile}
        />
        <ProjectInput
          ref={projectInputRef}
          onAnalyze={handleAnalyze}
          isLoading={isLoading}
          onImport={() => fileInputRef.current?.click()}
          onExport={handleExport}
          canExport={hasFlow}
        />

        {isCloudMode && (
          <CloudToolbar
            hasFlow={hasFlow}
            session={session}
            state={cloudState}
            actions={cloudActions}
          />
        )}
      </header>

      {/* 저장 이름 입력 / 내 플로우 다이얼로그는 CloudToolbar 내부에서 렌더링 */}

      {pendingImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="flex w-80 flex-col gap-4 rounded-xl border bg-popover p-5 shadow-lg">
            <p className="text-sm font-medium">분석 설정도 불러올까요?</p>
            <p className="text-xs text-muted-foreground">
              프로젝트 경로, 서버 URL, 인증 정보 등 분석 설정을 함께 복원합니다.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => applyPendingImport(false)}>
                건너뛰기
              </Button>
              <Button size="sm" onClick={() => applyPendingImport(true)}>
                불러오기
              </Button>
            </div>
          </div>
        </div>
      )}

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
            onValidateForCapture={() =>
              projectInputRef.current?.validateForCapture() ?? Promise.resolve()
            }
          />
        )}
      </main>
    </div>
  );
}
