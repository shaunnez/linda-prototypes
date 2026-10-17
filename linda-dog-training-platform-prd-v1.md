---
title: "Dog Training Platform | Product Requirements Document"
subtitle: "Trainer PWA, client portal, WhatsApp archive, training academy, future dog community"
author: "Product specification"
date: "17 October 2026"
version: "1.0"
status: "Proposed for implementation"
---

# Dog Training Platform

**Product Requirements Document (PRD)**  
**Working title:** Linda's Dog Training Platform  
**Version:** 1.0  
**Date:** 17 October 2026  
**Status:** Ready for technical spike and implementation planning  
**Primary market:** New Zealand  
**Primary users:** Linda (trainer), dog owners and their households

> **Product promise:** Linda can select a client and dog, capture a training video, let it upload automatically, approve AI-assisted notes, and share the finished training with the right people. Dog owners have a private, permanent place to revisit their training. Over time, the same platform becomes a learning library and a community of dog profiles.

## 1. Executive summary

Build a mobile-first Progressive Web App (PWA) with three interconnected products:

1. **Trainer workspace (MVP):** Clients, households, dogs, sessions, direct-to-Cloudflare-Stream recording and upload, AI suggestions, trimming, notes, tags, access control and sharing.
2. **Client portal (MVP):** Secure access to each household's dogs, session timeline, recordings, instructions and assigned training material.
3. **Training academy and community (later):** Public guides such as "Recall 101", blog and FAQ content; eventually owner-customisable dog profiles, galleries, posts, public discovery and friend requests.

Linda retains her **personal WhatsApp account**. A **separate WhatsApp Business API archive number** receives videos and notes that she intentionally forwards. Outbound WhatsApp sharing from her personal account is **user-mediated**: the PWA prepares the message and/or downloadable MP4, launches WhatsApp or the phone's Share Sheet, and Linda selects/approves recipients and sends. The backend must not claim to send from her personal account or confirm WhatsApp delivery.

Cloudflare Stream is the sole persistent video host in MVP. There is no bespoke video transcoding service and no requirement to retain original camera files in a second object store. This trade-off is explicit: advanced source-quality editing later may require original-file storage.

## 2. Problem, objectives and success measures

### Current problems

- Training videos and advice are scattered across WhatsApp conversations and difficult for clients to rediscover.
- Linda repeats explanations instead of reusing well-made instructional material.
- Session recordings are not consistently associated with the correct dog, technique or training goal.
- Publishing useful clips publicly requires manual curation and a separate content workflow.
- Personal WhatsApp is not a viable programmatic outbound messaging API.

### MVP goals

- Reduce Linda's work between finishing a recording and making it available to the correct dog/household.
- Organise session videos by client, dog, date, training technique and training note.
- Keep every recording trainer-private until Linda explicitly approves who can see it.
- Provide straightforward, accurate link-only and optional video-file WhatsApp sharing.
- Offer clients a secure training history with mobile video playback and basic search/filtering.
- Prove that the workflow is useful on Linda's actual phone, not only in a desktop demo.

### Proposed launch targets (to validate during pilot)

| Metric | Target |
|---|---|
| Trainer uploads that reach a playable state, on stable connectivity | At least 95% |
| New recordings correctly attached to the selected dog/session | 100% for explicitly selected context |
| Cross-household exposure in permission tests | Zero |
| Time to select dog and start camera | Under 15 seconds in a usability test |
| Trainer review needed for public visibility | 100% of new media |
| Pilot households accessing at least one shared video | At least 70% within 14 days |
| Demonstrable WhatsApp sharing via tested iOS flow | Link-only, video-only and link-plus-video fallback |

These are product targets, not guaranteed provider service-level agreements.

## 3. Scope and delivery phases

| Phase | Included | Deliberately excluded |
|---|---|---|
| **0. Technical spike** | Real-device iPhone recording, resumable Stream upload, private MP4 download, personal WhatsApp Share Sheet, archive-number inbound video | Full UI and production data migration |
| **1. MVP** | Trainer PWA, household/dog CRM, sessions, recording/import, Stream processing, AI draft suggestions, review/trim/tags, client portal, permissions, sharing composer, WhatsApp archive inbox, basic public site | Automated sends from personal WhatsApp, group-chat membership sync, payments and booking automation |
| **2. Academy** | Technique taxonomy, rich guides, "Recall 101", reusable videos, blog, FAQ, guide assignments, public search/SEO | Social feed and friend requests |
| **3. Dog portfolios** | Owner-managed dog profile, photos/videos, posts, configurable public profile, private vs public media separation | Full social graph |
| **4. Community** | Dog discovery, friend requests, feeds, comments, moderation, blocking/reporting | Unmoderated or minor-owned public accounts |

