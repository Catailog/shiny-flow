import { z } from 'zod';

export type AnalyzeFormValues = {
  path: string;
  screenshot: boolean;
  baseUrl: string;
  authType: 'none' | 'cookies' | 'script';
  cookiesJson: string;
  scriptPath: string;
};

type SchemaMessages = {
  pathRequired: string;
  serverUrlRequired: string;
  cookiesRequired: string;
  scriptRequired: string;
  scriptExtension: string;
};

export function makeAnalyzeSchema(msg: SchemaMessages) {
  return z
    .object({
      path: z.string().min(1, msg.pathRequired),
      screenshot: z.boolean(),
      baseUrl: z.string(),
      authType: z.enum(['none', 'cookies', 'script']),
      cookiesJson: z.string(),
      scriptPath: z.string(),
    })
    .superRefine((data, ctx) => {
      if (!data.screenshot) return;

      if (!data.baseUrl.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: msg.serverUrlRequired,
          path: ['baseUrl'],
        });
      }
      if (data.authType === 'cookies' && !data.cookiesJson.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: msg.cookiesRequired,
          path: ['cookiesJson'],
        });
      }
      if (data.authType === 'script') {
        const p = data.scriptPath.trim();
        if (!p) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: msg.scriptRequired,
            path: ['scriptPath'],
          });
        } else if (!/\.(js|mjs|cjs)$/i.test(p)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: msg.scriptExtension,
            path: ['scriptPath'],
          });
        }
      }
    });
}
