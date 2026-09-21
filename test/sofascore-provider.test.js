const test = require('node:test');
const assert = require('node:assert/strict');
const {
  SUPER_LIG_TOURNAMENT_ID,
  expectedSeasonLabel,
  normalizeEvent,
  fetchSuperLigFixtures,
  resetCachesForTests
} = require('../lib/sofascore-provider');

function response(payload, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

function event({ id, home, away, status = { type:'notstarted', code:0 }, homeScore, awayScore, round = 6, startTimestamp = 1789938000 }) {
  return {
    id,
    tournament:{ uniqueTournament:{ id:SUPER_LIG_TOURNAMENT_ID, name:'Trendyol Süper Lig' } },
    homeTeam:{ name:home },
    awayTeam:{ name:away },
    status,
    homeScore:homeScore == null ? {} : { current:homeScore },
    awayScore:awayScore == null ? {} : { current:awayScore },
    roundInfo:{ round },
    startTimestamp
  };
}

test('season label resolves 2026/27 correctly', () => {
  assert.equal(expectedSeasonLabel(new Date('2026-09-21T12:00:00Z')), '26/27');
  assert.equal(expectedSeasonLabel(new Date('2027-03-01T12:00:00Z')), '26/27');
});

test('SofaScore event normalization keeps score, round and status', () => {
  const normalized = normalizeEvent(event({
    id:99,
    home:'Galatasaray',
    away:'Fenerbahçe',
    status:{ type:'inprogress', code:7, description:"37'", period:'first' },
    homeScore:1,
    awayScore:0
  }), new Date('2026-09-21T17:37:00Z').getTime());

  assert.equal(normalized.id, '99');
  assert.equal(normalized.status, 'CANLI');
  assert.equal(normalized.homeScore, 1);
  assert.equal(normalized.awayScore, 0);
  assert.equal(normalized.minute, 37);
  assert.equal(normalized.round, 6);
  assert.equal(normalized.dataSource, 'sofascore-keyless');
});

test('keyless provider discovers season, fetches round and overlays live Süper Lig state', async () => {
  resetCachesForTests();
  const calls = [];
  const scheduled = event({ id:100, home:'Galatasaray', away:'Fenerbahçe' });
  const second = event({ id:101, home:'Beşiktaş', away:'Trabzonspor', startTimestamp:1789945200 });
  const live = event({
    id:100,
    home:'Galatasaray',
    away:'Fenerbahçe',
    status:{ type:'inprogress', code:7, description:"37'", period:'first' },
    homeScore:1,
    awayScore:0
  });
  const unrelated = {
    ...event({ id:999, home:'Other', away:'League' }),
    tournament:{ uniqueTournament:{ id:17, name:'Premier League' } }
  };

  const mockFetch = async (url, options = {}) => {
    calls.push({ url:String(url), headers:options.headers || {} });
    if (String(url).endsWith('/unique-tournament/52/seasons')) {
      return response({ seasons:[{ id:77777, year:'26/27', name:'Trendyol Süper Lig 26/27' }, { id:66666, year:'25/26' }] });
    }
    if (String(url).endsWith('/unique-tournament/52/season/77777/events/round/6')) {
      return response({ events:[scheduled, second] });
    }
    if (String(url).endsWith('/sport/football/events/live')) {
      return response({ events:[live, unrelated] });
    }
    return response({}, 404);
  };

  const result = await fetchSuperLigFixtures({
    week:6,
    fetchImpl:mockFetch,
    now:new Date('2026-09-21T17:37:00Z')
  });

  assert.equal(result.configured, true);
  assert.equal(result.provider, 'sofascore-keyless');
  assert.equal(result.unofficial, true);
  assert.equal(result.seasonId, 77777);
  assert.equal(result.season, '26/27');
  assert.equal(result.week, 6);
  assert.equal(result.stale, false);
  assert.equal(result.fixtures.length, 2);

  const derby = result.fixtures.find(f => f.id === '100');
  assert.equal(derby.status, 'CANLI');
  assert.equal(derby.minute, 37);
  assert.equal(derby.homeScore, 1);
  assert.equal(derby.awayScore, 0);
  assert.equal(result.fixtures.some(f => f.id === '999'), false);

  assert.ok(calls.every(call => call.url.startsWith('https://api.sofascore.com/api/v1/')));
  assert.ok(calls.every(call => !/key|token|secret/i.test(call.url)));
  assert.ok(calls.every(call => !Object.keys(call.headers).some(name => /api[-_]?key|authorization/i.test(name))));
});
