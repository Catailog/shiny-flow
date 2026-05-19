'use client';

import {
  BaseEdge,
  type Edge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
  useStore,
} from '@xyflow/react';

export type FlowEdgeData = {
  comment?: string;
};

type Props = EdgeProps<Edge<FlowEdgeData>>;

export function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  data,
  markerEnd,
  markerStart,
  style,
}: Props) {
  const zoom = useStore((s) => s.transform[2]);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const comment = data?.comment ?? (label ? String(label) : undefined);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={{ ...style, strokeWidth: 1.5 / zoom }}
        interactionWidth={20 / zoom}
      />
      {comment && (
        <EdgeLabelRenderer>
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
        </EdgeLabelRenderer>
      )}
    </>
  );
}
