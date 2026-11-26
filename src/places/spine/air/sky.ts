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
// Staged by shot: the sky of the strike as one picture behind the long lens (mat/strikesky). x is the heading of its lit cloud, y the height of
// its horizon, both radians; z is how many radians its width takes; w is 1 while it stands.
uniform sampler2D tStrikeSky;
uniform vec4 uPlate;
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
  // Read very soft (as the colour of haze), the picture's flow is under the size of what is read: one read, where it stands.
  if (lod > 3.5) return textureLod(picture, vec2(mirrored(uv.x), clamp(uv.y, 0.004, 0.996)), lod).rgb;
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
    float r = uEmitters[i].w * (uEmitters[i].w > 20.0 && uSkyStage.z > 0.0 ? uSkyStage.z : 1.0);
    // By metres, not by angle: how far the ray passes from the light, in the light's own radii. A long lens and a wide one see the same bloom.
    float off = sqrt(max(dot(q, q) - along * along, 0.0)) / r;
    float power = dot(uEmitterRadiance[i], vec3(0.3, 0.5, 0.2)) * uEmitters[i].w * uEmitters[i].w;
    float high = smoothstep(150.0, 900.0, uEmitters[i].y);
    // However strong the light is made, the cloud about it is lit to a bloom and no further: a core a radius wide, and a faint breadth of four.
    lit += (1.0 - exp(-power * (0.25 + 0.75 * high) / 8.0e6)) * (exp(-off * off * 1.4) + 0.2 * exp(-off / 2.2));
  }
  return lit;
}
// How much of the strike's sky stands toward d, and where on it.
float plateAt(float az, float el, out vec2 uv) {
  uv = vec2(0.43 + wrapPi(az - uPlate.x) / uPlate.z, 0.32 + (el - uPlate.y) / (uPlate.z * 0.5625));
  return uPlate.w * (1.0 - smoothstep(0.44, 0.5, abs(uv.x - 0.5))) * (1.0 - smoothstep(0.44, 0.5, abs(uv.y - 0.5)));
}
// The strike's sky: storm cloud lit from inside about the stroke, the last band low on the lee, the sea of cloud under it. The picture is of
// the lit moment; between strokes its glow sinks to embers that flicker, and each stroke brings it up whole.
vec3 plateCloud(vec2 uv, float lod) {
  vec3 c = flowing(tStrikeSky, uv, vec2(0.02, 0.0), 22.0, lod);
  float m = dot(c, vec3(0.3, 0.5, 0.2));
  float warm = clamp((c.r - c.b) * 6.0, 0.0, 1.0);
  float glowing = smoothstep(0.1, 0.45, m) * (1.0 - warm);
  float ember = 0.22 + 0.5 * pow(textureLod(tNoise, vec3(uTime * 0.21, 0.37, 0.61), 0.0).r, 3.0) + 0.4 * pow(textureLod(tNoise, vec3(uTime * 0.83, 0.71, 0.13), 0.0).g, 4.0);
  float lit = clamp(ember + 1.5 * dot(uFlash, vec3(0.33)), 0.0, 1.0);
  return c * mix(mix(1.0, 0.3, glowing), 1.0 + 0.2 * glowing, lit) * SKY_GAIN * 1.0;
}
vec3 skyAtRest(vec3 from, vec3 d, float lod) {
  float el = asin(clamp(d.y, -1.0, 1.0));
  float az = atan(d.z, d.x);
  vec2 uvP = vec2(0.0);
  float plate = uPlate.w > 0.0 ? plateAt(az, el, uvP) : 0.0;
  if (plate >= 1.0) return plateCloud(uvP, lod);
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
    float k = clamp(lit, 0.0, 1.0);
    // The lit picture is read only where a light reaches.
    if (k > 0.002) dark = mix(dark, flowing(tStormLit, uvS, vec2(0.02, 0.004), 22.0, lod) * (1.0 + 0.8 * k), k);
    c += storm * dark;
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
  c *= mix(vec3(0.9, 0.88, 1.06), vec3(1.25, 1.1, 0.95), warm) * SKY_GAIN * (1.0 + uSkyStage.y);
  return plate > 0.0 ? mix(c, plateCloud(uvP, lod), plate) : c;
}
// How much of a stroke's light the cloud toward d holds: the channel is a line of light from the tip up into the cloud, and the cloud
// about it is lit through, by metres from the line as the lens sees it, far wider where the channel is inside the cloud.
float strikeReach(vec3 from, vec3 d) {
  float lit = 0.0;
  for (int i = 0; i < 5; i++) {
    // From a little over the tip to well inside the cloud over the channel's top: the light is most where the channel is in the cloud.
    float f = 0.1 + 0.3 * float(i);
    vec3 q = mix(uStrikeTip.xyz, uStrikeTop.xyz, f) - from;
    float along = dot(d, q);
    if (along <= 0.0) continue;
    float r = mix(110.0, 520.0, clamp(f, 0.0, 1.0));
    float off2 = max(dot(q, q) - along * along, 0.0) / (r * r);
    // A peak at the channel and a breadth round it: never a disc with an edge.
    lit += (0.05 + 0.2 * f) * (0.7 / (1.0 + 3.0 * off2) + 0.3 / (1.0 + 0.4 * off2));
  }
  return lit;
}
// The cloud in the flash of a stroke: what stands round the channel is lit from inside, its pale bodies far more than its dark ones and
// in uneven masses, so that the cloud's own shapes stand in the light; the last band keeps its orange.
vec3 strikeCloud(vec3 c, vec3 from, vec3 d) {
  float masses = textureLod(tNoise, d * 1.7 + vec3(0.13, 0.41, 0.77), 0.0).r + 0.5 * textureLod(tNoise, d * 4.3 + vec3(0.61, 0.07, 0.29), 0.0).g;
  float lit = uStrikeAt.w * strikeReach(from, d) * smoothstep(-0.03, 0.05, d.y) * (0.35 + 0.9 * masses);
  float body = dot(c, vec3(0.3, 0.5, 0.2));
  float warm = clamp((c.r - c.b) * 30.0, 0.0, 1.0);
  float shape = smoothstep(0.004, 0.05, body);
  return c * (1.0 + 3.6 * lit * (1.0 - 0.8 * warm)) + vec3(0.6, 0.62, 1.0) * (lit * (0.006 + 0.05 * shape) * (1.0 - warm));
}
vec3 skyCloud(vec3 from, vec3 d, float lod) {
  vec3 c = skyAtRest(from, d, lod);
  if (uStrikeAt.w > 0.0) c = strikeCloud(c, from, d);
  return c;
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
  if (foot < 0.0009) {
    float fine = dot(textureLod(tStormWall, uvT, 0.0).rgb, vec3(0.33));
    float broad = dot(textureLod(tStormWall, uvT, 4.5).rgb, vec3(0.33));
    c *= mix(1.0, clamp(fine / max(broad, 0.01), 0.6, 1.5), 0.85 * smoothstep(0.0009, 0.0002, foot));
  }
  // The ridge runs on beyond what is built: a row of far spires stands out of the sea toward the last light, each smaller and bluer than
  // the one before it. They are too far to shift with the lens, so they are of the dome.
  // Behind the strike's long lens they are three, placed where its picture has them: right of the struck spire, against the band.
  bool pl = uPlate.w > 0.0;
  float hf = uPlate.z / 1.2;
  float elS = el - (pl ? uPlate.y : 0.0);
  if (elS > -0.02 && elS < 0.09) {
    for (int i = 0; i < 6; i++) {
      if (pl && i > 2) break;
      float k = float(i);
      float size = pl ? 1.0 : 1.0 / (1.0 + 0.3 * k);
      float azS = pl ? uPlate.x + hf * (i == 0 ? 0.29 : i == 1 ? 0.42 : 0.49) : DUSK_AZ - 0.5 + 0.14 * k + 0.05 * sin(k * 2.7 + 0.4);
      float tall = pl ? hf * 0.5625 * (i == 0 ? 0.11 : i == 1 ? 0.07 : 0.05) : 0.075 * size * (0.8 + 0.4 * fract(sin(k * 12.9898) * 43758.5453));
      float unit = pl ? tall / 0.075 : 1.0;
      if (abs(wrapPi(az - azS)) > tall || elS > tall + 0.004) continue;
      float h = clamp((elS + 0.012 * unit) / (tall + 0.012 * unit), 0.0, 1.0);
      // A leaning blade: broad at the sea, a knife at the top, broken along both edges.
      float lean = (pl ? -0.4 : mod(k, 2.0) < 0.5 ? -0.35 : 0.28) * tall * h * h;
      float half_ = tall * ((pl ? 0.55 : 0.34) * pow(1.0 - h, 1.3) + 0.012) * (1.0 + 0.5 * (texture(tNoise, vec3(h * 3.0 + k, k * 0.37, 0.2)).r - 0.5));
      float off = wrapPi(az - azS) - lean;
      float inSpire = (1.0 - smoothstep(half_ - 1.5 * foot, half_ + 1.5 * foot, abs(off) + 0.004 * size * unit * (texture(tNoise, vec3(elS / unit * 90.0, off / unit * 60.0 + k, 0.7)).r - 0.5))) * (1.0 - smoothstep(tall - 2.0 * foot, tall + 2.0 * foot, elS));
      if (inSpire > 0.0) {
        // Rock in the far air: dark toward the storm, the dusk on its lee face, and paler the farther off; its foot is in the cloud.
        float lee = smoothstep(-0.3, 0.6, off / max(half_, 1e-4));
        vec3 rockFar = mix(vec3(0.02, 0.022, 0.034), vec3(0.075, 0.05, 0.04), lee * 0.6) * (0.7 + 0.6 * texture(tNoise, vec3(elS / unit * 70.0 + k, off / unit * 45.0, 0.31)).r);
        // Against the strike's dark cloud a far spire is a darker shape still, never a pale one.
        if (pl) rockFar = min(rockFar, c * 0.4);
        float air = 1.0 - exp(-(0.3 + 0.2 * k));
        float foot_ = smoothstep(0.012 * unit, -0.006 * unit, elS - 0.004 * size * unit);
        c = mix(c, mix(rockFar, c, clamp(air * (pl ? 0.35 : 0.6) + foot_, 0.0, 1.0)), inSpire);
      }
    }
  }
  // Under the horizon there is only the cloud sea, which the air pass draws.
  vec2 uvP = vec2(0.0);
  c = mix(c, uSkyGround, smoothstep(0.0, -0.06, d.y) * (1.0 - (uPlate.w > 0.0 ? plateAt(az, el, uvP) : 0.0)));
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

/** The pictures the dome's cloud is read from, for any material that carries SKY_GLSL. */
export function skyPictures(ctx: Context): Record<string, THREE.IUniform> {
  return {
    uSkyStage: { value: new THREE.Vector4(0, 0, 0, 0) },
    uPlate: { value: new THREE.Vector4(0, 0, 1, 0) },
    tStrikeSky: { value: ctx.assets.texture('mat/strikesky.jpg', { repeat: false }) },
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