A basic public home/about/contact/login experience is in Phase 1. The complete CMS for guides, blog and FAQs is in Phase 2. Future entities are anticipated in the schema; they do not need MVP UI.

## 4. Users, roles and permissions

**Trainer / Admin (Linda):** Manages clients, dogs, sessions, videos, training taxonomy, groups, approvals, sharing and eventually published content. Can review operational errors and account consents.

**Client / Household member:** Belongs to one or more households, sees explicitly authorised dog records, sessions, videos and homework. Can manage household permissions subject to defined owner/admin rules.

**Future staff trainer:** Scoped operational access by assigned clients. Schema should allow this role but it is not required in MVP.

**Future community participant:** Signed-in adult using public and friends-only dog-profile features. Friend access never implies access to private training notes or sessions.

**Guest:** Sees only published public site content and explicitly public guides/videos.

### Permission rules

- Dogs belong to a household. A household can contain multiple people and dogs. A user may belong to multiple households.
- A video may be linked to a session and to one or more dogs; each dog association is explicit. The MVP defaults to the dog selected before recording.
- New video visibility defaults to **trainer only**. Publishing to a household, training group or public site is a separate, audited action.
- A training group is an **application-managed membership list**, not necessarily a WhatsApp group chat. WhatsApp group membership cannot be imported from Linda's personal account.
- Recipients must have an active permission grant to the video before a private link can play. A WhatsApp URL alone is not an access grant.
- Public publication requires a separate consent check for identifiable people and other applicable permissions. Making a dog's future profile public does not expose private training material.

## 5. User journeys

### J1. Record during an in-person session

1. Linda signs into her PWA and searches/selects a client or household.
2. She selects a dog and taps **Start session** or selects an active session.
3. She taps **Record video**. The phone camera opens. She records and returns to the PWA.
4. The file immediately begins uploading to a one-time Cloudflare Stream direct-upload URL. No additional upload confirmation is required after the recording returns from the camera.
5. The video is immediately associated with Linda, the selected dog and session in the database. It appears in the upload queue with progress and recoverable errors.
6. Stream reports video-ready via webhook. AI generates draft title, summary, transcript where speech exists and training tags.
7. Linda later opens the review queue, edits the details, optionally trims the video, and approves the intended audience.
8. The authorised client sees it in the dog's training timeline.

**Important browser boundary:** On iOS, launching the camera through a PWA may use the operating system's recording UI, not a fully custom in-page recorder. Upload can begin when the file is returned. Upload cannot be guaranteed to continue while Safari/PWA is suspended or terminated. Show accurate status, advise keeping the app open, and provide resumable/retry behaviour when the file remains available.

### J2. Forward an existing WhatsApp video

1. Linda forwards a small existing video from personal WhatsApp to the dedicated archive number.
2. The Cloud API webhook receives it and the backend retrieves the media immediately.
3. If a unique dog/session context was explicitly established, the clip is attached there; otherwise it appears in an **Unassigned inbox**.
4. Linda selects the appropriate dog/session in the portal. The clip enters the normal Stream and AI review flow.
5. Large or unsupported WhatsApp media displays guidance to import directly through the PWA.

A forwarded message identifies Linda as the sender to the archive number. It **does not reliably identify the client's original conversation or dog**. Do not infer ownership from forwarded metadata.

### J3. Share after training

1. Linda selects one or more approved videos or a training session summary.
2. She chooses individual client contacts, households or application-defined training groups.
3. She writes or edits a message, chooses `link_only`, `video_only` or `link_and_video`, and previews the exact material.
4. The backend validates audience grants and prepares secure portal links. If a video file is requested, it first ensures an MP4 export is ready.
5. Linda launches WhatsApp. For an individual, use a prefilled message/deep link where suitable. For file attachments or groups, use the native Share Sheet and let Linda select actual WhatsApp recipients.
6. If the platform cannot share the MP4 and text/link together reliably, the UI offers a clearly explained **two-step fallback**: share the file, then paste/send the prepared message and secure link in the same conversation.
7. Record that sharing was **prepared**, **share sheet opened** or **trainer confirmed manually**. Do not record WhatsApp delivery/read status for personal-account shares.

