import { z } from 'zod';

export const analyzeSchema = z
  .object({
    path: z.string().min(1, '프로젝트 경로를 입력해주세요.'),
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
        message: '서버 URL을 입력해주세요.',
        path: ['baseUrl'],
      });
    }
    if (data.authType === 'cookies' && !data.cookiesJson.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '쿠키 JSON을 입력해주세요.',
        path: ['cookiesJson'],
      });
    }
  });

export type AnalyzeFormValues = z.infer<typeof analyzeSchema>;
