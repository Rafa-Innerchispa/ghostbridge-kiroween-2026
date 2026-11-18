/**
 * Builds the Python/JavaScript parity fixture for Signal Forge ledgers.
 * Authored by Kiro (Kiroween 2026, feat/kiro-immersive-control-room).
 *
 * For each configuration it records the events, every ledger row hash, and the correlated cases that the
 * JavaScript engine produces. tests/test_forge_parity.py replays the same events through the Python engine
 * and must reproduce the same hashes, case ids and evidence hashes. The generator is deterministic.
 */
import {append} from '../../docs/engine.mjs';
import {correlate} from '../../docs/correlator.mjs';
import {makeForgeEvents} from '../../docs/signal_forge.mjs';

/** mulberry32: tiny seeded PRNG so every run sees the same sequence. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const randInt = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));

export const PARITY_SEED = 20261111;

/** Boundary neighbourhoods plus seeded random interior points. */
export function parityConfigs() {
  const out = [];
  for (const gap of [1, 2, 150, 270, 298, 299, 300, 301, 302, 360]) for (const hold of [60, 118, 119, 120, 121, 130, 240]) out.push({delaySeconds: gap, holdSeconds: hold, cameraOffline: (gap + hold) % 2 === 0});
  const r = rng(PARITY_SEED);
  for (let i = 0; i < 30; i++) out.push({delaySeconds: randInt(r, 1, 360), holdSeconds: randInt(r, 60, 240), cameraOffline: r() < 0.5});
  return out;
}

export async function buildParity() {
  const cases = [];
  for (const config of parityConfigs()) {
    const events = makeForgeEvents(config);
    const rows = [];
    for (const e of events) await append(rows, e);
    const found = await correlate(rows);
    cases.push({
      config, events,
      row_hashes: rows.map(r => r.hash),
      cases: found.map(c => ({id: c.id, event_ids: c.event_ids, evidence_hashes: c.evidence_hashes, explanation: c.explanation})),
    });
  }
  return {schema: 'ghostbridge-forge-parity-v1', seed: PARITY_SEED, count: cases.length, cases};
}
