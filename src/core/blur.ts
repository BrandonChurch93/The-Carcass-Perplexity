import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { BLUR_SPACING, FINE_GATE, FINE_HANDOVER, FINE_SPACING, SHARP_PX, blurTaps, fineTaps, layerGrain, type Tap } from './focus';
import { halfFloatTarget, plainPass } from './post';

// The blur by depth, laid once over the averaged samples in linear light. The alpha of the picture it is given holds the signed
// circle of confusion in pixels, averaged over the samples. Three things are made and laid over each other:
// the fine blur, two passes at full size, where every pixel is blurred by its own radius and takes nothing from a pixel too sharp to reach it;
// the field, the same at quarter size, for the radii the 49 points of the fine blur cannot fill;
// and the near layer at half size, where what stands in front of the focus is spread past its own outline.
// A reduced layer under the fetch that lays it is already a blur as wide as a disc of its grain (layerGrain), so it gathers only the rest,
// and it is never asked for a radius under its grain: the film's radii are mostly under 15 px, and a layer of 4 px texels shown
// for a radius of 5 px is the reduced picture itself, with its texels and with every outline as crisp as a texel.

const CLEAN = /* glsl */ `
vec3 clean(vec3 c) {
  return mix(clamp(c, 0.0, 60000.0), vec3(0.0), isnan(c));
}`;

// Half size, and again from it to quarter size. The four pixels count by the square of their radius, so a texel on the edge of a sharp thing holds the blurred side only:
// the sharp side is taken from the full-size picture when the layers are laid. The radius kept is the largest of the four.
// The weight stops growing at 8 px: past that a single far out of focus pixel (a spark) would take its whole texel and show as a square.
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
    float w = min(s.a * s.a / 64.0, 1.0) + 0.0001;
    sum += clean(s.rgb) * w;
    total += w;
    if (abs(s.a) > abs(coc)) coc = s.a;
  }
  gl_FragColor = vec4(sum / total, coc);
}`;

// Half size, from the full-size picture: colour times how far the pixel is in front of the focus, and that weight.
// All four pixels are read, so a near thing thinner than a texel is in the layer by its true cover and does not come and go along its length.
const NEAR_FRAGMENT = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uSize;
uniform vec2 uRamp;
${CLEAN}
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy) * 2;
  ivec2 last = ivec2(uSize) - 1;
  vec4 sum = vec4(0.0);
  for (int k = 0; k < 4; k++) {
    vec4 s = texelFetch(tSrc, min(p + ivec2(k & 1, k >> 1), last), 0);
    float w = smoothstep(uRamp.x, uRamp.y, -s.a);
    sum += vec4(clean(s.rgb) * w, w);
  }
  gl_FragColor = sum * 0.25;
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
// The distance is the least between two tiles, corner to corner for diagonal ones.
// The second number says whether anything the near layer holds can reach the tile or one beside it: where it is 0 the near layer is empty and is not fetched.
const REACH_FRAGMENT = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uSize;
uniform float uTile;
uniform float uLow;
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  ivec2 last = ivec2(uSize) - 1;
  float m = 0.0;
  float held = 0.0;
  for (int j = -5; j <= 5; j++) {
    for (int i = -5; i <= 5; i++) {
      ivec2 q = p + ivec2(i, j);
      if (q != clamp(q, ivec2(0), last)) continue;
      float r = texelFetch(tSrc, q, 0).r;
      vec2 d = abs(vec2(i, j));
      if (length(max(d - 1.0, 0.0)) * uTile <= r) m = max(m, r);
      if (r > uLow && length(max(d - 2.0, 0.0)) * uTile <= r) held = 1.0;
    }
  }
  gl_FragColor = vec4(m, held, 0.0, 1.0);
}`;

type Kind = 'fine' | 'field' | 'near';

