// The storm above the Spine as a body of cloud, not a picture: a wall of towers upwind of the ridge and a shelf that hangs out over it to the lee,
// marched through a field of billows that the gale carries and that turn over as they go. It is drawn once for each sample into a small target
// of its own, with the sample's own lens, and the dome lays that target over the clear dusk. Everything in it is large and slow: the billows are
// hundreds of metres across, and nothing is finer than the target can hold still.
import * as THREE from 'three';
import { FPS } from '../../../config';
import { SHUTTER } from '../../../core/time';
import { DUSK, WIND } from '../shared/anchors';
import type { Context } from '../shared/context';
import { RIG_UNIFORMS_GLSL } from '../shared/glsl';

const windLength = Math.hypot(WIND[0], WIND[2]);
const W = [WIND[0] / windLength, WIND[2] / windLength] as const;
const duskLength = Math.hypot(DUSK[0], DUSK[2]);
const D = [DUSK[0] / duskLength, DUSK[2] / duskLength] as const;

/** The target is this many times smaller than the frame each way: a small frame keeps enough of it to be judged by. */
export const stormShrink = (width: number): number => (width >= 3000 ? 4 : width >= 1800 ? 3 : 2);

/** The clear dusk and the storm's shape, for the dome, for the storm's own pass and for whatever fades into the sky. Lengths are kilometres. */
export const STORM_SHAPE_GLSL = /* glsl */ `
const vec2 GALE = vec2(${W[0].toFixed(4)}, ${W[1].toFixed(4)});
const vec2 LAST_LIGHT = vec2(${D[0].toFixed(4)}, ${D[1].toFixed(4)});
// The dusk with no cloud in it: deep overhead, pale and cold at the level, and toward the last light a thin band of orange with a pale belt over it.
vec3 skyClear(vec3 d) {
  float h = max(d.y, 0.0);
  float toDusk = 0.5 + 0.5 * dot(d.xz, LAST_LIGHT) * inversesqrt(max(dot(d.xz, d.xz), 1e-6));
  float lee = toDusk * toDusk;
  vec3 low = mix(vec3(0.03, 0.038, 0.062), vec3(0.058, 0.074, 0.108), lee);
  vec3 c = mix(low, vec3(0.012, 0.017, 0.034), 1.0 - exp(-h * 3.2));
  c += vec3(0.05, 0.042, 0.033) * lee * lee * exp(-h / 0.045);
  c += vec3(0.4, 0.125, 0.02) * pow(toDusk, 7.0) * exp(-h / 0.014);
  return c;
}
// How much of the storm stands at q: 1 in the body of the wall and of the deck, falling to nothing at their edges. The wall is upwind of the
// ridge and rises out of the cloud sea; the deck hangs from it out over the ridge and far to the lee, its base over the heads of the bolts,
// and ends ragged well short of the last light: under its edge the dusk stands open, low.
float stormBody(vec3 q) {
  float a = dot(q.xz, GALE);
  float c = q.x * GALE.y - q.z * GALE.x;
  float b = dot(q.xz, LAST_LIGHT);
  float e = q.x * LAST_LIGHT.y - q.z * LAST_LIGHT.x;
  a += 1.1 * sin(c * 0.33 + 0.7) + 0.5 * sin(c * 0.81 + 2.1);
  b += 1.6 * sin(e * 0.21 + 1.3) + 0.7 * sin(e * 0.57 + 0.4);
  float out_ = smoothstep(-4.4, -2.4, a);
  // The deck's base rolls: long swells across the last light, which it rakes.
  float roll = 0.3 * sin(b * 0.9 + 0.7 * sin(e * 0.35)) + 0.22 * sin(e * 0.62 + b * 0.31 + 1.7);
  float base = mix(-0.7, 1.45 + 0.05 * max(a + 2.4, 0.0) + roll, out_);
  float top = mix(8.6, base + 1.9, smoothstep(-3.6, 2.5, a));
  float body = smoothstep(base, base + 1.1, q.y) * (1.0 - smoothstep(top - mix(3.2, 0.7, out_), top, q.y));
  return body * (1.0 - 0.55 * smoothstep(8.5, 15.5, b)) * (1.0 - smoothstep(14.0, 17.0, b));
}
// How much of the sky toward d the storm takes, seen from the ridge, with none of its billows: for what needs the sky's colour, not its picture.
float stormCover(vec3 d) {
  float w = dot(d.xz, LAST_LIGHT) * inversesqrt(max(dot(d.xz, d.xz), 1e-6));
  return smoothstep(-0.04, 0.05, d.y - 0.15 * w * smoothstep(0.3, 0.85, w));
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
uniform float uPhase;
${RIG_UNIFORMS_GLSL}
${STORM_SHAPE_GLSL}

// The gale carries the billows to the lee, and they rise through the body as they go: the small ones faster than the large, so the cloud turns over.
// The noise is read no finer than the march steps (lod), so far cloud keeps its large forms only and never breaks into slices.
float stormBroad(vec3 q, float body, float lod) {
  vec3 p = q - vec3(GALE.x, 0.0, GALE.y) * (0.034 * uTime);
  float n = textureLod(tNoise, p / 7.3 + vec3(0.0, -0.0011 * uTime, 0.0), lod).r;
  return body + 0.95 * (n - 0.6) - 0.5;
}
float stormDensity(vec3 q, float body, float ds, out float broad) {
  float d = stormBroad(q, body, clamp(log2(ds / 0.114), 0.0, 4.0));
  broad = clamp(d * 5.0, 0.0, 1.0);
  if (d <= -0.2) return 0.0;
  vec3 p = q - vec3(GALE.x, 0.0, GALE.y) * (0.046 * uTime) - vec3(0.0, 0.021 * uTime, 0.0);
  float lodFine = log2(ds / 0.033);
  float fine = lodFine < 3.0 ? mix(textureLod(tNoise, p / 2.1, max(lodFine, 0.0)).b, 0.45, smoothstep(1.5, 3.0, lodFine)) : 0.45;
  // The small billows stand on the skin of the large ones and do not reach into the body.
  d += 0.42 * (fine - 0.5) * (1.0 - smoothstep(0.12, 0.55, d));
  return clamp(d * 5.0, 0.0, 1.0);
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
  return (1.0 - exp(-0.5 * uStrikeTop.w)) * (0.5 + 0.5 * k) * (0.16 / (0.16 + r2) + 0.2 / (1.0 + 0.25 * r2));
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
// How bright each seat burns now.
vec3 sheetsNow() {
  vec3 on = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    float k = float(i);
    float chance = textureLod(tNoise, vec3(uTime * (0.23 + 0.07 * k), 0.17 + 0.31 * k, 0.61 - 0.23 * k), 0.0).r;
    float quick = textureLod(tNoise, vec3(uTime * (1.7 + 0.4 * k), 0.71 - 0.2 * k, 0.13 + 0.3 * k), 0.0).g;
    on[i] = smoothstep(0.52, 0.78, chance) * (0.35 + 0.65 * smoothstep(0.35, 0.7, quick));
  }
  return on;
}
vec3 sheetLight(vec3 q, vec3 on) {
  vec3 lit = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    if (on[i] <= 0.0) continue;
    float k = float(i);
    float c = -7.0 + 6.5 * k;
    vec2 seat = GALE * (-5.2 - 0.9 * k) + vec2(GALE.y, -GALE.x) * c;
    vec3 off = q - vec3(seat.x, 2.6 + 0.9 * k, seat.y);
    lit += vec3(0.5, 0.36, 1.0) * on[i] / (1.0 + dot(off, off) / 1.6);
  }
  return lit;
}

void main() {
  vec3 d = normalize(vRay);
  vec3 ro = uEye * 0.001;
  // The body lies between the cloud sea and its tops, and ends 7 km to the lee: no ray is marched beyond it.
  float tEnd = d.y > 0.0 ? (8.7 - ro.y) / max(d.y, 1e-4) : (ro.y + 0.75) / max(-d.y, 1e-4);
  tEnd = min(tEnd, 75.0);
  float w = dot(d.xz, LAST_LIGHT);
  if (w > 0.0) tEnd = min(tEnd, (19.5 - dot(ro.xz, LAST_LIGHT)) / w);
  // The last light comes in level under the deck's edge, and a little from below, off the cloud sea.
  vec3 toLight = normalize(vec3(LAST_LIGHT.x, 0.04, LAST_LIGHT.y));
  float toDusk = 0.5 + 0.5 * dot(d.xz, LAST_LIGHT) * inversesqrt(max(dot(d.xz, d.xz), 1e-6));
  vec3 farAir = mix(vec3(0.015, 0.018, 0.031), vec3(0.036, 0.044, 0.064), toDusk * toDusk);
  float facing = dot(d, toLight);
  // Light from the open dusk on the lee, and through the cloud a little toward it.
  float phase = 0.7 + 0.5 * max(facing, 0.0) * max(facing, 0.0);
  vec3 keyLight = vec3(0.15, 0.128, 0.122) * phase;
  vec3 flash = uFlash / (1.0 + dot(uFlash, vec3(0.33)) / 0.05);
  // Each sample of a frame starts its steps a share of a step on from the last one's: the frame is marched as finely as all of them together.
  vec3 sheets = sheetsNow();
  float t = 0.5 + 0.14 * uPhase;
  float T = 1.0;
  vec3 col = vec3(0.0);
  bool inside = false;
  bool clear = true;
  float last = 0.0;
  float came = 0.0;
  for (int i = 0; i < 80; i++) {
    if (t > tEnd || T < 0.02) break;
    vec3 q = ro + d * t;
    float body = stormBody(q);
    if (body <= 0.002) {
      inside = false;
      clear = true;
      last = max(0.14, t * 0.07);
      came = last;
      t += last;
      continue;
    }
    if (!inside) {
      // The march has stepped into the body: back to where it was outside, and on from there in short steps.
      inside = true;
      t -= last * (0.85 - 0.3 * uPhase);
      came = 0.0;
      continue;
    }
    float ds = max(0.055, t * 0.022);
    float broad = 0.0;
    float dens = stormDensity(q, body, ds, broad);
    if (dens > 0.0 && clear && came > 0.0) {
      // The march has stepped through the skin of the cloud: the skin is found between the last two steps, and the march goes on from it.
      // Every ray then takes its steps from the cloud's own surface, not from shells about the lens, and no shell shows on the cloud.
      float lo = t - came;
      float hi = t;
      for (int k = 0; k < 4; k++) {
        float mid = 0.5 * (lo + hi);
        vec3 qm = ro + d * mid;
        if (stormDensity(qm, stormBody(qm), ds, broad) > 0.0) hi = mid;
        else lo = mid;
      }
      t = hi + ds * (0.15 + 0.7 * uPhase);
      q = ro + d * t;
      body = stormBody(q);
      dens = stormDensity(q, body, ds, broad);
    }
    clear = dens <= 0.0;
    came = ds;
    if (dens > 0.0) {
      // How much cloud stands between q and the open dusk, and how deep q is under the top and over the base.
      vec3 ql = q + toLight * 0.2;
      vec3 qm = q + toLight * 0.7;
      float lod = clamp(log2(ds / 0.114) + 1.0, 1.0, 4.0);
      float toward = clamp(stormBroad(ql, stormBody(ql), lod) * 5.0, 0.0, 1.0);
      // A face of cloud that looks to the light has less cloud toward it than at itself; a flat base that the light only rakes has as much.
      float facing = clamp(0.16 + 1.7 * (broad - toward), 0.0, 1.0);
      float shade = toward + 1.4 * clamp(stormBroad(qm, stormBody(qm), lod + 1.0) * 5.0, 0.0, 1.0) + 0.15 * dens;
      // The sky overhead reaches what is near the top of the body, the snow and the cloud sea what is near its base.
      vec3 qu = q + vec3(0.0, 0.5, 0.0);
      float over = clamp(stormBroad(qu, stormBody(qu), lod + 1.0) * 5.0, 0.0, 1.0);
      float thin = 1.0 - dens;
      // The last light does not reach far into the storm: the wall and what falls from it stand in their own dark.
      float reach = 0.22 + 0.78 * smoothstep(-5.5, 1.5, dot(q.xz, GALE));
      vec3 lit = keyLight * reach * facing * (exp(-shade * 2.4) + 0.08 * exp(-shade * 0.5)) + vec3(0.018, 0.025, 0.045) * exp(-over * 3.0);
      // The sky overhead on what is open to it, the snow and the cloud sea from below on the undersides, and more of both in the thin edges.
      lit += vec3(0.0075, 0.0088, 0.014) * (0.7 + 0.6 * thin);
      // The storm lit from inside: violet, most where the cloud is thick about the light.
      vec3 inner = vec3(0.62, 0.36, 1.0) * strokeLight(q) * 1.1 + roundLights(q) * 0.5 + sheetLight(q, sheets) * 0.11;
      lit += (inner + flash * 0.12) * (0.3 + 0.7 * dens);
      // Air between the lens and the cloud: far cloud goes to the colour of the sky at its foot.
      float air = exp(-t * 0.022);
      lit = mix(farAir, lit, air);
      // No step takes more than a third of the light, however long it is: far cloud ends softly and never in slices.
      float a = (1.0 - exp(-dens * min(ds * 5.5, 0.42))) ;
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
  // The same block of noise, with its smaller copies: the march reads it as coarse as its steps are long.
  const soft = new THREE.Data3DTexture(noise.image.data, noise.image.width, noise.image.height, noise.image.depth);
  soft.format = THREE.RGBAFormat;
  soft.type = THREE.UnsignedByteType;
  soft.minFilter = THREE.LinearMipmapLinearFilter;
  soft.magFilter = THREE.LinearFilter;
  soft.wrapS = THREE.RepeatWrapping;
  soft.wrapT = THREE.RepeatWrapping;
  soft.wrapR = THREE.RepeatWrapping;
  soft.colorSpace = THREE.NoColorSpace;
  soft.generateMipmaps = true;
  soft.unpackAlignment = 1;
  soft.needsUpdate = true;
  const make = (width: number, height: number): THREE.WebGLRenderTarget =>
    new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false, depthBuffer: false, stencilBuffer: false, colorSpace: THREE.NoColorSpace });
  let target = make(2, 2);
  const eye = new THREE.Vector3();
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      ...ctx.rig.uniforms,
      tNoise: { value: soft },
      uEye: { value: eye },
      uPhase: { value: 0.5 },
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
      // Where in the frame's open shutter this sample stands, 0 to 1: a pure function of the place's time.
      const frames = (ctx.rig.uniforms.uTime as THREE.IUniform<number>).value * FPS;
      (material.uniforms.uPhase as THREE.IUniform<number>).value = SHUTTER > 0 ? ((frames - Math.floor(frames)) / SHUTTER) % 1 : 0.5;
      (material.uniforms.uInvProjection as THREE.IUniform<THREE.Matrix4>).value.copy(camera.projectionMatrixInverse);
      (material.uniforms.uCameraWorld as THREE.IUniform<THREE.Matrix4>).value.copy(camera.matrixWorld);
      renderer.setRenderTarget(target);
      renderer.render(scene, lens);
    },
    resize: (width, height) => {
      const w = Math.ceil(width / stormShrink(width));
      const h = Math.ceil(height / stormShrink(width));
      frame.x = 1 / width;
      frame.y = 1 / height;
      if (target.width === w && target.height === h) return;
      target.dispose();
      target = make(w, h);
      (uniforms.tStorm as THREE.IUniform<THREE.Texture>).value = target.texture;
    },
    dispose: () => {
      target.dispose();
      soft.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}
