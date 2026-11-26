// The storm above the Spine as a body of cloud, not a picture: a wall of towers upwind of the ridge and a shelf that hangs out over it to the lee,
// marched through a field of billows that the gale carries and that turn over as they go. It is drawn once for each sample into a small target
// of its own, with the sample's own lens, and the dome lays that target over the clear dusk. Everything in it is large and slow: the billows are
// hundreds of metres across, and nothing is finer than the target can hold still.
import * as THREE from 'three';
import { DUSK, WIND } from '../shared/anchors';
import type { Context } from '../shared/context';
import { RIG_UNIFORMS_GLSL } from '../shared/glsl';

const windLength = Math.hypot(WIND[0], WIND[2]);
const W = [WIND[0] / windLength, WIND[2] / windLength] as const;
const duskLength = Math.hypot(DUSK[0], DUSK[2]);
const D = [DUSK[0] / duskLength, DUSK[2] / duskLength] as const;

/** The target is this many times smaller than the frame each way. */
export const STORM_SHRINK = 4;

/** The clear dusk and the storm's shape, for the dome, for the storm's own pass and for whatever fades into the sky. Lengths are kilometres. */
export const STORM_SHAPE_GLSL = /* glsl */ `
const vec2 GALE = vec2(${W[0].toFixed(4)}, ${W[1].toFixed(4)});
const vec2 LAST_LIGHT = vec2(${D[0].toFixed(4)}, ${D[1].toFixed(4)});
// The dusk with no cloud in it: deep overhead, pale and cold at the level, and toward the last light a thin band of orange with a pale belt over it.
vec3 skyClear(vec3 d) {
  float h = max(d.y, 0.0);
  float toDusk = 0.5 + 0.5 * dot(d.xz, LAST_LIGHT) * inversesqrt(max(dot(d.xz, d.xz), 1e-6));
  float lee = toDusk * toDusk;
  vec3 low = mix(vec3(0.05, 0.062, 0.1), vec3(0.1, 0.122, 0.17), lee);
  vec3 c = mix(low, vec3(0.017, 0.023, 0.046), 1.0 - exp(-h * 3.2));
  c += vec3(0.2, 0.165, 0.115) * lee * lee * exp(-h / 0.085);
  c += vec3(0.62, 0.25, 0.06) * pow(toDusk, 7.0) * exp(-h / 0.022);
  return c;
}
// How much of the storm stands at q: 1 in the body of the wall and of the shelf, falling to nothing at their edges. The wall is upwind of the
// ridge and rises out of the cloud sea; the shelf hangs from it out over the ridge, its base over the heads of the bolts, thinner toward the lee.
float stormBody(vec3 q) {
  float a = dot(q.xz, GALE);
  float c = q.x * GALE.y - q.z * GALE.x;
  a += 1.1 * sin(c * 0.33 + 0.7) + 0.5 * sin(c * 0.81 + 2.1);
  float out_ = smoothstep(-4.4, -2.4, a);
  float base = mix(-0.7, 1.3 + 0.24 * max(a + 2.4, 0.0), out_);
  float top = mix(8.6, base + 0.55, smoothstep(-3.6, 5.6, a));
  float body = smoothstep(base, base + 0.5, q.y) * (1.0 - smoothstep(top - 1.3, top, q.y));
  return body * (1.0 - 0.75 * smoothstep(0.5, 6.2, a)) * (1.0 - smoothstep(5.6, 7.0, a));
}
// How much of the sky toward d the storm takes, seen from the ridge, with none of its billows: for what needs the sky's colour, not its picture.
float stormCover(vec3 d) {
  float w = dot(d.xz, GALE);
  return smoothstep(0.12, -0.1, 0.5 * w - d.y - 0.05);
}`;

