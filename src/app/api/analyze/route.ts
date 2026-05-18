import { NextRequest, NextResponse } from 'next/server';

import { analyzeProject } from '@/lib/analyzer';

export async function GET(req: NextRequest) {
  const projectPath = req.nextUrl.searchParams.get('path');

  if (!projectPath) {
    return NextResponse.json({ error: 'path 파라미터가 필요합니다.' }, { status: 400 });
  }

  try {
    const graph = await analyzeProject(projectPath);
    return NextResponse.json(graph);
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
