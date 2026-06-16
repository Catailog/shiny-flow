'use client';

import { useEffect, useRef, useState } from 'react';

import { useSession } from 'next-auth/react';

import type { Edge, Node } from '@xyflow/react';
import { ChevronRightIcon, Loader2Icon, PinIcon, PinOffIcon } from 'lucide-react';

import { FlowViewer, type FlowViewerHandle } from '@/features/flow-viewer';
import type { CommentNodeData } from '@/features/flow-viewer/components/FlowCommentNode';
import {
  type AnalyzeFormValues,
  type AnalyzeOptions,
  type AuthInput,
  ProjectInput,
  type ProjectInputHandle,
} from '@/features/project-input';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';

import type { FlowData } from '@/lib/adapters';
import type { FlowGraph } from '@/lib/analyzer';
import { cn } from '@/lib/utils';

import { useT } from '@/hooks/useT';

import { useUIStore } from '@/store/uiStore';

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

type UuidEntry = {
  authorId: string;
  names: string[];
  count: number;
};

type PendingConvert = {
  graph: FlowGraph;
  snapshot: RfSnapshot;
  analyzeConfig?: AnalyzeFormValues;
  uuidEntries: UuidEntry[];
};

type Props = {
  isCloudMode: boolean;
};

export function HomePage({ isCloudMode }: Props) {
  const [state, setState] = useState<State>({ status: 'idle' });
  const [graphKey, setGraphKey] = useState(0);
  const [slowWarning, setSlowWarning] = useState(false);
  const [overlayError, setOverlayError] = useState<string | null>(null);
  const [staleTimerKey, setStaleTimerKey] = useState(0);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [pendingConvert, setPendingConvert] = useState<PendingConvert | null>(null);
  const [convertSelectedUuids, setConvertSelectedUuids] = useState<string[]>([]);
  const { data: session } = useSession();
  const [screenshotOptions, setScreenshotOptions] = useState<{
    baseUrl: string;
    auth?: AuthInput;
    projectPath: string;
  } | null>(null);
  const [analyzeProgress, setAnalyzeProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [screenshotProgress, setScreenshotProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  const t = useT();
  const setLocale = useUIStore((s) => s.setLocale);

  const abortRef = useRef<AbortController | null>(null);
  const viewerRef = useRef<FlowViewerHandle>(null);
  const projectInputRef = useRef<ProjectInputHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slowWarningRef = useRef(false);

  const analyzeProgressKey = analyzeProgress
    ? `${analyzeProgress.done}/${analyzeProgress.total}`
    : null;
  const screenshotProgressKey = screenshotProgress
    ? `${screenshotProgress.done}/${screenshotProgress.total}`
    : null;

  useEffect(() => {
    if (state.status !== 'loading' || overlayError) {
      if (state.status !== 'loading') {
        slowWarningRef.current = false;
        setSlowWarning(false);
      }
      return;
    }
    slowWarningRef.current = false;
    setSlowWarning(false);
    const timer = setTimeout(() => {
      slowWarningRef.current = true;
      setSlowWarning(true);
    }, SLOW_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [state.status, analyzeProgressKey, screenshotProgressKey, staleTimerKey, overlayError]);

  const handleCancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setOverlayError(null);
    setAnalyzeProgress(null);
    setScreenshotProgress(null);
    setState({ status: 'idle' });
  };

  const handleKeepWaiting = () => {
    setStaleTimerKey((k) => k + 1);
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
          throw new Error(t.home.invalidJson);
        }

        setScreenshotOptions(null);

        // 로그인 상태이고 authorId 가진 로컬 댓글이 있으면 UUID 목록 보여주고 변환 여부 확인
        if (isCloudMode && session?.user && snapshot) {
          const uuidMap = new Map<string, { names: Set<string>; count: number }>();
          for (const n of snapshot.rfNodes) {
            if (n.type !== 'commentNode') continue;
            const data = n.data as CommentNodeData;
            if (!data.authorId) continue;
            if (!uuidMap.has(data.authorId))
              uuidMap.set(data.authorId, { names: new Set(), count: 0 });
            const entry = uuidMap.get(data.authorId)!;
            entry.count++;
            if (data.author) entry.names.add(data.author);
          }
          if (uuidMap.size > 0) {
            const uuidEntries: UuidEntry[] = [...uuidMap.entries()].map(
              ([authorId, { names, count }]) => ({
                authorId,
                names: [...names],
                count,
              }),
            );
            const localAuthorId = localStorage.getItem('sf_author_id');
            setPendingConvert({ graph, snapshot, analyzeConfig, uuidEntries });
            setConvertSelectedUuids(
              localAuthorId && uuidMap.has(localAuthorId) ? [localAuthorId] : [],
            );
            return;
          }
        }

        if (analyzeConfig) {
          setPendingImport({ graph, snapshot, analyzeConfig });
        } else {
          setState({ status: 'success', graph, snapshot });
          setGraphKey((k) => k + 1);
        }
      } catch (err) {
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : t.home.jsonParseFailed,
        });
      }
    };
    reader.readAsText(file);
  };

  const handleAnalyze = async ({ path, screenshot, baseUrl, auth }: AnalyzeOptions) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setOverlayError(null);
    setAnalyzeProgress(null);
    setScreenshotProgress(null);
    setState({ status: 'loading' });
    setScreenshotOptions(screenshot && baseUrl ? { baseUrl, auth, projectPath: path } : null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, screenshot, baseUrl, auth }),
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? t.home.analyzeFailed);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (controller.signal.aborted) {
          reader.cancel();
          return;
        }
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue;
          const event = JSON.parse(part.slice(6)) as
            | { type: 'progress'; done: number; total: number }
            | { type: 'screenshotProgress'; done: number; total: number }
            | { type: 'result'; graph: FlowGraph }
            | { type: 'error'; message: string };

          if (event.type === 'progress') {
            setAnalyzeProgress({ done: event.done, total: event.total });
          } else if (event.type === 'screenshotProgress') {
            setScreenshotProgress({ done: event.done, total: event.total });
          } else if (event.type === 'result') {
            setAnalyzeProgress(null);
            setScreenshotProgress(null);
            setState({ status: 'success', graph: event.graph });
            setGraphKey((k) => k + 1);
            return;
          } else if (event.type === 'error') {
            throw new Error(event.message);
          }
        }
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setAnalyzeProgress(null);
      setScreenshotProgress(null);
      const message = err instanceof Error ? err.message : t.home.unknownError;

      if (slowWarningRef.current) {
        slowWarningRef.current = false;
        setOverlayError(message);
      } else {
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

  const toggleUuid = (authorId: string) => {
    setConvertSelectedUuids((prev) =>
      prev.includes(authorId) ? prev.filter((id) => id !== authorId) : [...prev, authorId],
    );
  };

  const applyConvert = (convert: boolean) => {
    if (!pendingConvert) return;
    const { graph, snapshot, analyzeConfig } = pendingConvert;

    let finalSnapshot = snapshot;
    if (convert && convertSelectedUuids.length > 0 && session?.user) {
      const accountName = session.user.name ?? session.user.email ?? '';
      const accountId = session.user.id;
      const selectedSet = new Set(convertSelectedUuids);
      const convertedNodes = snapshot.rfNodes.map((n) => {
        if (n.type !== 'commentNode') return n;
        const data = n.data as CommentNodeData;
        if (!data.authorId || !selectedSet.has(data.authorId)) return n;
        return {
          ...n,
          data: {
            ...data,
            author: accountName,
            accountId,
            authorId: undefined,
            isLocal: undefined,
          },
        };
      });
      finalSnapshot = { ...snapshot, rfNodes: convertedNodes };
    }

    setPendingConvert(null);
    setConvertSelectedUuids([]);
    if (analyzeConfig) {
      setPendingImport({ graph, snapshot: finalSnapshot, analyzeConfig });
    } else {
      setState({ status: 'success', graph, snapshot: finalSnapshot });
      setGraphKey((k) => k + 1);
    }
  };

  const handleAnalyzeRef = useRef(handleAnalyze);
  useEffect(() => {
    handleAnalyzeRef.current = handleAnalyze;
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const cliLang = params.get('lang');
    if (cliLang === 'ko' || cliLang === 'en') setLocale(cliLang);

    const cliAuthor = params.get('author');
    const cliDevice = params.get('device');
    if (cliAuthor) localStorage.setItem('sf_cli_author', cliAuthor);
    if (cliDevice) localStorage.setItem('sf_cli_device', cliDevice);

    const cliPath = params.get('path');
    if (!cliPath) return;

    const cliScreenshot = params.get('screenshot') === 'true';
    const cliUrl = params.get('url') ?? '';
    const cliAuthType = (params.get('authType') ?? 'none') as 'none' | 'cookies' | 'script';
    const cliScriptPath = params.get('scriptPath') ?? '.shiny-flow/auth.js';

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

  const { state: cloudState, actions: cloudActions } = useCloudFlow({
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

  const [panelPinned, setPanelPinned] = useState(false);
  const [panelHovered, setPanelHovered] = useState(false);
  const [panelFocused, setPanelFocused] = useState(false);
  const panelExpanded = panelPinned || panelHovered || panelFocused;

  return (
    <div className="flex h-screen flex-col bg-background">
      <AppHeader
        isCloudMode={isCloudMode}
        cloudTitle={
          isCloudMode
            ? {
                name: cloudState.cloudFlowName,
                onRename: cloudActions.handleRenameTitle,
              }
            : undefined
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* 좌측 사이드 패널 */}
        <aside
          className={cn(
            'relative shrink-0 overflow-hidden border-r border-border transition-[width] duration-normal',
            panelExpanded ? 'w-80' : 'w-10',
          )}
          onMouseEnter={() => setPanelHovered(true)}
          onMouseLeave={() => setPanelHovered(false)}
          onFocusCapture={() => setPanelFocused(true)}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as globalThis.Node | null))
              setPanelFocused(false);
          }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPanelPinned((p) => !p)}
            className="absolute top-2 right-1 z-10 h-7 w-7 text-muted-foreground"
          >
            {panelPinned ? (
              <PinOffIcon size={13} />
            ) : panelExpanded ? (
              <PinIcon size={13} />
            ) : (
              <ChevronRightIcon size={14} />
            )}
          </Button>

          <div
            className={cn(
              'flex h-full flex-col gap-4 overflow-y-auto p-4 pt-10',
              panelExpanded
                ? 'opacity-100 transition-opacity delay-normal duration-150'
                : 'pointer-events-none opacity-0 transition-none',
            )}
          >
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
              <CloudToolbar hasFlow={hasFlow} state={cloudState} actions={cloudActions} />
            )}
          </div>
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="flex flex-1 flex-col items-center justify-center overflow-hidden">
          {state.status === 'idle' && (
            <p className="text-sm text-muted-foreground">{t.home.idle}</p>
          )}

          {state.status === 'loading' && (
            <div className="flex flex-col items-center gap-3">
              {!overlayError && (
                <>
                  <Loader2Icon size={36} className="animate-spin text-brand-primary" />
                  {screenshotProgress ? (
                    <div className="flex w-48 flex-col gap-1.5">
                      <Progress
                        value={Math.round(
                          (screenshotProgress.done / screenshotProgress.total) * 100,
                        )}
                      />
                      <p className="text-center text-xs text-muted-foreground">
                        {t.home.capturingScreenshots(
                          screenshotProgress.done,
                          screenshotProgress.total,
                        )}
                      </p>
                    </div>
                  ) : analyzeProgress && analyzeProgress.done === analyzeProgress.total ? (
                    <p className="text-sm text-muted-foreground">{t.home.analysisDone}</p>
                  ) : analyzeProgress ? (
                    <div className="flex w-48 flex-col gap-1.5">
                      <Progress
                        value={Math.round((analyzeProgress.done / analyzeProgress.total) * 100)}
                      />
                      <p className="text-center text-xs text-muted-foreground">
                        {t.home.analyzingFiles(analyzeProgress.done, analyzeProgress.total)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t.home.analyzing}</p>
                  )}
                </>
              )}

              {overlayError ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-destructive bg-destructive/10 px-5 py-3 text-sm">
                  <p className="font-medium text-destructive">{overlayError}</p>
                  <Button size="sm" variant="outline" onClick={handleOverlayErrorDismiss}>
                    {t.home.confirmError}
                  </Button>
                </div>
              ) : slowWarning ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-warning bg-warning/10 px-5 py-3 text-sm">
                  <p className="font-medium text-warning">{t.home.slowWarning}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleKeepWaiting}>
                      {t.home.keepWaiting}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={handleCancel}>
                      {t.home.cancel}
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
                  {t.home.cancel}
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

      {pendingConvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="flex w-96 flex-col gap-4 rounded-xl border bg-popover p-5 shadow-lg">
            <div>
              <p className="text-sm font-medium">{t.home.convertAuthorPrompt}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.home.convertAuthorDesc}</p>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-md border border-border">
              {pendingConvert.uuidEntries.map((entry) => {
                const checked = convertSelectedUuids.includes(entry.authorId);
                const id = `uuid-${entry.authorId}`;
                return (
                  <label
                    key={entry.authorId}
                    htmlFor={id}
                    className="flex cursor-pointer items-start gap-3 border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-accent/40"
                  >
                    <Checkbox
                      id={id}
                      checked={checked}
                      onCheckedChange={() => toggleUuid(entry.authorId)}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {entry.authorId}
                      </p>
                      <p className="mt-0.5 text-sm">
                        {entry.names.length > 0 ? entry.names.join(', ') : t.home.convertAuthorNone}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.home.convertAuthorComments(entry.count)}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => applyConvert(false)}>
                {t.home.skip}
              </Button>
              <Button
                size="sm"
                onClick={() => applyConvert(true)}
                disabled={convertSelectedUuids.length === 0}
              >
                {t.home.convertAuthorConfirm}
              </Button>
            </div>
          </div>
        </div>
      )}

      {pendingImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="flex w-80 flex-col gap-4 rounded-xl border bg-popover p-5 shadow-lg">
            <p className="text-sm font-medium">{t.home.importConfigPrompt}</p>
            <p className="text-xs text-muted-foreground">{t.home.importConfigDesc}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => applyPendingImport(false)}>
                {t.home.skip}
              </Button>
              <Button size="sm" onClick={() => applyPendingImport(true)}>
                {t.home.load}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
