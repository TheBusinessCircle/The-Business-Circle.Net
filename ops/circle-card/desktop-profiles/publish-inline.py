#!/usr/bin/env python3
"""Publish the desktop profile CSS on Circle Card HTML using its existing style policy."""

import argparse
from email.parser import BytesHeaderParser
import fcntl
import hashlib
from html.parser import HTMLParser
import os
from pathlib import Path
import re
import subprocess
import tempfile
import time
from urllib.request import urlopen


HOST = "circlecard.co.uk"
VHOST = Path(f"/etc/nginx/sites-available/{HOST}")
ENABLED = Path(f"/etc/nginx/sites-enabled/{HOST}")
REPO = "https://raw.githubusercontent.com/TheBusinessCircle/The-Business-Circle.Net"
CSS_FILE = "ops/circle-card/desktop-profiles/public-profile-desktop-v2.css"
HEAD = "$circle_card_desktop_profile_head"
ENCODING = "$circle_card_desktop_profile_encoding"
DOCUMENTS = (
    "/", "/card/trevor-newton", "/card/trevor-newton-ss", "/card/hucknall-circle-hub",
    "/card/hucknall-circle-hub?reveal=spin",
)
MAIN_LOCATION = re.compile(r"(?m)^(?P<indent>[ \t]+)location / \{(?P<body>[\s\S]*?)^(?P=indent)\}")
ACCEPT_ENCODING = re.compile(r"(?mi)^(?P<line>[ \t]*proxy_set_header[ \t]+Accept-Encoding[ \t]+)(?P<value>[^;\n]+);")


class MetaPolicies(HTMLParser):
    def __init__(self):
        super().__init__()
        self.policies = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "meta" and (attributes.get("http-equiv") or "").lower() == "content-security-policy":
            self.policies.append(attributes.get("content") or "")


def run(*args):
    return subprocess.check_output(args, text=True, stderr=subprocess.STDOUT)


def atomic_replace(path, content):
    info = path.stat()
    fd, name = tempfile.mkstemp(prefix=".circle-card-desktop-", dir=path.parent)
    temp = Path(name)
    try:
        with os.fdopen(fd, "wb") as out:
            os.fchown(out.fileno(), info.st_uid, info.st_gid)
            os.fchmod(out.fileno(), info.st_mode & 0o777)
            out.write(content)
            out.flush()
            os.fsync(out.fileno())
        os.replace(temp, path)
    finally:
        temp.unlink(missing_ok=True)


def patch_nginx(source, style):
    if HEAD in source or ENCODING in source:
        raise ValueError("A desktop profile stylesheet filter is already configured.")
    locations = list(MAIN_LOCATION.finditer(source))
    if len(locations) != 1:
        raise ValueError("Could not identify one Circle Card application location.")

    main = locations[0]
    body = main["body"]
    indent = main["indent"]
    if re.search(r"(?m)^[ \t]*sub_filter(?:_|[ \t])", body):
        raise ValueError("The existing response filter needs review before adding the stylesheet.")

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

    replacement = (style + "</head>").replace("\\", "\\\\").replace("'", "\\'")
    body += f"{indent}    sub_filter {HEAD} '{replacement}';\n"

    maps = f'''# Include the profile CSS in HTML so client navigation can reuse it.
map "$request_method:$uri:$http_accept" {HEAD} {{
    default "";
    "~*^(GET|HEAD):[^:]*:.*text/html" "</head>";
    "~^(GET|HEAD):/card/[^/:]+/?:" "</head>";
}}
map {HEAD} {ENCODING} {{
    default {default_encoding};
    "</head>" "";
}}

'''
    return maps + source[:main.start()] + f"{indent}location / {{{body}{indent}}}" + source[main.end():]


