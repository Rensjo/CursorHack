"""
Sonovera image comparison core.

Ports the algorithm described in ALGORITHM.md:
    1. Normalize both images to 256x256
    2. SSIM diff map for spatial localization
    3. Contrast amplification
    4. RdYlGn_r colormap to produce the heatmap
    5. Overlay blend on the original at 55% opacity
    6. pHash for overall similarity score
    7. Bounding box of the most-changed region
    8. Verdict bucketing
"""

from __future__ import annotations

import base64
import io
from dataclasses import dataclass
from typing import Optional

import cv2
import imagehash
import matplotlib.cm as cm
import numpy as np
from PIL import Image
from skimage.metrics import structural_similarity as ssim


SIZE = (256, 256)
AMPLIFY = 3.0
TAMPER_THRESHOLD = 0.3
OVERLAY_ALPHA = 140  # ~55% opacity


@dataclass
class CompareResult:
    similarity: float            # 0-100
    tamper_percent: float        # 0-100
    heatmap_base64: str
    overlay_base64: str
    tamper_box: Optional[dict]
    verdict: str


def _decode_base64_image(b64: str) -> Image.Image:
    """Decode a base64 image string (with or without data URI prefix) to PIL Image."""
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    raw = base64.b64decode(b64)
    return Image.open(io.BytesIO(raw)).convert("RGB")


def _encode_png_to_base64(img: Image.Image) -> str:
    """Encode a PIL Image as a base64 PNG string."""
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


def _normalize(img: Image.Image) -> np.ndarray:
    """Resize to SIZE and return as float32 RGB array."""
    resized = img.resize(SIZE)
    return np.array(resized, dtype=np.float32)


def _ssim_diff_map(a_rgb: np.ndarray, b_rgb: np.ndarray) -> tuple[float, np.ndarray]:
    """
    Compute SSIM-based diff map.
    Returns (overall_score, diff_map) where diff_map is 0.0-1.0
    with 0 = same and 1 = different.
    """
    a_gray = cv2.cvtColor(a_rgb.astype(np.uint8), cv2.COLOR_RGB2GRAY)
    b_gray = cv2.cvtColor(b_rgb.astype(np.uint8), cv2.COLOR_RGB2GRAY)
    score, diff = ssim(a_gray, b_gray, full=True)
    inverted = 1.0 - diff  # invert so larger = more different
    return float(score), inverted


def _make_heatmap(diff_amplified: np.ndarray) -> Image.Image:
    """Apply RdYlGn_r colormap. Green = same, red = changed."""
    rgba = cm.RdYlGn_r(diff_amplified)  # H x W x 4 floats 0-1
    rgb = (rgba[:, :, :3] * 255).astype(np.uint8)
    return Image.fromarray(rgb)


def _make_overlay(original: Image.Image, heatmap: Image.Image) -> Image.Image:
    """Blend the heatmap over the resized original at 55% opacity."""
    base = original.resize(SIZE).convert("RGBA")
    top = heatmap.convert("RGBA")
    top.putalpha(OVERLAY_ALPHA)
    return Image.alpha_composite(base, top)


def _phash_similarity(a: Image.Image, b: Image.Image) -> float:
    """Compute perceptual-hash similarity. Returns 0-100."""
    ha = imagehash.phash(a)
    hb = imagehash.phash(b)
    distance = ha - hb  # Hamming distance 0-64
    return float((1.0 - distance / 64.0) * 100.0)


def _tamper_bbox(diff_amplified: np.ndarray) -> tuple[Optional[dict], float]:
    """Find the bounding box of the most-changed region and the % area."""
    mask = (diff_amplified > TAMPER_THRESHOLD).astype(np.uint8)
    rows = np.any(mask, axis=1)
    cols = np.any(mask, axis=0)
    h, w = mask.shape
    tamper_pct = float(mask.sum()) / float(h * w) * 100.0
    if rows.any() and cols.any():
        rmin, rmax = np.where(rows)[0][[0, -1]]
        cmin, cmax = np.where(cols)[0][[0, -1]]
        box = {"x1": int(cmin), "y1": int(rmin), "x2": int(cmax), "y2": int(rmax)}
        return box, tamper_pct
    return None, tamper_pct


def _verdict(similarity: float, tamper_percent: float, has_box: bool) -> str:
    """
    Four-state verdict bucketing per PRD:
        different   - completely unrelated
        edited      - legitimate edit, likely same owner
        suspicious  - cropped, watermark stripped, etc.
        stolen      - high-confidence theft pattern
    """
    if similarity < 40.0:
        return "different"
    if similarity >= 90.0 and has_box and tamper_percent > 1.0:
        return "stolen"
    if similarity >= 75.0:
        return "suspicious"
    return "edited"


def compare_images(original_b64: str, suspect_b64: str) -> CompareResult:
    """Run the full comparison pipeline."""
    original = _decode_base64_image(original_b64)
    suspect = _decode_base64_image(suspect_b64)

    a_rgb = _normalize(original)
    b_rgb = _normalize(suspect)

    _, diff_map = _ssim_diff_map(a_rgb, b_rgb)
    diff_amplified = np.clip(diff_map * AMPLIFY, 0.0, 1.0)

    heatmap = _make_heatmap(diff_amplified)
    overlay = _make_overlay(original, heatmap)

    similarity = _phash_similarity(original, suspect)
    box, tamper_pct = _tamper_bbox(diff_amplified)
    verdict = _verdict(similarity, tamper_pct, box is not None)

    return CompareResult(
        similarity=round(similarity, 1),
        tamper_percent=round(tamper_pct, 1),
        heatmap_base64=_encode_png_to_base64(heatmap),
        overlay_base64=_encode_png_to_base64(overlay),
        tamper_box=box,
        verdict=verdict,
    )
