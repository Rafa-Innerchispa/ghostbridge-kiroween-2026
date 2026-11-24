/**
 * JavaScript side of the cross-implementation property tests (tests/test_properties.py).
 * Authored by Kiro (Kiroween 2026). Reads one JSON job from stdin and prints one JSON result: nothing else, no network.
 *
 * Job:    {ledgers: [{events: [...]}], tampered: [{rows: [...]}], receipts: [{rows: [...], receipt: {...}}]}
 * Result: {ledgers: [{hashes, cases: [{id, event_ids, evidence_hashes}]}], tampered: [{valid, failed_at}], receipts: [{status, ok}]}
 */
import {append, verify} from '../../docs/engine.mjs';
import {correlate} from '../../docs/correlator.mjs';
import {checkReceipt} from '../../docs/evidence_receipt.mjs';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const job = JSON.parse(input);
const out = {ledgers: [], tampered: [], receipts: []};
for (const {events} of job.ledgers || []) {
  const rows = [];
  for (const e of events) await append(rows, e);
  const cases = await correlate(rows);
  out.ledgers.push({hashes: rows.map(r => r.hash), cases: cases.map(c => ({id: c.id, event_ids: c.event_ids, evidence_hashes: c.evidence_hashes}))});
}
for (const {rows} of job.tampered || []) {
  const v = await verify(rows);
  out.tampered.push({valid: v.valid, failed_at: v.failed_at ?? null});
}
for (const {rows, receipt} of job.receipts || []) {
  const r = await checkReceipt(rows, receipt);
  out.receipts.push({status: r.status, ok: r.ok});
}
process.stdout.write(JSON.stringify(out));
