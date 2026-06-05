'use client';

import { useState } from 'react';

import type { Node } from '@xyflow/react';

import { Button } from '@/components/ui/button';
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

import { cn } from '@/lib/utils';

import { useT } from '@/hooks/useT';

import { GROUP_COLORS, GROUP_COLOR_STYLES } from '../../lib/nodeColors';
import type { GroupNodeData } from '../../types';
import { BaseDialog } from './BaseDialog';

export function GroupEditDialog({
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
  const data = node?.data as GroupNodeData | undefined;
  const [label, setLabel] = useState(data?.label ?? '');
  const [color, setColor] = useState(data?.color ?? 'gray');
  const t = useT();

  const save = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, data: { label: trimmed, color } } : n)),
    );
    onClose();
  };

  return (
    <BaseDialog onClose={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t.dialog.groupEdit.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
            }}
          />
          <div className="flex gap-2">
            {GROUP_COLORS.map(({ value: colorValue }) => {
              const colorKey = colorValue as keyof typeof t.nodeColors.group;
              const colorLabel = t.nodeColors.group[colorKey] ?? colorValue;
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
            {t.dialog.cancel}
          </Button>
          <Button onClick={save}>{t.dialog.save}</Button>
        </DialogFooter>
      </DialogContent>
    </BaseDialog>
  );
}
