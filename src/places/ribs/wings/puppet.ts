// A standing kite-wing as a picture: the side view of the animal on a sheet cut into body, two legs and neck, bent in the vertex shader from
// the same pose the built animal takes. It stands where a built animal reads as a model: on the flats, feeding, and on the colony's treads.
// The sheet keeps its heading while the lens sees its side, and turns no nearer edge-on than that. A second copy laid on the pool is its mirror.
import * as THREE from 'three';
import { RIG_GLSL } from '../shared/glsl';
import type { Context } from '../shared/context';
import type { Pose } from './animal';
import { STAND } from './animal';

// The picture, in its own pixels (1536 by 1024): hip, where the neck leaves the body, where the tuft begins, the feet.
const PX = { w: 1536, h: 1024, hip: [662, 312], neck: [930, 195], tuft: [1165, 380], ground: 972 };
/** Pixels to one unit of the pose: the legs of the picture are as long as the legs of the pose. */
const UNIT = (PX.ground - PX.hip[1]) / STAND;

const PUPPET_GLSL = /* glsl */ `
const vec2 HIP = vec2(${PX.hip[0].toFixed(1)}, ${PX.hip[1].toFixed(1)});
const vec2 NECK0 = vec2(${PX.neck[0].toFixed(1)}, ${PX.neck[1].toFixed(1)});
const vec2 TUFT0 = vec2(${PX.tuft[0].toFixed(1)}, ${PX.tuft[1].toFixed(1)});
const float UNIT = ${UNIT.toFixed(2)};
const float STAND = ${STAND.toFixed(3)};
// Which side of the line between the two legs a pixel lies on: under 0 the hind leg.
float legSide(vec2 px) {
  float line = px.y < 480.0 ? mix(677.0, 572.0, (px.y - 320.0) / 160.0) : mix(570.0, 600.0, (px.y - 480.0) / 480.0);
  return px.x - line;
}
// How far along the neck a pixel lies: 0 where it leaves the body, 1 where the tuft begins.
float neckAlong(vec2 px) {
  vec2 d = TUFT0 - NECK0;
  return dot(px - NECK0, d) / dot(d, d);
}`;

