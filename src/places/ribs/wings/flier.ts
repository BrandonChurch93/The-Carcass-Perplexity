// A kite-wing in the air as a body: a keeled trunk, a neck that folds, two legs tucked along the belly with the feet trailed, and two sails,
// each a thin skin stretched from an arm bone along its front edge over finger struts that fan from the wrist, cut in between the struts
// along its back edge. Built anew for every frame on the processor from a pose that is a function of the time of the place alone. Its
// surface is drawn from the body's own measures: pale hide, ribs on the flank, struts and veins in the sail, and the sail lets the sun
// through only where the sun stands behind it. Sail measures are in units of which PX are a metre at size 1.
import * as THREE from 'three';
import { RIG_GLSL } from '../shared/glsl';
import type { Context } from '../shared/context';
import type { BodyMaterials } from './body';

const PX = 105;

/** The right sail's front and back edges, shoulder to tip: [units out from the middle, units ahead of the shoulders]. */
const FRONT: [number, number][] = [[10, 6], [70, 48], [133, 86], [233, 92], [322, 91], [398, 90]];
const BACK: [number, number][] = [[10, -92], [78, -64], [145, -33], [215, -9], [252, 13], [295, 43], [333, 58], [398, 84]];
/** Where the lines across the sail stand, units out: the wrist, and after it the ends of the struts with three lines between each two. */
const WRIST_OUT = 133;
const TIP_OUT = 398;
const SPAN = (TIP_OUT - WRIST_OUT) / 3;
const OUT = [10, 41, 72, 103, 133, ...Array.from({ length: 12 }, (_, i) => WRIST_OUT + ((i + 1) * SPAN) / 4)];
const WRIST = 4;
const ROWS = 5;
/** The sail is swept back by its own slant: units back for a unit out. */
const SWEEP = 0.2;
const WING_VERTS = OUT.length * ROWS;
/** The hand of the sail against the arm, and the breadth of the sail against its edges, so that one seen from ahead is a wing and not a blade. */
const HAND = 0.76;
const CHORD = 1.24;
/** The bone along the front edge of a sail: a tube of this many sides on every line. */
const BONE_SIDES = 4;
const BONE_VERTS = OUT.length * BONE_SIDES;

/** The trunk: [metres ahead of the shoulders, metres up, radius, how deep the keel stands under it], tail to the root of the neck. */
const TRUNK: [number, number, number, number][] = [[-1.12, 0.03, 0.015, 0], [-0.98, 0.01, 0.09, 0], [-0.68, -0.02, 0.2, 0.2], [-0.32, -0.03, 0.26, 0.5], [0, -0.02, 0.27, 0.62], [0.2, 0.02, 0.19, 0.3], [0.34, 0.06, 0.11, 0.05]];
/** The neck: rings along a curve of this length that folds into an S; and the head on its end: [metres along, radius]. */
const NECK_RINGS = 5;
const NECK_LONG = 0.8;
const SKULL: [number, number][] = [[0.02, 0.066], [0.14, 0.098], [0.28, 0.058], [0.64, 0.011]];
const SPINE_RINGS = TRUNK.length + NECK_RINGS + SKULL.length;
const SIDES = 8;
const SPINE_VERTS = SPINE_RINGS * SIDES;
/** A leg: the hip, and from it the thigh, the shin and the toes, metres long. */
const HIP: [number, number] = [-0.5, -0.1];
const THIGH = 0.6;
const SHIN = 1;
const TOES = 0.25;
const LEG_RADIUS = [0.09, 0.055, 0.04, 0.045, 0.018];
const LEG_SIDES = 4;
const LEG_VERTS = LEG_RADIUS.length * LEG_SIDES;
const VERTS = 2 * (WING_VERTS + BONE_VERTS) + SPINE_VERTS + 2 * LEG_VERTS;

