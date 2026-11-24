import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { rel, args, config, writeJson } from './lib/paths.mjs';
import { isMain, one, relPath } from './lib/img.mjs';
import * as core from './lib/audiomap-core.mjs';

export const USAGE = 'usage: npm run audiomap [-- --file PATH] [--out PATH] [--plot PATH] [--from-landmarks] [--no-plot]';
const SUPPLIED = ['audio', 'supplied'];
const MAP_FILE = ['cut', 'MAP.json'];
const PLOT_FILE = ['out', 'work', 'map', 'map.png'];
const REVEAL_FROM = 140;
const REVEAL_SCALE = 4;
const BIG = 1 << 30;

export function decode(file, rate = core.ANALYSIS_RATE) {
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(rate), '-f', 'f32le', '-'], { maxBuffer: BIG });
  const out = new Float32Array(Math.floor(buf.length / 4));
  for (let i = 0; i < out.length; i++) out[i] = buf.readFloatLE(i * 4);
  return out;
}

export function probe(file) {
  const j = JSON.parse(
    execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=sample_rate,channels:format=duration', '-of', 'json', file], { maxBuffer: BIG }).toString()
  );
  return { seconds: core.r2(Number(j.format.duration)), sampleRate: Number(j.streams[0].sample_rate), channels: Number(j.streams[0].channels) };
}

export const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

export async function drawPlots(map, curves, plot, cfg = config()) {
  fs.mkdirSync(path.dirname(plot), { recursive: true });
  const marks = cfg.music.landmarks;
  const whole = core.plotSvg(map, curves, { configLandmarks: marks });
  await sharp(Buffer.from(whole)).png().toFile(plot);
  const width = 2400;
  const perSecond = (width / map.source.seconds) * REVEAL_SCALE;
  const reveal = core.plotSvg(map, curves, { from: map.source.seconds > REVEAL_FROM ? REVEAL_FROM : map.source.seconds / 2, pxPerSecond: perSecond, configLandmarks: marks });
  const second = plot.replace(/\.png$/, '-reveal.png');
  await sharp(Buffer.from(reveal), { limitInputPixels: false }).png().toFile(second);
  return [plot, second];
}

export function report(map, detail = null) {
  const L = [];
  const p = (s) => L.push(`audiomap: ${s}`);
  const s = map.source;
  p(`${s.file}, ${s.seconds} s, ${s.sampleRate ?? 'unknown'} Hz, ${s.channels ?? 'unknown'} channels, sha256 ${s.sha256}`);
  p(`made from ${map.madeFrom}`);
  const t = map.tempo;
  p(`tempo ${t.bpm} beats a minute, a beat is ${t.beatSeconds} s, ${t.beatsPerBar} beats to a bar, a bar is ${t.barSeconds} s, confidence ${t.confidence}, the config says ${t.configBpm}`);
  if (detail) {
    p(`grid fitted to ${detail.fit.used} of ${detail.fit.of} attacks, ${detail.fit.rms === null ? 'no fit' : `${(detail.fit.rms * 1000).toFixed(1)} ms rms off the beat`}`);
    p(`meter contrast, four beats ${detail.meter.four.toFixed(2)}, three beats ${detail.meter.three.toFixed(2)}. Low strength on each beat of the bar, the mean being 1: ${detail.meter.means.map((v) => v.toFixed(2)).join(', ')}`);
    p(`hit threshold ${detail.threshold.toFixed(2)}, ${detail.jumps} hits from a jump in level alone, strength read as ${detail.strength === 'rise' ? 'rise and attack' : 'attack alone'}`);
  }
  p(`${map.beats.length} beats, ${map.bars.length} bar lines, the first eight at ${map.bars.slice(0, 8).join(', ')}`);
  p(`${map.hits.length} hits. The twelve strongest:`);
  [...map.hits]
    .sort((a, b) => Math.max(b.low, b.full) - Math.max(a.low, a.full))
    .slice(0, 12)
    .forEach((h) => p(`  hit at ${h.t.toFixed(4)} s, low ${h.low.toFixed(2)}, full ${h.full.toFixed(2)}`));
  if (detail && detail.raw) {
    p('The twelve sharpest attacks, by spectral flux:');
    [...detail.raw]
      .sort((a, b) => Math.max(b.attackLow, b.attackFull) - Math.max(a.attackLow, a.attackFull))
      .slice(0, 12)
      .forEach((h) => p(`  attack at ${h.t.toFixed(4)} s, low ${h.attackLow.toFixed(2)}, full ${h.attackFull.toFixed(2)}, rise low ${(h.riseLow ?? 0).toFixed(1)} dB, rise full ${(h.riseFull ?? 0).toFixed(1)} dB`));
  }
  p(`${map.sections.length} sections:`);
  for (const x of map.sections) p(`  ${x.name}, ${x.start} to ${x.end} s${x.lufs === null ? '' : `, ${x.lufs} LUFS`}`);
  p(map.quiet ? `the long quiet runs ${map.quiet.start} to ${map.quiet.end} s` : 'no long quiet was found');
  p('landmark, map, config, difference in bars:');
  for (const [k, c] of Object.entries(map.compare)) p(`  ${k}, ${c.map ?? 'not found'}, ${c.config}, ${c.bars ?? 'none'}`);
  for (const x of map.tries) p(`try ${x.try}, changed ${x.changed}, firstHit ${x.firstHit}, quiet ${x.quietStart} to ${x.quietEnd}, revealHit ${x.revealHit}, ${x.agrees ? 'agrees' : 'does not agree'}`);
  p(map.usedConfigFor.length ? `used the config for ${map.usedConfigFor.join(', ')}` : 'used the config for nothing');
  for (const n of map.notes) p(`note. ${n}`);
  return L;
}

