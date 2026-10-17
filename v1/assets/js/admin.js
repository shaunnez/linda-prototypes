/* ==========================================================================
   admin.js — trainer workspace SPA (part 1)
   shell · sticky context · simulated tus upload engine · ⌘K palette
   dashboard · record flow + camera · uploads · review queue · review detail
   ========================================================================== */
(function () {
  'use strict';
  const { $, $$, esc, icon, icons, toast, modal, confirm, store, player, ring, validate, sleep, parseT, fmtT, ago, uid, clamp } = window.UI;
  const A = window.App;
  const L = window.LINDA;
  const DB = window.DB;
  const LINDA_U = L.user('u-linda');
  const T0 = Date.now();
  const views = {};

  /* ---------- helpers ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const nowISO = () => { const d = new Date(UI.NOW.getTime() + (Date.now() - T0)); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const H = {
    needsReview: () => L.media.filter((m) => m.editorial === 'needs_review' && m.processing === 'ready').sort((a, b) => b.created.localeCompare(a.created)),
    processing: () => L.media.filter((m) => ['created', 'uploading', 'uploaded', 'processing'].includes(m.processing)),
    unassigned: () => L.inbox.filter((i) => i.state === 'unassigned'),
    attention: () => L.inbox.filter((i) => ['too_large', 'quarantined'].includes(i.state)),
    activeUploads: () => L.uploads.filter((u) => ['created', 'uploading', 'uploaded', 'processing', 'failed'].includes(u.state)),
    openShares: () => L.shares.filter((s) => ['draft', 'prepared', 'handoff_opened'].includes(s.state)),
    dogNames: (m) => m.dogs.map((d) => (L.dog(d) || {}).name).filter(Boolean).join(' & '),
    hhOfMedia: (m) => { const d = L.dog(m.dogs[0]); return d ? L.household(d.household) : null; },
    ambiguous: (m) => { const s = L.session(m.session); return (s && s.dogs.length > 1 && !m.dogsConfirmed) || (m.ai && (m.ai.evidence || []).some((e) => /ambiguous/i.test(e)) && !m.dogsConfirmed); },
    activeSession: () => L.sessions.find((s) => s.status === 'active')
  };
  function updateCounts() {
    A.setCount('review', H.needsReview().length);
    A.setCount('inbox', H.unassigned().length + H.attention().filter((i) => i.state === 'too_large').length);
    A.setCount('uploads', H.activeUploads().filter((u) => u.state !== 'failed').length + H.activeUploads().filter((u) => u.state === 'failed').length);
    A.setCount('shares', H.openShares().length);
  }

  /* ---------- sticky recording context ---------- */
  const Ctx = {
    get() {
      const c = DB.kv('ctx');
      if (c && L.dog(c.dog)) return c;
      const s = H.activeSession();
      return s ? { household: s.household, dog: s.dogs[0], session: s.id } : null;
    },
    set(c) { DB.kv('ctx', c); },
    label(c) { if (!c) return ''; const d = L.dog(c.dog), h = L.household(c.household), s = L.session(c.session); return { dog: d, hh: h, session: s }; }
  };

  /* ---------- AI draft generator (demo) ---------- */
  function genAI(m, variant = 0) {
    const d = L.dog(m.dogs[0]);
    const ts = (d ? d.techniques : ['t-focus']).slice();
    if (variant) ts.reverse();
    const t0 = L.technique(ts[0]);
    const titles = [`${t0.name} practice — ${d ? d.name : 'dog'}`, `${t0.name}: short rep with reward`, `${d ? d.name : 'Dog'} works on ${t0.name.toLowerCase()}`];
    return {
      title: titles[variant % titles.length],
      summary: variant % 2 ? `Handler and dog repeat a short ${t0.name.toLowerCase()} exercise. Visual evidence only; no speech detected.` : `Dog appears to practise ${t0.name.toLowerCase()} with a reward at the end. Evidence is limited — please confirm the technique.`,
      confidence: +(0.55 + Math.random() * 0.3).toFixed(2),
      tags: ts.slice(0, 3).map((id, i) => ({ id, c: +(0.85 - i * 0.22 - Math.random() * 0.08).toFixed(2) })),
      transcript: variant % 2 ? null : `“${d ? d.name : 'Good'}… yes! Good ${d && d.sex === 'F' ? 'girl' : 'boy'}.”`,
      evidence: variant % 2 ? ['No speech detected — transcript unavailable', `Frames 0:02–0:09 show ${d ? d.name : 'dog'} near handler`] : [`Transcript 0:03 — marker word detected`, 'Sampled frames show handler delivering a reward'],
      model: 'vision-draft v2 (demo)', cost: 0.04
    };
  }

  /* ---------- simulated tus upload engine ---------- */
  const UP = {
    timers: {},
    get: (id) => L.uploads.find((u) => u.id === id),
    media: (u) => L.mediaItem(u.media),
    persist(u) { DB.patch('uploads', u.id, { state: u.state, progress: u.progress, error: u.error || null, paused: !!u.paused }); },
    start(id) {
      const u = this.get(id); if (!u || this.timers[id]) return;
      u.state = 'uploading'; u.paused = false; u.error = null;
      const m = this.media(u); if (m) DB.patch('media', m.id, { processing: 'uploading', progress: u.progress });
      this.persist(u);
      this.timers[id] = setInterval(() => this.tick(id), 420);
      this.emit(id);
    },
    tick(id) {
      const u = this.get(id);
      if (!u || u.state !== 'uploading' || u.paused) return;
      u.progress = Math.min(1, (u.progress || 0) + 0.018 + Math.random() * 0.03);
      const mbps = 3 + Math.random() * 2.6;
      u.speed = mbps.toFixed(1) + ' MB/s';
      const size = parseFloat(u.size) || 200;
      u.eta = Math.max(1, Math.round(((1 - u.progress) * size) / mbps)) + 's';
      const m = this.media(u); if (m) m.progress = u.progress;
      if (u.progress >= 1) this.complete(id);
      this.emit(id);
    },
    complete(id) {
      const u = this.get(id);
      clearInterval(this.timers[id]); delete this.timers[id];
      u.state = 'uploaded'; u.progress = 1; this.persist(u);
      const m = this.media(u);
      if (m) DB.patch('media', m.id, { processing: 'uploaded', progress: 1 });
      this.emit(id);
      setTimeout(() => {
        u.state = 'processing'; this.persist(u);
        if (m) DB.patch('media', m.id, { processing: 'processing' });
        this.emit(id);
        setTimeout(() => {
          u.state = 'ready'; this.persist(u);
          if (m) {
            DB.patch('media', m.id, { processing: 'ready', editorial: 'needs_review', ai: m.ai || genAI(m) });
            DB.audit('Stream ready · AI draft created', `${m.title} (${m.id})`, 'System');
            toast(`<b>${esc(m.title)}</b> is ready — AI draft waiting for review.`, { type: 'success', icon: 'sparkles', action: { label: 'Review', fn: () => R.go('#/review/' + m.id) }, duration: 6000 });
          }
          this.emit(id);
        }, 2600);
      }, 1300);
    },
    pause(id) { const u = this.get(id); u.paused = true; this.persist(u); this.emit(id); },
    resume(id) { const u = this.get(id); u.paused = false; if (!this.timers[id]) { this.start(id); } this.persist(u); this.emit(id); },
    suspend(id) {
      const u = this.get(id);
      clearInterval(this.timers[id]); delete this.timers[id];
      u.state = 'failed'; u.paused = false;
      const pct = Math.round((u.progress || 0) * 100);
      u.error = `Interrupted at ${pct}% — Safari was suspended in the background. Re-select the file to resume from ${pct}%.`;
      this.persist(u);
      const m = this.media(u); if (m) DB.patch('media', m.id, { processing: 'failed', error: u.error });
      toast('Upload interrupted — iOS suspended Safari.', { type: 'error', action: { label: 'Retry', fn: () => this.retry(id) } });
      this.emit(id);
    },
    async retry(id) {
      const u = this.get(id);
      const mm = modal({
        title: 'Re-select the file', eyebrow: 'Resume upload', sub: 'iOS doesn’t keep a handle to the file after Safari is suspended. Pick it again and we’ll resume where it stopped.',
        body: `<div class="list card">${[u.file, 'IMG_4799.MOV', 'IMG_4776.MOV'].map((f, i) => `<button class="list-row" data-pick="${f}"><span class="list-row__thumb"><img src="${L.thumb((this.media(u) || {}).clip || 1552, [40, 15, 65][i])}" alt=""></span><span class="list-row__main"><span class="list-row__title">${f}</span><span class="list-row__meta">${i === 0 ? u.size + ' · matches the interrupted upload' : (120 + i * 37) + ' MB'}</span></span>${i === 0 ? A.badge('ready', 'match') : ''}</button>`).join('')}</div><p class="faint text-xs mt-2">Simulated Photos picker</p>`
      });
      mm.root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-pick]'); if (!b) return;
        if (b.dataset.pick !== u.file) { toast('That’s a different file — choose the matching recording.', { type: 'error' }); return; }
        mm.close();
        const m = this.media(u); if (m) DB.patch('media', m.id, { error: null });
        toast(`Resuming from ${Math.round(u.progress * 100)}% (tus)`, { icon: 'refresh-cw' });
        this.start(id);
      });
    },
    async cancel(id) {
      if (!(await confirm({ title: 'Cancel this upload?', sub: 'The partial upload will be discarded. The recording stays on your phone.', ok: 'Cancel upload', cancel: 'Keep uploading', danger: true }))) return;
      const u = this.get(id);
      clearInterval(this.timers[id]); delete this.timers[id];
      u.state = 'cancelled'; this.persist(u);
      const m = this.media(u); if (m) DB.patch('media', m.id, { processing: 'cancelled' });
      this.emit(id);
    },
    row(u) {
      const m = this.media(u) || {};
      const pct = Math.round((u.progress || 0) * 100);
      const st = u.paused ? 'paused' : u.state;
      const acts = [];
      if (u.state === 'uploading' && !u.paused) acts.push(`<button class="btn btn--sm btn--icon btn--ghost" data-up-act="pause" aria-label="Pause upload">${icon('pause')}</button>`, `<button class="btn btn--sm btn--ghost" data-up-act="suspend" title="Demo: simulate iOS suspending Safari">${icon('zap-off')}<span class="hide-sm">Simulate suspend</span></button>`);
      if (u.paused) acts.push(`<button class="btn btn--sm" data-up-act="resume">${icon('play')}Resume</button>`);
      if (u.state === 'failed') acts.push(`<button class="btn btn--sm btn--primary" data-up-act="retry">${icon('refresh-cw')}Re-select & resume</button>`);
      if (['uploading', 'created', 'failed'].includes(u.state)) acts.push(`<button class="btn btn--sm btn--icon btn--ghost" data-up-act="cancel" aria-label="Cancel upload">${icon('x')}</button>`);
      if (u.state === 'ready' && m.id) acts.push(`<a class="btn btn--sm" href="#/review/${m.id}">Review${icon('arrow-right')}</a>`);
      return `<div class="up-row" data-up="${u.id}" data-st="${st}">
        <div class="up-row__thumb"><img src="${L.thumb(m.clip || 1552, 40)}" alt="">${u.state === 'uploading' ? '' : ''}</div>
        <div class="up-row__main">
          <div class="up-row__top"><span class="up-row__name">${esc(m.title || u.file)}</span>${A.badge(u.state === 'failed' ? 'failed' : st === 'paused' ? 'pending' : u.state, st, u.state === 'uploading' && !u.paused ? 'badge--pulse' : '')}</div>
          ${['uploading', 'created'].includes(u.state) || u.state === 'failed' ? `<div class="progress ${u.state === 'failed' ? 'progress--ember' : u.paused ? '' : 'progress--striped'}"><div class="progress__bar" style="--p:${pct}%"></div></div>` : u.state === 'processing' || u.state === 'uploaded' ? `<div class="progress"><div class="progress__bar" style="--p:100%;opacity:.5"></div></div>` : ''}
          <div class="up-row__meta"><span>${u.file}</span><span>${u.size}</span><span>${u.protocol}</span>${u.state === 'uploading' && !u.paused ? `<span class="amber" data-pct>${pct}%</span><span data-speed>${u.speed || '—'}</span><span data-eta>${u.eta ? '~' + u.eta : ''}</span>` : ''}${u.state === 'processing' ? '<span>Stream is encoding…</span>' : ''}${m.dogs ? `<span>${H.dogNames(m)}</span>` : ''}</div>
          ${u.state === 'failed' && u.error ? `<div class="up-row__err">${icon('triangle-alert')}<span>${esc(u.error)}</span></div>` : ''}
        </div>
        <div class="up-row__actions">${acts.join('')}</div>
      </div>`;
    },
    emit(id) {
      const u = this.get(id);
      $$(`[data-up="${id}"]`).forEach((el) => {
        const st = u.paused ? 'paused' : u.state;
        if (el.dataset.st !== st) { el.outerHTML = this.row(u); icons(); return; }
        const pct = Math.round((u.progress || 0) * 100);
        const bar = $('.progress__bar', el); bar && bar.style.setProperty('--p', pct + '%');
        const p = $('[data-pct]', el); p && (p.textContent = pct + '%');
        const s = $('[data-speed]', el); s && (s.textContent = u.speed || '');
        const e = $('[data-eta]', el); e && (e.textContent = u.eta ? '~' + u.eta : '');
      });
      updateCounts();
    }
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-up-act]'); if (!b) return;
    const id = b.closest('[data-up]').dataset.up;
    UP[b.dataset.upAct](id);
  });

  /* ---------- new recording ---------- */
  function createRecording(source, seconds) {
    const c = Ctx.get();
    const d = L.dog(c.dog);
    const s = L.session(c.session);
    const n = 4822 + L.uploads.length;
    const mid = 'm-' + (2000 + Math.floor(Math.random() * 7000));
    const sizeMB = Math.round(seconds * (2.2 + Math.random()));
    const m = DB.add('media', { id: mid, clip: d.clip, title: `${d.name} — ${s ? s.title.split(/[+—]/)[0].trim().toLowerCase() : 'session'} clip`, dogs: [d.id], session: c.session, source, processing: 'created', progress: 0, editorial: 'draft', duration: fmtT(seconds), created: nowISO(), techniques: [], visibility: 'trainer_only', views: 0, notes: '', timestamps: [], ai: null });
    if (s) DB.patch('sessions', s.id, { media: s.media.concat(mid) });
    const u = DB.add('uploads', { id: 'up-' + uid('n').slice(2), media: mid, file: `IMG_${n}.MOV`, size: `${sizeMB} MB`, state: 'created', progress: 0, protocol: 'tus', fresh: true });
    DB.audit('recorded & started upload', `${m.title} → ${d.name} (trainer only)`);
    setTimeout(() => UP.start(u.id), 500);
    return { m, u };
  }

  /* ---------- palette (⌘K) ---------- */
  function palette() {
    if ($('.palette-root')) return;
    const items = [
      ...[['Start recording', 'video', '#/record'], ['Open review queue', 'scan-eye', '#/review'], ['New share', 'send', '#/share'], ['WhatsApp archive inbox', 'inbox', '#/inbox'], ['Add household', 'user-plus', '#/clients?new=1'], ['Uploads', 'cloud-upload', '#/uploads'], ['Media library', 'library', '#/media'], ['Settings', 'settings', '#/settings']].map(([t, ic, h]) => ({ g: 'Actions', t, ic, h })),
      ...L.dogs.map((d) => ({ g: 'Dogs', t: d.name, sub: `${d.breed} · ${(L.household(d.household) || {}).name}`, img: d.avatar, h: '#/dog/' + d.id })),
      ...L.households.map((h) => ({ g: 'Households', t: h.name, sub: `${h.suburb} · ${h.members.length} members`, ic: 'house', h: '#/household/' + h.id })),
      ...L.users.filter((u) => u.role === 'client').map((u) => ({ g: 'People', t: u.name, sub: u.email, ic: 'user-round', h: '#/household/' + (L.households.find((h) => h.members.includes(u.id)) || {}).id })),
      ...L.media.map((m) => ({ g: 'Media', t: m.title, sub: `${H.dogNames(m)} · ${A.label(m.editorial)}`, img: L.thumb(m.clip, 40), h: '#/review/' + m.id })),
      ...L.sessions.map((s) => ({ g: 'Sessions', t: s.title, sub: `${UI.fmtDay(s.date)} · ${s.status}`, ic: 'calendar-days', h: '#/session/' + s.id })),
      ...L.guides.map((g) => ({ g: 'Academy', t: g.title, sub: g.status, ic: 'book-open', h: '#/academy/' + g.id }))
    ];
    const root = document.createElement('div');
    root.className = 'palette-root';
    root.innerHTML = `<div class="modal-backdrop" data-close></div><div class="palette" role="dialog" aria-modal="true" aria-label="Command palette">
      <div class="palette__input">${icon('search')}<input type="text" placeholder="Search dogs, clients, videos… or type a command" aria-label="Search" autocomplete="off"><kbd>esc</kbd></div>
      <div class="palette__list" role="listbox"></div>
      <div class="palette__foot"><span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>⌘K</kbd> toggle</span></div></div>`;
    document.body.appendChild(root);
    const input = $('input', root), list = $('.palette__list', root);
    let res = [], act = 0;
    const draw = () => {
      const q = input.value.trim().toLowerCase();
      res = items.filter((i) => !q || (i.t + ' ' + (i.sub || '') + ' ' + i.g).toLowerCase().includes(q)).slice(0, q ? 40 : 14);
      act = Math.min(act, Math.max(0, res.length - 1));
      let g = '';
      list.innerHTML = res.map((r, i) => { const head = r.g !== g ? `<div class="palette__group">${r.g}</div>` : ''; g = r.g; return head + `<button class="palette__item ${i === act ? 'is-active' : ''}" data-i="${i}" role="option" aria-selected="${i === act}"><span class="palette__ic">${r.img ? `<img src="${r.img}" alt="">` : icon(r.ic || 'arrow-right')}</span><span><span>${esc(r.t)}</span>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</span><span class="palette__go">↵</span></button>`; }).join('') || `<div class="empty" style="border:0">${icon('search-x')}<p>No results for “${esc(q)}”.</p></div>`;
      icons();
      const a = $('.palette__item.is-active', list); a && a.scrollIntoView({ block: 'nearest' });
    };
    const close = () => { root.remove(); document.removeEventListener('keydown', key, true); };
    const go = (i) => { const r = res[i]; if (!r) return; close(); R.go(r.h); };
    const key = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); act = Math.min(res.length - 1, act + 1); draw(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); act = Math.max(0, act - 1); draw(); }
      if (e.key === 'Enter') { e.preventDefault(); go(act); }
    };
    document.addEventListener('keydown', key, true);
    input.addEventListener('input', () => { act = 0; draw(); });
    root.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); const b = e.target.closest('[data-i]'); if (b) go(+b.dataset.i); });
    root.addEventListener('pointermove', (e) => { const b = e.target.closest('[data-i]'); if (b && +b.dataset.i !== act) { act = +b.dataset.i; $$('.palette__item', list).forEach((x) => x.classList.toggle('is-active', +x.dataset.i === act)); } });
    draw();
    setTimeout(() => input.focus(), 30);
  }
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); const p = $('.palette-root'); if (p) p.remove(); else palette(); }
  });

  /* ---------- shell ---------- */
  const nav = [
    { label: 'Today', items: [
      { key: 'dashboard', href: '#/dashboard', icon: 'layout-dashboard', label: 'Dashboard' },
      { key: 'record', href: '#/record', icon: 'video', label: 'Record' },
      { key: 'uploads', href: '#/uploads', icon: 'cloud-upload', label: 'Uploads', count: 0 },
      { key: 'review', href: '#/review', icon: 'scan-eye', label: 'Review queue', count: 0, hot: true }
    ] },
    { label: 'People', items: [
      { key: 'clients', href: '#/clients', icon: 'house', label: 'Clients & dogs' },
      { key: 'sessions', href: '#/sessions', icon: 'calendar-days', label: 'Sessions' },
      { key: 'groups', href: '#/groups', icon: 'users', label: 'Training groups' }
    ] },
    { label: 'Media & sharing', items: [
      { key: 'media', href: '#/media', icon: 'library', label: 'Media library' },
      { key: 'share', href: '#/share', icon: 'send', label: 'Share composer' },
      { key: 'shares', href: '#/shares', icon: 'history', label: 'Share history', count: 0 },
      { key: 'inbox', href: '#/inbox', icon: 'inbox', label: 'WhatsApp archive', count: 0, hot: true }
    ] },
    { label: 'Academy', items: [
      { key: 'techniques', href: '#/techniques', icon: 'tags', label: 'Techniques' },
      { key: 'academy', href: '#/academy', icon: 'book-open', label: 'Academy CMS' }
    ] },
    { label: 'Governance', items: [
      { key: 'consent', href: '#/consent', icon: 'file-check', label: 'Consent records' },
      { key: 'audit', href: '#/audit', icon: 'scroll-text', label: 'Audit log' },
      { key: 'settings', href: '#/settings', icon: 'settings', label: 'Settings' }
    ] }
  ];
  A.shell({
    brandSub: 'Trainer<br>workspace',
    brandHref: '#/dashboard',
    sidebarTop: `<a class="btn btn--primary btn--block sb-record" href="#/record"><span class="fab__rec" style="width:14px;height:14px;border-radius:50%;background:var(--ember);border:2px solid var(--on-accent)"></span>Record</a>`,
    nav,
    sidebarFoot: `<a class="btn btn--sm btn--ghost btn--block" href="/v1/portal/index.html" style="justify-content:flex-start">${icon('eye')}View client portal</a><div class="sb-user">${A.avatar(LINDA_U)}<div class="grow"><b>Linda</b><small>Trainer · admin</small></div><a class="icon-btn" href="/v1/login.html?role=trainer" aria-label="Sign out">${icon('log-out')}</a></div>`,
    topActions: `<button class="search-btn" data-palette aria-label="Search (Command K)">${icon('search')}<span>Search…</span><kbd>⌘K</kbd></button><a class="icon-btn" href="#/inbox" aria-label="WhatsApp archive inbox">${icon('bell')}<span class="dot"></span></a><a href="#/settings" aria-label="Settings" class="hide-sm">${A.avatar(LINDA_U, 'avatar--sm')}</a>`,
    tabs: [
      { key: 'dashboard', href: '#/dashboard', icon: 'house', label: 'Today' },
      { key: 'review', href: '#/review', icon: 'scan-eye', label: 'Review', badge: ' ' },
      { spacer: true },
      { key: 'inbox', href: '#/inbox', icon: 'inbox', label: 'Inbox', badge: ' ' },
      { key: 'more', href: '#/more', icon: 'layout-grid', label: 'More' }
    ],
    fab: `<a class="fab" href="#/record" aria-label="Record a training video"><span class="fab__rec"></span></a>`
  });
  document.addEventListener('click', (e) => { if (e.target.closest('[data-palette]')) palette(); });

  /* ==========================================================================
     VIEWS
     ========================================================================== */

  /* ---------- Dashboard ---------- */
  views.dashboard = () => {
    const s = H.activeSession();
    const sd = s ? L.dog(s.dogs[0]) : null;
    const sh = s ? L.household(s.household) : null;
    const st = L.stats.trainer;
    const nr = H.needsReview(), un = H.unassigned(), ups = H.activeUploads(), sp = H.openShares();
    const hr = new Date(UI.NOW.getTime() + (Date.now() - T0)).getHours();
    const greet = hr < 12 ? 'Mōrena' : 'Kia ora';
    const recent = L.sessions.filter((x) => x.status === 'completed').sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    const weeks = ['1 Sep', '8', '15', '22', '29', '6 Oct', '13'];
    return {
      title: 'Dashboard', crumbs: [{ label: 'Today' }, { label: UI.fmtDay(UI.NOW) }],
      html: `
      ${A.pageHead({ eyebrow: UI.NOW.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' }), title: `${greet}, <em>Linda.</em>`, sub: `${nr.length} clips to review, ${un.length} unassigned in the archive inbox and ${ups.filter((u) => u.state === 'uploading').length} upload in flight.`, actions: `<button class="btn btn--sm" data-palette>${icon('search')}Search</button><a class="btn btn--sm btn--primary" href="#/share">${icon('send')}New share</a>` })}
      ${s ? `<section class="session-hero">
        <div class="session-hero__bg"><img src="${sd.cover}" alt=""></div>
        <div>
          <span class="live-dot">Active session · since ${UI.fmtTime(s.date)}</span>
          <h2>${s.title}</h2>
          <div class="row row--wrap" style="--gap:10px">${A.dogAvatar(sd, 'avatar--sm')}<b>${sd.name}</b><span class="faint">·</span><span class="muted">${sh.name}</span><span class="faint">·</span><span class="muted">${icon('map-pin', 'chev')} ${s.location}</span></div>
          <div class="row row--wrap mt-2"><span class="badge st-uploading">${s.media.length} clip${s.media.length === 1 ? '' : 's'} this session</span><a class="btn btn--sm btn--ghost" href="#/session/${s.id}">Session details</a><button class="btn btn--sm btn--ghost" data-end="${s.id}">${icon('square')}End session</button></div>
        </div>
        <a class="rec-btn" href="#/camera" data-ctx-session="${s.id}" aria-label="Record into the active session"><span class="rec-btn__dot"></span>Record</a>
      </section>` : `<section class="card card--amber panel row row--between row--wrap"><div><span class="eyebrow eyebrow--amber">No active session</span><p class="serif mt-1" style="font-size:2rem">Ready when you are.</p></div><a class="btn btn--primary btn--lg" href="#/record">${icon('video')}Start a session</a></section>`}
      <div class="g g-4 mt-3">
        ${A.stat({ label: 'Needs review', value: nr.length, sub: 'AI drafts waiting', icon: 'scan-eye', href: '#/review' })}
        ${A.stat({ label: 'Unassigned inbox', value: un.length, sub: 'WhatsApp archive', icon: 'inbox', href: '#/inbox' })}
        ${A.stat({ label: 'Uploads', value: ups.filter((u) => u.state !== 'failed').length, sub: `${ups.filter((u) => u.state === 'failed').length} need attention`, icon: 'cloud-upload', href: '#/uploads' })}
        ${A.stat({ label: 'Shares in progress', value: sp.length, sub: 'prepared or awaiting your confirm', icon: 'send', href: '#/shares' })}
      </div>
      <div class="g g-2 mt-3">
        <div class="card">
          <div class="card__head"><span class="card__title">${icon('cloud-upload')}Upload queue</span><a class="link-arrow text-sm" href="#/uploads">All ${icon('arrow-right')}</a></div>
          <div class="mt-1" id="dash-ups">${ups.slice(0, 3).map((u) => UP.row(u)).join('') || '<p class="card__body muted text-sm">Nothing uploading.</p>'}</div>
        </div>
        <div class="card">
          <div class="card__head"><span class="card__title">${icon('scan-eye')}Review queue</span><a class="link-arrow text-sm" href="#/review">Open ${icon('arrow-right')}</a></div>
          <div class="list mt-1">${nr.slice(0, 4).map((m) => `<a class="list-row" href="#/review/${m.id}"><span class="list-row__thumb"><img src="${L.thumb(m.clip, 40)}" alt=""></span><span class="list-row__main"><span class="list-row__title">${esc(m.title)}</span><span class="list-row__meta">${H.dogNames(m)} · ${ago(m.created)}${H.ambiguous(m) ? ` · <span style="color:var(--ember-hi)">needs dog decision</span>` : ''}</span></span><span class="list-row__trail"><span class="mono text-xs faint">AI ${m.ai ? Math.round(m.ai.confidence * 100) : '—'}%</span>${icon('chevron-right', 'chev')}</span></a>`).join('') || `<div class="card__body">${A.empty({ icon: 'check-check', title: 'All clear', text: 'Every clip has been reviewed.' })}</div>`}</div>
        </div>
      </div>
      <div class="g g-3 mt-3">
        <div class="card">
          <div class="card__head"><span class="card__title">${icon('activity')}Sessions per week</span><span class="mono faint text-xs">LAST 7 WKS</span></div>
          <div class="card__body">${UI.barChart(L.stats.weekly, { labels: weeks, label: 'Sessions per week' })}<p class="faint text-xs mt-1">${st.sessionsThisMonth} sessions this month · ${st.activeHouseholds} active households</p></div>
        </div>
        <div class="card">
          <div class="card__head"><span class="card__title">${icon('film')}Stream minutes</span><span class="status-dot">Healthy</span></div>
          <div class="card__body" style="display:grid;gap:14px">
            <div class="row row--between"><div><span class="stat__label">Stored</span><div class="stat__value" style="font-size:2.2rem">${st.streamMinutesStored.toLocaleString()}</div></div><div class="right"><span class="stat__label" style="justify-content:flex-end">Delivered (30d)</span><div class="stat__value" style="font-size:2.2rem">${st.streamMinutesDelivered.toLocaleString()}</div></div></div>
            ${UI.sparkline([980, 1120, 1260, 1390, 1480, 1610, 1720, 1840], { h: 56 })}
            <p class="faint text-xs">≈ US$${(st.streamMinutesStored / 1000 * 5 + st.streamMinutesDelivered / 1000).toFixed(2)}/mo at published Stream rates</p>
          </div>
        </div>
        <div class="card">
          <div class="card__head"><span class="card__title">${icon('sparkles')}AI spend vs ceiling</span><span class="mono faint text-xs">OCT</span></div>
          <div class="card__body" style="display:grid;gap:16px">
            <div class="gauge"><div class="gauge__nums"><b>$${st.aiSpendMonth.toFixed(2)}</b><span>of $${st.aiCeiling} ceiling</span></div><div class="progress"><div class="progress__bar" style="--p:${(st.aiSpendMonth / st.aiCeiling) * 100}%"></div></div></div>
            <div class="row row--between text-sm"><span class="muted">Portal opens (7d)</span><b class="mono">${st.portalOpens7d}</b></div>
            ${UI.sparkline([3, 5, 4, 8, 6, 9, 6], { h: 40, color: '#9DB38E' })}
          </div>
        </div>
      </div>
      <div class="g g-2 mt-3">
        <div class="card">
          <div class="card__head"><span class="card__title">${icon('calendar-days')}Recent sessions</span><a class="link-arrow text-sm" href="#/sessions">All ${icon('arrow-right')}</a></div>
          <div class="list mt-1">${recent.map((x) => { const d = L.dog(x.dogs[0]); return `<a class="list-row" href="#/session/${x.id}">${A.dogAvatar(d)}<span class="list-row__main"><span class="list-row__title">${x.title}</span><span class="list-row__meta">${x.dogs.map((id) => L.dog(id).name).join(' & ')} · ${UI.fmtDay(x.date)}</span></span><span class="list-row__trail"><span class="badge badge--dotless">${x.media.length} clips</span>${icon('chevron-right', 'chev')}</span></a>`; }).join('')}</div>
        </div>
        <div class="card">
          <div class="card__head"><span class="card__title">${icon('send')}Prepared shares</span><a class="link-arrow text-sm" href="#/shares">History ${icon('arrow-right')}</a></div>
          <div class="list mt-1">${sp.map((x) => { const m = L.mediaItem(x.media[0]); return `<a class="list-row" href="#/shares?open=${x.id}"><span class="list-row__thumb"><img src="${L.thumb(m.clip, 40)}" alt=""></span><span class="list-row__main"><span class="list-row__title">${esc(m.title)}</span><span class="list-row__meta">${x.targets.map(targetName).join(', ')} · ${x.mode}</span></span><span class="list-row__trail">${A.badge(x.state)}</span></a>`; }).join('') || '<p class="card__body muted text-sm">No open shares.</p>'}</div>
        </div>
      </div>`,
      mount(root) {
        root.addEventListener('click', async (e) => {
          const c = e.target.closest('[data-ctx-session]');
          if (c) { const ss = L.session(c.dataset.ctxSession); Ctx.set({ household: ss.household, dog: ss.dogs[0], session: ss.id }); }
          const en = e.target.closest('[data-end]');
          if (en) endSession(en.dataset.end);
        });
      }
    };
  };
  const targetName = (t) => (L.household(t) || L.groups.find((g) => g.id === t) || L.user(t) || { name: t, title: t }).name || (L.groups.find((g) => g.id === t) || {}).title || t;
  async function endSession(id) {
    const s = L.session(id);
    if (!(await confirm({ title: 'End this session?', sub: `“${s.title}” will be marked completed. Uploads keep going in the background.`, ok: 'End session' }))) return;
    DB.patch('sessions', id, { status: 'completed' });
    const c = Ctx.get(); if (c && c.session === id) DB.kv('ctx', null);
    DB.audit('ended session', s.title);
    toast('Session completed. Add notes & homework any time.', { type: 'success', action: { label: 'Open', fn: () => R.go('#/session/' + id) } });
    R.render();
  }

  /* ---------- Record flow ---------- */
  views.record = (p) => {
    const step = p.query.get('step') || (Ctx.get() && !p.query.get('change') ? 'ready' : 'client');
    const hhId = p.query.get('hh');
    const c = Ctx.get();
    const lab = Ctx.label(c);
    const steps = ['Client', 'Dog', 'Session', 'Record'];
    const idx = { client: 0, dog: 1, session: 2, ready: 3 }[step];
    const nav = `<div class="steps-nav">${steps.map((s2, i) => `<span class="${i === idx ? 'is-on' : i < idx ? 'is-done' : ''}"><i>${i < idx ? '✓' : i + 1}</i>${s2}</span>`).join('')}</div>`;
    const recentUps = L.uploads.filter((u) => { const m = L.mediaItem(u.media); return m && c && m.session === c.session; }).slice(0, 4);
    let body = '';
    if (step === 'client') {
      const hhs = L.households.filter((h) => h.status === 'active');
      body = `<div class="input-icon mb-2">${icon('search')}<input class="input" id="rec-q" type="search" placeholder="Search client, household or dog" aria-label="Search clients" autofocus></div>
        <div class="g g-2" id="rec-list">${hhs.map((h) => `<a class="pick" href="#/record?step=dog&hh=${h.id}" data-q="${(h.name + ' ' + h.members.map((u) => L.user(u).name).join(' ') + ' ' + L.dogsFor(h.id).map((d) => d.name).join(' ')).toLowerCase()}"><div class="avatar-stack">${L.dogsFor(h.id).map((d) => A.dogAvatar(d)).join('')}</div><div class="pick__main"><b>${h.name}</b><small>${L.dogsFor(h.id).map((d) => d.name).join(', ')} · ${h.suburb}</small></div>${icon('chevron-right', 'chev')}</a>`).join('')}</div>`;
    } else if (step === 'dog') {
      const h = L.household(hhId);
      body = `<p class="muted mb-2">${h.name} · choose the dog in this clip</p><div class="g g-auto-sm">${L.dogsFor(h.id).map((d) => `<a class="pick-dog" href="#/record?step=session&hh=${h.id}&dog=${d.id}"><img src="${d.photo}" alt=""><div class="pick-dog__info"><b>${d.name}</b><small>${d.breed.toUpperCase()} · ${d.age.toUpperCase()}</small></div></a>`).join('')}</div>
        <p class="faint text-xs mt-2">${icon('info', 'chev')} The dog you pick here is authoritative — AI never changes it.</p>`;
    } else if (step === 'session') {
      const d = L.dog(p.query.get('dog'));
      const h = L.household(d.household);
      const open = L.sessions.filter((s) => s.household === h.id && s.dogs.includes(d.id) && s.status !== 'completed');
      body = `<p class="muted mb-2">${d.name} · ${h.name}</p>
        <div class="g">${open.map((s) => `<button class="pick" data-use-session="${s.id}"><span class="list-row__icon">${icon(s.status === 'active' ? 'radio' : 'calendar-clock')}</span><div class="pick__main"><b>${s.status === 'active' ? 'Continue: ' : 'Start scheduled: '}${s.title}</b><small>${UI.fmtDay(s.date)} · ${s.location}</small></div>${A.badge(s.status)}</button>`).join('')}
        <form class="card panel g" id="new-session"><span class="eyebrow eyebrow--amber">Or start a new session</span>
          <div class="g g-2"><div class="field"><label class="field__label" for="ns-title">Session focus</label><input class="input" id="ns-title" value="${L.technique(d.techniques[0]).name} practice"></div><div class="field"><label class="field__label" for="ns-loc">Location</label><input class="input" id="ns-loc" value="${h.suburb}"></div></div>
          <button class="btn btn--primary btn--lg" type="submit">${icon('play')}Start session & open camera</button></form></div>`;
    } else {
      body = `<div class="ctx-bar mb-3">${A.dogAvatar(lab.dog, 'avatar--lg')}<div class="ctx-bar__txt"><b>${lab.dog.name} · ${lab.hh.name}</b><small>${lab.session ? lab.session.title : 'No session'} — this context stays until you change it</small></div><a class="btn btn--sm btn--ghost" href="#/record?change=1">${icon('repeat')}Change</a></div>
        <div class="g g-2">
          <a class="card card--amber panel" href="#/camera" style="display:grid;justify-items:center;text-align:center;gap:14px;padding:40px 20px"><span class="rec-btn" style="pointer-events:none"><span class="rec-btn__dot"></span>Record</span><span class="serif" style="font-size:1.8rem">Open camera</span><span class="faint text-sm">Upload starts automatically when you stop.</span></a>
          <div class="card panel" style="display:grid;gap:12px;align-content:center">
            <span class="eyebrow">Already filmed it?</span>
            <p class="serif" style="font-size:1.8rem;line-height:1.05">Import from your phone’s library</p>
            <button class="btn" data-import>${icon('images')}Choose from library</button>
            <p class="faint text-xs">Also the fix for WhatsApp clips over 16 MB.</p>
          </div>
        </div>
        ${A.sectionTitle('This session’s <em>uploads</em>', `<a class="link-arrow text-sm" href="#/uploads">All uploads ${icon('arrow-right')}</a>`)}
        <div class="card">${recentUps.map((u) => UP.row(u)).join('') || `<div class="card__body">${A.empty({ icon: 'video', title: 'No clips yet', text: 'Record one — it’ll appear here with live upload progress.' })}</div>`}</div>
        <div class="callout callout--sky mt-2">${icon('smartphone')}<div><strong>Keep the app open while uploading.</strong> iOS can pause Safari in the background; uploads resume from where they stopped (tus) once you’re back.</div></div>`;
    }
    return {
      title: 'Record', crumbs: [{ label: 'Record' }, { label: steps[idx] }],
      html: `${A.pageHead({ eyebrow: 'Record', title: step === 'ready' ? 'Ready to <em>roll.</em>' : 'Who are we <em>filming?</em>', sub: step === 'ready' ? '' : 'Pick the client and dog first — every clip is attached to them automatically.' })}${nav}${body}`,
      mount(root) {
        const q = $('#rec-q', root);
        q && q.addEventListener('input', () => { const v = q.value.toLowerCase(); $$('#rec-list [data-q]', root).forEach((el) => (el.style.display = el.dataset.q.includes(v) ? '' : 'none')); });
        root.addEventListener('click', (e) => {
          const us = e.target.closest('[data-use-session]');
          if (us) { const s = L.session(us.dataset.useSession); if (s.status === 'scheduled') DB.patch('sessions', s.id, { status: 'active' }); Ctx.set({ household: s.household, dog: p.query.get('dog'), session: s.id }); R.go('#/camera'); }
          if (e.target.closest('[data-import]')) importFromLibrary();
        });
        const ns = $('#new-session', root);
        ns && ns.addEventListener('submit', (e) => {
          e.preventDefault();
          const d = L.dog(p.query.get('dog'));
          const s = DB.add('sessions', { id: 's-' + (200 + L.sessions.length), date: nowISO(), location: $('#ns-loc').value || '—', household: d.household, dogs: [d.id], status: 'active', title: $('#ns-title').value || 'Training session', notes: '', homework: [], media: [] });
          DB.audit('started session', `${s.title} → ${d.name}`);
          Ctx.set({ household: d.household, dog: d.id, session: s.id });
          R.go('#/camera');
        });
      }
    };
  };
  function importFromLibrary() {
    const c = Ctx.get();
    if (!c) { R.go('#/record?change=1'); return; }
    const d = L.dog(c.dog);
    const m = modal({ title: 'Recents', eyebrow: 'Photos (simulated)', sub: `Selected clips upload to ${d.name}’s session.`, size: 'wide',
      body: `<div class="g g-3">${[d.clip, 1494, 518, 3518, 1501, 1557].map((clip, i) => `<button class="mcard" data-lib="${clip}" style="padding:6px"><div class="mcard__thumb" style="aspect-ratio:9/12"><img src="${L.thumb(clip, [40, 65, 15, 90, 40, 65][i])}" alt=""><span class="mcard__dur">0:${pad(8 + i * 7)}</span></div></button>`).join('')}</div>` });
    m.root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-lib]'); if (!b) return;
      m.close();
      const { m: mm } = createRecording('pwa_library', 12 + Math.floor(Math.random() * 40));
      toast(`Uploading <b>${esc(mm.title)}</b> — private to you.`, { icon: 'cloud-upload' });
      R.go('#/record');
    });
  }

  /* ---------- Camera ---------- */
  views.camera = () => {
    const c = Ctx.get();
    if (!c) { setTimeout(() => R.go('#/record?change=1')); return { html: '' }; }
    const lab = Ctx.label(c);
    return {
      title: 'Camera',
      html: `<div class="camera" role="dialog" aria-label="Camera — simulated">
        <div class="camera__frame">
          <div class="camera__vf"><video autoplay muted playsinline loop src="/shared/media/vertical/${lab.dog.clip}.mp4"></video><div class="camera__grid"></div></div>
          <div class="camera__top"><a class="camera__btn" href="#/record" aria-label="Close camera">${icon('x')}</a><span class="camera__ctx">${A.dogAvatar(lab.dog, 'avatar--sm')}<span>${lab.dog.name} · ${lab.session ? lab.session.title : lab.hh.name}</span></span><button class="camera__btn" aria-label="Flash">${icon('zap')}</button></div>
          <div class="camera__timer" aria-live="polite"><span id="cam-t">00:00:00</span></div>
          <div></div>
          <p class="camera__hint">Simulated OS camera — on iPhone this is the system recorder</p>
          <div class="camera__bottom">
            <span class="camera__mode">VIDEO</span>
            <button class="camera__lib" data-cam-lib aria-label="Choose from library"><img src="${L.thumb(lab.dog.clip, 65)}" alt=""></button>
            <button class="shutter" id="shutter" aria-label="Start recording"><span></span></button>
            <button class="camera__btn camera__flip" aria-label="Flip camera">${icon('switch-camera')}</button>
          </div>
        </div>
      </div>`,
      mount(root) {
        const cam = $('.camera', root);
        let t = 0, iv = null, rec = false;
        const tEl = $('#cam-t', root);
        const shutter = $('#shutter', root);
        shutter.addEventListener('click', () => {
          if (!rec) {
            rec = true; cam.classList.add('is-rec'); shutter.setAttribute('aria-label', 'Stop recording');
            iv = setInterval(() => { t++; tEl.textContent = `00:${pad(Math.floor(t / 60))}:${pad(t % 60)}`; }, 1000);
          } else {
            rec = false; clearInterval(iv); cam.classList.remove('is-rec');
            $('video', root).pause();
            const sheet = document.createElement('div');
            sheet.className = 'camera__review';
            sheet.innerHTML = `<button data-retake>Retake</button><button class="use" data-use>Use Video</button>`;
            $('.camera__frame', root).appendChild(sheet);
            sheet.addEventListener('click', (e) => {
              if (e.target.closest('[data-retake]')) { sheet.remove(); t = 0; tEl.textContent = '00:00:00'; $('video', root).play(); }
              if (e.target.closest('[data-use]')) {
                const { m } = createRecording('pwa_camera', Math.max(t, 6) + 20);
                toast(`Uploading <b>${esc(m.title)}</b> — attached to ${lab.dog.name}. Private until you approve.`, { type: 'success', icon: 'cloud-upload', duration: 5000 });
                R.go('#/record');
              }
            });
          }
        });
        $('[data-cam-lib]', root).addEventListener('click', () => { R.go('#/record'); setTimeout(importFromLibrary, 200); });
        const esc2 = (e) => { if (e.key === 'Escape') R.go('#/record'); };
        document.addEventListener('keydown', esc2);
        return () => { clearInterval(iv); document.removeEventListener('keydown', esc2); };
      }
    };
  };

  /* ---------- Uploads ---------- */
  views.uploads = (p) => {
    const f = p.query.get('f') || 'all';
    const groups = { active: ['created', 'uploading', 'uploaded', 'processing'], failed: ['failed'], done: ['ready', 'cancelled'] };
    const list = L.uploads.slice().filter((u) => f === 'all' || groups[f].includes(u.state));
    const counts = Object.fromEntries(Object.keys(groups).map((k) => [k, L.uploads.filter((u) => groups[k].includes(u.state)).length]));
    return {
      title: 'Uploads', crumbs: [{ label: 'Today' }, { label: 'Uploads' }],
      html: `${A.pageHead({ eyebrow: 'Direct to Cloudflare Stream', title: 'Up<em>loads</em>', sub: 'Recordings stream straight from your phone using resumable tus uploads — the app server never touches the file.', actions: `<a class="btn btn--sm btn--primary" href="#/record">${icon('video')}Record</a>` })}
        <div class="hscroll mb-2">${[['all', 'All', L.uploads.length], ['active', 'In progress', counts.active], ['failed', 'Needs attention', counts.failed], ['done', 'Done', counts.done]].map(([k, l, n]) => `<a class="chip ${f === k ? 'is-active' : ''}" href="#/uploads?f=${k}">${l} <span class="chip__count">${n}</span></a>`).join('')}</div>
        <div class="card">${list.map((u) => UP.row(u)).join('') || `<div class="card__body">${A.empty({ icon: 'cloud', title: 'Nothing here', text: 'No uploads in this state.' })}</div>`}</div>
        <div class="g g-3 mt-3">
          <div class="card panel"><span class="eyebrow">States</span><div class="row row--wrap mt-2">${['created', 'uploading', 'uploaded', 'processing', 'ready', 'failed', 'cancelled'].map((s) => A.badge(s)).join('')}</div></div>
          <div class="card panel"><span class="eyebrow">Limits</span><p class="mt-1 text-sm muted">Max ${DB.kv('limits') ? DB.kv('limits').dur : 15} min · ${DB.kv('limits') ? DB.kv('limits').size : 1.5} GB per clip. Adjust in <a class="amber" href="#/settings">Settings</a>.</p></div>
          <div class="card panel"><span class="eyebrow">Privacy</span><p class="mt-1 text-sm muted">Every upload is created with signed URLs required and visibility <b style="color:var(--bone)">trainer_only</b>.</p></div>
        </div>`
    };
  };

  /* ---------- Review queue ---------- */
  views.review = (p) => {
    const f = p.query.get('f') || 'all';
    const all = H.needsReview();
    const flt = { all: () => true, ambiguous: (m) => H.ambiguous(m), low: (m) => m.ai && m.ai.confidence < 0.6, whatsapp: (m) => m.source === 'whatsapp_archive' };
    const list = all.filter(flt[f]);
    const proc = H.processing();
    return {
      title: 'Review queue', crumbs: [{ label: 'Today' }, { label: 'Review queue' }],
      html: `${A.pageHead({ eyebrow: 'AI drafts · you decide', title: 'Review <em>queue</em>', sub: 'Nothing is visible to clients until you approve it and choose an audience.' })}
        <div class="hscroll mb-3">${[['all', 'All'], ['ambiguous', 'Needs dog decision'], ['low', 'Low confidence'], ['whatsapp', 'From WhatsApp']].map(([k, l]) => `<a class="chip ${f === k ? 'is-active' : ''}" href="#/review?f=${k}">${l} <span class="chip__count">${all.filter(flt[k]).length}</span></a>`).join('')}</div>
        ${list.length ? `<div class="g g-auto">${list.map((m) => `<a class="card card--hover" href="#/review/${m.id}" style="overflow:hidden;display:flex;flex-direction:column">
            <div style="position:relative;aspect-ratio:16/9"><img src="${L.thumb(m.clip, 40)}" alt="" style="width:100%;height:100%;object-fit:cover"><span style="position:absolute;left:10px;top:10px" class="row">${A.badge('needs_review')}${m.source === 'whatsapp_archive' ? `<span class="badge badge--dotless" style="background:rgba(14,13,11,.7)">${icon('message-circle')}whatsapp</span>` : ''}</span><span class="mcard__dur">${m.duration}</span></div>
            <div class="panel" style="display:grid;gap:10px">
              <div class="row row--between"><b>${esc(m.title)}</b></div>
              <span class="faint text-sm">${H.dogNames(m)} · ${(L.session(m.session) || {}).title || 'no session'} · ${ago(m.created)}</span>
              ${m.ai ? `<div class="conf"><span class="text-sm">AI: “${esc(m.ai.title)}”</span><span class="conf__val">${Math.round(m.ai.confidence * 100)}%</span><div class="conf__bar" style="--c:${m.ai.confidence}"><span style="background:${m.ai.confidence < 0.6 ? 'var(--ember)' : 'var(--amber)'}"></span></div></div>` : ''}
              ${H.ambiguous(m) ? `<div class="grant-warn">${icon('triangle-alert')}Multiple dogs possible — confirm association</div>` : ''}
            </div></a>`).join('')}</div>` : A.empty({ icon: 'check-check', title: 'Queue clear', text: f === 'all' ? 'Every clip has been reviewed. Ka pai.' : 'Nothing matches this filter.' })}
        ${proc.length ? A.sectionTitle('Still <em>processing</em>') + `<div class="g g-auto">${proc.map((m) => A.mediaCard(m, { href: '#/review/' + m.id })).join('')}</div><p class="faint text-xs mt-1">AI drafts appear once Stream reports the video is ready. AI never blocks playback.</p>` : ''}`
    };
  };

  /* ---------- Review detail ---------- */
  views.reviewDetail = (p) => {
    const m = L.mediaItem(p.id);
    if (!m) return { html: A.empty({ icon: 'search-x', title: 'Clip not found' }) };
    const s = L.session(m.session);
    const hh = H.hhOfMedia(m);
    const queue = H.needsReview();
    const qi = queue.findIndex((x) => x.id === m.id);
    const ready = m.processing === 'ready';
    const dur = parseT(m.duration) || 30;
    const decisions = m.aiDecisions || {};
    const sessDogs = s ? s.dogs.map((d) => L.dog(d)) : m.dogs.map((d) => L.dog(d));
    const amb = H.ambiguous(m);
    if (!ready) {
      const u = L.uploads.find((x) => x.media === m.id);
      return { title: m.title, crumbs: [{ label: 'Review', href: '#/review' }, { label: m.title }], html: `${A.pageHead({ eyebrow: H.dogNames(m), title: esc(m.title) })}
        <div class="locked">${m.processing === 'failed' ? `<div class="locked__icon" style="color:var(--ember-hi);border-color:var(--ember)">${icon('triangle-alert')}</div><h2>Upload failed</h2><p>${esc(m.error || 'The upload was interrupted.')}</p>` : `<div class="locked__icon">${icon('loader-circle')}</div><h2>${A.label(m.processing)}…</h2><p>Stream is still working on this clip. The AI draft appears automatically when it’s ready — you can keep recording meanwhile.</p>`}
        ${u ? `<div class="card" style="width:min(560px,100%);text-align:left">${UP.row(u)}</div>` : ''}<a class="btn" href="#/review">Back to queue</a></div>` };
    }
    const ai = m.ai;
    const aiField = (key, labelTxt, valueHTML, cls = '') => `<div class="ai-field ${decisions[key] === 'ok' ? 'is-accepted' : decisions[key] === 'no' ? 'is-rejected' : ''}" data-field="${key}">
        <div class="ai-field__label"><span>${labelTxt}</span><span class="ai-field__acts"><button class="ai-mini ai-mini--ok ${decisions[key] === 'ok' ? 'is-on' : ''}" data-ai="ok" aria-label="Accept ${labelTxt}">${icon('check')}Accept</button><button class="ai-mini ai-mini--no ${decisions[key] === 'no' ? 'is-on' : ''}" data-ai="no" aria-label="Reject ${labelTxt}">${icon('x')}</button></span></div>
        <div class="ai-field__value ${cls}">${valueHTML}</div></div>`;
    const aiHTML = ai ? `
        <div class="ai-head"><span class="ai-orb">${icon('sparkles')}</span><div class="grow"><b>AI draft</b><div class="faint text-xs">${ai.model || 'vision-draft v1 (demo)'} · overall ${Math.round(ai.confidence * 100)}% confidence</div></div><button class="btn btn--sm" data-regen>${icon('refresh-cw')}Regenerate</button></div>
        <div id="ai-body">
          ${aiField('title', 'Suggested title', esc(ai.title), 'serif')}
          ${aiField('summary', 'Coaching summary', esc(ai.summary))}
          <div class="ai-field" data-field="tags"><div class="ai-field__label"><span>Technique tags</span><span class="faint" style="text-transform:none;letter-spacing:0">tap + to add</span></div>
            <div class="g" style="gap:8px">${ai.tags.map((tg) => { const t = L.technique(tg.id); const on = m.techniques.includes(tg.id); return `<div class="ai-tag" data-tech="${t.id}"><span class="row" style="--gap:8px"><span class="tag">${t.name}</span></span><span class="row" style="--gap:8px"><span class="conf__val">${Math.round(tg.c * 100)}%</span><button class="ai-mini ${on ? 'ai-mini--ok is-on' : ''}" data-add-tag="${t.id}" aria-pressed="${on}">${icon(on ? 'check' : 'plus')}</button></span><div class="conf__bar" style="--c:${tg.c}"><span></span></div></div>`; }).join('')}</div></div>
          ${ai.transcript ? aiField('transcript', 'Transcript', `<span class="transcript" style="font-size:1.1rem">${esc(ai.transcript)}</span>`) : `<div class="ai-field"><div class="ai-field__label"><span>Transcript</span></div><div class="callout callout--sky" style="font-size:.8125rem">${icon('mic-off')}<div>No speech detected — the AI says so rather than inventing a transcript.</div></div></div>`}
          <div class="ai-field"><div class="ai-field__label"><span>Evidence</span></div><ul class="ai-evidence">${(ai.evidence || []).map((e) => `<li>${icon(/ambiguous/i.test(e) ? 'triangle-alert' : 'quote')}<span>${esc(e)}</span></li>`).join('')}</ul></div>
          <div class="ai-field"><p class="faint text-xs">AI drafts only. It never publishes, grants access, changes dog identity or sends messages. Cost for this clip: $${(ai.cost || 0.03).toFixed(2)} · month $${L.stats.trainer.aiSpendMonth.toFixed(2)} of $${L.stats.trainer.aiCeiling}.</p></div>
        </div>` : `<div class="ai-head"><span class="ai-orb">${icon('sparkles')}</span><div class="grow"><b>AI draft</b><div class="faint text-xs">Not generated</div></div></div><div class="panel">${A.empty({ icon: 'sparkles', title: 'No AI draft', text: 'Generate one, or review manually.', action: `<button class="btn btn--sm btn--primary" data-regen>${icon('sparkles')}Generate draft</button>` })}</div>`;
    return {
      title: 'Review · ' + m.title,
      crumbs: [{ label: 'Review queue', href: '#/review' }, { label: m.title }],
      html: `
      <header class="page-head">
        <div><p class="eyebrow eyebrow--amber">${qi >= 0 ? `Review ${qi + 1} of ${queue.length}` : 'Media'} · ${A.label(m.source)}</p><h1 class="page-head__title" style="font-size:clamp(2rem,3.6vw,3.2rem)">${esc(m.title)}</h1>
        <div class="row row--wrap mt-1">${A.badge(m.editorial)}${A.badge(m.visibility === 'trainer_only' ? 'draft' : 'ready', m.visibility.replace('_', ' '))}<span class="faint text-sm">${H.dogNames(m)} · ${hh ? hh.name : ''} · ${UI.fmtDay(m.created)} ${UI.fmtTime(m.created)}</span>${m.parent ? `<span class="badge badge--dotless">${icon('scissors')}derived from ${m.parent}</span>` : ''}</div></div>
        <div class="page-head__actions">${qi > 0 ? `<a class="btn btn--sm btn--icon" href="#/review/${queue[qi - 1].id}" aria-label="Previous in queue">${icon('chevron-left')}</a>` : ''}${qi >= 0 && qi < queue.length - 1 ? `<a class="btn btn--sm btn--icon" href="#/review/${queue[qi + 1].id}" aria-label="Next in queue">${icon('chevron-right')}</a>` : ''}</div>
      </header>
      <div class="g g-main">
        <div class="g">
          <div id="rv-player"></div>
          <div class="card">
            <div class="card__head"><span class="card__title">${icon('scissors')}Trim</span><span class="faint text-xs">Creates a separate private clip · original kept</span></div>
            <div class="card__body trim">
              <div class="trim__strip" id="strip" aria-label="Filmstrip"><div class="trim__shade" id="sh-l"></div><div class="trim__shade" id="sh-r"></div><div class="trim__sel" id="sel"></div><div class="trim__playhead" id="ph"></div>
                <button class="trim__handle" id="h-in" role="slider" aria-label="Trim start" aria-valuemin="0" aria-valuemax="100"></button><button class="trim__handle" id="h-out" role="slider" aria-label="Trim end" aria-valuemin="0" aria-valuemax="100"></button></div>
              <div class="trim__times"><span>IN <b id="t-in">0:00</b></span><span>LENGTH <b id="t-len">0:00</b></span><span>OUT <b id="t-out">0:00</b></span></div>
              <div class="row row--wrap"><button class="btn btn--sm" data-trim-preview>${icon('play')}Preview trim</button><button class="btn btn--sm" data-trim-reset>${icon('rotate-ccw')}Reset</button><button class="btn btn--sm btn--primary" data-trim-create style="margin-left:auto">${icon('scissors')}Create derived clip</button></div>
            </div>
          </div>
          <div class="card">
            <div class="card__head"><span class="card__title">${icon('pencil')}Details</span></div>
            <div class="card__body g">
              <div class="field"><label class="field__label" for="f-title">Title</label><input class="input" id="f-title" value="${esc(m.title)}"></div>
              <div class="field"><label class="field__label" for="f-notes">Trainer notes <span class="faint">shown to the household when approved</span></label><textarea class="textarea" id="f-notes" placeholder="What should the owner notice?">${esc(m.notes || '')}</textarea></div>
              <div class="field"><span class="field__label">Timestamped notes <button class="btn btn--sm btn--ghost" data-ts-add type="button">${icon('plus')}Add at playhead</button></span><div id="ts-list"></div></div>
              <div class="field"><span class="field__label">Technique tags</span><div class="row row--wrap" id="tag-toggles">${L.techniques.map((t) => `<button class="tag tag-toggle" data-tech="${t.id}" data-toggle-tag="${t.id}" aria-pressed="${m.techniques.includes(t.id)}">${t.name}</button>`).join('')}</div></div>
            </div>
          </div>
          <div class="card">
            <div class="card__head"><span class="card__title">${icon('dog')}Dog & session</span>${m.dogsConfirmed ? A.badge('ready', 'confirmed by Linda') : ''}</div>
            <div class="card__body g">
              ${amb ? `<div class="callout callout--ember">${icon('triangle-alert')}<div><strong>More than one dog may be in this clip.</strong> Confirm which dogs it belongs to — AI never decides identity.</div></div>` : `<p class="faint text-sm">Selected before recording — this association is authoritative.</p>`}
              <div class="row row--wrap" id="dog-assoc">${(hh ? L.dogsFor(hh.id) : sessDogs).map((d) => `<label class="radio-card" style="padding:10px 14px;align-items:center"><input type="checkbox" value="${d.id}" ${m.dogs.includes(d.id) ? 'checked' : ''}>${A.dogAvatar(d, 'avatar--sm')}<span class="radio-card__title">${d.name}</span></label>`).join('')}</div>
              <div class="field"><label class="field__label" for="f-session">Session</label><select class="select" id="f-session">${L.sessions.filter((x) => !hh || x.household === hh.id).map((x) => `<option value="${x.id}" ${x.id === m.session ? 'selected' : ''}>${x.title} · ${UI.fmtDate(x.date)}</option>`).join('')}</select></div>
              ${amb ? `<button class="btn btn--sm btn--primary" data-confirm-dogs style="justify-self:start">${icon('check')}Confirm association</button>` : ''}
            </div>
          </div>
          <div class="card">
            <div class="card__head"><span class="card__title">${icon('image')}Cover thumbnail</span></div>
            <div class="card__body"><div class="covers">${[15, 40, 65, 90].map((k) => `<label class="cover-opt"><input type="radio" name="cover" value="${k}" ${(m.cover || 40) === k ? 'checked' : ''}><img src="${L.thumb(m.clip, k)}" alt="Cover at ${k}%"></label>`).join('')}</div></div>
          </div>
        </div>
        <aside class="card ai-panel sticky-col" id="ai-panel" style="overflow:hidden">${aiHTML}</aside>
      </div>
      <div class="review-actions">
        <span class="review-actions__info">${icon('lock')}Private · ${A.label(m.visibility)}</span>
        <button class="btn btn--ghost" data-archive>${icon('archive')}Archive</button>
        <button class="btn" data-save>${icon('save')}Save draft</button>
        <button class="btn btn--primary" data-approve>${icon('shield-check')}Approve & choose audience</button>
      </div>`,
      mount(root) {
        const pl = player($('#rv-player', root), { src: L.vid(m.clip), poster: L.img(m.clip, m.cover || 40), duration: m.duration, markers: m.timestamps, label: m.title, cursor: false });
        const v = pl.video;
        // --- timestamps editor
        let ts = (m.timestamps || []).map((x) => ({ ...x }));
        const drawTs = () => {
          $('#ts-list', root).innerHTML = ts.length ? ts.map((x, i) => `<div class="ts-edit"><button class="btn btn--sm mono" data-ts-seek="${i}" style="padding:0 8px">${x.t}</button><input class="input input--sm" data-ts-label="${i}" value="${esc(x.label)}" aria-label="Note at ${x.t}"><button class="btn btn--sm btn--icon btn--ghost" data-ts-del="${i}" aria-label="Remove">${icon('trash-2')}</button></div>`).join('') : '<p class="faint text-sm">No timestamped notes yet. Play the clip and add one at the playhead.</p>';
          icons();
        };
        drawTs();
        // --- trim
        const strip = $('#strip', root);
        let tin = 0.06, tout = 0.9;
        const setTrim = () => {
          tin = clamp(tin, 0, tout - 0.05); tout = clamp(tout, tin + 0.05, 1);
          $('#h-in', root).style.left = tin * 100 + '%'; $('#h-out', root).style.left = tout * 100 + '%';
          $('#sh-l', root).style.cssText = `left:0;width:${tin * 100}%`; $('#sh-r', root).style.cssText = `left:${tout * 100}%;right:0`;
          $('#sel', root).style.cssText = `left:${tin * 100}%;width:${(tout - tin) * 100}%`;
          $('#t-in', root).textContent = fmtT(tin * dur); $('#t-out', root).textContent = fmtT(tout * dur); $('#t-len', root).textContent = fmtT((tout - tin) * dur);
          $('#h-in', root).setAttribute('aria-valuenow', Math.round(tin * 100)); $('#h-out', root).setAttribute('aria-valuenow', Math.round(tout * 100));
        };
        setTrim();
        const thumbs = [15, 40, 65, 90];
        const N = window.innerWidth < 600 ? 6 : 10;
        const frag = Array.from({ length: N }, (_, i) => `<img src="${L.thumb(m.clip, thumbs[Math.floor((i / N) * 4)])}" alt="" draggable="false" data-fs="${i}">`).join('');
        strip.insertAdjacentHTML('afterbegin', frag);
        (async () => { // capture real frames
          const fv = document.createElement('video'); fv.muted = true; fv.preload = 'auto'; fv.src = L.vid(m.clip);
          await new Promise((r) => { fv.addEventListener('loadeddata', r, { once: true }); setTimeout(r, 4000); });
          if (!fv.duration) return;
          for (let i = 0; i < N; i++) {
            if (!strip.isConnected) return;
            fv.currentTime = ((i + 0.5) / N) * fv.duration;
            await new Promise((r) => { fv.addEventListener('seeked', r, { once: true }); setTimeout(r, 1200); });
            const cv = document.createElement('canvas'); cv.width = 160; cv.height = 90;
            try { cv.getContext('2d').drawImage(fv, 0, 0, 160, 90); const old = $(`[data-fs="${i}"]`, strip); old && old.replaceWith(cv); } catch (e) { return; }
          }
        })();
        const drag = (h, which) => {
          h.addEventListener('pointerdown', (e) => {
            e.preventDefault(); h.setPointerCapture(e.pointerId);
            const r = strip.getBoundingClientRect();
            const mv = (ev) => { const p2 = clamp((ev.clientX - r.left) / r.width, 0, 1); if (which === 'in') tin = p2; else tout = p2; setTrim(); v.currentTime = (which === 'in' ? tin : tout) * (v.duration || dur); };
            const up = () => { h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); };
            h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up);
          });
          h.addEventListener('keydown', (e) => { const d = e.key === 'ArrowRight' ? 0.01 : e.key === 'ArrowLeft' ? -0.01 : 0; if (d) { e.preventDefault(); if (which === 'in') tin += d; else tout += d; setTrim(); } });
        };
        drag($('#h-in', root), 'in'); drag($('#h-out', root), 'out');
        let previewing = false;
        v.addEventListener('timeupdate', () => {
          const p2 = v.currentTime / (v.duration || 1);
          $('#ph', root) && ($('#ph', root).style.left = p2 * 100 + '%');
          if (previewing && p2 >= tout) { v.currentTime = tin * v.duration; }
        });
        // --- AI decisions
        const dec = Object.assign({}, decisions);
        const saveDec = () => DB.patch('media', m.id, { aiDecisions: dec });
        root.addEventListener('click', async (e) => {
          const t = e.target;
          const aiBtn = t.closest('[data-ai]');
          if (aiBtn) {
            const fld = aiBtn.closest('[data-field]'); const key = fld.dataset.field; const val = aiBtn.dataset.ai;
            dec[key] = dec[key] === val ? undefined : val;
            fld.classList.toggle('is-accepted', dec[key] === 'ok'); fld.classList.toggle('is-rejected', dec[key] === 'no');
            $$('[data-ai]', fld).forEach((b) => b.classList.toggle('is-on', dec[key] === b.dataset.ai));
            if (dec[key] === 'ok') {
              if (key === 'title') { $('#f-title', root).value = ai.title; flash($('#f-title', root)); }
              if (key === 'summary') { const n = $('#f-notes', root); n.value = n.value ? n.value + '\n' + ai.summary : ai.summary; flash(n); }
              if (key === 'transcript') toast('Transcript accepted — shown to the household with the video.', { type: 'success' });
            }
            saveDec(); return;
          }
          const at = t.closest('[data-add-tag]');
          if (at) { toggleTag(at.dataset.addTag); return; }
          const tt = t.closest('[data-toggle-tag]');
          if (tt) { toggleTag(tt.dataset.toggleTag); return; }
          if (t.closest('[data-regen]')) { regen(); return; }
          if (t.closest('[data-ts-add]')) { const cur = pl.toNominal(v.currentTime || 0); ts.push({ t: fmtT(cur), label: 'New note' }); ts.sort((a, b) => parseT(a.t) - parseT(b.t)); drawTs(); const inp = $$('[data-ts-label]', root).find((x) => x.value === 'New note'); inp && (inp.focus(), inp.select()); return; }
          const sk = t.closest('[data-ts-seek]'); if (sk) { pl.seek(parseT(ts[+sk.dataset.tsSeek].t)); return; }
          const dl = t.closest('[data-ts-del]'); if (dl) { ts.splice(+dl.dataset.tsDel, 1); drawTs(); return; }
          if (t.closest('[data-trim-preview]')) { previewing = true; v.currentTime = tin * (v.duration || dur); v.play(); toast('Previewing trim (loops in → out)', { icon: 'scissors', duration: 2000 }); return; }
          if (t.closest('[data-trim-reset]')) { tin = 0.06; tout = 0.9; previewing = false; setTrim(); return; }
          if (t.closest('[data-trim-create]')) { createClip(); return; }
          if (t.closest('[data-confirm-dogs]')) { const ids = $$('#dog-assoc input:checked', root).map((x) => x.value); if (!ids.length) { toast('Pick at least one dog.', { type: 'error' }); return; } DB.patch('media', m.id, { dogs: ids, dogsConfirmed: true }); DB.audit('confirmed dog association', `${m.title} → ${ids.map((i) => L.dog(i).name).join(' & ')}`); toast('Association confirmed by you.', { type: 'success' }); R.render(); return; }
          if (t.closest('[data-save]')) { save(); toast('Draft saved — still private.', { type: 'success', icon: 'save' }); return; }
          if (t.closest('[data-archive]')) { if (await confirm({ title: 'Archive this clip?', sub: 'It leaves the queue and stays trainer-only. You can restore it from the media library.', ok: 'Archive' })) { save(); DB.patch('media', m.id, { editorial: 'archived' }); DB.audit('archived media', m.title); toast('Archived.', { icon: 'archive' }); next(); } return; }
          if (t.closest('[data-approve]')) { save(); approveModal(m, next); }
        });
        root.addEventListener('input', (e) => { const li = e.target.dataset.tsLabel; if (li != null) ts[+li].label = e.target.value; });
        root.addEventListener('change', (e) => {
          if (e.target.name === 'cover') { DB.patch('media', m.id, { cover: +e.target.value }); pl.video.poster = L.img(m.clip, +e.target.value); toast('Cover updated', { type: 'success', duration: 1600 }); }
          if (e.target.closest('#dog-assoc') && !amb) { const ids = $$('#dog-assoc input:checked', root).map((x) => x.value); if (ids.length) DB.patch('media', m.id, { dogs: ids, dogsConfirmed: true }); }
        });
        function flash(el) { el.animate([{ boxShadow: '0 0 0 3px rgba(157,179,142,.6)' }, { boxShadow: '0 0 0 0 transparent' }], { duration: 900 }); }
        function toggleTag(id) {
          const list = m.techniques.includes(id) ? m.techniques.filter((x) => x !== id) : m.techniques.concat(id);
          DB.patch('media', m.id, { techniques: list });
          $$(`[data-toggle-tag="${id}"]`, root).forEach((b) => b.setAttribute('aria-pressed', list.includes(id)));
          $$(`[data-add-tag="${id}"]`, root).forEach((b) => { const on = list.includes(id); b.classList.toggle('ai-mini--ok', on); b.classList.toggle('is-on', on); b.innerHTML = icon(on ? 'check' : 'plus'); });
          icons();
        }
        function save() {
          DB.patch('media', m.id, { title: $('#f-title', root).value.trim() || m.title, notes: $('#f-notes', root).value.trim(), timestamps: ts.filter((x) => x.label.trim()), session: $('#f-session', root).value });
        }
        async function regen() {
          const panel = $('#ai-panel', root);
          panel.innerHTML = `<div class="ai-head"><span class="ai-orb">${icon('sparkles')}</span><div class="grow"><b class="shimmer-text">Analysing frames & audio…</b><div class="faint text-xs">Sampling 24 frames · transcribing</div></div></div><div class="ai-skel">${'<div class="skeleton" style="height:16px;width:40%"></div><div class="skeleton" style="height:34px"></div><div class="skeleton" style="height:14px;width:90%"></div><div class="skeleton" style="height:14px;width:75%"></div>'.repeat(3)}</div>`;
          icons();
          await sleep(1800);
          if (!panel.isConnected) return;
          const n = (m.aiVariant || 0) + 1;
          DB.patch('media', m.id, { ai: genAI(m, n), aiVariant: n, aiDecisions: {} });
          DB.audit('regenerated AI draft', m.title);
          L.stats.trainer.aiSpendMonth += 0.04;
          toast('New AI draft ready.', { icon: 'sparkles' });
          R.render();
        }
        async function createClip() {
          const len = Math.max(1, Math.round((tout - tin) * dur));
          const nm = DB.add('media', { id: 'm-' + (3000 + Math.floor(Math.random() * 6000)), clip: m.clip, title: `${m.title} (trim)`, dogs: m.dogs.slice(), session: m.session, source: 'derived_clip', parent: m.id, processing: 'processing', editorial: 'draft', duration: fmtT(len), created: nowISO(), techniques: m.techniques.slice(), visibility: 'trainer_only', views: 0, notes: m.notes, timestamps: [], ai: m.ai, trim: [fmtT(tin * dur), fmtT(tout * dur)] });
          DB.audit('created derived clip', `${nm.title} (${fmtT(tin * dur)}–${fmtT(tout * dur)})`);
          toast(`Derived clip <b>${fmtT(tin * dur)}–${fmtT(tout * dur)}</b> sent to Stream. It stays private and appears in the queue when processed.`, { icon: 'scissors', duration: 5200 });
          setTimeout(() => { DB.patch('media', nm.id, { processing: 'ready', editorial: 'needs_review' }); updateCounts(); }, 3500);
        }
        function next() {
          const q = H.needsReview().filter((x) => x.id !== m.id);
          R.go(q.length ? '#/review/' + q[0].id : '#/review');
        }
        return () => { pl.pause(); };
      }
    };
  };

  /* ---------- Approve & choose audience ---------- */
  function approveModal(m, after) {
    const hh = H.hhOfMedia(m);
    const grps = L.groups.filter((g) => hh && g.members.includes(hh.id));
    const consents = L.consents.filter((c) => c.status === 'active' && hh && hh.members.some((uid2) => c.subject.startsWith((L.user(uid2) || {}).name)) && /public/i.test(c.kind));
    const ambig = H.ambiguous(m);
    const md = modal({
      title: 'Approve & choose audience', eyebrow: esc(m.title), size: 'wide',
      sub: 'Approval is a separate, audited step. Pick the narrowest audience that makes sense.',
      body: `${ambig ? `<div class="callout callout--ember mb-2">${icon('triangle-alert')}<div><strong>Dog association not confirmed.</strong> Confirm which dogs appear before sharing beyond yourself.</div></div>` : ''}
        <div class="g" id="aud">
          <label class="radio-card"><input type="radio" name="aud" value="trainer_only"><span class="radio-card__dot"></span><span><span class="radio-card__title">${icon('lock')}Trainer only</span><span class="radio-card__desc">Approved but private to you — useful for your own records.</span></span></label>
          <label class="radio-card ${ambig ? 'is-disabled' : ''}"><input type="radio" name="aud" value="household" ${ambig ? 'disabled' : 'checked'}><span class="radio-card__dot"></span><span><span class="radio-card__title">${icon('house')}${hh ? hh.name : 'Household'}</span><span class="radio-card__desc">${hh ? hh.members.map((u) => L.user(u)).filter(Boolean).map((u) => `${u.name.split(' ')[0]}${u.invite !== 'accepted' ? ` (${u.invite})` : ''}`).join(', ') : ''} — appears in their portal timeline.</span></span></label>
          <label class="radio-card ${ambig || !grps.length ? 'is-disabled' : ''}"><input type="radio" name="aud" value="group" ${ambig || !grps.length ? 'disabled' : ''}><span class="radio-card__dot"></span><span class="grow"><span class="radio-card__title">${icon('users')}Training group</span><span class="radio-card__desc">${grps.length ? 'Every household in the group gets access.' : 'This household isn’t in a training group.'}</span>${grps.length ? `<select class="select select--sm mt-1" id="grp" style="max-width:320px">${grps.map((g) => `<option value="${g.id}">${g.title} · ${g.members.length} households</option>`).join('')}</select>` : ''}</span></label>
          <label class="radio-card ${ambig ? 'is-disabled' : ''}"><input type="radio" name="aud" value="public" ${ambig ? 'disabled' : ''}><span class="radio-card__dot"></span><span class="grow"><span class="radio-card__title">${icon('globe')}Public — website & guides</span><span class="radio-card__desc">Requires recorded consent from identifiable people.</span>
            <div id="consent-check" class="mt-1" hidden>${consents.length ? `<div class="grant-ok">${icon('file-check')}<span>Consent on file: <b>${consents[0].subject}</b> — ${consents[0].kind} (${UI.fmtDate(consents[0].date)})</span></div><label class="check check--nostrike mt-1"><input type="checkbox" id="consent-ok"><span class="check__box"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span class="check__text text-sm">I’ve checked this clip is within the consent’s scope (no other identifiable people)</span></label>` : `<div class="grant-warn">${icon('ban')}<span>No active public-use consent for ${hh ? hh.name : 'this household'}. Record consent first.</span><a class="btn btn--sm" href="#/consent?new=1" data-close>Record consent</a></div>`}</div></span></label>
        </div>`,
      foot: `<button class="btn btn--ghost" data-close>Cancel</button><button class="btn btn--primary" data-go>${icon('shield-check')}Approve</button>`
    });
    const syncConsent = () => { const v = ($('input[name="aud"]:checked', md.root) || {}).value; $('#consent-check', md.root).hidden = v !== 'public'; };
    md.root.addEventListener('change', syncConsent);
    syncConsent();
    $('[data-go]', md.root).addEventListener('click', async (e) => {
      const v = ($('input[name="aud"]:checked', md.root) || {}).value;
      if (!v) { toast('Choose an audience.', { type: 'error' }); return; }
      if (v === 'public' && (!consents.length || !($('#consent-ok', md.root) || {}).checked)) { toast('Public needs a recorded consent and your confirmation.', { type: 'error' }); return; }
      e.currentTarget.classList.add('is-loading');
      await sleep(700);
      const map = { trainer_only: ['approved_private', 'trainer_only'], household: ['approved_shared', 'household'], group: ['approved_shared', 'group'], public: ['published_public', 'public'] };
      const [ed, vis] = map[v];
      const patch = { editorial: ed, visibility: vis };
      if (v === 'group') patch.group = $('#grp', md.root).value;
      DB.patch('media', m.id, patch);
      const who = v === 'household' ? hh.name : v === 'group' ? L.groups.find((g) => g.id === patch.group).title : v === 'public' ? 'public website' : 'trainer only';
      DB.audit('approved & granted', `${m.title} → ${who}`);
      md.close();
      updateCounts();
      toast(`Approved for <b>${esc(who)}</b>.${v === 'household' || v === 'group' ? ' It’s now in their portal.' : ''}`, { type: 'success', action: v !== 'trainer_only' ? { label: 'Share', fn: () => R.go('#/share?media=' + m.id) } : null, duration: 6000 });
      after && after();
    });
  }

  /* ---------- More (mobile) ---------- */
  views.more = () => ({
    title: 'More', crumbs: [{ label: 'More' }],
    html: `${A.pageHead({ eyebrow: 'Workspace', title: 'Every<em>thing</em>' })}
      <div class="more-grid">${nav.flatMap((g) => g.items).map((it) => `<a href="${it.href}">${icon(it.icon)}${it.label}</a>`).join('')}<a href="/v1/portal/index.html">${icon('eye')}Client portal</a><a href="/v1/index.html">${icon('globe')}Public site</a></div>
      <button class="btn btn--block mt-3" data-palette>${icon('search')}Search everything</button>`
  });

  window.Admin = { views, H, Ctx, UP, genAI, nowISO, updateCounts, targetName, endSession, approveModal, importFromLibrary, get R() { return R; } };
  let R;
  window.Admin.boot = (extraRoutes) => {
    R = A.router({
      appName: 'Linda’s workspace',
      fallback: '/dashboard',
      routes: [
        { path: '/dashboard', nav: 'dashboard', view: views.dashboard },
        { path: '/record', nav: 'record', view: views.record },
        { path: '/camera', nav: 'record', view: views.camera },
        { path: '/uploads', nav: 'uploads', view: views.uploads },
        { path: '/review', nav: 'review', view: views.review },
        { path: '/review/:id', nav: 'review', back: '#/review', view: views.reviewDetail },
        { path: '/more', nav: 'more', view: views.more },
        ...extraRoutes
      ],
      onChange: () => updateCounts()
    });
    R.render();
    updateCounts();
    // resume any in-flight uploads so the demo feels alive
    L.uploads.filter((u) => u.state === 'uploading' && !u.paused).forEach((u) => setTimeout(() => UP.start(u.id), 1200));
    L.uploads.filter((u) => u.state === 'created').forEach((u) => setTimeout(() => UP.start(u.id), 800));
    L.uploads.filter((u) => ['uploaded', 'processing'].includes(u.state) && L.mediaItem(u.media) && L.mediaItem(u.media).processing !== 'ready' && u.fresh).forEach((u) => { u.progress = 1; UP.complete(u.id); });
  };
})();
