#!/usr/bin/env node
/**
 * Bounded runner for the PostFileSave hook `reconstruction-tests-on-save.json`.
 * Runs exactly three local test files, never starts a server or opens the network, and appends one sanitized line
 * (UTC time, exit code, counts, duration) to a log so a hook execution leaves observable proof of the command and result.
 * Log path: $GB_HOOK_LOG or <system temp>/ghostbridge-hooks/reconstruction-hook.log. Kiroween rules forbid ignoring .kiro or its subfolders,
 * so runtime logs live outside the repository (evidence copies live
 * in docs/evidence/agentic-validation/).
 * Authored by Kiro (feat/kiro-agentic-validation).
 */
import {spawnSync} from 'node:child_process';
import {appendFileSync, mkdirSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const FILES = ['tests/reconstruction.test.mjs', 'tests/reconstruction-view.test.mjs', 'tests/playback.test.mjs'];
const LOG = process.env.GB_HOOK_LOG || path.join(os.tmpdir(), 'ghostbridge-hooks', 'reconstruction-hook.log');

const started = Date.now();
// A parent `node --test` sets NODE_TEST_CONTEXT, which makes a nested run emit a different stream; drop it so counts parse.
const env = {...process.env}; delete env.NODE_TEST_CONTEXT;
const r = spawnSync(process.execPath, ['--test', ...FILES], {cwd: ROOT, env, encoding: 'utf8', timeout: 50000, windowsHide: true});
const out = `${r.stdout || ''}\n${r.stderr || ''}`;
const num = name => { const m = out.match(new RegExp(`^\\D*${name} (\\d+)`, 'm')); return m ? Number(m[1]) : null; };
const line = JSON.stringify({
  at: new Date().toISOString(),
  hook: 'reconstruction-tests-on-save',
  command: `node --test ${FILES.join(' ')}`,
  exit: r.status, signal: r.signal || null, error: r.error ? String(r.error.code || r.error.message).slice(0, 60) : null,
  timedOut: Boolean(r.error && r.error.code === 'ETIMEDOUT'),
  tests: num('tests'), pass: num('pass'), fail: num('fail'),
  ms: Date.now() - started,
});
try { mkdirSync(path.dirname(LOG), {recursive: true}); appendFileSync(LOG, line + '\n'); } catch { /* logging must never fail the hook */ }
process.stdout.write(line + '\n');
process.exit(r.status === 0 ? 0 : 1);
