'use client';

import { useState } from 'react';

import type { Node } from '@xyflow/react';

import { Button } from '@/components/ui/button';
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

import { cn } from '@/lib/utils';

import { GROUP_Z_INDEX } from '../../lib/layout';
import { GROUP_COLORS, GROUP_COLOR_STYLES } from '../../lib/nodeColors';
import {
  computeGroupBounds,
  getAbsolutePosition,
  recomputeGroupZIndexes,
} from '../../lib/nodeUtils';
import type { GroupNodeData } from '../../types';
import { BaseDialog } from './BaseDialog';

export function GroupCreateDialog({
  pendingNodes,
  nodes,
  setNodes,
  onClose,
}: {
  pendingNodes: Node[];
  nodes: Node[];
  setNodes: (fn: (prev: Node[]) => Node[]) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('gray');

  const confirm = () => {
    const trimmed = label.trim() || '그룹';
    const { x: absX, y: absY, width, height } = computeGroupBounds(pendingNodes, nodes);
    const groupId = `group-${Date.now()}`;
    const pendingIds = new Set(pendingNodes.map((n) => n.id));

    const parentIdSet = new Set(pendingNodes.map((n) => n.parentId ?? null));
    const commonParentId = parentIdSet.size === 1 ? ([...parentIdSet][0] as string | null) : null;

    let groupPosition: { x: number; y: number };
    if (commonParentId) {
      const parentNode = nodes.find((n) => n.id === commonParentId);
      const parentAbs = parentNode ? getAbsolutePosition(parentNode, nodes) : { x: 0, y: 0 };
      groupPosition = { x: absX - parentAbs.x, y: absY - parentAbs.y };
    } else {
      groupPosition = { x: absX, y: absY };
    }

    const groupNode: Node<GroupNodeData> = {
      id: groupId,
      type: 'groupNode',
      position: groupPosition,
      ...(commonParentId ? { parentId: commonParentId } : {}),
      style: { width, height },
      data: { label: trimmed, color },
      selectable: true,
      zIndex: GROUP_Z_INDEX,
    };

    setNodes((prev) => {
      const updated = prev.map((n) => {
        if (!pendingIds.has(n.id)) return n;
        const absPos = getAbsolutePosition(n, prev);
        return {
          ...n,
          parentId: groupId,
          extent: undefined,
          position: { x: absPos.x - absX, y: absPos.y - absY },
        };
      });
      // ReactFlow requires parent nodes to appear before their children in the array.
      // Insert the new group right after its parent; fall back to the front if no parent.
      let ordered: Node[];
      if (commonParentId) {
        const parentIdx = updated.findIndex((n) => n.id === commonParentId);
        ordered =
          parentIdx >= 0
            ? [...updated.slice(0, parentIdx + 1), groupNode, ...updated.slice(parentIdx + 1)]
            : [groupNode, ...updated];
      } else {
        ordered = [groupNode, ...updated];
      }
      return recomputeGroupZIndexes(ordered);
    });
    onClose();
  };

  return (
    <BaseDialog onClose={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>그룹 만들기</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            autoFocus
            placeholder="그룹 이름"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirm();
            }}
          />
          <div className="flex gap-2">
            {GROUP_COLORS.map(({ label: colorLabel, value: colorValue }) => {
              const s = GROUP_COLOR_STYLES[colorValue];
              return (
                <Button
                  key={colorValue}
                  variant="ghost"
                  size="icon"
                  title={colorLabel}
                  onClick={() => setColor(colorValue)}
                  className={cn(
                    'h-6 w-6 rounded-full border-2 p-0 transition-transform',
                    s.button,
                    color === colorValue ? 'scale-125 border-white' : 'border-transparent',
                  )}
                />
              );
            })}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={confirm}>만들기</Button>
        </DialogFooter>
      </DialogContent>
    </BaseDialog>
  );
}
