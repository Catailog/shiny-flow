'use client';

import { useCallback, useRef, useState } from 'react';

import {
  BaseEdge,
  type Edge,
  EdgeLabelRenderer,
  type EdgeProps,
  type InternalNode,
  useReactFlow,
  useStore,
} from '@xyflow/react';

export type FlowEdgeData = {
  comment?: string;
  sourceDir?: { dx: number; dy: number };
  targetDir?: { dx: number; dy: number };
};

type Props = EdgeProps<Edge<FlowEdgeData>>;

const LANE_SPACING = 55;
const LOOP_BASE_HEIGHT = 80;
const LOOP_BASE_SPREAD = 48;

function getCenter(node: InternalNode) {
  const { x, y } = node.internals.positionAbsolute;
  const w = node.measured?.width ?? 0;
  const h = node.measured?.height ?? 0;
  return { x: x + w / 2, y: y + h / 2 };
}

function getRectIntersection(node: InternalNode, from: { x: number; y: number }) {
  const { x, y } = node.internals.positionAbsolute;
  const w = node.measured?.width ?? 0;
  const h = node.measured?.height ?? 0;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const dx = from.x - cx;
  const dy = from.y - cy;
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return { x: cx, y };
  const scaleX = Math.abs(dx) > 0.001 ? w / 2 / Math.abs(dx) : Infinity;
  const scaleY = Math.abs(dy) > 0.001 ? h / 2 / Math.abs(dy) : Infinity;
  return { x: cx + dx * Math.min(scaleX, scaleY), y: cy + dy * Math.min(scaleX, scaleY) };
}

function getRectIntersectionFromDir(node: InternalNode, dir: { dx: number; dy: number }) {
  const c = getCenter(node);
  return getRectIntersection(node, { x: c.x + dir.dx, y: c.y + dir.dy });
}

function buildSelfLoopPath(node: InternalNode, loopIndex: number) {
  const { x, y } = node.internals.positionAbsolute;
  const w = node.measured?.width ?? 0;
  const cx = x + w / 2;
  const topY = y;
  const spread = LOOP_BASE_SPREAD + loopIndex * 24;
  const height = LOOP_BASE_HEIGHT + loopIndex * 32;
  return {
    path: `M ${cx - spread / 3} ${topY} C ${cx - spread} ${topY - height} ${cx + spread} ${topY - height} ${cx + spread / 3} ${topY}`,
    labelX: cx,
    labelY: topY - height * 0.82,
    sp: { x: cx - spread / 3, y: topY },
    tp: { x: cx + spread / 3, y: topY },
  };
}

function buildParallelPath(
  sp: { x: number; y: number },
  tp: { x: number; y: number },
  laneOffset: number,
) {
  if (Math.abs(laneOffset) < 0.5) {
    return {
      path: `M ${sp.x} ${sp.y} L ${tp.x} ${tp.y}`,
      labelX: (sp.x + tp.x) / 2,
      labelY: (sp.y + tp.y) / 2,
    };
  }
  const len = Math.sqrt((tp.x - sp.x) ** 2 + (tp.y - sp.y) ** 2) || 1;
  const perpX = -(tp.y - sp.y) / len;
  const perpY = (tp.x - sp.x) / len;
  const midX = (sp.x + tp.x) / 2;
  const midY = (sp.y + tp.y) / 2;
  const cpX = midX + perpX * laneOffset;
  const cpY = midY + perpY * laneOffset;
  return {
    path: `M ${sp.x} ${sp.y} Q ${cpX} ${cpY} ${tp.x} ${tp.y}`,
    labelX: 0.25 * sp.x + 0.5 * cpX + 0.25 * tp.x,
    labelY: 0.25 * sp.y + 0.5 * cpY + 0.25 * tp.y,
  };
}

function EdgeHandle({
  x,
  y,
  zoom,
  onMouseDown,
  onDoubleClick,
}: {
  x: number;
  y: number;
  zoom: number;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className="nodrag nopan absolute"
      style={{
        transform: `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${1 / zoom})`,
        cursor: 'grab',
        zIndex: 20,
        pointerEvents: 'all',
      }}
      title="드래그: 연결점 이동 / 더블클릭: 자동 위치 복원"
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
    >
      <div className="h-3 w-3 rounded-full border-2 border-brand-primary bg-white shadow-sm" />
    </div>
  );
}

