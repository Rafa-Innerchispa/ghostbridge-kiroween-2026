/**
 * Regenerates tests/forge-parity.json. Run: node tests/gen_forge_parity.mjs
 * Authored by Kiro (Kiroween 2026). The Node test fails if the committed file is stale.
 */
import {writeFileSync} from 'node:fs';
import {buildParity} from './helpers/forge-parity.mjs';

const data = await buildParity();
writeFileSync(new URL('./forge-parity.json', import.meta.url), JSON.stringify(data, null, 1) + '\n');
console.log(`wrote tests/forge-parity.json with ${data.count} configurations`);
