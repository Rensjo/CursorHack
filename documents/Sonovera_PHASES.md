# Sonovera Build Phases

**Window:** 2 hours · **Team:** 4 people · **Date:** May 15, 2026

This is the execution plan for the hackathon build. The scaffold in this repo
gives you about 80% of the code already. The remaining 20% is integration,
deployment, demo prep, and any polish you choose to add.

---

## Phase 0 — Setup (0:00–0:15)

**Everyone, in parallel.**

- [ ] Clone the repo and check it out on every machine
- [ ] Person 1 (Backend) — create `.env` from `.env.example`, paste Anthropic API key, verify with `curl http://localhost:8000/health` after starting uvicorn
- [ ] Person 2 (AI) — pull the latest Anthropic Python SDK docs in a tab, verify the API key works with a one-line test call
- [ ] Person 3 (Frontend) — `cd frontend && npm install && npm run dev` to verify the upload screen renders cleanly
- [ ] Person 4 (Deploy) — create Vercel project from the `frontend/` directory; create Railway project for the backend, set `ANTHROPIC_API_KEY` env var

**Exit criteria:** all four members have the project running locally, backend deployed to Railway with a public URL, frontend deployed to Vercel pointing to that URL.

---

## Phase 1 — Validate the core flow (0:15–0:45)

**Goal:** end-to-end upload → compare → heatmap, working locally for all four people.

- [ ] **Person 1** — test `/compare` with two real image files via the FastAPI Swagger UI at `/docs`. Confirm the heatmap renders and the similarity number is in a sensible range.
- [ ] **Person 2** — test `/describe` with two real images. Iterate on the system prompt in `backend/ai.py` if the output is generic. Target: descriptions that name specific regions (top-left, center, etc.) and specific change types.
- [ ] **Person 3** — wire up the upload screen against the running backend. Confirm an upload produces a result screen with the heatmap overlay.
- [ ] **Person 4** — verify Vercel + Railway deployment chain works. Hit the deployed frontend from a phone. If CORS fails, check `ALLOWED_ORIGINS` on Railway.

**Exit criteria:** uploading two images on the deployed Vercel frontend produces a working results screen including the heatmap and the AI description.

**Common failure modes:**
- CORS errors → Person 1 confirms `allow_origins=["*"]` in `main.py`
- Anthropic API 401 → Person 2 checks the env var is set on Railway, not just locally
- Heatmap doesn't render → check the base64 isn't getting double-prefixed

---

## Phase 2 — DMCA path and demo polish (0:45–1:30)

**Goal:** lock in the DMCA flow and the visual presentation.

- [ ] **Person 1** — pre-stage three demo image pairs (`pair_a/`, `pair_b/`, `pair_c/` directories). Run each through the local backend and capture the JSON responses. **If any pair produces an ugly heatmap, swap the image. Do not change the algorithm.**
- [ ] **Person 2** — iterate on the DMCA system prompt in `backend/ai.py` until the output letter looks like something an actual lawyer wouldn't laugh at. Test with at least three different forensic findings.
- [ ] **Person 3** — wire up the DMCA modal flow end-to-end. Confirm: open modal → fill form → click Generate → letter renders → copy-to-clipboard works → download works.
- [ ] **Person 4** — write the 90-second pitch script (see Demo Plan below) and start rehearsing. Confirm the deployed frontend handles all three demo pairs.

**Exit criteria:** all three demo pairs produce clean results end-to-end on the deployed frontend, including the DMCA letter generation.

---

## Phase 3 — Integration buffer (1:30–1:50)

**Goal:** catch the bugs that always appear in the last 30 minutes.

- [ ] All hands debugging. No new features.
- [ ] **Person 4** — full dry run of the demo on the deployed URL, timed.
- [ ] **Person 2** — pre-warm the Anthropic API by making a few test calls so latency is low during demo.
- [ ] **Person 1** — confirm Railway hasn't gone to sleep. If on a free tier with cold starts, hit `/health` every 5 minutes until showtime.
- [ ] **Person 3** — final visual pass: any layout breakage on the demo laptop's resolution? Any text overflow on long DMCA letters?

