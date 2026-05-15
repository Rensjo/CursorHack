# Sonovera Backend

FastAPI service exposing the image-forensics pipeline.

## Quick start

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # paste your ANTHROPIC_API_KEY
uvicorn main:app --reload --port 8000
```

Server runs at `http://localhost:8000`. Docs at `http://localhost:8000/docs`.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness check |
| POST | `/compare` | SSIM heatmap + pHash similarity + verdict |
| POST | `/describe` | Claude vision: describe what changed |
| POST | `/dmca` | Draft DMCA takedown letter |

## Deploy to Railway

```bash
# from project root
railway login
railway init
railway up
railway variables set ANTHROPIC_API_KEY=sk-ant-...
```

Set Railway's start command to:
```
uvicorn main:app --host 0.0.0.0 --port $PORT
```

## Notes

- All images are processed in memory; nothing is persisted to disk.
- CORS is permissive (`*`) by default for the hackathon demo.
  Set `ALLOWED_ORIGINS` in production.
- The pipeline normalizes both images to 256x256 before comparison.
- Default model is `claude-sonnet-4-6`; override with `ANTHROPIC_MODEL` env var.
