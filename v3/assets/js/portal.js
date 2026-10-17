/* ==========================================================================
   V3 · portal — client portal SPA (signed in as Sarah Thompson)
   Shows ONLY approved_shared / published_public media for dogs in the
   currently selected household — demonstrating the privacy model.
   ========================================================================== */
(function () {
  'use strict';
  const V3 = window.V3;
  const { $, $$, esc, icon } = V3;
  const db = V3.db;
  const ME = V3.user(window.LINDA.currentClient);

  /* Context ------------------------------------------------------------ */
  const myHouseholds = () => V3.householdsOf(ME.id);
  let HH = V3.store.get('portal-hh', 'h-thompson');
  if (!myHouseholds().some((h) => h.id === HH)) HH = myHouseholds()[0].id;
  const hh = () => V3.household(HH);
  const hhDogs = () => V3.dogsFor(HH);
  const visibleMedia = () => db.media.filter((m) => V3.isClientVisible(m) && m.processing === 'ready' && m.dogs.some((d) => (V3.dog(d) || {}).household === HH)).sort((a, b) => b.created.localeCompare(a.created));
  const canSee = (m) => m && V3.isClientVisible(m) && m.dogs.some((d) => (V3.dog(d) || {}).household === HH);
  const hhSessions = () => V3.sessionsForHousehold(HH).sort((a, b) => b.date.localeCompare(a.date));
  const hiddenCount = (s) => s.media.map(V3.media).filter((m) => m && !V3.isClientVisible(m)).length;
  const firstName = ME.name.split(' ')[0];
  const myRole = () => (myHouseholds().find((h) => h.id === HH) || {}).role;

  /* Shared snippets ---------------------------------------------------- */
  const techChip = (id, href) => { const t = V3.technique(id); return t ? `<${href ? `a href="${href}"` : 'span'} class="tag" style="--c:${t.color}">${esc(t.name)}</${href ? 'a' : 'span'}>` : ''; };
  const visIcon = (m) => m.editorial === 'published_public' ? 'globe' : 'house';
  const mediaCard = (m) => `<a class="mcard" href="#/video/${m.id}" data-hover-video>
      <div class="mcard__thumb"><img src="${V3.thumb(m.clip, m.cover || 40)}" alt="" loading="lazy"><video muted playsinline loop preload="none" data-src="${V3.vid(m.clip)}" data-hoverplay></video>
        <span class="mcard__vis">${icon(visIcon(m))}${m.editorial === 'published_public' ? 'Public edition' : 'Household'}</span><span class="mcard__dur">${esc(m.duration)}</span></div>
      <div><div class="mcard__title">${esc(m.title)}</div><div class="mcard__meta"><span>${V3.fmtDate(m.created)}</span><span class="sep"></span><span>${m.dogs.map((d) => esc(V3.dog(d).name)).join(' & ')}</span>${m.timestamps && m.timestamps.length ? `<span class="sep"></span><span>${m.timestamps.length} notes</span>` : ''}</div></div>
    </a>`;
  const hwKey = (sid, i) => `${sid}:${i}`;
  const hwItems = () => {
    const out = [];
    hhSessions().filter((s) => s.status === 'completed' && s.homework.length).forEach((s) => s.homework.forEach((h, i) => out.push({ key: hwKey(s.id, i), text: h, session: s })));
    return out;
  };
  const hwDone = (k) => !!db.homeworkDone[k];
  const switcherHTML = () => `<span class="avatar avatar--sq" style="--s:32px">${esc(V3.initials(hh().name))}</span><div><b>${esc(hh().name)}</b><small>${myHouseholds().length} households · ${esc(myRole() || '')}</small></div>${icon('chevrons-up-down')}`;
  const openSwitcher = (anchor) => {
    V3.menu(anchor, myHouseholds().map((h) => ({ html: `<span class="avatar avatar--sq" style="--s:26px;font-size:9px">${esc(V3.initials(h.name))}</span><span><b style="display:block;font-weight:600">${esc(h.name)}</b><small class="muted" style="font-size:11.5px">${esc(h.role)} · ${V3.dogsFor(h.id).map((d) => d.name).join(', ')}</small></span>`, selected: h.id === HH, run: () => switchTo(h.id) })).concat(['-', { label: 'How households work', icon: 'circle-help', run: () => V3.modal({ title: 'One person, several households', body: `<p class="muted">A household is a group of adults and dogs that share training access. You can belong to more than one — say, your own whānau and a friend’s dog you help with. Each household only ever sees its own dogs’ videos.</p>` }) }]));
  };
  const switchTo = (id) => {
    HH = id; V3.store.set('portal-hh', id);
    app.refreshChrome();
    V3.toast(`Switched to ${esc(hh().name)}`, { icon: 'house', sub: `${hhDogs().length} dog${hhDogs().length > 1 ? 's' : ''}` });
    const cur = app.current && app.current.parts && app.current.parts[0];
    if (cur === 'dog' || cur === 'video') app.go('#/dogs'); else app.refresh();
  };

  /* Views -------------------------------------------------------------- */
  const routes = {};

  routes['dogs'] = () => {
    const dogs = hhDogs();
    const vids = visibleMedia();
    const upcoming = hhSessions().filter((s) => s.status === 'scheduled').sort((a, b) => a.date.localeCompare(b.date))[0];
    const hw = hwItems(); const done = hw.filter((x) => hwDone(x.key)).length;
    return {
      title: 'My Dogs', nav: 'dogs',
      html: `
      <div class="welcome">
        <div><div class="vh__meta mono"><span>${V3.fmtDate(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long' })}</span></div><h1>Kia ora, ${esc(firstName)}.</h1></div>
        <button class="hh-switch" type="button" data-switch>${`<span class="avatar avatar--sq">${esc(V3.initials(hh().name))}</span>${esc(hh().name)}`}${icon('chevron-down')}</button>
      </div>
      <div class="g" style="gap:16px">
        ${dogs.map((d) => {
          const ss = V3.sessionsForDog(d.id).filter((s) => s.status === 'completed').sort((a, b) => b.date.localeCompare(a.date));
          const last = ss[0];
          const dv = vids.filter((m) => m.dogs.includes(d.id));
          return `<article class="bigdog">
            <a class="bigdog__img" href="#/dog/${d.id}" aria-label="Open ${esc(d.name)}’s timeline"><img src="${esc(d.photo)}" alt="${esc(d.name)}, ${esc(d.breed)}"><span class="pill pill--glass pill--mono">${esc(d.status)}</span></a>
            <div class="bigdog__b">
              <div><span class="label">${esc(d.breed)} · ${esc(d.age)} · ${d.sex === 'F' ? 'Female' : 'Male'}</span><h2 style="margin-top:6px">${esc(d.name)}</h2></div>
              <div><div class="row row--between" style="margin-bottom:6px"><span class="label">Progress to goals</span><span class="num" style="font-size:12px">${d.progress}%</span></div><div class="bar bar--lime" style="--v:${d.progress / 100};height:6px"><i style="background:var(--text)"></i></div></div>
              <div class="stack" style="--stack:6px">${d.goals.map((g) => `<div class="goal">${icon('target')}<span>${esc(g)}</span></div>`).join('')}</div>
              ${last ? `<a class="lrow" href="#/dog/${d.id}" style="border:1px solid var(--line-soft);border-radius:14px;padding:10px 12px"><span class="lrow__ico">${icon('calendar-check')}</span><span class="lrow__t"><b>${esc(last.title)}</b><small>Latest session · ${V3.fmtDay(last.date)} · ${esc(last.location)}</small></span>${icon('chevron-right')}</a>` : `<div class="locked">${icon('calendar')}No sessions yet — your first one will appear here.</div>`}
              <div class="row row--wrap"><a class="btn btn--sm" href="#/dog/${d.id}">Open timeline ${icon('arrow-right', 'btn-arrow')}</a><span class="muted" style="font-size:12.5px">${dv.length} video${dv.length === 1 ? '' : 's'} shared</span></div>
            </div>
          </article>`;
        }).join('')}
      </div>
      <div class="g g-main" style="margin-top:8px">
        <div>
          <div class="sec-t"><h2>Latest from Linda <span class="num">${vids.length}</span></h2>${vids.length ? '<a class="link" href="#/sessions">All sessions</a>' : ''}</div>
          ${vids.length ? `<div class="mgrid">${vids.slice(0, 6).map(mediaCard).join('')}</div>` : `<div class="card card--flat"><div class="empty"><span class="empty__ico">${icon('lock')}</span><h3>Nothing shared yet</h3><p>Linda reviews every clip before it reaches you. Videos for ${esc(hh().name)} will appear here once she approves them.</p></div></div>`}
        </div>
        <div>
          ${upcoming ? `<div class="sec-t"><h2>Next session</h2></div><div class="card card--pad" style="display:grid;gap:10px"><div class="row"><span class="lrow__ico">${icon('calendar-clock')}</span><div class="grow"><b style="font-weight:600;display:block">${esc(upcoming.title)}</b><small class="muted">${V3.fmtDay(upcoming.date)} · ${V3.fmtTime(upcoming.date)}</small></div></div><div class="muted" style="font-size:13px">${icon('map-pin', 'faint')} ${esc(upcoming.location)}</div><button class="btn btn--ghost btn--sm" type="button" data-cal>${icon('calendar-plus')} Add to calendar</button></div>` : ''}
          <div class="sec-t"><h2>This week’s homework</h2><a class="link" href="#/homework">Open</a></div>
          <a class="card card--pad card--hover" href="#/homework" style="display:flex;align-items:center;gap:16px">
            <div class="ring ring--lime" style="--s:64px;--v:${hw.length ? done / hw.length : 0}"><svg viewBox="0 0 36 36"><circle class="ring__bg" cx="18" cy="18" r="15.9155"/><circle class="ring__fg" cx="18" cy="18" r="15.9155" pathLength="100" style="stroke:var(--text)"/></svg><span class="ring__label">${done}/${hw.length}</span></div>
            <div><b style="font-weight:600">${hw.length ? (done === hw.length ? 'All done — brilliant!' : `${hw.length - done} exercise${hw.length - done === 1 ? '' : 's'} to go`) : 'No homework yet'}</b><p class="muted" style="font-size:13px">Little and often beats one long session.</p></div>
          </a>
          <div class="sec-t"><h2>Coming soon</h2></div>
          <a class="card card--pad card--hover" href="#/profile" style="display:grid;gap:8px"><span class="pill pill--lime pill--mono" style="justify-self:start">Phase 3</span><b style="font-weight:600">${esc((dogs[0] || {}).name || 'Your dog')}’s public profile</b><p class="muted" style="font-size:13px">A gallery and milestones you control — training notes stay private.</p><span class="link">Preview ${icon('arrow-right')}</span></a>
        </div>
      </div>`,
      mount(v) {
        $('[data-switch]', v).addEventListener('click', (e) => openSwitcher(e.currentTarget));
        const c = $('[data-cal]', v); if (c) c.addEventListener('click', () => V3.toast('Calendar file ready', { sub: 'Demo · .ics not generated', icon: 'calendar-plus' }));
      }
    };
  };

  routes['dog/:id'] = ({ id }, q) => {
    const d = V3.dog(id);
    if (!d || d.household !== HH) return denied('This dog isn’t part of the household you’re viewing.');
    const vids = visibleMedia().filter((m) => m.dogs.includes(id));
    const ss = V3.sessionsForDog(id).sort((a, b) => b.date.localeCompare(a.date));
    const tab = q.get('tab') || 'timeline';
    const tf = q.get('t') || '';
    const techs = [...new Set(ss.flatMap((s) => s.media.map(V3.media).filter(canSee).flatMap((m) => m.techniques)).concat(d.techniques))];
    const sessHTML = ss.filter((s) => !tf || s.media.map(V3.media).some((m) => canSee(m) && m.techniques.includes(tf))).map((s, i) => {
      const clips = s.media.map(V3.media).filter((m) => m && canSee(m) && (!tf || m.techniques.includes(tf)));
      const hidden = hiddenCount(s);
      const dt = new Date(s.date);
      return `<div class="tl__item${i === 0 && s.status !== 'scheduled' ? ' is-latest' : ''}">
        <div class="tl__date"><b>${dt.getDate()}</b><span>${dt.toLocaleDateString('en-NZ', { month: 'short' })}</span></div><span class="tl__dot"></span>
        <div class="tl__card">
          <div class="row row--between row--wrap" style="gap:8px"><span class="label">${esc(s.location)} · ${V3.fmtTime(s.date)}</span>${V3.state(s.status)}</div>
          <h3>${esc(s.title)}</h3>
          ${s.notes ? `<p style="font-size:14px;line-height:1.55">${esc(s.notes)}</p>` : s.status === 'scheduled' ? `<p class="muted" style="font-size:13.5px">Upcoming — notes and clips appear after the session.</p>` : ''}
          ${clips.length ? `<div class="tl__clips">${clips.map(mediaCard).join('')}</div>` : ''}
          ${hidden ? `<div class="locked">${icon('lock')}<span>${hidden} clip${hidden > 1 ? 's' : ''} from this session ${hidden > 1 ? 'are' : 'is'} still with Linda. You’ll see ${hidden > 1 ? 'them' : 'it'} once approved.</span></div>` : ''}
          ${s.homework.length ? `<div class="tl__hw"><span class="label" style="margin:6px 0 2px">Homework</span>${s.homework.map((h, k) => `<label class="check"><input type="checkbox" data-hw="${hwKey(s.id, k)}"${hwDone(hwKey(s.id, k)) ? ' checked' : ''}><span class="check__box">${icon('check')}</span><span class="check__text">${esc(h)}</span></label>`).join('')}</div>` : ''}
        </div></div>`;
    }).join('');
    return {
      title: d.name, nav: 'dogs', crumbs: [{ label: 'My Dogs', href: '#/dogs' }, { label: d.name }],
      html: `
      <section class="dog-hero"><img src="${esc(d.cover)}" alt="">
        <div class="dog-hero__in">
          <div><span class="mono">${esc(d.breed)} · ${esc(d.age)} · ${esc(hh().name)}</span><h1>${esc(d.name)}</h1><div class="row row--wrap" style="margin-top:12px;gap:6px">${d.techniques.map((t) => `<span class="pill">${esc(V3.technique(t).name)}</span>`).join('')}</div></div>
          <div class="prog"><div class="row row--between"><span class="mono">Progress</span><span class="mono">${d.progress}%</span></div><div class="bar" style="--v:${d.progress / 100}"><i></i></div><span class="mono">${ss.filter((s) => s.status === 'completed').length} sessions · ${vids.length} videos</span></div>
        </div></section>
      <div class="tabs" role="tablist" style="margin:18px 0 16px">
        ${[['timeline', 'Timeline', ss.length], ['videos', 'Videos', vids.length], ['about', 'Notes & goals', '']].map(([k, l, c]) => `<a role="tab" href="#/dog/${id}?tab=${k}" aria-selected="${tab === k}">${l}${c !== '' ? ` <span class="count">${c}</span>` : ''}</a>`).join('')}
      </div>
      ${tab === 'timeline' ? `
        <div class="chips" style="margin-bottom:14px" role="group" aria-label="Filter by technique"><a class="chip${!tf ? ' is-active' : ''}" href="#/dog/${id}">All</a>${techs.map((t) => { const T = V3.technique(t); return `<a class="chip${tf === t ? ' is-active' : ''}" href="#/dog/${id}?t=${t}" style="--c:${T.color}"><span class="dot"></span>${esc(T.name)}</a>`; }).join('')}</div>
        <div class="tl">${sessHTML || `<div class="empty"><span class="empty__ico">${icon('filter-x')}</span><h3>No sessions match</h3><p>Try a different technique.</p></div>`}</div>`
      : tab === 'videos' ? (vids.length ? `<div class="mgrid">${vids.map(mediaCard).join('')}</div>` : `<div class="empty"><span class="empty__ico">${icon('lock')}</span><h3>No videos shared yet</h3><p>Linda reviews every clip first. They’ll appear here once approved.</p></div>`)
      : `<div class="g g-2"><div class="card card--pad"><span class="label">Training goals</span><div class="stack" style="--stack:10px;margin-top:12px">${d.goals.map((g) => `<div class="goal" style="font-size:15px">${icon('target')}<span>${esc(g)}</span></div>`).join('')}</div></div>
         <div class="card card--pad"><span class="label">Linda’s notes for you</span><p style="margin-top:12px;font-size:15px;line-height:1.6">${esc(d.notes)}</p></div>
         <div class="card card--pad span-2"><span class="label">Techniques we’re working on</span><div class="g g-3" style="margin-top:12px">${d.techniques.map((t) => { const T = V3.technique(t); return `<a class="lrow" href="#/library?t=${t}" style="border:1px solid var(--line-soft);border-radius:14px;padding:12px"><span class="lrow__ico" style="background:${T.color};color:#fff">${icon(T.icon)}</span><span class="lrow__t"><b>${esc(T.name)}</b><small>${esc(T.blurb)}</small></span></a>`; }).join('')}</div></div></div>`}`,
      mount(v) {
        v.addEventListener('change', (e) => { const k = e.target.dataset.hw; if (!k) return; db.homeworkDone[k] = e.target.checked; V3.save(); if (e.target.checked) V3.toast('Nice — ticked off', { sub: 'Linda can see your progress' }); });
      }
    };
  };

  function denied(msg) {
    return { title: 'No access', nav: 'dogs', html: `<div class="card card--flat" style="max-width:620px;margin:40px auto"><div class="empty"><span class="empty__ico">${icon('shield-x')}<i class="xmark xmark--tl"></i><i class="xmark xmark--br"></i></span><h3>You don’t have access to this</h3><p>${esc(msg)} Every video starts private — Linda grants access per household, and a link on its own isn’t enough.</p><div class="row"><a class="btn btn--sm" href="#/dogs">Back to My Dogs</a>${myHouseholds().length > 1 ? `<button class="btn btn--ghost btn--sm" type="button" onclick="document.querySelector('[data-ctx]').click()">Switch household</button>` : ''}</div><p class="mono faint" style="margin-top:10px">403 · default deny</p></div></div>` };
  }

  routes['video/:id'] = ({ id }) => {
    const m = V3.media(id);
    if (!canSee(m)) return denied(m ? 'This video hasn’t been shared with the household you’re viewing.' : 'This video doesn’t exist or was removed.');
    const s = V3.session(m.session);
    const d = V3.dog(m.dogs[0]);
    const relGuides = db.guides.filter((g) => g.status === 'published' && m.techniques.includes(g.technique));
    const more = s ? s.media.map(V3.media).filter((x) => x && x.id !== m.id && canSee(x)) : [];
    const tr = m.ai && m.ai.transcript;
    const parts = tr ? tr.split('…').map((x) => x.trim()).filter(Boolean) : [];
    const dec = V3.toSec(m.duration) || 30;
    const caps = parts.map((p, i) => ({ t: V3.fmtSec((i / parts.length) * dec), text: p.replace(/[“”]/g, '') }));
    return {
      title: m.title, nav: 'dogs', crumbs: [{ label: 'My Dogs', href: '#/dogs' }, { label: d.name, href: `#/dog/${d.id}` }, { label: m.title }], mtitle: m.title,
      html: `
      <div class="g g-main">
        <div>
          <div data-player></div>
          <div class="row row--between row--wrap" style="margin-top:16px;gap:12px">
            <div><div class="vh__meta mono" style="margin-bottom:6px"><span>${V3.fmtDay(m.created)}</span><span class="dot-sep"></span><span>${esc(d.name)}</span><span class="dot-sep"></span><span>${esc(m.duration)}</span></div><h1 class="t-xl">${esc(m.title)}</h1></div>
            <div class="row"><button class="btn btn--ghost btn--sm" type="button" data-copy>${icon('link-2')} Copy link</button></div>
          </div>
          <div class="row row--wrap" style="gap:6px;margin-top:12px">${m.techniques.map((t) => techChip(t, `#/library?t=${t}`)).join('')}</div>
          ${m.notes ? `<div class="card card--pad" style="margin-top:18px"><div class="row" style="margin-bottom:10px"><span class="avatar" style="--s:28px">LI</span><span class="label">Linda’s notes</span></div><p style="font-size:15.5px;line-height:1.6">${esc(m.notes)}</p></div>` : ''}
          ${tr ? `<div class="sec-t"><h2>${icon('captions')} Transcript</h2><span class="mono faint">Approved by Linda</span></div><div class="transcript">${esc(tr)}</div>` : `<div class="sec-t"><h2>${icon('captions')} Transcript</h2></div><div class="locked">${icon('mic-off')}No speech in this clip — transcript unavailable.</div>`}
        </div>
        <aside>
          <div class="sec-t" style="margin-top:0"><h2>Timestamps <span class="num">${m.timestamps.length}</span></h2><span class="mono faint">Tap to jump</span></div>
          ${m.timestamps.length ? `<div class="ts-list">${m.timestamps.map((t, i) => `<button type="button" class="ts" data-ts="${i}"><span class="num">${esc(t.t)}</span><span>${esc(t.label)}</span>${icon('corner-down-right')}</button>`).join('')}</div>` : '<div class="locked">No timestamped notes on this clip.</div>'}
          ${s ? `<div class="sec-t"><h2>From the session</h2></div><a class="card card--pad card--hover" href="#/dog/${d.id}" style="display:grid;gap:6px"><span class="label">${V3.fmtDay(s.date)} · ${esc(s.location)}</span><b style="font-weight:600">${esc(s.title)}</b>${s.homework.length ? `<span class="muted" style="font-size:13px">${s.homework.length} homework exercise${s.homework.length > 1 ? 's' : ''}</span>` : ''}</a>` : ''}
          ${relGuides.length ? `<div class="sec-t"><h2>Related guides</h2></div>${relGuides.map((g) => `<a class="lrow" href="${g.slug === 'recall-101' ? '/v3/guide/recall-101.html' : `/v3/guide/recall-101.html?g=${g.slug}`}"><span class="lrow__thumb"><img src="${esc(g.hero)}" alt=""></span><span class="lrow__t"><b>${esc(g.title)}</b><small>${g.minutes} min · ${esc(g.level)}</small></span>${icon('arrow-up-right')}</a>`).join('')}` : ''}
          ${more.length ? `<div class="sec-t"><h2>More from this session</h2></div><div class="mgrid" style="grid-template-columns:1fr">${more.map(mediaCard).join('')}</div>` : ''}
          <div class="notice" style="margin-top:18px">${icon('shield-check')}<span>Visible to <strong>${m.editorial === 'published_public' ? 'everyone (public edition, consent on file)' : esc(hh().name)}</strong>. Shared by Linda.</span></div>
        </aside>
      </div>`,
      mount(v) {
        const p = V3.player($('[data-player]', v), { clip: m.clip, declared: m.duration, markers: m.timestamps, captions: caps.length ? caps : null, poster: V3.img(m.clip, m.cover || 15), onTime: (t) => { $$('.ts', v).forEach((b, i) => { const a = V3.toSec(m.timestamps[i].t), z = m.timestamps[i + 1] ? V3.toSec(m.timestamps[i + 1].t) : 1e9; b.classList.toggle('is-current', t >= a && t < z); }); } });
        $$('[data-ts]', v).forEach((b) => b.addEventListener('click', () => { p.seek(V3.toSec(m.timestamps[+b.dataset.ts].t)); $('[data-player]', v).scrollIntoView({ behavior: V3.reduced() ? 'auto' : 'smooth', block: 'center' }); }));
        $('[data-copy]', v).addEventListener('click', async () => { try { await navigator.clipboard.writeText(location.href); } catch (e) { /* noop */ } V3.toast('Portal link copied', { sub: 'Only household members can open it' }); });
        if (!m.views) m.views = 0; m.views++; V3.save();
        return () => p.video.pause();
      }
    };
  };

  routes['sessions'] = (_, q) => {
    const dogF = q.get('dog') || '';
    const ss = hhSessions().filter((s) => !dogF || s.dogs.includes(dogF));
    return {
      title: 'Sessions', nav: 'sessions',
      html: `<div class="vh"><div><div class="vh__meta mono"><span>${esc(hh().name)}</span></div><h1>Training sessions</h1><p>Every session with Linda — notes, clips and homework.</p></div></div>
      ${hhDogs().length > 1 ? `<div class="chips" style="margin-bottom:14px"><a class="chip${!dogF ? ' is-active' : ''}" href="#/sessions">All dogs</a>${hhDogs().map((d) => `<a class="chip${dogF === d.id ? ' is-active' : ''}" href="#/sessions?dog=${d.id}">${esc(d.name)}</a>`).join('')}</div>` : ''}
      <div class="card"><div class="list" style="padding:4px 12px">${ss.map((s) => {
        const vis = s.media.map(V3.media).filter(canSee).length; const hid = hiddenCount(s);
        return `<a class="lrow" href="#/dog/${s.dogs.find((x) => V3.dog(x).household === HH) || s.dogs[0]}"><span class="lrow__ico">${icon(s.status === 'scheduled' ? 'calendar-clock' : 'calendar-check')}</span><span class="lrow__t"><b>${esc(s.title)}</b><small>${V3.fmtDay(s.date)} · ${s.dogs.map((x) => esc(V3.dog(x).name)).join(' & ')} · ${esc(s.location)}</small></span><span class="lrow__end hide-m">${vis ? `<span class="pill">${icon('play')} ${vis}</span>` : ''}${hid ? `<span class="pill" title="Still with Linda">${icon('lock')} ${hid}</span>` : ''}${V3.state(s.status)}</span>${icon('chevron-right')}</a>`;
      }).join('') || `<div class="empty"><span class="empty__ico">${icon('calendar')}</span><h3>No sessions yet</h3></div>`}</div></div>`
    };
  };

  routes['homework'] = () => {
    const items = hwItems();
    const g = V3.guide('recall-101');
    const gDone = V3.store.get('hw-guide-recall-101', []);
    const assignedRecall = hhDogs().some((d) => d.techniques.includes('t-recall'));
    const bySession = {};
    items.forEach((x) => { (bySession[x.session.id] = bySession[x.session.id] || []).push(x); });
    const total = items.length + (assignedRecall ? g.homework.length : 0);
    const done = items.filter((x) => hwDone(x.key)).length + (assignedRecall ? gDone.length : 0);
    return {
      title: 'Homework', nav: 'homework',
      html: `<div class="vh"><div><div class="vh__meta mono"><span>${esc(hh().name)}</span></div><h1>Homework</h1><p>Short, frequent practice. Tick things off as you go — progress is saved.</p></div>
        <div class="ring ring--lime" style="--s:84px;--v:${total ? done / total : 0}" data-ring><svg viewBox="0 0 36 36"><circle class="ring__bg" cx="18" cy="18" r="15.9155"/><circle class="ring__fg" cx="18" cy="18" r="15.9155" pathLength="100" style="stroke:var(--text)"/></svg><span class="ring__label" data-ring-l>${done}/${total}</span></div></div>
      <div class="g g-2">
        ${Object.values(bySession).map((arr) => { const s = arr[0].session; return `<div class="hwcard"><div class="row row--between"><span class="label">${V3.fmtDay(s.date)} · ${s.dogs.map((x) => esc(V3.dog(x).name)).join(' & ')}</span><a class="link" style="font-size:12.5px" href="#/dog/${s.dogs[0]}">Session</a></div><b style="font-family:var(--font-display);font-size:18px;font-weight:620;letter-spacing:-.02em;margin:4px 0 6px">${esc(s.title)}</b>${arr.map((x) => `<label class="check"><input type="checkbox" data-hw="${x.key}"${hwDone(x.key) ? ' checked' : ''}><span class="check__box">${icon('check')}</span><span class="check__text">${esc(x.text)}</span></label>`).join('')}</div>`; }).join('')}
        ${assignedRecall ? `<div class="hwcard"><div class="row row--between"><span class="label">Assigned guide · Recall 101</span><a class="link" style="font-size:12.5px" href="/v3/guide/recall-101.html">Open guide</a></div><b style="font-family:var(--font-display);font-size:18px;font-weight:620;letter-spacing:-.02em;margin:4px 0 6px">${esc(g.title)} checklist</b>${g.homework.map((h, i) => `<label class="check"><input type="checkbox" data-ghw="${i}"${gDone.includes(i) ? ' checked' : ''}><span class="check__box">${icon('check')}</span><span class="check__text">${esc(h)}</span></label>`).join('')}</div>` : ''}
      </div>
      ${!items.length && !assignedRecall ? `<div class="empty"><span class="empty__ico">${icon('list-checks')}</span><h3>No homework yet</h3><p>After your next session, Linda’s exercises will appear here.</p></div>` : ''}`,
      mount(v) {
        const upd = () => {
          const gd = $$('[data-ghw]', v).filter((x) => x.checked).map((x) => +x.dataset.ghw);
          if ($('[data-ghw]', v)) V3.store.set('hw-guide-recall-101', gd);
          const all = $$('input[type=checkbox]', v); const n = all.filter((x) => x.checked).length;
          $('[data-ring]', v).style.setProperty('--v', all.length ? n / all.length : 0); $('[data-ring-l]', v).textContent = `${n}/${all.length}`;
          return { n, t: all.length };
        };
        v.addEventListener('change', (e) => {
          if (e.target.dataset.hw) { db.homeworkDone[e.target.dataset.hw] = e.target.checked; V3.save(); }
          const r = upd();
          if (e.target.checked) V3.toast(r.n === r.t ? 'Everything done this week — brilliant!' : 'Ticked off', { sub: `${r.n} of ${r.t}` });
        });
      }
    };
  };

  routes['library'] = (_, q) => {
    const tf = q.get('t') || '';
    const myTech = [...new Set(hhDogs().flatMap((d) => d.techniques))];
    const pub = db.guides.filter((g) => g.status === 'published');
    const assigned = pub.filter((g) => myTech.includes(g.technique));
    const list = pub.filter((g) => !tf || g.technique === tf);
    const card = (g) => { const T = V3.technique(g.technique); const isA = assigned.includes(g); return `<a class="mcard" href="${g.slug === 'recall-101' ? '/v3/guide/recall-101.html' : `/v3/guide/recall-101.html?g=${g.slug}`}" data-hover-video><div class="mcard__thumb" style="aspect-ratio:4/3"><img src="${esc(g.hero)}" alt="" loading="lazy"><video muted playsinline loop preload="none" data-src="${V3.vid(g.clip)}" data-hoverplay></video>${isA ? `<span class="mcard__vis" style="background:var(--lime);color:var(--graphite)">${icon('pin')} Assigned by Linda</span>` : ''}<span class="mcard__dur">${g.minutes} min</span></div><div><div class="mcard__title" style="font-family:var(--font-display);font-size:18px;font-weight:620;letter-spacing:-.02em">${esc(g.title)}</div><div class="mcard__meta"><span class="tag" style="--c:${T.color}">${esc(T.name)}</span><span>${esc(g.level)}</span></div><p class="muted clamp-2" style="font-size:13px;margin-top:6px">${esc(g.subtitle)}</p></div></a>`; };
    return {
      title: 'Training Library', nav: 'library',
      html: `<div class="vh"><div><div class="vh__meta mono"><span>Academy</span></div><h1>Training Library</h1><p>Guides Linda has assigned for ${hhDogs().map((d) => esc(d.name)).join(' & ')}, plus the full academy.</p></div></div>
      <div class="chips" style="margin-bottom:16px"><a class="chip${!tf ? ' is-active' : ''}" href="#/library">All</a>${[...new Set(pub.map((g) => g.technique))].map((t) => { const T = V3.technique(t); return `<a class="chip${tf === t ? ' is-active' : ''}" href="#/library?t=${t}" style="--c:${T.color}"><span class="dot"></span>${esc(T.name)}</a>`; }).join('')}</div>
      ${!tf && assigned.length ? `<div class="sec-t" style="margin-top:0"><h2>${icon('pin')} Assigned to you <span class="num">${assigned.length}</span></h2></div><div class="mgrid">${assigned.map(card).join('')}</div><div class="sec-t"><h2>All guides</h2></div>` : ''}
      <div class="mgrid">${list.map(card).join('') || `<div class="empty"><span class="empty__ico">${icon('book-open')}</span><h3>No guide for this technique yet</h3><p>Linda is still writing it.</p></div>`}</div>`
    };
  };

  routes['account'] = () => {
    const members = V3.membersOf(HH);
    const prefs = V3.store.get('portal-notify', { email: true, newVideo: true, homework: false, digest: true });
    const consents = db.consents.filter((c) => members.some((m) => c.subject.startsWith(m.name)));
    const isOwner = myRole() === 'owner';
    return {
      title: 'Account', nav: 'account',
      html: `<div class="vh"><div><div class="vh__meta mono"><span>Signed in with magic link</span></div><h1>Account</h1></div><button class="btn btn--ghost btn--sm" type="button" data-signout>${icon('log-out')} Sign out</button></div>
      <div class="g g-main">
        <div class="g">
          <section class="panel"><div class="panel__h"><h3>${icon('house')} ${esc(hh().name)}</h3>${isOwner ? `<button class="btn btn--sm" type="button" data-invite>${icon('user-plus')} Invite member</button>` : `<span class="mono faint">You’re a member</span>`}</div>
            <div class="panel__b" style="padding-top:4px"><div class="list">${members.map((u) => `<div class="lrow"><span class="avatar">${esc(V3.initials(u.name))}</span><span class="lrow__t"><b>${esc(u.name)}${u.id === ME.id ? ' <span class="mono faint">(you)</span>' : ''}</b><small>${esc(u.email)}</small></span><span class="lrow__end"><span class="pill pill--mono">${esc(u.permission)}</span>${V3.state(u.invite)}</span></div>`).join('')}</div>
            ${!isOwner ? `<div class="notice" style="margin-top:10px">${icon('info')}<span>Only household owners can invite people. Ask ${esc((members.find((x) => x.permission === 'owner') || {}).name || 'the owner')}.</span></div>` : ''}</div></section>
          <section class="panel"><div class="panel__h"><h3>${icon('bell')} Notifications</h3><span class="mono faint">Email only · no WhatsApp automation</span></div><div class="panel__b">
            ${[['newVideo', 'New video shared', 'When Linda shares a clip with your household'], ['homework', 'Homework reminders', 'A gentle nudge mid-week'], ['digest', 'Weekly summary', 'Sessions, clips and homework — Sundays'], ['email', 'Product updates', 'Occasional news about the portal']].map(([k, l, s]) => `<div class="setrow"><div><b>${l}</b><small>${s}</small></div><label class="switch" style="justify-self:end"><input type="checkbox" data-pref="${k}"${prefs[k] ? ' checked' : ''}><span class="switch__track"></span><span class="sr-only">${l}</span></label></div>`).join('')}
          </div></section>
        </div>
        <div class="g">
          <section class="panel"><div class="panel__h"><h3>${icon('user-round')} Profile</h3></div><div class="panel__b"><div class="row" style="gap:14px"><span class="avatar" style="--s:52px;font-size:14px">${esc(V3.initials(ME.name))}</span><div><b style="font-weight:600;font-size:16px">${esc(ME.name)}</b><div class="muted" style="font-size:13px">${esc(ME.email)}</div><div class="mono faint" style="margin-top:4px">${esc(ME.phone)}</div></div></div>
            <div class="sec-t" style="margin:18px 0 8px"><h2 style="font-size:14px">Your households</h2></div>${myHouseholds().map((h) => `<button class="lrow" type="button" data-hh="${h.id}"><span class="avatar avatar--sq" style="--s:30px;font-size:10px">${esc(V3.initials(h.name))}</span><span class="lrow__t"><b>${esc(h.name)}</b><small>${esc(h.role)} · ${V3.dogsFor(h.id).map((d) => esc(d.name)).join(', ')}</small></span>${h.id === HH ? V3.state('active', 'Viewing') : icon('arrow-right-left')}</button>`).join('')}</div></section>
          <section class="panel"><div class="panel__h"><h3>${icon('shield-check')} Privacy &amp; consent</h3></div><div class="panel__b" style="display:grid;gap:12px">
            <dl class="dl"><dt>Default</dt><dd>Every video starts private to Linda</dd><dt>Household</dt><dd>Only invited adults in ${esc(hh().name)}</dd><dt>Public use</dt><dd>${consents.some((c) => c.kind.startsWith('Public') && c.status === 'active') ? 'Consent on file for specific clips' : 'No public consent given'}</dd><dt>AI</dt><dd>Drafts notes; Linda approves everything</dd></dl>
            ${consents.length ? consents.map((c) => `<div class="lrow" style="border:1px solid var(--line-soft);border-radius:12px;padding:10px 12px"><span class="lrow__t"><b>${esc(c.kind)}</b><small>${esc(c.evidence)} · ${V3.fmtDate(c.date, { day: 'numeric', month: 'short', year: 'numeric' })}</small></span>${V3.state(c.status)}${c.status === 'active' ? `<button class="btn btn--xs btn--ghost" type="button" data-withdraw="${c.id}">Withdraw</button>` : ''}</div>`).join('') : '<div class="locked">No consent records for this household.</div>'}
            <div class="row row--wrap"><button class="btn btn--ghost btn--sm" type="button" data-export>${icon('download')} Request my data</button><button class="btn btn--quiet btn--sm" type="button" data-delete>${icon('trash-2')} Ask to delete</button></div>
            <p class="mono faint" style="text-transform:none;letter-spacing:.02em">Removing a member ends their portal access. Video files already saved outside the portal can’t be recalled.</p>
          </div></section>
        </div>
      </div>`,
      mount(v) {
        v.addEventListener('change', (e) => { const k = e.target.dataset.pref; if (!k) return; prefs[k] = e.target.checked; V3.store.set('portal-notify', prefs); V3.toast(`${e.target.checked ? 'On' : 'Off'} · ${e.target.closest('.setrow').querySelector('b').textContent}`, { icon: 'bell' }); });
        v.addEventListener('click', async (e) => {
          const t = e.target.closest('button'); if (!t) return;
          if (t.dataset.hh) { if (t.dataset.hh !== HH) switchTo(t.dataset.hh); }
          if (t.hasAttribute('data-invite')) inviteModal();
          if (t.hasAttribute('data-signout')) { V3.store.del('session'); location.href = '/v3/login.html'; }
          if (t.hasAttribute('data-export')) V3.toast('Request sent to Linda', { sub: 'Demo · nothing sent', icon: 'download' });
          if (t.hasAttribute('data-delete')) { if (await V3.confirm('Ask Linda to delete your data?', 'Linda will confirm what can be deleted and what must be kept for records. Nothing happens automatically.', 'Send request')) V3.toast('Deletion request noted', { sub: 'Demo' }); }
          if (t.dataset.withdraw) { if (await V3.confirm('Withdraw this consent?', 'Linda will remove public editions that rely on it. This is recorded in the audit log.', 'Withdraw consent', true)) { const c = db.consents.find((x) => x.id === t.dataset.withdraw); c.status = 'withdrawn'; c.withdrawn = V3.nowISO().slice(0, 10); V3.audit('withdrew consent', c.kind, ME.name); V3.toast('Consent withdrawn', { sub: 'Linda has been notified' }); app.refresh(); } }
        });
      }
    };
  };
  function inviteModal() {
    const m = V3.modal({
      title: `Invite to ${esc(hh().name)}`, label: 'Household access', sub: 'They’ll get a personal, expiring invitation link and sign in with their own email.',
      body: `<form id="inv" novalidate style="display:grid;gap:14px"><div class="field"><label for="inv-name">Name</label><input class="input" id="inv-name" data-v="req" placeholder="e.g. Grandma Jo"><span class="field__error">${icon('circle-alert')} Add a name.</span></div><div class="field"><label for="inv-email">Email</label><input class="input" id="inv-email" type="email" data-v="req email" placeholder="name@example.co.nz"><span class="field__error">${icon('circle-alert')} Enter a valid email.</span></div>
        <div class="field"><span class="field__label">Access</span><div class="seg" role="group" data-perm><button type="button" aria-pressed="true" data-p="member">Member · can watch</button><button type="button" aria-pressed="false" data-p="owner">Owner · can invite</button></div></div>
        <div class="notice notice--info">${icon('info')}<span>A matching phone number isn’t enough — they must accept the invite while signed in.</span></div></form>`,
      foot: `<button class="btn btn--ghost" type="button" data-close>Cancel</button><button class="btn btn--accent" type="button" data-send>${icon('send')} Send invite</button>`,
      onOpen(root) {
        let perm = 'member';
        $('[data-perm]', root).addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (!b) return; perm = b.dataset.p; $$('[data-p]', root).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); });
        $('[data-send]', root).addEventListener('click', () => {
          if (!V3.validate($('#inv', root))) return;
          const name = $('#inv-name', root).value.trim(), email = $('#inv-email', root).value.trim();
          if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) { const f = $('#inv-email', root).closest('.field'); f.classList.add('is-invalid'); f.querySelector('.field__error').innerHTML = `${icon('circle-alert')} That email already has an account — Linda can link it.`; V3.icons(f); return; }
          const id = V3.uid('u');
          db.users.push({ id, name, role: 'client', email, phone: '', household: HH, permission: perm, invite: 'pending' });
          db.memberships.push({ user: id, household: HH, permission: perm, invite: 'pending' });
          hh().members.push(id);
          V3.audit('invited member', `${name} → ${hh().name}`, ME.name);
          V3.save(); m.close(); V3.toast(`Invitation ready for ${esc(name)}`, { sub: 'Expires in 7 days · demo', icon: 'send' }); app.refresh();
        });
      }
    });
  }

  routes['profile'] = () => {
    const d = hhDogs()[0];
    const vids = visibleMedia().filter((m) => m.dogs.includes(d.id));
    const posts = db.community.filter((c) => c.dog === d.id);
    return {
      title: `${d.name}’s public profile`, nav: 'profile', crumbs: [{ label: 'Coming soon' }, { label: `${d.name}’s profile` }],
      html: `<div class="notice notice--info" style="margin-bottom:16px">${icon('flask-conical')}<span><strong>Phase 3 preview.</strong> Owner-managed dog profiles aren’t live yet. Nothing here is public — this shows how it could work.</span></div>
      <div class="profile-cover"><img src="${esc(d.cover)}" alt=""></div>
      <div class="profile-av"><img src="${esc(d.avatar)}" alt="${esc(d.name)}"></div>
      <div class="g g-main" style="margin-top:12px">
        <div>
          <div class="row row--between row--wrap"><div><h1 class="t-2xl">${esc(d.name)}</h1><p class="muted">${esc(d.breed)} · ${esc(hh().suburb)} · @${esc(d.name.toLowerCase())}</p></div><div class="row"><button class="btn btn--sm" type="button" data-soon>${icon('user-plus')} Add friend</button><button class="btn btn--ghost btn--sm" type="button" data-soon>${icon('pencil')} Edit</button></div></div>
          <p style="margin-top:14px;font-size:15px;max-width:60ch">Collie-brained, food-motivated, mildly suspicious of ducks. Working on beach recall with Linda. <span class="mini-ph">owner-written bio</span></p>
          <div class="sec-t"><h2>Gallery</h2><span class="mono faint">Each item: private · household · friends · public</span></div>
          <div class="gallery soon-veil">${[d.photo, V3.img(1552, 15), V3.img(1550, 65), V3.img(1552, 90), V3.img(1550, 15), V3.img(1552, 65)].map((s) => `<div><img src="${esc(s)}" alt="" loading="lazy"></div>`).join('')}</div>
          ${posts.map((p) => `<div class="card card--pad" style="margin-top:14px;display:grid;gap:10px"><div class="row"><span class="avatar" style="--s:32px"><img src="${esc(d.avatar)}" alt=""></span><b style="font-weight:600">${esc(d.name)}</b><span class="mono faint">${esc(p.when)}</span><span class="pill pill--mono" style="margin-left:auto">${icon('users')} Friends</span></div><p>${esc(p.post)}</p><img src="${esc(p.img)}" alt="" style="border-radius:12px;aspect-ratio:16/9;object-fit:cover;width:100%"><div class="row" style="gap:14px;color:var(--text-2);font-size:13px"><span>${icon('heart')} ${p.likes}</span><span>${icon('message-circle')} ${p.comments}</span></div></div>`).join('')}
        </div>
        <aside class="g">
          <div class="panel"><div class="panel__h"><h3>${icon('trophy')} Milestones</h3></div><div class="panel__b list">${['First 10/10 recall at the park', 'Two-minute settle with joggers', 'Started beach recall'].map((x, i) => `<div class="lrow"><span class="lrow__ico">${icon(i === 0 ? 'flag' : 'sparkles')}</span><span class="lrow__t"><b>${x}</b><small>Optional · owner chooses to share</small></span></div>`).join('')}</div></div>
          <div class="panel"><div class="panel__h"><h3>${icon('lock')} Never on a profile</h3></div><div class="panel__b"><ul class="evidence list-reset">${['Linda’s training notes and assessments', 'Private session videos', 'Your contact details', 'Anything trainer-only'].map((x) => `<li>${icon('x')}${x}</li>`).join('')}</ul><p class="muted" style="font-size:12.5px;margin-top:10px">${vids.filter((m) => m.editorial === 'published_public').length} public training clip(s) could be linked — with consent.</p></div></div>
          <button class="btn btn--accent" type="button" data-soon>${icon('bell')} Tell me when it’s ready</button>
        </aside>
      </div>`,
      mount(v) { $$('[data-soon]', v).forEach((b) => b.addEventListener('click', () => V3.toast('Coming in Phase 3', { sub: 'Preview only', icon: 'flask-conical' }))); }
    };
  };

  /* Boot ------------------------------------------------------------ */
  const app = V3.App({
    product: 'Client portal',
    titleSuffix: 'Linda’s Dog Training',
    defaultRoute: 'dogs',
    user: { name: ME.name, sub: ME.email, initials: V3.initials(ME.name) },
    ctx: switcherHTML,
    onCtx: openSwitcher,
    nav: [
      { group: '', items: [
        { id: 'dogs', label: 'My Dogs', icon: 'paw-print', short: 'G D' },
        { id: 'sessions', label: 'Sessions', icon: 'calendar-days', short: 'G S' },
        { id: 'homework', label: 'Homework', icon: 'list-checks', short: 'G H', count: () => hwItems().filter((x) => !hwDone(x.key)).length, hot: true },
        { id: 'library', label: 'Training Library', icon: 'library', short: 'G L' },
        { id: 'account', label: 'Account', icon: 'user-round', short: 'G A' }
      ] },
      { group: 'Coming soon', items: [{ id: 'profile', label: 'Public profile', icon: 'sparkles' }] }
    ],
    tabs: [
      { id: 'dogs', label: 'Dogs', icon: 'paw-print' },
      { id: 'sessions', label: 'Sessions', icon: 'calendar-days' },
      { id: 'homework', label: 'Homework', icon: 'list-checks', count: () => hwItems().filter((x) => !hwDone(x.key)).length },
      { id: 'library', label: 'Library', icon: 'library' },
      { id: 'account', label: 'Account', icon: 'user-round' }
    ],
    routes,
    topActions: () => `<button class="icon-btn show-m" type="button" data-ctx-m aria-label="Switch household">${icon('house')}</button>`,
    palette: () => {
      const out = [];
      myHouseholds().forEach((h) => out.push({ group: 'Households', label: h.name, sub: h.id === HH ? 'current' : 'switch', icon: 'house', run: () => switchTo(h.id) }));
      hhDogs().forEach((d) => out.push({ group: 'Dogs', label: d.name, sub: d.breed, img: d.avatar, href: '#/dog/' + d.id }));
      visibleMedia().forEach((m) => out.push({ group: 'Videos', label: m.title, sub: V3.fmtDate(m.created), img: V3.thumb(m.clip), href: '#/video/' + m.id, keywords: m.techniques.map((t) => V3.technique(t).name).join(' ') }));
      db.guides.filter((g) => g.status === 'published').forEach((g) => out.push({ group: 'Guides', label: g.title, sub: g.level, icon: 'book-open', href: g.slug === 'recall-101' ? '/v3/guide/recall-101.html' : `/v3/guide/recall-101.html?g=${g.slug}` }));
      return out;
    },
    shortcuts: [
      { keys: 'G D', label: 'Go to My Dogs', run: () => app.go('#/dogs') },
      { keys: 'G S', label: 'Go to Sessions', run: () => app.go('#/sessions') },
      { keys: 'G H', label: 'Go to Homework', run: () => app.go('#/homework') },
      { keys: 'G L', label: 'Go to Library', run: () => app.go('#/library') },
      { keys: 'G A', label: 'Go to Account', run: () => app.go('#/account') },
      { keys: 'H', label: 'Switch household', run: () => openSwitcher($('[data-ctx]')) }
    ]
  });
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-ctx-m]'); if (b) openSwitcher(b); });
  // keep chrome counts fresh after homework changes
  document.addEventListener('change', (e) => { if (e.target.matches('[data-hw], [data-ghw]')) app.refreshChrome(); });
})();
