#!/usr/bin/env node

const path = require('path');
const { spawn } = require('child_process');

const args = process.argv.slice(2);
const portFlag = args.indexOf('--port');
const port = portFlag !== -1 ? args[portFlag + 1] : process.env.PORT || '3000';
const hostname = 'localhost';

process.env.PORT = port;
process.env.HOSTNAME = hostname;
process.env.NODE_ENV = 'production';

const serverPath = path.join(__dirname, '..', '.next', 'standalone', 'server.js');

const server = spawn(process.execPath, [serverPath], {
  env: { ...process.env },
  stdio: ['inherit', 'pipe', 'inherit'],
});

let opened = false;
const openBrowser = () => {
  if (opened) return;
  opened = true;
  import('open').then(({ default: open }) => open(`http://${hostname}:${port}`));
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
