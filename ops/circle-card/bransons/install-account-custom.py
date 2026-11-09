#!/usr/bin/env python3
"""Add Bransons Custom to the native sample shelf and preview using an isolated release."""
import datetime
import fcntl
import hashlib
import http.client
import json
import os
from pathlib import Path
import pwd
import re
import shutil
import socket
import subprocess
import time
import urllib.request

NGINX = Path('/etc/nginx/sites-enabled/circlecard.co.uk')
PREVIEW = 'src/app/(member)/app/prepared/[preparedId]/preview/page.tsx'
SHELF = 'src/components/circle-card/prepared-card-shelf.tsx'
COMPONENT = 'src/components/circle-card/bransons-prepared-preview.tsx'
CARD_ID = 'cmw970uf0000085ahf2nwtins'

BRANSONS_COMPONENT = '''"use client";
import { useEffect, useRef, useState, type SyntheticEvent } from "react";

export function BransonsPreparedPreview() {
  const [height, setHeight] = useState(900);
  const observer = useRef<ResizeObserver | null>(null);
  useEffect(() => () => observer.current?.disconnect(), []);
  function loaded(event: SyntheticEvent<HTMLIFrameElement>) {
    observer.current?.disconnect();
    const document = event.currentTarget.contentDocument;
    const card = document?.querySelector<HTMLElement>(".shell");
    if (!card) return;
    const resize = () => setHeight(Math.max(650, Math.ceil(card.offsetTop + card.offsetHeight + 110)));
    resize();
    observer.current = new ResizeObserver(resize);
    observer.current.observe(card);
  }
  return <div className="mx-auto w-full max-w-[620px]">
    <a className="mb-3 inline-flex min-h-11 items-center text-sm text-cyan-200" href="/samples/bransons.html">Open Bransons full screen ↗</a>
    <iframe title="Bransons custom Circle Card" src="/samples/bransons.html" onLoad={loaded}
      allow="web-share; clipboard-write" style={{ width: "100%", height, border: 0, borderRadius: 20, display: "block" }} />
  </div>;
}
'''


def once(source, old, new):
    if source.count(old) != 1:
        raise RuntimeError('The native sample source changed: ' + old[:80])
    return source.replace(old, new, 1)


def patch_preview(source):
    if 'BransonsPreparedPreview' in source:
        raise RuntimeError('Bransons Custom preview is already present; no new build attempted.')
    compact = re.sub(r'\s+', '', source)
    for required in ['getOwnedPreparedCard(preparedId)', 'buildPreparedCardPreview(row,plan)', 'parsePreparedPlan(query.plan)']:
        if required not in compact:
            raise RuntimeError('The authenticated sample boundary changed.')
    source = once(source, '  const hasCustom = isLawrenceSevernCard(card);',
        f'  const bransonsCustom = row.id === "{CARD_ID}" && row.presetKey === "BRANSONS_CUSTOM_SAMPLE";\n'
        '  const hasCustom = bransonsCustom || isLawrenceSevernCard(card);')
    pattern = r'(?m)^(\s*)\? (<LawrenceSevernPreparedCard[^\n]+/>)$'
    if len(re.findall(pattern, source)) != 1:
        raise RuntimeError('The existing Custom renderer changed.')
    source = re.sub(pattern, lambda match: match[1] + '? (bransonsCustom ? <BransonsPreparedPreview /> : ' + match[2] + ')', source)
    return 'import { BransonsPreparedPreview } from "@/components/circle-card/bransons-prepared-preview";\n' + source


def patch_shelf(source):
    if 'data-bransons-custom-sample' in source:
        raise RuntimeError('Bransons Custom shelf action is already present; no new build attempted.')
    matches = [m for m in re.finditer(r'<Link\b[\s\S]*?</Link>', source) if 'plan=pro' in m[0].lower()]
    if len(matches) != 1:
        raise RuntimeError('Could not identify the existing Pro preview link on the sample shelf.')
    match = matches[0]
    variables = re.findall(r'\$\{([A-Za-z_$][\w$]*)\.id\}', match[0])
    if not variables or len(set(variables)) != 1:
        raise RuntimeError('The shelf card identifier needs review.')
    row = variables[0]
    classes = re.findall(r'className=(?:"[^"\n]*"|\{[^{}\n]*\})', match[0])
    css = classes[0] if classes else 'className="inline-flex min-h-11 items-center rounded-xl border px-4 py-2"'
    button = ('{' + row + '.id === "' + CARD_ID + '" ? <Link data-bransons-custom-sample="true" ' + css +
        ' href={`/app/prepared/${' + row + '.id}/preview?plan=pro&presentation=custom`}>Custom</Link> : null}')
    return source[:match.end()] + button + source[match.end():]


