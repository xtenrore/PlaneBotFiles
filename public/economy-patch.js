(() => {
  'use strict';

  const rawFetch = window.fetch.bind(window);
  const million = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  let syncing = false;
  let lastState = null;

  function addStyles() {
    if (document.getElementById('snEconomyStyles')) return;
    const style = document.createElement('style');
    style.id = 'snEconomyStyles';
    style.textContent = `
      .economy-pill{display:flex;align-items:center;gap:10px;min-height:42px;padding:7px 13px;border:1px solid rgba(20,82,60,.18);border-radius:13px;background:#fff;color:#15382c;box-shadow:0 2px 10px rgba(20,65,49,.06);font:inherit}
      .economy-pill .economy-copy{display:grid;gap:1px;line-height:1.05;text-align:left}.economy-pill span{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#6c8178}.economy-pill strong{font-size:15px;font-weight:900;white-space:nowrap}.economy-pill em{font-size:10px;font-style:normal;color:#6c8178}
      .economy-pill.is-unlimited{border-color:rgba(18,125,77,.35);background:#eef9f3}.economy-pill.is-unlimited strong{font-size:18px}
      @media(max-width:760px){.economy-pill{padding:7px 9px;gap:6px}.economy-pill span,.economy-pill em{display:none}.economy-pill strong{font-size:13px}}
    `;
    document.head.append(style);
  }

  function ensurePill() {
    addStyles();
    const top = document.querySelector('.top-actions');
    if (!top) return null;
    let pill = document.getElementById('topBudget');
    if (!pill) {
      pill = document.createElement('div');
      pill.id = 'topBudget';
      pill.className = 'economy-pill';
      pill.setAttribute('role', 'status');
      pill.setAttribute('aria-live', 'polite');
      pill.innerHTML = '<div class="economy-copy"><span>Kalan bütçe</span><strong>₺100,0M</strong><em>Başlangıç ₺100M</em></div>';
      const points = top.querySelector('.points-pill');
      top.insertBefore(pill, points || top.firstChild);
    }
    return pill;
  }

  function renderEconomy(state) {
    if (!state || !state.user) return;
    lastState = state;
    const pill = ensurePill();
    if (!pill) return;

    const unlimited = state.activeCard === 'unlimitedBudget';
    const bank = Number(state.user.bank ?? state.user.budget ?? 100);
    const startBudget = Number(state.footballData?.startingBudgetMillionTL ?? state.user.budget ?? 100);
    const amount = pill.querySelector('strong');
    const foot = pill.querySelector('em');

    pill.classList.toggle('is-unlimited', unlimited);
    amount.textContent = unlimited ? '∞ Limitsiz' : `₺${million.format(bank)}M`;
    foot.textContent = unlimited ? 'Limitsiz Bütçe aktif' : `Başlangıç ₺${million.format(startBudget)}M`;
    pill.title = unlimited
      ? 'Limitsiz Bütçe kartı aktif: bu maç haftasında kadro bütçe sınırı uygulanmaz.'
      : `Bu maç haftası için kalan sanal bütçe. Başlangıç bütçesi ₺${million.format(startBudget)} milyon.`;
  }

  async function syncEconomy() {
    if (syncing) return;
    syncing = true;
    try {
      const res = await rawFetch('/api/state?free=1', { cache: 'no-store' });
      if (!res.ok) return;
      renderEconomy(await res.json());
    } catch (err) {
      console.warn('Bütçe bilgisi güncellenemedi:', err);
      if (lastState) renderEconomy(lastState);
    } finally {
      syncing = false;
    }
  }

  // Keep the balance in sync immediately after economy-changing actions.
  window.fetch = async (...args) => {
    const response = await rawFetch(...args);
    try {
      const request = args[0];
      const url = typeof request === 'string' ? request : request?.url || '';
      const method = String(args[1]?.method || request?.method || 'GET').toUpperCase();
      if (method !== 'GET' && /^\/api\/(squad|transfer|cards\/use)/.test(url)) {
        setTimeout(syncEconomy, 0);
      }
    } catch (_) {}
    return response;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncEconomy, { once: true });
  } else {
    syncEconomy();
  }
  window.addEventListener('focus', syncEconomy);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) syncEconomy(); });
})();