const VERTEX = /* glsl */ `
attribute float aPart;
attribute vec4 aPlace;
attribute vec4 aBody;
attribute vec4 aNeck;
attribute vec4 aFeet;
uniform float uPool;
varying vec3 vWorld;
varying vec2 vPx;
varying float vPart;
varying vec3 vAcross;
varying vec3 vFace;
varying vec2 vSeed;
varying float vUnder;
${PUPPET_GLSL}
vec2 turned(vec2 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}
void main() {
  vec2 px = position.xy;
  // Forward and up from the hip, in units of the pose.
  vec2 p = vec2(px.x - HIP.x, HIP.y - px.y) / UNIT;
  if (aPart > 0.5 && aPart < 2.5) {
    bool hind = aPart < 1.5;
    float t = clamp(-p.y / STAND, 0.0, 1.2);
    float footZ = hind ? aFeet.x : aFeet.z;
    float footY = hind ? aFeet.y : aFeet.w;
    // The picture stands mid stride: hind foot behind the hip, fore foot under it. The pose swings each about that.
    p.x += footZ * t * 1.1;
    p.y *= clamp(-footY / STAND, 0.2, 1.3);
  } else {
    if (aPart > 2.5) {
      vec2 from = vec2(NECK0.x - HIP.x, HIP.y - NECK0.y) / UNIT;
      vec2 to = vec2(TUFT0.x - HIP.x, HIP.y - TUFT0.y) / UNIT;
      float L = length(to - from);
      vec2 d = (to - from) / L;
      vec2 dn = vec2(-d.y, d.x);
      float s = dot(p - from, d) / L;
      float off = dot(p - from, dn);
      float sc = clamp(s, 0.0, 1.0);
      // The neck lifts where it leaves the body and bends as an arc along its length; the tuft at its end goes on hanging.
      float lift = aNeck.x * smoothstep(0.0, 0.3, s);
      float A = aNeck.y;
      float a = A * sc;
      vec2 centre = abs(A) > 0.02 ? (d * sin(a) + dn * (1.0 - cos(a))) / A : d * sc + dn * 0.5 * A * sc * sc;
      float hang = smoothstep(0.7, 1.15, s);
      float turn = a - (A + aNeck.x) * 0.8 * hang + aNeck.z * hang;
      vec2 q = from + L * centre + turned(d * (s - sc) * L + dn * off, turn);
      p = from + turned(q - from, lift);
    }
    p = turned(p, aBody.y);
  }
  vec3 hip = aPlace.xyz;
  float size = aBody.x;
  // The sheet keeps its heading unless that would show the lens its edge.
  vec2 h = vec2(sin(aPlace.w), cos(aPlace.w));
  vec2 away = normalize(hip.xz - cameraPosition.xz);
  vec2 right = vec2(-away.y, away.x);
  float c = dot(h, right);
  float sgn = c < 0.0 ? -1.0 : 1.0;
  vec2 f = normalize(right * sgn * max(abs(c), 0.7) + away * dot(h, away));
  vec3 w = hip + size * vec3(f.x * p.x, p.y, f.y * p.x);
  vUnder = 0.0;
#ifdef MIRROR
  // The mirror: the animal turned over about the water, laid on the water where the lens would see it.
  float y = 2.0 * uPool - w.y;
  float k = (cameraPosition.y - uPool - 0.012) / max(cameraPosition.y - y, 1e-3);
  vUnder = w.y - uPool;
  w = vec3(cameraPosition.xz + (w.xz - cameraPosition.xz) * k, uPool + 0.012).xzy;
#endif
  vWorld = w;
  vPx = px;
  vPart = aPart;
  vAcross = vec3(f.x, 0.0, f.y);
  vFace = vec3(-f.y, 0.0, f.x) * sgn;
  vSeed = vec2(aNeck.w, size);
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
${RIG_GLSL}
uniform sampler2D tSide;
uniform sampler2D tCover;
uniform float uPool;
varying vec3 vWorld;
varying vec2 vPx;
varying float vPart;
varying vec3 vAcross;
varying vec3 vFace;
varying vec2 vSeed;
varying float vUnder;
${PUPPET_GLSL}
const float PI = 3.14159265;
void main() {
  vec2 uv = vec2(vPx.x / ${PX.w.toFixed(1)}, 1.0 - vPx.y / ${PX.h.toFixed(1)});
  vec3 pic = texture2D(tSide, uv).rgb;
  float cover = texture2D(tCover, uv).r;
  // The round of the body, from the cover read soft: the sheet is lit as the thing it shows.
  vec2 e = vec2(6.0 / ${PX.w.toFixed(1)}, 6.0 / ${PX.h.toFixed(1)});
  float gx = texture2D(tCover, uv + vec2(e.x, 0.0), 3.0).r - texture2D(tCover, uv - vec2(e.x, 0.0), 3.0).r;
  float gy = texture2D(tCover, uv + vec2(0.0, e.y), 3.0).r - texture2D(tCover, uv - vec2(0.0, e.y), 3.0).r;
  // Each part keeps to its own side of the cuts.
  float side = legSide(vPx);
  float along = neckAlong(vPx);
  float mine = 1.0;
  if (vPart < 0.5) mine = (vPx.y < 318.0 || vPx.x < 420.0 || vPx.x > 830.0) && !(vPx.x > 880.0 && along > 0.0) ? 1.0 : 0.0;
  else if (vPart < 1.5) mine = side < 0.0 ? 1.0 : 0.0;
  else if (vPart < 2.5) mine = side >= 0.0 ? 1.0 : 0.0;
  else mine = along > 0.0 ? 1.0 : 0.0;
  cover *= mine;
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 face = dot(vFace, v) < 0.0 ? -vFace : vFace;
  vec3 n = normalize(face + (vAcross * -gx + vec3(0.0, 1.0, 0.0) * -gy) * 1.6);
  // The picture is lit soft from above; take that out to a hide of its own tone and light it here.
  vec3 albedo = pow(pic, vec3(1.08)) * mix(0.82, 1.04, vSeed.x) * 1.12;
  float leg = step(0.5, vPart) * step(vPart, 2.5);
  float wet = (1.0 - smoothstep(uPool + 0.03, uPool + 0.35, vWorld.y)) * leg;
  albedo *= 1.0 - 0.5 * wet;
  float rough = mix(0.55, 0.22, wet);
  float occ = mix(0.6, 1.0, smoothstep(-0.6, 0.4, n.y));
  vec4 land = landAt(vWorld.xz);
#ifdef MIRROR
  vec3 up = vWorld + vec3(0.0, 2.0 * vUnder, 0.0);
  vec3 col = rigShade(up, n, v, albedo, rough, occ);
  // Only standing water holds a mirror, and the water takes most of the light of what it shows.
  float water = smoothstep(0.0, 0.03, uPool - land.r) * smoothstep(-0.02, 0.05, vUnder);
  float glance = 1.0 - max(v.y, 0.0);
  float keep = water * cover * mix(0.3, 0.72, pow(glance, 3.0)) * (1.0 - uSolo);
  gl_FragColor = vec4(rigOut(col * 0.62) * keep, keep);
#else
  vec3 col = rigShade(vWorld, n, v, albedo, rough, occ);
  // Against the light the thin wet skin lets a little through and the sun rims it.
  float rim = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 3.0);
  col += albedo * skyIrradiance(vec3(0.0, 1.0, 0.0)) * 0.08 / PI;
  col += (albedo * 0.6 + 0.05) * uSunColour * rim * pow(max(dot(-v, uSunDir), 0.0), 2.0) * 0.16 * sunAt(vWorld, land);
  gl_FragColor = vec4(rigOut(col), 1.0);
  if (cover < 0.5) discard;
#endif
}`;