const VERTEX = /* glsl */ `
uniform mat4 uInvProjection;
uniform mat4 uCameraWorld;
varying vec3 vRay;
void main() {
  vec4 v = uInvProjection * vec4(position.xy, 1.0, 1.0);
  vRay = mat3(uCameraWorld) * (v.xyz / v.w);
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
precision highp sampler3D;
varying vec3 vRay;
uniform highp sampler3D tNoise;
uniform vec3 uEye;
${RIG_UNIFORMS_GLSL}
${STORM_SHAPE_GLSL}

// The gale carries the billows to the lee, and they rise through the body as they go: the small ones faster than the large, so the cloud turns over.
float stormBroad(vec3 q, float body) {
  vec3 p = q - vec3(GALE.x, 0.0, GALE.y) * (0.034 * uTime);
  float n = textureLod(tNoise, p / 7.3 + vec3(0.0, -0.0011 * uTime, 0.0), 0.0).r;
  return body * 1.5 + n * 1.25 - 1.12;
}
float stormDensity(vec3 q, float body) {
  float d = stormBroad(q, body);
  if (d <= -0.35) return 0.0;
  vec3 p = q - vec3(GALE.x, 0.0, GALE.y) * (0.046 * uTime) - vec3(0.0, 0.021 * uTime, 0.0);
  float fine = textureLod(tNoise, p / 2.1, 0.0).b;
  d -= 0.42 * (1.0 - fine) * (1.0 - clamp(d, 0.0, 1.0));
  return clamp(d * 1.7, 0.0, 1.0);
}

// The light of a stroke inside the cloud at q: the channel is a line of light from the tip up into the cloud, and the cloud about it glows.
float strokeLight(vec3 q) {
  vec3 a = uStrikeTip.xyz * 0.001;
  vec3 b = uStrikeTop.xyz * 0.001;
  b += (b - a) * 0.6;
  vec3 ab = b - a;
  float k = clamp(dot(q - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
  vec3 off = q - (a + ab * k);
  float r2 = dot(off, off);
  return uStrikeTop.w * (0.5 + 0.5 * k) * (0.16 / (0.16 + r2) + 0.35 / (1.0 + 0.25 * r2));
}
// The round lights of the rig (a bolt, a cloud lit from inside), in the cloud at q.
vec3 roundLights(vec3 q) {
  vec3 lit = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    if (i >= uEmitterCount) break;
    vec3 e = uEmitters[i].xyz * 0.001;
    float r = max(uEmitters[i].w * 0.001, 0.05);
    vec3 off = q - e;
    float power = dot(uEmitterRadiance[i], vec3(0.3, 0.5, 0.2)) * r * r;
    lit += normalize(uEmitterRadiance[i] + 1e-4) * (1.0 - exp(-power / 6.0)) / (1.0 + dot(off, off) / (r * r * 9.0 + 0.25));
  }
  return lit;
}
// The storm lights itself: deep in the wall, sheets of light that come and go by no beat. Three seats, each with its own slow field of chance.
vec3 sheetLight(vec3 q) {
  vec3 lit = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    float k = float(i);
    float chance = textureLod(tNoise, vec3(uTime * (0.23 + 0.07 * k), 0.17 + 0.31 * k, 0.61 - 0.23 * k), 0.0).r;
    float quick = textureLod(tNoise, vec3(uTime * (1.7 + 0.4 * k), 0.71 - 0.2 * k, 0.13 + 0.3 * k), 0.0).g;
    float on = smoothstep(0.52, 0.78, chance) * (0.35 + 0.65 * smoothstep(0.35, 0.7, quick));
    if (on <= 0.0) continue;
    float c = -7.0 + 6.5 * k + 2.0 * sin(k * 2.3 + floor(uTime * 0.11 + k * 0.37) * 1.9);
    vec2 seat = GALE * (-5.2 - 0.9 * k) + vec2(GALE.y, -GALE.x) * c;
    vec3 off = q - vec3(seat.x, 2.6 + 0.9 * k, seat.y);
    lit += vec3(0.5, 0.36, 1.0) * on / (1.0 + dot(off, off) / 1.6);
  }
  return lit;
}

void main() {
  vec3 d = normalize(vRay);
  vec3 ro = uEye * 0.001;
  // The body lies between the cloud sea and its tops, and ends 7 km to the lee: no ray is marched beyond it.
  float tEnd = d.y > 0.0 ? (8.7 - ro.y) / max(d.y, 1e-4) : (ro.y + 0.75) / max(-d.y, 1e-4);
  tEnd = min(tEnd, 46.0);
  float w = dot(d.xz, GALE);
  if (w > 0.0) tEnd = min(tEnd, (8.8 - dot(ro.xz, GALE)) / w);
  vec3 toLight = normalize(vec3(LAST_LIGHT.x, 0.32, LAST_LIGHT.y));
  float facing = dot(d, toLight);
  // Light from the open dusk on the lee, and through the cloud a little toward it.
  float phase = 0.7 + 0.5 * max(facing, 0.0) * max(facing, 0.0);
  vec3 keyLight = vec3(0.105, 0.118, 0.165) * phase;
  vec3 flash = uFlash / (1.0 + dot(uFlash, vec3(0.33)) / 0.05);
  float t = 0.5;
  float T = 1.0;
  vec3 col = vec3(0.0);
  bool inside = false;
  float last = 0.0;
  for (int i = 0; i < 80; i++) {
    if (t > tEnd || T < 0.02) break;
    vec3 q = ro + d * t;
    float body = stormBody(q);
    if (body <= 0.002) {
      inside = false;
      last = max(0.14, t * 0.07);
      t += last;
      continue;
    }
    if (!inside) {
      // The march has stepped into the body: back to where it was outside, and on from there in short steps.
      inside = true;
      t -= last * 0.85;
      continue;
    }
    float ds = max(0.055, t * 0.022);
    float dens = stormDensity(q, body);
    if (dens > 0.0) {
      // How much cloud stands between q and the open dusk, and how deep q is under the top and over the base.
      vec3 ql = q + toLight * 0.32;
      float shade = max(stormBroad(ql, stormBody(ql)), 0.0) + 0.5 * dens;
      vec3 qu = q + vec3(0.0, 0.45, 0.0);
      float over = max(stormBroad(qu, stormBody(qu)), 0.0);
      float thin = 1.0 - dens;
      vec3 lit = keyLight * (exp(-shade * 2.6) + 0.22 * exp(-shade * 0.6));
      // The sky overhead on what is open to it, the snow and the cloud sea from below on the undersides, and more of both in the thin edges.
      lit += vec3(0.02, 0.026, 0.047) * exp(-over * 2.2) * (0.6 + 0.6 * thin);
      lit += vec3(0.012, 0.0125, 0.019) * (0.5 + 0.8 * thin);
      // The storm lit from inside: violet, most where the cloud is thick about the light.
      vec3 inner = vec3(0.62, 0.36, 1.0) * strokeLight(q) * 1.1 + roundLights(q) * 0.5 + sheetLight(q) * 0.11;
      lit += inner * (0.35 + 0.65 * dens) + flash * 0.5;
      // Air between the lens and the cloud: far cloud goes to the colour of the sky at its foot.
      float air = exp(-t * 0.05);
      lit = mix(skyClear(vec3(d.x, 0.02, d.z)) * 0.55, lit, air);
      float a = 1.0 - exp(-dens * ds * 5.5);
      col += T * a * lit;
      T *= 1.0 - a;
    }
    t += ds;
  }
  if (T < 0.02) {
    col /= 1.0 - T;
    T = 0.0;
  }
  gl_FragColor = vec4(col, T);
}`;

