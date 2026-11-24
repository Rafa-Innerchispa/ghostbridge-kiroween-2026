/**
 * Visual design audit of a public page in real Chrome: screenshots while scrolling, plus measured facts about typography, imagery,
 * motion, depth and performance. Read-only; it never copies code or assets, it only measures and photographs the rendered page.
 * Authored by Kiro's main session (Kiroween 2026). Run: node tests/browser-qa/design-audit.qa.mjs <url> <outDir> <label>
 */
import path from 'node:path';
import {writeFileSync, mkdirSync} from 'node:fs';
import {Browser, sleep} from './lib.mjs';

const [url, outDir, label = 'page'] = process.argv.slice(2);
mkdirSync(outDir, {recursive: true});
const facts = {url, label, at: new Date().toISOString(), viewports: {}};

for (const [tag, w, h, mobile] of [['1440', 1440, 900, false], ['390', 390, 844, true]]) {
  const b = await Browser.launch();
  try {
    await b.viewport(w, h, mobile);
    await b.send('Page.navigate', {url});
    await b.waitFor("document.readyState==='complete'", 'load', 45000);
    await sleep(3500);
    const m = await b.eval(`(()=>{
      const cs = e => e ? getComputedStyle(e) : null;
      const pick = e => { const s = cs(e); return s ? {font: s.fontFamily.slice(0,80), size: s.fontSize, weight: s.fontWeight, lh: s.lineHeight, ls: s.letterSpacing, color: s.color} : null; };
      const h1 = document.querySelector('h1'), h2 = document.querySelector('h2'), p = document.querySelector('main p, p');
      const btn = document.querySelector('a[class*=button], button, a[class*=btn]');
      const imgs = [...document.images].filter(i => i.getBoundingClientRect().width > 40);
      const anims = document.getAnimations ? document.getAnimations().length : null;
      const sec = document.querySelectorAll('section').length;
      const fonts = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, ''));
      const lib = {gsap: !!window.gsap, lenis: !!(window.Lenis || window.lenis), three: !!window.THREE, framer: !!document.querySelector('[data-framer-name],[data-framer-component-type]'), webflow: !!document.querySelector('html[data-wf-page]'), lottie: !!(window.lottie || document.querySelector('lottie-player,dotlottie-player'))};
      const canvases = document.querySelectorAll('canvas').length, videos = document.querySelectorAll('video').length, svgs = document.querySelectorAll('svg').length;
      const res = performance.getEntriesByType('resource');
      const bytes = res.reduce((a, r) => a + (r.transferSize || r.encodedBodySize || 0), 0);
      const shadows = [...document.querySelectorAll('body *')].slice(0, 4000).filter(e => cs(e).boxShadow !== 'none').length;
      const blurs = [...document.querySelectorAll('body *')].slice(0, 4000).filter(e => cs(e).backdropFilter && cs(e).backdropFilter !== 'none').length;
      return {title: document.title, h1Text: h1 ? h1.innerText.replace(/\\s+/g,' ').slice(0,140) : null, h1: pick(h1), h2: pick(h2), body: pick(p), button: pick(btn),
        bg: cs(document.body).backgroundColor, pageHeight: document.documentElement.scrollHeight, sections: sec, images: imgs.length,
        imageSample: imgs.slice(0, 6).map(i => ({w: i.naturalWidth, h: i.naturalHeight, src: (i.currentSrc || i.src).split('?')[0].split('/').pop().slice(0,50)})),
        canvases, videos, svgs, runningAnimations: anims, fonts: [...new Set(fonts)].slice(0, 10), libs: lib, requests: res.length, transferKB: Math.round(bytes / 1024),
        thirdPartyHosts: [...new Set(res.map(r => new URL(r.name).host).filter(hst => hst !== location.host))].slice(0, 15), shadowedElements: shadows, backdropBlurElements: blurs};
    })()`);
    const perf = await b.metrics();
    const lcp = await b.eval(`new Promise(r=>{let v=null;try{new PerformanceObserver(l=>{const e=l.getEntries();v=e[e.length-1]?.startTime??v}).observe({type:'largest-contentful-paint',buffered:true})}catch{};setTimeout(()=>r(v),300)})`);
    facts.viewports[tag] = {...m, lcpMs: lcp && Math.round(lcp), domNodes: perf.domNodes, jsHeapMB: perf.jsHeapMB};
    const H = m.pageHeight, steps = Math.min(8, Math.max(1, Math.ceil(H / h)));
    for (let i = 0; i < steps; i++) {
      const y = Math.round(i * (H - h) / Math.max(1, steps - 1));
      await b.eval(`window.scrollTo(0, ${y})`); await sleep(1400);
      await b.shot(path.join(outDir, `${label}-${tag}-${String(i + 1).padStart(2, '0')}.png`), null, 200);
    }
  } catch (e) { facts.viewports[tag] = {error: String(e.message || e).slice(0, 200)}; }
  finally { await b.close(); }
}
writeFileSync(path.join(outDir, `${label}-facts.json`), JSON.stringify(facts, null, 1));
console.log(JSON.stringify(facts, null, 1).slice(0, 4000));
process.exit(0);