**Exit criteria:** the full demo can be run twice in a row without any errors or visual glitches.

---

## Phase 4 — Rehearsal and showtime (1:50–2:00)

- [ ] Two complete run-throughs of the pitch script with the deployed URL
- [ ] Open the demo URL in **two browsers** (incognito and regular) — if one breaks during the pitch, you instantly switch
- [ ] **Person 4** — open the staging image pairs in Finder/Explorer ready to drag in
- [ ] Phone charged and ready as a mobile hotspot backup
- [ ] Submission form filled out with the deployed URL

---

## Demo plan — 90 seconds

### Pre-staged assets (do not skip)

| Pair | Original | Suspect | Expected verdict |
|---|---|---|---|
| **A** | Your artwork | Same artwork with watermark cloned out | `stolen` |
| **B** | Your artwork | Signature erased + slight color shift | `suspicious` |
| **C** | Unrelated photo | Different unrelated photo | `different` |

**Critical:** Do NOT live-upload random images during the demo. Use the staged pairs only.

### 90-second flow

| Time | Action | Words |
|---|---|---|
| 0:00–0:15 | Open the deployed site. Show the upload screen. | "I'm an artist. Yesterday someone reposted my work with the watermark cropped out. I can prove it in thirty seconds. This is Sonovera." |
| 0:15–0:40 | Drag in Pair A. Wait for results. | "Same image, watermark stripped. Sonovera's pixel analysis lights up exactly where the watermark used to be. pHash says 94% match — far higher than two random images would score." |
| 0:40–0:55 | Read out the AI forensic analysis on screen. | "And Claude vision tells me in plain English exactly what was changed — the watermark text in the bottom-left has been cloned out." |
| 0:55–1:15 | Click Generate DMCA. Show the letter. | "Most artists never report theft because writing a takedown letter is bureaucratic. We draft it from the forensic finding in one click." |
| 1:15–1:30 | Reset, drag in Pair B. | "And it's not a one-trick demo — here's a second pair, signature erasure plus color shift, correctly flagged as suspicious modification." |

### What to skip if you run long

- Pair B is the optional one. If you're at 0:55 and the DMCA generation is slow, skip straight to closing.
- Don't show Pair C (the negative case) unless asked. It's there to prove you handled the edge case but it doesn't move judges.

---

## Cut list — DO NOT build during the hackathon

These would be nice but they will eat the demo. Talk about them in Q&A as "v2."

- ❌ ORB / SIFT image alignment for cropped images
- ❌ CLIP embeddings for AI-laundered art detection
- ❌ User accounts, auth, persistent history
- ❌ Reverse image search across the web
- ❌ Browser extension
- ❌ Blockchain timestamping (the Rust reference code is out of scope per ALGORITHM.md)
- ❌ Mobile-responsive polish beyond what Tailwind gives us for free
- ❌ Onboarding tutorials, tooltips, help text
- ❌ Multi-language support
- ❌ Animations beyond what's in the CSS already

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Anthropic API rate limit during demo | Pre-warm with test calls; cache the demo-pair responses if needed |
| Railway cold start | Ping `/health` every few minutes; or upgrade to paid tier for showtime |
| Demo laptop browser cache shows old build | Use incognito + hard refresh before going on stage |
| Wifi flakes mid-demo | Have a phone hotspot ready and pre-paired |
| Live-uploaded image produces ugly heatmap | Don't live-upload. Use the staged pairs only. |
| Pre-staged images don't impress | Spend Phase 2 picking better source images, not changing code |

---

## Success criteria

The build is a demo success if:

- [ ] Three pre-staged image pairs each produce clean, distinct, demonstrable results
- [ ] End-to-end compare + describe completes in under 10 seconds
- [ ] The AI description is specific (names a region, names a change type)
- [ ] The DMCA letter is well-formatted and copy-pastable
- [ ] No visible errors or crashes during the 90-second pitch
- [ ] The deployed URL is reachable from the judges' devices

That's it. Five things. Don't optimize for anything else.
