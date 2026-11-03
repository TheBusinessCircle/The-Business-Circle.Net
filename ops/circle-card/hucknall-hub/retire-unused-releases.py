#!/usr/bin/env python3
"""Retire unreferenced historical Circle Card services, retaining live and rollback."""
import hashlib
import http.client
import importlib.util
import json
import os
from pathlib import Path
import re
import socket
import ssl
import subprocess
import time

INSTALLER_HASH = 'b6525609d4e0c015d0d0e2b6af377a1582a178f7779efb5233ee6dea6e89851c'
HISTORICAL_UNIT = re.compile(r'circle-card-(?:release-[a-f0-9]{7,40}-owned|lawrence-\d{8}-\d{6}|hucknall-\d{8}-\d{6})\.service')


def output(args):
    return subprocess.check_output(args, text=True, stderr=subprocess.PIPE).strip()


def referenced_ports(config):
    config = '\n'.join(line.split('#', 1)[0] for line in config.splitlines())
    upstreams = {}
    address = r'(?:127\.0\.0\.1|localhost|\[::1\]):(\d+)'
    for name, body in re.findall(r'\bupstream\s+([A-Za-z0-9_-]+)\s*\{([^{}]*)\}', config):
        backends = re.findall(r'\bserver\s+([^\s;]+)[^;]*;', body)
        ports = []
        for backend in backends:
            match = re.fullmatch(address, backend)
            if not match:
                # Keep unresolved groups explicitly unknown, never silently ignore them.
                upstreams[name] = None
                break
            ports.append(int(match.group(1)))
        else:
            if ports and (name not in upstreams or upstreams[name] is not None):
                upstreams.setdefault(name, set()).update(ports)
            else:
                upstreams[name] = None
    protected = {int(port) for port in re.findall(address + r'\b', config)}
    for target in re.findall(r'\bproxy_pass\s+([^;]+);', config):
        target = target.strip()
        if re.fullmatch(r'https?://' + address + r'(?:/[^\s;]*)?', target):
            continue
        named = re.fullmatch(r'https?://([A-Za-z0-9_-]+)(?:/[^\s;]*)?', target)
        if named and upstreams.get(named.group(1)):
            protected.update(upstreams[named.group(1)])
            continue
        raise RuntimeError('An unresolved proxy target requires review; no services retired.')
    return protected


def descendant_pids(main_pid, process_rows):
    found = {main_pid}
    pairs = [tuple(map(int, row.split())) for row in process_rows.splitlines() if len(row.split()) == 2]
    while True:
        children = {pid for pid, parent in pairs if parent in found}
        if children <= found:
            return found
        found |= children


def listening_ports(pids, socket_rows):
    ports = set()
    for row in socket_rows.splitlines():
        fields = row.split()
        if len(fields) < 5 or not pids.intersection(map(int, re.findall(r'pid=(\d+)', row))):
            continue
        match = re.search(r':(\d+)$', fields[3])
        if match:
            ports.add(int(match.group(1)))
    return ports


def may_retire(unit, ports, protected, keep):
    return bool(HISTORICAL_UNIT.fullmatch(unit) and unit not in keep and ports and not ports.intersection(protected))


def service_info(unit):
    fields = ['MainPID', 'WorkingDirectory', 'FragmentPath', 'DropInPaths', 'BoundBy', 'ConsistsOf', 'PropagatesStopTo']
    rows = output(['systemctl', 'show', unit, *['--property=' + name for name in fields]])
    return dict(row.split('=', 1) for row in rows.splitlines() if '=' in row)


def login_health(conn, label):
    try:
        conn.request('GET', '/login', headers={'Host': 'circlecard.co.uk', 'X-Forwarded-Proto': 'https'})
        response = conn.getresponse()
        response.read()
        if response.status != 200:
            raise RuntimeError(label + ' login health changed: HTTP ' + str(response.status))
    finally:
        conn.close()


