import { useCallback } from 'react';

import type { Edge } from '@xyflow/react';
import { useReactFlow } from '@xyflow/react';

export function useEdgeUpdate() {
  const { setEdges } = useReactFlow();
  return useCallback(
    (id: string, dataUpdates: Record<string, unknown>, edgeUpdates?: Partial<Omit<Edge, 'data'>>) =>
      setEdges((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, ...edgeUpdates, data: { ...(e.data ?? {}), ...dataUpdates } } : e,
        ),
      ),
    [setEdges],
  );
}
