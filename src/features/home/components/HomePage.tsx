'use client';

import { useEffect, useRef, useState } from 'react';

import { useSession } from 'next-auth/react';

import { AlertCircleIcon, ChevronRightIcon, Loader2Icon, PinIcon, PinOffIcon } from 'lucide-react';

import { FlowViewer, type FlowViewerHandle } from '@/features/flow-viewer';
import {
  type AnalyzeFormValues,
  ProjectInput,
  type ProjectInputHandle,
} from '@/features/project-input';

import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';

import type { FlowData } from '@/lib/adapters';
import { cn } from '@/lib/utils';

import { useT } from '@/hooks/useT';

import { useUIStore } from '@/store/uiStore';

import { useCloudFlow } from '../hooks/useCloudFlow';
import { useFlowAnalyze } from '../hooks/useFlowAnalyze';
import { useFlowFile } from '../hooks/useFlowFile';
import type { HomeState, ScreenshotOptions } from '../types';
import { CloudToolbar } from './CloudToolbar';

type Props = {
  isCloudMode: boolean;
};

export function HomePage({ isCloudMode }: Props) {
  const [state, setState] = useState<HomeState>({ status: 'idle' });
  const [graphKey, setGraphKey] = useState(0);
  const [screenshotOptions, setScreenshotOptions] = useState<ScreenshotOptions | null>(null);
  const { data: session } = useSession();

  const t = useT();
  const setLocale = useUIStore((s) => s.setLocale);

  const viewerRef = useRef<FlowViewerHandle>(null);
  const projectInputRef = useRef<ProjectInputHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getCurrentFlowData = (): FlowData | null => {
    if (state.status !== 'success') return null;
    return {
      graph: state.graph,
      rfNodes: viewerRef.current?.getNodes() ?? [],
      rfEdges: viewerRef.current?.getEdges() ?? [],
      analyzeConfig: projectInputRef.current?.getConfig() as Record<string, unknown> | undefined,
    };
  };

  const analyze = useFlowAnalyze({
    onLoading: (opts) => {
      setState({ status: 'loading' });
      setScreenshotOptions(opts);
    },
    onSuccess: (graph) => {
      setState({ status: 'success', graph });
      setGraphKey((k) => k + 1);
    },
    onError: (message) => setState({ status: 'error', message }),
    onCancelled: () => setState({ status: 'idle' }),
  });

  const fileFlow = useFlowFile({
    isCloudMode,
    session,
    projectInputRef,
    getCurrentFlowData,
    onSuccess: (graph, snapshot) => {
      setState({ status: 'success', graph, snapshot });
      setGraphKey((k) => k + 1);
      setScreenshotOptions(null);
    },
    onError: (message) => setState({ status: 'error', message }),
    setScreenshotOptions,
  });

  const handleAnalyzeRef = useRef(analyze.handleAnalyze);
  useEffect(() => {
    handleAnalyzeRef.current = analyze.handleAnalyze;
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
  }, [setLocale]);

  const [titleFocusTrigger, setTitleFocusTrigger] = useState(0);

  const { state: cloudState, actions: cloudActions } = useCloudFlow({
    getCurrentFlowData,
    getViewerNodes: () => viewerRef.current?.getNodes() ?? [],
    setViewerNodes: (nodes) => viewerRef.current?.setNodes(nodes),
    onFlowLoaded: ({ graph, rfNodes, rfEdges, analyzeConfig }) => {
      setState({ status: 'success', graph, snapshot: { rfNodes, rfEdges } });
      setGraphKey((k) => k + 1);
      setScreenshotOptions(null);
      if (analyzeConfig) {
        projectInputRef.current?.restoreConfig(analyzeConfig as AnalyzeFormValues);
      }
    },
    onMissingTitle: () => setTitleFocusTrigger((v) => v + 1),
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
        onRefreshCommentAuthors={isCloudMode ? cloudActions.handleRefreshCommentAuthors : undefined}
        isAnalyzing={isLoading}
        cloudTitle={
          isCloudMode && hasFlow
            ? {
                name: cloudState.cloudFlowName,
                onRename: cloudActions.handleRenameTitle,
                focusTrigger: titleFocusTrigger,
                disabled: isLoading,
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
              onChange={fileFlow.handleImportFile}
            />
            <ProjectInput
              ref={projectInputRef}
              onAnalyze={(options) => {
                if (isCloudMode) cloudActions.resetCloudFlow();
                void analyze.handleAnalyze(options);
              }}
              isLoading={isLoading}
              onImport={() => fileInputRef.current?.click()}
              onExport={fileFlow.handleExport}
              canExport={hasFlow}
            />

            {isCloudMode && (
              <CloudToolbar
                hasFlow={hasFlow}
                state={cloudState}
                actions={cloudActions}
                isAnalyzing={isLoading}
              />
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
              <Loader2Icon size={36} className="animate-spin text-brand-primary" />
              {analyze.screenshotProgress ? (
                <div className="flex w-64 flex-col gap-1.5">
                  <Progress
                    value={Math.round(
                      (analyze.screenshotProgress.done / analyze.screenshotProgress.total) * 100,
                    )}
                  />
                  <p className="text-center text-xs text-muted-foreground">
                    {t.home.capturingScreenshots(
                      analyze.screenshotProgress.done,
                      analyze.screenshotProgress.total,
                    )}
                  </p>
                  {analyze.screenshotProgress.currentRoute && (
                    <p className="text-center text-xs break-all text-muted-foreground/60">
                      {analyze.screenshotProgress.currentRoute}
                    </p>
                  )}
                </div>
              ) : analyze.analyzeProgress &&
                analyze.analyzeProgress.done === analyze.analyzeProgress.total ? (
                <p className="text-sm text-muted-foreground">{t.home.analysisDone}</p>
              ) : analyze.analyzeProgress ? (
                <div className="flex w-64 flex-col gap-1.5">
                  <Progress
                    value={Math.round(
                      (analyze.analyzeProgress.done / analyze.analyzeProgress.total) * 100,
                    )}
                  />
                  <p className="text-center text-xs text-muted-foreground">
                    {t.home.analyzingFiles(
                      analyze.analyzeProgress.done,
                      analyze.analyzeProgress.total,
                    )}
                  </p>
                  {analyze.analyzeProgress.currentFile && (
                    <p className="text-center text-xs break-all text-muted-foreground/60">
                      {analyze.analyzeProgress.currentFile}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t.home.analyzing}</p>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={analyze.handleCancel}
                className="text-muted-foreground"
              >
                {t.home.cancel}
              </Button>
            </div>
          )}

          {state.status === 'error' && (
            <div className="flex max-w-sm flex-col items-center gap-2 rounded-lg border border-destructive bg-destructive/10 px-6 py-4 text-sm">
              <AlertCircleIcon size={22} className="shrink-0 text-destructive" />
              <p className="text-center font-medium text-destructive">{state.message}</p>
            </div>
          )}

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

      {fileFlow.pendingConvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="flex w-96 flex-col gap-4 rounded-xl border bg-popover p-5 shadow-lg">
            <div>
              <p className="text-sm font-medium">{t.home.convertAuthorPrompt}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.home.convertAuthorDesc}</p>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-md border border-border">
              {fileFlow.pendingConvert.uuidEntries.map((entry) => {
                const checked = fileFlow.convertSelectedUuids.includes(entry.authorId);
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
                      onCheckedChange={() => fileFlow.toggleUuid(entry.authorId)}
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
              <Button variant="outline" size="sm" onClick={() => fileFlow.applyConvert(false)}>
                {t.home.skip}
              </Button>
              <Button
                size="sm"
                onClick={() => fileFlow.applyConvert(true)}
                disabled={fileFlow.convertSelectedUuids.length === 0}
              >
                {t.home.convertAuthorConfirm}
              </Button>
            </div>
          </div>
        </div>
      )}

      {fileFlow.pendingImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="flex w-80 flex-col gap-4 rounded-xl border bg-popover p-5 shadow-lg">
            <p className="text-sm font-medium">{t.home.importConfigPrompt}</p>
            <p className="text-xs text-muted-foreground">{t.home.importConfigDesc}</p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileFlow.applyPendingImport(false)}
              >
                {t.home.skip}
              </Button>
              <Button size="sm" onClick={() => fileFlow.applyPendingImport(true)}>
                {t.home.load}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
