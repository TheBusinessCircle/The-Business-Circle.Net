"""Prepare only the isolated stage and an additive directory migration."""
import hashlib
import importlib.util
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.parse
import uuid


def main():
    stage = Path.cwd().resolve()
    state = Path(sys.argv[1]).resolve()
    if not str(stage).startswith('/var/www/releases/circle-card-hucknall-'):
        raise RuntimeError('Expected an isolated Hucknall release.')
    if not str(state).startswith('/var/lib/circle-card-hucknall/'):
        raise RuntimeError('Expected the private deployment state directory.')
    patch_path = Path(__file__).with_name('native-patches.py')
    spec = importlib.util.spec_from_file_location('native_patches', patch_path)
    patches = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(patches)
    transforms = {
        'src/components/circle-card/public-circle-card-profile.tsx': patches.patch_profile,
        'src/lib/circle-card/plan-policy.ts': patches.patch_plan_policy,
        'prisma/schema.prisma': patches.patch_schema,
        'src/app/robots.ts': patches.patch_robots,
    }
    for relative, transform in transforms.items():
        target = stage / relative
        if not target.resolve().is_relative_to(stage):
            raise RuntimeError('A source file resolves outside the isolated release.')
        target.write_text(transform(target.read_text()))
    for relative in ['node_modules', 'node_modules/@prisma/client', 'node_modules/.prisma']:
        target = stage / relative
        if target.exists() and not target.resolve().is_relative_to(stage):
            raise RuntimeError('The Prisma dependency store is shared; scoped generation needs review.')
    log = state / 'prisma-generate.log'
    with log.open('w') as output:
        log.chmod(0o600)
        result = subprocess.run(['node', 'node_modules/prisma/build/index.js', 'generate'], stdout=output, stderr=subprocess.STDOUT)
    if result.returncode:
        raise RuntimeError('Scoped Prisma generation failed. Inspect ' + str(log))
    database = urllib.parse.unquote(urllib.parse.urlparse(os.environ.get('DATABASE_URL', '')).path.lstrip('/'))
    if not re.fullmatch(r'[A-Za-z0-9_]+', database):
        raise RuntimeError('Expected a named local application database.')
    migration = '20261102233000_circle_card_local_business_hubs'
    sql = (stage / 'prisma/migrations' / migration / 'migration.sql').read_text()
    checksum = hashlib.sha256(sql.encode()).hexdigest()
    command = ['sudo', '-u', 'postgres', '--', 'psql', '-XqAt', '--set=ON_ERROR_STOP=1', '--dbname=' + database, '--file=-']
    query = f"SELECT checksum FROM \"_prisma_migrations\" WHERE migration_name='{migration}' AND finished_at IS NOT NULL AND rolled_back_at IS NULL;"
    existing = subprocess.check_output(command, input=query, text=True, cwd='/tmp').strip()
    if existing and existing != checksum:
        raise RuntimeError('Directory migration history differs; inspect before continuing.')
    if not existing:
        migration_sql = "BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s';\n" + sql + f"\nINSERT INTO \"_prisma_migrations\"(id,checksum,migration_name,finished_at,applied_steps_count) VALUES('{uuid.uuid4()}','{checksum}','{migration}',now(),1); COMMIT;"
        subprocess.run(command, input=migration_sql, text=True, cwd='/tmp', check=True)
    subprocess.run(['node', 'ops/circle-card/hucknall-hub/activate-native-hub.mjs', 'check', str(state / 'native-hub-before.json')], check=True)
    print('Native hub identity sources and additive directory fields are prepared.', flush=True)


if __name__ == '__main__':
    main()