// One pass of a blur. `texel` is the width of a texel of the layer in pixels, and `grain` the blur the layer already is.
// A pass whose taps would lie closer than `gate` texels is skipped.
// On the fine blur and on the field a tap counts by whether a blur reaches this texel, and the sum is divided by what counted.
// On the near layer it is the plain mean of the taps, which two passes compose exactly, and the radius comes from the tiles.
// The last pass of the field leaves the colour multiplied by how blurred the texel is, with that in the alpha,
// so that the fetch of the full-size pass takes blurred texels only.
// The taps are written out one by one: an array of constants read in a loop costs this renderer several times the fetches themselves.
function gatherFragment(taps: Tap[], spacing: number, kind: Kind, last: boolean, texel: number, grain: number, gate = 0.35): string {
  const lines = taps
    .slice(1)
    .map(([x, y]) => `    tap(vec2(${x.toFixed(6)}, ${y.toFixed(6)}) * radius, ${Math.hypot(x, y).toFixed(6)} * radius);`)
    .join('\n');
  const tap = {
    // The radius that counts between two pixels is that of the nearer one: what is in front spreads by its own blur,
    // and what is behind shows only as far as the blur of the pixel in front of it lets it. A sharp thing gives nothing to the blur behind it.
    fine: `  float w = clamp(reach(min(s.a, centre)) - d + 0.5, 0.0, 1.0) * onset;
  sum.rgb += clean(s.rgb) * w;
  total += w;`,
    // A texel in front of the focus is seen through: what lies behind it counts in full. Any other tap counts only if its own blur reaches here.
    field: `  float w = centre < -${SHARP_PX.toFixed(2)} && s.a > centre ? 1.0 : clamp(reach(s.a) - d + 0.5, 0.0, 1.0);
  sum.rgb += s.rgb * w;
  total += w;`,
    near: `  sum += s;
  total += 1.0;`,
  }[kind];
  // Under a near layer that covers in full neither the fine blur nor the field is seen, so they are not gathered there.
  const radius = {
    fine: `  onset = clamp(abs(c.a) - ${SHARP_PX.toFixed(2)}, 0.0, 1.0);
  float radius = onset > 0.0 ? reach(c.a) : 0.0;
  if (radius * ${spacing.toFixed(6)} >= ${gate.toFixed(2)} && texelFetch(tRadius, ivec2(gl_FragCoord.xy) >> 1, 0).a >= 0.6) radius = 0.0;`,
    field: `  float radius = reach(c.a);
  if (texture2D(tRadius, vUv).a >= 0.5) radius = 0.0;`,
    near: `  float radius = reach(texture2D(tRadius, vUv).r);`,
  }[kind];
  const out = {
    // A pixel that gathers nothing is written as it came, to the last bit: what is in focus stays the pixel it was.
    fine: last ? `  vec4 px = gathered ? vec4(sum.rgb / total, c.a) : c;
${LAY_BODY}` : `  gl_FragColor = gathered ? vec4(sum.rgb / total, c.a) : c;`,
    field: last
      ? `  float m = smoothstep(${FIELD_COUNTS[0].toFixed(1)}, ${FIELD_COUNTS[1].toFixed(1)}, abs(c.a) * uShare);
  gl_FragColor = vec4(sum.rgb / total * m, m);`
      : `  gl_FragColor = vec4(sum.rgb / total, c.a);`,
    near: `  gl_FragColor = sum / total;`,
  }[kind];
  return /* glsl */ `
#define GRAIN2 ${(grain * grain).toFixed(4)}
#define PER_PIXEL ${(1 / texel).toFixed(4)}
uniform sampler2D tSrc;
uniform sampler2D tRadius;
uniform vec2 uTexel;
uniform float uShare;
varying vec2 vUv;
${CLEAN}${kind === 'fine' && last ? LAY_HEAD : ''}
vec4 sum;
float centre;
float onset;
float total;
// The radius left to gather, in texels of this layer, of a circle of confusion given in pixels.
float reach(float coc) {
  float r = coc * uShare;
  return sqrt(max(r * r - GRAIN2, 0.0)) * PER_PIXEL;
}
void tap(vec2 o, float d) {
  vec4 s = textureLod(tSrc, vUv + o * uTexel, 0.0);
${tap}
}
void main() {
  vec4 c = texelFetch(tSrc, ivec2(gl_FragCoord.xy), 0);
${radius}
  sum = c;
  total = 1.0;
  centre = c.a;
  bool gathered = radius * ${spacing.toFixed(6)} >= ${gate.toFixed(2)};
  if (gathered) {
${kind === 'fine' ? '    sum.rgb = clean(c.rgb);\n' : ''}${lines}
  }
${out}
}`;
}

