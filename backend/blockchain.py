import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path

CHAIN_FILE = "blockchain.jsonl"


def _compute_block_hash(record: dict) -> str:
    data = (
        str(record["block_id"])
        + record["timestamp"]
        + record["image_hash"]
        + record["owner"]
        + record["previous_hash"]
    )
    return hashlib.sha256(data.encode()).hexdigest()


def _get_last_hash() -> str:
    path = Path(CHAIN_FILE)
    if not path.exists():
        return "0" * 64
    lines = [l for l in path.read_text().splitlines() if l.strip()]
    if not lines:
        return "0" * 64
    last = json.loads(lines[-1])
    return _compute_block_hash(last)


def _get_chain_length() -> int:
    path = Path(CHAIN_FILE)
    if not path.exists():
        return 0
    return len([l for l in path.read_text().splitlines() if l.strip()])


def add_record(image_hash: str, owner: str) -> dict:
    previous_hash = _get_last_hash()
    block_id = _get_chain_length()

    record = {
        "block_id": block_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "image_hash": image_hash,
        "owner": owner,
        "previous_hash": previous_hash,
    }
    record["block_hash"] = _compute_block_hash(record)

    with open(CHAIN_FILE, "a") as f:
        f.write(json.dumps(record) + "\n")

    return record


def get_chain() -> list:
    path = Path(CHAIN_FILE)
    if not path.exists():
        return []
    return [json.loads(l) for l in path.read_text().splitlines() if l.strip()]


def verify_chain() -> dict:
    records = get_chain()
    if not records:
        return {"valid": True, "blocks": 0}

    previous_hash = "0" * 64
    for record in records:
        if record["previous_hash"] != previous_hash:
            return {"valid": False, "failed_at_block": record["block_id"]}
        previous_hash = _compute_block_hash(record)

    return {"valid": True, "blocks": len(records)}


def find_record(image_hash: str) -> dict | None:
    for record in get_chain():
        if record["image_hash"] == image_hash:
            return record
    return None
