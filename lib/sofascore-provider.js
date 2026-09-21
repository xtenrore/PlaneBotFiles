'use strict';

const BASE_URL = 'https://api.sofascore.com/api/v1';
const SUPER_LIG_TOURNAMENT_ID = 52;
const DEFAULT_TIMEOUT_MS = 6500;
const SEASON_TTL_MS = 12 * 60 * 60 * 1000;
const SCHEDULE_TTL_MS = 5 * 60 * 1000;
const LIVE_TTL_MS = 15 * 1000;

let seasonCache = { at:0, id:null, label:null };
const roundCache = new Map();
let liveCache = { at:0, events:[] };

function expectedSeasonLabel(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const start = month >= 7 ? year : year - 1;
  const end = start + 1;
  return `${String(start).slice(-2)}/${String(end).slice(-2)}`;
}

function withTimeout(fetchImpl, url, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetchImpl(url, {
    signal: controller.signal,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; SahaNova/1.0; +https://github.com/xtenrore/PlaneBotFiles)'
    }
  }).finally(() => clearTimeout(timer));
}

async function requestJson(url, fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const response = await withTimeout(fetchImpl, url, timeoutMs);
  if (!response.ok) throw new Error(`SofaScore HTTP ${response.status}`);
  return response.json();
}

function tournamentId(event) {
  return Number(event?.tournament?.uniqueTournament?.id ?? event?.uniqueTournament?.id ?? 0);
}

function normalizeStatus(event) {
  const type = String(event?.status?.type || '').toLowerCase();
  const code = Number(event?.status?.code || 0);
  const description = String(event?.status?.description || '').toLowerCase();

  if (type === 'finished' || [100,110,120].includes(code)) return 'BİTTİ';
  if (['inprogress','halftime','paused'].includes(type) || (code >= 6 && code < 100)) return 'CANLI';
  if (type === 'postponed' || description.includes('postpon')) return 'ERTELENDİ';
  if (['canceled','cancelled'].includes(type) || description.includes('cancel')) return 'İPTAL';
  if (['interrupted','suspended'].includes(type) || description.includes('interrupt') || description.includes('suspend')) return 'DURDURULDU';
  return 'PROGRAM';
}

