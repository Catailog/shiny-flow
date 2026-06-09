'use client';

import { useState } from 'react';

import type { Node } from '@xyflow/react';

import { Button } from '@/components/ui/button';
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { useAuthorPreference } from '@/hooks/useAuthorPreference';
import { useT } from '@/hooks/useT';

import { BaseDialog } from './BaseDialog';

function formatExact(isoString: string, dateLocale: string): string {
  return new Date(isoString).toLocaleString(dateLocale, {
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
    | {
        content?: string;
        author?: string;
        authorId?: string;
        isLocal?: true;
        createdAt?: string;
        updatedAt?: string;
      }
    | undefined;
  const [value, setValue] = useState(existing?.content ?? '');
  const t = useT();

  const { authorId, authorName, options, needsPick, pick, pickCustom, dismiss } =
    useAuthorPreference();
  const [localAuthor, setLocalAuthor] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState('');

  const effectiveAuthor = localAuthor ?? authorName;
  const showPicker = needsPick && !localAuthor;

  const timeRef = existing?.updatedAt ?? existing?.createdAt;

  const handlePick = (choice: 'author' | 'device') => {
    const name = choice === 'author' ? options.author : options.device;
    if (name) setLocalAuthor(name);
    pick(choice);
  };

  const handleCustomPick = () => {
    const name = customInput.trim();
    if (!name) return;
    setLocalAuthor(name);
    pickCustom(name);
  };

  const save = () => {
    const now = new Date().toISOString();
    const wasNonEmpty = !!existing?.content?.trim();
    if (showPicker) dismiss();
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId) return n;
        const isFirstWrite = !wasNonEmpty && !!value.trim();
        return {
          ...n,
          data: {
            ...n.data,
            content: value,
            ...(isFirstWrite && {
              author: effectiveAuthor ?? undefined,
              authorId: authorId || undefined,
              isLocal: true as const,
              createdAt: now,
            }),
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
          <DialogTitle>{t.dialog.comment.title}</DialogTitle>
          {(existing?.author || timeRef) && (
            <p className="text-xs text-muted-foreground">
              {existing?.author}
              {existing?.author && timeRef && ' · '}
              {timeRef && formatExact(timeRef, t.dateLocale)}
              {existing?.updatedAt && ' ' + t.dialog.comment.edited}
            </p>
          )}
        </DialogHeader>
        {showPicker && (
          <div className="rounded-md border border-border bg-muted/40 p-3">
            <p className="mb-1 text-sm font-medium">{t.dialog.comment.authorPick}</p>
            <p className="mb-2.5 text-xs text-muted-foreground">{t.dialog.comment.authorHint}</p>
            <div className="flex flex-wrap gap-2">
              {options.author && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-auto flex-1 flex-col items-start gap-0 py-1.5"
                  onClick={() => handlePick('author')}
                >
                  <span className="text-xs text-muted-foreground">
                    {t.dialog.comment.authorUsername}
                  </span>
                  <span>{options.author}</span>
                </Button>
              )}
              {options.device && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-auto flex-1 flex-col items-start gap-0 py-1.5"
                  onClick={() => handlePick('device')}
                >
                  <span className="text-xs text-muted-foreground">
                    {t.dialog.comment.authorDevice}
                  </span>
                  <span>{options.device}</span>
                </Button>
              )}
            </div>
            <div className="mt-2 flex gap-1.5">
              <Input
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomPick()}
                placeholder={t.dialog.comment.authorCustomPlaceholder}
                className="h-8 text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 shrink-0"
                onClick={handleCustomPick}
                disabled={!customInput.trim()}
              >
                {t.dialog.comment.authorCustom}
              </Button>
            </div>
          </div>
        )}
        <Textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t.dialog.comment.placeholder}
          className="min-h-24 resize-none"
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
