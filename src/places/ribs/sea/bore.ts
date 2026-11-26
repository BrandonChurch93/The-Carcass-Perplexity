// The bore: one breaking wall of water across the strait. A swept section (a run-out over the flat, a hollow face, a lip that pitches forward
// and falls, a back that stands at the new level of the sea) whose height and state of breaking change along the wall and in time,
// with white water laid on it in metres and thrown water as lit cards. Every number of place and time comes from tide.ts and the anchors.
import * as THREE from 'three';
import { hash2 } from '../../../core/rng';
import { NOISE_GLSL, RIG_GLSL, RIG_UNIFORMS_GLSL } from '../shared/glsl';
import { BORE_HEIGHT, BORE_SPEED, boreArrives, boreFront } from './tide';

const rand = (a: number, b: number): number => hash2(a, b) / 4294967296;
const f = (v: number): string => (Number.isInteger(v) ? `${v}.0` : `${v}`);

/** Metres of the section along its own length: the run-out ahead of the foot, the face from foot to lip, the lip's wrap, then the back. */
const APRON = 45;
const FACE = 40;
const LIP = 6;
/** Seconds from one fall of the lip to the next at one place on the wall. */
const BREAK_PERIOD = 2.9;

// The same sums of sines on the processor and in the shader, so that thrown water is born exactly where the drawn lip is.
const lineAt = (x: number, t: number): number => 20 * Math.sin(x * 0.0076 + 1.3) + 8 * Math.sin(x * 0.021 + t * 0.25) + 3 * Math.sin(x * 0.09 - t * 0.6);
const highAt = (x: number, t: number): number => {
  const strait = Math.min(1, Math.max(0, (950 - Math.abs(x - 80)) / 430));
  const s = strait * strait * (3 - 2 * strait);
  return BORE_HEIGHT * (0.3 + 0.7 * s) * (0.9 + 0.1 * Math.sin(x * 0.021 + t * 0.7) + 0.07 * Math.sin(x * 0.063 - t * 1.1));
};
const curlAt = (x: number, t: number): number => {
  const ph = (6.2832 * t) / BREAK_PERIOD + 2.1 * Math.sin(x * 0.031 + 0.7) + 1.7 * Math.sin(x * 0.0573 + 2.1) + 1.2 * Math.sin(x * 0.113 + 4.0);
  const u = Math.min(1, Math.max(0, (0.5 + 0.5 * Math.sin(ph) - 0.15) / 0.7));
  return u * u * (3 - 2 * u);
};
/** The tip of the lip at x: metres ahead of the foot, and its height, as the shader draws it. */
const tipAt = (x: number, t: number): [number, number] => {
  const H = highAt(x, t);
  const c = curlAt(x, t);
  return [H * (-0.38 + 0.5 * c), H * (1 - 0.28 * c * c)];
};