Sharing a video as a file creates a copy outside the platform's revocation controls. Warn Linda before including private footage as an attachment.

### J4. Client revisits training

1. Client opens a WhatsApp portal link and signs in or accepts a time-limited invitation.
2. They land on the relevant dog, session or video.
3. They play video, read approved notes and optional timestamped guidance, and navigate related training techniques.
4. They can revisit the same material from **My Dogs**, **Sessions** and **Training Library** later.

### J5. Publish a training guide (Phase 2)

1. Linda creates **Recall 101**, a draft training guide with structured sections, instructions, examples and FAQs.
2. She inserts approved videos already in the library rather than reuploading duplicate clips.
3. The CMS verifies the video has public publication permission or is otherwise appropriately licensed.
4. She previews and publishes; owners can find it through site search and Linda can assign it as homework.

## 6. Functional requirements: trainer and CRM

| ID | Requirement | Acceptance criterion |
|---|---|---|
| CRM-01 | Create, edit, deactivate households and clients | A household supports multiple users and multiple dogs; deactivation does not expose or silently delete their media |
| CRM-02 | Create/edit dog details | Name, optional breed, DOB/age, notes, owner links and training status; names need not be globally unique |
| CRM-03 | Associate contact records | Store canonical international phone numbers and email addresses; show duplicate warnings |
| CRM-04 | Session management | Start/end session, associate one or more dogs, date, notes, recordings and homework |
| CRM-05 | Training groups | Linda creates portal groups with selected households/users and can edit membership |
| CRM-06 | Dashboard | Recent sessions, uploads, unassigned media, AI review items and prepared shares |
| CRM-07 | Invitation and access | Invite a household member, accept invitation after authentication, revoke access and audit changes |

No CRM feature may infer ownership from matching display names alone.

## 7. Functional requirements: capture, upload and media

**Media-01: PWA recording.** A selected client, dog and session remain the default context until Linda changes them. The recording action invokes the device camera with an upload-from-library alternative. Repeated recording within a session should require no re-selection.

**Media-02: Direct Stream upload.** Backend provisions authenticated, one-time creator-upload credentials with `requireSignedURLs` enabled at video creation, including the tus equivalent for resumable uploads. The browser transfers bytes directly to Stream using tus when required or desirable. Application servers never proxy multi-hundred-megabyte phone recordings.

**Media-03: Upload states.** Track `created`, `uploading`, `uploaded`, `processing`, `ready`, `failed` and `cancelled`. Display progress, errors, retry and whether the source needs re-selection. Ensure an idempotent upload confirmation and webhook reconciliation path.

**Media-04: Review states.** Independently track `draft`, `needs_review`, `approved_private`, `approved_shared`, `published_public` and `archived`. Processing readiness is not approval to view.

**Media-05: Basic editing.** Linda can edit title, description, trainer notes, technique tags, dog/session associations and cover thumbnail. She can mark a start/end trim. Trimming creates a separate derived Stream clip linked to its source; the new clip remains private and must pass processing before sharing.

**Media-06: No full video editor.** Joining clips, text burned into video, animated annotations, professional timeline editing and client-side re-encoding are out of MVP scope. Timestamped notes can be displayed next to the player without changing video bytes.

**Media-07: Private playback.** Stream video IDs are not exposed as a means of gaining access. Server checks household/group grants and issues short-lived signed playback tokens. Download permission is separately checked and limited.

**Media-08: Storage lifecycle.** Deleting a video must remove Stream assets and derived clips (subject to administrative retention policy), revoke access, clean up broken links and preserve required audit records without retaining deleted content indefinitely.

**Media-09: Limits.** Start with a configurable application video-duration/file-size guardrail, with generous limits for practical phone use. Stream supports a larger technical maximum than WhatsApp; provide warnings and a recovery path rather than building a bespoke compressor.

**Media-10: Client uploads (later).** Reuse the same media abstraction for owners' portfolio videos without granting those owners access to Linda's administrative training notes.

## 8. Functional requirements: AI assistance

**Trigger:** When Stream reports an authorised upload or derived clip as ready, enqueue analysis. AI processing must never block video availability or interfere with upload completion.

**Draft output:**

