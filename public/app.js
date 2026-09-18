(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const money = n => `${Number(n).toFixed(1)} M₺`;
  const escapeHtml = s => String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  const clubs = {
    GS:['Galatasaray','GS'], FB:['Fenerbahçe','FB'], BJK:['Beşiktaş','BJK'], TS:['Trabzonspor','TS'],
    BFK:['Başakşehir','BFK'], GZP:['Göztepe','GÖZ'], SMR:['Samsunspor','SAM'], KNY:['Konyaspor','KON'],
    ANT:['Antalyaspor','ANT'], KSM:['Kasımpaşa','KAS'], RIZ:['Çaykur Rizespor','RİZ'], KOC:['Kocaelispor','KOC'],
    ALY:['Alanyaspor','ALA'], GFK:['Gaziantep FK','GFK'], KYS:['Kayserispor','KAY'], GEN:['Gençlerbirliği','GEN'],
    EYP:['Eyüpspor','EYP'], KGM:['Fatih Karagümrük','FKG']
  };

  const rawPlayers = [
    ['p1','Mert Kaya','GK','GS',6.2,47,'available'],['p2','Baran Aksoy','GK','FB',5.8,42,'available'],['p3','Eren Şahin','GK','BJK',5.1,35,'available'],['p4','Deniz Yalçın','GK','TS',4.7,30,'doubt'],
    ['p5','Arda Demir','DEF','GS',6.8,51,'available'],['p6','Kerem Aydın','DEF','FB',6.5,48,'available'],['p7','Onur Tekin','DEF','BJK',5.9,44,'available'],['p8','Emir Koç','DEF','TS',5.6,39,'available'],['p9','Bora Güneş','DEF','BFK',5.0,34,'available'],['p10','Can Kurt','DEF','GZP',4.8,30,'available'],['p11','Umut Polat','DEF','SMR',4.6,28,'available'],['p12','Yiğit Öz','DEF','KNY',4.4,24,'injured'],['p13','Ali Çelik','DEF','ANT',4.3,23,'available'],['p14','Rüzgar Avcı','DEF','KOC',4.2,21,'available'],
    ['p15','Efe Yıldız','MID','GS',10.8,68,'available'],['p16','Atlas Arslan','MID','FB',10.2,65,'available'],['p17','Kaan Tunç','MID','BJK',8.9,55,'available'],['p18','Batuhan Işık','MID','TS',8.2,52,'available'],['p19','Doruk Er','MID','BFK',7.2,46,'available'],['p20','Poyraz Dinç','MID','GZP',6.7,41,'available'],['p21','Ömer Uslu','MID','SMR',6.3,38,'available'],['p22','Toprak Acar','MID','KNY',5.9,33,'doubt'],['p23','Mete Kılıç','MID','RIZ',5.4,28,'available'],['p24','Cem Ekin','MID','KSM',5.0,26,'available'],['p25','Ayaz Karaca','MID','GFK',4.7,23,'available'],
    ['p26','Sarp Yılmaz','FWD','GS',12.4,73,'available'],['p27','Alp Çetin','FWD','FB',11.9,69,'available'],['p28','Berk Eren','FWD','BJK',10.5,61,'available'],['p29','Ege Uçar','FWD','TS',9.8,58,'available'],['p30','Tuna Özkan','FWD','GZP',8.1,46,'available'],['p31','Kuzey Korkmaz','FWD','SMR',7.5,42,'available'],['p32','Ozan Keskin','FWD','KYS',6.8,36,'available'],['p33','Sinan Güler','FWD','EYP',6.2,31,'injured'],['p34','Çağan Taş','FWD','GEN',5.6,27,'available'],['p35','Levent Bozkurt','FWD','KGM',5.1,24,'available']
  ];
  const players = Object.fromEntries(rawPlayers.map(([id,name,pos,club,price,form,status],i)=>[id,{id,name,pos,club,price,form,status,weekPoints:(i*3+5)%13,seasonPoints:form+Math.floor(i/2)}]));
  const defaultSquad = ['p1','p2','p5','p6','p7','p8','p9','p15','p16','p17','p18','p19','p26','p27','p28'];

  const fixtures = [
    {id:'f1',home:'GS',away:'GFK',time:'Cuma 20:00',hs:null,as:null}, {id:'f2',home:'FB',away:'KOC',time:'Cumartesi 19:00',hs:null,as:null},
    {id:'f3',home:'BJK',away:'GZP',time:'Cumartesi 21:30',hs:null,as:null}, {id:'f4',home:'TS',away:'SMR',time:'Pazar 16:00',hs:null,as:null},
    {id:'f5',home:'BFK',away:'KNY',time:'Pazar 19:00',hs:null,as:null}, {id:'f6',home:'RIZ',away:'ANT',time:'Pazar 21:30',hs:null,as:null},
    {id:'f7',home:'KYS',away:'KSM',time:'Pazartesi 20:00',hs:null,as:null}, {id:'f8',home:'GEN',away:'EYP',time:'Pazartesi 20:00',hs:null,as:null}
  ];

  const rankings = [
    ['Anadolu XI','Burak',312],['Boğaz Kartalları','Seda',305],['Tribün 34','Mert',298],['Sarı Kırmızı 11','Derya',287],['Karadeniz Fırtına','Can',278],['Taktik Tahtası','Ezgi',269],['Kadıköy Press','Arda',262]
  ];

  const defaults = {
    page:'dashboard', week:4, teamName:'Benim Takımım', manager:'Menajer', squad:defaultSquad,
    starters:['p1','p5','p6','p7','p8','p15','p16','p17','p18','p26','p27'], captain:'p26', vice:'p15', formation:'4-4-2',
    bank:15.4, freeTransfers:2, totalPoints:255, weeklyPoints:57, rank:18421, previousRank:21304,
    usedCards:[], activeCard:null, predictions:{}, leagues:[{name:'Arkadaşlar Ligi',code:'SAHA24',members:8,rank:3}],
    rewards:{firstTeam:true,firstPrediction:true,century:true,top10:false,perfect:false},
    settings:{reducedMotion:false,highContrast:false,notifications:true,fullscreenPrompt:true}, live:false,
    transfersMade:0
  };

  const load = () => { try { return {...defaults,...JSON.parse(localStorage.getItem('sahanova-state')||'{}')}; } catch { return {...defaults}; } };
  let state = load();
  const save = () => localStorage.setItem('sahanova-state', JSON.stringify(state));

  const navItems = [
    ['dashboard','⌂','Genel Bakış'],['team','♟','Takımım'],['transfers','⇄','Transferler'],['fixtures','▦','Fikstür'],['cards','✦','Kartlar'],
    ['rankings','↗','Sıralama'],['leagues','◎','Ligler'],['nostradamus','◈','Nostradamus'],['rewards','★','Ödüller'],['profile','●','Profil']
  ];
  const mobileItems = navItems.slice(0,4).concat([['more','•••','Daha Fazla']]);
  const titles = {dashboard:['MAÇ HAFTASI 4','Genel Bakış'],team:['KADRO YÖNETİMİ','Takımım'],transfers:['OYUNCU PAZARI','Transferler'],fixtures:['MAÇ MERKEZİ','Fikstür'],cards:['HAFTALIK STRATEJİ','Özel Kartlar'],rankings:['CANLI REKABET','Sıralama'],leagues:['ARKADAŞLARINLA YARIŞ','Ligler'],nostradamus:['SKOR TAHMİNİ','Nostradamus'],rewards:['SEZON HEDEFLERİ','Ödüller'],profile:['HESAP & AYARLAR','Profil']};

  function renderNav(){
    $('#mainNav').innerHTML = navItems.map(([id,ic,label])=>`<button class="nav-btn ${state.page===id?'active':''}" data-page="${id}"><span class="nav-icon">${ic}</span>${label}</button>`).join('');
    $('#mobileNav').innerHTML = mobileItems.map(([id,ic,label])=>`<button class="nav-btn ${state.page===id?'active':''}" data-page="${id}"><span class="nav-icon">${ic}</span>${label}</button>`).join('');
  }

  const clubName = id => clubs[id]?.[0] || id;
  const clubShort = id => clubs[id]?.[1] || id;
  const posName = p => ({GK:'Kaleci',DEF:'Defans',MID:'Orta Saha',FWD:'Forvet'})[p] || p;
  const squad = () => state.squad.map(id=>players[id]).filter(Boolean);
  const starters = () => state.starters.map(id=>players[id]).filter(Boolean);
  const bench = () => squad().filter(p=>!state.starters.includes(p.id));
  const teamValue = () => squad().reduce((a,p)=>a+p.price,0)+state.bank;
  const toast = msg => { const t=$('#toast'); t.textContent=msg;t.classList.add('show'); clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove('show'),2300); };

  function setPage(page){
    if(page==='more') return openMore();
    state.page=page; save(); render();
    requestAnimationFrame(()=>$('#content')?.focus({preventScroll:true}));
  }

  function render(){
    renderNav();
    $('#sideWeek').textContent=state.week;
    $('#topPoints').textContent=state.totalPoints;
    const [ey,title]=titles[state.page]||titles.dashboard;
    $('#pageEyebrow').textContent=ey.replace('4',state.week);
    $('#pageTitle').textContent=title;
    const maps={dashboard:dashboardPage,team:teamPage,transfers:transferPage,fixtures:fixturesPage,cards:cardsPage,rankings:rankingsPage,leagues:leaguesPage,nostradamus:nostradamusPage,rewards:rewardsPage,profile:profilePage};
    $('#content').innerHTML=(maps[state.page]||dashboardPage)();
    bindPage();
  }

  function dashboardPage(){
    const delta=state.previousRank-state.rank;
    return `
      <div class="hero-grid">
        <article class="hero-card">
          <p class="eyebrow" style="color:var(--lime)">SONRAKİ SON TARİH · CUMA 19:00</p>
          <h3>${escapeHtml(state.teamName)} maça hazır mı?</h3>
          <p>İlk 11'ini kontrol et, kaptanını belirle ve ücretsiz transferlerini kullan. Son kayıt anına kadar değişiklik yapabilirsin.</p>
          <div class="hero-actions"><button class="btn btn-primary" data-page="team">Takımı Düzenle</button><button class="btn btn-ghost" data-page="transfers">Transfer Yap</button></div>
        </article>
        <div class="metric-stack">
          <article class="metric-card"><span class="metric-label">HAFTALIK PUAN</span><div class="metric-value">${state.weeklyPoints}</div><span class="metric-sub">Hafta ${state.week} · ${state.live?'Canlı güncelleniyor':'Maçlar bekleniyor'}</span></article>
          <article class="metric-card"><span class="metric-label">GENEL SIRALAMA</span><div class="metric-value">#${state.rank.toLocaleString('tr-TR')}</div><span class="metric-sub">${delta>0?`▲ ${delta.toLocaleString('tr-TR')} sıra yükseldin`:'Sıralaman sabit'}</span></article>
        </div>
      </div>
      <div class="section-head"><div><h3>Bu hafta</h3><p>Tek ekrandan kritik kararlarını tamamla.</p></div><button class="btn btn-ghost" data-action="simulateLive">${state.live?'Canlı Simülasyonu Durdur':'Canlı Maçı Simüle Et'}</button></div>
      <div class="grid-3">
        ${quick('⇄','Transfer Hakkı',`${state.freeTransfers} ücretsiz transfer`,`Bankada ${money(state.bank)}`,'transfers')}
        ${quick('✦','Aktif Strateji',state.activeCard||'Kart seçilmedi','Kartlar maç haftasına özel avantaj verir.','cards')}
        ${quick('◈','Nostradamus',`${Object.keys(state.predictions).length}/${fixtures.length} tahmin`,`Maç başlamadan skor tahminlerini kaydet.`, 'nostradamus')}
      </div>
      <div class="section-head"><div><h3>Kadro özeti</h3><p>Form, uygunluk ve puan görünümü.</p></div><button class="btn btn-secondary" data-page="team">Sahaya Git</button></div>
      <div class="card">
        <div class="stat-strip">
          <div class="mini-stat"><span>Takım Değeri</span><strong>${money(teamValue())}</strong></div>
          <div class="mini-stat"><span>Kaptan</span><strong>${escapeHtml(players[state.captain]?.name||'-')}</strong></div>
          <div class="mini-stat"><span>Diziliş</span><strong>${state.formation}</strong></div>
          <div class="mini-stat"><span>Toplam Puan</span><strong>${state.totalPoints}</strong></div>
        </div>
      </div>`;
  }
  function quick(icon,title,value,sub,page){return `<article class="card quick-card"><div><div class="quick-icon">${icon}</div><h4>${title}</h4><strong>${value}</strong><p>${sub}</p></div><button class="btn btn-ghost" data-page="${page}">Aç</button></article>`}

  function teamPage(){
    const byPos = pos => starters().filter(p=>p.pos===pos);
    const row = ps => `<div class="formation-row">${ps.map(playerTile).join('')}</div>`;
    return `<div class="pitch-layout">
      <div class="pitch" aria-label="Futbol sahası üzerinde ilk 11">
        ${row(byPos('GK'))}${row(byPos('DEF'))}${row(byPos('MID'))}${row(byPos('FWD'))}
      </div>
      <div>
        <div class="card">
          <div class="section-head" style="margin-top:0"><div><h3>Takım Ayarları</h3><p>Diziliş ve kaptanlık</p></div></div>
          <label class="metric-label" for="formation">DİZİLİŞ</label><select id="formation" class="select full"><option ${state.formation==='4-4-2'?'selected':''}>4-4-2</option><option ${state.formation==='4-3-3'?'selected':''}>4-3-3</option><option ${state.formation==='3-5-2'?'selected':''}>3-5-2</option><option ${state.formation==='5-3-2'?'selected':''}>5-3-2</option></select>
          <div class="divider"></div><div class="notice">Bir oyuncuya dokunarak kaptan, yardımcı kaptan veya yedek değişikliği yapabilirsin.</div>
        </div>
        <div class="section-head"><div><h3>Yedekler</h3><p>4 oyuncu</p></div></div>
        <div class="bench">${bench().map(p=>`<button class="player-mini" data-player="${p.id}"><strong>${escapeHtml(p.name)}</strong><span>${posName(p.pos)} · ${p.weekPoints}p</span></button>`).join('')}</div>
        <div class="section-head"><div><h3>Durum</h3></div></div>
        <div class="card"><div class="settings-list">${squad().filter(p=>p.status!=='available').map(p=>`<div class="setting-row"><div><strong>${escapeHtml(p.name)}</strong><p>${p.status==='injured'?'Sakat — forma giymesi beklenmiyor':'Şüpheli — maç saati kararı'}</p></div><span class="badge ${p.status==='injured'?'red':'warn'}">${p.status==='injured'?'Sakat':'Şüpheli'}</span></div>`).join('')||'<div class="notice success">Tüm oyuncular hazır görünüyor.</div>'}</div></div>
      </div>
    </div>`;
  }
  function playerTile(p){return `<button class="player-tile ${state.captain===p.id?'captain':''} ${state.vice===p.id?'vice':''}" data-player="${p.id}" aria-label="${escapeHtml(p.name)} seçenekleri"><div class="shirt">${clubShort(p.club)}</div><div class="player-name">${escapeHtml(p.name)}</div><div class="player-points">${p.weekPoints} puan</div></button>`}

  function transferPage(){
    const filter = transferPage.filter||'ALL';
    const term = transferPage.term||'';
    const available = Object.values(players).filter(p=>!state.squad.includes(p.id) && (filter==='ALL'||p.pos===filter) && (!term||p.name.toLocaleLowerCase('tr').includes(term.toLocaleLowerCase('tr'))||clubName(p.club).toLocaleLowerCase('tr').includes(term.toLocaleLowerCase('tr'))));
    return `<div class="grid-3">
      <div class="metric-card"><span class="metric-label">BANKA</span><div class="metric-value">${money(state.bank)}</div><span class="metric-sub">Kullanılabilir bütçe</span></div>
      <div class="metric-card"><span class="metric-label">ÜCRETSİZ TRANSFER</span><div class="metric-value">${state.freeTransfers}</div><span class="metric-sub">Sonraki transfer -4 puan</span></div>
      <div class="metric-card"><span class="metric-label">KADRO DEĞERİ</span><div class="metric-value">${money(teamValue())}</div><span class="metric-sub">15 oyuncu</span></div>
    </div>
    <div class="section-head"><div><h3>Oyuncu Pazarı</h3><p>Aynı pozisyondaki bir oyuncuyu kadrona al.</p></div></div>
    <div class="toolbar" style="margin-bottom:12px"><input id="playerSearch" class="input" placeholder="Oyuncu veya kulüp ara" value="${escapeHtml(term)}"/><div class="chip-row">${[['ALL','Tümü'],['GK','KL'],['DEF','DF'],['MID','OS'],['FWD','FV']].map(([id,l])=>`<button class="chip ${filter===id?'active':''}" data-filter="${id}">${l}</button>`).join('')}</div></div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Oyuncu</th><th>Pozisyon</th><th>Form</th><th>Durum</th><th>Fiyat</th><th></th></tr></thead><tbody>${available.map(p=>`<tr><td><div class="player-cell"><div class="club-dot">${clubShort(p.club)}</div><div><strong>${escapeHtml(p.name)}</strong><small class="muted">${clubName(p.club)}</small></div></div></td><td>${posName(p.pos)}</td><td>${p.form}</td><td><span class="badge ${p.status==='injured'?'red':p.status==='doubt'?'warn':''}"><span class="status-dot ${p.status}"></span>${p.status==='available'?'Hazır':p.status==='doubt'?'Şüpheli':'Sakat'}</span></td><td class="price">${money(p.price)}</td><td><button class="btn btn-secondary" data-buy="${p.id}">Transfer Et</button></td></tr>`).join('')}</tbody></table></div>`;
  }

  function fixturesPage(){
    return `<div class="toolbar" style="justify-content:space-between"><div class="chip-row"><button class="chip active">Hafta ${state.week}</button><button class="chip">Hafta ${state.week+1}</button></div><button class="btn btn-secondary" data-action="randomScores">Skorları Canlandır</button></div><div class="section-head"><div><h3>Süper Lig Maçları</h3><p>Program ve canlı skor merkezi</p></div></div><div class="fixture-list">${fixtures.map(f=>`<article class="fixture"><div class="home"><strong>${clubName(f.home)}</strong><small>${clubShort(f.home)}</small></div><div><div class="score">${f.hs==null?'–':f.hs} : ${f.as==null?'–':f.as}</div><small style="text-align:center">${f.time}</small></div><div><strong>${clubName(f.away)}</strong><small>${clubShort(f.away)}</small></div></article>`).join('')}</div>`;
  }

  const cardDefs=[
    ['Üçlü Kaptan','Kaptanının puanını bu hafta 3 ile çarpar.','c1'],['Dörtlü Kaptan','Kaptanının puanını bu hafta 4 ile çarpar.','c2'],['Yedek Gücü','Yedek kulübesindeki tüm puanları haftaya ekler.','c3'],['Sınırsız Bütçe','Bu hafta transfer bütçe sınırını kaldırır.','c4'],['Hücum Modu','Forvet ve orta saha oyuncularına bonus verir.','c5']
  ];
  function cardsPage(){
    return `<div class="notice warn">Her maç haftasında yalnızca bir strateji kartı etkinleştirilebilir. Etkinleştirilen kart geri alınamaz.</div><div class="section-head"><div><h3>Kart Koleksiyonu</h3><p>Doğru haftada doğru avantaj.</p></div></div><div class="cards-grid">${cardDefs.map(([name,desc,cls])=>`<article class="strategy-card ${cls}"><div><span class="badge" style="background:rgba(255,255,255,.15);color:white">${state.usedCards.includes(name)?'KULLANILDI':state.activeCard===name?'AKTİF':'HAZIR'}</span><h4>${name}</h4><p>${desc}</p></div><button class="btn btn-white" data-card="${name}" ${state.usedCards.includes(name)||state.activeCard?'disabled':''}>${state.activeCard===name?'Etkin':'Etkinleştir'}</button></article>`).join('')}</div>`;
  }

  function rankingsPage(){
    const rows=[...rankings,[state.teamName,state.manager,state.totalPoints]].sort((a,b)=>b[2]-a[2]);
    return `<div class="grid-3"><div class="metric-card"><span class="metric-label">GENEL SIRA</span><div class="metric-value">#${state.rank.toLocaleString('tr-TR')}</div><span class="metric-sub">Tüm menajerler</span></div><div class="metric-card"><span class="metric-label">HAFTA PUANI</span><div class="metric-value">${state.weeklyPoints}</div><span class="metric-sub">Hafta ${state.week}</span></div><div class="metric-card"><span class="metric-label">TOPLAM</span><div class="metric-value">${state.totalPoints}</div><span class="metric-sub">Sezon toplamı</span></div></div><div class="section-head"><div><h3>Canlı Sıralama</h3><p>Demo lig tablosu</p></div></div><div class="card">${rows.map((r,i)=>`<div class="rank-row ${r[0]===state.teamName?'me':''}"><div class="rank-no">${i+1}</div><div class="rank-team"><strong>${escapeHtml(r[0])}</strong><span>${escapeHtml(r[1])}</span></div><div class="weekly">+${Math.max(30,65-i*4)}</div><div class="rank-score">${r[2]}p</div></div>`).join('')}</div>`;
  }

  function leaguesPage(){
    return `<div class="grid-2"><article class="card"><h3>Özel Lig Oluştur</h3><p class="muted">Arkadaşlarını davet etmek için paylaşılabilir kod üret.</p><input id="leagueName" class="input full" maxlength="30" placeholder="Lig adı"/><button class="btn btn-secondary full" data-action="createLeague" style="margin-top:10px">Lig Oluştur</button></article><article class="card"><h3>Lige Katıl</h3><p class="muted">Bir arkadaşının davet kodunu gir.</p><input id="leagueCode" class="input full" maxlength="8" placeholder="Örn. SAHA24"/><button class="btn btn-secondary full" data-action="joinLeague" style="margin-top:10px">Koda Katıl</button></article></div><div class="section-head"><div><h3>Liglerim</h3><p>${state.leagues.length} aktif lig</p></div></div><div class="grid-2">${state.leagues.map((l,i)=>`<article class="card league-card"><div><h4>${escapeHtml(l.name)}</h4><p>${l.members} menajer · Sıran #${l.rank}</p><div style="margin-top:10px"><span class="league-code">${escapeHtml(l.code)}</span></div></div><div><button class="btn btn-ghost" data-copy="${l.code}">Kodu Kopyala</button><button class="btn btn-danger" data-leave="${i}" style="margin-top:7px">Ayrıl</button></div></article>`).join('')||'<div class="card empty">Henüz bir lige katılmadın.</div>'}</div>`;
  }

  function nostradamusPage(){
    const saved=Object.keys(state.predictions).length;
    return `<div class="grid-3"><div class="metric-card"><span class="metric-label">KAYDEDİLEN</span><div class="metric-value">${saved}/${fixtures.length}</div><span class="metric-sub">Bu hafta</span></div><div class="metric-card"><span class="metric-label">TAHMİN PUANI</span><div class="metric-value">${saved*2}</div><span class="metric-sub">Simüle bonus</span></div><div class="metric-card"><span class="metric-label">SERİ</span><div class="metric-value">3</div><span class="metric-sub">Doğru sonuç</span></div></div><div class="section-head"><div><h3>Skor Tahminleri</h3><p>Maç başlamadan kilitle.</p></div><button class="btn btn-secondary" data-action="savePredictions">Tahminleri Kaydet</button></div><div class="nostra-grid">${fixtures.map(f=>{const pr=state.predictions[f.id]||['',''];return `<article class="prediction"><div class="home"><strong>${clubName(f.home)}</strong></div><div class="score-inputs"><input class="input pred-home" data-fixture="${f.id}" type="number" min="0" max="9" value="${pr[0]}"><span>:</span><input class="input pred-away" data-fixture="${f.id}" type="number" min="0" max="9" value="${pr[1]}"></div><div><strong>${clubName(f.away)}</strong></div></article>`}).join('')}</div>`;
  }

  function rewardsPage(){
    const rewards=[
      ['🏁','İlk Kadro','15 oyunculuk ilk kadronu tamamla',15,15,state.rewards.firstTeam],['🔮','İlk Tahmin','Nostradamus tahmini kaydet',Object.keys(state.predictions).length,1,state.rewards.firstPrediction],['💯','100 Puan Kulübü','Sezonda 100 puanı geç',state.totalPoints,100,state.rewards.century],['🏆','Lig İlk 10','Özel bir ligde ilk 10’a gir',state.leagues.some(l=>l.rank<=10)?1:0,1,state.leagues.some(l=>l.rank<=10)],['✨','Kusursuz Hafta','Tüm tahminleri doldur',Object.keys(state.predictions).length,fixtures.length,Object.keys(state.predictions).length===fixtures.length]
    ];
    return `<div class="hero-card" style="min-height:200px"><p class="eyebrow" style="color:var(--lime)">ÖDÜL MERKEZİ</p><h3>Her hafta yeni bir hedef.</h3><p>Başarımlar, haftalık performans ve sezon hedefleriyle profilini geliştir.</p></div><div class="section-head"><div><h3>Başarımlar</h3><p>${rewards.filter(r=>r[5]).length}/${rewards.length} tamamlandı</p></div></div><div class="grid-2">${rewards.map(r=>`<article class="card reward-card"><div class="reward-icon">${r[0]}</div><div><strong>${r[1]}</strong><p class="muted" style="margin:4px 0 8px">${r[2]}</p><div class="progress"><span style="width:${Math.min(100,r[3]/r[4]*100)}%"></span></div></div><span class="badge ${r[5]?'':'warn'}">${r[5]?'Tamamlandı':`${r[3]}/${r[4]}`}</span></article>`).join('')}</div>`;
  }

  function profilePage(){
    return `<div class="grid-2"><div class="card"><div class="profile-hero"><div class="profile-avatar">${escapeHtml(state.manager.charAt(0).toUpperCase())}</div><div><h3 style="margin:0">${escapeHtml(state.manager)}</h3><p class="muted" style="margin:4px 0">${escapeHtml(state.teamName)}</p><span class="badge">Sezon 2026/27</span></div></div><div class="stat-strip"><div class="mini-stat"><span>Toplam</span><strong>${state.totalPoints}</strong></div><div class="mini-stat"><span>Sıra</span><strong>#${state.rank.toLocaleString('tr-TR')}</strong></div><div class="mini-stat"><span>Lig</span><strong>${state.leagues.length}</strong></div><div class="mini-stat"><span>Transfer</span><strong>${state.transfersMade}</strong></div></div><div class="divider"></div><label class="metric-label">MENAJER ADI</label><input id="managerName" class="input full" value="${escapeHtml(state.manager)}" maxlength="28" style="margin:6px 0 12px"><label class="metric-label">TAKIM ADI</label><input id="teamName" class="input full" value="${escapeHtml(state.teamName)}" maxlength="28" style="margin:6px 0 12px"><button class="btn btn-secondary" data-action="saveProfile">Profili Kaydet</button></div><div class="card"><h3 style="margin-top:0">Ayarlar</h3><div class="settings-list">${settingRow('Bildirimler','Hafta son tarihi ve skor bildirimleri','notifications')}${settingRow('Azaltılmış hareket','Geçiş animasyonlarını azalt','reducedMotion')}${settingRow('Yüksek kontrast','Metin ve kenar kontrastını artır','highContrast')}${settingRow('Açılışta tam ekran','Tam ekran giriş ekranını göster','fullscreenPrompt')}</div><div class="divider"></div><button class="btn btn-ghost" data-action="fullscreen">Tam Ekranı Aç</button><button class="btn btn-danger" data-action="reset" style="margin-left:8px">Oyunu Sıfırla</button></div></div>`;
  }
  function settingRow(title,desc,key){return `<div class="setting-row"><div><strong>${title}</strong><p>${desc}</p></div><button class="switch ${state.settings[key]?'active':''}" data-setting="${key}" role="switch" aria-checked="${state.settings[key]}"></button></div>`}

  function openPlayer(id){
    const p=players[id]; if(!p)return;
    const isStarter=state.starters.includes(id);
    modal(`<div class="modal-head"><div><span class="badge">${posName(p.pos)}</span><h3>${escapeHtml(p.name)}</h3></div><button class="modal-close" data-close>×</button></div><p class="muted">${clubName(p.club)} · ${money(p.price)} · Form ${p.form}</p><div class="grid-2"><button class="btn btn-secondary" data-captain="${id}">Kaptan Yap</button><button class="btn btn-ghost" data-vice="${id}">Yardımcı Kaptan Yap</button></div><div class="divider"></div><button class="btn ${isStarter?'btn-danger':'btn-primary'} full" data-toggle-starter="${id}">${isStarter?'Yedeğe Al':'İlk 11’e Al'}</button>`);
  }
  function modal(html){ $('#modalRoot').innerHTML=`<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`; }
  function closeModal(){ $('#modalRoot').innerHTML=''; }

  function openMore(){
    modal(`<div class="modal-head"><h3>Daha Fazla</h3><button class="modal-close" data-close>×</button></div><div class="grid-2">${navItems.slice(4).map(([id,ic,l])=>`<button class="card" style="text-align:left" data-page="${id}"><div class="quick-icon">${ic}</div><strong>${l}</strong></button>`).join('')}</div>`);
  }

  function openTransfer(id){
    const incoming=players[id];
    const outs=squad().filter(p=>p.pos===incoming.pos);
    modal(`<div class="modal-head"><div><span class="badge">Transfer</span><h3>${escapeHtml(incoming.name)} kadroya gelsin</h3></div><button class="modal-close" data-close>×</button></div><p class="muted">Aynı pozisyondan göndereceğin oyuncuyu seç.</p><div class="settings-list">${outs.map(p=>{const delta=incoming.price-p.price;const ok=state.bank-delta>=0||state.activeCard==='Sınırsız Bütçe';return `<div class="setting-row"><div><strong>${escapeHtml(p.name)}</strong><p>${clubName(p.club)} · ${money(p.price)}</p></div><button class="btn ${ok?'btn-secondary':'btn-ghost'}" data-swap="${p.id}|${incoming.id}" ${ok?'':'disabled'}>${delta>0?'+'+money(delta):money(delta)} · Değiştir</button></div>`}).join('')}</div>`);
  }

  function toggleStarter(id){
    const p=players[id]; const is=state.starters.includes(id);
    if(is){
      const candidates=bench().filter(x=>x.pos===p.pos);
      if(!candidates.length)return toast('Aynı pozisyonda yedek oyuncu yok.');
      state.starters=state.starters.filter(x=>x!==id).concat(candidates[0].id);
    } else {
      const candidates=starters().filter(x=>x.pos===p.pos);
      if(!candidates.length)return toast('Bu pozisyonda değiştirilecek oyuncu yok.');
      state.starters=state.starters.filter(x=>x!==candidates[candidates.length-1].id).concat(id);
    }
    save(); closeModal(); render(); toast('İlk 11 güncellendi.');
  }

  function activateCard(name){
    if(state.activeCard||state.usedCards.includes(name))return;
    state.activeCard=name;state.usedCards.push(name);save();render();toast(`${name} etkinleştirildi.`);
  }

  function randomScores(){
    fixtures.forEach(f=>{f.hs=Math.floor(Math.random()*4);f.as=Math.floor(Math.random()*4)}); render();toast('Canlı skorlar güncellendi.');
  }

  function simulateLive(){
    state.live=!state.live;
    if(state.live){
      const gain=8+Math.floor(Math.random()*12);state.weeklyPoints+=gain;state.totalPoints+=gain;state.previousRank=state.rank;state.rank=Math.max(1,state.rank-Math.floor(Math.random()*1800+500));
      starters().forEach(p=>p.weekPoints=Math.min(18,p.weekPoints+Math.floor(Math.random()*4)));
    }
    save();render();toast(state.live?'Canlı puan simülasyonu başladı.':'Canlı simülasyon durdu.');
  }

  function doSwap(outId,inId){
    const out=players[outId], incoming=players[inId]; const delta=incoming.price-out.price;
    if(state.bank-delta<0 && state.activeCard!=='Sınırsız Bütçe')return toast('Bütçe yetersiz.');
    state.squad=state.squad.map(id=>id===outId?inId:id);
    state.starters=state.starters.map(id=>id===outId?inId:id);
    if(state.captain===outId)state.captain=inId;if(state.vice===outId)state.vice=inId;
    if(state.activeCard!=='Sınırsız Bütçe')state.bank=+(state.bank-delta).toFixed(1);
    if(state.freeTransfers>0)state.freeTransfers--;else state.totalPoints=Math.max(0,state.totalPoints-4);
    state.transfersMade++;save();closeModal();render();toast(`${incoming.name} transfer edildi.`);
  }

  function savePredictions(){
    const preds={};
    $$('.pred-home').forEach(h=>{const a=$(`.pred-away[data-fixture="${h.dataset.fixture}"]`);if(h.value!==''&&a?.value!=='')preds[h.dataset.fixture]=[Number(h.value),Number(a.value)]});
    state.predictions=preds;state.rewards.firstPrediction=Object.keys(preds).length>0;save();render();toast('Tahminlerin kaydedildi.');
  }

  function createLeague(){ const name=$('#leagueName')?.value.trim();if(!name)return toast('Lig adı yazmalısın.');const code=Math.random().toString(36).slice(2,8).toUpperCase();state.leagues.push({name,code,members:1,rank:1});save();render();toast('Özel lig oluşturuldu.'); }
  function joinLeague(){ const code=$('#leagueCode')?.value.trim().toUpperCase();if(!code)return toast('Davet kodu gir.');if(state.leagues.some(l=>l.code===code))return toast('Bu ligde zaten varsın.');state.leagues.push({name:`${code} Ligi`,code,members:5+Math.floor(Math.random()*20),rank:1+Math.floor(Math.random()*8)});save();render();toast('Lige katıldın.'); }

  async function fullscreen(){ try { if(!document.fullscreenElement) await document.documentElement.requestFullscreen(); } catch { toast('Tarayıcı tam ekran izni vermedi.'); } }

  function bindPage(){
    $$('[data-page]').forEach(el=>el.addEventListener('click',()=>{closeModal();setPage(el.dataset.page)}));
    $$('[data-player]').forEach(el=>el.addEventListener('click',()=>openPlayer(el.dataset.player)));
    $('#formation')?.addEventListener('change',e=>{state.formation=e.target.value;save();toast('Diziliş tercihin kaydedildi.');});
    $$('[data-buy]').forEach(el=>el.addEventListener('click',()=>openTransfer(el.dataset.buy)));
    $$('[data-filter]').forEach(el=>el.addEventListener('click',()=>{transferPage.filter=el.dataset.filter;render()}));
    $('#playerSearch')?.addEventListener('input',e=>{transferPage.term=e.target.value; clearTimeout(transferPage._t);transferPage._t=setTimeout(render,120)});
    $$('[data-card]').forEach(el=>el.addEventListener('click',()=>activateCard(el.dataset.card)));
    $$('[data-copy]').forEach(el=>el.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(el.dataset.copy);toast('Lig kodu kopyalandı.')}catch{toast(`Kod: ${el.dataset.copy}`)}}));
    $$('[data-leave]').forEach(el=>el.addEventListener('click',()=>{state.leagues.splice(Number(el.dataset.leave),1);save();render();toast('Ligden ayrıldın.')}));
    $$('[data-setting]').forEach(el=>el.addEventListener('click',()=>{const k=el.dataset.setting;state.settings[k]=!state.settings[k];save();applySettings();render()}));
    $$('[data-action]').forEach(el=>el.addEventListener('click',()=>{
      const a=el.dataset.action;
      if(a==='simulateLive')simulateLive();if(a==='randomScores')randomScores();if(a==='savePredictions')savePredictions();if(a==='createLeague')createLeague();if(a==='joinLeague')joinLeague();if(a==='fullscreen')fullscreen();
      if(a==='saveProfile'){state.manager=$('#managerName').value.trim()||'Menajer';state.teamName=$('#teamName').value.trim()||'Benim Takımım';save();render();toast('Profil güncellendi.');}
      if(a==='reset'&&confirm('Tüm yerel oyun ilerlemesi sıfırlansın mı?')){localStorage.removeItem('sahanova-state');state={...defaults,settings:{...defaults.settings},leagues:[...defaults.leagues],predictions:{},usedCards:[]};applySettings();render();toast('Oyun sıfırlandı.');}
    }));
  }

  document.addEventListener('click',e=>{
    const c=e.target.closest('[data-close]');if(c)closeModal();
    if(e.target.classList.contains('modal-backdrop'))closeModal();
    const cap=e.target.closest('[data-captain]');if(cap){state.captain=cap.dataset.captain;if(state.vice===state.captain)state.vice=state.starters.find(id=>id!==state.captain)||state.vice;save();closeModal();render();toast('Kaptan güncellendi.');}
    const vice=e.target.closest('[data-vice]');if(vice){if(vice.dataset.vice===state.captain)return toast('Kaptan aynı zamanda yardımcı olamaz.');state.vice=vice.dataset.vice;save();closeModal();render();toast('Yardımcı kaptan güncellendi.');}
    const ts=e.target.closest('[data-toggle-starter]');if(ts)toggleStarter(ts.dataset.toggleStarter);
    const sw=e.target.closest('[data-swap]');if(sw){const [o,i]=sw.dataset.swap.split('|');doSwap(o,i);}
  });

  function applySettings(){
    document.documentElement.style.scrollBehavior=state.settings.reducedMotion?'auto':'';
    document.body.style.filter=state.settings.highContrast?'contrast(1.13)':'';
  }

  $('#enterFullscreen').addEventListener('click',async()=>{await fullscreen();$('#fullscreenGate').classList.add('hidden');localStorage.setItem('sahanova-gate','seen')});
  $('#continueWindowed').addEventListener('click',()=>{$('#fullscreenGate').classList.add('hidden');localStorage.setItem('sahanova-gate','seen')});
  $('#fullscreenBtn').addEventListener('click',fullscreen);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#modalRoot').innerHTML)closeModal()});

  if(localStorage.getItem('sahanova-gate')==='seen' && !state.settings.fullscreenPrompt) $('#fullscreenGate').classList.add('hidden');
  applySettings();render();
})();
