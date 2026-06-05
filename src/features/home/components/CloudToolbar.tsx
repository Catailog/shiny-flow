'use client';

import type { Session } from 'next-auth';
import { signIn, signOut } from 'next-auth/react';

import {
  CheckIcon,
  CloudUploadIcon,
  FolderOpenIcon,
  Loader2Icon,
  LogOutIcon,
  Share2Icon,
  Trash2Icon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import type { CloudFlowActions, CloudFlowState } from '../hooks/useCloudFlow';

type Props = {
  hasFlow: boolean;
  session: Session | null;
  state: CloudFlowState;
  actions: CloudFlowActions;
};

export function CloudToolbar({ hasFlow, session, state, actions }: Props) {
  const {
    cloudFlowId,
    cloudFlowName,
    saveDialogOpen,
    saveNameInput,
    myFlowsOpen,
    flowsList,
    busyAction,
    shareCopied,
    rowBusy,
    copiedFlowId,
    confirmDeleteId,
  } = state;

  const {
    setSaveDialogOpen,
    setSaveNameInput,
    setMyFlowsOpen,
    setConfirmDeleteId,
    handleCloudSave,
    handleSaveConfirm,
    handleOpenMyFlows,
    handleLoadFlow,
    handleShare,
    handleShareFlow,
    handleDeleteFlow,
  } = actions;

  const isLoggedIn = !!session?.user;

  const saveDisabledTip = !hasFlow
    ? '분석된 그래프가 없습니다.'
    : !isLoggedIn
      ? '로그인이 필요합니다.'
      : undefined;

  const myFlowsDisabledTip = !isLoggedIn ? '로그인이 필요합니다.' : undefined;

  const shareDisabledTip = !isLoggedIn
    ? '로그인이 필요합니다.'
    : !cloudFlowId
      ? '먼저 저장해야 공유할 수 있습니다.'
      : undefined;

  return (
    <>
      <div className="flex items-center gap-2">
        {/* 저장 */}
        <Tooltip>
          <TooltipTrigger
            render={
              <span className={saveDisabledTip ? 'inline-flex cursor-not-allowed' : 'inline-flex'}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!!saveDisabledTip || busyAction === 'save'}
                  onClick={handleCloudSave}
                >
                  {busyAction === 'save' ? (
                    <Loader2Icon size={14} className="animate-spin" />
                  ) : (
                    <CloudUploadIcon size={14} />
                  )}
                  저장
                </Button>
              </span>
            }
          />
          {saveDisabledTip && <TooltipContent>{saveDisabledTip}</TooltipContent>}
        </Tooltip>

        {/* 내 플로우 */}
        <Tooltip>
          <TooltipTrigger
            render={
              <span
                className={myFlowsDisabledTip ? 'inline-flex cursor-not-allowed' : 'inline-flex'}
              >
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!!myFlowsDisabledTip || busyAction === 'myFlows'}
                  onClick={handleOpenMyFlows}
                >
                  {busyAction === 'myFlows' ? (
                    <Loader2Icon size={14} className="animate-spin" />
                  ) : (
                    <FolderOpenIcon size={14} />
                  )}
                  내 플로우
                </Button>
              </span>
            }
          />
          {myFlowsDisabledTip && <TooltipContent>{myFlowsDisabledTip}</TooltipContent>}
        </Tooltip>

        {/* 공유 */}
        <Tooltip>
          <TooltipTrigger
            render={
              <span className={shareDisabledTip ? 'inline-flex cursor-not-allowed' : 'inline-flex'}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!!shareDisabledTip || busyAction === 'share'}
                  onClick={handleShare}
                >
                  {busyAction === 'share' ? (
                    <Loader2Icon size={14} className="animate-spin" />
                  ) : shareCopied ? (
                    <CheckIcon size={14} />
                  ) : (
                    <Share2Icon size={14} />
                  )}
                  {busyAction === 'share' ? '생성 중...' : shareCopied ? '복사됨' : '공유'}
                </Button>
              </span>
            }
          />
          <TooltipContent>
            {shareDisabledTip ??
              (busyAction === 'share' ? '공유 링크를 서버에 저장하는 중입니다.' : '링크 복사')}
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {isLoggedIn ? (
          <>
            <span className="text-xs text-muted-foreground">{session.user.name}</span>
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="inline-flex">
                    <Button variant="ghost" size="icon" onClick={() => signOut()}>
                      <LogOutIcon size={15} />
                    </Button>
                  </span>
                }
              />
              <TooltipContent>로그아웃</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={() => signIn('github')}>
            GitHub 로그인
          </Button>
        )}
      </div>

      {/* 저장 이름 입력 다이얼로그 */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>플로우 저장</DialogTitle>
          </DialogHeader>
          <Input
            value={saveNameInput}
            onChange={(e) => setSaveNameInput(e.target.value)}
            placeholder="플로우 이름"
            onKeyDown={(e) => e.key === 'Enter' && handleSaveConfirm()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSaveDialogOpen(false)}>
              취소
            </Button>
            <Button
              size="sm"
              disabled={!saveNameInput.trim() || busyAction === 'save'}
              onClick={handleSaveConfirm}
            >
              {busyAction === 'save' && <Loader2Icon size={14} className="animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 내 플로우 목록 다이얼로그 */}
      <Dialog
        open={myFlowsOpen}
        onOpenChange={(open) => {
          setMyFlowsOpen(open);
          if (!open) setConfirmDeleteId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>내 플로우</DialogTitle>
          </DialogHeader>
          {flowsList.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              저장된 플로우가 없습니다.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {flowsList.map((f) => {
                const isRowBusy = rowBusy?.id === f.id;
                const isCopied = copiedFlowId === f.id;
                const isConfirming = confirmDeleteId === f.id;
                return (
                  <li key={f.id} className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      className="h-auto flex-1 justify-between px-3 py-2 text-sm font-normal"
                      onClick={() => handleLoadFlow(f.id, f.name)}
                      disabled={!!rowBusy || busyAction === 'myFlows' || isConfirming}
                    >
                      <span>{f.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(f.updatedAt).toLocaleString('ko-KR', {
                          dateStyle: 'short',
                          timeStyle: 'medium',
                          hour12: false,
                        })}
                      </span>
                    </Button>

                    {isConfirming ? (
                      <>
                        <span className="text-xs text-destructive">삭제할까요?</span>
                        <Button
                          variant="destructive"
                          size="xs"
                          disabled={isRowBusy}
                          onClick={() => handleDeleteFlow(f.id)}
                        >
                          {isRowBusy ? <Loader2Icon size={12} className="animate-spin" /> : '삭제'}
                        </Button>
                        <Button variant="ghost" size="xs" onClick={() => setConfirmDeleteId(null)}>
                          취소
                        </Button>
                      </>
                    ) : (
                      <>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <span className="inline-flex">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  disabled={!!rowBusy || busyAction === 'myFlows'}
                                  onClick={() => handleShareFlow(f.id)}
                                >
                                  {isRowBusy && rowBusy?.action === 'share' ? (
                                    <Loader2Icon size={13} className="animate-spin" />
                                  ) : isCopied ? (
                                    <CheckIcon size={13} />
                                  ) : (
                                    <Share2Icon size={13} />
                                  )}
                                </Button>
                              </span>
                            }
                          />
                          <TooltipContent>
                            {isRowBusy && rowBusy?.action === 'share'
                              ? '공유 링크를 서버에 저장하는 중입니다.'
                              : isCopied
                                ? '복사됨'
                                : '공유 링크 복사'}
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <span className="inline-flex">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  disabled={!!rowBusy || busyAction === 'myFlows'}
                                  onClick={() => setConfirmDeleteId(f.id)}
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2Icon size={13} />
                                </Button>
                              </span>
                            }
                          />
                          <TooltipContent>삭제</TooltipContent>
                        </Tooltip>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
