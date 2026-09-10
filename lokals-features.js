/*
 * lokals-features.js — sursa centrala de gating pe planuri (Gratuit / Essential).
 *
 * Tot ce e blocat/deblocat pe fiecare plan traieste in tabela Supabase `features`
 * (coloana tier_minim), NU in codul acestui fisier sau al paginilor care il folosesc.
 *
 * Ca sa muti o functionalitate din Essential in Gratuit (sau invers):
 *   update public.features set tier_minim = 'gratuit' where cheie = 'wifi';
 * Nu trebuie atinsa nicio pagina — la urmatoarea incarcare, gating-ul se actualizeaza singur.
 *
 * Folosire intr-o pagina:
 *   <script src="lokals-features.js"></script>
 *   ...
 *   const features = await LokalsFeatures.load(SUPABASE_URL, SUPABASE_KEY);
 *   if (!LokalsFeatures.unlocked(features, operator.tier, 'wifi')) {
 *     LokalsFeatures.lockCard(document.getElementById('card-wifi'));
 *   }
 */
(function (global) {
  const TIER_ORDER = { gratuit: 0, essential: 1 };

  let cache = null;
  let pending = null;

  async function load(supabaseUrl, supabaseKey) {
    if (cache) return cache;
    if (pending) return pending;
    pending = fetch(`${supabaseUrl}/rest/v1/features?select=cheie,tier_minim,nume`, {
      headers: { apikey: supabaseKey },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((rows) => {
        cache = {};
        rows.forEach((r) => { cache[r.cheie] = r; });
        return cache;
      })
      .catch(() => {
        cache = {};
        return cache;
      });
    return pending;
  }

  // O functionalitate care nu apare in tabela `features` e considerata mereu
  // disponibila (fail-open) — mai sigur decat sa blocam din greseala ceva
  // nou-adaugat pe care am uitat sa-l inregistram.
  function unlocked(featuresMap, operatorTier, cheie) {
    const feature = featuresMap && featuresMap[cheie];
    if (!feature) return true;
    const need = TIER_ORDER[feature.tier_minim] ?? 1;
    const have = TIER_ORDER[operatorTier] ?? 0;
    return have >= need;
  }

  let styleInjected = false;
  function injectStyle() {
    if (styleInjected || document.getElementById('lokals-lock-style')) return;
    styleInjected = true;
    const style = document.createElement('style');
    style.id = 'lokals-lock-style';
    style.textContent = `
      .lokals-lock-overlay{position:absolute; inset:0; background:rgba(247,242,232,0.9); border-radius:16px;
        display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; text-align:center; padding:18px; z-index:3;}
      .lokals-lock-badge{display:flex; align-items:center; gap:6px; font-size:11.5px; font-weight:700; color:#8F6222;
        background:var(--gold-soft,#E8CE9E); padding:5px 12px; border-radius:999px; font-family:inherit;}
      .lokals-lock-msg{font-size:12.5px; color:var(--ink-soft,#5B6459); max-width:280px; line-height:1.5; margin:0;}
      .lokals-lock-cta{background:var(--teal-deep,#10302B); color:#fff; font-size:13px; font-weight:700; padding:10px 18px;
        border-radius:999px; text-decoration:none; font-family:inherit; white-space:nowrap;}
      .lokals-lock-cta:hover{opacity:0.92;}
    `;
    document.head.appendChild(style);
  }

  // Blocheaza vizual un card: dezactiveaza toate campurile din interior si adauga
  // un overlay cu explicatie + link catre pagina de preturi.
  function lockCard(cardEl, opts) {
    if (!cardEl || cardEl.querySelector('.lokals-lock-overlay')) return;
    opts = opts || {};
    injectStyle();
    const computedPosition = getComputedStyle(cardEl).position;
    if (computedPosition === 'static') cardEl.style.position = 'relative';
    cardEl.querySelectorAll('input, textarea, select, button').forEach((el) => {
      el.disabled = true;
    });
    const overlay = document.createElement('div');
    overlay.className = 'lokals-lock-overlay';
    overlay.innerHTML = `
      <div class="lokals-lock-badge">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8F6222" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11v-4a4 4 0 0 1 8 0v4"/></svg>
        <span>Doar în Essential</span>
      </div>
      ${opts.mesaj ? `<p class="lokals-lock-msg">${opts.mesaj}</p>` : ''}
      <a class="lokals-lock-cta" href="${opts.href || 'preturi.html'}">Deblochează cu Essential →</a>
    `;
    cardEl.appendChild(overlay);
  }

  // Elimina blocarea (folosit rar — ex. daca gazda tocmai a fost activata pe Essential
  // fara reincarcarea paginii).
  function unlockCard(cardEl) {
    if (!cardEl) return;
    const overlay = cardEl.querySelector('.lokals-lock-overlay');
    if (overlay) overlay.remove();
    cardEl.querySelectorAll('input, textarea, select, button').forEach((el) => {
      el.disabled = false;
    });
  }

  global.LokalsFeatures = { load, unlocked, lockCard, unlockCard };
})(window);
