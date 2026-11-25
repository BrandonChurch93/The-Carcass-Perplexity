import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { readJsonIf, count } from './inputs.mjs';
import { loadRenderer } from './parts.mjs';
import * as core from '../lib/seam-core.mjs';

export const WORK = 'out/work/gate/g14';
export const RECORD = `${WORK}/g14.json`;
const FORMAT = 'preview';
const STEP_TIER = 'draft';

const first = (e) => String(e.message).split('\n')[0];
const red = (line) => ({ ok: false, lines: [line], skipped: [] });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function savePictures(dir, a, b, { width, height }, n) {
  fs.mkdirSync(dir, { recursive: true });
  const raw = { raw: { width, height, channels: 4 } };
  const png = (data, name) => sharp(data, raw).flip().removeAlpha().png({ compressionLevel: 3 }).toFile(path.join(dir, name));
  const gap = Buffer.alloc(a.length, 255);
  for (let i = 0; i < a.length; i += 4) for (let c = 0; c < 3; c += 1) gap[i + c] = Math.min(255, 8 * Math.abs(a[i + c] - b[i + c]));
  await png(a, 'frame-0.png');
  await png(b, `frame-${n}.png`);
  await png(gap, 'difference-times-8.png');
}

// Each part alone at both ends of the loop, to name the ones whose motion does not come round.
async function openParts(renderer, unit, n, tier) {
  const open = [];
  const parts = await renderer.unitParts(unit);
  for (const p of parts) {
    const at = (loop) => renderer.renderRaw({ loop, tier, format: FORMAT, diag: 'solo', part: p.id, hold: true });
    const a = Buffer.from((await at(0)).data);
    const d = core.differing(a, (await at(n)).data);
    if (d.pixels > 0) open.push({ part: p.id, ...d });
  }
  return { open, parts: parts.length };
}

async function measureSteps(renderer, n) {
  const steps = [];
  let zero = null;
  let prev = null;
  for (let f = 0; f < n; f += 1) {
    const now = Buffer.from((await renderer.renderRaw({ loop: f, tier: STEP_TIER, format: FORMAT, hold: true })).data);
    if (prev === null) zero = now;
    else steps.push(core.meanDifference(prev, now));
    prev = now;
  }
  return { steps, seam: core.meanDifference(prev, zero) };
}

export async function runG14(ctx) {
  const cfg = ctx.config;
  const loop = cfg.deliver.cardLoop;
  const tiers = Object.keys(cfg.tiers);
  const { renderer, error } = await loadRenderer(ctx);
  if (error) return red(error);
  const dir = path.join(ctx.root, WORK);
  const identity = [];
  const notes = [];
  let n;
  let measured;
  let made;
  let open = null;
  await renderer.holdRenderer();
  try {
    const film = await renderer.filmInfo();
    n = film.loop.frameCount;
    const state = await renderer.rendererState();
    made = { built: state.built, browser: state.browser, loop: { unit: film.loop.unit, frameCount: n }, format: FORMAT, tier: STEP_TIER };
    for (const tier of tiers) {
      const a = await renderer.renderRaw({ loop: 0, tier, format: FORMAT, hold: true });
      const zero = Buffer.from(a.data);
      const b = await renderer.renderRaw({ loop: n, tier, format: FORMAT, hold: true });
      const d = core.differing(zero, b.data);
      identity.push({ tier, ...d });
      if (d.pixels > 0 && open === null) {
        await savePictures(dir, zero, b.data, a, n);
        open = await openParts(renderer, film.loop.unit, n, tier);
        const where = `The two frames and their difference are in ${WORK}.`;
        const names = open.open.map((p) => `${p.part} (${count(p.pixels, 'pixel')})`).join(', ');
        if (open.open.length === 0) notes.push(`Drawn alone, every part of ${film.loop.unit} comes round, so the difference is in what is laid over the whole picture. ${where}`);
        else if (open.open.length === open.parts) notes.push(`Drawn alone, all ${open.parts} parts of ${film.loop.unit} differ, which points at the camera or at what is laid over the whole picture. ${where}`);
        else notes.push(`Drawn alone at the ${tier} tier, ${count(open.open.length, 'part')} of ${open.parts} of ${film.loop.unit} ${open.open.length === 1 ? 'does' : 'do'} not come round: ${names}. ${where}`);
      }
    }
    // The steps take a render of every frame of the loop, so they are kept for as long as the page that drew them is the same.
    const old = readJsonIf(ctx.root, RECORD);
    if (old !== null && same(old.made, made) && Array.isArray(old.steps) && old.steps.length === n - 1 && Number.isFinite(old.seam)) {
      measured = { steps: old.steps, seam: old.seam };
      notes.push(`The steps between neighbouring frames were read from ${RECORD}, made from the same build.`);
    } else measured = await measureSteps(renderer, n);
  } catch (e) {
    return red(`The loop could not be judged: ${first(e)}`);
  } finally {
    renderer.releaseRenderer();
  }

  const ratio = loop.seamMaxRatio;
  const facts = { frameCount: n, identity, ratio, ...measured };
  const faults = [...core.identityFaults(identity, n), ...core.seamFaults(facts)];
  const ok = faults.length === 0;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(ctx.root, RECORD), JSON.stringify({ at: new Date().toISOString(), ok, made, ratio, identity, open: open?.open ?? [], seam: measured.seam, largest: core.largestStep(measured.steps), steps: measured.steps }, null, 2) + '\n');
  const passed = [core.identityLine(identity, n), core.seamLine(facts)].filter((l) => l !== null);
  const lines = ok ? [...passed, ...notes] : [...faults, core.countLine(faults), ...notes, ...passed.map((l) => `passed: ${l}`)];
  return { ok, lines, skipped: [] };
}
