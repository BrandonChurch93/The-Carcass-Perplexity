// The numbers of the depth of field, with no WebGL in them: the circle of confusion of a thin lens, its clamp,
// how the lens points and the blur share the work at each sample count, and the tap patterns of the blur.

/** The largest blur radius, as a part of the frame height: 60 px at 2160, 30 px at 1080. A circle of confusion beyond it is drawn at it. */
export const MAX_COC_FRACTION = 1 / 36;

/** Under this radius, in pixels, a pixel counts as in focus and the blur leaves it alone. */
export const SHARP_PX = 0.5;

export const maxCoc = (height: number): number => MAX_COC_FRACTION * height;

/** The focal length in pixels of a lens whose vertical field of view fills `height` pixels. */
export function focalPixels(fovDegrees: number, height: number): number {
  return height / 2 / Math.tan((fovDegrees * Math.PI) / 360);
}

/**
 * The radius in pixels of the circle of confusion of a point at the view distance `z` along the axis:
 * negative in front of the focus, positive behind it. `aperture` is the radius of the lens in metres.
 */
export function cocPixels(aperture: number, focalPx: number, focus: number, z: number): number {
  return aperture * focalPx * (1 / focus - 1 / z);
}

export function clampCoc(coc: number, height: number): number {
  const m = maxCoc(height);
  return Math.min(m, Math.max(-m, coc));
}

/**
 * How far from the axis the lens points of a frame lie, as a part of the lens radius (their root mean square distance).
 * One sample sits on the axis. The points stay close to it because 2 or 4 copies a full lens apart are ghosts, not a blur.
 */
export function lensSpread(count: number): number {
  if (count <= 1) return 0;
  if (count === 2) return 0.2;
  if (count === 4) return 0.35;
  return Math.min(0.5, 0.35 + 0.05 * Math.log2(count / 4));
}

/**
 * The radius of the blur laid over the averaged samples, as a part of the circle of confusion. The lens points spread the picture by
 * `lensSpread` and a disc of this radius spreads it further, so that the second moment of the two together is that of the full disc:
 * a disc of radius 1 has a mean square radius of 1/2, the points have `lensSpread` squared.
 */
export function blurShare(count: number): number {
  const s = lensSpread(count);
  return Math.sqrt(1 - 2 * s * s);
}

/**
 * The lens points of a frame of `count` samples, in lens radii. They are fixed and centred: points drawn afresh each frame would
 * move the middle of the blur and turn its shape from frame to frame. Two lie side by side, four on the two axes.
 */
export function lensPoints(count: number): [number, number][] {
  if (count <= 1) return [[0, 0]];
  const r = lensSpread(count);
  const out: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const a = (2 * Math.PI * i) / count;
    out.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return out;
}

export type Tap = [number, number];

const TURN = Math.atan(Math.sqrt(3) / 5);
const ROOT7 = Math.sqrt(7);

const turned = ([x, y]: Tap, a: number, k: number): Tap => [k * (x * Math.cos(a) - y * Math.sin(a)), k * (x * Math.sin(a) + y * Math.cos(a))];

function lattice(radius: number): Tap[] {
  const out: Tap[] = [];
  const n = Math.ceil(radius) + 1;
  for (let j = -n; j <= n; j++) {
    for (let i = -n; i <= n; i++) {
      const x = i + j / 2;
      const y = (j * Math.sqrt(3)) / 2;
      if (Math.hypot(x, y) <= radius + 1e-6) out.push([x, y]);
    }
  }
  return out.sort((a, b) => Math.hypot(...a) - Math.hypot(...b) || Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]));
}

/** The points of the last, widest pass: the 31 points of a hexagonal lattice within the square root of 7 spacings of the middle. */
const WIDE = lattice(ROOT7);
/** The points of the two fine passes: a point and its six neighbours. */
const SEVEN = lattice(1);

/** The spacing of the wide lattice for a blur of radius 1: its 31 cells have the area of the disc. */
export const WIDE_SPACING = Math.sqrt(Math.PI / ((WIDE.length * Math.sqrt(3)) / 2));

/**
 * The taps of the three passes of the blur, finest first, for a blur of radius 1. Seven points, seven points and thirty-one:
 * each pass lays a copy of what the passes before it made at each of its points. A cluster of seven tiles the plane when the next
 * is the square root of 7 times as large and turned by the angle whose tangent is the square root of 3 over 5, so the 1519 points
 * of the three together lie evenly, none twice and none missing, inside a figure near a disc.
 */
export function blurTaps(): [Tap[], Tap[], Tap[]] {
  return [
    SEVEN.map((p) => turned(p, 0, WIDE_SPACING / 7)),
    SEVEN.map((p) => turned(p, TURN, WIDE_SPACING / ROOT7)),
    WIDE.map((p) => turned(p, 2 * TURN, WIDE_SPACING)),
  ];
}

/** The spacing of the taps of each pass, finest first, for a blur of radius 1. A pass whose spacing is under a third of a texel is skipped. */
export const BLUR_SPACING: [number, number, number] = [WIDE_SPACING / 7, WIDE_SPACING / ROOT7, WIDE_SPACING];

/**
 * The radius in pixels of the disc that a layer of texels `texel` pixels wide already is when it is laid over the full-size picture:
 * the box of the reduction and the quadratic spline of the fetch have together the second moment of a disc of this radius.
 * A layer cannot draw a blur smaller than its own grain, so a radius under it belongs to a finer layer.
 */
export function layerGrain(texel: number): number {
  return 2 * texel * Math.sqrt(1 / 12 + 1 / 4);
}

/**
 * Where the blur of what lies at or behind the focus passes from the full-size passes to the quarter-size field, as radii in pixels
 * after the lens points took their share. Under the first the full-size passes draw all of it, over the second the field does.
 * The first is above the grain of the quarter-size layer, so the field is never asked for a blur it cannot draw.
 */
export const FINE_HANDOVER: [number, number] = [6, 10];

/** The part of the quarter-size field in a pixel whose radius is `radius` pixels: a smooth step across `FINE_HANDOVER`. */
export function fieldPart(radius: number): number {
  const t = Math.min(1, Math.max(0, (radius - FINE_HANDOVER[0]) / (FINE_HANDOVER[1] - FINE_HANDOVER[0])));
  return t * t * (3 - 2 * t);
}

/**
 * How much of its blur a pixel of the circle of confusion `coc` (pixels, before the share) is given by the full-size passes:
 * nothing up to `SHARP_PX`, so a pixel in focus stays the pixel it was, and all of it one pixel further, so the blur starts from nothing.
 */
export function fineOnset(coc: number): number {
  return Math.min(1, Math.max(0, Math.abs(coc) - SHARP_PX));
}

const FINE = Math.sqrt(7 / 96);

/** The spacing of the taps of the two full-size passes, finest first, for a blur of radius 1. */
export const FINE_SPACING: [number, number] = [FINE, FINE * ROOT7];

/**
 * The taps of the two full-size passes, finest first, for a blur of radius 1: a point and its six neighbours, and the same
 * the square root of 7 times as large and turned, so the 49 points of the two together lie on one even lattice.
 * The spacing gives them the second moment of the disc exactly. Up to the first radius of `FINE_HANDOVER` the points lie
 * less than 2 pixels apart, the width of a filtered fetch, so they fill the disc without gaps; past it the field takes over.
 */
export function fineTaps(): [Tap[], Tap[]] {
  return [SEVEN.map((p) => turned(p, 0, FINE_SPACING[0])), SEVEN.map((p) => turned(p, TURN, FINE_SPACING[1]))];
}
