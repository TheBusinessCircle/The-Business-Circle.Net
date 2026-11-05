"""Apply only the additive custom-order table using the established local DB route."""
import hashlib
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.parse
import uuid

root=Path(sys.argv[1]).resolve()
uri=urllib.parse.urlparse(os.environ.get('DATABASE_URL',''))
database=urllib.parse.unquote(uri.path.lstrip('/'))
role=urllib.parse.unquote(uri.username or '')
if uri.hostname not in ('localhost','127.0.0.1','::1') or uri.port not in (None,5432):
    raise RuntimeError('Expected the existing local application database; no migration applied.')
if not re.fullmatch(r'[A-Za-z0-9_]+',database) or not re.fullmatch(r'[A-Za-z0-9_-]+',role):
    raise RuntimeError('The database or runtime role needs explicit review.')
migration='20261105120000_circle_card_custom_build_orders'
sql=(root/'prisma/migrations'/migration/'migration.sql').read_text(encoding='utf-8')
checksum=hashlib.sha256(sql.encode()).hexdigest()
command=['sudo','-u','postgres','--','psql','-XqAt','--set=ON_ERROR_STOP=1','--dbname='+database,'--file=-']
query=f"""SELECT checksum FROM "_prisma_migrations" WHERE migration_name='{migration}'
AND finished_at IS NOT NULL AND rolled_back_at IS NULL;"""
existing=subprocess.check_output(command,input=query,text=True,cwd='/tmp').strip()
if existing and existing!=checksum:
    raise RuntimeError('Custom design migration checksum differs. No migration applied.')
if not existing:
    migration_sql="BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s';\n"+sql+f"""
INSERT INTO "_prisma_migrations"(id,checksum,migration_name,finished_at,applied_steps_count)
VALUES('{uuid.uuid4()}','{checksum}','{migration}',now(),1); COMMIT;
"""
    subprocess.run(command,input=migration_sql,text=True,cwd='/tmp',check=True)
# Match the existing owner and grant only the identified runtime's required operations.
grants="""
BEGIN;
DO $block$
DECLARE owner_name text;
BEGIN
 SELECT pg_get_userbyid(c.relowner) INTO owner_name
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relname='CircleCard' AND n.nspname='public';
 IF owner_name IS NULL THEN RAISE EXCEPTION 'Existing card owner not found'; END IF;
 EXECUTE format('ALTER TABLE public."CircleCardCustomBuildOrder" OWNER TO %I',owner_name);
END $block$;
"""
grants+=f'GRANT SELECT,INSERT,UPDATE ON public."CircleCardCustomBuildOrder" TO "{role}";\nCOMMIT;'
subprocess.run(command,input=grants,text=True,cwd='/tmp',check=True)
check=f"""SELECT bool_and(has_table_privilege('{role}','public."CircleCardCustomBuildOrder"',privilege))
FROM unnest(ARRAY['SELECT','INSERT','UPDATE']) AS p(privilege);"""
if subprocess.check_output(command,input=check,text=True,cwd='/tmp').strip()!='t':
    raise RuntimeError('The runtime does not have the required scoped custom-order permissions.')
print('Custom design order table and scoped runtime permissions are ready.',flush=True)
