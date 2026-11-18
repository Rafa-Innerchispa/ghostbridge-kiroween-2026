/**
 * qa-auditor diagnostic (not asserting, exit 0): repeats the M0 "A4 keyboard" scenario (A30 ArrowRight, A31 Space, A32 Enter on Close)
 * N times on fresh browsers and records, for every attempt, the facts that separate a product race from a harness problem:
 *   - document.hasFocus() and visibilityState before the first key (keys only reach a focused page),
 *   - whether the page reloaded during the scenario (performance.timeOrigin changed),
 *   - activeElement right before each key, and whether a trusted keydown reached the document,
 *   - the elapsed ms between the Forge open click and the first key.
 * Variant "plain" reproduces A4 exactly. Variant "synthetic" sends no CDP keys: it calls the same handlers through DOM APIs,
 * so a product race would still show, while a lost-input harness problem would not.
 * Run: node tests/browser-qa/m0-a4-repro.qa.mjs [N]   -> docs/evidence/phase6/audit-logs/m0-a4-repro.json
 */
import path from 'node:path';
import {writeFileSync, mkdirSync} from 'node:fs';
import {ROOT, serveDocs, withBrowser, recorder, sleep} from './lib.mjs';

const N = Number(process.argv[2] || 10);
const OUT = path.join(ROOT, 'docs', 'evidence', 'phase6', 'audit-logs');
const srv = await serveDocs();
const rec = recorder('m0 A4 repro');
const runs = [];
const probe = b => b.eval(`({focus:document.hasFocus(),vis:document.visibilityState,origin:performance.timeOrigin,active:document.activeElement?.id||document.activeElement?.tagName,keys:window.__keys?window.__keys.length:-1,hidden:document.getElementById('forge-panel').hidden,dataForge:document.getElementById('control-room').getAttribute('data-forge')})`);
for (let i = 0; i < N; i++) {
  await withBrowser(rec, 'a4-' + i, async b => {
    const r = {i};
    await b.viewport(1440, 900);
    await b.goto(srv.origin, "!!document.getElementById('events-count')");
    await b.waitFor(`document.getElementById('mode').textContent.includes('Browser lab')`, 'mode');
    r.reloadsDuringGoto = b.reloads || 0;
    await b.eval(`(()=>{window.__keys=[];document.addEventListener('keydown',e=>window.__keys.push({k:e.key,t:e.isTrusted,target:e.target.id||e.target.tagName,ms:Math.round(performance.now())}),true);return 1})()`);
    const t0 = Date.now();
    await b.click('#signal-forge');
    r.afterOpen = await probe(b);
    await b.eval(`document.getElementById('forge-gap').focus()`);
    r.beforeArrow = await probe(b); r.msOpenToKey = Date.now() - t0;
    const g0 = +(await b.prop('#forge-gap', 'value'));
    await b.key('ArrowRight', 'ArrowRight', 39);
    r.A30 = +(await b.prop('#forge-gap', 'value')) === g0 + 1 && (await b.text('#forge-gap-value')) === (g0 + 1) + ' s';
    await b.eval(`document.getElementById('forge-camera').focus()`); await b.key(' ', 'Space', 32, ' ');
    r.A31 = (await b.prop('#forge-camera', 'checked')) === true;
    await b.eval(`document.getElementById('forge-close').focus()`); await b.key('Enter', 'Enter', 13, '\r');
    r.A32 = (await b.prop('#forge-panel', 'hidden')) === true && (await b.eval(`document.activeElement?.id`)) === 'signal-forge';
    r.end = await probe(b);
    r.keyLog = await b.eval(`window.__keys||null`);
    r.reloadedDuring = r.end.origin !== r.afterOpen.origin;
    // synthetic control on the same page state (re-open, same handlers, no CDP input)
    await b.click('#signal-forge'); await sleep(50);
    r.synthetic = await b.eval(`(()=>{const g=document.getElementById('forge-gap');g.focus();const v=+g.value;g.value=String(v+1);g.dispatchEvent(new Event('input',{bubbles:true}));const a=document.getElementById('forge-gap-value').textContent===(v+1)+' s';const c=document.getElementById('forge-camera');const was=c.checked;c.click();const bb=c.checked!==was;document.getElementById('forge-close').click();return {a30:a,a31:bb,a32:document.getElementById('forge-panel').hidden&&document.activeElement.id==='signal-forge'}})()`);
    r.errors = b.drainErrors();
    runs.push(r);
    console.log(`attempt ${i}: A30=${r.A30} A31=${r.A31} A32=${r.A32} focus=${r.beforeArrow.focus} vis=${r.beforeArrow.vis} reload=${r.reloadedDuring} keysSeen=${r.keyLog ? r.keyLog.length : 'n/a'} synthetic=${JSON.stringify(r.synthetic)} ms=${r.msOpenToKey}`);
  });
}
await srv.close();
mkdirSync(OUT, {recursive: true});
const fails = runs.filter(r => !(r.A30 && r.A31 && r.A32));
writeFileSync(path.join(OUT, 'm0-a4-repro.json'), JSON.stringify({N, completed: runs.length, harnessRetries: rec.retries, failingAttempts: fails.length, runs}, null, 2));
console.log(`\n${runs.length} attempts, ${fails.length} with an A30/A31/A32 failure, harness retries ${rec.retries.length}`);
process.exit(0);
