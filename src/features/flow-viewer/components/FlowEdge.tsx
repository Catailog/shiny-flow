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

import { useFlowActions } from '../actionsContext';
import { useHistory } from '../historyContext';
import { useEdgeUpdate } from '../hooks/useEdgeUpdate';
import {
  type Face,
  type HandlePlacement,
  type LoopAttachment,
  buildCustomSelfLoopPath,
  buildSelfLoopPath,
  computeHandlePlacement,
  faceHandlePos,
  getCenter,
  getRectIntersectionFromDir,
  snapToNodePerimeter,
} from '../lib/edgeGeometry';

// Edge stroke style constant — edit only here
const STROKE_WIDTH = 1.5;

export type EdgeLineStyle = 'solid' | 'dashed';

export type FlowEdgeData = {
  comment?: string;
  lineStyle?: EdgeLineStyle;
  sourceDir?: { dx: number; dy: number };
  targetDir?: { dx: number; dy: number };
  cp?: { x: number; y: number };
  labelZIndex?: number;
  loopSp?: LoopAttachment;
  loopTp?: LoopAttachment;
  loopCtrl?: { x: number; y: number };
};

type Props = EdgeProps<Edge<FlowEdgeData>>;

type EdgeLayout = {
  path: string;
  labelX: number;
  labelY: number;
  sp: { x: number; y: number };
  tp: { x: number; y: number };
};