export interface Storm {
  /** The storm as the last sample's lens sees it: rgb its light, a how much of the sky behind shows through. */
  uniforms: Record<string, THREE.IUniform>;
  render(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, on: boolean): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

export function createStorm(ctx: Context, noise: THREE.Data3DTexture): Storm {
  const make = (width: number, height: number): THREE.WebGLRenderTarget =>
    new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false, depthBuffer: false, stencilBuffer: false, colorSpace: THREE.NoColorSpace });
  let target = make(2, 2);
  const eye = new THREE.Vector3();
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      ...ctx.rig.uniforms,
      tNoise: { value: noise },
      uEye: { value: eye },
      uInvProjection: { value: new THREE.Matrix4() },
      uCameraWorld: { value: new THREE.Matrix4() },
    },
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
    toneMapped: false,
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  const quad = new THREE.Mesh(geometry, material);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const lens = new THREE.Camera();
  const uniforms: Record<string, THREE.IUniform> = {
    tStorm: { value: target.texture },
    // x, y: one over the size of the frame; z: 1 while the storm's target is drawn.
    uStormFrame: { value: new THREE.Vector3(1, 1, 0) },
  };
  const frame = (uniforms.uStormFrame as THREE.IUniform<THREE.Vector3>).value;
  return {
    uniforms,
    render: (renderer, camera, on) => {
      frame.z = on ? 1 : 0;
      if (!on) return;
      camera.updateMatrixWorld();
      eye.setFromMatrixPosition(camera.matrixWorld);
      (material.uniforms.uInvProjection as THREE.IUniform<THREE.Matrix4>).value.copy(camera.projectionMatrixInverse);
      (material.uniforms.uCameraWorld as THREE.IUniform<THREE.Matrix4>).value.copy(camera.matrixWorld);
      renderer.setRenderTarget(target);
      renderer.render(scene, lens);
    },
    resize: (width, height) => {
      const w = Math.ceil(width / STORM_SHRINK);
      const h = Math.ceil(height / STORM_SHRINK);
      frame.x = 1 / width;
      frame.y = 1 / height;
      if (target.width === w && target.height === h) return;
      target.dispose();
      target = make(w, h);
      (uniforms.tStorm as THREE.IUniform<THREE.Texture>).value = target.texture;
    },
    dispose: () => {
      target.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}
