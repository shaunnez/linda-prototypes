/* =========================================================
   PAWS & PLAY — admin: review queue, review detail (AI panel,
   trim, cover, timestamps, associations) & approve/audience
   ========================================================= */
(function () {
  'use strict';
  const A = window.ADMIN, P = window.PAWS, L = window.LINDA, APP = window.APP, $ = P.$, $$ = P.$$;
  const G = typeof window.gsap !== 'undefined';
  const ic = P.ic, esc = P.esc;

  /* ================= QUEUE ================= */
  A.V.review = ({ query }) => {
    const tab = query.tab || 'needs';
    const sets = {
      needs: L.media.filter((m) => m.editorial === 'needs_review'),
      processing: L.media.filter((m) => m.editorial === 'draft' && m.processing !== 'cancelled'),
      done: L.media.filter((m) => ['approved_private', 'approved_shared', 'published_public'].includes(m.editorial)).sort((a, b) => b.created.localeCompare(a.created)).slice(0, 8)
    };
    const list = sets[tab] || sets.needs;
    const card = (m) => {
      const s = L.session(m.session); const multi = m.dogs.length > 1 || (s && s.dogs.length > 1);
      return `<div class="swipe" data-sw="${m.id}"><div class="sw-under" style="background:var(--sun)"><span class="l">${ic('badge-check')}Open review</span><span class="l">${ic('clock')}Later</span></div><a class="rq-card sw-top" href="#/review/${m.id}">
        <div class="rq-media"><img src="${A.thumb(m)}" alt=""><span class="pill pill--ink" style="position:absolute;right:8px;bottom:8px">${m.duration}</span></div>
        <div class="rq-body"><div class="row row--wrap" style="gap:6px">${P.status(m.editorial)}${m.processing !== 'ready' ? P.status(m.processing) : ''}${m.source === 'whatsapp_archive' ? `<span class="pill pill--grass">${ic('message-circle')}From WhatsApp</span>` : ''}${multi ? `<span class="pill pill--tomato">${ic('alert-triangle')}Confirm dogs</span>` : ''}</div>
          <h3>${esc(m.ai && m.editorial === 'needs_review' ? m.title : m.title)}</h3>
          <span class="small muted" style="font-weight:600">${esc(A.dogNames(m.dogs))} · ${s ? esc(s.title) : 'No session'} · ${APP.ago(m.created)}</span>
          ${m.ai ? `<div class="ai-line">${ic('sparkles', 'inline-ic')}AI confidence<div class="progress progress--sm ${m.ai.confidence < .6 ? 'progress--tomato' : m.ai.confidence < .8 ? 'progress--sun' : ''}"><i style="--v:${Math.round(m.ai.confidence * 100)}%"></i></div>${Math.round(m.ai.confidence * 100)}%</div>` : `<div class="ai-line muted">${ic('loader-circle', 'spin inline-ic')}AI draft waits for processing</div>`}
        </div></a></div>`;
    };
    return {
      title: 'Review queue', short: 'Review',
      html: A.vhead('AI drafts · you decide', 'badge-check', 'Review queue', 'Nothing is visible to clients until you approve it and choose an audience.') +
        `<div class="tabs" role="tablist" style="margin-bottom:20px">${[['needs', 'Needs review'], ['processing', 'Drafts & processing'], ['done', 'Recently approved']].map(([k, l]) => `<a href="#/review?tab=${k}" role="tab" aria-selected="${tab === k}">${l} <span class="count" style="margin-left:6px">${sets[k].length}</span></a>`).join('')}</div>
        <p class="swipe-hint" style="display:none">${ic('hand')}Swipe a card right to open it</p>
        <div class="grid" style="gap:16px" data-q>${list.map(card).join('') || A.empty('party-popper', tab === 'needs' ? 'All caught up!' : 'Nothing here', tab === 'needs' ? 'Every clip has been reviewed. Go train some dogs 🐾' : 'New recordings show up here while they process.', `<a class="btn" href="#/camera">${ic('circle-dot')}Record</a>`)}</div>`,
      mount(el) {
        $$('[data-sw]', el).forEach((row) => APP.swipe(row, { onRight: (r) => A.go('/review/' + r.dataset.sw), onLeft: (r) => { const t = $('.sw-top', r); gsap.to(t, { x: 0, rotate: 0, duration: .6, ease: 'elastic.out(1,.5)', clearProps: 'transform' }); P.toast('Left in the queue for later', { icon: 'clock', ms: 1500 }); } }));
        if (matchMedia('(hover: none)').matches) { const h = $('.swipe-hint', el); if (h) h.style.display = 'flex'; }
        APP.popIn(el, '.swipe');
      }
    };
  };

  /* ================= DETAIL ================= */
  A.V.reviewDetail = ({ params }) => {
    const m = L.mediaItem(params.id);
    if (!m) return A.empty('video-off', 'Clip not found', 'It may have been deleted.', '<a class="btn" href="#/review">Back to queue</a>');
    const sess = L.session(m.session); const hh = A.hhOfMedia(m);
    const hhDogs = hh ? L.dogsFor(hh.id) : [];
    const multi = (sess && sess.dogs.length > 1) || m.dogs.length > 1;
    const draft = { title: m.title, notes: m.notes || '', techniques: m.techniques.slice(), dogs: m.dogs.slice(), session: m.session, timestamps: (m.timestamps || []).map((t) => ({ ...t })), cover: m.coverPct || 40, trim: m.trim || [0, 1], confirmed: !multi, aiState: {} };
    const nominal = P.toSec(m.duration) || 30;
    const ready = m.processing === 'ready';
    const stills = [15, 40, 65, 90, 15, 40, 65, 90].map((p) => L.thumb(m.clip, p));

    function aiHTML(ai, loading) {
      if (loading || !ai) return `<div class="ai-skel">${'<div class="skel"></div>'.repeat(4)}</div><p class="small muted" style="margin:10px 0 0">${ready ? 'Generating a draft from the transcript and sampled frames…' : 'AI runs once Stream finishes processing — it never blocks the video.'}</p>`;
      return `<div class="ai-field" data-af="title"><div class="af-k">Suggested title<span class="af-acts"><button class="ok" type="button" data-acc="title" aria-label="Accept title">${ic('check')}</button><button class="no" type="button" data-rej="title" aria-label="Reject title">${ic('x')}</button></span></div><div class="af-v">${esc(ai.title)}</div></div>
        <div class="ai-field" data-af="summary"><div class="af-k">Coaching summary<span class="af-acts"><button class="ok" type="button" data-acc="summary" aria-label="Accept summary">${ic('check')}</button><button class="no" type="button" data-rej="summary" aria-label="Reject summary">${ic('x')}</button></span></div><div class="af-v">${esc(ai.summary)}</div></div>
        <div class="ai-field"><div class="af-k">Technique tags <span>tap to apply</span></div>${ai.tags.map((t) => { const T = L.technique(t.id); return `<div class="conf" style="--c:${T.color}"><span class="tq" style="--c:${T.color}"><i></i>${esc(T.name)}</span><span class="cv">${Math.round(t.c * 100)}%</span><button class="tg-btn" type="button" data-tag="${t.id}" aria-pressed="${draft.techniques.includes(t.id)}">${draft.techniques.includes(t.id) ? 'Applied' : 'Apply'}</button><span class="cbar"><i style="width:${t.c * 100}%"></i></span></div>`; }).join('')}</div>
        <div class="ai-field"><div class="af-k">Transcript</div><div class="af-v small">${ai.transcript ? esc(ai.transcript) : `<span class="muted">${ic('mic-off', 'inline-ic')} No speech detected — nothing invented.</span>`}</div></div>
        <div class="ai-field"><div class="af-k">Evidence</div><ul class="evidence">${ai.evidence.map((e) => `<li>${ic(/No speech|Ambiguous/.test(e) ? 'alert-circle' : 'file-search')}${esc(e)}</li>`).join('')}</ul></div>
        <p class="xsmall muted" style="margin:6px 0 0">AI never publishes, grants access, identifies people or changes which dog this is.</p>`;
    }

    return {
      title: 'Review · ' + m.title, short: 'Review',
      html: `<a class="back-link" href="#/review">${ic('arrow-left')}Review queue</a>
      <div class="vhead" style="margin-top:4px"><div><div class="row row--wrap" style="gap:6px">${P.status(m.editorial)}${P.status(m.processing)}${m.source === 'whatsapp_archive' ? `<span class="pill pill--grass">${ic('message-circle')}WhatsApp archive</span>` : `<span class="pill">${ic(m.source === 'pwa_library' ? 'images' : 'smartphone')}${m.source === 'pwa_library' ? 'Library upload' : 'PWA camera'}</span>`}${m.parent ? `<span class="pill">${ic('scissors')}Derived clip</span>` : ''}</div><h1 style="font-size:clamp(1.8rem,1.3rem + 2vw,2.8rem)">${esc(m.title)}</h1><p class="sub">${esc(A.dogNames(m.dogs))} · ${hh ? esc(hh.name) : ''} · recorded ${APP.when(m.created)}</p></div>
        <div class="acts"><button class="btn btn--outline" type="button" data-archive>${ic('archive')}Archive</button></div></div>
      ${m.error ? `<div class="callout callout--warn" style="margin-bottom:18px">${ic('alert-triangle')}<div><strong>Upload problem</strong><p>${esc(m.error)}</p><a class="btn btn--sm" href="#/uploads" style="margin-top:8px">Go to uploads</a></div></div>` : ''}
      <div class="rv-layout">
        <div class="rv-col">
          ${ready ? `<div data-player></div>` : `<div class="vframe ratio-16x9" style="display:grid;place-items:center;position:relative"><img src="${A.thumb(m)}" alt="" style="position:absolute;inset:0;opacity:.35"><div style="position:relative;color:#fff;text-align:center;font-weight:700">${ic('loader-circle', 'spin')}<br>Stream is ${P.statusLabel(m.processing).toLowerCase()}…</div></div>`}
          <section class="card trim"><div class="card-head"><h2>${ic('scissors', 'inline-ic')} Trim</h2><span class="small muted" style="font-weight:700">Creates a separate private clip — the original is kept</span></div>
            <div class="filmstrip" data-strip>${stills.map((s) => `<img src="${s}" alt="">`).join('')}<div class="trim-shade" data-sh-l></div><div class="trim-shade" data-sh-r></div><div class="trim-sel" data-sel></div><div class="trim-play" data-ph></div><div class="trim-h" data-h="in" role="slider" tabindex="0" aria-label="Trim start"></div><div class="trim-h" data-h="out" role="slider" tabindex="0" aria-label="Trim end"></div></div>
            <div class="trim-times"><span>In <b data-tin>0:00</b></span><span data-tlen></span><span>Out <b data-tout>${m.duration}</b></span></div>
            <div class="row row--wrap" style="margin-top:14px"><button class="btn btn--sm" type="button" data-tprev ${ready ? '' : 'disabled'}>${ic('play')}Preview trim</button><button class="btn btn--sm btn--sun" type="button" data-tclip ${ready ? '' : 'disabled'}>${ic('scissors')}Create derived clip</button><button class="btn btn--sm btn--ghost" type="button" data-treset>Reset</button></div></section>
          <section class="card"><div class="card-head"><h2>Timestamped notes</h2><button class="btn btn--sm" type="button" data-addts ${ready ? '' : 'disabled'}>${ic('plus')}Add at playhead</button></div><div class="grid" style="gap:8px" data-ts></div><p class="xsmall muted" style="margin:10px 0 0">Shown beside the player for clients — the video itself isn’t changed.</p></section>
          <section class="card"><div class="card-head"><h2>Cover thumbnail</h2></div><div class="covers">${[15, 40, 65, 90].map((p) => `<button class="cover-opt" type="button" data-cover="${p}" aria-pressed="${draft.cover === p}" aria-label="Use frame at ${p}%"><img src="${L.thumb(m.clip, p)}" alt=""></button>`).join('')}</div></section>
        </div>
        <div class="rv-col">
          <section class="card ai-panel"><div class="ai-head"><h2>${ic('sparkles')}AI draft</h2>${m.ai ? `<span class="pill ${m.ai.confidence < .6 ? 'pill--tomato' : m.ai.confidence < .8 ? 'pill--sun' : 'pill--grass'}">${Math.round(m.ai.confidence * 100)}% confident</span>` : ''}<span class="grow"></span><button class="btn btn--sm" type="button" data-regen ${ready ? '' : 'disabled'}>${ic('refresh-cw')}${m.ai ? 'Regenerate' : 'Generate'}</button></div><div data-ai>${aiHTML(m.ai, false)}</div>${m.ai ? `<button class="btn btn--sm btn--ink" type="button" data-accall style="margin-top:8px">${ic('check-check')}Accept all suggestions</button>` : ''}</section>
          <section class="card"><div class="card-head"><h2>Details</h2></div>
            <div class="field"><label class="label" for="rv-title">Title</label><input class="input" id="rv-title" value="${esc(draft.title)}"></div>
            <div class="field"><label class="label" for="rv-notes">Notes for the household</label><textarea class="textarea" id="rv-notes" placeholder="What should they watch for?">${esc(draft.notes)}</textarea></div>
            <div class="field"><span class="label">Technique tags</span><div class="chips" data-tags>${L.techniques.map((t) => `<button type="button" class="chip" data-t="${t.id}" aria-pressed="${draft.techniques.includes(t.id)}"><span class="swatch" style="background:${t.color}"></span>${esc(t.name)}</button>`).join('')}</div></div></section>
          <section class="card" style="${multi ? 'background:var(--blush)' : ''}"><div class="card-head"><h2>Dog &amp; session</h2></div>
            ${multi ? `<div class="callout callout--warn" style="margin-bottom:12px;background:var(--paper)">${ic('alert-triangle')}<div><strong>More than one dog in this session</strong><p>Confirm exactly who appears in this clip. AI never guesses identity.</p></div></div>` : ''}
            <div class="chips" data-dogsel>${hhDogs.map((d) => `<button type="button" class="chip" data-d="${d.id}" aria-pressed="${draft.dogs.includes(d.id)}">${APP.avatar(d.name, d.avatar, 'avatar--sm')}${esc(d.name)}</button>`).join('')}</div>
            <div class="field"><label class="label" for="rv-sess">Session</label><select class="select" id="rv-sess"><option value="">No session</option>${L.sessions.filter((s) => hh && s.household === hh.id).map((s) => `<option value="${s.id}" ${s.id === draft.session ? 'selected' : ''}>${esc(s.title)} · ${L.fmtDate(s.date)}</option>`).join('')}</select></div>
            ${multi ? `<label class="check" style="margin-top:8px"><input type="checkbox" data-confirm><span class="box">${ic('check')}</span><span class="txt small"><b>I’ve checked who’s in this clip</b></span></label>` : ''}</section>
        </div>
      </div>
      <div class="approve-bar"><span class="grow" data-hint>${ready ? 'Approving lets you choose exactly who can watch.' : 'You can edit now — approval unlocks once processing finishes.'}</span><button class="btn btn--outline" type="button" data-save>${ic('save')}Save draft</button><button class="btn btn--primary btn--lg" type="button" data-approve ${ready ? '' : 'disabled'}>${ic('badge-check')}Approve &amp; choose audience</button></div>`,
      mount(el) {
        let player = null;
        if (ready) player = P.player($('[data-player]', el), { src: `/shared/media/video/${m.clip}.mp4`, poster: L.img(m.clip, 40), nominal, marks: draft.timestamps, onTime: (cur) => { const ph = $('[data-ph]', el); if (ph) ph.style.left = (cur / nominal * 100) + '%'; if (previewing && cur >= draft.trim[1] * nominal) { player.video.pause(); previewing = false; } } });
        let previewing = false;

        /* timestamps */
        const tsBox = $('[data-ts]', el);
        function renderTs() { tsBox.innerHTML = draft.timestamps.map((t, i) => `<div class="tsn-row"><button class="tstamp" type="button" data-seek="${t.t}" style="padding:6px 8px;min-height:44px"><span class="tt">${t.t}</span></button><label class="sr-only" for="ts-${i}">Note</label><input class="input" id="ts-${i}" value="${esc(t.label)}" data-tsl="${i}"><button class="icon-btn icon-btn--plain" type="button" data-tsdel="${i}" aria-label="Remove note">${ic('trash-2')}</button></div>`).join('') || '<p class="small muted" style="margin:0">No notes yet — play the clip and add one at the good bit.</p>'; P.icons(); }
        renderTs();
        tsBox.addEventListener('input', (e) => { const i = e.target.dataset.tsl; if (i != null) draft.timestamps[i].label = e.target.value; });
        tsBox.addEventListener('click', (e) => { const d = e.target.closest('[data-tsdel]'); if (d) { draft.timestamps.splice(+d.dataset.tsdel, 1); renderTs(); } const s = e.target.closest('[data-seek]'); if (s && player) player.seek(s.dataset.seek); });
        const addTs = $('[data-addts]', el); addTs && addTs.addEventListener('click', () => { const cur = player && player.video.duration ? player.video.currentTime / player.video.duration * nominal : 0; draft.timestamps.push({ t: P.fmtSec(cur), label: '' }); draft.timestamps.sort((a, b) => P.toSec(a.t) - P.toSec(b.t)); renderTs(); const inp = $$('[data-tsl]', tsBox).find((x) => !x.value); inp && inp.focus(); });

        /* trim handles */
        const strip = $('[data-strip]', el);
        function renderTrim() {
          const [a, b] = draft.trim; $('[data-h="in"]', el).style.left = a * 100 + '%'; $('[data-h="out"]', el).style.left = b * 100 + '%';
          $('[data-sh-l]', el).style.cssText = `left:0;width:${a * 100}%`; $('[data-sh-r]', el).style.cssText = `left:${b * 100}%;right:0`; $('[data-sel]', el).style.cssText = `left:${a * 100}%;width:${(b - a) * 100}%`;
          $('[data-tin]', el).textContent = P.fmtSec(a * nominal); $('[data-tout]', el).textContent = P.fmtSec(b * nominal); $('[data-tlen]', el).textContent = (a > 0 || b < 1) ? `New clip: ${P.fmtSec((b - a) * nominal)}` : 'Full length';
          $$('[data-h]', el).forEach((h) => { const v = h.dataset.h === 'in' ? a : b; h.setAttribute('aria-valuenow', Math.round(v * nominal)); h.setAttribute('aria-valuetext', P.fmtSec(v * nominal)); });
        }
        renderTrim();
        $$('[data-h]', el).forEach((h) => {
          const which = h.dataset.h === 'in' ? 0 : 1;
          h.addEventListener('pointerdown', (e) => {
            e.preventDefault(); h.setPointerCapture(e.pointerId); if (G && !P.reduced) gsap.to(h, { scaleY: 1.15, duration: .2 });
            const move = (ev) => { const r = strip.getBoundingClientRect(); let v = P.clamp((ev.clientX - r.left) / r.width, 0, 1); if (which === 0) v = Math.min(v, draft.trim[1] - .08); else v = Math.max(v, draft.trim[0] + .08); draft.trim[which] = v; renderTrim(); if (player && player.video.duration) player.video.currentTime = v * player.video.duration; };
            const up = () => { h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); if (G && !P.reduced) gsap.to(h, { scaleY: 1, duration: .5, ease: 'elastic.out(1,.4)' }); };
            h.addEventListener('pointermove', move); h.addEventListener('pointerup', up);
          });
          h.addEventListener('keydown', (e) => { const d = e.key === 'ArrowRight' ? .02 : e.key === 'ArrowLeft' ? -.02 : 0; if (!d) return; e.preventDefault(); const v = draft.trim[which] + d; if (which === 0) draft.trim[0] = P.clamp(v, 0, draft.trim[1] - .08); else draft.trim[1] = P.clamp(v, draft.trim[0] + .08, 1); renderTrim(); });
        });
        $('[data-treset]', el).addEventListener('click', () => { draft.trim = [0, 1]; renderTrim(); });
        const tprev = $('[data-tprev]', el); tprev && tprev.addEventListener('click', () => { if (!player) return; player.video.currentTime = draft.trim[0] * (player.video.duration || 0); previewing = true; player.video.play(); });
        $('[data-tclip]', el).addEventListener('click', () => {
          if (draft.trim[0] === 0 && draft.trim[1] === 1) { P.toast('Drag the yellow handles to choose the bit you want', { icon: 'scissors' }); if (G && !P.reduced) gsap.fromTo($$('[data-h]', el), { x: -6 }, { x: 0, duration: .6, ease: 'elastic.out(1.5,.2)' }); return; }
          const len = P.fmtSec((draft.trim[1] - draft.trim[0]) * nominal);
          P.confirm('Create derived clip?', `A new <b>${len}</b> clip (${P.fmtSec(draft.trim[0] * nominal)}–${P.fmtSec(draft.trim[1] * nominal)}) will be created on Stream. It starts private and must finish processing before it can be shared. The original stays untouched.`, 'Create clip', () => {
            const id = 'm-' + Math.random().toString(36).slice(2, 6);
            P.db.add('media', { ...m, id, title: ($('#rv-title', el).value || m.title) + ' (trim)', parent: m.id, duration: len, processing: 'processing', editorial: 'draft', visibility: 'trainer_only', views: 0, created: A.now(), ai: null, timestamps: [], trim: null });
            P.db.add('uploads', { id: 'up-' + Math.random().toString(36).slice(2, 6), media: id, file: 'clip-of-' + m.id, size: 'derived', state: 'processing', progress: 1, protocol: 'stream clip', created: A.now() });
            if (m.session) { const s = L.session(m.session); P.db.patch('sessions', s.id, { media: s.media.concat(id) }); }
            A.audit('created derived clip', `${m.title} → ${len}`); A.ensureTick(); A.badges();
            P.toast('Derived clip is processing — you’ll be pinged when it’s ready', { tone: 'ok', icon: 'scissors', action: 'View', onAction: () => A.go('/uploads') });
          });
        });

        /* cover */
        $$('[data-cover]', el).forEach((b) => b.addEventListener('click', () => { draft.cover = +b.dataset.cover; $$('[data-cover]', el).forEach((x) => x.setAttribute('aria-pressed', x === b)); }));

        /* tags + dogs */
        function syncTags() { $$('[data-t]', el).forEach((b) => b.setAttribute('aria-pressed', draft.techniques.includes(b.dataset.t))); $$('[data-tag]', el).forEach((b) => { const on = draft.techniques.includes(b.dataset.tag); b.setAttribute('aria-pressed', on); b.textContent = on ? 'Applied' : 'Apply'; }); }
        const toggleTag = (id) => { const i = draft.techniques.indexOf(id); if (i > -1) draft.techniques.splice(i, 1); else draft.techniques.push(id); syncTags(); };
        $('[data-tags]', el).addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) toggleTag(b.dataset.t); });
        $('[data-dogsel]', el).addEventListener('click', (e) => { const b = e.target.closest('[data-d]'); if (!b) return; const i = draft.dogs.indexOf(b.dataset.d); if (i > -1) { if (draft.dogs.length === 1) { P.toast('A clip needs at least one dog', { tone: 'err' }); return; } draft.dogs.splice(i, 1); } else draft.dogs.push(b.dataset.d); b.setAttribute('aria-pressed', i === -1); });
        const conf = $('[data-confirm]', el); conf && conf.addEventListener('change', () => (draft.confirmed = conf.checked));

        /* AI panel */
        const aiBox = $('[data-ai]', el);
        aiBox.addEventListener('click', (e) => {
          const t = e.target.closest('[data-tag]'); if (t) { toggleTag(t.dataset.tag); return; }
          const a = e.target.closest('[data-acc]'), r = e.target.closest('[data-rej]');
          const k = (a || r) && (a || r).dataset[a ? 'acc' : 'rej']; if (!k) return;
          const f = $(`[data-af="${k}"]`, aiBox); f.classList.toggle('is-accepted', !!a); f.classList.toggle('is-rejected', !!r); draft.aiState[k] = a ? 'accepted' : 'rejected';
          if (a && k === 'title') { const i = $('#rv-title', el); i.value = m.ai.title; flash(i); }
          if (a && k === 'summary') { const i = $('#rv-notes', el); i.value = m.ai.summary; flash(i); }
          if (G && !P.reduced) gsap.fromTo(f, { scale: .97 }, { scale: 1, duration: .5, ease: 'elastic.out(1,.4)' });
        });
        function flash(i) { if (G && !P.reduced) gsap.fromTo(i, { backgroundColor: '#FFF0C2' }, { backgroundColor: '#FFFFFF', duration: 1.2 }); }
        const acc = $('[data-accall]', el); acc && acc.addEventListener('click', () => { $$('[data-acc]', aiBox).forEach((b) => b.click()); m.ai.tags.filter((t) => t.c >= .6).forEach((t) => { if (!draft.techniques.includes(t.id)) toggleTag(t.id); }); P.toast('Suggestions accepted — still editable', { tone: 'ok', icon: 'check-check' }); });
        let variant = 1;
        const regen = $('[data-regen]', el); regen && regen.addEventListener('click', () => {
          aiBox.innerHTML = aiHTML(null, true); regen.disabled = true;
          setTimeout(() => { const ai = A.makeAI(m, variant++); if (m.ai && m.ai.transcript) ai.transcript = m.ai.transcript; P.db.patch('media', m.id, { ai }); aiBox.innerHTML = aiHTML(ai, false); P.icons(); regen.disabled = false; P.toast('Fresh draft generated · $0.03', { icon: 'sparkles' }); if (G && !P.reduced) gsap.from($$('.ai-field', aiBox), { y: 16, stagger: .05, duration: .45, ease: 'back.out(1.6)' }); }, 1600);
        });

        /* save / archive / approve */
        function collect() { return { title: $('#rv-title', el).value.trim() || m.title, notes: $('#rv-notes', el).value, techniques: draft.techniques.slice(), dogs: draft.dogs.slice(), session: $('#rv-sess', el).value || null, timestamps: draft.timestamps.filter((t) => t.label.trim()), cover: L.thumb(m.clip, draft.cover), coverPct: draft.cover }; }
        $('[data-save]', el).addEventListener('click', () => { P.db.patch('media', m.id, collect()); A.audit('edited media', m.title); P.toast('Draft saved — still private', { tone: 'ok', icon: 'save' }); });
        $('[data-archive]', el).addEventListener('click', () => P.confirm('Archive this clip?', 'It leaves the queue and stays private. You can restore it from the media library.', 'Archive', () => { P.db.patch('media', m.id, { editorial: 'archived', visibility: 'trainer_only' }); A.audit('archived media', m.title); A.badges(); A.go('/review'); }));
        $('[data-approve]', el).addEventListener('click', () => {
          if (!draft.confirmed) { P.toast('Confirm who’s in this clip first', { tone: 'err', icon: 'alert-triangle' }); const c = $('[data-confirm]', el); if (c) { c.closest('.card').scrollIntoView({ behavior: 'smooth', block: 'center' }); if (G) gsap.fromTo(c.closest('.check'), { x: -8 }, { x: 0, duration: .6, ease: 'elastic.out(1.5,.2)' }); } return; }
          if (!draft.techniques.length) { P.toast('Add at least one technique tag', { tone: 'err', icon: 'tags' }); return; }
          A.approveFlow(m, collect());
        });
        APP.popIn(el, '.card');
      }
    };
  };

  /* ================= APPROVE & AUDIENCE ================= */
  A.approveFlow = (m, data) => {
    const dog = L.dog(data.dogs[0]); const hh = L.household(dog.household);
    const groups = L.groups.filter((g) => g.members.includes(hh.id));
    const consent = () => L.consents.find((c) => c.status === 'active' && (c.media === m.id || (!c.media && /Public/.test(c.kind))) && hh.members.some((u) => c.subject.includes((L.user(u) || {}).name)));
    let aud = m.editorial === 'approved_shared' ? (m.visibility === 'group' ? 'group' : 'household') : m.editorial === 'published_public' ? 'public' : 'household';
    const body = () => { const c = consent(); return `<p class="muted" style="margin-top:0">Approving makes <b>${esc(data.title)}</b> visible only to the audience you pick. You can change it later; every change is audited.</p>
      <div class="radio-cards" role="radiogroup">
        <label class="radio-card"><input type="radio" name="aud" value="private" ${aud === 'private' ? 'checked' : ''}><span class="ico">${ic('lock')}</span><span><strong>Trainer only</strong><span class="d">Approved, but kept for your records.</span></span></label>
        <label class="radio-card"><input type="radio" name="aud" value="household" ${aud === 'household' ? 'checked' : ''}><span class="ico">${ic('house')}</span><span><strong>${esc(hh.name)}</strong><span class="d">${hh.members.map((u) => esc((L.user(u) || {}).name)).join(', ')} — each signs in to watch.</span></span></label>
        <label class="radio-card ${groups.length ? '' : 'is-locked'}"><input type="radio" name="aud" value="group" ${aud === 'group' ? 'checked' : ''} ${groups.length ? '' : 'disabled'}><span class="ico">${ic('users-round')}</span><span><strong>Training group</strong><span class="d">${groups.length ? `<select class="select" data-grp style="margin-top:8px;min-height:40px">${groups.map((g) => `<option value="${g.id}">${esc(g.title)}</option>`).join('')}</select>` : 'This household isn’t in any groups.'}</span></span></label>
        <label class="radio-card ${c ? '' : 'is-locked'}"><input type="radio" name="aud" value="public" ${aud === 'public' ? 'checked' : ''} ${c ? '' : 'disabled'}><span class="ico">${ic('globe')}</span><span><strong>Public (Academy & site)</strong><span class="d">${c ? `${ic('shield-check', 'inline-ic')} Consent on file: ${esc(c.subject)} · ${esc(c.evidence)}` : `${ic('lock', 'inline-ic')} Needs recorded consent from the identifiable people in this clip.`}</span>${c ? '' : `<button class="btn btn--sm" type="button" data-consent style="margin-top:8px">${ic('shield-plus')}Record consent</button>`}</span></label>
      </div>
      <div class="callout callout--info" style="margin-top:14px">${ic('info')}<div><strong>What happens next</strong><p>Household and group members get access through the portal. Sharing on WhatsApp is a separate step that you send yourself.</p></div></div>`; };
    const modal = P.modal({ title: 'Approve & choose audience', html: body(),
      onOpen(api) {
        api.el.addEventListener('change', (e) => { if (e.target.name === 'aud') aud = e.target.value; });
        api.el.addEventListener('click', (e) => { if (e.target.closest('[data-consent]')) { A.recordConsent(m.id, () => { aud = 'public'; api.body.innerHTML = body(); P.icons(); }); } });
      },
      actions: [{ label: 'Back', cls: 'btn--outline' }, { label: 'Approve', cls: 'btn--primary', icon: 'badge-check', onClick: (api) => {
        const map = { private: ['approved_private', 'trainer_only'], household: ['approved_shared', 'household'], group: ['approved_shared', 'group'], public: ['published_public', 'public'] };
        const [editorial, visibility] = map[aud]; const grp = aud === 'group' ? $('[data-grp]', api.el).value : null;
        P.db.patch('media', m.id, Object.assign({}, data, { editorial, visibility, group: grp, aiReview: 'reviewed' }));
        const who = aud === 'household' ? hh.name : aud === 'group' ? L.groups.find((g) => g.id === grp).title : aud === 'public' ? 'public site' : 'trainer only';
        A.audit(aud === 'private' ? 'approved (private)' : 'approved & granted', `${data.title} → ${who}`);
        A.badges();
        const r = document.querySelector('[data-approve]').getBoundingClientRect(); P.confetti(r.left + r.width / 2, r.top, 30);
        P.toast(`Approved — ${aud === 'private' ? 'kept private' : 'visible to ' + esc(who)}`, { tone: 'ok', icon: 'badge-check', action: aud === 'private' ? null : 'Share on WhatsApp', onAction: () => A.go('/share?media=' + m.id), ms: 6000 });
        const next = L.media.find((x) => x.editorial === 'needs_review' && x.id !== m.id);
        setTimeout(() => A.go(next ? '/review/' + next.id : '/review'), 600);
      } }] });
    return modal;
  };
})();
