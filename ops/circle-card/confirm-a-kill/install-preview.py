#!/usr/bin/env python3
"""Stage the exact current Circle Card release and install only Confirm A Kill's private presentation."""
import argparse, datetime, hashlib, http.client, importlib.util, io, json, os
from pathlib import Path
import pwd, re, shutil, socket, subprocess, sys, tarfile, time, urllib.request

LIVE = LIVE_UNIT = OLD_PORT = NEW_PORT = None
NGINX = Path('/etc/nginx/sites-enabled/circlecard.co.uk')
REPO = 'TheBusinessCircle/The-Business-Circle.Net'
PROFILE = Path('src/components/circle-card/public-circle-card-profile.tsx')
PREVIEW_PAGE = Path('src/app/(member)/app/prepared/[preparedId]/preview/page.tsx')
CARD_ID = 'cmw2jnnc6005xzfahkcfm7q39'
SLUG = 'confirm-a-kill-73f64ae9cc20'
PAYLOAD = {
    'src/components/circle-card/confirm-a-kill/confirm-draft-card.tsx',
    'src/components/circle-card/confirm-a-kill/confirm-gallery.tsx',
    'src/components/circle-card/confirm-a-kill/confirm-a-kill.module.css',
    'ops/circle-card/confirm-a-kill/patches.py',
}


def run(args, **kwargs):
    return subprocess.run(args, check=True, text=True, **kwargs)

def property_value(name):
    if not LIVE_UNIT:
        raise RuntimeError('Identify the live Circle Card service before reading its properties.')
    return subprocess.check_output(
        ['systemctl', 'show', LIVE_UNIT, '--value', '-p', name], text=True
    ).strip()

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

def build_heap_mib(available_kib):
    available_mib = available_kib // 1024
    # Keep the existing 1 GiB allowance for native overhead and memory fluctuations.
    for heap_mib in (3072, 2560, 2048):
        if available_mib >= heap_mib + 1024:
            return heap_mib
    raise RuntimeError(f'Build requires at least 3072 MiB available RAM; currently {available_mib} MiB. Live site unchanged.')

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
        launcher = re.findall(r'/opt/thebusinesscircle/circle-card-launchers/[^\s"\']+/launch(?:-\d+)?\.mjs', unit_source)
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
    paths = re.findall(r'/opt/thebusinesscircle/circle-card-launchers/[^\s"\']+/launch(?:-\d+)?\.mjs', unit_text)
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


def rewrite_nginx(text, old_root, new_root):
    pattern = rf'(?m)^(\s*proxy_pass\s+)http://127\.0\.0\.1:{OLD_PORT}(\s*;)'
    if len(re.findall(pattern, text)) != 1:
        raise RuntimeError('Expected one current Circle Card proxy directive.')
    result = re.sub(pattern, lambda m: f'{m[1]}http://127.0.0.1:{NEW_PORT}{m[2]}', text)
    result = result.replace(old_root, new_root)
    for match in list(re.finditer(r'(?m)^(\s*(?:alias|root)\s+)([^;\s]+)(\s*;)', result)):
        raw = match[2]
        if '$' in raw:
            raise RuntimeError('Variable-based asset alias requires review.')
        resolved = str(Path(raw).resolve())
        if resolved == old_root or resolved.startswith(old_root + '/'):
            result = result.replace(match[0], match[1] + new_root + resolved[len(old_root):] + match[3])
    return result


def fetch_payload(ref, stage):
    for relative in sorted(PAYLOAD):
        target = stage / relative
        if not target.resolve().is_relative_to(stage.resolve()):
            raise RuntimeError('A payload target points outside the isolated release.')
        url = f'https://raw.githubusercontent.com/{REPO}/{ref}/{relative}'
        with urllib.request.urlopen(url, timeout=60) as response:
            data = response.read(1024 * 1024 + 1)
        if len(data) > 1024 * 1024:
            raise RuntimeError('Unexpected custom-card payload size.')
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        target.chmod(0o644)


