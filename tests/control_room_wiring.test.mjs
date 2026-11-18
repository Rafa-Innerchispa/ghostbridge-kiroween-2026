/**
 * Static wiring and policy checks for the Control Room (no browser needed).
 * Authored by Kiro (Kiroween 2026, feat/kiro-immersive-control-room).
 * Run: node --test tests/control_room_wiring.test.mjs
 *
 * These catch the cheap, silly failures before a browser is involved: a script that asks for an id the page
 * does not have, a tab without its panel, a third-party URL, an invented phone number, a file CI forgot.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

const root = new URL('../', import.meta.url);
const read = rel => readFileSync(new URL(rel, root), 'utf8');
const list = (rel, re) => readdirSync(new URL(rel, root)).filter(f => re.test(f));
const html = read('docs/index.html');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const MODES = ['building', 'timeline', 'evidence', 'response'];

test('index.html has no duplicate ids', () => {
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual([...new Set(dup)], []);
});

test('every id the Control Room scripts ask for exists in the page (or is created at runtime on purpose)', () => {
  const RUNTIME = /^(recon-|cr-svg-|p\d$)/;
  const missing = [];
  for (const file of ['docs/control_room_view.mjs', 'docs/showcase_view.mjs', 'docs/app.js']) {
    const src = read(file);
    const refs = new Set([...src.matchAll(/\$\('([A-Za-z0-9_-]+)'\)/g)].map(m => m[1]).concat([...src.matchAll(/getElementById\('([A-Za-z0-9_-]+)'\)/g)].map(m => m[1])));
    for (const id of refs) if (!ids.includes(id) && !RUNTIME.test(id)) missing.push(`${file}: #${id}`);
  }
  assert.deepEqual(missing, []);
});

test('mode tabs and panels are paired both ways with correct ARIA', () => {
  assert.match(html, /role="tablist"/);
  for (const m of MODES) {
    assert.ok(ids.includes(`cr-tab-${m}`) && ids.includes(`cr-panel-${m}`), m);
    assert.match(html, new RegExp(`id="cr-tab-${m}"[^>]*aria-controls="cr-panel-${m}"`));
    assert.match(html, new RegExp(`id="cr-panel-${m}"[^>]*aria-labelledby="cr-tab-${m}"`));
    assert.match(html, new RegExp(`id="cr-tab-${m}"[^>]*role="tab"|role="tab"[^>]*id="cr-tab-${m}"`));
  }
  assert.equal([...html.matchAll(/aria-selected="true"/g)].length, 1, 'exactly one selected tab at load');
});

test('the controller declares the same four modes', () => {
  assert.match(read('docs/control_room_view.mjs'), /MODES = Object\.freeze\(\['building', 'timeline', 'evidence', 'response'\]\)/);
});

test('every existing feature id the older tests rely on is still in the page', () => {
  for (const id of ['night', 'normal', 'denied', 'legacy-bridge', 'signal-forge', 'forge-panel', 'forge-gap', 'forge-hold', 'forge-camera', 'forge-pass', 'forge-fail', 'forge-run', 'forge-result', 'replay', 'reset', 'verify', 'export', 'tamper', 'reconstruction', 'cases-panel', 'cases-count', 'events-count', 'incidents-count', 'integrity-label', 'timeline', 'inspection', 'mode', 'status', 'workspace', 'how', 'filter-all', 'filter-high', 'filter-medium']) assert.ok(ids.includes(id), `#${id}`);
});

test('no third-party request can be made: no CDN, font host, analytics or remote script', () => {
  const offenders = [];
  const allow = /^(https?:\/\/(www\.w3\.org|github\.com\/Rafa-Innerchispa\/ghostbridge-kiroween-2026|127\.0\.0\.1|localhost)([:/'"?#)]|$))/;
  for (const f of [...list('docs/', /\.(html|css|mjs|js)$/).map(f => 'docs/' + f)]) {
    for (const m of read(f).matchAll(/https?:\/\/[^\s"'<>)\\]+/g)) if (!allow.test(m[0])) offenders.push(`${f}: ${m[0]}`);
  }
  assert.deepEqual(offenders, []);
  assert.ok(!/googleapis|gstatic|cdn\.|unpkg|jsdelivr|analytics|gtag|fbq\(/i.test(html + read('docs/styles.css') + read('docs/control_room.css')));
});

test('fonts are vendored and declared locally', () => {
  const css = read('docs/styles.css');
  assert.match(css, /@font-face\{font-family:'DM Sans'[^}]*url\(fonts\/dm-sans-latin\.woff2\)/);
  assert.match(css, /@font-face\{font-family:'Space Grotesk'[^}]*url\(fonts\/space-grotesk-latin\.woff2\)/);
  assert.deepEqual(list('docs/fonts/', /\.woff2$/).sort(), ['dm-sans-latin.woff2', 'space-grotesk-latin.woff2']);
  for (const f of list('docs/fonts/', /\.woff2$/)) assert.equal(readFileSync(join(new URL('docs/fonts/', root).pathname.replace(/^\/([A-Za-z]:)/, '$1'), f)).subarray(0, 4).toString('latin1'), 'wOF2', f + ' is a real woff2');
  assert.match(html, /rel="icon" href="data:image\/svg\+xml/);
});

test('the only contact is info@innerchispa.us; no invented phone, address or price', () => {
  const emails = [...new Set([...html.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)].map(m => m[0]))];
  assert.deepEqual(emails, ['info@innerchispa.us']);
  const text = html.replace(/<[^>]+>/g, ' ');
  assert.ok(!/(\+\d[\d\s().-]{7,}\d|\(\d{3}\)\s?\d{3}[-\s]\d{4}|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b)/.test(text), 'no phone-like numbers');
  assert.ok(!/(\$\s?\d|\bUSD\b|\bEUR\b|per month|\/\s?month|\bprice\b|\bpricing\b)/i.test(text), 'no prices');
  assert.match(html, /href="mailto:info@innerchispa\.us\?subject=GhostBridge%20pilot%20inquiry"/);
});

test('the PRODUCT VISION label appears exactly once and the concept chapter is present', () => {
  assert.equal([...html.matchAll(/PRODUCT VISION/g)].length, 1);
  for (const s of ['Mobile alert', 'Floor-by-floor digital twin', 'Multi-property operations', 'Evidence-based escalation', 'Authorized operator', 'legacy']) assert.match(html, new RegExp(s, 'i'), s);
  assert.match(html, /approval required/i, 'the human approval gate is shown');
});

test('copy never claims live hardware, camera imagery, surveillance or device control', () => {
  const text = html.replace(/<[^>]+>/g, ' ');
  assert.ok(!/(facial|face recognition|live camera|live feed|remote unlock|auto-?lock|automatically (unlock|lock|dispatch))/i.test(text));
  assert.match(text, /Synthetic data/i);
  assert.match(text, /Advisory only/i);
});

test('new view modules never inject HTML, touch storage directly, or use the network', () => {
  for (const f of ['docs/control_room.mjs', 'docs/control_room_scene.mjs', 'docs/control_room_view.mjs', 'docs/showcase.mjs', 'docs/showcase_view.mjs']) {
    const src = read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''); // code only, not comments
    assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function/.test(src), f + ' injects HTML or code');
    assert.ok(!/localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|WebSocket|sendBeacon/.test(src), f + ' uses storage or network');
  }
});

test('engine, correlator and hashing are untouched by this feature', () => {
  for (const f of ['docs/engine.mjs', 'docs/correlator.mjs']) assert.doesNotMatch(read(f), /control_room|showcase/, f);
});

test('reduced motion is honoured in CSS and JS; ?present=1 starts Showcase', () => {
  assert.match(read('docs/control_room.css'), /@media\(prefers-reduced-motion:reduce\)/);
  const app = read('docs/app.js');
  assert.match(app, /prefers-reduced-motion: reduce/);
  assert.match(app, /get\('present'\)==='1'/);
});

test('CI and Pages check and test EVERY module and test file (nothing can be forgotten)', () => {
  const mods = [...list('docs/', /\.(mjs|js)$/)];
  const tests = list('tests/', /\.test\.mjs$/);
  for (const wf of ['.github/workflows/ci.yml', '.github/workflows/pages.yml']) {
    const y = read(wf);
    for (const m of mods) assert.ok(y.includes(`node --check docs/${m}`), `${wf}: node --check docs/${m}`);
    for (const t of tests) assert.ok(y.includes(`node --test tests/${t}`), `${wf}: node --test tests/${t}`);
  }
});

test('the Kiro steering, spec and agent files exist for this feature', () => {
  for (const f of ['.kiro/steering/control-room.md', '.kiro/specs/immersive-control-room/requirements.md', '.kiro/specs/immersive-control-room/design.md', '.kiro/specs/immersive-control-room/tasks.md', '.kiro/hooks/guard-destructive.mjs']) assert.ok(read(f).length > 200, f);
});
