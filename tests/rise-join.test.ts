// Stands in place of 'starts with nothing in frame but the deep water and the rings', which tests/rise-core.test.ts held until the join was staged anew (proposed by the Reveal's team as assets-src/reveal/proposed/rise-core-join.test.ts).
// The join in the restaged climb: on the last frame of the Eye and the first frame of the rise both places draw the banks of cloud over
// the lake with one function from one set of numbers, from straight above its centre, one step of one climb apart, and what is seen
// through the gap in the banks is deep water in both.
import { describe, expect, it } from 'vitest';
import eyeHandoff from '../src/places/eye/handoff.json';
import handoff from '../src/places/reveal/handoff.json';
import tuning from '../src/places/reveal/rise.json';
import { FLIGHT } from '../src/places/eye/cameras';
import { flight } from '../src/places/eye/flight';
import { FOV, KM, RISE_FIRST, halfHeightAt, poseAt } from '../src/places/reveal/shared/anchors';
import { LID_GAP, lidAt, lidGapSeen } from '../src/places/reveal/join/lid';
import { FPS } from '../src/config';

// The radius of the deep water of the Eye's lake, in metres, as the test this replaces had it.
const EYE_DEEP = 440;

describe('the join of the Eye and the rise', () => {
  it('is drawn from one set of numbers', () => {
    expect(eyeHandoff).toEqual(handoff);
    expect(FLIGHT.riseFrame).toBe(RISE_FIRST);
    expect(FLIGHT.halfHeight).toBe(handoff.eyeHalfHeightMetres);
    expect(FLIGHT.climbPerFrame).toBe(handoff.climbPerFrame);
  });

  it('is seen from straight above the centre of the lake on both frames', () => {
    const last = flight(RISE_FIRST - 1, FLIGHT);
    expect(last.sin).toBe(1);
    expect(last.cos).toBe(0);
    expect(last.z).toBe(0);
    const first = poseAt(RISE_FIRST);
    expect(first.position[0]).toBeCloseTo(first.aim[0], 9);
    expect(first.position[2]).toBeCloseTo(first.aim[2], 9);
  });

  it('is one step of one climb: the same height in the measure of the lid, at the same rate', () => {
    // One unit up is the height of each camera at the cut, so the Eye's last frame stands one frame's climb under 1 and the rise's first at 1.
    const cut = handoff.eyeHalfHeightMetres / Math.tan((FLIGHT.endFov * Math.PI) / 360);
    const before = flight(RISE_FIRST - 1, FLIGHT).y / cut;
    const at = halfHeightAt(0) / handoff.revealHalfHeightKm;
    expect(at).toBeCloseTo(1, 9);
    const near = (rate: number): void => expect(Math.abs(rate - handoff.climbPerFrame)).toBeLessThan(handoff.climbPerFrame * 0.01);
    near(Math.log(at / before));
    near(Math.log(flight(RISE_FIRST - 1, FLIGHT).y / flight(RISE_FIRST - 2, FLIGHT).y));
    near(Math.log(halfHeightAt(1 / FPS) / halfHeightAt(0)));
    // One unit across is half the height of each view on the water, so a ray through one point of the frame is one ray in the lid.
    expect(flight(RISE_FIRST, FLIGHT).half).toBeCloseTo(handoff.eyeHalfHeightMetres, 6);
    expect(FOV).toBeLessThan(FLIGHT.endFov);
  });

  it('draws the banks whole on both frames, and has them gone by the first key of the rise', () => {
    expect(lidAt(-1 / FPS, handoff.lid, FPS).eroded).toBe(0);
    expect(lidAt(0, handoff.lid, FPS).eroded).toBe(0);
    expect(lidAt(handoff.lid.erodeFrames / FPS, handoff.lid, FPS).eroded).toBe(1);
    expect(RISE_FIRST + handoff.lid.erodeFrames).toBeLessThanOrEqual(9627);
    // No bank stands where the Eye's lens could see it before the Eye begins to draw them.
    expect(LID_GAP.lowest).toBeGreaterThan(LID_GAP.foot);
  });

  it('shows only deep water through the gap in the banks, in both places', () => {
    const seen = lidGapSeen();
    expect(seen).toBeLessThan(1);
    expect(seen * handoff.eyeHalfHeightMetres).toBeLessThan(EYE_DEEP);
    const [rx, ry] = tuning.lakeDeepPx as [number, number];
    expect(seen * handoff.revealHalfHeightKm).toBeLessThan(Math.min(rx, ry) * KM);
  });

  it('lays one water under the gap in both places, inside the deep water of both lakes', () => {
    const reach = handoff.lid.waterReach;
    expect(handoff.lid.water).toHaveLength(3);
    expect(lidGapSeen()).toBeLessThan(reach);
    expect(reach * handoff.eyeHalfHeightMetres).toBeLessThan(EYE_DEEP);
    const [rx, ry] = tuning.lakeDeepPx as [number, number];
    expect(reach * handoff.revealHalfHeightKm).toBeLessThan(Math.min(rx, ry) * KM);
  });
});
