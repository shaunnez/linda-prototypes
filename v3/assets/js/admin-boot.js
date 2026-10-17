/* ==========================================================================
   V3 · admin-boot — trainer workspace shell config (nav, tabs, ⌘K, keys)
   ========================================================================== */
(function () {
  'use strict';
  const V3 = window.V3;
  const { esc, icon } = V3;
  const db = V3.db;
  const A = V3.A;
  const go = (h) => () => V3.app.go(h);

  const ctx = () => {
    const act = A.activeSession();
    const c = db.context || {};
    const s = act || V3.session(c.session);
    const dogs = s ? s.dogs : [];
    const d = V3.dog(dogs[0]);
    return `${d ? `<span class="avatar" style="--s:32px"><img src="${esc(d.avatar)}" alt=""></span>` : `<span class="avatar" style="--s:32px">${icon('circle-dot')}</span>`}<div><b>${s ? esc(A.dogNames(dogs)) : 'No context'}</b><small>${s ? `${s.status === 'active' ? '● Active · ' : ''}${esc(V3.household(s.household).name)}` : 'Pick a dog to record'}</small></div>${icon('chevron-right')}`;
  };

  V3.App({
    product: 'Trainer',
    titleSuffix: 'Linda · Trainer',
    defaultRoute: 'dashboard',
    user: { name: 'Linda', sub: 'Trainer · admin', initials: 'LI' },
    ctx,
    onCtx: () => V3.app.go(A.activeSession() ? '#/record/camera' : '#/record'),
    sideTop: () => `<div class="side__record"><a class="btn btn--accent btn--block btn--sm" href="#/record" title="Record (R)"><span class="rec-dot" style="background:#FF3B30;animation:none;box-shadow:0 0 0 2px var(--graphite)"></span><span class="txt">Record</span><span class="kbd txt" style="margin-left:auto;background:rgba(17,18,20,.08);border-color:rgba(17,18,20,.15);color:var(--graphite)">R</span></a></div>`,
    topStatus: A.topStatus,
    nav: [
      { group: 'Workspace', items: [
        { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', short: 'G D' },
        { id: 'review', label: 'Review queue', icon: 'film', short: 'G R', count: () => A.reviewQueue().length, hot: true },
        { id: 'uploads', label: 'Uploads', icon: 'cloud-upload', short: 'G U', count: () => A.activeUploads().length + db.uploads.filter((u) => u.state === 'failed').length },
        { id: 'inbox', label: 'WhatsApp inbox', icon: 'inbox', short: 'G I', count: () => A.unassigned() }
      ] },
      { group: 'Clients', items: [
        { id: 'clients', label: 'Households', icon: 'users', short: 'G C' },
        { id: 'sessions', label: 'Sessions', icon: 'calendar-days', short: 'G E' },
        { id: 'groups', label: 'Training groups', icon: 'users-round', short: 'G G' }
      ] },
      { group: 'Media & sharing', items: [
        { id: 'media', label: 'Media library', icon: 'clapperboard', short: 'G M' },
        { id: 'share', label: 'Share composer', icon: 'send', short: 'G S' },
        { id: 'shares', label: 'Share history', icon: 'history', count: () => A.preparedShares() }
      ] },
      { group: 'Content', items: [
        { id: 'academy', label: 'Academy CMS', icon: 'book-open-text', short: 'G A' },
        { id: 'techniques', label: 'Techniques', icon: 'tags', short: 'G T' }
      ] },
      { group: 'Governance', items: [
        { id: 'consent', label: 'Consent', icon: 'file-check' },
        { id: 'audit', label: 'Audit log', icon: 'scroll-text', short: 'G L' },
        { id: 'settings', label: 'Settings', icon: 'settings', short: 'G ,' }
      ] }
    ],
    tabs: [
      { id: 'dashboard', label: 'Home', icon: 'house' },
      { id: 'review', label: 'Review', icon: 'film', count: () => A.reviewQueue().length },
      { id: 'record', label: 'Record', record: true },
      { id: 'inbox', label: 'Inbox', icon: 'inbox', count: () => A.unassigned() },
      { id: 'more', label: 'More', icon: 'menu' }
    ],
    routes: A.routes,
    palette: () => {
      const out = [{ group: 'Actions', label: 'Record a video', icon: 'circle-dot', hint: 'R', run: go('#/record'), keywords: 'camera new session' },
        { group: 'Actions', label: 'New share', icon: 'send', run: go('#/share'), keywords: 'whatsapp link' },
        { group: 'Actions', label: 'Add household', icon: 'user-plus', run: go('#/clients?new=1') },
        { group: 'Actions', label: 'Record consent', icon: 'file-check', run: () => A.consentModal() }];
      db.dogs.forEach((d) => out.push({ group: 'Dogs', label: d.name, sub: `${d.breed} · ${V3.household(d.household).name}`, img: d.avatar, href: '#/dog/' + d.id }));
      db.households.forEach((h) => out.push({ group: 'Households', label: h.name, sub: h.suburb, icon: 'house', href: '#/household/' + h.id, keywords: V3.membersOf(h.id).map((u) => u.name).join(' ') }));
      db.users.filter((u) => u.role === 'client').forEach((u) => out.push({ group: 'People', label: u.name, sub: u.email, icon: 'user-round', href: '#/household/' + u.household }));
      db.media.forEach((m) => out.push({ group: 'Media', label: m.title, sub: `${A.dogNames(m.dogs)} · ${V3.label.editorial[m.editorial]}`, img: V3.thumb(m.clip), href: '#/review/' + m.id, keywords: m.id }));
      db.sessions.forEach((s) => out.push({ group: 'Sessions', label: s.title, sub: V3.fmtDate(s.date), icon: 'calendar', href: '#/session/' + s.id }));
      db.guides.forEach((g) => out.push({ group: 'Guides', label: g.title, sub: g.status, icon: 'book-open', href: '#/academy/' + g.id }));
      return out;
    },
    shortcuts: [
      { keys: 'R', label: 'Record', run: go('#/record') },
      { keys: 'G D', label: 'Go to Dashboard', run: go('#/dashboard') },
      { keys: 'G R', label: 'Go to Review queue', run: go('#/review') },
      { keys: 'G U', label: 'Go to Uploads', run: go('#/uploads') },
      { keys: 'G I', label: 'Go to WhatsApp inbox', run: go('#/inbox') },
      { keys: 'G C', label: 'Go to Households', run: go('#/clients') },
      { keys: 'G E', label: 'Go to Sessions', run: go('#/sessions') },
      { keys: 'G M', label: 'Go to Media library', run: go('#/media') },
      { keys: 'G S', label: 'Go to Share composer', run: go('#/share') },
      { keys: 'G G', label: 'Go to Groups', run: go('#/groups') },
      { keys: 'G A', label: 'Go to Academy CMS', run: go('#/academy') },
      { keys: 'G T', label: 'Go to Techniques', run: go('#/techniques') },
      { keys: 'G L', label: 'Go to Audit log', run: go('#/audit') },
      { keys: 'G ,', label: 'Go to Settings', run: go('#/settings') }
    ]
  });
})();
