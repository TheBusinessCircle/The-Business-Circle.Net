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

LIVE = Path('/var/www/releases/circle-card-0539b3999fa8d626805270633d8d393c309dcffb')
LIVE_UNIT = 'circle-card-release-0539b39-owned.service'
NGINX = Path('/etc/nginx/sites-enabled/circlecard.co.uk')
OLD_PORT, NEW_PORT = 3371, 3372
PAGE = Path('src/app/(member)/app/prepared/[preparedId]/preview/page.tsx')
CUSTOM = 'src/components/circle-card/lawrence-severn/'
ASSETS = 'public/circle-card/clients/lawrence-severn/'
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
            line = re.sub(r'(?<!\d)3371(?!\d)', '3372', line)
        elif re.match(r'\s*Environment\s*=', line):
            line = re.sub(r'(?<!\w)PORT=3371(?=["\s]|$)', 'PORT=3372', line)
        lines.append(line)
    return '\n'.join(lines) + f'\n\n[Service]\nEnvironmentFile={override_file}\n'


def rewrite_nginx(text, old_root, new_root):
    pattern = r'(?m)^(\s*proxy_pass\s+)http://127\.0\.0\.1:3371(\s*;)'
    if len(re.findall(pattern, text)) != 1:
        raise RuntimeError('Expected exactly one live Circle Card proxy target on port 3371.')
    result = re.sub(pattern, r'\g<1>http://127.0.0.1:3372\2', text)
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
    return ((name.startswith(CUSTOM) and name.endswith(('.ts', '.tsx', '.css')) and not name.endswith('.test.ts'))
            or (name.startswith(ASSETS) and name.endswith('.jpg')))


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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ref', required=True)
    args = parser.parse_args()
    if not re.fullmatch(r'[0-9a-f]{40}', args.ref):
        raise RuntimeError('A pinned 40-character Git commit is required.')
    if os.geteuid() != 0:
        raise RuntimeError('Run in the existing root SSH session.')
    original_config = NGINX.resolve()
    original_text = original_config.read_text()
    # Validate the proxy even before creating a build.
    rewrite_nginx(original_text, str(LIVE), '/var/www/releases/circle-card-lawrence-validation')
    if property_value('WorkingDirectory') != str(LIVE) or property_value('ActiveState') != 'active':
        raise RuntimeError('The active service changed; no deployment was attempted.')
    if property_value('DropInPaths'):
        raise RuntimeError('The running service has drop-in overrides; its effective configuration needs review.')
    pid = int(property_value('MainPID'))
    if (Path('/proc') / str(pid) / 'cwd').resolve() != LIVE:
        raise RuntimeError('The live process is not running from the expected release.')
    source_page = (LIVE / PAGE).read_text()
    for required in ['getOwnedPreparedCard(preparedId)', 'buildPreparedCardPreview(row,plan)', 'contactDownloadHref']:
        if required not in source_page:
            raise RuntimeError('The prepared-preview source changed; no deployment was attempted.')
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
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d-%H%M%S')
    stage = Path(f'/var/www/releases/circle-card-lawrence-{stamp}')
    state = Path(f'/var/lib/circle-card-lawrence/{stamp}')
    state.mkdir(parents=True, mode=0o700)
    stage.mkdir(mode=0o755)
    print('Copying the current release into', stage, flush=True)
    run(['cp', '-a', '--reflink=auto', str(LIVE) + '/.', str(stage)])
    archive_url = f'https://github.com/{REPO}/archive/{args.ref}.tar.gz'
    print('Fetching the pinned, approved custom-card files.', flush=True)
    with urllib.request.urlopen(archive_url, timeout=90) as response:
        archive_bytes = response.read(60 * 1024 * 1024 + 1)
    if len(archive_bytes) > 60 * 1024 * 1024:
        raise RuntimeError('Repository archive exceeded the expected limit.')
    route_bytes = None
    selected = 0
    with tarfile.open(fileobj=io.BytesIO(archive_bytes), mode='r:gz') as archive:
        for member in archive.getmembers():
            parts = member.name.split('/', 1)
            if len(parts) != 2:
                continue
            relative = parts[1]
            if '..' in Path(relative).parts or relative.startswith('/'):
                raise RuntimeError('Unsafe repository archive member.')
            template = relative == 'ops/circle-card/lawrence-severn/prepared-preview.page.tsx.template'
            if not (template or allowed_payload(relative)):
                continue
            if not member.isfile() or member.size > 1024 * 1024:
                raise RuntimeError('Unexpected payload member type/size.')
            data = archive.extractfile(member).read()
            if template:
                route_bytes = data
            else:
                target = stage / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
                target.chmod(0o644)
                selected += 1
    if route_bytes is None or selected < 8:
        raise RuntimeError('The approved custom-card payload is incomplete.')
    (stage / PAGE).write_bytes(route_bytes)
    # Never copy the repository's older shared profile renderer over the active release.
    profile = Path('src/components/circle-card/public-circle-card-profile.tsx')
    if (stage / profile).read_bytes() != (LIVE / profile).read_bytes():
        raise RuntimeError('The shared live renderer was unexpectedly changed.')
    build_script = json.loads((stage / 'package.json').read_text())['scripts']['build']
    if not re.fullmatch(r'next build(?:\s+&&\s+node scripts/verify-circle-card-action-build\.mjs)?', build_script):
        raise RuntimeError('Unrecognised build script; refusing to run database or deployment tasks.')
    next_dir = stage / '.next'
    if next_dir.is_symlink():
        next_dir.unlink()
    elif next_dir.exists():
        shutil.rmtree(next_dir)
    env.update({'PWD': str(stage), 'NODE_ENV': 'production', 'PORT': str(NEW_PORT), 'HOSTNAME': '127.0.0.1', 'NEXT_TELEMETRY_DISABLED': '1'})
    env['NODE_OPTIONS'] = env.get('NODE_OPTIONS', '') + ' --max-old-space-size=1536'
    for key, value in list(env.items()):
        if value.startswith(str(LIVE) + '/'):
            env[key] = str(stage) + value[len(str(LIVE)):]
    log_path = state / 'build.log'
    print('Building the new release. The live site remains on port 3371.', flush=True)
    with log_path.open('w') as log:
        log_path.chmod(0o600)
        # Release files may intentionally lack executable bits. Node reads the
        # existing Next CLI directly, without changing live dependency permissions.
        result = subprocess.run(['node', 'node_modules/next/dist/bin/next', 'build'], cwd=stage, env=env, stdout=log, stderr=subprocess.STDOUT)
        if result.returncode == 0 and 'verify-circle-card-action-build.mjs' in build_script:
            result = subprocess.run(['node', 'scripts/verify-circle-card-action-build.mjs'], cwd=stage, env=env, stdout=log, stderr=subprocess.STDOUT)
    if result.returncode:
        print(redact(log_path.read_text(errors='replace')[-16000:], env))
        raise RuntimeError(f'Build failed. The live site was not switched. Build log: {log_path}')
    built_page = stage / '.next/server/app/(member)/app/prepared/[preparedId]/preview/page.js'
    if not built_page.is_file():
        raise RuntimeError('The expected prepared preview was not compiled; live site unchanged.')
    standalone = stage / '.next/standalone'
    if (standalone / 'server.js').is_file():
        shutil.copytree(stage / 'public', standalone / 'public', dirs_exist_ok=True)
        shutil.copytree(stage / '.next/static', standalone / '.next/static', dirs_exist_ok=True)
    # The original runtime user owns its new cache, not the application source.
    runtime_user = property_value('User') or 'root'
    account = pwd.getpwnam(runtime_user) if not runtime_user.isdigit() else pwd.getpwuid(int(runtime_user))
    cache = stage / '.next/cache'
    if cache.exists():
        run(['chown', '-R', f'{account.pw_uid}:{account.pw_gid}', str(cache)])
    fragment = Path(property_value('FragmentPath'))
    unit_text = fragment.read_text()
    overrides = state / 'runtime-override.env'
    overrides.write_text(f'PORT={NEW_PORT}\nHOSTNAME=127.0.0.1\n')
    overrides.chmod(0o600)
    unit_name = f'circle-card-lawrence-{stamp}.service'
    unit_path = Path('/etc/systemd/system') / unit_name
    unit_path.write_text(rewrite_unit(unit_text, str(LIVE), str(stage), str(overrides)))
    unit_path.chmod(0o600)
    backup = state / 'nginx.previous.conf'
    backup.write_bytes(original_config.read_bytes())
    backup.chmod(0o600)
    switched = False
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
        response, _ = health('/app/prepared/cmvzmvkzm00g7u7ah42orvyi8/preview?plan=pro&presentation=custom', {302, 303, 307, 308})
        if '/login' not in (response.getheader('Location') or ''):
            raise RuntimeError('Private preview did not redirect unauthenticated access to login.')
        response, data = health('/circle-card/clients/lawrence-severn/shopfront.jpg', {200})
        if not data.startswith(b'\xff\xd8'):
            raise RuntimeError('The new photo asset did not return a JPEG.')
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
        print('\nDEPLOYED: Custom preview is available in your existing account.', flush=True)
        print('Open: https://circlecard.co.uk/app/prepared/cmvzmvkzm00g7u7ah42orvyi8/preview?plan=pro&presentation=custom')
        print('Release:', stage)
        print('Service:', unit_name)
        print('Previous release remains running on port 3371.')
        print('Rollback configuration:', backup)
        print('Verify the signed-in Custom, Free and Pro samples before declaring the result complete.')
    except Exception:
        if not switched:
            subprocess.run(['systemctl', 'stop', unit_name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        raise


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'\nSTOPPED: {error}', file=sys.stderr)
        sys.exit(1)