- Suggested concise title and description.
- Suggested controlled-vocabulary tags such as recall, loose-leash walking, impulse control, settling, socialisation and reinforcement.
- A short coaching summary and potential example timestamps.
- Transcript where speech is present and reasonably intelligible.
- Confidence and evidence references, such as the part of the transcript or sampled frame supporting a suggestion.

**Review rules:**

- AI never publishes directly, grants permissions, changes client/dog identity automatically, or sends WhatsApp messages.
- The explicitly selected dog/session is authoritative. Where association is ambiguous, request a human decision.
- AI must not diagnose medical or behavioural disorders, identify people by face or represent unverified techniques as instructions endorsed by Linda.
- Suggestions are editable, rejectable and regenerable. Preserve the accepted version and a minimal audit trail.
- If audio is absent or visual evidence limited, the system must say so rather than invent details.

**Implementation:** Use an asynchronous worker. Extract audio/transcript where available; sample frames or use a supported multimodal video analysis method for visual classification. Store only information needed for the product. Configure per-video and monthly AI spending ceilings, retry limits and failure status. Vendor data processing terms and privacy requirements must be checked before production.

## 9. Functional requirements: WhatsApp archive ingestion

The archive number is a **separate WhatsApp Business Platform number**, used initially for **inbound ingestion only**. Linda's personal number stays unchanged.

**WA-01:** Verify webhook challenge and message signature, accept supported incoming text/video/audio messages, deduplicate by WhatsApp message ID and acknowledge quickly before processing asynchronously.

**WA-02:** Accept inbound material only from authorised trainer numbers in MVP; disregard or quarantine unknown senders. Do not use the archive number as a general consumer inbox.

**WA-03:** Fetch media promptly from Meta's media endpoint, then ingest into Stream. Add provenance `whatsapp_archive` and the source message ID.

**WA-04:** Forwarded videos without confirmed dog/session context go to **Unassigned**, not to the last dog by guess. Optionally support a unique, explicit dog code command or active-session context after testing.

**WA-05:** Show unsupported-media and upload-failure states and a **Use PWA upload instead** recovery action. Meta's documented Cloud API video limit is **16 MB** for video media; a backend cannot compress a file that WhatsApp never delivers to it.

**WA-06:** A forwarded voice note may become a transcript and note, with a short-lived working copy removed after processing. Persistent audio hosting/playback is not an MVP requirement because Stream is the selected video service.

**WA-07:** Import of historical chats, full conversation synchronisation, contact harvesting, and automatic outgoing messages are excluded.

## 10. Functional requirements: configurable sharing

Sharing is driven by a **ShareIntent**, not a server-side personal WhatsApp send. The UI must make its limitations visible.

**Settings per share:** message, selected video(s)/session/guide, selected households/users/groups, link inclusion, video-file inclusion, privacy warning and share preview.

| Mode | Expected behaviour | Fallback |
|---|---|---|
| `link_only` | Create authorised portal URL, prepare text and open WhatsApp composer for one recipient or native share selection | Copy message and URL |
| `video_only` | Prepare a downloadable, signed MP4 and invoke native file sharing | Download MP4, share manually |
| `link_and_video` | Try native sharing of video file plus message/link after feature detection and device test | Guided two-step send; copy text/link followed by native video share |

**Audience resolution:** Application groups are expanded into explicit eligible household/user grants; deduplicate recipients. Where several recipients cannot be reliably targeted from the personal account, Linda selects them in WhatsApp. For an actual WhatsApp group, she selects that chat in WhatsApp; the application cannot assert or synchronise its membership.

**Security rule:** Before creating a private share, every intended portal recipient must already have a permission grant, or Linda must approve the grant. Do not solve permissions by making the video public or distributing a permanent bearer link.

**File rule:** Video files are derived MP4 exports. Generation can be asynchronous. The app must show `preparing video` until ready. Private Stream downloads require a server-authorised, short-lived download grant. The iOS Share Sheet may discard text when sharing media; device-test all three modes.

**Share history:** Store intent, selected media, intended audiences, prepared message, share mode, timestamps, and client portal opens. Supported states: `draft`, `prepared`, `handoff_opened`, `trainer_confirmed`, `cancelled`, `failed`. `delivered` and `read` are prohibited states for personal WhatsApp flows unless a verifiable provider event exists in a future integration.

## 11. Functional requirements: client portal

