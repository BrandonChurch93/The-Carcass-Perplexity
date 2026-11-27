// The dead wader at the rim, some days dead, on its side where it fell: the trunk fallen in between its ribs with the hide slack over
// them, the legs folded and crossed toward the lens, the neck along the rock in a slack curve, the cords of the mop matted in a fan.
// It is its own model (dead/body.ts), a body with bulk that every lens sees from its own side: built from one picture pushed onto the
// rays of one lens it was a drawing on the rock from everywhere else. Its hide is one sheet of dried slack skin (dead/hide.jpg) with a
// height, laid along every part.
import * as THREE from 'three';
import { DEAD_WADER } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { buildBody, type V3 } from './body';
import { makeFlies } from './flies';
import { makeGround } from './ground';

export const PARTS: readonly string[] = ['dead-wader'];

/** The lens of the key at the rim (breath-2, shot breath-05): the animal lies across its line of sight, legs toward it. */
const LENS: V3 = [-28.5, 2.6, 28.3];
/** Where the animal's own middle is from the anchor: metres across that line of sight and metres away along it. */
const OFF: [number, number] = [0.15, 0.5];
/** The hide's sheet: metres across and up, its mean colour (linear), metres from its lowest crease to its highest fold. */
const SHEET = { wide: 0.95, tall: 0.633, mean: [0.351, 0.284, 0.232] as const, relief: 0.022 };

const VERTEX = /* glsl */ `
attribute vec3 aData;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vData;
void main() {
  vWorld = position;
  vNormal = normal;
  vUv = uv;
  vData = aData;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vData;
uniform sampler2D tHide;
uniform sampler2D tHideH;
uniform vec3 uHideMean;
uniform vec3 uHide;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 n = normalize(vNormal);
  float kind = vData.x;
  float cord = step(0.65, kind) * step(kind, 1.5);
  float hoof = step(1.5, kind);
  float hide = 1.0 - max(cord, hoof);
  float lift = vData.z;

  // The sheet of the hide, by the metres along the part and round it. Its height leans the skin.
  vec2 uv = vUv / uHide.xy;
  vec2 dx = dFdx(uv);
  vec2 dy = dFdy(uv);
  vec3 px = dFdx(vWorld);
  vec3 py = dFdy(vWorld);
  float foot = max(length(dx), length(dy));
  float e = max(0.0025, foot);
  vec3 tex = textureGrad(tHide, uv, dx, dy).rgb / uHideMean;
  float h0 = textureGrad(tHideH, uv, dx, dy).r;
  float hu = textureGrad(tHideH, uv + vec2(e, 0.0), dx, dy).r;
  float hv = textureGrad(tHideH, uv + vec2(0.0, e), dx, dy).r;
  vec3 r1 = cross(py, n);
  vec3 r2 = cross(n, px);
  vec3 tu = r1 * dx.x + r2 * dy.x;
  vec3 tv = r1 * dx.y + r2 * dy.y;
  float inv = inversesqrt(max(max(dot(tu, tu), dot(tv, tv)), 1e-12));
  vec3 lean = (uHide.z * hide * smoothstep(0.06, 0.012, foot) / e) * ((hu - h0) / uHide.x * tu + (hv - h0) / uHide.y * tv) * inv;
  n = normalize(n - lean);
  // A fold steeper than the skin can turn is turned back toward the eye: never lit from behind itself.
  n = normalize(n + v * max(0.0, 0.08 - dot(n, v)));

  // Parchment: the colour has gone out of it. Bone-pale where the hide is tight over a rib or a joint, yellow-grey in the slack, a
  // bruise of old red here and there where it has split.
  float grey = dot(tex, vec3(0.3333));
  float broad = fbm(vWorld.xz * 2.3 + vWorld.y * 3.1);
  vec3 albedo = mix(vec3(0.5, 0.44, 0.37), vec3(0.72, 0.66, 0.58), clamp(0.2 + 0.9 * broad + 0.5 * (vData.y - 0.8), 0.0, 1.0)) * mix(vec3(1.0), tex / max(grey, 0.05), 0.7) * clamp(mix(1.0, grey, 0.5), 0.6, 1.25);
  float bruise = smoothstep(0.62, 0.8, fbm(vWorld.xz * 5.1 + 7.0) + 0.25 * (0.5 - h0));
  albedo = mix(albedo, vec3(0.42, 0.2, 0.17) * (0.6 + 0.6 * grey), 0.4 * bruise * hide);
  // What lies on the rock is dark with what ran out of it and with damp, and grit sticks to it.
  float low = smoothstep(0.1, 0.015, lift + 0.03 * (broad - 0.5));
  albedo = mix(albedo, albedo * vec3(0.5, 0.36, 0.3), 0.75 * low * hide);
  float salt = smoothstep(0.55, 0.8, fbm(vWorld.xz * 11.0 + 3.0) + 0.25 * n.y - 0.1);
  albedo = mix(albedo, vec3(0.8, 0.78, 0.74), 0.16 * salt * hide);
  // The cords of the mop have bled out and dried: dull red at the root, paler and browner toward their ends.
  float along = vData.y;
  vec3 cordColour = mix(vec3(0.4, 0.13, 0.11), vec3(0.62, 0.4, 0.34), smoothstep(0.6, 1.0, along)) * (0.75 + 0.5 * vnoise(vUv * vec2(60.0, 9.0)));
  albedo = mix(albedo, cordColour, cord);
  // The hoofs: horn, dark and worn pale at the edge.
  albedo = mix(albedo, mix(vec3(0.2, 0.15, 0.1), vec3(0.45, 0.36, 0.26), smoothstep(0.3, 0.9, fbm(vUv * 40.0))), hoof);
  float occ = mix(vData.y, 0.9, cord) * mix(1.0, mix(0.74, 1.04, smoothstep(0.2, 0.7, h0)), hide) * (0.6 + 0.4 * smoothstep(0.0, 0.06, lift));
  float rough = mix(0.86, 0.5, hoof);

  // The shade it throws on the rock under it is not on it: the light is asked for above the reach of that shade.
  vec3 colour = rigShade(vWorld + vec3(0.0, 5.0, 0.0), n, v, albedo, rough, occ);
  // The fog over the shaft beside it is bright and it is pale: it is lit from that side as the living ones are.
  vec3 level = normalize(vec3(uSunDir.x, 0.0, uSunDir.z));
  vec3 fogColour = skyIrradiance(normalize(level + vec3(0.0, 0.4, 0.0))) * vec3(1.22, 1.0, 0.8) / 3.14159;
  colour += albedo * fogColour * (2.0 * (0.55 + 0.3 * dot(n, level) + 0.15 * n.y) * occ);
  // Thin dry skin against the low sun: what of it turns up toward the sun is edged with it.
  float against = clamp(dot(v, -uSunDir), 0.0, 1.0);
  float edge = smoothstep(0.2, 0.9, dot(n, normalize(uSunDir + vec3(0.0, 0.5, 0.0))));
  colour += albedo * vec3(1.0, 0.75, 0.55) * uSunColour * (0.25 * edge * (0.4 + 0.6 * against) * sunAt(vWorld + vec3(0.0, 0.2, 0.0)));
  gl_FragColor = vec4(rigOut(colour), 1.0);
}`;

