# Common brief — Linda's Dog Training prototypes

Read `/Users/shaun/Downloads/linda-dog-training-platform-prd-v1.md` (the PRD), `/Users/shaun/linda/shared/MEDIA.md` and `/Users/shaun/linda/shared/data.js` before starting.

We are building **three distinct, client-presentable, clickable prototypes** of the whole product. Each version lives in its own folder (`/v1`, `/v2`, `/v3`) and shares only `/shared` (media, vendor libs, mock data). The server root is `/Users/shaun/linda`, served by a static server at http://localhost:8080 — so use site-absolute paths like `/shared/media/video/1552.mp4` and `/v2/admin/index.html`.

## Tech rules
- Plain static HTML + CSS + vanilla JS. No build step, no npm, no frameworks. Each page must work when opened via the static server.
- Load libraries from `/shared/vendor/` (GSAP 3.13 + ScrollTrigger + SplitText + Flip + Draggable + Observer + ScrollToPlugin + CustomEase, Lenis, Lucide). Google Fonts via `<link>` is fine.
- Load mock data with `<script src="/shared/data.js"></script>` → `window.LINDA`. Render lists/tables/cards from it (don't hard-code what the data already has). You may add version-local mock data in your own JS if needed.
- App areas (admin + client portal) should be single-page apps with hash routing (`#/dashboard`, `#/review/m-1002`, …) rendered by your JS — keeps everything fast and consistent.
- Everything must *appear* functional: buttons do something (toasts, modals, state changes, fake progress, optimistic UI), forms validate and "submit", login "sends a magic link" then lets you in, uploads progress and complete, AI suggestions "generate" with shimmer/skeletons, trimming handles drag, share composer previews the WhatsApp message, etc. Persist small UI state in localStorage (wrapped in try/catch) so the demo feels alive across pages — e.g. approving a video moves it out of the review queue.
- Mobile responsive is mandatory: test-think every layout at 375px, 768px, 1280px, 1600px. No horizontal scroll. Trainer PWA must feel like a native phone app on mobile (bottom tab bar, big record button, thumb-reachable actions, safe-area padding). Desktop admin should be a proper responsive dashboard (sidebar).
- Respect `prefers-reduced-motion` (disable scrubbing/parallax, keep content visible).
- Accessibility: semantic landmarks, alt text, focus states, buttons are `<button>`, sufficient contrast, tap targets ≥ 44px.
- Videos: `muted playsinline autoplay loop preload="metadata"` with `poster` from `/shared/media/img/…`. Lazy-load below-the-fold videos (IntersectionObserver play/pause).
- Performance: don't load all 120 frame-sequence images eagerly before first paint; preload progressively. Keep the hero snappy.
- After writing JS, run `node --check file.js` on every JS file to catch syntax errors. Do NOT use the browser preview tools — the lead will review visually. Do not touch `/shared` or the other version folders.

## Required pages / screens (each version)
### Public marketing site (`/vN/index.html` + other pages)
1. **Home** — the showpiece. Must include: a jaw-dropping hero; at least one **scroll-driven video** moment (canvas frame-sequence scrub from `/shared/media/frames/{id}/` or scrubbed `/shared/media/scrub/{id}.mp4`); GSAP ScrollTrigger pinned sections; SplitText headline reveals; Lenis smooth scroll; a section explaining the product journey (Record → Upload → AI drafts → Linda reviews → Shared privately → Revisit anytime); a section showing the client portal (phone mockup with real UI inside); training academy teaser (guides from data); privacy-first message ("every video starts private"); a future community teaser ("Coming soon: dog profiles"); CTA + footer.
2. **About** (Linda — placeholder bio; do NOT invent qualifications, prices or testimonials; use obvious placeholder markers like "[Linda's story — to be supplied]" styled tastefully).
3. **Training Academy** index (guides grid with filters by technique) + **Recall 101** guide detail page (full structured content from data: sections, steps, video, common mistakes, homework checklist that ticks, FAQ accordion, related guides).
4. **Blog** index + one article page, **FAQ** page (accordion), **Contact** page (form with validation + success state).
5. **Login** page — passwordless email magic-link flow (enter email → "check your inbox" state → button "Open magic link (demo)" → routes to client portal). Also a "Trainer sign in" option → admin.
6. Shared nav with mobile menu (animated), consistent footer linking to everything, including the client portal and admin demos.

### Client portal (`/vN/portal/index.html`, SPA) — signed in as Sarah Thompson (household with Bramble)
- **My Dogs** (household dogs, latest session, progress), **Dog profile / timeline** (sessions, approved videos, notes, homework, technique labels), **Video detail** (custom video player UI, trainer notes, clickable timestamps that seek the video, related techniques & guides, transcript), **Homework** (checklist with progress), **Training Library** (assigned guides), **Account** (household members, invite member modal, notifications prefs, privacy & consent view). Only show *approved_shared / published_public* media to the client — demonstrate the privacy model. Include a household switcher to show multi-household support.
- Bonus: a "Coming soon — Bramble's public profile" preview (Phase 3).

### Trainer admin / PWA (`/vN/admin/index.html`, SPA) — signed in as Linda
- **Dashboard** — current/active session card, big Record CTA, upload queue status, review queue count, unassigned inbox, prepared shares, recent sessions, portal opens, small charts (sessions/week, Stream minutes, AI spend vs ceiling).
- **Record flow** — pick client → dog → start session (searchable, fast), then a camera screen (simulate the OS camera: use a `/shared/media/vertical/*.mp4` clip as the "viewfinder", REC timer, stop) → returns and the upload immediately starts with progress (tus resumable, pause/resume, simulated "Safari suspended" error + retry). Context stays sticky for repeat recordings.
- **Uploads** — queue with states created/uploading/uploaded/processing/ready/failed/cancelled.
- **Review queue + Review detail** — video player, AI suggestions panel (title, summary, tags with confidence bars, transcript, evidence, "regenerate", accept/reject per field), editable title/notes/timestamped notes, technique tags, dog/session association (with the ambiguity warning for multi-dog clips), **trim** UI (draggable in/out handles over a filmstrip, creates a "derived clip"), cover thumbnail picker, and an **Approve & choose audience** step (trainer-only / household / group / public — public requires consent check).
- **Clients / Households / Dogs** — list + household detail (members with invite states, dogs, sessions, media), dog detail, add household / add dog modals, duplicate-contact warning example.
- **Sessions** list + session detail.
- **Media library** — grid with filters (dog, technique, state).
- **Share composer** — pick videos, pick households/users/groups, message editor with templates, mode toggle `link_only` / `video_only` / `link_and_video`, privacy warning when attaching a file, live WhatsApp-style preview bubble, "Preparing video…" MP4 export step, "Open WhatsApp" handoff, two-step fallback explanation, then "I sent it" manual confirmation. States: draft → prepared → handoff_opened → trainer_confirmed. Never claim delivered/read.
- **Share history**.
- **WhatsApp Archive inbox** — unassigned items, assign to dog/session, too-large (16 MB) item with "Use PWA upload instead", quarantined unknown sender, voice note → transcript.
- **Groups** (training groups membership), **Techniques** taxonomy, **Academy CMS** (guide list + block-based editor preview for Recall 101 with "insert approved video" picker and publish check), **Consent records**, **Audit log**, **Settings** (limits, AI ceiling, archive number, integrations status cards: Cloudflare Stream, WhatsApp Cloud API, AI provider).
- A ⌘K / search command palette is a strong plus.

## Content rules (from PRD)
- Brand: "Linda's Dog Training" (working title). NZ English (colour, organise, whānau, kia ora used naturally). Do not invent qualifications, prices, awards or testimonials — use tasteful placeholders.
- Every video starts private. AI only drafts; Linda approves. WhatsApp sharing is user-mediated — never "sent/delivered/read".

## Quality bar
This is going in front of the client to win the work. It must look like a top-tier agency built it (Awwwards SOTD level): confident typography scale, generous whitespace, art-directed imagery, purposeful motion (no gratuitous jank), micro-interactions on every interactive element, custom cursor or magnetic buttons where it fits the direction, page-load intro, smooth page transitions. Consistency of the design system across marketing, portal and admin is critical — they must feel like one product family. Polish empty/loading/error states. No lorem ipsum.
