#!/usr/bin/env node

const nodePath = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const args = process.argv.slice(2);

if (args[0] === 'init') {
  const authSnippet = `// shiny-flow.auth.js
// Edit this file to handle authentication for your project.
// It is automatically loaded when running: npx shiny-flow .

/**
 * Called once before screenshots are taken.
 * Log in here so that all subsequent page visits are authenticated.
 *
 * @param {import('playwright').Page} page - Playwright page object
 * @param {string} baseUrl - Base URL of your dev server, e.g. 'http://localhost:3000'
 */
module.exports = async function authenticate(page, baseUrl) {
  // Navigate to your login page
  await page.goto(baseUrl + '/login');

  // Fill in the username or email field
  // Replace '#email' with the CSS selector for your username input
  await page.fill('#email', 'your@email.com');

  // Fill in the password field
  // Replace '#password' with the CSS selector for your password input
  await page.fill('#password', 'yourpassword');

  // Click the login / submit button
  // Replace 'button[type=submit]' with the CSS selector for your submit button
  await page.click('button[type=submit]');

  // Wait until the browser navigates away from the login page
  // Replace '**/dashboard' with the URL pattern of the page shown after a successful login
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
  const alreadyIgnored =
    fs.existsSync(gitignoreFile) && fs.readFileSync(gitignoreFile, 'utf8').includes(entry);

  if (alreadyIgnored) {
    console.log('.gitignore already includes shiny-flow.auth.js, skipping.');
    process.exit(0);
  }

  const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Add shiny-flow.auth.js to .gitignore? [Y/n] ', (answer) => {
    rl.close();
    if (answer.trim().toLowerCase() === 'n') {
      console.log('Skipped.');
      process.exit(0);
    }
    if (fs.existsSync(gitignoreFile)) {
      fs.appendFileSync(gitignoreFile, `\n# shiny-flow\n${entry}\n`);
    } else {
      fs.writeFileSync(gitignoreFile, `# shiny-flow\n${entry}\n`);
    }
    console.log('Added shiny-flow.auth.js to .gitignore');
    process.exit(0);
  });
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

const urlFlag = args.indexOf('-u') !== -1 ? args.indexOf('-u') : args.indexOf('--url');
const targetUrl = urlFlag !== -1 ? args[urlFlag + 1] : 'http://localhost:3000';

const rawProjectPath = positionalArgs[0];
const projectPath = rawProjectPath ? nodePath.resolve(rawProjectPath) : '';

// path가 주어지면 screenshot 기본값 true
const screenshot = args.includes('-s') || args.includes('--screenshot') || !!rawProjectPath;

// auth 자동 감지: 프로젝트 루트에 shiny-flow.auth.js가 있으면 script, 없으면 none
let authType = 'none';
let scriptPath = 'shiny-flow.auth.js';
if (projectPath && screenshot) {
  const authFile = nodePath.join(projectPath, 'shiny-flow.auth.js');
  if (fs.existsSync(authFile)) {
    authType = 'script';
  } else {
    console.log(`\n[shiny-flow] shiny-flow.auth.js not found in ${projectPath}`);
    console.log('[shiny-flow] Continuing without authentication.\n');
    console.log('[shiny-flow] To set up script authentication:');
    console.log('[shiny-flow]   1. Run `npx shiny-flow init` in your project directory');
    console.log('[shiny-flow]   2. Edit shiny-flow.auth.js with your login logic');
    console.log('[shiny-flow]   3. Re-run `npx shiny-flow .`\n');
    console.log('[shiny-flow] Or open the app and set a custom script path in Auth settings.\n');
  }
}

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
  if (authType !== 'none') {
    query.set('authType', authType);
    query.set('scriptPath', scriptPath);
  }
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
