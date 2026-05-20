import { NextRequest, NextResponse } from 'next/server';

import { analyzeProject } from '@/lib/analyzer';
import {
  type AuthBody,
  ServerUnavailableError,
  captureScreenshots,
  parseAuth,
} from '@/lib/screenshotter';

type RequestBody = {
  path: string;
  screenshot?: boolean;
  baseUrl?: string;
  auth?: AuthBody;
};

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON이 아닙니다.' }, { status: 400 });
  }

  const { path: projectPath, screenshot, baseUrl, auth } = body;

  if (!projectPath) {
    return NextResponse.json({ error: 'path 필드가 필요합니다.' }, { status: 400 });
  }

  // 백슬래시를 슬래시로 정규화 (Windows 경로 URL 입력 대응)
  const normalizedPath = projectPath.replace(/\\/g, '/');

  if (screenshot && !baseUrl) {
    return NextResponse.json(
      { error: 'screenshot 사용 시 baseUrl 필드가 필요합니다.' },
      { status: 400 },
    );
  }

  try {
    const graph = await analyzeProject(normalizedPath);

    if (screenshot && baseUrl) {
      const routes = graph.nodes.map((n) => n.id);
      const parsedAuth = auth ? parseAuth(auth) : undefined;
      const screenshots = await captureScreenshots({ baseUrl, routes, auth: parsedAuth });

      const screenshotMap = new Map(screenshots.map((s) => [s.route, s]));
      graph.nodes = graph.nodes.map((node) => {
        const s = screenshotMap.get(node.id);
        return { ...node, screenshot: s?.imageBase64, redirected: s?.redirected };
      });
    }

    return NextResponse.json(graph);
  } catch (err) {
    if (err instanceof ServerUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
