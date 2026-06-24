import { useCallback, useRef } from 'react';

import type { Edge, EdgeChange, Node } from '@xyflow/react';

import type { FlowEdgeData } from '../components/FlowEdge';

type Options = {
  onEdgesChangeBase: (changes: EdgeChange[]) => void;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
};

export function useFlowEdgeSelect({ onEdgesChangeBase, setEdges, setNodes }: Options) {
  const edgeClickInProgressRef = useRef(false);

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeBase(
        changes.map((c) =>
          c.type === 'select' && c.selected && !edgeClickInProgressRef.current
            ? { ...c, selected: false }
            : c,
        ),
      );
    },
    [onEdgesChangeBase],
  );

  const handleEdgeClick = useCallback(
    (e: React.MouseEvent, clickedEdge: Edge) => {
      edgeClickInProgressRef.current = true;
      queueMicrotask(() => {
        edgeClickInProgressRef.current = false;
      });
      setEdges((eds) => {
        const maxZ = Math.max(0, ...eds.map((ed) => (ed.data as FlowEdgeData)?.labelZIndex ?? 0));
        const idx = eds.findIndex((ed) => ed.id === clickedEdge.id);
        const reordered =
          idx === -1 || idx === eds.length - 1
            ? eds
            : [...eds.slice(0, idx), ...eds.slice(idx + 1), eds[idx]];
        return reordered.map((ed) => ({
          ...ed,
          ...(ed.id === clickedEdge.id && { data: { ...(ed.data ?? {}), labelZIndex: maxZ + 1 } }),
        }));
      });
      if (!e.shiftKey) {
        setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
      }
    },
    [setEdges, setNodes],
  );

  return { onEdgesChange, handleEdgeClick };
}
