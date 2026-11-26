// The storm's masses: single heaps of storm cloud from pictures (mat/mass-a to mass-d, each with its own cut, a torn edge), standing on two
// rings about the ridge, the far one at eight kilometres and the near one at three and a half. The rings are places in the world, so a lens
// that travels along the ridge sees the near masses pass over the far ones and both over the dome's own pictures. The gale carries each ring
// round at its own rate, and each picture is drawn through a slow field of eddies, so the heads lean and close over the seconds.
// No picture is turned over: all four are lit from the same side, the last light's.
import * as THREE from 'three';
import { DUSK, MOUTH, WIND } from '../shared/anchors';
import type { Context } from '../shared/context';

interface Mass {
  picture: 'A' | 'B' | 'C' | 'D';
  /** Where it stands on its ring, radians from the gale's own heading. */
  turned: number;
  /** The height of its middle over the seat, metres. */
  high: number;
  /** Its width along the ring, metres. */
  wide: number;
}
interface Ring {
  radius: number;
  /** Radians a second, toward the last light. */
  rate: number;
  /** How much of the sky behind stands in the mass: the air between. */
  air: number;
  masses: Mass[];
}
// Width over height of each picture, and its width in dots.
const SHAPE: Record<Mass['picture'], { ratio: number; dots: number }> = {
  A: { ratio: 2052 / 766, dots: 2052 },
  B: { ratio: 1536 / 1024, dots: 1536 },
  C: { ratio: 2122 / 741, dots: 2122 },
  D: { ratio: 1672 / 941, dots: 1672 },
};
// Far ring first: it is drawn first and the near ring over it.
const RINGS: Ring[] = [
  {
    radius: 8000,
    rate: 0.003,
    air: 0.36,
    masses: [
      { picture: 'D', turned: -2.9, high: 1750, wide: 6400 },
      { picture: 'B', turned: -2.0, high: 2000, wide: 5200 },
      { picture: 'D', turned: -1.1, high: 1600, wide: 6800 },
      { picture: 'B', turned: -0.2, high: 2150, wide: 5600 },
      { picture: 'D', turned: 0.7, high: 1700, wide: 6200 },
      { picture: 'B', turned: 1.6, high: 1900, wide: 5000 },
      { picture: 'D', turned: 2.45, high: 2100, wide: 6000 },
    ],
  },
  {
    radius: 3500,
    rate: 0.0085,
    air: 0.1,
    masses: [
      { picture: 'C', turned: -2.75, high: 1250, wide: 3400 },
      { picture: 'A', turned: -1.7, high: 900, wide: 3300 },
      { picture: 'C', turned: -0.62, high: 760, wide: 3700 },
      { picture: 'A', turned: 0.45, high: 1050, wide: 3100 },
      { picture: 'C', turned: 1.5, high: 820, wide: 3600 },
      { picture: 'A', turned: 2.55, high: 1300, wide: 3300 },
    ],
  },
];
const wrap = (a: number): number => a - 2 * Math.PI * Math.floor((a + Math.PI) / (2 * Math.PI));
const STORM_HEADING = Math.atan2(-WIND[2], -WIND[0]);
// The gale carries the masses from the storm round toward the last light.
const TOWARD_DUSK = Math.sign(wrap(Math.atan2(DUSK[2], DUSK[0]) - STORM_HEADING)) || 1;
const f = (n: number): string => n.toFixed(5);

const drawn = (ring: Ring, at: string): string =>
  ring.masses
    .map((m) => {
      const shape = SHAPE[m.picture];
      const halfWide = m.wide / ring.radius / 2;
      const halfTall = m.wide / shape.ratio / 2;
      return `  c = massOver(c, tMass${m.picture}, ${at}, vec4(${f(m.turned)} + ${f(ring.rate * TOWARD_DUSK)} * uTime, ${f(m.high)}, ${f(halfWide)}, ${f(halfTall)}), ${f(shape.dots)}, foot, ${f(ring.air)}, show);`;
    })
    .join('\n');

