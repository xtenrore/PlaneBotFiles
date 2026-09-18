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

        // Persisted user progress wins by default, while canonical football data
        // is migrated when the seed/data schema version advances.
        this.data = { ...fresh, ...parsed };

        const oldVersion = Number(parsed.version || 1);
        const newVersion = Number(fresh.version || 1);
        if (oldVersion < newVersion) {
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

          // Week 6 is the current 2026/27 matchweek represented by this data pack.
          this.data.users = this.data.users.map(user => ({
            ...user,
            activeWeek: 6,
            cards: { ...defaultCards(), ...(user.cards || {}) }
          }));

          this.save();
          console.log(`Futbol verisi v${oldVersion} -> v${newVersion} güncellendi; kullanıcı ilerlemesi korundu.`);
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
