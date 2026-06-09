'use client';

import { useState } from 'react';

import type { Edge } from '@xyflow/react';

import { Button } from '@/components/ui/button';
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

import { useT } from '@/hooks/useT';

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
  const edgeComment = (edge?.data as { comment?: string } | undefined)?.comment;
  const [value, setValue] = useState(
    // comment가 명시적으로 설정된 경우 그 값을, 없으면 원본 label을 기본값으로 표시
    edgeComment !== undefined ? edgeComment : edge?.label ? String(edge.label) : '',
  );
  const t = useT();

  const save = () => {
    const trimmed = value.trim();
    setEdges((prev) =>
      prev.map((e) => (e.id === edgeId ? { ...e, data: { ...e.data, comment: trimmed } } : e)),
    );
    onClose();
  };

  return (
    <BaseDialog onClose={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t.dialog.edgeComment.title}</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t.dialog.edgeComment.placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
          }}
        />
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
