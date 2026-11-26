// The dome: the storm sky of the Spine at dusk, from pictures. The storm wall stands on the gale's side (mat/stormwall, and the same lit from
// inside, mat/stormwall-lit), the dusk sky with the last band under it on the lee (mat/sky). The pictures flow: each is drawn twice, carried a
// little way along a field of slow eddies and faded from one copy to the next, so the cloud moves and never jumps. Where a strike is, the cloud
// about it lights from inside: the lit picture comes up round the bolt as it is seen, and over the whole wall with the rig's flash.
import * as THREE from 'three';
import { DUSK, WIND } from '../shared/anchors';
import type { Context } from '../shared/context';
import { RIG_GLSL } from '../shared/glsl';

const VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
  gl_Position = p.xyww;
}`;

/** The dome's cloud, for the dome and for whatever has to fade into it (the air pass): radiance toward d. */
export const SKY_GLSL = /* glsl */ `
uniform sampler2D tSkyDusk;
uniform sampler2D tStormWall;
uniform sampler2D tStormLit;
// Staged by shot: x turns the storm wall round the horizon, radians; y opens the lens; z is the size of the bloom about a stroke, as a share of
// the lights' own radii (0 for the whole of them); w lays the pictures so many times smaller for a long lens (0 for their own size).
uniform vec4 uSkyStage;
const float STORM_AZ = ${Math.atan2(-WIND[2], -WIND[0]).toFixed(4)};
const float DUSK_AZ = ${Math.atan2(DUSK[2], DUSK[0]).toFixed(4)};
// How bright the pictures stand in the scene: the lens is set for the dusk.
const float SKY_GAIN = 0.2;

