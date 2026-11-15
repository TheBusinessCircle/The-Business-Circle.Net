#!/usr/bin/env python3
"""Apply the Spin Reveal overlay to an isolated Circle Card source candidate."""

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
from urllib.request import urlopen


SHARE = "src/app/(member)/app/share/page.tsx"
CARD = "src/app/(public)/card/[slug]/page.tsx"
PUBLIC = "src/server/circle-card/public-card.service.ts"
FILES = (
    "src/lib/circle-card/spin-reveal.ts",
    "src/actions/circle-card-spin-reveal.actions.ts",
    "src/components/circle-card/circle-card-spin-reveal.tsx",
    "src/components/circle-card/circle-card-spin-reveal.module.css",
    "src/components/circle-card/circle-card-spin-reveal-setting.tsx",
)
REPO = "https://raw.githubusercontent.com/TheBusinessCircle/The-Business-Circle.Net"
RELEASES = Path("/var/www/releases")
VHOST = Path("/etc/nginx/sites-enabled/circlecard.co.uk")


def load_payload(ref):
    payload = {}
    for relative in FILES:
        url = f"{REPO}/{ref}/ops/circle-card/member-spin-reveal/{relative}"
        with urlopen(url, timeout=20) as response:
            payload[relative] = response.read(100_001).decode("utf-8")
        if not payload[relative].strip() or len(payload[relative]) > 100_000:
            raise ValueError(f"Invalid Spin Reveal source: {relative}")
    return payload


def replace_once(source, pattern, replacement, label):
    result, count = re.subn(pattern, lambda match: replacement(match), source)
    if count != 1:
        raise ValueError(f"Expected one {label} in the Circle Card source, found {count}.")
    return result


def patch_share(source):
    if "<CircleCardSpinRevealSetting" in source:
        return source
    def add_workspace_data(match):
        fields = [field.strip() for field in match[1].split(",") if field.strip()]
        if not {"card", "session"}.issubset(fields):
            raise ValueError("The Share workspace loader no longer exposes the selected card and session.")
        fields.extend(field for field in ("access", "readOnly") if field not in fields)
        return "{" + ", ".join(fields) + "}"

    source = replace_once(source, r"\{([\w,\s]+)\}(?=\s*=\s*await\s+loadCircleWorkspace\()",
                          add_workspace_data, "Share workspace loader")
    return '''import { CircleCardSpinRevealSetting } from "@/components/circle-card/circle-card-spin-reveal-setting";
import { isCircleCardSpinRevealEnabled } from "@/lib/circle-card/spin-reveal";
''' + replace_once(source, r'(?=<nav aria-label="More sharing tools")', lambda _: '''
    {getRuntimeBrand().key === "circle-card" && access.hasProAccess && !readOnly && card.userId === session.user.id ? (
      <CircleCardSpinRevealSetting
        key={card.id}
        cardId={card.id}
        publicUrl={url}
        enabled={isCircleCardSpinRevealEnabled(card.contentBlocks)}
      />
    ) : null}
    ''', "Share tools section")


def patch_card(source):
    if "<CircleCardSpinReveal" in source:
        return source
    _, delimiter, page = source.partition("export default async function PublicCircleCardPage")
    if not delimiter:
        raise ValueError("Public Circle Card page function is missing.")
    params = re.search(r"\bconst\s+(\w+)\s*=\s*await\s+searchParams\b", page)
    if not params:
        raise ValueError("Public Circle Card search parameter loader is missing.")
    prefix = source[:len(source) - len(page)]
    return '''import { CircleCardSpinReveal } from "@/components/circle-card/circle-card-spin-reveal";
import { getCircleCardSpinRevealDestination } from "@/lib/circle-card/spin-reveal";
''' + prefix + replace_once(page, r"if\s*\(!card\)\s*\{\s*notFound\(\);?\s*\}", lambda match: match[0] + '''

  const spinRevealDestination = getCircleCardSpinRevealDestination(
    card.slug,
    PARAMS_NAME,
    getRuntimeBrand().key === "circle-card" && card.spinRevealEnabled === true
  );
  if (spinRevealDestination) {
    return (
      <CircleCardSpinReveal
        name={card.fullName}
        imageUrl={card.profileLayout === "BUSINESS"
          ? card.businessLogoUrl || card.profileImageUrl
          : card.profileImageUrl || card.businessLogoUrl}
        destination={spinRevealDestination}
      />
    );
  }
'''.replace("PARAMS_NAME", params[1]), "published-card check")


