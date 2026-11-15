#!/usr/bin/env python3
"""Build and roll out the desktop profile stylesheet beside the running app."""

import argparse
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import types
from urllib.request import urlopen


REPO = "https://raw.githubusercontent.com/TheBusinessCircle/The-Business-Circle.Net"
OPERATIONS = "ops/circle-card/desktop-profiles"
RUNTIME_HELPER_REF = "11ebca05e43150903e4995a9fca23cb62ad0a9cb"
RUNTIME_HELPER_SHA = "dc9f01716549f100b9c8d1e0d5246711a22cf7d19c65698920427ff086a6cfa1"
OLD_STATIC = "circle_card_member_spin_static_current"
NEW_STATIC = "circle_card_desktop_profile_static_current"
FALLBACK = "@circle_card_spin_static_before_desktop"
CSS_MARKER = "--profile-desktop-gutter:"
LIVE_RELEASE = "circle-card-member-spin-reveal-20261115-153508"


def fetch(ref, path):
    with urlopen(f"{REPO}/{ref}/{path}", timeout=20) as response:
        content = response.read(100_001)
    if not content or len(content) > 100_000:
        raise ValueError(f"Invalid release file: {path}")
    return content


def load_activation():
    source = fetch(RUNTIME_HELPER_REF, "ops/circle-card/member-spin-reveal/activate-r2.py")
    if hashlib.sha256(source).hexdigest() != RUNTIME_HELPER_SHA:
        raise ValueError("The verified activation script checksum differs.")
    runtime = types.ModuleType("circle_card_release_activation")
    exec(compile(source, "circle-card-activation.py", "exec"), vars(runtime))
    return runtime


def routing(runtime, text, port):
    output, count = runtime.PROXY.subn(lambda match: f"{match[1]}{port}{match[3]}", text)
    if count != 1 or any(marker in output for marker in (NEW_STATIC, FALLBACK)):
        raise ValueError("Circle Card routing changed since the desktop release was prepared.")
    routes = list(runtime.STATIC.finditer(output))
    if len(routes) != 1:
        raise ValueError("Expected one public static-asset route.")
    current = routes[0]
    body = current["body"]
    if body.count(f"proxy_pass http://{OLD_STATIC};") != 1:
        raise ValueError("The current static upstream differs from the verified Spin Reveal release.")
    if body.count("error_page 404 = @circle_card_pre_spin_static;") != 1:
        raise ValueError("The current static fallback differs from the verified Spin Reveal release.")
    new_body = body.replace(f"proxy_pass http://{OLD_STATIC};", f"proxy_pass http://{NEW_STATIC};")
    new_body = new_body.replace("error_page 404 = @circle_card_pre_spin_static;", f"error_page 404 = {FALLBACK};")
    indent = current["indent"]
    routes = f"{indent}location ^~ /_next/static/ {{{new_body}{indent}}}\n\n{indent}location {FALLBACK} {{{body}{indent}}}"
    return (f"upstream {NEW_STATIC} {{\n    server 127.0.0.1:{port};\n}}\n\n" +
            output[:current.start()] + routes + output[current.end():])


