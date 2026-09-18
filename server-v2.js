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
  for (const key of ['pendingSquads','gameweekLedger','lineupSaves','leagueBans','notifications','predictions','playerMatchStats']) {
    if (!store.data[key] || typeof store.data[key] !== 'object') store.data[key] = {};
  }
  for (const key of ['cardUsage','transfers','supportTickets']) {
    if (!Array.isArray(store.data[key])) store.data[key] = [];
  }
  if (!Array.isArray(store.data.leagues)) store.data.leagues = [];
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
function nextFixturesForClub(club, week){ return store.data.fixtures.filter(f=>Number(f.week)===Number(week)&&(f.home===club||f.away===club)); }
function usersById(){ return Object.fromEntries(store.data.users.map(u=>[String(u.id),u])); }
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
  if(!store.data.gameweekLedger[key]) store.data.gameweekLedger[key]={userId,week:Number(week),teamPoints:0,nostradamusPoints:0,totalApplied:0,goals:0,updatedAt:null,status:'Bekliyor'};
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
  store.data.lineupSaves[`${userId}:${targetWeek}`]=new Date().toISOString();
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
  return Object.fromEntries(Object.keys(CARDS).map(card=>{
    const halfUsed=store.data.cardUsage.filter(x=>x.userId===user.id&&x.card===card&&weekHalf(x.week)===half).length;
    const seasonUsed=store.data.cardUsage.filter(x=>x.userId===user.id&&x.card===card).length;
    return [card,{used:halfUsed,seasonUsed,maxPerHalf:2,maxPerSeason:4,freeRemaining:Math.max(0,2-halfUsed),available:halfUsed<2}];
  }));
}
function leaderboard(){
  const map=usersById();
  return classicTable(store.data.users.map(u=>u.id),map).map(row=>({
    rank:row.rank,id:row.id,teamName:row.teamName,displayName:row.displayName,points:row.points,
    gameweekPoints:Number(map[row.id]?.gameweekPoints||0),goals:row.goals
  }));
}
function safeKey(value){ return String(value||'').toLocaleLowerCase('tr-TR').replace(/[^a-z0-9çğıöşü]+/gi,'-').replace(/^-|-$/g,'').slice(0,60)||'genel'; }
function ensureStandardLeagues(user){
  const defs=[
    {id:'genel',name:'Genel Lig',type:'global',value:null},
    {id:`ulke:${safeKey(user.country||'Türkiye')}`,name:`${user.country||'Türkiye'} Ligi`,type:'country',value:user.country||'Türkiye'},
  ];
  if(user.favoriteClub) defs.push({id:`favori:${safeKey(user.favoriteClub)}`,name:`${user.favoriteClub} Ligi`,type:'favoriteClub',value:user.favoriteClub});
  for(const league of store.data.leagues){
    if(!['country','favoriteClub'].includes(league.type))continue;
    const stillMatches=(league.type==='country'&&league.profileValue===(user.country||'Türkiye'))||(league.type==='favoriteClub'&&league.profileValue===user.favoriteClub);
    if(!stillMatches)league.members=league.members.filter(x=>x!==user.id);
  }
  for(const def of defs){
    let league=store.data.leagues.find(l=>l.id===def.id);
    if(!league){league={id:def.id,name:def.name,code:def.type==='global'?'GENEL':'AUTO',ownerId:'system',members:[],type:def.type,format:'classic',isOpen:false,profileValue:def.value,createdAt:new Date().toISOString()};store.data.leagues.push(league);}
    if(!league.members.includes(user.id))league.members.push(user.id);
  }
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
function weekStatus(week){
  const fixtures=store.data.fixtures.filter(f=>Number(f.week)===Number(week));
  if(fixtures.length&&fixtures.every(f=>f.status==='BİTTİ'))return 'Eklendi';
  if(fixtures.some(f=>f.status==='CANLI'||f.status==='BİTTİ'))return 'Canlı';
  return locked(week)?'İşleniyor':'Bekliyor';
}
function historyFor(userId){
  return Object.values(store.data.gameweekLedger)
    .filter(x=>x.userId===userId)
    .sort((a,b)=>Number(b.week)-Number(a.week))
    .map(x=>({...x,status:weekStatus(x.week),transferCount:store.data.transfers.filter(t=>t.userId===userId&&Number(t.week)===Number(x.week)).length}));
}
function notifyOnce(userId,key,type,title,message){
  const list=store.data.notifications[userId]||(store.data.notifications[userId]=[]);
  if(list.some(n=>n.key===key))return;
  list.unshift({id:crypto.randomUUID(),key,type,title,message,read:false,createdAt:new Date().toISOString()});
  if(list.length>50)list.length=50;
}
function updateSystemNotifications(user){
  const prefs={deadline:true,points:true,system:true,...(user.notificationPrefs||{})};
  const deadline=deadlineFor(user.activeWeek);
  if(prefs.deadline&&deadline){
    const diff=deadline.getTime()-Date.now();
    if(diff>0&&diff<=24*60*60*1000)notifyOnce(user.id,`deadline:${user.activeWeek}`,'deadline','Maç haftası süresi yaklaşıyor',`${user.activeWeek}. hafta kadronu ve Nostradamus tahminlerini süre bitmeden kaydet.`);
  }
}
function purgeExpiredAccount(id){
  const user=store.data.users.find(u=>u.id===id);
  if(!user?.deletionScheduledAt||Date.now()<new Date(user.deletionScheduledAt).getTime())return false;
  store.data.users=store.data.users.filter(u=>u.id!==id);
  delete store.data.squads[id];delete store.data.pendingSquads[id];delete store.data.predictions[id];delete store.data.notifications[id];
  store.data.transfers=store.data.transfers.filter(t=>t.userId!==id);store.data.cardUsage=store.data.cardUsage.filter(c=>c.userId!==id);
  for(const l of store.data.leagues)l.members=l.members.filter(x=>x!==id);
  store.save();return true;
}
function statePayload(id){
  purgeExpiredAccount(id);
  const user=store.ensureUser(id);ensureCollections();ensureStandardLeagues(user);updateSystemNotifications(user);
  if(!user.country)user.country='Türkiye';
  const entries=store.data.squads[id]||[];const week=user.activeWeek||6;
  const squad=entries.map(e=>({...e,player:playerById(e.playerId)})).filter(e=>e.player);
  const players=store.data.players.map(p=>({...p,nextFixture:nextFixturesForClub(p.club,week)[0]||null,weekFixtures:nextFixturesForClub(p.club,week)}));
  const leagues=store.data.leagues.filter(l=>l.members.includes(id)||l.type==='global').map(l=>leagueView(l,week));
  const deadline=deadlineFor(week);const pending=store.data.pendingSquads[id]||null;
  const nostradamus=calculateNostradamusPoints(store.data.predictions[id]||{},store.data.fixtures,week);
  store.save();
  return {
    user:{...user},footballData:store.data.footballData||null,players,squad,pendingSquad:pending,
    fixtures:store.data.fixtures,predictions:store.data.predictions[id]||{},leagues,leaderboard:leaderboard(),cups:cupViews(user),
    rewards:store.data.rewards,formations:FORMATIONS,activeCard:activeCard(id,week),cardAvailability:cardAvailability(user,week),
    deadline:deadline?deadline.toISOString():null,locked:locked(week),changesEffectiveWeek:targetWeekForChanges(user),
    transferPolicy:{limit:'unlimited',pointCost:0,maxPerClub:3,budget:Number(user.budget||100)},nostradamus,
    scoringStatus:weekStatus(week),history:historyFor(id),notifications:store.data.notifications[id]||[],
    freeOnly:true,commercialFeatures:false
  };
}
function adminAllowed(req){ return !process.env.ADMIN_KEY||req.headers['x-admin-key']===process.env.ADMIN_KEY; }
function recomputePlayerWeek(playerId,week){
  const pl=playerById(playerId);if(!pl)return;
  const rows=Object.values(store.data.playerMatchStats).filter(x=>x.playerId===String(playerId)&&Number(x.week)===Number(week));
  pl.gameweekPoints=rows.reduce((s,x)=>s+Number(x.points||0),0);
  pl.gameweekMinutes=rows.reduce((s,x)=>s+Number(x.stats?.minutes||0),0);
  pl.gameweekStats={matches:rows.length,goals:rows.reduce((s,x)=>s+Number(x.stats?.goals||0),0),assists:rows.reduce((s,x)=>s+Number(x.stats?.assists||0),0)};
}

async function handleApi(req,res,url){
  const method=req.method||'GET',p=url.pathname,id=uid(req,url);
  if(method==='GET'&&p==='/api/health')return json(res,200,{ok:true,service:'sahanova-fantezi',version:'2.0.0-free',dataVersion:store.data.version||null,time:new Date().toISOString()});
  if(method==='GET'&&p==='/api/state')return json(res,200,statePayload(id));
  const body=await readBody(req);

  if(method==='POST'&&p==='/api/profile'){
    const u=store.ensureUser(id),displayName=String(body.displayName||'').trim().slice(0,32),teamName=String(body.teamName||'').trim().slice(0,40);
    if(displayName)u.displayName=displayName;if(teamName)u.teamName=teamName;
    if(body.country!==undefined)u.country=String(body.country||'Türkiye').trim().slice(0,48)||'Türkiye';
    if(body.favoriteClub!==undefined){const club=String(body.favoriteClub||'').trim();u.favoriteClub=store.data.players.some(x=>x.club===club)?club:null;}
    ensureStandardLeagues(u);store.save();return json(res,200,{ok:true,user:u});
  }
  if(method==='POST'&&p==='/api/notifications/preferences'){
    const u=store.ensureUser(id);u.notificationPrefs={deadline:body.deadline!==false,points:body.points!==false,system:body.system!==false};store.save();return json(res,200,{ok:true,preferences:u.notificationPrefs});
  }
  if(method==='POST'&&p==='/api/notifications/read'){
    const ids=new Set((body.ids||[]).map(String));for(const n of store.data.notifications[id]||[])if(!ids.size||ids.has(n.id))n.read=true;store.save();return json(res,200,{ok:true});
  }
  if(method==='POST'&&p==='/api/account/delete-request'){
    const u=store.ensureUser(id);u.deletionRequestedAt=new Date().toISOString();u.deletionScheduledAt=new Date(Date.now()+30*24*60*60*1000).toISOString();store.save();return json(res,200,{ok:true,deletionScheduledAt:u.deletionScheduledAt});
  }
  if(method==='POST'&&p==='/api/account/delete-cancel'){
    const u=store.ensureUser(id);delete u.deletionRequestedAt;delete u.deletionScheduledAt;store.save();return json(res,200,{ok:true});
  }
  if(method==='POST'&&p==='/api/support'){
    const u=store.ensureUser(id),description=String(body.description||'').trim().slice(0,3000);if(!description)return json(res,400,{ok:false,error:'Sorun açıklaması gerekli.'});
    const ticket={id:crypto.randomUUID(),userId:id,email:String(body.email||'').trim().slice(0,160),week:Number(body.week||u.activeWeek),category:String(body.category||'teknik').slice(0,40),description,createdAt:new Date().toISOString(),status:'Açık'};
    store.data.supportTickets.push(ticket);store.save();return json(res,200,{ok:true,ticket});
  }

  if(method==='POST'&&p==='/api/squad'){
    const u=store.ensureUser(id),targetWeek=targetWeekForChanges(u),ids=Array.isArray(body.playerIds)?body.playerIds.map(String):[],players=findPlayers(ids),budget=budgetFor(u,targetWeek),v=validateSquad(players,budget,3);
    if(!v.valid)return json(res,400,{ok:false,errors:v.errors});
    const formation=FORMATIONS[body.formation]?body.formation:'4-4-2',remaining={...FORMATIONS[formation]};
    const entries=players.map((pl,i)=>{const start=remaining[pl.position]>0;if(start)remaining[pl.position]--;return{playerId:pl.id,isStarting:start,benchOrder:start?null:i,isCaptain:false,isVice:false}});
    const starters=entries.filter(e=>e.isStarting);if(starters[0])starters[0].isCaptain=true;if(starters[1])starters[1].isVice=true;
    const bank=Math.round((budget===9999?Number(u.budget||100):budget-v.total)*10)/10;
    persistEditedSquad(id,u,targetWeek,{entries,formation,bank});store.save();return json(res,200,{ok:true,bank,formation,squad:entries,effectiveWeek:targetWeek,pending:Number(targetWeek)!==Number(u.activeWeek)});
  }
  if(method==='POST'&&p==='/api/lineup'){
    const u=store.ensureUser(id),targetWeek=targetWeekForChanges(u),edit=editSquad(id,u,targetWeek),current=edit.entries;
    const starterIds=Array.isArray(body.starterIds)?body.starterIds.map(String):[],starters=findPlayers(starterIds),card=activeCard(id,targetWeek),formation=String(body.formation||edit.formation||u.formation),v=validateLineup(starters,formation,{attackMode:card==='attack'});
    if(!v.valid)return json(res,400,{ok:false,errors:v.errors});
    const captainId=String(body.captainId||''),viceId=String(body.viceId||'');
    if(!starterIds.includes(captainId)||!starterIds.includes(viceId)||captainId===viceId)return json(res,400,{ok:false,errors:['Kaptan ve kaptan yardımcısı ilk 11’de farklı oyuncular olmalı.']});
    const benchOrder=Array.isArray(body.benchOrder)?body.benchOrder.map(String):[];
    current.forEach((e,i)=>{e.isStarting=starterIds.includes(e.playerId);e.isCaptain=e.playerId===captainId;e.isVice=e.playerId===viceId;e.benchOrder=e.isStarting?null:(benchOrder.indexOf(e.playerId)>=0?benchOrder.indexOf(e.playerId):i)});
    persistEditedSquad(id,u,targetWeek,{entries:current,formation:v.formation||formation,bank:edit.bank});store.save();return json(res,200,{ok:true,effectiveWeek:targetWeek,pending:Number(targetWeek)!==Number(u.activeWeek),formation:v.formation||formation});
  }
  if(method==='POST'&&p==='/api/transfers'){
    const u=store.ensureUser(id),targetWeek=targetWeekForChanges(u),edit=editSquad(id,u,targetWeek),entries=edit.entries;
    const outId=String(body.outId||''),inId=String(body.inId||''),outEntry=entries.find(e=>e.playerId===outId),outP=playerById(outId),inP=playerById(inId);
    if(!outEntry||!outP||!inP)return json(res,400,{ok:false,error:'Transfer oyuncuları bulunamadı.'});
    if(outP.position!==inP.position)return json(res,400,{ok:false,error:'Transfer edilen oyuncular aynı pozisyonda olmalı.'});
    if(entries.some(e=>e.playerId===inId))return json(res,400,{ok:false,error:'Bu oyuncu zaten kadroda.'});
    const candidate=findPlayers(entries.map(e=>e.playerId===outId?inId:e.playerId)),budget=budgetFor(u,targetWeek),v=validateSquad(candidate,budget,3);if(!v.valid)return json(res,400,{ok:false,error:v.errors[0]});
    outEntry.playerId=inId;const bank=Math.round((budget===9999?Number(u.budget||100):budget-v.total)*10)/10;
    persistEditedSquad(id,u,targetWeek,{entries,formation:edit.formation,bank});store.data.transfers.push({id:crypto.randomUUID(),userId:id,week:targetWeek,outId,inId,cost:0,pending:Number(targetWeek)!==Number(u.activeWeek),createdAt:new Date().toISOString()});store.save();return json(res,200,{ok:true,cost:0,bank,effectiveWeek:targetWeek,pending:Number(targetWeek)!==Number(u.activeWeek)});
  }
  if(method==='POST'&&p==='/api/cards/use'){
    const u=store.ensureUser(id),targetWeek=targetWeekForChanges(u),card=String(body.card||'');
    if(!CARDS[card])return json(res,400,{ok:false,error:'Geçersiz menajer kartı.'});
    if(activeCard(id,targetWeek))return json(res,400,{ok:false,error:'Bu maç haftasında zaten bir menajer kartı kullandın.'});
    const availability=cardAvailability(u,targetWeek)[card];if(!availability.available)return json(res,400,{ok:false,error:'Bu kartın bu devredeki iki ücretsiz kullanım hakkı da kullanıldı.'});
    store.data.cardUsage.push({id:crypto.randomUUID(),userId:id,week:targetWeek,half:weekHalf(targetWeek),card,source:'free',usedAt:new Date().toISOString()});store.save();return json(res,200,{ok:true,effectiveWeek:targetWeek,pending:Number(targetWeek)!==Number(u.activeWeek),card,details:CARDS[card],free:true});
  }
  if(method==='POST'&&p==='/api/predictions'){
    const u=store.ensureUser(id),fixtureId=String(body.fixtureId||''),home=Number(body.home),away=Number(body.away),f=store.data.fixtures.find(x=>x.id===fixtureId);
    if(!f)return json(res,404,{ok:false,error:'Maç bulunamadı.'});
    if(locked(f.week))return json(res,400,{ok:false,error:'Bu maç haftasının Nostradamus süresi sona erdi.'});
    if(!Number.isInteger(home)||!Number.isInteger(away)||home<0||away<0||home>15||away>15)return json(res,400,{ok:false,error:'Geçerli bir skor gir.'});
    store.data.predictions[id]||={};store.data.predictions[id][fixtureId]={home,away,savedAt:new Date().toISOString()};const nostradamus=syncNostradamus(u,f.week);store.save();return json(res,200,{ok:true,nostradamus});
  }

  if(method==='POST'&&p==='/api/leagues'){
    store.ensureUser(id);const name=String(body.name||'').trim().slice(0,48);if(!name)return json(res,400,{ok:false,error:'Lig adı gerekli.'});
    const code=crypto.randomBytes(4).toString('hex').toUpperCase(),format=body.format==='h2h'?'h2h':'classic';const league={id:crypto.randomUUID(),name,code,ownerId:id,members:[id],type:'private',format,isOpen:body.isOpen!==false,bannedIds:[],createdAt:new Date().toISOString()};store.data.leagues.push(league);store.save();return json(res,200,{ok:true,league:leagueView(league,store.ensureUser(id).activeWeek)});
  }
  if(method==='POST'&&p==='/api/leagues/join'){
    const u=store.ensureUser(id),code=String(body.code||'').trim().toUpperCase(),league=store.data.leagues.find(l=>l.code===code);if(!league)return json(res,404,{ok:false,error:'Lig kodu bulunamadı.'});if(league.isOpen===false)return json(res,403,{ok:false,error:'Bu lig yeni katılımlara kapalı.'});if((league.bannedIds||[]).includes(id))return json(res,403,{ok:false,error:'Bu lige tekrar katılamazsın.'});if(!league.members.includes(id))league.members.push(id);store.save();return json(res,200,{ok:true,league:leagueView(league,u.activeWeek)});
  }
  if(method==='POST'&&/^\/api\/leagues\/[^/]+\/leave$/.test(p)){
    const leagueId=decodeURIComponent(p.split('/')[3]),league=store.data.leagues.find(l=>l.id===leagueId);if(!league)return json(res,404,{ok:false,error:'Lig bulunamadı.'});if(league.ownerId===id&&league.members.length>1)return json(res,400,{ok:false,error:'Lig yöneticisi ayrılmadan önce yöneticiliği devretmeli veya ligi silmeli.'});league.members=league.members.filter(x=>x!==id);store.save();return json(res,200,{ok:true});
  }
  if(method==='POST'&&/^\/api\/leagues\/[^/]+\/settings$/.test(p)){
    const leagueId=decodeURIComponent(p.split('/')[3]),league=store.data.leagues.find(l=>l.id===leagueId);if(!league)return json(res,404,{ok:false,error:'Lig bulunamadı.'});if(league.ownerId!==id)return json(res,403,{ok:false,error:'Yalnızca lig yöneticisi ayarları değiştirebilir.'});if(body.isOpen!==undefined)league.isOpen=Boolean(body.isOpen);store.save();return json(res,200,{ok:true,league});
  }
  if(method==='POST'&&/^\/api\/leagues\/[^/]+\/kick$/.test(p)){
    const leagueId=decodeURIComponent(p.split('/')[3]),league=store.data.leagues.find(l=>l.id===leagueId),memberId=String(body.memberId||'');if(!league)return json(res,404,{ok:false,error:'Lig bulunamadı.'});if(league.ownerId!==id)return json(res,403,{ok:false,error:'Yalnızca lig yöneticisi oyuncu çıkarabilir.'});if(memberId===id)return json(res,400,{ok:false,error:'Kendini ligden çıkaramazsın.'});league.members=league.members.filter(x=>x!==memberId);league.bannedIds=[...new Set([...(league.bannedIds||[]),memberId])];store.save();return json(res,200,{ok:true});
  }
  if(method==='POST'&&/^\/api\/leagues\/[^/]+\/owner$/.test(p)){
    const leagueId=decodeURIComponent(p.split('/')[3]),league=store.data.leagues.find(l=>l.id===leagueId),memberId=String(body.memberId||'');if(!league)return json(res,404,{ok:false,error:'Lig bulunamadı.'});if(league.ownerId!==id)return json(res,403,{ok:false,error:'Yalnızca lig yöneticisi yetki devredebilir.'});if(!league.members.includes(memberId))return json(res,400,{ok:false,error:'Yeni yönetici lig üyesi olmalı.'});league.ownerId=memberId;store.save();return json(res,200,{ok:true,league});
  }
  if(method==='POST'&&/^\/api\/leagues\/[^/]+\/delete$/.test(p)){
    const leagueId=decodeURIComponent(p.split('/')[3]),idx=store.data.leagues.findIndex(l=>l.id===leagueId);if(idx<0)return json(res,404,{ok:false,error:'Lig bulunamadı.'});if(store.data.leagues[idx].ownerId!==id)return json(res,403,{ok:false,error:'Yalnızca lig yöneticisi ligi silebilir.'});if(store.data.leagues[idx].type!=='private')return json(res,400,{ok:false,error:'Sistem ligleri silinemez.'});store.data.leagues.splice(idx,1);store.save();return json(res,200,{ok:true});
  }

  if(method==='POST'&&p.startsWith('/api/admin/fixtures/')){
    if(!adminAllowed(req))return json(res,403,{ok:false,error:'Yetkisiz.'});const fixtureId=decodeURIComponent(p.split('/').pop()),f=store.data.fixtures.find(x=>x.id===fixtureId);if(!f)return json(res,404,{ok:false,error:'Maç bulunamadı.'});for(const k of ['status','homeScore','awayScore','minute','kickoff'])if(body[k]!==undefined)f[k]=body[k];for(const u of store.data.users)syncNostradamus(u,f.week);store.save();return json(res,200,{ok:true,fixture:f});
  }
  if(method==='POST'&&p.startsWith('/api/admin/players/')&&p.endsWith('/stats')){
    if(!adminAllowed(req))return json(res,403,{ok:false,error:'Yetkisiz.'});const parts=p.split('/'),playerId=parts[4],pl=playerById(playerId);if(!pl)return json(res,404,{ok:false,error:'Oyuncu bulunamadı.'});
    const fixtureId=String(body.fixtureId||`week-${Number(body.week||store.ensureUser(id).activeWeek)}-manual`),fixture=store.data.fixtures.find(f=>f.id===fixtureId),week=Number(body.week||fixture?.week||6);
    const stats={minutes:Number(body.minutes||0),goals:Number(body.goals||0),assists:Number(body.assists||0),cleanSheet:Boolean(body.cleanSheet),goalsConceded:Number(body.goalsConceded||0),saves:Number(body.saves||0),penaltySaves:Number(body.penaltySaves||0),penaltyMisses:Number(body.penaltyMisses||0),yellow:Number(body.yellow||0),red:Number(body.red||0),ownGoals:Number(body.ownGoals||0),bonus:Number(body.bonus||0)};
    const points=scorePlayer(stats,pl.position);store.data.playerMatchStats[`${playerId}:${fixtureId}`]={playerId:String(playerId),fixtureId,week,stats,points,updatedAt:new Date().toISOString()};recomputePlayerWeek(playerId,week);store.save();return json(res,200,{ok:true,player:pl,matchPoints:points});
  }
  if(method==='POST'&&p.startsWith('/api/admin/players/')&&p.endsWith('/status')){
    if(!adminAllowed(req))return json(res,403,{ok:false,error:'Yetkisiz.'});const playerId=p.split('/')[4],pl=playerById(playerId);if(!pl)return json(res,404,{ok:false,error:'Oyuncu bulunamadı.'});pl.status=String(body.status||'Hazır').slice(0,40);pl.statusNote=String(body.note||'').slice(0,240);pl.statusUpdatedAt=new Date().toISOString();store.save();return json(res,200,{ok:true,player:pl});
  }
  if(method==='POST'&&p.startsWith('/api/admin/players/')&&p.endsWith('/points')){
    if(!adminAllowed(req))return json(res,403,{ok:false,error:'Yetkisiz.'});const playerId=p.split('/')[4],pl=playerById(playerId);if(!pl)return json(res,404,{ok:false,error:'Oyuncu bulunamadı.'});pl.gameweekPoints=Number(body.points||0);if(body.minutes!==undefined)pl.gameweekMinutes=Number(body.minutes||0);store.save();return json(res,200,{ok:true,player:pl});
  }
  if(method==='POST'&&p==='/api/admin/recalculate'){
    if(!adminAllowed(req))return json(res,403,{ok:false,error:'Yetkisiz.'});const week=Number(body.week||6),map=Object.fromEntries(store.data.players.map(pl=>[pl.id,pl])),results=[];
    for(const u of store.data.users){const entries=store.data.squads[u.id]||[];if(!entries.length)continue;const score=calculateTeamPoints({squadEntries:entries,playersById:map,activeCard:activeCard(u.id,week)}),nostradamus=calculateNostradamusPoints(store.data.predictions[u.id]||{},store.data.fixtures,week),ledger=ensureLedger(u.id,week),desired=score.total+nostradamus.total,previous=Number(ledger.totalApplied||0),delta=desired-previous;u.points=Number(u.points||0)+delta;if(Number(u.activeWeek)===week)u.gameweekPoints=desired;const activeIds=new Set(score.breakdown.map(x=>x.playerId)),goals=[...activeIds].reduce((sum,pid)=>sum+Number(map[pid]?.gameweekStats?.goals||0),0),goalDelta=goals-Number(ledger.goals||0);u.fantasyGoals=Number(u.fantasyGoals||0)+goalDelta;Object.assign(ledger,{teamPoints:score.total,nostradamusPoints:nostradamus.total,totalApplied:desired,goals,substitutions:score.substitutions,captainPlayerId:score.captainPlayerId,updatedAt:new Date().toISOString(),status:weekStatus(week)});results.push({userId:u.id,total:desired,team:score.total,nostradamus:nostradamus.total,delta,substitutions:score.substitutions});if(delta&&u.notificationPrefs?.points!==false)notifyOnce(u.id,`points:${week}:${desired}`,'points','Puanların güncellendi',`${week}. hafta toplamın ${desired} puan oldu.`);}
    const lb=leaderboard();lb.forEach(row=>{const u=store.data.users.find(x=>x.id===row.id);if(u){u.previousRank=u.overallRank;u.overallRank=row.rank;}});store.save();return json(res,200,{ok:true,week,results,leaderboard:lb});
  }
  if(method==='POST'&&p==='/api/admin/week/advance'){
    if(!adminAllowed(req))return json(res,403,{ok:false,error:'Yetkisiz.'});const toWeek=Number(body.week||7);for(const u of store.data.users){const pending=store.data.pendingSquads[u.id];if(pending&&Number(pending.week)<=toWeek){store.data.squads[u.id]=pending.entries;u.formation=pending.formation||u.formation;u.bank=pending.bank;delete store.data.pendingSquads[u.id];}u.activeWeek=toWeek;u.gameweekPoints=0;}store.save();return json(res,200,{ok:true,week:toWeek});
  }
  return json(res,404,{ok:false,error:'API yolu bulunamadı.'});
}

function serveFile(req,res,url){
  let pathname=decodeURIComponent(url.pathname);if(pathname==='/'||!path.extname(pathname))pathname='/index.html';const file=path.normalize(path.join(PUBLIC,pathname));if(!file.startsWith(PUBLIC))return json(res,403,{error:'Yasak.'});
  fs.readFile(file,(err,data)=>{if(err){if(pathname!=='/index.html')return fs.readFile(path.join(PUBLIC,'index.html'),(e,d)=>{if(e)return json(res,404,{error:'Bulunamadı.'});res.writeHead(200,headers(TYPES['.html']));res.end(d)});return json(res,404,{error:'Bulunamadı.'});}const ext=path.extname(file);res.writeHead(200,{...headers(TYPES[ext]||'application/octet-stream'),'Cache-Control':ext==='.html'?'no-cache':'public, max-age=3600'});res.end(data);});
}

const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
  try{if(url.pathname.startsWith('/api/'))await handleApi(req,res,url);else serveFile(req,res,url);}
  catch(err){console.error(err);if(!res.headersSent)json(res,500,{ok:false,error:err.message||'Sunucu hatası.'});else res.end();}
});
server.listen(PORT,'0.0.0.0',()=>console.log(`SahaNova Fantezi ücretsiz web sürümü ${PORT} portunda çalışıyor. Veri: ${DATA_PATH}`));
