// Everything that stands over the surface: the cloud at its heights, the cyclone, the storm on the spine, the vapour of the throat, and at the
// edge of the planet the air and the black behind it. Each is a sheet at its own height, so the rise passes them at their own speeds.
// The cloud itself is one field of the world (shared/weather.ts): the surface takes its shade from the same field.
import * as THREE from 'three';
import { AT, KM, LIMB, X, Z } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL, RIG_VERTEX } from '../shared/glsl';
import { HIGH_KM, LOW_KM, WEATHER_GLSL } from '../shared/weather';

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
  float sun = uSunDir.y * (0.42 + 1.16 * clamp(facing, 0.0, 1.0)) * (0.55 + 0.45 * thick);
  vec3 c = 1.15 * (uSunColour * sun + uSkyColour * 0.9) / 3.14159;
  float air = 1.0 - exp(-0.022 * (1.0 - 0.6 * high) / max(mu, 0.12));
  return mix(c, uAirColour, air);
}`;

const CLOUD_FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
${WEATHER_GLSL}
${CLOUD_LIGHT_GLSL}
varying vec3 vWorld;
void main() {
  vec2 xz = vWorld.xz;
  vec3 low = lowCloud(xz);
  // The same ray meets the high cloud a little nearer the eye.
  vec2 up = xz + (cameraPosition.xz - xz) * ${(HIGH_KM - LOW_KM).toFixed(1)} / max(cameraPosition.y - ${LOW_KM.toFixed(1)}, 1.0);
  float high = highCloud(up);
  // The low cloud lies in the shade of the high cloud, and of its own neighbours toward the sun.
  vec2 toSun = uSunDir.xz / max(uSunDir.y, 0.2);
  float over = highCloud(up + toSun * ${(HIGH_KM - LOW_KM).toFixed(1)});
  vec3 lowColour = cloudLight(xz, low.y, low.x, 0.0) * (1.0 - 0.25 * over);
  vec3 highColour = cloudLight(up, 0.62, 0.6, 1.0);
  float a = low.x * 0.96;
  float b = high * 0.28;
  vec3 colour = lowColour * a * (1.0 - b) + highColour * b;
  float alpha = 1.0 - (1.0 - a) * (1.0 - b);
  gl_FragColor = vec4(colour * (1.0 - uSolo), alpha * (1.0 - uSolo));
}`;

const CYCLONE_FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
${CLOUD_LIGHT_GLSL}
uniform sampler2D uPicture;
varying vec3 vWorld;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  // The whole storm turns, the middle faster than the rim.
  float turn = uTime * (0.012 + 0.03 / (1.0 + 9.0 * r));
  float c = cos(turn);
  float s = sin(turn);
  vec2 q = vec2(c * p.x - s * p.y, s * p.x + c * p.y) * 0.5 + 0.5;
  vec3 t = texture2D(uPicture, q).rgb;
  float thick = t.r * (1.0 - smoothstep(0.86, 1.0, r));
  vec3 colour = cloudLight(vWorld.xz, t.g, 0.5 + 0.5 * t.b, 0.5 * t.b) * (0.8 + 0.3 * t.b);
  float alpha = clamp(thick * 1.15, 0.0, 1.0);
  gl_FragColor = vec4(colour * alpha * (1.0 - uSolo), alpha * (1.0 - uSolo));
}`;

const STORM_FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
${CLOUD_LIGHT_GLSL}
uniform sampler2D uPicture;
varying vec3 vWorld;
varying vec2 vUv;
// A flash inside the anvil: where and how bright, for one of the cells of the clock.
vec3 flash(float cell, float rate) {
  float n = floor(uTime * rate + cell * 0.37);
  float f = fract(uTime * rate + cell * 0.37);
  float lit = step(0.62, hash12(vec2(n, cell * 7.0)));
  vec2 at = vec2(0.14 + 0.72 * hash12(vec2(n, cell + 3.0)), 0.3 + 0.4 * hash12(vec2(n, cell + 9.0)));
  // Two strokes close together, then dark.
  float pulse = exp(-f * 16.0) + 0.7 * exp(-pow((f - 0.16) * 22.0, 2.0));
  return vec3(at, lit * pulse);
}
void main() {
  vec3 t = texture2D(uPicture, vUv).rgb;
  float thick = t.r;
  vec3 colour = cloudLight(vWorld.xz, t.g, 0.5 + 0.5 * t.b, t.b) * (0.72 + 0.5 * t.b);
  // The light of the flashes comes through the cloud from inside: soft, blue white, brightest where the cloud is thin over it.
  vec3 glow = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    vec3 f = flash(float(i), 0.55 + 0.17 * float(i));
    vec2 d = (vUv - f.xy) * vec2(1.0, 0.36);
    glow += vec3(0.72, 0.8, 1.0) * f.z * exp(-dot(d, d) * 420.0) * (0.5 + 0.5 * t.b);
  }
  colour += glow * 1.6;
  float alpha = clamp(thick * 1.25, 0.0, 1.0);
  gl_FragColor = vec4(colour * alpha * (1.0 - uSolo), alpha * (1.0 - uSolo));
}`;

