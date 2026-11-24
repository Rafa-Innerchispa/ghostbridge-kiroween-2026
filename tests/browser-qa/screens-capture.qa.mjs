/**
 * Captures every GhostBridge screen at 1440, 1024 (tablet) and 390 px for design review. Not an assertion suite.
 * Authored by Kiro's main session (Kiroween 2026). Run: node tests/browser-qa/screens-capture.qa.mjs <outDir> [url]
 */
import path from 'node:path';
import {ROOT, recorder, serveDocs, withBrowser, sleep} from './lib.mjs';

const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'docs', 'evidence', 'premium', 'before'));
const srv = process.argv[3] ? null : await serveDocs();
const URL_ = process.argv[3] || srv.origin;
const rec = recorder('screens');
const G = id => `document.getElementById(${JSON.stringify(id)})`;
const ready = "!!document.querySelector('#cr-scene svg')";
const settled = b => b.waitFor(`!${G('reset')}.disabled && !${G('forge-run')}.disabled`, 'ui settled', 20000).then(() => sleep(700));
const top = b => b.eval('window.scrollTo(0,0)');
const at = (b, sel) => b.eval(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return 0;e.scrollIntoView({block:'start'});return 1})()`);

for (const [tag, w, h, mobile] of [['1440', 1440, 900, false], ['1024', 1024, 768, false], ['390', 390, 844, true]]) {
  await withBrowser(rec, tag, async b => {
    await b.viewport(w, h, mobile);
    await b.goto(URL_, ready);
    const shot = (name, sel) => b.shot(path.join(OUT, `${tag}-${name}.png`), sel, 1400);   // 1400 ms: let the 520 ms band entrance finish
    await top(b); await shot('01-hero');
    await b.click('#cr-chal-a'); await settled(b);
    // On a phone the scene sits below the hero copy, so show the scene itself (qa-auditor Phase 7 finding).
    if (mobile) await at(b, '#cr-scene'); else await top(b);
    await shot('02-case-299-120');
    for (const [mode, n] of [['building', '03'], ['timeline', '04'], ['evidence', '05'], ['response', '06']]) {
      await b.click(`#cr-tab-${mode}`); await sleep(500);
      if (mode === 'timeline') await b.eval(`document.querySelectorAll('.cr-tm-beat')[5]?.click()`);
      if (mode === 'evidence') await b.eval(`(()=>{const d=${G('cr-tl-lab-details')};if(d)d.open=true;return 1})()`);
      await sleep(500);
      await at(b, `#cr-panel-${mode}`); await shot(`${n}-mode-${mode}`);
    }
    await b.click('#cr-tab-evidence'); await sleep(300);
    await b.eval(`(()=>{const r=${G('cr-tl-lab-row')};r.value='2';r.dispatchEvent(new Event('change',{bubbles:true}));return 1})()`);
    await b.click('#cr-tl-lab-tamper'); await b.waitFor(`!!${G('cr-tl-lab-altered-h')}`, 'tamper');
    await at(b, '#cr-tl-lab-out'); await shot('07-trust-lab-tampered');
    await b.click('#cr-chal-b'); await settled(b);
    if (mobile) await at(b, '#cr-scene'); else await top(b);
    await shot('08-near-miss-301-119');
    for (const [sel, name] of [['#vision', '09-vision'], ['footer', '10-footer'], ['#how', '11-value-band'], ['#architecture', '12-architecture-band']]) { if (await at(b, sel)) await shot(name); }
    const n = await b.eval(`[...document.querySelectorAll('main section[id], body > section[id], section[id]')].map(s=>s.id).join(',')`);
    console.log(`SECTIONS ${tag}: ${n}`);
  });
}
console.log('captured to ' + OUT);
if (srv) await srv.close();
process.exit(0);
