import { createContext, useContext } from 'react';

export type ScreenshotContextValue = {
  available: boolean;
  captureNode: (
    nodeId: string,
    resolvedRoute: string,
    paramValues: Record<string, string>,
  ) => Promise<void>;
  validateForCapture: () => Promise<void>;
};

export const ScreenshotContext = createContext<ScreenshotContextValue | null>(null);

export function useScreenshotContext() {
  const ctx = useContext(ScreenshotContext);
  if (!ctx) throw new Error('useScreenshotContext must be inside ScreenshotContext.Provider');
  return ctx;
}