def configured_certificate_paths(config):
    config = '\n'.join(line.split('#', 1)[0] for line in config.splitlines())
    tokens = re.findall(r'''\bssl_certificate\s+("[^"]+"|'[^']+'|[^;\s]+)\s*;''', config)
    paths = {token.strip('\"\'') for token in tokens}
    if not paths or any(not path.startswith('/') or '$' in path for path in paths):
        raise RuntimeError('Static Nginx certificate paths could not be identified.')
    return sorted(paths)


def origin_tls_context(config):
    context = ssl.create_default_context()
    for raw_path in configured_certificate_paths(config):
        certificate = Path(raw_path).resolve(strict=True)
        info = certificate.stat()
        if not certificate.is_file() or info.st_uid != 0 or info.st_mode & 0o022:
            raise RuntimeError('Configured origin certificate must be a root-owned file without group/world write access.')
        # Trust the certificate already installed by the server administrator, only
        # within this health-check context. Do not alter the system trust store.
        context.load_verify_locations(cafile=str(certificate))
    context.verify_flags |= ssl.VERIFY_X509_PARTIAL_CHAIN
    return context


def health(port, nginx_config=None):
    login_health(http.client.HTTPConnection('127.0.0.1', port, timeout=15), 'Live Circle Card')
    # Exercise the actual Nginx TLS virtual host without an external DNS/CDN request.
    # Certificate validation, hostname checking and SNI remain enabled.
    context = origin_tls_context(nginx_config) if nginx_config is not None else ssl.create_default_context()
    raw = socket.create_connection(('127.0.0.1', 443), timeout=15)
    try:
        secure = context.wrap_socket(raw, server_hostname='circlecard.co.uk')
    except Exception:
        raw.close()
        raise
    proxy = http.client.HTTPConnection('circlecard.co.uk', 443, timeout=15)
    proxy.sock = secure
    login_health(proxy, 'Nginx Circle Card TLS')


