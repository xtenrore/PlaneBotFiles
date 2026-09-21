'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const realCreateServer = http.createServer.bind(http);
const DATA_PATH = process.env.DATA_PATH || path.join(__dirname,'data','db.json');
const AUTH_PATH = process.env.AUTH_DATA_PATH || path.join(path.dirname(DATA_PATH),'auth.json');
const SESSION_DAYS = 30;
const loginBuckets = new Map();

const MATCHES_API_URL = String(process.env.MATCHES_API_URL || '').trim();
const MATCHES_API_HEADER_NAME = String(process.env.MATCHES_API_HEADER_NAME || '').trim();
const MATCHES_API_HEADER_VALUE = String(process.env.MATCHES_API_HEADER_VALUE || '').trim();
const MATCHES_API_REFRESH_MS = Math.max(10000, Number(process.env.MATCHES_API_REFRESH_MS || 30000));
const MATCHES_API_TIMEOUT_MS = Math.max(2000, Number(process.env.MATCHES_API_TIMEOUT_MS || 6000));
let liveFixtureCache = { fetchedAt:0, fixtures:[], error:null };
let liveFixtureInflight = null;

function ensureDir(){fs.mkdirSync(path.dirname(AUTH_PATH),{recursive:true});}
function blank(){return {version:1,accounts:[],sessions:[]};}
function load(){try{if(!fs.existsSync(AUTH_PATH)){ensureDir();fs.writeFileSync(AUTH_PATH,JSON.stringify(blank(),null,2));return blank();}const x=JSON.parse(fs.readFileSync(AUTH_PATH,'utf8'));return {version:1,accounts:Array.isArray(x.accounts)?x.accounts:[],sessions:Array.isArray(x.sessions)?x.sessions:[]};}catch(e){console.error('Auth verisi okunamadı:',e.message);return blank();}}
function save(db){ensureDir();const temp=`${AUTH_PATH}.tmp`;fs.writeFileSync(temp,JSON.stringify(db,null,2));fs.renameSync(temp,AUTH_PATH);}
function normalizeEmail(v){return String(v||'').trim().toLocaleLowerCase('en-US').slice(0,160);}
function emailValid(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);}
function hashPassword(password,salt=crypto.randomBytes(16).toString('hex')){const hash=crypto.scryptSync(password,salt,64).toString('hex');return {salt,hash};}
function passwordValid(p){return typeof p==='string'&&p.length>=10&&p.length<=128&&/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(p)&&/\d/.test(p);}
function verifyPassword(password,account){try{const actual=crypto.scryptSync(password,account.passwordSalt,64),expected=Buffer.from(account.passwordHash,'hex');return expected.length===actual.length&&crypto.timingSafeEqual(expected,actual);}catch{return false;}}
function tokenHash(token){return crypto.createHash('sha256').update(token).digest('hex');}
function cookies(req){const raw=String(req.headers.cookie||'');return Object.fromEntries(raw.split(';').map(v=>v.trim()).filter(Boolean).map(v=>{const i=v.indexOf('=');return [decodeURIComponent(i<0?v:v.slice(0,i)),decodeURIComponent(i<0?'':v.slice(i+1))];}));}
function secure(req){return String(req.headers['x-forwarded-proto']||'').split(',')[0].trim()==='https';}
function cookieHeader(req,token,maxAge=SESSION_DAYS*86400){return `sn_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure(req)?'; Secure':''}`;}
function json(res,status,obj,extra={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra});res.end(JSON.stringify(obj));}
function body(req){return new Promise((resolve,reject)=>{let d='';req.on('data',c=>{d+=c;if(d.length>65536){reject(new Error('İstek çok büyük.'));req.destroy();}});req.on('end',()=>{try{resolve(d?JSON.parse(d):{});}catch{reject(new Error('Geçersiz istek.'));}});req.on('error',reject);});}
function sameOrigin(req){const origin=req.headers.origin;if(!origin)return true;try{return new URL(origin).host===String(req.headers.host||'');}catch{return false;}}
function cleanup(db){const now=Date.now();let changed=false;db.sessions=db.sessions.filter(s=>{const ok=new Date(s.expiresAt).getTime()>now;if(!ok)changed=true;return ok;});const expiredIds=new Set(db.accounts.filter(a=>a.deletionScheduledAt&&new Date(a.deletionScheduledAt).getTime()<=now).map(a=>a.id));if(expiredIds.size){db.accounts=db.accounts.filter(a=>!expiredIds.has(a.id));db.sessions=db.sessions.filter(s=>!expiredIds.has(s.userId));changed=true;}if(changed)save(db);}
function sessionAccount(req,db){cleanup(db);const token=cookies(req).sn_session;if(!token)return null;const h=tokenHash(token),s=db.sessions.find(x=>x.tokenHash===h);if(!s)return null;return db.accounts.find(a=>a.id===s.userId)||null;}
function createSession(req,res,db,account){const token=crypto.randomBytes(32).toString('base64url'),now=Date.now();db.sessions=db.sessions.filter(s=>s.userId!==account.id||new Date(s.expiresAt).getTime()>now);db.sessions.push({id:crypto.randomUUID(),userId:account.id,tokenHash:tokenHash(token),createdAt:new Date().toISOString(),expiresAt:new Date(now+SESSION_DAYS*86400000).toISOString(),userAgent:String(req.headers['user-agent']||'').slice(0,240)});save(db);res.setHeader('Set-Cookie',cookieHeader(req,token));}
function publicAccount(a){return {id:a.id,email:a.email,displayName:a.displayName,emailVerified:Boolean(a.emailVerified),verificationAvailable:false,createdAt:a.createdAt,deletionScheduledAt:a.deletionScheduledAt||null};}
function rateAllowed(req){const key=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();const now=Date.now(),row=loginBuckets.get(key)||{start:now,count:0};if(now-row.start>15*60*1000){row.start=now;row.count=0;}row.count++;loginBuckets.set(key,row);return row.count<=20;}

