(() => {
  'use strict';
  const KEY='sahanova-essential-cookie-notice-v1';
  if(localStorage.getItem(KEY))return;
  const style=document.createElement('style');
  style.textContent=`.sn-cookie{position:fixed;z-index:12000;left:18px;right:18px;bottom:18px;max-width:760px;margin:auto;background:#10251c;color:#f4fbf7;border:1px solid rgba(255,255,255,.13);border-radius:18px;padding:16px 18px;box-shadow:0 18px 55px rgba(0,0,0,.35);display:flex;gap:16px;align-items:center;justify-content:space-between}.sn-cookie p{margin:0;font-size:13px;line-height:1.45}.sn-cookie-actions{display:flex;gap:8px;flex-shrink:0}.sn-cookie button{border:0;border-radius:10px;padding:9px 12px;font-weight:800;cursor:pointer}.sn-cookie-ok{background:#b9f24a;color:#18310d}.sn-cookie-info{background:rgba(255,255,255,.1);color:white}@media(max-width:650px){.sn-cookie{left:10px;right:10px;bottom:76px;align-items:stretch;flex-direction:column}.sn-cookie-actions{width:100%}.sn-cookie button{flex:1}}`;
  document.head.append(style);
  const box=document.createElement('aside');
  box.className='sn-cookie';box.setAttribute('aria-label','Çerez bilgilendirmesi');
  box.innerHTML=`<p><strong>Gerekli çerez bilgisi:</strong> SahaNova yalnızca giriş oturumunu güvenli şekilde sürdürmek için gerekli bir oturum çerezi kullanır. Reklam, ödeme veya davranışsal takip çerezi kullanmıyoruz.</p><div class="sn-cookie-actions"><button class="sn-cookie-info" type="button">Gizlilik</button><button class="sn-cookie-ok" type="button">Tamam</button></div>`;
  box.querySelector('.sn-cookie-ok').addEventListener('click',()=>{localStorage.setItem(KEY,'acknowledged');box.remove();});
  box.querySelector('.sn-cookie-info').addEventListener('click',()=>{const help=document.querySelector('[data-sn-extra="help"]');if(help)help.click();});
  document.body.append(box);
})();
