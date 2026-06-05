'use client';

import { useState } from 'react';

import type { Node } from '@xyflow/react';

import { Button } from '@/components/ui/button';
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

import { useT } from '@/hooks/useT';

import { BaseDialog } from './BaseDialog';

export function NodeCreateDialog({
  pos,
  setNodes,
  onClose,
}: {
  pos: { x: number; y: number };
  setNodes: (fn: (prev: Node[]) => Node[]) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState('');
  const t = useT();

  const confirm = () => {
    const trimmed = label.trim() || t.dialog.nodeCreate.defaultName;
    setNodes((prev) => [
      ...prev,
      {
        id: `node-${Date.now()}`,
        type: 'flowNode',
        position: pos,
        data: { label: trimmed, route: trimmed, isDeadEnd: false },
      },
    ]);
    onClose();
  };

  return (
    <BaseDialog onClose={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t.dialog.nodeCreate.title}</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          placeholder={t.dialog.nodeCreate.namePlaceholder}
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
          <Button onClick={confirm}>{t.dialog.nodeCreate.confirm}</Button>
        </DialogFooter>
      </DialogContent>
    </BaseDialog>
  );
}
