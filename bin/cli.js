#!/usr/bin/env node

const nodePath = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const args = process.argv.slice(2);

// ─── 플래그 파싱 헬퍼 ────────────────────────────────────────────────────────

function flagValue(aliases) {
  for (const alias of aliases) {
    const idx = args.indexOf(alias);
    if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  }
  return null;
}

function hasFlag(aliases) {
  return aliases.some((a) => args.includes(a));
}

// ─── 버전 ────────────────────────────────────────────────────────────────────

if (hasFlag(['--version', '-v'])) {
  const { version } = require('../package.json');
  console.log(version);
  process.exit(0);
}

// ─── 언어 감지 (전체 공통) ───────────────────────────────────────────────────

const lang = flagValue(['--lang', '-l']) ?? 'en';

// ─── 메시지 ──────────────────────────────────────────────────────────────────

const MESSAGES = {
  en: {
    init: {
      overwritePrompt: 'shiny-flow.auth.js already exists. Overwrite? (y/N) ',
      overwriteSkipped: 'Skipped.',
      overwritten: 'Overwritten shiny-flow.auth.js',
      created: 'Created shiny-flow.auth.js',
      gitignoreAlready: '.gitignore already includes shiny-flow.auth.js, skipping.',
      gitignorePrompt: 'Add shiny-flow.auth.js to .gitignore? (Y/n) ',
      gitignoreSkipped: 'Skipped.',
      gitignoreAdded: 'Added shiny-flow.auth.js to .gitignore',
    },
    server: {
      portInUse: (p, a) => `Port ${p} is in use, using ${a} instead.`,
      authNotFound: (path) => `\n[shiny-flow] shiny-flow.auth.js not found in ${path}`,
      noAuth: '[shiny-flow] Continuing without authentication.\n',
      authSetup: '[shiny-flow] To set up script authentication:',
      authStep1: '[shiny-flow]   1. Run `npx shiny-flow init` in your project directory',
      authStep2: '[shiny-flow]   2. Edit shiny-flow.auth.js with your login logic',
      authStep3: '[shiny-flow]   3. Re-run `npx shiny-flow .`\n',
      authManual: '[shiny-flow] Or open the app and set a custom script path in Auth settings.\n',
    },
  },
  ko: {
    init: {
      overwritePrompt: 'shiny-flow.auth.js가 이미 존재합니다. 덮어쓸까요? (y/N) ',
      overwriteSkipped: '건너뜁니다.',
      overwritten: 'shiny-flow.auth.js를 덮어썼습니다.',
      created: 'shiny-flow.auth.js를 생성했습니다.',
      gitignoreAlready: '.gitignore에 shiny-flow.auth.js가 이미 포함되어 있습니다. 건너뜁니다.',
      gitignorePrompt: '.gitignore에 shiny-flow.auth.js를 추가할까요? (Y/n) ',
      gitignoreSkipped: '건너뜁니다.',
      gitignoreAdded: '.gitignore에 shiny-flow.auth.js를 추가했습니다.',
    },
    server: {
      portInUse: (p, a) => `포트 ${p}이(가) 사용 중입니다. ${a} 포트를 사용합니다.`,
      authNotFound: (path) => `\n[shiny-flow] ${path}에서 shiny-flow.auth.js를 찾을 수 없습니다.`,
      noAuth: '[shiny-flow] 인증 없이 계속합니다.\n',
      authSetup: '[shiny-flow] 스크립트 인증을 설정하려면:',
      authStep1: '[shiny-flow]   1. 프로젝트 디렉토리에서 `npx shiny-flow init --lang ko` 실행',
      authStep2: '[shiny-flow]   2. shiny-flow.auth.js에 로그인 로직 작성',
      authStep3: '[shiny-flow]   3. `npx shiny-flow .` 다시 실행\n',
      authManual: '[shiny-flow] 또는 앱을 열어 인증 설정에서 스크립트 경로를 직접 입력하세요.\n',
    },
  },
};

const msg = MESSAGES[lang] ?? MESSAGES.en;

// ─── init 서브커맨드 ─────────────────────────────────────────────────────────

