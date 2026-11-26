import { describe, expect, it } from 'vitest';
import { config, FPS } from '../src/config';
import { shutterShare, smearShare } from '../src/core/shutter';
import type { CameraState, Stage } from '../src/core/stage';
import { SHUTTER } from '../src/core/time';

const cam = (position: [number, number, number], aim: [number, number, number], fov = 30, focus = 0): CameraState => ({
  position,
  aim,
  height: position[1],
  lens: { fovDegrees: fov, aperture: 0, focus: focus || Math.hypot(aim[0] - position[0], aim[1] - position[1], aim[2] - position[2]) },
});

const ASPECT = 16 / 9;

describe('the smear of a camera move', () => {
  it('is nothing for a camera that stands still', () => {
    const a = cam([3, 4, 5], [0, 0, 0]);
    expect(smearShare(a, a, ASPECT)).toBeLessThan(1e-12);
  });

  it('is the climb rate times the distance from the centre, for a camera that climbs straight up over the ground', () => {
    // 2.7 per cent higher: the corner of the ground it saw moves in by 2.7 / 1.027 per cent of its distance from the centre.
    const a = cam([10, 100, -20], [10, 0, -20]);
    const b = cam([10, 102.7, -20], [10, 0, -20]);
    const corner = Math.hypot(0.5, 0.5 / ASPECT);
    expect(smearShare(a, b, ASPECT)).toBeCloseTo((corner * 0.027) / 1.027, 6);
  });

  it('is steady for a view straight down, whichever world axis is up', () => {
    const a = cam([0, 50, 0], [0, 0, 0]);
    const b = cam([0, 50, 0], [0.001, 0, 0.001]);
    expect(smearShare(a, b, ASPECT)).toBeLessThan(0.001);
  });

  it('grows as the subject comes nearer, for the same sideways step', () => {
    const far = smearShare(cam([0, 0, 0], [0, 0, -1], 30, 20), cam([0.1, 0, 0], [0.1, 0, -1], 30, 20), ASPECT);
    const near = smearShare(cam([0, 0, 0], [0, 0, -1], 30, 2), cam([0.1, 0, 0], [0.1, 0, -1], 30, 2), ASPECT);
    expect(near).toBeGreaterThan(far * 9.9);
    expect(near).toBeLessThan(far * 10.1);
  });

  it('counts a turn of the camera as much at any distance', () => {
    const turn = (focus: number): number => smearShare(cam([0, 0, 0], [0, 0, -10], 30, focus), cam([0, 0, 0], [0.1, 0, -10], 30, focus), ASPECT);
    expect(turn(2)).toBeCloseTo(turn(200), 6);
    expect(turn(2)).toBeGreaterThan(0);
  });

  it('has no end when the subject passes behind the camera', () => {
    expect(smearShare(cam([0, 0, 0], [0, 0, -1], 30, 1), cam([0, 0, -5], [0, 0, -6], 30, 1), ASPECT)).toBe(Infinity);
  });
});

/** A stage whose camera climbs straight up over the ground, `rate` of its height a second. */
const climbing = (unit: string | null, rate: number): Stage =>
  ({ unit, cameraAt: (seconds: number): CameraState => cam([0, 100 * (1 + rate * seconds), 0], [0, 0, 0]) }) as unknown as Stage;

describe("the camera's share of the shutter", () => {
  const limit = config.film.maxSmearShare;

  it('is the whole shutter for a slow move', () => {
    expect(shutterShare(climbing('reveal', 0.001), 0, ASPECT)).toBe(1);
  });

  it('closes on a fast move so far that the move smears the frame by the limit and no more', () => {
    const stage = climbing('reveal', 2);
    const share = shutterShare(stage, 0, ASPECT);
    expect(share).toBeGreaterThan(0);
    expect(share).toBeLessThan(1);
    const kept = smearShare(stage.cameraAt(0), stage.cameraAt((SHUTTER * share) / FPS), ASPECT);
    expect(kept).toBeLessThan(limit * 1.05);
    expect(kept).toBeGreaterThan(limit * 0.9);
  });

  it('stays whole for a unit that keeps the full shutter, however fast its camera moves', () => {
    for (const unit of config.film.fullShutterUnits) expect(shutterShare(climbing(unit, 2), 0, ASPECT)).toBe(1);
  });

  it('keeps the Heart, approved with the full shutter, as it was', () => {
    expect(config.film.fullShutterUnits).toContain('heart');
  });
});
