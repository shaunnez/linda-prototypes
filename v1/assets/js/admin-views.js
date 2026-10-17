/* ==========================================================================
   admin-views.js — trainer workspace SPA (part 2) + boot
   clients · households · dogs · sessions · media · share composer · history
   · WhatsApp archive · groups · techniques · academy CMS · consent · audit
   · settings
   ========================================================================== */
(function () {
  'use strict';
  const { $, $$, esc, icon, icons, toast, modal, confirm, drawer, ring, validate, sleep, parseT, fmtT, ago, uid } = window.UI;
  const A = window.App;
  const L = window.LINDA;
  const DB = window.DB;
  const AD = window.Admin;
  const { H, Ctx, genAI, nowISO, updateCounts, targetName } = AD;
  const R = () => AD.R;
  const V = {};

  const digits = (s) => String(s || '').replace(/\D/g, '');
  const memberPerm = (h, u) => (h.memberPerms && h.memberPerms[u.id]) || (h.primary === u.id ? 'owner' : 'member');

  /* ======================= CLIENTS ======================= */
  V.clients = (p) => {
    const st = p.query.get('st') || 'active';
    const q = (p.query.get('q') || '').toLowerCase();
    const list = L.households.filter((h) => (st === 'all' || h.status === st) && (!q || (h.name + ' ' + h.suburb + ' ' + h.members.map((u) => (L.user(u) || {}).name).join(' ') + ' ' + L.dogsFor(h.id).map((d) => d.name).join(' ')).toLowerCase().includes(q)));
    return {
      title: 'Clients & dogs', crumbs: [{ label: 'People' }, { label: 'Clients & dogs' }],
      html: `${A.pageHead({ eyebrow: `${L.households.filter((h) => h.status === 'active').length} active households · ${L.dogs.length} dogs`, title: 'Clients <em>&amp; dogs</em>', actions: `<button class="btn btn--sm btn--primary" data-add-hh>${icon('user-plus')}Add household</button>` })}
        <form class="filterbar" id="cf"><div class="input-icon">${icon('search')}<input class="input input--sm" name="q" type="search" value="${esc(q)}" placeholder="Search people, households, dogs" style="padding-left:40px" aria-label="Search clients"></div>
        <div class="segmented" role="group" aria-label="Status">${[['active', 'Active'], ['inactive', 'Inactive'], ['all', 'All']].map(([k, l]) => `<button type="button" data-st="${k}" aria-pressed="${st === k}">${l}</button>`).join('')}</div></form>
        ${list.length ? `<div class="g g-auto">${list.map((h) => { const dogs = L.dogsFor(h.id); const mem = h.members.map((u) => L.user(u)).filter(Boolean); return `<a class="card card--hover" href="#/household/${h.id}" style="overflow:hidden">
          <div style="display:flex;height:120px">${dogs.map((d) => `<img src="${d.cover}" alt="" style="flex:1;min-width:0;object-fit:cover">`).join('') || '<div style="flex:1;background:var(--char-2)"></div>'}</div>
          <div class="panel" style="display:grid;gap:10px">
            <div class="row row--between"><h3 class="serif" style="font-size:1.8rem;line-height:1">${h.name}</h3>${A.badge(h.status)}</div>
            <span class="faint text-sm">${icon('map-pin', 'chev')} ${h.suburb} · client since ${UI.fmtDate(h.since, { month: 'short', year: 'numeric' })}</span>
            <div class="row row--between"><div class="avatar-stack">${mem.map((u) => A.avatar(u, 'avatar--sm')).join('')}</div><div class="row" style="--gap:6px">${dogs.map((d) => `<span class="tag tag--plain">${A.dogAvatar(d, 'avatar--sm').replace('avatar--sm', 'avatar--sm" style="--size:20px')}${d.name}</span>`).join('')}</div></div>
            ${mem.some((u) => u.invite !== 'accepted') ? `<span class="text-xs" style="color:var(--amber)">${icon('mail', 'chev')} ${mem.filter((u) => u.invite !== 'accepted').length} invitation ${mem.filter((u) => u.invite !== 'accepted').map((u) => u.invite).join(', ')}</span>` : ''}
          </div></a>`; }).join('')}</div>` : A.empty({ icon: 'search-x', title: 'No households found', text: 'Try a different search or status.' })}`,
      mount(root) {
        const f = $('#cf', root);
        const go = (stv) => { const qs = new URLSearchParams(); const qq = f.q.value.trim(); if (qq) qs.set('q', qq); qs.set('st', stv || st); history.replaceState(null, '', '#/clients?' + qs); R().render(); const i = $('#cf input'); if (qq) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } };
        let t; f.q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => go(), 300); });
        f.addEventListener('submit', (e) => { e.preventDefault(); go(); });
        root.addEventListener('click', (e) => { const b = e.target.closest('[data-st]'); if (b) go(b.dataset.st); if (e.target.closest('[data-add-hh]')) addHousehold(); });
        if (p.query.get('new')) setTimeout(addHousehold, 200);
      }
    };
  };

  function dupeCheck(email, phone, name) {
    const out = [];
    const e = (email || '').trim().toLowerCase(), ph = digits(phone);
    L.users.forEach((u) => {
      const h = L.households.find((x) => x.members.includes(u.id));
      if (e && u.email.toLowerCase() === e) out.push({ u, h, by: 'email' });
      else if (ph.length >= 8 && digits(u.phone).endsWith(ph.slice(-8))) out.push({ u, h, by: 'phone number' });
      else if (name && name.trim().length > 3 && u.name.toLowerCase() === name.trim().toLowerCase()) out.push({ u, h, by: 'name only', soft: true });
    });
    return out;
  }
  function dupeHTML(list) {
    if (!list.length) return '';
    return list.map((d) => d.soft
      ? `<div class="callout callout--sky">${icon('info')}<div><strong>Same name as ${d.u.name}</strong> (${d.h ? d.h.name : 'no household'}). Names alone are never used to match people — this will be a separate contact.</div></div>`
      : `<div class="callout callout--ember">${icon('triangle-alert')}<div><strong>Possible duplicate:</strong> this ${d.by} already belongs to <b>${d.u.name}</b>${d.h ? ` in ${d.h.name}` : ''}. Link the existing contact instead of creating a new one?<div class="row row--wrap mt-1"><button type="button" class="btn btn--sm" data-link-existing="${d.u.id}">Link existing contact</button><span class="faint text-xs">or continue to create anyway</span></div></div></div>`).join('');
  }

  function addHousehold() {
    const m = modal({
      title: 'Add household', eyebrow: 'New client', size: 'wide',
      sub: 'A household can hold several people and several dogs. Phone numbers are stored in international format.',
      body: `<form id="ahh" class="g" novalidate>
        <div class="g g-2"><div class="field"><label class="field__label" for="h-name">Household name</label><input class="input" id="h-name" data-validate="required" placeholder="e.g. Walker household"><span class="field__error">${icon('circle-alert')}Required</span></div>
        <div class="field"><label class="field__label" for="h-sub">Suburb</label><input class="input" id="h-sub" placeholder="e.g. Pt Chevalier"></div></div>
        <span class="eyebrow mt-1">Primary contact</span>
        <div class="g g-3"><div class="field"><label class="field__label" for="h-pn">Name</label><input class="input" id="h-pn" data-validate="required"><span class="field__error">${icon('circle-alert')}Required</span></div>
        <div class="field"><label class="field__label" for="h-pe">Email</label><input class="input" id="h-pe" type="email" data-validate="required email" placeholder="try sarah.t@example.co.nz"><span class="field__error">${icon('circle-alert')}Valid email needed</span></div>
        <div class="field"><label class="field__label" for="h-pp">Mobile</label><input class="input" id="h-pp" type="tel" data-validate="phone" placeholder="+64 21 …"><span class="field__error">${icon('circle-alert')}Check the number</span></div></div>
        <div id="dupes" class="g" aria-live="polite"></div>
        <label class="check check--nostrike"><input type="checkbox" id="h-inv" checked><span class="check__box"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span class="check__text">Send a portal invitation by email (expires in 7 days)</span></label>
      </form>`,
      foot: `<button class="btn btn--ghost" data-close>Cancel</button><button class="btn btn--primary" data-create>${icon('plus')}Create household</button>`
    });
    const chk = () => { $('#dupes', m.root).innerHTML = dupeHTML(dupeCheck($('#h-pe', m.root).value, $('#h-pp', m.root).value, $('#h-pn', m.root).value)); icons(); };
    m.root.addEventListener('input', (e) => { if (['h-pe', 'h-pp', 'h-pn'].includes(e.target.id)) chk(); });
    m.root.addEventListener('click', (e) => {
      const le = e.target.closest('[data-link-existing]');
      if (le) { const u = L.user(le.dataset.linkExisting); const h = L.households.find((x) => x.members.includes(u.id)); m.close(); toast(`Linked to existing contact ${u.name}.`, { type: 'success' }); h && R().go('#/household/' + h.id); }
    });
    $('[data-create]', m.root).addEventListener('click', async (e) => {
      if (!validate($('#ahh', m.root))) return;
      e.currentTarget.classList.add('is-loading');
      await sleep(700);
      const hid = 'h-' + uid('n').slice(2);
      const u = DB.add('users', { id: 'u-' + uid('n').slice(2), name: $('#h-pn', m.root).value.trim(), role: 'client', email: $('#h-pe', m.root).value.trim(), phone: $('#h-pp', m.root).value.trim(), household: hid, permission: 'owner', invite: $('#h-inv', m.root).checked ? 'pending' : 'not_sent' }, false);
      const h = DB.add('households', { id: hid, name: $('#h-name', m.root).value.trim(), suburb: $('#h-sub', m.root).value.trim() || '—', status: 'active', primary: u.id, members: [u.id], dogs: [], since: '2026-10-17' }, false);
      DB.audit('created household', h.name);
      m.close();
      toast(`${esc(h.name)} created${u.invite === 'pending' ? ' — invitation sent' : ''}.`, { type: 'success', action: { label: 'Add dog', fn: () => addDog(h.id) } });
      R().go('#/household/' + h.id);
    });
  }

  function addDog(hid) {
    const h = L.household(hid);
    const m = modal({
      title: 'Add a dog', eyebrow: h.name,
      body: `<form id="adog" class="g" novalidate>
        <div class="g g-2"><div class="field"><label class="field__label" for="d-name">Name</label><input class="input" id="d-name" data-validate="required"><span class="field__error">${icon('circle-alert')}Required</span></div>
        <div class="field"><label class="field__label" for="d-breed">Breed <span class="faint">optional</span></label><input class="input" id="d-breed" placeholder="e.g. Huntaway cross"></div>
        <div class="field"><label class="field__label" for="d-dob">Date of birth <span class="faint">optional</span></label><input class="input" id="d-dob" type="date"></div>
        <div class="field"><label class="field__label" for="d-sex">Sex</label><select class="select" id="d-sex"><option>F</option><option>M</option></select></div></div>
        <div class="field"><label class="field__label" for="d-goal">Training goals</label><input class="input" id="d-goal" placeholder="Comma separated — e.g. Recall, Calm greetings"></div>
        <p class="faint text-xs">Dog names don’t need to be unique — every dog has a stable ID.</p></form>`,
      foot: `<button class="btn btn--ghost" data-close>Cancel</button><button class="btn btn--primary" data-go>${icon('plus')}Add dog</button>`
    });
    $('[data-go]', m.root).addEventListener('click', () => {
      if (!validate($('#adog', m.root))) return;
      const clip = [50688, 50683, 1557, 1501][L.dogs.length % 4];
      const d = DB.add('dogs', { id: 'd-' + uid('n').slice(2), name: $('#d-name', m.root).value.trim(), breed: $('#d-breed', m.root).value.trim() || 'Unknown breed', age: '—', dob: $('#d-dob', m.root).value, sex: $('#d-sex', m.root).value, household: hid, status: 'New client', clip, photo: L.img(clip, 40), cover: L.img(clip, 15), avatar: L.thumb(clip, 40), goals: $('#d-goal', m.root).value.split(',').map((x) => x.trim()).filter(Boolean), notes: '', progress: 0, techniques: [] }, false);
      DB.patch('households', hid, { dogs: h.dogs.concat(d.id) });
      DB.audit('added dog', `${d.name} → ${h.name}`);
      m.close(); toast(`${esc(d.name)} added to ${esc(h.name)}.`, { type: 'success' }); R().render();
    });
  }

  function inviteMember(hid) {
    const h = L.household(hid);
    const m = modal({
      title: 'Invite member', eyebrow: h.name, sub: 'Joining a household always requires an explicit invitation — a matching phone number is never enough.',
      body: `<form id="im" class="g" novalidate><div class="field"><label class="field__label" for="im-n">Name</label><input class="input" id="im-n" data-validate="required"><span class="field__error">${icon('circle-alert')}Required</span></div>
        <div class="field"><label class="field__label" for="im-e">Email</label><input class="input" id="im-e" type="email" data-validate="required email"><span class="field__error">${icon('circle-alert')}Valid email needed</span></div><div id="im-d" class="g"></div></form>`,
      foot: `<button class="btn btn--ghost" data-close>Cancel</button><button class="btn btn--primary" data-go>${icon('send')}Send invite</button>`
    });
    m.root.addEventListener('input', () => { $('#im-d', m.root).innerHTML = dupeHTML(dupeCheck($('#im-e', m.root).value, '', $('#im-n', m.root).value)); icons(); });
    $('[data-go]', m.root).addEventListener('click', () => {
      if (!validate($('#im', m.root))) return;
      const u = DB.add('users', { id: 'u-' + uid('n').slice(2), name: $('#im-n', m.root).value.trim(), role: 'client', email: $('#im-e', m.root).value.trim(), phone: '', household: hid, permission: 'member', invite: 'pending' }, false);
      DB.patch('households', hid, { members: h.members.concat(u.id) });
      DB.audit('invited member', `${u.name} → ${h.name}`);
      m.close(); toast(`Invitation sent to ${esc(u.email)}.`, { type: 'success', icon: 'mail' }); R().render();
    });
  }

  V.household = (p) => {
    const h = L.household(p.id);
    if (!h) return { html: A.empty({ icon: 'search-x', title: 'Household not found' }) };
    const dogs = L.dogsFor(h.id);
    const mem = h.members.map((u) => L.user(u)).filter(Boolean);
    const sess = L.sessions.filter((s) => s.household === h.id).sort((a, b) => b.date.localeCompare(a.date));
    const media = L.media.filter((m) => m.dogs.some((d) => h.dogs.includes(d)));
    const grps = L.groups.filter((g) => g.members.includes(h.id));
    const cons = L.consents.filter((c) => mem.some((u) => c.subject.startsWith(u.name)));
    return {
      title: h.name, crumbs: [{ label: 'Clients', href: '#/clients' }, { label: h.name }],
      html: `${A.pageHead({ eyebrow: `${h.suburb} · client since ${UI.fmtDate(h.since, { month: 'long', year: 'numeric' })}`, title: esc(h.name), actions: `<button class="btn btn--sm btn--primary" data-rec>${icon('video')}Record</button><button class="btn btn--sm" data-add-dog>${icon('plus')}Add dog</button><button class="btn btn--sm" data-invite>${icon('user-plus')}Invite</button><button class="btn btn--sm btn--ghost" data-toggle-status>${icon(h.status === 'active' ? 'pause' : 'play')}${h.status === 'active' ? 'Deactivate' : 'Reactivate'}</button>` })}
        ${h.status !== 'active' ? `<div class="callout mb-3">${icon('pause')}<div><strong>Inactive household.</strong> Portal access is paused. Media is retained — nothing is deleted or exposed by deactivating.</div></div>` : ''}
        <div class="g g-main">
          <div class="g">
            <div class="g ${dogs.length > 1 ? 'g-2' : ''}">${dogs.map((d) => `<a class="dogcard" href="#/dog/${d.id}" style="min-height:300px"><div class="dogcard__img"><img src="${d.photo}" alt=""></div><div class="dogcard__top"><span class="badge badge--dotless" style="background:rgba(14,13,11,.6)">${d.status}</span>${ring(d.progress, { size: 52, stroke: 4 })}</div><div class="dogcard__body"><span class="dogcard__meta">${d.breed.toUpperCase()} · ${d.age.toUpperCase()}</span><span class="dogcard__name" style="font-size:3rem">${d.name}</span></div></a>`).join('') || A.empty({ icon: 'dog', title: 'No dogs yet', action: `<button class="btn btn--sm" data-add-dog>Add dog</button>` })}</div>
            ${A.sectionTitle('Sessions')}
            <div class="card"><div class="list">${sess.map((s) => `<a class="list-row" href="#/session/${s.id}"><span class="list-row__icon">${icon(s.status === 'active' ? 'radio' : s.status === 'scheduled' ? 'calendar-clock' : 'calendar-check')}</span><span class="list-row__main"><span class="list-row__title">${s.title}</span><span class="list-row__meta">${UI.fmtDay(s.date)} · ${s.dogs.map((d) => L.dog(d).name).join(' & ')} · ${s.media.length} clips</span></span><span class="list-row__trail">${A.badge(s.status)}${icon('chevron-right', 'chev')}</span></a>`).join('') || '<p class="card__body muted">No sessions yet.</p>'}</div></div>
            ${A.sectionTitle('Media', `<span class="faint text-sm">${media.filter(A.isApproved).length} shared · ${media.filter((m) => !A.isApproved(m)).length} private</span>`)}
            ${media.length ? `<div class="g g-auto-sm">${media.map((m) => A.mediaCard(m, { href: '#/review/' + m.id })).join('')}</div>` : A.empty({ icon: 'video', title: 'No media yet' })}
          </div>
          <aside class="g sticky-col">
            <div class="card"><div class="card__head"><span class="card__title">${icon('users')}Members</span></div>
              <div class="list mt-1">${mem.map((u) => `<div class="list-row">${A.avatar(u)}<span class="list-row__main"><span class="list-row__title">${u.name}</span><span class="list-row__meta">${u.email}<br>${u.phone || 'no phone'} · ${memberPerm(h, u)}</span></span><span class="list-row__trail" style="flex-direction:column;align-items:flex-end">${A.badge(u.invite)}${u.invite === 'pending' || u.invite === 'expired' || u.invite === 'not_sent' ? `<button class="btn btn--sm btn--ghost" data-resend="${u.id}">${u.invite === 'expired' ? 'Re-invite' : 'Resend'}</button>` : `<button class="btn btn--sm btn--ghost" data-revoke="${u.id}">Revoke</button>`}</span></div>`).join('')}</div></div>
            <div class="card panel"><span class="eyebrow">Training groups</span><div class="row row--wrap mt-2">${grps.map((g) => `<a class="tag" style="--tc:${g.color}" href="#/groups">${g.title}</a>`).join('') || '<span class="faint text-sm">Not in any group</span>'}</div></div>
            <div class="card panel"><span class="eyebrow">Consent records</span>${cons.map((c) => `<div class="row row--between mt-2 text-sm"><span>${c.kind}</span>${A.badge(c.status)}</div>`).join('') || '<p class="faint text-sm mt-1">None recorded.</p>'}<a class="link-arrow text-sm mt-2" href="#/consent">Manage ${icon('arrow-right')}</a></div>
          </aside>
        </div>`,
      mount(root) {
        root.addEventListener('click', async (e) => {
          if (e.target.closest('[data-add-dog]')) addDog(h.id);
          if (e.target.closest('[data-invite]')) inviteMember(h.id);
          if (e.target.closest('[data-rec]')) { R().go(dogs.length ? `#/record?step=session&hh=${h.id}&dog=${dogs[0].id}` : '#/record?change=1'); }
          const rs = e.target.closest('[data-resend]'); if (rs) { DB.patch('users', rs.dataset.resend, { invite: 'pending' }); DB.audit('re-sent invitation', L.user(rs.dataset.resend).name); toast('Invitation sent — expires in 7 days.', { icon: 'mail' }); R().render(); }
          const rv = e.target.closest('[data-revoke]');
          if (rv) { const u = L.user(rv.dataset.revoke); if (await confirm({ title: `Revoke ${u.name}’s access?`, sub: 'Playback stops immediately. Files already shared via WhatsApp can’t be recalled.', ok: 'Revoke access', danger: true })) { DB.patch('households', h.id, { members: h.members.filter((x) => x !== u.id) }); DB.audit('revoked access', `${u.name} → ${h.name}`); toast(`${esc(u.name)}’s access revoked.`, { type: 'success' }); R().render(); } }
          if (e.target.closest('[data-toggle-status]')) { const to = h.status === 'active' ? 'inactive' : 'active'; if (await confirm({ title: to === 'inactive' ? 'Deactivate household?' : 'Reactivate household?', sub: to === 'inactive' ? 'Members lose portal access. Media is kept — not deleted, not exposed.' : 'Members regain access to approved media.', ok: to === 'inactive' ? 'Deactivate' : 'Reactivate' })) { DB.patch('households', h.id, { status: to }); DB.audit(to === 'inactive' ? 'deactivated household' : 'reactivated household', h.name); R().render(); } }
        });
      }
    };
  };

  V.dog = (p) => {
    const d = L.dog(p.id);
    if (!d) return { html: A.empty({ icon: 'search-x', title: 'Dog not found' }) };
    const h = L.household(d.household);
    const sess = L.sessionsFor(d.id).sort((a, b) => b.date.localeCompare(a.date));
    const media = L.mediaFor(d.id);
    return {
      title: d.name, crumbs: [{ label: 'Clients', href: '#/clients' }, { label: h.name, href: '#/household/' + h.id }, { label: d.name }],
      html: `<section class="profile-cover vignette"><img src="${d.cover}" alt=""></section>
        <div class="profile-id"><span class="avatar"><img src="${d.avatar}" alt=""></span><div class="grow"><h1 class="serif" style="font-size:clamp(3rem,6vw,5rem);line-height:.9">${d.name}</h1><p class="muted">${d.breed} · ${d.age} · ${d.sex === 'F' ? 'Female' : 'Male'} · <a class="amber" href="#/household/${h.id}">${h.name}</a></p></div>
        <div class="row row--wrap"><a class="btn btn--primary" href="#/record?step=session&hh=${h.id}&dog=${d.id}">${icon('video')}Record ${d.name}</a><a class="btn" href="#/share">${icon('send')}Share</a></div></div>
        <div class="g g-main mt-4">
          <div class="g">
            <div class="g g-3">${A.stat({ label: 'Progress', value: d.progress, unit: '%', icon: 'trending-up' })}${A.stat({ label: 'Sessions', value: sess.length, icon: 'calendar-days' })}${A.stat({ label: 'Clips', value: media.length, sub: `${media.filter(A.isApproved).length} shared`, icon: 'film' })}</div>
            ${A.sectionTitle('Media')}
            ${media.length ? `<div class="g g-auto-sm">${media.map((m) => A.mediaCard(m, { href: '#/review/' + m.id })).join('')}</div>` : A.empty({ icon: 'video', title: 'No clips yet' })}
            ${A.sectionTitle('Sessions')}
            <div class="card"><div class="list">${sess.map((s) => `<a class="list-row" href="#/session/${s.id}"><span class="list-row__main"><span class="list-row__title">${s.title}</span><span class="list-row__meta">${UI.fmtDay(s.date)} · ${s.location}</span></span>${A.badge(s.status)}</a>`).join('') || '<p class="card__body muted">No sessions.</p>'}</div></div>
          </div>
          <aside class="g sticky-col">
            <div class="card panel g"><span class="eyebrow">Goals</span>${d.goals.map((g) => `<div class="row text-sm">${icon('flag', 'chev')}${g}</div>`).join('') || '<span class="faint text-sm">No goals yet</span>'}<span class="eyebrow mt-1">Techniques</span><div class="row row--wrap">${d.techniques.map(A.techTag).join('') || '<span class="faint text-sm">None tagged</span>'}</div></div>
            <div class="card panel g"><label class="eyebrow" for="dog-notes">Trainer notes</label><textarea class="textarea" id="dog-notes">${esc(d.notes)}</textarea><button class="btn btn--sm" data-save-notes style="justify-self:start">${icon('save')}Save notes</button></div>
          </aside>
        </div>`,
      mount(root) { $('[data-save-notes]', root).addEventListener('click', () => { DB.patch('dogs', d.id, { notes: $('#dog-notes', root).value }); toast('Notes saved.', { type: 'success' }); }); }
    };
  };

  /* ======================= SESSIONS ======================= */
  V.sessions = (p) => {
    const f = p.query.get('f') || 'all';
    const list = L.sessions.filter((s) => f === 'all' || s.status === f).sort((a, b) => b.date.localeCompare(a.date));
    return {
      title: 'Sessions', crumbs: [{ label: 'People' }, { label: 'Sessions' }],
      html: `${A.pageHead({ eyebrow: `${L.stats.trainer.sessionsThisMonth} this month`, title: 'Sess<em>ions</em>', actions: `<a class="btn btn--sm btn--primary" href="#/record?change=1">${icon('plus')}New session</a>` })}
        <div class="hscroll mb-2">${[['all', 'All'], ['active', 'Active'], ['scheduled', 'Scheduled'], ['completed', 'Completed']].map(([k, l]) => `<a class="chip ${f === k ? 'is-active' : ''}" href="#/sessions?f=${k}">${l} <span class="chip__count">${k === 'all' ? L.sessions.length : L.sessions.filter((s) => s.status === k).length}</span></a>`).join('')}</div>
        <div class="table-wrap hide-sm"><table class="table"><thead><tr><th>Date</th><th>Session</th><th>Dogs</th><th>Household</th><th>Clips</th><th>Status</th></tr></thead><tbody>${list.map((s) => `<tr class="is-link" data-href="#/session/${s.id}"><td class="mono nowrap">${UI.fmtDay(s.date)}<br><span class="faint">${UI.fmtTime(s.date)}</span></td><td><b>${s.title}</b><br><span class="faint text-xs">${s.location}</span></td><td><div class="row" style="--gap:6px">${s.dogs.map((d) => A.dogAvatar(L.dog(d), 'avatar--sm')).join('')}<span>${s.dogs.map((d) => L.dog(d).name).join(' & ')}</span></div></td><td>${L.household(s.household).name}</td><td class="mono">${s.media.length}</td><td>${A.badge(s.status)}</td></tr>`).join('')}</tbody></table></div>
        <div class="card show-sm" style="display:none"><div class="list">${list.map((s) => `<a class="list-row" href="#/session/${s.id}">${A.dogAvatar(L.dog(s.dogs[0]))}<span class="list-row__main"><span class="list-row__title">${s.title}</span><span class="list-row__meta">${UI.fmtDay(s.date)} · ${s.media.length} clips</span></span>${A.badge(s.status)}</a>`).join('')}</div></div>`,
      mount(root) { root.addEventListener('click', (e) => { const tr = e.target.closest('tr[data-href]'); if (tr) R().go(tr.dataset.href); }); }
    };
  };

  V.session = (p) => {
    const s = L.session(p.id);
    if (!s) return { html: A.empty({ icon: 'search-x', title: 'Session not found' }) };
    const h = L.household(s.household);
    const media = s.media.map((id) => L.mediaItem(id)).filter(Boolean);
    return {
      title: s.title, crumbs: [{ label: 'Sessions', href: '#/sessions' }, { label: s.title }],
      html: `${A.pageHead({ eyebrow: `${UI.fmtDay(s.date)} · ${UI.fmtTime(s.date)} · ${s.location}`, title: esc(s.title), sub: `${s.dogs.map((d) => L.dog(d).name).join(' & ')} · <a class="amber" href="#/household/${h.id}">${h.name}</a>`, actions: `${A.badge(s.status)}${s.status !== 'completed' ? `<button class="btn btn--sm btn--primary" data-rec>${icon('video')}Record into session</button><button class="btn btn--sm" data-end>${icon('square')}End session</button>` : ''}${media.some(A.isApproved) ? `<a class="btn btn--sm" href="#/share?media=${media.filter(A.isApproved).map((m) => m.id).join(',')}">${icon('send')}Share summary</a>` : ''}` })}
        <div class="g g-main">
          <div class="g">
            ${A.sectionTitle(`Clips <em>(${media.length})</em>`)}
            ${media.length ? `<div class="g g-auto-sm">${media.map((m) => A.mediaCard(m, { href: '#/review/' + m.id })).join('')}</div>` : A.empty({ icon: 'video', title: 'No clips yet', text: 'Record into this session and clips attach automatically.' })}
          </div>
          <aside class="g sticky-col">
            <div class="card panel g"><label class="eyebrow" for="s-notes">Session notes <span class="faint">(shared with household)</span></label><textarea class="textarea" id="s-notes" placeholder="What went well? What’s next?">${esc(s.notes)}</textarea></div>
            <div class="card panel g"><span class="eyebrow">Homework</span><div id="hw" class="g" style="gap:6px"></div><form class="row" id="hw-add"><input class="input input--sm" placeholder="Add a task — e.g. Recall ×5 in the garden" aria-label="New homework task"><button class="btn btn--sm btn--icon" aria-label="Add task">${icon('plus')}</button></form></div>
            <button class="btn btn--primary" data-save>${icon('save')}Save notes & homework</button>
          </aside>
        </div>`,
      mount(root) {
        let hw = s.homework.slice();
        const draw = () => { $('#hw', root).innerHTML = hw.map((x, i) => `<div class="row" style="--gap:8px;padding:6px 0;border-bottom:1px solid var(--line)"><span class="grow text-sm">${esc(x)}</span><button class="btn btn--sm btn--icon btn--ghost" data-del="${i}" aria-label="Remove">${icon('x')}</button></div>`).join('') || '<span class="faint text-sm">No homework yet.</span>'; icons(); };
        draw();
        $('#hw-add', root).addEventListener('submit', (e) => { e.preventDefault(); const i = $('input', e.currentTarget); if (i.value.trim()) { hw.push(i.value.trim()); i.value = ''; draw(); } });
        root.addEventListener('click', (e) => {
          const d = e.target.closest('[data-del]'); if (d) { hw.splice(+d.dataset.del, 1); draw(); }
          if (e.target.closest('[data-save]')) { DB.patch('sessions', s.id, { notes: $('#s-notes', root).value, homework: hw }); DB.audit('updated session notes', s.title); toast('Saved. The household sees notes & homework in their portal.', { type: 'success' }); }
          if (e.target.closest('[data-rec]')) { Ctx.set({ household: s.household, dog: s.dogs[0], session: s.id }); R().go('#/camera'); }
          if (e.target.closest('[data-end]')) AD.endSession(s.id);
        });
      }
    };
  };

  /* ======================= MEDIA LIBRARY ======================= */
  V.media = (p) => {
    const q = (p.query.get('q') || '').toLowerCase(), dog = p.query.get('dog') || 'all', t = p.query.get('t') || 'all', ed = p.query.get('ed') || 'all';
    const list = L.media.filter((m) => (dog === 'all' || m.dogs.includes(dog)) && (t === 'all' || m.techniques.includes(t)) && (ed === 'all' || m.editorial === ed || m.processing === ed) && (!q || (m.title + ' ' + m.notes).toLowerCase().includes(q))).sort((a, b) => b.created.localeCompare(a.created));
    const sel = (name, opts, cur, labelTxt) => `<select class="select select--sm" name="${name}" aria-label="${labelTxt}">${opts.map(([v, l]) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    return {
      title: 'Media library', crumbs: [{ label: 'Media' }, { label: 'Library' }],
      html: `${A.pageHead({ eyebrow: `${L.media.length} clips · ${L.media.filter((m) => m.editorial === 'published_public').length} public`, title: 'Media <em>library</em>', actions: `<a class="btn btn--sm btn--primary" href="#/record">${icon('video')}Record</a>` })}
        <form class="filterbar" id="mf">
          <div class="input-icon">${icon('search')}<input class="input input--sm" name="q" type="search" value="${esc(q)}" placeholder="Search titles & notes" style="padding-left:40px" aria-label="Search media"></div>
          ${sel('dog', [['all', 'All dogs']].concat(L.dogs.map((d) => [d.id, d.name])), dog, 'Dog')}
          ${sel('t', [['all', 'All techniques']].concat(L.techniques.map((x) => [x.id, x.name])), t, 'Technique')}
          ${sel('ed', [['all', 'All states'], ['needs_review', 'Needs review'], ['draft', 'Draft'], ['approved_private', 'Approved · private'], ['approved_shared', 'Approved · shared'], ['published_public', 'Public'], ['archived', 'Archived'], ['processing', 'Processing'], ['failed', 'Failed']], ed, 'State')}
        </form>
        <p class="faint text-sm mb-2">${list.length} result${list.length === 1 ? '' : 's'}</p>
        ${list.length ? `<div class="g g-auto">${list.map((m) => A.mediaCard(m, { href: '#/review/' + m.id })).join('')}</div>` : A.empty({ icon: 'search-x', title: 'No clips match', action: '<a class="btn btn--sm" href="#/media">Clear filters</a>' })}`,
      mount(root) {
        const f = $('#mf', root);
        const go = () => { const fd = new FormData(f); const qs = new URLSearchParams(); for (const [k, v] of fd) if (v && v !== 'all') qs.set(k, v); history.replaceState(null, '', '#/media' + (qs.toString() ? '?' + qs : '')); R().render(); const i = $('#mf input'); if (fd.get('q')) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } };
        f.addEventListener('change', go);
        let tm; $('input', f).addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(go, 350); });
        f.addEventListener('submit', (e) => { e.preventDefault(); go(); });
      }
    };
  };

  /* ======================= SHARE COMPOSER ======================= */
  const TEMPLATES = {
    session: { label: 'After a session', text: 'Kia ora {first}! Here’s today’s clip from {dog}’s session 🐾 {tip}' },
    homework: { label: 'Homework reminder', text: 'Hi {first} — a quick reminder for {dog}’s homework this week. Little and often!' },
    group: { label: 'Group class', text: 'Kia ora team! Here’s this week’s class clip — have a practice before our next session.' },
    blank: { label: 'Blank', text: '' }
  };
  function grantFor(m, hid) {
    if (m.editorial === 'published_public') return true;
    if ((m.grants || []).includes(hid)) return true;
    const h = L.household(hid);
    if (m.visibility === 'household' && m.dogs.some((d) => h.dogs.includes(d))) return true;
    if (m.visibility === 'group') { const g = L.groups.find((x) => x.id === m.group) || L.groups.find((x) => L.shares.some((s) => s.media.includes(m.id) && s.targets.includes(x.id))); if (g && g.members.includes(hid)) return true; }
    return false;
  }
  const expand = (t) => { const g = L.groups.find((x) => x.id === t); if (g) return g.members; const u = L.user(t); if (u) return [L.households.find((h) => h.members.includes(u.id)).id]; return [t]; };

  V.share = (p) => {
    const pre = (p.query.get('media') || '').split(',').filter((id) => L.mediaItem(id));
    const draft = DB.kv('shareDraft');
    const S = pre.length ? { media: pre, targets: [], mode: 'link_only', tpl: 'session', message: '', ack: false, state: 'draft', id: null, code: uid('s').slice(2) } : (draft && draft.state !== 'trainer_confirmed' && draft.state !== 'cancelled' ? draft : { media: [], targets: [], mode: 'link_only', tpl: 'session', message: '', ack: false, state: 'draft', id: null, code: uid('s').slice(2) });
    if (pre.length) { const hh = H.hhOfMedia(L.mediaItem(pre[0])); if (hh) S.targets = [hh.id]; }
    return {
      title: 'Share composer', crumbs: [{ label: 'Media & sharing' }, { label: 'Share composer' }],
      html: `${A.pageHead({ eyebrow: 'User-mediated WhatsApp sharing', title: 'Share <em>composer</em>', sub: 'Prepare a message and secure link, then send it yourself from WhatsApp. We record what you did — never “delivered” or “read”.', actions: `<button class="btn btn--sm btn--ghost" data-new>${icon('file-plus')}Start over</button><a class="btn btn--sm" href="#/shares">${icon('history')}History</a>` })}
        <div class="g g-main"><div class="g" id="sc-left"></div><aside class="g sticky-col" id="sc-right"></aside></div>`,
      mount(root) {
        const save = () => DB.kv('shareDraft', S);
        const first = () => { const t = S.targets[0]; if (!t) return 'there'; const h = L.household(t); if (h) return L.user(h.primary).name.split(' ')[0]; const u = L.user(t); if (u) return u.name.split(' ')[0]; return 'team'; };
        const sm = () => S.media.map((id) => L.mediaItem(id)).filter(Boolean);
        const fill = (txt) => { const m = sm()[0]; const d = m ? L.dog(m.dogs[0]) : null; return txt.replace('{first}', first()).replace('{dog}', d ? d.name : 'your dog').replace('{tip}', m && m.timestamps[0] ? `Watch from ${m.timestamps[0].t} — ${m.timestamps[0].label.toLowerCase()}.` : ''); };
        if (!S.message) S.message = fill(TEMPLATES[S.tpl].text);
        const link = () => `https://lindasdogtraining.co.nz/v/${S.code}`;
        const households = [...new Set(S.targets.flatMap(expand))];
        const issues = () => { const out = []; sm().forEach((m) => [...new Set(S.targets.flatMap(expand))].forEach((hid) => { if (!grantFor(m, hid)) out.push({ m, hid }); })); return out; };
        const people = () => { const hs = [...new Set(S.targets.flatMap(expand))]; const ids = new Set(); const pending = []; hs.forEach((hid) => L.household(hid).members.forEach((u) => { const us = L.user(u); if (!us) return; if (us.invite === 'accepted') ids.add(u); else pending.push(us); })); return { hs, ids: [...ids], pending }; };
        const locked = () => S.state !== 'draft';

        function left() {
          const iss = issues();
          const pp = people();
          const tabsAud = `${L.households.filter((h) => h.status === 'active').map((h) => `<div class="aud-row"><label class="check check--nostrike"><input type="checkbox" data-target="${h.id}" ${S.targets.includes(h.id) ? 'checked' : ''} ${locked() ? 'disabled' : ''}><span class="check__box"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span class="check__text"><b>${h.name}</b><small>${L.dogsFor(h.id).map((d) => d.name).join(', ')} · ${h.members.length} people</small></span></label></div>`).join('')}
            <p class="eyebrow mt-2">Training groups</p>
            ${L.groups.map((g) => `<div class="aud-row"><label class="check check--nostrike"><input type="checkbox" data-target="${g.id}" ${S.targets.includes(g.id) ? 'checked' : ''} ${locked() ? 'disabled' : ''}><span class="check__box"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span class="check__text"><b>${g.title}</b><small>${g.members.length} households · app group, not a WhatsApp group</small></span></label></div>`).join('')}`;
          $('#sc-left', root).innerHTML = `
            <div class="card"><div class="card__head"><span class="card__title"><span class="step-card__n">1</span>Videos</span><button class="btn btn--sm" data-pick-media ${locked() ? 'disabled' : ''}>${icon('plus')}Add</button></div>
              <div class="card__body"><div class="sel-media">${sm().map((m) => `<div class="sel-media__item"><img src="${L.thumb(m.clip, m.cover || 40)}" alt=""><div><b>${esc(m.title)}</b><small>${H.dogNames(m)} · ${m.duration} · ${A.label(m.editorial)}</small></div>${locked() ? '' : `<button class="btn btn--sm btn--icon btn--ghost" data-rm-media="${m.id}" aria-label="Remove">${icon('x')}</button>`}</div>`).join('') || '<p class="faint text-sm">Pick one or more approved videos.</p>'}</div></div></div>
            <div class="card"><div class="card__head"><span class="card__title"><span class="step-card__n">2</span>Audience</span><span class="faint text-xs">${pp.ids.length} people · ${pp.hs.length} households (deduplicated)</span></div>
              <div class="card__body">${tabsAud}
                ${S.targets.length && sm().length ? `<div class="g mt-2" style="gap:8px">${iss.length ? iss.map((x) => `<div class="grant-warn">${icon('shield-alert')}<span class="grow"><b>${L.household(x.hid).name}</b> has no access to “${esc(x.m.title)}”.</span>${locked() ? '' : `<button class="btn btn--sm" data-grant="${x.m.id}|${x.hid}">Grant access</button>`}</div>`).join('') : `<div class="grant-ok">${icon('shield-check')}Every recipient already has an access grant for every video.</div>`}${pp.pending.length ? `<div class="callout" style="font-size:.8125rem">${icon('mail')}<div>${pp.pending.map((u) => u.name).join(', ')} ${pp.pending.length > 1 ? 'haven’t' : 'hasn’t'} accepted their invitation yet — they can watch once they do.</div></div>` : ''}</div>` : ''}
              </div></div>
            <div class="card"><div class="card__head"><span class="card__title"><span class="step-card__n">3</span>Message</span><select class="select select--sm" id="tpl" style="width:auto" aria-label="Template" ${locked() ? 'disabled' : ''}>${Object.entries(TEMPLATES).map(([k, t]) => `<option value="${k}" ${S.tpl === k ? 'selected' : ''}>${t.label}</option>`).join('')}</select></div>
              <div class="card__body g"><textarea class="textarea" id="msg" ${locked() ? 'disabled' : ''} aria-label="Message">${esc(S.message)}</textarea><div class="row row--between text-xs faint"><span>${S.mode !== 'video_only' ? 'The secure portal link is added automatically.' : 'Video-only: the message isn’t sent with the file.'}</span><span class="mono" id="msg-c">${S.message.length}</span></div></div></div>
            <div class="card"><div class="card__head"><span class="card__title"><span class="step-card__n">4</span>How to send</span></div>
              <div class="card__body g">
                <div class="segmented" role="group" aria-label="Share mode">${[['link_only', 'link', 'Link only'], ['video_only', 'film', 'Video only'], ['link_and_video', 'layers', 'Link + video']].map(([k, ic, l]) => `<button type="button" data-mode="${k}" aria-pressed="${S.mode === k}" ${locked() ? 'disabled' : ''}>${icon(ic)}${l}</button>`).join('')}</div>
                <p class="text-sm muted">${{ link_only: 'Recommended. Recipients tap the secure link and sign in — access can be revoked any time.', video_only: 'Prepares a downloadable MP4 and opens the Share Sheet. No link, no message.', link_and_video: 'Sends the MP4 plus the message and link. iOS may drop the text, so we’ll guide you through a two-step send.' }[S.mode]}</p>
                ${S.mode !== 'link_only' ? `<div class="callout callout--ember">${icon('triangle-alert')}<div><strong>Sending the file creates a copy outside the portal.</strong> It can’t be revoked or recalled later, even if you remove access.<label class="check check--nostrike mt-1" style="min-height:auto;padding:6px 0 0"><input type="checkbox" id="ack" ${S.ack ? 'checked' : ''} ${locked() ? 'disabled' : ''}><span class="check__box"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span class="check__text">I understand — attach the video file</span></label></div></div>` : ''}
              </div></div>`;
          icons();
        }
        function right(prep) {
          const m = sm()[0];
          const tg = S.targets.length === 1 && L.household(S.targets[0]) ? L.user(L.household(S.targets[0]).primary) : null;
          const states = ['draft', 'prepared', 'handoff_opened', 'trainer_confirmed'];
          const si = states.indexOf(S.state);
          const vidBubble = S.mode !== 'link_only' && m ? `<div class="wa-bubble" style="padding:4px 4px 18px"><div class="wa-video"><img src="${L.thumb(m.clip, m.cover || 40)}" alt=""><span class="wa-video__play"><svg viewBox="0 0 24 24"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z"/></svg></span><span class="wa-video__meta">${icon('video')}${m.duration} · ${Math.max(4, Math.round(parseT(m.duration) * 0.4))} MB</span>${prep != null ? `<div class="wa-preparing">${ring(prep, { size: 44, stroke: 4 })}Preparing video…</div>` : ''}</div><span class="wa-bubble__time">${icon('clock')}not sent</span></div>` : '';
          const msgBubble = S.mode !== 'video_only' ? `<div class="wa-bubble">${m ? `<span class="wa-link"><img src="${L.thumb(m.clip, m.cover || 40)}" alt=""><span class="wa-link__txt"><b>${esc(m.title)}</b><small>Private training video · sign in to watch</small><small>lindasdogtraining.co.nz</small></span></span>` : ''}${esc(S.message)}${S.message ? '\n' : ''}<span class="wa-url">${link()}</span><span class="wa-bubble__time">${icon('clock')}not sent</span></div>` : '';
          $('#sc-right', root).innerHTML = `
            <div class="card panel"><div class="stepper">${states.map((s2, i) => `<div class="stepper__s ${i < si ? 'is-done' : i === si ? 'is-on' : ''}"><span class="stepper__dot"></span>${s2.replace('_', ' ')}</div>`).join('')}</div></div>
            <div class="wa-phone"><div class="wa-screen">
              <div class="wa-head">${icon('arrow-left')}${tg ? A.avatar(tg, 'avatar--sm') : `<span class="avatar avatar--sm avatar--alt">${icon('users')}</span>`}<div class="grow"><b>${tg ? tg.name : S.targets.length ? 'You’ll choose the chat in WhatsApp' : 'No recipient yet'}</b><small>${tg ? tg.phone : 'Preview — WhatsApp (personal)'}</small></div>${icon('video')}${icon('phone')}</div>
              <div class="wa-body"><span class="wa-day">Preview</span>${vidBubble}${msgBubble}${!m ? '<p style="align-self:center;color:#8696a0;font-size:.8rem;margin:auto">Add a video to preview</p>' : ''}</div>
              <div class="wa-input"><span>Message</span><i>${icon('send')}</i></div>
            </div></div>
            <div class="g" style="gap:8px">${actionsHTML()}</div>
            <p class="faint text-xs">Delivery and read receipts aren’t available for personal WhatsApp — this app never claims them.</p>`;
          icons();
        }
        function actionsHTML() {
          if (S.state === 'draft') return `<button class="btn btn--primary btn--lg btn--block" data-prepare>${icon('package-check')}Prepare share</button><button class="btn btn--ghost btn--block" data-save-draft>Save draft</button>`;
          if (S.state === 'prepared') return `<button class="btn btn--primary btn--lg btn--block" data-open-wa>${icon('message-circle')}Open WhatsApp</button><button class="btn btn--ghost btn--block" data-copy>${icon('copy')}Copy message & link</button><button class="btn btn--ghost btn--block" data-cancel-share>Cancel share</button>`;
          if (S.state === 'handoff_opened') return `<div class="callout">${icon('hand')}<div>Finished in WhatsApp? Let us know — we’ll record that <b>you</b> sent it.</div></div><button class="btn btn--primary btn--lg btn--block" data-confirm-sent>${icon('check')}I sent it</button><button class="btn btn--ghost btn--block" data-open-wa>Open WhatsApp again</button><button class="btn btn--ghost btn--block" data-cancel-share>I didn’t send it</button>`;
          return `<div class="grant-ok">${icon('check-check')}Recorded as sent by you · ${UI.fmtTime(nowISO())}</div><a class="btn btn--block" href="#/shares">View history</a><button class="btn btn--primary btn--block" data-new>New share</button>`;
        }
        const draw = (prep) => { left(); right(prep); };
        draw();
        const persistShare = (state) => {
          S.state = state;
          const rec = { mode: S.mode, media: S.media.slice(), targets: S.targets.slice(), state, message: S.message, created: S.created || nowISO(), opens: 0, log: (S.log = (S.log || []).concat({ state, t: nowISO() })) };
          if (!S.id) { S.created = rec.created; const sh = DB.add('shares', Object.assign({ id: 'sh-' + uid('n').slice(2) }, rec)); S.id = sh.id; }
          else DB.patch('shares', S.id, rec);
          save(); updateCounts();
        };
        root.addEventListener('change', (e) => {
          const t = e.target;
          if (t.dataset.target) { S.targets = t.checked ? S.targets.concat(t.dataset.target) : S.targets.filter((x) => x !== t.dataset.target); if (S.tpl !== 'blank') S.message = fill(TEMPLATES[S.tpl].text); save(); draw(); }
          if (t.id === 'tpl') { S.tpl = t.value; S.message = fill(TEMPLATES[S.tpl].text); save(); draw(); }
          if (t.id === 'ack') { S.ack = t.checked; save(); }
        });
        root.addEventListener('input', (e) => { if (e.target.id === 'msg') { S.message = e.target.value; $('#msg-c').textContent = S.message.length; right(); save(); } });
        root.addEventListener('click', async (e) => {
          const t = e.target;
          const md = t.closest('[data-mode]'); if (md && !locked()) { S.mode = md.dataset.mode; save(); draw(); }
          const rm = t.closest('[data-rm-media]'); if (rm) { S.media = S.media.filter((x) => x !== rm.dataset.rmMedia); save(); draw(); }
          if (t.closest('[data-pick-media]')) pickMedia();
          const gr = t.closest('[data-grant]');
          if (gr) { const [mid, hid] = gr.dataset.grant.split('|'); const m = L.mediaItem(mid); if (await confirm({ title: 'Grant access?', sub: `${L.household(hid).name} will be able to watch “${m.title}” in their portal. This is audited.`, ok: 'Grant access' })) { DB.patch('media', mid, { grants: (m.grants || []).concat(hid), editorial: m.editorial === 'approved_private' ? 'approved_shared' : m.editorial, visibility: m.visibility === 'trainer_only' ? 'household' : m.visibility }); DB.audit('granted access', `${m.title} → ${L.household(hid).name}`); toast('Access granted.', { type: 'success' }); draw(); } }
          if (t.closest('[data-save-draft]')) { persistShare('draft'); toast('Draft saved.', { type: 'success' }); }
          if (t.closest('[data-new]')) { DB.kv('shareDraft', null); R().go('#/share'); R().render(); }
          if (t.closest('[data-prepare]')) {
            if (!S.media.length) return toast('Add at least one video.', { type: 'error' });
            if (!S.targets.length) return toast('Choose who it’s for.', { type: 'error' });
            if (issues().length) return toast('Resolve access first — every recipient needs a grant.', { type: 'error' });
            if (S.mode !== 'video_only' && !S.message.trim()) return toast('Write a short message.', { type: 'error' });
            if (S.mode !== 'link_only' && !S.ack) return toast('Please confirm you understand the file can’t be recalled.', { type: 'error' });
            const btn = t.closest('[data-prepare]'); btn.classList.add('is-loading');
            if (S.mode !== 'link_only') { for (let i = 0; i <= 100; i += 8) { right(i); await sleep(160); } }
            else await sleep(800);
            persistShare('prepared');
            DB.audit('prepared share', `${sm().map((m) => m.title).join(', ')} → ${S.targets.map(targetName).join(', ')}`);
            toast(S.mode === 'link_only' ? 'Secure link and message prepared.' : 'MP4 export ready · short-lived download grant created.', { type: 'success' });
            draw();
          }
          if (t.closest('[data-copy]')) { try { await navigator.clipboard.writeText(S.message + '\n' + link()); } catch (er) {} toast('Message & link copied.', { icon: 'copy' }); }
          if (t.closest('[data-open-wa]')) handoff();
          if (t.closest('[data-confirm-sent]')) { persistShare('trainer_confirmed'); DB.audit('confirmed share sent (manual)', S.targets.map(targetName).join(', ')); DB.kv('shareDraft', null); toast('Recorded as sent by you. We don’t track delivery or reads.', { type: 'success', duration: 5000 }); draw(); }
          if (t.closest('[data-cancel-share]')) { if (await confirm({ title: 'Cancel this share?', ok: 'Cancel share', cancel: 'Keep', danger: true })) { persistShare('cancelled'); DB.kv('shareDraft', null); toast('Share cancelled.'); R().go('#/shares'); } }
        });
        function pickMedia() {
          const ok = L.media.filter((m) => ['approved_private', 'approved_shared', 'published_public'].includes(m.editorial));
          const mm = modal({ title: 'Choose videos', eyebrow: 'Approved only', size: 'wide', sub: 'Only approved clips can be shared. Drafts stay in the review queue.',
            body: `<div class="g g-3">${ok.map((m) => `<label class="cover-opt" style="aspect-ratio:auto;border-radius:16px;border:1px solid var(--line);padding:6px;display:grid;gap:6px"><input type="checkbox" value="${m.id}" ${S.media.includes(m.id) ? 'checked' : ''}><img src="${L.thumb(m.clip, m.cover || 40)}" alt="" style="aspect-ratio:16/10;border-radius:10px"><b class="text-sm">${esc(m.title)}</b><span class="faint text-xs">${H.dogNames(m)} · ${A.label(m.editorial)}</span></label>`).join('')}</div>`,
            foot: `<button class="btn btn--ghost" data-close>Cancel</button><button class="btn btn--primary" data-use>Use selected</button>` });
          $('[data-use]', mm.root).addEventListener('click', () => { S.media = $$('input:checked', mm.root).map((i) => i.value); if (S.tpl !== 'blank') S.message = fill(TEMPLATES[S.tpl].text); save(); mm.close(); draw(); });
        }
        function handoff() {
          const single = S.targets.length === 1 && L.household(S.targets[0]);
          const u = single ? L.user(L.household(S.targets[0]).primary) : null;
          const text = encodeURIComponent(S.message + '\n' + link());
          let body = '';
          if (S.mode === 'link_only') body = u ? `<p class="muted">WhatsApp opens with the message pre-filled for <b style="color:var(--bone)">${u.name}</b>. You press send.</p><div class="card panel mono text-xs mt-2" style="word-break:break-all">https://wa.me/${digits(u.phone)}?text=${text.slice(0, 90)}…</div>` : `<p class="muted">Your phone’s Share Sheet opens with the message and link. Choose the WhatsApp chat — the app can’t see or sync WhatsApp groups.</p>`;
          if (S.mode === 'video_only') body = `<p class="muted">The Share Sheet opens with the MP4. Pick the chat in WhatsApp and send.</p>`;
          if (S.mode === 'link_and_video') body = `<p class="muted">iOS often drops text when sharing a video file, so let’s do it in two steps — in the same chat:</p>
            <div class="g mt-2"><div class="card panel row row--between"><div><b>Step 1 · Share the video file</b><p class="faint text-sm">Opens the Share Sheet with the MP4</p></div><button class="btn btn--sm" data-step1>${icon('share')}Share file</button></div>
            <div class="card panel row row--between"><div><b>Step 2 · Paste the message & link</b><p class="faint text-sm">Copies to your clipboard</p></div><button class="btn btn--sm" data-step2 disabled>${icon('copy')}Copy text</button></div></div>`;
          const mm = modal({ title: S.mode === 'link_and_video' ? 'Two-step send' : 'Open WhatsApp', eyebrow: 'Handoff', body, foot: `<button class="btn btn--ghost" data-close>Not now</button><button class="btn btn--primary" data-go ${S.mode === 'link_and_video' ? 'disabled' : ''}>${icon('message-circle')}${S.mode === 'link_and_video' ? 'Done in WhatsApp' : 'Open WhatsApp'}</button>` });
          mm.root.addEventListener('click', async (e) => {
            if (e.target.closest('[data-step1]')) { e.target.closest('[data-step1]').innerHTML = icon('check') + 'Shared'; icons(); $('[data-step2]', mm.root).disabled = false; toast('Share Sheet opened with the MP4 (demo).', { icon: 'share' }); }
            if (e.target.closest('[data-step2]')) { try { await navigator.clipboard.writeText(S.message + '\n' + link()); } catch (er) {} e.target.closest('[data-step2]').innerHTML = icon('check') + 'Copied'; icons(); $('[data-go]', mm.root).disabled = false; }
            if (e.target.closest('[data-go]')) { mm.close(); persistShare('handoff_opened'); DB.audit('opened WhatsApp handoff', S.mode); toast('WhatsApp opened (demo). Come back to confirm.', { icon: 'message-circle' }); draw(); }
          });
        }
      }
    };
  };

  /* ======================= SHARE HISTORY ======================= */
  V.shares = (p) => {
    const list = L.shares.slice().sort((a, b) => b.created.localeCompare(a.created));
    return {
      title: 'Share history', crumbs: [{ label: 'Media & sharing' }, { label: 'Share history' }],
      html: `${A.pageHead({ eyebrow: `${list.length} shares`, title: 'Share <em>history</em>', actions: `<a class="btn btn--sm btn--primary" href="#/share">${icon('send')}New share</a>` })}
        <div class="callout callout--sky mb-3">${icon('info')}<div>States reflect what <b>you</b> did — prepared, opened WhatsApp, confirmed sent. Personal WhatsApp can’t report delivery or reads. “Portal opens” come from your own portal.</div></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Created</th><th>Media</th><th>Audience</th><th>Mode</th><th>State</th><th class="right">Portal opens</th></tr></thead><tbody>${list.map((s) => { const m = L.mediaItem(s.media[0]) || {}; return `<tr class="is-link" data-open="${s.id}"><td class="mono nowrap">${UI.fmtDate(s.created)}<br><span class="faint">${UI.fmtTime(s.created)}</span></td><td><div class="row" style="--gap:10px"><img src="${L.thumb(m.clip || 1552, 40)}" alt="" style="width:56px;height:36px;border-radius:8px;object-fit:cover"><span>${esc(m.title || '—')}${s.media.length > 1 ? ` <span class="faint">+${s.media.length - 1}</span>` : ''}</span></div></td><td>${s.targets.map(targetName).join(', ')}</td><td><span class="badge badge--dotless">${s.mode}</span></td><td>${A.badge(s.state)}</td><td class="right mono">${s.opens}</td></tr>`; }).join('')}</tbody></table></div>`,
      mount(root) {
        const open = (id) => {
          const s = L.shares.find((x) => x.id === id); if (!s) return;
          const log = s.log || [{ state: 'draft', t: s.created }].concat(s.state !== 'draft' ? [{ state: s.state, t: s.created }] : []);
          const dr = drawer({ label: 'Share details', html: `<div class="modal__head"><div><p class="eyebrow eyebrow--amber">${s.mode}</p><h2 class="modal__title">Share ${s.id}</h2></div><button class="btn btn--ghost btn--icon btn--sm" data-close aria-label="Close">${icon('x')}</button></div>
            <div class="modal__body g">
              <div class="row">${A.badge(s.state)}<span class="faint text-sm">${s.opens} portal opens</span></div>
              <div class="g" style="gap:8px">${s.media.map((id) => { const m = L.mediaItem(id); return m ? `<a class="sel-media__item" href="#/review/${m.id}" data-close><img src="${L.thumb(m.clip, 40)}" alt=""><div><b>${esc(m.title)}</b><small>${H.dogNames(m)}</small></div></a>` : ''; }).join('')}</div>
              <div><span class="eyebrow">Audience</span><p class="mt-1">${s.targets.map(targetName).join(', ')}</p></div>
              <div><span class="eyebrow">Message</span><div class="wa-bubble mt-1" style="max-width:100%">${esc(s.message || '(no message — video only)')}<span class="wa-bubble__time">${icon('clock')}${s.state === 'trainer_confirmed' ? 'sent by you' : 'not sent'}</span></div></div>
              <div><span class="eyebrow">Timeline</span><div class="timeline mt-2">${log.map((l) => `<div class="tl-item"><span class="tl-date">${UI.fmtDate(l.t)} ${UI.fmtTime(l.t)}</span><p class="text-sm">${A.label(l.state)}</p></div>`).join('')}</div></div>
              ${['prepared', 'handoff_opened'].includes(s.state) ? `<button class="btn btn--primary" data-mark>${icon('check')}I sent it</button>` : ''}
              ${s.state === 'draft' ? `<button class="btn btn--primary" data-resume>Continue in composer</button>` : ''}
            </div>` });
          dr.root.addEventListener('click', (e) => {
            if (e.target.closest('[data-mark]')) { DB.patch('shares', s.id, { state: 'trainer_confirmed', log: log.concat({ state: 'trainer_confirmed', t: nowISO() }) }); DB.audit('confirmed share sent (manual)', s.id); toast('Recorded as sent by you.', { type: 'success' }); dr.close(); R().render(); }
            if (e.target.closest('[data-resume]')) { DB.kv('shareDraft', { media: s.media, targets: s.targets, mode: s.mode, tpl: 'blank', message: s.message, ack: false, state: 'draft', id: s.id, code: uid('s').slice(2) }); dr.close(); R().go('#/share'); }
          });
        };
        root.addEventListener('click', (e) => { const tr = e.target.closest('[data-open]'); if (tr) open(tr.dataset.open); });
        if (p.query.get('open')) setTimeout(() => open(p.query.get('open')), 150);
      }
    };
  };

  /* ======================= WHATSAPP ARCHIVE INBOX ======================= */
  V.inbox = (p) => {
    const tab = p.query.get('tab') || 'unassigned';
    const groups = { unassigned: (i) => i.state === 'unassigned', attention: (i) => ['too_large', 'quarantined'].includes(i.state), assigned: (i) => i.state === 'assigned', all: () => true };
    const list = L.inbox.filter(groups[tab]).sort((a, b) => b.received.localeCompare(a.received));
    const wave = () => `<div class="waveform" aria-hidden="true">${Array.from({ length: 36 }, (_, i) => `<span style="height:${6 + Math.abs(Math.sin(i * 1.7) * 20) + (i % 3) * 2}px"></span>`).join('')}</div>`;
    const item = (i) => {
      const kindIc = { video: 'video', voice: 'mic', text: 'message-square' }[i.kind];
      let acts = '', extra = '';
      if (i.state === 'unassigned' && i.kind === 'video') acts = `<button class="btn btn--sm btn--primary" data-assign="${i.id}">${icon('dog')}Assign to dog & session</button><button class="btn btn--sm btn--ghost" data-discard="${i.id}">Discard</button>`;
      if (i.state === 'unassigned' && i.kind === 'voice') { extra = `${wave()}<div class="note" style="font-size:.875rem">${esc(i.transcript)}<div class="note__by">${icon('sparkles')} Auto-transcript · working audio copy deleted after processing</div></div>`; acts = `<button class="btn btn--sm btn--primary" data-voice="${i.id}">${icon('notebook-pen')}Save as session note</button><button class="btn btn--sm btn--ghost" data-discard="${i.id}">Discard</button>`; }
      if (i.state === 'too_large') { extra = `<div class="callout callout--ember" style="font-size:.8125rem">${icon('file-warning')}<div>${esc(i.error)}</div></div>`; acts = `<button class="btn btn--sm btn--primary" data-pwa>${icon('smartphone')}Use PWA upload instead</button><button class="btn btn--sm btn--ghost" data-discard="${i.id}">Dismiss</button>`; }
      if (i.state === 'quarantined') { extra = `<div class="callout" style="font-size:.8125rem">${icon('shield-alert')}<div>Unknown sender — quarantined. Only authorised trainer numbers can add to the archive. We never reply automatically.</div></div>`; acts = `<button class="btn btn--sm btn--danger" data-discard="${i.id}">${icon('trash-2')}Discard</button><button class="btn btn--sm btn--ghost" data-keep>Keep quarantined</button>`; }
      if (i.state === 'assigned') { const d = L.dog(i.assignedTo); acts = `${d ? `<span class="tag tag--plain">${A.dogAvatar(d, 'avatar--sm').replace('avatar--sm', 'avatar--sm" style="--size:20px')}${d.name}</span>` : ''}${i.media ? `<a class="btn btn--sm" href="#/review/${i.media}">Open clip ${icon('arrow-right')}</a>` : ''}`; }
      if (i.state === 'discarded') acts = '<span class="faint text-sm">Discarded</span>';
      return `<article class="wa-item ${i.state === 'quarantined' ? 'is-quarantined' : ''}">
        <div class="wa-item__media">${i.thumb ? `<img src="${i.thumb}" alt="">` : icon(kindIc)}<span class="wa-item__kind">${icon(kindIc)}</span></div>
        <div class="wa-item__body"><div class="wa-item__top"><span class="wa-item__caption">${esc(i.caption)}</span>${A.badge(i.state)}</div>
          <div class="wa-item__meta"><span>${i.from}</span><span>${UI.fmtDay(i.received)} ${UI.fmtTime(i.received)}</span>${i.size ? `<span>${i.size}</span>` : ''}${i.duration ? `<span>${i.duration}</span>` : ''}${i.forwarded ? '<span>forwarded</span>' : ''}</div>
          ${extra}<div class="wa-item__acts">${acts}</div></div></article>`;
    };
    return {
      title: 'WhatsApp archive', crumbs: [{ label: 'Media & sharing' }, { label: 'WhatsApp archive' }],
      html: `${A.pageHead({ eyebrow: `Archive number ${L.brand.archiveNumber}`, title: 'Archive <em>inbox</em>', sub: 'Forward clips from your personal WhatsApp to the archive number. Forwarded messages don’t say which client or dog they’re about — so nothing is assigned by guesswork.' })}
        <div class="g g-3 mb-3">${[['forward', 'Forward from personal WhatsApp', 'Linda’s number stays unchanged'], ['inbox', 'Lands here, unassigned', 'Unless you set an active session'], ['dog', 'You pick the dog & session', 'Then it enters normal review']].map(([ic, t, s], i) => `<div class="card panel row" style="--gap:14px;align-items:flex-start"><span class="list-row__icon">${icon(ic)}</span><div><span class="mono faint text-xs">0${i + 1}</span><b style="display:block">${t}</b><span class="faint text-sm">${s}</span></div></div>`).join('')}</div>
        <div class="tabs mb-3" role="tablist">${[['unassigned', 'Unassigned'], ['attention', 'Needs attention'], ['assigned', 'Assigned'], ['all', 'All']].map(([k, l]) => `<a role="tab" aria-selected="${tab === k}" href="#/inbox?tab=${k}">${l} <span class="sb-count">${L.inbox.filter(groups[k]).length}</span></a>`).join('')}</div>
        <div class="g">${list.map(item).join('') || A.empty({ icon: 'inbox', title: 'Inbox zero', text: 'Nothing waiting here.' })}</div>`,
      mount(root) {
        root.addEventListener('click', async (e) => {
          const as = e.target.closest('[data-assign]'); if (as) assignModal(L.inbox.find((x) => x.id === as.dataset.assign));
          const vo = e.target.closest('[data-voice]'); if (vo) voiceModal(L.inbox.find((x) => x.id === vo.dataset.voice));
          if (e.target.closest('[data-pwa]')) { R().go('#/record'); setTimeout(() => toast('Choose the original from your phone’s library — no 16 MB limit here.', { icon: 'smartphone', duration: 5000 }), 300); }
          if (e.target.closest('[data-keep]')) toast('Left in quarantine. No reply was sent.', { icon: 'shield-alert' });
          const dc = e.target.closest('[data-discard]'); if (dc) { if (await confirm({ title: 'Discard this item?', sub: 'It’s removed from the archive inbox. The audit log keeps a minimal record.', ok: 'Discard', danger: true })) { DB.patch('inbox', dc.dataset.discard, { state: 'discarded' }); DB.audit('discarded inbox item', dc.dataset.discard); updateCounts(); R().render(); } }
        });
      }
    };
  };
  function dogSessionPicker(onPick, opts = {}) {
    const m = modal({ title: opts.title || 'Assign to dog', eyebrow: opts.eyebrow || 'WhatsApp archive', size: 'wide', sub: 'Pick explicitly — forwarded metadata never identifies the client or dog.',
      body: `<div class="input-icon mb-2">${icon('search')}<input class="input" id="dq" placeholder="Search dogs or households" aria-label="Search dogs"></div>
        <div class="g g-auto-sm" id="dlist">${L.dogs.filter((d) => (L.household(d.household) || {}).status === 'active').map((d) => `<button class="pick" data-dog="${d.id}" data-q="${(d.name + ' ' + L.household(d.household).name).toLowerCase()}">${A.dogAvatar(d)}<div class="pick__main"><b>${d.name}</b><small>${L.household(d.household).name}</small></div></button>`).join('')}</div>
        <div id="spick" class="mt-3" hidden><span class="eyebrow">Session</span><div class="g mt-1" id="slist"></div></div>`,
      foot: `<button class="btn btn--ghost" data-close>Cancel</button><button class="btn btn--primary" data-go disabled>${icon('check')}${opts.cta || 'Assign'}</button>` });
    let dog = null, sess = null;
    $('#dq', m.root).addEventListener('input', (e) => { const v = e.target.value.toLowerCase(); $$('#dlist [data-q]', m.root).forEach((b) => (b.style.display = b.dataset.q.includes(v) ? '' : 'none')); });
    m.root.addEventListener('click', (e) => {
      const d = e.target.closest('[data-dog]');
      if (d) {
        dog = d.dataset.dog; $$('[data-dog]', m.root).forEach((b) => b.classList.toggle('is-selected', b === d));
        const ss = L.sessionsFor(dog).sort((a, b) => b.date.localeCompare(a.date));
        sess = ss[0] ? ss[0].id : '';
        $('#slist', m.root).innerHTML = ss.map((s, i) => `<label class="radio-card"><input type="radio" name="sess" value="${s.id}" ${i === 0 ? 'checked' : ''}><span class="radio-card__dot"></span><span><span class="radio-card__title">${s.title}</span><span class="radio-card__desc">${UI.fmtDay(s.date)} · ${s.status}</span></span></label>`).join('') + `<label class="radio-card"><input type="radio" name="sess" value="" ${ss.length ? '' : 'checked'}><span class="radio-card__dot"></span><span><span class="radio-card__title">No session — dog only</span></span></label>`;
        $('#spick', m.root).hidden = false; $('[data-go]', m.root).disabled = false;
      }
      if (e.target.closest('[data-go]')) { sess = ($('input[name="sess"]:checked', m.root) || {}).value || null; m.close(); onPick(dog, sess); }
    });
  }
  function assignModal(it) {
    dogSessionPicker((dogId, sessId) => {
      const d = L.dog(dogId);
      const mid = 'm-' + (5000 + Math.floor(Math.random() * 4000));
      DB.add('media', { id: mid, clip: it.clip || d.clip, title: it.caption.replace(/^Fwd:\s*/i, '').replace(/^./, (c) => c.toUpperCase()), dogs: [dogId], dogsConfirmed: true, session: sessId, source: 'whatsapp_archive', sourceMessageId: it.id, processing: 'processing', editorial: 'draft', duration: '0:' + String(12 + Math.floor(Math.random() * 40)).padStart(2, '0'), created: nowISO(), techniques: [], visibility: 'trainer_only', views: 0, notes: '', timestamps: [], ai: null });
      if (sessId) { const s = L.session(sessId); DB.patch('sessions', sessId, { media: s.media.concat(mid) }); }
      DB.patch('inbox', it.id, { state: 'assigned', assignedTo: dogId, media: mid });
      DB.audit('assigned inbox item', `${it.caption} → ${d.name}`);
      updateCounts();
      toast(`Assigned to <b>${d.name}</b> · ingesting into Stream (private).`, { type: 'success', icon: 'cloud-upload' });
      setTimeout(() => { const m = L.mediaItem(mid); DB.patch('media', mid, { processing: 'ready', editorial: 'needs_review', ai: genAI(m) }); updateCounts(); toast('Forwarded clip ready for review.', { icon: 'sparkles', action: { label: 'Review', fn: () => R().go('#/review/' + mid) } }); }, 3500);
      R().render();
    }, { cta: 'Assign & ingest' });
  }
  function voiceModal(it) {
    dogSessionPicker((dogId, sessId) => {
      const d = L.dog(dogId);
      if (sessId) { const s = L.session(sessId); DB.patch('sessions', sessId, { notes: (s.notes ? s.notes + '\n\n' : '') + '🎙 ' + it.transcript }); }
      else DB.patch('dogs', dogId, { notes: (d.notes ? d.notes + '\n' : '') + it.transcript });
      DB.patch('inbox', it.id, { state: 'assigned', assignedTo: dogId });
      DB.audit('saved voice note transcript', `→ ${d.name}`);
      updateCounts(); toast(`Transcript saved to ${d.name}${sessId ? '’s session notes' : ''}.`, { type: 'success' }); R().render();
    }, { title: 'Save voice note to…', cta: 'Save note' });
  }

  /* ======================= GROUPS ======================= */
  V.groups = () => ({
    title: 'Training groups', crumbs: [{ label: 'People' }, { label: 'Training groups' }],
    html: `${A.pageHead({ eyebrow: 'Application-managed audiences', title: 'Training <em>groups</em>', sub: 'Groups decide who can watch shared clips. They’re separate from WhatsApp groups — the app can’t see or sync those.', actions: `<button class="btn btn--sm btn--primary" data-new-group>${icon('plus')}New group</button>` })}
      <div class="g g-auto">${L.groups.map((g) => `<div class="card" style="overflow:hidden"><div style="height:6px;background:${g.color}"></div><div class="panel g">
        <div class="row row--between"><span class="badge badge--dotless">${g.type}</span><span class="faint text-xs mono">NEXT ${UI.fmtDay(g.next).toUpperCase()}</span></div>
        <h3 class="serif" style="font-size:2rem;line-height:1">${g.title}</h3>
        <div class="g" style="gap:6px">${g.members.map((hid) => { const h = L.household(hid); return h ? `<a class="row text-sm" style="--gap:10px" href="#/household/${h.id}"><div class="avatar-stack">${L.dogsFor(h.id).map((d) => A.dogAvatar(d, 'avatar--sm')).join('')}</div>${h.name}</a>` : ''; }).join('')}</div>
        <div class="row"><button class="btn btn--sm" data-edit-group="${g.id}">${icon('users')}Edit members</button><a class="btn btn--sm btn--ghost" href="#/share">${icon('send')}Share</a></div></div></div>`).join('')}</div>`,
    mount(root) {
      root.addEventListener('click', (e) => {
        const ed = e.target.closest('[data-edit-group]');
        if (ed) {
          const g = L.groups.find((x) => x.id === ed.dataset.editGroup);
          const m = modal({ title: 'Edit members', eyebrow: g.title, body: `<div class="g" style="gap:0">${L.households.filter((h) => h.status === 'active').map((h) => `<div class="aud-row"><label class="check check--nostrike"><input type="checkbox" value="${h.id}" ${g.members.includes(h.id) ? 'checked' : ''}><span class="check__box"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span class="check__text"><b>${h.name}</b><small>${L.dogsFor(h.id).map((d) => d.name).join(', ')}</small></span></label></div>`).join('')}</div><p class="faint text-xs mt-2">Removing a household revokes access to clips shared with this group.</p>`, foot: `<button class="btn btn--ghost" data-close>Cancel</button><button class="btn btn--primary" data-go>Save members</button>` });
          $('[data-go]', m.root).addEventListener('click', () => { const ids = $$('input:checked', m.root).map((i) => i.value); DB.patch('groups', g.id, { members: ids }); DB.audit('updated group membership', g.title); m.close(); toast('Group updated.', { type: 'success' }); R().render(); });
        }
        if (e.target.closest('[data-new-group]')) {
          const m = modal({ title: 'New group', body: `<form class="g" id="ng" novalidate><div class="field"><label class="field__label" for="g-t">Name</label><input class="input" id="g-t" data-validate="required" placeholder="e.g. Thursday Reactive Rover"><span class="field__error">${icon('circle-alert')}Required</span></div><div class="g g-2"><div class="field"><label class="field__label" for="g-ty">Type</label><select class="select" id="g-ty"><option>class</option><option>workshop</option><option>cohort</option></select></div><div class="field"><label class="field__label" for="g-d">Next session</label><input class="input" id="g-d" type="datetime-local" value="2026-10-30T10:00"></div></div></form>`, foot: `<button class="btn btn--ghost" data-close>Cancel</button><button class="btn btn--primary" data-go>Create group</button>` });
          $('[data-go]', m.root).addEventListener('click', () => { if (!validate($('#ng', m.root))) return; const g = DB.add('groups', { id: 'g-' + uid('n').slice(2), title: $('#g-t', m.root).value.trim(), type: $('#g-ty', m.root).value, members: [], color: ['#E8A33D', '#5B8C5A', '#6C8EAD', '#C8553D'][L.groups.length % 4], next: $('#g-d', m.root).value || '2026-10-30T10:00' }, false); DB.audit('created group', g.title); m.close(); toast('Group created — add members next.', { type: 'success' }); R().render(); });
        }
      });
    }
  });

  /* ======================= TECHNIQUES ======================= */
  V.techniques = () => ({
    title: 'Techniques', crumbs: [{ label: 'Academy' }, { label: 'Techniques' }],
    html: `${A.pageHead({ eyebrow: 'Controlled vocabulary', title: 'Tech<em>niques</em>', sub: 'The tags AI may suggest and you approve. Used across media, guides and the client portal.', actions: `<button class="btn btn--sm btn--primary" data-new-tech>${icon('plus')}Add technique</button>` })}
      <div class="table-wrap"><table class="table"><thead><tr><th>Technique</th><th class="hide-sm">Slug</th><th class="hide-sm">Description</th><th class="right">Clips</th><th class="right">Guides</th><th></th></tr></thead><tbody>${L.techniques.map((t) => `<tr data-tech="${t.id}"><td><div class="row" style="--gap:12px"><span class="list-row__icon" style="color:var(--tc);width:36px;height:36px">${icon(t.icon)}</span><b>${t.name}</b></div></td><td class="mono faint hide-sm">${t.slug}</td><td class="muted hide-sm">${t.blurb}</td><td class="right mono">${L.media.filter((m) => m.techniques.includes(t.id)).length}</td><td class="right mono">${L.guides.filter((g) => g.technique === t.id).length}</td><td class="right"><button class="btn btn--sm btn--ghost btn--icon" data-edit-tech="${t.id}" aria-label="Edit ${t.name}">${icon('pencil')}</button></td></tr>`).join('')}</tbody></table></div>`,
    mount(root) {
      const form = (t) => modal({ title: t ? 'Edit technique' : 'Add technique', body: `<form class="g" id="tf" novalidate><div class="field"><label class="field__label" for="t-n">Name</label><input class="input" id="t-n" data-validate="required" value="${t ? esc(t.name) : ''}"><span class="field__error">${icon('circle-alert')}Required</span></div><div class="field"><label class="field__label" for="t-b">Description</label><input class="input" id="t-b" value="${t ? esc(t.blurb) : ''}"></div><div class="field"><label class="field__label" for="t-i">Icon</label><select class="select" id="t-i">${['megaphone', 'footprints', 'hand', 'moon', 'users', 'sparkles', 'eye', 'ban', 'bone', 'heart', 'target'].map((i) => `<option ${t && t.icon === i ? 'selected' : ''}>${i}</option>`).join('')}</select></div></form>`, foot: `<button class="btn btn--ghost" data-close>Cancel</button><button class="btn btn--primary" data-go>Save</button>` });
      root.addEventListener('click', (e) => {
        const ed = e.target.closest('[data-edit-tech]');
        if (ed || e.target.closest('[data-new-tech]')) {
          const t = ed ? L.technique(ed.dataset.editTech) : null;
          const m = form(t);
          $('[data-go]', m.root).addEventListener('click', () => {
            if (!validate($('#tf', m.root))) return;
            const name = $('#t-n', m.root).value.trim(); const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            if (t) DB.patch('techniques', t.id, { name, blurb: $('#t-b', m.root).value, icon: $('#t-i', m.root).value });
            else DB.add('techniques', { id: 't-' + slug, name, slug, blurb: $('#t-b', m.root).value, icon: $('#t-i', m.root).value, color: '#E8A33D' }, false);
            DB.audit(t ? 'edited technique' : 'added technique', name);
            m.close(); toast('Saved.', { type: 'success' }); R().render();
          });
        }
      });
    }
  });

  /* ======================= ACADEMY CMS ======================= */
  const BLOCK_TYPES = { heading: ['heading-1', 'Heading'], text: ['type', 'Rich text'], steps: ['list-ordered', 'Steps'], video: ['film', 'Approved video'], photo: ['image', 'Photo'], callout: ['info', 'Callout'], mistakes: ['circle-x', 'Common mistakes'], homework: ['list-checks', 'Homework'], faq: ['circle-help', 'FAQ'], related: ['link', 'Related guide'] };
  function blocksFor(g) {
    const saved = DB.kv('cms.' + g.id);
    if (saved) return saved;
    const b = [{ type: 'heading', title: g.title, text: g.subtitle }];
    if (g.sections) {
      g.sections.forEach((s) => {
        if (s.steps) { b.push({ type: 'steps', title: s.h, items: s.steps }); b.push({ type: 'video', title: 'Recall demonstration', public: true, clip: g.clip, label: 'Public edition · consent recorded' }); }
        else if (s.list) b.push({ type: 'mistakes', title: s.h, items: s.list });
        else if (/safety/i.test(s.h)) b.push({ type: 'callout', title: s.h, text: s.body });
        else b.push({ type: 'text', title: s.h, text: s.body });
      });
      if (g.homework) b.push({ type: 'homework', title: 'Homework', items: g.homework });
      if (g.faqs) b.push({ type: 'faq', title: 'Questions', items: g.faqs.map((f) => f.q) });
      b.push({ type: 'related', title: 'Related guides', items: ['Loose-Lead Basics', 'The Check-In Game'] });
    } else {
      b.push({ type: 'text', title: 'Overview', text: g.subtitle + ' ' + (L.technique(g.technique) || {}).blurb });
      if (g.slug === 'leave-it') b.push({ type: 'video', title: 'Sit-stay at the door', media: 'm-1009' });
      b.push({ type: 'homework', title: 'Homework', items: ['[Linda to add]'] });
    }
    return b;
  }
  const blockOk = (b) => { if (b.type !== 'video') return true; if (b.public) return true; const m = L.mediaItem(b.media); return m && m.editorial === 'published_public'; };
  V.academy = () => ({
    title: 'Academy CMS', crumbs: [{ label: 'Academy' }, { label: 'Guides' }],
    html: `${A.pageHead({ eyebrow: 'Phase 2 · structured content', title: 'Academy <em>CMS</em>', sub: 'Guides are built from blocks. Videos are reused from your library — public pages only accept clips with a public edition and recorded consent.', actions: `<button class="btn btn--sm btn--primary" data-new-guide>${icon('plus')}New guide</button><a class="btn btn--sm" href="/v1/academy.html" target="_blank" rel="noopener">${icon('external-link')}View site</a>` })}
      <div class="table-wrap"><table class="table"><thead><tr><th>Guide</th><th>Technique</th><th class="hide-sm">Level</th><th>Status</th><th class="right">Assigned</th><th></th></tr></thead><tbody>${L.guides.map((g) => `<tr class="is-link" data-href="#/academy/${g.id}"><td><div class="row" style="--gap:12px"><img src="${g.hero.replace('/img/', '/thumb/')}" alt="" style="width:64px;height:40px;border-radius:8px;object-fit:cover"><div><b>${g.title}</b><div class="faint text-xs">/academy/${g.slug}</div></div></div></td><td>${A.techTag(g.technique)}</td><td class="hide-sm">${g.level}</td><td>${A.badge(g.status === 'published' ? 'published' : 'draft')}</td><td class="right mono">${g.assigned}</td><td class="right">${icon('chevron-right', 'chev')}</td></tr>`).join('')}</tbody></table></div>`,
    mount(root) {
      root.addEventListener('click', (e) => {
        const tr = e.target.closest('tr[data-href]'); if (tr) R().go(tr.dataset.href);
        if (e.target.closest('[data-new-guide]')) { const g = DB.add('guides', { id: 'g-' + uid('n').slice(2), slug: 'untitled-guide', title: 'Untitled guide', subtitle: 'A short promise for the reader.', technique: 't-focus', level: 'Foundation', minutes: 5, hero: L.img(50683, 40), clip: 50683, status: 'draft', assigned: 0 }, false); DB.audit('created guide draft', g.title); R().go('#/academy/' + g.id); }
      });
    }
  });
  V.academyEdit = (p) => {
    const g = L.guides.find((x) => x.id === p.id);
    if (!g) return { html: A.empty({ icon: 'search-x', title: 'Guide not found' }) };
    let blocks = blocksFor(g);
    return {
      title: 'Edit · ' + g.title, crumbs: [{ label: 'Academy CMS', href: '#/academy' }, { label: g.title }],
      html: `<header class="page-head"><div><p class="eyebrow eyebrow--amber">${A.label(g.status)} · last edited today</p><h1 class="page-head__title">${esc(g.title)}</h1></div>
        <div class="page-head__actions"><a class="btn btn--sm" href="${g.slug === 'recall-101' ? '/v1/guide/recall-101.html' : '/v1/guide/index.html?g=' + g.slug}" target="_blank" rel="noopener">${icon('eye')}Preview on site</a><button class="btn btn--sm btn--primary" data-publish>${icon('rocket')}${g.status === 'published' ? 'Republish' : 'Publish'}</button></div></header>
        <div class="g g-3 mb-3"><div class="field"><label class="field__label" for="c-title">Title</label><input class="input" id="c-title" value="${esc(g.title)}"></div><div class="field"><label class="field__label" for="c-slug">Slug</label><input class="input mono" id="c-slug" value="${esc(g.slug)}"></div><div class="field"><label class="field__label" for="c-seo">SEO description</label><input class="input" id="c-seo" value="${esc(g.subtitle)}"></div></div>
        <div class="cms">
          <div><div id="blocks"></div>
            <div class="card panel mt-2"><span class="eyebrow">Add block</span><div class="add-block mt-2">${Object.entries(BLOCK_TYPES).map(([k, [ic, l]]) => `<button data-add="${k}">${icon(ic)}${l}</button>`).join('')}</div></div></div>
          <div class="cms-preview sticky-col"><div class="cms-preview__bar"><i></i><i></i><i></i><span>lindasdogtraining.co.nz/academy/${esc(g.slug)}</span></div><div class="cms-preview__body" id="pv"></div></div>
        </div>`,
      mount(root) {
        const save = () => DB.kv('cms.' + g.id, blocks);
        const draw = () => {
          $('#blocks', root).innerHTML = blocks.map((b, i) => { const [ic, l] = BLOCK_TYPES[b.type]; const ok = blockOk(b); const m = b.media ? L.mediaItem(b.media) : null; return `<div class="block ${ok ? '' : 'is-flagged'}"><span class="block__icon">${icon(ic)}</span><div class="block__main"><div class="block__type">${l}</div><div class="block__title">${esc(b.title || '')}</div><div class="block__preview">${b.type === 'video' ? (b.public ? `${icon('globe', 'chev')} ${b.label}` : m ? `${esc(m.title)} — ${ok ? 'public' : `<span style="color:var(--ember-hi)">${A.label(m.editorial)} · not cleared for public use</span>`}` : '') : esc(b.text || (b.items || []).join(' · '))}</div></div><div class="block__acts"><button data-up="${i}" aria-label="Move up">${icon('chevron-up')}</button><button data-down="${i}" aria-label="Move down">${icon('chevron-down')}</button><button data-edit="${i}" aria-label="Edit">${icon('pencil')}</button><button data-del="${i}" aria-label="Delete">${icon('trash-2')}</button></div></div>`; }).join('');
          $('#pv', root).innerHTML = blocks.map((b) => {
            if (b.type === 'heading') return `<div><h1 class="serif">${esc(b.title)}</h1><p>${esc(b.text || '')}</p></div>`;
            if (b.type === 'text') return `<div><h2 class="serif">${esc(b.title)}</h2><p>${esc(b.text || '')}</p></div>`;
            if (b.type === 'callout') return `<div class="callout">${icon('shield-check')}<div><strong>${esc(b.title)}.</strong> ${esc(b.text || '')}</div></div>`;
            if (b.type === 'steps') return `<div><h2 class="serif">${esc(b.title)}</h2><ol>${(b.items || []).map((x, i) => `<li><b>${i + 1}</b><span>${esc(x)}</span></li>`).join('')}</ol></div>`;
            if (b.type === 'mistakes') return `<div><h2 class="serif">${esc(b.title)}</h2><div class="g" style="gap:6px">${(b.items || []).map((x) => `<div class="grant-warn">${icon('x')}${esc(x)}</div>`).join('')}</div></div>`;
            if (b.type === 'video') { const m = b.media ? L.mediaItem(b.media) : null; const clip = b.clip || (m && m.clip); return `<div style="position:relative;border-radius:14px;overflow:hidden;aspect-ratio:16/9"><img src="${L.img(clip || 1552, 40)}" alt="" style="width:100%;height:100%;object-fit:cover">${blockOk(b) ? '' : `<div class="mcard__lock" style="background:rgba(14,13,11,.75)">${icon('lock')}<b>Blocked on public pages</b><span>No public edition / consent</span></div>`}</div>`; }
            if (b.type === 'homework') return `<div class="card panel"><span class="eyebrow eyebrow--amber">Homework</span>${(b.items || []).map((x) => `<p class="row mt-1">${icon('square', 'chev')} ${esc(x)}</p>`).join('')}</div>`;
            if (b.type === 'faq') return `<div><h2 class="serif">${esc(b.title)}</h2>${(b.items || []).map((x) => `<p class="row" style="justify-content:space-between;border-top:1px solid var(--line);padding:10px 0">${esc(x)} ${icon('plus', 'chev')}</p>`).join('')}</div>`;
            if (b.type === 'photo') return `<img src="${L.img(b.clip || 50683, 40)}" alt="" style="border-radius:14px">`;
            if (b.type === 'related') return `<div><span class="eyebrow">Related</span><div class="row row--wrap mt-1">${(b.items || []).map((x) => `<span class="badge badge--dotless">${esc(x)}</span>`).join('')}</div></div>`;
            return '';
          }).join('');
          icons();
        };
        draw();
        const editBlock = (i) => {
          const b = blocks[i];
          if (b.type === 'video') { videoPicker((sel) => { blocks[i] = sel; save(); draw(); }); return; }
          const hasItems = Array.isArray(b.items);
          const m = modal({ title: 'Edit ' + BLOCK_TYPES[b.type][1].toLowerCase(), body: `<div class="g"><div class="field"><label class="field__label" for="b-t">Title</label><input class="input" id="b-t" value="${esc(b.title || '')}"></div><div class="field"><label class="field__label" for="b-x">${hasItems ? 'Items (one per line)' : 'Text'}</label><textarea class="textarea" id="b-x">${esc(hasItems ? b.items.join('\n') : b.text || '')}</textarea></div></div>`, foot: `<button class="btn btn--ghost" data-close>Cancel</button><button class="btn btn--primary" data-go>Save block</button>` });
          $('[data-go]', m.root).addEventListener('click', () => { b.title = $('#b-t', m.root).value; const x = $('#b-x', m.root).value; if (hasItems) b.items = x.split('\n').map((s) => s.trim()).filter(Boolean); else b.text = x; save(); m.close(); draw(); });
        };
        function videoPicker(cb) {
          const ready = L.media.filter((x) => x.processing === 'ready');
          const m = modal({ title: 'Insert approved video', eyebrow: 'From your library', size: 'wide', sub: 'Reuse — don’t re-upload. Only public editions with verified consent can go on public pages.',
            body: `<div class="g g-3">${ready.map((x) => { const ok = x.editorial === 'published_public'; return `<button class="mcard" data-vid="${x.id}" ${ok ? '' : 'aria-disabled="true"'} style="${ok ? '' : 'opacity:.55'}"><div class="mcard__thumb"><img src="${L.thumb(x.clip, 40)}" alt=""><span class="mcard__state">${A.badge(x.editorial)}</span></div><div class="mcard__body"><span class="mcard__title">${esc(x.title)}</span><span class="mcard__meta">${ok ? `${icon('globe')} cleared for public use` : `${icon('lock')} ${x.editorial === 'needs_review' ? 'not yet approved' : 'private — needs public edition + consent'}`}</span></div></button>`; }).join('')}</div>` });
          m.root.addEventListener('click', (e) => { const b = e.target.closest('[data-vid]'); if (!b) return; const x = L.mediaItem(b.dataset.vid); if (x.editorial !== 'published_public') { toast('That clip isn’t cleared for public pages. Create a public edition with recorded consent first.', { type: 'error', duration: 5000 }); return; } m.close(); cb({ type: 'video', title: x.title, media: x.id }); });
        }
        root.addEventListener('click', async (e) => {
          const t = e.target;
          const ad = t.closest('[data-add]');
          if (ad) { const type = ad.dataset.add; if (type === 'video') { videoPicker((sel) => { blocks.push(sel); save(); draw(); }); return; } blocks.push({ type, title: BLOCK_TYPES[type][1], text: '', items: ['steps', 'mistakes', 'homework', 'faq', 'related'].includes(type) ? ['New item'] : undefined }); save(); draw(); editBlock(blocks.length - 1); return; }
          const up = t.closest('[data-up]'); if (up) { const i = +up.dataset.up; if (i > 0) { [blocks[i - 1], blocks[i]] = [blocks[i], blocks[i - 1]]; save(); draw(); } return; }
          const dn = t.closest('[data-down]'); if (dn) { const i = +dn.dataset.down; if (i < blocks.length - 1) { [blocks[i + 1], blocks[i]] = [blocks[i], blocks[i + 1]]; save(); draw(); } return; }
          const de = t.closest('[data-del]'); if (de) { blocks.splice(+de.dataset.del, 1); save(); draw(); return; }
          const ed = t.closest('[data-edit]'); if (ed) { editBlock(+ed.dataset.edit); return; }
          if (t.closest('[data-publish]')) {
            const title = $('#c-title', root).value.trim(), slug = $('#c-slug', root).value.trim(), seo = $('#c-seo', root).value.trim();
            const vids = blocks.filter((b) => b.type === 'video');
            const bad = vids.filter((b) => !blockOk(b));
            const slugTaken = L.guides.some((x) => x.id !== g.id && x.slug === slug);
            const checks = [
              [!!title, 'Title set', title || 'Missing'],
              [!!slug && !slugTaken && /^[a-z0-9-]+$/.test(slug), 'Slug is unique & URL-safe', slugTaken ? 'Already used by another guide' : '/academy/' + slug],
              [seo.length >= 20, 'SEO description', seo.length + ' characters'],
              [bad.length === 0, 'Every video has public publication permission', bad.length ? bad.map((b) => `“${b.title}” is ${A.label((L.mediaItem(b.media) || {}).editorial)}`).join('; ') : `${vids.length} video${vids.length === 1 ? '' : 's'} cleared`],
              [bad.length === 0, 'Consent verified for identifiable people', bad.length ? 'Blocked by the video above' : 'Consent records checked'],
              [blocks.some((b) => b.type === 'homework'), 'Assignable homework checklist', blocks.some((b) => b.type === 'homework') ? 'Included' : 'Optional']
            ];
            const pass = checks.slice(0, 5).every((c) => c[0]);
            const m = modal({ title: pass ? 'Ready to publish' : 'Not quite ready', eyebrow: 'Publish check', body: `<ul class="checklist">${checks.map(([ok, l, s]) => `<li class="${ok ? 'ok' : 'bad'}">${icon(ok ? 'circle-check' : 'circle-x')}<div><b>${l}</b><small>${esc(s)}</small></div></li>`).join('')}</ul>`, foot: `<button class="btn btn--ghost" data-close>Back to editing</button><button class="btn btn--primary" data-go ${pass ? '' : 'disabled'}>${icon('rocket')}Publish now</button>` });
            $('[data-go]', m.root).addEventListener('click', () => { DB.patch('guides', g.id, { title, slug, subtitle: seo, status: 'published' }); DB.audit('published guide', title); m.close(); toast(`${esc(title)} is live in the Academy.`, { type: 'success' }); R().render(); });
          }
        });
      }
    };
  };

  /* ======================= CONSENT ======================= */
  V.consent = (p) => ({
    title: 'Consent records', crumbs: [{ label: 'Governance' }, { label: 'Consent' }],
    html: `${A.pageHead({ eyebrow: 'Publication permission', title: 'Consent <em>records</em>', sub: 'Public use of identifiable people needs recorded, scoped consent — and withdrawal must trigger a prompt takedown.', actions: `<button class="btn btn--sm btn--primary" data-new>${icon('plus')}Record consent</button>` })}
      <div class="table-wrap"><table class="table"><thead><tr><th>Subject</th><th>Scope</th><th class="hide-sm">Media</th><th class="hide-sm">Evidence</th><th>Date</th><th>Status</th><th></th></tr></thead><tbody>${L.consents.map((c) => { const m = c.media ? L.mediaItem(c.media) : null; return `<tr><td><b>${esc(c.subject)}</b></td><td>${esc(c.kind)}</td><td class="hide-sm">${m ? `<a class="amber" href="#/review/${m.id}">${esc(m.title)}</a>` : '<span class="faint">All media</span>'}</td><td class="hide-sm muted">${esc(c.evidence)}</td><td class="mono nowrap">${UI.fmtDate(c.date, { day: 'numeric', month: 'short', year: 'numeric' })}${c.withdrawn ? `<br><span class="faint">withdrawn ${UI.fmtDate(c.withdrawn)}</span>` : ''}</td><td>${A.badge(c.status)}</td><td class="right">${c.status === 'active' ? `<button class="btn btn--sm btn--ghost" data-withdraw="${c.id}">Withdraw</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>
      <div class="placeholder mt-3">Consent wording, collection notices and the named privacy contact are to be confirmed with Linda and a privacy reviewer (NZ IPP3A applies from 1 May 2026).</div>`,
    mount(root) {
      root.addEventListener('click', async (e) => {
        const wd = e.target.closest('[data-withdraw]');
        if (wd) {
          const c = L.consents.find((x) => x.id === wd.dataset.withdraw);
          const pub = L.media.filter((m) => m.editorial === 'published_public' && (c.media ? m.id === c.media : true) && L.households.some((h) => h.members.some((u) => c.subject.startsWith((L.user(u) || {}).name)) && m.dogs.some((d) => h.dogs.includes(d))));
          if (!(await confirm({ title: 'Withdraw consent?', sub: `${c.subject} · ${c.kind}`, body: pub.length ? `<div class="callout callout--ember">${icon('triangle-alert')}<div><b>${pub.length} public video${pub.length > 1 ? 's' : ''}</b> will be unpublished immediately: ${pub.map((m) => esc(m.title)).join(', ')}.</div></div>` : '', ok: 'Withdraw & take down', danger: true }))) return;
          DB.patch('consents', c.id, { status: 'withdrawn', withdrawn: '2026-10-17' });
          pub.forEach((m) => DB.patch('media', m.id, { editorial: 'approved_shared', visibility: 'household' }));
          DB.audit('consent withdrawn · takedown', `${c.subject} (${pub.length} unpublished)`);
          toast(`Consent withdrawn${pub.length ? ` · ${pub.length} video unpublished` : ''}.`, { type: 'success' }); R().render();
        }
        if (e.target.closest('[data-new]')) newConsent();
      });
      if (p.query.get('new')) setTimeout(newConsent, 200);
      function newConsent() {
        const people = L.users.filter((u) => u.role === 'client');
        const m = modal({ title: 'Record consent', size: 'wide', body: `<form class="g" id="nc"><div class="g g-2"><div class="field"><label class="field__label" for="n-s">Person</label><select class="select" id="n-s">${people.map((u) => `<option value="${u.id}">${u.name} — ${(L.households.find((h) => h.members.includes(u.id)) || {}).name || ''}</option>`).join('')}</select></div>
          <div class="field"><label class="field__label" for="n-k">Scope</label><select class="select" id="n-k"><option>Public website + guides</option><option>Household sharing only</option><option>Training groups</option><option>Public website</option></select></div>
          <div class="field"><label class="field__label" for="n-m">Specific media <span class="faint">optional</span></label><select class="select" id="n-m"><option value="">All future media</option>${L.media.filter((x) => x.processing === 'ready').map((x) => `<option value="${x.id}">${esc(x.title)}</option>`).join('')}</select></div>
          <div class="field"><label class="field__label" for="n-e">Evidence</label><select class="select" id="n-e"><option>Signed digital form</option><option>Email</option><option>Onboarding form</option></select></div></div>
          <label class="check check--nostrike"><input type="checkbox" id="n-minor"><span class="check__box"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span class="check__text">Footage may include children — guardian consent attached</span></label></form>`, foot: `<button class="btn btn--ghost" data-close>Cancel</button><button class="btn btn--primary" data-go>Save consent</button>` });
        $('[data-go]', m.root).addEventListener('click', () => { const u = L.user($('#n-s', m.root).value); DB.add('consents', { id: 'c-' + uid('n').slice(2), subject: u.name, media: $('#n-m', m.root).value || null, kind: $('#n-k', m.root).value, evidence: $('#n-e', m.root).value, date: '2026-10-17', status: 'active' }); DB.audit('recorded consent', `${u.name} · ${$('#n-k', m.root).value}`); m.close(); toast('Consent recorded.', { type: 'success' }); R().render(); });
      }
    }
  });

  /* ======================= AUDIT ======================= */
  V.audit = (p) => {
    const who = p.query.get('who') || 'all';
    const list = L.audit.filter((a) => who === 'all' || (who === 'clients' ? !['Linda', 'System'].includes(a.actor) : a.actor === who)).sort((a, b) => b.t.localeCompare(a.t));
    const byDay = {};
    list.forEach((a) => { const k = a.t.slice(0, 10); (byDay[k] = byDay[k] || []).push(a); });
    return {
      title: 'Audit log', crumbs: [{ label: 'Governance' }, { label: 'Audit log' }],
      html: `${A.pageHead({ eyebrow: 'Minimal, append-only', title: 'Audit <em>log</em>', sub: 'Permission changes, approvals, shares and consent — who did what, when. No tokens, transcripts or media payloads are logged.', actions: `<button class="btn btn--sm" data-export>${icon('download')}Export CSV</button>` })}
        <div class="hscroll mb-3">${[['all', 'Everyone'], ['Linda', 'Linda'], ['System', 'System'], ['clients', 'Clients']].map(([k, l]) => `<a class="chip ${who === k ? 'is-active' : ''}" href="#/audit?who=${k}">${l}</a>`).join('')}</div>
        ${Object.keys(byDay).map((day) => `<div class="mb-3"><p class="eyebrow mb-2">${UI.fmtDay(day + 'T12:00')}</p><div class="card"><div class="list">${byDay[day].map((a) => `<div class="list-row">${a.actor === 'System' ? `<span class="avatar avatar--sm avatar--alt">${icon('cpu')}</span>` : A.avatar(L.users.find((u) => u.name === a.actor || u.name.startsWith(a.actor)) || { id: 'u-x', name: a.actor }, 'avatar--sm')}<span class="list-row__main"><span class="list-row__title"><b>${esc(a.actor)}</b> <span class="muted" style="font-weight:500">${esc(a.action)}</span></span><span class="list-row__meta">${esc(a.entity)}</span></span><span class="mono faint text-xs">${UI.fmtTime(a.t)}</span>${a.fresh ? A.badge('ready', 'new') : ''}</div>`).join('')}</div></div></div>`).join('') || A.empty({ icon: 'scroll-text', title: 'No events' })}`,
      mount(root) { root.addEventListener('click', (e) => { if (e.target.closest('[data-export]')) toast('audit-log-2026-10.csv exported (demo).', { icon: 'download' }); }); }
    };
  };

  /* ======================= SETTINGS ======================= */
  V.settings = () => {
    const lim = DB.kv('limits') || { dur: 15, size: 1.5 };
    const ai = DB.kv('ai') || { ceiling: L.stats.trainer.aiCeiling, perVideo: 0.25, retries: 2, transcribe: true };
    const st = L.stats.trainer;
    return {
      title: 'Settings', crumbs: [{ label: 'Governance' }, { label: 'Settings' }],
      html: `${A.pageHead({ eyebrow: 'Workspace', title: 'Sett<em>ings</em>' })}
        <div class="g g-2">
          <div class="card"><div class="card__head"><span class="card__title">${icon('gauge')}Upload limits</span></div><div class="card__body g">
            <div class="field"><label class="field__label" for="s-dur">Max video length <b class="mono amber" id="s-dur-v">${lim.dur} min</b></label><input class="range" type="range" id="s-dur" min="1" max="60" value="${lim.dur}"></div>
            <div class="field"><label class="field__label" for="s-size">Max file size <b class="mono amber" id="s-size-v">${lim.size} GB</b></label><input class="range" type="range" id="s-size" min="0.1" max="5" step="0.1" value="${lim.size}"></div>
            <p class="faint text-xs">Generous by design — a warning and recovery path beats a bespoke compressor.</p></div></div>
          <div class="card"><div class="card__head"><span class="card__title">${icon('sparkles')}AI assistance</span></div><div class="card__body g">
            <div class="gauge"><div class="gauge__nums"><b>$${st.aiSpendMonth.toFixed(2)}</b><span>this month</span></div><div class="progress"><div class="progress__bar" id="ai-bar" style="--p:${(st.aiSpendMonth / ai.ceiling) * 100}%"></div></div></div>
            <div class="g g-3"><div class="field"><label class="field__label" for="a-c">Monthly ceiling ($)</label><input class="input input--sm" id="a-c" type="number" min="1" value="${ai.ceiling}"></div><div class="field"><label class="field__label" for="a-p">Per video ($)</label><input class="input input--sm" id="a-p" type="number" step="0.05" value="${ai.perVideo}"></div><div class="field"><label class="field__label" for="a-r">Retries</label><input class="input input--sm" id="a-r" type="number" min="0" max="5" value="${ai.retries}"></div></div>
            <label class="switch" style="justify-content:space-between"><span>Transcribe speech when present</span><input type="checkbox" id="a-t" ${ai.transcribe ? 'checked' : ''}><span class="switch__track"></span></label></div></div>
          <div class="card"><div class="card__head"><span class="card__title">${icon('message-circle')}WhatsApp archive</span></div><div class="card__body g">
            <div class="kv"><dt>Archive number</dt><dd class="mono">${L.brand.archiveNumber} <button class="btn btn--sm btn--ghost btn--icon" data-copy="${L.brand.archiveNumber}" aria-label="Copy">${icon('copy')}</button></dd><dt>Mode</dt><dd>Inbound only</dd><dt>Authorised senders</dt><dd class="mono">${L.brand.phone} (Linda)</dd><dt>Unknown senders</dt><dd>Quarantine · never auto-reply</dd><dt>Video limit</dt><dd>16 MB (Cloud API)</dd></div>
            <button class="btn btn--sm" data-add-sender style="justify-self:start">${icon('plus')}Add authorised number</button></div></div>
          <div class="card"><div class="card__head"><span class="card__title">${icon('shield')}Privacy defaults</span></div><div class="card__body g">
            ${[['New media visibility', 'trainer_only', true], ['Signed playback URLs', 'required', true], ['Default share mode', 'link_only', true], ['Public requires consent check', 'always', true]].map(([k, v]) => `<div class="row row--between text-sm" style="padding:8px 0;border-bottom:1px solid var(--line)"><span>${k}</span><span class="row" style="--gap:8px"><span class="badge badge--dotless">${v}</span>${icon('lock', 'chev')}</span></div>`).join('')}
            <p class="faint text-xs">Locked by design — these protect clients by default.</p></div></div>
        </div>
        ${A.sectionTitle('Integrations')}
        <div class="g g-3">${[
          ['cloud', 'Cloudflare Stream', 'Connected', `${st.streamMinutesStored.toLocaleString()} min stored · ${st.streamMinutesDelivered.toLocaleString()} delivered (30d)`, 'Webhook signature verified · tus enabled'],
          ['message-circle', 'WhatsApp Cloud API', 'Connected', 'Archive number verified · last event 08:12 today', 'Inbound only · signature checks on'],
          ['bot', 'AI provider', 'Healthy', `$${st.aiSpendMonth.toFixed(2)} of $${ai.ceiling} · 0 failed jobs`, 'Draft-only · DPA review pending']
        ].map(([ic, n, s, a, b]) => `<div class="card panel integ"><div class="integ__head"><span class="integ__logo">${icon(ic)}</span><div class="grow"><b>${n}</b><div><span class="status-dot">${s}</span></div></div></div><p class="text-sm muted">${a}</p><p class="faint text-xs">${b}</p><button class="btn btn--sm" data-test="${n}" style="justify-self:start">${icon('activity')}Test connection</button></div>`).join('')}</div>
        ${A.sectionTitle('Demo')}
        <div class="card panel row row--between row--wrap"><div><b>Reset demo data</b><p class="faint text-sm">Clears approvals, uploads, shares and edits made in this browser (portal included).</p></div><button class="btn btn--danger" data-reset>${icon('rotate-ccw')}Reset demo</button></div>`,
      mount(root) {
        const saveLim = () => { DB.kv('limits', { dur: +$('#s-dur', root).value, size: +$('#s-size', root).value }); };
        root.addEventListener('input', (e) => {
          if (e.target.id === 's-dur') $('#s-dur-v', root).textContent = e.target.value + ' min';
          if (e.target.id === 's-size') $('#s-size-v', root).textContent = e.target.value + ' GB';
        });
        root.addEventListener('change', (e) => {
          if (['s-dur', 's-size'].includes(e.target.id)) { saveLim(); toast('Limits saved.', { type: 'success' }); }
          if (['a-c', 'a-p', 'a-r', 'a-t'].includes(e.target.id)) { const v = { ceiling: +$('#a-c', root).value || 40, perVideo: +$('#a-p', root).value, retries: +$('#a-r', root).value, transcribe: $('#a-t', root).checked }; DB.kv('ai', v); L.stats.trainer.aiCeiling = v.ceiling; $('#ai-bar', root).style.setProperty('--p', Math.min(100, (st.aiSpendMonth / v.ceiling) * 100) + '%'); toast('AI settings saved.', { type: 'success' }); }
        });
        root.addEventListener('click', async (e) => {
          const ts = e.target.closest('[data-test]');
          if (ts) { ts.classList.add('is-loading'); await sleep(1300); ts.classList.remove('is-loading'); toast(`${ts.dataset.test}: OK · 142 ms`, { type: 'success' }); }
          const cp = e.target.closest('[data-copy]'); if (cp) { try { await navigator.clipboard.writeText(cp.dataset.copy); } catch (er) {} toast('Copied.', { icon: 'copy' }); }
          if (e.target.closest('[data-add-sender]')) toast('Adding trainer numbers arrives with staff accounts (later phase).', { icon: 'info' });
          if (e.target.closest('[data-reset]')) { if (await confirm({ title: 'Reset the demo?', sub: 'Everything returns to the original mock data.', ok: 'Reset', danger: true })) { try { localStorage.removeItem('linda.v1.portal.hh'); } catch (er) {} DB.reset(); } }
        });
      }
    };
  };

  /* ======================= BOOT ======================= */
  AD.boot([
    { path: '/clients', nav: 'clients', view: V.clients },
    { path: '/household/:id', nav: 'clients', back: '#/clients', view: V.household },
    { path: '/dog/:id', nav: 'clients', back: (p) => { const d = L.dog(p.id); return d ? '#/household/' + d.household : '#/clients'; }, view: V.dog },
    { path: '/sessions', nav: 'sessions', view: V.sessions },
    { path: '/session/:id', nav: 'sessions', back: '#/sessions', view: V.session },
    { path: '/media', nav: 'media', view: V.media },
    { path: '/share', nav: 'share', view: V.share },
    { path: '/shares', nav: 'shares', view: V.shares },
    { path: '/inbox', nav: 'inbox', view: V.inbox },
    { path: '/groups', nav: 'groups', view: V.groups },
    { path: '/techniques', nav: 'techniques', view: V.techniques },
    { path: '/academy', nav: 'academy', view: V.academy },
    { path: '/academy/:id', nav: 'academy', back: '#/academy', view: V.academyEdit },
    { path: '/consent', nav: 'consent', view: V.consent },
    { path: '/audit', nav: 'audit', view: V.audit },
    { path: '/settings', nav: 'settings', view: V.settings }
  ]);
})();
