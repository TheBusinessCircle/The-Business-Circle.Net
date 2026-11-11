#!/usr/bin/env python3
"""Reversibly disable precisely identified, ALREADY stopped old Circle Card units.

Does NOT stop/start live services, remove releases, edit Nginx or touch data.
Dry-run by default, --apply changes only old units' boot enablement.
"""
from __future__ import annotations
import argparse
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import sys

SOURCE = Path(__file__).with_name("retire-legacy-services.py")
spec = importlib.util.spec_from_file_location("circle_card_retirement", SOURCE)
if spec is None or spec.loader is None:
    raise SystemExit("Cannot load the pinned service inventory")
retirement = importlib.util.module_from_spec(spec)
spec.loader.exec_module(retirement)


def state(unit: str) -> dict[str, str]:
    props = retirement.execute([
        "systemctl", "show", unit, "--no-pager",
        "--property=ActiveState,UnitFileState,WorkingDirectory,RequiredBy,PartOf,TriggeredBy,BoundBy,UpheldBy"
    ])
    return dict(line.split("=", 1) for line in props.splitlines() if "=" in line)


def verify_old_inactive() -> list[str]:
    retirement.guard(*retirement.LIVE)
    for name, port in retirement.PRESERVE.items():
        retirement.guard(name, port)
    retirement.verify_nginx()
    retirement.verify_http()
    listeners = retirement.execute(["ss", "-H", "-lntp"])
    to_disable = []
    for name, port in retirement.OLD.items():
        props = state(name)
        if props.get("ActiveState") != "inactive":
            raise RuntimeError(f"Refusing to disable {name}: not inactive")
        if props.get("WorkingDirectory") != retirement.expected_release(name):
            raise RuntimeError(f"Refusing to disable {name}: unexpected release directory")
        if props.get("UnitFileState") not in {"enabled", "disabled"}:
            raise RuntimeError(f"Refusing to disable {name}: unknown enablement state")
        for key in ("RequiredBy", "PartOf", "TriggeredBy", "BoundBy", "UpheldBy"):
            if props.get(key, "").strip():
                raise RuntimeError(f"Refusing to disable {name}: dependency {key}")
        if re.search(rf":{port}(?!\d)", listeners):
            raise RuntimeError(f"Refusing to disable {name}: old port {port} still listening")
        if props["UnitFileState"] == "enabled":
            to_disable.append(name)
    return to_disable


def apply() -> None:
    changes = []
    try:
        candidates = verify_old_inactive()
        for name in candidates:
            if name not in verify_old_inactive():
                raise RuntimeError(f"Service enablement changed during check: {name}")
            retirement.execute(["systemctl", "disable", name], timeout=25)
            changes.append(name)
            if state(name).get("UnitFileState") != "disabled":
                raise RuntimeError(f"Failed to disable {name}")
            retirement.guard(*retirement.LIVE)
            retirement.verify_http()
        print(json.dumps({
            "result": "OLD_SERVICES_DISABLED_FOR_FUTURE_BOOTS",
            "disabled": changes,
            "public_site_healthy": True,
            "preserved_live": retirement.LIVE[0],
            "preserved_rollbacks": list(retirement.PRESERVE),
            "release_directories_deleted": False,
            "database_changed": False,
            "running_services_stopped": False,
        }, indent=2))
    except BaseException:
        failures = []
        for name in reversed(changes):
            try:
                retirement.execute(["systemctl", "enable", name], timeout=25)
            except Exception:
                failures.append(name)
        print(json.dumps({
            "result": "RE_ENABLE_ATTEMPTED_ON_FAILURE",
            "reenabled": [n for n in changes if n not in failures],
            "failed_to_reenable": failures
        }, indent=2))
        raise


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if args.apply:
        apply()
    else:
        candidates = verify_old_inactive()
        print(json.dumps({
            "result": "READY_TO_DISABLE_STOPPED_OLD_SERVICES",
            "old_units": list(retirement.OLD),
            "currently_enabled_old_units": candidates,
            "no_changes_made": True
        }, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError, subprocess.TimeoutExpired) as exc:
        print(json.dumps({"result": "ABORTED", "reason": str(exc)}))
        sys.exit(1)
