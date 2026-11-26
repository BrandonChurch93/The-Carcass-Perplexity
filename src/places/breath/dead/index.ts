// The dead wader at the rim, some days dead, on its side where it fell: the trunk gone flat and sunk between its ribs, the skin dried to
// parchment and split, the legs folded, the neck along the rock in a slack curve, the tendrils matted in a fan.
// It is built from the working picture of it (mat/carcass.jpg, seen from over it): a sheet of the rock's own ground, raised by the form
// that assets-src/breath/dead/make_lift.py makes from the picture's outline (dead/carcass-lift.png), and lit by the rig.
import * as THREE from 'three';
import { DEAD_WADER } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { makeFlies } from './flies';
import { makeGround } from './ground';

export const PARTS: readonly string[] = ['dead-wader'];

type V3 = [number, number, number];

/** The picture: metres across and deep, and where in it the middle of the trunk is. */
const WIDE = 4.5;
const DEEP = (4.5 * 848) / 1854;
const MID: [number, number] = [0.62, 0.36];

const VERTEX = /* glsl */ `
uniform sampler2D tLand;
uniform vec4 uLandRect;
uniform sampler2D tLift;
uniform vec4 uPlace;
uniform vec4 uSheet;
varying vec2 vAt;
varying vec3 vWorld;
float liftAt(vec2 at) {
  vec4 l = texture2D(tLift, at);
  return (l.r * 65280.0 + l.g * 255.0) / 65535.0 * 0.6;
}
void main() {
  vAt = position.xy;
  // The animal's own metres: x toward its legs (down the picture), z toward its neck (to the picture's left).
  vec2 own = vec2((position.y - uSheet.y) * uSheet.w, (uSheet.x - position.x) * uSheet.z - uPlace.w);
  vec2 xz = uPlace.xy + vec2(own.x * cos(uPlace.z) + own.y * sin(uPlace.z), -own.x * sin(uPlace.z) + own.y * cos(uPlace.z));
  vec3 p = vec3(xz.x, texture2D(tLand, (xz - uLandRect.xy) * uLandRect.zw).r + liftAt(vAt) - 0.004, xz.y);
  vWorld = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

// What of the sheet is animal: the form's own cover, and the finest strands of the mop from the picture's relief (it stands on black).
const CUT = /* glsl */ `
  vec4 form = texture2D(tLift, vAt);
  float told = texture2D(tCarcassH, vAt).r;
  if (form.b < 0.4 && told < 0.075) discard;
