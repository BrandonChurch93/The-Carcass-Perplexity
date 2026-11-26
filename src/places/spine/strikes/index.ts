// The lightning: six strikes, each on its accent of the music. A strike is a photograph of a stroke stood between the cloud and a spire's tip, a
// white-hot spot and a spray of fragments where it lands, steam off the tip, and four lights of the rig for as long as it burns.
import * as THREE from 'three';
import type { Context, Piece, SteamSource } from '../shared/context';
import { RIG_UNIFORMS_GLSL } from '../shared/glsl';
import { breakdown, envelope, figure, strokeAt, timingOf, type Line } from './bolt';
import { WIND, WIND_SPEED, strikeTip } from '../shared/anchors';
import { STRIKES, type StrikeSite } from './where';

export const PARTS: readonly string[] = STRIKES.map((s) => s.id);

/** Scene-linear radiance of the channel's core at the peak of a stroke, and of the light it casts. */
const CORE = 1500;
const CAST = 4600;
const TINT = new THREE.Vector3(0.62, 0.5, 1);
/** What the flash of a first stroke gives a face that looks at the channel from close by, as irradiance: the dusk gives level snow about 0.25. */
const FLASH = 3.2;
/** Each strike's share of it, in order: the one the place opens on is the brightest, and no two that follow each other are alike. */
const FLASH_OF = [1, 0.7, 0.8, 0.75, 0.6, 0.85];
const SPARKS = 90;
/** The light at the struck tip: its radius in metres and its radiance at the peak of a stroke. */
const TIP_RADIUS = 8;
const TIP_CAST = 300000;
/** Half the breadth of the card the white-hot spot at the tip is drawn on, metres. */
const SPOT = 0.9;
/** The air round the arc is violet; its heart is white with a breath of it. */
const HEART = new THREE.Vector3(0.78, 0.66, 1);
/** The photographs of a stroke, and for each where its channel leaves the top and meets the foot (shares of its width) and where its foot is. */
const PICTURES: { file: string; lean: [number, number, number] }[] = [
  { file: 'mat/bolt.jpg', lean: [0.537, 0.466, 0] },
  { file: 'mat/bolt-b.jpg', lean: [0.545, 0.285, 0.02] },
  { file: 'mat/bolt-c.jpg', lean: [0.478, 0.476, 0] },
];
/** Which photograph each strike is, in order: no two that follow each other are the same. */
const WHICH = [1, 2, 1, 0, 2, 1];

