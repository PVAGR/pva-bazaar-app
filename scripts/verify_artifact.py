#!/usr/bin/env python3
from __future__ import annotations

"""
AI-Verified Artifact Hashing — Truth through verifiable hashes.

Why (Anti-Druj): We sell Scarce Knowledge; the value prop is Truth. This script
computes SHA-256 of a file and compares it against a trusted JSON database of
known public-domain hashes. No hidden logic: open and auditable.

Exit codes:
  0 — Artifact verified (is_authentic true, confidence meets threshold).
  1 — Integrity compromised (hash mismatch or file error).
  2 — Unknown artifact (hash not in trusted DB).
"""

import argparse
import hashlib
import json
import sys
from pathlib import Path

# Minimum confidence to consider artifact authentic (1.0 = exact hash match only).
CONFIDENCE_THRESHOLD = 1.0
# Chunk size for hashing large files (e.g. ISO).
HASH_CHUNK_SIZE = 1 << 20  # 1 MiB

STATUS_VERIFIED = "verified"
STATUS_INTEGRITY_COMPROMISED = "integrity_compromised"
STATUS_UNKNOWN = "unknown"
STATUS_ERROR = "error"


def sha256_file(path: Path) -> str:
    """Compute SHA-256 of file in chunks. Auditable: standard library only."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(HASH_CHUNK_SIZE):
            h.update(chunk)
    return h.hexdigest()


def load_trusted_db(db_path: Path) -> dict | None:
    """
    Load trusted hashes JSON. Returns None on error (caller should return
    an error result dict so message is always explicit — Anti-Druj).
    """
    try:
        with open(db_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        return None  # Caller will set message
    except json.JSONDecodeError:
        return None
    if "entries" not in data or not isinstance(data["entries"], list):
        return None
    return data


def find_match(computed_hash: str, entries: list) -> tuple[bool, float, dict | None]:
    """
    Find an entry whose sha256 equals computed_hash.
    Returns (is_authentic, confidence_score, matched_entry).
    confidence_score is 1.0 for exact match, 0.0 otherwise (no fuzzy matching for Truth).
    """
    computed_lower = computed_hash.lower()
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        trusted = entry.get("sha256")
        if not trusted:
            continue
        if trusted.lower() == computed_lower:
            return True, 1.0, entry
    return False, 0.0, None


def verify(path: Path, db_path: Path) -> dict:
    """Run verification: hash file, compare to trusted DB. Return result dict."""
    if not path.exists():
        return {
            "is_authentic": False,
            "confidence_score": 0.0,
            "status": STATUS_ERROR,
            "message": "Integrity Compromised: file not found.",
            "computed_hash": None,
            "matched_entry": None,
        }
    if not path.is_file():
        return {
            "is_authentic": False,
            "confidence_score": 0.0,
            "status": STATUS_ERROR,
            "message": "Integrity Compromised: path is not a file.",
            "computed_hash": None,
            "matched_entry": None,
        }

    try:
        computed = sha256_file(path)
    except OSError as e:
        return {
            "is_authentic": False,
            "confidence_score": 0.0,
            "status": STATUS_ERROR,
            "message": f"Integrity Compromised: could not read file — {e}",
            "computed_hash": None,
            "matched_entry": None,
        }

    data = load_trusted_db(db_path)
    if data is None:
        if not db_path.exists():
            return {
                "is_authentic": False,
                "confidence_score": 0.0,
                "status": STATUS_ERROR,
                "message": "Trusted hash database not found. Anti-Druj: verification requires an auditable hash DB.",
                "computed_hash": computed,
                "matched_entry": None,
            }
        return {
            "is_authentic": False,
            "confidence_score": 0.0,
            "status": STATUS_ERROR,
            "message": "Invalid trusted hash database: must contain an 'entries' array.",
            "computed_hash": computed,
            "matched_entry": None,
        }
    entries = data["entries"]
    is_authentic, confidence_score, matched = find_match(computed, entries)

    if is_authentic and confidence_score >= CONFIDENCE_THRESHOLD:
        return {
            "is_authentic": True,
            "confidence_score": confidence_score,
            "status": STATUS_VERIFIED,
            "message": "Artifact hash matches trusted public-domain record.",
            "computed_hash": computed,
            "matched_entry": matched,
        }

    if not is_authentic and matched is None:
        return {
            "is_authentic": False,
            "confidence_score": 0.0,
            "status": STATUS_UNKNOWN,
            "message": "Unknown artifact: hash not in trusted database. Add to trusted_hashes.json if this is a known PD source.",
            "computed_hash": computed,
            "matched_entry": None,
        }

    # Hash was in DB but did not match (shouldn't happen with current logic; explicit for clarity).
    return {
        "is_authentic": False,
        "confidence_score": 0.0,
        "status": STATUS_INTEGRITY_COMPROMISED,
        "message": "Integrity Compromised: file hash does not match any trusted record.",
        "computed_hash": computed,
        "matched_entry": None,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Verify artifact file against trusted SHA-256 database (Anti-Druj)."
    )
    parser.add_argument(
        "file",
        type=Path,
        help="Path to artifact file (ISO, bin, cue, etc.).",
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=None,
        help="Path to trusted_hashes.json (default: same dir as script).",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit result as JSON only (no stderr summary).",
    )
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    db_path = args.db or script_dir / "trusted_hashes.json"

    result = verify(args.file, db_path)

    out = json.dumps(result, indent=2)
    print(out)

    if not args.json:
        if result["status"] == STATUS_VERIFIED:
            print("VERIFIED", file=sys.stderr)
        elif result["status"] == STATUS_INTEGRITY_COMPROMISED or result["status"] == STATUS_ERROR:
            print("INTEGRITY COMPROMISED:", result["message"], file=sys.stderr)
        else:
            print("UNKNOWN:", result["message"], file=sys.stderr)

    if result["is_authentic"] and result["confidence_score"] >= CONFIDENCE_THRESHOLD:
        sys.exit(0)
    sys.exit(1)


if __name__ == "__main__":
    main()