def patch_public(source):
    if "spinRevealEnabled: circleCardAccess.hasProAccess" in source:
        return source
    source = replace_once(source, r"(export type PublicCircleCard = \{)",
                          lambda match: match[0] + "\n  spinRevealEnabled?: boolean;", "public-card type")
    return 'import { isCircleCardSpinRevealEnabled } from "@/lib/circle-card/spin-reveal";\n' + replace_once(
        source, r"(?m)^(\s*)\.\.\.publicCard,", lambda m: m[0] + m[1] +
        "spinRevealEnabled: circleCardAccess.hasProAccess && isCircleCardSpinRevealEnabled(contentBlocks),",
        "public-card projection"
    )


def safe_target(root, relative):
    path = root / relative
    if path.is_symlink() or not path.resolve().is_relative_to(root):
        raise ValueError(f"Source escapes the candidate directory: {relative}")
    return path


def apply_overlay(root, payload):
    root = root.resolve(strict=True)
    transforms = {SHARE: patch_share, CARD: patch_card, PUBLIC: patch_public}
    changed = {}
    for relative, transform in transforms.items():
        target = safe_target(root, relative)
        changed[target] = transform(target.read_text(encoding="utf-8"))

    for relative, content in payload.items():
        target = safe_target(root, relative)
        if target.exists() and target.read_text(encoding="utf-8") != content:
            raise ValueError(f"A different Spin Reveal file already exists: {relative}")
        changed[target] = content

    for target, content in changed.items():
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8", newline="\n")


def running_services():
    services = subprocess.check_output([
        "systemctl", "list-units", "--type=service", "--state=running", "--no-legend", "--plain"
    ], text=True)
    return [line.split()[0] for line in services.splitlines() if line.strip()]


def service_property(unit, name):
    return subprocess.check_output(["systemctl", "show", unit, f"--property={name}", "--value"], text=True).strip()


def require_inactive(root):
    for unit in running_services():
        working = service_property(unit, "WorkingDirectory")
        if working and Path(working).resolve().is_relative_to(root):
            raise ValueError(f"The candidate is in use by {unit}.")


def current_release():
    text = VHOST.read_text(encoding="utf-8")
    ports = re.findall(r"(?m)^\s*proxy_pass\s+http://127\.0\.0\.1:(\d+)\s*;", text)
    if len(ports) != 1:
        raise ValueError("Could not identify a single live Circle Card proxy.")
    matches = []
    for unit in running_services():
        if not re.fullmatch(r"circle-card-[A-Za-z0-9_.-]+\.service", unit):
            continue
        directory = Path(service_property(unit, "WorkingDirectory")).resolve()
        if directory.parent != RELEASES or not directory.is_dir() or not directory.name.startswith("circle-card-"):
            continue
        match = re.search(r"/opt/thebusinesscircle/circle-card-launchers/[^\s\"';]+/launch\.mjs",
                          service_property(unit, "ExecStart"))
        if not match:
            continue
        launcher = Path(match[0]).read_text(encoding="utf-8")
        if f"PORT:'{ports[0]}'" not in launcher or str(directory) not in launcher:
            continue
        pid = int(service_property(unit, "MainPID"))
        if pid > 1 and Path(f"/proc/{pid}/cwd").resolve(strict=True) == directory:
            matches.append((directory, pid))
    if len(matches) != 1:
        raise ValueError("Could not identify the active Circle Card release.")
    return matches[0]