// What stands in front of the focus enters the near layer between these radii in pixels. Under them the fine blur draws it, by its own radius.
const NEAR_RAMP: [number, number] = [2, 6];
const TILE = 16;
/** A texel of the field counts in the fetch that lays it by how blurred it is, between these radii in pixels: all that is well blurred counts alike. */
const FIELD_COUNTS: [number, number] = [2, 5];
const QUARTER = { texel: 4, grain: layerGrain(4) };
const HALF = { texel: 2, grain: layerGrain(2) };
const FULL = { texel: 1, grain: 0 };

// The laying, done by the last pass of the fine blur on what it has just gathered: the field over it, by how far this pixel's own radius is past
// what the fine blur can fill, whatever lies around it; over both the near layer (`tRadius` in that pass) by twice its cover:
// a near thing hides what is behind it up to its outline, so its soft edge is laid outside the outline.
// A reduced layer is fetched as a quadratic spline over 3 by 3 texels, in four filtered fetches. One filtered fetch has a crease at every texel,
// and where neighbours differ the creases show as a lattice at the pitch of the layer.
// The laying is not a pass of its own: a full-size pass costs a fetch and a write of every pixel before it gathers anything.
const LAY_HEAD = /* glsl */ `
uniform sampler2D tField;
uniform sampler2D tReach;
uniform vec2 uFieldSize;
uniform vec2 uNearSize;
vec4 spline(sampler2D t, vec2 size) {
  vec2 x = vUv * size - 0.5;
  vec2 i = floor(x + 0.5);
  vec2 f = x - i;
  vec2 lo = 0.5 * (0.5 - f) * (0.5 - f);
  vec2 mid = 0.375 - 0.5 * f * f;
  vec2 hi = 0.5 * (0.5 + f) * (0.5 + f);
  vec2 ga = lo + mid;
  vec2 gb = mid + hi;
  vec2 a = (i - 0.5 + mid / ga) / size;
  vec2 b = (i + 0.5 + hi / gb) / size;
  return textureLod(t, a, 0.0) * (ga.x * ga.y) + textureLod(t, vec2(b.x, a.y), 0.0) * (gb.x * ga.y)
    + textureLod(t, vec2(a.x, b.y), 0.0) * (ga.x * gb.y) + textureLod(t, b, 0.0) * (gb.x * gb.y);
}`;
// `px` is the pixel of the fine blur. Where the near layer covers in full the field is not fetched.
const LAY_BODY = /* glsl */ `
  vec3 laid = px.rgb;
  float cover = 0.0;
  vec4 nr = vec4(0.0);
  if (texelFetch(tReach, ivec2(gl_FragCoord.xy) / ${TILE}, 0).g > 0.0) {
    nr = spline(tRadius, uNearSize);
    cover = clamp(2.0 * nr.a, 0.0, 1.0);
  }
  if (cover < 1.0) {
    float part = smoothstep(${FINE_HANDOVER[0].toFixed(1)}, ${FINE_HANDOVER[1].toFixed(1)}, abs(px.a) * uShare);
    if (part > 0.0) {
      vec4 fd = spline(tField, uFieldSize);
      laid = mix(laid, fd.rgb / max(fd.a, 1.0e-6), part);
    }
    if (cover > 0.0) laid = mix(laid, nr.rgb / max(nr.a, 0.0001), cover);
  } else {
    laid = nr.rgb / nr.a;
  }
  gl_FragColor = vec4(laid, 1.0);`;

