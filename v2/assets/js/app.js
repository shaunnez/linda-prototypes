/* =========================================================
   PAWS & PLAY — tiny SPA framework shared by portal & admin
   window.APP: router, view mounting, ⌘K palette, popovers, swipe, charts
   ========================================================= */
(function () {
  'use strict';
  const P = window.PAWS, $ = P.$, $$ = P.$$;
  const APP = (window.APP = {});
  const G = typeof window.gsap !== 'undefined';

  APP.track = (fn) => fn; // replaced by the router with a per-view disposer
  /* ---------- router ---------- */
  APP.router = function (cfg) {
    const routes = cfg.routes.map((r) => ({ ...r, rx: new RegExp('^' + r.path.replace(/:[^/]+/g, '([^/]+)') + '$'), keys: (r.path.match(/:[^/]+/g) || []).map((k) => k.slice(1)) }));
    const viewEl = cfg.el;
    let current = null;
    function parse() {
      const raw = location.hash.replace(/^#/, '') || cfg.fallback;
      const [path, qs] = raw.split('?');
      const query = {}; (qs || '').split('&').filter(Boolean).forEach((kv) => { const [k, v] = kv.split('='); query[decodeURIComponent(k)] = decodeURIComponent(v || ''); });
      return { path, query };
    }
    let disposers = [], gen = 0;
    APP.track = (fn) => { disposers.push(fn); return fn; };
    function teardown() {
      if (current && current.cleanup) { try { current.cleanup(); } catch (e) { console.error(e); } }
      disposers.forEach((fn) => { try { fn(); } catch (e) { /* noop */ } }); disposers = [];
      $$('video', viewEl).forEach((v) => { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { /* noop */ } });
      if (G) { try { gsap.killTweensOf(viewEl.querySelectorAll('*')); } catch (e) { /* noop */ } }
      $$('.pop').forEach((p) => p.remove());
      viewEl.replaceChildren();
      current = null;
    }
    function render(match, ctx) {
      let out;
      try { out = match.view(ctx); } catch (err) { console.error(err); out = null; }
      const view = typeof out === 'string' ? { html: out } : out || { html: `<div class="empty"><div class="em-ico">${P.ic('bug')}</div><h3>Something went sideways</h3><p>This screen couldn’t load.</p><a class="btn" href="#${cfg.fallback}">Go home</a></div>` };
      viewEl.innerHTML = view.html || '';
      viewEl.classList.remove('view-enter'); void viewEl.offsetWidth; if (!P.reduced) viewEl.classList.add('view-enter');
      current = view;
      P.icons();
      window.scrollTo(0, 0);
      $$('[data-nav]').forEach((a) => { const on = a.dataset.nav === match.nav; if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
      if (view.mount) { try { view.mount(viewEl, ctx); } catch (e) { console.error(e); } }
      P.icons();
      P.lazyVideos(viewEl);
      const title = view.title || match.title; if (title) document.title = title + ' · ' + cfg.appName;
      const tbt = $('.tb-title'); if (tbt) tbt.textContent = view.short || match.title || '';
      const h = viewEl.querySelector('h1'); if (h) h.setAttribute('tabindex', '-1');
      // safety: nothing may stay hidden or offset after an entrance
      const my = gen; setTimeout(() => { if (my !== gen) return; APP.unhide(viewEl); }, 700);
    }
    function resolve() {
      gen++;
      const { path, query } = parse();
      let match = null; const params = {};
      for (const r of routes) { const m = path.match(r.rx); if (m) { match = r; r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1]))); break; } }
      if (!match) { location.replace('#' + cfg.fallback); return; }
      const ctx = { params, query, path };
      teardown();
      render(match, ctx);
      try { cfg.onRoute && cfg.onRoute(match, ctx); } catch (e) { console.error(e); }
    }
    window.addEventListener('hashchange', resolve);
    return { resolve, go: (h) => { if (location.hash === '#' + h) resolve(); else location.hash = h; }, refresh: resolve };
  };

  /* ---------- topbar shadow on scroll ---------- */
  window.addEventListener('scroll', () => { const t = $('.topbar'); if (t) t.classList.toggle('is-scrolled', window.scrollY > 6); }, { passive: true });

  /* ---------- popover ---------- */
  APP.popover = function (anchor, html, onClick) {
    $$('.pop').forEach((p) => p.remove());
    const pop = document.createElement('div'); pop.className = 'pop'; pop.setAttribute('role', 'menu'); pop.innerHTML = html; document.body.appendChild(pop); P.icons();
    const r = anchor.getBoundingClientRect(); const w = pop.offsetWidth;
    pop.style.top = (r.bottom + window.scrollY + 8) + 'px';
    pop.style.left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left + window.scrollX)) + 'px';
    if (G && !P.reduced) gsap.from(pop, { y: -10, scale: .95, opacity: 0, duration: .35, ease: 'back.out(2)', transformOrigin: 'top left' });
    const first = pop.querySelector('button, a'); first && first.focus();
    function close() { pop.remove(); document.removeEventListener('pointerdown', out, true); document.removeEventListener('keydown', key); }
    function out(e) { if (!pop.contains(e.target) && !anchor.contains(e.target)) close(); }
    function key(e) { if (e.key === 'Escape') { close(); anchor.focus(); } }
    setTimeout(() => { document.addEventListener('pointerdown', out, true); document.addEventListener('keydown', key); });
    pop.addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) { onClick && onClick(b.dataset.v, b); close(); } });
    return close;
  };

  /* ---------- swipe to action ---------- */
  APP.swipe = function (el, o) {
    const top = el.querySelector('.sw-top'); if (!top) return;
    let sx = 0, dx = 0, on = false, id = null;
    top.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && e.button !== 0) return; on = true; sx = e.clientX; dx = 0; id = e.pointerId; });
    const onMove = (e) => {
      if (!on || e.pointerId !== id) return; dx = e.clientX - sx;
      if (Math.abs(dx) > 8) { top.style.transform = `translateX(${dx}px) rotate(${dx / 60}deg)`; el.classList.toggle('to-right', dx > 0); }
    };
    const onUp = (e) => {
      if (!on || e.pointerId !== id) return; on = false;
      const w = el.offsetWidth;
      if (dx > w * .35 && o.onRight) { gsap.to(top, { x: w * 1.2, rotate: 12, duration: .35, ease: 'power2.in', onComplete: () => o.onRight(el) }); }
      else if (dx < -w * .35 && o.onLeft) { gsap.to(top, { x: -w * 1.2, rotate: -12, duration: .35, ease: 'power2.in', onComplete: () => o.onLeft(el) }); }
      else { top.style.transform = ''; if (G && Math.abs(dx) > 8) gsap.fromTo(top, { x: dx }, { x: 0, duration: .8, ease: 'elastic.out(1,.4)', clearProps: 'transform' }); }
      if (Math.abs(dx) > 8) { const stop = (ev) => { ev.preventDefault(); ev.stopPropagation(); }; top.addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => top.removeEventListener('click', stop, { capture: true }), 50); }
    };
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
    const off = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
    if (APP.track) APP.track(off);
    return off;
  };

  /* ---------- tiny charts ---------- */
  APP.bars = function (vals, labels, nowIdx) {
    const max = Math.max.apply(null, vals) || 1;
    return `<div class="bar-chart" role="img" aria-label="Bar chart: ${vals.join(', ')}">${vals.map((v, i) => `<div class="b ${i === (nowIdx == null ? vals.length - 1 : nowIdx) ? 'is-now' : ''}"><span>${v}</span><i style="height:${Math.max(6, v / max * 100)}%"></i><span class="muted">${labels ? labels[i] : ''}</span></div>`).join('')}</div>`;
  };
  APP.spark = function (vals, color) {
    const w = 300, h = 70, max = Math.max.apply(null, vals), min = Math.min.apply(null, vals);
    const pts = vals.map((v, i) => [i / (vals.length - 1) * (w - 10) + 5, h - 8 - ((v - min) / ((max - min) || 1)) * (h - 20)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${d} L ${w - 5} ${h} L 5 ${h} Z" fill="${color || '#FFC93C'}" opacity=".35"/><path d="${d}" fill="none" stroke="#1B1B1B" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>${pts.map((p, i) => i === pts.length - 1 ? `<circle cx="${p[0]}" cy="${p[1]}" r="6" fill="#FF5A36" stroke="#1B1B1B" stroke-width="3"/>` : '').join('')}</svg>`;
  };
  APP.animateBars = function (root) { if (!G || P.reduced) return; $$('.bar-chart .b i', root).forEach((b, i) => gsap.from(b, { scaleY: 0, duration: .45, ease: 'back.out(1.6)', delay: i * .03 })); };
  APP.countUp = function (root) { if (!G || P.reduced) return; $$('[data-count-up]', root).forEach((el) => { const end = parseFloat(el.dataset.countUp); const dec = (el.dataset.countUp.split('.')[1] || '').length; const o = { v: 0 }; gsap.to(o, { v: end, duration: .7, ease: 'power3.out', onUpdate: () => (el.textContent = (el.dataset.prefix || '') + o.v.toFixed(dec)) }); }); };
  APP.popIn = function (root, sel) { if (!G || P.reduced) return; const els = $$(sel || '.card, .mtile, .lrow', root).slice(0, 24); if (!els.length) return; gsap.fromTo(els, { y: 18, scale: .985 }, { y: 0, scale: 1, duration: .32, ease: 'back.out(1.4)', stagger: Math.min(.025, .12 / els.length), clearProps: 'transform' }); };
  APP.unhide = function (root) { $$('*', root).forEach((el) => { const st = el.style; if (st.opacity !== '' && parseFloat(st.opacity) < 1) st.opacity = 1; if (st.visibility === 'hidden') st.visibility = ''; }); if (G) gsap.set($$('.card, .mtile, .lrow, .swipe, .up-row, .inbox-card, .block, tr, .tl-item, .pick, .dogcard', root), { clearProps: 'transform' }); };

  /* ---------- command palette ---------- */
  APP.palette = function (getItems) {
    let root = null, sel = 0, list = [];
    function open() {
      if (root) return;
      const items = getItems();
      root = document.createElement('div'); root.className = 'cmdk-root';
      root.innerHTML = `<div class="modal-scrim" data-x></div><div class="cmdk" role="dialog" aria-modal="true" aria-label="Search and commands">
        <div class="cmdk-in">${P.ic('search')}<input type="text" placeholder="Search dogs, clients, videos, or jump to…" aria-label="Search" autocomplete="off"><span class="kbd">esc</span></div>
        <div class="cmdk-list" role="listbox" data-lenis-prevent></div>
        <div class="cmdk-foot"><span><span class="kbd">↑</span> <span class="kbd">↓</span> move</span><span><span class="kbd">↵</span> open</span><span><span class="kbd">⌘</span> <span class="kbd">K</span> toggle</span></div></div>`;
      document.body.appendChild(root); P.icons();
      const input = root.querySelector('input'), box = root.querySelector('.cmdk-list');
      function render(q) {
        q = (q || '').toLowerCase().trim();
        list = items.filter((it) => !q || (it.label + ' ' + (it.sub || '') + ' ' + (it.kw || '')).toLowerCase().includes(q)).slice(0, 40);
        sel = 0;
        let lastG = '';
        box.innerHTML = list.length ? list.map((it, i) => { const g = it.group !== lastG ? `<div class="cmdk-group">${it.group}</div>` : ''; lastG = it.group; return g + `<button class="cmdk-item ${i === 0 ? 'is-act' : ''}" role="option" data-i="${i}" type="button"><span class="ci">${it.img ? `<img src="${it.img}" alt="">` : P.ic(it.icon || 'arrow-right')}</span><span>${P.esc(it.label)}${it.sub ? `<small>${P.esc(it.sub)}</small>` : ''}</span><span class="hint">${it.hint || ''}</span></button>`; }).join('') : `<div class="empty" style="margin:8px"><h3>Nothing found</h3><p>Try a dog’s name, a client, or “review”.</p></div>`;
        P.icons();
      }
      function act(i) { const it = list[i]; if (!it) return; close(); setTimeout(() => it.run(), 10); }
      function move(d) { const bs = $$('.cmdk-item', box); if (!bs.length) return; bs[sel] && bs[sel].classList.remove('is-act'); sel = (sel + d + bs.length) % bs.length; bs[sel].classList.add('is-act'); bs[sel].scrollIntoView({ block: 'nearest' }); }
      input.addEventListener('input', () => render(input.value));
      input.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); move(1); } if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); } if (e.key === 'Enter') { e.preventDefault(); act(sel); } });
      box.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) act(+b.dataset.i); });
      root.addEventListener('click', (e) => { if (e.target.closest('[data-x]')) close(); });
      render('');
      if (G && !P.reduced) { gsap.from(root.querySelector('.cmdk'), { y: -30, scale: .95, opacity: 0, duration: .45, ease: 'back.out(2)' }); gsap.from(root.querySelector('.modal-scrim'), { opacity: 0, duration: .2 }); }
      setTimeout(() => input.focus(), 30);
    }
    function close() { if (!root) return; const r = root; root = null; if (G && !P.reduced) gsap.to(r, { opacity: 0, duration: .15, onComplete: () => r.remove() }); else r.remove(); }
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); root ? close() : open(); }
      else if (e.key === 'Escape' && root) close();
      else if (e.key === '/' && !root && !/input|textarea|select/i.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) { e.preventDefault(); open(); }
    });
    return { open, close };
  };

  /* ---------- helpers ---------- */
  APP.avatar = (name, img, cls) => img ? `<span class="avatar ${cls || ''}"><img src="${img}" alt=""></span>` : `<span class="avatar ${cls || ''}" style="background:${APP.colorFor(name)}">${P.esc(window.LINDA.initials(name))}</span>`;
  APP.colorFor = (s) => { const c = ['#FFC93C', '#8EC5FF', '#FFD6C9', '#CDB8FF', '#BDE7C9', '#FF8E72']; let h = 0; String(s).split('').forEach((ch) => (h = (h * 31 + ch.charCodeAt(0)) | 0)); return c[Math.abs(h) % c.length]; };
  APP.ago = (iso) => { const now = new Date('2026-10-17T14:00'); const d = (now - new Date(iso)) / 36e5; if (d < 1) return Math.max(1, Math.round(d * 60)) + 'm ago'; if (d < 24) return Math.round(d) + 'h ago'; if (d < 48) return 'yesterday'; return Math.round(d / 24) + 'd ago'; };
  APP.when = (iso) => { const L = window.LINDA; return L.fmtDate(iso, { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + L.fmtTime(iso); };
})();
