# Shared media manifest

All paths are site-absolute (server root = /Users/shaun/linda). Stock footage from Mixkit (free licence).

## Clip IDs and what they show
| id | content | orientation notes |
|---|---|---|
| 10365 | Dachshund sprinting across a park toward its owner (perfect RECALL story) | 16:9, low angle |
| 1476 | Golden retriever walking on lead, golden-hour backlight (LOOSE-LEASH) | 16:9 |
| 1494 | Dog fetching ball in a river, owner legs in foreground | 16:9 |
| 1496 | White lab sitting, giving paw to owner (SIT / tricks / reinforcement) | 16:9 |
| 1501 | Person + dog walking up a dry hill, wide landscape | 16:9 wide |
| 1532 | Sun flaring through trees, woman walking dog silhouette (golden hour) | 16:9, cinematic |
| 1549 | Rough collie jumping off a log in a forest | 16:9 |
| 1550 | Brown & white border collie lying on a log (SETTLE) | 16:9 |
| 1552 | Brown & white border collie close-up, smiling face — hero portrait | 16:9 |
| 1557 | Collie in pine forest (frisbee) | 16:9 wide |
| 23072 | Family playing with dog in a sunny garden with tyre swing | 16:9 720p |
| 3518 | Dog running across a misty meadow, forest edge (moody, calm) | 16:9 |
| 42745 | Owner walking a dog on lead past a house, garden (LOOSE-LEASH) | 16:9 |
| 45843 | Pug running toward camera in park | 16:9 720p, 5s |
| 45868 | Corgi chasing tennis ball on grass | 16:9 720p, 5s |
| 4839 | Silhouette man + dog watching sunset over a city — very cinematic | 16:9 |
| 50663 | Australian shepherd on clean white studio background, bowl "EAT" | studio white |
| 50682 | Black & white border collie, studio white, attentive & listening (FOCUS) | studio white |
| 50683 | Border collie extreme close-up face, studio | studio white |
| 50686 | Border collie receiving a treat / hi-five from human hand (REINFORCEMENT) | studio white |
| 50688 | Border collie lying with a toy ball, studio | studio white |
| 518 | Person walking a dog through a sunlit forest | 16:9 |

## Folders (/shared/media/...)
- `video/{id}.mp4` — 1280w H.264, no audio, faststart. Use for autoplay muted loops & players.
- `scrub/{id}.mp4` — all-keyframe (-g 1) versions for scroll-scrubbed `video.currentTime`. Available: 1552, 10365, 4839, 50686, 1550, 3518.
- `frames/{id}/f001.jpg … f120.jpg` — 120-frame 1280w JPG sequences for Apple-style canvas scroll scrubbing (most reliable on iOS). Available: 1552, 10365, 4839, 50686.
- `vertical/{id}.mp4` — 9:16 540x960 8s crops (look like phone recordings). Every id available. Great inside phone mockups / trainer PWA "recorded" clips.
- `img/{id}-{15|40|65|90}.jpg` — 1920w stills at 15/40/65/90% through each clip.
- `thumb/{id}-{15|40|65|90}.jpg` — 640w versions of the same stills.

## Vendor libs (/shared/vendor/)
gsap.min.js, ScrollTrigger.min.js, SplitText.min.js, Flip.min.js, Draggable.min.js, ScrollToPlugin.min.js, Observer.min.js, CustomEase.min.js, MotionPathPlugin.min.js (GSAP 3.13 — all free incl. SplitText), lenis.min.js + lenis.css (Lenis 1.1.13, global `Lenis`), lucide.min.js (icons, global `lucide`, call `lucide.createIcons()`).
