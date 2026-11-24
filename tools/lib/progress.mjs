import fs from 'node:fs';
import { rel } from './paths.mjs';

const FILE = rel('kit', 'PROGRESS.md');
export const read = () => fs.readFileSync(FILE, 'utf8');
export const write = (s) => fs.writeFileSync(FILE, s);

function bounds(text, title) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => /^#{2,3} /.test(l) && l.replace(/^#+ /, '').trim() === title);
  if (start < 0) throw new Error(`progress: no section "${title}"`);
  const level = lines[start].match(/^#+/)[0].length;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(#+) /);
    if (m && m[1].length <= level) { end = i; break; }
  }
  return { lines, start, end };
}

export function getSection(title, text = read()) {
  const { lines, start, end } = bounds(text, title);
  return lines.slice(start + 1, end).join('\n').trim();
}

export function setSection(title, body, text = read()) {
  const { lines, start, end } = bounds(text, title);
  const out = [...lines.slice(0, start + 1), '', ...body.trim().split('\n'), '', ...lines.slice(end)];
  return out.join('\n');
}

export function appendSection(title, line, text = read()) {
  const cur = getSection(title, text);
  const parts = cur.split('\n');
  const last = parts[parts.length - 1].trim();
  let body;
  if (last === 'none') body = [...parts.slice(0, -1), line].join('\n');
  else body = cur + '\n' + line;
  return setSection(title, body, text);
}

export function setLine(key, value, text = read()) {
  const re = new RegExp(`^- ${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:.*$`, 'm');
  if (!re.test(text)) throw new Error(`progress: no line "- ${key}:"`);
  return text.replace(re, `- ${key}: ${value}`);
}

export function setRow(first, cells, text = read()) {
  const lines = text.split('\n');
  const i = lines.findIndex((l) => l.startsWith('|') && l.split('|')[1].trim() === first);
  if (i < 0) throw new Error(`progress: no row "${first}"`);
  const old = lines[i].split('|').slice(1, -1).map((c) => c.trim());
  const next = old.map((c, k) => (cells[k] === undefined || cells[k] === null ? c : cells[k]));
  lines[i] = '| ' + next.join(' | ') + ' |';
  return lines.join('\n');
}
