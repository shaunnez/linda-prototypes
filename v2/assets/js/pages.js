/* =========================================================
   PAWS & PLAY — inner public pages (academy, guide, blog, faq, contact, login)
   ========================================================= */
(function () {
  'use strict';
  const P = window.PAWS, L = window.LINDA, $ = P.$, $$ = P.$$;
  const page = document.body.dataset.page;
  const G = typeof window.gsap !== 'undefined';

  const guideHref = (g) => (g.slug === 'recall-101' ? '/v2/guide/recall-101.html' : `/v2/academy.html#${g.slug}`);
  function guideCard(g) {
    const t = L.technique(g.technique);
    const tag = g.slug === 'recall-101' ? 'a' : 'button';
    const attrs = tag === 'a' ? `href="${guideHref(g)}"` : `type="button" data-preview="${g.id}"`;
    return `<${tag} class="gcard" ${attrs} data-peek id="${g.slug}" style="--c:${t.color};text-align:left">
      <div class="gc-media"><img src="${L.thumb(g.clip, 40)}" alt="" loading="lazy"><video muted playsinline loop preload="none" data-src="/shared/media/video/${g.clip}.mp4" aria-hidden="true"></video>
        <div class="gc-top"><span class="pill pill--sun">${P.ic(t.icon)}${P.esc(t.name)}</span><span class="pill">${g.minutes} min</span></div>
        <span class="pill pill--ink gc-peek">${P.ic('play')}Hover to peek</span></div>
      <div class="gc-body"><h3>${P.esc(g.title)}</h3><p>${P.esc(g.subtitle)}</p>
        <div class="gc-foot"><span>${g.level}${g.slug === 'recall-101' ? '' : ' · preview'}</span><span class="gc-go">${P.ic('arrow-up-right')}</span></div></div></${tag}>`;
  }
  function previewGuide(id) {
    const g = L.guides.find((x) => x.id === id); if (!g) return;
    const t = L.technique(g.technique);
    P.modal({
      title: P.esc(g.title),
      html: `<div class="vframe ratio-16x9" style="margin-bottom:16px"><video muted playsinline autoplay loop src="/shared/media/video/${g.clip}.mp4" poster="${L.thumb(g.clip, 40)}"></video></div>
        <div class="row row--wrap" style="margin-bottom:12px">${P.techTag(t.id)}<span class="pill">${g.level}</span><span class="pill">${g.minutes} min read</span></div>
        <p class="lede" style="font-size:var(--fs-lg)">${P.esc(g.subtitle)}</p>
        <div class="callout callout--info">${P.ic('pencil-line')}<div><strong>Full guide in progress</strong><p>Linda is finishing this one. Recall 101 shows what every guide will include: steps, videos, common mistakes and a homework checklist.</p></div></div>`,
      actions: [{ label: 'Close', cls: 'btn--outline' }, { label: 'Read Recall 101', cls: 'btn--primary', icon: 'arrow-right', onClick: () => P.go('/v2/guide/recall-101.html') }]
    });
  }
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-preview]'); if (b) previewGuide(b.dataset.preview); });
  const published = L.guides.filter((g) => g.status === 'published');

  function animateIn(els) { if (!G || P.reduced || !els.length) return; gsap.fromTo(els, { y: 40, opacity: 0, rotate: () => gsap.utils.random(-4, 4) }, { y: 0, opacity: 1, rotate: 0, duration: .7, ease: 'back.out(1.6)', stagger: .06 }); }

  /* ================= ACADEMY ================= */
  if (page === 'academy') {
    const rec = published.find((g) => g.slug === 'recall-101');
    $('[data-feature]').innerHTML = `<a class="feature-guide" href="${guideHref(rec)}" data-reveal>
      <div class="fg-media"><video muted playsinline autoplay loop preload="metadata" poster="${L.thumb(rec.clip, 40)}" src="/shared/media/video/${rec.clip}.mp4" aria-hidden="true"></video><span class="sticker sticker--tomato">${P.ic('star')}Start here</span></div>
      <div class="fg-body"><span class="pill pill--lg" style="justify-self:start">${P.ic('megaphone')}${P.esc(L.technique(rec.technique).name)} · ${rec.level}</span><h2>${P.esc(rec.title)}</h2><p class="lede" style="margin:0">${P.esc(rec.subtitle)}</p>
      <div class="row row--wrap"><span class="btn btn--ink btn--lg">Read the guide${P.ic('arrow-right')}</span><span class="small" style="font-weight:700">${rec.minutes} min · ${rec.sections.length} sections · homework checklist</span></div></div></a>`;
    let filter = 'all', q = '';
    const used = L.techniques.filter((t) => L.guides.some((g) => g.technique === t.id));
    $('[data-filters]').innerHTML = `<button class="chip" aria-pressed="true" data-f="all">All guides</button>` + L.techniques.map((t) => `<button class="chip" aria-pressed="false" data-f="${t.id}"><span class="swatch" style="background:${t.color}"></span>${P.esc(t.name)}</button>`).join('');
    function render() {
      const list = published.filter((g) => (filter === 'all' || g.technique === filter) && (!q || (g.title + ' ' + g.subtitle + ' ' + L.technique(g.technique).name).toLowerCase().includes(q)));
      $('[data-count]').textContent = list.length;
      const grid = $('[data-grid]');
      if (!list.length) {
        const t = L.technique(filter);
        grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="em-ico">${P.ic('pencil-line')}</div><h3>${t && !q ? `Linda’s still writing the ${P.esc(t.name.toLowerCase())} guide` : 'No guides match that search'}</h3><p>${t && !q ? 'Check back soon — or ask Linda about it at your next session.' : 'Try a different word, or browse all guides.'}</p><button class="btn btn--sm" type="button" data-reset>Show all guides</button></div>`;
      } else grid.innerHTML = list.map(guideCard).join('');
      P.icons(); P.peekCards(grid); $$('.gcard', grid).forEach((c) => P.tilt(c, 6)); animateIn($$('.gcard, .empty', grid));
    }
    $('[data-filters]').addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (!b) return; filter = b.dataset.f; $$('[data-f]').forEach((x) => x.setAttribute('aria-pressed', x === b)); render(); });
    $('[data-search]').addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); render(); });
    $('[data-grid]').addEventListener('click', (e) => { if (e.target.closest('[data-reset]')) { filter = 'all'; q = ''; $('[data-search]').value = ''; $$('[data-f]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.f === 'all')); render(); } });
    render();
    $('[data-techs]').innerHTML = L.techniques.map((t) => { const n = published.filter((g) => g.technique === t.id).length; return `<button class="tech" type="button" data-tech="${t.id}" style="--c:${t.color}"><span class="ti">${P.ic(t.icon)}</span><span><strong>${P.esc(t.name)}</strong><span>${P.esc(t.blurb)}</span><br><span class="pill pill--soft" style="margin-top:8px">${n ? n + ' guide' + (n > 1 ? 's' : '') : 'Coming soon'}</span></span></button>`; }).join('');
    $('[data-techs]').addEventListener('click', (e) => { const b = e.target.closest('[data-tech]'); if (!b) return; const chip = $(`[data-f="${b.dataset.tech}"]`); chip && chip.click(); const top = $('#all-title'); if (P.lenis) P.lenis.scrollTo(top, { offset: -120 }); else top.scrollIntoView({ behavior: 'smooth' }); });
    P.icons();
    // deep link from home (#slug)
    const hash = decodeURIComponent(location.hash.slice(1));
    if (hash) { const g = L.guides.find((x) => x.slug === hash); if (g) setTimeout(() => { const el = document.getElementById(hash); if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('is-hl'); } previewGuide(g.id); }, 600); }
  }

  /* ================= GUIDE DETAIL ================= */
  if (page === 'guide') {
    const g = L.guides.find((x) => x.slug === 'recall-101');
    const t = L.technique(g.technique);
    $('[data-g="crumb"]').textContent = g.title;
    $('[data-g="subtitle"]').textContent = g.subtitle;
    $('[data-g="meta"]').innerHTML = `${P.techTag(t.id)}<span class="pill pill--lg">${P.ic('signal')}${g.level}</span><span class="pill pill--lg">${P.ic('clock')}${g.minutes} min read</span><span class="pill pill--lg pill--sun">${P.ic('book-check')}Assigned to ${g.assigned} households</span>`;
    const hv = $('[data-g="video"]'); hv.poster = L.img(g.clip, 40); hv.src = `/shared/media/video/${g.clip}.mp4`;
    const ICON = { 'Overview': 'compass', 'Prerequisites & safety': 'shield-check', 'Choosing your cue': 'megaphone', 'Step by step': 'footprints', 'Reward timing': 'timer', 'Common mistakes': 'circle-x', 'Harder environments': 'trees', 'Troubleshooting': 'wrench' };
    const secs = g.sections.map((s, i) => ({ ...s, id: 's-' + i }));
    const extra = [{ id: 's-videos', h: 'Video examples' }, { id: 's-homework', h: 'Homework checklist' }, { id: 's-faq', h: 'FAQ' }];
    const all = secs.concat(extra);
    $('[data-g="toc"]').innerHTML = all.map((s, i) => `<li><a href="#${s.id}" data-toc="${s.id}"><span class="n">${i + 1}</span>${P.esc(s.h)}</a></li>`).join('');
    $('[data-g="readtime"]').textContent = `${g.minutes} min · ${all.length} sections`;
    const examples = [
      { clip: g.clip, title: 'Recall from across the park', note: 'Public edition — handler consent recorded. Watch for the turn-and-run at the halfway mark.' },
      ...published.filter((x) => x.technique === 't-focus').map((x) => ({ clip: x.clip, title: 'Foundation: the check-in game', note: 'Eye contact is the building block of a great recall.' }))
    ];
    const body = secs.map((s, i) => {
      let inner = '';
      if (s.body) inner += `<p>${P.esc(s.body)}</p>`;
      if (s.h === 'Prerequisites & safety') inner = `<div class="callout callout--warn" style="margin-bottom:14px">${P.ic('triangle-alert')}<div><strong>Safety first</strong><p>${P.esc(s.body)}</p></div></div>`;
      if (s.steps) inner += `<ol class="gsteps">${s.steps.map((x) => `<li data-reveal>${P.esc(x)}</li>`).join('')}</ol>`;
      if (s.list) inner += `<ul class="mistakes">${s.list.map((x) => `<li data-reveal><span class="x">${P.ic('x')}</span>${P.esc(x)}</li>`).join('')}</ul>`;
      return `<section class="gsec" id="${s.id}"><h2><span class="gn">${P.ic(ICON[s.h] || 'paw-print')}</span>${P.esc(s.h)}</h2>${inner}</section>`;
    }).join('') + `
      <section class="gsec" id="s-videos"><h2><span class="gn">${P.ic('clapperboard')}</span>Video examples</h2>
        <p>Trainer-approved clips. Only clips with recorded publication consent ever appear on public guides.</p>
        <div class="examples">${examples.map((x) => `<figure class="example" style="margin:0"><div class="vframe"><video muted playsinline loop preload="none" data-lazy data-src="/shared/media/video/${x.clip}.mp4" poster="${L.thumb(x.clip, 40)}" aria-label="${P.esc(x.title)}"></video></div><figcaption class="eb"><b>${P.esc(x.title)}</b><span class="small muted">${P.esc(x.note)}</span></figcaption></figure>`).join('')}</div>
      </section>
      <section class="gsec" id="s-homework"><div class="homework-card">
        <div class="hw-top"><div><span class="pill pill--sun">${P.ic('list-checks')}This week</span><h2 style="margin:12px 0 0;font-size:var(--fs-2xl)">Homework checklist</h2></div><div class="ring" data-ring><b data-ring-v>0%</b></div></div>
        <div class="hw-list">${g.homework.map((h, i) => `<label class="check"><input type="checkbox" data-hw="${i}"><span class="box">${P.ic('check')}</span><span class="txt strike">${P.esc(h)}</span></label>`).join('')}</div>
        <div class="hw-actions"><button class="btn btn--sun" type="button" data-print>${P.ic('printer')}Print checklist</button><a class="btn" href="/v2/login.html">${P.ic('book-check')}Save to my portal</a><button class="btn btn--ghost" type="button" data-hw-reset style="color:#fff">${P.ic('rotate-ccw')}Reset</button></div>
      </div></section>
      <section class="gsec" id="s-faq"><h2><span class="gn">${P.ic('message-circle-question')}</span>FAQ</h2>${(g.faqs || []).map((f) => `<div class="acc"><button class="acc-btn" type="button" aria-expanded="false">${P.esc(f.q)}<span class="acc-ico">${P.ic('plus')}</span></button><div class="acc-panel"><div><p>${P.esc(f.a)}</p></div></div></div>`).join('')}</section>`;
    $('[data-g="body"]').innerHTML = body;
    $('[data-g="related"]').innerHTML = published.filter((x) => x.id !== g.id).slice(0, 3).map(guideCard).join('');
    P.icons(); P.lazyVideos(document); P.peekCards(document);
    // homework ticks (persist)
    const hwKey = 'hw:' + g.id; const state = P.store.get(hwKey, {});
    const boxes = $$('[data-hw]'); const ring = $('[data-ring]'), rv = $('[data-ring-v]');
    function hwUpdate(burst) {
      const done = boxes.filter((b) => b.checked).length, pct = Math.round(done / boxes.length * 100);
      rv.textContent = pct + '%';
      if (G && !P.reduced) { const o = { v: parseFloat(ring.style.getPropertyValue('--v')) || 0 }; gsap.to(o, { v: pct, duration: .6, ease: 'power2.out', onUpdate: () => ring.style.setProperty('--v', o.v) }); } else ring.style.setProperty('--v', pct);
      if (burst && pct === 100) { const r = ring.getBoundingClientRect(); P.confetti(r.left + r.width / 2, r.top + r.height / 2, 40); P.toast('Homework done — what a good human! 🐾', { tone: 'ok', icon: 'party-popper' }); }
    }
    boxes.forEach((b) => { b.checked = !!state[b.dataset.hw]; b.addEventListener('change', () => { state[b.dataset.hw] = b.checked; P.store.set(hwKey, state); hwUpdate(true); if (b.checked && G && !P.reduced) gsap.fromTo(b.nextElementSibling, { scale: .6 }, { scale: 1, duration: .6, ease: 'elastic.out(1.2,.4)' }); }); });
    hwUpdate(false);
    $('[data-print]').addEventListener('click', () => window.print());
    $('[data-hw-reset]').addEventListener('click', () => { boxes.forEach((b) => (b.checked = false)); P.store.set(hwKey, {}); hwUpdate(false); });
    // TOC scrollspy + reading bar
    const bar = $('.reading-bar'), tocbar = $('[data-g="tocbar"]');
    const tocLinks = $$('[data-toc]');
    function spy() {
      const h = document.documentElement; const p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
      bar.style.width = (p * 100) + '%'; tocbar.style.width = (p * 100) + '%';
      let curId = all[0].id; all.forEach((s) => { const el = document.getElementById(s.id); if (el && el.getBoundingClientRect().top < 160) curId = s.id; });
      tocLinks.forEach((a) => a.classList.toggle('is-on', a.dataset.toc === curId));
    }
    window.addEventListener('scroll', spy, { passive: true }); spy();
  }

  /* ================= BLOG ================= */
  if (page === 'blog') {
    const posts = L.posts.slice().sort((a, b) => b.date.localeCompare(a.date));
    const f = posts[0];
    const postHref = (p) => (p.id === 'p-1' ? '/v2/blog/duck-distraction.html' : null);
    $('[data-feature]').innerHTML = `<a class="post-feature" href="${postHref(f) || '/v2/blog/duck-distraction.html'}" data-reveal>
      <div class="pf-img"><img src="${f.img}" alt=""></div>
      <div class="pf-body"><span class="pill pill--ink" style="justify-self:start">${P.ic('sparkles')}Latest</span><h2>${P.esc(f.title)}</h2><p style="margin:0;font-size:var(--fs-lg)">${P.esc(f.excerpt)}</p><div class="post-meta">${L.fmtDate(f.date, { day: 'numeric', month: 'long', year: 'numeric' })} · ${f.minutes} min read</div><span class="btn btn--ink" style="justify-self:start">Read article${P.ic('arrow-right')}</span></div></a>`;
    let mode = 'new';
    function render() {
      let list = posts.slice(1); if (mode === 'quick') list = list.slice().sort((a, b) => a.minutes - b.minutes);
      $('[data-posts]').innerHTML = list.map((p) => { const href = postHref(p); const tag = href ? 'a' : 'button'; return `<${tag} class="gcard" ${href ? `href="${href}"` : `type="button" data-post="${p.id}"`} style="text-align:left">
        <div class="gc-media"><img src="${p.img.replace('/img/', '/thumb/')}" alt="" loading="lazy"><div class="gc-top"><span class="pill">${p.minutes} min read</span></div></div>
        <div class="gc-body"><span class="small muted" style="font-weight:700">${L.fmtDate(p.date, { day: 'numeric', month: 'long', year: 'numeric' })}</span><h3>${P.esc(p.title)}</h3><p>${P.esc(p.excerpt)}</p><div class="gc-foot"><span>Read</span><span class="gc-go">${P.ic('arrow-up-right')}</span></div></div></${tag}>`; }).join('');
      P.icons(); $$('[data-posts] .gcard').forEach((c) => P.tilt(c, 5)); animateIn($$('[data-posts] .gcard'));
    }
    render();
    $('[data-sort]').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (!b) return; mode = b.dataset.v; $$('[data-sort] .chip').forEach((x) => x.setAttribute('aria-pressed', x === b)); render(); });
    $('[data-posts]').addEventListener('click', (e) => {
      const b = e.target.closest('[data-post]'); if (!b) return; const p = L.posts.find((x) => x.id === b.dataset.post);
      P.modal({ title: P.esc(p.title), html: `<div class="vframe ratio-16x9" style="margin-bottom:16px"><img src="${p.img}" alt=""></div><p class="lede" style="font-size:var(--fs-lg)">${P.esc(p.excerpt)}</p><div class="callout callout--info">${P.ic('pencil-line')}<div><strong>Full article coming soon</strong><p>This prototype includes one complete article as an example layout.</p></div></div>`, actions: [{ label: 'Close', cls: 'btn--outline' }, { label: 'Read the example article', cls: 'btn--primary', onClick: () => P.go('/v2/blog/duck-distraction.html') }] });
    });
    const nf = $('[data-blog-news]'); nf.addEventListener('submit', (e) => { e.preventDefault(); const i = nf.querySelector('input'); if (!/^\S+@\S+\.\S+$/.test(i.value)) { P.toast('That email doesn’t look quite right', { tone: 'err' }); return; } i.value = ''; P.toast('Subscribed (demo) — ka pai!', { tone: 'ok', icon: 'mail-check' }); });
  }

  /* ================= ARTICLE ================= */
  if (page === 'article') {
    const p = L.posts.find((x) => x.id === 'p-1');
    $('[data-a="img"]').src = p.img;
    $('[data-a="meta"]').innerHTML = `<span class="pill pill--sun">${P.ic('calendar')}${L.fmtDate(p.date, { day: 'numeric', month: 'long', year: 'numeric' })}</span><span class="pill">${P.ic('clock')}${p.minutes} min read</span>${P.techTag('t-recall')}`;
    $('[data-related]').innerHTML = L.posts.filter((x) => x.id !== p.id).slice(0, 3).map((x) => `<a class="gcard" href="/v2/blog.html"><div class="gc-media"><img src="${x.img.replace('/img/', '/thumb/')}" alt="" loading="lazy"></div><div class="gc-body"><h3>${P.esc(x.title)}</h3><p>${P.esc(x.excerpt)}</p><div class="gc-foot"><span>${x.minutes} min</span><span class="gc-go">${P.ic('arrow-up-right')}</span></div></div></a>`).join('');
    P.icons();
    const bar = $('.reading-bar');
    window.addEventListener('scroll', () => { const h = document.documentElement; bar.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight || 1) * 100) + '%'; }, { passive: true });
    $('[data-copy]').addEventListener('click', () => { try { navigator.clipboard.writeText(location.href); } catch (e) { /* noop */ } P.toast('Link copied', { tone: 'ok', icon: 'link' }); });
    $('[data-share]').addEventListener('click', () => { if (navigator.share) navigator.share({ title: p.title, url: location.href }).catch(() => {}); else P.toast('Sharing isn’t available in this browser — link copied instead', { icon: 'share-2' }); });
    if (G && !P.reduced && window.ScrollTrigger) gsap.from('.dladder .rung .bar i', { width: 0, duration: 1, ease: 'expo.out', stagger: .1, scrollTrigger: { trigger: '.dladder', start: 'top 80%', once: true } });
  }

  /* ================= FAQ ================= */
  if (page === 'faq') {
    const cats = [
      { id: 'training', name: 'Training with Linda', icon: 'dog', items: L.faqs },
      { id: 'portal', name: 'Portal & privacy', icon: 'shield-check', items: [
        { q: 'Who can see a video Linda records?', a: 'Only Linda, until she approves it. She then chooses the audience — your household, a training group or (only with your separate consent) a public guide.' },
        { q: 'Does AI decide what gets shared?', a: 'No. An AI helper drafts titles, notes and tags so Linda saves time, but it never publishes, grants access or contacts anyone. Linda reviews everything.' },
        { q: 'Can I remove someone from my household?', a: 'Yes. Household owners can manage members. Removed members lose access to playback straight away — though files that were already downloaded or sent can’t be recalled.' },
        { q: 'How do I sign in?', a: 'With a magic link sent to your email — no passwords to remember. Each household member signs in with their own email.' }
      ] },
      { id: 'whatsapp', name: 'WhatsApp & sharing', icon: 'message-circle', items: [
        { q: 'Will Linda send videos over WhatsApp?', a: 'Sometimes. Linda sends messages from her own phone. Usually it’s a secure portal link; occasionally a video file. Links only play for people with access.' },
        { q: 'Why does the portal never say “delivered” or “read”?', a: 'Because Linda sends WhatsApp messages herself, the platform can’t see what happens next — so it never pretends to. It only records that a share was prepared or that Linda confirmed sending it.' },
        { q: 'Can I forward a video I received as a file?', a: 'Files sent outside the portal are copies that can’t be revoked later, which is why Linda defaults to secure links. Please check with Linda before sharing training clips publicly.' }
      ] }
    ];
    let cat = 'all', q = '';
    $('[data-faq-cats]').innerHTML = `<button class="chip" aria-pressed="true" data-c="all">All</button>` + cats.map((c) => `<button class="chip" aria-pressed="false" data-c="${c.id}">${P.ic(c.icon)}${c.name}</button>`).join('');
    const hl = (s) => { const e = P.esc(s); if (!q) return e; return e.replace(new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); };
    function render() {
      const html = cats.filter((c) => cat === 'all' || c.id === cat).map((c) => {
        const items = c.items.filter((f) => !q || (f.q + ' ' + f.a).toLowerCase().includes(q));
        if (!items.length) return '';
        return `<section class="faq-cat"><h2><span class="ci">${P.ic(c.icon)}</span>${c.name}</h2>${items.map((f) => `<div class="acc"><button class="acc-btn" type="button" aria-expanded="false">${hl(f.q)}<span class="acc-ico">${P.ic('plus')}</span></button><div class="acc-panel"><div><p>${f.a.startsWith('Placeholder') ? `<span class="ph">${P.ic('pencil')}To be confirmed by Linda</span> ` + hl(f.a.replace(/^Placeholder — /, '')) : hl(f.a)}</p></div></div></div>`).join('')}</section>`;
      }).join('');
      $('[data-faq]').innerHTML = html || `<div class="empty"><div class="em-ico">${P.ic('search-x')}</div><h3>No answers for “${P.esc(q)}”</h3><p>Try another word — or ask Linda directly.</p><a class="btn btn--sm" href="/v2/contact.html">Ask Linda</a></div>`;
      P.icons(); animateIn($$('[data-faq] .acc'));
    }
    $('[data-faq-cats]').addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (!b) return; cat = b.dataset.c; $$('[data-c]').forEach((x) => x.setAttribute('aria-pressed', x === b)); render(); });
    $('[data-faq-search]').addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); render(); if (q) $$('[data-faq] .acc').slice(0, 1).forEach((a) => a.querySelector('.acc-btn').click()); });
    render();
  }

  /* ================= CONTACT ================= */
  if (page === 'contact') {
    $('[data-topics]').innerHTML = L.techniques.map((t) => `<button type="button" class="chip" aria-pressed="false" data-topic="${t.id}">${P.ic(t.icon)}${P.esc(t.name)}</button>`).join('') + `<button type="button" class="chip" aria-pressed="false" data-topic="puppy">${P.ic('baby')}Puppy basics</button>`;
    $('[data-topics]').addEventListener('click', (e) => { const b = e.target.closest('[data-topic]'); if (b) b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); });
    $('[data-pref]').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('[data-pref] button').forEach((x) => x.setAttribute('aria-pressed', x === b)); });
    const em = $('[data-brand="email"]'); em.href = 'mailto:' + L.brand.email; em.lastElementChild.textContent = L.brand.email;
    const ph = $('[data-brand="phone"]'); ph.href = 'tel:' + L.brand.phone.replace(/\s/g, ''); ph.lastElementChild.textContent = L.brand.phone;
    P.icons();
    const form = $('[data-contact]');
    const rules = { name: (v) => v.trim().length > 1, email: (v) => /^\S+@\S+\.\S+$/.test(v), phone: (v) => !v || /^[+\d\s()-]{6,}$/.test(v), dog: (v) => v.trim().length > 0, msg: (v) => v.trim().length > 4 };
    function check(input) { const r = rules[input.name]; if (!r) return true; const ok = r(input.value); input.closest('.field').classList.toggle('is-error', !ok); input.setAttribute('aria-invalid', !ok); return ok; }
    Object.keys(rules).forEach((n) => { const i = form.elements[n]; i.addEventListener('blur', () => i.value && check(i)); i.addEventListener('input', () => i.closest('.field').classList.contains('is-error') && check(i)); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true; let first = null;
      Object.keys(rules).forEach((n) => { const i = form.elements[n]; if (!check(i)) { ok = false; first = first || i; } });
      const c = form.elements.consent; const ce = $('[data-consent-err]'); ce.classList.toggle('is-error', !c.checked); if (!c.checked) { ok = false; first = first || c; }
      if (!ok) { first.focus(); if (G && !P.reduced) gsap.fromTo('.contact-form', { x: -10 }, { x: 0, duration: .5, ease: 'elastic.out(1.4,.2)' }); P.toast('A couple of things need a look', { tone: 'err' }); return; }
      const btn = form.querySelector('[type=submit]'); btn.disabled = true; btn.innerHTML = `${P.ic('loader-circle', 'spin')}Sending…`; P.icons();
      setTimeout(() => {
        const name = form.elements.name.value.trim().split(' ')[0], dog = form.elements.dog.value.trim();
        const card = $('.contact-form');
        card.innerHTML = `<div class="success" aria-live="polite"><div class="big-paw">${P.svg.paw()}</div><h2>Thanks, ${P.esc(name)}!</h2><p class="lede" style="margin:0 auto 22px">Linda will be in touch about ${P.esc(dog)} soon. In the meantime, have a browse of the free guides.</p><div class="row row--wrap" style="justify-content:center"><a class="btn btn--primary" href="/v2/academy.html">${P.ic('graduation-cap')}Training Academy</a><a class="btn" href="/v2/index.html">Back home</a></div></div>`;
        P.icons();
        const r = card.getBoundingClientRect(); P.confetti(r.left + r.width / 2, r.top + 120, 44);
        if (G && !P.reduced) { gsap.from('.success .big-paw', { scale: 0, rotate: -180, duration: 1, ease: 'elastic.out(1,.45)' }); gsap.from('.success > *:not(.big-paw)', { y: 30, opacity: 0, stagger: .1, delay: .2 }); }
      }, 1100);
    });
  }

  /* ================= LOGIN ================= */
  if (page === 'login') {
    let who = 'client';
    const form = $('[data-step="email"]'), sent = $('[data-step="sent"]'), input = $('#l-email');
    const DEMO = { client: L.user(L.currentClient).email, trainer: L.user('u-linda').email };
    $('[data-who]').addEventListener('click', (e) => {
      const b = e.target.closest('[data-v]'); if (!b) return; who = b.dataset.v;
      $$('[data-who] button').forEach((x) => { x.setAttribute('aria-pressed', x === b); x.setAttribute('aria-selected', x === b); });
      input.placeholder = DEMO[who]; $('[data-btn-label]').textContent = who === 'trainer' ? 'Send trainer sign-in link' : 'Send magic link';
      if (!form.classList.contains('is-on')) back();
    });
    $('[data-fill]').addEventListener('click', () => { input.value = DEMO[who]; input.focus(); });
    function show(step) { [form, sent].forEach((s) => s.classList.toggle('is-on', s === step)); if (G && !P.reduced) gsap.from(step.children, { y: 24, opacity: 0, duration: .6, ease: 'back.out(1.6)', stagger: .06 }); }
    function back() { show(form); input.focus(); }
    form.addEventListener('submit', (e) => {
      e.preventDefault(); const f = input.closest('.field');
      if (!/^\S+@\S+\.\S+$/.test(input.value)) { f.classList.add('is-error'); input.focus(); if (G && !P.reduced) gsap.fromTo('.login-card', { x: -10 }, { x: 0, duration: .5, ease: 'elastic.out(1.4,.2)' }); return; }
      f.classList.remove('is-error');
      const btn = form.querySelector('[type=submit]'); const orig = btn.innerHTML; btn.disabled = true; btn.innerHTML = `${P.ic('loader-circle', 'spin')}Sending…`; P.icons();
      setTimeout(() => {
        btn.disabled = false; btn.innerHTML = orig; P.icons();
        $('[data-sent-to]').textContent = input.value;
        $('[data-dest-label]').textContent = who === 'trainer' ? 'trainer workspace' : 'client portal';
        const a = $('[data-open-link]'); a.href = who === 'trainer' ? '/v2/admin/index.html' : '/v2/portal/index.html';
        show(sent);
        if (G && !P.reduced) gsap.fromTo('.envelope', { scale: 0, rotate: -40 }, { scale: 1, rotate: 0, duration: 1, ease: 'elastic.out(1,.4)' });
      }, 900);
    });
    $('[data-back]').addEventListener('click', back);
    let cool = 0;
    $('[data-resend]').addEventListener('click', (e) => {
      if (cool) return; const b = e.currentTarget; cool = 30; P.toast('New link sent (demo)', { tone: 'ok', icon: 'mail-check' });
      const iv = setInterval(() => { cool--; b.textContent = cool ? `Resend in ${cool}s` : 'Resend'; if (!cool) clearInterval(iv); }, 1000);
    });
    $('[data-open-link]').addEventListener('click', () => { P.store.set('signedIn', who); });
  }

  /* ================= shared: accordions ================= */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.acc-btn'); if (!b) return;
    const acc = b.closest('.acc'); const open = !acc.classList.contains('is-open');
    acc.classList.toggle('is-open', open); b.setAttribute('aria-expanded', open);
    if (open && G && !P.reduced) gsap.fromTo(acc, { scale: .985 }, { scale: 1, duration: .6, ease: 'elastic.out(1,.4)' });
  });
  P.icons();
})();
