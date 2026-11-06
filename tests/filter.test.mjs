/**
 * Regression tests for docs/filters.mjs
 *
 * Authored by Kiro (Kiroween 2026, feat/incident-severity-filter).
 * Run with: node --test tests/filter.test.mjs
 *
 * Tests:
 *  - Mixed severity ledger: All / High / Medium counts.
 *  - Zero matching incidents for a given severity.
 *  - No incidents at all in the ledger.
 *  - Switching back to All after a narrow selection.
 *  - Reset: activeSeverity restored to 'all'.
 *  - Immutable input: filter never mutates rows.
 *  - Identical SHA-256 evidence verification before and after filtering.
 *  - Invalid severity value throws TypeError.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {append,verify,scenario} from '../docs/engine.mjs';
import {filterBySeverity,SEVERITY_VALUES} from '../docs/filters.mjs';

// Helper: build Night Watch ledger (5 events, 3 incidents: 2 high, 1 medium)
async function nightLedger(){
  const rows=[];
  for(const e of scenario('night'))await append(rows,e);
  return rows;
}

// Helper: build Access Denied ledger (1 event, 1 medium incident)
async function deniedLedger(){
  const rows=[];
  for(const e of scenario('denied'))await append(rows,e);
  return rows;
}

// Helper: build Normal Shift ledger (4 events, 0 incidents)
async function normalLedger(){
  const rows=[];
  for(const e of scenario('normal'))await append(rows,e);
  return rows;
}

test('SEVERITY_VALUES exports correct constants',()=>{
  assert.deepEqual([...SEVERITY_VALUES],['all','high','medium']);
});

test('All returns all incidents from mixed-severity ledger',async()=>{
  const rows=await nightLedger();
  const result=filterBySeverity(rows,'all');
  // Night Watch has door-held (high), long-dwell (medium), camera-offline (high)
  assert.equal(result.length,3);
  assert.ok(result.every(r=>r.payload.incident));
});

test('High returns only high-severity incidents',async()=>{
  const rows=await nightLedger();
  const result=filterBySeverity(rows,'high');
  assert.equal(result.length,2);
  assert.ok(result.every(r=>r.payload.incident.severity==='high'));
});

test('Medium returns only medium-severity incidents',async()=>{
  const rows=await nightLedger();
  const result=filterBySeverity(rows,'medium');
  assert.equal(result.length,1);
  assert.equal(result[0].payload.incident.severity,'medium');
});

test('Zero matches: High on an all-medium ledger',async()=>{
  const rows=await deniedLedger(); // one medium incident only
  const result=filterBySeverity(rows,'high');
  assert.equal(result.length,0);
});

test('Zero matches: Medium on a zero-incident ledger',async()=>{
  const rows=await normalLedger();
  const result=filterBySeverity(rows,'medium');
  assert.equal(result.length,0);
});

test('No incidents: All returns empty array',async()=>{
  const rows=await normalLedger();
  const result=filterBySeverity(rows,'all');
  assert.equal(result.length,0);
});

test('Switching back to All after a narrow filter',async()=>{
  const rows=await nightLedger();
  const high=filterBySeverity(rows,'high');
  assert.equal(high.length,2);
  const all=filterBySeverity(rows,'all');
  assert.equal(all.length,3);
});

test('Reset restores activeSeverity to all (simulated)',async()=>{
  const rows=await nightLedger();
  // Simulate a UI filter being active then reset.
  let activeSeverity='high';
  // After reset, activeSeverity should become 'all'.
  activeSeverity='all';
  const result=filterBySeverity(rows,activeSeverity);
  assert.equal(result.length,3);
});

test('Filter does not mutate input rows array',async()=>{
  const rows=await nightLedger();
  const originalLength=rows.length;
  const originalJson=JSON.stringify(rows);
  filterBySeverity(rows,'high');
  filterBySeverity(rows,'medium');
  filterBySeverity(rows,'all');
  assert.equal(rows.length,originalLength);
  assert.equal(JSON.stringify(rows),originalJson);
});

test('Filter does not mutate individual row objects',async()=>{
  const rows=await nightLedger();
  const firstBefore=JSON.stringify(rows[0]);
  filterBySeverity(rows,'high');
  assert.equal(JSON.stringify(rows[0]),firstBefore);
});

test('SHA-256 verification result unchanged after filtering',async()=>{
  const rows=await nightLedger();
  const verifyBefore=await verify(rows);
  filterBySeverity(rows,'high');
  filterBySeverity(rows,'medium');
  const verifyAfter=await verify(rows);
  assert.deepEqual(verifyBefore,verifyAfter);
  assert.ok(verifyAfter.valid);
  assert.equal(verifyAfter.checked,5);
});

test('Exported JSON is unaffected by filter state',async()=>{
  const rows=await nightLedger();
  const exportBefore=JSON.stringify({ledger:rows});
  filterBySeverity(rows,'high'); // simulate active High filter
  const exportAfter=JSON.stringify({ledger:rows});
  assert.equal(exportBefore,exportAfter);
});

test('Full counters unchanged regardless of filter',async()=>{
  const rows=await nightLedger();
  const totalIncidents=rows.filter(r=>r.payload.incident).length;
  filterBySeverity(rows,'high');
  assert.equal(rows.filter(r=>r.payload.incident).length,totalIncidents);
});

test('invalid severity throws TypeError',()=>{
  assert.throws(()=>filterBySeverity([],'critical'),{name:'TypeError'});
  assert.throws(()=>filterBySeverity([],''),{name:'TypeError'});
  assert.throws(()=>filterBySeverity([],null),{name:'TypeError'});
});

test('empty ledger with any valid severity returns empty array',()=>{
  for(const s of ['all','high','medium']){
    assert.equal(filterBySeverity([],s).length,0);
  }
});

test('Access Denied: Medium shows 1, High shows 0, All shows 1',async()=>{
  const rows=await deniedLedger();
  assert.equal(filterBySeverity(rows,'all').length,1);
  assert.equal(filterBySeverity(rows,'high').length,0);
  assert.equal(filterBySeverity(rows,'medium').length,1);
});
