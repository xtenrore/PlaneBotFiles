const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { Store } = require('../lib/store');
const { seedData } = require('../lib/seed');
const {
  STARTING_BUDGET_MILLION_TL,
  applyOfficialRosterPatch
} = require('../lib/official-roster-patch');
const { validateSquad } = require('../lib/game');

test('new managers start with 100M money and zero points', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sahanova-economy-'));
  const db = path.join(dir, 'db.json');
  const store = new Store(db);
  const user = store.ensureUser('economy-test-user');

  assert.equal(STARTING_BUDGET_MILLION_TL, 100);
  assert.equal(user.budget, 100);
  assert.equal(user.bank, 100);
  assert.equal(user.points, 0);

  fs.rmSync(dir, { recursive: true, force: true });
});

test('canonical football data exposes the 100M economy and realistic price model', () => {
  const data = applyOfficialRosterPatch(seedData());
  assert.ok(data.version >= 4);
  assert.equal(data.footballData.startingBudgetMillionTL, 100);
  assert.equal(data.footballData.priceUnit, 'million TL');
  assert.equal(data.footballData.pricingModel, 'fantasy-performance-v1');

  const byName = Object.fromEntries(data.players.map(player => [player.name, player]));
  assert.equal(byName['Victor Osimhen'].price, 14.5);
  assert.equal(byName['Mohamed Salah'].price, 14.0);
  assert.equal(byName['Ederson'].price, 7.0);

  for (const player of data.players) {
    assert.ok(player.price >= 4.0, `${player.name} price too low: ${player.price}`);
    assert.ok(player.price <= 14.5, `${player.name} price too high: ${player.price}`);
    assert.equal(Math.round(player.price * 2), player.price * 2, `${player.name} must use 0.5M price steps`);
  }
});

test('normal 100M budget rejects an over-budget squad while unlimited budget accepts it', () => {
  const shape = ['GK','GK','DEF','DEF','DEF','DEF','DEF','MID','MID','MID','MID','MID','FWD','FWD','FWD'];
  const players = shape.map((position, index) => ({
    id: String(index + 1),
    name: `P${index + 1}`,
    position,
    club: `Club ${index + 1}`,
    price: 12
  }));

  const normal = validateSquad(players, 100, 3);
  const unlimited = validateSquad(players, 9999, 3);

  assert.equal(normal.valid, false);
  assert.ok(normal.errors.some(error => error.startsWith('Bütçe aşıldı:')));
  assert.equal(unlimited.valid, true);
  assert.equal(unlimited.total, 180);
});
