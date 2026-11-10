/**
 * JS correlator and fixture_replay parity tests.
 *
 * Authored by Kiro (Kiroween 2026, feat/cross-source-cases).
 * Run with: node --test tests/correlator.test.mjs
 *
 * Covers:
 *  - correlate(): happy path, 270s fixture gap, case ID, event_ids, hashes
 *  - correlate(): out-of-order ingest, window/threshold boundaries, multiple events
 *  - correlate(): empty ledger, no denial, no qualifying door, normal shift no cases
 *  - correlate(): input rows not mutated, idempotency
 *  - correlate(): Python/JS case ID parity (same SHA-256 derivation)
 *  - parseRelayCsv(): valid rows, incident boundary, header validation, negatives
 *  - parseAccessWebhook(): valid DENIED/GRANTED, schema errors
 *  - fixture_replay: canonical demo fixtures produce correct events
 *  - SHA-256 chain valid after full fixture ingest + correlate
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {append,verify,scenario as simScenario} from '../docs/engine.mjs';
import {correlate,WINDOW_SECONDS,DOOR_HELD_THRESHOLD,RULE_NAME} from '../docs/correlator.mjs';
import {parseRelayCsv,parseAccessWebhook} from '../docs/fixture_replay.mjs';
import {RELAY_NIGHT_CSV,ACCESS_DENIED_JSON} from '../docs/fixtures.js';

// ------------------------------------------------------------------ //
// Helpers
// ------------------------------------------------------------------ //

async function buildLedger(events){
  const rows=[];
  for(const e of events)await append(rows,e);
  return rows;
}

async function fixtureLedger(){
  const rows=[];
  // Parse and ingest access denial first (matches fixture demo order)
  await append(rows,parseAccessWebhook(ACCESS_DENIED_JSON));
  for(const e of parseRelayCsv(RELAY_NIGHT_CSV))await append(rows,e);
  return rows;
}

function makeEvent(id,type,at,duration,device){
  if(!device)device=type==='access.denied'?'reader-01':'door-01';
  const data=duration!==undefined?{duration_seconds:duration}:{};
  return{id,device,type,at,data};
}

// ------------------------------------------------------------------ //
// Constants
// ------------------------------------------------------------------ //

test('WINDOW_SECONDS is 300',()=>assert.equal(WINDOW_SECONDS,300));
test('DOOR_HELD_THRESHOLD is 120',()=>assert.equal(DOOR_HELD_THRESHOLD,120));
test('RULE_NAME is denied-then-held-open',()=>assert.equal(RULE_NAME,'denied-then-held-open'));

// ------------------------------------------------------------------ //
// Happy path with canonical fixture
// ------------------------------------------------------------------ //

test('fixture produces one high-severity case',async()=>{
  const rows=await fixtureLedger();
  const cases=await correlate(rows);
  assert.equal(cases.length,1);
  assert.equal(cases[0].severity,'high');
});

test('fixture case references access:A001 and relay:R003',async()=>{
  const rows=await fixtureLedger();
  const cases=await correlate(rows);
  assert.ok(cases[0].event_ids.includes('access:A001'));
  assert.ok(cases[0].event_ids.includes('relay:R003'));
  assert.ok(!cases[0].event_ids.includes('relay:R001'),'R001 is before the denial');
});

test('fixture case explanation mentions 270 seconds',async()=>{
  const rows=await fixtureLedger();
  const cases=await correlate(rows);
  assert.ok(cases[0].explanation.includes('270 second'));
});

test('fixture case at is denial timestamp',async()=>{
  const rows=await fixtureLedger();
  assert.equal((await correlate(rows))[0].at,'2026-11-08T22:00:30Z');
});

test('fixture case id starts with case:',async()=>{
  const rows=await fixtureLedger();
  assert.ok((await correlate(rows))[0].id.startsWith('case:'));
});

test('case ID matches Python SHA-256 derivation',async()=>{
  // Python: "case:" + SHA-256("access:A001|relay:R003")[:16]
  const raw=new TextEncoder().encode('access:A001|relay:R003');
  const buf=await crypto.subtle.digest('SHA-256',raw);
  const hex=[...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
  const expected='case:'+hex.slice(0,16);
  const rows=await fixtureLedger();
  assert.equal((await correlate(rows))[0].id,expected);
});

test('fixture case evidence hashes match ledger rows',async()=>{
  const rows=await fixtureLedger();
  const cases=await correlate(rows);
  const hashMap=Object.fromEntries(rows.map(r=>[r.payload.event.id,r.hash]));
  assert.equal(cases[0].evidence_hashes[0],hashMap['access:A001']);
  assert.equal(cases[0].evidence_hashes[1],hashMap['relay:R003']);
});

test('case window_seconds is 300',async()=>{
  const rows=await fixtureLedger();
  assert.equal((await correlate(rows))[0].window_seconds,300);
});

// ------------------------------------------------------------------ //
// Out-of-order ingest
// ------------------------------------------------------------------ //

test('door ingested before denial still correlates',async()=>{
  const rows=[];
  for(const e of parseRelayCsv(RELAY_NIGHT_CSV))await append(rows,e);
  await append(rows,parseAccessWebhook(ACCESS_DENIED_JSON));
  const cases=await correlate(rows);
  assert.equal(cases.length,1);
  assert.ok(cases[0].event_ids.includes('relay:R003'));
});

// ------------------------------------------------------------------ //
// Window and threshold boundaries
// ------------------------------------------------------------------ //

test('exactly 300s window matches',async()=>{
  const rows=await buildLedger([
    makeEvent('BD','access.denied','2026-11-08T10:00:00Z'),
    makeEvent('RD','door.open','2026-11-08T10:05:00Z',120),
  ]);
  assert.equal((await correlate(rows)).length,1);
});

test('301s window no match',async()=>{
  const rows=await buildLedger([
    makeEvent('BD','access.denied','2026-11-08T10:00:00Z'),
    makeEvent('RD','door.open','2026-11-08T10:05:01Z',120),
  ]);
  assert.equal((await correlate(rows)).length,0);
});

test('door hold exactly 120s matches',async()=>{
  const rows=await buildLedger([
    makeEvent('BD','access.denied','2026-11-08T10:00:00Z'),
    makeEvent('RD','door.open','2026-11-08T10:01:00Z',120),
  ]);
  assert.equal((await correlate(rows)).length,1);
});

test('door hold 119s no match',async()=>{
  const rows=await buildLedger([
    makeEvent('BD','access.denied','2026-11-08T10:00:00Z'),
    makeEvent('RD','door.open','2026-11-08T10:01:00Z',119),
  ]);
  assert.equal((await correlate(rows)).length,0);
});

test('door before denial no match',async()=>{
  const rows=await buildLedger([
    makeEvent('BD','access.denied','2026-11-08T10:00:00Z'),
    makeEvent('RD','door.open','2026-11-08T09:59:00Z',130),
  ]);
  assert.equal((await correlate(rows)).length,0);
});

test('door same time as denial no match',async()=>{
  const rows=await buildLedger([
    makeEvent('BD','access.denied','2026-11-08T10:00:00Z'),
    makeEvent('RD','door.open','2026-11-08T10:00:00Z',130),
  ]);
  assert.equal((await correlate(rows)).length,0);
});

// ------------------------------------------------------------------ //
// Multiple events
// ------------------------------------------------------------------ //

test('two denials one door — one case paired with first denial',async()=>{
  const rows=await buildLedger([
    makeEvent('D1','access.denied','2026-11-08T10:00:00Z'),
    makeEvent('D2','access.denied','2026-11-08T10:01:00Z'),
    makeEvent('R1','door.open','2026-11-08T10:02:00Z',150),
  ]);
  const cases=await correlate(rows);
  assert.equal(cases.length,1);
  assert.ok(cases[0].event_ids.includes('D1'));
});

test('two denials two doors — two cases',async()=>{
  const rows=await buildLedger([
    makeEvent('D1','access.denied','2026-11-08T10:00:00Z'),
    makeEvent('D2','access.denied','2026-11-08T10:01:00Z'),
    makeEvent('R1','door.open','2026-11-08T10:02:00Z',130),
    makeEvent('R2','door.open','2026-11-08T10:03:00Z',140),
  ]);
  assert.equal((await correlate(rows)).length,2);
});

test('earliest qualifying door is chosen',async()=>{
  const rows=await buildLedger([
    makeEvent('D1','access.denied','2026-11-08T10:00:00Z'),
    makeEvent('R2','door.open','2026-11-08T10:03:00Z',130),
    makeEvent('R1','door.open','2026-11-08T10:01:00Z',130),
  ]);
  const cases=await correlate(rows);
  assert.equal(cases.length,1);
  assert.ok(cases[0].event_ids.includes('R1'));
});

// ------------------------------------------------------------------ //
// Negative / empty
// ------------------------------------------------------------------ //

test('empty ledger returns no cases',async()=>{
  assert.deepEqual(await correlate([]),[]);
});

test('no denied events returns no cases',async()=>{
  const rows=[];
  for(const e of simScenario('normal'))await append(rows,e);
  assert.deepEqual(await correlate(rows),[]);
});

test('no qualifying door returns no cases',async()=>{
  const rows=await buildLedger([makeEvent('D1','access.denied','2026-11-08T10:00:00Z')]);
  assert.deepEqual(await correlate(rows),[]);
});

test('normal relay fixture no cases',async()=>{
  const normalCsv=`event_id,at,relay,state,duration_seconds
R010,2026-11-09T08:00:00Z,north-door,OPEN,45
R011,2026-11-09T08:01:00Z,north-door,CLOSED,`;
  const rows=await buildLedger(parseRelayCsv(normalCsv));
  assert.deepEqual(await correlate(rows),[]);
});

test('standard Night Watch scenario has no cross-source cases',async()=>{
  const rows=[];
  for(const e of simScenario('night'))await append(rows,e);
  assert.deepEqual(await correlate(rows),[]);
});

// ------------------------------------------------------------------ //
// Immutability
// ------------------------------------------------------------------ //

test('correlate does not mutate input rows',async()=>{
  const rows=await fixtureLedger();
  const before=JSON.stringify(rows);
  await correlate(rows);
  assert.equal(JSON.stringify(rows),before);
});

test('correlate is idempotent for same ledger',async()=>{
  const rows=await fixtureLedger();
  const c1=await correlate(rows);
  const c2=await correlate(rows);
  assert.deepEqual(c1,c2);
});

// ------------------------------------------------------------------ //
// SHA-256 chain integrity
// ------------------------------------------------------------------ //

test('SHA-256 chain valid after fixture ingest and correlate',async()=>{
  const rows=await fixtureLedger();
  await correlate(rows);
  assert.ok((await verify(rows)).valid);
});

// ------------------------------------------------------------------ //
// parseRelayCsv — basic validation
// ------------------------------------------------------------------ //

test('parseRelayCsv parses OPEN row',()=>{
  const csv='event_id,at,relay,state,duration_seconds\nR001,2026-11-08T12:00:00Z,north-door,OPEN,180\n';
  const events=parseRelayCsv(csv);
  assert.equal(events.length,1);
  assert.equal(events[0].id,'relay:R001');
  assert.equal(events[0].type,'door.open');
  assert.equal(events[0].data.duration_seconds,180);
});

test('parseRelayCsv parses CLOSED row',()=>{
  const csv='event_id,at,relay,state,duration_seconds\nR002,2026-11-08T12:01:00Z,north-door,CLOSED,\n';
  const [e]=parseRelayCsv(csv);
  assert.equal(e.type,'door.closed');
  assert.deepEqual(e.data,{});
});

test('parseRelayCsv parses RELAY_NIGHT_CSV fixture',()=>{
  const events=parseRelayCsv(RELAY_NIGHT_CSV);
  assert.equal(events.length,4);
});

test('parseRelayCsv rejects missing header column',()=>{
  assert.throws(()=>parseRelayCsv('event_id,at,relay,state\nR1,2026-11-08T00:00:00Z,north-door,OPEN\n'));
});

test('parseRelayCsv rejects unknown relay',()=>{
  assert.throws(()=>parseRelayCsv('event_id,at,relay,state,duration_seconds\nR1,2026-11-08T00:00:00Z,south-door,OPEN,130\n'));
});

test('parseRelayCsv rejects duplicate event_id',()=>{
  assert.throws(()=>parseRelayCsv('event_id,at,relay,state,duration_seconds\nR1,2026-11-08T00:00:00Z,north-door,OPEN,130\nR1,2026-11-08T00:01:00Z,north-door,CLOSED,\n'));
});

test('parseRelayCsv rejects missing duration for OPEN',()=>{
  assert.throws(()=>parseRelayCsv('event_id,at,relay,state,duration_seconds\nR1,2026-11-08T00:00:00Z,north-door,OPEN,\n'));
});

test('parseRelayCsv rejects duration present for CLOSED',()=>{
  assert.throws(()=>parseRelayCsv('event_id,at,relay,state,duration_seconds\nR1,2026-11-08T00:00:00Z,north-door,CLOSED,30\n'));
});

// ------------------------------------------------------------------ //
// parseAccessWebhook — basic validation
// ------------------------------------------------------------------ //

test('parseAccessWebhook parses DENIED fixture',()=>{
  const e=parseAccessWebhook(ACCESS_DENIED_JSON);
  assert.equal(e.id,'access:A001');
  assert.equal(e.type,'access.denied');
  assert.deepEqual(e.data,{});
});

test('parseAccessWebhook parses GRANTED',()=>{
  const e=parseAccessWebhook({event_id:'A002',at:'2026-11-08T08:00:00Z',reader:'archive-reader',decision:'GRANTED'});
  assert.equal(e.type,'access.granted');
});

test('parseAccessWebhook rejects missing key',()=>{
  assert.throws(()=>parseAccessWebhook({event_id:'X',at:'2026-11-08T00:00:00Z',reader:'archive-reader'}));
});

test('parseAccessWebhook rejects extra key',()=>{
  assert.throws(()=>parseAccessWebhook({...ACCESS_DENIED_JSON,extra:'x'}));
});

test('parseAccessWebhook rejects unknown decision',()=>{
  assert.throws(()=>parseAccessWebhook({...ACCESS_DENIED_JSON,decision:'MAYBE'}));
});

test('parseAccessWebhook rejects unknown reader',()=>{
  assert.throws(()=>parseAccessWebhook({...ACCESS_DENIED_JSON,reader:'lobby-reader'}));
});