function numericScore(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function currentScore(score) {
  if (!score || typeof score !== 'object') return null;
  return numericScore(score.current ?? score.normaltime ?? score.display ?? score.period2 ?? score.period1);
}

function parseMinuteFromDescription(description) {
  const text = String(description || '');
  const match = text.match(/(?:^|\s)(\d{1,3})(?:\+\d+)?['’]?/);
  if (!match) return null;
  const minute = Number(match[1]);
  return Number.isFinite(minute) && minute >= 0 && minute <= 130 ? minute : null;
}

function liveMinute(event, nowMs = Date.now()) {
  const explicit = parseMinuteFromDescription(event?.status?.description);
  if (explicit !== null) return explicit;
  const status = normalizeStatus(event);
  if (status !== 'CANLI') return null;
  const period = String(event?.status?.period || event?.time?.period || '').toLowerCase();
  const start = Number(event?.time?.currentPeriodStartTimestamp || 0);
  if (!start) return null;
  const elapsed = Math.max(0, Math.floor((nowMs / 1000 - start) / 60));
  if (period.includes('second')) return Math.min(120, 45 + elapsed);
  if (period.includes('extra')) return Math.min(130, 90 + elapsed);
  return Math.min(45, elapsed);
}

function normalizeEvent(event, nowMs = Date.now()) {
  if (!event || tournamentId(event) !== SUPER_LIG_TOURNAMENT_ID) return null;
  const home = String(event?.homeTeam?.name || '').trim();
  const away = String(event?.awayTeam?.name || '').trim();
  if (!home || !away) return null;
  const ts = Number(event?.startTimestamp || 0);
  const status = normalizeStatus(event);
  const homeScore = currentScore(event?.homeScore);
  const awayScore = currentScore(event?.awayScore);
  return {
    id: String(event.id),
    home,
    away,
    kickoff: ts > 0 ? new Date(ts * 1000).toISOString() : null,
    status,
    homeScore,
    awayScore,
    minute: liveMinute(event, nowMs),
    round: Number(event?.roundInfo?.round || 0) || null,
    dataSource: 'sofascore-keyless',
    verifiedResult: status === 'BİTTİ' ? homeScore !== null && awayScore !== null : true
  };
}

function dedupeAndSort(events) {
  const map = new Map();
  for (const event of events) {
    if (!event) continue;
    const previous = map.get(event.id);
    if (!previous || event.status === 'CANLI' || previous.status !== 'CANLI') map.set(event.id, event);
  }
  return [...map.values()].sort((a,b) => {
    const ta = a.kickoff ? new Date(a.kickoff).getTime() : Number.MAX_SAFE_INTEGER;
    const tb = b.kickoff ? new Date(b.kickoff).getTime() : Number.MAX_SAFE_INTEGER;
    return ta - tb;
  });
}

async function discoverSeason({ fetchImpl = fetch, now = new Date(), timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (seasonCache.id && Date.now() - seasonCache.at < SEASON_TTL_MS) return seasonCache;
  const payload = await requestJson(`${BASE_URL}/unique-tournament/${SUPER_LIG_TOURNAMENT_ID}/seasons`, fetchImpl, timeoutMs);
  const seasons = Array.isArray(payload?.seasons) ? payload.seasons : [];
  if (!seasons.length) throw new Error('SofaScore Süper Lig sezonu bulunamadı.');
  const expected = expectedSeasonLabel(now);
  const season = seasons.find(s => String(s.year || '').includes(expected) || String(s.name || '').includes(expected)) || seasons[0];
  seasonCache = { at:Date.now(), id:Number(season.id), label:String(season.year || season.name || expected) };
  return seasonCache;
}

async function fetchRound({ seasonId, week, fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS, nowMs = Date.now() }) {
  const key = `${seasonId}:${week}`;
  const cached = roundCache.get(key);
  if (cached && Date.now() - cached.at < SCHEDULE_TTL_MS) return cached.events;

  const url = `${BASE_URL}/unique-tournament/${SUPER_LIG_TOURNAMENT_ID}/season/${seasonId}/events/round/${week}`;
  try {
    const payload = await requestJson(url, fetchImpl, timeoutMs);
    const events = (Array.isArray(payload?.events) ? payload.events : []).map(e => normalizeEvent(e, nowMs)).filter(Boolean);
    if (events.length) {
      roundCache.set(key, { at:Date.now(), events });
      return events;
    }
  } catch (_) {}

  const [lastPayload, nextPayload] = await Promise.all([
    requestJson(`${BASE_URL}/unique-tournament/${SUPER_LIG_TOURNAMENT_ID}/season/${seasonId}/events/last/0`, fetchImpl, timeoutMs).catch(() => ({events:[]})),
    requestJson(`${BASE_URL}/unique-tournament/${SUPER_LIG_TOURNAMENT_ID}/season/${seasonId}/events/next/0`, fetchImpl, timeoutMs).catch(() => ({events:[]}))
  ]);
  const combined = [...(lastPayload.events || []), ...(nextPayload.events || [])]
    .filter(e => Number(e?.roundInfo?.round || 0) === Number(week))
    .map(e => normalizeEvent(e, nowMs)).filter(Boolean);
  if (combined.length) roundCache.set(key, { at:Date.now(), events:combined });
  return combined;
}

async function fetchLiveEvents({ fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS, nowMs = Date.now() } = {}) {
  if (liveCache.events.length && Date.now() - liveCache.at < LIVE_TTL_MS) return liveCache.events;
  const payload = await requestJson(`${BASE_URL}/sport/football/events/live`, fetchImpl, timeoutMs).catch(() => ({events:[]}));
  const events = (Array.isArray(payload?.events) ? payload.events : [])
    .filter(e => tournamentId(e) === SUPER_LIG_TOURNAMENT_ID)
    .map(e => normalizeEvent(e, nowMs)).filter(Boolean);
  liveCache = { at:Date.now(), events };
  return events;
}

async function inferCurrentWeek({ seasonId, fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS, nowMs = Date.now() }) {
  const live = await fetchLiveEvents({ fetchImpl, timeoutMs, nowMs });
  const liveRound = live.find(e => e.round)?.round;
  if (liveRound) return liveRound;

  const [lastPayload, nextPayload] = await Promise.all([
    requestJson(`${BASE_URL}/unique-tournament/${SUPER_LIG_TOURNAMENT_ID}/season/${seasonId}/events/last/0`, fetchImpl, timeoutMs).catch(() => ({events:[]})),
    requestJson(`${BASE_URL}/unique-tournament/${SUPER_LIG_TOURNAMENT_ID}/season/${seasonId}/events/next/0`, fetchImpl, timeoutMs).catch(() => ({events:[]}))
  ]);
  const raw = [...(lastPayload.events || []), ...(nextPayload.events || [])]
    .filter(e => tournamentId(e) === SUPER_LIG_TOURNAMENT_ID && Number(e?.roundInfo?.round || 0));
  if (!raw.length) return null;
  raw.sort((a,b) => Math.abs(Number(a.startTimestamp || 0) * 1000 - nowMs) - Math.abs(Number(b.startTimestamp || 0) * 1000 - nowMs));
  return Number(raw[0].roundInfo.round) || null;
}

async function fetchSuperLigFixtures({ week = null, fetchImpl = fetch, now = new Date(), timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const nowMs = now.getTime();
  try {
    const season = await discoverSeason({ fetchImpl, now, timeoutMs });
    const resolvedWeek = Number(week) > 0 ? Number(week) : await inferCurrentWeek({ seasonId:season.id, fetchImpl, timeoutMs, nowMs });
    if (!resolvedWeek) throw new Error('SofaScore güncel Süper Lig haftası bulunamadı.');
    const [schedule, live] = await Promise.all([
      fetchRound({ seasonId:season.id, week:resolvedWeek, fetchImpl, timeoutMs, nowMs }),
      fetchLiveEvents({ fetchImpl, timeoutMs, nowMs })
    ]);
    const relevantLive = live.filter(e => !e.round || e.round === resolvedWeek);
    const fixtures = dedupeAndSort([...schedule, ...relevantLive]);
    if (!fixtures.length) throw new Error('SofaScore bu hafta için maç döndürmedi.');
    return {
      configured:true,
      provider:'sofascore-keyless',
      unofficial:true,
      tournamentId:SUPER_LIG_TOURNAMENT_ID,
      seasonId:season.id,
      season:season.label,
      week:resolvedWeek,
      fixtures,
      fetchedAt:new Date().toISOString(),
      stale:false
    };
  } catch (err) {
    const allCached = dedupeAndSort([...roundCache.values()].flatMap(x => x.events || []));
    return {
      configured:true,
      provider:'sofascore-keyless',
      unofficial:true,
      tournamentId:SUPER_LIG_TOURNAMENT_ID,
      fixtures:allCached,
      fetchedAt:allCached.length ? new Date().toISOString() : null,
      stale:true,
      error:String(err?.message || err)
    };
  }
}

function resetCachesForTests() {
  seasonCache = { at:0, id:null, label:null };
  roundCache.clear();
  liveCache = { at:0, events:[] };
}

module.exports = {
  BASE_URL,
  SUPER_LIG_TOURNAMENT_ID,
  expectedSeasonLabel,
  normalizeStatus,
  normalizeEvent,
  fetchSuperLigFixtures,
  resetCachesForTests
};
