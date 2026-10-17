/* ==========================================================================
   V3 · home — hero frame-sequence, pinned 3D phone, bento, privacy, etc.
   ========================================================================== */
(function () {
  'use strict';
  const V3 = window.V3;
  const { $, $$, esc, icon } = V3;
  const db = V3.db;
  const RM = V3.reduced();
  const G = !!(window.gsap && window.ScrollTrigger);
  const nav = $('.nav');

  /* ------------------------------------------------------------------ */
  /* Progressive frame-sequence loader + cover-draw                       */
  /* ------------------------------------------------------------------ */
  function FrameSeq(dir, count, canvas) {
    const imgs = new Array(count), ok = new Array(count).fill(false);
    const ctx = canvas.getContext('2d');
    const src = (i) => `${dir}/f${String(i + 1).padStart(3, '0')}.jpg`;
    const order = []; const seen = new Set();
    [32, 16, 8, 4, 2, 1].forEach((step) => { for (let i = 0; i < count; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); } });
    if (!seen.has(count - 1)) order.splice(1, 0, count - 1);
    let cur = 0, dpr = 1, w = 0, h = 0;
    const api = {
      loaded: 0, view: null, focal: [0.5, 0.5],
      setView(v) { api.view = v; api.draw(cur, true); },
      load(i) {
        return new Promise((res) => {
          if (imgs[i]) { res(); return; }
          const im = new Image(); im.decoding = 'async'; im.src = src(i); imgs[i] = im;
          im.onload = () => { ok[i] = true; api.loaded++; if (Math.abs(i - cur) < 3) api.draw(cur); res(); };
          im.onerror = () => res();
        });
      },
      // load in passes with limited concurrency
      async start(first = 8, onFirst) {
        const firstBatch = order.slice(0, first);
        await Promise.all(firstBatch.map((i) => api.load(i)));
        if (onFirst) onFirst();
        const rest = order.slice(first);
        let k = 0;
        const worker = async () => { while (k < rest.length) { const i = rest[k++]; await api.load(i); } };
        await Promise.all([worker(), worker(), worker(), worker()]);
      },
      nearest(i) { if (ok[i]) return i; for (let d = 1; d < count; d++) { if (ok[i - d]) return i - d; if (ok[i + d]) return i + d; } return -1; },
      resize(cw, ch) { dpr = Math.min(window.devicePixelRatio || 1, 2); w = cw; h = ch; canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr); api.draw(cur, true); },
      draw(i, force) {
        i = V3.clamp(Math.round(i), 0, count - 1);
        const n = api.nearest(i);
        if (n < 0) return;
        if (n === api._drawn && i === cur && !force) return;
        cur = i; api._drawn = n;
        const im = imgs[n];
        // Cover-fit into the visible view rect (CSS px → canvas px) around a focal point.
        const vw0 = api.view ? api.view.w * dpr : canvas.width, vh0 = api.view ? api.view.h * dpr : canvas.height;
        const vx = api.view ? api.view.x * dpr : 0, vy = api.view ? api.view.y * dpr : 0;
        const s = Math.max(vw0 / im.naturalWidth, vh0 / im.naturalHeight);
        const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
        const fx = api.focal[0], fy = api.focal[1];
        const dx = V3.clamp(vx + vw0 / 2 - dw * fx, vx + vw0 - dw, vx);
        const dy = V3.clamp(vy + vh0 / 2 - dh * fy, vy + vh0 - dh, vy);
        if (api.view) ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(im, dx, dy, dw, dh);
      },
      get frame() { return cur; }
    };
    return api;
  }

  /* ------------------------------------------------------------------ */
  /* 1 · HERO                                                             */
  /* ------------------------------------------------------------------ */
  const hero = $('.hero');
  const media = $('.hero__media');
  const sticky = $('.hero__sticky');
  const canvas = $('#hero-canvas');
  const seq = FrameSeq('/shared/media/frames/1552', 120, canvas);
  seq.focal = [0.45, 0.38];
  const statements = $$('.hero__statements h2');
  const hud = $('.hero__hud');
  const xm = $('.hero__xmarks');
  const intro = $('.hero__intro');
  const tcEl = $('[data-tc]');
  const scrollHint = $('.hero__scroll');
  const progEl = $('.hero__progress');
  let card = { t: 0, r: 0, b: 0, l: 0 };
  let heroP = 0;
  let introK = RM ? 1 : 0; // intro animation progress (0 → 1)

  function measureCard() {
    const W = sticky.clientWidth, H = sticky.clientHeight;
    const introBottom = intro.offsetTop + intro.offsetHeight;
    const mobile = W < 700;
    let w = mobile ? W - 32 : Math.min(W * 0.6, 1100);
    let top = Math.max(introBottom + (mobile ? 28 : 36), H * 0.38);
    let h = w * 9 / 16;
    const maxH = H - top - (mobile ? 24 : 28);
    if (h > maxH) { h = Math.max(maxH, 140); w = mobile ? w : h * 16 / 9; }
    card = { t: top, l: (W - w) / 2, r: (W - w) / 2, b: H - top - h };
  }
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const seg = (p, a, b) => V3.clamp((p - a) / (b - a), 0, 1);

  function renderHero() {
    const p = heroP;
    const W = sticky.clientWidth, H = sticky.clientHeight;
    const e = ease(seg(p, 0.02, 0.3));
    // intro scale-in (from slightly smaller card)
    const k = ease(introK);
    const shrink = (1 - k) * 0.08;
    const cw = W - card.l - card.r, ch = H - card.t - card.b;
    const t = card.t + ch * shrink / 2, b = card.b + ch * shrink / 2, l = card.l + cw * shrink / 2, r = card.r + cw * shrink / 2;
    const it = t * (1 - e), ib = b * (1 - e), il = l * (1 - e), ir = r * (1 - e);
    const rad = 20 * (1 - e);
    media.style.clipPath = `inset(${it}px ${ir}px ${ib}px ${il}px round ${rad}px)`;
    media.style.opacity = String(Math.min(1, k * 1.4));
    const box = { left: il + 'px', top: it + 'px', width: W - il - ir + 'px', height: H - it - ib + 'px' };
    Object.assign(hud.style, box); Object.assign(xm.style, box);
    hud.style.opacity = String(k);
    xm.style.opacity = String((1 - e) * k);
    // intro fades & lifts
    const fi = seg(p, 0, 0.16);
    intro.style.opacity = String(1 - fi);
    intro.style.transform = `translateY(${-fi * 80}px)`;
    intro.style.visibility = fi >= 1 ? 'hidden' : 'visible';
    // frames
    const fr = p * 119;
    seq.view = { x: il, y: it, w: W - il - ir, h: H - it - ib };
    seq.draw(fr, true);
    tcEl.textContent = V3.tc((fr / 119) * 11.8);
    // statements
    const windows = [[0.3, 0.5], [0.52, 0.72], [0.74, 0.96]];
    statements.forEach((s, i) => {
      const [a, z] = windows[i];
      const inn = seg(p, a, a + 0.06), out = seg(p, z - 0.06, z);
      const o = inn * (1 - out);
      s.style.opacity = String(o);
      s.style.transform = `translateY(${(1 - inn) * 40 - out * 40}px) scale(${0.98 + 0.02 * o})`;
      s.style.filter = `blur(${(1 - o) * 10}px)`;
    });
    media.style.setProperty('--shade', String(0.25 + 0.55 * seg(p, 0.25, 0.35)));
    scrollHint.style.opacity = String(1 - seg(p, 0, 0.05));
    progEl.style.opacity = String(seg(p, 0.25, 0.3));
    progEl.style.setProperty('--p', String(seg(p, 0.3, 0.96)));
    if (nav) nav.classList.toggle('is-dark', p > 0.22 && p < 0.995 && !nav.dataset.lockDark);
  }

  function setupHero() {
    const size = () => {
      if (RM) { const r = media.getBoundingClientRect(); seq.resize(r.width, r.height); return; }
      seq.resize(sticky.clientWidth, sticky.clientHeight);
      measureCard(); renderHero();
    };
    window.addEventListener('resize', V3.debounce(size, 100));
    size();
    if (RM || !G) { seq.start(1, () => seq.draw(0, true)); return; }
    ScrollTrigger.create({
      trigger: hero, start: 'top top', end: 'bottom bottom', scrub: true,
      onUpdate: (self) => { heroP = self.progress; renderHero(); }
    });
  }

  /* Loader + intro timeline ------------------------------------------- */
  function intro_() {
    const loader = $('.loader');
    const numEl = $('[data-loader-num]'), line = $('[data-loader-line]');
    if (RM || !G) { loader.remove(); document.documentElement.classList.add('is-loaded'); return; }
    if (V3.lenis) V3.lenis.stop();
    try { history.scrollRestoration = 'manual'; } catch (e) { /* noop */ }
    window.scrollTo(0, 0);
    const state = { v: 0 };
    let target = 0;
    const t0 = performance.now();
    const counter = gsap.ticker.add(() => {
      const elapsed = performance.now() - t0;
      const timeFloor = Math.min(1, elapsed / 1100);
      const want = Math.max(Math.min(target, timeFloor), Math.min(1, elapsed / 2600));
      state.v += (want - state.v) * 0.12;
      numEl.textContent = String(Math.round(state.v * 100)).padStart(2, '0');
      line.style.transform = `scaleX(${state.v})`;
    });
    const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    let firstDone = false;
    const firstFrames = seq.start(10, () => { firstDone = true; });
    const poll = setInterval(() => { target = Math.min(1, seq.loaded / 10); }, 50);
    Promise.race([Promise.all([fonts, new Promise((r) => { const c = setInterval(() => { if (firstDone) { clearInterval(c); r(); } }, 40); })]), V3.sleep(3200)])
      .then(() => V3.sleep(Math.max(0, 1100 - (performance.now() - t0))))
      .then(() => {
        target = 1; clearInterval(poll);
        return V3.sleep(380);
      })
      .then(() => {
        gsap.ticker.remove(counter);
        numEl.textContent = '100'; line.style.transform = 'scaleX(1)';
        const title = $('.hero__title');
        V3.splitReveal(title, { manual: true });
        const tl = gsap.timeline({ onComplete: () => { loader.remove(); document.documentElement.classList.add('is-loaded'); if (V3.lenis) V3.lenis.start(); ScrollTrigger.sort(); ScrollTrigger.refresh(); } });
        tl.to('.loader__inner', { yPercent: -30, opacity: 0, duration: 0.6, ease: 'power3.in' })
          .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut' }, '-=0.15')
          .add(() => { if (title._splitTween) title._splitTween.play(); }, '-=0.55')
          .fromTo('.hero__kicker', { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out' }, '-=0.5')
          .fromTo('[data-hero-fade]', { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.08 }, '-=0.6')
          .to({ k: 0 }, { k: 1, duration: 1.4, ease: 'expo.out', onUpdate() { introK = this.targets()[0].k; renderHero(); } }, '-=0.95')
          .fromTo('.nav__bar', { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out' }, '-=1.2');
      });
    return firstFrames;
  }

  /* ------------------------------------------------------------------ */
  /* 2 · Manifesto word scrub                                            */
  /* ------------------------------------------------------------------ */
  function setupManifesto() {
    const el = $('[data-words]');
    if (!el) return;
    // wrap words (preserving the highlighted span)
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((w) => { if (!w) return; if (/^\s+$/.test(w)) frag.appendChild(document.createTextNode(w)); else { const s = document.createElement('span'); s.className = 'w'; s.textContent = w; frag.appendChild(s); } });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    const words = $$('.w', el);
    const hl = $('.hl', el);
    if (RM || !G) { words.forEach((w) => w.classList.add('on')); if (hl) hl.style.setProperty('--hl', 1); return; }
    ScrollTrigger.create({
      trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true,
      onUpdate: (s) => {
        const n = Math.round(s.progress * words.length);
        words.forEach((w, i) => w.classList.toggle('on', i < n));
        if (hl) hl.style.setProperty('--hl', V3.clamp(s.progress * 1.6 - 0.6, 0, 1));
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* 3 · How it works — pinned 3D phone                                    */
  /* ------------------------------------------------------------------ */
  function setupHow() {
    const phone = $('#how-phone');
    const screens = $$('[data-scr]', phone);
    const steps = $$('.step');
    const rail = $('.steps');
    const capN = $('[data-cap-n]'), capH = $('[data-cap-h]'), capP = $('[data-cap-p]'), dots = $$('.how__dots i');
    const stepLabel = $('[data-how-step]');
    // Dog list from data
    const list = $('[data-dog-list]');
    const dogs = ['d-bramble', 'd-biscuit', 'd-pickle'].map(V3.dog);
    list.innerHTML = dogs.map((d, i) => `<div class="scr__item" data-dog="${i}"><img src="${esc(d.avatar)}" alt=""><div><b>${esc(d.name)}</b><small>${esc(V3.household(d.household).name)}</small></div><span class="tick" style="opacity:0">${icon('check')}</span></div>`).join('');
    // AI tags
    const m = V3.media('m-1001');
    $('[data-ai-tags]').innerHTML = m.ai.tags.map((t) => { const T = V3.technique(t.id); return `<div class="ai-tag" style="--c:${T.color};--v:${t.c}"><span class="t">${esc(T.name)}</span><span class="b"><i></i></span><span class="n">${Math.round(t.c * 100)}%</span></div>`; }).join('');
    V3.icons();
    const camVid = $('[data-scr="1"] video');
    const typed = $('[data-typed]');
    const ring = $('[data-ring]'), pct = $('[data-pct]'), mb = $('[data-mb]'), upstate = $('[data-upstate]');
    const ai = $('[data-ai]');
    const aud = $$('[data-aud] .aud__opt');
    const approve = $('[data-approve]');
    const states = $$('[data-share-states] > div');
    const rec = $('[data-rec]');
    $('[data-revisit]').innerHTML = m.timestamps.map((t) => `<div class="scr__item"><span class="mono" style="font-size:.8em;width:3em">${esc(t.t)}</span><div><b>${esc(t.label)}</b><small>Tap to jump · 0:42 clip</small></div></div>`).join('') + `<div class="scr__item"><span class="tick" style="margin:0">${icon('check')}</span><div><b>Homework 2 / 3</b><small>${esc(V3.session('s-101').title)}</small></div></div>`;
    const revisit = $$('[data-revisit] .scr__item');
    let active = -1;

    const setActive = (i) => {
      if (i === active) return;
      active = i;
      screens.forEach((s, k) => s.classList.toggle('is-active', k === i));
      steps.forEach((s, k) => { s.classList.toggle('is-active', k === i); s.classList.toggle('is-done', k < i); });
      const st = steps[i];
      capN.textContent = String(i + 1).padStart(2, '0'); capH.textContent = st.querySelector('h3').textContent; capP.textContent = st.querySelector('p').textContent;
      dots.forEach((d, k) => d.classList.toggle('on', k <= i));
      stepLabel.textContent = `Step ${String(i + 1).padStart(2, '0')} / 07`;
      phone.classList.toggle('phone--dark-status', i === 1);
      if (i === 6) revisit.forEach((r, k) => r.classList.toggle('is-sel', k === 1));
      if (i === 1) { if (!camVid.getAttribute('src')) camVid.src = camVid.dataset.src; const pr = camVid.play(); if (pr && pr.catch) pr.catch(() => {}); } else camVid.pause();
    };
    const sub = (i, local) => {
      if (i === 0) {
        const word = 'Bram'; const n = Math.round(V3.clamp(local * 2.2, 0, 1) * word.length);
        typed.textContent = word.slice(0, n);
        $$('.scr__item', list).forEach((it, k) => { const sel = k === 0 && local > 0.5; it.classList.toggle('is-sel', sel); it.style.opacity = n >= 3 && k > 0 ? 0.35 : 1; it.querySelector('.tick').style.opacity = sel ? 1 : 0; });
      } else if (i === 1) {
        rec.textContent = V3.fmtSec(local * 42).padStart(5, '0');
      } else if (i === 2) {
        const v = V3.clamp(local * 1.25, 0, 1);
        ring.style.strokeDashoffset = String(100 - v * 100);
        pct.textContent = Math.round(v * 100) + '%';
        mb.textContent = `${Math.round(v * 287)} / 287 MB`;
        upstate.textContent = v >= 1 ? 'Uploaded · processing' : 'Uploading · 4.1 MB/s';
      } else if (i === 3) {
        ai.classList.toggle('is-gen', local < 0.3);
      } else if (i === 4) {
        aud.forEach((a, k) => a.classList.toggle('is-sel', local > 0.35 ? k === 1 : k === 0));
        const done = local > 0.75;
        if (approve.dataset.done !== String(done)) {
          approve.dataset.done = String(done);
          approve.innerHTML = done ? `Approved for household ${icon('check-check')}` : `Approve &amp; share ${icon('check')}`;
          approve.style.background = done ? 'var(--kawa)' : '';
          approve.style.color = done ? '#fff' : '';
          V3.icons(approve);
        }
      } else if (i === 5) {
        states.forEach((s, k) => s.classList.toggle('off', local < [0, 0.3, 0.65][k]));
      }
    };
    setActive(0); sub(0, 0);
    if (RM || !G) { setActive(6); return; }
    const STEPS = 7;
    const mm = gsap.matchMedia();
    mm.add({ d: '(min-width: 901px)', m: '(max-width: 900px)' }, (ctx) => {
      const isD = ctx.conditions.d;
      ScrollTrigger.create({
        trigger: '.how', start: 'top top', end: () => '+=' + window.innerHeight * STEPS * (isD ? 0.8 : 0.7),
        pin: '.how__pin', scrub: true, anticipatePin: 1,
        onUpdate: (s) => {
          const p = s.progress;
          const f = p * STEPS; const i = Math.min(STEPS - 1, Math.floor(f)); const local = f - i;
          setActive(i); sub(i, i === STEPS - 1 && p >= 0.999 ? 1 : local);
          rail.style.setProperty('--p', p);
          const ry = -22 + 40 * p + Math.sin(p * Math.PI * STEPS) * 3;
          const rx = 9 - 13 * p;
          phone.style.transform = `rotateY(${ry}deg) rotateX(${rx}deg) translateZ(0)`;
        }
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* 4 · Bento micro-UIs                                                  */
  /* ------------------------------------------------------------------ */
  function setupBento() {
    // AI tile
    const m = V3.media('m-1001');
    const titleEl = $('[data-ai-title]'), confEl = $('[data-ai-conf]'), evEl = $('[data-ai-ev]'), frames = $$('[data-frames] i');
    const tile = $('.tile--ai');
    const vid = tile.querySelector('video');
    let typing = null;
    const run = () => {
      clearInterval(typing);
      titleEl.innerHTML = '<span class="skel" style="display:block;height:18px;width:80%"></span>';
      confEl.innerHTML = m.ai.tags.map(() => '<div class="skel" style="height:12px;margin:9px 0"></div>').join('');
      evEl.textContent = 'Sampling frames…';
      let f = 0;
      const fi = setInterval(() => { frames.forEach((x, k) => x.classList.toggle('on', k <= f)); f++; if (f > frames.length) clearInterval(fi); }, 110);
      setTimeout(() => {
        const txt = m.ai.title; let n = 0;
        titleEl.innerHTML = '<span></span><span class="caret"></span>';
        const span = titleEl.firstChild;
        typing = setInterval(() => { span.textContent = txt.slice(0, ++n); if (n >= txt.length) { clearInterval(typing); } }, RM ? 0 : 28);
        confEl.innerHTML = m.ai.tags.map((t) => { const T = V3.technique(t.id); return `<div class="conf" style="--c:${T.color}"><span>${esc(T.name)}</span><span class="conf__track"><i style="--v:${t.c};--c:var(--graphite)"></i></span><span class="num">${Math.round(t.c * 100)}%</span></div>`; }).join('');
        evEl.textContent = m.ai.evidence.join(' · ');
      }, 1000);
    };
    if (G && !RM) ScrollTrigger.create({ trigger: tile, start: 'top 70%', once: true, onEnter: () => { run(); if (!vid.getAttribute('src')) vid.src = vid.dataset.src; const p = vid.play(); if (p && p.catch) p.catch(() => {}); } });
    else run();
    if (G) ScrollTrigger.create({ trigger: tile, start: 'top bottom', end: 'bottom top', onToggle: (s) => { if (!s.isActive) vid.pause(); else if (vid.getAttribute('src') && !RM) { const p = vid.play(); if (p && p.catch) p.catch(() => {}); } } });
    $('[data-ai-regen]').addEventListener('click', run);
    $('[data-ai-accept]').addEventListener('click', (e) => { V3.toast('Draft accepted — still private until Linda approves', { sub: 'Demo · AI never publishes' }); e.currentTarget.innerHTML = `${icon('check-check')} Accepted`; V3.icons(); });

    // Trim tile
    const trim = $('[data-trim]');
    const thumbs = [15, 40, 65, 90, 15, 40, 65, 90].map((p, i) => `<img src="${V3.thumb(i < 4 ? 10365 : 1494, p)}" alt="" draggable="false">`).join('');
    trim.insertAdjacentHTML('afterbegin', thumbs);
    const sel = $('[data-sel]', trim);
    const TOTAL = 42;
    let a = 0.2, b = 0.7;
    const upd = () => {
      sel.style.left = a * 100 + '%'; sel.style.width = (b - a) * 100 + '%';
      $('[data-in]').textContent = V3.fmtSec(a * TOTAL); $('[data-out]').textContent = V3.fmtSec(b * TOTAL); $('[data-dur]').textContent = V3.fmtSec((b - a) * TOTAL);
      $$('[data-h]', trim).forEach((h) => { h.setAttribute('aria-valuenow', Math.round((h.dataset.h === 'l' ? a : b) * TOTAL)); h.setAttribute('aria-valuetext', V3.fmtSec((h.dataset.h === 'l' ? a : b) * TOTAL)); });
    };
    $$('[data-h]', trim).forEach((h) => {
      h.addEventListener('pointerdown', (e) => {
        e.preventDefault(); h.setPointerCapture(e.pointerId);
        const move = (ev) => { const r = trim.getBoundingClientRect(); const x = V3.clamp((ev.clientX - r.left) / r.width, 0, 1); if (h.dataset.h === 'l') a = Math.min(x, b - 0.08); else b = Math.max(x, a + 0.08); upd(); };
        const up = () => { h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); };
        h.addEventListener('pointermove', move); h.addEventListener('pointerup', up);
      });
      h.addEventListener('keydown', (e) => { const d = e.key === 'ArrowRight' ? 0.02 : e.key === 'ArrowLeft' ? -0.02 : 0; if (!d) return; e.preventDefault(); if (h.dataset.h === 'l') a = V3.clamp(a + d, 0, b - 0.08); else b = V3.clamp(b + d, a + 0.08, 1); upd(); });
    });
    upd();

    // Visibility tile
    const notes = [
      ['lock', 'Default for every new clip. Only Linda can see it.'],
      ['house', 'Invited adults in the Thompson household can watch in the portal.'],
      ['users', 'Expanded to each eligible household in “Recall Bootcamp”.'],
      ['shield-alert', 'Locked until a consent record covers everyone identifiable in the clip.']
    ];
    const vd = $('.vis-demo'), vn = $('[data-vis-note]');
    vd.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-v]'); if (!btn) return;
      $$('[data-v]', vd).forEach((x) => x.setAttribute('aria-pressed', String(x === btn)));
      const [ic, tx] = notes[+btn.dataset.v];
      vn.innerHTML = `${icon(ic)}<span>${tx}</span>`; vn.style.color = btn.dataset.v === '3' ? 'var(--danger)' : '';
      V3.icons();
      if (G && !RM) gsap.fromTo(vn, { y: 6, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'expo.out' });
    });

    // Archive tile
    const ib = $('[data-inbox]');
    const rows = db.inbox.slice(0, 4);
    const lbl = { unassigned: 'Unassigned', assigned: 'Assigned', too_large: 'Too large', quarantined: 'Quarantined' };
    ib.innerHTML = rows.map((r) => `<div class="inbox-demo__row" data-row="${r.id}">${r.thumb ? `<img src="${esc(r.thumb)}" alt="">` : `<span class="ico">${icon(r.kind === 'voice' ? 'audio-lines' : 'file-video')}</span>`}<div style="min-width:0"><b style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:22ch">${esc(r.caption.replace(/^Fwd: /, ''))}</b><small>${esc(r.size || '')} · ${esc(r.kind)}</small></div>${V3.state(r.state, lbl[r.state])}</div>`).join('');
    if (G && !RM) {
      ScrollTrigger.create({ trigger: ib, start: 'top 85%', once: true, onEnter: () => {
        gsap.from($$('.inbox-demo__row', ib), { x: -18, opacity: 0, stagger: 0.12, duration: 0.8, ease: 'expo.out' });
        setTimeout(() => { const r0 = $('[data-row="wa-1"]', ib); if (!r0) return; const st = r0.querySelector('.state'); st.dataset.s = 'assigned'; st.textContent = '→ Pickle'; gsap.fromTo(r0, { backgroundColor: 'rgba(212,255,58,.18)' }, { backgroundColor: 'rgba(255,255,255,.05)', duration: 1.4 }); }, 2200);
      } });
    }

    // Timeline tile
    const ss = V3.sessionsForDog('d-bramble').sort((x, y) => y.date.localeCompare(x.date)).slice(0, 4);
    $('[data-tl]').innerHTML = ss.map((s) => `<div><span class="num">${V3.fmtDate(s.date)}</span><i></i><span>${esc(s.title)}</span></div>`).join('');
  }

  /* ------------------------------------------------------------------ */
  /* 5 · Portal phone                                                      */
  /* ------------------------------------------------------------------ */
  function setupPortal() {
    const d = V3.dog('d-bramble');
    const m = V3.media('m-1001');
    const s = V3.session('s-101');
    $('[data-pui]').innerHTML = `
      <div class="pui__top"><span class="pui__hh">${icon('house', '')} Thompson ▾</span><span class="avatar" style="--s:2.6em;font-size:.85em">ST</span></div>
      <div class="pui__dog"><img src="${esc(d.photo)}" alt=""><div class="pui__dog-info"><span class="mono">${esc(d.breed)} · ${esc(d.age)}</span><b>${esc(d.name)}</b><div class="pui__prog"><span class="mono" style="font-size:.9em">Progress</span><i></i><span class="mono" style="font-size:.9em">${d.progress}%</span></div></div></div>
      <div class="pui__card"><img src="${V3.thumb(m.clip, 40)}" alt=""><div><b>${esc(m.title)}</b><small>${V3.fmtDate(m.created)} · ${esc(m.duration)} · 3 notes</small></div></div>
      <div class="pui__hw"><span class="mono" style="font-size:.8em;color:var(--grey)">Homework · ${esc(s.title)}</span>${s.homework.map((h, i) => `<div><i class="${i === 0 ? 'on' : ''}">${i === 0 ? icon('check') : ''}</i><span>${esc(h)}</span></div>`).join('')}</div>
      <div class="pui__tabs"><span class="on">${icon('paw-print')}</span><span>${icon('list-checks')}</span><span>${icon('library')}</span><span>${icon('user-round')}</span></div>`;
    V3.icons();
    if (!G || RM) return;
    $$('[data-pc]').forEach((c) => gsap.fromTo(c, { y: +c.dataset.pc * -1 }, { y: +c.dataset.pc, ease: 'none', scrollTrigger: { trigger: '[data-portal-stage]', start: 'top bottom', end: 'bottom top', scrub: true } }));
    gsap.fromTo('[data-portal-phone]', { rotate: -4, y: 60 }, { rotate: 3, y: -40, ease: 'none', scrollTrigger: { trigger: '[data-portal-stage]', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  /* ------------------------------------------------------------------ */
  /* 6 · Privacy letterbox + permission diagram                            */
  /* ------------------------------------------------------------------ */
  function buildPerm() {
    const nodes = [
      { k: '01 · Default', t: 'Trainer only', d: ['Every upload and forward.', 'Linda only.'] },
      { k: '02', t: 'Household', d: ['Invited adults in', 'that household.'] },
      { k: '03', t: 'Group', d: ['An app-managed class,', 'expanded per household.'] },
      { k: '04', t: 'Public', d: ['Website & guides.', 'Separate, audited.'] }
    ];
    const H = (() => {
      const xs = [70, 380, 690, 1130], y = 120, gx = 910;
      let s = `<svg class="perm__svg perm__svg--h" viewBox="0 0 1200 270" role="img" aria-label="Permission model: Trainer only, then Household, then Group, then a consent gate before Public.">`;
      s += `<path class="line" d="M${xs[0]} ${y} H${xs[3]}"/><path class="line-draw" pathLength="1" d="M${xs[0]} ${y} H${xs[3]}"/>`;
      s += `<path class="dash" d="M${xs[0]} ${y + 16} V230 H260"/><text class="t-mono" x="270" y="234">AI drafts never publish or grant access</text>`;
      nodes.forEach((n, i) => {
        const x = xs[i];
        s += `<g data-node="${i}"><circle class="node${i === 0 ? ' node-on' : ''}" cx="${x}" cy="${y}" r="11"/><circle cx="${x}" cy="${y}" r="4" fill="#08090A"/>`;
        s += `<text class="t-mono" x="${x}" y="${y - 34}" text-anchor="${i === 0 ? 'start' : i === 3 ? 'end' : 'middle'}" dx="${i === 0 ? -11 : i === 3 ? 11 : 0}">${n.k}</text>`;
        s += `<text class="t-title" x="${x}" y="${y + 50}" text-anchor="${i === 0 ? 'start' : i === 3 ? 'end' : 'middle'}" dx="${i === 0 ? -11 : i === 3 ? 11 : 0}">${n.t}</text>`;
        n.d.forEach((ln, j) => { s += `<text class="t-desc" x="${x}" y="${y + 76 + j * 19}" text-anchor="${i === 0 ? 'start' : i === 3 ? 'end' : 'middle'}" dx="${i === 0 ? -11 : i === 3 ? 11 : 0}">${esc(ln)}</text>`; });
        s += `</g>`;
      });
      s += `<g data-gate><rect class="gate" x="${gx - 34}" y="${y - 34}" width="68" height="68" rx="16"/><path d="M${gx} ${y - 14} l13 5 v8 c0 9 -6 14 -13 17 c-7 -3 -13 -8 -13 -17 v-8 z" fill="none" stroke="#D4FF3A" stroke-width="1.6" stroke-linejoin="round"/><path d="M${gx - 5} ${y + 1} l4 4 l7 -8" fill="none" stroke="#D4FF3A" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
      s += `<text class="t-mono" x="${gx}" y="${y - 50}" text-anchor="middle" style="fill:#D4FF3A">Consent gate</text><text class="t-desc" x="${gx}" y="${y + 60}" text-anchor="middle">Recorded, scoped,</text><text class="t-desc" x="${gx}" y="${y + 79}" text-anchor="middle">withdrawable.</text></g>`;
      return s + '</svg>';
    })();
    const V = (() => {
      const ys = [40, 210, 380, 760], x = 40, gy = 570;
      let s = `<svg class="perm__svg perm__svg--v" viewBox="0 0 360 840" role="img" aria-label="Permission model: Trainer only, then Household, then Group, then a consent gate before Public.">`;
      s += `<path class="line" d="M${x} ${ys[0]} V${ys[3]}"/><path class="line-draw" pathLength="1" d="M${x} ${ys[0]} V${ys[3]}"/>`;
      nodes.forEach((n, i) => {
        const y = ys[i];
        s += `<g data-node="${i}"><circle class="node${i === 0 ? ' node-on' : ''}" cx="${x}" cy="${y}" r="11"/><circle cx="${x}" cy="${y}" r="4" fill="#08090A"/>`;
        s += `<text class="t-mono" x="${x + 34}" y="${y - 14}">${n.k}</text><text class="t-title" x="${x + 34}" y="${y + 14}">${n.t}</text>`;
        n.d.forEach((ln, j) => { s += `<text class="t-desc" x="${x + 34}" y="${y + 40 + j * 19}">${esc(ln)}</text>`; });
        s += `</g>`;
      });
      s += `<g data-gate><rect class="gate" x="${x - 30}" y="${gy - 30}" width="60" height="60" rx="14"/><path d="M${x} ${gy - 12} l11 4 v7 c0 8 -5 12 -11 15 c-6 -3 -11 -7 -11 -15 v-7 z" fill="none" stroke="#D4FF3A" stroke-width="1.6"/><text class="t-mono" x="${x + 46}" y="${gy - 6}" style="fill:#D4FF3A">Consent gate</text><text class="t-desc" x="${x + 46}" y="${gy + 16}">Recorded, scoped, withdrawable.</text></g>`;
      return s + '</svg>';
    })();
    $('[data-perm]').innerHTML = H + V;
  }
  function setupPrivacy() {
    buildPerm();
    const lb = $('[data-letterbox]');
    const pc = $('#privacy-canvas');
    const seq2 = FrameSeq('/shared/media/frames/4839', 120, pc);
    const tc2 = $('[data-tc2]');
    const size = () => { const r = $('.privacy__pin').getBoundingClientRect(); const w = r.width; const mob = window.innerWidth <= 860; seq2.resize(w, mob ? w * 1.25 : w / 2.39); };
    window.addEventListener('resize', V3.debounce(size, 120));
    size();
    // Lazy-start privacy frames when near
    let started = false;
    const startSeq = () => { if (started) return; started = true; seq2.start(6, () => seq2.draw(0, true)); };
    const words = $('[data-privacy-words]');
    const draws = $$('.perm .line-draw');
    const nodes = $$('.perm [data-node]');
    const gates = $$('.perm [data-gate]');
    if (RM || !G) { startSeq(); draws.forEach((d) => (d.style.strokeDashoffset = 0)); nodes.forEach((n) => n.querySelector('.node').classList.add('node-on')); return; }
    ScrollTrigger.create({ trigger: '.privacy', start: 'top 150%', once: true, onEnter: startSeq });
    const mm = gsap.matchMedia();
    mm.add({ d: '(min-width: 861px)', m: '(max-width: 860px)' }, (ctx) => {
      const isD = ctx.conditions.d;
      gsap.set(lb, { width: isD ? '78%' : '92%' });
      const tl = gsap.timeline({ scrollTrigger: { trigger: '.privacy__pin', start: 'top top', end: '+=160%', pin: true, scrub: true, onUpdate: (s) => { seq2.draw(s.progress * 119); tc2.textContent = V3.tc(s.progress * 9.6); } } });
      tl.to(lb, { width: isD ? '100%' : '100%', borderRadius: 0, ease: 'none', duration: 1 }, 0)
        .fromTo('.privacy__statement > div', { opacity: 0, y: 40, filter: 'blur(12px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', ease: 'power2.out', duration: 0.35 }, 0.12)
        .to('.privacy__statement > div', { opacity: 0, y: -30, duration: 0.2, ease: 'power2.in' }, 0.85);
    });
    gsap.set(words, { opacity: 1 });
    // diagram line-draw scrub
    const tl2 = gsap.timeline({ scrollTrigger: { trigger: '[data-perm]', start: 'top 80%', end: 'bottom 45%', scrub: 0.6, onUpdate: (s) => {
      const p = s.progress;
      nodes.forEach((n) => { const i = +n.dataset.node; const thr = [0, 0.3, 0.58, 0.98][i]; n.querySelector('.node').classList.toggle('node-on', p >= thr); });
      gates.forEach((g) => g.style.opacity = p > 0.7 ? 1 : 0.35);
    } } });
    tl2.fromTo(draws, { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none' });
  }

  /* ------------------------------------------------------------------ */
  /* 7 · Metrics, academy, community, CTA                                */
  /* ------------------------------------------------------------------ */
  function setupRest() {
    // metrics
    const counts = $$('[data-count]');
    const go = () => counts.forEach((c, i) => setTimeout(() => V3.countUp(c, +c.dataset.count, { dur: 1600 }), i * 120));
    if (G && !RM) ScrollTrigger.create({ trigger: '[data-metrics]', start: 'top 80%', once: true, onEnter: go }); else counts.forEach((c) => (c.textContent = c.dataset.count));

    // academy
    const gs = db.guides.filter((g) => g.status === 'published').slice(0, 4);
    $('[data-home-guides]').innerHTML = gs.map((g, i) => V3.guideCard(g, i === 0)).join('');
    $$('[data-home-guides] .gcard').forEach((c) => c.setAttribute('data-reveal', ''));

    // community
    const track = $('[data-comm]');
    const cards = db.community.map((c) => {
      const d = V3.dog(c.dog);
      return `<article class="comm-card" aria-hidden="false"><div class="comm-card__img"><img src="${esc(c.img)}" alt="${esc(d.name)}" loading="lazy"><span class="comm-lock pill pill--glass pill--mono">${icon('lock')} Preview</span></div>
        <div class="comm-card__body"><div class="comm-card__who"><span class="avatar" style="--s:34px"><img src="${esc(d.avatar)}" alt=""></span><div><b>${esc(d.name)}</b><small>${esc(d.breed)} · ${esc(c.when)}</small></div></div><p>${esc(c.post)}</p><div class="comm-card__stats"><span>${icon('heart')} ${c.likes}</span><span>${icon('message-circle')} ${c.comments}</span></div></div></article>`;
    }).join('');
    track.innerHTML = cards + cards.replace(/aria-hidden="false"/g, 'aria-hidden="true"') + cards.replace(/aria-hidden="false"/g, 'aria-hidden="true"');
    if (G && !RM) {
      const tw = gsap.to(track, { xPercent: -33.333, ease: 'none', duration: 40, repeat: -1 });
      track.addEventListener('pointerenter', () => gsap.to(tw, { timeScale: 0.15, duration: 0.6 }));
      track.addEventListener('pointerleave', () => gsap.to(tw, { timeScale: 1, duration: 0.6 }));
    }
    $('[data-notify]').addEventListener('click', (e) => { e.currentTarget.innerHTML = `${icon('check')} You’re on the list`; V3.icons(); V3.toast('We’ll let you know when dog profiles open', { sub: 'Demo — nothing stored' }); });

    // CTA ring
    if (G && !RM) gsap.to('[data-cta-ring]', { rotate: 120, ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                  */
  /* ------------------------------------------------------------------ */
  setupHero();
  setupManifesto();
  setupHow();
  setupBento();
  setupPortal();
  setupPrivacy();
  setupRest();
  V3.icons();
  V3.hoverPlay();
  V3.magnetic();
  intro_();
  if (V3.setupReveals) V3.setupReveals();
  if (!RM && V3.revealSafety) V3.revealSafety();
  if (G && !RM) {
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
    // reveal home guide cards (added after site.js batch ran)
    window.addEventListener('load', () => ScrollTrigger.refresh());
  }
})();
