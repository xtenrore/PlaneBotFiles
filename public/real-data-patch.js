(() => {
  'use strict';

  // 2026/27 Süper Lig gerçek kulüp ve oyuncu görünüm katmanı.
  // Mevcut localStorage kadro kimliklerini korur; böylece kullanıcı ilerlemesi bozulmaz.
  const replacements = new Map([
    // Oyuncular — kaleciler
    ['Mert Kaya','Uğurcan Çakır'],
    ['Baran Aksoy','Ederson'],
    ['Eren Şahin','Alexander Nübel'],
    ['Deniz Yalçın','André Onana'],

    // Oyuncular — savunma
    ['Arda Demir','Davinson Sánchez'],
    ['Kerem Aydın','Milan Škriniar'],
    ['Onur Tekin','Emirhan Topçu'],
    ['Emir Koç','Stefan Savić'],
    ['Bora Güneş','Emin Bayram'],
    ['Can Kurt','Taha Altıkardeş'],
    ['Umut Polat','Joe Mendes'],
    ['Yiğit Öz','Adil Demirbağ'],
    ['Ali Çelik','Lumbardh Dellova'],
    ['Rüzgar Avcı','Anfernee Dijksteel'],

    // Oyuncular — orta saha
    ['Efe Yıldız','Lucas Torreira'],
    ['Atlas Arslan',"N'Golo Kanté"],
    ['Kaan Tunç','Orkun Kökçü'],
    ['Batuhan Işık','Fabinho'],
    ['Doruk Er','Abbosbek Fayzullaev'],
    ['Poyraz Dinç','Efkan Bekiroğlu'],
    ['Ömer Uslu','Carlo Holse'],
    ['Toprak Acar','Deniz Türüç'],
    ['Mete Kılıç','Qazim Laçi'],
    ['Cem Ekin','Haris Hajradinović'],
    ['Ayaz Karaca','Kacper Kozłowski'],

    // Oyuncular — forvet
    ['Sarp Yılmaz','Victor Osimhen'],
    ['Alp Çetin','Romelu Lukaku'],
    ['Berk Eren','Dušan Vlahović'],
    ['Ege Uçar','Mohamed Salah'],
    ['Tuna Özkan','Juan'],
    ['Kuzey Korkmaz','Cherif Ndiaye'],
    ['Ozan Keskin','Mame Baba Thiam'],
    ['Sinan Güler','Ahmed Abdullahi'],
    ['Çağan Taş','Sékou Koïta'],
    ['Levent Bozkurt','Eren Tozlu'],

    // 2026/27 Süper Lig'e göre kulüp düzeltmeleri
    ['Antalyaspor','Amed Sportif Faaliyetler'],
    ['Kayserispor','Arca Çorum FK'],
    ['Fatih Karagümrük','Erzurumspor FK'],
    ['Başakşehir','İstanbul Başakşehir FK'],
    ['Alanyaspor','Corendon Alanyaspor'],
    ['Konyaspor','Tümosan Konyaspor']
  ]);

  const exact = new Map([
    ['ANT','AMD'],
    ['KAY','ÇOR'],
    ['FKG','ERZ'],
    ['BFK','BFK'],
    ['ALA','ALA'],
    ['KON','KON']
  ]);

  const currentFixtures = [
    ['Kasımpaşa','Tümosan Konyaspor','18 Eyl Cuma · 20:00'],
    ['Arca Çorum FK','Corendon Alanyaspor','19 Eyl Cumartesi · 17:00'],
    ['Kocaelispor','Gaziantep FK','19 Eyl Cumartesi · 17:00'],
    ['Trabzonspor','Galatasaray','19 Eyl Cumartesi · 20:00'],
    ['İstanbul Başakşehir FK','Gençlerbirliği','19 Eyl Cumartesi · 20:00'],
    ['Fenerbahçe','Eyüpspor','20 Eyl Pazar · 17:00'],
    ['Erzurumspor FK','Samsunspor','20 Eyl Pazar · 17:00'],
    ['Amed Sportif Faaliyetler','Beşiktaş','20 Eyl Pazar · 20:00'],
    ['Göztepe','Çaykur Rizespor','20 Eyl Pazar · 20:00']
  ];

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function replaceText(text) {
    let out = text;
    for (const [from, to] of replacements) {
      if (out.includes(from)) out = out.split(from).join(to);
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

  function fixtureMarkup() {
    return currentFixtures.map(([home, away, time]) => `
      <article class="fixture real-fixture">
        <div class="home"><strong>${escapeHtml(home)}</strong><small>2026/27</small></div>
        <div><div class="score">– : –</div><small style="text-align:center">${escapeHtml(time)}</small></div>
        <div><strong>${escapeHtml(away)}</strong><small>Süper Lig</small></div>
      </article>`).join('');
  }

  function predictionMarkup() {
    return currentFixtures.map(([home, away], index) => {
      const id = `f${index + 1}`;
      return `<article class="prediction real-prediction">
        <div class="home"><strong>${escapeHtml(home)}</strong></div>
        <div class="score-inputs"><input class="input pred-home" data-fixture="${id}" type="number" min="0" max="9"><span>:</span><input class="input pred-away" data-fixture="${id}" type="number" min="0" max="9"></div>
        <div><strong>${escapeHtml(away)}</strong></div>
      </article>`;
    }).join('');
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

    const sideWeek = document.getElementById('sideWeek');
    if (sideWeek) sideWeek.textContent = '6';
    const eyebrow = document.getElementById('pageEyebrow');
    if (eyebrow && eyebrow.textContent.includes('MAÇ HAFTASI')) eyebrow.textContent = 'MAÇ HAFTASI 6';

    const title = document.getElementById('pageTitle')?.textContent?.trim();
    if (title === 'Fikstür') {
      const list = document.querySelector('.fixture-list');
      if (list && !list.dataset.real2026) {
        list.dataset.real2026 = '1';
        list.innerHTML = fixtureMarkup();
      }
      const chip = document.querySelector('.chip-row .chip.active');
      if (chip) chip.textContent = 'Hafta 6';
    }

    if (title === 'Nostradamus') {
      const grid = document.querySelector('.nostra-grid');
      if (grid && !grid.dataset.real2026) {
        grid.dataset.real2026 = '1';
        grid.innerHTML = predictionMarkup();
      }
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
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  document.addEventListener('click', schedule, true);
  document.addEventListener('input', schedule, true);
  window.addEventListener('load', schedule);
  schedule();
})();
