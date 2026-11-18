/**
 * The committed Python/JS parity fixture must match what the JavaScript engine produces today.
 * Authored by Kiro (Kiroween 2026). If this fails, run: node tests/gen_forge_parity.mjs
 * then run the Python suite (tests/test_forge_parity.py) to confirm Python still agrees.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildParity} from './helpers/forge-parity.mjs';

test('tests/forge-parity.json is up to date with the JavaScript engine', async () => {
  const committed = JSON.parse(readFileSync(new URL('./forge-parity.json', import.meta.url), 'utf8'));
  assert.deepEqual(committed, JSON.parse(JSON.stringify(await buildParity())));
});

test('fixture covers both sides of every boundary', async () => {
  const d = JSON.parse(readFileSync(new URL('./forge-parity.json', import.meta.url), 'utf8'));
  const has = (g, h) => d.cases.find(c => c.config.delaySeconds === g && c.config.holdSeconds === h);
  assert.equal(has(299, 120).cases.length, 1);
  assert.equal(has(300, 120).cases.length, 1);
  assert.equal(has(301, 120).cases.length, 0);
  assert.equal(has(299, 119).cases.length, 0);
  assert.equal(has(301, 119).cases.length, 0);
  assert.ok(d.cases.filter(c => c.cases.length).length >= 30 && d.cases.filter(c => !c.cases.length).length >= 30);
});
