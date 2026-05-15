import base64
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from compare import run_pipeline
import blockchain
import imagehash
from PIL import Image
import io

app = FastAPI(docs_url="/swagger", redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_class=HTMLResponse)
def docs():
    return """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Sonovera API</title>
  <style>
    body { font-family: monospace; max-width: 860px; margin: 40px auto; padding: 0 20px; background: #0f0f0f; color: #e0e0e0; }
    h1 { color: #fff; border-bottom: 1px solid #333; padding-bottom: 12px; }
    h2 { color: #a78bfa; margin-top: 40px; }
    .method { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 13px; margin-right: 8px; }
    .get  { background: #1d4ed8; color: #fff; }
    .post { background: #15803d; color: #fff; }
    .path { color: #f0f0f0; font-size: 16px; }
    .desc { color: #9ca3af; margin: 6px 0 14px; }
    pre { background: #1a1a1a; border: 1px solid #2a2a2a; padding: 14px; border-radius: 6px; overflow-x: auto; font-size: 13px; line-height: 1.6; }
    .label { color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 13px; }
    td, th { text-align: left; padding: 6px 10px; border-bottom: 1px solid #2a2a2a; }
    th { color: #9ca3af; font-weight: normal; }
    .tag { color: #34d399; }
  </style>
</head>
<body>
  <h1>Sonovera API</h1>
  <p style="color:#9ca3af">Image tamper detection + blockchain ownership registry. Base URL: <span style="color:#fff">http://localhost:8000</span></p>

  <!-- HEALTH -->
  <h2><span class="method get">GET</span><span class="path">/health</span></h2>
  <p class="desc">Check if the server is running.</p>
  <div class="label">curl</div>
  <pre>curl http://localhost:8000/health</pre>
  <div class="label">response</div>
  <pre>{ "status": "ok" }</pre>

  <!-- COMPARE -->
  <h2><span class="method post">POST</span><span class="path">/compare</span></h2>
  <p class="desc">Compare two images. Returns a heatmap showing where they differ, a similarity score, and a tamper verdict.</p>
  <div class="label">fields (multipart/form-data)</div>
  <table>
    <tr><th>Field</th><th>Type</th><th>Description</th></tr>
    <tr><td><span class="tag">original</span></td><td>file</td><td>The original image (JPG, PNG, WEBP)</td></tr>
    <tr><td><span class="tag">suspect</span></td><td>file</td><td>The suspected tampered copy</td></tr>
  </table>
  <div class="label">curl</div>
  <pre>curl -X POST http://localhost:8000/compare \\
  -F "original=@original.jpg" \\
  -F "suspect=@suspect.jpg"</pre>
  <div class="label">response</div>
  <pre>{
  "similarity": 73.4,
  "tamper_percent": 18.2,
  "heatmap_base64": "&lt;png as base64&gt;",
  "overlay_base64": "&lt;png as base64&gt;",
  "tamper_box": { "x1": 40, "y1": 60, "x2": 180, "y2": 200 },
  "verdict": {
    "label": "Suspicious modification",
    "color": "orange",
    "level": 2
  }
}</pre>
  <div class="label">verdict levels</div>
  <table>
    <tr><th>Level</th><th>Label</th><th>Color</th><th>Condition</th></tr>
    <tr><td>0</td><td>Different image</td><td>green</td><td>similarity &lt; 40%</td></tr>
    <tr><td>1</td><td>Edited version</td><td>yellow</td><td>similarity 40–75%, low tamper area</td></tr>
    <tr><td>2</td><td>Suspicious modification</td><td>orange</td><td>similarity 75–90%</td></tr>
    <tr><td>3</td><td>Stolen and altered</td><td>red</td><td>similarity &ge; 90% + tamper &gt; 5%</td></tr>
  </table>

  <!-- REGISTER -->
  <h2><span class="method post">POST</span><span class="path">/register</span></h2>
  <p class="desc">Register an image to the blockchain. Computes a perceptual hash and stores it as a new block with a timestamp and owner name. Use this to prove original ownership before publishing.</p>
  <div class="label">fields (multipart/form-data)</div>
  <table>
    <tr><th>Field</th><th>Type</th><th>Description</th></tr>
    <tr><td><span class="tag">image</span></td><td>file</td><td>The original image to register</td></tr>
    <tr><td><span class="tag">owner</span></td><td>string</td><td>Your name or identifier</td></tr>
  </table>
  <div class="label">curl</div>
  <pre>curl -X POST http://localhost:8000/register \\
  -F "image=@original.jpg" \\
  -F "owner=YourName"</pre>
  <div class="label">response</div>
  <pre>{
  "block_id": 0,
  "timestamp": "2026-05-15T10:00:00+00:00",
  "image_hash": "a1b2c3d4e5f6...",
  "owner": "YourName",
  "previous_hash": "0000000000000000...",
  "block_hash": "f9e8d7c6b5a4..."
}</pre>

  <!-- CHAIN -->
  <h2><span class="method get">GET</span><span class="path">/chain</span></h2>
  <p class="desc">View the full blockchain ledger. Each block links to the previous via SHA-256, making tampering detectable.</p>
  <div class="label">curl</div>
  <pre>curl http://localhost:8000/chain</pre>
  <div class="label">response</div>
  <pre>{
  "valid": true,
  "blocks": 2,
  "chain": [
    {
      "block_id": 0,
      "timestamp": "2026-05-15T10:00:00+00:00",
      "image_hash": "a1b2c3d4...",
      "owner": "YourName",
      "previous_hash": "0000000000000000...",
      "block_hash": "f9e8d7c6..."
    },
    ...
  ]
}</pre>

</body>
</html>
"""


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/compare")
async def compare(original: UploadFile = File(...), suspect: UploadFile = File(...)):
    original_bytes = await original.read()
    suspect_bytes = await suspect.read()

    original_b64 = base64.b64encode(original_bytes).decode()
    suspect_b64 = base64.b64encode(suspect_bytes).decode()

    try:
        result = run_pipeline(original_b64, suspect_b64)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return result


@app.post("/register")
async def register(image: UploadFile = File(...), owner: str = Form(...)):
    image_bytes = await image.read()

    try:
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image_hash = str(imagehash.phash(pil_img))
        record = blockchain.add_record(image_hash, owner)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return record


@app.get("/chain")
def chain():
    result = blockchain.verify_chain()
    result["chain"] = blockchain.get_chain()
    return result
