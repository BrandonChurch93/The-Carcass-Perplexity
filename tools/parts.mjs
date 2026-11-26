import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { rel, args, config, readJson, writeJson, utc } from './lib/paths.mjs';
import { isMain, relPath } from './lib/img.mjs';
import { unitFiles, unitHash } from './lib/hash.mjs';
import * as core from './lib/parts-core.mjs';

export const USAGE = 'usage: npm run parts [-- --unit ID ...] [--refresh] [--fresh] [--no-pictures] [--write]';
const REGISTER = rel('parts', 'PARTS.json');
const FORMAT = 'preview';
const TIER = 'draft';

const list = (v) => (v === undefined || v === true ? [] : Array.isArray(v) ? v.map(String) : [String(v)]);

async function shownAt(renderer, part, frames) {
  const out = [];
  for (const frame of frames) {
    const r = await renderer.renderRaw({ frame, tier: TIER, format: FORMAT, diag: 'standins', part: part.id, hold: true });
    out.push({ frame, flagged: core.countFlagged(r.data), pixels: r.width * r.height });
  }
  return out;
}

async function keepPicture(renderer, part, frame) {
  const r = await renderer.renderRaw({ frame, tier: TIER, format: FORMAT, diag: 'solo', part: part.id, hold: true });
  const file = rel(...core.pictureOf(part).split('/'));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp(r.data, { raw: { width: r.width, height: r.height, channels: 4 } }).flip().removeAlpha().png({ compressionLevel: 9 }).toFile(file);
  return file;
}

export async function partsCommand(a, deps = {}) {
  const print = deps.print ?? ((l) => console.log(l));
  const cfg = deps.cfg ?? config();
  // The places in the order of the film, then the unit of the whole film, whose parts no single place owns (src/film/parts.ts).
  const order = [...cfg.film.order, core.filmUnit(cfg)].filter((u, i, all) => all.indexOf(u) === i);
  const units = list(a.unit).length ? list(a.unit) : order;
  const renderer = deps.renderer ?? (await import('./lib/render.mjs'));
  let held = false;
  try {
    for (const u of units) if (!order.includes(u)) throw new Error(`No such unit: ${u}`);
    const cut = deps.cut ?? readJson(rel('cut', 'CUTLIST.json'));
    const old = fs.existsSync(REGISTER) ? readJson(REGISTER) : { parts: [] };
    const live = [];
    for (const u of order) {
      if (units.includes(u)) live.push(...(await renderer.unitParts(u)));
      else live.push(...(old.parts ?? []).filter((p) => p.unit === u && !p.missing));
    }
    const hashes = Object.fromEntries(order.map((u) => [u, unitHash(u)]));
    const files = Object.fromEntries(order.map((u) => [u, [...new Set(unitFiles(u).map((f) => relPath(f).split(path.sep).slice(0, 3).join('/')))].sort()]));
    const { register, faults } = core.mergeRegister(old, live, { hashes, files, order, fresh: a.fresh === true, units });
    if (a.fresh === true && register.parts.some((p) => p.state !== 'stand-in')) throw new Error('--fresh is only for a register in which every part is still a stand-in.');
    const never = [];
    if (a['no-pictures'] !== true) {
      await renderer.holdRenderer();
      held = true;
      for (const part of register.parts) {
        if (!units.includes(part.unit) || !core.needsPicture(part, a.refresh === true || a.fresh === true)) continue;
        let seen = await shownAt(renderer, part, core.candidateFrames(cut, cfg, part.unit));
        let best = core.pickFrame(seen);
        if (!best) {
          seen = await shownAt(renderer, part, core.widerFrames(cut, part.unit));
          best = core.pickFrame(seen);
        }
        if (!best) {
          never.push(part.id);
          part.standIn = { ...part.standIn, picture: null, frame: null, format: null, tier: null, shown: 0 };
          continue;
        }
        const file = await keepPicture(renderer, part, best.frame);
        part.standIn = { ...part.standIn, picture: relPath(file).split(path.sep).join('/'), frame: best.frame, format: FORMAT, tier: TIER, shown: Math.round((best.flagged / best.pixels) * 10000) / 10000, made: utc() };
        print(`parts: ${part.id} is shown best at frame ${best.frame}, where it covers ${((best.flagged / best.pixels) * 100).toFixed(1)} percent of the frame`);
      }
    }
    for (const f of faults) print(`parts: ${f}`);
    for (const id of never) print(`parts: ${id} is never seen in the film at the frames tried. It has no reference picture.`);
    const { rows, total } = core.counts(register, order);
    for (const r of rows) print(`parts: ${r.unit}: ${r.parts} parts (${core.namesLine(register, r.unit)})`);
    print(`parts: ${total.parts} parts, ${total['stand-in']} stand-in, ${total.built} built, ${total.fallback} fallback`);
    if (a.write === true) {
      writeJson(REGISTER, register);
      print(`parts: ${relPath(REGISTER)}`);
    } else print('parts: nothing was written. Add --write to write the register.');
    return { code: faults.length || never.length ? 2 : 0, register, faults, never };
  } catch (e) {
    print(`parts: ${String(e.message).split('\n')[0]}`);
    return { code: 1, register: null };
  } finally {
    if (held) renderer.releaseRenderer();
    await renderer.closeRenderer?.();
  }
}

if (isMain(import.meta)) {
  partsCommand(args()).then(({ code }) => process.exit(code === 2 ? 0 : code));
}
