#!/usr/bin/env python3
"""Install the official Circle Card's static bio page on the Circle Card vhost."""

import argparse
import fcntl
import hashlib
import os
from pathlib import Path
import re
import subprocess
import tempfile


HOST = "circlecard.co.uk"
SITE = f"https://{HOST}"
VHOST = Path(f"/etc/nginx/sites-available/{HOST}")
ENABLED = Path(f"/etc/nginx/sites-enabled/{HOST}")
SNIPPET = Path("/etc/nginx/snippets/circle-card-official-spin.conf")
RELEASES = Path("/var/www/circle-card-official-spin")
INCLUDE = f"    include {SNIPPET};\n"
REPO = "https://raw.githubusercontent.com/TheBusinessCircle/The-Business-Circle.Net"
ASSETS = {"index.html": "/spin", "spin.css": "/spin-assets/spin.css", "spin.js": "/spin-assets/spin.js"}


def run(*args):
    return subprocess.run(args, check=True, capture_output=True).stdout


def fetch(url):
    return run("curl", "-fsS", "--retry", "2", "--max-time", "15", url)


def replace(path, content, mode):
    fd, name = tempfile.mkstemp(prefix=".circle-card-spin-", dir=path.parent)
    temp = Path(name)
    try:
        with os.fdopen(fd, "wb") as stream:
            os.fchmod(stream.fileno(), mode)
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp, path)
    finally:
        temp.unlink(missing_ok=True)


def nginx_config(release):
    return f'''# Circle Card official bio page
location = /spin {{
    alias {release}/index.html;
    default_type text/html;
    charset utf-8;
}}

location = /spin/ {{ return 308 /spin$is_args$args; }}

location = /spin-assets/spin.css {{
    alias {release}/spin.css;
    default_type text/css;
}}

location = /spin-assets/spin.js {{
    alias {release}/spin.js;
    default_type application/javascript;
}}
'''.encode()


def verify(assets):
    for name, route in ASSETS.items():
        if fetch(SITE + route) != assets[name]:
            raise ValueError(f"Production returned different bytes at {route}.")
    if not fetch(SITE + "/branding/circle-card-logo.jpg").startswith(b"\xff\xd8\xff"):
        raise ValueError("The production Circle Card logo did not return a JPEG.")
    for route in ("/", "/register", "/demo/business"):
        fetch(SITE + route)


def update_vhost(before, after, validate):
    mode = VHOST.stat().st_mode & 0o777
    if VHOST.read_bytes() != before:
        raise ValueError("The vhost changed while preparing the release. Retry after the other update.")
    replace(VHOST, after, mode)
    try:
        run("nginx", "-t")
        run("systemctl", "reload", "nginx")
        validate()
    except (Exception, KeyboardInterrupt):
        if VHOST.read_bytes() != after:
            raise RuntimeError("The vhost was edited during verification. Review it before reloading Nginx.")
        replace(VHOST, before, mode)
        run("nginx", "-t")
        run("systemctl", "reload", "nginx")
        raise


def install(ref, rollback):
    if VHOST.is_symlink() or ENABLED.resolve(strict=True) != VHOST:
        raise ValueError("The active Nginx configuration is not the expected Circle Card vhost.")
    before = VHOST.read_bytes()
    text = before.decode()
    names = re.findall(r"(?m)^\s*server_name\s+([^;]+);", text)
    if not names or any(HOST not in name.split() or set(name.split()) - {HOST, f"www.{HOST}"} for name in names):
        raise ValueError("Expected a vhost dedicated to Circle Card.")

    if rollback:
        if text.count(INCLUDE) == 0:
            print("The Circle Card bio page is already detached.")
            return
        if text.count(INCLUDE) != 1:
            raise ValueError("Found multiple bio page includes. Review the vhost manually.")
        update_vhost(before, text.replace(INCLUDE, "", 1).encode(), lambda: fetch(SITE + "/"))
        print("Removed the official bio page route.")
        return

    assets = {name: fetch(f"{REPO}/{ref}/ops/circle-card/official-spin/{name}") for name in ASSETS}
    digest = hashlib.sha256(b"\0".join(assets.values())).hexdigest()[:20]
    release = RELEASES / digest
    release.mkdir(mode=0o755, parents=True, exist_ok=True)
    for name, content in assets.items():
        replace(release / name, content, 0o644)

    snippet = nginx_config(release)
    if INCLUDE in text:
        if not SNIPPET.exists() or SNIPPET.read_bytes() != snippet:
            raise ValueError("Another version is active. Roll it back before installing this version.")
        verify(assets)
        print(f"Already live at {SITE}/spin")
        return

    anchors = list(re.finditer(r"(?m)^[ \t]+location[ \t]+/[ \t]*\{", text))
    if len(anchors) != 1 or re.search(r"(?m)^\s*location\s+[^\n{]*/spin(?:[/\s{]|-assets)", text):
        raise ValueError("The vhost has unexpected route declarations. Review it before installing.")

    SNIPPET.parent.mkdir(parents=True, exist_ok=True)
    replace(SNIPPET, snippet, 0o644)
    offset = anchors[0].start()
    after = (text[:offset] + INCLUDE + text[offset:]).encode()
    update_vhost(before, after, lambda: verify(assets))
    print(f"Verified live at {SITE}/spin")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--ref", help="The full GitHub commit SHA containing the published page assets.")
    action.add_argument("--rollback", action="store_true", help="Detach the bio page from the live vhost.")
    args = parser.parse_args()
    if os.geteuid() != 0:
        parser.error("Run on the Circle Card server as root.")
    if args.ref is not None and not re.fullmatch(r"[0-9a-f]{40}", args.ref):
        parser.error("--ref must be a full lowercase Git commit SHA.")
    os.umask(0o022)
    with Path("/run/lock/circle-card-official-spin.lock").open("w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        install(args.ref, args.rollback)


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        raise SystemExit(error.stderr.decode(errors="replace").strip() or str(error)) from error
    except (OSError, ValueError, RuntimeError) as error:
        raise SystemExit(str(error)) from error
