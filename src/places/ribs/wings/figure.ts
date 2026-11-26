// A kite-wing as one of the Builder's pictures of it: a sheet of the picture stood in the place, lit by the rig from the picture's own relief,
// and bent in the vertex shader about a few joints so that it lives. One sheet holds one figure or a grid of them; each is a cell.
import * as THREE from 'three';
import { RIG_GLSL } from '../shared/glsl';
import type { Context } from '../shared/context';

/** A joint: pixels past the two lines through `pivot` turn about it. A line is [x, y, offset]: its direction and how far along it the turn begins. */
export interface Limb {
  pivot: [number, number];
  d1: [number, number, number];
  d2?: [number, number, number];
}
export interface Cell {
  rect: [number, number, number, number];
  /** The pixel that stands on the ground, or the middle of a body in the air. */
  foot: [number, number];
  limbs?: Limb[];
  /** Sails seen flat: pixels further than `dead` from the line through `pivot` across `n` are drawn in toward it by the stroke. */
  stretch?: { pivot: [number, number]; n: [number, number]; dead: number; both: boolean };
}
export interface Sheet {
  name: string;
  w: number;
  h: number;
  /** Pixels to a metre at size 1. */
  unit: number;
  cells: Cell[];
}

const CELLS = 6;
const LIMBS = 3;
const SOFTEN = 40;

const cell3 = (c: number): [number, number, number, number] => [(c % 3) * 512, Math.floor(c / 3) * 512, (c % 3) * 512 + 512, Math.floor(c / 3) * 512 + 512];
const cell2 = (c: number): [number, number, number, number] => [(c % 2) * 768, Math.floor(c / 2) * 512, (c % 2) * 768 + 768, Math.floor(c / 2) * 512 + 512];

/** Feeding, the tuft in the water: the neck turns at the shoulder, the strands at its end sway. */
export const FEEDER_A: Sheet = {
  name: 'feeder-a',
  w: 1536,
  h: 1024,
  unit: 245,
  cells: [{ rect: [0, 0, 1536, 1024], foot: [500, 897], limbs: [{ pivot: [770, 270], d1: [1, 0, 20] }, { pivot: [1130, 560], d1: [0, 1, 40], d2: [1, 0, -200] }] }],
};
/** Mid step, the neck out ahead, shaking the water from its tuft: the neck, the lifted leg, the tuft. */
export const FEEDER_B: Sheet = {
  name: 'feeder-b',
  w: 1536,
  h: 1024,
  unit: 245,
  cells: [{ rect: [0, 0, 1536, 1024], foot: [450, 947], limbs: [{ pivot: [750, 215], d1: [1, 0, 20] }, { pivot: [520, 430], d1: [1, -0.2, -10], d2: [0, 1, 60] }, { pivot: [1000, 200], d1: [1, 0, 30] }] }],
};
/** Running with the sails up: the sails, the hind leg, the fore leg. */
export const FEEDER_C: Sheet = {
  name: 'feeder-c',
  w: 1536,
  h: 1024,
  unit: 320,
  cells: [{ rect: [0, 0, 1536, 1024], foot: [700, 950], limbs: [{ pivot: [850, 250], d1: [-1, 0, 10], d2: [-0.33, -0.94, 0] }, { pivot: [790, 470], d1: [-1, 0, 40], d2: [0, 1, 0] }, { pivot: [850, 470], d1: [1, 0, 20], d2: [0, 1, 10] }] }],
};
/** Six on a ledge: crouched, standing, one sail out, both sails open, preening, hunched. Where one has a neck to turn, it turns. */
export const PERCHED: Sheet = {
  name: 'perched',
  w: 1536,
  h: 1024,
  unit: 80,
  cells: [
    { rect: cell3(0), foot: [200, 415], limbs: [{ pivot: [300, 290], d1: [0, -1, 0], d2: [1, 0, -60] }] },
    { rect: cell3(1), foot: [745, 438], limbs: [{ pivot: [790, 150], d1: [0, -1, 0] }] },
    { rect: cell3(2), foot: [1165, 440], limbs: [{ pivot: [1215, 150], d1: [0, -1, 0], d2: [-1, 0, -120] }, { pivot: [1250, 190], d1: [1, 0, 30] }] },
    { rect: cell3(3), foot: [250, 960], limbs: [{ pivot: [290, 560], d1: [0, -1, 0] }, { pivot: [200, 640], d1: [-1, 0, 20], d2: [0, -1, -160] }, { pivot: [300, 660], d1: [1, 0, 30], d2: [0, -1, -160] }] },
    { rect: cell3(4), foot: [740, 965] },
    { rect: cell3(5), foot: [1215, 965] },
  ],
};
/** Four in the air: from the side with the sails up, from above and behind, from over its back, from ahead with the legs down. */
export const FLIERS: Sheet = {
  name: 'fliers',
  w: 1536,
  h: 1024,
  unit: 105,
  cells: [
    { rect: cell2(0), foot: [520, 290], stretch: { pivot: [520, 290], n: [-0.27, -0.96], dead: 22, both: false } },
    { rect: cell2(1), foot: [1130, 290], stretch: { pivot: [1130, 290], n: [0.2, 0.98], dead: 25, both: false } },
    { rect: cell2(2), foot: [410, 760], stretch: { pivot: [410, 760], n: [0.82, 0.57], dead: 25, both: true } },
    { rect: cell2(3), foot: [1190, 740], stretch: { pivot: [1190, 740], n: [1, 0.1], dead: 45, both: true } },
  ],
};

