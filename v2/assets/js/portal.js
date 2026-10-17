/* =========================================================
   PAWS & PLAY — Client portal SPA (signed in as Sarah Thompson)
   ========================================================= */
(function () {
  'use strict';
  const P = window.PAWS, L = window.LINDA, APP = window.APP, $ = P.$, $$ = P.$$;
  const G = typeof window.gsap !== 'undefined';
  const me = L.user(L.currentClient);

  /* ---------- version-local mock: Sarah also belongs to her parents' household ---------- */
  if (!L.household('h-morrison')) {
    L.households.push({ id: 'h-morrison', name: 'Morrison household', suburb: 'Point Chevalier', status: 'active', primary: 'u-joan', members: ['u-joan', 'u-sarah'], dogs: ['d-tui'], since: '2026-04-02' });
    L.users.push({ id: 'u-joan', name: 'Joan Morrison', role: 'client', email: 'joan.m@example.co.nz', household: 'h-morrison', permission: 'owner', invite: 'accepted' });
    L.dogs.push({ id: 'd-tui', name: 'Tui', breed: 'Border Collie', age: '6 yrs', dob: '2020-05-01', sex: 'F', household: 'h-morrison', status: 'Maintenance', clip: 50688, photo: L.img(50688, 40), cover: L.img(50688, 65), avatar: L.thumb(50688, 40), goals: ['Gentle play with visitors'], notes: 'Calm older girl. Loves her ball a little too much.', progress: 88, techniques: ['t-settle', 't-impulse'] });
    L.sessions.push({ id: 's-090', date: '2026-09-28T09:30', location: 'Morrison home', household: 'h-morrison', dogs: ['d-tui'], status: 'completed', title: 'Toy settle & polite play', notes: 'Tui settled with her ball between paws while visitors arrived.', homework: ['Ball “settle” before every throw ×5'], media: ['m-0901'] });
    L.media.push({ id: 'm-0901', clip: 50688, title: 'Ball settle before the throw', dogs: ['d-tui'], session: 's-090', source: 'pwa_camera', processing: 'ready', editorial: 'approved_shared', duration: '0:38', created: '2026-09-28T09:44', techniques: ['t-settle', 't-impulse'], visibility: 'household', views: 2, notes: 'Wait for the down, then the throw is the reward.', timestamps: [{ t: '0:09', label: 'Down with ball' }, { t: '0:24', label: 'Release & throw' }], ai: { transcript: '“Settle.” … “Good… okay, get it!”' } });
  }
  const MEMBERSHIPS = [{ hh: 'h-thompson', role: 'owner' }, { hh: 'h-morrison', role: 'member' }];

  /* ---------- state ---------- */
  const S = P.store.get('portal', { hh: 'h-thompson', hw: {}, prefs: { newVideo: true, homework: true, weekly: false, whatsapp: true }, invites: [] });
  const save = () => P.store.set('portal', S);
  const hh = () => L.household(S.hh);
  const hhDogs = () => L.dogsFor(S.hh);
  const VISIBLE = ['approved_shared', 'published_public'];
  const canSee = (m) => m && VISIBLE.includes(m.editorial) && m.processing === 'ready' && m.dogs.some((d) => L.dog(d) && L.dog(d).household === S.hh);
  const visibleMedia = (dogId) => L.media.filter((m) => canSee(m) && (!dogId || m.dogs.includes(dogId))).sort((a, b) => b.created.localeCompare(a.created));
  const hiddenMediaCount = (sess) => sess.media.map(L.mediaItem).filter((m) => m && !canSee(m)).length;
  const hhSessions = () => L.sessions.filter((s) => s.household === S.hh).sort((a, b) => b.date.localeCompare(a.date));
  const guideFor = (techId) => L.guides.find((g) => g.technique === techId && g.status === 'published');
  const guideHref = (g) => (g.slug === 'recall-101' ? '/v2/guide/recall-101.html' : `/v2/academy.html#${g.slug}`);
  const linda = `<span class="avatar avatar--sm" style="background:var(--tomato)">L</span>`;

  function homeworkItems() {
    const items = [];
    hhSessions().filter((s) => s.status === 'completed').forEach((s) => s.homework.forEach((h, i) => items.push({ id: s.id + ':' + i, text: h, src: L.fmtDate(s.date) + ' · ' + s.title, dog: s.dogs[0] })));
    const dogTech = new Set(hhDogs().flatMap((d) => d.techniques));
    L.guides.filter((g) => g.status === 'published' && g.homework && dogTech.has(g.technique)).forEach((g) => g.homework.forEach((h, i) => items.push({ id: g.id + ':' + i, text: h, src: 'Guide · ' + g.title, guide: g })));
    return items;
  }
  function updateHwBadges() {
    const items = homeworkItems(); const left = items.filter((i) => !S.hw[i.id]).length;
    $$('[data-hw-count]').forEach((b) => { b.textContent = left; b.hidden = !left; });
  }

  function mediaTile(m) {
    const d = L.dog(m.dogs[0]);
    return `<a class="mtile" href="#/video/${m.id}" data-peek-tile>
      <div class="mt-media"><img src="${L.thumb(m.clip, 40)}" alt="" loading="lazy"><video muted playsinline loop preload="none" data-src="/shared/media/video/${m.clip}.mp4" aria-hidden="true"></video>
        <div class="mt-tl">${m.editorial === 'published_public' ? `<span class="pill pill--lilac">${P.ic('globe')}Public guide</span>` : `<span class="pill pill--grass">${P.ic('house')}Household</span>`}</div>
        <span class="mt-dur">${m.duration}</span><span class="mt-play"><svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg></span></div>
      <div class="mt-body"><h3 class="mt-title">${P.esc(m.title)}</h3><div class="mt-meta"><span>${L.fmtDate(m.created)}</span><span>· ${P.esc(d.name)}</span></div>
        <div class="chips" style="margin-top:8px;gap:6px">${m.techniques.map(P.techTag).join('')}</div></div></a>`;
  }
  function bindPeek(root) {
    $$('[data-peek-tile]', root).forEach((t) => {
      const v = t.querySelector('video'); if (!v) return;
      t.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'mouse') return; if (!v.getAttribute('src')) v.src = v.dataset.src; t.classList.add('is-peek'); const p = v.play(); if (p && p.catch) p.catch(() => {}); });
      t.addEventListener('pointerleave', () => { t.classList.remove('is-peek'); v.pause(); });
    });
  }

  /* ================= VIEWS ================= */
  const V = {};

  V.dogs = () => {
    const dogs = hhDogs(); const vids = visibleMedia().slice(0, 4);
    const upcoming = hhSessions().filter((s) => s.status === 'scheduled').sort((a, b) => a.date.localeCompare(b.date))[0];
    const withLinda = hhSessions().reduce((n, s) => n + hiddenMediaCount(s), 0);
    const items = homeworkItems(); const done = items.filter((i) => S.hw[i.id]).length; const pct = items.length ? Math.round(done / items.length * 100) : 0;
    return {
      title: 'My Dogs', short: 'My Dogs',
      html: `
      <div class="hello"><div><span class="eyebrow"><span class="dot">${P.ic('house')}</span>${P.esc(hh().name)}</span><h1>Kia ora, ${P.esc(me.name.split(' ')[0])} <span class="wave" aria-hidden="true">👋</span></h1></div>
        <a class="btn btn--sun" href="#/homework">${P.ic('list-checks')}Homework · ${pct}%</a></div>
      <div class="dog-grid">${dogs.map((d) => {
        const last = L.sessionsFor(d.id).filter((s) => s.status === 'completed').sort((a, b) => b.date.localeCompare(a.date))[0];
        return `<a class="dogcard" href="#/dog/${d.id}">
          <div class="dc-cover"><img src="${d.cover}" alt=""></div>
          <div class="dc-body">
            <div class="dc-id">${APP.avatar(d.name, d.avatar)}<div><h2>${P.esc(d.name)}</h2><small>${P.esc(d.breed)} · ${d.age}</small></div><span class="ring-sm" style="--v:${d.progress}"><b>${d.progress}%</b></span></div>
            <div class="chips" style="gap:6px"><span class="pill pill--sun">${P.esc(d.status)}</span>${d.goals.map((g) => `<span class="pill">${P.ic('target')}${P.esc(g)}</span>`).join('')}</div>
            ${last ? `<div class="dc-latest"><span class="ico">${P.ic('calendar-check')}</span><div><small>Latest session · ${L.fmtDate(last.date)}</small><b>${P.esc(last.title)}</b></div></div>` : ''}
            <span class="btn btn--ink" style="justify-self:start">Open ${P.esc(d.name)}’s timeline${P.ic('arrow-right')}</span>
          </div></a>`;
      }).join('')}</div>
      ${withLinda ? `<div class="privacy-note" style="margin-top:24px"><span class="ico">${P.ic('lock')}</span><p>${withLinda} more clip${withLinda > 1 ? 's are' : ' is'} with Linda for review. Videos only appear here once she approves them for your household.</p></div>` : ''}
      <div class="section-title"><h2>Latest from Linda</h2><a class="link-arrow small" href="#/sessions">All sessions${P.ic('arrow-right')}</a></div>
      ${vids.length ? `<div class="mgrid">${vids.map(mediaTile).join('')}</div>` : `<div class="empty"><div class="em-ico">${P.ic('video-off')}</div><h3>No videos yet</h3><p>Once Linda approves a clip for your household, it’ll pop up here.</p></div>`}
      <div class="bento" style="margin-top:28px">
        ${upcoming ? `<div class="card c-6" style="background:var(--sky)"><span class="pill pill--ink">${P.ic('calendar-clock')}Next session</span><h3 style="margin:12px 0 4px;font-size:var(--fs-xl)">${P.esc(upcoming.title)}</h3><p style="margin:0;font-weight:600">${APP.when(upcoming.date)} · ${P.esc(upcoming.location)}</p></div>` : ''}
        <a class="card card--hover c-6" href="#/coming-soon" style="background:var(--blush);text-decoration:none"><span class="pill pill--sun">${P.ic('sparkles')}Coming soon</span><h3 style="margin:12px 0 4px;font-size:var(--fs-xl)">${P.esc(dogs[0].name)}’s public profile</h3><p style="margin:0;font-weight:600">Show off the good stuff — training stays private. Peek at a preview →</p></a>
      </div>`,
      mount(el) { bindPeek(el); APP.popIn(el, '.dogcard, .mtile, .card'); if (G && !P.reduced) $$('.ring-sm', el).forEach((r) => { const v = +r.style.getPropertyValue('--v'); const o = { v: 0 }; gsap.to(o, { v, duration: .6, ease: 'power3.out', onUpdate: () => r.style.setProperty('--v', o.v) }); }); }
    };
  };

  V.dog = ({ params, query }) => {
    const d = L.dog(params.id);
    if (!d || d.household !== S.hh) return lockedView('This dog isn’t in your household', 'You can only see dogs in households you’ve been invited to. Switch household from the top bar if you belong to more than one.');
    const tech = query.t || 'all';
    const sessions = L.sessionsFor(d.id).sort((a, b) => b.date.localeCompare(a.date));
    const shown = sessions.filter((s) => tech === 'all' || s.media.map(L.mediaItem).some((m) => m && canSee(m) && m.techniques.includes(tech)));
    const all = visibleMedia(d.id);
    return {
      title: d.name, short: d.name,
      html: `<a class="back-link" href="#/dogs">${P.ic('arrow-left')}My Dogs</a>
      <section class="dog-hero">
        ${APP.avatar(d.name, d.avatar)}
        <div><h1>${P.esc(d.name)}</h1><div class="facts"><span class="pill pill--lg">${P.esc(d.breed)}</span><span class="pill pill--lg">${d.age}</span><span class="pill pill--lg pill--ink">${P.esc(d.status)}</span></div></div>
        <div class="ring-wrap"><span class="ring-sm" style="--v:${d.progress}"><b>${d.progress}%</b></span><span class="small" style="font-weight:800;display:block;text-align:center;margin-top:6px">Progress</span></div>
        <span class="paw-deco">${P.svg.paw()}</span>
      </section>
      <div class="dog-cols">
        <div>
          <div class="chips chips--scroll" role="toolbar" aria-label="Filter by technique" style="margin-bottom:18px">
            <a class="chip" href="#/dog/${d.id}" aria-current="${tech === 'all'}">All sessions</a>
            ${d.techniques.map((t) => { const T = L.technique(t); return `<a class="chip" href="#/dog/${d.id}?t=${t}" aria-current="${tech === t}"><span class="swatch" style="background:${T.color}"></span>${P.esc(T.name)}</a>`; }).join('')}
          </div>
          <div class="timeline">${shown.map((s) => {
            const vis = s.media.map(L.mediaItem).filter((m) => m && canSee(m) && (tech === 'all' || m.techniques.includes(tech)));
            const hid = hiddenMediaCount(s); const future = s.status !== 'completed';
            return `<article class="tl-item ${future ? 'is-future' : ''}"><div class="card sess-card">
              <div class="row row--between row--wrap"><span class="pill ${future ? 'pill--sky' : 'pill--sun'}">${P.ic(future ? 'calendar-clock' : 'calendar-check')}${APP.when(s.date)}</span>${P.status(s.status)}</div>
              <h3>${P.esc(s.title)}</h3><p class="small muted" style="margin:0">${P.ic('map-pin', 'inline-ic')} ${P.esc(s.location)}</p>
              ${s.notes ? `<div class="trainer-note" style="margin-top:12px;font-size:var(--fs-md)"><div class="who">${linda}Linda’s notes</div>${P.esc(s.notes)}</div>` : ''}
              ${vis.length ? `<div class="sess-media">${vis.map(mediaTile).join('')}</div>` : ''}
              ${hid ? `<div class="hidden-note">${P.ic('lock')}${hid} clip${hid > 1 ? 's' : ''} from this session ${hid > 1 ? 'are' : 'is'} still with Linda for review</div>` : ''}
              ${s.homework.length ? `<div class="hw-mini"><b>Homework</b><ul>${s.homework.map((h) => `<li>${P.ic('paw-print')}${P.esc(h)}</li>`).join('')}</ul></div>` : ''}
            </div></article>`;
          }).join('') || `<div class="empty"><div class="em-ico">${P.ic('filter-x')}</div><h3>No sessions with that technique yet</h3><a class="btn btn--sm" href="#/dog/${d.id}">Show all</a></div>`}</div>
        </div>
        <aside style="display:grid;gap:18px">
          <div class="card card--sm" style="background:var(--sun-tint)"><h3 class="card-title" style="margin-bottom:10px">Goals</h3><ul style="list-style:none;display:grid;gap:8px">${d.goals.map((g) => `<li class="row" style="font-weight:700">${P.ic('target')}${P.esc(g)}</li>`).join('')}</ul></div>
          <div class="card card--sm"><h3 class="card-title" style="margin-bottom:10px">Linda’s notes on ${P.esc(d.name)}</h3><p style="margin:0">${P.esc(d.notes)}</p></div>
          <div class="card card--sm"><h3 class="card-title" style="margin-bottom:10px">Techniques</h3><div class="chips">${d.techniques.map(P.techTag).join('')}</div>
            <div class="list" style="margin-top:14px">${d.techniques.map(guideFor).filter(Boolean).map((g) => `<a class="lrow" href="${guideHref(g)}"><span class="thumb sq"><img src="${L.thumb(g.clip, 40)}" alt=""></span><span class="meta"><b>${P.esc(g.title)}</b><small>Guide · ${g.minutes} min</small></span>${P.ic('arrow-up-right', 'chev')}</a>`).join('')}</div></div>
          <div class="card card--sm"><h3 class="card-title" style="margin-bottom:6px">${all.length} approved video${all.length === 1 ? '' : 's'}</h3><p class="small muted" style="margin:0">Only clips Linda has approved for your household show here.</p></div>
        </aside>
      </div>`,
      mount(el) { bindPeek(el); APP.popIn(el, '.tl-item, aside .card'); }
    };
  };

  V.video = ({ params }) => {
    const m = L.mediaItem(params.id);
    if (!m || !canSee(m)) return lockedView('This video is private', 'Every recording starts private to Linda. It’ll appear here once she approves it for your household — a link on its own never grants access.');
    const d = L.dog(m.dogs[0]); const s = L.session(m.session);
    const guides = m.techniques.map(guideFor).filter(Boolean);
    return {
      title: m.title, short: 'Video',
      html: `<a class="back-link" href="#/dog/${d.id}">${P.ic('arrow-left')}${P.esc(d.name)}’s timeline</a>
      <div class="vid-layout">
        <div>
          <div data-player></div>
          <h1 class="vid-title">${P.esc(m.title)}</h1>
          <div class="row row--wrap" style="margin-bottom:18px"><span class="pill pill--lg">${P.ic('calendar')}${L.fmtDate(m.created, { day: 'numeric', month: 'long', year: 'numeric' })}</span><span class="pill pill--lg">${P.ic('dog')}${P.esc(d.name)}</span>${s ? `<span class="pill pill--lg">${P.ic('map-pin')}${P.esc(s.location)}</span>` : ''}${m.editorial === 'published_public' ? `<span class="pill pill--lg pill--lilac">${P.ic('globe')}Also in a public guide</span>` : `<span class="pill pill--lg pill--grass">${P.ic('lock')}Household only</span>`}</div>
          ${m.notes ? `<div class="trainer-note"><div class="who">${linda}Linda’s note</div>${P.esc(m.notes)}</div>` : ''}
          ${m.ai && m.ai.transcript ? `<div class="section-title"><h2>Transcript</h2><span class="pill pill--soft">${P.ic('captions')}Reviewed by Linda</span></div><div class="transcript">${P.esc(m.ai.transcript)}</div>` : `<p class="small muted" style="margin-top:18px">${P.ic('captions-off', 'inline-ic')} No speech in this clip, so there’s no transcript.</p>`}
        </div>
        <aside style="display:grid;gap:18px">
          <div class="card card--sm"><h2 class="card-title" style="margin-bottom:12px">Jump to the good bits</h2>
            ${m.timestamps.length ? `<div class="tstamps">${m.timestamps.map((t) => `<button class="tstamp" type="button" data-seek="${t.t}"><span class="tt">${t.t}</span>${P.esc(t.label)}</button>`).join('')}</div>` : '<p class="small muted" style="margin:0">No timestamps on this one.</p>'}</div>
          <div class="card card--sm"><h2 class="card-title" style="margin-bottom:12px">Techniques</h2><div class="chips">${m.techniques.map(P.techTag).join('')}</div>
            ${guides.length ? `<div class="list" style="margin-top:14px">${guides.map((g) => `<a class="lrow" href="${guideHref(g)}"><span class="thumb sq"><img src="${L.thumb(g.clip, 40)}" alt=""></span><span class="meta"><b>${P.esc(g.title)}</b><small>Related guide · ${g.minutes} min</small></span>${P.ic('arrow-up-right', 'chev')}</a>`).join('')}</div>` : ''}</div>
          ${s ? `<a class="card card--sm card--hover" href="#/dog/${d.id}" style="text-decoration:none;background:var(--sun-tint)"><span class="pill">${P.ic('calendar-check')}From the session</span><h3 class="card-title" style="margin:10px 0 4px">${P.esc(s.title)}</h3><p class="small" style="margin:0">${APP.when(s.date)}</p></a>` : ''}
          <div class="card card--sm card--flat" style="background:var(--lilac-tint)"><p class="small" style="margin:0;font-weight:600">${P.ic('shield-check', 'inline-ic')} Only invited members of ${P.esc(hh().name)} can play this video. Playback links expire after a short time.</p></div>
        </aside>
      </div>`,
      mount(el) {
        const player = P.player($('[data-player]', el), { src: `/shared/media/video/${m.clip}.mp4`, poster: L.img(m.clip, 40), nominal: P.toSec(m.duration), marks: m.timestamps, captions: m.timestamps.map((t) => ({ t: t.t, text: t.label })),
          onTime: (cur) => $$('[data-seek]', el).forEach((b) => b.classList.toggle('is-now', Math.abs(P.toSec(b.dataset.seek) - cur) < 2.5)) });
        el.addEventListener('click', (e) => { const b = e.target.closest('[data-seek]'); if (b) { player.seek(b.dataset.seek); P.toast(`Jumped to ${b.dataset.seek}`, { icon: 'skip-forward', ms: 1600 }); } });
        APP.popIn(el, 'aside .card');
      }
    };
  };

  V.sessions = ({ query }) => {
    const dog = query.dog || 'all', tech = query.t || 'all', when = query.w || 'all';
    let list = hhSessions();
    if (dog !== 'all') list = list.filter((s) => s.dogs.includes(dog));
    if (tech !== 'all') list = list.filter((s) => s.media.map(L.mediaItem).some((m) => m && canSee(m) && m.techniques.includes(tech)));
    if (when === 'upcoming') list = list.filter((s) => s.status !== 'completed'); if (when === 'past') list = list.filter((s) => s.status === 'completed');
    const q = (k, v) => { const o = { dog, t: tech, w: when, [k]: v }; return '#/sessions?' + Object.keys(o).map((x) => x + '=' + o[x]).join('&'); };
    return {
      title: 'Sessions', short: 'Sessions',
      html: `<div class="vhead"><div><span class="eyebrow"><span class="dot">${P.ic('calendar-days')}</span>${P.esc(hh().name)}</span><h1>Training sessions</h1><p class="sub">Every session with Linda — filter by dog, technique or date.</p></div></div>
        <div class="fbar">
          <label><span class="sr-only">Dog</span><select class="select" data-f="dog"><option value="all">All dogs</option>${hhDogs().map((d) => `<option value="${d.id}" ${dog === d.id ? 'selected' : ''}>${P.esc(d.name)}</option>`).join('')}</select></label>
          <label><span class="sr-only">Technique</span><select class="select" data-f="t"><option value="all">All techniques</option>${L.techniques.map((t) => `<option value="${t.id}" ${tech === t.id ? 'selected' : ''}>${P.esc(t.name)}</option>`).join('')}</select></label>
          <div class="seg" role="group" aria-label="When">${[['all', 'All'], ['upcoming', 'Upcoming'], ['past', 'Past']].map(([v, l]) => `<button type="button" aria-pressed="${when === v}" data-w="${v}">${l}</button>`).join('')}</div>
        </div>
        <div class="list">${list.map((s) => { const vis = s.media.map(L.mediaItem).filter((m) => m && canSee(m)); const d = L.dog(s.dogs[0]); return `<a class="lrow" href="#/dog/${d.id}"><span class="thumb">${vis[0] ? `<img src="${L.thumb(vis[0].clip, 40)}" alt="">` : `<img src="${d.avatar}" alt="">`}</span><span class="meta"><b>${P.esc(s.title)}</b><small>${APP.when(s.date)} · ${P.esc(s.dogs.map((x) => L.dog(x).name).join(' & '))} · ${vis.length} video${vis.length === 1 ? '' : 's'}</small></span><span class="end">${P.status(s.status)}${P.ic('chevron-right', 'chev')}</span></a>`; }).join('') || `<div class="empty"><div class="em-ico">${P.ic('calendar-x')}</div><h3>No sessions match</h3><p>Try a different filter.</p><a class="btn btn--sm" href="#/sessions">Clear filters</a></div>`}</div>`,
      mount(el) {
        $$('[data-f]', el).forEach((s) => s.addEventListener('change', () => (location.hash = q(s.dataset.f, s.value))));
        $$('[data-w]', el).forEach((b) => b.addEventListener('click', () => (location.hash = q('w', b.dataset.w))));
        APP.popIn(el, '.lrow');
      }
    };
  };

  V.homework = () => {
    const items = homeworkItems(); const done = items.filter((i) => S.hw[i.id]).length; const pct = items.length ? Math.round(done / items.length * 100) : 0;
    const groups = {}; items.forEach((i) => { (groups[i.src] = groups[i.src] || []).push(i); });
    return {
      title: 'Homework', short: 'Homework',
      html: `<div class="vhead"><div><span class="eyebrow"><span class="dot">${P.ic('list-checks')}</span>Little and often</span><h1>Homework</h1></div></div>
        <section class="hw-hero"><span class="ring-sm" style="--v:${pct}" data-ring><b data-ring-v>${pct}%</b></span><div><h2>${done} of ${items.length} done</h2><p style="margin:6px 0 0;font-weight:600">${pct === 100 ? 'Everything ticked — legend! 🐾' : 'Short, happy reps beat one long slog. Tick things off as you go.'}</p></div></section>
        <p class="swipe-hint">${P.ic('hand')}Swipe a card right to tick it off</p>
        ${Object.keys(groups).map((src) => `<div class="section-title"><h2 style="font-size:1.1rem">${P.esc(src)}</h2></div><div class="list">${groups[src].map((i) => `
          <div class="swipe hw-item ${S.hw[i.id] ? 'is-done' : ''}" data-hwrow="${i.id}"><div class="sw-under"><span class="l">${P.ic('check-circle-2')}Done!</span><span class="l">${P.ic('rotate-ccw')}Undo</span></div>
            <div class="sw-top"><label class="check"><input type="checkbox" data-hw="${i.id}" ${S.hw[i.id] ? 'checked' : ''}><span class="box">${P.ic('check')}</span><span class="txt strike">${P.esc(i.text)}${i.dog ? `<span class="src">${P.esc(L.dog(i.dog).name)}</span>` : ''}</span></label>${i.guide ? `<a class="btn btn--sm btn--outline" href="${guideHref(i.guide)}">Guide</a>` : ''}</div></div>`).join('')}</div>`).join('') || `<div class="empty"><div class="em-ico">${P.ic('party-popper')}</div><h3>No homework yet</h3><p>Linda adds exercises after each session.</p></div>`}`,
      mount(el) {
        function set(id, v, row) {
          S.hw[id] = v; save(); updateHwBadges();
          const box = $(`[data-hw="${CSS.escape(id)}"]`, el); if (box) box.checked = v;
          (row || $(`[data-hwrow="${CSS.escape(id)}"]`, el)).classList.toggle('is-done', v);
          const items2 = homeworkItems(); const d2 = items2.filter((i) => S.hw[i.id]).length; const p2 = Math.round(d2 / items2.length * 100);
          $('[data-ring-v]', el).textContent = p2 + '%'; $('[data-ring]', el).style.setProperty('--v', p2);
          $('.hw-hero h2', el).textContent = `${d2} of ${items2.length} done`;
          if (v && p2 === 100) { const r = $('[data-ring]', el).getBoundingClientRect(); P.confetti(r.left + r.width / 2, r.top + r.height / 2, 40); P.toast('All homework done — what a team!', { tone: 'ok', icon: 'party-popper' }); }
          else if (v) P.toast('Ticked! Good human.', { tone: 'ok', icon: 'check', ms: 1400 });
        }
        $$('[data-hw]', el).forEach((b) => b.addEventListener('change', () => set(b.dataset.hw, b.checked)));
        $$('.swipe', el).forEach((row) => APP.swipe(row, { onRight: (r) => { set(r.dataset.hwrow, !S.hw[r.dataset.hwrow], r); const top = $('.sw-top', r); if (G) gsap.fromTo(top, { x: -40, rotate: 0 }, { x: 0, duration: .7, ease: 'elastic.out(1,.5)', clearProps: 'transform' }); } }));
        APP.popIn(el, '.swipe');
      }
    };
  };

  V.library = () => {
    const tech = new Set(hhDogs().flatMap((d) => d.techniques));
    const pub = L.guides.filter((g) => g.status === 'published');
    const assigned = pub.filter((g) => tech.has(g.technique)); const more = pub.filter((g) => !tech.has(g.technique));
    const card = (g, a) => { const t = L.technique(g.technique); return `<a class="mtile" href="${guideHref(g)}"><div class="mt-media"><img src="${L.thumb(g.clip, 40)}" alt="" loading="lazy"><div class="mt-tl">${a ? `<span class="pill pill--sun">${P.ic('pin')}Assigned by Linda</span>` : ''}</div><span class="mt-dur">${g.minutes} min</span></div><div class="mt-body"><h3 class="mt-title">${P.esc(g.title)}</h3><p class="small muted" style="margin:0 0 8px">${P.esc(g.subtitle)}</p>${P.techTag(t.id)}</div></a>`; };
    return {
      title: 'Training Library', short: 'Library',
      html: `<div class="vhead"><div><span class="eyebrow"><span class="dot">${P.ic('book-open')}</span>Training Library</span><h1>Guides for your crew</h1><p class="sub">Linda assigns guides that match what you’re working on. They open in the public Academy.</p></div><a class="btn" href="/v2/academy.html">${P.ic('graduation-cap')}Whole Academy</a></div>
        <div class="section-title"><h2>Assigned for ${P.esc(hhDogs().map((d) => d.name).join(' & '))}</h2></div>
        <div class="mgrid">${assigned.map((g) => card(g, true)).join('') || '<div class="empty"><h3>No assigned guides yet</h3></div>'}</div>
        <div class="section-title"><h2>Browse by technique</h2></div>
        <div class="chips">${L.techniques.map((t) => `<span class="tq" style="--c:${t.color}"><i></i>${P.esc(t.name)}${tech.has(t.id) ? ' ★' : ''}</span>`).join('')}</div>
        ${more.length ? `<div class="section-title"><h2>More from the Academy</h2></div><div class="mgrid">${more.map((g) => card(g, false)).join('')}</div>` : ''}`,
      mount(el) { APP.popIn(el, '.mtile'); }
    };
  };

  V.account = () => {
    const h = hh(); const mem = MEMBERSHIPS.find((x) => x.hh === S.hh);
    const members = h.members.map(L.user).filter(Boolean).concat(S.invites.filter((i) => i.hh === S.hh).map((i) => ({ id: i.id, name: i.email.split('@')[0], email: i.email, permission: 'member', invite: 'pending', local: true })));
    const cons = L.consents.filter((c) => c.subject.includes(me.name));
    return {
      title: 'Account', short: 'Account',
      html: `<div class="vhead"><div><span class="eyebrow"><span class="dot">${P.ic('user-round')}</span>Signed in as ${P.esc(me.email)}</span><h1>Account</h1></div><a class="btn btn--outline" href="/v2/login.html" data-signout>${P.ic('log-out')}Sign out</a></div>
      <div class="bento">
        <section class="card c-7"><div class="card-head"><h2>${P.esc(h.name)}</h2><span class="pill ${mem.role === 'owner' ? 'pill--sun' : ''}">You’re ${mem.role === 'owner' ? 'an owner' : 'a member'}</span></div>
          <div>${members.map((u) => `<div class="member">${APP.avatar(u.name)}<div class="meta"><b>${P.esc(u.name)}${u.id === me.id ? ' (you)' : ''}</b><small>${P.esc(u.email || '')}</small></div>${P.status(u.invite || 'accepted')}${u.permission === 'owner' ? '<span class="pill pill--ink">Owner</span>' : ''}${u.local ? `<button class="icon-btn icon-btn--plain" type="button" data-revoke="${u.id}" aria-label="Cancel invite">${P.ic('x')}</button>` : ''}</div>`).join('')}</div>
          <div class="row row--wrap" style="margin-top:14px">${mem.role === 'owner' ? `<button class="btn btn--primary" type="button" data-invite>${P.ic('user-plus')}Invite a household member</button>` : `<p class="small muted" style="margin:0">Only household owners can invite new members.</p>`}</div>
          <p class="small muted" style="margin:14px 0 0">Joining a household always needs an invitation — a matching phone number isn’t enough.</p></section>
        <section class="card c-5" style="background:var(--sun-tint)"><div class="card-head"><h2>Notifications</h2></div>
          ${[['newVideo', 'New video from Linda', 'Email me when a clip is shared with us'], ['homework', 'Homework reminders', 'A gentle nudge mid-week'], ['weekly', 'Weekly round-up', 'Sunday summary of our training'], ['whatsapp', 'WhatsApp links', 'Linda may send portal links from her own phone']].map(([k, t, d]) => `<div class="pref"><span><b>${t}</b><small>${d}</small></span><label class="switch"><input type="checkbox" data-pref="${k}" ${S.prefs[k] ? 'checked' : ''}><span class="track"></span><span class="sr-only">${t}</span></label></div>`).join('')}</section>
        <section class="card c-12" style="background:var(--lilac-tint)"><div class="card-head"><h2>Privacy &amp; consent</h2><span class="pill pill--lilac">${P.ic('shield-check')}Private by default</span></div>
          <div class="grid grid-3" style="gap:14px;margin-bottom:16px">
            <div class="card card--sm card--flat">${P.ic('lock')}<b style="display:block;margin-top:6px">Every video starts private</b><span class="small">Linda approves who can see each clip.</span></div>
            <div class="card card--sm card--flat">${P.ic('sparkles')}<b style="display:block;margin-top:6px">AI only drafts</b><span class="small">It never publishes or shares anything.</span></div>
            <div class="card card--sm card--flat">${P.ic('globe')}<b style="display:block;margin-top:6px">Public needs your consent</b><span class="small">Separately recorded, and you can withdraw it.</span></div>
          </div>
          <h3 style="font-size:1.1rem">Your consent records</h3>
          <div class="list">${cons.map((c) => `<div class="lrow"><span class="meta"><b>${P.esc(c.kind)}</b><small>${c.media ? 'For “' + P.esc((L.mediaItem(c.media) || {}).title || c.media) + '” · ' : ''}${P.esc(c.evidence)} · ${L.fmtDate(c.date, { day: 'numeric', month: 'short', year: 'numeric' })}</small></span><span class="end">${P.status(c.status)}${c.status === 'active' ? `<button class="btn btn--sm btn--outline" type="button" data-withdraw="${c.id}">Withdraw</button>` : ''}</span></div>`).join('') || '<p class="small muted">No consent records.</p>'}</div>
          <p class="small" style="margin:14px 0 0">Want a copy of your data, or something corrected or deleted? <a class="link" href="/v2/contact.html">Ask Linda</a>. <span class="ph">Privacy contact — to be supplied</span></p></section>
      </div>`,
      mount(el) {
        $$('[data-pref]', el).forEach((i) => i.addEventListener('change', () => { S.prefs[i.dataset.pref] = i.checked; save(); P.toast('Preference saved', { tone: 'ok', icon: 'bell', ms: 1400 }); }));
        const inv = $('[data-invite]', el);
        inv && inv.addEventListener('click', () => {
          P.modal({ title: 'Invite to ' + P.esc(hh().name), html: `<p class="muted">They’ll get an email with a time-limited invitation link. Once they sign in, they’ll see the dogs and videos shared with this household.</p>
            <div class="field"><label class="label" for="inv-name">Their name</label><input class="input" id="inv-name" placeholder="e.g. Mike"></div>
            <div class="field"><label class="label" for="inv-email">Their email</label><input class="input" id="inv-email" type="email" placeholder="name@example.co.nz"><span class="err">${P.ic('alert-circle')}Enter a valid email address</span></div>
            <div class="callout callout--info" style="margin-top:16px">${P.ic('info')}<div><strong>Adults only</strong><p>Each member signs in with their own email. You can cancel an invite anytime.</p></div></div>`,
            actions: [{ label: 'Cancel', cls: 'btn--outline' }, { label: 'Send invitation', cls: 'btn--primary', icon: 'send', onClick: (api) => {
              const e = $('#inv-email', api.el); const f = e.closest('.field');
              if (!/^\S+@\S+\.\S+$/.test(e.value)) { f.classList.add('is-error'); e.focus(); return false; }
              if (L.users.some((u) => u.email === e.value) || S.invites.some((i) => i.email === e.value)) { f.classList.add('is-error'); f.querySelector('.err').lastChild.textContent = 'That person is already invited or a member'; return false; }
              S.invites.push({ id: P.uid('inv'), email: e.value, hh: S.hh }); save();
              P.toast(`Invitation sent to ${P.esc(e.value)} (demo)`, { tone: 'ok', icon: 'mail-check' }); setTimeout(() => router.refresh(), 250);
            } }] });
        });
        $$('[data-revoke]', el).forEach((b) => b.addEventListener('click', () => { S.invites = S.invites.filter((i) => i.id !== b.dataset.revoke); save(); P.toast('Invite cancelled', { icon: 'user-x' }); router.refresh(); }));
        $$('[data-withdraw]', el).forEach((b) => b.addEventListener('click', () => P.confirm('Withdraw consent?', 'Linda will be notified and the public edition will be taken down promptly. Your private household copy stays.', 'Withdraw consent', () => { P.db.patch('consents', b.dataset.withdraw, { status: 'withdrawn', withdrawn: '2026-10-17' }); P.toast('Consent withdrawn — Linda has been notified', { tone: 'ok', icon: 'shield-check' }); router.refresh(); }, 'btn--primary')));
        $('[data-signout]', el).addEventListener('click', () => P.store.del('signedIn'));
        APP.popIn(el, '.card');
      }
    };
  };

  V.soon = () => {
    const d = hhDogs()[0]; const posts = L.community.filter((c) => c.dog === d.id).concat(L.community.filter((c) => c.dog !== d.id).slice(0, 2));
    return {
      title: d.name + '’s profile (preview)', short: 'Coming soon',
      html: `<div class="vhead"><div><span class="eyebrow"><span class="dot">${P.ic('sparkles')}</span>Phase 3 preview</span><h1>${P.esc(d.name)}’s public profile</h1><p class="sub">A sneak peek at owner-managed dog profiles. Nothing here is live — and your private training stays private.</p></div></div>
        <div class="profile-cover"><img src="${d.cover}" alt=""><span class="sticker sticker--sun cs-ribbon">Coming soon ✦</span></div>
        <div class="profile-head">${APP.avatar(d.name, d.avatar)}<div style="padding-bottom:6px"><h2 style="margin:0;font-size:var(--fs-3xl)">${P.esc(d.name)}</h2><span class="small" style="font-weight:700">${P.esc(d.breed)} · ${P.esc(hh().suburb)}</span></div>
          <div class="row" style="margin-left:auto;padding-bottom:6px"><button class="btn btn--sm" type="button" data-demo>${P.ic('pencil')}Edit profile</button><button class="btn btn--sm btn--primary" type="button" data-demo>${P.ic('user-plus')}Add friend</button></div></div>
        <div class="bento">
          <div class="c-8"><div class="grid grid-2">${posts.map((c) => { const pd = L.dog(c.dog); return `<article class="card card--tight"><div style="padding:12px 14px" class="row">${APP.avatar(pd.name, pd.avatar, 'avatar--sm')}<b>${P.esc(pd.name)}</b><span class="small muted" style="margin-left:auto">${c.when}</span></div><img src="${c.img.replace('/img/', '/thumb/')}" alt="" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-block:2px solid var(--ink)"><div style="padding:12px 14px"><p style="margin:0 0 8px;font-weight:600">${P.esc(c.post)}</p><div class="row small muted">${P.ic('heart')}${c.likes} ${P.ic('message-circle')}${c.comments}</div></div></article>`; }).join('')}</div></div>
          <aside class="c-4" style="display:grid;gap:18px;align-content:start">
            <div class="card card--sm" style="background:var(--grass-tint)"><h3 class="card-title" style="margin-bottom:8px">Milestones (optional)</h3><ul style="list-style:none;display:grid;gap:8px;font-weight:700"><li class="row">${P.ic('trophy')}First off-lead recall</li><li class="row">${P.ic('coffee')}Café settle: 10 minutes</li></ul></div>
            <div class="card card--sm"><h3 class="card-title" style="margin-bottom:8px">Who can see what</h3>${[['Photos & posts', 'Friends'], ['Milestones', 'Public'], ['Training videos & notes', 'Never shared']].map(([a, b]) => `<div class="pref"><b>${a}</b><span class="pill ${b === 'Never shared' ? 'pill--ink' : 'pill--sky'}">${b}</span></div>`).join('')}</div>
            <button class="btn btn--sun btn--lg" type="button" data-notify>${P.ic('bell-ring')}Notify me at launch</button>
          </aside>
        </div>`,
      mount(el) {
        $$('[data-demo]', el).forEach((b) => b.addEventListener('click', () => P.toast('Dog profiles are coming in Phase 3 — this is a preview', { icon: 'sparkles' })));
        $('[data-notify]', el).addEventListener('click', (e) => { const r = e.currentTarget.getBoundingClientRect(); P.confetti(r.left + r.width / 2, r.top, 24); P.toast('We’ll let you know!', { tone: 'ok', icon: 'bell-ring' }); });
        APP.popIn(el, '.card');
      }
    };
  };

  function lockedView(t, d) {
    return { title: 'Private', html: `<a class="back-link" href="#/dogs">${P.ic('arrow-left')}My Dogs</a><div class="locked"><div class="lk">${P.svg.padlockBone()}</div><h1 style="font-size:var(--fs-3xl)">${t}</h1><p class="lede" style="margin:0 auto 20px">${d}</p><a class="btn btn--ink" href="#/dogs">Back to My Dogs</a></div>`,
      mount(el) { if (G && !P.reduced) gsap.from($('.lk', el), { y: -60, rotate: -14, duration: 1, ease: 'bounce.out' }); } };
  }

  /* ================= SHELL ================= */
  $('[data-brand]').innerHTML = `${P.svg.logo()}<span><b>Linda's</b><small>Client portal</small></span>`;
  $('[data-side-user]').innerHTML = `${APP.avatar(me.name)}<span><b>${P.esc(me.name)}</b><small>${P.esc(me.email)}</small></span>`;
  function renderHH() {
    const h = hh(); const d = hhDogs()[0];
    $('[data-hh]').innerHTML = `${APP.avatar(h.name, d && d.avatar)}<span class="t"><small>Household</small><span>${P.esc(h.name)}</span></span>${P.ic('chevrons-up-down')}`;
    P.icons();
  }
  $('[data-hh]').addEventListener('click', (e) => {
    APP.popover(e.currentTarget, `<div class="small muted" style="padding:6px 10px;font-weight:800">Your households</div>${MEMBERSHIPS.map((m) => { const h = L.household(m.hh); const d = L.dogsFor(h.id)[0]; return `<button type="button" data-v="${h.id}" class="${h.id === S.hh ? 'is-sel' : ''}">${APP.avatar(h.name, d && d.avatar, 'avatar--sm')}<span><b style="display:block">${P.esc(h.name)}</b><small class="muted">${L.dogsFor(h.id).map((x) => x.name).join(', ')} · ${m.role}</small></span>${h.id === S.hh ? P.ic('check') : ''}</button>`; }).join('')}<hr><a href="#/account">${P.ic('settings-2')}Household settings</a>`,
      (v) => { if (v === S.hh) return; S.hh = v; save(); renderHH(); updateHwBadges(); P.toast(`Switched to ${P.esc(hh().name)}`, { icon: 'house' }); location.hash = '#/dogs'; router.refresh(); });
  });
  renderHH();

  const router = APP.router({
    el: $('#view'), fallback: '/dogs', appName: 'Linda’s Dog Training',
    routes: [
      { path: '/dogs', view: V.dogs, nav: 'dogs', title: 'My Dogs' },
      { path: '/dog/:id', view: V.dog, nav: 'dogs' },
      { path: '/video/:id', view: V.video, nav: 'dogs' },
      { path: '/sessions', view: V.sessions, nav: 'sessions', title: 'Sessions' },
      { path: '/homework', view: V.homework, nav: 'homework', title: 'Homework' },
      { path: '/library', view: V.library, nav: 'library', title: 'Library' },
      { path: '/account', view: V.account, nav: 'account', title: 'Account' },
      { path: '/coming-soon', view: V.soon, nav: 'soon', title: 'Coming soon' }
    ]
  });

  const pal = APP.palette(() => {
    const items = [];
    [['My Dogs', '/dogs', 'dog'], ['Sessions', '/sessions', 'calendar-days'], ['Homework', '/homework', 'list-checks'], ['Training Library', '/library', 'book-open'], ['Account', '/account', 'user-round'], ['Dog profile preview', '/coming-soon', 'sparkles']].forEach(([l, h, i]) => items.push({ group: 'Go to', label: l, icon: i, run: () => (location.hash = h) }));
    hhDogs().forEach((d) => items.push({ group: 'Dogs', label: d.name, sub: d.breed, img: d.avatar, run: () => (location.hash = '/dog/' + d.id) }));
    visibleMedia().forEach((m) => items.push({ group: 'Videos', label: m.title, sub: L.fmtDate(m.created) + ' · ' + m.techniques.map((t) => L.technique(t).name).join(', '), kw: (m.ai && m.ai.transcript) || '', img: L.thumb(m.clip, 40), run: () => (location.hash = '/video/' + m.id) }));
    hhSessions().forEach((s) => items.push({ group: 'Sessions', label: s.title, sub: APP.when(s.date), icon: 'calendar', run: () => (location.hash = '/dog/' + s.dogs[0]) }));
    L.guides.filter((g) => g.status === 'published').forEach((g) => items.push({ group: 'Guides', label: g.title, sub: g.subtitle, icon: 'book-open', run: () => P.go(guideHref(g)) }));
    MEMBERSHIPS.filter((m) => m.hh !== S.hh).forEach((m) => items.push({ group: 'Households', label: 'Switch to ' + L.household(m.hh).name, icon: 'repeat', run: () => { S.hh = m.hh; save(); renderHH(); location.hash = '/dogs'; router.refresh(); } }));
    return items;
  });
  $('[data-cmdk]').addEventListener('click', () => pal.open());

  P.icons();
  updateHwBadges();
  P.pageTransitions();
  router.resolve();
  if (!(function () { try { const k = 'v2:portalWelcomed'; const seen = sessionStorage.getItem(k); sessionStorage.setItem(k, '1'); return seen; } catch (e) { return true; } })()) { setTimeout(() => P.toast(`Signed in as ${P.esc(me.name)} — demo client`, { icon: 'key-round' }), 900); }
})();