def prepare_candidate(payload):
    live, pid = current_release()
    available_mib = next(int(line.split()[1]) // 1024 for line in Path("/proc/meminfo").read_text().splitlines() if line.startswith("MemAvailable:"))
    heap = min(3072, available_mib - 1024)
    if heap < 2048:
        raise ValueError("The server has too little available memory to build beside the live app.")
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    candidate = RELEASES / f"circle-card-member-spin-reveal-{timestamp}"
    log_dir = Path(f"/var/lib/circle-card-member-spin-reveal/{timestamp}")
    for relative, transform in ((SHARE, patch_share), (CARD, patch_card), (PUBLIC, patch_public)):
        transform(safe_target(live, relative).read_text(encoding="utf-8"))
    log_dir.mkdir(mode=0o700, parents=True)
    candidate.mkdir(mode=0o755)
    print(f"Copying {live} into an isolated candidate.", flush=True)
    subprocess.run(["cp", "-a", "--reflink=auto", str(live) + "/.", str(candidate)], check=True)
    apply_overlay(candidate, payload)

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
    dist = env.get("NEXT_RUNTIME_DIST_DIR", ".runtime/circle-card")
    if dist not in (".next", ".runtime/circle-card", str(candidate / ".runtime/circle-card")):
        raise ValueError("The live runtime has an unexpected build directory.")
    env.update(PWD=str(candidate), NODE_ENV="production", NEXT_TELEMETRY_DISABLED="1")
    options = re.sub(r"--max[-_]old[-_]space[-_]size(?:=|\s+)\d+", "", env.get("NODE_OPTIONS", "")).strip()
    env["NODE_OPTIONS"] = f"{options} --max-old-space-size={heap}".strip()
    for relative in (".next", ".runtime/circle-card"):
        path = candidate / relative
        if not path.parent.resolve().is_relative_to(candidate):
            raise ValueError(f"Build output escapes the candidate: {relative}")
        if path.is_symlink():
            path.unlink()
        elif path.is_dir():
            shutil.rmtree(path)
    build = json.loads((candidate / "package.json").read_text(encoding="utf-8"))["scripts"]["build"]
    if not re.fullmatch(r"next build(?:\s+&&\s+node scripts/verify-circle-card-action-build\.mjs)?", build):
        raise ValueError("The release has an unexpected build command.")
    log_path = log_dir / "build.log"
    print(f"Building {candidate}. The current service is still serving traffic.", flush=True)
    with log_path.open("w", encoding="utf-8") as log:
        subprocess.run(["npm", "run", "build"], cwd=candidate, env=env, stdout=log, stderr=subprocess.STDOUT, check=True)
    outputs = [candidate / ".runtime/circle-card", candidate / ".next"]
    for output in outputs:
        manifest = output / "server/server-reference-manifest.json"
        if manifest.is_file() and "setCircleCardSpinRevealAction" in manifest.read_text(encoding="utf-8"):
            print(f"BUILD VERIFIED: {candidate}\nBuild log: {log_path}")
            return
    raise ValueError(f"The build did not register the Spin Reveal action. Build log: {log_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    target = parser.add_mutually_exclusive_group(required=True)
    target.add_argument("candidate", type=Path, nargs="?")
    target.add_argument("--prepare-current", action="store_true", help="Copy and build the current live release in isolation")
    parser.add_argument("--ref", required=True, help="Full Git commit containing the overlay source")
    args = parser.parse_args()
    if not re.fullmatch(r"[0-9a-f]{40}", args.ref):
        parser.error("--ref must be a full lowercase Git commit SHA.")
    try:
        if args.prepare_current:
            prepare_candidate(load_payload(args.ref))
        else:
            candidate = args.candidate.resolve(strict=True)
            if candidate.parent != RELEASES or not candidate.name.startswith("circle-card-"):
                parser.error("Pass an isolated Circle Card candidate in /var/www/releases.")
            require_inactive(candidate)
            apply_overlay(candidate, load_payload(args.ref))
            print("Spin Reveal source staged. Build and verify the candidate before changing the live service.")
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        raise SystemExit(str(error)) from error
