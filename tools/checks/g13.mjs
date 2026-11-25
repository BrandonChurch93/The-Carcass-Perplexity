import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { CUT_LIST, readJsonIf, readTextIf, count } from './inputs.mjs';
import { loadRenderer } from './parts.mjs';
import { PROGRESS, SECTION, sectionOf } from './g6.mjs';
import { judgedList, readJudgedTable } from '../lib/judged.mjs';
import { countFlagged } from '../lib/parts-core.mjs';
import { unitHash } from '../lib/hash.mjs';
import * as core from '../lib/standins-core.mjs';

export const REGISTER = 'parts/PARTS.json';
export const WORK = 'out/work/gate/g13';
const FORMAT = 'preview';
const TIER = 'draft';

const first = (e) => String(e.message).split('\n')[0];
const red = (line) => ({ ok: false, lines: [line], skipped: [] });

export function judgedOf(cfg, cut, progress) {
  const list = judgedList(cfg, cut);
  const section = sectionOf(progress ?? '', SECTION);
  const added = section === null ? [] : readJudgedTable(section).filter((e) => !list.some((x) => x.id === e.id));
  return [...list, ...added];
}

async function rgb(data, width, height) {
  return sharp(data, { raw: { width, height, channels: 4 } }).flip().removeAlpha().raw().toBuffer();
}

async function flaggedFrames(renderer, frames, standIns) {
  const out = new Map(standIns.map((p) => [p.id, []]));
  for (const at of frames) {
    const where = Number.isInteger(at.loop) ? { loop: at.loop } : { frame: at.frame };
    const all = await renderer.renderRaw({ ...where, tier: TIER, format: FORMAT, diag: 'standins', hold: true });
    if (countFlagged(all.data) === 0) continue;
    for (const p of standIns) {
      const r = await renderer.renderRaw({ ...where, tier: TIER, format: FORMAT, diag: 'standins', part: p.id, hold: true });
      const flagged = countFlagged(r.data);
      if (flagged > 0) out.get(p.id).push({ ...at, share: flagged / (r.width * r.height) });
    }
  }
  return out;
}

