"""
Anthropic Claude integration for Sonovera.

Provides two functions:
    describe_changes - vision call that describes what was tampered between
                       the original and suspect images
    generate_dmca   - drafts a formal DMCA takedown letter
"""

from __future__ import annotations

import os
from anthropic import Anthropic


DEFAULT_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")

_client: Anthropic | None = None


def _get_client() -> Anthropic:
    global _client
    if _client is None:
        _client = Anthropic()  # reads ANTHROPIC_API_KEY from env
    return _client


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

DESCRIBE_SYSTEM = """You are a forensic image analyst working for an art-theft \
detection service. You compare an ORIGINAL artwork against a SUSPECT image that \
may be an edited or stolen version.

When asked to compare images, identify SPECIFIC observable changes between them, \
prioritizing tampering signals:
- removed or altered watermarks
- erased or replaced signatures
- cropping, framing changes
- cloned-out regions
- color shifts, recoloring, hue changes
- added or removed objects
- composite inserts or paste-overs
- AI-redraw / img2img-style regeneration

Output requirements:
- 2 to 4 sentences. No more.
- Name WHAT changed and WHERE in the image (top-left, lower-right, center, etc).
- Use plain language any artist would understand. No jargon.
- Do NOT speculate about intent or motive. Describe only what you observe.
- If the images appear to be entirely different scenes, say so directly.
- No preamble. No headers. No bullet points. Output the description only."""


DMCA_SYSTEM = """You are drafting formal DMCA takedown notices under \
17 U.S.C. § 512(c)(3) on behalf of an artist whose work has been copied without \
authorization. Output only the letter itself.

The letter MUST include, in this order:
1. A clear subject line.
2. Identification of the original copyrighted work.
3. Identification of the infringing material, citing the specific forensic findings.
4. The required good-faith statement.
5. The required accuracy and perjury statement.
6. Claimant contact information and a signature block.

Tone: professional, firm, factual. No threats. No emotional language. \
No legal advice disclaimers. Output the letter as plain text, ready to paste \
into an email."""


# ---------------------------------------------------------------------------
# Public functions
# ---------------------------------------------------------------------------

def describe_changes(original_b64: str, suspect_b64: str) -> str:
    """
    Ask Claude to describe specifically what changed between the two images.
    Inputs are base64-encoded image strings (with or without data URI prefix).
    """
    original_b64 = _strip_data_uri(original_b64)
    suspect_b64 = _strip_data_uri(suspect_b64)

    response = _get_client().messages.create(
        model=DEFAULT_MODEL,
        max_tokens=400,
        system=DESCRIBE_SYSTEM,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "ORIGINAL image (first):"},
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": original_b64,
                        },
                    },
                    {"type": "text", "text": "SUSPECT image (second):"},
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": suspect_b64,
                        },
                    },
                    {
                        "type": "text",
                        "text": "Describe the specific changes between the SUSPECT and the ORIGINAL.",
                    },
                ],
            }
        ],
    )

    return _extract_text(response).strip()


def generate_dmca(
    description: str,
    claimant_name: str,
    claimant_email: str,
    work_title: str,
    infringing_url: str | None = None,
    similarity: float | None = None,
) -> str:
    """Draft a DMCA takedown letter from the forensic findings + claimant info."""

    similarity_line = (
        f"Forensic similarity score: {similarity:.1f}%\n" if similarity is not None else ""
    )
    url_line = f"Infringing URL: {infringing_url}\n" if infringing_url else ""

    user_prompt = f"""Draft a DMCA takedown letter using the following case details.

CLAIMANT
Name: {claimant_name}
Email: {claimant_email}

ORIGINAL WORK
Title or description: {work_title}

INFRINGEMENT
{url_line}{similarity_line}Forensic finding from Sonovera image analysis:
{description}

Today's date should be used. Sign as "{claimant_name}". Output the letter only."""

    response = _get_client().messages.create(
        model=DEFAULT_MODEL,
        max_tokens=1200,
        system=DMCA_SYSTEM,
        messages=[{"role": "user", "content": user_prompt}],
    )

    return _extract_text(response).strip()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _strip_data_uri(b64: str) -> str:
    """Remove the 'data:image/...;base64,' prefix if present."""
    if "," in b64 and b64.lstrip().startswith("data:"):
        return b64.split(",", 1)[1]
    return b64


def _extract_text(response) -> str:
    """Pull the first text block out of a Claude response."""
    for block in response.content:
        if getattr(block, "type", None) == "text":
            return block.text
    return ""
