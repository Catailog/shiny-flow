'use client';

import { useEffect, useRef, useState } from 'react';

import { useSession } from 'next-auth/react';

import type { Node } from '@xyflow/react';

import { Button } from '@/components/ui/button';
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { useAuthorPreference } from '@/hooks/useAuthorPreference';
import { useCloudAuthorName } from '@/hooks/useCloudAuthorName';
import { useT } from '@/hooks/useT';

import type { CommentNodeData } from '../FlowCommentNode';
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
  const existing = node?.data as CommentNodeData | undefined;

  const [value, setValue] = useState(existing?.content ?? '');
  const t = useT();
  const { data: session } = useSession();

  const { authorId, authorName, options, setName } = useAuthorPreference();

  const isCloudMode = !!session?.user;
  const isCloudComment = !!existing?.accountId;
  const sessionAuthorName = session?.user?.name ?? session?.user?.email ?? '';
  const fetchedAuthorName = useCloudAuthorName(existing?.accountId);
  // 클라우드 댓글: 서버에서 최신 이름 조회. 로딩 중에는 스냅샷 표시
  const cloudAuthorName = isCloudComment
    ? (fetchedAuthorName ?? existing?.author ?? sessionAuthorName)
    : sessionAuthorName;

  const [pendingName, setPendingName] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  // 클라우드 댓글: 저장된 author 그대로 표시
  // 로컬 댓글(또는 신규): pendingName > 저장된 author > 로컬 기본값(or 클라우드 계정명)
  const displayName = isCloudComment
    ? (existing?.author ?? cloudAuthorName)
    : (pendingName ?? existing?.author ?? (isCloudMode ? cloudAuthorName : authorName));

  // 클라우드 댓글(accountId 있음)은 수정 불가, 로컬 댓글은 클라우드 모드에서도 수정 가능
  const canEditAuthor = !isCloudComment && (!isCloudMode || !!existing?.content?.trim());

  useEffect(() => {
    if (editing) nameInputRef.current?.focus();
  }, [editing]);

  const startEditing = () => {
    setNameInput(displayName ?? '');
    setEditing(true);
  };

  const confirmName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setPendingName(trimmed);
    setName(trimmed);
    setEditing(false);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const pickSuggestion = (name: string) => {
    setNameInput(name);
    setPendingName(name);
    setName(name);
    setEditing(false);
  };

  const timeRef = existing?.updatedAt ?? existing?.createdAt;

  const save = () => {
    const now = new Date().toISOString();
    const wasNonEmpty = !!existing?.content?.trim();

    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId) return n;

        const isFirstWrite = !wasNonEmpty && !!value.trim();
        return {
          ...n,
          data: {
            ...n.data,
            content: value,
            ...(isFirstWrite &&
              isCloudMode && {
                author: cloudAuthorName,
                accountId: session?.user?.id,
                createdAt: now,
              }),
            ...(isFirstWrite &&
              !isCloudMode && {
                author: displayName ?? undefined,
                authorId: authorId || undefined,
                isLocal: true as const,
                createdAt: now,
              }),
            // 로컬 댓글 편집 시 이름을 변경했으면 이 댓글의 author만 갱신
            ...(wasNonEmpty && !isCloudComment && pendingName && { author: pendingName }),
            updatedAt: wasNonEmpty ? now : undefined,
          },
        };
      }),
    );
    onClose();
  };

  // 클라우드 모드에서는 로컬 사용자명/기기명 제안 숨김
  const showSuggestions = editing && !isCloudMode && (options.author || options.device);

  return (
    <BaseDialog onClose={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t.dialog.comment.title}</DialogTitle>
          {timeRef && (
            <p className="text-xs text-muted-foreground">
              {formatExact(timeRef, t.dateLocale)}
              {existing?.updatedAt && ' ' + t.dialog.comment.edited}
            </p>
          )}
        </DialogHeader>

        {/* 작성자 영역 */}
        <div className="space-y-1.5">
          {!editing ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{t.dialog.comment.authorLabel}</span>
              <span
                title={!isCloudComment ? authorId || undefined : undefined}
                className={
                  displayName
                    ? 'cursor-default text-sm font-medium'
                    : 'text-sm text-muted-foreground'
                }
              >
                {displayName ?? t.dialog.comment.authorUnset}
              </span>
              {canEditAuthor && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-6 px-2 text-xs"
                  onClick={startEditing}
                >
                  {t.dialog.comment.authorChange}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex gap-1.5">
                <Input
                  ref={nameInputRef}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmName();
                    if (e.key === 'Escape') cancelEditing();
                  }}
                  placeholder={t.dialog.comment.authorCustomPlaceholder}
                  className="h-8 text-sm"
                />
                <Button
                  size="sm"
                  variant="default"
                  className="h-8 shrink-0"
                  onClick={confirmName}
                  disabled={!nameInput.trim()}
                >
                  {t.dialog.comment.authorConfirm}
                </Button>
                <Button size="sm" variant="ghost" className="h-8 shrink-0" onClick={cancelEditing}>
                  {t.dialog.cancel}
                </Button>
              </div>
              {showSuggestions && (
                <div className="flex gap-1.5">
                  {options.author && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-auto flex-1 flex-col items-start gap-0 py-1"
                      onClick={() => pickSuggestion(options.author!)}
                    >
                      <span className="text-xs text-muted-foreground">
                        {t.dialog.comment.authorUsername}
                      </span>
                      <span className="text-sm">{options.author}</span>
                    </Button>
                  )}
                  {options.device && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-auto flex-1 flex-col items-start gap-0 py-1"
                      onClick={() => pickSuggestion(options.device!)}
                    >
                      <span className="text-xs text-muted-foreground">
                        {t.dialog.comment.authorDevice}
                      </span>
                      <span className="text-sm">{options.device}</span>
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

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
