const fs = require('fs');
const path = require('path');
const { seedData, defaultCards } = require('./seed');

class Store {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = seedData();
    this.load();
  }

  load() {
    try {
      const fresh = seedData();
      if (fs.existsSync(this.filePath)) {
        const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));

        // Persisted user progress wins by default. Canonical football data is
        // refreshed whenever the stored file is stale OR does not match the
        // current real-player 2026/27 data pack. This fixes persistent volumes
        // that previously had version 2 but still contained fictional players.
        this.data = { ...fresh, ...parsed };

        const oldVersion = Number(parsed.version || 1);
        const newVersion = Number(fresh.version || 1);
        const parsedPlayers = Array.isArray(parsed.players) ? parsed.players : [];
        const parsedFixtures = Array.isArray(parsed.fixtures) ? parsed.fixtures : [];
        const hasCanonicalRealPlayers = parsedPlayers.some(p => p && p.name === 'Victor Osimhen' && p.club === 'Galatasaray' && p.realPlayer === true)
          && parsedPlayers.some(p => p && p.name === 'Ederson' && p.club === 'Fenerbahçe' && p.realPlayer === true)
          && parsedPlayers.some(p => p && p.name === 'Orkun Kökçü' && p.club === 'Beşiktaş' && p.realPlayer === true)
          && parsedPlayers.some(p => p && p.name === 'Mohamed Salah' && p.club === 'Trabzonspor' && p.realPlayer === true);
        const hasCurrentWeek = parsedFixtures.some(f => f && f.week === 6 && f.home === 'Trabzonspor' && f.away === 'Galatasaray');
        const needsCanonicalRefresh = oldVersion < newVersion || !hasCanonicalRealPlayers || !hasCurrentWeek;

        if (needsCanonicalRefresh) {
          this.data = {
            ...fresh,
            ...parsed,
            version: newVersion,
            players: fresh.players,
            fixtures: fresh.fixtures,
            rewards: fresh.rewards,
            users: Array.isArray(parsed.users) ? parsed.users : fresh.users,
            squads: parsed.squads || {},
            transfers: Array.isArray(parsed.transfers) ? parsed.transfers : [],
            predictions: parsed.predictions || {},
            leagues: Array.isArray(parsed.leagues) ? parsed.leagues : fresh.leagues,
            cardUsage: Array.isArray(parsed.cardUsage) ? parsed.cardUsage : []
          };

          // Player IDs and positional ordering are intentionally kept stable in
          // the canonical seed, so existing squads remain valid after migration.
          this.data.users = this.data.users.map(user => ({
            ...user,
            activeWeek: 6,
            cards: { ...defaultCards(), ...(user.cards || {}) }
          }));

          this.save();
          console.log(`Canonical 2026/27 futbol verisi yenilendi (v${oldVersion} -> v${newVersion}); kullanıcı ilerlemesi korundu.`);
        }
      } else {
        this.data = fresh;
        this.save();
      }
    } catch (err) {
      console.error('Veri dosyası okunamadı, başlangıç verisi kullanılıyor:', err.message);
      this.data = seedData();
      this.save();
    }
  }

  save() {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    const temp = `${this.filePath}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(this.data, null, 2));
    fs.renameSync(temp, this.filePath);
  }

  ensureUser(id, profile = {}) {
    let user = this.data.users.find(u => u.id === id);
    if (!user) {
      user = {
        id,
        displayName: profile.displayName || 'Yeni Menajer',
        teamName: profile.teamName || 'Benim Takımım',
        budget: 100,
        bank: 100,
        points: 0,
        gameweekPoints: 0,
        overallRank: 999999,
        previousRank: 999999,
        freeTransfers: 1,
        activeWeek: 6,
        formation: '4-4-2',
        cards: defaultCards(),
        createdAt: new Date().toISOString()
      };
      this.data.users.push(user);
      this.save();
    }
    return user;
  }
}

module.exports = { Store };
