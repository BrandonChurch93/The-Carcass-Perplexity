// The dead wader at the rim, some days dead, on its side where it fell: the trunk gone flat and sunk between its ribs, the skin dried to
// parchment and split, the legs folded and crossed toward the lens, the neck along the rock in a slack curve, the tendrils matted in a fan.
// It is built from the working picture of it as the lens at the rim sees it (mat/carcass-low.jpg). Every pixel of that picture is put
// on its own ray from that lens, at the height off the rock that assets-src/breath/dead/make_low.py guesses for it (dead/carcass-low-lift.png):
// so from that lens the picture is whole, and as the lens moves the animal lies on the rock, it does not stand on it like a sign.
import * as THREE from 'three';
import { DEAD_WADER, SEA_LEVEL } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { makeFlies } from './flies';
import { makeGround } from './ground';

export const PARTS: readonly string[] = ['dead-wader'];

type V3 = [number, number, number];

/** The picture: metres across and up it, where in it (across, and up from its foot) the animal's middle and its lowest hoof are. */
const WIDE = 5.5;
const TALL = 3.096;
const MID = 0.56;
const FOOT = 0.25;
/** Staged: the lens of the key at the rim (breath-2, shot breath-05), from the place's own list of cameras. The picture was made for it. */
const LENS: V3 = [-28.5, 2.6, 28.3];
/** How far behind the picture's foot, along the rock, the anchor is. */
const BACK = 1.35;

const VERTEX = /* glsl */ `
uniform sampler2D tLand;
uniform vec4 uLandRect;
uniform sampler2D tLift;
uniform vec4 uPlace;
uniform vec4 uSheet;
uniform vec4 uLie;
uniform float uStir;
varying vec2 vAt;
varying vec3 vWorld;
void main() {
  // position.xy is a place in the picture, across it and up it.
  vAt = position.xy;
  // Some days dead, the trunk has gone down: the belly and the ribs have fallen in, and what stood a forearm high is a hand lower. The
  // picture is drawn in over the trunk toward its low edge, and what it lifts is less by as much.
  float sag = smoothstep(0.36, 0.5, position.x) * smoothstep(0.86, 0.68, position.x);
  float up = position.y - 0.17 * sag * max(position.y - 0.45, 0.0);
  float lift = texture2D(tLift, vAt).r * 0.5 * (1.0 - 0.17 * sag);
  // Across the lens's line of sight, and away from the lens along the rock: the higher a thing stands, the nearer it is on its ray.
  float across = (position.x - uSheet.x) * uSheet.z;
  // The tendrils dried where they fell, each in its own slack curve: none of them lies straight.
  float fan = smoothstep(0.31, 0.12, position.x);
  across += fan * (0.06 * sin(position.x * 29.0 + position.y * 43.0) + 0.028 * sin(position.x * 71.0 - position.y * 57.0 + 1.3));
  float away = ((up - uSheet.y) * uSheet.w - lift * uLie.y) / uLie.x - uLie.z;
  // The wind still moves the ends of the tendrils where they lie loose on the rock: nothing else of it stirs.
  float loose = smoothstep(0.27, 0.06, position.x);
  away += loose * loose * (0.035 * sin(uStir * 1.3 + position.x * 22.0 + position.y * 17.0) + 0.009 * sin(uStir * 4.3 - position.x * 55.0 + position.y * 9.0));
  vec2 xz = uPlace.xy + across * vec2(-uPlace.w, uPlace.z) + away * uPlace.zw;
  // Dead some days, it is stiff: the trunk, the neck and the limbs lie as on a level bed and bridge the cracks of the rock; only the fan
  // of the tendrils (the picture's left end) follows the rock itself.
  float rock = texture2D(tLand, (xz - uLandRect.xy) * uLandRect.zw).r;
  // It has sunk: the low edge of the trunk and of the legs is under the grit that has gathered against it, not on top of the rock.
  float body = smoothstep(0.2, 0.3, position.x);
  vec3 p = vec3(xz.x, mix(rock, max(uLie.w, rock - 0.05), body) + lift - mix(0.01, 0.025 + 0.05 * sag * smoothstep(0.03, 0.14, lift), body), xz.y);
  vWorld = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

// What of the sheet is animal: the body's own cover, and the strands of the fan from the picture's relief (it stands on black).
const CUT = /* glsl */ `
  vec4 form = texture2D(tLift, vAt);
  // The relief is read no coarser than its third level. Read at the level the far lens asks for, the mean of the animal and of the black
  // it stands on passed the cut: a pale quad of the sheet lay on the rock beside the body, and went as the lens came nearer. That was the
  // flip of the held frame, pale to red and back.
  vec2 fine = vec2(1672.0, 941.0);
  vec2 ax = dFdx(vAt) * fine;
  vec2 ay = dFdy(vAt) * fine;
  float level = min(0.5 * log2(max(dot(ax, ax), dot(ay, ay)) + 1e-6), 2.0);
  float told = textureLod(tCarcassH, vAt, max(level, 0.0)).r;
  // The strands of the fan are kept by the crest of their relief alone: by its foot they were rods a thumb thick.
  if (form.g < 0.5 && told < mix(0.11, 0.24, smoothstep(0.31, 0.22, vAt.x))) discard;
