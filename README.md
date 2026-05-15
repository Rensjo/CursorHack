# Sonovera

Image theft detection tool. Upload an original and a suspected copy — get a visual heatmap of differences, a similarity score, and a confidence-graded verdict.

---

## Prerequisites

- Python 3.10+
- pip

---

## Setup

```bash
git clone <repo-url>
cd CursorHack/src/backend
pip install -r requirements.txt
```

---

## Running locally

```bash
cd src/backend
uvicorn main:app --reload
```

Server starts at `http://localhost:8000`.

---

## API

Full interactive docs available at `http://localhost:8000/` once the server is running.
Swagger UI at `http://localhost:8000/swagger`.

### `GET /health`
```json
{ "status": "ok" }
```

### `POST /compare`
Accepts `multipart/form-data`.

| Field      | Type | Description        |
|------------|------|--------------------|
| `original` | file | The original image |
| `suspect`  | file | The suspected copy |

```json
{
  "similarity": 73.4,
  "tamper_percent": 18.2,
  "heatmap_base64": "<png as base64>",
  "overlay_base64": "<png as base64>",
  "tamper_box": { "x1": 40, "y1": 60, "x2": 180, "y2": 200 },
  "verdict": { "label": "Suspicious modification", "color": "orange", "level": 2 }
}
```

### `POST /register`
Register an image to the blockchain to prove original ownership.

| Field   | Type   | Description              |
|---------|--------|--------------------------|
| `image` | file   | The original image       |
| `owner` | string | Your name or identifier  |

```json
{
  "block_id": 0,
  "timestamp": "2026-05-15T10:00:00+00:00",
  "image_hash": "a1b2c3d4e5f6...",
  "owner": "YourName",
  "previous_hash": "0000000000000000...",
  "block_hash": "f9e8d7c6b5a4..."
}
```

### `GET /chain`
Returns the full blockchain ledger with integrity verification.

```json
{
  "valid": true,
  "blocks": 2,
  "chain": [ ... ]
}
```

---

## Quick test

```bash
curl -X POST http://localhost:8000/compare \
  -F "original=@../../images/image.jpg" \
  -F "suspect=@../../images/image-half.jpg"
```

---

## Demo image pairs

Test assets are in `/images/`:

- `image.jpg` — original
- `image-half.jpg` — cropped/edited version

Use these to verify the pipeline produces a clean result before the demo.
