// Everything that stands over the surface: the cloud at its heights, the cyclone, the storm on the spine, the vapour of the throat, and at the
// edge of the planet the air and the black behind it. Each is a sheet at its own height, so the rise passes them at their own speeds.
// The cloud itself is one field of the world (shared/weather.ts): the surface takes its shade from the same field.
import * as THREE from 'three';
import { AT, KM, LIMB, X, Z } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { FRONTS_GLSL, FRONT_KM, HIGH_KM, LOW_KM, WEATHER_GLSL } from '../shared/weather';

export const PARTS = ['cloud', 'cyclone', 'storm', 'vapour', 'space', 'atmosphere'] as const;

const UV_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// The light on a cloud top: the sun on the faces turned to it, the sky on all of it, and the air between it and the eye.
const CLOUD_LIGHT_GLSL = /* glsl */ `
vec3 cloudLight(vec2 xz, float facing, float thick, float high) {
  float mu = limbCos(xz);
  float sun = uSunDir.y * (0.3 + 1.3 * clamp(facing, 0.0, 1.0)) * (0.5 + 0.5 * thick);
  vec3 c = 0.72 * (uSunColour * sun + uSkyColour * 0.9) / 3.14159;
  float air = 1.0 - exp(-0.008 * (1.0 - 0.6 * high) / max(mu, 0.12));
  return mix(c, uAirColour * 0.7, air);
}`;