def run(args, **kwargs):
    return subprocess.run(args, check=True, text=True, **kwargs)

def prop(unit, name):
    return subprocess.check_output(['systemctl', 'show', unit, '--value', '-p', name], text=True).strip()

def rewrite_nginx(text, old_root, new_root, old_port, new_port):
    pattern = rf'(?m)^(\s*proxy_pass\s+)http://127\.0\.0\.1:{old_port}(\s*;)'
    if len(re.findall(pattern, text)) != 1:
        raise RuntimeError('Expected one Circle Card proxy. Live site unchanged.')
    result = re.sub(pattern, lambda m: f'{m[1]}http://127.0.0.1:{new_port}{m[2]}', text)
    result = result.replace(old_root, new_root)
    for m in list(re.finditer(r'(?m)^(\s*(?:alias|root)\s+)([^;\s]+)(\s*;)', result)):
        if '$' in m[2]:
            raise RuntimeError('Variable asset path requires review.')
        resolved = str(Path(m[2]).resolve())
        if resolved == old_root or resolved.startswith(old_root + '/'):
            mapped = new_root + resolved[len(old_root):]
            result = result.replace(m[0], m[1] + mapped + m[3])
    return result

def rewrite_launcher(text, old_root, new_root, old_port, new_port):
    for token in ["process.getuid()===0", "process.env.USER!=='circle-card-app'", "process.env.LOGNAME!=='circle-card-app'", 'realpathSync(process.cwd())!==', 'readEnvironmentJson', 'validateProtectedStandaloneBilling']:
        if token not in text:
            raise RuntimeError('Protected runtime launcher differs; review required.')
    if old_root not in text:
        raise RuntimeError('Launcher release does not match the running process.')
    for marker in [f"'-p','{old_port}'", f"PORT:'{old_port}'"]:
        if text.count(marker) != 1:
            raise RuntimeError('Launcher port markers differ; review required.')
    return text.replace(old_root, new_root).replace(f"'-p','{old_port}'", f"'-p','{new_port}'").replace(f"PORT:'{old_port}'", f"PORT:'{new_port}'")

def rewrite_unit(text, old_root, new_root, old_launcher, new_launcher, override):
    if re.search(r'^\s*(?:PIDFile|ExecStop)\s*=\s*\S', text, re.M):
        raise RuntimeError('Custom process handling requires review.')
    if f'WorkingDirectory={old_root}' not in text or old_launcher not in text:
        raise RuntimeError('Service does not match the identified runtime.')
    return text.replace(old_root, new_root).replace(old_launcher, new_launcher) + f'\n[Service]\nEnvironmentFile={override}\n'

def build_heap(available_kib):
    for heap in [3072, 2560, 2048]:
        if available_kib // 1024 >= heap + 1024:
            return heap
    raise RuntimeError('Not enough free memory for a build. Live site unchanged.')