const SHAPE_GLSL = /* glsl */ `
uniform float uFront;
uniform float uPoolLevel;
uniform sampler2D tFoam;
float boreLine(float x) {
  return 20.0 * sin(x * 0.0076 + 1.3) + 8.0 * sin(x * 0.021 + uTime * 0.25) + 3.0 * sin(x * 0.09 - uTime * 0.6);
}
float boreHigh(float x) {
  float strait = smoothstep(520.0, 950.0, 1470.0 - abs(x - 80.0));
  return ${f(BORE_HEIGHT)} * (0.3 + 0.7 * strait) * (0.9 + 0.1 * sin(x * 0.021 + uTime * 0.7) + 0.07 * sin(x * 0.063 - uTime * 1.1));
}
// 0: the wall stands up clean and its lip begins to pitch. 1: the lip has fallen and the face is a tumbling pile of white.
float boreCurl(float x) {
  float ph = 6.2832 * uTime / ${f(BREAK_PERIOD)} + 2.1 * sin(x * 0.031 + 0.7) + 1.7 * sin(x * 0.0573 + 2.1) + 1.2 * sin(x * 0.113 + 4.0);
  return smoothstep(0.15, 0.85, 0.5 + 0.5 * sin(ph));
}
vec2 bez3(vec2 a, vec2 b, vec2 c, vec2 d, float t) {
  float s = 1.0 - t;
  return s * s * s * a + 3.0 * s * s * t * b + 3.0 * s * t * t * c + t * t * t * d;
}
// The section at x: a metres along it. Returns metres ahead of the foot and metres over the flat.
vec2 boreSection(float x, float a, float H, float c) {
  vec2 tip = vec2(H * (-0.38 + 0.5 * c), H * (1.0 - 0.28 * c * c));
  vec2 crest = vec2(-0.56 * H, H * (1.03 - 0.12 * c));
  vec2 p;
  if (a < 0.0) {
    p = vec2(-a, 0.08 + 0.7 * exp(a / 9.0));
  } else if (a < ${f(FACE)}) {
    float q = a / ${f(FACE)};
    p = bez3(vec2(0.0, 0.78), vec2(-0.5 * H, 0.06 * H), vec2(H * (-0.66 + 0.3 * c), 0.82 * H), tip, q);
    // The fallen lip lies on the face as a pile that rolls ahead of the foot.
    float pile = c * sin(3.14159 * clamp(q * 1.5, 0.0, 1.0));
    p += vec2(0.34 * H * pile, 0.05 * H * pile);
  } else if (a < ${f(FACE + LIP)}) {
    float q = (a - ${f(FACE)}) / ${f(LIP)};
    float s = 1.0 - q;
    p = s * s * tip + 2.0 * s * q * (tip + vec2(0.05 * H, 0.13 * H)) + q * q * crest;
  } else {
    float b = a - ${f(FACE + LIP)};
    p = vec2(crest.x - b, H * (0.6 + 0.43 * exp(-b / (0.8 * H)) - 0.12 * c * exp(-b / (0.8 * H))));
  }
  return p;
}
// A point of the bore in the world; w is how white the water is there by its state alone (the fragment tears it).
vec4 boreAt(float x, float a) {
  float H = boreHigh(x);
  float c = boreCurl(x);
  vec2 p = boreSection(x, a, H, c);
  // White water stands in heads: the pile, the lip and the back are lumped, the clean face is not.
  float onFace = smoothstep(0.0, 6.0, a) * (1.0 - smoothstep(${f(FACE - 5)}, ${f(FACE)}, a));
  float white = 1.0 - onFace * (1.0 - smoothstep(0.3, 0.8, c));
  float up = smoothstep(-8.0, 2.0, a);
  float behind = exp(-max(a - ${f(FACE + LIP)}, 0.0) / 60.0);
  vec2 ride = vec2(x, a + uTime * 5.0);
  float big = textureLod(tFoam, ride / 61.0, 1.0).r - 0.5;
  float mid = textureLod(tFoam, ride / 23.0 + 0.37, 1.5).g - 0.35;
  float small = textureLod(tFoam, ride / 7.3 + 0.11, 1.0).g - 0.35;
  float amp = up * behind * (0.035 + 0.075 * white) * H;
  p.y += amp * (1.5 * big + 0.9 * mid + 0.35 * small) + 0.25 * (1.0 - up) * (mid + small);
  p.x += amp * (1.0 * mid + 0.5 * small) * step(0.0, a);
  float z = uFront + boreLine(x) + p.x;
  float bed = max(texture2D(tLand, (vec2(x, z) - uLandRect.xy) * uLandRect.zw).r, uPoolLevel);
  return vec4(x, bed + p.y, z, white);
}`;

