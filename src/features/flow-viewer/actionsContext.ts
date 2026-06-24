'use client';

import { createContext, useContext } from 'react';

import type { DialogRequest } from './types';

export type FlowActionsContextValue = {
  openDialog: (req: DialogRequest) => void;
  readOnly?: boolean;
};

const FlowActionsContext = createContext<FlowActionsContextValue | null>(null);

export const FlowActionsProvider = FlowActionsContext.Provider;

export function useFlowActions() {
  const ctx = useContext(FlowActionsContext);
  if (!ctx) throw new Error('useFlowActions must be inside FlowActionsProvider');
  return ctx;
}
