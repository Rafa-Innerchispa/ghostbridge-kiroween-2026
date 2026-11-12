/**
 * Hook configuration checks (no network, bounded). Authored by Kiro (feat/kiro-agentic-validation).
 * Verifies that every .kiro/hooks/*.json uses a trigger the installed Kiro accepts, that its matcher compiles and selects
 * the files it should, that its command points at a script that exists, and that the reconstruction runner really runs
 * its three test files and leaves a log line. Live execution evidence is in docs/evidence/agentic-validation/.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync, existsSync, mkdtempSync, rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOKS = path.join(ROOT, '.kiro', 'hooks');
// Trigger names accepted by the installed Kiro's hook creator (read from the tool contract during this phase).
const TRIGGERS = new Set(['PreToolUse', 'PostToolUse', 'SessionStart', 'Stop', 'UserPromptSubmit', 'PreTaskExec', 'PostTaskExec', 'PreCompact', 'PostCompact', 'PostFileCreate', 'PostFileSave', 'PostFileDelete']);
const files = readdirSync(HOOKS).filter(f => f.endsWith('.json'));
const defs = files.flatMap(f => JSON.parse(readFileSync(path.join(HOOKS, f), 'utf8')).hooks.map(h => ({file: f, ...h})));

test('there are hook definitions to check', () => assert.ok(defs.length >= 2));

test('every hook has version v1 shape, a valid trigger, a bounded timeout and a command action', () => {
  for (const f of files) assert.equal(JSON.parse(readFileSync(path.join(HOOKS, f), 'utf8')).version, 'v1', f);
  for (const h of defs) {
    assert.ok(TRIGGERS.has(h.trigger), `${h.file}: unknown trigger ${h.trigger}`);
    assert.equal(h.action.type, 'command', h.file);
    assert.ok(h.action.timeout > 0 && h.action.timeout <= 60, `${h.file}: timeout must be 1..60 s`);
    assert.doesNotThrow(() => new RegExp(h.matcher), `${h.file}: matcher must compile`);
  }
});

test('every hook command points at a script that exists in the repository', () => {
  for (const h of defs) {
    const m = h.action.command.match(/^node (\S+\.mjs)$/);
    assert.ok(m, `${h.file}: command must be a single local node script`);
    assert.ok(existsSync(path.join(ROOT, m[1])), `${h.file}: missing ${m[1]}`);
    assert.ok(!/https?:|curl|wget|Invoke-WebRequest|npm|pip/i.test(h.action.command), `${h.file}: no network or installs`);
  }
});

test('reconstruction hook matcher selects exactly the three modules and their tests, on both path separators', () => {
  const h = defs.find(d => d.file === 'reconstruction-tests-on-save.json');
  assert.equal(h.trigger, 'PostFileSave');
  const re = new RegExp(h.matcher);
  for (const p of ['docs/reconstruction.mjs', 'docs\\playback.mjs', 'docs/reconstruction-view.mjs', 'tests/playback.test.mjs', 'tests\\reconstruction-view.test.mjs']) assert.ok(re.test(p), p);
  for (const p of ['docs/engine.mjs', 'docs/app.js', 'docs/control_room.mjs', 'tests/guard.test.mjs', 'README.md']) assert.ok(!re.test(p), p);
});

test('guard hook is PreToolUse on shell tools only', () => {
  const h = defs.find(d => d.file === 'guard-destructive-commands.json');
  assert.equal(h.trigger, 'PreToolUse');
  const re = new RegExp(h.matcher);
  assert.ok(re.test('execute_pwsh') && re.test('control_pwsh_process'));
  assert.ok(!re.test('read_file') && !re.test('fs_write'));
});

test('reconstruction runner runs the three suites, passes, and appends one JSON log line', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'gb-hook-'));
  const log = path.join(dir, 'hook.log');
  try {
    const r = spawnSync(process.execPath, [path.join(HOOKS, 'run-reconstruction-tests.mjs')], {cwd: ROOT, encoding: 'utf8', env: {...process.env, GB_HOOK_LOG: log}, timeout: 55000});
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const lines = readFileSync(log, 'utf8').trim().split('\n');
    assert.equal(lines.length, 1);
    const rec = JSON.parse(lines[0]);
    assert.equal(rec.hook, 'reconstruction-tests-on-save');
    assert.equal(rec.exit, 0, lines[0]);
    assert.equal(rec.fail, 0, lines[0]);
    assert.ok(rec.pass > 0 && rec.pass === rec.tests, JSON.stringify(rec));
    assert.match(rec.command, /^node --test tests\/reconstruction\.test\.mjs tests\/reconstruction-view\.test\.mjs tests\/playback\.test\.mjs$/);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});
