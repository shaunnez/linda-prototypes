/* ==========================================================================
   portal.js — client portal SPA (signed in as Sarah Thompson)
   Only approved_shared / published_public media are ever shown.
   ========================================================================== */
(function () {
  'use strict';
  const { $, $$, esc, icon, icons, toast, modal, confirm, store, player, ring, validate, sleep, parseT, ago } = window.UI;
  const A = window.App;
  const L = window.LINDA;
  const DB = window.DB;
  const ME = L.user(L.currentClient);
  const HHKEY = 'linda.v1.portal.hh';
  let HH = store.get(HHKEY, 'h-thompson');
  const myHouseholds = () => L.households.filter((h) => h.members.includes(ME.id));
  if (!myHouseholds().some((h) => h.id === HH)) HH = 'h-thompson';
  const hh = () => L.household(HH);
  const hhDogs = () => L.dogsFor(HH);
  const myPerm = (h) => (h.memberPerms && h.memberPerms[ME.id]) || (h.primary === ME.id ? 'owner' : 'member');

  /* ---------- privacy model ---------- */
  function canSee(m, hid = HH) {
    if (!A.isApproved(m)) return false;
    const h = L.household(hid);
    if (m.dogs.some((d) => h.dogs.includes(d))) return true;
    if (m.visibility === 'group') {
      const grp = m.group ? [L.groups.find((g) => g.id === m.group)] : L.shares.filter((s) => s.media.includes(m.id)).flatMap((s) => s.targets).map((t) => L.groups.find((g) => g.id === t)).filter(Boolean);
      return grp.some((g) => g && g.members.includes(hid));
    }
    return false;
  }
  const visibleMedia = () => L.media.filter((m) => canSee(m)).sort((a, b) => b.created.localeCompare(a.created));
  const pendingFor = (dogId) => L.media.filter((m) => m.dogs.includes(dogId) && !A.isApproved(m) && m.processing !== 'failed' && m.editorial !== 'archived').length;
  const sessionsForHH = () => L.sessions.filter((s) => s.household === HH).sort((a, b) => b.date.localeCompare(a.date));
  const guidesFor = (dogs) => { const ts = new Set(dogs.flatMap((d) => d.techniques)); return L.guides.filter((g) => g.status === 'published' && ts.has(g.technique)); };
  const guideHref = (g) => (g.slug === 'recall-101' ? '/v1/guide/recall-101.html' : '/v1/guide/index.html?g=' + g.slug);

  /* ---------- homework ---------- */
  function homeworkItems() {
    const items = [];
    sessionsForHH().filter((s) => s.status === 'completed').slice(0, 6).forEach((s) => {
      s.homework.forEach((h, i) => items.push({ key: `${s.id}.${i}`, text: h, src: `${s.dogs.map((d) => L.dog(d).name).join(' & ')} · ${s.title} · ${L.fmtDate(s.date)}`, session: s.id, dog: s.dogs[0] }));
    });
    guidesFor(hhDogs()).filter((g) => g.homework).forEach((g) => g.homework.forEach((h, i) => items.push({ key: `${g.id}.${i}`, text: h, src: `Guide · ${g.title}`, guide: g.id })));
    return items;
  }
  const hwDone = () => DB.kv('hw.' + HH) || [];
  const setHw = (arr) => DB.kv('hw.' + HH, arr);

  /* ---------- shell ---------- */
  const navItems = [
    { key: 'dogs', href: '#/dogs', icon: 'dog', label: 'My Dogs' },
    { key: 'sessions', href: '#/sessions', icon: 'calendar-days', label: 'Sessions & videos' },
    { key: 'homework', href: '#/homework', icon: 'list-checks', label: 'Homework' },
    { key: 'library', href: '#/library', icon: 'book-open', label: 'Training library' },
    { key: 'account', href: '#/account', icon: 'user-round', label: 'Account' }
  ];
  function hhSwitchHTML() {
    const h = hh();
    return `<button class="hh-switch" id="hh-switch" aria-haspopup="menu">${A.avatar({ id: h.id, name: h.name, role: 'client' }, 'avatar--sm')}<span class="grow"><b>${h.name}</b><small>${L.dogsFor(h.id).map((d) => d.name).join(', ')} · ${myHouseholds().length} households</small></span>${icon('chevrons-up-down')}</button>`;
  }
  A.shell({
    brandSub: 'Client<br>portal',
    brandHref: '#/dogs',
    sidebarTop: `<div id="hh-slot">${hhSwitchHTML()}</div>`,
    nav: [{ items: navItems }, { label: 'Coming soon', items: [{ key: 'profile', href: '#/profile/' + (hhDogs()[0] || {}).id, icon: 'sparkles', label: 'Public dog profile' }] }],
    sidebarFoot: `<div class="privacy-strip">${icon('shield-check')}<span>Only videos Linda has approved for your household appear here.</span></div>
      <div class="sb-user">${A.avatar(ME)}<div class="grow"><b>${ME.name}</b><small>${ME.email}</small></div><a class="icon-btn" href="/v1/login.html" aria-label="Sign out">${icon('log-out')}</a></div>`,
    topActions: `<button class="icon-btn" id="notif-btn" aria-label="Notifications">${icon('bell')}<span class="dot"></span></button><a href="#/account" aria-label="Account">${A.avatar(ME, 'avatar--sm')}</a>`,
    tabs: [
      { key: 'dogs', href: '#/dogs', icon: 'dog', label: 'Dogs' },
      { key: 'sessions', href: '#/sessions', icon: 'play-circle', label: 'Videos' },
      { key: 'homework', href: '#/homework', icon: 'list-checks', label: 'Homework' },
      { key: 'library', href: '#/library', icon: 'book-open', label: 'Library' },
      { key: 'account', href: '#/account', icon: 'user-round', label: 'Account' }
    ]
  });

  document.addEventListener('click', (e) => {
    const sw = e.target.closest('#hh-switch');
    if (sw) {
      A.popMenu(sw, myHouseholds().map((h) => ({ id: h.id, html: `${A.avatar({ id: h.id, name: h.name, role: 'client' }, 'avatar--sm')}<span class="grow"><b style="display:block">${h.name}</b><small class="faint">${L.dogsFor(h.id).map((d) => d.name).join(', ')} · ${myPerm(h)}</small></span>${h.id === HH ? icon('check') : ''}` })), (it) => {
        if (it.id === HH) return;
        HH = it.id; store.set(HHKEY, HH);
        $('#hh-slot').innerHTML = hhSwitchHTML();
        $('.sb-link[data-nav="profile"]').href = '#/profile/' + hhDogs()[0].id;
        icons();
        toast(`Switched to <b>${hh().name}</b>`, { icon: 'house' });
        R.go('#/dogs');
      });
    }
    if (e.target.closest('#notif-btn')) {
      const vm = visibleMedia();
      modal({ title: 'Notifications', eyebrow: 'Recent', body: `<div class="list">${vm.slice(0, 3).map((m) => `<a class="list-row" href="#/video/${m.id}" data-close><span class="list-row__thumb"><img src="${L.thumb(m.clip, 40)}" alt=""></span><span class="list-row__main"><span class="list-row__title">Linda shared “${esc(m.title)}”</span><span class="list-row__meta">${ago(m.created)}</span></span></a>`).join('')}<div class="list-row"><span class="list-row__icon">${icon('calendar')}</span><span class="list-row__main"><span class="list-row__title">Upcoming: ${(sessionsForHH().find((s) => s.status === 'scheduled') || { title: 'No session booked' }).title}</span><span class="list-row__meta">Session reminder</span></span></div></div>` });
    }
  });

  /* ---------- views ---------- */
  function dogsView() {
    const dogs = hhDogs();
    const h = hh();
    const vm = visibleMedia();
    const next = sessionsForHH().filter((s) => s.status === 'scheduled').sort((a, b) => a.date.localeCompare(b.date))[0];
    const items = homeworkItems(); const done = hwDone();
    const hour = 14;
    return {
      title: 'My Dogs', crumbs: [{ label: h.name }, { label: 'My Dogs' }],
      html: `
      ${A.pageHead({ eyebrow: `${h.name} · ${h.suburb}`, title: `Kia ora, <em>${ME.name.split(' ')[0]}.</em>`, sub: dogs.length ? `Here’s where ${dogs.map((d) => d.name).join(' & ')}’s training lives — every clip Linda has shared with your household.` : 'No dogs in this household yet.' })}
      <div class="g g-main">
        <div class="g">
          <div class="g ${dogs.length > 1 ? 'g-2' : ''}">
            ${dogs.map((d) => {
              const last = L.sessionsFor(d.id).filter((s) => s.status === 'completed').sort((a, b) => b.date.localeCompare(a.date))[0];
              const nv = vm.filter((m) => m.dogs.includes(d.id)).length;
              return `<a class="dogcard" href="#/dog/${d.id}" style="min-height:${dogs.length > 1 ? 440 : 520}px">
                <div class="dogcard__img"><img src="${d.photo}" alt="${d.name}, ${d.breed}"></div>
                <div class="dogcard__top"><span class="badge st-active badge--dotless" style="background:rgba(14,13,11,.6)">${d.status}</span>${ring(d.progress, { size: 64, stroke: 4 })}</div>
                <div class="dogcard__body">
                  <span class="dogcard__meta">${d.breed.toUpperCase()} · ${d.age.toUpperCase()}</span>
                  <span class="dogcard__name">${d.name}</span>
                  <div class="row row--wrap">${d.techniques.map(A.techTag).join('')}</div>
                  <div class="card card--glass" style="padding:14px 16px;display:flex;gap:14px;align-items:center;border-radius:16px">
                    ${icon('calendar-check')}
                    <span class="grow"><span class="mono faint text-xs">LATEST SESSION${last ? ' · ' + L.fmtDate(last.date).toUpperCase() : ''}</span><br><b class="text-sm">${last ? last.title : 'First session coming up'}</b></span>
                    <span class="badge st-ready">${nv} video${nv === 1 ? '' : 's'}</span>
                  </div>
                </div>
              </a>`;
            }).join('') || A.empty({ icon: 'dog', title: 'No dogs yet', text: 'Linda will add your dog after your first session.' })}
          </div>
          ${A.sectionTitle('Recently <em>shared</em>', `<a class="link-arrow text-sm" href="#/sessions">All videos ${icon('arrow-right')}</a>`)}
          ${vm.length ? `<div class="g g-auto">${vm.slice(0, 3).map((m) => A.mediaCard(m, { href: '#/video/' + m.id, state: false })).join('')}</div>` : A.empty({ icon: 'video', title: 'Nothing shared yet', text: 'When Linda approves a video for your household, it’ll appear here — and nowhere else.' })}
        </div>
        <div class="g sticky-col">
          ${next ? `<div class="card card--amber panel"><span class="eyebrow eyebrow--amber">Next session</span><p class="serif" style="font-size:2rem;line-height:1;margin:12px 0 6px">${next.title}</p><p class="muted text-sm">${UI.fmtDay(next.date)} · ${UI.fmtTime(next.date)}<br>${next.location}</p><button class="btn btn--sm mt-2" data-cal>${icon('calendar-plus')}Add to calendar</button></div>` : ''}
          <a class="card card--hover panel" href="#/homework" style="display:flex;gap:16px;align-items:center">${ring(items.length ? Math.round((done.length / items.length) * 100) : 0, { size: 72 })}<div><span class="eyebrow">Homework</span><p class="serif" style="font-size:1.7rem;line-height:1.05;margin-top:6px">${done.length} of ${items.length} done</p><p class="faint text-sm">Little and often wins.</p></div></a>
          <div class="card">
            <div class="card__head"><span class="card__title">${icon('book-open')}Assigned reading</span></div>
            <div class="list mt-1">${guidesFor(dogs).slice(0, 3).map((g) => `<a class="list-row" href="${guideHref(g)}"><span class="list-row__thumb"><img src="${g.hero.replace('/img/', '/thumb/')}" alt=""></span><span class="list-row__main"><span class="list-row__title">${g.title}</span><span class="list-row__meta">${L.technique(g.technique).name} · ${g.minutes} min</span></span>${icon('arrow-up-right', 'chev')}</a>`).join('') || '<p class="card__body muted text-sm">No guides assigned yet.</p>'}</div>
          </div>
          <div class="privacy-strip">${icon('lock')}<span>Videos here are visible only to invited members of ${h.name}. A WhatsApp link alone never unlocks them.</span></div>
        </div>
      </div>`,
      mount(root) { const c = $('[data-cal]', root); c && c.addEventListener('click', () => toast('Calendar file downloaded (demo).', { icon: 'calendar-check' })); }
    };
  }

  function dogView(p) {
    const d = L.dog(p.id);
    if (!d || d.household !== HH) return { title: 'Not available', html: lockedHTML('This dog isn’t in your household', 'You can only see dogs in households you’ve been invited to. Switch household from the menu if you belong to more than one.') };
    const tab = p.query.get('tab') || 'timeline';
    const tf = p.query.get('t') || 'all';
    const vm = visibleMedia().filter((m) => m.dogs.includes(d.id));
    const sess = L.sessionsFor(d.id).sort((a, b) => b.date.localeCompare(a.date));
    const pend = pendingFor(d.id);
    const tl = sess.map((s) => {
      const sv = vm.filter((m) => m.session === s.id && (tf === 'all' || m.techniques.includes(tf)));
      if (tf !== 'all' && !sv.length) return '';
      const future = s.status !== 'completed';
      return `<article class="tl-item ${future ? 'tl-item--future' : ''}">
        <div class="card panel">
          <div class="row row--between row--wrap"><span class="tl-date">${UI.fmtDay(s.date)} · ${UI.fmtTime(s.date)}</span>${A.badge(s.status)}</div>
          <h3 class="serif" style="font-size:1.9rem;line-height:1.05;margin:8px 0 4px">${s.title}</h3>
          <p class="faint text-sm">${icon('map-pin', 'chev')} ${s.location}</p>
          ${s.notes ? `<div class="note mt-2">${s.notes}<div class="note__by">${A.avatar(L.user('u-linda'), 'avatar--sm')} Linda’s session notes</div></div>` : future ? '<p class="muted text-sm mt-2">Notes and videos appear here after the session.</p>' : ''}
          ${sv.length ? `<div class="g g-auto-sm mt-2">${sv.map((m) => A.mediaCard(m, { href: '#/video/' + m.id, state: false })).join('')}</div>` : ''}
          ${s.homework.length ? `<div class="mt-2"><span class="eyebrow">Homework</span><ul style="margin-top:8px;display:grid;gap:6px">${s.homework.map((h) => `<li class="row text-sm" style="--gap:10px;align-items:flex-start">${icon('circle-dot', 'chev')}<span>${h}</span></li>`).join('')}</ul></div>` : ''}
        </div>
      </article>`;
    }).join('');
    const techChips = `<div class="hscroll mb-2"><a class="chip ${tf === 'all' ? 'is-active' : ''}" href="#/dog/${d.id}?tab=${tab}">All</a>${d.techniques.concat(vm.flatMap((m) => m.techniques)).filter((v, i, a) => a.indexOf(v) === i).map((t) => `<a class="chip ${tf === t ? 'is-active' : ''}" href="#/dog/${d.id}?tab=${tab}&t=${t}">${L.technique(t).name}</a>`).join('')}</div>`;
    const body = tab === 'videos'
      ? (vm.filter((m) => tf === 'all' || m.techniques.includes(tf)).length ? `<div class="g g-auto">${vm.filter((m) => tf === 'all' || m.techniques.includes(tf)).map((m) => A.mediaCard(m, { href: '#/video/' + m.id, state: false })).join('')}</div>` : A.empty({ icon: 'video-off', title: 'No videos yet', text: 'Linda hasn’t shared any videos with this technique yet.' }))
      : tab === 'notes'
        ? `<div class="g">${`<div class="card panel"><span class="eyebrow eyebrow--amber">About ${d.name}</span><p class="mt-2">${d.notes}</p></div>`}${sess.filter((s) => s.notes).map((s) => `<div class="card panel"><span class="tl-date">${UI.fmtDay(s.date)}</span><h3 class="serif" style="font-size:1.5rem;margin:6px 0 8px">${s.title}</h3><p class="muted">${s.notes}</p></div>`).join('')}</div>`
        : `<div class="timeline">${tl || A.empty({ icon: 'calendar', title: 'No sessions yet' })}</div>`;
    return {
      title: d.name, crumbs: [{ label: 'My Dogs', href: '#/dogs' }, { label: d.name }],
      html: `
      <section class="profile-cover vignette" style="height:clamp(260px,34vw,420px)"><img src="${d.cover}" alt=""></section>
      <div class="row row--wrap" style="margin-top:-120px;position:relative;z-index:2;padding:0 clamp(12px,2vw,28px);align-items:flex-end;--gap:20px">
        <span class="avatar avatar--xl" style="--size:112px;border:4px solid var(--ink)"><img src="${d.avatar}" alt=""></span>
        <div class="grow"><span class="mono text-xs" style="color:var(--bone-80)">${d.breed.toUpperCase()} · ${d.age.toUpperCase()} · ${d.status.toUpperCase()}</span><h1 class="serif" style="font-size:clamp(3.6rem,8vw,6.4rem);line-height:.85;letter-spacing:-.03em">${d.name}</h1></div>
        <a class="btn btn--sm" href="#/profile/${d.id}">${icon('sparkles')}Public profile — soon</a>
      </div>
      <div class="g g-4 mt-4">
        <div class="card stat" style="display:flex;gap:14px;align-items:center">${ring(d.progress, { size: 64 })}<div><span class="stat__label">Progress</span><span class="stat__sub">Linda’s estimate</span></div></div>
        ${A.stat({ label: 'Sessions', value: sess.filter((s) => s.status === 'completed').length, icon: 'calendar-days' })}
        ${A.stat({ label: 'Shared videos', value: vm.length, icon: 'play' })}
        ${A.stat({ label: 'Goals', value: d.goals.length, sub: d.goals.join(' · '), icon: 'flag' })}
      </div>
      ${pend ? `<div class="privacy-strip mt-2">${icon('hourglass')}<span><b style="color:var(--bone)">${pend} clip${pend > 1 ? 's' : ''}</b> from recent sessions ${pend > 1 ? 'are' : 'is'} still with Linda for review. They’ll appear here once she approves them for your household.</span></div>` : ''}
      <div class="tabs mt-3 mb-3" role="tablist">${[['timeline', 'Timeline', 'git-commit-vertical'], ['videos', 'Videos', 'play'], ['notes', 'Notes', 'notebook-pen']].map(([k, l, ic]) => `<a role="tab" aria-selected="${tab === k}" href="#/dog/${d.id}?tab=${k}">${icon(ic)}${l}</a>`).join('')}</div>
      ${tab !== 'notes' ? techChips : ''}
      ${body}`
    };
  }

  function lockedHTML(title, text, extra = '') {
    return `<div class="locked"><div class="locked__icon">${icon('lock-keyhole')}</div><h2>${title}</h2><p>${text}</p>${extra || `<a class="btn btn--primary" href="#/dogs">Back to My Dogs</a>`}</div>`;
  }

  function videoView(p) {
    const m = L.mediaItem(p.id);
    if (!m) return { title: 'Not found', html: lockedHTML('Video not found', 'This link may have expired or been removed.') };
    if (!canSee(m)) {
      const ours = m.dogs.some((d) => hhDogs().some((x) => x.id === d));
      return { title: 'Private video', crumbs: [{ label: 'My Dogs', href: '#/dogs' }, { label: 'Private video' }], html: lockedHTML(ours ? 'Linda hasn’t shared this one yet' : 'You don’t have access to this video', ours ? 'Every recording starts private. Linda reviews each clip and chooses who can watch — this one is still with her.' : 'This video belongs to another household. Having a link isn’t enough — only people Linda has invited can watch.', `<div class="row row--wrap" style="justify-content:center"><a class="btn btn--primary" href="#/dogs">Back to My Dogs</a><span class="badge st-draft">access checked · ${ours ? 'not approved' : 'no grant'}</span></div>`) };
    }
    const s = L.session(m.session);
    const dogs = m.dogs.map((id) => L.dog(id));
    const rel = L.guides.filter((g) => g.status === 'published' && m.techniques.includes(g.technique));
    const share = L.shares.find((x) => x.media.includes(m.id));
    const more = visibleMedia().filter((x) => x.id !== m.id).slice(0, 3);
    return {
      title: m.title, crumbs: [{ label: dogs[0].name, href: '#/dog/' + dogs[0].id }, { label: m.title }],
      html: `
      <div class="g g-main">
        <div class="g">
          <div id="player"></div>
          <div>
            <div class="row row--wrap" style="--gap:8px">${m.techniques.map(A.techTag).join('')}${m.editorial === 'published_public' ? A.badge('published_public', 'also public') : ''}</div>
            <h1 class="page-head__title" style="margin-top:14px">${esc(m.title)}</h1>
            <p class="muted mt-1">${dogs.map((d) => d.name).join(' & ')} · ${UI.fmtDay(m.created)} · ${s ? s.location : ''}</p>
          </div>
          ${m.notes ? `<div class="note">${esc(m.notes)}<div class="note__by">${A.avatar(L.user('u-linda'), 'avatar--sm')} Linda’s notes</div></div>` : ''}
          ${m.ai && m.ai.transcript ? `<div class="card panel"><div class="row row--between"><span class="eyebrow">Transcript</span><span class="badge badge--dotless">approved by Linda</span></div><p class="transcript mt-2">${m.ai.transcript}</p></div>` : `<div class="card panel"><span class="eyebrow">Transcript</span><p class="muted text-sm mt-1">No speech in this clip — nothing to transcribe.</p></div>`}
        </div>
        <aside class="g sticky-col">
          <div class="card">
            <div class="card__head"><span class="card__title">${icon('timer')}Key moments</span><span class="faint text-xs">Tap to jump</span></div>
            <div class="card__body"><div class="ts-list">${m.timestamps.length ? m.timestamps.map((t) => `<button class="ts-btn" data-seek="${t.t}"><b>${t.t}</b><span>${t.label}</span>${icon('play')}</button>`).join('') : '<p class="muted text-sm">No timestamps on this clip.</p>'}</div></div>
          </div>
          ${s ? `<a class="card card--hover panel" href="#/dog/${dogs[0].id}"><span class="eyebrow">From the session</span><p class="serif" style="font-size:1.6rem;line-height:1.05;margin:8px 0 4px">${s.title}</p><p class="faint text-sm">${UI.fmtDay(s.date)} · ${s.homework.length} homework tasks</p></a>` : ''}
          ${rel.length ? `<div class="card"><div class="card__head"><span class="card__title">${icon('book-open')}Related guides</span></div><div class="list mt-1">${rel.map((g) => `<a class="list-row" href="${guideHref(g)}"><span class="list-row__thumb"><img src="${g.hero.replace('/img/', '/thumb/')}" alt=""></span><span class="list-row__main"><span class="list-row__title">${g.title}</span><span class="list-row__meta">${g.subtitle}</span></span>${icon('arrow-up-right', 'chev')}</a>`).join('')}</div></div>` : ''}
          <div class="privacy-strip">${icon('shield-check')}<span>Shared with <b style="color:var(--bone)">${m.visibility === 'group' ? 'your training group' : hh().name}</b> by Linda${share ? ' on ' + L.fmtDate(share.created) : ''}. Playback links are short-lived and checked every time.</span></div>
        </aside>
      </div>
      ${more.length ? A.sectionTitle('More from your <em>household</em>') + `<div class="g g-auto">${more.map((x) => A.mediaCard(x, { href: '#/video/' + x.id, state: false })).join('')}</div>` : ''}`,
      mount(root) {
        const pl = player($('#player', root), { src: L.vid(m.clip), poster: L.img(m.clip, 40), duration: m.duration, markers: m.timestamps, label: m.title, onTime: (t) => {
          const btns = $$('[data-seek]', root);
          let act = -1; btns.forEach((b, i) => { if (t >= parseT(b.dataset.seek) - 0.3) act = i; });
          btns.forEach((b, i) => b.classList.toggle('is-active', i === act));
        } });
        root.addEventListener('click', (e) => { const b = e.target.closest('[data-seek]'); if (b) { pl.seek(parseT(b.dataset.seek)); if (window.innerWidth < 1100) $('#player').scrollIntoView({ behavior: 'smooth', block: 'center' }); } });
        return () => pl.pause();
      }
    };
  }

  function sessionsView(p) {
    const q = (p.query.get('q') || '').toLowerCase();
    const dogF = p.query.get('dog') || 'all';
    const tF = p.query.get('t') || 'all';
    const dogs = hhDogs();
    const vm = visibleMedia().filter((m) => (dogF === 'all' || m.dogs.includes(dogF)) && (tF === 'all' || m.techniques.includes(tF)) && (!q || (m.title + ' ' + m.notes).toLowerCase().includes(q)));
    const sess = sessionsForHH().filter((s) => dogF === 'all' || s.dogs.includes(dogF));
    const techs = [...new Set(visibleMedia().flatMap((m) => m.techniques))];
    return {
      title: 'Sessions & videos', crumbs: [{ label: hh().name }, { label: 'Sessions & videos' }],
      html: `
      ${A.pageHead({ eyebrow: 'Your training history', title: 'Sessions & <em>videos</em>', sub: 'Search and filter every video Linda has shared with your household.' })}
      <form class="filterbar" id="vf">
        <div class="input-icon">${icon('search')}<input class="input input--sm" name="q" type="search" placeholder="Search titles and notes" value="${esc(q)}" style="padding-left:40px" aria-label="Search videos"></div>
        <select class="select select--sm" name="dog" aria-label="Filter by dog"><option value="all">All dogs</option>${dogs.map((d) => `<option value="${d.id}" ${dogF === d.id ? 'selected' : ''}>${d.name}</option>`).join('')}</select>
        <select class="select select--sm" name="t" aria-label="Filter by technique"><option value="all">All techniques</option>${techs.map((t) => `<option value="${t}" ${tF === t ? 'selected' : ''}>${L.technique(t).name}</option>`).join('')}</select>
      </form>
      ${vm.length ? `<div class="g g-auto">${vm.map((m) => A.mediaCard(m, { href: '#/video/' + m.id, state: false })).join('')}</div>` : A.empty({ icon: 'search-x', title: 'No matching videos', text: 'Try a different filter — or ask Linda to share a clip from your last session.', action: '<a class="btn btn--sm" href="#/sessions">Clear filters</a>' })}
      ${A.sectionTitle('All <em>sessions</em>')}
      <div class="card"><div class="list">${sess.map((s) => `<a class="list-row" href="#/dog/${s.dogs[0]}"><span class="list-row__icon">${icon(s.status === 'scheduled' ? 'calendar-clock' : 'calendar-check')}</span><span class="list-row__main"><span class="list-row__title">${s.title}</span><span class="list-row__meta"><span class="mono">${UI.fmtDay(s.date).toUpperCase()}</span>${s.location}</span></span><span class="list-row__trail">${A.badge(s.status)}${icon('chevron-right', 'chev')}</span></a>`).join('') || '<p class="card__body muted">No sessions yet.</p>'}</div></div>`,
      mount(root) {
        const f = $('#vf', root);
        const apply = () => { const fd = new FormData(f); const qs = new URLSearchParams(); ['q', 'dog', 't'].forEach((k) => { const v = fd.get(k); if (v && v !== 'all') qs.set(k, v); }); history.replaceState(null, '', '#/sessions' + (qs.toString() ? '?' + qs : '')); R.render(); const i = $('#vf input'); if (i && document.activeElement !== i && fd.get('q')) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } };
        f.addEventListener('change', apply);
        let tmo; $('input', f).addEventListener('input', () => { clearTimeout(tmo); tmo = setTimeout(apply, 350); });
        f.addEventListener('submit', (e) => { e.preventDefault(); apply(); });
      }
    };
  }

  function homeworkView() {
    const items = homeworkItems();
    const draw = () => {
      const done = hwDone();
      const pct = items.length ? Math.round((done.length / items.length) * 100) : 0;
      const groups = {};
      items.forEach((it) => { (groups[it.src] = groups[it.src] || []).push(it); });
      const next = sessionsForHH().filter((s) => s.status === 'scheduled')[0];
      return `
        ${A.pageHead({ eyebrow: 'Between sessions', title: 'Home<em>work</em>', sub: next ? `Aim to finish before your next session — ${UI.fmtDay(next.date)}.` : 'Little and often beats one long session.', actions: `<button class="btn btn--sm" data-reset-hw>${icon('rotate-ccw')}Reset ticks</button>` })}
        <div class="g g-main">
          <div class="g">${Object.keys(groups).map((src) => `<div class="card"><div class="card__head"><span class="card__title">${icon(src.startsWith('Guide') ? 'book-open' : 'calendar-check')}${src}</span></div><div class="card__body p-0" style="padding:8px 0">${groups[src].map((it) => `<div class="hw-item"><label class="check"><input type="checkbox" data-hw="${it.key}" ${done.includes(it.key) ? 'checked' : ''}><span class="check__box"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span class="check__text">${it.text}</span></label></div>`).join('')}</div></div>`).join('') || A.empty({ icon: 'list-checks', title: 'No homework yet', text: 'Linda adds homework after each session.' })}</div>
          <aside class="card card--amber panel sticky-col" style="display:grid;justify-items:center;text-align:center;gap:14px">
            ${ring(pct, { size: 160, stroke: 3 })}
            <p class="serif" style="font-size:2rem;line-height:1">${pct === 100 ? 'Ka pai! <em class="amber">All done.</em>' : `${done.length} of ${items.length} <em class="amber">done</em>`}</p>
            <p class="muted text-sm">Your progress is saved on this device and visible to everyone in ${hh().name}.</p>
          </aside>
        </div>`;
    };
    return {
      title: 'Homework', crumbs: [{ label: hh().name }, { label: 'Homework' }],
      html: `<div id="hw-root">${draw()}</div>`,
      mount(root) {
        const r = $('#hw-root', root);
        r.addEventListener('change', (e) => {
          const k = e.target.dataset.hw; if (!k) return;
          let d = hwDone(); d = e.target.checked ? d.concat(k) : d.filter((x) => x !== k); setHw(d);
          const ringEl = $('.ring', r); const pct = Math.round((d.length / items.length) * 100);
          ringEl.style.setProperty('--p', pct); $('.ring__label', ringEl).textContent = pct + '%';
          $('aside p.serif', r).innerHTML = pct === 100 ? 'Ka pai! <em class="amber">All done.</em>' : `${d.length} of ${items.length} <em class="amber">done</em>`;
          if (pct === 100) { A.confetti(); toast('All homework done — Bramble says thanks 🐾', { type: 'success' }); }
        });
        r.addEventListener('click', (e) => { if (e.target.closest('[data-reset-hw]')) { setHw([]); r.innerHTML = draw(); icons(); } });
      }
    };
  }

  function libraryView(p) {
    const tf = p.query.get('t') || 'all';
    const dogs = hhDogs();
    const assigned = guidesFor(dogs);
    const others = L.guides.filter((g) => !assigned.includes(g));
    const flt = (g) => tf === 'all' || g.technique === tf;
    const card = (g, as) => `<a class="card card--hover" href="${g.status === 'published' ? guideHref(g) : '#/library'}" ${g.status !== 'published' ? 'data-soon' : ''} style="overflow:hidden;display:flex;flex-direction:column">
      <div style="position:relative;aspect-ratio:16/9"><img src="${g.hero.replace('/img/', '/thumb/')}" alt="" style="width:100%;height:100%;object-fit:cover">${as ? `<span class="badge st-ready" style="position:absolute;top:10px;left:10px;background:rgba(14,13,11,.75)">assigned by Linda</span>` : ''}${g.status !== 'published' ? `<span class="badge st-pending" style="position:absolute;top:10px;left:10px;background:rgba(14,13,11,.75)">coming soon</span>` : ''}</div>
      <div class="panel" style="display:grid;gap:8px"><div class="row row--between">${A.techTag(g.technique)}<span class="mono faint text-xs">${g.minutes} MIN</span></div><h3 class="serif" style="font-size:1.9rem;line-height:1">${g.title}</h3><p class="muted text-sm">${g.subtitle}</p></div></a>`;
    return {
      title: 'Training library', crumbs: [{ label: hh().name }, { label: 'Training library' }],
      html: `
      ${A.pageHead({ eyebrow: 'Academy', title: 'Training <em>library</em>', sub: 'Guides Linda has picked for your dogs — plus the rest of the Academy.' })}
      <div class="hscroll mb-3"><a class="chip ${tf === 'all' ? 'is-active' : ''}" href="#/library">All</a>${L.techniques.filter((t) => L.guides.some((g) => g.technique === t.id)).map((t) => `<a class="chip ${tf === t.id ? 'is-active' : ''}" href="#/library?t=${t.id}">${t.name}</a>`).join('')}</div>
      ${A.sectionTitle(`Assigned for ${dogs.map((d) => d.name).join(' & ') || 'you'}`)}
      ${assigned.filter(flt).length ? `<div class="g g-3">${assigned.filter(flt).map((g) => card(g, true)).join('')}</div>` : A.empty({ icon: 'book-open', title: 'Nothing assigned here', text: 'Linda hasn’t assigned a guide for this technique yet.' })}
      ${A.sectionTitle('More from the <em>Academy</em>')}
      <div class="g g-3">${others.filter(flt).map((g) => card(g, false)).join('') || '<p class="muted">No other guides for this technique yet.</p>'}</div>`,
      mount(root) { root.addEventListener('click', (e) => { if (e.target.closest('[data-soon]')) { e.preventDefault(); toast('Linda is still writing this guide.', { icon: 'pen-line' }); } }); }
    };
  }

  function accountView() {
    const h = hh();
    const owner = myPerm(h) === 'owner';
    const members = h.members.map((id) => L.user(id)).filter(Boolean);
    const consents = L.consents.filter((c) => c.subject.startsWith(ME.name));
    const prefs = DB.kv('prefs') || { share: true, homework: true, weekly: false, sessions: true };
    const inviteState = (u) => u.invite === 'accepted' ? A.badge('accepted') : A.badge(u.invite);
    return {
      title: 'Account', crumbs: [{ label: 'Account' }],
      html: `
      ${A.pageHead({ eyebrow: 'Account', title: `${ME.name.split(' ')[0]}’s <em>account</em>`, actions: `<a class="btn btn--sm" href="/v1/login.html">${icon('log-out')}Sign out</a>` })}
      <div class="g g-2">
        <div class="card panel" style="display:flex;gap:18px;align-items:center">${A.avatar(ME, 'avatar--lg')}<div class="grow"><p class="serif" style="font-size:1.9rem;line-height:1">${ME.name}</p><p class="muted text-sm">${ME.email} · ${ME.phone}</p><p class="faint text-xs mt-1">Signs in with a magic link — no password.</p></div><button class="btn btn--sm btn--ghost" data-edit-profile>${icon('pencil')}Edit</button></div>
        <div class="card panel"><span class="eyebrow">Households you belong to</span><div class="row row--wrap mt-2">${myHouseholds().map((x) => `<span class="badge ${x.id === HH ? 'st-ready' : 'badge--dotless'}">${x.name} · ${myPerm(x)}</span>`).join('')}</div><p class="faint text-xs mt-2">Joining a household always requires an invitation — a matching phone number isn’t enough.</p></div>
      </div>

      ${A.sectionTitle(`${h.name} <em>members</em>`, owner ? `<button class="btn btn--sm btn--primary" data-invite>${icon('user-plus')}Invite member</button>` : `<span class="faint text-sm">Only household owners can invite</span>`)}
      <div class="card"><div class="list" id="members">${members.map((u) => `<div class="list-row">${A.avatar(u)}<span class="list-row__main"><span class="list-row__title">${u.name}${u.id === ME.id ? ' <span class="faint">(you)</span>' : ''}</span><span class="list-row__meta">${u.email} · ${(h.memberPerms && h.memberPerms[u.id]) || (h.primary === u.id ? 'owner' : 'member')}</span></span><span class="list-row__trail">${inviteState(u)}${owner && u.id !== ME.id && u.invite === 'pending' ? `<button class="btn btn--sm btn--ghost" data-resend="${u.id}">Resend</button>` : ''}${owner && u.id !== ME.id ? `<button class="btn btn--sm btn--ghost" data-revoke="${u.id}" aria-label="Remove ${u.name}">${icon('user-minus')}</button>` : ''}</span></div>`).join('')}</div></div>

      <div class="g g-2 mt-4">
        <div class="card">
          <div class="card__head"><span class="card__title">${icon('bell')}Notifications</span></div>
          <div class="card__body" style="display:grid;gap:4px">
            ${[['share', 'Email me when Linda shares a video'], ['homework', 'Homework reminders'], ['sessions', 'Session reminders (24h before)'], ['weekly', 'Weekly progress summary']].map(([k, l]) => `<label class="switch" style="justify-content:space-between;width:100%"><span>${l}</span><input type="checkbox" data-pref="${k}" ${prefs[k] ? 'checked' : ''}><span class="switch__track"></span></label>`).join('')}
            <p class="faint text-xs mt-1">WhatsApp messages come from Linda personally — the portal can’t send or read them.</p>
          </div>
        </div>
        <div class="card">
          <div class="card__head"><span class="card__title">${icon('shield-check')}Privacy & consent</span></div>
          <div class="card__body" style="display:grid;gap:12px">
            <div class="callout callout--moss">${icon('lock')}<div><strong>Every video starts private.</strong> Linda approves each one for your household. Public use needs your separate consent below.</div></div>
            ${consents.map((c) => `<div class="row row--between row--wrap" style="padding:12px 0;border-top:1px solid var(--line)"><div><b class="text-sm">${c.kind}</b><p class="faint text-xs">${c.evidence} · ${L.fmtDate(c.date, { day: 'numeric', month: 'short', year: 'numeric' })}${c.media ? ' · “' + (L.mediaItem(c.media) || {}).title + '”' : ''}</p></div><div class="row">${A.badge(c.status)}${c.status === 'active' ? `<button class="btn btn--sm btn--danger" data-withdraw="${c.id}">Withdraw</button>` : ''}</div></div>`).join('') || '<p class="muted text-sm">No public-use consent on file. Nothing of yours is public.</p>'}
            <div class="row row--wrap" style="border-top:1px solid var(--line);padding-top:14px"><button class="btn btn--sm" data-export>${icon('download')}Request my data</button><button class="btn btn--sm btn--ghost" data-delete>${icon('trash-2')}Request deletion</button></div>
          </div>
        </div>
      </div>
      <p class="faint text-xs mt-3">Removing someone from the household stops their playback immediately. Video files already downloaded or forwarded elsewhere can’t be recalled.</p>`,
      mount(root) {
        root.addEventListener('change', (e) => { const k = e.target.dataset.pref; if (k) { prefs[k] = e.target.checked; DB.kv('prefs', prefs); toast('Preferences saved', { type: 'success' }); } });
        root.addEventListener('click', async (e) => {
          if (e.target.closest('[data-invite]')) inviteModal();
          const rs = e.target.closest('[data-resend]'); if (rs) toast(`Invitation re-sent to ${L.user(rs.dataset.resend).email}`, { icon: 'mail' });
          const rv = e.target.closest('[data-revoke]');
          if (rv) { const u = L.user(rv.dataset.revoke); if (await confirm({ title: `Remove ${u.name.split(' ')[0]}?`, sub: `${u.name} will lose access to ${h.name}’s videos straight away.`, ok: 'Remove access', danger: true })) { DB.patch('households', h.id, { members: h.members.filter((x) => x !== u.id) }); DB.audit('removed household member', `${u.name} → ${h.name}`, ME.name); toast(`${u.name} removed. Playback access revoked.`, { type: 'success' }); R.render(); } }
          const wd = e.target.closest('[data-withdraw]');
          if (wd) { const c = L.consents.find((x) => x.id === wd.dataset.withdraw); if (await confirm({ title: 'Withdraw consent?', sub: `Linda will be notified to take down public uses covered by “${c.kind}”.`, body: '<div class="callout">' + icon('info') + '<div>Your household access is unaffected. Copies already downloaded by others can’t be recalled.</div></div>', ok: 'Withdraw consent', danger: true })) { DB.patch('consents', c.id, { status: 'withdrawn', withdrawn: '2026-10-17' }); DB.audit('withdrew consent', c.kind, ME.name); toast('Consent withdrawn. Linda has been notified.', { type: 'success' }); R.render(); } }
          if (e.target.closest('[data-export]')) toast('Data request sent to Linda’s privacy contact.', { icon: 'mail' });
          if (e.target.closest('[data-delete]')) toast('Deletion request logged — Linda will confirm with you first.', { icon: 'info' });
          if (e.target.closest('[data-edit-profile]')) toast('Profile editing is coming soon in this demo.', { icon: 'pencil' });
        });
      }
    };
  }

  function inviteModal() {
    const h = hh();
    const m = modal({
      title: 'Invite to household', eyebrow: h.name, sub: 'They’ll get a time-limited link and sign in with their own email.',
      body: `<form id="inv" class="g" novalidate>
        <div class="field"><label class="field__label" for="inv-name">Name</label><input class="input" id="inv-name" data-validate="required" placeholder="e.g. Ana Thompson"><span class="field__error">${icon('circle-alert')}Please add a name.</span></div>
        <div class="field"><label class="field__label" for="inv-email">Email</label><input class="input" id="inv-email" type="email" data-validate="required email" placeholder="name@example.co.nz"><span class="field__error">${icon('circle-alert')}Enter a valid email.</span></div>
        <div class="field"><span class="field__label">Permission</span><div class="g g-2"><label class="radio-card"><input type="radio" name="perm" value="member" checked><span class="radio-card__dot"></span><span><span class="radio-card__title">Member</span><span class="radio-card__desc">Can watch approved videos & homework</span></span></label><label class="radio-card"><input type="radio" name="perm" value="owner"><span class="radio-card__dot"></span><span><span class="radio-card__title">Owner</span><span class="radio-card__desc">Can also invite & remove members</span></span></label></div></div>
        <p class="faint text-xs">Adults only. Invitations expire after 7 days.</p>
      </form>`,
      foot: `<button class="btn btn--ghost" data-close>Cancel</button><button class="btn btn--primary" data-send>${icon('send')}Send invitation</button>`
    });
    $('[data-send]', m.root).addEventListener('click', async (e) => {
      const f = $('#inv', m.root);
      if (!validate(f)) return;
      const email = $('#inv-email', m.root).value.trim().toLowerCase();
      const dupe = L.users.find((u) => u.email.toLowerCase() === email);
      if (dupe && h.members.includes(dupe.id)) { $('#inv-email', m.root).closest('.field').classList.add('is-invalid'); $('#inv-email', m.root).closest('.field').querySelector('.field__error').innerHTML = icon('circle-alert') + `${dupe.name} is already a member.`; icons(); return; }
      e.currentTarget.classList.add('is-loading');
      await sleep(900);
      const u = DB.add('users', { id: UI.uid('u'), name: $('#inv-name', m.root).value.trim(), role: 'client', email, phone: '', household: h.id, permission: f.perm.value, invite: 'pending' }, false);
      DB.patch('households', h.id, { members: h.members.concat(u.id) });
      DB.audit('invited household member', `${u.name} → ${h.name}`, ME.name);
      m.close();
      toast(`Invitation sent to <b>${esc(email)}</b>`, { type: 'success', icon: 'mail' });
      R.render();
    });
  }

  function profileView(p) {
    const d = L.dog(p.id) || hhDogs()[0];
    const posts = L.community.filter((c) => c.dog === d.id);
    const gallery = [15, 40, 65, 90].map((k) => L.img(d.clip, k));
    return {
      title: `${d.name}’s profile (preview)`, crumbs: [{ label: d.name, href: '#/dog/' + d.id }, { label: 'Public profile — preview' }],
      html: `
      <div class="callout mb-3">${icon('sparkles')}<div><strong>Coming soon — Phase 3.</strong> A preview of ${d.name}’s optional public profile. Training notes, sessions and private videos are never shown here.</div></div>
      <div style="position:relative;overflow:hidden;border-radius:var(--r-xl)">
        <span class="soon-ribbon">Preview</span>
        <div class="profile-cover"><img src="${d.cover}" alt=""></div>
      </div>
      <div class="profile-id">
        <span class="avatar"><img src="${d.avatar}" alt=""></span>
        <div class="grow"><h1 class="serif" style="font-size:clamp(3rem,6vw,5rem);line-height:.9">${d.name}</h1><p class="muted">${d.breed} · ${d.age} · ${hh().suburb}</p></div>
        <div class="row"><button class="btn btn--primary" disabled>${icon('user-plus')}Add friend</button><button class="btn" disabled>${icon('share-2')}Share</button></div>
      </div>
      <div class="g g-main mt-4">
        <div class="g">
          <div class="card panel"><span class="eyebrow">Bio</span><p class="serif mt-1" style="font-size:1.6rem;line-height:1.2">Food-motivated, beach-obsessed, learning that ducks are optional. <span class="faint" style="font-size:1rem;font-family:var(--sans)">— written by ${ME.name.split(' ')[0]}</span></p></div>
          <div class="g g-4">${gallery.map((g) => `<div style="aspect-ratio:1;border-radius:16px;overflow:hidden"><img src="${g}" alt="" style="width:100%;height:100%;object-fit:cover" loading="lazy"></div>`).join('')}</div>
          ${posts.map((c) => `<div class="card panel" style="display:grid;gap:12px"><div class="row">${A.dogAvatar(d, 'avatar--sm')}<b>${d.name}</b><span class="faint text-xs">${c.when}</span></div><p>${c.post}</p><img src="${c.img}" alt="" style="border-radius:16px;aspect-ratio:16/9;object-fit:cover;width:100%"><div class="row faint text-sm">${icon('heart')} ${c.likes} ${icon('message-circle')} ${c.comments}</div></div>`).join('')}
        </div>
        <aside class="card panel sticky-col" style="display:grid;gap:12px">
          <span class="eyebrow">Visibility controls</span>
          ${[['Profile', 'public'], ['Photos', 'friends'], ['Training milestones', 'household'], ['Session videos', 'private — never shared']].map(([k, v]) => `<div class="row row--between text-sm" style="padding:10px 0;border-top:1px solid var(--line)"><span>${k}</span><span class="badge ${v.startsWith('private') ? 'st-draft' : 'st-ready'}">${v}</span></div>`).join('')}
          <p class="faint text-xs">Friends can never see private training notes or sessions.</p>
        </aside>
      </div>`
    };
  }

  const R = A.router({
    appName: 'Client portal · Linda’s Dog Training',
    fallback: '/dogs',
    routes: [
      { path: '/dogs', nav: 'dogs', view: dogsView },
      { path: '/dog/:id', nav: 'dogs', back: '#/dogs', view: dogView },
      { path: '/video/:id', nav: 'dogs', back: (p) => { const m = L.mediaItem(p.id); return m && canSee(m) ? '#/dog/' + m.dogs[0] : '#/dogs'; }, view: videoView },
      { path: '/sessions', nav: 'sessions', view: sessionsView },
      { path: '/homework', nav: 'homework', view: homeworkView },
      { path: '/library', nav: 'library', view: libraryView },
      { path: '/account', nav: 'account', view: accountView },
      { path: '/profile/:id', nav: 'profile', back: (p) => '#/dog/' + p.id, view: profileView }
    ]
  });
  R.render();
})();
