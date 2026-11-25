// @ts-nocheck
import { afterAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const tool = (name) => import(new URL(`../tools/${name}.mjs`, import.meta.url).href);
const gate = await tool('gate');
const g10 = await tool('checks/g10');
const commands = await tool('checks/commands');
const { config } = await tool('lib/paths');

const cfg = config();
const formats = Object.values(cfg.formats);
const loopFrames = cfg.deliver.cardLoop.seconds * cfg.film.fps;
const FRAMES = 600;
const PORTABLE = ['EXT_color_buffer_half_float', 'EXT_texture_filter_anisotropic'];

const dirs = [];
const temp = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'carcass-gate-'));
  dirs.push(d);
  return d;
};
const put = (root, file, body) => {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), body);
};
afterAll(() => {
  for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
});

function repoRoot({ caps = true, cutFrames = FRAMES, src = { 'src/engine/targets.ts': 'const type = THREE.HalfFloatType;\n' } } = {}) {
  const root = temp();
  if (caps) put(root, 'config/webgl-caps.json', JSON.stringify({ portable: PORTABLE, here: [] }));
  if (cutFrames !== null) put(root, 'cut/CUTLIST.json', JSON.stringify({ frameCount: cutFrames }));
  for (const [file, body] of Object.entries(src ?? {})) put(root, file, body);
  return root;
}

function fakeRenderer({ wrongSize = null, frameCount = FRAMES, loop = loopFrames, extensions = PORTABLE.slice(0, 1), changed = 0, change = 9 } = {}) {
  const dir = temp();
  const calls = [];
  let closed = 0;
  return {
    calls,
    closed: () => closed,
    async renderStill(o) {
      calls.push(o);
      const f = formats.find((x) => x.id === (o.format ?? 'hd'));
      const width = wrongSize === f.id ? f.width - 2 : f.width;
      const file = path.join(dir, `${o.name ?? `frame-${o.frame}-${f.id}-${o.tier}`}.png`);
      const data = Buffer.alloc(width * f.height * 3, 100);
      if (o.portableOnly) for (let i = 0; i < changed; i++) data[i * 3 + 1] = 100 + change;
      await sharp(data, { raw: { width, height: f.height, channels: 3 } }).png({ compressionLevel: 1 }).toFile(file);
      return { file, record: { format: f.id, tier: o.tier }, reused: false, seconds: 0.1 };
    },
    async filmInfo() {
      return { fps: cfg.film.fps, frameCount, shots: [], keyFrames: {}, events: [], titanFrame: frameCount - 1, loop: { frameCount: loop, unit: cfg.deliver.cardLoop.unit } };
    },
    async pageInfo() {
      return { engine: 'e1', gl: { renderer: 'fake', vendor: 'fake', extensions } };
    },
    async closeRenderer() {
      closed++;
    }
  };
}

const pass = { ok: true, lines: ['fine'], skipped: [] };
const check = (id, phase, run, extra = {}) => ({ id, title: `title of ${id}`, phase, kind: 'machine', run, ...extra });
const small = () => [
  check('X1', 0, async () => pass),
  check('X2', 1, async () => pass),
  check('X3', 2, async () => ({ ok: false, lines: ['it broke', 'here'], skipped: [] }))
];
const quiet = (extra = {}) => ({ dir: temp(), root: temp(), run: async () => ({ code: 0, tail: [], timedOut: false }), ...extra });
const one = async (id, phase, renderer, root) => {
  const r = await gate.runGate({ phase, only: [id], renderer, root, dir: temp() });
  return r.results[0];
};

describe('the registry', () => {
  const ids = gate.REGISTRY.map((c) => c.id);
  it('lists every id of the three tables once, with a title and a phase', () => {
    const want = [
      ...Array.from({ length: 16 }, (_, i) => `G${i + 1}`),
      ...Array.from({ length: 7 }, (_, i) => `D${i + 1}`),
      ...Array.from({ length: 6 }, (_, i) => `A${i + 1}`)
    ];
    expect(ids).toEqual(want);
    for (const c of gate.REGISTRY) {
      expect(c.title.length).toBeGreaterThan(5);
      expect(Number.isInteger(c.phase)).toBe(true);
      expect(c.title).not.toMatch(/[\u2014!]/);
    }
  });

  it('has code for the checks of this task and for no other', () => {
    expect(gate.REGISTRY.filter((c) => typeof c.run === 'function').map((c) => c.id)).toEqual(['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'G11', 'G12', 'G15', 'G16', 'D1', 'D2', 'D7', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6']);
  });

  it('picks the checks of a phase', () => {
    const at = (n) => gate.selectChecks(gate.REGISTRY, n).map((c) => c.id);
    expect(at(0)).toEqual(['G1', 'G2', 'G3', 'G4', 'G8', 'G9', 'G10']);
    expect(at(1)).toEqual(expect.arrayContaining(['D1', 'A1', 'A6']));
    expect(at(1)).not.toContain('G5');
    expect(at(2)).toEqual(expect.arrayContaining(['G5', 'G12', 'G16', 'D2', 'D7']));
    expect(at(2)).not.toContain('D1');
    expect(at(2)).not.toContain('G13');
    expect(at(3)).toContain('G13');
    expect(at(5)).toEqual(expect.arrayContaining(['G14', 'D4']));
    expect(at(6).filter((id) => id.startsWith('D'))).toEqual(['D5', 'D6', 'D7']);
    expect(at(6).filter((id) => id.startsWith('G'))).toHaveLength(16);
  });
});

