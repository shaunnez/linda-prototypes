/* ==========================================================================
   pages.js — interior marketing pages (about, academy, guide, blog, article,
   faq, contact, login). Rendered from window.LINDA.
   ========================================================================== */
(function () {
  'use strict';
  const { $, $$, esc, icon, icons, reduced, store, toast, accordion, lazyVideos, validate, player, ring, sleep, magnetic } = window.UI;
  const L = window.LINDA;
  const BASE = window.Site.BASE;
  const page = document.body.dataset.page;
  const tech = (id) => L.technique(id);
  const params = new URLSearchParams(location.search);

  /* ---------------- Academy ---------------- */
  function academy() {
    const grid = $('#guide-grid');
    const feat = L.guides.find((g) => g.slug === 'recall-101');
    $('#feature-guide').innerHTML = `
      <div class="feature-guide__media vignette" data-cursor="Read">
        <video muted playsinline loop preload="none" data-lazy data-src="/shared/media/video/${feat.clip}.mp4" poster="${feat.hero}" aria-hidden="true"></video>
      </div>
      <div class="feature-guide__body">
        <p class="eyebrow eyebrow--amber">Featured guide · ${feat.level}</p>
        <h2 class="serif">${feat.title.replace('101', '<em>101</em>')}</h2>
        <p class="lead">${feat.subtitle}</p>
        <div class="row row--wrap"><span class="tag" data-tech="${feat.technique}">${tech(feat.technique).name}</span><span class="badge badge--dotless">${feat.minutes} min read</span><span class="badge badge--dotless">${feat.sections.length} sections</span></div>
        <div><a class="btn btn--primary btn--lg btn--magnetic" href="${BASE}/guide/recall-101.html"><span class="btn__label">Read the guide</span>${icon('arrow-right')}</a></div>
      </div>`;
    const counts = {};
    L.guides.forEach((g) => { counts[g.technique] = (counts[g.technique] || 0) + 1; });
    const state = { tech: 'all', level: 'all', q: '' };
    $('#tech-filters').innerHTML = `<span class="filters__label">Technique</span><button class="chip" aria-pressed="true" data-tech-f="all">All <span class="chip__count">${L.guides.length}</span></button>` +
      L.techniques.map((t) => `<button class="chip" aria-pressed="false" data-tech-f="${t.id}">${t.name} <span class="chip__count">${counts[t.id] || 0}</span></button>`).join('');
    const render = (animate) => {
      const list = L.guides.filter((g) => (state.tech === 'all' || g.technique === state.tech) && (state.level === 'all' || g.level === state.level) && (!state.q || (g.title + ' ' + g.subtitle + ' ' + tech(g.technique).name).toLowerCase().includes(state.q)));
      const flipState = animate && window.Flip ? Flip.getState($$('.gcard', grid)) : null;
      grid.innerHTML = list.length ? list.map(window.Site.guideCard).join('') : `<div class="empty" style="grid-column:1/-1"><div class="empty__icon">${icon('pen-line')}</div><div class="empty__title">Linda’s writing this one.</div><p>No guides match yet. Try another technique, or ask Linda what to practise next.</p><button class="btn btn--sm" data-reset>Clear filters</button></div>`;
      $('#guide-count').textContent = `${list.length} guide${list.length === 1 ? '' : 's'}`;
      icons();
      window.Site.bindGuidePreviews(grid);
      if (flipState && !reduced) Flip.from(flipState, { duration: 0.7, ease: 'power3.inOut', absolute: true, onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.6 }), onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.92, duration: 0.4 }) });
      const r = $('[data-reset]', grid); r && r.addEventListener('click', () => { state.tech = 'all'; state.level = 'all'; state.q = ''; $('#guide-search').value = ''; sync(); render(true); });
    };
    const sync = () => {
      $$('[data-tech-f]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.techF === state.tech));
      $$('[data-level]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.level === state.level));
    };
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-tech-f]'); if (t) { state.tech = t.dataset.techF; sync(); render(true); }
      const l = e.target.closest('[data-level]'); if (l) { state.level = l.dataset.level; sync(); render(true); }
    });
    $('#guide-search').addEventListener('input', (e) => { state.q = e.target.value.trim().toLowerCase(); render(false); });
    render(false);
    $('#technique-index').innerHTML = L.techniques.map((t) => `<div class="tindex" data-tech="${t.id}"><span class="tindex__icon">${icon(t.icon)}</span><div><h3>${t.name}</h3><p>${t.blurb}</p></div></div>`).join('');
    icons(); lazyVideos();
  }

  /* ---------------- Guide detail ---------------- */
  function guide() {
    const slug = document.body.dataset.guide || params.get('g') || 'recall-101';
    const g = L.guides.find((x) => x.slug === slug) || L.guides[0];
    const t = tech(g.technique);
    document.title = `${g.title} — Training Academy · Linda’s Dog Training`;
    const full = !!g.sections;
    const secs = [];
    const id = (h) => h.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let n = 0;
    const num = () => String(++n).padStart(2, '0');
    if (full) {
      g.sections.forEach((s, i) => {
        let body = '';
        if (s.body) body = `<p>${s.body}</p>`;
        if (s.steps) body = `<ol class="steps">${s.steps.map((st, k) => `<li><span class="steps__n">${k + 1}</span><p>${st}</p></li>`).join('')}</ol>`;
        if (s.list) body = `<ul class="mistakes">${s.list.map((x) => `<li>${icon('x')}<span>${x}</span></li>`).join('')}</ul>`;
        if (s.h.startsWith('Prerequisites')) body = `<div class="callout" style="font-size:1.05rem">${icon('shield-check')}<div><strong>Safety first.</strong> ${s.body}</div></div>`;
        secs.push({ h: s.h, id: id(s.h), html: body });
        if (s.steps) secs.push({ h: 'Watch it in action', id: 'video', html: `<p>A trainer-approved public edition. Tap a moment to jump straight to it.</p><div id="guide-player" style="margin-top:28px"></div><div class="row row--wrap" id="guide-ts" style="margin-top:16px"></div><p class="faint" style="font-size:.8125rem;margin-top:14px">${icon('shield-check')} Published with recorded consent. Private client recordings are never reused here without it.</p>` });
      });
    } else {
      secs.push({ h: 'Overview', id: 'overview', html: `<p>${g.subtitle} ${t.blurb}</p><div class="placeholder" style="margin-top:24px">Full guide — Linda is writing this one. Sections, step-by-step demonstrations and homework will appear here once she publishes it.</div>` });
      secs.push({ h: 'Watch it in action', id: 'video', html: `<div id="guide-player" style="margin-top:12px"></div>` });
    }
    if (g.homework) secs.push({ h: 'Your homework', id: 'homework', html: '<div id="homework"></div>' });
    if (g.faqs) secs.push({ h: 'Questions', id: 'faq', html: `<div class="accordion">${g.faqs.map((f) => `<div class="acc-item"><button class="acc-trigger" aria-expanded="false">${f.q}<span class="acc-icon" aria-hidden="true"></span></button><div class="acc-panel"><div><p>${f.a}</p></div></div></div>`).join('')}</div>` });
    secs.push({ h: 'Keep going', id: 'related', html: `<div class="related" id="related"></div>` });

    $('#guide-root').innerHTML = `
      <section class="guide-hero">
        <div class="guide-hero__media"><img src="${g.hero}" alt="" data-parallax="8"></div>
        <div class="wrap guide-hero__inner">
          <nav class="crumbs" aria-label="Breadcrumb"><a href="${BASE}/academy.html">Academy</a><span>/</span><span>${t.name}</span><span>/</span><span aria-current="page">${g.title}</span></nav>
          <h1 class="serif" data-split data-split-now>${g.title.replace(/(\d+)$/, '<em>$1</em>')}</h1>
          <p class="lead" style="color:var(--bone-80)">${g.subtitle}</p>
          <div class="guide-hero__meta" style="margin-top:24px"><span class="tag" data-tech="${t.id}">${t.name}</span><span class="badge badge--dotless">${g.level}</span><span class="badge badge--dotless">${g.minutes} min read</span>${g.status !== 'published' ? '<span class="badge st-pending">draft preview</span>' : ''}<span class="badge badge--dotless">By Linda</span></div>
        </div>
      </section>
      <div class="wrap guide-layout">
        <nav class="toc" aria-label="On this page"><p class="toc__title">On this page</p>${secs.map((s) => `<a href="#${s.id}">${s.h}</a>`).join('')}<div class="toc__progress progress progress--thin"><div class="progress__bar" id="toc-bar"></div></div></nav>
        <article>
          ${secs.map((s) => `<section class="gsec" id="${s.id}"><span class="gsec__n">${num()} — ${s.h.toUpperCase()}</span><h2 class="serif" data-split>${s.h}</h2><div class="gsec__body">${s.html}</div></section>`).join('')}
        </article>
      </div>`;
    // video
    const p = player($('#guide-player'), { src: L.vid(g.clip), poster: L.img(g.clip, 40), duration: '0:42', markers: full ? [{ t: '0:04', label: 'One clear cue' }, { t: '0:11', label: 'Move away' }, { t: '0:19', label: 'Reward at the collar' }] : [], label: g.title + ' demonstration', badge: '<span class="badge st-published_public">public edition</span>' });
    if (full) {
      $('#guide-ts').innerHTML = [['0:04', 'One clear cue'], ['0:11', 'Move away'], ['0:19', 'Reward at the collar']].map(([tt, l]) => `<button class="chip" data-seek="${tt}"><b class="mono amber">${tt}</b> ${l}</button>`).join('');
      $('#guide-ts').addEventListener('click', (e) => { const b = e.target.closest('[data-seek]'); if (b) p.seek(UI.parseT(b.dataset.seek)); });
    }
    // homework
    if (g.homework) {
      const key = 'guide.' + g.id;
      const done = DB.kv(key) || [];
      const hw = $('#homework');
      const draw = () => {
        const d = DB.kv(key) || [];
        const pct = Math.round((d.length / g.homework.length) * 100);
        hw.innerHTML = `<div class="homework">
          <div class="homework__list">${g.homework.map((h, i) => `<label class="check"><input type="checkbox" data-hw="${i}" ${d.includes(i) ? 'checked' : ''}><span class="check__box"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span class="check__text">${h}</span></label>`).join('')}</div>
          <div class="homework__side">${ring(pct, { size: 112, stroke: 3.5 })}<span class="homework__done">${pct === 100 ? 'Ka pai! All done.' : d.length ? 'Nice — keep going.' : 'Tick them off as you go.'}</span>
            <div class="row row--wrap" style="justify-content:center"><button class="btn btn--sm" data-print>${icon('download')}Download checklist</button><a class="btn btn--sm btn--ghost" href="${BASE}/login.html">${icon('send')}Assign via portal</a></div></div>
        </div>`;
        icons();
      };
      draw();
      hw.addEventListener('change', (e) => {
        const i = +e.target.dataset.hw; let d = DB.kv(key) || [];
        d = e.target.checked ? d.concat(i) : d.filter((x) => x !== i);
        DB.kv(key, d);
        const before = done.length;
        draw();
        if (d.length === g.homework.length) toast('Homework complete — ka pai! 🐾', { type: 'success' });
      });
      hw.addEventListener('click', (e) => { if (e.target.closest('[data-print]')) toast('Checklist prepared as a printable PDF (demo).', { icon: 'download' }); });
    }
    // related
    const rel = L.guides.filter((x) => x.id !== g.id).sort((a, b) => (a.status === 'published' ? -1 : 1) - (b.status === 'published' ? -1 : 1)).slice(0, 3);
    $('#related').innerHTML = rel.map(window.Site.guideCard).join('');
    window.Site.bindGuidePreviews($('#related'));
    accordion($('#guide-root'));
    icons();
    // TOC active state
    const links = $$('.toc a');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id)); const act = $('.toc a.is-active'); act && act.scrollIntoView && window.innerWidth < 960 && act.parentElement.scrollTo({ left: act.offsetLeft - 20, behavior: 'smooth' }); } });
    }, { rootMargin: '-40% 0px -55% 0px' });
    $$('.gsec').forEach((s) => io.observe(s));
    links.forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); const t2 = $(a.getAttribute('href')); if (window.__lenis) window.__lenis.scrollTo(t2, { offset: -100, duration: 1.2 }); else t2.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); }));
    const bar = $('#toc-bar');
    const onS = () => { const art = $('.guide-layout article'); const r = art.getBoundingClientRect(); const p2 = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight))); bar.style.setProperty('--p', p2 * 100 + '%'); };
    window.addEventListener('scroll', onS, { passive: true });
  }

  /* ---------------- Blog ---------------- */
  const BODIES = {
    'p-1': [
      ['p', 'Your dog’s recall is brilliant in the lounge. It’s pretty good in the back garden. Then you get to the park, a duck lifts off the pond, and suddenly you’re invisible. Sound familiar?'],
      ['p', 'That’s not defiance. It’s maths. Every recall is a quiet negotiation between you and whatever else is going on — and right now the duck is winning.'],
      ['h', 'Think in ladders, not levels'],
      ['p', 'We build recall like a ladder. Each rung is a little more distance, a little more distraction, or a little more difficulty — but only ever one at a time.'],
      ['ul', ['Distance before distraction', 'Distraction before difficulty', 'Long line until it’s boring-reliable']],
      ['q', 'If your dog ignores you, you’ve asked too much. Make it easier, get three wins, then try again.'],
      ['p', 'Start at the edge of the distraction — across the field from the ducks, not beside them. When your dog chooses you there, pay generously, then let them go back to watching. Being allowed to return to the fun is part of the reward.'],
      ['h', 'What we track in sessions'],
      ['p', 'In sessions, Linda records short clips at each rung so you can see the progress for yourself. They live privately in your portal, labelled by technique, so you can rewatch the exact moment it clicked.']
    ],
    'p-2': [['p', 'Long weekend sessions feel productive, but dogs learn best in short, frequent bursts. Three minutes, three times a day, beats thirty minutes on a Sunday.'], ['h', 'A simple routine'], ['ul', ['One skill per mini-session', 'End on a win, not on fatigue', 'Jot one sentence about how it went']], ['p', 'Your homework in the portal is built for exactly this — tiny tasks you can tick off between the kettle boiling and the toast popping.']],
    'p-3': [['p', 'Socialisation isn’t about meeting every dog at the park. It’s about helping your puppy feel safe and curious around the world.'], ['q', 'Calm observation is socialisation too.'], ['p', 'Sit on a bench. Watch the traffic go by. Reward the calm glances. Quality beats quantity, every time.']],
    'p-4': [['p', 'Letting your dog sniff isn’t “wasting” the walk. For many dogs, a slow sniffari is the most enriching part of the day.'], ['p', 'Try a golden-hour walk where the dog chooses the pace for ten minutes. Notice how much calmer the rest of the evening feels.']]
  };
  function blog() {
    const [f, ...rest] = L.posts;
    $('#post-feature').innerHTML = `<a class="post-feature" href="${BASE}/blog/article.html?p=${f.id}" data-cursor="Read">
      <div class="post-feature__img"><img src="${f.img}" alt=""></div>
      <div><p class="eyebrow eyebrow--amber">Latest · ${L.fmtDate(f.date, { day: 'numeric', month: 'long', year: 'numeric' })}</p><h2 class="serif">${f.title}</h2><p class="lead">${f.excerpt}</p><p style="margin-top:24px"><span class="link-arrow">Read · ${f.minutes} min ${icon('arrow-up-right')}</span></p></div></a>`;
    $('#post-list').innerHTML = rest.map((p) => `<a class="post-row" href="${BASE}/blog/article.html?p=${p.id}" data-cursor="Read">
      <span class="post-row__date">${L.fmtDate(p.date, { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}</span>
      <div><h3 class="serif">${p.title}</h3><p>${p.excerpt} · <span class="mono faint">${p.minutes} min</span></p></div>
      <div class="post-row__img"><img src="${p.img}" alt="" loading="lazy"></div></a>`).join('');
    icons();
  }
  function article() {
    const p = L.posts.find((x) => x.id === params.get('p')) || L.posts[0];
    document.title = `${p.title} — Journal · Linda’s Dog Training`;
    const body = BODIES[p.id] || BODIES['p-1'];
    $('#article-root').innerHTML = `
      <header class="wrap article-hero">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="${BASE}/blog.html">Journal</a><span>/</span><span>${L.fmtDate(p.date, { day: 'numeric', month: 'long', year: 'numeric' })}</span></nav>
        <h1 class="serif" data-split data-split-now>${p.title}</h1>
        <div class="row row--wrap"><span class="avatar avatar--sm">L</span><span>By Linda</span><span class="faint">·</span><span class="mono faint">${p.minutes} MIN READ</span></div>
      </header>
      <div class="wrap"><div class="article-cover" data-reveal-img><img src="${p.img.replace('-40.jpg', '-40.jpg')}" alt=""></div></div>
      <div class="wrap">
        <div class="prose">
          <div class="placeholder" style="font-size:.875rem">Draft article for layout — Linda to write or approve the final wording.</div>
          ${body.map(([k, v], i) => k === 'p' ? `<p class="${i === 0 ? 'dropcap' : ''}">${v}</p>` : k === 'h' ? `<h2 class="serif">${v}</h2>` : k === 'q' ? `<blockquote>${v}</blockquote>` : `<ul>${v.map((x) => `<li>${x}</li>`).join('')}</ul>`).join('')}
          <div class="callout" style="margin-top:16px">${icon('book-open')}<div><strong>Practise this:</strong> the <a class="amber" href="${BASE}/guide/recall-101.html">Recall 101 guide</a> walks through it step by step, with a homework checklist.</div></div>
        </div>
      </div>
      <section class="section wrap"><div class="section-head"><p class="eyebrow eyebrow--amber">More from the journal</p><h2 class="h2">Keep <em>reading.</em></h2></div><div class="post-list">${L.posts.filter((x) => x.id !== p.id).slice(0, 3).map((x) => `<a class="post-row" href="${BASE}/blog/article.html?p=${x.id}" data-cursor="Read"><span class="post-row__date">${L.fmtDate(x.date, { day: 'numeric', month: 'short' }).toUpperCase()}</span><div><h3 class="serif">${x.title}</h3><p>${x.excerpt}</p></div><div class="post-row__img"><img src="${x.img}" alt="" loading="lazy"></div></a>`).join('')}</div></section>`;
    icons();
    const bar = $('.read-progress');
    window.addEventListener('scroll', () => { const pr = $('.prose'); const r = pr.getBoundingClientRect(); bar.style.transform = `scaleX(${Math.min(1, Math.max(0, (innerHeight - r.top) / (r.height + innerHeight * 0.5)))})`; }, { passive: true });
  }

  /* ---------------- FAQ ---------------- */
  function faq() {
    const F = L.faqs;
    const cats = [
      { h: 'Training with Linda', items: [F[0], F[4], F[5]] },
      { h: 'Videos & privacy', items: [F[1], F[2], { q: 'If Linda shares a link on WhatsApp, can anyone open it?', a: 'No. The link takes you to your private portal, and only people Linda has explicitly given access to can press play. A forwarded link on its own won’t unlock anything.' }, { q: 'What if I change my mind about public use?', a: 'You can withdraw consent at any time from your account. Linda is notified so the clip can be taken down from public pages. (Copies already downloaded elsewhere can’t be recalled — which is why sharing defaults to links, not files.)' }] },
      { h: 'Your portal', items: [F[3], { q: 'How do I sign in?', a: 'With your email — no password. We send a one-time magic link that signs you straight in.' }, { q: 'Can I belong to more than one household?', a: 'Yes. If you help train a family member’s dog too, you can switch between households from the portal.' }] }
    ];
    const draw = (q) => {
      $('#faq-root').innerHTML = cats.map((c) => {
        const items = c.items.filter((it) => !q || (it.q + it.a).toLowerCase().includes(q));
        if (!items.length) return '';
        return `<div class="faq-cat"><h2>${c.h}</h2><div class="accordion">${items.map((it, i) => `<div class="acc-item ${q && i === 0 ? 'is-open' : ''}"><button class="acc-trigger" aria-expanded="false">${it.q}<span class="acc-icon" aria-hidden="true"></span></button><div class="acc-panel"><div><p>${it.a}</p></div></div></div>`).join('')}</div></div>`;
      }).join('') || `<div class="empty"><div class="empty__icon">${icon('search-x')}</div><div class="empty__title">Nothing yet.</div><p>No answers match “${esc(q)}”. Ask Linda directly — she’s friendly.</p><a class="btn btn--sm" href="${BASE}/contact.html">Ask a question</a></div>`;
      accordion($('#faq-root'));
      icons();
    };
    draw('');
    $('#faq-search').addEventListener('input', (e) => draw(e.target.value.trim().toLowerCase()));
  }

  /* ---------------- Contact ---------------- */
  function contact() {
    $('#interest').innerHTML = L.techniques.map((t) => `<button type="button" class="chip" aria-pressed="false" data-int="${t.id}">${t.name}</button>`).join('') + `<button type="button" class="chip" aria-pressed="false" data-int="puppy">Puppy foundations</button><button type="button" class="chip" aria-pressed="false" data-int="unsure">Not sure yet</button>`;
    $('#interest').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (b) b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); });
    const form = $('#contact-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const consent = $('#c-consent');
      const cf = consent.closest('.field');
      const ok = validate(form);
      cf.classList.toggle('is-invalid', !consent.checked);
      if (!ok || !consent.checked) { toast('A couple of fields need a look.', { type: 'error' }); return; }
      const btn = $('button[type="submit"]', form);
      btn.classList.add('is-loading');
      await sleep(1300);
      const name = esc($('#c-name').value.trim().split(' ')[0]);
      const dog = esc($('#c-dog').value.trim());
      $('#form-card').innerHTML = `<div class="form-success" role="status">
        <svg class="success-mark" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44"/><path d="M32 52l12 12 25-27"/></svg>
        <p class="eyebrow eyebrow--amber">Message received</p>
        <h2 class="serif">Kia ora, <em>${name}.</em></h2>
        <p class="lead">Thanks for reaching out${dog ? ` about ${dog}` : ''}. Linda will reply by email soon. <span class="ph-inline">[Typical response time — to be supplied]</span></p>
        <div class="row row--wrap"><a class="btn btn--primary" href="${BASE}/academy.html">Browse the Academy</a><button class="btn" data-again>Send another</button></div>
      </div>`;
      $('[data-again]').addEventListener('click', () => location.reload());
    });
    $$('[data-validate]', form).forEach((i) => i.addEventListener('blur', () => { if (i.value) { const f = i.closest('.field'); f.classList.remove('is-invalid'); } }));
  }

  /* ---------------- Login ---------------- */
  function login() {
    const card = $('#login-card');
    let role = params.get('role') === 'trainer' ? 'trainer' : 'client';
    const draw = () => {
      card.innerHTML = `
        <div class="segmented" role="group" aria-label="Sign in as">
          <button type="button" aria-pressed="${role === 'client'}" data-role="client">${icon('house')}Client</button>
          <button type="button" aria-pressed="${role === 'trainer'}" data-role="trainer">${icon('dog')}Trainer</button>
        </div>
        <div>
          <p class="eyebrow eyebrow--amber">${role === 'client' ? 'Client portal' : 'Trainer workspace'}</p>
          <h1 class="serif" style="margin-top:14px">${role === 'client' ? 'Welcome <em>back.</em>' : 'Kia ora, <em>Linda.</em>'}</h1>
          <p class="muted" style="margin-top:14px">${role === 'client' ? 'Enter the email Linda invited. We’ll send a one-time link — no password to remember.' : 'Sign in to record, review and share. Same magic link, no password.'}</p>
        </div>
        <form class="login__state" id="login-form" novalidate>
          <div class="field">
            <label class="field__label" for="email">Email address</label>
            <div class="input-icon">${icon('mail')}<input class="input" id="email" type="email" autocomplete="email" inputmode="email" placeholder="you@example.co.nz" data-validate="required email" value="${role === 'trainer' ? L.user('u-linda').email : ''}"></div>
            <span class="field__error">${icon('circle-alert')}Please enter a valid email address.</span>
          </div>
          <button class="btn btn--primary btn--lg btn--block" type="submit">${icon('wand-sparkles')}<span>Send magic link</span></button>
          <p class="login__fine">${icon('shield-check')}<span>Links expire after 15 minutes and work once. Only people Linda has invited can see household videos.</span></p>
        </form>`;
      icons();
      const f = $('#login-form');
      if (role === 'client' && !$('#email').value) $('#email').value = '';
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validate(f)) return;
        const btn = $('button[type="submit"]', f);
        btn.classList.add('is-loading');
        await sleep(1100);
        sent($('#email').value.trim());
      });
    };
    const sent = (email) => {
      const dest = role === 'client' ? `${BASE}/portal/index.html` : `${BASE}/admin/index.html`;
      card.innerHTML = `
        <div class="mail-art">${icon('mail-open')}</div>
        <div><p class="eyebrow eyebrow--amber">Magic link sent</p><h1 class="serif" style="margin-top:14px">Check your <em>inbox.</em></h1>
        <p class="muted" style="margin-top:14px">We’ve sent a sign-in link to <strong style="color:var(--bone)">${esc(email)}</strong>. Open it on this device to continue.</p></div>
        <a class="btn btn--primary btn--lg btn--block btn--magnetic" href="${dest}" id="open-link">${icon('external-link')}<span class="btn__label">Open magic link (demo)</span></a>
        <div class="row row--between row--wrap"><button class="btn btn--ghost btn--sm" data-back>${icon('arrow-left')}Use a different email</button><button class="btn btn--ghost btn--sm" data-resend disabled>Resend in <span class="mono" id="cd">30</span>s</button></div>
        <p class="login__fine">${icon('info')}<span>Demo: no email is actually sent. The button above simulates opening the link.</span></p>`;
      icons();
      magnetic($('#open-link'));
      if (window.gsap && !reduced) gsap.from(card.children, { opacity: 0, y: 24, stagger: 0.07, duration: 0.8, ease: 'gh' });
      $('[data-back]', card).addEventListener('click', draw);
      let c = 30; const rs = $('[data-resend]', card);
      const iv = setInterval(() => { c--; const cd = $('#cd'); if (cd) cd.textContent = c; if (c <= 0) { clearInterval(iv); rs.disabled = false; rs.textContent = 'Resend link'; } }, 1000);
      rs.addEventListener('click', () => toast('A fresh link is on its way.', { icon: 'mail' }));
    };
    card.addEventListener('click', (e) => { const b = e.target.closest('[data-role]'); if (b && b.dataset.role !== role) { role = b.dataset.role; draw(); } });
    draw();
  }

  /* ---------------- About ---------------- */
  function about() { lazyVideos(); }

  const routes = { academy, guide, blog, article, faq, contact, login, about };
  routes[page] && routes[page]();
  icons();
  lazyVideos();
  $$('.btn--magnetic, [data-magnetic]').forEach((el) => magnetic(el));
})();
