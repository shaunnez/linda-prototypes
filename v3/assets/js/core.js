/* ==========================================================================
   V3 · core — shared utilities for marketing, portal and admin.
   Exposes window.V3. Depends on window.LINDA (/shared/data.js).
   ========================================================================== */
(function () {
  'use strict';
  const V3 = (window.V3 = window.V3 || {});
  const L = window.LINDA;

  /* DOM helpers ----------------------------------------------------------- */
  V3.$ = (s, r = document) => r.querySelector(s);
  V3.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  V3.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  V3.icon = (name, cls) => `<i data-lucide="${name}"${cls ? ` class="${cls}"` : ''} aria-hidden="true"></i>`;
  // Replace <i data-lucide="name"> placeholders with inline SVG (only unprocessed <i> nodes — cheap to call often).
  V3.icons = (root = document) => {
    const lu = window.lucide; if (!lu || !lu.icons) return;
    root.querySelectorAll('i[data-lucide]').forEach((el) => {
      const name = el.getAttribute('data-lucide');
      const node = lu.icons[name.replace(/(^|-)([a-z0-9])/g, (_, a, b) => b.toUpperCase())];
      if (!node) return;
      const extra = {};
      for (const a of Array.from(el.attributes)) if (a.name !== 'data-lucide' && a.name !== 'class') extra[a.name] = a.value;
      const svg = lu.createElement([node[0], Object.assign({}, node[1], { 'stroke-width': 1.75, 'aria-hidden': 'true', focusable: 'false' }, extra, { class: `lucide lucide-${name} ${el.getAttribute('class') || ''}`.trim(), 'data-icon': name }), node[2]]);
      el.replaceWith(svg);
    });
  };
  V3.reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  V3.fine = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  V3.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  V3.uid = (p = 'id') => `${p}-${Math.random().toString(36).slice(2, 7)}`;
  V3.debounce = (fn, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  V3.sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* Storage (always wrapped) --------------------------------------------- */
  V3.store = {
    get(k, d) { try { const v = localStorage.getItem('v3:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('v3:' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
    del(k) { try { localStorage.removeItem('v3:' + k); } catch (e) { /* noop */ } }
  };

  /* Demo database (cloned from LINDA, persisted so the demo feels alive) -- */
  const DB_KEY = 'db.v3.1';
  function freshDB() {
    const pick = ({ households, users, dogs, sessions, media, uploads, inbox, groups, shares, consents, audit, guides, techniques, posts, faqs, community, stats }) =>
      ({ households, users, dogs, sessions, media, uploads, inbox, groups, shares, consents, audit, guides, techniques, posts, faqs, community, stats });
    const db = JSON.parse(JSON.stringify(pick(L)));
    // Version-local: memberships (supports one person in several households).
    db.memberships = db.users.filter((u) => u.role === 'client').map((u) => ({ user: u.id, household: u.household, permission: u.permission, invite: u.invite }));
    // Sarah is also an invited member of the Chen-Walker household (she dog-sits Moose & Biscuit) — demonstrates the household switcher.
    db.memberships.push({ user: 'u-sarah', household: 'h-chen', permission: 'member', invite: 'accepted' });
    const chen = db.households.find((h) => h.id === 'h-chen');
    if (chen && !chen.members.includes('u-sarah')) chen.members.push('u-sarah');
    // Grants: derived from visibility for demo purposes
    db.media.forEach((m) => { m.parent = m.parent || null; m.cover = m.cover || 40; });
    db.uploads.push({ id: 'up-5', media: 'm-1009', file: 'IMG_4800.MOV', size: '64 MB', state: 'cancelled', progress: 0.21, protocol: 'tus', error: null, note: 'Duplicate — cancelled by Linda' });
    db.context = { household: 'h-fraser', dog: 'd-kiwi', dogs: ['d-kiwi'], session: 's-106' };
    db.homeworkDone = {};
    db.portalOpens = 41;
    return db;
  }
  let db = V3.store.get(DB_KEY, null);
  if (!db || !db.memberships) { db = freshDB(); V3.store.set(DB_KEY, db); }
  V3.db = db;
  V3.save = () => V3.store.set(DB_KEY, V3.db);
  V3.resetDemo = () => { V3.store.del(DB_KEY); V3.db = freshDB(); V3.save(); };

  /* Domain helpers -------------------------------------------------------- */
  const M = '/shared/media';
  const find = (arr, id) => arr.find((x) => x.id === id);
  Object.assign(V3, {
    img: (clip, p = 40) => `${M}/img/${clip}-${p}.jpg`,
    thumb: (clip, p = 40) => `${M}/thumb/${clip}-${p}.jpg`,
    vid: (clip) => `${M}/video/${clip}.mp4`,
    vert: (clip) => `${M}/vertical/${clip}.mp4`,
    dog: (id) => find(V3.db.dogs, id),
    household: (id) => find(V3.db.households, id),
    user: (id) => find(V3.db.users, id),
    technique: (id) => find(V3.db.techniques, id),
    media: (id) => find(V3.db.media, id),
    session: (id) => find(V3.db.sessions, id),
    group: (id) => find(V3.db.groups, id),
    guide: (id) => find(V3.db.guides, id) || V3.db.guides.find((g) => g.slug === id),
    dogsFor: (hid) => V3.db.dogs.filter((d) => d.household === hid),
    mediaForDog: (did) => V3.db.media.filter((m) => m.dogs.includes(did)),
    sessionsForDog: (did) => V3.db.sessions.filter((s) => s.dogs.includes(did)),
    sessionsForHousehold: (hid) => V3.db.sessions.filter((s) => s.household === hid),
    membersOf: (hid) => V3.db.memberships.filter((m) => m.household === hid).map((m) => Object.assign({}, V3.user(m.user), { permission: m.permission, invite: m.invite, membership: m })),
    householdsOf: (uid) => V3.db.memberships.filter((m) => m.user === uid && m.invite === 'accepted').map((m) => Object.assign({}, V3.household(m.household), { role: m.permission })),
    isClientVisible: (m) => m.editorial === 'approved_shared' || m.editorial === 'published_public',
    initials: (name) => String(name || '?').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  });

  V3.fmtDate = (iso, opts) => { try { return new Date(iso).toLocaleDateString('en-NZ', opts || { day: 'numeric', month: 'short' }); } catch (e) { return iso; } };
  V3.fmtTime = (iso) => { try { return new Date(iso).toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } };
  V3.fmtDay = (iso) => V3.fmtDate(iso, { weekday: 'short', day: 'numeric', month: 'short' });
  V3.rel = (iso) => {
    const d = new Date(iso), now = new Date();
    const s = (now - d) / 1000;
    if (s < 0) { const days = Math.round(-s / 86400); return days <= 0 ? 'later today' : days === 1 ? 'tomorrow' : `in ${days} days`; }
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
    return V3.fmtDate(iso);
  };
  V3.nowISO = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  V3.toSec = (t) => { if (!t || t === '—') return 0; const p = String(t).split(':').map(Number); return p.length === 2 ? p[0] * 60 + p[1] : p[0]; };
  V3.fmtSec = (s) => { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  V3.tc = (s, fps = 25) => { const f = Math.floor((s % 1) * fps); s = Math.floor(s); const p = (n) => String(n).padStart(2, '0'); return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}:${p(f)}`; };

  V3.audit = (action, entity, actor = 'Linda') => { V3.db.audit.unshift({ t: V3.nowISO(), actor, action, entity }); V3.save(); };

  /* Labels ---------------------------------------------------------------- */
  V3.label = {
    editorial: { draft: 'Draft', needs_review: 'Needs review', approved_private: 'Approved · private', approved_shared: 'Shared', published_public: 'Public', archived: 'Archived' },
    processing: { created: 'Created', uploading: 'Uploading', uploaded: 'Uploaded', processing: 'Processing', ready: 'Ready', failed: 'Failed', cancelled: 'Cancelled' },
    share: { draft: 'Draft', prepared: 'Prepared', handoff_opened: 'WhatsApp opened', trainer_confirmed: 'You confirmed sent', cancelled: 'Cancelled', failed: 'Failed' },
    mode: { link_only: 'Link only', video_only: 'Video only', link_and_video: 'Link + video' },
    visibility: { trainer_only: 'Trainer only', household: 'Household', group: 'Group', public: 'Public' },
    source: { pwa_camera: 'PWA camera', pwa_library: 'PWA library', whatsapp_archive: 'WhatsApp archive' }
  };
  V3.state = (s, label) => `<span class="state" data-s="${V3.esc(s)}">${V3.esc(label || s.replace(/_/g, ' '))}</span>`;

  /* Fuzzy match (subsequence with bonuses) -------------------------------- */
  V3.fuzzy = (q, text) => {
    q = q.toLowerCase().trim(); text = String(text).toLowerCase();
    if (!q) return 1;
    const idx = text.indexOf(q);
    if (idx >= 0) return 100 - idx + (idx === 0 ? 50 : 0);
    let ti = 0, score = 0, last = -2;
    for (const ch of q) {
      if (ch === ' ') continue;
      const f = text.indexOf(ch, ti);
      if (f < 0) return -1;
      score += f === last + 1 ? 6 : 1;
      if (f === 0 || text[f - 1] === ' ' || text[f - 1] === '-') score += 4;
      last = f; ti = f + 1;
    }
    return score;
  };

  /* Toasts ----------------------------------------------------------------- */
  V3.toast = (msg, opts = {}) => {
    let host = V3.$('.toasts');
    if (!host) { host = document.createElement('div'); host.className = 'toasts'; host.setAttribute('role', 'status'); host.setAttribute('aria-live', 'polite'); document.body.appendChild(host); }
    const type = opts.type || 'success';
    const ic = opts.icon || (type === 'success' ? 'check' : type === 'error' ? 'triangle-alert' : 'info');
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.innerHTML = `<span class="toast__ico">${V3.icon(ic)}</span><span class="toast__msg">${msg}${opts.sub ? `<small>${V3.esc(opts.sub)}</small>` : ''}</span>${opts.action ? `<button class="toast__act" type="button">${V3.esc(opts.action.label)}</button>` : ''}`;
    host.appendChild(el);
    V3.icons();
    const kill = () => { el.classList.add('is-out'); setTimeout(() => el.remove(), 380); };
    if (opts.action) el.querySelector('.toast__act').addEventListener('click', () => { opts.action.fn(); kill(); });
    setTimeout(kill, opts.duration || 3600);
    while (host.children.length > 3) host.firstChild.remove();
    return kill;
  };

  /* Modal ------------------------------------------------------------------ */
  V3.modal = ({ title, sub, body = '', foot = '', wide = false, onOpen, onClose, label }) => {
    const prev = document.activeElement;
    const root = document.createElement('div');
    root.className = 'modal-root';
    const id = V3.uid('m');
    root.innerHTML = `<div class="modal-scrim" data-close></div>
      <div class="modal${wide ? ' modal--wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="${id}">
        <div class="modal__head"><div>${label ? `<div class="label" style="margin-bottom:6px">${label}</div>` : ''}<h2 class="modal__title" id="${id}">${title}</h2>${sub ? `<p class="muted" style="margin-top:6px;font-size:14px">${sub}</p>` : ''}</div>
          <button class="icon-btn icon-btn--sm" type="button" data-close aria-label="Close">${V3.icon('x')}</button></div>
        <div class="modal__body">${body}</div>
        ${foot ? `<div class="modal__foot">${foot}</div>` : ''}
      </div>`;
    document.body.appendChild(root);
    V3.icons();
    const api = {
      el: root,
      close() {
        root.classList.remove('is-open');
        document.removeEventListener('keydown', onKey, true);
        setTimeout(() => root.remove(), 320);
        if (prev && prev.focus) prev.focus();
        if (onClose) onClose();
      }
    };
    const onKey = (e) => {
      if (root !== V3.$$('.modal-root').pop()) return; // only the topmost modal reacts
      if (e.key === 'Escape') { e.stopPropagation(); api.close(); }
      if (e.key === 'Tab') {
        const f = V3.$$('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])', root.querySelector('.modal')).filter((x) => x.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    root.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) api.close(); });
    requestAnimationFrame(() => {
      root.classList.add('is-open');
      const first = root.querySelector('.modal__body input, .modal__body select, .modal__body textarea, .modal__body button, .modal__foot .btn');
      setTimeout(() => (first || root.querySelector('[data-close]')).focus({ preventScroll: true }), 60);
    });
    if (onOpen) onOpen(root, api);
    return api;
  };

  V3.confirm = (title, sub, okLabel = 'Confirm', danger = false) => new Promise((res) => {
    let ok = false;
    const m = V3.modal({ title, sub, foot: `<button class="btn btn--ghost" data-close type="button">Cancel</button><button class="btn ${danger ? 'btn--danger' : 'btn--accent'}" type="button" data-ok>${okLabel}</button>`, onClose: () => res(ok) });
    m.el.querySelector('[data-ok]').addEventListener('click', () => { ok = true; m.close(); });
  });

  /* Theme (apps only) ------------------------------------------------------ */
  V3.theme = {
    get: () => V3.store.get('theme', 'light'),
    set(t) { V3.store.set('theme', t); document.documentElement.setAttribute('data-theme', t); document.dispatchEvent(new CustomEvent('v3:theme', { detail: t })); },
    toggle() { V3.theme.set(V3.theme.get() === 'dark' ? 'light' : 'dark'); }
  };

  /* Accordion -------------------------------------------------------------- */
  V3.accordion = (root = document) => {
    V3.$$('.acc__btn', root).forEach((btn) => {
      if (btn.dataset.bound) return; btn.dataset.bound = 1;
      const panel = document.getElementById(btn.getAttribute('aria-controls'));
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        if (panel) panel.classList.toggle('is-open', !open);
      });
    });
  };

  /* Lazy / visibility-aware videos ---------------------------------------- */
  V3.lazyVideos = (root = document) => {
    const vids = V3.$$('video[data-src]:not([data-lazy-bound]), video[data-autoplay]:not([data-lazy-bound])', root);
    if (!vids.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const v = en.target;
        if (en.isIntersecting) {
          if (v.dataset.src && !v.getAttribute('src')) { v.src = v.dataset.src; }
          if (!V3.reduced() && v.dataset.hoverplay === undefined) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
        } else if (!v.paused) v.pause();
      });
    }, { rootMargin: '200px 0px' });
    vids.forEach((v) => { v.dataset.lazyBound = 1; v.muted = true; io.observe(v); });
  };
  V3.hoverPlay = (root = document) => {
    V3.$$('[data-hover-video]', root).forEach((wrap) => {
      if (wrap.dataset.hpBound) return; wrap.dataset.hpBound = 1;
      const v = wrap.querySelector('video'); if (!v) return;
      const play = () => { if (!v.getAttribute('src') && v.dataset.src) v.src = v.dataset.src; v.muted = true; const p = v.play(); if (p && p.catch) p.catch(() => {}); wrap.classList.add('is-playing'); };
      const stop = () => { v.pause(); wrap.classList.remove('is-playing'); };
      wrap.addEventListener('pointerenter', play); wrap.addEventListener('pointerleave', stop);
      wrap.addEventListener('focusin', play); wrap.addEventListener('focusout', stop);
    });
  };

  /* Page transitions (blur/fade + hairline sweep) -------------------------- */
  V3.pageTransitions = () => {
    let pt = V3.$('.pt');
    if (!pt) { pt = document.createElement('div'); pt.className = 'pt'; pt.setAttribute('aria-hidden', 'true'); pt.innerHTML = '<i class="pt__line"></i><span class="pt__tc mono"></span>'; document.body.appendChild(pt); }
    const entering = sessionStorage && (() => { try { return sessionStorage.getItem('v3:pt') === '1'; } catch (e) { return false; } })();
    if (entering && !V3.reduced()) {
      pt.classList.add('is-in', 'no-anim');
      requestAnimationFrame(() => requestAnimationFrame(() => { pt.classList.remove('no-anim'); pt.classList.remove('is-in'); pt.classList.add('is-out'); setTimeout(() => pt.classList.remove('is-out'), 450); }));
    }
    // Hard safety: never leave an overlay / blur / opacity gate up on first load.
    setTimeout(() => {
      if (!pt.dataset.leaving) { pt.className = 'pt'; pt.removeAttribute('style'); }
      V3.$$('.view.is-entering').forEach((v) => v.classList.remove('is-entering'));
    }, 800);
    try { sessionStorage.removeItem('v3:pt'); } catch (e) { /* noop */ }
    window.addEventListener('pageshow', (e) => { if (e.persisted) pt.classList.remove('is-in'); });
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname) return; // same page / hash routes
      if (V3.reduced()) return;
      e.preventDefault();
      pt.dataset.leaving = '1';
      try { sessionStorage.setItem('v3:pt', '1'); } catch (err) { /* noop */ }
      const tc = pt.querySelector('.pt__tc'); if (tc) tc.textContent = url.pathname.replace('/v3', '') || '/';
      pt.classList.add('is-in');
      setTimeout(() => { location.href = url.href; }, 320);
    });
  };

  /* Count-up --------------------------------------------------------------- */
  V3.countUp = (el, to, { dur = 1400, decimals = 0, prefix = '', suffix = '' } = {}) => {
    if (V3.reduced()) { el.textContent = prefix + to.toFixed(decimals) + suffix; return; }
    const t0 = performance.now();
    const step = (t) => { const p = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - p, 4); el.textContent = prefix + (to * e).toFixed(decimals) + suffix; if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };

  /* Custom video player (portal + admin) ---------------------------------- */
  // V3.player(container, { clip, poster, declared: '0:42', markers: [{t,label}], vertical })
  V3.player = (el, o) => {
    const declared = V3.toSec(o.declared) || 0;
    el.classList.add('player');
    el.innerHTML = `
      <video playsinline muted preload="metadata" poster="${o.poster || V3.img(o.clip, 15)}" src="${V3.vid(o.clip)}"></video>
      <button class="player__big" type="button" aria-label="Play video">${V3.icon('play')}</button>
      <div class="player__bar">
        <button class="player__btn" type="button" data-act="play" aria-label="Play">${V3.icon('play')}</button>
        <span class="player__time num"><span data-cur>0:00</span><span class="faint"> / ${o.declared && o.declared !== '—' ? o.declared : '0:00'}</span></span>
        <div class="player__scrub" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <div class="player__rail"><i class="player__buf"></i><i class="player__fill"></i></div>
          ${(o.markers || []).map((m, i) => `<button type="button" class="player__mark" data-mark="${i}" style="left:${declared ? (V3.toSec(m.t) / declared) * 100 : 0}%" aria-label="Jump to ${V3.esc(m.t)} ${V3.esc(m.label)}"><span>${V3.esc(m.t)} · ${V3.esc(m.label)}</span></button>`).join('')}
          <i class="player__head"></i>
        </div>
        <button class="player__btn player__rate num" type="button" data-act="rate" aria-label="Playback speed">1×</button>
        <button class="player__btn" type="button" data-act="cc" aria-label="Toggle captions" aria-pressed="false">${V3.icon('captions')}</button>
        <button class="player__btn" type="button" data-act="fs" aria-label="Fullscreen">${V3.icon('maximize-2')}</button>
      </div>
      <div class="player__cc" hidden></div>
      <div class="player__tc mono"><span class="rec-dot" style="background:var(--lime);animation:none;box-shadow:none"></span> <span data-tc>00:00:00:00</span></div>`;
    V3.icons();
    const v = el.querySelector('video');
    const fill = el.querySelector('.player__fill');
    const head = el.querySelector('.player__head');
    const cur = el.querySelector('[data-cur]');
    const tcEl = el.querySelector('[data-tc]');
    const scrub = el.querySelector('.player__scrub');
    const ccEl = el.querySelector('.player__cc');
    const rates = [1, 1.5, 2, 0.5];
    let ri = 0;
    const toVideo = (declSec) => { const d = v.duration || 1; return declared ? (declSec / declared) * d : declSec; };
    const toDecl = (vs) => { const d = v.duration || 1; return declared ? (vs / d) * declared : vs; };
    const setIcon = () => {
      const b = el.querySelector('[data-act="play"]');
      b.innerHTML = V3.icon(v.paused ? 'play' : 'pause'); b.setAttribute('aria-label', v.paused ? 'Play' : 'Pause');
      el.classList.toggle('is-playing', !v.paused); V3.icons();
    };
    const toggle = () => { if (v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } else v.pause(); };
    el.querySelector('.player__big').addEventListener('click', toggle);
    v.addEventListener('click', toggle);
    el.querySelector('[data-act="play"]').addEventListener('click', toggle);
    v.addEventListener('play', setIcon); v.addEventListener('pause', setIcon);
    v.addEventListener('timeupdate', () => {
      const p = v.duration ? v.currentTime / v.duration : 0;
      fill.style.width = p * 100 + '%'; head.style.left = p * 100 + '%';
      cur.textContent = V3.fmtSec(toDecl(v.currentTime));
      tcEl.textContent = V3.tc(toDecl(v.currentTime));
      scrub.setAttribute('aria-valuenow', Math.round(p * 100));
      if (o.captions && !ccEl.hidden) {
        const t = toDecl(v.currentTime);
        const c = o.captions.filter((x) => V3.toSec(x.t) <= t).pop();
        ccEl.textContent = c ? c.text : '';
      }
      if (o.onTime) o.onTime(toDecl(v.currentTime));
    });
    v.addEventListener('progress', () => { try { const b = v.buffered.length ? v.buffered.end(v.buffered.length - 1) / v.duration : 0; el.querySelector('.player__buf').style.width = b * 100 + '%'; } catch (e) { /* noop */ } });
    const seekFromEvent = (e) => { const r = scrub.getBoundingClientRect(); const p = V3.clamp((e.clientX - r.left) / r.width, 0, 1); if (v.duration) v.currentTime = p * v.duration; };
    let dragging = false;
    scrub.addEventListener('pointerdown', (e) => { if (e.target.closest('.player__mark')) return; dragging = true; scrub.setPointerCapture(e.pointerId); seekFromEvent(e); });
    scrub.addEventListener('pointermove', (e) => { if (dragging) seekFromEvent(e); });
    scrub.addEventListener('pointerup', () => { dragging = false; });
    scrub.addEventListener('keydown', (e) => { if (!v.duration) return; if (e.key === 'ArrowRight') v.currentTime = Math.min(v.duration, v.currentTime + 1); if (e.key === 'ArrowLeft') v.currentTime = Math.max(0, v.currentTime - 1); });
    el.querySelectorAll('.player__mark').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); api.seek(V3.toSec(o.markers[+b.dataset.mark].t)); }));
    el.querySelector('[data-act="rate"]').addEventListener('click', (e) => { ri = (ri + 1) % rates.length; v.playbackRate = rates[ri]; e.currentTarget.textContent = rates[ri] + '×'; });
    el.querySelector('[data-act="cc"]').addEventListener('click', (e) => {
      const on = ccEl.hidden; ccEl.hidden = !on; e.currentTarget.setAttribute('aria-pressed', String(on));
      if (on && !o.captions) ccEl.textContent = 'No speech detected in this clip — captions unavailable.';
    });
    el.querySelector('[data-act="fs"]').addEventListener('click', () => { const f = el.requestFullscreen || el.webkitRequestFullscreen; if (document.fullscreenElement) document.exitFullscreen(); else if (f) f.call(el); else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen(); });
    const api = {
      video: v,
      seek(declSec) { const go = () => { v.currentTime = Math.min(toVideo(declSec), (v.duration || 1) - 0.2); const p = v.play(); if (p && p.catch) p.catch(() => {}); el.classList.add('is-flash'); setTimeout(() => el.classList.remove('is-flash'), 500); }; if (v.readyState >= 1) go(); else v.addEventListener('loadedmetadata', go, { once: true }); },
      toVideo, toDecl
    };
    return api;
  };

  /* Form validation (data-v="req email phone min10") ---------------------- */
  V3.validate = (form) => {
    let ok = true;
    $$('[data-v]', form).forEach((inp) => {
      const f = inp.closest('.field') || inp.closest('.check');
      const rule = inp.dataset.v; const v = (inp.type === 'checkbox' ? (inp.checked ? 'y' : '') : inp.value).trim();
      let bad = false;
      if (rule.includes('req') && !v) bad = true;
      if (!bad && rule.includes('email') && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) bad = true;
      if (!bad && rule.includes('phone') && v && !/^(\+64|0)[\d\s-]{7,13}$/.test(v)) bad = true;
      if (!bad && rule.includes('min10') && v.length < 10) bad = true;
      if (f) f.classList.toggle('is-invalid', bad);
      inp.setAttribute('aria-invalid', String(bad));
      if (bad && ok) { inp.focus(); ok = false; }
    });
    return ok;
  };

  /* Global boot ------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => { V3.icons(); });
})();
