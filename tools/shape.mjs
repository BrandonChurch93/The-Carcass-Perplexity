import { rel, readJson, writeJson } from './lib/paths.mjs';

const OPEN = ['settled', 'motion.byUnit', 'budget.phaseHours', 'budget.reserveHours'];
const kind = (v) => (Array.isArray(v) ? 'array' : v === null ? 'any' : typeof v);

function walk(node, prefix, out) {
  for (const [k, v] of Object.entries(node)) {
    const p = prefix ? `${prefix}.${k}` : k;
    out[p] = kind(v);
    if (out[p] === 'object' && !OPEN.includes(p)) walk(v, p, out);
  }
  return out;
}

const shape = walk(readJson(rel('config', 'showcase.json')), '', {});
writeJson(rel('src', 'config.shape.json'), shape);
console.log(`shape: ${Object.keys(shape).length} keys with fixed names written to src/config.shape.json`);
