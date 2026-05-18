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
  deviceScaleFactor?: number;
  waitUntil?: 'load' | 'networkidle' | 'domcontentloaded';
  timeoutMs?: number;
};

export class ServerUnavailableError extends Error {
  constructor(baseUrl: string) {
    super(`${baseUrl} 에 서버가 응답하지 않습니다. dev server가 실행 중인지 확인해주세요.`);
    this.name = 'ServerUnavailableError';
  }
}

async function checkServerAvailable(baseUrl: string, timeoutMs: number): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(baseUrl, { signal: controller.signal });
    if (!res.ok && res.status >= 500) {
      throw new ServerUnavailableError(baseUrl);
    }
  } catch (err) {
    if (err instanceof ServerUnavailableError) throw err;
    throw new ServerUnavailableError(baseUrl);
  } finally {
    clearTimeout(timer);
  }
}

export async function captureScreenshots({
  baseUrl,
  routes,
  viewportWidth = 1280,
  viewportHeight = 800,
  deviceScaleFactor = 2,
  waitUntil = 'networkidle',
  timeoutMs = 10000,
}: ScreenshotOptions): Promise<ScreenshotResult[]> {
  await checkServerAvailable(baseUrl, 5000);

  const browser = await chromium.launch();
  const results: ScreenshotResult[] = [];

  try {
    const context = await browser.newContext({ deviceScaleFactor });
    const page = await context.newPage();
    await page.setViewportSize({ width: viewportWidth, height: viewportHeight });

    for (const route of routes) {
      try {
        const url = `${baseUrl.replace(/\/$/, '')}${route}`;
        await page.goto(url, { waitUntil, timeout: timeoutMs });

        const buffer = await page.screenshot({ type: 'png', fullPage: true });
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
