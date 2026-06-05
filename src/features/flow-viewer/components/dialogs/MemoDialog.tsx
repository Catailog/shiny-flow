'use client';

import { useState } from 'react';

import type { Node } from '@xyflow/react';

import { Button } from '@/components/ui/button';
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import type { FlowNodeData } from '../../types';
import { MemoEditor } from '../MemoEditor';
import { BaseDialog } from './BaseDialog';

export function MemoDialog({
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
  const [value, setValue] = useState((node?.data as FlowNodeData | undefined)?.memo ?? '');

  const save = () => {
    const isEmpty = value === '' || value === '<p></p>';
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, memo: isEmpty ? undefined : value } } : n,
      ),
    );
    onClose();
  };

  return (
    <BaseDialog onClose={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>메모</DialogTitle>
        </DialogHeader>
        <MemoEditor value={value} onChange={setValue} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={save}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </BaseDialog>
  );
}
