import base64
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from compare import run_pipeline

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


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
