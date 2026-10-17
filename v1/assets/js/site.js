/* ==========================================================================
   site.js — marketing shell: nav, mobile menu, footer, Lenis, curtain
   transitions, cursor, magnetic buttons, scroll reveals
   ========================================================================== */
(function () {
  'use strict';
  const { $, $$, icon, icons, reduced, magnetic, cursor, lazyVideos, store } = window.UI;
  const L = window.LINDA;
  const BASE = '/v1';
  const page = document.body.dataset.page || '';
  const hasGSAP = !!window.gsap;
  document.documentElement.classList.toggle('reduced', reduced || !hasGSAP);
  if (!hasGSAP) document.documentElement.classList.add('no-js');
  if (hasGSAP) {
    gsap.registerPlugin(...[window.ScrollTrigger, window.SplitText, window.CustomEase, window.Flip, window.ScrollToPlugin].filter(Boolean));
    if (window.CustomEase) CustomEase.create('gh', '0.16, 1, 0.3, 1');
  }

  /* ---------------- Nav ---------------- */
  const links = [
    { href: `${BASE}/about.html`, label: 'About', key: 'about' },
    { href: `${BASE}/academy.html`, label: 'Academy', key: 'academy' },
    { href: `${BASE}/blog.html`, label: 'Journal', key: 'blog' },
    { href: `${BASE}/faq.html`, label: 'FAQ', key: 'faq' },
    { href: `${BASE}/contact.html`, label: 'Contact', key: 'contact' }
  ];
  function renderNav() {
    const header = document.createElement('header');
    header.className = 'nav';
    header.innerHTML = `
      <a class="skip-link" href="#main">Skip to content</a>
      <div class="nav__inner">
        <a class="nav__brand" href="${BASE}/index.html" aria-label="Linda's Dog Training — home">
          <span class="nav__mark">Linda’s</span>
          <span class="nav__sub">Dog<br>Training</span>
        </a>
        <nav class="nav__links" aria-label="Primary">
          ${links.map((l) => `<a href="${l.href}" class="nav__link ${page === l.key || (page === 'guide' && l.key === 'academy') || (page === 'article' && l.key === 'blog') ? 'is-active' : ''}"><span data-text="${l.label}">${l.label}</span></a>`).join('')}
        </nav>
        <div class="nav__actions">
          <a class="btn btn--sm btn--outline nav__login" href="${BASE}/login.html">${icon('lock-keyhole')}<span>Client login</span></a>
          <button class="nav__burger" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu"><span></span><span></span></button>
        </div>
      </div>`;
    document.body.prepend(header);

    const menu = document.createElement('div');
    menu.className = 'mmenu';
    menu.id = 'mobile-menu';
    menu.setAttribute('aria-hidden', 'true');
    menu.innerHTML = `
      <div class="mmenu__bg"><video muted playsinline loop preload="none" data-src="/shared/media/video/1532.mp4" poster="/shared/media/img/1532-40.jpg"></video></div>
      <nav class="mmenu__links" aria-label="Mobile">
        <a href="${BASE}/index.html" class="mmenu__link"><span class="mmenu__num">00</span><span class="mmenu__txt">Home</span></a>
        ${links.map((l, i) => `<a href="${l.href}" class="mmenu__link"><span class="mmenu__num">0${i + 1}</span><span class="mmenu__txt">${l.label}</span></a>`).join('')}
      </nav>
      <div class="mmenu__foot">
        <a href="${BASE}/login.html" class="btn btn--primary btn--block">${icon('lock-keyhole')}Client login</a>
        <div class="mmenu__meta">
          <a href="${BASE}/portal/index.html">Client portal demo ↗</a>
          <a href="${BASE}/admin/index.html">Trainer admin demo ↗</a>
        </div>
      </div>`;
    document.body.appendChild(menu);

    const burger = $('.nav__burger', header);
    const vid = $('video', menu);
    let open = false;
    const toggle = (force) => {
      open = force != null ? force : !open;
      burger.setAttribute('aria-expanded', open);
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.setAttribute('aria-hidden', !open);
      if (open || !hasGSAP || reduced) document.documentElement.classList.toggle('menu-open', open);
      if (open) { if (!vid.src) vid.src = vid.dataset.src; vid.play().catch(() => {}); window.__lenis && window.__lenis.stop(); }
      else { vid.pause(); window.__lenis && window.__lenis.start(); }
      if (hasGSAP && !reduced) {
        if (open) {
          gsap.fromTo(menu, { clipPath: 'circle(0% at calc(100% - 40px) 36px)' }, { clipPath: 'circle(150% at calc(100% - 40px) 36px)', duration: 0.9, ease: 'gh' });
          gsap.fromTo($$('.mmenu__txt', menu), { yPercent: 110 }, { yPercent: 0, duration: 0.9, stagger: 0.05, ease: 'gh', delay: 0.15 });
          gsap.fromTo($$('.mmenu__num, .mmenu__foot', menu), { opacity: 0 }, { opacity: 1, duration: 0.6, stagger: 0.03, delay: 0.35 });
        } else {
          gsap.to(menu, { clipPath: 'circle(0% at calc(100% - 40px) 36px)', duration: 0.6, ease: 'power3.inOut', onComplete: () => { if (!open) document.documentElement.classList.remove('menu-open'); } });
        }
      }
    };
    burger.addEventListener('click', () => toggle());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) toggle(false); });

    // hide on scroll down, show on up
    let lastY = 0;
    const onScroll = (y) => {
      header.classList.toggle('is-scrolled', y > 40);
      if (!open) header.classList.toggle('is-hidden', y > lastY && y > 400);
      lastY = y;
    };
    window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });
  }

  /* ---------------- Footer ---------------- */
  function renderFooter() {
    const slot = $('#site-footer');
    if (!slot) return;
    slot.className = 'footer';
    slot.innerHTML = `
      <div class="wrap footer__top">
        <div class="footer__intro">
          <p class="eyebrow eyebrow--amber">Kia ora — let’s talk dogs</p>
          <p class="footer__big serif">Calm, kind, <em>real-world</em> dog training.</p>
          <a class="link-arrow" href="mailto:${L.brand.email}">${L.brand.email} ${icon('arrow-up-right')}</a>
        </div>
        <div class="footer__cols">
          <div>
            <h3 class="footer__h">Explore</h3>
            <ul>
              <li><a href="${BASE}/index.html">Home</a></li>
              ${links.map((l) => `<li><a href="${l.href}">${l.label}</a></li>`).join('')}
            </ul>
          </div>
          <div>
            <h3 class="footer__h">Academy</h3>
            <ul>
              <li><a href="${BASE}/guide/recall-101.html">Recall 101</a></li>
              <li><a href="${BASE}/academy.html">All guides</a></li>
              <li><a href="${BASE}/blog/article.html?p=p-1">Latest from the journal</a></li>
            </ul>
          </div>
          <div>
            <h3 class="footer__h">Clients</h3>
            <ul>
              <li><a href="${BASE}/login.html">Client login</a></li>
              <li><a href="${BASE}/portal/index.html">Client portal (demo)</a></li>
              <li><a href="${BASE}/admin/index.html">Trainer workspace (demo)</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div class="footer__wordmark" aria-hidden="true"><span>Linda’s</span></div>
      <div class="wrap footer__base">
        <span>© 2026 ${L.brand.name} <span class="faint">(working title)</span> · ${L.brand.region}</span>
        <span class="faint">${L.brand.note}</span>
        <button class="footer__top-btn" type="button" data-to-top>Back to top ${icon('arrow-up')}</button>
      </div>`;
    $('[data-to-top]', slot).addEventListener('click', () => {
      if (window.__lenis) window.__lenis.scrollTo(0, { duration: 1.6 }); else window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
    if (hasGSAP && !reduced && window.ScrollTrigger) {
      gsap.fromTo($('.footer__wordmark span', slot), { yPercent: 60 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: slot, start: 'top bottom', end: 'bottom bottom', scrub: true } });
    }
  }

  /* ---------------- Lenis ---------------- */
  function smooth() {
    if (reduced || !window.Lenis) return;
    const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
    window.__lenis = lenis;
    if (window.ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const t = $(id);
      if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -80, duration: 1.4 }); }
    }));
  }

  /* ---------------- Curtain page transitions ---------------- */
  function curtain() {
    const c = document.createElement('div');
    c.className = 'curtain';
    c.setAttribute('aria-hidden', 'true');
    c.innerHTML = '<div class="curtain__panel curtain__panel--amber"></div><div class="curtain__panel curtain__panel--ink"><span class="curtain__mark">Linda’s</span></div>';
    document.body.appendChild(c);
    const amber = $('.curtain__panel--amber', c), ink = $('.curtain__panel--ink', c), mark = $('.curtain__mark', c);
    const arriving = store.sget('v1.curtain', false);
    store.sset('v1.curtain', false);
    if (arriving && hasGSAP && !reduced) {
      gsap.set([amber, ink], { yPercent: 0 });
      gsap.set(mark, { opacity: 1 });
      const tl = gsap.timeline({ delay: 0.05 });
      tl.to(mark, { opacity: 0, y: -20, duration: 0.35, ease: 'power2.in' })
        .to(ink, { yPercent: -100, duration: 0.9, ease: 'power4.inOut' }, 0.1)
        .to(amber, { yPercent: -100, duration: 0.9, ease: 'power4.inOut' }, 0.22)
        .set([amber, ink], { yPercent: 100 });
      document.documentElement.classList.add('arrived');
    }
    window.__arrivedViaCurtain = !!arriving;

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank' || a.hasAttribute('download')) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
      if (!hasGSAP || reduced) return;
      e.preventDefault();
      go(url.href);
    });
    function go(href) {
      store.sset('v1.curtain', true);
      c.classList.add('is-covering');
      const tl = gsap.timeline({ onComplete: () => { location.href = href; } });
      tl.fromTo(amber, { yPercent: 100 }, { yPercent: 0, duration: 0.7, ease: 'power4.inOut' })
        .fromTo(ink, { yPercent: 100 }, { yPercent: 0, duration: 0.7, ease: 'power4.inOut' }, 0.12)
        .fromTo(mark, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 0.55);
    }
    window.__go = (href) => (hasGSAP && !reduced ? go(href) : (location.href = href));
    window.addEventListener('pageshow', (e) => { if (e.persisted && hasGSAP) { gsap.set([amber, ink], { yPercent: 100 }); c.classList.remove('is-covering'); } });
  }

  /* ---------------- Reveals ---------------- */
  function reveals() {
    if (!hasGSAP || !window.ScrollTrigger) return;
    if (reduced) { $$('[data-reveal], [data-split]').forEach((el) => (el.style.opacity = 1)); return; }
    // headings split into masked lines
    $$('[data-split]').forEach((el) => {
      if (el.__split || !window.SplitText) return;
      el.__split = true;
      const split = SplitText.create(el, { type: 'lines,words', mask: 'lines', linesClass: 'split-line' });
      gsap.set(el, { opacity: 1 });
      const delay = parseFloat(el.dataset.delay || 0);
      const anim = gsap.from(split.words, { yPercent: 115, rotate: 3, duration: 1.2, stagger: 0.04, ease: 'gh', delay, paused: el.hasAttribute('data-split-manual') });
      el.__splitAnim = anim;
      if (!el.hasAttribute('data-split-manual') && !el.hasAttribute('data-split-now')) {
        anim.pause();
        ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => anim.play() });
      }
    });
    $$('[data-reveal]').forEach((el) => {
      const y = el.dataset.reveal === 'fade' ? 0 : 40;
      gsap.fromTo(el, { opacity: 0, y }, { opacity: 1, y: 0, duration: 1.2, ease: 'gh', delay: parseFloat(el.dataset.delay || 0), scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    $$('[data-stagger]').forEach((wrap) => {
      const kids = Array.from(wrap.children);
      gsap.fromTo(kids, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1.1, ease: 'gh', stagger: 0.08, scrollTrigger: { trigger: wrap, start: 'top 88%', once: true } });
    });
    $$('[data-reveal-img]').forEach((el) => {
      const media = el.querySelector('img, video');
      gsap.fromTo(el, { clipPath: 'inset(18% 10% 18% 10% round 24px)' }, { clipPath: 'inset(0% 0% 0% 0% round 24px)', ease: 'none', scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 35%', scrub: true } });
      if (media) gsap.fromTo(media, { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 95%', end: 'bottom top', scrub: true } });
    });
    $$('[data-parallax]').forEach((el) => {
      const amt = parseFloat(el.dataset.parallax) || 12;
      gsap.fromTo(el, { yPercent: -amt }, { yPercent: amt, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  /* ---------------- Boot ---------------- */
  renderNav();
  renderFooter();
  curtain();
  smooth();
  cursor();
  icons();
  lazyVideos();
  $$('.btn--magnetic, [data-magnetic]').forEach((el) => magnetic(el));
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  window.__fontsReady = fontsReady;
  fontsReady.then(() => {
    if (page !== 'home') reveals();
    else window.__reveals = reveals;
    window.ScrollTrigger && ScrollTrigger.refresh();
  });
  /* ---------------- Shared marketing components ---------------- */
  const guideHref = (g) => (g.slug === 'recall-101' ? `${BASE}/guide/recall-101.html` : `${BASE}/guide/index.html?g=${g.slug}`);
  function guideCard(g) {
    const t = L.technique(g.technique);
    const draft = g.status !== 'published';
    return `<a class="gcard ${draft ? 'gcard--draft' : ''}" href="${guideHref(g)}" data-cursor="${draft ? 'Soon' : 'Play'}" data-tech="${g.technique}" data-guide="${g.id}">
      <div class="gcard__media">
        <img src="${g.hero}" alt="" loading="lazy">
        <video muted playsinline loop preload="none" data-src="/shared/media/video/${g.clip}.mp4" aria-hidden="true"></video>
        <div class="gcard__badges"><span class="badge badge--dotless">${g.level}</span>${draft ? '<span class="badge st-pending">in progress</span>' : ''}</div>
        <span class="gcard__play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z"/></svg></span>
      </div>
      <div class="gcard__body">
        <div class="gcard__meta"><span class="tag" data-tech="${t.id}">${t.name}</span><span>${g.minutes} MIN READ</span></div>
        <h3 class="gcard__title">${g.title}</h3>
        <p class="gcard__sub">${g.subtitle}</p>
      </div>
    </a>`;
  }
  function bindGuidePreviews(root) {
    if (UI.isTouch) return;
    $$('.gcard', root).forEach((card) => {
      const v = card.querySelector('video');
      card.addEventListener('pointerenter', () => {
        if (!v.src) v.src = v.dataset.src;
        v.currentTime = 0;
        const p = v.play(); p && p.then(() => card.classList.add('is-previewing')).catch(() => {});
      });
      card.addEventListener('pointerleave', () => { card.classList.remove('is-previewing'); v.pause(); });
    });
  }

  window.Site = { BASE, reveals, magnetic, guideCard, guideHref, bindGuidePreviews };
})();
