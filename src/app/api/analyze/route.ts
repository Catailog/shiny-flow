import { NextRequest, NextResponse } from 'next/server';

import fs from 'fs/promises';
import path from 'path';

import { type FlowEdge, analyzeProject } from '@/lib/analyzer';
import {
  type AuthBody,
  type AuthOptions,
  ServerUnavailableError,
  captureRoutesOnPage,
  parseAuth,
  setupBrowserSession,
} from '@/lib/screenshotter';
import { normalizePath } from '@/lib/utils';

type RequestBody = {
  path: string;
  screenshot?: boolean;
  baseUrl?: string;
  auth?: AuthBody;
};

export const maxDuration = 3600;

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

  const normalizedPath = normalizePath(projectPath);

  if (screenshot && !baseUrl) {
    return NextResponse.json(
      { error: 'screenshot 사용 시 baseUrl 필드가 필요합니다.' },
      { status: 400 },
    );
  }

  try {
    let parsedAuth: AuthOptions | undefined;
    if (auth?.type === 'script') {
      const relScript = auth.scriptPath.replace(/^[/\\]+/, '');
      parsedAuth = { type: 'script', scriptPath: path.join(normalizedPath, relScript) };
    } else if (auth) {
      parsedAuth = parseAuth(auth);
    }

    // analyzeProject, 브라우저 세션 셋업, params.json 로드를 병렬로 실행
    const [graph, session, defaultParams] = await Promise.all([
      analyzeProject(normalizedPath),
      screenshot && baseUrl
        ? setupBrowserSession({ baseUrl, auth: parsedAuth })
        : Promise.resolve(null),
      fs
        .readFile(path.join(normalizedPath, '.shiny-flow', 'params.json'), 'utf-8')
        .then((raw) => JSON.parse(raw) as Record<string, Record<string, string>>)
        .catch(() => undefined),
    ]);

    if (defaultParams) graph.defaultParams = defaultParams;

    if (screenshot && baseUrl && session) {
      try {
        // 동적 라우트를 defaultParams로 치환, 역매핑 보관
        const resolvedToOriginal = new Map<string, string>();
        const routes = graph.nodes.map((n) => {
          const params = defaultParams?.[n.id];
          if (!params) return n.id;
          const resolved = n.id.replace(/\[([^\]]+)\]/g, (_, p) => {
            const key = p.replace(/^\.\.\./, '');
            return params[key] || `[${p}]`;
          });
          if (resolved !== n.id) resolvedToOriginal.set(resolved, n.id);
          return resolved;
        });

        const screenshots = await captureRoutesOnPage(session.page, routes, baseUrl);

        const screenshotMap = new Map(
          screenshots.map((s) => [resolvedToOriginal.get(s.route) ?? s.route, s]),
        );
        graph.nodes = graph.nodes.map((node) => {
          const s = screenshotMap.get(node.id);
          return { ...node, screenshot: s?.imageBase64, redirected: s?.redirected };
        });

        const nodeIds = new Set(graph.nodes.map((n) => n.id));
        const existingPairs = new Set(graph.edges.map((e) => `${e.source}→${e.target}`));
        const redirectEdges: FlowEdge[] = [];
        for (const s of screenshots) {
          if (!s.redirectedTo) continue;
          const source = resolvedToOriginal.get(s.route) ?? s.route;
          const target = s.redirectedTo;
          if (!nodeIds.has(source) || !nodeIds.has(target)) continue;
          const pair = `${source}→${target}`;
          if (existingPairs.has(pair)) continue;
          redirectEdges.push({
            id: `redirect:${source}→${target}`,
            source,
            target,
            trigger: 'redirect',
            sourceFile: '',
            sourceLine: 0,
          });
          existingPairs.add(pair);
        }
        graph.edges = [...graph.edges, ...redirectEdges];
      } finally {
        await session.browser.close();
      }
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
