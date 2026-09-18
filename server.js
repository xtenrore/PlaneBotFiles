const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');
const { Store } = require('./lib/store');
const { validateSquad, validateLineup, calculateTeamPoints, FORMATIONS } = require('./lib/game');

const PORT = Number(process.env.PORT || 3000);
const DATA_PATH = process.env.DATA_PATH || path.join(__dirname, 'data', 'db.json');
const PUBLIC = path.join(__dirname, 'public');
const store = new Store(DATA_PATH);

const TYPES = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon' };

function headers(type='application/json; charset=utf-8') {
  return {
    'Content-Type': type,
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'strict-origin-when-cross-origin',
    'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Opener-Policy':'same-origin'
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
function findPlayers(ids) { const set=new Set(ids.map(String)); return store.data.players.filter(p=>set.has(String(p.id))); }
function nextFixtureForClub(club, week){ return store.data.fixtures.find(f=>f.week===week&&(f.home===club||f.away===club))||null; }
function leaderboard(){ return [...store.data.users].sort((a,b)=>b.points-a.points).map((u,i)=>({rank:i+1,id:u.id,teamName:u.teamName,displayName:u.displayName,points:u.points,gameweekPoints:u.gameweekPoints})); }
function activeCard(userId, week){ return (store.data.cardUsage.find(c=>c.userId===userId&&c.week===week)||{}).card||null; }

function statePayload(id){
  const user=store.ensureUser(id); const entries=store.data.squads[id]||[]; const week=user.activeWeek||1;
  const squad=entries.map(e=>({...e,player:store.data.players.find(p=>p.id===e.playerId)})).filter(e=>e.player);
  const players=store.data.players.map(p=>({...p,nextFixture:nextFixtureForClub(p.club,week)}));
  const leagues=store.data.leagues.filter(l=>l.members.includes(id)||l.type==='global').map(l=>({...l,table:l.members.map(x=>store.data.users.find(u=>u.id===x)).filter(Boolean).sort((a,b)=>b.points-a.points).map((u,i)=>({rank:i+1,id:u.id,teamName:u.teamName,displayName:u.displayName,points:u.points}))}));
  return {user:{...user},players,squad,fixtures:store.data.fixtures,predictions:store.data.predictions[id]||{},leagues,leaderboard:leaderboard(),rewards:store.data.rewards,formations:FORMATIONS,activeCard:activeCard(id,week)};
}

async function handleApi(req,res,url){
  const method=req.method||'GET'; const p=url.pathname; const id=uid(req,url);
  if(method==='GET'&&p==='/api/health') return json(res,200,{ok:true,service:'sahanova-fantezi',version:'1.0.0',time:new Date().toISOString()});
  if(method==='GET'&&p==='/api/state') return json(res,200,statePayload(id));
  const body=await readBody(req);

  if(method==='POST'&&p==='/api/profile'){
    const u=store.ensureUser(id); const displayName=String(body.displayName||'').trim().slice(0,32); const teamName=String(body.teamName||'').trim().slice(0,40); if(displayName)u.displayName=displayName;if(teamName)u.teamName=teamName;store.save();return json(res,200,{ok:true,user:u});
  }
  if(method==='POST'&&p==='/api/squad'){
    const u=store.ensureUser(id); const ids=Array.isArray(body.playerIds)?body.playerIds.map(String):[]; const players=findPlayers(ids); const card=activeCard(id,u.activeWeek); const budget=card==='unlimitedBudget'?9999:u.budget; const v=validateSquad(players,budget,3); if(!v.valid)return json(res,400,{ok:false,errors:v.errors}); const formation=FORMATIONS[body.formation]?body.formation:'4-4-2';const remaining={...FORMATIONS[formation]};const entries=players.map((pl,i)=>{const start=remaining[pl.position]>0;if(start)remaining[pl.position]--;return{playerId:pl.id,isStarting:start,benchOrder:start?null:i,isCaptain:false,isVice:false}});const starters=entries.filter(e=>e.isStarting);if(starters[0])starters[0].isCaptain=true;if(starters[1])starters[1].isVice=true;store.data.squads[id]=entries;u.formation=formation;u.bank=Math.round((budget===9999?u.budget:u.budget-v.total)*10)/10;store.save();return json(res,200,{ok:true,bank:u.bank,formation,squad:entries});
  }
  if(method==='POST'&&p==='/api/lineup'){
    const u=store.ensureUser(id);const current=store.data.squads[id]||[];const starterIds=Array.isArray(body.starterIds)?body.starterIds.map(String):[];const starters=findPlayers(starterIds);const formation=String(body.formation||u.formation);const v=validateLineup(starters,formation);if(!v.valid)return json(res,400,{ok:false,errors:v.errors});const captainId=String(body.captainId||''),viceId=String(body.viceId||'');if(!starterIds.includes(captainId)||!starterIds.includes(viceId)||captainId===viceId)return json(res,400,{ok:false,errors:['Kaptan ve kaptan yardımcısı ilk 11’de farklı oyuncular olmalı.']});current.forEach((e,i)=>{e.isStarting=starterIds.includes(e.playerId);e.isCaptain=e.playerId===captainId;e.isVice=e.playerId===viceId;e.benchOrder=e.isStarting?null:i});u.formation=formation;store.save();return json(res,200,{ok:true});
  }
  if(method==='POST'&&p==='/api/transfers'){
    const u=store.ensureUser(id);const outId=String(body.outId||''),inId=String(body.inId||'');const entries=store.data.squads[id]||[];const outEntry=entries.find(e=>e.playerId===outId),outP=store.data.players.find(x=>x.id===outId),inP=store.data.players.find(x=>x.id===inId);if(!outEntry||!outP||!inP)return json(res,400,{ok:false,error:'Transfer oyuncuları bulunamadı.'});if(outP.position!==inP.position)return json(res,400,{ok:false,error:'Transfer edilen oyuncular aynı pozisyonda olmalı.'});if(entries.some(e=>e.playerId===inId))return json(res,400,{ok:false,error:'Bu oyuncu zaten kadroda.'});const candidate=findPlayers(entries.map(e=>e.playerId===outId?inId:e.playerId));const card=activeCard(id,u.activeWeek);const budget=card==='unlimitedBudget'?9999:u.budget;const v=validateSquad(candidate,budget,3);if(!v.valid)return json(res,400,{ok:false,error:v.errors[0]});outEntry.playerId=inId;const cost=u.freeTransfers>0?0:4;if(u.freeTransfers>0)u.freeTransfers--;u.points=Math.max(0,u.points-cost);u.bank=Math.round((budget===9999?u.budget:u.budget-v.total)*10)/10;store.data.transfers.push({id:crypto.randomUUID(),userId:id,week:u.activeWeek,outId,inId,cost,createdAt:new Date().toISOString()});store.save();return json(res,200,{ok:true,cost,bank:u.bank});
  }
  if(method==='POST'&&p==='/api/cards/use'){
    const u=store.ensureUser(id);const card=String(body.card||'');if(!u.cards?.[card])return json(res,400,{ok:false,error:'Bu kart kullanılamıyor veya daha önce kullanıldı.'});if(activeCard(id,u.activeWeek))return json(res,400,{ok:false,error:'Bu maç haftasında zaten bir kart kullandın.'});u.cards[card]--;store.data.cardUsage.push({id:crypto.randomUUID(),userId:id,week:u.activeWeek,card,usedAt:new Date().toISOString()});store.save();return json(res,200,{ok:true});
  }
  if(method==='POST'&&p==='/api/predictions'){
    const fixtureId=String(body.fixtureId||'');const home=Number(body.home),away=Number(body.away);const f=store.data.fixtures.find(x=>x.id===fixtureId);if(!f)return json(res,404,{ok:false,error:'Maç bulunamadı.'});if(f.status==='CANLI'||f.status==='BİTTİ')return json(res,400,{ok:false,error:'Başlamış maç için tahmin değiştirilemez.'});if(!Number.isInteger(home)||!Number.isInteger(away)||home<0||away<0||home>15||away>15)return json(res,400,{ok:false,error:'Geçerli bir skor gir.'});store.data.predictions[id]||={};store.data.predictions[id][fixtureId]={home,away,savedAt:new Date().toISOString()};store.save();return json(res,200,{ok:true});
  }
  if(method==='POST'&&p==='/api/leagues'){
    store.ensureUser(id);const name=String(body.name||'').trim().slice(0,48);if(!name)return json(res,400,{ok:false,error:'Lig adı gerekli.'});const code=crypto.randomBytes(3).toString('hex').toUpperCase();const league={id:crypto.randomUUID(),name,code,ownerId:id,members:[id],type:'private'};store.data.leagues.push(league);store.save();return json(res,200,{ok:true,league});
  }
  if(method==='POST'&&p==='/api/leagues/join'){
    store.ensureUser(id);const code=String(body.code||'').trim().toUpperCase();const league=store.data.leagues.find(l=>l.code===code);if(!league)return json(res,404,{ok:false,error:'Lig kodu bulunamadı.'});if(!league.members.includes(id))league.members.push(id);store.save();return json(res,200,{ok:true,league});
  }
  if(method==='POST'&&p.startsWith('/api/admin/fixtures/')){
    if(process.env.ADMIN_KEY&&req.headers['x-admin-key']!==process.env.ADMIN_KEY)return json(res,403,{ok:false,error:'Yetkisiz.'});const fixtureId=decodeURIComponent(p.split('/').pop());const f=store.data.fixtures.find(x=>x.id===fixtureId);if(!f)return json(res,404,{ok:false,error:'Maç bulunamadı.'});for(const k of ['status','homeScore','awayScore','minute'])if(body[k]!==undefined)f[k]=body[k];store.save();return json(res,200,{ok:true,fixture:f});
  }
  if(method==='POST'&&p.startsWith('/api/admin/players/')&&p.endsWith('/points')){
    if(process.env.ADMIN_KEY&&req.headers['x-admin-key']!==process.env.ADMIN_KEY)return json(res,403,{ok:false,error:'Yetkisiz.'});const parts=p.split('/');const playerId=parts[4];const pl=store.data.players.find(x=>x.id===playerId);if(!pl)return json(res,404,{ok:false,error:'Oyuncu bulunamadı.'});pl.gameweekPoints=Number(body.points||0);store.save();return json(res,200,{ok:true,player:pl});
  }
  if(method==='POST'&&p==='/api/admin/recalculate'){
    if(process.env.ADMIN_KEY&&req.headers['x-admin-key']!==process.env.ADMIN_KEY)return json(res,403,{ok:false,error:'Yetkisiz.'});const week=Number(body.week||1);const map=Object.fromEntries(store.data.players.map(pl=>[pl.id,pl]));for(const u of store.data.users){const entries=store.data.squads[u.id]||[];if(!entries.length)continue;const score=calculateTeamPoints({squadEntries:entries,playersById:map,activeCard:activeCard(u.id,week)});u.gameweekPoints=score.total;u.points+=score.total;}const lb=leaderboard();lb.forEach(row=>{const u=store.data.users.find(x=>x.id===row.id);u.previousRank=u.overallRank;u.overallRank=row.rank});store.save();return json(res,200,{ok:true,leaderboard:lb});
  }
  return json(res,404,{ok:false,error:'API yolu bulunamadı.'});
}

function serveFile(req,res,url){
  let pathname=decodeURIComponent(url.pathname);
  if(pathname==='/'||!path.extname(pathname))pathname='/index.html';
  const file=path.normalize(path.join(PUBLIC,pathname));
  if(!file.startsWith(PUBLIC))return json(res,403,{error:'Yasak.'});
  fs.readFile(file,(err,data)=>{
    if(err){ if(pathname!=='/index.html')return fs.readFile(path.join(PUBLIC,'index.html'),(e,d)=>{if(e)return json(res,404,{error:'Bulunamadı.'});res.writeHead(200,headers(TYPES['.html']));res.end(d)}); return json(res,404,{error:'Bulunamadı.'}); }
    const ext=path.extname(file);res.writeHead(200,{...headers(TYPES[ext]||'application/octet-stream'),'Cache-Control':ext==='.html'?'no-cache':'public, max-age=3600'});res.end(data);
  });
}

const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
  try{ if(url.pathname.startsWith('/api/'))await handleApi(req,res,url); else serveFile(req,res,url); }
  catch(err){ console.error(err); if(!res.headersSent)json(res,500,{ok:false,error:err.message||'Sunucu hatası.'}); else res.end(); }
});
server.listen(PORT,'0.0.0.0',()=>console.log(`SahaNova Fantezi ${PORT} portunda çalışıyor. Veri: ${DATA_PATH}`));
