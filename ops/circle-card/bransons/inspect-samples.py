#!/usr/bin/env python3
"""Read-only discovery of the active sample integration. Never prints environment values."""
import json
from pathlib import Path
import re
import subprocess


def main():
    nginx = Path('/etc/nginx/sites-enabled/circlecard.co.uk').resolve()
    config = nginx.read_text()
    ports = set(re.findall(r'proxy_pass\s+http://127\.0\.0\.1:(\d+)', config))
    units = subprocess.check_output(['systemctl', 'list-units', '--type=service', '--state=running', '--no-legend', '--plain'], text=True)
    active = []
    for line in units.splitlines():
        unit = line.split()[0]
        if not unit.startswith('circle-card'):
            continue
        pid = subprocess.check_output(['systemctl', 'show', unit, '--value', '-p', 'MainPID'], text=True).strip()
        if not pid.isdigit() or pid == '0':
            continue
        try:
            env = dict(item.split(b'=', 1) for item in (Path('/proc') / pid / 'environ').read_bytes().split(b'\0') if b'=' in item)
            port = env.get(b'PORT', b'').decode()
            if port not in ports:
                continue
            root = (Path('/proc') / pid / 'cwd').resolve()
            active.append((unit, root, env))
        except (FileNotFoundError, PermissionError):
            continue
    if len(active) != 1:
        raise RuntimeError('Could not uniquely identify the active Circle Card service. No changes made.')
    unit, root, env = active[0]
    print('READ-ONLY SAMPLE CHECK')
    print('Service:', unit)
    print('Release:', root)
    print('Sample routes:')
    for line in config.splitlines():
        if re.search(r'samples|strelley|hayloft', line, re.I) and not re.search(r'password|secret|token|credential', line, re.I):
            print(line.strip())
    print('Sample renderer references:')
    found = 0
    for file in (root / 'src').rglob('*'):
        if file.suffix not in {'.ts', '.tsx'} or file.is_symlink():
            continue
        for number, line in enumerate(file.read_text(errors='replace').splitlines(), 1):
            if re.search(r'strelley|hayloft|circle-card-samples', line, re.I):
                print(f'{file.relative_to(root)}:{number}: {line[:650]}')
                found += 1
                if found >= 25:
                    break
        if found >= 25:
            break
    # Limit output to the existing sample entries on Trev's own cards.
    script = r'''
const {Client}=require('pg');
const db=new Client({connectionString:process.env.DATABASE_URL});
(async()=>{await db.connect();await db.query('BEGIN READ ONLY');
const {rows}=await db.query(`SELECT c.id,c.slug,c."fullName",c."contentBlocks",c."themeMetadata",
 COALESCE((SELECT json_agg(json_build_object('type',l.type,'label',l.label,'url',l.url,'sortOrder',l."sortOrder"))
 FROM "CircleCardLink" l WHERE l."cardId"=c.id AND (l.label ILIKE '%sample%' OR l.label ILIKE '%strelley%' OR l.url ILIKE '%strelley%')), '[]') AS links
 FROM "CircleCard" c WHERE c."archivedAt" IS NULL AND c."fullName" ILIKE '%trev%' AND c."fullName" ILIKE '%newton%'`);
function samples(x,path=''){if(!x||typeof x!=='object')return;for(const [k,v] of Object.entries(x)){const p=path+'.'+k;if(v&&typeof v==='object'){if(!Array.isArray(v)&&/strelley|hayloft/i.test(JSON.stringify(v))&&Object.values(v).some(t=>typeof t==='string'&&/strelley|hayloft/i.test(t))) console.log(p,JSON.stringify(v));else samples(v,p)}}}
for(const row of rows){console.log('Card:',row.id,row.slug,row.fullName);console.log('Sample links:',JSON.stringify(row.links));samples(row.contentBlocks,'contentBlocks');samples(row.themeMetadata,'themeMetadata')}
await db.query('ROLLBACK');await db.end()})().catch(async()=>{console.error('Sample data check unavailable; no data changed.');await db.end();process.exitCode=1});
'''
    decoded = {key.decode(): value.decode() for key, value in env.items()}
    subprocess.run(['node', '-e', script], cwd=root, env=decoded, check=False)
    print('No files, cards, billing or services were changed.')


if __name__ == '__main__':
    try:
        main()
    except Exception:
        raise SystemExit('Sample check stopped. No changes made; please share the displayed results.')
