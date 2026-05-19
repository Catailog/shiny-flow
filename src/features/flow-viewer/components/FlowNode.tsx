'use client';

import { Handle, type Node, type NodeProps, NodeToolbar, Position } from '@xyflow/react';
import { ChevronRightIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

import { useFlowActions } from '../actionsContext';
import { useCollapseContext } from '../collapseContext';
import { NODE_COLOR_STYLES } from '../lib/nodeColors';

export type FlowNodeData = {
  label: string;
  route: string;
  isDeadEnd: boolean;
  screenshot?: string;
  color?: string;
  memo?: string;
};

type Props = NodeProps<Node<FlowNodeData>>;

export function FlowNode({ id, data }: Props) {
  const { openDialog } = useFlowActions();
  const { collapsedIds, hasChildren, hiddenCount } = useCollapseContext();
  const isCollapsed = collapsedIds.has(id);
  const canCollapse = hasChildren(id);
  const hiddenChildCount = hiddenCount(id);

  const src = data.screenshot ? `data:image/png;base64,${data.screenshot}` : null;
  const colorStyle = data.color ? NODE_COLOR_STYLES[data.color] : null;

  return (
    <>
      <NodeToolbar position={Position.Top} align="start" isVisible offset={6}>
        <span className="cursor-default text-sm font-medium text-brand-dark select-none">
          {data.route}
        </span>
      </NodeToolbar>

      <div
        className={cn(
          'group flex w-[280px] flex-col overflow-hidden rounded-lg shadow-sm',
          colorStyle
            ? `border-2 ${colorStyle.border} ${colorStyle.bg}`
            : `border ${data.isDeadEnd ? 'border-brand-accent/60 bg-brand-accent/10' : 'border-brand-secondary bg-brand-light'}`,
        )}
      >
        {src && (
          <img
            src={src}
            alt={data.label}
            className="block w-full cursor-zoom-in border-b border-inherit"
            onDoubleClick={(e) => {
              e.stopPropagation();
              openDialog({ type: 'screenshot', src, label: data.label });
            }}
          />
        )}
        {!src && (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">스크린샷 없음</div>
        )}

        {data.memo && (
          <div
            className="prose prose-xs max-w-none cursor-text border-t border-inherit px-3 py-2 text-xs text-muted-foreground [&_em]:italic [&_li>p]:my-0 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-0.5 [&_strong]:font-semibold [&_u]:underline [&_ul]:list-disc [&_ul]:pl-5"
            onDoubleClick={(e) => {
              e.stopPropagation();
              openDialog({ type: 'memo', nodeId: id });
            }}
            // TipTap이 생성한 HTML — 사용자 로컬 데이터이므로 안전
            dangerouslySetInnerHTML={{ __html: data.memo }}
          />
        )}

        {isCollapsed && (
          <div className="flex items-center gap-1 border-t border-inherit px-3 py-1.5 text-xs text-muted-foreground">
            <ChevronRightIcon size={11} />
            {hiddenChildCount > 0 ? `${hiddenChildCount}개 노드 숨김` : '접힘'}
          </div>
        )}

        <Handle
          type="target"
          position={Position.Top}
          className="!h-3 !w-3 !border-2 !border-brand-secondary !bg-white opacity-0 transition-opacity group-hover:opacity-100"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="!h-3 !w-3 !border-2 !border-brand-secondary !bg-white opacity-0 transition-opacity group-hover:opacity-100"
        />
        <Handle
          type="target"
          id="target-left"
          position={Position.Left}
          className="!h-3 !w-3 !border-2 !border-brand-secondary !bg-white opacity-0 transition-opacity group-hover:opacity-100"
        />
        <Handle
          type="source"
          id="source-left"
          position={Position.Left}
          className="!h-3 !w-3 !border-2 !border-brand-secondary !bg-white opacity-0 transition-opacity group-hover:opacity-100"
        />
        <Handle
          type="target"
          id="target-right"
          position={Position.Right}
          className="!h-3 !w-3 !border-2 !border-brand-secondary !bg-white opacity-0 transition-opacity group-hover:opacity-100"
        />
        <Handle
          type="source"
          id="source-right"
          position={Position.Right}
          className="!h-3 !w-3 !border-2 !border-brand-secondary !bg-white opacity-0 transition-opacity group-hover:opacity-100"
        />
      </div>
    </>
  );
}
