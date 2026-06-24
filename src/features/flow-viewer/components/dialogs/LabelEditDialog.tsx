'use client';

import { useState } from 'react';

import type { Node } from '@xyflow/react';

import { Button } from '@/components/ui/button';
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

import { useT } from '@/hooks/useT';

import { useHistory } from '../../historyContext';
import type { FlowNodeData } from '../../types';
import { BaseDialog } from './BaseDialog';

export function LabelEditDialog({
  nodeId,
  nodes,
  setNodes,
  onClose,
}: {
  nodeId: string;
  nodes: Node[];
  setNodes: (fn: (prev: Node[]) => Node[]) => void;
  onClose: () => void;
}) {
  const t = useT();
  const { pushSnapshot } = useHistory();
  const node = nodes.find((n) => n.id === nodeId);
  const nodeData = node?.data as FlowNodeData | undefined;
  const [label, setLabel] = useState(nodeData?.label ?? '');

  const confirm = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    pushSnapshot();
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, label: trimmed } } : n)),
    );
    onClose();
  };

  return (
    <BaseDialog onClose={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t.dialog.labelEdit.title}</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          placeholder={t.dialog.labelEdit.placeholder}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') confirm();
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t.dialog.cancel}
          </Button>
          <Button onClick={confirm} disabled={!label.trim()}>
            {t.dialog.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </BaseDialog>
  );
}
