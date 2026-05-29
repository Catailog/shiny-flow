import { cpSync, existsSync } from 'fs';
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

console.log('Standalone static files copied.');
