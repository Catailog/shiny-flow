import { useState } from 'react';

import type { Session } from 'next-auth';

import type { Edge, Node } from '@xyflow/react';

import type { CommentNodeData } from '@/features/flow-viewer/components/FlowCommentNode';
import type { AnalyzeFormValues, ProjectInputHandle } from '@/features/project-input';

import type { FlowData } from '@/lib/adapters';
import type { FlowGraph } from '@/lib/analyzer';

import { useT } from '@/hooks/useT';

import { refreshCommentAuthorNames } from '../services/refreshCommentAuthorNames';
import type { RfSnapshot, ScreenshotOptions } from '../types';

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

type Options = {
  isCloudMode: boolean;
  session: Session | null | undefined;
  projectInputRef: React.RefObject<ProjectInputHandle | null>;
  getCurrentFlowData: () => FlowData | null;
  onSuccess: (graph: FlowGraph, snapshot?: RfSnapshot) => void;
  onError: (message: string) => void;
  setScreenshotOptions: (opts: ScreenshotOptions | null) => void;
};

export function useFlowFile({
  isCloudMode,
  session,
  projectInputRef,
  getCurrentFlowData,
  onSuccess,
  onError,
  setScreenshotOptions,
}: Options) {
  const t = useT();
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [pendingConvert, setPendingConvert] = useState<PendingConvert | null>(null);
  const [convertSelectedUuids, setConvertSelectedUuids] = useState<string[]>([]);

  const handleExport = async () => {
    const data = getCurrentFlowData();
    if (!data) return;
    const rfNodes = await refreshCommentAuthorNames(data.rfNodes);
    const json = JSON.stringify({ ...data, rfNodes }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const projectName = data.graph.projectPath.split(/[\\/]/).at(-1) ?? 'flow';
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
              ? {
                  rfNodes: parsed.rfNodes as Node[],
                  rfEdges: parsed.rfEdges as Edge[],
                }
              : undefined;
        } else if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
          graph = parsed as FlowGraph;
        } else {
          throw new Error(t.home.invalidJson);
        }

        setScreenshotOptions(null);

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
              ([authorId, { names, count }]) => ({ authorId, names: [...names], count }),
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
          onSuccess(graph, snapshot);
        }
      } catch (err) {
        onError(err instanceof Error ? err.message : t.home.jsonParseFailed);
      }
    };
    reader.readAsText(file);
  };

  const applyPendingImport = (restoreConfig: boolean) => {
    if (!pendingImport) return;
    const { graph, snapshot, analyzeConfig } = pendingImport;
    if (restoreConfig) projectInputRef.current?.restoreConfig(analyzeConfig);
    onSuccess(graph, snapshot);
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
      onSuccess(graph, finalSnapshot);
    }
  };

  return {
    pendingImport,
    pendingConvert,
    convertSelectedUuids,
    handleExport,
    handleImportFile,
    applyPendingImport,
    toggleUuid,
    applyConvert,
  };
}
