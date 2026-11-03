#!/usr/bin/env python3
"""Clone the identified live release, build the scoped preview, and switch only after health checks."""
import argparse
import datetime
import http.client
import io
import json
import os
from pathlib import Path
import pwd
import re
import shutil
import socket
import subprocess
import sys
import tarfile
import time
import urllib.request

LIVE = None
LIVE_UNIT = None
NGINX = Path('/etc/nginx/sites-enabled/circlecard.co.uk')
OLD_PORT, NEW_PORT = None, None
PAGE = Path('src/app/(member)/app/prepared/[preparedId]/preview/page.tsx')
PAYLOAD_FILES = {
    "src/components/circle-card/hucknall-circle-hub.tsx",
    "src/components/circle-card/hucknall-hub-draft-preview.tsx",
    "src/components/circle-card/hucknall-public-hub.tsx",
    "src/components/circle-card/hucknall-about.tsx",
    "src/lib/circle-card/local-hubs.ts",
    "src/lib/circle-card/hucknall-content.ts",
    "src/lib/circle-card/privacy.ts",
    "src/server/circle-card/local-hub.service.ts",
    "src/actions/hucknall-hub.actions.ts",
    "src/app/(public)/card/hucknall-circle-hub/page.tsx",
    "src/app/(public)/card/hucknall-circle-hub/about/page.tsx",
    "src/app/(public)/card/hucknall-circle-hub/join/page.tsx",
    "src/app/(public)/card/hucknall-circle-hub/sitemap.xml/route.ts",
    "ops/circle-card/hucknall-hub/native-patches.py",
    "ops/circle-card/hucknall-hub/prepare-native-stage.py",
    "ops/circle-card/hucknall-hub/activate-native-hub.mjs",
    "prisma/migrations/20261102233000_circle_card_local_business_hubs/migration.sql",
}
DRAFT_ID = 'cmvzwzm3y000amkahigz25s8r'
DRAFT_SLUG = 'hucknall-circle-hub-40f0517a277b'
REPO = 'TheBusinessCircle/The-Business-Circle.Net'


def run(args, **kwargs):
    return subprocess.run(args, check=True, text=True, **kwargs)


def property_value(name):
    return subprocess.check_output(['systemctl', 'show', LIVE_UNIT, '--value', '-p', name], text=True).strip()


def rewrite_unit(text, old_root, new_root, override_file):
    if re.search(r'^\s*(?:PIDFile|ExecStop)\s*=\s*\S', text, re.M):
        raise RuntimeError('This unit has custom process/stop handling; review is required before cloning it.')
    if f'WorkingDirectory={old_root}' not in text:
        raise RuntimeError('Service working directory does not match the identified release.')
    text = text.replace(old_root, new_root)
    lines = []
    for line in text.splitlines():
        if re.match(r'\s*ExecStart\s*=', line):
            line = re.sub(rf'(?<!\d){OLD_PORT}(?!\d)', str(NEW_PORT), line)
        elif re.match(r'\s*Environment\s*=', line):
            line = re.sub(rf'(?<!\w)PORT={OLD_PORT}(?=["\s]|$)', f'PORT={NEW_PORT}', line)
        lines.append(line)
    return '\n'.join(lines) + f'\n\n[Service]\nEnvironmentFile={override_file}\n'


def rewrite_nginx(text, old_root, new_root):
    pattern = rf'(?m)^(\s*proxy_pass\s+)http://127\.0\.0\.1:{OLD_PORT}(\s*;)' 
    if len(re.findall(pattern, text)) != 1:
        raise RuntimeError(f'Expected exactly one live Circle Card proxy target on port {OLD_PORT}.')
    result = re.sub(pattern, lambda match: f'{match.group(1)}http://127.0.0.1:{NEW_PORT}{match.group(2)}', text)
    # Keep any release-specific static aliases pointed at the matching build.
    result = result.replace(old_root, new_root)
    for match in list(re.finditer(r'(?m)^(\s*(?:alias|root)\s+)([^;\s]+)(\s*;)', result)):
        raw = match.group(2)
        if '$' in raw:
            raise RuntimeError('Variable-based Nginx asset paths require explicit review.')
        resolved = str(Path(raw).resolve())
        if resolved == old_root or resolved.startswith(old_root + '/'):
            mapped = new_root + resolved[len(old_root):]
            result = result.replace(match.group(0), match.group(1) + mapped + match.group(3))
    return result


