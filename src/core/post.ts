import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import type { Look } from './stage';

export const DIAGNOSTICS = ['invalid', 'depth', 'standins', 'motion', 'solo'] as const;
export type Diagnostic = (typeof DIAGNOSTICS)[number] | null;

const LEVELS = 6;

export const QUAD_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

export const HASH_GLSL = /* glsl */ `
uint mix32(uint h) {
  h ^= h >> 16; h *= 0x7feb352dU; h ^= h >> 15; h *= 0x846ca68bU; h ^= h >> 16;
  return h;
}
uint hash2(uint a, uint b) {
  return mix32(((mix32(a) ^ 0x9e3779b9U) * 0x85ebca6bU) ^ mix32(b + 0x632be5abU));
}
float rnd(ivec2 p, uint k) {
  return float(hash2(hash2(uint(p.x), uint(p.y)), k) >> 8) / 16777216.0;
}`;

const CLEAN_GLSL = /* glsl */ `
vec3 clean(vec3 c) {
  return mix(clamp(c, 0.0, 60000.0), vec3(0.0), isnan(c));
}`;

const DOWN_FRAGMENT = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uTexel;
uniform float uKaris;
varying vec2 vUv;
${CLEAN_GLSL}
vec3 tap(float x, float y) {
  return clean(texture2D(tSrc, vUv + vec2(x, y) * uTexel).rgb);
}
float karis(vec3 c) {
  return 1.0 / (1.0 + dot(c, vec3(0.2126, 0.7152, 0.0722)));
}
void main() {
  vec3 a = tap(-2.0, 2.0), b = tap(0.0, 2.0), c = tap(2.0, 2.0);
  vec3 d = tap(-2.0, 0.0), e = tap(0.0, 0.0), f = tap(2.0, 0.0);
  vec3 g = tap(-2.0, -2.0), h = tap(0.0, -2.0), i = tap(2.0, -2.0);
  vec3 j = tap(-1.0, 1.0), k = tap(1.0, 1.0), l = tap(-1.0, -1.0), m = tap(1.0, -1.0);
  vec3 o;
  if (uKaris > 0.5) {
    vec3 g0 = (a + b + d + e) * 0.25;
    vec3 g1 = (b + c + e + f) * 0.25;
    vec3 g2 = (d + e + g + h) * 0.25;
    vec3 g3 = (e + f + h + i) * 0.25;
    vec3 g4 = (j + k + l + m) * 0.25;
    float w0 = karis(g0) * 0.125, w1 = karis(g1) * 0.125, w2 = karis(g2) * 0.125, w3 = karis(g3) * 0.125, w4 = karis(g4) * 0.5;
    o = (g0 * w0 + g1 * w1 + g2 * w2 + g3 * w3 + g4 * w4) / (w0 + w1 + w2 + w3 + w4);
  } else {
    o = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  }
  gl_FragColor = vec4(o, 1.0);
}`;

const UP_FRAGMENT = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uTexel;
uniform float uRadius;
varying vec2 vUv;
void main() {
  vec2 d = uTexel * uRadius;
  vec3 o = texture2D(tSrc, vUv).rgb * 4.0;
  o += (texture2D(tSrc, vUv + vec2(-d.x, 0.0)).rgb + texture2D(tSrc, vUv + vec2(d.x, 0.0)).rgb
      + texture2D(tSrc, vUv + vec2(0.0, -d.y)).rgb + texture2D(tSrc, vUv + vec2(0.0, d.y)).rgb) * 2.0;
  o += texture2D(tSrc, vUv + vec2(-d.x, -d.y)).rgb + texture2D(tSrc, vUv + vec2(d.x, -d.y)).rgb
     + texture2D(tSrc, vUv + vec2(-d.x, d.y)).rgb + texture2D(tSrc, vUv + vec2(d.x, d.y)).rgb;
  gl_FragColor = vec4(o / 16.0, 1.0);
}`;

