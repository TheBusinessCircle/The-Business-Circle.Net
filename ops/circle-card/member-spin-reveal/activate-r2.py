#!/usr/bin/env python3
"""Start and verify the built Spin Reveal release, then switch Circle Card traffic."""

import argparse
import fcntl
from functools import partial
import http.client
import json
import os
from pathlib import Path
import pwd
import re
import socket
import subprocess
import tempfile
import time


HOST = "circlecard.co.uk"
ACTIVE_VHOST = Path(f"/etc/nginx/sites-enabled/{HOST}")
EXPECTED_VHOST = Path(f"/etc/nginx/sites-available/{HOST}")
RELEASES = Path("/var/www/releases")
LAUNCHERS = Path("/opt/thebusinesscircle/circle-card-launchers")
SYSTEMD = Path("/etc/systemd/system")
BACKUP = Path("/opt/circle-card-native-db-backup/native-db-backup.py")
TIMER = "circle-card-native-db-backup.timer"
PROXY = re.compile(r"(?m)^(\s*proxy_pass\s+http://127\.0\.0\.1:)(\d+)(\s*;)")
STATIC = re.compile(r"(?m)^(?P<indent>[ \t]+)location \^~ /_next/static/ \{(?P<body>[\s\S]*?)^(?P=indent)\}")
STATIC_FALLBACK = "@circle_card_pre_spin_static"
STATIC_UPSTREAM = "circle_card_member_spin_static_current"
ACTIVATION_ATTEMPT = "r2"


def run(*args):
    return subprocess.check_output(args, text=True, stderr=subprocess.STDOUT).strip()


def prop(unit, field):
    return run("systemctl", "show", unit, f"--property={field}", "--value")


def replace(path, data, mode=None):
    owner = path.stat() if path.exists() else None
    if mode is None:
        mode = owner.st_mode & 0o777
    fd, name = tempfile.mkstemp(prefix=".circle-card-spin-", dir=path.parent)
    temp = Path(name)
    try:
        with os.fdopen(fd, "wb") as stream:
            if owner is not None:
                os.fchown(stream.fileno(), owner.st_uid, owner.st_gid)
            os.fchmod(stream.fileno(), mode)
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        temp.replace(path)
    finally:
        temp.unlink(missing_ok=True)


def discover(live, proxy_port):
    units = run("systemctl", "list-units", "--type=service", "--state=running", "--plain", "--no-legend", "circle-card-*.service")
    candidates = []
    for line in units.splitlines():
        unit = line.split()[0]
        if prop(unit, "WorkingDirectory") != str(live):
            continue
        launcher_match = re.search(r"/opt/thebusinesscircle/circle-card-launchers/[^\s\"';]+/launch\.mjs", prop(unit, "ExecStart"))
        if launcher_match is None:
            continue
        launcher = Path(launcher_match[0])
        text = launcher.read_text(encoding="utf-8")
        if f"PORT:'{proxy_port}'" in text and str(live) in text:
            candidates.append((unit, launcher, text))
    if len(candidates) != 1:
        raise ValueError("Could not match one active service to the verified release and proxy.")
    unit, launcher, text = candidates[0]
    if prop(unit, "User") != "circle-card-app" or prop(unit, "DropInPaths"):
        raise ValueError("The current Circle Card runtime user or service overrides require review.")
    pid = int(prop(unit, "MainPID"))
    if pid < 2 or Path(f"/proc/{pid}/cwd").resolve(strict=True) != live:
        raise ValueError("The existing service working directory could not be verified.")
    return unit, launcher, text, pid


def next_port(port):
    for other in range(port + 1, min(port + 24, 65536)):
        try:
            with socket.socket() as probe:
                probe.bind(("127.0.0.1", other))
            return other
        except OSError:
            continue
    raise ValueError("Could not reserve a candidate port.")


def build_directory(root, require_spin=False):
    for path in (root / ".runtime/circle-card", root / ".next"):
        if not path.resolve().is_relative_to(root) or not (path / "BUILD_ID").is_file():
            continue
        if require_spin:
            manifest = path / "server/server-reference-manifest.json"
            if not manifest.is_file() or "setCircleCardSpinRevealAction" not in manifest.read_text(encoding="utf-8"):
                continue
        if (path / "static").is_dir():
            return path
    raise ValueError(f"Could not find a complete build under {root}.")


def origin(port, route, statuses, marker=None):
    conn = http.client.HTTPConnection("127.0.0.1", port, timeout=10)
    try:
        conn.request("GET", route, headers={"Host": HOST, "X-Forwarded-Proto": "https"})
        result = conn.getresponse()
        data = result.read()
        if result.status not in statuses or (marker is not None and marker not in data):
            raise ValueError(f"Candidate health check failed at {route} (HTTP {result.status}).")
        return result.getheader("Location", "")
    finally:
        conn.close()


