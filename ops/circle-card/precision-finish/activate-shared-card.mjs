import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { randomUUID, createHash } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

export const ID = 'cmvwefhtp00csu7ahdicybag5';
export const SLUG = 'precision-finish-plastering-rendering-ecb582748528';
export const GED = 'cmw0i3dwv001ad6ahu27i7ahp';
export const HARRISON = 'cmw0hx5nn000nd6ahrninf85x';
export const PERSONAL = ['cmw0i3dwy001dd6ahrz0zldjm', 'cmw0hx5nx000qd6ahoiob7npw'];
const self = fileURLToPath(import.meta.url);
const seedPath = path.join(path.dirname(self), 'card-seed.json');
const uid = () => 'c' + randomUUID().replaceAll('-', '').slice(0, 24);
const quote = name => '"' + name.replaceAll('"', '""') + '"';
const fingerprint = value => createHash('sha256').update(JSON.stringify(value, (key, entry) =>
  ['viewCount', 'updatedAt'].includes(key) ? undefined : entry)).digest('hex');

export function approvedProfile(draft, seed) {
  assert.equal(draft.id, ID); assert.equal(draft.slug, SLUG);
  assert.equal(typeof draft.creatorUserId, 'string');
  const serialized = JSON.stringify(draft);
  assert.ok(serialized.includes('precisionplasteringandrendering.co.uk'), 'Draft business website changed');
  const candidates = [];
  function visit(value, depth = 0) {
    if (!value || typeof value !== 'object' || depth > 6) return;
    if (!Array.isArray(value) && typeof value.websiteUrl === 'string' &&
        /precision/i.test(value.businessName || value.fullName || '')) {
      const url = new URL(value.websiteUrl);
      if (url.protocol === 'https:' && url.hostname.replace(/^www\./, '') === 'precisionplasteringandrendering.co.uk') candidates.push(value);
    }
    for (const item of Object.values(value)) visit(item, depth + 1);
  }
  visit(draft);
  assert.ok(candidates.length <= 1, 'Ambiguous draft profile; inspect before creating the business card');
  const saved = candidates[0] || {};
  // The explicit saved snapshot is the fallback only for a prepared storage shape
  // without the scalar native fields. No existing record is overwritten.
  const result = { ...seed };
  for (const key of Object.keys(seed)) if (saved[key] !== undefined) result[key] = saved[key];
  if (!result.contentBlocks?.business?.SERVICES || !result.contentBlocks?.business?.GALLERY_PORTFOLIO)
    result.contentBlocks = seed.contentBlocks;
  assert.ok(Array.isArray(result.customLinks), 'Unexpected saved featured-link structure');
  assert.ok(result.businessName?.includes('Precision'));
  assert.equal(new URL(result.websiteUrl).hostname.replace(/^www\./, ''), 'precisionplasteringandrendering.co.uk');
  return result;
}

export function insertedFields(columns, values) {
  const names = new Set(columns.map(column => column.column_name));
  const selected = Object.fromEntries(Object.entries(values).filter(([key, value]) => names.has(key) && value !== undefined));
  for (const column of columns) {
    if (column.is_nullable === 'NO' && column.column_default === null &&
        column.is_identity !== 'YES' && column.is_generated !== 'ALWAYS' && !(column.column_name in selected))
      throw new Error('Unrecognised required shared-card field: ' + column.column_name);
  }
  return selected;
}

