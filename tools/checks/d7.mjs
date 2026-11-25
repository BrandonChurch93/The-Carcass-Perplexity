import fs from 'node:fs';
import path from 'node:path';
import { readJsonIf, report } from './inputs.mjs';
import { probeFile } from './d1.mjs';
import { sameState } from './d2.mjs';
import { state } from '../lib/hash.mjs';

export const PROOF = 'out/work/local/proof.json';
export const PROOF_TIER = 'draft';
export const LOOP_FROM = 6;

export const proofFrames = (cfg) => Math.round(cfg.export.local.proofSeconds * cfg.film.fps);

function partFaults(what, part, probe, cfg, out) {
  const size = cfg.formats.preview;
  const rate = cfg.film.fps;
  const want = proofFrames(cfg);
  if (!part || !part.file) return void out.faults.push(`${PROOF} holds no ${what} part.`);
  if (probe === null) return void out.faults.push(`${part.file}, the ${what} part of the proof, is not there.`);
  if (probe.width === null) return void out.faults.push(`${part.file} holds no picture stream.`);
  const wrong = [];
  if (probe.width !== size.width || probe.height !== size.height) wrong.push(`it is ${probe.width} x ${probe.height} and formats.preview is ${size.width} x ${size.height}`);
  if (probe.fps === null || Math.abs(probe.fps - rate) > 1e-6) wrong.push(`it runs at ${probe.fps === null ? 'an unknown number of' : Number(probe.fps.toFixed(3))} frames a second and film.fps is ${rate}`);
  if (probe.frames !== want) wrong.push(`it has ${probe.frames ?? 'an unknown number of'} frames and export.local.proofSeconds at film.fps is ${want}`);
  if (part.last - part.first + 1 !== want) wrong.push(`the proof says it shows frames ${part.first} to ${part.last}, which are not ${want} frames`);
  if (wrong.length) out.faults.push(`The ${what} part of the proof, ${part.file}, is wrong: ${wrong.join('; ')}.`);
  else out.info.push(`The ${what} part of the proof, ${part.file}, is ${probe.width} x ${probe.height} at ${rate} frames a second with ${probe.frames} frames${what === 'film' ? (part.cut === null || part.cut === undefined ? ', from the middle of the one shot' : `, across the cut at frame ${part.cut}`) : ''}${probe.sound ? ', with a sound stream' : ', silent'}.`);
}

export function proofFaults({ proof, probes, now, phase }, cfg) {
  const out = { faults: [], info: [], skipped: [] };
  if (proof.format !== cfg.formats.preview.id || proof.tier !== PROOF_TIER) out.faults.push(`${PROOF} was made in ${proof.format} at the ${proof.tier} tier, not in ${cfg.formats.preview.id} at the ${PROOF_TIER} tier.`);
  if (!sameState(proof.built, now)) out.faults.push(`${PROOF} was made from another build than the one in this folder: it holds the engine ${proof.built?.engine ?? 'none'} and the engine is now ${now.engine}.`);
  else out.info.push(`${PROOF} was made from the build in this folder, engine ${now.engine}.`);
  partFaults('film', proof.film, probes.film, cfg, out);
  if (phase >= LOOP_FROM) partFaults('loop', proof.loop, probes.loop, cfg, out);
  else out.skipped.push(`the loop part of the proof is checked from Phase ${LOOP_FROM}`);
  return out;
}

export async function runD7(ctx, probe = probeFile, now = state) {
  const proof = readJsonIf(ctx.root, PROOF);
  if (proof === null) return { ok: false, lines: [`There is no ${PROOF}. npm run render:local -- --proof makes it.`], skipped: [] };
  const read = (part) => (part && part.file && fs.existsSync(path.join(ctx.root, part.file)) ? probe(path.join(ctx.root, part.file)) : null);
  return report(proofFaults({ proof, probes: { film: read(proof.film), loop: read(proof.loop) }, now: now(), phase: ctx.phase }, ctx.config));
}
