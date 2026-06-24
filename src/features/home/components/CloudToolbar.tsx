'use client';

import { useSession } from 'next-auth/react';

import {
  CheckIcon,
  CloudUploadIcon,
  FolderOpenIcon,
  Loader2Icon,
  PencilIcon,
  Share2Icon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { cn } from '@/lib/utils';

import { useT } from '@/hooks/useT';

import { FLOW_NAME_MAX_LENGTH } from '@/constants/flow';

import type { CloudFlowActions, CloudFlowState } from '../hooks/useCloudFlow';

type Props = {
  hasFlow: boolean;
  state: CloudFlowState;
  actions: CloudFlowActions;
  isAnalyzing?: boolean;
};

export function CloudToolbar({ hasFlow, state, actions, isAnalyzing }: Props) {
  const { data: session } = useSession();
  const {
    cloudFlowId,
    myFlowsOpen,
    flowsList,
    busyAction,
    shareCopied,
    rowBusy,
    copiedFlowId,
    confirmDeleteId,
    editingNameId,
    editingNameValue,
  } = state;

  const {
    setMyFlowsOpen,
    setConfirmDeleteId,
    setEditingNameId,
    setEditingNameValue,
    handleCloudSave,
    handleOpenMyFlows,
    handleShare,
    handleShareFlow,
    handleDeleteFlow,
    handleStartRename,
    handleRenameConfirm,
  } = actions;

  const isLoggedIn = !!session?.user;
  const t = useT();

  const saveDisabledTip = !hasFlow
    ? t.cloud.noGraph
    : !isLoggedIn
      ? t.cloud.loginRequired
      : undefined;

  const myFlowsDisabledTip = isAnalyzing
    ? t.home.analyzeDisabled
    : !isLoggedIn
      ? t.cloud.loginRequired
      : undefined;

  const shareDisabledTip = isAnalyzing
    ? t.home.analyzeDisabled
    : !isLoggedIn
      ? t.cloud.loginRequired
      : !cloudFlowId
        ? t.cloud.saveFirst
        : undefined;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {/* save */}
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
                  {t.cloud.save}
                </Button>
              </span>
            }
          />
          {saveDisabledTip && <TooltipContent>{saveDisabledTip}</TooltipContent>}
        </Tooltip>

        {/* my flows */}
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
                  {t.cloud.myFlows}
                </Button>
              </span>
            }
          />
          {myFlowsDisabledTip && <TooltipContent>{myFlowsDisabledTip}</TooltipContent>}
        </Tooltip>

        {/* share */}
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
                  {shareCopied ? t.cloud.copied : t.cloud.share}
                </Button>
              </span>
            }
          />
          <TooltipContent>
            {shareDisabledTip ?? (busyAction === 'share' ? t.cloud.serverSaving : t.cloud.copyLink)}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* my flows dialog */}
      <Dialog
        open={myFlowsOpen}
        onOpenChange={(open) => {
          setMyFlowsOpen(open);
          if (!open) {
            setConfirmDeleteId(null);
            setEditingNameId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.cloud.myFlows}</DialogTitle>
          </DialogHeader>
          {flowsList.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{t.cloud.noFlows}</p>
          ) : (
            <ul className="flex min-w-0 flex-col gap-1">
              {flowsList.map((f) => {
                const isRowBusy = rowBusy?.id === f.id;
                const isCopied = copiedFlowId === f.id;
                const isConfirming = confirmDeleteId === f.id;
                const isEditing = editingNameId === f.id;
                const isActive = f.id === cloudFlowId;
                return (
                  <li
                    key={f.id}
                    className={cn(
                      'flex items-center gap-1 overflow-hidden rounded-md',
                      isActive && 'bg-accent/60',
                    )}
                  >
                    {isEditing ? (
                      <>
                        <Input
                          className="h-8 flex-1 text-sm"
                          value={editingNameValue}
                          maxLength={FLOW_NAME_MAX_LENGTH}
                          onChange={(e) => setEditingNameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameConfirm(f.id);
                            if (e.key === 'Escape') setEditingNameId(null);
                          }}
                          autoFocus
                        />
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          {editingNameValue.length}/{FLOW_NAME_MAX_LENGTH}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={!editingNameValue.trim() || isRowBusy}
                          onClick={() => handleRenameConfirm(f.id)}
                        >
                          {isRowBusy && rowBusy?.action === 'rename' ? (
                            <Loader2Icon size={13} className="animate-spin" />
                          ) : (
                            <CheckIcon size={13} />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={isRowBusy}
                          onClick={() => setEditingNameId(null)}
                        >
                          <XIcon size={13} />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <span className="inline-flex min-w-0 flex-1">
                                <Button
                                  variant="ghost"
                                  className="h-auto min-w-0 flex-1 justify-between px-3 py-2 text-sm font-normal"
                                  onClick={() => actions.handleLoadFlow(f.id, f.name)}
                                  disabled={!!rowBusy || busyAction === 'myFlows' || isConfirming}
                                >
                                  <span className="flex min-w-0 items-center gap-1.5">
                                    {isActive ? (
                                      <CheckIcon size={13} className="shrink-0 text-primary" />
                                    ) : (
                                      <span className="w-[13px] shrink-0" />
                                    )}
                                    <span className="truncate">{f.name}</span>
                                  </span>
                                  <span className="shrink-0 text-xs text-muted-foreground">
                                    {new Date(f.updatedAt).toLocaleString(t.dateLocale, {
                                      dateStyle: 'short',
                                      timeStyle: 'medium',
                                      hour12: false,
                                    })}
                                  </span>
                                </Button>
                              </span>
                            }
                          />
                          <TooltipContent>{f.name}</TooltipContent>
                        </Tooltip>

                        {isConfirming ? (
                          <>
                            <span className="text-xs text-destructive">
                              {t.cloud.confirmDelete}
                            </span>
                            <Button
                              variant="destructive"
                              size="xs"
                              disabled={isRowBusy}
                              onClick={() => handleDeleteFlow(f.id)}
                            >
                              {isRowBusy ? (
                                <Loader2Icon size={12} className="animate-spin" />
                              ) : (
                                t.cloud.delete
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              {t.cloud.cancel}
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
                                      onClick={() => handleStartRename(f.id, f.name)}
                                    >
                                      <PencilIcon size={13} />
                                    </Button>
                                  </span>
                                }
                              />
                              <TooltipContent>{t.cloud.rename}</TooltipContent>
                            </Tooltip>
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
                                  ? t.cloud.serverSaving
                                  : isCopied
                                    ? t.cloud.copied
                                    : t.cloud.copyShareLink}
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
                              <TooltipContent>{t.cloud.delete}</TooltipContent>
                            </Tooltip>
                          </>
                        )}
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
