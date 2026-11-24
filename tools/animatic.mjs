import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { Worker } from 'node:worker_threads';
import { ROOT, rel, args, config, readJson } from './lib/paths.mjs';
import { isMain, one, relPath } from './lib/img.mjs';
import * as core from './lib/animatic-core.mjs';
import { drawer, still } from './lib/animatic-draw.mjs';

export const USAGE = 'usage: node tools/animatic.mjs [--cut PATH] [--mix PATH | --silent] [--out PATH] [--still FRAME ...] [--from FRAME --to FRAME]';
const CUT_LIST = 'cut/CUTLIST.json';
const MIX_DIR = ['audio', 'mix'];
const say = (line) => console.log(`animatic: ${line}`);

export function findSound({ cut, mix = null, silent = false, root = ROOT }) {
  if (silent) return { mix: null, music: null, why: 'no sound stream, --silent was given' };
  if (mix) {
    const file = path.resolve(mix);
    if (!fs.existsSync(file)) throw new Error(`the mix ${mix} is not there`);
    return { mix: file, music: null, why: `sound from the mix ${path.relative(root, file)}` };
  }
  const dir = path.join(root, ...MIX_DIR);
  const found = fs.existsSync(dir) ? fs.readdirSync(dir).map((n) => ({ file: path.join(dir, n), mtimeMs: fs.statSync(path.join(dir, n)).mtimeMs })) : [];
  const newest = core.newestSound(found);
  if (newest) return { mix: newest, music: null, why: `sound from the newest mix ${path.relative(root, newest)}` };
  const music = cut.music && cut.music.file ? path.join(root, cut.music.file) : null;
  if (music && fs.existsSync(music)) return { mix: null, music, why: `no mix yet, sound from the music ${cut.music.file} laid as the cut list says` };
  return { mix: null, music: null, why: 'no sound stream, there is no mix and no music file' };
}

function pool(size, data) {
  const workers = [];
  for (let i = 0; i < size; i++) workers.push(new Worker(new URL('./lib/animatic-worker.mjs', import.meta.url), { workerData: data }));
  return workers;
}

async function encode({ cut, cfg, first, count, out, sound, log }) {
  const W = cfg.formats.preview.width;
  const H = cfg.formats.preview.height;
  const fps = cfg.film.previewFps;
  const ff = spawn('ffmpeg', core.encodeArgs({ width: W, height: H, fps, bitrateMbps: cfg.export.preview.bitrateMbps, audioRate: cfg.audio.sampleRate, sound, out, frames: count }), { stdio: ['pipe', 'inherit', 'pipe'] });
  let errors = '';
  ff.stderr.on('data', (d) => (errors += d));
  const closed = new Promise((res) => ff.on('close', res));
  ff.stdin.on('error', () => {});
  const size = Math.max(1, Math.min(os.cpus().length, 8) - 1);
  const workers = pool(size, { cut, cfg });
  const ready = new Map();
  let sent = 0;
  let written = 0;
  let failed = null;
  const room = size * 4;
  await new Promise((done) => {
    const feed = (w) => {
      if (failed || sent >= count || sent - written >= room) return (w.idle = true);
      w.idle = false;
      const p = first + sent++;
      w.postMessage({ p, f: core.filmFrame(p, cfg) });
    };
    const wake = () => workers.forEach((w) => w.idle && feed(w));
    let draining = false;
    const flush = () => {
      while (!draining && ready.has(first + written)) {
        const data = ready.get(first + written);
        ready.delete(first + written);
        written++;
        if (written % (fps * 20) === 0) log(`${written} of ${count} frames`);
        if (!ff.stdin.write(data)) {
          draining = true;
          ff.stdin.once('drain', () => {
            draining = false;
            flush();
          });
        }
      }
      if (written >= count) return done();
      wake();
    };
    for (const w of workers) {
      w.on('message', (m) => {
        if (m.error) failed = failed || m.error;
        if (failed) return done();
        ready.set(m.p, m.data);
        feed(w);
        flush();
      });
      w.on('error', (e) => {
        failed = failed || e.message;
        done();
      });
      feed(w);
    }
    ff.on('close', () => {
      if (written < count) {
        failed = failed || `ffmpeg stopped early: ${errors.trim().split('\n').pop()}`;
        done();
      }
    });
    if (count === 0) done();
  });
  ff.stdin.end();
  await Promise.all(workers.map((w) => w.terminate()));
  const code = await closed;
  if (failed) throw new Error(failed);
  if (code !== 0) throw new Error(`ffmpeg failed: ${errors.trim().split('\n').pop()}`);
}

