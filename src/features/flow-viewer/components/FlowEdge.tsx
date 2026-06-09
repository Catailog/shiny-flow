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

import { useT } from '@/hooks/useT';

import { Z_INDEX } from '@/constants/zIndex';

import {
  type Face,
  buildSelfLoopPath,
  computeHandlePlacement,
  faceHandlePos,
  getCenter,
  getRectIntersectionFromDir,
} from '../lib/edgeGeometry';

export type FlowEdgeData = {
  comment?: string;
  sourceDir?: { dx: number; dy: number };
  targetDir?: { dx: number; dy: number };
  cp?: { x: number; y: number };
};

type Props = EdgeProps<Edge<FlowEdgeData>>;

function EdgeHandle({
  x,
  y,
  zoom,
  title,
  onMouseDown,
  onDoubleClick,
}: {
  x: number;
  y: number;
  zoom: number;
  title: string;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className="nodrag nopan absolute"
      style={{
        transform: `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${1 / zoom})`,
        cursor: 'grab',
        zIndex: Z_INDEX.edgeHandle,
        pointerEvents: 'all',
      }}
      title={title}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
    >
      <div className="h-3 w-3 rounded-full border-2 border-brand-primary bg-background shadow-sm" />
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
  const t = useT();
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
  // comment가 명시적으로 설정된 경우(''포함) 우선 사용. ''는 원본 label 억제 sentinel.
  const comment =
    data?.comment !== undefined ? data.comment || undefined : label ? String(label) : undefined;

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
              zIndex: Z_INDEX.edgeLabel,
              pointerEvents: 'all',
              cursor: 'grab',
            }}
            title={t.flowEdge.dragCurve}
            {...badgeDragHandlers}
          >
            <div className="rounded-full border border-border bg-background px-2 py-0.5 text-xs font-medium text-foreground shadow-sm dark:border-foreground/20">
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
              title={t.flowEdge.dragConnectionPoint}
              {...makeDragHandlers('source', sourceNode)}
            />
            <EdgeHandle
              x={tp.x}
              y={tp.y}
              zoom={zoom}
              title={t.flowEdge.dragConnectionPoint}
              {...makeDragHandlers('target', targetNode)}
            />
            {!comment && (
              <EdgeHandle
                x={labelX}
                y={labelY}
                zoom={zoom}
                title={t.flowEdge.dragCurve}
                onMouseDown={badgeDragHandlers.onMouseDown}
                onDoubleClick={badgeDragHandlers.onDoubleClick}
              />
            )}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