const CLOUD_FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
${WEATHER_GLSL}
${FRONTS_GLSL}
${CLOUD_LIGHT_GLSL}
uniform sampler2D uFront;
uniform sampler2D uVeil;
varying vec3 vWorld;
void main() {
  vec2 xz = vWorld.xz;
  vec2 toSun = normalize(uSunDir.xz);
  // What one ray meets on its way down: the veil of ice, then the fronts, then the low field, each at its own height.
  vec2 lean = (cameraPosition.xz - xz) / max(cameraPosition.y - ${LOW_KM.toFixed(1)}, 1.0);
  vec2 mid = xz + lean * ${(FRONT_KM - LOW_KM).toFixed(1)};
  vec2 up = xz + lean * ${(HIGH_KM - LOW_KM).toFixed(1)};
  float lift = mix(1.0, 3.0, smoothstep(150.0, 700.0, uViewKm));

  // The low field. Each cloud is lit on its side toward the sun and dark on the other: its neighbour toward the sun shades it.
  vec2 low = lowField(xz);
  float reach = 0.9 + 0.02 * uViewKm;
  float sunward = lowField(xz + toSun * reach).x;
  float self = clamp(0.55 + 0.7 * (low.x - sunward), 0.0, 1.0);

  // The fronts: long bands of deep cloud that cross the sea, and their shade on the field under them.
  vec2 fa = mid - uTime * FRONT_DRIFT;
  vec2 front = frontPlate(uFront, fa, vec2(0.0));
  float frontSun = frontPlate(uFront, fa + toSun * (6.0 + 0.02 * uViewKm), vec2(0.0)).y;
  float frontSelf = clamp(0.5 + 2.2 * (front.y - frontSun), 0.0, 1.0);
  float under = coverAt(xz + uSunDir.xz / max(uSunDir.y, 0.2) * ${(FRONT_KM - LOW_KM).toFixed(1)} * lift - uTime * FRONT_DRIFT).r;

  // The veil: thin ice, far above, drifting the other way.
  vec2 hv = up + uTime * vec2(2.2, -1.3);
  float ice = dot(texture2D(uVeil, mat2(0.9, 0.44, -0.44, 0.9) * hv / 800.0).rgb, vec3(0.3, 0.55, 0.15));
  float where = texture2D(uCloudTile, hv / 5200.0 + vec2(0.61, 0.27)).b;
  float high = smoothstep(0.1, 0.7, ice) * smoothstep(0.42, 0.75, where) * smoothstep(500.0, 1500.0, length(up - vec2(${X(AT.lake.x).toFixed(1)}, ${Z(AT.lake.y).toFixed(1)})));

  vec3 lowColour = cloudLight(xz, 0.2 + 0.55 * low.y + 0.4 * self, low.x, 0.0) * mix(0.66 + 0.3 * low.y, 0.8 + 0.3 * low.y, smoothstep(330.0, 760.0, uViewKm)) * (1.0 - 0.15 * under) * (1.0 - 0.15 * high);
  vec3 frontColour = cloudLight(mid, 0.2 + 0.55 * front.y + 0.5 * frontSelf, 0.5 + 0.5 * front.x, 0.5) * (0.55 + 0.6 * front.y);
  vec3 highColour = cloudLight(up, 0.6, 0.6, 1.0);
  float a = low.x * 0.94;
  float m = front.x * 0.05;
  float b = high * 0.05;
  vec3 colour = lowColour * a * (1.0 - m) * (1.0 - b) + frontColour * m * (1.0 - b) + highColour * b;
  float alpha = 1.0 - (1.0 - a) * (1.0 - m) * (1.0 - b);
  gl_FragColor = vec4(colour * (1.0 - uSolo), alpha * (1.0 - uSolo)) * uArrive;
}`;

const CYCLONE_FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
${CLOUD_LIGHT_GLSL}
uniform sampler2D uPicture;
uniform sampler2D uStreaks;
uniform sampler2D uCloudTile;
varying vec3 vWorld;
varying vec2 vUv;
float lightOf(vec2 q, float soft) {
  return dot(texture2D(uPicture, q, soft).rgb, vec3(0.3, 0.55, 0.15));
}
// The bands of the storm: the photograph of wind-drawn cloud streaks (mat/streaks.jpg), wound round the eye, so each band is real cloud
// and lies along a spiral with sea between it and the next. x how thick, y its light.
vec2 bands(vec2 p, float turn) {
  float r = max(length(p), 1e-3);
  float around = atan(p.y, p.x) / 6.28318 - turn;
  float lr = log(r);
  vec2 uv = vec2(3.0 * around + 0.45 * lr, 0.7 * lr - 3.0 * around);
  // (A bend, so no band is a drawn curve.)
  uv += 0.014 * (texture2D(uCloudTile, p * 0.22 + 0.3, 3.0).rg - 0.5);
  float grain = 0.75 / max(r, 0.05);
  vec2 gx = dFdx(vUv) * grain * 2.0;
  vec2 gy = dFdy(vUv) * grain * 2.0;
  // (Read three times along the band: the wind draws the cloud out into fibres.)
  vec3 c = textureGrad(uStreaks, uv, gx, gy).rgb * 0.4 + textureGrad(uStreaks, uv + vec2(0.012, 0.0), gx, gy).rgb * 0.3 + textureGrad(uStreaks, uv - vec2(0.012, 0.0), gx, gy).rgb * 0.3;
  float lum = dot(c, vec3(0.3, 0.55, 0.15));
  // (Thin cloud: the sea shows through all but the thickest of a band.)
  return vec2(smoothstep(0.1, 0.6, lum), lum);
}
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  // The whole storm turns, the middle faster than the rim, so its arms wind as the frame is held.
  float turn = uTime * (0.005 + 0.03 / (1.0 + 14.0 * r));
  float c = cos(turn);
  float s = sin(turn);
  mat2 spin = mat2(c, s, -s, c);
  vec2 q = spin * p * 0.5 + 0.5;
  // The middle is a photograph of a storm from orbit (public/assets/reveal/mat/cyclone.jpg): the wall round the eye, and where its arms lie.
  float seenLight = lightOf(q, 0.0);
  float arms = lightOf(q, 4.0);
  vec2 sunStep = normalize(uSunDir.xz);
  float sunward = lightOf(q + spin * sunStep * 0.006, 0.0);
  float core = 1.0 - smoothstep(0.015, 0.06, r);
  vec2 band = bands(p, turn / 6.28318);
  float bandSun = bands(p + sunStep * 0.012, turn / 6.28318).x;
  // Out along the arms the cloud is bands with sea between, thinner the farther out, thick where the photograph's arms lie.
  float outer = band.x * (0.45 + 0.5 * smoothstep(0.08, 0.5, arms)) * (1.0 - smoothstep(0.4, 0.99, r)) * smoothstep(0.012, 0.04, r);
  float inner = 0.8 * smoothstep(0.5, 0.95, seenLight);
  float thick = max(mix(outer, max(inner, outer), core), 0.16 * (1.0 - smoothstep(0.1, 0.7, r))) * smoothstep(0.006, 0.018, r);
  float self = clamp(0.5 + mix(0.8 * (band.x - bandSun), 3.0 * (seenLight - sunward), core), 0.0, 1.0);
  float light = mix(band.y, seenLight, core);
  float tall = smoothstep(0.45, 0.9, seenLight) * core;
  vec3 colour = cloudLight(vWorld.xz, 0.12 + 0.4 * light + 0.65 * self, 0.5 + 0.5 * tall, 0.5 * tall) * (0.66 + 0.3 * light);
  float alpha = clamp(thick, 0.0, 0.86);
  gl_FragColor = vec4(colour * alpha * (1.0 - uSolo), alpha * (1.0 - uSolo)) * uArrive;
}`;

