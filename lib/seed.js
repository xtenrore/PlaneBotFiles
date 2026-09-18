const clubs = [
  ['Galatasaray', 'GS'], ['Fenerbahçe', 'FB'], ['Beşiktaş', 'BJK'], ['Trabzonspor', 'TS'],
  ['İstanbul Başakşehir FK', 'IBFK'], ['Samsunspor', 'SAM'], ['Göztepe', 'GOZ'], ['Kasımpaşa', 'KAS'],
  ['Amed Sportif Faaliyetler', 'AMD'], ['Tümosan Konyaspor', 'KON'], ['Corendon Alanyaspor', 'ALA'], ['Gaziantep FK', 'GFK'],
  ['Çaykur Rizespor', 'RIZ'], ['Arca Çorum FK', 'COR'], ['Eyüpspor', 'EYP'], ['Gençlerbirliği', 'GEN'],
  ['Kocaelispor', 'KOC'], ['Erzurumspor FK', 'ERZ']
];

// 2026/27 A takım kadrolarından seçilmiş gerçek futbolcular.
// Dizilim her kulüp için: 2 GK, 4 DEF, 4 MID, 2 FWD.
const realSquads = {
  GS: [
    ['Uğurcan Çakır','GK'], ['Günay Güvenç','GK'],
    ['Davinson Sánchez','DEF'], ['Ismail Jakobs','DEF'], ['Eren Elmalı','DEF'], ['Abdülkerim Bardakcı','DEF'],
    ['Gabriel Sara','MID'], ['İlkay Gündoğan','MID'], ['Lucas Torreira','MID'], ['Mario Lemina','MID'],
    ['Leroy Sané','FWD'], ['Victor Osimhen','FWD']
  ],
  FB: [
    ['Ederson','GK'], ['Mert Günok','GK'],
    ['Nathan Aké','DEF'], ['Mert Müldür','DEF'], ['Nélson Semedo','DEF'], ['Milan Škriniar','DEF'],
    ['İsmail Yüksek','MID'], ['Mattéo Guendouzi','MID'], ['Marco Asensio','MID'], ["N'Golo Kanté",'MID'],
    ['Romelu Lukaku','FWD'], ['Mason Greenwood','FWD']
  ],
  BJK: [
    ['Alexander Nübel','GK'], ['Doğan Alemdar','GK'],
    ['Kassoum Ouattara','DEF'], ['Rıdvan Yılmaz','DEF'], ['Tiago Djaló','DEF'], ['Emirhan Topçu','DEF'],
    ['Wilfred Ndidi','MID'], ['Salih Özcan','MID'], ['Orkun Kökçü','MID'], ['Fabio Miretti','MID'],
    ['Dušan Vlahović','FWD'], ['Leandro Trossard','FWD']
  ],
  TS: [
    ['André Onana','GK'], ['Onuralp Çevikkan','GK'],
    ['Samet Akaydin','DEF'], ['Stefan Savić','DEF'], ['Wagner Pina','DEF'], ['Cenk Özkacar','DEF'],
    ['Okay Yokuşlu','MID'], ['Fabinho','MID'], ['Ernest Muçi','MID'], ['Ruslan Malinovskyi','MID'],
    ['Mohamed Salah','FWD'], ['Paul Onuachu','FWD']
  ],
  IBFK: [
    ['Volkan Babacan','GK'], ['Muhammed Şengezer','GK'],
    ['Jerome Opoku','DEF'], ['Onur Bulut','DEF'], ['Emin Bayram','DEF'], ['Ousseynou Ba','DEF'],
    ['Olivier Kemen','MID'], ['Abbosbek Fayzullaev','MID'], ['Berkay Özcan','MID'], ['Andreas Skov Olsen','MID'],
    ['Davie Selke','FWD'], ['Eldor Shomurodov','FWD']
  ],
  SAM: [
    ['Okan Kocuk','GK'], ['Bilal Bayazit','GK'],
    ['Joe Mendes','DEF'], ['Igor Drapinski','DEF'], ['Strahinja Eraković','DEF'], ['Logi Tómasson','DEF'],
    ['Celil Yüksel','MID'], ['Afonso Sousa','MID'], ['Samed Onur','MID'], ['Elliot Watt','MID'],
    ['Mohamed Bayo','FWD'], ['Marius Mouandilmadji','FWD']
  ],
  GOZ: [
    ['Arda Özçimen','GK'], ['Luka Gugeshashvili','GK'],
    ['Allan Godoi','DEF'], ['Taha Altıkardeş','DEF'], ['Ege Yıldırım','DEF'], ['Noah Sonko Sundberg','DEF'],
    ['Rhaldney','MID'], ['Alex Matos','MID'], ['Efkan Bekiroğlu','MID'], ['Tino Anjorin','MID'],
    ['Juan','FWD'], ['Sinclair Armstrong','FWD']
  ],
  KAS: [
    ['Andreas Gianniotis','GK'], ['Ali Emre Yanar','GK'],
    ['Cláudio Winck','DEF'], ['Adem Arous','DEF'], ['Kamil Çörekçi','DEF'], ['Matei Cristian Ilie','DEF'],
    ['Haris Hajradinović','MID'], ['Andri Baldursson','MID'], ['Kerem Demirbay','MID'], ['Elson Mendes','MID'],
    ['Adrian Benedyczak','FWD'], ['Güven Yalçın','FWD']
  ],
  AMD: [
    ['Alban Lafont','GK'], ['Mustafa Burak Bozan','GK'],
    ['Lumbardh Dellova','DEF'], ['Mehmet Yeşil','DEF'], ['Umut Meraş','DEF'], ['David Bates','DEF'],
    ['Rayan Raveloson','MID'], ['Cem Üstündağ','MID'], ['Furkan Soyalp','MID'], ['Samuel Ballet','MID'],
    ['Mbaye Diagne','FWD'], ['Gift Orban','FWD']
  ],
  KON: [
    ['Deniz Ertaş','GK'], ['Bahadır Güngördü','GK'],
    ['Adil Demirbağ','DEF'], ['Uğurcan Yazğılı','DEF'], ['Chidozie Awaziem','DEF'], ['Arthur Masuaku','DEF'],
    ['Diogo Gonçalves','MID'], ['Marko Jevtović','MID'], ['Enis Bardhi','MID'], ['Melih İbrahimoğlu','MID'],
    ['Mostafa Mohamed','FWD'], ['Blaz Kramer','FWD']
  ],
  ALA: [
    ['Paulo Victor','GK'], ['Mert Furkan Bayram','GK'],
    ['Fatih Aksoy','DEF'], ['Fidan Aliti','DEF'], ['Nuno Lima','DEF'], ['Florent Hadergjonaj','DEF'],
    ['Yusuf Özdemir','MID'], ['Maestro','MID'], ['Emre Demir','MID'], ['Ianis Hagi','MID'],
    ['Ui-Jo Hwang','FWD'], ['Ivan Cedric','FWD']
  ],
  GFK: [
    ['Kacper Tobiasz','GK'], ['Ataberk Dadakdeniz','GK'],
    ['Luis Pérez','DEF'], ['Arda Kızıldağ','DEF'], ['Myenty Abena','DEF'], ['Kerim Çalhanoğlu','DEF'],
    ['Juninho Bacuna','MID'], ['Kacper Kozłowski','MID'], ['Alexandru Maxim','MID'], ['Mirza Cihan','MID'],
    ['Serdar Dursun','FWD'], ['Halil Dervişoğlu','FWD']
  ],
  RIZ: [
    ['Yahia Fofana','GK'], ['Zafer Görgen','GK'],
    ['Khusniddin Aliqulov','DEF'], ['Attila Mocsi','DEF'], ['Taha Şahin','DEF'], ['Modibo Sagnan','DEF'],
    ['Taylan Antalyalı','MID'], ['Qazim Laçi','MID'], ['Dal Varešanović','MID'], ['Mithat Pala','MID'],
    ['Ali Sowe','FWD'], ['Valentin Mihăilă','FWD']
  ],
  COR: [
    ['Marcos Felipe','GK'], ['Erhan Erentürk','GK'],
    ['Gökhan Sazdağı','DEF'], ['Çağlar Söyüncü','DEF'], ['Serdar Saatçı','DEF'], ['Hrvoje Smolčić','DEF'],
    ['Mohamed Diomande','MID'], ['Cengiz Ünder','MID'], ['Berat Özdemir','MID'], ['Ylber Ramadani','MID'],
    ['Mame Baba Thiam','FWD'], ['Youssoufa Moukoko','FWD']
  ],
  EYP: [
    ['Horatiu Moldovan','GK'], ['Emre Bilgin','GK'],
    ['Calegari','DEF'], ['Jawad El Yamiq','DEF'], ['Zak Jules','DEF'], ['Simone Giordano','DEF'],
    ['Hamza Akman','MID'], ['David Costa','MID'], ['Chandrel Massanga','MID'], ['Abdelhamid Sabiri','MID'],
    ['Ahmed Abdullahi','FWD'], ['Yusuf Barası','FWD']
  ],
  GEN: [
    ['İrfan Can Eğribayat','GK'], ['Gökhan Akkan','GK'],
    ['Dimitrios Goutas','DEF'], ['Pedro Pereira','DEF'], ['Thalisson','DEF'], ['Metehan Baltacı','DEF'],
    ['Salih Uçan','MID'], ['Cheikh Niasse','MID'], ['Oğulcan Ülgün','MID'], ['Franco Tongya','MID'],
    ['Sékou Koïta','FWD'], ['Pedro Mendes','FWD']
  ],
  KOC: [
    ['Aleksandar Jovanović','GK'], ['Onurcan Piri','GK'],
    ['Anfernee Dijksteel','DEF'], ['Emir Ortakaya','DEF'], ['Tanguy Zoukrou','DEF'], ['Massadio Haïdara','DEF'],
    ['Berkan Kutlu','MID'], ['Show','MID'], ['Mahamadou Susoho','MID'], ['Habib Keïta','MID'],
    ['Bruno Petković','FWD'], ['Florian Ayé','FWD']
  ],
  ERZ: [
    ['Ertuğrul Taşkıran','GK'], ['Matija Orbanić','GK'],
    ['Cengizhan Bayrak','DEF'], ['Mustafa Yumlu','DEF'], ['Nihad Mujakić','DEF'], ['Guram Giorbelidze','DEF'],
    ['Sefa Akgün','MID'], ['Miguel Cardoso','MID'], ['Elisha Owusu','MID'], ['Lawrence Agyekum','MID'],
    ['Eren Tozlu','FWD'], ['Gyrano Kerk','FWD']
  ]
};

