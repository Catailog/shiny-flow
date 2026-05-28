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

export const ScreenshotContext = createContext<ScreenshotContextValue>({
  available: false,
  captureNode: async () => {},
  validateForCapture: async () => {},
});

export const useScreenshotContext = () => useContext(ScreenshotContext);
