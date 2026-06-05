'use client';

import { useState } from 'react';

import type { Node } from '@xyflow/react';

import { Button } from '@/components/ui/button';
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

import { BaseDialog } from './BaseDialog';

function formatExact(isoString: string): string {
  return new Date(isoString).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function CommentNodeDialog({
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
  const existing = node?.data as
    | { content?: string; author?: string; createdAt?: string; updatedAt?: string }
    | undefined;
  const [value, setValue] = useState(existing?.content ?? '');

  const timeRef = existing?.updatedAt ?? existing?.createdAt;

  const save = () => {
    const now = new Date().toISOString();
    const wasNonEmpty = !!existing?.content?.trim();
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId) return n;
        return {
          ...n,
          data: {
            ...n.data,
            content: value,
            updatedAt: wasNonEmpty ? now : undefined,
          },
        };
      }),
    );
    onClose();
  };

  return (
    <BaseDialog onClose={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>댓글</DialogTitle>
          {(existing?.author || timeRef) && (
            <p className="text-xs text-muted-foreground">
              {existing?.author}
              {existing?.author && timeRef && ' · '}
              {timeRef && formatExact(timeRef)}
              {existing?.updatedAt && ' (수정됨)'}
            </p>
          )}
        </DialogHeader>
        <Textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="댓글을 입력하세요..."
          className="min-h-24 resize-none"
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
