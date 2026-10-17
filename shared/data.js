/* Shared mock data for all three Linda prototypes.
   Everything here is fictional placeholder content for a client demo.
   Exposed as window.LINDA. Paths are site-absolute. */
(function () {
  const M = '/shared/media';
  const img = (id, p = 40) => `${M}/img/${id}-${p}.jpg`;
  const thumb = (id, p = 40) => `${M}/thumb/${id}-${p}.jpg`;
  const vid = (id) => `${M}/video/${id}.mp4`;
  const vert = (id) => `${M}/vertical/${id}.mp4`;

  const brand = {
    name: "Linda's Dog Training",
    short: 'Linda',
    tagline: 'Calm, kind, real-world dog training.',
    region: 'New Zealand',
    email: 'hello@lindasdogtraining.co.nz',
    phone: '+64 21 000 0000',
    archiveNumber: '+64 22 555 0199',
    note: 'Placeholder copy — qualifications, prices and testimonials to be supplied by Linda.'
  };

  const techniques = [
    { id: 't-recall', name: 'Recall', slug: 'recall', color: '#E8A33D', icon: 'megaphone', blurb: 'Coming back when called, first time, every time.' },
    { id: 't-lead', name: 'Loose-leash walking', slug: 'loose-leash-walking', color: '#5B8C5A', icon: 'footprints', blurb: 'Walks where the lead stays a smile, not a straight line.' },
    { id: 't-impulse', name: 'Impulse control', slug: 'impulse-control', color: '#C8553D', icon: 'hand', blurb: 'Waiting, leaving it, and making good choices.' },
    { id: 't-settle', name: 'Settling', slug: 'settling', color: '#6C8EAD', icon: 'moon', blurb: 'Switching off on a mat, at a café, at home.' },
    { id: 't-social', name: 'Socialisation', slug: 'socialisation', color: '#9C6ADE', icon: 'users', blurb: 'Calm, confident meetings with the world.' },
    { id: 't-reinf', name: 'Reinforcement', slug: 'reinforcement', color: '#D9A21B', icon: 'sparkles', blurb: 'Timing, markers and rewards that build behaviour.' },
    { id: 't-focus', name: 'Focus & engagement', slug: 'focus', color: '#2A9D8F', icon: 'eye', blurb: 'Checking in with you when it matters.' },
    { id: 't-leave', name: 'Leave it', slug: 'leave-it', color: '#E76F51', icon: 'ban', blurb: 'Ignoring the sandwich, the sock and the possum.' }
  ];

  const households = [
    { id: 'h-thompson', name: 'Thompson household', suburb: 'Grey Lynn', status: 'active', primary: 'u-sarah', members: ['u-sarah', 'u-mike'], dogs: ['d-bramble'], since: '2026-06-02' },
    { id: 'h-ngata', name: 'Ngata whānau', suburb: 'Mt Albert', status: 'active', primary: 'u-aroha', members: ['u-aroha', 'u-tama', 'u-mere'], dogs: ['d-pickle'], since: '2026-07-14' },
    { id: 'h-patel', name: 'Patel household', suburb: 'Ponsonby', status: 'active', primary: 'u-priya', members: ['u-priya'], dogs: ['d-waffles'], since: '2026-08-01' },
    { id: 'h-chen', name: 'Chen-Walker household', suburb: 'Devonport', status: 'active', primary: 'u-lucy', members: ['u-lucy', 'u-ben'], dogs: ['d-moose', 'd-biscuit'], since: '2026-05-20' },
    { id: 'h-oconnor', name: "O'Connor household", suburb: 'Kingsland', status: 'active', primary: 'u-fiona', members: ['u-fiona'], dogs: ['d-juno'], since: '2026-09-03' },
    { id: 'h-fraser', name: 'Fraser household', suburb: 'Titirangi', status: 'active', primary: 'u-james', members: ['u-james', 'u-kate'], dogs: ['d-kiwi'], since: '2026-09-21' },
    { id: 'h-harris', name: 'Harris household', suburb: 'Mission Bay', status: 'inactive', primary: 'u-tom', members: ['u-tom'], dogs: ['d-rua'], since: '2026-02-11' }
  ];

  const users = [
    { id: 'u-linda', name: 'Linda', role: 'trainer', email: 'linda@lindasdogtraining.co.nz', phone: '+64 21 000 0000' },
    { id: 'u-sarah', name: 'Sarah Thompson', role: 'client', email: 'sarah.t@example.co.nz', phone: '+64 21 384 2210', household: 'h-thompson', permission: 'owner', invite: 'accepted' },
    { id: 'u-mike', name: 'Mike Thompson', role: 'client', email: 'mike.t@example.co.nz', phone: '+64 27 551 9034', household: 'h-thompson', permission: 'member', invite: 'accepted' },
    { id: 'u-aroha', name: 'Aroha Ngata', role: 'client', email: 'aroha.n@example.co.nz', phone: '+64 21 778 0042', household: 'h-ngata', permission: 'owner', invite: 'accepted' },
    { id: 'u-tama', name: 'Tama Ngata', role: 'client', email: 'tama.n@example.co.nz', phone: '+64 22 610 3381', household: 'h-ngata', permission: 'member', invite: 'accepted' },
    { id: 'u-mere', name: 'Mere Ngata', role: 'client', email: 'mere.n@example.co.nz', phone: '+64 21 902 5520', household: 'h-ngata', permission: 'member', invite: 'pending' },
    { id: 'u-priya', name: 'Priya Patel', role: 'client', email: 'priya.p@example.co.nz', phone: '+64 21 455 1188', household: 'h-patel', permission: 'owner', invite: 'accepted' },
    { id: 'u-lucy', name: 'Lucy Chen', role: 'client', email: 'lucy.c@example.co.nz', phone: '+64 27 330 7712', household: 'h-chen', permission: 'owner', invite: 'accepted' },
    { id: 'u-ben', name: 'Ben Walker', role: 'client', email: 'ben.w@example.co.nz', phone: '+64 21 663 0921', household: 'h-chen', permission: 'member', invite: 'accepted' },
    { id: 'u-fiona', name: "Fiona O'Connor", role: 'client', email: 'fiona.o@example.co.nz', phone: '+64 22 104 8876', household: 'h-oconnor', permission: 'owner', invite: 'accepted' },
    { id: 'u-james', name: 'James Fraser', role: 'client', email: 'james.f@example.co.nz', phone: '+64 21 207 4419', household: 'h-fraser', permission: 'owner', invite: 'accepted' },
    { id: 'u-kate', name: 'Kate Fraser', role: 'client', email: 'kate.f@example.co.nz', phone: '+64 27 889 1203', household: 'h-fraser', permission: 'member', invite: 'expired' },
    { id: 'u-tom', name: 'Tom Harris', role: 'client', email: 'tom.h@example.co.nz', phone: '+64 21 340 6650', household: 'h-harris', permission: 'owner', invite: 'accepted' }
  ];

  const dogs = [
    { id: 'd-bramble', name: 'Bramble', breed: 'Border Collie', age: '2 yrs', dob: '2024-08-11', sex: 'F', household: 'h-thompson', status: 'In training', clip: 1552, photo: img(1552, 40), cover: img(1550, 40), avatar: thumb(1552, 40), goals: ['Recall off-lead at the beach', 'Settle at cafés'], notes: 'Very food-motivated, sound-sensitive. Uses a long line at the park.', progress: 72, techniques: ['t-recall', 't-settle', 't-focus'] },
    { id: 'd-pickle', name: 'Pickle', breed: 'Miniature Dachshund', age: '14 mths', dob: '2025-08-02', sex: 'M', household: 'h-ngata', status: 'In training', clip: 10365, photo: img(10365, 40), cover: img(10365, 15), avatar: thumb(10365, 65), goals: ['Reliable recall', 'Stop barking at the gate'], notes: 'Huge personality. Loves tug as a reward.', progress: 58, techniques: ['t-recall', 't-impulse'] },
    { id: 'd-waffles', name: 'Waffles', breed: 'Pembroke Welsh Corgi', age: '9 mths', dob: '2026-01-04', sex: 'M', household: 'h-patel', status: 'Puppy class', clip: 45868, photo: img(45868, 40), cover: img(45868, 65), avatar: thumb(45868, 40), goals: ['Drop it', 'Polite greetings'], notes: 'Ball-obsessed. Use toy rewards.', progress: 41, techniques: ['t-impulse', 't-social', 't-leave'] },
    { id: 'd-moose', name: 'Moose', breed: 'Pug', age: '3 yrs', dob: '2023-03-17', sex: 'M', household: 'h-chen', status: 'In training', clip: 45843, photo: img(45843, 40), cover: img(45843, 65), avatar: thumb(45843, 40), goals: ['Loose-leash walking', 'Calm with visitors'], notes: 'Watch heat & breathing on long sessions.', progress: 63, techniques: ['t-lead', 't-settle'] },
    { id: 'd-biscuit', name: 'Biscuit', breed: 'Golden Retriever', age: '5 yrs', dob: '2021-10-30', sex: 'F', household: 'h-chen', status: 'Maintenance', clip: 1476, photo: img(1476, 40), cover: img(1476, 15), avatar: thumb(1476, 40), goals: ['Loose-leash in busy streets'], notes: 'Gentle, older soul. Pulls toward other dogs.', progress: 86, techniques: ['t-lead', 't-social'] },
    { id: 'd-juno', name: 'Juno', breed: 'Labrador', age: '1 yr', dob: '2025-09-15', sex: 'F', household: 'h-oconnor', status: 'In training', clip: 1496, photo: img(1496, 40), cover: img(1496, 65), avatar: thumb(1496, 40), goals: ['Sit-stay with distraction', 'Leave it'], notes: 'Mouthy when excited — redirect to toy.', progress: 49, techniques: ['t-impulse', 't-leave', 't-reinf'] },
    { id: 'd-kiwi', name: 'Kiwi', breed: 'Australian Shepherd', age: '7 mths', dob: '2026-03-08', sex: 'F', household: 'h-fraser', status: 'Puppy class', clip: 50663, photo: img(50663, 40), cover: img(50663, 65), avatar: thumb(50663, 40), goals: ['Settle in crate', 'Focus around other puppies'], notes: 'New client — first session 22 Sep.', progress: 22, techniques: ['t-focus', 't-settle'] },
    { id: 'd-rua', name: 'Rua', breed: 'Rough Collie', age: '4 yrs', dob: '2022-05-19', sex: 'M', household: 'h-harris', status: 'Graduated', clip: 1549, photo: img(1549, 40), cover: img(1549, 15), avatar: thumb(1549, 40), goals: ['Graduated Feb 2026'], notes: 'Household inactive — media retained, access paused.', progress: 100, techniques: ['t-recall', 't-lead'] }
  ];

  const sessions = [
    { id: 's-101', date: '2026-10-16T10:00', location: 'Western Springs park', household: 'h-thompson', dogs: ['d-bramble'], status: 'completed', title: 'Long-line recall with distractions', notes: 'Bramble nailed 8/10 recalls past the duck pond. Next step: reduce line length to 5m.', homework: ['3× daily "touch" game, 2 min', 'Recall from garden to back door ×5 with jackpot'], media: ['m-1001', 'm-1002', 'm-1003'] },
    { id: 's-102', date: '2026-10-15T15:30', location: 'Ngata home + street', household: 'h-ngata', dogs: ['d-pickle'], status: 'completed', title: 'Gate barking & recall foundations', notes: 'Introduced pattern game at the gate. Pickle recovered fast after the courier van.', homework: ['Pattern game at gate, 1-2-3 count', 'Name game ×10 per day'], media: ['m-1004', 'm-1005'] },
    { id: 's-103', date: '2026-10-14T09:00', location: 'Cox’s Bay reserve', household: 'h-chen', dogs: ['d-moose', 'd-biscuit'], status: 'completed', title: 'Two-dog loose-lead walk', notes: 'Walked dogs separately then together. Biscuit settles quickly; Moose needs more frequent reinforcement.', homework: ['“Find it” scatter on the lawn before walks', 'Change of direction drill, 5 min'], media: ['m-1006', 'm-1007'] },
    { id: 's-104', date: '2026-10-12T11:00', location: 'Puppy class — Saturday group', household: 'h-patel', dogs: ['d-waffles'], status: 'completed', title: 'Puppy class week 4: leave it & drop', notes: 'Waffles traded the ball for a treat 6 times in a row. Great progress.', homework: ['Trade game with two balls', 'Leave it on the floor, level 2'], media: ['m-1008'] },
    { id: 's-105', date: '2026-10-10T16:00', location: "O'Connor home", household: 'h-oconnor', dogs: ['d-juno'], status: 'completed', title: 'Sit-stay with door distractions', notes: 'Duration up to 20s with door opening. Mouthiness reduced with toy redirect.', homework: ['Door-wait ritual before every walk', 'Toy redirect when greeting'], media: ['m-1009', 'm-1010'] },
    { id: 's-106', date: '2026-10-17T13:00', location: 'Titirangi — home visit', household: 'h-fraser', dogs: ['d-kiwi'], status: 'active', title: 'Crate settle + focus foundations', notes: '', homework: [], media: ['m-1011'] },
    { id: 's-107', date: '2026-10-19T10:00', location: 'Western Springs park', household: 'h-thompson', dogs: ['d-bramble'], status: 'scheduled', title: 'Café settle practice', notes: '', homework: [], media: [] },
    { id: 's-108', date: '2026-10-08T10:00', location: 'Western Springs park', household: 'h-thompson', dogs: ['d-bramble'], status: 'completed', title: 'Settle on a mat outdoors', notes: 'Bramble held a settle for 2 minutes with joggers passing.', homework: ['Mat settle during dinner, 10 min'], media: ['m-1012'] }
  ];

  // processingState: created | uploading | uploaded | processing | ready | failed | cancelled
  // editorialState: draft | needs_review | approved_private | approved_shared | published_public | archived
  const media = [
    { id: 'm-1001', clip: 10365, title: 'Recall past the duck pond', dogs: ['d-bramble'], session: 's-101', source: 'pwa_camera', processing: 'ready', editorial: 'approved_shared', duration: '0:42', created: '2026-10-16T10:14', techniques: ['t-recall', 't-reinf'], visibility: 'household', views: 7,
      notes: 'Watch how the cue is given once, then Linda turns and runs — movement away makes coming back more fun.',
      timestamps: [{ t: '0:04', label: 'Single clear cue' }, { t: '0:11', label: 'Handler moves away' }, { t: '0:19', label: 'Jackpot reward at the collar' }],
      ai: { title: 'Recall with distraction — duck pond', summary: 'Dog recalls promptly from ~15m with ducks nearby. Handler uses a single verbal cue and rewards at the collar.', confidence: 0.91, tags: [{ id: 't-recall', c: 0.96 }, { id: 't-reinf', c: 0.82 }, { id: 't-focus', c: 0.44 }], transcript: '“Bramble, come!” … “Yes! Good girl, good girl.” … “Let’s do that once more, line a bit longer.”', evidence: ['Transcript 0:03 — “Bramble, come!”', 'Frames 0:09–0:14 show dog running toward handler'] } },
    { id: 'm-1002', clip: 1550, title: 'Settle on the log', dogs: ['d-bramble'], session: 's-101', source: 'pwa_camera', processing: 'ready', editorial: 'needs_review', duration: '1:18', created: '2026-10-16T10:31', techniques: ['t-settle'], visibility: 'trainer_only', views: 0, notes: '', timestamps: [],
      ai: { title: 'Settle on a raised surface', summary: 'Dog lies calmly on a log for an extended period. No audible cues — visual evidence only.', confidence: 0.74, tags: [{ id: 't-settle', c: 0.88 }, { id: 't-focus', c: 0.39 }], transcript: null, evidence: ['No speech detected — transcript unavailable', 'Frames 0:05–1:10 show dog in down position'] } },
    { id: 'm-1003', clip: 1552, title: 'Check-in game', dogs: ['d-bramble'], session: 's-101', source: 'pwa_camera', processing: 'processing', editorial: 'draft', duration: '0:36', created: '2026-10-16T10:48', techniques: [], visibility: 'trainer_only', views: 0, notes: '', timestamps: [], ai: null },
    { id: 'm-1004', clip: 50682, title: 'Name game at the gate', dogs: ['d-pickle'], session: 's-102', source: 'pwa_camera', processing: 'ready', editorial: 'approved_shared', duration: '0:58', created: '2026-10-15T15:41', techniques: ['t-focus', 't-impulse'], visibility: 'household', views: 4,
      notes: 'Say the name once, mark the eye contact with “yes”, reward low and close.', timestamps: [{ t: '0:06', label: 'Name → eye contact' }, { t: '0:21', label: 'Reward placement' }],
      ai: { title: 'Name response / attention game', summary: 'Dog orients to handler on name cue and is marked and rewarded.', confidence: 0.86, tags: [{ id: 't-focus', c: 0.93 }, { id: 't-reinf', c: 0.71 }], transcript: '“Pickle.” … “Yes!” … “Pickle.” … “Yes, nice.”', evidence: ['Transcript 0:05 — “Pickle.” followed by marker'] } },
    { id: 'm-1005', clip: 45843, title: 'Courier van recovery', dogs: ['d-pickle'], session: 's-102', source: 'whatsapp_archive', processing: 'ready', editorial: 'needs_review', duration: '0:14', created: '2026-10-15T16:02', techniques: [], visibility: 'trainer_only', views: 0, notes: '', timestamps: [],
      ai: { title: 'Dog running across park', summary: 'Short clip of a dog running toward camera. Limited visual evidence of a specific technique.', confidence: 0.41, tags: [{ id: 't-recall', c: 0.52 }], transcript: null, evidence: ['Short clip, no speech', 'Association to Pickle confirmed by Linda from inbox'] } },
    { id: 'm-1006', clip: 42745, title: 'Biscuit loose-lead past the hedge', dogs: ['d-biscuit'], session: 's-103', source: 'pwa_camera', processing: 'ready', editorial: 'approved_private', duration: '1:05', created: '2026-10-14T09:22', techniques: ['t-lead'], visibility: 'trainer_only', views: 0, notes: 'Lovely J-shaped lead throughout.', timestamps: [{ t: '0:12', label: 'Change of direction' }],
      ai: { title: 'Loose-leash walk, residential', summary: 'Handler walks dog on a slack lead with a change of pace.', confidence: 0.88, tags: [{ id: 't-lead', c: 0.94 }], transcript: '“Let’s go… good, nice and easy.”', evidence: ['Frames show slack lead for 90% of clip'] } },
    { id: 'm-1007', clip: 1476, title: 'Moose & Biscuit together', dogs: ['d-moose', 'd-biscuit'], session: 's-103', source: 'pwa_camera', processing: 'ready', editorial: 'needs_review', duration: '2:12', created: '2026-10-14T09:40', techniques: [], visibility: 'trainer_only', views: 0, notes: '', timestamps: [],
      ai: { title: 'Two-dog walk, golden hour', summary: 'Multiple dogs may be present. Dog association needs a human decision.', confidence: 0.58, tags: [{ id: 't-lead', c: 0.77 }, { id: 't-social', c: 0.48 }], transcript: null, evidence: ['Ambiguous: more than one dog in session — confirm associations'] } },
    { id: 'm-1008', clip: 45868, title: 'Ball trade game', dogs: ['d-waffles'], session: 's-104', source: 'pwa_library', processing: 'ready', editorial: 'approved_shared', duration: '0:31', created: '2026-10-12T11:25', techniques: ['t-leave', 't-impulse'], visibility: 'group', views: 12, notes: 'Two-ball trade: the second ball only appears when the first is dropped.', timestamps: [{ t: '0:08', label: 'Drop → instant second ball' }],
      ai: { title: 'Toy trade / drop it', summary: 'Puppy releases a ball and is rewarded with a second toy.', confidence: 0.83, tags: [{ id: 't-leave', c: 0.8 }, { id: 't-impulse', c: 0.76 }], transcript: '“Drop.” … “Yes! Here’s the other one.”', evidence: ['Transcript 0:07 — “Drop.”'] } },
    { id: 'm-1009', clip: 1496, title: 'Sit-stay at the door', dogs: ['d-juno'], session: 's-105', source: 'pwa_camera', processing: 'ready', editorial: 'approved_shared', duration: '0:47', created: '2026-10-10T16:12', techniques: ['t-impulse', 't-reinf'], visibility: 'household', views: 3, notes: 'Reward the stay in position — don’t call her out of it.', timestamps: [{ t: '0:10', label: 'Door opens' }, { t: '0:22', label: 'Reward in position' }],
      ai: { title: 'Sit-stay, door distraction', summary: 'Dog holds sit while handler offers paw and treat.', confidence: 0.79, tags: [{ id: 't-impulse', c: 0.85 }, { id: 't-reinf', c: 0.7 }], transcript: '“Wait.” … “Good wait.”', evidence: ['Transcript 0:02 — “Wait.”'] } },
    { id: 'm-1010', clip: 50686, title: 'Treat delivery timing', dogs: ['d-juno'], session: 's-105', source: 'pwa_camera', processing: 'failed', editorial: 'draft', duration: '—', created: '2026-10-10T16:30', techniques: [], visibility: 'trainer_only', views: 0, notes: '', timestamps: [], error: 'Upload interrupted at 64% — Safari was suspended. Re-select the file to resume.', ai: null },
    { id: 'm-1011', clip: 50663, title: 'Crate settle — first attempt', dogs: ['d-kiwi'], session: 's-106', source: 'pwa_camera', processing: 'uploading', progress: 0.62, editorial: 'draft', duration: '1:52', created: '2026-10-17T13:12', techniques: [], visibility: 'trainer_only', views: 0, notes: '', timestamps: [], ai: null },
    { id: 'm-1012', clip: 3518, title: 'Settle with joggers passing', dogs: ['d-bramble'], session: 's-108', source: 'pwa_camera', processing: 'ready', editorial: 'published_public', duration: '1:34', created: '2026-10-08T10:20', techniques: ['t-settle', 't-focus'], visibility: 'public', views: 241, notes: 'Public edition — consent recorded 9 Oct.', timestamps: [{ t: '0:30', label: 'Jogger passes' }, { t: '1:02', label: 'Release cue' }],
      ai: { title: 'Outdoor settle with distraction', summary: 'Dog maintains a down-settle while people pass.', confidence: 0.84, tags: [{ id: 't-settle', c: 0.9 }, { id: 't-focus', c: 0.66 }], transcript: '“Settle.” … “Good.” … “Okay, free!”', evidence: ['Transcript 1:02 — “Okay, free!”'] } }
  ];

  const uploads = [
    { id: 'up-1', media: 'm-1011', file: 'IMG_4821.MOV', size: '287 MB', state: 'uploading', progress: 0.62, speed: '4.1 MB/s', eta: '42s', protocol: 'tus' },
    { id: 'up-2', media: 'm-1003', file: 'IMG_4815.MOV', size: '96 MB', state: 'processing', progress: 1, protocol: 'tus' },
    { id: 'up-3', media: 'm-1010', file: 'IMG_4790.MOV', size: '212 MB', state: 'failed', progress: 0.64, protocol: 'tus', error: 'Interrupted — app was suspended. Re-select file to resume from 64%.' },
    { id: 'up-4', media: 'm-1002', file: 'IMG_4812.MOV', size: '154 MB', state: 'ready', progress: 1, protocol: 'tus' }
  ];

  const inbox = [
    { id: 'wa-1', received: '2026-10-17T08:12', from: 'Linda (personal)', kind: 'video', size: '9.8 MB', thumb: thumb(1494, 40), clip: 1494, caption: 'Fwd: river retrieve — whose dog is this one again?', forwarded: true, state: 'unassigned' },
    { id: 'wa-2', received: '2026-10-16T19:40', from: 'Linda (personal)', kind: 'voice', size: '0.4 MB', duration: '0:38', caption: 'Voice note — notes for Pickle', transcript: 'Note for Pickle: next week let’s start the gate pattern game with the courier van audio track at low volume…', forwarded: false, state: 'unassigned' },
    { id: 'wa-3', received: '2026-10-16T12:03', from: 'Linda (personal)', kind: 'video', size: '31.2 MB', caption: 'Fwd: long walk clip', forwarded: true, state: 'too_large', error: 'Over the 16 MB WhatsApp Cloud API video limit — this file was never delivered. Upload it directly from your phone instead.' },
    { id: 'wa-4', received: '2026-10-15T16:01', from: 'Linda (personal)', kind: 'video', size: '6.1 MB', thumb: thumb(45843, 40), clip: 45843, caption: 'Pickle courier van', forwarded: true, state: 'assigned', assignedTo: 'd-pickle', media: 'm-1005' },
    { id: 'wa-5', received: '2026-10-14T07:55', from: '+64 27 000 1234 (unknown)', kind: 'text', caption: 'Hi is this the dog trainer??', forwarded: false, state: 'quarantined' }
  ];

  const groups = [
    { id: 'g-puppy', title: 'Saturday Puppy Class', type: 'class', members: ['h-patel', 'h-fraser'], color: '#E8A33D', next: '2026-10-19T09:00' },
    { id: 'g-recall', title: 'Recall Bootcamp — October', type: 'workshop', members: ['h-thompson', 'h-ngata', 'h-oconnor'], color: '#5B8C5A', next: '2026-10-25T10:00' },
    { id: 'g-walkers', title: 'Loose-Lead Walkers', type: 'class', members: ['h-chen', 'h-thompson'], color: '#6C8EAD', next: '2026-10-22T17:30' }
  ];

  // states: draft | prepared | handoff_opened | trainer_confirmed | cancelled | failed
  const shares = [
    { id: 'sh-1', created: '2026-10-16T11:02', mode: 'link_only', media: ['m-1001'], targets: ['h-thompson'], state: 'trainer_confirmed', message: 'Hi Sarah & Mike! Here’s today’s recall clip — watch from 0:11 for the run-away trick 🐾', opens: 3 },
    { id: 'sh-2', created: '2026-10-15T17:10', mode: 'link_and_video', media: ['m-1004'], targets: ['h-ngata'], state: 'handoff_opened', message: 'Kia ora Aroha — name game from today. Little and often!', opens: 2 },
    { id: 'sh-3', created: '2026-10-12T12:30', mode: 'link_only', media: ['m-1008'], targets: ['g-puppy'], state: 'trainer_confirmed', message: 'Puppy class homework: the two-ball trade game. See you Saturday!', opens: 9 },
    { id: 'sh-4', created: '2026-10-17T09:05', mode: 'video_only', media: ['m-1009'], targets: ['h-oconnor'], state: 'prepared', message: '', opens: 0 },
    { id: 'sh-5', created: '2026-10-14T10:00', mode: 'link_only', media: ['m-1006'], targets: ['h-chen'], state: 'draft', message: 'Biscuit looked fantastic today…', opens: 0 }
  ];

  const consents = [
    { id: 'c-1', subject: 'Sarah Thompson (handler, identifiable)', media: 'm-1012', kind: 'Public website + guides', evidence: 'Signed digital form', date: '2026-10-09', status: 'active' },
    { id: 'c-2', subject: 'Aroha Ngata', media: null, kind: 'Household sharing only', evidence: 'Onboarding form', date: '2026-07-14', status: 'active' },
    { id: 'c-3', subject: 'Tom Harris', media: null, kind: 'Public website', evidence: 'Email', date: '2026-02-11', status: 'withdrawn', withdrawn: '2026-09-30' }
  ];

  const audit = [
    { t: '2026-10-17T09:05', actor: 'Linda', action: 'prepared share', entity: 'Sit-stay at the door → O’Connor household' },
    { t: '2026-10-16T11:02', actor: 'Linda', action: 'approved & granted', entity: 'Recall past the duck pond → Thompson household' },
    { t: '2026-10-16T10:49', actor: 'System', action: 'Stream ready', entity: 'Settle on the log (m-1002)' },
    { t: '2026-10-15T16:04', actor: 'Linda', action: 'assigned inbox item', entity: 'Courier van → Pickle' },
    { t: '2026-10-14T19:20', actor: 'Linda', action: 'revoked access', entity: 'Kate Fraser invitation expired' },
    { t: '2026-09-30T08:00', actor: 'Tom Harris', action: 'withdrew consent', entity: 'Public website use' }
  ];

  const guides = [
    { id: 'g-recall101', slug: 'recall-101', title: 'Recall 101', subtitle: 'Build a recall your dog chooses — every single time.', technique: 't-recall', level: 'Foundation', minutes: 12, hero: img(10365, 40), clip: 10365, status: 'published', assigned: 4,
      sections: [
        { h: 'Overview', body: 'A great recall isn’t obedience — it’s a habit your dog loves. We build it in tiny, winnable steps, then slowly add the world back in.' },
        { h: 'Prerequisites & safety', body: 'Start somewhere boring and enclosed. Use a long line (5–10 m) outdoors until your dog’s recall is reliable around distractions. Never call your dog for something unpleasant.' },
        { h: 'Choosing your cue', body: 'Pick one word you don’t use casually — “Here”, “Come”, or a whistle. If your old cue has a bad history, start fresh with a new one.' },
        { h: 'Step by step', steps: ['Say the cue once, then reward instantly — no movement needed yet (“charging” the cue).', 'Cue from 1–2 m away while your dog is mildly interested in you.', 'Turn and jog away as you cue — movement away is magnetic.', 'Reward at the collar: touch, then treat, so “come” means “come all the way in”.', 'Add distance before distraction, and distraction before difficulty.'] },
        { h: 'Reward timing', body: 'Mark the moment your dog commits to turning toward you, then pay generously when they arrive. Jackpots (5–10 treats in a row) for brilliant recalls.' },
        { h: 'Common mistakes', list: ['Repeating the cue (“come, come, COME”)', 'Only calling at the end of fun', 'Chasing your dog when they don’t come', 'Progressing too fast to off-lead'] },
        { h: 'Harder environments', body: 'Practise at the edge of distractions first: across the field from ducks, not beside them. Use the long line so you never rehearse failure.' },
        { h: 'Troubleshooting', body: 'If your dog ignores you, you’ve asked too much. Make it easier, get three wins, then try again.' }
      ],
      homework: ['Charge the cue ×10, twice a day', 'Three surprise recalls indoors per day', 'One long-line session in a quiet park this week'],
      faqs: [{ q: 'How long until I can let my dog off-lead?', a: 'It depends on your dog and environment. Most dogs need several weeks of consistent long-line practice. Linda will help you decide when.' }, { q: 'What if my dog only comes back when I have food?', a: 'That’s normal at first! We gradually vary rewards — toys, play, sniffing — so the recall isn’t tied to a visible treat.' }]
    },
    { id: 'g-lead', slug: 'loose-lead-basics', title: 'Loose-Lead Basics', subtitle: 'Turn walks back into the best part of the day.', technique: 't-lead', level: 'Foundation', minutes: 9, hero: img(1476, 40), clip: 1476, status: 'published', assigned: 3 },
    { id: 'g-settle', slug: 'settle-on-a-mat', title: 'Settle on a Mat', subtitle: 'Teach the off-switch that works in cafés.', technique: 't-settle', level: 'Intermediate', minutes: 8, hero: img(1550, 40), clip: 1550, status: 'published', assigned: 2 },
    { id: 'g-leave', slug: 'leave-it', title: 'Leave It', subtitle: 'From dropped toast to possums — impulse control made fun.', technique: 't-leave', level: 'Foundation', minutes: 7, hero: img(50686, 40), clip: 50686, status: 'draft', assigned: 0 },
    { id: 'g-focus', slug: 'check-ins', title: 'The Check-In Game', subtitle: 'Get your dog choosing to look at you.', technique: 't-focus', level: 'Foundation', minutes: 6, hero: img(50682, 40), clip: 50682, status: 'published', assigned: 5 },
    { id: 'g-social', slug: 'calm-greetings', title: 'Calm Greetings', subtitle: 'Polite hellos with people and dogs.', technique: 't-social', level: 'Intermediate', minutes: 10, hero: img(23072, 40), clip: 23072, status: 'draft', assigned: 0 }
  ];

  const posts = [
    { id: 'p-1', title: 'Why your dog comes back… until there’s a duck', date: '2026-10-02', minutes: 5, img: img(1494, 40), excerpt: 'Distractions aren’t defiance. Here’s how we think about the “distraction ladder”.' },
    { id: 'p-2', title: 'The 3-minute training session', date: '2026-09-18', minutes: 4, img: img(50683, 40), excerpt: 'Short, frequent sessions beat one long weekend slog. A simple routine to try.' },
    { id: 'p-3', title: 'Puppy socialisation isn’t meeting every dog', date: '2026-09-04', minutes: 6, img: img(45868, 40), excerpt: 'Quality over quantity: calm observation is socialisation too.' },
    { id: 'p-4', title: 'Golden-hour walks and the sniffari', date: '2026-08-21', minutes: 3, img: img(1532, 40), excerpt: 'Letting your dog sniff isn’t “wasting” a walk — it’s enrichment.' }
  ];

  const faqs = [
    { q: 'Where do you train?', a: 'Placeholder — Linda to confirm service areas. Sessions can happen at your home, local parks or in small group classes.' },
    { q: 'How do I see my training videos?', a: 'After each session, Linda reviews your clips and shares them to your private portal. You’ll get a secure link — only invited members of your household can watch.' },
    { q: 'Are my videos public?', a: 'Never by default. Every recording starts private to Linda. Anything used publicly needs your separate, recorded consent — and you can withdraw it.' },
    { q: 'Can my partner see our dog’s training too?', a: 'Yes. Household owners can invite other adults to the household; each person signs in with their own email.' },
    { q: 'Do you offer group classes?', a: 'Placeholder — Linda to confirm current classes and timetables.' },
    { q: 'What training methods do you use?', a: 'Placeholder — Linda to describe her approach in her own words.' }
  ];

  // Phase 3/4 preview content
  const community = [
    { dog: 'd-bramble', post: 'First off-lead recall at the beach today 🌊 12/12!', likes: 48, comments: 9, img: img(1552, 15), when: '2h' },
    { dog: 'd-pickle', post: 'Small dog, big zoomies.', likes: 61, comments: 14, img: img(10365, 65), when: '5h' },
    { dog: 'd-waffles', post: 'Ball is life. Trading is… acceptable.', likes: 33, comments: 4, img: img(45868, 15), when: '1d' },
    { dog: 'd-kiwi', post: 'Week one of puppy class. I sat. Twice.', likes: 27, comments: 6, img: img(50663, 65), when: '2d' }
  ];

  const stats = {
    trainer: { activeHouseholds: 6, dogs: 8, sessionsThisMonth: 23, needsReview: 3, unassigned: 2, uploading: 1, sharesPrepared: 2, portalOpens7d: 41, streamMinutesStored: 1840, streamMinutesDelivered: 6210, aiSpendMonth: 12.40, aiCeiling: 40 },
    weekly: [4, 6, 5, 8, 7, 9, 6] // sessions per week (last 7 wks)
  };

  const helpers = {
    byId: (arr, id) => arr.find((x) => x.id === id),
    dog: (id) => dogs.find((d) => d.id === id),
    household: (id) => households.find((h) => h.id === id),
    user: (id) => users.find((u) => u.id === id),
    technique: (id) => techniques.find((t) => t.id === id),
    mediaItem: (id) => media.find((m) => m.id === id),
    session: (id) => sessions.find((s) => s.id === id),
    dogsFor: (hid) => dogs.filter((d) => d.household === hid),
    mediaFor: (dogId) => media.filter((m) => m.dogs.includes(dogId)),
    sessionsFor: (dogId) => sessions.filter((s) => s.dogs.includes(dogId)),
    fmtDate: (iso, opts = { day: 'numeric', month: 'short' }) => new Date(iso).toLocaleDateString('en-NZ', opts),
    fmtTime: (iso) => new Date(iso).toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' }),
    initials: (name) => name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase(),
    img, thumb, vid, vert
  };

  // The signed-in client for the client-portal demo
  const currentClient = 'u-sarah';

  window.LINDA = { brand, techniques, households, users, dogs, sessions, media, uploads, inbox, groups, shares, consents, audit, guides, posts, faqs, community, stats, currentClient, ...helpers };
})();
