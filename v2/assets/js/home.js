/* =========================================================
   PAWS & PLAY — Home page signature moments
   ========================================================= */
(function () {
  'use strict';
  const P = window.PAWS, L = window.LINDA, $ = P.$, $$ = P.$$;
  const html = document.documentElement;
  const G = typeof window.gsap !== 'undefined';
  const ST = typeof window.ScrollTrigger !== 'undefined';

  /* ---------------------------------------------------------
     Data-driven renders (run immediately so layout is ready)
     --------------------------------------------------------- */

  // Recall steps from the real clip's timestamps (m-1001 uses clip 10365)
  const recallGuide = L.guides.find((g) => g.slug === 'recall-101');
  const recallSteps = [{ t: '0:04', label: 'One clear cue' }, { t: '0:11', label: 'Turn & jog away' }, { t: '0:19', label: 'Pay at the collar' }];
  const stepsEl = $('.rc-steps');
  const stepAt = [0.05, 0.4, 0.8];
  stepsEl.innerHTML = recallSteps.map((t, i) => `<span class="rc-step" data-i="${i}"><span class="t">${t.t}</span><span class="lbl">${P.esc(t.label)}</span></span>`).join('');

  // Ribbons
  const cues = ['Come!', 'Sit.', 'Leave it.', 'Settle.', 'Touch!', 'Drop.', 'Wait.', 'Find it!'];
  const ribbonA = L.techniques.map((t) => `<span class="ribbon-item">${P.esc(t.name)}${P.svg.paw()}</span>`).join('');
  const ribbonB = cues.map((c, i) => `<span class="ribbon-item"><span class="${i % 2 ? 'o' : ''}">${c}</span>${P.svg.star()}</span>`).join('');
  $('[data-ribbon="a"]').innerHTML = ribbonA + ribbonA;
  $('[data-ribbon="b"]').innerHTML = ribbonB + ribbonB;

  // Journey cards
  const kiwiSession = L.sessions.find((s) => s.status === 'active') || L.sessions[0];
  const kiwi = L.dog(kiwiSession.dogs[0]);
  const up = L.uploads[0];
  const J = [
    { n: 1, t: 'Record', bg: 'var(--tomato)', clip: 10365, rot: '5deg', ic: 'circle-dot', body: 'Linda picks your household and dog, taps one big button and films right there in the park. The context sticks, so the next clip is one tap away.', chips: ['Pick dog in < 15s', 'Phone camera'],
      ov: `<div class="j-ov top"><span class="jov-rec"><i></i>REC 00:12</span></div><div class="j-ov bot"><div class="jov-card">${P.esc(kiwi.name)} · ${P.esc(kiwiSession.title)}</div></div>` },
    { n: 2, t: 'Upload', bg: 'var(--sun)', clip: 1496, rot: '-4deg', ic: 'upload-cloud', body: 'The clip starts uploading the moment it comes back from the camera — resumable, with honest progress if the phone nods off.', chips: ['Resumable', 'Private by default'],
      ov: `<div class="j-ov bot"><div class="jov-card"><span>${up.file} · ${up.size}</span><div class="progress progress--striped progress--sky"><i data-up style="--v:${Math.round(up.progress * 100)}%"></i></div></div></div>` },
    { n: 3, t: 'AI drafts', bg: 'var(--sky)', clip: 50682, rot: '4deg', ic: 'sparkles', body: 'A helper suggests a title, summary and technique tags — with confidence and evidence. It never publishes, never guesses who’s who.', chips: ['Draft only', 'Shows its evidence'],
      ov: `<div class="j-ov bot"><div class="jov-card"><span>✦ Suggested tags</span><div class="jov-tags" data-aitags><span class="skel"></span><span class="skel"></span><span class="skel"></span></div></div></div>` },
    { n: 4, t: 'Linda reviews', bg: 'var(--blush)', clip: 1550, rot: '-5deg', ic: 'badge-check', body: 'Linda tweaks the notes, trims the good bit, adds timestamps and chooses exactly who can watch. Nothing goes anywhere without her.', chips: ['Trim', 'Timestamps', 'Choose audience'],
      ov: `<div class="j-ov bot"><div class="jov-card"><span>Approve for…</span><span class="pill pill--grass" style="justify-self:start"><i data-lucide="house"></i>Household</span></div></div>` },
    { n: 5, t: 'Shared privately', bg: 'var(--grass)', dark: true, clip: 1552, rot: '4deg', ic: 'lock', body: 'You get a secure link (often via WhatsApp, sent by Linda herself). Only invited members of your household can press play.', chips: ['Secure link', 'Household only'],
      ov: `<div class="j-ov top"><span class="pill pill--sun"><i data-lucide="lock"></i>Thompson household only</span></div>` },
    { n: 6, t: 'Revisit anytime', bg: 'var(--lilac)', clip: 23072, rot: '-4deg', ic: 'repeat', body: 'Your dog’s whole training story, organised by session and technique — with homework and guides right beside it. Forever yours.', chips: ['Timeline', 'Homework', 'Guides'],
      ov: `<div class="j-ov bot"><div class="jov-card"><span>▶ 0:11 · Handler moves away</span></div></div>` }
  ];
  $('[data-journey]').innerHTML = J.map((j, i) => `
    <article class="jcard ${j.dark ? 'dark' : ''}" style="--i:${i};--bg:${j.bg}" aria-label="Step ${j.n}: ${j.t}">
      <div>
        <span class="jn">${j.n}</span>
        <h3>${j.t}</h3>
        <p>${j.body}</p>
        <div class="chips">${j.chips.map((c) => `<span class="pill pill--lg">${c}</span>`).join('')}</div>
      </div>
      <div class="jphone"><div class="phone" style="--rot:${j.rot}"><div class="phone-notch"></div><div class="phone-screen">
        <video muted playsinline loop preload="none" data-lazy data-src="/shared/media/vertical/${j.clip}.mp4" poster="/shared/media/thumb/${j.clip}-40.jpg" aria-hidden="true"></video>${j.ov}
      </div></div></div>
      <div class="j-deco" aria-hidden="true">${P.svg.paw()}</div>
    </article>`).join('');

  // Phones (client portal + trainer app) — real mini UI from data
  const sarah = L.user(L.currentClient), hh = L.household(sarah.household), bramble = L.dogsFor(hh.id)[0];
  const latest = L.sessionsFor(bramble.id).filter((s) => s.status === 'completed').sort((a, b) => b.date.localeCompare(a.date))[0];
  const vid = L.mediaFor(bramble.id).find((m) => m.editorial === 'approved_shared');
  const review = L.media.filter((m) => m.editorial === 'needs_review').length;
  $('[data-phones]').innerHTML = `
    <div class="phone ph-a" data-tilt="10"><div class="phone-notch"></div><div class="phone-screen"><div class="pui">
      <div class="pui-top"><span class="avatar"><img src="${bramble.avatar}" alt=""></span><div><small>Kia ora</small><b>${P.esc(sarah.name.split(' ')[0])}</b></div></div>
      <div class="pui-body">
        <div class="pui-card pui-dog"><span class="avatar"><img src="${bramble.avatar}" alt=""></span><div><b>${bramble.name}</b><small>${bramble.breed}</small></div><span class="pui-ring" style="--v:${bramble.progress}"><span>${bramble.progress}%</span></span></div>
        <div class="pui-card pui-vid"><div class="pv"><img src="${L.thumb(vid.clip, 40)}" alt=""><span class="playb"><svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg></span></div><div class="pvb"><b>${P.esc(vid.title)}</b><small>${L.fmtDate(vid.created)} · ${vid.duration}</small></div></div>
        <div class="pui-card"><b style="font-family:var(--font-display)">Homework</b><div class="pui-hw" style="margin-top:6px">${latest.homework.map((h, i) => `<label><span class="bx ${i === 0 ? 'on' : ''}">${i === 0 ? P.ic('check') : ''}</span>${P.esc(h)}</label>`).join('')}</div></div>
      </div>
      <div class="pui-tabs"><span class="on">${P.ic('dog')}</span><span>${P.ic('list-checks')}</span><span>${P.ic('book-open')}</span><span>${P.ic('user')}</span></div>
    </div></div></div>
    <div class="phone ph-b" data-tilt="10"><div class="phone-notch"></div><div class="phone-screen"><div class="pui">
      <div class="pui-top"><span class="avatar" style="background:var(--tomato)">L</span><div><small>Trainer</small><b>Linda</b></div></div>
      <div class="pui-body">
        <div class="pui-card pui-session"><span class="pill pill--sun" style="font-size:10px">● Active session</span><b style="display:block;font-family:var(--font-display);font-size:14px;margin-top:6px">${kiwi.name} · ${P.esc(kiwiSession.title)}</b><small>${P.esc(kiwiSession.location)}</small></div>
        <div class="pui-rec"><span class="pui-recbtn"><i></i><b>Record</b></span></div>
        <div class="pui-card" style="margin-top:22px"><small style="font-weight:700">${up.file} · ${up.size}</small><div class="progress progress--striped progress--sky progress--sm" style="margin-top:6px"><i style="--v:${Math.round(up.progress * 100)}%"></i></div></div>
        <div class="pui-card" style="display:flex;align-items:center;gap:8px;background:var(--sun)"><b style="font-family:var(--font-display);font-size:20px">${review}</b><span style="font-weight:700">clips to review</span></div>
      </div>
      <div class="pui-tabs"><span class="on">${P.ic('house')}</span><span>${P.ic('inbox')}</span><span>${P.ic('circle-dot')}</span><span>${P.ic('share-2')}</span></div>
    </div></div></div>
    <span class="sticker sticker--paper dev-sticker ds-1">${P.ic('trending-up')}${bramble.name} · ${bramble.progress}%</span>
    <span class="sticker sticker--tomato dev-sticker ds-2">${P.ic('circle-dot')}One-tap record</span>`;

  // Academy teaser
  const pub = L.guides.filter((g) => g.status === 'published');
  $('[data-acad]').innerHTML = pub.map((g) => {
    const t = L.technique(g.technique);
    const href = g.slug === 'recall-101' ? '/v2/guide/recall-101.html' : `/v2/academy.html#${g.slug}`;
    return `<a class="gcard" href="${href}" data-peek style="--c:${t.color}">
      <div class="gc-media"><img src="${L.thumb(g.clip, 40)}" alt="" loading="lazy"><video muted playsinline loop preload="none" data-src="/shared/media/video/${g.clip}.mp4" aria-hidden="true"></video>
        <div class="gc-top"><span class="pill pill--sun">${P.ic(t.icon)}${P.esc(t.name)}</span><span class="pill">${g.minutes} min</span></div></div>
      <div class="gc-body"><h3>${P.esc(g.title)}</h3><p>${P.esc(g.subtitle)}</p>
        <div class="gc-foot"><span>${g.level}</span><span class="gc-go">${P.ic('arrow-up-right')}</span></div></div></a>`;
  }).join('');

  // Lock art
  const lock = $('[data-lock]');
  lock.insertAdjacentHTML('afterbegin', P.svg.padlockBone());
  $$('.orbit', lock).forEach((o, i) => (o.innerHTML = i === 1 ? P.svg.star() : P.svg.sparkle()));

  // Community
  $('[data-social]').insertAdjacentHTML('afterbegin', L.community.map((c) => {
    const d = L.dog(c.dog);
    return `<article class="soc"><div class="soc-h"><span class="avatar"><img src="${d.avatar}" alt=""></span><div><b>${d.name}</b><small>${d.breed}</small></div><span class="pill pill--soft">${c.when}</span></div>
      <div class="soc-img"><img src="${c.img.replace('/img/', '/thumb/')}" alt="${d.name}" loading="lazy"></div>
      <div class="soc-b">${P.esc(c.post)}<div class="acts"><span>${P.ic('heart')}${c.likes}</span><span>${P.ic('message-circle')}${c.comments}</span><span>${P.ic('user-plus')}Add friend</span></div></div></article>`;
  }).join(''));

  // CTA paws
  $$('.cta-paw').forEach((s) => (s.innerHTML = P.svg.paw()));
  P.icons();
  $$('[data-tilt]', $('[data-phones]')).forEach((el) => P.tilt(el, 9));
  $$('.gcard', $('[data-acad]')).forEach((el) => P.tilt(el, 6));
  P.peekCards && P.peekCards($('[data-acad]'));
  P.lazyVideos(document);

  // Buttons
  $('[data-waitlist]').addEventListener('click', (e) => {
    const r = e.currentTarget.getBoundingClientRect(); P.confetti(r.left + r.width / 2, r.top + r.height / 2, 20);
    P.toast('You’re on the list! We’ll let you know when dog profiles open (demo).', { tone: 'ok', icon: 'bell-ring' });
  });
  $$('[data-confetti]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault(); P.confetti(e.clientX || innerWidth / 2, e.clientY || innerHeight / 2, 46);
    const href = b.href; setTimeout(() => P.go(href, e.clientX, e.clientY), P.reduced ? 0 : 750);
  }));

  /* ---------------------------------------------------------
     Recall frame-sequence canvas
     --------------------------------------------------------- */
  const canvas = $('.recall-frame canvas'), ctx = canvas.getContext('2d');
  const FRAMES = 120, imgs = new Array(FRAMES);
  const frameSrc = (i) => `/shared/media/frames/10365/f${String(i + 1).padStart(3, '0')}.jpg`;
  let cur = 0, loadingStarted = false;
  // focal x (0-1) per frame so portrait crops keep the dog in view
  const FOCAL = [[0, .6], [10, .72], [20, .86], [30, .9], [36, .7], [41, .3], [55, .28], [64, .18], [72, .08], [82, .1], [92, .2], [104, .32], [119, .42]];
  function focalAt(f) { for (let i = 0; i < FOCAL.length - 1; i++) { const [a, va] = FOCAL[i], [b, vb] = FOCAL[i + 1]; if (f >= a && f <= b) return va + (vb - va) * ((f - a) / (b - a)); } return .5; }
  function loadFrame(i) { return new Promise((res) => { if (imgs[i]) { res(); return; } const im = new Image(); im.decoding = 'async'; imgs[i] = im; im.onload = () => { im.__ok = true; if (Math.abs(i - cur) < 4) render(cur); res(); }; im.onerror = res; im.src = frameSrc(i); }); }
  async function loadAll() {
    if (loadingStarted) return; loadingStarted = true;
    const order = []; const seen = new Set();
    [16, 8, 4, 2, 1].forEach((s) => { for (let i = 0; i < FRAMES; i += s) if (!seen.has(i)) { seen.add(i); order.push(i); } });
    let k = 0; const worker = async () => { while (k < order.length) { const i = order[k++]; await loadFrame(i); } };
    await Promise.all([worker(), worker(), worker(), worker(), worker()]);
  }
  function nearest(i) { for (let d = 0; d < FRAMES; d++) { const a = imgs[i - d], b = imgs[i + d]; if (a && a.__ok) return a; if (b && b.__ok) return b; } return null; }
  function sizeCanvas() { const r = canvas.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr); render(cur); }
  function render(i) {
    const im = nearest(i); if (!im || !canvas.width) return;
    const cw = canvas.width, ch = canvas.height, iw = im.naturalWidth, ih = im.naturalHeight;
    const s = Math.max(cw / iw, ch / ih), dw = iw * s, dh = ih * s;
    let dx = (cw - dw) / 2; const dy = (ch - dh) / 2;
    if (dw > cw + 1) { const fx = focalAt(i); dx = P.clamp(cw / 2 - fx * dw, cw - dw, 0); }
    ctx.drawImage(im, dx, dy, dw, dh);
  }
  loadFrame(0).then(() => render(0));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { loadAll(); io.disconnect(); } }, { rootMargin: '1400px 0px' });
    io.observe($('.recall'));
  } else loadAll();
  window.addEventListener('resize', () => sizeCanvas());
  sizeCanvas();

  const numEl = $('.rc-num'), barEl = $('.rc-bar'), steps = $$('.rc-step');
  const tPath = $('.rc-trail-path'), tMask = $('.rc-trail-mask'), runner = $('.rc-runner');
  const TL = tPath.getTotalLength();
  tMask.style.strokeDasharray = TL; tMask.style.strokeDashoffset = TL;
  function overlays(p) {
    const q = P.clamp(p / .8, 0, 1);
    const dist = 15 * (1 - q);
    numEl.textContent = dist.toFixed(1);
    barEl.style.width = (q * 100) + '%';
    tMask.style.strokeDashoffset = TL * (1 - q);
    const pt = tPath.getPointAtLength(TL * q), pt2 = tPath.getPointAtLength(Math.min(TL, TL * q + 2));
    const ang = Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180 / Math.PI + 90;
    runner.setAttribute('transform', `translate(${pt.x} ${pt.y}) rotate(${ang.toFixed(1)})`);
    steps.forEach((s, i) => { const on = p >= stepAt[i] && (i === steps.length - 1 || p < stepAt[i + 1]); s.classList.toggle('is-on', on); s.classList.toggle('is-done', p >= (stepAt[i + 1] || 2)); });
  }

  function initRecall() {
    if (P.reduced || !G || !ST) {
      cur = 96; render(cur); overlays(1); $('.bubble--come').style.cssText = 'opacity:1;transform:none;top:auto;bottom:34%'; return;
    }
    const st = { f: 0 };
    const tl = gsap.timeline({ scrollTrigger: { trigger: '.recall-pin', start: 'top top', end: '+=280%', pin: true, scrub: .5, anticipatePin: 1, onRefresh: sizeCanvas } });
    tl.to(st, { f: FRAMES - 1, duration: 1, ease: 'none', onUpdate: () => { cur = Math.round(st.f); render(cur); overlays(tl.progress()); } }, 0)
      .fromTo('.bubble--come', { scale: 0, opacity: 0, rotate: -12 }, { scale: 1, opacity: 1, rotate: -4, duration: .05, ease: 'back.out(3)' }, .03)
      .to('.bubble--come', { scale: 0, opacity: 0, duration: .04, ease: 'back.in(2)' }, .5)
      .fromTo('.bubble--yes', { scale: 0, opacity: 0, rotate: 10 }, { scale: 1, opacity: 1, rotate: 3, duration: .05, ease: 'back.out(3)' }, .8)
      .to('.recall-frame', { rotate: -1, duration: .1, ease: 'sine.inOut' }, .82)
      .to('.recall-frame', { rotate: 0, duration: .1 }, .92);
    overlays(0);
  }

  /* ---------------------------------------------------------
     Intro: paw loader → elastic headline → collage pop
     --------------------------------------------------------- */
  const title = $('.hero-title');
  let titleSplit = null;
  if (G && !P.reduced) {
    if (window.SplitText) titleSplit = SplitText.create(title, { type: 'words,chars', wordsClass: 'sw' });
    gsap.set(titleSplit ? titleSplit.chars : title, { yPercent: -160, opacity: 0 });
    gsap.set('.hero-eyebrow, .hero-copy > *', { y: 30, opacity: 0 });
    gsap.set('.cm', { scale: 0, rotate: () => gsap.utils.random(-25, 25) });
    gsap.set('.hs', { y: -120, opacity: 0 });
    gsap.set('.drag-hint', { opacity: 0 });
    gsap.set('.hero-sun', { scale: 0 });
  }
  const squig = $('.hero-squiggle'); P.prepDraw(squig);

  function heroIn() {
    if (!G || P.reduced) { P.draw(squig); return; }
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to('.hero-sun', { scale: 1, duration: 1.4, ease: 'elastic.out(1, .5)' }, 0)
      .to('.hero-eyebrow', { y: 0, opacity: 1, duration: .8, ease: 'back.out(2)' }, 0)
      .to(titleSplit ? titleSplit.chars : title, { yPercent: 0, opacity: 1, rotate: 0, duration: .95, ease: 'elastic.out(1, .6)', stagger: { each: .018, from: 'start' } }, 0)
      .add(() => P.draw(squig, { duration: .6 }), .45)
      .to('.hero-copy > *', { y: 0, opacity: 1, duration: .6, stagger: .06 }, .3)
      .to('.cm', { scale: 1, rotate: 0, duration: .8, ease: 'back.out(1.5)', stagger: .07 }, .15)
      .to('.hs', { y: 0, opacity: 1, duration: .8, ease: 'bounce.out', stagger: .1 }, .6)
      .to('.drag-hint', { opacity: 1, duration: .6 }, 1.6);
    if (titleSplit) gsap.set(titleSplit.chars, { rotate: () => gsap.utils.random(-35, 35) });
  }

  function runLoader(done) {
    const loader = $('.loader');
    if (!loader) { done(); return; }
    if (html.classList.contains('no-loader') || P.reduced || !G) { loader.remove(); done(); return; }
    try { sessionStorage.setItem('v2:seen', '1'); } catch (e) { /* noop */ }
    if (P.lenis) P.lenis.stop();
    const box = $('.ld-paws', loader), count = $('.ld-count', loader);
    const N = 7, mobile = innerWidth < 700;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1); const el = document.createElement('div'); el.className = 'ld-paw'; el.innerHTML = P.svg.paw();
      const side = i % 2 ? 1 : -1;
      const x = 6 + t * 84 + (mobile ? side * 4 : side * 2), y = 84 - t * 70 + side * 3;
      el.style.left = x + '%'; el.style.top = y + '%'; box.appendChild(el);
    }
    const ang = Math.atan2(-70 * innerHeight, 84 * innerWidth) * 180 / Math.PI + 90;
    const c = { v: 0 };
    const tl = gsap.timeline();
    gsap.set($$('.ld-paw', box), { rotate: ang, scale: 1.9, opacity: 0 });
    tl.to($$('.ld-paw', box), { scale: 1, opacity: 1, duration: .22, ease: 'back.out(4)', stagger: .06 }, 0)
      .to(c, { v: 100, duration: N * .06 + .15, ease: 'power1.inOut', onUpdate: () => (count.textContent = Math.round(c.v) + '%') }, 0)
      .to('.ld-text', { scale: .9, opacity: 0, duration: .2, ease: 'back.in(2)' })
      .add(() => done(), '-=.05')
      .to(loader, { yPercent: -100, borderBottomLeftRadius: '50% 18%', borderBottomRightRadius: '50% 18%', duration: .6, ease: 'expo.inOut' }, '-=.1')
      .add(() => { loader.remove(); if (P.lenis) P.lenis.start(); });
  }

  /* ---------------------------------------------------------
     Draggable stickers + mouse parallax
     --------------------------------------------------------- */
  function initStickers() {
    if (!G || !window.Draggable || P.reduced) return;
    Draggable.create('.hs', {
      type: 'x,y', bounds: '.hero', zIndexBoost: true,
      onPress() { this.target.classList.add('is-drag'); gsap.to(this.target, { scale: 1.18, rotate: gsap.utils.random(-12, 12), boxShadow: '10px 12px 0 #1B1B1B', duration: .3, ease: 'back.out(3)' }); },
      onRelease() { this.target.classList.remove('is-drag'); gsap.to(this.target, { scale: 1, rotate: 0, boxShadow: '4px 4px 0 #1B1B1B', duration: 1, ease: 'elastic.out(1, .3)' }); },
      onDragStart() { gsap.to('.drag-hint', { opacity: 0, duration: .3 }); }
    });
    if (!P.fine) return;
    const els = $$('.hero [data-depth]').map((el) => ({ d: +el.dataset.depth, x: gsap.quickTo(el, 'x', { duration: .9, ease: 'power3.out' }), y: gsap.quickTo(el, 'y', { duration: .9, ease: 'power3.out' }) }));
    $('.hero').addEventListener('pointermove', (e) => {
      const mx = e.clientX / innerWidth - .5, my = e.clientY / innerHeight - .5;
      els.forEach((o) => { o.x(-mx * 46 * o.d); o.y(-my * 32 * o.d); });
    });
  }

  /* ---------------------------------------------------------
     Scroll-driven bits
     --------------------------------------------------------- */
  function initScroll() {
    if (!G || !ST) return;
    // Statement: words colour in as you scroll
    if (!P.reduced && window.SplitText) {
      const s = SplitText.create('.stmt-text', { type: 'words', wordsClass: 'sw2' });
      gsap.set(s.words, { opacity: .14 });
      gsap.to(s.words, { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: '.statement', start: 'top 75%', end: 'bottom 60%', scrub: true } });
      gsap.from('.statement .inl', { scale: 0, rotate: -20, duration: 1, ease: 'back.out(2)', stagger: .2, scrollTrigger: { trigger: '.statement', start: 'top 70%' } });
    }

    initRecall();

    // Ribbons: loop + reverse with scroll direction
    if (!P.reduced) {
      const a = gsap.fromTo('[data-ribbon="a"]', { xPercent: 0 }, { xPercent: -50, duration: 28, ease: 'none', repeat: -1 });
      const b = gsap.fromTo('[data-ribbon="b"]', { xPercent: -50 }, { xPercent: 0, duration: 32, ease: 'none', repeat: -1 });
      let dir = 1;
      ScrollTrigger.create({ trigger: '.ribbons', start: 'top bottom', end: 'bottom top', onUpdate(self) {
        const v = P.clamp(Math.abs(self.getVelocity()) / 400, 1, 5);
        if (self.direction !== dir) dir = self.direction;
        gsap.to([a, b], { timeScale: dir * v, duration: .2, overwrite: true });
        gsap.to([a, b], { timeScale: dir, duration: 1.2, delay: .2, overwrite: false });
      } });
      gsap.fromTo('.ribbon--a', { rotate: -8 }, { rotate: -2, ease: 'none', scrollTrigger: { trigger: '.ribbons', start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.fromTo('.ribbon--b', { rotate: 7 }, { rotate: 2, ease: 'none', scrollTrigger: { trigger: '.ribbons', start: 'top bottom', end: 'bottom top', scrub: true } });
    }

    // Journey: stacked cards shrink & tilt as the next arrives
    const cards = $$('.jcard');
    if (!P.reduced) {
      cards.forEach((c, i) => {
        if (i === cards.length - 1) return;
        gsap.to(c, { scale: .9 + i * .012, rotate: i % 2 ? 1.6 : -1.6, ease: 'none', scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 30%', scrub: true } });
      });
      cards.forEach((c) => gsap.from(c.querySelector('.phone'), { y: 100, rotate: 18, ease: 'back.out(1.4)', duration: .7, scrollTrigger: { trigger: c, start: 'top 90%', once: true } }));
    }
    // AI tags fill in
    const aiTags = $('[data-aitags]');
    if (aiTags) {
      const rec = [{ id: recallGuide.technique, c: .96 }, { id: 't-reinf', c: .82 }, { id: 't-focus', c: .44 }];
      ScrollTrigger.create({ trigger: aiTags.closest('.jcard'), start: 'top 50%', once: true, onEnter: () => setTimeout(() => {
        aiTags.innerHTML = rec.map((t) => `<span>${P.esc(L.technique(t.id).name)} ${Math.round(t.c * 100)}%</span>`).join('');
        if (!P.reduced) gsap.from(aiTags.children, { scale: 0, duration: .5, ease: 'back.out(3)', stagger: .12 });
      }, 900) });
    }
    // fake upload progress loop
    const upBar = $('[data-up]');
    if (upBar && !P.reduced) { const o = { v: 62 }; gsap.to(o, { v: 100, duration: 4, repeat: -1, repeatDelay: 1, ease: 'power1.inOut', onUpdate: () => upBar.style.setProperty('--v', o.v + '%') }); }

    // Phones float in
    if (!P.reduced) {
      gsap.from('.dev-phones .phone', { y: 120, rotate: (i) => (i ? 16 : -16), duration: .8, ease: 'back.out(1.3)', stagger: .1, scrollTrigger: { trigger: '.devices-panel', start: 'top 92%', once: true } });
      gsap.from('.dev-sticker', { scale: 0, duration: .5, ease: 'back.out(3)', stagger: .12, delay: .3, scrollTrigger: { trigger: '.devices-panel', start: 'top 92%', once: true } });
      gsap.to('.devices-panel .sun-deco', { yPercent: 40, ease: 'none', scrollTrigger: { trigger: '.devices-panel', scrub: true } });
      // academy cards
      gsap.from('.acad-row .gcard', { y: 90, rotate: (i) => (i % 2 ? 8 : -8), duration: .7, ease: 'back.out(1.4)', stagger: .07, scrollTrigger: { trigger: '.acad-row', start: 'top 95%', once: true } });
    }

    // Privacy lock
    const lockSvg = $('[data-lock] svg');
    if (lockSvg && !P.reduced) {
      const tl = gsap.timeline({ scrollTrigger: { trigger: '.privacy-panel', start: 'top 90%', once: true } });
      tl.from(lockSvg, { y: -200, rotate: -18, duration: 1.1, ease: 'bounce.out' })
        .from(lockSvg.querySelector('.pl-shackle'), { y: -46, duration: .5, ease: 'back.in(3)' }, '-=.2')
        .from(lockSvg.querySelector('.pl-bone'), { scale: 0, transformOrigin: '50% 50%', rotate: -40, duration: .8, ease: 'elastic.out(1, .4)' }, '-=.1')
        .from('.ladder li', { x: 60, duration: .5, ease: 'back.out(1.6)', stagger: .06 }, 0)
        .from('.lock-art .orbit', { scale: 0, rotate: -90, duration: .8, ease: 'back.out(3)', stagger: .12 }, .8);
      gsap.to(lockSvg.querySelector('.pl-bone'), { rotate: 6, transformOrigin: '50% 50%', duration: .9, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      gsap.to(lockSvg.querySelector('.pl-eyes'), { scaleY: .1, transformOrigin: '50% 50%', duration: .08, yoyo: true, repeat: -1, repeatDelay: 3 });
      gsap.to(lockSvg, { y: -10, duration: 2.2, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.2 });
      gsap.to('.lock-art .orbit', { rotate: 360, duration: 12, ease: 'none', repeat: -1 });
    }

    // Community cards fan out
    if (!P.reduced) {
      const rots = [-9, -3, 4, 10];
      gsap.fromTo('.soc', { rotate: 0, x: (i) => -i * 40, y: 80, opacity: 0 }, { rotate: (i) => rots[i], x: 0, y: 0, opacity: 1, duration: .7, ease: 'back.out(1.4)', stagger: .07, scrollTrigger: { trigger: '.soc-fan', start: 'top 92%', once: true } });
      gsap.from('.cs-badge', { scale: 0, rotate: -60, duration: 1, ease: 'elastic.out(1, .4)', delay: .7, scrollTrigger: { trigger: '.soc-fan', start: 'top 75%', once: true } });
      $$('.soc').forEach((s) => P.tilt(s, 6));
      // CTA paws drift
      gsap.to('.cta-paw', { y: (i) => (i % 2 ? -40 : 40), rotate: (i) => (i % 2 ? 30 : -30), ease: 'none', scrollTrigger: { trigger: '.cta-big', scrub: true } });
    } else {
      [-9, -3, 4, 10].forEach((r, i) => { const s = $$('.soc')[i]; if (s) s.style.transform = `rotate(${r}deg)`; });
    }
  }

  /* ---------------------------------------------------------
     Boot
     --------------------------------------------------------- */
  function start() {
    initScroll();
    initStickers();
    if (ST) ScrollTrigger.refresh();
  }
  runLoader(heroIn);
  if (window.__siteReady === true) start(); else document.addEventListener('site:ready', start, { once: true });
})();
