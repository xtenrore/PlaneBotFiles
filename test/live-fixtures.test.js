const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

async function waitFor(url, child) {
  let last;
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null) throw new Error(`Sunucu erken kapandı: ${child.exitCode}`);
    try {
      const r = await fetch(url);
      if (r.ok) return;
      last = new Error(`HTTP ${r.status}`);
    } catch (e) { last = e; }
    await new Promise(r => setTimeout(r, 75));
  }
  throw last || new Error('Sunucu başlatılamadı.');
}

test('live fixture provider normalizes a real-time football API response without exposing the API secret', { timeout: 20000 }, async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sahanova-live-'));
  const appPort = 36000 + (process.pid % 10000);
  const providerPort = appPort + 1;
  const secret = 'test-secret-key';
  let receivedSecret = null;

  const provider = http.createServer((req, res) => {
    receivedSecret = req.headers['x-test-key'] || null;
    res.writeHead(200, { 'Content-Type':'application/json' });
    res.end(JSON.stringify({
      response:[{
        fixture:{id:987,date:'2026-09-21T20:00:00+03:00',status:{short:'1H',elapsed:37}},
        teams:{home:{name:'Galatasaray'},away:{name:'Fenerbahçe'}},
        goals:{home:1,away:0}
      }]
    }));
  });
  await new Promise(resolve => provider.listen(providerPort, '127.0.0.1', resolve));

  const child = spawn(process.execPath, ['server-auth.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(appPort),
      DATA_PATH: path.join(tmp, 'db.json'),
      AUTH_DATA_PATH: path.join(tmp, 'auth.json'),
      NODE_ENV: 'test',
      MATCHES_API_URL: `http://127.0.0.1:${providerPort}/fixtures`,
      MATCHES_API_HEADER_NAME: 'x-test-key',
      MATCHES_API_HEADER_VALUE: secret,
      MATCHES_API_REFRESH_MS: '10000'
    },
    stdio: ['ignore','pipe','pipe']
  });
  let stderr = '';
  child.stderr.on('data', d => { stderr += String(d); });

  try {
    const base = `http://127.0.0.1:${appPort}`;
    await waitFor(`${base}/api/health`, child);
    const response = await fetch(`${base}/api/live-fixtures`);
    assert.equal(response.status, 200);
    const body = await response.json();

    assert.equal(body.ok, true);
    assert.equal(body.configured, true);
    assert.equal(body.stale, false);
    assert.equal(body.fixtures.length, 1);
    assert.deepEqual(body.fixtures[0], {
      id:'987',
      home:'Galatasaray',
      away:'Fenerbahçe',
      kickoff:'2026-09-21T20:00:00+03:00',
      status:'CANLI',
      homeScore:1,
      awayScore:0,
      minute:37,
      dataSource:'live-api',
      verifiedResult:true
    });
    assert.equal(receivedSecret, secret);
    assert.equal(JSON.stringify(body).includes(secret), false);
  } finally {
    child.kill('SIGTERM');
    provider.close();
    await new Promise(resolve => {
      if (child.exitCode !== null) return resolve();
      child.once('exit', resolve);
      setTimeout(resolve, 2000);
    });
    fs.rmSync(tmp, { recursive:true, force:true });
  }

  assert.equal(stderr, '');
});