- Passwordless email sign-in or another secure low-friction authentication system; unique, expiring invitation links for onboarding.
- **My Dogs:** household dogs with current notes and most recent training session.
- **Dog timeline:** sessions, dates, approved videos, notes, assigned exercises and technique labels.
- **Video detail:** mobile playback, trainer-approved notes, timestamps, related techniques and related guide links.
- **Search/filter:** dog, technique and date. Full-text transcript search can follow when volume justifies it.
- **Household sharing:** authorised adults in the same household may view permitted videos. Joining a household requires an explicit invitation; a matching phone number is insufficient.
- **Revocation:** disabled or removed household members lose playback access; existing copied WhatsApp video files cannot be recalled.
- **Accessibility:** subtitles/transcripts where available, readable typography, large mobile tap targets, keyboard access and reduced-motion behaviour.

## 12. Training academy and public content (Phase 2)

Use a structured CMS with distinct content types: `training_guide`, `blog_post` and `faq_entry`, all supporting drafts, revisions, slugs, SEO fields, author attribution and publication state.

**Required content blocks:** headings, rich text, lists, instructional steps, approved Stream video, photo, callout, related guide, common mistakes, exercise/homework and FAQ accordion.

**Recall 101 example:** Overview; prerequisites and safety; choosing a cue; step-by-step demonstrations; reward timing; common mistakes; practice in harder environments; troubleshooting; trainer-approved video examples; a downloadable or assignable homework checklist; related guides.

A video may be associated with both a private dog's session and a guide, but reuse on a public page requires an explicitly approved public edition and verified consent. An edited clip should be independently publishable without exposing the original private recording.

MVP only needs a public homepage, basic service/contact information, login and navigation structure. Do not invent Linda's qualifications, prices, testimonials or business claims.

## 13. Future dog portfolios and community (Phases 3 and 4)

**Dog portfolios:** Owners can update their dog's biography, avatar/cover, gallery, short videos, timeline posts and optional public training milestones. Visibility per item: `private`, `household`, `friends` or `public`. Photos will need a separate image storage service when this phase begins; Stream remains for videos.

**Community:** Adult owners can browse discoverable public dog profiles, send/accept/decline friend requests, write posts, react, comment, block and report accounts or content. Provide moderation and abuse workflows before enabling public posting.

**Privacy boundary:** Training notes, assessments, client contact details, private session videos and trainer-only records are never automatically eligible for social publication. No public profiles owned directly by children in the initial community design.

**Schema groundwork now:** Use stable dog and user IDs, media ownership, publication permissions and audience grants so portfolios can build on existing identities and content later.

## 14. Information architecture

| Public | Trainer PWA | Client portal | Future social |
|---|---|---|---|
| Home, About, Contact | Dashboard, Record, Uploads | My Dogs, Dog Profile | Discover Dogs |
| Training Guides (Phase 2) | Clients, Households, Dogs | Training Sessions | Public Dog Profiles |
| Blog, FAQ (Phase 2) | Sessions, Media Review | Video Detail, Homework | Posts and Galleries |
| Login | Techniques, Groups, Share Composer | Related Guides, Account | Friends, Reports, Privacy |
| | Archive Inbox, Consent, Settings | | |

The mobile trainer UI should prioritize **current session**, **record**, **upload status** and **review queue**, not a desktop-style dense management interface.

## 15. Proposed architecture

```text
Next.js / React / TypeScript PWA
    |  authenticated API calls
    v
Node.js application API  <---->  PostgreSQL
    |                               |
    |  enqueue jobs                 | durable task queue / audit log
    v                               v
Background worker  <----  Cloudflare Stream status webhook
    |               \
    |                -> AI transcription and video classification
    |
    -> Cloudflare Stream API (clips, downloads, privacy)

PWA  ---- tus direct upload ----> Cloudflare Stream

Personal WhatsApp -> Archive Business number -> Meta webhook
                                              -> background ingest
                                              -> Cloudflare Stream

PWA share composer -> secure grant + MP4 preparation
                   -> WhatsApp deep link / native Share Sheet
                   -> Linda manually completes send
```

**Preferred implementation:** Next.js frontend, TypeScript Node backend/API, PostgreSQL, a Postgres-backed job queue, Railway deployment, Cloudflare Stream, an isolated WhatsApp inbound adapter and provider-agnostic AI jobs. No Redis, custom video compressor, R2 video originals or full social architecture is required for the MVP.

**Delivery principles:** Keep external service adapters behind interfaces, provision credentials only server-side, use idempotent webhooks, use database transactions for permission changes, and process uploads/AI/exports asynchronously.

