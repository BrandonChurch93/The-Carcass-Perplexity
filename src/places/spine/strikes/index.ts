// The lightning: six strikes, each on its accent of the music. A strike is a crooked channel with branches from the cloud to a spire's tip, a white-hot
// spot and a spray of fragments where it lands, a glow in the cloud where it enters, and two lights of the rig for as long as it burns.
import * as THREE from 'three';
import type { Context, Piece, SteamSource } from '../shared/context';
import { RIG_UNIFORMS_GLSL } from '../shared/glsl';
import { GRAIN_GLSL, ditherAt, envelope, figure, strokeAt, timingOf, type Line } from './bolt';
import { WIND, WIND_SPEED } from '../shared/anchors';
import { STRIKES, type StrikeSite } from './where';

export const PARTS: readonly string[] = STRIKES.map((s) => s.id);

/** Scene-linear radiance of the channel's core at the peak of a stroke, and of the light it casts. */
const CORE = 260;
const CAST = 4600;
const TINT = new THREE.Vector3(0.62, 0.5, 1);
/** Radius of the main channel as the camera records it, metres: the lit sheath, not the centimetres of the arc. */
const CHANNEL = 0.2;
const SPARKS = 140;

const CHANNEL_VERTEX = /* glsl */ `
attribute vec3 aPrev;
attribute vec3 aNext;
attribute vec4 aInfo;
attribute vec2 aSide;
uniform float uPixel;
uniform vec4 uShift;
varying float vAcross;
varying vec4 vInfo;
varying vec2 vWide;
varying float vAlong;
// Each return stroke finds a way of its own: the channel is carried aside by height, differently for each stroke (uShift.x), by up to
// uShift.z metres, and not at all where it meets the tip (uShift.y is the tip's height). Branches at one height go with it.
vec3 moved(vec3 p) {
  float h = max(p.y - uShift.y, 0.0);
  float k = smoothstep(0.0, 110.0, h) * uShift.z;
  float n = uShift.x;
  return p + k * vec3(sin(h * 0.031 + n * 2.7) + 0.5 * sin(h * 0.083 + n * 5.1), 0.0, sin(h * 0.027 + n * 4.3) + 0.5 * sin(h * 0.071 + n * 1.9));
}
void main() {
  vec4 c = viewMatrix * vec4(moved(position), 1.0);
  vec3 a = (viewMatrix * vec4(moved(aPrev), 1.0)).xyz;
  vec3 b = (viewMatrix * vec4(moved(aNext), 1.0)).xyz;
  vec3 side = normalize(cross(b - a, c.xyz));
  float far = -c.z;
  // The core is never thinner than a pixel, and the strip carries a soft sheath eight cores wide.
  float core = max(aInfo.x, 0.8 * uPixel * far);
  float half_ = core * 8.0;
  c.xyz += side * aSide.x * half_;
  vAcross = aSide.x * 8.0;
  vInfo = aInfo;
  vWide = vec2(aInfo.x / core, far);
  vAlong = aSide.y;
  gl_Position = projectionMatrix * c;
}`;

const CHANNEL_GLSL = /* glsl */ `
${RIG_UNIFORMS_GLSL}
uniform vec4 uEnv;
uniform vec3 uTint;
uniform float uCore;
uniform float uDither;
varying float vAcross;
varying vec4 vInfo;
varying vec2 vWide;
varying float vAlong;
${GRAIN_GLSL}
// How bright the channel is here: by the stroke, by its share, by the leader coming down.
float channelLit() {
  // vInfo: radius, share, where on the leader's way down, branch or main.
  // The branches burn with the first stroke; the later ones find them again, fainter.
  float lit = mix(uEnv.x + uEnv.z, uEnv.y + 0.4 * uEnv.x + 0.2 * uEnv.z, vInfo.w);
  // After the strokes the channel does not fade evenly: it breaks into beads that hang for a moment.
  float bead = 0.55 + 0.9 * smoothstep(0.35, 0.8, fract(sin(floor(vAlong * 0.11) * 91.7) * 43758.5));
  lit = mix(lit, lit * bead, clamp(1.0 - uEnv.x * 30.0, 0.0, 1.0));
  // The leader: a dim thread that has come this far down.
  float lead = 0.012 * (1.0 - smoothstep(uEnv.w - 0.04, uEnv.w, vInfo.z)) * step(uEnv.w, 0.999);
  return (lit + lead) * vInfo.y * mix(sqrt(vWide.x), 1.0, 0.35);
}`;