export function create(ctx: Context): Piece {
  const { rig } = ctx;
  const k = DEAD_WADER.size;
  // The line of sight of that lens along the rock.
  const gx0 = DEAD_WADER.x - LENS[0];
  const gz0 = DEAD_WADER.z - LENS[2];
  const reach = Math.hypot(gx0, gz0);
  const gx = gx0 / reach;
  const gz = gz0 / reach;
  /** From the animal's own metres (along it, up, toward the lens) to the world, on the rock. */
  const place = (p: V3): V3 => {
    const across = p[0] + OFF[0];
    const away = OFF[1] - p[2];
    const x = DEAD_WADER.x - gz * across + gx * away;
    const z = DEAD_WADER.z + gx * across + gz * away;
    return [x, rig.land.height(x, z) + p[1], z];
  };
  /** The same for what lies about it: metres across the line of sight, up, and away along it. */
  const world = (p: V3): V3 => place([p[0], p[1], -p[2]]);

  const bodyRng = ctx.rng('dead-wader-body');
  const body = buildBody(place, () => bodyRng.next(), k);
  const sheet = (name: string, kind: 'colour' | 'data'): THREE.Texture => {
    const t = ctx.assets.texture(name, { kind, repeat: true, anisotropy: 4 });
    t.wrapS = THREE.MirroredRepeatWrapping;
    t.wrapT = THREE.MirroredRepeatWrapping;
    return t;
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      ...rig.uniforms,
      tHide: { value: sheet('dead/hide.jpg', 'colour') },
      tHideH: { value: sheet('dead/hide-h.png', 'data') },
      uHideMean: { value: new THREE.Vector3(...SHEET.mean) },
      uHide: { value: new THREE.Vector3(SHEET.wide, SHEET.tall, SHEET.relief) },
    },
  });
  const mesh = new THREE.Mesh(body.geometry, material);
  mesh.frustumCulled = false;
  // The grit that has gathered against it, on the side of the lens.
  const flat = (p: V3): V3 => [p[0], p[1], -p[2]];
  const ground = makeGround(ctx, world, body.lines.map((line) => line.map(flat)), k);
  const group = new THREE.Group();
  group.add(mesh, ground.group);
  // Flies: over the ribs, the flank, the hip, the root of the neck and the mop.
  const flyRng = ctx.rng('dead-wader-flies');
  const flies = makeFlies(46, body.flies.map(place), () => flyRng.next(), rig.uniforms);
  group.add(flies.mesh);
  ctx.scene.add(ctx.parts.built('dead-wader', group));

  // It has lain here: the rock under it is in its shade and damp.
  const discs = rig.contactDiscs(body.spots.length);
  body.spots.forEach(([p, radius, strength], i) => {
    const w = place(p);
    rig.setDisc(discs, i, w[0], w[2], radius, strength);
  });

  return {
    setTime: (seconds) => {
      flies.setTime(seconds);
    },
    dispose: () => {
      flies.dispose();
      body.geometry.dispose();
      material.dispose();
      ground.dispose();
    },
  };
}
