const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');
const { Store } = require('./lib/store');
const {
  validateSquad, validateLineup, calculateTeamPoints, scorePlayer,
  calculateNostradamusPoints, getWeekDeadline, isWeekLocked, FORMATIONS, CARDS
} = require('./lib/game');
const { h2hWeek, h2hTable, classicTable, cupPairings } = require('./lib/competitions');

const PORT = Number(process.env.PORT || 3000);
const DATA_PATH = process.env.DATA_PATH || path.join(__dirname, 'data', 'db.json');
const PUBLIC = path.join(__dirname, 'public');
const store = new Store(DATA_PATH);

const TYPES = {
  '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon',
  '.gz':'application/gzip'
};

function ensureCollections() {
  for (const key of ['pendingSquads','gameweekLedger','lineupSaves','leagueBans','notifications']) {
    if (!store.data[key] || typeof store.data[key] !== 'object') store.data[key] = {};
  }
  if (!Array.isArray(store.data.promotions)) store.data.promotions = [];
  if (!Array.isArray(store.data.cardUsage)) store.data.cardUsage = [];
  if (!Array.isArray(store.data.transfers)) store.data.transfers = [];
  if (!store.data.predictions || typeof store.data.predictions !== 'object') store.data.predictions = {};
}
ensureCollections();

