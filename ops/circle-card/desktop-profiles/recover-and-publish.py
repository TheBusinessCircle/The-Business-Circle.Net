#!/usr/bin/env python3
"""Recover failed build output and serve desktop profile CSS from the live vhost."""

import argparse
import fcntl
import hashlib
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
from urllib.request import urlopen


HOST = "circlecard.co.uk"
ENABLED = Path(f"/etc/nginx/sites-enabled/{HOST}")
VHOST = Path(f"/etc/nginx/sites-available/{HOST}")
RELEASES = Path("/var/www/releases")
CSS_ROOT = Path("/var/www/circle-card-desktop-profiles")
REPO = "https://raw.githubusercontent.com/TheBusinessCircle/The-Business-Circle.Net"
OPERATIONS = "ops/circle-card/desktop-profiles"
HEAD = "$circle_card_desktop_profile_head"
ENCODING = "$circle_card_desktop_profile_encoding"
CSS_MARKER = b"--profile-desktop-gutter:"
FAILED_RELEASES = (
    "circle-card-desktop-profiles-20261115-163135",
    "circle-card-desktop-profiles-20261115-164428",
)
MAIN_LOCATION = re.compile(r"(?m)^(?P<indent>[ \t]+)location / \{(?P<body>[\s\S]*?)^(?P=indent)\}")
ACCEPT_ENCODING = re.compile(r"(?mi)^(?P<line>[ \t]*proxy_set_header[ \t]+Accept-Encoding[ \t]+)(?P<value>[^;\n]+);")


def run(*args):
    return subprocess.check_output(args, text=True, stderr=subprocess.STDOUT)


def atomic_replace(path, content, mode=None):
    info = path.stat() if path.exists() else None
    fd, name = tempfile.mkstemp(prefix=".circle-card-desktop-", dir=path.parent)
    temp = Path(name)
    try:
        with os.fdopen(fd, "wb") as out:
            if info is not None:
                os.fchown(out.fileno(), info.st_uid, info.st_gid)
            os.fchmod(out.fileno(), mode if mode is not None else info.st_mode & 0o777)
            out.write(content)
            out.flush()
            os.fsync(out.fileno())
        os.replace(temp, path)
    finally:
        temp.unlink(missing_ok=True)


def cleanup_failed_builds(active_config):
    roots = []
    for name in FAILED_RELEASES:
        root = RELEASES / name
        if root.is_symlink() or root.resolve() != root or root.is_mount():
            raise ValueError(f"Unexpected failed candidate path: {root}")
        if str(root) in active_config:
            raise ValueError(f"Nginx still references {root}, so its build was left intact.")
        if root.is_dir():
            roots.append(root)

    for proc in Path("/proc").glob("[0-9]*/cwd"):
        try:
            directory = proc.readlink()
        except OSError:
            continue
        if any(directory.is_relative_to(root) for root in roots):
            raise ValueError(f"A process still uses a failed candidate ({directory}).")

    before = shutil.disk_usage(RELEASES).free
    targets = []
    for root in roots:
        for subpath in (".runtime/circle-card", ".next"):
            target = root / subpath
            if not target.exists() and not target.is_symlink():
                continue
            if not target.parent.resolve().is_relative_to(root) or target.is_mount():
                raise ValueError(f"Unexpected build output path: {target}")
            targets.append(target)

    for target in targets:
        if target.is_symlink():
            target.unlink()
        elif target.is_dir() and target.resolve() == target:
            shutil.rmtree(target)
        else:
            raise ValueError(f"Unexpected build output type: {target}")

    free = shutil.disk_usage(RELEASES).free
    print(f"Recovered {max(0, free - before) // 1024**2} MiB from the failed builds. Free space: {free // 1024**2} MiB.", flush=True)


def patch_nginx(source, url, css_path):
    if HEAD in source or ENCODING in source:
        raise ValueError("A desktop profile stylesheet filter is already configured.")
    locations = list(MAIN_LOCATION.finditer(source))
    if len(locations) != 1:
        raise ValueError("Could not identify one Circle Card application location.")

    main = locations[0]
    body = main["body"]
    indent = main["indent"]
    if re.search(r"(?m)^[ \t]*sub_filter(?:_|[ \t])", body):
        raise ValueError("The existing profile response filter needs review before adding the stylesheet.")

    headers = list(ACCEPT_ENCODING.finditer(body))
    if len(headers) > 1:
        raise ValueError("Existing upstream compression configuration needs review.")
    if headers:
        header = headers[0]
        default_encoding = header["value"].strip()
        body = body[:header.start()] + f"{header['line']}{ENCODING};" + body[header.end():]
    else:
        default_encoding = "$http_accept_encoding"
        if not re.search(r"(?m)^[ \t]*proxy_set_header[ \t]+\S+", body) and not re.search(
            r"(?m)^[ \t]*include[ \t]+(?:/etc/nginx/)?proxy_params[ \t]*;", body
        ):
            raise ValueError("Cannot safely extend inherited upstream request headers.")
        body += f"{indent}    proxy_set_header Accept-Encoding {ENCODING};\n"

    body += f"{indent}    sub_filter {HEAD} '<link rel=\"stylesheet\" href=\"{url}\"></head>';\n"

    maps = f'''# Desktop stylesheet is added only to public profile HTML responses.
map "$request_method:$uri" {HEAD} {{
    default "";
    ~^(GET|HEAD):/card/[^/]+/?$ "</head>";
}}
map {HEAD} {ENCODING} {{
    default {default_encoding};
    "</head>" "";
}}

'''
    asset = f'''{indent}location = {url} {{
{indent}    alias {css_path};
{indent}    default_type text/css;
{indent}    expires 1y;
{indent}}}

'''
    return (maps + source[:main.start()] + asset + f"{indent}location / {{{body}{indent}}}" + source[main.end():])


