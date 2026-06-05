'use client';

import { useState } from 'react';

import type { Edge } from '@xyflow/react';

import { Button } from '@/components/ui/button';
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

import { BaseDialog } from './BaseDialog';

export function EdgeCommentDialog({
  edgeId,
  edges,
  setEdges,
  onClose,
}: {
  edgeId: string;
  edges: Edge[];
  setEdges: (fn: (prev: Edge[]) => Edge[]) => void;
  onClose: () => void;
}) {
  const edge = edges.find((e) => e.id === edgeId);
  const [value, setValue] = useState(
    (edge?.data as { comment?: string } | undefined)?.comment ?? '',
  );

  const save = () => {
    const trimmed = value.trim();
    setEdges((prev) =>
      prev.map((e) => (e.id === edgeId ? { ...e, data: { comment: trimmed || undefined } } : e)),
    );
    onClose();
  };

  return (
    <BaseDialog onClose={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>엣지 코멘트</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="코멘트..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
          }}
        />
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
