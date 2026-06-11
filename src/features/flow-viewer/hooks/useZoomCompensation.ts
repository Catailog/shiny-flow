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
export function useZoomCompensation(): React.CSSProperties {
  const zoom = useStore((s) => s.transform[2]);
  return { scale: String(Math.max(1 / zoom, 1)) };
}
