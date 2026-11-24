import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { CUT_LIST } from './g4.mjs';

export { CUT_LIST };
export const MAP = 'cut/MAP.json';
export const MIX = 'audio/mix/mix.flac';
export const MIX_REPORT = 'audio/mix/mix.json';
export const MIX_TOOL = 'tools/mix.mjs';
export const MUSIC_DIR = 'audio/supplied';
export const KEPT_NARRATION = 'audio/kept/narration';
export const KEPT_LINES = 'audio/kept/lines';
export const KEPT_SOUNDS = 'audio/kept/sounds';
export const RECORDS = 'audio/records';
export const ASSETS = 'ASSETS.md';
export const MS = 0.001;
const EPS = 1e-6;

export const near = (a, b, by = MS) => Math.abs(a - b) <= by + EPS;
export const num = (v, digits = 4) => String(Number(Number(v).toFixed(digits)));
export const count = (n, word, plural = `${word}s`) => `${n} ${n === 1 ? word : plural}`;
export const isWhole = (v) => Number.isInteger(v) && v >= 0;

export function readJsonIf(root, file) {
  const full = path.join(root, file);
  return fs.existsSync(full) ? JSON.parse(fs.readFileSync(full, 'utf8')) : null;
}

export function readTextIf(root, file) {
  const full = path.join(root, file);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
}

export function listFiles(root, dir) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full, { withFileTypes: true })
    .filter((e) => e.isFile() && !e.name.startsWith('.'))
    .map((e) => `${dir}/${e.name}`)
    .sort();
}

export function listFolders(root, dir) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => `${dir}/${e.name}`)
    .sort();
}

export const idOf = (file) => path.basename(file, path.extname(file));

export function recordField(text, label) {
  const line = (text ?? '').split('\n').map((l) => l.trim()).find((l) => l.startsWith(label));
  return line === undefined ? null : line.slice(label.length).trim();
}

export const skip = (reason) => ({ ok: true, lines: [], skipped: [reason] });

export function report({ faults = [], info = [], skipped = [] }) {
  const ok = faults.length === 0;
  return { ok, lines: ok ? info : [...faults, ...info.map((l) => `noted: ${l}`)], skipped };
}

export function tool(command, argv) {
  const r = spawnSync(command, argv, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
  if (r.error) return { code: 1, out: '', err: r.error.message };
  return { code: r.status ?? 1, out: r.stdout.toString(), err: r.stderr.toString() };
}

export function placeOf(cut, unit) {
  return (cut.places ?? []).find((p) => p.unit === unit) ?? null;
}
