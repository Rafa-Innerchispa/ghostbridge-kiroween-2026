/**
 * qa-auditor diagnostic (not asserting, exit 0): looks for a product race that could reset the Time Machine's selected beat
 * (idx -> null) right after a beat was chosen, or steal focus, under CPU throttling (Emulation.setCPUThrottlingRate).
 * Authored by the qa-auditor custom Kiro agent (Phase 6 re-audit).
 * Per attempt: fresh browser, Challenge A, Timeline tab, then throttle, then keyboard Next x2 (the S4 steps) and 8 mouse picks (the S1 steps).
 * It records every rebuild of the beat list, every caption change and every HTMLElement.focus() call with a timestamp.
 * Run: node tests/browser-qa/phase6-race-repro.qa.mjs [attempts] [rate] [early]   ("early" = throttle before the challenge starts)
 * Writes docs/evidence/phase6/audit-logs/phase6-race-repro.json
 */
import path from 'node:path';
import {writeFileSync, mkdirSync} from 'node:fs';
import {ROOT, serveDocs, withBrowser, recorder, sleep} from './lib.mjs';
const N = Number(process.argv[2] || 6), RATE = Number(process.argv[3] || 6), EARLY = process.argv[4] === 'early';
const OUT = path.join(ROOT, 'docs', 'evidence', 'phase6', 'audit-logs');
const srv = await serveDocs();
const rec = recorder('phase6 race repro');
const G = id => `document.getElementById(${JSON.stringify(id)})`;
const out = [];
for (let i = 0; i < N; i++) {
  await withBrowser(rec, 'race-' + i, async b => {
    const r = {i, rate: RATE, early: EARLY, anomalies: []};
    await b.viewport(1440, 900);
    await b.goto(srv.origin, "!!document.querySelector('#cr-scene svg')");
    await b.waitFor(`${G('mode')}.textContent.includes('Browser lab')`, 'mode');
    await b.eval(`(()=>{window.__log=[];const t0=performance.now(),L=(k,v)=>window.__log.push({k,t:Math.round(performance.now()-t0),v});
      const of=HTMLElement.prototype.focus;HTMLElement.prototype.focus=function(...a){L('focus',(this.id||this.className||this.tagName)+' @ '+(new Error().stack.split(' at ').slice(2,4).map(s=>s.trim().split('/').pop()).join(' <- ')));return of.apply(this,a)};
      new MutationObserver(()=>L('beats-rebuilt',document.querySelectorAll('.cr-tm-beat').length)).observe(${G('cr-tm-beats')},{childList:true});
      new MutationObserver(()=>L('caption',(${G('cr-tm-caption')}.textContent||'').slice(0,28))).observe(${G('cr-tm-caption')},{childList:true,subtree:true,characterData:true});
      new MutationObserver(()=>L('cases-count',${G('cases-count')}.textContent)).observe(${G('cases-count')},{childList:true,characterData:true,subtree:true});
    })()`);
    if (EARLY) await b.send('Emulation.setCPUThrottlingRate', {rate: RATE});
    await b.click('#cr-chal-a');
    await b.waitFor(`${G('events-count')}.textContent==='3' && ${G('cases-count')}.textContent==='1'`, 'challenge A', 30000);
    await b.eval(`new Promise(r=>setTimeout(r,${EARLY ? 150 : 700}))`);   // deliberately shorter than the QA script's settle when "early"
    await b.click('#cr-tab-timeline');
    await b.waitFor(`document.querySelectorAll('.cr-tm-beat').length===8`, '8 beats', 30000);
    if (!EARLY) await b.send('Emulation.setCPUThrottlingRate', {rate: RATE});
    const cur = () => b.eval(`[...document.querySelectorAll('.cr-tm-beat')].findIndex(e=>e.getAttribute('aria-current')==='step')`);
    await b.eval(`${G('cr-tm-next')}.focus()`);
    await b.key('Enter', 'Enter', 13, '\r'); await sleep(150); const c1 = await cur();
    await b.key(' ', 'Space', 32, ' '); await sleep(150); const c2 = await cur();
    r.keyboard = {afterEnter: c1, afterSpace: c2};
    if (c1 !== 0 || c2 !== 1) r.anomalies.push('keyboard beat index ' + c1 + ',' + c2);
    r.picks = [];
    for (let k = 0; k < 8; k++) {
      await b.eval(`document.querySelectorAll('.cr-tm-beat')[${k}].click()`); await sleep(160);
      const s = await b.eval(`({cur:[...document.querySelectorAll('.cr-tm-beat')].findIndex(e=>e.getAttribute('aria-current')==='step'),cap:${G('cr-tm-caption')}.textContent.slice(0,22)})`);
      r.picks.push(s); if (s.cur !== k || !s.cap.startsWith('Beat ' + (k + 1))) r.anomalies.push(`pick ${k + 1}: ${JSON.stringify(s)}`);
    }
    await b.send('Emulation.setCPUThrottlingRate', {rate: 1});
    r.log = await b.eval('window.__log');
    r.rebuildsAfterTimelineOpen = r.log.filter(x => x.k === 'beats-rebuilt').length;
    out.push(r);
  });
}
mkdirSync(OUT, {recursive: true});
writeFileSync(path.join(OUT, 'phase6-race-repro.json'), JSON.stringify(out, null, 1));
for (const r of out) console.log(`attempt ${r.i} rate ${r.rate} early=${r.early}: anomalies=${r.anomalies.length} ${r.anomalies.join(' | ')} rebuilds=${r.rebuildsAfterTimelineOpen} focusCalls=${r.log.filter(x => x.k === 'focus').length}`);
console.log('attempts with anomalies:', out.filter(r => r.anomalies.length).length, 'of', out.length);
process.exit(0);