## 16. Data model (logical schema)

| Entity | Core fields / relationships |
|---|---|
| `User` | id, name, email, phoneE164, role, auth identity, status |
| `Household` | id, name, primary contact, status |
| `HouseholdMember` | userId, householdId, permission, invite status |
| `Dog` | id, householdId, name, breed?, DOB?, profile settings, status |
| `TrainingSession` | id, trainerId, householdId, date/time, status, notes |
| `SessionDog` | sessionId, dogId; permits multi-dog sessions |
| `MediaAsset` | id, streamUID, sourceType, sourceMessageId?, owner/trainerId, processingState, editorialState, title, description, duration, thumbnail, parentAssetId?, createdAt |
| `MediaDog` | mediaId, dogId, sessionId?, explicitly confirmedBy |
| `TrainingTechnique` | id, canonical name, slug, parentId?, publish state |
| `MediaTechnique` | mediaId, techniqueId, source AI/manual, acceptedBy? |
| `AISuggestion` | mediaId, model/version, suggestion JSON, confidence, review state, cost |
| `AudienceGroup` | id, title, trainerId, group type |
| `AudienceGroupMember` | groupId, user/householdId, status |
| `MediaGrant` | mediaId, subject user/household/group/public, scope, createdBy, revokedAt |
| `ShareIntent` | id, createdBy, mode, message, selected media, state, timestamps |
| `ShareTarget` | shareIntentId, target user/household/group, eligibility and handoff state |
| `IngestEvent` | provider, externalMessageId unique, sender, payload hash, status |
| `ConsentRecord` | subject, media/use, consent kind, evidence, timestamp, withdrawal |
| `AuditEvent` | actor, entity, action, time and minimal changes |
| `ContentPage` (Phase 2) | type, slug, title, body blocks, status, author, publishedAt |
| `GuideAssignment` (Phase 2) | guideId, dog/session/household, assignedBy, status |
| `DogPost` and `Friendship` (Phase 3/4) | future entities; no MVP build requirement |

**Indexes and constraints:** Unique provider message ID for idempotency; user email, canonical phone and slug indexes; compound membership constraints; Stream UID unique where present; indexes on `dogId`, `sessionId`, `createdAt`, `processingState`, `editorialState` and technique joins. Audit important permission changes.

## 17. Proposed API contracts

These routes describe intended behaviour, not a demand for a particular framework or naming convention.

| Route | Purpose |
|---|---|
| `POST /api/sessions` | Create or activate trainer session with household and dog IDs |
| `POST /api/uploads/initiate` | Validate access and media limits, persist draft, return one-time Stream upload instructions |
| `GET /api/uploads/:id` | Show upload, processing and reconciliation state |
| `POST /api/webhooks/stream` | Verify signature, idempotently apply processing ready/error event |
| `POST /api/webhooks/whatsapp` | Verify Meta signature, deduplicate and queue archive ingestion |
| `GET /api/media` | Filter scoped list by dog, session, technique, status |
| `PATCH /api/media/:id` | Trainer edit title, notes, associations and tags |
| `POST /api/media/:id/clip` | Create a private derived Stream clip |
| `POST /api/media/:id/approve` | Explicit editorial approval and permission-grant update |
| `POST /api/media/:id/playback-token` | Authorise viewer and mint short-lived Stream token |
| `POST /api/media/:id/download-grant` | Authorise file sharing and mint restricted, short-lived download token |
| `POST /api/shares/prepare` | Validate recipients and media, generate link/message and readiness state |
| `PATCH /api/shares/:id` | Record opened/cancelled/manual confirmation, never invented delivery |
| `POST /api/households/:id/invitations` | Invite and grant household membership securely |
| `POST /api/consents` | Record publication permission and withdrawal |

**Sample initiation request:**

```json
{
  "sessionId": "session_uuid",
  "dogIds": ["dog_uuid"],
  "filename": "training.mov",
  "mimeType": "video/quicktime",
  "sizeBytes": 294000000,
  "estimatedDurationSeconds": 182,
  "source": "pwa_camera"
}
```

**Expected initiation response:**

```json
{
  "mediaId": "media_uuid",
  "uploadProtocol": "tus",
  "uploadUrl": "<one-time provider URL>",
  "expiresAt": "<timestamp>",
  "visibility": "trainer_only"
}
```

