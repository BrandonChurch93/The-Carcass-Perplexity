import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { BLUR_SPACING, SHARP_PX, blurTaps, maxCoc, type Tap } from './focus';
import { halfFloatTarget, plainPass } from './post';

// The blur by depth, laid once over the averaged samples in linear light. The alpha of the picture it is given holds the signed
// circle of confusion in pixels, averaged over the samples. Two layers are made at quarter size and laid over the full-size picture:
// the field, where every texel is blurred by its own radius and takes nothing from a texel too sharp to reach it;
// and the near layer, where what stands in front of the focus is spread past its own outline.
// Quarter size is what the cost allows: a fetch at half size costs four times as much, and the fetches are the cost.
// A quarter-size texel under the filtered fetch of the last pass is already a blur about as wide as a disc of GRAIN pixels,
// so a radius under GRAIN is drawn as a mix of the sharp picture and the layer, and a radius over it gathers only the rest.

const CLEAN = /* glsl */ `
vec3 clean(vec3 c) {
  return mix(clamp(c, 0.0, 60000.0), vec3(0.0), isnan(c));
}`;

// Half size, and again from it to quarter size. The four pixels count by the square of their radius, so a texel on the edge of a sharp thing holds the blurred side only:
// the sharp side is taken from the full-size picture when the layers are laid. The radius kept is the largest of the four.
const FIELD_FRAGMENT = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uSize;
${CLEAN}
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy) * 2;
  ivec2 last = ivec2(uSize) - 1;
  vec3 sum = vec3(0.0);
  float total = 0.0;
  float coc = 0.0;
  for (int k = 0; k < 4; k++) {
    vec4 s = texelFetch(tSrc, min(p + ivec2(k & 1, k >> 1), last), 0);
    float w = s.a * s.a + 0.0001;
    sum += clean(s.rgb) * w;
    total += w;
    if (abs(s.a) > abs(coc)) coc = s.a;
  }
  gl_FragColor = vec4(sum / total, coc);
}`;

// Quarter size, from the full-size picture: colour times how far the pixel is in front of the focus, and that weight.
// All sixteen pixels are read, so a near thing thinner than a texel is in the layer by its true cover and does not come and go along its length.
const NEAR_FRAGMENT = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uSize;
uniform vec2 uRamp;
${CLEAN}
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy) * 4;
  ivec2 last = ivec2(uSize) - 1;
  vec4 sum = vec4(0.0);
  for (int k = 0; k < 16; k++) {
    vec4 s = texelFetch(tSrc, min(p + ivec2(k & 3, k >> 2), last), 0);
    float w = smoothstep(uRamp.x, uRamp.y, -s.a);
    sum += vec4(clean(s.rgb) * w, w);
  }
  gl_FragColor = sum * 0.0625;
}`;

// A sixteenth of the frame: the largest radius in front of the focus inside each tile of 8 by 8 field texels.
const TILE_FRAGMENT = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uSize;
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy) * 8;
  ivec2 last = ivec2(uSize) - 1;
  float m = 0.0;
  for (int j = 0; j < 8; j++) {
    for (int i = 0; i < 8; i++) m = max(m, -texelFetch(tSrc, min(p + ivec2(i, j), last), 0).a);
  }
  gl_FragColor = vec4(m, 0.0, 0.0, 1.0);
}`;

// Each tile takes the largest radius of the tiles whose blur can reach it, so a pixel beside a near thing gathers as widely as that thing spreads.
const REACH_FRAGMENT = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uSize;
uniform float uTile;
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  ivec2 last = ivec2(uSize) - 1;
  float m = 0.0;
  for (int j = -4; j <= 4; j++) {
    for (int i = -4; i <= 4; i++) {
      float r = texelFetch(tSrc, clamp(p + ivec2(i, j), ivec2(0), last), 0).r;
      if ((length(vec2(i, j)) - 1.0) * uTile <= r) m = max(m, r);
    }
  }
  gl_FragColor = vec4(m, 0.0, 0.0, 1.0);
}`;

