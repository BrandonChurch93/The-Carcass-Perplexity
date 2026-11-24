import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const rel = (...p) => path.join(ROOT, ...p);
export const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
export const writeJson = (p, v) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n');
};
export const config = () => readJson(rel('config', 'showcase.json'));
export const args = (argv = process.argv.slice(2)) => {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const vals = [];
      while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) vals.push(argv[++i]);
      out[k] = vals.length === 0 ? true : vals.length === 1 ? vals[0] : vals;
    } else out._.push(a);
  }
  return out;
};
export const utc = (d = new Date()) => d.toISOString().replace(/\.\d+Z$/, 'Z');
