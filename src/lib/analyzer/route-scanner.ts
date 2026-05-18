import fs from 'fs';
import path from 'path';

export type RouteEntry = {
  route: string;
  filePath: string;
};

const PAGE_FILES = ['page.tsx', 'page.ts', 'page.jsx', 'page.js'];

export function scanRoutes(projectPath: string): RouteEntry[] {
  const appDir = path.join(projectPath, 'src', 'app');
  const fallbackAppDir = path.join(projectPath, 'app');

  const resolvedAppDir = fs.existsSync(appDir) ? appDir : fallbackAppDir;

  if (!fs.existsSync(resolvedAppDir)) return [];

  return collectRoutes(resolvedAppDir, resolvedAppDir);
}

function collectRoutes(appDir: string, currentDir: string): RouteEntry[] {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  const results: RouteEntry[] = [];

  const pageFile = entries.find(
    (e) => e.isFile() && PAGE_FILES.includes(e.name),
  );

  if (pageFile) {
    const absoluteFilePath = path.join(currentDir, pageFile.name);
    const route = dirToRoute(appDir, currentDir);
    results.push({ route, filePath: absoluteFilePath });
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    // (group), _private, @parallel 등 라우팅에 영향 없는 디렉토리 처리
    const isRouteGroup = entry.name.startsWith('(') && entry.name.endsWith(')');
    const isPrivate = entry.name.startsWith('_');
    const isParallel = entry.name.startsWith('@');

    if (isPrivate) continue;

    const subDir = path.join(currentDir, entry.name);
    const subRoutes = collectRoutes(appDir, subDir);

    // 라우트 그룹은 URL에 포함되지 않으므로 그대로 올림
    if (isRouteGroup || isParallel) {
      results.push(...subRoutes);
    } else {
      results.push(...subRoutes);
    }
  }

  return results;
}

function dirToRoute(appDir: string, dirPath: string): string {
  const relative = path.relative(appDir, dirPath);
  if (!relative) return '/';

  const segments = relative.split(path.sep).filter((seg) => {
    // 라우트 그룹 (group) 은 URL에서 제거
    if (seg.startsWith('(') && seg.endsWith(')')) return false;
    // @slot 은 URL에서 제거
    if (seg.startsWith('@')) return false;
    return true;
  });

  return '/' + segments.join('/');
}
