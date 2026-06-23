import { useCallback } from 'react';

import { useReactFlow } from '@xyflow/react';

export function useNodeUpdate() {
  const { setNodes } = useReactFlow();
  return useCallback(
    (id: string, updates: Record<string, unknown>) =>
      setNodes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)),
      ),
    [setNodes],
  );
}
