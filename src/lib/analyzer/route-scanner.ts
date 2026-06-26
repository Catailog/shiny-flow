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
  // Deduplicate when [[...slug]] normalizes to the same route as its parent page.tsx (parent wins)
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
    // @slot is not a URL segment — its child pages would duplicate the parent route
    const isParallel = entry.name.startsWith('@');
    // Intercepting routes: (.)seg, (..)seg, (..)(..)seg — start with '(' but do not end with ')'
    const isIntercepting = entry.name.startsWith('(') && !entry.name.endsWith(')');

    if (isPrivate || isParallel || isIntercepting) continue;

    // Route groups are stripped by dirToRoute, so recurse normally
    results.push(...collectRoutes(appDir, path.join(currentDir, entry.name)));
  }

  return results;
}

function dirToRoute(appDir: string, dirPath: string): string {
  const relative = path.relative(appDir, dirPath);
  if (!relative) return '/';

  const segments = relative.split(path.sep).filter((seg) => {
    // Strip route group segment
    if (seg.startsWith('(') && seg.endsWith(')')) return false;
    // Strip parallel route (@slot) segment
    if (seg.startsWith('@')) return false;
    // [[...slug]] optional catch-all — segment is optional, normalize to parent path
    if (seg.startsWith('[[') && seg.endsWith(']]')) return false;
    return true;
  });

  return '/' + segments.join('/');
}
