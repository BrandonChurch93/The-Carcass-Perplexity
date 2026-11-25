import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { rel } from './paths.mjs';

export const WEB_MIX = 'mix.m4a';
export const WEB_MIX_KBPS = 192;
const SOURCES = ['.flac', '.wav'];

export function newestMix(dir = rel('audio', 'mix')) {
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter((f) => SOURCES.includes(path.extname(f).toLowerCase()))
    .map((f) => path.join(dir, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs || (a < b ? -1 : 1));
  return files[0] ?? null;
}

export function webMixArgs(source, target, kbps = WEB_MIX_KBPS) {
  return ['-v', 'error', '-y', '-i', source, '-vn', '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact', '-c:a', 'aac', '-b:a', `${kbps}k`, '-movflags', '+faststart', target];
}

export function webMix(outDir, { source = newestMix(), cache = rel('out', 'work', 'webmix'), run = spawnSync } = {}) {
  const target = path.join(outDir, WEB_MIX);
  if (!source || !fs.existsSync(outDir)) return { file: null, why: source ? 'There is no build to add the sound to.' : 'There is no mix under audio/mix. The film plays silent.' };
  const tag = crypto.createHash('sha256').update(fs.readFileSync(source)).update(String(WEB_MIX_KBPS)).digest('hex').slice(0, 16);
  const kept = path.join(cache, `${tag}.m4a`);
  if (!fs.existsSync(kept)) {
    fs.mkdirSync(cache, { recursive: true });
    const made = `${kept}.part.m4a`;
    const r = run('ffmpeg', webMixArgs(source, made), { stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8' });
    if (r.status !== 0 || !fs.existsSync(made)) return { file: null, why: `The web copy of the mix could not be made: ${String(r.stderr ?? r.error ?? '').trim().split('\n')[0]}` };
    fs.renameSync(made, kept);
  }
  fs.copyFileSync(kept, target);
  return { file: target, why: null, source };
}