const VERTEX = /* glsl */ `
${RIG_UNIFORMS_GLSL}
${SHAPE_GLSL}
varying vec3 vWorld;
varying vec3 vNormalW;
varying vec4 vRide;
varying float vHigh;
void main() {
  float x = position.x;
  float a = position.y;
  vec4 at = boreAt(x, a);
  float da = a < ${f(FACE + LIP + 4)} ? 0.45 : 0.15 * (a - ${f(FACE + LIP)}) + 0.45;
  vec3 ax = boreAt(x + 0.6, a).xyz - boreAt(x - 0.6, a).xyz;
  vec3 aa = boreAt(x, a + da).xyz - boreAt(x, a - da).xyz;
  vWorld = at.xyz;
  vNormalW = normalize(cross(aa, ax));
  vRide = vec4(x, a, boreCurl(x), at.w);
  vHigh = boreHigh(x);
  gl_Position = projectionMatrix * viewMatrix * vec4(at.xyz, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
${NOISE_GLSL}
${RIG_GLSL}
uniform sampler2D tFoam;
uniform sampler2D tFoamPic;
uniform sampler2D tFoamNh;
uniform float uFoamPic;
varying vec3 vWorld;
varying vec3 vNormalW;
varying vec4 vRide;
varying float vHigh;
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  float x = vRide.x;
  float a = vRide.y;
  float c = vRide.z;
  float q = clamp(a / ${f(FACE)}, 0.0, 1.0);
  float onFace = step(0.0, a) * (1.0 - step(${f(FACE)}, a));
  // White water rides with the wall and tumbles down its face: laid in metres along the section, one speed for all of it.
  vec2 p = vec2(x, a + uTime * 5.0);
  vec4 f1 = texture2D(tFoam, p / 19.0);
  vec4 f2 = texture2D(tFoam, p / 6.1 + f1.rb * 0.2);
  vec4 f3 = texture2D(tFoam, p / 1.9 + 0.31 + f2.rb * 0.1);
  float heads = 0.38 * f1.g + 0.34 * f2.g + 0.28 * f3.g;
  float lace = 0.55 * f2.a + 0.45 * f3.a;
  // Strings of white drawn out along the face by the water climbing it: long up the face, a hand to a metre across.
  vec4 s1 = texture2D(tFoam, vec2(x / 3.1, a / 37.0 + uTime * 0.2) + f1.rb * 0.12);
  vec4 s2 = texture2D(tFoam, vec2(x / 1.1, a / 19.0 + uTime * 0.35) + 0.43 + f1.gr * 0.1);
  float drawn = 0.6 * s1.a + 0.4 * s2.a;

  // Where the wall still stands clean its face is a dark window of lifted water, torn at its edges, with strings of white climbing it.
  // The window is an arch: widest under the lip, closing downward into the pile, and it closes from its ends as the lip falls.
  float state = c + 0.3 * (f1.r - 0.5);
  float low = 0.12 + 0.95 * smoothstep(0.05, 0.7, state) + 0.1 * (f1.g - 0.4) + 0.05 * (f2.g - 0.4);
  float span = smoothstep(low, low + 0.07, q) * (1.0 - smoothstep(0.87, 0.95, q + 0.05 * (f2.r - 0.5)));
  float window = span * onFace;
  float strings = smoothstep(0.62, 0.9, drawn + 0.3 * (q - 0.6) + 0.3 * (f1.r - 0.5));
  float foam = mix(1.0, 0.55 * strings, window);
  // Behind the crest the white thins to lace over the dark water of the returned sea.
  float b = a - ${f(FACE + LIP)};
  foam *= mix(1.0, smoothstep(0.4, 0.7, 0.55 * f1.r + 0.45 * lace + 0.2), smoothstep(8.0, 70.0, b));
  // Ahead of the foot foam runs out over the flat in tongues and thins to nothing.
  float ahead = clamp(-a / ${f(APRON)}, 0.0, 1.0);
  float tongue = texture2D(tFoam, vec2(x, uTime * 2.0) / 53.0).r + 0.6 * f1.r;
  float run = 1.25 - 2.2 * ahead / (0.2 + tongue);
  float apron = smoothstep(0.35, 0.75, run + 0.5 * (lace - 0.5));
  foam = mix(foam, apron, step(a, 0.0));
  bool bare = a < 0.0 && apron < 0.25;

  // The relief of the heads, from the slope of their height as the lens sees it.
  float h = heads + 0.25 * f3.a;
  vec3 n = normalize(vNormalW);
  if (dot(n, v) < 0.0) n = -n;
  vec3 px = dFdx(vWorld);
  vec3 py = dFdy(vWorld);
  float hx = dFdx(h);
  float hy = dFdy(h);
  vec3 r1 = cross(py, n);
  vec3 r2 = cross(n, px);
  float det = dot(px, r1);
  vec3 grad = sign(det) * (hx * r1 + hy * r2);
  vec3 nf = normalize(abs(det) * n - 0.7 * grad * foam);
  float crease = smoothstep(0.08, 0.5, heads);
  // Under the pitching lip the face lies in the lip's own shade.
  float under = smoothstep(0.45, 0.95, q) * (1.0 - smoothstep(0.5, 0.9, c)) * onFace;
  float occ = mix(1.0, 0.3 + 0.7 * crease, foam) * (1.0 - 0.5 * under);

  // Lifted water is thick with sand: slate green low on the face, olive brown where it thins toward the lip.
  vec3 water = mix(vec3(0.018, 0.028, 0.025), vec3(0.085, 0.075, 0.04), smoothstep(0.3, 0.95, q) * onFace);
  vec3 white = vec3(0.9, 0.92, 0.92) * (0.5 + 0.5 * smoothstep(0.15, 0.7, 0.45 * f2.r + 0.35 * f3.g + 0.2 * f1.r + 0.15 * foam));
  vec3 albedo = mix(water, white, foam);
  vec3 col = rigShade(vWorld, nf, v, albedo, mix(0.18, 1.0, foam), occ);
  // The sun stands behind the wall, over the blades' shade: where the water thins at the lip the light comes through it, and white water,
  // which is lit all through, glows toward the lens.
  vec4 land = landAt(vWorld.xz);
  float sun = mix(sunAt(vWorld + vec3(0.0, 30.0, 0.0), land), 1.0, 0.45);
  float back = 0.45 + 0.55 * pow(max(dot(-v, uSunDir), 0.0), 2.0);
  float thin = smoothstep(0.5, 0.98, q) * onFace + (1.0 - onFace) * step(0.0, a) * (1.0 - smoothstep(0.0, 4.0, b));
  col += (1.0 - foam) * vec3(0.1, 0.13, 0.065) * thin * back * uSunColour * 0.32 * sun;
  float topward = 0.55 + 0.45 * clamp(nf.y, 0.0, 1.0);
  col += foam * white * occ * (uSunColour * 0.2 * back * sun * topward + skyIrradiance(vec3(0.0, 1.0, 0.0)) * 0.1);
  gl_FragColor = vec4(rigOut(col), 1.0);
  if (bare) discard;
}`;