async function worker(mode, database, port, postgresUid, postgresGid) {
  assert.equal(process.getuid(),0);
  const approvedSeed=JSON.parse(fs.readFileSync(seedPath,'utf8'));
  const require = createRequire(path.join(process.cwd(), 'package.json'));
  const { Client } = require('pg');
  const db = new Client({ host: '/var/run/postgresql', database, port:Number(port), user: 'postgres', application_name: 'precision-scoped-activation' });
  for(const identity of [postgresUid,postgresGid]) assert.match(identity,/^\d+$/);
  assert.ok(Number(postgresUid)>0 && Number(postgresGid)>0);
  // Read the scoped application code before dropping OS privileges. The local
  // database then uses peer authentication as postgres without copying a secret
  // or granting administrative writes to the circle-card-app runtime role.
  process.setgroups([]);process.setgid(Number(postgresGid));process.setuid(Number(postgresUid));
  const input = readline.createInterface({ input: process.stdin });
  const iterator = input[Symbol.asyncIterator]();
  const emit = item => process.stdout.write(JSON.stringify(item) + '\n');
  const columns = async table => (await db.query('SELECT column_name,is_nullable,column_default,is_identity,is_generated FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position', ['public', table])).rows;
  const insert = async (table, values) => {
    const cols = await columns(table);
    assert.ok(cols.length, 'Missing existing table: ' + table);
    const selected = insertedFields(cols, values);
    const keys = Object.keys(selected);
    const args = keys.map(key => {
      const value = selected[key];
      return value && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value) ? JSON.stringify(value) : value;
    });
    await db.query(`INSERT INTO ${quote(table)} (${keys.map(quote).join(',')}) VALUES (${keys.map((_, i) => '$' + (i + 1)).join(',')})`, args);
  };
  await db.connect();
  try {
    await db.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    await db.query("SET LOCAL lock_timeout='10s'");
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['precision-shared:' + ID]);
    const users = (await db.query('SELECT id,suspended FROM "User" WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE', [[GED, HARRISON]])).rows;
    assert.equal(users.length, 2, 'Both verified existing accounts must be present');
    assert.ok(users.every(user => user.suspended === false), 'A selected account is suspended');
    const draft = (await db.query('SELECT * FROM "CircleCardPrepared" WHERE id=$1 FOR UPDATE', [ID])).rows[0];
    assert.ok(draft, 'The original prepared card must exist');
    const personal = (await db.query('SELECT * FROM "CircleCard" WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE', [PERSONAL])).rows;
    assert.equal(personal.length, 2);
    assert.equal(personal.find(card => card.id === PERSONAL[0]).userId, GED);
    assert.equal(personal.find(card => card.id === PERSONAL[1]).userId, HARRISON);
    const sharedColumns = await columns('CircleBusinessCard');
    const editorColumns = await columns('CircleBusinessCardEditor');
    for (const key of ['cardId', 'enabled']) assert.ok(sharedColumns.some(column => column.column_name === key));
    for (const key of ['cardId', 'userId', 'active']) assert.ok(editorColumns.some(column => column.column_name === key));
    const current = (await db.query('SELECT * FROM "CircleCard" WHERE id=$1 OR slug=$2 FOR UPDATE', [ID, SLUG])).rows;

    if (mode === 'rollback') {
      const message = await iterator.next();
      const receipt = JSON.parse(message.value);
      assert.equal(receipt.id, ID); assert.equal(receipt.owner, GED);
      assert.equal(current.length, 1); assert.equal(current[0].id, ID); assert.equal(current[0].userId, GED);
      assert.equal(fingerprint(current[0]), receipt.fingerprint, 'Business content changed after activation; automatic rollback stopped');
      await db.query('UPDATE "CircleBusinessCardEditor" SET active=false WHERE "cardId"=$1 AND "userId"=$2', [ID, HARRISON]);
      await db.query('UPDATE "CircleBusinessCard" SET enabled=false WHERE "cardId"=$1', [ID]);
      await db.query('UPDATE "CircleCard" SET "isPublished"=false,"showInDiscover"=false,"archivedAt"=now(),"updatedAt"=now() WHERE id=$1 AND "userId"=$2', [ID, GED]);
      await db.query('COMMIT'); emit({kind:'done',status:'PRECISION_ACTIVATION_REVERSED'}); return;
    }

    assert.equal(current.length, 0, 'A native card or its slug already exists; no overwrite was attempted');
    const owned = (await db.query('SELECT id FROM "CircleCard" WHERE "userId"=$1 AND "archivedAt" IS NULL', [GED])).rows;
    assert.equal(owned.length, 1, 'Ged already has additional owned cards; review his card allowance');
    const pro = (await db.query('SELECT 1 FROM "CircleCardAccessGrant" WHERE "userId"=ANY($1::text[]) AND active AND plan::text IN (\'PRO\',\'TEAMS\') AND ("startsAt" IS NULL OR "startsAt"<=now()) AND ("endsAt" IS NULL OR "endsAt">now()) GROUP BY "userId"', [[GED,HARRISON]])).rows;
    assert.equal(pro.length, 2, 'Both existing complimentary Pro grants must still be active');
    assert.equal((await db.query('SELECT 1 FROM "CircleBusinessCard" WHERE "cardId"=$1', [ID])).rowCount, 0);
    assert.equal((await db.query('SELECT 1 FROM "CircleBusinessCardEditor" WHERE "cardId"=$1', [ID])).rowCount, 0);
    const profile = approvedProfile(draft, approvedSeed);
    const now = new Date();
    const shared = { id:uid(),cardId: ID, enabled: true, referralMode: 'ENTRY_OWNER',
      createdByUserId:draft.creatorUserId,createdAt: now, updatedAt: now };
    const editor = { id: uid(), cardId: ID, userId: HARRISON, active: true,
      grantedByUserId: draft.creatorUserId, addedByUserId: draft.creatorUserId,
      createdByUserId: draft.creatorUserId, invitedByUserId:draft.creatorUserId,
      grantedAt:now,createdAt: now, updatedAt: now };
    insertedFields(sharedColumns, shared); insertedFields(editorColumns, editor);
    if (mode === 'check') { await db.query('ROLLBACK'); emit({kind:'done',status:'PRECISION_ACCOUNTS_AND_SHARING_CHECK_PASSED'}); return; }
    emit({kind:'backup',data:{id:ID,owner:GED,editor:HARRISON,createdAt:now,draft,personal,before:null}});
    const approval = await iterator.next();
    assert.equal(approval.value, 'BACKUP_SAVED');
    const {customLinks, ...native} = profile;
    await insert('CircleCard', { ...native, id: ID, userId: GED, slug: SLUG,
      cardType:'BUSINESS',isPrimary:false,isDefaultCard:false,displayOrder:50,
      isPublished:true,showInDiscover:false,archivedAt:null,createdAt:now,updatedAt:now });
    for (const [index, link] of customLinks.entries()) {
      if (!link.url || (link.visibility && link.visibility !== 'PUBLIC')) continue;
      if (link.expiresAt && new Date(link.expiresAt).getTime() <= now.getTime()) continue;
      const url = new URL(link.url);
      assert.ok(['https:', 'http:'].includes(url.protocol) && !url.username && !url.password, 'Unexpected featured destination');
      await insert('CircleCardLink', {id:uid(),cardId:ID,type:'GENERAL',label:link.label,url:link.url,
        description:link.description||null,imageUrl:link.imageUrl||null,visibility:'PUBLIC',isActive:link.isActive!==false,
        expiresAt:link.expiresAt||null,sortOrder:index,createdAt:now,updatedAt:now});
    }
    await insert('CircleBusinessCard', shared);
    await insert('CircleBusinessCardEditor', editor);
    const managers = (await db.query('SELECT u.id FROM "User" u JOIN "CircleCard" c ON c.id=$1 JOIN "CircleBusinessCard" b ON b."cardId"=c.id AND b.enabled WHERE u.id=ANY($2::text[]) AND NOT u.suspended AND c."cardType"=\'BUSINESS\' AND c."archivedAt" IS NULL AND (c."userId"=u.id OR EXISTS(SELECT 1 FROM "CircleBusinessCardEditor" e WHERE e."cardId"=c.id AND e."userId"=u.id AND e.active))', [ID,[GED,HARRISON]])).rows;
    assert.equal(managers.length,2,'Both accounts must satisfy the existing shared authorization rules');
    const after = (await db.query('SELECT * FROM "CircleCard" WHERE id=ANY($1::text[]) ORDER BY id', [PERSONAL])).rows;
    assert.equal(fingerprint(after),fingerprint(personal),'Personal card data changed unexpectedly');
    const created = (await db.query('SELECT * FROM "CircleCard" WHERE id=$1',[ID])).rows[0];
    await db.query('COMMIT');
    emit({kind:'done',status:'PRECISION_PUBLISHED_AND_BOTH_MANAGERS_CONNECTED',id:ID,owner:GED,editor:HARRISON,fingerprint:fingerprint(created)});
  } catch(error) { await db.query('ROLLBACK').catch(()=>{}); throw error; }
  finally { input.close(); await db.end(); }
}

