const test = require('node:test');
const assert = require('node:assert/strict');
const { validateSquad, validateLineup, scorePlayer, calculateTeamPoints } = require('../lib/game');
const { seedData, clubs } = require('../lib/seed');

function p(id,position,price=5,club='A'){return {id:String(id),position,price,club};}

test('15 kişilik kadro kuralları',()=>{
  const squad=[p(1,'GK',5,'A'),p(2,'GK',5,'B'),...Array.from({length:5},(_,i)=>p(10+i,'DEF',5,String(i))),...Array.from({length:5},(_,i)=>p(20+i,'MID',5,String(i+5))),...Array.from({length:3},(_,i)=>p(30+i,'FWD',5,String(i+10)))];
  assert.equal(validateSquad(squad,100,3).valid,true);
});

test('4-3-3 ilk 11 doğrulaması',()=>{
  const starters=[p(1,'GK'),...Array.from({length:4},(_,i)=>p(10+i,'DEF')),...Array.from({length:3},(_,i)=>p(20+i,'MID')),...Array.from({length:3},(_,i)=>p(30+i,'FWD'))];
  assert.equal(validateLineup(starters,'4-3-3').valid,true);
});

test('oyuncu puanlama mantığı',()=>{
  assert.equal(scorePlayer({minutes:90,goals:1,assists:1,cleanSheet:true,goalsConceded:0,bonus:2},'MID'),13);
});

test('üçlü kaptan çarpanı',()=>{
  const result=calculateTeamPoints({squadEntries:[{playerId:'1',isStarting:true,isCaptain:true}],playersById:{'1':{id:'1',name:'X',position:'FWD',gameweekPoints:5}},activeCard:'tripleCaptain'});
  assert.equal(result.total,15);
});

test('2026/27 veri paketi 18 kulüp ve 216 gerçek futbolcu içerir',()=>{
  const data=seedData();
  assert.equal(data.version,2);
  assert.equal(clubs.length,18);
  assert.equal(data.players.length,216);
  assert.ok(data.players.every(player=>player.realPlayer===true&&player.season==='2026/27'));
  assert.equal(new Set(data.players.map(player=>player.club)).size,18);
  assert.equal(data.fixtures.filter(f=>f.week===6).length,9);
});

test('öne çıkan gerçek futbolcular doğru kulüplerde bulunur',()=>{
  const players=seedData().players;
  const clubOf=name=>players.find(player=>player.name===name)?.club;
  assert.equal(clubOf('Victor Osimhen'),'Galatasaray');
  assert.equal(clubOf('Ederson'),'Fenerbahçe');
  assert.equal(clubOf('Orkun Kökçü'),'Beşiktaş');
  assert.equal(clubOf('Mohamed Salah'),'Trabzonspor');
});
