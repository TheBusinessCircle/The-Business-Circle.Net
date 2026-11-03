"""Download attributed, reusable town photographs into the isolated release."""
import json
from pathlib import Path
import re
import urllib.request

root = Path.cwd().resolve()
if not str(root).startswith('/var/www/releases/circle-card-hucknall-'):
    raise RuntimeError('Expected the isolated Hucknall stage.')
target = root / 'public/hucknall/photos'
target.mkdir(parents=True, exist_ok=True)
if not target.resolve().is_relative_to(root):
    raise RuntimeError('Photo directory resolves outside the stage.')
for photo in json.loads(Path(__file__).with_name('photos.json').read_text()):
    if not re.fullmatch(r'[a-z-]+\.jpg', photo['file']) or not photo['url'].startswith('https://upload.wikimedia.org/wikipedia/commons/'):
        raise RuntimeError('Unexpected photo manifest entry.')
    request = urllib.request.Request(photo['url'], headers={'User-Agent': 'CircleCard-Hucknall/1.0 (support@circlecard.co.uk)'})
    with urllib.request.urlopen(request, timeout=45) as response:
        if response.geturl().split('/')[2] != 'upload.wikimedia.org':
            raise RuntimeError('Unexpected image redirect.')
        data = response.read(3 * 1024 * 1024 + 1)
    if not data.startswith(b'\xff\xd8\xff') or len(data) > 3 * 1024 * 1024:
        raise RuntimeError('Expected a JPEG photograph below 3 MiB.')
    destination = target / photo['file']
    if destination.is_symlink():
        raise RuntimeError('Refusing a symlinked photo target.')
    destination.write_bytes(data)
    destination.chmod(0o644)
    print('Prepared Hucknall photograph:', photo['file'], flush=True)
