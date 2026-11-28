// The lightning: six strikes, each on its accent of the music. A strike is a channel between the cloud and a spire's tip (channel.ts), the
// cloud about its root lit from inside, a white-hot spot and a spray of fragments where it lands, steam off the tip, and four lights of
// the rig for as long as it burns.
import * as THREE from 'three';
import type { Context, Piece, SteamSource } from '../shared/context';
import { RIG_UNIFORMS_GLSL } from '../shared/glsl';
import { breakdown, envelope, figure, restruck, timingOf, type Line, type Strokes } from './bolt';
import { createChannel } from './channel';
import { UNIT, WIND, WIND_SPEED, carcassBody, carcassView, step, strikeTip } from '../shared/anchors';
import { cut, secondsInPlace } from '../../../film/cut';
import { STRIKES, during, type StrikeSite } from './where';

/** The fifth strike falls on the last frame of the long lens's shot, close before that lens: there its channel would stand as a white bar
 * across the frame for one frame. Until the cut only its light is seen; from inside the canal it is drawn. */
const FIFTH_FROM = during('spine-05').from;

export const PARTS: readonly string[] = STRIKES.map((s) => s.id);

/** Scene-linear radiance of the channel's core at the peak of a stroke, and of the light it casts. */
const CORE = 1500;
const CAST = 4600;
const TINT = new THREE.Vector3(0.62, 0.5, 1);
/** What the flash of a first stroke gives a face that looks at the channel from close by, as irradiance: the dusk gives level snow about 0.25. */
const FLASH = 3.2;
/** Each strike's share of it, in order: the one the place opens on is the brightest, and no two that follow each other are alike. */
const FLASH_OF = [5.5, 2.6, 0.9, 3.2, 0.6, 0.15];
/** Each strike's share of the light the cloud round its channel takes, of the narrow pulse that comes in by the canal's far mouth, and of
 * the round lights (the storm's even lift of the place, which a flash must not become): the sixth is seen from inside the hollow, where
 * the lift would fill the animals and the pulse is the picture. */
const CLOUD_OF = [1.6, 0.5, 0.8, 0.75, 0.45, 0.85];
const PULSE_OF = [1, 0.7, 0.8, 0.75, 0.45, 2.5];
const ROUND_OF = [0.25, 0.2, 0.2, 0.7, 0.02, 0.15];
/** The cloud comes up over the four frames before its stroke, to this share of the stroke's light in it. The sky answers a little
 * light with much, so the share is small. */
const PRE_CLOUD = 0.6;
/** Each strike's share of the light in the cloud about its root. */
const ROOT_OF = [1, 0.8, 0.9, 0.8, 0.7, 0.8];
/** The glow in the cloud before the first stroke, as a share of the breakdown. */
const BEFORE_OF = [0.03, 0.03, 0.03, 0.03, 0.03, 0.06];
/** The one cloud of the storm that is lit from inside before the sixth strike, staged for the far mouth of the canal: where it
 * stands (high and to the right in the mouth, four kilometres off) and its light as a share of a stroke's. */
const INNER_AT = new THREE.Vector3(3444, 1295, 1776);
const INNER_GLOW = 0.02;
/** The breadth of that cloud's lit heart, from one end to the other, metres; what the cloud takes of its light and what comes in by
 * the mouth, as shares of a first stroke's. */
