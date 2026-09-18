const POSITIONS = ['GK', 'DEF', 'MID', 'FWD'];

// TFF Fantezi Lig standard formations documented in the official help center.
const FORMATIONS = {
  '3-5-2': { GK: 1, DEF: 3, MID: 5, FWD: 2 },
  '3-4-3': { GK: 1, DEF: 3, MID: 4, FWD: 3 },
  '4-4-2': { GK: 1, DEF: 4, MID: 4, FWD: 2 },
  '4-3-3': { GK: 1, DEF: 4, MID: 3, FWD: 3 },
  '4-5-1': { GK: 1, DEF: 4, MID: 5, FWD: 1 },
  '5-4-1': { GK: 1, DEF: 5, MID: 4, FWD: 1 },
  '5-3-2': { GK: 1, DEF: 5, MID: 3, FWD: 2 },
  '5-2-3': { GK: 1, DEF: 5, MID: 2, FWD: 3 }
};

const CARDS = {
  tripleCaptain: { name: 'Tripleks Kaptan', multiplier: 3 },
  quadrupleCaptain: { name: 'Dört Dörtlük Kaptan', multiplier: 4 },
  benchBoost: { name: 'Tüm Takım Sahaya' },
  unlimitedBudget: { name: 'Limitsiz Bütçe' },
  attack: { name: 'Hücum', extraBudget: 5 }
};

function countsByPosition(players) {
  return players.reduce((acc, p) => {
    if (p && POSITIONS.includes(p.position)) acc[p.position] = (acc[p.position] || 0) + 1;
    return acc;
  }, { GK: 0, DEF: 0, MID: 0, FWD: 0 });
}

function validateSquad(players, budget = 100, maxPerClub = 3) {
  const errors = [];
  if (players.length !== 15) errors.push('Kadro tam olarak 15 futbolcudan oluşmalı.');
  const counts = countsByPosition(players);
  const expected = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
  for (const pos of POSITIONS) {
    if (counts[pos] !== expected[pos]) errors.push(`${pos} sayısı ${expected[pos]} olmalı.`);
  }
  const total = players.reduce((s, p) => s + Number(p.price || 0), 0);
  if (total > budget + 1e-9) errors.push(`Bütçe aşıldı: ${total.toFixed(1)} / ${budget.toFixed(1)}.`);
  const clubs = {};
  for (const p of players) clubs[p.club] = (clubs[p.club] || 0) + 1;
  for (const [club, count] of Object.entries(clubs)) {
    if (count > maxPerClub) errors.push(`${club} takımından en fazla ${maxPerClub} oyuncu seçilebilir.`);
  }
  return { valid: errors.length === 0, errors, total };
}

function formationForPlayers(players) {
  const counts = countsByPosition(players);
  for (const [name, rule] of Object.entries(FORMATIONS)) {
    if (POSITIONS.every(pos => counts[pos] === rule[pos])) return name;
  }
  return null;
}

function validateLineup(starters, formation, options = {}) {
  const errors = [];
  if (starters.length !== 11) errors.push('İlk 11 tam olarak 11 oyuncudan oluşmalı.');
  const counts = countsByPosition(starters);

  // Hücum card takes the team outside the standard formation rules. Keep the
  // universal football constraints: exactly one goalkeeper, at least one
  // defender and at least one forward, while the 15-player squad limits still
  // cap each position naturally.
  if (options.attackMode) {
    if (counts.GK !== 1) errors.push('Hücum kartında da ilk 11’de tam 1 kaleci olmalı.');
    if (counts.DEF < 1) errors.push('Hücum kartında ilk 11’de en az 1 defans olmalı.');
    if (counts.FWD < 1) errors.push('Hücum kartında ilk 11’de en az 1 forvet olmalı.');
    return { valid: errors.length === 0, errors, formation: `${counts.DEF}-${counts.MID}-${counts.FWD}` };
  }

  const rule = FORMATIONS[formation] || FORMATIONS[formationForPlayers(starters)];
  const resolvedFormation = FORMATIONS[formation] ? formation : formationForPlayers(starters);
  if (!rule) errors.push('Geçersiz diziliş.');
  if (rule) {
    for (const pos of POSITIONS) {
      if (counts[pos] !== rule[pos]) errors.push(`${resolvedFormation} için ${pos}: ${rule[pos]} oyuncu gerekir.`);
    }
  }
  return { valid: errors.length === 0, errors, formation: resolvedFormation };
}

