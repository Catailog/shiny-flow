import type React from 'react';

import { useStore } from '@xyflow/react';

// At zoom < 1 (zoomed out): scale = 1/zoom to keep the element at its minimum CSS size.
// At zoom > 1 (zoomed in): no compensation — element appears slightly larger.
// NodeResizer handles use autoScale internally — do NOT pass the returned style as handleStyle.
const BASE_HANDLE_SIZE = 12;

export function useZoomCompensation(): React.CSSProperties {
  const zoom = useStore((s) => s.transform[2]);
  const size = BASE_HANDLE_SIZE / Math.min(zoom, 1);
  return { width: size, height: size };
}