// One pass of the blur. On the field a tap counts by whether its own radius reaches this texel, and the sum is divided by what counted.
// On the near layer it is the plain mean of the taps, and the radius comes from the tiles.
// The last pass of the field leaves the colour multiplied by the square of the radius as a part of the largest, with that square in the alpha,
// so that one filtered fetch of the full-size pass takes blurred texels only.
// The taps are written out one by one: an array of constants read in a loop costs this renderer several times the fetches themselves.
function gatherFragment(taps: Tap[], spacing: number, field: boolean, last: boolean): string {
  const lines = taps
    .slice(1)
    .map(([x, y]) => `    tap(vec2(${x.toFixed(6)}, ${y.toFixed(6)}) * radius, ${Math.hypot(x, y).toFixed(6)} * radius);`)
    .join('\n');
  return /* glsl */ `
#define GRAIN2 ${(GRAIN * GRAIN).toFixed(1)}
uniform sampler2D tSrc;
uniform sampler2D tRadius;
uniform vec2 uTexel;
uniform float uShare;
uniform float uMax;
varying vec2 vUv;
vec4 sum;
float centre;
// The radius left to gather, in quarter-size texels, of a circle of confusion given in pixels.
float reach(float coc) {
  float r = coc * uShare;
  return sqrt(max(r * r - GRAIN2, 0.0)) * 0.25;
}
float total;
void tap(vec2 o, float d) {
  vec4 s = textureLod(tSrc, vUv + o * uTexel, 0.0);
${field ? `  // A texel in front of the focus is seen through: what lies behind it counts in full. Any other tap counts only if its own blur reaches here.
  float w = centre < -${SHARP_PX.toFixed(2)} && s.a > centre ? 1.0 : clamp(reach(s.a) - d + 0.5, 0.0, 1.0);
  sum.rgb += s.rgb * w;
  total += w;` : `  sum += s;
  total += 1.0;`}
}
void main() {
  vec4 c = texelFetch(tSrc, ivec2(gl_FragCoord.xy), 0);
  float radius = reach(${field ? 'c.a' : 'texture2D(tRadius, vUv).r'});
  sum = c;
  total = 1.0;
  centre = c.a;
  if (radius * ${spacing.toFixed(6)} >= 0.35) {
${lines}
  }
${field ? (last ? `  float m = min(abs(c.a) / uMax, 1.0);
  m *= m;
  gl_FragColor = vec4(sum.rgb / total * m, m);` : `  gl_FragColor = vec4(sum.rgb / total, c.a);`) : `  gl_FragColor = sum / total;`}
}`;
}

// Full size. The sharp picture, the field over it by how blurred this pixel is, the near layer over both by twice its cover:
// a near thing hides what is behind it up to its outline, so its soft edge is laid outside the outline.
const NEAR_RAMP: [number, number] = [2, 6];
const TILE = 16;
/** The radius in pixels of the disc that a quarter-size texel, fetched with a filter, already is. */
const GRAIN = 4;

const LAY_FRAGMENT = /* glsl */ `
uniform sampler2D tSrc;
uniform sampler2D tField;
uniform sampler2D tNear;
uniform float uMax;
uniform float uShare;
varying vec2 vUv;
void main() {
  vec4 s = texelFetch(tSrc, ivec2(gl_FragCoord.xy), 0);
  vec4 f = texture2D(tField, vUv);
  vec4 n = texture2D(tNear, vUv);
  // How blurred this pixel is against the blurred texels around it, squared: a sharp pixel beside a blurred background takes next to nothing of it and keeps its edge.
  float own = abs(s.a);
  float around = sqrt(f.a) * uMax;
  float r = own * uShare;
  float like = clamp(own / max(around, 0.001), 0.0, 1.0);
  float part = like * like * clamp(r * r / ${(GRAIN * GRAIN).toFixed(1)}, 0.0, 1.0);
  if (own < ${SHARP_PX.toFixed(2)} || around < 0.1) part = 0.0;
  vec3 c = s.rgb;
  if (part > 0.0) c = mix(c, f.rgb / max(f.a, 1.0e-7), part);
  float cover = clamp(2.0 * n.a, 0.0, 1.0);
  if (cover > 0.0) c = mix(c, n.rgb / max(n.a, 0.0001), cover);
  gl_FragColor = vec4(c, 1.0);
}`;