/** The masses over the sky's colour c, as the lens at `from` sees them toward d. Needs wrapPi, STORM_AZ, tNoise and the rig's uTime. */
export const MASSES_GLSL = /* glsl */ `
uniform sampler2D tMassA;
uniform sampler2D tMassB;
uniform sampler2D tMassC;
uniform sampler2D tMassD;
const vec3 MASS_SEAT = vec3(${f(MOUTH[0])}, ${f(MOUTH[1])}, ${f(MOUTH[2])});
// Where the ray from the lens toward d meets the ring of this radius about the seat: x its heading there about the seat, from the gale's own;
// y its height over the seat, metres; z how far along the ray it is.
vec3 ringAt(vec3 from, vec3 d, float radius) {
  vec2 o = from.xz - MASS_SEAT.xz;
  float dd = max(dot(d.xz, d.xz), 1e-5);
  float b = dot(o, d.xz);
  float t = (-b + sqrt(max(b * b - dd * (dot(o, o) - radius * radius), 0.0))) / dd;
  vec2 p = o + d.xz * t;
  return vec3(wrapPi(atan(p.y, p.x) - STORM_AZ), from.y + d.y * t - MASS_SEAT.y, t);
}
// How much of this ray the masses hide: before the flash a mass is a dark shape with a lit edge, not a lamp.
float massCover = 0.0;
// One mass over c. seat: x where its middle stands on the ring, y how high, z half its width in radians of the ring, w half its height in metres.
vec3 massOver(vec3 c, sampler2D picture, vec3 at, vec4 seat, float dots, float foot, float air, float show) {
  vec2 uv = vec2(0.5 + wrapPi(at.x - seat.x) / (2.0 * seat.z), 0.5 + (at.y - seat.y) / (2.0 * seat.w));
  if (uv.x <= 0.0 || uv.x >= 1.0 || uv.y <= 0.0 || uv.y >= 1.0) return c;
  // The heads lean and close: the picture is read through eddies that turn slowly and never return.
  vec3 eddyAt = vec3(uv * vec2(2.3, 1.1) + seat.y * 0.0007, 0.41 + 0.011 * uTime);
  vec2 eddy = textureLod(tNoise, eddyAt, 0.0).rg - 0.5 + 0.12 * (textureLod(tNoise, eddyAt * vec3(2.9, 2.9, 1.7) + 0.37, 0.0).ba - 0.5);
  uv += eddy * vec2(0.005, 0.008) * smoothstep(0.0, 0.12, min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)));
  // No finer than the frame's own dots.
  // The file holds the colour in its upper half and the cut in its lower.
  float lod = max(log2(foot * dots / (2.0 * seat.z)), 0.0);
  uv.y = clamp(uv.y, 0.012, 0.988);
  vec4 m = vec4(textureLod(picture, vec2(uv.x, 0.5 + 0.5 * uv.y), lod).rgb, textureLod(picture, vec2(uv.x, 0.5 * uv.y), lod).g);
  // A cloud's edge is vapour over a hundred metres, not a cut: the cut is read broad as well, and the mass thins toward it.
  float broad = textureLod(picture, vec2(uv.x, 0.5 * uv.y), lod + 3.5).g;
  m.a *= smoothstep(0.12, 0.8, broad) * smoothstep(0.0, 0.2, min(uv.x, 1.0 - uv.x));
  // The pictures' lit rims are those of a brighter hour: at this dusk a head's edge is a little paler than the head, never a white line.
  float pale = dot(m.rgb, vec3(0.3, 0.5, 0.2));
  m.rgb *= mix(1.0, 0.5, smoothstep(0.1, 0.42, pale));
  // And its darks are cloud in the dusk's air, not holes: slate, never black.
  m.rgb = m.rgb * 0.88 + vec3(0.017, 0.02, 0.03);
  massCover = 1.0 - (1.0 - massCover) * (1.0 - m.a * m.a * show);
  return mix(c, mix(m.rgb, c, air), m.a * show);
}
vec3 stormMasses(vec3 c, vec3 from, vec3 d, float foot) {
  // They stand out of the haze on the sea, not on a line; and toward the last light only the storm's shelf, high up: under it the dusk is open.
  float lee = smoothstep(1.35, 2.0, abs(wrapPi(atan(d.z, d.x) - STORM_AZ)));
  float show = smoothstep(0.004, 0.045, d.y) * mix(1.0, smoothstep(0.09, 0.2, d.y), lee);
  if (show <= 0.0) return c;
  vec3 far = ringAt(from, d, ${f(RINGS[0]!.radius)});
${drawn(RINGS[0]!, 'far')}
  vec3 near = ringAt(from, d, ${f(RINGS[1]!.radius)});
${drawn(RINGS[1]!, 'near')}
  return c;
}`;

export function massPictures(ctx: Context): Record<string, THREE.IUniform> {
  const read = (file: string): THREE.IUniform => ({ value: ctx.assets.texture(file, { repeat: false }) });
  return { tMassA: read('mat/mass-a.jpg'), tMassB: read('mat/mass-b.jpg'), tMassC: read('mat/mass-c.jpg'), tMassD: read('mat/mass-d.jpg') };
}
