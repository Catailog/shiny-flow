'use client';

import { useState } from 'react';

import Image from 'next/image';

import {
  Handle,
  type Node,
  type NodeProps,
  NodeResizer,
  NodeToolbar,
  Position,
  useKeyPress,
} from '@xyflow/react';
import { CameraIcon, LoaderIcon, LogInIcon, SquareStackIcon } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { cn } from '@/lib/utils';

import { useT } from '@/hooks/useT';

import { useUIStore } from '@/store/uiStore';

import { useFlowActions } from '../actionsContext';
import { useCollapseContext } from '../collapseContext';
import { useHistory } from '../historyContext';
import { useZoomCompensation } from '../hooks/useZoomCompensation';
import { getNodeColorStyle } from '../lib/nodeColors';
import { useScreenshotContext } from '../screenshotContext';
import type { FlowNodeData } from '../types';

export type { FlowNodeData };

type Props = NodeProps<Node<FlowNodeData>>;

function extractParams(route: string): string[] {
  return [...route.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
}

export function FlowNode({ id, data, selected, width }: Props) {
  const { openDialog } = useFlowActions();
  const t = useT();
  const showNodeLabels = useUIStore((s) => s.showNodeLabels);
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
  const zoomCompensation = useZoomCompensation();
  const shiftHeld = useKeyPress('Shift');
  const { pushSnapshot } = useHistory();

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
      <NodeToolbar
        className="pointer-events-none"
        position={Position.Top}
        align="start"
        isVisible
        offset={6}
      >
        <span className="flex cursor-default items-center gap-1 select-none">
          {(data.redirected || redirectedSrc) && (
            <span className="pointer-events-auto">
              <Tooltip>
                <TooltipTrigger
                  disabled={!redirectedSrc}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (redirectedSrc)
                      openDialog({ type: 'screenshot', src: redirectedSrc, label: data.label });
                  }}
                  className={cn(buttonVariants({ variant: 'ghost' }), 'h-auto p-0')}
                >
                  <LogInIcon size={13} className="shrink-0 text-warning" />
                </TooltipTrigger>
                <TooltipContent>{t.flowNode.viewRedirectedScreen}</TooltipContent>
              </Tooltip>
            </span>
          )}
          {data.label !== data.route ? (
            <span className="flex flex-col">
              {showNodeLabels && (
                <span className="text-sm font-medium text-brand-dark dark:text-foreground">
                  {data.label}
                </span>
              )}
              <span className="text-xs text-muted-foreground">{data.route}</span>
            </span>
          ) : (
            <span className="text-sm font-medium text-brand-dark dark:text-foreground">
              {data.route}
            </span>
          )}
        </span>
      </NodeToolbar>

      <NodeResizer
        minWidth={280}
        isVisible={selected}
        keepAspectRatio={shiftHeld}
        onResizeStart={pushSnapshot}
      />

      {/* 핸들이 overflow-hidden에 잘리지 않도록 외부 div와 내부 content wrapper를 분리 */}
      <div className="group relative cursor-pointer" style={{ width: width || 280 }}>
        {/* 접힘 스택 그림자: 메인 카드 뒤에 쌓인 카드처럼 보이도록 offset된 레이어 */}
        {isCollapsed && (
          <>
            <div className="absolute inset-x-2 top-2 bottom-[-10px] rounded-lg border border-brand-secondary bg-brand-light dark:bg-card" />
            <div className="absolute inset-x-1 top-1 bottom-[-5px] rounded-lg border border-brand-secondary bg-brand-light dark:bg-card" />
          </>
        )}
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
            <div className="flex items-center gap-1.5 border-t border-inherit px-3 py-1.5 text-xs text-muted-foreground">
              <SquareStackIcon size={11} />
              {hiddenChildCount > 0
                ? t.flowNode.hiddenNodes(hiddenChildCount)
                : t.flowNode.collapsed}
            </div>
          )}
        </div>

        <Handle
          type="target"
          position={Position.Top}
          style={zoomCompensation}
          className="h-3! w-3! border-2! border-brand-secondary! bg-background! opacity-0 transition-opacity group-hover:opacity-100"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          style={zoomCompensation}
          className="h-3! w-3! border-2! border-brand-secondary! bg-background! opacity-0 transition-opacity group-hover:opacity-100"
        />
        <Handle
          type="target"
          id="target-left"
          position={Position.Left}
          style={zoomCompensation}
          className="h-3! w-3! border-2! border-brand-secondary! bg-background! opacity-0 transition-opacity group-hover:opacity-100"
        />
        <Handle
          type="source"
          id="source-left"
          position={Position.Left}
          style={zoomCompensation}
          className="h-3! w-3! border-2! border-brand-secondary! bg-background! opacity-0 transition-opacity group-hover:opacity-100"
        />
        <Handle
          type="target"
          id="target-right"
          position={Position.Right}
          style={zoomCompensation}
          className="h-3! w-3! border-2! border-brand-secondary! bg-background! opacity-0 transition-opacity group-hover:opacity-100"
        />
        <Handle
          type="source"
          id="source-right"
          position={Position.Right}
          style={zoomCompensation}
          className="h-3! w-3! border-2! border-brand-secondary! bg-background! opacity-0 transition-opacity group-hover:opacity-100"
        />
      </div>
    </>
  );
}