export class FocusBlur {
  private readonly quad = new FullScreenQuad();
  private readonly field = plainPass(FIELD_FRAGMENT, { tSrc: { value: null }, uSize: { value: new THREE.Vector2() } });
  private readonly near = plainPass(NEAR_FRAGMENT, { tSrc: { value: null }, uSize: { value: new THREE.Vector2() }, uRamp: { value: new THREE.Vector2() } });
  private readonly tile = plainPass(TILE_FRAGMENT, { tSrc: { value: null }, uSize: { value: new THREE.Vector2() } });
  private readonly reach = plainPass(REACH_FRAGMENT, { tSrc: { value: null }, uSize: { value: new THREE.Vector2() }, uTile: { value: TILE }, uLow: { value: NEAR_RAMP[0] } });
  private readonly finePasses: THREE.ShaderMaterial[];
  private readonly fieldPasses: THREE.ShaderMaterial[];
  private readonly nearPasses: THREE.ShaderMaterial[];
  private targets: THREE.WebGLRenderTarget[] = [];
  private width = 0;
  private height = 0;

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    const make = (taps: Tap[], spacing: number, kind: Kind, last: boolean, layer: { texel: number; grain: number }, gate = 0.35): THREE.ShaderMaterial =>
      plainPass(gatherFragment(taps, spacing, kind, last, layer.texel, layer.grain, gate), {
        tSrc: { value: null },
        tRadius: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uShare: { value: 1 },
        ...(kind === 'fine' && last
          ? { tField: { value: null }, tReach: { value: null }, uFieldSize: { value: new THREE.Vector2() }, uNearSize: { value: new THREE.Vector2() } }
          : {}),
      });
    const taps = blurTaps();
    const fine = fineTaps();
    this.finePasses = [0, 1].map((i) => make(fine[i] as Tap[], FINE_SPACING[i] as number, 'fine', i === 1, FULL, FINE_GATE[i]));
    this.fieldPasses = [0, 1, 2].map((i) => make(taps[i] as Tap[], BLUR_SPACING[i] as number, 'field', i === 2, QUARTER));
    this.nearPasses = [0, 1, 2].map((i) => make(taps[i] as Tap[], BLUR_SPACING[i] as number, 'near', i === 2, HALF));
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
      this.targets = [
        halfFloatTarget(hw, hh),
        halfFloatTarget(qw, qh),
        halfFloatTarget(qw, qh),
        halfFloatTarget(hw, hh),
        halfFloatTarget(hw, hh),
        halfFloatTarget(tw, th),
        halfFloatTarget(tw, th),
        halfFloatTarget(this.width, this.height),
        halfFloatTarget(this.width, this.height),
      ];
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
    type T = THREE.WebGLRenderTarget;
    const [half, fa, fb, na, nb, ta, tb, out, other] = this.ensure() as [T, T, T, T, T, T, T, T, T];

    const shrink = (src: THREE.Texture, width: number, height: number, to: T): void => {
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

    // Each pass reads what the pass before it wrote. The first reads `first`, which is not written, so the picture itself can be the first.
    const run = (passes: THREE.ShaderMaterial[], first: THREE.Texture, a: T, b: T, radius: THREE.Texture): T => {
      let from = first;
      let to = a;
      for (const m of passes) {
        const u = m.uniforms;
        u.tSrc!.value = from;
        u.tRadius!.value = radius;
        (u.uTexel!.value as THREE.Vector2).set(1 / to.width, 1 / to.height);
        u.uShare!.value = share;
        this.draw(m, to);
        from = to.texture;
        to = to === a ? b : a;
      }
      return to === a ? b : a;
    };
    const nearOut = run(this.nearPasses, na.texture, nb, na, tb.texture);
    const fieldOut = run(this.fieldPasses, fa.texture, fb, fa, nearOut.texture);
    const u = (this.finePasses[1] as THREE.ShaderMaterial).uniforms;
    u.tField!.value = fieldOut.texture;
    u.tReach!.value = tb.texture;
    (u.uFieldSize!.value as THREE.Vector2).set(fieldOut.width, fieldOut.height);
    (u.uNearSize!.value as THREE.Vector2).set(nearOut.width, nearOut.height);
    return run(this.finePasses, accum, out, other, nearOut.texture).texture;
  }
}
