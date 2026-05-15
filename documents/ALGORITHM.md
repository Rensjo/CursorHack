# Sonovera — Heatmap Diff Algorithm

A complete explanation of how image comparison, heatmap generation, and similarity scoring work under the hood.

---

## The Core Idea

You have two images — one is the **original** (yours), one is the **suspected copy** (someone else's edited or stolen version).

The app answers one question:

> *"Where are these two images different, and how different are they?"*

The heatmap visualizes the answer. **Green = same. Red = changed.**

---

## The Analogy

Imagine two photos printed on paper.

You put **photo B on top of photo A** and hold them up to the light.

- Wherever they're the **same**, light passes through evenly — you see nothing.
- Wherever they're **different**, one blocks light the other doesn't — you see a bright spot.

That bright spot is your heatmap.

---

## Why Two Techniques?

Two separate algorithms run in parallel. Each one answers a different question.

| | SSIM (pixel-based) | pHash (perceptual hash) |
|---|---|---|
| **Answers** | *Where* did it change? | *How similar* is it overall? |
| **Output** | Heatmap image | Similarity % score |
| **Breaks when** | Images are different sizes without normalization | Images are completely regenerated |
| **Handles** | Showing exact tampered regions | Resizing, JPEG re-compression artifacts |

They cover each other's weaknesses. Together they give both a visual and a numeric answer.

---

## The Algorithm — Step by Step

### Step 1 — Normalize Both Images

Before comparing, resize both images to the same dimensions so pixel positions line up correctly. Without this, a 300×300 crop compared to a 1024×768 original would produce meaningless results.

```python
from PIL import Image
import numpy as np

def normalize(img_path, size=(256, 256)):
    img = Image.open(img_path).convert("RGB")
    img = img.resize(size)
    return np.array(img, dtype=np.float32)

A = normalize("original.jpg")
B = normalize("suspect.jpg")
```

Both images are now 256×256 and in the same coordinate space — every pixel at position `(x, y)` in A corresponds directly to `(x, y)` in B.

---

### Step 2 — SSIM Diff Map (Where Changed)

Instead of raw pixel subtraction, we use **SSIM** — Structural Similarity Index. It compares local regions of the image accounting for luminance, contrast, and structure — not just raw pixel values.

**Why SSIM over raw subtraction:**

Raw subtraction flags JPEG compression artifacts as "changes" even when the image is visually identical. SSIM ignores those because it looks at structure, not exact values.

```python
from skimage.metrics import structural_similarity as ssim
import cv2

A_gray = cv2.cvtColor(A.astype(np.uint8), cv2.COLOR_RGB2GRAY)
B_gray = cv2.cvtColor(B.astype(np.uint8), cv2.COLOR_RGB2GRAY)

score, diff_map = ssim(A_gray, B_gray, full=True)
diff_map = (1 - diff_map)  # invert: 0.0 = same, 1.0 = completely different
```

`diff_map` is now a 256×256 grid of floats — small values where images match, large values where they don't. `score` is the overall similarity from 0 to 1.

---

### Step 3 — Amplify the Contrast

Raw SSIM differences are subtle. Amplifying them makes small edits clearly visible on the heatmap.

```python
diff_amplified = np.clip(diff_map * 3, 0, 1)
```

Multiplying by 3 means a difference of 0.33 becomes full intensity. Values above 1.0 are clipped.

---

### Step 4 — Apply the Colormap

Map intensity values to colors:

```
difference near 0.0  →  green   (same)
difference ~0.5      →  yellow  (slightly changed)
difference near 1.0  →  red     (heavily changed)
```

```python
import matplotlib.cm as cm

heatmap_rgba = cm.RdYlGn_r(diff_amplified)  # RdYlGn reversed: green=low, red=high
heatmap_img = Image.fromarray((heatmap_rgba[:,:,:3] * 255).astype(np.uint8))
heatmap_img.save("heatmap.png")
```

---

### Step 5 — Overlay Blend

The heatmap is blended on top of the original image at ~55% opacity. This way you can see both the original content and the change map at the same time — judges understand it instantly without any explanation.

```python
heatmap_pil = heatmap_img.convert("RGBA")
heatmap_pil.putalpha(140)  # 55% opacity

original_pil = Image.open("original.jpg").resize((256, 256)).convert("RGBA")
blended = Image.alpha_composite(original_pil, heatmap_pil)
blended.save("overlay.png")
```

---

### Step 6 — pHash Similarity Score (How Similar Overall)

On top of the visual heatmap, a **perceptual hash** computes a single reliable similarity number.

pHash shrinks the image to 8×8, converts to grayscale, and creates a 64-bit fingerprint based on whether each pixel is brighter or darker than the average. Two visually similar images will produce nearly identical fingerprints even if resized or re-compressed.

```python
import imagehash
from PIL import Image

hash_a = imagehash.phash(Image.open("original.jpg"))
hash_b = imagehash.phash(Image.open("suspect.jpg"))

distance = hash_a - hash_b        # Hamming distance: bits that differ
similarity = 1 - (distance / 64)  # 1.0 = identical, 0.0 = completely different
print(f"{similarity * 100:.1f}% similar")
```

**How Hamming distance works:**

```
image A fingerprint:  1011 0110 1101 0010 ...
image B fingerprint:  1011 0110 1101 1010 ...
                                       ^
                                  1 bit differs → Hamming distance = 1 → very similar
```

pHash is used for the similarity score only — it cannot show *where* changes happened. That's SSIM's job.

---

### Step 7 — Tamper Region Localization

Find the bounding box of the most changed region so it can be highlighted in the UI.

```python
threshold = 0.3
mask = (diff_amplified > threshold).astype(np.uint8) * 255

rows = np.any(mask, axis=1)
cols = np.any(mask, axis=0)

if rows.any() and cols.any():
    rmin, rmax = np.where(rows)[0][[0, -1]]
    cmin, cmax = np.where(cols)[0][[0, -1]]
    tamper_box = { "x1": int(cmin), "y1": int(rmin), "x2": int(cmax), "y2": int(rmax) }
    tamper_percent = float(mask.sum()) / (256 * 256) * 100
```

---

## Full Pipeline

```
Image A (original)  ──┐
                       ├──► resize to 256×256
Image B (suspect)  ───┘
                            │
                  ┌─────────┴──────────┐
                  ▼                    ▼
           grayscale both        pHash on originals
                  │                    │
                  ▼                    ▼
          SSIM diff map          Hamming distance
                  │                    │
                  ▼                    ▼
        amplify contrast         similarity %
                  │
                  ▼
         RdYlGn colormap
                  │
           ┌──────┴───────┐
           ▼              ▼
       heatmap.png    overlay.png
           │
           ▼
    tamper bounding box
           │
           └────────────────────────► API response
```

---

## API

One endpoint. Takes two images, returns everything.

**POST `/compare`**

```json
{
  "original": "<base64 image>",
  "suspect": "<base64 image>"
}
```

**Response:**

```json
{
  "similarity": 73.4,
  "tamper_percent": 18.2,
  "heatmap_base64": "...",
  "overlay_base64": "...",
  "tamper_box": { "x1": 40, "y1": 60, "x2": 180, "y2": 200 }
}
```

---

## What the UI Shows

```
[ original image ]  [ suspect image ]  [ overlay ]

  similarity: 73%
  tampered area: 18%
  verdict: LIKELY STOLEN
```

---

## Stack

| Layer | Tool |
|---|---|
| Frontend | React + Tailwind |
| Backend | FastAPI |
| Image diff | scikit-image (SSIM) |
| Image processing | Pillow + NumPy + OpenCV |
| Similarity score | imagehash (pHash) |
| Colormap | matplotlib |
| Transport | Base64 image strings via JSON |

---

## Demo Story

> *"I'm an artist. Someone cropped my image and reposted it. I upload both into Sonovera — it flags 73% similarity and highlights the stolen region in red. Done."*

---

## About the Rust Codebase

There is an existing Rust CLI (`src/reference/main.rs`) that was the original Sonovera implementation. It does perceptual hashing, overlapping tile-based fingerprinting, DWT audio signatures, and a local blockchain ledger.

**Do not integrate or port the Rust code into the hackathon build.**

Reasons:
- The Rust code's useful piece — pHash — is replicated in 2 lines with `imagehash` in Python
- The core new features (SSIM diff map, colormap, overlay blend) do not exist in the Rust code at all
- Wiring up a Rust binary as a subprocess or microservice adds integration complexity with zero benefit in a 3-hour window
- The blockchain, audio signature, and tile matching from the Rust code are all out of scope for this project

The Rust code is useful only as a **reference** for understanding the concepts behind perceptual hashing and tile-based similarity. All implementation for the hackathon is in Python.

If asked about the Rust code during the demo: it is a production-grade CLI prototype that informed the design of this tool. The hackathon build is the web-accessible version of the same core idea.

Make sure not to stray away, as we have our limited time
