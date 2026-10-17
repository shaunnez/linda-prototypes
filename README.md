# Linda's Dog Training — clickable prototypes

Three complete design directions. Each one has a public site, a client portal and a trainer admin/PWA. Everything is simulated (no real auth, uploads or WhatsApp), with demo state saved in the browser's localStorage.

## Run it
```bash
python3 -m http.server 8080 --directory /Users/shaun/linda
```
Then open http://localhost:8080. The hub page links to all nine entry points.

| | Website | Client portal | Trainer admin |
|---|---|---|---|
| 01 Golden Hour (cinematic, dark) | `/v1/index.html` | `/v1/portal/` | `/v1/admin/` |
| 02 Paws & Play (bright, playful) | `/v2/index.html` | `/v2/portal/` | `/v2/admin/` |
| 03 Field Notes (Apple/Linear precision) | `/v3/index.html` | `/v3/portal/` | `/v3/admin/` |

## 5-minute client demo script (works in every version)
1. **Home page.** Scroll slowly: the hero video scrubs with the scroll, then the journey and phone sections.
2. **Login → "Open magic link (demo)"** to land in Sarah Thompson's portal (dog: Bramble).
3. **Admin → Record.** Kiwi is already selected. Tap Record, then Stop, then Use Video, and the upload starts on its own.
4. **Review queue → "Settle on the log".** Accept the AI suggestions, drag the trim handles, then **Approve & choose audience → Thompson household**.
5. **Back to the portal → Bramble.** The approved clip now appears in the timeline.
6. **Share composer.** Pick a clip and a household, switch between link-only, video-only and link + video, and watch the WhatsApp preview. Prepare it, open WhatsApp, then confirm "I sent it". It never shows "delivered".
7. **WhatsApp archive.** Assign the unassigned forward, and note the 16 MB too-large item with its "use PWA upload" fallback.
8. **⌘K** (Ctrl+K) opens the command palette in either app. **Settings → Reset demo data** restores the starting state.

## Notes
- Placeholder copy marks where Linda supplies her bio, qualifications, prices and testimonials (per the PRD).
- Stock footage is from Mixkit (free licence). Media lives in `/shared/media`, mock data in `/shared/data.js`.
- The site uses absolute paths, so serve it from the web root.