describe('runGate', () => {
  it('runs every check whose phase is at most N and writes the results', async () => {
    const o = quiet({ registry: small() });
    const r0 = await gate.runGate({ ...o, phase: 0 });
    expect(r0.results.map((r) => r.id)).toEqual(['X1']);
    expect(r0.ok).toBe(true);
    const r2 = await gate.runGate({ ...o, phase: 2 });
    expect(r2.results.map((r) => `${r.id} ${r.status}`)).toEqual(['X1 pass', 'X2 pass', 'X3 fail']);
    expect(r2.ok).toBe(false);
    expect(r2.failed).toEqual(['X3']);
    expect(path.basename(r2.file)).toBe('phase-2.json');
    const saved = JSON.parse(fs.readFileSync(r2.file, 'utf8'));
    expect(saved.results).toHaveLength(3);
    expect(saved.at).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
    expect(saved.phase).toBe(2);
  });

  it('runs only the named checks with --only and keeps the full result file apart', async () => {
    const o = quiet({ registry: small() });
    const r = await gate.runGate({ ...o, phase: 2, only: gate.parseOnly('x1,X2') });
    expect(r.results.map((x) => x.id)).toEqual(['X1', 'X2']);
    expect(r.ok).toBe(true);
    expect(path.basename(r.file)).toBe('phase-2-only.json');
    expect(gate.parseOnly(['G3,G9', 'G1'])).toEqual(['G3', 'G9', 'G1']);
    expect(gate.parseOnly(true)).toBe(null);
    await expect(gate.runGate({ ...o, phase: 2, only: ['X9'] })).rejects.toThrow('no check X9');
    await expect(gate.runGate({ ...o, phase: 0, only: ['X3'] })).rejects.toThrow('not a check of phase 0');
  });

  it('counts a check with no code as a failure and never prints it as a pass', async () => {
    const registry = [check('X1', 0, async () => pass), check('X2', 0, null)];
    const r = await gate.runGate({ ...quiet({ registry }), phase: 0 });
    expect(r.ok).toBe(false);
    expect(r.failed).toEqual(['X2']);
    expect(r.results[1].status).toBe('not built');
    expect(gate.resultLines(r.results[1])).toEqual(['X2 not built  title of X2']);
    expect(gate.resultLines(r.results[0])).toEqual(['X1 pass  title of X1']);
    expect(gate.summaryLine(r)).toContain('1 not built');
  });

  it('turns a check that throws into a failure', async () => {
    const registry = [check('X1', 0, async () => { throw new Error('boom'); })];
    const r = await gate.runGate({ ...quiet({ registry }), phase: 0 });
    expect(r.ok).toBe(false);
    expect(r.results[0].lines[0]).toContain('boom');
  });

  it('reports a failing sound check without failing the gate, and still fails on one with no code', async () => {
    const bad = async () => ({ ok: false, lines: ['too loud'], skipped: [] });
    const r = await gate.runGate({ ...quiet({ registry: [check('A9', 0, bad, { kind: 'sound', advisory: true })] }), phase: 0 });
    expect(r.ok).toBe(true);
    expect(r.results[0].status).toBe('fail');
    expect(gate.resultLines(r.results[0])[0]).toMatch(/^A9 FAIL  title of A9 \(/);
    const none = await gate.runGate({ ...quiet({ registry: [check('A9', 0, null, { kind: 'sound', advisory: true })] }), phase: 0 });
    expect(none.ok).toBe(false);
  });

  it('passes the given renderer to the checks and leaves it open', async () => {
    const renderer = fakeRenderer();
    let seen = null;
    const registry = [check('X1', 0, async (ctx) => { seen = await ctx.renderer(); return pass; })];
    await gate.runGate({ ...quiet({ registry }), phase: 0, renderer });
    expect(seen).toBe(renderer);
    expect(renderer.closed()).toBe(0);
  });
});

describe('the command', () => {
  const run = async (a, registry) => {
    const lines = [];
    const out = await gate.gateCommand(a, { ...quiet({ registry }), print: (l) => lines.push(l) });
    return { ...out, lines };
  };

  it('exits 0 when everything passes and prints one line for each check', async () => {
    const { code, lines } = await run({ _: [], phase: '1' }, small());
    expect(code).toBe(0);
    expect(lines.slice(0, 2)).toEqual(['X1 pass  title of X1', 'X2 pass  title of X2']);
    expect(lines[2]).toMatch(/^gate phase 1: pass\. 2 of 2 passed, 0 failed, 0 not built\.$/);
  });

  it('exits 1 on a failure and indents its lines under it', async () => {
    const { code, lines } = await run({ _: [], phase: '2' }, small());
    expect(code).toBe(1);
    expect(lines.slice(2, 5)).toEqual(['X3 FAIL  title of X3', '    it broke', '    here']);
    expect(lines.join('\n')).not.toMatch(/[\u2014!]/);
  });

  it('exits 1 with the usage line when no phase is given, or for an unknown id', async () => {
    const none = await run({ _: [] }, small());
    expect(none.code).toBe(1);
    expect(none.lines).toEqual([gate.USAGE]);
    const unknown = await run({ _: [], phase: '2', only: 'G99' }, small());
    expect(unknown.code).toBe(1);
    expect(unknown.lines).toEqual(['gate: no check G99']);
  });

  it('prints the whole result as JSON with --json', async () => {
    const { code, lines } = await run({ _: [], phase: '2', json: true }, small());
    expect(code).toBe(1);
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]).results.map((r) => r.status)).toEqual(['pass', 'pass', 'fail']);
  });
});

