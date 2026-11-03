import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const release = process.cwd();
const mode = process.argv[2];
const statePath = process.argv[3];
assert.ok(['check', 'activate', 'rollback'].includes(mode));
assert.ok(statePath?.startsWith('/var/lib/circle-card-hucknall/'));
const require = createRequire(path.join(release, 'package.json'));
const { Client } = require('pg');
const ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync(path.join(release, 'src/lib/circle-card/hucknall-content.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const content = { exports: {} };
vm.runInNewContext(compiled, { exports: content.exports, module: content }, { timeout: 1000 });
const { HUCKNALL_HUB_CARD_ID: id, HUCKNALL_CARD_ABOUT: about } = content.exports;
assert.equal(id, 'cmvzwzm3y000amkahigz25s8r');
const client = new Client({ connectionString: process.env.DATABASE_URL });
const editable = ['fullName', 'businessName', 'role', 'tagline', 'about', 'profileImageUrl', 'businessLogoUrl',
  'websiteUrl', 'location', 'themePrimaryColor', 'themeAccentColor', 'themeButtonColor', 'cardType', 'isPublished',
  'showInDiscover', 'discoverOptedInAt', 'archivedAt'];
await client.connect();
try {
  await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
  const draft = (await client.query('SELECT p.id,p.slug,p."creatorUserId",p."isPublic",u.suspended FROM "CircleCardPrepared" p JOIN "User" u ON u.id=p."creatorUserId" WHERE p.id=$1 FOR UPDATE OF p', [id])).rows;
  assert.equal(draft.length, 1, 'The existing owned draft must be present');
  assert.equal(draft[0].slug, 'hucknall-circle-hub-40f0517a277b');
  assert.equal(draft[0].isPublic, false, 'Keep the original design draft private');
  assert.equal(draft[0].suspended, false);
  const owner = draft[0].creatorUserId;
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['hucknall-native-hub:' + owner]);
  const collision = (await client.query('SELECT id,"userId",slug FROM "CircleCard" WHERE slug=$1 AND id<>$2', ['hucknall-circle-hub', id])).rows;
  assert.equal(collision.length, 0, 'Do not take another card slug');
  const current = (await client.query('SELECT * FROM "CircleCard" WHERE id=$1 FOR UPDATE', [id])).rows[0] ?? null;
  if (current) { assert.equal(current.userId, owner); assert.equal(current.slug, 'hucknall-circle-hub'); }
  if (mode === 'rollback') {
    const prior = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    assert.equal(prior.id, id); assert.equal(prior.owner, owner);
    if (current) {
      if (!prior.before) await client.query('UPDATE "CircleCard" SET "isPublished"=false,"showInDiscover"=false,"discoverOptedInAt"=null,"updatedAt"=now() WHERE id=$1 AND "userId"=$2', [id, owner]);
      else {
        const fields = editable.filter(key => Object.hasOwn(prior.before, key));
        await client.query('UPDATE "CircleCard" SET ' + fields.map((key, i) => `"${key}"=$${i + 3}`).join(',') + ',"updatedAt"=now() WHERE id=$1 AND "userId"=$2', [id, owner, ...fields.map(key => prior.before[key])]);
      }
    }
  } else if (mode === 'activate') {
    assert.equal(fs.existsSync(statePath), false, 'Activation already recorded; inspect before retrying');
    fs.writeFileSync(statePath, JSON.stringify({ id, owner, before: current }), { mode: 0o600, flag: 'wx' });
    const values = { fullName: 'Hucknall Circle Hub', businessName: 'Hucknall Circle Hub', role: 'Independent local community hub',
      tagline: 'Your high street. Your people. Your Circle.', about,
      profileImageUrl: 'https://circlecard.co.uk/hucknall/photos/st-mary.jpg', businessLogoUrl: 'https://circlecard.co.uk/hucknall/photos/st-mary.jpg',
      websiteUrl: 'https://circlecard.co.uk/card/hucknall-circle-hub/about', location: 'Hucknall, Nottinghamshire',
      themePrimaryColor: '#07101f', themeAccentColor: '#e5c779', themeButtonColor: '#e5c779', cardType: 'BUSINESS',
      isPublished: true, showInDiscover: true, discoverOptedInAt: new Date(), archivedAt: null };
    if (!current) await client.query('INSERT INTO "CircleCard"(id,"userId",slug,"fullName","isPrimary","isDefaultCard","displayOrder","updatedAt") VALUES($1,$2,$3,$4,false,false,100,now())', [id, owner, 'hucknall-circle-hub', values.fullName]);
    const keys = Object.keys(values);
    await client.query('UPDATE "CircleCard" SET ' + keys.map((key, i) => `"${key}"=$${i + 3}`).join(',') + ',"updatedAt"=now() WHERE id=$1 AND "userId"=$2', [id, owner, ...keys.map(key => values[key])]);
    const saved = (await client.query('SELECT id,"userId",slug,"isPublished","showInDiscover" FROM "CircleCard" WHERE id=$1', [id])).rows[0];
    assert.equal(saved.userId, owner); assert.equal(saved.isPublished, true); assert.equal(saved.showInDiscover, true);
  }
  await client.query('COMMIT');
  console.log(JSON.stringify({ status: mode === 'activate' ? 'NATIVE_HUB_PUBLISHED_DISCOVER_ON' : mode === 'rollback' ? 'NATIVE_HUB_ACTIVATION_REVERSED' : 'NATIVE_HUB_OWNER_AND_SLUG_CHECK_PASSED', id }));
} catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
finally { await client.end(); }