const FINAL_FRAGMENT = /* glsl */ `
${THREE.ShaderChunk.tonemapping_pars_fragment}
uniform sampler2D tAccum;
uniform sampler2D tBloom;
uniform sampler2D tDepth;
uniform vec2 uSize;
uniform float uExposure;
uniform float uBloom;
uniform float uVignette;
uniform float uGrain;
uniform float uSaturation;
uniform float uContrast;
uniform vec3 uTint;
uniform float uNear;
uniform float uFar;
uniform int uSeq;
uniform int uDiag;
uniform float uPlain;
varying vec2 vUv;
${HASH_GLSL}
${CLEAN_GLSL}
vec3 toSrgb(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(max(c, 0.0), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
float grainAt(vec2 p, uint k) {
  vec2 i = floor(p);
  vec2 f = p - i;
  ivec2 q = ivec2(i);
  float a = rnd(q, k), b = rnd(q + ivec2(1, 0), k), c = rnd(q + ivec2(0, 1), k), d = rnd(q + ivec2(1, 1), k);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y) - 0.5;
}
void main() {
  vec3 raw = texture2D(tAccum, vUv).rgb;
  if (uDiag == 1) {
    bool bad = any(isnan(raw)) || any(isinf(raw)) || any(lessThan(raw, vec3(-0.0001)));
    gl_FragColor = vec4(bad ? vec3(1.0, 0.0, 1.0) : vec3(0.03), 1.0);
    return;
  }
  if (uDiag == 2) {
    float d = texture2D(tDepth, vUv).r;
    float z = uNear * uFar / (uFar - d * (uFar - uNear));
    gl_FragColor = vec4(vec3(clamp(log(z / uNear) / log(uFar / uNear), 0.0, 1.0)), 1.0);
    return;
  }
  if (uDiag == 3) {
    gl_FragColor = vec4(clamp(clean(raw), 0.0, 1.0), 1.0);
    return;
  }
  vec3 c = mix(clean(raw), texture2D(tBloom, vUv).rgb / float(${LEVELS}), uBloom);
  vec2 q = (vUv - 0.5) * vec2(uSize.x / uSize.y, 1.0);
  c *= 1.0 - uVignette * smoothstep(0.25, 1.05, length(q));
  c = AgXToneMapping(c * uExposure);
  c = toSrgb(c);
  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(luma), c, uSaturation);
  c = (c - 0.5) * uContrast + 0.5;
  c *= uTint;
  if (uPlain > 0.5) {
    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    return;
  }
  ivec2 px = ivec2(gl_FragCoord.xy);
  uint k = uint(uSeq);
  float g = grainAt(gl_FragCoord.xy * (1080.0 / uSize.y), k * 3u + 1u);
  c += g * uGrain * (1.0 - 0.6 * abs(2.0 * luma - 1.0));
  float t = rnd(px, k * 3u + 2u) + rnd(px, k * 3u + 3u) - 1.0;
  gl_FragColor = vec4(clamp(c + t / 255.0, 0.0, 1.0), 1.0);
}`;

const DIFFERENCE_FRAGMENT = /* glsl */ `
uniform sampler2D tA;
uniform sampler2D tB;
varying vec2 vUv;
void main() {
  gl_FragColor = vec4(abs(texture2D(tA, vUv).rgb - texture2D(tB, vUv).rgb), 1.0);
}`;

function pass(fragment: string, uniforms: Record<string, THREE.IUniform>, additive = false): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: QUAD_VERTEX,
    fragmentShader: fragment,
    uniforms,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    blending: additive ? THREE.CustomBlending : THREE.NoBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneFactor,
  });
}

export const additivePass = (fragment: string, uniforms: Record<string, THREE.IUniform>): THREE.ShaderMaterial => pass(fragment, uniforms, true);
export const plainPass = (fragment: string, uniforms: Record<string, THREE.IUniform>): THREE.ShaderMaterial => pass(fragment, uniforms, false);

export function halfFloatTarget(width: number, height: number, depth = false): THREE.WebGLRenderTarget {
  const target = new THREE.WebGLRenderTarget(width, height, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    generateMipmaps: false,
    depthBuffer: depth,
    stencilBuffer: false,
    colorSpace: THREE.NoColorSpace,
  });
  if (depth) target.depthTexture = new THREE.DepthTexture(width, height);
  return target;
}

