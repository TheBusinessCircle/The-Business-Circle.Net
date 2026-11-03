#!/usr/bin/env python3
"""Build a copy of the current release, verify it, then switch Circle Card only."""
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

PATCH_REF = '3d577f9c5e2fdd3043cae360dab8360d0f4fc9d0'
PATCH_SHA = '4178f2a87b89b1f567137f39bfe8f8c4665c53484cb95e55fa3358d18272204a'
PATCH_URL = f'https://raw.githubusercontent.com/TheBusinessCircle/The-Business-Circle.Net/{PATCH_REF}/ops/circle-card/commissions-journey-20261103/commissions-journey.patch'
NGINX = Path('/etc/nginx/sites-enabled/circlecard.co.uk')
READ_ONLY_CAPABILITIES = r'''
const {Client}=require('pg');
const client=new Client({connectionString:process.env.DATABASE_URL,statement_timeout:10000});
(async()=>{try{
  await client.connect(); await client.query('BEGIN READ ONLY');
  const rows=(await client.query(`SELECT
    to_regprocedure('public.circle_card_commission_lock_topology()') IS NOT NULL AS topology_present,
    CASE WHEN to_regprocedure('public.circle_card_commission_lock_topology()') IS NULL THEN false
    ELSE has_function_privilege(current_user,'public.circle_card_commission_lock_topology()','EXECUTE') END AS topology_executable,
    has_table_privilege(current_user,'public."CircleCardCommissionMember"','INSERT') AS member_insert,
    has_table_privilege(current_user,'public."CircleCardCommissionMember"','UPDATE') AS member_update`)).rows;
  await client.query('SELECT "enabled","revision","termsVersion","onboardingStatus","payoutEligibility" FROM "CircleCardCommissionMember" WHERE false');
  await client.query('ROLLBACK');
  console.log('Commission activation capabilities (read-only): '+JSON.stringify(rows[0]));
  if(!Object.values(rows[0]).every(Boolean))process.exitCode=1;
}catch(error){console.error('Commission capability check failed; SQL state '+(/^[A-Z0-9]{5}$/.test(error.code||'')?error.code:'unknown'));process.exitCode=1;}
finally{await client.end().catch(()=>{});}})();
'''

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
        raise RuntimeError('Run in the existing root SSH session.')
    lock = open('/run/circle-card-commissions-deploy.lock', 'w')
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    config = NGINX.resolve()
    original = config.read_text()
    unit, live, pid, unit_text, launcher, launcher_source, old_port, new_port = discover(original)
    if shutil.disk_usage('/').free < 8 * 1024**3:
        raise RuntimeError('At least 8 GiB free disk is required. Live site unchanged.')
    available = next(int(line.split()[1]) for line in Path('/proc/meminfo').read_text().splitlines() if line.startswith('MemAvailable:'))
    heap = build_heap(available)
    print(f'Current release: {live}\nCurrent port: {old_port}. Candidate port: {new_port}. Build heap: {heap} MiB.', flush=True)
    env = dict(os.environ)
    for entry in Path(f'/proc/{pid}/environ').read_bytes().split(b'\0'):
        if b'=' in entry:
            key, value = entry.split(b'=', 1)
            env[os.fsdecode(key)] = os.fsdecode(value)
    for key in ['NOTIFY_SOCKET','JOURNAL_STREAM','INVOCATION_ID','LISTEN_PID','LISTEN_FDS','LISTEN_FDNAMES','WATCHDOG_PID','WATCHDOG_USEC']:
        env.pop(key, None)
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d-%H%M%S')
    stage = Path(f'/var/www/releases/circle-card-commissions-{stamp}')
    state = Path(f'/var/lib/circle-card-commissions/{stamp}')
    state.mkdir(parents=True, mode=0o700)
    with urllib.request.urlopen(PATCH_URL, timeout=60) as response:
        patch = response.read(1024*1024 + 1)
    if len(patch) > 1024*1024 or hashlib.sha256(patch).hexdigest() != PATCH_SHA:
        raise RuntimeError('Pinned patch checksum does not match. Live site unchanged.')
    patch_path = state / 'commissions.patch'
    patch_path.write_bytes(patch)
    patch_path.chmod(0o600)
    stage.mkdir(mode=0o755)
    print('Copying the current complete release. Existing cards and dependencies are preserved.', flush=True)
    run(['cp','-a','--reflink=auto',str(live)+'/.',str(stage)])
    run(['git','apply','--check',str(patch_path)], cwd=stage)
    run(['git','apply',str(patch_path)], cwd=stage)
    build_script = json.loads((stage/'package.json').read_text())['scripts']['build']
    if not re.fullmatch(r'next build(?:\s+&&\s+node scripts/verify-circle-card-action-build\.mjs)?', build_script):
        raise RuntimeError('Unrecognised build script. Live site unchanged.')
    for relative in ['.next','.runtime/circle-card']:
        remove_build(stage, relative)
    env.update({'PWD':str(stage),'NODE_ENV':'production','PORT':str(new_port),'HOSTNAME':'127.0.0.1','NEXT_TELEMETRY_DISABLED':'1'})
    env['NODE_OPTIONS'] = re.sub(r'--max[-_]old[-_]space[-_]size(?:=|\s+)\d+', '', env.get('NODE_OPTIONS','')).strip() + f' --max-old-space-size={heap}'
    for key, value in list(env.items()):
        if value.startswith(str(live)+'/'):
            env[key] = str(stage)+value[len(str(live)):]
    capability = subprocess.run(['node','-e',READ_ONLY_CAPABILITIES],cwd=stage,env=env)
    if capability.returncode:
        raise RuntimeError('Commission activation capability check failed. Live site unchanged; review the reported permission before proceeding.')
    log_path = state/'build.log'
    print(f'Building the candidate. Live website remains on port {old_port}.\nBuild log: {log_path}', flush=True)
    with log_path.open('w') as log:
        log_path.chmod(0o600)
        result = subprocess.run(['node','node_modules/next/dist/bin/next','build'],cwd=stage,env=env,stdout=log,stderr=subprocess.STDOUT)
        if result.returncode == 0 and 'verify-circle-card-action-build.mjs' in build_script:
            result = subprocess.run(['node','scripts/verify-circle-card-action-build.mjs'],cwd=stage,env=env,stdout=log,stderr=subprocess.STDOUT)
    if result.returncode:
        print(redact(log_path.read_text(errors='replace')[-14000:],env))
        raise RuntimeError(f'Candidate build failed. Live site unchanged. Log: {log_path}')
    dist = None
    for relative in ['.runtime/circle-card','.next']:
        candidate = stage/relative
        manifest = candidate/'server/app-paths-manifest.json'
        if manifest.is_file() and '/(public)/commissions/page' in json.loads(manifest.read_text()) and (candidate/'BUILD_ID').is_file():
            dist = candidate
            break
    if dist is None:
        raise RuntimeError('Compiled commissions page missing. Live site unchanged.')
    standalone = dist/'standalone'
    if (standalone/'server.js').is_file():
        shutil.copytree(stage/'public',standalone/'public',dirs_exist_ok=True)
        shutil.copytree(dist/'static',standalone/dist.relative_to(stage)/'static',dirs_exist_ok=True)
    runtime_user = prop(unit,'User')
    if runtime_user != 'circle-card-app':
        raise RuntimeError('Expected the existing restricted Circle Card runtime user.')
    account = pwd.getpwnam(runtime_user)
    if (dist/'cache').exists():
        run(['chown','-R',f'{account.pw_uid}:{account.pw_gid}',str(dist/'cache')])
    # Preserve the protected environment, user and billing validators verbatim.
    new_launcher_source = rewrite_launcher(launcher_source,str(live),str(stage),old_port,new_port)
    launcher_dir = Path('/opt/thebusinesscircle/circle-card-launchers')/f'commissions-{stamp}'
    launcher_dir.mkdir(mode=0o755)
    new_launcher = launcher_dir/'launch.mjs'
    new_launcher.write_text(new_launcher_source)
    new_launcher.chmod(0o644)
    run(['node','--check',str(new_launcher)],stdout=subprocess.DEVNULL)
    override = state/'runtime-override.env'
    override.write_text(f'PORT={new_port}\nHOSTNAME=127.0.0.1\n')
    override.chmod(0o600)
    new_unit = f'circle-card-commissions-{stamp}.service'
    unit_path = Path('/etc/systemd/system')/new_unit
    unit_path.write_text(rewrite_unit(unit_text,str(live),str(stage),str(launcher),str(new_launcher),str(override)))
    unit_path.chmod(0o600)
    backup = state/'nginx.previous.conf'
    backup.write_bytes(config.read_bytes())
    backup.chmod(0o600)
    changed_config = False
    try:
        run(['systemctl','daemon-reload'])
        run(['systemctl','start',new_unit])
        for attempt in range(40):
            try:
                health(new_port,'/login',{200})
                break
            except (OSError,RuntimeError,http.client.HTTPException):
                if attempt == 39: raise
                time.sleep(1)
        health(new_port,'/commissions',{200},b'Four clear steps')
        health(new_port,'/',{200},b'Explore commissions')
        health(new_port,'/pro',{200},b'How commissions work')
        health(new_port,'/card/hucknall-circle-hub',{200},b'Hucknall')
        health(new_port,'/sitemap.xml',{200},b'/commissions')
        headers,_ = health(new_port,'/app/share/commissions',{302,303,307,308})
        if '/login' not in next((v for k,v in headers.items() if k.lower()=='location'),''):
            raise RuntimeError('Private commission hub did not redirect to login.')
        if shutil.disk_usage('/').free < 6*1024**3:
            raise RuntimeError('Free disk below 6 GiB after build. Live site unchanged.')
        if config.read_text()!=original or prop(unit,'MainPID')!=pid:
            raise RuntimeError('Live release changed during build. Refusing to switch.')
        config.write_text(rewrite_nginx(original,str(live),str(stage),old_port,new_port))
        changed_config = True
        run(['nginx','-t'])
        run(['systemctl','reload','nginx'])
        for path,token in [('/commissions',b'Four clear steps'),('/',b'Explore commissions'),('/pro',b'How commissions work')]:
            with urllib.request.urlopen('https://circlecard.co.uk'+path+'?commissions_release='+stamp,timeout=30) as response:
                data=response.read(5*1024*1024)
                if response.status!=200 or token not in data:
                    raise RuntimeError('Public release health check failed.')
        run(['systemctl','enable',new_unit])
        record={'status':'PUBLIC_PAGES_DEPLOYED_ACCOUNT_ACTIVATION_UNVERIFIED','release':str(stage),'service':new_unit,'previousService':unit,'previousRelease':str(live),'port':new_port,'previousPort':old_port,'nginxFile':str(config),'nginxBackup':str(backup),'patchCommit':PATCH_REF,'patchSha256':PATCH_SHA,'databaseWrites':False,'realTransfersInitiated':False,'liveAccountActivationVerified':False}
        (state/'deployment.json').write_text(json.dumps(record,indent=2))
        print('\nDEPLOYED: https://circlecard.co.uk/commissions',flush=True)
        print('Hub: https://circlecard.co.uk/app/share/commissions')
        print('Previous release retained and running:',unit)
        print('Release record:',state/'deployment.json')
        print('Real-account ON/OFF activation still needs verification. No terms, accounts, earnings or payouts were changed.')
    except Exception:
        if changed_config:
            config.write_bytes(backup.read_bytes())
            run(['nginx','-t'])
            run(['systemctl','reload','nginx'])
        subprocess.run(['systemctl','disable',new_unit],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        subprocess.run(['systemctl','stop',new_unit],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        diagnostic=subprocess.run(['journalctl','-u',new_unit,'-n','15','--no-pager'],text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
        print(redact(diagnostic.stdout[-8000:],env))
        raise

if __name__=='__main__':
    try:
        main()
    except Exception as error:
        print('STOPPED:',str(error),flush=True)
        raise SystemExit(1)