/** Metres from the middle of the back to the tip of a sail at size 1. */
export const SAIL_LONG = (WRIST_OUT + (TIP_OUT - WRIST_OUT) * HAND) / PX;

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** A ring of a leg let down by `legs`: [metres ahead of the shoulders, metres up] at size 1. Trailed, the thigh lies ahead along the belly and the shin back under the tail, so that only the feet stand out behind; let down, the thigh swings under and the shin hangs; the push straightens them. */
const legAt = (r: number, legs: number): [number, number] => {
  const e = smooth(0, 1, legs);
  const push = Math.min(1, Math.max(0, (legs - 1) / 0.1));
  const thigh = 0.25 + 0.9 * e + 0.3 * push;
  const shin = Math.PI - 0.06 - (Math.PI - 2.01) * e - 0.33 * push;
  const toes = (Math.PI - 0.12) * (1 - e);
  if (r === 0) return [HIP[0], HIP[1]];
  const kx = HIP[0] + THIGH * Math.cos(thigh);
  const ky = HIP[1] - THIGH * Math.sin(thigh);
  if (r === 1) return [kx, ky];
  const along = r === 2 ? 0.5 : 1;
  const ax = kx + SHIN * along * Math.cos(shin);
  const ay = ky - SHIN * along * Math.sin(shin);
  if (r <= 3) return [ax, ay];
  return [ax + TOES * Math.cos(toes), ay - TOES * Math.sin(toes) * 0.6];
};
/** Where a foot is with the legs let down by `legs`: [metres ahead of the shoulders, metres up] at size 1. */
export const footOf = (legs: number): [number, number] => {
  const [x, y] = legAt(3, legs);
  return [x, y - (LEG_RADIUS[3] as number)];
};

const edge = (line: [number, number][], out: number): number => {
  for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i] as [number, number];
    const b = line[i + 1] as [number, number];
    if (out <= b[0] || i + 2 === line.length) return a[1] + ((b[1] - a[1]) * Math.min(1, Math.max(0, (out - a[0]) / (b[0] - a[0]))));
  }
  return 0;
};
/** The front and back edge on every line: the back edge is drawn in between the ends of the struts, most between the body and the wrist. */
const FRONTS = OUT.map((out) => edge(FRONT, out) + 7);
const BACKS = OUT.map((out) => {
  const cell = out < WRIST_OUT ? (out - 10) / (WRIST_OUT - 10) : (out - WRIST_OUT) / SPAN;
  return edge(BACK, out) - 9 + (out < WRIST_OUT ? 30 : 22) * Math.abs(Math.sin(Math.PI * cell));
});

