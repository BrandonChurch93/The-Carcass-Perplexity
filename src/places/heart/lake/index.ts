// The lake of the Heart: the crust, the lava that shows in its seams, and the crust that founders at the fountains.
// First light, by the root: one sheet, the skin of the crust from its picture, a net of seams that drifts with the lake,
// the seams the pictures show, and the same glow drawn into the rig's map so that it lights everything else.
// A name moves into PARTS when this folder draws it; until then the part keeps its stand-in from the blockout.
// The names this folder will own: 'crust', 'lava', 'foundering'.
import * as THREE from 'three';
import type { HeartContext, HeartPiece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { SEAMS, seamLine } from '../shared/anchors';

export const PARTS: readonly string[] = ['crust', 'lava'];

/** The seams the pictures show are baked, at the reference time, into a map of distance over this patch of the lake. */
const AUTHORED = { minX: -560, maxX: -240, minZ: 90, maxZ: 410, size: 1024, reach: 14 };

function authoredSeams(): THREE.DataTexture {
  const { size, reach } = AUTHORED;
  const cell = (AUTHORED.maxX - AUTHORED.minX) / size;
  const distance = new Float32Array(size * size).fill(reach);
  const width = new Float32Array(size * size).fill(1);
  for (const name of Object.keys(SEAMS)) {
    const seam = SEAMS[name] as (typeof SEAMS)[string];
    const line = seamLine(name, 28);
    for (let s = 0; s < line.length - 1; s++) {
      const a = line[s] as [number, number];
      const b = line[s + 1] as [number, number];
      // A seam is widest in its middle and closes to nothing at both ends.
      const taper = (t: number): number => 0.25 + 0.75 * Math.sin(Math.PI * Math.min(1, Math.max(0, t)));
      const i0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - reach - AUTHORED.minX) / cell));
      const i1 = Math.min(size - 1, Math.ceil((Math.max(a[0], b[0]) + reach - AUTHORED.minX) / cell));
      const j0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - reach - AUTHORED.minZ) / cell));
      const j1 = Math.min(size - 1, Math.ceil((Math.max(a[1], b[1]) + reach - AUTHORED.minZ) / cell));
      const ex = b[0] - a[0];
      const ez = b[1] - a[1];
      const l2 = ex * ex + ez * ez || 1;
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const x = AUTHORED.minX + (i + 0.5) * cell;
          const z = AUTHORED.minZ + (j + 0.5) * cell;
          const t = Math.min(1, Math.max(0, ((x - a[0]) * ex + (z - a[1]) * ez) / l2));
          const d = Math.hypot(x - a[0] - ex * t, z - a[1] - ez * t);
          const k = j * size + i;
          if (d < (distance[k] as number)) {
            distance[k] = d;
            width[k] = seam.width * taper((s + t) / (line.length - 1));
          }
        }
      }
    }
  }
  const data = new Uint16Array(size * size * 4);
  for (let k = 0; k < size * size; k++) {
    data[k * 4] = THREE.DataUtils.toHalfFloat(distance[k] as number);
    data[k * 4 + 1] = THREE.DataUtils.toHalfFloat(width[k] as number);
    data[k * 4 + 3] = THREE.DataUtils.toHalfFloat(1);
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.HalfFloatType);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

// The heat of the lake at a point of the crust. Used by the surface and by the glow map, so that what lights the land is what the camera sees.
// A seam narrower than a pixel is drawn a pixel wide and dimmer by the same factor, so its light is the same. `least` is a floor on that
// width in metres: zero for the surface, a texel for the glow map.
const SEAMS_GLSL = /* glsl */ `
uniform sampler2D tAuthored;
uniform vec4 uAuthoredRect;

// Distance to the nearest edge between plates, and a number for the plate, in units of the plate's size.
vec3 plates(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float f1 = 8.0;
  float f2 = 8.0;
  float id = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = hash22(i + g);
      float d = length(g + 0.15 + 0.7 * o - f);
      if (d < f1) { f2 = f1; f1 = d; id = o.x; }
      else if (d < f2) { f2 = d; }
    }
  }
  return vec3(0.5 * (f2 - f1), id, f1);
}

// x: how much of the place is open lava, 0 to 1. y: kelvin of the lava that shows. z: metres to the nearest seam.
vec3 seams(vec2 q, float least) {
  // The plates: large ones that part along crooked lines, and the smaller cracks inside them.
  vec2 bent = q + 7.0 * (vec2(vnoise(q / 13.0), vnoise(q / 13.0 + 31.7)) - 0.5) + 1.2 * (vec2(vnoise(q / 2.3), vnoise(q / 2.3 + 11.3)) - 0.5);
  vec3 big = plates(bent / 74.0 + 3.7);
  vec3 small = plates(bent / 23.0 + vec2(9.2, 4.1));
  float dBig = big.x * 74.0;
  float dSmall = small.x * 23.0;
  // Not every edge is open: each plate's edge opens along a part of its length.
  float openBig = smoothstep(0.42, 0.72, vnoise(q / 55.0 + big.y * 17.0));
  float openSmall = smoothstep(0.6, 0.85, vnoise(q / 31.0 + 7.7)) * smoothstep(0.3, 0.6, small.y);
  float wBig = 0.2 * openBig;
  float wSmall = 0.07 * openSmall;

  vec2 uv = (q - uAuthoredRect.xy) * uAuthoredRect.zw;
  vec2 e = min(uv, 1.0 - uv);
  vec4 a = texture2D(tAuthored, uv);
  float inside = step(0.0, min(e.x, e.y));
  float dA = mix(99.0, a.r, inside);
  float wA = a.g * 0.5 * (0.75 + 0.5 * vnoise(q * 0.9));

  float cover = 0.0;
  float heat = 0.0;
  float nearest = 99.0;
  // Each seam: half width w, drawn at least half a pixel wide.
  #define SEAM(d, w, k) { float ww = max(w, 0.5 * max(least, fwidth(d))); float c = (1.0 - smoothstep(ww * 0.55, ww, d)) * step(1e-3, w) * min(1.0, w / ww); float h = mix(k, 1120.0, smoothstep(0.0, ww, d)); if (c > cover) { cover = c; heat = h; } nearest = min(nearest, mix(99.0, d - w, step(1e-3, w))); }
  SEAM(dBig, wBig, 1300.0)
  SEAM(dSmall, wSmall, 1220.0)
  SEAM(dA, wA, 1420.0)
  return vec3(cover, heat, nearest);
}`;

