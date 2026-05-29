#!/usr/bin/env node

const nodePath = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const args = process.argv.slice(2);

if (args[0] === 'init') {
  const authSnippet = `// shiny-flow.auth.js
// 이 파일을 수정해서 프로젝트의 로그인 로직을 작성하세요.
// npx shiny-flow . -s 실행 시 자동으로 불러옵니다.

/**
 * @param {import('playwright').Page} page
 * @param {string} baseUrl  예: 'http://localhost:3000'
 */
module.exports = async function authenticate(page, baseUrl) {
  await page.goto(baseUrl + '/login');
  await page.fill('#email', 'your@email.com');
  await page.fill('#password', 'yourpassword');
  await page.click('button[type=submit]');
  // 로그인 후 이동할 페이지를 기다립니다
  await page.waitForURL('**/dashboard');
};
`;

  const authFile = nodePath.join(process.cwd(), 'shiny-flow.auth.js');
  if (fs.existsSync(authFile)) {
    console.log('shiny-flow.auth.js already exists, skipping.');
  } else {
    fs.writeFileSync(authFile, authSnippet);
    console.log('Created shiny-flow.auth.js');
  }

  const gitignoreFile = nodePath.join(process.cwd(), '.gitignore');
  const entry = 'shiny-flow.auth.js';
  if (fs.existsSync(gitignoreFile)) {
    const content = fs.readFileSync(gitignoreFile, 'utf8');
    if (!content.includes(entry)) {
      fs.appendFileSync(gitignoreFile, `\n# shiny-flow\n${entry}\n`);
      console.log('Added shiny-flow.auth.js to .gitignore');
    } else {
      console.log('.gitignore already includes shiny-flow.auth.js, skipping.');
    }
  } else {
    fs.writeFileSync(gitignoreFile, `# shiny-flow\n${entry}\n`);
    console.log('Created .gitignore with shiny-flow.auth.js');
  }

  process.exit(0);
}

// positional 인자와 named 플래그 분리
const positionalArgs = [];
let i = 0;
while (i < args.length) {
  const arg = args[i];
  if ((arg === '--port' || arg === '-u' || arg === '--url') && i + 1 < args.length) {
    i += 2;
  } else if (arg.startsWith('-')) {
    i += 1;
  } else {
    positionalArgs.push(arg);
    i += 1;
  }
}

const portFlag = args.indexOf('--port');
const preferredPort = portFlag !== -1 ? Number(args[portFlag + 1]) : 3000;

const screenshot = args.includes('-s') || args.includes('--screenshot');

const urlFlag = args.indexOf('-u') !== -1 ? args.indexOf('-u') : args.indexOf('--url');
const targetUrl = urlFlag !== -1 ? args[urlFlag + 1] : 'http://localhost:3000';

const rawProjectPath = positionalArgs[0];
const projectPath = rawProjectPath ? nodePath.resolve(rawProjectPath) : '';

async function main() {
  const { default: getPort } = await import('get-port');
  const port = await getPort({ port: preferredPort });
  const hostname = 'localhost';

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is in use, using ${port} instead.`);
  }

  // 쿼리 파라미터 조립
  const query = new URLSearchParams();
  if (projectPath) query.set('path', projectPath);
  if (screenshot) query.set('screenshot', 'true');
  if (targetUrl) query.set('url', targetUrl);
  const queryString = query.toString() ? `?${query.toString()}` : '';

  process.env.PORT = String(port);
  process.env.HOSTNAME = hostname;
  process.env.NODE_ENV = 'production';

  const serverPath = nodePath.join(__dirname, '..', '.next', 'standalone', 'server.js');

  const server = spawn(process.execPath, [serverPath], {
    env: { ...process.env },
    stdio: ['inherit', 'pipe', 'inherit'],
  });

  let opened = false;
  const openBrowser = () => {
    if (opened) return;
    opened = true;
    import('open').then(({ default: open }) => open(`http://${hostname}:${port}${queryString}`));
  };

  server.stdout.on('data', (data) => {
    process.stdout.write(data);
    const text = data.toString();
    if (text.includes('localhost') || text.includes('Local')) {
      openBrowser();
    }
  });

  // 서버 ready 신호를 못 받은 경우 fallback
  setTimeout(openBrowser, 3000);

  server.on('error', (err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });

  process.on('SIGINT', () => {
    server.kill('SIGINT');
    process.exit(0);
  });
}

main();
