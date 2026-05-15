"""Request and response schemas for the Sonovera API."""

from typing import Optional
from pydantic import BaseModel, Field


class CompareRequest(BaseModel):
    """Two images to compare, both base64-encoded (no data:image prefix)."""
    original: str = Field(..., description="Base64-encoded original image")
    suspect: str = Field(..., description="Base64-encoded suspected copy")


class TamperBox(BaseModel):
    x1: int
    y1: int
    x2: int
    y2: int


class CompareResponse(BaseModel):
    similarity: float = Field(..., description="pHash similarity score 0-100")
    tamper_percent: float = Field(..., description="% of pixels flagged as tampered")
    heatmap_base64: str = Field(..., description="Heatmap PNG, base64-encoded")
    overlay_base64: str = Field(..., description="Heatmap blended over original, base64")
    tamper_box: Optional[TamperBox] = None
    verdict: str = Field(..., description="One of: different, edited, suspicious, stolen")


class DescribeRequest(BaseModel):
    original: str
    suspect: str


class DescribeResponse(BaseModel):
    description: str = Field(..., description="Plain-language description of changes")


class DMCARequest(BaseModel):
    description: str = Field(..., description="AI description of the changes")
    claimant_name: str = Field(..., description="Name of the rights holder")
    claimant_email: str = Field(..., description="Contact email")
    work_title: str = Field(..., description="Title or description of the original work")
    infringing_url: Optional[str] = Field(None, description="URL where copy was found")
    similarity: Optional[float] = None


class DMCAResponse(BaseModel):
    letter: str = Field(..., description="Formatted DMCA takedown letter")
