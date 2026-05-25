import { chromium } from 'playwright';

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
  | {
      type: 'form';
      loginUrl: string;
      usernameSelector: string;
      passwordSelector: string;
      submitSelector: string;
      username: string;
      password: string;
    };

// Wire format sent from client / API body (cookiesJson is raw JSON string)
export type AuthBody =
  | { type: 'cookies'; cookiesJson: string }
  | {
      type: 'form';
      loginUrl: string;
      usernameSelector: string;
      passwordSelector: string;
      submitSelector: string;
      username: string;
      password: string;
    };

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
  if (auth.type === 'form') {
    const { loginUrl, usernameSelector, passwordSelector, submitSelector, username, password } =
      auth;
    return {
      type: 'form',
      loginUrl,
      usernameSelector,
      passwordSelector,
      submitSelector,
      username,
      password,
    } satisfies AuthOptions;
  }
}

export type ScreenshotOptions = {
  baseUrl: string;
  routes: string[];
  auth?: AuthOptions;
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
  auth,
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

    if (auth?.type === 'cookies') {
      await context.addCookies(auth.cookies);
    }

    const page = await context.newPage();
    await page.setViewportSize({ width: viewportWidth, height: viewportHeight });

    if (auth?.type === 'form') {
      const base = baseUrl.replace(/\/$/, '');
      const loginFullUrl = auth.loginUrl.startsWith('http')
        ? auth.loginUrl
        : `${base}${auth.loginUrl.startsWith('/') ? auth.loginUrl : '/' + auth.loginUrl}`;

      await page.goto(loginFullUrl, { waitUntil, timeout: timeoutMs });
      await page.fill(auth.usernameSelector, auth.username);
      await page.fill(auth.passwordSelector, auth.password);
      const loginPageUrl = page.url();
      await Promise.all([
        page.waitForURL((url) => url.href !== loginPageUrl, {
          waitUntil: 'networkidle',
          timeout: timeoutMs,
        }),
        page.click(auth.submitSelector),
      ]).catch(() => {});
    }

    for (const route of routes) {
      try {
        const url = `${baseUrl.replace(/\/$/, '')}${route}`;
        await page.goto(url, { waitUntil, timeout: timeoutMs });

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
  } finally {
    await browser.close();
  }

  return results;
}