const STORM_FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
${CLOUD_LIGHT_GLSL}
uniform sampler2D uPicture;
uniform sampler2D uCloudTile;
varying vec3 vWorld;
varying vec2 vUv;
// A flash inside the anvil: where and how bright, for one of the cells of the clock.
vec3 flash(float cell, float rate) {
  float n = floor(uTime * rate + cell * 0.37);
  float f = fract(uTime * rate + cell * 0.37);
  float lit = step(0.62, hash12(vec2(n, cell * 7.0)));
  vec2 at = vec2(0.2 + 0.6 * hash12(vec2(n, cell + 3.0)), 0.32 + 0.36 * hash12(vec2(n, cell + 9.0)));
  // Two strokes close together, then dark.
  float pulse = exp(-f * 16.0) + 0.7 * exp(-pow((f - 0.16) * 22.0, 2.0));
  return vec3(at, lit * pulse);
}
// One tower of the system: the photograph of merged anvils from orbit (public/assets/reveal/mat/storm.jpg), read small and turned.
float tower(vec2 p, vec3 where, float turn) {
  float c = cos(turn);
  float s = sin(turn);
  vec2 q = mat2(c, s, -s, c) * (p - where.xy) / where.z + 0.5;
  vec2 m = min(q, 1.0 - q);
  return dot(texture2D(uPicture, clamp(q, 0.0, 1.0)).rgb, vec3(0.3, 0.55, 0.15)) * smoothstep(0.0, 0.06, min(m.x, m.y));
}
// The storm is a long system that lies along the backbone: five towers of it in a row, the greatest in the middle, each the photograph
// turned its own way, so the tops are lumpy and the windward edge is the photograph's own ragged one. Its light is its cover.
float lightOf(vec2 p) {
  float best = tower(p, vec3(-1.12, 0.03, 0.56), 1.9);
  best = max(best, tower(p, vec3(-0.66, -0.05, 0.8), 4.1));
  best = max(best, tower(p, vec3(-0.12, 0.03, 0.98), 0.4));
  best = max(best, tower(p, vec3(0.5, -0.02, 1.0), 2.9));
  best = max(best, tower(p, vec3(1.06, 0.04, 0.8), 5.3));
  return best;
}
void main() {
  // The tops boil: the photograph is read through a slow drifting bend, so its towers swell and its edge works while the frame is held.
  vec2 bend = texture2D(uCloudTile, vUv * vec2(1.6, 0.5) + uTime * vec2(0.004, -0.003)).rg - 0.5;
  vec2 p = (vUv - 0.5) * vec2(3.2, 1.0) + bend * 0.05;
  float seenLight = lightOf(p);
  float thick = smoothstep(0.14, 0.6, seenLight);
  // This place's sun lights it: a tower stands bright on its sunward side and throws its shade down the far one.
  vec2 sunUv = normalize(uSunDir.xz) * vec2(1.0, -1.0);
  float sunward = lightOf(p + sunUv * 0.035);
  float lee = lightOf(p - sunUv * 0.08);
  float self = clamp(0.5 + 2.4 * (seenLight - sunward) - 0.9 * max(lee - seenLight, 0.0), 0.0, 1.0);
  vec3 colour = cloudLight(vWorld.xz, 0.08 + 0.8 * self, 0.8, 0.6) * (0.3 + 0.7 * pow(seenLight, 1.5));
  // The light of the strikes comes through the cloud from inside: soft, violet, brightest where the cloud is thin over it. Two of the
  // towers hold a low glimmer between the strikes, so the held frame is never without it.
  vec3 glow = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    vec3 f = flash(float(i), 0.55 + 0.17 * float(i));
    vec2 d = (vUv - f.xy) * vec2(3.2, 1.0);
    glow += vec3(0.6, 0.5, 1.0) * f.z * exp(-dot(d, d) * 26.0) * (0.4 + 0.6 * seenLight) * thick;
  }
  vec2 d1 = p - vec2(-0.2, 0.05);
  vec2 d2 = p - vec2(0.62, -0.06);
  float glimmer = (0.2 + 0.1 * sin(uTime * 1.7)) * exp(-dot(d1, d1) * 40.0) + (0.16 + 0.1 * sin(uTime * 2.3 + 1.0)) * exp(-dot(d2, d2) * 55.0);
  glow += vec3(0.55, 0.42, 1.0) * glimmer * thick;
  colour += glow * 1.6;
  float alpha = clamp(thick, 0.0, 0.98);
  gl_FragColor = vec4(colour * alpha * (1.0 - uSolo), alpha * (1.0 - uSolo)) * uArrive;
}`;

// The breath of the throat: thin trails of steam that leave the neck together and curl apart down the wind, as a volcano's do from orbit.
const VAPOUR_FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
${CLOUD_LIGHT_GLSL}
uniform sampler2D uPicture;
uniform sampler2D uCloudTile;
uniform vec2 uThroat;
uniform vec2 uWind;
varying vec3 vWorld;
void main() {
  vec2 d = vWorld.xz - uThroat;
  // along runs from the throat (0) down the wind (1) over 600 km; across is the width of the photograph, 340 km.
  float along = dot(d, uWind) / 560.0;
  float across = dot(d, vec2(-uWind.y, uWind.x)) / 300.0;
  // The wind carries the curls: the trail is read through a bend that travels down it, stronger the farther it has gone.
  vec2 flow = texture2D(uCloudTile, vec2(along * 1.3 - uTime * 0.011, across * 0.8 + 0.3)).rg - 0.5;
  vec2 q = vec2(along + 0.02, across + 0.5 + 0.1 * sin(along * 5.0 + 1.0) * along) + flow * vec2(0.03, 0.16) * smoothstep(0.02, 0.5, along);
  float seenLight = dot(texture2D(uPicture, clamp(q, 0.0, 1.0)).rgb, vec3(0.3, 0.55, 0.15));
  // Puffs leave the throat one after another and thin as they go.
  float puff = 0.78 + 0.22 * sin(along * 26.0 - uTime * 0.5 + 3.0 * flow.x);
  float inside = smoothstep(0.0, 0.02, q.x) * (1.0 - smoothstep(0.55, 0.98, q.x)) * smoothstep(0.0, 0.08, q.y) * (1.0 - smoothstep(0.92, 1.0, q.y));
  float thick = smoothstep(0.02, 0.5, seenLight) * inside * puff * (1.0 - 0.5 * smoothstep(0.2, 0.9, along));
  vec3 colour = cloudLight(vWorld.xz, 0.7, 0.7, 0.3);
  float alpha = clamp(thick * 0.75, 0.0, 1.0);
  gl_FragColor = vec4(colour * alpha * (1.0 - uSolo), alpha * (1.0 - uSolo)) * uArrive;
}`;