def response(path):
    with tempfile.TemporaryDirectory(prefix="cc-desktop-probe-") as folder:
        body = Path(folder) / "body"
        meta = run("curl", "-sS", "--compressed", "--max-time", "15", "--retry", "1",
                   "-H", "Cache-Control: no-cache", "--output", str(body), "--write-out",
                   "%{http_code} %{content_type}", f"https://{HOST}{path}").strip()
        status, _, media = meta.partition(" ")
        if status != "200":
            raise ValueError(f"Public verification failed at {path} (HTTP {status}).")
        return media, body.read_bytes()


def verify(url, css):
    media, content = response(url)
    if not media.lower().startswith("text/css") or content != css:
        raise ValueError("The public stylesheet response did not match the verified release.")
    marker = f'<link rel="stylesheet" href="{url}">'.encode()
    for path in ("/card/trevor-newton", "/card/trevor-newton-ss", "/card/hucknall-circle-hub",
                 "/card/hucknall-circle-hub?reveal=spin"):
        media, content = response(path)
        if not media.lower().startswith("text/html") or content.count(marker) != 1:
            raise ValueError(f"The desktop stylesheet did not load at {path}.")

    for path in ("/", "/spin"):
        _, content = response(path)
        if marker in content:
            raise ValueError(f"The profile stylesheet also reached {path}.")


def deploy(ref):
    if VHOST.is_symlink() or ENABLED.resolve(strict=True) != VHOST:
        raise ValueError("The active Circle Card Nginx path differs from the verified configuration.")
    # Includes and process working directories identify releases that may still be serving traffic.
    cleanup_failed_builds(run("nginx", "-T"))

    with urlopen(f"{REPO}/{ref}/{OPERATIONS}/public-profile-desktop-v2.css", timeout=20) as upstream:
        css = upstream.read(100_001)
    if len(css) > 100_000 or CSS_MARKER not in css:
        raise ValueError("The pinned desktop stylesheet was incomplete.")
    version = hashlib.sha256(css).hexdigest()[:16]
    url = f"/circle-card-desktop-profiles-{version}.css"
    css_path = CSS_ROOT / f"{version}.css"
    before = VHOST.read_bytes()
    if url.encode() in before:
        verify(url, css)
        print("DESKTOP PROFILES VERIFIED LIVE", flush=True)
        return

    after = patch_nginx(before.decode("utf-8"), url, css_path).encode()
    if CSS_ROOT.is_symlink() or css_path.is_symlink():
        raise ValueError("The stylesheet path differs from the expected public assets directory.")
    CSS_ROOT.mkdir(mode=0o755, parents=True, exist_ok=True)
    atomic_replace(css_path, css, 0o644)
    if VHOST.read_bytes() != before:
        raise ValueError("The Circle Card proxy changed while preparing the desktop stylesheet.")
    atomic_replace(VHOST, after)

    try:
        run("nginx", "-t")
        run("systemctl", "reload", "nginx")
        verify(url, css)
    except (OSError, ValueError, subprocess.CalledProcessError, KeyboardInterrupt):
        if VHOST.read_bytes() != after:
            raise RuntimeError("The proxy was edited during verification. Review the active configuration.")
        atomic_replace(VHOST, before)
        run("nginx", "-t")
        run("systemctl", "reload", "nginx")
        print("Restored the previous Nginx configuration.", flush=True)
        raise

    print("DESKTOP PROFILES VERIFIED LIVE", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ref", required=True, help="Full Git commit containing the desktop stylesheet")
    args = parser.parse_args()
    if os.geteuid() != 0 or not re.fullmatch(r"[0-9a-f]{40}", args.ref):
        parser.error("Run as root with a pinned Git commit.")
    try:
        with Path("/run/lock/circle-card-member-spin-reveal-activate.lock").open("w") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            deploy(args.ref)
    except subprocess.CalledProcessError as error:
        raise SystemExit((error.stdout or str(error)).strip()) from error
    except (OSError, ValueError, RuntimeError) as error:
        raise SystemExit(str(error)) from error