function fixtureDifficulty(value) {
  if (value <= 2) return 'Kolay';
  if (value === 3) return 'Orta';
  return 'Zor';
}

// Official TFF Fantezi Lig scoring rules.
function scorePlayer(stats, position) {
  const minutes = Number(stats.minutes || 0);
  let points = minutes > 60 ? 2 : minutes > 0 ? 1 : 0;
  points += Number(stats.goals || 0) * ({ GK: 10, DEF: 6, MID: 5, FWD: 4 }[position] || 4);
  points += Number(stats.assists || 0) * 3;
  if (stats.cleanSheet && minutes >= 60) points += ({ GK: 4, DEF: 4, MID: 1, FWD: 0 }[position] || 0);
  if ((position === 'GK' || position === 'DEF') && Number(stats.goalsConceded || 0) >= 2) {
    points -= Math.floor(Number(stats.goalsConceded || 0) / 2);
  }
  if (position === 'GK') points += Math.floor(Number(stats.saves || 0) / 3);
  points += Number(stats.penaltySaves || 0) * 5;
  points -= Number(stats.penaltyMisses || 0) * 2;
  points -= Number(stats.yellow || 0);
  points -= Number(stats.red || 0) * 3;
  points -= Number(stats.ownGoals || 0) * 2;
  points += Number(stats.bonus || 0);
  return points;
}

function playerMinutes(player) {
  if (!player) return 0;
  for (const candidate of [player.gameweekMinutes, player.minutes, player.stats && player.stats.minutes]) {
    if (candidate !== undefined && candidate !== null && Number.isFinite(Number(candidate))) return Number(candidate);
  }
  // If the data provider has not supplied minutes yet, treat participation as
  // unknown rather than forcing an automatic substitution.
  return null;
}

function hasPlayed(player) {
  const minutes = playerMinutes(player);
  return minutes === null ? true : minutes > 0;
}

function standardLineupValid(players) {
  return Boolean(formationForPlayers(players));
}

function resolveAutomaticLineup({ squadEntries, playersById, activeCard }) {
  const entries = squadEntries.map(e => ({ ...e }));
  const starting = entries.filter(e => e.isStarting);
  const bench = entries.filter(e => !e.isStarting).sort((a, b) => Number(a.benchOrder ?? 99) - Number(b.benchOrder ?? 99));
  const substitutions = [];
  const usedBench = new Set();

  if (activeCard !== 'benchBoost') {
    for (const starter of [...starting]) {
      const starterPlayer = playersById[starter.playerId];
      if (hasPlayed(starterPlayer)) continue;

      for (const candidate of bench) {
        if (usedBench.has(candidate.playerId)) continue;
        const benchPlayer = playersById[candidate.playerId];
        if (!hasPlayed(benchPlayer)) continue;
        if (starterPlayer?.position === 'GK' && benchPlayer?.position !== 'GK') continue;
        if (starterPlayer?.position !== 'GK' && benchPlayer?.position === 'GK') continue;

        const proposed = starting
          .filter(e => e.playerId !== starter.playerId && !substitutions.some(s => s.outId === e.playerId))
          .concat(substitutions.map(s => entries.find(e => e.playerId === s.inId)).filter(Boolean))
          .concat(candidate)
          .map(e => playersById[e.playerId])
          .filter(Boolean);

        // Auto substitutions must preserve one of the standard valid shapes.
        if (proposed.length === 11 && standardLineupValid(proposed)) {
          usedBench.add(candidate.playerId);
          substitutions.push({ outId: starter.playerId, inId: candidate.playerId });
          break;
        }
      }
    }
  }

  const outIds = new Set(substitutions.map(s => s.outId));
  const inIds = new Set(substitutions.map(s => s.inId));
  const activeEntries = activeCard === 'benchBoost'
    ? entries
    : entries.filter(e => (e.isStarting && !outIds.has(e.playerId)) || inIds.has(e.playerId));

  const captain = entries.find(e => e.isCaptain);
  const vice = entries.find(e => e.isVice);
  let captainPlayerId = null;
  if (captain && hasPlayed(playersById[captain.playerId])) captainPlayerId = captain.playerId;
  else if (vice && hasPlayed(playersById[vice.playerId])) captainPlayerId = vice.playerId;

  return { activeEntries, substitutions, captainPlayerId };
}

