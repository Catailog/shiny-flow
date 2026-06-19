import fs from 'fs';
import path from 'path';

export type RouteEntry = {
  route: string;
  filePath: string;
};

const PAGE_FILES = ['page.tsx', 'page.ts', 'page.jsx', 'page.js'];
const LAYOUT_FILES = ['layout.tsx', 'layout.ts', 'layout.jsx', 'layout.js'];

export function scanLayouts(projectPath: string): RouteEntry[] {
  const appDir = path.join(projectPath, 'src', 'app');
  const fallbackAppDir = path.join(projectPath, 'app');
  const resolvedAppDir = fs.existsSync(appDir) ? appDir : fallbackAppDir;
  if (!fs.existsSync(resolvedAppDir)) return [];
  return collectLayouts(resolvedAppDir, resolvedAppDir);
}

function collectLayouts(appDir: string, currentDir: string): RouteEntry[] {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  const results: RouteEntry[] = [];

  const layoutFile = entries.find((e) => e.isFile() && LAYOUT_FILES.includes(e.name));
  if (layoutFile) {
    results.push({
      route: dirToRoute(appDir, currentDir),
      filePath: path.join(currentDir, layoutFile.name),
    });
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('_')) continue;
    results.push(...collectLayouts(appDir, path.join(currentDir, entry.name)));
  }

  return results;
}

export function scanRoutes(projectPath: string): RouteEntry[] {
  const appDir = path.join(projectPath, 'src', 'app');
  const fallbackAppDir = path.join(projectPath, 'app');

  const resolvedAppDir = fs.existsSync(appDir) ? appDir : fallbackAppDir;

  if (!fs.existsSync(resolvedAppDir)) return [];

  const routes = collectRoutes(resolvedAppDir, resolvedAppDir);
  // [[...slug]] 디렉토리가 부모 page.tsx와 동일한 route로 정규화될 때 중복 제거 (부모 우선)
  const seen = new Set<string>();
  return routes.filter((r) => {
    if (seen.has(r.route)) return false;
    seen.add(r.route);
    return true;
  });
}

function collectRoutes(appDir: string, currentDir: string): RouteEntry[] {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  const results: RouteEntry[] = [];

  const pageFile = entries.find((e) => e.isFile() && PAGE_FILES.includes(e.name));

  if (pageFile) {
    const absoluteFilePath = path.join(currentDir, pageFile.name);
    const route = dirToRoute(appDir, currentDir);
    results.push({ route, filePath: absoluteFilePath });
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const isPrivate = entry.name.startsWith('_');
    // @slot 은 URL 세그먼트가 아니므로 하위 page가 부모 route와 중복 등록됨 → 건너뜀
    const isParallel = entry.name.startsWith('@');
    // (.)seg, (..)seg, (..)(..)seg, (...)seg 형태 — '(' 시작이지만 ')'로 끝나지 않음
    const isIntercepting = entry.name.startsWith('(') && !entry.name.endsWith(')');

    if (isPrivate || isParallel || isIntercepting) continue;

    // (group) 은 dirToRoute에서 URL 세그먼트가 제거되므로 그대로 재귀
    results.push(...collectRoutes(appDir, path.join(currentDir, entry.name)));
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
    // [[...slug]] optional catch-all — 세그먼트 자체가 옵션이므로 부모 경로로 정규화
    if (seg.startsWith('[[') && seg.endsWith(']]')) return false;
    return true;
  });

  return '/' + segments.join('/');
}
