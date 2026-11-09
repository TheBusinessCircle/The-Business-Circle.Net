#!/usr/bin/env python3
"""Install the static custom sample and attach an owned native prepared draft."""
import base64
import datetime
import fcntl
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import urllib.request

REF = '6fee108425b7deeb57bd0aea0812979cf1ed82e3'
HTML_SHA = 'd82011686f1d3dec6b653a060cf0336b24eac8541b25d338fec836f771fcb867'
LIVE = Path('/var/www/releases/circle-card-pro-custom-upgrades-20261105-113606')
UNIT = 'circle-card-pro-custom-upgrades-20261105-113606.service'
ORIGIN = 'https://circlecard.co.uk'
ASSETS = Path('/var/www/circle-card-samples-bransons') / HTML_SHA[:16]
ROUTES = {'/samples/bransons.html': 'bransons.html', '/samples/bransons-kitchen.jpg': 'kitchen.jpg', '/samples/bransons-bathroom.jpg': 'bathroom.jpg'}
BEGIN = '    # BEGIN BRANSONS CUSTOM SAMPLE v1\n'
END = '    # END BRANSONS CUSTOM SAMPLE v1\n'

NODE = r'''
const mode=process.argv[1];
let stage='load TypeScript support';
(async()=>{
 // BEGIN JS TYPESCRIPT LOADER
 // Read the existing source without invoking esbuild or changing release permissions.
 const ts=require('typescript'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
 const sourceRoot=path.join(process.cwd(),'src');
 const resolveFilename=Module._resolveFilename;
 Module._resolveFilename=function(request,parent,...options){
   if(request.startsWith('@/')){
     request=path.resolve(sourceRoot,request.slice(2));
     if(!request.startsWith(sourceRoot+path.sep))throw Error('SOURCE_ALIAS_OUTSIDE_RELEASE');
   }
   return resolveFilename.call(this,request,parent,...options);
 };
 for(const extension of ['.ts','.tsx'])Module._extensions[extension]=function(module,filename){
   const compiled=ts.transpileModule(fs.readFileSync(filename,'utf8'),{
     fileName:filename,
     compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}
   });
   module._compile(compiled.outputText,filename);
 };
 // END JS TYPESCRIPT LOADER
 stage='load the live database client';
 const {prisma}=require('./src/lib/prisma.ts');
 try {
 stage='load prepared-card validation';
 const {parsePreparedPayload,PREPARED_CARDS_FOUNDER_EMAIL}=require('./src/lib/circle-card/prepared-cards.ts');
 if(PREPARED_CARDS_FOUNDER_EMAIL.toLowerCase()!=='admin@thebusinesscircle.net')throw Error('FOUNDER_CONTRACT_CHANGED');
 const link=(label,url)=>({label,url,description:''});
 const origin='https://circlecard.co.uk';
 stage='validate Bransons payload';
 const payload=parsePreparedPayload({
 name:'Bransons',headline:'Home. Garden. Aquatics. A world of ideas in Hucknall.',
 about:'A family-run business in Hucknall offering fitted kitchens, bathrooms, DIY, gardening and specialist aquatics and reptile departments. Speak to the team about kitchen design and quotations, supply-only options or installation.\n\nOpen the custom Bransons Circle Card using the first link below.\n\nIndependent ScaleSmiths demonstration, awaiting business approval. This prepared record is private and unclaimed. Published hours: Monday to Friday 9am–5:30pm, Saturday 9am–4pm and Sunday 9:30am–2pm. Check with Bransons before travelling.',
 website:'https://www.bransons-hga.co.uk/',email:'',phone:'0115 963 2015',location:'75–79 Watnall Road, Hucknall, Nottingham, NG15 7NL',
 profileImage:origin+'/samples/bransons-kitchen.jpg',logoImage:'',
 links:[link('View custom Bransons Circle Card',origin+'/samples/bransons.html'),link('Explore kitchens','https://www.bransons-hga.co.uk/kitchens'),link('Explore bathrooms','https://www.bransons-hga.co.uk/bathrooms'),link('DIY and hardware','https://www.bransons-hga.co.uk/diy'),link('Aquatics and reptiles','https://www.bransons-hga.co.uk/aquatics'),link('Plan your visit','https://www.bransons-hga.co.uk/contact')],
 gallery:[{title:'Kitchen inspiration',imageUrl:origin+'/samples/bransons-kitchen.jpg',description:'Reference photograph from the official Bransons website.'},{title:'Bathroom inspiration',imageUrl:origin+'/samples/bransons-bathroom.jpg',description:'Reference photograph from the official Bransons website.'}],
 services:[{title:'Kitchens',description:'Discuss fitted kitchens, free design and quotations, with supply or installation options.'},{title:'Bathrooms',description:'Explore fitted bathroom options with advice about your space.'},{title:'Home, garden and aquatics',description:'Visit the local DIY, gardening, aquatics and reptile departments.'}]
 });
 if(payload.name!=='Bransons'||payload.links[0]?.url!==origin+'/samples/bransons.html')throw Error('PAYLOAD_VALIDATION_CHANGED');
 stage='check founder account and existing samples';
 const result=await prisma.$transaction(async tx=>{
 const owner=await tx.user.findUnique({where:{email:PREPARED_CARDS_FOUNDER_EMAIL},select:{id:true,email:true,suspended:true,circleCardOperatorAccess:true}});
 if(!owner||owner.suspended||!owner.circleCardOperatorAccess?.active||!owner.circleCardOperatorAccess.canViewMembers)throw Error('OWNER_NOT_AUTHORISED');
 await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'circle-owner:'+owner.id}))`;
 await tx.$queryRaw`SELECT id FROM "User" WHERE id=${owner.id} FOR SHARE`;
 const strelley=await tx.circleCardPrepared.findFirst({where:{creatorUserId:owner.id,presetKey:'STRELLEY_HALL',status:{not:'ARCHIVED'}}});
 if(!strelley)throw Error('EXISTING_SAMPLE_OWNER_NOT_CONFIRMED');
 const existing=await tx.circleCardPrepared.findMany({where:{creatorUserId:owner.id,OR:[{presetKey:'BRANSONS_CUSTOM_SAMPLE'},{payload:{path:['name'],equals:'Bransons'}}]}});
 if(existing.length>1)throw Error('MULTIPLE_BRANSONS_DRAFTS_REQUIRE_REVIEW');
 if(existing.length){const row=existing[0];if(row.presetKey!=='BRANSONS_CUSTOM_SAMPLE'||row.status!=='DRAFT'||row.isPublic||row.payload?.links?.[0]?.url!==origin+'/samples/bransons.html')throw Error('EXISTING_BRANSONS_CARD_PRESERVED_REVIEW_REQUIRED');return {status:'EXISTING_SAMPLE_PRESERVED',id:row.id,slug:row.slug};}
 if(mode==='check')return {status:'READY_TO_ATTACH'};
 if(mode!=='activate')throw Error('INVALID_MODE');
 const slug='bransons-'+require('node:crypto').randomBytes(6).toString('hex');
 const row=await tx.circleCardPrepared.create({data:{creatorUserId:owner.id,presetKey:'BRANSONS_CUSTOM_SAMPLE',slug,payload,isPublic:false,status:'DRAFT'}});
 return {status:'BRANSONS_ATTACHED_TO_PREPARED_SHELF',id:row.id,slug:row.slug};
 },{isolationLevel:'Serializable'});
 console.log(JSON.stringify(result));
 } finally {await prisma.$disconnect();}
})().catch(error=>{
 if(/^[A-Z_]+$/.test(error.message))console.error(error.message);
 else {
 let message=String(error.message||'Unknown error');
 for(const [key,value] of Object.entries(process.env||{})){
 if(/secret|password|token|database_url|api_key|credential/i.test(key)&&value&&value.length>=6)message=message.split(value).join('[redacted]');
 }
 message=message.replace(/\b(?:postgres(?:ql)?|https?):\/\/[^\s"']+/gi,'[redacted URL]');
 console.error('BRANSONS_DIAGNOSTIC '+JSON.stringify({stage,name:error.name,code:error.code,message:message.slice(0,1600)}));
 }
 process.exitCode=1;
});
'''


