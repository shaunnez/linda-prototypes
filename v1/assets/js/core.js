/* ==========================================================================
   core.js — shared helpers for marketing, portal and admin (window.UI, window.DB)
   ========================================================================== */
(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const uid = (p = 'x') => p + '-' + Math.random().toString(36).slice(2, 8);

  /* Demo "now" — keeps relative times consistent with the mock data */
  const NOW = new Date('2026-10-17T14:05:00');

  /* ---------- storage (always wrapped) ---------- */
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
    },
    set(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode */ }
    },
    remove(key) { try { localStorage.removeItem(key); } catch (e) {} },
    sget(key, fallback) { try { const v = sessionStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; } },
    sset(key, val) { try { sessionStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
  };

  /* ---------- time helpers ---------- */
  const parseT = (t) => {
    if (typeof t === 'number') return t;
    if (!t || t === '—') return 0;
    const p = String(t).split(':').map(Number);
    return p.length === 2 ? p[0] * 60 + p[1] : p[0] * 3600 + p[1] * 60 + p[2];
  };
  const fmtT = (s) => {
    s = Math.max(0, Math.round(s || 0));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };
  const ago = (iso) => {
    const d = (NOW - new Date(iso)) / 1000;
    if (d < 0) {
      const f = -d;
      if (f < 86400) return 'in ' + Math.round(f / 3600) + 'h';
      return 'in ' + Math.round(f / 86400) + 'd';
    }
    if (d < 60) return 'just now';
    if (d < 3600) return Math.round(d / 60) + 'm ago';
    if (d < 86400) return Math.round(d / 3600) + 'h ago';
    if (d < 86400 * 7) return Math.round(d / 86400) + 'd ago';
    return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' });
  };
  const fmtDate = (iso, o) => new Date(iso).toLocaleDateString('en-NZ', o || { day: 'numeric', month: 'short' });
  const fmtDay = (iso) => new Date(iso).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' });
  const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' });

  /* ---------- icons ---------- */
  const icon = (name, cls = '') => `<i data-lucide="${name}" class="${cls}" aria-hidden="true"></i>`;
  const icons = () => { try { window.lucide && window.lucide.createIcons(); } catch (e) {} };

  /* ---------- toasts ---------- */
  let toastRoot;
  function toast(msg, opts = {}) {
    if (!toastRoot) {
      toastRoot = document.createElement('div');
      toastRoot.className = 'toasts';
      toastRoot.setAttribute('role', 'status');
      toastRoot.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastRoot);
    }
    const type = opts.type || 'info';
    const ic = opts.icon || (type === 'success' ? 'check' : type === 'error' ? 'triangle-alert' : 'sparkles');
    const el = document.createElement('div');
    el.className = 'toast toast--' + type;
    el.innerHTML = `<span class="toast__icon">${icon(ic)}</span><span class="grow">${msg}</span>` + (opts.action ? `<button class="toast__action" type="button">${esc(opts.action.label)}</button>` : '');
    toastRoot.appendChild(el);
    icons();
    const kill = () => { el.classList.add('is-leaving'); setTimeout(() => el.remove(), 360); };
    if (opts.action) $('.toast__action', el).addEventListener('click', () => { opts.action.fn && opts.action.fn(); kill(); });
    setTimeout(kill, opts.duration || 3800);
    return el;
  }

  /* ---------- modal ---------- */
  let lastFocus;
  function modal(o = {}) {
    lastFocus = document.activeElement;
    const root = document.createElement('div');
    root.className = 'modal-root';
    const id = uid('m');
    root.innerHTML = `
      <div class="modal-backdrop" data-close></div>
      <div class="modal ${o.size ? 'modal--' + o.size : ''}" role="dialog" aria-modal="true" aria-labelledby="${id}">
        <div class="modal__head">
          <div>
            ${o.eyebrow ? `<div class="eyebrow eyebrow--amber" style="margin-bottom:10px">${o.eyebrow}</div>` : ''}
            <h2 class="modal__title" id="${id}">${o.title || ''}</h2>
            ${o.sub ? `<p class="modal__sub">${o.sub}</p>` : ''}
          </div>
          <button class="btn btn--ghost btn--icon btn--sm" data-close aria-label="Close dialog">${icon('x')}</button>
        </div>
        <div class="modal__body">${o.body || ''}</div>
        ${o.foot ? `<div class="modal__foot">${o.foot}</div>` : ''}
      </div>`;
    document.body.appendChild(root);
    document.documentElement.style.overflow = 'hidden';
    if (window.__lenis) window.__lenis.stop();
    icons();
    let closed = false;
    const close = (val) => {
      if (closed) return; closed = true;
      root.classList.add('is-leaving');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => {
        root.remove();
        if (!$('.modal-root')) { document.documentElement.style.overflow = ''; if (window.__lenis) window.__lenis.start(); }
        lastFocus && lastFocus.focus && lastFocus.focus();
      }, 300);
      o.onClose && o.onClose(val);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        const f = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', root).filter((x) => !x.disabled && x.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    root.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
    const first = $('[autofocus]', root) || $('.modal__body input, .modal__body textarea, .modal__body select', root) || $('.modal__body button, .modal__foot button', root);
    setTimeout(() => first && first.focus({ preventScroll: true }), 60);
    const api = { root, close, body: $('.modal__body', root), foot: $('.modal__foot', root) };
    o.onOpen && o.onOpen(api);
    return api;
  }

  function confirmDialog(o = {}) {
    return new Promise((resolve) => {
      let result = false;
      const m = modal({
        title: o.title || 'Are you sure?',
        sub: o.sub,
        body: o.body || '',
        eyebrow: o.eyebrow,
        foot: `<button class="btn btn--ghost" data-close>${o.cancel || 'Cancel'}</button><button class="btn ${o.danger ? 'btn--danger' : 'btn--primary'}" data-ok>${o.ok || 'Confirm'}</button>`,
        onClose: () => resolve(result)
      });
      $('[data-ok]', m.root).addEventListener('click', () => { result = true; m.close(true); });
    });
  }

  /* ---------- drawer ---------- */
  function drawer(o = {}) {
    const root = document.createElement('div');
    root.className = 'drawer-root';
    root.innerHTML = `<div class="modal-backdrop" data-close></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="${esc(o.label || 'Details')}">${o.html || ''}</aside>`;
    document.body.appendChild(root);
    icons();
    const close = () => { root.classList.add('is-leaving'); setTimeout(() => root.remove(), 300); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    root.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
    const api = { root, close, el: $('.drawer', root) };
    o.onOpen && o.onOpen(api);
    return api;
  }

  /* ---------- accordion ---------- */
  function accordion(root) {
    $$('.acc-trigger', root).forEach((btn) => {
      if (btn.__acc) return; btn.__acc = true;
      btn.addEventListener('click', () => {
        const item = btn.closest('.acc-item');
        const open = !item.classList.contains('is-open');
        item.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', open);
        setTimeout(() => window.ScrollTrigger && window.ScrollTrigger.refresh(), 600);
      });
    });
  }

  /* ---------- lazy video play/pause ---------- */
  let vio;
  function lazyVideos(root = document) {
    const vids = $$('video[data-lazy]', root);
    if (!vids.length) return;
    if (!vio) {
      vio = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          const v = en.target;
          if (en.isIntersecting) {
            if (!v.src && v.dataset.src) { v.src = v.dataset.src; }
            if (!reduced || v.dataset.force) { const p = v.play(); p && p.catch(() => {}); }
          } else if (!v.paused) v.pause();
        });
      }, { rootMargin: '200px 0px' });
    }
    vids.forEach((v) => { if (!v.__lazy) { v.__lazy = true; vio.observe(v); } });
  }

  /* ---------- magnetic ---------- */
  function magnetic(el, strength = 0.35) {
    if (isTouch || reduced || el.__mag) return;
    el.__mag = true;
    const inner = el.querySelector('.btn__label, .magnet-inner');
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      if (inner) inner.style.transform = `translate(${x * strength * 0.4}px, ${y * strength * 0.4}px)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transition = 'transform .7s cubic-bezier(.16,1,.3,1)';
      el.style.transform = '';
      if (inner) { inner.style.transition = 'transform .7s cubic-bezier(.16,1,.3,1)'; inner.style.transform = ''; }
      setTimeout(() => { el.style.transition = ''; if (inner) inner.style.transition = ''; }, 700);
    });
  }

  /* ---------- custom cursor ---------- */
  function cursor() {
    if (isTouch || reduced || $('.cursor')) return;
    const c = document.createElement('div');
    c.className = 'cursor is-hidden';
    c.setAttribute('aria-hidden', 'true');
    c.innerHTML = '<div class="cursor__ring"><span class="cursor__label"></span></div><div class="cursor__dot"></div>';
    document.body.appendChild(c);
    document.documentElement.classList.add('has-cursor');
    const ring = $('.cursor__ring', c), dot = $('.cursor__dot', c), label = $('.cursor__label', c);
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
    window.addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; c.classList.remove('is-hidden'); }, { passive: true });
    document.addEventListener('pointerleave', () => c.classList.add('is-hidden'));
    window.addEventListener('pointerdown', () => c.classList.add('is-down'));
    window.addEventListener('pointerup', () => c.classList.remove('is-down'));
    const loop = () => {
      rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
      dot.style.transform = `translate(${x}px, ${y}px)`;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('[data-cursor], a, button, .chip, label, [role="button"]');
      if (!t) { c.classList.remove('is-hover', 'is-label'); return; }
      const l = t.getAttribute('data-cursor');
      if (l) { label.textContent = l; c.classList.add('is-label'); c.classList.remove('is-hover'); }
      else { c.classList.add('is-hover'); c.classList.remove('is-label'); }
    });
  }

  /* ---------- custom video player ---------- */
  const PLAY_SVG = '<svg viewBox="0 0 24 24"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z"/></svg>';
  function player(container, o = {}) {
    const nominal = parseT(o.duration) || 0;
    const markers = (o.markers || []).map((m) => ({ t: parseT(m.t), label: m.label }));
    container.innerHTML = `
      <div class="player ${o.vertical ? 'player--vertical' : ''} vignette" ${o.cursor === false ? '' : 'data-cursor="Play"'}>
        <video playsinline preload="metadata" ${o.muted !== false ? 'muted' : ''} ${o.loop ? 'loop' : ''} poster="${o.poster || ''}" src="${o.src}" aria-label="${esc(o.label || 'Training video')}"></video>
        <div class="player__shade"></div>
        ${o.badge ? `<div class="player__badge">${o.badge}</div>` : ''}
        <button class="player__big" type="button" aria-label="Play video">${PLAY_SVG}</button>
        <div class="player__bar">
          <button class="player__btn" data-act="play" type="button" aria-label="Play">${icon('play')}</button>
          <div class="player__track" role="slider" tabindex="0" aria-label="Seek" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <div class="player__rail"><div class="player__buf"></div><div class="player__fill"></div></div>
            ${markers.map((m) => `<span class="player__marker" data-t="${m.t}" data-label="${esc(m.label)}"></span>`).join('')}
            <span class="player__knob"></span>
          </div>
          <span class="player__time">0:00 / ${nominal ? fmtT(nominal) : '0:00'}</span>
          <button class="player__btn player__rate" data-act="rate" type="button" aria-label="Playback speed">1×</button>
          <button class="player__btn" data-act="mute" type="button" aria-label="Unmute">${icon('volume-x')}</button>
          <button class="player__btn" data-act="fs" type="button" aria-label="Fullscreen">${icon('maximize')}</button>
        </div>
      </div>`;
    icons();
    const el = $('.player', container);
    const v = $('video', el);
    const fill = $('.player__fill', el), knob = $('.player__knob', el), buf = $('.player__buf', el), time = $('.player__time', el), track = $('.player__track', el);
    const dur = () => v.duration || nominal || 1;
    const nom = () => nominal || v.duration || 0;
    const toActual = (t) => (nominal && v.duration ? (t / nominal) * v.duration : t);
    const toNominal = (t) => (nominal && v.duration ? (t / v.duration) * nominal : t);
    const placeMarkers = () => $$('.player__marker', el).forEach((m) => { m.style.left = (clamp(+m.dataset.t / (nom() || 1), 0, 1) * 100) + '%'; });
    placeMarkers();
    v.addEventListener('loadedmetadata', placeMarkers);
    const setPlayIcon = () => {
      const b = $('[data-act="play"]', el);
      b.innerHTML = icon(v.paused ? 'play' : 'pause');
      b.setAttribute('aria-label', v.paused ? 'Play' : 'Pause');
      el.classList.toggle('is-playing', !v.paused);
      icons();
    };
    const update = () => {
      const p = v.currentTime / dur();
      fill.style.width = p * 100 + '%';
      knob.style.left = p * 100 + '%';
      track.setAttribute('aria-valuenow', Math.round(p * 100));
      time.textContent = fmtT(toNominal(v.currentTime)) + ' / ' + fmtT(nom());
      if (v.buffered.length) buf.style.width = (v.buffered.end(v.buffered.length - 1) / dur()) * 100 + '%';
      o.onTime && o.onTime(toNominal(v.currentTime));
    };
    v.addEventListener('timeupdate', update);
    v.addEventListener('play', setPlayIcon);
    v.addEventListener('pause', setPlayIcon);
    const toggle = () => { if (v.paused) { const p = v.play(); p && p.catch(() => {}); } else v.pause(); };
    $('.player__big', el).addEventListener('click', toggle);
    v.addEventListener('click', toggle);
    let idleT;
    el.addEventListener('pointermove', () => { el.classList.remove('is-idle'); clearTimeout(idleT); idleT = setTimeout(() => el.classList.add('is-idle'), 2200); });
    const rates = [1, 1.5, 0.5, 0.75];
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const a = b.dataset.act;
      if (a === 'play') toggle();
      if (a === 'mute') { v.muted = !v.muted; b.innerHTML = icon(v.muted ? 'volume-x' : 'volume-2'); b.setAttribute('aria-label', v.muted ? 'Unmute' : 'Mute'); icons(); }
      if (a === 'rate') { const i = (rates.indexOf(v.playbackRate) + 1) % rates.length; v.playbackRate = rates[i]; b.textContent = rates[i] + '×'; }
      if (a === 'fs') { const t = el; (t.requestFullscreen || t.webkitRequestFullscreen || (() => v.webkitEnterFullscreen && v.webkitEnterFullscreen())).call(t); }
    });
    const seekFromEvent = (e) => {
      const r = track.getBoundingClientRect();
      const p = clamp((e.clientX - r.left) / r.width, 0, 1);
      v.currentTime = p * dur();
      update();
    };
    track.addEventListener('pointerdown', (e) => {
      if (e.target.classList.contains('player__marker')) { seek(+e.target.dataset.t); return; }
      track.setPointerCapture(e.pointerId); track.classList.add('is-drag'); seekFromEvent(e);
      const mv = (ev) => seekFromEvent(ev);
      const up = () => { track.classList.remove('is-drag'); track.removeEventListener('pointermove', mv); track.removeEventListener('pointerup', up); };
      track.addEventListener('pointermove', mv); track.addEventListener('pointerup', up);
    });
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { v.currentTime = Math.min(dur(), v.currentTime + 1); update(); }
      if (e.key === 'ArrowLeft') { v.currentTime = Math.max(0, v.currentTime - 1); update(); }
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
    });
    function seek(t, play = true) {
      const go = () => { v.currentTime = clamp(toActual(t), 0, dur() - 0.05); update(); if (play) { const p = v.play(); p && p.catch(() => {}); } };
      if (v.readyState >= 1) go(); else v.addEventListener('loadedmetadata', go, { once: true });
    }
    if (o.autoplay) { v.muted = true; const p = v.play(); p && p.catch(() => {}); }
    return { el, video: v, seek, play: () => v.play(), pause: () => v.pause(), toNominal, toActual };
  }

  /* ---------- tiny SVG charts ---------- */
  function barChart(values, o = {}) {
    const w = o.w || 280, h = o.h || 110, pad = 4, n = values.length;
    const max = Math.max(...values) * 1.15;
    const bw = (w - pad * 2) / n;
    const labels = o.labels || [];
    return `<svg class="chart" viewBox="0 0 ${w} ${h + 18}" width="100%" role="img" aria-label="${esc(o.label || 'Bar chart')}">
      ${[0.25, 0.5, 0.75].map((g) => `<line x1="0" x2="${w}" y1="${h - h * g}" y2="${h - h * g}" stroke="rgba(242,235,221,.06)" stroke-dasharray="2 4"/>`).join('')}
      ${values.map((v, i) => {
        const bh = (v / max) * h;
        const last = i === n - 1;
        return `<g><rect class="chart__bar" x="${pad + i * bw + bw * 0.18}" y="${h - bh}" width="${bw * 0.64}" height="${bh}" rx="5" fill="${last ? 'var(--amber)' : 'rgba(242,235,221,.16)'}" style="--i:${i}"/>
          <text x="${pad + i * bw + bw / 2}" y="${h - bh - 6}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" fill="${last ? 'var(--amber)' : 'rgba(242,235,221,.45)'}">${v}</text>
          ${labels[i] ? `<text x="${pad + i * bw + bw / 2}" y="${h + 14}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="8.5" fill="rgba(242,235,221,.4)">${labels[i]}</text>` : ''}</g>`;
      }).join('')}
    </svg>`;
  }
  function sparkline(values, o = {}) {
    const w = o.w || 200, h = o.h || 48;
    const max = Math.max(...values), min = Math.min(...values);
    const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 4 - ((v - min) / (max - min || 1)) * (h - 8)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const id = uid('g');
    return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${o.color || '#E8A33D'}" stop-opacity=".35"/><stop offset="1" stop-color="${o.color || '#E8A33D'}" stop-opacity="0"/></linearGradient></defs>
      <path d="${d} L ${w} ${h} L 0 ${h} Z" fill="url(#${id})"/>
      <path d="${d}" fill="none" stroke="${o.color || '#E8A33D'}" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    </svg>`;
  }
  function ring(p, o = {}) {
    return `<div class="ring" style="--p:${p};--size:${o.size || 64}px;--stroke:${o.stroke || 5}px"><svg viewBox="0 0 36 36"><circle class="ring__bg" cx="18" cy="18" r="15.9155" pathLength="100"/><circle class="ring__fg" cx="18" cy="18" r="15.9155" pathLength="100" ${o.color ? `style="stroke:${o.color}"` : ''}/></svg><span class="ring__label">${o.label != null ? o.label : p + '%'}</span></div>`;
  }

  /* ---------- form validation ---------- */
  function validate(form) {
    let ok = true;
    $$('[data-validate]', form).forEach((inp) => {
      const field = inp.closest('.field');
      const rule = inp.dataset.validate;
      const v = inp.value.trim();
      let valid = true;
      if (rule.includes('required') && !v) valid = false;
      if (valid && rule.includes('email') && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) valid = false;
      if (valid && rule.includes('phone') && v && !/^\+?[\d\s()-]{7,}$/.test(v)) valid = false;
      if (valid && rule.includes('min') && v.length < (+inp.dataset.min || 10)) valid = false;
      field && field.classList.toggle('is-invalid', !valid);
      inp.setAttribute('aria-invalid', !valid);
      if (!valid && ok) { inp.focus(); ok = false; }
      if (!valid) ok = false;
    });
    return ok;
  }

  /* ==========================================================================
     DB — localStorage-backed patches over window.LINDA (shared across surfaces)
     ========================================================================== */
  const DBKEY = 'linda.v1.db';
  const DB = {
    state: store.get(DBKEY, { patch: {}, add: {}, kv: {} }),
    applied: false,
    apply() {
      const L = window.LINDA;
      if (!L || this.applied) return;
      this.applied = true;
      const s = this.state;
      s.patch = s.patch || {}; s.add = s.add || {}; s.kv = s.kv || {};
      Object.keys(s.add).forEach((coll) => {
        if (!L[coll]) L[coll] = [];
        s.add[coll].forEach((item) => {
          if (item.id && L[coll].some((x) => x.id === item.id)) return;
          if (item.__front) L[coll].unshift(item); else L[coll].push(item);
        });
      });
      Object.keys(s.patch).forEach((coll) => {
        Object.keys(s.patch[coll]).forEach((id) => {
          const it = (L[coll] || []).find((x) => x.id === id);
          if (it) Object.assign(it, s.patch[coll][id]);
        });
      });
    },
    save() { store.set(DBKEY, this.state); },
    patch(coll, id, obj) {
      const L = window.LINDA;
      this.state.patch[coll] = this.state.patch[coll] || {};
      this.state.patch[coll][id] = Object.assign({}, this.state.patch[coll][id], obj);
      const it = (L[coll] || []).find((x) => x.id === id);
      if (it) Object.assign(it, obj);
      this.save();
      return it;
    },
    add(coll, obj, front = true) {
      const L = window.LINDA;
      const item = Object.assign({ id: uid('x') }, obj, front ? { __front: true } : {});
      this.state.add[coll] = this.state.add[coll] || [];
      this.state.add[coll].push(item);
      if (!L[coll]) L[coll] = [];
      if (front) L[coll].unshift(item); else L[coll].push(item);
      this.save();
      return item;
    },
    kv(key, val) {
      if (val === undefined) return this.state.kv[key];
      this.state.kv[key] = val; this.save(); return val;
    },
    audit(action, entity, actor = 'Linda') {
      return this.add('audit', { t: new Date().toISOString().slice(0, 16), actor, action, entity, fresh: true });
    },
    reset() { store.remove(DBKEY); store.remove('linda.v1.guide'); location.reload(); }
  };
  DB.apply();

  window.UI = { $, $$, esc, reduced, isTouch, clamp, sleep, uid, NOW, store, parseT, fmtT, ago, fmtDate, fmtDay, fmtTime, icon, icons, toast, modal, confirm: confirmDialog, drawer, accordion, lazyVideos, magnetic, cursor, player, barChart, sparkline, ring, validate };
  window.DB = DB;
})();