const CARD_VERTEX = /* glsl */ `
${RIG_GLSL}
attribute vec4 aAt;
attribute vec4 aLook;
attribute vec4 aMore;
varying vec2 vUv;
varying vec2 vRaw;
varying vec4 vLook;
varying vec4 vMore;
varying vec3 vSky;
varying vec3 vSun;
varying vec3 vSunView;
void main() {
  vec4 centre = viewMatrix * vec4(aAt.xyz, 1.0);
  float turn = aLook.z;
  vec2 corner = position.xy * vec2(1.0, aLook.w);
  vec2 turned = vec2(corner.x * cos(turn) - corner.y * sin(turn), corner.x * sin(turn) + corner.y * cos(turn));
  centre.xy += turned * aAt.w;
  vUv = position.xy;
  vRaw = turned;
  vLook = aLook;
  vMore = aMore;
  vec4 land = landAt(aAt.xz);
  float open = mix(land.g, 1.0, clamp((aAt.y - land.r) / 60.0, 0.0, 1.0));
  vSky = skyIrradiance(vec3(0.0, 1.0, 0.0)) * (0.35 + 0.65 * open) / 3.14159;
  vSun = uSunColour * mix(sunAt(aAt.xyz + vec3(0.0, 30.0, 0.0), land), 1.0, 0.45) / 3.14159;
  vSunView = normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz);
  gl_Position = projectionMatrix * centre;
}`;