const VERTEX = /* glsl */ `
attribute vec4 aPlace;
attribute vec4 aLook;
attribute vec4 aLimb;
attribute vec4 aMove;
uniform vec4 uRect[${CELLS}];
uniform vec2 uFoot[${CELLS}];
uniform vec2 uPivot[${CELLS * LIMBS}];
uniform vec3 uD1[${CELLS * LIMBS}];
uniform vec3 uD2[${CELLS * LIMBS}];
uniform vec4 uStretch[${CELLS}];
uniform vec2 uStretchK[${CELLS}];
uniform float uUnit;
uniform float uPool;
#ifdef SHADE
uniform vec3 uSunDir;
#endif
varying vec3 vWorld;
varying vec2 vPx;
varying vec3 vAcross;
varying vec3 vUp;
varying vec3 vFace;
varying vec4 vLook;
varying vec2 vBlur;
varying float vUnder;
vec2 turned(vec2 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}
void main() {
  int c = int(aLook.y + 0.5);
  vec4 rect = uRect[c];
  vec2 px = mix(rect.xy, rect.zw, position.xy);
  vPx = px;
  for (int l = 0; l < ${LIMBS}; l++) {
    int k = c * ${LIMBS} + l;
    vec2 rel = px - uPivot[k];
    float w = smoothstep(uD1[k].z, uD1[k].z + ${SOFTEN.toFixed(1)}, dot(rel, uD1[k].xy)) * smoothstep(uD2[k].z, uD2[k].z + ${SOFTEN.toFixed(1)}, dot(rel, uD2[k].xy));
    px = uPivot[k] + turned(rel, (l == 0 ? aLimb.x : l == 1 ? aLimb.y : aLimb.z) * w);
  }
  {
    vec2 n = uStretch[c].zw;
    float d = dot(px - uStretch[c].xy, n);
    float far = max(abs(d) - uStretchK[c].x, 0.0) * (d < 0.0 ? -uStretchK[c].y : 1.0);
    px += n * far * (aLimb.w - 1.0);
  }
  vec2 q = vec2(px.x - uFoot[c].x, uFoot[c].y - px.y) * aLook.x / uUnit;
  vec3 at = aPlace.xyz;
#ifdef BILLBOARD
  // In the air it is turned to the lens, headed left or right across it, and banked.
  q = turned(q, aMove.z);
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]) * aPlace.w;
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 w = at + right * q.x + up * q.y;
  vAcross = right;
  vUp = up;
  vFace = normalize(cameraPosition - at);
#else
  // It sways on its feet. The sheet keeps its heading unless that would show the lens its edge.
  q.x += aMove.w * q.y;
  vec2 h = vec2(sin(aPlace.w), cos(aPlace.w));
  vec2 away = normalize(at.xz - cameraPosition.xz);
  vec2 side = vec2(-away.y, away.x);
  float k = dot(h, side);
  float sgn = k < 0.0 ? -1.0 : 1.0;
  vec2 f = normalize(side * sgn * max(abs(k), 0.7) + away * dot(h, away));
  vec3 w = at + vec3(f.x * q.x, q.y, f.y * q.x);
  vAcross = vec3(f.x, 0.0, f.y);
  vUp = vec3(0.0, 1.0, 0.0);
  vFace = vec3(-f.y, 0.0, f.x) * sgn;
#endif
  vUnder = 0.0;
#ifdef MIRROR
  // The mirror: the animal turned over about the water, laid on the water where the lens would see it.
  float y = 2.0 * uPool - w.y;
  float m = (cameraPosition.y - uPool - 0.012) / max(cameraPosition.y - y, 1e-3);
  vUnder = w.y - uPool;
  w = vec3(cameraPosition.xz + (w.xz - cameraPosition.xz) * m, uPool + 0.012).xzy;
#endif
#ifdef SHADE
  // Its shade: the same outline a little larger than itself and just behind it, so the rock round it is darker where it hides the sky.
  vec3 ray = normalize(w - cameraPosition);
  vec3 fall = -uSunDir - ray * dot(-uSunDir, ray);
  w = at + (w - at) * 1.14 + normalize(fall + vec3(0.0, -0.05, 0.0)) * 0.1 * aLook.x + ray * 0.12;
#endif
  vWorld = w;
  vLook = aLook;
  vBlur = aMove.xy;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
${RIG_GLSL}
uniform sampler2D tPic;
uniform sampler2D tCover;
uniform sampler2D tRelief;
uniform vec2 uSize;
uniform float uPool;
uniform float uGrey;
varying vec3 vWorld;
varying vec2 vPx;
varying vec3 vAcross;
varying vec3 vUp;
varying vec3 vFace;
varying vec4 vLook;
varying vec2 vBlur;
varying float vUnder;
void main() {
  vec2 uv = vec2(vPx.x / uSize.x, 1.0 - vPx.y / uSize.y);
#ifdef SOFT
  // What moves fast across the lens is drawn along its way: five readings of the picture down the line it travels in the open shutter.
  vec2 along = vec2(vBlur.x, -vBlur.y) / uSize;
  float wide = log2(max(length(vBlur) * 0.25, 1.0));
  vec3 pic = vec3(0.0);
  float cover = 0.0;
  for (int i = 0; i < 5; i++) {
    vec2 at = uv + along * (float(i) - 2.0) * 0.25;
    cover += texture2D(tCover, at, wide).r;
    pic += texture2D(tPic, at, wide).rgb;
  }
  pic /= max(cover, 0.06);
  cover /= 5.0;
#else
  float cover = texture2D(tCover, uv).r;
  // The picture stands on black: far off, where a pixel holds both, the black is taken back out.
  vec3 pic = texture2D(tPic, uv).rgb / max(cover, 0.4);
#endif
  vec2 e = 2.5 / uSize;
  float hx = texture2D(tRelief, uv + vec2(e.x, 0.0)).r - texture2D(tRelief, uv - vec2(e.x, 0.0)).r;
  float hy = texture2D(tRelief, uv + vec2(0.0, e.y)).r - texture2D(tRelief, uv - vec2(0.0, e.y)).r;
  // The round of the body, from the cover read soft.
  float gx = texture2D(tCover, uv + vec2(e.x * 3.0, 0.0), 3.0).r - texture2D(tCover, uv - vec2(e.x * 3.0, 0.0), 3.0).r;
  float gy = texture2D(tCover, uv + vec2(0.0, e.y * 3.0), 3.0).r - texture2D(tCover, uv - vec2(0.0, e.y * 3.0), 3.0).r;
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 face = dot(vFace, v) < 0.0 ? -vFace : vFace;
  vec3 n = normalize(face - vAcross * (hx * 0.9 + gx * 1.3) - vUp * (hy * 0.9 + gy * 1.3));
  // Where the picture is amber it is the skin of a sail, and light comes through it.
  float skin = smoothstep(0.4, 0.62, (pic.r - pic.b) / max(pic.r, 0.05));
  vec3 albedo = pow(pic, vec3(0.92)) * vLook.z;
  albedo = mix(albedo, vec3(dot(albedo, vec3(0.3333))) * vec3(1.02, 0.98, 0.93), uGrey * (1.0 - skin * (1.0 - uGrey)));
  // Wet where it stands in the pool.
  float wet = 1.0 - smoothstep(uPool + 0.03, uPool + 0.4, vWorld.y);
  albedo *= 1.0 - 0.4 * wet;
  float occ = mix(0.5, 1.0, smoothstep(-0.6, 0.4, n.y));
  vec4 land = landAt(vWorld.xz);
  float soft = texture2D(tCover, uv, 3.5).r;
#if defined(SHADE)
  float dim = 0.62 * smoothstep(0.05, 0.6, soft) * (1.0 - uSolo);
  gl_FragColor = vec4(rigOut(vec3(0.0)) * dim, dim);
#elif defined(MIRROR)
  vec3 up = vWorld + vec3(0.0, 2.0 * vUnder, 0.0);
  vec3 col = rigShade(up, n, v, albedo, 0.6, occ);
  // Only standing water holds a mirror, and the water takes most of the light of what it shows.
  float water = smoothstep(0.0, 0.03, uPool - land.r) * smoothstep(-0.02, 0.05, vUnder);
  float glance = 1.0 - max(v.y, 0.0);
  // The higher a thing stands the more the ripples between take of it.
  float keep = water * step(0.5, cover) * mix(0.3, 0.72, pow(glance, 3.0)) * exp(-0.45 * vUnder) * (1.0 - uSolo);
  gl_FragColor = vec4(rigOut(col * 0.62) * keep, keep);
#else
  vec3 col = rigShade(vWorld, n, v, albedo, mix(0.6, 0.25, wet), occ);
  float sun = sunAt(vWorld, land);
  col += albedo * skin * vec3(1.0, 0.82, 0.62) * (uSunColour * sun * 0.45 + skyIrradiance(-face) * 0.7) / 3.14159;
  // Against the light the sun rims it.
  float rim = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 3.0);
  col += (albedo * 0.6 + 0.04) * uSunColour * rim * pow(max(dot(-v, uSunDir), 0.0), 2.0) * 0.16 * sun;
  // One that stands in the shade of the rock over it.
  col *= 1.0 - 0.6 * vLook.w;
#ifdef SOFT
  float a = smoothstep(0.1, 0.6, cover) * (1.0 - uSolo);
  gl_FragColor = vec4(rigOut(col) * a, a);
  if (a < 0.04) discard;
#else
  gl_FragColor = vec4(rigOut(col), 1.0);
  if (cover < 0.5) discard;
#endif
#endif
}`;