function seededRandom(seed) { const x = Math.sin(seed) * 10000; return x - Math.floor(x); }

function makePlayers() {
  const players = []; let id = 1;
  clubs.forEach(([club, code], clubIndex) => {
    const squad = realSquads[code];
    if (!squad || squad.length !== 12) throw new Error(`${club} için 12 gerçek oyuncu gerekli.`);
    squad.forEach(([name, position], idx) => {
      const r = seededRandom(id * 19 + clubIndex * 31 + idx);
      const base = position === 'FWD' ? 6.2 : position === 'MID' ? 5.7 : position === 'DEF' ? 4.9 : 4.5;
      const elite = clubIndex < 4 ? 1.4 : clubIndex < 8 ? 0.6 : 0;
      const price = Math.round((base + elite + r * 3.2) * 10) / 10;
      const totalPoints = Math.floor(18 + r * 92 + (clubIndex < 4 ? 18 : 0));
      const form = Math.round((2.2 + r * 7.6) * 10) / 10;
      const gameweekPoints = 0;
      players.push({
        id: String(id++), name, club, clubCode: code, position, price, totalPoints, form,
        gameweekPoints, ownership: Math.round((3 + r * 46) * 10) / 10,
        status: 'Hazır', fixtureDifficulty: 1 + Math.floor(r * 5), realPlayer: true, season: '2026/27'
      });
    });
  });
  return players;
}