const VERTEX = /* glsl */ `
attribute vec2 aPx;
attribute vec3 aMix;
uniform float uPool;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vPx;
varying vec3 vMix;
varying float vUnder;
void main() {
  vec3 w = position;
  vUnder = 0.0;
#ifdef MIRROR
  // The mirror: the animal turned over about the water, laid on the water where the lens would see it.
  float y = 2.0 * uPool - w.y;
  float m = (cameraPosition.y - uPool - 0.012) / max(cameraPosition.y - y, 1e-3);
  vUnder = w.y - uPool;
  w = vec3(cameraPosition.xz + (w.xz - cameraPosition.xz) * m, uPool + 0.012).xzy;
#endif
  vWorld = w;
  vNormal = normal;
  vPx = aPx;
  vMix = aMix;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;

// vMix.x says what a place of the body is: 0 horn (bone, leg, beak), 1 hide, 2 the skin of a sail. vPx is its own measure there: on a
// sail [units out, 0 at the front edge to 1 at the back], on the trunk [metres ahead, the turn round it].
const FRAGMENT = /* glsl */ `
precision highp float;
${RIG_GLSL}
uniform float uPool;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vPx;
varying vec3 vMix;
varying float vUnder;
void main() {
  // Every screen slope is taken here, before anything that a pixel may or may not do.
  vec3 dpx = dFdx(vWorld);
  vec3 dpy = dFdy(vWorld);
  vec2 dux = dFdx(vPx);
  vec2 duy = dFdy(vPx);
  float fine = abs(dux.x) + abs(duy.x);
  float sail = smoothstep(1.5, 1.9, vMix.x);
  float hide = clamp(vMix.x, 0.0, 1.0) * (1.0 - sail);
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 n0 = normalize(vNormal);
  n0 *= dot(n0, v) < 0.0 ? -1.0 : 1.0;
  // The sail: struts fan from the wrist at the front edge to the back edge, with finer veins between them, and the skin sags between.
  float back = max(vPx.y, 0.08);
  float fan = (vPx.x - ${WRIST_OUT.toFixed(1)}) / back;
  float cell = fan / (fan < 0.0 ? ${(WRIST_OUT - 10).toFixed(1)} : ${SPAN.toFixed(2)});
  float near = cell - floor(cell + 0.5);
  float period = (fan < 0.0 ? ${(WRIST_OUT - 10).toFixed(1)} : ${SPAN.toFixed(2)}) * back;
  float off = abs(near) * period;
  float thick = mix(4.6, 1.8, vPx.y);
  float seen = thick / (thick + fine);
  float strut = (1.0 - smoothstep(0.45 * thick, thick + fine, off)) * step(-0.5, cell) * step(cell, 3.5) * seen * sail;
  float fineCell = cell * 4.0;
  float veinOff = abs(fineCell - floor(fineCell + 0.5)) * period * 0.25;
  float vein = (1.0 - smoothstep(0.3, 1.1 + fine, veinOff)) * (0.9 / (0.9 + fine)) * sail * smoothstep(0.1, 0.3, vPx.y);
  // The ribs on the flank of the trunk.
  float flank = smoothstep(0.25, 0.8, abs(sin(vPx.y))) * smoothstep(-0.75, -0.55, vPx.x) * (1.0 - smoothstep(0.02, 0.2, vPx.x)) * hide;
  float ribFine = 1.0 / (1.0 + 40.0 * (abs(dux.x) + abs(duy.x)));
  vec2 slope = vec2(0.0);
  slope.x += sail * (-0.55 * sign(near) * strut - 0.3 * sin(6.2832 * near) * seen * step(-0.5, cell));
  slope.x += flank * ribFine * 0.7 * cos(vPx.x * 52.0);
  float det = dux.x * duy.y - dux.y * duy.x;
  det = abs(det) < 1e-9 ? 1e-9 : det;
  vec3 tx = (dpx * duy.y - dpy * dux.y) / det;
  tx -= n0 * dot(tx, n0);
  vec3 n = normalize(n0 - tx / max(length(tx), 1e-9) * slope.x);
  // Its colours: horn dark, hide a pale grey tan, paler under it, mottled; the skin of the sail paler yet and darker where it is thick.
  float mottle = sin(vPx.x * (sail > 0.5 ? 0.21 : 23.0) + 2.0 * sin(vPx.y * 3.0)) * sin(vPx.x * (sail > 0.5 ? 0.083 : 9.1) + vPx.y * 5.0);
  vec3 horn = vec3(0.17, 0.15, 0.13);
  vec3 pelt = mix(vec3(0.26, 0.235, 0.2), vec3(0.37, 0.34, 0.3), smoothstep(0.2, -0.8, cos(vPx.y))) * (1.0 + 0.12 * mottle - 0.16 * flank * ribFine * sin(vPx.x * 52.0));
  float thin = mix(0.4, 1.0, smoothstep(0.02, 0.55, vPx.y)) * mix(0.55, 1.0, smoothstep(10.0, 70.0, vPx.x));
  vec3 web = mix(vec3(0.24, 0.215, 0.185), vec3(0.32, 0.29, 0.25), thin) * (1.0 + 0.07 * mottle);
  web = mix(web, vec3(0.17, 0.15, 0.13), max(strut, 0.45 * vein));
  vec3 albedo = mix(mix(horn, pelt, hide), web, sail) * vMix.z;
  float wet = 1.0 - smoothstep(uPool + 0.03, uPool + 0.45, vWorld.y);
  albedo *= 1.0 - 0.42 * wet;
  float occ = vMix.y * mix(0.7, 1.0, smoothstep(-0.6, 0.4, n.y));
  // What of the light behind a sail comes through it: less where it is thick, little through a strut.
  float through = sail * thin * (1.0 - 0.85 * strut) * (1.0 - 0.4 * vein);
  vec4 land = landAt(vWorld.xz);
#if defined(MIRROR)
  vec3 up = vWorld + vec3(0.0, 2.0 * vUnder, 0.0);
  vec3 col = rigShade(up, n, v, albedo, 0.6, occ);
  col += albedo * (skyIrradiance(vec3(0.0, 1.0, 0.0)) + uSunColour * (uSunDir.y * 0.2)) / 3.14159 * (0.75 - 0.25 * n.y) * vMix.y;
  // Only standing water holds a mirror, and the water takes most of the light of what it shows.
  float water = smoothstep(0.0, 0.03, uPool - land.r) * smoothstep(-0.02, 0.05, vUnder);
  float glance = 1.0 - max(v.y, 0.0);
  float keep = water * mix(0.3, 0.72, pow(glance, 3.0)) * exp(-0.45 * vUnder) * (1.0 - uSolo);
  gl_FragColor = vec4(rigOut(col * 0.62) * keep, keep);
#else
  // The shade the animal lays on the ground under it (the contact map) is not laid on the animal: taken back out of the sky's light here.
  vec4 before = landAt(vWorld.xz + n.xz * 14.0);
  float own = 1.0 / max(1.0 - contactDrawn(vWorld) * smoothstep(4.0, 0.0, vWorld.y - before.r), 0.3);
  vec3 col = rigShade(vWorld, n, v, albedo, mix(0.62, 0.22, wet), occ * own);
  float sun = sunAt(vWorld, land);
  col -= albedo * uSunColour * (max(dot(n, uSunDir), 0.0) * sunAt(vWorld, before) * occ * (own - 1.0)) / 3.14159;
  // The wet flat and the sea send the sky back up at what flies over them.
  col += albedo * (skyIrradiance(vec3(0.0, 1.0, 0.0)) + uSunColour * (uSunDir.y * 0.2)) / 3.14159 * (0.75 - 0.25 * n.y) * vMix.y * (1.0 - 0.3 * sail);
  // The sun behind a sail comes through its skin warm, and the sky behind it a little and pale.
  col += through * (vec3(1.0, 0.56, 0.27) * uSunColour * (sun * 0.62 * max(dot(-n0, uSunDir), 0.0)) + vec3(0.72, 0.6, 0.5) * skyIrradiance(-n0) * 0.16) / 3.14159;
  // Against the light the sun rims it.
  float rim = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 3.0);
  col += (albedo * 0.6 + 0.04) * uSunColour * rim * (0.25 + 0.75 * pow(max(dot(-v, uSunDir), 0.0), 2.0)) * 0.3 * sun * (1.0 - 0.6 * sail) * mix(0.2, 1.0, max(hide, sail));
  // And the low sun wraps a little way round what it lights: the edge turned to it is warm.
  col += albedo * uSunColour * (pow(clamp(dot(n, uSunDir) + 0.45, 0.0, 1.0), 2.0) * (0.12 + 0.5 * rim) * sun * vMix.y * (1.0 - sail)) / 3.14159;
  float far = smoothstep(30.0, 110.0, distance(cameraPosition, vWorld));
  col *= 1.0 - 0.4 * far;
  gl_FragColor = vec4(rigOut(col), 1.0);
