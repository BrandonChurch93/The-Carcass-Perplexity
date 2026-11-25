import { rel, args, config, readJson, writeJson } from './lib/paths.mjs';
import { isMain, one, relPath } from './lib/img.mjs';
import { measureUnit, givenFrames, reportLines, outFile, SHARPNESS } from './lib/measure-core.mjs';

export const USAGE = 'usage: npm run measure -- --unit ID [--tier T] [--format F] [--frames N N ...]';

export async function measureCommand(a, deps = {}) {
  const print = deps.print ?? ((l) => console.log(l));
  const cfg = deps.cfg ?? config();
  const unit = one(a.unit, null);
  if (!unit) {
    print(`measure: ${USAGE}`);
    return { code: 1, out: null };
  }
  const usual = { tier: 'final', format: cfg.formats.master.id };
  const tier = one(a.tier, usual.tier);
  const format = one(a.format, usual.format);
  const renderer = deps.renderer ?? (await import('./lib/render.mjs'));
  let held = false;
  try {
    if (!cfg.tiers[tier]) throw new Error(`No such tier: ${tier}`);
    if (!Object.values(cfg.formats).some((f) => f.id === format)) throw new Error(`No such format: ${format}`);
    const cut = deps.cut ?? readJson(rel('cut', 'CUTLIST.json'));
    const film = await renderer.filmInfo();
    const frames = givenFrames(a.frames, film);
    if (renderer.holdRenderer) {
      await renderer.holdRenderer();
      held = true;
    }
    const out = await measureUnit({ cfg, cut, film, unit, tier, format, frames, renderer, approvedPath: (p) => rel(p) });
    const state = renderer.rendererState ? await renderer.rendererState() : null;
    const record = {
      ...out,
      usual,
      thresholds: { pixelThreshold: cfg.motion.pixelThreshold, checkGapSeconds: cfg.motion.checkGapSeconds, minSharpnessRatio: cfg.detail.minSharpnessRatio },
      sharpness: SHARPNESS,
      state: state ? { engine: state.built.engine, units: state.built.units, browser: state.browser } : null,
    };
    const file = outFile(deps.dir ?? rel('out', 'work', 'measure'), unit);
    writeJson(file, record);
    reportLines(out, usual).forEach(print);
    print(`measure: ${relPath(file)}`);
    return { code: 0, out: record, file };
  } catch (e) {
    print(`measure: ${String(e.message).split('\n')[0]}`);
    return { code: 1, out: null };
  } finally {
    if (held) renderer.releaseRenderer();
    await renderer.closeRenderer?.();
  }
}

if (isMain(import.meta)) {
  measureCommand(args()).then(({ code }) => process.exit(code));
}
