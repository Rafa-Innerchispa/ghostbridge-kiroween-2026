/**
 * Milestone 0: independent real-browser validation of Signal Forge (PR #10) BEFORE any Control Room work.
 * Authored by Kiro (Kiroween 2026). Run: node tests/browser-qa/m0-signal-forge.qa.mjs
 *
 * Each scenario runs on a fresh browser; only infrastructure errors are retried (see lib.mjs).
 */
import path from 'node:path';
import {ROOT, recorder, serveDocs, startPython, withBrowser, writeReport} from './lib.mjs';

const OUT = path.join(ROOT, 'docs', 'evidence', 'control-room', 'm0-signal-forge');
const rec = recorder('M0 Signal Forge validation');
const {check} = rec;
const srv = await serveDocs();
const py = await startPython(8798);
let browserCaseId = null;

const counters = b => b.eval(`({events:+document.getElementById('events-count').textContent,incidents:+document.getElementById('incidents-count').textContent,cases:+document.getElementById('cases-count').textContent,integrity:document.getElementById('integrity-label').textContent})`);
const forgeState = b => b.eval(`({vis:!document.getElementById('forge-panel').hidden,preview:document.getElementById('forge-preview').textContent,previewFail:document.getElementById('forge-preview').classList.contains('is-fail'),result:document.getElementById('forge-result').textContent,match:document.getElementById('forge-result').classList.contains('is-match'),nomatch:document.getElementById('forge-result').classList.contains('is-no-match'),gap:document.getElementById('forge-gap').value,hold:document.getElementById('forge-hold').value})`);
// Forge sets its result text before its finally{} re-enables buttons and the async case count refreshes.
const settled = b => b.waitFor(`!document.getElementById('reset').disabled && !document.getElementById('forge-run').disabled`, 'ui settled').then(() => b.eval(`new Promise(r=>setTimeout(r,350))`));
const waitResult = (b, re = 'Investigation:') => b.waitFor(`/${re}/.test(document.getElementById('forge-result').textContent)`, 'forge result ' + re).then(() => settled(b));
const runForge = async (b, gap, hold, camera = false) => {
  await b.eval(`(()=>{const c=document.getElementById('forge-camera');if(c.checked!==${camera}){c.checked=${camera};c.dispatchEvent(new Event('change'))}})()`);
  await b.setRange('#forge-gap', gap); await b.setRange('#forge-hold', hold);
  await b.click('#forge-run'); await waitResult(b);
};
const resetLab = async b => { await b.click('#reset'); await b.waitFor(`document.getElementById('events-count').textContent==='0'`, 'reset'); await settled(b); };
const open = (b, origin, label) => b.goto(origin, "!!document.getElementById('events-count')").then(() => b.waitFor(`document.getElementById('mode').textContent.includes(${JSON.stringify(label)})`, 'mode label ' + label));

