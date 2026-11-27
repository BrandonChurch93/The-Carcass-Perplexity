// The liquid mud the ones by the lens of the wallowers stand in: a level sheet of thick red-brown mud in the wallow they have trodden, a hand
// to two hands deep, lying over the bed of churned mud the ground builder lays. It is a liquid and is shaded as one: it lies level, it
// mirrors what stands in it (the brine's own mirror picture, read a little lower because the sheet lies above the brine's level), it
// climbs each leg in a sleeve, and a ring leaves a leg when the leg works. Its edge is no outline: it thins out over the bed, tongue by
// tongue, and where the bed stands higher than its level it is only a wet film on it. A pure function of the seconds.
import * as THREE from 'three';
import type { Context } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

/** How many legs one sheet answers to. */
export const MIRE_LEGS = 8;

const VERTEX = /* glsl */ `
attribute float aEdge;
attribute float aDepth;
varying vec3 vWorld;
varying float vEdge;
varying float vDepth;
void main() {
  vEdge = aEdge;
  vDepth = aDepth;
  vWorld = position;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying float vEdge;
varying float vDepth;
// x, z: where the leg stands in the sheet. z: how hard it works, 0 to 1. w: its half thickness at the sheet, metres.
uniform vec4 uLegs[${MIRE_LEGS}];
// x, z: where a muzzle works the sheet. z: how hard, 0 to 1. w: its half width.
uniform vec4 uSnouts[2];
uniform float uSeconds;
uniform float uShown;
uniform float uLevel;
uniform sampler2D tMudNh;
${NOISE_GLSL}
${RIG_GLSL}
// The lie of thick mud that has been walked through: low swells a hand across that never quite level out.
float lumps(vec2 p) {
  return 0.6 * vnoise(p * 2.3 + 7.1) + 0.3 * vnoise(p * 6.1 + 2.7) + 0.1 * vnoise(p * 17.0);
}
void main() {
  vec2 p = vWorld.xz;
  // The mud of the rim, read before anything else is decided.
  vec3 clod = texture2D(tMudNh, p * 0.55).rgb;
  vec3 v = normalize(cameraPosition - vWorld);
  float away = length(cameraPosition - vWorld);
  float broad = vnoise(p * 0.9 + 3.3);
  float mid = vnoise(p * 4.7 + 1.9);
  float fine = vnoise(p * 21.0);
  // Where it is a liquid: inside the rim of mud the animals have pushed up round their wallow, and where it stands over the bed.
  float body = smoothstep(0.0, 0.05, vDepth + 0.04 * (mid - 0.5) + 0.02 * (fine - 0.5));
  float reach = vEdge + 0.12 * (broad - 0.5) + 0.06 * (mid - 0.5) + 0.04 * (clod.b - 0.5);
  float liquid = body * smoothstep(0.3, 0.36, reach);
  // The slope of it. Thick mud does not ripple: it lies in slow swells, stands up round what is pushed into it and lets a ring go slowly.
  float e = 0.03;
  float h0 = lumps(p);
  vec2 slope = vec2(lumps(p + vec2(e, 0.0)) - h0, lumps(p + vec2(0.0, e)) - h0) / e * mix(0.05, 0.012, liquid);
  float sleeve = 0.0;
  float churn = 0.0;
  for (int i = 0; i < ${MIRE_LEGS}; i++) {
    vec4 leg = uLegs[i];
    vec2 d = p - leg.xy;
    float r = length(d);
    vec2 out2 = d / max(r, 1e-4);
    float off = max(r - leg.w, 0.0);
    // The sleeve: the mud stands up the leg, a finger high, and falls away from it within a hand.
    float climb = exp(-off / 0.045);
    slope -= out2 * 0.85 * climb;
    sleeve = max(sleeve, climb);
    // The rings: two or three, slow, and gone within two hands. A leg that stands still lets none go.
    float ring = cos(off * 26.0 - uSeconds * 3.4 + float(i) * 1.9) * exp(-off / 0.22) * smoothstep(0.0, 0.05, off);
    slope += out2 * 0.16 * leg.z * ring;
    churn = max(churn, leg.z * exp(-off / 0.3));
  }
  for (int i = 0; i < 2; i++) {
    vec4 snout = uSnouts[i];
    vec2 d = p - snout.xy;
    float r = length(d);
    vec2 out2 = d / max(r, 1e-4);
    float off = max(r - snout.w, 0.0);
    // The lip ploughs it: a low wall of mud stands before it and a furrow of rings leaves it.
    slope -= out2 * 0.5 * exp(-off / 0.07) * snout.z;
    slope += out2 * 0.12 * snout.z * cos(off * 22.0 - uSeconds * 2.7 + float(i) * 2.3) * exp(-off / 0.3) * smoothstep(0.0, 0.05, off);
    churn = max(churn, snout.z * exp(-off / 0.35));
  }
  vec3 n = normalize(vec3(-slope.x, 1.0, -slope.y));

  // Its colour: the red of the vein gone to brown with the grey mud of the bank stirred in, paler in the streaks the legs have dragged
  // up from the bed, and near black where it has stood and the water has come to the top of it.
  vec3 thick = vec3(0.042, 0.019, 0.014);
  vec3 stirred = vec3(0.07, 0.042, 0.034);
  float streak = smoothstep(0.45, 0.75, vnoise(vec2(p.x * 1.1 + 2.0 * broad, p.y * 5.3)) + 0.5 * churn - 0.2);
  vec3 albedo = mix(thick, stirred, 0.55 * streak) * (0.8 + 0.4 * mid);
  // The rim is the bed pushed up and gone wet: clods, dark, each with a glint in the hollow beside it. Not level, and dull beside the sheet.
  albedo = mix(vec3(0.05, 0.029, 0.023) * (0.5 + 1.0 * clod.b), albedo, liquid);
  n = normalize(mix(vec3(-(clod.r - 0.5) * 2.0, 1.0, -(clod.g - 0.5) * 2.0), n, liquid));
  // The light of the sky on it, and no sheen by the rig's law: at this lens's low angle that law would whiten all of it. The sheet's
  // sheen is the mirror below; the rim has only the wet in the hollows between its clods.
  float open = skyOpen(vWorld);
  vec3 c = albedo * skyIrradiance(n) * (open * mix(0.6 + 0.4 * smoothstep(0.25, 0.6, clod.b), 1.0, liquid) / 3.14159);
  vec3 up = reflect(-v, n);
  up.y = abs(up.y);
  c += 0.014 * (1.0 - smoothstep(0.25, 0.5, clod.b)) * (1.0 - liquid) * skyRadiance(up) * open;
  // The mirror. The sheet lies uLevel above the brine the picture was drawn for: a ray it throws up is the ray the brine would throw
  // from the same place that far under its level again.
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float share = (0.012 + 0.13 * pow(1.0 - nv, 8.0)) * liquid * (1.0 - 0.5 * streak * (1.0 - churn));
  vec2 swing = n.xz * 2.0 * clamp(away * 0.22, 0.2, 6.0);
  vec4 q = uMirrorMatrix * vec4(p.x + swing.x, -uLevel, p.y + swing.y, 1.0);
  float soft = max(log2(float(textureSize(tMirror, 0).x) / 240.0), 0.0);
  vec3 seen = textureLod(tMirror, clamp(q.xy / q.w, 0.003, 0.997), soft).rgb * vec3(0.92, 0.8, 0.76);
  c += share * seen * (1.0 - uMirror);
  // The dark wet line where it stands against a leg.
  c *= 1.0 - 0.35 * sleeve * liquid;
  // Its edge thins out over the bed clod by clod: no line anywhere.
  float a = smoothstep(0.0, 0.1, reach - 0.03) * smoothstep(0.0, 0.03, vEdge);
  gl_FragColor = vec4(rigOut(c), a * uShown * (1.0 - uMirror));
}`;

