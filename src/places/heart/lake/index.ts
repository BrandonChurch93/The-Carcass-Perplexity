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
#define LAKE_LIP
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
  vec2 uvA = q / 13.0;
  vec2 uvB = vec2(q.x * 0.391 - q.y * 0.921, q.x * 0.921 + q.y * 0.391) / 16.7 + 0.31;
  vec2 uvC = vec2(q.x * 0.5 + q.y * 0.866, -q.x * 0.866 + q.y * 0.5) / 41.0 + 0.57;
  vec2 uvD = vec2(q.x * 0.8 - q.y * 0.6, q.x * 0.6 + q.y * 0.8) / 1.37 + 0.13;
  float pick = smoothstep(0.38, 0.62, vnoise(q / 19.0 + 6.0));
  vec4 nhA = texture2D(tRopeNh, uvA, 0.7);
  vec4 nhB = texture2D(tRopeNh, uvB, 0.7);
  vec4 nhC = texture2D(tSkinNh, uvC, 1.0);
  vec3 ropeA = texture2D(tRope, uvA).rgb;
  vec3 ropeB = texture2D(tRope, uvB).rgb;
  vec3 skinC = texture2D(tSkin, uvC).rgb;
  vec3 grain = texture2D(tSkin, uvD).rgb;
  vec3 rope = mix(ropeA, ropeB, pick);
  float ropeHigh = mix(nhA.b, nhB.b, pick);
  vec2 ropeSlope = mix(nhA.rg - 0.5, vec2(0.391 * (nhB.r - 0.5) + 0.921 * (nhB.g - 0.5), -0.921 * (nhB.r - 0.5) + 0.391 * (nhB.g - 0.5)), pick);

  // The edge of a gap follows the ropes.
  net.r += (ropeHigh - 0.5) * 0.3 * mid;
  vec4 heat = heatAt(q, lake, net, 0.0);
  float edge = heat.z;
  float young = heat.w;
  float age = clamp(net.b + 0.35 * (vnoise(q / 37.0 + 4.0) - 0.5), 0.0, 1.0) * (1.0 - young);

  // The crust rides up at the edge of a gap: a lip a hand high that leans away from the lava.
  float off = max(edge, 0.0);
  float lip = exp(-off / 0.3);
  vec2 slope = ropeSlope * 0.5 * mid;
  slope += vec2(0.5 * (nhC.r - 0.5) - 0.866 * (nhC.g - 0.5), 0.866 * (nhC.r - 0.5) + 0.5 * (nhC.g - 0.5)) * 0.4 * wide;
  slope *= 1.0 - 0.5 * young;
  slope += away * (0.45 * lip * mid * step(1e-3, net.a));
  vec3 n = normalize(vec3(slope.x, 1.0, slope.y));

  // Old skin is grey and dull, young skin beside a seam is dark, smooth and glassy.
  vec3 albedo = mix(skinC * 1.15, rope, mid) * mix(vec3(1.0), grain * 3.6, near * 0.7);
  albedo *= 1.25 + 1.3 * age;
  albedo = mix(albedo, vec3(dot(albedo, vec3(0.33))) * vec3(0.97, 1.0, 1.05), 0.4 * age);
  albedo *= 1.0 - 0.45 * young;
  float hollow = mix(1.0, 0.62 + 0.76 * ropeHigh, mid);
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
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  c += fresnel * lakeMirror(r, rough) * open;

  // The far side of a gap shows its wall: the lava lies a hand under the skin, and the near lip hides the foot of the far one.
  vec2 back = -v.xz / max(length(v.xz), 1e-4);
  float sunkBy = min(0.16 / max(v.y, 0.02), 0.75 * max(-edge, 0.0) + 0.02) * near;
  float wall = smoothstep(0.0, 0.03, edge + sunkBy * max(dot(back, away), 0.0)) * step(edge, 0.0);
  float kelvin = mix(heat.y, 1010.0 + 110.0 * ropeHigh, wall * 0.85);

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
