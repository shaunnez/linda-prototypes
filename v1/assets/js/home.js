/* ==========================================================================
   home.js — Golden Hour signature moments
   preloader · hero frame-scrub · circular reveal + scrub · journey film strip
   · pinned phone · velocity marquee · academy previews · privacy line-draw
   ========================================================================== */
(function () {
  'use strict';
  const { $, $$, icon, icons, reduced, store, lazyVideos } = window.UI;
  const L = window.LINDA;
  const hasGSAP = !!window.gsap && !!window.ScrollTrigger;
  document.documentElement.classList.toggle('reduced', reduced || !hasGSAP);
  if (hasGSAP) ScrollTrigger.config({ ignoreMobileResize: true });

  /* ---------------- Frame sequence ---------------- */
  class Seq {
    constructor(canvas, id, opts = {}) {
      this.c = canvas; this.ctx = canvas.getContext('2d');
      this.id = id; this.n = opts.n || 120;
      // focal point (0–1 in image space) kept centred when the cover-crop cuts the frame
      this.fx = opts.fx != null ? opts.fx : 0.5; this.fy = opts.fy != null ? opts.fy : 0.5;
      this.imgs = []; this.ok = new Array(this.n).fill(false); this.cur = 0; this.drawn = -1;
      this.resize();
      let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { this.resize(); this.draw(this.cur, true); }, 120); });
    }
    src(i) { return `/shared/media/frames/${this.id}/f${String(i + 1).padStart(3, '0')}.jpg`; }
    load(i) {
      if (this.imgs[i]) return this.imgs[i].p;
      const img = new Image();
      img.decoding = 'async';
      const p = new Promise((res) => {
        img.onload = () => { this.ok[i] = true; if (this.drawn < 0 || Math.abs(i - this.cur) < Math.abs(this.drawn - this.cur)) this.draw(this.cur, true); res(true); };
        img.onerror = () => res(false);
      });
      img.src = this.src(i);
      this.imgs[i] = { img, p };
      return p;
    }
    order() {
      const seen = new Set(), out = [];
      [0, this.n - 1].forEach((i) => { seen.add(i); out.push(i); });
      [24, 12, 6, 3, 1].forEach((step) => { for (let i = 0; i < this.n; i += step) if (!seen.has(i)) { seen.add(i); out.push(i); } });
      return out;
    }
    async loadAll(onProgress, conc = 6) {
      const q = this.order(); let done = 0;
      const worker = async () => { while (q.length) { const i = q.shift(); await this.load(i); done++; onProgress && onProgress(done); } };
      await Promise.all(Array.from({ length: conc }, worker));
    }
    nearest(i) {
      if (this.ok[i]) return i;
      for (let d = 1; d < this.n; d++) { if (this.ok[i - d]) return i - d; if (this.ok[i + d]) return i + d; }
      return -1;
    }
    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = this.c.getBoundingClientRect();
      this.c.width = Math.max(1, Math.round(r.width * dpr));
      this.c.height = Math.max(1, Math.round(r.height * dpr));
      this.drawn = -1;
    }
    draw(i, force) {
      i = Math.max(0, Math.min(this.n - 1, Math.round(i)));
      this.cur = i;
      const k = this.nearest(i);
      if (k < 0 || (k === this.drawn && !force)) return;
      const img = this.imgs[k].img;
      const cw = this.c.width, ch = this.c.height;
      const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const w = img.naturalWidth * s, h = img.naturalHeight * s;
      const x = Math.min(0, Math.max(cw - w, cw / 2 - this.fx * w));
      const y = Math.min(0, Math.max(ch - h, ch / 2 - this.fy * h));
      this.ctx.drawImage(img, x, y, w, h);
      this.drawn = k;
    }
  }

  /* ---------------- Build dynamic content ---------------- */
  const approved = (m) => m.editorial === 'approved_shared' || m.editorial === 'published_public';
  const tech = (id) => L.technique(id);
  const tagHTML = (id) => { const t = tech(id); return t ? `<span class="tag" data-tech="${t.id}">${t.name}</span>` : ''; };

  function buildStoryTag() {
    const d = L.dog('d-bramble');
    $('#story-tag').innerHTML = `<img src="${d.avatar}" alt=""><span><b>This is ${d.name}.</b> <span class="muted">${d.breed} · ${d.age}</span></span>`;
  }

  function buildJourney() {
    const m = L.mediaItem('m-1001');
    const up = L.uploads.find((u) => u.state === 'uploading');
    const chapters = [
      { n: '01', t: 'Record', em: '', clip: 10365, body: 'Linda chooses the client and dog first, then taps record. The context sticks — the next clip needs no re-selecting.', meta: ['<b>pwa_camera</b>', 'Bramble', 'Western Springs'],
        ov: `<div class="ov-rec"><span class="ov-rec__dot">REC 00:12</span><span class="ov-shutter"></span></div>` },
      { n: '02', t: 'Upload', em: '', clip: 1476, body: 'The file streams straight to secure video hosting the moment the camera closes. If the signal drops, it resumes where it left off.', meta: ['<b>tus</b> resumable', up ? up.size : '287 MB', 'private by default'],
        ov: `<div class="ov-card"><div class="row row--between"><b>${up ? up.file : 'IMG_4821.MOV'}</b><span class="mono">${up ? Math.round(up.progress * 100) : 62}%</span></div><div class="progress progress--thin"><div class="progress__bar" style="--p:${up ? up.progress * 100 : 62}%"></div></div><span class="mono">${up ? up.speed : '4.1 MB/s'} · keep the app open</span></div>` },
      { n: '03', t: 'AI drafts', em: '', clip: 50682, body: 'A suggested title, summary, technique tags and transcript appear — with confidence and evidence. No audio? It says so, rather than guessing.', meta: ['draft only', `confidence <b>${Math.round(m.ai.confidence * 100)}%</b>`],
        ov: `<div class="ov-card"><span class="mono">AI SUGGESTION · DRAFT</span><b>${m.ai.title}</b>${m.ai.tags.slice(0, 2).map((tg) => { const t = tech(tg.id); return `<div class="conf" data-tech="${t.id}"><span>${t.name}</span><span class="conf__val">${Math.round(tg.c * 100)}%</span><div class="conf__bar" style="--c:${tg.c}"><span></span></div></div>`; }).join('')}</div>` },
      { n: '04', t: 'Linda reviews', em: '', clip: 50686, body: 'Linda edits the notes, trims the clip and tags the technique. Nothing moves until she approves exactly who should see it.', meta: ['trim', 'tags', '<b>approve</b> & choose audience'],
        ov: `<div class="ov-card"><div class="row row--between"><span class="mono">TRIM 0:04 → 0:31</span><span class="ov-chip">${icon('check')}Approve</span></div><div style="position:relative;height:26px;border-radius:6px;background:repeating-linear-gradient(90deg,rgba(242,235,221,.18) 0 22px,rgba(242,235,221,.08) 22px 24px)"><div style="position:absolute;left:14%;right:22%;top:0;bottom:0;border:2px solid var(--amber);border-radius:6px;background:rgba(232,163,61,.12)"></div></div></div>` },
      { n: '05', t: 'Shared privately', em: '', clip: 42745, body: 'Linda sends a secure portal link from her own WhatsApp. Only invited members of the household can press play — the link alone unlocks nothing.', meta: ['<b>link_only</b>', 'Thompson household', 'never “delivered”'],
        ov: `<div class="ov-card" style="background:rgba(22,40,30,.85)"><span style="font-size:.75rem">${L.shares[0].message}</span><div class="row" style="--gap:6px"><i data-lucide="lock" style="width:12px;height:12px;color:var(--amber)"></i><span class="mono">Private · sign in to watch</span></div></div>` },
      { n: '06', t: 'Revisit anytime', em: '', clip: 1532, body: 'Weeks later it’s still there — Linda’s notes beside the video, and timestamps that jump straight to the good bit.', meta: ['My Dogs', 'timeline', '<b>timestamps</b>'],
        ov: `<div class="ov-card">${m.timestamps.map((ts) => `<div class="row" style="--gap:10px"><b class="mono" style="color:var(--amber)">${ts.t}</b><span>${ts.label}</span></div>`).join('')}</div>` }
    ];
    $('#journey-track').innerHTML = chapters.map((c, i) => `
      <article class="frame" aria-label="Step ${c.n}: ${c.t}">
        <div class="frame__film" data-cursor="Play">
          <img class="frame__poster" src="/shared/media/thumb/${c.clip}-40.jpg" alt="" loading="lazy">
          <video muted playsinline loop preload="none" data-lazy data-src="/shared/media/vertical/${c.clip}.mp4" poster="/shared/media/thumb/${c.clip}-40.jpg" aria-hidden="true"></video>
          <div class="frame__shade"></div>
          <div class="frame__code"><span>FR ${String((i + 1) * 20).padStart(3, '0')}</span><span>${c.n}/06</span></div>
          <div class="frame__overlay">${c.ov}</div>
        </div>
        <div class="frame__text">
          <span class="frame__num" aria-hidden="true">${c.n}</span>
          <div>
            <h3 class="frame__title">${c.t}</h3>
            <p class="frame__body">${c.body}</p>
            <p class="frame__meta">${c.meta.map((x) => `<span>${x}</span>`).join('')}</p>
          </div>
        </div>
      </article>`).join('');
    $('#journey-ticks').innerHTML = chapters.map((c, i) => `<li data-n="${c.n}" class="${i === 0 ? 'is-active' : ''}">${c.n} ${c.t}</li>`).join('');
  }

  function buildPhone() {
    const d = L.dog('d-bramble');
    const hh = L.household(d.household);
    const sarah = L.user(L.currentClient);
    const sess = L.sessionsFor(d.id).filter((s) => s.status === 'completed').sort((a, b) => b.date.localeCompare(a.date));
    const latest = sess[0];
    const vids = L.mediaFor(d.id).filter(approved);
    const m = L.mediaItem('m-1001');
    const status = `<div class="ps-status"><span>9:41</span><span class="ps-status__icons">${icon('signal')}${icon('wifi')}${icon('battery-full')}</span></div>`;
    const tabbar = (on) => `<div class="ps-tabbar">${[['dog', 'Dogs'], ['list-checks', 'Homework'], ['book-open', 'Library'], ['user-round', 'Account']].map(([ic, l], i) => `<span class="${i === on ? 'on' : ''}">${icon(ic)}${l}</span>`).join('')}</div>`;
    const s1 = `<div class="pscreen" data-screen="0">${status}
      <div class="ps-body">
        <span class="ps-hh">${icon('house')}${hh.name}${icon('chevron-down')}</span>
        <div class="ps-hello">Kia ora, <em>${sarah.name.split(' ')[0]}</em></div>
        <div class="ps-dog"><img src="${d.photo}" alt=""><div class="ps-dog__info"><div><div class="ps-dog__name">${d.name}</div><div class="ps-dog__meta">${d.breed} · ${d.age}</div></div>${window.UI.ring(d.progress, { size: 46, stroke: 4 })}</div></div>
        <div class="ps-card"><span class="ps-card__label">Latest session · ${L.fmtDate(latest.date)}</span><span class="ps-card__title">${latest.title}</span><span class="muted" style="font-size:10.5px">${vids.filter((v) => v.session === latest.id).length} new video · ${latest.homework.length} homework tasks</span></div>
      </div>${tabbar(0)}</div>`;
    const s2 = `<div class="pscreen" data-screen="1">${status}
      <div class="ps-cover"><img src="${d.cover}" alt=""></div>
      <div class="ps-title">${d.name}</div>
      <div class="ps-body">
        <div class="ps-tags">${d.techniques.map(tagHTML).join('')}</div>
        <div class="ps-tl">${sess.slice(0, 3).map((s) => {
          const sv = vids.filter((v) => v.session === s.id);
          return `<div class="ps-tl__item"><span class="ps-tl__date">${L.fmtDate(s.date, { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}</span><b style="font-size:12px">${s.title}</b>${sv.map((v) => `<div class="ps-thumb"><img src="${L.thumb(v.clip, 40)}" alt=""><div><b>${v.title}</b><small>${v.duration} · ${v.techniques.map((t) => tech(t).name).join(', ')}</small></div></div>`).join('')}</div>`;
        }).join('')}</div>
      </div>${tabbar(0)}</div>`;
    const s3 = `<div class="pscreen" data-screen="2">${status}
      <div class="ps-video"><video muted playsinline loop preload="none" data-lazy data-src="${L.vid(m.clip)}" poster="${L.img(m.clip, 40)}"></video><div class="ps-video__bar"><i></i><span style="left:38%"></span></div></div>
      <div class="ps-body">
        <span class="ps-card__label">${L.fmtDate(m.created)} · ${m.duration}</span>
        <div class="ps-h">${m.title}</div>
        <div class="ps-note">“${m.notes}” <br><b style="color:var(--amber);font-weight:600">— Linda</b></div>
        <div class="ps-ts">${m.timestamps.map((t, i) => `<div class="${i === 1 ? 'on' : ''}"><b>${t.t}</b>${t.label}</div>`).join('')}</div>
        <div class="ps-tags">${m.techniques.map(tagHTML).join('')}</div>
      </div></div>`;
    $('#phone-screen').insertAdjacentHTML('afterbegin', s1 + s2 + s3);
    const scr = $('#phone-screen');
    const fit = () => {
      const k = scr.clientWidth / 330;
      $$('.pscreen', scr).forEach((el) => { el.style.height = scr.clientHeight / k + 'px'; el.style.scale = k; });
    };
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(scr); else window.addEventListener('resize', fit);
  }

  function buildMarquee() {
    const sep = `<span class="marquee__sep" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z"/></svg></span>`;
    const names = L.techniques.map((t) => t.name);
    const a = names.slice(0, 4).concat(['Check-ins']);
    const b = names.slice(4).concat(['Calm greetings']);
    const fill = (arr) => { let s = ''; for (let k = 0; k < 3; k++) s += arr.map((n) => `<span class="marquee__item">${n}${sep}</span>`).join(''); return s; };
    $('#mq-a').innerHTML = fill(a);
    $('#mq-b').innerHTML = fill(b);
    $$('.marquee__row').forEach((row) => { row.innerHTML += row.innerHTML; row.lastElementChild.setAttribute('aria-hidden', 'true'); });
  }

  function buildGuides() {
    const list = L.guides.filter((g) => g.status === 'published').slice(0, 3);
    $('#home-guides').innerHTML = list.map(window.Site.guideCard).join('');
    window.Site.bindGuidePreviews($('#home-guides'));
  }

  function buildCommunity() {
    $('#community-feed').insertAdjacentHTML('afterbegin', L.community.map((p) => {
      const d = L.dog(p.dog);
      return `<article class="cpost" aria-hidden="true">
        <div class="cpost__head"><span class="avatar avatar--sm"><img src="${d.avatar}" alt=""></span><div><b>${d.name}</b><small>${d.breed} · ${p.when}</small></div></div>
        <div class="cpost__img"><img src="${p.img}" alt="" loading="lazy"></div>
        <p class="cpost__text">${p.post}</p>
        <div class="cpost__foot"><span>${icon('heart')}${p.likes}</span><span>${icon('message-circle')}${p.comments}</span></div>
      </article>`;
    }).join(''));
  }

  buildStoryTag(); buildJourney(); buildPhone(); buildMarquee(); buildGuides(); buildCommunity();
  icons();
  lazyVideos();

  /* ---------------- Sequences ---------------- */
  const heroSeq = new Seq($('.hero__canvas'), 4839, { fx: 0.3, fy: 0.5 });
  const storySeq = new Seq($('.story__canvas'), 1552, { fx: 0.45, fy: 0.4 });
  storySeq.load(0);

  /* ---------------- Preloader ---------------- */
  const pre = $('.preloader');
  const seen = store.sget('v1.seenPreloader', false);
  const NEED = 10; // first 10 frames (spread across the sequence) — the rest stream in the background
  let heroLoaded = 0;
  const heroLoading = heroSeq.loadAll((n) => { heroLoaded = n; }, 4);

  let storyStarted = false;
  function startStoryLoading() { if (storyStarted) return; storyStarted = true; storySeq.loadAll(null, 3); }

  if (reduced || !hasGSAP) {
    pre && pre.remove();
    document.body.classList.remove('is-loading');
    heroSeq.load(0).then(() => heroSeq.draw(0, true));
    storySeq.load(40).then(() => storySeq.draw(40, true));
    window.__fontsReady.then(() => window.__reveals && window.__reveals());
    return;
  }

  window.__lenis && window.__lenis.stop();
  const num = $('.preloader__num'), line = $('.preloader__line span'), fr = $('.preloader__fr');
  const minDur = seen ? 600 : 1500;
  const t0 = performance.now();
  let fontsOk = false; window.__fontsReady.then(() => { fontsOk = true; });
  let shown = 0, finished = false;
  const forceAt = t0 + 2000; // never wait longer than ~2s
  const tick = (now) => {
    const ready = Math.min(1, heroLoaded / NEED) * (fontsOk ? 1 : 0.95);
    const target = now > forceAt ? 1 : Math.min(ready, (now - t0) / minDur);
    shown += (target * 100 - shown) * 0.2;
    if (target >= 1 && shown > 98.5) shown = 100;
    num.textContent = Math.floor(shown);
    line.style.transform = `scaleX(${shown / 100})`;
    fr.textContent = String(Math.round(shown * 1.2)).padStart(3, '0');
    if (shown >= 100 && !finished) { finished = true; finish(); return; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  function finish() {
    store.sset('v1.seenPreloader', true);
    heroSeq.draw(0, true);
    // split hero lines into chars
    const lines = $$('.hero__line');
    let chars = [];
    if (window.SplitText) {
      lines.forEach((l) => { const s = SplitText.create(l, { type: 'chars', mask: 'chars' }); chars = chars.concat(s.chars); });
    }
    const tl = gsap.timeline({ onComplete: () => pre.remove() });
    tl.call(afterIntro, null, 1.1);
    tl.to(num, { yPercent: -110, duration: 0.7, ease: 'power3.in' })
      .to('.preloader__caption, .preloader__top', { opacity: 0, duration: 0.4 }, 0)
      .to(line, { scaleY: 0, duration: 0.4 }, 0.3)
      .to(pre, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.2, ease: 'power4.inOut' }, 0.45)
      .fromTo('.hero__canvas', { scale: 1.3 }, { scale: 1, duration: 2.2, ease: 'gh' }, 0.45)
      .fromTo(chars, { yPercent: 115, rotate: 8 }, { yPercent: 0, rotate: 0, duration: 1.5, stagger: 0.028, ease: 'gh' }, 0.9)
      .fromTo('.hero__eyebrow, .hero__foot > *, .hero__meta, .hero__scroll, .nav', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.2, stagger: 0.08, ease: 'gh' }, 1.3);
  }

  function afterIntro() {
    pre.style.pointerEvents = 'none';
    document.body.classList.remove('is-loading');
    gsap.set('.nav', { clearProps: 'transform,opacity' });
    window.__lenis && window.__lenis.start();
    startStoryLoading();
    setupScroll();
    window.__reveals && window.__reveals();
    ScrollTrigger.refresh();
  }

  /* ---------------- Scroll choreography ---------------- */
  function setupScroll() {
    const mm = gsap.matchMedia();
    const pad3 = (n) => String(n).padStart(3, '0');

    // HERO — pinned scrub
    const hf = { f: 0 };
    const heroFrame = $('.hero__frame');
    gsap.timeline({
      scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=180%', pin: true, scrub: 0.6, anticipatePin: 1 }
    })
      .to(hf, { f: 119, ease: 'none', duration: 1, onUpdate: () => { heroSeq.draw(hf.f); heroFrame.textContent = pad3(Math.round(hf.f) + 1); } }, 0)
      .to('.hero__content', { yPercent: -18, opacity: 0, filter: 'blur(14px)', ease: 'power1.in', duration: 0.55 }, 0.05)
      .to('.hero__vignette', { opacity: 1, duration: 1, ease: 'none' }, 0)
      .to('.hero__glow', { opacity: 0, duration: 0.8 }, 0.2)
      .to('.hero__canvas', { scale: 1.12, duration: 1, ease: 'none' }, 0)
      .to('.hero__scroll', { opacity: 0, duration: 0.1 }, 0);

    // STORY — circular reveal into second scrub
    const sf = { f: 0 };
    const storyFr = $('.story__fr');
    const lines = $$('.story__line');
    const ticks = $$('.story__ticks i');
    const stl = gsap.timeline({
      scrollTrigger: { trigger: '.story', start: 'top top', end: '+=460%', pin: true, scrub: 0.8, anticipatePin: 1 }
    });
    stl.fromTo('.story__reveal', { clipPath: 'circle(9% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)', ease: 'power2.inOut', duration: 1 }, 0)
      .to('.story__intro', { scale: 1.25, opacity: 0, duration: 0.9, ease: 'power1.in' }, 0)
      .to(sf, { f: 119, ease: 'none', duration: 5.2, onUpdate: () => { storySeq.draw(sf.f); storyFr.textContent = pad3(Math.round(sf.f) + 1); } }, 0)
      .fromTo('#story-tag', { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.3 }, 0.85);
    lines.forEach((ln, i) => {
      const at = 1 + i * 1.1;
      stl.fromTo(ln, { opacity: 0, y: 50, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.35, ease: 'power2.out' }, at);
      stl.fromTo(ticks[i], { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: 'none' }, at);
      if (i < lines.length - 1) stl.to(ln, { opacity: 0, y: -40, filter: 'blur(10px)', duration: 0.3, ease: 'power2.in' }, at + 0.8);
    });
    stl.to({}, { duration: 0.3 });

    // JOURNEY — horizontal film strip (≥768px); vertical stack with fade-ups on phones
    const track = $('#journey-track');
    const fill = $('.journey__fill');
    const tickEls = $$('#journey-ticks li');
    mm.add('(min-width: 768px)', () => {
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      const jt = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: '.journey', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.7, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: (self) => {
            fill.style.transform = `scaleX(${self.progress})`;
            const idx = Math.min(5, Math.floor(self.progress * 6 + 0.15));
            tickEls.forEach((t, i) => t.classList.toggle('is-active', i <= idx));
          }
        }
      });
      $$('.frame').forEach((fr) => {
        const vid = $('.frame__film video', fr);
        gsap.fromTo(vid, { scale: 1.2, xPercent: -5 }, { scale: 1.05, xPercent: 5, ease: 'none', scrollTrigger: { trigger: fr, containerAnimation: jt, start: 'left right', end: 'right left', scrub: true } });
      });
    });
    mm.add('(max-width: 767px)', () => {
      $$('.frame').forEach((fr) => {
        gsap.fromTo(fr, { y: 60, opacity: 0.2 }, { y: 0, opacity: 1, duration: 1, ease: 'gh', scrollTrigger: { trigger: fr, start: 'top 90%', once: true } });
      });
    });

    // PHONE — intro tilt + pinned screen swaps
    const screens = $$('.pscreen');
    const steps = $$('.pshow__step');
    gsap.fromTo('#phone', { rotateY: -22, rotateX: 10, y: 120, scale: 0.9 }, { rotateY: 0, rotateX: 0, y: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: '.pshow', start: 'top bottom', end: 'top top', scrub: true } });
    const ptl = gsap.timeline({
      scrollTrigger: {
        trigger: '.pshow', start: 'top top', end: '+=220%', pin: true, scrub: 0.6, anticipatePin: 1,
        onUpdate: (self) => {
          const idx = self.progress < 0.33 ? 0 : self.progress < 0.7 ? 1 : 2;
          steps.forEach((s, i) => s.classList.toggle('is-active', i === idx));
        }
      }
    });
    ptl.to({}, { duration: 0.3 })
      .fromTo(screens[1], { clipPath: 'inset(100% 0% 0% 0% round 0px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 0.6, ease: 'power2.inOut' })
      .to(screens[0], { opacity: 0.25, filter: 'blur(3px)', duration: 0.6, ease: 'power2.inOut' }, '<')
      .fromTo($$('.ps-tl__item', screens[1]), { y: 40, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.4 }, '<0.3')
      .to({}, { duration: 0.4 })
      .fromTo(screens[2], { clipPath: 'inset(100% 0% 0% 0% round 0px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 0.6, ease: 'power2.inOut' })
      .to(screens[1], { opacity: 0.25, filter: 'blur(3px)', duration: 0.6, ease: 'power2.inOut' }, '<')
      .fromTo($$('.ps-ts div', screens[2]), { x: 30, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.08, duration: 0.4 }, '<0.3')
      .to({}, { duration: 0.3 });

    // MARQUEE — velocity reactive speed + skew
    const rows = $$('.marquee__row');
    const loops = rows.map((row, i) => {
      const dir = i % 2 ? 1 : -1;
      return gsap.fromTo(row, { xPercent: dir < 0 ? 0 : -50 }, { xPercent: dir < 0 ? -50 : 0, duration: 60, ease: 'none', repeat: -1 });
    });
    const proxy = { skew: 0, speed: 1 };
    const skewTo = gsap.quickSetter(rows, 'skewX', 'deg');
    const clampSkew = gsap.utils.clamp(-12, 12);
    ScrollTrigger.create({
      trigger: '.marquee', start: 'top bottom', end: 'bottom top',
      onUpdate: (self) => {
        const v = self.getVelocity();
        const sk = clampSkew(v / -260);
        if (Math.abs(sk) > Math.abs(proxy.skew)) {
          proxy.skew = sk;
          gsap.to(proxy, { skew: 0, duration: 0.9, ease: 'power3', overwrite: true, onUpdate: () => skewTo(proxy.skew) });
        }
        const sp = 1 + Math.min(Math.abs(v) / 120, 14);
        loops.forEach((lp) => { lp.timeScale(sp * (self.direction < 0 ? -1 : 1)); gsap.to(lp, { timeScale: self.direction < 0 ? -1 : 1, duration: 1.4, ease: 'power2.out', overwrite: true }); });
      }
    });

    // PRIVACY — line draw
    const draws = $$('#lock-art .draw').filter((p) => !p.getAttribute('stroke-dasharray'));
    gsap.set(draws, { strokeDasharray: 1, strokeDashoffset: 1 });
    const prl = gsap.timeline({ scrollTrigger: { trigger: '.privacy', start: 'top 75%', end: 'center 45%', scrub: 0.8 } });
    prl.to(draws, { strokeDashoffset: 0, duration: 1, stagger: 0.12, ease: 'power1.inOut' })
      .fromTo('#lock-art path:nth-of-type(3)', { y: -14 }, { y: 0, duration: 0.3, ease: 'back.out(3)' }, '-=0.3')
      .fromTo('.privacy__label', { opacity: 0, y: 10 }, { opacity: 1, y: 0, stagger: 0.1, duration: 0.3 }, '-=0.4');
    gsap.to('#lock-art circle[stroke-dasharray]', { rotate: 360, transformOrigin: '50% 50%', duration: 60, repeat: -1, ease: 'none' });

    // COMMUNITY — float cards
    $$('.cpost').forEach((c, i) => {
      gsap.fromTo(c, { y: 80 + i * 30 }, { y: -40 - i * 20, ease: 'none', scrollTrigger: { trigger: '.community', start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    gsap.fromTo('.community__soon', { scale: 0, rotate: -30 }, { scale: 1, rotate: -8, ease: 'back.out(2)', duration: 1, scrollTrigger: { trigger: '.community__feed', start: 'top 60%', once: true } });

    mm.add('(max-width: 760px)', () => { /* layouts handled in CSS */ });
  }
})();
