/* ==========================================================================
   V3 · app — tiny SPA framework shared by portal + admin
   Hash router, shell (sidebar / topbar / mobile tab bar), ⌘K palette,
   keyboard shortcuts, theme toggle, dropdown menus.
   ========================================================================== */
(function () {
  'use strict';
  const V3 = window.V3;
  const { $, $$, esc, icon } = V3;

  /* Dropdown menu ---------------------------------------------------------- */
  V3.menu = (anchor, items, { align = 'left' } = {}) => {
    V3.$$('.menu').forEach((m) => m.remove());
    const m = document.createElement('div');
    m.className = 'menu'; m.setAttribute('role', 'menu');
    m.innerHTML = items.map((it, i) => it === '-' ? '<hr>' : `<button type="button" role="menuitem" data-i="${i}" class="${it.selected ? 'sel' : ''}">${it.icon ? icon(it.icon) : ''}${it.html || esc(it.label)}${it.selected ? icon('check', 'check') : ''}</button>`).join('');
    document.body.appendChild(m);
    V3.icons(m);
    const r = anchor.getBoundingClientRect();
    const mw = m.offsetWidth;
    let left = align === 'right' ? r.right - mw : r.left;
    left = V3.clamp(left, 8, window.innerWidth - mw - 8);
    let top = r.bottom + 6;
    if (top + m.offsetHeight > window.innerHeight - 8) top = Math.max(8, r.top - m.offsetHeight - 6);
    m.style.left = left + 'px'; m.style.top = top + window.scrollY + 'px';
    m.style.position = 'absolute';
    const first = m.querySelector('button'); if (first) first.focus();
    const close = () => { m.remove(); document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', key, true); anchor.focus && anchor.focus(); };
    const outside = (e) => { if (!m.contains(e.target) && e.target !== anchor) close(); };
    const key = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const bs = $$('button', m); const i = bs.indexOf(document.activeElement); bs[(i + (e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length].focus(); }
    };
    setTimeout(() => { document.addEventListener('pointerdown', outside, true); document.addEventListener('keydown', key, true); });
    m.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (!b) return; const it = items[+b.dataset.i]; close(); if (it.run) it.run(); });
    return close;
  };

  /* Charts (tiny SVG helpers) --------------------------------------------- */
  V3.chart = {
    bars(values, { labels = [], h = 120, hi = values.length - 1, unit = '' } = {}) {
      const w = 320, pad = 18, max = Math.max(...values) * 1.15 || 1;
      const bw = (w - pad) / values.length;
      let s = `<svg class="chart" viewBox="0 0 ${w} ${h + 22}" role="img" aria-label="Bar chart: ${values.join(', ')}">`;
      [0.33, 0.66, 1].forEach((g) => { const y = h - h * g; s += `<line class="grid" x1="${pad}" x2="${w}" y1="${y}" y2="${y}"/>`; });
      s += `<text x="0" y="10">${Math.round(max)}</text><text x="0" y="${h}">0</text>`;
      values.forEach((v, i) => {
        const bh = Math.max(2, (v / max) * h);
        const x = pad + i * bw + bw * 0.18;
        s += `<g><title>${labels[i] || ''}: ${v}${unit}</title><rect class="bar${i === hi ? ' on' : ''}" x="${x}" y="${h - bh}" width="${bw * 0.64}" height="${bh}" rx="4"><animate attributeName="height" from="0" to="${bh}" dur=".8s" fill="freeze" calcMode="spline" keySplines=".16 1 .3 1"/><animate attributeName="y" from="${h}" to="${h - bh}" dur=".8s" fill="freeze" calcMode="spline" keySplines=".16 1 .3 1"/></rect></g>`;
        if (labels[i]) s += `<text x="${x + bw * 0.32}" y="${h + 16}" text-anchor="middle">${labels[i]}</text>`;
      });
      return s + '</svg>';
    },
    area(values, { h = 110, labels = [] } = {}) {
      const w = 320, max = Math.max(...values) * 1.15 || 1, step = w / (values.length - 1);
      const pts = values.map((v, i) => [i * step, h - (v / max) * h]);
      const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
      const id = V3.uid('ga');
      let s = `<svg class="chart" viewBox="0 0 ${w} ${h + 20}" role="img" aria-label="Trend chart"><defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#D4FF3A" stop-opacity=".55"/><stop offset="1" stop-color="#D4FF3A" stop-opacity="0"/></linearGradient></defs>`;
      [0.5, 1].forEach((g) => { s += `<line class="grid" x1="0" x2="${w}" y1="${h - h * g}" y2="${h - h * g}"/>`; });
      s += `<path d="${d} L${w} ${h} L0 ${h} Z" fill="url(#${id})"/><path class="stroke" d="${d}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"><animate attributeName="stroke-dashoffset" from="1" to="0" dur="1.2s" fill="freeze" calcMode="spline" keySplines=".16 1 .3 1"/></path>`;
      const last = pts[pts.length - 1];
      s += `<circle cx="${last[0]}" cy="${last[1]}" r="4" fill="var(--text)" stroke="var(--surface)" stroke-width="2"/>`;
      labels.forEach((l, i) => { if (l) s += `<text x="${Math.min(w - 10, Math.max(10, i * step))}" y="${h + 16}" text-anchor="middle">${l}</text>`; });
      return s + '</svg>';
    }
  };

  /* App ---------------------------------------------------------------- */
  V3.App = function (cfg) {
    const app = { cfg, cleanup: null, current: null };
    V3.app = app;
    document.documentElement.setAttribute('data-theme', V3.theme.get());

    /* Shell */
    const root = $('#app');
    const navHTML = () => cfg.nav.map((g) => `<div class="side__group">${g.group ? `<div class="side__label">${esc(g.group)}</div>` : ''}${g.items.map((it) => {
      const c = it.count ? it.count() : 0;
      return `<a class="nav-i" href="#/${it.id}" data-nav="${it.id}" title="${esc(it.label)}">${icon(it.icon)}<span class="txt">${esc(it.label)}</span>${c ? `<span class="count${it.hot ? ' count--hot' : ''}">${c}</span>` : it.short ? `<span class="short">${esc(it.short)}</span>` : ''}</a>`;
    }).join('')}</div>`).join('');
    root.innerHTML = `
      <div class="shell">
        <aside class="side" aria-label="Sidebar">
          <div class="side__brand"><a class="brand" href="/v3/index.html" aria-label="Linda’s Dog Training — public site"><span class="brand__mark"><i></i></span><span><span class="brand__name">Linda’s</span><span class="brand__sub">${esc(cfg.product)}</span></span></a><button class="icon-btn icon-btn--sm" type="button" data-theme-toggle aria-label="Toggle dark mode">${icon('moon')}</button></div>
          ${cfg.ctx ? `<button class="side__ctx" type="button" data-ctx>${cfg.ctx()}</button>` : ''}
          <button class="side__search" type="button" data-cmdk>${icon('search')}<span>Search or jump to…</span><span class="kbd">${navigator.platform && /Mac|iP/.test(navigator.platform) ? '⌘' : 'Ctrl'} K</span></button>
          ${cfg.sideTop ? cfg.sideTop() : ''}
          <nav aria-label="Main" data-sidenav>${navHTML()}</nav>
          <div class="side__foot">
            <button class="nav-i" type="button" data-shortcuts>${icon('keyboard')}<span class="txt">Shortcuts</span><span class="short">?</span></button>
            <a class="nav-i" href="/v3/index.html">${icon('arrow-up-left')}<span class="txt">Public site</span></a>
            <div class="side__user"><span class="avatar">${esc(cfg.user.initials)}</span><div><b>${esc(cfg.user.name)}</b><small>${esc(cfg.user.sub)}</small></div></div>
          </div>
        </aside>
        <div class="main">
          <header class="top">
            <a class="top__brand brand" href="/v3/index.html" aria-label="Public site"><span class="brand__mark"><i></i></span></a>
            <span class="top__title-m" data-title-m></span>
            <nav class="top__crumbs" aria-label="Breadcrumb" data-crumbs></nav>
            <div class="top__actions">
              ${cfg.topStatus ? `<span class="top__status" data-top-status>${cfg.topStatus()}</span>` : ''}
              ${cfg.topActions ? cfg.topActions() : ''}
              <button class="icon-btn" type="button" data-cmdk aria-label="Search (Command K)">${icon('search')}</button>
              <button class="icon-btn" type="button" data-theme-toggle aria-label="Toggle dark mode">${icon('moon')}</button>
            </div>
          </header>
          <main class="view" id="view" tabindex="-1" aria-live="polite"></main>
        </div>
        <nav class="tabbar" aria-label="Tabs" data-tabbar></nav>
      </div>
      <p class="sr-only" aria-live="polite" data-announce></p>`;
    app.view = $('#view');

    const renderTabs = () => {
      const tb = $('[data-tabbar]');
      tb.innerHTML = cfg.tabs.map((t) => {
        if (t.record) return `<a class="tabbar__rec" href="#/${t.id}" aria-label="${esc(t.label)}" data-tab="${t.id}"><span class="dotrec"></span></a>`;
        const c = t.count ? t.count() : 0;
        return `<a href="#/${t.id}" data-tab="${t.id}">${icon(t.icon)}<span>${esc(t.label)}</span>${c ? `<span class="badge-dot">${c}</span>` : ''}</a>`;
      }).join('');
    };
    renderTabs();
    app.refreshChrome = () => {
      $('[data-sidenav]').innerHTML = navHTML(); renderTabs();
      if (cfg.ctx) $('[data-ctx]').innerHTML = cfg.ctx();
      if (cfg.topStatus) $('[data-top-status]').innerHTML = cfg.topStatus();
      V3.icons(); markNav();
    };

    /* Theme */
    const themeIcons = () => $$('[data-theme-toggle]').forEach((b) => { b.innerHTML = icon(V3.theme.get() === 'dark' ? 'sun-medium' : 'moon'); b.setAttribute('aria-pressed', String(V3.theme.get() === 'dark')); });
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-theme-toggle]')) { V3.theme.toggle(); themeIcons(); V3.icons(); V3.toast(`${V3.theme.get() === 'dark' ? 'Dark' : 'Light'} mode`, { icon: V3.theme.get() === 'dark' ? 'moon' : 'sun-medium', duration: 1400 }); }
      if (e.target.closest('[data-cmdk]')) palette.open();
      if (e.target.closest('[data-shortcuts]')) shortcutsSheet();
      if (cfg.ctx && e.target.closest('[data-ctx]') && cfg.onCtx) cfg.onCtx(e.target.closest('[data-ctx]'));
      const row = e.target.closest('tr[data-href]');
      if (row && !e.target.closest('a, button, input, label')) location.hash = row.dataset.href;
    });
    document.addEventListener('keydown', (e) => { const row = e.target.closest && e.target.closest('tr[data-href]'); if (row && e.key === 'Enter') location.hash = row.dataset.href; });
    themeIcons();

    /* Router */
    const parse = () => {
      const h = location.hash.replace(/^#\/?/, '');
      const [path, qs] = h.split('?');
      return { parts: path.split('/').filter(Boolean), q: new URLSearchParams(qs || '') };
    };
    const match = (parts) => {
      for (const pattern of Object.keys(cfg.routes)) {
        const pp = pattern.split('/');
        if (pp.length !== parts.length) continue;
        const params = {}; let ok = true;
        pp.forEach((seg, i) => { if (seg.startsWith(':')) params[seg.slice(1)] = decodeURIComponent(parts[i]); else if (seg !== parts[i]) ok = false; });
        if (ok) return { fn: cfg.routes[pattern], params, pattern };
      }
      return null;
    };
    const markNav = () => {
      const key = app.current && app.current.nav;
      $$('[data-nav]').forEach((a) => { if (a.dataset.nav === key) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
      $$('[data-tab]').forEach((a) => { if (a.dataset.tab === key) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    };
    app.render = (keepScroll) => {
      const { parts, q } = parse();
      if (!parts.length) { location.replace('#/' + cfg.defaultRoute); return; }
      const m = match(parts);
      if (app.cleanup) { try { app.cleanup(); } catch (e) { /* noop */ } app.cleanup = null; }
      let out;
      if (!m) out = { title: 'Not found', html: `<div class="empty"><span class="empty__ico">${icon('compass')}</span><h3>That page doesn’t exist</h3><p>The link may be old. Try the search, or head back.</p><a class="btn btn--sm" href="#/${cfg.defaultRoute}">Go home</a></div>` };
      else out = m.fn(m.params, q) || {};
      app.current = Object.assign({ nav: parts[0] }, out, { parts });
      const y = window.scrollY;
      app.view.innerHTML = out.html || '';
      app.view.classList.remove('is-entering'); void app.view.offsetWidth;
      if (!keepScroll && !V3.reduced() && !out.noAnim && app.rendered) app.view.classList.add('is-entering');
      app.rendered = true;
      document.title = `${out.title || ''} · ${cfg.titleSuffix}`;
      const crumbs = out.crumbs || [{ label: out.title }];
      $('[data-crumbs]').innerHTML = `<span class="mono" style="color:var(--text-3)">${esc(cfg.product)}</span>` + crumbs.map((c) => `<span class="sep">/</span>${c.href ? `<a href="${c.href}">${esc(c.label)}</a>` : `<b>${esc(c.label)}</b>`}`).join('');
      $('[data-title-m]').textContent = out.mtitle || out.title || '';
      $('[data-announce]').textContent = out.title || '';
      markNav();
      V3.icons(app.view);
      V3.lazyVideos(app.view);
      V3.hoverPlay(app.view);
      V3.accordion(app.view);
      if (out.mount) { const c = out.mount(app.view, q); if (typeof c === 'function') app.cleanup = c; }
      V3.icons(app.view);
      if (keepScroll) window.scrollTo(0, y); else { window.scrollTo(0, 0); app.view.focus({ preventScroll: true }); }
    };
    app.refresh = () => app.render(true);
    app.go = (h) => { if (location.hash === h) app.render(); else location.hash = h; };
    window.addEventListener('hashchange', () => app.render());

    /* Command palette */
    const palette = (() => {
      let rootEl, items = [], sel = 0, lastFocus;
      const build = () => {
        const base = [];
        cfg.nav.forEach((g) => g.items.forEach((it) => base.push({ group: 'Go to', label: it.label, icon: it.icon, href: '#/' + it.id, hint: it.short })));
        base.push({ group: 'Actions', label: `Switch to ${V3.theme.get() === 'dark' ? 'light' : 'dark'} mode`, icon: 'contrast', run: () => { V3.theme.toggle(); themeIcons(); V3.icons(); } });
        base.push({ group: 'Actions', label: 'Keyboard shortcuts', icon: 'keyboard', run: shortcutsSheet, hint: '?' });
        base.push({ group: 'Actions', label: 'Open public site', icon: 'globe', run: () => { location.href = '/v3/index.html'; } });
        return (cfg.palette ? cfg.palette() : []).concat(base);
      };
      const hl = (text, q) => {
        if (!q) return esc(text);
        const t = String(text); const lq = q.toLowerCase(); const i = t.toLowerCase().indexOf(lq);
        if (i >= 0) return esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length));
        let out = '', qi = 0;
        for (const ch of t) { if (qi < lq.length && ch.toLowerCase() === lq[qi]) { out += '<mark>' + esc(ch) + '</mark>'; qi++; } else out += esc(ch); }
        return out;
      };
      const draw = (q) => {
        const all = build();
        const scored = all.map((it) => ({ it, s: V3.fuzzy(q, it.label + ' ' + (it.sub || '') + ' ' + (it.keywords || '')) })).filter((x) => x.s > 0);
        if (q) scored.sort((a, b) => b.s - a.s);
        items = scored.slice(0, 40).map((x) => x.it);
        sel = Math.min(sel, Math.max(0, items.length - 1));
        const list = $('.cmdk__list', rootEl);
        if (!items.length) { list.innerHTML = `<div class="cmdk__empty">${icon('search-x')}<p style="margin-top:8px">No results for “${esc(q)}”</p></div>`; V3.icons(list); return; }
        let html = '', lastG = null;
        items.forEach((it, i) => {
          const g = q ? (i === 0 ? 'Top results' : null) : it.group;
          if (g && g !== lastG) { html += `<div class="cmdk__grp">${esc(g)}</div>`; lastG = g; }
          html += `<button type="button" class="cmdk__item" role="option" id="cmdk-${i}" data-i="${i}" aria-selected="${i === sel}"><span class="ic">${it.img ? `<img src="${esc(it.img)}" alt="">` : icon(it.icon || 'corner-down-right')}</span><span>${hl(it.label, q)}${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span>${it.hint ? `<span class="hint">${it.hint.split(' ').map((k) => `<span class="kbd">${esc(k)}</span>`).join('')}</span>` : ''}</button>`;
        });
        list.innerHTML = html;
        V3.icons(list);
        $('input', rootEl).setAttribute('aria-activedescendant', 'cmdk-' + sel);
      };
      const move = (d) => { if (!items.length) return; sel = (sel + d + items.length) % items.length; $$('.cmdk__item', rootEl).forEach((b) => b.setAttribute('aria-selected', String(+b.dataset.i === sel))); const cur = $(`#cmdk-${sel}`, rootEl); if (cur) cur.scrollIntoView({ block: 'nearest' }); $('input', rootEl).setAttribute('aria-activedescendant', 'cmdk-' + sel); };
      const exec = (it) => { close(); if (!it) return; if (it.run) it.run(); else if (it.href) { if (it.href.startsWith('#')) app.go(it.href); else location.href = it.href; } };
      const open = () => {
        if (rootEl) return;
        lastFocus = document.activeElement;
        rootEl = document.createElement('div');
        rootEl.className = 'cmdk-root';
        rootEl.innerHTML = `<div class="cmdk-scrim" data-x></div><div class="cmdk" role="dialog" aria-modal="true" aria-label="Command palette"><div class="cmdk__in">${icon('search')}<input type="text" placeholder="Search dogs, households, videos, pages…" aria-label="Search" role="combobox" aria-expanded="true" aria-controls="cmdk-list" autocomplete="off" spellcheck="false"><span class="kbd">esc</span></div><div class="cmdk__list" id="cmdk-list" role="listbox"></div><div class="cmdk__foot"><span><span class="kbd">↑</span><span class="kbd">↓</span> navigate</span><span><span class="kbd">↵</span> open</span><span><span class="kbd">esc</span> close</span><span style="margin-left:auto" class="mono">${esc(cfg.product)}</span></div></div>`;
        document.body.appendChild(rootEl);
        V3.icons(rootEl);
        const input = $('input', rootEl);
        sel = 0; draw('');
        requestAnimationFrame(() => { rootEl.classList.add('is-open'); input.focus(); });
        input.addEventListener('input', () => { sel = 0; draw(input.value.trim()); });
        input.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
          else if (e.key === 'Enter') { e.preventDefault(); exec(items[sel]); }
          else if (e.key === 'Escape') { e.preventDefault(); close(); }
          else if (e.key === 'Tab') e.preventDefault();
        });
        rootEl.addEventListener('click', (e) => { if (e.target.closest('[data-x]')) close(); const b = e.target.closest('[data-i]'); if (b) exec(items[+b.dataset.i]); });
        rootEl.addEventListener('pointermove', (e) => { const b = e.target.closest('[data-i]'); if (b && +b.dataset.i !== sel) { sel = +b.dataset.i - 0; move(0); } });
      };
      const close = () => { if (!rootEl) return; const r = rootEl; rootEl = null; r.classList.remove('is-open'); setTimeout(() => r.remove(), 250); if (lastFocus && lastFocus.focus) lastFocus.focus(); };
      return { open, close, get isOpen() { return !!rootEl; } };
    })();
    app.palette = palette;

    /* Shortcuts */
    const shortcutsSheet = () => {
      const rows = [['⌘ K', 'Command palette'], ['/', 'Search'], ['?', 'This sheet'], ['T', 'Toggle dark mode']].concat((cfg.shortcuts || []).map((s) => [s.keys, s.label]));
      V3.modal({ title: 'Keyboard shortcuts', label: 'Shortcuts', wide: true, body: `<div class="keys">${rows.map(([k, l]) => `<div><span>${esc(l)}</span><span class="k">${k.split(' ').map((x, i) => (i ? '<em>then</em>' : '') + `<span class="kbd">${esc(x)}</span>`).join('')}</span></div>`).join('')}</div>` });
    };
    app.shortcutsSheet = shortcutsSheet;
    let gPending = null, gTimer, gHint;
    const typing = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette.isOpen ? palette.close() : palette.open(); return; }
      if (palette.isOpen || typing(e.target) || e.metaKey || e.ctrlKey || e.altKey || $('.modal-root') || $('.camera')) return;
      const k = e.key.toLowerCase();
      if (gPending) {
        const s = (cfg.shortcuts || []).find((x) => x.keys.toLowerCase() === 'g ' + k);
        clearTimeout(gTimer); gPending = null; if (gHint) { gHint.remove(); gHint = null; }
        if (s) { e.preventDefault(); s.run(); }
        return;
      }
      if (e.key === '?') { e.preventDefault(); shortcutsSheet(); return; }
      if (k === '/') { e.preventDefault(); palette.open(); return; }
      if (k === 't') { V3.theme.toggle(); themeIcons(); V3.icons(); return; }
      if (k === 'g') {
        gPending = true;
        gHint = document.createElement('div'); gHint.className = 'g-pending'; gHint.innerHTML = `<span class="kbd">G</span> then… ${(cfg.shortcuts || []).filter((x) => x.keys.startsWith('G ')).slice(0, 6).map((x) => `<span class="kbd">${x.keys.slice(2)}</span> ${esc(x.label.replace(/^Go to /, ''))}`).join(' · ')}`;
        document.body.appendChild(gHint);
        gTimer = setTimeout(() => { gPending = null; if (gHint) { gHint.remove(); gHint = null; } }, 1500);
        return;
      }
      const s = (cfg.shortcuts || []).find((x) => x.keys.toLowerCase() === k);
      if (s) { e.preventDefault(); s.run(); }
    });

    V3.pageTransitions();
    V3.icons();
    app.render();
    return app;
  };
})();
