/**
 * Renders tools/render-hero/backdrop.html to the two WebP plates used by the hero.
 * Run from the repo root:  node tools/render-hero/render.mjs
 * Needs an installed Chrome or Edge (same launcher as the browser QA). Output (committed, about 200 KB total):
 *   docs/img/hero-backdrop-2880.webp  2880 x 1440, desktop
 *   docs/img/hero-backdrop-1080.webp  1080 x 810, narrow crop of the same art for phones
 * Both are Chrome screenshots (Page.captureScreenshot, format webp). Nothing is downloaded and no network is used.
 */
import {mkdirSync, writeFileSync, statSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {Browser, ROOT} from '../../tests/browser-qa/lib.mjs';

const QUALITY = Number(process.env.HERO_QUALITY || 80);
const SOURCE = pathToFileURL(path.join(ROOT, 'tools', 'render-hero', 'backdrop.html')).href;
const OUT = path.join(ROOT, 'docs', 'img');
mkdirSync(OUT, {recursive: true});

// The mobile plate is a crop of the same art: right-hand 60 % of the width, with the horizon (y = 1080) at 75 % of the height.
const PLATES = [
  {file: 'hero-backdrop-2880.webp', w: 2880, h: 1440, viewBox: '0 0 2880 1440'},
  {file: 'hero-backdrop-1080.webp', w: 1080, h: 810, viewBox: '1140 101 1740 1305'},
];

const b = await Browser.launch();
let total = 0;
try {
  for (const p of PLATES) {
    await b.viewport(p.w, p.h, false);
    await b.goto(SOURCE, "document.readyState==='complete' && !!document.querySelector('svg')");
    await b.eval(`document.querySelector('svg').setAttribute('viewBox', ${JSON.stringify(p.viewBox)})`);
    const {data} = await b.send('Page.captureScreenshot', {format: 'webp', quality: QUALITY, clip: {x: 0, y: 0, width: p.w, height: p.h, scale: 1}}, 60000);
    const file = path.join(OUT, p.file);
    writeFileSync(file, Buffer.from(data, 'base64'));
    const kb = statSync(file).size / 1024;
    total += kb;
    console.log(`${p.file}: ${p.w}x${p.h}, quality ${QUALITY}, ${kb.toFixed(1)} KB`);
  }
} finally {
  await b.close();
}
console.log(`total ${total.toFixed(1)} KB (budget 250 KB)`);
process.exit(total <= 250 ? 0 : 1);
