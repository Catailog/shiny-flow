import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const standalone = join(root, '.next', 'standalone');

cpSync(join(root, '.next', 'static'), join(standalone, '.next', 'static'), {
  recursive: true,
});

const publicDir = join(root, 'public');
if (existsSync(publicDir)) {
  cpSync(publicDir, join(standalone, 'public'), { recursive: true });
}

// Next.js NFT(Node File Tracing)가 동적 require로 참조되는 파일을 누락하는 경우 보완.
// standalone에 없는 파일을 project node_modules에서 직접 복사한다.
const nftMissing = [
  // playwright-core가 런타임에 동적으로 require하는 파일
  join('playwright-core', 'browsers.json'),
];
for (const rel of nftMissing) {
  const src = join(root, 'node_modules', rel);
  const dst = join(standalone, 'node_modules', rel);
  if (existsSync(src) && !existsSync(dst)) {
    cpSync(src, dst);
    console.log(`Copied missing: ${rel}`);
  }
}

// Turbopack이 external 패키지를 "pkgname-<hex16>" 형태의 해시 이름으로 참조하는 버그 대응.
// 빌드된 청크에서 해시 이름을 찾아 실제 패키지로 연결하는 심 모듈을 생성한다.
const chunksDir = join(standalone, '.next', 'server', 'chunks');
const shimmed = new Set();

if (existsSync(chunksDir)) {
  for (const file of readdirSync(chunksDir)) {
    if (!file.endsWith('.js')) continue;
    const content = readFileSync(join(chunksDir, file), 'utf8');
    for (const [, pkg, hash] of content.matchAll(
      /"([@a-zA-Z][a-zA-Z0-9@/_.-]*)-([a-f0-9]{16})"/g,
    )) {
      const hashedName = `${pkg}-${hash}`;
      if (shimmed.has(hashedName)) continue;
      if (!existsSync(join(standalone, 'node_modules', pkg))) continue;
      const shimDir = join(standalone, 'node_modules', hashedName);
      mkdirSync(shimDir, { recursive: true });
      writeFileSync(
        join(shimDir, 'package.json'),
        JSON.stringify({ name: hashedName, version: '1.0.0', main: 'index.js' }),
      );
      writeFileSync(join(shimDir, 'index.js'), `module.exports = require('${pkg}');\n`);
      shimmed.add(hashedName);
      console.log(`Shimmed: ${hashedName} -> ${pkg}`);
    }
  }
}

console.log('Standalone static files copied.');