def allowed_payload(name):
    return name in PAYLOAD_FILES


def build_heap_mib(available_kib):
    available_mib = available_kib // 1024
    # Keep the existing 1 GiB allowance for native overhead and memory fluctuations.
    for heap_mib in (3072, 2560):
        if available_mib >= heap_mib + 1024:
            return heap_mib
    raise RuntimeError(f'Build requires at least 3584 MiB available RAM; currently {available_mib} MiB. Live site unchanged.')


def patch_prepared_preview(source):
    marker = 'const row = await getOwnedPreparedCard(preparedId);'
    if source.count(marker) != 1:
        raise RuntimeError('Expected one existing authenticated owned-card lookup.')
    if 'HucknallHubDraftPreview' in source:
        raise RuntimeError('A Hucknall preview is already installed; inspect it instead of reinstalling.')
    guard = (
        "\n  if (row.id === '" + DRAFT_ID + "' && row.slug === '" + DRAFT_SLUG +
        "') return <HucknallHubDraftPreview />;"
    )
    return (
        'import { HucknallHubDraftPreview } from "@/components/circle-card/hucknall-hub-draft-preview";\n'
        + source.replace(marker, marker + guard)
    )


def discover_live(config):
    ports = set(re.findall(r'proxy_pass\s+http://127\.0\.0\.1:(\d+)\s*;', config))
    if len(ports) != 1:
        raise RuntimeError('Expected one Circle Card loopback proxy port.')
    port = int(next(iter(ports)))
    rows = subprocess.check_output(
        ['systemctl', 'list-units', '--type=service', '--state=running', '--no-legend', '--plain'],
        text=True
    ).splitlines()
    matches = []
    for row in rows:
        unit = row.split()[0] if row.split() else ''
        if not re.fullmatch(r'circle-card-[A-Za-z0-9_.-]+\.service', unit):
            continue
        info = {}
        for field in ['WorkingDirectory', 'MainPID', 'FragmentPath', 'DropInPaths']:
            info[field] = subprocess.check_output(
                ['systemctl', 'show', unit, '--value', '-p', field], text=True
            ).strip()
        root = Path(info['WorkingDirectory'])
        if not str(root).startswith('/var/www/releases/circle-card-') or not root.is_dir():
            continue
        if not info['MainPID'].isdigit() or int(info['MainPID']) < 2:
            continue
        if (Path('/proc') / info['MainPID'] / 'cwd').resolve() != root.resolve():
            continue
        unit_source = Path(info['FragmentPath']).read_text()
        launcher = re.findall(r'/opt/thebusinesscircle/circle-card-launchers/[^\s"\']+/launch\.mjs', unit_source)
        if len(set(launcher)) != 1:
            continue
        source = Path(launcher[0]).read_text()
        port_marker = f"PORT:'{port}'"
        if port_marker not in source or str(root) not in source:
            continue
        if info['DropInPaths']:
            raise RuntimeError('Active service has overrides; inspect before deploying.')
        matches.append((root, unit))
    if len(matches) != 1:
        raise RuntimeError('Could not identify exactly one release serving the Circle Card proxy.')
    for candidate in range(port + 1, port + 30):
        if candidate > 65535:
            break
        try:
            with socket.socket() as probe:
                probe.bind(('127.0.0.1', candidate))
            return matches[0][0], matches[0][1], port, candidate
        except OSError:
            pass
    raise RuntimeError('No free loopback preview port was found.')


def redact(text, environment):
    for key, value in environment.items():
        if re.search(r'secret|password|token|database_url|api_key|credential', key, re.I) and len(value) >= 6:
            text = text.replace(value, '[redacted]')
    return text


def health(path, expected):
    conn = http.client.HTTPConnection('127.0.0.1', NEW_PORT, timeout=15)
    try:
        conn.request('GET', path, headers={'Host': 'circlecard.co.uk', 'X-Forwarded-Proto': 'https'})
        response = conn.getresponse()
        data = response.read()
        if response.status not in expected:
            raise RuntimeError(f'Health check {path}: HTTP {response.status}')
        return response, data
    finally:
        conn.close()


