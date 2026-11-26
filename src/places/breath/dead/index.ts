// The dead wader at the rim, some days dead, on its side where it fell: the trunk gone flat and sunk between its ribs, the skin dried to
// parchment and split, the legs folded, the neck along the rock in a slack curve, the tendrils matted in a fan.
// It is built from the working picture of it (mat/carcass.jpg, seen from over it): a sheet of the rock's own ground, raised by the form
// that assets-src/breath/dead/make_lift.py makes from the picture's outline (dead/carcass-lift.png), and lit by the rig.
import * as THREE from 'three';
import { DEAD_WADER, SEA_LEVEL } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { makeFlies } from './flies';
import { makeGround } from './ground';

export const PARTS: readonly string[] = ['dead-wader'];

type V3 = [number, number, number];

/** The picture: metres across and deep, and where in it the middle of the trunk is. */
const WIDE = 4.5;
const DEEP = (4.5 * 848) / 1854;
const MID: [number, number] = [0.64, 0.4];

const VERTEX = /* glsl */ `
uniform sampler2D tLand;
uniform vec4 uLandRect;
uniform sampler2D tLift;
uniform vec4 uPlace;
uniform vec4 uSheet;
uniform vec3 uBed;
varying vec2 vAt;
varying vec3 vWorld;
void main() {
  // position.xy is a place in the picture, across and down; the picture is loaded with its first row at the top of v.
  vAt = vec2(position.x, 1.0 - position.y);
  // The animal's own metres: x toward its legs (down the picture), z toward its neck (to the picture's left).
  vec2 own = vec2((position.y - uSheet.y) * uSheet.w, (uSheet.x - position.x) * uSheet.z - uPlace.w);
  vec2 xz = uPlace.xy + vec2(own.x * cos(uPlace.z) + own.y * sin(uPlace.z), -own.x * sin(uPlace.z) + own.y * cos(uPlace.z));
  // Dead some days, it is stiff: the trunk, the neck and the limbs lie as on a level bed and bridge the cracks of the rock; only the fan
  // of the tendrils (the picture's left end) follows the rock itself.
  float lift = texture2D(tLift, vAt).r * 0.5;
  float rock = texture2D(tLand, (xz - uLandRect.xy) * uLandRect.zw).r;
  float bed = uBed.x + uBed.y * own.x + uBed.z * own.y;
  vec3 p = vec3(xz.x, mix(rock, max(bed, rock - 0.05), smoothstep(0.17, 0.27, position.x)) + lift - 0.01, xz.y);
  vWorld = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

// What of the sheet is animal: the form's own cover, and the finest strands of the mop from the picture's relief (it stands on black).
const CUT = /* glsl */ `
  vec4 form = texture2D(tLift, vAt);
  float told = texture2D(tCarcassH, vAt).r;
  if (form.g < 0.5 && told < 0.075) discard;
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
uniform vec4 uSheet;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
${CUT}
  vec3 v = normalize(cameraPosition - vWorld);
  float lift = form.r * 0.5;
  // The slope of the form with the folds and the ribs on it, as the picture is laid: across it, and down it.
  vec2 slope = (texture2D(tSlope, vAt).rg - 0.5) * 6.0;
  vec2 own = vec2(-slope.y, slope.x);
  vec3 n = normalize(vec3(own.x * cos(uPlace.z) + own.y * sin(uPlace.z), 1.0, -own.x * sin(uPlace.z) + own.y * cos(uPlace.z)));
  // Where the skin stands steep the picture, taken from over it, has little to say: it is read coarser there, so it does not smear.
  vec3 albedo = texture2D(tCarcass, vAt, clamp(length(slope) - 0.9, 0.0, 2.0) * 2.0).rgb;
  // Parchment: the colour has gone out of it. Brown where it has leaked, dark and damp where it lies on the rock, salt on what faces up.
  float grey = dot(albedo, vec3(0.3, 0.5, 0.2));
  albedo = mix(albedo, grey * vec3(1.0, 0.95, 0.87), 0.3) * 1.5;
  albedo *= 0.88 + 0.24 * fbm(vWorld.xz * 6.0);
  albedo = mix(albedo, vec3(0.14, 0.07, 0.05), 0.45 * smoothstep(0.52, 0.72, fbm(vWorld.xz * 2.3 + 7.0)) * smoothstep(0.2, 0.03, lift));
  albedo *= 0.6 + 0.4 * smoothstep(0.0, 0.05, lift);
  float salt = smoothstep(0.55, 0.8, fbm(vWorld.xz * 11.0 + 3.0) + 0.25 * n.y - 0.1);
  albedo = mix(albedo, vec3(0.8, 0.78, 0.74), 0.25 * salt);
  // The hollows between the ribs and under the folds see little of the sky.
  float occ = (0.45 + 0.55 * smoothstep(0.2, 0.55, form.b)) * (0.65 + 0.35 * smoothstep(0.0, 0.05, lift));
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
  // The anchor's turn is that of the stand-in, whose length lay across the animal's own axis here: the spine lies across the view from the rim.
  const turn = DEAD_WADER.turn - 1.07;
  const SHIFT = 0.9;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  // The bed it lies on: the level that best fits the rock under it, raised until most of that rock is under it. The rock near the anchor
  // is plates and cracks with pools in them: of the places within three metres of the anchor it lies on the one that is most nearly a
  // level bed and is dry.
  const fit = (cx: number, cz: number): { level: number; bx: number; bz: number; rough: number } => {
    const at: [number, number, number][] = [];
    let wet = 0;
    for (let i = 0; i <= 12; i++) {
      for (let j = 0; j <= 6; j++) {
        const ox = (0.1 + (0.8 * j) / 6 - MID[1]) * DEEP;
        const oz = (MID[0] - (0.02 + (0.96 * i) / 12)) * WIDE - SHIFT * k;
        const y = rig.land.height(cx + ox * cos + oz * sin, cz - ox * sin + oz * cos);
        if (y < SEA_LEVEL + 0.06) wet++;
        at.push([ox, oz, y]);
      }
    }
    const n = at.length;
    const mean = (f: (a: [number, number, number]) => number): number => at.reduce((sum, a) => sum + f(a), 0) / n;
    const mx = mean((a) => a[0]);
    const mz = mean((a) => a[1]);
    const my = mean((a) => a[2]);
    const sxx = mean((a) => (a[0] - mx) ** 2);
    const szz = mean((a) => (a[1] - mz) ** 2);
    const sxz = mean((a) => (a[0] - mx) * (a[1] - mz));
    const sxy = mean((a) => (a[0] - mx) * (a[2] - my));
    const szy = mean((a) => (a[1] - mz) * (a[2] - my));
    const det = sxx * szz - sxz * sxz || 1;
    const bx = Math.max(-0.15, Math.min(0.15, (sxy * szz - szy * sxz) / det));
    const bz = Math.max(-0.15, Math.min(0.15, (szy * sxx - sxy * sxz) / det));
    const over = at.map((a) => a[2] - (my + bx * (a[0] - mx) + bz * (a[1] - mz))).sort((p, q) => p - q);
    const raise = over[Math.floor(0.7 * (n - 1))] as number;
    const rough = (over[Math.floor(0.95 * (n - 1))] as number) - (over[Math.floor(0.05 * (n - 1))] as number) + wet * 0.05;
    return { level: my - bx * mx - bz * mz + raise, bx, bz, rough };
  };
  let here = { x: DEAD_WADER.x, z: DEAD_WADER.z };
  let lie = fit(here.x, here.z);
  let best = lie.rough;
  for (let i = -6; i <= 6; i++) {
    for (let j = -6; j <= 6; j++) {
      const far = Math.hypot(i, j) * 0.5;
      if (far > 3) continue;
      const tried = fit(DEAD_WADER.x + i * 0.5, DEAD_WADER.z + j * 0.5);
      // A place further from the anchor has to be that much better.
      const score = tried.rough + 0.03 * far;
      if (score < best) {
        best = score;
        lie = tried;
        here = { x: DEAD_WADER.x + i * 0.5, z: DEAD_WADER.z + j * 0.5 };
      }
    }
  }
  const bed = new THREE.Vector3(lie.level, lie.bx, lie.bz);
  /** From the animal's own metres (x toward its legs, y up from the rock, z toward its neck) to the world, laid on the ground. */
  const world = (p: V3): V3 => {
    // The anchor is under its chest, not its middle: the whole of it, with the fan of its tendrils, is inside the frame of the rim's picture.
    const x = here.x + (p[0] * cos + (p[2] - SHIFT) * sin) * k;
    const z = here.z + (-p[0] * sin + (p[2] - SHIFT) * cos) * k;
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
      tSlope: { value: ctx.assets.texture('dead/carcass-slope.png', { kind: 'data', repeat: false }) },
      tCarcass: { value: ctx.assets.texture('mat/carcass.jpg', { repeat: false }) },
      tCarcassH: { value: ctx.assets.texture('mat/carcass-h.png', { kind: 'data', repeat: false }) },
      uPlace: { value: new THREE.Vector4(here.x, here.z, turn, SHIFT * k) },
      uSheet: { value: new THREE.Vector4(MID[0], MID[1], WIDE, DEEP) },
      uBed: { value: bed },
    },
    side: THREE.DoubleSide,
  });
  material.userData.depthFragment = DEPTH;
  const geometry = new THREE.PlaneGeometry(1, 1, 400, 184).translate(0.5, 0.5, 0);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const half = 0.75 / k;
  const neckLine: V3[] = [from(0.47, 0.3), from(0.36, 0.33), from(0.27, 0.3), from(0.21, 0.42), from(0.2, 0.55)];
  const legLines: V3[][] = [
    [from(0.52, 0.55), from(0.65, 0.6)],
    [from(0.75, 0.3), from(0.76, 0.55), from(0.87, 0.5), from(0.97, 0.68), from(0.78, 0.85)],
    [from(0.72, 0.5), from(0.86, 0.5)],
  ];
  // What it has left on the rock: the stain it lies in, a line of salt where that dried, and the grit that has gathered against it.
  const lines: V3[][] = [[[0, 0, -half], [0, 0, half]], neckLine, ...legLines];
  const ground = makeGround(ctx, world, lines, k);
  const group = new THREE.Group();
  group.add(mesh, ground.group);
  // Flies: over the belly, the hip, the root of the neck and the mop.
  const flyRng = ctx.rng('dead-wader-flies');
  const flies = makeFlies(46, [world([0.1, 0.32, -0.3]), world([0.1, 0.32, 0.25]), world([0.0, 0.36, -0.6]), world(from(0.36, 0.33, 0.16)), world(from(0.1, 0.6, 0.08)), world(from(0.76, 0.5, 0.14))], () => flyRng.next(), rig.uniforms);
  group.add(flies.mesh);
  ctx.scene.add(ctx.parts.built('dead-wader', group));

  // It has lain here: the rock under it is in its shade and damp.
  const spots: [V3, number, number][] = [
    [[0, 0, 0], 0.7, 0.9],
    [[0, 0, 0.5], 0.5, 0.8],
    [[0, 0, -0.5], 0.5, 0.8],
    [from(0.36, 0.33), 0.3, 0.7],
    [from(0.25, 0.32), 0.3, 0.6],
    [from(0.1, 0.6), 0.5, 0.5],
    [from(0.58, 0.58), 0.4, 0.55],
    [from(0.78, 0.5), 0.5, 0.55],
    [from(0.9, 0.65), 0.5, 0.45],
    [from(0.78, 0.85), 0.3, 0.4],
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