const VERTEX = /* glsl */ `
varying vec3 vWorld;
void main() {
  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
uniform sampler2D tSkin;
uniform sampler2D tSkinNh;
uniform float uLava;
${NOISE_GLSL}
${RIG_GLSL}
${SEAMS_GLSL}
void main() {
  vec2 xz = vWorld.xz;
  float shore = landAt(xz).b;
  if (shore > 1.5) discard;
  vec3 v = normalize(cameraPosition - vWorld);
  float far = length(cameraPosition - vWorld);
  vec2 q = crustPoint(xz);
  vec3 s = seams(q, 0.0);

  // The skin: the picture at two scales, turned against each other so the repeat does not show.
  vec2 uvA = q / 5.0;
  vec2 uvB = vec2(q.x * 0.8 - q.y * 0.6, q.x * 0.6 + q.y * 0.8) / 17.0 + 0.31;
  float near = smoothstep(160.0, 30.0, far);
  vec3 skin = mix(texture2D(tSkin, uvB).rgb, texture2D(tSkin, uvA).rgb, 0.35 + 0.35 * near);
  vec4 nhA = texture2D(tSkinNh, uvA);
  vec4 nhB = texture2D(tSkinNh, uvB);
  vec2 slope = (nhA.rg - 0.5) * (0.5 + near) + (nhB.rg - 0.5) * 0.8 * smoothstep(900.0, 150.0, far);
  // Plates differ a little in age: older skin is duller and greyer.
  float age = vnoise(q / 90.0 + 4.0);
  vec3 albedo = skin * (2.0 + 1.0 * age);
  // The crust thins and warps up toward a seam.
  float lip = smoothstep(1.2, 0.0, s.z);
  vec3 n = normalize(vec3(slope.x * 0.8, 1.0, slope.y * 0.8));
  float rough = 0.34 + 0.25 * nhA.b * near + 0.2 * age;
  vec3 c = rigShade(vec3(xz.x, 0.02, xz.y), n, v, albedo * (1.0 - 0.6 * lip), rough, 1.0 - 0.3 * lip);
  // Skin that is still hot beside open lava.
  vec3 hot = blackbody(mix(700.0, 1080.0, lip * lip)) * 0.6 + blackbody(s.y) * s.x;
  gl_FragColor = vec4(rigOut(c) + hot * uLava, 1.0);
}`;

const GLOW_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
${NOISE_GLSL}
${RIG_GLSL}
${SEAMS_GLSL}
void main() {
  vec2 xz = vWorld.xz;
  if (landAt(xz).b > 1.5) discard;
  vec3 s = seams(crustPoint(xz), 1.0 / uGlowTexels);
  gl_FragColor = vec4(blackbody(s.y) * s.x, 1.0);
}`;

export function create(ctx: HeartContext): HeartPiece {
  const authored = authoredSeams();
  const span = AUTHORED.maxX - AUTHORED.minX;
  const shared = {
    ...ctx.rig.uniforms,
    tAuthored: { value: authored },
    uAuthoredRect: { value: new THREE.Vector4(AUTHORED.minX, AUTHORED.minZ, 1 / span, 1 / (AUTHORED.maxZ - AUTHORED.minZ)) },
  };
  const lava = { value: 1 };
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      ...shared,
      tSkin: { value: ctx.assets.texture('mat/crust-skin.jpg', { anisotropy: 8 }) },
      tSkinNh: { value: ctx.assets.texture('mat/crust-skin-nh.png', { kind: 'data', anisotropy: 4 }) },
      uLava: lava,
    },
  });
  material.userData.depthFragment = `precision highp float;\nvarying vec3 vWorld;\n${RIG_GLSL}\nvoid main() { if (landAt(vWorld.xz).b > 1.5) discard; gl_FragColor = vec4(0.0); }`;
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(3400, 2200, 1, 1).rotateX(-Math.PI / 2).translate(150, 0, 60), material);
  ctx.scene.add(ctx.parts.built('crust', sheet));
  // The lava is drawn by the same sheet: it is an effect of the crust, and alone it is the sheet with everything but its heat blacked.
  ctx.parts.effect('lava', 'built');

  const glowMaterial = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: GLOW_FRAGMENT, uniforms: shared, depthTest: false, depthWrite: false });
  const glow = new THREE.Mesh(sheet.geometry, glowMaterial);
  glow.frustumCulled = false;
  ctx.rig.glowScene.add(glow);

  return {
    solo: (part) => {
      lava.value = part === null || part === 'heart/lava' ? 1 : 0;
    },
    dispose: () => {
      sheet.geometry.dispose();
      material.dispose();
      glowMaterial.dispose();
      authored.dispose();
    },
  };
}
