// The lake of the Heart: the crust, the lava that shows in its seams, and the crust that founders at the fountains.
// The crust is one sheet. What it shows is read from the net of plates (net.ts), which rides the drift of the lake:
// seams that open, widen, skin over and close, the open pool at the foot of the fall, the torn margin against the rock.
// The same heat is drawn into the rig's glow map, so that what lights the land and the animals is what the camera sees.
import * as THREE from 'three';
import type { HeartContext, HeartPiece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { SUNK, seamLine } from '../shared/anchors';
import { NET, NET_FINE, POOL, bakeNet } from './net';
import { createFoundering } from './founder';
import { HEAT_GLSL } from './heat';

export const PARTS: readonly string[] = ['crust', 'lava', 'foundering'];

// The ropes of the skin, and the height of the crust in metres where it is close enough to the camera to be built:
// ropes, the lip that rides up at a channel, the channel's floor a hand under the skin, a pressure ridge.
const RELIEF_GLSL = /* glsl */ `
uniform sampler2D tRopeNh;
uniform vec4 uRidge;
vec4 ropeAt(vec2 q, float bias) {
  vec2 ua = q / 6.1;
  vec2 ub = vec2(q.x * 0.391 - q.y * 0.921, q.x * 0.921 + q.y * 0.391) / 7.7 + 0.31;
  float pick = smoothstep(0.38, 0.62, vnoise(q / 19.0 + 6.0));
#ifdef LAKE_VERTEX
  vec4 nhA = texture2D(tRopeNh, ua);
  vec4 nhB = texture2D(tRopeNh, ub);
#else
  vec4 nhA = texture2D(tRopeNh, ua, bias);
  vec4 nhB = texture2D(tRopeNh, ub, bias);
#endif
  vec2 slope = mix(nhA.rg - 0.5, vec2(0.391 * (nhB.r - 0.5) + 0.921 * (nhB.g - 0.5), -0.921 * (nhB.r - 0.5) + 0.391 * (nhB.g - 0.5)), pick);
  return vec4(slope, mix(nhA.b, nhB.b, pick), pick);
}
float ridgeAt(vec2 q) {
  vec2 ab = uRidge.zw - uRidge.xy;
  vec2 rel = q - uRidge.xy;
  float t = clamp(dot(rel, ab) / dot(ab, ab), 0.0, 1.0);
  float side = (rel.x * ab.y - rel.y * ab.x) / length(ab);
  float across = length(rel - ab * t);
  float tall = (0.38 + 0.6 * vnoise(q / 1.9 + 3.0)) * pow(sin(t * 3.14159), 0.6);
  float reach = side > 0.0 ? 1.0 + 0.5 * vnoise(q / 1.3) : 2.1 + 0.8 * vnoise(q / 2.3 + 9.0);
  return tall * max(0.0, 1.0 - across / reach);
}
float gDeep;
float reliefAt(vec2 q) {
  vec4 n = netAt(q);
  float rope = ropeAt(q, 0.0).b;
  float gape = gapeAt(q, n).x;
  float edge = n.r + (rope - 0.5) * 0.3 - gape;
  float channel = smoothstep(0.04, 0.25, gape);
  float h = (rope - 0.5) * 0.075 + 0.1 * exp(-max(edge, 0.0) / 0.5) * channel + ridgeAt(q);
  gDeep = smoothstep(0.02, -0.2, edge) * step(1e-3, n.a);
  return mix(h, -0.2 * channel + 0.012 * rope, gDeep);
}`;

const VERTEX = /* glsl */ `
varying vec3 vNormalG;
varying float vDeep;
varying vec3 vWorld;
varying vec2 vDrift;
${RIG_GLSL}
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  // The drift is smooth over tens of metres: it is found at the corners and carried across the face.
  vDrift = flowVelocity(w.xz) * (uTime - uFlowT0);
  vNormalG = vec3(0.0, 1.0, 0.0);
  vDeep = 1.0;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// The crust near the camera, built: the same sheet in cells of a hand, lifted by its relief.
const PATCH_VERTEX = /* glsl */ `
attribute float aLift;
varying vec3 vWorld;
varying vec2 vDrift;
varying vec3 vNormalG;
varying float vDeep;
#define LAKE_VERTEX
${NOISE_GLSL}
${RIG_GLSL}
${HEAT_GLSL}
${RELIEF_GLSL}
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vDrift = flowVelocity(w.xz) * (uTime - uFlowT0);
  vec2 q = w.xz - vDrift;
  float e = 0.07;
  float h = reliefAt(q);
  vDeep = mix(1.0, gDeep, aLift);
  float hx = reliefAt(q + vec2(e, 0.0));
  float hz = reliefAt(q + vec2(0.0, e));
  w.y += h * aLift;
  vWorld = w.xyz;
  vNormalG = normalize(vec3((h - hx) * aLift, e, (h - hz) * aLift));
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec2 vDrift;
varying vec3 vNormalG;
varying float vDeep;
uniform sampler2D tSkin;
uniform sampler2D tSkinNh;
uniform sampler2D tRope;
uniform float uLava;
${NOISE_GLSL}
${RIG_GLSL}
#define LAKE_LIP
${HEAT_GLSL}
${RELIEF_GLSL}

// What a mirror on the lake sees toward r: the sky above the walls, the walls and the haze under it, the fume lit by the lake.
vec3 lakeMirror(vec3 r, float rough) {
  float wall = 0.16 + 0.2 * max(-r.z, 0.0);
  float soft = 0.05 + 0.5 * rough;
  float sky = smoothstep(wall - soft, wall + soft, r.y);
  float w = max(dot(normalize(vec3(r.x, max(r.y, 0.0), r.z)), uWarmDir), 0.0);
  vec3 low = uSkyHorizon * 0.5 + uWarmColour * w * w * w * 0.8;
  return mix(low, skyRadiance(vec3(r.x, max(r.y, wall), r.z)), sky);
}

void main() {
  vec2 xz = vWorld.xz;
  vec4 land = landAt(xz);
  if (land.b > 1.5) discard;
  float lake = -land.b;
  vec3 toCamera = cameraPosition - vWorld;
  float far = length(toCamera);
  vec3 v = toCamera / far;
  vec2 q = xz - vDrift;
  vec4 net = netAt(q);

  // Which way is away from the nearest seam, from how its distance changes across the picture.
  vec2 qx = dFdx(q);
  vec2 qy = dFdy(q);
  float det = qx.x * qy.y - qx.y * qy.x;
  float rx = dFdx(net.r);
  float ry = dFdy(net.r);
  vec2 away = vec2(rx * qy.y - ry * qx.y, ry * qx.x - rx * qy.x) / (abs(det) > 1e-10 ? det : 1e-10);
  float steep = length(away);
  away = steep > 0.35 && steep < 3.0 ? away / steep : vec2(0.0);

  // The skin: ropes of a hand to an arm across, twice and turned so that no repeat shows, wrinkles under them close to the
  // camera, and the same two pictures many times larger for the far lake, where a rope is smaller than a pixel.
  float near = smoothstep(55.0, 12.0, far);
  float mid = smoothstep(380.0, 60.0, far);
  float wide = smoothstep(1500.0, 300.0, far);
  vec2 uvA = q / 6.1;
  vec2 uvB = vec2(q.x * 0.391 - q.y * 0.921, q.x * 0.921 + q.y * 0.391) / 7.7 + 0.31;
  vec2 uvC = vec2(q.x * 0.5 + q.y * 0.866, -q.x * 0.866 + q.y * 0.5) / 41.0 + 0.57;
  vec2 uvD = vec2(q.x * 0.8 - q.y * 0.6, q.x * 0.6 + q.y * 0.8) / 1.37 + 0.13;
  vec4 ropes = ropeAt(q, 0.0);
  vec2 ropeSlope = ropes.xy;
  float ropeHigh = ropes.z;
  vec4 nhC = texture2D(tSkinNh, uvC, 1.0);
  vec3 rope = mix(texture2D(tRope, uvA).rgb, texture2D(tRope, uvB).rgb, ropes.w);
  vec3 skinC = texture2D(tSkin, uvC).rgb;
  vec4 grainNh = texture2D(tSkinNh, uvD);
  vec3 grain = texture2D(tSkin, uvD).rgb;

  // The edge of a gap follows the ropes.
  net.r += (ropeHigh - 0.5) * 0.3 * mid;
  vec4 heat = heatAt(q, lake, net, 0.0);
  float edge = heat.z;
  float young = heat.w;
  float age = clamp(net.b + 0.35 * (vnoise(q / 37.0 + 4.0) - 0.5), 0.0, 1.0) * (1.0 - young);

  // The crust rides up at the edge of a gap: a lip a hand high that leans away from the lava.
  float off = max(edge, 0.0);
  float lip = exp(-off / 0.3);
  vec2 slope = ropeSlope * 0.4 * mid;
  slope += vec2(0.5 * (nhC.r - 0.5) - 0.866 * (nhC.g - 0.5), 0.866 * (nhC.r - 0.5) + 0.5 * (nhC.g - 0.5)) * 0.4 * wide;
  slope *= 1.0 - 0.5 * young;
  slope += vec2(0.8 * (grainNh.r - 0.5) + 0.6 * (grainNh.g - 0.5), -0.6 * (grainNh.r - 0.5) + 0.8 * (grainNh.g - 0.5)) * 0.3 * near;
  slope += away * (0.45 * lip * mid * step(1e-3, net.a)) * step(0.999, vNormalG.y);
  vec3 n = normalize(vNormalG + vec3(slope.x, 0.0, slope.y));

  // Old skin is grey and dull, young skin beside a seam is dark, smooth and glassy.
  vec3 albedo = mix(skinC * 1.15, mix(vec3(0.27), rope, 0.8), mid) * mix(vec3(1.0), grain * 3.6, near * 0.5) * vec3(0.9, 0.97, 1.1);
  albedo *= 1.25 + 1.3 * age;
  albedo = mix(albedo, vec3(dot(albedo, vec3(0.33))) * vec3(0.97, 1.0, 1.05), 0.4 * age);
  albedo *= 1.0 - 0.45 * young;
  float hollow = mix(1.0, 0.86 + 0.28 * ropeHigh, mid) * mix(1.0, 0.85 + 0.3 * grainNh.b, near);
  float hair = smoothstep(0.02 + 0.0015 * far, 0.0, net.r) * smoothstep(220.0, 40.0, far) * smoothstep(0.3, 0.6, vnoise(q / 23.0 + 9.0));
  float crack = 1.0 - 0.55 * hair;
  float rough = clamp(0.36 + 0.5 * age + 0.3 * (ropeHigh - 0.5) * mid + 0.25 * (1.0 - mid), 0.18, 0.92);

  vec3 p = vec3(xz.x, 0.02, xz.y);
  float open = land.g * (1.0 - contactAt(p)) * hollow * crack;
  vec3 light = skyIrradiance(n) * open + lakeIrradianceFar(vec3(xz.x, 1.5, xz.y), n) + emitterIrradiance(p, n);
  // The lava in a gap lights the lip of the crust beside it, most where the lip leans toward it.
  light += gLip * (0.22 + 0.5 * (1.0 - ropeHigh)) * crack;
  vec3 c = albedo * light / 3.14159;
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float fresnel = (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * (1.0 - 0.72 * rough);
  vec3 r = reflect(-v, normalize(n + vec3(0.0, 1.5, 0.0)));
  r.y = abs(r.y);
  c += fresnel * lakeMirror(r, rough) * open;

  // The bank of a channel is crust seen on edge: dark, lit hard by the lava at its foot, glowing where it meets it.
  float bank = (1.0 - smoothstep(0.82, 0.98, vDeep)) * step(edge, 0.03);
  float kelvin = mix(heat.y, 930.0 + 150.0 * vDeep * ropeHigh, bank);
  heat.x = mix(heat.x, smoothstep(0.35, 0.9, vDeep) * 0.8, bank);
  c *= 1.0 - 0.6 * smoothstep(0.0, 0.4, vDeep);
  c += albedo * gLip * (0.12 * vDeep * vDeep) * bank;

  // Open lava hides the crust. The skin beside it still glows.
  vec3 hot = blackbody(kelvin) * heat.x;
  hot += blackbody(mix(760.0, 1040.0, lip * lip)) * 0.5 * step(1e-3, heat.x + young) * young;
  gl_FragColor = vec4(rigOut(c * (1.0 - heat.x)) + hot * uLava, 1.0);
}`;

const GLOW_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec2 vDrift;
${NOISE_GLSL}
${RIG_GLSL}
${HEAT_GLSL}
void main() {
  vec2 xz = vWorld.xz;
  float shore = landAt(xz).b;
  if (shore > 1.5) discard;
  vec2 q = xz - vDrift;
  vec4 heat = heatAt(q, -shore, netAt(q), 1.0 / uGlowTexels);
  gl_FragColor = vec4(blackbody(heat.y) * heat.x, 1.0);
}`;

// The sheet of the lake, cut to the lake's outline: a face that lies wholly under the land is left out, because this renderer
// pays for every fragment drawn, seen or not.
const CELL = 12;
const X0 = NET.minX - 12;
const Z0 = NET.minZ - 12;
// A pressure ridge in front of the camera of key heart-2: two slabs shoved against each other.
const RIDGE: readonly [number, number, number, number] = [-517.9, 283.0, -523.0, 277.1];

// The cells of the sheet that are built in relief: those the channels of the near shore run through, and the ridge.
function builtCells(): Set<string> {
  const cells = new Set<string>();
  const mark = (x: number, z: number, reach: number): void => {
    for (let i = Math.floor((x - reach - X0) / CELL); i <= Math.floor((x + reach - X0) / CELL); i++) {
      for (let j = Math.floor((z - reach - Z0) / CELL); j <= Math.floor((z + reach - Z0) / CELL); j++) cells.add(`${i},${j}`);
    }
  };
  for (const name of ['line', 'nearA', 'nearB']) for (const p of seamLine(name, 60)) mark(p[0], p[1], 3.2);
  for (let k = 0; k <= 12; k++) mark(RIDGE[0] + ((RIDGE[2] - RIDGE[0]) * k) / 12, RIDGE[1] + ((RIDGE[3] - RIDGE[1]) * k) / 12, 4.5);
  return cells;
}

// The built cells, in squares of fine metres. The lift falls to nothing at the edge of the patch, where it meets the flat sheet.
function patchSheet(cells: Set<string>, fine: number): THREE.BufferGeometry {
  const n = Math.round(CELL / fine);
  const position: number[] = [];
  const lift: number[] = [];
  const faces: number[] = [];
  const has = (i: number, j: number): boolean => cells.has(`${i},${j}`);
  for (const key of cells) {
    const [ci, cj] = key.split(',').map(Number) as [number, number];
    const base = position.length / 3;
    const west = has(ci - 1, cj);
    const east = has(ci + 1, cj);
    const north = has(ci, cj - 1);
    const south = has(ci, cj + 1);
    for (let b = 0; b <= n; b++) {
      for (let a = 0; a <= n; a++) {
        const u = a * fine;
        const v = b * fine;
        let edge = 1e9;
        if (!west) edge = Math.min(edge, u);
        if (!east) edge = Math.min(edge, CELL - u);
        if (!north) edge = Math.min(edge, v);
        if (!south) edge = Math.min(edge, CELL - v);
        if (!has(ci - 1, cj - 1)) edge = Math.min(edge, Math.hypot(u, v));
        if (!has(ci + 1, cj - 1)) edge = Math.min(edge, Math.hypot(CELL - u, v));
        if (!has(ci - 1, cj + 1)) edge = Math.min(edge, Math.hypot(u, CELL - v));
        if (!has(ci + 1, cj + 1)) edge = Math.min(edge, Math.hypot(CELL - u, CELL - v));
        position.push(X0 + ci * CELL + u, 0, Z0 + cj * CELL + v);
        const k = Math.min(1, edge / 1.2);
        lift.push(k * k * (3 - 2 * k));
      }
    }
    for (let b = 0; b < n; b++) {
      for (let a = 0; a < n; a++) {
        const p = base + b * (n + 1) + a;
        faces.push(p, p + n + 1, p + 1, p + 1, p + n + 1, p + n + 2);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  g.setAttribute('aLift', new THREE.Float32BufferAttribute(lift, 1));
  g.setIndex(faces);
  return g;
}

function lakeSheet(ctx: HeartContext, cell: number, skip: Set<string>): THREE.BufferGeometry {
  const x0 = X0;
  const z0 = Z0;
  const nx = Math.ceil((NET.width * NET.cell + 24) / cell);
  const nz = Math.ceil((NET.height * NET.cell + 24) / cell);
  const wet = new Uint8Array((nx + 1) * (nz + 1));
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) wet[j * (nx + 1) + i] = ctx.rig.land.shore(x0 + i * cell, z0 + j * cell) < 2.5 ? 1 : 0;
  const index = new Map<number, number>();
  const position: number[] = [];
  const faces: number[] = [];
  const corner = (i: number, j: number): number => {
    const k = j * (nx + 1) + i;
    let v = index.get(k);
    if (v === undefined) {
      v = position.length / 3;
      position.push(x0 + i * cell, 0, z0 + j * cell);
      index.set(k, v);
    }
    return v;
  };
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * (nx + 1) + i;
      if (!(wet[k] || wet[k + 1] || wet[k + nx + 1] || wet[k + nx + 2]) || skip.has(`${i},${j}`)) continue;
      const a = corner(i, j);
      const b = corner(i + 1, j);
      const c = corner(i, j + 1);
      const d = corner(i + 1, j + 1);
      faces.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  g.setIndex(faces);
  return g;
}

export function create(ctx: HeartContext): HeartPiece {
  const net = bakeNet((x, z) => -ctx.rig.land.shore(x, z));
  const shared = {
    ...ctx.rig.uniforms,
    tNet: { value: net.wide },
    uNetRect: { value: new THREE.Vector4(NET.minX, NET.minZ, 1 / (NET.width * NET.cell), 1 / (NET.height * NET.cell)) },
    tNetFine: { value: net.fine },
    uNetFineRect: { value: new THREE.Vector4(NET_FINE.minX, NET_FINE.minZ, 1 / (NET_FINE.width * NET_FINE.cell), 1 / (NET_FINE.height * NET_FINE.cell)) },
    uPool: { value: new THREE.Vector4(POOL.x, POOL.z, 1 / POOL.rx, 1 / POOL.rz) },
    uSunk: { value: new THREE.Vector3(SUNK[0], SUNK[2], 14) },
    tRopeNh: { value: ctx.assets.texture('mat/pahoehoe-nh.png', { kind: 'data', anisotropy: 4 }) },
    uRidge: { value: new THREE.Vector4(RIDGE[0], RIDGE[1], RIDGE[2], RIDGE[3]) },
  };
  const foundering = createFoundering(ctx);
  Object.assign(shared, foundering.uniforms);
  const lava = { value: 1 };
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      ...shared,
      tSkin: { value: ctx.assets.texture('mat/crust-skin.jpg', { anisotropy: 4 }) },
      tSkinNh: { value: ctx.assets.texture('mat/crust-skin-nh.png', { kind: 'data', anisotropy: 4 }) },
      tRope: { value: ctx.assets.texture('mat/pahoehoe.jpg', { anisotropy: 4 }) },
      uLava: lava,
    },
  });
  material.userData.depthFragment = `precision highp float;\nvarying vec3 vWorld;\n${RIG_GLSL}\nvoid main() { if (landAt(vWorld.xz).b > 1.5) discard; gl_FragColor = vec4(0.0); }`;
  const built = builtCells();
  const sheet = new THREE.Mesh(lakeSheet(ctx, CELL, built), material);
  const patchMaterial = new THREE.ShaderMaterial({ vertexShader: PATCH_VERTEX, fragmentShader: FRAGMENT, uniforms: material.uniforms });
  patchMaterial.userData.depthFragment = material.userData.depthFragment;
  const patch = new THREE.Mesh(patchSheet(built, 0.1), patchMaterial);
  patch.frustumCulled = false;
  const crust = new THREE.Group();
  crust.add(sheet, patch);
  ctx.scene.add(ctx.parts.built('crust', crust));
  // The lava is drawn by the same sheet: it is an effect of the crust, and alone it is the sheet with everything but its heat blacked.
  ctx.parts.effect('lava', 'built');

  const glowMaterial = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: GLOW_FRAGMENT, uniforms: shared, depthTest: false, depthWrite: false });
  const glow = new THREE.Mesh(sheet.geometry, glowMaterial);
  glow.frustumCulled = false;
  ctx.rig.glowScene.add(glow);


  return {
    setTime: (seconds) => foundering.setTime(seconds),
    solo: (part) => {
      lava.value = part === null || part === 'heart/lava' ? 1 : 0;
      foundering.solo(part);
    },
    dispose: () => {
      sheet.geometry.dispose();
      patch.geometry.dispose();
      patchMaterial.dispose();
      material.dispose();
      glowMaterial.dispose();
      net.wide.dispose();
      net.fine.dispose();
      foundering.dispose();
    },
  };
}