`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vAt;
varying vec3 vWorld;
uniform sampler2D tLift;
uniform sampler2D tSlope;
uniform sampler2D tCarcass;
uniform sampler2D tCarcassH;
uniform vec4 uPlace;
uniform vec4 uLie;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
${CUT}
  vec3 v = normalize(cameraPosition - vWorld);
  float lift = form.r * 0.5;
  // The way the skin faces, from the slope of its height across the picture and up it.
  vec2 slope = (texture2D(tSlope, vAt).rg - 0.5) * 6.0;
  slope /= 1.0 + 0.35 * length(slope);
  // The hide has slumped over the bones: between two ribs it sags, it is not gone. What the picture shows as a dark gap is hide in shade.
  float hide = step(0.5, form.g);
  float hollow = hide * smoothstep(0.3, 0.06, form.b) * smoothstep(0.3, 0.4, vAt.x);
  slope *= 1.0 - 0.35 * hollow;
  vec3 right = vec3(-uPlace.w, 0.0, uPlace.z);
  vec3 away = vec3(uPlace.z, 0.0, uPlace.w);
  vec3 rise = vec3(0.0, 1.0, 0.0) - away * (uLie.y / uLie.x);
  vec3 n = normalize(cross(right + rise * slope.x, away / uLie.x + rise * slope.y));
  // A fold steeper than the picture can tell is turned back to face the lens: never lit from behind itself.
  n = normalize(n + v * max(0.0, 0.12 - dot(n, v)));
  n.y = max(n.y, 0.05);
  n = normalize(n);
  vec3 albedo = texture2D(tCarcass, vAt).rgb;
  vec3 skin = texture2D(tCarcass, vAt, 4.5).rgb / max(texture2D(tLift, vAt, 3.5).g, 0.5);
  albedo = mix(albedo, max(albedo, skin * 0.62), 0.7 * hollow);
  // Parchment: the colour has gone out of it. Dark and damp where it lies on the rock, salt on what faces up.
  float grey = dot(albedo, vec3(0.3, 0.5, 0.2));
  albedo = mix(albedo, grey * vec3(1.0, 0.95, 0.87), 0.35) * 1.5;
  albedo *= 0.9 + 0.2 * fbm(vWorld.xz * 6.0);
  albedo *= 0.6 + 0.4 * smoothstep(0.0, 0.05, lift);
  float salt = smoothstep(0.55, 0.8, fbm(vWorld.xz * 11.0 + 3.0) + 0.25 * n.y - 0.1);
  albedo = mix(albedo, vec3(0.8, 0.78, 0.74), 0.2 * salt * step(0.5, form.g));
  // The hollows between the ribs and under the folds see little of the sky.
  float occ = (0.58 + 0.42 * smoothstep(0.2, 0.55, form.b)) * (0.65 + 0.35 * smoothstep(0.0, 0.05, lift));
  // The tendrils have bled out and dried pale: only their roots at the neck keep the red.
  float strand = 1.0 - hide;
  albedo = mix(albedo, vec3(0.66, 0.4, 0.36) * (0.7 + 0.6 * told), 0.36 * strand);
  // The shade it throws on the rock under it is not on it: the light is asked for above the reach of that shade.
  vec3 colour = rigShade(vWorld + vec3(0.0, 5.0, 0.0), n, v, albedo, 0.86, occ);
  // The fog over the shaft beside it is bright and it is pale: it is lit from that side as the living ones are.
  vec3 flat_ = normalize(vec3(uSunDir.x, 0.0, uSunDir.z));
  vec3 fogColour = skyIrradiance(normalize(flat_ + vec3(0.0, 0.4, 0.0))) * vec3(1.22, 1.0, 0.8) / 3.14159;
  colour += albedo * fogColour * (2.6 * (0.55 + 0.3 * dot(n, flat_) + 0.15 * n.y) * occ);
  // Thin dry skin against the low sun: what of it turns up toward the sun is edged with it.
  float against = clamp(dot(v, -uSunDir), 0.0, 1.0);
  float edge = smoothstep(0.2, 0.9, dot(n, normalize(uSunDir + vec3(0.0, 0.5, 0.0))));
  colour += albedo * vec3(1.0, 0.75, 0.55) * uSunColour * (0.25 * edge * (0.4 + 0.6 * against) * sunAt(vWorld + vec3(0.0, 0.2, 0.0)));
  gl_FragColor = vec4(rigOut(colour), 1.0);
}`;

