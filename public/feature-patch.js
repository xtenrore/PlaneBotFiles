(() => {
  'use strict';

  let gameState = null;
  let scheduled = false;
  let refreshTimer = null;
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function api(url, options={}) {
    const res = await fetch(url, { ...options, headers:{'Content-Type':'application/json',...(options.headers||{})} });
    const body = await res.json().catch(()=>({}));
    if (!res.ok) throw new Error(body.error || body.errors?.[0] || 'İşlem tamamlanamadı.');
    return body;
  }

  function toast(message) {
    const existing = qs('#toast');
    if (existing) {
      existing.textContent = message;
      existing.classList.add('show');
      setTimeout(()=>existing.classList.remove('show'),2600);
      return;
    }
    console.info('[SahaNova]', message);
  }

  async function refreshState() {
    try {
      gameState = await api('/api/state?ui=official-rules');
      patch();
    } catch (err) {
      console.warn('SahaNova state refresh failed:', err);
    }
  }

  function fmtDeadline(iso) {
    if (!iso) return 'Süre sonu bekleniyor';
    const d = new Date(iso);
    return new Intl.DateTimeFormat('tr-TR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(d);
  }

  function timeLeft(iso) {
    if (!iso) return '';
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return 'Kadro kilitli';
    const mins = Math.floor(ms/60000), days=Math.floor(mins/1440), hrs=Math.floor((mins%1440)/60), rem=mins%60;
    if (days) return `${days}g ${hrs}s kaldı`;
    if (hrs) return `${hrs}s ${rem}dk kaldı`;
    return `${Math.max(0,rem)}dk kaldı`;
  }

  function patchStatusRail() {
    if (!gameState) return;
    let rail = qs('.sn-status-rail');
    if (!rail) {
      rail = document.createElement('div');
      rail.className = 'sn-status-rail';
      const topbar = qs('.topbar');
      if (topbar?.parentElement) topbar.insertAdjacentElement('afterend', rail);
      else qs('.main')?.prepend(rail);
    }
    const realCount = (gameState.players||[]).filter(p=>p.realPlayer).length;
    const clubs = new Set((gameState.players||[]).map(p=>p.club)).size;
    const lockedClass = gameState.locked ? 'locked' : 'good';
    rail.innerHTML = `
      <span class="sn-rule-chip good"><i class="sn-dot"></i>${realCount} gerçek oyuncu · ${clubs} Süper Lig kulübü</span>
      <span class="sn-rule-chip ${lockedClass}"><i class="sn-dot"></i>${gameState.locked?'Kadro kilitli':'Kadro açık'} · ${timeLeft(gameState.deadline)}</span>
      <span class="sn-rule-chip">Süre sonu ${esc(fmtDeadline(gameState.deadline))}</span>
      <span class="sn-rule-chip">Transfer: sınırsız · puan kesintisi yok</span>
      <span class="sn-rule-chip">Hafta ${Number(gameState.user?.activeWeek||6)}</span>`;
  }

  function exactTextPatch() {
    const replacements = new Map([
      ['Üçlü Kaptan','Tripleks Kaptan'],
      ['Dörtlü Kaptan','Dört Dörtlük Kaptan'],
      ['Yedek Gücü','Tüm Takım Sahaya'],
      ['Sınırsız Bütçe','Limitsiz Bütçe'],
      ['Hücum!','Hücum'],
      ['Ek transferler 4 puan maliyetlidir.','Kurallar dahilinde transfer limiti ve puan kesintisi yoktur.'],
      ['Sonraki transfer -4 puan','Transferler puan götürmez']
    ]);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node){ return node.parentElement && !['SCRIPT','STYLE','TEXTAREA'].includes(node.parentElement.tagName) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; }
    });
    const nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const raw=node.nodeValue||'', trimmed=raw.trim();
      if (replacements.has(trimmed)) node.nodeValue=raw.replace(trimmed,replacements.get(trimmed));
      else if (/^\d+\s+serbest transfer$/i.test(trimmed)) node.nodeValue=raw.replace(trimmed,'Sınırsız transfer');
    }
  }

  function appendPanel(key, html) {
    const content=qs('#content');
    if(!content||content.querySelector(`[data-sn-panel="${key}"]`)) return null;
    const wrap=document.createElement('section'); wrap.className='sn-official-panel'; wrap.dataset.snPanel=key; wrap.innerHTML=html; content.append(wrap); return wrap;
  }

  function patchTeam() {
    const forms = Object.keys(gameState?.formations||{});
    qsa('select').forEach(select=>{
      const current=[...select.options].map(o=>o.value||o.textContent.trim());
      if(current.some(v=>/^\d-\d-\d$/.test(v))) {
        forms.forEach(f=>{if(!current.includes(f)){const o=document.createElement('option');o.value=f;o.textContent=f;select.append(o);}});
      }
    });
    appendPanel('team-rules',`<h3>Resmî kadro kuralları</h3><p>15 kişilik kadro: 2 kaleci, 5 defans, 5 orta saha, 3 forvet. Aynı kulüpten en fazla 3 futbolcu seçilebilir.</p><div class="sn-formations">${forms.map(f=>`<span class="sn-formation">${f}</span>`).join('')}</div><div class="sn-rule-grid"><div class="sn-rule-item"><strong>Otomatik değişiklik</strong><small>İlk 11'de hiç süre almayan oyuncunun yerine, yedek sırasındaki ilk uygun ve formasyonu geçerli tutan oyuncu girer.</small></div><div class="sn-rule-item"><strong>Kaptan koruması</strong><small>Kaptan oynamazsa ve yardımcı kaptan süre alırsa 2× kaptan etkisi yardımcı kaptana geçer.</small></div><div class="sn-rule-item"><strong>Takımı Kaydet bonusu</strong><small>Süre sonundan önce haftalık kadroyu kaydettiğinde o hafta +1 puan yalnız bir kez eklenir.</small></div><div class="sn-rule-item"><strong>Hücum kartı</strong><small>Standart formasyon sınırlarının dışına çıkabilir ve o hafta +5M geçici bütçe kullanabilirsin.</small></div></div>`);
  }

  function patchTransfers() {
    appendPanel('transfer-rules',`<h3>Transfer kuralları</h3><p>Transfer sayısı sınırsızdır. Kadro 100M bütçe, mevki dağılımı ve kulüp başına en fazla 3 oyuncu kuralını korumalıdır. Süre sonundan sonra yapılan değişiklikler otomatik olarak sonraki maç haftasına hazırlanır.</p>${gameState?.pendingSquad?`<div class="sn-live-note">Sonraki hafta için bekleyen kadro değişikliğin var (Hafta ${gameState.pendingSquad.week}).</div>`:''}`);
  }

  function patchPredictions() {
    const n=gameState?.nostradamus||{};
    appendPanel('nostradamus-rules',`<h3>Nostradamus puanlaması</h3><p>Haftadaki tüm maçlar için tahminini tamamladığında +1 puan; doğru bildiğin her maç sonucu için ayrıca +1 puan kazanırsın. Yanlış tahmine eksi puan yoktur.</p><div class="sn-rule-grid"><div class="sn-rule-item"><strong>${Number(n.completionBonus||0)} puan</strong><small>Tüm tahminleri tamamlama bonusu</small></div><div class="sn-rule-item"><strong>${Number(n.correctResults||0)} doğru</strong><small>Kesinleşen doğru maç sonucu</small></div></div>`);
  }

  function patchCards() {
    const a=gameState?.cardAvailability||{};
    const labels={tripleCaptain:'Tripleks Kaptan',quadrupleCaptain:'Dört Dörtlük Kaptan',benchBoost:'Tüm Takım Sahaya',attack:'Hücum',unlimitedBudget:'Limitsiz Bütçe'};
    appendPanel('card-rules',`<h3>Menajer kartı hakları</h3><p>Aynı maç haftasında yalnızca bir kart etkin olabilir. Her kart her devrede en fazla iki kez kullanılabilir; ilk kullanım ücretsiz, ikinci kullanım premium haktır. Etkinleşen kart iptal edilemez.</p><div class="sn-rule-grid">${Object.entries(labels).map(([k,l])=>{const x=a[k]||{};return `<div class="sn-rule-item"><strong>${l}</strong><small>Bu devre: ${Number(x.used||0)}/${Number(x.maxPerHalf||2)} kullanıldı · ${x.available?'Kullanılabilir':'Hak gerekli'}</small></div>`}).join('')}</div>`);
  }

  function competitionRows() {
    const cups=(gameState?.cups||[]).map(c=>`<div class="sn-competition-row"><div><strong>${esc(c.name)}</strong><span>${c.memberCount} menajer · eleme usulü</span></div><span>${c.pairings?.length||0} eşleşme</span></div>`).join('');
    const h2h=(gameState?.leagues||[]).filter(l=>l.format==='h2h').map(l=>`<div class="sn-competition-row"><div><strong>${esc(l.name)}</strong><span>Head-to-Head · ${l.members.length} menajer</span></div><span>${esc(l.code)}</span></div>`).join('');
    return (h2h||'')+(cups||'');
  }

  function patchLeagues() {
    const panel=appendPanel('advanced-competitions',`<h3>Ligler & Kupalar</h3><p>Klasik lig veya haftalık birebir eşleşmeli Head-to-Head lig kur. H2H'de galibiyet 3, beraberlik 1, mağlubiyet 0 puandır; eşit lig puanında ham fantezi puanı tie-break olarak kullanılır.</p><div class="sn-competition-form"><input id="snLeagueName" maxlength="48" placeholder="Yeni lig adı"><select id="snLeagueFormat"><option value="classic">Klasik</option><option value="h2h">Head-to-Head</option></select><button class="sn-action" id="snCreateLeague">Lig Kur</button></div><div class="sn-competition-list" id="snCompetitionList">${competitionRows()||'<div class="sn-live-note">Lig ve kupa bilgileri burada görünecek.</div>'}</div>`);
    if(!panel)return;
    qs('#snCreateLeague',panel)?.addEventListener('click',async()=>{
      const name=qs('#snLeagueName',panel)?.value.trim(),format=qs('#snLeagueFormat',panel)?.value||'classic';
      if(!name)return toast('Lig adı gir.');
      try{await api('/api/leagues',{method:'POST',body:JSON.stringify({name,format})});toast(`${format==='h2h'?'Head-to-Head':'Klasik'} lig oluşturuldu.`);await refreshState();}
      catch(err){toast(err.message);}
    });
  }

  function patchFixtures() {
    appendPanel('fixture-deadline',`<h3>Maç haftası kilidi</h3><p>Haftalık kadro, ilk maçın başlamasından 1 saat önce kilitlenir. Sonraki değişiklikler mevcut haftayı etkilemez ve sonraki haftaya hazırlanır.</p><div class="sn-live-note">Süre sonu: ${esc(fmtDeadline(gameState?.deadline))} · ${esc(timeLeft(gameState?.deadline))}</div>`);
  }

  function patchRankings() {
    appendPanel('ranking-rules',`<h3>Sıralama mantığı</h3><p>Klasik ligler toplam fantezi puanına göre; Head-to-Head ligler haftalık 3/1/0 maç puanına göre sıralanır. Kupa karşılaşmaları eleme usulüdür.</p>`);
  }

  function patch() {
    if(!gameState)return;
    patchStatusRail(); exactTextPatch();
    const title=qs('#pageTitle')?.textContent?.trim()||'';
    if(title==='Takımım')patchTeam();
    if(title==='Transfer'||title==='Transferler')patchTransfers();
    if(title==='Nostradamus')patchPredictions();
    if(title==='Özel Kartlar'||title==='Kartlar')patchCards();
    if(title==='Ligler')patchLeagues();
    if(title==='Fikstür')patchFixtures();
    if(title==='Sıralama')patchRankings();
  }

  const observer=new MutationObserver(()=>{
    if(scheduled)return; scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;patch();});
  });
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  window.addEventListener('load',refreshState);
  refreshState();
  refreshTimer=setInterval(refreshState,60000);
  window.addEventListener('beforeunload',()=>clearInterval(refreshTimer));
})();
