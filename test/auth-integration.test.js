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
      if (r.ok) return;
      last = new Error(`HTTP ${r.status}`);
    } catch (e) { last = e; }
    await new Promise(r => setTimeout(r, 75));
  }
  throw last || new Error('Sunucu başlatılamadı.');
}

test('kayıt, güvenli oturum, profil izolasyonu, canlı fikstür fallback ve çıkış akışı', { timeout: 20000 }, async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sahanova-auth-'));
  const port = 32000 + (process.pid % 20000);
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['server-auth.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      DATA_PATH: path.join(tmp, 'db.json'),
      AUTH_DATA_PATH: path.join(tmp, 'auth.json'),
      NODE_ENV: 'test',
      MATCHES_API_URL: ''
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let stderr = '';
  child.stderr.on('data', d => { stderr += String(d); });

  try {
    await waitFor(`${base}/api/health`, child);

    const live = await fetch(`${base}/api/live-fixtures`);
    assert.equal(live.status, 200);
    const liveBody = await live.json();
    assert.equal(liveBody.ok, true);
    assert.equal(liveBody.configured, false);
    assert.deepEqual(liveBody.fixtures, []);

    const registration = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: base },
      body: JSON.stringify({
        displayName: 'Test Menajer',
        email: 'manager@example.test',
        password: 'TestParola12345',
        acceptTerms: true
      })
    });
    assert.equal(registration.status, 201);
    const setCookie = registration.headers.get('set-cookie') || '';
    assert.match(setCookie, /sn_session=/);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Lax/i);
    const cookie = setCookie.split(';')[0];

    const me = await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookie } });
    const meBody = await me.json();
    assert.equal(meBody.authenticated, true);
    assert.equal(meBody.account.email, 'manager@example.test');
    assert.match(meBody.account.id, /^u_/);

    const profileSave = await fetch(`${base}/api/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie, Origin: base },
      body: JSON.stringify({ displayName: 'Test Menajer', teamName: 'Test XI', country: 'Türkiye', favoriteClub: 'Galatasaray' })
    });
    assert.equal(profileSave.status, 200);

    const state = await fetch(`${base}/api/state`, { headers: { Cookie: cookie } });
    const stateBody = await state.json();
    assert.equal(stateBody.user.id, meBody.account.id);
    assert.equal(stateBody.user.teamName, 'Test XI');
    assert.equal(stateBody.user.favoriteClub, 'Galatasaray');
    assert.ok(stateBody.leagues.some(l => l.type === 'country'));
    assert.ok(stateBody.leagues.some(l => l.type === 'favoriteClub'));
    for (const fixture of stateBody.fixtures.filter(f => f.homeScore == null || f.awayScore == null)) {
      assert.notEqual(fixture.status, 'BİTTİ');
      assert.notEqual(fixture.status, 'CANLI');
    }

    const logout = await fetch(`${base}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie, Origin: base },
      body: '{}'
    });
    assert.equal(logout.status, 200);

    const afterLogout = await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookie } });
    assert.equal((await afterLogout.json()).authenticated, false);

    const duplicate = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: base },
      body: JSON.stringify({ displayName: 'Başka', email: 'MANAGER@example.test', password: 'BaskaParola98765', acceptTerms: true })
    });
    assert.equal(duplicate.status, 409);
  } finally {
    child.kill('SIGTERM');
    await new Promise(resolve => {
      if (child.exitCode !== null) return resolve();
      child.once('exit', resolve);
      setTimeout(resolve, 2000);
    });
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  assert.equal(stderr, '');
});
