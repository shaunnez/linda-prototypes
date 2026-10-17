/* ==========================================================================
   V3 · admin-review — review queue, review detail (AI, trim, approve), media
   ========================================================================== */
(function () {
  'use strict';
  const V3 = window.V3;
  const { $, $$, esc, icon } = V3;
  const db = V3.db;
  const A = V3.A;
  const R = A.routes;

  const isAmbiguous = (m) => (m.ai && m.ai.evidence.some((x) => /Ambiguous/i.test(x))) || (V3.session(m.session) || { dogs: [] }).dogs.length > 1;

  /* Review queue ---------------------------------------------------------- */
  R['review'] = (_, q) => {
    const f = q.get('f') || 'all';
    const all = A.reviewQueue();
    const filt = { all: () => true, needs: (m) => m.editorial === 'needs_review', pending: (m) => m.editorial === 'draft', ambiguous: isAmbiguous, low: (m) => m.ai && m.ai.confidence < 0.6 };
    const list = all.filter(filt[f] || filt.all);
    const cnt = (k) => all.filter(filt[k]).length;
    return {
      title: 'Review queue', nav: 'review',
      html: `${A.vh('<span>Media-04 · Processing ready ≠ approved</span>', 'Review queue', 'AI has drafted notes for these clips. Nothing is visible to clients until you approve it.', `<a class="btn btn--ghost btn--sm" href="#/media">${icon('clapperboard')} Media library</a>`)}
      <div class="tabs" role="tablist" style="margin-bottom:16px">${[['all', 'All'], ['needs', 'Needs review'], ['pending', 'AI pending'], ['ambiguous', 'Multi-dog'], ['low', 'Low confidence']].map(([k, l]) => `<a role="tab" href="#/review?f=${k}" aria-selected="${f === k}">${l} <span class="count">${cnt(k)}</span></a>`).join('')}</div>
      ${list.length ? `<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Clip</th><th class="hide-m">Dog · session</th><th class="hide-m">AI draft</th><th class="hide-m">Source</th><th>State</th><th></th></tr></thead><tbody>
        ${list.map((m) => { const s = V3.session(m.session); return `<tr data-href="#/review/${m.id}" tabindex="0">
          <td><div class="row" style="gap:12px"><span class="lrow__thumb" style="width:80px;height:50px"><img src="${V3.thumb(m.clip, m.cover || 40)}" alt=""><span class="dur">${esc(m.duration)}</span></span><div style="min-width:0"><b style="font-weight:600;display:block">${esc(m.title)}</b><span class="mono faint">${esc(m.id)} · ${V3.rel(m.created)}</span></div></div></td>
          <td class="hide-m"><div class="row" style="gap:8px">${A.dogAvatars(m.dogs)}<div><div>${esc(A.dogNames(m.dogs))}</div><small class="muted">${s ? esc(s.title) : '—'}</small></div></div>${isAmbiguous(m) ? `<span class="state" data-s="pending" style="margin-top:6px">⚠ Confirm dogs</span>` : ''}</td>
          <td class="hide-m">${m.ai ? `<div style="max-width:240px"><div class="clamp-2" style="font-size:13px">${esc(m.ai.title)}</div><div class="conf" style="grid-template-columns:70px 34px;margin-top:6px"><span class="conf__track"><i style="--v:${m.ai.confidence}"></i></span><span class="num" style="font-size:10.5px">${Math.round(m.ai.confidence * 100)}%</span></div></div>` : `<span class="skel" style="display:block;width:160px;height:12px"></span><small class="muted">Waiting for Stream</small>`}</td>
          <td class="hide-m"><span class="pill pill--mono">${icon(m.source === 'whatsapp_archive' ? 'message-circle' : m.source === 'pwa_library' ? 'images' : 'smartphone')} ${esc(V3.label.source[m.source] || m.source)}</span></td>
          <td>${A.edState(m)}${m.processing !== 'ready' ? `<div style="margin-top:4px">${A.prState(m)}</div>` : ''}</td>
          <td style="text-align:right"><a class="btn btn--xs ${m.editorial === 'needs_review' ? 'btn--accent' : 'btn--ghost'}" href="#/review/${m.id}">Review ${icon('arrow-right')}</a></td></tr>`; }).join('')}
      </tbody></table></div></div>` : `<div class="card card--flat">${A.empty('check-check', 'Inbox zero', 'Nothing matches this filter. New recordings land here once Stream finishes processing.', `<a class="btn btn--sm" href="#/record">Record a clip</a>`)}</div>`}`
    };
  };

  /* Review detail --------------------------------------------------------- */
  R['review/:id'] = ({ id }) => {
    const m = V3.media(id);
    if (!m) return { title: 'Not found', nav: 'review', html: A.empty('search-x', 'Clip not found', 'It may have been deleted.', '<a class="btn btn--sm" href="#/review">Back to queue</a>') };
    const s = V3.session(m.session);
    const hhId = s ? s.household : (V3.dog(m.dogs[0]) || {}).household;
    const f = { title: m.title, notes: m.notes || '', techniques: m.techniques.slice(), timestamps: m.timestamps.map((t) => Object.assign({}, t)), dogs: m.dogs.slice(), session: m.session, cover: m.cover || 40, ambOK: !isAmbiguous(m) || !!m.ambOK, ai: Object.assign({ title: null, summary: null, tags: null, transcript: null }, m.aiReview || {}) };
    let variant = 0;
    const ready = m.processing === 'ready';
    const approved = ['approved_private', 'approved_shared', 'published_public'].includes(m.editorial);
    const qList = A.reviewQueue();
    const qi = qList.findIndex((x) => x.id === m.id);
    const next = qList[qi + 1] || (qi > 0 ? qList[0] : null);
    const parent = m.parent ? V3.media(m.parent) : null;

    const playerArea = () => {
      if (ready) return `<div data-player></div>`;
      if (m.processing === 'failed') return `<div class="player" style="display:grid;place-items:center"><img src="${V3.img(m.clip, 40)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.25"><div class="empty" style="color:#fff;position:relative"><span class="empty__ico" style="background:rgba(255,255,255,.08);color:#fff;border-color:rgba(255,255,255,.2)">${icon('triangle-alert')}</span><h3 style="color:#fff">Upload didn’t finish</h3><p style="color:#bbb">${esc(m.error || 'Upload failed.')}</p><a class="btn btn--accent btn--sm" href="#/uploads?f=failed">Go to uploads</a></div></div>`;
      return `<div class="player" style="display:grid;place-items:center"><img src="${V3.img(m.clip, 40)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.35;filter:blur(6px)"><div class="empty" style="position:relative;color:#fff"><span class="ring ring--lime" style="--s:56px;--v:${m.progress || 0.4}"><svg viewBox="0 0 36 36"><circle class="ring__bg" cx="18" cy="18" r="15.9155" style="stroke:rgba(255,255,255,.2)"/><circle class="ring__fg" cx="18" cy="18" r="15.9155" pathLength="100"/></svg></span><h3 style="color:#fff">${esc(V3.label.processing[m.processing])} on Cloudflare Stream</h3><p style="color:#ccc">AI drafts run automatically once Stream reports the video is ready.</p><button class="btn btn--accent btn--sm" type="button" data-sim-ready>${icon('webhook')} Simulate “ready” webhook</button></div></div>`;
    };

    const aiPanel = () => {
      if (!m.ai) return `<section class="panel panel--ai"><div class="panel__h"><h3>${icon('sparkles')} AI draft</h3><span class="state" data-s="processing">Queued</span></div><div class="panel__b"><div class="skel skel-line" style="width:70%"></div><div class="skel skel-line" style="width:90%"></div><div class="skel skel-line" style="width:50%"></div><p class="muted" style="font-size:12.5px;margin-top:10px">AI never blocks the video. Review can continue even if AI fails.</p></div></section>`;
      const ai = m.ai;
      const fieldActs = (k) => `<span class="aif__acts"><button class="icon-btn ok" type="button" data-ai-ok="${k}" aria-pressed="${f.ai[k] === 'accepted'}" aria-label="Accept ${k}">${icon('check')}</button><button class="icon-btn no" type="button" data-ai-no="${k}" aria-pressed="${f.ai[k] === 'rejected'}" aria-label="Reject ${k}">${icon('x')}</button></span>`;
      const cls = (k) => f.ai[k] === 'accepted' ? ' is-accepted' : f.ai[k] === 'rejected' ? ' is-rejected' : '';
      return `<section class="panel panel--ai" data-ai-panel><div class="panel__h"><h3>${icon('sparkles')} AI draft</h3><div class="row" style="gap:6px"><span class="mono faint" title="Model">${esc(ai.model || 'vision-draft-2')}</span><button class="btn btn--xs btn--ghost" type="button" data-regen>${icon('refresh-cw')} Regenerate</button></div></div>
        <div class="panel__b" style="padding-top:4px">
          <div class="row row--between" style="padding:10px 0;border-bottom:1px dashed var(--line)"><span class="label">Overall confidence</span><div class="conf" style="grid-template-columns:110px 38px"><span class="conf__track"><i style="--v:${ai.confidence}"></i></span><span class="num" style="font-size:11px">${Math.round(ai.confidence * 100)}%</span></div></div>
          <div class="aif${cls('title')}"><div class="aif__h"><span class="label">Suggested title</span>${fieldActs('title')}</div><div class="aif__v t">${esc(ai.title)}</div></div>
          <div class="aif${cls('summary')}"><div class="aif__h"><span class="label">Coaching summary</span>${fieldActs('summary')}</div><div class="aif__v">${esc(ai.summary)}</div></div>
          <div class="aif${cls('tags')}"><div class="aif__h"><span class="label">Technique tags</span>${fieldActs('tags')}</div><div>${ai.tags.map((t) => { const T = V3.technique(t.id); return `<div class="conf-row${t.c < 0.5 ? ' is-low' : ''}"><span class="tag" style="--c:${T.color}">${esc(T.name)}</span><span class="conf__track"><i style="--v:${t.c};--c:${T.color}"></i></span><span class="num">${Math.round(t.c * 100)}%</span><button class="icon-btn icon-btn--sm" type="button" data-addtag="${t.id}" aria-label="Add ${esc(T.name)} tag" title="Add tag">${icon(f.techniques.includes(t.id) ? 'check' : 'plus')}</button></div>`; }).join('')}</div><small class="muted" style="font-size:12px">Accepting adds tags ≥ 50% confidence.</small></div>
          <div class="aif${cls('transcript')}"><div class="aif__h"><span class="label">Transcript</span>${ai.transcript ? fieldActs('transcript') : ''}</div>${ai.transcript ? `<div class="transcript">${esc(ai.transcript)}</div>` : `<div class="locked">${icon('mic-off')}No speech detected — AI won’t invent one.</div>`}</div>
          <div class="aif"><div class="aif__h"><span class="label">Evidence</span></div><ul class="evidence list-reset">${ai.evidence.map((e) => `<li>${icon(/Ambiguous/i.test(e) ? 'triangle-alert' : /No speech/i.test(e) ? 'mic-off' : /Transcript/i.test(e) ? 'quote' : 'scan-line')}<span>${esc(e)}</span></li>`).join('')}</ul></div>
          <p class="mono faint" style="text-transform:none;letter-spacing:.02em;margin-top:6px">AI suggests only. It never publishes, grants access or changes which dog this is.</p>
        </div></section>`;
    };

    const strip = [15, 40, 65, 90, 15, 40, 65, 90].map((p, i) => `<img src="${V3.thumb(m.clip, i < 4 ? p : [40, 65, 90, 15][i - 4])}" alt="">`).join('');
    const hhDogs = hhId ? V3.dogsFor(hhId) : [];
    const sessDogs = s ? s.dogs : [];

    return {
      title: m.title, nav: 'review', crumbs: [{ label: 'Review', href: '#/review' }, { label: m.title }], mtitle: 'Review',
      html: `
      <div class="vh">
        <div><div class="vh__meta mono"><span>${esc(m.id)}</span><span class="dot-sep"></span><span>${esc(V3.label.source[m.source] || m.source)}</span><span class="dot-sep"></span><span>${V3.fmtDay(m.created)} ${V3.fmtTime(m.created)}</span>${parent ? `<span class="dot-sep"></span><a class="link" href="#/review/${parent.id}">Derived from ${esc(parent.id)}</a>` : ''}</div>
          <h1 data-title-h>${esc(m.title)}</h1><div class="row row--wrap" style="gap:6px;margin-top:10px">${A.edState(m)}${A.prState(m)}<span class="pill pill--mono">${icon(A.visIcon[m.visibility] || 'lock')} ${esc(V3.label.visibility[m.visibility])}</span></div></div>
        <div class="vh__actions">${next ? `<a class="btn btn--quiet btn--sm" href="#/review/${next.id}">Next in queue ${icon('arrow-right')}</a>` : ''}<button class="btn btn--ghost btn--sm" type="button" data-save>${icon('save')} Save draft</button><button class="btn btn--accent btn--sm" type="button" data-approve${!ready ? ' disabled' : ''}>${icon('shield-check')} ${approved ? 'Change audience' : 'Approve & choose audience'}</button></div>
      </div>
      <div class="review">
        <div class="g" style="gap:14px">
          ${playerArea()}
          ${ready ? `<section class="panel"><div class="panel__h"><h3>${icon('scissors')} Trim</h3><span class="mono faint" data-trim-read>0:00 → 0:00</span></div><div class="panel__b">
            <div class="trim"><div class="trim__strip" data-strip>${strip}<span class="trim__sel" data-sel></span><span class="trim__h" data-h="a" role="slider" tabindex="0" aria-label="Trim in point"></span><span class="trim__h" data-h="b" role="slider" tabindex="0" aria-label="Trim out point"></span><span class="trim__ph" data-ph></span></div>
            <div class="trim__ticks">${[0, 0.25, 0.5, 0.75, 1].map((p) => `<span>${V3.fmtSec(p * (V3.toSec(m.duration) || 30))}</span>`).join('')}</div></div>
            <div class="row row--between row--wrap" style="margin-top:12px;gap:10px"><span class="muted" style="font-size:12.5px">Creates a <b>new private clip</b> on Stream. The original stays untouched.</span><div class="row"><button class="btn btn--quiet btn--xs" type="button" data-trim-reset>Reset</button><button class="btn btn--sm" type="button" data-trim-go>${icon('scissors')} Create derived clip</button></div></div>
          </div></section>` : ''}
          <section class="panel"><div class="panel__h"><h3>${icon('pencil-line')} Details</h3><span class="mono faint" data-dirty></span></div><div class="panel__b" style="display:grid;gap:16px">
            <div class="field"><label for="rv-title">Title</label><div class="row" style="gap:6px"><input class="input grow" id="rv-title" value="${esc(f.title)}">${m.ai ? `<button class="btn btn--ghost btn--sm" type="button" data-use-ai-title title="Use AI title">${icon('sparkles')}</button>` : ''}</div></div>
            <div class="field"><label for="rv-notes">Trainer notes <span class="muted">(shown to the client)</span></label><textarea class="textarea" id="rv-notes" placeholder="What should the owner notice in this clip?">${esc(f.notes)}</textarea></div>
            <div class="field"><span class="field__label">Timestamped notes</span><div data-ts-list></div><div class="row" style="gap:6px"><button class="btn btn--ghost btn--xs" type="button" data-ts-add>${icon('plus')} Add at playhead</button><span class="muted" style="font-size:12px">Shown beside the player — the video itself isn’t edited.</span></div></div>
            <div class="field"><span class="field__label">Technique tags</span><div class="row row--wrap" style="gap:6px" data-techs></div></div>
            ${ready ? `<div class="field"><span class="field__label">Cover thumbnail</span><div class="covers">${[15, 40, 65, 90].map((p) => `<button class="cover" type="button" data-cover="${p}" aria-pressed="${f.cover === p}"><img src="${V3.thumb(m.clip, p)}" alt="Cover option at ${p}%"></button>`).join('')}</div></div>` : ''}
          </div></section>
        </div>
        <div class="review__side">
          ${aiPanel()}
          <section class="panel"><div class="panel__h"><h3>${icon('paw-print')} Dog &amp; session</h3><span class="mono faint">Explicit only</span></div><div class="panel__b" style="display:grid;gap:12px">
            ${isAmbiguous(m) ? `<div class="notice notice--warn">${icon('triangle-alert')}<span><strong>More than one dog may be in this clip.</strong> AI won’t guess identities — confirm which dogs it belongs to.</span></div>` : ''}
            <div class="row row--wrap" style="gap:6px" data-assoc>${hhDogs.map((d) => `<button class="chip" type="button" data-dogsel="${d.id}" aria-pressed="${f.dogs.includes(d.id)}"><span class="avatar" style="--s:22px;margin-left:-8px"><img src="${esc(d.avatar)}" alt=""></span>${esc(d.name)}${sessDogs.includes(d.id) ? '' : ' <span class="mono faint">not in session</span>'}</button>`).join('')}</div>
            <div class="field"><label for="rv-sess">Session</label><select class="select select--sm" id="rv-sess">${hhId ? A.sessionOptions(hhId, f.session) : ''}</select></div>
            ${isAmbiguous(m) ? `<label class="check check--plain"><input type="checkbox" data-amb${f.ambOK ? ' checked' : ''}><span class="check__box">${icon('check')}</span><span class="check__text">I’ve checked who’s in this clip</span></label>` : ''}
          </div></section>
          <section class="panel"><div class="panel__h"><h3>${icon('info')} Record</h3></div><div class="panel__b"><dl class="dl">
            <dt>Processing</dt><dd>${A.prState(m)}</dd><dt>Editorial</dt><dd>${A.edState(m)}</dd><dt>Visibility</dt><dd>${esc(V3.label.visibility[m.visibility])}</dd><dt>Duration</dt><dd class="num">${esc(m.duration)}</dd><dt>Portal views</dt><dd class="num">${m.views || 0}</dd><dt>Stream UID</dt><dd class="num faint">••••${esc(m.id.slice(-4))}a9 <span class="mini-ph">signed</span></dd>
          </dl><div class="row row--wrap" style="margin-top:14px;gap:6px">${approved && m.visibility !== 'trainer_only' ? `<a class="btn btn--ghost btn--xs" href="#/share?m=${m.id}">${icon('send')} Share</a>` : ''}<button class="btn btn--quiet btn--xs" type="button" data-archive>${icon('archive')} Archive</button></div></div></section>
        </div>
      </div>`,
      mount(v) {
        let player = null;
        const dirty = () => { const d = $('[data-dirty]', v); if (d) d.textContent = '● unsaved'; };
        if (ready) player = V3.player($('[data-player]', v), { clip: m.clip, declared: m.duration, markers: f.timestamps, poster: V3.img(m.clip, f.cover) });
        const dec = V3.toSec(m.duration) || 30;

        /* timestamps */
        const drawTs = () => {
          $('[data-ts-list]', v).innerHTML = f.timestamps.length ? f.timestamps.map((t, i) => `<div class="tnote"><input class="input input--sm num" value="${esc(t.t)}" data-ts-t="${i}" aria-label="Time"><input class="input input--sm" value="${esc(t.label)}" data-ts-l="${i}" aria-label="Note" placeholder="What happens here?"><div class="row" style="gap:2px"><button class="icon-btn icon-btn--sm" type="button" data-ts-go="${i}" aria-label="Jump to ${esc(t.t)}">${icon('play')}</button><button class="icon-btn icon-btn--sm" type="button" data-ts-del="${i}" aria-label="Remove note">${icon('trash-2')}</button></div></div>`).join('') : `<div class="locked">${icon('map-pin')}No timestamped notes yet.</div>`;
          V3.icons(v);
        };
        drawTs();
        /* technique tags */
        const drawTechs = () => {
          const sug = m.ai ? m.ai.tags.map((t) => t.id) : [];
          $('[data-techs]', v).innerHTML = db.techniques.map((t) => `<button class="chip" type="button" data-tech="${t.id}" aria-pressed="${f.techniques.includes(t.id)}" style="--c:${t.color}"><span class="dot"></span>${esc(t.name)}${sug.includes(t.id) ? icon('sparkles') : ''}</button>`).join('');
          V3.icons(v);
        };
        drawTechs();
        const reAI = () => { const p = $('[data-ai-panel]', v); if (p) { p.outerHTML = aiPanel(); V3.icons(v); } };

        /* trim */
        let a = 0.15, b = 0.75;
        const strip = $('[data-strip]', v);
        const drawTrim = () => {
          if (!strip) return;
          $('[data-sel]', v).style.left = a * 100 + '%'; $('[data-sel]', v).style.width = (b - a) * 100 + '%';
          $('[data-h="a"]', v).style.left = a * 100 + '%'; $('[data-h="b"]', v).style.left = b * 100 + '%';
          $('[data-trim-read]', v).textContent = `${V3.fmtSec(a * dec)} → ${V3.fmtSec(b * dec)} · ${V3.fmtSec((b - a) * dec)}`;
          $$('[data-h]', v).forEach((h) => h.setAttribute('aria-valuetext', V3.fmtSec((h.dataset.h === 'a' ? a : b) * dec)));
        };
        if (strip) {
          drawTrim();
          $$('[data-h]', v).forEach((h) => {
            h.addEventListener('pointerdown', (e) => {
              e.preventDefault(); h.setPointerCapture(e.pointerId);
              const mv = (ev) => { const r = strip.getBoundingClientRect(); const x = V3.clamp((ev.clientX - r.left) / r.width, 0, 1); if (h.dataset.h === 'a') a = Math.min(x, b - 0.05); else b = Math.max(x, a + 0.05); drawTrim(); if (player && player.video.duration) player.video.currentTime = (h.dataset.h === 'a' ? a : b) * player.video.duration; };
              const up = () => { h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); };
              h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up);
            });
            h.addEventListener('keydown', (e) => { const d = e.key === 'ArrowRight' ? 0.01 : e.key === 'ArrowLeft' ? -0.01 : 0; if (!d) return; e.preventDefault(); if (h.dataset.h === 'a') a = V3.clamp(a + d, 0, b - 0.05); else b = V3.clamp(b + d, a + 0.05, 1); drawTrim(); });
          });
          if (player) player.video.addEventListener('timeupdate', () => { const p = player.video.duration ? player.video.currentTime / player.video.duration : 0; $('[data-ph]', v).style.left = p * 100 + '%'; });
          $('[data-trim-reset]', v).addEventListener('click', () => { a = 0; b = 1; drawTrim(); });
          $('[data-trim-go]', v).addEventListener('click', (e) => {
            const btn = e.currentTarget; btn.classList.add('is-loading');
            setTimeout(() => {
              btn.classList.remove('is-loading');
              const d = A.createMedia({ dogs: m.dogs.slice(), session: m.session, clip: m.clip, title: `${m.title} (trim ${V3.fmtSec(a * dec)}–${V3.fmtSec(b * dec)})`, processing: 'processing', duration: V3.fmtSec((b - a) * dec), source: m.source });
              d.parent = m.id; d.techniques = f.techniques.slice(); d.notes = f.notes;
              V3.audit('created derived clip', `${d.title} ← ${m.id}`);
              V3.save(); V3.app.refreshChrome();
              V3.toast('Derived clip created — processing on Stream', { icon: 'scissors', sub: 'Private until approved', action: { label: 'Open', fn: () => V3.app.go('#/review/' + d.id) } });
              setTimeout(() => { d.processing = 'ready'; d.editorial = 'needs_review'; A.genAI(d); V3.save(); A.changed(false); }, 3500);
            }, 900);
          });
        }

        /* events */
        v.addEventListener('input', (e) => {
          if (e.target.id === 'rv-title') { f.title = e.target.value; dirty(); }
          if (e.target.id === 'rv-notes') { f.notes = e.target.value; dirty(); }
          if (e.target.dataset.tsT !== undefined) { f.timestamps[+e.target.dataset.tsT].t = e.target.value; dirty(); }
          if (e.target.dataset.tsL !== undefined) { f.timestamps[+e.target.dataset.tsL].label = e.target.value; dirty(); }
        });
        v.addEventListener('change', (e) => {
          if (e.target.id === 'rv-sess') { f.session = e.target.value; dirty(); }
          if (e.target.hasAttribute('data-amb')) { f.ambOK = e.target.checked; dirty(); }
        });
        v.addEventListener('click', async (e) => {
          const t = e.target.closest('button, a'); if (!t) return;
          if (t.dataset.tech) { const id = t.dataset.tech; f.techniques = f.techniques.includes(id) ? f.techniques.filter((x) => x !== id) : f.techniques.concat(id); t.setAttribute('aria-pressed', String(f.techniques.includes(id))); dirty(); }
          if (t.dataset.addtag) { const id = t.dataset.addtag; if (!f.techniques.includes(id)) f.techniques.push(id); drawTechs(); reAI(); dirty(); }
          if (t.dataset.dogsel) { const id = t.dataset.dogsel; if (f.dogs.includes(id) && f.dogs.length === 1) { V3.toast('A clip needs at least one dog', { type: 'error' }); return; } f.dogs = f.dogs.includes(id) ? f.dogs.filter((x) => x !== id) : f.dogs.concat(id); t.setAttribute('aria-pressed', String(f.dogs.includes(id))); dirty(); }
          if (t.dataset.cover) { f.cover = +t.dataset.cover; $$('[data-cover]', v).forEach((x) => x.setAttribute('aria-pressed', String(x === t))); if (player) player.video.poster = V3.img(m.clip, f.cover); dirty(); }
          if (t.hasAttribute('data-ts-add')) { const cur = player ? player.toDecl(player.video.currentTime || 0) : 0; f.timestamps.push({ t: V3.fmtSec(cur), label: '' }); f.timestamps.sort((x, y) => V3.toSec(x.t) - V3.toSec(y.t)); drawTs(); dirty(); const inp = $$('[data-ts-l]', v).find((x) => !x.value); if (inp) inp.focus(); }
          if (t.dataset.tsDel !== undefined) { f.timestamps.splice(+t.dataset.tsDel, 1); drawTs(); dirty(); }
          if (t.dataset.tsGo !== undefined && player) player.seek(V3.toSec(f.timestamps[+t.dataset.tsGo].t));
          if (t.hasAttribute('data-use-ai-title')) { f.title = m.ai.title; $('#rv-title', v).value = f.title; f.ai.title = 'accepted'; reAI(); dirty(); }
          if (t.dataset.aiOk) {
            const k = t.dataset.aiOk; f.ai[k] = 'accepted';
            if (k === 'title') { f.title = m.ai.title; $('#rv-title', v).value = f.title; }
            if (k === 'summary') { f.notes = f.notes ? f.notes + '\n\n' + m.ai.summary : m.ai.summary; $('#rv-notes', v).value = f.notes; }
            if (k === 'tags') { m.ai.tags.filter((x) => x.c >= 0.5).forEach((x) => { if (!f.techniques.includes(x.id)) f.techniques.push(x.id); }); drawTechs(); }
            reAI(); dirty(); V3.toast(`Accepted AI ${k}`, { icon: 'check', duration: 1400 });
          }
          if (t.dataset.aiNo) { f.ai[t.dataset.aiNo] = 'rejected'; reAI(); dirty(); }
          if (t.hasAttribute('data-regen')) {
            const p = $('[data-ai-panel] .panel__b', v);
            p.innerHTML = `<div class="shimmer-text" style="font-family:var(--font-mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;margin:6px 0 12px">Sampling frames · transcribing…</div>${['70%', '95%', '82%', '40%', '88%', '60%'].map((w) => `<div class="skel skel-line" style="width:${w}"></div>`).join('')}`;
            setTimeout(() => { variant++; A.genAI(m, variant); f.ai = { title: null, summary: null, tags: null, transcript: null }; V3.save(); reAI(); drawTechs(); V3.toast('New AI draft', { icon: 'sparkles', sub: `Spend this month $${db.stats.trainer.aiSpendMonth.toFixed(2)}` }); }, 1600);
          }
          if (t.hasAttribute('data-sim-ready')) { m.processing = 'ready'; const u = db.uploads.find((x) => x.media === m.id); if (u) { u.state = 'ready'; u.progress = 1; } if (!m.ai) A.genAI(m); if (m.editorial === 'draft') m.editorial = 'needs_review'; V3.audit('Stream ready', `${m.title} (${m.id})`, 'System'); V3.save(); V3.app.refreshChrome(); V3.app.refresh(); V3.toast('Stream webhook received', { icon: 'webhook', sub: 'AI draft generated' }); }
          if (t.hasAttribute('data-save')) { save(); V3.toast('Draft saved', { sub: 'Still private' }); }
          if (t.hasAttribute('data-approve')) approveFlow();
          if (t.hasAttribute('data-archive')) { if (await V3.confirm('Archive this clip?', 'It’s removed from the queue and any client access is revoked. You can restore it from the media library.', 'Archive', true)) { m.editorial = 'archived'; m.visibility = 'trainer_only'; V3.audit('archived', `${m.title} (${m.id})`); V3.save(); V3.app.refreshChrome(); V3.toast('Archived', { icon: 'archive' }); V3.app.go('#/review'); } }
        });
        function save() {
          m.title = f.title.trim() || m.title; m.notes = f.notes.trim(); m.techniques = f.techniques.slice(); m.timestamps = f.timestamps.filter((x) => x.label.trim()); m.dogs = f.dogs.slice(); m.cover = f.cover; m.aiReview = f.ai; m.ambOK = f.ambOK;
          if (f.session !== m.session) { const old = V3.session(m.session); if (old) old.media = old.media.filter((x) => x !== m.id); const nw = V3.session(f.session); if (nw && !nw.media.includes(m.id)) nw.media.push(m.id); m.session = f.session; }
          V3.save(); const d = $('[data-dirty]', v); if (d) d.textContent = '✓ saved'; $('[data-title-h]', v).textContent = m.title;
        }
        function approveFlow() {
          if (isAmbiguous(m) && !f.ambOK) { V3.toast('Confirm which dogs are in the clip first', { type: 'error', icon: 'triangle-alert' }); const c = $('[data-amb]', v); if (c) { c.closest('.panel').scrollIntoView({ behavior: 'smooth', block: 'center' }); c.focus(); } return; }
          save();
          const sess = V3.session(m.session);
          const hh = sess ? V3.household(sess.household) : null;
          const members = hh ? V3.membersOf(hh.id).filter((u) => u.invite === 'accepted') : [];
          const groups = db.groups.filter((g) => hh && g.members.includes(hh.id));
          const consent = () => db.consents.find((c) => c.media === m.id && c.status === 'active');
          const cur = { trainer_only: 0, household: 1, group: 2, public: 3 }[m.visibility] || 1;
          let pick = m.editorial === 'needs_review' || m.editorial === 'draft' ? 1 : cur;
          if (!hh && (pick === 1 || pick === 2)) pick = 0;
          let grp = groups[0] ? groups[0].id : '';
          const md = V3.modal({
            title: 'Approve &amp; choose audience', label: 'Explicit, audited action', wide: true, sub: `“${esc(m.title)}” — ${esc(A.dogNames(m.dogs))}`,
            body: `<div class="aud-opts" role="radiogroup" aria-label="Audience">
              <div class="aud-o" role="radio" tabindex="0" data-o="0"><span class="aud-o__ic">${icon('lock')}</span><span><b>Trainer only</b><small>Approved, but private to you. Good for your own records.</small></span><span class="r"></span></div>
              <div class="aud-o" role="radio" tabindex="0" data-o="1"${hh ? '' : ' aria-disabled="true" style="opacity:.5"'}><span class="aud-o__ic">${icon('house')}</span><span><b>${hh ? esc(hh.name) : 'Household'}</b><small>${members.length ? `${members.map((u) => esc(u.name)).join(', ')} can watch in the portal.` : 'No accepted members yet — they’ll see it once they join.'}</small></span><span class="r"></span></div>
              <div class="aud-o" role="radio" tabindex="0" data-o="2"${groups.length ? '' : ' aria-disabled="true" style="opacity:.5"'}><span class="aud-o__ic">${icon('users')}</span><span style="flex:1"><b>Training group</b><small>${groups.length ? 'Expands to each household in the group.' : 'This household isn’t in any group.'}</small>${groups.length ? `<select class="select select--sm" data-grp style="margin-top:8px;max-width:320px">${groups.map((g) => `<option value="${g.id}">${esc(g.title)} · ${g.members.length} households</option>`).join('')}</select>` : ''}</span><span class="r"></span></div>
              <div class="aud-o" role="radio" tabindex="0" data-o="3"><span class="aud-o__ic">${icon('globe')}</span><span style="flex:1"><b>Public (website &amp; guides)</b><small>Requires a recorded consent for everyone identifiable in the clip.</small><span data-consent style="display:block;margin-top:8px"></span></span><span class="r"></span></div>
            </div>
            <div class="notice" style="margin-top:14px">${icon('scroll-text')}<span>This approval and the access grant are written to the audit log. You can change or revoke access later.</span></div>`,
            foot: `<button class="btn btn--ghost" type="button" data-close>Cancel</button><button class="btn btn--accent" type="button" data-confirm>${icon('check')} Approve</button>`,
            onOpen(root) {
              const drawC = () => {
                const c = consent();
                $('[data-consent]', root).innerHTML = c ? `<span class="state" data-s="active">Consent ${esc(c.id)} · ${esc(c.evidence)}</span>` : `<span class="row row--wrap" style="gap:8px"><span class="state" data-s="failed">No consent on file</span><span class="btn btn--xs btn--ghost" role="button" tabindex="0" data-addc>${icon('file-plus')} Record consent</span></span>`;
                V3.icons(root);
              };
              const draw = () => {
                $$('[data-o]', root).forEach((b) => { const on = +b.dataset.o === pick; b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-checked', String(on)); });
                const blocked = pick === 3 && !consent();
                $('[data-confirm]', root).disabled = blocked;
                $('[data-confirm]', root).innerHTML = `${icon(blocked ? 'lock' : 'check')} ${blocked ? 'Consent required' : ['Approve · private', 'Approve & grant household', 'Approve & grant group', 'Publish public edition'][pick]}`;
                V3.icons(root);
              };
              drawC(); draw();
              root.addEventListener('click', (e) => {
                const o = e.target.closest('[data-o]'); if (o && o.getAttribute('aria-disabled') !== 'true' && !e.target.closest('select, [data-addc]')) { pick = +o.dataset.o; draw(); }
                if (e.target.closest('[data-addc]')) { A.consentModal({ media: m.id, onSave: () => { drawC(); draw(); } }); }
              });
              root.addEventListener('keydown', (e) => { const o = e.target.closest('[data-o]'); if (o && (e.key === 'Enter' || e.key === ' ') && e.target === o) { e.preventDefault(); o.click(); } if (e.target.closest('[data-addc]') && e.key === 'Enter') e.target.click(); });
              const gs = $('[data-grp]', root); if (gs) gs.addEventListener('change', () => { grp = gs.value; pick = 2; draw(); });
              $('[data-confirm]', root).addEventListener('click', () => {
                const map = [['approved_private', 'trainer_only'], ['approved_shared', 'household'], ['approved_shared', 'group'], ['published_public', 'public']][pick];
                m.editorial = map[0]; m.visibility = map[1]; m.group = pick === 2 ? grp : null;
                const target = pick === 1 ? hh.name : pick === 2 ? V3.group(grp).title : pick === 3 ? 'Public' : 'Trainer only';
                V3.audit(pick === 3 ? 'published public edition' : 'approved & granted', `${m.title} → ${target}`);
                V3.save(); V3.app.refreshChrome(); md.close();
                V3.toast(`Approved · ${esc(target)}`, { icon: 'shield-check', sub: pick === 1 ? 'Visible in their portal now' : pick === 3 ? 'Eligible for guides' : 'Saved', action: pick === 1 || pick === 2 ? { label: 'Share', fn: () => V3.app.go('#/share?m=' + m.id) } : null });
                const nx = A.reviewQueue().find((x) => x.id !== m.id && x.editorial === 'needs_review');
                V3.app.go(nx ? '#/review/' + nx.id : '#/review');
              });
            }
          });
        }
        return () => { if (player) player.video.pause(); };
      }
    };
  };

  /* Media library ---------------------------------------------------------- */
  R['media'] = (_, q) => {
    const st = V3.store.get('media-filters', { dog: '', tech: '', ed: '', view: 'grid', q: '' });
    ['dog', 'tech', 'ed'].forEach((k) => { if (q.get(k) !== null) st[k] = q.get(k); });
    return {
      title: 'Media library', nav: 'media',
      html: `${A.vh(`<span>${db.media.length} clips · Cloudflare Stream</span>`, 'Media library', 'Every clip, every state. Filter by dog, technique or where it’s up to.', `<a class="btn btn--accent btn--sm" href="#/record">${icon('circle-dot')} Record</a>`)}
      <div class="toolbar-a">
        <label class="input-group"><i data-lucide="search"></i><span class="sr-only">Search media</span><input class="input input--sm" type="search" data-f="q" placeholder="Search titles, notes…" value="${esc(st.q)}"></label>
        <select class="select select--sm" data-f="dog" aria-label="Dog"><option value="">All dogs</option>${db.dogs.map((d) => `<option value="${d.id}"${st.dog === d.id ? ' selected' : ''}>${esc(d.name)}</option>`).join('')}</select>
        <select class="select select--sm" data-f="tech" aria-label="Technique"><option value="">All techniques</option>${db.techniques.map((t) => `<option value="${t.id}"${st.tech === t.id ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}</select>
        <select class="select select--sm" data-f="ed" aria-label="State"><option value="">All states</option>${Object.entries(V3.label.editorial).map(([k, l]) => `<option value="${k}"${st.ed === k ? ' selected' : ''}>${l}</option>`).join('')}<option value="p:uploading"${st.ed === 'p:uploading' ? ' selected' : ''}>Uploading</option><option value="p:failed"${st.ed === 'p:failed' ? ' selected' : ''}>Failed</option></select>
        <span class="spacer"></span>
        <div class="seg" role="group" aria-label="View"><button type="button" data-view="grid" aria-pressed="${st.view === 'grid'}" aria-label="Grid view">${icon('layout-grid')}</button><button type="button" data-view="list" aria-pressed="${st.view === 'list'}" aria-label="List view">${icon('list')}</button></div>
      </div>
      <div class="mono faint" style="margin-bottom:12px" data-count></div>
      <div data-out></div>`,
      mount(v) {
        const draw = () => {
          const s = st.q.trim();
          const list = db.media.filter((m) => (!st.dog || m.dogs.includes(st.dog)) && (!st.tech || m.techniques.includes(st.tech)) && (!st.ed || (st.ed.startsWith('p:') ? m.processing === st.ed.slice(2) : m.editorial === st.ed)) && (!s || V3.fuzzy(s, `${m.title} ${m.notes} ${A.dogNames(m.dogs)}`) > 0));
          $('[data-count]', v).textContent = `${list.length} of ${db.media.length} clips`;
          $('[data-out]', v).innerHTML = !list.length ? `<div class="card card--flat">${A.empty('filter-x', 'No clips match', 'Try clearing a filter.', '<button class="btn btn--sm btn--ghost" type="button" data-clear>Clear filters</button>')}</div>` : st.view === 'grid' ? `<div class="mgrid">${list.map((m) => A.mediaCard(m)).join('')}</div>` :
            `<div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Clip</th><th class="hide-m">Dog</th><th class="hide-m">Techniques</th><th>State</th><th class="hide-m">Visibility</th><th class="hide-m">Created</th></tr></thead><tbody>${list.map((m) => `<tr data-href="#/review/${m.id}" tabindex="0"><td><div class="row" style="gap:10px"><span class="lrow__thumb"><img src="${V3.thumb(m.clip, m.cover || 40)}" alt=""></span><b style="font-weight:550">${esc(m.title)}</b></div></td><td class="hide-m">${esc(A.dogNames(m.dogs))}</td><td class="hide-m"><div class="row row--wrap" style="gap:4px">${A.techTags(m.techniques) || '<span class="faint">—</span>'}</div></td><td>${A.edState(m)}${m.processing !== 'ready' ? ' ' + A.prState(m) : ''}</td><td class="hide-m">${icon(A.visIcon[m.visibility] || 'lock')} ${esc(V3.label.visibility[m.visibility])}</td><td class="hide-m num faint">${V3.fmtDate(m.created)}</td></tr>`).join('')}</tbody></table></div></div>`;
          V3.icons(v); V3.hoverPlay(v);
          V3.store.set('media-filters', st);
        };
        v.addEventListener('input', (e) => { const k = e.target.dataset.f; if (k) { st[k] = e.target.value; draw(); } });
        v.addEventListener('click', (e) => {
          const b = e.target.closest('[data-view]'); if (b) { st.view = b.dataset.view; $$('[data-view]', v).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); draw(); }
          if (e.target.closest('[data-clear]')) { Object.assign(st, { dog: '', tech: '', ed: '', q: '' }); V3.app.go('#/media'); V3.app.refresh(); }
        });
        draw();
      }
    };
  };
})();
