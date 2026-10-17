/* ==========================================================================
   V3 · admin-content — Academy CMS, consent, audit log, settings
   ========================================================================== */
(function () {
  'use strict';
  const V3 = window.V3;
  const { $, $$, esc, icon } = V3;
  const db = V3.db;
  const A = V3.A;
  const R = A.routes;

  /* Consent modal (shared with review approve flow) ------------------------ */
  A.consentModal = ({ media, onSave } = {}) => {
    const md = V3.modal({
      title: 'Record consent', label: 'Publication permission', sub: 'Capture who agreed, to what, and how. Consent can be withdrawn later.',
      body: `<form data-f novalidate class="g g-2" style="gap:12px">
        <div class="field span-2"><label for="c-sub">Subject</label><input class="input" id="c-sub" data-v="req" placeholder="e.g. Sarah Thompson (handler, identifiable)"><span class="field__error">${icon('circle-alert')} Who is this consent from?</span></div>
        <div class="field"><label for="c-kind">Scope</label><select class="select" id="c-kind"><option>Public website + guides</option><option>Public website</option><option>Training groups only</option><option>Household sharing only</option></select></div>
        <div class="field"><label for="c-ev">Evidence</label><select class="select" id="c-ev"><option>Signed digital form</option><option>Email</option><option>Onboarding form</option><option>Verbal — recorded in notes</option></select></div>
        <div class="field span-2"><label for="c-m">Applies to clip</label><select class="select" id="c-m"><option value="">All future clips (general)</option>${db.media.filter((m) => m.processing === 'ready').map((m) => `<option value="${m.id}"${m.id === media ? ' selected' : ''}>${esc(m.title)} · ${esc(m.id)}</option>`).join('')}</select></div>
        <label class="check check--plain span-2"><input type="checkbox" data-v="req"><span class="check__box">${icon('check')}</span><span class="check__text">Everyone identifiable in the footage (including children’s guardians) has agreed.</span></label></form>`,
      foot: `<button class="btn btn--ghost" type="button" data-close>Cancel</button><button class="btn btn--accent" type="button" data-ok>${icon('file-check')} Save consent</button>`
    });
    $('[data-ok]', md.el).addEventListener('click', () => {
      if (!V3.validate($('[data-f]', md.el))) return;
      const c = { id: 'c-' + (db.consents.length + 1) + V3.uid('x').slice(2, 4), subject: $('#c-sub', md.el).value.trim(), media: $('#c-m', md.el).value || null, kind: $('#c-kind', md.el).value, evidence: $('#c-ev', md.el).value, date: V3.nowISO().slice(0, 10), status: 'active' };
      db.consents.unshift(c); V3.audit('recorded consent', `${c.subject} · ${c.kind}`); V3.save(); md.close(); V3.toast('Consent recorded', { icon: 'file-check', sub: c.id });
      if (onSave) onSave(c);
    });
  };

  /* Academy CMS list ------------------------------------------------------ */
  R['academy'] = () => ({
    title: 'Academy CMS', nav: 'academy',
    html: `${A.vh('<span>training_guide · blog_post · faq_entry</span>', 'Academy', 'Structured guides built from blocks — with approved videos from your library, never re-uploads.', `<button class="btn btn--accent btn--sm" type="button" data-new>${icon('plus')} New guide</button>`)}
    <div class="g g-3" style="margin-bottom:16px">
      <div class="kpi"><span class="label">${icon('book-open-text')} Published</span><span class="kpi__n">${db.guides.filter((g) => g.status === 'published').length}</span></div>
      <div class="kpi"><span class="label">${icon('pencil-line')} Drafts</span><span class="kpi__n">${db.guides.filter((g) => g.status !== 'published').length}</span></div>
      <div class="kpi"><span class="label">${icon('pin')} Assigned as homework</span><span class="kpi__n">${db.guides.reduce((n, g) => n + (g.assigned || 0), 0)}</span></div>
    </div>
    <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Guide</th><th class="hide-m">Technique</th><th class="hide-m">Level</th><th>Status</th><th class="hide-m">Assigned</th><th></th></tr></thead><tbody>
    ${db.guides.map((g) => { const T = V3.technique(g.technique); return `<tr data-href="#/academy/${g.id}" tabindex="0"><td><div class="row" style="gap:10px"><span class="lrow__thumb" style="width:72px;height:46px"><img src="${esc(g.hero)}" alt=""></span><div><b style="font-weight:600">${esc(g.title)}</b><div class="mono faint">/academy/${esc(g.slug)}</div></div></div></td><td class="hide-m"><span class="tag" style="--c:${T.color}">${esc(T.name)}</span></td><td class="hide-m">${esc(g.level)}</td><td>${V3.state(g.status === 'published' ? 'published' : 'draft_guide', g.status)}</td><td class="hide-m num">${g.assigned || 0}</td><td style="text-align:right"><a class="btn btn--xs btn--ghost" href="#/academy/${g.id}">Edit</a></td></tr>`; }).join('')}
    </tbody></table></div></div>
    <div class="g g-2" style="margin-top:16px"><div class="card card--pad"><span class="label">Blog posts</span><div class="list" style="margin-top:8px">${db.posts.map((p) => `<a class="lrow" href="/v3/article.html?p=${p.id}"><span class="lrow__thumb"><img src="${esc(p.img)}" alt=""></span><span class="lrow__t"><b>${esc(p.title)}</b><small>${V3.fmtDate(p.date)} · published</small></span>${icon('arrow-up-right')}</a>`).join('')}</div></div>
      <div class="card card--pad"><span class="label">FAQ entries</span><div class="list" style="margin-top:8px">${db.faqs.map((f) => `<div class="lrow"><span class="lrow__ico">${icon('circle-help')}</span><span class="lrow__t"><b>${esc(f.q)}</b><small>${/Placeholder/.test(f.a) ? 'Needs Linda’s answer' : 'Published'}</small></span>${/Placeholder/.test(f.a) ? V3.state('pending', 'TBC') : ''}</div>`).join('')}</div></div></div>`,
    mount(v) { $('[data-new]', v).addEventListener('click', () => { const id = 'g-' + V3.uid('x').slice(2); db.guides.push({ id, slug: 'untitled-' + id.slice(2), title: 'Untitled guide', subtitle: 'A short promise for owners.', technique: 't-focus', level: 'Foundation', minutes: 5, hero: V3.img(50682, 40), clip: 50682, status: 'draft', assigned: 0 }); V3.save(); V3.app.go('#/academy/' + id); }); }
  });

  /* Academy editor --------------------------------------------------------- */
  const BLOCK_TYPES = { heading: ['heading', 'Heading'], text: ['pilcrow', 'Rich text'], steps: ['list-ordered', 'Instruction steps'], video: ['clapperboard', 'Approved video'], photo: ['image', 'Photo'], callout: ['lightbulb', 'Callout'], mistakes: ['circle-x', 'Common mistakes'], homework: ['list-checks', 'Homework'], faq: ['circle-help', 'FAQ accordion'], related: ['link', 'Related guide'] };
  const toBlocks = (g) => {
    const b = [];
    (g.sections || [{ h: 'Overview', body: g.subtitle }]).forEach((s) => {
      b.push({ t: 'heading', v: s.h });
      if (s.body) b.push({ t: 'text', v: s.body });
      if (s.steps) b.push({ t: 'steps', v: s.steps.join('\n') });
      if (s.list) b.push({ t: 'mistakes', v: s.list.join('\n') });
      if (s.h === 'Step by step') b.push({ t: 'video', v: g.clip === 10365 ? 'licensed:10365' : '' });
    });
    if (g.homework) b.push({ t: 'homework', v: g.homework.join('\n') });
    if (g.faqs) b.push({ t: 'faq', v: g.faqs.map((f) => `${f.q} | ${f.a}`).join('\n') });
    return b;
  };
  R['academy/:id'] = ({ id }) => {
    const g = V3.guide(id);
    if (!g) return { title: 'Not found', nav: 'academy', html: A.empty('search-x', 'Guide not found', '') };
    const key = 'cms-' + g.id;
    let blocks = V3.store.get(key, null) || toBlocks(g);
    let selI = 0;
    const seo = V3.store.get(key + '-seo', { title: `${g.title} — Linda’s Dog Training`, desc: g.subtitle, slug: g.slug });
    return {
      title: g.title, nav: 'academy', crumbs: [{ label: 'Academy', href: '#/academy' }, { label: g.title }],
      html: `${A.vh(`<span>${esc(g.id)}</span><span class="dot-sep"></span><span data-st>${esc(g.status)}</span><span class="dot-sep"></span><span>Author: Linda</span>`, `<span data-gt>${esc(g.title)}</span>`, '', `<a class="btn btn--ghost btn--sm" href="${g.slug === 'recall-101' ? '/v3/guide/recall-101.html' : `/v3/guide/recall-101.html?g=${g.slug}`}" target="_blank" rel="noopener">${icon('external-link')} View live</a><button class="btn btn--ghost btn--sm" type="button" data-save>${icon('save')} Save draft</button><button class="btn btn--accent btn--sm" type="button" data-publish>${icon('rocket')} ${g.status === 'published' ? 'Update' : 'Publish'}</button>`)}
      <div class="cms">
        <div class="g" style="gap:14px">
          <section class="panel"><div class="panel__h"><h3>${icon('blocks')} Blocks <span class="num faint" data-bc></span></h3><button class="btn btn--xs" type="button" data-add>${icon('plus')} Add block</button></div><div class="panel__b" data-blocks></div></section>
          <section class="panel"><div class="panel__h"><h3>${icon('search')} SEO &amp; meta</h3></div><div class="panel__b g" style="gap:12px">
            <div class="field"><label for="seo-t">SEO title</label><input class="input input--sm" id="seo-t" value="${esc(seo.title)}"></div>
            <div class="field"><label for="seo-d">Meta description</label><textarea class="textarea" id="seo-d" style="min-height:70px">${esc(seo.desc)}</textarea></div>
            <div class="field"><label for="seo-s">Slug</label><div class="input-group"><span class="mono faint" style="position:absolute;left:12px">/academy/</span><input class="input input--sm num" id="seo-s" value="${esc(seo.slug)}" style="padding-left:86px"></div></div>
          </div></section>
          <section class="panel"><div class="panel__h"><h3>${icon('shield-check')} Publish checks</h3></div><div class="panel__b"><div class="checks" data-checks></div></div></section>
        </div>
        <div class="cms-preview" data-preview aria-label="Live preview"></div>
      </div>`,
      mount(v) {
        const vids = () => blocks.filter((b) => b.t === 'video' && b.v);
        const mediaOK = (val) => val.startsWith('licensed:') || (V3.media(val) && V3.media(val).editorial === 'published_public');
        const checks = () => [
          [!!$('#seo-s', v).value.trim(), 'Slug set'],
          [$('#seo-t', v).value.trim().length > 10 && $('#seo-d', v).value.trim().length > 20, 'SEO title & description'],
          [blocks.some((b) => b.t === 'heading') && blocks.some((b) => b.t === 'text'), 'Has headings and body copy'],
          [vids().length > 0, 'At least one video example'],
          [vids().every((b) => mediaOK(b.v)), 'Every video has a public edition + consent'],
          [blocks.some((b) => b.t === 'homework'), 'Homework checklist (assignable)']
        ];
        const drawChecks = () => { const c = checks(); $('[data-checks]', v).innerHTML = c.map(([ok, l]) => `<div class="${ok ? 'ok' : 'bad'}">${icon(ok ? 'circle-check' : 'circle-x')}<span>${l}</span></div>`).join(''); V3.icons(v); return c.every((x) => x[0]); };
        const vidLabel = (val) => { if (!val) return '<span class="muted">No video chosen</span>'; if (val.startsWith('licensed:')) return `Licensed demo clip ${val.split(':')[1]}`; const m = V3.media(val); return m ? `${esc(m.title)} · ${esc(V3.label.editorial[m.editorial])}` : esc(val); };
        const drawBlocks = () => {
          $('[data-bc]', v).textContent = blocks.length;
          $('[data-blocks]', v).innerHTML = blocks.map((b, i) => `<div class="blk${i === selI ? ' is-sel' : ''}" data-b="${i}"><span class="blk__grip">${icon('grip-vertical')}</span><div style="min-width:0"><div class="blk__type"><span class="label">${icon(BLOCK_TYPES[b.t][0])} ${BLOCK_TYPES[b.t][1]}</span></div>
            ${i === selI ? (b.t === 'video' ? `<div class="row row--wrap" style="gap:8px"><span class="blk__body">${vidLabel(b.v)}</span><button class="btn btn--xs" type="button" data-pick="${i}">${icon('clapperboard')} Insert approved video</button></div>` : `<textarea class="textarea" data-edit="${i}" style="min-height:${b.t === 'heading' ? 44 : 90}px">${esc(b.v)}</textarea>${['steps', 'mistakes', 'homework'].includes(b.t) ? '<small class="muted">One item per line</small>' : b.t === 'faq' ? '<small class="muted">Question | Answer — one per line</small>' : ''}`)
              : `<div class="blk__body clamp-2">${b.t === 'video' ? vidLabel(b.v) : esc(b.v.split('\n')[0] || '—')}</div>`}</div>
            <div class="row" style="gap:0"><button class="icon-btn icon-btn--sm" type="button" data-up="${i}" aria-label="Move up">${icon('arrow-up')}</button><button class="icon-btn icon-btn--sm" type="button" data-del="${i}" aria-label="Delete block">${icon('trash-2')}</button></div></div>`).join('');
          V3.icons(v);
        };
        const drawPreview = () => {
          let h = `<span class="mono" style="color:#6B6F76">${esc(V3.technique(g.technique).name)} · ${esc(g.level)} · ${g.minutes} min</span><h1 style="margin-top:8px">${esc(g.title)}</h1><p style="font-size:16px;color:#6B6F76;margin-top:8px">${esc(g.subtitle)}</p>`;
          blocks.forEach((b) => {
            const lines = b.v.split('\n').filter(Boolean);
            if (b.t === 'heading') h += `<h2>${esc(b.v)}</h2>`;
            else if (b.t === 'text') h += `<p>${esc(b.v)}</p>`;
            else if (b.t === 'steps') h += `<ol>${lines.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>`;
            else if (b.t === 'mistakes') h += `<ul>${lines.map((x) => `<li>✕ ${esc(x)}</li>`).join('')}</ul>`;
            else if (b.t === 'homework') h += `<h2>Homework</h2><ul>${lines.map((x) => `<li>☐ ${esc(x)}</li>`).join('')}</ul>`;
            else if (b.t === 'faq') h += `<h2>FAQ</h2>${lines.map((x) => { const [q, a] = x.split('|'); return `<p><b>${esc(q)}</b><br>${esc(a || '')}</p>`; }).join('')}`;
            else if (b.t === 'callout') h += `<p style="background:#111214;color:#F2F2EE;padding:12px 14px;border-radius:12px">💡 ${esc(b.v)}</p>`;
            else if (b.t === 'photo') h += `<div class="vid"><img src="${V3.img(50683, 40)}" alt=""></div>`;
            else if (b.t === 'related') h += `<p>→ Related: ${esc(b.v)}</p>`;
            else if (b.t === 'video') { const clip = b.v.startsWith('licensed:') ? +b.v.split(':')[1] : (V3.media(b.v) || {}).clip; h += clip ? `<div class="vid"><img src="${V3.img(clip, 40)}" alt=""><span class="pill pill--glass pill--mono">${icon('play')} Video</span></div>` : `<div class="ph-block" style="min-height:90px">Video placeholder</div>`; }
          });
          $('[data-preview]', v).innerHTML = h; V3.icons($('[data-preview]', v));
        };
        const all = () => { drawBlocks(); drawPreview(); drawChecks(); };
        all();
        const persist = () => { V3.store.set(key, blocks); V3.store.set(key + '-seo', { title: $('#seo-t', v).value, desc: $('#seo-d', v).value, slug: $('#seo-s', v).value }); };
        v.addEventListener('input', (e) => { const i = e.target.dataset.edit; if (i !== undefined) { blocks[+i].v = e.target.value; drawPreview(); drawChecks(); } if (/^seo-/.test(e.target.id)) drawChecks(); });
        v.addEventListener('click', (e) => {
          const t = e.target.closest('button, [data-b]'); if (!t) return;
          if (t.dataset.up !== undefined) { const i = +t.dataset.up; if (i > 0) { [blocks[i - 1], blocks[i]] = [blocks[i], blocks[i - 1]]; selI = i - 1; all(); } return; }
          if (t.dataset.del !== undefined) { blocks.splice(+t.dataset.del, 1); selI = Math.max(0, selI - 1); all(); return; }
          if (t.dataset.pick !== undefined) { pickVideo(+t.dataset.pick); return; }
          if (t.hasAttribute('data-add')) { V3.menu(t, Object.entries(BLOCK_TYPES).map(([k, [ic, l]]) => ({ label: l, icon: ic, run: () => { blocks.splice(selI + 1, 0, { t: k, v: k === 'heading' ? 'New section' : k === 'video' ? '' : '' }); selI = selI + 1; all(); } })), { align: 'right' }); return; }
          if (t.hasAttribute('data-save')) { persist(); V3.toast('Draft saved', { sub: 'Revision kept' }); return; }
          if (t.hasAttribute('data-publish')) {
            if (!drawChecks()) { V3.toast('Fix the publish checks first', { type: 'error', icon: 'shield-alert' }); return; }
            persist(); g.status = 'published'; g.slug = $('#seo-s', v).value.trim() || g.slug;
            const secs = []; let curS = null;
            blocks.forEach((b) => {
              const lines = b.v.split('\n').map((x) => x.trim()).filter(Boolean);
              if (b.t === 'heading') { curS = { h: b.v.trim() || 'Section' }; secs.push(curS); return; }
              if (!curS) { curS = { h: 'Overview' }; secs.push(curS); }
              if (b.t === 'text' || b.t === 'callout') curS.body = (curS.body ? curS.body + ' ' : '') + b.v.trim();
              if (b.t === 'steps') curS.steps = lines;
              if (b.t === 'mistakes') curS.list = lines;
              if (b.t === 'homework') g.homework = lines;
              if (b.t === 'faq') g.faqs = lines.map((x) => { const [q, a] = x.split('|'); return { q: (q || '').trim(), a: (a || '').trim() }; });
            });
            g.sections = secs.filter((x) => x.body || x.steps || x.list);
            if (!g.faqs) g.faqs = [];
            V3.audit('published guide', g.title); V3.save();
            $('[data-st]', v).textContent = 'published'; V3.toast(`${esc(g.title)} is live`, { icon: 'rocket', sub: 'Visible in the public academy', action: { label: 'View', fn: () => { location.href = g.slug === 'recall-101' ? '/v3/guide/recall-101.html' : `/v3/guide/recall-101.html?g=${g.slug}`; } } });
            return;
          }
          if (t.dataset.b !== undefined && !e.target.closest('textarea')) { const i = +t.dataset.b; if (i !== selI) { selI = i; drawBlocks(); const ta = $(`[data-edit="${i}"]`, v); if (ta) ta.focus(); } }
        });
        const pickVideo = (bi) => {
          const items = db.media.filter((m) => m.processing === 'ready' && m.editorial !== 'archived');
          const md = V3.modal({
            title: 'Insert approved video', label: 'From your library — no re-uploads', wide: true, sub: 'Only clips with a public edition and recorded consent can appear on a public guide.',
            body: `<div class="pickgrid">${items.map((m) => { const ok = m.editorial === 'published_public'; return `<button class="pickm" type="button" data-mv="${m.id}"${ok ? '' : ' disabled'}><img src="${V3.thumb(m.clip, m.cover || 40)}" alt=""><b>${esc(m.title)}</b><small>${ok ? '✓ Public edition · consent on file' : m.editorial.startsWith('approved') ? 'Private — needs public edition + consent' : 'Not approved'}</small></button>`; }).join('')}
              <button class="pickm" type="button" data-mv="licensed:10365"><img src="${V3.thumb(10365, 40)}" alt=""><b>Recall demo (licensed)</b><small>✓ Licensed stock</small></button></div>`
          });
          md.el.addEventListener('click', (e) => { const b = e.target.closest('[data-mv]'); if (!b || b.disabled) return; blocks[bi].v = b.dataset.mv; md.close(); all(); V3.toast('Video inserted', { icon: 'clapperboard' }); });
        };
      }
    };
  };

  /* Consent --------------------------------------------------------------- */
  R['consent'] = () => ({
    title: 'Consent records', nav: 'consent',
    html: `${A.vh('<span>ConsentRecord · subject · scope · evidence · withdrawal</span>', 'Consent', 'Public use of identifiable people needs a recorded, scoped consent. Withdrawal triggers takedown.', `<button class="btn btn--accent btn--sm" type="button" data-new>${icon('plus')} Record consent</button>`)}
    <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Subject</th><th>Scope</th><th class="hide-m">Clip</th><th class="hide-m">Evidence</th><th class="hide-m">Date</th><th>Status</th><th></th></tr></thead><tbody>
    ${db.consents.map((c) => { const m = c.media && V3.media(c.media); return `<tr><td><b style="font-weight:550">${esc(c.subject)}</b><div class="mono faint">${esc(c.id)}</div></td><td>${esc(c.kind)}</td><td class="hide-m">${m ? `<a class="link" href="#/review/${m.id}">${esc(m.title)}</a>` : '<span class="faint">General</span>'}</td><td class="hide-m">${esc(c.evidence)}</td><td class="hide-m num" style="font-size:12px">${V3.fmtDate(c.date, { day: 'numeric', month: 'short', year: 'numeric' })}${c.withdrawn ? `<div class="faint">withdrawn ${V3.fmtDate(c.withdrawn)}</div>` : ''}</td><td>${V3.state(c.status)}</td><td style="text-align:right">${c.status === 'active' ? `<button class="btn btn--xs btn--ghost" type="button" data-w="${c.id}">Withdraw</button>` : ''}</td></tr>`; }).join('')}
    </tbody></table></div></div>
    <div class="notice" style="margin-top:14px">${icon('scale')}<span>NZ Privacy Act — IPP3A notification for indirectly collected information applies from 1 May 2026. <span class="mini-ph">legal review before production</span></span></div>`,
    mount(v) {
      v.addEventListener('click', async (e) => {
        if (e.target.closest('[data-new]')) A.consentModal({ onSave: () => V3.app.refresh() });
        const w = e.target.closest('[data-w]');
        if (w && await V3.confirm('Withdraw consent?', 'Any public editions relying on it are unpublished and the change is audited.', 'Withdraw', true)) {
          const c = db.consents.find((x) => x.id === w.dataset.w); c.status = 'withdrawn'; c.withdrawn = V3.nowISO().slice(0, 10);
          let n = 0; if (c.media) { const m = V3.media(c.media); if (m && m.editorial === 'published_public') { m.editorial = 'approved_private'; m.visibility = 'trainer_only'; n++; } }
          V3.audit('withdrew consent', `${c.subject} · ${c.kind}`); V3.save(); V3.toast('Consent withdrawn', { sub: n ? `${n} public edition taken down` : 'No public editions affected' }); V3.app.refresh();
        }
      });
    }
  });

  /* Audit log ------------------------------------------------------------- */
  R['audit'] = () => ({
    title: 'Audit log', nav: 'audit',
    html: `${A.vh('<span>AuditEvent · actor · entity · action · time</span>', 'Audit log', 'Approvals, grants, consents and access changes — minimal, append-only.', `<button class="btn btn--ghost btn--sm" type="button" data-csv>${icon('download')} Export CSV</button>`)}
    <div class="toolbar-a"><label class="input-group"><i data-lucide="search"></i><span class="sr-only">Filter</span><input class="input input--sm" type="search" data-q placeholder="Filter by action, entity…"></label><select class="select select--sm" data-actor aria-label="Actor"><option value="">All actors</option>${[...new Set(db.audit.map((a) => a.actor))].map((a) => `<option>${esc(a)}</option>`).join('')}</select></div>
    <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th class="hide-m">Entity</th></tr></thead><tbody data-rows></tbody></table></div></div>`,
    mount(v) {
      const draw = () => {
        const q = $('[data-q]', v).value.trim(), a = $('[data-actor]', v).value;
        const rows = db.audit.filter((x) => (!a || x.actor === a) && (!q || V3.fuzzy(q, `${x.action} ${x.entity}`) > 0));
        $('[data-rows]', v).innerHTML = rows.map((x) => `<tr><td class="num" style="font-size:12px;white-space:nowrap">${V3.fmtDate(x.t)} ${V3.fmtTime(x.t)}</td><td><span class="row" style="gap:8px"><span class="avatar" style="--s:24px;font-size:9px">${esc(V3.initials(x.actor))}</span>${esc(x.actor)}</span></td><td><span class="pill pill--mono">${esc(x.action)}</span><div class="show-m muted" style="font-size:12px;margin-top:4px">${esc(x.entity)}</div></td><td class="hide-m">${esc(x.entity)}</td></tr>`).join('') || `<tr><td colspan="4">${A.empty('scroll-text', 'No events', '')}</td></tr>`;
        V3.icons(v);
      };
      $('[data-q]', v).addEventListener('input', draw); $('[data-actor]', v).addEventListener('change', draw); draw();
      $('[data-csv]', v).addEventListener('click', () => { const csv = 'time,actor,action,entity\n' + db.audit.map((x) => [x.t, x.actor, x.action, x.entity].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'audit-log.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 800); V3.toast('Audit log exported', { icon: 'download' }); });
    }
  });

  /* Settings --------------------------------------------------------------- */
  R['settings'] = () => {
    const s = V3.store.get('settings', { maxMin: 20, maxSize: '2 GB', aiCeiling: db.stats.trainer.aiCeiling, perVideo: 0.5, retries: 3, pauseAI: true, quarantine: true, defaultMode: 'link_only', warnFile: true });
    const st = db.stats.trainer;
    const integ = (logo, name, sub, rows, k) => `<div class="integ"><div class="integ__h"><span class="integ__logo">${icon(logo)}</span><div class="grow"><b>${name}</b><small>${sub}</small></div>${V3.state('active', 'Connected')}</div><dl>${rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl><button class="btn btn--ghost btn--xs" type="button" data-test="${k}" style="justify-self:start">${icon('activity')} Test connection</button></div>`;
    return {
      title: 'Settings', nav: 'settings',
      html: `${A.vh('<span>Workspace · Linda’s Dog Training</span>', 'Settings', 'Limits, AI ceilings, the archive number and integrations.')}
      <div class="sec-t" style="margin-top:0"><h2>Integrations</h2><span class="mono faint">Credentials live server-side only</span></div>
      <div class="g g-3">${integ('cloud', 'Cloudflare Stream', 'Video hosting · signed playback', [['Stored', `${st.streamMinutesStored.toLocaleString()} min`], ['Delivered', `${st.streamMinutesDelivered.toLocaleString()} min`], ['Webhook', 'verified · 2m ago'], ['Signed URLs', 'required']], 'stream')}
        ${integ('message-circle', 'WhatsApp Cloud API', 'Archive number · inbound only', [['Number', esc(window.LINDA.brand.archiveNumber)], ['Webhook', 'signature ✓'], ['Video limit', '16 MB'], ['Last message', V3.rel(db.inbox[0].received)]], 'wa')}
        ${integ('sparkles', 'AI provider', 'Drafts only · async worker', [['Model', 'vision-draft-2'], ['This month', `$${st.aiSpendMonth.toFixed(2)}`], ['Ceiling', `$${s.aiCeiling}`], ['DPA', '<span class="mini-ph">review</span>']], 'ai')}</div>
      <div class="g g-2" style="margin-top:16px">
        <section class="panel"><div class="panel__h"><h3>${icon('film')} Upload limits</h3></div><div class="panel__b">
          <div class="setrow"><div><b>Max recording length</b><small>Warn beyond this — never silently reject.</small></div><div class="row" style="gap:10px"><input class="range" type="range" min="2" max="60" value="${s.maxMin}" data-k="maxMin"><span class="num" style="min-width:52px" data-o="maxMin">${s.maxMin} min</span></div></div>
          <div class="setrow"><div><b>Max file size</b><small>Stream allows more; this is a guardrail.</small></div><select class="select select--sm" data-k="maxSize">${['500 MB', '1 GB', '2 GB', '5 GB'].map((x) => `<option${x === s.maxSize ? ' selected' : ''}>${x}</option>`).join('')}</select></div>
          <div class="setrow"><div><b>Resumable uploads (tus)</b><small>Required for phone recordings.</small></div><label class="switch" style="justify-self:end"><input type="checkbox" checked disabled><span class="switch__track"></span><span class="sr-only">tus</span></label></div>
        </div></section>
        <section class="panel"><div class="panel__h"><h3>${icon('sparkles')} AI spending</h3></div><div class="panel__b">
          <div class="setrow"><div><b>Monthly ceiling</b><small>$${st.aiSpendMonth.toFixed(2)} used this month</small></div><div class="input-group"><span class="mono faint" style="position:absolute;left:12px">US$</span><input class="input input--sm num" type="number" min="5" step="5" value="${s.aiCeiling}" data-k="aiCeiling" style="padding-left:44px"></div></div>
          <div class="setrow"><div><b>Per-video ceiling</b><small>Stops runaway costs on long clips.</small></div><div class="input-group"><span class="mono faint" style="position:absolute;left:12px">US$</span><input class="input input--sm num" type="number" min="0.1" step="0.1" value="${s.perVideo}" data-k="perVideo" style="padding-left:44px"></div></div>
          <div class="setrow"><div><b>Retry limit</b><small>Then mark “AI failed” — review continues.</small></div><select class="select select--sm" data-k="retries">${[1, 2, 3, 5].map((x) => `<option${x === s.retries ? ' selected' : ''}>${x}</option>`).join('')}</select></div>
          <div class="setrow"><div><b>Pause AI at ceiling</b></div><label class="switch" style="justify-self:end"><input type="checkbox" data-k="pauseAI"${s.pauseAI ? ' checked' : ''}><span class="switch__track"></span><span class="sr-only">Pause AI</span></label></div>
        </div></section>
        <section class="panel"><div class="panel__h"><h3>${icon('message-circle')} WhatsApp archive</h3></div><div class="panel__b">
          <div class="setrow"><div><b>Archive number</b><small>Separate Business number. Your personal number is unchanged.</small></div><span class="num">${esc(window.LINDA.brand.archiveNumber)}</span></div>
          <div class="setrow"><div><b>Authorised senders</b><small>Only these numbers can forward material.</small></div><span class="row" style="gap:6px;justify-self:end"><span class="pill pill--mono">${esc(window.LINDA.brand.phone)} · Linda</span></span></div>
          <div class="setrow"><div><b>Quarantine unknown senders</b></div><label class="switch" style="justify-self:end"><input type="checkbox" data-k="quarantine"${s.quarantine ? ' checked' : ''}><span class="switch__track"></span><span class="sr-only">Quarantine</span></label></div>
        </div></section>
        <section class="panel"><div class="panel__h"><h3>${icon('send')} Sharing defaults</h3></div><div class="panel__b">
          <div class="setrow"><div><b>Default share mode</b><small>Links keep access revocable.</small></div><div class="seg seg--mono" role="group" data-mode>${['link_only', 'video_only', 'link_and_video'].map((k) => `<button type="button" data-m="${k}" aria-pressed="${s.defaultMode === k}">${V3.label.mode[k]}</button>`).join('')}</div></div>
          <div class="setrow"><div><b>Warn before attaching files</b></div><label class="switch" style="justify-self:end"><input type="checkbox" data-k="warnFile"${s.warnFile ? ' checked' : ''}><span class="switch__track"></span><span class="sr-only">Warn</span></label></div>
          <div class="setrow"><div><b>Appearance</b><small>Persisted on this device.</small></div><div class="seg" role="group" data-theme-seg><button type="button" data-th="light" aria-pressed="${V3.theme.get() === 'light'}">${icon('sun-medium')} Light</button><button type="button" data-th="dark" aria-pressed="${V3.theme.get() === 'dark'}">${icon('moon')} Dark</button></div></div>
        </div></section>
      </div>
      <section class="panel" style="margin-top:16px;border-color:var(--danger-bg)"><div class="panel__h"><h3>${icon('rotate-ccw')} Demo data</h3></div><div class="panel__b row row--between row--wrap" style="gap:12px"><span class="muted">Everything you’ve approved, shared or recorded in this prototype is saved in this browser.</span><button class="btn btn--danger btn--sm" type="button" data-reset>${icon('rotate-ccw')} Reset demo data</button></div></section>`,
      mount(v) {
        const save = V3.debounce(() => { V3.store.set('settings', s); db.stats.trainer.aiCeiling = +s.aiCeiling; V3.save(); V3.toast('Settings saved', { duration: 1400 }); }, 500);
        v.addEventListener('input', (e) => { const k = e.target.dataset.k; if (!k) return; s[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'range' || e.target.type === 'number' ? +e.target.value : e.target.value; const o = $(`[data-o="${k}"]`, v); if (o) o.textContent = s[k] + ' min'; save(); });
        v.addEventListener('change', (e) => { if (e.target.tagName === 'SELECT' || e.target.type === 'checkbox') { const k = e.target.dataset.k; if (!k) return; s[k] = e.target.type === 'checkbox' ? e.target.checked : isNaN(+e.target.value) ? e.target.value : +e.target.value; save(); } });
        v.addEventListener('click', async (e) => {
          const t = e.target.closest('button'); if (!t) return;
          if (t.dataset.m) { s.defaultMode = t.dataset.m; $$('[data-m]', v).forEach((x) => x.setAttribute('aria-pressed', String(x === t))); save(); }
          if (t.dataset.th) { V3.theme.set(t.dataset.th); $$('[data-th]', v).forEach((x) => x.setAttribute('aria-pressed', String(x === t))); $$('[data-theme-toggle]').forEach((b) => { b.innerHTML = icon(V3.theme.get() === 'dark' ? 'sun-medium' : 'moon'); }); V3.icons(); }
          if (t.dataset.test) { t.classList.add('is-loading'); setTimeout(() => { t.classList.remove('is-loading'); V3.toast(`${{ stream: 'Cloudflare Stream', wa: 'WhatsApp Cloud API', ai: 'AI provider' }[t.dataset.test]} OK`, { icon: 'activity', sub: `${80 + Math.floor(Math.random() * 120)} ms · demo` }); }, 900); }
          if (t.hasAttribute('data-reset') && await V3.confirm('Reset all demo data?', 'Approvals, shares, uploads and edits made in this browser will be cleared.', 'Reset', true)) { V3.resetDemo(); ['share-draft', 'portal-hh', 'media-filters', 'inbox-sel', 'sim-suspend', 'settings'].forEach((k) => V3.store.del(k)); db.guides.forEach((g) => { V3.store.del('cms-' + g.id); V3.store.del('cms-' + g.id + '-seo'); }); location.hash = '#/dashboard'; location.reload(); }
        });
      }
    };
  };
})();
