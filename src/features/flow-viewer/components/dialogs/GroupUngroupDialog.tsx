'use client';

import type { Node } from '@xyflow/react';

import { Button } from '@/components/ui/button';
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
          <DialogTitle>그룹 해제</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          해제된 그룹의 자식 노드들을 어떻게 처리할까요?
        </p>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={() => ungroup(true)}>부모 그룹에 남기기</Button>
          <Button variant="outline" onClick={() => ungroup(false)}>
            그룹 바깥으로 이동
          </Button>
          <Button variant="ghost" onClick={onClose}>
            취소
          </Button>
        </DialogFooter>
      </DialogContent>
    </BaseDialog>
  );
}
