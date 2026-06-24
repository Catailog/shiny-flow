import type React from 'react';

import { useStore } from '@xyflow/react';

/**
 * Returns a style object that keeps the element at a fixed visual size when zooming out.
 * Uses the CSS `scale` property (same approach as ReactFlow's NodeResizer autoScale).
 * At zoom > 1 (zoomed in), no compensation - element appears slightly larger.
 * At zoom < 1 (zoomed out), scale = 1/zoom - element stays at its minimum CSS size.
 *
 * Zoom-compensated elements (add style={zoomCompensation} to opt in):
 * - FlowNode edge handles (Handle components)
 * Note: NodeResizer handles use autoScale internally - do NOT pass handleStyle here.
 */
const BASE_HANDLE_SIZE = 12;

export function useZoomCompensation(): React.CSSProperties {
  const zoom = useStore((s) => s.transform[2]);
  const size = BASE_HANDLE_SIZE / Math.min(zoom, 1);
  return { width: size, height: size };
}
