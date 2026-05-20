import { NextRequest, NextResponse } from 'next/server';

import {
  type AuthBody,
  ServerUnavailableError,
  captureScreenshots,
  parseAuth,
} from '@/lib/screenshotter';

type RequestBody = {
  baseUrl: string;
  route: string;
  auth?: AuthBody;
};

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON이 아닙니다.' }, { status: 400 });
  }

  const { baseUrl, route, auth } = body;

  if (!baseUrl || !route) {
    return NextResponse.json({ error: 'baseUrl과 route가 필요합니다.' }, { status: 400 });
  }

  try {
    // 1차 시도: 인증 없이 캡처
    const first = await captureScreenshots({ baseUrl, routes: [route] });
    const firstResult = first[0];

    // 리다이렉트되지 않았거나 auth가 없으면 그대로 반환
    if (!firstResult?.redirected || !auth) {
      if (!firstResult) return NextResponse.json({ error: '스크린샷 캡처 실패' }, { status: 500 });
      return NextResponse.json(firstResult);
    }

    // 2차 시도: 리다이렉트 감지 → auth로 로그인 후 재캡처
    const parsedAuth = parseAuth(auth);
    const retry = await captureScreenshots({ baseUrl, routes: [route], auth: parsedAuth });
    const retryResult = retry[0];

    if (!retryResult || retryResult.redirected) {
      return NextResponse.json(retryResult ?? firstResult);
    }

    // 재캡처 성공 → 1차 시도(리다이렉트 대상) 스크린샷도 함께 반환
    return NextResponse.json({
      ...retryResult,
      redirectedImageBase64: firstResult.imageBase64,
    });
  } catch (err) {
    if (err instanceof ServerUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
