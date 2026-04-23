/* =============================================
   EL ESTADERO — menu.js v5
   Fixes: Android touch on <a> links, Safari iOS,
   video autoplay, fallbacks, cross-browser
   ============================================= */

document.addEventListener('DOMContentLoaded', async () => {

  // ══════════════════════════════════════════════
  // UTILIDAD — soporte touch + click en todos
  // los navegadores incluyendo Safari iOS
  //
  // IMPORTANTE: No usar en elementos <a> ni en
  // contenedores que los contengan — Android
  // bloquea la navegación nativa si se usa
  // preventDefault() en touchend sobre un padre.
  // ══════════════════════════════════════════════

  function addTapListener(el, fn) {
    if (!el) return;
    // Si es un <a>, solo usar click — el browser lo maneja nativamente
    if (el.tagName === 'A') {
      el.addEventListener('click', fn);
      return;
    }
    let touchMoved = false;
    el.addEventListener('touchstart', () => { touchMoved = false; }, { passive: true });
    el.addEventListener('touchmove',  () => { touchMoved = true;  }, { passive: true });
    el.addEventListener('touchend', (e) => {
      if (!touchMoved) { e.preventDefault(); fn(e); }
    });
    el.addEventListener('click', fn);
  }

  // ══════════════════════════════════════════════
  // BLOQUE 1 — Funciona SIEMPRE, antes del fetch
  // ══════════════════════════════════════════════

  // ── Intro ─────────────────────────────────────
  const intro      = document.getElementById('intro');
  const app        = document.getElementById('app');
  const introVideo = document.getElementById('intro-video');

  let revealed = false;
  function revealApp() {
    if (revealed) return;
    revealed = true;
    intro.classList.add('hidden');
    app.classList.add('visible');
  }

  addTapListener(intro, revealApp);

  if (introVideo) {
    introVideo.muted       = true;
    introVideo.playsInline = true;

    introVideo.addEventListener('ended', revealApp);

    const playPromise = introVideo.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => { revealApp(); });
    }

    setTimeout(revealApp, 15000);
  } else {
    setTimeout(revealApp, 4000);
  }

  // ── Nav brand — reinicia el intro ─────────────
  const navBrand = document.getElementById('nav-brand-btn');
  addTapListener(navBrand, () => {
    revealed = false;
    app.classList.remove('visible');
    intro.classList.remove('hidden');
    if (introVideo) {
      introVideo.currentTime = 0;
      introVideo.play().catch(() => {});
    }
  });

  // ── Drawer ────────────────────────────────────
  const drawer     = document.getElementById('side-drawer');
  const dOverlay   = document.getElementById('drawer-overlay');
  const menuToggle = document.getElementById('menu-toggle');

  function openDrawer() {
    drawer.classList.add('open');
    dOverlay.classList.add('open');
    menuToggle.classList.add('open');
    menuToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawer.classList.remove('open');
    dOverlay.classList.remove('open');
    menuToggle.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  addTapListener(menuToggle, () =>
    drawer.classList.contains('open') ? closeDrawer() : openDrawer());
  addTapListener(dOverlay, closeDrawer);

  // ── Info modal ────────────────────────────────
  const infoOverlay = document.getElementById('info-overlay');

  addTapListener(document.getElementById('info-btn'), () =>
    infoOverlay.classList.add('open'));
  addTapListener(document.getElementById('info-close'), () =>
    infoOverlay.classList.remove('open'));

  // FIX ANDROID: el overlay usa solo 'click', no touchend custom,
  // para no interceptar los toques sobre los <a> hijos (WhatsApp, llamar)
  infoOverlay.addEventListener('click', (e) => {
    if (e.target === infoOverlay) infoOverlay.classList.remove('open');
  });

  // ══════════════════════════════════════════════
  // BLOQUE 2 — Carga del menú desde JSON
  // ══════════════════════════════════════════════

  let data;
  try {
    const res = await fetch('menu.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (e) {
    console.error('No se pudo cargar menu.json:', e);
    const menuPanel = document.getElementById('menu-panel');
    if (menuPanel) {
      menuPanel.innerHTML = `
        <div style="padding:2rem;text-align:center;color:#6a6055;font-family:'Cormorant Garamond',serif;font-size:1rem;">
          No se pudo cargar el menú.<br>Por favor recargá la página.
        </div>`;
    }
    return;
  }

  const { restaurant: r, categories } = data;

  const tabBar    = document.getElementById('tab-bar');
  const menuPanel = document.getElementById('menu-panel');
  const drawerNav = document.getElementById('drawer-nav');

  // ── Tab switching ─────────────────────────────
  function switchTab(id) {
    tabBar.querySelectorAll('.tab-btn').forEach(t =>
      t.classList.toggle('active', t.dataset.id === id));
    drawerNav.querySelectorAll('button').forEach(b =>
      b.classList.toggle('active', b.dataset.id === id));
    menuPanel.querySelectorAll('.category-panel').forEach(p =>
      p.classList.toggle('active', p.id === `panel-${id}`));

    tabBar.querySelector(`.tab-btn[data-id="${id}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

    menuPanel.scrollTop = 0;
  }

  // ── Build tabs + panels ───────────────────────
  categories.forEach((cat, i) => {
    const isFirst = i === 0;

    // Tab
    const tab = document.createElement('button');
    tab.className = 'tab-btn' + (isFirst ? ' active' : '');
    tab.dataset.id = cat.id;
    tab.textContent = cat.name;
    addTapListener(tab, () => switchTab(cat.id));
    tabBar.appendChild(tab);

    // Drawer button
    const dbtn = document.createElement('button');
    dbtn.dataset.id = cat.id;
    if (isFirst) dbtn.classList.add('active');
    dbtn.textContent = cat.name;
    addTapListener(dbtn, () => { switchTab(cat.id); closeDrawer(); });
    drawerNav.appendChild(dbtn);

    // Panel
    const panel = document.createElement('div');
    panel.className = 'category-panel' + (isFirst ? ' active' : '');
    panel.id = `panel-${cat.id}`;

    if (cat.image) {
      panel.innerHTML = `
        <div class="cat-image-wrap" id="img-wrap-${cat.id}">
          <img src="${cat.image}" alt="${cat.name}" loading="lazy"
            onerror="
              document.getElementById('img-wrap-${cat.id}').style.display='none';
              document.getElementById('plain-${cat.id}').style.display='block';
            ">
          <div class="cat-img-overlay">
            <h2>${cat.name}</h2>
            ${cat.description ? `<p>${cat.description}</p>` : ''}
          </div>
        </div>
        <div class="cat-header-plain" id="plain-${cat.id}" style="display:none">
          <h2>${cat.name}</h2>
          ${cat.description ? `<p>${cat.description}</p>` : ''}
        </div>
      `;
    } else {
      panel.innerHTML = `
        <div class="cat-header-plain">
          <h2>${cat.name}</h2>
          ${cat.description ? `<p>${cat.description}</p>` : ''}
        </div>
      `;
    }

    panel.innerHTML += `
      <div class="cat-rule">
        <div class="cat-rule-line"></div>
        <div class="cat-rule-diamond"></div>
        <div class="cat-rule-line"></div>
      </div>
    `;

    const twoCol = cat.items.length >= 5 && !cat.items.some(it => it.note);
    const list = document.createElement('div');
    list.className = 'items-list' + (twoCol ? ' two-col' : '');

    cat.items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'menu-item';
      div.innerHTML = `
        <div class="item-left">
          <div class="item-name">${item.name}</div>
          ${item.note ? `<div class="item-note">${item.note}</div>` : ''}
        </div>
        <div class="item-dots"></div>
        <div class="item-price"><span class="item-currency">L.</span>${item.price}</div>
      `;
      list.appendChild(div);
    });

    panel.appendChild(list);
    menuPanel.appendChild(panel);
  });

  // ── Fill info modal ───────────────────────────
  // FIX ANDROID: los <a> del modal NO se tocan con addTapListener,
  // se dejan funcionar de forma nativa para que Android abra WhatsApp y el marcador.
  const phoneRaw = r.phone.replace(/\D/g, '');

  const phoneLinkEl = document.getElementById('info-phone-link');
  if (phoneLinkEl) {
    phoneLinkEl.href        = `tel:${phoneRaw}`;
    phoneLinkEl.textContent = r.phone;
  }

  const addressEl = document.getElementById('info-address');
  if (addressEl) addressEl.textContent = r.address;

  const igEl = document.getElementById('info-ig-link');
  if (igEl) igEl.href = r.instagram;

  const fbEl = document.getElementById('info-fb-link');
  if (fbEl) fbEl.href = r.facebook;

  const waEl = document.getElementById('info-wa-link');
  if (waEl) waEl.href =
    `https://wa.me/${r.whatsapp}?text=Hola%20El%20Estadero,%20vi%20su%20men%C3%BA%20y%20quisiera%20`;

  const phoneBtn = document.getElementById('info-phone-btn');
  if (phoneBtn) phoneBtn.href = `tel:${phoneRaw}`;

});
