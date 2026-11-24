import path from 'node:path';
import sharp from 'sharp';
import { args, config } from './lib/paths.mjs';
import { addLook } from './look.mjs';
import { criticLimits, formatSize, gridFit, grid, writePng, madeRecord, timecode, spread, relPath, getRenderer, isMain, one, SEP, fakeNote, outDir } from './lib/img.mjs';

export const COLS = 4;

function thin(list, count) {
  return list.length <= count ? list : spread(0, list.length - 1, count).map((i) => list[i]);
}

export async function sheet({ frames = null, loopFrames = null, name, title = null, tier = 'review', format = 'preview', renderer = null, by = 'builder', dir = null, look = true }) {
  const c = config();
  const count = c.critics.contactSheetFrames;
  const asked = frames ? frames.map((f) => (typeof f === 'object' ? f : { frame: f })) : (loopFrames ?? []).map((n) => ({ loop: n }));
  const list = thin(asked, count);
  if (!list.length) throw new Error('sheet: no frames');
  const r = renderer ?? (await getRenderer(false));
  const size = formatSize(format);
  const cell = gridFit({ cols: COLS, rows: Math.ceil(list.length / COLS), aspect: size.width / size.height, title: true, limits: criticLimits(), maxCell: size });
  const cells = [];
  const stills = [];
  const shown = [];
  for (const f of list) {
    const still = await r.renderStill({ ...(f.key ? { key: f.key } : f.loop !== undefined ? { loop: f.loop } : { frame: f.frame }), tier, format });
    const n = f.loop !== undefined ? f.loop : f.frame ?? still.record?.frame;
    const lead = f.label ? `${f.label}${SEP}` : '';
    const what = f.loop !== undefined ? `loop ${n}` : `frame ${n}`;
    cells.push({ input: await sharp(still.file).resize(cell.width, cell.height, { fit: 'fill' }).png().toBuffer(), caption: `${lead}${what}${SEP}${timecode(n, c.film.fps)}` });
    stills.push(still.record);
    shown.push({ ...f, time: timecode(n, c.film.fps) });
  }
  const heading = title ?? name;
  const out = await grid({ cells, cols: COLS, cell, title: heading });
  const file = path.join(outDir(dir, 'sheets'), `${name}.png`);
  await writePng(file, out.buffer, madeRecord('sheet', stills, { name, title: heading, tier, format, cell, frames: shown }));
  if (look) addLook(file, `sheet ${name}: ${heading}${fakeNote(stills)}`, by);
  return { file };
}

export async function sheetCommand(a, renderer = null) {
  const c = config();
  const count = c.critics.contactSheetFrames;
  const r = renderer ?? (await getRenderer(Boolean(a.fake)));
  const base = { tier: one(a.tier, 'review'), format: one(a.format, 'preview'), renderer: r };
  const files = [];
  const run = async (o) => files.push((await sheet({ ...base, ...o })).file);
  try {
    const info = await r.filmInfo();
    if (a.shot !== undefined) {
      const id = one(a.shot);
      const shot = info.shots.find((s) => s.id === id);
      if (!shot) throw new Error(`no shot ${id}`);
      await run({ frames: spread(shot.first, shot.last, count), name: one(a.name, `shot-${id}`), title: `shot ${id}${SEP}frames ${shot.first} to ${shot.last}${SEP}${Math.min(count, shot.last - shot.first + 1)} spread evenly` });
    } else if (a.film) {
      const sheets = Math.max(1, Number(one(a.sheets, 4)));
      const all = spread(0, info.frameCount - 1, sheets * count);
      const per = Math.ceil(all.length / sheets);
      for (let i = 0; i * per < all.length; i++) {
        const part = all.slice(i * per, (i + 1) * per);
        await run({ frames: part, name: `${one(a.name, 'film')}-${i + 1}`, title: `film${SEP}sheet ${i + 1} of ${sheets}${SEP}frames ${part[0]} to ${part[part.length - 1]} of ${info.frameCount}` });
      }
    } else if (a.loop) {
      const n = info.loop.frameCount;
      const half = Math.min(Math.floor(count / 2), Math.floor(n / 2));
      await run({ loopFrames: spread(0, n - 1, count), name: one(a.name, 'loop'), title: `loop${SEP}${n} frames${SEP}${Math.min(count, n)} spread evenly` });
      const seam = [...spread(n - half, n - 1, half), ...spread(0, half - 1, half)];
      await run({ loopFrames: seam, name: `${one(a.name, 'loop')}-seam`, title: `loop seam${SEP}last ${half} frames then first ${half}` });
    } else if (a.frames !== undefined) {
      const [first, last] = [].concat(a.frames).map(Number);
      if (!(Number.isInteger(first) && Number.isInteger(last) && last >= first)) throw new Error('give --frames A B with B not before A');
      const list = spread(first, last, count);
      const step = list.length > 1 ? (last - first) / (list.length - 1) : 1;
      const stepText = step === 1 ? 'every frame' : Number.isInteger(step) ? `every ${step} frames` : `about every ${step.toFixed(1)} frames`;
      await run({ frames: list, name: one(a.name, `frames-${first}-${last}`), title: `frames ${first} to ${last}${SEP}${stepText}` });
    } else if (a.establishing) {
      const keys = c.film.order.map((u) => c.keys.find((k) => k.id === `${u}-0`)).filter(Boolean);
      const list = keys.map((k) => ({ key: k.id, frame: info.keyFrames[k.id], label: k.id }));
      list.push({ frame: info.titanFrame, label: 'titan' });
      await run({ frames: list, name: one(a.name, 'establishing'), title: 'establishing frame of every place, then the titan frame' });
    } else {
      throw new Error('usage: npm run sheet -- --shot ID | --film [--sheets N] | --loop | --frames A B | --establishing [--tier T] [--format F] [--name NAME] [--fake]');
    }
    return { files };
  } finally {
    await r.closeRenderer();
  }
}

if (isMain(import.meta)) {
  sheetCommand(args()).then(
    ({ files }) => files.forEach((f) => console.log(`sheet: ${relPath(f)}`)),
    (e) => {
      console.error(`sheet: ${e.message}`);
      process.exit(1);
    },
  );
}
