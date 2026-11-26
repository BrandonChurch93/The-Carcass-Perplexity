// The air of the Eye: the evening sky with its one thin streak of cloud, the clear air that pales the far cliffs,
// and the mist that lies at their feet and on the far water.
import * as THREE from 'three';
import { volumeUniforms } from '../../../core/engine';
import { QUAD_VERTEX } from '../../../core/post';
import { smooth } from '../layout';
import { KEYS } from '../cameras';
import { during } from '../shared/anchors';
import { PLATES, plateFor } from './plates';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

export const PARTS: readonly string[] = ['sky', 'air', 'mist'];

const SKY_VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 w = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const SKY_FRAGMENT = /* glsl */ `
varying vec3 vDir;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  vec3 d = normalize(vDir);
  if (uPlateTone.w > 0.5) {
    gl_FragColor = vec4(rigOut(farRadiance(cameraPosition, d, 0.0)), 1.0);
    return;
  }
  vec3 c = skyRadiance(d);
  // One thin streak of high cloud, lit from under by the sun that has left the ground.
  float az = atan(d.x, -d.z);
  float el = asin(clamp(d.y, -1.0, 1.0));
  float along = (az - 0.42) / 0.5;
  float lane = el - 0.2 - 0.03 * along - 0.012 * sin(along * 5.0);
  if (abs(lane) < 0.02 && abs(along) < 1.8) {
    float wisp = fbm(vec2(az * 26.0 - uTime * 0.014, lane * 240.0));
    float fine = fbm(vec2(az * 90.0 - uTime * 0.03, lane * 520.0) + 4.0);
    float streak = exp(-along * along * 1.6) * exp(-pow(lane / 0.006, 2.0)) * smoothstep(0.25, 0.7, 0.6 * wisp + 0.4 * fine);
    c += (uSunColour * 0.085 + uSkyHorizon * 0.25) * streak * 0.45;
  }
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

const VOLUME_FRAGMENT = /* glsl */ `
uniform highp sampler2D tDepth;
uniform mat4 uInvProjection;
uniform mat4 uCameraWorld;
uniform float uSeq;
uniform float uSampleIndex;
uniform float uHaze;
uniform float uMist;
uniform float uThin;
varying vec2 vUv;
${NOISE_GLSL}
${RIG_GLSL}

const float TOP = 30.0;

// How thick the mist is at a point: it lies where the water meets the far walls, in banks, and thins upward.
float mistAt(vec3 p, vec4 land) {
  float band = smoothstep(-200.0, -30.0, land.b) * (1.0 - smoothstep(30.0, 170.0, land.b));
  // With a picture of the far world hung, the mist lies on the water in front of it and thickens toward its foot.
  if (uPlateTone.w > 0.5) {
    float d = length(p.xz - uPlateAt.xz);
    band = smoothstep(uPlateAt.w - 330.0, uPlateAt.w - 40.0, d) * step(d, uPlateAt.w);
    float lift = 2.2 + 4.5 * vnoise(p.xz / 190.0 + 3.0 + uTime * 0.012);
    float banks = smoothstep(0.15, 0.75, 0.6 * vnoise(p.xz / 260.0 + vec2(uTime * 0.03, -uTime * 0.017)) + 0.4 * vnoise(p.xz / 70.0 + uTime * 0.06) + 0.35 * band);
    return 0.55 * band * banks * exp(-max(p.y, 0.0) / lift) * smoothstep(TOP, TOP * 0.45, p.y);
  }
  float far = 0.16 + 0.84 * smoothstep(250.0, -350.0, p.z);
  float lift = 1.6 + 3.6 * vnoise(p.xz / 210.0 + 3.0 + uTime * 0.01);
  float thick = band * far * exp(-max(p.y, 0.0) / lift);
  if (thick < 0.004) return 0.0;
  vec2 q = p.xz / 150.0 + vec2(uTime * 0.05, -uTime * 0.028);
  float banks = smoothstep(0.3, 0.72, 0.55 * vnoise(q) + 0.3 * vnoise(q * 2.3 + 5.0) + 0.15 * vnoise(q * 6.1) + 0.18 * vnoise(p.xz / 23.0 + uTime * 0.11));
  return thick * banks;
}

