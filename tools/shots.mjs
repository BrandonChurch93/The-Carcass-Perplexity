import fs from 'node:fs';
import { rel, args, config, readJson } from './lib/paths.mjs';
import { isMain, relPath } from './lib/img.mjs';
import * as core from './lib/shots-core.mjs';

export const USAGE = 'usage: npm run shots [-- --check]';
const OUT = rel('cut', 'SHOTS.md');
const NOTES = rel('cut', 'SHOTS.notes.json');

export async function shotsCommand(a, deps = {}) {
  const print = deps.print ?? ((l) => console.log(l));
  const cfg = deps.cfg ?? config();
  const renderer = deps.renderer ?? (await import('./lib/render.mjs'));
  try {
    const cut = deps.cut ?? readJson(rel('cut', 'CUTLIST.json'));
    const notes = deps.notes ?? (fs.existsSync(NOTES) ? readJson(NOTES) : {});
    const measures = {};
    for (const shot of cut.shots) {
      if (shot.picture === core.BLACK) continue;
      const keyFrame = shot.key ? cut.keyFrames[shot.key] : null;
      const states = await renderer.filmStates(core.sampleFrames(shot, keyFrame));
      measures[shot.id] = core.measure(shot, states, keyFrame);
    }
    const { text, missing } = core.shotsDoc({ cut, cfg, measures, notes });
    for (const m of missing) print(`shots: no note for ${m}`);
    if (a.check === true) {
      const same = fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8') === text;
      print(same ? 'shots: cut/SHOTS.md matches the cameras and the notes.' : 'shots: cut/SHOTS.md is out of date. Run npm run shots.');
      return { code: same && !missing.length ? 0 : 1, text, missing };
    }
    fs.writeFileSync(OUT, text);
    print(`shots: ${relPath(OUT)}, ${cut.shots.length} shots, ${missing.length} notes missing`);
    return { code: 0, text, missing };
  } catch (e) {
    print(`shots: ${String(e.message).split('\n')[0]}`);
    return { code: 1, text: null, missing: [] };
  } finally {
    await renderer.closeRenderer?.();
  }
}

if (isMain(import.meta)) {
  shotsCommand(args()).then(({ code }) => process.exit(code));
}