export async function audiomapCommand(a, deps = {}) {
  const cfg = deps.cfg ?? config();
  const print = deps.print ?? console.log;
  const out = path.resolve(one(a.out, rel(...MAP_FILE)));
  const plot = path.resolve(one(a.plot, rel(...PLOT_FILE)));
  const file = path.resolve(one(a.file, rel(...SUPPLIED, cfg.music.file)));
  let map;
  let detail = null;
  let curves = null;
  if (a['from-landmarks']) {
    map = core.mapFromLandmarks(cfg.music);
  } else {
    if (!fs.existsSync(file)) throw new Error(`no music file at ${relPath(file)}. Run with --from-landmarks to write the map from the config`);
    const info = probe(file);
    const hash = sha256(file);
    const samples = decode(file);
    if (samples.length < core.ANALYSIS_RATE) throw new Error(`${relPath(file)} decoded to less than a second of sound`);
    const an = core.analyse(samples, core.ANALYSIS_RATE, { configBpm: cfg.music.bpm });
    const made = core.buildMap(an, { source: { file: path.basename(file), sha256: hash, ...info }, music: cfg.music });
    map = made.map;
    detail = made.detail;
    curves = { loud: an.loud, onset: an.curves };
    map.notes.push(
      `Loudness is K-weighted (the two filters of BS.1770 worked out for ${core.ANALYSIS_RATE} Hz) on the mono fold-down, 0.4 s and 3 s windows centred on each time, no gating. It reads close to LUFS but is not a certified meter.`
    );
    map.notes.push(`Onsets are spectral flux on a ${core.FRAME} point transform every ${core.HOP} samples at ${core.ANALYSIS_RATE} Hz. The low band is everything under ${core.LOW_HZ} Hz. Hit times are moved to the steepest rise of the wave within 60 ms.`);
    if (hash !== cfg.music.sha256) map.notes.push('The hash of this file is not music.sha256.');
  }
  const bad = core.checkMap(map);
  if (bad.length) throw new Error(`the map broke its own schema: ${bad[0]}`);
  writeJson(out, map);
  const lines = report(map, detail);
  for (const l of lines) print(l);
  print(`audiomap: wrote ${relPath(out)}`);
  if (!a['no-plot']) for (const f of await drawPlots(map, curves, plot, cfg)) print(`audiomap: wrote ${relPath(f)}`);
  return { map, lines };
}

if (isMain(import.meta)) {
  audiomapCommand(args()).catch((e) => {
    console.error(`audiomap: ${String(e.message).split('\n')[0]}`);
    process.exit(1);
  });
}
