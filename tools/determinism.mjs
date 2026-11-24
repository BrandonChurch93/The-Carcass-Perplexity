import fs from 'node:fs';
import sharp from 'sharp';
import { rel, args, writeJson, utc, config } from './lib/paths.mjs';
import { renderStill, filmInfo, closeRenderer } from './lib/render.mjs';

const a = args();
const tier = typeof a.tier === 'string' ? a.tier : 'review';
const format = typeof a.format === 'string' ? a.format : config().formats.preview.id;
const DIR = rel('out', 'work', 'determinism');

async function difference(x, y) {
  const [p, q] = await Promise.all([x, y].map((f) => sharp(f).raw().toBuffer({ resolveWithObject: true })));
  if (p.info.width !== q.info.width || p.info.height !== q.info.height) return { pixels: -1, largest: 255 };
  let pixels = 0;
  let largest = 0;
  const ch = p.info.channels;
  for (let i = 0; i < p.data.length; i += ch) {
    let d = 0;
    for (let c = 0; c < ch; c++) d = Math.max(d, Math.abs(p.data[i + c] - q.data[i + c]));
    if (d > 0) pixels++;
    if (d > largest) largest = d;
  }
  return { pixels, largest, total: p.info.width * p.info.height };
}

let ok = true;
const lines = [];
try {
  const film = await filmInfo();
  const still = film.keyFrames && Object.keys(film.keyFrames).length ? Object.values(film.keyFrames)[0] : Math.min(film.frameCount - 1, Math.round(film.frameCount * 0.31));
  const late = Math.max(0, film.frameCount - 1 - Math.round(film.frameCount * 0.04));
  const loop = Math.round(film.loop.frameCount * 0.6);
  const jobs = [
    { name: 'still', what: { frame: still }, label: `film frame ${still}` },
    { name: 'late', what: { frame: late }, label: `late film frame ${late}` },
    { name: 'loop', what: { loop }, label: `loop frame ${loop}` },
  ];
  const run = async (pass, order) => {
    const files = {};
    let first = true;
    for (const j of order) {
      const r = await renderStill({ ...j.what, tier, format, force: true, fresh: first, look: false, name: `determinism/${pass}-${j.name}` });
      files[j.name] = r.file;
      first = false;
    }
    return files;
  };
  const one = await run('a', jobs);
  const two = await run('b', [...jobs].reverse());
  const results = [];
  for (const j of jobs) {
    const d = await difference(one[j.name], two[j.name]);
    const same = d.pixels === 0;
    ok &&= same;
    results.push({ ...j.what, ...d, same });
    lines.push(
      same
        ? `The ${j.label} is pixel-identical across two fresh page loads and both orders (${format}, ${tier} tier).`
        : `The ${j.label} differs between the two page loads in ${d.pixels} of ${d.total} pixels. The largest difference is ${d.largest} levels out of 255.`,
    );
  }
  fs.mkdirSync(DIR, { recursive: true });
  writeJson(rel('out', 'work', 'determinism', 'report.json'), { at: utc(), tier, format, ok, results });
} catch (e) {
  ok = false;
  lines.push(`determinism: ${e.message}`);
} finally {
  await closeRenderer();
}
for (const l of lines) console.log(l);
console.log(ok ? 'determinism: pass' : 'determinism: FAIL');
process.exitCode = ok ? 0 : 1;
