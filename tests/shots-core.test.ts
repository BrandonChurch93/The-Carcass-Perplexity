// @ts-nocheck
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as core from '../tools/lib/shots-core.mjs';
import * as webmix from '../tools/lib/webmix.mjs';

const cfg = JSON.parse(fs.readFileSync('config/showcase.json', 'utf8'));
const cut = JSON.parse(fs.readFileSync('cut/CUTLIST.json', 'utf8'));
const state = (frame, position, aim, fov = 40, height = position[1]) => ({ frame, camera: { position, aim, height, lens: { fovDegrees: fov, aperture: 0, focus: 1 } } });

describe('the lens of a shot', () => {
  it('turns a field of view into a focal length on a sensor 24 mm high', () => {
    expect(core.lensMm(30)).toBeCloseTo(44.78, 1);
    expect(core.lensMm(90)).toBeCloseTo(12, 6);
  });

  it('says a held lens once and a zoom from and to', () => {
    expect(core.lensLine({ lensStart: 35, lensEnd: 35, lensMin: 35, lensMax: 35.2, fovStart: 38, fovEnd: 38 })).toBe('35 mm for the whole shot (a vertical field of view of 38 degrees)');
    expect(core.lensLine({ lensStart: 24, lensEnd: 50, lensMin: 24, lensMax: 50, fovStart: 53, fovEnd: 27 })).toBe('from 24 mm to 50 mm (a vertical field of view from 53 to 27 degrees)');
  });
});

describe('the frames a shot is measured at', () => {
  it('run from its first frame to its last and hold its key frame', () => {
    const shot = { id: 's', first: 100, last: 131 };
    const frames = core.sampleFrames(shot, 117);
    expect(frames[0]).toBe(100);
    expect(frames[frames.length - 1]).toBe(131);
    expect(frames).toContain(117);
    expect(core.sampleFrames(shot, 500)).not.toContain(500);
  });
});

describe('the measures of a shot', () => {
  const shot = { id: 's', first: 0, last: 2 };
  const states = [state(0, [0, 10, 0], [0, 10, -100]), state(1, [30, 10, 0], [30, 10, -100]), state(2, [30, 10, 40], [30, 0, 40], 30, 6)];

  it('adds the travel along the path and reads the heights, the lens and the reach at both ends', () => {
    const m = core.measure(shot, states, 1);
    expect(m.travel).toBeCloseTo(70, 9);
    expect(m.heightStart).toBe(10);
    expect(m.heightEnd).toBe(6);
    expect(m.heightKey).toBe(10);
    expect(m.reachStart).toBe(100);
    expect(m.reachEnd).toBe(10);
    expect(m.lensEnd).toBeGreaterThan(m.lensStart);
    expect(m.frames).toBe(3);
  });

  it('refuses a shot with no states', () => {
    expect(() => core.measure(shot, [])).toThrow(/has no states/);
  });
});

describe('lengths in words', () => {
  it('rounds metres by their size and turns far ones into kilometres', () => {
    expect(core.length(3.26)).toBe('3.3 m');
    expect(core.length(42.4)).toBe('42 m');
    expect(core.length(617)).toBe('620 m');
    expect(core.length(12400)).toBe('12.4 km');
    expect(core.length(48.96, 'km')).toBe('49.0 km');
    expect(core.length(5410, 'km')).toBe('5410 km');
    expect(core.length(Number.NaN)).toBe('unknown');
  });
});

describe('the shots file', () => {
  const measures = Object.fromEntries(cut.shots.filter((s) => s.picture !== 'black').map((s) => [s.id, core.measure(s, [state(s.first, [0, 20, 0], [0, 0, -50]), state(s.last, [0, 20, -60], [0, 0, -110])])]));

  it('has one block for every shot of the cut list, under its place, in the order of the film', () => {
    const { text, missing } = core.shotsDoc({ cut, cfg, measures, notes: {} });
    for (const s of cut.shots) expect(text).toContain(`### \`${s.id}\` · `);
    expect(text.match(/^## /gm)).toHaveLength(cfg.film.order.length);
    expect(text.indexOf('`ribs-01`')).toBeLessThan(text.indexOf('`reveal-01`'));
    expect(missing).toHaveLength(cut.shots.filter((s) => s.picture !== 'black').length * 3);
    expect(text).not.toMatch(/[\u2014!]/);
    expect(text).toContain('- Picture: black. No camera.');
  });

  it('prints the notes of a shot, its key frame, its lens and its travel', () => {
    const shot = cut.shots.find((s) => s.key);
    const notes = { shots: { [shot.id]: { start: 'The whole strait, wide.', end: 'The far wall, close.', focus: 'On the far wall.' } } };
    const { text, missing } = core.shotsDoc({ cut, cfg, measures, notes });
    expect(text).toContain('- Start framing: The whole strait, wide.');
    expect(text).toContain('- End framing: The far wall, close.');
    expect(text).toContain('- Focus: On the far wall. The aim is');
    expect(text).toContain(`- Key: \`${shot.key}\` at frame ${cut.keyFrames[shot.key]}.`);
    expect(text).toContain('The camera travels 60 m, at 20 m above the ground.');
    expect(missing.some((m) => m.startsWith(`${shot.id}:`))).toBe(false);
  });

  it('gives a place its own scale when the notes name one', () => {
    const { text } = core.shotsDoc({ cut, cfg, measures, notes: { scale: { reveal: 'km' } } });
    const block = text.slice(text.indexOf('### `reveal-01`'));
    expect(block).toContain('The camera travels 60.0 km, at 20.0 km above the ground.');
  });
});

describe('the web copy of the mix', () => {
  it('is encoded with no date and no tags, so the same mix gives the same file', () => {
    const a = webmix.webMixArgs('in.flac', 'out.m4a');
    expect(a).toContain('+bitexact');
    expect(a.join(' ')).toContain('-map_metadata -1');
    expect(a.join(' ')).toContain(`-b:a ${webmix.WEB_MIX_KBPS}k`);
    expect(a[a.length - 1]).toBe('out.m4a');
  });

  it('leaves the build silent, with a reason, when there is no mix or no build', () => {
    expect(webmix.webMix('out/work/none', { source: null })).toMatchObject({ file: null });
    expect(webmix.webMix('out/work/no-such-dir', { source: 'audio/mix/mix.flac' }).why).toContain('no build');
    expect(webmix.newestMix('out/work/no-such-dir')).toBeNull();
  });
});
