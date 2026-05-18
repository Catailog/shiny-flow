import { NextRequest, NextResponse } from 'next/server';

import { analyzeProject } from '@/lib/analyzer';
import { captureScreenshots } from '@/lib/screenshotter';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const projectPath = searchParams.get('path');
  const screenshot = searchParams.get('screenshot') === 'true';
  const baseUrl = searchParams.get('baseUrl');

  if (!projectPath) {
    return NextResponse.json({ error: 'path 파라미터가 필요합니다.' }, { status: 400 });
  }

  if (screenshot && !baseUrl) {
    return NextResponse.json(
      { error: 'screenshot=true 사용 시 baseUrl 파라미터가 필요합니다.' },
      { status: 400 },
    );
  }

  try {
    const graph = await analyzeProject(projectPath);

    if (screenshot && baseUrl) {
      const routes = graph.nodes.map((n) => n.id);
      const screenshots = await captureScreenshots({ baseUrl, routes });

      const screenshotMap = new Map(screenshots.map((s) => [s.route, s.imageBase64]));
      graph.nodes = graph.nodes.map((node) => ({
        ...node,
        screenshot: screenshotMap.get(node.id),
      }));
    }

    return NextResponse.json(graph);
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
