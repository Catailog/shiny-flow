'use client';

import { useState } from 'react';

import type { Node } from '@xyflow/react';

import { Button } from '@/components/ui/button';
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

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

  const confirm = () => {
    const trimmed = label.trim() || '새 페이지';
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
          <DialogTitle>노드 생성</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          placeholder="페이지 이름"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') confirm();
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={confirm}>만들기</Button>
        </DialogFooter>
      </DialogContent>
    </BaseDialog>
  );
}
