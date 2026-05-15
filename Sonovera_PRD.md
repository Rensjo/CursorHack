# Sonovera — Product Requirements Document

**Event:** Cursor Hack Manila
**Date:** May 15, 2026
**Build window:** 2 hours
**Team size:** 4
**Document status:** v1 — for hackathon scope

---

## 1. Product summary

Sonovera is a web tool that helps artists prove their work has been stolen, edited, or laundered through AI. Upload your original image and a suspected copy — Sonovera generates a visual heatmap of differences, an AI-written explanation of what changed, a confidence-graded verdict, and a ready-to-send DMCA takedown letter.

**One-line pitch:** *"Upload your art and the thief's repost — get visual proof, a plain-English explanation of what they changed, and a takedown letter, in under 30 seconds."*

---

## 2. Problem statement

Independent artists — illustrators, painters, digital creators — routinely have their work stolen on social media. Existing tools fail them in three ways:

- **Reverse image search** (TinEye, Google Lens) finds copies but doesn't show *what was changed*
- **Generic image-diff tools** (Diffchecker, Img2Go) show pixel differences but give no interpretation
- **DMCA takedown is bureaucratic** — artists know they were stolen from but can't articulate the case clearly enough to act

Result: most theft goes unreported because the friction is too high.

---

## 3. Target users

- **Primary:** Independent illustrators and digital artists who post work on Instagram, X, ArtStation, DeviantArt
- **Secondary:** Photographers, designers, and content creators dealing with unauthorized edits or reposts
- **Tertiary:** Legal/compliance teams who need quick visual evidence for IP disputes

---

## 4. Goals and non-goals

### Goals (in scope for v1)

- Accept two image uploads from the user
- Produce a visual heatmap showing where the images differ
- Provide a similarity score
- Generate an AI-written description of what specifically changed
- Output a confidence-graded verdict (4 states)
- Generate a copy-pastable DMCA takedown letter
- Render the full result in under 10 seconds end-to-end
- Deploy to a public URL accessible to demo judges

### Non-goals (explicitly out of scope for 2-hour build)

- User authentication / accounts
- Persistent database / history of past comparisons
- Image registration for misaligned/cropped images (ORB feature matching)
- CLIP style-embedding similarity (for AI-laundered art detection)
- Reverse image search across the web
- Browser extension
- Mobile app
- Multi-image batch comparison
- Watermark generation / proactive protection tools
- Payment / monetization

### To clarify before build start

- **Blockchain integration status** — is the existing on-chain ledger fully working end-to-end, or partially built? Decision pending before scope locks. (See §11.)

---

## 5. User flow

1. User lands on homepage with two upload drop zones labeled "Original" and "Suspected copy"
2. User uploads both images (max 5MB each, common formats only)
3. User clicks "Compare"
4. Loading state with progress indicator (~3–8 seconds expected)
5. Results screen displays:
   - Side-by-side images with heatmap overlay
   - Verdict card (one of four states with color coding)
   - Similarity score
   - AI-written description of changes
   - Bounding box highlighting the most-changed region
   - "Generate DMCA letter" button
6. User clicks DMCA button → modal opens with editable pre-filled letter
7. User clicks "Copy to clipboard" or "Download as .txt"

---

## 6. Functional requirements

### 6.1 Image upload

- Two drop zones (drag-drop + click-to-browse)
- Accepts: JPG, PNG, WEBP
- Max file size: 5MB per image
- Client-side validation with friendly error messages
- Preview thumbnails before submission

### 6.2 Comparison engine (existing — already built)

- Pixel-level subtraction between normalized images
- Heatmap generation (green/yellow/red scale)
- Perceptual hash (pHash) similarity score (0–100%)
- Tamper region bounding box localization
- Returns: heatmap image (base64), similarity %, bounding box coordinates

### 6.3 AI description layer (new — must build)

- Sends both images to Anthropic Claude API (vision-capable model)
- Prompt focused on identifying specific changes between the two images
- Returns plain-language description (~2–4 sentences)
- Displayed prominently in the results card

### 6.4 Confidence-graded verdict

Replaces raw "% similar" number with one of four states based on rule combinations:

| State | Color | Trigger condition |
|---|---|---|
| Different image | Green | pHash similarity < 40% |
| Edited version | Yellow | Similarity 40–75% with low tamper area |
| Suspicious modification | Orange | Similarity 75–90% with tamper signs |
| Stolen and altered | Red | Similarity > 90% AND tamper region detected |

### 6.5 DMCA letter generator

- Button on results screen: "Generate takedown notice"
- Opens modal with form fields: user's name, contact email, claimed work title, infringing URL (optional)
- Calls Claude API with the AI description + form fields
- Returns a formatted DMCA letter following standard takedown format
- Copy-to-clipboard and download-as-text actions

### 6.6 Results dashboard

- Original image (left), suspect image (center), heatmap (right)
- Verdict card prominent at top
- AI description below the image row
- Similarity % and tamper region info as supporting metrics
- DMCA generator button bottom-right

### 6.7 Blockchain ledger (status pending)

- **If working end-to-end:** image hashes get registered with a timestamp at upload, surfaced as "Timestamped at [date/time] — verifiable on [chain]". Strengthens the DMCA evidence narrative.
- **If not fully working:** cut from v1, no exceptions. Re-pitch as "v2 feature."

---

## 7. Non-functional requirements

### Performance

- End-to-end response time: < 10 seconds for the comparison + AI description
- DMCA generation: < 5 seconds
- Page load: < 2 seconds

### Reliability

- Three pre-staged demo image pairs must produce clean, deterministic results
- Graceful degradation if Claude API fails (show heatmap and similarity even if AI description errors)

