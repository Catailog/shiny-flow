'use client';

import { useState } from 'react';

import Image from 'next/image';

import { Handle, type Node, type NodeProps, NodeToolbar, Position } from '@xyflow/react';
import { CameraIcon, ChevronRightIcon, LoaderIcon, LogInIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { cn } from '@/lib/utils';

import { useFlowActions } from '../actionsContext';
import { useCollapseContext } from '../collapseContext';
import { getNodeColorStyle } from '../lib/nodeColors';
import { useScreenshotContext } from '../screenshotContext';
import type { FlowNodeData } from '../types';

export type { FlowNodeData };

type Props = NodeProps<Node<FlowNodeData>>;

function extractParams(route: string): string[] {
  return [...route.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
}

export function FlowNode({ id, data, selected }: Props) {
  const { openDialog } = useFlowActions();
  const { collapsedIds, hiddenCount } = useCollapseContext();
  const { available, captureNode, validateForCapture } = useScreenshotContext();
  const isCollapsed = collapsedIds.has(id);
  const hiddenChildCount = hiddenCount(id);

  const src = data.screenshot ? `data:image/png;base64,${data.screenshot}` : null;
  const redirectedSrc = data.redirectedScreenshot
    ? `data:image/png;base64,${data.redirectedScreenshot}`
    : null;
  const colorStyle = getNodeColorStyle(data.color);

  const dynamicParams = extractParams(data.route);
  const [paramValues, setParamValues] = useState<Record<string, string>>(
    () => data.paramValues ?? Object.fromEntries(dynamicParams.map((p) => [p, ''])),
  );
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCapture = async () => {
    const resolvedRoute = data.route.replace(/\[([^\]]+)\]/g, (_, p) => paramValues[p] ?? p);
    setIsCapturing(true);
    try {
      await captureNode(id, resolvedRoute, paramValues);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <>
      <NodeToolbar position={Position.Top} align="start" isVisible offset={6}>
        <span className="flex cursor-default items-center gap-1 text-sm font-medium text-brand-dark select-none">
          {(data.redirected || redirectedSrc) && (
            <Button
              type="button"
              variant="ghost"
              disabled={!redirectedSrc}
              onClick={(e) => {
                e.stopPropagation();
                if (redirectedSrc)
                  openDialog({ type: 'screenshot', src: redirectedSrc, label: data.label });
              }}
              className="h-auto p-0"
              title="리다이렉트 되기 전 화면 보기"
            >
              <LogInIcon size={13} className="shrink-0 text-warning" />
            </Button>
          )}
          {data.route}
        </span>
      </NodeToolbar>

      <div
        className={cn(
          'group flex w-70 cursor-pointer flex-col overflow-hidden rounded-lg shadow-sm',
          colorStyle
            ? `border-2 ${colorStyle.border} ${colorStyle.bg}`
            : `border ${data.isDeadEnd ? 'border-brand-accent/60 bg-brand-accent/10' : 'border-brand-secondary bg-brand-light'}`,
          selected && 'ring-2 ring-brand-primary ring-offset-1',
        )}
      >
        {dynamicParams.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-inherit px-3 py-2">
            {dynamicParams.map((param) => (
              <label key={param} className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="shrink-0 font-mono">{param}</span>
                <Input
                  value={paramValues[param] ?? ''}
                  onChange={(e) => setParamValues((prev) => ({ ...prev, [param]: e.target.value }))}
                  placeholder="값 입력"
                  className="nodrag h-5 w-20 rounded-sm px-1.5 text-xs"
                />
              </label>
            ))}
            <Button
              type="button"
              variant="default"
              size="xs"
              onClick={available ? handleCapture : validateForCapture}
              disabled={
                available && (isCapturing || dynamicParams.some((p) => !paramValues[p]?.trim()))
              }
              className="nodrag ml-auto"
            >
              {isCapturing ? (
                <LoaderIcon size={10} className="animate-spin" />
              ) : (
                <CameraIcon size={10} />
              )}
              재캡처
            </Button>
          </div>
        )}

        {src && (
          <Image
            src={src}
            alt={data.label}
            width={280}
            height={0}
            style={{ height: 'auto', width: '100%' }}
            className="block cursor-pointer border-b border-inherit"
            onDoubleClick={(e) => {
              e.stopPropagation();
              openDialog({ type: 'screenshot', src, label: data.label });
            }}
            unoptimized
          />
        )}
        {!src && (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">{data.route}</div>
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
          className="h-3! w-3! border-2! border-brand-secondary! bg-white! opacity-0 transition-opacity group-hover:opacity-100"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="h-3! w-3! border-2! border-brand-secondary! bg-white! opacity-0 transition-opacity group-hover:opacity-100"
        />
        <Handle
          type="target"
          id="target-left"
          position={Position.Left}
          className="h-3! w-3! border-2! border-brand-secondary! bg-white! opacity-0 transition-opacity group-hover:opacity-100"
        />
        <Handle
          type="source"
          id="source-left"
          position={Position.Left}
          className="h-3! w-3! border-2! border-brand-secondary! bg-white! opacity-0 transition-opacity group-hover:opacity-100"
        />
        <Handle
          type="target"
          id="target-right"
          position={Position.Right}
          className="h-3! w-3! border-2! border-brand-secondary! bg-white! opacity-0 transition-opacity group-hover:opacity-100"
        />
        <Handle
          type="source"
          id="source-right"
          position={Position.Right}
          className="h-3! w-3! border-2! border-brand-secondary! bg-white! opacity-0 transition-opacity group-hover:opacity-100"
        />
      </div>
    </>
  );
}