async function compare(renderer, root, part, dir) {
  const ref = path.join(root, part.standIn.picture);
  if (!fs.existsSync(ref)) return { missing: true };
  try {
    const was = await sharp(ref).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const { frame, format, tier } = part.standIn;
    const r = await renderer.renderRaw({ frame, tier, format, diag: 'solo', part: part.id, hold: true });
    if (r.width !== was.info.width || r.height !== was.info.height) return { error: `the reference is ${was.info.width} x ${was.info.height} and the picture now is ${r.width} x ${r.height}.` };
    const now = await rgb(r.data, r.width, r.height);
    const file = path.join(dir, part.unit, `${part.name}.png`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await sharp(now, { raw: { width: r.width, height: r.height, channels: 3 } }).png({ compressionLevel: 3 }).toFile(file);
    return { ...core.maskedMeanDifference(was.data, now), now: path.relative(root, file).split(path.sep).join('/') };
  } catch (e) {
    return { error: first(e) };
  }
}

export async function runG13(ctx, deps = {}) {
  const cfg = ctx.config;
  const hashOf = deps.hashOf ?? unitHash;
  const register = readJsonIf(ctx.root, REGISTER);
  if (register === null) return red(`There is no ${REGISTER}.`);
  const cut = readJsonIf(ctx.root, CUT_LIST);
  if (cut === null) return red(`There is no ${CUT_LIST}, so the judged frames are not known.`);
  const progress = readTextIf(ctx.root, PROGRESS);
  let cover;
  try {
    cover = core.coverage({ phase: ctx.phase, asked: core.unitList(ctx.units), states: core.unitStates(progress), units: cfg.units });
  } catch (e) {
    return red(first(e));
  }
  const parts = core.coveredParts(register, cover);
  const head = core.coverageLine(cover, parts.length);
  if (!cover.units.length) return { ok: true, lines: [head], skipped: [] };
  const empty = cover.units.filter((u) => cfg.film.order.includes(u) && !parts.some((p) => p.unit === u));
  if (empty.length) return red(`${REGISTER} lists no part of ${empty.join(', ')}. Run npm run parts.`);

  const { renderer, error } = await loadRenderer(ctx);
  if (error) return red(error);
  const units = cover.all ? [...new Set([...cover.units, ...parts.map((p) => p.unit)])] : cover.units;
  const list = judgedOf(cfg, cut, progress);
  const names = { film: cover.film, loopUnit: cfg.deliver.cardLoop.unit };
  const live = new Map();
  const flagged = new Map();
  const frames = new Map();
  const pictures = new Map();
  const notes = [];
  const skipped = [];
  const hashes = {};
  let listed = new Set();
  await renderer.holdRenderer();
  try {
    for (const u of units) {
      const mine = parts.filter((p) => p.unit === u);
      let drawn = [];
      try {
        drawn = await renderer.unitParts(u);
      } catch (e) {
        if (mine.length) notes.push(`The page gave no parts for ${u}: ${first(e)}`);
      }
      for (const l of drawn) live.set(l.id, l);
      const judged = core.judgedFramesOf(list, cut, u, names);
      frames.set(u, judged.length);
      const standIns = mine.filter((p) => live.get(p.id)?.state === core.STAND_IN);
      for (const [id, at] of await flaggedFrames(renderer, judged, standIns)) flagged.set(id, at);
      const unknown = core.strangers(drawn, register);
      if (unknown.length) notes.push(`The page draws ${count(unknown.length, 'part')} of ${u} that ${REGISTER} does not list: ${unknown.join(', ')}. Run npm run parts -- --unit ${u} --write.`);
      if (mine.length) {
        hashes[u] = hashOf(u);
        if (mine.some((p) => !p.missing && p.hash !== hashes[u])) notes.push(`${REGISTER} was written from other files of ${u} than today's. Run npm run parts -- --unit ${u} --write.`);
      }
    }
    listed = new Set(((await renderer.pageInfo()).standIns ?? []).map((s) => s.part));
    for (const p of parts) {
      if (p.standIn?.picture && !p.missing && live.has(p.id)) pictures.set(p.id, await compare(renderer, ctx.root, p, path.join(ctx.root, WORK)));
    }
  } catch (e) {
    return red(`The page could not be judged: ${first(e)}`);
  } finally {
    renderer.releaseRenderer();
  }

  const min = cfg.quality.standInMinMeanDifference;
  const seen = (p) => ({
    live: live.get(p.id) ?? null,
    hashNow: hashes[p.unit] ?? null,
    frames: frames.get(p.unit) ?? 0,
    flagged: flagged.get(p.id) ?? [],
    listed: listed.has(p.id),
    picture: pictures.get(p.id) ?? null,
  });
  const faults = parts.flatMap((p) => core.partFaults(p, seen(p), { min }));
  for (const id of core.unseen(parts)) skipped.push(`test 4 for ${id}: it was never seen in the film as a stand-in, so it has no reference picture`);
  const strange = notes.filter((n) => n.includes('does not list'));
  const ok = faults.length === 0 && strange.length === 0;
  const tally = core.countLine(parts, faults);
  const record = { at: new Date().toISOString(), phase: ctx.phase, asked: core.unitList(ctx.units), cover, ok, min, parts: parts.map((p) => ({ id: p.id, state: p.state, ...seen(p), faults: faults.filter((f) => f.part === p.id).map((f) => f.test) })) };
  fs.mkdirSync(path.join(ctx.root, WORK), { recursive: true });
  fs.writeFileSync(path.join(ctx.root, WORK, 'g13.json'), JSON.stringify(record, null, 2) + '\n');
  const lines = ok ? [head, tally] : [...faults.map((f) => f.line), ...strange, tally, head, ...notes.filter((n) => !strange.includes(n))];
  return { ok, lines, skipped };
}