function computeEdgeLayout(
  isSelfLoop: boolean,
  sourceNode: InternalNode,
  targetNode: InternalNode,
  data: FlowEdgeData | undefined,
  loopIndex: number,
  sourcePlace: HandlePlacement,
  targetPlace: HandlePlacement,
): EdgeLayout {
  if (isSelfLoop) {
    if (data?.loopSp && data?.loopTp) {
      const loop = buildCustomSelfLoopPath(sourceNode, data.loopSp, data.loopTp, data.loopCtrl);
      return {
        path: loop.path,
        labelX: loop.labelX,
        labelY: loop.labelY,
        sp: loop.spCanvas,
        tp: loop.tpCanvas,
      };
    }
    const loop = buildSelfLoopPath(sourceNode, loopIndex);
    return { path: loop.path, labelX: loop.labelX, labelY: loop.labelY, sp: loop.sp, tp: loop.tp };
  }

  const sp = data?.sourceDir
    ? getRectIntersectionFromDir(sourceNode, data.sourceDir)
    : faceHandlePos(sourceNode, sourcePlace.face, sourcePlace.index, sourcePlace.total);
  const tp = data?.targetDir
    ? getRectIntersectionFromDir(targetNode, data.targetDir)
    : faceHandlePos(targetNode, targetPlace.face, targetPlace.index, targetPlace.total);

  if (data?.cp) {
    return {
      path: `M ${sp.x} ${sp.y} Q ${data.cp.x} ${data.cp.y} ${tp.x} ${tp.y}`,
      labelX: 0.25 * sp.x + 0.5 * data.cp.x + 0.25 * tp.x,
      labelY: 0.25 * sp.y + 0.5 * data.cp.y + 0.25 * tp.y,
      sp,
      tp,
    };
  }

  return {
    path: `M ${sp.x} ${sp.y} L ${tp.x} ${tp.y}`,
    labelX: (sp.x + tp.x) / 2,
    labelY: (sp.y + tp.y) / 2,
    sp,
    tp,
  };
}

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
  const { readOnly } = useFlowActions();
  const zoom = useStore((s) => s.transform[2]);
  const { setEdges, setNodes, screenToFlowPosition } = useReactFlow();
  const updateEdge = useEdgeUpdate();
  const { pushSnapshot } = useHistory();
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
  // Use comment if explicitly set (including ''). '' is a sentinel that suppresses the original label.
  const comment =
    data?.comment !== undefined ? data.comment || undefined : label ? String(label) : undefined;

  const {
    path: edgePath,
    labelX,
    labelY,
    sp,
    tp,
  } = computeEdgeLayout(
    isSelfLoop,
    sourceNode,
    targetNode,
    data,
    loopIndex,
    sourcePlace,
    targetPlace,
  );

  const startEdgeDrag = (selectEdge: boolean) => {
    pushSnapshot();
    setEdges((eds) => {
      const maxZ = Math.max(0, ...eds.map((e) => (e.data as FlowEdgeData)?.labelZIndex ?? 0));
      const idx = eds.findIndex((ed) => ed.id === id);
      const reordered =
        idx === -1 || idx === eds.length - 1
          ? eds
          : [...eds.slice(0, idx), ...eds.slice(idx + 1), eds[idx]];
      if (selectEdge) {
        return reordered.map((e) => ({
          ...e,
          selected: e.id === id,
          ...(e.id === id && { data: { ...(e.data ?? {}), labelZIndex: maxZ + 1 } }),
        }));
      }
      return reordered.map((e) =>
        e.id === id ? { ...e, data: { ...(e.data ?? {}), labelZIndex: maxZ + 1 } } : e,
      );
    });
    if (selectEdge) {
      setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
    }
  };

  const showHandles = !readOnly && (selected || hovered);

  const makeSelfLoopHandleDragHandler = (
    type: 'source' | 'target',
    currentSp: { x: number; y: number },
    currentTp: { x: number; y: number },
  ) => ({
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      startEdgeDrag(true);
      // Snapshot both attachments at drag start
      const initSp: LoopAttachment = data?.loopSp ?? snapToNodePerimeter(sourceNode, currentSp);
      const initTp: LoopAttachment = data?.loopTp ?? snapToNodePerimeter(sourceNode, currentTp);
      const onMove = (ev: MouseEvent) => {
        const mousePos = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
        const attachment = snapToNodePerimeter(sourceNode, mousePos);
        updateEdge(id, {
          loopSp: type === 'source' ? attachment : initSp,
          loopTp: type === 'target' ? attachment : initTp,
        });
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        setEdges((eds) => eds.map((e) => ({ ...e, selected: e.id === id })));
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    onDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      pushSnapshot();
      updateEdge(id, { loopSp: undefined, loopTp: undefined });
    },
  });

  const makeDragHandlers = (type: 'source' | 'target', node: InternalNode) => {
    const key = type === 'source' ? 'sourceDir' : 'targetDir';
    return {
      onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();
        startEdgeDrag(true);
        const onMove = (ev: MouseEvent) => {
          const mousePos = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
          const center = getCenter(node);
          const dx = mousePos.x - center.x;
          const dy = mousePos.y - center.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          updateEdge(id, { [key]: { dx: dx / len, dy: dy / len } });
        };
        const onUp = () => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          setEdges((eds) => eds.map((e) => ({ ...e, selected: e.id === id })));
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      },
      onDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        pushSnapshot();
        updateEdge(id, { [key]: undefined });
      },
    };
  };

  const selfLoopBadgeDragHandlers = {
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      startEdgeDrag(false);
      // Snapshot loop geometry at drag start
      const midX = (sp.x + tp.x) / 2;
      const midY = (sp.y + tp.y) / 2;
      const initSp: LoopAttachment = data?.loopSp ?? snapToNodePerimeter(sourceNode, sp);
      const initTp: LoopAttachment = data?.loopTp ?? snapToNodePerimeter(sourceNode, tp);
      const onMove = (ev: MouseEvent) => {
        const B = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
        // label pos = midXY + 0.75 * ctrl → solve for ctrl
        const loopCtrl = { x: (B.x - midX) / 0.75, y: (B.y - midY) / 0.75 };
        updateEdge(id, { loopSp: initSp, loopTp: initTp, loopCtrl });
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
      pushSnapshot();
      updateEdge(id, { loopCtrl: undefined });
    },
  };

  const badgeDragHandlers = {
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      startEdgeDrag(false);
      const spSnap = { ...sp };
      const tpSnap = { ...tp };
      const onMove = (ev: MouseEvent) => {
        const B = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
        // Place badge at bezier t=0.5, solve for cp: B = 0.25*sp + 0.5*cp + 0.25*tp
        updateEdge(id, {
          cp: {
            x: 2 * B.x - 0.5 * (spSnap.x + tpSnap.x),
            y: 2 * B.y - 0.5 * (spSnap.y + tpSnap.y),
          },
        });
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
      pushSnapshot();
      updateEdge(id, { cp: undefined });
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
          style={{
            ...style,
            strokeWidth: STROKE_WIDTH / zoom,
            stroke: selected
              ? 'var(--xy-edge-stroke-selected-default, #555)'
              : 'var(--xy-edge-stroke-default, #b1b1b7)',
            ...(data?.lineStyle === 'dashed' && {
              strokeDasharray: `${6 / zoom} ${4 / zoom}`,
            }),
          }}
          interactionWidth={20 / zoom}
        />
      </g>
      <EdgeLabelRenderer>
        {comment && (
          <div
            className="nodrag nopan absolute"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px) scale(${1 / zoom})`,
              zIndex: data?.labelZIndex ?? Z_INDEX.edgeLabel,
              pointerEvents: 'all',
              cursor: readOnly ? 'default' : 'grab',
            }}
            title={readOnly ? undefined : t.flowEdge.dragCurve}
            {...(!readOnly && (isSelfLoop ? selfLoopBadgeDragHandlers : badgeDragHandlers))}
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
            {isSelfLoop ? (
              <>
                <EdgeHandle
                  x={sp.x}
                  y={sp.y}
                  zoom={zoom}
                  title={t.flowEdge.dragConnectionPoint}
                  {...makeSelfLoopHandleDragHandler('source', sp, tp)}
                />
                <EdgeHandle
                  x={tp.x}
                  y={tp.y}
                  zoom={zoom}
                  title={t.flowEdge.dragConnectionPoint}
                  {...makeSelfLoopHandleDragHandler('target', sp, tp)}
                />
                {!comment && (
                  <EdgeHandle
                    x={labelX}
                    y={labelY}
                    zoom={zoom}
                    title={t.flowEdge.dragCurve}
                    onMouseDown={selfLoopBadgeDragHandlers.onMouseDown}
                    onDoubleClick={selfLoopBadgeDragHandlers.onDoubleClick}
                  />
                )}
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