def discover(text):
    ports = set(re.findall(r'proxy_pass\s+http://127\.0\.0\.1:(\d+)\s*;', text))
    if len(ports) != 1:
        raise RuntimeError('Expected one Circle Card proxy target.')
    port = int(next(iter(ports)))
    rows = subprocess.check_output(['systemctl', 'list-units', '--type=service', '--state=running', '--no-legend', '--plain'], text=True)
    matches = []
    for row in rows.splitlines():
        unit = row.split()[0] if row.split() else ''
        if not re.fullmatch(r'circle-card-[A-Za-z0-9_.-]+\.service', unit):
            continue
        root = Path(prop(unit, 'WorkingDirectory'))
        if not str(root).startswith('/var/www/releases/circle-card-') or not root.is_dir():
            continue
        pid = prop(unit, 'MainPID')
        if not pid.isdigit() or int(pid) < 2 or Path(f'/proc/{pid}/cwd').resolve() != root.resolve():
            continue
        unit_text = Path(prop(unit, 'FragmentPath')).read_text()
        launchers = set(re.findall(r'/opt/thebusinesscircle/circle-card-launchers/[^\s"\']+/launch\.mjs', unit_text))
        if len(launchers) != 1:
            continue
        launcher = Path(next(iter(launchers)))
        source = launcher.read_text()
        if f"PORT:'{port}'" not in source or str(root) not in source:
            continue
        if prop(unit, 'DropInPaths'):
            raise RuntimeError('Active service overrides require review.')
        matches.append((unit, root, pid, unit_text, launcher, source))
    if len(matches) != 1:
        raise RuntimeError('Could not identify one service for the live proxy.')
    for candidate in range(port + 1, min(port + 30, 65536)):
        try:
            with socket.socket() as probe:
                probe.bind(('127.0.0.1', candidate))
            return (*matches[0], port, candidate)
        except OSError:
            pass
    raise RuntimeError('No free preview port.')

def health(port, path, statuses, contains=None):
    conn = http.client.HTTPConnection('127.0.0.1', port, timeout=25)
    try:
        conn.request('GET', path, headers={'Host':'circlecard.co.uk', 'X-Forwarded-Proto':'https'})
        res = conn.getresponse()
        data = res.read()
        if res.status not in statuses or contains is not None and contains not in data:
            raise RuntimeError(f'Health check failed: {path} HTTP {res.status}')
        return dict(res.getheaders()), data
    finally:
        conn.close()

def remove_build(stage, relative):
    target = stage / relative
    if target.is_symlink():
        target.unlink()
    elif target.exists():
        if not target.resolve().is_relative_to(stage):
            raise RuntimeError('Build output escapes the new release.')
        shutil.rmtree(target)

def redact(text, env):
    for key, value in env.items():
        if re.search(r'secret|password|token|database_url|api_key|credential', key, re.I) and len(value) >= 6:
            text = text.replace(value, '[redacted]')
    return text


