(() => {
  'use strict';

  let state = null;
  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function api(url, options={}) {
    const res = await fetch(url,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
    const body = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(body.error||body.errors?.[0]||'İşlem tamamlanamadı.');
    return body;
  }
  function toast(msg){const t=$('#toast');if(t){t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600);}else console.log(msg);}
  async function refresh(){try{state=await api('/api/state?free=1');patchCommercialText();addNav();addTopButtons();deadlineNotification();}catch(e){console.warn(e);}}

  function addStyles(){
    if($('#snFreeStyles'))return;
    const st=document.createElement('style');st.id='snFreeStyles';st.textContent=`
      .sn-free-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:#e7f7ec;color:#136b3a;font-size:12px;font-weight:800;letter-spacing:.02em}
      .sn-extra-btn{width:100%;display:flex;align-items:center;gap:10px;padding:11px 12px;border:0;background:transparent;color:inherit;border-radius:12px;cursor:pointer;font:inherit;text-align:left}.sn-extra-btn:hover{background:rgba(255,255,255,.08)}
      .sn-modal-backdrop{position:fixed;inset:0;z-index:9999;background:rgba(4,12,9,.72);backdrop-filter:blur(8px);display:grid;place-items:center;padding:18px}
      .sn-modal{width:min(900px,100%);max-height:90vh;overflow:auto;background:#f7faf8;color:#13231c;border-radius:22px;box-shadow:0 24px 80px rgba(0,0,0,.35)}
      .sn-modal-head{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:center;padding:20px 22px;background:#f7faf8;border-bottom:1px solid #dce6e1}.sn-modal-head h3{margin:0}
      .sn-modal-body{padding:22px}.sn-close{border:0;border-radius:999px;width:38px;height:38px;cursor:pointer;font-size:20px;background:#e5ece8}
      .sn-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.sn-box{background:white;border:1px solid #dfe8e3;border-radius:16px;padding:16px}.sn-box strong{display:block;font-size:18px}.sn-box small{display:block;margin-top:5px;color:#607068}
      .sn-table{width:100%;border-collapse:collapse}.sn-table th,.sn-table td{padding:10px;border-bottom:1px solid #e2e9e5;text-align:left;font-size:14px}.sn-table th{color:#607068;font-size:12px;text-transform:uppercase}
      .sn-form{display:grid;gap:12px}.sn-form input,.sn-form select,.sn-form textarea{width:100%;box-sizing:border-box;border:1px solid #cbd8d1;border-radius:12px;padding:11px;background:white;font:inherit}.sn-form textarea{min-height:120px;resize:vertical}
      .sn-btn{border:0;border-radius:12px;padding:11px 14px;cursor:pointer;font-weight:800;background:#0b5138;color:white}.sn-btn.alt{background:#e7eee9;color:#173c2d}.sn-btn.danger{background:#8f2525}.sn-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.sn-note{padding:13px 14px;border-radius:12px;background:#eef6f1;color:#29493a}.sn-danger-note{background:#fff1f1;color:#7c2020}
      .sn-help h4{margin:22px 0 7px}.sn-help p,.sn-help li{line-height:1.55;color:#42554b}.sn-help ul{padding-left:20px}.sn-pair{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #e2e9e5}.sn-bell{position:relative}.sn-count{position:absolute;right:-4px;top:-5px;background:#d82f2f;color:white;border-radius:999px;min-width:17px;height:17px;font-size:10px;display:grid;place-items:center;font-weight:800}
      @media(max-width:700px){.sn-grid{grid-template-columns:1fr}.sn-modal-backdrop{padding:0}.sn-modal{max-height:100vh;height:100vh;border-radius:0}.sn-modal-body{padding:16px}}
    `;document.head.append(st);
  }

  function patchCommercialText(){
    const replacements=[
      [/premium/gi,'ücretsiz'],[/satın alma/gi,'etkinleştirme'],[/satın alın/gi,'kullan'],[/satın al/gi,'kullan'],[/ödeme/gi,'ücretsiz kullanım'],[/ücretli/gi,'ücretsiz']
    ];
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement&&!['SCRIPT','STYLE','TEXTAREA'].includes(n.parentElement.tagName)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT});
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    for(const node of nodes){let t=node.nodeValue||'';if(!t.trim())continue;for(const [a,b] of replacements)t=t.replace(a,b);if(t.includes('Takımı Kaydet bonusu'))t=t.replace('Takımı Kaydet bonusu','Takımı Kaydet');if(t.includes('+1 puan yalnız bir kez eklenir'))t=t.replace('o hafta +1 puan yalnız bir kez eklenir.','değişiklikler maç haftası için geçerli hale gelir.');node.nodeValue=t;}
  }

  function addNav(){
    addStyles();
    const nav=$('#mainNav');if(!nav||nav.querySelector('[data-sn-extra]'))return;
    const divider=document.createElement('div');divider.style.cssText='height:1px;background:rgba(255,255,255,.1);margin:8px 4px';nav.append(divider);
    const items=[['points','◉','Puanlarım'],['cups','🏆','Kupalar'],['help','?','Yardım & Kurallar']];
    for(const [id,icon,label] of items){const b=document.createElement('button');b.className='sn-extra-btn';b.dataset.snExtra=id;b.innerHTML=`<span>${icon}</span><span>${label}</span>`;b.addEventListener('click',()=>openPanel(id));nav.append(b);}
  }

  function addTopButtons(){
    const top=$('.top-actions');if(!top||$('#snNotifButton'))return;
    const free=document.createElement('span');free.className='sn-free-badge';free.textContent='Tamamen ücretsiz';top.prepend(free);
    const b=document.createElement('button');b.id='snNotifButton';b.className='icon-btn sn-bell';b.setAttribute('aria-label','Bildirimler');b.textContent='🔔';b.addEventListener('click',()=>openPanel('notifications'));top.append(b);updateBell();
    const s=document.createElement('button');s.id='snSettingsButton';s.className='icon-btn';s.setAttribute('aria-label','Profil ve ayarlar');s.textContent='⚙';s.addEventListener('click',()=>openPanel('settings'));top.append(s);
  }
  function updateBell(){const b=$('#snNotifButton');if(!b||!state)return;const unread=(state.notifications||[]).filter(n=>!n.read).length;let c=$('.sn-count',b);if(unread&&!c){c=document.createElement('span');c.className='sn-count';b.append(c);}if(c){c.textContent=unread;c.style.display=unread?'grid':'none';}}

  function modal(title,html,onReady){
    const root=$('#modalRoot')||document.body;root.innerHTML=`<div class="sn-modal-backdrop" role="dialog" aria-modal="true"><section class="sn-modal"><header class="sn-modal-head"><h3>${esc(title)}</h3><button class="sn-close" aria-label="Kapat">×</button></header><div class="sn-modal-body">${html}</div></section></div>`;
    $('.sn-close',root)?.addEventListener('click',()=>root.innerHTML='');$('.sn-modal-backdrop',root)?.addEventListener('click',e=>{if(e.target.classList.contains('sn-modal-backdrop'))root.innerHTML='';});onReady?.(root);
  }

  function pointsPanel(){
    const h=state?.history||[],u=state?.user||{};
    const rows=h.length?h.map(x=>`<tr><td>${x.week}. Hafta</td><td>${Number(x.teamPoints||0)}</td><td>${Number(x.nostradamusPoints||0)}</td><td>${Number(x.totalApplied||0)}</td><td>${esc(x.status||'Bekliyor')}</td></tr>`).join(''):'<tr><td colspan="5">Henüz kesinleşmiş hafta geçmişi yok.</td></tr>';
    modal('Puanlarım',`<div class="sn-grid"><div class="sn-box"><small>TOPLAM PUAN</small><strong>${Number(u.points||0)}</strong></div><div class="sn-box"><small>HAFTALIK PUAN</small><strong>${Number(u.gameweekPoints||0)}</strong></div><div class="sn-box"><small>PUAN DURUMU</small><strong>${esc(state.scoringStatus||'Bekliyor')}</strong></div></div><h4>Maç haftası geçmişi</h4><div style="overflow:auto"><table class="sn-table"><thead><tr><th>Hafta</th><th>Takım</th><th>Nostradamus</th><th>Toplam</th><th>Durum</th></tr></thead><tbody>${rows}</tbody></table></div><p class="sn-note">“Canlı” puanlar resmî maç verisi işlenirken değişebilir. “Eklendi” durumu haftanın sonuçlarının işlendiğini gösterir.</p>`);
  }

  function cupsPanel(){
    const cups=state?.cups||[];
    modal('Kupalar',cups.map(c=>`<div class="sn-box" style="margin-bottom:12px"><strong>${esc(c.name)}</strong><small>${Number(c.memberCount||0)} menajer · eleme usulü</small><div style="margin-top:10px">${(c.pairings||[]).slice(0,12).map(p=>`<div class="sn-pair"><span>${esc(p.homeId||'—')}</span><b>${p.bye?'BAY':'vs'}</b><span>${esc(p.awayId||'—')}</span></div>`).join('')||'<small>Henüz eşleşme yok.</small>'}</div></div>`).join('')||'<p>Henüz kupa verisi yok.</p>');
  }

  function notificationsPanel(){
    const list=state?.notifications||[];
    modal('Bildirimler',`<div class="sn-row"><button id="snBrowserNotif" class="sn-btn">Tarayıcı bildirimlerini aç</button><button id="snReadAll" class="sn-btn alt">Tümünü okundu yap</button></div><div style="margin-top:16px">${list.map(n=>`<div class="sn-box" style="margin-bottom:10px;opacity:${n.read?.72:1}"><strong>${esc(n.title)}</strong><small>${esc(n.message)}</small></div>`).join('')||'<p class="sn-note">Yeni bildirimin yok.</p>'}</div>`,root=>{
      $('#snBrowserNotif',root)?.addEventListener('click',async()=>{if(!('Notification'in window))return toast('Bu tarayıcı bildirimleri desteklemiyor.');const p=await Notification.requestPermission();toast(p==='granted'?'Tarayıcı bildirimleri açıldı.':'Bildirim izni verilmedi.');});
      $('#snReadAll',root)?.addEventListener('click',async()=>{await api('/api/notifications/read',{method:'POST',body:'{}'});await refresh();toast('Bildirimler okundu.');openPanel('notifications');});
    });
  }

  function settingsPanel(){
    const u=state?.user||{},clubs=[...new Set((state?.players||[]).map(p=>p.club))].sort((a,b)=>a.localeCompare(b,'tr'));
    const deletion=u.deletionScheduledAt?`<p class="sn-note sn-danger-note">Hesap silme talebi aktif. Planlanan silme: ${new Intl.DateTimeFormat('tr-TR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(u.deletionScheduledAt))}</p><button id="snCancelDelete" class="sn-btn alt">Silme Talebini İptal Et</button>`:`<button id="snDeleteAccount" class="sn-btn danger">Hesabı Silme Talebi Oluştur</button>`;
    modal('Profil & Ayarlar',`<form id="snProfileForm" class="sn-form"><label>Menajer adı<input name="displayName" maxlength="32" value="${esc(u.displayName||'')}"></label><label>Takım adı<input name="teamName" maxlength="40" value="${esc(u.teamName||'')}"></label><label>Ülke<input name="country" maxlength="48" value="${esc(u.country||'Türkiye')}"></label><label>Favori kulüp<select name="favoriteClub"><option value="">Seçilmedi</option>${clubs.map(c=>`<option ${u.favoriteClub===c?'selected':''}>${esc(c)}</option>`).join('')}</select></label><button class="sn-btn">Profili Kaydet</button></form><hr style="margin:22px 0;border:0;border-top:1px solid #dde6e1"><h4>Bildirim tercihleri</h4><div class="sn-row"><label><input type="checkbox" id="snPrefDeadline" ${u.notificationPrefs?.deadline===false?'':'checked'}> Süre sonu</label><label><input type="checkbox" id="snPrefPoints" ${u.notificationPrefs?.points===false?'':'checked'}> Puan güncellemeleri</label><label><input type="checkbox" id="snPrefSystem" ${u.notificationPrefs?.system===false?'':'checked'}> Sistem</label><button id="snSavePrefs" class="sn-btn alt">Tercihleri Kaydet</button></div><hr style="margin:22px 0;border:0;border-top:1px solid #dde6e1"><h4>Hesap silme</h4><p>Silme talebinden sonra 30 gün boyunca geri alabilirsin. Süre dolduğunda bu kullanıcıya ait takım ve yarışma verileri temizlenir.</p>${deletion}`,root=>{
      $('#snProfileForm',root)?.addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);await api('/api/profile',{method:'POST',body:JSON.stringify(Object.fromEntries(fd))});await refresh();toast('Profil kaydedildi.');});
      $('#snSavePrefs',root)?.addEventListener('click',async()=>{await api('/api/notifications/preferences',{method:'POST',body:JSON.stringify({deadline:$('#snPrefDeadline',root).checked,points:$('#snPrefPoints',root).checked,system:$('#snPrefSystem',root).checked})});await refresh();toast('Bildirim tercihleri kaydedildi.');});
      $('#snDeleteAccount',root)?.addEventListener('click',async()=>{if(!confirm('Hesap silme talebi oluşturulsun mu? 30 gün boyunca iptal edebilirsin.'))return;await api('/api/account/delete-request',{method:'POST',body:'{}'});await refresh();openPanel('settings');});
      $('#snCancelDelete',root)?.addEventListener('click',async()=>{await api('/api/account/delete-cancel',{method:'POST',body:'{}'});await refresh();toast('Hesap silme talebi iptal edildi.');openPanel('settings');});
    });
  }

  function helpPanel(){
    modal('Yardım & Oyun Kuralları',`<div class="sn-help"><span class="sn-free-badge">SahaNova'da ödeme yok</span><h4>Kadro</h4><p>100M fantezi bütçesiyle 15 oyuncu seçilir: 2 kaleci, 5 defans, 5 orta saha, 3 forvet. Aynı gerçek kulüpten en fazla 3 oyuncu alınabilir. İlk 11 ve dört yedek ayrı belirlenir.</p><h4>Diziliş ve yedekler</h4><p>3-5-2, 3-4-3, 4-4-2, 4-3-3, 4-5-1, 5-4-1, 5-3-2 ve 5-2-3 desteklenir. Oynamayan ilk 11 oyuncuları, yedek sırası ve geçerli formasyon korunarak otomatik değiştirilebilir.</p><h4>Kaptan</h4><p>Normal kaptan 2× puan alır. Kaptan hiç süre almaz ve yardımcı kaptan oynarsa kaptan çarpanı yardımcı kaptana geçer.</p><h4>Transfer</h4><p>Transfer sayısı sınırsızdır ve puan kesintisi yoktur. Bütçe, mevki ve kulüp limiti korunur.</p><h4>Menajer kartları</h4><p>Tripleks Kaptan, Dört Dörtlük Kaptan, Tüm Takım Sahaya, Hücum ve Limitsiz Bütçe kartlarının tamamı ücretsizdir. Her kart bir devrede iki, sezon boyunca en fazla dört kez kullanılabilir. Aynı haftada yalnız bir kart etkinleştirilebilir.</p><h4>Nostradamus</h4><p>Haftadaki tüm maçlara tahmin girersen +1 puan, doğru bildiğin her maç sonucu için +1 puan daha kazanırsın. Yanlış tahmin eksi puan getirmez.</p><h4>Süre sonu</h4><p>Haftanın ilk maçından bir saat önce Takımım, Transferler ve Nostradamus o hafta için kilitlenir. Daha sonraki kadro değişiklikleri bir sonraki haftaya hazırlanır.</p><h4>Puanlama</h4><ul><li>60 dakikaya kadar süre alan: 1 puan; 60 dakikadan fazla: 2 puan.</li><li>Gol: kaleci 10, defans 6, orta saha 5, forvet 4.</li><li>Asist +3; kaleci/defans gol yememe +4, orta saha +1 (en az 60 dk).</li><li>Kalecide her 3 kurtarış +1, penaltı kurtarışı +5.</li><li>Penaltı kaçırma -2, sarı -1, kırmızı -3, kendi kalesine gol -2.</li></ul><h4>Destek</h4><form id="snSupportForm" class="sn-form"><select name="category"><option value="teknik">Teknik sorun</option><option value="puan">Puanlama sorunu</option><option value="takim">Takım kaydetme</option><option value="lig">Lig/Kupa</option><option value="diger">Diğer</option></select><input name="email" type="email" placeholder="E-posta (isteğe bağlı)"><textarea name="description" required placeholder="Sorunu, maç haftasını ve gerekiyorsa hata ayrıntısını yaz..."></textarea><button class="sn-btn">Destek Talebi Gönder</button></form><h4>Gizlilik</h4><p>Bu web oyunu ödeme veya satın alma akışı içermez. Hesap silme talebi 30 günlük geri alma süresiyle yönetilir. Destek için gönderilen bilgiler yalnızca talebi çözmek amacıyla saklanır.</p></div>`,root=>{$('#snSupportForm',root)?.addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.currentTarget);try{await api('/api/support',{method:'POST',body:JSON.stringify(Object.fromEntries(fd))});e.currentTarget.reset();toast('Destek talebi kaydedildi.');}catch(err){toast(err.message);}});});
  }

  function openPanel(id){if(!state)return refresh().then(()=>openPanel(id));if(id==='points')pointsPanel();else if(id==='cups')cupsPanel();else if(id==='notifications')notificationsPanel();else if(id==='settings')settingsPanel();else helpPanel();}

  function deadlineNotification(){
    if(!state?.deadline||!('Notification'in window)||Notification.permission!=='granted')return;
    const ms=new Date(state.deadline).getTime()-Date.now();if(ms>0&&ms<=60*60*1000){const key=`sn-deadline-${state.user?.activeWeek}`;if(localStorage.getItem(key))return;localStorage.setItem(key,'1');new Notification('SahaNova: Süre sonu yaklaşıyor',{body:`${state.user?.activeWeek}. hafta kadronu ve tahminlerini kaydet.`});}
  }

  const obs=new MutationObserver(()=>{patchCommercialText();addNav();addTopButtons();});obs.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('load',refresh);refresh();setInterval(refresh,60000);
})();