def main():
    global LIVE, LIVE_UNIT, OLD_PORT, NEW_PORT
    parser = argparse.ArgumentParser()
    parser.add_argument('--ref', required=True)
    args = parser.parse_args()
    if not re.fullmatch(r'[0-9a-f]{40}', args.ref):
        raise RuntimeError('Use a pinned 40-character Git commit.')
    if os.geteuid() != 0:
        raise RuntimeError('Use the existing root SSH session.')
    config_path = NGINX.resolve()
    original = config_path.read_text()
    LIVE, LIVE_UNIT, OLD_PORT, NEW_PORT = discover_live(original)
    pid = int(property_value('MainPID'))
    if property_value('User') != 'circle-card-app':
        raise RuntimeError('The protected Circle Card runtime user changed.')
    if property_value('DropInPaths'):
        raise RuntimeError('The live service has unreviewed overrides.')
    fragment = Path(property_value('FragmentPath'))
    unit_source = fragment.read_text()
    if (Path('/proc') / str(pid) / 'cwd').resolve() != LIVE:
        raise RuntimeError('The active process changed during discovery.')
    rewrite_nginx(original, str(LIVE), '/var/www/releases/circle-card-confirm-a-kill-validation')
    prepare_launcher(unit_source, Path('/var/www/releases/circle-card-confirm-a-kill-validation'))
    service_source = (LIVE / 'src/server/circle-card/shared-business-card.service.ts').read_text()
    for marker in ['CircleBusinessCardEditor', 'isSharedBusinessManager', 'listSharedBusinessCards']:
        if marker not in service_source:
            raise RuntimeError('The existing shared-business authorization service changed.')
    available = next(int(line.split()[1]) for line in Path('/proc/meminfo').read_text().splitlines() if line.startswith('MemAvailable:'))
    heap = build_heap_mib(available)
    source_kib = int(subprocess.check_output(['du', '-sk', str(LIVE)], text=True).split()[0])
    if shutil.disk_usage(LIVE).free < source_kib * 1024 + 3 * 1024**3:
        raise RuntimeError('Insufficient disk space for an isolated build and rollback.')
    env = dict(os.environ)
    for entry in (Path('/proc') / str(pid) / 'environ').read_bytes().split(b'\0'):
        if b'=' in entry:
            key, value = entry.split(b'=', 1)
            env[os.fsdecode(key)] = os.fsdecode(value)
    for key in ['NOTIFY_SOCKET','JOURNAL_STREAM','INVOCATION_ID','LISTEN_PID','LISTEN_FDS','LISTEN_FDNAMES','WATCHDOG_PID','WATCHDOG_USEC']:
        env.pop(key, None)
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d-%H%M%S')
    stage = Path('/var/www/releases/circle-card-confirm-a-kill-' + stamp)
    state = Path('/var/lib/circle-card-confirm-a-kill') / stamp
    state.mkdir(parents=True, mode=0o700)
    state.chmod(0o700)
    stage.mkdir(mode=0o755)
    stage.chmod(0o755)
    print('1/5 Preparing an isolated copy of the current live release.', flush=True)
    run(['cp','-a','--reflink=auto',str(LIVE) + '/.',str(stage)])
    fetch_payload(args.ref, stage)
    profile = stage / PROFILE
    if not profile.resolve().is_relative_to(stage.resolve()):
        raise RuntimeError('The profile source points outside the new release.')
    patch_path = stage / 'ops/circle-card/confirm-a-kill/patches.py'
    spec = importlib.util.spec_from_file_location('confirm_draft_patch', patch_path)
    patch = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(patch)
    profile.write_text(patch.patch_profile(profile.read_text()))
    preview_page = stage / PREVIEW_PAGE
    if not preview_page.resolve().is_relative_to(stage.resolve()):
        raise RuntimeError('The prepared preview source points outside the new release.')
    preview_page.write_text(patch.patch_preview_page(preview_page.read_text()))
    for key, value in list(env.items()):
        if value.startswith(str(LIVE) + '/'):
            env[key] = str(stage) + value[len(str(LIVE)):]
    env.update({'PWD':str(stage),'NODE_ENV':'production','PORT':str(NEW_PORT),
                'HOSTNAME':'127.0.0.1','NEXT_TELEMETRY_DISABLED':'1'})
    for key,value in env.items():
        if 'DIST' in key and value.startswith('/') and not Path(value).resolve().is_relative_to(stage.resolve()):
            raise RuntimeError('An absolute build output setting needs review: ' + key)
    options = re.sub(r'--max[-_]old[-_]space[-_]size(?:=|\s+)\d+', '', env.get('NODE_OPTIONS',''))
    env['NODE_OPTIONS'] = options.strip() + f' --max-old-space-size={heap}'
    if 'return <PrecisionBusinessCard' not in (LIVE / PROFILE).read_text():
        raise RuntimeError('The live Precision presentation must be present and will be preserved.')
    print('2/5 Private draft renderer prepared. No card data or permissions will be changed.', flush=True)
    build_script = json.loads((stage / 'package.json').read_text())['scripts']['build']
    if not re.fullmatch(r'next build(?:\s+&&\s+node scripts/verify-circle-card-action-build\.mjs)?', build_script):
        raise RuntimeError('The build command changed; database/deployment tasks will not be run.')
    for relative in ['.next','.runtime/circle-card']:
        directory = stage / relative
        if directory.is_symlink():
            directory.unlink()
        elif directory.exists():
            if not directory.resolve().is_relative_to(stage.resolve()):
                raise RuntimeError('The staged build directory points outside the isolated release.')
            shutil.rmtree(directory)
    log = state / 'build.log'
    print('3/5 Building the private preview. The current site stays online.', flush=True)
    with log.open('w') as stream:
        log.chmod(0o600)
        result = subprocess.run(['node','node_modules/next/dist/bin/next','build'],cwd=stage,env=env,stdout=stream,stderr=subprocess.STDOUT)
        if result.returncode == 0 and 'verify-circle-card-action-build.mjs' in build_script:
            result = subprocess.run(['node','scripts/verify-circle-card-action-build.mjs'],cwd=stage,env=env,stdout=stream,stderr=subprocess.STDOUT)
    if result.returncode:
        print(redact('\n'.join(log.read_text(errors='replace').splitlines()[-10:]),env),file=sys.stderr)
        raise RuntimeError('Build stopped; the current site was not switched. Log: ' + str(log))
    dist = compiled_preview(stage)
    standalone = dist / 'standalone'
    if (standalone / 'server.js').is_file():
        shutil.copytree(stage / 'public',standalone / 'public',dirs_exist_ok=True)
        shutil.copytree(dist / 'static',standalone / dist.relative_to(stage) / 'static',dirs_exist_ok=True)
    account = pwd.getpwnam('circle-card-app')
    if (dist / 'cache').exists():
        run(['chown','-R',f'{account.pw_uid}:{account.pw_gid}',str(dist / 'cache')])
    original_launcher, launcher, _ = prepare_launcher(unit_source,stage)
    launcher_dir = Path('/opt/thebusinesscircle/circle-card-launchers') / ('confirm-a-kill-' + stamp)
    launcher_dir.mkdir(mode=0o755)
    launcher_path = launcher_dir / 'launch.mjs'
    launcher_path.write_text(launcher)
    launcher_path.chmod(0o644)
    run(['node','--check',str(launcher_path)],stdout=subprocess.DEVNULL)
    override = state / 'runtime-override.env'
    override.write_text(f'PORT={NEW_PORT}\nHOSTNAME=127.0.0.1\n')
    override.chmod(0o600)
    unit = 'circle-card-confirm-a-kill-' + stamp + '.service'
    unit_path = Path('/etc/systemd/system') / unit
    unit_source = unit_source.replace(str(original_launcher),str(launcher_path))
    unit_path.write_text(rewrite_unit(unit_source,str(LIVE),str(stage),str(override)))
    unit_path.chmod(0o600)
    backup = state / 'nginx.previous.conf'
    backup.write_text(original)
    backup.chmod(0o600)
    switched = changed_config = False
    try:
        run(['systemctl','daemon-reload'])
        run(['systemctl','start',unit])
        for attempt in range(30):
            try:
                health('/login',{200})
                break
            except (OSError,RuntimeError,http.client.HTTPException):
                if attempt == 29:
                    raise
                time.sleep(2)
        for private_path in ['/app/prepared/' + CARD_ID,'/app/prepared/' + CARD_ID + '/preview?plan=pro']:
            response,_ = health(private_path,{302,303,307,308})
            if '/login' not in (response.getheader('Location') or ''):
                raise RuntimeError('An authenticated editor did not redirect signed-out access to login.')
        if config_path.read_text() != original or property_value('MainPID') != str(pid):
            raise RuntimeError('The live release changed during the build; it was not switched.')
        print('4/5 Checking draft privacy and existing public cards.',flush=True)
        for private_public_path in ['/prepared/' + SLUG, '/card/' + SLUG]:
            health(private_public_path,{404})
        _, html = health('/card/precision-finish-plastering-rendering-ecb582748528',{200})
        if b'data-precision-business="bespoke"' not in html:
            raise RuntimeError('The live Precision custom presentation was not preserved.')
        for public_path in ['/card/trevor-newton-ss','/card/hucknall-circle-hub',
                            '/card/precision-finish-plastering-redering',
                            '/card/precision-finish-plastering-rendering']:
            health(public_path,{200})
        if not any(b'data-confirm-a-kill' in p.read_bytes() for p in (dist/'server').rglob('*.js')):
            raise RuntimeError('The private Confirm A Kill template is absent from the compiled server.')
        if config_path.read_text() != original or property_value('MainPID') != str(pid):
            raise RuntimeError('The live service changed before traffic could be switched.')
        config_path.write_text(rewrite_nginx(original,str(LIVE),str(stage)))
        changed_config = True
        run(['nginx','-t'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
        run(['systemctl','enable',unit],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
        run(['systemctl','reload','nginx'])
        switched = True
        record = {'git_ref':args.ref,'release':str(stage),'service':unit,'previous_service':LIVE_UNIT,
                  'previous_port':OLD_PORT,'port':NEW_PORT,'nginx_file':str(config_path),
                  'nginx_backup':str(backup),'state':str(state),'card_id':CARD_ID,'slug':SLUG}
        receipt = state / 'deployment.json'
        receipt.write_text(json.dumps(record,indent=2))
        receipt.chmod(0o600)
        print('5/5 READY: Bespoke preview installed. Confirm A Kill remains a private draft.',flush=True)
        print('https://circlecard.co.uk/app/prepared/' + CARD_ID + '/preview?plan=pro')
        print('Rollback and receipts: ' + str(state))
    except Exception:
        if changed_config and not switched:
            config_path.write_bytes(backup.read_bytes())
            run(['nginx','-t'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
            run(['systemctl','reload','nginx'])
        if not switched:
            subprocess.run(['systemctl','disable','--now',unit],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        raise


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('STOPPED: ' + str(error),file=sys.stderr)
        sys.exit(1)