def prepare_launcher(unit_text, stage):
    paths = re.findall(r'/opt/thebusinesscircle/circle-card-launchers/[^\s"\']+/launch\.mjs', unit_text)
    if len(set(paths)) != 1:
        raise RuntimeError('Expected one protected Circle Card launcher.')
    original = Path(paths[0])
    if str(original) not in unit_text:
        raise RuntimeError('The source service uses an unrecognised launcher; live site unchanged.')
    source = original.read_text()
    required = ["process.getuid()===0", "process.env.USER!=='circle-card-app'", "process.env.LOGNAME!=='circle-card-app'", 'realpathSync(process.cwd())!==', 'readEnvironmentJson', 'validateProtectedStandaloneBilling']
    for token in required:
        if token not in source:
            raise RuntimeError('The expected protected launcher checks changed.')
    updated = source.replace(str(LIVE), str(stage))
    for old, new in [(f"'-p','{OLD_PORT}'", f"'-p','{NEW_PORT}'"), (f"PORT:'{OLD_PORT}'", f"PORT:'{NEW_PORT}'")]:
        if updated.count(old) != 1:
            raise RuntimeError('The launcher port configuration changed; live site unchanged.')
        updated = updated.replace(old, new)
    # Retain every user, environment and billing certification check. Only the
    # exact cloned release path and its loopback port change in this new launcher.
    return original, updated, unit_text


def compiled_preview(stage):
    route = '/(member)/app/prepared/[preparedId]/preview/page'
    for relative in ['.runtime/circle-card', '.next']:
        dist_dir = stage / relative
        manifest = dist_dir / 'server/app-paths-manifest.json'
        if not manifest.is_file():
            continue
        entry = json.loads(manifest.read_text()).get(route)
        if not isinstance(entry, str):
            continue
        compiled = dist_dir / 'server' / entry
        if not compiled.resolve().is_relative_to(dist_dir.resolve()):
            raise RuntimeError('Compiled preview path is outside its build directory.')
        if compiled.is_file() and (dist_dir / 'BUILD_ID').is_file():
            return dist_dir
    raise RuntimeError('The compiled prepared preview is missing from the build manifests; live site unchanged.')