function headers(type='application/json; charset=utf-8') {
  return {
    'Content-Type': type,
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'strict-origin-when-cross-origin',
    'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Opener-Policy':'same-origin',
    'Cross-Origin-Resource-Policy':'same-origin'
  };
}
function json(res, status, payload) { res.writeHead(status, headers()); res.end(JSON.stringify(payload)); }
function uid(req, url) { return String(req.headers['x-user-id'] || url.searchParams.get('userId') || 'demo').slice(0,64); }
function readBody(req) {
  return new Promise((resolve,reject)=>{
    let data='';
    req.on('data',c=>{ data+=c; if(data.length>262144){ reject(new Error('İstek çok büyük.')); req.destroy(); } });
    req.on('end',()=>{ try{ resolve(data?JSON.parse(data):{}); } catch{ reject(new Error('Geçersiz JSON.')); } });
    req.on('error',reject);
  });
}
function findPlayers(ids) { const set=new Set((ids||[]).map(String)); return store.data.players.filter(p=>set.has(String(p.id))); }
function playerById(id) { return store.data.players.find(p=>String(p.id)===String(id)); }
function nextFixtureForClub(club, week){ return store.data.fixtures.find(f=>Number(f.week)===Number(week)&&(f.home===club||f.away===club))||null; }
function usersById(){ return Object.fromEntries(store.data.users.map(u=>[String(u.id),u])); }
function leaderboard(){
  return classicTable(store.data.users.map(u=>u.id), usersById()).map(row=>({
    rank:row.rank,id:row.id,teamName:row.teamName,displayName:row.displayName,points:row.points,
    gameweekPoints:Number(usersById()[row.id]?.gameweekPoints||0),goals:row.goals
  }));
}
function activeCard(userId, week){ return (store.data.cardUsage.find(c=>c.userId===userId&&Number(c.week)===Number(week))||{}).card||null; }
function weekHalf(week){ return Number(week)<=17?1:2; }
function deadlineFor(week){ return getWeekDeadline(store.data.fixtures,week); }
function locked(week){ return isWeekLocked(store.data.fixtures,week,new Date()); }
function targetWeekForChanges(user){ return locked(user.activeWeek)?Number(user.activeWeek)+1:Number(user.activeWeek); }
function budgetFor(user, week){
  const card=activeCard(user.id,week);
  if(card==='unlimitedBudget')return 9999;
  if(card==='attack')return Number(user.budget||100)+5;
  return Number(user.budget||100);
}
function ensureLedger(userId,week){
  const key=`${userId}:${week}`;
  if(!store.data.gameweekLedger[key]) store.data.gameweekLedger[key]={userId,week:Number(week),teamPoints:0,nostradamusPoints:0,saveBonus:0,totalApplied:0,goals:0,updatedAt:null};
  return store.data.gameweekLedger[key];
}
function editSquad(userId,user,targetWeek){
  if(Number(targetWeek)===Number(user.activeWeek)) return {entries:store.data.squads[userId]||[],formation:user.formation||'4-4-2',bank:Number(user.bank||0),pending:false};
  const pending=store.data.pendingSquads[userId];
  if(pending&&Number(pending.week)===Number(targetWeek)) return {entries:pending.entries,formation:pending.formation,bank:pending.bank,pending:true};
  return {entries:(store.data.squads[userId]||[]).map(e=>({...e})),formation:user.formation||'4-4-2',bank:Number(user.bank||0),pending:true};
}
function persistEditedSquad(userId,user,targetWeek,payload){
  if(Number(targetWeek)===Number(user.activeWeek)){
    store.data.squads[userId]=payload.entries;
    user.formation=payload.formation||user.formation;
    if(payload.bank!==undefined)user.bank=payload.bank;
  }else{
    store.data.pendingSquads[userId]={week:Number(targetWeek),entries:payload.entries,formation:payload.formation||user.formation,bank:payload.bank,updatedAt:new Date().toISOString()};
  }
}
function awardSaveBonus(user,week){
  if(locked(week))return false;
  const ledger=ensureLedger(user.id,week);
  if(ledger.saveBonus)return false;
  ledger.saveBonus=1;
  ledger.totalApplied=Number(ledger.totalApplied||0)+1;
  ledger.updatedAt=new Date().toISOString();
  user.points=Number(user.points||0)+1;
  if(Number(user.activeWeek)===Number(week))user.gameweekPoints=Number(user.gameweekPoints||0)+1;
  store.data.lineupSaves[`${user.id}:${week}`]=new Date().toISOString();
  return true;
}
function syncNostradamus(user,week){
  const ledger=ensureLedger(user.id,week);
  const result=calculateNostradamusPoints(store.data.predictions[user.id]||{},store.data.fixtures,week);
  const previous=Number(ledger.nostradamusPoints||0);
  const delta=result.total-previous;
  if(delta){
    ledger.nostradamusPoints=result.total;
    ledger.totalApplied=Number(ledger.totalApplied||0)+delta;
    ledger.updatedAt=new Date().toISOString();
    user.points=Number(user.points||0)+delta;
    if(Number(user.activeWeek)===Number(week))user.gameweekPoints=Number(user.gameweekPoints||0)+delta;
  }
  return result;
}
function cardAvailability(user,week){
  const half=weekHalf(week);
  const purchased=user.purchasedCards||{};
  return Object.fromEntries(Object.keys(CARDS).map(card=>{
    const used=store.data.cardUsage.filter(x=>x.userId===user.id&&x.card===card&&weekHalf(x.week)===half).length;
    const premium=Number(purchased[`${card}:h${half}`]||0);
    return [card,{used,maxPerHalf:2,freeRemaining:used===0?1:0,premiumRemaining:Math.max(0,premium-Math.max(0,used-1)),available:used===0||(used===1&&premium>0)}];
  }));
}
function leagueView(league,week){
  const map=usersById();
  const format=league.format==='h2h'?'h2h':'classic';
  const table=format==='h2h'?h2hTable(league.members,week,store.data.gameweekLedger,map):classicTable(league.members,map);
  return {...league,format,table,matches:format==='h2h'?h2hWeek(league.members,week,store.data.gameweekLedger):[]};
}
function cupViews(user){
  const all=store.data.users;
  const defs=[
    {id:'general',name:'Genel Kupa',type:'general',members:all.map(u=>u.id)},
    {id:`country:${user.country||'Türkiye'}`,name:`${user.country||'Türkiye'} Kupası`,type:'country',members:all.filter(u=>(u.country||'Türkiye')===(user.country||'Türkiye')).map(u=>u.id)}
  ];
  if(user.favoriteClub)defs.push({id:`club:${user.favoriteClub}`,name:`${user.favoriteClub} Kupası`,type:'favoriteClub',members:all.filter(u=>u.favoriteClub===user.favoriteClub).map(u=>u.id)});
  return defs.map(c=>({...c,pairings:cupPairings(c.members,`w${user.activeWeek}`),memberCount:c.members.length}));
}