export interface FigureMaterials {
  body: THREE.ShaderMaterial;
  mirror: THREE.ShaderMaterial;
  shade: THREE.ShaderMaterial;
  sheet: Sheet;
}

/** The materials of one sheet. `grey` takes the picture's colour toward the grey of weathered hide; `air` turns it to the lens and draws it soft along its way. */
export function figureMaterials(ctx: Context, sheet: Sheet, pool: number, grey = 0.15, air = false): FigureMaterials {
  const far: [number, number, number] = [0, 0, 1e6];
  const all: [number, number, number] = [0, 0, -1e6];
  const cells = Array.from({ length: CELLS }, (_, i) => sheet.cells[Math.min(i, sheet.cells.length - 1)] as Cell);
  const limbs = cells.flatMap((c) => Array.from({ length: LIMBS }, (_, l) => c.limbs?.[l]));
  const uniforms = {
    ...ctx.rig.uniforms,
    tPic: { value: ctx.assets.texture(`mat/${sheet.name}.jpg`, { kind: 'colour', repeat: false }) },
    tCover: { value: ctx.assets.texture(`mat/${sheet.name}-a.png`, { kind: 'data', repeat: false }) },
    tRelief: { value: ctx.assets.texture(`mat/${sheet.name}-h.png`, { kind: 'data', repeat: false }) },
    uSize: { value: new THREE.Vector2(sheet.w, sheet.h) },
    uUnit: { value: sheet.unit },
    uPool: { value: pool },
    uGrey: { value: grey },
    uRect: { value: cells.map((c) => new THREE.Vector4(...c.rect)) },
    uFoot: { value: cells.map((c) => new THREE.Vector2(...c.foot)) },
    uPivot: { value: limbs.map((l) => new THREE.Vector2(...(l?.pivot ?? [0, 0]))) },
    uD1: { value: limbs.map((l) => new THREE.Vector3(...(l?.d1 ?? far))) },
    uD2: { value: limbs.map((l) => new THREE.Vector3(...(l?.d2 ?? all))) },
    uStretch: { value: cells.map((c) => new THREE.Vector4(...(c.stretch?.pivot ?? [0, 0]), ...(c.stretch?.n ?? [1, 0]))) },
    uStretchK: { value: cells.map((c) => new THREE.Vector2(c.stretch?.dead ?? 1e6, c.stretch?.both ? 1 : 0)) },
  };
  const defines: Record<string, number> = air ? { BILLBOARD: 1, SOFT: 1 } : {};
  const blended = { transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor };
  const body = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms, defines, side: THREE.DoubleSide, ...(air ? { ...blended, depthWrite: true } : {}) });
  const mirror = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms, defines: { MIRROR: 1 }, side: THREE.DoubleSide, ...blended });
  const shade = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms, defines: { SHADE: 1 }, side: THREE.DoubleSide, ...blended });
  return { body, mirror, shade, sheet };
}

