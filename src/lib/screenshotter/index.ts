import { chromium } from 'playwright';

export type ScreenshotResult = {
  route: string;
  imageBase64: string;
};

export type ScreenshotOptions = {
  baseUrl: string;
  routes: string[];
  viewportWidth?: number;
  viewportHeight?: number;
  waitUntil?: 'load' | 'networkidle' | 'domcontentloaded';
  timeoutMs?: number;
};

export async function captureScreenshots({
  baseUrl,
  routes,
  viewportWidth = 1280,
  viewportHeight = 800,
  waitUntil = 'networkidle',
  timeoutMs = 10000,
}: ScreenshotOptions): Promise<ScreenshotResult[]> {
  const browser = await chromium.launch();
  const results: ScreenshotResult[] = [];

  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: viewportWidth, height: viewportHeight });

    for (const route of routes) {
      try {
        const url = `${baseUrl.replace(/\/$/, '')}${route}`;
        await page.goto(url, { waitUntil, timeout: timeoutMs });

        const buffer = await page.screenshot({ type: 'png' });
        results.push({
          route,
          imageBase64: buffer.toString('base64'),
        });
      } catch {
        // 캡처 실패 시 해당 라우트는 건너뜀 (인증 필요 페이지 등)
      }
    }
  } finally {
    await browser.close();
  }

  return results;
}
