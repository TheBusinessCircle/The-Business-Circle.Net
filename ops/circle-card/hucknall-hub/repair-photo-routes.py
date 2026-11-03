#!/usr/bin/env python3
"""Serve exactly four published town photos without changing application routing."""
import hashlib
import http.client
import importlib.util
import os
from pathlib import Path
import re
import shutil
import subprocess
import time

FILES = ('st-mary.jpg', 'town-centre.jpg', 'high-street.jpg', 'titchfield-park.jpg')
PHOTO_ROOT = Path('/var/www/circle-card-hucknall-photos')
MARKER = '# Hucknall public town photographs'


def import_verified(name, file, digest):
    path = Path(file)
    if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
        raise RuntimeError('Previously verified helper changed: ' + path.name)
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def matching_brace(source, opening):
    depth, quote, comment, escaped = 0, None, False, False
    for index in range(opening, len(source)):
        char = source[index]
        if comment:
            if char == '\n':
                comment = False
            continue
        if escaped:
            escaped = False
            continue
        if char == '\\':
            escaped = True
            continue
        if quote:
            if char == quote:
                quote = None
            continue
        if char in ('"', "'"):
            quote = char
        elif char == '#':
            comment = True
        elif char == '{':
            depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0:
                return index
    raise RuntimeError('Unbalanced Nginx server block.')


def patch_config(source, port):
    if MARKER in source:
        raise RuntimeError('Photo routes already installed; inspect their responses instead of duplicating them.')
    matches = []
    for match in re.finditer(r'(?m)^\s*server\s*\{', source):
        opening = source.index('{', match.start(), match.end())
        closing = matching_brace(source, opening)
        block = source[opening:closing]
        if re.search(r'proxy_pass\s+http://127\.0\.0\.1:' + str(port) + r'\s*;', block):
            matches.append(closing)
    if len(matches) != 1:
        raise RuntimeError('Expected exactly one server block for the current Circle Card proxy.')
    routes = '\n    ' + MARKER + '\n'
    for name in FILES:
        if re.search(r'location\s*=\s*/hucknall/photos/' + re.escape(name), source):
            raise RuntimeError('A target photo route already exists.')
        routes += f'''    location = /hucknall/photos/{name} {{
        alias {PHOTO_ROOT.as_posix()}/{name};
        default_type image/jpeg;
        add_header X-Content-Type-Options nosniff always;
        add_header Cache-Control "public, max-age=3600" always;
    }}
'''
    return source[:matches[0]] + routes + source[matches[0]:]


def verify_image(context, name, digest):
    import socket
    raw = socket.create_connection(('127.0.0.1', 443), timeout=15)
    try:
        secure = context.wrap_socket(raw, server_hostname='circlecard.co.uk')
    except Exception:
        raw.close()
        raise
    conn = http.client.HTTPConnection('circlecard.co.uk', 443, timeout=15)
    conn.sock = secure
    try:
        conn.request('GET', '/hucknall/photos/' + name, headers={'Host': 'circlecard.co.uk'})
        response = conn.getresponse()
        body = response.read(3 * 1024 * 1024 + 1)
        if response.status != 200 or not (response.getheader('Content-Type') or '').startswith('image/jpeg') or hashlib.sha256(body).hexdigest() != digest:
            raise RuntimeError('Photo response verification failed: ' + name + ' HTTP ' + str(response.status))
    finally:
        conn.close()


def main():
    if os.geteuid() != 0:
        raise RuntimeError('Run in the existing root SSH session.')
    native = import_verified('native', '/root/hucknall-native.py', '3ed8958349bb91edec2ee73600082ca26c7b9083a7e2cf2ec203528de32e5e78')
    retirement = import_verified('retirement', '/root/circle-card-retire-unused.py', 'cde0a6029a523bd5758ea6637a00dd724364b212e15db34e02da951b01ee2733')
    config_file = Path('/etc/nginx/sites-enabled/circlecard.co.uk').resolve()
    original = config_file.read_text()
    live, unit, port, _ = native.discover_live(original)
    updated = patch_config(original, port)
    nginx = subprocess.check_output(['nginx', '-T'], text=True, stderr=subprocess.PIPE)
    context = retirement.origin_tls_context(nginx)
    retirement.health(port, nginx)
    sources = {}
    for name in FILES:
        source = live / 'public/hucknall/photos' / name
        if not source.resolve().is_relative_to(live.resolve()):
            raise RuntimeError('Photo source is outside the current release.')
        data = source.read_bytes()
        if not data.startswith(b'\xff\xd8\xff') or len(data) > 3 * 1024 * 1024:
            raise RuntimeError('Expected a bounded JPEG photo: ' + name)
        sources[name] = (source, hashlib.sha256(data).hexdigest())
    if PHOTO_ROOT.exists() and (PHOTO_ROOT.is_symlink() or PHOTO_ROOT.stat().st_uid != 0):
        raise RuntimeError('Unexpected existing public photo directory.')
    PHOTO_ROOT.mkdir(mode=0o755, exist_ok=True)
    PHOTO_ROOT.chmod(0o755)
    for name, (source, digest) in sources.items():
        target = PHOTO_ROOT / name
        if target.is_symlink() or (target.exists() and hashlib.sha256(target.read_bytes()).hexdigest() != digest):
            raise RuntimeError('An existing photo differs; refusing to overwrite it.')
        shutil.copyfile(source, target)
        target.chmod(0o644)
    state = Path('/var/lib/circle-card-hucknall') / ('photo-routes-' + time.strftime('%Y%m%d-%H%M%S', time.gmtime()))
    state.mkdir(mode=0o700)
    backup = state / 'nginx.previous.conf'
    backup.write_text(original)
    backup.chmod(0o600)
    if config_file.read_text() != original:
        raise RuntimeError('Nginx configuration changed; nothing switched.')
    try:
        config_file.write_text(updated)
        subprocess.run(['nginx', '-t'], check=True)
        subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
        # A graceful reload can briefly leave old workers handling requests.
        for attempt in range(8):
            try:
                for name, (_, digest) in sources.items():
                    verify_image(context, name, digest)
                break
            except (OSError, RuntimeError, http.client.HTTPException):
                if attempt == 7:
                    raise
                time.sleep(1)
        retirement.health(port, nginx)
    except Exception:
        config_file.write_text(original)
        subprocess.run(['nginx', '-t'], check=True)
        subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
        raise
    print('REPAIRED: all four Hucknall photographs return HTTP 200 with verified JPEG bytes.')
    print('Live application retained:', unit)
    print('Rollback configuration:', backup)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        raise SystemExit('STOPPED: ' + str(error))