/** Where a pixel of a cell goes when its joints are turned: metres ahead of the foot and over it, at size 1. */
export function figurePoint(sheet: Sheet, cell: number, px: [number, number], angles: number[]): [number, number] {
  const c = sheet.cells[cell] as Cell;
  let [x, y] = px;
  (c.limbs ?? []).forEach((l, i) => {
    const rx = x - l.pivot[0];
    const ry = y - l.pivot[1];
    const ss = (d: [number, number, number]): number => {
      const t = Math.min(1, Math.max(0, (rx * d[0] + ry * d[1] - d[2]) / SOFTEN));
      return t * t * (3 - 2 * t);
    };
    const a = (angles[i] ?? 0) * ss(l.d1) * (l.d2 ? ss(l.d2) : 1);
    x = l.pivot[0] + Math.cos(a) * rx - Math.sin(a) * ry;
    y = l.pivot[1] + Math.sin(a) * rx + Math.cos(a) * ry;
  });
  return [(x - c.foot[0]) / sheet.unit, (c.foot[1] - y) / sheet.unit];
}

export interface Placed {
  x: number;
  y: number;
  z: number;
  /** On the ground the heading, radians; in the air 1 headed to the right of the lens and -1 to its left. */
  turn: number;
  size: number;
  cell: number;
  tone: number;
  shade: number;
  limbs: [number, number, number];
  stroke: number;
  blur: [number, number];
  roll: number;
  sway: number;
}
export const placed = (): Placed => ({ x: 0, y: 0, z: 0, turn: 0, size: 1, cell: 0, tone: 1, shade: 0, limbs: [0, 0, 0], stroke: 1, blur: [0, 0], roll: 0, sway: 0 });

