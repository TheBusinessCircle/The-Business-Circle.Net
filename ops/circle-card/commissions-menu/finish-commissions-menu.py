#!/usr/bin/env python3
"""Finish the already-built menu release after validating the current release."""
import fcntl
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import time

STAMP = '20261104-225534'
OLD = Path('/var/www/releases/circle-card-hucknall-20261104-221648')
STAGE = Path('/var/www/releases/circle-card-commissions-menu-' + STAMP)
STATE = Path('/var/lib/circle-card-commissions-menu') / STAMP
UNIT = 'circle-card-commissions-menu-' + STAMP + '.service'
MENU = 'src/components/circle-card/circle-experience-shell.tsx'

def run(args, **kwargs):
    return subprocess.run(args, check=True, text=True, **kwargs)

def prop(unit, name):
    return subprocess.check_output(['systemctl','show',unit,'--value','-p',name],text=True).strip()

def files(root):
    result = {}
    for directory in ['src','public','scripts','prisma']:
        for path in (root/directory).rglob('*'):
            if path.is_file():
                result[str(path.relative_to(root))] = hashlib.sha256(path.read_bytes()).hexdigest()
    for name in ['package.json','package-lock.json','next.config.ts','tsconfig.json']:
        result[name] = hashlib.sha256((root/name).read_bytes()).hexdigest()
    return result

def health(port, path, statuses, token=None):
    import http.client
    connection = http.client.HTTPConnection('127.0.0.1',port,timeout=25)
    try:
        connection.request('GET',path,headers={'Host':'circlecard.co.uk','X-Forwarded-Proto':'https'})
        response = connection.getresponse()
        data = response.read()
        if response.status not in statuses or token is not None and token not in data:
            raise RuntimeError(f'Candidate check failed: {path} HTTP {response.status}')
        return response.getheader('Location','')
    finally:
        connection.close()