const INNER_SPAN = new THREE.Vector3(10, 40, 260);
const INNER_CLOUD = 0.5;
const INNER_PULSE = 1.1;
/** What the land takes of the cloud's rise before a stroke, as a share of the stroke's light. */
const LAND_RISE = 0.2;
/** The same for a stroke on the last frame of a shot, whose light swells into the cut (bolt.ts). */
const SWELL_LAND = 0.8;
/** What burns at the tip while the channel goes on burning, as a share of the channel's light. */
const BURN_OF_CHANNEL = 0.75;
const SPARKS = 44;
/** The least height over the struck tip from which each strike's flash is cast, metres. */
const CAST_UP = [480, 1100, 320, 110, 320, 320];
/** The light at the struck tip: its radius in metres and its radiance at the peak of a stroke. */
const TIP_RADIUS = 8;
const TIP_CAST = 300000;
/** Half the breadth of the card the white-hot spot at the tip is drawn on, metres. */
const SPOT = 0.9;
/** The air round the arc is violet; its heart is white with a breath of it. */
const HEART = new THREE.Vector3(0.78, 0.66, 1);
/** The cloud about the root of a channel, lit from inside by it: how broad the lit cloud stands, metres, and its radiance at the
 * first stroke. It is a picture of lit cloud and of nothing else, laid where the channel enters the cloud: black where no light is. */
/** The fume a stroke flashes off the watched tip: how broad it stands, metres, and its radiance in a stroke's light. */
const FUME_WIDE = 30;
const FUME_GLOW = 0.5;
const ROOT_WIDE = 1500;
const ROOT_GLOW = 1.1;
/** A strike far off in the storm, which the lens beside the dead one sees over the saddle (key spine-1): it comes to ground beyond the
 * last spires, lights the cloud about its own head and nothing on the ridge. Where it stands from that lens: degrees to the right of
 * its heading, metres off, metres over and under the lens for its head and its foot; and its two strokes, the second on the key. */
