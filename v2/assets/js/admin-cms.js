/* =========================================================
   PAWS & PLAY — admin: Academy CMS (guide list + block editor
   with approved-video picker and publish checks)
   ========================================================= */
(function () {
  'use strict';
  const A = window.ADMIN, P = window.PAWS, L = window.LINDA, APP = window.APP, $ = P.$, $$ = P.$$;
  const G = typeof window.gsap !== 'undefined';
  const ic = P.ic, esc = P.esc;
  const BT = {
    heading: ['Heading', 'heading', 'var(--sun)'], text: ['Rich text', 'pilcrow', 'var(--cream)'], steps: ['Steps', 'list-ordered', 'var(--sky)'],
    video: ['Approved video', 'clapperboard', 'var(--lilac)'], callout: ['Callout', 'megaphone', 'var(--blush)'], mistakes: ['Common mistakes', 'circle-x', 'var(--tomato-tint)'],
    homework: ['Homework checklist', 'list-checks', 'var(--grass-tint)'], faq: ['FAQ', 'message-circle-question', 'var(--sun-tint)']
  };

  A.V.academy = () => ({
    title: 'Academy CMS', short: 'Academy',
    html: A.vhead('Phase 2 · content', 'graduation-cap', 'Training Academy', 'Guides, with drafts, revisions and publish checks. Reuse approved videos — never re-upload.', `<button class="btn btn--primary" type="button" data-new>${ic('plus')}New guide</button><a class="btn" href="/v2/academy.html" target="_blank" rel="noopener">${ic('external-link')}View public Academy</a>`) +
      `<div class="mgrid">${L.guides.map((g) => { const t = L.technique(g.technique); return `<a class="mtile" href="#/academy/${g.id}"><div class="mt-media"><img src="${L.thumb(g.clip, 40)}" alt=""><div class="mt-tl">${P.status(g.status)}</div><span class="mt-dur">${g.minutes} min</span></div><div class="mt-body"><h3 class="mt-title">${esc(g.title)}</h3><p class="small muted" style="margin:0 0 8px">${esc(g.subtitle)}</p><div class="row row--wrap" style="gap:6px">${P.techTag(t.id)}<span class="pill pill--soft">${ic('book-check')}${g.assigned} assigned</span></div></div></a>`; }).join('')}</div>
      <div class="grid grid-2" style="margin-top:24px"><div class="card" style="background:var(--sky-tint)"><h2 class="card-title">Blog posts</h2><div class="list" style="margin-top:12px">${L.posts.map((p) => `<div class="lrow"><span class="thumb"><img src="${p.img.replace('/img/', '/thumb/')}" alt=""></span><span class="meta"><b>${esc(p.title)}</b><small>${L.fmtDate(p.date)} · ${p.minutes} min</small></span>${P.status('published')}</div>`).join('')}</div></div>
        <div class="card" style="background:var(--sun-tint)"><h2 class="card-title">FAQ entries</h2><div class="list" style="margin-top:12px">${L.faqs.map((f) => `<div class="lrow"><span class="meta"><b style="white-space:normal">${esc(f.q)}</b><small>${f.a.startsWith('Placeholder') ? 'Needs Linda’s answer' : 'Published'}</small></span>${P.status(f.a.startsWith('Placeholder') ? 'draft' : 'published')}</div>`).join('')}</div></div></div>`,
    mount(el) {
      $('[data-new]', el).addEventListener('click', () => P.modal({ title: 'New guide', html: `<div class="field"><label class="label" for="ng-title">Title</label><input class="input" id="ng-title" placeholder="e.g. Settle at the café"></div><div class="field"><label class="label" for="ng-tech">Technique</label><select class="select" id="ng-tech">${L.techniques.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></div>`,
        actions: [{ label: 'Cancel', cls: 'btn--outline' }, { label: 'Create draft', cls: 'btn--primary', onClick: (api) => { const t = $('#ng-title', api.el).value.trim(); if (!t) return false; const id = 'g-' + Math.random().toString(36).slice(2, 6); const tech = $('#ng-tech', api.el).value; const clip = (L.guides.find((g) => g.technique === tech) || L.guides[0]).clip; P.db.add('guides', { id, slug: t.toLowerCase().replace(/[^a-z0-9]+/g, '-'), title: t, subtitle: '', technique: tech, level: 'Foundation', minutes: 5, hero: L.img(clip, 40), clip, status: 'draft', assigned: 0 }); A.audit('created guide draft', t); A.go('/academy/' + id); } }] }));
      APP.popIn(el, '.mtile, .card');
    }
  });

  A.V.guideEditor = ({ params }) => {
    const g = L.guides.find((x) => x.id === params.id); if (!g) return A.empty('book-x', 'Guide not found', '', '<a class="btn" href="#/academy">Back</a>');
    const key = 'cms:' + g.id;
    let blocks = P.store.get(key, null);
    if (!blocks) {
      blocks = [{ type: 'heading', text: g.title }, { type: 'text', text: g.subtitle || 'Introduce the guide…' }];
      (g.sections || []).forEach((s) => {
        blocks.push({ type: 'heading', text: s.h });
        if (s.body) blocks.push({ type: s.h.includes('safety') ? 'callout' : 'text', text: s.body });
        if (s.steps) blocks.push({ type: 'steps', items: s.steps.slice() });
        if (s.list) blocks.push({ type: 'mistakes', items: s.list.slice() });
        if (s.h === 'Step by step') blocks.push({ type: 'video', media: 'm-1012' });
      });
      if (g.homework) blocks.push({ type: 'homework', items: g.homework.slice() });
      if (g.faqs) blocks.push({ type: 'faq', items: g.faqs.map((f) => f.q + ' — ' + f.a) });
    }
    const seo = P.store.get(key + ':seo', { slug: g.slug, desc: g.subtitle || '' });
    const save = () => { P.store.set(key, blocks); P.store.set(key + ':seo', seo); };
    const publicOK = (m) => m && m.editorial === 'published_public' && L.consents.some((c) => c.media === m.id && c.status === 'active');

    function blockHTML(b, i) {
      const [name, icon, col] = BT[b.type];
      let inner = '';
      if (b.type === 'heading') inner = `<h3 contenteditable="true" spellcheck="true" data-txt="${i}" style="margin:0;font-size:1.5rem">${esc(b.text)}</h3>`;
      else if (b.type === 'text' || b.type === 'callout') inner = `<p contenteditable="true" data-txt="${i}" style="margin:0">${esc(b.text)}</p>`;
      else if (b.type === 'video') { const m = L.mediaItem(b.media); const ok = publicOK(m); inner = m ? `<div class="bvid"><img src="${A.thumb(m)}" alt=""><div><b>${esc(m.title)}</b><div class="row row--wrap" style="margin-top:6px">${P.status(m.editorial)}${ok ? `<span class="pill pill--grass">${ic('shield-check')}Consent verified</span>` : `<span class="pill pill--tomato">${ic('shield-alert')}No public consent</span>`}</div><button class="btn btn--sm" type="button" data-pickvid="${i}" style="margin-top:8px">${ic('replace')}Swap video</button></div></div>` : `<button class="btn" type="button" data-pickvid="${i}">${ic('plus')}Insert approved video</button>`; }
      else inner = `<ul style="margin:0;padding-left:18px;display:grid;gap:4px">${b.items.map((it, j) => `<li contenteditable="true" data-item="${i}:${j}">${esc(it)}</li>`).join('')}</ul><button class="btn btn--sm btn--ghost" type="button" data-additem="${i}" style="margin-top:6px">${ic('plus')}Add item</button>`;
      return `<div class="block" data-b="${i}" style="--bc:${col}"><div class="bh"><span class="btype" title="${name}">${ic(icon)}</span><button type="button" data-up="${i}" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>${ic('chevron-up')}</button><button type="button" data-down="${i}" aria-label="Move down" ${i === blocks.length - 1 ? 'disabled' : ''}>${ic('chevron-down')}</button><button type="button" data-del="${i}" aria-label="Delete block">${ic('trash-2')}</button></div><div><div class="bk"><span>${name}</span></div>${inner}</div></div>`;
    }
    function checks() {
      const vids = blocks.filter((b) => b.type === 'video');
      return [
        ['Title and summary', !!g.title && blocks.some((b) => b.type === 'text')],
        ['URL slug set', !!seo.slug],
        ['SEO description (50+ characters)', (seo.desc || '').length >= 50],
        ['At least one video', vids.length > 0],
        ['Every video has public permission & consent', vids.length > 0 && vids.every((b) => publicOK(L.mediaItem(b.media)))],
        ['Homework checklist included', blocks.some((b) => b.type === 'homework')]
      ];
    }
    return {
      title: 'Edit · ' + g.title, short: 'Guide editor',
      html: `<a class="back-link" href="#/academy">${ic('arrow-left')}Academy CMS</a>` + A.vhead(P.statusLabel(g.status) + ' · ' + esc(L.technique(g.technique).name), 'pencil-line', esc(g.title), 'Click any text to edit. Blocks save automatically in this browser.', `<a class="btn" href="${g.slug === 'recall-101' ? '/v2/guide/recall-101.html' : '/v2/academy.html'}" target="_blank" rel="noopener">${ic('eye')}Preview</a><button class="btn btn--primary" type="button" data-publish>${ic('rocket')}${g.status === 'published' ? 'Update' : 'Publish'}</button>`) +
        `<div class="cms-layout"><div data-blocks></div>
          <aside style="display:grid;gap:18px;position:sticky;top:96px">
            <section class="card card--sm"><h2 class="card-title" style="margin-bottom:10px">Publish checklist</h2><ul class="checklist" data-checks></ul></section>
            <section class="card card--sm"><h2 class="card-title" style="margin-bottom:10px">SEO</h2><div class="field"><label class="label" for="seo-slug">Slug</label><div class="input-icon"><i data-lucide="link"></i><input class="input" id="seo-slug" value="${esc(seo.slug)}"></div></div><div class="field"><label class="label" for="seo-desc">Meta description</label><textarea class="textarea" id="seo-desc" style="min-height:90px">${esc(seo.desc)}</textarea><span class="hint" data-desc-n></span></div></section>
            <section class="card card--sm" style="background:var(--sun-tint)"><h2 class="card-title" style="margin-bottom:6px">Assigned as homework</h2><p class="small" style="margin:0">${g.assigned} households · clients see it in their Training Library.</p></section>
          </aside></div>`,
      mount(el) {
        const box = $('[data-blocks]', el);
        function render(flipState) {
          box.innerHTML = blocks.map(blockHTML).join('') + `<div class="insert-line"><button class="btn btn--sun" type="button" data-insert>${ic('plus')}Insert block</button></div>`;
          P.icons(); renderChecks();
          if (flipState && window.Flip && !P.reduced) Flip.from(flipState, { duration: .5, ease: 'back.out(1.4)', targets: $$('.block', box) });
        }
        function renderChecks() { $('[data-checks]', el).innerHTML = checks().map(([l, ok]) => `<li class="${ok ? 'ok' : 'bad'}"><span class="ck">${ic(ok ? 'check' : 'x')}</span>${l}</li>`).join(''); $('[data-desc-n]', el).textContent = (seo.desc || '').length + ' / 160'; P.icons(); }
        box.addEventListener('input', (e) => {
          const t = e.target.dataset.txt; if (t != null) { blocks[+t].text = e.target.textContent; save(); return; }
          const it = e.target.dataset.item; if (it) { const [a, b] = it.split(':').map(Number); blocks[a].items[b] = e.target.textContent; save(); }
        });
        box.addEventListener('click', (e) => {
          const flip = () => (window.Flip ? Flip.getState($$('.block', box)) : null);
          const up = e.target.closest('[data-up]'), dn = e.target.closest('[data-down]'), del = e.target.closest('[data-del]');
          if (up) { const i = +up.dataset.up; const st = flip(); [blocks[i - 1], blocks[i]] = [blocks[i], blocks[i - 1]]; save(); render(st); return; }
          if (dn) { const i = +dn.dataset.down; const st = flip(); [blocks[i + 1], blocks[i]] = [blocks[i], blocks[i + 1]]; save(); render(st); return; }
          if (del) { const i = +del.dataset.del; const removed = blocks.splice(i, 1)[0]; save(); render(); P.toast('Block removed', { icon: 'trash-2', action: 'Undo', onAction: () => { blocks.splice(i, 0, removed); save(); render(); } }); return; }
          const ai = e.target.closest('[data-additem]'); if (ai) { blocks[+ai.dataset.additem].items.push('New item'); save(); render(); return; }
          const pv = e.target.closest('[data-pickvid]'); if (pv) { pickVideo(+pv.dataset.pickvid); return; }
          if (e.target.closest('[data-insert]')) APP.popover(e.target.closest('[data-insert]'), Object.keys(BT).map((k) => `<button type="button" data-v="${k}">${ic(BT[k][1])}${BT[k][0]}</button>`).join(''), (k) => {
            const nb = k === 'heading' ? { type: k, text: 'New heading' } : k === 'text' || k === 'callout' ? { type: k, text: 'Write something helpful…' } : k === 'video' ? { type: k, media: null } : { type: k, items: ['First item'] };
            blocks.push(nb); save(); render(); const last = $$('.block', box).pop(); last.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (G && !P.reduced) gsap.from(last, { y: 30, scale: .96, duration: .6, ease: 'back.out(1.8)' }); if (k === 'video') pickVideo(blocks.length - 1);
          });
        });
        function pickVideo(i) {
          const list = L.media.filter((m) => ['approved_private', 'approved_shared', 'published_public'].includes(m.editorial) && m.processing === 'ready');
          P.modal({ title: 'Insert approved video', wide: true, html: `<p class="muted" style="margin-top:0">Reuse a clip already in your library. Public guides can only use clips with a public edition and recorded consent.</p><div class="pick-media">${list.map((m) => { const ok = publicOK(m); return `<button class="sel-tile" type="button" data-pm="${m.id}" ${ok ? '' : 'disabled'} aria-pressed="false"><img src="${A.thumb(m)}" alt=""><span class="st">${ok ? `<span class="pill pill--grass">${ic('shield-check')}Public OK</span>` : `<span class="pill pill--tomato">${ic('lock')}${m.editorial === 'published_public' ? 'No consent' : 'Private only'}</span>`}</span><span class="t">${esc(m.title)}<br><span class="muted" style="font-weight:600">${esc(A.dogNames(m.dogs))}</span></span></button>`; }).join('')}</div><div class="callout callout--info" style="margin-top:14px">${ic('info')}<div><strong>Want to use a private clip?</strong><p>Make an edited public edition and record consent first — the private original never becomes public.</p></div></div>`,
            onOpen(api) { api.el.addEventListener('click', (e) => { const b = e.target.closest('[data-pm]'); if (!b || b.disabled) return; blocks[i].media = b.dataset.pm; save(); api.close(); render(); P.toast('Video inserted — no re-upload needed', { tone: 'ok', icon: 'clapperboard' }); }); } });
        }
        $('#seo-slug', el).addEventListener('input', (e) => { seo.slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'); save(); renderChecks(); });
        $('#seo-desc', el).addEventListener('input', (e) => { seo.desc = e.target.value; save(); renderChecks(); });
        $('[data-publish]', el).addEventListener('click', () => {
          const c = checks(); const bad = c.filter((x) => !x[1]);
          if (bad.length) { P.modal({ title: 'Not quite ready', html: `<p>Fix these before publishing:</p><ul class="checklist">${bad.map(([l]) => `<li class="bad"><span class="ck">${ic('x')}</span>${l}</li>`).join('')}</ul>`, actions: [{ label: 'OK', cls: 'btn--primary' }] }); return; }
          P.db.patch('guides', g.id, { status: 'published', slug: seo.slug }); A.audit(g.status === 'published' ? 'updated guide' : 'published guide', g.title);
          const r = $('[data-publish]', el).getBoundingClientRect(); P.confetti(r.left + r.width / 2, r.top + r.height, 36);
          P.toast(`“${esc(g.title)}” is live in the Academy`, { tone: 'ok', icon: 'rocket' }); setTimeout(() => A.router.refresh(), 800);
        });
        render(); APP.popIn(el, '.block, aside .card');
      }
    };
  };
})();
