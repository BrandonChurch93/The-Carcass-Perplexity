// The dome: the dusk sky above the cloud. The rig's sky, as every surface is lit by it, with the bars of high cloud that lie over the last light.
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
${RIG_GLSL}

void main() {
  vec3 d = normalize(vDir);
  vec3 c = skyRadiance(d);
  float el = asin(clamp(d.y, -1.0, 1.0));
  float az = atan(d.z, d.x);
  float open = 1.0 - stormSide(d);
  // Bars of cloud, long and level, low over the horizon: dark against the band, with the band's light under them.
  vec2 q = vec2(az * 2.2, el * 9.0) + uTime * vec2(0.0012, 0.0);
  vec4 n = textureLod(tNoise, vec3(q.x * 0.21, q.y * 0.9, 0.37), 0.0);
  vec4 m = textureLod(tNoise, vec3(q.x * 0.9 + 0.3, q.y * 3.1, 0.71), 0.0);
  float bars = smoothstep(0.5, 0.72, 0.7 * n.g + 0.3 * m.g) * smoothstep(0.012, 0.05, el) * smoothstep(0.75, 0.2, el);
  float w = max(dot(normalize(d.xz + 1e-5), uWarmDir.xz), 0.0);
  vec3 under = uSkyStorm * 1.9 + uWarmColour * (0.05 * w * w * smoothstep(0.3, 0.02, el));
  c = mix(c, under, 0.85 * bars * (0.35 + 0.65 * open));
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

export interface Sky {
  dome: THREE.Mesh;
  dispose(): void;
}

export function createSky(ctx: Context, noise: THREE.Data3DTexture): Sky {
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { ...ctx.rig.uniforms, tNoise: { value: noise } },
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
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
