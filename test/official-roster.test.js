const test = require('node:test');
const assert = require('node:assert/strict');
const { seedData } = require('../lib/seed');
const { applyOfficialRosterPatch } = require('../lib/official-roster-patch');

const canonical = () => applyOfficialRosterPatch(seedData());

test('audited official roster pack is version 3 with 216 real players', () => {
  const data = canonical();
  assert.equal(data.version, 3);
  assert.equal(data.players.length, 216);
  assert.ok(data.players.every(p => p.realPlayer === true && p.season === '2026/27'));
  assert.equal(data.footballData.officialRosterAudit, true);
});

test('players removed from current TFF A-team lists are absent', () => {
  const names = new Set(canonical().players.map(p => p.name));
  for (const oldName of ['Marius Mouandilmadji','Blaz Kramer','Maestro','Calegari','Habib Keïta']) {
    assert.equal(names.has(oldName), false, `${oldName} should not remain in canonical player pool`);
  }
});

test('official replacements are assigned to the correct clubs and positions', () => {
  const players = canonical().players;
  const check = (name, club, position) => {
    const player = players.find(p => p.name === name);
    assert.ok(player, `${name} missing`);
    assert.equal(player.club, club);
    assert.equal(player.position, position);
  };
  check('Kouadou Jaures Assoumou','Samsunspor','FWD');
  check('Adam Arous','Kasımpaşa','DEF');
  check('Enis Destan','Tümosan Konyaspor','FWD');
  check('Gaius Makouta','Corendon Alanyaspor','MID');
  check('Charles Raux-Yao','Eyüpspor','DEF');
  check('Tobias Gulliksen','Kocaelispor','MID');
});
