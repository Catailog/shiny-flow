#!/usr/bin/env node

const nodePath = require('path');
const { spawn } = require('child_process');

const args = process.argv.slice(2);

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
const port = portFlag !== -1 ? args[portFlag + 1] : process.env.PORT || '3000';
const hostname = 'localhost';

const screenshot = args.includes('-s') || args.includes('--screenshot');

const urlFlag = args.indexOf('-u') !== -1 ? args.indexOf('-u') : args.indexOf('--url');
const targetUrl = urlFlag !== -1 ? args[urlFlag + 1] : '';

const rawProjectPath = positionalArgs[0];
const projectPath = rawProjectPath ? nodePath.resolve(rawProjectPath) : '';

// 쿼리 파라미터 조립
const query = new URLSearchParams();
if (projectPath) query.set('path', projectPath);
if (screenshot) query.set('screenshot', 'true');
if (targetUrl) query.set('url', targetUrl);
const queryString = query.toString() ? `?${query.toString()}` : '';

process.env.PORT = port;
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
