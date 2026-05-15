# Sonovera

> Image-theft forensics for artists. Upload your original artwork and the suspected
> copy — get visual evidence of tampering, a forensic analysis written in plain
> language, and a takedown letter ready to send.

**Built for Cursor Hack Manila · May 15, 2026**

---

## What it does

1. **Heatmap diff** — SSIM-based pixel-level analysis showing exactly where the
   two images differ, blended over the original as an evidence overlay.
2. **Similarity score** — perceptual-hash (pHash) distance giving a robust
   overall similarity number that survives resizing and recompression.
3. **AI forensic analysis** — Claude vision identifies what specifically changed
   between the images in plain language.
4. **DMCA letter generator** — Claude drafts a formatted takedown notice
   pre-filled with the forensic findings, ready to copy-paste.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite 5 + Tailwind 3 |
| Backend | FastAPI + Python 3.11+ |
| Image diff | scikit-image (SSIM) + OpenCV + Pillow + NumPy |
| Similarity | imagehash (pHash) |
| Colormap | matplotlib (RdYlGn_r) |
| AI | Anthropic Claude (claude-sonnet-4-6) |
| Deploy | Vercel (frontend) + Railway (backend) |

## Repo layout

```
sonovera/
├── backend/                  FastAPI service
│   ├── main.py               app + routes + CORS
│   ├── compare.py            SSIM diff + pHash + heatmap pipeline
│   ├── ai.py                 Claude vision + DMCA prompts
│   ├── schemas.py            Pydantic request/response models
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
├── frontend/                 React + Vite app
│   ├── src/
│   │   ├── App.jsx           top-level state machine
│   │   ├── api.js            backend client
│   │   ├── main.jsx
│   │   ├── index.css         Tailwind base + custom styles
│   │   └── components/
│   │       ├── UploadScreen.jsx
│   │       ├── LoadingState.jsx
│   │       ├── ResultsScreen.jsx
│   │       ├── VerdictCard.jsx
│   │       └── DMCAModal.jsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── README.md
├── PHASES.md                 build plan: 4 people, 2 hours
└── README.md                 (this file)
```

## Get it running locally

**Terminal 1 — backend:**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # paste your ANTHROPIC_API_KEY into .env
uvicorn main:app --reload --port 8000
```

**Terminal 2 — frontend:**

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness check |
| POST | `/compare` | Returns heatmap, similarity, tamper region, verdict |
| POST | `/describe` | Claude describes what changed between two images |
| POST | `/dmca` | Drafts a DMCA takedown letter |

## Verdict logic

| State | Trigger |
|---|---|
| `different` | pHash similarity < 40% |
| `edited` | Similarity 40–75%, or 75–90% with no significant tamper region |
| `suspicious` | Similarity 75–90% with tamper region detected |
| `stolen` | Similarity ≥ 90% AND tamper region detected with > 1% area |

## Demo plan

Three pre-staged image pairs prepared before showtime:
- **Pair A** — original + watermark-removed copy → expected `stolen`
- **Pair B** — original + signature-erased + color-shifted copy → expected `suspicious`
- **Pair C** — two unrelated images → expected `different` (negative case)

See `PHASES.md` for the full 2-hour build timeline and team split.

## License

MIT — built for Cursor Hack Manila.