// The edge of the planet. Inside it the air thickens to a blue band; outside it thins into the black within a few tens of kilometres,
// and behind the black stand a few stars.
const EDGE_FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
uniform float uWhich;
varying vec3 vWorld;
void main() {
  float d = limbShare(vWorld.xz);
  float km = (d - 1.0) * uLimb.z;
  if (uWhich < 0.5) {
    // space: the black beyond the edge, the last of the air against it, and the stars
    float a = smoothstep(-3.0, 3.0, km);
    float outer = exp(-max(km, 0.0) / 26.0);
    vec3 glow = mix(vec3(0.05, 0.17, 0.55), vec3(0.4, 0.64, 1.0), outer * outer) * outer * 0.5;
    vec2 cell = floor(vWorld.xz / 40.0);
    vec2 within = fract(vWorld.xz / 40.0) - 0.5;
    float pick = hash12(cell);
    vec2 off = vec2(hash12(cell + 7.3), hash12(cell + 19.1)) - 0.5;
    float star = step(0.94, pick) * exp(-dot(within - 0.6 * off, within - 0.6 * off) * 520.0) * (0.25 + 0.75 * hash12(cell + 3.7)) * smoothstep(20.0, 90.0, km);
    vec3 colour = (glow + vec3(0.85, 0.9, 1.0) * star * 0.3) * a;
    gl_FragColor = vec4(colour * (1.0 - uSolo), a * (1.0 - uSolo));
    return;
  }
  float inner = exp(min(km, 0.0) / 150.0) * 0.5 + exp(min(km, 0.0) / 30.0) * 0.5;
  float band = km < 0.0 ? inner : 0.0;
  vec3 blue = mix(vec3(0.06, 0.2, 0.62), vec3(0.42, 0.66, 1.0), band * band);
  vec3 colour = blue * band * 0.5;
  gl_FragColor = vec4(colour * (1.0 - uSolo), 0.0);
}`;

export function create(ctx: Context): Piece {
  const data = (file: string, repeat: boolean): THREE.Texture => ctx.assets.texture(file, { kind: 'data', repeat });
  const tile = data('sky/cloud-tile.jpg', true);
  // Where the weather stands (assets-src/reveal/sky/make_cover.py), and the Builder's photographs of cloud from orbit (assets-src/reveal/mat/RECIPE.md).
  const shared: [string, string, boolean][] = [['uCover', 'sky/cover.png', false], ['uMatPopcorn', 'mat/popcorn.jpg', true], ['uMatStreaks', 'mat/streaks.jpg', true]];
  (ctx.rig.uniforms.uCloudTile as THREE.IUniform).value = tile;
  for (const [uniform, file, repeat] of shared) (ctx.rig.uniforms[uniform] as THREE.IUniform).value = data(file, repeat);

  const made: { geometry: THREE.BufferGeometry; material: THREE.ShaderMaterial }[] = [];
  let order = 10;
  const sheet = (name: string, geometry: THREE.BufferGeometry, fragment: string, extra: Record<string, THREE.IUniform> = {}, additive = false): THREE.Mesh => {
    const material = new THREE.ShaderMaterial({
      uniforms: { ...ctx.rig.uniforms, ...extra },
      vertexShader: UV_VERTEX,
      fragmentShader: fragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: additive ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = order++;
    made.push({ geometry, material });
    ctx.scene.add(ctx.parts.built(name, mesh));
    return mesh;
  };
  const quad = (at: { x: number; y: number }, halfX: number, halfZ: number, height: number, turn: number): THREE.BufferGeometry =>
    new THREE.PlaneGeometry(2 * halfX * KM, 2 * halfZ * KM)
      .rotateX(-Math.PI / 2)
      .rotateY(turn)
      .translate(X(at.x), height, Z(at.y));

  // The breath of the throat: it leaves the neck and is carried up the picture and to the left by the wind.
  const wind = new THREE.Vector2(-0.43, -0.9).normalize();
  const throat = new THREE.Vector2(X(AT.throat.x), Z(AT.throat.y));
  sheet('vapour', quad({ x: AT.throat.x + (wind.x * 400) / KM, y: AT.throat.y + (wind.y * 400) / KM }, 560 / KM, 560 / KM, 1.5, 0), VAPOUR_FRAGMENT, {
    uPicture: { value: data('mat/wisps.jpg', false) },
    uThroat: { value: throat },
    uWind: { value: wind },
  });
  sheet('cloud', new THREE.PlaneGeometry(90000, 90000).rotateX(-Math.PI / 2).translate(0, LOW_KM, 0), CLOUD_FRAGMENT, {
    uFront: { value: data('mat/front.jpg', false) },
    uVeil: { value: data('mat/veil.jpg', true) },
  });
  sheet('storm', quad({ x: AT.storm.x - 40, y: AT.storm.y }, 256, 80, 7, 0.03), STORM_FRAGMENT, { uPicture: { value: data('mat/storm.jpg', false) } });
  sheet('cyclone', quad(AT.cyclone, 1250, 1250, 6, 0), CYCLONE_FRAGMENT, { uPicture: { value: data('mat/cyclone.jpg', false) }, uStreaks: { value: data('mat/streaks.jpg', true) } });
  const centre = { x: LIMB.cx, y: LIMB.cy };
  const ring = (inner: number, outer: number): THREE.BufferGeometry =>
    new THREE.RingGeometry(inner * LIMB.r * KM, outer * LIMB.r * KM, 720, 1).rotateX(-Math.PI / 2).translate(X(centre.x), 12, Z(centre.y));
  sheet('space', ring(0.995, 4), EDGE_FRAGMENT, { uWhich: { value: 0 } });
  sheet('atmosphere', ring(0.9, 1.03), EDGE_FRAGMENT, { uWhich: { value: 1 } }, true);

  return {
    dispose: () => {
      for (const m of made) {
        m.geometry.dispose();
        m.material.dispose();
      }
    },
  };
}
