#!/usr/bin/env python3
"""Finish the verified Bransons account build without rebuilding the application."""
import fcntl
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import time

STAMP = '20261109-115143'
STATE = Path('/var/lib/circle-card-bransons-account') / STAMP
STAGE = Path('/var/www/releases/circle-card-bransons-account-' + STAMP)
UNIT = 'circle-card-bransons-account-' + STAMP + '.service'
INSTALLER = Path('/root/bransons-account-custom.py')
INSTALLER_SHA = '65cf47f8aa72b93962f8c846b43c554ceb3bb255574a997411090d2d4805c451'


def certificate_bundle(config):
    paths = list(dict.fromkeys(re.findall(r'(?m)^\s*ssl_certificate\s+([^;\s]+)\s*;', config)))
    if not paths or any(not Path(path).is_absolute() or not Path(path).is_file() for path in paths):
        raise RuntimeError('Could not identify the existing origin certificate. No switch attempted.')
    data = b'\n'.join(Path(path).read_bytes() for path in paths)
    if b'-----BEGIN CERTIFICATE-----' not in data or b'PRIVATE KEY' in data:
        raise RuntimeError('The configured certificate bundle is not valid.')
    return data


def origin_probe(path, trust, expected):
    result = subprocess.run(['curl','--fail','--silent','--show-error','--noproxy','*',
        '--cacert',str(trust),'--resolve','circlecard.co.uk:443:127.0.0.1',
        '--connect-timeout','10','--max-time','30','https://circlecard.co.uk'+path],
        stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    if result.returncode:
        raise RuntimeError('Origin HTTPS check failed: ' + result.stderr.decode('utf-8',errors='replace')[:1000])
    if expected not in result.stdout:
        raise RuntimeError('Origin HTTPS response did not contain the expected page.')


def main():
    if os.geteuid() != 0:
        raise RuntimeError('Run in the existing root server session.')
    lock = open('/run/circle-card-bransons-account-deploy.lock','w')
    fcntl.flock(lock,fcntl.LOCK_EX | fcntl.LOCK_NB)
    if hashlib.sha256(INSTALLER.read_bytes()).hexdigest() != INSTALLER_SHA:
        raise RuntimeError('The original checked installer differs. No switch attempted.')
    spec = importlib.util.spec_from_file_location('bransons_account',INSTALLER)
    base = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(base)
    config = base.NGINX.resolve()
    original = config.read_text()
    if (STATE/'deployment.json').exists():
        record = json.loads((STATE/'deployment.json').read_text())
        if record.get('service') == UNIT and base.prop(UNIT,'ActiveState') == 'active':
            print('ALREADY DEPLOYED: Refresh Bransons in your account to see Custom beside Free and Pro.')
            return
        raise RuntimeError('A previous deployment record needs review.')
    if original != (STATE/'nginx.previous.conf').read_text():
        raise RuntimeError('Nginx changed since the completed build. No switch attempted.')
    if not STAGE.is_dir() or STAGE.is_symlink():
        raise RuntimeError('The completed isolated build is missing.')
    log = STATE/'build.log'
    if 'Circle Card production server-action exports verified.' not in log.read_text(errors='replace'):
        raise RuntimeError('No successful build verification is recorded.')
    unit, live, pid, _, launcher, launcher_source, old_port, new_port = base.discover(original)
    if new_port != 3386 or old_port != 3385:
        raise RuntimeError('The expected candidate port is not available. No switch attempted.')
    if base.prop(UNIT,'WorkingDirectory') != str(STAGE) or base.prop(UNIT,'User') != 'circle-card-app' or base.prop(UNIT,'DropInPaths'):
        raise RuntimeError('The candidate service configuration changed.')
    candidate_launcher = Path('/opt/thebusinesscircle/circle-card-launchers/bransons-account-' + STAMP + '/launch.mjs')
    expected_launcher = base.rewrite_launcher(launcher_source,str(live),str(STAGE),old_port,new_port)
    if candidate_launcher.read_text() != expected_launcher:
        raise RuntimeError('The candidate protected launcher differs from the checked configuration.')
    source_before = {relative:(STATE/'source-backup'/relative).read_text() for relative in [base.PREVIEW,base.SHELF]}
    expected = {base.PREVIEW:base.patch_preview(source_before[base.PREVIEW]),base.SHELF:base.patch_shelf(source_before[base.SHELF]),base.COMPONENT:base.BRANSONS_COMPONENT}
    for relative, content in expected.items():
        if (STAGE/relative).read_text() != content:
            raise RuntimeError('The staged Custom account source differs: ' + relative)
    for relative, content in source_before.items():
        if (live/relative).read_text() != content:
            raise RuntimeError('The live account source changed since the build.')
    for relative in ['package.json','package-lock.json','next.config.ts','next.config.mjs','next.config.js']:
        if (live/relative).is_file() and (STAGE/relative).read_bytes() != (live/relative).read_bytes():
            raise RuntimeError('The staged runtime configuration differs: ' + relative)
    compiled = False
    for relative in ['.runtime/circle-card','.next']:
        dist = STAGE/relative
        manifest = dist/'server/app-paths-manifest.json'
        if manifest.is_file() and (dist/'BUILD_ID').is_file() and any(key.endswith('/app/prepared/[preparedId]/preview/page') for key in json.loads(manifest.read_text())):
            compiled = True
    if not compiled:
        raise RuntimeError('The completed preview is missing from the build manifest.')
    trust = STATE/'origin-probe-certificates.pem'
    trust.write_bytes(certificate_bundle(original))
    trust.chmod(0o600)
    print('1/3 Reusing the completed build. Checking the existing origin certificate.',flush=True)
    # Confirm this probe works against the current configuration before switching.
    origin_probe('/login?bransons_finish=before-'+STAMP,trust,b'Circle Card')
    changed = False
    try:
        base.run(['systemctl','start',UNIT])
        for attempt in range(30):
            try:
                base.health(new_port,'/login',{200})
                break
            except (OSError,RuntimeError):
                if attempt == 29:
                    raise
                time.sleep(1)
        for route in ['/app/prepared',f'/app/prepared/{base.CARD_ID}/preview?plan=pro&presentation=custom']:
            headers,_ = base.health(new_port,route,{302,303,307,308})
            if '/login' not in next((value for key,value in headers.items() if key.lower()=='location'),''):
                raise RuntimeError('The account preview did not require sign-in.')
        base.health(new_port,'/card/hucknall-circle-hub',{200},b'Hucknall')
        print('2/3 Switching to the checked account build.',flush=True)
        if config.read_text() != original or base.prop(unit,'MainPID') != pid:
            raise RuntimeError('The live release changed during checks. No switch attempted.')
        config.write_text(base.rewrite_nginx(original,str(live),str(STAGE),old_port,new_port))
        changed = True
        base.run(['nginx','-t'])
        base.run(['systemctl','reload','nginx'])
        print('3/3 Verifying Nginx HTTPS and the custom sample.',flush=True)
        origin_probe('/login?bransons_finish=after-'+STAMP,trust,b'Circle Card')
        origin_probe('/samples/bransons.html',trust,b'Bransons | Custom Circle Card sample')
        base.run(['systemctl','enable',UNIT])
        (STATE/'deployment.json').write_text(json.dumps({'status':'BRANSONS_ACCOUNT_CUSTOM_DEPLOYED','release':str(STAGE),'service':UNIT,'previousService':unit,'previousRelease':str(live),'port':new_port,'nginxFile':str(config),'nginxBackup':str(STATE/'nginx.previous.conf'),'sourceHashes':{key:hashlib.sha256(value.encode()).hexdigest() for key,value in expected.items()},'signedInVerificationPending':True},indent=2))
        print('\nDEPLOYED: Bransons Custom is installed on the account sample shelf and beside Free and Pro in its preview.')
        print(f'Open: https://circlecard.co.uk/app/prepared/{base.CARD_ID}/preview?plan=pro&presentation=custom')
        print('Refresh your account and check Custom. No database or billing changes were made.')
    except Exception:
        if changed:
            config.write_text(original)
            base.run(['nginx','-t'])
            base.run(['systemctl','reload','nginx'])
        subprocess.run(['systemctl','stop',UNIT],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        raise


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('STOPPED:',str(error),flush=True)
        raise SystemExit(1)
