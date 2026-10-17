/* ==========================================================================
   app.js — shared SPA framework for client portal + trainer admin
   router · shell · common renderers · confetti · version-local mock data
   ========================================================================== */
(function () {
  'use strict';
  const { $, $$, esc, icon, icons, lazyVideos, reduced } = window.UI;
  const L = window.LINDA;

  /* ---------- version-local mock data (multi-household demo) ---------- */
  if (!L.households.some((h) => h.id === 'h-reid')) {
    L.users.push({ id: 'u-jo', name: 'Jo Reid', role: 'client', email: 'jo.r@example.co.nz', phone: '+64 21 555 0182', household: 'h-reid', permission: 'owner', invite: 'accepted' });
    L.households.push({ id: 'h-reid', name: 'Reid whānau', suburb: 'Raglan', status: 'active', primary: 'u-jo', members: ['u-jo', 'u-sarah'], dogs: ['d-tui'], since: '2026-09-28', memberPerms: { 'u-sarah': 'member' } });
    L.dogs.push({ id: 'd-tui', name: 'Tui', breed: 'Rough Collie', age: '6 yrs', dob: '2020-04-02', sex: 'F', household: 'h-reid', status: 'Maintenance', clip: 1557, photo: L.img(1557, 40), cover: L.img(1557, 15), avatar: L.thumb(1557, 40), goals: ['Calm on the beach', 'Settle when visitors arrive'], notes: 'Sarah helps with Tui’s walks on weekends. First session booked.', progress: 18, techniques: ['t-settle', 't-social'] });
    L.sessions.push({ id: 's-109', date: '2026-10-24T09:30', location: 'Raglan — Ngarunui Beach', household: 'h-reid', dogs: ['d-tui'], status: 'scheduled', title: 'Beach settle — first session', notes: '', homework: [], media: [] });
  }
  window.DB && window.DB.applied && (window.DB.applied = false, window.DB.apply());

  /* ---------- small renderers ---------- */
  const label = (s) => String(s || '').replace(/_/g, ' ');
  const badge = (s, txt, extra = '') => `<span class="badge st-${s} ${extra}">${txt || label(s)}</span>`;
  const techTag = (id) => { const t = L.technique(id); return t ? `<span class="tag" data-tech="${t.id}">${t.name}</span>` : ''; };
  const avatar = (u, size = '') => {
    if (!u) return '';
    const alt = u.role === 'trainer' ? '' : (u.id.charCodeAt(2) % 3 === 0 ? 'avatar--alt' : u.id.charCodeAt(2) % 3 === 1 ? 'avatar--moss' : '');
    return `<span class="avatar ${size} ${alt}" title="${esc(u.name)}">${L.initials(u.name)}</span>`;
  };
  const dogAvatar = (d, size = '') => d ? `<span class="avatar ${size}"><img src="${d.avatar}" alt=""></span>` : '';
  const pageHead = (o) => `
    <header class="page-head">
      <div>
        ${o.eyebrow ? `<p class="eyebrow eyebrow--amber">${o.eyebrow}</p>` : ''}
        <h1 class="page-head__title">${o.title}</h1>
        ${o.sub ? `<p class="page-head__sub">${o.sub}</p>` : ''}
      </div>
      ${o.actions ? `<div class="page-head__actions">${o.actions}</div>` : ''}
    </header>`;
  const empty = (o) => `<div class="empty"><div class="empty__icon">${icon(o.icon || 'sparkles')}</div><div class="empty__title">${o.title}</div>${o.text ? `<p>${o.text}</p>` : ''}${o.action || ''}</div>`;
  const sectionTitle = (title, right = '') => `<div class="section-title"><h2>${title}</h2>${right}</div>`;
  const stat = (o) => `<${o.href ? 'a href="' + o.href + '"' : 'div'} class="card stat ${o.href ? 'stat--link card--hover' : ''}">
      <span class="stat__label">${o.icon ? icon(o.icon) : ''}${o.label}</span>
      <span class="stat__value">${o.value}${o.unit ? `<small>${o.unit}</small>` : ''}</span>
      ${o.sub ? `<span class="stat__sub">${o.sub}</span>` : ''}
      ${o.spark ? `<div class="stat__spark">${o.spark}</div>` : ''}
    </${o.href ? 'a' : 'div'}>`;
  const isApproved = (m) => m.editorial === 'approved_shared' || m.editorial === 'published_public';
  const mediaCard = (m, o = {}) => {
    const dogs = m.dogs.map((id) => L.dog(id)).filter(Boolean);
    const proc = ['uploading', 'uploaded', 'processing', 'created'].includes(m.processing);
    const failed = m.processing === 'failed';
    const tag = o.href ? 'a' : 'button';
    return `<${tag} class="mcard" ${o.href ? `href="${o.href}"` : `type="button" data-media="${m.id}"`}>
      <div class="mcard__thumb">
        <img src="${L.thumb(m.clip, m.cover || 40)}" alt="" loading="lazy">
        ${o.state !== false ? `<span class="mcard__state">${badge(failed ? 'failed' : proc ? m.processing : m.editorial)}</span>` : ''}
        ${m.duration && m.duration !== '—' ? `<span class="mcard__dur">${m.duration}</span>` : ''}
        ${proc ? `<div class="mcard__processing">${icon('loader-circle')}${m.processing}${m.progress && m.processing === 'uploading' ? ' · ' + Math.round(m.progress * 100) + '%' : ''}</div>` : ''}
        ${o.locked ? `<div class="mcard__lock">${icon('lock')}With Linda for review</div>` : ''}
      </div>
      <div class="mcard__body">
        <span class="mcard__title">${esc(m.title)}</span>
        <span class="mcard__meta">${dogs.map((d) => d.name).join(' & ')} · ${L.fmtDate(m.created)}${m.parent ? ' · ' + icon('scissors') + ' derived clip' : ''}</span>
        ${m.techniques && m.techniques.length && o.tags !== false ? `<div class="mcard__tags">${m.techniques.slice(0, 2).map(techTag).join('')}</div>` : ''}
      </div>
    </${tag}>`;
  };

  /* ---------- shell ---------- */
  let viewEl, crumbsEl, backEl, sidebarEl;
  function shell(o) {
    document.body.classList.add('app');
    document.body.innerHTML = `
      <a class="skip-link" href="#view">Skip to content</a>
      <div class="grain grain--soft" aria-hidden="true"></div>
      <div class="shell">
        <aside class="sidebar" id="sidebar" aria-label="Main navigation">
          <a class="sb-brand" href="${o.brandHref || '#/'}"><span class="sb-brand__mark">Linda’s</span><span class="sb-brand__sub">${o.brandSub}</span></a>
          ${o.sidebarTop || ''}
          <nav>${o.nav.map((g) => `<div class="sb-group">${g.label ? `<p class="sb-label">${g.label}</p>` : ''}${g.items.map((it) => `<a class="sb-link" href="${it.href}" data-nav="${it.key}">${icon(it.icon)}<span>${it.label}</span>${it.count != null ? `<span class="sb-count ${it.hot ? 'sb-count--hot' : ''}" data-count="${it.key}">${it.count}</span>` : ''}</a>`).join('')}</div>`).join('')}</nav>
          <div class="sb-foot">${o.sidebarFoot || ''}</div>
        </aside>
        <div class="sb-scrim" data-close-sidebar></div>
        <div class="main">
          <header class="topbar">
            <button class="icon-btn show-sm-flex" data-open-sidebar aria-label="Open menu" style="${''}">${icon('menu')}</button>
            <a class="icon-btn topbar__back" href="#/" aria-label="Back">${icon('arrow-left')}</a>
            <a class="topbar__brand" href="${o.brandHref || '#/'}">Linda’s</a>
            <nav class="topbar__crumbs" aria-label="Breadcrumb"></nav>
            <div class="topbar__actions">${o.topActions || ''}</div>
          </header>
          <main class="view" id="view" tabindex="-1"></main>
        </div>
        ${o.tabs ? `<nav class="tabbar" aria-label="Quick navigation">${o.tabs.map((t) => t.spacer ? '<span class="tabbar__spacer" aria-hidden="true"></span>' : `<a href="${t.href}" data-nav="${t.key}" ${t.more ? 'data-more' : ''}>${icon(t.icon)}<span>${t.label}</span>${t.badge ? `<span class="tab-badge" data-count="${t.key}">${t.badge}</span>` : ''}</a>`).join('')}</nav>` : ''}
        ${o.fab || ''}
      </div>`;
    // arrival curtain when coming from the marketing site's page transition
    if (UI.store.sget('v1.curtain', false)) {
      UI.store.sset('v1.curtain', false);
      const c = document.createElement('div');
      c.className = 'curtain curtain--arrive';
      c.setAttribute('aria-hidden', 'true');
      c.innerHTML = '<div class="curtain__panel curtain__panel--amber"></div><div class="curtain__panel curtain__panel--ink"><span class="curtain__mark">Linda’s</span></div>';
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 650);
    }
    viewEl = $('#view'); crumbsEl = $('.topbar__crumbs'); backEl = $('.topbar__back'); sidebarEl = $('#sidebar');
    // mobile sidebar
    const style = document.createElement('style');
    style.textContent = '[data-open-sidebar]{display:none}@media (max-width:899px){[data-open-sidebar]{display:grid}}';
    document.head.appendChild(style);
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-open-sidebar]')) { sidebarEl.classList.add('is-open'); }
      if (e.target.closest('[data-close-sidebar]') || (e.target.closest('.sidebar a') && window.innerWidth < 900)) sidebarEl.classList.remove('is-open');
    });
    icons();
  }
  function setCrumbs(list) {
    crumbsEl.innerHTML = list.map((c, i) => (i ? icon('chevron-right') : '') + (c.href && i < list.length - 1 ? `<a href="${c.href}">${esc(c.label)}</a>` : `<b>${esc(c.label)}</b>`)).join('');
    icons();
  }
  function setBack(href) {
    if (href) { backEl.href = href; backEl.classList.add('is-visible'); } else backEl.classList.remove('is-visible');
  }
  function setCount(key, n) {
    $$(`[data-count="${key}"]`).forEach((el) => { el.textContent = n; el.style.display = n ? '' : 'none'; });
  }

  /* ---------- router ---------- */
  let cleanup = null;
  function router(o) {
    const compiled = o.routes.map((r) => ({ ...r, re: new RegExp('^' + r.path.replace(/:(\w+)/g, '([^/]+)') + '$'), keys: (r.path.match(/:(\w+)/g) || []).map((k) => k.slice(1)) }));
    function render() {
      const hash = location.hash.replace(/^#/, '') || o.fallback;
      const [path, qs] = hash.split('?');
      let match = null;
      for (const r of compiled) {
        const m = path.match(r.re);
        if (m) { const params = { query: new URLSearchParams(qs || '') }; r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1]))); match = { r, params }; break; }
      }
      if (!match) { location.replace('#' + o.fallback); return; }
      if (typeof cleanup === 'function') { try { cleanup(); } catch (e) {} }
      cleanup = null;
      let out;
      try { out = match.r.view(match.params) || ''; }
      catch (err) { console.error(err); out = empty({ icon: 'triangle-alert', title: 'Something went sideways.', text: 'This screen hit a snag in the demo. Try another page.' }); }
      const html = typeof out === 'string' ? out : out.html;
      viewEl.innerHTML = html;
      viewEl.classList.remove('is-entering'); void viewEl.offsetWidth; viewEl.classList.add('is-entering');
      clearTimeout(viewEl.__enterT); viewEl.__enterT = setTimeout(() => viewEl.classList.remove('is-entering'), 600);
      document.body.dataset.route = match.r.path;
      $$('[data-nav]').forEach((a) => a.classList.toggle('is-active', a.dataset.nav === match.r.nav));
      setBack(match.r.back ? (typeof match.r.back === 'function' ? match.r.back(match.params) : match.r.back) : null);
      if (out.crumbs) setCrumbs(out.crumbs); else if (match.r.title) setCrumbs([{ label: match.r.title }]);
      document.title = (out.title || match.r.title || '') + ' · ' + o.appName;
      window.scrollTo(0, 0);
      icons(); lazyVideos(viewEl);
      if (out.mount) cleanup = out.mount(viewEl, match.params) || null;
      icons();
      o.onChange && o.onChange(match.r, match.params);
    }
    window.addEventListener('hashchange', render);
    return { render, go: (h) => { if (location.hash === h) render(); else location.hash = h; } };
  }

  /* ---------- popover menu ---------- */
  function popMenu(anchor, items, onPick) {
    $$('.menu-pop').forEach((m) => m.remove());
    const r = anchor.getBoundingClientRect();
    const pop = document.createElement('div');
    pop.className = 'menu-pop';
    pop.setAttribute('role', 'menu');
    pop.innerHTML = items.map((it, i) => `<button role="menuitem" data-i="${i}">${it.html}</button>`).join('');
    document.body.appendChild(pop);
    const w = Math.max(r.width, 240);
    pop.style.width = w + 'px';
    pop.style.left = Math.min(window.innerWidth - w - 12, r.left) + 'px';
    pop.style.top = r.bottom + 8 + window.scrollY + 'px';
    pop.style.position = 'absolute';
    icons();
    const first = pop.querySelector('button'); first && first.focus();
    const close = () => { pop.remove(); document.removeEventListener('pointerdown', out); document.removeEventListener('keydown', key); };
    const out = (e) => { if (!pop.contains(e.target) && !anchor.contains(e.target)) close(); };
    const key = (e) => { if (e.key === 'Escape') close(); };
    setTimeout(() => { document.addEventListener('pointerdown', out); document.addEventListener('keydown', key); });
    pop.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) { close(); onPick(items[+b.dataset.i], +b.dataset.i); } });
  }

  /* ---------- confetti ---------- */
  function confetti() {
    if (reduced) return;
    const c = document.createElement('canvas');
    c.className = 'confetti';
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.scale(dpr, dpr);
    const cols = ['#E8A33D', '#F2EBDD', '#C8553D', '#9DB38E', '#F4BE6A'];
    const P = Array.from({ length: 120 }, () => ({ x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight * 0.55, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 16 - 6, r: Math.random() * 6 + 3, c: cols[(Math.random() * cols.length) | 0], a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3 }));
    let t = 0;
    const loop = () => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      P.forEach((p) => { p.vy += 0.42; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, 1 - t / 140); ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); });
      if (++t < 150) requestAnimationFrame(loop); else c.remove();
    };
    loop();
  }

  /* ---------- delegated helpers ---------- */
  // Hover-to-preview for any element with data-preview="src"
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest('[data-preview]');
    if (!el || el.__pv || UI.isTouch) return;
    el.__pv = true;
    const v = document.createElement('video');
    v.muted = true; v.loop = true; v.playsInline = true; v.src = el.dataset.preview;
    v.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .4s;z-index:1';
    el.appendChild(v);
    const on = () => { v.play().then(() => (v.style.opacity = 1)).catch(() => {}); };
    const off = () => { v.style.opacity = 0; v.pause(); };
    on();
    el.closest('.mcard, a, button, div').addEventListener('pointerleave', off);
    el.closest('.mcard, a, button, div').addEventListener('pointerenter', on);
  });

  window.App = { shell, router, setCrumbs, setBack, setCount, label, badge, techTag, avatar, dogAvatar, pageHead, empty, sectionTitle, stat, mediaCard, isApproved, popMenu, confetti };
})();