The browser must not obtain the Cloudflare account API token. The backend must reconcile upload completion from provider status, not trust a client-declared `uploaded=true` value. Avoid long-lived raw Stream playback or download URLs in database records visible to clients.

## 18. Security, privacy and compliance

- **Default deny:** Every record, API endpoint, upload, clip, thumbnail and playback/download path must check authorisation. Test cross-household ID tampering.
- **Privacy by default:** Trainer-only media until reviewed; granular grants for household, training group and public use. No accidental promotion by reusing an asset in a guide.
- **NZ privacy obligations:** Provide collection notices, clear purposes, access/correction/deletion workflows, retention rules and a named privacy contact. New Zealand IPP3A, effective 1 May 2026, introduces notification obligations for some indirectly collected personal information. Obtain legal/privacy review before production.
- **Consent:** Record evidence and scope for public use of identifiable clients, children and other people in footage. Support withdrawal and prompt takedown where required.
- **Service credentials:** Keep Cloudflare and WhatsApp secrets server-side. Verify webhook signatures, rotate credentials and rate-limit upload-token minting.
- **Retention:** Configure business retention, export and deletion processes. Removing access from the portal cannot retract video files already shared externally.
- **AI subprocessors:** Disclose video/audio processing, minimise transfer and retention, and verify data processing terms and overseas processing obligations.
- **Logging:** No raw access tokens, private transcripts or WhatsApp media payloads in ordinary application logs; retain auditable status and errors only.
- **Backups:** Back up Postgres and test restoration. Stream is the video system of record for MVP; explicitly accept that there is no second original-file backup.

## 19. Non-functional requirements

| Category | Requirement |
|---|---|
| Mobile support | iPhone Safari installed PWA is first-class, followed by Android Chrome; desktop admin is responsive |
| Accessibility | Aim for WCAG 2.2 AA on critical flows; keyboard, focus and reduced motion support |
| Connectivity | tus resumable upload, progress/retry, no misleading background upload promise |
| Availability | Graceful outage handling for Stream, WhatsApp and AI; media review continues when AI fails |
| Performance | Initial app interaction target under 3 seconds on a typical modern phone/network, excluding media transfer |
| Privacy | Zero unauthorised viewing in automated acceptance test suite |
| Observability | Trace each upload and share intent through structured IDs; provider errors and retry counts visible to admin |
| Cost controls | Track stored/delivered video minutes, AI cost, failed retries and configured ceilings |
| Maintainability | Shared TypeScript types, database migrations, modular service adapters, unit/integration/E2E tests |

## 20. Delivery plan and acceptance gates

### Gate 0: Mandatory device and provider spike

Before fully building the frontend, test these on Linda's or a representative iPhone:

1. Select a dog, launch the camera, return with a recording and begin automatic direct upload.
2. Upload a 20 MB, 200 MB and larger video using the correct Stream upload protocol, including interrupted/retried transfers.
3. Confirm private signed playback, signed MP4 availability and a Stream trim derivative.
4. Verify personal WhatsApp link-only, video-only and combined-sharing behaviour for one-to-one chats and existing WhatsApp groups. Record observed limitations and choose fallback UX accordingly.
5. Forward a supported video to the archive number, process webhook and retrieve media. Test an over-limit file and display the direct-upload alternative.
6. Confirm that a client without an explicit household/group grant cannot watch or download a video, even with its identifier.

**Go/no-go condition:** If personal WhatsApp cannot consistently retain a link and video together, the product still launches with the defined two-step manual fallback; it does not promise a one-tap combined send.

### Gate 1: CRM, auth and sessions

Implement roles, invitations, households, dogs, training sessions, dashboard and audit events. Demonstrate multiple dogs per household and multiple members per household.

### Gate 2: Video capture, Stream and review

Implement iPhone-first capture, tus direct upload, stream webhooks, processing state, private player, trimming, AI draft suggestions, technique tags, consent and explicit publication. Demonstrate recoverable errors and private-by-default behaviour.

### Gate 3: Client access and WhatsApp

Implement the client timeline, login/invitation, portal links, share composer, video-download preparation, Share Sheet/deep-link fallbacks and inbound WhatsApp archive inbox. Demonstrate an end-to-end session with a real user.

### Gate 4: Production pilot

Pilot with Linda and a small consenting client cohort. Track upload reliability, review effort, login friction, incorrect assignment attempts, playback and sharing usability. Resolve high-severity problems and verify privacy/deletion flows before general onboarding.

