// qa-auditor: WCAG contrast ratios for the new Phase 6 text colours (values copied from docs/control_room.css lines 296-391 and styles.css :root).
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const L = h => { const [r, g, b] = hex(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return ((x + 0.05) / (y + 0.05)).toFixed(2); };
// opacity .9 over the panel background #13191c (unverifiable block)
const mix = (fg, bg, a) => '#' + hex(fg).map((c, i) => Math.round((c * a + hex(bg)[i] * (1 - a)) * 255).toString(16).padStart(2, '0')).join('');
const rows = [
  ['muted beat number / cap-n / time label', '#98a8a9', '#121b1e'],
  ['beat label', '#dfe9e6', '#121b1e'],
  ['beat UTC time (teal)', '#5fd4c4', '#121b1e'],
  ['"did not happen" (orange) on missed beat', '#ffb17d', '#17130f'],
  ['missed beat label', '#e9d6c6', '#17130f'],
  ['active missed beat label', '#e9d6c6', '#2a1d10'],
  ['active beat label on #1a2616', '#dfe9e6', '#1a2616'],
  ['active beat muted number on #1a2616', '#98a8a9', '#1a2616'],
  ['TM hint (purple)', '#baaeeb', '#0d1417'],
  ['TM note', '#c9d7d5', '#0d1417'],
  ['near-miss note', '#ffe0c4', '#0d1417'],
  ['caption text', '#e1ebe8', '#101a1d'],
  ['caption muted (row #, placeholder)', '#98a8a9', '#101a1d'],
  ['caption hash/id (purple)', '#baaeeb', '#101a1d'],
  ['caption case id (green)', '#c5f76a', '#101a1d'],
  ['caption time (teal)', '#5fd4c4', '#101a1d'],
  ['caption badge (orange)', '#ffb17d', '#101a1d'],
  ['lab honesty', '#e3defa', '#161a2a'],
  ['lab summary', '#d6e2e0', '#0d1417'],
  ['lab block type', '#c3d0cd', '#111a1d'],
  ['lab block status verified (teal)', '#5fd4c4', '#111a1d'],
  ['lab block hash (purple)', '#baaeeb', '#111a1d'],
  ['lab block seq (muted)', '#98a8a9', '#111a1d'],
  ['lab altered status (orange)', '#ffb17d', '#1c1610'],
  ['lab unverifiable status (muted, opacity .9 over #13191c)', mix('#98a8a9', '#13191c', 0.9), mix('#0e1316', '#13191c', 0.9)],
  ['lab reason', '#ffe9d6', '#1c1610'],
  ['lab tamper button text', '#ffe0c4', '#1b2427'],
  ['lab hint / engine (muted)', '#98a8a9', '#0d1417'],
  ['lab live', '#e1ebe8', '#0d1417'],
  ['lab mono (purple)', '#baaeeb', '#0d1417'],
  ['disabled button text (#eef4e9 at opacity .45 over #0d1417)', mix('#eef4e9', '#0d1417', 0.45), mix('#1b2427', '#0d1417', 0.45)],
];
for (const [n, fg, bg] of rows) console.log(`${ratio(fg, bg)}:1  ${fg} on ${bg}  ${n}`);
