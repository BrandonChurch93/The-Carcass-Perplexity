// The lake of the Heart: the crust, the lava that shows in its seams, and the crust that founders at the fountains.
// The crust is one sheet. What it shows is read from the net of plates (net.ts), which rides the drift of the lake:
// seams that open, widen, skin over and close, the open pool at the foot of the fall, the torn margin against the rock.
// The same heat is drawn into the rig's glow map, so that what lights the land and the animals is what the camera sees.
import * as THREE from 'three';
import type { HeartContext, HeartPiece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { SUNK } from '../shared/anchors';
import { NET, NET_FINE, POOL, bakeNet } from './net';
import { createFoundering } from './founder';
import { HEAT_GLSL } from './heat';

export const PARTS: readonly string[] = ['crust', 'lava', 'foundering'];

const VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec2 vDrift;
${RIG_GLSL}
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  // The drift is smooth over tens of metres: it is found at the corners and carried across the face.
  vDrift = flowVelocity(w.xz) * (uTime - uFlowT0);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec2 vDrift;
uniform sampler2D tSkin;
uniform sampler2D tSkinNh;
uniform sampler2D tRope;
uniform sampler2D tRopeNh;
uniform float uLava;
${NOISE_GLSL}
${RIG_GLSL}
${HEAT_GLSL}

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

  // The skin at three sizes, turned against each other so that no repeat shows: folds of metres, wrinkles of a hand, grain.
  vec2 uvA = q / 5.0;
  vec2 uvB = vec2(q.x * 0.8 - q.y * 0.6, q.x * 0.6 + q.y * 0.8) / 19.0 + 0.31;
  vec2 uvC = vec2(q.x * 0.5 + q.y * 0.866, -q.x * 0.866 + q.y * 0.5) / 43.0 + 0.57;
  float near = smoothstep(140.0, 20.0, far);
  float mid = smoothstep(700.0, 120.0, far);
  vec4 nhA = texture2D(tSkinNh, uvA);
  vec4 nhB = texture2D(tSkinNh, uvB);
  vec4 nhC = texture2D(tRopeNh, uvC);
  vec3 skinA = texture2D(tSkin, uvA).rgb;
  vec3 skinB = texture2D(tSkin, uvB).rgb;

  // The edge of a gap follows the wrinkles of the skin.
  net.r += ((nhB.b - 0.5) * 0.5 + (nhA.b - 0.5) * 0.12) * mid;
  vec4 heat = heatAt(q, lake, net, 0.0);
  float edge = heat.z;
  float young = heat.w;
  float age = clamp(net.b + 0.35 * (vnoise(q / 37.0 + 4.0) - 0.5), 0.0, 1.0) * (1.0 - young);

  vec2 slope = (nhA.rg - 0.5) * (0.2 + 0.5 * near);
  slope += vec2(0.8 * (nhB.r - 0.5) + 0.6 * (nhB.g - 0.5), -0.6 * (nhB.r - 0.5) + 0.8 * (nhB.g - 0.5)) * 0.45 * mid;
  slope += vec2(0.5 * (nhC.r - 0.5) - 0.866 * (nhC.g - 0.5), 0.866 * (nhC.r - 0.5) + 0.5 * (nhC.g - 0.5)) * 0.5 * mid;
  slope *= 1.0 - 0.55 * young;
  vec3 n = normalize(vec3(slope.x, 1.0, slope.y));

  // Old skin is grey and dull, young skin beside a seam is dark, smooth and glassy.
  vec3 albedo = mix(skinB, skinA, 0.3 + 0.4 * near) * (1.3 + 1.9 * age);
  albedo = mix(albedo, vec3(dot(albedo, vec3(0.33))), 0.35 * age);
  float hollow = mix(1.0, 0.7 + 0.6 * nhB.b, mid) * mix(1.0, 0.8 + 0.4 * nhA.b, near);
  float lip = smoothstep(0.5, 0.0, edge);
  float crack = 1.0 - 0.7 * smoothstep(0.05 + 0.0012 * far, 0.0, net.r) * mid;
  float rough = clamp(0.3 + 0.55 * age + 0.25 * (nhB.b - 0.5), 0.14, 0.92);

  vec3 p = vec3(xz.x, 0.02, xz.y);
  float open = land.g * (1.0 - contactAt(p)) * hollow * crack * (1.0 - 0.5 * lip);
  vec3 light = skyIrradiance(n) * open + lakeIrradianceFar(vec3(xz.x, 1.5, xz.y), n) + emitterIrradiance(p, n);
  // The lava in a gap lights the lip of the crust beside it.
  light += blackbody(heat.y) * heat.x * 0.0;
  vec3 c = albedo * light / 3.14159;
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float fresnel = (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * (1.0 - 0.75 * rough);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  c += fresnel * lakeMirror(r, rough) * open;

  // Open lava hides the crust. The skin beside it still glows.
  vec3 hot = blackbody(heat.y) * heat.x;
  hot += blackbody(mix(760.0, 1060.0, lip * lip)) * 0.5 * step(1e-3, heat.x + young) * young;
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
function lakeSheet(ctx: HeartContext, cell: number): THREE.BufferGeometry {
  const x0 = NET.minX - 12;
  const z0 = NET.minZ - 12;
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
      if (!(wet[k] || wet[k + 1] || wet[k + nx + 1] || wet[k + nx + 2])) continue;
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
      tRopeNh: { value: ctx.assets.texture('mat/pahoehoe-nh.png', { kind: 'data', anisotropy: 4 }) },
      uLava: lava,
    },
  });
  material.userData.depthFragment = `precision highp float;\nvarying vec3 vWorld;\n${RIG_GLSL}\nvoid main() { if (landAt(vWorld.xz).b > 1.5) discard; gl_FragColor = vec4(0.0); }`;
  const sheet = new THREE.Mesh(lakeSheet(ctx, 12), material);
  ctx.scene.add(ctx.parts.built('crust', sheet));
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
      material.dispose();
      glowMaterial.dispose();
      net.wide.dispose();
      net.fine.dispose();
      foundering.dispose();
    },
  };
}
