import test from 'node:test';
import assert from 'node:assert/strict';
import {append,verify,validate} from '../docs/engine.mjs';
import {correlate} from '../docs/correlator.mjs';
import {FORGE_DEFAULTS,makeForgeEvents,evaluateForge,normalizeForgeConfig} from '../docs/signal_forge.mjs';

test('forge creates three valid canonical synthetic events',()=>{
  const es=makeForgeEvents();assert.equal(es.length,3);
  for(const e of es)assert.equal(validate(e),e);
  assert.deepEqual(es.map(e=>e.id),['forge:earlier-door','forge:denied','forge:later-door']);
});
test('forge avoids reference mutation',()=>{
  const cfg={...FORGE_DEFAULTS};const a=makeForgeEvents(cfg);const b=makeForgeEvents(cfg);
  a[0].data.duration_seconds=1;assert.equal(b[0].data.duration_seconds,185);
  assert.deepEqual(cfg,{...FORGE_DEFAULTS});
});
test('early door excluded and late door 270s/130s matches',async()=>{
  const rows=[];for(const event of makeForgeEvents())await append(rows,event);
  assert.equal((await verify(rows)).valid,true);
  const cases=await correlate(rows);assert.equal(cases.length,1);
  assert.deepEqual(cases[0].event_ids,['forge:denied','forge:later-door']);
  assert.deepEqual(cases[0].evidence_hashes,[rows[1].hash,rows[2].hash]);
  assert.equal(rows.filter(r=>r.payload.incident).length,3);
});
for(const [gap,hold,match] of [[1,120,true],[299,120,true],[300,120,true],[301,120,false],[299,119,false],[301,119,false],[270,130,true],[360,240,false],[1,60,false],[1,121,true]]){
  test(`boundary gap=${gap} hold=${hold} matches=${match}`,async()=>{
    const cfg={delaySeconds:gap,holdSeconds:hold,cameraOffline:false};
    assert.equal(evaluateForge(cfg).willCorrelate,match);
    const rows=[];for(const e of makeForgeEvents(cfg))await append(rows,e);
    assert.equal((await verify(rows)).valid,true);
    const cases=await correlate(rows);assert.equal(cases.length,match?1:0);
  });
}
test('optional camera offline is independent source finding, not a false correlation',async()=>{
  const rows=[];for(const e of makeForgeEvents({delaySeconds:301,holdSeconds:119,cameraOffline:true}))await append(rows,e);
  assert.equal(rows.length,4);
  assert.equal(rows.filter(r=>r.payload.incident).length,3);
  assert.equal((await correlate(rows)).length,0);
});
test('same synthetic events replay idempotently without changing hashes',async()=>{
  const rows=[],ev=makeForgeEvents();
  for(const e of ev)assert.equal(await append(rows,e),true);
  const original=structuredClone(rows);
  for(const e of ev)assert.equal(await append(rows,e),false);
  assert.deepEqual(rows,original);assert.equal((await correlate(rows)).length,1);
});
test('invalid values cannot create fake events',()=>{
  for(const cfg of [
    {delaySeconds:0,holdSeconds:120,cameraOffline:false},
    {delaySeconds:361,holdSeconds:120,cameraOffline:false},
    {delaySeconds:NaN,holdSeconds:120,cameraOffline:false},
    {delaySeconds:1.2,holdSeconds:120,cameraOffline:false},
    {delaySeconds:'1e2',holdSeconds:120,cameraOffline:false},
    {delaySeconds:'0xF',holdSeconds:120,cameraOffline:false},
    {delaySeconds:300,holdSeconds:59,cameraOffline:false},
    {delaySeconds:300,holdSeconds:241,cameraOffline:false},
    {delaySeconds:300,holdSeconds:120,cameraOffline:1},
  ]) assert.throws(()=>normalizeForgeConfig(cfg));
});
test('failed conditions are human-readable',()=>{
  const r=evaluateForge({delaySeconds:301,holdSeconds:119,cameraOffline:false});
  assert.equal(r.willCorrelate,false);
  assert.match(r.explanation,/301 seconds/);
  assert.match(r.explanation,/119 seconds/);
});