void main() {
  ivec2 pixel = 2 * ivec2(gl_FragCoord.xy);
  float depth = texelFetch(tDepth, pixel, 0).r;
  vec2 uv = (vec2(pixel) + 0.5) / vec2(textureSize(tDepth, 0));
  vec4 view = uInvProjection * vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec3 world = (uCameraWorld * vec4(view.xyz / view.w, 1.0)).xyz;
  vec3 ro = uCameraWorld[3].xyz;
  vec3 rd = world - ro;
  float far = length(rd);
  rd /= far;
  // The far world is a picture with its own air in it: the air of the place is laid over it only as far as its cylinder stands.
  far = min(far, uPlateTone.w > 0.5 ? plateDistance(ro, rd) : 20000.0);

  // The clear air: thickest at the water, gone by the top of the walls. Its light is the low sky it is seen against.
  float k0 = 0.000042 * uHaze * uThin;
  float scale = 190.0;
  float y1 = ro.y + rd.y * far;
  float od = abs(rd.y) > 1e-4 ? k0 * scale * (exp(-max(ro.y, 0.0) / scale) - exp(-max(y1, 0.0) / scale)) / rd.y : k0 * exp(-max(ro.y, 0.0) / scale) * far;
  od = max(od, 0.0);
  float through = exp(-od);
  vec3 low = skyRadiance(normalize(vec3(rd.x, 0.05, rd.z)));
  vec3 light = low * vec3(0.9, 0.82, 0.78) * (1.0 - through);

  // The mist, marched through the layer it lies in.
  float mistOn = uMist * uThin;
  if (mistOn > 0.0) {
    float t0 = 0.0;
    float t1 = far;
    if (abs(rd.y) > 1e-5) {
      float a = (0.0 - ro.y) / rd.y;
      float b = (TOP - ro.y) / rd.y;
      t0 = max(t0, min(a, b));
      t1 = min(t1, max(a, b));
    } else if (ro.y > TOP) t1 = -1.0;
    t1 = min(t1, 4200.0);
    if (t1 > t0) {
      const int STEPS = 10;
      float dt = (t1 - t0) / float(STEPS);
      float jitter = hash13(vec3(gl_FragCoord.xy, uSampleIndex + 17.0 * fract(uSeq * 0.137)));
      vec3 sum = vec3(0.0);
      float tr = 1.0;
      for (int i = 0; i < STEPS; i++) {
        vec3 p = ro + rd * (t0 + (float(i) + jitter) * dt);
        vec4 land = landAt(p.xz);
        float d = mistAt(p, land) * 0.0052 * mistOn;
        if (d > 0.0) {
          float a = 1.0 - exp(-d * dt);
          float open = mix(land.g, 1.0, 0.5);
          vec3 lit = 0.3 * skyIrradiance(vec3(0.0, 1.0, 0.0)) * open + uSunColour * (0.13 * sunOver(land, p)) + 0.35 * low;
          sum += tr * a * lit / 3.14159 * 2.4;
          tr *= 1.0 - a;
        }
      }
      light = light * tr + sum;
      through *= tr;
    }
  }
  gl_FragColor = vec4(light, through);
}`;

export function create(ctx: Context): Piece {
  const skyMaterial = new THREE.ShaderMaterial({ uniforms: { ...ctx.rig.uniforms }, vertexShader: SKY_VERTEX, fragmentShader: SKY_FRAGMENT, side: THREE.BackSide });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(20000, 64, 32), skyMaterial);
  sky.frustumCulled = false;
  ctx.scene.add(ctx.parts.built('sky', sky));
  ctx.parts.effect('air', 'built');
  ctx.parts.effect('mist', 'built');

  const show = { uHaze: { value: 1 }, uMist: { value: 1 }, uThin: { value: 1 } };
  const volume = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERTEX,
    fragmentShader: VOLUME_FRAGMENT,
    uniforms: { ...ctx.rig.uniforms, ...volumeUniforms(), ...show },
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
    toneMapped: false,
  });
  const end = ctx.events.end;
  const pictures = PLATES.map((p) => ctx.assets.texture(p.file, { repeat: false, anisotropy: 2 }));
  const rig = ctx.rig.uniforms;

  return {
    volume,
    setTime: (t) => {
      // The air clears as the camera leaves: the last frames are the flat picture the rise begins with.
      show.uThin.value = 1 - smooth(end - 3, end - 1.3, t);
      // The evening shade over the south shore and the spur is laid for the wide shot alone.
      (rig.uShade as THREE.IUniform<THREE.Vector4>).value.w = during('eye-01') ? 0.55 : 0;
      // The far world of the shot the camera stands in.
      const i = plateFor();
      const tone = (rig.uPlateTone as THREE.IUniform<THREE.Vector4>).value;
      const near = (rig.uNear as THREE.IUniform<THREE.Vector4>).value;
      if (i < 0) {
        tone.w = 0;
        near.w = 0;
      } else {
        const p = PLATES[i] as (typeof PLATES)[number];
        (rig.tPlate as THREE.IUniform).value = pictures[i];
        (rig.uPlateAt as THREE.IUniform<THREE.Vector4>).value.set(p.at[0], p.at[1], p.at[2], p.radius);
        (rig.uPlateLens as THREE.IUniform<THREE.Vector4>).value.set((p.bearing * Math.PI) / 180, p.tanAcross, p.tanUp, p.horizon);
        tone.set(p.tone[0], p.tone[1], p.tone[2], p.wall ? 2 : 1);
        near.set(KEYS[p.key].position[0], KEYS[p.key].position[2], p.near, 1);
      }
    },
    beforeSample: (_renderer, camera) => {
      sky.position.copy(camera.position);
    },
    solo: (part) => {
      show.uHaze.value = part === null || part === 'eye/air' ? 1 : 0;
      show.uMist.value = part === null || part === 'eye/mist' ? 1 : 0;
    },
    dispose: () => {
      sky.geometry.dispose();
      skyMaterial.dispose();
      volume.dispose();
    },
  };
}
