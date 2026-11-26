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
#ifdef SHADE
uniform vec3 uSunDir;
#endif
varying vec3 vWorld;
varying vec2 vPx;
varying float vPart;
varying vec3 vAcross;
varying vec3 vFace;
varying vec2 vSeed;
varying float vUnder;
varying float vPale;
varying float vFly;
${PUPPET_GLSL}
vec2 turned(vec2 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}
void main() {
  vec2 px = position.xy;
  float fly = step(0.5, aBody.w);
  float depth = 0.0;
  // Forward and up from the hip, in units of the pose.
  vec2 p = vec2(px.x - HIP.x, HIP.y - px.y) / UNIT;
  if (aPart > 3.5) {
    // A sail of the picture seen from ahead, stood on the shoulder: in the air only. Its bone leads, its skin trails, and from the side
    // the stroke is its height; the far sail shows behind the body.
    float far = step(4.5, aPart);
    float th = 0.35 + 1.3 * (aBody.w - 10.0) - 0.25 * far;
    float up = sin(th);
    up = (up < 0.0 ? -1.0 : 1.0) * max(abs(up), 0.28);
    float span = (560.0 - px.x) / 223.0;
    float chord = (px.y - 330.0) / 223.0;
    vec2 root = vec2(790.0 - HIP.x + 30.0 * far, HIP.y - 125.0) / UNIT;
    p = root + fly * (span * vec2(-0.3 * abs(up) - 0.25 * (1.0 - abs(up)), up) + chord * vec2(-0.72, -0.12 * up));
    p = turned(p, aBody.y);
    depth = 0.05 - 0.1 * far;
  } else if (aPart > 0.5 && aPart < 2.5) {
    bool hind = aPart < 1.5;
    float t = clamp(-p.y / STAND, 0.0, 1.2);
    float footZ = hind ? aFeet.x : aFeet.z;
    float footY = hind ? aFeet.y : aFeet.w;
    // The picture stands mid stride: hind foot behind the hip, fore foot under it. The pose swings each about that.
    p.x += footZ * t * 1.1 * (1.0 - fly);
    p.y *= mix(clamp(-footY / STAND, 0.2, 1.3), 0.8, fly);
    // In the air the legs trail.
    p = turned(p, (-1.2 + (hind ? 0.0 : -0.12) + aBody.y) * fly);
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
    } else {
      // The folded sail is no board: it hangs from the shoulder, its tips lower the more the body tips, each animal's a little its own.
      vec2 shoulder = vec2(790.0 - HIP.x, HIP.y - 100.0) / UNIT;
      float tipward = smoothstep(650.0, 330.0, px.x);
      float droop = (0.1 + 0.3 * aNeck.w + 0.85 * max(-aBody.y, 0.0)) * tipward * (1.0 - fly);
      p = shoulder + turned(p - shoulder, droop) * (1.0 - 0.12 * tipward);
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
  vec3 out3 = vec3(-f.y, 0.0, f.x);
  w += out3 * (dot(out3, cameraPosition - hip) < 0.0 ? -1.0 : 1.0) * depth * size;
  vUnder = 0.0;
#ifdef MIRROR
  // The mirror: the animal turned over about the water, laid on the water where the lens would see it.
  float y = 2.0 * uPool - w.y;
  float k = (cameraPosition.y - uPool - 0.012) / max(cameraPosition.y - y, 1e-3);
  vUnder = w.y - uPool;
  w = vec3(cameraPosition.xz + (w.xz - cameraPosition.xz) * k, uPool + 0.012).xzy;
#endif
#ifdef SHADE
  // Its shade: the same outline a little larger than itself and just behind it, so the rock round it is darker where it hides the sky.
  vec3 ray = normalize(w - cameraPosition);
  vec3 fall = -uSunDir - ray * dot(-uSunDir, ray);
  w = hip + (w - hip) * 1.16 + normalize(fall + vec3(0.0, -0.05, 0.0)) * 0.08 * size + ray * 0.1;
#endif
  vWorld = w;
  vPx = px;
  vPart = aPart;
  vAcross = vec3(f.x, 0.0, f.y);
  vFace = vec3(-f.y, 0.0, f.x) * sgn;
  vSeed = vec2(aNeck.w, size);
  vPale = aBody.z;
  vFly = fly;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
${RIG_GLSL}
uniform sampler2D tSide;
uniform sampler2D tCover;
uniform sampler2D tFront;
uniform float uPool;
varying vec3 vWorld;
varying vec2 vPx;
varying float vPart;
varying vec3 vAcross;
varying vec3 vFace;
varying vec2 vSeed;
varying float vUnder;
varying float vPale;
varying float vFly;
${PUPPET_GLSL}
const float PI = 3.14159265;
void main() {
  vec2 uv = vec2(vPx.x / ${PX.w.toFixed(1)}, 1.0 - vPx.y / ${PX.h.toFixed(1)});
  vec3 pic = texture2D(tSide, uv).rgb;
  float cover = texture2D(tCover, uv).r;
  // A sail is of the other picture, where brightness is cover.
  float sail = step(3.5, vPart);
  vec3 front = texture2D(tFront, vec2(vPx.x / 1243.0, 1.0 - vPx.y / 1266.0), -1.0).rgb;
  // The round of the body, from the cover read soft: the sheet is lit as the thing it shows.
  vec2 e = vec2(6.0 / ${PX.w.toFixed(1)}, 6.0 / ${PX.h.toFixed(1)});
  float gx = texture2D(tCover, uv + vec2(e.x, 0.0), 3.0).r - texture2D(tCover, uv - vec2(e.x, 0.0), 3.0).r;
  float gy = texture2D(tCover, uv + vec2(0.0, e.y), 3.0).r - texture2D(tCover, uv - vec2(0.0, e.y), 3.0).r;
  // Each part keeps to its own side of the cuts.
  float side = legSide(vPx);
  float along = neckAlong(vPx);
  float mine = 1.0;
  if (vPart > 3.5) mine = vPx.x > 465.0 && vPx.y > 445.0 ? 0.0 : 1.0;
  else if (vPart < 0.5) mine = (vPx.y < 318.0 || vPx.x < 420.0 || vPx.x > 830.0) && !(vPx.x > 880.0 && along > 0.0) && !(vFly > 0.5 && vPx.x < 590.0) ? 1.0 : 0.0;
  else if (vPart < 1.5) mine = side < 0.0 ? 1.0 : 0.0;
  else if (vPart < 2.5) mine = side >= 0.0 ? 1.0 : 0.0;
  else mine = along > 0.0 ? 1.0 : 0.0;
  cover = mix(cover, step(0.035, max(front.r, max(front.g, front.b))), sail) * mine;
  pic = mix(pic, front, sail);
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 face = dot(vFace, v) < 0.0 ? -vFace : vFace;
  // And the lie of the hide inside the outline, from the picture's own light and dark read soft.
  float hx = texture2D(tSide, uv + vec2(e.x, 0.0), 2.0).g - texture2D(tSide, uv - vec2(e.x, 0.0), 2.0).g;
  float hy = texture2D(tSide, uv + vec2(0.0, e.y), 2.0).g - texture2D(tSide, uv - vec2(0.0, e.y), 2.0).g;
  vec3 n = normalize(face + (vAcross * -(gx * 1.6 + hx * 2.2) + vec3(0.0, 1.0, 0.0) * -(gy * 1.6 + hy * 2.2)) * (1.0 - sail));
  // The picture is lit soft from above; take that out to a hide of its own tone and light it here.
  // Leather, grey brown: the picture's cream is its studio light, not its hide.
  vec3 albedo = pow(pic, vec3(1.25)) * mix(0.78, 1.0, vSeed.x);
  albedo = mix(albedo, vec3(dot(albedo, vec3(0.3333))) * vec3(1.0, 0.9, 0.8), 0.45);
  // The colony's are cream, the picture's light and dark kept as their folds: the back a shade darker than the belly and the neck, so that a body parts from its ledge.
  float under = max(step(2.5, vPart) * (1.0 - sail), step(vPart, 0.5) * max(smoothstep(230.0, 320.0, vPx.y) * smoothstep(540.0, 600.0, vPx.x), smoothstep(800.0, 880.0, vPx.x)));
  float pale = clamp(vPale, 0.0, 1.0);
  float perched = pale * (1.0 - step(0.5, vFly));
  // No two the same hide: the back runs from grey brown to cream by the animal, the belly and neck stay pale, and one in three stands in shade.
  float tone = fract(vSeed.x * 13.7);
  vec3 back = mix(vec3(0.8), vec3(0.56, 0.5, 0.44), perched * (1.0 - tone * tone));
  vec3 cream = vec3(0.8, 0.7, 0.55) * (0.5 + 0.8 * dot(albedo, vec3(0.3333)));
  albedo = mix(albedo, cream * mix(back, vec3(1.04, 0.94, 0.8), under), pale);
  albedo *= 1.0 - 0.45 * perched * step(fract(vSeed.x * 7.3), 0.33);
  // Against white water it is a shape; the far sail is in the shade of the body.
  albedo *= mix(1.0, 0.3, clamp(-vPale, 0.0, 1.0)) * mix(1.0, 0.6, step(4.5, vPart));
  float leg = step(0.5, vPart) * step(vPart, 2.5);
  float wet = (1.0 - smoothstep(uPool + 0.03, uPool + 0.35, vWorld.y)) * leg;
  albedo *= 1.0 - 0.5 * wet;
  float rough = mix(0.55, 0.22, wet);
  // Darker underneath: the belly and the under side of the folded sails are turned from the sky.
  float occ = mix(0.45, 1.0, smoothstep(-0.6, 0.4, n.y)) * mix(1.0, mix(0.6, 0.95, pale), step(vPart, 0.5) * smoothstep(250.0, 400.0, vPx.y));
  vec4 land = landAt(vWorld.xz);
  float soft = mix(texture2D(tCover, uv, 3.5).r, cover, sail) * mine;
#if defined(SHADE)
  float dim = 0.6 * smoothstep(0.05, 0.6, soft) * (1.0 - uSolo);
  gl_FragColor = vec4(rigOut(vec3(0.0)) * dim, dim);
#elif defined(MIRROR)
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
  col += (albedo * 0.6 + 0.05) * uSunColour * rim * pow(max(dot(-v, uSunDir), 0.0), 2.0) * 0.16 * sunAt(vWorld, land);
  // An open sail is skin: the sky behind it comes through.
  col += albedo * sail * vec3(1.0, 0.92, 0.82) * (uSunColour * max(dot(-n, uSunDir), 0.0) * sunAt(vWorld, land) * 0.6 + skyIrradiance(-n) * 0.9) / 3.14159;
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
  grid(0, 190, 40, 1010, 400, 12, 5);
  grid(1, 410, PX.hip[1], 700, 990, 1, 8);
  grid(2, 580, PX.hip[1], 830, 990, 1, 8);
  grid(3, 860, 120, 1380, 720, 14, 16);
  grid(4, 50, 150, 560, 700, 4, 2);
  grid(5, 50, 150, 560, 700, 4, 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('aPart', new THREE.Float32BufferAttribute(parts, 1));
  g.setIndex(index);
  return g;
}

export interface PuppetMaterials {
  body: THREE.ShaderMaterial;
  mirror: THREE.ShaderMaterial;
  shade: THREE.ShaderMaterial;
}

export function puppetMaterials(ctx: Context, pool: number): PuppetMaterials {
  const uniforms = {
    ...ctx.rig.uniforms,
    tSide: { value: ctx.assets.texture('mat/kitewing.jpg', { kind: 'colour', repeat: false }) },
    tCover: { value: ctx.assets.texture('mat/kitewing-a.png', { kind: 'data', repeat: false }) },
    tFront: { value: ctx.assets.texture('mat/kitewing-front.jpg', { kind: 'colour', repeat: false }) },
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
  const shade = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms,
    defines: { SHADE: 1 },
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  return { body, mirror, shade };
}

const neckOf = (p: Pose): [number, number] => [Math.min(1.7, Math.max(-0.6, 0.75 * (p.rise + 0.25))), Math.min(0.9, Math.max(-1.0, 0.55 * (p.bend + 0.75)))];

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
  readonly shade: THREE.Mesh | undefined;
  private readonly attributes: THREE.InstancedBufferAttribute[] = [];
  private readonly place: THREE.InstancedBufferAttribute;
  private readonly body: THREE.InstancedBufferAttribute;
  private readonly neck: THREE.InstancedBufferAttribute;
  private readonly feet: THREE.InstancedBufferAttribute;

  constructor(materials: PuppetMaterials, readonly count: number, mirrored: boolean, shaded = false) {
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
    if (shaded) {
      this.shade = new THREE.Mesh(geometry, materials.shade);
      this.shade.frustumCulled = false;
      this.shade.renderOrder = 1;
    }
  }

  /** pale: 0 the hide as it wades, 1 dark backed and pale bellied on a ledge, under 0 a shape against white water. flying: sails up, legs trailing. */
  put(i: number, p: Pose, pale = 0, flying = false): void {
    this.place.setXYZW(i, p.x, p.y, p.z, p.yaw);
    this.body.setXYZW(i, p.size, p.pitch * 0.8, pale, flying ? 10 + p.flap : 0);
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