def prepare(runtime, live, css):
    config = runtime.EXPECTED_VHOST.read_text(encoding="utf-8")
    ports = runtime.PROXY.findall(config)
    if len(ports) != 1:
        raise ValueError("Expected one running Circle Card backend.")
    current_port = int(ports[0][1])
    _, _, _, pid = runtime.discover(live, current_port)
    routing(runtime, config, current_port)
    old_dist = runtime.build_directory(live, require_spin=True)
    footprint = int(runtime.run("du", "-sb", str(old_dist)).split()[0])
    free = shutil.disk_usage(runtime.RELEASES).free
    if free < footprint + 512 * 1024 ** 2:
        raise ValueError(f"The server has {free // 1024 ** 2} MiB free. The previous build uses {footprint // 1024 ** 2} MiB, and more disk space is needed before starting a new build.")
    available = next(int(line.split()[1]) // 1024 for line in Path("/proc/meminfo").read_text().splitlines() if line.startswith("MemAvailable:"))
    heap = min(3072, available - 1024)
    if heap < 2048:
        raise ValueError("More available memory is needed to build beside the live Circle Card service.")

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    candidate = runtime.RELEASES / f"circle-card-desktop-profiles-{stamp}"
    state = Path("/var/lib/circle-card-desktop-profiles") / stamp
    candidate.mkdir(mode=0o755)
    info = live.stat()
    os.chown(candidate, info.st_uid, info.st_gid)
    candidate.chmod(info.st_mode & 0o777)
    state.mkdir(parents=True, mode=0o700)
    print(f"Preparing {candidate}. Current Circle Card traffic stays on port {current_port}.", flush=True)
    for entry in live.iterdir():
        if entry.name in {".next", ".runtime", ".circle-card-nginx-assets", ".git"}:
            continue
        copy = ["cp", "-a"]
        if entry.name in {"node_modules", "public"}:
            copy.append("-l")
        else:
            copy.append("--reflink=auto")
        subprocess.run([*copy, str(entry), str(candidate / entry.name)], check=True)

    css_path = candidate / "src/app/globals.css"
    if not css_path.resolve(strict=True).is_relative_to(candidate) or css_path.is_symlink():
        raise ValueError("The profile stylesheet path escapes the isolated release.")
    original = css_path.read_text(encoding="utf-8")
    if CSS_MARKER in original:
        raise ValueError("The desktop profile stylesheet is already present in the source.")
    css_path.write_text(f"{original.rstrip()}\n\n{css.strip()}\n", encoding="utf-8")

    env = dict(os.environ)
    for entry in Path(f"/proc/{pid}/environ").read_bytes().split(b"\0"):
        if b"=" in entry:
            key, value = entry.split(b"=", 1)
            env[os.fsdecode(key)] = os.fsdecode(value)
    for key in ("NOTIFY_SOCKET", "JOURNAL_STREAM", "INVOCATION_ID", "LISTEN_PID", "LISTEN_FDS",
                "LISTEN_FDNAMES", "WATCHDOG_PID", "WATCHDOG_USEC"):
        env.pop(key, None)
    for key, value in env.items():
        if value.startswith(str(live) + "/"):
            env[key] = str(candidate) + value[len(str(live)):]
    options = re.sub(r"--max[-_]old[-_]space[-_]size(?:=|\s+)\d+", "", env.get("NODE_OPTIONS", "")).strip()
    env.update(PWD=str(candidate), NODE_ENV="production", NEXT_TELEMETRY_DISABLED="1",
               NODE_OPTIONS=f"{options} --max-old-space-size={heap}".strip())
    build = json.loads((candidate / "package.json").read_text(encoding="utf-8"))["scripts"]["build"]
    if not re.fullmatch(r"next build(?:\s+&&\s+node scripts/verify-circle-card-action-build\.mjs)?", build):
        raise ValueError("The release has an unexpected build command.")
    build_log = state / "build.log"
    print(f"Building the desktop update. Build log: {build_log}", flush=True)
    with build_log.open("w", encoding="utf-8") as log:
        try:
            subprocess.run(["npm", "run", "build"], cwd=candidate, env=env, stdout=log, stderr=subprocess.STDOUT, check=True)
        except subprocess.CalledProcessError as error:
            raise ValueError(f"The desktop build failed. See {build_log}.") from error

    dist = runtime.build_directory(candidate, require_spin=True)
    styles = [path for path in (dist / "static").rglob("*.css") if CSS_MARKER in path.read_text(encoding="utf-8")]
    if not styles:
        raise ValueError(f"The compiled build did not contain the desktop layout. See {build_log}.")
    stylesheet = f"/_next/static/{styles[0].relative_to(dist / 'static').as_posix()}"
    print(f"BUILD VERIFIED: {candidate}", flush=True)
    return candidate, stylesheet


def deploy(ref):
    runtime = load_activation()
    css = fetch(ref, f"{OPERATIONS}/public-profile-desktop.css").decode("utf-8")
    if CSS_MARKER not in css:
        raise ValueError("The release stylesheet is missing the desktop profile declarations.")
    live = (runtime.RELEASES / LIVE_RELEASE).resolve(strict=True)
    if live.parent != runtime.RELEASES:
        raise ValueError("The previous release path is outside the server's release directory.")
    candidate, stylesheet = prepare(runtime, live, css)
    existing_public_probe = runtime.public

    def verify_public(route, marker):
        existing_public_probe(route, marker)
        if route == "/login":
            existing_public_probe(stylesheet, CSS_MARKER)

    runtime.change_nginx = lambda text, port: routing(runtime, text, port)
    runtime.ACTIVATION_ATTEMPT = "desktop"
    runtime.public = verify_public
    runtime.activate(live, candidate)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ref", required=True, help="Full Git commit containing the desktop stylesheet")
    args = parser.parse_args()
    if os.geteuid() != 0 or not re.fullmatch(r"[0-9a-f]{40}", args.ref):
        parser.error("Run as root with the full pinned Git commit.")
    try:
        with Path("/run/lock/circle-card-member-spin-reveal-activate.lock").open("w") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            deploy(args.ref)
    except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError) as error:
        raise SystemExit(str(error)) from error