export class FocusBlur {
  private readonly quad = new FullScreenQuad();
  private readonly field = plainPass(FIELD_FRAGMENT, { tSrc: { value: null }, uSize: { value: new THREE.Vector2() } });
  private readonly near = plainPass(NEAR_FRAGMENT, { tSrc: { value: null }, uSize: { value: new THREE.Vector2() }, uRamp: { value: new THREE.Vector2() } });
  private readonly tile = plainPass(TILE_FRAGMENT, { tSrc: { value: null }, uSize: { value: new THREE.Vector2() } });
  private readonly reach = plainPass(REACH_FRAGMENT, { tSrc: { value: null }, uSize: { value: new THREE.Vector2() }, uTile: { value: TILE } });
  private readonly lay = plainPass(LAY_FRAGMENT, { tSrc: { value: null }, tField: { value: null }, tNear: { value: null }, uMax: { value: 1 }, uShare: { value: 1 } });
  private readonly fieldPasses: THREE.ShaderMaterial[];
  private readonly nearPasses: THREE.ShaderMaterial[];
  private targets: THREE.WebGLRenderTarget[] = [];
  private width = 0;
  private height = 0;

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    const taps = blurTaps();
    const make = (i: number, field: boolean): THREE.ShaderMaterial =>
      plainPass(gatherFragment(taps[i] as Tap[], BLUR_SPACING[i] as number, field, i === 2), {
        tSrc: { value: null },
        tRadius: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uShare: { value: 1 },
        uMax: { value: 1 },
      });
    this.fieldPasses = [0, 1, 2].map((i) => make(i, true));
    this.nearPasses = [0, 1, 2].map((i) => make(i, false));
  }

  setSize(width: number, height: number): void {
    this.dispose();
    this.width = width;
    this.height = height;
  }

  dispose(): void {
    for (const t of this.targets) t.dispose();
    this.targets = [];
  }

  // The targets are made at the first blurred frame: a film with no lens open never pays for them.
  private ensure(): THREE.WebGLRenderTarget[] {
    if (this.targets.length === 0) {
      const hw = Math.ceil(this.width / 2);
      const hh = Math.ceil(this.height / 2);
      const qw = Math.ceil(hw / 2);
      const qh = Math.ceil(hh / 2);
      const tw = Math.ceil(hw / 8);
      const th = Math.ceil(hh / 8);
      this.targets = [halfFloatTarget(hw, hh), halfFloatTarget(qw, qh), halfFloatTarget(qw, qh), halfFloatTarget(qw, qh), halfFloatTarget(qw, qh), halfFloatTarget(tw, th), halfFloatTarget(tw, th), halfFloatTarget(this.width, this.height)];
    }
    return this.targets;
  }

  private draw(material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget): void {
    this.renderer.setRenderTarget(target);
    this.quad.material = material;
    this.quad.render(this.renderer);
  }

  /** `share` is the part of each circle of confusion left to this blur by the lens points of the frame. Returns the blurred picture. */
  render(accum: THREE.Texture, share: number): THREE.Texture {
    const [half, fa, fb, na, nb, ta, tb, out] = this.ensure() as [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget, THREE.WebGLRenderTarget, THREE.WebGLRenderTarget, THREE.WebGLRenderTarget, THREE.WebGLRenderTarget, THREE.WebGLRenderTarget, THREE.WebGLRenderTarget];
    const most = maxCoc(this.height);

    const shrink = (src: THREE.Texture, width: number, height: number, to: THREE.WebGLRenderTarget): void => {
      this.field.uniforms.tSrc!.value = src;
      (this.field.uniforms.uSize!.value as THREE.Vector2).set(width, height);
      this.draw(this.field, to);
    };
    shrink(accum, this.width, this.height, half);
    shrink(half.texture, half.width, half.height, fa);

    this.near.uniforms.tSrc!.value = accum;
    (this.near.uniforms.uSize!.value as THREE.Vector2).set(this.width, this.height);
    (this.near.uniforms.uRamp!.value as THREE.Vector2).set(...NEAR_RAMP);
    this.draw(this.near, na);
    this.tile.uniforms.tSrc!.value = half.texture;
    (this.tile.uniforms.uSize!.value as THREE.Vector2).set(half.width, half.height);
    this.draw(this.tile, ta);
    this.reach.uniforms.tSrc!.value = ta.texture;
    (this.reach.uniforms.uSize!.value as THREE.Vector2).set(ta.width, ta.height);
    this.draw(this.reach, tb);

    const run = (passes: THREE.ShaderMaterial[], a: THREE.WebGLRenderTarget, b: THREE.WebGLRenderTarget): THREE.WebGLRenderTarget => {
      let from = a;
      let to = b;
      for (const m of passes) {
        const u = m.uniforms;
        u.tSrc!.value = from.texture;
        u.tRadius!.value = tb.texture;
        (u.uTexel!.value as THREE.Vector2).set(1 / from.width, 1 / from.height);
        u.uShare!.value = share;
        u.uMax!.value = most;
        this.draw(m, to);
        [from, to] = [to, from];
      }
      return from;
    };
    const fieldOut = run(this.fieldPasses, fa, fb);
    const nearOut = run(this.nearPasses, na, nb);

    const u = this.lay.uniforms;
    u.tSrc!.value = accum;
    u.tField!.value = fieldOut.texture;
    u.tNear!.value = nearOut.texture;
    u.uMax!.value = most;
    u.uShare!.value = share;
    this.draw(this.lay, out);
    return out.texture;
  }
}