function firstValue(...values){return values.find(v=>v!==undefined&&v!==null&&v!=='');}
function scoreValue(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function normalizeMatchStatus(raw){
  const s=String(raw||'').trim().toUpperCase();
  if(['FT','AET','PEN','FINISHED','FINAL','BİTTİ'].includes(s))return 'BİTTİ';
  if(['1H','2H','HT','ET','P','BT','LIVE','IN_PLAY','PAUSED','CANLI'].includes(s))return 'CANLI';
  if(['PST','POSTPONED','ERTELENDİ'].includes(s))return 'ERTELENDİ';
  if(['CANC','CANCELLED','CANCELED','İPTAL'].includes(s))return 'İPTAL';
  if(['SUSP','SUSPENDED','INT','INTERRUPTED'].includes(s))return 'DURDURULDU';
  return 'PROGRAM';
}
function normalizeLiveFixture(item,index){
  const fixture=item?.fixture||item||{};
  const home=firstValue(item?.teams?.home?.name,item?.homeTeam?.name,item?.home?.name,item?.strHomeTeam,item?.home_name,item?.homeTeam);
  const away=firstValue(item?.teams?.away?.name,item?.awayTeam?.name,item?.away?.name,item?.strAwayTeam,item?.away_name,item?.awayTeam);
  if(typeof home!=='string'||typeof away!=='string'||!home.trim()||!away.trim())return null;
  const rawStatus=firstValue(fixture?.status?.short,fixture?.status?.long,item?.status?.short,item?.status,item?.strStatus,item?.match_status);
  const homeScore=scoreValue(firstValue(item?.goals?.home,item?.score?.fullTime?.home,item?.score?.fulltime?.home,item?.homeScore,item?.intHomeScore,item?.score_home));
  const awayScore=scoreValue(firstValue(item?.goals?.away,item?.score?.fullTime?.away,item?.score?.fulltime?.away,item?.awayScore,item?.intAwayScore,item?.score_away));
  const kickoff=firstValue(fixture?.date,item?.utcDate,item?.date,item?.strTimestamp,item?.kickoff,item?.match_date);
  const minute=scoreValue(firstValue(fixture?.status?.elapsed,item?.status?.elapsed,item?.minute,item?.time?.elapsed));
  const id=String(firstValue(fixture?.id,item?.id,item?.eventId,item?.idEvent,`${home}-${away}-${kickoff||index}`));
  return {id,home:home.trim(),away:away.trim(),kickoff:kickoff||null,status:normalizeMatchStatus(rawStatus),homeScore,awayScore,minute,dataSource:'live-api',verifiedResult:true};
}
function extractLiveFixtures(payload){
  const list=Array.isArray(payload)?payload:Array.isArray(payload?.response)?payload.response:Array.isArray(payload?.fixtures)?payload.fixtures:Array.isArray(payload?.matches)?payload.matches:Array.isArray(payload?.events)?payload.events:[];
  return list.map(normalizeLiveFixture).filter(Boolean);
}
async function fetchLiveFixtures(){
  if(!MATCHES_API_URL)return {configured:false,fixtures:[],fetchedAt:null,stale:false};
  const now=Date.now();
  if(liveFixtureCache.fixtures.length&&now-liveFixtureCache.fetchedAt<MATCHES_API_REFRESH_MS)return {configured:true,fixtures:liveFixtureCache.fixtures,fetchedAt:new Date(liveFixtureCache.fetchedAt).toISOString(),stale:false};
  if(liveFixtureInflight)return liveFixtureInflight;
  liveFixtureInflight=(async()=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),MATCHES_API_TIMEOUT_MS);
    try{
      const headers={'Accept':'application/json'};
      if(MATCHES_API_HEADER_NAME&&MATCHES_API_HEADER_VALUE)headers[MATCHES_API_HEADER_NAME]=MATCHES_API_HEADER_VALUE;
      const response=await fetch(MATCHES_API_URL,{headers,signal:controller.signal,cache:'no-store'});
      if(!response.ok)throw new Error(`Maç API HTTP ${response.status}`);
      const payload=await response.json();
      const fixtures=extractLiveFixtures(payload);
      if(!fixtures.length)throw new Error('Maç API geçerli fikstür döndürmedi.');
      liveFixtureCache={fetchedAt:Date.now(),fixtures,error:null};
      return {configured:true,fixtures,fetchedAt:new Date(liveFixtureCache.fetchedAt).toISOString(),stale:false};
    }catch(err){
      liveFixtureCache.error=String(err?.message||err);
      return {configured:true,fixtures:liveFixtureCache.fixtures,fetchedAt:liveFixtureCache.fetchedAt?new Date(liveFixtureCache.fetchedAt).toISOString():null,stale:true,error:liveFixtureCache.error};
    }finally{clearTimeout(timer);liveFixtureInflight=null;}
  })();
  return liveFixtureInflight;
}

