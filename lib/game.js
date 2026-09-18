const POSITIONS = ['GK', 'DEF', 'MID', 'FWD'];

const FORMATIONS = {
  '4-4-2': { GK: 1, DEF: 4, MID: 4, FWD: 2 },
  '4-3-3': { GK: 1, DEF: 4, MID: 3, FWD: 3 },
  '3-4-3': { GK: 1, DEF: 3, MID: 4, FWD: 3 },
  '3-5-2': { GK: 1, DEF: 3, MID: 5, FWD: 2 },
  '5-3-2': { GK: 1, DEF: 5, MID: 3, FWD: 2 },
  '5-4-1': { GK: 1, DEF: 5, MID: 4, FWD: 1 }
};

const CARDS = {
  tripleCaptain: { name: 'Üçlü Kaptan', multiplier: 3 },
  quadrupleCaptain: { name: 'Dörtlü Kaptan', multiplier: 4 },
  benchBoost: { name: 'Yedek Gücü' },
  unlimitedBudget: { name: 'Sınırsız Bütçe' },
  attack: { name: 'Hücum!' }
};

function countsByPosition(players) {
  return players.reduce((acc, p) => {
    acc[p.position] = (acc[p.position] || 0) + 1;
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

function validateLineup(starters, formation) {
  const errors = [];
  const rule = FORMATIONS[formation];
  if (!rule) return { valid: false, errors: ['Geçersiz diziliş.'] };
  if (starters.length !== 11) errors.push('İlk 11 tam olarak 11 oyuncudan oluşmalı.');
  const counts = countsByPosition(starters);
  for (const pos of POSITIONS) {
    if (counts[pos] !== rule[pos]) errors.push(`${formation} için ${pos}: ${rule[pos]} oyuncu gerekir.`);
  }
  return { valid: errors.length === 0, errors };
}

function fixtureDifficulty(value) {
  if (value <= 2) return 'Kolay';
  if (value === 3) return 'Orta';
  return 'Zor';
}

function scorePlayer(stats, position) {
  let points = Number(stats.minutes >= 60 ? 2 : stats.minutes > 0 ? 1 : 0);
  points += Number(stats.goals || 0) * ({ GK: 6, DEF: 6, MID: 5, FWD: 4 }[position] || 4);
  points += Number(stats.assists || 0) * 3;
  if (stats.cleanSheet && stats.minutes >= 60) points += ({ GK: 4, DEF: 4, MID: 1, FWD: 0 }[position] || 0);
  if ((position === 'GK' || position === 'DEF') && stats.goalsConceded >= 2) points -= Math.floor(stats.goalsConceded / 2);
  if (position === 'GK') points += Math.floor(Number(stats.saves || 0) / 3);
  points += Number(stats.penaltySaves || 0) * 5;
  points -= Number(stats.penaltyMisses || 0) * 2;
  points -= Number(stats.yellow || 0);
  points -= Number(stats.red || 0) * 3;
  points -= Number(stats.ownGoals || 0) * 2;
  points += Number(stats.bonus || 0);
  return points;
}

function calculateTeamPoints({ squadEntries, playersById, activeCard }) {
  let total = 0;
  const breakdown = [];
  for (const entry of squadEntries) {
    const player = playersById[entry.playerId];
    if (!player) continue;
    const include = entry.isStarting || activeCard === 'benchBoost';
    if (!include) continue;
    let multiplier = 1;
    if (entry.isCaptain) {
      multiplier = activeCard === 'quadrupleCaptain' ? 4 : activeCard === 'tripleCaptain' ? 3 : 2;
    }
    let base = Number(player.gameweekPoints || 0);
    if (activeCard === 'attack' && player.position === 'FWD' && base > 0) base = Math.ceil(base * 1.25);
    const pts = base * multiplier;
    total += pts;
    breakdown.push({ playerId: player.id, name: player.name, points: pts, multiplier });
  }
  return { total, breakdown };
}

module.exports = { POSITIONS, FORMATIONS, CARDS, validateSquad, validateLineup, fixtureDifficulty, scorePlayer, calculateTeamPoints };
