/* =========================================================
   PAWS & PLAY — admin: share composer (user-mediated WhatsApp)
   + share history. States: draft → prepared → handoff_opened →
   trainer_confirmed. Never "delivered" or "read".
   ========================================================= */
(function () {
  'use strict';
  const A = window.ADMIN, P = window.PAWS, L = window.LINDA, APP = window.APP, $ = P.$, $$ = P.$$;
  const G = typeof window.gsap !== 'undefined';
  const ic = P.ic, esc = P.esc;
  const STATES = [['draft', 'Draft'], ['prepared', 'Prepared'], ['handoff_opened', 'WhatsApp opened'], ['trainer_confirmed', 'You confirmed sent']];
  const MODES = [['link_only', 'Link only', 'link'], ['video_only', 'Video only', 'file-video'], ['link_and_video', 'Link + video', 'layers']];
  const TEMPLATES = [
    ['Session recap', 'Kia ora {name}! Here’s today’s clip of {dog} — have a watch when you get a sec 🐾'],
    ['Homework nudge', 'Hi {name} — quick reminder of {dog}’s homework this week. The clip shows exactly how. Little and often!'],
    ['Class follow-up', 'Thanks for coming along today! Here’s the clip we talked about. See you next week 🐶']
  ];

  A.V.share = ({ query }) => {
    const shareable = L.media.filter((m) => ['approved_private', 'approved_shared', 'published_public'].includes(m.editorial) && m.processing === 'ready');
    const st = {
      media: query.media ? [query.media] : query.session ? (L.session(query.session) || { media: [] }).media.filter((id) => shareable.some((m) => m.id === id)) : [],
      targets: query.group ? [query.group] : [],
      mode: A.S.settings.defaultMode || 'link_only', msg: '', state: 'draft', id: null, exported: false
    };
    if (st.media.length && !st.targets.length) { const hh = A.hhOfMedia(L.mediaItem(st.media[0])); if (hh) st.targets.push(hh.id); }
    st.msg = fillTpl(TEMPLATES[0][1], st);
    function fillTpl(t, s) { const tg = s.targets.map((x) => L.household(x)).filter(Boolean)[0]; const name = tg ? (L.user(tg.primary) || {}).name.split(' ')[0] : 'there'; const m = L.mediaItem(s.media[0]); return t.replace('{name}', name).replace('{dog}', m ? A.dogNames(m.dogs) : 'your dog'); }

    return {
      title: 'Share composer', short: 'Share',
      html: A.vhead('User-mediated WhatsApp', 'send', 'Share composer', 'You send from your own WhatsApp. We prepare the message, secure link and optional video — then you pick the chat and press send.') +
        `<div class="share-state" data-states style="margin-bottom:20px"></div>
        <div class="share-layout">
          <div style="display:grid;gap:20px">
            <section class="card share-step"><h2><span class="n">1</span>Pick videos</h2><p class="small muted" style="margin:0">Only approved clips that have finished processing can be shared.</p><div class="sel-tiles" data-media></div></section>
            <section class="card share-step"><h2><span class="n">2</span>Who’s it for?</h2>
              <div class="tabs" role="tablist" data-ttabs><button type="button" role="tab" aria-selected="true" data-tt="hh">Households</button><button type="button" role="tab" aria-selected="false" data-tt="users">People</button><button type="button" role="tab" aria-selected="false" data-tt="groups">Groups</button></div>
              <div class="recip" data-targets></div><div class="resolve" data-resolve></div></section>
            <section class="card share-step"><h2><span class="n">3</span>Message</h2>
              <div class="chips" data-tpl>${TEMPLATES.map(([n], i) => `<button type="button" class="chip" data-i="${i}">${ic('wand-sparkles')}${n}</button>`).join('')}</div>
              <label class="sr-only" for="sh-msg">Message</label><textarea class="textarea" id="sh-msg" data-msg>${esc(st.msg)}</textarea>
              <div class="row row--between"><span class="small muted" data-chars></span><button class="btn btn--sm btn--ghost" type="button" data-copymsg>${ic('copy')}Copy message</button></div></section>
            <section class="card share-step"><h2><span class="n">4</span>How to send</h2>
              <div class="seg" role="group" aria-label="Share mode" data-mode>${MODES.map(([v, l, i]) => `<button type="button" data-v="${v}" aria-pressed="${st.mode === v}">${ic(i)}${l}</button>`).join('')}</div>
              <div data-modeinfo></div></section>
          </div>
          <aside class="wa-phone"><div class="wa"><div class="wa-top">${ic('arrow-left')}<span class="avatar" data-wa-av>?</span><span><b data-wa-to>Pick someone</b><small>WhatsApp · preview</small></span></div><div class="wa-body" data-wa></div><div class="wa-input"><span></span><i></i></div></div>
            <div class="grid" style="gap:10px;margin-top:16px" data-actions></div></aside>
        </div>`,
      mount(el) {
        let ttab = 'hh';
        const sel = (m) => st.media.includes(m.id);
        function renderMedia() {
          $('[data-media]', el).innerHTML = shareable.map((m) => `<button class="sel-tile" type="button" data-m="${m.id}" aria-pressed="${sel(m)}"><img src="${A.thumb(m)}" alt=""><span class="st">${P.status(m.editorial)}</span><span class="tick">${ic('check')}</span><span class="t">${esc(m.title)}<br><span class="muted" style="font-weight:600">${esc(A.dogNames(m.dogs))}</span></span></button>`).join(''); P.icons();
        }
        function renderTargets() {
          const opts = ttab === 'hh' ? L.households.filter((h) => h.status === 'active').map((h) => ({ id: h.id, name: h.name, av: APP.avatar(h.name, (L.dogsFor(h.id)[0] || {}).avatar) }))
            : ttab === 'users' ? L.users.filter((u) => u.role === 'client' && u.invite === 'accepted').map((u) => ({ id: u.id, name: u.name, av: APP.avatar(u.name) }))
            : L.groups.map((g) => ({ id: g.id, name: g.title, av: `<span class="avatar" style="background:${g.color}">${ic('users-round')}</span>` }));
          $('[data-targets]', el).innerHTML = opts.map((o) => `<button type="button" class="chip" data-tg="${o.id}" aria-pressed="${st.targets.includes(o.id)}">${o.av}${esc(o.name)}</button>`).join('');
          P.icons(); renderResolve();
        }
        function resolve() {
          const people = new Map(); const hhs = new Set();
          st.targets.forEach((t) => {
            const h = L.household(t), g = L.groups.find((x) => x.id === t), u = L.user(t);
            if (h) { hhs.add(h.id); h.members.map(L.user).filter((x) => x && x.invite === 'accepted').forEach((x) => people.set(x.id, x)); }
            if (g) g.members.forEach((hid) => { hhs.add(hid); L.household(hid).members.map(L.user).filter((x) => x && x.invite === 'accepted').forEach((x) => people.set(x.id, x)); });
            if (u) { people.set(u.id, u); hhs.add(u.household); }
          });
          const missing = [];
          st.media.forEach((mid) => { const m = L.mediaItem(mid); const own = A.hhOfMedia(m); hhs.forEach((hid) => { const granted = m.editorial === 'published_public' || (m.editorial === 'approved_shared' && ((m.visibility === 'household' && own && own.id === hid) || (m.visibility === 'group' && m.group && L.groups.find((g) => g.id === m.group).members.includes(hid)))) || (m.grants || []).includes(hid); if (!granted) missing.push({ m, hid }); }); });
          return { people: Array.from(people.values()), hhs: Array.from(hhs), missing };
        }
        function renderResolve() {
          const r = resolve();
          $('[data-resolve]', el).innerHTML = !st.targets.length ? `<span class="muted">Pick at least one household, person or group.</span>` :
            `<span class="r">${ic('users')}${r.people.length} eligible ${r.people.length === 1 ? 'person' : 'people'} across ${r.hhs.length} household${r.hhs.length === 1 ? '' : 's'} (duplicates removed)</span>
            ${r.missing.length ? r.missing.map((x) => `<span class="r" style="color:var(--tomato-deep)">${ic('shield-alert')}${esc(L.household(x.hid).name)} doesn’t have access to “${esc(x.m.title)}” yet <button class="btn btn--sm" type="button" data-grant="${x.m.id}|${x.hid}">Grant access</button></span>`).join('') : `<span class="r" style="color:var(--grass)">${ic('shield-check')}Everyone already has access to the selected videos</span>`}
            <span class="r muted" style="font-weight:600">${ic('info')}For a real WhatsApp group chat, you’ll pick that chat inside WhatsApp — its membership isn’t synced here.</span>`;
          P.icons(); renderPreview(); renderActions();
        }
        function renderModeInfo() {
          const file = st.mode !== 'link_only';
          $('[data-modeinfo]', el).innerHTML = (file ? `<div class="callout callout--warn" style="margin-top:12px">${ic('alert-triangle')}<div><strong>Sending a video file creates a copy you can’t revoke</strong><p>Portal links can be switched off later; files sent in WhatsApp can’t. Use link-only when in doubt.</p></div></div>` : `<div class="callout callout--ok" style="margin-top:12px">${ic('shield-check')}<div><strong>Safest option</strong><p>The link only plays for people with access — and you can revoke it anytime.</p></div></div>`) +
            (st.mode === 'link_and_video' ? `<div class="callout callout--info" style="margin-top:10px">${ic('split')}<div><strong>Two-step fallback</strong><p>iOS sometimes drops the text when sharing a video. If that happens: 1) share the video file, 2) paste the copied message &amp; link into the same chat.</p></div></div>` : '');
          P.icons();
        }
        function renderPreview() {
          const r = resolve(); const to = st.targets.map(A.targetName); const first = st.targets[0];
          $('[data-wa-to]', el).textContent = to.length ? to.join(', ') : 'Pick someone';
          $('[data-wa-av]', el).outerHTML = first ? APP.avatar(A.targetName(first)).replace('class="avatar', 'data-wa-av class="avatar') : '<span class="avatar" data-wa-av>?</span>';
          const ms = st.media.map(L.mediaItem); const link = st.media.length ? `lindasdogtraining.co.nz/p/${(st.id || 'sh-new').replace('sh-', '')}${st.media.length > 1 ? '?n=' + st.media.length : ''}` : '';
          const vid = st.mode !== 'link_only' && ms[0] ? `<div class="wa-vid"><img src="${A.thumb(ms[0])}" alt=""><span class="pl"><svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></svg></span><span class="sz">${ic('video', 'inline-ic')} ${ms[0].duration} · ${st.exported ? '18.4 MB' : 'preparing…'}</span></div>` : '';
          const lk = st.mode !== 'video_only' && ms[0] ? `<div class="wa-link"><img src="${A.thumb(ms[0])}" alt=""><div><b>${esc(ms.length > 1 ? ms.length + ' training videos' : ms[0].title)}</b>Private · only ${esc(r.hhs.length ? L.household(r.hhs[0]).name : 'invited people')} can watch</div></div>` : '';
          const time = new Date().toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' });
          const txt = esc(st.msg) + (st.mode !== 'video_only' && link ? `\n<span style="color:#0b7ac4">https://${link}</span>` : '');
          $('[data-wa]', el).innerHTML = !st.media.length ? `<span class="wa-note">Pick a video to see the preview</span>` :
            (st.mode === 'link_and_video' ? `<span class="wa-note">Step 1 · video file</span><div class="wa-bub">${vid}<span class="time">${time}</span></div><span class="wa-note">Step 2 · message &amp; link (if iOS dropped it)</span><div class="wa-bub">${lk}<div class="txt">${txt}</div><span class="time">${time}</span></div>` :
              `<div class="wa-bub">${vid}${lk}${st.mode === 'video_only' ? (st.msg ? `<div class="txt">${esc(st.msg)}</div>` : '') : `<div class="txt">${txt}</div>`}<span class="time">${time}</span></div>`) + `<span class="wa-note">${ic('info', 'inline-ic')} You’ll press send in WhatsApp. We can’t see delivery or read status.</span>`;
          $('[data-chars]', el).textContent = st.msg.length + ' characters';
          P.icons();
        }
        function renderStates() {
          const i = STATES.findIndex((s) => s[0] === st.state);
          $('[data-states]', el).innerHTML = STATES.map(([k, l], j) => `<span class="ss ${j < i ? 'is-done' : ''} ${j === i ? 'is-cur' : ''}">${j < i ? ic('check') : ''}${l}</span>${j < STATES.length - 1 ? ic('chevron-right', 'arr') : ''}`).join('') + `<span class="pill pill--soft" style="margin-left:8px">${ic('eye-off')}No “delivered” or “read” — by design</span>`;
          P.icons();
        }
        function renderActions() {
          const r = resolve(); const ok = st.media.length && st.targets.length && !r.missing.length;
          const box = $('[data-actions]', el);
          if (st.state === 'draft') box.innerHTML = `<button class="btn btn--primary btn--lg btn--block" type="button" data-prepare ${ok ? '' : 'disabled'}>${ic('package-check')}Prepare share</button>${!ok && st.targets.length && st.media.length ? `<p class="small" style="margin:0;color:var(--tomato-deep);font-weight:700">Grant access for everyone first.</p>` : ''}<button class="btn btn--block btn--outline" type="button" data-savedraft ${st.media.length ? '' : 'disabled'}>${ic('save')}Save as draft</button>`;
          else if (st.state === 'prepared') box.innerHTML = (st.mode !== 'link_only' && !st.exported ? `<div class="card card--sm"><b>${ic('loader-circle', 'spin inline-ic')} Preparing video…</b><div class="progress progress--striped progress--sun" style="margin-top:8px"><i data-exp style="--v:0%"></i></div><p class="xsmall muted" style="margin:6px 0 0">Creating a signed MP4 download (short-lived).</p></div>` : '') +
            `<button class="btn btn--grass btn--lg btn--block" type="button" data-open ${st.mode !== 'link_only' && !st.exported ? 'disabled' : ''}>${ic('message-circle')}Open WhatsApp</button><button class="btn btn--block btn--outline" type="button" data-copyall>${ic('copy')}Copy message &amp; link</button>`;
          else if (st.state === 'handoff_opened') box.innerHTML = `<div class="callout callout--info">${ic('smartphone')}<div><strong>Finish in WhatsApp</strong><p>Choose the chat, check the message and press send. Then come back and confirm.</p></div></div><button class="btn btn--grass btn--lg btn--block" type="button" data-confirm>${ic('check-circle-2')}I sent it</button><button class="btn btn--block btn--outline" type="button" data-open>${ic('rotate-ccw')}Open WhatsApp again</button><button class="btn btn--block btn--ghost" type="button" data-cancel>Didn’t send — cancel</button>`;
          else box.innerHTML = `<div class="callout callout--ok">${ic('party-popper')}<div><strong>Recorded as sent by you</strong><p>We’ll count portal opens. WhatsApp delivery isn’t tracked.</p></div></div><a class="btn btn--block" href="#/shares">${ic('history')}Share history</a><a class="btn btn--block btn--sun" href="#/share">${ic('plus')}New share</a>`;
          P.icons();
        }
        function persist() {
          const rec = { id: st.id || 'sh-' + Math.random().toString(36).slice(2, 6), created: A.now(), mode: st.mode, media: st.media.slice(), targets: st.targets.slice(), state: st.state, message: st.msg, opens: 0 };
          st.id = rec.id; const ex = L.shares.find((s) => s.id === rec.id);
          if (ex) P.db.patch('shares', rec.id, { state: st.state, mode: st.mode, message: st.msg, media: rec.media, targets: rec.targets }); else P.db.add('shares', rec);
          A.badges();
        }
        function setState(s) { st.state = s; persist(); renderStates(); renderActions(); renderPreview(); A.audit(s === 'prepared' ? 'prepared share' : s === 'handoff_opened' ? 'opened WhatsApp handoff' : s === 'trainer_confirmed' ? 'confirmed share sent' : 'cancelled share', st.targets.map(A.targetName).join(', ')); }

        el.addEventListener('click', (e) => {
          const mb = e.target.closest('[data-m]'); if (mb && st.state === 'draft') { const id = mb.dataset.m; const i = st.media.indexOf(id); if (i > -1) st.media.splice(i, 1); else st.media.push(id); mb.setAttribute('aria-pressed', i === -1); if (G && !P.reduced) gsap.fromTo(mb, { scale: .94 }, { scale: 1, duration: .6, ease: 'elastic.out(1.2,.4)' }); renderResolve(); return; }
          const tt = e.target.closest('[data-tt]'); if (tt) { ttab = tt.dataset.tt; $$('[data-tt]', el).forEach((x) => x.setAttribute('aria-selected', x === tt)); renderTargets(); return; }
          const tg = e.target.closest('[data-tg]'); if (tg && st.state === 'draft') { const id = tg.dataset.tg; const i = st.targets.indexOf(id); if (i > -1) st.targets.splice(i, 1); else st.targets.push(id); tg.setAttribute('aria-pressed', i === -1); renderResolve(); return; }
          const gr = e.target.closest('[data-grant]'); if (gr) { const [mid, hid] = gr.dataset.grant.split('|'); const m = L.mediaItem(mid); P.confirm('Grant access?', `${esc(L.household(hid).name)} will be able to watch “${esc(m.title)}” in their portal. This is recorded in the audit log.`, 'Grant access', () => { P.db.patch('media', mid, { grants: (m.grants || []).concat(hid), editorial: m.editorial === 'approved_private' ? 'approved_shared' : m.editorial }); A.audit('granted access', `${m.title} → ${L.household(hid).name}`); P.toast('Access granted', { tone: 'ok', icon: 'shield-check' }); renderResolve(); }); return; }
          const tp = e.target.closest('[data-tpl] [data-i]'); if (tp) { st.msg = fillTpl(TEMPLATES[+tp.dataset.i][1], st); $('[data-msg]', el).value = st.msg; renderPreview(); return; }
          const md = e.target.closest('[data-mode] [data-v]'); if (md && st.state === 'draft') { st.mode = md.dataset.v; $$('[data-mode] button', el).forEach((x) => x.setAttribute('aria-pressed', x === md)); renderModeInfo(); renderPreview(); return; }
          if (e.target.closest('[data-copymsg]') || e.target.closest('[data-copyall]')) { const t = st.msg + (st.mode !== 'video_only' ? `\nhttps://lindasdogtraining.co.nz/p/${(st.id || 'sh-new').replace('sh-', '')}` : ''); try { navigator.clipboard.writeText(t); } catch (er) { /* noop */ } P.toast('Copied to clipboard', { tone: 'ok', icon: 'copy' }); return; }
          if (e.target.closest('[data-savedraft]')) { persist(); P.toast('Saved as draft', { tone: 'ok', icon: 'save' }); return; }
          if (e.target.closest('[data-prepare]')) {
            setState('prepared'); P.toast('Secure link created · permissions checked', { tone: 'ok', icon: 'package-check' });
            if (st.mode !== 'link_only') { const o = { v: 0 }; const go = () => { const b = $('[data-exp]', el); if (b) b.style.setProperty('--v', o.v + '%'); }; if (G) gsap.to(o, { v: 100, duration: 2.6, ease: 'power1.inOut', onUpdate: go, onComplete: () => { st.exported = true; renderActions(); renderPreview(); P.toast('MP4 ready to share', { tone: 'ok', icon: 'file-video' }); } }); else { st.exported = true; renderActions(); } }
            return;
          }
          if (e.target.closest('[data-open]')) {
            const canShare = !!navigator.share;
            P.modal({ title: st.mode === 'link_only' ? 'Opening WhatsApp…' : 'Opening the share sheet…', html: `<div style="text-align:center"><div class="envelope" style="width:110px;height:110px;margin:0 auto 14px;border-radius:50%;background:#25D366;border:3px solid var(--ink);display:grid;place-items:center;box-shadow:var(--sh-sm)">${ic('message-circle')}</div>
              <p>${st.mode === 'link_only' ? (st.targets.length === 1 && L.household(st.targets[0]) ? 'WhatsApp opens with the message pre-filled. Choose the chat and press send.' : 'Several recipients — pick each chat (or your WhatsApp group) in WhatsApp.') : 'Your phone’s share sheet opens with the video. Choose WhatsApp, then the chat.'}</p>
              <p class="small muted">${canShare ? '' : 'This browser can’t open the share sheet — on Linda’s phone it would. '}Demo only: nothing is actually sent.</p></div>`,
              actions: [{ label: 'Back to Linda’s app', cls: 'btn--primary', icon: 'arrow-left', onClick: () => { setState('handoff_opened'); } }] });
            return;
          }
          if (e.target.closest('[data-confirm]')) { setState('trainer_confirmed'); const r = e.target.closest('[data-confirm]').getBoundingClientRect(); P.confetti(r.left + r.width / 2, r.top, 30); P.toast('Marked as sent by you', { tone: 'ok', icon: 'check-circle-2' }); return; }
          if (e.target.closest('[data-cancel]')) { st.state = 'cancelled'; persist(); A.audit('cancelled share', st.targets.map(A.targetName).join(', ')); P.toast('Share cancelled', { icon: 'x' }); A.go('/shares'); }
        });
        $('[data-msg]', el).addEventListener('input', (e) => { st.msg = e.target.value; renderPreview(); });
        renderMedia(); renderTargets(); renderModeInfo(); renderStates(); renderPreview(); renderActions();
        APP.popIn(el, '.card');
      }
    };
  };

  /* ================= HISTORY ================= */
  A.V.shares = ({ query }) => {
    const f = query.s || 'all';
    const list = L.shares.slice().sort((a, b) => b.created.localeCompare(a.created)).filter((s) => f === 'all' || s.state === f);
    const modeL = (m) => (MODES.find((x) => x[0] === m) || [m, m])[1];
    return {
      title: 'Share history', short: 'Shares',
      html: A.vhead('ShareIntents', 'history', 'Share history', 'Prepared, opened and confirmed shares. Personal WhatsApp never reports delivery — so neither do we.', `<a class="btn btn--primary" href="#/share">${ic('send')}New share</a>`) +
        `<div class="chips chips--scroll" style="margin-bottom:18px"><a class="chip" href="#/shares" aria-current="${f === 'all'}">All</a>${['draft', 'prepared', 'handoff_opened', 'trainer_confirmed', 'cancelled'].map((s) => `<a class="chip" href="#/shares?s=${s}" aria-current="${f === s}">${P.statusLabel(s)} <span class="count">${L.shares.filter((x) => x.state === s).length}</span></a>`).join('')}</div>
        <div class="table-wrap"><table class="table table--stack"><thead><tr><th>Videos</th><th>To</th><th>Mode</th><th>State</th><th>Portal opens</th><th>Created</th><th></th></tr></thead><tbody>
        ${list.map((s) => { const ms = s.media.map(L.mediaItem).filter(Boolean); return `<tr class="is-link" data-sh="${s.id}"><td data-l=""><span class="row"><span class="lrow" style="padding:0;border:0;min-height:0;background:none;width:auto"><span class="thumb">${ms[0] ? `<img src="${A.thumb(ms[0])}" alt="">` : ''}</span></span><b>${esc(ms.map((m) => m.title).join(', '))}</b></span></td><td data-l="To">${esc(s.targets.map(A.targetName).join(', '))}</td><td data-l="Mode"><span class="pill">${modeL(s.mode)}</span></td><td data-l="State">${P.status(s.state)}</td><td data-l="Opens">${s.opens ? `<span class="pill pill--sun">${ic('eye')}${s.opens}</span>` : '—'}</td><td data-l="Created">${APP.when(s.created)}</td><td data-l="">${ic('chevron-right')}</td></tr>`; }).join('')}</tbody></table></div>`,
      mount(el) {
        $$('[data-sh]', el).forEach((tr) => tr.addEventListener('click', () => {
          const s = L.shares.find((x) => x.id === tr.dataset.sh); const i = STATES.findIndex((x) => x[0] === s.state);
          P.modal({ title: 'Share details', html: `<div class="share-state" style="margin-bottom:14px">${STATES.map(([k, l], j) => `<span class="ss ${j < i ? 'is-done' : ''} ${j === i ? 'is-cur' : ''}">${l}</span>`).join('')}${s.state === 'cancelled' ? '<span class="ss is-cur">Cancelled</span>' : ''}</div>
            <dl class="kv"><dt>To</dt><dd>${esc(s.targets.map(A.targetName).join(', '))}</dd><dt>Mode</dt><dd>${modeL(s.mode)}</dd><dt>Created</dt><dd>${APP.when(s.created)}</dd><dt>Portal opens</dt><dd>${s.opens}</dd><dt>Delivery</dt><dd>Not tracked for personal WhatsApp</dd></dl>
            <div class="wa-bub" style="margin-top:16px;justify-self:start;max-width:100%"><div class="txt">${esc(s.message || '(no message — video only)')}</div></div>`,
            actions: (s.state === 'prepared' || s.state === 'handoff_opened' ? [{ label: 'Mark as sent by me', cls: 'btn--grass', icon: 'check', onClick: () => { P.db.patch('shares', s.id, { state: 'trainer_confirmed' }); A.audit('confirmed share sent', s.targets.map(A.targetName).join(', ')); A.badges(); A.router.refresh(); } }] : []).concat(s.state === 'draft' ? [{ label: 'Continue in composer', cls: 'btn--primary', onClick: () => A.go('/share?media=' + s.media[0]) }] : []).concat([{ label: 'Close', cls: 'btn--outline' }]) });
        }));
        APP.popIn(el, 'tr');
      }
    };
  };
})();