function statePayload(id){
  const user=store.ensureUser(id); ensureCollections();
  if(!user.country)user.country='Türkiye';
  const entries=store.data.squads[id]||[]; const week=user.activeWeek||6;
  const squad=entries.map(e=>({...e,player:playerById(e.playerId)})).filter(e=>e.player);
  const players=store.data.players.map(p=>({...p,nextFixture:nextFixtureForClub(p.club,week)}));
  const leagues=store.data.leagues.filter(l=>l.members.includes(id)||l.type==='global').map(l=>leagueView(l,week));
  const deadline=deadlineFor(week);
  const pending=store.data.pendingSquads[id]||null;
  const nostradamus=calculateNostradamusPoints(store.data.predictions[id]||{},store.data.fixtures,week);
  return {
    user:{...user},footballData:store.data.footballData||null,players,squad,pendingSquad:pending,
    fixtures:store.data.fixtures,predictions:store.data.predictions[id]||{},leagues,leaderboard:leaderboard(),cups:cupViews(user),
    rewards:store.data.rewards,formations:FORMATIONS,activeCard:activeCard(id,week),cardAvailability:cardAvailability(user,week),
    deadline:deadline?deadline.toISOString():null,locked:locked(week),changesEffectiveWeek:targetWeekForChanges(user),
    transferPolicy:{limit:'unlimited',pointCost:0,maxPerClub:3,budget:Number(user.budget||100)},nostradamus
  };
}

function adminAllowed(req){ return !process.env.ADMIN_KEY||req.headers['x-admin-key']===process.env.ADMIN_KEY; }