async function parent(mode, state) {
  assert.ok(['check','activate','rollback'].includes(mode));
  assert.match(state,/^\/var\/lib\/circle-card-precision\/\d{8}-\d{6}$/);
  assert.equal(process.getuid(),0,'Use the existing root SSH session');
  const connection = new URL(process.env.DATABASE_URL);
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(connection.hostname) ||
    (!connection.hostname && connection.searchParams.get('host')?.startsWith('/var/run/postgresql')),
    'Local administrative database access needs review');
  const database = decodeURIComponent(connection.pathname.slice(1));
  assert.match(database,/^[A-Za-z0-9_-]+$/);
  const port=connection.port||'5432'; assert.match(port,/^\d{1,5}$/);
  const postgresUid=execFileSync('id',['-u','postgres'],{encoding:'utf8'}).trim();
  const postgresGid=execFileSync('id',['-g','postgres'],{encoding:'utf8'}).trim();
  const child = spawn(process.execPath,[self,'--worker',mode,database,port,postgresUid,postgresGid],{cwd:process.cwd(),env:{PATH:process.env.PATH,LANG:'C.UTF-8'},stdio:['pipe','pipe','pipe']});
  let errorText='', receipt=null, failure=null;
  child.stderr.on('data',chunk=>{errorText+=(chunk.toString());});
  const done = new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',code=>code===0?resolve():reject(new Error(errorText.slice(-1600)||'Administrative database preflight failed')));});
  if(mode==='rollback') child.stdin.write(fs.readFileSync(path.join(state,'activation.json'),'utf8')+'\n');
  try {
    for await(const line of readline.createInterface({input:child.stdout})) {
      const message=JSON.parse(line);
      if(message.kind==='backup') {
        const backup=path.join(state,'native-before.json');
        const fd=fs.openSync(backup,'wx',0o600);
        try{fs.writeFileSync(fd,JSON.stringify(message.data));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
        child.stdin.write('BACKUP_SAVED\n');
      } else if(message.kind==='done') {receipt=message;child.stdin.end();}
    }
  } catch(error) {failure=error;child.kill();}
  await done;
  if(failure)throw failure;
  assert.ok(receipt,'No database receipt returned');
  if(mode==='activate') fs.writeFileSync(path.join(state,'activation.json'),JSON.stringify(receipt),{mode:0o600,flag:'wx'});
  process.stdout.write(receipt.status+'\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === self) {
  const task = process.argv[2]==='--worker' ? worker(process.argv[3],process.argv[4],process.argv[5],process.argv[6],process.argv[7]) : parent(process.argv[2],process.argv[3]);
  task.catch(error=>{process.stderr.write('Precision activation stopped: '+error.message+'\n');process.exitCode=1;});
}
