const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

async function waitFor(url, child) {
  let last;
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null) throw new Error(`Sunucu erken kapandı: ${child.exitCode}`);
    try {
      const r = await fetch(url);
      if (r.ok) return r;
      last = new Error(`HTTP ${r.status}`);
    } catch (e) { last = e; }
    await new Promise(r => setTimeout(r, 75));
  }
  throw last || new Error('Sunucu başlatılamadı.');
}

test('server-live keeps the existing app health endpoint working', { timeout:20000 }, async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sahanova-live-smoke-'));
  const port = 39000 + (process.pid % 5000);
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['server-live.js'], {
    cwd:path.resolve(__dirname, '..'),
    env:{
      ...process.env,
      PORT:String(port),
      DATA_PATH:path.join(tmp, 'db.json'),
      AUTH_DATA_PATH:path.join(tmp, 'auth.json'),
      MATCHES_API_URL:'',
      NODE_ENV:'test'
    },
    stdio:['ignore','pipe','pipe']
  });
  let stderr = '';
  child.stderr.on('data', d => { stderr += String(d); });

  try {
    const health = await waitFor(`${base}/api/health`, child);
    const body = await health.json();
    assert.equal(body.ok, true);
    assert.equal(body.service, 'sahanova-fantezi');
  } finally {
    child.kill('SIGTERM');
    await new Promise(resolve => {
      if (child.exitCode !== null) return resolve();
      child.once('exit', resolve);
      setTimeout(resolve, 2000);
    });
    fs.rmSync(tmp, { recursive:true, force:true });
  }

  assert.equal(stderr, '');
});
