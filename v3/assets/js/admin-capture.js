/* ==========================================================================
   V3 · admin-capture — dashboard, record flow, camera, uploads, more
   ========================================================================== */
(function () {
  'use strict';
  const V3 = window.V3;
  const { $, $$, esc, icon } = V3;
  const db = V3.db;
  const A = V3.A;
  const R = A.routes;

  /* Upload row ------------------------------------------------------------ */
  const STAGES = ['created', 'uploading', 'uploaded', 'processing', 'ready'];
  A.uploadRow = (u, compact) => {
    const m = V3.media(u.media) || {};
    const si = STAGES.indexOf(u.state);
    const pct = Math.round((u.progress || 0) * 100);
    const acts = [];
    if (u.state === 'uploading') acts.push(`<button class="icon-btn icon-btn--sm" type="button" data-pause="${u.id}" aria-label="${u.paused ? 'Resume' : 'Pause'} upload">${icon(u.paused ? 'play' : 'pause')}</button>`);
    if (u.state === 'failed') acts.push(`<button class="btn btn--xs btn--accent" type="button" data-retry="${u.id}">${icon('refresh-cw')} Retry from ${pct}%</button>`);
    if (['created', 'uploading', 'failed'].includes(u.state)) acts.push(`<button class="icon-btn icon-btn--sm" type="button" data-cancel="${u.id}" aria-label="Cancel upload">${icon('x')}</button>`);
    if (u.state === 'ready') acts.push(`<a class="btn btn--xs btn--ghost" href="#/review/${m.id}">Review ${icon('arrow-right')}</a>`);
    return `<div class="up" data-up="${u.id}" style="--v:${u.progress || 0}">
      <div class="up__thumb" style="--shade:${u.state === 'ready' ? 0 : 1}"><img src="${V3.thumb(m.clip || 1552, 40)}" alt="">${['uploading', 'created'].includes(u.state) ? `<span class="ring" style="--v:inherit"><svg viewBox="0 0 36 36"><circle class="ring__bg" cx="18" cy="18" r="15.9155"/><circle class="ring__fg" cx="18" cy="18" r="15.9155" pathLength="100" style="stroke-dashoffset:calc(100 - var(--v) * 100)"/></svg></span>` : ''}</div>
      <div style="min-width:0">
        <div class="up__head"><b>${esc(m.title || u.file)}</b>${V3.state(u.paused && u.state === 'uploading' ? 'pending' : u.state, u.paused && u.state === 'uploading' ? 'Paused' : V3.label.processing[u.state])}</div>
        <div class="up__meta"><span>${esc(u.file)}</span><span><span data-mbdone>${Math.round((u.progress || 0) * (parseFloat(u.size) || 0))}</span> / ${esc(u.size)}</span>${u.state === 'uploading' ? `<span data-speed>${esc(u.speed || '—')}</span><span>ETA <span data-eta>${esc(u.eta || '—')}</span></span>` : ''}<span>${esc(u.protocol)}</span>${!compact ? `<span>${esc(A.dogNames(m.dogs || []))}</span>` : ''}</div>
        ${['uploading', 'created', 'failed'].includes(u.state) ? `<div class="bar ${u.state === 'failed' ? 'bar--danger' : u.paused ? '' : 'bar--striped'}"><i></i></div>` : ''}
        ${!compact ? `<div class="pipeline">${STAGES.map((s, i) => `<i class="${u.state === 'failed' && i === 1 ? 'err' : i <= si ? 'on' : ''}"></i>`).join('')}</div><div class="pipeline-l">${STAGES.map((s) => `<span>${s}</span>`).join('')}</div>` : ''}
        ${u.error ? `<div class="up__err">${icon('triangle-alert')}<span>${esc(u.error)}</span></div>` : ''}
      </div>
      <div class="up__actions">${acts.join('')}</div>
    </div>`;
  };
  A.bindUploadActions = (v) => {
    v.addEventListener('click', async (e) => {
      const p = e.target.closest('[data-pause]'), r = e.target.closest('[data-retry]'), c = e.target.closest('[data-cancel]');
      if (p) A.togglePause(p.dataset.pause);
      if (r) A.retry(r.dataset.retry);
      if (c && await V3.confirm('Cancel this upload?', 'The clip stays on your phone. You can upload it again later from your library.', 'Cancel upload', true)) { A.cancel(c.dataset.cancel); V3.toast('Upload cancelled', { icon: 'x' }); }
    });
  };

  /* Dashboard ------------------------------------------------------------- */
  R['dashboard'] = () => {
    const st = db.stats.trainer;
    const act = A.activeSession();
    const ctx = db.context;
    const ctxDogs = (ctx && ctx.dogs) || (ctx && ctx.dog ? [ctx.dog] : []);
    const q = A.reviewQueue();
    const ups = db.uploads.filter((u) => u.state !== 'cancelled').slice(0, 3);
    const recent = db.sessions.filter((s) => s.status === 'completed').sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    const stored = st.streamMinutesStored, delivered = st.streamMinutesDelivered;
    const cost = (stored / 1000) * 5 + (delivered / 1000) * 1;
    const opens = [3, 5, 4, 8, 6, 9, 6];
    const weeksL = ['W36', 'W37', 'W38', 'W39', 'W40', 'W41', 'W42'];
    const actDog = act ? V3.dog(act.dogs[0]) : null;
    return {
      title: 'Dashboard', nav: 'dashboard',
      html: `
      ${A.vh(`<span>${V3.fmtDate(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long' })}</span>`, `${A.greeting()}, Linda.`, '', `<a class="btn btn--ghost btn--sm" href="#/share">${icon('send')} Share</a><button class="btn btn--ghost btn--sm" type="button" data-palette>${icon('search')} Jump to… <span class="kbd" style="margin-left:4px">⌘K</span></button>`)}
      <section class="session-hero">
        <div class="session-hero__bg"><img src="${esc(actDog ? actDog.cover : V3.img(1552))}" alt=""></div>
        <div>
          <span class="label">${act ? `<span class="rec-dot" style="width:6px;height:6px"></span>&nbsp; Active session · started ${V3.fmtTime(act.date)}` : 'No active session'}</span>
          <h2>${act ? esc(act.title) : 'Ready when you are'}</h2>
          <p>${act ? `${esc(A.dogNames(act.dogs))} · ${esc(V3.household(act.household).name)} · ${esc(act.location)}` : 'Pick a client and dog — it stays selected for every clip.'}</p>
          <div class="session-hero__meta">${act ? `<span class="pill pill--mono">${icon('film')} ${act.media.length} clip${act.media.length === 1 ? '' : 's'}</span><a class="pill" href="#/session/${act.id}">${icon('notebook-pen')} Notes</a><button class="pill" type="button" data-end>${icon('square')} End session</button>` : `<a class="pill" href="#/record">${icon('search')} Choose client</a>`}</div>
        </div>
        <a class="rec-btn" href="${act || ctxDogs.length ? '#/record/camera' : '#/record'}" aria-label="Record video"><span class="rec-btn__inner"><span class="rec-btn__dot"></span><span>Record</span><span class="kbd">R</span></span></a>
      </section>
      <div class="g g-4" style="margin-top:16px">
        <a class="kpi${A.needsReview() ? ' kpi--hot' : ''}" href="#/review"><span class="label">${icon('film')} Review queue</span><span class="kpi__n">${q.length}</span><span class="kpi__foot">${A.needsReview()} need review · ${q.length - A.needsReview()} AI pending</span></a>
        <a class="kpi" href="#/inbox"><span class="label">${icon('inbox')} Unassigned</span><span class="kpi__n">${A.unassigned()}</span><span class="kpi__foot">WhatsApp archive inbox</span></a>
        <a class="kpi" href="#/uploads"><span class="label">${icon('cloud-upload')} Uploads</span><span class="kpi__n">${A.activeUploads().length}<small>active</small></span><span class="kpi__foot">${db.uploads.filter((u) => u.state === 'failed').length} need attention</span></a>
        <a class="kpi" href="#/shares"><span class="label">${icon('send')} Prepared shares</span><span class="kpi__n">${A.preparedShares()}</span><span class="kpi__foot">Waiting for you to confirm</span></a>
      </div>
      <div class="g g-main" style="margin-top:4px">
        <div>
          <div class="sec-t"><h2>Upload queue</h2><a class="link" href="#/uploads">All uploads</a></div>
          <div data-dash-ups>${ups.length ? ups.map((u) => A.uploadRow(u, true)).join('') : `<div class="card card--flat">${A.empty('cloud-upload', 'Nothing uploading', 'New recordings upload automatically.')}</div>`}</div>
          <div class="sec-t"><h2>Needs your eye <span class="num">${q.length}</span></h2><a class="link" href="#/review">Open queue</a></div>
          <div class="card"><div class="list" style="padding:2px 12px">${q.slice(0, 4).map((m) => `<a class="lrow" href="#/review/${m.id}"><span class="lrow__thumb"><img src="${V3.thumb(m.clip)}" alt=""><span class="dur">${esc(m.duration)}</span></span><span class="lrow__t"><b>${esc(m.title)}</b><small>${esc(A.dogNames(m.dogs))} · ${m.ai ? `AI ${Math.round(m.ai.confidence * 100)}%` : 'AI pending'}${(m.ai && m.ai.evidence.some((x) => /Ambiguous/.test(x))) ? ' · ⚠ multi-dog' : ''}</small></span><span class="lrow__end">${A.edState(m)}</span></a>`).join('') || A.empty('check-check', 'All caught up', 'Nothing waiting for review.')}</div></div>
          <div class="sec-t"><h2>Recent sessions</h2><a class="link" href="#/sessions">All sessions</a></div>
          <div class="card"><div class="list" style="padding:2px 12px">${recent.map((s) => `<a class="lrow" href="#/session/${s.id}">${A.dogAvatars(s.dogs, 32)}<span class="lrow__t"><b>${esc(s.title)}</b><small>${esc(V3.household(s.household).name)} · ${V3.fmtDay(s.date)}</small></span><span class="lrow__end hide-m"><span class="pill">${icon('film')} ${s.media.length}</span></span>${icon('chevron-right')}</a>`).join('')}</div></div>
        </div>
        <div>
          <div class="sec-t"><h2>Sessions / week</h2><span class="mono faint">Last 7 weeks</span></div>
          <div class="card card--pad">${V3.chart.bars(db.stats.weekly, { labels: weeksL })}<div class="row row--between" style="margin-top:8px"><span class="muted" style="font-size:12.5px">${st.sessionsThisMonth} sessions this month</span><span class="mono" style="font-size:11px">↑ ${Math.round(((db.stats.weekly[6] - db.stats.weekly[5]) / db.stats.weekly[5]) * 100)}% wk</span></div></div>
          <div class="sec-t"><h2>Cloudflare Stream</h2><span class="mono faint">This month</span></div>
          <div class="card card--pad" style="display:grid;gap:14px">
            <div><div class="row row--between" style="margin-bottom:6px"><span class="label">Stored minutes</span><span class="num" style="font-size:12px">${stored.toLocaleString()}</span></div><div class="meter" style="--v:${stored / 5000};--m:2"><i></i></div></div>
            <div><div class="row row--between" style="margin-bottom:6px"><span class="label">Delivered minutes</span><span class="num" style="font-size:12px">${delivered.toLocaleString()}</span></div><div class="meter" style="--v:${delivered / 10000};--m:2"><i style="background:var(--text-3)"></i></div></div>
            <div class="row row--between"><span class="muted" style="font-size:12.5px">Est. US$${cost.toFixed(2)} / month</span><span class="mono faint">$5/1k stored · $1/1k delivered</span></div>
          </div>
          <div class="sec-t"><h2>AI spend</h2><a class="link" href="#/settings">Ceiling</a></div>
          <div class="card card--pad" style="display:grid;gap:10px">
            <div class="row row--between"><span class="kpi__n" style="font-size:26px">$${st.aiSpendMonth.toFixed(2)}</span><span class="mono faint">of $${st.aiCeiling} ceiling</span></div>
            <div class="meter" style="--v:${st.aiSpendMonth / st.aiCeiling};--m:.9"><i style="background:${st.aiSpendMonth / st.aiCeiling > 0.8 ? 'var(--danger)' : 'var(--text)'}"></i><b title="90% alert"></b></div>
            <span class="muted" style="font-size:12.5px">${Math.round((st.aiSpendMonth / st.aiCeiling) * 100)}% used · AI pauses at the ceiling, review continues.</span>
          </div>
          <div class="sec-t"><h2>Portal opens</h2><span class="mono faint">7 days · ${st.portalOpens7d}</span></div>
          <div class="card card--pad">${V3.chart.area(opens, { labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'] })}<p class="muted" style="font-size:12.5px;margin-top:6px">Clients opening shared links in the portal. WhatsApp delivery/read isn’t tracked.</p></div>
        </div>
      </div>`,
      mount(v) {
        A.bindUploadActions(v);
        const p = $('[data-palette]', v); if (p) p.addEventListener('click', () => V3.app.palette.open());
        const end = $('[data-end]', v);
        if (end) end.addEventListener('click', async () => { if (await V3.confirm('End this session?', 'Clips stay attached. You can still add notes and homework afterwards.', 'End session')) { act.status = 'completed'; V3.audit('ended session', act.title); V3.save(); V3.toast('Session ended', { sub: act.title }); V3.app.refresh(); V3.app.refreshChrome(); } });
      }
    };
  };

  /* Record — pick client → dog → session ---------------------------------- */
  R['record'] = (_, q) => {
    const t0 = performance.now();
    const ctx = db.context || {};
    const st = { hh: ctx.household || '', dogs: ctx.dogs || (ctx.dog ? [ctx.dog] : []), session: ctx.session || '', newSession: false };
    const fromLibrary = q.get('upload') === '1';
    return {
      title: 'Record', nav: 'record', mtitle: 'New recording',
      html: `${A.vh('<span>Media-01 · Context stays selected</span>', 'Who are we training?', 'Pick a household and dog. Every clip you record afterwards attaches here automatically — no re-selecting.', `<span class="pill pill--mono" data-timer>${icon('timer')} 0.0s</span>`)}
      ${fromLibrary ? `<div class="notice notice--info" style="margin-bottom:14px;max-width:760px">${icon('info')}<span>Uploading a large file directly from your phone avoids the 16 MB WhatsApp limit. Choose the context, then pick <strong>Upload from library</strong>.</span></div>` : ''}
      <div class="picker">
        <section class="pick-step" data-step="1"><div class="pick-step__h"><span class="pick-step__n">1</span><b>Client or household</b><span class="muted" data-s1></span></div>
          <label class="input-group" style="margin-bottom:10px"><i data-lucide="search"></i><span class="sr-only">Search clients, households and dogs</span><input class="input" type="search" data-q placeholder="Search “Sarah”, “Pickle”, “Grey Lynn”…" autocomplete="off"></label>
          <div class="opt-grid" data-hhs></div></section>
        <section class="pick-step" data-step="2"><div class="pick-step__h"><span class="pick-step__n">2</span><b>Dog</b><span class="muted">Multi-dog session? Select both.</span></div><div class="opt-grid" data-dogs></div></section>
        <section class="pick-step" data-step="3"><div class="pick-step__h"><span class="pick-step__n">3</span><b>Session</b></div><div class="opt-grid" data-sess></div>
          <div data-new hidden style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px"><div class="field"><label for="ns-title">Title <span class="muted">(optional)</span></label><input class="input" id="ns-title" placeholder="e.g. Recall at the beach"></div><div class="field"><label for="ns-loc">Location</label><input class="input" id="ns-loc" placeholder="Western Springs park"></div></div></section>
        <div class="ctx-bar"><div class="grow" style="min-width:180px"><span class="label">Recording into</span><div data-ctxline style="margin-top:2px"><b>Nothing selected yet</b></div></div>
          <button class="btn btn--ghost btn--sm" type="button" data-lib>${icon('images')} Upload from library</button>
          <button class="btn btn--accent" type="button" data-go disabled>${icon('circle-dot')} Open camera</button></div>
      </div>`,
      mount(v) {
        const timer = $('[data-timer]', v);
        const ti = setInterval(() => { timer.innerHTML = `${icon('timer')} ${((performance.now() - t0) / 1000).toFixed(1)}s`; V3.icons(timer); }, 100);
        const qi = $('[data-q]', v);
        const drawHH = () => {
          const s = qi.value.trim();
          const list = db.households.filter((h) => h.status === 'active').map((h) => {
            const people = V3.membersOf(h.id).map((u) => u.name).join(' ');
            const dogs = V3.dogsFor(h.id).map((d) => d.name).join(' ');
            return { h, score: V3.fuzzy(s, `${h.name} ${people} ${dogs} ${h.suburb}`) };
          }).filter((x) => x.score > 0).sort((a, b) => (s ? b.score - a.score : 0));
          $('[data-hhs]', v).innerHTML = list.map(({ h }) => `<button class="opt" type="button" aria-pressed="${h.id === st.hh}" data-hh="${h.id}"><span class="avatar avatar--sq">${esc(V3.initials(h.name))}</span><span style="min-width:0"><b>${esc(h.name)}</b><small>${V3.dogsFor(h.id).map((d) => esc(d.name)).join(', ')} · ${esc(h.suburb)}</small></span><span class="tick">${icon('check')}</span></button>`).join('') || `<p class="muted">No match. <a class="link link--under" href="#/clients?new=1">Add a household</a></p>`;
          V3.icons(v);
        };
        const drawDogs = () => {
          const ds = st.hh ? V3.dogsFor(st.hh) : [];
          $('[data-dogs]', v).innerHTML = ds.length ? ds.map((d) => `<button class="opt" type="button" aria-pressed="${st.dogs.includes(d.id)}" data-dog="${d.id}"><span class="avatar"><img src="${esc(d.avatar)}" alt=""></span><span><b>${esc(d.name)}</b><small>${esc(d.breed)}</small></span><span class="tick">${icon('check')}</span></button>`).join('') : '<p class="muted">Choose a household first.</p>';
          const ss = st.hh ? V3.sessionsForHousehold(st.hh).filter((s) => s.status !== 'completed').sort((a, b) => a.date.localeCompare(b.date)) : [];
          $('[data-sess]', v).innerHTML = st.hh ? ss.map((s) => `<button class="opt" type="button" aria-pressed="${st.session === s.id && !st.newSession}" data-sid="${s.id}"><span class="lrow__ico">${icon(s.status === 'active' ? 'radio' : 'calendar')}</span><span><b>${esc(s.title)}</b><small>${s.status === 'active' ? 'Active now' : V3.fmtDay(s.date)} · ${esc(s.location)}</small></span><span class="tick">${icon('check')}</span></button>`).join('') + `<button class="opt" type="button" aria-pressed="${st.newSession}" data-sid="new"><span class="lrow__ico">${icon('plus')}</span><span><b>Start new session</b><small>Today · ${V3.fmtTime(new Date().toISOString())}</small></span><span class="tick">${icon('check')}</span></button>` : '<p class="muted">Sessions appear once you pick a household.</p>';
          $('[data-new]', v).hidden = !st.newSession;
          $('[data-step="1"]', v).classList.toggle('is-done', !!st.hh);
          $('[data-step="2"]', v).classList.toggle('is-done', st.dogs.length > 0);
          $('[data-step="3"]', v).classList.toggle('is-done', !!(st.session || st.newSession));
          const ok = st.hh && st.dogs.length && (st.session || st.newSession);
          $('[data-go]', v).disabled = !ok; $('[data-lib]', v).disabled = !ok;
          $('[data-ctxline]', v).innerHTML = ok ? `<b>${esc(A.dogNames(st.dogs))}</b> <span style="opacity:.6">· ${esc(V3.household(st.hh).name)} · ${st.newSession ? 'New session' : esc(V3.session(st.session).title)}</span>` : `<b>${st.hh ? (st.dogs.length ? 'Choose a session' : 'Choose a dog') : 'Nothing selected yet'}</b>`;
          $('[data-s1]', v).textContent = st.hh ? V3.household(st.hh).name : '';
          V3.icons(v);
        };
        drawHH(); drawDogs();
        qi.addEventListener('input', drawHH);
        qi.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const f = $('[data-hh]', v); if (f) f.click(); } });
        v.addEventListener('click', (e) => {
          const h = e.target.closest('[data-hh]'), d = e.target.closest('[data-dog]'), s = e.target.closest('[data-sid]');
          if (h) { if (st.hh !== h.dataset.hh) { st.hh = h.dataset.hh; const ds = V3.dogsFor(st.hh); st.dogs = ds.length === 1 ? [ds[0].id] : []; const act = V3.sessionsForHousehold(st.hh).find((x) => x.status === 'active'); st.session = act ? act.id : ''; st.newSession = !act; } drawHH(); drawDogs(); }
          if (d) { const id = d.dataset.dog; st.dogs = st.dogs.includes(id) ? st.dogs.filter((x) => x !== id) : st.dogs.concat(id); drawDogs(); }
          if (s) { if (s.dataset.sid === 'new') { st.newSession = true; st.session = ''; } else { st.newSession = false; st.session = s.dataset.sid; } drawDogs(); }
        });
        const commit = () => {
          let sid = st.session;
          if (st.newSession) {
            sid = 's-' + (109 + Math.floor(Math.random() * 900));
            db.sessions.unshift({ id: sid, date: V3.nowISO(), location: $('#ns-loc', v).value.trim() || 'On location', household: st.hh, dogs: st.dogs.slice(), status: 'active', title: $('#ns-title', v).value.trim() || `${A.dogNames(st.dogs)} — session`, notes: '', homework: [], media: [] });
            db.sessions.forEach((x) => { if (x.id !== sid && x.status === 'active') x.status = 'completed'; });
            V3.audit('started session', `${A.dogNames(st.dogs)} · ${V3.household(st.hh).name}`);
          } else {
            const s = V3.session(sid); if (s.status === 'scheduled') { s.status = 'active'; V3.audit('started session', s.title); }
            st.dogs.forEach((d) => { if (!s.dogs.includes(d)) s.dogs.push(d); });
          }
          db.context = { household: st.hh, dogs: st.dogs.slice(), dog: st.dogs[0], session: sid };
          V3.save(); V3.app.refreshChrome();
          return ((performance.now() - t0) / 1000).toFixed(1);
        };
        $('[data-go]', v).addEventListener('click', () => { const t = commit(); V3.toast(`Context set in ${t}s`, { icon: 'timer', sub: 'Target: under 15s' }); V3.app.go('#/record/camera'); });
        $('[data-lib]', v).addEventListener('click', () => { commit(); libraryPick(); });
        setTimeout(() => qi.focus(), 50);
        return () => clearInterval(ti);
      }
    };
  };
  function libraryPick() {
    const clips = [1494, 1501, 518, 23072, 1557, 50688];
    const m = V3.modal({
      title: 'Choose from library', label: 'Upload from phone', sub: 'Simulated iOS photo picker. Large files are fine — they upload straight to Stream.',
      body: `<div class="covers" style="grid-template-columns:repeat(3,1fr)">${clips.map((c, i) => `<button class="cover" type="button" data-c="${c}" aria-pressed="false" style="aspect-ratio:9/12"><img src="${V3.thumb(c, 40)}" alt="Library clip ${i + 1}"></button>`).join('')}</div>`,
      foot: `<button class="btn btn--ghost" data-close type="button">Cancel</button><button class="btn btn--accent" type="button" data-up disabled>${icon('cloud-upload')} Upload</button>`,
      onOpen(root) {
        let sel = null;
        root.addEventListener('click', (e) => { const c = e.target.closest('[data-c]'); if (!c) return; sel = +c.dataset.c; $$('[data-c]', root).forEach((x) => x.setAttribute('aria-pressed', String(x === c))); $('[data-up]', root).disabled = false; });
        $('[data-up]', root).addEventListener('click', () => {
          const ctx = db.context;
          const mm = A.createMedia({ dogs: ctx.dogs || [ctx.dog], session: ctx.session, clip: sel, source: 'pwa_library' });
          A.startUpload(mm, { file: `IMG_${3900 + sel % 97}.MOV` });
          m.close(); V3.toast('Uploading from library', { icon: 'cloud-upload', sub: 'tus resumable' }); V3.app.go('#/uploads');
        });
      }
    });
  }

  /* Camera ------------------------------------------------------------------ */
  R['record/camera'] = () => {
    const ctx = db.context;
    if (!ctx || !ctx.session) { setTimeout(() => V3.app.go('#/record'), 0); return { title: 'Record', nav: 'record', html: '' }; }
    const dogs = ctx.dogs || [ctx.dog];
    const d = V3.dog(dogs[0]);
    const s = V3.session(ctx.session);
    const failNext = V3.store.get('sim-suspend', true);
    return {
      title: 'Camera', nav: 'record', noAnim: true,
      html: `<div class="camera" role="dialog" aria-modal="true" aria-label="Camera — recording for ${esc(d.name)}">
        <div class="camera__frame">
          <video muted playsinline autoplay loop preload="auto" src="${V3.vert(d.clip)}" poster="${V3.thumb(d.clip, 40)}"></video>
          <div class="camera__grid"></div>
          <div class="camera__top"><span class="camera__ctx"><img src="${esc(d.avatar)}" alt="">${esc(A.dogNames(dogs))} · ${esc(s ? s.title : '')}</span><span class="camera__timer" data-t>00:00</span></div>
          <p class="camera__hint" data-hint>Simulated iOS camera · prototype</p>
          <div class="camera__mode" data-mode><span>Slo-mo</span><b>Video</b><span>Photo</span></div>
          <div class="camera__bottom" data-controls><button class="camera__side" type="button" data-cancel>Cancel</button><button class="camera__shutter" type="button" data-shutter aria-label="Start recording"><i></i></button><button class="camera__side camera__side--r" type="button" data-flip aria-label="Flip camera">${icon('refresh-ccw')}</button></div>
          <div class="camera__review" data-review hidden><button type="button" data-retake>Retake</button><button type="button" data-use>Use Video</button></div>
        </div>
      </div>`,
      mount(v) {
        const cam = $('.camera', v);
        const tEl = $('[data-t]', v);
        let rec = false, t0 = 0, iv = null, secs = 0;
        const vid = $('video', v);
        const p = vid.play(); if (p && p.catch) p.catch(() => {});
        const shutter = $('[data-shutter]', v);
        const toggle = () => {
          if (!rec) {
            rec = true; t0 = performance.now(); cam.classList.add('is-rec'); shutter.setAttribute('aria-label', 'Stop recording'); $('[data-hint]', v).textContent = 'Recording · keep the phone steady';
            $('[data-mode]', v).style.opacity = 0;
            iv = setInterval(() => { secs = (performance.now() - t0) / 1000; tEl.textContent = V3.fmtSec(secs).padStart(5, '0'); }, 200);
          } else {
            rec = false; clearInterval(iv); cam.classList.remove('is-rec'); vid.pause();
            $('[data-controls]', v).hidden = true; $('[data-review]', v).hidden = false; $('[data-hint]', v).textContent = `${V3.fmtSec(Math.max(1, secs))} recorded`;
            $('[data-use]', v).focus();
          }
        };
        shutter.addEventListener('click', toggle);
        $('[data-flip]', v).addEventListener('click', () => V3.toast('Front camera (simulated)', { icon: 'refresh-ccw', duration: 1200 }));
        $('[data-cancel]', v).addEventListener('click', () => V3.app.go('#/record'));
        $('[data-retake]', v).addEventListener('click', () => { $('[data-controls]', v).hidden = false; $('[data-review]', v).hidden = true; tEl.textContent = '00:00'; $('[data-mode]', v).style.opacity = 1; const pp = vid.play(); if (pp && pp.catch) pp.catch(() => {}); });
        $('[data-use]', v).addEventListener('click', () => {
          const m = A.createMedia({ dogs, session: ctx.session, clip: d.clip, duration: V3.fmtSec(Math.max(8, Math.round(secs)) + 12) });
          A.startUpload(m, { failOnce: failNext });
          if (failNext) V3.store.set('sim-suspend', false);
          V3.toast(`Uploading to ${esc(d.name)}’s session`, { icon: 'cloud-upload', sub: 'Started automatically · tus', action: { label: 'Record again', fn: () => V3.app.go('#/record/camera') } });
          V3.app.go('#/uploads');
        });
        const key = (e) => { if (e.key === ' ' || e.key === 'Enter') { if (document.activeElement === shutter || !$('[data-controls]', v).hidden) { e.preventDefault(); toggle(); } } if (e.key === 'Escape') V3.app.go('#/record'); };
        document.addEventListener('keydown', key);
        document.body.style.overflow = 'hidden';
        setTimeout(() => shutter.focus(), 60);
        return () => { clearInterval(iv); document.removeEventListener('keydown', key); document.body.style.overflow = ''; vid.pause(); };
      }
    };
  };

  /* Uploads --------------------------------------------------------------- */
  R['uploads'] = (_, q) => {
    const f = q.get('f') || 'all';
    const groups = { all: () => true, active: (u) => ['created', 'uploading', 'uploaded', 'processing'].includes(u.state), failed: (u) => u.state === 'failed', done: (u) => ['ready', 'cancelled'].includes(u.state) };
    const list = db.uploads.filter(groups[f]);
    const c = (k) => db.uploads.filter(groups[k]).length;
    return {
      title: 'Uploads', nav: 'uploads',
      html: `${A.vh('<span>Media-02 / Media-03 · direct to Cloudflare Stream</span>', 'Uploads', 'Recordings upload straight from the phone with tus — resumable, never proxied through our servers.', `<a class="btn btn--accent btn--sm" href="#/record">${icon('circle-dot')} New recording</a>`)}
      <div class="notice notice--warn" style="margin-bottom:16px">${icon('smartphone')}<span><strong>Keep the app open until uploads finish.</strong> iOS can suspend Safari in the background. If that happens, we’ll show it here and resume from where it stopped.</span></div>
      <div class="row row--between row--wrap" style="margin-bottom:14px;gap:10px">
        <div class="tabs" role="tablist" style="border:0">${[['all', 'All'], ['active', 'Active'], ['failed', 'Needs attention'], ['done', 'Done']].map(([k, l]) => `<a role="tab" href="#/uploads?f=${k}" aria-selected="${f === k}">${l} <span class="count">${c(k)}</span></a>`).join('')}</div>
        <label class="switch"><input type="checkbox" data-sim${V3.store.get('sim-suspend', true) ? ' checked' : ''}><span class="switch__track"></span><span style="font-size:13px">Simulate Safari suspension on next upload</span></label>
      </div>
      <div data-list>${list.length ? list.map((u) => A.uploadRow(u)).join('') : `<div class="card card--flat">${A.empty('cloud-upload', 'Nothing here', 'Uploads appear the moment you finish recording.', `<a class="btn btn--sm" href="#/record">Record a clip</a>`)}</div>`}</div>
      <p class="mono faint" style="margin-top:16px;text-transform:none;letter-spacing:.02em">Server reconciles completion from Stream webhooks — the browser never declares “uploaded” on its own.</p>`,
      mount(v) {
        A.bindUploadActions(v);
        $('[data-sim]', v).addEventListener('change', (e) => { V3.store.set('sim-suspend', e.target.checked); V3.toast(e.target.checked ? 'Next upload will be interrupted at ~38%' : 'Interruption simulation off', { icon: 'flask-conical' }); });
      }
    };
  };

  /* More (mobile hub) ------------------------------------------------------ */
  R['more'] = () => ({
    title: 'More', nav: 'more',
    html: `${A.vh('', 'Everything else', '')}<div class="g g-2">${V3.app.cfg.nav.map((g) => `<div class="card"><div class="side__label" style="padding:12px 14px 4px">${esc(g.group || 'Workspace')}</div><div class="list" style="padding:0 8px 6px">${g.items.map((it) => `<a class="lrow" href="#/${it.id}"><span class="lrow__ico">${icon(it.icon)}</span><span class="lrow__t"><b>${esc(it.label)}</b></span>${it.count && it.count() ? `<span class="pill pill--mono">${it.count()}</span>` : ''}${icon('chevron-right')}</a>`).join('')}</div></div>`).join('')}
      <div class="card"><div class="list" style="padding:6px 8px"><button class="lrow" type="button" data-theme-toggle-row><span class="lrow__ico">${icon('contrast')}</span><span class="lrow__t"><b>Toggle dark mode</b></span></button><a class="lrow" href="/v3/portal/index.html"><span class="lrow__ico">${icon('paw-print')}</span><span class="lrow__t"><b>View client portal</b><small>As Sarah Thompson</small></span></a><a class="lrow" href="/v3/index.html"><span class="lrow__ico">${icon('globe')}</span><span class="lrow__t"><b>Public site</b></span></a></div></div></div>`,
    mount(v) { $('[data-theme-toggle-row]', v).addEventListener('click', () => { V3.theme.toggle(); V3.app.refreshChrome(); $$('[data-theme-toggle]').forEach((b) => { b.innerHTML = icon(V3.theme.get() === 'dark' ? 'sun-medium' : 'moon'); }); V3.icons(); }); }
  });
})();
