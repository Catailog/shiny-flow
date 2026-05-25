import fs from 'fs';
import path from 'path';
import { Node, Project, SyntaxKind } from 'ts-morph';

import type { EdgeTrigger, FlowEdge } from './types';

type RawEdge = Omit<FlowEdge, 'id'>;

const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

// tsconfig.json(JSONC) 에서 paths alias 로드
function loadAliases(projectRoot: string): Map<string, string> {
  const aliases = new Map<string, string>();
  const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) return aliases;

  try {
    const raw = fs.readFileSync(tsconfigPath, 'utf-8');
    // JSONC: 주석 제거 + trailing comma 제거
    const stripped = raw
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/,(\s*[}\]])/g, '$1');
    const tsconfig = JSON.parse(stripped);
    const paths: Record<string, string[]> = tsconfig?.compilerOptions?.paths ?? {};

    for (const [alias, targets] of Object.entries(paths)) {
      if (!Array.isArray(targets) || targets.length === 0) continue;
      // "@/*" → "@/"
      const aliasPrefix = alias.endsWith('/*') ? alias.slice(0, -2) : alias;
      // ["./src/*"] → resolved abs path
      const targetRaw = (targets[0] as string).endsWith('/*')
        ? (targets[0] as string).slice(0, -2)
        : (targets[0] as string);
      aliases.set(aliasPrefix, path.resolve(projectRoot, targetRaw));
    }
  } catch {
    // 파싱 실패 시 빈 맵 반환 → resolveImportPath에서 폴백 처리
  }

  return aliases;
}

