import { type Browser, type Page, chromium } from 'playwright';

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

function toFriendlyAuthError(
  e: unknown,
  auth: {
    loginUrl: string;
    usernameSelector: string;
    passwordSelector: string;
    submitSelector: string;
  },
): Error {
  if (!(e instanceof Error)) return new Error('로그인 처리 중 알 수 없는 오류가 발생했습니다.');

  const locatorMatch = e.message.match(/waiting for locator\('([^']+)'\)/);
  if (locatorMatch) {
    const sel = locatorMatch[1];
    if (sel === auth.usernameSelector)
      return new Error(`아이디 셀렉터를 찾을 수 없습니다: "${sel}"`);
    if (sel === auth.passwordSelector)
      return new Error(`비밀번호 셀렉터를 찾을 수 없습니다: "${sel}"`);
    if (sel === auth.submitSelector)
      return new Error(`제출 버튼 셀렉터를 찾을 수 없습니다: "${sel}"`);
    return new Error(`셀렉터를 찾을 수 없습니다: "${sel}"`);
  }

  if (e.message.includes('Timeout') && e.message.includes('exceeded')) {
    return new Error(`로그인 페이지 응답 시간이 초과되었습니다 (${auth.loginUrl})`);
  }

  return new Error(`로그인 처리 중 오류: ${e.message.split('\n')[0]}`);
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

  const browser = await chromium.launch();
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

      try {
        await page.goto(loginFullUrl, { waitUntil, timeout: timeoutMs });

        const usernameCount = await page.locator(auth.usernameSelector).count();
        if (usernameCount === 0)
          throw new Error(`아이디 셀렉터를 찾을 수 없습니다: "${auth.usernameSelector}"`);
        const passwordCount = await page.locator(auth.passwordSelector).count();
        if (passwordCount === 0)
          throw new Error(`비밀번호 셀렉터를 찾을 수 없습니다: "${auth.passwordSelector}"`);
        const submitCount = await page.locator(auth.submitSelector).count();
        if (submitCount === 0)
          throw new Error(`제출 버튼 셀렉터를 찾을 수 없습니다: "${auth.submitSelector}"`);

        await page.fill(auth.usernameSelector, auth.username, { timeout: timeoutMs });
        await page.fill(auth.passwordSelector, auth.password, { timeout: timeoutMs });
        const loginPageUrl = page.url();
        await Promise.all([
          page.waitForURL((url) => url.href !== loginPageUrl, {
            waitUntil: 'networkidle',
            timeout: timeoutMs,
          }),
          page.click(auth.submitSelector, { timeout: timeoutMs }),
        ]).catch(() => {});
      } catch (e) {
        if (
          e instanceof Error &&
          (e.message.startsWith('아이디 셀렉터를') ||
            e.message.startsWith('비밀번호 셀렉터를') ||
            e.message.startsWith('제출 버튼 셀렉터를'))
        )
          throw e;
        throw toFriendlyAuthError(e, auth);
      }
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
