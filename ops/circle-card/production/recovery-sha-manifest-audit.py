#!/usr/bin/env python3
"""Read-only audit of recovery artifact SHA folders and exact manifest locations.

Inspects only a bounded number of SHA-named entries and the manifest file
explicitly referenced by the recovery script. Never prints raw JSON, contents,
credentials, log messages or environment variables. No production writes.
"""
from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
import json
from pathlib import Path
import re

SCRIPT = Path("/opt/circle-card-recovery/run.mjs")
ARTIFACTS = Path("/var/lib/thebusinesscircle/circle-card-artifacts")
SHA = re.compile(r"^[a-f0-9]{40}$")
MAX_ENTRIES = 1500
MAX_MANIFEST_BYTES = 262144


def manifest_layout(source: str):
    """Match the actual readFileSync(artifacts + '/' + sha + '/file.json') path."""
    match = re.search(
        r"readFileSync\(\s*artifacts\s*\+\s*(['\"])([^'\"\r\n]*)\1"
        r"\s*\+\s*sha\s*\+\s*(['\"])([^'\"\r\n]*)\3",
        source,
    )
    if not match:
        return None, "could_not_parse_manifest_path"
    prefix, suffix = match.group(2), match.group(4)
    # Abort on any unfamiliar structure, rather than accidentally opening
    # an unrelated file or following a path out of the SHA folder.
    if prefix != "/" or not re.fullmatch(r"/[A-Za-z0-9_.-]+\.json", suffix):
        return None, "unrecognized_manifest_path"
    return suffix[1:], None


def expected_status(source: str):
    match = re.search(r"record\.status\s*===\s*(['\"])([A-Za-z0-9_-]{1,40})\1", source)
    return match.group(2) if match else None


def audit():
    report = {
        "mode": "READ_ONLY_SHA_DIRECTORY_MANIFEST_AUDIT",
        "time_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "script_exists": SCRIPT.is_file() and not SCRIPT.is_symlink(),
        "artifact_directory_exists": ARTIFACTS.is_dir() and not ARTIFACTS.is_symlink(),
        "entries_total": None,
        "sha_directory_count": 0,
        "sha_regular_file_count": 0,
        "manifest_filename": None,
        "manifest_layout_error": None,
        "expected_status": None,
        "manifest_present_count": 0,
        "manifest_missing_count": 0,
        "manifest_invalid_count": 0,
        "valid_manifest_count": 0,
        "statuses": {},
        "public_ports": {},
        "sha_field_matches_directory_count": 0,
        "matching_public_port_3386_count": 0,
        "matching_port_status_and_sha_count": 0,
        "matches_on_port_3386": [],
        "bounded_scan": True,
        "writes_made": False,
        "raw_records_printed": False,
    }
    if not report["script_exists"] or not report["artifact_directory_exists"]:
        return report
    source = SCRIPT.read_text(encoding="utf-8")
    manifest_name, error = manifest_layout(source)
    report["manifest_filename"] = manifest_name
    report["manifest_layout_error"] = error
    report["expected_status"] = expected_status(source)
    try:
        entries = sorted(ARTIFACTS.iterdir(), key=lambda p: p.name)
    except OSError:
        report["manifest_layout_error"] = "cannot_list_artifact_directory"
        return report
    report["entries_total"] = len(entries)
    sha_directories = []
    for candidate in entries:
        if not SHA.fullmatch(candidate.name) or candidate.is_symlink():
            continue
        if candidate.is_dir():
            sha_directories.append(candidate)
        elif candidate.is_file():
            report["sha_regular_file_count"] += 1
    report["sha_directory_count"] = len(sha_directories)
    if manifest_name is None:
        return report

    statuses, ports = Counter(), Counter()
    for directory in sha_directories[:MAX_ENTRIES]:
        manifest = directory / manifest_name
        if manifest.is_symlink() or not manifest.is_file():
            report["manifest_missing_count"] += 1
            continue
        report["manifest_present_count"] += 1
        try:
            if manifest.stat().st_size > MAX_MANIFEST_BYTES:
                report["manifest_invalid_count"] += 1
                continue
            obj = json.loads(manifest.read_text(encoding="utf-8"))
        except (OSError, ValueError, UnicodeError):
            report["manifest_invalid_count"] += 1
            continue
        if not isinstance(obj, dict):
            report["manifest_invalid_count"] += 1
            continue
        report["valid_manifest_count"] += 1
        status = obj.get("status")
        if not isinstance(status, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,40}", status):
            status = "<other>"
        port = obj.get("publicPort")
        if type(port) is not int or not 0 < port <= 65535:
            port = "<other>"
        statuses[str(status)] += 1
        ports[str(port)] += 1
        sha_matches = obj.get("applicationSha") == directory.name
        report["sha_field_matches_directory_count"] += int(sha_matches)
        if port == 3386:
            report["matching_public_port_3386_count"] += 1
            if len(report["matches_on_port_3386"]) < 15:
                report["matches_on_port_3386"].append({
                    "sha_prefix": directory.name[:12],
                    "status": status,
                    "sha_field_matches_directory": sha_matches,
                })
        if (port == 3386 and sha_matches and report["expected_status"]
                and status == report["expected_status"]):
            report["matching_port_status_and_sha_count"] += 1

    report["statuses"] = dict(statuses.most_common(15))
    report["public_ports"] = dict(ports.most_common(30))
    report["scanned_sha_directories"] = min(len(sha_directories), MAX_ENTRIES)
    report["note"] = ("No backup or deployment records were altered. A matching manifest is "
                      "not proof of database backup integrity or restorability. "
                      "If the manifest path cannot be parsed, no JSON files are opened.")
    return report


if __name__ == "__main__":
    print(json.dumps(audit(), indent=2))
