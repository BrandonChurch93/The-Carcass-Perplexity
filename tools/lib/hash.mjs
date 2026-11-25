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

// What no frame is drawn from. The page reads none of these keys to draw: of the config it only checks the
// names in narration and settled (validate in src/config.ts), and of the cut list it reads what CutList in
// src/film/cut.ts declares. Sound, the credit cap and the lines settled for the critics change no pixel, and
// the kit joins the kept picture with a new mix when only sound changed ("A review round", step 6, in
// kit/08-BUILD-ORDER.md). So these three files are hashed without those keys, and a render stays from this
// build when only they change. tests/hash.test.ts fails when the page starts to read one of them.
export const NOT_PICTURE = {
  'config/showcase.json': ['music', 'narration', 'audio', 'credits', 'settledAll', 'settled', 'settledWhenRestaged'],
  'cut/CUTLIST.json': ['music', 'lines', 'sounds', 'mix'],
};
export const CONFIG_SHAPE = 'src/config.shape.json';

// The bytes of one engine file as the hash reads them. `name` is the path from the root, with forward slashes.
export function pictureBytes(name, bytes) {
  const drop = NOT_PICTURE[name];
  if (drop) {
    const whole = JSON.parse(bytes.toString('utf8'));
    for (const key of drop) delete whole[key];
    return Buffer.from(JSON.stringify(whole));
  }
  if (name === CONFIG_SHAPE) {
    const gone = new Set(NOT_PICTURE['config/showcase.json']);
    const shape = JSON.parse(bytes.toString('utf8'));
    return Buffer.from(JSON.stringify(Object.fromEntries(Object.entries(shape).filter(([key]) => !gone.has(key.split('.')[0])))));
  }
  return bytes;
}

function digest(files) {
  const h = crypto.createHash('sha256');
  for (const f of [...files].sort()) {
    const name = slash(f);
    h.update(name);
    h.update('\0');
    h.update(pictureBytes(name, fs.readFileSync(f)));
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