async function handleApi(req,res,url){
  const method=req.method||'GET'; const p=url.pathname; const id=uid(req,url);
  if(method==='GET'&&p==='/api/health') return json(res,200,{ok:true,service:'sahanova-fantezi',version:'1.2.0',dataVersion:store.data.version||null,time:new Date().toISOString()});
  if(method==='GET'&&p==='/api/state') return json(res,200,statePayload(id));
  const body=await readBody(req);

  if(method==='POST'&&p==='/api/profile'){
    const u=store.ensureUser(id);
    const displayName=String(body.displayName||'').trim().slice(0,32),teamName=String(body.teamName||'').trim().slice(0,40);
    if(displayName)u.displayName=displayName;if(teamName)u.teamName=teamName;
    if(body.country!==undefined)u.country=String(body.country||'Türkiye').trim().slice(0,48)||'Türkiye';
    if(body.favoriteClub!==undefined){const club=String(body.favoriteClub||'').trim();u.favoriteClub=store.data.players.some(x=>x.club===club)?club:null;}
    store.save();return json(res,200,{ok:true,user:u});
  }

  if(method==='POST'&&p==='/api/squad'){
    const u=store.ensureUser(id),targetWeek=targetWeekForChanges(u),ids=Array.isArray(body.playerIds)?body.playerIds.map(String):[];
    const players=findPlayers(ids),budget=budgetFor(u,targetWeek),v=validateSquad(players,budget,3);
    if(!v.valid)return json(res,400,{ok:false,errors:v.errors});
    const formation=FORMATIONS[body.formation]?body.formation:'4-4-2',remaining={...FORMATIONS[formation]};
    const entries=players.map((pl,i)=>{const start=remaining[pl.position]>0;if(start)remaining[pl.position]--;return{playerId:pl.id,isStarting:start,benchOrder:start?null:i,isCaptain:false,isVice:false}});
    const starters=entries.filter(e=>e.isStarting);if(starters[0])starters[0].isCaptain=true;if(starters[1])starters[1].isVice=true;
    const bank=Math.round((budget===9999?Number(u.budget||100):budget-v.total)*10)/10;
    persistEditedSquad(id,u,targetWeek,{entries,formation,bank});
    const saveBonus=Number(targetWeek)===Number(u.activeWeek)?awardSaveBonus(u,targetWeek):false;
    store.save();return json(res,200,{ok:true,bank,formation,squad:entries,effectiveWeek:targetWeek,pending:Number(targetWeek)!==Number(u.activeWeek),saveBonus});
  }

  if(method==='POST'&&p==='/api/lineup'){
    const u=store.ensureUser(id),targetWeek=targetWeekForChanges(u),edit=editSquad(id,u,targetWeek),current=edit.entries;
    const starterIds=Array.isArray(body.starterIds)?body.starterIds.map(String):[],starters=findPlayers(starterIds);
    const card=activeCard(id,targetWeek),formation=String(body.formation||edit.formation||u.formation),v=validateLineup(starters,formation,{attackMode:card==='attack'});
    if(!v.valid)return json(res,400,{ok:false,errors:v.errors});
    const captainId=String(body.captainId||''),viceId=String(body.viceId||'');
    if(!starterIds.includes(captainId)||!starterIds.includes(viceId)||captainId===viceId)return json(res,400,{ok:false,errors:['Kaptan ve kaptan yardımcısı ilk 11’de farklı oyuncular olmalı.']});
    const benchOrder=Array.isArray(body.benchOrder)?body.benchOrder.map(String):[];
    current.forEach((e,i)=>{e.isStarting=starterIds.includes(e.playerId);e.isCaptain=e.playerId===captainId;e.isVice=e.playerId===viceId;e.benchOrder=e.isStarting?null:(benchOrder.indexOf(e.playerId)>=0?benchOrder.indexOf(e.playerId):i)});
    persistEditedSquad(id,u,targetWeek,{entries:current,formation:v.formation||formation,bank:edit.bank});
    const saveBonus=Number(targetWeek)===Number(u.activeWeek)?awardSaveBonus(u,targetWeek):false;
    store.save();return json(res,200,{ok:true,effectiveWeek:targetWeek,pending:Number(targetWeek)!==Number(u.activeWeek),formation:v.formation||formation,saveBonus});
  }

  if(method==='POST'&&p==='/api/transfers'){
    const u=store.ensureUser(id),targetWeek=targetWeekForChanges(u),edit=editSquad(id,u,targetWeek),entries=edit.entries;
    const outId=String(body.outId||''),inId=String(body.inId||''),outEntry=entries.find(e=>e.playerId===outId),outP=playerById(outId),inP=playerById(inId);
    if(!outEntry||!outP||!inP)return json(res,400,{ok:false,error:'Transfer oyuncuları bulunamadı.'});
    if(outP.position!==inP.position)return json(res,400,{ok:false,error:'Transfer edilen oyuncular aynı pozisyonda olmalı.'});
    if(entries.some(e=>e.playerId===inId))return json(res,400,{ok:false,error:'Bu oyuncu zaten kadroda.'});
    const candidate=findPlayers(entries.map(e=>e.playerId===outId?inId:e.playerId)),budget=budgetFor(u,targetWeek),v=validateSquad(candidate,budget,3);
    if(!v.valid)return json(res,400,{ok:false,error:v.errors[0]});
    outEntry.playerId=inId;
    const bank=Math.round((budget===9999?Number(u.budget||100):budget-v.total)*10)/10;
    persistEditedSquad(id,u,targetWeek,{entries,formation:edit.formation,bank});
    store.data.transfers.push({id:crypto.randomUUID(),userId:id,week:targetWeek,outId,inId,cost:0,pending:Number(targetWeek)!==Number(u.activeWeek),createdAt:new Date().toISOString()});
    store.save();return json(res,200,{ok:true,cost:0,bank,effectiveWeek:targetWeek,pending:Number(targetWeek)!==Number(u.activeWeek)});
  }

  if(method==='POST'&&p==='/api/cards/use'){
    const u=store.ensureUser(id),targetWeek=targetWeekForChanges(u),card=String(body.card||'');
    if(!CARDS[card])return json(res,400,{ok:false,error:'Geçersiz menajer kartı.'});
    if(activeCard(id,targetWeek))return json(res,400,{ok:false,error:'Bu maç haftasında zaten bir menajer kartı kullandın.'});
    const availability=cardAvailability(u,targetWeek)[card];
    if(!availability.available)return json(res,402,{ok:false,error:'Bu devredeki ücretsiz kullanım hakkı bitti. İkinci kullanım için premium kart hakkı gerekir.'});
    store.data.cardUsage.push({id:crypto.randomUUID(),userId:id,week:targetWeek,half:weekHalf(targetWeek),card,source:availability.used===0?'free':'premium',usedAt:new Date().toISOString()});
    store.save();return json(res,200,{ok:true,effectiveWeek:targetWeek,pending:Number(targetWeek)!==Number(u.activeWeek),card,details:CARDS[card]});
  }

  if(method==='POST'&&p==='/api/predictions'){
    const u=store.ensureUser(id),fixtureId=String(body.fixtureId||''),home=Number(body.home),away=Number(body.away),f=store.data.fixtures.find(x=>x.id===fixtureId);
    if(!f)return json(res,404,{ok:false,error:'Maç bulunamadı.'});
    if(new Date().getTime()>=new Date(f.kickoff).getTime()||f.status==='CANLI'||f.status==='BİTTİ')return json(res,400,{ok:false,error:'Başlamış maç için tahmin değiştirilemez.'});
    if(!Number.isInteger(home)||!Number.isInteger(away)||home<0||away<0||home>15||away>15)return json(res,400,{ok:false,error:'Geçerli bir skor gir.'});
    store.data.predictions[id]||={};store.data.predictions[id][fixtureId]={home,away,savedAt:new Date().toISOString()};
    const nostradamus=syncNostradamus(u,f.week);store.save();return json(res,200,{ok:true,nostradamus});
  }

  if(method==='POST'&&p==='/api/leagues'){
    store.ensureUser(id);const name=String(body.name||'').trim().slice(0,48);if(!name)return json(res,400,{ok:false,error:'Lig adı gerekli.'});
    const code=crypto.randomBytes(4).toString('hex').toUpperCase(),format=body.format==='h2h'?'h2h':'classic';
    const league={id:crypto.randomUUID(),name,code,ownerId:id,members:[id],type:'private',format,isOpen:body.isOpen!==false,bannedIds:[],createdAt:new Date().toISOString()};
    store.data.leagues.push(league);store.save();return json(res,200,{ok:true,league:leagueView(league,store.ensureUser(id).activeWeek)});
  }
  if(method==='POST'&&p==='/api/leagues/join'){
    const u=store.ensureUser(id),code=String(body.code||'').trim().toUpperCase(),league=store.data.leagues.find(l=>l.code===code);
    if(!league)return json(res,404,{ok:false,error:'Lig kodu bulunamadı.'});
    if(league.isOpen===false)return json(res,403,{ok:false,error:'Bu lig yeni katılımlara kapalı.'});
    if((league.bannedIds||[]).includes(id))return json(res,403,{ok:false,error:'Bu lige tekrar katılamazsın.'});
    if(!league.members.includes(id))league.members.push(id);store.save();return json(res,200,{ok:true,league:leagueView(league,u.activeWeek)});
  }
  if(method==='POST'&&/^\/api\/leagues\/[^/]+\/leave$/.test(p)){
    store.ensureUser(id);const leagueId=decodeURIComponent(p.split('/')[3]),league=store.data.leagues.find(l=>l.id===leagueId);
    if(!league)return json(res,404,{ok:false,error:'Lig bulunamadı.'});
    if(league.ownerId===id&&league.members.length>1)return json(res,400,{ok:false,error:'Lig yöneticisi ayrılmadan önce yöneticiliği devretmeli veya ligi silmeli.'});
    league.members=league.members.filter(x=>x!==id);store.save();return json(res,200,{ok:true});
  }
  if(method==='POST'&&/^\/api\/leagues\/[^/]+\/settings$/.test(p)){
    const leagueId=decodeURIComponent(p.split('/')[3]),league=store.data.leagues.find(l=>l.id===leagueId);if(!league)return json(res,404,{ok:false,error:'Lig bulunamadı.'});if(league.ownerId!==id)return json(res,403,{ok:false,error:'Yalnızca lig yöneticisi ayarları değiştirebilir.'});
    if(body.isOpen!==undefined)league.isOpen=Boolean(body.isOpen);store.save();return json(res,200,{ok:true,league});
  }
  if(method==='POST'&&/^\/api\/leagues\/[^/]+\/kick$/.test(p)){
    const leagueId=decodeURIComponent(p.split('/')[3]),league=store.data.leagues.find(l=>l.id===leagueId),memberId=String(body.memberId||'');if(!league)return json(res,404,{ok:false,error:'Lig bulunamadı.'});if(league.ownerId!==id)return json(res,403,{ok:false,error:'Yalnızca lig yöneticisi oyuncu çıkarabilir.'});if(memberId===id)return json(res,400,{ok:false,error:'Kendini ligden çıkaramazsın.'});
    league.members=league.members.filter(x=>x!==memberId);league.bannedIds=[...new Set([...(league.bannedIds||[]),memberId])];store.save();return json(res,200,{ok:true});
  }

  if(method==='POST'&&p.startsWith('/api/admin/fixtures/')){
    if(!adminAllowed(req))return json(res,403,{ok:false,error:'Yetkisiz.'});const fixtureId=decodeURIComponent(p.split('/').pop()),f=store.data.fixtures.find(x=>x.id===fixtureId);if(!f)return json(res,404,{ok:false,error:'Maç bulunamadı.'});
    for(const k of ['status','homeScore','awayScore','minute','kickoff'])if(body[k]!==undefined)f[k]=body[k];
    for(const u of store.data.users)syncNostradamus(u,f.week);store.save();return json(res,200,{ok:true,fixture:f});
  }
  if(method==='POST'&&p.startsWith('/api/admin/players/')&&p.endsWith('/stats')){
    if(!adminAllowed(req))return json(res,403,{ok:false,error:'Yetkisiz.'});const parts=p.split('/'),playerId=parts[4],pl=playerById(playerId);if(!pl)return json(res,404,{ok:false,error:'Oyuncu bulunamadı.'});
    const stats={minutes:Number(body.minutes||0),goals:Number(body.goals||0),assists:Number(body.assists||0),cleanSheet:Boolean(body.cleanSheet),goalsConceded:Number(body.goalsConceded||0),saves:Number(body.saves||0),penaltySaves:Number(body.penaltySaves||0),penaltyMisses:Number(body.penaltyMisses||0),yellow:Number(body.yellow||0),red:Number(body.red||0),ownGoals:Number(body.ownGoals||0),bonus:Number(body.bonus||0)};
    pl.gameweekStats=stats;pl.gameweekMinutes=stats.minutes;pl.gameweekPoints=scorePlayer(stats,pl.position);store.save();return json(res,200,{ok:true,player:pl});
  }
  if(method==='POST'&&p.startsWith('/api/admin/players/')&&p.endsWith('/points')){
    if(!adminAllowed(req))return json(res,403,{ok:false,error:'Yetkisiz.'});const parts=p.split('/'),playerId=parts[4],pl=playerById(playerId);if(!pl)return json(res,404,{ok:false,error:'Oyuncu bulunamadı.'});pl.gameweekPoints=Number(body.points||0);if(body.minutes!==undefined)pl.gameweekMinutes=Number(body.minutes||0);store.save();return json(res,200,{ok:true,player:pl});
  }
  if(method==='POST'&&p==='/api/admin/cards/grant'){
    if(!adminAllowed(req))return json(res,403,{ok:false,error:'Yetkisiz.'});const target=store.ensureUser(String(body.userId||'')),card=String(body.card||''),half=Number(body.half||weekHalf(target.activeWeek));if(!CARDS[card]||![1,2].includes(half))return json(res,400,{ok:false,error:'Kart veya devre geçersiz.'});target.purchasedCards||={};const key=`${card}:h${half}`;target.purchasedCards[key]=Number(target.purchasedCards[key]||0)+1;store.save();return json(res,200,{ok:true,availability:cardAvailability(target,target.activeWeek)});
  }
  if(method==='POST'&&p==='/api/admin/recalculate'){
    if(!adminAllowed(req))return json(res,403,{ok:false,error:'Yetkisiz.'});const week=Number(body.week||6),map=Object.fromEntries(store.data.players.map(pl=>[pl.id,pl]));
    const results=[];
    for(const u of store.data.users){
      const entries=store.data.squads[u.id]||[];if(!entries.length)continue;
      const score=calculateTeamPoints({squadEntries:entries,playersById:map,activeCard:activeCard(u.id,week)}),nostradamus=calculateNostradamusPoints(store.data.predictions[u.id]||{},store.data.fixtures,week),ledger=ensureLedger(u.id,week);
      const saveBonus=Number(ledger.saveBonus||0),desired=score.total+nostradamus.total+saveBonus,previous=Number(ledger.totalApplied||0),delta=desired-previous;
      u.points=Number(u.points||0)+delta;if(Number(u.activeWeek)===week)u.gameweekPoints=desired;
      const activeIds=new Set(score.breakdown.map(x=>x.playerId));const goals=[...activeIds].reduce((sum,pid)=>sum+Number(map[pid]?.gameweekStats?.goals||0),0),goalDelta=goals-Number(ledger.goals||0);u.fantasyGoals=Number(u.fantasyGoals||0)+goalDelta;
      Object.assign(ledger,{teamPoints:score.total,nostradamusPoints:nostradamus.total,saveBonus,totalApplied:desired,goals,substitutions:score.substitutions,captainPlayerId:score.captainPlayerId,updatedAt:new Date().toISOString()});
      results.push({userId:u.id,total:desired,team:score.total,nostradamus:nostradamus.total,saveBonus,delta,substitutions:score.substitutions});
    }
    const lb=leaderboard();lb.forEach(row=>{const u=store.data.users.find(x=>x.id===row.id);if(u){u.previousRank=u.overallRank;u.overallRank=row.rank;}});store.save();return json(res,200,{ok:true,week,results,leaderboard:lb});
  }
  return json(res,404,{ok:false,error:'API yolu bulunamadı.'});
}