### MVP definition of done

Linda can: create a household and dog; start a session; record a video on her phone; observe a direct Stream upload; review and edit AI suggestions; add notes and technique tags; trim a clip; make the approved item available privately to a household; prepare a custom WhatsApp message and secure link; optionally share the downloaded MP4 using the documented native handoff; and import a small forwarded WhatsApp video via the archive number.

A household member can authenticate, view only their authorised dog/session videos, and revisit them later. Another unrelated household cannot access those videos through guessed IDs, copied Stream URLs or expired tokens. All content starts private. Failure modes are visible and recoverable.

## 21. Risks and explicit decisions

| Risk | Decision / mitigation |
|---|---|
| Personal WhatsApp cannot be driven by backend | User-mediated Share Sheet / deep link; no pretend sending |
| WhatsApp groups cannot be synchronised with app groups | Keep application audience groups separate from WhatsApp chats |
| Video plus text is not preserved by share target | Test on real devices; ship explicit two-step fallback |
| Archive number rejects large clips | 16 MB API video limit; direct PWA upload for larger files |
| PWA upload suspended on iOS | Clear status, tus resume when possible, file reselection and recovery |
| Wrong dog or multi-dog footage | Explicit associations; manual unassigned inbox; no AI identity guessing |
| Client footage appears on public site | Permission grants, separate publication consent, audit and automated isolation tests |
| Stream lacks full multi-clip editing | Trim-only MVP, timestamped overlays; advanced editing later |
| External file copies cannot be revoked | Warn before sharing video attachment; default to portal link |
| AI misinterprets training technique | Draft-only AI, Linda's approval, evidence and confidence |
| Runaway upload/AI cost | Configurable per-file limits and cost dashboards |
| Loss of source-quality editing | Accept Stream-only MVP; revisit originals backup when justified |

## 22. Product decisions and later questions

**Confirmed for v1:** PWA; trainer selects client and dog before recording; recording auto-associated; direct upload to Cloudflare Stream; AI suggests metadata; Linda reviews/edits/tags/trims; client portal; archive number receives forwarded WhatsApp media; Linda's personal number remains unchanged; WhatsApp share modes are configurable; future dog portfolios, posts, public discovery, friends, blog, FAQ and training guides are part of the roadmap.

**Defaults until validated with Linda:** One trainer at launch; email-based owner sign-in; direct PWA upload as the primary source; link-only sharing as the default; archive number inbound-only; no billing/booking features in MVP; one business brand and NZ English initially; no automatic public publication; no original-file backup.

**Questions to resolve during technical spike or pilot:** Linda's actual phone model and recording formats; typical video lengths and sizes; whether groups represent classes, households or WhatsApp chats; consent language; frequency of clips requiring trim vs more advanced edits; whether an owner should be allowed to invite additional household members; desired automatic client notifications independent of WhatsApp.

These questions should not block architecture work because the defaults above are explicit.

## 23. Reference links and factual dependencies

Verified provider behaviour as at 17 October 2026; provider APIs, pricing and product terms may change.

1. [Cloudflare Stream: direct creator uploads and tus](https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/)
2. [Cloudflare Stream: resumable uploads](https://developers.cloudflare.com/stream/uploading-videos/resumable-uploads/)
3. [Cloudflare Stream: signed private playback](https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/)
4. [Cloudflare Stream: MP4 downloads](https://developers.cloudflare.com/stream/viewing-videos/download-videos/)
5. [Cloudflare Stream: clipping](https://developers.cloudflare.com/stream/edit-videos/video-clipping/)
6. [Cloudflare Stream: webhooks](https://developers.cloudflare.com/stream/manage-video-library/using-webhooks/)
7. [Cloudflare Stream: pricing](https://developers.cloudflare.com/stream/pricing/) (US$5 / 1,000 stored minutes per month; US$1 / 1,000 delivered minutes)
8. [Meta WhatsApp Business Platform: media limits and retrieval](https://www.postman.com/meta/whatsapp-business-platform/folder/13382743-ecb27be5-4d27-4763-bbee-6a8002c04bf3)
9. [Meta WhatsApp Business Platform: forwarded message context](https://www.postman.com/meta/whatsapp-business-platform/folder/hysdhqs/context-object)
10. [MDN: Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)
11. [New Zealand Privacy Commissioner: IPP3A](https://www.privacy.org.nz/privacy-principles/3a/)