/** One sheet of the picture, cut in four: body 0, hind leg 1, fore leg 2, neck and tuft 3. Positions are pixels of the picture. */
function sheetGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const parts: number[] = [];
  const index: number[] = [];
  const grid = (part: number, x0: number, y0: number, x1: number, y1: number, nx: number, ny: number): void => {
    const base = positions.length / 3;
    for (let j = 0; j <= ny; j++) {
      for (let i = 0; i <= nx; i++) {
        positions.push(x0 + ((x1 - x0) * i) / nx, y0 + ((y1 - y0) * j) / ny, 0);
        parts.push(part);
      }
    }
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = base + j * (nx + 1) + i;
        index.push(k, k + 1, k + nx + 1, k + 1, k + nx + 2, k + nx + 1);
      }
    }
  };
  grid(0, 190, 40, 1010, 400, 1, 1);
  grid(1, 410, PX.hip[1], 700, 990, 1, 8);
  grid(2, 580, PX.hip[1], 830, 990, 1, 8);
  grid(3, 860, 120, 1380, 720, 14, 16);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('aPart', new THREE.Float32BufferAttribute(parts, 1));
  g.setIndex(index);
  return g;
}

export interface PuppetMaterials {
  body: THREE.ShaderMaterial;
  mirror: THREE.ShaderMaterial;
}

export function puppetMaterials(ctx: Context, pool: number): PuppetMaterials {
  const uniforms = {
    ...ctx.rig.uniforms,
    tSide: { value: ctx.assets.texture('mat/kitewing.jpg', { kind: 'colour', repeat: false }) },
    tCover: { value: ctx.assets.texture('mat/kitewing-a.png', { kind: 'data', repeat: false }) },
    uPool: { value: pool },
  };
  const body = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms, side: THREE.DoubleSide });
  const mirror = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms,
    defines: { MIRROR: 1 },
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  return { body, mirror };
}

const neckOf = (p: Pose): [number, number] => [Math.min(0.85, Math.max(-0.6, 0.6 * (p.rise + 0.25))), Math.min(0.9, Math.max(-1.0, 0.55 * (p.bend + 0.75)))];

