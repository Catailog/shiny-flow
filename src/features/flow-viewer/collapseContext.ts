import { createContext, useContext } from 'react';

type CollapseContextValue = {
  collapsedIds: Set<string>;
  toggleCollapse: (id: string) => void;
  hasChildren: (id: string) => boolean;
  hiddenCount: (id: string) => number;
  dragOverGroupId: string | null;
};

export const CollapseContext = createContext<CollapseContextValue>({
  collapsedIds: new Set(),
  toggleCollapse: () => {},
  hasChildren: () => false,
  hiddenCount: () => 0,
  dragOverGroupId: null,
});

export const useCollapseContext = () => useContext(CollapseContext);