def run(args, **kwargs):
    kwargs.setdefault('text', True)
    return subprocess.run(args, check=True, **kwargs)


def prop(name):
    return subprocess.check_output(['systemctl', 'show', UNIT, '--value', '-p', name], text=True).strip()


def patch_nginx(source):
    block = BEGIN + ''.join(f'    location = {url} {{\n        alias {ASSETS / filename};\n    }}\n' for url, filename in ROUTES.items()) + END
    if BEGIN in source:
        if source.count(block) != 1 or source.count(BEGIN) != 1 or source.count(END) != 1:
            raise RuntimeError('Existing Bransons routing differs; no routes changed.')
        return source
    if any(url in source for url in ROUTES):
        raise RuntimeError('An existing Bransons route needs review; no routes changed.')
    anchor = re.compile(r'(?m)^\s*location\s*=\s*/samples/strelley-hall\.html\s*\{')
    matches = list(anchor.finditer(source))
    if len(matches) != 1:
        raise RuntimeError('Existing Strelley sample route changed; no routes changed.')
    return source[:matches[0].start()] + '\n' + block + source[matches[0].start():]


class Images(HTMLParser):
    def __init__(self):
        super().__init__()
        self.images = []

    def handle_starttag(self, tag, attrs):
        if tag == 'img':
            self.images.append(dict(attrs)['src'])


