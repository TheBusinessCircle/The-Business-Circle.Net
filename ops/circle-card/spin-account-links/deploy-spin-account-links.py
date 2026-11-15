#!/usr/bin/env python3
"""Versioned, reversible account-navigation fix for the standalone Circle Card /spin page.

Only changes a new copy of index.html, spin.css, and spin.js and the dedicated
Nginx snippet. Never builds Next.js, restarts app processes, or touches user data.
"""

import argparse
import hashlib
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

BASE = Path("/var/www/circle-card-official-spin/b61506e84683369c617d")
ROOT = BASE.parent
SNIPPET = Path("/etc/nginx/snippets/circle-card-official-spin.conf")
FILES = ("index.html", "spin.css", "spin.js")

INTRO_OLD = (
    '<a class="start-link" href="https://circlecard.co.uk/register">'
    'Create your free Circle Card <span aria-hidden="true">→</span></a>'
)
INTRO_NEW = '''<nav class="spin-account-links" aria-label="Circle Card account">
        <a class="start-link" data-spin-guest href="/register">Create your free Circle Card <span aria-hidden="true">→</span></a>
        <a class="start-link" data-spin-guest href="/login">Sign in <span aria-hidden="true">→</span></a>
        <a class="start-link" data-spin-member href="/profile" hidden>Go to my profile <span aria-hidden="true">→</span></a>
        <a class="start-link" data-spin-member href="/dashboard" hidden>My dashboard <span aria-hidden="true">→</span></a>
      </nav>'''
REVEAL_OLD = (
    '<a class="card-primary" href="https://circlecard.co.uk/register">'
    'Create my free card <span aria-hidden="true">→</span></a>'
)
REVEAL_NEW = '''<nav class="spin-reveal-account-links" aria-label="Circle Card account">
            <a class="card-primary" data-spin-guest href="/register">Create my free card <span aria-hidden="true">→</span></a>
            <a class="card-primary spin-secondary" data-spin-guest href="/login">Sign in <span aria-hidden="true">→</span></a>
            <a class="card-primary" data-spin-member href="/profile" hidden>Go to my profile <span aria-hidden="true">→</span></a>
            <a class="card-primary spin-secondary" data-spin-member href="/dashboard" hidden>My dashboard <span aria-hidden="true">→</span></a>
          </nav>'''

CSS_ADDITION = """
/* Standalone /spin account links: preserve all original spin/reveal styling. */
.spin-account-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: .35rem 1.25rem;
  margin-inline: auto;
}
.spin-reveal-account-links {
  display: grid;
  gap: .55rem;
}
.spin-reveal-account-links a.spin-secondary {
  background: transparent;
  color: var(--gold);
  border: 1px solid rgba(232, 191, 107, .52);
}
.spin-reveal-account-links a.spin-secondary:hover {
  background: rgba(232, 191, 107, .10);
}
.spin-account-links [hidden],
.spin-reveal-account-links [hidden] {
  display: none !important;
}
"""

JS_ADDITION = """
// Only the account calls-to-action change; spin animation and gestures stay untouched.
// Auth.js/NextAuth returns a user object only for an authenticated session.
async function refreshSpinAccountLinks() {
  try {
    const response = await fetch('/api/auth/session', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return; // Stay on guest links if the session endpoint is unavailable.
    const session = await response.json();
    if (!session || typeof session !== 'object' || !session.user) return;

    document.querySelectorAll('[data-spin-guest]').forEach((link) => {
      link.hidden = true;
    });
    document.querySelectorAll('[data-spin-member]').forEach((link) => {
      link.hidden = false;
    });
  } catch {
    // No login information available: keep Create Free Card and Sign In.
  }
}
void refreshSpinAccountLinks();
"""


def require_once(text, old, name):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Refusing unexpected {name}: found {count} matches (expected one).")
    return text


def run(*args):
    return subprocess.check_output(args, text=True, stderr=subprocess.STDOUT)


def atomic_write(path, data, mode=0o644):
    if path.is_symlink():
        raise RuntimeError(f"Refusing symlink: {path}")
    fd, name = tempfile.mkstemp(dir=path.parent, prefix=".spin-account-links-")
    tmp = Path(name)
    try:
        with os.fdopen(fd, "wb") as stream:
            os.fchmod(stream.fileno(), mode)
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(tmp, path)
    finally:
        tmp.unlink(missing_ok=True)


def build_files():
    for filename in FILES:
        if not (BASE / filename).is_file() or (BASE / filename).is_symlink():
            raise RuntimeError(f"Original Spin file missing or unsafe: {filename}")
    index = (BASE / "index.html").read_text(encoding="utf-8")
    css = (BASE / "spin.css").read_text(encoding="utf-8")
    js = (BASE / "spin.js").read_text(encoding="utf-8")

    require_once(index, INTRO_OLD, "pre-spin create link")
    require_once(index, REVEAL_OLD, "reveal create link")
    require_once(index, "form-action 'none'", "Spin Content Security Policy")
    if "connect-src" in index:
        raise RuntimeError("Spin Content Security Policy already has connect-src; review it first.")
    index = index.replace(INTRO_OLD, INTRO_NEW)
    index = index.replace(REVEAL_OLD, REVEAL_NEW)
    index = index.replace("form-action 'none'", "connect-src 'self'; form-action 'none'")

    require_once(js, "coinButton.hidden = false;", "original spin script")
    if "refreshSpinAccountLinks" in js:
        raise RuntimeError("Existing Spin JS already contains an account-link handler.")
    css = css.rstrip() + "\n" + CSS_ADDITION
    js = js.rstrip() + "\n" + JS_ADDITION

    if index.count("data-spin-guest") != 4 or index.count("data-spin-member") != 4:
        raise RuntimeError("Expected four guest and four member actions.")
    return {"index.html": index.encode(), "spin.css": css.encode(), "spin.js": js.encode()}


