/* =============================================
   EL ESTADERO — menu.js v4
   Fixes: Safari iOS touch, video autoplay,
   fallbacks, cross-browser compatibility
   ============================================= */

document.addEventListener('DOMContentLoaded', async () => {

  // ══════════════════════════════════════════════
  // UTILIDAD — soporte touch + click en todos
  // los navegadores incluyendo Safari iOS
  // ══════════════════════════════════════════════

  function addTapListener(el, fn) {
    if (!el) return;
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
    if (revealed) return; // evita doble disparo
    revealed = true;
    intro.classList.add('hidden');
    app.classList.add('visible');
  }

  // Toque o clic en cualquier parte del intro → avanza
  addTapListener(intro, revealApp);

  // Video: avanza al terminar
  if (introVideo) {
    // Fix Safari: forzar atributos necesarios por JS también
    introVideo.muted    = true;
    introVideo.playsInline = true;

    introVideo.addEventListener('ended', revealApp);

    // Intentar reproducir (algunos browsers bloquean autoplay)
    const playPromise = introVideo.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Si el autoplay falla (política del browser), avanzar directo
        revealApp();
      });
    }

    // Fallback: si el video dura más de 15s o no carga, avanza igual
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
    // Fix iOS: previene scroll del body detrás del drawer
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
  addTapListener(infoOverlay, (e) => {
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
    // Mostrar mensaje de error amigable en el panel
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
  const phoneRaw = r.phone.replace(/\D/g, '');
  document.getElementById('info-phone-link').href        = `tel:${phoneRaw}`;
  document.getElementById('info-phone-link').textContent = r.phone;
  document.getElementById('info-address').textContent    = r.address;
  document.getElementById('info-ig-link').href           = r.instagram;
  document.getElementById('info-fb-link').href           = r.facebook;
  document.getElementById('info-wa-link').href           =
    `https://wa.me/${r.whatsapp}?text=Hola%20El%20Estadero,%20vi%20su%20men%C3%BA%20y%20quisiera%20`;

});