"""
Sonovera FastAPI backend.

Endpoints:
    GET  /health     - liveness check
    POST /compare    - run image comparison (SSIM heatmap + pHash similarity)
    POST /describe   - Claude vision call describing what changed
    POST /dmca       - draft a DMCA takedown letter
"""

from __future__ import annotations

import os
import logging
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from compare import compare_images
from ai import describe_changes, generate_dmca
from schemas import (
    CompareRequest,
    CompareResponse,
    DescribeRequest,
    DescribeResponse,
    DMCARequest,
    DMCAResponse,
    TamperBox,
)

load_dotenv()

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("sonovera")

app = FastAPI(
    title="Sonovera API",
    description="Image-theft forensics: heatmap diff + AI description + DMCA draft.",
    version="1.0.0",
)

# CORS — permissive for hackathon demo. Lock down for production.
allowed = os.getenv("ALLOWED_ORIGINS", "*")
origins = [o.strip() for o in allowed.split(",")] if allowed != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
async def health() -> dict:
    """Simple liveness check."""
    return {"status": "ok", "service": "sonovera"}


@app.post("/compare", response_model=CompareResponse)
async def compare(req: CompareRequest) -> CompareResponse:
    """Run the SSIM heatmap + pHash comparison pipeline."""
    try:
        result = compare_images(req.original, req.suspect)
    except Exception as exc:
        log.exception("compare failed")
        raise HTTPException(status_code=400, detail=f"Comparison failed: {exc}") from exc

    return CompareResponse(
        similarity=result.similarity,
        tamper_percent=result.tamper_percent,
        heatmap_base64=result.heatmap_base64,
        overlay_base64=result.overlay_base64,
        tamper_box=TamperBox(**result.tamper_box) if result.tamper_box else None,
        verdict=result.verdict,
    )


@app.post("/describe", response_model=DescribeResponse)
async def describe(req: DescribeRequest) -> DescribeResponse:
    """Ask Claude to describe specifically what changed between the two images."""
    try:
        text = describe_changes(req.original, req.suspect)
    except Exception as exc:
        log.exception("describe failed")
        raise HTTPException(status_code=502, detail=f"AI description failed: {exc}") from exc

    return DescribeResponse(description=text)


@app.post("/dmca", response_model=DMCAResponse)
async def dmca(req: DMCARequest) -> DMCAResponse:
    """Draft a DMCA takedown letter from the forensic findings."""
    try:
        letter = generate_dmca(
            description=req.description,
            claimant_name=req.claimant_name,
            claimant_email=req.claimant_email,
            work_title=req.work_title,
            infringing_url=req.infringing_url,
            similarity=req.similarity,
        )
    except Exception as exc:
        log.exception("dmca failed")
        raise HTTPException(status_code=502, detail=f"DMCA generation failed: {exc}") from exc

    return DMCAResponse(letter=letter)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