def local_probe(path):
    url = f"https://circlecard.co.uk{path}"
    return subprocess.check_output([
        "curl", "-fsSk", "--max-time", "15", "--compressed",
        "--resolve", "circlecard.co.uk:443:127.0.0.1", url,
    ])


def verify(files):
    for name, uri in (
        ("index.html", "/spin"),
        ("spin.css", "/spin-assets/spin.css"),
        ("spin.js", "/spin-assets/spin.js"),
    ):
        response = local_probe(uri)
        if response != files[name]:
            raise RuntimeError(f"Origin verification mismatch for {uri}.")
    print("VERIFIED: Origin serves the exact new HTML, CSS and JavaScript.", flush=True)


def reload_nginx():
    run("nginx", "-t")
    run("systemctl", "reload", "nginx")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Install the versioned Spin navigation fix.")
    parser.add_argument("--rollback", action="store_true", help="Restore the pre-change Spin Nginx snippet.")
    args = parser.parse_args()
    if args.apply == args.rollback:
        parser.error("Choose exactly one of --apply or --rollback.")
    if os.geteuid() != 0:
        raise RuntimeError("This deployment script requires root on the Circle Card server.")
    if SNIPPET.is_symlink() or ROOT.is_symlink():
        raise RuntimeError("Unexpected symlink in the live Spin configuration.")
    files = build_files()
    digest = hashlib.sha256(b"\0".join(files[name] for name in FILES)).hexdigest()[:16]
    target = ROOT / digest
    backup = target / "previous-snippet.conf"
    old = SNIPPET.read_bytes()
    original_dir = str(BASE).encode()
    destination_dir = str(target).encode()

    if args.rollback:
        if not backup.is_file() or backup.is_symlink():
            raise RuntimeError("No saved Spin configuration available for rollback.")
        if old.count(destination_dir) != 3:
            raise RuntimeError("The current Spin configuration differs; refusing rollback.")
        saved = backup.read_bytes()
        if saved.count(original_dir) != 3:
            raise RuntimeError("Unexpected rollback configuration.")
        atomic_write(SNIPPET, saved)
        try:
            reload_nginx()
            original = {name: (BASE / name).read_bytes() for name in FILES}
            verify(original)
        except Exception:
            atomic_write(SNIPPET, old)
            reload_nginx()
            raise
        print("ROLLED BACK: Original Spin page restored.", flush=True)
        return

    if old.count(destination_dir) == 3:
        verify(files)
        print("ALREADY DEPLOYED: Spin account links are present.", flush=True)
        return
    if old.count(original_dir) != 3:
        raise RuntimeError("Live Spin configuration changed; refusing to override it.")
    if shutil.disk_usage(ROOT).free < 10 * 1024 * 1024:
        raise RuntimeError("Insufficient free disk space for even a small Spin release.")
    if target.exists():
        if not target.is_dir() or target.is_symlink():
            raise RuntimeError("Unexpected versioned destination.")
        if any(not (target / name).is_file() or (target / name).read_bytes() != files[name] for name in FILES):
            raise RuntimeError("Versioned destination exists with different content.")
        if not backup.is_file() or backup.read_bytes() != old:
            raise RuntimeError("Versioned destination has an unexpected rollback snapshot.")
    else:
        target.mkdir(mode=0o755)
        for name, data in files.items():
            atomic_write(target / name, data)
        atomic_write(backup, old, 0o600)

    node = shutil.which("node")
    if node:
        run(node, "--check", str(target / "spin.js"))
        print("VERIFIED: Spin JavaScript syntax.", flush=True)
    else:
        print("WARNING: node unavailable; JavaScript syntax check skipped.", flush=True)

    updated = old.replace(original_dir, destination_dir)
    if updated.count(destination_dir) != 3:
        raise RuntimeError("Unexpected Nginx replacement count.")
    if SNIPPET.read_bytes() != old:
        raise RuntimeError("Spin configuration changed during preparation.")
    atomic_write(SNIPPET, updated)
    try:
        reload_nginx()
        verify(files)
    except Exception as error:
        if SNIPPET.read_bytes() == updated:
            atomic_write(SNIPPET, old)
            reload_nginx()
            print("AUTOMATIC ROLLBACK: Reinstated the original Spin configuration.", flush=True)
        raise RuntimeError(f"Deployment checks failed: {error}") from error

    print("DEPLOYED: /spin now has guest Sign In and signed-in Profile/Dashboard links.", flush=True)
    print("Guest buttons remain visible if the session API is unavailable.", flush=True)
    print("Unchanged: Spin animation, reveal card, accounts, billing and Next.js app.", flush=True)


if __name__ == "__main__":
    main()