### Security & privacy

- Images held in memory only for processing; not persisted to disk
- No user PII collected
- API keys server-side only, never exposed to client
- HTTPS only

### Browser support

- Latest Chrome, Safari, Firefox on desktop (demo machine)
- Mobile responsiveness is nice-to-have, not required for demo

---

## 8. Technical architecture

```
[ React Frontend (Vercel) ]
            ↓
            ↓ (multipart/form-data)
            ↓
[ FastAPI Backend (Railway/Render) ]
            ↓
       ├─→ Existing image-comparison logic (pixel diff + pHash + bbox)
       ├─→ Anthropic Claude API (/describe endpoint)
       └─→ Anthropic Claude API (/dmca endpoint)
            ↓
[ JSON response back to frontend ]
            ↓
[ Results dashboard renders heatmap, verdict, description ]
```

### Stack

| Layer | Tech |
|---|---|
| Frontend | React + Tailwind CSS, deployed on Vercel |
| Backend | FastAPI (Python), deployed on Railway or Render |
| Image processing | Existing algorithm (Pillow, NumPy, imagehash, matplotlib) |
| AI | Anthropic Claude API (claude-sonnet-4-6 with vision) |
| Storage | In-memory only (no DB for v1) |
| Auth | None for v1 |
| Blockchain | Existing implementation — integration pending status check |

### Endpoints

- `POST /compare` — accepts two images, returns heatmap + similarity + bbox
- `POST /describe` — accepts two images, returns AI description string
- `POST /dmca` — accepts description + form fields, returns formatted letter
- `GET /health` — for deployment checks

---

## 9. Team assignments (4 people, 2 hours)

| Role | Responsibilities | Est. time |
|---|---|---|
| **Person 1 — API wrapper** | Wrap existing algorithm in FastAPI, build `/compare` endpoint, configure CORS | 30–45 min, then helps Person 3 |
| **Person 2 — AI integration** | Implement `/describe` and `/dmca` endpoints, prompt engineering, response parsing | 45–60 min |
| **Person 3 — Frontend** | React app: upload screen, loading state, results dashboard, DMCA modal | Full 2 hours |
| **Person 4 — Integration & polish** | Deployment setup (Vercel + Railway), CORS debugging, staging demo images, pitch rehearsal | Continuous |

### Timeline (wall clock)

- **0:00–0:15** — Setup: repo, API keys, deployment stubs, environment vars
- **0:15–1:15** — Heads-down parallel building
- **1:15–1:40** — Integration, bug squashing, all converge
- **1:40–1:55** — Final polish, demo dry run
- **1:55–2:00** — Buffer

---

## 10. Demo plan

### 90-second pitch flow

1. **Hook (15s):** "I'm an artist. Someone reposted my work yesterday — cropped, watermark stripped, signature erased. I can prove it in 30 seconds."
2. **Demo 1 — Watermark removal pair (20s):** Upload original + edited copy → red verdict → AI description points out the missing watermark → judges see the heatmap light up on the watermark location
3. **Demo 2 — DMCA generation (15s):** Click "Generate takedown" → letter appears formatted and copy-ready
4. **Demo 3 — Signature erasure pair (15s):** Quick second example showing it's not a one-trick demo
5. **Close (25s):** Address "what's next" — blockchain timestamp for proof-of-creation, CLIP for AI-laundered art detection, browser extension for one-click checks

### Pre-staged demo assets

- **Pair A:** Original art + version with watermark cloned out
- **Pair B:** Original art + version with signature erased and slight color shift
- **Pair C:** Two unrelated images (negative case — verdict should say "different image")

Do NOT live-upload random images during the demo. Use only staged pairs.

---

## 11. Open questions and risks

### Open questions (resolve before build starts)

1. **Blockchain status** — fully working or partial? Real testnet or simulated ledger? What property does it provide that justifies inclusion in the pitch?
2. **Anthropic API budget** — confirm API key is set up with billing, not on a hard rate limit
3. **Demo machine internet** — venue WiFi reliable for live API calls? Have a mobile hotspot as backup?

### Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Claude API rate limit during demo | Medium | High | Cache the demo pair responses so they don't re-hit the API on stage |
| CORS misconfiguration | High | High | Person 4 to set permissive CORS in first 10 minutes |
| Deployment fails close to demo | Medium | Critical | Deploy a stub at minute 30 and continuously redeploy |
| Blockchain integration breaks demo | Medium | High | If not 100% working at the 1-hour mark, cut from demo |
| Live-uploaded image produces ugly result | High | High | Only use pre-staged pairs on stage |
| Demo machine browser caches old build | Low | Medium | Use incognito + hard refresh before going live |

---

## 12. Success criteria

The build is a demo-day success if:

- All three pre-staged image pairs produce clean, distinct results
- End-to-end response time stays under 10 seconds
- The AI description for each pair is specific and accurate (not generic)
- The DMCA letter is well-formatted and feels production-ready
- No visible errors or crashes during the 90-second pitch
- The product is accessible at a public URL the judges can visit

---

## 13. Post-hackathon roadmap (v2 and beyond)

- ORB feature matching for crop/rotation-tolerant comparison
- CLIP embeddings for AI-laundered art detection
- Reverse image search integration across major art platforms
- Browser extension for one-click checks
- Artist account + portfolio registry (with on-chain timestamps)
- Batch comparison for catalog protection
- Webhook for social media monitoring
- API for third-party platforms (DeviantArt, ArtStation integrations)

---

*Document owner: Meinard Edrei S. Santos*
*Build team: 4 — assignments §9*
*Last updated: May 15, 2026*