try {
  // ---------- A. browser-only desktop: the Forge story ----------
  await withBrowser(rec, 'A desktop Forge story', async b => {
    await b.viewport(1440, 900);
    await open(b, srv.origin, 'Browser lab');
    check('A1 browser-only mode label', true);
    check('A2 forge panel hidden at start', (await b.prop('#forge-panel', 'hidden')) === true);
    await b.shot(path.join(OUT, 'before-desktop-1440-hero.png'));
    await b.shot(path.join(OUT, 'before-desktop-1440-workspace.png'), '#workspace');
    check('A3 baseline load has no console errors', b.drainErrors().length === 0);

    await b.click('#signal-forge');
    await b.waitFor(`!document.getElementById('forge-panel').hidden`, 'panel open');
    let f = await forgeState(b);
    check('A4 open: panel visible, defaults 270/130 predict a match', f.vis && f.gap === '270' && f.hold === '130' && !f.previewFail && /Predicted correlation/.test(f.preview), f.preview.slice(0, 60));
    check('A5 focus moves to the first slider', (await b.eval(`document.activeElement?.id`)) === 'forge-gap');

    await b.click('#forge-pass'); f = await forgeState(b);
    check('A6 pass preset sets 299/120 and predicts a match', f.gap === '299' && f.hold === '120' && !f.previewFail);
    await b.click('#forge-run'); await waitResult(b);
    f = await forgeState(b); let c = await counters(b);
    check('A7 299/120 -> CORRELATED, result styled as match', f.match && !f.nomatch && /CORRELATED: 1 high-priority case/.test(f.result), f.result.slice(0, 80));
    check('A8 ledger = 3 events / 3 incidents / 1 case / Verified', c.events === 3 && c.incidents === 3 && c.cases === 1 && c.integrity === 'Verified', JSON.stringify(c));
    check('A9 result cites both source ids and two 16-char hash prefixes', /forge:denied \+ forge:later-door/.test(f.result) && (f.result.match(/[0-9a-f]{16}…/g) || []).length === 2, f.result.slice(0, 160));
    check('A10 exactly one Reconstruct button', (await b.count('.recon-open')) === 1);
    await b.click('.recon-open');
    await b.waitFor(`!!document.querySelector('#reconstruction .recon-scene')`, 'reconstruction mount');
    for (let i = 0; i < 4; i++) await b.click('#recon-next');
    const insp = await b.text('.recon-inspector');
    browserCaseId = (insp.match(/case:[0-9a-f]{16}/) || [null])[0];
    const hmap = Object.fromEntries(await b.eval(`JSON.parse(localStorage.getItem('ghostbridge-ledger-v1')).map(r=>[r.payload.event.id,r.hash])`));
    check('A11 reconstruction shows the NEW case and its real ledger hashes', !!browserCaseId && insp.includes(hmap['forge:denied']) && insp.includes(hmap['forge:later-door']), browserCaseId);
    const why = await b.text('#reconstruction .recon-stats');
    check('A12 why-panel shows 299 s gap and 120 s hold, not the demo 270/130', why.includes('299 s') && why.includes('120 s') && !why.includes('270 s'), why.slice(0, 80));
    check('A13 earlier door (forge:earlier-door) listed as excluded', (await b.text('#reconstruction')).includes('forge:earlier-door'));
    await b.shot(path.join(OUT, 'forge-299-120-reconstruction-desktop.png'), '#reconstruction');
    await b.click('#recon-close');

    await b.click('#forge-fail'); f = await forgeState(b);
    check('A14 fail preset sets 301/119 and predicts NO correlation', f.gap === '301' && f.hold === '119' && f.previewFail && /No correlation predicted/.test(f.preview));
    await b.click('#forge-run'); await waitResult(b);
    f = await forgeState(b); c = await counters(b);
    check('A15 301/119 -> NO CORRELATED CASE with both reasons', f.nomatch && !f.match && /NO CORRELATED CASE/.test(f.result) && /301 seconds/.test(f.result) && /119 seconds/.test(f.result), f.result.slice(0, 200));
    check('A16 no case: 3 events / 2 incidents (earlier 185 s door + denial; 119 s hold is below threshold) / 0 cases, no Reconstruct button', c.events === 3 && c.incidents === 2 && c.cases === 0 && (await b.count('.recon-open')) === 0, JSON.stringify(c));
    await b.shot(path.join(OUT, 'forge-301-119-no-case-desktop.png'), '#forge-panel');
    check('A17 desktop session had no console errors', b.drainErrors().length === 0);
  });

  // ---------- A2. boundary matrix through the real engine ----------
  await withBrowser(rec, 'A2 boundary matrix', async b => {
    await b.viewport(1440, 900); await open(b, srv.origin, 'Browser lab');
    await b.click('#signal-forge');
    for (const [g, h, want] of [[300, 120, true], [299, 119, false], [1, 121, true], [360, 240, false], [301, 120, false], [300, 119, false], [1, 60, false]]) {
      await runForge(b, g, h); const c = await counters(b), f = await forgeState(b);
      check(`A18 boundary ${g}s/${h}s -> ${want ? 'case' : 'no case'}`, c.cases === (want ? 1 : 0) && f.match === want, JSON.stringify(c));
    }
    await runForge(b, 299, 120, true); let c = await counters(b);
    check('A19 camera-offline adds a 4th independent event (4 events, 4 incidents) and still 1 case', c.events === 4 && c.incidents === 4 && c.cases === 1, JSON.stringify(c));
    await runForge(b, 301, 119, true); c = await counters(b);
    check('A20 camera-offline never creates a false correlation (301/119 + camera => 0 cases)', c.cases === 0 && c.events === 4, JSON.stringify(c));
    check('A21 matrix session had no console errors', b.drainErrors().length === 0);
  });

  // ---------- A3. replay, integrity, regression of every older feature ----------
  await withBrowser(rec, 'A3 replay and regression', async b => {
    await b.viewport(1440, 900); await open(b, srv.origin, 'Browser lab');
    await b.click('#signal-forge'); await runForge(b, 299, 120);
    const before = await b.eval(`localStorage.getItem('ghostbridge-ledger-v1')`);
    await b.click('#replay'); await waitResult(b, 'Replay:');
    check('A22 Replay last adds 0 new events and leaves the stored ledger byte-identical', before === await b.eval(`localStorage.getItem('ghostbridge-ledger-v1')`) && /Replay: 0 new events/.test((await forgeState(b)).result));
    await b.click('#verify');
    check('A23 Verify chain valid after Forge', (await b.text('#inspection')).includes('"valid": true'));
    await b.click('#tamper'); await b.eval(`new Promise(r=>setTimeout(r,250))`);
    check('A24 tamper test still detects tampering on a copy; ledger intact', /Tampering detected/.test(await b.text('#status')) && (await counters(b)).integrity === 'Verified');
    await b.click('#filter-high'); const hi = await b.count('#incidents .finding'); await b.click('#filter-medium'); const me = await b.count('#incidents .finding'); await b.click('#filter-all');
    check('A25 severity filters still work after Forge (High + Medium = All)', hi + me === (await b.count('#incidents .finding')) && hi >= 1, `high=${hi} medium=${me}`);
    await resetLab(b); let c = await counters(b);
    check('A26 Reset empties the lab (0/0/0) and the stored ledger', c.events === 0 && c.incidents === 0 && c.cases === 0 && (await b.eval(`localStorage.getItem('ghostbridge-ledger-v1')`)) === '[]');
    for (const [id, label, ev, inc, cs] of [['night', 'Night Watch', 5, 3, 0], ['normal', 'Normal Shift', 4, 0, 0], ['denied', 'Access Denied', 1, 1, 0]]) {
      await resetLab(b); await b.click('#' + id);
      await b.waitFor(`document.getElementById('status').textContent.includes(${JSON.stringify(label + ' complete')})`, label, 20000); await settled(b);
      c = await counters(b); check(`A27 ${label} unchanged = ${ev}/${inc}/${cs}`, c.events === ev && c.incidents === inc && c.cases === cs, JSON.stringify(c));
    }
    await resetLab(b); await b.click('#legacy-bridge');
    await b.waitFor(`document.getElementById('status').textContent.includes('Legacy Bridge Demo complete')`, 'legacy', 20000); await settled(b);
    c = await counters(b); check('A28 Legacy Bridge unchanged = 5/3/1', c.events === 5 && c.incidents === 3 && c.cases === 1, JSON.stringify(c));
    check('A29 regression session had no console errors', b.drainErrors().length === 0);
  });

  // ---------- A4. keyboard ----------
  await withBrowser(rec, 'A4 keyboard', async b => {
    await b.viewport(1440, 900); await open(b, srv.origin, 'Browser lab');
    await b.click('#signal-forge');
    await b.eval(`document.getElementById('forge-gap').focus()`);
    const g0 = +(await b.prop('#forge-gap', 'value')); await b.key('ArrowRight', 'ArrowRight', 39);
    check('A30 ArrowRight on the delay slider changes the value and the live preview', +(await b.prop('#forge-gap', 'value')) === g0 + 1 && (await b.text('#forge-gap-value')) === (g0 + 1) + ' s');
    await b.eval(`document.getElementById('forge-camera').focus()`); await b.key(' ', 'Space', 32, ' ');
    check('A31 Space toggles the camera checkbox', (await b.prop('#forge-camera', 'checked')) === true);
    await b.eval(`document.getElementById('forge-close').focus()`); await b.key('Enter', 'Enter', 13, '\r');
    check('A32 Close hides the panel and returns focus to the launcher', (await b.prop('#forge-panel', 'hidden')) === true && (await b.eval(`document.activeElement?.id`)) === 'signal-forge');
  });

  // ---------- B. mobile 390 ----------
  await withBrowser(rec, 'B mobile 390', async b => {
    await b.viewport(390, 844, true); await open(b, srv.origin, 'Browser lab');
    await b.click('#signal-forge'); await b.waitFor(`!document.getElementById('forge-panel').hidden`, 'mobile open');
    let ov = await b.overflow();
    check('B1 390px: no horizontal overflow with the Forge panel open', ov.scrollW <= ov.clientW + 1 && ov.bad.length === 0, JSON.stringify(ov));
    const small = await b.eval(`[...document.querySelectorAll('#forge-panel button')].map(e=>({id:e.id,h:Math.round(e.getBoundingClientRect().height)})).filter(x=>x.h<40)`);
    check('B2 390px: Forge buttons are at least 40 px tall', small.length === 0, JSON.stringify(small));
    const slh = await b.eval(`[...document.querySelectorAll('#forge-panel input[type=range]')].map(e=>Math.round(e.getBoundingClientRect().height))`);
    check('B3 390px: slider targets at least 24 px', slh.length === 2 && slh.every(h => h >= 24), JSON.stringify(slh));
    await b.click('#forge-pass'); await b.click('#forge-run'); await waitResult(b);
    await b.click('.recon-open'); await b.waitFor(`!!document.querySelector('#reconstruction .recon-scene')`, 'mobile recon');
    ov = await b.overflow();
    check('B4 390px: no horizontal overflow with the reconstruction open', ov.scrollW <= ov.clientW + 1 && ov.bad.length === 0, JSON.stringify(ov));
    await b.shot(path.join(OUT, 'forge-mobile-390-reconstruction.png'), '#reconstruction');
    await b.click('#recon-close');
    await b.shot(path.join(OUT, 'forge-mobile-390-panel.png'), '#forge-panel');
    check('B5 390px: preview text at least 11px', parseFloat(await b.eval(`getComputedStyle(document.getElementById('forge-preview')).fontSize`)) >= 11);
    check('B6 mobile session had no console errors', b.drainErrors().length === 0);
  });

  // ---------- C. reduced motion + network hygiene ----------
  await withBrowser(rec, 'C reduced motion and network', async b => {
    await b.viewport(1440, 900); await b.reducedMotion(true); await open(b, srv.origin, 'Browser lab');
    await b.click('#signal-forge'); await b.click('#forge-pass'); await b.click('#forge-run'); await waitResult(b);
    check('C1 reduced-motion run works and has no errors', b.drainErrors().length === 0 && (await counters(b)).cases === 1);
    const bad = srv.requests.filter(r => r.status >= 400 && r.path !== '/favicon.ico');
    check('C2 no 4xx for any local asset other than the known missing favicon', bad.length === 0, JSON.stringify(bad));
    const external = await b.eval(`performance.getEntriesByType('resource').map(e=>e.name).filter(n=>!n.includes('127.0.0.2')&&!n.includes('127.0.0.1'))`);
    console.log('INFO external resources requested:', JSON.stringify(external));
  });

  // ---------- E. local Python + SQLite ----------
  await withBrowser(rec, 'E local Python', async b => {
    await b.viewport(1440, 900); await open(b, py.origin, 'Local Python');
    check('E1 local Python mode label', true);
    await b.click('#signal-forge'); await b.click('#forge-pass'); await b.click('#forge-run'); await waitResult(b);
    let c = await counters(b); const f = await forgeState(b);
    check('E2 local 299/120 -> 3/3/1 Verified through the Python API', c.events === 3 && c.incidents === 3 && c.cases === 1 && c.integrity === 'Verified' && f.match, JSON.stringify(c));
    const apiCases = await b.eval(`fetch('/api/cases').then(r=>r.json())`);
    await b.click('.recon-open'); await b.waitFor(`!!document.querySelector('#reconstruction .recon-scene')`, 'local recon');
    for (let i = 0; i < 4; i++) await b.click('#recon-next');
    const localCaseId = ((await b.text('.recon-inspector')).match(/case:[0-9a-f]{16}/) || [null])[0];
    check('E3 Python /api/cases id equals the reconstruction id', apiCases.cases.length === 1 && apiCases.cases[0].id === localCaseId, localCaseId);
    check('E4 Python case id equals the browser-only case id (cross-language parity)', !!browserCaseId && localCaseId === browserCaseId, `${localCaseId} vs ${browserCaseId}`);
    await b.click('#recon-close');
    await b.click('#forge-fail'); await b.click('#forge-run'); await waitResult(b);
    c = await counters(b);
    check('E5 local 301/119 -> 0 cases and /api/cases is empty', c.cases === 0 && (await b.eval(`fetch('/api/cases').then(r=>r.json())`)).cases.length === 0, JSON.stringify(c));
    await resetLab(b);
    check('E6 local Reset clears the SQLite-backed state', (await b.eval(`fetch('/api/state').then(r=>r.json()).then(s=>s.ledger.length)`)) === 0);
    check('E7 local session had no console errors', b.drainErrors().length === 0);
  });
} catch (err) {
  check('M0 script ran to the end without an unhandled error', false, String(err.stack || err));
} finally {
  // A skipped scenario must never read as a pass.
  const EXPECTED = ['A desktop Forge story', 'A2 boundary matrix', 'A3 replay and regression', 'A4 keyboard', 'B mobile 390', 'C reduced motion and network', 'E local Python'];
  const done = rec.scenarios.filter(x => x.ok).map(x => x.name);
  check(`All ${EXPECTED.length} scenarios completed (none skipped)`, EXPECTED.every(n => done.includes(n)), 'missing: ' + EXPECTED.filter(n => !done.includes(n)).join(', '));
  const s = rec.summary();
  writeReport(path.join(OUT, 'REPORT.md'), 'Milestone 0: Signal Forge (PR #10) real-browser validation', s,
    'Run against branch `feat/signal-forge-interactive` BEFORE any Control Room change. Headless Chrome over CDP. Browser-only mode is served from 127.0.0.2; local mode is the real Python + SQLite server on a throwaway database.\n\n**Known findings (pre-existing on `main`, not Forge defects; handled in the Control Room branch):**\n- every page load requests a missing `/favicon.ico` (404);\n- `styles.css` imports Google Fonts at runtime (fonts.googleapis.com / fonts.gstatic.com), a third-party request that conflicts with the local-first claim.');
  await srv.close(); py.stop();
  process.exit(s.fail ? 1 : 0);
}
