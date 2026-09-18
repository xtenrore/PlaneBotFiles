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
      if (fs.existsSync(this.filePath)) {
        const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        this.data = { ...seedData(), ...parsed };
      } else this.save();
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
      user = { id, displayName: profile.displayName || 'Yeni Menajer', teamName: profile.teamName || 'Benim Takımım', budget:100, bank:100, points:0, gameweekPoints:0, overallRank:999999, previousRank:999999, freeTransfers:1, activeWeek:1, formation:'4-4-2', cards: defaultCards(), createdAt:new Date().toISOString() };
      this.data.users.push(user);
      this.save();
    }
    return user;
  }
}

module.exports = { Store };
