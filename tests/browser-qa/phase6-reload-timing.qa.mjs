import {serveDocs, withBrowser, recorder, sleep} from './lib.mjs';
const srv = await serveDocs(); const rec = recorder('reload'); const out = [];
for (let i = 0; i < 6; i++) await withBrowser(rec, 'rl-' + i, async b => {
  await b.viewport(1440, 900);
  const t0 = Date.now();
  await b.send('Page.navigate', {url: srv.origin});
  let o = null, changes = [];
  while (Date.now() - t0 < 9000) { const n = await b.eval('performance.timeOrigin').catch(() => null); if (n !== null && n !== o) { changes.push(Date.now() - t0); o = n; } await sleep(50); }
  out.push({i, originChangesAtMs: changes});
});
console.log(JSON.stringify(out)); process.exit(0);