#endif
}`;

/** The surface of the fliers, and the same turned over on standing water. */
export function flierMaterials(ctx: Context, pool: number): BodyMaterials {
  const uniforms = { ...ctx.rig.uniforms, uPool: { value: pool } };
  const body = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms, side: THREE.DoubleSide });
  const mirror = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms, defines: { MIRROR: 1 }, side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor });
  return { body, mirror };
}

export interface Flying {
  /** The middle of the shoulders, in the place. */
  x: number;
  y: number;
  z: number;
  /** The heading (0 along z), the nose up, the bank (to its right). */
  yaw: number;
  pitch: number;
  roll: number;
  size: number;
  tone: number;
  /** Where the stroke is (radians, the sails level and going down at 0) and how deep it is (0 a glide, 1 full). */
  stroke: number;
  deep: number;
  /** How far the sails are drawn in (0 spread, 1 half folded): a stoop, or a landing's last beat. */
  drawn: number;
  /** The legs let down (0 trailed, 1 hanging). */
  legs: number;
  /** How far the neck is folded back on itself (0 stretched ahead, 1 the head drawn back to the shoulders). */
  neck: number;
}
export const flying = (): Flying => ({ x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, size: 1, tone: 1, stroke: 0, deep: 1, drawn: 0, legs: 0, neck: 0.45 });

const RING_COS = Float32Array.from({ length: SIDES }, (_, k) => Math.cos((k / SIDES) * Math.PI * 2));
const RING_SIN = Float32Array.from({ length: SIDES }, (_, k) => Math.sin((k / SIDES) * Math.PI * 2));

/** Many fliers, each set anew from a pose. */
export class Flight {
  readonly mesh: THREE.Mesh;
  /** The same bodies turned over on standing water, for those that fly low over a wet flat. */
  readonly mirror: THREE.Mesh | null;
  private readonly at: Float32Array;
  private readonly way: Float32Array;
  private readonly mix: Float32Array;
  private readonly attributes: THREE.BufferAttribute[];

  constructor(materials: BodyMaterials, readonly count: number, mirrored = false) {
    const total = count * VERTS;
    this.at = new Float32Array(total * 3);
    this.way = new Float32Array(total * 3);
    this.mix = new Float32Array(total * 3);
    const px = new Float32Array(total * 2);
    const index: number[] = [];
    const set = (v: number, a: number, b: number, kind: number, occ: number): void => {
      px[v * 2] = a;
      px[v * 2 + 1] = b;
      this.mix[v * 3] = kind;
      // In the open air all the sky lights it: more of the sky's light than one that stands on the ground under a rock takes.
      this.mix[v * 3 + 1] = occ * 1.25;
      this.mix[v * 3 + 2] = 1;
    };
    const tube = (v0: number, rings: number, sides: number): void => {
      for (let r = 0; r + 1 < rings; r++) {
        for (let k = 0; k < sides; k++) {
          const p = v0 + r * sides + k;
          const q = v0 + r * sides + ((k + 1) % sides);
          index.push(p, q, p + sides, q, q + sides, p + sides);
        }
      }
    };
    for (let i = 0; i < count; i++) {
      const v0 = i * VERTS;
      for (let side = 0; side < 2; side++) {
        const w0 = v0 + side * (WING_VERTS + BONE_VERTS);
        for (let k = 0; k < OUT.length; k++) {
          for (let j = 0; j < ROWS; j++) set(w0 + k * ROWS + j, OUT[k] as number, j / (ROWS - 1), 2, 1);
          if (k + 1 < OUT.length) {
            for (let j = 0; j + 1 < ROWS; j++) {
              const a = w0 + k * ROWS + j;
              index.push(a, a + ROWS, a + 1, a + 1, a + ROWS, a + ROWS + 1);
            }
          }
          for (let s = 0; s < BONE_SIDES; s++) set(w0 + WING_VERTS + k * BONE_SIDES + s, k, s, 0, 1);
        }
        tube(w0 + WING_VERTS, OUT.length, BONE_SIDES);
      }
      const b0 = v0 + 2 * (WING_VERTS + BONE_VERTS);
      for (let r = 0; r < SPINE_RINGS; r++) {
        // The trunk carries its own length for the ribs; the neck and head go on from it, and the beak ends in horn.
        const ahead = r < TRUNK.length ? (TRUNK[r] as [number, number, number, number])[0] : 0.34 + 0.16 * (r - TRUNK.length + 1);
        for (let k = 0; k < SIDES; k++) set(b0 + r * SIDES + k, ahead, (k / SIDES) * Math.PI * 2, r >= SPINE_RINGS - 2 ? (r === SPINE_RINGS - 1 ? 0 : 0.5) : 1, 1 - 0.2 * smooth(0.1, 1, -(RING_COS[k] as number)));
      }
      tube(b0, SPINE_RINGS, SIDES);
      for (let leg = 0; leg < 2; leg++) {
        const l0 = b0 + SPINE_VERTS + leg * LEG_VERTS;
        for (let r = 0; r < LEG_RADIUS.length; r++) for (let k = 0; k < LEG_SIDES; k++) set(l0 + r * LEG_SIDES + k, r, k, r === 0 ? 0.8 : 0.25, 0.9);
        tube(l0, LEG_RADIUS.length, LEG_SIDES);
      }
      this.hide(i);
    }
    const geometry = new THREE.BufferGeometry();
    const attribute = (name: string, data: Float32Array, size: number, moves: boolean): THREE.BufferAttribute => {
      const a = new THREE.BufferAttribute(data, size);
      if (moves) a.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute(name, a);
      return a;
    };
    this.attributes = [attribute('position', this.at, 3, true), attribute('normal', this.way, 3, true), attribute('aMix', this.mix, 3, true)];
    attribute('aPx', px, 2, false);
    geometry.setIndex(index);
    this.mesh = new THREE.Mesh(geometry, materials.body);
    this.mesh.frustumCulled = false;
    this.mirror = mirrored ? new THREE.Mesh(geometry, materials.mirror) : null;
    if (this.mirror) {
      this.mirror.frustumCulled = false;
      this.mirror.renderOrder = 3;
    }
  }

  /** Only the first `many` of them are drawn from here on: those after them cost nothing. */
  draw(many: number): void {
    const each = (this.mesh.geometry.index?.count ?? 0) / this.count;
    this.mesh.geometry.setDrawRange(0, Math.min(this.count, Math.max(0, many)) * each);
  }

  hide(i: number): void {
    const from = i * VERTS * 3;
    this.at.fill(0, from, from + VERTS * 3);
    for (let v = 0; v < VERTS; v++) this.at[from + v * 3 + 1] = -500;
  }

  put(i: number, p: Flying): void {
    if (p.size <= 0) {
      this.hide(i);
      return;
    }
    const v0 = i * VERTS;
    const at = this.at;
    const way = this.way;
    const sy = Math.sin(p.yaw);
    const cy = Math.cos(p.yaw);
    const sp = Math.sin(p.pitch);
    const cp = Math.cos(p.pitch);
    const sr = Math.sin(p.roll);
    const cr = Math.cos(p.roll);
    // Ahead, up and left of the body in the place: nose up by the pitch, then banked to its right about the way ahead.
    const fx = sy * cp;
    const fy = sp;
    const fz = cy * cp;
    const u0x = -sy * sp;
    const u0y = cp;
    const u0z = -cy * sp;
    const l0x = -cy;
    const l0z = sy;
    const ux = u0x * cr - l0x * sr;
    const uy = u0y * cr;
    const uz = u0z * cr - l0z * sr;
    const lx = l0x * cr + u0x * sr;
    const ly = u0y * sr;
    const lz = l0z * cr + u0z * sr;
    const size = p.size;
    // The body rides up on the down stroke and sinks on the up stroke.
    const ride = 0.1 * p.deep * Math.sin(p.stroke - 1.2) * size;
    const ox = p.x + ux * ride;
    const oy = p.y + uy * ride;
    const oz = p.z + uz * ride;
    const out = (n: number, a: number, b: number, c: number): void => {
      at[n] = ox + (fx * a + ux * b + lx * c) * size;
      at[n + 1] = oy + (fy * a + uy * b + ly * c) * size;
      at[n + 2] = oz + (fz * a + uz * b + lz * c) * size;
    };
    const turn = (n: number, a: number, b: number, c: number): void => {
      way[n] = fx * a + ux * b + lx * c;
      way[n + 1] = fy * a + uy * b + ly * c;
      way[n + 2] = fz * a + uz * b + lz * c;
    };
    // The stroke: the arm goes down faster than it comes up, the hand follows it a quarter of a beat late, and on the way up the hand is
    // drawn in so that the sail spills the air it would have to lift.
    const s = p.stroke;
    // Gliding, the arm is held up and the hand hangs from the wrist.
    const glide = (1 - p.deep) * (1 - p.drawn);
    const arm = 0.26 + 0.14 * glide + p.deep * (0.56 * Math.cos(s + 0.25 * Math.sin(s)) - 0.06) - 0.5 * p.drawn;
    // The hand always hangs a little from the wrist: seen from ahead the sail is bent, never a straight line.
    const hand = arm - (0.24 + 0.36 * glide) * (1 - p.drawn) + p.deep * 0.4 * Math.cos(s - 1.15) - 0.25 * p.drawn;
    const rising = Math.max(0, -Math.sin(s - 0.5));
    const fold = 1 - 0.22 * p.deep * rising - 0.45 * p.drawn;
    const reach = 1 - 0.2 * p.drawn;
    const wrist = WRIST_OUT / PX;
    const tip = TIP_OUT / PX;
    const ca = Math.cos(arm);
    const sa = Math.sin(arm);
    const ch = Math.cos(hand);
    const sh = Math.sin(hand);
    for (let side = 0; side < 2; side++) {
      const sign = side === 0 ? 1 : -1;
      let n = (v0 + side * (WING_VERTS + BONE_VERTS)) * 3;
      let m = n + WING_VERTS * 3;
      for (let k = 0; k < OUT.length; k++) {
        const q = (OUT[k] as number) / PX;
        const front = FRONTS[k] as number;
        const back = BACKS[k] as number;
        const far = k <= WRIST ? q * reach : wrist * reach + (q - wrist) * fold * HAND;
        const side0 = k <= WRIST ? q * reach * ca : wrist * reach * ca + (q - wrist) * fold * HAND * ch;
        const up0 = k <= WRIST ? q * reach * sa : wrist * reach * sa + (q - wrist) * fold * HAND * sh;
        const c = k < WRIST ? ca : k === WRIST ? Math.cos(0.5 * (arm + hand)) : ch;
        const sn = k < WRIST ? sa : k === WRIST ? Math.sin(0.5 * (arm + hand)) : sh;
        const swung = (k > WRIST ? (q - wrist) * (1 - fold) * 0.9 : 0) + 0.25 * p.drawn * far;
        for (let j = 0; j < ROWS; j++) {
          const along = 0.5 * (front + back) + (back - front) * CHORD * (j / (ROWS - 1) - 0.5);
          // Drawn in, the hand swings back as well as in; and the skin bellies up between its front and back edges.
          const ahead = (along - SWEEP * (OUT[k] as number)) / PX - swung;
          const belly = 0.09 * Math.sin((Math.PI * j) / (ROWS - 1)) * (1 - 0.6 * p.drawn);
          out(n, ahead, up0 + belly * c + 0.02, sign * (0.08 + side0 - belly * sn));
          turn(n, 0, c, -sign * sn);
          n += 3;
        }
        // The bone the skin hangs from: stout at the shoulder, a knuckle at the wrist, and thin to the tip.
        const bone = k <= WRIST ? 0.05 + 0.012 * (k === WRIST ? 1 : 0) : 0.012 + 0.04 * (1 - (q - wrist) / (tip - wrist));
        const lead = (0.5 * (front + back) - (back - front) * CHORD * 0.5 - SWEEP * (OUT[k] as number)) / PX - swung - 0.4 * bone;
        for (let s = 0; s < BONE_SIDES; s++) {
          const a = (s / BONE_SIDES) * Math.PI * 2;
          const ba = Math.cos(a);
          const bn = Math.sin(a);
          out(m, lead + ba * bone, up0 + 0.02 + bn * bone * c, sign * (0.08 + side0 - bn * bone * sn));
          turn(m, ba, bn * c, -sign * bn * sn);
          m += 3;
        }
      }
    }
    let n = (v0 + 2 * (WING_VERTS + BONE_VERTS)) * 3;
    // With its legs down it carries its neck up and its head level, as one that stands; in the air the neck lies ahead, folded into an S
    // by as much as the pose says, so that back, neck and legs are not one rod.
    const down = smooth(0, 1, p.legs);
    const lift = 0.16 + 0.7 * down;
    const bend = 1.5 * Math.min(1, Math.max(0, p.neck)) * (1 - 0.5 * down);
    const ring = (ahead: number, up: number, lean: number, radius: number, keel: number): void => {
      const cl = Math.cos(lean);
      const sl = Math.sin(lean);
      for (let k = 0; k < SIDES; k++) {
        const c = RING_COS[k] as number;
        const sn = RING_SIN[k] as number;
        // Under it the trunk is drawn down to the keel of the breast.
        const deep = c < 0 ? 0.85 + keel * c * c * -c : 0.85;
        out(n, ahead - c * radius * deep * sl, up + c * radius * deep * cl, sn * radius);
        const flat = c < 0 ? 1 - 0.55 * keel : 1;
        turn(n, -c * flat * sl, c * flat * cl, sn);
        n += 3;
      }
    };
    for (const t of TRUNK) ring(t[0], t[1], 0, t[2], t[3]);
    const root = TRUNK[TRUNK.length - 1] as [number, number, number, number];
    let nx = root[0];
    let ny = root[1];
    let lean = lift;
    const STEPS = 4;
    for (let r = 0; r < NECK_RINGS; r++) {
      for (let s = 0; s < STEPS; s++) {
        const u = (r + (s + 0.5) / STEPS) / NECK_RINGS;
        lean = lift + bend * Math.sin(Math.PI * 2 * u);
        nx += (Math.cos(lean) * NECK_LONG) / (NECK_RINGS * STEPS);
        ny += (Math.sin(lean) * NECK_LONG) / (NECK_RINGS * STEPS);
      }
      ring(nx, ny, lean, 0.088 - 0.006 * r, 0);
    }
    // The head rides level on the end of the neck, the beak a little down.
    const level = lift * 0.6 - 0.12 - 0.1 * bend;
    for (const s of SKULL) ring(nx + Math.cos(level) * s[0], ny + Math.sin(level) * s[0], level, s[1], 0);
    for (let leg = 0; leg < 2; leg++) {
      const sign = leg === 0 ? 1 : -1;
      for (let r = 0; r < LEG_RADIUS.length; r++) {
        const radius = LEG_RADIUS[r] as number;
        const [ax, ay] = legAt(r, p.legs);
        for (let k = 0; k < LEG_SIDES; k++) {
          const a = (k / LEG_SIDES) * Math.PI * 2;
          const c = Math.cos(a);
          const sn = Math.sin(a);
          out(n, ax, ay + c * radius, sign * (0.11 + 0.012 * r) + sn * radius);
          turn(n, 0, c, sn);
          n += 3;
        }
      }
    }
    for (let v = 0; v < VERTS; v++) this.mix[(v0 + v) * 3 + 2] = p.tone;
  }

  commit(): void {
    for (const a of this.attributes) a.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
  }
}
