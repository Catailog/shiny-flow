'use client';

import { useState } from 'react';

import Image from 'next/image';

import { Handle, type Node, type NodeProps, NodeToolbar, Position } from '@xyflow/react';
import { CameraIcon, ChevronRightIcon, LoaderIcon, LogInIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { cn } from '@/lib/utils';

import { useT } from '@/hooks/useT';

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
  const t = useT();
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
        <span className="flex cursor-default items-center gap-1 text-sm font-medium text-brand-dark select-none dark:text-foreground">
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
              title={t.flowNode.viewBeforeRedirect}
            >
              <LogInIcon size={13} className="shrink-0 text-warning" />
            </Button>
          )}
          {data.route}
        </span>
      </NodeToolbar>

      {/* 핸들이 overflow-hidden에 잘리지 않도록 외부 div와 내부 content wrapper를 분리 */}
      <div className="group relative w-70 cursor-pointer">
        <div
          className={cn(
            'relative flex flex-col overflow-hidden rounded-lg shadow-sm',
            colorStyle
              ? `border-2 ${colorStyle.border} bg-brand-light dark:bg-card`
              : data.isDeadEnd
                ? 'border border-brand-accent/60 bg-brand-accent/10'
                : 'border border-brand-secondary bg-brand-light dark:bg-card',
            selected && 'ring-2 ring-brand-primary ring-offset-1',
          )}
        >
          {/* 좌측 컬러 스트라이프 */}
          {colorStyle && <div className={cn('absolute inset-y-0 left-0 w-1', colorStyle.dot)} />}
          {/* 상단 상태 배지 */}
          {colorStyle && (
            <div
              className={cn(
                'flex items-center gap-1.5 border-b border-inherit px-3 py-1',
                colorStyle.bg,
              )}
            >
              <div className={cn('h-2 w-2 shrink-0 rounded-full', colorStyle.dot)} />
              <span className="text-xs font-medium">
                {(t.nodeColors.status as Record<string, string>)[data.color ?? ''] ?? data.color}
              </span>
            </div>
          )}
          {dynamicParams.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-b border-inherit px-3 py-2">
              {dynamicParams.map((param) => (
                <label
                  key={param}
                  className="flex items-center gap-1 text-xs text-muted-foreground"
                >
                  <span className="shrink-0 font-mono">{param}</span>
                  <Input
                    value={paramValues[param] ?? ''}
                    onChange={(e) =>
                      setParamValues((prev) => ({ ...prev, [param]: e.target.value }))
                    }
                    placeholder={t.flowNode.enterValue}
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
                {t.flowNode.recapture}
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
              {hiddenChildCount > 0
                ? t.flowNode.hiddenNodes(hiddenChildCount)
                : t.flowNode.collapsed}
            </div>
          )}
        </div>

        <Handle
          type="target"
          position={Position.Top}
          className="h-3! w-3! border-2! border-brand-secondary! bg-background! opacity-0 transition-opacity group-hover:opacity-100"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="h-3! w-3! border-2! border-brand-secondary! bg-background! opacity-0 transition-opacity group-hover:opacity-100"
        />
        <Handle
          type="target"
          id="target-left"
          position={Position.Left}
          className="h-3! w-3! border-2! border-brand-secondary! bg-background! opacity-0 transition-opacity group-hover:opacity-100"
        />
        <Handle
          type="source"
          id="source-left"
          position={Position.Left}
          className="h-3! w-3! border-2! border-brand-secondary! bg-background! opacity-0 transition-opacity group-hover:opacity-100"
        />
        <Handle
          type="target"
          id="target-right"
          position={Position.Right}
          className="h-3! w-3! border-2! border-brand-secondary! bg-background! opacity-0 transition-opacity group-hover:opacity-100"
        />
        <Handle
          type="source"
          id="source-right"
          position={Position.Right}
          className="h-3! w-3! border-2! border-brand-secondary! bg-background! opacity-0 transition-opacity group-hover:opacity-100"
        />
      </div>
    </>
  );
}
