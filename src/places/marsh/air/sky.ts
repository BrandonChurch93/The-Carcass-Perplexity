// The sky of the marsh: a white overcast, the same one the rig lights every surface with (skyRadiance), with the slow mottle of a real one
// and the darker base of the cloud that is raining over the far flats.
import * as THREE from 'three';
import type { Context } from '../shared/context';
import { RIG_GLSL } from '../shared/glsl';
import { DUSK_GLSL, RAIN_APART, RAIN_AT, RAIN_TURN, RAIN_WALK } from './volume';

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
uniform highp sampler3D tNoise;
uniform vec4 uRain;
uniform sampler2D tSky;
uniform sampler2D tFar;
// What the far picture's white comes to in the rig's light.
const float FAR_GAIN = 1.05;
const float RAIN_WALK = ${RAIN_WALK.toFixed(4)};
const float RAIN_AT = ${RAIN_AT.toFixed(1)};
const float RAIN_APART = ${RAIN_APART.toFixed(4)};
${RIG_GLSL}
${DUSK_GLSL}

void main() {
  vec3 d = normalize(vDir);
  vec3 c = skyRadiance(d);
  // The underside of the overcast as a level sheet far above: lumps that close up toward the horizon as real ones do.
  vec2 q = d.xz / (max(d.y, 0.0) + 0.09);
  // (Its drift: a sheet 900 m up in a wind of 10 m/s.)
  q += vec2(0.011, 0.004) * uTime;
  float big = textureLod(tNoise, vec3(q * 0.11, 0.21), 0.0).g;
  float mid = textureLod(tNoise, vec3(q * 0.31 + 0.4, 0.63), 0.0).a;
  float small = textureLod(tNoise, vec3(q * 0.83, 0.87), 0.0).r;
  float n = big * 0.55 + mid * 0.3 + small * 0.15;
  float seen = smoothstep(0.0, 0.12, d.y);
  c *= 1.0 + (n - 0.5) * 0.9 * seen;
  // The raining cloud: a darker belly over the curtain.
  float az = atan(d.x, -d.z);
  float walk = az - uRain.x - ${RAIN_TURN.toFixed(4)} + RAIN_WALK * (uTime - RAIN_AT);
  walk -= floor(walk / RAIN_APART + 0.5) * RAIN_APART;
  float side = abs(walk) / uRain.y;
  float el = d.y / max(length(d.xz), 0.05);
  float belly = smoothstep(2.4, 0.3, side + (big - 0.5) * 1.6) * smoothstep(0.02, 0.14, el) * smoothstep(0.75, 0.3, el);
  c *= 1.0 - 0.42 * belly;
  // The overcast's own picture, laid round the horizon (its painted rain taken out: the air pass draws the rain, moving): it gives the sheet its soft lumps and its
  // weight. It is turned over at each end so that it has no seam, it climbs to forty degrees, and it drifts with the wind.
  float span = 1.9;
  vec2 uv = vec2(0.56 + (az - uRain.x + RAIN_WALK * (uTime - RAIN_AT)) / span, 0.04 + el * 1.25);
  uv.x = 1.0 - abs(1.0 - mod(uv.x, 2.0));
  uv.y = 1.0 - abs(1.0 - mod(uv.y, 2.0));
  // (Divided by what each of its rows comes to, so that only its lumps are taken from it and not its own lightening upward.)
  vec3 pic = texture2D(tSky, vec2(uv.x, 1.0 - uv.y), -1.0).rgb / (vec3(0.99, 0.98, 1.03) * mix(0.6, 0.83, smoothstep(0.35, 0.8, uv.y)));
  // Its lumps, deepened: an overcast seen over a pale flat has more shape than a camera gives it.
  pic = pow(pic, vec3(3.6));
  c *= mix(vec3(1.0), pic, smoothstep(-0.01, 0.05, d.y)) * mix(0.62, 0.46, smoothstep(0.02, 0.3, el));
  // The far distance is its own picture: the escarpment six kilometres on, the low bellies of the overcast over it and the rain hanging
  // from them, as the first lens sees them. It stands round the whole horizon (turned over at each end, so it has no seam) and gives way to
  // the sheet above it eleven degrees up. (Its painted shaft of rain is taken out; see assets-src/marsh/air/dry.py.)
  // (It was taken with the first lens: 44 degrees high, so its whole height is 0.808 in tangent and its width 1.436.)
  float fu = 0.68 + (az - uRain.x - ${RAIN_TURN.toFixed(4)}) / 1.436;
  fu = 1.0 - abs(1.0 - mod(fu, 2.0));
  // (Its hills stand lower in the first lens's approved picture than it has them: a ridge 0.037 high in tangent, not 0.06. The picture
  // is read closer set near the horizon, and as it was taken higher up.)
  float fv = 0.574 + max(el, 0.0) * (1.0 + 0.9 * exp(-max(el, 0.0) / 0.1)) / 0.808;
  vec3 far = texture2D(tFar, vec2(fu, min(fv, 0.995))).rgb;
  float low = smoothstep(0.3, 0.14, el);
  // The picture is as a screen shows it; the film's own curve (exposure 2, then AgX) is undone here so that it comes out as it went in:
  // its bellies as dark and its hills as faint as they were taken. (A fit of the curve's inverse, good from 0.4 to 0.93 of white.)
  vec3 shown = pow(far, vec3(1.0 / 2.2));
  far = exp2((((43.76 * shown - 96.814) * shown + 79.933) * shown - 21.049) * shown - 3.544) * FAR_GAIN;
  // Over the far picture the sheet is heavier than at the horizon's pale band: a lens that looks level sees its grey weight.
  c *= mix(1.0, 0.72, smoothstep(0.16, 0.42, el));
  // The sheet is brightest overhead, as an overcast is, and greys toward the far picture.
  c *= mix(1.25, 1.7, smoothstep(0.1, 0.5, el));
  c = mix(c, far, low);
  // The overcast thickens as the rain comes on (the air pass greys the far air with it).
  c *= duskAt(uTime);
  gl_FragColor = vec4(rigPlain(c), 1.0);
}`;

export interface Sky {
  dome: THREE.Mesh;
  dispose(): void;
}

export function createSky(ctx: Context, noise: THREE.Data3DTexture, rain: THREE.Vector4): Sky {
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { ...ctx.rig.uniforms, tNoise: { value: noise }, uRain: { value: rain }, tSky: { value: ctx.assets.texture('mat/sky-dry.jpg', { kind: 'colour', repeat: true }) }, tFar: { value: ctx.assets.texture('mat/far-dry.jpg', { kind: 'colour', repeat: false }) } },
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
