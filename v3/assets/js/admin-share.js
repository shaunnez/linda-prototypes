/* ==========================================================================
   V3 · admin-share — share composer (ShareIntent), share history, WA inbox
   Never claims WhatsApp delivered/read. States: draft → prepared →
   handoff_opened → trainer_confirmed (or cancelled / failed).
   ========================================================================== */
(function () {
  'use strict';
  const V3 = window.V3;
  const { $, $$, esc, icon } = V3;
  const db = V3.db;
  const A = V3.A;
  const R = A.routes;

  const shareable = (m) => ['approved_private', 'approved_shared', 'published_public'].includes(m.editorial) && m.processing === 'ready';
  const targetName = (t) => t.type === 'household' ? V3.household(t.id).name : t.type === 'group' ? V3.group(t.id).title : V3.user(t.id).name;
  const expand = (targets) => {
    const hh = new Set();
    targets.forEach((t) => { if (t.type === 'household') hh.add(t.id); if (t.type === 'group') V3.group(t.id).members.forEach((x) => hh.add(x)); if (t.type === 'user') hh.add(V3.user(t.id).household); });
    return [...hh];
  };
  const hasGrant = (m, hid) => m.editorial === 'published_public' || (m.grants || []).includes(hid) || (m.visibility === 'household' && m.dogs.some((d) => (V3.dog(d) || {}).household === hid)) || (m.visibility === 'group' && m.group && V3.group(m.group).members.includes(hid));
  const link = (m) => `portal.lindasdogtraining.co.nz/v/${m.id.replace('m-', '')}${m.clip.toString(36)}`;
  const TEMPLATES = [
    { k: 'recap', label: 'Session recap', text: 'Kia ora {names}! Here’s today’s clip of {dog} — have a watch and look for the moments I’ve timestamped 🐾' },
    { k: 'hw', label: 'Homework nudge', text: 'Hi {names} — quick reminder of {dog}’s homework this week. Little and often! The clip is in your portal.' },
    { k: 'class', label: 'Class follow-up', text: 'Thanks for coming along today, everyone! Here’s the demo from class — practise a few minutes each day.' }
  ];

  /* Composer -------------------------------------------------------------- */
  R['share'] = (_, q) => {
    const draft = V3.store.get('share-draft', null);
    const st = draft && !q.get('m') && !q.get('h') && !q.get('g') ? draft : { media: [], targets: [], message: '', mode: 'link_only', state: 'draft', ack: false };
    if (q.get('m')) st.media = [q.get('m')];
    if (q.get('h')) st.targets = [{ type: 'household', id: q.get('h') }];
    if (q.get('g')) st.targets = [{ type: 'group', id: q.get('g') }];
    if (q.get('m') && !st.targets.length) { const m = V3.media(q.get('m')); const d = m && V3.dog(m.dogs[0]); if (d) st.targets = [{ type: 'household', id: d.household }]; }
    st.state = 'draft';
    let audTab = 'household';
    const pool = db.media.filter(shareable).sort((a, b) => b.created.localeCompare(a.created));
    const waiting = db.media.filter((m) => m.editorial === 'needs_review').length;
    return {
      title: 'Share composer', nav: 'share', mtitle: 'Share',
      html: `${A.vh('<span>ShareIntent · user-mediated WhatsApp</span>', 'Share composer', 'Prepare the message and secure link here. You send it yourself from WhatsApp — we never send from your personal number.', `<a class="btn btn--ghost btn--sm" href="#/shares">${icon('history')} History</a>`)}
      <div class="composer">
        <div>
          <section class="cstep"><div class="cstep__h"><span class="pick-step__n">1</span><b>Videos</b><span class="muted" data-mcount></span></div>
            <div class="pickgrid" data-pool>${pool.map((m) => `<button class="pickm" type="button" data-m="${m.id}" aria-pressed="${st.media.includes(m.id)}"><img src="${V3.thumb(m.clip, m.cover || 40)}" alt=""><b>${esc(m.title)}</b><small>${esc(A.dogNames(m.dogs))} · ${esc(V3.label.editorial[m.editorial])}</small><span class="tick">${icon('check')}</span></button>`).join('')}</div>
            ${waiting ? `<p class="muted" style="font-size:12.5px;margin-top:10px">${icon('lock')} ${waiting} clip${waiting > 1 ? 's' : ''} awaiting review can’t be shared yet. <a class="link link--under" href="#/review">Review queue</a></p>` : ''}</section>
          <section class="cstep"><div class="cstep__h"><span class="pick-step__n">2</span><b>Audience</b><span class="muted" data-tcount></span></div>
            <div class="seg" role="group" style="margin-bottom:12px" data-audtabs><button type="button" data-at="household" aria-pressed="true">${icon('house')} Households</button><button type="button" data-at="user" aria-pressed="false">${icon('user-round')} People</button><button type="button" data-at="group" aria-pressed="false">${icon('users')} Groups</button></div>
            <div class="row row--wrap" style="gap:6px" data-auds></div>
            <div data-elig style="margin-top:12px"></div></section>
          <section class="cstep"><div class="cstep__h"><span class="pick-step__n">3</span><b>Message</b><span class="muted" data-chars></span></div>
            <div class="chips" style="margin-bottom:10px">${TEMPLATES.map((t) => `<button class="chip" type="button" data-tpl="${t.k}">${icon('text-quote')} ${esc(t.label)}</button>`).join('')}</div>
            <textarea class="textarea" data-msg placeholder="Write a short note — the secure link is added automatically.">${esc(st.message)}</textarea></section>
          <section class="cstep"><div class="cstep__h"><span class="pick-step__n">4</span><b>How to send</b></div>
            <div class="seg seg--mono" role="group" data-modes>${['link_only', 'video_only', 'link_and_video'].map((k) => `<button type="button" data-mode="${k}" aria-pressed="${st.mode === k}">${icon(k === 'link_only' ? 'link-2' : k === 'video_only' ? 'file-video' : 'layers')} ${V3.label.mode[k]}</button>`).join('')}</div>
            <div data-modenote style="margin-top:12px"></div></section>
        </div>
        <aside class="composer__preview">
          <div class="stepper" data-stepper></div>
          <div class="wa-phone"><div class="wa-phone__head"><span class="avatar" style="--s:34px;background:#DDD;color:#111" data-wa-av>?</span><div><b data-wa-to>Choose an audience</b><small>WhatsApp preview · from Linda’s phone</small></div></div><div class="wa" data-wa></div></div>
          <div data-actions style="display:grid;gap:8px"></div>
          <p class="mono faint" style="text-transform:none;letter-spacing:.02em">We record prepared, opened and your manual confirmation — never “delivered” or “read”.</p>
        </aside>
      </div>`,
      mount(v) {
        let exportP = 0, exportT = null, saved = null;
        const persist = () => V3.store.set('share-draft', Object.assign({}, st, { state: 'draft' }));
        const sel = () => st.media.map(V3.media).filter(Boolean);
        const recips = () => expand(st.targets);
        const gaps = () => { const out = []; sel().forEach((m) => recips().forEach((h) => { if (!hasGrant(m, h)) out.push({ m, h }); })); return out; };
        const names = () => { const hs = recips(); if (!hs.length) return 'there'; const ppl = hs.flatMap((h) => V3.membersOf(h).filter((u) => u.invite === 'accepted').map((u) => u.name.split(' ')[0])); return [...new Set(ppl)].slice(0, 3).join(' & ') || 'there'; };
        const dogName = () => (sel()[0] ? A.dogNames(sel()[0].dogs) : 'your dog');
        const drawAud = () => {
          const opts = audTab === 'household' ? db.households.filter((h) => h.status === 'active').map((h) => ({ type: 'household', id: h.id, label: h.name, sub: V3.dogsFor(h.id).map((d) => d.name).join(', ') }))
            : audTab === 'group' ? db.groups.map((g) => ({ type: 'group', id: g.id, label: g.title, sub: `${g.members.length} households` }))
            : db.users.filter((u) => u.role === 'client').map((u) => ({ type: 'user', id: u.id, label: u.name, sub: V3.household(u.household).name, disabled: u.invite !== 'accepted' }));
          $('[data-auds]', v).innerHTML = opts.map((o) => `<button class="chip" type="button" data-t="${o.type}:${o.id}" aria-pressed="${st.targets.some((t) => t.type === o.type && t.id === o.id)}"${o.disabled ? ' disabled title="Invite not accepted"' : ''}>${esc(o.label)} <span class="mono faint" style="font-size:10px">${esc(o.sub)}</span></button>`).join('');
        };
        const drawElig = () => {
          const hs = recips(); const g = gaps();
          let html = '';
          if (st.targets.some((t) => t.type === 'group')) html += `<div class="notice" style="margin-bottom:8px">${icon('users')}<span>Group expands to <strong>${hs.length} household${hs.length === 1 ? '' : 's'}</strong>: ${hs.map((h) => esc(V3.household(h).name)).join(', ')}. In WhatsApp, you pick the actual chat — app groups aren’t WhatsApp groups.</span></div>`;
          if (g.length) html += `<div class="notice notice--warn">${icon('shield-alert')}<span><strong>${g.length} access grant${g.length > 1 ? 's' : ''} missing.</strong> A link alone isn’t access — each household needs a grant first.<span style="display:grid;gap:6px;margin-top:8px">${g.map(({ m, h }) => `<span class="row row--between" style="gap:8px"><span style="font-size:12.5px">${esc(V3.household(h).name)} → “${esc(m.title)}”</span><button class="btn btn--xs" type="button" data-grant="${m.id}|${h}">${icon('key-round')} Grant</button></span>`).join('')}</span></span></div>`;
          else if (hs.length && sel().length) html += `<div class="notice notice--success">${icon('shield-check')}<span>All ${hs.length} household${hs.length > 1 ? 's have' : ' has'} access to the selected video${sel().length > 1 ? 's' : ''}.</span></div>`;
          $('[data-elig]', v).innerHTML = html;
        };
        const drawMode = () => {
          $('[data-modenote]', v).innerHTML = st.mode === 'link_only' ? `<div class="notice notice--success">${icon('link-2')}<span><strong>Recommended.</strong> A secure portal link — access stays revocable.</span></div>`
            : `<div class="notice notice--danger">${icon('triangle-alert')}<span><strong>Attaching a video file creates a copy outside the portal.</strong> It can’t be recalled or revoked later. ${st.mode === 'link_and_video' ? 'iOS may drop the text when sharing a file — if so, we’ll guide a two-step send.' : ''}<label class="check check--plain" style="margin-top:10px;font-size:13px"><input type="checkbox" data-ack${st.ack ? ' checked' : ''}><span class="check__box">${icon('check')}</span><span class="check__text">I understand — share the file anyway</span></label></span></div>`;
        };
        const drawPreview = () => {
          const ms = sel(); const hs = recips();
          const to = st.targets.length === 1 && st.targets[0].type !== 'group' ? targetName(st.targets[0]) : st.targets.length ? `${hs.length} households — choose chat in WhatsApp` : 'Choose an audience';
          $('[data-wa-to]', v).textContent = to; $('[data-wa-av]', v).textContent = st.targets.length ? V3.initials(to) : '?';
          const time = V3.fmtTime(new Date().toISOString());
          const msg = esc(st.message || '…').replace(/\n/g, '<br>');
          const linkCards = ms.map((m) => `<span class="wa__link"><b>${esc(m.title)}</b><small>${link(m)} · secure · expires with access</small></span>`).join('');
          const vidB = (m) => `<div class="wa__bubble" style="padding:4px 4px 18px"><div class="wa__media"><img src="${V3.thumb(m.clip, m.cover || 40)}" alt=""><span>${icon('video')} ${esc(m.duration)} · ${(8 + (m.clip % 9)).toFixed(1)} MB</span></div><span class="wa__meta">${time}</span></div>`;
          let html = '';
          if (!ms.length) html = `<div style="text-align:center;color:#667781;font-size:13px;padding:40px 10px">Select a video to preview the message</div>`;
          else if (st.mode === 'link_only') html = `<div class="wa__bubble">${linkCards}${msg}<span class="wa__meta">${time}</span></div>`;
          else if (st.mode === 'video_only') html = ms.map(vidB).join('');
          else html = ms.map(vidB).join('') + `<div style="text-align:center;font-family:var(--font-mono);font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:#667781">Step 2 if iOS drops the text</div><div class="wa__bubble">${linkCards}${msg}<span class="wa__meta">${time}</span></div>`;
          $('[data-wa]', v).innerHTML = html;
          V3.icons($('[data-wa]', v));
        };
        const STATES = ['draft', 'prepared', 'handoff_opened', 'trainer_confirmed'];
        const drawActions = () => {
          const i = STATES.indexOf(st.state);
          $('[data-stepper]', v).innerHTML = STATES.map((s, k) => `<div class="${k < i ? 'on' : k === i ? 'now' : ''}"><i></i><span>${esc(V3.label.share[s])}</span></div>`).join('');
          const ready = sel().length && st.targets.length && !gaps().length && (st.mode === 'link_only' || st.ack);
          const multi = recips().length > 1 || st.targets.some((t) => t.type === 'group');
          let h = '';
          if (st.state === 'draft') {
            h = exportT ? `<div class="card card--pad" style="display:grid;gap:8px"><div class="row row--between"><span class="label">Preparing video…</span><span class="num" style="font-size:12px" data-exp>${Math.round(exportP * 100)}%</span></div><div class="bar bar--striped"><i style="width:${exportP * 100}%"></i></div><small class="muted">Creating a signed MP4 download on Stream. Short-lived grant.</small></div>`
              : `<button class="btn btn--accent btn--lg btn--block" type="button" data-prepare${ready ? '' : ' disabled'}>${icon('package-check')} Prepare share</button>${!ready ? `<small class="muted" style="text-align:center">${!sel().length ? 'Pick at least one video' : !st.targets.length ? 'Choose who it’s for' : gaps().length ? 'Grant access first' : 'Confirm the file warning'}</small>` : ''}`;
          } else if (st.state === 'prepared') {
            h = `<button class="btn btn--lg btn--block" type="button" data-open style="background:#25D366;color:#fff">${icon('message-circle')} Open WhatsApp</button><small class="muted" style="text-align:center">${multi || st.mode !== 'link_only' ? 'Opens the share sheet — pick the chat in WhatsApp.' : 'Opens a prefilled chat via deep link.'}</small><button class="btn btn--ghost btn--sm" type="button" data-copy>${icon('copy')} Copy message &amp; link</button>`;
          } else if (st.state === 'handoff_opened') {
            h = `${st.mode === 'link_and_video' ? `<div class="card card--pad" style="display:grid;gap:8px"><span class="label">Two-step fallback</span><div class="row" style="gap:8px;font-size:13px"><span class="pick-step__n" style="background:var(--lime);color:var(--graphite)">1</span>Share the video file to the chat</div><div class="row" style="gap:8px;font-size:13px"><span class="pick-step__n">2</span>Paste the message &amp; link in the same chat</div><button class="btn btn--ghost btn--sm" type="button" data-copy>${icon('copy')} Copy message &amp; link</button></div>` : ''}
              <button class="btn btn--accent btn--lg btn--block" type="button" data-confirm>${icon('check-check')} I sent it</button><button class="btn btn--quiet btn--sm" type="button" data-reopen>${icon('rotate-ccw')} Re-open WhatsApp</button>`;
          } else if (st.state === 'trainer_confirmed') {
            h = `<div class="notice notice--success">${icon('check-check')}<span><strong>Recorded as sent by you.</strong> Portal opens will show in share history.</span></div><div class="row" style="gap:6px"><a class="btn btn--sm grow" href="#/shares">View history</a><button class="btn btn--ghost btn--sm grow" type="button" data-again>New share</button></div>`;
          }
          if (st.state !== 'draft' && st.state !== 'trainer_confirmed') h += `<button class="btn btn--quiet btn--sm" type="button" data-cancelshare>${icon('x')} Cancel share</button>`;
          $('[data-actions]', v).innerHTML = h;
          V3.icons(v);
        };
        const drawAll = () => {
          $$('[data-m]', v).forEach((b) => b.setAttribute('aria-pressed', String(st.media.includes(b.dataset.m))));
          $('[data-mcount]', v).textContent = st.media.length ? `${st.media.length} selected` : '';
          $('[data-tcount]', v).textContent = st.targets.length ? `${recips().length} household${recips().length === 1 ? '' : 's'}` : '';
          $('[data-chars]', v).textContent = `${st.message.length} chars`;
          drawAud(); drawElig(); drawMode(); drawPreview(); drawActions(); V3.icons(v); persist();
        };
        drawAll();
        const locked = () => st.state !== 'draft';
        v.addEventListener('click', async (e) => {
          const t = e.target.closest('button'); if (!t) return;
          if (t.dataset.m && !locked()) { const id = t.dataset.m; st.media = st.media.includes(id) ? st.media.filter((x) => x !== id) : st.media.concat(id); drawAll(); }
          if (t.dataset.at) { audTab = t.dataset.at; $$('[data-at]', v).forEach((x) => x.setAttribute('aria-pressed', String(x === t))); drawAud(); V3.icons(v); }
          if (t.dataset.t && !locked()) { const [type, id] = t.dataset.t.split(':'); const ix = st.targets.findIndex((x) => x.type === type && x.id === id); if (ix >= 0) st.targets.splice(ix, 1); else st.targets.push({ type, id }); drawAll(); }
          if (t.dataset.grant) { const [mid, hid] = t.dataset.grant.split('|'); const m = V3.media(mid); m.grants = (m.grants || []).concat(hid); if (m.editorial === 'approved_private') m.editorial = 'approved_shared'; if (m.visibility === 'trainer_only') m.visibility = 'household'; V3.audit('granted access', `${m.title} → ${V3.household(hid).name}`); V3.save(); V3.toast(`Access granted to ${esc(V3.household(hid).name)}`, { icon: 'key-round', sub: 'Audited' }); drawAll(); }
          if (t.dataset.tpl && !locked()) { const tp = TEMPLATES.find((x) => x.k === t.dataset.tpl); st.message = tp.text.replace('{names}', names()).replace('{dog}', dogName()); $('[data-msg]', v).value = st.message; drawAll(); }
          if (t.dataset.mode && !locked()) { st.mode = t.dataset.mode; st.ack = false; $$('[data-mode]', v).forEach((x) => x.setAttribute('aria-pressed', String(x === t))); drawAll(); }
          if (t.hasAttribute('data-prepare')) {
            const finish = () => { exportT = null; st.state = 'prepared'; saved = { id: 'sh-' + V3.uid('x').slice(2), created: V3.nowISO(), mode: st.mode, media: st.media.slice(), targets: st.targets.map((x) => x.id), state: 'prepared', message: st.message, opens: 0 }; db.shares.unshift(saved); V3.audit('prepared share', `${sel().map((m) => m.title).join(', ')} → ${st.targets.map(targetName).join(', ')}`); V3.save(); V3.app.refreshChrome(); drawActions(); V3.toast('Share prepared', { icon: 'package-check', sub: st.mode === 'link_only' ? 'Secure link ready' : 'MP4 ready · short-lived grant' }); };
            if (st.mode === 'link_only') { t.classList.add('is-loading'); setTimeout(finish, 700); return; }
            exportP = 0; exportT = setInterval(() => { exportP = Math.min(1, exportP + 0.07 + Math.random() * 0.05); const el = $('[data-exp]', v); if (el) { el.textContent = Math.round(exportP * 100) + '%'; el.closest('.card').querySelector('.bar i').style.width = exportP * 100 + '%'; } if (exportP >= 1) { clearInterval(exportT); setTimeout(finish, 300); } }, 160);
            drawActions();
          }
          if (t.hasAttribute('data-open') || t.hasAttribute('data-reopen')) { st.state = 'handoff_opened'; if (saved) { saved.state = 'handoff_opened'; V3.save(); } drawActions(); V3.toast('WhatsApp opened (simulated)', { icon: 'message-circle', sub: 'Choose the chat and tap send' }); }
          if (t.hasAttribute('data-copy')) { const txt = `${st.message}\n\n${sel().map((m) => 'https://' + link(m)).join('\n')}`; try { await navigator.clipboard.writeText(txt); } catch (err) { /* noop */ } V3.toast('Message & link copied', { icon: 'copy' }); }
          if (t.hasAttribute('data-confirm')) { st.state = 'trainer_confirmed'; if (saved) { saved.state = 'trainer_confirmed'; saved.confirmed = V3.nowISO(); } V3.audit('confirmed share sent', st.targets.map(targetName).join(', ')); V3.store.del('share-draft'); V3.save(); V3.app.refreshChrome(); drawActions(); V3.toast('Marked as sent by you', { icon: 'check-check', sub: 'Not a delivery receipt' }); }
          if (t.hasAttribute('data-cancelshare')) { if (await V3.confirm('Cancel this share?', 'The prepared link stays inactive. Access grants you made are kept.', 'Cancel share', true)) { if (saved) { saved.state = 'cancelled'; V3.save(); } st.state = 'draft'; saved = null; drawActions(); V3.toast('Share cancelled', { icon: 'x' }); } }
          if (t.hasAttribute('data-again')) { V3.store.del('share-draft'); V3.app.go('#/share?new=1'); V3.app.refresh(); }
        });
        v.addEventListener('input', (e) => { if (e.target.matches('[data-msg]')) { st.message = e.target.value; $('[data-chars]', v).textContent = `${st.message.length} chars`; drawPreview(); persist(); } });
        v.addEventListener('change', (e) => { if (e.target.matches('[data-ack]')) { st.ack = e.target.checked; drawActions(); persist(); } });
        return () => clearInterval(exportT);
      }
    };
  };

  /* Share history ---------------------------------------------------------- */
  R['shares'] = () => ({
    title: 'Share history', nav: 'shares',
    html: `${A.vh('<span>Intent · audience · mode · state · portal opens</span>', 'Share history', 'What you prepared and confirmed. WhatsApp delivery and read status aren’t available for personal-account shares — so we don’t show them.', `<a class="btn btn--accent btn--sm" href="#/share">${icon('plus')} New share</a>`)}
    <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Shared</th><th class="hide-m">Audience</th><th>Mode</th><th>State</th><th class="hide-m">Portal opens</th><th></th></tr></thead><tbody>
    ${db.shares.map((s) => `<tr><td><div class="row" style="gap:10px"><div class="avatar-stack">${s.media.map((id) => { const m = V3.media(id); return m ? `<span class="lrow__thumb" style="width:52px;height:34px;margin-left:-10px;box-shadow:0 0 0 2px var(--surface)"><img src="${V3.thumb(m.clip)}" alt=""></span>` : ''; }).join('')}</div><div style="min-width:0"><b style="font-weight:550;display:block">${s.media.map((id) => esc((V3.media(id) || {}).title || id)).join(', ')}</b><span class="mono faint">${V3.fmtDay(s.created)} · ${V3.fmtTime(s.created)}</span></div></div></td>
      <td class="hide-m">${s.targets.map((id) => esc((V3.household(id) || V3.group(id) || V3.user(id) || {}).name || (V3.group(id) || {}).title || id)).join(', ')}</td>
      <td><span class="pill pill--mono">${icon(s.mode === 'link_only' ? 'link-2' : s.mode === 'video_only' ? 'file-video' : 'layers')} ${esc(V3.label.mode[s.mode])}</span></td>
      <td>${V3.state(s.state, V3.label.share[s.state])}</td><td class="hide-m num">${s.opens}</td>
      <td style="text-align:right"><button class="btn btn--xs btn--ghost" type="button" data-detail="${s.id}">Details</button></td></tr>`).join('')}
    </tbody></table></div></div>`,
    mount(v) {
      v.addEventListener('click', (e) => {
        const b = e.target.closest('[data-detail]'); if (!b) return;
        const s = db.shares.find((x) => x.id === b.dataset.detail);
        const idx = ['draft', 'prepared', 'handoff_opened', 'trainer_confirmed'].indexOf(s.state);
        const md = V3.modal({
          title: 'Share details', label: s.id,
          body: `<div class="stepper" style="margin-bottom:16px">${['draft', 'prepared', 'handoff_opened', 'trainer_confirmed'].map((x, k) => `<div class="${s.state === 'cancelled' ? '' : k < idx ? 'on' : k === idx ? 'now' : ''}"><i></i><span>${V3.label.share[x]}</span></div>`).join('')}</div>
            <dl class="dl"><dt>Mode</dt><dd>${esc(V3.label.mode[s.mode])}</dd><dt>Audience</dt><dd>${s.targets.map((id) => esc((V3.household(id) || {}).name || (V3.group(id) || {}).title || id)).join(', ')}</dd><dt>Created</dt><dd>${V3.fmtDay(s.created)} ${V3.fmtTime(s.created)}</dd><dt>Portal opens</dt><dd>${s.opens}</dd><dt>Delivery</dt><dd class="muted">Not tracked for personal WhatsApp</dd></dl>
            ${s.message ? `<div class="wa" style="margin-top:14px"><div class="wa__bubble">${esc(s.message)}<span class="wa__meta">${V3.fmtTime(s.created)}</span></div></div>` : '<p class="muted" style="margin-top:14px">No message — file only.</p>'}`,
          foot: `${['prepared', 'handoff_opened'].includes(s.state) ? `<button class="btn btn--ghost" type="button" data-cx>Cancel share</button><button class="btn btn--accent" type="button" data-ok>${icon('check-check')} I sent it</button>` : '<button class="btn" type="button" data-close>Close</button>'}`
        });
        const ok = $('[data-ok]', md.el), cx = $('[data-cx]', md.el);
        if (ok) ok.addEventListener('click', () => { s.state = 'trainer_confirmed'; V3.audit('confirmed share sent', s.id); V3.save(); md.close(); V3.app.refreshChrome(); V3.app.refresh(); V3.toast('Marked as sent by you'); });
        if (cx) cx.addEventListener('click', () => { s.state = 'cancelled'; V3.audit('cancelled share', s.id); V3.save(); md.close(); V3.app.refreshChrome(); V3.app.refresh(); V3.toast('Share cancelled', { icon: 'x' }); });
      });
    }
  });

  /* WhatsApp archive inbox ------------------------------------------------- */
  R['inbox'] = (_, q) => {
    const f = q.get('f') || 'open';
    const filt = { open: (i) => ['unassigned', 'too_large', 'quarantined'].includes(i.state), assigned: (i) => i.state === 'assigned', all: (i) => i.state !== 'dismissed' };
    const list = db.inbox.filter(filt[f] || filt.open).sort((a, b) => b.received.localeCompare(a.received));
    const cur = V3.store.get('inbox-sel', null);
    let selId = q.get('i') || (list.find((x) => x.id === cur) ? cur : list[0] && list[0].id);
    const kindIcon = { video: 'file-video', voice: 'audio-lines', text: 'message-square' };
    return {
      title: 'WhatsApp archive', nav: 'inbox', mtitle: 'Archive inbox',
      html: `${A.vh(`<span>${icon('message-circle')} ${esc(window.LINDA.brand.archiveNumber)}</span><span class="dot-sep"></span><span>Webhook verified</span><span class="dot-sep"></span><span>Inbound only</span>`, 'Archive inbox', 'Forward clips and voice notes from your personal WhatsApp. Forwarded messages don’t say whose dog it is — so nothing is assigned by guesswork.')}
      <div class="tabs" role="tablist" style="margin-bottom:16px">${[['open', 'Needs action'], ['assigned', 'Assigned'], ['all', 'All']].map(([k, l]) => `<a role="tab" href="#/inbox?f=${k}" aria-selected="${f === k}">${l} <span class="count">${db.inbox.filter(filt[k]).length}</span></a>`).join('')}</div>
      <div class="inbox">
        <div class="inbox__list" data-list>${list.map((i) => `<button class="inbox__item" type="button" data-i="${i.id}" aria-current="${i.id === selId}">${i.thumb ? `<img src="${esc(i.thumb)}" alt="">` : `<span class="ib-ic">${icon(kindIcon[i.kind] || 'file')}</span>`}<span style="min-width:0"><b>${esc(i.caption)}</b><small>${esc(i.from)} · ${V3.rel(i.received)}</small><span class="row">${V3.state(i.state, i.state.replace('_', ' '))}${i.forwarded ? '<span class="pill pill--mono" style="height:22px">Fwd</span>' : ''}${i.size ? `<span class="mono faint">${esc(i.size)}</span>` : ''}</span></span></button>`).join('') || A.empty('inbox', 'All clear', 'Nothing needs action.')}</div>
        <div data-detail></div>
      </div>`,
      mount(v) {
        const draw = () => {
          const it = db.inbox.find((x) => x.id === selId);
          $$('[data-i]', v).forEach((b) => b.setAttribute('aria-current', String(b.dataset.i === selId)));
          const d = $('[data-detail]', v);
          if (!it) { d.innerHTML = `<div class="card card--flat">${A.empty('inbox', 'Select an item', '')}</div>`; V3.icons(v); return; }
          V3.store.set('inbox-sel', it.id);
          const head = `<div class="panel__h"><h3>${icon(kindIcon[it.kind] || 'file')} ${esc(it.kind === 'voice' ? 'Voice note' : it.kind === 'text' ? 'Text message' : 'Video')}</h3>${V3.state(it.state, it.state.replace('_', ' '))}</div>`;
          const meta = `<dl class="dl" style="margin-top:14px"><dt>From</dt><dd>${esc(it.from)}</dd><dt>Received</dt><dd>${V3.fmtDay(it.received)} · ${V3.fmtTime(it.received)}</dd>${it.size ? `<dt>Size</dt><dd class="num">${esc(it.size)}</dd>` : ''}${it.duration ? `<dt>Length</dt><dd class="num">${esc(it.duration)}</dd>` : ''}<dt>Message ID</dt><dd class="num faint" style="font-size:11.5px">wamid.${esc(it.id.replace('wa-', ''))}HBgL…${it.received.slice(-2)}</dd><dt>Provenance</dt><dd class="num" style="font-size:12px">whatsapp_archive</dd></dl>`;
          const assignForm = (label) => { const h0 = db.households.find((h) => h.status === 'active').id; return `<div class="g g-3" style="gap:10px;margin-top:14px" data-assign><div class="field"><label for="as-h">Household</label><select class="select select--sm" id="as-h"><option value="">Choose…</option>${A.householdOptions('')}</select></div><div class="field"><label for="as-d">Dog</label><select class="select select--sm" id="as-d" disabled><option>Choose household</option></select></div><div class="field"><label for="as-s">Session</label><select class="select select--sm" id="as-s" disabled><option>—</option></select></div></div><div class="row row--wrap" style="margin-top:12px;gap:8px"><button class="btn btn--accent btn--sm" type="button" data-do-assign disabled>${icon('check')} ${label}</button><span class="muted" style="font-size:12.5px" data-h0="${h0}">Explicit choice required — AI never guesses the dog.</span></div>`; };
          let body = '';
          if (it.kind === 'video' && it.state !== 'too_large') {
            body = `<div class="player" style="aspect-ratio:16/9"><video muted playsinline loop autoplay preload="metadata" src="${V3.vid(it.clip)}" poster="${esc(it.thumb)}" style="object-fit:cover"></video><span class="player__tc mono">FWD · ${esc(it.size)}</span></div><p style="margin-top:12px;font-size:15px">“${esc(it.caption)}”</p>${meta}
              ${it.state === 'assigned' ? `<div class="notice notice--success" style="margin-top:14px">${icon('check')}<span>Assigned to <strong>${esc((V3.dog(it.assignedTo) || {}).name || '')}</strong>.${it.media ? ` <a class="link link--under" href="#/review/${it.media}">Open in review</a>` : ''}</span></div>` : `<div class="notice notice--warn" style="margin-top:14px">${icon('circle-help')}<span>Forwarded from your personal WhatsApp. The original chat isn’t included, so choose the dog explicitly.</span></div>${assignForm('Assign & send to Stream')}`}`;
          } else if (it.kind === 'voice') {
            body = `<div class="card card--pad card--flat" style="display:flex;align-items:center;gap:14px"><button class="icon-btn" type="button" data-play-voice aria-label="Play voice note" style="background:var(--lime);color:var(--graphite)">${icon('play')}</button><div class="grow"><div style="display:flex;gap:2px;align-items:center;height:28px">${Array.from({ length: 48 }, (_, k) => `<i style="flex:1;border-radius:2px;background:var(--text-3);height:${20 + Math.abs(Math.sin(k * 1.7) * 70)}%"></i>`).join('')}</div></div><span class="num faint">${esc(it.duration)}</span></div>
              <div class="sec-t"><h2>${icon('captions')} Transcript</h2><span class="mono faint">AI · working audio deleted after</span></div><div class="transcript">${esc(it.transcript)}</div>${meta}
              ${it.state === 'assigned' ? `<div class="notice notice--success" style="margin-top:14px">${icon('check')}<span>Saved as a note.</span></div>` : assignForm('Save transcript as session note')}`;
          } else if (it.state === 'too_large') {
            body = `<div class="notice notice--danger">${icon('file-x')}<span><strong>This video never reached us.</strong> ${esc(it.error)}</span></div><p style="margin-top:12px">“${esc(it.caption)}”</p>${meta}
              <div class="card card--pad card--flat" style="margin-top:14px;display:grid;gap:8px"><span class="label">Why</span><p class="muted" style="font-size:13.5px">WhatsApp’s Cloud API caps video at 16 MB. We can’t compress a file that was never delivered — so upload the original straight from your phone instead.</p></div>
              <div class="row row--wrap" style="margin-top:14px;gap:8px"><a class="btn btn--accent btn--sm" href="#/record?upload=1">${icon('smartphone')} Use PWA upload instead</a><button class="btn btn--ghost btn--sm" type="button" data-dismiss>Dismiss</button></div>`;
          } else if (it.state === 'quarantined') {
            body = `<div class="notice notice--danger">${icon('shield-alert')}<span><strong>Quarantined — unknown sender.</strong> The archive number only accepts material from authorised trainer numbers. It isn’t a public inbox.</span></div><div class="wa" style="margin-top:14px"><div class="wa__bubble" style="margin-left:0;margin-right:auto;background:#fff;border-radius:4px 12px 12px 12px">${esc(it.caption)}<span class="wa__meta">${V3.fmtTime(it.received)}</span></div></div>${meta}
              <div class="row row--wrap" style="margin-top:14px;gap:8px"><button class="btn btn--sm" type="button" data-dismiss>${icon('trash-2')} Discard</button><button class="btn btn--ghost btn--sm" type="button" data-keep>Keep in quarantine</button><a class="btn btn--quiet btn--sm" href="#/settings">Authorised numbers</a></div>`;
          } else body = meta;
          d.innerHTML = `<section class="panel">${head}<div class="panel__b">${body}</div></section>`;
          V3.icons(v);
          const hs = $('#as-h', d);
          if (hs) {
            const ds = $('#as-d', d), ss = $('#as-s', d), go = $('[data-do-assign]', d);
            hs.addEventListener('change', () => { const h = hs.value; ds.disabled = ss.disabled = !h; ds.innerHTML = h ? A.dogOptions(h) : '<option>Choose household</option>'; ss.innerHTML = h ? A.sessionOptions(h) : '<option>—</option>'; go.disabled = !h; });
            go.addEventListener('click', () => {
              const dog = ds.value, sid = ss.value;
              if (it.kind === 'voice') { const s = V3.session(sid); s.notes = (s.notes ? s.notes + '\n\n' : '') + '🎙 ' + it.transcript; it.state = 'assigned'; it.assignedTo = dog; V3.audit('saved voice note', `→ ${s.title}`); V3.toast('Transcript saved to session notes', { icon: 'notebook-pen', sub: 'Working audio copy deleted' }); }
              else { const m = A.createMedia({ dogs: [dog], session: sid, clip: it.clip, title: it.caption.replace(/^Fwd:\s*/, ''), source: 'whatsapp_archive', processing: 'processing' }); it.state = 'assigned'; it.assignedTo = dog; it.media = m.id; V3.audit('assigned inbox item', `${it.caption} → ${V3.dog(dog).name}`); setTimeout(() => { m.processing = 'ready'; m.editorial = 'needs_review'; A.genAI(m); V3.save(); A.changed(false); V3.toast(`${esc(m.title)} ready for review`, { icon: 'sparkles', action: { label: 'Review', fn: () => V3.app.go('#/review/' + m.id) } }); }, 3500); V3.toast(`Assigned to ${esc(V3.dog(dog).name)}`, { sub: 'Ingesting into Stream…', icon: 'check' }); }
              V3.save(); V3.app.refreshChrome(); V3.app.refresh();
            });
          }
          const dis = $('[data-dismiss]', d); if (dis) dis.addEventListener('click', async () => { if (await V3.confirm('Dismiss this item?', 'It’s hidden from the inbox. The ingest event stays in the audit trail for idempotency.', 'Dismiss')) { it.state = 'dismissed'; V3.audit('dismissed inbox item', it.caption); V3.save(); V3.app.refreshChrome(); selId = null; V3.app.go('#/inbox'); V3.app.refresh(); } });
          const kp = $('[data-keep]', d); if (kp) kp.addEventListener('click', () => V3.toast('Kept in quarantine', { icon: 'shield-alert' }));
          const pv = $('[data-play-voice]', d); if (pv) pv.addEventListener('click', () => V3.toast('Playing voice note (simulated)', { icon: 'audio-lines', duration: 1600 }));
        };
        v.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) { selId = b.dataset.i; draw(); if (window.innerWidth < 1024) $('[data-detail]', v).scrollIntoView({ behavior: 'smooth' }); } });
        draw();
      }
    };
  };
})();