function calculateTeamPoints({ squadEntries, playersById, activeCard }) {
  const resolved = resolveAutomaticLineup({ squadEntries, playersById, activeCard });
  let total = 0;
  const breakdown = [];
  for (const entry of resolved.activeEntries) {
    const player = playersById[entry.playerId];
    if (!player) continue;
    let multiplier = 1;
    if (entry.playerId === resolved.captainPlayerId) {
      multiplier = activeCard === 'quadrupleCaptain' ? 4 : activeCard === 'tripleCaptain' ? 3 : 2;
    }
    const base = Number(player.gameweekPoints || 0);
    const pts = base * multiplier;
    total += pts;
    breakdown.push({ playerId: player.id, name: player.name, points: pts, basePoints: base, multiplier });
  }
  return { total, breakdown, substitutions: resolved.substitutions, captainPlayerId: resolved.captainPlayerId };
}

function resultSign(home, away) {
  if (home > away) return 'H';
  if (home < away) return 'A';
  return 'D';
}

function calculateNostradamusPoints(predictions, fixtures, week) {
  const matches = fixtures.filter(f => Number(f.week) === Number(week));
  const allPredicted = matches.length > 0 && matches.every(f => {
    const p = predictions && predictions[f.id];
    return p && Number.isInteger(Number(p.home)) && Number.isInteger(Number(p.away));
  });
  let correctResults = 0;
  let evaluated = 0;
  for (const f of matches) {
    if (f.homeScore === null || f.homeScore === undefined || f.awayScore === null || f.awayScore === undefined) continue;
    const p = predictions && predictions[f.id];
    if (!p) continue;
    evaluated++;
    if (resultSign(Number(p.home), Number(p.away)) === resultSign(Number(f.homeScore), Number(f.awayScore))) correctResults++;
  }
  const completionBonus = allPredicted ? 1 : 0;
  return { total: completionBonus + correctResults, completionBonus, correctResults, evaluated, allPredicted, matchCount: matches.length };
}

function getWeekDeadline(fixtures, week) {
  const kickoffs = fixtures
    .filter(f => Number(f.week) === Number(week) && f.kickoff)
    .map(f => new Date(f.kickoff).getTime())
    .filter(Number.isFinite);
  if (!kickoffs.length) return null;
  return new Date(Math.min(...kickoffs) - 60 * 60 * 1000);
}

function isWeekLocked(fixtures, week, now = new Date()) {
  const deadline = getWeekDeadline(fixtures, week);
  return deadline ? now.getTime() >= deadline.getTime() : false;
}

module.exports = {
  POSITIONS, FORMATIONS, CARDS,
  validateSquad, validateLineup, formationForPlayers, fixtureDifficulty,
  scorePlayer, resolveAutomaticLineup, calculateTeamPoints,
  calculateNostradamusPoints, getWeekDeadline, isWeekLocked
};
