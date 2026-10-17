/* ==========================================================================
   V3 · admin-core — shared state, helpers and the simulated upload engine
   ========================================================================== */
(function () {
  'use strict';
  const V3 = window.V3;
  const { $, $$, esc, icon } = V3;
  const db = V3.db;
  const A = (V3.A = { routes: {} });

  /* Counts --------------------------------------------------------------- */
  A.reviewQueue = () => db.media.filter((m) => m.editorial === 'needs_review' || (m.editorial === 'draft' && ['ready', 'processing', 'uploaded'].includes(m.processing))).sort((a, b) => b.created.localeCompare(a.created));
  A.needsReview = () => db.media.filter((m) => m.editorial === 'needs_review').length;
  A.unassigned = () => db.inbox.filter((i) => i.state === 'unassigned').length;
  A.activeUploads = () => db.uploads.filter((u) => ['created', 'uploading', 'uploaded', 'processing'].includes(u.state));
  A.preparedShares = () => db.shares.filter((s) => s.state === 'prepared' || s.state === 'handoff_opened').length;
  A.activeSession = () => db.sessions.find((s) => s.status === 'active');

  /* Snippets ------------------------------------------------------------- */
  A.dogNames = (ids) => ids.map((d) => (V3.dog(d) || {}).name).filter(Boolean).join(' & ');
  A.dogAvatars = (ids, s = 26) => `<span class="avatar-stack">${ids.map((d) => { const x = V3.dog(d); return x ? `<span class="avatar" style="--s:${s}px" title="${esc(x.name)}"><img src="${esc(x.avatar)}" alt=""></span>` : ''; }).join('')}</span>`;
  A.techTags = (ids) => ids.map((t) => { const T = V3.technique(t); return T ? `<span class="tag" style="--c:${T.color}">${esc(T.name)}</span>` : ''; }).join('');
  A.visIcon = { trainer_only: 'lock', household: 'house', group: 'users', public: 'globe' };
  A.edState = (m) => V3.state(m.editorial, V3.label.editorial[m.editorial]);
  A.prState = (m) => V3.state(m.processing, V3.label.processing[m.processing]);
  A.mediaCard = (m, href) => {
    const ov = m.processing !== 'ready' ? `<div class="mcard__overlay">${m.processing === 'failed' ? icon('triangle-alert') : `<span class="ring" style="--s:34px;--v:${m.progress || 0.15}"><svg viewBox="0 0 36 36"><circle class="ring__bg" cx="18" cy="18" r="15.9155" style="stroke:rgba(255,255,255,.25)"/><circle class="ring__fg" cx="18" cy="18" r="15.9155" pathLength="100" style="stroke:#fff"/></svg></span>`}<span class="mono" style="font-size:10px">${esc(V3.label.processing[m.processing])}</span></div>` : '';
    return `<a class="mcard" href="${href || `#/review/${m.id}`}" data-hover-video>
      <div class="mcard__thumb"><img src="${V3.thumb(m.clip, m.cover || 40)}" alt="" loading="lazy">${m.processing === 'ready' ? `<video muted playsinline loop preload="none" data-src="${V3.vid(m.clip)}" data-hoverplay></video>` : ''}
        <span class="mcard__vis">${icon(A.visIcon[m.visibility] || 'lock')}${esc(V3.label.visibility[m.visibility] || 'Trainer only')}</span>${m.duration && m.duration !== '—' ? `<span class="mcard__dur">${esc(m.duration)}</span>` : ''}${ov}</div>
      <div><div class="mcard__title">${esc(m.title)}</div>
      <div class="mcard__meta" style="margin-top:4px">${A.edState(m)}<span>${esc(A.dogNames(m.dogs))}</span><span class="sep"></span><span>${V3.fmtDate(m.created)}</span>${m.parent ? '<span class="sep"></span><span>Derived clip</span>' : ''}</div></div>
      <i class="xmark xmark--tl"></i><i class="xmark xmark--tr"></i>
    </a>`;
  };
  A.vh = (meta, title, sub, actions = '') => `<div class="vh"><div>${meta ? `<div class="vh__meta mono">${meta}</div>` : ''}<h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${actions ? `<div class="vh__actions">${actions}</div>` : ''}</div>`;
  A.empty = (ic, h, p, extra = '') => `<div class="empty"><span class="empty__ico">${icon(ic)}</span><h3>${h}</h3><p>${p}</p>${extra}</div>`;
  A.greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Mōrena' : h < 18 ? 'Kia ora' : 'Pō marie'; };

  /* Media factory --------------------------------------------------------- */
  A.newMediaId = () => { let n; do { n = 'm-' + (1013 + Math.floor(Math.random() * 8000)); } while (V3.media(n)); return n; };
  A.createMedia = ({ dogs, session, clip, title, source = 'pwa_camera', processing = 'uploading', duration }) => {
    const m = {
      id: A.newMediaId(), clip, title: title || `${A.dogNames(dogs)} · ${V3.fmtTime(new Date().toISOString())}`, dogs, session, source, processing, editorial: 'draft',
      duration: duration || `0:${String(20 + Math.floor(Math.random() * 35)).padStart(2, '0')}`, created: V3.nowISO(), techniques: [], visibility: 'trainer_only', views: 0, notes: '', timestamps: [], ai: null, parent: null, cover: 40, progress: 0
    };
    db.media.unshift(m);
    const s = V3.session(session); if (s && !s.media.includes(m.id)) s.media.push(m.id);
    return m;
  };
  A.genAI = (m, variant = 0) => {
    const d = V3.dog(m.dogs[0]) || {};
    const techs = (d.techniques || ['t-focus']).slice(0, 3);
    const T0 = V3.technique(techs[0]) || { name: 'Training' };
    const multi = m.dogs.length > 1 || ((V3.session(m.session) || {}).dogs || []).length > 1;
    const titles = [`${T0.name} practice — ${d.name || 'session'}`, `${d.name || 'Dog'}: ${T0.name.toLowerCase()} rep`, `${T0.name} with mild distraction`];
    const hasSpeech = (m.id.charCodeAt(m.id.length - 1) + variant) % 3 !== 0;
    m.ai = {
      model: 'vision-draft-2 · v' + (3 + variant), title: titles[variant % titles.length],
      summary: hasSpeech ? `Handler cues ${d.name || 'the dog'} and marks the response. ${T0.name} looks like the main focus; reward placement is close to the handler.` : `Dog is visible for most of the clip. No audible cues — summary based on sampled frames only.`,
      confidence: +(0.62 + Math.random() * 0.3).toFixed(2),
      tags: techs.map((t, i) => ({ id: t, c: +(Math.max(0.3, 0.92 - i * 0.24 - Math.random() * 0.1)).toFixed(2) })),
      transcript: hasSpeech ? `“${d.name || 'Pup'}…” … “Yes! Good.” … “Again — nice and easy.”` : null,
      evidence: (hasSpeech ? [`Transcript 0:03 — “${d.name || 'Pup'}…”`] : ['No speech detected — transcript unavailable']).concat([`Frames 0:05–0:18 sampled (8 frames)`]).concat(multi ? ['Ambiguous: more than one dog in session — confirm associations'] : []),
      cost: +(0.08 + Math.random() * 0.1).toFixed(2)
    };
    db.stats.trainer.aiSpendMonth = +(db.stats.trainer.aiSpendMonth + m.ai.cost).toFixed(2);
    return m.ai;
  };

  /* Upload engine (simulated tus) ---------------------------------------- */
  const sizeMB = (u) => parseFloat(u.size) || 100;
  A.startUpload = (m, { failOnce = false, file } = {}) => {
    const mb = Math.round(80 + Math.random() * 240);
    const u = { id: V3.uid('up'), media: m.id, file: file || `IMG_${4823 + Math.floor(Math.random() * 90)}.MOV`, size: `${mb} MB`, state: 'created', progress: 0, speed: '—', eta: '—', protocol: 'tus', failOnce, created: V3.nowISO() };
    db.uploads.unshift(u);
    m.processing = 'uploading';
    V3.audit('upload started', `${u.file} → ${A.dogNames(m.dogs)}`, 'Linda');
    V3.save();
    setTimeout(() => { if (u.state === 'created') { u.state = 'uploading'; A.changed(true); } }, 500);
    A.changed(true);
    return u;
  };
  A.finishProcessing = (u) => {
    const m = V3.media(u.media);
    u.state = 'processing'; if (m) m.processing = 'processing';
    A.changed(true);
    setTimeout(() => {
      u.state = 'ready'; u.progress = 1;
      if (m) {
        m.processing = 'ready';
        if (!m.ai) A.genAI(m);
        if (m.editorial === 'draft') m.editorial = 'needs_review';
        V3.audit('Stream ready', `${m.title} (${m.id})`, 'System');
        V3.toast(`<b>${esc(m.title)}</b> is ready for review`, { icon: 'sparkles', sub: 'AI draft attached', action: { label: 'Review', fn: () => V3.app.go('#/review/' + m.id) } });
      }
      A.changed(true);
    }, 3200);
  };
  A.tick = () => {
    let dirty = false;
    db.uploads.forEach((u) => {
      if (u.state !== 'uploading' || u.paused) return;
      const speed = 3.2 + Math.random() * 2.2; // MB/s
      const inc = (speed * 0.25) / sizeMB(u);
      u.progress = Math.min(1, (u.progress || 0) + inc);
      u.speed = speed.toFixed(1) + ' MB/s';
      u.eta = Math.max(0, Math.round(((1 - u.progress) * sizeMB(u)) / speed)) + 's';
      const m = V3.media(u.media); if (m) m.progress = u.progress;
      if (u.failOnce && u.progress >= 0.38) {
        u.failOnce = false; u.state = 'failed';
        u.error = `Interrupted at ${Math.round(u.progress * 100)}% — Safari was suspended. Re-select the file to resume.`;
        if (m) { m.processing = 'failed'; m.error = u.error; }
        V3.toast('Upload interrupted', { type: 'error', sub: 'Safari suspended · resumable', action: { label: 'Retry', fn: () => A.retry(u.id) } });
        A.changed(true); return;
      }
      if (u.progress >= 1) {
        u.state = 'uploaded'; u.speed = '—'; u.eta = '—';
        if (m) m.processing = 'uploaded';
        A.changed(true);
        setTimeout(() => A.finishProcessing(u), 1100);
        return;
      }
      dirty = true;
    });
    if (dirty) { A.paint(); A.saveSoon(); }
  };
  A.saveSoon = V3.debounce(() => V3.save(), 800);
  A.retry = (id) => {
    const u = db.uploads.find((x) => x.id === id); if (!u) return;
    const m = V3.media(u.media);
    u.state = 'uploading'; u.error = null; u.paused = false; if (m) { m.processing = 'uploading'; m.error = null; }
    V3.toast(`Resuming from ${Math.round((u.progress || 0) * 100)}%`, { icon: 'refresh-cw', sub: 'tus · same upload URL' });
    A.changed(true);
  };
  A.togglePause = (id) => { const u = db.uploads.find((x) => x.id === id); if (!u) return; u.paused = !u.paused; V3.toast(u.paused ? 'Upload paused' : 'Upload resumed', { icon: u.paused ? 'pause' : 'play' }); A.changed(true); };
  A.cancel = (id) => { const u = db.uploads.find((x) => x.id === id); if (!u) return; u.state = 'cancelled'; const m = V3.media(u.media); if (m) m.processing = 'cancelled'; V3.audit('upload cancelled', u.file); A.changed(true); };
  // Paint progress in place (no full re-render)
  A.paint = () => {
    db.uploads.forEach((u) => {
      $$(`[data-up="${u.id}"]`).forEach((el) => {
        el.style.setProperty('--v', u.progress || 0);
        const pct = $('[data-pct]', el); if (pct) pct.textContent = Math.round((u.progress || 0) * 100) + '%';
        const sp = $('[data-speed]', el); if (sp) sp.textContent = u.speed;
        const eta = $('[data-eta]', el); if (eta) eta.textContent = u.eta;
        const done = $('[data-mbdone]', el); if (done) done.textContent = Math.round((u.progress || 0) * sizeMB(u));
      });
    });
    const st = $('[data-top-status]'); if (st && A.topStatus) st.innerHTML = A.topStatus();
  };
  A.changed = (rerender) => {
    V3.save();
    if (V3.app) {
      V3.app.refreshChrome();
      const r = V3.app.current && V3.app.current.parts && V3.app.current.parts[0];
      if (rerender && ['uploads', 'dashboard', 'review'].includes(r) && !(r === 'review' && V3.app.current.parts[1])) V3.app.refresh();
      else A.paint();
    }
  };
  setInterval(A.tick, 250);
  // On load: anything stuck mid-pipeline continues
  setTimeout(() => {
    db.uploads.forEach((u) => { if (u.state === 'uploaded') A.finishProcessing(u); if (u.state === 'created') u.state = 'uploading'; });
  }, 1200);

  A.topStatus = () => {
    const up = A.activeUploads().filter((u) => u.state === 'uploading');
    if (up.length) { const u = up[0]; return `<span class="dotlive" style="background:var(--info);box-shadow:0 0 0 3px var(--info-bg)"></span>${up.length} uploading · <span data-up="${u.id}"><span data-pct>${Math.round((u.progress || 0) * 100)}%</span></span>`; }
    return `<span class="dotlive"></span>Stream · AI · Archive online`;
  };

  /* Shared form bits ------------------------------------------------------ */
  A.householdOptions = (sel) => db.households.map((h) => `<option value="${h.id}"${h.id === sel ? ' selected' : ''}>${esc(h.name)}${h.status === 'inactive' ? ' (inactive)' : ''}</option>`).join('');
  A.dogOptions = (hid, sel) => V3.dogsFor(hid).map((d) => `<option value="${d.id}"${d.id === sel ? ' selected' : ''}>${esc(d.name)}</option>`).join('');
  A.sessionOptions = (hid, sel) => V3.sessionsForHousehold(hid).sort((a, b) => b.date.localeCompare(a.date)).map((s) => `<option value="${s.id}"${s.id === sel ? ' selected' : ''}>${V3.fmtDate(s.date)} · ${esc(s.title)}${s.status === 'active' ? ' (active)' : ''}</option>`).join('');
})();
