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
  cp?: { x: number; y: number };
};

type Props = EdgeProps<Edge<FlowEdgeData>>;
type Face = 'top' | 'bottom' | 'left' | 'right';
type HandlePlacement = { face: Face; index: number; total: number };

const LOOP_BASE_HEIGHT = 80;
const LOOP_BASE_SPREAD = 48;

function getCenter(node: InternalNode) {
  const { x, y } = node.internals.positionAbsolute;
  const w = node.measured?.width ?? 0;
  const h = node.measured?.height ?? 0;
  return { x: x + w / 2, y: y + h / 2 };
}

function getFace(node: InternalNode, otherCenter: { x: number; y: number }): Face {
  const w = node.measured?.width ?? 1;
  const h = node.measured?.height ?? 1;
  const c = getCenter(node);
  const dx = otherCenter.x - c.x;
  const dy = otherCenter.y - c.y;
  const scaleX = Math.abs(dx) > 0.001 ? w / 2 / Math.abs(dx) : Infinity;
  const scaleY = Math.abs(dy) > 0.001 ? h / 2 / Math.abs(dy) : Infinity;
  if (scaleX <= scaleY) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'bottom' : 'top';
}

// 변 위에서 n+2개 등간격 중 i+1번째 위치 (꼭지점 제외, space-between)
function faceHandlePos(
  node: InternalNode,
  face: Face,
  index: number,
  total: number,
): { x: number; y: number } {
  const { x, y } = node.internals.positionAbsolute;
  const w = node.measured?.width ?? 0;
  const h = node.measured?.height ?? 0;
  const t = (index + 1) / (total + 1);
  switch (face) {
    case 'top':
      return { x: x + w * t, y };
    case 'bottom':
      return { x: x + w * t, y: y + h };
    case 'left':
      return { x, y: y + h * t };
    case 'right':
      return { x: x + w, y: y + h * t };
  }
}

function computeHandlePlacement(
  thisNodeId: string,
  edgeId: string,
  allEdges: readonly Edge[],
  nodeLookup: Map<string, InternalNode>,
): HandlePlacement {
  const thisNode = nodeLookup.get(thisNodeId);
  if (!thisNode) return { face: 'bottom', index: 0, total: 1 };

  type Entry = { id: string; face: Face; sortKey: number };
  const entries: Entry[] = [];

  for (const e of allEdges) {
    if (e.source === e.target) continue;
    const otherNodeId =
      e.source === thisNodeId ? e.target : e.target === thisNodeId ? e.source : undefined;
    if (!otherNodeId) continue;
    const otherNode = nodeLookup.get(otherNodeId);
    if (!otherNode) continue;
    const oc = getCenter(otherNode);
    const face = getFace(thisNode, oc);
    // 같은 변 안에서 정렬 기준: 수직 변은 Y, 수평 변은 X
    const sortKey = face === 'left' || face === 'right' ? oc.y : oc.x;
    entries.push({ id: e.id, face, sortKey });
  }

  const thisEntry = entries.find((e) => e.id === edgeId);
  if (!thisEntry) return { face: 'bottom', index: 0, total: 1 };

  const sameFace = entries
    .filter((e) => e.face === thisEntry.face)
    .sort((a, b) => {
      const diff = a.sortKey - b.sortKey;
      // sortKey가 같을 때(같은 타겟 노드) id로 안정 정렬
      if (Math.abs(diff) < 0.5) return a.id < b.id ? -1 : 1;
      return diff;
    });

  const index = sameFace.findIndex((e) => e.id === edgeId);
  return { face: thisEntry.face, index: Math.max(0, index), total: sameFace.length };
}