export class Post {
  private readonly quad = new FullScreenQuad();
  private readonly down = plainPass(DOWN_FRAGMENT, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uKaris: { value: 0 } });
  private readonly up = additivePass(UP_FRAGMENT, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uRadius: { value: 1 } });
  private readonly final = plainPass(FINAL_FRAGMENT, {
    tAccum: { value: null },
    tBloom: { value: null },
    tDepth: { value: null },
    uSize: { value: new THREE.Vector2() },
    uExposure: { value: 1 },
    uBloom: { value: 0 },
    uVignette: { value: 0 },
    uGrain: { value: 0 },
    uSaturation: { value: 1 },
    uContrast: { value: 1 },
    uTint: { value: new THREE.Vector3(1, 1, 1) },
    uNear: { value: 0.1 },
    uFar: { value: 1000 },
    uSeq: { value: 0 },
    uDiag: { value: 0 },
    uPlain: { value: 0 },
  });
  private readonly diff = plainPass(DIFFERENCE_FRAGMENT, { tA: { value: null }, tB: { value: null } });
  private levels: THREE.WebGLRenderTarget[] = [];
  private width = 0;
  private height = 0;

  constructor(private readonly renderer: THREE.WebGLRenderer) {}

  setSize(width: number, height: number): void {
    for (const t of this.levels) t.dispose();
    this.levels = [];
    this.width = width;
    this.height = height;
    for (let i = 0; i < LEVELS; i++) {
      const s = 2 ** (i + 1);
      this.levels.push(halfFloatTarget(Math.max(1, Math.floor(width / s)), Math.max(1, Math.floor(height / s))));
    }
  }

  private draw(material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null): void {
    this.renderer.setRenderTarget(target);
    this.quad.material = material;
    this.quad.render(this.renderer);
  }

  difference(a: THREE.Texture, b: THREE.Texture): void {
    this.diff.uniforms.tA!.value = a;
    this.diff.uniforms.tB!.value = b;
    this.draw(this.diff, null);
  }

  render(accum: THREE.Texture, depth: THREE.Texture | null, look: Look, seq: number, diag: Diagnostic, near: number, far: number, target: THREE.WebGLRenderTarget | null = null, plain = false): void {
    let src = accum;
    let sw = this.width;
    let sh = this.height;
    for (let i = 0; i < LEVELS; i++) {
      const t = this.levels[i] as THREE.WebGLRenderTarget;
      const u = this.down.uniforms;
      u.tSrc!.value = src;
      (u.uTexel!.value as THREE.Vector2).set(1 / sw, 1 / sh);
      u.uKaris!.value = i === 0 ? 1 : 0;
      this.draw(this.down, t);
      src = t.texture;
      sw = t.width;
      sh = t.height;
    }
    for (let i = LEVELS - 1; i > 0; i--) {
      const from = this.levels[i] as THREE.WebGLRenderTarget;
      const u = this.up.uniforms;
      u.tSrc!.value = from.texture;
      (u.uTexel!.value as THREE.Vector2).set(1 / from.width, 1 / from.height);
      u.uRadius!.value = look.bloomRadius;
      this.draw(this.up, this.levels[i - 1] as THREE.WebGLRenderTarget);
    }
    const f = this.final.uniforms;
    f.tAccum!.value = accum;
    f.tBloom!.value = (this.levels[0] as THREE.WebGLRenderTarget).texture;
    f.tDepth!.value = depth;
    (f.uSize!.value as THREE.Vector2).set(this.width, this.height);
    f.uExposure!.value = look.exposure;
    f.uBloom!.value = look.bloom;
    f.uVignette!.value = look.vignette;
    f.uGrain!.value = look.grain;
    f.uSaturation!.value = look.saturation;
    f.uContrast!.value = look.contrast;
    (f.uTint!.value as THREE.Vector3).set(...look.tint);
    f.uNear!.value = near;
    f.uFar!.value = far;
    f.uSeq!.value = seq;
    f.uDiag!.value = diag === 'invalid' ? 1 : diag === 'depth' ? 2 : diag === 'standins' ? 3 : 0;
    f.uPlain!.value = plain ? 1 : 0;
    this.draw(this.final, target);
  }
}
