import { test } from 'node:test';
import assert from 'node:assert/strict';
import { approvedProfile, insertedFields, assertExistingComplimentaryPro, ID, SLUG, GED, HARRISON } from './activate-shared-card.mjs';

test('accepts existing complimentary overrides with future or unlimited access', () => {
  const now = new Date('2026-11-04T09:56:00Z');
  const records = [GED,HARRISON].map(userId => ({userId,active:true,endsAt:new Date('2036-11-03T23:59:59.999Z')}));
  assert.doesNotThrow(() => assertExistingComplimentaryPro(records,now));
  assert.doesNotThrow(() => assertExistingComplimentaryPro(records.map(row => ({...row,endsAt:null})),now));
});

test('rejects expired, revoked, missing or mismatched complimentary access', () => {
  const now = new Date('2026-11-04T09:56:00Z');
  const records = [GED,HARRISON].map(userId => ({userId,active:true,endsAt:null}));
  for (const change of [{active:false},{endsAt:now},{endsAt:new Date(now.getTime()-1)},
    {endsAt:'invalid date'},{endsAt:undefined},{userId:GED},{userId:'another-account'}]) {
    assert.throws(() => assertExistingComplimentaryPro([records[0],{...records[1],...change}],now));
  }
  assert.throws(() => assertExistingComplimentaryPro(records.slice(0,1),now));
  assert.throws(() => assertExistingComplimentaryPro([...records,records[0]],now));
});

const seed={fullName:'Precision Finish',businessName:'Precision Finish',websiteUrl:'https://precisionplasteringandrendering.co.uk/',phone:'saved phone',customLinks:[],contentBlocks:{business:{SERVICES:{items:[]},GALLERY_PORTFOLIO:{items:[]}}}};
const draft={id:ID,slug:SLUG,creatorUserId:'verified-builder',data:{...seed}};

test('uses the original draft identity and saved editable data',()=>{
  assert.equal(approvedProfile({...draft,data:{...seed,phone:'updated phone'}},seed).phone,'updated phone');
  assert.throws(()=>approvedProfile({...draft,id:'another-draft'},seed));
  assert.throws(()=>approvedProfile({...draft,slug:'another-business'},seed));
  assert.throws(()=>approvedProfile({...draft,data:{websiteUrl:'https://another.example/'}},seed));
  assert.throws(()=>approvedProfile({...draft,other:{...seed}},seed),/Ambiguous/);
});

test('preserves the approved snapshot for a different prepared storage shape',()=>{
  assert.equal(approvedProfile({id:ID,slug:SLUG,creatorUserId:'builder',website:'https://precisionplasteringandrendering.co.uk/'},seed).phone,'saved phone');
});

test('only writes existing control fields and stops on unknown required fields',()=>{
  const col=(name,nullable='NO',defaultValue=null)=>({column_name:name,is_nullable:nullable,column_default:defaultValue,is_identity:'NO',is_generated:'NEVER'});
  const result=insertedFields([col('cardId'),col('userId'),col('active','NO','true'),col('createdAt','NO','now()')],{cardId:ID,userId:'verified-editor',active:true,unknown:'do not write'});
  assert.deepEqual(result,{cardId:ID,userId:'verified-editor',active:true});
  assert.throws(()=>insertedFields([col('cardId'),col('securityRole')],{cardId:ID}),/securityRole/);
  assert.doesNotThrow(()=>insertedFields([col('cardId'),col('optional','YES')],{cardId:ID}));
});
