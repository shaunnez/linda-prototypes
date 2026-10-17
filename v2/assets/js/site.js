/* =========================================================
   PAWS & PLAY — public site shell: header, menu, footer, Lenis, reveals
   ========================================================= */
(function () {
  'use strict';
  const P = window.PAWS, L = window.LINDA;
  const page = document.body.dataset.page || '';
  const has = (n) => typeof window[n] !== 'undefined';
  if (has('gsap')) {
    const plugins = ['ScrollTrigger', 'SplitText', 'Draggable', 'MotionPathPlugin', 'ScrollToPlugin', 'CustomEase', 'Flip', 'Observer'].filter(has).map((n) => window[n]);
    gsap.registerPlugin.apply(gsap, plugins);
  }
  if (P.reduced) document.documentElement.classList.add('reduced');

  const NAV = [
    { href: '/v2/academy.html', label: 'Academy', key: 'academy' },
    { href: '/v2/guide/recall-101.html', label: 'Recall 101', key: 'guide' },
    { href: '/v2/blog.html', label: 'Blog', key: 'blog' },
    { href: '/v2/about.html', label: 'About', key: 'about' },
    { href: '/v2/faq.html', label: 'FAQ', key: 'faq' },
    { href: '/v2/contact.html', label: 'Contact', key: 'contact' }
  ];

  /* ---------- header ---------- */
  const header = document.querySelector('[data-site-header]');
  if (header) {
    header.className = 'site-header';
    header.innerHTML = `
      <div class="nav-bar">
        <a class="brand" href="/v2/index.html" aria-label="${P.esc(L.brand.name)} — home">${P.svg.logo()}<span><b>Linda's</b><small>Dog Training</small></span></a>
        <nav class="nav-links" aria-label="Main">${NAV.map((n) => `<a href="${n.href}" ${page === n.key || (page === 'article' && n.key === 'blog') ? 'aria-current="page"' : ''}>${n.label}</a>`).join('')}</nav>
        <div class="nav-cta">
          <a class="btn btn--sm btn--outline" href="/v2/login.html">${P.ic('log-in')}Log in</a>
          <a class="btn btn--sm btn--primary" href="/v2/contact.html" data-magnetic>Book a chat</a>
        </div>
        <button class="menu-btn" type="button" aria-expanded="false" aria-controls="mmenu" aria-label="Open menu"><span></span><span></span></button>
      </div>`;
    const menu = document.createElement('div');
    menu.className = 'mmenu'; menu.id = 'mmenu'; menu.setAttribute('aria-hidden', 'true');
    menu.innerHTML = `<nav aria-label="Mobile">
        <a href="/v2/index.html"><span class="mi">Home</span>${P.ic('arrow-right')}</a>
        ${NAV.map((n) => `<a href="${n.href}"><span class="mi">${n.label}</span>${P.ic('arrow-right')}</a>`).join('')}
      </nav>
      <div class="mm-foot">
        <a class="btn btn--ink btn--lg btn--block" href="/v2/login.html">${P.ic('log-in')}Client log in</a>
        <div class="mm-demos"><a class="btn btn--sm" href="/v2/portal/index.html">${P.ic('smartphone')}Portal demo</a><a class="btn btn--sm btn--sun" href="/v2/admin/index.html">${P.ic('layout-dashboard')}Trainer demo</a></div>
      </div>
      <div class="mm-paws">${P.svg.paw()}</div>`;
    document.body.appendChild(menu);
    const mb = header.querySelector('.menu-btn');
    let open = false;
    function setMenu(v) {
      open = v; mb.setAttribute('aria-expanded', v); mb.setAttribute('aria-label', v ? 'Close menu' : 'Open menu'); menu.setAttribute('aria-hidden', !v);
      if (v) {
        menu.classList.add('is-open'); P.lenis && P.lenis.stop(); document.documentElement.style.overflow = 'hidden';
        if (has('gsap') && !P.reduced) {
          const r = mb.getBoundingClientRect();
          gsap.fromTo(menu, { clipPath: `circle(0px at ${r.left + r.width / 2}px ${r.top + r.height / 2}px)` }, { clipPath: `circle(${Math.hypot(innerWidth, innerHeight)}px at ${r.left + r.width / 2}px ${r.top + r.height / 2}px)`, duration: .7, ease: 'expo.out' });
          gsap.from(menu.querySelectorAll('nav .mi'), { yPercent: 110, rotate: 6, duration: .7, ease: 'back.out(1.6)', stagger: .05, delay: .1 });
          gsap.from(menu.querySelectorAll('.mm-foot > *'), { y: 30, opacity: 0, duration: .5, stagger: .08, delay: .35 });
        }
        setTimeout(() => menu.querySelector('a').focus(), 80);
      } else {
        const done = () => { menu.classList.remove('is-open'); P.lenis && P.lenis.start(); document.documentElement.style.overflow = ''; };
        if (has('gsap') && !P.reduced) { const r = mb.getBoundingClientRect(); gsap.to(menu, { clipPath: `circle(0px at ${r.left + r.width / 2}px ${r.top + r.height / 2}px)`, duration: .45, ease: 'expo.in', onComplete: done }); } else done();
      }
    }
    mb.addEventListener('click', () => setMenu(!open));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) { setMenu(false); mb.focus(); } });
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setTimeout(() => open && setMenu(false), 300); });

    // hide on scroll down
    let lastY = 0;
    const onScroll = (y) => { if (open) return; header.classList.toggle('is-hidden', y > 260 && y > lastY + 4); if (y < lastY - 4 || y < 260) header.classList.remove('is-hidden'); lastY = y; };
    window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });
  }

  /* ---------- footer ---------- */
  const footer = document.querySelector('[data-site-footer]');
  if (footer) {
    footer.className = 'site-footer';
    footer.innerHTML = `
      <div class="wrap">
        <div class="foot-top">
          <div>
            <h3>Good dogs are made on walks. Kept here.</h3>
            <p style="opacity:.75;max-width:40ch">${P.esc(L.brand.tagline)} Private training videos, homework and guides for you and your whānau.</p>
            <form class="foot-news" novalidate data-news>
              <label class="sr-only" for="fn-email">Email for training tips</label>
              <input class="input" id="fn-email" type="email" placeholder="you@example.co.nz" autocomplete="email">
              <button class="btn btn--sun" type="submit">Get tips</button>
            </form>
          </div>
          <div class="foot-col"><h4>Explore</h4><ul>
            <li><a href="/v2/index.html">Home</a></li><li><a href="/v2/about.html">About Linda</a></li><li><a href="/v2/faq.html">FAQ</a></li><li><a href="/v2/contact.html">Contact</a></li></ul></div>
          <div class="foot-col"><h4>Learn</h4><ul>
            <li><a href="/v2/academy.html">Training Academy</a></li><li><a href="/v2/guide/recall-101.html">Recall 101</a></li><li><a href="/v2/blog.html">Blog</a></li><li><a href="/v2/blog/duck-distraction.html">Latest article</a></li></ul></div>
          <div class="foot-col"><h4>Demos</h4><ul>
            <li><a href="/v2/login.html">${P.ic('log-in')}Log in</a></li><li><a href="/v2/portal/index.html">${P.ic('smartphone')}Client portal</a></li><li><a href="/v2/admin/index.html">${P.ic('layout-dashboard')}Trainer workspace</a></li><li><a href="mailto:${L.brand.email}">${P.ic('mail')}Email Linda</a></li></ul></div>
        </div>
        <div class="wordmark" aria-hidden="true"><span class="wm-word">Linda's</span>${P.svg.paw('wm-paw')}</div>
        <div class="foot-base">
          <span>© 2026 ${P.esc(L.brand.name)} (working title) · ${P.esc(L.brand.region)}</span>
          <span><span class="ph">${P.ic('pencil')}Privacy policy &amp; terms — to be supplied</span></span>
          <span>Every video starts private.</span>
        </div>
      </div>`;
    const nf = footer.querySelector('[data-news]');
    nf.addEventListener('submit', (e) => {
      e.preventDefault(); const i = nf.querySelector('input');
      if (!/^\S+@\S+\.\S+$/.test(i.value)) { P.toast('Pop in a valid email address', { tone: 'err' }); i.focus(); return; }
      i.value = ''; P.toast('Ka pai! You’re on the list (demo).', { tone: 'ok', icon: 'mail-check' });
    });
  }

  P.icons();

  /* ---------- Lenis smooth scroll ---------- */
  if (has('Lenis') && !P.reduced) {
    const lenis = new Lenis({ lerp: .11, smoothWheel: true, wheelMultiplier: 1 });
    P.lenis = lenis;
    if (has('ScrollTrigger')) { lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }
    else { const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]'); if (!a) return; const id = a.getAttribute('href'); if (id.length < 2) return;
      const t = document.querySelector(id); if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -90 }); }
    });
  }

  /* ---------- reveals ---------- */
  function initReveals() {
    if (!has('gsap') || !has('ScrollTrigger')) { P.$$('[data-reveal]').forEach((el) => { el.style.opacity = 1; el.style.transform = 'none'; }); return; }
    if (P.reduced) return;
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 95%', once: true,
      onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, rotate: 0, duration: .6, ease: 'expo.out', stagger: .05, overwrite: true })
    });
    // split headings
    P.$$('[data-split]').forEach((el) => {
      if (!has('SplitText')) return;
      const mode = el.dataset.split || 'rise';
      if (mode === 'drop') {
        const s = SplitText.create(el, { type: 'words,chars', wordsClass: 'sw' });
        gsap.from(s.chars, { yPercent: -140, rotate: () => gsap.utils.random(-30, 30), opacity: 0, duration: .8, ease: 'elastic.out(1, .6)', stagger: .015, scrollTrigger: { trigger: el, start: 'top 95%', once: true } });
      } else {
        const s = SplitText.create(el, { type: 'words' });
        gsap.from(s.words, { y: '0.7em', opacity: 0, rotate: 5, duration: .55, ease: 'back.out(1.7)', stagger: .03, scrollTrigger: { trigger: el, start: 'top 95%', once: true } });
      }
    });
    // drawn svgs
    P.$$('[data-draw]').forEach((svg) => {
      P.prepDraw(svg);
      ScrollTrigger.create({ trigger: svg, start: 'top 95%', once: true, onEnter: () => P.draw(svg, { duration: +(svg.dataset.dur || 1.1), delay: +(svg.dataset.delay || .2) }) });
    });
    // footer wordmark
    const wm = document.querySelector('.wordmark .wm-word');
    if (wm && has('SplitText')) {
      const s = SplitText.create(wm, { type: 'chars', charsClass: 'wm-ch' });
      gsap.from(s.chars, { yPercent: 100, rotate: () => gsap.utils.random(-14, 14), duration: 1.3, ease: 'elastic.out(1, .4)', stagger: .06, scrollTrigger: { trigger: '.wordmark', start: 'top 98%', once: true } });
      gsap.from('.wordmark .wm-paw', { scale: 0, rotate: -120, duration: 1, ease: 'back.out(2.5)', delay: .5, scrollTrigger: { trigger: '.wordmark', start: 'top 98%', once: true } });
    }
  }

  /* ---------- safety net: anything in view is never left hidden ---------- */
  function revealSafety() {
    if (!('IntersectionObserver' in window)) return;
    const force = (el) => {
      const els = [el].concat(P.$$('*', el));
      els.forEach((x) => { if (parseFloat(getComputedStyle(x).opacity) < 1 && (x.matches('[data-reveal], [data-split], [data-split] *') || x.style.opacity !== '')) { if (has('gsap')) gsap.set(x, { opacity: 1, y: 0, yPercent: 0, rotate: 0 }); else { x.style.opacity = 1; x.style.transform = 'none'; } } });
    };
    const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { io.unobserve(en.target); setTimeout(() => force(en.target), 800); } }), { threshold: 0.05 });
    P.$$('[data-reveal], [data-split]').forEach((el) => io.observe(el));
  }

  /* ---------- guide card video peek ---------- */
  P.peekCards = function (root) {
    P.$$('[data-peek]', root).forEach((card) => {
      const v = card.querySelector('video'); if (!v) return;
      const on = () => { if (!v.getAttribute('src')) v.src = v.dataset.src; card.classList.add('is-peek'); const p = v.play(); if (p && p.catch) p.catch(() => {}); };
      const off = () => { card.classList.remove('is-peek'); v.pause(); };
      card.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') on(); });
      card.addEventListener('pointerleave', off); card.addEventListener('focusin', on); card.addEventListener('focusout', off);
    });
  };

  function boot() {
    P.$$('[data-tilt]').forEach((el) => P.tilt(el, +el.dataset.tilt || 7));
    P.$$('[data-magnetic]').forEach((el) => P.magnetic(el));
    P.peekCards(document);
    P.lazyVideos(document);
    P.pawTrail();
    P.pageTransitions();
    const go = () => {
      window.__siteReady = true; document.dispatchEvent(new CustomEvent('site:ready')); initReveals();
      if (has('ScrollTrigger')) { if (ScrollTrigger.sort) ScrollTrigger.sort(); ScrollTrigger.refresh(); window.addEventListener('load', () => ScrollTrigger.refresh()); }
      revealSafety();
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
  }
  window.__siteReady = 'booting';
  boot();
})();
