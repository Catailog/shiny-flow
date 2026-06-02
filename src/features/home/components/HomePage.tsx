'use client';

import { useEffect, useRef, useState } from 'react';

import { signIn, signOut, useSession } from 'next-auth/react';

import type { Edge, Node } from '@xyflow/react';
import {
  CheckIcon,
  CloudUploadIcon,
  FolderOpenIcon,
  Loader2Icon,
  LogOutIcon,
  Share2Icon,
  Trash2Icon,
} from 'lucide-react';

import { FlowViewer, type FlowViewerHandle } from '@/features/flow-viewer';
import {
  type AnalyzeFormValues,
  type AnalyzeOptions,
  type AuthInput,
  ProjectInput,
  type ProjectInputHandle,
} from '@/features/project-input';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { type FlowMeta, cloudFlowAdapter } from '@/lib/adapters';
import type { FlowGraph } from '@/lib/analyzer';

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

  // Cloud state
  const { data: session } = useSession();
  const [cloudFlowId, setCloudFlowId] = useState<string | null>(null);
  const [cloudFlowName, setCloudFlowName] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveNameInput, setSaveNameInput] = useState('');
  const [myFlowsOpen, setMyFlowsOpen] = useState(false);
  const [flowsList, setFlowsList] = useState<FlowMeta[]>([]);
  const [busyAction, setBusyAction] = useState<'save' | 'myFlows' | 'share' | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [rowBusy, setRowBusy] = useState<{ id: string; action: 'share' | 'delete' } | null>(null);
  const [copiedFlowId, setCopiedFlowId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  // --- Cloud handlers ---

  const getCurrentFlowData = () => {
    if (state.status !== 'success') return null;
    return {
      graph: state.graph,
      rfNodes: viewerRef.current?.getNodes() ?? [],
      rfEdges: viewerRef.current?.getEdges() ?? [],
      analyzeConfig: projectInputRef.current?.getConfig() as Record<string, unknown> | undefined,
    };
  };

  const handleCloudSave = () => {
    const data = getCurrentFlowData();
    if (!data) return;
    const fallback = data.graph.projectPath.split(/[\\/]/).at(-1) ?? 'flow';
    setSaveNameInput(cloudFlowName || fallback);
    setSaveDialogOpen(true);
  };

  const handleSaveConfirm = async () => {
    const data = getCurrentFlowData();
    if (!data || !saveNameInput.trim()) return;

    const name = saveNameInput.trim();
    try {
      setBusyAction('save');
      if (cloudFlowId && name === cloudFlowName) {
        await cloudFlowAdapter.save(cloudFlowId, data);
      } else {
        const id = await cloudFlowAdapter.create(name, data);
        setCloudFlowId(id);
      }
      setCloudFlowName(name);
      setSaveDialogOpen(false);
    } finally {
      setBusyAction(null);
    }
  };

  const handleOpenMyFlows = async () => {
    try {
      setBusyAction('myFlows');
      const flows = await cloudFlowAdapter.list();
      setFlowsList(flows);
      setMyFlowsOpen(true);
    } finally {
      setBusyAction(null);
    }
  };

  const handleLoadFlow = async (id: string, name: string) => {
    try {
      setBusyAction('myFlows');
      const data = await cloudFlowAdapter.load(id);
      if (!data) return;
      setState({
        status: 'success',
        graph: data.graph,
        snapshot: { rfNodes: data.rfNodes, rfEdges: data.rfEdges },
      });
      setGraphKey((k) => k + 1);
      setCloudFlowId(id);
      setCloudFlowName(name);
      setMyFlowsOpen(false);
      setScreenshotOptions(null);
      if (data.analyzeConfig) {
        projectInputRef.current?.restoreConfig(data.analyzeConfig as AnalyzeFormValues);
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleShare = async () => {
    if (!cloudFlowId) return;
    try {
      setBusyAction('share');
      const url = await cloudFlowAdapter.share(cloudFlowId);
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } finally {
      setBusyAction(null);
    }
  };

  const handleShareFlow = async (id: string) => {
    try {
      setRowBusy({ id, action: 'share' });
      const url = await cloudFlowAdapter.share(id);
      await navigator.clipboard.writeText(url);
      setCopiedFlowId(id);
      setTimeout(() => setCopiedFlowId(null), 2000);
    } finally {
      setRowBusy(null);
    }
  };

  const handleDeleteFlow = async (id: string) => {
    try {
      setRowBusy({ id, action: 'delete' });
      await cloudFlowAdapter.delete(id);
      setFlowsList((prev) => prev.filter((f) => f.id !== id));
      setConfirmDeleteId(null);
      if (cloudFlowId === id) {
        setCloudFlowId(null);
        setCloudFlowName('');
      }
    } finally {
      setRowBusy(null);
    }
  };

  const isLoading = state.status === 'loading';
  const hasFlow = state.status === 'success';
  const isLoggedIn = !!session?.user;

  const saveDisabledTip = !hasFlow
    ? '분석된 그래프가 없습니다.'
    : !isLoggedIn
      ? '로그인이 필요합니다.'
      : undefined;

  const myFlowsDisabledTip = !isLoggedIn ? '로그인이 필요합니다.' : undefined;

  const shareDisabledTip = !isLoggedIn
    ? '로그인이 필요합니다.'
    : !cloudFlowId
      ? '먼저 저장해야 공유할 수 있습니다.'
      : undefined;

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
          <>
            <div className="flex items-center gap-2">
              {/* 저장 */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      className={saveDisabledTip ? 'inline-flex cursor-not-allowed' : 'inline-flex'}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!!saveDisabledTip || busyAction === 'save'}
                        onClick={handleCloudSave}
                      >
                        {busyAction === 'save' ? (
                          <Loader2Icon size={14} className="animate-spin" />
                        ) : (
                          <CloudUploadIcon size={14} />
                        )}
                        저장
                      </Button>
                    </span>
                  }
                />
                {saveDisabledTip && <TooltipContent>{saveDisabledTip}</TooltipContent>}
              </Tooltip>

              {/* 내 플로우 */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      className={
                        myFlowsDisabledTip ? 'inline-flex cursor-not-allowed' : 'inline-flex'
                      }
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!!myFlowsDisabledTip || busyAction === 'myFlows'}
                        onClick={handleOpenMyFlows}
                      >
                        {busyAction === 'myFlows' ? (
                          <Loader2Icon size={14} className="animate-spin" />
                        ) : (
                          <FolderOpenIcon size={14} />
                        )}
                        내 플로우
                      </Button>
                    </span>
                  }
                />
                {myFlowsDisabledTip && <TooltipContent>{myFlowsDisabledTip}</TooltipContent>}
              </Tooltip>

              {/* 공유 */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      className={
                        shareDisabledTip ? 'inline-flex cursor-not-allowed' : 'inline-flex'
                      }
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!!shareDisabledTip || busyAction === 'share'}
                        onClick={handleShare}
                      >
                        {busyAction === 'share' ? (
                          <Loader2Icon size={14} className="animate-spin" />
                        ) : shareCopied ? (
                          <CheckIcon size={14} />
                        ) : (
                          <Share2Icon size={14} />
                        )}
                        {busyAction === 'share' ? '생성 중...' : shareCopied ? '복사됨' : '공유'}
                      </Button>
                    </span>
                  }
                />
                <TooltipContent>
                  {shareDisabledTip ??
                    (busyAction === 'share'
                      ? '공유 링크를 서버에 저장하는 중입니다.'
                      : '링크 복사')}
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {isLoggedIn ? (
                <>
                  <span className="text-xs text-muted-foreground">{session.user.name}</span>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span className="inline-flex">
                          <Button variant="ghost" size="icon" onClick={() => signOut()}>
                            <LogOutIcon size={15} />
                          </Button>
                        </span>
                      }
                    />
                    <TooltipContent>로그아웃</TooltipContent>
                  </Tooltip>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => signIn('github')}>
                  GitHub 로그인
                </Button>
              )}
            </div>
          </>
        )}
      </header>

      {/* 저장 이름 입력 다이얼로그 */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>플로우 저장</DialogTitle>
          </DialogHeader>
          <Input
            value={saveNameInput}
            onChange={(e) => setSaveNameInput(e.target.value)}
            placeholder="플로우 이름"
            onKeyDown={(e) => e.key === 'Enter' && handleSaveConfirm()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSaveDialogOpen(false)}>
              취소
            </Button>
            <Button
              size="sm"
              disabled={!saveNameInput.trim() || busyAction === 'save'}
              onClick={handleSaveConfirm}
            >
              {busyAction === 'save' && <Loader2Icon size={14} className="animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 내 플로우 목록 다이얼로그 */}
      <Dialog
        open={myFlowsOpen}
        onOpenChange={(open) => {
          setMyFlowsOpen(open);
          if (!open) setConfirmDeleteId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>내 플로우</DialogTitle>
          </DialogHeader>
          {flowsList.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              저장된 플로우가 없습니다.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {flowsList.map((f) => {
                const isRowBusy = rowBusy?.id === f.id;
                const isCopied = copiedFlowId === f.id;
                const isConfirming = confirmDeleteId === f.id;
                return (
                  <li key={f.id} className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      className="h-auto flex-1 justify-between px-3 py-2 text-sm font-normal"
                      onClick={() => handleLoadFlow(f.id, f.name)}
                      disabled={!!rowBusy || busyAction === 'myFlows' || isConfirming}
                    >
                      <span>{f.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(f.updatedAt).toLocaleString('ko-KR', {
                          dateStyle: 'short',
                          timeStyle: 'medium',
                          hour12: false,
                        })}
                      </span>
                    </Button>

                    {isConfirming ? (
                      <>
                        <span className="text-xs text-destructive">삭제할까요?</span>
                        <Button
                          variant="destructive"
                          size="xs"
                          disabled={isRowBusy}
                          onClick={() => handleDeleteFlow(f.id)}
                        >
                          {isRowBusy ? <Loader2Icon size={12} className="animate-spin" /> : '삭제'}
                        </Button>
                        <Button variant="ghost" size="xs" onClick={() => setConfirmDeleteId(null)}>
                          취소
                        </Button>
                      </>
                    ) : (
                      <>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <span className="inline-flex">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  disabled={!!rowBusy || busyAction === 'myFlows'}
                                  onClick={() => handleShareFlow(f.id)}
                                >
                                  {isRowBusy && rowBusy?.action === 'share' ? (
                                    <Loader2Icon size={13} className="animate-spin" />
                                  ) : isCopied ? (
                                    <CheckIcon size={13} />
                                  ) : (
                                    <Share2Icon size={13} />
                                  )}
                                </Button>
                              </span>
                            }
                          />
                          <TooltipContent>
                            {isRowBusy && rowBusy?.action === 'share'
                              ? '공유 링크를 서버에 저장하는 중입니다.'
                              : isCopied
                                ? '복사됨'
                                : '공유 링크 복사'}
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <span className="inline-flex">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  disabled={!!rowBusy || busyAction === 'myFlows'}
                                  onClick={() => setConfirmDeleteId(f.id)}
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2Icon size={13} />
                                </Button>
                              </span>
                            }
                          />
                          <TooltipContent>삭제</TooltipContent>
                        </Tooltip>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>

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