export class Mire {
  readonly mesh: THREE.Mesh;
  readonly level: number;
  private readonly legs: THREE.Vector4[] = Array.from({ length: MIRE_LEGS }, () => new THREE.Vector4(0, 0, 0, 0.1));
  private readonly snouts: THREE.Vector4[] = [new THREE.Vector4(0, 0, 0, 0.1), new THREE.Vector4(0, 0, 0, 0.1)];
  private readonly uSeconds = { value: 0 };
  private readonly uShown = { value: 1 };

  /** A sheet about (x, z), `long` metres each way along `dir` and `wide` each way across it, its top at `level` in the world. */
  constructor(ctx: Context, x: number, z: number, dir: [number, number], long: number, wide: number, level: number) {
    const rng = ctx.rng('wallowers-mire');
    this.level = level;
    const RINGS = 44;
    const SIDES = 128;
    const position: number[] = [];
    const edge: number[] = [];
    const depth: number[] = [];
    const index: number[] = [];
    const wobble = Array.from({ length: 9 }, () => [rng.range(0.03, 0.1), rng.range(0, Math.PI * 2)] as [number, number]);
    for (let i = 0; i <= RINGS; i++) {
      const u = i / RINGS;
      for (let j = 0; j <= SIDES; j++) {
        const a = (j / SIDES) * Math.PI * 2;
        let reach = 1;
        wobble.forEach((w, n) => {
          reach += w[0] * Math.sin(a * (n + 2) + w[1]);
        });
        const along = Math.cos(a) * long * reach * u;
        const across = Math.sin(a) * wide * reach * u;
        const px = x + dir[0] * along - dir[1] * across;
        const pz = z + dir[1] * along + dir[0] * across;
        const land = ctx.rig.land.height(px, pz);
        const over = level - land;
        // It does not run out over the brine: its rim stands on the bank before the shore.
        const e = Math.min(1 - u, Math.max(0, (ctx.rig.land.shore(px, pz) - 0.05) / 0.8));
        // Level inside the rim; the rim is mud pushed up a little over the sheet, and falls from there to the bed it lies on.
        const w = Math.min(1, e / 0.3);
        const fall = w * w * (3 - 2 * w);
        const rim = 0.035 * Math.exp(-(((e - 0.27) / 0.07) ** 2)) * (0.6 + 0.4 * Math.sin(a * 5 + (wobble[0] as [number, number])[1]));
        position.push(px, Math.max(land + 0.02 + (level - land - 0.02) * fall + rim, land + 0.025), pz);
        edge.push(e);
        depth.push(Math.max(-0.2, Math.min(0.4, over)));
      }
    }
    for (let i = 0; i < RINGS; i++) {
      for (let j = 0; j < SIDES; j++) {
        const a = i * (SIDES + 1) + j;
        index.push(a, a + SIDES + 1, a + 1, a + 1, a + SIDES + 1, a + SIDES + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
    geometry.setAttribute('aEdge', new THREE.Float32BufferAttribute(edge, 1));
    geometry.setAttribute('aDepth', new THREE.Float32BufferAttribute(depth, 1));
    geometry.setIndex(index);
    const material = new THREE.ShaderMaterial({
      uniforms: { ...ctx.rig.uniforms, uLegs: { value: this.legs }, uSnouts: { value: this.snouts }, uSeconds: this.uSeconds, uShown: this.uShown, uLevel: { value: level }, tMudNh: { value: ctx.assets.texture('mat/mud-nh.png', { kind: 'data', anisotropy: 4 }) } },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
  }

  /** Leg `i` stands at (x, z), `half` metres thick, and works the mud `work` hard (0 to 1). */
  leg(i: number, x: number, z: number, work: number, half: number): void {
    (this.legs[i] as THREE.Vector4).set(x, z, Math.min(1, Math.max(0, work)), half);
  }

  /** Muzzle `i` works the sheet at (x, z). */
  snout(i: number, x: number, z: number, work: number, half: number): void {
    (this.snouts[i] as THREE.Vector4).set(x, z, Math.min(1, Math.max(0, work)), half);
  }

  set(seconds: number, shown: number): void {
    this.uSeconds.value = seconds;
    this.uShown.value = shown;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
