const test = require('node:test');
const assert = require('node:assert/strict');
const {
  FORMATIONS, scorePlayer, resolveAutomaticLineup, calculateTeamPoints,
  calculateNostradamusPoints, getWeekDeadline, isWeekLocked
} = require('../lib/game');

test('official eight standard formations are supported', () => {
  assert.deepEqual(new Set(Object.keys(FORMATIONS)), new Set(['3-5-2','3-4-3','4-4-2','4-3-3','4-5-1','5-4-1','5-3-2','5-2-3']));
});

test('official player scoring handles goalkeeper goals and exact 60 minute threshold', () => {
  assert.equal(scorePlayer({ minutes: 90, goals: 1 }, 'GK'), 12); // 2 appearance + 10 goal
  assert.equal(scorePlayer({ minutes: 60 }, 'FWD'), 1);
  assert.equal(scorePlayer({ minutes: 61 }, 'FWD'), 2);
});

test('automatic substitution respects bench order and a valid resulting formation', () => {
  const playersById = {};
  const entries = [];
  const add = (id, position, isStarting, benchOrder, minutes) => {
    playersById[id] = { id, name:id, position, gameweekMinutes:minutes, gameweekPoints:1 };
    entries.push({ playerId:id, isStarting, benchOrder, isCaptain:false, isVice:false });
  };
  add('gk','GK',true,null,90);
  ['d1','d2','d3','d4'].forEach((id,i)=>add(id,'DEF',true,null,i===3?0:90));
  ['m1','m2','m3','m4'].forEach(id=>add(id,'MID',true,null,90));
  ['f1','f2'].forEach(id=>add(id,'FWD',true,null,90));
  add('bgk','GK',false,3,90);
  add('bm','MID',false,0,90);
  add('bd','DEF',false,1,90);
  add('bf','FWD',false,2,90);
  const result = resolveAutomaticLineup({ squadEntries:entries, playersById, activeCard:null });
  assert.deepEqual(result.substitutions, [{ outId:'d4', inId:'bm' }]);
});

test('vice captain inherits captain multiplier when captain does not play', () => {
  const playersById = {
    c:{id:'c',name:'C',position:'FWD',gameweekMinutes:0,gameweekPoints:0},
    v:{id:'v',name:'V',position:'MID',gameweekMinutes:90,gameweekPoints:5}
  };
  const score = calculateTeamPoints({
    squadEntries:[
      {playerId:'c',isStarting:true,isCaptain:true,isVice:false},
      {playerId:'v',isStarting:true,isCaptain:false,isVice:true}
    ], playersById, activeCard:null
  });
  assert.equal(score.captainPlayerId,'v');
  assert.equal(score.total,10);
});

test('Nostradamus gives one completion point plus one per correct match result', () => {
  const fixtures = [
    {id:'a',week:6,homeScore:2,awayScore:1},
    {id:'b',week:6,homeScore:0,awayScore:0},
    {id:'c',week:6,homeScore:0,awayScore:3}
  ];
  const predictions = {
    a:{home:1,away:0}, // correct home win
    b:{home:2,away:2}, // correct draw
    c:{home:1,away:0}  // wrong
  };
  const result = calculateNostradamusPoints(predictions,fixtures,6);
  assert.equal(result.completionBonus,1);
  assert.equal(result.correctResults,2);
  assert.equal(result.total,3);
});

test('deadline is one hour before first match of the gameweek', () => {
  const fixtures = [
    {week:6,kickoff:'2026-09-18T20:00:00+03:00'},
    {week:6,kickoff:'2026-09-19T17:00:00+03:00'}
  ];
  assert.equal(getWeekDeadline(fixtures,6).toISOString(),'2026-09-18T16:00:00.000Z');
  assert.equal(isWeekLocked(fixtures,6,new Date('2026-09-18T15:59:59.000Z')),false);
  assert.equal(isWeekLocked(fixtures,6,new Date('2026-09-18T16:00:00.000Z')),true);
});