const FAR_BEARING = 6.6;
const FAR_OFF = 9000;
const FAR_HEAD = 1250;
const FAR_FOOT = -260;
const FAR_STROKES: Strokes = { hold: 3 / 60, fore: null };
const FAR_WIDE = 1150;
/** Nine kilometres of the storm's air stand before it: its heart is violet, not white, and a tenth as hot. */
const FAR_HEART = new THREE.Vector3(0.62, 0.47, 1);
const FAR_CORE = 110;
const ROOT_VERTEX = /* glsl */ `
uniform vec3 uAt;
uniform vec4 uLay;
varying vec2 vUv;
varying vec2 vOff;
void main() {
  vec4 c = viewMatrix * vec4(uAt, 1.0);
  // Turned a little for each strike, so that no two strikes light the same cloud.
  vec2 q = vec2(position.x * uLay.x, position.y * uLay.x * 0.5628);
  c.xy += vec2(q.x * cos(uLay.y) - q.y * sin(uLay.y), q.x * sin(uLay.y) + q.y * cos(uLay.y));
  vUv = vec2(0.5 + 0.5 * position.x * uLay.z, 0.5 + 0.5 * position.y);
  vOff = position.xy;
  gl_Position = projectionMatrix * c;
}`;
const ROOT_FRAGMENT = /* glsl */ `
${RIG_UNIFORMS_GLSL}
uniform sampler2D tRoot;
uniform vec3 uGlow;
// x: how far the light has died since the stroke, 0 to 1; y: which stroke lit it.
uniform vec2 uDie;
varying vec2 vUv;
varying vec2 vOff;
void main() {
  // Each stroke lights the cloud from another side, and as the light dies it draws in toward the root: the picture is turned for each
  // stroke and read closer and a little aside as it sinks, so no two frames show one shape.
  float turn = 1.9 * uDie.y + 0.35 * uDie.x;
  vec2 o = (vUv - 0.5) * (1.0 - 0.3 * uDie.x);
  vec2 uv = 0.5 + vec2(o.x * cos(turn) - o.y * sin(turn), o.x * sin(turn) + o.y * cos(turn)) + vec2(0.05, -0.03) * uDie.x;
  vec3 pic = texture2D(tRoot, uv).rgb;
  // The picture is black along its edges; the card's own edge is taken out besides.
  float edge = (1.0 - smoothstep(0.7, 1.0, abs(vOff.x))) * (1.0 - smoothstep(0.7, 1.0, abs(vOff.y)));
  // The brightest of it burns out about the root; its dim billows stay dim, so the cloud keeps its shapes in the light.
  float lum = dot(pic, vec3(0.3, 0.5, 0.2));
  // The dim billows far from the root go dark first.
  float keep = smoothstep(0.0, 0.45, lum * (1.25 - 0.75 * length(vOff)) - 0.5 * uDie.x);
  vec3 c = pic * (0.35 + 1.6 * lum) * uGlow * (edge * mix(1.0, keep, min(1.0, 3.0 * uDie.x)));
  // It is violet to its heart: the brightest of it closes on a ceiling and keeps its colour, where added whole it burned out white.
  float most = max(c.r, max(c.g, c.b));
  c *= 1.0 / (1.0 + max(most - 0.06, 0.0) / 0.1);
  gl_FragColor = vec4(c * (1.0 - uSolo), 0.0);
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
  // It is seen for some frames and no longer: under half a second, most of them for a fifth.
  float life = 0.09 + 0.34 * aSeed.x * aSeed.x;
  float t = max(uAge - 0.01 * aSeed.y, 0.0);
  float drag = 1.0 - exp(-t * 1.5);
  vec3 p = uAt + aGo * (drag / 1.5) + vec3(0.0, -4.9 * t * t, 0.0) + uGale * (t * t * 6.0);
  vec3 v = aGo * exp(-t * 1.5) + vec3(0.0, -9.8 * t, 0.0) + uGale * (t * 12.0);
  vec4 c = viewMatrix * vec4(p, 1.0);
  vec3 along = (viewMatrix * vec4(v, 0.0)).xyz;
  float far = -c.z;
  float size = max(0.06 + 0.1 * aSeed.z, (0.7 + 0.7 * aSeed.z) * uPixel * far);
  // A streak as long as the fragment flies while the shutter is open.
  vec2 dir = normalize(along.xy + vec2(1e-4));
  // (Short: drawn as long as they fly in a shutter they stood round the tip as pale dashes, a scribble.)
  float reach = max(size, min(length(along.xy) * 0.0042, size * 3.0));
  c.xy += dir * position.x * reach + vec2(-dir.y, dir.x) * position.y * size;
  vUv = position.xy;
  // A fragment far smaller than a pixel is not seen: from across the ridge the spray is no dot of light at the tip.
  float seen = clamp((0.05 + 0.09 * aSeed.z) / (uPixel * far) * 4.0 - 0.6, 0.0, 1.0);
  vHeat = (uAge <= 0.0 || t <= 0.0) ? 0.0 : seen * exp(-t / (0.5 * life)) * (1.0 - smoothstep(life * 0.8, life, t)) * (0.4 + 0.6 * aSeed.w) * min(1.0, 0.5 / (reach / size) + 0.5);
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
  vec3 c = mix(vec3(1.0, 0.3, 0.05), vec3(1.0, 0.56, 0.2), smoothstep(0.45, 1.0, vHeat));
  // A fragment is there or it is not: no pattern of dots.
  if (uGlow * vHeat * a < 0.35) discard;
  gl_FragColor = vec4(c * (uGlow * vHeat * a) * (1.0 - uSolo), 1.0);
}`;

/** The bloom at the struck tip: its radius in pixels of a 4K frame, and the glare's radiance as a share of the hot spot's. */
const BLOOM_PIXELS = 190;
const BLOOM_GLARE = 0.03;
const HALO_VERTEX = /* glsl */ `
#define BLOOM_PIXELS ${BLOOM_PIXELS.toFixed(1)}
uniform vec3 uAt;
uniform vec2 uSize;
uniform float uLens;
varying vec2 vUv;
varying float vNear;
void main() {
  vec4 c = viewMatrix * vec4(uAt, 1.0);
  // Brought toward the lens, so that the rock it sits on does not hide it and the glare lies over the top of the spire.
  c.z += 40.0;
  // The bloom is the lens's: as wide in the frame whatever the lens, never smaller than the hot spot itself.
  // (At its widest only where the lens stands close on the tip, fifteen pixels of a 4K frame to the metre: from across the ridge it
  // is under half as wide and its glare a sixth, a spark and no orb.)
  float near = clamp(1.0 / (uLens * -c.z * 15.0), 0.47, 1.0);
  vNear = (near - 0.47) / 0.53;
  c.xy += position.xy * max(uSize, vec2(BLOOM_PIXELS * near * uLens * -c.z));
  vUv = position.xy;
  gl_Position = projectionMatrix * c;
}`;

