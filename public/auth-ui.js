(() => {
  'use strict';
  let auth={authenticated:false,account:null};
  const $=(s,r=document)=>r.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function api(url,options={}){const r=await fetch(url,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}}),b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||'İşlem tamamlanamadı.');return b;}
  function toast(m){const t=$('#toast');if(t){t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2800);}else console.log(m);}
  function modal(title,html,onReady){const root=$('#modalRoot')||document.body;root.innerHTML=`<div class="sn-modal-backdrop" role="dialog" aria-modal="true"><section class="sn-modal" style="width:min(560px,100%)"><header class="sn-modal-head"><h3>${esc(title)}</h3><button class="sn-close" aria-label="Kapat">×</button></header><div class="sn-modal-body">${html}</div></section></div>`;$('.sn-close',root)?.addEventListener('click',()=>root.innerHTML='');$('.sn-modal-backdrop',root)?.addEventListener('click',e=>{if(e.target.classList.contains('sn-modal-backdrop'))root.innerHTML='';});onReady?.(root);}
  async function load(){try{auth=await api('/api/auth/me');renderButton();}catch(e){console.warn(e);}}
  function renderButton(){
    const top=$('.top-actions');if(!top)return;
    let b=$('#snAuthButton');
    if(!b){b=document.createElement('button');b.id='snAuthButton';b.className='btn btn-ghost';b.style.cssText='padding:9px 12px;white-space:nowrap';b.addEventListener('click',openAccount);top.append(b);}
    const label=auth.authenticated?'Hesabım':'Giriş / Kayıt';
    const aria=auth.authenticated?'Hesabım':'Giriş yap veya kayıt ol';
    if(b.textContent!==label)b.textContent=label;
    if(b.getAttribute('aria-label')!==aria)b.setAttribute('aria-label',aria);
  }
  function openAccount(){auth.authenticated?accountPanel():authPanel();}
  function authPanel(){modal('Giriş / Kayıt',`<div class="sn-grid" style="grid-template-columns:1fr 1fr"><form id="snLogin" class="sn-form sn-box"><strong>Giriş Yap</strong><label>E-posta<input name="email" type="email" autocomplete="email" required></label><label>Parola<input name="password" type="password" autocomplete="current-password" required></label><button class="sn-btn">Giriş Yap</button><small>Şifremi unuttum e-postası, güvenli bir e-posta sağlayıcısı bağlanana kadar etkin değildir.</small></form><form id="snRegister" class="sn-form sn-box"><strong>Hesap Oluştur</strong><label>Menajer adı<input name="displayName" maxlength="32" autocomplete="name" required></label><label>E-posta<input name="email" type="email" autocomplete="email" required></label><label>Parola<input name="password" type="password" minlength="10" autocomplete="new-password" required></label><small>En az 10 karakter; harf ve rakam içermeli.</small><label style="display:flex;gap:8px;align-items:flex-start"><input name="acceptTerms" type="checkbox" style="width:auto;margin-top:4px" required><span>SahaNova kullanıcı koşullarını ve gizlilik açıklamasını kabul ediyorum.</span></label><button class="sn-btn">Ücretsiz Kayıt Ol</button></form></div><p class="sn-note" style="margin-top:14px">Hesap sistemi ücretsizdir. Ödeme bilgisi istenmez. E-posta doğrulama ve e-postayla parola sıfırlama, gerçek bir mail gönderim servisi bağlanmadan taklit edilmez.</p>`,root=>{
      $('#snLogin',root)?.addEventListener('submit',async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));try{await api('/api/auth/login',{method:'POST',body:JSON.stringify(d)});toast('Giriş başarılı.');location.reload();}catch(err){toast(err.message);}});
      $('#snRegister',root)?.addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.currentTarget),d=Object.fromEntries(fd);d.acceptTerms=fd.get('acceptTerms')==='on';try{const r=await api('/api/auth/register',{method:'POST',body:JSON.stringify(d)});await api('/api/profile',{method:'POST',body:JSON.stringify({displayName:d.displayName,teamName:`${d.displayName} XI`})});toast(r.message||'Hesap oluşturuldu.');location.reload();}catch(err){toast(err.message);}});
    });}
  function accountPanel(){const a=auth.account||{};modal('Hesabım',`<div class="sn-box"><small>E-POSTA</small><strong>${esc(a.email||'')}</strong><p>${a.emailVerified?'E-posta doğrulandı.':'E-posta doğrulama sağlayıcısı bağlı değil; oyun hesabın yine kullanılabilir.'}</p></div><form id="snPassword" class="sn-form" style="margin-top:16px"><h4>Parola değiştir</h4><label>Mevcut parola<input name="currentPassword" type="password" autocomplete="current-password" required></label><label>Yeni parola<input name="newPassword" type="password" minlength="10" autocomplete="new-password" required></label><button class="sn-btn">Parolayı Değiştir</button></form><div class="sn-row" style="margin-top:18px"><button id="snLogout" class="sn-btn alt">Çıkış Yap</button></div>`,root=>{
      $('#snPassword',root)?.addEventListener('submit',async e=>{e.preventDefault();try{await api('/api/auth/change-password',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))) });toast('Parola değiştirildi.');e.currentTarget.reset();}catch(err){toast(err.message);}});
      $('#snLogout',root)?.addEventListener('click',async()=>{try{await api('/api/auth/logout',{method:'POST',body:'{}'});toast('Çıkış yapıldı.');location.reload();}catch(err){toast(err.message);}});
    });}
  function boot(){renderButton();load();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
