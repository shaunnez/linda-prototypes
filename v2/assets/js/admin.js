/* =========================================================
   PAWS & PLAY — Trainer workspace (admin PWA): core, shell,
   upload engine, dashboard, record flow + camera, uploads
   ========================================================= */
(function () {
  'use strict';
  const P = window.PAWS, L = window.LINDA, APP = window.APP, $ = P.$, $$ = P.$$;
  const G = typeof window.gsap !== 'undefined';
  const A = (window.ADMIN = { V: {}, routes: [] });
  A.P = P; A.L = L;

  /* ---------- state ---------- */
  const active = L.sessions.find((s) => s.status === 'active');
  A.S = P.store.get('admin', {
    ctx: active ? { hh: active.household, dogs: active.dogs.slice(), session: active.id } : null,
    settings: { maxMinutes: 20, maxGB: 4, aiCeiling: L.stats.trainer.aiCeiling, perVideo: 0.25, retries: 3, autoAI: true, defaultMode: 'link_only' }
  });
  A.save = () => P.store.set('admin', A.S);
  A.now = () => { const d = new Date(); return '2026-10-17T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };

  /* ---------- helpers ---------- */
  A.esc = P.esc; A.ic = P.ic;
  A.thumb = (m) => m.cover || L.thumb(m.clip, 40);
  A.dogNames = (ids) => ids.map((d) => (L.dog(d) || {}).name).filter(Boolean).join(' & ');
  A.hhOfMedia = (m) => { const d = L.dog(m.dogs[0]); return d ? L.household(d.household) : null; };
  A.audit = (action, entity) => P.db.add('audit', { id: P.uid('au'), t: A.now(), actor: 'Linda', action, entity });
  A.counts = () => ({
    review: L.media.filter((m) => m.editorial === 'needs_review').length,
    uploads: L.uploads.filter((u) => ['uploading', 'uploaded', 'processing', 'failed', 'paused', 'created'].includes(u.state)).length,
    failed: L.uploads.filter((u) => u.state === 'failed').length,
    inbox: L.inbox.filter((i) => i.state === 'unassigned').length,
    shares: L.shares.filter((s) => s.state === 'prepared' || s.state === 'handoff_opened').length
  });
  A.badges = () => { const c = A.counts(); $$('[data-badge]').forEach((b) => { const v = c[b.dataset.badge]; b.textContent = v; b.hidden = !v; }); };
  A.vhead = (eyebrow, icon, title, sub, acts) => `<div class="vhead"><div><span class="eyebrow"><span class="dot">${P.ic(icon)}</span>${eyebrow}</span><h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>${acts ? `<div class="acts">${acts}</div>` : ''}</div>`;
  A.mediaTile = (m, href) => {
    const up = m.processing !== 'ready';
    return `<a class="mtile" href="${href || '#/review/' + m.id}">
      <div class="mt-media"><img src="${A.thumb(m)}" alt="" loading="lazy">
        <div class="mt-tl">${P.status(m.editorial)}${up ? P.status(m.processing) : ''}${m.source === 'whatsapp_archive' ? `<span class="pill pill--grass">${P.ic('message-circle')}WA</span>` : ''}${m.parent ? `<span class="pill">${P.ic('scissors')}Clip</span>` : ''}</div>
        <span class="mt-dur">${m.duration}</span></div>
      <div class="mt-body"><h3 class="mt-title">${P.esc(m.title)}</h3><div class="mt-meta"><span>${P.esc(A.dogNames(m.dogs))}</span><span>· ${L.fmtDate(m.created)}</span>${m.views ? `<span>· ${m.views} views</span>` : ''}</div></div></a>`;
  };
  A.empty = (icon, t, d, act) => `<div class="empty"><div class="em-ico">${P.ic(icon)}</div><h3>${t}</h3><p>${d}</p>${act || ''}</div>`;
  A.go = (h) => { location.hash = h; };
  A.ctxLabel = () => { const c = A.S.ctx; if (!c) return null; const s = L.session(c.session); return { dogs: c.dogs.map(L.dog).filter(Boolean), hh: L.household(c.hh), session: s }; };

  /* ---------- AI draft generator (demo) ---------- */
  A.makeAI = (m, variant) => {
    const d = L.dog(m.dogs[0]); const techs = (d && d.techniques) || ['t-focus'];
    const T = (id) => L.technique(id).name;
    const opts = [
      { title: `${T(techs[0])} practice with ${d ? d.name : 'dog'}`, summary: `Short clip of ${d ? d.name : 'the dog'} practising ${T(techs[0]).toLowerCase()}. Handler marks and rewards calmly. No identifiable people beyond the handler’s hands.` },
      { title: `${d ? d.name : 'Dog'}: ${T(techs[0]).toLowerCase()} foundations`, summary: `Dog shows early ${T(techs[0]).toLowerCase()} behaviour; several reps with rewards delivered in position. Visual evidence only — confirm details before sharing.` }
    ];
    const o = opts[(variant || 0) % opts.length];
    return { title: o.title, summary: o.summary, confidence: +(0.62 + Math.random() * 0.25).toFixed(2), tags: techs.slice(0, 3).map((t, i) => ({ id: t, c: +(0.9 - i * 0.22 - Math.random() * 0.08).toFixed(2) })), transcript: null, evidence: ['No speech detected — transcript unavailable', `Frames 0:03–0:20 show ${d ? d.name : 'dog'} in frame with handler`, 'Dog identity taken from the context Linda selected before recording'] };
  };

  /* ---------- upload engine ---------- */
  let tick = null;
  A.startUpload = (opts) => {
    const c = A.S.ctx; const sess = L.session(c.session); const dog = L.dog(c.dogs[0]);
    const mid = 'm-' + Math.random().toString(36).slice(2, 6);
    const n = 4822 + L.uploads.length;
    const sizeMB = Math.round(60 + Math.random() * 220);
    const media = { id: mid, clip: opts.clip || dog.clip, title: opts.title || `${dog.name} — new clip`, dogs: c.dogs.slice(), session: c.session, source: opts.source || 'pwa_camera', processing: 'uploading', progress: 0, editorial: 'draft', duration: opts.duration || '0:' + String(20 + Math.round(Math.random() * 39)).padStart(2, '0'), created: A.now(), techniques: [], visibility: 'trainer_only', views: 0, notes: '', timestamps: [], ai: null };
    P.db.add('media', media);
    if (sess && !sess.media.includes(mid)) P.db.patch('sessions', sess.id, { media: sess.media.concat(mid) });
    const up = { id: 'up-' + Math.random().toString(36).slice(2, 6), media: mid, file: opts.file || `IMG_${n}.MOV`, size: sizeMB + ' MB', sizeMB, state: 'uploading', progress: 0, speed: (3 + Math.random() * 3).toFixed(1) + ' MB/s', protocol: 'tus', created: A.now() };
    P.db.add('uploads', up);
    A.audit('started upload', `${up.file} → ${dog.name}`);
    A.ensureTick(); A.badges();
    return up;
  };
  A.ensureTick = () => { if (!tick) tick = setInterval(step, 400); };
  function step() {
    let changed = false, any = false;
    L.uploads.forEach((u) => {
      if (u.state === 'uploading') {
        any = true;
        const size = u.sizeMB || parseFloat(u.size) || 100; const spd = parseFloat(u.speed) || 4;
        const p = Math.min(1, (u.progress || 0) + (spd * 0.4) / size * 2.2);
        const left = Math.max(0, Math.round((1 - p) * size / spd / 2.2));
        P.db.patch('uploads', u.id, { progress: p, eta: left + 's' });
        $$(`[data-up-prog="${u.id}"]`).forEach((b) => b.style.setProperty('--v', (p * 100).toFixed(1) + '%'));
        $$(`[data-up-pct="${u.id}"]`).forEach((b) => (b.textContent = Math.round(p * 100) + '% · ' + u.speed + ' · ' + left + 's left'));
        if (p >= 1) { P.db.patch('uploads', u.id, { state: 'uploaded' }); P.db.patch('media', u.media, { processing: 'uploaded' }); changed = true; u.__t = Date.now(); }
      } else if (u.state === 'uploaded') {
        any = true; if (!u.__t) u.__t = Date.now();
        if (Date.now() - u.__t > 1200) { P.db.patch('uploads', u.id, { state: 'processing' }); P.db.patch('media', u.media, { processing: 'processing' }); u.__t = Date.now(); changed = true; }
      } else if (u.state === 'processing') {
        any = true; if (!u.__t) u.__t = Date.now();
        if (Date.now() - u.__t > 4500) {
          const m = L.mediaItem(u.media);
          P.db.patch('uploads', u.id, { state: 'ready' });
          P.db.patch('media', u.media, { processing: 'ready', editorial: 'needs_review', ai: A.S.settings.autoAI ? A.makeAI(m) : null });
          A.audit('Stream ready', `${m.title} (${m.id})`);
          P.toast(`“${P.esc(m.title)}” is ready for review`, { tone: 'ok', icon: 'badge-check', action: 'Review', onAction: () => A.go('/review/' + m.id), ms: 5200 });
          changed = true;
        }
      }
    });
    if (changed) { A.badges(); if (['/uploads', '/dashboard', '/review'].includes(A.curPath)) A.router.refresh(); }
    if (!any) { clearInterval(tick); tick = null; }
  }
  // seed: data's "uploading" item continues live; mark it as engine-managed
  L.uploads.forEach((u) => { if (u.state === 'uploading') u.sizeMB = parseFloat(u.size); if (u.state === 'processing' && !u.created) u.created = 'seed'; });

  /* ---------- shell ---------- */
  const NAV = [
    ['Today', [['dashboard', 'Dashboard', 'house'], ['record', 'Record', 'circle-dot'], ['uploads', 'Uploads', 'upload-cloud', 'uploads'], ['review', 'Review queue', 'badge-check', 'review'], ['inbox', 'WhatsApp inbox', 'inbox', 'inbox']]],
    ['People', [['clients', 'Clients & households', 'users'], ['dogs', 'Dogs', 'dog'], ['sessions', 'Sessions', 'calendar-days'], ['groups', 'Training groups', 'users-round']]],
    ['Content', [['media', 'Media library', 'clapperboard'], ['share', 'Share composer', 'send', 'shares'], ['shares', 'Share history', 'history'], ['techniques', 'Techniques', 'tags'], ['academy', 'Academy CMS', 'graduation-cap']]],
    ['Admin', [['consent', 'Consent', 'shield-check'], ['audit', 'Audit log', 'scroll-text'], ['settings', 'Settings', 'settings']]]
  ];
  A.NAV = NAV;
  $('[data-side-nav]').innerHTML = `<a class="brand" href="/v2/index.html">${P.svg.logo()}<span><b>Linda's</b><small>Trainer workspace</small></span></a>
    ${NAV.map(([g, items]) => `<div class="side-label">${g}</div><nav aria-label="${g}" style="display:grid;gap:2px">${items.map(([k, l, i, b]) => `<a class="nav-item" href="#/${k}" data-nav="${k}"><span class="ni">${P.ic(i)}</span>${l}${b ? `<span class="count" data-badge="${b}" hidden></span>` : ''}</a>`).join('')}</nav>`).join('')}
    <div class="side-foot"><div class="side-user"><span class="avatar" style="background:var(--tomato)">L</span><span><b>Linda</b><small>${P.esc(L.user('u-linda').email)}</small></span></div>
    <a class="btn btn--sm btn--outline" href="/v2/portal/index.html">${P.ic('repeat')}Switch to client demo</a>
    <button class="btn btn--sm btn--ghost" type="button" data-reset>${P.ic('rotate-ccw')}Reset demo data</button></div>`;
  $('[data-reset]').addEventListener('click', () => P.confirm('Reset demo data?', 'This clears approvals, uploads, shares and other changes made in this browser.', 'Reset', () => { P.db.reset(); location.hash = '#/dashboard'; location.reload(); }));

  A.renderCtx = () => {
    const c = A.ctxLabel(); const chip = $('[data-ctx-chip]');
    if (!c || !c.dogs.length) { chip.innerHTML = `<span class="avatar" style="background:var(--sun)">${P.ic('circle-dot')}</span><span class="t"><small>No context</small><span>Pick a dog</span></span>`; return; }
    chip.innerHTML = `${APP.avatar(c.dogs[0].name, c.dogs[0].avatar)}<span class="t"><small><i></i>${c.session && c.session.status === 'active' ? 'Active session' : 'Recording for'}</small><span>${P.esc(c.dogs.map((d) => d.name).join(' & '))} · ${P.esc(c.session ? c.session.title : c.hh.name)}</span></span>`;
  };
  $('[data-new]').addEventListener('click', (e) => APP.popover(e.currentTarget, `<button data-v="record">${P.ic('circle-dot')}Record video</button><button data-v="session">${P.ic('calendar-plus')}New session</button><button data-v="household">${P.ic('house-plus')}New household</button><button data-v="dog">${P.ic('dog')}Add dog</button><hr><button data-v="share">${P.ic('send')}New share</button>`, (v) => {
    if (v === 'record') A.go('/record'); if (v === 'share') A.go('/share');
    if (v === 'session') A.newSession(); if (v === 'household') A.newHousehold(); if (v === 'dog') A.newDog();
  }));
  $('[data-more]').addEventListener('click', () => {
    P.modal({ title: 'Everything', html: NAV.map(([g, items]) => `<div class="side-label" style="padding-left:2px">${g}</div><div class="more-grid">${items.map(([k, l, i, b]) => `<a href="#/${k}" data-close ${A.curNav === k ? 'aria-current="page"' : ''}><span class="ni">${P.ic(i)}</span>${l}${b && A.counts()[b] ? ` <span class="count">${A.counts()[b]}</span>` : ''}</a>`).join('')}</div>`).join('') + `<div class="row row--wrap" style="margin-top:18px"><a class="btn btn--sm btn--outline" href="/v2/portal/index.html">${P.ic('repeat')}Client demo</a><a class="btn btn--sm btn--outline" href="/v2/index.html">${P.ic('globe')}Public site</a></div>` });
  });

  /* ---------- DASHBOARD ---------- */
  A.V.dashboard = () => {
    const c = A.counts(); const st = L.stats.trainer; const ctx = A.ctxLabel();
    const act = L.sessions.find((s) => s.status === 'active');
    const recent = L.sessions.filter((s) => s.status === 'completed').sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
    const rq = L.media.filter((m) => m.editorial === 'needs_review').slice(0, 3);
    const ups = L.uploads.filter((u) => u.state !== 'ready' && u.state !== 'cancelled').slice(0, 4);
    const opens = L.shares.filter((s) => s.opens).sort((a, b) => b.opens - a.opens).slice(0, 3);
    const aiPct = Math.round(st.aiSpendMonth / A.S.settings.aiCeiling * 100);
    const actDog = act ? L.dog(act.dogs[0]) : null;
    const d = new Date('2026-10-17T09:00');
    return {
      title: 'Dashboard', short: 'Today',
      html: `<div class="vhead greet"><div><span class="eyebrow"><span class="dot">${P.ic('sun')}</span>${d.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' })}</span><h1>Mōrena, Linda</h1><p class="sub">${c.review} clips to review · ${c.inbox} unassigned in the inbox · ${c.shares} shares waiting on you</p></div>
        <div class="acts"><a class="btn btn--sun" href="#/share">${P.ic('send')}New share</a></div></div>
      <div class="bento">
        ${act ? `<section class="card c-8 active-card"><span class="deco">${P.svg.paw()}</span>
          <div class="row row--between row--wrap"><span class="pill pill--sun"><span class="dot"></span>Active session · started ${L.fmtTime(act.date)}</span><span class="pill">${P.ic('map-pin')}${P.esc(act.location)}</span></div>
          <div class="who">${APP.avatar(actDog.name, actDog.avatar)}<div><h2>${P.esc(actDog.name)} · ${P.esc(act.title)}</h2><span style="font-weight:600">${P.esc(L.household(act.household).name)} · ${act.media.length} clip${act.media.length === 1 ? '' : 's'} so far</span></div></div>
          <div class="row row--wrap"><a class="btn btn--primary btn--lg" href="#/camera">${P.ic('circle-dot')}Record</a><a class="btn btn--lg" href="#/session/${act.id}">${P.ic('notebook-pen')}Notes &amp; homework</a><button class="btn btn--lg btn--outline" style="color:#fff;border-color:#fff" type="button" data-end="${act.id}">${P.ic('square')}End session</button></div></section>` : `<section class="card c-8" style="background:var(--grass-tint)"><h2>No active session</h2><p>Start one to keep recordings organised.</p><a class="btn btn--primary" href="#/record">${P.ic('play')}Start a session</a></section>`}
        <a class="card c-4 rec-card" href="#/camera" aria-label="Record a video${ctx && ctx.dogs[0] ? ' for ' + P.esc(ctx.dogs[0].name) : ''}"><span class="big-rec"><i></i></span><b>Record</b><small>${ctx && ctx.dogs[0] ? 'for ' + P.esc(ctx.dogs.map((x) => x.name).join(' & ')) + ' · context saved' : 'Pick a dog first'}</small></a>
        ${[['review', 'Review queue', 'badge-check', c.review, 'var(--sun)', 'AI drafts waiting'], ['uploads', 'Uploads', 'upload-cloud', c.uploads, 'var(--sky)', c.failed ? c.failed + ' need attention' : 'All flowing'], ['inbox', 'Unassigned', 'inbox', c.inbox, 'var(--blush)', 'From the archive number'], ['shares', 'Prepared shares', 'send', c.shares, 'var(--lilac)', 'Waiting on you to send']].map(([k, t, i, v, bg, sub]) => `<a class="card card--hover c-3 half stat-card" href="#/${k}" style="background:${bg};text-decoration:none"><span class="go">${P.ic('arrow-up-right')}</span><div class="stat"><span class="k">${P.ic(i)}${t}</span><span class="v" data-count-up="${v}">${v}</span><span class="d">${sub}</span></div></a>`).join('')}
        <section class="card c-6"><div class="card-head"><h2>Upload queue</h2><a class="link-arrow small" href="#/uploads">All${P.ic('arrow-right')}</a></div>
          <div class="list">${ups.map((u) => { const m = L.mediaItem(u.media); return `<a class="lrow" href="#/uploads"><span class="thumb sq"><img src="${A.thumb(m)}" alt=""></span><span class="meta"><b>${P.esc(m.title)}</b>${u.state === 'uploading' ? `<div class="progress progress--striped progress--sky progress--sm" style="margin-top:6px"><i data-up-prog="${u.id}" style="--v:${(u.progress * 100).toFixed(1)}%"></i></div>` : `<small>${u.file} · ${u.size}</small>`}</span><span class="end">${P.status(u.state)}</span></a>`; }).join('') || A.empty('check', 'All uploads done', 'Nothing in flight.')}</div></section>
        <section class="card c-6"><div class="card-head"><h2>Needs your eyes</h2><a class="link-arrow small" href="#/review">Review queue${P.ic('arrow-right')}</a></div>
          <div class="list">${rq.map((m) => `<a class="lrow" href="#/review/${m.id}"><span class="thumb"><img src="${A.thumb(m)}" alt=""></span><span class="meta"><b>${P.esc(m.title)}</b><small>${P.esc(A.dogNames(m.dogs))} · AI ${m.ai ? Math.round(m.ai.confidence * 100) + '%' : 'pending'}${m.dogs.length > 1 ? ' · ⚠ multi-dog' : ''}</small></span>${P.ic('chevron-right', 'chev')}</a>`).join('') || A.empty('party-popper', 'Queue clear!', 'Every clip has been reviewed.')}</div></section>
        <section class="card c-4"><div class="card-head"><h2>Sessions / week</h2><span class="pill">${st.sessionsThisMonth} this month</span></div>${APP.bars(L.stats.weekly, ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'Now'])}</section>
        <section class="card c-4"><div class="card-head"><h2>Stream minutes</h2><span class="pill pill--sky">${P.ic('cloud')}Cloudflare</span></div>
          <div class="row" style="gap:24px"><div class="stat"><span class="k">Stored</span><span class="v" style="font-size:2rem" data-count-up="${st.streamMinutesStored}">${st.streamMinutesStored}</span></div><div class="stat"><span class="k">Delivered</span><span class="v" style="font-size:2rem" data-count-up="${st.streamMinutesDelivered}">${st.streamMinutesDelivered}</span></div></div>${APP.spark([3200, 3900, 4400, 4100, 5200, 5800, st.streamMinutesDelivered], '#8EC5FF')}</section>
        <section class="card c-4"><div class="card-head"><h2>AI spend</h2><span class="pill ${aiPct > 80 ? 'pill--tomato' : 'pill--grass'}">${aiPct}% of ceiling</span></div>
          <div class="stat"><span class="v" style="font-size:2.4rem">$<span data-count-up="${st.aiSpendMonth.toFixed(2)}">${st.aiSpendMonth.toFixed(2)}</span></span><span class="d">of $${A.S.settings.aiCeiling} monthly ceiling · per-video cap $${A.S.settings.perVideo}</span></div>
          <div class="meter" style="margin-top:12px"><i style="width:${Math.min(100, aiPct)}%"></i><span class="ceil" style="left:80%" title="Alert at 80%"></span></div><p class="xsmall muted" style="margin:8px 0 0">AI pauses (videos stay available) if the ceiling is reached.</p></section>
        <section class="card c-6"><div class="card-head"><h2>Recent sessions</h2><a class="link-arrow small" href="#/sessions">All${P.ic('arrow-right')}</a></div>
          <div class="list">${recent.map((s) => { const dd = L.dog(s.dogs[0]); return `<a class="lrow" href="#/session/${s.id}">${APP.avatar(dd.name, dd.avatar)}<span class="meta"><b>${P.esc(s.title)}</b><small>${A.dogNames(s.dogs)} · ${APP.when(s.date)}</small></span><span class="end"><span class="pill">${s.media.length} ${P.ic('video')}</span></span></a>`; }).join('')}</div></section>
        <section class="card c-6" style="background:var(--sun-tint)"><div class="card-head"><h2>Portal opens</h2><span class="pill pill--ink">${st.portalOpens7d} in 7 days</span></div>
          ${APP.spark([3, 5, 4, 8, 6, 9, 6], '#FFC93C')}
          <div class="list" style="margin-top:10px">${opens.map((s) => `<a class="lrow" href="#/shares"><span class="thumb sq"><img src="${A.thumb(L.mediaItem(s.media[0]))}" alt=""></span><span class="meta"><b>${P.esc((L.mediaItem(s.media[0]) || {}).title)}</b><small>${s.targets.map(A.targetName).join(', ')}</small></span><span class="end"><span class="pill pill--sun">${P.ic('eye')}${s.opens} opens</span></span></a>`).join('')}</div>
          <p class="xsmall muted" style="margin:10px 0 0">Opens are counted in the portal. WhatsApp delivery and read status are never tracked.</p></section>
      </div>`,
      mount(el) {
        APP.popIn(el, '.card'); APP.animateBars(el); APP.countUp(el);
        $$('[data-end]', el).forEach((b) => b.addEventListener('click', () => A.endSession(b.dataset.end)));
      }
    };
  };
  A.targetName = (t) => { const h = L.household(t); if (h) return h.name; const g = L.groups.find((x) => x.id === t); if (g) return g.title; const u = L.user(t); return u ? u.name : t; };

  A.endSession = (id) => {
    const s = L.session(id);
    P.modal({ title: 'End session?', html: `<p>Wrap up <b>${P.esc(s.title)}</b>. You can still add notes and homework afterwards.</p><div class="field"><label class="label" for="es-notes">Quick session notes</label><textarea class="textarea" id="es-notes" placeholder="What went well? What’s next?">${P.esc(s.notes || '')}</textarea></div>`,
      actions: [{ label: 'Keep going', cls: 'btn--outline' }, { label: 'End session', cls: 'btn--primary', icon: 'square', onClick: (api) => {
        P.db.patch('sessions', id, { status: 'completed', notes: $('#es-notes', api.el).value });
        if (A.S.ctx && A.S.ctx.session === id) { A.S.ctx.session = null; A.save(); A.renderCtx(); }
        A.audit('ended session', s.title); P.toast('Session ended — nice work!', { tone: 'ok', icon: 'flag' }); A.router.refresh();
      } }] });
  };

  /* ---------- RECORD FLOW ---------- */
  let pickStart = 0;
  A.V.record = ({ query }) => {
    let step = query.step || (A.S.ctx && A.S.ctx.dogs.length ? 'ready' : 'client');
    const c = A.S.ctx || { hh: null, dogs: [], session: null };
    const hh = c.hh ? L.household(c.hh) : null;
    if (!hh && (step === 'dog' || step === 'session')) step = 'client';
    if (!pickStart || step === 'client') pickStart = performance.now();
    const steps = [['client', 'Client'], ['dog', 'Dog'], ['session', 'Session'], ['ready', 'Record']];
    const idx = steps.findIndex((s) => s[0] === step);
    const stepper = `<div class="rec-steps">${steps.map(([k, l], i) => `<span class="rs ${i === idx ? 'is-on' : ''} ${i < idx ? 'is-done' : ''}"><span class="n">${i < idx ? '✓' : i + 1}</span>${l}</span>`).join('')}</div>`;
    let body = '';
    if (step === 'client') {
      const recent = ['h-fraser', 'h-thompson', 'h-ngata'];
      const list = L.households.filter((h) => h.status === 'active').sort((a, b) => recent.indexOf(b.id) - recent.indexOf(a.id));
      body = `<label class="input-icon" style="display:block;max-width:520px;margin-bottom:18px"><span class="sr-only">Search clients or dogs</span><i data-lucide="search"></i><input class="input" type="search" placeholder="Search a client, household or dog…" data-q autofocus></label>
        <div class="pick-grid" data-list>${list.map((h) => `<button class="pick" type="button" data-hh="${h.id}" data-k="${P.esc((h.name + ' ' + h.suburb + ' ' + h.members.map((u) => (L.user(u) || {}).name).join(' ') + ' ' + L.dogsFor(h.id).map((d) => d.name).join(' ')).toLowerCase())}" aria-pressed="${c.hh === h.id}"><span class="avatars">${L.dogsFor(h.id).map((d) => APP.avatar(d.name, d.avatar)).join('')}</span><span><b>${P.esc(h.name)}</b><small>${L.dogsFor(h.id).map((d) => d.name).join(', ')} · ${P.esc(h.suburb)}</small></span></button>`).join('')}</div>`;
    } else if (step === 'dog') {
      body = `<p class="muted">Tap to select — choose more than one for a multi-dog clip.</p><div class="pick-grid">${L.dogsFor(hh.id).map((d) => `<button class="pick pick-dog" type="button" data-dog="${d.id}" aria-pressed="${c.dogs.includes(d.id)}">${APP.avatar(d.name, d.avatar)}<span><b style="font-size:1.4rem;font-family:var(--font-display)">${P.esc(d.name)}</b><small>${P.esc(d.breed)} · ${d.age}</small></span></button>`).join('')}</div>`;
    } else if (step === 'session') {
      const open = L.sessions.filter((s) => s.household === hh.id && (s.status === 'active' || s.date.startsWith('2026-10-17')));
      body = `<div class="pick-grid">${open.map((s) => `<button class="pick" type="button" data-sess="${s.id}" aria-pressed="${c.session === s.id}"><span class="avatar" style="background:var(--grass);color:#fff">${P.ic('play')}</span><span><b>Continue: ${P.esc(s.title)}</b><small>${s.status === 'active' ? '● Active now' : APP.when(s.date)} · ${s.media.length} clips</small></span></button>`).join('')}
        <button class="pick" type="button" data-sess="new"><span class="avatar" style="background:var(--sun)">${P.ic('plus')}</span><span><b>Start a new session</b><small>Today · ${P.esc(hh.suburb)}</small></span></button></div>`;
    } else {
      const cx = A.ctxLabel();
      body = cx && cx.dogs.length ? `<div class="card" style="background:var(--grass);color:#fff;display:grid;gap:14px">
          <div class="row">${cx.dogs.map((d) => APP.avatar(d.name, d.avatar, 'avatar--lg')).join('')}<div><span class="pill pill--sun">${P.ic('pin')}Sticky context</span><h2 style="color:#fff;margin:8px 0 0">${P.esc(cx.dogs.map((d) => d.name).join(' & '))}</h2><span style="font-weight:600">${P.esc(cx.hh.name)} · ${P.esc(cx.session ? cx.session.title : 'No session')}</span></div></div>
          <p style="margin:0;font-weight:600">Every clip you record will be attached here until you change it — no re-selecting between takes.</p>
          <div class="row row--wrap"><a class="btn btn--primary btn--xl" href="#/camera">${P.ic('circle-dot')}Open camera</a><button class="btn btn--lg" type="button" data-library>${P.ic('images')}Upload from library</button><a class="btn btn--lg btn--outline" style="color:#fff;border-color:#fff" href="#/record?step=client">${P.ic('repeat')}Change</a></div></div>
          <div class="callout callout--info" style="margin-top:18px">${P.ic('smartphone')}<div><strong>On iPhone, your phone’s own camera opens</strong><p>Upload starts as soon as the video comes back. Keep the app open while it uploads — iOS can pause Safari in the background, but uploads resume.</p></div></div>` : A.empty('dog', 'Pick a dog first', 'Choose who you’re training so recordings land in the right place.', '<a class="btn" href="#/record?step=client">Choose client</a>');
    }
    return {
      title: 'Record', short: 'Record',
      html: A.vhead('Record', 'circle-dot', step === 'ready' ? 'Ready when you are' : 'Who are we training?', step === 'ready' ? '' : 'Pick fast — the target is under 15 seconds from here to camera.') + stepper + body +
        (step !== 'ready' && step !== 'client' ? `<div class="go-bar"><span class="ctx">${hh ? APP.avatar(hh.name, (L.dogsFor(hh.id)[0] || {}).avatar) : ''}<span>${hh ? P.esc(hh.name) : ''}${c.dogs.length ? ' · ' + P.esc(A.dogNames(c.dogs)) : ''}</span></span><span class="timer" data-timer></span>${step === 'dog' ? `<button class="btn btn--primary" type="button" data-next ${c.dogs.length ? '' : 'disabled'}>Next${P.ic('arrow-right')}</button>` : ''}<a class="btn btn--outline" style="color:var(--cream);border-color:var(--cream)" href="#/record?step=${step === 'session' ? 'dog' : 'client'}">Back</a></div>` : ''),
      mount(el) {
        const q = $('[data-q]', el);
        if (q) { q.focus(); q.addEventListener('input', () => { const v = q.value.toLowerCase().trim(); $$('[data-hh]', el).forEach((b) => (b.hidden = v && !b.dataset.k.includes(v))); }); }
        $$('[data-hh]', el).forEach((b) => b.addEventListener('click', () => { const dogs = L.dogsFor(b.dataset.hh); A.S.ctx = { hh: b.dataset.hh, dogs: dogs.length === 1 ? [dogs[0].id] : [], session: null }; A.save(); A.go(dogs.length === 1 ? '/record?step=session' : '/record?step=dog'); }));
        $$('[data-dog]', el).forEach((b) => b.addEventListener('click', () => { const id = b.dataset.dog; const i = A.S.ctx.dogs.indexOf(id); if (i > -1) A.S.ctx.dogs.splice(i, 1); else A.S.ctx.dogs.push(id); A.save(); b.setAttribute('aria-pressed', i === -1); $('[data-next]', el).disabled = !A.S.ctx.dogs.length; if (G && !P.reduced) gsap.fromTo(b, { scale: .94 }, { scale: 1, duration: .6, ease: 'elastic.out(1.2,.4)' }); }));
        const nx = $('[data-next]', el); nx && nx.addEventListener('click', () => A.go('/record?step=session'));
        $$('[data-sess]', el).forEach((b) => b.addEventListener('click', () => {
          let id = b.dataset.sess;
          if (id === 'new') { const h = L.household(A.S.ctx.hh); id = 's-' + Math.random().toString(36).slice(2, 6); P.db.add('sessions', { id, date: A.now(), location: h.suburb, household: h.id, dogs: A.S.ctx.dogs.slice(), status: 'active', title: 'Session with ' + A.dogNames(A.S.ctx.dogs), notes: '', homework: [], media: [] }); A.audit('started session', h.name); }
          A.S.ctx.session = id; A.save(); A.renderCtx();
          const secs = ((performance.now() - pickStart) / 1000).toFixed(1);
          P.toast(`Context set in ${secs}s ${secs < 15 ? '⚡' : ''}— ready to record`, { tone: 'ok', icon: 'timer' });
          A.go('/record?step=ready');
        }));
        const t = $('[data-timer]', el); if (t) { const iv = setInterval(() => { t.textContent = ((performance.now() - pickStart) / 1000).toFixed(1) + 's'; }, 100); APP.track(() => clearInterval(iv)); }
        const lib = $('[data-library]', el); lib && lib.addEventListener('click', () => A.libraryPick());
        APP.popIn(el, '.pick, .card');
      }
    };
  };
  A.libraryPick = () => {
    const opts = [1494, 518, 1557, 42745].map((c, i) => ({ c, f: `IMG_47${60 + i}.MOV` }));
    P.modal({ title: 'Choose from Photos', html: `<p class="muted">Simulated photo library — pick a clip to upload into the current context.</p><div class="sel-tiles">${opts.map((o) => `<button class="sel-tile" type="button" data-pick="${o.c}" data-f="${o.f}" aria-pressed="false"><img src="${L.thumb(o.c, 40)}" alt=""><span class="t">${o.f}</span><span class="tick">${P.ic('check')}</span></button>`).join('')}</div>`,
      onOpen(api) { api.el.addEventListener('click', (e) => { const b = e.target.closest('[data-pick]'); if (!b) return; const up = A.startUpload({ clip: +b.dataset.pick, file: b.dataset.f, source: 'pwa_library', title: A.dogNames(A.S.ctx.dogs) + ' — from library' }); api.close(); P.toast('Uploading from library…', { icon: 'upload-cloud' }); A.go('/uploads?new=' + up.id); }); } });
  };

  /* ---------- CAMERA (simulated OS camera) ---------- */
  A.V.camera = () => {
    const cx = A.ctxLabel();
    if (!cx || !cx.dogs.length) { setTimeout(() => A.go('/record?step=client'), 0); return { html: '' }; }
    const dog = cx.dogs[0];
    return {
      title: 'Camera', short: 'Camera',
      html: `<div class="camera" role="dialog" aria-label="Camera (simulated)">
        <video class="vf" muted playsinline autoplay loop src="/shared/media/vertical/${dog.clip}.mp4" poster="${L.thumb(dog.clip, 40)}" aria-hidden="true"></video>
        <div class="cam-top"><button class="cam-btn" type="button" data-cancel aria-label="Cancel">${P.ic('x')}</button><span class="ctx">${APP.avatar(dog.name, dog.avatar)}${P.esc(cx.dogs.map((d) => d.name).join(' & '))} · ${P.esc(cx.session ? cx.session.title : '')}</span><span class="cam-rec"><i></i><span data-t>00:00</span></span></div>
        <span class="cam-hint">Simulated phone camera — this is iOS’s own recorder in real life</span>
        <div></div>
        <div class="cam-bot" data-bot><button class="cam-btn" type="button" aria-label="Flash">${P.ic('zap-off')}</button><button class="shutter" type="button" data-shutter aria-label="Start recording"><i></i></button><button class="cam-btn" type="button" aria-label="Flip camera">${P.ic('switch-camera')}</button></div>
      </div>`,
      mount(el) {
        const cam = $('.camera', el); document.body.appendChild(cam); el = cam; let rec = false, t0 = 0, iv = null, secs = 0;
        document.documentElement.style.overflow = 'hidden';
        const shutter = $('[data-shutter]', el), tEl = $('[data-t]', el);
        shutter.addEventListener('click', () => {
          if (!rec) { rec = true; cam.classList.add('is-rec'); t0 = Date.now(); shutter.setAttribute('aria-label', 'Stop recording'); iv = setInterval(() => { secs = Math.floor((Date.now() - t0) / 1000); tEl.textContent = '00:' + String(secs).padStart(2, '0'); }, 200); APP.track(() => clearInterval(iv)); }
          else {
            rec = false; clearInterval(iv); cam.classList.remove('is-rec');
            $('[data-bot]', el).innerHTML = `<div class="cam-review"><button type="button" data-retake>Retake</button><span style="align-self:center">${tEl.textContent}</span><button type="button" class="use" data-use>Use Video</button></div>`;
            $('[data-retake]', el).addEventListener('click', () => A.router.refresh());
            $('[data-use]', el).addEventListener('click', () => {
              const dur = Math.max(secs, 8); const up = A.startUpload({ duration: '0:' + String(Math.min(dur * 3, 59)).padStart(2, '0'), title: `${A.dogNames(A.S.ctx.dogs)} — take ${(L.session(A.S.ctx.session) || { media: [] }).media.length + 1}` });
              P.toast('Uploading straight to Stream — keep the app open', { icon: 'upload-cloud', action: 'Record another', onAction: () => A.go('/camera') });
              A.go('/uploads?new=' + up.id);
            });
          }
        });
        $('[data-cancel]', el).addEventListener('click', () => history.length > 1 ? history.back() : A.go('/dashboard'));
        if (G && !P.reduced) gsap.fromTo(cam, { clipPath: 'circle(0% at 50% 100%)' }, { clipPath: 'circle(150% at 50% 100%)', duration: .7, ease: 'expo.out', clearProps: 'clipPath' });
      },
      cleanup() { document.documentElement.style.overflow = ''; $$('body > .camera').forEach((c) => c.remove()); }
    };
  };

  /* ---------- UPLOADS ---------- */
  A.V.uploads = ({ query }) => {
    const f = query.f || 'all';
    const order = ['failed', 'uploading', 'paused', 'uploaded', 'processing', 'created', 'ready', 'cancelled'];
    let list = L.uploads.slice().sort((a, b) => order.indexOf(a.state) - order.indexOf(b.state));
    const counts = {}; list.forEach((u) => (counts[u.state] = (counts[u.state] || 0) + 1));
    if (f !== 'all') list = list.filter((u) => u.state === f);
    return {
      title: 'Uploads', short: 'Uploads',
      html: A.vhead('Direct to Cloudflare Stream · tus resumable', 'upload-cloud', 'Uploads', 'Recordings upload straight from the phone. Processing being “ready” is not the same as approved — everything stays private until you review it.', `<a class="btn btn--primary" href="#/camera">${P.ic('circle-dot')}Record</a><button class="btn" type="button" data-lib>${P.ic('images')}From library</button>`) +
        `<div class="chips chips--scroll" style="margin-bottom:18px"><a class="chip" href="#/uploads" aria-current="${f === 'all'}">All <span class="count">${L.uploads.length}</span></a>${order.filter((s) => counts[s]).map((s) => `<a class="chip" href="#/uploads?f=${s}" aria-current="${f === s}">${P.statusLabel(s)} <span class="count">${counts[s]}</span></a>`).join('')}</div>
        <div class="list">${list.map((u) => {
          const m = L.mediaItem(u.media) || {}; const pct = Math.round((u.progress || 0) * 100);
          let acts = '';
          if (u.state === 'uploading') acts = `<button class="btn btn--sm" type="button" data-act="pause" data-id="${u.id}">${P.ic('pause')}Pause</button><button class="btn btn--sm btn--ghost" type="button" data-act="suspend" data-id="${u.id}" title="Demo: simulate iOS suspending Safari">${P.ic('moon')}Simulate suspend</button>`;
          if (u.state === 'paused') acts = `<button class="btn btn--sm btn--grass" type="button" data-act="resume" data-id="${u.id}">${P.ic('play')}Resume</button><button class="btn btn--sm btn--ghost" type="button" data-act="cancel" data-id="${u.id}">Cancel</button>`;
          if (u.state === 'failed') acts = `<button class="btn btn--sm btn--primary" type="button" data-act="retry" data-id="${u.id}">${P.ic('refresh-cw')}Re-select file &amp; resume</button><button class="btn btn--sm btn--ghost" type="button" data-act="cancel" data-id="${u.id}">Cancel</button>`;
          if (u.state === 'ready') acts = `<a class="btn btn--sm btn--sun" href="#/review/${m.id}">${P.ic('badge-check')}Review</a>`;
          if (u.state === 'processing' || u.state === 'uploaded') acts = `<span class="small muted" style="font-weight:700">${P.ic('loader-circle', 'spin inline-ic')} Stream is processing…</span>`;
          return `<div class="up-row ${u.state === 'failed' ? 'is-failed' : ''} ${query.new === u.id ? 'is-new' : ''}"><span class="thumb"><img src="${A.thumb(m)}" alt=""></span>
            <div class="meta"><div class="row row--wrap" style="gap:8px"><b>${P.esc(m.title || u.file)}</b>${P.status(u.state)}</div><small>${u.file} · ${u.size} · ${u.protocol} · ${P.esc(A.dogNames(m.dogs || []))}${m.session ? ' · ' + P.esc((L.session(m.session) || {}).title || '') : ''}</small>
              ${['uploading', 'paused', 'failed'].includes(u.state) ? `<div class="progress progress--sm ${u.state === 'uploading' ? 'progress--striped progress--sky' : u.state === 'failed' ? 'progress--tomato' : 'progress--sun'}"><i data-up-prog="${u.id}" style="--v:${pct}%"></i></div><small data-up-pct="${u.id}">${pct}%${u.state === 'uploading' ? ' · ' + u.speed : ''}</small>` : ''}
              ${u.error && u.state === 'failed' ? `<span class="up-err">${P.ic('alert-triangle')}${P.esc(u.error)}</span>` : ''}</div>
            <div class="acts">${acts}</div></div>`;
        }).join('') || A.empty('upload-cloud', 'Nothing here', 'No uploads in this state.')}</div>
        <div class="callout callout--info" style="margin-top:20px">${P.ic('info')}<div><strong>About iPhone uploads</strong><p>Uploads use tus so they can resume from where they stopped. If Safari is suspended, you may need to re-select the file — we’ll keep your place.</p></div></div>`,
      mount(el) {
        el.addEventListener('click', (e) => {
          const b = e.target.closest('[data-act]'); if (!b) return; const id = b.dataset.id; const u = L.uploads.find((x) => x.id === id);
          if (b.dataset.act === 'pause') { P.db.patch('uploads', id, { state: 'paused' }); P.toast('Upload paused', { icon: 'pause' }); }
          if (b.dataset.act === 'resume') { P.db.patch('uploads', id, { state: 'uploading', sizeMB: u.sizeMB || parseFloat(u.size) }); A.ensureTick(); P.toast(`Resuming from ${Math.round(u.progress * 100)}%`, { icon: 'play' }); }
          if (b.dataset.act === 'suspend') { P.db.patch('uploads', id, { state: 'failed', error: `Interrupted at ${Math.round(u.progress * 100)}% — Safari was suspended. Re-select the file to resume.` }); P.db.patch('media', u.media, { processing: 'failed' }); P.toast('Safari suspended the upload (simulated)', { tone: 'err' }); }
          if (b.dataset.act === 'cancel') { P.confirm('Cancel upload?', 'The partial upload is discarded. The draft record stays so you can try again later.', 'Cancel upload', () => { P.db.patch('uploads', id, { state: 'cancelled' }); P.db.patch('media', u.media, { processing: 'cancelled' }); A.badges(); A.router.refresh(); }); return; }
          if (b.dataset.act === 'retry') {
            P.modal({ title: 'Re-select the file', html: `<p>iOS doesn’t let web apps keep files in the background, so pick the same video again and we’ll resume from <b>${Math.round(u.progress * 100)}%</b>.</p><button class="sel-tile" type="button" data-same aria-pressed="false" style="width:220px"><img src="${A.thumb(L.mediaItem(u.media))}" alt=""><span class="t">${u.file} · ${u.size}</span><span class="tick">${P.ic('check')}</span></button>`,
              onOpen(api) { $('[data-same]', api.el).addEventListener('click', () => { P.db.patch('uploads', id, { state: 'uploading', error: null, sizeMB: parseFloat(u.size) }); P.db.patch('media', u.media, { processing: 'uploading' }); A.ensureTick(); api.close(); P.toast(`File matched — resuming from ${Math.round(u.progress * 100)}%`, { tone: 'ok', icon: 'refresh-cw' }); A.badges(); A.router.refresh(); }); } });
            return;
          }
          A.badges(); A.router.refresh();
        });
        $('[data-lib]', el).addEventListener('click', () => (A.S.ctx && A.S.ctx.dogs.length ? A.libraryPick() : A.go('/record')));
        APP.popIn(el, '.up-row');
      }
    };
  };

  /* ---------- boot (after all view files register) ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    const R = [
      ['/dashboard', 'dashboard', 'Dashboard'], ['/record', 'record', 'Record'], ['/camera', 'record', 'Camera'], ['/uploads', 'uploads', 'Uploads'],
      ['/review', 'review', 'Review queue'], ['/review/:id', 'review', 'Review'], ['/inbox', 'inbox', 'WhatsApp inbox'],
      ['/clients', 'clients', 'Clients'], ['/household/:id', 'clients', 'Household'], ['/dogs', 'dogs', 'Dogs'], ['/dog/:id', 'dogs', 'Dog'],
      ['/sessions', 'sessions', 'Sessions'], ['/session/:id', 'sessions', 'Session'], ['/groups', 'groups', 'Groups'],
      ['/media', 'media', 'Media library'], ['/share', 'share', 'Share composer'], ['/shares', 'shares', 'Share history'],
      ['/techniques', 'techniques', 'Techniques'], ['/academy', 'academy', 'Academy CMS'], ['/academy/:id', 'academy', 'Guide editor'],
      ['/consent', 'consent', 'Consent'], ['/audit', 'audit', 'Audit log'], ['/settings', 'settings', 'Settings']
    ];
    const key = (p) => ({ '/review/:id': 'reviewDetail', '/household/:id': 'household', '/dog/:id': 'dog', '/session/:id': 'session', '/academy/:id': 'guideEditor' }[p] || p.slice(1));
    A.router = APP.router({
      el: $('#view'), fallback: '/dashboard', appName: 'Linda’s Trainer Workspace',
      routes: R.map(([path, nav, title]) => ({ path, nav, title, view: (ctx) => (A.V[key(path)] ? A.V[key(path)](ctx) : `<div class="empty"><h3>${title}</h3></div>`) })),
      onRoute: (r, ctx) => { A.curNav = r.nav; A.curPath = ctx.path; A.badges(); }
    });
    A.renderCtx(); A.badges(); P.icons();
    A.palette = APP.palette(() => {
      const items = [];
      items.push({ group: 'Actions', label: 'Record video', sub: A.ctxLabel() && A.ctxLabel().dogs.length ? 'for ' + A.dogNames(A.S.ctx.dogs) : 'pick a dog', icon: 'circle-dot', hint: 'R', run: () => A.go('/camera') });
      items.push({ group: 'Actions', label: 'New share', icon: 'send', run: () => A.go('/share') });
      items.push({ group: 'Actions', label: 'New household', icon: 'house-plus', run: () => A.newHousehold() });
      items.push({ group: 'Actions', label: 'Add dog', icon: 'dog', run: () => A.newDog() });
      NAV.forEach(([g, its]) => its.forEach(([k, l, i]) => items.push({ group: 'Go to', label: l, icon: i, run: () => A.go('/' + k) })));
      L.dogs.forEach((d) => items.push({ group: 'Dogs', label: d.name, sub: d.breed + ' · ' + L.household(d.household).name, img: d.avatar, run: () => A.go('/dog/' + d.id) }));
      L.households.forEach((h) => items.push({ group: 'Households', label: h.name, sub: h.members.map((u) => (L.user(u) || {}).name).join(', '), kw: h.members.map((u) => { const x = L.user(u) || {}; return x.email + ' ' + x.phone; }).join(' '), icon: 'house', run: () => A.go('/household/' + h.id) }));
      L.media.forEach((m) => items.push({ group: 'Media', label: m.title, sub: P.statusLabel(m.editorial) + ' · ' + A.dogNames(m.dogs), img: A.thumb(m), run: () => A.go('/review/' + m.id) }));
      L.sessions.forEach((s) => items.push({ group: 'Sessions', label: s.title, sub: APP.when(s.date), icon: 'calendar', run: () => A.go('/session/' + s.id) }));
      L.guides.forEach((g) => items.push({ group: 'Guides', label: g.title, sub: P.statusLabel(g.status), icon: 'book-open', run: () => A.go('/academy/' + g.id) }));
      return items;
    });
    $('[data-cmdk]').addEventListener('click', () => A.palette.open());
    document.addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'r' && e.altKey) { e.preventDefault(); A.go('/camera'); } });
    P.pageTransitions();
    A.router.resolve();
    if (L.uploads.some((u) => ['uploading', 'uploaded'].includes(u.state) || (u.state === 'processing' && u.created !== 'seed'))) A.ensureTick();
    if (!(function () { try { const k = 'v2:adminWelcomed'; const seen = sessionStorage.getItem(k); sessionStorage.setItem(k, '1'); return seen; } catch (e) { return true; } })()) { setTimeout(() => P.toast('Signed in as Linda — try ⌘K to search anything', { icon: 'command', ms: 4500 }), 900); }
  });
})();
