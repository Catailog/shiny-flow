'use client';

import { useState } from 'react';

import Image from 'next/image';

import { type Edge, type Node } from '@xyflow/react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { cn } from '@/lib/utils';

import { GROUP_Z_INDEX, NODE_WIDTH } from '../lib/layout';
import { GROUP_COLORS, GROUP_COLOR_STYLES } from '../lib/nodeColors';
import type { DialogRequest, FlowNodeData, GroupNodeData } from '../types';
import { MemoEditor } from './MemoEditor';

// --- helpers ---

function computeGroupBounds(selected: Node[], padding = 48) {
  const minX = Math.min(...selected.map((n) => n.position.x)) - padding;
  const minY = Math.min(...selected.map((n) => n.position.y)) - padding;
  const maxX =
    Math.max(...selected.map((n) => n.position.x + (n.measured?.width ?? NODE_WIDTH))) + padding;
  const maxY =
    Math.max(...selected.map((n) => n.position.y + (n.measured?.height ?? 100))) + padding;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// --- dialog sub-components ---

function ScreenshotDialog({
  src,
  label,
  onClose,
}: {
  src: string;
  label: string;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-h-[90vh] w-auto max-w-[90vw] gap-0 overflow-hidden p-0 sm:max-w-[90vw]"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{label} 스크린샷</DialogTitle>
        <Image
          src={src}
          alt={label}
          width={1280}
          height={0}
          style={{ height: 'auto', maxHeight: '90vh', maxWidth: '90vw', width: 'auto' }}
          className="block rounded-lg object-contain"
          unoptimized
        />
      </DialogContent>
    </Dialog>
  );
}

function MemoDialog({
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
  const [value, setValue] = useState((node?.data as FlowNodeData | undefined)?.memo ?? '');

  const save = () => {
    const isEmpty = value === '' || value === '<p></p>';
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, memo: isEmpty ? undefined : value } } : n,
      ),
    );
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>메모</DialogTitle>
        </DialogHeader>
        <MemoEditor value={value} onChange={setValue} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={save}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatExact(isoString: string): string {
  return new Date(isoString).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function CommentNodeDialog({
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
    | { content?: string; author?: string; createdAt?: string; updatedAt?: string }
    | undefined;
  const [value, setValue] = useState(existing?.content ?? '');

  const timeRef = existing?.updatedAt ?? existing?.createdAt;

  const save = () => {
    const now = new Date().toISOString();
    const wasNonEmpty = !!existing?.content?.trim();
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId) return n;
        return {
          ...n,
          data: {
            ...n.data,
            content: value,
            updatedAt: wasNonEmpty ? now : undefined,
          },
        };
      }),
    );
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>댓글</DialogTitle>
          {(existing?.author || timeRef) && (
            <p className="text-xs text-muted-foreground">
              {existing?.author}
              {existing?.author && timeRef && ' · '}
              {timeRef && formatExact(timeRef)}
              {existing?.updatedAt && ' (수정됨)'}
            </p>
          )}
        </DialogHeader>
        <Textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="댓글을 입력하세요..."
          className="min-h-24 resize-none"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={save}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GroupRenameDialog({
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
  const [value, setValue] = useState((node?.data as GroupNodeData | undefined)?.label ?? '');

  const save = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, label: trimmed } } : n)),
    );
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>그룹 이름 변경</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={save}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EdgeCommentDialog({
  edgeId,
  edges,
  setEdges,
  onClose,
}: {
  edgeId: string;
  edges: Edge[];
  setEdges: (fn: (prev: Edge[]) => Edge[]) => void;
  onClose: () => void;
}) {
  const edge = edges.find((e) => e.id === edgeId);
  const [value, setValue] = useState(
    (edge?.data as { comment?: string } | undefined)?.comment ?? '',
  );

  const save = () => {
    const trimmed = value.trim();
    setEdges((prev) =>
      prev.map((e) => (e.id === edgeId ? { ...e, data: { comment: trimmed || undefined } } : e)),
    );
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>엣지 코멘트</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="코멘트..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={save}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GroupCreateDialog({
  pendingNodes,
  setNodes,
  onClose,
}: {
  pendingNodes: Node[];
  setNodes: (fn: (prev: Node[]) => Node[]) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('gray');

  const confirm = () => {
    const trimmed = label.trim() || '그룹';
    const { x, y, width, height } = computeGroupBounds(pendingNodes);
    const groupId = `group-${Date.now()}`;
    const pendingIds = new Set(pendingNodes.map((n) => n.id));

    const groupNode: Node<GroupNodeData> = {
      id: groupId,
      type: 'groupNode',
      position: { x, y },
      style: { width, height },
      data: { label: trimmed, color },
      selectable: true,
      zIndex: GROUP_Z_INDEX,
    };

    setNodes((prev) => {
      const updated = prev.map((n) => {
        if (!pendingIds.has(n.id)) return n;
        return {
          ...n,
          parentId: groupId,
          extent: undefined,
          position: { x: n.position.x - x, y: n.position.y - y },
        };
      });
      return [groupNode, ...updated];
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
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
                    s.bg.replace('/70', ''),
                    color === colorValue ? `${s.border} scale-125` : 'border-gray-300',
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
    </Dialog>
  );
}

function NodeCreateDialog({
  pos,
  setNodes,
  onClose,
}: {
  pos: { x: number; y: number };
  setNodes: (fn: (prev: Node[]) => Node[]) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState('');

  const confirm = () => {
    const trimmed = label.trim() || '새 페이지';
    setNodes((prev) => [
      ...prev,
      {
        id: `node-${Date.now()}`,
        type: 'flowNode',
        position: pos,
        data: { label: trimmed, route: trimmed, isDeadEnd: false },
      },
    ]);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>노드 생성</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          placeholder="페이지 이름"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') confirm();
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={confirm}>만들기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- main renderer ---

type Props = {
  dialogRequest: DialogRequest | null;
  nodes: Node[];
  setNodes: (fn: (prev: Node[]) => Node[]) => void;
  edges: Edge[];
  setEdges: (fn: (prev: Edge[]) => Edge[]) => void;
  onClose: () => void;
};

export function DialogRenderer({
  dialogRequest,
  nodes,
  setNodes,
  edges,
  setEdges,
  onClose,
}: Props) {
  if (!dialogRequest) return null;

  switch (dialogRequest.type) {
    case 'screenshot':
      return (
        <ScreenshotDialog src={dialogRequest.src} label={dialogRequest.label} onClose={onClose} />
      );
    case 'memo':
      return (
        <MemoDialog
          nodeId={dialogRequest.nodeId}
          nodes={nodes}
          setNodes={setNodes}
          onClose={onClose}
        />
      );
    case 'comment':
      return (
        <CommentNodeDialog
          nodeId={dialogRequest.nodeId}
          nodes={nodes}
          setNodes={setNodes}
          onClose={onClose}
        />
      );
    case 'groupRename':
      return (
        <GroupRenameDialog
          nodeId={dialogRequest.nodeId}
          nodes={nodes}
          setNodes={setNodes}
          onClose={onClose}
        />
      );
    case 'edgeComment':
      return (
        <EdgeCommentDialog
          edgeId={dialogRequest.edgeId}
          edges={edges}
          setEdges={setEdges}
          onClose={onClose}
        />
      );
    case 'groupCreate':
      return (
        <GroupCreateDialog
          pendingNodes={dialogRequest.nodes}
          setNodes={setNodes}
          onClose={onClose}
        />
      );
    case 'nodeCreate':
      return <NodeCreateDialog pos={dialogRequest.pos} setNodes={setNodes} onClose={onClose} />;
  }
}