def native(mode, env):
    try:
        result = run(['node', '-e', NODE, mode], cwd=LIVE, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except subprocess.CalledProcessError as error:
        for line in (error.stderr or '').splitlines():
            if line.startswith('BRANSONS_DIAGNOSTIC '):
                detail = json.loads(line[len('BRANSONS_DIAGNOSTIC '):])
                raise RuntimeError(f"{detail['stage']}: {detail.get('code') or detail.get('name')}: {detail['message']}") from None
        raise
    for line in reversed(result.stdout.splitlines()):
        try:
            parsed = json.loads(line)
            if parsed.get('status'):
                return parsed
        except (ValueError, AttributeError):
            pass
    raise RuntimeError('Native sample result was not confirmed.')


def check_route(url, expected):
    response = run(['curl', '--fail', '--silent', '--show-error', '--max-time', '20', '--resolve', 'circlecard.co.uk:443:127.0.0.1', ORIGIN + url], stdout=subprocess.PIPE, stderr=subprocess.PIPE, encoding=None, text=False)
    if response.stdout != expected:
        raise RuntimeError('Sample response did not match the checked file: ' + url)


def main():
    if os.geteuid() != 0:
        raise RuntimeError('Run this in the existing root server session.')
    state_root = Path('/var/lib/circle-card-bransons')
    state_root.mkdir(mode=0o700, exist_ok=True)
    lock = (state_root / 'install.lock').open('a')
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    nginx = Path('/etc/nginx/sites-enabled/circlecard.co.uk').resolve()
    original = nginx.read_text()
    candidate = patch_nginx(original)
    if prop('WorkingDirectory') != str(LIVE) or prop('ActiveState') != 'active':
        raise RuntimeError('The active release changed; no deployment attempted.')
    pid = prop('MainPID')
    if not pid.isdigit() or pid == '0' or (Path('/proc') / pid / 'cwd').resolve() != LIVE:
        raise RuntimeError('The active process changed; no deployment attempted.')
    env = dict(os.environ)
    for item in (Path('/proc') / pid / 'environ').read_bytes().split(b'\0'):
        if b'=' in item:
            key, value = item.split(b'=', 1)
            env[os.fsdecode(key)] = os.fsdecode(value)
    print('1/4 Validating your account and the native sample payload.', flush=True)
    ready = native('check', env)
    print('2/4 Fetching the pinned Bransons design. No application build is needed.', flush=True)
    url = f'https://raw.githubusercontent.com/TheBusinessCircle/The-Business-Circle.Net/{REF}/ops/circle-card/bransons/Bransons-Circle-Card.html'
    with urllib.request.urlopen(url, timeout=40) as response:
        html = response.read(1024 * 1024)
    if hashlib.sha256(html).hexdigest() != HTML_SHA:
        raise RuntimeError('The sample checksum did not match.')
    images = Images()
    images.feed(html.decode())
    if len(images.images) != 3:
        raise RuntimeError('The expected embedded photographs changed.')
    kitchen = base64.b64decode(images.images[0].split(',', 1)[1], validate=True)
    bathroom = base64.b64decode(images.images[2].split(',', 1)[1], validate=True)
    if not all(data.startswith(b'\xff\xd8') for data in [kitchen, bathroom]):
        raise RuntimeError('Invalid photograph payload.')
    assets = {'bransons.html': html, 'kitchen.jpg': kitchen, 'bathroom.jpg': bathroom}
    ASSETS.mkdir(parents=True, mode=0o755, exist_ok=True)
    ASSETS.parent.chmod(0o755)
    ASSETS.chmod(0o755)
    for name, data in assets.items():
        target = ASSETS / name
        if target.is_symlink() or (target.exists() and target.read_bytes() != data):
            raise RuntimeError('An existing sample asset differs; not overwritten.')
        if not target.exists():
            target.write_bytes(data)
        target.chmod(0o644)
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d-%H%M%S')
    state = Path(tempfile.mkdtemp(prefix=stamp + '-', dir=state_root))
    backup = state / 'nginx.previous.conf'
    backup.write_text(original)
    backup.chmod(0o600)
    switched = False
    attached = False
    try:
        print('3/4 Installing and checking the custom sample route.', flush=True)
        if nginx.read_text() != original or prop('MainPID') != pid:
            raise RuntimeError('The live configuration changed; installation stopped.')
        if candidate != original:
            nginx.write_text(candidate)
            switched = True
            run(['nginx', '-t'])
            run(['systemctl', 'reload', 'nginx'])
        for route, filename in ROUTES.items():
            check_route(route, assets[filename])
        print('4/4 Attaching Bransons alongside your existing prepared samples.', flush=True)
        result = native('activate', env)
        attached = True
        (state / 'deployment.json').write_text(json.dumps({'result': result, 'previous': ready, 'nginxBackup': str(backup), 'sample': ORIGIN + '/samples/bransons.html'}, indent=2))
        print('\nATTACHED: Bransons is saved in your Cards I\'m Building sample shelf.')
        print('Open: ' + ORIGIN + '/app/prepared')
        print('Builder: ' + ORIGIN + '/app/prepared/' + result['id'])
        print('Custom sample: ' + ORIGIN + '/samples/bransons.html')
        print('Choose Bransons, open its preview, then select View custom Bransons Circle Card.')
        print('The native record remains a private, unclaimed draft. The clearly labelled custom sample is shareable like your existing /samples pages.')
        print('No app rebuild, invitations, subscriptions or existing card edits were performed.')
        print('Please verify Bransons appears in your signed-in sample shelf.')
    except Exception:
        if switched and not attached and nginx.read_text() == candidate:
            nginx.write_text(original)
            run(['nginx', '-t'])
            run(['systemctl', 'reload', 'nginx'])
        raise


if __name__ == '__main__':
    try:
        main()
    except subprocess.CalledProcessError as error:
        safe = (error.stderr or '').strip()
        if re.fullmatch(r'[A-Z_]+', safe):
            print('STOPPED: ' + safe)
        else:
            print('STOPPED: A required validation failed. No existing card data was overwritten.')
        raise SystemExit(1)
    except Exception as error:
        print('STOPPED:', str(error))
        raise SystemExit(1)
