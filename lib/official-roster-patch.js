'use strict';

// Corrections discovered by checking every selected SahaNova player against
// the TFF official A-team lists published on 16 September 2026.
// IDs/positions remain unchanged so existing fantasy squads stay valid.
const OFFICIAL_ROSTER_UPDATES = new Map([
  ['Marius Mouandilmadji', 'Kouadou Jaures Assoumou'], // Samsunspor
  ['Adem Arous', 'Adam Arous'],                       // Kasımpaşa spelling
  ['Blaz Kramer', 'Enis Destan'],                     // Tümosan Konyaspor
  ['Maestro', 'Gaius Makouta'],                       // Corendon Alanyaspor
  ['Calegari', 'Charles Raux-Yao'],                   // Eyüpspor
  ['Habib Keïta', 'Tobias Gulliksen']                 // Kocaelispor
]);

const STARTING_BUDGET_MILLION_TL = 100;

// Headline players receive hand-tuned fantasy prices so the most desirable
// options carry a meaningful opportunity cost inside a 100M squad budget.
// Remaining players use the deterministic position/performance model below.
const REALISTIC_FANTASY_PRICE_OVERRIDES = new Map([
  ['Victor Osimhen', 14.5],
  ['Mohamed Salah', 14.0],
  ['Dušan Vlahović', 12.0],
  ['Romelu Lukaku', 11.5],
  ['Leroy Sané', 11.0],
  ['Mason Greenwood', 10.5],
  ['Leandro Trossard', 10.0],
  ['Marco Asensio', 10.0],
  ['Orkun Kökçü', 9.5],
  ['Gabriel Sara', 9.0],
  ["N'Golo Kanté", 9.0],
  ['Paul Onuachu', 9.0],
  ['Mattéo Guendouzi', 8.5],
  ['İlkay Gündoğan', 8.5],
  ['Lucas Torreira', 8.0],
  ['Fabinho', 8.0],
  ['Milan Škriniar', 7.5],
  ['Davinson Sánchez', 7.0],
  ['Nathan Aké', 7.0],
  ['Ederson', 7.0],
  ['Uğurcan Çakır', 6.5],
  ['André Onana', 6.5],
  ['Alexander Nübel', 6.0]
]);

const POSITION_PRICE_RANGES = {
  GK: [4.0, 6.0],
  DEF: [4.0, 6.8],
  MID: [4.5, 9.0],
  FWD: [5.0, 10.0]
};

const CLUB_PRICE_BOOST = {
  Galatasaray: 0.5,
  Fenerbahçe: 0.5,
  Beşiktaş: 0.35,
  Trabzonspor: 0.35,
  'İstanbul Başakşehir FK': 0.15,
  Samsunspor: 0.10,
  Göztepe: 0.10
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundHalf(value) {
  return Math.round(value * 2) / 2;
}

function realisticFantasyPrice(player) {
  const override = REALISTIC_FANTASY_PRICE_OVERRIDES.get(player.name);
  if (override !== undefined) return override;

  const [min, max] = POSITION_PRICE_RANGES[player.position] || [4.0, 8.0];
  const totalPointsSignal = clamp((Number(player.totalPoints || 0) - 18) / 110, 0, 1);
  const formSignal = clamp(Number(player.form || 0) / 10, 0, 1);
  const performanceSignal = totalPointsSignal * 0.65 + formSignal * 0.35;
  const clubBoost = Number(CLUB_PRICE_BOOST[player.club] || 0);
  return clamp(roundHalf(min + (max - min) * performanceSignal + clubBoost), min, max + 0.5);
}

function applyOfficialRosterPatch(data) {
  if (!data || !Array.isArray(data.players)) return data;

  for (const player of data.players) {
    const replacement = OFFICIAL_ROSTER_UPDATES.get(player.name);
    if (replacement) player.name = replacement;
    player.price = realisticFantasyPrice(player);
  }

  // Version 4 adds the audited 100M economy metadata and realistic fantasy
  // pricing model while keeping player IDs stable for persisted squads.
  data.version = Math.max(Number(data.version || 1), 4);
  data.footballData = {
    ...(data.footballData || {}),
    season: '2026/27',
    source: 'TFF official A-team lists',
    verifiedAt: '2026-09-18',
    officialRosterAudit: true,
    startingBudgetMillionTL: STARTING_BUDGET_MILLION_TL,
    priceUnit: 'million TL',
    pricingModel: 'fantasy-performance-v1'
  };
  return data;
}

module.exports = {
  OFFICIAL_ROSTER_UPDATES,
  REALISTIC_FANTASY_PRICE_OVERRIDES,
  STARTING_BUDGET_MILLION_TL,
  realisticFantasyPrice,
  applyOfficialRosterPatch
};