async function authHandler(req,res,url,db){
  if(req.method==='GET'&&url.pathname==='/api/auth/me'){
    const a=sessionAccount(req,db);return json(res,200,{ok:true,authenticated:Boolean(a),account:a?publicAccount(a):null});
  }
  if(req.method==='POST'&&url.pathname==='/api/auth/register'){
    if(!sameOrigin(req))return json(res,403,{ok:false,error:'Geçersiz kaynak.'});if(!rateAllowed(req))return json(res,429,{ok:false,error:'Çok fazla deneme. Daha sonra tekrar dene.'});
    const b=await body(req),email=normalizeEmail(b.email),password=String(b.password||''),displayName=String(b.displayName||'').trim().slice(0,32);
    if(!emailValid(email))return json(res,400,{ok:false,error:'Geçerli bir e-posta adresi gir.'});if(!passwordValid(password))return json(res,400,{ok:false,error:'Parola en az 10 karakter olmalı ve harf ile rakam içermeli.'});if(b.acceptTerms!==true)return json(res,400,{ok:false,error:'Kullanıcı sözleşmesini kabul etmelisin.'});
    if(db.accounts.some(a=>a.email===email))return json(res,409,{ok:false,error:'Bu e-posta adresiyle zaten bir hesap var.'});
    const hp=hashPassword(password),a={id:`u_${crypto.randomUUID()}`,email,displayName:displayName||'Yeni Menajer',passwordSalt:hp.salt,passwordHash:hp.hash,emailVerified:false,termsAcceptedAt:new Date().toISOString(),createdAt:new Date().toISOString()};db.accounts.push(a);createSession(req,res,db,a);return json(res,201,{ok:true,account:publicAccount(a),message:'Hesap oluşturuldu. E-posta doğrulama gönderimi için haricî e-posta servisi bağlı değildir.'});
  }
  if(req.method==='POST'&&url.pathname==='/api/auth/login'){
    if(!sameOrigin(req))return json(res,403,{ok:false,error:'Geçersiz kaynak.'});if(!rateAllowed(req))return json(res,429,{ok:false,error:'Çok fazla deneme. Daha sonra tekrar dene.'});
    const b=await body(req),email=normalizeEmail(b.email),password=String(b.password||''),a=db.accounts.find(x=>x.email===email);
    const dummy={passwordSalt:'00000000000000000000000000000000',passwordHash:crypto.scryptSync('dummy','00000000000000000000000000000000',64).toString('hex')};
    const ok=verifyPassword(password,a||dummy);if(!a||!ok)return json(res,401,{ok:false,error:'E-posta veya parola hatalı.'});if(a.deletionScheduledAt&&new Date(a.deletionScheduledAt).getTime()<=Date.now())return json(res,410,{ok:false,error:'Bu hesap silinmiş.'});createSession(req,res,db,a);return json(res,200,{ok:true,account:publicAccount(a)});
  }
  if(req.method==='POST'&&url.pathname==='/api/auth/logout'){
    if(!sameOrigin(req))return json(res,403,{ok:false,error:'Geçersiz kaynak.'});const token=cookies(req).sn_session;if(token)db.sessions=db.sessions.filter(s=>s.tokenHash!==tokenHash(token));save(db);return json(res,200,{ok:true},{'Set-Cookie':cookieHeader(req,'',0)});
  }
  if(req.method==='POST'&&url.pathname==='/api/auth/change-password'){
    if(!sameOrigin(req))return json(res,403,{ok:false,error:'Geçersiz kaynak.'});const a=sessionAccount(req,db);if(!a)return json(res,401,{ok:false,error:'Giriş yapmalısın.'});const b=await body(req),current=String(b.currentPassword||''),next=String(b.newPassword||'');if(!verifyPassword(current,a))return json(res,400,{ok:false,error:'Mevcut parola yanlış.'});if(!passwordValid(next))return json(res,400,{ok:false,error:'Yeni parola en az 10 karakter olmalı ve harf ile rakam içermeli.'});const hp=hashPassword(next);a.passwordSalt=hp.salt;a.passwordHash=hp.hash;a.passwordChangedAt=new Date().toISOString();db.sessions=db.sessions.filter(s=>s.userId!==a.id);createSession(req,res,db,a);return json(res,200,{ok:true});
  }
  return false;
}