def public(route, marker):
    with tempfile.TemporaryDirectory(prefix="circle-card-spin-probe-") as scratch:
        body = Path(scratch) / "response"
        status = run("curl", "-sS", "--max-time", "12", "--retry", "1", "--output", str(body),
                     "--write-out", "%{http_code}", f"https://{HOST}{route}")
        if status != "200" or marker.encode() not in body.read_bytes():
            raise ValueError(f"Public verification failed at {route} (HTTP {status}).")


def health(port, build_id):
    probe = partial(origin, port)
    probe("/", {200}, b"Circle Card")
    probe("/login", {200}, b"Circle Card")
    probe("/resources", {200}, b"Circle Card")
    probe("/demo/business", {200})
    probe("/card/demo?reveal=spin", {200})
    probe("/card/hucknall-circle-hub", {200}, b"Hucknall")
    if "/login" not in probe("/app/share", {302, 303, 307, 308}):
        raise ValueError("Share must redirect signed-out visitors to login.")
    probe(f"/_next/static/{build_id}/_buildManifest.js", {200}, b"__BUILD_MANIFEST")


def change_nginx(text, port):
    output, count = PROXY.subn(lambda found: f"{found[1]}{port}{found[3]}", text)
    if count != 1:
        raise ValueError("Expected one Circle Card proxy target.")
    routes = list(STATIC.finditer(output))
    if len(routes) != 1 or STATIC_FALLBACK in output or STATIC_UPSTREAM in output:
        raise ValueError("Expected one existing Circle Card static-asset route.")
    route = routes[0]
    if "proxy_pass http://circle_card_live_demos_static_current;" not in route["body"]:
        raise ValueError("The existing Circle Card static-asset upstream differs from the staged release.")
    indent = route["indent"]
    new_routes = f'''{indent}location ^~ /_next/static/ {{
{indent}    proxy_pass http://{STATIC_UPSTREAM};
{indent}    proxy_http_version 1.1;
{indent}    proxy_set_header Host $host;
{indent}    proxy_set_header X-Forwarded-Proto $scheme;
{indent}    proxy_intercept_errors on;
{indent}    recursive_error_pages on;
{indent}    error_page 404 = {STATIC_FALLBACK};
{indent}}}

{indent}location {STATIC_FALLBACK} {{{route["body"]}{indent}}}'''
    upstream = f"upstream {STATIC_UPSTREAM} {{\n    server 127.0.0.1:{port};\n}}\n\n"
    return upstream + output[:route.start()] + new_routes + output[route.end():]


def change_backup(text, live, stage, old_port, new_port, old_unit, new_unit):
    text = text.replace(str(live), str(stage)).replace(old_unit, new_unit)
    text = re.sub(r"(?<![\w.])" + str(old_port) + r"(?![\w.])", str(new_port), text)
    compile(text, str(BACKUP), "exec")
    return text


