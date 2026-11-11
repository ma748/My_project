const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = __dirname.replace(/server$/, '');

function resolvePythonCommand() {
  const venvCandidates = [
    path.join(projectRoot, '.venv', process.platform === 'win32' ? 'Scripts' : 'bin', process.platform === 'win32' ? 'python.exe' : 'python'),
    path.join(projectRoot, 'venv', process.platform === 'win32' ? 'Scripts' : 'bin', process.platform === 'win32' ? 'python.exe' : 'python')
  ];

  for (const candidate of venvCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return 'python';
}

function start(command, args, name) {
  const child = spawn(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, PATH: process.env.PATH || '' }
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.warn(`\n[${name}] exited with code ${code}.`);
    }
  });

  return child;
}

const pythonCandidates = [resolvePythonCommand(), 'python', 'python3'];
let pythonAvailable = false;

for (const py of pythonCandidates) {
  const probe = spawn(py, ['--version'], { stdio: 'ignore', shell: true });
  probe.on('exit', (code) => {
    if (code === 0) {
      pythonAvailable = true;
    }
  });
  probe.on('error', () => {});
}

setTimeout(() => {
  const vite = start('npx', ['vite', '--host'], 'vite');
  const api = start('node', ['--watch', 'server/index.js'], 'api');

  if (pythonAvailable) {
    const pythonCommand = resolvePythonCommand();
    start(pythonCommand, ['server/face_service.py'], 'face');
  } else {
    console.warn('[face] Python not found. Face recognition service skipped. Install Python to enable face matching.');
  }

  const shutdown = () => {
    vite.kill();
    api.kill();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}, 500);
