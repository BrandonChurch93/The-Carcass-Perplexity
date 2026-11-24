import fs from 'node:fs';
import path from 'node:path';
import { rel, args, utc, ROOT } from './lib/paths.mjs';

export const LOOKS = rel('out', 'work', 'looks', 'index.jsonl');

export function addLook(file, caption, by = 'builder', extra = {}) {
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) throw new Error(`look: no such file ${file}`);
  fs.mkdirSync(path.dirname(LOOKS), { recursive: true });
  const line = { file: path.relative(ROOT, abs), caption, at: utc(), by, ...extra };
  fs.appendFileSync(LOOKS, JSON.stringify(line) + '\n');
  return line;
}

export function readLooks() {
  if (!fs.existsSync(LOOKS)) return [];
  return fs.readFileSync(LOOKS, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = args();
  if (a.add) {
    const l = addLook(a.add, Array.isArray(a.caption) ? a.caption.join(' ') : a.caption ?? '', Array.isArray(a.by) ? a.by.join(' ') : a.by ?? 'builder');
    console.log(`look added: ${l.file} | ${l.caption} | ${l.by} | ${l.at}`);
  } else if (a.list) {
    for (const l of readLooks().slice(-(Number(a.list) || 20))) console.log(`${l.at} ${l.by} ${l.file} | ${l.caption}`);
  } else console.log('usage: npm run look -- --add FILE --caption TEXT --by NAME | --list [N]');
}