def activate(live, stage):
    if ACTIVE_VHOST.resolve(strict=True) != EXPECTED_VHOST or not BACKUP.is_file() or BACKUP.is_symlink():
        raise ValueError("The live Circle Card Nginx or backup configuration needs review.")
    run("nginx", "-t")
    run("systemctl", "is-active", TIMER)
    original = EXPECTED_VHOST.read_bytes()
    source = original.decode("utf-8")
    targets = PROXY.findall(source)
    if len(targets) != 1 or "circle-card-official-spin.conf" not in source:
        raise ValueError("Expected a single Circle Card backend and the official /spin route.")
    old_port = int(targets[0][1])
    unit, launcher, launch_text, pid = discover(live, old_port)
    port = next_port(old_port)
    old_dist = build_directory(live)
    dist = build_directory(stage, require_spin=True)
    if old_dist.relative_to(live) != dist.relative_to(stage):
        raise ValueError("The candidate and current runtime use different build directories.")
    ids = tuple((root / "BUILD_ID").read_text().strip() for root in (old_dist, dist))
    if any(not re.fullmatch(r"[A-Za-z0-9_-]+", value) for value in ids) or ids[0] == ids[1]:
        raise ValueError("The old and candidate build IDs must be distinct and valid.")
    stamp = stage.name.removeprefix("circle-card-member-spin-reveal-")
    state = Path("/var/lib/circle-card-member-spin-reveal") / stamp
    unit_file = Path(prop(unit, "FragmentPath"))
    unit_text = unit_file.read_text(encoding="utf-8")
    new_unit = f"{stage.name}-{ACTIVATION_ATTEMPT}.service"
    new_unit_file = SYSTEMD / new_unit
    new_launcher = LAUNCHERS / f"{stage.name}-{ACTIVATION_ATTEMPT}" / "launch.mjs"
    for token in (str(live), str(launcher), "User=circle-card-app"):
        if token not in unit_text:
            raise ValueError("The existing Circle Card unit layout needs review.")
    before_port = (f"'-p','{old_port}'", f"PORT:'{old_port}'")
    after_port = (f"'-p','{port}'", f"PORT:'{port}'")
    for before, after in zip(before_port, after_port):
        if launch_text.count(before) != 1:
            raise ValueError("The current Circle Card launcher does not have the expected port markers.")
        launch_text = launch_text.replace(before, after)
    if new_unit_file.exists() or new_launcher.exists():
        raise ValueError("This candidate was already prepared for activation. Review its service state.")

    backup_original = BACKUP.read_bytes()
    backup_candidate = change_backup(backup_original.decode("utf-8"), live, stage, old_port, port, unit, new_unit).encode()
    edited = change_nginx(source, port).encode()
    account = pwd.getpwnam("circle-card-app")
    for folder in (dist / "cache", dist / "cache/images"):
        if folder.is_symlink() or not folder.resolve().is_relative_to(stage):
            raise ValueError("Candidate cache path escapes its own release.")
        if folder.exists():
            os.chown(folder, account.pw_uid, account.pw_gid)

    state.mkdir(mode=0o700, parents=True, exist_ok=True)
    replace(state / "nginx.before", original, 0o600)
    replace(state / "backup.before", backup_original, 0o600)
    new_launcher.parent.mkdir(mode=0o755)
    replace(new_launcher, launch_text.replace(str(live), str(stage)).encode(), 0o644)
    run("node", "--check", str(new_launcher))
    unit_text = unit_text.replace(str(live), str(stage)).replace(str(launcher), str(new_launcher))
    if re.search(r"(?m)^\s*(PIDFile|ExecStop)\s*=\s*\S", unit_text):
        raise ValueError("Custom process handling requires review before activation.")
    env_file = state / "runtime-port.env"
    replace(env_file, f"PORT={port}\nHOSTNAME=127.0.0.1\n".encode(), 0o600)
    unit_text += f"\n[Service]\nEnvironmentFile={env_file}\n"
    replace(new_unit_file, unit_text.encode(), 0o644)

    switched = False
    backup_changed = False
    try:
        print(f"Starting the candidate on loopback port {port}.", flush=True)
        run("systemctl", "daemon-reload")
        run("systemctl", "start", new_unit)
        deadline = time.monotonic() + 45
        while True:
            try:
                origin(port, "/login", {200})
                break
            except (OSError, http.client.HTTPException, ValueError):
                if time.monotonic() >= deadline:
                    raise
                time.sleep(1)
        health(port, ids[1])
        origin(old_port, f"/_next/static/{ids[0]}/_buildManifest.js", {200}, b"__BUILD_MANIFEST")
        if EXPECTED_VHOST.read_bytes() != original or BACKUP.read_bytes() != backup_original or int(prop(unit, "MainPID")) != pid:
            raise ValueError("The live service or configuration changed while testing the candidate.")
        print("Candidate health checks passed. Switching Circle Card traffic.", flush=True)
        replace(EXPECTED_VHOST, edited)
        switched = True
        run("nginx", "-t")
        if backup_candidate != backup_original:
            replace(BACKUP, backup_candidate)
            backup_changed = True
        run("systemctl", "reload", "nginx")
        public("/spin", "Give it a spin")
        public("/login", "Circle Card")
        for identifier in ids:
            public(f"/_next/static/{identifier}/_buildManifest.js?release-check={stamp}-{ACTIVATION_ATTEMPT}", "__BUILD_MANIFEST")
        run("systemctl", "is-active", TIMER)
        run("systemctl", "enable", new_unit)
        replace(state / "activated.json", json.dumps({"candidate": str(stage), "service": new_unit,
                "previous_service": unit, "previous_port": old_port, "port": port}, indent=2).encode(), 0o600)
        print(f"LIVE VERIFIED: {stage}\nPro setting: https://{HOST}/app/share")
    except (Exception, KeyboardInterrupt):
        if backup_changed and BACKUP.read_bytes() == backup_candidate:
            replace(BACKUP, backup_original)
        if switched:
            if EXPECTED_VHOST.read_bytes() != edited:
                raise RuntimeError("Other Nginx edits appeared during rollout. Review before stopping the candidate.")
            replace(EXPECTED_VHOST, original)
            run("nginx", "-t")
            run("systemctl", "reload", "nginx")
        subprocess.run(["systemctl", "disable", "--now", new_unit], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"The previous Circle Card service is still serving traffic. Candidate logs: journalctl -u {new_unit} --no-pager -n 25", flush=True)
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--previous", required=True, type=Path)
    parser.add_argument("--candidate", required=True, type=Path)
    args = parser.parse_args()
    if os.geteuid() != 0:
        parser.error("Run on the Circle Card server in the root SSH session.")
    previous = args.previous.resolve(strict=True)
    candidate = args.candidate.resolve(strict=True)
    if previous.parent != RELEASES or candidate.parent != RELEASES or previous == candidate or not re.fullmatch(r"circle-card-member-spin-reveal-\d{8}-\d{6}", candidate.name):
        parser.error("Expected the active Circle Card release and the verified Spin Reveal candidate.")
    with Path("/run/lock/circle-card-member-spin-reveal-activate.lock").open("w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        activate(previous, candidate)


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError) as error:
        raise SystemExit(str(error)) from error