const week6Fixtures = [
  ['Kasımpaşa','Tümosan Konyaspor','2026-09-18T20:00:00+03:00'],
  ['Arca Çorum FK','Corendon Alanyaspor','2026-09-19T17:00:00+03:00'],
  ['Kocaelispor','Gaziantep FK','2026-09-19T17:00:00+03:00'],
  ['Trabzonspor','Galatasaray','2026-09-19T20:00:00+03:00'],
  ['İstanbul Başakşehir FK','Gençlerbirliği','2026-09-19T20:00:00+03:00'],
  ['Fenerbahçe','Eyüpspor','2026-09-20T17:00:00+03:00'],
  ['Erzurumspor FK','Samsunspor','2026-09-20T17:00:00+03:00'],
  ['Amed Sportif Faaliyetler','Beşiktaş','2026-09-20T20:00:00+03:00'],
  ['Göztepe','Çaykur Rizespor','2026-09-20T20:00:00+03:00']
];

function makeFixtures() {
  const fixtures = [];
  for (let week = 1; week <= 5; week++) {
    const rotated = clubs.map((_, i) => clubs[(i + week - 1) % clubs.length]);
    for (let i = 0; i < 9; i++) {
      fixtures.push({
        id: `w${week}-${i}`, week, home: rotated[i][0], away: rotated[17 - i][0],
        kickoff: new Date(Date.UTC(2026, 7, 14 + (week - 1) * 7 + (i % 3), 16 + (i % 3))).toISOString(),
        status: 'BİTTİ', homeScore: null, awayScore: null, minute: null
      });
    }
  }
  week6Fixtures.forEach(([home, away, kickoff], i) => fixtures.push({
    id: `w6-${i}`, week: 6, home, away, kickoff, status: 'PROGRAM', homeScore: null, awayScore: null, minute: null
  }));
  return fixtures;
}