const HALO_FRAGMENT = /* glsl */ `
#define BLOOM_GLARE ${BLOOM_GLARE.toFixed(4)}
${RIG_UNIFORMS_GLSL}
uniform vec3 uColour;
varying vec2 vUv;
varying float vNear;
void main() {
  // The white-hot spot where the channel meets the rock: small, solid at its heart. Its bloom is the air's, lit by the rig's light at the tip.
  float r = length(vUv);
  // White where the channel lands, burning out the tip under it; round that the glare the lens makes of it, violet, falling to nothing
  // inside the card. It hides what is behind it only as far as it outshines it.
  // (Taller than wide and small: it is the foot of the channel swollen where it meets the rock. Round and larger it stood as a bead.)
  float core = exp(-(vUv.x * vUv.x * 900.0 + vUv.y * vUv.y * 560.0));
  // And the arc's own rays where it meets the rock: a few short uneven spikes, thin as the channel, no disc.
  float rays = 0.0;
  for (int k = 0; k < 5; k++) {
    float turn = 0.5 + 1.31 * float(k);
    vec2 d = vec2(cos(turn), sin(turn));
    float on = dot(vUv, d);
    float off = vUv.x * d.y - vUv.y * d.x;
    rays += exp(-off * off * 30000.0) * exp(-max(on, 0.0) * (9.0 + 5.0 * float(k))) * smoothstep(-0.005, 0.005, on);
  }
  core += 0.05 * rays;
  float fall = (1.0 - r) * (1.0 - r);
  float glare = fall / (1.0 + r * r * 14.0);
  float power = max(uColour.r, max(uColour.g, uColour.b));
  if (r >= 1.0 || power < 1.0) discard;
  vec3 c = uColour * core + vec3(0.64, 0.5, 1.0) * (power * BLOOM_GLARE * mix(0.17, 1.0, vNear) * glare);
  // Light added to what is behind it; where it is white hot it hides it.
  float cover = clamp(dot(c, vec3(0.333)) / 4.0 - 0.25, 0.0, 1.0);
  gl_FragColor = vec4(c, cover) * (1.0 - uSolo);
}`;

interface Bolt {
  site: StrikeSite;
  group: THREE.Group;
  /** The channel of the first stroke, with all its branches, and of the strokes that follow it, which take another way down. */
  first: THREE.Vector4;
  again: THREE.Vector4;
  againGroup: THREE.Group;
  firstGroup: THREE.Group;
  rootGlow: THREE.Vector3;
  rootDie: THREE.Vector2;
  age: { value: number };
  spotGlow: THREE.Vector3;
  fumeGlow: THREE.Vector3;
  fumeDie: THREE.Vector2;
  fumeAt: THREE.Vector3;
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