float wrapPi(float a) {
  return a - 6.28318 * floor((a + 3.14159) / 6.28318);
}
float mirrored(float u) {
  return 1.0 - abs(1.0 - mod(u, 2.0));
}
// A picture at uv, flowing: two copies half a period apart, each carried along the eddies from where it started.
vec3 flowing(sampler2D picture, vec2 uv, vec2 drift, float period, float lod) {
  vec2 eddy = textureLod(tNoise, vec3(uv * vec2(1.3, 0.9), 0.31), 0.0).rg - 0.5 + 0.5 * (textureLod(tNoise, vec3(uv * vec2(3.7, 2.9) + 0.4, 0.67), 0.0).ba - 0.5);
  vec2 flow = drift + 0.035 * eddy;
  float a = fract(uTime / period);
  float b = fract(uTime / period + 0.5);
  vec2 ua = uv - flow * (a - 0.5);
  vec2 ub = uv - flow * (b - 0.5) ;
  vec3 ca = textureLod(picture, vec2(mirrored(ua.x), clamp(ua.y, 0.004, 0.996)), lod).rgb;
  vec3 cb = textureLod(picture, vec2(mirrored(ub.x), clamp(ub.y, 0.004, 0.996)), lod).rgb;
  return mix(ca, cb, abs(1.0 - 2.0 * a));
}
// How much the cloud toward d is lit from inside: each round light of the rig as the lens sees it, and the rig's flash on the storm side.
float cloudLit(vec3 from, vec3 d) {
  float lit = 0.0;
  for (int i = 0; i < 8; i++) {
    if (i >= uEmitterCount) break;
    vec3 q = uEmitters[i].xyz - from;
    float along = dot(d, q);
    if (along <= 0.0) continue;
    float r = uEmitters[i].w * (uSkyStage.z > 0.0 ? uSkyStage.z : 1.0);
    // By metres, not by angle: how far the ray passes from the light, in the light's own radii. A long lens and a wide one see the same bloom.
    float off = sqrt(max(dot(q, q) - along * along, 0.0)) / r;
    float power = dot(uEmitterRadiance[i], vec3(0.3, 0.5, 0.2)) * uEmitters[i].w * uEmitters[i].w;
    float high = smoothstep(150.0, 900.0, uEmitters[i].y);
    // However strong the light is made, the cloud about it is lit to a bloom and no further: a core a radius wide, and a faint breadth of four.
    lit += (1.0 - exp(-power * (0.25 + 0.75 * high) / 8.0e6)) * (exp(-off * off * 1.4) + 0.2 * exp(-off / 2.2));
  }
  return lit;
}
vec3 skyCloud(vec3 from, vec3 d, float lod) {
  float el = asin(clamp(d.y, -1.0, 1.0));
  float az = atan(d.z, d.x);
  float turned = wrapPi(az - STORM_AZ - uSkyStage.x);
  float toStorm = abs(turned);
  // The storm wall: 107 degrees of it about the gale at the picture's own shape, mirrored on beyond. The picture's flat foot is under the horizon.
  float zoom = uSkyStage.w > 0.0 ? uSkyStage.w : 1.0;
  vec2 uvS = vec2(0.5 + turned * zoom / 1.87, (zoom > 1.0 ? 0.3 : 0.14) + el * zoom / 1.2);
  // The dusk: the picture's band lies along the horizon, toward the last light.
  // For a long lens the band lies on the sea's own horizon, which stands a little under the level.
  vec2 uvD = vec2(0.62 + wrapPi(az - DUSK_AZ) * zoom / 1.5, 0.045 + (zoom > 1.0 ? el + 0.014 : el) * zoom);
  float seam = textureLod(tNoise, vec3(az * 0.9, el * 1.7, 0.53), 0.0).r - 0.5;
  // For a long lens the wall ends as fast as its pictures are laid small.
  float storm = 1.0 - smoothstep(1.2, 1.75, 1.475 + (toStorm - 1.475) * zoom + 0.4 * seam);
  float near = cloudLit(from, d);
  // The whole wall takes a little of a strike; the bloom about the bolt is the light, and the rest of the storm stays dark.
  float lit = near + 0.12 * min(dot(uFlash, vec3(0.33)), 1.0) * storm;
  vec3 c = vec3(0.0);
  if (storm < 0.999) {
    vec3 dusk = flowing(tSkyDusk, uvD, vec2(0.012, 0.0), 26.0, lod);
    // No lit picture of the dusk: its cloud brightens and goes to violet about the bolt.
    float k = clamp(lit, 0.0, 1.5);
    dusk = dusk * (1.0 + 2.2 * k) + vec3(0.05, 0.035, 0.1) * k * (0.3 + 4.0 * dot(dusk, vec3(0.33)));
    c += (1.0 - storm) * dusk;
  }
  if (storm > 0.001) {
    vec3 dark = flowing(tStormWall, uvS, vec2(0.02, 0.004), 22.0, lod);
    vec3 bright = flowing(tStormLit, uvS, vec2(0.02, 0.004), 22.0, lod);
    float k = clamp(lit, 0.0, 1.0);
    c += storm * mix(dark, bright * (1.0 + 0.8 * k), k);
  }
  // About the bolt the cloud glows from inside, violet, most where it is thick and pale.
  float glow = clamp(near, 0.0, 3.0);
  c += vec3(0.42, 0.33, 0.8) * glow * (0.03 + 1.3 * dot(c, vec3(0.33)));
  // The storm is of masses: the pictures' own darks are pressed down and their pale bellies kept, and it is darkest overhead.
  float mass = dot(c, vec3(0.3, 0.5, 0.2));
  c *= mix(0.62, 1.35, smoothstep(0.04, 0.3, mass)) * mix(1.0, 0.55, smoothstep(0.12, 0.7, el) * (1.0 - clamp((c.r - c.b) * 6.0, 0.0, 1.0)));
  // Overhead the pictures end: the cloud closes over in its own dark.
  c = mix(c, vec3(0.022, 0.022, 0.03), smoothstep(0.85, 1.15, el));
  // The storm's light is violet; only the last band keeps its orange.
  float warm = clamp((c.r - c.b) * 6.0, 0.0, 1.0);
  return c * mix(vec3(0.9, 0.88, 1.06), vec3(1.25, 1.1, 0.95), warm) * SKY_GAIN * (1.0 + uSkyStage.y);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
precision highp sampler3D;
varying vec3 vDir;
uniform highp sampler3D tNoise;
${RIG_GLSL}
${SKY_GLSL}

void main() {
  vec3 d = normalize(vDir);
  vec3 c = skyCloud(cameraPosition, d, 0.0);
  // Through a long lens the pictures are seen larger than they were made: the same cloud, four times smaller, gives them the detail
  // they lack there, as much as the lens asks for.
  float foot = length(fwidth(d));
  float az = atan(d.z, d.x);
  float el = asin(clamp(d.y, -1.0, 1.0));
  vec2 uvT = vec2(az, el) * 2.3 + vec2(uTime * 0.0012, 0.0);
  uvT = vec2(mirrored(uvT.x), mirrored(uvT.y + 0.2));
  float fine = dot(textureLod(tStormWall, uvT, 0.0).rgb, vec3(0.33));
  float broad = dot(textureLod(tStormWall, uvT, 4.5).rgb, vec3(0.33));
  c *= mix(1.0, clamp(fine / max(broad, 0.01), 0.6, 1.5), 0.85 * smoothstep(0.0009, 0.0002, foot));
  // Under the horizon there is only the cloud sea, which the air pass draws.
  c = mix(c, uSkyGround, smoothstep(0.0, -0.06, d.y));
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

/** The pictures the dome's cloud is read from, for any material that carries SKY_GLSL. */
export function skyPictures(ctx: Context): Record<string, THREE.IUniform> {
  return {
    uSkyStage: { value: new THREE.Vector4(0, 0, 0, 0) },
    tSkyDusk: { value: ctx.assets.texture('mat/sky.jpg', { repeat: false }) },
    tStormWall: { value: ctx.assets.texture('mat/stormwall.jpg', { repeat: false }) },
    tStormLit: { value: ctx.assets.texture('mat/stormwall-lit.jpg', { repeat: false }) },
  };
}

export interface Sky {
  dome: THREE.Mesh;
  uniforms: Record<string, THREE.IUniform>;
  dispose(): void;
}

export function createSky(ctx: Context, noise: THREE.Data3DTexture, uniforms: Record<string, THREE.IUniform>): Sky {
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { ...ctx.rig.uniforms, ...uniforms, tNoise: { value: noise } },
    side: THREE.BackSide,
    // At the far plane and drawn last, so that the engine can reject it wherever anything stands in front.
    depthTest: true,
    depthFunc: THREE.LessEqualDepth,
    depthWrite: false,
    toneMapped: false,
  });
  const geometry = new THREE.SphereGeometry(1, 48, 24);
  const dome = new THREE.Mesh(geometry, material);
  dome.frustumCulled = false;
  dome.renderOrder = 10;
  return {
    dome,
    uniforms,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
