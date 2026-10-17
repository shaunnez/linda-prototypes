/* =========================================================
   PAWS & PLAY — core utilities shared by site, portal & admin
   window.PAWS (alias P)
   ========================================================= */
(function () {
  'use strict';
  const P = (window.PAWS = window.PAWS || {});
  const mm = (q) => window.matchMedia && window.matchMedia(q).matches;
  P.reduced = mm('(prefers-reduced-motion: reduce)');
  P.fine = mm('(hover: hover) and (pointer: fine)');
  P.$ = (s, r) => (r || document).querySelector(s);
  P.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  P.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  P.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  P.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  P.uid = (p) => (p || 'id') + '-' + Math.random().toString(36).slice(2, 8);
  P.toSec = (t) => { if (!t || t === '—') return 0; const p = String(t).split(':').map(Number); return p.length === 2 ? p[0] * 60 + p[1] : p[0]; };
  P.fmtSec = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  /* ---------- storage (always guarded) ---------- */
  const NS = 'v2:';
  P.store = {
    get(k, d) { try { const v = localStorage.getItem(NS + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
    del(k) { try { localStorage.removeItem(NS + k); } catch (e) { /* noop */ } }
  };

  /* ---------- demo database overrides (persist UI state across pages) ---------- */
  P.db = {
    raw() { return P.store.get('db', { patch: {}, add: {} }); },
    apply() {
      const L = window.LINDA; if (!L || L.__applied) return; L.__applied = true;
      const db = P.db.raw();
      Object.keys(db.add || {}).forEach((col) => { if (Array.isArray(L[col])) (db.add[col] || []).forEach((it) => { if (!L[col].some((x) => x.id === it.id)) L[col].unshift(it); }); });
      Object.keys(db.patch || {}).forEach((col) => {
        if (!Array.isArray(L[col])) return;
        Object.keys(db.patch[col]).forEach((id) => { const it = L[col].find((x) => x.id === id); if (it) Object.assign(it, db.patch[col][id]); });
      });
    },
    patch(col, id, patch) {
      const db = P.db.raw(); db.patch[col] = db.patch[col] || {}; db.patch[col][id] = Object.assign(db.patch[col][id] || {}, patch); P.store.set('db', db);
      const L = window.LINDA; if (L && Array.isArray(L[col])) { const it = L[col].find((x) => x.id === id); if (it) Object.assign(it, patch); }
    },
    add(col, item) {
      const db = P.db.raw(); db.add[col] = db.add[col] || []; db.add[col] = db.add[col].filter((x) => x.id !== item.id); db.add[col].unshift(item); P.store.set('db', db);
      const L = window.LINDA; if (L && Array.isArray(L[col]) && !L[col].some((x) => x.id === item.id)) L[col].unshift(item);
    },
    reset() { P.store.del('db'); P.store.del('portal'); P.store.del('admin'); P.store.del('ctx'); }
  };
  P.db.apply();

  /* ---------- icons ---------- */
  P.icons = function () { try { if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true' } }); } catch (e) { /* noop */ } };
  P.ic = (name, cls) => `<i data-lucide="${name}"${cls ? ` class="${cls}"` : ''}></i>`;

  /* ---------- hand-drawn SVG library ---------- */
  const PAW = '<path d="M16 15.2c-4.4 0-8.8 5.3-8.8 9 0 2.7 2.2 3.8 4.4 3.8 1.8 0 3-.9 4.4-.9s2.6.9 4.4.9c2.2 0 4.4-1.1 4.4-3.8 0-3.7-4.4-9-8.8-9z"/><ellipse cx="6.6" cy="13.4" rx="2.9" ry="3.7" transform="rotate(-24 6.6 13.4)"/><ellipse cx="12.2" cy="7.8" rx="2.9" ry="3.9" transform="rotate(-8 12.2 7.8)"/><ellipse cx="19.8" cy="7.8" rx="2.9" ry="3.9" transform="rotate(8 19.8 7.8)"/><ellipse cx="25.4" cy="13.4" rx="2.9" ry="3.7" transform="rotate(24 25.4 13.4)"/>';
  P.svg = {
    paw: (cls) => `<svg class="${cls || ''}" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">${PAW}</svg>`,
    squiggle: (cls) => `<svg class="draw ${cls || ''}" viewBox="0 0 300 24" preserveAspectRatio="none" fill="none" aria-hidden="true"><path d="M3 15C22 4 34 22 54 12s34-9 52 1 34 9 52-2 34-10 52 1 34 9 52-1 22-8 32-4" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    underline: (cls) => `<svg class="draw ${cls || ''}" viewBox="0 0 300 20" preserveAspectRatio="none" fill="none" aria-hidden="true"><path d="M4 13c58-7 128-11 196-9 34 1 63 3 94 6" stroke="currentColor" stroke-width="6" stroke-linecap="round"/></svg>`,
    circle: (cls) => `<svg class="draw ${cls || ''}" viewBox="0 0 220 90" preserveAspectRatio="none" fill="none" aria-hidden="true"><path d="M150 10C92 2 18 14 8 44c-9 28 58 42 120 38 54-3 88-18 84-40-3-18-36-30-82-31" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`,
    arrow: (cls) => `<svg class="draw ${cls || ''}" viewBox="0 0 120 90" fill="none" aria-hidden="true"><path d="M6 10c30-6 66 6 78 34 6 14 4 26-2 36" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M68 70l14 12 10-17" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    sparkle: (cls) => `<svg class="${cls || ''}" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 2c1.6 9.6 8.4 16.4 18 18-9.6 1.6-16.4 8.4-18 18-1.6-9.6-8.4-16.4-18-18C11.6 18.4 18.4 11.6 20 2z" fill="currentColor" stroke="#1B1B1B" stroke-width="2" stroke-linejoin="round"/></svg>`,
    bone: (cls) => `<svg class="${cls || ''}" viewBox="0 0 64 28" aria-hidden="true"><path d="M14 4a6.5 6.5 0 0 0-6 9 6.5 6.5 0 1 0 6 9h36a6.5 6.5 0 1 0 6-9 6.5 6.5 0 1 0-6-9 6.5 6.5 0 0 0-6 4H20a6.5 6.5 0 0 0-6-4z" fill="currentColor" stroke="#1B1B1B" stroke-width="2.5" stroke-linejoin="round"/></svg>`,
    star: (cls) => `<svg class="${cls || ''}" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3l4.6 10.4 11.4 1.1-8.6 7.6 2.5 11.2L20 27.5l-9.9 5.8 2.5-11.2L4 14.5l11.4-1.1z" fill="currentColor" stroke="#1B1B1B" stroke-width="2.4" stroke-linejoin="round"/></svg>`,
    heart: (cls) => `<svg class="${cls || ''}" viewBox="0 0 40 36" aria-hidden="true"><path d="M20 33S3 22.5 3 12.2C3 6.8 7.2 3 12 3c3.6 0 6.4 2 8 5 1.6-3 4.4-5 8-5 4.8 0 9 3.8 9 9.2C37 22.5 20 33 20 33z" fill="currentColor" stroke="#1B1B1B" stroke-width="2.4" stroke-linejoin="round"/></svg>`,
    logo: (cls) => `<svg class="${cls || ''}" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="#FF5A36" stroke="#1B1B1B" stroke-width="2.5"/><g transform="translate(8 8)" fill="#1B1B1B">${PAW}</g></svg>`,
    padlockBone: (cls) => `<svg class="${cls || ''}" viewBox="0 0 320 340" fill="none" aria-hidden="true">
      <g class="pl-shackle"><path d="M98 150V104c0-34 28-62 62-62s62 28 62 62v46" stroke="#1B1B1B" stroke-width="22" stroke-linecap="round"/><path d="M98 150V104c0-34 28-62 62-62s62 28 62 62v46" stroke="#FFC93C" stroke-width="12" stroke-linecap="round"/></g>
      <rect x="44" y="140" width="232" height="176" rx="44" fill="#FF5A36" stroke="#1B1B1B" stroke-width="5"/>
      <rect x="44" y="140" width="232" height="176" rx="44" fill="url(#plDots)" opacity=".25"/>
      <defs><pattern id="plDots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2.4" fill="#1B1B1B"/></pattern></defs>
      <g class="pl-bone" transform="translate(96 196)"><path d="M18 6a10 10 0 0 0-9.4 13.6A10 10 0 1 0 18 34h92a10 10 0 1 0 9.4-14.4A10 10 0 1 0 110 6a10 10 0 0 0-9.4 6.4H27.4A10 10 0 0 0 18 6z" fill="#FFF6E9" stroke="#1B1B1B" stroke-width="4.5" stroke-linejoin="round"/><circle cx="64" cy="20" r="7" fill="#1B1B1B"/><path d="M64 24v8" stroke="#1B1B1B" stroke-width="5" stroke-linecap="round"/></g>
      <g class="pl-shine"><path d="M70 172c6-10 16-16 28-18" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".7"/></g>
      <g class="pl-eyes" fill="#1B1B1B"><circle cx="124" cy="262" r="6"/><circle cx="196" cy="262" r="6"/></g>
      <path class="pl-smile" d="M146 280c8 8 20 8 28 0" stroke="#1B1B1B" stroke-width="5" stroke-linecap="round"/>
      <g fill="#FFD6C9"><ellipse cx="106" cy="282" rx="12" ry="7"/><ellipse cx="214" cy="282" rx="12" ry="7"/></g>
    </svg>`
  };

  /* ---------- toasts ---------- */
  let toastRoot;
  P.toast = function (msg, opts) {
    opts = opts || {};
    if (!toastRoot) { toastRoot = document.createElement('div'); toastRoot.className = 'toasts'; toastRoot.setAttribute('role', 'status'); toastRoot.setAttribute('aria-live', 'polite'); document.body.appendChild(toastRoot); }
    const t = document.createElement('div');
    t.className = 'toast ' + (opts.tone || '');
    t.innerHTML = `<span class="ti">${P.ic(opts.icon || (opts.tone === 'err' ? 'alert-triangle' : opts.tone === 'ok' ? 'check' : 'paw-print'))}</span><span>${msg}</span>${opts.action ? `<button type="button">${P.esc(opts.action)}</button>` : ''}`;
    toastRoot.appendChild(t); P.icons();
    while (toastRoot.children.length > 3) toastRoot.firstElementChild.remove();
    if (opts.action) t.querySelector('button').addEventListener('click', () => { opts.onAction && opts.onAction(); kill(); });
    if (window.gsap && !P.reduced) gsap.from(t, { y: 30, scale: .9, opacity: 0, duration: .5, ease: 'back.out(2)' });
    let gone = false;
    function kill() { if (gone) return; gone = true; if (window.gsap && !P.reduced) gsap.to(t, { y: 20, opacity: 0, duration: .25, onComplete: () => t.remove() }); else t.remove(); }
    setTimeout(kill, opts.ms || 3600);
    return kill;
  };

  /* ---------- modal / bottom sheet ---------- */
  P.modal = function (o) {
    const last = document.activeElement;
    const root = document.createElement('div');
    root.className = 'modal-root';
    const id = P.uid('m');
    root.innerHTML = `<div class="modal-scrim" data-close></div>
      <div class="modal ${o.wide ? 'modal--wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="${id}" data-lenis-prevent>
        <div class="modal-head"><h2 id="${id}">${o.title || ''}</h2><button class="icon-btn" type="button" data-close aria-label="Close">${P.ic('x')}</button></div>
        <div class="modal-body">${o.html || ''}</div>
        ${o.actions && o.actions.length ? `<div class="modal-foot">${o.actions.map((a, i) => `<button type="button" class="btn ${a.cls || ''}" data-act="${i}">${a.icon ? P.ic(a.icon) : ''}${a.label}</button>`).join('')}</div>` : ''}
      </div>`;
    document.body.appendChild(root); P.icons();
    if (P.lenis) P.lenis.stop();
    document.documentElement.style.overflow = 'hidden';
    const modal = root.querySelector('.modal');
    if (window.gsap && !P.reduced) {
      gsap.from(root.querySelector('.modal-scrim'), { opacity: 0, duration: .25 });
      const mobile = window.innerWidth <= 640;
      gsap.from(modal, mobile ? { yPercent: 100, duration: .5, ease: 'expo.out' } : { y: 40, scale: .92, rotate: -1.5, opacity: 0, duration: .55, ease: 'back.out(1.8)' });
    }
    let closed = false;
    const api = {
      el: root, body: root.querySelector('.modal-body'),
      close() {
        if (closed) return; closed = true;
        document.removeEventListener('keydown', onKey);
        const done = () => { root.remove(); if (!document.querySelector('.modal-root')) { document.documentElement.style.overflow = ''; if (P.lenis) P.lenis.start(); } if (last && last.focus) last.focus(); o.onClose && o.onClose(); };
        if (window.gsap && !P.reduced) { gsap.to(root.querySelector('.modal-scrim'), { opacity: 0, duration: .2 }); gsap.to(modal, { y: 30, opacity: 0, duration: .22, onComplete: done }); } else done();
      }
    };
    root.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) api.close(); const b = e.target.closest('[data-act]'); if (b) { const a = o.actions[+b.dataset.act]; const r = a.onClick ? a.onClick(api, b) : null; if (r !== false && a.close !== false) api.close(); } });
    function onKey(e) {
      if (e.key === 'Escape') api.close();
      if (e.key === 'Tab') {
        const f = P.$$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', modal).filter((x) => !x.disabled && x.offsetParent !== null);
        if (!f.length) return; const first = f[0], lastF = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastF.focus(); } else if (!e.shiftKey && document.activeElement === lastF) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    setTimeout(() => { const f = modal.querySelector('input, select, textarea') || modal.querySelector('[data-close]'); f && f.focus(); }, 60);
    o.onOpen && o.onOpen(api);
    return api;
  };
  P.confirm = (title, text, okLabel, onOk, cls) => P.modal({ title, html: `<p>${text}</p>`, actions: [{ label: 'Cancel', cls: 'btn--outline' }, { label: okLabel || 'Confirm', cls: cls || 'btn--primary', onClick: onOk }] });

  /* ---------- confetti paw burst ---------- */
  P.confetti = function (x, y, n) {
    if (P.reduced || !window.gsap) return;
    const layer = document.createElement('div'); layer.className = 'confetti-layer'; document.body.appendChild(layer);
    const cols = ['#FF5A36', '#FFC93C', '#1F7A4D', '#8EC5FF', '#FFD6C9', '#1B1B1B'];
    const shapes = [P.svg.paw(), P.svg.paw(), P.svg.star(), P.svg.heart(), P.svg.bone()];
    n = n || 34;
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div'); el.className = 'cf';
      el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.color = cols[i % cols.length];
      el.innerHTML = shapes[i % shapes.length]; layer.appendChild(el);
      const a = Math.random() * Math.PI * 2, v = 140 + Math.random() * 320;
      gsap.timeline({ onComplete: () => el.remove() })
        .to(el, { x: Math.cos(a) * v, y: Math.sin(a) * v - 120, rotation: (Math.random() - .5) * 720, scale: .6 + Math.random() * .9, duration: .9, ease: 'power3.out' })
        .to(el, { y: '+=' + (260 + Math.random() * 200), opacity: 0, duration: 1.1, ease: 'power1.in' }, '-=.25');
    }
    setTimeout(() => layer.remove(), 2600);
  };

  /* ---------- paw cursor trail ---------- */
  P.pawTrail = function () {
    if (!P.fine || P.reduced || !window.gsap) return;
    const layer = document.createElement('div'); layer.className = 'paw-trail'; layer.setAttribute('aria-hidden', 'true'); document.body.appendChild(layer);
    let lx = null, ly = null, side = 1, n = 0;
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (lx === null) { lx = e.clientX; ly = e.clientY; return; }
      const dx = e.clientX - lx, dy = e.clientY - ly; const d = Math.hypot(dx, dy);
      if (d < 46) return;
      const ang = Math.atan2(dy, dx); side *= -1; n++;
      const ox = Math.cos(ang + Math.PI / 2) * 9 * side, oy = Math.sin(ang + Math.PI / 2) * 9 * side;
      const p = document.createElement('div'); p.className = 'pp'; p.innerHTML = P.svg.paw();
      p.style.left = (e.clientX + ox) + 'px'; p.style.top = (e.clientY + oy) + 'px';
      if (n % 3 === 0) p.style.color = '#FFC93C';
      layer.appendChild(p);
      gsap.fromTo(p, { scale: .2, rotation: ang * 180 / Math.PI + 90, opacity: .95 }, { scale: 1, duration: .25, ease: 'back.out(3)' });
      gsap.to(p, { opacity: 0, scale: .6, delay: .5, duration: .7, onComplete: () => p.remove() });
      lx = e.clientX; ly = e.clientY;
    }, { passive: true });
  };

  /* ---------- page transitions (tomato circle from click point) ---------- */
  P.pageTransitions = function () {
    const html = document.documentElement;
    if (html.classList.contains('pt-in')) {
      let pos = { x: .5, y: .5 };
      try { pos = JSON.parse(sessionStorage.getItem('v2:pt')) || pos; sessionStorage.removeItem('v2:pt'); } catch (e) { /* noop */ }
      const cover = document.createElement('div'); cover.className = 'pt-cover'; cover.innerHTML = P.svg.paw(); document.body.appendChild(cover);
      html.classList.remove('pt-in');
      const x = (pos.x * 100) + '%', y = (pos.y * 100) + '%';
      if (window.gsap && !P.reduced) {
        gsap.fromTo(cover, { clipPath: `circle(150% at ${x} ${y})` }, { clipPath: `circle(0% at 50% 50%)`, duration: .8, ease: 'expo.inOut', delay: .05, onComplete: () => cover.remove() });
        gsap.fromTo(cover.querySelector('svg'), { scale: 1 }, { scale: 0, rotate: 30, duration: .4, ease: 'back.in(2)' });
      } else cover.remove();
    }
    window.addEventListener('pageshow', (e) => { if (e.persisted) P.$$('.pt-circle').forEach((c) => c.remove()); });
    if (P.reduced) return;
    document.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest('a[href]'); if (!a || a.target || a.hasAttribute('download') || a.dataset.noTransition !== undefined) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname) return; // hash route / same page
      if (!/\.html$|\/$/.test(url.pathname)) return;
      e.preventDefault();
      P.go(url.href, e.clientX, e.clientY);
    });
  };
  P.go = function (href, x, y) {
    if (P.reduced || !window.gsap) { location.href = href; return; }
    x = x == null ? innerWidth / 2 : x; y = y == null ? innerHeight / 2 : y;
    try { sessionStorage.setItem('v2:pt', JSON.stringify({ x: x / innerWidth, y: y / innerHeight })); } catch (e) { /* noop */ }
    const c = document.createElement('div'); c.className = 'pt-circle';
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    c.style.width = c.style.height = (r * 2) + 'px'; c.style.left = x + 'px'; c.style.top = y + 'px';
    document.body.appendChild(c);
    gsap.to(c, { scale: 1, duration: .6, ease: 'expo.in', onComplete: () => { location.href = href; } });
  };

  /* ---------- lazy video: play when visible, pause when not ---------- */
  P.lazyVideos = function (root) {
    const vids = P.$$('video[data-src], video[data-lazy]', root);
    if (!vids.length) return;
    if (!('IntersectionObserver' in window)) { vids.forEach((v) => { if (v.dataset.src) v.src = v.dataset.src; }); return; }
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        const v = en.target;
        if (en.isIntersecting) {
          if (v.dataset.src && !v.getAttribute('src')) { v.src = v.dataset.src; }
          if (!P.reduced || v.dataset.forcePlay) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
        } else if (!v.paused) v.pause();
      });
    }, { rootMargin: '200px 0px' });
    vids.forEach((v) => { if (!v.__io) { v.__io = 1; io.observe(v); } });
  };

  /* ---------- SVG draw-on ---------- */
  P.prepDraw = function (svg) {
    P.$$('path, line, polyline, circle', svg).forEach((p) => {
      p.setAttribute('pathLength', '100'); p.style.vectorEffect = 'none';
      p.style.strokeDasharray = '100 110'; p.style.strokeDashoffset = P.reduced ? 0 : 100; p.__len = 100;
      if (!P.reduced) p.style.opacity = 0;
    });
  };
  P.draw = function (svg, opts) {
    opts = opts || {};
    const paths = P.$$('path, line, polyline, circle', svg).filter((p) => p.__len);
    if (P.reduced || !window.gsap) { paths.forEach((p) => { p.style.strokeDashoffset = 0; p.style.opacity = 1; }); return; }
    gsap.set(paths, { opacity: 1, delay: opts.delay || 0 });
    return gsap.to(paths, { strokeDashoffset: 0, duration: opts.duration || 1, delay: opts.delay || 0, ease: opts.ease || 'power2.inOut', stagger: .15 });
  };

  /* ---------- tilt (bouncy on hover) ---------- */
  P.tilt = function (el, max) {
    if (!P.fine || P.reduced || !window.gsap) return;
    max = max || 8;
    el.style.transformStyle = 'preserve-3d';
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
      gsap.to(el, { rotateY: px * max * 2, rotateX: -py * max * 2, transformPerspective: 900, duration: .4, ease: 'power2.out' });
    });
    el.addEventListener('pointerleave', () => gsap.to(el, { rotateY: 0, rotateX: 0, duration: 1.2, ease: 'elastic.out(1, .35)' }));
  };

  /* ---------- magnetic ---------- */
  P.magnetic = function (el, strength) {
    if (!P.fine || P.reduced || !window.gsap) return;
    strength = strength || .3;
    el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * strength, y: (e.clientY - r.top - r.height / 2) * strength, duration: .4, ease: 'power3.out' }); });
    el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: .9, ease: 'elastic.out(1, .3)' }));
  };

  /* ---------- custom video player ---------- */
  P.player = function (host, o) {
    o = o || {};
    const nominal = o.nominal || 0; // displayed duration (seconds) — maps onto actual clip
    host.classList.add('player');
    host.innerHTML = `<video playsinline muted preload="metadata" ${o.poster ? `poster="${o.poster}"` : ''} src="${o.src}" ${o.loop === false ? '' : 'loop'}></video>
      <button class="pl-big" type="button" aria-label="Play video">${'<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg>'}</button>
      <div class="pl-cap" aria-live="polite"></div>
      <div class="pl-bar">
        <button class="icon-btn pl-pp" type="button" aria-label="Play">${P.ic('play')}</button>
        <div class="pl-track" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="pl-fill"></div></div>
        <span class="pl-time">0:00 / ${P.fmtSec(nominal)}</span>
        <button class="icon-btn pl-mute" type="button" aria-label="Unmute">${P.ic('volume-x')}</button>
        <button class="icon-btn pl-fs" type="button" aria-label="Fullscreen">${P.ic('maximize')}</button>
      </div>`;
    const v = host.querySelector('video'), track = host.querySelector('.pl-track'), fill = host.querySelector('.pl-fill'), time = host.querySelector('.pl-time'), cap = host.querySelector('.pl-cap');
    const ppBtn = host.querySelector('.pl-pp');
    const nom = () => nominal || v.duration || 0;
    const toReal = (s) => (v.duration && nominal ? (s / nominal) * v.duration : s);
    (o.marks || []).forEach((m) => { const d = document.createElement('i'); d.className = 'pl-mark'; d.style.left = (P.toSec(m.t) / (nominal || 1)) * 100 + '%'; d.title = m.label; track.appendChild(d); });
    function setIcon() { ppBtn.innerHTML = P.ic(v.paused ? 'play' : 'pause'); ppBtn.setAttribute('aria-label', v.paused ? 'Play' : 'Pause'); host.classList.toggle('is-playing', !v.paused); P.icons(); }
    function toggle() { if (v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } else v.pause(); }
    host.querySelector('.pl-big').addEventListener('click', toggle); ppBtn.addEventListener('click', toggle); v.addEventListener('click', toggle);
    v.addEventListener('play', setIcon); v.addEventListener('pause', setIcon);
    v.addEventListener('timeupdate', () => {
      const pct = v.duration ? v.currentTime / v.duration : 0; fill.style.width = pct * 100 + '%'; track.setAttribute('aria-valuenow', Math.round(pct * 100));
      const cur = pct * nom(); time.textContent = P.fmtSec(cur) + ' / ' + P.fmtSec(nom());
      if (o.captions) { const c = o.captions.filter((x) => P.toSec(x.t) <= cur).pop(); cap.textContent = c ? c.text : ''; cap.classList.toggle('on', !!c && cur - P.toSec(c.t) < 3); }
      o.onTime && o.onTime(cur);
    });
    function seekPct(p) { if (v.duration) v.currentTime = P.clamp(p, 0, .999) * v.duration; }
    track.addEventListener('pointerdown', (e) => { const r = track.getBoundingClientRect(); seekPct((e.clientX - r.left) / r.width); });
    track.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') v.currentTime += 1; if (e.key === 'ArrowLeft') v.currentTime -= 1; });
    host.querySelector('.pl-mute').addEventListener('click', (e) => { v.muted = !v.muted; e.currentTarget.innerHTML = P.ic(v.muted ? 'volume-x' : 'volume-2'); P.icons(); P.toast(v.muted ? 'Muted' : 'Demo clips have no audio track — captions shown instead', { icon: 'captions' }); });
    host.querySelector('.pl-fs').addEventListener('click', () => { const f = host.requestFullscreen || host.webkitRequestFullscreen; if (f) f.call(host); else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen(); });
    P.icons();
    return {
      video: v,
      seek(t) { const s = typeof t === 'string' ? P.toSec(t) : t; const go = () => { v.currentTime = Math.min(toReal(s), (v.duration || 1) - .05); const p = v.play(); if (p && p.catch) p.catch(() => {}); }; if (v.readyState >= 1) go(); else v.addEventListener('loadedmetadata', go, { once: true }); host.scrollIntoView({ behavior: P.reduced ? 'auto' : 'smooth', block: 'center' }); }
    };
  };

  /* ---------- generic helpers for data ---------- */
  P.tech = (id) => (window.LINDA ? window.LINDA.technique(id) : null);
  P.techTag = (id) => { const t = P.tech(id); return t ? `<span class="tq" style="--c:${t.color}"><i></i>${P.esc(t.name)}</span>` : ''; };
  P.statusLabel = (s) => ({
    draft: 'Draft', needs_review: 'Needs review', approved_private: 'Approved · private', approved_shared: 'Shared', published_public: 'Public',
    archived: 'Archived', created: 'Created', uploading: 'Uploading', uploaded: 'Uploaded', processing: 'Processing', ready: 'Ready', failed: 'Failed',
    cancelled: 'Cancelled', paused: 'Paused', prepared: 'Prepared', handoff_opened: 'WhatsApp opened', trainer_confirmed: 'You confirmed sent',
    active: 'Active', inactive: 'Inactive', accepted: 'Accepted', pending: 'Invite pending', expired: 'Invite expired', revoked: 'Revoked', withdrawn: 'Withdrawn',
    published: 'Published', scheduled: 'Scheduled', completed: 'Completed', unassigned: 'Unassigned', assigned: 'Assigned', too_large: 'Too large', quarantined: 'Quarantined'
  }[s] || s);
  P.status = (s, extra) => `<span class="pill st-${s} ${extra || ''}">${P.esc(P.statusLabel(s))}</span>`;

  /* ---------- squish feedback for any [data-squish] (non-.btn) ---------- */
  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('[data-squish]'); if (!el || P.reduced || !window.gsap) return;
    gsap.fromTo(el, { scaleX: 1.04, scaleY: .94 }, { scaleX: 1, scaleY: 1, duration: .6, ease: 'elastic.out(1.2, .35)' });
  });
})();
