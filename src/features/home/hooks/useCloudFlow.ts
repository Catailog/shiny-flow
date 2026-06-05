'use client';

import { useState } from 'react';

import { useSession } from 'next-auth/react';

import type { Edge, Node } from '@xyflow/react';

import type { AnalyzeFormValues } from '@/features/project-input';

import { type FlowData, type FlowMeta, cloudFlowAdapter } from '@/lib/adapters';
import type { FlowGraph } from '@/lib/analyzer';

export type CloudFlowState = {
  cloudFlowId: string | null;
  cloudFlowName: string;
  saveDialogOpen: boolean;
  saveNameInput: string;
  myFlowsOpen: boolean;
  flowsList: FlowMeta[];
  busyAction: 'save' | 'myFlows' | 'share' | null;
  shareCopied: boolean;
  rowBusy: { id: string; action: 'share' | 'delete' } | null;
  copiedFlowId: string | null;
  confirmDeleteId: string | null;
};

export type CloudFlowActions = {
  setSaveDialogOpen: (open: boolean) => void;
  setSaveNameInput: (name: string) => void;
  setMyFlowsOpen: (open: boolean) => void;
  setConfirmDeleteId: (id: string | null) => void;
  handleCloudSave: () => void;
  handleSaveConfirm: () => Promise<void>;
  handleOpenMyFlows: () => Promise<void>;
  handleLoadFlow: (id: string, name: string) => Promise<void>;
  handleShare: () => Promise<void>;
  handleShareFlow: (id: string) => Promise<void>;
  handleDeleteFlow: (id: string) => Promise<void>;
};

type Deps = {
  getCurrentFlowData: () => FlowData | null;
  onFlowLoaded: (params: {
    graph: FlowGraph;
    rfNodes: Node[];
    rfEdges: Edge[];
    analyzeConfig?: AnalyzeFormValues;
    id: string;
    name: string;
  }) => void;
};

export function useCloudFlow({ getCurrentFlowData, onFlowLoaded }: Deps): {
  session: ReturnType<typeof useSession>['data'];
  state: CloudFlowState;
  actions: CloudFlowActions;
} {
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
      onFlowLoaded({
        graph: data.graph,
        rfNodes: data.rfNodes,
        rfEdges: data.rfEdges,
        analyzeConfig: data.analyzeConfig as AnalyzeFormValues | undefined,
        id,
        name,
      });
      setCloudFlowId(id);
      setCloudFlowName(name);
      setMyFlowsOpen(false);
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

  return {
    session,
    state: {
      cloudFlowId,
      cloudFlowName,
      saveDialogOpen,
      saveNameInput,
      myFlowsOpen,
      flowsList,
      busyAction,
      shareCopied,
      rowBusy,
      copiedFlowId,
      confirmDeleteId,
    },
    actions: {
      setSaveDialogOpen,
      setSaveNameInput,
      setMyFlowsOpen,
      setConfirmDeleteId,
      handleCloudSave,
      handleSaveConfirm,
      handleOpenMyFlows,
      handleLoadFlow,
      handleShare,
      handleShareFlow,
      handleDeleteFlow,
    },
  };
}
