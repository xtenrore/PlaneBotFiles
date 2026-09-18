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

function applyOfficialRosterPatch(data) {
  if (!data || !Array.isArray(data.players)) return data;

  for (const player of data.players) {
    const replacement = OFFICIAL_ROSTER_UPDATES.get(player.name);
    if (replacement) player.name = replacement;
  }

  // Version 3 represents the fully audited 18-club TFF A-team data pack.
  data.version = Math.max(Number(data.version || 1), 3);
  data.footballData = {
    ...(data.footballData || {}),
    season: '2026/27',
    source: 'TFF official A-team lists',
    verifiedAt: '2026-09-18',
    officialRosterAudit: true
  };
  return data;
}

module.exports = { OFFICIAL_ROSTER_UPDATES, applyOfficialRosterPatch };