def main():
    global LIVE, LIVE_UNIT, OLD_PORT, NEW_PORT
    parser = argparse.ArgumentParser()
    parser.add_argument('--ref', required=True)
    parser.add_argument('--resume-existing', type=Path, help='Verify and deploy an already completed staged build')
    args = parser.parse_args()
    if not re.fullmatch(r'[0-9a-f]{40}', args.ref):
        raise RuntimeError('A pinned 40-character Git commit is required.')
    if os.geteuid() != 0:
        raise RuntimeError('Run in the existing root SSH session.')
    original_config = NGINX.resolve()
    original_text = original_config.read_text()
    LIVE, LIVE_UNIT, OLD_PORT, NEW_PORT = discover_live(original_text)
    # Validate the proxy even before creating a build.
    rewrite_nginx(original_text, str(LIVE), '/var/www/releases/circle-card-hucknall-validation')
    if property_value('WorkingDirectory') != str(LIVE) or property_value('ActiveState') != 'active':
        raise RuntimeError('The active service changed; no deployment was attempted.')
    if property_value('DropInPaths'):
        raise RuntimeError('The running service has drop-in overrides; its effective configuration needs review.')
    pid = int(property_value('MainPID'))
    if (Path('/proc') / str(pid) / 'cwd').resolve() != LIVE:
        raise RuntimeError('The live process is not running from the expected release.')
    source_page = (LIVE / PAGE).read_text()
    for required in ['getOwnedPreparedCard(preparedId)', 'buildPreparedCardPreview(row,plan)', 'contactDownloadHref']:
        if required not in re.sub(r'\s+', '', source_page):
            raise RuntimeError('The prepared-preview source changed; no deployment was attempted.')
    route_bytes = source_page.encode('utf-8')  # Preserve the existing private draft route.
    available_kib = next(int(line.split()[1]) for line in Path('/proc/meminfo').read_text().splitlines() if line.startswith('MemAvailable:'))
    heap_mib = 2560 if args.resume_existing else build_heap_mib(available_kib)
    print(f'Build memory budget: Node heap {heap_mib} MiB; available RAM {available_kib // 1024} MiB.', flush=True)
    with socket.socket() as probe:
        probe.bind(('127.0.0.1', NEW_PORT))
    env = dict(os.environ)
    raw = (Path('/proc') / str(pid) / 'environ').read_bytes()
    for entry in raw.split(b'\0'):
        if b'=' in entry:
            key, value = entry.split(b'=', 1)
            env[os.fsdecode(key)] = os.fsdecode(value)
    for key in ['NOTIFY_SOCKET', 'JOURNAL_STREAM', 'INVOCATION_ID', 'LISTEN_PID', 'LISTEN_FDS', 'LISTEN_FDNAMES', 'WATCHDOG_PID', 'WATCHDOG_USEC']:
        env.pop(key, None)
    if args.resume_existing:
        stage = args.resume_existing
        if not re.fullmatch(r'/var/www/releases/circle-card-hucknall-\d{8}-\d{6}', str(stage)) or stage.resolve() != stage or not stage.is_dir():
            raise RuntimeError('Resume requires an existing isolated Hucknall release directory.')
        stamp = stage.name.removeprefix('circle-card-hucknall-')
        state = Path(f'/var/lib/circle-card-hucknall/{stamp}')
        completed_log = state / 'build.log'
        if not completed_log.is_file() or 'Circle Card production server-action exports verified.' not in completed_log.read_text(errors='replace'):
            raise RuntimeError('The staged build has no successful build-verification log.')
        if (state / 'deployment.json').exists():
            raise RuntimeError('This release has already been deployed; inspect its deployment record.')
        print('Verifying the completed staged build:', stage, flush=True)
    else:
        stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d-%H%M%S')
        stage = Path(f'/var/www/releases/circle-card-hucknall-{stamp}')
        state = Path(f'/var/lib/circle-card-hucknall/{stamp}')
        state.mkdir(parents=True, mode=0o700)
        stage.mkdir(mode=0o755)
        print('Copying the current release into', stage, flush=True)
        run(['cp', '-a', '--reflink=auto', str(LIVE) + '/.', str(stage)])
    archive_url = f'https://github.com/{REPO}/archive/{args.ref}.tar.gz'
    print('Fetching the pinned private Hucknall Hub presentation.', flush=True)
    with urllib.request.urlopen(archive_url, timeout=90) as response:
        archive_bytes = response.read(60 * 1024 * 1024 + 1)
    if len(archive_bytes) > 60 * 1024 * 1024:
        raise RuntimeError('Repository archive exceeded the expected limit.')
    selected = set()
    with tarfile.open(fileobj=io.BytesIO(archive_bytes), mode='r:gz') as archive:
        for member in archive.getmembers():
            parts = member.name.split('/', 1)
            if len(parts) != 2:
                continue
            relative = parts[1]
            if '..' in Path(relative).parts or relative.startswith('/'):
                raise RuntimeError('Unsafe repository archive member.')
            if not allowed_payload(relative):
                continue
            if not member.isfile() or member.size > 1024 * 1024:
                raise RuntimeError('Unexpected payload member type/size.')
            data = archive.extractfile(member).read()
            target = stage / relative
            if relative in selected:
                raise RuntimeError('Duplicate payload file.')
            if args.resume_existing:
                if not target.is_file() or target.read_bytes() != data:
                    raise RuntimeError(f'Staged source differs from pinned payload: {relative}')
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
                target.chmod(0o644)
            selected.add(relative)
    if selected != PAYLOAD_FILES:
        raise RuntimeError('The approved custom-card payload is incomplete.')
    if args.resume_existing:
        if (stage / PAGE).read_bytes() != route_bytes:
            raise RuntimeError('The staged preview route differs from the pinned payload.')
        for name in ['package.json', 'next.config.ts', 'next.config.mjs', 'next.config.js']:
            if (LIVE / name).is_file() and (stage / name).read_bytes() != (LIVE / name).read_bytes():
                raise RuntimeError(f'The staged runtime configuration differs: {name}')
    else:
        (stage / PAGE).write_bytes(route_bytes)
    # Native capabilities are patched narrowly against this current release below.
    build_script = json.loads((stage / 'package.json').read_text())['scripts']['build']
    if not re.fullmatch(r'next build(?:\s+&&\s+node scripts/verify-circle-card-action-build\.mjs)?', build_script):
        raise RuntimeError('Unrecognised build script; refusing to run database or deployment tasks.')
    if not args.resume_existing:
        for relative in ['.next', '.runtime/circle-card']:
            next_dir = stage / relative
            if next_dir.is_symlink():
                next_dir.unlink()
            elif next_dir.exists():
                shutil.rmtree(next_dir)
    env.update({'PWD': str(stage), 'NODE_ENV': 'production', 'PORT': str(NEW_PORT), 'HOSTNAME': '127.0.0.1', 'NEXT_TELEMETRY_DISABLED': '1'})
    previous_options = re.sub(r'--max[-_]old[-_]space[-_]size(?:=|\s+)\d+', '', env.get('NODE_OPTIONS', ''))
    env['NODE_OPTIONS'] = previous_options.strip() + f' --max-old-space-size={heap_mib}'
    for key, value in list(env.items()):
        if value.startswith(str(LIVE) + '/'):
            env[key] = str(stage) + value[len(str(LIVE)):]
    if args.resume_existing:
        raise RuntimeError('Native activation requires a fresh stage; resume is not enabled.')
    run(['python3', 'ops/circle-card/hucknall-hub/prepare-native-stage.py', str(state)], cwd=stage, env=env)
    log_path = state / 'build.log'
    print('Checking the completed build.' if args.resume_existing else f'Building the new release. The live site remains on port {OLD_PORT}.', flush=True)
    with log_path.open('w') as log:
        log_path.chmod(0o600)
        # Release files may intentionally lack executable bits. Node reads the
        # existing Next CLI directly, without changing live dependency permissions.
        result = subprocess.CompletedProcess([], 0) if args.resume_existing else subprocess.run(['node', 'node_modules/next/dist/bin/next', 'build'], cwd=stage, env=env, stdout=log, stderr=subprocess.STDOUT)
        if result.returncode == 0 and 'verify-circle-card-action-build.mjs' in build_script:
            result = subprocess.run(['node', 'scripts/verify-circle-card-action-build.mjs'], cwd=stage, env=env, stdout=log, stderr=subprocess.STDOUT)
    if result.returncode:
        print(redact(log_path.read_text(errors='replace')[-16000:], env))
        raise RuntimeError(f'Build failed. The live site was not switched. Build log: {log_path}')
    dist_dir = compiled_preview(stage)
    print('Verified compiled preview in', dist_dir, flush=True)
    standalone = dist_dir / 'standalone'
    if (standalone / 'server.js').is_file():
        shutil.copytree(stage / 'public', standalone / 'public', dirs_exist_ok=True)
        relative_dist = dist_dir.relative_to(stage)
        shutil.copytree(dist_dir / 'static', standalone / relative_dist / 'static', dirs_exist_ok=True)
    # The original runtime user owns its new cache, not the application source.
    runtime_user = property_value('User') or 'root'
    account = pwd.getpwnam(runtime_user) if not runtime_user.isdigit() else pwd.getpwuid(int(runtime_user))
    cache = dist_dir / 'cache'
    if cache.exists():
        run(['chown', '-R', f'{account.pw_uid}:{account.pw_gid}', str(cache)])
    fragment = Path(property_value('FragmentPath'))
    unit_text = fragment.read_text()
    original_launcher, launcher_source, unit_text = prepare_launcher(unit_text, stage)
    launcher_dir = Path('/opt/thebusinesscircle/circle-card-launchers') / f'hucknall-{stamp}'
    launcher_dir.mkdir(mode=0o755, exist_ok=True)
    launcher_path = launcher_dir / 'launch.mjs'
    launcher_path.write_text(launcher_source)
    launcher_path.chmod(0o644)
    run(['node', '--check', str(launcher_path)], stdout=subprocess.DEVNULL)
    unit_text = unit_text.replace(str(original_launcher), str(launcher_path))
    overrides = state / 'runtime-override.env'
    overrides.write_text(f'PORT={NEW_PORT}\nHOSTNAME=127.0.0.1\n')
    overrides.chmod(0o600)
    unit_name = f'circle-card-hucknall-{stamp}.service'
    unit_path = Path('/etc/systemd/system') / unit_name
    unit_path.write_text(rewrite_unit(unit_text, str(LIVE), str(stage), str(overrides)))
    unit_path.chmod(0o600)
    backup = state / 'nginx.previous.conf'
    backup.write_bytes(original_config.read_bytes())
    backup.chmod(0o600)
    switched = False
    native_activated = False
    try:
        run(['systemctl', 'daemon-reload'])
        run(['systemctl', 'start', unit_name])
        for attempt in range(30):
            try:
                health('/login', {200})
                break
            except (OSError, RuntimeError, http.client.HTTPException):
                if attempt == 29:
                    raise
                time.sleep(2)
        # Existing authentication must still protect the private record.
        response, _ = health('/app/prepared/cmvzwzm3y000amkahigz25s8r/preview?plan=pro&presentation=custom', {302, 303, 307, 308})
        if '/login' not in (response.getheader('Location') or ''):
            raise RuntimeError('Private preview did not redirect unauthenticated access to login.')
        health('/prepared/' + DRAFT_SLUG, {404})
        run(['node', 'ops/circle-card/hucknall-hub/activate-native-hub.mjs', 'activate', str(state / 'native-hub-before.json')], cwd=stage, env=env)
        native_activated = True
        response, data = health('/card/hucknall-circle-hub', {200})
        if b'Hucknall' not in data or b'Example butcher shop' in data:
            raise RuntimeError('The native hub response is missing or includes illustrative members.')
        response, data = health('/card/hucknall-circle-hub/about', {200})
        if b'Ada Lovelace' not in data or b'Local information' not in data:
            raise RuntimeError('The public About page did not contain the researched local content.')
        if re.search(rb'<meta[^>]+name="robots"[^>]+content="[^"]*noindex', data, re.I) or 'noindex' in (response.getheader('X-Robots-Tag') or '').lower():
            raise RuntimeError('The public About page is unexpectedly marked noindex.')
        health('/card/hucknall-circle-hub/sitemap.xml', {200})
        response, data = health('/robots.txt', {200})
        if b'card/hucknall-circle-hub/sitemap.xml' not in data:
            raise RuntimeError('The hub sitemap is not advertised to crawlers.')
        if original_config.read_text() != original_text or property_value('MainPID') != str(pid):
            raise RuntimeError('The live release changed during the build; refusing to switch it.')
        new_text = rewrite_nginx(original_text, str(LIVE), str(stage))
        # Rewrite this existing file in place, retaining its ownership and permissions.
        original_config.write_text(new_text)
        try:
            run(['nginx', '-t'])
            run(['systemctl', 'reload', 'nginx'])
            switched = True
            run(['systemctl', 'enable', unit_name])
        except Exception:
            original_config.write_bytes(backup.read_bytes())
            run(['nginx', '-t'])
            run(['systemctl', 'reload', 'nginx'])
            switched = False
            raise
        record = {'release': str(stage), 'service': unit_name, 'previous_service': LIVE_UNIT, 'nginx_file': str(original_config), 'nginx_backup': str(backup), 'git_ref': args.ref, 'previous_port': OLD_PORT, 'port': NEW_PORT}
        (state / 'deployment.json').write_text(json.dumps(record, indent=2))
        print('\nDEPLOYED: Native Hucknall Circle Hub is public with Discover ON and a crawlable About page.', flush=True)
        print('Open: https://circlecard.co.uk/card/hucknall-circle-hub')
        print('About: https://circlecard.co.uk/card/hucknall-circle-hub/about')
        print('Release:', stage)
        print('Service:', unit_name)
        print(f'Previous release remains running on port {OLD_PORT}.')
        print('Rollback configuration:', backup)
        print('Verify Spin, Wallet, Discover and public SEO before declaring launch complete.')
    except Exception:
        if native_activated and not switched:
            run(['node', 'ops/circle-card/hucknall-hub/activate-native-hub.mjs', 'rollback', str(state / 'native-hub-before.json')], cwd=stage, env=env)
        if not switched:
            subprocess.run(['systemctl', 'stop', unit_name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        diagnostic = subprocess.run(['journalctl', '-u', unit_name, '-n', '20', '--no-pager'], text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        print(redact(diagnostic.stdout[-10000:], env), file=sys.stderr)
        raise


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'\nSTOPPED: {error}', file=sys.stderr)
        sys.exit(1)


