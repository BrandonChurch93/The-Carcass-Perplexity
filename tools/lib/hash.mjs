import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT, rel, config } from './paths.mjs';

const slash = (f) => path.relative(ROOT, f).split(path.sep).join('/');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.DS_Store') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function digest(files) {
  const h = crypto.createHash('sha256');
  for (const f of [...files].sort()) {
    h.update(slash(f));
    h.update('\0');
    h.update(fs.readFileSync(f));
    h.update('\0');
  }
  return h.digest('hex').slice(0, 16);
}

const under = (f, ...parts) => f.startsWith(rel(...parts) + path.sep);

export const unitIds = () => config().units.map((u) => u.id);

export function engineFiles() {
  return [
    ...walk(rel('src')).filter((f) => !under(f, 'src', 'places')),
    ...walk(rel('config')).filter((f) => path.basename(f) !== 'webgl-caps.json'),
    ...walk(rel('public')).filter((f) => !under(f, 'public', 'assets')),
    rel('package-lock.json'),
    rel('cut', 'CUTLIST.json'),
    rel('tools', 'lib', 'judged.mjs'),
    rel('index.html'),
    rel('vite.config.ts'),
  ].filter((f) => fs.existsSync(f));
}

export const unitFiles = (id) => [...walk(rel('src', 'places', id)), ...walk(rel('public', 'assets', id))];
export const engineHash = () => digest(engineFiles());
export const unitHash = (id) => digest(unitFiles(id));
export const unitHashes = () => Object.fromEntries(unitIds().map((id) => [id, unitHash(id)]));
export const state = () => ({ engine: engineHash(), units: unitHashes() });
export const filesHash = (files) => digest(files.map((f) => path.resolve(ROOT, f)).filter((f) => fs.existsSync(f)));
export const approvedFiles = () => walk(rel('references', 'approved')).map(slash);