`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vAt;
varying vec3 vWorld;
uniform sampler2D tLift;
uniform sampler2D tCarcass;
uniform sampler2D tCarcassH;
uniform vec4 uPlace;
uniform vec4 uSheet;
${NOISE_GLSL}
${RIG_GLSL}
float liftAt(vec2 at) {
  vec4 l = texture2D(tLift, at);
  return (l.r * 65280.0 + l.g * 255.0) / 65535.0 * 0.6;
}
void main() {
${CUT}
  vec3 v = normalize(cameraPosition - vWorld);
  float lift = (form.r * 65280.0 + form.g * 255.0) / 65535.0 * 0.6;
  // The slope of the form, and on it at a low strength the folds and the ribs of the picture's relief (a lit model, not a depth).
  vec2 e = vec2(2.2 / 927.0, 2.2 / 424.0);
  float ds = (liftAt(vAt + vec2(e.x, 0.0)) - liftAt(vAt - vec2(e.x, 0.0))) / (2.0 * e.x * uSheet.z);
  float dt = (liftAt(vAt + vec2(0.0, e.y)) - liftAt(vAt - vec2(0.0, e.y))) / (2.0 * e.y * uSheet.w);
  vec2 f = vec2(1.0 / 1854.0, 1.0 / 848.0);
  float fs = (texture2D(tCarcassH, vAt + vec2(f.x, 0.0)).r - texture2D(tCarcassH, vAt - vec2(f.x, 0.0)).r) / (2.0 * f.x * uSheet.z);
  float ft = (texture2D(tCarcassH, vAt + vec2(0.0, f.y)).r - texture2D(tCarcassH, vAt - vec2(0.0, f.y)).r) / (2.0 * f.y * uSheet.w);
  ds += 0.012 * fs;
  dt += 0.012 * ft;
  vec2 own = vec2(-dt, ds);
  vec3 n = normalize(vec3(own.x * cos(uPlace.z) + own.y * sin(uPlace.z), 1.0, -own.x * sin(uPlace.z) + own.y * cos(uPlace.z)));
  vec3 albedo = texture2D(tCarcass, vAt).rgb;
  // Parchment: the colour has gone out of it. Brown where it has leaked, dark and damp where it lies on the rock, salt on what faces up.
  float grey = dot(albedo, vec3(0.3, 0.5, 0.2));
  albedo = mix(albedo, grey * vec3(1.0, 0.93, 0.82), 0.35) * 1.1;
  float grime = fbm(vWorld.xz * 6.0);
  albedo *= 0.72 + 0.4 * grime;
  albedo = mix(albedo, vec3(0.12, 0.06, 0.045), 0.6 * smoothstep(0.52, 0.72, fbm(vWorld.xz * 2.3 + 7.0)) * smoothstep(0.3, 0.05, lift));
  albedo *= 0.5 + 0.5 * smoothstep(0.0, 0.07, lift);
  float salt = smoothstep(0.55, 0.8, fbm(vWorld.xz * 11.0 + 3.0) + 0.25 * n.y - 0.1);
  albedo = mix(albedo, vec3(0.8, 0.78, 0.74), 0.35 * salt);
  // The hollows between the ribs and under the folds see little of the sky.
  float occ = (0.5 + 0.5 * smoothstep(0.12, 0.62, told)) * (0.6 + 0.4 * smoothstep(0.0, 0.05, lift));
  vec3 colour = rigShade(vWorld, n, v, albedo, 0.86, occ);
  // Thin dry skin against the low sun: a little of it comes through at every edge that stands up.
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float against = clamp(dot(v, -uSunDir), 0.0, 1.0);
  colour += albedo * vec3(1.0, 0.62, 0.45) * uSunColour * (0.9 * pow(1.0 - nv, 3.0) * (0.3 + 0.7 * against * against) * sunAt(vWorld + vec3(0.0, 0.2, 0.0)));
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
  // The anchor's turn is that of the stand-in, whose length lay across the animal's own axis here: the spine lies across the view from the rim.
  const turn = DEAD_WADER.turn - 1.07;
  const SHIFT = 0.9;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  /** From the animal's own metres (x toward its legs, y up from the rock, z toward its neck) to the world, laid on the ground. */
  const world = (p: V3): V3 => {
    // The anchor is under its chest, not its middle: the whole of it, with the fan of its tendrils, is inside the frame of the rim's picture.
    const x = DEAD_WADER.x + (p[0] * cos + (p[2] - SHIFT) * sin) * k;
    const z = DEAD_WADER.z + (-p[0] * sin + (p[2] - SHIFT) * cos) * k;
    return [x, rig.land.height(x, z) + p[1] * k, z];
  };
  /** A place in the picture (0 to 1 across, 0 to 1 down), in the animal's own metres over k. */
  const from = (s: number, t: number, up = 0): V3 => [((t - MID[1]) * DEEP) / k, up, ((MID[0] - s) * WIDE) / k];

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      ...rig.uniforms,
      tLift: { value: ctx.assets.texture('dead/carcass-lift.png', { kind: 'data', repeat: false }) },
      tCarcass: { value: ctx.assets.texture('mat/carcass.jpg', { repeat: false }) },
      tCarcassH: { value: ctx.assets.texture('mat/carcass-h.png', { kind: 'data', repeat: false }) },
      uPlace: { value: new THREE.Vector4(DEAD_WADER.x, DEAD_WADER.z, turn, SHIFT * k) },
      uSheet: { value: new THREE.Vector4(MID[0], MID[1], WIDE, DEEP) },
    },
    side: THREE.DoubleSide,
  });
  material.userData.depthFragment = DEPTH;
  const geometry = new THREE.PlaneGeometry(1, 1, 400, 184).translate(0.5, 0.5, 0);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const half = 0.75 / k;
  const neckLine: V3[] = [from(0.45, 0.4), from(0.37, 0.39), from(0.29, 0.33), from(0.22, 0.4), from(0.2, 0.52)];
  const legLines: V3[][] = [
    [from(0.52, 0.5), from(0.55, 0.63), from(0.66, 0.6)],
    [from(0.8, 0.3), from(0.74, 0.66), from(0.97, 0.7), from(0.82, 0.93)],
    [from(0.7, 0.52), from(0.92, 0.58)],
  ];
  // What it has left on the rock: the stain it lies in, a line of salt where that dried, and the grit that has gathered against it.
  const lines: V3[][] = [[[0, 0, -half], [0, 0, half]], neckLine, ...legLines];
  const ground = makeGround(ctx, world, lines, k);
  const group = new THREE.Group();
  group.add(mesh, ground.group);
  // Flies: over the belly, the hip, the root of the neck and the mop.
  const flyRng = ctx.rng('dead-wader-flies');
  const flies = makeFlies(46, [world([0.1, 0.32, -0.3]), world([0.1, 0.32, 0.25]), world([0.0, 0.36, -0.6]), world(from(0.36, 0.4, 0.16)), world(from(0.1, 0.52, 0.08)), world(from(0.74, 0.62, 0.12))], () => flyRng.next(), rig.uniforms);
  group.add(flies.mesh);
  ctx.scene.add(ctx.parts.built('dead-wader', group));

  // It has lain here: the rock under it is in its shade and damp.
  const spots: [V3, number, number][] = [
    [[0, 0, 0], 0.7, 0.9],
    [[0, 0, 0.5], 0.5, 0.8],
    [[0, 0, -0.5], 0.5, 0.8],
    [from(0.36, 0.38), 0.3, 0.7],
    [from(0.25, 0.36), 0.3, 0.6],
    [from(0.1, 0.5), 0.5, 0.5],
    [from(0.56, 0.6), 0.5, 0.55],
    [from(0.76, 0.6), 0.5, 0.55],
    [from(0.9, 0.7), 0.5, 0.45],
  ];
  const discs = rig.contactDiscs(spots.length);
  spots.forEach(([p, radius, strength], i) => {
    const w = world(p);
    rig.setDisc(discs, i, w[0], w[2], radius * k, strength);
  });

  return {
    setTime: (seconds) => flies.setTime(seconds),
    dispose: () => {
      flies.dispose();
      geometry.dispose();
      material.dispose();
      ground.dispose();
    },
  };
}