export function extractEdges(
  entryPoints: { route: string; filePath: string }[],
  projectRoot: string,
): FlowEdge[] {
  const aliases = loadAliases(projectRoot);
  const all: RawEdge[] = [];

  for (const entry of entryPoints) {
    const visited = new Set<string>();
    all.push(...collectEdges(entry.filePath, entry.route, visited, projectRoot, aliases));
  }

  // 같은 source → target → trigger 중복 제거
  const seen = new Set<string>();
  let idx = 0;
  return all
    .filter((e) => {
      const key = `${e.source}|${e.target}|${e.trigger}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((e) => ({ ...e, id: `e${idx++}` }));
}

function collectEdges(
  filePath: string,
  sourceRoute: string,
  visited: Set<string>,
  projectRoot: string,
  aliases: Map<string, string>,
): RawEdge[] {
  const resolved = path.resolve(filePath).replace(/\\/g, '/');
  if (visited.has(resolved)) return [];
  visited.add(resolved);

  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf-8');

  // 'use server' 파일은 CRUD 액션이므로 엣지 탐색 대상에서 제외
  if (/^\s*['"]use server['"]/.test(content)) return [];

  const edges: RawEdge[] = parseFileForEdges(content, filePath, sourceRoute);

  for (const imported of resolveLocalImports(content, filePath, projectRoot, aliases)) {
    edges.push(...collectEdges(imported, sourceRoute, visited, projectRoot, aliases));
  }

  return edges;
}

function parseFileForEdges(content: string, filePath: string, sourceRoute: string): RawEdge[] {
  const project = new Project({ skipAddingFilesFromTsConfig: true });
  const sourceFile = project.createSourceFile('__tmp__.tsx', content, { overwrite: true });
  const edges: RawEdge[] = [];

  // href 배열 패턴 사전 수집: const links = [{href: '/path'}, ...]
  const arrayHrefs: string[] = [];
  sourceFile.forEachDescendant((node) => {
    if (node.getKind() !== SyntaxKind.PropertyAssignment) return;
    if (node.getFirstChild()?.getText() !== 'href') return;
    const val = extractStringValue(node.getLastChild());
    if (val?.startsWith('/')) arrayHrefs.push(val);
  });

  sourceFile.forEachDescendant((node) => {
    const kind = node.getKind();

    // <Link href="...">
    if (kind === SyntaxKind.JsxOpeningElement || kind === SyntaxKind.JsxSelfClosingElement) {
      const tagName = node.getFirstChildByKind(SyntaxKind.Identifier)?.getText();
      if (tagName !== 'Link') return;

      const hrefAttr = node
        .getChildrenOfKind(SyntaxKind.JsxAttributes)[0]
        ?.getChildrenOfKind(SyntaxKind.JsxAttribute)
        .find((attr) => attr.getFirstChild()?.getText() === 'href');

      if (!hrefAttr) return;

      const href = extractStringValue(hrefAttr.getLastChild());
      if (href?.startsWith('/')) {
        edges.push({
          source: sourceRoute,
          target: href,
          trigger: 'link',
          sourceFile: filePath,
          sourceLine: node.getStartLineNumber(),
          label: extractLinkText(node),
        });
      } else if (!href && arrayHrefs.length > 0) {
        // 변수 참조 href (ex. link.href) — 사전 수집한 href 배열로 대체
        for (const h of arrayHrefs) {
          edges.push({
            source: sourceRoute,
            target: h,
            trigger: 'link',
            sourceFile: filePath,
            sourceLine: node.getStartLineNumber(),
          });
        }
      }
      return;
    }

    // router.push / router.replace / redirect
    if (kind === SyntaxKind.CallExpression && Node.isCallExpression(node)) {
      const exprText = node.getExpression().getText();

      const triggerMap: Record<string, EdgeTrigger> = {
        'router.push': 'router.push',
        'router.replace': 'router.push',
        redirect: 'redirect',
      };

      const trigger = triggerMap[exprText];
      if (!trigger) return;

      const firstArg = node.getArguments()[0];
      if (!firstArg) return;

      const target = extractStringValue(firstArg);
      if (!target || !target.startsWith('/')) return;

      edges.push({
        source: sourceRoute,
        target,
        trigger,
        sourceFile: filePath,
        sourceLine: node.getStartLineNumber(),
      });
    }
  });

  return edges;
}

function extractStringValue(node: Node | undefined): string | undefined {
  if (!node) return undefined;
  if (node.getKind() === SyntaxKind.StringLiteral) {
    return node.getText().replace(/^['"]|['"]$/g, '');
  }
  if (node.getKind() === SyntaxKind.JsxExpression) {
    const inner = node.getFirstChildByKind(SyntaxKind.StringLiteral);
    if (inner) return inner.getText().replace(/^['"]|['"]$/g, '');
  }
  return undefined;
}

function extractLinkText(node: Node): string | undefined {
  const parent = node.getParent();
  if (!parent) return undefined;
  return parent
    .getDescendantsOfKind(SyntaxKind.JsxText)
    .map((n) => n.getText().trim())
    .find(Boolean);
}

function resolveLocalImports(
  content: string,
  fromFile: string,
  projectRoot: string,
  aliases: Map<string, string>,
): string[] {
  const results: string[] = [];
  const regex = /from\s+['"]([^'"]+)['"]/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const spec = match[1];
    const resolved = resolveImportPath(spec, fromFile, projectRoot, aliases);
    if (resolved) results.push(resolved);
  }

  return results;
}

function resolveImportPath(
  spec: string,
  fromFile: string,
  projectRoot: string,
  aliases: Map<string, string>,
): string | null {
  let bases: string[] = [];

  if (spec.startsWith('./') || spec.startsWith('../')) {
    bases = [path.resolve(path.dirname(fromFile), spec)];
  } else {
    // alias 매핑에서 가장 긴 prefix 매칭
    let matched = false;
    for (const [aliasPrefix, resolvedBase] of aliases) {
      if (spec === aliasPrefix || spec.startsWith(aliasPrefix + '/')) {
        const rest = spec.slice(aliasPrefix.length);
        bases = [path.join(resolvedBase, rest)];
        matched = true;
        break;
      }
    }
    if (!matched) {
      // tsconfig 없거나 매핑 실패 → @/ 폴백: src/ 와 루트 둘 다 시도
      if (spec.startsWith('@/')) {
        bases = [
          path.join(projectRoot, 'src', spec.slice(2)),
          path.join(projectRoot, spec.slice(2)),
        ];
      } else {
        return null; // 외부 패키지
      }
    }
  }

  for (const base of bases) {
    for (const ext of EXTENSIONS) {
      const p = base + ext;
      if (fs.existsSync(p)) return p;
    }
    for (const ext of EXTENSIONS) {
      const p = path.join(base, 'index' + ext);
      if (fs.existsSync(p)) return p;
    }
  }

  return null;
}