const CARD_FRAGMENT = /* glsl */ `
precision highp float;
${RIG_UNIFORMS_GLSL}
uniform sampler2D tFoam;
uniform sampler2D tAtlas;
uniform float uAtlas;
varying vec2 vUv;
varying vec2 vRaw;
varying vec4 vLook;
varying vec4 vMore;
varying vec3 vSky;
varying vec3 vSun;
varying vec3 vSunView;
void main() {
  float r2 = dot(vUv, vUv);
  float mist = vMore.y;
  vec2 o = vLook.y * vec2(3.1, 7.3);
  vec4 t = texture2D(tFoam, vUv * mix(0.33, 0.2, mist) + o);
  vec4 g = texture2D(tFoam, vUv * 1.3 + o.yx);
  vec4 k = texture2D(tFoam, vUv * 4.1 + o * 1.7);
  // Thrown water is not a ball: a torn clot, thick only at its heart, that breaks toward its rim into strings and then into single drops.
  float clot = 1.0 - smoothstep(-0.15, 0.85, r2 + 1.5 * (t.r - 0.5) + 0.7 * (0.45 - g.g));
  float grain = smoothstep(0.42 - 0.5 * clot, 0.75 - 0.4 * clot, 0.55 * k.b + 0.45 * g.b + 0.25 * (k.a - 0.3));
  float soft = 1.0 - smoothstep(mix(0.0, -0.1, mist), 0.95, r2 + 0.3 * (t.r - 0.5));
  float dens = mix(clot * grain * (1.0 - smoothstep(0.75, 1.0, r2)), soft, mist);
  if (uAtlas > 0.5) {
    vec2 cell = vec2(mod(floor(vMore.z), 4.0), floor(vMore.z / 4.0));
    vec3 pic = texture2D(tAtlas, (cell + clamp(vUv * 0.5 + 0.5, 0.02, 0.98)) / 4.0).rgb;
    float lum = dot(pic, vec3(0.333));
    dens = mix(smoothstep(0.03, 0.55, lum) * (1.0 - smoothstep(0.7, 1.0, r2)), dens, mist);
  }
  float alpha = clamp(dens * vLook.x, 0.0, 1.0) * (1.0 - uSolo);
  // Lit through, not on a skin: the side toward the sun a little brighter, the heart of a mass grey, the thin rim against the sun burning.
  float side = 0.5 + 0.5 * dot(normalize(vRaw + 1e-4), normalize(vSunView.xy + 1e-4)) * sqrt(r2);
  float rim = pow(max(-vSunView.z, 0.0), 2.0) * (1.0 - clot) * 1.2;
  float deep = vMore.x;
  vec3 col = vec3(0.92, 0.94, 0.95) * (vSky * (0.85 + 0.3 * vUv.y) * (1.0 - 0.45 * deep - 0.2 * clot) + vSun * (0.3 + 0.6 * side + rim) * (1.0 - 0.6 * deep));
  col *= mix(1.0, 0.55, mist);
  gl_FragColor = vec4(col * alpha, alpha);
}`;

/** Thrown water: cards that face the lens, each placed anew from the time alone. */
class Cards {
  readonly mesh: THREE.Mesh;
  private readonly at: THREE.InstancedBufferAttribute;
  private readonly look: THREE.InstancedBufferAttribute;
  private readonly more: THREE.InstancedBufferAttribute;
  private readonly geometry: THREE.InstancedBufferGeometry;
  readonly material: THREE.ShaderMaterial;
  private used = 0;

