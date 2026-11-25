const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

const projectRoot = path.resolve(__dirname, '..');

function checkPort(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function ensureMongo() {
  const isRunning = await checkPort(27017);
  if (isRunning) {
    console.log('[mongo] MongoDB daemon is active on port 27017.');
    return;
  }

  const mongodCandidates = [
    'C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\6.0\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\5.0\\bin\\mongod.exe',
    'C:\\Program Files\\MongoDB\\Server\\4.4\\bin\\mongod.exe'
  ];

  const mongodExe = mongodCandidates.find((p) => fs.existsSync(p)) || 'mongod';
  const dbPath = 'C:\\mongodb-data\\db';
  const logPath = 'C:\\mongodb-data\\log\\mongod.log';

  try {
    if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });
    if (!fs.existsSync(path.dirname(logPath))) fs.mkdirSync(path.dirname(logPath), { recursive: true });

    console.log(`[mongo] Automatically starting local MongoDB instance (${dbPath})...`);
    const mongoProcess = spawn(mongodExe, ['--dbpath', dbPath, '--logpath', logPath, '--bind_ip', '127.0.0.1'], {
      detached: true,
      stdio: 'ignore'
    });
    mongoProcess.unref();
  } catch (err) {
    console.warn('[mongo] Could not start local mongod automatically:', err.message);
  }
}

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
  const cmdToRun = process.platform === 'win32' && command.includes(' ') && !command.startsWith('"') ? `"${command}"` : command;
  const child = spawn(cmdToRun, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
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
  const pyCmd = process.platform === 'win32' && py.includes(' ') && !py.startsWith('"') ? `"${py}"` : py;
  const probe = spawn(pyCmd, ['--version'], { stdio: 'ignore', shell: true });
  probe.on('exit', (code) => {
    if (code === 0) {
      pythonAvailable = true;
    }
  });
  probe.on('error', () => {});
}

async function boot() {
  await ensureMongo();

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
}

boot();