export function probe(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-count_frames', '-show_entries', 'stream=codec_type,codec_name,width,height,avg_frame_rate,nb_read_frames,nb_frames', '-of', 'json', file], { encoding: 'utf8', maxBuffer: 1 << 24 });
  if (r.status !== 0) throw new Error(`ffprobe could not read ${file}`);
  return JSON.parse(r.stdout);
}

export async function run(a = args(), log = say) {
  const cfg = config();
  const cutFile = path.resolve(one(a.cut, rel(CUT_LIST)));
  if (!fs.existsSync(cutFile)) throw new Error(`there is no cut list at ${relPath(cutFile)}`);
  const cut = readJson(cutFile);
  if (cut.fps !== cfg.film.fps) throw new Error(`the cut list is at ${cut.fps} frames a second and the film is at ${cfg.film.fps}`);
  const W = cfg.formats.preview.width;
  const H = cfg.formats.preview.height;
  if (a.still !== undefined) {
    const frames = [].concat(a.still).map(Number);
    if (a.still === true || frames.some((f) => !Number.isInteger(f) || f < 0 || f >= cut.frameCount)) throw new Error(`--still takes film frames from 0 to ${cut.frameCount - 1}`);
    const draw = drawer({ cut, cfg });
    const dir = rel('out', 'work', 'animatic');
    fs.mkdirSync(dir, { recursive: true });
    for (const f of frames) {
      const t = Date.now();
      const file = await still(draw, f, path.join(dir, `frame-${f}.png`));
      log(`wrote ${relPath(file)}, film frame ${f}, ${W} x ${H}, ${((Date.now() - t) / 1000).toFixed(2)} s`);
    }
    return 0;
  }
  const part = a.from !== undefined || a.to !== undefined;
  const from = part ? Number(one(a.from, 0)) : 0;
  const to = part ? Number(one(a.to, cut.frameCount)) : cut.frameCount;
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to > cut.frameCount || to <= from) throw new Error(`--from and --to take film frames from 0 to ${cut.frameCount}, with --to after --from`);
  const s = core.span(cut, cfg, from, to);
  const seconds = s.count / cfg.film.previewFps;
  const name = part ? `animatic-${from}-${to}.mp4` : cfg.export.files.animatic;
  const out = path.resolve(one(a.out, rel('out', 'work', 'film', name)));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const found = findSound({ cut, mix: a.mix === true ? null : one(a.mix, null), silent: Boolean(a.silent) });
  const sound = core.soundPlan({ mix: found.mix, music: found.music, pieces: cut.music ? cut.music.pieces : [], from: s.seconds, seconds });
  log(`${s.count} frames at ${cfg.film.previewFps} a second, ${W} x ${H}, film frames ${from} to ${to} of ${relPath(cutFile)}`);
  log(found.why);
  const t = Date.now();
  await encode({ cut, cfg, first: s.first, count: s.count, out, sound, log });
  const took = (Date.now() - t) / 1000;
  const wrong = core.checkProbe(probe(out), { width: W, height: H, fps: cfg.film.previewFps, frames: s.count, sound: Boolean(sound) });
  const mb = fs.statSync(out).size / 1e6;
  log(`wrote ${relPath(out)}, ${s.count} frames, ${seconds.toFixed(2)} s of film, ${mb.toFixed(1)} MB, in ${took.toFixed(1)} s`);
  if (wrong.length) throw new Error(`${relPath(out)} is wrong: ${wrong.join('; ')}`);
  log(`checked with ffprobe: ${W} x ${H}, ${cfg.film.previewFps} frames a second, ${s.count} frames, ${sound ? 'one sound stream' : 'no sound stream'}`);
  return 0;
}

if (isMain(import.meta)) {
  const a = args();
  if (a.help) {
    console.log(USAGE);
    process.exit(0);
  }
  run(a).then(
    (code) => process.exit(code),
    (e) => {
      console.error(`animatic: ${e.message}`);
      process.exit(1);
    },
  );
}