const DEPTH = /* glsl */ `
precision highp float;
varying vec2 vAt;
varying vec3 vWorld;
uniform sampler2D tLift;
uniform sampler2D tCarcassH;
void main() {
${CUT}  gl_FragColor = vec4(0.0);
}`;

export function create(ctx: Context): Piece {
  const { rig } = ctx;
  const k = DEAD_WADER.size;
  // The line of sight of that lens along the rock, and how steeply it looks down on the anchor.
  const gx0 = DEAD_WADER.x - LENS[0];
  const gz0 = DEAD_WADER.z - LENS[2];
  const reach = Math.hypot(gx0, gz0);
  const gx = gx0 / reach;
  const gz = gz0 / reach;
  const down = Math.atan2(LENS[1] - rig.land.height(DEAD_WADER.x, DEAD_WADER.z), reach);
  const sin = Math.sin(down);
  const cos = Math.cos(down);
  /** A place in the picture (0 to 1 across, 0 to 1 down it) at a height off the rock, as metres across the line of sight and away along it. */
  const from = (s: number, t: number, up = 0): V3 => [(s - MID) * WIDE, up, ((1 - t - FOOT) * TALL - up * cos) / sin - BACK];
  /** From those metres to the world, on the rock. */
  const world = (p: V3): V3 => {
    const x = DEAD_WADER.x - gz * p[0] + gx * p[2];
    const z = DEAD_WADER.z + gx * p[0] + gz * p[2];
    return [x, rig.land.height(x, z) + p[1], z];
  };
  // The bed it lies on: a level under which most of the rock it covers is, and never the water.
  const heights: number[] = [];
  for (let i = 0; i <= 12; i++) {
    for (let j = 0; j <= 6; j++) heights.push(world(from(0.28 + (0.7 * i) / 12, 0.32 + (0.42 * j) / 6))[1]);
  }
  heights.sort((a, b) => a - b);
  const bed = Math.max(heights[Math.floor(0.7 * (heights.length - 1))] as number, SEA_LEVEL + 0.05);

  const stir = { value: 0 };
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      ...rig.uniforms,
      tLift: { value: ctx.assets.texture('dead/carcass-low-lift.png', { kind: 'data', repeat: false }) },
      tSlope: { value: ctx.assets.texture('dead/carcass-low-slope.png', { kind: 'data', repeat: false }) },
      tCarcass: { value: ctx.assets.texture('mat/carcass-low.jpg', { repeat: false }) },
      tCarcassH: { value: ctx.assets.texture('mat/carcass-low-h.png', { kind: 'data', repeat: false }) },
      uPlace: { value: new THREE.Vector4(DEAD_WADER.x, DEAD_WADER.z, gx, gz) },
      uSheet: { value: new THREE.Vector4(MID, FOOT, WIDE, TALL) },
      uLie: { value: new THREE.Vector4(sin, cos, BACK, bed) },
      uStir: stir,
    },
    side: THREE.DoubleSide,
  });
  material.userData.depthFragment = DEPTH;
  // Only the band of the picture the animal is in.
  const geometry = new THREE.PlaneGeometry(1, 0.5, 420, 150).translate(0.5, 0.47, 0);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  // Where it meets the rock, as the lens sees it: the lower edge of the trunk, of the neck and the mop, of the legs.
  const trunkLine: V3[] = [from(0.43, 0.5), from(0.5, 0.565), from(0.62, 0.56), from(0.76, 0.56)];
  const neckLine: V3[] = [from(0.43, 0.49), from(0.36, 0.455), from(0.3, 0.48), from(0.27, 0.55), from(0.15, 0.62)];
  const legLines: V3[][] = [
    [from(0.5, 0.57), from(0.64, 0.62), from(0.8, 0.6), from(0.97, 0.6)],
    [from(0.78, 0.55), from(0.86, 0.6), from(0.93, 0.7)],
  ];
  // What it has left on the rock: the stain it lies in, a line of salt where that dried, and the grit that has gathered against it.
  const lines: V3[][] = [trunkLine, neckLine, ...legLines];
  const ground = makeGround(ctx, world, lines, k);
  const group = new THREE.Group();
  group.add(mesh, ground.group);
  // Flies: over the belly, the hip, the root of the neck and the mop.
  const flyRng = ctx.rng('dead-wader-flies');
  const flies = makeFlies(46, [world(from(0.55, 0.52, 0.3)), world(from(0.63, 0.55, 0.3)), world(from(0.7, 0.5, 0.34)), world(from(0.44, 0.54, 0.15)), world(from(0.2, 0.68, 0.06)), world(from(0.8, 0.7, 0.12))], () => flyRng.next(), rig.uniforms);
  group.add(flies.mesh);
  ctx.scene.add(ctx.parts.built('dead-wader', group));

  // It has lain here: the rock under it is in its shade and damp.
  const spots: [V3, number, number][] = [
    [from(0.5, 0.56), 0.55, 0.95],
    [from(0.6, 0.56), 0.6, 0.95],
    [from(0.7, 0.56), 0.6, 0.95],
    [from(0.78, 0.58), 0.45, 0.8],
    [from(0.38, 0.47), 0.3, 0.8],
    [from(0.3, 0.5), 0.3, 0.7],
    [from(0.2, 0.6), 0.5, 0.5],
    [from(0.66, 0.62), 0.3, 0.7],
    [from(0.86, 0.6), 0.35, 0.65],
    [from(0.93, 0.68), 0.25, 0.6],
  ];
  const discs = rig.contactDiscs(spots.length);
  spots.forEach(([p, radius, strength], i) => {
    const w = world(p);
    rig.setDisc(discs, i, w[0], w[2], radius, strength);
  });

  return {
    setTime: (seconds) => {
      stir.value = seconds;
      flies.setTime(seconds);
    },
    dispose: () => {
      flies.dispose();
      geometry.dispose();
      material.dispose();
      ground.dispose();
    },
  };
}
