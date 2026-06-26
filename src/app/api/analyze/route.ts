import { NextRequest } from 'next/server';

import fs from 'fs/promises';
import path from 'path';

import { type FlowEdge, type ParamSet, analyzeProject } from '@/lib/analyzer';
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

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: '요청 본문이 올바른 JSON이 아닙니다.' }, { status: 400 });
  }

  const { path: projectPath, screenshot, baseUrl, auth } = body;

  if (!projectPath) {
    return Response.json({ error: 'path 필드가 필요합니다.' }, { status: 400 });
  }

  const normalizedPath = normalizePath(projectPath);

  if (screenshot && !baseUrl) {
    return Response.json(
      { error: 'screenshot 사용 시 baseUrl 필드가 필요합니다.' },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        let parsedAuth: AuthOptions | undefined;
        if (auth?.type === 'script') {
          const relScript = auth.scriptPath.replace(/^[/\\]+/, '');
          parsedAuth = { type: 'script', scriptPath: path.join(normalizedPath, relScript) };
        } else if (auth) {
          parsedAuth = parseAuth(auth);
        }

        const [graph, session, defaultParams] = await Promise.all([
          analyzeProject(normalizedPath, (done, total, currentFile) =>
            send({ type: 'progress', done, total, currentFile }),
          ),
          screenshot && baseUrl
            ? setupBrowserSession({ baseUrl, auth: parsedAuth })
            : Promise.resolve(null),
          fs
            .readFile(path.join(normalizedPath, '.shiny-flow', 'params.json'), 'utf-8')
            .then((raw) => JSON.parse(raw) as Record<string, ParamSet | ParamSet[]>)
            .catch(() => undefined),
        ]);

        if (defaultParams) {
          graph.defaultParams = defaultParams;

          // Expand required catch-all ([...slug]) nodes into concrete nodes from params
          const patternToConcreteIds = new Map<string, string[]>();
          graph.nodes = graph.nodes.flatMap((n) => {
            if (!/\[\.\.\.([^\]]+)\]/.test(n.id)) return [n];
            const entry = defaultParams[n.id];
            if (!entry) return [n]; // no params entry — keep pattern node as-is
            const sets = Array.isArray(entry) ? entry : [entry];
            const concreteIds: string[] = [];
            const expanded = sets.map((set) => {
              const id = n.id.replace(/\[\.{0,3}([^\]]+)\]/g, (_, key) => set[key] ?? `[${key}]`);
              concreteIds.push(id);
              return { ...n, id, label: id };
            });
            patternToConcreteIds.set(n.id, concreteIds);
            return expanded;
          });

          // Deduplicate: expanded concrete nodes may collide with phantom nodes that
          // were created from links pointing to the same concrete path.
          // Keep the real node (filePath !== '') over the phantom.
          const nodeById = new Map<string, (typeof graph.nodes)[0]>();
          for (const n of graph.nodes) {
            if (!nodeById.has(n.id) || n.filePath !== '') nodeById.set(n.id, n);
          }
          graph.nodes = [...nodeById.values()];

          if (patternToConcreteIds.size > 0) {
            graph.edges = graph.edges.flatMap((e) => {
              const sources = patternToConcreteIds.get(e.source);
              const target = patternToConcreteIds.get(e.target)?.[0] ?? e.target;
              if (sources) {
                return sources.map((source, i) => ({
                  ...e,
                  id: i === 0 ? e.id : `${e.id}__${i}`,
                  source,
                  target,
                }));
              }
              return [{ ...e, target }];
            });
          }
        }

        if (screenshot && baseUrl && session) {
          try {
            const resolvedToOriginal = new Map<string, string>();
            const routes = graph.nodes.map((n) => {
              const entry = defaultParams?.[n.id];
              const params = Array.isArray(entry) ? entry[0] : entry;
              // Substitute [id] segments (required catch-alls are already expanded above)
              let resolved = params
                ? n.id.replace(/\[\.{0,3}([^\]]+)\]/g, (_, key) => params[key] ?? `[${key}]`)
                : n.id;
              // Append [[...key]] optional catch-all value
              const catchAllKey = n.filePath
                .replace(/\\/g, '/')
                .match(/\[\[\.\.\.([^\]]+)\]\]/)?.[1];
              if (catchAllKey && params) {
                const val = params[catchAllKey]?.trim();
                if (val) resolved = `${resolved}/${val}`;
              }
              if (resolved !== n.id) resolvedToOriginal.set(resolved, n.id);
              return resolved;
            });

            const screenshots = await captureRoutesOnPage(session.page, routes, baseUrl, {
              onProgress: (done, total, currentRoute) =>
                send({ type: 'screenshotProgress', done, total, currentRoute }),
            });

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

        send({ type: 'result', graph });
      } catch (err) {
        const message =
          err instanceof ServerUnavailableError
            ? err.message
            : err instanceof Error
              ? err.message
              : '알 수 없는 오류';
        send({ type: 'error', message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