if (args[0] === 'init') {
  const snippets = {
    en: `// shiny-flow.auth.js
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
`,
    ko: `// shiny-flow.auth.js
// 이 파일을 수정해서 프로젝트의 인증(로그인) 로직을 작성하세요.
// npx shiny-flow . 실행 시 자동으로 불러옵니다.

/**
 * 스크린샷 캡처 전 한 번 호출됩니다.
 * 여기서 로그인을 처리하면 이후 모든 페이지 방문이 인증된 상태로 진행됩니다.
 *
 * @param {import('playwright').Page} page - Playwright 페이지 객체
 * @param {string} baseUrl - 개발 서버 기본 URL (예: 'http://localhost:3000')
 */
module.exports = async function authenticate(page, baseUrl) {
  // 로그인 페이지로 이동합니다
  await page.goto(baseUrl + '/login');

  // 아이디 또는 이메일 입력
  // '#email'을 실제 아이디 입력 필드의 CSS 셀렉터로 바꾸세요
  await page.fill('#email', 'your@email.com');

  // 비밀번호 입력
  // '#password'를 실제 비밀번호 입력 필드의 CSS 셀렉터로 바꾸세요
  await page.fill('#password', 'yourpassword');

  // 로그인 버튼 클릭
  // 'button[type=submit]'을 실제 로그인 버튼의 CSS 셀렉터로 바꾸세요
  await page.click('button[type=submit]');

  // 로그인 후 이동할 페이지를 기다립니다
  // '**/dashboard'를 로그인 성공 후 표시되는 페이지의 URL 패턴으로 바꾸세요
  await page.waitForURL('**/dashboard');
};
`,
  };

  const authSnippet = snippets[lang] ?? snippets.en;

  const authFile = nodePath.join(process.cwd(), 'shiny-flow.auth.js');

  function promptGitignore() {
    const gitignoreFile = nodePath.join(process.cwd(), '.gitignore');
    const entry = 'shiny-flow.auth.js';
    const alreadyIgnored =
      fs.existsSync(gitignoreFile) && fs.readFileSync(gitignoreFile, 'utf8').includes(entry);

    if (alreadyIgnored) {
      console.log(msg.init.gitignoreAlready);
      process.exit(0);
    }

    const rl = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(msg.init.gitignorePrompt, (answer) => {
      rl.close();
      if (answer.trim().toLowerCase() === 'n') {
        console.log(msg.init.gitignoreSkipped);
        process.exit(0);
      }
      if (fs.existsSync(gitignoreFile)) {
        fs.appendFileSync(gitignoreFile, `\n# shiny-flow\n${entry}\n`);
      } else {
        fs.writeFileSync(gitignoreFile, `# shiny-flow\n${entry}\n`);
      }
      console.log(msg.init.gitignoreAdded);
      process.exit(0);
    });
  }

  if (fs.existsSync(authFile)) {
    const rl = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(msg.init.overwritePrompt, (answer) => {
      rl.close();
      if (answer.trim().toLowerCase() === 'y') {
        fs.writeFileSync(authFile, authSnippet);
        console.log(msg.init.overwritten);
      } else {
        console.log(msg.init.overwriteSkipped);
      }
      promptGitignore();
    });
  } else {
    fs.writeFileSync(authFile, authSnippet);
    console.log(msg.init.created);
    promptGitignore();
  }
}

// ─── 서버 실행 ───────────────────────────────────────────────────────────────
else {
  // positional 인자와 named 플래그 분리
  const VALUE_FLAGS = ['--port', '-p', '--url', '-u', '--lang', '-l'];
  const positionalArgs = [];
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (VALUE_FLAGS.includes(arg) && i + 1 < args.length) {
      i += 2;
    } else if (arg.startsWith('-')) {
      i += 1;
    } else {
      positionalArgs.push(arg);
      i += 1;
    }
  }

  const preferredPort = Number(flagValue(['--port', '-p']) ?? 3000);
  const targetUrl = flagValue(['--url', '-u']) ?? 'http://localhost:3000';
  const rawProjectPath = positionalArgs[0];
  const projectPath = rawProjectPath ? nodePath.resolve(rawProjectPath) : '';

  // path가 주어지면 screenshot 기본값 true
  const screenshot = hasFlag(['--screenshot', '-s']) || !!rawProjectPath;

  // auth 자동 감지
  let authType = 'none';
  const scriptPath = 'shiny-flow.auth.js';
  if (projectPath && screenshot) {
    const authFile = nodePath.join(projectPath, 'shiny-flow.auth.js');
    if (fs.existsSync(authFile)) {
      authType = 'script';
    } else {
      console.log(msg.server.authNotFound(projectPath));
      console.log(msg.server.noAuth);
      console.log(msg.server.authSetup);
      console.log(msg.server.authStep1);
      console.log(msg.server.authStep2);
      console.log(msg.server.authStep3);
      console.log(msg.server.authManual);
    }
  }

  async function main() {
    const { version } = require('../package.json');
    console.log(`shiny-flow v${version}`);

    const { default: getPort, portNumbers } = await import('get-port');
    const port = await getPort({ port: portNumbers(preferredPort, preferredPort + 100) });
    const hostname = 'localhost';

    if (port !== preferredPort) {
      console.log(msg.server.portInUse(preferredPort, port));
    }

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
      if (data.toString().includes('localhost') || data.toString().includes('Local')) {
        openBrowser();
      }
    });

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
}
