(() => {
  'use strict';

  // 2026/27 Süper Lig gerçek kulüp/oyuncu görünüm katmanı.
  // Fikstür, skor, dakika ve maç durumu artık hard-code edilmez. Varsa
  // /api/live-fixtures üzerinden doğrulanmış maç verisi kullanılır; aksi halde
  // ana uygulamanın backend verisi olduğu gibi bırakılır.
  const replacements = new Map([
    ['Mert Kaya','Uğurcan Çakır'], ['Baran Aksoy','Ederson'], ['Eren Şahin','Alexander Nübel'], ['Deniz Yalçın','André Onana'],
    ['Arda Demir','Davinson Sánchez'], ['Kerem Aydın','Milan Škriniar'], ['Onur Tekin','Emirhan Topçu'], ['Emir Koç','Stefan Savić'],
    ['Bora Güneş','Emin Bayram'], ['Can Kurt','Taha Altıkardeş'], ['Umut Polat','Joe Mendes'], ['Yiğit Öz','Adil Demirbağ'],
    ['Ali Çelik','Lumbardh Dellova'], ['Rüzgar Avcı','Anfernee Dijksteel'],
    ['Efe Yıldız','Lucas Torreira'], ['Atlas Arslan',"N'Golo Kanté"], ['Kaan Tunç','Orkun Kökçü'], ['Batuhan Işık','Fabinho'],
    ['Doruk Er','Abbosbek Fayzullaev'], ['Poyraz Dinç','Efkan Bekiroğlu'], ['Ömer Uslu','Carlo Holse'], ['Toprak Acar','Deniz Türüç'],
    ['Mete Kılıç','Qazim Laçi'], ['Cem Ekin','Haris Hajradinović'], ['Ayaz Karaca','Kacper Kozłowski'],
    ['Sarp Yılmaz','Victor Osimhen'], ['Alp Çetin','Romelu Lukaku'], ['Berk Eren','Dušan Vlahović'], ['Ege Uçar','Mohamed Salah'],
    ['Tuna Özkan','Juan'], ['Kuzey Korkmaz','Cherif Ndiaye'], ['Ozan Keskin','Mame Baba Thiam'], ['Sinan Güler','Ahmed Abdullahi'],
    ['Çağan Taş','Sékou Koïta'], ['Levent Bozkurt','Eren Tozlu'],
    ['Antalyaspor','Amed Sportif Faaliyetler'], ['Kayserispor','Arca Çorum FK'], ['Fatih Karagümrük','Erzurumspor FK'],
    ['Başakşehir','İstanbul Başakşehir FK'], ['Alanyaspor','Corendon Alanyaspor'], ['Konyaspor','Tümosan Konyaspor']
  ]);

  const exact = new Map([['ANT','AMD'],['KAY','ÇOR'],['FKG','ERZ'],['BFK','BFK'],['ALA','ALA'],['KON','KON']]);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let liveState = { configured:false, fixtures:[], fetchedAt:null, stale:false };
  let liveRequest = null;
  let lastLiveFetch = 0;

  function replaceText(text) {
    let out = text;
    for (const [from, to] of replacements) {
      if (out.includes(from) && !out.includes(to)) out = out.split(from).join(to);
    }
    const trimmed = out.trim();
    if (exact.has(trimmed)) {
      const before = out.slice(0, out.indexOf(trimmed));
      const after = out.slice(out.indexOf(trimmed) + trimmed.length);
      out = before + exact.get(trimmed) + after;
    }
    return out;
  }

  function walkText(root) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || ['SCRIPT','STYLE','TEXTAREA'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const next = replaceText(node.nodeValue || '');
      if (next !== node.nodeValue) node.nodeValue = next;
    }
  }

  function statusLabel(fixture) {
    if (fixture.status === 'CANLI') return fixture.minute ? `${fixture.minute}' · CANLI` : 'CANLI';
    if (fixture.status === 'BİTTİ') return 'BİTTİ';
    if (fixture.status && fixture.status !== 'PROGRAM') return fixture.status;
    if (!fixture.kickoff) return 'PROGRAM';
    const d = new Date(fixture.kickoff);
    if (Number.isNaN(d.getTime())) return 'PROGRAM';
    return new Intl.DateTimeFormat('tr-TR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }).format(d);
  }

  function scoreLabel(fixture) {
    const h = fixture.homeScore;
    const a = fixture.awayScore;
    return Number.isFinite(Number(h)) && Number.isFinite(Number(a)) ? `${Number(h)} : ${Number(a)}` : '– : –';
  }

  function liveFixtureMarkup(fixtures) {
    return fixtures.map(f => `
      <article class="fixture real-fixture" data-live-fixture="${escapeHtml(f.id)}">
        <div class="home"><strong>${escapeHtml(f.home)}</strong><small>2026/27</small></div>
        <div><div class="score">${escapeHtml(scoreLabel(f))}</div><small style="text-align:center">${escapeHtml(statusLabel(f))}</small></div>
        <div><strong>${escapeHtml(f.away)}</strong><small>Süper Lig</small></div>
      </article>`).join('');
  }

  function addLiveBadge(list) {
    let badge = document.querySelector('.live-fixture-source');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'live-fixture-source badge';
      badge.style.marginBottom = '10px';
      list.parentElement?.insertBefore(badge, list);
    }
    if (liveState.stale) {
      badge.textContent = 'Canlı veri geçici olarak güncellenemedi · son doğrulanmış veri gösteriliyor';
    } else if (liveState.fetchedAt) {
      const t = new Date(liveState.fetchedAt);
      badge.textContent = `Canlı maç verisi · ${new Intl.DateTimeFormat('tr-TR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(t)}`;
    } else {
      badge.textContent = 'Canlı maç verisi';
    }
  }

  async function refreshLiveFixtures(force=false) {
    if (liveRequest) return liveRequest;
    if (!force && Date.now() - lastLiveFetch < 20000) return liveState;
    lastLiveFetch = Date.now();
    liveRequest = fetch('/api/live-fixtures', { cache:'no-store' })
      .then(async res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.ok) liveState = data;
        return liveState;
      })
      .catch(() => liveState)
      .finally(() => { liveRequest = null; schedule(); });
    return liveRequest;
  }

  function addVerifiedBadge() {
    const hero = document.querySelector('.hero-card');
    if (!hero || hero.querySelector('.real-data-badge')) return;
    const badge = document.createElement('div');
    badge.className = 'real-data-badge badge';
    badge.textContent = '2026/27 · Güncel Süper Lig kadroları';
    badge.style.marginBottom = '10px';
    hero.prepend(badge);
  }

  function patchCurrentView() {
    walkText(document.body);
    const title = document.getElementById('pageTitle')?.textContent?.trim();

    if (title === 'Fikstür') {
      const list = document.querySelector('.fixture-list');
      if (list && liveState.configured && Array.isArray(liveState.fixtures) && liveState.fixtures.length) {
        const signature = JSON.stringify(liveState.fixtures.map(f => [f.id,f.status,f.homeScore,f.awayScore,f.minute,f.kickoff]));
        if (list.dataset.liveSignature !== signature) {
          list.dataset.liveSignature = signature;
          list.innerHTML = liveFixtureMarkup(liveState.fixtures);
        }
        addLiveBadge(list);
      }
      refreshLiveFixtures(false);
    }

    if (title === 'Genel Bakış') addVerifiedBadge();
  }

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      patchCurrentView();
    });
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList:true, subtree:true, characterData:true });
  document.addEventListener('click', schedule, true);
  window.addEventListener('focus', () => refreshLiveFixtures(true));
  window.addEventListener('load', () => { refreshLiveFixtures(true); schedule(); });
  setInterval(() => { if (!document.hidden) refreshLiveFixtures(true); }, 30000);
  schedule();
})();
