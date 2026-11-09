const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, 'install-sample.py'), 'utf8').match(/NODE = r'''([\s\S]*?)'''/)[1];

async function scenario(mode, { existing = false, authorised = true } = {}) {
  let creates = 0, disconnected = false;
  const logs = [], errors = [];
  const draft = { id: 'bransons-test', slug: 'bransons-test', presetKey: 'BRANSONS_CUSTOM_SAMPLE', status: 'DRAFT', isPublic: false, payload: { links: [{ url: 'https://circlecard.co.uk/samples/bransons.html' }] } };
  const tx = {
    user: { findUnique: async () => ({ id: 'founder', suspended: false, circleCardOperatorAccess: { active: authorised, canViewMembers: true } }) },
    $executeRaw: async () => {}, $queryRaw: async () => [],
    circleCardPrepared: {
      findFirst: async () => ({ id: 'existing-strelley' }),
      findMany: async () => existing ? [draft] : [],
      create: async ({ data }) => { creates++; assert.equal(data.creatorUserId, 'founder'); assert.equal(data.isPublic, false); assert.equal(data.status, 'DRAFT'); return draft; }
    }
  };
  const prisma = { $transaction: callback => callback(tx), $disconnect: async () => { disconnected = true; } };
  const proc = { argv: ['node', mode] };
  const context = {
    require(name) {
      if (name === 'tsx/cjs') return {};
      if (name === './src/lib/prisma.ts') return { prisma };
      if (name === './src/lib/circle-card/prepared-cards.ts') return { parsePreparedPayload: x => x, PREPARED_CARDS_FOUNDER_EMAIL: 'admin@thebusinesscircle.net' };
      if (name === 'node:crypto') return { randomBytes: () => ({ toString: () => '123abc' }) };
      throw Error('Unexpected import');
    },
    process: proc,
    console: { log: x => logs.push(JSON.parse(x)), error: x => errors.push(x) }
  };
  await vm.runInNewContext(source, context);
  assert.equal(disconnected, true);
  return { creates, logs, errors, code: proc.exitCode };
}

(async () => {
  assert.equal((await scenario('check')).creates, 0);
  const activated = await scenario('activate');
  assert.equal(activated.creates, 1);
  assert.equal(activated.logs[0].status, 'BRANSONS_ATTACHED_TO_PREPARED_SHELF');
  const rerun = await scenario('activate', { existing: true });
  assert.equal(rerun.creates, 0);
  assert.equal(rerun.logs[0].status, 'EXISTING_SAMPLE_PRESERVED');
  const denied = await scenario('activate', { authorised: false });
  assert.equal(denied.creates, 0);
  assert.equal(denied.code, 1);
  assert.equal(denied.errors[0], 'OWNER_NOT_AUTHORISED');
  console.log('PASS: preflight, private attachment, idempotent rerun and revoked-founder protection.');
})().catch(error => { console.error(error); process.exitCode = 1; });