const VAPOUR_FRAGMENT = /* glsl */ `
${RIG_GLSL}
${NOISE_GLSL}
${CLOUD_LIGHT_GLSL}
uniform sampler2D uCloudTile;
varying vec3 vWorld;
varying vec2 vUv;
void main() {
  // v runs from the throat (0) down the wind (1). The breath leaves in a few strands, which bend with the wind, spread and thin.
  float along = vUv.y;
  float spread = 0.1 + 0.4 * pow(along, 0.7);
  float bend = 0.24 * along * along + 0.025 * sin(along * 9.0 + uTime * 0.1);
  float across = (vUv.x - 0.5 - bend) / spread;
  vec2 q = vec2(across * 2.4 + 0.7 * vnoise(vec2(along * 4.0 - uTime * 0.03, 3.7)), along * 1.6 - uTime * 0.02);
  float line = abs(vnoise(q * vec2(1.0, 0.35) + 5.0) - 0.5) * 2.0;
  float strand = 1.0 - smoothstep(0.0, 0.2 + 0.35 * along, line);
  float wisp = texture2D(uCloudTile, vec2(q.x * 0.13 + 0.2, q.y * 0.2)).b;
  float body = (1.0 - smoothstep(0.5, 1.0, abs(across))) * smoothstep(0.0, 0.06, along) * (1.0 - smoothstep(0.35, 1.0, along));
  float thick = body * strand * (0.4 + 0.9 * wisp);
  vec3 colour = cloudLight(vWorld.xz, 0.6, 0.5, 0.3);
  float alpha = clamp(thick * 0.62, 0.0, 1.0);
  gl_FragColor = vec4(colour * alpha * (1.0 - uSolo), alpha * (1.0 - uSolo));
}`;

// The edge of the planet. Inside it the air thickens to a blue band, outside it thins into the black within a few tens of kilometres.
const EDGE_FRAGMENT = /* glsl */ `
${RIG_GLSL}
uniform float uWhich;
varying vec3 vWorld;
void main() {
  float d = limbShare(vWorld.xz);
  float km = (d - 1.0) * uLimb.z;
  if (uWhich < 0.5) {
    // space: black beyond the edge
    float a = smoothstep(-3.0, 3.0, km);
    gl_FragColor = vec4(vec3(0.0), a * (1.0 - uSolo));
    return;
  }
  float inner = exp(min(km, 0.0) / 150.0) * 0.5 + exp(min(km, 0.0) / 30.0) * 0.5;
  float outer = exp(-max(km, 0.0) / 22.0);
  float band = km < 0.0 ? inner : outer;
  vec3 blue = mix(vec3(0.06, 0.2, 0.62), vec3(0.42, 0.66, 1.0), band * band);
  vec3 colour = blue * band * 0.5;
  gl_FragColor = vec4(colour * (1.0 - uSolo), 0.0);
}`;

export function create(ctx: Context): Piece {
  const tile = ctx.assets.texture('sky/cloud-tile.jpg', { kind: 'data', repeat: true });
  const cover = ctx.assets.texture('sky/cloud-cover.jpg', { kind: 'data', repeat: false });
  (ctx.rig.uniforms.uCloudTile as THREE.IUniform).value = tile;
  (ctx.rig.uniforms.uCloudCover as THREE.IUniform).value = cover;

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

  // The breath of the throat: it leaves the neck and is carried up the picture by the wind.
  sheet('vapour', quad({ x: AT.throat.x + 60, y: AT.throat.y - 330 }, 260, 330, 1.5, 0), VAPOUR_FRAGMENT);
  sheet('cloud', new THREE.PlaneGeometry(90000, 90000).rotateX(-Math.PI / 2).translate(0, LOW_KM, 0), CLOUD_FRAGMENT);
  sheet('storm', quad(AT.storm, 235, 88, 7, 0.03), STORM_FRAGMENT, { uPicture: { value: ctx.assets.texture('sky/storm.jpg', { kind: 'data', repeat: false }) } });
  sheet('cyclone', quad(AT.cyclone, 880, 880, 6, 0), CYCLONE_FRAGMENT, { uPicture: { value: ctx.assets.texture('sky/cyclone.jpg', { kind: 'data', repeat: false }) } });
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
