/**
 * Static accessibility target checks (no browser). Run: node --test tests/a11y_targets.test.mjs
 * Verifies the skip link and the 40px minimum target size declared in CSS. It reads source text only,
 * so it cannot prove rendered size; tests/browser-qa/a11y-targets.qa.mjs measures that in a real browser.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root = new URL('../', import.meta.url);
const read = rel => readFileSync(new URL(rel, root), 'utf8');
const html = read('docs/index.html');
const css = read('docs/styles.css') + '\n' + read('docs/control_room.css');
const body = html.slice(html.indexOf('<body'));

test('skip link is the first focusable element in the body', () => {
  const m = body.match(/<(a\b[^>]*\bhref=|button\b|input\b|select\b|textarea\b)[^>]*>/i);
  assert.ok(m, 'no focusable element found');
  assert.match(m[0], /^<a\b/);
  assert.match(m[0], /class="[^"]*\bskip-link\b/);
});

test('skip link href target exists and can take focus', () => {
  const href = body.match(/<a\b[^>]*class="[^"]*\bskip-link\b[^>]*>/)[0].match(/href="#([^"]+)"/);
  assert.ok(href, 'skip link needs a fragment href');
  const target = body.match(new RegExp('<[a-z]+\\b[^>]*\\bid="' + href[1] + '"[^>]*>'));
  assert.ok(target, 'target #' + href[1] + ' not found');
  assert.match(target[0], /tabindex="-1"/);
});

test('skip link is hidden until focused and is at least 40px high', () => {
  assert.match(css, /\.skip-link\{[^}]*top:-\d+px/);
  assert.match(css, /\.skip-link:focus[^{]*\{[^}]*top:\d+px/);
  const h = css.match(/\.skip-link\{[^}]*min-height:(\d+)px/);
  assert.ok(h && Number(h[1]) >= 40);
});

test('CSS declares a >=40px minimum size for the six small controls', () => {
  const ids = ['filter-all', 'filter-high', 'filter-medium', 'verify', 'export', 'tamper'];
  for (const id of ids) assert.match(html, new RegExp('id="' + id + '"'), id + ' missing from page');
  const rule = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].find(([, sel, decl]) =>
    ids.every(id => sel.includes('#' + id)) && /min-height:\s*(\d+)px/.test(decl) && /min-width:\s*(\d+)px/.test(decl));
  assert.ok(rule, 'no rule covering all six ids with min-height and min-width');
  assert.ok(Number(rule[2].match(/min-height:\s*(\d+)px/)[1]) >= 40);
  assert.ok(Number(rule[2].match(/min-width:\s*(\d+)px/)[1]) >= 40);
});

test('regression: Control Room observer moves focus to #forge-gap once the drawer is revealed (static check only)', () => {
  const src = read('docs/control_room_view.mjs');
  const obs = src.slice(src.indexOf('new MutationObserver'), src.indexOf(".observe(forge, {attributes: true, attributeFilter: ['hidden']})"));
  assert.ok(obs.length > 0, 'observer block not found');
  // Focus must come after data-forge is set (drawer displayed), only when shown, and only from body/opener.
  const iData = obs.indexOf("setAttribute('data-forge'"), iFocus = obs.indexOf("$('forge-gap').focus()");
  assert.ok(iData >= 0 && iFocus > iData, 'focus must follow the data-forge update');
  assert.match(obs, /if \(!forge\.hidden\)/);
  assert.match(obs, /doc\.body/);
  assert.match(obs, /\$\('signal-forge'\)/);
  assert.match(css, /\.cr\[data-forge="true"\] \.cr-drawer\{display:block/);
});

// ---- Phase 6: reduced motion and nav/footer target size (static source checks) ----
import {readdirSync} from 'node:fs';
const docsFiles = readdirSync(new URL('docs/', root)).filter(f => /\.(js|mjs)$/.test(f));
const stylesCss = read('docs/styles.css');
test('every smooth scroll in docs/*.js and docs/*.mjs is guarded by a reduced-motion check', () => {
  let seen = 0;
  for (const f of docsFiles) {
    read('docs/' + f).split('\n').forEach((line, i) => {
      if (!/['"]smooth['"]/.test(line)) return;
      seen++;
      assert.ok(/reducedMotion|reduced\b|prefers-reduced-motion/.test(line),
        `docs/${f}:${i + 1} uses 'smooth' without a reduced-motion guard`);
    });
    assert.ok(!/behavior\s*:\s*['"]smooth['"]/.test(read('docs/' + f)), `docs/${f} has a literal behavior:'smooth'`);
  }
  assert.ok(seen > 0, 'expected at least one guarded smooth scroll to be found');
});
test('app.js shared scroll helper honors prefers-reduced-motion', () => {
  const src = read('docs/app.js');
  assert.match(src, /const scrollBehavior=\(\)=>[^\n]*matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches\?'auto':'smooth'/);
  assert.ok(!/scrollIntoView\([^)]*behavior:\s*'smooth'/.test(src));
});
test('CSS scroll-behavior:smooth only appears inside @media (prefers-reduced-motion: no-preference)', () => {
  for (const [name, text] of [['styles.css', stylesCss], ['control_room.css', read('docs/control_room.css')]]) {
    const flat = text.replace(/\s+/g, '');
    for (const m of flat.matchAll(/scroll-behavior:smooth/g)) {
      const before = flat.slice(0, m.index);
      const open = before.lastIndexOf('@media(prefers-reduced-motion:no-preference){');
      assert.ok(open >= 0, name + ': smooth scroll-behavior without a no-preference media block');
      const between = before.slice(open + '@media(prefers-reduced-motion:no-preference){'.length);
      // the block must still be open: braces opened inside it are balanced by closes so far
      const opens = (between.match(/\{/g) || []).length, closes = (between.match(/\}/g) || []).length;
      assert.ok(closes <= opens, name + ': smooth scroll-behavior is outside the no-preference block');
    }
  }
  assert.match(stylesCss, /@media\(prefers-reduced-motion:reduce\)\{html\{scroll-behavior:auto\}/);
});
test('nav, brand and footer links declare a >=40px hit area, and mobile does not hide a nav link', () => {
  const rule = [...stylesCss.matchAll(/([^{}]+)\{([^}]*)\}/g)].find(([, sel]) =>
    sel.includes('nav a') && sel.includes('footer a') && !sel.includes('@media'));
  assert.ok(rule, 'no rule covering nav a and footer a');
  assert.match(rule[2], /display:inline-flex/);
  assert.ok(Number(rule[2].match(/min-height:(\d+)px/)[1]) >= 40);
  const minW = rule[2].match(/min-width:(\d+)px/);
  assert.ok(minW && Number(minW[1]) >= 40, 'nav/footer links need min-width >= 40px');
  assert.ok(!/nav a:first-child\{display:none\}/.test(stylesCss), 'Control Room nav link must not be hidden on mobile');
  assert.match(stylesCss, /@media\(max-width:600px\)\{[^@]*nav\{flex-wrap:wrap/);
});
