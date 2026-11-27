import path from 'node:path';
import sharp from 'sharp';
import { judgedList } from './judged.mjs';

export const FLAG = [255, 0, 255];
export const KERNEL = 'lanczos3';
export const SHARPNESS =
  'The mean squared response of a four neighbour Laplacian on the Rec. 709 luminance of the 8 bit picture, over every pixel that is not on the border. The approved picture is cropped at its centre to the shape of the frame, and both pictures go through the same lanczos3 resize to the size of that crop.';

export function unitKinds(cfg) {
  const order = cfg.film.order;
  return { places: order.slice(0, -1), reveal: order[order.length - 1], film: cfg.units[cfg.units.length - 1].id };
}

export function measuresOf(cfg, unit) {
  const k = unitKinds(cfg);
  if (!cfg.units.some((u) => u.id === unit)) throw new Error(`There is no unit ${unit} in the config.`);
  const out = ['M1'];
  if (k.places.includes(unit)) out.push('M2');
  if (k.places.includes(unit) || unit === k.reveal) out.push('M3');
  return out;
}

export function countFlagged(data, channels = 4) {
  let n = 0;
  for (let i = 0; i + 2 < data.length; i += channels) if (data[i] === FLAG[0] && data[i + 1] === FLAG[1] && data[i + 2] === FLAG[2]) n++;
  return n;
}

export function movingShare(data, threshold, channels = 4) {
  const pixels = Math.floor(data.length / channels);
  if (!pixels) return 0;
  let n = 0;
  for (let i = 0; i + 2 < data.length; i += channels) if (Math.max(data[i], data[i + 1], data[i + 2]) > threshold) n++;
  return n / pixels;
}

export function motionFloor(cfg, unit) {
  return cfg.motion.byUnit?.[unit] ?? cfg.motion.minMovingAreaShare;
}

export function luminance(data, channels = 3) {
  const out = new Float64Array(Math.floor(data.length / channels));
  for (let i = 0, p = 0; p < out.length; i += channels, p++) out[p] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  return out;
}

export function laplacianEnergy(lum, width, height) {
  if (width < 3 || height < 3) return 0;
  let sum = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x;
      const v = 4 * lum[p] - lum[p - 1] - lum[p + 1] - lum[p - width] - lum[p + width];
      sum += v * v;
    }
  }
  return sum / ((width - 2) * (height - 2));
}

export function coverRect(aw, ah, aspect) {
  if (aw / ah > aspect) {
    const width = Math.min(aw, Math.round(ah * aspect));
    return { left: Math.floor((aw - width) / 2), top: 0, width, height: ah };
  }
  const height = Math.min(ah, Math.round(aw / aspect));
  return { left: 0, top: Math.floor((ah - height) / 2), width: aw, height };
}

export async function energyOf(input, size, rect = null) {
  let img = sharp(input);
  if (rect) img = img.extract(rect);
  const { data, info } = await img.removeAlpha().toColourspace('srgb').resize(size.width, size.height, { fit: 'fill', kernel: KERNEL }).raw().toBuffer({ resolveWithObject: true });
  return laplacianEnergy(luminance(data, info.channels), info.width, info.height);
}

export async function sharpnessRatio(frameFile, approvedFile) {
  const f = await sharp(frameFile).metadata();
  const a = await sharp(approvedFile).metadata();
  const rect = coverRect(a.width, a.height, f.width / f.height);
  const size = { width: rect.width, height: rect.height };
  const frame = await energyOf(frameFile, size);
  const approved = await energyOf(approvedFile, size, rect);
  return { frame, approved, ratio: approved > 0 ? frame / approved : null, size, frameSize: { width: f.width, height: f.height } };
}

export function judgedOf(cfg, cut, film, unit) {
  const missing = [];
  const list = judgedList(cfg, cut).filter((e) => e.unit === unit);
  const keys = new Set(cfg.keys.map((k) => k.id));
  let from = film.judged ?? null;
  if (!from) {
    if (film.frameCount === cut.frameCount) {
      from = Object.fromEntries(list.filter((e) => Number.isInteger(e.frame)).map((e) => [e.id, e.frame]));
      missing.push('The film on the page has no judged list yet, so the frame numbers were computed from the cut list.');
    } else {
      missing.push(`The film on the page has no judged list yet, and it has ${film.frameCount} frames where the cut list has ${cut.frameCount}, so no judged frame of ${unit} could be found.`);
    }
  }
  const entries = [];
  for (const e of list) {
    if (Number.isInteger(e.loop)) {
      if (film.loop && e.loop <= film.loop.frameCount) entries.push({ id: e.id, loop: e.loop, key: false });
      else missing.push(`The loop on the page has no frame ${e.loop}, so ${e.id} was left out.`);
      continue;
    }
    if (!from) continue;
    const frame = from[e.id];
    if (!Number.isInteger(frame)) missing.push(`The film on the page has no judged frame named ${e.id}.`);
    else if (frame < 0 || frame >= film.frameCount) missing.push(`The judged frame ${e.id} is at ${frame} and the film on the page has ${film.frameCount} frames.`);
    else entries.push({ id: e.id, frame, key: keys.has(e.id) });
  }
  return { entries, missing };
}

export function givenFrames(value, film) {
  if (value === undefined || value === null || value === true) return [];
  const list = (Array.isArray(value) ? value : [value]).flatMap((v) => String(v).split(',')).filter(Boolean);
  return list.map((v) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n >= film.frameCount) throw new Error(`No such film frame: ${v}. The film on the page has ${film.frameCount} frames.`);
    return { id: `frame-${n}`, frame: n, key: false, given: true };
  });
}

export function onlyOf(value) {
  if (value === undefined || value === null || value === true) return [];
  return (Array.isArray(value) ? value : [value]).flatMap((v) => String(v).split(',')).filter(Boolean);
}