function serveFile(req,res,url){
  let pathname=decodeURIComponent(url.pathname);if(pathname==='/'||!path.extname(pathname))pathname='/index.html';
  const file=path.normalize(path.join(PUBLIC,pathname));if(!file.startsWith(PUBLIC))return json(res,403,{error:'Yasak.'});
  fs.readFile(file,(err,data)=>{
    if(err){if(pathname!=='/index.html')return fs.readFile(path.join(PUBLIC,'index.html'),(e,d)=>{if(e)return json(res,404,{error:'Bulunamadı.'});res.writeHead(200,headers(TYPES['.html']));res.end(d)});return json(res,404,{error:'Bulunamadı.'});}
    const ext=path.extname(file);res.writeHead(200,{...headers(TYPES[ext]||'application/octet-stream'),'Cache-Control':ext==='.html'?'no-cache':'public, max-age=3600'});res.end(data);
  });
}

const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
  try{if(url.pathname.startsWith('/api/'))await handleApi(req,res,url);else serveFile(req,res,url);}
  catch(err){console.error(err);if(!res.headersSent)json(res,500,{ok:false,error:err.message||'Sunucu hatası.'});else res.end();}
});
server.listen(PORT,'0.0.0.0',()=>console.log(`SahaNova Fantezi ${PORT} portunda çalışıyor. Veri: ${DATA_PATH}`));
