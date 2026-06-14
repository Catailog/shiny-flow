'use client';

import { createContext, useContext } from 'react';

export type HistoryContextValue = {
  pushSnapshot: () => void;
};

const HistoryContext = createContext<HistoryContextValue | null>(null);

export const HistoryProvider = HistoryContext.Provider;

export function useHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error('useHistory must be inside HistoryProvider');
  return ctx;
}
