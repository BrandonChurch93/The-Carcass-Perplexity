import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { runParts, loadRenderer } from './parts.mjs';

export const CAPS = 'config/webgl-caps.json';
const SOURCE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const FULL_FLOAT = /(?<![A-Za-z0-9_$])FloatType(?![A-Za-z0-9_$])/;

export function fullFloatUses(root) {
  const out = [];
  const go = (dir, relDir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const r = `${relDir}/${e.name}`;
      if (e.isDirectory()) go(path.join(dir, e.name), r);
      else if (SOURCE.test(e.name)) {
        fs.readFileSync(path.join(dir, e.name), 'utf8')
          .split('\n')
          .forEach((l, i) => {
            if (FULL_FLOAT.test(l)) out.push({ file: r, line: i + 1 });
          });
      }
    }
  };
  if (fs.existsSync(path.join(root, 'src'))) go(path.join(root, 'src'), 'src');
  return out;
}

export async function pixelDifference(a, b) {
  const [x, y] = await Promise.all([a, b].map((f) => sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
  if (x.info.width !== y.info.width || x.info.height !== y.info.height) {
    return { sameSize: false, sizes: [x.info, y.info].map((i) => `${i.width} x ${i.height}`), pixels: null, largest: null };
  }
  const ch = x.info.channels;
  let pixels = 0;
  let largest = 0;
  for (let p = 0; p < x.data.length; p += ch) {
    let d = 0;
    for (let c = 0; c < ch; c++) d = Math.max(d, Math.abs(x.data[p + c] - y.data[p + c]));
    if (d > 0) pixels++;
    if (d > largest) largest = d;
  }
  return { sameSize: true, pixels, largest, total: x.info.width * x.info.height };
}

export async function runG10(ctx) {
  const cfg = ctx.config;
  const { renderer, error } = await loadRenderer(ctx);
  const needs = (run) => (error ? async () => ({ ok: false, lines: [error] }) : run);

  const extensions = {
    name: 'The extensions the page enabled',
    run: async () => {
      const file = path.join(ctx.root, CAPS);
      if (!fs.existsSync(file)) return { ok: false, lines: [`${CAPS} is missing. Run npm run caps to write it.`] };
      const portable = JSON.parse(fs.readFileSync(file, 'utf8')).portable;
      if (!Array.isArray(portable)) return { ok: false, lines: [`${CAPS} has no list named portable.`] };
      if (error) return { ok: false, lines: [error] };
      const used = (await renderer.pageInfo()).gl.extensions;
      const bad = used.filter((n) => !portable.includes(n));
      if (bad.length === 0) return { ok: true, lines: [`The page enabled ${used.length} extensions, all marked portable in ${CAPS}.`] };
      return { ok: false, lines: bad.map((n) => `The page enabled ${n}, which is not marked portable in ${CAPS}.`) };
    }
  };

  const identical = {
    name: 'The frame with portable extensions only',
    run: needs(async () => {
      const film = await renderer.filmInfo();
      const frame = film.frameCount > 0 ? Math.floor(film.frameCount / 2) : 0;
      const shared = { frame, tier: 'draft', format: cfg.formats.preview.id, force: true, fresh: true, look: false };
      const lean = await renderer.renderStill({ ...shared, portableOnly: true, name: 'g10-portable' });
      const plain = await renderer.renderStill({ ...shared, name: 'g10-plain' });
      const d = await pixelDifference(lean.file, plain.file);
      if (!d.sameSize) return { ok: false, lines: [`Frame ${frame} is ${d.sizes[0]} with portable extensions only and ${d.sizes[1]} with all of them.`] };
      const ok = d.pixels === 0;
      return {
        ok,
        lines: [
          ok
            ? `Frame ${frame} with portable extensions only is pixel-identical to the same frame with all of them.`
            : `Frame ${frame} with portable extensions only differs from the same frame with all of them in ${d.pixels} of ${d.total} pixels. The largest difference is ${d.largest} levels out of 255.`
        ]
      };
    })
  };

  const floats = {
    name: 'Full float render targets',
    run: async () => {
      if (!fs.existsSync(path.join(ctx.root, 'src'))) return { ok: true, lines: [], skipped: ['no src folder yet, so no file was read for FloatType'] };
      const uses = fullFloatUses(ctx.root);
      if (uses.length === 0) return { ok: true, lines: ['No file under src uses FloatType.'] };
      return { ok: false, lines: uses.map((u) => `${u.file} line ${u.line} uses FloatType. Use HalfFloatType.`) };
    }
  };

  return runParts(ctx.phase, [extensions, identical, floats]);
}