// The sheath: the air the channel lights round itself. Added to the picture.
const SHEATH_FRAGMENT = /* glsl */ `
${CHANNEL_GLSL}
void main() {
  float x = vAcross;
  float sheath = 0.02 * exp(-abs(x) * 0.75) * (1.0 - smoothstep(5.0, 8.0, abs(x)));
  gl_FragColor = vec4(uTint * (sheath * uCore * channelLit() * (1.0 - uSolo)), 1.0);
}`;

// The core: the arc itself, a thread, violet with a white heart. Drawn solid where it burns and not at all where it does not: no pixel
// is left out by a pattern, so it has no grain.
const CORE_FRAGMENT = /* glsl */ `
${CHANNEL_GLSL}
void main() {
  float x = vAcross;
  float core = exp(-x * x * 3.2);
  float power = uCore * channelLit() * core;
  if (power < 0.3) discard;
  vec3 c = mix(uTint, vec3(1.0), 0.45 * core * core) * power;
  gl_FragColor = vec4(c * (1.0 - uSolo), 1.0);
}`;

// The stroke itself is a photograph of one, stood between the cloud and the tip and turned to the lens. Each return stroke takes the
// picture another way round, so the channel changes its path between them.
const CARD_VERTEX = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uTip;
uniform vec4 uShift;
varying vec2 vUv;
varying float vWay;
void main() {
  vec3 a = uTip - uTop;
  float len = length(a);
  vec3 mid = 0.5 * (uTip + uTop);
  vec3 side = normalize(cross(a, cameraPosition - mid));
  // uShift.x: which return stroke; uShift.w: which strike. No two take the picture the same way.
  float n = uShift.x + uShift.w;
  float flip = mod(n, 2.0) < 0.5 ? 1.0 : -1.0;
  float v = 0.5 + 0.5 * position.y;
  // The picture's stroke leaves its top and reaches its foot a little off the middle; it is brought back onto the line.
  float lean = mix(0.537, 0.466, v) - 0.5;
  float wander = (0.03 * sin(v * 9.0 + n * 2.1) + 0.05 * sin(v * 3.7 + n * 4.3)) * sin(v * 3.14159) * min(n, 1.0);
  vUv = vec2(0.5 + flip * (0.5 * position.x) + lean + wander, v);
  vWay = 1.0 - v;
  vec3 p = mix(uTip, uTop, v) + side * (position.x * 0.5 * len * 0.5628);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const CARD_FRAGMENT = /* glsl */ `
${RIG_UNIFORMS_GLSL}
uniform sampler2D tBolt;
uniform vec4 uEnv;
uniform vec3 uTint;
uniform float uCore;
varying vec2 vUv;
varying float vWay;
void main() {
  if (vUv.x < 0.0 || vUv.x > 1.0) discard;
  vec3 pic = texture2D(tBolt, vUv).rgb;
  float lum = max(pic.r, max(pic.g, pic.b));
  // The stroke lights the whole figure, its fine branches too; as it dies the branches go first and the core thins, and before it the
  // leader is a dim thread on its way down. The picture's glow is left out: only the channel is drawn, thin, and what is round it is
  // lit by the rig. Where the picture is bright over a breadth (the main channel) only its heart is kept; a branch is kept whole.
  float px = 1.0 / 941.0;
  float broad = 0.25 * (texture2D(tBolt, vUv + vec2(5.0 * px, 0.0)).g + texture2D(tBolt, vUv - vec2(5.0 * px, 0.0)).g + texture2D(tBolt, vUv + vec2(0.0, 5.0 * px)).g + texture2D(tBolt, vUv - vec2(0.0, 5.0 * px)).g);
  float lit = uEnv.x + uEnv.z;
  float lead = 0.06 * (1.0 - smoothstep(uEnv.w - 0.04, uEnv.w, vWay)) * step(uEnv.w, 0.999);
  float strength = min(lit + lead, 1.5);
  float need = max(mix(0.13, 0.5, smoothstep(0.06, 0.22, broad)), 0.033 / max(strength, 1e-3));
  if (lum < need || strength < 0.002) discard;
  vec3 c = mix(uTint, vec3(1.0), smoothstep(need, min(need + 0.3, 1.0), lum)) * uCore * (0.15 + 0.85 * lum * lum) * min(strength * 3.0, 1.0);
  gl_FragColor = vec4(c * (1.0 - uSolo), 1.0);
}`;

const SPOT_VERTEX = /* glsl */ `
attribute vec4 aSeed;
attribute vec3 aGo;
uniform vec3 uAt;
uniform float uAge;
uniform float uPixel;
uniform vec3 uGale;
varying vec2 vUv;
varying float vHeat;
void main() {
  // A fragment of rock thrown from the tip: it flies, falls, is carried by the gale, and cools.
  // It leaves fast and the air stops it within a few tens of metres; then it only falls and drifts.
  float life = 0.25 + 0.55 * aSeed.x * aSeed.x;
  float t = max(uAge - 0.042 * aSeed.y * aSeed.y, 0.0);
  float drag = 1.0 - exp(-t * 13.0);
  vec3 p = uAt + aGo * (drag / 13.0) + vec3(0.0, -4.9 * t * t, 0.0) + uGale * (t * t * 6.0);
  vec3 v = aGo * exp(-t * 13.0) + vec3(0.0, -9.8 * t, 0.0) + uGale * (t * 12.0);
  vec4 c = viewMatrix * vec4(p, 1.0);
  vec3 along = (viewMatrix * vec4(v, 0.0)).xyz;
  float far = -c.z;
  float size = max(0.035 + 0.05 * aSeed.z, 0.7 * uPixel * far);
  // A streak as long as the fragment flies while the shutter is open.
  vec2 dir = normalize(along.xy + vec2(1e-4));
  float reach = max(size, length(along.xy) * 0.005);
  c.xy += dir * position.x * reach + vec2(-dir.y, dir.x) * position.y * size;
  vUv = position.xy;
  vHeat = (uAge <= 0.0 || t <= 0.0) ? 0.0 : exp(-t / (0.35 * life)) * (1.0 - smoothstep(life * 0.8, life, t)) * (0.4 + 0.6 * aSeed.w) * min(1.0, 0.3 / (reach / size) + 0.4);
  gl_Position = projectionMatrix * c;
}`;

const SPOT_FRAGMENT = /* glsl */ `
${RIG_UNIFORMS_GLSL}
uniform float uGlow;
uniform float uDither;
${GRAIN_GLSL}
varying vec2 vUv;
varying float vHeat;
void main() {
  float r = length(vUv);
  float a = exp(-r * r * 3.0) * (1.0 - smoothstep(0.8, 1.0, r));
  // Hot rock: white at first, orange as it cools.
  vec3 c = mix(vec3(1.0, 0.32, 0.06), vec3(1.0, 0.86, 0.7), smoothstep(0.25, 0.9, vHeat));
  // A fragment is there or it is not: no pattern of dots.
  if (uGlow * vHeat * a < 0.5) discard;
  gl_FragColor = vec4(c * (uGlow * vHeat * a) * (1.0 - uSolo), 1.0);
}`;

const HALO_VERTEX = /* glsl */ `
uniform vec3 uAt;
uniform vec2 uSize;
varying vec2 vUv;
void main() {
  vec4 c = viewMatrix * vec4(uAt, 1.0);
  // Brought a little toward the lens, so that the rock it sits on does not hide it.
  c.z += 3.0;
  c.xy += position.xy * uSize;
  vUv = position.xy;
  gl_Position = projectionMatrix * c;
}`;

const HALO_FRAGMENT = /* glsl */ `
${RIG_UNIFORMS_GLSL}
uniform vec3 uColour;
uniform float uSharp;
uniform float uDither;
varying vec2 vUv;
${GRAIN_GLSL}
void main() {
  float r = length(vUv);
  float a = mix(exp(-r * r * 4.5), exp(-r * r * 11.0), uSharp) * (1.0 - smoothstep(0.7, 1.0, r));
  vec3 c = uColour * a;
  // The white-hot spot is solid, and so is the violet air close round it; the glow in the cloud is added.
  if (uSharp > 0.5) {
    float most = max(uColour.r, max(uColour.g, uColour.b));
    c = mix(vec3(0.62, 0.5, 1.0) * most, uColour, exp(-r * r * 60.0)) * exp(-r * r * 22.0);
    if (max(c.r, max(c.g, c.b)) < 0.6) discard;
  }
  gl_FragColor = vec4(c * (1.0 - uSolo), 1.0);
}`;

function channelGeometry(lines: Line[]): THREE.BufferGeometry {
  let count = 0;
  for (const l of lines) count += l.points.length;
  const position = new Float32Array(count * 6);
  const prev = new Float32Array(count * 6);
  const next = new Float32Array(count * 6);
  const info = new Float32Array(count * 8);
  const side = new Float32Array(count * 4);
  const index: number[] = [];
  let v = 0;
  for (const l of lines) {
    const n = l.points.length;
    let along = 0;
    for (let i = 0; i < n; i++) {
      const p = l.points[i] as [number, number, number];
      const a = l.points[Math.max(0, i - 1)] as [number, number, number];
      const b = l.points[Math.min(n - 1, i + 1)] as [number, number, number];
      if (i > 0) along += Math.hypot(p[0] - a[0], p[1] - a[1], p[2] - a[2]);
      const k = i / (n - 1);
      // A branch thins to nothing at its end.
      const taper = l.branch ? Math.pow(1 - k, 0.85) : 1;
      for (let s = 0; s < 2; s++) {
        position.set(p, v * 3);
        prev.set(a, v * 3);
        next.set(b, v * 3);
        info.set([l.width * CHANNEL * (l.branch ? 0.12 + 0.88 * taper : 1), l.gain * (l.branch ? 0.08 + 0.92 * taper : 1), l.from + (l.to - l.from) * k, l.branch], v * 4);
        side.set([s === 0 ? -1 : 1, along], v * 2);
        v++;
      }
      if (i > 0) {
        const o = v - 4;
        index.push(o, o + 1, o + 2, o + 1, o + 3, o + 2);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3));
  g.setAttribute('aPrev', new THREE.BufferAttribute(prev, 3));
  g.setAttribute('aNext', new THREE.BufferAttribute(next, 3));
  g.setAttribute('aInfo', new THREE.BufferAttribute(info, 4));
  g.setAttribute('aSide', new THREE.BufferAttribute(side, 2));
  g.setIndex(index);
  return g;
}

interface Bolt {
  site: StrikeSite;
  group: THREE.Group;
  env: THREE.Vector4;
  shift: THREE.Vector4;
  age: { value: number };
  cloud: THREE.Vector3;
  cloudGlow: THREE.Vector3;
  spotGlow: THREE.Vector3;
  top: THREE.Vector3;
  mid: THREE.Vector3;
}

export function create(ctx: Context): Piece {
  const pixel = { value: 0.0005 };
  const dither = { value: 0.5 };
  const quad = new THREE.PlaneGeometry(2, 2);
  const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide } as const;
  const wind = new THREE.Vector3(WIND[0], WIND[1], WIND[2]).multiplyScalar(WIND_SPEED / 26);

  const boltPicture = ctx.assets.texture('mat/bolt.jpg', { kind: 'colour', repeat: false, anisotropy: 8 });
  const bolts: Bolt[] = STRIKES.map((site, index) => {
    const rng = ctx.rng(`strikes/${site.id}`);
    const lines = figure(rng, site);
    const group = new THREE.Group();
    const env = new THREE.Vector4(0, 0, 0, 0);
    const shift = new THREE.Vector4(0, site.to[1], site.rise * 0.02, index);
    const channelUniforms = { ...ctx.rig.uniforms, uShift: { value: shift }, uPixel: pixel, uDither: dither, uEnv: { value: env }, uTint: { value: TINT }, uCore: { value: CORE } };
    const strip = channelGeometry(lines);
    const channel = new THREE.Mesh(strip, new THREE.ShaderMaterial({ vertexShader: CHANNEL_VERTEX, fragmentShader: SHEATH_FRAGMENT, uniforms: channelUniforms, ...additive }));
    channel.frustumCulled = false;
    channel.renderOrder = 6;
    const arc = new THREE.Mesh(strip, new THREE.ShaderMaterial({ vertexShader: CHANNEL_VERTEX, fragmentShader: CORE_FRAGMENT, uniforms: channelUniforms, side: THREE.DoubleSide }));
    arc.frustumCulled = false;
    // The computed channel is kept for the way it lights the air about it; the photograph is the stroke that is seen.
    channel.visible = false;
    arc.visible = false;
    group.add(channel, arc);

    const main = (lines[0] as Line).points;
    const topAt = main[0] as [number, number, number];
    const midAt = main[Math.floor(main.length * 0.86)] as [number, number, number];
    const top = new THREE.Vector3(topAt[0], topAt[1], topAt[2]);
    const mid = new THREE.Vector3(midAt[0], midAt[1], midAt[2]);
    const tip = new THREE.Vector3(site.to[0], site.to[1], site.to[2]);

    // The glow where the channel enters the cloud, and the white-hot spot at the tip.
    const cloudGlow = new THREE.Vector3();
    const cloud = new THREE.Mesh(quad, new THREE.ShaderMaterial({ vertexShader: HALO_VERTEX, fragmentShader: HALO_FRAGMENT, uniforms: { ...ctx.rig.uniforms, uDither: dither, uAt: { value: top }, uSize: { value: new THREE.Vector2(site.rise * 0.2, site.rise * 0.12) }, uColour: { value: cloudGlow }, uSharp: { value: 0 } }, ...additive }));
    cloud.frustumCulled = false;
    cloud.renderOrder = 5;
    const spotGlow = new THREE.Vector3();
    const spot = new THREE.Mesh(quad, new THREE.ShaderMaterial({ vertexShader: HALO_VERTEX, fragmentShader: HALO_FRAGMENT, uniforms: { ...ctx.rig.uniforms, uDither: dither, uAt: { value: tip }, uSize: { value: new THREE.Vector2(15, 15) }, uColour: { value: spotGlow }, uSharp: { value: 1 } }, side: THREE.DoubleSide }));
    spot.frustumCulled = false;
    // The glow of the cloud round the channel is drawn by the air folder from the rig's lights; this one stays off.
    cloud.visible = false;
    group.add(cloud, spot);
    const card = new THREE.Mesh(quad, new THREE.ShaderMaterial({ vertexShader: CARD_VERTEX, fragmentShader: CARD_FRAGMENT, uniforms: { ...ctx.rig.uniforms, tBolt: { value: boltPicture }, uTop: { value: top }, uTip: { value: tip }, uShift: { value: shift }, uEnv: { value: env }, uTint: { value: TINT }, uCore: { value: CORE } }, side: THREE.DoubleSide }));
    card.frustumCulled = false;
    group.add(card);

    // The spray of glowing fragments.
    const age = { value: -1 };
    const seeds = new Float32Array(SPARKS * 4);
    const go = new Float32Array(SPARKS * 3);
    for (let i = 0; i < SPARKS; i++) {
      seeds.set([rng.next(), rng.next(), rng.next(), rng.next()], i * 4);
      const az = rng.range(0, Math.PI * 2);
      const up = rng.range(-0.35, 1);
      const speed = rng.range(150, 800) * (rng.next() < 0.2 ? 1.8 : 1);
      const flat = Math.sqrt(Math.max(0, 1 - up * up));
      go.set([Math.cos(az) * flat * speed, up * speed, Math.sin(az) * flat * speed], i * 3);
    }
    const sparkGeometry = new THREE.InstancedBufferGeometry();
    sparkGeometry.index = quad.index;
    sparkGeometry.setAttribute('position', quad.getAttribute('position'));
    sparkGeometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
    sparkGeometry.setAttribute('aGo', new THREE.InstancedBufferAttribute(go, 3));
    sparkGeometry.instanceCount = SPARKS;
    const sparks = new THREE.Mesh(sparkGeometry, new THREE.ShaderMaterial({ vertexShader: SPOT_VERTEX, fragmentShader: SPOT_FRAGMENT, uniforms: { ...ctx.rig.uniforms, uDither: dither, uAt: { value: tip }, uAge: age, uPixel: pixel, uGale: { value: wind }, uGlow: { value: 90 } }, side: THREE.DoubleSide }));
    sparks.frustumCulled = false;
    group.add(sparks);

    group.visible = false;
    ctx.scene.add(ctx.parts.built(site.id, group));
    return { site, group, env, shift, age, cloud: top, cloudGlow, spotGlow, top, mid };
  });

  // Two lights of the rig: the channel over the struck tip, and the cloud lit from inside where the channel enters it.
  const channelLight = { position: new THREE.Vector3(), radius: 220, radiance: new THREE.Vector3() };
  const cloudLight = { position: new THREE.Vector3(), radius: 380, radiance: new THREE.Vector3() };
  // And two along the channel between them, small, so that whatever draws the cloud can glow along the whole stroke.
  const alongLights = [0.3, 0.6].map(() => ({ position: new THREE.Vector3(), radius: 110, radiance: new THREE.Vector3() }));
  ctx.rig.emitters.push(channelLight, cloudLight, ...alongLights);

  // What a strike leaves on a tip: the rime flashes to steam and the gale carries it off. The air folder draws it; a strike only says how much.
  const puffs: { source: SteamSource; strikes: number[] }[] = [];
  STRIKES.forEach((site) => {
    for (const tip of site.branch ? [site.to, site.branch] : [site.to]) {
      let puff = puffs.find((p) => Math.hypot(p.source.at[0] - tip[0], p.source.at[2] - tip[2]) < 1);
      if (!puff) {
        puff = { source: { at: [tip[0], tip[1] + 1.5, tip[2]], radius: 5, strength: 0, rise: 170, kind: 'steam' }, strikes: [] };
        puffs.push(puff);
        ctx.sources.steam.push(puff.source);
      }
      puff.strikes.push(site.seconds);
    }
  });

  const size = new THREE.Vector2();
  let height = 0;
  return {
    setTime: (seconds) => {
      dither.value = ditherAt(seconds);
      for (const p of puffs) {
        let most = 0;
        // It bursts out in a fifth of a second and thins over the next six.
        for (const at of p.strikes) if (seconds > at) most = Math.max(most, (1 - Math.exp(-(seconds - at) / 0.2)) * Math.exp(-(seconds - at) / 6));
        p.source.strength = most;
      }
      channelLight.radiance.set(0, 0, 0);
      cloudLight.radiance.set(0, 0, 0);
      for (const l of alongLights) l.radiance.set(0, 0, 0);
      for (const b of bolts) {
        const age = seconds - b.site.seconds;
        const live = age > -0.3 && age < 1.2;
        b.group.visible = live;
        if (!live) continue;
        const e = envelope(timingOf(b.site.id), age);
        b.env.set(e.main, e.branch, e.after, e.leader);
        b.shift.x = strokeAt(timingOf(b.site.id), age);
        b.age.value = age;
        // Sheet lightning inside the cloud in the quarter second before the stroke, then the stroke itself.
        const before = age < 0 ? 0.05 * Math.max(0, Math.sin((age + 0.3) * 31) * Math.sin((age + 0.3) * 10.5)) * (1 + age / 0.3) : 0;
        // After the last stroke the light does not cut off: the channel cools and the cloud holds it for half a second.
        const tail = age > 0 ? 0.1 * Math.exp(-age / 0.22) * (1 - Math.exp(-age / 0.02)) : 0;
        const power = e.main + e.after;
        b.cloudGlow.copy(TINT).multiplyScalar((power * 0.9 + before) * 0.4);
        b.spotGlow.set(1, 0.93, 1).multiplyScalar(Math.min(power, 1) * 220 + e.after * 400);
        if (power + before + tail > 1e-4) {
          channelLight.position.copy(b.mid);
          channelLight.radiance.copy(TINT).multiplyScalar(CAST * (power + tail));
          alongLights.forEach((l, n) => {
            l.position.lerpVectors(b.top, b.mid, n === 0 ? 0.3 : 0.65);
            l.radiance.copy(TINT).multiplyScalar(CAST * 0.5 * (power + tail));
          });
          cloudLight.position.copy(b.top);
          cloudLight.radiance.copy(TINT).multiplyScalar(CAST * 0.35 * (power + tail * 2 + before * 4));
        }
      }
    },
    beforeSample: (renderer, camera) => {
      renderer.getDrawingBufferSize(size);
      pixel.value = 2 / ((camera.projectionMatrix.elements[5] as number) * (height || size.y || 2160));
    },
    resize: (_w, h) => {
      height = h;
    },
  };
}
