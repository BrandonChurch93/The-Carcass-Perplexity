import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { runParts, loadRenderer } from './parts.mjs';

export const CUT_LIST = 'cut/CUTLIST.json';
const FILM_PARTS_FROM = 2;

export async function runG4(ctx) {
  const cfg = ctx.config;
  const { renderer, error } = await loadRenderer(ctx);
  if (error) return { ok: false, lines: [error], skipped: [] };
  let film = null;
  const info = async () => (film ??= await renderer.filmInfo());

  const stills = Object.values(cfg.formats).map((f) => ({
    name: `The ${f.id} still`,
    run: async () => {
      const still = await renderer.renderStill({ frame: 0, tier: 'draft', format: f.id, look: false });
      const m = await sharp(still.file).metadata();
      const ok = m.width === f.width && m.height === f.height;
      return {
        ok,
        lines: [`The ${f.id} still is ${m.width} x ${m.height}, ${ok ? 'the size of its format' : `and its format is ${f.width} x ${f.height}`}.`]
      };
    }
  }));

  const cut = {
    name: 'The frame count of the film',
    from: FILM_PARTS_FROM,
    run: async () => {
      const file = path.join(ctx.root, CUT_LIST);
      if (!fs.existsSync(file)) return { ok: true, lines: [], skipped: ['no cut list yet'] };
      const want = JSON.parse(fs.readFileSync(file, 'utf8')).frameCount;
      const got = (await info()).frameCount;
      if (!Number.isInteger(want)) return { ok: false, lines: [`${CUT_LIST} holds no whole number in frameCount.`] };
      const ok = got === want;
      return { ok, lines: [`The film has ${got} frames and ${CUT_LIST} has ${want}${ok ? '' : ', which differ'}.`] };
    }
  };

  const loop = {
    name: 'The frame count of the loop',
    from: FILM_PARTS_FROM,
    run: async () => {
      const want = cfg.deliver.cardLoop.seconds * cfg.film.fps;
      const got = (await info()).loop?.frameCount;
      const ok = got === want;
      return {
        ok,
        lines: [
          `The loop has ${got ?? 'no'} frames and deliver.cardLoop.seconds times film.fps is ${want}${ok ? '' : ', which differ'}.`
        ]
      };
    }
  };

  return runParts(ctx.phase, [...stills, cut, loop]);
}