function getRectIntersectionFromDir(node: InternalNode, dir: { dx: number; dy: number }) {
  const { x, y } = node.internals.positionAbsolute;
  const w = node.measured?.width ?? 0;
  const h = node.measured?.height ?? 0;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const { dx, dy } = dir;
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return { x: cx, y: cy };
  const scaleX = Math.abs(dx) > 0.001 ? w / 2 / Math.abs(dx) : Infinity;
  const scaleY = Math.abs(dy) > 0.001 ? h / 2 / Math.abs(dy) : Infinity;
  return { x: cx + dx * Math.min(scaleX, scaleY), y: cy + dy * Math.min(scaleX, scaleY) };
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

  const { loopIndex, sourcePlace, targetPlace } = useStore(
    useCallback(
      (s) => {
        if (source === target) {
          const loops = s.edges.filter((e) => e.source === e.target && e.source === source);
          return {
            loopIndex: loops.findIndex((e) => e.id === id),
            sourcePlace: { face: 'top' as Face, index: 0, total: 1 },
            targetPlace: { face: 'top' as Face, index: 0, total: 1 },
          };
        }
        return {
          loopIndex: 0,
          sourcePlace: computeHandlePlacement(source, id, s.edges, s.nodeLookup),
          targetPlace: computeHandlePlacement(target, id, s.edges, s.nodeLookup),
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
    sp = data?.sourceDir
      ? getRectIntersectionFromDir(sourceNode, data.sourceDir)
      : faceHandlePos(sourceNode, sourcePlace.face, sourcePlace.index, sourcePlace.total);

    tp = data?.targetDir
      ? getRectIntersectionFromDir(targetNode, data.targetDir)
      : faceHandlePos(targetNode, targetPlace.face, targetPlace.index, targetPlace.total);

    if (data?.cp) {
      edgePath = `M ${sp.x} ${sp.y} Q ${data.cp.x} ${data.cp.y} ${tp.x} ${tp.y}`;
      labelX = 0.25 * sp.x + 0.5 * data.cp.x + 0.25 * tp.x;
      labelY = 0.25 * sp.y + 0.5 * data.cp.y + 0.25 * tp.y;
    } else {
      edgePath = `M ${sp.x} ${sp.y} L ${tp.x} ${tp.y}`;
      labelX = (sp.x + tp.x) / 2;
      labelY = (sp.y + tp.y) / 2;
    }
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
                ? {
                    ...edge,
                    data: { ...(edge.data ?? {}), [key]: { dx: dx / len, dy: dy / len } },
                  }
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
            edge.id === id ? { ...edge, data: { ...(edge.data ?? {}), [key]: undefined } } : edge,
          ),
        );
      },
    };
  };

  const badgeDragHandlers = {
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.preventDefault();
      const spSnap = { ...sp };
      const tpSnap = { ...tp };
      const onMove = (ev: MouseEvent) => {
        const B = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
        // 뱃지가 베지어 t=0.5 위에 오도록 cp 역산: B = 0.25*sp + 0.5*cp + 0.25*tp
        setEdges((eds) =>
          eds.map((edge) =>
            edge.id === id
              ? {
                  ...edge,
                  data: {
                    ...(edge.data ?? {}),
                    cp: {
                      x: 2 * B.x - 0.5 * (spSnap.x + tpSnap.x),
                      y: 2 * B.y - 0.5 * (spSnap.y + tpSnap.y),
                    },
                  },
                }
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
          edge.id === id ? { ...edge, data: { ...(edge.data ?? {}), cp: undefined } } : edge,
        ),
      );
    },
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
            className="nodrag nopan absolute"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px) scale(${1 / zoom})`,
              zIndex: 10,
              pointerEvents: 'all',
              cursor: 'grab',
            }}
            title="드래그: 곡선 조정 / 더블클릭: 직선으로 복원"
            {...badgeDragHandlers}
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
            <EdgeHandle x={sp.x} y={sp.y} zoom={zoom} {...makeDragHandlers('source', sourceNode)} />
            <EdgeHandle x={tp.x} y={tp.y} zoom={zoom} {...makeDragHandlers('target', targetNode)} />
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
