/**
 * Performance measurement of the GhostBridge page in real Chrome: LCP, CLS, long tasks, transfer, DOM size, and frame times while the
 * scene animates a real case (Challenge A). Serves a docs folder locally (default: this repo's docs/).
 * Authored by Kiro's main session (Kiroween 2026). Run: node tests/browser-qa/perf.qa.mjs [docsDir] [label]
 */
import path from 'node:path';
import {writeFileSync} from 'node:fs';
import {ROOT, serveDocs, Browser, sleep} from './lib.mjs';

const dir = path.resolve(process.argv[2] || path.join(ROOT, 'docs'));
const label = process.argv[3] || 'current';
const srv = await serveDocs({dir});
const out = {label, dir: path.basename(path.dirname(dir)) + '/' + path.basename(dir), runs: {}};

for (const [tag, w, h, mobile, cpu] of [['1440', 1440, 900, false, 1], ['390-cpu4x', 390, 844, true, 4]]) {
  const samples = [];
  // 5 cold launches per viewport (single cold-start LCP samples vary widely). A launch whose navigation stalls is a harness
  // failure, not a page result: it is counted in `failed` and retried, up to 10 attempts.
  let failed = 0;
  for (let attempt = 0; samples.length < 5 && attempt < 10; attempt++) {
    let b;
    try {
      b = await Browser.launch();
      await b.viewport(w, h, mobile);
      if (cpu > 1) await b.send('Emulation.setCPUThrottlingRate', {rate: cpu});
      await b.send('Page.addScriptToEvaluateOnNewDocument', {source: `window.__p={lcp:0,cls:0,long:0,longMs:0};
        new PerformanceObserver(l=>{for(const e of l.getEntries()){window.__p.lcp=e.startTime;window.__p.lcpEl=e.element?(e.element.tagName.toLowerCase()+(e.element.id?'#'+e.element.id:'')+(e.url?' '+e.url.split('/').pop():'')):'(removed)'}}).observe({type:'largest-contentful-paint',buffered:true});
        new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__p.cls+=e.value}).observe({type:'layout-shift',buffered:true});
        new PerformanceObserver(l=>{for(const e of l.getEntries()){window.__p.long++;window.__p.longMs+=e.duration}}).observe({type:'longtask',buffered:true});`});
      await b.goto(srv.origin, "!!document.querySelector('#cr-scene svg')");
      await sleep(1500);
      const load = await b.eval(`({lcp:Math.round(__p.lcp),lcpEl:__p.lcpEl,nav:Math.round(performance.getEntriesByType('navigation')[0]?.responseEnd||0),fcp:Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime||0),cls:+__p.cls.toFixed(4),long:__p.long,longMs:Math.round(__p.longMs),
        kb:Math.round(performance.getEntriesByType('resource').reduce((a,r)=>a+(r.transferSize||r.encodedBodySize||0),0)/1024),
        req:performance.getEntriesByType('resource').length})`);
      // Cold Chrome launches sometimes deliver the HTML document itself seconds late (seen: 1.6 s, 2 s, 24 s). That delay is
      // the harness, not the page, so the comparable figure is LCP measured from the moment the document arrived.
      load.lcpAfterDoc = load.lcp - load.nav;
      const m = await b.metrics();
      // frame times while a real case plays out in the scene
      await b.eval(`(()=>{window.__f=[];let t=performance.now();const tick=n=>{window.__f.push(n-t);t=n;if(window.__f.length<400)requestAnimationFrame(tick)};requestAnimationFrame(tick);return 1})()`);
      await b.click('#cr-chal-a');
      await sleep(5000);
      const fr = await b.eval(`(()=>{const f=__f.slice(5).sort((a,b)=>a-b);const p=q=>f[Math.min(f.length-1,Math.floor(q*f.length))];return {frames:f.length,p50:+p(.5).toFixed(1),p95:+p(.95).toFixed(1),over33:f.filter(x=>x>33.4).length}})()`);
      samples.push({...load, domNodes: m.domNodes, heapMB: m.jsHeapMB, ...fr});
    } catch (err) {
      failed++;
      console.error(`[${tag}] attempt ${attempt + 1} failed (harness): ${String(err.message).split('\n')[0]}`);
    } finally { try { await b?.close(); } catch { /* already gone */ } }
  }
  if (!samples.length) throw new Error(`no successful samples for ${tag}`);
  const med = k => { const v = samples.map(s => s[k]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
  out.runs[tag] = {median: Object.fromEntries(Object.keys(samples[0]).map(k => [k, med(k)])), failed, samples};
}
await srv.close();
writeFileSync(path.join(ROOT, 'docs', 'design', `perf-${label}.json`), JSON.stringify(out, null, 1));
console.log(JSON.stringify(Object.fromEntries(Object.entries(out.runs).map(([k, v]) => [k, v.median]))));
process.exit(0);
