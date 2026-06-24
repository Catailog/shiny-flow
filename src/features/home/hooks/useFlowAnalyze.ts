import { useEffect, useRef, useState } from 'react';

import type { AnalyzeOptions } from '@/features/project-input';

import type { FlowGraph } from '@/lib/analyzer';

import { useT } from '@/hooks/useT';

import type { ScreenshotOptions } from '../types';

const SLOW_TIMEOUT_MS = 20000;

type Options = {
  onLoading: (opts: ScreenshotOptions | null) => void;
  onSuccess: (graph: FlowGraph) => void;
  onError: (message: string) => void;
  onCancelled: () => void;
};

export function useFlowAnalyze({ onLoading, onSuccess, onError, onCancelled }: Options) {
  const t = useT();
  const [isLoading, setIsLoading] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState<{
    done: number;
    total: number;
    currentFile?: string;
  } | null>(null);
  const [screenshotProgress, setScreenshotProgress] = useState<{
    done: number;
    total: number;
    currentRoute?: string;
  } | null>(null);
  const [overlayError, setOverlayError] = useState<string | null>(null);
  const [slowWarning, setSlowWarning] = useState(false);
  const [staleTimerKey, setStaleTimerKey] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const slowWarningRef = useRef(false);

  const analyzeProgressKey = analyzeProgress
    ? `${analyzeProgress.done}/${analyzeProgress.total}`
    : null;
  const screenshotProgressKey = screenshotProgress
    ? `${screenshotProgress.done}/${screenshotProgress.total}`
    : null;

  useEffect(() => {
    if (!isLoading || overlayError) return;

    slowWarningRef.current = false;
    const timer = setTimeout(() => {
      slowWarningRef.current = true;
      setSlowWarning(true);
    }, SLOW_TIMEOUT_MS);

    return () => {
      clearTimeout(timer);
      slowWarningRef.current = false;
      setSlowWarning(false);
    };
  }, [isLoading, analyzeProgressKey, screenshotProgressKey, staleTimerKey, overlayError]);

  const handleAnalyze = async ({ path, screenshot, baseUrl, auth }: AnalyzeOptions) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setOverlayError(null);
    setAnalyzeProgress(null);
    setScreenshotProgress(null);
    onLoading(screenshot && baseUrl ? { baseUrl, auth, projectPath: path } : null);

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
        throw new Error((data as { error?: string }).error ?? t.home.analyzeFailed);
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
            | { type: 'progress'; done: number; total: number; currentFile?: string }
            | { type: 'screenshotProgress'; done: number; total: number; currentRoute?: string }
            | { type: 'result'; graph: FlowGraph }
            | { type: 'error'; message: string };

          if (event.type === 'progress') {
            setAnalyzeProgress({
              done: event.done,
              total: event.total,
              currentFile: event.currentFile,
            });
          } else if (event.type === 'screenshotProgress') {
            setScreenshotProgress({
              done: event.done,
              total: event.total,
              currentRoute: event.currentRoute,
            });
          } else if (event.type === 'result') {
            setAnalyzeProgress(null);
            setScreenshotProgress(null);
            setIsLoading(false);
            onSuccess(event.graph);
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
        setIsLoading(false);
        onError(message);
      }
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setOverlayError(null);
    setAnalyzeProgress(null);
    setScreenshotProgress(null);
    setIsLoading(false);
    onCancelled();
  };

  const handleKeepWaiting = () => {
    setStaleTimerKey((k) => k + 1);
  };

  const handleOverlayErrorDismiss = () => {
    setOverlayError(null);
    setIsLoading(false);
    onCancelled();
  };

  return {
    analyzeProgress,
    screenshotProgress,
    overlayError,
    slowWarning,
    handleAnalyze,
    handleCancel,
    handleKeepWaiting,
    handleOverlayErrorDismiss,
  };
}