def main():
    if os.geteuid() != 0:
        raise RuntimeError('Run in the existing root SSH session.')
    installer = Path('/root/hucknall-native.py')
    if hashlib.sha256(installer.read_bytes()).hexdigest() != INSTALLER_HASH:
        raise RuntimeError('The previously verified native installer changed.')
    spec = importlib.util.spec_from_file_location('verified_installer', installer)
    native = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(native)
    nginx_file = Path('/etc/nginx/sites-enabled/circlecard.co.uk').resolve()
    original = nginx_file.read_text()
    live, live_unit, live_port, _ = native.discover_live(original)
    stamp = live.name.removeprefix('circle-card-hucknall-')
    if not re.fullmatch(r'\d{8}-\d{6}', stamp):
        raise RuntimeError('Expected the current Hucknall private-preview release.')
    record = json.loads((Path('/var/lib/circle-card-hucknall') / stamp / 'deployment.json').read_text())
    if record['service'] != live_unit or record['release'] != str(live) or record['port'] != live_port:
        raise RuntimeError('Live release does not match its deployment record.')
    previous = record['previous_service']
    if not HISTORICAL_UNIT.fullmatch(previous) or previous == live_unit:
        raise RuntimeError('The immediate rollback service could not be identified.')
    if output(['systemctl', 'is-active', previous]) != 'active':
        raise RuntimeError('The immediate rollback service must remain running.')
    keep = {live_unit, previous}
    live_pid = service_info(live_unit).get('MainPID')
    if not live_pid or not live_pid.isdigit() or int(live_pid) < 2:
        raise RuntimeError('The live process could not be identified.')
    nginx = output(['nginx', '-T'])
    protected = referenced_ports(nginx) | {live_port, int(record['previous_port'])}
    units = [row.split()[0] for row in output(['systemctl', 'list-units', '--type=service', '--state=running', '--no-legend', '--plain']).splitlines() if row.split()]
    candidates = []
    for unit in units:
        if not HISTORICAL_UNIT.fullmatch(unit) or unit in keep:
            continue
        info = service_info(unit)
        root = Path(info.get('WorkingDirectory', '')).resolve()
        if not str(root).startswith('/var/www/releases/circle-card-') or not root.is_dir():
            continue
        if any(info.get(field) for field in ['DropInPaths', 'BoundBy', 'ConsistsOf', 'PropagatesStopTo']):
            continue
        text = Path(info['FragmentPath']).read_text()
        if re.search(r'^\s*ExecStop(?:Post)?\s*=\s*\S', text, re.M):
            continue
        pid = int(info.get('MainPID', '0'))
        if pid < 2 or (Path('/proc') / str(pid) / 'cwd').resolve() != root:
            continue
        pids = descendant_pids(pid, output(['ps', '-eo', 'pid=,ppid=']))
        ports = listening_ports(pids, output(['ss', '-H', '-ltnp']))
        if may_retire(unit, ports, protected, keep):
            enabled = subprocess.run(['systemctl', 'is-enabled', unit], text=True, capture_output=True).stdout.strip()
            if enabled in ['enabled', 'disabled', 'static']:
                candidates.append({'unit': unit, 'pid': pid, 'ports': sorted(ports), 'enabled': enabled})
    health(live_port, nginx)
    print('KEEP live:', live_unit, 'port', live_port, flush=True)
    print('KEEP rollback:', previous, 'port', record['previous_port'], flush=True)
    if not candidates:
        raise RuntimeError('No proven unused historical services were found; nothing stopped.')
    state = Path('/var/lib/circle-card-hucknall') / ('retire-' + time.strftime('%Y%m%d-%H%M%S', time.gmtime()))
    state.mkdir(mode=0o700)
    plan = state / 'services.json'
    plan.write_text(json.dumps({'keep': sorted(keep), 'services': candidates}, indent=2))
    plan.chmod(0o600)
    stopped = []
    try:
        for item in candidates:
            if nginx_file.read_text() != original or output(['nginx', '-T']) != nginx:
                raise RuntimeError('Nginx configuration changed; retirement stopped.')
            if service_info(live_unit).get('MainPID') != live_pid:
                raise RuntimeError('Live service identity changed.')
            current = service_info(item['unit'])
            pids = descendant_pids(item['pid'], output(['ps', '-eo', 'pid=,ppid=']))
            ports = listening_ports(pids, output(['ss', '-H', '-ltnp']))
            if current.get('MainPID') != str(item['pid']) or ports != set(item['ports']) or not may_retire(item['unit'], ports, protected, keep):
                raise RuntimeError('A candidate service changed; retirement stopped.')
            stopped.append(item)
            subprocess.run(['systemctl', 'stop', item['unit']], check=True)
            if item['enabled'] == 'enabled':
                subprocess.run(['systemctl', 'disable', item['unit']], check=True)
            health(live_port, nginx)
            print('RETIRED:', item['unit'], 'ports', ','.join(map(str, ports)), flush=True)
    except Exception:
        for item in stopped:
            if item['enabled'] == 'enabled':
                subprocess.run(['systemctl', 'enable', item['unit']], check=True)
            subprocess.run(['systemctl', 'start', item['unit']], check=True)
        raise
    health(live_port, nginx)
    print('Historical units and release files retained. Restore record:', plan, flush=True)
    subprocess.run(['free', '-m'], check=True)
    available_mib = next(int(line.split()[1]) for line in Path('/proc/meminfo').read_text().splitlines() if line.startswith('MemAvailable:')) // 1024
    if available_mib < 4096:
        raise RuntimeError(f'Cleanup completed, but only {available_mib} MiB available. Do not retry the known-insufficient 2 GiB build; a 3 GiB heap needs 4096 MiB available.')
    print('READY: at least 4096 MiB available for the 3 GiB build budget.', flush=True)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        raise SystemExit('STOPPED: ' + str(error))