  const rootPicture = ctx.assets.texture('mat/litcloud.jpg', { kind: 'colour', repeat: false });
  // The far strike of key spine-1: a channel and the cloud about its head. It is drawn with the first strike's part.
  const farKey = (cut.keyFrames as Record<string, number>)['spine-1'];
  const farSeconds = farKey === undefined ? -1e9 : secondsInPlace(UNIT, farKey) - FAR_STROKES.hold;
  const farFoot = step(carcassBody, carcassView + FAR_BEARING, FAR_OFF, FAR_FOOT);
  const farSite: StrikeSite = { id: 'far', seconds: farSeconds, to: farFoot, rise: FAR_HEAD - FAR_FOOT, lean: [260, 0, -180], branch: null, spire: 0 };
  const farLines = figure(ctx.rng('strikes/far'), farSite);
  const farChannel = createChannel(farLines, ctx.rig.uniforms, lens, FAR_HEART, FAR_CORE, 1);
  const farGroup = new THREE.Group();
  farGroup.add(farChannel.group);
  const farGlow = new THREE.Vector3();
  const farDie = new THREE.Vector2();
  {
    const head = (farLines[0] as Line).points[0] as [number, number, number];
    const at = new THREE.Vector3(head[0], head[1], head[2]).lerp(new THREE.Vector3(farFoot[0], farFoot[1], farFoot[2]), 0.08);
    const card = new THREE.Mesh(quad, new THREE.ShaderMaterial({ vertexShader: ROOT_VERTEX, fragmentShader: ROOT_FRAGMENT, uniforms: { ...ctx.rig.uniforms, tRoot: { value: rootPicture }, uAt: { value: at }, uLay: { value: new THREE.Vector4(0.5 * FAR_WIDE, 0.2, -1, 0) }, uGlow: { value: farGlow }, uDie: { value: farDie } }, side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor }));
    card.renderOrder = 11;
    card.frustumCulled = false;
    farGroup.add(card);
  }
  farGroup.visible = false;
  ctx.scene.add(farGroup);