/** Many figures of one sheet, each set anew from the time alone. */
export class Figures {
  readonly mesh: THREE.Mesh;
  readonly mirror: THREE.Mesh | undefined;
  readonly shade: THREE.Mesh | undefined;
  private readonly place: THREE.InstancedBufferAttribute;
  private readonly look: THREE.InstancedBufferAttribute;
  private readonly limb: THREE.InstancedBufferAttribute;
  private readonly move: THREE.InstancedBufferAttribute;

  constructor(materials: FigureMaterials, readonly count: number, extras: { mirror?: boolean; shade?: boolean } = {}, across = 30, down = 22) {
    const shape = new THREE.PlaneGeometry(1, 1, across, down);
    shape.translate(0.5, 0.5, 0);
    // The plane's rows run up; a picture's run down.
    const at = shape.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < at.count; i++) at.setY(i, 1 - at.getY(i));
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setAttribute('position', at);
    geometry.setIndex(shape.getIndex());
    geometry.instanceCount = count;
    const attribute = (name: string): THREE.InstancedBufferAttribute => {
      const a = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
      a.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute(name, a);
      return a;
    };
    this.place = attribute('aPlace');
    this.look = attribute('aLook');
    this.limb = attribute('aLimb');
    this.move = attribute('aMove');
    this.mesh = new THREE.Mesh(geometry, materials.body);
    this.mesh.frustumCulled = false;
    if (materials.body.transparent) this.mesh.renderOrder = 4;
    if (extras.mirror) {
      this.mirror = new THREE.Mesh(geometry, materials.mirror);
      this.mirror.frustumCulled = false;
      this.mirror.renderOrder = 3;
    }
    if (extras.shade) {
      this.shade = new THREE.Mesh(geometry, materials.shade);
      this.shade.frustumCulled = false;
      this.shade.renderOrder = 1;
    }
    for (let i = 0; i < count; i++) this.hide(i);
  }

  put(i: number, p: Placed): void {
    this.place.setXYZW(i, p.x, p.y, p.z, p.turn);
    this.look.setXYZW(i, p.size, p.cell, p.tone, p.shade);
    this.limb.setXYZW(i, p.limbs[0], p.limbs[1], p.limbs[2], p.stroke);
    this.move.setXYZW(i, p.blur[0], p.blur[1], p.roll, p.sway);
  }

  hide(i: number): void {
    this.place.setXYZW(i, 0, -500, 0, 0);
    this.look.setXYZW(i, 0, 0, 0, 0);
  }

  commit(): void {
    this.place.needsUpdate = true;
    this.look.needsUpdate = true;
    this.limb.needsUpdate = true;
    this.move.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
  }
}
