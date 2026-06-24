'use client';

import { useState } from 'react';

import type { Node } from '@xyflow/react';

import { Button } from '@/components/ui/button';
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

import { useT } from '@/hooks/useT';

import { useHistory } from '../../historyContext';
import type { GroupNodeData } from '../../types';
import { BaseDialog } from './BaseDialog';
import { GroupColorPicker } from './GroupColorPicker';

export function GroupEditDialog({
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
  const node = nodes.find((n) => n.id === nodeId);
  const data = node?.data as GroupNodeData | undefined;
  const [label, setLabel] = useState(data?.label ?? '');
  const [color, setColor] = useState(data?.color ?? 'gray');
  const t = useT();
  const { pushSnapshot } = useHistory();

  const save = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    pushSnapshot();
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, data: { label: trimmed, color } } : n)),
    );
    onClose();
  };

  return (
    <BaseDialog onClose={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t.dialog.groupEdit.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
            }}
          />
          <GroupColorPicker value={color} onChange={setColor} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t.dialog.cancel}
          </Button>
          <Button onClick={save}>{t.dialog.save}</Button>
        </DialogFooter>
      </DialogContent>
    </BaseDialog>
  );
}
