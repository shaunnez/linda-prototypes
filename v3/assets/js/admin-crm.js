/* ==========================================================================
   V3 · admin-crm — clients/households, dogs, sessions, groups, techniques
   ========================================================================== */
(function () {
  'use strict';
  const V3 = window.V3;
  const { $, $$, esc, icon } = V3;
  const db = V3.db;
  const A = V3.A;
  const R = A.routes;

  /* Clients / households list --------------------------------------------- */
  R['clients'] = (_, q) => {
    const f = q.get('s') || 'active';
    return {
      title: 'Clients & households', nav: 'clients', mtitle: 'Clients',
      html: `${A.vh(`<span>${db.households.length} households · ${db.dogs.length} dogs · ${db.users.filter((u) => u.role === 'client').length} people</span>`, 'Clients &amp; households', 'A household holds people and dogs. People can belong to more than one.', `<button class="btn btn--accent btn--sm" type="button" data-new>${icon('plus')} Add household</button>`)}
      <div class="toolbar-a"><label class="input-group"><i data-lucide="search"></i><span class="sr-only">Search</span><input class="input input--sm" type="search" data-q placeholder="Search people, dogs, suburbs…"></label>
        <div class="seg" role="group" aria-label="Status">${[['active', 'Active'], ['inactive', 'Inactive'], ['all', 'All']].map(([k, l]) => `<button type="button" data-s="${k}" aria-pressed="${f === k}">${l}</button>`).join('')}</div></div>
      <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Household</th><th>Dogs</th><th class="hide-m">People</th><th class="hide-m">Last session</th><th>Status</th></tr></thead><tbody data-rows></tbody></table></div></div>`,
      mount(v) {
        let st = f;
        const draw = () => {
          const s = $('[data-q]', v).value.trim();
          const rows = db.households.filter((h) => (st === 'all' || h.status === st)).map((h) => ({ h, sc: V3.fuzzy(s, `${h.name} ${h.suburb} ${V3.membersOf(h.id).map((u) => u.name + ' ' + u.email).join(' ')} ${V3.dogsFor(h.id).map((d) => d.name + ' ' + d.breed).join(' ')}`) })).filter((x) => x.sc > 0).sort((a, b) => (s ? b.sc - a.sc : 0));
          $('[data-rows]', v).innerHTML = rows.map(({ h }) => {
            const mem = V3.membersOf(h.id); const ds = V3.dogsFor(h.id);
            const last = V3.sessionsForHousehold(h.id).filter((x) => x.status === 'completed').sort((a, b) => b.date.localeCompare(a.date))[0];
            return `<tr data-href="#/household/${h.id}" tabindex="0"><td><div class="row" style="gap:10px"><span class="avatar avatar--sq">${esc(V3.initials(h.name))}</span><div><b style="font-weight:600">${esc(h.name)}</b><div class="muted" style="font-size:12px">${esc(h.suburb)} · since ${V3.fmtDate(h.since, { month: 'short', year: 'numeric' })}</div></div></div></td>
              <td><div class="row" style="gap:8px">${A.dogAvatars(h.dogs, 28)}<span class="hide-m">${ds.map((d) => esc(d.name)).join(', ')}</span></div></td>
              <td class="hide-m"><div class="avatar-stack">${mem.map((u) => `<span class="avatar" style="--s:28px;font-size:9px" title="${esc(u.name)} · ${esc(u.invite)}">${esc(V3.initials(u.name))}</span>`).join('')}</div>${mem.some((u) => u.invite !== 'accepted') ? `<small class="muted" style="display:block;margin-top:3px">${mem.filter((u) => u.invite !== 'accepted').length} invite pending/expired</small>` : ''}</td>
              <td class="hide-m">${last ? `<span>${esc(last.title)}</span><div class="mono faint">${V3.fmtDate(last.date)}</div>` : '<span class="faint">—</span>'}</td>
              <td>${V3.state(h.status)}</td></tr>`;
          }).join('') || `<tr><td colspan="5">${A.empty('users', 'No households match', 'Try a different search.')}</td></tr>`;
          V3.icons(v);
        };
        $('[data-q]', v).addEventListener('input', draw);
        v.addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (b) { st = b.dataset.s; $$('[data-s]', v).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); draw(); } if (e.target.closest('[data-new]')) addHousehold(); });
        draw();
        if (q.get('new') === '1') addHousehold();
      }
    };
  };

  function addHousehold() {
    V3.modal({
      title: 'Add household', label: 'CRM-01 · CRM-03', sub: 'Start with the primary contact. You can add more people and dogs after.',
      body: `<form data-f novalidate style="display:grid;gap:14px"><div class="g g-2" style="gap:12px">
        <div class="field"><label for="nh-name">Household name</label><input class="input" id="nh-name" data-v="req" placeholder="e.g. Wilson household"><span class="field__error">${icon('circle-alert')} Required.</span></div>
        <div class="field"><label for="nh-sub">Suburb</label><input class="input" id="nh-sub" placeholder="e.g. Point Chevalier"></div>
        <div class="field"><label for="nh-pn">Primary contact</label><input class="input" id="nh-pn" data-v="req" placeholder="Full name"><span class="field__error">${icon('circle-alert')} Required.</span></div>
        <div class="field"><label for="nh-em">Email</label><input class="input" id="nh-em" type="email" data-v="req email" placeholder="name@example.co.nz"><span class="field__error">${icon('circle-alert')} Valid email required.</span></div>
        <div class="field span-2"><label for="nh-ph">Mobile <span class="muted">(stored as +64…)</span></label><input class="input" id="nh-ph" type="tel" data-v="phone" placeholder="+64 21 …"><span class="field__error">${icon('circle-alert')} Use a NZ number.</span></div></div>
        <div data-dup></div>
        <div class="notice">${icon('info')}<span>Try <span class="num">sarah.t@example.co.nz</span> or <span class="num">+64 21 384 2210</span> to see the duplicate-contact warning.</span></div></form>`,
      foot: `<button class="btn btn--ghost" type="button" data-close>Cancel</button><button class="btn btn--accent" type="button" data-ok>${icon('plus')} Create household</button>`,
      onOpen(root, api) {
        let override = false;
        const canon = (p) => { const d = p.replace(/[^\d+]/g, ''); return d.startsWith('0') ? '+64' + d.slice(1) : d; };
        const check = () => {
          const em = $('#nh-em', root).value.trim().toLowerCase(), ph = canon($('#nh-ph', root).value.trim());
          const hit = db.users.find((u) => (em && u.email.toLowerCase() === em) || (ph.length > 8 && canon(u.phone || '') === ph));
          $('[data-dup]', root).innerHTML = hit ? `<div class="notice notice--warn">${icon('users')}<span><strong>Possible duplicate.</strong> ${esc(hit.name)} (${esc((V3.household(hit.household) || {}).name || '')}) already uses this ${em && hit.email.toLowerCase() === em ? 'email' : 'phone number'}. Names alone never merge records.<span class="row" style="margin-top:8px;gap:6px"><a class="btn btn--xs" href="#/household/${hit.household}" data-close>Open existing</a><button class="btn btn--xs btn--ghost" type="button" data-anyway>${override ? icon('check') + ' Will create anyway' : 'Create anyway'}</button></span></span></div>` : '';
          V3.icons(root);
          return hit;
        };
        $('#nh-em', root).addEventListener('input', V3.debounce(check, 200));
        $('#nh-ph', root).addEventListener('input', V3.debounce(check, 200));
        root.addEventListener('click', (e) => { if (e.target.closest('[data-anyway]')) { override = true; check(); } });
        $('[data-ok]', root).addEventListener('click', () => {
          if (!V3.validate($('[data-f]', root))) return;
          if (check() && !override) { V3.toast('Resolve the duplicate warning first', { type: 'error' }); return; }
          const hid = 'h-' + V3.uid('x').slice(2), uid = V3.uid('u');
          const name = $('#nh-pn', root).value.trim();
          db.users.push({ id: uid, name, role: 'client', email: $('#nh-em', root).value.trim(), phone: canon($('#nh-ph', root).value.trim()), household: hid, permission: 'owner', invite: 'pending' });
          db.memberships.push({ user: uid, household: hid, permission: 'owner', invite: 'pending' });
          db.households.unshift({ id: hid, name: $('#nh-name', root).value.trim(), suburb: $('#nh-sub', root).value.trim() || '—', status: 'active', primary: uid, members: [uid], dogs: [], since: V3.nowISO().slice(0, 10) });
          V3.audit('created household', $('#nh-name', root).value.trim());
          V3.save(); api.close(); V3.toast('Household created', { sub: `Invitation ready for ${name}` }); V3.app.go('#/household/' + hid);
        });
      }
    });
  }
  A.addDog = (hid, after) => {
    V3.modal({
      title: `Add a dog to ${esc(V3.household(hid).name)}`, label: 'CRM-02', sub: 'Names don’t need to be unique — every dog gets a stable ID.',
      body: `<form data-f novalidate class="g g-2" style="gap:12px">
        <div class="field"><label for="nd-name">Name</label><input class="input" id="nd-name" data-v="req" placeholder="e.g. Kōwhai"><span class="field__error">${icon('circle-alert')} Required.</span></div>
        <div class="field"><label for="nd-breed">Breed <span class="muted">(optional)</span></label><input class="input" id="nd-breed" placeholder="e.g. Huntaway cross"></div>
        <div class="field"><label for="nd-dob">Date of birth</label><input class="input" id="nd-dob" type="date"></div>
        <div class="field"><label for="nd-status">Training status</label><select class="select" id="nd-status"><option>In training</option><option>Puppy class</option><option>Maintenance</option></select></div>
        <div class="field span-2"><label for="nd-photo">Photo</label><div class="covers" data-photos>${[50688, 1557, 518, 1501].map((c, i) => `<button class="cover" type="button" data-p="${c}" aria-pressed="${i === 0}"><img src="${V3.thumb(c, 40)}" alt=""></button>`).join('')}</div></div>
        <div class="field span-2"><label for="nd-notes">Notes</label><textarea class="textarea" id="nd-notes" placeholder="Temperament, health considerations, rewards that work…"></textarea></div></form>`,
      foot: `<button class="btn btn--ghost" type="button" data-close>Cancel</button><button class="btn btn--accent" type="button" data-ok>${icon('plus')} Add dog</button>`,
      onOpen(root, api) {
        let clip = 50688;
        root.addEventListener('click', (e) => { const p = e.target.closest('[data-p]'); if (p) { clip = +p.dataset.p; $$('[data-p]', root).forEach((x) => x.setAttribute('aria-pressed', String(x === p))); } });
        $('[data-ok]', root).addEventListener('click', () => {
          if (!V3.validate($('[data-f]', root))) return;
          const id = 'd-' + V3.uid('x').slice(2);
          const name = $('#nd-name', root).value.trim();
          const dob = $('#nd-dob', root).value;
          db.dogs.push({ id, name, breed: $('#nd-breed', root).value.trim() || 'Unknown breed', age: dob ? `${Math.max(0, Math.floor((Date.now() - new Date(dob)) / 3.15e10))} yrs` : '—', dob, sex: '—', household: hid, status: $('#nd-status', root).value, clip, photo: V3.img(clip, 40), cover: V3.img(clip, 65), avatar: V3.thumb(clip, 40), goals: [], notes: $('#nd-notes', root).value.trim(), progress: 0, techniques: [] });
          V3.household(hid).dogs.push(id);
          V3.audit('added dog', `${name} → ${V3.household(hid).name}`);
          V3.save(); api.close(); V3.toast(`${esc(name)} added`, { icon: 'paw-print' }); if (after) after(id);
        });
      }
    });
  };

  /* Household detail ------------------------------------------------------- */
  R['household/:id'] = ({ id }) => {
    const h = V3.household(id);
    if (!h) return { title: 'Not found', nav: 'clients', html: A.empty('search-x', 'Household not found', '', '<a class="btn btn--sm" href="#/clients">Back</a>') };
    const mem = V3.membersOf(id);
    const ds = V3.dogsFor(id);
    const ss = V3.sessionsForHousehold(id).sort((a, b) => b.date.localeCompare(a.date));
    const ms = db.media.filter((m) => m.dogs.some((d) => (V3.dog(d) || {}).household === id));
    const gs = db.groups.filter((g) => g.members.includes(id));
    const cs = db.consents.filter((c) => mem.some((u) => c.subject.startsWith(u.name)));
    return {
      title: h.name, nav: 'clients', crumbs: [{ label: 'Clients', href: '#/clients' }, { label: h.name }],
      html: `<div class="hh-head"><span class="avatar avatar--sq" style="--s:56px;font-size:16px">${esc(V3.initials(h.name))}</span><div><div class="vh__meta mono" style="margin:0 0 4px"><span>${esc(h.id)}</span><span class="dot-sep"></span><span>${esc(h.suburb)}</span><span class="dot-sep"></span><span>since ${V3.fmtDate(h.since, { day: 'numeric', month: 'short', year: 'numeric' })}</span></div><h1 class="t-xl">${esc(h.name)}</h1><div class="row" style="gap:6px;margin-top:6px">${V3.state(h.status)}${gs.map((g) => `<a class="pill" href="#/groups">${icon('users')} ${esc(g.title)}</a>`).join('')}</div></div>
        <div class="row row--wrap" style="gap:6px"><button class="btn btn--ghost btn--sm" type="button" data-invite>${icon('user-plus')} Invite member</button><button class="btn btn--ghost btn--sm" type="button" data-adddog>${icon('plus')} Add dog</button><button class="btn btn--sm" type="button" data-rec>${icon('circle-dot')} Record</button><button class="icon-btn" type="button" data-more aria-label="More actions">${icon('ellipsis')}</button></div></div>
      ${h.status === 'inactive' ? `<div class="notice notice--warn" style="margin-top:12px">${icon('pause')}<span><strong>Inactive household.</strong> Media is retained, portal access is paused. Nothing was deleted.</span></div>` : ''}
      <div class="g g-main" style="margin-top:6px">
        <div>
          <div class="sec-t"><h2>Dogs <span class="num">${ds.length}</span></h2></div>
          <div class="g g-2">${ds.map((d) => `<a class="dogcard" href="#/dog/${d.id}"><img src="${esc(d.avatar)}" alt=""><div><b>${esc(d.name)}</b><small>${esc(d.breed)} · ${esc(d.age)} · ${esc(d.status)}</small><div class="bar bar--lime" style="--v:${d.progress / 100};margin-top:8px"><i style="background:var(--text)"></i></div></div></a>`).join('') || `<div class="card card--flat span-2">${A.empty('paw-print', 'No dogs yet', 'Add the household’s first dog.')}</div>`}</div>
          <div class="sec-t"><h2>Sessions <span class="num">${ss.length}</span></h2></div>
          <div class="card"><div class="list" style="padding:2px 12px">${ss.map((s) => `<a class="lrow" href="#/session/${s.id}">${A.dogAvatars(s.dogs, 30)}<span class="lrow__t"><b>${esc(s.title)}</b><small>${V3.fmtDay(s.date)} · ${esc(s.location)}</small></span><span class="lrow__end">${V3.state(s.status)}</span></a>`).join('') || A.empty('calendar', 'No sessions', '')}</div></div>
          <div class="sec-t"><h2>Media <span class="num">${ms.length}</span></h2><a class="link" href="#/media?dog=${ds[0] ? ds[0].id : ''}">Library</a></div>
          ${ms.length ? `<div class="mgrid">${ms.slice(0, 6).map((m) => A.mediaCard(m)).join('')}</div>` : A.empty('film', 'No clips yet', '')}
        </div>
        <div>
          <div class="sec-t"><h2>People <span class="num">${mem.length}</span></h2></div>
          <div class="card"><div class="list" style="padding:2px 12px">${mem.map((u) => `<div class="lrow"><span class="avatar">${esc(V3.initials(u.name))}</span><span class="lrow__t"><b>${esc(u.name)}</b><small>${esc(u.email)} · ${esc(u.phone || '')}</small><span class="row" style="gap:6px;margin-top:4px"><span class="pill pill--mono" style="height:22px">${esc(u.permission)}</span>${V3.state(u.invite)}</span></span><span class="lrow__end">${u.invite === 'accepted' ? `<button class="btn btn--xs btn--ghost" type="button" data-revoke="${u.id}">Revoke</button>` : `<button class="btn btn--xs" type="button" data-resend="${u.id}">${icon('send')} ${u.invite === 'expired' ? 'Re-invite' : 'Resend'}</button>`}</span></div>`).join('')}</div></div>
          <div class="sec-t"><h2>Consent</h2><a class="link" href="#/consent">All records</a></div>
          <div class="card card--pad" style="display:grid;gap:8px">${cs.map((c) => `<div class="row row--between"><span style="font-size:13px">${esc(c.kind)}</span>${V3.state(c.status)}</div>`).join('') || '<span class="muted" style="font-size:13px">No consent records. Public use is blocked by default.</span>'}</div>
          <div class="sec-t"><h2>Contact canonicalisation</h2></div>
          <div class="card card--pad"><dl class="dl">${mem.map((u) => `<dt>${esc(u.name.split(' ')[0])}</dt><dd class="num" style="font-size:12px">${esc(u.phone || '—')}</dd>`).join('')}</dl><p class="muted" style="font-size:12px;margin-top:10px">Phones stored in E.164. Matching numbers never grant access on their own.</p></div>
        </div>
      </div>`,
      mount(v) {
        v.addEventListener('click', async (e) => {
          const t = e.target.closest('button'); if (!t) return;
          if (t.hasAttribute('data-adddog')) A.addDog(id, (did) => V3.app.go('#/dog/' + did));
          if (t.hasAttribute('data-rec')) { const d = ds[0]; const act = V3.sessionsForHousehold(id).find((s) => s.status === 'active'); db.context = { household: id, dogs: d ? [d.id] : [], dog: d && d.id, session: act ? act.id : '' }; V3.save(); V3.app.go('#/record'); }
          if (t.dataset.resend) { const u = V3.user(t.dataset.resend); const ms = db.memberships.find((x) => x.user === u.id && x.household === id); ms.invite = 'pending'; u.invite = 'pending'; V3.audit('sent invitation', `${u.name} → ${h.name}`); V3.save(); V3.toast(`Invitation sent to ${esc(u.email)}`, { icon: 'send', sub: 'Expires in 7 days · demo' }); V3.app.refresh(); }
          if (t.dataset.revoke) { const u = V3.user(t.dataset.revoke); if (await V3.confirm(`Revoke ${esc(u.name)}’s access?`, 'They lose portal playback immediately. Files already saved outside the portal can’t be recalled.', 'Revoke access', true)) { const ms = db.memberships.find((x) => x.user === u.id && x.household === id); ms.invite = 'revoked'; V3.audit('revoked access', `${u.name} ← ${h.name}`); V3.save(); V3.toast('Access revoked', { icon: 'shield-x' }); V3.app.refresh(); } }
          if (t.hasAttribute('data-invite')) {
            const md = V3.modal({ title: `Invite to ${esc(h.name)}`, label: 'CRM-07', body: `<form data-f novalidate style="display:grid;gap:12px"><div class="field"><label for="iv-n">Name</label><input class="input" id="iv-n" data-v="req"><span class="field__error">Required.</span></div><div class="field"><label for="iv-e">Email</label><input class="input" id="iv-e" type="email" data-v="req email"><span class="field__error">Valid email required.</span></div><div class="notice notice--info">${icon('info')}<span>They accept after signing in. A matching phone number isn’t enough.</span></div></form>`, foot: `<button class="btn btn--ghost" type="button" data-close>Cancel</button><button class="btn btn--accent" type="button" data-ok>${icon('send')} Send invitation</button>` });
            $('[data-ok]', md.el).addEventListener('click', () => { if (!V3.validate($('[data-f]', md.el))) return; const uid = V3.uid('u'); const name = $('#iv-n', md.el).value.trim(); db.users.push({ id: uid, name, role: 'client', email: $('#iv-e', md.el).value.trim(), phone: '', household: id, permission: 'member', invite: 'pending' }); db.memberships.push({ user: uid, household: id, permission: 'member', invite: 'pending' }); h.members.push(uid); V3.audit('invited member', `${name} → ${h.name}`); V3.save(); md.close(); V3.toast('Invitation sent', { icon: 'send', sub: 'Demo' }); V3.app.refresh(); });
          }
          if (t.hasAttribute('data-more')) V3.menu(t, [
            { label: h.status === 'active' ? 'Deactivate household' : 'Reactivate household', icon: h.status === 'active' ? 'pause' : 'play', run: async () => { if (h.status === 'active' && !(await V3.confirm('Deactivate household?', 'Portal access pauses. Media and records are kept — nothing is deleted.', 'Deactivate', true))) return; h.status = h.status === 'active' ? 'inactive' : 'active'; V3.audit(h.status === 'active' ? 'reactivated household' : 'deactivated household', h.name); V3.save(); V3.app.refresh(); } },
            { label: 'View as client (portal)', icon: 'eye', run: () => { location.href = '/v3/portal/index.html'; } },
            { label: 'Share with this household', icon: 'send', run: () => V3.app.go('#/share?h=' + id) }
          ], { align: 'right' });
        });
      }
    };
  };

  /* Dog detail ------------------------------------------------------------ */
  R['dog/:id'] = ({ id }) => {
    const d = V3.dog(id);
    if (!d) return { title: 'Not found', nav: 'clients', html: A.empty('search-x', 'Dog not found', '') };
    const h = V3.household(d.household);
    const ss = V3.sessionsForDog(id).sort((a, b) => b.date.localeCompare(a.date));
    const ms = V3.mediaForDog(id);
    return {
      title: d.name, nav: 'clients', crumbs: [{ label: 'Clients', href: '#/clients' }, { label: h.name, href: `#/household/${h.id}` }, { label: d.name }],
      html: `<section class="dog-hero" style="min-height:240px"><img src="${esc(d.cover)}" alt=""><div class="dog-hero__in"><div><span class="mono">${esc(d.breed)} · ${esc(d.age)} · ${esc(h.name)}</span><h1>${esc(d.name)}</h1></div><div class="row" style="gap:6px"><button class="btn btn--accent btn--sm" type="button" data-rec>${icon('circle-dot')} Start session</button></div></div></section>
      <div class="g g-main" style="margin-top:16px">
        <div>
          <div class="sec-t" style="margin-top:0"><h2>Timeline</h2></div>
          <div class="tl">${ss.map((s, i) => { const dt = new Date(s.date); const cl = s.media.map(V3.media).filter((m) => m && m.dogs.includes(id)); return `<div class="tl__item${i === 0 ? ' is-latest' : ''}"><div class="tl__date"><b>${dt.getDate()}</b><span>${dt.toLocaleDateString('en-NZ', { month: 'short' })}</span></div><span class="tl__dot"></span><a class="tl__card card--hover" href="#/session/${s.id}"><div class="row row--between"><span class="label">${esc(s.location)}</span>${V3.state(s.status)}</div><h3>${esc(s.title)}</h3>${s.notes ? `<p class="muted clamp-2" style="font-size:13.5px">${esc(s.notes)}</p>` : ''}${cl.length ? `<div class="row row--wrap" style="gap:6px">${cl.map((m) => `<span class="pill">${icon('film')} ${esc(m.title)} · ${esc(V3.label.editorial[m.editorial])}</span>`).join('')}</div>` : ''}</a></div>`; }).join('') || A.empty('calendar', 'No sessions yet', '')}</div>
        </div>
        <div class="g" style="gap:14px">
          <section class="panel"><div class="panel__h"><h3>${icon('id-card')} Profile</h3></div><div class="panel__b"><dl class="dl"><dt>ID</dt><dd class="num" style="font-size:12px">${esc(d.id)}</dd><dt>Breed</dt><dd>${esc(d.breed)}</dd><dt>DOB</dt><dd>${d.dob ? V3.fmtDate(d.dob, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</dd><dt>Sex</dt><dd>${esc(d.sex)}</dd><dt>Status</dt><dd>${esc(d.status)}</dd><dt>Household</dt><dd><a class="link" href="#/household/${h.id}">${esc(h.name)}</a></dd></dl></div></section>
          <section class="panel"><div class="panel__h"><h3>${icon('target')} Goals &amp; progress</h3><span class="num" data-pv>${d.progress}%</span></div><div class="panel__b" style="display:grid;gap:12px"><input class="range" type="range" min="0" max="100" value="${d.progress}" data-prog aria-label="Progress">${d.goals.map((g) => `<div class="goal">${icon('target')}<span>${esc(g)}</span></div>`).join('') || '<span class="muted">No goals yet.</span>'}<div class="row row--wrap" style="gap:4px">${A.techTags(d.techniques)}</div></div></section>
          <section class="panel"><div class="panel__h"><h3>${icon('notebook-pen')} Trainer notes</h3><span class="mono faint">Trainer only</span></div><div class="panel__b"><textarea class="textarea" data-notes>${esc(d.notes)}</textarea><button class="btn btn--sm" type="button" data-save style="margin-top:10px">Save notes</button></div></section>
          <div class="sec-t" style="margin-top:6px"><h2>Clips <span class="num">${ms.length}</span></h2></div>
          <div class="g" style="gap:4px">${ms.map((m) => `<a class="lrow" href="#/review/${m.id}"><span class="lrow__thumb"><img src="${V3.thumb(m.clip)}" alt=""></span><span class="lrow__t"><b>${esc(m.title)}</b><small>${V3.fmtDate(m.created)}</small></span>${A.edState(m)}</a>`).join('')}</div>
        </div>
      </div>`,
      mount(v) {
        $('[data-prog]', v).addEventListener('input', (e) => { $('[data-pv]', v).textContent = e.target.value + '%'; });
        $('[data-prog]', v).addEventListener('change', (e) => { d.progress = +e.target.value; V3.save(); V3.toast('Progress updated', { sub: 'Visible to the household' }); });
        $('[data-save]', v).addEventListener('click', () => { d.notes = $('[data-notes]', v).value; V3.audit('edited dog notes', d.name); V3.save(); V3.toast('Notes saved'); });
        $('[data-rec]', v).addEventListener('click', () => { const act = V3.sessionsForHousehold(d.household).find((s) => s.status === 'active'); db.context = { household: d.household, dogs: [id], dog: id, session: act ? act.id : '' }; V3.save(); V3.app.go('#/record'); });
      }
    };
  };

  /* Sessions -------------------------------------------------------------- */
  R['sessions'] = (_, q) => {
    const f = q.get('s') || 'all';
    const list = db.sessions.filter((s) => f === 'all' || s.status === f).sort((a, b) => b.date.localeCompare(a.date));
    return {
      title: 'Sessions', nav: 'sessions',
      html: `${A.vh('<span>CRM-04</span>', 'Sessions', 'One or more dogs, a date, notes, clips and homework.', `<a class="btn btn--accent btn--sm" href="#/record">${icon('plus')} New session</a>`)}
      <div class="tabs" role="tablist" style="margin-bottom:16px">${[['all', 'All'], ['active', 'Active'], ['scheduled', 'Scheduled'], ['completed', 'Completed']].map(([k, l]) => `<a role="tab" href="#/sessions?s=${k}" aria-selected="${f === k}">${l} <span class="count">${db.sessions.filter((s) => k === 'all' || s.status === k).length}</span></a>`).join('')}</div>
      <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Session</th><th>Dogs</th><th class="hide-m">Household</th><th class="hide-m">When</th><th class="hide-m">Clips</th><th>Status</th></tr></thead><tbody>
      ${list.map((s) => `<tr data-href="#/session/${s.id}" tabindex="0"><td><b style="font-weight:600">${esc(s.title)}</b><div class="muted" style="font-size:12px">${esc(s.location)}</div></td><td>${A.dogAvatars(s.dogs, 28)}</td><td class="hide-m">${esc(V3.household(s.household).name)}</td><td class="hide-m num" style="font-size:12px">${V3.fmtDay(s.date)} · ${V3.fmtTime(s.date)}</td><td class="hide-m">${s.media.length}</td><td>${V3.state(s.status)}</td></tr>`).join('')}
      </tbody></table></div></div>`
    };
  };
  R['session/:id'] = ({ id }) => {
    const s = V3.session(id);
    if (!s) return { title: 'Not found', nav: 'sessions', html: A.empty('search-x', 'Session not found', '') };
    const h = V3.household(s.household);
    const ms = s.media.map(V3.media).filter(Boolean);
    return {
      title: s.title, nav: 'sessions', crumbs: [{ label: 'Sessions', href: '#/sessions' }, { label: s.title }],
      html: `${A.vh(`<span>${esc(s.id)}</span><span class="dot-sep"></span><span>${V3.fmtDay(s.date)} · ${V3.fmtTime(s.date)}</span><span class="dot-sep"></span><span>${esc(s.location)}</span>`, esc(s.title), `${esc(A.dogNames(s.dogs))} · <a class="link" href="#/household/${h.id}">${esc(h.name)}</a>`, `${V3.state(s.status)}${s.status !== 'completed' ? `<button class="btn btn--accent btn--sm" type="button" data-rec>${icon('circle-dot')} Record into session</button>` : ''}${s.status === 'active' ? `<button class="btn btn--ghost btn--sm" type="button" data-end>${icon('square')} End session</button>` : ''}`)}
      <div class="g g-main">
        <div>
          <section class="panel"><div class="panel__h"><h3>${icon('notebook-pen')} Session notes</h3><span class="mono faint">Shared with household when clips are approved</span></div><div class="panel__b"><textarea class="textarea" data-notes placeholder="How did it go? What should they practise?">${esc(s.notes)}</textarea></div></section>
          <div class="sec-t"><h2>Clips <span class="num">${ms.length}</span></h2></div>
          ${ms.length ? `<div class="mgrid">${ms.map((m) => A.mediaCard(m)).join('')}</div>` : `<div class="card card--flat">${A.empty('film', 'No clips yet', 'Record into this session and they’ll attach automatically.')}</div>`}
        </div>
        <div>
          <section class="panel"><div class="panel__h"><h3>${icon('list-checks')} Homework</h3></div><div class="panel__b"><div data-hw></div><div class="row" style="gap:6px;margin-top:10px"><input class="input input--sm grow" data-hw-new placeholder="Add an exercise…" aria-label="New homework"><button class="btn btn--sm" type="button" data-hw-add>${icon('plus')}</button></div></div></section>
          <section class="panel" style="margin-top:14px"><div class="panel__h"><h3>${icon('paw-print')} Dogs</h3></div><div class="panel__b g" style="gap:6px">${s.dogs.map((d) => { const x = V3.dog(d); return `<a class="dogcard" href="#/dog/${x.id}" style="grid-template-columns:44px 1fr"><img src="${esc(x.avatar)}" alt="" style="width:44px;height:44px;border-radius:12px"><div><b style="font-size:15px">${esc(x.name)}</b><small>${esc(x.breed)}</small></div></a>`; }).join('')}</div></section>
          <button class="btn btn--sm btn--block" type="button" data-save style="margin-top:14px">${icon('save')} Save session</button>
        </div>
      </div>`,
      mount(v) {
        const hw = s.homework.slice();
        const draw = () => { $('[data-hw]', v).innerHTML = hw.length ? hw.map((x, i) => `<div class="lrow" style="min-height:44px"><span class="lrow__t" style="white-space:normal">${esc(x)}</span><button class="icon-btn icon-btn--sm" type="button" data-hw-del="${i}" aria-label="Remove">${icon('x')}</button></div>`).join('') : '<p class="muted" style="font-size:13px">No homework yet.</p>'; V3.icons(v); };
        draw();
        const add = () => { const i = $('[data-hw-new]', v); if (!i.value.trim()) return; hw.push(i.value.trim()); i.value = ''; draw(); };
        $('[data-hw-add]', v).addEventListener('click', add);
        $('[data-hw-new]', v).addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
        v.addEventListener('click', async (e) => {
          const del = e.target.closest('[data-hw-del]'); if (del) { hw.splice(+del.dataset.hwDel, 1); draw(); }
          if (e.target.closest('[data-save]')) { s.notes = $('[data-notes]', v).value; s.homework = hw.slice(); V3.audit('edited session', s.title); V3.save(); V3.toast('Session saved'); }
          if (e.target.closest('[data-rec]')) { db.context = { household: s.household, dogs: s.dogs.slice(), dog: s.dogs[0], session: s.id }; if (s.status === 'scheduled') s.status = 'active'; V3.save(); V3.app.go('#/record/camera'); }
          if (e.target.closest('[data-end]') && await V3.confirm('End this session?', 'You can still edit notes and homework afterwards.', 'End session')) { s.status = 'completed'; s.notes = $('[data-notes]', v).value; s.homework = hw.slice(); V3.audit('ended session', s.title); V3.save(); V3.app.refreshChrome(); V3.app.refresh(); V3.toast('Session ended'); }
        });
      }
    };
  };

  /* Groups ------------------------------------------------------------------ */
  R['groups'] = () => ({
    title: 'Training groups', nav: 'groups',
    html: `${A.vh('<span>CRM-05 · application-managed lists</span>', 'Training groups', 'Classes and workshops. These are lists in this app — not WhatsApp groups, which can’t be synced from a personal account.', `<button class="btn btn--accent btn--sm" type="button" data-new>${icon('plus')} New group</button>`)}
    <div class="g g-3">${db.groups.map((g) => `<article class="card card--pad" style="display:grid;gap:12px;align-content:start"><div class="row row--between"><span class="pill pill--mono"><i style="width:7px;height:7px;border-radius:2px;background:${esc(g.color)}"></i>${esc(g.type)}</span><span class="mono faint">${esc(g.id)}</span></div><h3 class="t-lg">${esc(g.title)}</h3><span class="muted" style="font-size:13px">${icon('calendar')} Next: ${V3.fmtDay(g.next)} · ${V3.fmtTime(g.next)}</span>
      <div class="list">${g.members.map((hid) => { const h = V3.household(hid); return `<a class="lrow" href="#/household/${hid}" style="min-height:44px;padding:6px 2px">${A.dogAvatars(h.dogs, 26)}<span class="lrow__t"><b>${esc(h.name)}</b><small>${V3.membersOf(hid).filter((u) => u.invite === 'accepted').length} people</small></span></a>`; }).join('')}</div>
      <div class="row" style="gap:6px"><button class="btn btn--ghost btn--sm" type="button" data-manage="${g.id}">${icon('users')} Members</button><a class="btn btn--quiet btn--sm" href="#/share?g=${g.id}">${icon('send')} Share</a></div></article>`).join('')}</div>`,
    mount(v) {
      v.addEventListener('click', (e) => {
        const m = e.target.closest('[data-manage]'); const nw = e.target.closest('[data-new]');
        if (!m && !nw) return;
        const g = m ? V3.group(m.dataset.manage) : { id: 'g-' + V3.uid('x').slice(2), title: '', type: 'class', members: [], color: '#2A9D8F', next: V3.nowISO() };
        const md = V3.modal({
          title: m ? `Members · ${esc(g.title)}` : 'New training group', label: 'Audience group',
          body: `${!m ? `<div class="field" style="margin-bottom:12px"><label for="g-t">Group name</label><input class="input" id="g-t" placeholder="e.g. Sunday Recall Club"></div>` : ''}<div class="list">${db.households.filter((h) => h.status === 'active').map((h) => `<label class="check check--plain" style="padding:10px 0;border-bottom:1px solid var(--line-soft);width:100%"><input type="checkbox" value="${h.id}"${g.members.includes(h.id) ? ' checked' : ''}><span class="check__box">${icon('check')}</span><span class="check__text"><b style="font-weight:600">${esc(h.name)}</b> <span class="muted">· ${V3.dogsFor(h.id).map((d) => esc(d.name)).join(', ')}</span></span></label>`).join('')}</div><div class="notice" style="margin-top:12px">${icon('info')}<span>Sharing to a group expands to each eligible household — recipients are de-duplicated.</span></div>`,
          foot: `<button class="btn btn--ghost" type="button" data-close>Cancel</button><button class="btn btn--accent" type="button" data-ok>Save</button>`
        });
        $('[data-ok]', md.el).addEventListener('click', () => {
          if (!m) { const t = $('#g-t', md.el).value.trim(); if (!t) { $('#g-t', md.el).focus(); return; } g.title = t; db.groups.push(g); }
          g.members = $$('input[type=checkbox]:checked', md.el).map((x) => x.value);
          V3.audit(m ? 'edited group membership' : 'created group', `${g.title} (${g.members.length} households)`);
          V3.save(); md.close(); V3.toast('Group saved'); V3.app.refresh();
        });
      });
    }
  });

  /* Techniques ------------------------------------------------------------- */
  R['techniques'] = () => ({
    title: 'Techniques', nav: 'techniques',
    html: `${A.vh('<span>Controlled vocabulary · used by AI tags</span>', 'Techniques', 'The taxonomy AI suggests from, and guides are organised by.', `<button class="btn btn--accent btn--sm" type="button" data-new>${icon('plus')} Add technique</button>`)}
    <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Technique</th><th class="hide-m">Slug</th><th class="hide-m">Description</th><th>Clips</th><th>Guides</th></tr></thead><tbody>${db.techniques.map((t) => `<tr><td><div class="row" style="gap:10px"><span class="lrow__ico" style="background:${esc(t.color)};color:#fff;width:30px;height:30px;border-radius:8px">${icon(t.icon || 'tag')}</span><b style="font-weight:600">${esc(t.name)}</b></div></td><td class="hide-m num faint" style="font-size:12px">/${esc(t.slug)}</td><td class="hide-m muted">${esc(t.blurb)}</td><td><a class="link" href="#/media?tech=${t.id}">${db.media.filter((m) => m.techniques.includes(t.id)).length}</a></td><td>${db.guides.filter((g) => g.technique === t.id).length}</td></tr>`).join('')}</tbody></table></div></div>`,
    mount(v) {
      $('[data-new]', v).addEventListener('click', () => {
        const colors = ['#E8A33D', '#5B8C5A', '#C8553D', '#6C8EAD', '#9C6ADE', '#2A9D8F', '#E76F51', '#3D5A80'];
        const md = V3.modal({ title: 'Add technique', body: `<form data-f novalidate style="display:grid;gap:12px"><div class="field"><label for="t-n">Name</label><input class="input" id="t-n" data-v="req" placeholder="e.g. Place / station"><span class="field__error">Required.</span></div><div class="field"><label for="t-s">Slug</label><input class="input num" id="t-s" placeholder="auto"></div><div class="field"><label for="t-b">Short description</label><input class="input" id="t-b"></div><div class="field"><span class="field__label">Colour</span><div class="row row--wrap" style="gap:6px" data-cols>${colors.map((c, i) => `<button type="button" class="chip" data-c="${c}" aria-pressed="${i === 0}" style="--c:${c}"><span class="dot"></span>${c}</button>`).join('')}</div></div></form>`, foot: `<button class="btn btn--ghost" type="button" data-close>Cancel</button><button class="btn btn--accent" type="button" data-ok>Add</button>` });
        let col = colors[0];
        $('#t-n', md.el).addEventListener('input', (e) => { $('#t-s', md.el).value = e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); });
        md.el.addEventListener('click', (e) => { const c = e.target.closest('[data-c]'); if (c) { col = c.dataset.c; $$('[data-c]', md.el).forEach((x) => x.setAttribute('aria-pressed', String(x === c))); } });
        $('[data-ok]', md.el).addEventListener('click', () => { if (!V3.validate($('[data-f]', md.el))) return; const n = $('#t-n', md.el).value.trim(); db.techniques.push({ id: 't-' + V3.uid('x').slice(2), name: n, slug: $('#t-s', md.el).value || n.toLowerCase(), color: col, icon: 'tag', blurb: $('#t-b', md.el).value.trim() }); V3.audit('added technique', n); V3.save(); md.close(); V3.toast('Technique added'); V3.app.refresh(); });
      });
    }
  });
})();