export function FlowEdge({
  id,
  source,
  target,
  label,
  data,
  markerEnd,
  markerStart,
  style,
  selected,
}: Props) {
  const zoom = useStore((s) => s.transform[2]);
  const { setEdges, screenToFlowPosition } = useReactFlow();
  const sourceNode = useStore(useCallback((s) => s.nodeLookup.get(source), [source]));
  const targetNode = useStore(useCallback((s) => s.nodeLookup.get(target), [target]));
  const { laneIndex, laneTotal, loopIndex } = useStore(
    useCallback(
      (s) => {
        if (source === target) {
          const loops = s.edges.filter((e) => e.source === e.target && e.source === source);
          return { laneIndex: 0, laneTotal: 1, loopIndex: loops.findIndex((e) => e.id === id) };
        }
        const parallel = s.edges.filter((e) => e.source === source && e.target === target);
        return {
          laneIndex: parallel.findIndex((e) => e.id === id),
          laneTotal: parallel.length,
          loopIndex: 0,
        };
      },
      [id, source, target],
    ),
  );
  const [hovered, setHovered] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  if (!sourceNode || !targetNode) return null;

  const isSelfLoop = source === target;
  const comment = data?.comment ?? (label ? String(label) : undefined);

  let edgePath: string;
  let labelX: number;
  let labelY: number;
  let sp: { x: number; y: number };
  let tp: { x: number; y: number };

  if (isSelfLoop) {
    const loop = buildSelfLoopPath(sourceNode, loopIndex);
    edgePath = loop.path;
    labelX = loop.labelX;
    labelY = loop.labelY;
    sp = loop.sp;
    tp = loop.tp;
  } else {
    const sc = getCenter(sourceNode);
    const tc = getCenter(targetNode);
    sp = data?.sourceDir
      ? getRectIntersectionFromDir(sourceNode, data.sourceDir)
      : getRectIntersection(sourceNode, tc);
    tp = data?.targetDir
      ? getRectIntersectionFromDir(targetNode, data.targetDir)
      : getRectIntersection(targetNode, sc);

    // 수동 위치 지정된 경우 오프셋 미적용
    const laneOffset =
      data?.sourceDir || data?.targetDir
        ? 0
        : (laneIndex - (laneTotal - 1) / 2) * LANE_SPACING;

    const built = buildParallelPath(sp, tp, laneOffset);
    edgePath = built.path;
    labelX = built.labelX;
    labelY = built.labelY;
  }

  const showHandles = !isSelfLoop && (selected || hovered);

  const makeDragHandlers = (type: 'source' | 'target', node: InternalNode) => {
    const key = type === 'source' ? 'sourceDir' : 'targetDir';
    return {
      onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        e.preventDefault();
        const onMove = (ev: MouseEvent) => {
          const mousePos = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
          const center = getCenter(node);
          const dx = mousePos.x - center.x;
          const dy = mousePos.y - center.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          setEdges((eds) =>
            eds.map((edge) =>
              edge.id === id
                ? { ...edge, data: { ...(edge.data ?? {}), [key]: { dx: dx / len, dy: dy / len } } }
                : edge,
            ),
          );
        };
        const onUp = () => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      },
      onDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        setEdges((eds) =>
          eds.map((edge) =>
            edge.id === id
              ? { ...edge, data: { ...(edge.data ?? {}), [key]: undefined } }
              : edge,
          ),
        );
      },
    };
  };

  return (
    <>
      <g
        onMouseEnter={() => {
          clearTimeout(leaveTimer.current);
          setHovered(true);
        }}
        onMouseLeave={() => {
          leaveTimer.current = setTimeout(() => setHovered(false), 150);
        }}
      >
        <BaseEdge
          id={id}
          path={edgePath}
          markerEnd={markerEnd}
          markerStart={markerStart}
          style={{ ...style, strokeWidth: 1.5 / zoom }}
          interactionWidth={20 / zoom}
        />
      </g>
      <EdgeLabelRenderer>
        {comment && (
          <div
            className="nodrag nopan pointer-events-none"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px) scale(${1 / zoom})`,
              zIndex: 10,
            }}
          >
            <div className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-600 shadow-sm">
              {comment}
            </div>
          </div>
        )}
        {showHandles && (
          <div
            style={{ pointerEvents: 'none' }}
            onMouseEnter={() => {
              clearTimeout(leaveTimer.current);
              setHovered(true);
            }}
            onMouseLeave={() => {
              leaveTimer.current = setTimeout(() => setHovered(false), 150);
            }}
          >
            <EdgeHandle
              x={sp.x}
              y={sp.y}
              zoom={zoom}
              {...makeDragHandlers('source', sourceNode)}
            />
            <EdgeHandle
              x={tp.x}
              y={tp.y}
              zoom={zoom}
              {...makeDragHandlers('target', targetNode)}
            />
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
