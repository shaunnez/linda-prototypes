/* ==========================================================================
   V3 · site — shared marketing behaviour + inner page controllers
   ========================================================================== */
(function () {
  'use strict';
  const V3 = window.V3;
  const { $, $$, esc, icon } = V3;
  const db = V3.db;
  const page = document.body.dataset.page || '';
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  const RM = V3.reduced();
  if (RM) document.documentElement.classList.add('rm');
  if (!hasGSAP) document.documentElement.classList.add('no-gsap');

  /* ------------------------------------------------------------------ */
  /* Nav + mobile menu + footer (injected for consistency)               */
  /* ------------------------------------------------------------------ */
  const NAV = [
    { href: '/v3/academy.html', label: 'Academy', key: 'academy' },
    { href: '/v3/about.html', label: 'About', key: 'about' },
    { href: '/v3/blog.html', label: 'Journal', key: 'blog' },
    { href: '/v3/faq.html', label: 'FAQ', key: 'faq' },
    { href: '/v3/contact.html', label: 'Contact', key: 'contact' }
  ];
  const navKey = { guide: 'academy', article: 'blog' }[page] || page;
  const brandHTML = `<a class="brand" href="/v3/index.html" aria-label="Linda’s Dog Training — home"><span class="brand__mark"><i></i></span><span><span class="brand__name">Linda’s</span><span class="brand__sub">Dog Training</span></span></a>`;

  function renderNav() {
    const el = $('[data-nav]');
    if (!el) return;
    el.classList.add('nav');
    el.innerHTML = `<div class="nav__bar">
        ${brandHTML}
        <nav class="nav__links" aria-label="Primary">${NAV.map((n) => `<a href="${n.href}"${n.key === navKey ? ' aria-current="page"' : ''}>${n.label}</a>`).join('')}</nav>
        <div class="nav__cta">
          <a class="btn btn--ghost btn--sm hide-m" href="/v3/login.html" data-magnetic>Log in</a>
          <a class="btn btn--sm" href="/v3/admin/index.html" data-magnetic>Trainer demo ${icon('arrow-up-right', 'btn-arrow')}</a>
          <button class="nav__burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mmenu"><span></span><span></span></button>
        </div>
      </div>`;
    const mm = document.createElement('div');
    mm.className = 'mmenu'; mm.id = 'mmenu';
    mm.setAttribute('aria-label', 'Menu');
    mm.innerHTML = `<nav class="mmenu__list" aria-label="Mobile">
        ${[{ href: '/v3/index.html', label: 'Home' }].concat(NAV).concat([{ href: '/v3/portal/index.html', label: 'Client portal' }]).map((n, i) => `<a href="${n.href}" style="transition-delay:${0.15 + i * 0.05}s"><span class="mono">0${i + 1}</span><em style="transition-delay:${0.15 + i * 0.05}s">${n.label}</em></a>`).join('')}
      </nav>
      <div class="mmenu__foot">
        <div class="row"><a class="btn btn--ghost" href="/v3/login.html">Log in</a><a class="btn btn--accent" href="/v3/admin/index.html">Trainer demo</a></div>
        <p class="mono muted">${esc(window.LINDA.brand.region)} · ${esc(window.LINDA.brand.email)}</p>
      </div>`;
    el.after(mm);
    const burger = $('.nav__burger', el);
    burger.addEventListener('click', () => {
      const open = !document.body.classList.contains('menu-open');
      document.body.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (V3.lenis) open ? V3.lenis.stop() : V3.lenis.start();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) burger.click(); });

    // Scroll state
    let last = 0;
    const onScroll = () => {
      const y = window.scrollY;
      el.classList.toggle('is-scrolled', y > 16);
      if (!document.body.classList.contains('menu-open')) el.classList.toggle('is-hidden', y > 480 && y > last + 2);
      if (y < last - 2) el.classList.remove('is-hidden');
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function renderFooter() {
    const el = $('[data-footer]');
    if (!el) return;
    el.classList.add('footer');
    const B = window.LINDA.brand;
    el.innerHTML = `<div class="wrap">
      <div class="footer__grid">
        <div class="footer__col footer__intro">
          <span class="label">Field notes · ${esc(B.region)}</span>
          <p>${esc(B.tagline)}</p>
          <div class="footer__clock"><span class="rec-dot"></span><span>Auckland <span data-clock>--:--:--</span> NZT</span></div>
        </div>
        <div class="footer__col"><h4 class="label">Site</h4><ul role="list">
          <li><a href="/v3/index.html">Home</a></li><li><a href="/v3/about.html">About Linda</a></li><li><a href="/v3/academy.html">Training Academy</a></li><li><a href="/v3/guide/recall-101.html">Recall 101</a></li><li><a href="/v3/blog.html">Journal</a></li><li><a href="/v3/faq.html">FAQ</a></li><li><a href="/v3/contact.html">Contact</a></li>
        </ul></div>
        <div class="footer__col"><h4 class="label">Product demos</h4><ul role="list">
          <li><a href="/v3/portal/index.html">Client portal</a></li><li><a href="/v3/admin/index.html">Trainer workspace</a></li><li><a href="/v3/admin/index.html#/record">Record flow</a></li><li><a href="/v3/admin/index.html#/review">Review queue</a></li><li><a href="/v3/admin/index.html#/share">Share composer</a></li><li><a href="/v3/login.html">Log in</a></li>
        </ul></div>
        <div class="footer__col"><h4 class="label">Contact</h4><ul role="list">
          <li><a href="mailto:${esc(B.email)}">${esc(B.email)}</a></li><li><a href="/v3/contact.html">Send an enquiry</a></li><li><span class="muted" style="font-size:14px">${esc(B.note)}</span></li>
        </ul></div>
      </div>
      <div class="footer__word" aria-hidden="true"><span>Linda’s</span></div>
      <div class="footer__legal mono"><span>© 2026 Linda’s Dog Training (working title)</span><span>Every video starts private</span><span>Prototype v3 · Field Notes</span></div>
    </div>`;
    const clock = $('[data-clock]', el);
    const tick = () => { try { clock.textContent = new Date().toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland', hour12: false }); } catch (e) { clock.textContent = new Date().toLocaleTimeString(); } };
    tick(); setInterval(tick, 1000);
  }

  /* ------------------------------------------------------------------ */
  /* Lenis + GSAP setup                                                   */
  /* ------------------------------------------------------------------ */
  function setupScroll() {
    if (!hasGSAP) return;
    gsap.registerPlugin(ScrollTrigger);
    if (window.SplitText) gsap.registerPlugin(SplitText);
    if (window.Flip) gsap.registerPlugin(Flip);
    if (window.Draggable) gsap.registerPlugin(Draggable);
    if (window.ScrollToPlugin) gsap.registerPlugin(ScrollToPlugin);
    if (!RM && window.Lenis && page !== 'login') {
      const lenis = new Lenis({ lerp: 0.105, smoothWheel: true, wheelMultiplier: 1 });
      V3.lenis = lenis;
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      document.addEventListener('click', (e) => {
        const a = e.target.closest('a[href^="#"]');
        if (!a || a.getAttribute('href').length < 2) return;
        const t = document.querySelector(a.getAttribute('href'));
        if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -90, duration: 1.4 }); }
      });
    }
    // Nav colour over dark sections
    const nav = $('.nav');
    $$('.is-dark, [data-nav-dark]').forEach((sec) => {
      ScrollTrigger.create({ trigger: sec, start: 'top 40px', end: 'bottom 40px', onToggle: (s) => nav && nav.classList.toggle('is-dark', s.isActive) });
    });
  }

  /* SplitText line reveals */
  V3.splitReveal = function (el, opts = {}) {
    if (!hasGSAP || !window.SplitText || RM) { el.classList.add('is-split'); return null; }
    let tween;
    SplitText.create(el, {
      type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
      onSplit(self) {
        el.classList.add('is-split');
        tween = gsap.from(self.lines, Object.assign({ yPercent: 115, duration: 1.15, ease: 'expo.out', stagger: 0.085 }, opts.manual ? { paused: true } : { scrollTrigger: { trigger: el, start: opts.start || 'top 88%', once: true } }));
        el._splitTween = tween;
        return tween;
      }
    });
    return el;
  };
  function setupReveals() {
    if (!hasGSAP || RM) return;
    const go = () => {
      $$('[data-split]').forEach((el) => { if (el.dataset.split !== 'manual') V3.splitReveal(el); });
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 88%', once: true,
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, overwrite: true })
    });
    ScrollTrigger.batch('[data-clip]', {
      start: 'top 88%', once: true,
      onEnter: (els) => gsap.fromTo(els, { clipPath: 'inset(100% 0% 0% 0% round 20px)' }, { clipPath: 'inset(0% 0% 0% 0% round 20px)', duration: 1.3, ease: 'expo.inOut', stagger: 0.1, onComplete: () => els.forEach((e) => { e.classList.add('is-clipped-in'); e.style.clipPath = ''; }) })
    });
  }

  /* Safety net: anything still hidden ~1s after entering the viewport is forced visible. */
  V3.revealSafety = function (root = document) {
    if (!('IntersectionObserver' in window)) return;
    const force = (el) => {
      if (el.matches('[data-split]')) {
        if (el._splitTween) el._splitTween.progress(1);
        el.classList.add('is-split');
        $$('.split-line', el).forEach((l) => { if (window.gsap) gsap.set(l, { yPercent: 0, clearProps: 'transform' }); });
      }
      if (el.matches('[data-reveal]') && parseFloat(getComputedStyle(el).opacity) < 0.95) { if (window.gsap) gsap.to(el, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', overwrite: true }); else { el.style.opacity = 1; el.style.transform = 'none'; } }
      if (el.matches('[data-clip]') && !el.classList.contains('is-clipped-in')) { el.style.clipPath = ''; el.classList.add('is-clipped-in'); }
    };
    const timers = new WeakMap();
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      const el = en.target;
      if (en.isIntersecting) { if (!timers.has(el)) timers.set(el, setTimeout(() => { force(el); io.unobserve(el); }, 1000)); }
      else if (timers.has(el)) { clearTimeout(timers.get(el)); timers.delete(el); }
    }), { threshold: 0.01 });
    $$('[data-reveal], [data-split]:not([data-split="manual"]), [data-clip]', root).forEach((el) => { if (!el.dataset.safety) { el.dataset.safety = 1; io.observe(el); } });
  };

  /* ------------------------------------------------------------------ */
  /* Crosshair cursor (desktop only) + magnetic buttons                  */
  /* ------------------------------------------------------------------ */
  function setupCursor() {
    if (!V3.fine() || RM) return;
    document.documentElement.classList.add('has-cursor');
    const c = document.createElement('div');
    c.className = 'cursor is-hidden';
    c.setAttribute('aria-hidden', 'true');
    c.innerHTML = '<div class="cursor__frame"><i class="cursor__c cursor__c--tl"></i><i class="cursor__c cursor__c--tr"></i><i class="cursor__c cursor__c--bl"></i><i class="cursor__c cursor__c--br"></i></div><i class="cursor__dot"></i><span class="cursor__xy"></span>';
    document.body.appendChild(c);
    const frame = c.querySelector('.cursor__frame'), dot = c.querySelector('.cursor__dot'), xy = c.querySelector('.cursor__xy');
    let mx = -100, my = -100, fx = -100, fy = -100, fw = 22, fh = 22, target = null;
    const SEL = 'a, button, [role="button"], label.check, label.switch, .chip, [data-cursor], summary, select';
    window.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; c.classList.remove('is-hidden'); }, { passive: true });
    document.addEventListener('pointerover', (e) => { const t = e.target.closest(SEL); target = t && !t.closest('[data-no-snap]') ? t : null; c.classList.toggle('is-snapped', !!target); });
    document.addEventListener('pointerleave', () => c.classList.add('is-hidden'));
    window.addEventListener('pointerdown', () => c.classList.add('is-down'));
    window.addEventListener('pointerup', () => c.classList.remove('is-down'));
    const loop = () => {
      let tx = mx, ty = my, tw = 22, th = 22;
      if (target && target.isConnected) {
        const r = target.getBoundingClientRect();
        tx = r.left + r.width / 2; ty = r.top + r.height / 2; tw = r.width + 12; th = r.height + 12;
        // slight pull toward pointer
        tx += (mx - tx) * 0.08; ty += (my - ty) * 0.08;
      }
      fx += (tx - fx) * 0.22; fy += (ty - fy) * 0.22; fw += (tw - fw) * 0.22; fh += (th - fh) * 0.22;
      frame.style.transform = `translate(${fx - fw / 2}px, ${fy - fh / 2}px)`;
      frame.style.width = fw + 'px'; frame.style.height = fh + 'px';
      dot.style.transform = `translate(${mx}px, ${my}px)`;
      xy.style.transform = `translate(${mx + 16}px, ${my + 14}px)`;
      xy.textContent = `${String(Math.round(mx)).padStart(4, '0')} · ${String(Math.round(my)).padStart(4, '0')}`;
      requestAnimationFrame(loop);
    };
    frame.style.left = '0'; frame.style.top = '0';
    requestAnimationFrame(loop);
  }
  V3.magnetic = function (root = document) {
    if (!V3.fine() || RM || !hasGSAP) return;
    $$('[data-magnetic]', root).forEach((el) => {
      if (el.dataset.magBound) return; el.dataset.magBound = 1;
      const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
      el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * 0.28); yTo((e.clientY - r.top - r.height / 2) * 0.35); });
      el.addEventListener('pointerleave', () => { gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' }); });
    });
  };

  /* ------------------------------------------------------------------ */
  /* Shared renderers                                                     */
  /* ------------------------------------------------------------------ */
  V3.guideHref = (g) => `/v3/guide/recall-101.html${g.slug === 'recall-101' ? '' : `?g=${encodeURIComponent(g.slug)}`}`;
  V3.guideCard = (g, feature) => {
    const t = V3.technique(g.technique) || {};
    return `<a class="gcard${feature ? ' gcard--feature' : ''}" href="${V3.guideHref(g)}" data-tech="${esc(g.technique)}" data-title="${esc(g.title)}">
      <div class="hv" data-hover-video>
        <img src="${esc(g.hero)}" alt="" loading="lazy">
        <video muted playsinline loop preload="none" data-src="${V3.vid(g.clip)}" poster="${esc(g.hero)}" data-hoverplay></video>
        <span class="hv__chip pill pill--glass pill--mono"><i style="width:6px;height:6px;border-radius:2px;background:${esc(t.color)}"></i>${esc(t.name || '')}</span>
        <span class="hv__play">${icon('play')}</span>
      </div>
      <span class="gcard__go">${icon('arrow-up-right')}</span>
      <div class="gcard__body">
        <div class="gcard__meta mono"><span>${esc(g.level)}</span><i class="dot"></i><span>${g.minutes} min read</span>${g.status !== 'published' ? '<i class="dot"></i><span>In draft</span>' : ''}</div>
        <h3>${esc(g.title)}</h3>
        <p>${esc(g.subtitle)}</p>
      </div>
    </a>`;
  };

  /* ------------------------------------------------------------------ */
  /* Page controllers                                                     */
  /* ------------------------------------------------------------------ */
  const pages = {};

  /* Academy ------------------------------------------------------------ */
  pages.academy = () => {
    const grid = $('#guide-grid'), chips = $('#tech-filters'), search = $('#guide-search'), count = $('#guide-count');
    const published = db.guides.filter((g) => g.status === 'published');
    const used = [...new Set(published.map((g) => g.technique))];
    chips.innerHTML = `<button class="chip" type="button" aria-pressed="true" data-f="all">All guides</button>` +
      db.techniques.filter((t) => used.includes(t.id)).map((t) => `<button class="chip" type="button" aria-pressed="false" data-f="${t.id}" style="--c:${t.color}"><span class="dot"></span>${esc(t.name)}</button>`).join('');
    grid.innerHTML = published.map((g, i) => V3.guideCard(g, i === 0)).join('') +
      `<div class="empty" id="guide-empty" hidden style="grid-column:1/-1"><span class="empty__ico">${icon('search-x')}</span><h3>No guides match</h3><p>Try another technique or clear the search.</p></div>`;
    $('#tech-index').innerHTML = db.techniques.map((t, i) => {
      const n = published.filter((g) => g.technique === t.id).length;
      return `<button type="button" data-jump="${t.id}" style="--c:${t.color}"><span class="row" style="justify-content:space-between"><span class="sw">${icon(t.icon)}</span><span class="mono muted">${String(i + 1).padStart(2, '0')}</span></span><b>${esc(t.name)}</b><p>${esc(t.blurb)}</p><span class="mono muted">${n ? `${n} guide${n > 1 ? 's' : ''}` : 'Guide coming soon'}</span></button>`;
    }).join('');
    let f = 'all';
    const apply = () => {
      const q = search.value.trim();
      const cards = $$('.gcard', grid);
      const state = window.Flip && !RM ? Flip.getState(cards) : null;
      let shown = 0;
      cards.forEach((c) => {
        const ok = (f === 'all' || c.dataset.tech === f) && (!q || V3.fuzzy(q, c.dataset.title + ' ' + c.textContent) > 0);
        c.hidden = !ok; if (ok) shown++;
        c.classList.toggle('gcard--feature', false);
      });
      const firstVisible = cards.find((c) => !c.hidden);
      if (firstVisible && f === 'all' && !q) firstVisible.classList.add('gcard--feature');
      $('#guide-empty').hidden = shown > 0;
      count.textContent = `${String(shown).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
      if (state) Flip.from(state, { duration: 0.7, ease: 'expo.out', absolute: true, onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.6 }), onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.96, duration: 0.3 }) });
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    };
    chips.addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (!b) return; f = b.dataset.f; $$('[data-f]', chips).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); apply(); });
    search.addEventListener('input', V3.debounce(apply, 120));
    $('#tech-index').addEventListener('click', (e) => {
      const b = e.target.closest('[data-jump]'); if (!b) return;
      const chip = $(`[data-f="${b.dataset.jump}"]`, chips);
      if (chip) { chip.click(); } else { V3.toast(`${esc(V3.technique(b.dataset.jump).name)} guide is being written`, { type: 'info', sub: 'Phase 2 · Academy' }); return; }
      const top = $('#guides').getBoundingClientRect().top + window.scrollY - 90;
      if (V3.lenis) V3.lenis.scrollTo(top); else window.scrollTo({ top, behavior: 'smooth' });
    });
    apply();
    V3.hoverPlay(grid);
  };

  /* Guide detail (Recall 101 + other guides by ?g=) --------------------- */
  pages.guide = () => {
    const slug = new URLSearchParams(location.search).get('g') || 'recall-101';
    const g = V3.guide(slug) || V3.guide('recall-101');
    const t = V3.technique(g.technique) || {};
    document.title = `${g.title} — Training Academy · Linda’s Dog Training`;
    $('#g-title').textContent = g.title;
    $('#g-sub').textContent = g.subtitle;
    $('#g-crumb').textContent = g.title;
    $('#g-media').innerHTML = `<video muted playsinline autoplay loop preload="metadata" poster="${esc(g.hero)}" src="${V3.vid(g.clip)}"></video>
      <div class="letterbox__hud"><span class="mono tl">GUIDE · ${esc(g.id.toUpperCase())}</span><span class="mono tr"><span class="rec-dot"></span> PLAYING</span><span class="mono bl">${esc(t.name || '')}</span><span class="mono br">CLIP ${g.clip}</span></div>`;
    $('#g-meta').innerHTML = `<div><span class="label">Technique</span><b>${esc(t.name || '')}</b></div><div><span class="label">Level</span><b>${esc(g.level)}</b></div><div><span class="label">Reading time</span><b>${g.minutes} min</b></div><div><span class="label">Status</span><b>${g.status === 'published' ? 'Published' : 'In draft'}</b></div>`;
    const body = $('#g-body');
    const sections = g.sections || [
      { h: 'Overview', body: `${g.subtitle} ${t.blurb || ''}` },
      { h: 'Full guide in progress', draft: true }
    ];
    let html = '';
    const toc = [];
    sections.forEach((s, i) => {
      const id = 's-' + i;
      toc.push({ id, h: s.h });
      html += `<section class="gsec" id="${id}" data-gsec><div class="gsec__h"><span class="mono">${String(i + 1).padStart(2, '0')}</span><h2>${esc(s.h)}</h2></div>`;
      if (s.body) html += `<p>${esc(s.body)}</p>`;
      if (s.steps) html += `<ol class="gsteps list-reset">${s.steps.map((st, j) => `<li class="gstep" data-reveal><span class="gstep__n">${String(j + 1).padStart(2, '0')}</span><p>${esc(st)}</p></li>`).join('')}</ol>`;
      if (s.list) html += `<div class="mistakes">${s.list.map((m) => `<div class="mistake" data-reveal>${icon('x')}<span>${esc(m)}</span></div>`).join('')}</div>`;
      if (s.h === 'Reward timing') html += `<div class="callout">${icon('lightbulb')}<p><strong style="color:#fff">Linda’s note:</strong> <span class="ph" style="color:#D8DAD5">[Linda to add her own tip — to be supplied]</span></p></div>`;
      if (s.draft) html += `<div class="ph-block"><span class="mono">[ Full guide — Linda is still writing this one ]</span><p class="muted" style="max-width:44ch">Steps, video examples and homework will appear here once Linda publishes the guide from the Academy CMS.</p></div>`;
      html += `</section>`;
    });
    if (g.sections) {
      // Trainer-approved video examples: only published_public media is eligible for the public site.
      const pub = db.media.filter((m) => m.editorial === 'published_public');
      toc.push({ id: 's-examples', h: 'Video examples' });
      html += `<section class="gsec" id="s-examples" data-gsec><div class="gsec__h"><span class="mono">${String(toc.length).padStart(2, '0')}</span><h2>Trainer-approved video examples</h2></div>
        <div class="examples">
          <div class="example" data-hover-video><img src="${V3.img(g.clip, 40)}" alt="Dachshund sprinting back to its owner across a park" loading="lazy"><video muted playsinline loop preload="none" data-src="${V3.vid(g.clip)}" data-hoverplay></video><div class="example__cap"><span>Recall from a distance — guide demonstration</span><span class="mono">Licensed</span></div></div>
          ${pub.map((m) => `<div class="example" data-hover-video><img src="${V3.img(m.clip, 40)}" alt="${esc(m.title)}" loading="lazy"><video muted playsinline loop preload="none" data-src="${V3.vid(m.clip)}" data-hoverplay></video><div class="example__cap"><span>${esc(m.title)}</span><span class="mono">Public · consent on file</span></div></div>`).join('')}
        </div>
        <p class="mono muted" style="margin-top:14px">Only clips with a public edition and recorded consent can appear here. Private session videos never do.</p></section>`;
      toc.push({ id: 's-homework', h: 'Homework' });
      html += `<section class="gsec" id="s-homework" data-gsec><div class="gsec__h"><span class="mono">${String(toc.length).padStart(2, '0')}</span><h2>Homework checklist</h2></div>
        <div class="homework"><div class="homework__list" id="hw-list"></div>
        <div class="homework__side"><div class="ring ring--lime" style="--s:96px;--w:4" id="hw-ring"><svg viewBox="0 0 36 36"><circle class="ring__bg" cx="18" cy="18" r="15.9155"/><circle class="ring__fg" cx="18" cy="18" r="15.9155" pathLength="100" style="stroke:var(--graphite)"/></svg><span class="ring__label" id="hw-label">0/0</span></div>
        <button class="btn btn--ghost btn--sm" type="button" id="hw-dl">${icon('download')} Download checklist</button></div></div></section>`;
      toc.push({ id: 's-faq', h: 'FAQ' });
      html += `<section class="gsec" id="s-faq" data-gsec><div class="gsec__h"><span class="mono">${String(toc.length).padStart(2, '0')}</span><h2>Questions owners ask</h2></div>
        <div class="acc">${(g.faqs || []).map((f, i) => `<div class="acc__item"><button class="acc__btn" type="button" aria-expanded="false" aria-controls="gfaq-${i}">${esc(f.q)}<span class="acc__ico"></span></button><div class="acc__panel" id="gfaq-${i}" role="region"><div><p>${esc(f.a)}</p></div></div></div>`).join('')}</div></section>`;
    }
    body.innerHTML = html;
    $('#g-toc').innerHTML = `<span class="label">On this page</span><div class="toc__prog"><i id="toc-prog"></i></div>` + toc.map((x, i) => `<a href="#${x.id}" data-toc="${x.id}"><span class="mono">${String(i + 1).padStart(2, '0')}</span><span>${esc(x.h)}</span></a>`).join('');
    // Homework
    const hw = g.homework || [];
    if ($('#hw-list')) {
      const key = 'hw-guide-' + g.slug;
      const done = V3.store.get(key, []);
      $('#hw-list').innerHTML = hw.map((h, i) => `<label class="check"><input type="checkbox" data-i="${i}"${done.includes(i) ? ' checked' : ''}><span class="check__box">${icon('check')}</span><span class="check__text">${esc(h)}</span></label>`).join('');
      const upd = () => {
        const d = $$('#hw-list input').filter((x) => x.checked).map((x) => +x.dataset.i);
        V3.store.set(key, d);
        $('#hw-ring').style.setProperty('--v', hw.length ? d.length / hw.length : 0);
        $('#hw-label').textContent = `${d.length}/${hw.length}`;
        return d;
      };
      $('#hw-list').addEventListener('change', () => { const d = upd(); if (d.length === hw.length) V3.toast('Homework complete — nice work!', { sub: 'Saved on this device' }); });
      upd();
      $('#hw-dl').addEventListener('click', () => {
        const txt = `${g.title} — homework checklist\n${'-'.repeat(40)}\n` + hw.map((h) => `[ ] ${h}`).join('\n') + `\n\nLinda’s Dog Training · ${location.origin}${V3.guideHref(g)}\n`;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }));
        a.download = `${g.slug}-homework.txt`; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        V3.toast('Checklist downloaded', { icon: 'download' });
      });
    }
    V3.accordion(body);
    V3.hoverPlay(body);
    // Related
    const rel = db.guides.filter((x) => x.id !== g.id && x.status === 'published').slice(0, 3);
    $('#g-related').innerHTML = rel.map((x) => V3.guideCard(x)).join('');
    V3.hoverPlay($('#g-related'));
    // Scrollspy
    const links = $$('[data-toc]');
    const prog = $('#toc-prog');
    const spy = () => {
      let cur = toc[0] && toc[0].id;
      toc.forEach((x) => { const el = document.getElementById(x.id); if (el && el.getBoundingClientRect().top < window.innerHeight * 0.35) cur = x.id; });
      links.forEach((a) => a.classList.toggle('is-active', a.dataset.toc === cur));
      const r = body.getBoundingClientRect();
      prog.style.setProperty('--p', V3.clamp((window.innerHeight * 0.35 - r.top) / r.height, 0, 1));
    };
    window.addEventListener('scroll', spy, { passive: true }); spy();
  };

  /* Blog index ----------------------------------------------------------- */
  pages.blog = () => {
    const [first, ...rest] = db.posts;
    $('#post-feature').innerHTML = `<a class="post-feature" href="/v3/article.html?p=${first.id}">
        <div class="post-feature__img" data-clip><img src="${esc(first.img)}" alt="" loading="eager"></div>
        <div><span class="mono muted">${V3.fmtDate(first.date, { day: 'numeric', month: 'long', year: 'numeric' })} · ${first.minutes} min</span><h2>${esc(first.title)}</h2><p class="lede">${esc(first.excerpt)}</p><span class="link" style="margin-top:20px">Read the note ${icon('arrow-right')}</span></div>
      </a>`;
    $('#posts').innerHTML = rest.map((p) => `<a class="post" href="/v3/article.html?p=${p.id}" data-reveal><div class="post__img"><img src="${esc(p.img)}" alt="" loading="lazy"></div><span class="mono muted">${V3.fmtDate(p.date, { day: 'numeric', month: 'short', year: 'numeric' })} · ${p.minutes} min</span><h3>${esc(p.title)}</h3><p>${esc(p.excerpt)}</p></a>`).join('');
  };

  /* Article ------------------------------------------------------------- */
  const ARTICLES = {
    'p-1': [
      ['p', 'Your dog comes back beautifully in the lounge, in the garden, even at the quiet end of the park. Then a duck lifts off the pond and suddenly you might as well be calling a lamppost. It’s tempting to call that stubbornness. It almost never is.'],
      ['h', 'Distraction is a ladder, not a wall'],
      ['p', 'We think about distractions as rungs on a ladder. A leaf blowing past is a low rung. Another dog playing is higher. Ducks — for many dogs — are near the top. A recall that works on rung two hasn’t failed on rung eight; it just hasn’t been practised there yet.'],
      ['q', 'If your dog ignores the cue, you haven’t lost the recall. You’ve found the edge of it.'],
      ['p', 'So we climb slowly. Distance from the distraction does a lot of the work: practise across the field from the ducks, not beside them, and use a long line so you never rehearse the version where your dog wins the chase.'],
      ['h', 'Three ways to make the next rung easier'],
      ['ul', ['Add distance before difficulty — move further away from the distraction first.', 'Pay more for harder rungs. A jackpot for a recall past ducks is fair wages.', 'End on a win. If it goes wrong twice, step down a rung and get three easy successes.']],
      ['p', 'And when it does click — when your dog peels away from the pond and charges back to you — make it the best thing that happened all day.']
    ],
    'p-2': [
      ['p', 'Weekend training marathons feel productive, but dogs learn best in small, frequent doses. Three minutes, a handful of treats, done — then back to normal life.'],
      ['h', 'A simple routine'],
      ['ul', ['Pick one skill for the day (a sit at the door, a name response, a hand touch).', 'Set a timer for three minutes and count your rewards — aim for 15 or more.', 'Finish before your dog loses interest, ideally on a success.']],
      ['q', 'Short sessions keep the game fun — for both ends of the lead.'],
      ['p', 'Do this two or three times a day and you’ll often see more progress in a week than in a month of long Sunday sessions.']
    ],
    'p-3': [
      ['p', 'Socialisation is often read as “meet as many dogs as possible”. For a lot of puppies, that’s overwhelming. Good socialisation is mostly about calm, positive exposure — often from a comfortable distance.'],
      ['h', 'Quality over quantity'],
      ['p', 'Sitting on a bench watching the world go by, with a few treats for calm looks, is socialisation. So is meeting one steady adult dog rather than ten bouncy ones.'],
      ['ul', ['Let your puppy observe before they interact.', 'Keep greetings short — three seconds, then call away.', 'Watch for signs your puppy needs a break, and give them one.']],
      ['q', 'Calm observation is socialisation too.']
    ],
    'p-4': [
      ['p', 'A walk where your dog stops to sniff every second fence post can feel like it isn’t “going anywhere”. For your dog, it’s going everywhere.'],
      ['h', 'Why sniffing matters'],
      ['p', 'Sniffing is how dogs read their neighbourhood. A slower, sniff-heavy walk — a sniffari — can be just as satisfying as a longer, faster one.'],
      ['ul', ['Pick a release cue like “go sniff” so sniffing becomes something you give.', 'Mix structured loose-lead stretches with free sniff breaks.', 'Golden hour is a lovely time to slow down together.']],
      ['q', 'Letting your dog sniff isn’t wasting a walk — it’s enrichment.']
    ]
  };
  pages.article = () => {
    const id = new URLSearchParams(location.search).get('p') || 'p-1';
    const p = db.posts.find((x) => x.id === id) || db.posts[0];
    document.title = `${p.title} — Journal · Linda’s Dog Training`;
    $('#a-meta').textContent = `${V3.fmtDate(p.date, { day: 'numeric', month: 'long', year: 'numeric' })} · ${p.minutes} min read`;
    $('#a-title').textContent = p.title;
    $('#a-lede').textContent = p.excerpt;
    $('#a-hero').innerHTML = `<img src="${esc(p.img)}" alt="">`;
    const blocks = ARTICLES[p.id] || ARTICLES['p-1'];
    $('#a-body').innerHTML = blocks.map(([k, v]) => k === 'p' ? `<p>${esc(v)}</p>` : k === 'h' ? `<h2>${esc(v)}</h2>` : k === 'q' ? `<blockquote>${esc(v)}</blockquote>` : `<ul>${v.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`).join('');
    $('#a-more').innerHTML = db.posts.filter((x) => x.id !== p.id).map((x) => `<a class="post" href="/v3/article.html?p=${x.id}" data-reveal><div class="post__img"><img src="${esc(x.img)}" alt="" loading="lazy"></div><span class="mono muted">${V3.fmtDate(x.date)} · ${x.minutes} min</span><h3>${esc(x.title)}</h3></a>`).join('');
    const bar = $('#reading');
    const art = $('#a-body');
    const upd = () => { const r = art.getBoundingClientRect(); bar.style.setProperty('--p', V3.clamp((window.innerHeight * 0.6 - r.top) / r.height, 0, 1)); };
    window.addEventListener('scroll', upd, { passive: true }); upd();
    $('#a-share').addEventListener('click', async () => {
      try { if (navigator.share) { await navigator.share({ title: p.title, url: location.href }); return; } await navigator.clipboard.writeText(location.href); V3.toast('Link copied'); } catch (e) { V3.toast('Link copied', { sub: 'Demo' }); }
    });
  };

  /* FAQ --------------------------------------------------------------- */
  pages.faq = () => {
    const extra = [
      { q: 'Who can see the notes Linda writes about my dog?', a: 'Only you and the adults Linda has invited into your household. Training notes and private session videos are never eligible for any public profile.' },
      { q: 'What happens if I share a video file on WhatsApp?', a: 'A downloaded file is a copy outside the portal, so it can’t be recalled later. That’s why sharing a secure portal link is the default — access can be revoked at any time.' },
      { q: 'Does AI decide what goes in my dog’s timeline?', a: 'No. AI only drafts a title, summary and tags. Linda reviews, edits and approves everything before anyone else can see it.' },
      { q: 'How do I sign in?', a: 'With a passwordless magic link sent to your email. Invitation links from Linda are personal and expire after a while.' }
    ];
    const all = db.faqs.map((f) => Object.assign({ cat: 'General' }, f)).concat(extra.map((f) => Object.assign({ cat: 'Portal & privacy' }, f)));
    const list = $('#faq-list'), q = $('#faq-search'), cats = $('#faq-cats');
    const catNames = ['All', ...new Set(all.map((f) => f.cat))];
    let cat = 'All';
    cats.innerHTML = catNames.map((c) => `<button class="chip" type="button" aria-pressed="${c === 'All'}" data-c="${esc(c)}">${esc(c)}</button>`).join('');
    const render = () => {
      const s = q.value.trim();
      const items = all.filter((f) => (cat === 'All' || f.cat === cat) && (!s || V3.fuzzy(s, f.q + ' ' + f.a) > 0));
      list.innerHTML = items.length ? items.map((f, i) => {
        const a = esc(f.a).replace(/(Placeholder[^.]*\.)/, '<span class="ph">$1</span>');
        return `<div class="acc__item"><button class="acc__btn" type="button" aria-expanded="false" aria-controls="faq-${i}"><span><span class="mono muted" style="display:block;font-family:var(--font-mono);font-size:10.5px;font-weight:500;letter-spacing:.08em;margin-bottom:6px">${String(i + 1).padStart(2, '0')} · ${esc(f.cat)}</span>${esc(f.q)}</span><span class="acc__ico"></span></button><div class="acc__panel" id="faq-${i}" role="region"><div><p>${a}</p></div></div></div>`;
      }).join('') : `<div class="empty"><span class="empty__ico">${icon('search-x')}</span><h3>Nothing found</h3><p>Try a different word, or <a class="link link--under" href="/v3/contact.html">ask Linda directly</a>.</p></div>`;
      V3.accordion(list);
      V3.icons();
    };
    cats.addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (!b) return; cat = b.dataset.c; $$('[data-c]', cats).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); render(); });
    q.addEventListener('input', V3.debounce(render, 120));
    render();
  };

  /* Contact ----------------------------------------------------------- */
  pages.contact = () => {
    const form = $('#contact-form');
    $$('input, textarea, select', form).forEach((i) => i.addEventListener('input', () => { const f = i.closest('.field'); if (f && f.classList.contains('is-invalid')) V3.validate(form); }));
    const msg = $('#c-msg'), cnt = $('#c-count');
    msg.addEventListener('input', () => { cnt.textContent = `${msg.value.length}/600`; });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!V3.validate(form)) { V3.toast('Please check the highlighted fields', { type: 'error' }); return; }
      const btn = $('button[type="submit"]', form);
      btn.classList.add('is-loading');
      setTimeout(() => {
        const d = Object.fromEntries(new FormData(form).entries());
        $('#contact-card').innerHTML = `<div class="success"><span class="success__mark"><svg viewBox="0 0 24 24" fill="none" stroke="#111214" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" pathLength="30"/></svg></span>
          <span class="mono muted">Enquiry noted · ref ${Math.random().toString(36).slice(2, 7).toUpperCase()}</span>
          <h2 class="t-2xl">Thanks, ${esc(d.name.split(' ')[0])}.</h2>
          <p class="lede">Linda will reply to <strong style="color:var(--graphite)">${esc(d.email)}</strong>${d.dog ? ` about ${esc(d.dog)}` : ''}. <span class="ph">[Response time — Linda to confirm]</span></p>
          <p class="mono muted">Prototype — nothing was actually sent.</p>
          <div class="row row--wrap"><a class="btn" href="/v3/academy.html">Browse the academy ${icon('arrow-right', 'btn-arrow')}</a><button class="btn btn--ghost" type="button" onclick="location.reload()">Send another</button></div></div>`;
        V3.icons();
        V3.toast('Enquiry ready for Linda', { sub: 'Demo only' });
      }, 1100);
    });
  };

  /* Login (magic link) --------------------------------------------- */
  pages.login = () => {
    let role = new URLSearchParams(location.search).get('as') === 'trainer' ? 'trainer' : 'client';
    const seg = $('#role-seg'), email = $('#l-email'), form = $('#login-form');
    const setRole = (r) => {
      role = r;
      $$('button', seg).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.role === r)));
      $('#l-title').innerHTML = r === 'client' ? 'Welcome<br>back.' : 'Trainer<br>sign in.';
      $('#l-sub').textContent = r === 'client' ? 'Sign in to see your dog’s sessions, videos and homework. No password — we’ll email you a secure link.' : 'Linda’s workspace: record, review and share. We’ll email a secure sign-in link.';
      email.placeholder = r === 'client' ? 'sarah.t@example.co.nz' : 'linda@lindasdogtraining.co.nz';
    };
    seg.addEventListener('click', (e) => { const b = e.target.closest('[data-role]'); if (b) setRole(b.dataset.role); });
    setRole(role);
    $('#l-fill').addEventListener('click', () => { email.value = role === 'client' ? 'sarah.t@example.co.nz' : 'linda@lindasdogtraining.co.nz'; email.dispatchEvent(new Event('input')); email.focus(); });
    email.addEventListener('input', () => { const f = email.closest('.field'); if (f.classList.contains('is-invalid')) V3.validate(form); });
    let cool = null;
    const startCooldown = () => {
      const b = $('#l-resend'); let n = 30; b.disabled = true;
      clearInterval(cool);
      cool = setInterval(() => { n--; b.textContent = n > 0 ? `Resend in ${n}s` : 'Resend link'; if (n <= 0) { clearInterval(cool); b.disabled = false; } }, 1000);
    };
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!V3.validate(form)) return;
      const btn = $('#l-send'); btn.classList.add('is-loading');
      setTimeout(() => {
        btn.classList.remove('is-loading');
        $('#step-email').hidden = true; $('#step-check').hidden = false;
        $('#l-sent-to').textContent = email.value.trim();
        $('#l-open').focus();
        startCooldown();
        if (window.gsap && !RM) gsap.from('#step-check > *', { y: 16, opacity: 0, stagger: 0.07, duration: 0.8, ease: 'expo.out' });
      }, 900);
    });
    $('#l-back').addEventListener('click', () => { $('#step-email').hidden = false; $('#step-check').hidden = true; email.focus(); });
    $('#l-resend').addEventListener('click', () => { V3.toast('New link sent', { sub: 'Previous link expired', icon: 'mail' }); startCooldown(); });
    $('#l-open').addEventListener('click', () => {
      V3.store.set('session', { role, email: email.value.trim(), at: Date.now() });
      const b = $('#l-open'); b.classList.add('is-loading');
      setTimeout(() => { const a = document.createElement('a'); a.href = role === 'client' ? '/v3/portal/index.html#/dogs' : '/v3/admin/index.html#/dashboard'; document.body.appendChild(a); a.click(); }, 500);
    });
  };

  /* About (renders a few data bits) ------------------------------------ */
  pages.about = () => {
    const vb = $('#about-band');
    if (vb) V3.lazyVideos(vb);
  };

  /* ------------------------------------------------------------------ */
  /* Boot                                                                 */
  /* ------------------------------------------------------------------ */
  renderNav();
  renderFooter();
  V3.icons();
  setupScroll();
  V3.pageTransitions();
  if (pages[page]) pages[page]();
  V3.icons();
  setupCursor();
  V3.magnetic();
  V3.lazyVideos();
  V3.hoverPlay();
  V3.setupReveals = setupReveals;
  // On home, pinned sections are created by home.js — reveals are set up after them so trigger positions include pin spacing.
  if (page !== 'home') { setupReveals(); if (!RM) V3.revealSafety(); }
  if (page !== 'home') document.documentElement.classList.add('is-loaded');
  window.addEventListener('load', () => { if (window.ScrollTrigger) ScrollTrigger.refresh(); });
})();