def main():
    if os.geteuid() != 0:
        raise RuntimeError('Run this in the existing root server session.')
    lock = open('/run/circle-card-bransons-account-deploy.lock', 'w')
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    config = NGINX.resolve()
    original = config.read_text()
    unit, live, pid, unit_text, launcher, launcher_source, old_port, new_port = discover(original)
    if shutil.disk_usage('/').free < 8 * 1024**3:
        raise RuntimeError('At least 8 GiB free disk is required. Live site unchanged.')
    available = next(int(line.split()[1]) for line in Path('/proc/meminfo').read_text().splitlines() if line.startswith('MemAvailable:'))
    heap = build_heap(available)
    sources = {relative: (live / relative).read_text() for relative in [PREVIEW, SHELF]}
    patched = {PREVIEW: patch_preview(sources[PREVIEW]), SHELF: patch_shelf(sources[SHELF]), COMPONENT: BRANSONS_COMPONENT}
    if (live / COMPONENT).exists():
        raise RuntimeError('An existing Bransons account component needs review.')
    build_script = json.loads((live / 'package.json').read_text())['scripts']['build']
    if not re.fullmatch(r'next build(?:\s+&&\s+node scripts/verify-circle-card-action-build\.mjs)?', build_script):
        raise RuntimeError('Unrecognised build script. Live site unchanged.')
    syntax_check = r'''
const ts=require('typescript'),fs=require('node:fs');
const sources=JSON.parse(fs.readFileSync(0,'utf8'));
let failed=false;
for(const [fileName,source] of Object.entries(sources)){
const result=ts.transpileModule(source,{fileName,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
for(const diagnostic of result.diagnostics||[]){if(diagnostic.category===ts.DiagnosticCategory.Error){failed=true;console.error(fileName+': '+ts.flattenDiagnosticMessageText(diagnostic.messageText,' '));}}
}
if(failed)process.exitCode=1;
'''
    run(['node','-e',syntax_check],cwd=live,input=json.dumps(patched))
    env = dict(os.environ)
    for entry in Path(f'/proc/{pid}/environ').read_bytes().split(b'\0'):
        if b'=' in entry:
            key, value = entry.split(b'=', 1)
            env[os.fsdecode(key)] = os.fsdecode(value)
    for key in ['NOTIFY_SOCKET','JOURNAL_STREAM','INVOCATION_ID','LISTEN_PID','LISTEN_FDS','LISTEN_FDNAMES','WATCHDOG_PID','WATCHDOG_USEC']:
        env.pop(key, None)
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d-%H%M%S')
    stage = Path(f'/var/www/releases/circle-card-bransons-account-{stamp}')
    state = Path(f'/var/lib/circle-card-bransons-account/{stamp}')
    state.mkdir(parents=True, mode=0o700)
    print(f'1/5 Preparing an isolated release. Current website stays on port {old_port}.', flush=True)
    def ignore(path, names):
        path = Path(path)
        if path == live:
            return {'.next', '.git'} & set(names)
        if path == live / '.runtime':
            return {'circle-card'} & set(names)
        return set()
    shutil.copytree(live, stage, symlinks=True, ignore=ignore)
    if (stage / '.runtime').is_symlink() or not (stage / '.runtime').resolve().is_relative_to(stage.resolve()):
        raise RuntimeError('Candidate build output escapes the isolated release. Live site unchanged.')
    for relative, content in patched.items():
        target = stage / relative
        if target.is_symlink() or not target.resolve().is_relative_to(stage.resolve()):
            raise RuntimeError('Sample source escapes the candidate release.')
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content)
    for relative, content in sources.items():
        backup_source = state / 'source-backup' / relative
        backup_source.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        backup_source.write_text(content)
        backup_source.chmod(0o600)
    env.update({'PWD':str(stage),'NODE_ENV':'production','PORT':str(new_port),'HOSTNAME':'127.0.0.1','NEXT_TELEMETRY_DISABLED':'1'})
    env['NODE_OPTIONS'] = re.sub(r'--max[-_]old[-_]space[-_]size(?:=|\s+)\d+', '', env.get('NODE_OPTIONS','')).strip() + f' --max-old-space-size={heap}'
    for key, value in list(env.items()):
        if value.startswith(str(live)+'/'):
            env[key] = str(stage)+value[len(str(live)):]
    log_path = state / 'build.log'
    print(f'2/5 Building Free / Pro / Custom in the account. Heap: {heap} MiB.\nBuild log: {log_path}', flush=True)
    with log_path.open('w') as log:
        log_path.chmod(0o600)
        result = subprocess.run(['node','node_modules/next/dist/bin/next','build'],cwd=stage,env=env,stdout=log,stderr=subprocess.STDOUT)
        if result.returncode == 0 and 'verify-circle-card-action-build.mjs' in build_script:
            result = subprocess.run(['node','scripts/verify-circle-card-action-build.mjs'],cwd=stage,env=env,stdout=log,stderr=subprocess.STDOUT)
    if result.returncode:
        print(redact(log_path.read_text(errors='replace')[-14000:], env))
        raise RuntimeError(f'Candidate build failed. Live site unchanged. Log: {log_path}')
    dist = None
    for relative in ['.runtime/circle-card','.next']:
        candidate = stage / relative
        manifest = candidate / 'server/app-paths-manifest.json'
        if manifest.is_file() and any(key.endswith('/app/prepared/[preparedId]/preview/page') for key in json.loads(manifest.read_text())) and (candidate/'BUILD_ID').is_file():
            dist = candidate
            break
    if dist is None:
        raise RuntimeError('The compiled prepared-card preview is missing. Live site unchanged.')
    standalone = dist / 'standalone'
    if (standalone/'server.js').is_file():
        shutil.copytree(stage/'public', standalone/'public', dirs_exist_ok=True)
        shutil.copytree(dist/'static', standalone/dist.relative_to(stage)/'static', dirs_exist_ok=True)
    if prop(unit, 'User') != 'circle-card-app':
        raise RuntimeError('The runtime account changed. Live site unchanged.')
    account = pwd.getpwnam('circle-card-app')
    if (dist/'cache').exists():
        run(['chown','-R',f'{account.pw_uid}:{account.pw_gid}',str(dist/'cache')])
    new_launcher_source = rewrite_launcher(launcher_source,str(live),str(stage),old_port,new_port)
    launcher_dir = Path('/opt/thebusinesscircle/circle-card-launchers') / f'bransons-account-{stamp}'
    launcher_dir.mkdir(mode=0o755)
    new_launcher = launcher_dir / 'launch.mjs'
    new_launcher.write_text(new_launcher_source)
    new_launcher.chmod(0o644)
    run(['node','--check',str(new_launcher)], stdout=subprocess.DEVNULL)
    override = state / 'runtime-override.env'
    override.write_text(f'PORT={new_port}\nHOSTNAME=127.0.0.1\n')
    override.chmod(0o600)
    new_unit = f'circle-card-bransons-account-{stamp}.service'
    unit_path = Path('/etc/systemd/system') / new_unit
    unit_path.write_text(rewrite_unit(unit_text,str(live),str(stage),str(launcher),str(new_launcher),str(override)))
    unit_path.chmod(0o600)
    backup = state / 'nginx.previous.conf'
    backup.write_text(original)
    backup.chmod(0o600)
    changed_config = False
    try:
        print('3/5 Starting and checking the isolated account preview.', flush=True)
        run(['systemctl','daemon-reload'])
        run(['systemctl','start',new_unit])
        for attempt in range(40):
            try:
                health(new_port,'/login',{200})
                break
            except (OSError,RuntimeError,http.client.HTTPException):
                if attempt == 39:
                    raise
                time.sleep(1)
        health(new_port,'/',{200},b'Circle Card')
        health(new_port,'/pro',{200},'£49.99'.encode())
        health(new_port,'/card/hucknall-circle-hub',{200},b'Hucknall')
        for path in ['/app/prepared',f'/app/prepared/{CARD_ID}/preview?plan=pro&presentation=custom','/app/share/commissions','/app/upgrades/custom-build']:
            headers, _ = health(new_port,path,{302,303,307,308})
            if '/login' not in next((v for k,v in headers.items() if k.lower()=='location'),''):
                raise RuntimeError('Private account route did not require sign-in: ' + path)
        print('4/5 Switching after build and access checks passed.', flush=True)
        if config.read_text() != original or prop(unit,'MainPID') != pid:
            raise RuntimeError('The live release changed during the build. Refusing to switch.')
        for relative, before in sources.items():
            if (live / relative).read_text() != before:
                raise RuntimeError('The sample source changed during the build. Refusing to switch.')
        config.write_text(rewrite_nginx(original,str(live),str(stage),old_port,new_port))
        changed_config = True
        run(['nginx','-t'])
        run(['systemctl','reload','nginx'])
        print('5/5 Checking the public HTTPS route.', flush=True)
        with urllib.request.urlopen('https://circlecard.co.uk/login?bransons_account='+stamp, timeout=30) as response:
            if response.status != 200 or b'Circle Card' not in response.read():
                raise RuntimeError('The public login health check failed.')
        run(['systemctl','enable',new_unit])
        (state/'deployment.json').write_text(json.dumps({'status':'BRANSONS_ACCOUNT_CUSTOM_DEPLOYED','release':str(stage),'service':new_unit,'previousService':unit,'previousRelease':str(live),'port':new_port,'nginxFile':str(config),'nginxBackup':str(backup),'sourceHashes':{key:hashlib.sha256(value.encode()).hexdigest() for key,value in patched.items()},'signedInVerificationPending':True},indent=2))
        print('\nDEPLOYED: Bransons now has a Custom action on the sample shelf and a Custom tab beside Free and Pro.')
        print(f'Open: https://circlecard.co.uk/app/prepared/{CARD_ID}/preview?plan=pro&presentation=custom')
        print('Refresh your account and verify the Bransons Custom option. No card records or billing were changed.')
        print('Previous release is retained:', unit)
        print('Rollback configuration:', backup)
    except Exception:
        if changed_config:
            config.write_bytes(backup.read_bytes())
            run(['nginx','-t'])
            run(['systemctl','reload','nginx'])
        subprocess.run(['systemctl','disable',new_unit],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        subprocess.run(['systemctl','stop',new_unit],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        diagnostic = subprocess.run(['journalctl','-u',new_unit,'-n','15','--no-pager'],text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
        print(redact(diagnostic.stdout[-8000:],env))
        raise


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('STOPPED:', str(error), flush=True)
        raise SystemExit(1)