def main():
    if os.geteuid() != 0:
        raise RuntimeError('Run in the existing root session.')
    lock = open('/run/circle-card-commissions-menu-deploy.lock','w')
    fcntl.flock(lock,fcntl.LOCK_EX | fcntl.LOCK_NB)
    config = Path('/etc/nginx/sites-enabled/circlecard.co.uk').resolve()
    original = config.read_text()
    previous = STATE/'nginx.previous.conf'
    if not previous.is_file() or previous.read_text() != original:
        raise RuntimeError('nginx has changed since this build. No changes made.')
    if prop(UNIT,'WorkingDirectory') != str(STAGE) or prop(UNIT,'ActiveState') != 'inactive':
        raise RuntimeError('The stopped candidate does not match the expected build.')
    old_units = []
    rows = subprocess.check_output(['systemctl','list-units','--type=service','--state=running','--no-legend','--plain'],text=True)
    for row in rows.splitlines():
        name = row.split()[0] if row.split() else ''
        if name.startswith('circle-card-') and prop(name,'WorkingDirectory') == str(OLD):
            old_units.append(name)
    if len(old_units) != 1:
        raise RuntimeError('Expected one running original service. No changes made.')
    old_unit = old_units[0]
    old_pid = prop(old_unit,'MainPID')
    if Path('/proc/'+old_pid+'/cwd').resolve() != OLD:
        raise RuntimeError('Original runtime directory differs.')
    before, after = files(OLD), files(STAGE)
    differences = {key for key in before.keys() | after.keys() if before.get(key) != after.get(key)}
    if differences != {MENU}:
        raise RuntimeError('Candidate contains unexpected source differences. No changes made.')
    old_menu = (OLD/MENU).read_text()
    new_menu = (STAGE/MENU).read_text()
    inserted = re.findall(r'<Link\b[^>]*href="/app/share/commissions"[^>]*>.*?</Link>',new_menu,re.S)
    matches = [link for link in inserted if new_menu.replace(link,'',1) == old_menu]
    if len(matches) != 1 or not re.search(r'>Commissions\s*</Link>$',matches[0]):
        raise RuntimeError('Could not verify the menu-only change.')
    if not re.search(r'href="/app/settings"[^>]*>.*?</Link>\s*'+re.escape(matches[0]),new_menu,re.S):
        raise RuntimeError('Commissions is not immediately below Settings.')
    dist = next((STAGE/p for p in ['.runtime/circle-card','.next'] if (STAGE/p/'BUILD_ID').is_file() and (STAGE/p/'server/app-paths-manifest.json').is_file()),None)
    if dist is None:
        raise RuntimeError('Completed build not found.')
    if not any(key.endswith('/app/share/commissions/page') for key in json.loads((dist/'server/app-paths-manifest.json').read_text())):
        raise RuntimeError('Compiled commissions route missing.')
    # Explicit trust is limited to this probe and the certificate nginx already uses.
    certificates = re.findall(r'(?m)^\s*ssl_certificate\s+([^;\s]+)\s*;',original)
    if not certificates or any(not Path(path).is_absolute() or not Path(path).is_file() for path in certificates):
        raise RuntimeError('Could not find nginx certificate files. No changes made.')
    trust = STATE/'origin-probe-certificates.pem'
    trust.write_bytes(b'\n'.join(Path(path).read_bytes() for path in certificates))
    trust.chmod(0o600)
    def origin_probe():
        result = subprocess.run(['curl','--fail','--silent','--show-error','--noproxy','*','--cacert',str(trust),'--resolve','circlecard.co.uk:443:127.0.0.1','--connect-timeout','10','--max-time','30','https://circlecard.co.uk/login'],text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        if result.returncode or 'Circle Card' not in result.stdout:
            raise RuntimeError('nginx HTTPS check failed: '+result.stderr.strip()[:500])
    origin_probe()
    pattern = r'(?m)^(\s*proxy_pass\s+)http://127\.0\.0\.1:3382(\s*;)'
    if len(re.findall(pattern,original)) != 1:
        raise RuntimeError('Original proxy target differs.')
    updated = re.sub(pattern,lambda m:m[1]+'http://127.0.0.1:3383'+m[2],original).replace(str(OLD),str(STAGE))
    changed = False
    started = False
    try:
        print('Reusing the completed build. Checking the candidate before switching.',flush=True)
        run(['systemctl','start',UNIT])
        started = True
        for attempt in range(30):
            try:
                health(3383,'/login',{200},b'Circle Card')
                break
            except Exception:
                if attempt == 29:
                    raise
                time.sleep(1)
        if Path('/proc/'+prop(UNIT,'MainPID')+'/cwd').resolve() != STAGE:
            raise RuntimeError('Candidate process directory differs.')
        health(3383,'/',{200},b'Circle Card')
        health(3383,'/card/hucknall-circle-hub',{200},b'Hucknall')
        if '/login' not in health(3383,'/app/share/commissions',{302,303,307,308}):
            raise RuntimeError('Private commissions route did not require login.')
        if config.read_text() != original or prop(old_unit,'MainPID') != old_pid:
            raise RuntimeError('The live release changed during checks.')
        changed = True
        config.write_text(updated)
        run(['nginx','-t'])
        run(['systemctl','reload','nginx'])
        origin_probe()
        run(['systemctl','enable',UNIT])
        (STATE/'deployment.json').write_text(json.dumps({'status':'COMMISSIONS_MENU_DEPLOYED_AUTHENTICATED_VISUAL_CHECK_PENDING','release':str(STAGE),'service':UNIT,'previousService':old_unit,'previousRelease':str(OLD),'nginxBackup':str(previous),'databaseWrites':False,'commissionActivationTested':False},indent=2))
        print('DEPLOYED: Commissions shortcut below Settings. Existing Share link preserved.',flush=True)
        print('Refresh Circle Card and open the account menu to check the shortcut.')
    except Exception:
        if changed:
            config.write_text(original)
            run(['nginx','-t'])
            run(['systemctl','reload','nginx'])
        if started:
            subprocess.run(['systemctl','disable',UNIT],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
            subprocess.run(['systemctl','stop',UNIT])
        raise

if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('STOPPED:',str(error),flush=True)
        raise SystemExit(1)