http.createServer = function patchedCreateServer(appHandler){
  return realCreateServer(async(req,res)=>{
    try{
      const url=new URL(req.url,`http://${req.headers.host||'localhost'}`),db=load();cleanup(db);
      if(req.method==='GET'&&url.pathname==='/api/live-fixtures'){
        const live=await fetchLiveFixtures();return json(res,200,{ok:true,...live});
      }
      if(url.pathname.startsWith('/api/auth/')){const handled=await authHandler(req,res,url,db);if(handled!==false)return;}
      const a=sessionAccount(req,db);
      if(a)req.headers['x-user-id']=a.id;else if(!req.headers['x-admin-key'])delete req.headers['x-user-id'];
      if(a&&req.method==='POST'&&url.pathname==='/api/account/delete-request'){
        a.deletionRequestedAt=new Date().toISOString();a.deletionScheduledAt=new Date(Date.now()+30*86400000).toISOString();save(db);
      }else if(a&&req.method==='POST'&&url.pathname==='/api/account/delete-cancel'){
        delete a.deletionRequestedAt;delete a.deletionScheduledAt;save(db);
      }
      return appHandler(req,res);
    }catch(err){console.error('Auth katmanı hatası:',err);if(!res.headersSent)json(res,500,{ok:false,error:'Oturum işlemi başarısız.'});else res.end();}
  });
};

require('./server-v2');
