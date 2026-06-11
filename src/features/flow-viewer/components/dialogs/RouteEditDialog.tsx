'use client';

import { useState } from 'react';

import type { Node } from '@xyflow/react';

import { Button } from '@/components/ui/button';
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

import { useT } from '@/hooks/useT';

import type { FlowNodeData } from '../../types';
import { BaseDialog } from './BaseDialog';

export function RouteEditDialog({
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
  const t = useT();
  const node = nodes.find((n) => n.id === nodeId);
  const nodeData = node?.data as FlowNodeData | undefined;
  const [route, setRoute] = useState(nodeData?.route ?? '');

  const confirm = () => {
    const trimmed = route.trim();
    if (!trimmed) return;
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId) return n;
        const data = n.data as FlowNodeData;
        const updatedLabel = data.label === data.route ? trimmed : data.label;
        return { ...n, data: { ...data, route: trimmed, label: updatedLabel } };
      }),
    );
    onClose();
  };

  return (
    <BaseDialog onClose={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t.dialog.routeEdit.title}</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          placeholder={t.dialog.routeEdit.placeholder}
          value={route}
          onChange={(e) => setRoute(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') confirm();
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t.dialog.cancel}
          </Button>
          <Button onClick={confirm} disabled={!route.trim()}>
            {t.dialog.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </BaseDialog>
  );
}
