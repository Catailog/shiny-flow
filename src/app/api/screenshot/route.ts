import { NextRequest, NextResponse } from 'next/server';

import path from 'path';

import {
  type AuthBody,
  type AuthOptions,
  ServerUnavailableError,
  captureScreenshots,
  parseAuth,
} from '@/lib/screenshotter';
import { normalizePath } from '@/lib/utils';

type RequestBody = {
  baseUrl: string;
  route: string;
  auth?: AuthBody;
  projectPath?: string;
};

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON이 아닙니다.' }, { status: 400 });
  }

  const { baseUrl, route, auth, projectPath } = body;

  if (!baseUrl || !route) {
    return NextResponse.json({ error: 'baseUrl과 route가 필요합니다.' }, { status: 400 });
  }

  let parsedAuth: AuthOptions | undefined;
  if (auth) {
    if (auth.type === 'script' && projectPath) {
      const relScript = auth.scriptPath.replace(/^[/\\]+/, '');
      parsedAuth = { type: 'script', scriptPath: path.join(normalizePath(projectPath), relScript) };
    } else {
      parsedAuth = parseAuth(auth);
    }
  }

  try {
    const results = await captureScreenshots({ baseUrl, routes: [route], auth: parsedAuth });
    const result = results[0];
    if (!result) return NextResponse.json({ error: '스크린샷 캡처 실패' }, { status: 500 });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ServerUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
