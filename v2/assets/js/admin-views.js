/* =========================================================
   PAWS & PLAY — admin views: inbox, CRM, sessions, media,
   groups, techniques, consent, audit, settings
   ========================================================= */
(function () {
  'use strict';
  const A = window.ADMIN, P = window.PAWS, L = window.LINDA, APP = window.APP, $ = P.$, $$ = P.$$;
  const G = typeof window.gsap !== 'undefined';
  const ic = P.ic, esc = P.esc;

  /* ================= WHATSAPP INBOX ================= */
  A.V.inbox = ({ query }) => {
    const tab = query.tab || 'unassigned';
    const tabs = [['unassigned', 'Unassigned', (i) => i.state === 'unassigned'], ['problems', 'Needs attention', (i) => i.state === 'too_large' || i.state === 'quarantined'], ['assigned', 'Assigned', (i) => i.state === 'assigned']];
    const cur = tabs.find((t) => t[0] === tab) || tabs[0];
    const list = L.inbox.filter(cur[2]);
    const card = (i) => {
      let media = '', acts = '', extra = '';
      if (i.kind === 'video' && i.state !== 'too_large') media = `<div class="ib-media"><img src="${i.thumb}" alt=""><span class="pill pill--ink" style="position:absolute;left:8px;bottom:8px">${ic('video')}${i.size}</span></div>`;
      else if (i.kind === 'voice') media = `<div class="ib-media voice">${ic('mic')}</div>`;
      else if (i.state === 'too_large') media = `<div class="ib-media big">${ic('file-warning')}</div>`;
      else media = `<div class="ib-media text">${ic('message-square-warning')}</div>`;
      if (i.state === 'unassigned' && i.kind === 'video') acts = `<button class="btn btn--sm btn--primary" type="button" data-assign="${i.id}">${ic('dog')}Assign to dog</button><button class="btn btn--sm btn--ghost" type="button" data-dismiss="${i.id}">Dismiss</button>`;
      if (i.state === 'unassigned' && i.kind === 'voice') { extra = `<div class="wave" aria-hidden="true">${Array.from({ length: 34 }, (_, k) => `<i style="height:${8 + Math.abs(Math.sin(k * 1.7)) * 22}px"></i>`).join('')}</div><div class="transcript small"><b>${ic('captions', 'inline-ic')} Transcript</b><br>${esc(i.transcript)}</div><p class="xsmall muted" style="margin:0">The short-lived audio copy is deleted after transcription — only the text is kept.</p>`; acts = `<button class="btn btn--sm btn--primary" type="button" data-note="${i.id}">${ic('notebook-pen')}Save as note…</button>`; }
      if (i.state === 'too_large') { extra = `<div class="callout callout--warn">${ic('alert-triangle')}<div><strong>Never delivered</strong><p>${esc(i.error)}</p></div></div>`; acts = `<a class="btn btn--sm btn--primary" href="#/record">${ic('smartphone')}Use PWA upload instead</a><button class="btn btn--sm btn--ghost" type="button" data-dismiss="${i.id}">Dismiss</button>`; }
      if (i.state === 'quarantined') { extra = `<div class="callout callout--ink">${ic('shield-alert')}<div><strong>Unknown sender quarantined</strong><p>Only authorised trainer numbers can add to the archive. Nothing from this sender was processed.</p></div></div>`; acts = `<button class="btn btn--sm" type="button" data-dismiss="${i.id}">${ic('trash-2')}Dismiss</button><button class="btn btn--sm btn--ghost" type="button" data-allow>${ic('shield-check')}Manage senders</button>`; }
      if (i.state === 'assigned') { const d = L.dog(i.assignedTo); extra = `<div class="row small" style="font-weight:700">${ic('check-circle-2')}Assigned to ${esc(d ? d.name : '')}${i.media ? ` · <a class="link" href="#/review/${i.media}">Open in review</a>` : ''}</div>`; }
      return `<article class="inbox-card" data-item="${i.id}">${media}<div class="ib-body"><div class="row row--between row--wrap"><span class="row" style="gap:8px">${P.status(i.state)}${i.forwarded ? `<span class="pill pill--soft">${ic('forward')}Forwarded</span>` : ''}</span><small>${APP.ago(i.received)}</small></div>
        <span class="cap">${esc(i.caption)}</span><small>From ${esc(i.from)} · ${i.kind}${i.duration ? ' · ' + i.duration : ''}${i.size ? ' · ' + i.size : ''}</small>${extra}<div class="row row--wrap">${acts}</div></div></article>`;
    };
    return {
      title: 'WhatsApp inbox', short: 'Inbox',
      html: A.vhead('Archive number · inbound only', 'inbox', 'WhatsApp inbox', `Forward clips from your personal WhatsApp to <b>${esc(L.brand.archiveNumber)}</b>. We never guess whose dog it is — you assign it.`, `<button class="btn" type="button" data-copy>${ic('copy')}Copy archive number</button>`) +
        `<div class="tabs" role="tablist" style="margin-bottom:20px">${tabs.map(([k, l, fn]) => `<a href="#/inbox?tab=${k}" role="tab" aria-selected="${k === tab}">${l} <span class="count" style="margin-left:6px">${L.inbox.filter(fn).length}</span></a>`).join('')}</div>
        <div class="grid" style="gap:16px">${list.map(card).join('') || A.empty('inbox', 'Inbox zero!', 'Nothing waiting here. Forwarded clips will show up as they arrive.')}</div>`,
      mount(el) {
        $('[data-copy]', el).addEventListener('click', () => { try { navigator.clipboard.writeText(L.brand.archiveNumber); } catch (e) { /* noop */ } P.toast('Archive number copied', { tone: 'ok', icon: 'copy' }); });
        el.addEventListener('click', (e) => {
          const a = e.target.closest('[data-assign]'); if (a) A.assignInbox(a.dataset.assign);
          const n = e.target.closest('[data-note]'); if (n) A.voiceToNote(n.dataset.note);
          const d = e.target.closest('[data-dismiss]'); if (d) { const it = L.inbox.find((x) => x.id === d.dataset.dismiss); const card = d.closest('.inbox-card'); const fin = () => { P.db.patch('inbox', it.id, { state: 'dismissed' }); A.audit('dismissed inbox item', it.caption); A.badges(); A.router.refresh(); }; if (G && !P.reduced) gsap.to(card, { x: 80, opacity: 0, duration: .35, onComplete: fin }); else fin(); P.toast('Dismissed', { icon: 'archive', action: 'Undo', onAction: () => { P.db.patch('inbox', it.id, { state: it.state }); A.router.refresh(); A.badges(); } }); }
          if (e.target.closest('[data-allow]')) A.go('/settings');
        });
        APP.popIn(el, '.inbox-card');
      }
    };
  };
  A.assignInbox = (id) => {
    const it = L.inbox.find((x) => x.id === id); let pickDog = null;
    P.modal({ title: 'Assign forwarded clip', wide: true,
      html: `<div class="grid grid-2" style="gap:18px;align-items:start"><div><div class="vframe ratio-16x9"><video muted playsinline autoplay loop src="/shared/media/video/${it.clip}.mp4" poster="${it.thumb}"></video></div><p class="small" style="margin-top:10px"><b>“${esc(it.caption)}”</b><br><span class="muted">Forwarded messages don’t tell us the original chat or dog, so you choose.</span></p></div>
        <div><label class="input-icon" style="display:block;margin-bottom:12px"><span class="sr-only">Search dogs</span><i data-lucide="search"></i><input class="input" type="search" placeholder="Search dogs…" data-q></label>
        <div class="list" data-dogs style="max-height:300px;overflow:auto" data-lenis-prevent>${L.dogs.filter((d) => L.household(d.household).status === 'active').map((d) => `<button class="lrow" type="button" data-d="${d.id}" data-k="${(d.name + ' ' + d.breed + ' ' + L.household(d.household).name).toLowerCase()}">${APP.avatar(d.name, d.avatar)}<span class="meta"><b>${esc(d.name)}</b><small>${esc(d.breed)} · ${esc(L.household(d.household).name)}</small></span><span class="end" data-tick></span></button>`).join('')}</div>
        <div class="field" style="margin-top:14px"><label class="label" for="as-sess">Session</label><select class="select" id="as-sess" disabled><option>Pick a dog first</option></select></div></div></div>`,
      onOpen(api) {
        const q = $('[data-q]', api.el); q.addEventListener('input', () => $$('[data-d]', api.el).forEach((b) => (b.hidden = !b.dataset.k.includes(q.value.toLowerCase()))));
        $('[data-dogs]', api.el).addEventListener('click', (e) => { const b = e.target.closest('[data-d]'); if (!b) return; pickDog = b.dataset.d; $$('[data-d]', api.el).forEach((x) => { x.style.background = x === b ? 'var(--sun)' : ''; x.querySelector('[data-tick]').innerHTML = x === b ? ic('check-circle-2') : ''; }); P.icons(); const ss = L.sessionsFor(pickDog).sort((x, y) => y.date.localeCompare(x.date)); const sel = $('#as-sess', api.el); sel.disabled = false; sel.innerHTML = `<option value="">No session (just the dog)</option>` + ss.map((s) => `<option value="${s.id}">${esc(s.title)} · ${L.fmtDate(s.date)}</option>`).join(''); });
      },
      actions: [{ label: 'Cancel', cls: 'btn--outline' }, { label: 'Assign & send to review', cls: 'btn--primary', icon: 'check', onClick: (api) => {
        if (!pickDog) { P.toast('Pick a dog first', { tone: 'err' }); return false; }
        const sess = $('#as-sess', api.el).value || null; const d = L.dog(pickDog);
        const mid = 'm-' + Math.random().toString(36).slice(2, 6);
        const m = { id: mid, clip: it.clip, title: it.caption.replace(/^Fwd:\s*/i, '').replace(/^./, (c) => c.toUpperCase()), dogs: [pickDog], session: sess, source: 'whatsapp_archive', processing: 'ready', editorial: 'needs_review', duration: '0:21', created: A.now(), techniques: [], visibility: 'trainer_only', views: 0, notes: '', timestamps: [], ai: null };
        m.ai = A.makeAI(m); P.db.add('media', m);
        if (sess) { const s = L.session(sess); P.db.patch('sessions', sess, { media: s.media.concat(mid) }); }
        P.db.patch('inbox', it.id, { state: 'assigned', assignedTo: pickDog, media: mid });
        A.audit('assigned inbox item', `${it.caption} → ${d.name}`);
        P.toast(`Assigned to ${esc(d.name)} — it’s in your review queue`, { tone: 'ok', icon: 'check', action: 'Review', onAction: () => A.go('/review/' + mid) });
        A.badges(); A.router.refresh();
      } }] });
  };
  A.voiceToNote = (id) => {
    const it = L.inbox.find((x) => x.id === id); const guess = L.dogs.find((d) => it.caption.includes(d.name));
    P.modal({ title: 'Save voice note as a note', html: `<div class="field"><label class="label" for="vn-dog">Dog</label><select class="select" id="vn-dog">${L.dogs.map((d) => `<option value="${d.id}" ${guess && guess.id === d.id ? 'selected' : ''}>${esc(d.name)} · ${esc(L.household(d.household).name)}</option>`).join('')}</select><span class="hint">${guess ? 'The caption mentions ' + esc(guess.name) + ' — please confirm.' : ''}</span></div><div class="field"><label class="label" for="vn-text">Note</label><textarea class="textarea" id="vn-text">${esc(it.transcript)}</textarea></div>`,
      actions: [{ label: 'Cancel', cls: 'btn--outline' }, { label: 'Save note', cls: 'btn--primary', icon: 'check', onClick: (api) => {
        const dog = L.dog($('#vn-dog', api.el).value); P.db.patch('dogs', dog.id, { notes: dog.notes + '\n\nVoice note (' + L.fmtDate(it.received) + '): ' + $('#vn-text', api.el).value });
        P.db.patch('inbox', it.id, { state: 'assigned', assignedTo: dog.id }); A.audit('saved voice note', dog.name); P.toast(`Note added to ${esc(dog.name)}`, { tone: 'ok', icon: 'notebook-pen' }); A.badges(); A.router.refresh();
      } }] });
  };

  /* ================= CLIENTS / HOUSEHOLDS ================= */
  A.V.clients = ({ query }) => {
    const st = query.s || 'active';
    const list = L.households.filter((h) => st === 'all' || h.status === st);
    return {
      title: 'Clients & households', short: 'Clients',
      html: A.vhead('CRM', 'users', 'Clients & households', `${L.households.filter((h) => h.status === 'active').length} active households · ${L.dogs.length} dogs`, `<button class="btn btn--primary" type="button" data-newhh>${ic('house-plus')}New household</button><button class="btn" type="button" data-newdog>${ic('dog')}Add dog</button>`) +
        `<div class="fbar"><label class="input-icon"><span class="sr-only">Search</span><i data-lucide="search"></i><input class="input" type="search" placeholder="Search names, emails, phones, dogs…" data-q></label><div class="seg" role="group" aria-label="Status">${[['active', 'Active'], ['inactive', 'Inactive'], ['all', 'All']].map(([v, l]) => `<button type="button" aria-pressed="${st === v}" data-s="${v}">${l}</button>`).join('')}</div></div>
        <div class="table-wrap"><table class="table table--stack"><thead><tr><th>Household</th><th>Members</th><th>Dogs</th><th>Status</th><th>Client since</th><th></th></tr></thead><tbody>
        ${list.map((h) => { const mem = h.members.map(L.user).filter(Boolean); return `<tr class="is-link" data-href="#/household/${h.id}" data-k="${esc((h.name + ' ' + h.suburb + ' ' + mem.map((u) => u.name + ' ' + u.email + ' ' + u.phone).join(' ') + ' ' + L.dogsFor(h.id).map((d) => d.name).join(' ')).toLowerCase())}">
          <td data-l=""><a href="#/household/${h.id}" style="text-decoration:none;display:flex;gap:12px;align-items:center"><span class="avatar" style="background:${APP.colorFor(h.name)}">${ic('house')}</span><span><b>${esc(h.name)}</b><br><span class="small muted">${esc(h.suburb)}</span></span></a></td>
          <td data-l="Members"><span class="avatars">${mem.map((u) => APP.avatar(u.name, null, 'avatar--sm')).join('')}</span></td>
          <td data-l="Dogs"><span class="avatars">${L.dogsFor(h.id).map((d) => APP.avatar(d.name, d.avatar, 'avatar--sm')).join('')}</span> <span class="small" style="font-weight:700">${L.dogsFor(h.id).map((d) => esc(d.name)).join(', ')}</span></td>
          <td data-l="Status">${P.status(h.status)}</td><td data-l="Since">${L.fmtDate(h.since, { day: 'numeric', month: 'short', year: 'numeric' })}</td><td data-l="">${ic('chevron-right')}</td></tr>`; }).join('')}
        </tbody></table></div>`,
      mount(el) {
        $$('tr[data-href]', el).forEach((tr) => tr.addEventListener('click', (e) => { if (!e.target.closest('a')) A.go(tr.dataset.href.slice(1)); }));
        $('[data-q]', el).addEventListener('input', (e) => { const v = e.target.value.toLowerCase(); $$('tr[data-k]', el).forEach((tr) => (tr.hidden = v && !tr.dataset.k.includes(v))); });
        $$('[data-s]', el).forEach((b) => b.addEventListener('click', () => A.go('/clients?s=' + b.dataset.s)));
        $('[data-newhh]', el).addEventListener('click', () => A.newHousehold());
        $('[data-newdog]', el).addEventListener('click', () => A.newDog());
        APP.popIn(el, 'tr');
      }
    };
  };
  A.newHousehold = () => {
    P.modal({ title: 'New household', html: `<div class="field"><label class="label" for="nh-name">Household name</label><input class="input" id="nh-name" placeholder="e.g. Rangi whānau"></div>
      <div class="field"><label class="label" for="nh-contact">Primary contact</label><input class="input" id="nh-contact" placeholder="Full name"></div>
      <div class="grid grid-2" style="gap:14px;margin-top:16px"><div class="field" style="margin:0"><label class="label" for="nh-email">Email</label><input class="input" id="nh-email" type="email" placeholder="name@example.co.nz"></div><div class="field" style="margin:0"><label class="label" for="nh-phone">Mobile</label><input class="input" id="nh-phone" type="tel" placeholder="+64 21 …"><span class="hint">Stored in international format</span></div></div>
      <div class="field"><label class="label" for="nh-sub">Suburb</label><input class="input" id="nh-sub" placeholder="e.g. Ponsonby"></div>
      <div data-dupe></div><p class="xsmall muted" style="margin-top:14px">Tip: try <b>sarah.t@example.co.nz</b> or <b>+64 21 384 2210</b> to see the duplicate-contact check.</p>`,
      onOpen(api) {
        const chk = () => {
          const e = $('#nh-email', api.el).value.trim().toLowerCase(); const ph = $('#nh-phone', api.el).value.replace(/\s/g, '');
          const hit = L.users.find((u) => (e && u.email === e) || (ph.length > 6 && u.phone && u.phone.replace(/\s/g, '') === ph));
          $('[data-dupe]', api.el).innerHTML = hit ? `<div class="callout callout--warn" style="margin-top:16px">${ic('users')}<div><strong>Possible duplicate contact</strong><p>This matches <b>${esc(hit.name)}</b> in ${esc((L.household(hit.household) || { name: 'another household' }).name)}. Matching details never link records automatically — open that household, or continue to create a separate one.</p><a class="btn btn--sm" style="margin-top:8px" href="#/household/${hit.household}" data-close>Open ${esc((L.household(hit.household) || {}).name || '')}</a></div></div>` : '';
          P.icons();
        };
        $('#nh-email', api.el).addEventListener('input', chk); $('#nh-phone', api.el).addEventListener('input', chk);
      },
      actions: [{ label: 'Cancel', cls: 'btn--outline' }, { label: 'Create household', cls: 'btn--primary', icon: 'check', onClick: (api) => {
        const name = $('#nh-name', api.el).value.trim(), contact = $('#nh-contact', api.el).value.trim(), email = $('#nh-email', api.el).value.trim();
        if (!name || !contact || !/^\S+@\S+\.\S+$/.test(email)) { P.toast('Name, contact and a valid email please', { tone: 'err' }); return false; }
        const hid = 'h-' + Math.random().toString(36).slice(2, 6), uid = 'u-' + Math.random().toString(36).slice(2, 6);
        P.db.add('users', { id: uid, name: contact, role: 'client', email, phone: $('#nh-phone', api.el).value.trim(), household: hid, permission: 'owner', invite: 'pending' });
        P.db.add('households', { id: hid, name, suburb: $('#nh-sub', api.el).value.trim() || '—', status: 'active', primary: uid, members: [uid], dogs: [], since: '2026-10-17' });
        A.audit('created household', name); P.toast(`${esc(name)} created — invitation queued for ${esc(email)}`, { tone: 'ok', icon: 'house-plus' }); A.go('/household/' + hid);
      } }] });
  };
  A.newDog = (hid) => {
    P.modal({ title: 'Add a dog', html: `<div class="field"><label class="label" for="nd-hh">Household</label><select class="select" id="nd-hh">${L.households.filter((h) => h.status === 'active').map((h) => `<option value="${h.id}" ${hid === h.id ? 'selected' : ''}>${esc(h.name)}</option>`).join('')}</select></div>
      <div class="grid grid-2" style="gap:14px;margin-top:16px"><div class="field" style="margin:0"><label class="label" for="nd-name">Name</label><input class="input" id="nd-name" placeholder="e.g. Nugget"></div><div class="field" style="margin:0"><label class="label" for="nd-breed">Breed <span class="hint">(optional)</span></label><input class="input" id="nd-breed" placeholder="e.g. Spoodle"></div></div>
      <div class="grid grid-2" style="gap:14px;margin-top:16px"><div class="field" style="margin:0"><label class="label" for="nd-dob">Date of birth <span class="hint">(optional)</span></label><input class="input" id="nd-dob" type="date"></div><div class="field" style="margin:0"><label class="label" for="nd-status">Training status</label><select class="select" id="nd-status"><option>In training</option><option>Puppy class</option><option>Maintenance</option></select></div></div>
      <div class="field"><label class="label" for="nd-notes">Notes</label><textarea class="textarea" id="nd-notes" placeholder="Motivators, sensitivities, goals…"></textarea></div><p class="xsmall muted">Dog names don’t need to be unique — two Bellas are fine.</p>`,
      actions: [{ label: 'Cancel', cls: 'btn--outline' }, { label: 'Add dog', cls: 'btn--primary', icon: 'check', onClick: (api) => {
        const name = $('#nd-name', api.el).value.trim(); if (!name) { P.toast('Your new client needs a name!', { tone: 'err' }); return false; }
        const h = L.household($('#nd-hh', api.el).value); const id = 'd-' + Math.random().toString(36).slice(2, 6); const clips = [50688, 1557, 1549, 50683]; const clip = clips[Math.floor(Math.random() * clips.length)];
        P.db.add('dogs', { id, name, breed: $('#nd-breed', api.el).value.trim() || 'Mixed breed', age: '—', dob: $('#nd-dob', api.el).value, sex: '', household: h.id, status: $('#nd-status', api.el).value, clip, photo: L.img(clip, 40), cover: L.img(clip, 65), avatar: L.thumb(clip, 40), goals: [], notes: $('#nd-notes', api.el).value, progress: 0, techniques: [] });
        P.db.patch('households', h.id, { dogs: h.dogs.concat(id) });
        A.audit('added dog', `${name} → ${h.name}`); P.toast(`${esc(name)} added to ${esc(h.name)} 🐾`, { tone: 'ok', icon: 'dog' }); A.go('/dog/' + id);
      } }] });
  };

  A.V.household = ({ params }) => {
    const h = L.household(params.id); if (!h) return A.empty('house', 'Household not found', '', '<a class="btn" href="#/clients">Back</a>');
    const mem = h.members.map(L.user).filter(Boolean); const dogs = L.dogsFor(h.id);
    const sess = L.sessions.filter((s) => s.household === h.id).sort((a, b) => b.date.localeCompare(a.date));
    const media = L.media.filter((m) => m.dogs.some((d) => dogs.some((x) => x.id === d)));
    const groups = L.groups.filter((g) => g.members.includes(h.id));
    return {
      title: h.name, short: 'Household',
      html: `<a class="back-link" href="#/clients">${ic('arrow-left')}Clients</a>` + A.vhead(esc(h.suburb) + ' · since ' + L.fmtDate(h.since, { month: 'short', year: 'numeric' }), 'house', esc(h.name), '', `${P.status(h.status)}<button class="btn" type="button" data-rec>${ic('circle-dot')}Record for this household</button><button class="btn btn--outline" type="button" data-deact>${h.status === 'active' ? ic('pause') + 'Deactivate' : ic('play') + 'Reactivate'}</button>`) +
        (h.status === 'inactive' ? `<div class="callout callout--warn" style="margin-bottom:20px">${ic('pause-circle')}<div><strong>Household inactive</strong><p>Media is retained but portal access is paused. Nothing was deleted or exposed.</p></div></div>` : '') +
        `<div class="bento">
          <section class="card c-6"><div class="card-head"><h2>Members</h2><button class="btn btn--sm btn--primary" type="button" data-invite>${ic('user-plus')}Invite</button></div>
            ${mem.map((u) => `<div class="lrow" style="margin-bottom:8px">${APP.avatar(u.name)}<span class="meta"><b>${esc(u.name)} ${u.permission === 'owner' ? '<span class="pill pill--ink" style="margin-left:4px">Owner</span>' : ''}</b><small>${esc(u.email)} · ${esc(u.phone || '')}</small></span><span class="end">${P.status(u.invite)}${u.invite === 'pending' || u.invite === 'expired' ? `<button class="btn btn--sm" type="button" data-resend="${u.id}">Resend</button>` : ''}${u.invite === 'accepted' && u.permission !== 'owner' ? `<button class="btn btn--sm btn--ghost" type="button" data-revoke="${u.id}">Revoke</button>` : ''}</span></div>`).join('')}</section>
          <section class="card c-6"><div class="card-head"><h2>Dogs</h2><button class="btn btn--sm" type="button" data-adddog>${ic('plus')}Add dog</button></div>
            <div class="grid grid-2" style="gap:12px">${dogs.map((d) => `<a class="card card--sm card--hover" href="#/dog/${d.id}" style="text-decoration:none;display:flex;gap:12px;align-items:center;background:var(--sun-tint)">${APP.avatar(d.name, d.avatar, 'avatar--lg')}<span><b style="font-family:var(--font-display);font-size:1.3rem;display:block">${esc(d.name)}</b><small class="muted" style="font-weight:600">${esc(d.breed)} · ${d.age}</small><br><span class="pill" style="margin-top:4px">${esc(d.status)}</span></span></a>`).join('') || '<p class="muted">No dogs yet.</p>'}</div></section>
          <section class="card c-7"><div class="card-head"><h2>Sessions</h2><button class="btn btn--sm" type="button" data-newsess>${ic('calendar-plus')}New</button></div><div class="list">${sess.map((s) => `<a class="lrow" href="#/session/${s.id}"><span class="meta"><b>${esc(s.title)}</b><small>${APP.when(s.date)} · ${esc(s.location)} · ${s.media.length} clips</small></span><span class="end">${P.status(s.status)}</span></a>`).join('') || '<p class="muted">No sessions yet.</p>'}</div></section>
          <section class="card c-5"><div class="card-head"><h2>Groups &amp; consent</h2></div>${groups.map((g) => `<a class="lrow" href="#/groups" style="margin-bottom:8px"><span class="avatar avatar--sm" style="background:${g.color}">${ic('users-round')}</span><span class="meta"><b>${esc(g.title)}</b><small>${g.type}</small></span></a>`).join('') || '<p class="small muted">Not in any training groups.</p>'}
            <div style="margin-top:10px">${L.consents.filter((c) => mem.some((u) => c.subject.includes(u.name))).map((c) => `<div class="lrow"><span class="meta"><b>${esc(c.kind)}</b><small>${esc(c.evidence)} · ${L.fmtDate(c.date)}</small></span>${P.status(c.status)}</div>`).join('') || '<p class="small muted">No consent records — public use is not allowed.</p>'}</div></section>
          <section class="card c-12"><div class="card-head"><h2>Media</h2><span class="pill">${media.length} clips · trainer view (all states)</span></div><div class="mgrid">${media.map((m) => A.mediaTile(m)).join('') || '<p class="muted">No media yet.</p>'}</div></section>
        </div>`,
      mount(el) {
        $('[data-rec]', el).addEventListener('click', () => { A.S.ctx = { hh: h.id, dogs: dogs.length === 1 ? [dogs[0].id] : [], session: null }; A.save(); A.renderCtx(); A.go(dogs.length === 1 ? '/record?step=session' : '/record?step=dog'); });
        $('[data-deact]', el).addEventListener('click', () => { const on = h.status === 'active'; P.confirm(on ? 'Deactivate household?' : 'Reactivate household?', on ? 'Members lose portal access. Media and records are kept (nothing is deleted or made public).' : 'Members regain access to previously shared media.', on ? 'Deactivate' : 'Reactivate', () => { P.db.patch('households', h.id, { status: on ? 'inactive' : 'active' }); A.audit(on ? 'deactivated household' : 'reactivated household', h.name); A.router.refresh(); }); });
        $('[data-invite]', el).addEventListener('click', () => P.modal({ title: 'Invite to ' + esc(h.name), html: `<div class="field"><label class="label" for="iv-n">Name</label><input class="input" id="iv-n"></div><div class="field"><label class="label" for="iv-e">Email</label><input class="input" id="iv-e" type="email"></div><div class="field"><span class="label">Permission</span><div class="seg" data-perm><button type="button" aria-pressed="true">Member</button><button type="button" aria-pressed="false">Owner</button></div></div><p class="xsmall muted" style="margin-top:12px">Invitations expire after 7 days. Membership needs an accepted invite — a matching phone number is never enough.</p>`,
          onOpen(api) { $('[data-perm]', api.el).addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) $$('[data-perm] button', api.el).forEach((x) => x.setAttribute('aria-pressed', x === b)); }); },
          actions: [{ label: 'Cancel', cls: 'btn--outline' }, { label: 'Send invite', cls: 'btn--primary', icon: 'send', onClick: (api) => { const n = $('#iv-n', api.el).value.trim(), e = $('#iv-e', api.el).value.trim(); if (!n || !/^\S+@\S+\.\S+$/.test(e)) { P.toast('Name and valid email please', { tone: 'err' }); return false; } const uid = 'u-' + Math.random().toString(36).slice(2, 6); P.db.add('users', { id: uid, name: n, role: 'client', email: e, household: h.id, permission: $('[data-perm] [aria-pressed="true"]', api.el).textContent.toLowerCase(), invite: 'pending' }); P.db.patch('households', h.id, { members: h.members.concat(uid) }); A.audit('invited member', `${n} → ${h.name}`); P.toast(`Invitation sent to ${esc(e)}`, { tone: 'ok', icon: 'mail-check' }); A.router.refresh(); } }] }));
        el.addEventListener('click', (e) => {
          const r = e.target.closest('[data-resend]'); if (r) { P.db.patch('users', r.dataset.resend, { invite: 'pending' }); P.toast('Invitation re-sent (expires in 7 days)', { tone: 'ok', icon: 'mail' }); A.audit('resent invitation', L.user(r.dataset.resend).name); A.router.refresh(); }
          const v = e.target.closest('[data-revoke]'); if (v) { const u = L.user(v.dataset.revoke); P.confirm('Revoke access?', `${esc(u.name)} will immediately lose playback access to ${esc(h.name)}’s videos. Files already sent outside the portal can’t be recalled.`, 'Revoke access', () => { P.db.patch('users', u.id, { invite: 'revoked' }); A.audit('revoked access', `${u.name} — ${h.name}`); P.toast('Access revoked', { icon: 'user-x' }); A.router.refresh(); }); }
        });
        $('[data-adddog]', el).addEventListener('click', () => A.newDog(h.id));
        $('[data-newsess]', el).addEventListener('click', () => A.newSession(h.id));
        APP.popIn(el, '.card');
      }
    };
  };

  /* ================= DOGS ================= */
  A.V.dogs = () => ({
    title: 'Dogs', short: 'Dogs',
    html: A.vhead('CRM', 'dog', 'Dogs', `${L.dogs.length} good dogs`, `<button class="btn btn--primary" type="button" data-newdog>${ic('plus')}Add dog</button>`) +
      `<div class="fbar"><label class="input-icon"><span class="sr-only">Search dogs</span><i data-lucide="search"></i><input class="input" type="search" placeholder="Search dogs or breeds…" data-q></label></div>
      <div class="mgrid">${L.dogs.map((d) => `<a class="mtile" href="#/dog/${d.id}" data-k="${(d.name + ' ' + d.breed).toLowerCase()}"><div class="mt-media"><img src="${L.thumb(d.clip, 40)}" alt=""><div class="mt-tl"><span class="pill pill--sun">${esc(d.status)}</span></div></div><div class="mt-body" style="display:flex;gap:12px;align-items:center">${APP.avatar(d.name, d.avatar, 'avatar--lg')}<div style="min-width:0;flex:1"><h3 class="mt-title" style="font-size:1.3rem">${esc(d.name)}</h3><div class="mt-meta">${esc(d.breed)} · ${esc(L.household(d.household).name)}</div><div class="progress progress--sm" style="margin-top:8px"><i style="--v:${d.progress}%"></i></div></div></div></a>`).join('')}</div>`,
    mount(el) { $('[data-newdog]', el).addEventListener('click', () => A.newDog()); $('[data-q]', el).addEventListener('input', (e) => $$('[data-k]', el).forEach((t) => (t.hidden = !t.dataset.k.includes(e.target.value.toLowerCase())))); APP.popIn(el, '.mtile'); }
  });
  A.V.dog = ({ params }) => {
    const d = L.dog(params.id); if (!d) return A.empty('dog', 'Dog not found', '', '<a class="btn" href="#/dogs">Back</a>');
    const h = L.household(d.household); const sess = L.sessionsFor(d.id).sort((a, b) => b.date.localeCompare(a.date)); const media = L.mediaFor(d.id);
    return {
      title: d.name, short: d.name,
      html: `<a class="back-link" href="#/household/${h.id}">${ic('arrow-left')}${esc(h.name)}</a>
        <section class="card" style="background:var(--sun);display:flex;gap:20px;align-items:center;flex-wrap:wrap;margin:8px 0 22px">${APP.avatar(d.name, d.avatar, 'avatar--xl')}<div style="flex:1;min-width:200px"><h1 style="margin:0;font-size:clamp(2.4rem,1.6rem + 3vw,4rem)">${esc(d.name)}</h1><div class="row row--wrap" style="margin-top:8px"><span class="pill pill--lg">${esc(d.breed)}</span><span class="pill pill--lg">${d.age}${d.sex ? ' · ' + d.sex : ''}</span><span class="pill pill--lg pill--ink">${esc(d.status)}</span></div></div>
          <div class="row row--wrap"><button class="btn btn--primary btn--lg" type="button" data-rec>${ic('circle-dot')}Record for ${esc(d.name)}</button><a class="btn btn--lg" href="#/share">${ic('send')}Share</a></div></section>
        <div class="bento">
          <section class="card c-5"><div class="card-head"><h2>Profile</h2><button class="btn btn--sm" type="button" data-save>${ic('save')}Save</button></div>
            <div class="field"><label class="label" for="dg-notes">Trainer notes</label><textarea class="textarea" id="dg-notes">${esc(d.notes)}</textarea><span class="hint">Visible to the household in their portal.</span></div>
            <div class="field"><label class="label" for="dg-goals">Goals <span class="hint">(one per line)</span></label><textarea class="textarea" id="dg-goals" style="min-height:90px">${esc(d.goals.join('\n'))}</textarea></div>
            <div class="field"><div class="range-row"><div class="row"><label class="label" for="dg-prog">Progress</label><b data-pv>${d.progress}%</b></div><input type="range" id="dg-prog" min="0" max="100" value="${d.progress}"></div></div>
            <div class="field"><span class="label">Techniques</span><div class="chips" data-techs>${L.techniques.map((t) => `<button type="button" class="chip" aria-pressed="${d.techniques.includes(t.id)}" data-t="${t.id}"><span class="swatch" style="background:${t.color}"></span>${esc(t.name)}</button>`).join('')}</div></div></section>
          <section class="card c-7"><div class="card-head"><h2>Sessions</h2></div><div class="timeline">${sess.map((s) => `<div class="tl-item ${s.status !== 'completed' ? 'is-future' : ''}"><a class="lrow" href="#/session/${s.id}"><span class="meta"><b>${esc(s.title)}</b><small>${APP.when(s.date)} · ${s.media.length} clips · ${s.homework.length} homework</small></span>${P.status(s.status)}</a></div>`).join('') || '<p class="muted">No sessions yet.</p>'}</div></section>
          <section class="card c-12"><div class="card-head"><h2>All media</h2><span class="pill">Trainer view · every state</span></div><div class="mgrid">${media.map((m) => A.mediaTile(m)).join('') || A.empty('video', 'No clips yet', 'Record one from the button above.')}</div></section>
        </div>`,
      mount(el) {
        $('[data-rec]', el).addEventListener('click', () => { const act = L.sessions.find((s) => s.status === 'active' && s.dogs.includes(d.id)); A.S.ctx = { hh: h.id, dogs: [d.id], session: act ? act.id : null }; A.save(); A.renderCtx(); A.go(act ? '/camera' : '/record?step=session'); });
        $('#dg-prog', el).addEventListener('input', (e) => ($('[data-pv]', el).textContent = e.target.value + '%'));
        $('[data-techs]', el).addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); });
        $('[data-save]', el).addEventListener('click', () => { P.db.patch('dogs', d.id, { notes: $('#dg-notes', el).value, goals: $('#dg-goals', el).value.split('\n').map((x) => x.trim()).filter(Boolean), progress: +$('#dg-prog', el).value, techniques: $$('[data-t][aria-pressed="true"]', el).map((b) => b.dataset.t) }); A.audit('edited dog', d.name); P.toast(`${esc(d.name)} saved`, { tone: 'ok', icon: 'save' }); });
        APP.popIn(el, '.card');
      }
    };
  };

  /* ================= SESSIONS ================= */
  A.newSession = (hid) => {
    P.modal({ title: 'New session', html: `<div class="field"><label class="label" for="ns-hh">Household</label><select class="select" id="ns-hh">${L.households.filter((h) => h.status === 'active').map((h) => `<option value="${h.id}" ${hid === h.id ? 'selected' : ''}>${esc(h.name)}</option>`).join('')}</select></div><div class="field"><span class="label">Dogs</span><div class="chips" data-dogs></div></div>
      <div class="field"><label class="label" for="ns-title">Focus</label><input class="input" id="ns-title" placeholder="e.g. Recall with distractions"></div><div class="grid grid-2" style="gap:14px;margin-top:16px"><div class="field" style="margin:0"><label class="label" for="ns-date">When</label><input class="input" id="ns-date" type="datetime-local" value="2026-10-17T15:00"></div><div class="field" style="margin:0"><label class="label" for="ns-loc">Where</label><input class="input" id="ns-loc" placeholder="e.g. Western Springs park"></div></div>
      <label class="check" style="margin-top:12px"><input type="checkbox" id="ns-start" checked><span class="box">${ic('check')}</span><span class="txt">Start now &amp; make it my recording context</span></label>`,
      onOpen(api) { const fill = () => { $('[data-dogs]', api.el).innerHTML = L.dogsFor($('#ns-hh', api.el).value).map((d, i) => `<button type="button" class="chip" aria-pressed="${i === 0}" data-d="${d.id}">${APP.avatar(d.name, d.avatar, 'avatar--sm')}${esc(d.name)}</button>`).join(''); }; fill(); $('#ns-hh', api.el).addEventListener('change', fill); $('[data-dogs]', api.el).addEventListener('click', (e) => { const b = e.target.closest('[data-d]'); if (b) b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); }); },
      actions: [{ label: 'Cancel', cls: 'btn--outline' }, { label: 'Create session', cls: 'btn--primary', icon: 'check', onClick: (api) => {
        const dogs = $$('[data-d][aria-pressed="true"]', api.el).map((b) => b.dataset.d); if (!dogs.length) { P.toast('Pick at least one dog', { tone: 'err' }); return false; }
        const now = $('#ns-start', api.el).checked; const h = L.household($('#ns-hh', api.el).value); const id = 's-' + Math.random().toString(36).slice(2, 6);
        P.db.add('sessions', { id, date: now ? A.now() : $('#ns-date', api.el).value, location: $('#ns-loc', api.el).value || h.suburb, household: h.id, dogs, status: now ? 'active' : 'scheduled', title: $('#ns-title', api.el).value || 'Session with ' + A.dogNames(dogs), notes: '', homework: [], media: [] });
        if (now) { A.S.ctx = { hh: h.id, dogs, session: id }; A.save(); A.renderCtx(); }
        A.audit(now ? 'started session' : 'scheduled session', h.name); P.toast(now ? 'Session started — context set' : 'Session scheduled', { tone: 'ok', icon: 'calendar-check' }); A.go('/session/' + id);
      } }] });
  };
  A.V.sessions = ({ query }) => {
    const st = query.s || 'all';
    const list = L.sessions.filter((s) => st === 'all' || s.status === st).sort((a, b) => b.date.localeCompare(a.date));
    return {
      title: 'Sessions', short: 'Sessions',
      html: A.vhead('Training', 'calendar-days', 'Sessions', '', `<button class="btn btn--primary" type="button" data-new>${ic('calendar-plus')}New session</button>`) +
        `<div class="chips chips--scroll" style="margin-bottom:18px">${[['all', 'All'], ['active', 'Active'], ['scheduled', 'Scheduled'], ['completed', 'Completed']].map(([v, l]) => `<a class="chip" href="#/sessions?s=${v}" aria-current="${st === v}">${l} <span class="count">${v === 'all' ? L.sessions.length : L.sessions.filter((s) => s.status === v).length}</span></a>`).join('')}</div>
        <div class="list">${list.map((s) => { const d = L.dog(s.dogs[0]); return `<a class="lrow" href="#/session/${s.id}"><span class="avatars">${s.dogs.map((x) => APP.avatar(L.dog(x).name, L.dog(x).avatar)).join('')}</span><span class="meta"><b>${esc(s.title)}</b><small>${APP.when(s.date)} · ${esc(L.household(s.household).name)} · ${esc(s.location)}</small></span><span class="end"><span class="pill">${s.media.length} ${ic('video')}</span>${P.status(s.status)}${ic('chevron-right', 'chev')}</span></a>`; }).join('')}</div>`,
      mount(el) { $('[data-new]', el).addEventListener('click', () => A.newSession()); APP.popIn(el, '.lrow'); }
    };
  };
  A.V.session = ({ params }) => {
    const s = L.session(params.id); if (!s) return A.empty('calendar', 'Session not found', '', '<a class="btn" href="#/sessions">Back</a>');
    const h = L.household(s.household); const media = s.media.map(L.mediaItem).filter(Boolean);
    return {
      title: s.title, short: 'Session',
      html: `<a class="back-link" href="#/sessions">${ic('arrow-left')}Sessions</a>` + A.vhead(APP.when(s.date) + ' · ' + esc(s.location), 'calendar-days', esc(s.title), `${esc(h.name)} · ${esc(A.dogNames(s.dogs))}`, `${P.status(s.status)}<button class="btn btn--primary" type="button" data-rec>${ic('circle-dot')}Record into session</button>${s.status === 'active' ? `<button class="btn" type="button" data-end>${ic('square')}End</button>` : ''}<a class="btn" href="#/share?session=${s.id}">${ic('send')}Share summary</a>`) +
        `<div class="bento">
          <section class="card c-6"><div class="card-head"><h2>Session notes</h2><button class="btn btn--sm" type="button" data-save>${ic('save')}Save</button></div><textarea class="textarea" id="ss-notes" style="min-height:160px" placeholder="What happened, what's next…">${esc(s.notes)}</textarea><p class="xsmall muted" style="margin:8px 0 0">Shared with the household once any clip from this session is approved for them.</p></section>
          <section class="card c-6" style="background:var(--grass-tint)"><div class="card-head"><h2>Homework</h2></div><div class="list" data-hw>${s.homework.map((x, i) => `<div class="lrow"><span class="meta"><b style="white-space:normal">${esc(x)}</b></span><button class="icon-btn icon-btn--plain" type="button" data-del="${i}" aria-label="Remove">${ic('x')}</button></div>`).join('')}</div>
            <form class="row" style="margin-top:12px" data-addhw><label class="sr-only" for="hw-new">New homework</label><input class="input" id="hw-new" placeholder="e.g. Recall from garden ×5"><button class="btn btn--grass" type="submit">${ic('plus')}Add</button></form></section>
          <section class="card c-12"><div class="card-head"><h2>Recordings</h2><span class="pill">${media.length}</span></div><div class="mgrid">${media.map((m) => A.mediaTile(m)).join('') || A.empty('video', 'No recordings yet', 'Tap record — clips land here automatically.')}</div></section>
        </div>`,
      mount(el) {
        $('[data-rec]', el).addEventListener('click', () => { A.S.ctx = { hh: s.household, dogs: s.dogs.slice(), session: s.id }; A.save(); A.renderCtx(); A.go('/camera'); });
        const end = $('[data-end]', el); end && end.addEventListener('click', () => A.endSession(s.id));
        $('[data-save]', el).addEventListener('click', () => { P.db.patch('sessions', s.id, { notes: $('#ss-notes', el).value }); A.audit('edited session notes', s.title); P.toast('Notes saved', { tone: 'ok', icon: 'save' }); });
        $('[data-addhw]', el).addEventListener('submit', (e) => { e.preventDefault(); const v = $('#hw-new', el).value.trim(); if (!v) return; P.db.patch('sessions', s.id, { homework: s.homework.concat(v) }); P.toast('Homework added', { tone: 'ok', icon: 'list-checks' }); A.router.refresh(); });
        $('[data-hw]', el).addEventListener('click', (e) => { const b = e.target.closest('[data-del]'); if (!b) return; const hw = s.homework.slice(); hw.splice(+b.dataset.del, 1); P.db.patch('sessions', s.id, { homework: hw }); A.router.refresh(); });
        APP.popIn(el, '.card');
      }
    };
  };

  /* ================= MEDIA LIBRARY ================= */
  A.V.media = ({ query }) => {
    const f = { dog: query.dog || 'all', t: query.t || 'all', st: query.st || 'all' };
    let list = L.media.slice().sort((a, b) => b.created.localeCompare(a.created));
    if (f.dog !== 'all') list = list.filter((m) => m.dogs.includes(f.dog));
    if (f.t !== 'all') list = list.filter((m) => m.techniques.includes(f.t) || (m.ai && m.ai.tags && m.ai.tags.some((x) => x.id === f.t)));
    if (f.st !== 'all') list = list.filter((m) => m.editorial === f.st);
    const href = (k, v) => { const o = { ...f, [k]: v }; return '#/media?dog=' + o.dog + '&t=' + o.t + '&st=' + o.st; };
    const states = ['draft', 'needs_review', 'approved_private', 'approved_shared', 'published_public', 'archived'];
    return {
      title: 'Media library', short: 'Media',
      html: A.vhead('Cloudflare Stream · private by default', 'clapperboard', 'Media library', `${L.media.length} clips · processing state and editorial state are tracked separately.`) +
        `<div class="fbar"><label><span class="sr-only">Dog</span><select class="select" data-f="dog"><option value="all">All dogs</option>${L.dogs.map((d) => `<option value="${d.id}" ${f.dog === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></label>
          <label><span class="sr-only">Technique</span><select class="select" data-f="t"><option value="all">All techniques</option>${L.techniques.map((t) => `<option value="${t.id}" ${f.t === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label>
          <label class="input-icon"><span class="sr-only">Search titles</span><i data-lucide="search"></i><input class="input" type="search" placeholder="Search titles & transcripts…" data-q></label></div>
        <div class="chips chips--scroll" style="margin-bottom:20px"><a class="chip" href="${href('st', 'all')}" aria-current="${f.st === 'all'}">All states</a>${states.map((s) => `<a class="chip" href="${href('st', s)}" aria-current="${f.st === s}">${P.statusLabel(s)} <span class="count">${L.media.filter((m) => m.editorial === s).length}</span></a>`).join('')}</div>
        <div class="mgrid">${list.map((m) => `<div data-k="${esc((m.title + ' ' + ((m.ai && m.ai.transcript) || '')).toLowerCase())}">${A.mediaTile(m)}</div>`).join('') || A.empty('filter-x', 'No clips match', 'Try clearing a filter.', '<a class="btn btn--sm" href="#/media">Clear filters</a>')}</div>`,
      mount(el) { $$('[data-f]', el).forEach((s) => s.addEventListener('change', () => (location.hash = href(s.dataset.f, s.value)))); $('[data-q]', el).addEventListener('input', (e) => $$('[data-k]', el).forEach((t) => (t.hidden = !t.dataset.k.includes(e.target.value.toLowerCase())))); APP.popIn(el, '.mtile'); }
    };
  };

  /* ================= GROUPS ================= */
  A.V.groups = () => ({
    title: 'Training groups', short: 'Groups',
    html: A.vhead('Audiences', 'users-round', 'Training groups', 'App-managed membership lists for sharing. These are not WhatsApp group chats — WhatsApp membership can’t be imported or synced.', `<button class="btn btn--primary" type="button" data-new>${ic('plus')}New group</button>`) +
      `<div class="grid grid-auto">${L.groups.map((g) => `<article class="card group-card" style="--gc:${g.color}"><div class="row row--between"><span class="pill">${esc(g.type)}</span><span class="small" style="font-weight:700">${ic('calendar', 'inline-ic')} ${APP.when(g.next)}</span></div><h2 style="font-size:var(--fs-xl);margin:12px 0">${esc(g.title)}</h2>
        <div class="list">${g.members.map((hid) => { const h = L.household(hid); return `<a class="lrow" href="#/household/${hid}" style="min-height:52px;padding:8px 12px"><span class="avatars">${L.dogsFor(hid).map((d) => APP.avatar(d.name, d.avatar, 'avatar--sm')).join('')}</span><span class="meta"><b>${esc(h.name)}</b><small>${h.members.length} members</small></span></a>`; }).join('')}</div>
        <div class="row row--wrap" style="margin-top:14px"><button class="btn btn--sm" type="button" data-edit="${g.id}">${ic('users')}Edit members</button><a class="btn btn--sm btn--sun" href="#/share?group=${g.id}">${ic('send')}Share to group</a></div></article>`).join('')}</div>`,
    mount(el) {
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-edit]'); if (!b) return; const g = L.groups.find((x) => x.id === b.dataset.edit);
        P.modal({ title: 'Members · ' + esc(g.title), html: `<p class="muted small">Pick households. Sharing to a group expands to each eligible household member — duplicates are removed.</p>${L.households.filter((h) => h.status === 'active').map((h) => `<label class="check"><input type="checkbox" value="${h.id}" ${g.members.includes(h.id) ? 'checked' : ''}><span class="box">${ic('check')}</span><span class="txt"><b>${esc(h.name)}</b> <span class="small muted">· ${L.dogsFor(h.id).map((d) => esc(d.name)).join(', ')}</span></span></label>`).join('')}`,
          actions: [{ label: 'Cancel', cls: 'btn--outline' }, { label: 'Save members', cls: 'btn--primary', icon: 'check', onClick: (api) => { const mem = $$('input:checked', api.el).map((i) => i.value); P.db.patch('groups', g.id, { members: mem }); A.audit('edited group membership', g.title); P.toast('Group updated', { tone: 'ok', icon: 'users' }); A.router.refresh(); } }] });
      });
      $('[data-new]', el).addEventListener('click', () => P.modal({ title: 'New training group', html: `<div class="field"><label class="label" for="ng-t">Name</label><input class="input" id="ng-t" placeholder="e.g. Tuesday Reactive Rover Club"></div><div class="field"><span class="label">Type</span><div class="seg" data-type><button type="button" aria-pressed="true">class</button><button type="button" aria-pressed="false">workshop</button><button type="button" aria-pressed="false">cohort</button></div></div>`,
        onOpen(api) { $('[data-type]', api.el).addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) $$('[data-type] button', api.el).forEach((x) => x.setAttribute('aria-pressed', x === b)); }); },
        actions: [{ label: 'Cancel', cls: 'btn--outline' }, { label: 'Create', cls: 'btn--primary', onClick: (api) => { const t = $('#ng-t', api.el).value.trim(); if (!t) return false; P.db.add('groups', { id: 'g-' + Math.random().toString(36).slice(2, 6), title: t, type: $('[data-type] [aria-pressed="true"]', api.el).textContent, members: [], color: ['#E8A33D', '#5B8C5A', '#6C8EAD', '#9C6ADE'][L.groups.length % 4], next: '2026-10-26T10:00' }); A.audit('created group', t); A.router.refresh(); } }] }));
      APP.popIn(el, '.card');
    }
  });

  /* ================= TECHNIQUES ================= */
  A.V.techniques = () => ({
    title: 'Techniques', short: 'Techniques',
    html: A.vhead('Controlled vocabulary', 'tags', 'Technique taxonomy', 'The tags AI can suggest and you can apply. Used for client filtering and Academy guides.', `<button class="btn btn--primary" type="button" data-new>${ic('plus')}Add technique</button>`) +
      `<div class="table-wrap"><table class="table table--stack"><thead><tr><th>Technique</th><th>Slug</th><th>Clips</th><th>Guides</th><th>Dogs</th><th>State</th></tr></thead><tbody>${L.techniques.map((t) => `<tr><td data-l=""><span class="row"><span class="avatar avatar--sm" style="background:${t.color}">${ic(t.icon)}</span><span><b contenteditable="true" spellcheck="false" data-name="${t.id}">${esc(t.name)}</b><br><span class="small muted">${esc(t.blurb)}</span></span></span></td><td data-l="Slug"><code>${t.slug}</code></td><td data-l="Clips">${L.media.filter((m) => m.techniques.includes(t.id)).length}</td><td data-l="Guides">${L.guides.filter((g) => g.technique === t.id).length}</td><td data-l="Dogs">${L.dogs.filter((d) => d.techniques.includes(t.id)).length}</td><td data-l="State">${P.status(t.draft ? 'draft' : 'published')}</td></tr>`).join('')}</tbody></table></div>
      <p class="small muted" style="margin-top:12px">${ic('pencil', 'inline-ic')} Click a name to rename it — changes apply everywhere.</p>`,
    mount(el) {
      $$('[data-name]', el).forEach((n) => n.addEventListener('blur', () => { const t = L.technique(n.dataset.name); const v = n.textContent.trim(); if (v && v !== t.name) { P.db.patch('techniques', t.id, { name: v }); A.audit('renamed technique', `${t.name} → ${v}`); P.toast('Technique renamed', { tone: 'ok', icon: 'tags' }); } }));
      $$('[data-name]', el).forEach((n) => n.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); n.blur(); } }));
      $('[data-new]', el).addEventListener('click', () => P.modal({ title: 'Add technique', html: `<div class="field"><label class="label" for="nt-n">Name</label><input class="input" id="nt-n" placeholder="e.g. Place / go to bed"></div><div class="field"><label class="label" for="nt-b">One-line description</label><input class="input" id="nt-b"></div>`,
        actions: [{ label: 'Cancel', cls: 'btn--outline' }, { label: 'Add as draft', cls: 'btn--primary', onClick: (api) => { const n = $('#nt-n', api.el).value.trim(); if (!n) return false; const id = 't-' + Math.random().toString(36).slice(2, 6); P.db.add('techniques', { id, name: n, slug: n.toLowerCase().replace(/[^a-z0-9]+/g, '-'), color: '#8EC5FF', icon: 'tag', blurb: $('#nt-b', api.el).value, draft: true }); A.audit('added technique', n); A.router.refresh(); } }] }));
    }
  });

  /* ================= CONSENT ================= */
  A.recordConsent = (mediaId, after) => {
    const m = mediaId ? L.mediaItem(mediaId) : null; const hh = m ? A.hhOfMedia(m) : null;
    P.modal({ title: 'Record consent', html: `${m ? `<div class="lrow" style="margin-bottom:12px"><span class="thumb"><img src="${A.thumb(m)}" alt=""></span><span class="meta"><b>${esc(m.title)}</b><small>${esc(hh ? hh.name : '')}</small></span></div>` : ''}
      <div class="field"><label class="label" for="cn-sub">Who (identifiable person)</label><select class="select" id="cn-sub">${(hh ? hh.members.map(L.user) : L.users.filter((u) => u.role === 'client')).map((u) => `<option>${esc(u.name)}</option>`).join('')}</select></div>
      <div class="field"><label class="label" for="cn-kind">Use</label><select class="select" id="cn-kind"><option>Public website + guides</option><option>Training group sharing</option><option>Household sharing only</option></select></div>
      <div class="field"><label class="label" for="cn-ev">Evidence</label><select class="select" id="cn-ev"><option>Signed digital form</option><option>Email confirmation</option><option>Onboarding form</option></select></div>
      <label class="check"><input type="checkbox" id="cn-ok"><span class="box">${ic('check')}</span><span class="txt small">I’ve confirmed this person agreed to this specific use, and they know they can withdraw it.</span></label>`,
      actions: [{ label: 'Cancel', cls: 'btn--outline' }, { label: 'Save consent record', cls: 'btn--primary', icon: 'shield-check', onClick: (api) => {
        if (!$('#cn-ok', api.el).checked) { P.toast('Please confirm the consent first', { tone: 'err' }); return false; }
        const rec = { id: 'c-' + Math.random().toString(36).slice(2, 6), subject: $('#cn-sub', api.el).value, media: mediaId || null, kind: $('#cn-kind', api.el).value, evidence: $('#cn-ev', api.el).value, date: '2026-10-17', status: 'active' };
        P.db.add('consents', rec); A.audit('recorded consent', `${rec.subject} — ${rec.kind}`); P.toast('Consent recorded', { tone: 'ok', icon: 'shield-check' }); after ? after(rec) : A.router.refresh();
      } }] });
  };
  A.V.consent = () => ({
    title: 'Consent records', short: 'Consent',
    html: A.vhead('Privacy', 'shield-check', 'Consent records', 'Public use of identifiable people needs a separate, recorded consent. Withdrawal triggers a takedown of the public edition.', `<button class="btn btn--primary" type="button" data-new>${ic('plus')}Record consent</button>`) +
      `<div class="table-wrap"><table class="table table--stack"><thead><tr><th>Subject</th><th>Use</th><th>Media</th><th>Evidence</th><th>Date</th><th>Status</th><th></th></tr></thead><tbody>${L.consents.map((c) => `<tr><td data-l="Subject"><b>${esc(c.subject)}</b></td><td data-l="Use">${esc(c.kind)}</td><td data-l="Media">${c.media ? `<a class="link" href="#/review/${c.media}">${esc((L.mediaItem(c.media) || {}).title || c.media)}</a>` : '—'}</td><td data-l="Evidence">${esc(c.evidence)}</td><td data-l="Date">${L.fmtDate(c.date, { day: 'numeric', month: 'short', year: 'numeric' })}${c.withdrawn ? '<br><span class="small muted">withdrawn ' + L.fmtDate(c.withdrawn) + '</span>' : ''}</td><td data-l="Status">${P.status(c.status)}</td><td data-l="">${c.status === 'active' ? `<button class="btn btn--sm btn--outline" type="button" data-w="${c.id}">Withdraw</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`,
    mount(el) {
      $('[data-new]', el).addEventListener('click', () => A.recordConsent(null));
      el.addEventListener('click', (e) => { const b = e.target.closest('[data-w]'); if (!b) return; const c = L.consents.find((x) => x.id === b.dataset.w);
        P.confirm('Record withdrawal?', `${esc(c.subject)} withdraws “${esc(c.kind)}”. ${c.media ? 'The public edition will be unpublished now and kept private.' : ''}`, 'Record withdrawal', () => { P.db.patch('consents', c.id, { status: 'withdrawn', withdrawn: '2026-10-17' }); if (c.media) { const m = L.mediaItem(c.media); if (m && m.editorial === 'published_public') P.db.patch('media', m.id, { editorial: 'approved_shared', visibility: 'household' }); } A.audit('recorded consent withdrawal', c.subject); P.toast('Withdrawal recorded — public edition taken down', { tone: 'ok', icon: 'shield-check' }); A.router.refresh(); }); });
    }
  });

  /* ================= AUDIT ================= */
  A.V.audit = ({ query }) => {
    const who = query.a || 'all'; const list = L.audit.slice().sort((a, b) => b.t.localeCompare(a.t)).filter((x) => who === 'all' || x.actor === who);
    const actors = Array.from(new Set(L.audit.map((x) => x.actor)));
    const icon = (a) => (/approv|grant|publish/.test(a) ? 'badge-check' : /share/.test(a) ? 'send' : /revok|withdr/.test(a) ? 'shield-off' : /assign/.test(a) ? 'inbox' : /Stream|upload/.test(a) ? 'cloud' : 'pencil');
    return {
      title: 'Audit log', short: 'Audit',
      html: A.vhead('Accountability', 'scroll-text', 'Audit log', 'Permission changes, approvals and shares — minimal details, no private transcripts or tokens.', `<button class="btn" type="button" data-export>${ic('download')}Export CSV</button>`) +
        `<div class="chips" style="margin-bottom:18px"><a class="chip" href="#/audit" aria-current="${who === 'all'}">Everyone</a>${actors.map((a) => `<a class="chip" href="#/audit?a=${encodeURIComponent(a)}" aria-current="${who === a}">${esc(a)}</a>`).join('')}</div>
        <div class="timeline">${list.map((x) => `<div class="tl-item"><div class="lrow"><span class="avatar avatar--sm" style="background:${x.actor === 'System' ? 'var(--sky)' : x.actor === 'Linda' ? 'var(--tomato)' : 'var(--sun)'}">${ic(icon(x.action))}</span><span class="meta"><b style="white-space:normal">${esc(x.actor)} ${esc(x.action)}</b><small style="white-space:normal">${esc(x.entity)}</small></span><span class="end small muted">${APP.when(x.t)}</span></div></div>`).join('')}</div>`,
      mount(el) { $('[data-export]', el).addEventListener('click', () => { const csv = 'time,actor,action,entity\n' + list.map((x) => [x.t, x.actor, x.action, x.entity].map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'audit-log.csv'; a.click(); P.toast('Audit log exported', { tone: 'ok', icon: 'download' }); }); APP.popIn(el, '.tl-item'); }
    };
  };

  /* ================= SETTINGS ================= */
  A.V.settings = () => {
    const s = A.S.settings; const st = L.stats.trainer;
    return {
      title: 'Settings', short: 'Settings',
      html: A.vhead('Workspace', 'settings', 'Settings', 'Limits, AI spending and integrations. Secrets live server-side — never in the browser.') +
        `<div class="bento">
          <section class="card c-6"><div class="card-head"><h2>Upload limits</h2></div>
            <div class="range-row"><div class="row"><label class="label" for="st-min">Max video length</label><b data-o="st-min">${s.maxMinutes} min</b></div><input type="range" id="st-min" min="1" max="60" value="${s.maxMinutes}" data-k="maxMinutes" data-u=" min"></div>
            <div class="range-row" style="margin-top:12px"><div class="row"><label class="label" for="st-gb">Max file size</label><b data-o="st-gb">${s.maxGB} GB</b></div><input type="range" id="st-gb" min="1" max="30" value="${s.maxGB}" data-k="maxGB" data-u=" GB"></div>
            <p class="xsmall muted" style="margin:10px 0 0">Over-limit files get a friendly warning and a recovery path — no in-browser compression.</p></section>
          <section class="card c-6" style="background:var(--sky-tint)"><div class="card-head"><h2>AI assistance</h2><label class="switch"><input type="checkbox" data-k2="autoAI" ${s.autoAI ? 'checked' : ''}><span class="track"></span><span class="sr-only">Auto-generate drafts</span></label></div>
            <div class="range-row"><div class="row"><label class="label" for="st-ceil">Monthly ceiling</label><b data-o="st-ceil">$${s.aiCeiling}</b></div><input type="range" id="st-ceil" min="10" max="200" step="5" value="${s.aiCeiling}" data-k="aiCeiling" data-p="$"></div>
            <div class="meter" style="margin:12px 0 6px"><i style="width:${Math.min(100, st.aiSpendMonth / s.aiCeiling * 100)}%" data-meter></i></div><p class="small" style="margin:0;font-weight:700">$${st.aiSpendMonth.toFixed(2)} spent this month</p>
            <div class="grid grid-2" style="gap:12px;margin-top:14px"><div class="field" style="margin:0"><label class="label" for="st-pv">Per-video cap ($)</label><input class="input" id="st-pv" type="number" step=".05" min="0" value="${s.perVideo}" data-k="perVideo"></div><div class="field" style="margin:0"><label class="label" for="st-rt">Retry limit</label><input class="input" id="st-rt" type="number" min="0" max="10" value="${s.retries}" data-k="retries"></div></div></section>
          <section class="card c-6" style="background:var(--grass-tint)"><div class="card-head"><h2>WhatsApp archive number</h2><span class="pill pill--grass">Inbound only</span></div>
            <p class="display" style="font-size:2rem;margin:0 0 10px">${esc(L.brand.archiveNumber)}</p>
            <h3 style="font-size:1rem;margin:12px 0 6px">Authorised senders</h3><div class="lrow"><span class="avatar avatar--sm" style="background:var(--tomato)">L</span><span class="meta"><b>Linda (personal)</b><small>${esc(L.brand.phone)}</small></span>${P.status('active')}</div>
            <p class="xsmall muted" style="margin:10px 0 0">Unknown senders are quarantined. Linda’s personal number is never used for automated sending.</p></section>
          <section class="card c-6"><div class="card-head"><h2>Sharing defaults</h2></div>
            <div class="seg" role="group" aria-label="Default share mode" data-mode>${[['link_only', 'Link only'], ['video_only', 'Video only'], ['link_and_video', 'Link + video']].map(([v, l]) => `<button type="button" aria-pressed="${s.defaultMode === v}" data-v="${v}">${l}</button>`).join('')}</div>
            <p class="small" style="margin:12px 0 0">Link-only is safest: access can be revoked later. Video files can’t be recalled once sent.</p></section>
          ${[['Cloudflare Stream', 'cloud', 'var(--sky)', [['Direct creator uploads (tus)', 'on'], ['Signed URLs required', 'on'], ['Webhook verified', '2 min ago'], ['Stored minutes', st.streamMinutesStored]]], ['WhatsApp Cloud API', 'message-circle', 'var(--grass-tint)', [['Webhook challenge', 'verified'], ['Signature checks', 'on'], ['Dedupe by message ID', 'on'], ['Video limit', '16 MB (Meta)']]], ['AI provider', 'sparkles', 'var(--lilac-tint)', [['Mode', 'Draft suggestions only'], ['Transcription', 'when speech present'], ['Data retention', 'minimal'], ['DPA review', 'before production']]]].map(([n, i, bg, rows]) => `<section class="card c-4 int-card" style="background:${bg}"><div class="int-h"><span class="int-ico">${ic(i)}</span><span><b>${n}</b><span class="live"><i></i>Connected (demo)</span></span></div><dl class="kv">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl><button class="btn btn--sm" type="button" data-test="${n}">${ic('activity')}Test connection</button></section>`).join('')}
          <section class="card c-12" style="background:var(--blush)"><div class="card-head"><h2>Demo data</h2></div><p style="margin:0 0 12px">Approvals, uploads, shares and edits are saved in this browser so the demo feels alive across pages.</p><button class="btn btn--primary" type="button" data-reset2>${ic('rotate-ccw')}Reset demo data</button></section>
        </div>`,
      mount(el) {
        $$('input[type=range][data-k]', el).forEach((r) => r.addEventListener('input', () => { s[r.dataset.k] = +r.value; A.save(); $(`[data-o="${r.id}"]`, el).textContent = (r.dataset.p || '') + r.value + (r.dataset.u || ''); if (r.dataset.k === 'aiCeiling') $('[data-meter]', el).style.width = Math.min(100, st.aiSpendMonth / r.value * 100) + '%'; }));
        $$('input[type=number][data-k]', el).forEach((r) => r.addEventListener('change', () => { s[r.dataset.k] = +r.value; A.save(); P.toast('Saved', { tone: 'ok', icon: 'save', ms: 1200 }); }));
        $('[data-k2]', el).addEventListener('change', (e) => { s.autoAI = e.target.checked; A.save(); P.toast(s.autoAI ? 'AI drafts on' : 'AI drafts paused — videos still process normally', { icon: 'sparkles' }); });
        $('[data-mode]', el).addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (!b) return; s.defaultMode = b.dataset.v; A.save(); $$('[data-mode] button', el).forEach((x) => x.setAttribute('aria-pressed', x === b)); });
        $$('[data-test]', el).forEach((b) => b.addEventListener('click', () => { const o = b.innerHTML; b.innerHTML = ic('loader-circle', 'spin') + 'Testing…'; P.icons(); setTimeout(() => { b.innerHTML = o; P.icons(); P.toast(`${b.dataset.test}: all good (simulated)`, { tone: 'ok', icon: 'check' }); }, 1000); }));
        $('[data-reset2]', el).addEventListener('click', () => $('[data-reset]').click());
        APP.popIn(el, '.card');
      }
    };
  };
})();
