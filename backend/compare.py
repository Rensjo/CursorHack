import base64
import io
import numpy as np
import cv2
import matplotlib.cm as cm
import imagehash
from PIL import Image
from skimage.metrics import structural_similarity as ssim


def decode_image(b64_str: str) -> Image.Image:
    data = base64.b64decode(b64_str)
    return Image.open(io.BytesIO(data)).convert("RGB")


def encode_image(pil_img: Image.Image) -> str:
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def normalize(pil_img: Image.Image, size: int = 256) -> np.ndarray:
    img = pil_img.resize((size, size))
    return np.array(img, dtype=np.float32)


def ssim_diff(A: np.ndarray, B: np.ndarray):
    A_gray = cv2.cvtColor(A.astype(np.uint8), cv2.COLOR_RGB2GRAY)
    B_gray = cv2.cvtColor(B.astype(np.uint8), cv2.COLOR_RGB2GRAY)
    score, diff_map = ssim(A_gray, B_gray, full=True)
    diff_map = (1 - diff_map)  # 0=same, 1=different
    return diff_map, float(score)


def amplify(diff_map: np.ndarray) -> np.ndarray:
    return np.clip(diff_map * 3, 0, 1)


def apply_colormap(amplified: np.ndarray) -> Image.Image:
    heatmap_rgba = cm.RdYlGn_r(amplified)
    return Image.fromarray((heatmap_rgba[:, :, :3] * 255).astype(np.uint8))


def blend_overlay(original_pil: Image.Image, heatmap_pil: Image.Image, alpha: int = 140) -> Image.Image:
    original_rgba = original_pil.resize((256, 256)).convert("RGBA")
    heatmap_rgba = heatmap_pil.convert("RGBA")
    heatmap_rgba.putalpha(alpha)
    return Image.alpha_composite(original_rgba, heatmap_rgba)


def phash_similarity(img_a: Image.Image, img_b: Image.Image) -> float:
    hash_a = imagehash.phash(img_a)
    hash_b = imagehash.phash(img_b)
    distance = hash_a - hash_b
    return round((1 - distance / 64) * 100, 1)


def get_tamper_box(diff_amplified: np.ndarray, threshold: float = 0.3):
    mask = (diff_amplified > threshold).astype(np.uint8) * 255
    rows = np.any(mask, axis=1)
    cols = np.any(mask, axis=0)
    if not rows.any() or not cols.any():
        return None
    rmin, rmax = int(np.where(rows)[0][[0, -1]][0]), int(np.where(rows)[0][[0, -1]][1])
    cmin, cmax = int(np.where(cols)[0][[0, -1]][0]), int(np.where(cols)[0][[0, -1]][1])
    return {"x1": cmin, "y1": rmin, "x2": cmax, "y2": rmax}


def get_tamper_percent(diff_amplified: np.ndarray, threshold: float = 0.3) -> float:
    mask = (diff_amplified > threshold).astype(np.uint8)
    return round(float(mask.sum()) / (256 * 256) * 100, 1)


def get_verdict(similarity: float, tamper_percent: float) -> dict:
    if similarity < 40:
        return {"label": "Different image", "color": "green", "level": 0}
    if similarity < 75 and tamper_percent < 10:
        return {"label": "Edited version", "color": "yellow", "level": 1}
    if similarity < 90:
        return {"label": "Suspicious modification", "color": "orange", "level": 2}
    if tamper_percent > 5:
        return {"label": "Stolen and altered", "color": "red", "level": 3}
    return {"label": "Edited version", "color": "yellow", "level": 1}


def run_pipeline(original_b64: str, suspect_b64: str) -> dict:
    original_pil = decode_image(original_b64)
    suspect_pil = decode_image(suspect_b64)

    similarity = phash_similarity(original_pil, suspect_pil)

    A = normalize(original_pil)
    B = normalize(suspect_pil)

    diff_map, _ = ssim_diff(A, B)
    diff_amplified = amplify(diff_map)

    heatmap_img = apply_colormap(diff_amplified)
    overlay_img = blend_overlay(original_pil, heatmap_img)

    tamper_percent = get_tamper_percent(diff_amplified)
    tamper_box = get_tamper_box(diff_amplified)
    verdict = get_verdict(similarity, tamper_percent)

    return {
        "similarity": similarity,
        "tamper_percent": tamper_percent,
        "heatmap_base64": encode_image(heatmap_img),
        "overlay_base64": encode_image(overlay_img),
        "tamper_box": tamper_box,
        "verdict": verdict,
    }
