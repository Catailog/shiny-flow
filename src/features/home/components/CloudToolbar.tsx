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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { cn } from '@/lib/utils';

import { useT } from '@/hooks/useT';

import type { CloudFlowActions, CloudFlowState } from '../hooks/useCloudFlow';

type Props = {
  hasFlow: boolean;
  state: CloudFlowState;
  actions: CloudFlowActions;
};

export function CloudToolbar({ hasFlow, state, actions }: Props) {
  const { data: session } = useSession();
  const {
    cloudFlowId,
    cloudFlowName,
    saveDialogOpen,
    saveNameInput,
    duplicateConflict,
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
    setSaveNameInput,
    setMyFlowsOpen,
    setConfirmDeleteId,
    setEditingNameId,
    setEditingNameValue,
    handleCloudSave,
    handleCloseSaveDialog,
    handleSaveConfirm,
    handleSaveOverwrite,
    handleSaveDuplicate,
    handleSaveRename,
    handleOpenMyFlows,
    handleLoadFlow,
    handleShare,
    handleShareFlow,
    handleDeleteFlow,
    handleStartRename,
    handleRenameConfirm,
  } = actions;

  const isLoggedIn = !!session?.user;
  const t = useT();
  const isSaveBusy =
    busyAction === 'save' || busyAction === 'overwrite' || busyAction === 'duplicate';

  const saveDisabledTip = !hasFlow
    ? t.cloud.noGraph
    : !isLoggedIn
      ? t.cloud.loginRequired
      : undefined;

  const myFlowsDisabledTip = !isLoggedIn ? t.cloud.loginRequired : undefined;

  const shareDisabledTip = !isLoggedIn
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
                  disabled={!!saveDisabledTip || isSaveBusy}
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

      {/* save name dialog */}
      <Dialog
        open={saveDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseSaveDialog();
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t.cloud.saveFlow}</DialogTitle>
          </DialogHeader>
          <Input
            value={saveNameInput}
            onChange={(e) => setSaveNameInput(e.target.value)}
            placeholder={t.cloud.flowName}
            onKeyDown={(e) => !duplicateConflict && e.key === 'Enter' && handleSaveConfirm()}
            disabled={!!duplicateConflict || busyAction === 'save'}
            autoFocus={!duplicateConflict}
          />
          {duplicateConflict && (
            <p className="text-sm text-destructive">
              {t.cloud.duplicateConflict(duplicateConflict.targetName)}
            </p>
          )}
          <DialogFooter>
            {duplicateConflict ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSaveBusy}
                  onClick={handleSaveRename}
                >
                  {t.cloud.reenterName}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isSaveBusy}
                  onClick={handleSaveOverwrite}
                >
                  {busyAction === 'overwrite' && <Loader2Icon size={14} className="animate-spin" />}
                  {t.cloud.overwrite}
                </Button>
                <Button size="sm" disabled={isSaveBusy} onClick={handleSaveDuplicate}>
                  {busyAction === 'duplicate' && <Loader2Icon size={14} className="animate-spin" />}
                  {t.cloud.saveAsCopy}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={handleCloseSaveDialog}>
                  {t.cloud.cancel}
                </Button>
                <Button
                  size="sm"
                  disabled={!saveNameInput.trim() || isSaveBusy}
                  onClick={handleSaveConfirm}
                >
                  {busyAction === 'save' && <Loader2Icon size={14} className="animate-spin" />}
                  {t.cloud.save}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <ul className="flex flex-col gap-1">
              {flowsList.map((f) => {
                const isRowBusy = rowBusy?.id === f.id;
                const isCopied = copiedFlowId === f.id;
                const isConfirming = confirmDeleteId === f.id;
                const isEditing = editingNameId === f.id;
                const isActive = f.id === cloudFlowId;
                return (
                  <li
                    key={f.id}
                    className={cn('flex items-center gap-1 rounded-md', isActive && 'bg-accent/60')}
                  >
                    {isEditing ? (
                      <>
                        <Input
                          className="h-8 flex-1 text-sm"
                          value={editingNameValue}
                          onChange={(e) => setEditingNameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameConfirm(f.id);
                            if (e.key === 'Escape') setEditingNameId(null);
                          }}
                          autoFocus
                        />
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
                        <Button
                          variant="ghost"
                          className="h-auto flex-1 justify-between px-3 py-2 text-sm font-normal"
                          onClick={() => handleLoadFlow(f.id, f.name)}
                          disabled={!!rowBusy || busyAction === 'myFlows' || isConfirming}
                        >
                          <span className="flex items-center gap-1.5">
                            {isActive ? (
                              <CheckIcon size={13} className="shrink-0 text-primary" />
                            ) : (
                              <span className="w-[13px] shrink-0" />
                            )}
                            {f.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(f.updatedAt).toLocaleString(t.dateLocale, {
                              dateStyle: 'short',
                              timeStyle: 'medium',
                              hour12: false,
                            })}
                          </span>
                        </Button>

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
