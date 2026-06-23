import { createContext, useContext } from 'react';

type CollapseContextValue = {
  collapsedIds: Set<string>;
  toggleCollapse: (id: string) => void;
  hasChildren: (id: string) => boolean;
  hiddenCount: (id: string) => number;
  dragOverGroupId: string | null;
};

export const CollapseContext = createContext<CollapseContextValue | null>(null);

export function useCollapseContext() {
  const ctx = useContext(CollapseContext);
  if (!ctx) throw new Error('useCollapseContext must be inside CollapseContext.Provider');
  return ctx;
}