const at = (e) => (e.loop !== undefined ? { loop: e.loop } : { frame: e.frame });
const first = (e) => String(e?.message ?? e).split('\n')[0].replace(/^page\.evaluate: (Error: )?/, '');
const round = (v, d = 6) => (v === null ? null : Number(Number(v).toFixed(d)));

export async function measureUnit({ cfg, cut, film, unit, tier, format, frames = [], only = [], renderer, approvedPath }) {
  const measures = measuresOf(cfg, unit);
  const { entries, missing } = judgedOf(cfg, cut, film, unit);
  const every = [...entries, ...frames.filter((f) => !entries.some((e) => e.frame === f.frame))];
  if (!every.length) throw new Error(`${missing.join(' ')} Give frames with --frames to measure them.`.trim());
  const named = (e, o) => e.id === o || (e.frame !== undefined && String(e.frame) === o);
  const unknown = only.filter((o) => !every.some((e) => named(e, o)));
  if (unknown.length) throw new Error(`No judged frame of ${unit} is named ${unknown.join(' ')}. It has: ${every.map((e) => e.id).join(' ')}.`);
  const all = only.length ? every.filter((e) => only.some((o) => named(e, o))) : every;
  const results = [];
  const down = {};
  const run = async (measure, e, work) => {
    const base = { measure, id: e.id, ...at(e) };
    if (down[measure]) return results.push({ ...base, status: 'not measured', why: down[measure] });
    try {
      results.push({ ...base, ...(await work()) });
    } catch (err) {
      const why = first(err);
      if (/No such diagnostic view/.test(why)) down[measure] = why;
      results.push({ ...base, status: 'not measured', why });
    }
  };
  for (const e of all) {
    await run('M1', e, async () => {
      const r = await renderer.renderRaw({ ...at(e), tier, format, diag: 'invalid', hold: true });
      const flagged = countFlagged(r.data);
      return { status: flagged === 0 ? 'pass' : 'fail', flagged, pixels: r.width * r.height };
    });
  }
  if (measures.includes('M2')) {
    const floor = motionFloor(cfg, unit);
    for (const e of all.filter((x) => x.loop === undefined)) {
      await run('M2', e, async () => {
        const r = await renderer.renderRaw({ ...at(e), tier, format, diag: 'motion', hold: true });
        const share = movingShare(r.data, cfg.motion.pixelThreshold);
        return { status: share >= floor ? 'pass' : 'fail', share: round(share), floor, pixels: r.width * r.height };
      });
    }
  }
  if (measures.includes('M3')) {
    const floor = cfg.detail.minSharpnessRatio;
    for (const key of cfg.keys.filter((k) => k.unit === unit).sort((a, b) => a.order - b.order)) {
      const e = all.find((x) => x.id === key.id);
      if (!e) {
        if (only.length) continue;
        results.push({ measure: 'M3', id: key.id, status: 'not measured', why: `The key ${key.id} has no frame on the page.` });
        continue;
      }
      await run('M3', e, async () => {
        const still = await renderer.renderStill({ frame: e.frame, tier, format, look: false });
        const s = await sharpnessRatio(still.file, approvedPath(key.image));
        const ok = s.ratio === null || s.ratio >= floor;
        return { status: ok ? 'pass' : 'fail', ratio: round(s.ratio, 4), floor, frameEnergy: round(s.frame, 4), approvedEnergy: round(s.approved, 4), size: s.size, approved: key.image };
      });
    }
  }
  const colour = Object.fromEntries(
    measures.map((m) => {
      const mine = results.filter((r) => r.measure === m);
      return [m, mine.some((r) => r.status === 'fail') ? 'red' : mine.some((r) => r.status === 'pass') && mine.every((r) => r.status === 'pass') ? 'green' : 'not measured'];
    }),
  );
  return { unit, tier, format, measures, colour, missing, ...(only.length ? { only } : {}), frames: all, results };
}

export function resultLine(r) {
  const where = r.loop !== undefined ? `loop frame ${r.loop}` : r.frame !== undefined ? `frame ${r.frame}` : 'no frame';
  const head = `measure: ${r.measure} ${r.status === 'pass' ? 'pass' : r.status === 'fail' ? 'FAIL' : 'not measured'}  ${r.id}, ${where}`;
  if (r.status === 'not measured') return `${head}: ${r.why}`;
  if (r.measure === 'M1') return `${head}: ${r.flagged} of ${r.pixels} pixels hold an invalid value`;
  if (r.measure === 'M2') return `${head}: ${(100 * r.share).toFixed(2)}% of the picture moves, the floor is ${(100 * r.floor).toFixed(2)}%`;
  return `${head}: fine detail is ${r.ratio === null ? 'not defined, the approved picture has none' : `${r.ratio} of the approved picture`}, the floor is ${r.floor}`;
}

export function reportLines(out, usual) {
  const lines = [];
  const quick = out.tier !== usual.tier || out.format !== usual.format;
  lines.push(`measure: ${out.unit}, ${out.tier} tier in ${out.format}${quick ? `, a quick look: the judged frames are measured at the ${usual.tier} tier in ${usual.format}` : ''}`);
  if (out.only?.length) lines.push(`measure: only ${out.only.join(' ')}: the other judged frames of ${out.unit} were not measured`);
  for (const m of out.missing) lines.push(`measure: not found: ${m}`);
  for (const r of out.results) lines.push(resultLine(r));
  lines.push(`measure: ${out.measures.map((m) => `${m} ${out.colour[m]}`).join(', ')}`);
  return lines;
}

export const outFile = (dir, unit, only = []) => path.join(dir, `${unit}${only.length ? '-only' : ''}.json`);
