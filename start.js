const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting VyapaarOS AI Stack...');

const backend = spawn('node', ['index.js'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true
});

const frontend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: true
});

// Forward exit codes
backend.on('close', (code) => {
  console.log(`Backend server closed with code ${code}`);
  frontend.kill();
  process.exit(code);
});

frontend.on('close', (code) => {
  console.log(`Frontend dev server closed with code ${code}`);
  backend.kill();
  process.exit(code);
});

// Handle terminations
process.on('SIGINT', () => {
  backend.kill();
  frontend.kill();
  process.exit();
});