// The stroke itself is a photograph of one, stood between the cloud and the tip and turned to the lens. Each return stroke takes the
// picture another way round, so the channel changes its path between them.
const CARD_VERTEX = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uTip;
uniform vec4 uShift;
uniform vec3 uLean;
uniform float uLens;
varying vec2 vUv;
varying float vWay;
varying float vNear;
varying float vFoot;
void main() {
  vec3 a = uTip - uTop;
  float len = length(a);
  vec3 mid = 0.5 * (uTip + uTop);
  vec3 side = normalize(cross(a, cameraPosition - mid));
  // uShift.x: which return stroke; uShift.w: which strike. A strike keeps its channel for all its strokes (the later ones only
  // shiver in it); no two strikes take the picture the same way round.
  float n = uShift.x;
  float flip = mod(uShift.w, 2.0) < 0.5 ? 1.0 : -1.0;
  float v = 0.5 + 0.5 * position.y;
  // The picture's stroke leaves its top and reaches its foot a little off the middle; it is brought back onto the line.
  float lean = mix(uLean.x, uLean.y, v) - 0.5;
  float wander = (0.006 * sin(v * 23.0 + n * 2.1) + 0.011 * sin(v * 7.7 + n * 4.3) + 0.004 * sin(v * 51.0 + n * 5.7)) * sin(v * 3.14159) * min(n, 1.0);
  vUv = vec2(0.5 + flip * (0.5 * position.x) + lean + wander, mix(uLean.z, 1.0, v));
  vWay = 1.0 - v;
  vFoot = v * len;
  vec3 p = mix(uTip, uTop, v) + side * (position.x * 0.5 * len * 0.5628);
  vec4 c = viewMatrix * vec4(p, 1.0);
  // How many pixels of a 4K frame one pixel of the photograph covers: a long lens is close to the stroke and sees the photograph's grain.
  vNear = (len / 1672.0) / max(uLens * -c.z, 1e-6);
  gl_Position = projectionMatrix * c;
}`;

const CARD_FRAGMENT = /* glsl */ `
${RIG_UNIFORMS_GLSL}
uniform sampler2D tBolt;
uniform vec4 uEnv;
uniform vec3 uTint;
uniform vec3 uHeart;
uniform float uCore;
varying vec2 vUv;
varying float vWay;
varying float vNear;
varying float vFoot;
// The least of the photograph in a ring round a point: bright only where the channel is broader than the ring.
float ringOf(vec2 uv, float r) {
  vec2 px = vec2(r / 941.0, r / 1672.0);
  float m = min(texture2D(tBolt, uv + px * vec2(1.0, 0.0)).g, texture2D(tBolt, uv - px * vec2(1.0, 0.0)).g);
  m = min(m, min(texture2D(tBolt, uv + px * vec2(0.707, 0.707)).g, texture2D(tBolt, uv - px * vec2(0.707, 0.707)).g));
  m = min(m, min(texture2D(tBolt, uv + px * vec2(0.707, -0.707)).g, texture2D(tBolt, uv - px * vec2(0.707, -0.707)).g));
  return min(m, min(texture2D(tBolt, uv + px * vec2(0.0, 1.0)).g, texture2D(tBolt, uv - px * vec2(0.0, 1.0)).g));
}
void main() {
  if (vUv.x < 0.0 || vUv.x > 1.0) discard;
  vec3 pic = texture2D(tBolt, vUv).rgb;
  float lum = max(pic.r, max(pic.g, pic.b));
  // The stroke lights the whole figure, its fine branches too; as it dies the branches go first and the core thins, and before it the
  // leader is a dim thread on its way down. The picture's glow is left out: only the channel is drawn, thin, and what is round it is
  // lit by the rig. Where the picture is bright over a breadth (the main channel) only its heart is kept; a branch is kept whole.
  float px = 1.0 / 941.0;
  float broad = 0.25 * (texture2D(tBolt, vUv + vec2(5.0 * px, 0.0)).g + texture2D(tBolt, vUv - vec2(5.0 * px, 0.0)).g + texture2D(tBolt, vUv + vec2(0.0, 5.0 * px)).g + texture2D(tBolt, vUv - vec2(0.0, 5.0 * px)).g);
  // The branches burn with the first stroke and are half found again by the later ones; the main channel carries them all.
  float thin = 1.0 - smoothstep(0.06, 0.22, broad);
  float lit = mix(uEnv.x, uEnv.y + 0.12 * uEnv.x, thin);
  float lead = 0.06 * (1.0 - smoothstep(uEnv.w - 0.04, uEnv.w, vWay)) * step(uEnv.w, 0.999);
  float strength = min(lit + lead, 1.5);
  float need = max(mix(0.13, 0.5, 1.0 - thin), 0.033 / max(strength, 1e-3));
  if (lum < need || strength < 0.002) discard;
  // Thin, with a hot core: the air round the arc is violet and no brighter than a lit cloud, and only the heart of the channel burns, far
  // over white, so that the lens blooms round it and not round its sheath.
  float heart = smoothstep(need + 0.12, min(need + 0.55, 1.0), lum);
  float burn = min(strength * 3.0, 1.0);
  vec3 far = uTint * (2.5 + 6.0 * lum) + uHeart * (uCore * heart * heart * heart);
  // Seen through a long lens the photograph's channel is metres broad. There only its middle burns: the channel is worn down from
  // its edges, what is left is the core, and round it the sheath is violet air that falls off to nothing at the photograph's edge.
  float near = smoothstep(1.5, 4.0, vNear);
  vec3 c = far;
  if (near > 0.0) {
    float edge = smoothstep(need, need + 0.35, lum);
    // Where it meets the rock the channel is less worn: it is broad and white over its last metres.
    float worn = mix(0.3, 0.62, smoothstep(1.0, 16.0, vFoot));
    float d1 = smoothstep(0.5, 0.85, ringOf(vUv, 1.3 * worn));
    float d2 = smoothstep(0.5, 0.85, ringOf(vUv, 2.5 * worn));
    float d3 = smoothstep(0.55, 0.9, ringOf(vUv, 3.4 * worn));
    vec3 close = uTint * (0.3 + 0.5 * edge * edge + 0.9 * d1) + uHeart * (30.0 * d2 + uCore * d3);
    // A branch is a thread too fine to wear down: it keeps a pale heart of its own.
    close += uHeart * (10.0 * thin * heart * heart);
    c = mix(far, close, near);
    if (near > 0.5 && edge < 0.3) discard;
  }
  c *= burn;
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
  // It is seen for a few frames and no longer: under a sixth of a second.
  float life = 0.05 + 0.1 * aSeed.x;
  float t = max(uAge - 0.01 * aSeed.y, 0.0);
  float drag = 1.0 - exp(-t * 6.0);
  vec3 p = uAt + aGo * (drag / 6.0) + vec3(0.0, -4.9 * t * t, 0.0) + uGale * (t * t * 6.0);
  vec3 v = aGo * exp(-t * 6.0) + vec3(0.0, -9.8 * t, 0.0) + uGale * (t * 12.0);
  vec4 c = viewMatrix * vec4(p, 1.0);
  vec3 along = (viewMatrix * vec4(v, 0.0)).xyz;
  float far = -c.z;
  float size = max(0.05 + 0.09 * aSeed.z, (0.7 + 0.7 * aSeed.z) * uPixel * far);
  // A streak as long as the fragment flies while the shutter is open.
  vec2 dir = normalize(along.xy + vec2(1e-4));
  float reach = max(size, min(length(along.xy) * 0.0042, size * 9.0));
  c.xy += dir * position.x * reach + vec2(-dir.y, dir.x) * position.y * size;
  vUv = position.xy;
  vHeat = (uAge <= 0.0 || t <= 0.0) ? 0.0 : exp(-t / (0.5 * life)) * (1.0 - smoothstep(life * 0.8, life, t)) * (0.4 + 0.6 * aSeed.w) * min(1.0, 0.5 / (reach / size) + 0.5);
  gl_Position = projectionMatrix * c;
}`;

const SPOT_FRAGMENT = /* glsl */ `
${RIG_UNIFORMS_GLSL}
uniform float uGlow;
varying vec2 vUv;
varying float vHeat;
void main() {
  float r = length(vUv);
  float a = exp(-vUv.y * vUv.y * 3.0) * (1.0 - smoothstep(0.5, 1.0, abs(vUv.x))) * (1.0 - smoothstep(0.8, 1.0, r));
  // Hot rock: white at first, orange as it cools.
  vec3 c = mix(vec3(1.0, 0.3, 0.05), vec3(1.0, 0.8, 0.55), smoothstep(0.45, 1.0, vHeat));
  // A fragment is there or it is not: no pattern of dots.
  if (uGlow * vHeat * a < 0.5) discard;
  gl_FragColor = vec4(c * (uGlow * vHeat * a) * (1.0 - uSolo), 1.0);
}`;

/** The bloom at the struck tip: its radius in pixels of a 4K frame, and the glare's radiance as a share of the hot spot's. */
const BLOOM_PIXELS = 150;
const BLOOM_GLARE = 0.006;
const HALO_VERTEX = /* glsl */ `
#define BLOOM_PIXELS ${BLOOM_PIXELS.toFixed(1)}
uniform vec3 uAt;
uniform vec2 uSize;
uniform float uLens;
varying vec2 vUv;
void main() {
  vec4 c = viewMatrix * vec4(uAt, 1.0);
  // Brought toward the lens, so that the rock it sits on does not hide it and the glare lies over the top of the spire.
  c.z += 40.0;
  // The bloom is the lens's: as wide in the frame whatever the lens, never smaller than the hot spot itself.
  c.xy += position.xy * max(uSize, vec2(BLOOM_PIXELS * uLens * -c.z));
  vUv = position.xy;
  gl_Position = projectionMatrix * c;
}`;

const HALO_FRAGMENT = /* glsl */ `
#define BLOOM_GLARE ${BLOOM_GLARE.toFixed(4)}
${RIG_UNIFORMS_GLSL}
uniform vec3 uColour;
varying vec2 vUv;
void main() {
  // The white-hot spot where the channel meets the rock: small, solid at its heart. Its bloom is the air's, lit by the rig's light at the tip.
  float r = length(vUv);
  // White where the channel lands, burning out the tip under it; round that the glare the lens makes of it, violet, falling to nothing
  // inside the card. It hides what is behind it only as far as it outshines it.
  float core = exp(-r * r * 700.0);
  float fall = (1.0 - r) * (1.0 - r);
  float glare = fall / (1.0 + r * r * 14.0);
  float power = max(uColour.r, max(uColour.g, uColour.b));
  if (r >= 1.0 || power < 1.0) discard;
  vec3 c = uColour * core + vec3(0.64, 0.5, 1.0) * (power * BLOOM_GLARE * glare);
  // Light added to what is behind it; where it is white hot it hides it.
  float cover = clamp(dot(c, vec3(0.333)) / 4.0 - 0.25, 0.0, 1.0);
  gl_FragColor = vec4(c, cover) * (1.0 - uSolo);
}`;

interface Bolt {
  site: StrikeSite;
  group: THREE.Group;
  env: THREE.Vector4;
  shift: THREE.Vector4;
  age: { value: number };
  spotGlow: THREE.Vector3;
  top: THREE.Vector3;
  /** Where the flash is cast from: a point low on the channel. */
  cast: THREE.Vector3;
  mid: THREE.Vector3;
  tip: THREE.Vector3;
}

export function create(ctx: Context): Piece {
  const pixel = { value: 0.0005 };
  const lens = { value: 0.0005 };
  const quad = new THREE.PlaneGeometry(2, 2);
  const wind = new THREE.Vector3(WIND[0], WIND[1], WIND[2]).multiplyScalar(WIND_SPEED / 26);

  const boltPictures = PICTURES.map((p) => ctx.assets.texture(p.file, { kind: 'colour', repeat: false, anisotropy: 8 }));
  const bolts: Bolt[] = STRIKES.map((site, index) => {
    const rng = ctx.rng(`strikes/${site.id}`);
    const lines = figure(rng, site);
    const group = new THREE.Group();
    const env = new THREE.Vector4(0, 0, 0, 0);
    const shift = new THREE.Vector4(0, site.to[1], site.rise * 0.02, index);
    const main = (lines[0] as Line).points;
    const topAt = main[0] as [number, number, number];
    const midAt = main[Math.floor(main.length * 0.86)] as [number, number, number];
    const top = new THREE.Vector3(topAt[0], topAt[1], topAt[2]);
    const mid = new THREE.Vector3(midAt[0], midAt[1], midAt[2]);
    const tip = new THREE.Vector3(site.to[0], site.to[1], site.to[2]);

    // The white-hot spot at the tip. The glow of the cloud round the channel is drawn by the air folder from the rig's lights.
    const spotGlow = new THREE.Vector3();
    const spot = new THREE.Mesh(quad, new THREE.ShaderMaterial({ vertexShader: HALO_VERTEX, fragmentShader: HALO_FRAGMENT, uniforms: { ...ctx.rig.uniforms, uAt: { value: tip }, uSize: { value: new THREE.Vector2(SPOT, SPOT) }, uColour: { value: spotGlow }, uLens: lens }, side: THREE.DoubleSide, transparent: true, premultipliedAlpha: true, depthWrite: false }));
    spot.renderOrder = 11;
    spot.frustumCulled = false;
    group.add(spot);
    const card = new THREE.Mesh(quad, new THREE.ShaderMaterial({ vertexShader: CARD_VERTEX, fragmentShader: CARD_FRAGMENT, uniforms: { ...ctx.rig.uniforms, tBolt: { value: boltPictures[WHICH[index % WHICH.length] as number] }, uLean: { value: new THREE.Vector3(...(PICTURES[WHICH[index % WHICH.length] as number] as (typeof PICTURES)[number]).lean) }, uTop: { value: top }, uTip: { value: tip }, uShift: { value: shift }, uEnv: { value: env }, uTint: { value: TINT }, uHeart: { value: HEART }, uCore: { value: CORE }, uLens: lens }, side: THREE.DoubleSide }));
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
      const speed = rng.range(40, 160) * (rng.next() < 0.2 ? 1.8 : 1);
      const flat = Math.sqrt(Math.max(0, 1 - up * up));
      go.set([Math.cos(az) * flat * speed, up * speed, Math.sin(az) * flat * speed], i * 3);
    }
    const sparkGeometry = new THREE.InstancedBufferGeometry();
    sparkGeometry.index = quad.index;
    sparkGeometry.setAttribute('position', quad.getAttribute('position'));
    sparkGeometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
    sparkGeometry.setAttribute('aGo', new THREE.InstancedBufferAttribute(go, 3));
    sparkGeometry.instanceCount = SPARKS;
    const sparks = new THREE.Mesh(sparkGeometry, new THREE.ShaderMaterial({ vertexShader: SPOT_VERTEX, fragmentShader: SPOT_FRAGMENT, uniforms: { ...ctx.rig.uniforms, uAt: { value: tip }, uAge: age, uPixel: pixel, uGale: { value: wind }, uGlow: { value: 90 } }, side: THREE.DoubleSide }));
    sparks.frustumCulled = false;
    group.add(sparks);

    group.visible = false;
    ctx.scene.add(ctx.parts.built(site.id, group));
    const cast = new THREE.Vector3().lerpVectors(tip, top, 0.28);
    return { site, group, env, shift, age, spotGlow, top, cast, mid, tip };
  });

  // Two lights of the rig: the channel over the struck tip, and the cloud lit from inside where the channel enters it.
  const channelLight = { position: new THREE.Vector3(), radius: 220, radiance: new THREE.Vector3() };
  const cloudLight = { position: new THREE.Vector3(), radius: 380, radiance: new THREE.Vector3() };
  // And two along the channel between them, small, so that whatever draws the cloud can glow along the whole stroke.
  const alongLights = [0.3, 0.6].map(() => ({ position: new THREE.Vector3(), radius: 110, radiance: new THREE.Vector3() }));
  // And one at the struck tip, small and fierce: the bloom of the air round the hot spot, and the light on the rock, the rime and the
  // ribbons close to it.
  const tipLight = { position: new THREE.Vector3(), radius: TIP_RADIUS, radiance: new THREE.Vector3() };
  ctx.rig.emitters.push(channelLight, cloudLight, ...alongLights, tipLight);
  // And the flash itself: the one light with direction and shadow (shared/glsl.ts), from a point low on the channel.
  const flashAt = (ctx.rig.uniforms.uStrikeAt as THREE.IUniform<THREE.Vector4>).value;
  const flashTip = (ctx.rig.uniforms.uStrikeTip as THREE.IUniform<THREE.Vector4>).value;
  const flashTop = (ctx.rig.uniforms.uStrikeTop as THREE.IUniform<THREE.Vector4>).value;

  // What a strike leaves on a tip: the rime flashes to steam and the gale carries it off. The air folder draws it; a strike only says how much.
  const puffs: { source: SteamSource; strikes: number[] }[] = [];
  STRIKES.forEach((site) => {
    for (const tip of site.branch ? [site.to, site.branch] : [site.to]) {
      let puff = puffs.find((p) => Math.hypot(p.source.at[0] - tip[0], p.source.at[2] - tip[2]) < 1);
      if (!puff) {
        // The tip the long lens watches is seen from 1650 m in a field 250 m wide: its fume is small and dense, a torn puff that leaves the tip.
        const close = Math.hypot(tip[0] - strikeTip[0], tip[2] - strikeTip[2]) < 1;
        puff = { source: { at: [tip[0], tip[1] + 1.5, tip[2]], radius: close ? 4 : 12, strength: 0, rise: close ? 34 : 260, kind: 'steam' }, strikes: [] };
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
      for (const p of puffs) {
        let most = 0;
        // It bursts out with the stroke and thins over the next six seconds.
        for (const at of p.strikes) if (seconds > at) most = Math.max(most, (1 - Math.exp(-(seconds - at) / 0.04)) * Math.exp(-(seconds - at) / 6));
        p.source.strength = most;
      }
      channelLight.radiance.set(0, 0, 0);
      cloudLight.radiance.set(0, 0, 0);
      tipLight.radiance.set(0, 0, 0);
      for (const l of alongLights) l.radiance.set(0, 0, 0);
      flashAt.set(0, 0, 0, 0);
      bolts.forEach((b, index) => {
        const age = seconds - b.site.seconds;
        const live = age > -0.3 && age < 1.2;
        b.group.visible = live;
        if (!live) return;
        const e = envelope(timingOf(b.site.id), age);
        b.env.set(e.main, e.branch, e.after, e.leader);
        b.shift.x = strokeAt(timingOf(b.site.id), age);
        b.age.value = age;
        // Light inside the cloud before the stroke, then the stroke itself.
        const before = breakdown(age);
        // Between the strokes the channel, the tip and the land are dark: only the cloud keeps a dull glow.
        const tail = e.after;
        const power = e.main;
        b.spotGlow.set(1, 0.93, 1).multiplyScalar(Math.min(power, 1) * 120);
        if (power > 0) {
          flashAt.set(b.cast.x, b.cast.y, b.cast.z, FLASH * (FLASH_OF[index % FLASH_OF.length] as number) * power);
          flashTip.set(b.tip.x, b.tip.y, b.tip.z, 0);
          flashTop.set(b.top.x, b.top.y, b.top.z, 0);
        }
        if (power + before + tail > 1e-4) {
          channelLight.position.copy(b.mid);
          channelLight.radiance.copy(TINT).multiplyScalar(CAST * power);
          alongLights.forEach((l, n) => {
            l.position.lerpVectors(b.top, b.mid, n === 0 ? 0.3 : 0.65);
            l.radiance.copy(TINT).multiplyScalar(CAST * 0.5 * power);
          });
          tipLight.position.copy(b.tip);
          tipLight.position.y += 2;
          tipLight.radiance.copy(TINT).multiplyScalar(TIP_CAST * power);
          cloudLight.position.copy(b.top);
          cloudLight.radiance.copy(TINT).multiplyScalar(CAST * 0.35 * (power + tail * 2 + before * 3));
        }
      });
    },
    beforeSample: (renderer, camera) => {
      renderer.getDrawingBufferSize(size);
      pixel.value = 2 / ((camera.projectionMatrix.elements[5] as number) * (height || size.y || 2160));
      lens.value = 2 / ((camera.projectionMatrix.elements[5] as number) * 2160);
    },
    resize: (_w, h) => {
      height = h;
    },
  };
}
