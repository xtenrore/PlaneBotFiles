'use strict';

function roundRobinPairs(memberIds, round) {
  const ids = [...new Set(memberIds.map(String))].sort();
  if (ids.length < 2) return [];
  if (ids.length % 2) ids.push('__BYE__');
  const n = ids.length;
  const fixed = ids[0];
  const rotating = ids.slice(1);
  const rounds = n - 1;
  const r = ((Number(round || 1) - 1) % rounds + rounds) % rounds;
  for (let i = 0; i < r; i++) rotating.unshift(rotating.pop());
  const arranged = [fixed, ...rotating];
  const pairs = [];
  for (let i = 0; i < n / 2; i++) {
    const a = arranged[i];
    const b = arranged[n - 1 - i];
    if (a === '__BYE__' || b === '__BYE__') {
      pairs.push({ homeId: a === '__BYE__' ? b : a, awayId: null, bye: true });
    } else {
      pairs.push({ homeId: a, awayId: b, bye: false });
    }
  }
  return pairs;
}

function ledgerScore(gameweekLedger, userId, week) {
  const row = gameweekLedger && gameweekLedger[`${userId}:${week}`];
  return row ? Number(row.totalApplied || 0) : null;
}

function h2hWeek(memberIds, week, gameweekLedger) {
  return roundRobinPairs(memberIds, week).map(pair => {
    const homeScore = ledgerScore(gameweekLedger, pair.homeId, week);
    const awayScore = pair.awayId ? ledgerScore(gameweekLedger, pair.awayId, week) : null;
    let result = 'pending';
    if (pair.bye) result = 'home';
    else if (homeScore !== null && awayScore !== null) result = homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw';
    return { ...pair, week, homeScore, awayScore, result };
  });
}

function h2hTable(memberIds, throughWeek, gameweekLedger, usersById = {}) {
  const rows = new Map(memberIds.map(id => [String(id), {
    id:String(id), played:0, won:0, drawn:0, lost:0, leaguePoints:0, rawFantasyPoints:0
  }]));
  for (let week = 1; week <= Number(throughWeek || 1); week++) {
    for (const match of h2hWeek(memberIds, week, gameweekLedger)) {
      const home = rows.get(match.homeId);
      const away = match.awayId ? rows.get(match.awayId) : null;
      if (!home) continue;
      const hs = match.homeScore;
      const as = match.awayScore;
      if (hs !== null) home.rawFantasyPoints += hs;
      if (away && as !== null) away.rawFantasyPoints += as;
      if (match.bye) {
        home.played++; home.won++; home.leaguePoints += 3;
      } else if (match.result !== 'pending' && away) {
        home.played++; away.played++;
        if (match.result === 'home') { home.won++; home.leaguePoints += 3; away.lost++; }
        else if (match.result === 'away') { away.won++; away.leaguePoints += 3; home.lost++; }
        else { home.drawn++; away.drawn++; home.leaguePoints++; away.leaguePoints++; }
      }
    }
  }
  return [...rows.values()]
    .map(row => ({ ...row, ...(usersById[row.id] ? { teamName:usersById[row.id].teamName, displayName:usersById[row.id].displayName } : {}) }))
    .sort((a,b) => b.leaguePoints - a.leaguePoints || b.rawFantasyPoints - a.rawFantasyPoints || String(a.id).localeCompare(String(b.id)))
    .map((row,index) => ({ rank:index+1, ...row }));
}

function classicTable(memberIds, usersById = {}) {
  const rows = memberIds.map(id => usersById[String(id)]).filter(Boolean).map(u => ({
    id:u.id, teamName:u.teamName, displayName:u.displayName, points:Number(u.points || 0), goals:Number(u.fantasyGoals || 0)
  }));
  rows.sort((a,b) => b.points - a.points || b.goals - a.goals);
  let previous = null;
  let previousRank = 0;
  return rows.map((row,index) => {
    const tied = previous && previous.points === row.points && previous.goals === row.goals;
    const rank = tied ? previousRank : index + 1;
    previous = row; previousRank = rank;
    return { rank, ...row };
  });
}

function cupPairings(memberIds, roundKey = 'r1') {
  const ids = [...new Set(memberIds.map(String))].sort();
  const pairs = [];
  for (let i = 0; i < ids.length; i += 2) {
    pairs.push({ id:`${roundKey}-${i/2}`, homeId:ids[i], awayId:ids[i+1] || null, bye:!ids[i+1] });
  }
  return pairs;
}

module.exports = { roundRobinPairs, h2hWeek, h2hTable, classicTable, cupPairings };
