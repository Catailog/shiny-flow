import type { Browser, Page } from 'playwright';
import { pathToFileURL } from 'url';

export type ScreenshotResult = {
  route: string;
  imageBase64: string;
  redirected: boolean;
  redirectedTo?: string;
};

export type PlaywrightCookie = {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  url?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
};

export type AuthOptions =
  | { type: 'cookies'; cookies: PlaywrightCookie[] }
  | { type: 'script'; scriptPath: string };

// Wire format sent from client / API body
export type AuthBody =
  | { type: 'cookies'; cookiesJson: string }
  | { type: 'script'; scriptPath: string };

export function parseAuth(auth: AuthBody): AuthOptions | undefined {
  if (auth.type === 'cookies') {
    try {
      const cookies = JSON.parse(auth.cookiesJson);
      if (!Array.isArray(cookies)) return undefined;
      return { type: 'cookies', cookies };
    } catch {
      return undefined;
    }
  }
}

export type SessionOptions = {
  baseUrl: string;
  auth?: AuthOptions;
  viewportWidth?: number;
  viewportHeight?: number;
  deviceScaleFactor?: number;
  waitUntil?: 'load' | 'networkidle' | 'domcontentloaded';
  timeoutMs?: number;
};

export type ScreenshotOptions = SessionOptions & { routes: string[] };

export type BrowserSession = {
  browser: Browser;
  page: Page;
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

// Launches browser, applies auth, and returns the authenticated session.
// Caller is responsible for closing browser.close() when done.
export async function setupBrowserSession({
  baseUrl,
  auth,
  viewportWidth = 1280,
  viewportHeight = 800,
  deviceScaleFactor = 2,
  waitUntil = 'networkidle',
  timeoutMs = 30000,
}: SessionOptions): Promise<BrowserSession> {
  await checkServerAvailable(baseUrl, 5000);

  // eslint-disable-next-line no-eval
  const { chromium } = eval('require')('playwright') as typeof import('playwright');
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ deviceScaleFactor });

    if (auth?.type === 'cookies') {
      await context.addCookies(auth.cookies);
    }

    const page = await context.newPage();
    await page.setViewportSize({ width: viewportWidth, height: viewportHeight });

    if (auth?.type === 'script') {
      const mod = await import(/* webpackIgnore: true */ pathToFileURL(auth.scriptPath).href);
      const authFn: unknown = mod.default ?? mod;
      if (typeof authFn !== 'function') {
        throw new Error('shiny-flow.auth.js가 함수를 export하지 않습니다.');
      }
      await authFn(page, baseUrl);
    }

    return { browser, page };
  } catch (e) {
    await browser.close();
    throw e;
  }
}

export async function captureRoutesOnPage(
  page: Page,
  routes: string[],
  baseUrl: string,
  { waitUntil = 'networkidle' }: Pick<SessionOptions, 'waitUntil'> = {},
): Promise<ScreenshotResult[]> {
  const results: ScreenshotResult[] = [];

  for (const route of routes) {
    try {
      const url = `${baseUrl.replace(/\/$/, '')}${route}`;
      await page.goto(url, { waitUntil, timeout: 0 });

      const finalUrl = new URL(page.url());
      const redirected = finalUrl.pathname !== new URL(url).pathname;
      const buffer = await page.screenshot({ type: 'png', fullPage: true });
      results.push({
        route,
        imageBase64: buffer.toString('base64'),
        redirected,
        redirectedTo: redirected ? finalUrl.pathname : undefined,
      });
    } catch {
      // 캡처 실패 시 해당 라우트는 건너뜀
    }
  }

  return results;
}

export async function captureScreenshots({
  routes,
  ...sessionOptions
}: ScreenshotOptions): Promise<ScreenshotResult[]> {
  const { browser, page } = await setupBrowserSession(sessionOptions);
  try {
    return await captureRoutesOnPage(page, routes, sessionOptions.baseUrl, sessionOptions);
  } finally {
    await browser.close();
  }
}
