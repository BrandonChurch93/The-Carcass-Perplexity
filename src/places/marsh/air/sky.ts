// The sky of the marsh: a white overcast, the same one the rig lights every surface with (skyRadiance), with the slow mottle of a real one
// and the darker base of the cloud that is raining over the far flats.
import * as THREE from 'three';
import type { Context } from '../shared/context';
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
uniform highp sampler3D tNoise;
uniform vec4 uRain;
${RIG_GLSL}

void main() {
  vec3 d = normalize(vDir);
  vec3 c = skyRadiance(d);
  // The underside of the overcast as a level sheet far above: lumps that close up toward the horizon as real ones do.
  vec2 q = d.xz / (max(d.y, 0.0) + 0.09);
  q += vec2(0.004, 0.0015) * uTime;
  float big = textureLod(tNoise, vec3(q * 0.035, 0.21), 0.0).g;
  float mid = textureLod(tNoise, vec3(q * 0.11 + 0.4, 0.63), 0.0).a;
  float small = textureLod(tNoise, vec3(q * 0.37, 0.87), 0.0).r;
  float n = big * 0.55 + mid * 0.3 + small * 0.15;
  float seen = smoothstep(0.0, 0.12, d.y);
  c *= 1.0 + (n - 0.5) * 0.42 * seen;
  // The raining cloud: a darker belly over the curtain.
  float az = atan(d.x, -d.z);
  float side = abs(az - uRain.x) / uRain.y;
  float el = d.y / max(length(d.xz), 0.05);
  float belly = smoothstep(1.6, 0.4, side + (big - 0.5) * 0.8) * smoothstep(0.08, 0.2, el) * smoothstep(0.75, 0.3, el);
  c *= 1.0 - 0.2 * belly * uRain.w;
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

export interface Sky {
  dome: THREE.Mesh;
  dispose(): void;
}

export function createSky(ctx: Context, noise: THREE.Data3DTexture, rain: THREE.Vector4): Sky {
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { ...ctx.rig.uniforms, tNoise: { value: noise }, uRain: { value: rain } },
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