function defaultCards() { return { tripleCaptain: 1, quadrupleCaptain: 1, benchBoost: 1, unlimitedBudget: 1, attack: 1 }; }

function seedData() {
  const players = makePlayers();
  const users = [
    { id: 'demo', displayName: 'Demo Menajer', teamName: 'Boğaz Kartalları', budget: 100, bank: 100, points: 412, gameweekPoints: 0, overallRank: 12841, previousRank: 13992, freeTransfers: 1, activeWeek: 6, formation: '4-4-2', createdAt: new Date().toISOString(), cards: defaultCards() },
    { id: 'bot-1', displayName: 'Ece', teamName: 'Kadıköy XI', budget: 100, bank: 3.2, points: 498, gameweekPoints: 0, overallRank: 120, activeWeek: 6, formation: '4-3-3', cards: defaultCards() },
    { id: 'bot-2', displayName: 'Mert', teamName: 'Anadolu Gücü', budget: 100, bank: 1.1, points: 476, gameweekPoints: 0, overallRank: 670, activeWeek: 6, formation: '3-4-3', cards: defaultCards() },
    { id: 'bot-3', displayName: 'Selin', teamName: 'Kuzey Tribünü', budget: 100, bank: 0.8, points: 451, gameweekPoints: 0, overallRank: 2190, activeWeek: 6, formation: '3-5-2', cards: defaultCards() }
  ];
  return { version: 2, players, fixtures: makeFixtures(), users, squads: {}, transfers: [], predictions: {}, leagues: [{ id: 'genel', name: 'Genel Sıralama', code: 'GENEL', ownerId: 'system', members: ['demo','bot-1','bot-2','bot-3'], type: 'global' }], cardUsage: [], rewards: [
    { id:'r1', title:'Haftanın Menajeri', description:'Haftalık puanda ilk 100’e gir.', progress:72, target:100, icon:'🏆' },
    { id:'r2', title:'Tahmin Ustası', description:'Bir haftada 5 doğru skor tahmini yap.', progress:3, target:5, icon:'🎯' },
    { id:'r3', title:'Transfer Dehası', description:'Transfer ettiğin bir oyuncudan 10+ puan al.', progress:0, target:1, icon:'⚡' }
  ]};
}

module.exports = { clubs, realSquads, seedData, defaultCards };
