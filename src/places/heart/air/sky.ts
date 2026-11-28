// The sky of the Heart: a dome that shows the same dusk the rig lights every surface with (skyRadiance), with the slow structure of a real one:
// a picture of thin high cloud for the large shapes, streaks of noise for the small ones, a pale band over the rim, and under them the smoke
// of the place in banks.
import * as THREE from 'three';
import type { HeartContext } from '../shared/context';
import { RIG_GLSL } from '../shared/glsl';

const VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
  gl_Position = p.xyww;
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
precision highp sampler3D;
varying vec3 vDir;
uniform sampler2D tSky;
uniform highp sampler3D tNoise;
${RIG_GLSL}

// Thin cloud on a level sheet far above: long streaks that close up toward the horizon as real ones do.
float streaks(vec3 d, float t) {
  vec2 q = d.xz / (max(d.y, 0.0) + 0.11);
  q = mat2(0.83, -0.56, 0.56, 0.83) * q;
  q += vec2(t * 0.0021, t * 0.0006);
  vec2 bend = textureLod(tNoise, vec3(q * 0.05, 0.37), 0.0).ga - 0.5;
  q += bend * 1.6;
  float a = textureLod(tNoise, vec3(q.x * 0.045, q.y * 0.15, 0.11), 0.0).g;
  float b = textureLod(tNoise, vec3(q.x * 0.16 + 0.3, q.y * 0.55, 0.53), 0.0).g;
  float c = textureLod(tNoise, vec3(q.x * 0.61, q.y * 2.1 + 0.7, 0.81), 0.0).a;
  return a * 0.55 + b * 0.3 + c * 0.15;
}

// The smoke of the place hangs under the dusk as a deck some 700 m up, fed by the plume: banks drawn out along the high wind, with open air
// between them. Their middles are dark against the sky, their thin edges pass it, and the fire of the lake lights their undersides, most over
// the open lava of the east. It stands in the world, so every lens sees the same banks from its own place, and it rides the wind.
// rgb: the fire's light on its underside. a: how much of the sky it hides.
const float DECK_HIGH = 700.0;
const vec2 DECK_ALONG = vec2(0.6, 0.8);
const float DECK_SPEED = 9.0;
const vec3 DECK_FIRE = vec3(650.0, -60.0, 1500.0);
const vec3 DECK_GLOW = vec3(0.15, 0.072, 0.038);
const vec3 DECK_BODY = vec3(0.5, 0.47, 0.45);
vec4 deck(vec3 d, float t) {
  if (d.y < 0.015) return vec4(0.0);
  vec2 at = cameraPosition.xz + d.xz * ((DECK_HIGH - cameraPosition.y) / d.y);
  vec2 q = vec2(dot(at, DECK_ALONG) - DECK_SPEED * t, dot(at, vec2(-DECK_ALONG.y, DECK_ALONG.x)));
  vec2 bend = textureLod(tNoise, vec3(q / 9000.0, 0.21), 0.0).ga - 0.5;
  q += bend * 1300.0;
  float large = textureLod(tNoise, vec3(q.x / 6400.0, q.y / 2700.0, 0.43), 0.0).g;
  vec4 lumps = textureLod(tNoise, vec3(q.x / 2100.0 + 0.3, q.y / 1250.0, 0.77), 0.0);
  float fine = textureLod(tNoise, vec3(q.x / 560.0, q.y / 340.0 + 0.7, 0.13), 0.0).r;
  float n = large + 0.34 * (lumps.r - 0.4) + 0.1 * (fine - 0.4);
  float thick = smoothstep(0.6, 0.78, n);
  // A sheet seen aslant is looked through for longer; far off it goes into the air and the pale band over the rim.
  float a = 1.0 - exp(-2.2 * thick * min(1.0 / d.y, 4.0));
  a *= smoothstep(0.015, 0.055, d.y);
  vec2 off = at - DECK_FIRE.xy;
  float fire = 1.0 / (1.0 + dot(off, off) / (DECK_FIRE.z * DECK_FIRE.z));
  // The underside is in lumps: each catches the fire on its low side, and the thick middle of a bank takes less of it than its rim.
  float under = (0.35 + 1.3 * lumps.r) * (1.15 - 0.5 * thick);
  return vec4(DECK_GLOW * (fire * under), a);
}

void main() {
  vec3 d = normalize(vDir);
  // The rig's sky without its warm side: that warmth is the fume, and the fume is drawn in front of this dome by the volume.
  float up = clamp(d.y, -1.0, 1.0);
  vec3 c = mix(uSkyHorizon, uSkyZenith, pow(clamp(up, 0.0, 1.0), 0.45));
  c = mix(c, uSkyGround, smoothstep(0.0, -0.25, up));
  float el = asin(clamp(d.y, -1.0, 1.0));
  float az = atan(d.x, -d.z);

  // The picture, wrapped round the horizon and mirrored so that it has no seam. Only its structure is kept: each point over the picture's own blurred self.
  vec2 uv = vec2(az / 2.2 + 0.31, el / 0.95 + 0.02);
  uv.x = abs(fract(uv.x * 0.5) * 2.0 - 1.0);
  uv.y = clamp(uv.y, 0.004, 0.996);
  vec3 pic = texture2D(tSky, uv).rgb;
  vec3 soft = textureLod(tSky, uv, 6.5).rgb;
  vec3 ratio = pic / max(soft, vec3(0.01));
  float lum = dot(ratio, vec3(0.3, 0.5, 0.2));
  ratio = mix(vec3(lum), ratio, 0.55);
  float high = smoothstep(0.95, 0.6, el) * smoothstep(-0.02, 0.05, el);
  c *= mix(vec3(1.0), pow(ratio, vec3(1.7)), high);

  // Streaks: where they are thin and low they still hold a little of the light that has left the ground; higher they are only darker than the sky.
  float n = streaks(d, uTime);
  float cover = smoothstep(0.46, 0.7, n) * smoothstep(0.0, 0.1, d.y);
  float low = smoothstep(0.55, 0.06, d.y);
  vec3 held = vec3(1.34, 1.22, 1.12);
  vec3 dark = vec3(0.72, 0.74, 0.8);
  c *= mix(vec3(1.0), mix(dark, held, low), cover * 0.75);
  float veil = smoothstep(0.3, 0.6, n);
  c *= 1.0 + 0.1 * (veil - 0.5) * low;

  // The pale band over the rim: the last light, low all round, a little stronger away from the fume.
  float band = exp(-pow((el - 0.12) / 0.14, 2.0));
  float west = 0.5 - 0.5 * dot(normalize(d.xz + 1e-5), normalize(uWarmDir.xz));
  c *= 1.0 + band * (0.14 + 0.18 * west);
  vec4 smoke = deck(d, uTime);
  c = mix(c, c * DECK_BODY + smoke.rgb, smoke.a);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

export interface Sky {
  dome: THREE.Mesh;
  dispose(): void;
}

export function createSky(ctx: HeartContext, noise: THREE.Data3DTexture): Sky {
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      ...ctx.rig.uniforms,
      tSky: { value: ctx.assets.texture('mat/sky.jpg', { repeat: false }) },
      tNoise: { value: noise },
    },
    side: THREE.BackSide,
    // At the far plane and drawn last, so that the engine can reject it wherever anything stands in front.
    depthTest: true,
    depthFunc: THREE.LessEqualDepth,
    depthWrite: false,
    toneMapped: false,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), material);
  dome.frustumCulled = false;
  dome.renderOrder = 100;
  return {
    dome,
    dispose: () => {
      dome.geometry.dispose();
      material.dispose();
    },
  };
}