describe('G1, G2 and G3', () => {
  it('run the npm command and read its exit code and last lines', async () => {
    const seen = [];
    const run = async (command, argv, options) => {
      seen.push([command, ...argv].join(' '));
      expect(options.timeoutMs).toBe(cfg.sandbox.stepTimeoutMinutes * 60 * 1000);
      return argv.includes('determinism') ? { code: 3, tail: ['frame 12 differs'], timedOut: false } : { code: 0, tail: [], timedOut: false };
    };
    const r = await gate.runGate({ phase: 0, only: ['G1', 'G2', 'G3'], run, root: temp(), dir: temp() });
    expect(seen).toEqual(['npm run build', 'npm test', 'npm run determinism']);
    expect(r.results.map((x) => x.status)).toEqual(['pass', 'pass', 'fail']);
    expect(r.results[2].lines).toEqual(['npm run determinism exited with code 3. Its last lines:', '| frame 12 differs']);
  });

  it('keeps the last lines of a real child process', async () => {
    const script = 'for (let i = 0; i < 40; i++) console.log("line " + i); process.exit(2)';
    const r = await commands.exec(process.execPath, ['-e', script], { cwd: temp(), timeoutMs: 20000 });
    expect(r.code).toBe(2);
    expect(r.tail).toHaveLength(commands.TAIL_LINES);
    expect(r.tail.at(-1)).toBe('line 39');
  });

  it('stops a child process that runs past its time', async () => {
    const t0 = Date.now();
    const r = await commands.exec(process.execPath, ['-e', 'console.log("started"); setTimeout(() => {}, 60000)'], { cwd: temp(), timeoutMs: 400 });
    expect(r.timedOut).toBe(true);
    expect(Date.now() - t0).toBeLessThan(10000);
    const check = commands.commandCheck(['run', 'build']);
    const out = await check({ root: temp(), config: cfg, exec: async () => r });
    expect(out.ok).toBe(false);
    expect(out.lines[0]).toBe(`npm run build was stopped after ${cfg.sandbox.stepTimeoutMinutes} minutes.`);
  });
});

