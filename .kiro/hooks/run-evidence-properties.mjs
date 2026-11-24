#!/usr/bin/env node
/**
 * Bounded runner for the PostFileSave hook `evidence-properties-on-save.json`.
 * When any file that defines the evidence rules changes (Python engine, browser engine, receipt check, independent verifier or
 * the Power's engine copy), run the cross-implementation property tests and the Power checks:
 *   python -m unittest tests.test_properties tests.test_power
 * test_properties generates random synthetic ledgers (fixed seed) and checks that the Python engine, the browser engine and the
 * independent verifier still agree on hashes, cases, tamper detection and receipts. test_power checks that the Power's engine
 * copy is byte-identical to the engine. No server, no network, no installs. Appends one sanitized JSON line to a log outside the
 * repository: $GB_HOOK_LOG or <system temp>/ghostbridge-hooks/evidence-properties-hook.log.
 * Authored by Kiro (Kiroween 2026, spec .kiro/specs/evidence-properties/).
 */
import {spawnSync} from 'node:child_process';
import {appendFileSync, mkdirSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const MODULES = ['tests.test_properties', 'tests.test_power'];
const LOG = process.env.GB_HOOK_LOG || path.join(os.tmpdir(), 'ghostbridge-hooks', 'evidence-properties-hook.log');
const started = Date.now();
const env = {...process.env}; delete env.NODE_TEST_CONTEXT;

let r = null, python = null;
for (const candidate of process.platform === 'win32' ? ['python', 'py', 'python3'] : ['python3', 'python']) {
  r = spawnSync(candidate, ['-m', 'unittest', ...MODULES], {cwd: ROOT, env, encoding: 'utf8', timeout: 55000, windowsHide: true});
  if (!(r.error && r.error.code === 'ENOENT')) { python = candidate; break; }
}
const out = `${r.stdout || ''}\n${r.stderr || ''}`;
const ran = out.match(/^Ran (\d+) tests?/m);
const failed = out.match(/^FAILED \((?:failures=(\d+))?(?:, )?(?:errors=(\d+))?/m);
const line = JSON.stringify({
  at: new Date().toISOString(),
  hook: 'evidence-properties-on-save',
  command: `${python || 'python'} -m unittest ${MODULES.join(' ')}`,
  exit: r.status, signal: r.signal || null, error: r.error ? String(r.error.code || r.error.message).slice(0, 60) : null,
  timedOut: Boolean(r.error && r.error.code === 'ETIMEDOUT'),
  tests: ran ? Number(ran[1]) : null,
  fail: failed ? Number(failed[1] || 0) + Number(failed[2] || 0) : (r.status === 0 ? 0 : null),
  ms: Date.now() - started,
});
try { mkdirSync(path.dirname(LOG), {recursive: true}); appendFileSync(LOG, line + '\n'); } catch { /* logging must never fail the hook */ }
process.stdout.write(line + '\n');
if (r.status !== 0) process.stdout.write(out.split('\n').filter(l => /^(FAIL|ERROR|AssertionError)/.test(l)).slice(0, 10).join('\n') + '\n');
process.exit(r.status === 0 ? 0 : 1);
