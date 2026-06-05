'use client';

import type { Node } from '@xyflow/react';

import { Button } from '@/components/ui/button';
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { useT } from '@/hooks/useT';

import { getAbsolutePosition, recomputeGroupZIndexes } from '../../lib/nodeUtils';
import { BaseDialog } from './BaseDialog';

export function GroupUngroupDialog({
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
  const group = nodes.find((n) => n.id === nodeId);
  const parentGroupId = group?.parentId ?? null;
  const t = useT();

  const ungroup = (keepInParent: boolean) => {
    setNodes((prev) => {
      const result = prev
        .filter((n) => n.id !== nodeId)
        .map((n) => {
          if (n.parentId !== nodeId) return n;
          const absPos = getAbsolutePosition(n, prev);
          if (keepInParent && parentGroupId) {
            const parentGroup = prev.find((p) => p.id === parentGroupId);
            const parentAbs = parentGroup ? getAbsolutePosition(parentGroup, prev) : { x: 0, y: 0 };
            return {
              ...n,
              parentId: parentGroupId,
              extent: undefined,
              position: { x: absPos.x - parentAbs.x, y: absPos.y - parentAbs.y },
            };
          }
          return { ...n, parentId: undefined, extent: undefined, position: absPos };
        });
      return recomputeGroupZIndexes(result);
    });
    onClose();
  };

  return (
    <BaseDialog onClose={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t.dialog.groupUngroup.title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t.dialog.groupUngroup.description}</p>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={() => ungroup(true)}>{t.dialog.groupUngroup.keepInParent}</Button>
          <Button variant="outline" onClick={() => ungroup(false)}>
            {t.dialog.groupUngroup.moveOut}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t.dialog.cancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </BaseDialog>
  );
}
