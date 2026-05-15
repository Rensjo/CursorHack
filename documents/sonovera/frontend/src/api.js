// Centralized API client for the Sonovera backend.
// In dev, requests go through Vite's /api proxy to localhost:8000.
// In production, set VITE_API_BASE to the deployed backend URL.

const BASE = import.meta.env.VITE_API_BASE || "/api";

async function postJSON(path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status}: ${text}`);
  }

  return response.json();
}

// Strip the data: prefix from a base64 data URL since backend wants raw base64
function stripDataURI(dataUrl) {
  if (typeof dataUrl !== "string") return dataUrl;
  const idx = dataUrl.indexOf(",");
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

// Convert a File to a base64-encoded data URL
export function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export async function compareImages(originalDataURL, suspectDataURL) {
  return postJSON("/compare", {
    original: stripDataURI(originalDataURL),
    suspect: stripDataURI(suspectDataURL),
  });
}

export async function describeChanges(originalDataURL, suspectDataURL) {
  return postJSON("/describe", {
    original: stripDataURI(originalDataURL),
    suspect: stripDataURI(suspectDataURL),
  });
}

export async function generateDMCA(payload) {
  return postJSON("/dmca", payload);
}
