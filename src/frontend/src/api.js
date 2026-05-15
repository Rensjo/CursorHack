// Sonovera backend client — compare endpoint only (multipart).
// Set VITE_API_BASE in .env (see .env.example). Empty → use "/api" (Vite dev proxy).

const rawBase = import.meta.env.VITE_API_BASE;
const BASE =
  typeof rawBase === "string" && rawBase.trim().length > 0
    ? rawBase.trim().replace(/\/+$/, "")
    : "/api";

function dataURLToBlob(dataURL) {
  const idx = dataURL.indexOf(",");
  const header = idx >= 0 ? dataURL.slice(0, idx) : "data:image/png;base64";
  const b64 = idx >= 0 ? dataURL.slice(idx + 1) : dataURL;
  const mimeMatch = header.match(/data:([^;]+)/);
  const mime = mimeMatch?.[1] || "image/png";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function safeFilename(name, fallback) {
  if (!name || typeof name !== "string") return fallback;
  const trimmed = name.trim();
  return trimmed || fallback;
}

/**
 * POST /compare — multipart original + suspect files.
 * @param {string} originalDataURL
 * @param {string} suspectDataURL
 * @param {string} [originalName]
 * @param {string} [suspectName]
 */
export async function compareImages(originalDataURL, suspectDataURL, originalName, suspectName) {
  const form = new FormData();
  form.append(
    "original",
    dataURLToBlob(originalDataURL),
    safeFilename(originalName, "original.jpg"),
  );
  form.append(
    "suspect",
    dataURLToBlob(suspectDataURL),
    safeFilename(suspectName, "suspect.jpg"),
  );

  const response = await fetch(`${BASE}/compare`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    let detail = await response.text();
    try {
      const j = JSON.parse(detail);
      if (j.detail != null) detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
    } catch {
      /* use raw text */
    }
    throw new Error(`${response.status}: ${detail}`);
  }

  return response.json();
}

export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