/** Where the end of the tuft hangs for a pose: up from the hip and ahead of it, in units of the pose (the vertex shader's own sum). */
export function sheetTip(pose: Pose): [number, number] {
  const turned = (x: number, y: number, a: number): [number, number] => [Math.cos(a) * x - Math.sin(a) * y, Math.sin(a) * x + Math.cos(a) * y];
  const at = (px: number, py: number): [number, number] => [(px - PX.hip[0]) / UNIT, (PX.hip[1] - py) / UNIT];
  const p = at(1195, 655);
  const from = at(PX.neck[0] as number, PX.neck[1] as number);
  const to = at(PX.tuft[0] as number, PX.tuft[1] as number);
  const L = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const d: [number, number] = [(to[0] - from[0]) / L, (to[1] - from[1]) / L];
  const dn: [number, number] = [-d[1], d[0]];
  const s = ((p[0] - from[0]) * d[0] + (p[1] - from[1]) * d[1]) / L;
  const off = (p[0] - from[0]) * dn[0] + (p[1] - from[1]) * dn[1];
  const [lift, A] = neckOf(pose);
  const cx = Math.abs(A) > 0.02 ? (d[0] * Math.sin(A) + dn[0] * (1 - Math.cos(A))) / A : d[0] + dn[0] * 0.5 * A;
  const cy = Math.abs(A) > 0.02 ? (d[1] * Math.sin(A) + dn[1] * (1 - Math.cos(A))) / A : d[1] + dn[1] * 0.5 * A;
  const hang = Math.min(1, Math.max(0, (s - 0.7) / 0.45));
  const h = hang * hang * (3 - 2 * hang);
  const turn = A - (A + lift) * 0.8 * h;
  const r = turned(d[0] * (s - 1) * L + dn[0] * off, d[1] * (s - 1) * L + dn[1] * off, turn);
  const q = turned(L * cx + r[0], L * cy + r[1], lift);
  const out = turned(from[0] + q[0], from[1] + q[1], pose.pitch * 0.8);
  return [out[1], out[0]];
}

/** Many standing animals, each placed by the pose of the built animal. */
export class Puppets {
  readonly mesh: THREE.Mesh;
  readonly mirror: THREE.Mesh | undefined;
  private readonly attributes: THREE.InstancedBufferAttribute[] = [];
  private readonly place: THREE.InstancedBufferAttribute;
  private readonly body: THREE.InstancedBufferAttribute;
  private readonly neck: THREE.InstancedBufferAttribute;
  private readonly feet: THREE.InstancedBufferAttribute;

  constructor(materials: PuppetMaterials, readonly count: number, mirrored: boolean) {
    const shape = sheetGeometry();
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setAttribute('position', shape.getAttribute('position'));
    geometry.setAttribute('aPart', shape.getAttribute('aPart'));
    geometry.setIndex(shape.getIndex());
    geometry.instanceCount = count;
    const attribute = (name: string): THREE.InstancedBufferAttribute => {
      const a = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
      a.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute(name, a);
      this.attributes.push(a);
      return a;
    };
    this.place = attribute('aPlace');
    this.body = attribute('aBody');
    this.neck = attribute('aNeck');
    this.feet = attribute('aFeet');
    this.mesh = new THREE.Mesh(geometry, materials.body);
    this.mesh.frustumCulled = false;
    if (mirrored) {
      this.mirror = new THREE.Mesh(geometry, materials.mirror);
      this.mirror.frustumCulled = false;
      this.mirror.renderOrder = 2;
    }
  }

  put(i: number, p: Pose): void {
    this.place.setXYZW(i, p.x, p.y, p.z, p.yaw);
    this.body.setXYZW(i, p.size, p.pitch * 0.8, 0, 0);
    // The picture's own neck leaves the body a little under the level and curls down: the pose is read against that.
    const [lift, arc] = neckOf(p);
    this.neck.setXYZW(i, lift, arc, 0.3 * p.sweep, p.seed);
    this.feet.setXYZW(i, p.leftZ, p.leftY, p.rightZ, p.rightY);
  }

  hide(i: number): void {
    this.place.setXYZW(i, 0, -500, 0, 0);
    this.body.setXYZW(i, 0, 0, 0, 0);
  }

  commit(): void {
    for (const a of this.attributes) a.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
  }
}
