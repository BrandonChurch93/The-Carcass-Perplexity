// The sky of the Breath: a dome that shows the same dawn the rig lights every surface with (skyRadiance): cold grey fog overhead, pale toward
// the horizon, gold round the low sun, and the sun itself as a soft disc that the fog has taken the edge off.
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
  // The fog overhead is not even: slow banks of it, long and level, a little brighter where they are thin. They close up toward the horizon.
  vec2 q = d.xz / (max(d.y, 0.0) + 0.16);
  q += vec2(uTime * 0.0016, uTime * 0.0005);
  float a = textureLod(tNoise, vec3(q.x * 0.05, q.y * 0.11, 0.21), 0.0).g;
  float b = textureLod(tNoise, vec3(q.x * 0.17 + 0.4, q.y * 0.4, 0.57), 0.0).a;
  float n = a * 0.65 + b * 0.35;
  float high = smoothstep(0.02, 0.3, d.y);
  c *= 1.0 + high * 0.34 * (n - 0.5);
  // The sun: a disc of two degrees with a soft edge, as it is seen through fog.
  float s = dot(d, uSunDir);
  c += uSunColour * (9.0 * smoothstep(0.99975, 0.99995, s) + 1.6 * pow(max(s, 0.0), 900.0));
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