  const bolts: Bolt[] = STRIKES.map((site, index) => {
    const rng = ctx.rng(`strikes/${site.id}`);
    const lines = figure(rng, site);
    const linesAgain = restruck(rng, site, lines);
    const group = new THREE.Group();
    const main = (lines[0] as Line).points;
    const topAt = main[0] as [number, number, number];
    const midAt = main[Math.floor(main.length * 0.86)] as [number, number, number];
    const top = new THREE.Vector3(topAt[0], topAt[1], topAt[2]);
    const mid = new THREE.Vector3(midAt[0], midAt[1], midAt[2]);
    const tip = new THREE.Vector3(site.to[0], site.to[1], site.to[2]);

    const firstChannel = createChannel(lines, ctx.rig.uniforms, lens, HEART, CORE, site.rise < 500 ? 8 : 1);
    const againChannel = createChannel(linesAgain, ctx.rig.uniforms, lens, HEART, CORE, site.rise < 500 ? 8 : 1);
    group.add(firstChannel.group, againChannel.group);

    // The cloud about the root. It stands a little under the channel's top, where the channel comes out of the cloud.
    const rootGlow = new THREE.Vector3();
    const rootDie = new THREE.Vector2();
    const rootAt = new THREE.Vector3().lerpVectors(top, tip, 0.05);
    const root = new THREE.Mesh(quad, new THREE.ShaderMaterial({ vertexShader: ROOT_VERTEX, fragmentShader: ROOT_FRAGMENT, uniforms: { ...ctx.rig.uniforms, tRoot: { value: rootPicture }, uAt: { value: rootAt }, uLay: { value: new THREE.Vector4(0.5 * ROOT_WIDE * Math.min(1, site.rise / 600), rng.range(-0.5, 0.5), index % 2 === 0 ? 1 : -1, 0) }, uGlow: { value: rootGlow }, uDie: { value: rootDie } }, side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor }));
    root.renderOrder = 11;
    root.frustumCulled = false;
    group.add(root);

    // The white-hot spot at the tip. The glow of the cloud round the channel is drawn by the air folder from the rig's lights.
    const spotGlow = new THREE.Vector3();
    const spot = new THREE.Mesh(quad, new THREE.ShaderMaterial({ vertexShader: HALO_VERTEX, fragmentShader: HALO_FRAGMENT, uniforms: { ...ctx.rig.uniforms, uAt: { value: tip }, uSize: { value: new THREE.Vector2(SPOT, SPOT) }, uColour: { value: spotGlow }, uLens: lens }, side: THREE.DoubleSide, transparent: true, premultipliedAlpha: true, depthWrite: false }));
    spot.renderOrder = 11;
    spot.frustumCulled = false;
    group.add(spot);

    // The fume the stroke flashes off the rime of the tip the long lens watches, seen while the stroke lights it: a torn puff of lit
    // vapour in the lee of the tip, a picture of lit cloud added over what is behind. What stays of it in the dark the air folder draws.
    const fumeGlow = new THREE.Vector3();
    const fumeDie = new THREE.Vector2();
    const fumeAt = new THREE.Vector3();
    if (Math.hypot(site.to[0] - strikeTip[0], site.to[2] - strikeTip[2]) < 1) {
      const fume = new THREE.Mesh(quad, new THREE.ShaderMaterial({ vertexShader: ROOT_VERTEX, fragmentShader: ROOT_FRAGMENT, uniforms: { ...ctx.rig.uniforms, tRoot: { value: rootPicture }, uAt: { value: fumeAt }, uLay: { value: new THREE.Vector4(0.5 * FUME_WIDE, 0.3, 1, 0) }, uGlow: { value: fumeGlow }, uDie: { value: fumeDie } }, side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor }));
      fume.renderOrder = 11;
      fume.frustumCulled = false;
      group.add(fume);
    }

    // The spray of glowing fragments.
    const age = { value: -1 };
    const seeds = new Float32Array(SPARKS * 4);
    const go = new Float32Array(SPARKS * 3);
    for (let i = 0; i < SPARKS; i++) {
      seeds.set([rng.next(), rng.next(), rng.next(), rng.next()], i * 4);
      // No ring of them: most are thrown to the lee side and down the flank, a few go anywhere, and no two at one speed.
      const lee = Math.atan2(WIND[2], WIND[0]);
      const az = rng.next() < 0.45 ? lee + rng.range(-0.9, 0.9) : rng.range(0, Math.PI * 2);
      const up = rng.range(-0.55, 0.9);
      const speed = rng.range(35, 210) * (rng.next() < 0.2 ? 1.6 : 1);
      const flat = Math.sqrt(Math.max(0, 1 - up * up));
      go.set([Math.cos(az) * flat * speed, up * speed, Math.sin(az) * flat * speed], i * 3);
    }
    const sparkGeometry = new THREE.InstancedBufferGeometry();
    sparkGeometry.index = quad.index;
    sparkGeometry.setAttribute('position', quad.getAttribute('position'));
    sparkGeometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
    sparkGeometry.setAttribute('aGo', new THREE.InstancedBufferAttribute(go, 3));
    sparkGeometry.instanceCount = SPARKS;
    const sparks = new THREE.Mesh(sparkGeometry, new THREE.ShaderMaterial({ vertexShader: SPOT_VERTEX, fragmentShader: SPOT_FRAGMENT, uniforms: { ...ctx.rig.uniforms, uAt: { value: tip }, uAge: age, uPixel: pixel, uGale: { value: wind }, uGlow: { value: 9 } }, side: THREE.DoubleSide }));
    sparks.frustumCulled = false;
    group.add(sparks);

    group.visible = false;
    ctx.scene.add(index === 0 ? ctx.parts.built(site.id, group, farGroup) : ctx.parts.built(site.id, group));
    // Where the flash is cast from: a point on the channel, and never lower over the tip than CAST_UP, so that level snow a kilometre
    // off is lit from above as the lit cloud lights it and not grazed.
    const cast = new THREE.Vector3().lerpVectors(tip, top, 0.28);
    cast.y = Math.max(cast.y, tip.y + (CAST_UP[index % CAST_UP.length] as number));
    return { site, group, first: firstChannel.env, again: againChannel.env, firstGroup: firstChannel.group, againGroup: againChannel.group, rootGlow, rootDie, age, spotGlow, fumeGlow, fumeDie, fumeAt, top, cast, mid, tip };
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
        puff = { source: { at: [tip[0], tip[1] + 1.5, tip[2]], radius: close ? 6.5 : 12, strength: 0, rise: close ? 58 : 260, kind: 'steam' }, strikes: [] };
        puffs.push(puff);
        ctx.sources.steam.push(puff.source);
      }
      puff.strikes.push(site.seconds);
    }
  });

  const size = new THREE.Vector2();
  let height = 0;
  // The stroke's light on the land is compiled into the shaders that read the rig only while a strike gives light: which shader a
  // material has is set from the time alone, each time, so a frame is drawn the same whatever was drawn before it.
  const burns = (on: boolean): void => {
    ctx.scene.traverse((o) => {
      const held = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (!held) return;
      for (const m of Array.isArray(held) ? held : [held]) {
        const s = m as THREE.ShaderMaterial;
        if (!s.isShaderMaterial || !(s.fragmentShader.includes('STRIKE_BURNS') || s.vertexShader.includes('STRIKE_BURNS'))) continue;
        const defines = (s.defines ??= {});
        if ('STRIKE_BURNS' in defines === on) continue;
        if (on) defines.STRIKE_BURNS = '';
        else delete defines.STRIKE_BURNS;
        s.needsUpdate = true;
      }
    });
  };
  return {
    setTime: (seconds) => {
      for (const p of puffs) {
        let most = 0;
        // It bursts out with the stroke and thins over the next six seconds.
        for (const at of p.strikes) if (seconds > at) most = Math.max(most, (1 - Math.exp(-(seconds - at) / 0.04)) * Math.exp(-(seconds - at) / 6));
        p.source.strength = most * (p.source.radius < 10 ? 2 : 1);
      }
      {
        // The far strike: its channel on its two strokes, and the cloud about its head coming up before the first and dying after the last.
        const age = seconds - farSeconds;
        const live = age > -0.1 && age < 0.6;
        farGroup.visible = live;
        if (live) {
          const e = envelope(FAR_STROKES, age);
          const level = 0.4 * Math.min(1.2, e.channel);
          farChannel.env.set(level, 0.6 * level, 0, 0);
          farChannel.group.visible = level > 0.0005;
          const lit = Math.max(e.glow, 0.9 * e.channel);
          farGlow.copy(TINT).multiplyScalar(ROOT_GLOW * 2.2 * Math.max(lit, 0.6 * PRE_CLOUD * e.rise));
          farDie.set(Math.min(1, Math.max(0, 1 - lit)), 1);
        }
      }
      channelLight.radiance.set(0, 0, 0);
      cloudLight.radiance.set(0, 0, 0);
      tipLight.radiance.set(0, 0, 0);
      for (const l of alongLights) l.radiance.set(0, 0, 0);
      flashAt.set(0, 0, 0, 0);
      flashTip.set(0, 0, 0, 0);
      flashTop.set(0, 0, 0, 0);
      bolts.forEach((b, index) => {
        const age = seconds - b.site.seconds;
        const live = age > -0.3 && age < 0.6;
        b.group.visible = live;
        if (!live) return;
        const timing = timingOf(b.site.id);
        const e = envelope(timing, age);
        // A strike is one stroke down one channel. Where a judged frame falls inside it the channel burns on to that frame, by the way
        // that frame was judged with (the second figure); elsewhere it is seen whole on its own frame and as a violet thread on the next.
        const held = timing.hold > 0;
        const level = Math.min(1.2, e.channel);
        b.first.set(held ? 0 : level, held ? 0 : e.branch, 0, 0);
        b.again.set(held ? level : 0, held ? e.branch : 0, 0, 0);
        b.firstGroup.visible = !held && level > 0.0005;
        b.againGroup.visible = held && level > 0.0005;
        b.age.value = age;
        // Light inside the cloud before the stroke, then the stroke itself.
        const before = breakdown(age);
        const of = index % FLASH_OF.length;
        // What burns at the tip goes with the channel: the hot spot, the light on the rock close under it, the fume.
        const burn = Math.max(e.light, BURN_OF_CHANNEL * e.channel);
        b.spotGlow.set(1, 0.93, 1).multiplyScalar(Math.min(burn, 1) * 130);
        // The fume leaves the tip down the gale, a little up, and is lit while the channel burns.
        b.fumeAt.copy(b.tip).addScaledVector(wind, (0.42 + 0.9 * Math.max(age, 0)) * FUME_WIDE / (wind.length() || 1));
        b.fumeAt.y += 0.2 * FUME_WIDE;
        b.fumeGlow.set(0.8, 0.76, 1).multiplyScalar(FUME_GLOW * burn);
        b.fumeDie.set(0, held ? 1 : 0);
        const within = e.cloud;
        // The key and the fill of a strike: full on the stroke's frame, sinking after it, with one short rise in the cloud before it.
        const land = Math.max(e.land, (timing.swell ? SWELL_LAND : LAND_RISE) * e.rise);
        const sky = Math.max(e.sky, PRE_CLOUD * e.rise);
        // The glow in the cloud about the channel, which the round lights and the picture at the root draw: gone within a few frames.
        const glow = Math.max(e.glow, PRE_CLOUD * e.rise);
        const round = glow * (ROUND_OF[of] as number);
        b.rootGlow.copy(TINT).multiplyScalar(ROOT_GLOW * (ROOT_OF[of] as number) * Math.max(e.glow, 0.15 * before, 0.6 * PRE_CLOUD * e.rise));
        b.rootDie.set(before > 0 && e.glow <= 0 ? 0.6 : Math.min(1, Math.max(0, 1 - e.glow)), held ? 1 : 0);
        if (index === 4 && seconds < FIFTH_FROM) {
          b.firstGroup.visible = false;
          b.againGroup.visible = false;
          b.rootGlow.set(0, 0, 0);
          b.spotGlow.set(0, 0, 0);
          b.fumeGlow.set(0, 0, 0);
        }
        if (within > 0 && e.light <= 0 && INNER_CLOUD * within > (CLOUD_OF[of] as number) * sky) {
          // A cloud lit from inside: its own glow and what of it comes in by the canal's mouth. No light with a shadow.
          flashTip.set(INNER_AT.x - 0.4 * INNER_SPAN.x, INNER_AT.y - 0.4 * INNER_SPAN.y, INNER_AT.z - 0.4 * INNER_SPAN.z, FLASH * INNER_PULSE * within);
          flashTop.set(INNER_AT.x + 0.6 * INNER_SPAN.x, INNER_AT.y + 0.6 * INNER_SPAN.y, INNER_AT.z + 0.6 * INNER_SPAN.z, FLASH * INNER_CLOUD * within);
        } else if (land > 0) {
          flashAt.set(b.cast.x, b.cast.y, b.cast.z, FLASH * (FLASH_OF[of] as number) * land);
          flashTip.set(b.tip.x, b.tip.y, b.tip.z, FLASH * (PULSE_OF[of] as number) * land);
          flashTop.set(b.top.x, b.top.y, b.top.z, FLASH * (CLOUD_OF[of] as number) * sky);
        }
        if (e.light + e.channel + before + e.rise + within > 1e-4) {
          channelLight.position.copy(b.mid);
          channelLight.radiance.copy(TINT).multiplyScalar(CAST * round);
          alongLights.forEach((l, n) => {
            l.position.lerpVectors(b.top, b.mid, n === 0 ? 0.3 : 0.65);
            l.radiance.copy(TINT).multiplyScalar(CAST * 0.5 * round);
          });
          tipLight.position.copy(b.tip);
          tipLight.position.y += 2;
          tipLight.radiance.copy(TINT).multiplyScalar(TIP_CAST * burn);
          // A strike seen from inside the canal has its cloud where the far mouth shows it; the others have it where the channel enters.
          cloudLight.position.copy(timing.fore !== null ? INNER_AT : b.top);
          // The cloud's own bloom about a light closes on a ceiling at a hundredth of a stroke: the glow before a stroke is a small
          // share, so that it is dull beside the stroke.
          cloudLight.radiance.copy(TINT).multiplyScalar(CAST * 0.35 * (round + within * INNER_GLOW + before * (BEFORE_OF[of] as number)));
        }
      });
      burns(flashAt.w > 0 || flashTop.w > 0);
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