def response(path):
    with tempfile.TemporaryDirectory(prefix="cc-desktop-probe-") as folder:
        body = Path(folder) / "body"
        headers = Path(folder) / "headers"
        status = run("curl", "-sS", "--compressed", "--max-time", "12",
                     "-H", "Cache-Control: no-cache", "-H", "Accept: text/html",
                     "--output", str(body), "--dump-header", str(headers), "--write-out", "%{http_code}",
                     f"https://{HOST}{path}").strip()
        blocks = [block for block in re.split(rb"\r?\n\r?\n", headers.read_bytes()) if block.startswith(b"HTTP/")]
        if status != "200" or not blocks:
            raise ValueError(f"Public verification failed at {path} (HTTP {status}).")
        fields = BytesHeaderParser().parsebytes(blocks[-1].partition(b"\n")[2])
        if fields.get_content_type() != "text/html":
            raise ValueError(f"Expected an HTML document at {path}.")
        return fields, body.read_bytes()


def check_style_policy(path, headers, content):
    meta = MetaPolicies()
    meta.feed(content.decode("utf-8", errors="replace"))
    for value in headers.get_all("Content-Security-Policy", []) + meta.policies:
        for policy in value.split(","):
            directives = {}
            for rule in policy.split(";"):
                tokens = rule.split()
                if tokens:
                    directives.setdefault(tokens[0].lower(), tokens[1:])
            for key in ("style-src-elem", "style-src", "default-src"):
                if key in directives:
                    sources = [source.lower() for source in directives[key]]
                    has_nonce_or_hash = any(source.startswith(("'nonce-", "'sha256-", "'sha384-", "'sha512-")) for source in sources)
                    if "'unsafe-inline'" not in sources or has_nonce_or_hash:
                        raise ValueError(f"The existing style policy blocks inline profile CSS at {path}.")
                    break


def verify_document(path, marker, style):
    headers, content = response(path)
    check_style_policy(path, headers, content)
    if content.count(marker) != 1 or style not in content:
        raise ValueError(f"The desktop stylesheet did not load at {path}.")


def verify(marker, style):
    # Nginx reload signals the master. A request may still hit an old worker during the handover.
    for attempt in range(6):
        try:
            verify_document(DOCUMENTS[0], marker, style)
            break
        except (ValueError, subprocess.CalledProcessError):
            if attempt == 5:
                raise
            time.sleep(1)
    for path in DOCUMENTS[1:]:
        verify_document(path, marker, style)
    _, standalone_spin = response("/spin")
    if marker in standalone_spin:
        raise ValueError("The profile stylesheet also reached the standalone spin page.")


def deploy(ref):
    if VHOST.is_symlink() or ENABLED.resolve(strict=True) != VHOST:
        raise ValueError("The active Circle Card Nginx path differs from the verified configuration.")

    with urlopen(f"{REPO}/{ref}/{CSS_FILE}", timeout=20) as upstream:
        css = upstream.read(100_001)
    if len(css) > 100_000 or b"--profile-desktop-gutter:" not in css or b"<" in css or b"$" in css:
        raise ValueError("The pinned desktop stylesheet could not be embedded safely.")
    version = hashlib.sha256(css).hexdigest()[:16]
    marker = f'<style id="circle-card-desktop-profiles-{version}">'
    style = marker + " ".join(css.decode("utf-8").splitlines()) + "</style>"
    before = VHOST.read_bytes()
    if marker.encode() in before:
        verify(marker.encode(), style.encode())
        print("DESKTOP PROFILES VERIFIED LIVE", flush=True)
        return

    for path in DOCUMENTS:
        check_style_policy(path, *response(path))
    print("The public pages allow the desktop stylesheet under their existing style policies.", flush=True)
    after = patch_nginx(before.decode("utf-8"), style).encode()
    if VHOST.read_bytes() != before:
        raise ValueError("The Circle Card proxy changed while preparing the desktop stylesheet.")
    atomic_replace(VHOST, after)

    try:
        run("nginx", "-t")
        run("systemctl", "reload", "nginx")
        verify(marker.encode(), style.encode())
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