  constructor(readonly count: number, uniforms: Record<string, THREE.IUniform>) {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.at = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
    this.look = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
    this.more = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
    for (const attribute of [this.at, this.look, this.more]) attribute.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aAt', this.at);
    g.setAttribute('aLook', this.look);
    g.setAttribute('aMore', this.more);
    this.geometry = g;
    this.material = new THREE.ShaderMaterial({
      vertexShader: CARD_VERTEX,
      fragmentShader: CARD_FRAGMENT,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    this.mesh = new THREE.Mesh(g, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
  }

  begin(): void {
    this.used = 0;
  }

  /** deep: 0 at the lit skin of a mass of spray, 1 in its core. mist: 0 thrown water, 1 hanging mist. */
  put(x: number, y: number, z: number, size: number, alpha: number, seed: number, turn: number, stretch: number, deep: number, mist: number): void {
    if (this.used >= this.count || alpha <= 0.003) return;
    this.at.setXYZW(this.used, x, y, z, size);
    this.look.setXYZW(this.used, alpha, seed, turn, stretch);
    this.more.setXYZW(this.used, deep, mist, Math.floor(seed * 16), 0);
    this.used++;
  }

  end(): void {
    this.geometry.instanceCount = this.used;
    this.at.needsUpdate = true;
    this.look.needsUpdate = true;
    this.more.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

function sheet(focusX: number): THREE.BufferGeometry {
  const xs: number[] = [];
  const side = (sign: number): number[] => {
    const out: number[] = [];
    let x = sign > 0 ? focusX : focusX - 0.45;
    let d = 0.45;
    while (Math.abs(x - focusX) < 2500) {
      out.push(x);
      if (Math.abs(x - focusX) > 120) d = Math.min(60, d * 1.07);
      x += sign * d;
    }
    return out;
  };
  xs.push(...side(-1).reverse(), ...side(1));
  const as: number[] = [];
  for (let a = -APRON; a < 0; a += 1.5) as.push(a);
  for (let a = 0; a < FACE + LIP + 4; a += 0.45) as.push(a);
  let a = FACE + LIP + 4;
  let d = 0.6;
  while (a < 4000) {
    as.push(a);
    d = Math.min(240, d * 1.13);
    a += d;
  }
  const positions: number[] = [];
  const index: number[] = [];
  for (const av of as) for (const xv of xs) positions.push(xv, av, 0);
  const W = xs.length;
  for (let j = 0; j < as.length - 1; j++) {
    for (let i = 0; i < W - 1; i++) {
      const k = j * W + i;
      index.push(k, k + 1, k + W, k + 1, k + W + 1, k + W);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(index);
  return g;
}

export interface BoreSite {
  /** Where the wall strikes something that stands: its place, and how wide it stands, metres. */
  x: number;
  z: number;
  reach: number;
  id: number;
  /** A cliff close to the last shot's lens: the burst there is the tallest thing in the frame. */
  near: boolean;
}

export interface Bore {
  wall: THREE.Mesh;
  cards: THREE.Mesh;
  setTime(seconds: number): void;
  dispose(): void;
}

const DEBUG_NO_CARDS = false;
const LIPS = 1100;
const PLUME = 520;
const FOOT = 380;
const VEIL = 150;
const BURST_NEAR = 300;
const BURST_FAR = 40;

export function createBore(
  rigUniforms: Record<string, THREE.IUniform>,
  foam: THREE.Texture,
  front: THREE.IUniform<number>,
  poolLevel: number,
  focus: [number, number],
  sites: BoreSite[],
  pictures: { foam?: THREE.Texture; foamNh?: THREE.Texture; spray?: THREE.Texture },
): Bore {
  const wallMaterial = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      ...rigUniforms,
      tFoam: { value: foam },
      uFront: front,
      uPoolLevel: { value: poolLevel },
      tFoamPic: { value: pictures.foam ?? foam },
      tFoamNh: { value: pictures.foamNh ?? foam },
      uFoamPic: { value: pictures.foam ? 1 : 0 },
    },
    side: THREE.DoubleSide,
  });
  const wall = new THREE.Mesh(sheet(focus[0]), wallMaterial);
  wall.frustumCulled = false;

  const count = LIPS + PLUME + FOOT + VEIL + sites.reduce((n, s) => n + (s.near ? BURST_NEAR : BURST_FAR), 0);
  const cards = new Cards(count, { ...rigUniforms, tFoam: { value: foam }, tAtlas: { value: pictures.spray ?? foam }, uAtlas: { value: pictures.spray ? 1 : 0 } });
  const X = focus[0];

  return {
    wall,
    cards: cards.mesh,
    setTime: (seconds) => {
      cards.begin();
      if (DEBUG_NO_CARDS) { cards.end(); return; }
      const frontNow = boreFront(seconds);
      // Nothing of the thrown water is seen from more than three kilometres.
      if (Math.abs(frontNow - focus[1]) > 3000) {
        cards.end();
        return;
      }
      const across = (i: number, salt: number, span: number): number => X + span * (rand(i, salt) - 0.5);

      // The veil: water too fine to fall, hanging over and behind the crest. It hides the feet of the far blades and the white stands against it.
      for (let i = 0; i < VEIL; i++) {
        const x = across(i, 21, 620);
        const life = 5 + 3 * rand(i, 22);
        const beat = seconds / life + rand(i, 23);
        const n = Math.floor(beat);
        const a = (beat - n) * life;
        const H = highAt(x, seconds);
        const z = frontNow + lineAt(x, seconds) - H * (0.9 + 3.5 * rand(i, n + 24)) - 6 * a;
        const y = H * (0.5 + 1.0 * rand(i, n + 25)) + 1.5 * a;
        const fade = Math.min(1, a / 1.2) * Math.min(1, (life - a) / 1.5);
        cards.put(x, y, z, (11 + 9 * rand(i, n + 28)) * (1 + 0.05 * a), 0.12 * fade, rand(i, n + 29), rand(i, n + 30) * 6.28, 0.8, 0.5, 1);
      }

      // Water torn off the crest and blown up: it is born on the top of the wall, climbs, and is left behind as the wall runs on.
      for (let i = 0; i < PLUME; i++) {
        const x = i % 4 < 3 ? across(i, 11, 260) : across(i, 11, 700);
        const life = 1.6 + 1.8 * rand(i, 12);
        const beat = seconds / life + rand(i, 13);
        const n = Math.floor(beat);
        const a = (beat - n) * life;
        const born = seconds - a;
        const H = highAt(x, born);
        const c = curlAt(x, born);
        const z0 = boreFront(born) + lineAt(x, born) - H * (0.3 + 0.3 * rand(i, n + 14));
        const up = (6 + 12 * rand(i, n + 16)) * (0.6 + 0.8 * c);
        const y = H * (0.95 - 0.1 * c) + up * a - 3.2 * a * a;
        const z = z0 + BORE_SPEED * a * (1 - 0.32 * a / life);
        const fade = Math.min(1, a / 0.15) * Math.pow(Math.max(0, 1 - a / life), 1.5);
        const size = (0.9 + 1.7 * a) * (0.6 + 0.8 * rand(i, n + 17));
        cards.put(x, y, z, size, 0.45 * fade, rand(i, n + 18), rand(i, n + 19) * 6.28, 1.5, 0.15 + 0.5 * rand(i, n + 20), 0.15 * a / life);
      }

      // The lip: where it pitches, a ragged edge of water is thrown ahead of the face and falls; where it has fallen, white boils up from the pile.
      for (let i = 0; i < LIPS; i++) {
        const x = i % 5 < 4 ? across(i, 51, 230) : across(i, 51, 640);
        const life = 0.7 + 0.7 * rand(i, 52);
        const beat = seconds / life + rand(i, 53);
        const n = Math.floor(beat);
        const a = (beat - n) * life;
        const born = seconds - a;
        const c = curlAt(x, born);
        const tip = tipAt(x, born);
        const H = highAt(x, born);
        const low = i % 6 === 0;
        // A third of them boil on the fallen pile, low on the face.
        const f0 = low ? H * (0.15 + 0.3 * c) * rand(i, n + 54) : tip[0] - 0.5 + 1.5 * rand(i, n + 54);
        const y0 = low ? H * (0.1 + 0.45 * rand(i, n + 55)) * (0.4 + 0.6 * c) : tip[1] + 0.8 * (rand(i, n + 55) - 0.4);
        const vf = low ? 3 + 5 * rand(i, n + 56) : 2 + 7 * rand(i, n + 56) * (0.5 + c);
        const vy = low ? 3 + 6 * rand(i, n + 57) : 1 + 5 * rand(i, n + 57);
        const z = boreFront(born) + lineAt(x, born) + f0 + (BORE_SPEED + vf) * a;
        const y = y0 + vy * a - 4.9 * a * a;
        if (y < 0.3) continue;
        const fade = Math.min(1, a / 0.08) * Math.min(1, (life - a) / 0.3) * (low ? 0.4 + 0.6 * c : 1);
        const size = (low ? 1.0 + 1.2 * rand(i, n + 58) : 0.6 + 1.0 * rand(i, n + 58)) * (1 + 0.9 * a);
        cards.put(x, y, z, size, (low ? 0.5 : 0.8) * fade, rand(i, n + 59), rand(i, n + 60) * 6.28, 1.2, low ? 0.45 : 0.1, 0);
      }

      // The foot: the run-out is flung ahead over the flat, low and fast.
      for (let i = 0; i < FOOT; i++) {
        const x = i % 4 < 3 ? across(i, 71, 240) : across(i, 71, 600);
        const life = 0.6 + 0.8 * rand(i, 72);
        const beat = seconds / life + rand(i, 73);
        const n = Math.floor(beat);
        const a = (beat - n) * life;
        const born = seconds - a;
        const z = boreFront(born) + lineAt(x, born) + 1 + 6 * rand(i, n + 74) + (BORE_SPEED + 4 + 9 * rand(i, n + 75)) * a;
        const y = 0.7 + (3 + 6 * rand(i, n + 76)) * a - 4.9 * a * a;
        if (y < 0.2) continue;
        const fade = Math.min(1, a / 0.06) * Math.min(1, (life - a) / 0.3);
        cards.put(x, y, z, (0.6 + 1.1 * rand(i, n + 77)) * (1 + 1.2 * a), 0.7 * fade, rand(i, n + 78), rand(i, n + 79) * 6.28, 1.3, 0.25, 0);
      }

      // Where the wall strikes a blade or a cliff the water has nowhere to go but up. The surge ahead of the wall strikes first.
      for (const s of sites) {
        const count = s.near ? BURST_NEAR : BURST_FAR;
        const since = seconds - boreArrives(s.z - s.reach) + (s.near ? 1.5 : 0.4);
        if (since < 0 || since > 8) continue;
        for (let j = 0; j < count; j++) {
          const seed = 9000 + s.id * 977 + j;
          const a = since - 2.6 * rand(seed, 1) * rand(seed, 8);
          if (a < 0 || a > 5.5) continue;
          const power = s.near ? 1 : 0.7;
          const up = (14 + 20 * rand(seed, 2)) * power;
          const y = 1 + up * a - 4.0 * a * a;
          if (y < 0) continue;
          const ang = (rand(seed, 3) - 0.5) * 2.6;
          const rr = s.reach * (0.85 + 0.25 * rand(seed, 9));
          const out = (3 + 8 * rand(seed, 4)) * a;
          const x = s.x + Math.sin(ang) * (rr + out * 0.6);
          const z = s.z - Math.cos(ang) * rr * 0.9 + (10 + 16 * rand(seed, 10)) * a;
          const fade = Math.min(1, a / 0.2) * Math.max(0, 1 - a / 5.2);
          const size = (1.8 + 2.4 * a) * (0.6 + 0.9 * rand(seed, 5));
          cards.put(x, y, z, size, 0.8 * fade, rand(seed, 6), rand(seed, 7) * 6.28, 1.35, 0.1 + 0.6 * rand(seed, 11), Math.min(0.5, 0.12 * a));
        }
      }
      cards.end();
    },
    dispose: () => {
      wall.geometry.dispose();
      wallMaterial.dispose();
      cards.dispose();
    },
  };
}
