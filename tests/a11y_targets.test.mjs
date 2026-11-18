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
