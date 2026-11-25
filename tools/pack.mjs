import { ROOT, rel, args, config, readJson } from './lib/paths.mjs';
import { isMain, one, relPath, getRenderer } from './lib/img.mjs';
import { sheet } from './sheet.mjs';
import { criticsFor, buildCritic } from './lib/pack-core.mjs';

export const USAGE = 'usage: npm run pack -- --round R --unit ID [--critic R4b] [--tier T] [--format F] [--family carbon] [--record] [--fake]';

export async function packCommand(a, deps = {}) {
  const print = deps.print ?? ((l) => console.log(l));
  const cfg = deps.cfg ?? config();
  const round = one(a.round, null);
  const unit = one(a.unit, null);
  if (round === null || unit === null || !/^[A-Za-z0-9]+$/.test(String(round))) {
    print(`pack: ${USAGE}`);
    return { code: 1, entries: [] };
  }
  let renderer = null;
  try {
    const critics = criticsFor(cfg, unit, one(a.critic, null));
    const tier = one(a.tier, null);
    const format = one(a.format, null);
    if (tier !== null && !cfg.tiers[tier]) throw new Error(`No such tier: ${tier}`);
    if (format !== null && !Object.values(cfg.formats).some((f) => f.id === format)) throw new Error(`No such format: ${format}`);
    renderer = deps.renderer ?? (await getRenderer(Boolean(a.fake)));
    const cut = deps.cut ?? readJson(rel('cut', 'CUTLIST.json'));
    const film = await renderer.filmInfo();
    const entries = [];
    let manifest = null;
    for (const critic of critics) {
      const r = await buildCritic({
        critic,
        round: String(round),
        unit,
        cfg,
        cut,
        film,
        renderer: { ...renderer, closeRenderer: async () => {} },
        sheet: deps.sheet ?? sheet,
        tier,
        format,
        family: one(a.family, null),
        record: Boolean(a.record),
        outDir: deps.outDir ?? rel('out', 'work', 'packs'),
        keyDir: deps.keyDir ?? rel('out', 'work', 'packs-keys'),
        scratch: deps.scratch ?? rel('out', 'work', 'pack-work'),
        root: deps.root ?? ROOT,
        approvedPath: (p) => rel(p),
      });
      manifest = r.manifest;
      entries.push(r.entry);
      for (const p of r.entry.packs) print(`pack: ${p.id}: ${p.files.length} files in ${p.folder}`);
      if (!r.entry.packs.length) print(`pack: ${critic}: no pack`);
      for (const n of r.entry.notes) print(`pack: ${critic}: ${n}`);
      for (const n of r.entry.leftOut) print(`pack: ${critic}: ${n}`);
      if (r.entry.rendered.length) print(`pack: ${critic}: rendered at the ${r.entry.rendered.join(' and the ')}`);
    }
    if (manifest) print(`pack: ${relPath(manifest)}`);
    return { code: 0, entries, manifest };
  } catch (e) {
    print(`pack: ${String(e.message).split('\n')[0]}`);
    return { code: 1, entries: [] };
  } finally {
    await renderer?.closeRenderer?.();
  }
}

if (isMain(import.meta)) {
  packCommand(args()).then(({ code }) => process.exit(code));
}
