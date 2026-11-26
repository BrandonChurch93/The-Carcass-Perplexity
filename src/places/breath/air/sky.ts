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

/** The far picture (public/assets/breath/air/far.jpg) as a lens saw it: the bearing of its middle, degrees, the tangent of half its width and
 *  of half its height, and how far up it the horizon lies. */
const FAR = { bearing: 19, wide: 0.824, tall: 0.38, horizon: 0.535 };

// The far picture laid on the sky by direction: the low sun in its fog at the left, the cliff and its cave at the right. It was made for
// the screen, so the film's own tone curve is undone first: what reaches the screen is the picture. w is how much of it is there (it
// fades into the sky of the rig at its edges). Nothing of the picture under its horizon is drawn: the built ground lies there.
export const FAR_GLSL = /* glsl */ `
uniform sampler2D tFar;
vec3 agxCurve(vec3 x) {
  vec3 x2 = x * x;
  vec3 x4 = x2 * x2;
  return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232;
}
vec3 untoned(vec3 o) {
  const mat3 TO_WIDE = mat3(vec3(0.6274, 0.0691, 0.0164), vec3(0.3293, 0.9195, 0.0880), vec3(0.0433, 0.0113, 0.8956));
  const mat3 FROM_WIDE = mat3(vec3(1.6605, -0.1246, -0.0182), vec3(-0.5876, 1.1329, -0.1006), vec3(-0.0728, -0.0083, 1.1187));
  const mat3 OUT_BACK = mat3(vec3(0.8997969559, 0.1114209890, 0.1114209890), vec3(0.0871996192, 0.8755755862, 0.0871996192), vec3(0.0130034249, 0.0130034249, 0.8013793918));
  const mat3 IN_BACK = mat3(vec3(1.1974410769, -0.1964746263, -0.1465574171), vec3(-0.1442615127, 1.3540951315, -0.1082840588), vec3(-0.0531795642, -0.1576205051, 1.2548414759));
  vec3 c = OUT_BACK * pow(max(TO_WIDE * o, 0.0), vec3(1.0 / 2.2));
  vec3 lo = vec3(0.0);
  vec3 hi = vec3(1.0);
  for (int i = 0; i < 12; i++) {
    vec3 m = 0.5 * (lo + hi);
    vec3 below = step(agxCurve(m), c);
    lo = mix(lo, m, below);
    hi = mix(m, hi, below);
  }
  c = exp2(0.5 * (lo + hi) * 16.499999 - 12.47393);
  return max(FROM_WIDE * (IN_BACK * c), 0.0);
}
vec4 farPicture(vec3 d) {
  const vec3 ahead = vec3(${Math.sin((FAR.bearing * Math.PI) / 180).toFixed(5)}, 0.0, ${(-Math.cos((FAR.bearing * Math.PI) / 180)).toFixed(5)});
  const vec3 right = vec3(${Math.cos((FAR.bearing * Math.PI) / 180).toFixed(5)}, 0.0, ${Math.sin((FAR.bearing * Math.PI) / 180).toFixed(5)});
  float z = dot(d, ahead);
  vec2 q = vec2(dot(d, right), d.y) / max(z, 0.05);
  vec2 uv = vec2(0.5 + q.x / ${(2 * FAR.wide).toFixed(4)}, ${FAR.horizon.toFixed(3)} + q.y / ${(2 * FAR.tall).toFixed(4)});
  float w = step(0.05, z) * smoothstep(0.02, 0.3, uv.x) * smoothstep(1.0, 0.9, uv.x) * smoothstep(1.0, 0.9, uv.y);
  uv.y = max(uv.y, ${(FAR.horizon + 0.006).toFixed(3)});
  vec3 seen = textureLod(tFar, clamp(uv, 0.002, 0.998), 0.0).rgb;
  // The picture's cliff holds snow in white patches. The place has none: they are toned down to pale rock faces in the haze.
  float lum = dot(seen, vec3(0.3333));
  float pale = smoothstep(0.22, 0.34, lum) * smoothstep(0.1, 0.04, seen.r - seen.b) * smoothstep(0.22, 0.3, uv.x);
  seen *= mix(vec3(1.0), vec3(1.07, 1.0, 0.89) * ((0.24 + 0.15 * (lum - 0.24)) / max(lum, 0.01)), pale);
  return vec4(untoned(seen), w);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
precision highp sampler3D;
varying vec3 vDir;
uniform highp sampler3D tNoise;
${RIG_GLSL}
${FAR_GLSL}

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
  // The sun: no disc with an edge, a glare that the fog spreads and turns deep gold.
  float s = dot(d, uSunDir);
  c += uSunColour * vec3(1.0, 0.42, 0.1) * (1.0 * smoothstep(0.9988, 0.99995, s) + 0.8 * pow(max(s, 0.0), 500.0) + 0.25 * pow(max(s, 0.0), 60.0));
  vec4 far = farPicture(d);
  c = mix(c, far.rgb, far.a);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

// The far cliff alone: the part of the sky where the picture holds the cliff, drawn by the same rule, so that it is the same pixel for pixel.
const CLIFF_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vDir;
${RIG_GLSL}
${FAR_GLSL}
void main() {
  gl_FragColor = vec4(rigOut(farPicture(normalize(vDir)).rgb), 1.0);
}`;

/** The far cliff as a part: a patch of the sky from bearing -4 to 54 degrees and from the horizon to 18 degrees up, where the far picture is whole. */
export function createCliff(ctx: Context): { mesh: THREE.Mesh; dispose(): void } {
  const picture = ctx.assets.texture('air/far.jpg', { kind: 'colour' });
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: CLIFF_FRAGMENT,
    uniforms: { ...ctx.rig.uniforms, tFar: { value: picture } },
    side: THREE.DoubleSide,
    depthTest: true,
    depthFunc: THREE.LessEqualDepth,
    depthWrite: false,
    toneMapped: false,
  });
  const columns = 24;
  const rows = 8;
  const position = new Float32Array((columns + 1) * (rows + 1) * 3);
  const index: number[] = [];
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= columns; i++) {
      const b = ((-4 + (58 * i) / columns) * Math.PI) / 180;
      const e = ((-0.4 + (18.4 * j) / rows) * Math.PI) / 180;
      position.set([Math.sin(b) * Math.cos(e), Math.sin(e), -Math.cos(b) * Math.cos(e)], (j * (columns + 1) + i) * 3);
      if (i < columns && j < rows) {
        const k = j * (columns + 1) + i;
        index.push(k, k + 1, k + columns + 1, k + 1, k + columns + 2, k + columns + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setIndex(index);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 99;
  return {
    mesh,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}

export interface Sky {
  dome: THREE.Mesh;
  dispose(): void;
}

export function createSky(ctx: Context, noise: THREE.Data3DTexture): Sky {
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { ...ctx.rig.uniforms, tNoise: { value: noise }, tFar: { value: ctx.assets.texture('air/far.jpg', { kind: 'colour' }) } },
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
