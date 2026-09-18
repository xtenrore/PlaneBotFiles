const clubs = [
  ['Galatasaray', 'GS'], ['Fenerbahçe', 'FB'], ['Beşiktaş', 'BJK'], ['Trabzonspor', 'TS'],
  ['Başakşehir', 'IBFK'], ['Samsunspor', 'SAM'], ['Göztepe', 'GOZ'], ['Kasımpaşa', 'KAS'],
  ['Antalyaspor', 'ANT'], ['Konyaspor', 'KON'], ['Alanyaspor', 'ALA'], ['Gaziantep FK', 'GFK'],
  ['Rizespor', 'RIZ'], ['Kayserispor', 'KAY'], ['Eyüpspor', 'EYP'], ['Gençlerbirliği', 'GEN'],
  ['Kocaelispor', 'KOC'], ['Fatih Karagümrük', 'FKG']
];

const firstNames = ['Arda','Kerem','Emir','Efe','Mert','Can','Berk','Onur','Oğuz','Yusuf','Barış','Deniz','Ali','Batuhan','Kaan','Umut','Serkan','Tolga','Doruk','Tuna','Mateo','Lucas','Rafael','Nicolas','Victor','Milan','Ivan','Luka','Martin','Daniel'];
const lastNames = ['Yılmaz','Kaya','Demir','Aydın','Çelik','Şahin','Koç','Aslan','Öztürk','Aksoy','Silva','Santos','Costa','Müller','Petrov','Jovanovic','Lopez','Martin','Diaz','Rossi','Marin','Torres','Ndiaye','Camara','Bamba','Kovac'];

function seededRandom(seed) { let x = Math.sin(seed) * 10000; return x - Math.floor(x); }

function makePlayers() {
  const players = []; let id = 1;
  clubs.forEach(([club, code], clubIndex) => {
    const template = ['GK','GK','DEF','DEF','DEF','DEF','MID','MID','MID','MID','FWD','FWD'];
    template.forEach((position, idx) => {
      const r = seededRandom(id * 19 + clubIndex * 31 + idx);
      const name = `${firstNames[(id * 7 + idx) % firstNames.length]} ${lastNames[(id * 11 + clubIndex) % lastNames.length]}`;
      const base = position === 'FWD' ? 7.3 : position === 'MID' ? 6.7 : position === 'DEF' ? 5.8 : 5.3;
      const elite = clubIndex < 4 ? 1.0 : clubIndex < 8 ? 0.4 : 0;
      const price = Math.round((base + elite + r * 3.6) * 10) / 10;
      const totalPoints = Math.floor(18 + r * 92 + (clubIndex < 4 ? 18 : 0));
      const form = Math.round((2.2 + r * 7.6) * 10) / 10;
      const gameweekPoints = Math.max(-1, Math.floor(r * 13) - 1);
      const statusRoll = seededRandom(id * 37);
      const status = statusRoll > .94 ? 'Sakat' : statusRoll > .89 ? 'Şüpheli' : statusRoll > .86 ? 'Cezalı' : 'Hazır';
      players.push({ id: String(id++), name, club, clubCode: code, position, price, totalPoints, form, gameweekPoints, ownership: Math.round((3 + r * 46) * 10) / 10, status, fixtureDifficulty: 1 + Math.floor(r * 5) });
    });
  });
  return players;
}

function makeFixtures() {
  const fixtures = []; const now = new Date();
  for (let week = 1; week <= 6; week++) {
    const rotated = clubs.map((_, i) => clubs[(i + week - 1) % clubs.length]);
    for (let i = 0; i < 9; i++) {
      const home = rotated[i][0], away = rotated[17 - i][0];
      const kick = new Date(now.getTime() + ((week - 1) * 7 + (i % 3)) * 86400000 + (18 + (i % 3)) * 3600000);
      fixtures.push({ id: `w${week}-${i}`, week, home, away, kickoff: kick.toISOString(), status: week === 1 && i < 2 ? 'CANLI' : 'PROGRAM', homeScore: week === 1 && i < 2 ? i + 1 : null, awayScore: week === 1 && i < 2 ? i : null, minute: week === 1 && i < 2 ? 54 + i * 11 : null });
    }
  }
  return fixtures;
}

function defaultCards() { return { tripleCaptain: 1, quadrupleCaptain: 1, benchBoost: 1, unlimitedBudget: 1, attack: 1 }; }

function seedData() {
  const players = makePlayers();
  const users = [
    { id: 'demo', displayName: 'Demo Menajer', teamName: 'Boğaz Kartalları', budget: 100, bank: 100, points: 412, gameweekPoints: 57, overallRank: 12841, previousRank: 13992, freeTransfers: 1, activeWeek: 1, formation: '4-4-2', createdAt: new Date().toISOString(), cards: defaultCards() },
    { id: 'bot-1', displayName: 'Ece', teamName: 'Kadıköy XI', budget: 100, bank: 3.2, points: 498, gameweekPoints: 71, overallRank: 120, formation: '4-3-3', cards: defaultCards() },
    { id: 'bot-2', displayName: 'Mert', teamName: 'Anadolu Gücü', budget: 100, bank: 1.1, points: 476, gameweekPoints: 63, overallRank: 670, formation: '3-4-3', cards: defaultCards() },
    { id: 'bot-3', displayName: 'Selin', teamName: 'Kuzey Tribünü', budget: 100, bank: 0.8, points: 451, gameweekPoints: 66, overallRank: 2190, formation: '3-5-2', cards: defaultCards() }
  ];
  return { version: 1, players, fixtures: makeFixtures(), users, squads: {}, transfers: [], predictions: {}, leagues: [{ id: 'genel', name: 'Genel Sıralama', code: 'GENEL', ownerId: 'system', members: ['demo','bot-1','bot-2','bot-3'], type: 'global' }], cardUsage: [], rewards: [
    { id:'r1', title:'Haftanın Menajeri', description:'Haftalık puanda ilk 100’e gir.', progress:72, target:100, icon:'🏆' },
    { id:'r2', title:'Tahmin Ustası', description:'Bir haftada 5 doğru skor tahmini yap.', progress:3, target:5, icon:'🎯' },
    { id:'r3', title:'Transfer Dehası', description:'Transfer ettiğin bir oyuncudan 10+ puan al.', progress:0, target:1, icon:'⚡' }
  ]};
}

module.exports = { clubs, seedData, defaultCards };
