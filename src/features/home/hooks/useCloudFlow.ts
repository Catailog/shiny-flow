'use client';

import { useState } from 'react';

import type { Edge, Node } from '@xyflow/react';

import type { AnalyzeFormValues } from '@/features/project-input';

import { type FlowData, type FlowMeta, cloudFlowAdapter } from '@/lib/adapters';
import type { FlowGraph } from '@/lib/analyzer';

type DuplicateConflict = { existingId: string; targetName: string };

export type CloudFlowState = {
  cloudFlowId: string | null;
  cloudFlowName: string;
  saveDialogOpen: boolean;
  saveNameInput: string;
  duplicateConflict: DuplicateConflict | null;
  myFlowsOpen: boolean;
  flowsList: FlowMeta[];
  busyAction: 'save' | 'overwrite' | 'duplicate' | 'myFlows' | 'share' | null;
  shareCopied: boolean;
  rowBusy: { id: string; action: 'share' | 'delete' | 'rename' } | null;
  copiedFlowId: string | null;
  confirmDeleteId: string | null;
  editingNameId: string | null;
  editingNameValue: string;
};

export type CloudFlowActions = {
  setSaveDialogOpen: (open: boolean) => void;
  setSaveNameInput: (name: string) => void;
  setMyFlowsOpen: (open: boolean) => void;
  setConfirmDeleteId: (id: string | null) => void;
  setEditingNameId: (id: string | null) => void;
  setEditingNameValue: (value: string) => void;
  handleCloudSave: () => void;
  handleCloseSaveDialog: () => void;
  handleSaveConfirm: () => Promise<void>;
  handleSaveOverwrite: () => Promise<void>;
  handleSaveDuplicate: () => Promise<void>;
  handleSaveRename: () => void;
  handleOpenMyFlows: () => Promise<void>;
  handleLoadFlow: (id: string, name: string) => Promise<void>;
  handleShare: () => Promise<void>;
  handleShareFlow: (id: string) => Promise<void>;
  handleDeleteFlow: (id: string) => Promise<void>;
  handleStartRename: (id: string, currentName: string) => void;
  handleRenameConfirm: (id: string) => Promise<void>;
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
  state: CloudFlowState;
  actions: CloudFlowActions;
} {
  const [cloudFlowId, setCloudFlowId] = useState<string | null>(null);
  const [cloudFlowName, setCloudFlowName] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveNameInput, setSaveNameInput] = useState('');
  const [duplicateConflict, setDuplicateConflict] = useState<DuplicateConflict | null>(null);
  const [myFlowsOpen, setMyFlowsOpen] = useState(false);
  const [flowsList, setFlowsList] = useState<FlowMeta[]>([]);
  const [busyAction, setBusyAction] = useState<
    'save' | 'overwrite' | 'duplicate' | 'myFlows' | 'share' | null
  >(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [rowBusy, setRowBusy] = useState<{
    id: string;
    action: 'share' | 'delete' | 'rename';
  } | null>(null);
  const [copiedFlowId, setCopiedFlowId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');

  const handleCloudSave = () => {
    const data = getCurrentFlowData();
    if (!data) return;
    const fallback = data.graph.projectPath.split(/[\\/]/).at(-1) ?? 'flow';
    setSaveNameInput(cloudFlowName || fallback);
    setSaveDialogOpen(true);
  };

  const handleCloseSaveDialog = () => {
    setSaveDialogOpen(false);
    setDuplicateConflict(null);
  };

  const handleSaveConfirm = async () => {
    const data = getCurrentFlowData();
    if (!data || !saveNameInput.trim()) return;
    const name = saveNameInput.trim();
    try {
      setBusyAction('save');
      if (cloudFlowId && name === cloudFlowName) {
        await cloudFlowAdapter.save(cloudFlowId, data);
        setCloudFlowName(name);
        setSaveDialogOpen(false);
        return;
      }
      const flows = await cloudFlowAdapter.list();
      setFlowsList(flows);
      const existing = flows.find((f) => f.name === name && f.id !== cloudFlowId);
      if (existing) {
        setDuplicateConflict({ existingId: existing.id, targetName: name });
        return;
      }
      if (cloudFlowId) {
        await cloudFlowAdapter.save(cloudFlowId, data, name);
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

  const handleSaveOverwrite = async () => {
    const data = getCurrentFlowData();
    if (!data || !duplicateConflict) return;
    const { existingId, targetName } = duplicateConflict;
    try {
      setBusyAction('overwrite');
      await cloudFlowAdapter.save(existingId, data);
      setCloudFlowId(existingId);
      setCloudFlowName(targetName);
      setDuplicateConflict(null);
      setSaveDialogOpen(false);
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveDuplicate = async () => {
    const data = getCurrentFlowData();
    if (!data || !duplicateConflict) return;
    const { targetName } = duplicateConflict;
    try {
      setBusyAction('duplicate');
      const existingNames = new Set(flowsList.map((f) => f.name));
      let n = 2;
      let uniqueName = `${targetName} (${n})`;
      while (existingNames.has(uniqueName)) {
        n++;
        uniqueName = `${targetName} (${n})`;
      }
      const id = await cloudFlowAdapter.create(uniqueName, data);
      setCloudFlowId(id);
      setCloudFlowName(uniqueName);
      setDuplicateConflict(null);
      setSaveDialogOpen(false);
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveRename = () => {
    setDuplicateConflict(null);
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

  const handleStartRename = (id: string, currentName: string) => {
    setEditingNameId(id);
    setEditingNameValue(currentName);
  };

  const handleRenameConfirm = async (id: string) => {
    const name = editingNameValue.trim();
    if (!name) return;
    const current = flowsList.find((f) => f.id === id);
    if (current?.name === name) {
      setEditingNameId(null);
      return;
    }
    try {
      setRowBusy({ id, action: 'rename' });
      const { updatedAt } = await cloudFlowAdapter.rename(id, name);
      setFlowsList((prev) =>
        prev
          .map((f) => (f.id === id ? { ...f, name, updatedAt } : f))
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
      );
      setEditingNameId(null);
      if (cloudFlowId === id) setCloudFlowName(name);
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
    state: {
      cloudFlowId,
      cloudFlowName,
      saveDialogOpen,
      saveNameInput,
      duplicateConflict,
      myFlowsOpen,
      flowsList,
      busyAction,
      shareCopied,
      rowBusy,
      copiedFlowId,
      confirmDeleteId,
      editingNameId,
      editingNameValue,
    },
    actions: {
      setSaveDialogOpen,
      setSaveNameInput,
      setMyFlowsOpen,
      setConfirmDeleteId,
      setEditingNameId,
      setEditingNameValue,
      handleCloudSave,
      handleCloseSaveDialog,
      handleSaveConfirm,
      handleSaveOverwrite,
      handleSaveDuplicate,
      handleSaveRename,
      handleOpenMyFlows,
      handleLoadFlow,
      handleShare,
      handleShareFlow,
      handleDeleteFlow,
      handleStartRename,
      handleRenameConfirm,
    },
  };
}