describe('G4', () => {
  it('passes when every still, the film and the loop are the right size', async () => {
    const renderer = fakeRenderer();
    const r = await one('G4', 2, renderer, repoRoot());
    expect(r.status).toBe('pass');
    expect(r.skipped).toEqual([]);
    expect(renderer.calls.map((c) => `${c.format} ${c.tier}`)).toEqual(formats.map((f) => `${f.id} draft`));
  });

  it('fails when a still is not the size of its format', async () => {
    const f = cfg.formats.hd;
    const r = await one('G4', 0, fakeRenderer({ wrongSize: f.id }), repoRoot());
    expect(r.status).toBe('fail');
    expect(r.lines).toContain(`The ${f.id} still is ${f.width - 2} x ${f.height}, and its format is ${f.width} x ${f.height}.`);
  });

  it('fails when the film and the cut list disagree on the frame count', async () => {
    const r = await one('G4', 2, fakeRenderer({ frameCount: FRAMES + 1 }), repoRoot());
    expect(r.status).toBe('fail');
    expect(r.lines.join(' ')).toContain(`The film has ${FRAMES + 1} frames and cut/CUTLIST.json has ${FRAMES}, which differ.`);
  });

  it('says no cut list yet and does not fail when there is none', async () => {
    const r = await one('G4', 2, fakeRenderer(), repoRoot({ cutFrames: null }));
    expect(r.status).toBe('pass');
    expect(r.skipped).toEqual(['no cut list yet']);
    expect(gate.resultLines(r)).toEqual([`G4 pass  ${r.title}`, '    not checked: no cut list yet']);
  });

  it('fails from Phase 2 when the loop has the wrong frame count, and only notes it before', async () => {
    const late = await one('G4', 2, fakeRenderer({ loop: loopFrames - 1 }), repoRoot());
    expect(late.status).toBe('fail');
    expect(late.lines.join(' ')).toContain(`The loop has ${loopFrames - 1} frames and deliver.cardLoop.seconds times film.fps is ${loopFrames}, which differ.`);
    const early = await one('G4', 0, fakeRenderer({ loop: loopFrames - 1 }), repoRoot());
    expect(early.status).toBe('pass');
    expect(early.skipped[0]).toMatch(/^checked from Phase 2: The loop has/);
  });
});

describe('G10', () => {
  it('passes with portable extensions, identical frames and no full float type', async () => {
    const renderer = fakeRenderer();
    const r = await one('G10', 0, renderer, repoRoot());
    expect(r.status).toBe('pass');
    const [lean, plain] = renderer.calls;
    expect(lean).toMatchObject({ portableOnly: true, force: true, fresh: true, name: 'g10-portable', frame: FRAMES / 2 });
    expect(plain).toMatchObject({ force: true, fresh: true, name: 'g10-plain', frame: FRAMES / 2 });
    expect(plain.portableOnly).toBeUndefined();
  });

  it('fails with a clear line when config/webgl-caps.json is missing', async () => {
    const r = await one('G10', 0, fakeRenderer(), repoRoot({ caps: false }));
    expect(r.status).toBe('fail');
    expect(r.lines).toContain('config/webgl-caps.json is missing. Run npm run caps to write it.');
  });

  it('fails when the page enabled an extension that is not marked portable', async () => {
    const r = await one('G10', 0, fakeRenderer({ extensions: [PORTABLE[0], 'EXT_color_buffer_float'] }), repoRoot());
    expect(r.status).toBe('fail');
    expect(r.lines).toContain('The page enabled EXT_color_buffer_float, which is not marked portable in config/webgl-caps.json.');
  });

  it('fails when the portable frame differs, with the count and the largest difference', async () => {
    const r = await one('G10', 0, fakeRenderer({ changed: 7, change: 9 }), repoRoot());
    const f = cfg.formats.preview;
    expect(r.status).toBe('fail');
    expect(r.lines.join(' ')).toContain(`differs from the same frame with all of them in 7 of ${f.width * f.height} pixels. The largest difference is 9 levels out of 255.`);
  });

  it('lists the file and line of every full float type under src and leaves the half float type alone', async () => {
    const src = {
      'src/engine/targets.ts': 'const a = THREE.HalfFloatType;\nconst b = THREE.FloatType;\n',
      'src/units/heart/glow.ts': 'import { FloatType } from "three";\nconst unsignedFloatTypeName = 1;\n',
      'src/notes.md': 'FloatType\n'
    };
    const root = repoRoot({ src });
    expect(g10.fullFloatUses(root)).toEqual([
      { file: 'src/engine/targets.ts', line: 2 },
      { file: 'src/units/heart/glow.ts', line: 1 }
    ]);
    const r = await one('G10', 0, fakeRenderer(), root);
    expect(r.status).toBe('fail');
    expect(r.lines).toContain('src/engine/targets.ts line 2 uses FloatType. Use HalfFloatType.');
  });

  it('still reads src when the renderer cannot be loaded', async () => {
    const registry = gate.REGISTRY.filter((c) => c.id === 'G10').map((c) => ({
      ...c,
      run: (ctx) => c.run({ ...ctx, renderer: async () => { throw new Error('no page'); } })
    }));
    const root = repoRoot({ src: { 'src/a.ts': 'x = FloatType;\n' } });
    const r = (await gate.runGate({ phase: 0, registry, root, dir: temp() })).results[0];
    expect(r.status).toBe('fail');
    expect(r.lines).toContain('The renderer could not be loaded: no page');
    expect(r.lines).toContain('src/a.ts line 1 uses FloatType. Use HalfFloatType.');
  });
});
