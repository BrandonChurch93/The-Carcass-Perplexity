// The paint of the ground: salt in polygon plates, wet films, the white rim and the red stain along every shore, grey mud where the crust is
// thin, pale bedded rock where the land stands up, and the far channels of brine.
import { BRINE_GLSL } from '../shared/brine-glsl';
import { RIG_GLSL } from '../shared/glsl';

export const LAND_VERTEX = /* glsl */ `
attribute vec2 aPaint;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vPaint;
void main() {
  vWorld = position;
  vNormal = normal;
  vPaint = aPaint;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}`;

export const FIELD_GLSL = /* glsl */ `
uniform sampler2D tFieldNear;
uniform sampler2D tFieldFar;
// r metres to the shore (negative in brine), g how thin the crust is, b how stained the ground is.
vec3 fieldAt(vec2 xz) {
  vec2 a = abs(xz);
  float m = max(a.x, a.y);
  if (m < 236.0) return texture2D(tFieldNear, xz / 512.0 + 0.5).rgb;
  vec3 far = vec3(6.0, 0.0, 0.3);
  if (m < 2040.0) far = mix(texture2D(tFieldFar, xz / 4096.0 + 0.5).rgb, far, smoothstep(1900.0, 2040.0, m));
  if (m < 254.0) return mix(texture2D(tFieldNear, xz / 512.0 + 0.5).rgb, far, smoothstep(236.0, 254.0, m));
  return far;
}`;

export const LAND_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vPaint;
uniform sampler2D tPlates;
uniform sampler2D tGrain;
${RIG_GLSL}
${FIELD_GLSL}
${BRINE_GLSL}

void main() {
  vec3 p = vWorld;
  vec3 toEye = cameraPosition - p;
  float dist = length(toEye);
  vec3 v = toEye / dist;
  vec3 ng = normalize(vNormal);
  vec3 f = fieldAt(p.xz);
  // One grain read at five sizes: half a kilometre, a hundred metres, a dozen, two, and a hand's breadth close to the lens.
  vec4 vast = texture2D(tGrain, p.xz / 611.0 + 0.71);
  vec4 wide = texture2D(tGrain, p.xz / 97.0 + 0.11);
  vec4 mid = texture2D(tGrain, (p.xz + (wide.ba - 0.5) * 7.0) / 13.0 + 0.37);
  // Past a few hundred metres the two-metre grain is one flat grey to a pixel: it is not read.
  vec4 fine = vec4(0.5);
  if (dist < 420.0) fine = texture2D(tGrain, p.xz / 1.9);
  float close = smoothstep(45.0, 12.0, dist);
  vec4 tiny = vec4(0.5);
  if (close > 0.0) tiny = mix(tiny, texture2D(tGrain, p.xz / 0.41 + 0.6), close);
  float s = f.r + (fine.r - 0.5) * 0.1;
  float thin = f.g;
  float stain = f.b;
  float rock = smoothstep(0.28, 0.75, p.y);

  // How far the brine's damp reaches is not a clean distance: it wanders by metres.
  float t = max(s, 0.0) + (mid.r - 0.5) * 2.6 * smoothstep(0.0, 2.0, s) + (wide.r - 0.5) * 5.0 * smoothstep(1.0, 6.0, s);
  float halo = exp(-max(t, 0.0) / 2.2);
  float lump = mix(fine.r, tiny.r, 0.35);
  float high = smoothstep(0.48, 0.68, lump);

  // Wet ground and dry: wet near every shore and in the low places, dry and white on the lumps that stand out of it.
  float low = wide.g * 0.6 + mid.g * 0.25 + 0.3 * stain + 0.5 * (vast.r - 0.5);
  float wet = clamp(max(halo * 1.15, smoothstep(0.38, 0.6, low)), 0.0, 1.0);
  float film = wet * smoothstep(0.55, 0.4, lump);
  vec3 dry = mix(vec3(0.15, 0.118, 0.108), vec3(0.27, 0.218, 0.2), high * (0.25 + 0.5 * vast.r));
  dry = mix(dry, vec3(0.175, 0.094, 0.082), (0.35 + 0.5 * stain) * (1.0 - high));
  float bloom = smoothstep(0.35, 0.7, stain * 0.5 + mid.r * 0.6 + halo * 0.35 - 0.1);
  vec3 damp = mix(vec3(0.175, 0.11, 0.1), vec3(0.16, 0.045, 0.036), bloom);
  damp = mix(damp, vec3(0.26, 0.12, 0.065), smoothstep(0.55, 0.8, wide.g * 0.5 + fine.g * 0.5) * 0.45);
  vec3 colour = mix(dry, damp, wet * (1.0 - 0.6 * high * (1.0 - halo)));
  float rough = mix(1.0, 0.5, film);
  colour *= 1.0 - 0.25 * film;

  // Sheets of brine a finger deep lie on the crust beside every channel and pool, braided round the lumps that stand out of them. Their
  // edges are feathered, and seen low they give back the sky.
  float lie = mid.g * 0.55 + fine.r * 0.3 + wide.r * 0.15 + (tiny.r - 0.5) * 0.12;
  float brim = 0.43 + 0.55 * exp(-max(t, 0.0) / 3.2) + 0.1 * (vast.g - 0.5) + 0.2 * smoothstep(0.45, 0.7, low);
  float sheet = smoothstep(brim, brim - 0.07, lie) * smoothstep(0.02, 0.2, s);
  colour = mix(colour, mix(vec3(0.15, 0.072, 0.064), vec3(0.1, 0.03, 0.026), smoothstep(brim - 0.07, brim - 0.2, lie)), sheet * 0.88);
  rough = mix(rough, 0.3, sheet);

  // Red growth in bands that follow the shore, and the thin white lips the brine left each time it stood higher.
  float band = smoothstep(0.35, 0.85, sin(t * 1.9 + mid.r * 5.0 + wide.r * 9.0)) * smoothstep(0.6, 1.4, t) * exp(-t / 7.0);
  colour = mix(colour, vec3(0.19, 0.045, 0.04), band * 0.7 * (1.0 - 0.5 * high));
  float tr = abs(fract(t * 1.3 + fine.r * 1.4) - 0.5) * 2.0;
  float lip = smoothstep(0.72, 0.95, tr) * smoothstep(4.5, 1.5, t) * smoothstep(0.5, 0.9, s) * smoothstep(0.35, 0.55, tiny.r * 0.5 + fine.g * 0.5);
  colour = mix(colour, vec3(0.33, 0.29, 0.272), lip * 0.75);

  // The shore itself: wet red ground at the brine, then the white frill of salt.
  float s2 = s + (fine.g - 0.5) * 0.3 + (tiny.r - 0.5) * 0.14;
  // The soak is a hand wide in one place and two strides in the next; the frill stands only where the bank is firm.
  float soak = 0.25 + 2.4 * smoothstep(0.4, 0.75, mid.r * 0.7 + fine.g * 0.3);
  float wetBand = smoothstep(soak, 0.03, s + (fine.r - 0.5) * 0.5 * smoothstep(0.2, 1.0, s));
  float frill = smoothstep(0.08, 0.24, s2) * smoothstep(0.8, 0.3, s2) * smoothstep(0.42, 0.6, wide.g * 0.5 + mid.g * 0.5) * (1.0 - wetBand);
  vec3 crystal = mix(vec3(0.35, 0.315, 0.298), vec3(0.24, 0.13, 0.11), clamp(vPaint.y * 0.9 + vPaint.x * 0.6 + smoothstep(0.6, 0.3, tiny.r) * 0.6, 0.0, 1.0));
  colour = mix(colour, crystal * (0.75 + 0.5 * lump), frill * 0.9);
  // The soaked ground is not one skin: grains of salt stand out of it, more of them the further from the brine.
  vec3 soaked = vec3(0.125, 0.038, 0.032) * (0.6 + 0.8 * fine.r);
  float grains = smoothstep(0.5, 0.66, tiny.r * 0.6 + fine.g * 0.4) * smoothstep(0.05, 0.7, s);
  soaked = mix(soaked, crystal * 0.85, grains);
  colour = mix(colour, soaked, wetBand);
  rough = mix(rough, 1.0, max(frill, lip));
  rough = mix(rough, mix(0.5, 1.0, grains), wetBand);

  // Dry pans far from any brine crack into polygons: far off, small in the frame, and faint.
  float pan = smoothstep(5.0, 10.0, t) * smoothstep(0.52, 0.66, vast.r * 0.6 + wide.r * 0.4) * (1.0 - wet) * smoothstep(70.0, 150.0, dist) * smoothstep(700.0, 350.0, dist);
  vec4 small = vec4(0.0, 0.5, 0.5, 0.5);
  if (pan > 0.0) small = texture2D(tPlates, p.xz / 23.0);
  colour = mix(colour, vec3(0.4, 0.385, 0.37), small.r * pan * 0.22);
  vec2 bend = (fine.ba - 0.5) * 1.3 * smoothstep(70.0, 10.0, dist) + (tiny.ba - 0.5) * 0.9 * close + (mid.ba - 0.5) * 0.5;
  bend *= (1.0 - 0.9 * film) * (1.0 - 0.8 * wetBand) * (1.0 - 0.95 * sheet);
  bend += (small.ba - 0.5) * 0.5 * pan;
  float occ = (1.0 - 0.3 * smoothstep(0.5, 0.25, lump) * (1.0 - film)) * (1.0 - 0.55 * vPaint.x) * (1.0 - 0.35 * vPaint.y);

  // Thin crust over mud: grey mud, wet, with what is left of the crust lying on it as small slabs, red under their broken edges, and brine
  // standing where the mud is lowest. The fine patch round the stuck one carries its slabs in its mesh (vPaint: metres inside a slab's edge,
  // and the slab's own shade); the far patches are painted from the plates.
  if (thin > 0.0) {
#ifdef CRUST
    float edge = vPaint.x + (tiny.r - 0.5) * 0.03 + (fine.g - 0.5) * 0.012;
    float kept = smoothstep(0.004, 0.018, edge);
    float shade = vPaint.y;
    float under = smoothstep(0.03, 0.008, edge);
#else
    vec4 far = texture2D(tPlates, p.xz / 3.7);
    float cluster = mid.r * 0.6 + wide.g * 0.4;
    float edge = 0.5 - (far.r + (tiny.r - 0.5) * 0.5 + (fine.g - 0.5) * 0.3);
    float kept = smoothstep(0.42, 0.5, fract(far.g * 7.31) * 0.6 + cluster * 0.55) * smoothstep(0.0, 0.14, edge);
    float shade = fract(far.g * 3.7);
    float under = smoothstep(0.3, 0.05, edge);
#endif
    // A slab is old crust: grey-pink, mottled, stained where the damp has come through it.
    vec3 top = mix(vec3(0.115, 0.088, 0.078), vec3(0.215, 0.178, 0.162), shade * 0.6 + lump * 0.4) * (0.75 + 0.5 * tiny.r);
    top = mix(top, vec3(0.15, 0.06, 0.05), smoothstep(0.45, 0.7, mid.r * 0.5 + fine.g * 0.5) * 0.6);
    top = mix(top, vec3(0.11, 0.06, 0.05), under * 0.7);
    vec3 mud = mix(vec3(0.06, 0.047, 0.04), vec3(0.125, 0.1, 0.085), fine.r * 0.5 + tiny.r * 0.5);
    float pooled = smoothstep(0.54, 0.62, mid.g * 0.45 + fine.r * 0.25 + wide.r * 0.3);
    mud = mix(mud, vec3(0.085, 0.02, 0.017), pooled * 0.9);
    // Far enough off, the gaps between slabs close to the eye.
    kept = max(kept, smoothstep(14.0, 32.0, dist) * 0.8);
    vec3 c = mix(mud, top, kept);
    float k = smoothstep(0.0, 0.5, thin) * (1.0 - wetBand * (1.0 - thin));
    colour = mix(colour, c, k);
    rough = mix(rough, mix(mix(1.0, 0.7, pooled), 1.0, kept), k);
    bend = mix(bend, mix(((fine.ba - 0.5) * 0.6 + (tiny.ba - 0.5) * 0.8) * (1.0 - pooled), (tiny.ba - 0.5) * 0.9 + (fine.ba - 0.5) * 0.6, kept), k);
    // The mud right under a slab's lip sees little sky.
    occ = mix(occ, mix(1.0 - 0.5 * smoothstep(-0.03, 0.004, edge), 1.0, kept), k);
  }

  // Rock: grey-brown stone in thin beds, broken into blocks; dark joints, a wet red wash in the cracks and at the foot where the brine has
  // wicked up, rust where water runs down the faces, and a crust of salt on what looks at the sky. Far off, the same without the small things.
  if (rock > 0.0) {
    float seen = smoothstep(110.0, 35.0, dist);
    float beds = p.y + (mid.r - 0.5) * 0.6;
    // A picture laid down from above smears on a wall: on a steep face the grain is read along the face, drawn out along the beds.
    float steep = smoothstep(0.92, 0.55, ng.y);
    vec2 q = vec2(p.x * 0.62 + p.z * 0.79, p.y * 2.6);
    vec4 rf = mix(fine, texture2D(tGrain, q / 1.3), steep);
    vec4 rt = tiny;
    if (close > 0.0) rt = mix(tiny, texture2D(tGrain, q / 0.37 + 0.3), steep * close);
    float tone = mix(mid.g, mid.g * 0.35 + rf.g * 0.4 + rt.r * 0.25, seen);
    vec3 stone = mix(vec3(0.105, 0.078, 0.063), vec3(0.215, 0.168, 0.136), smoothstep(0.25, 0.75, tone));
    float joint = smoothstep(0.6, 0.95, abs(fract(beds / 0.34 + (rf.r - 0.5) * 0.9) - 0.5) * 2.0) * seen * smoothstep(0.4, 0.6, mid.g);
    stone *= 1.0 - 0.35 * joint * steep;
    // Cracks, painted: thin, dark, wet and red.
    vec4 block = vec4(0.0, 0.5, 0.5, 0.5);
    if (seen > 0.0) block = texture2D(tPlates, p.xz / 6.3 + (fine.ba - 0.5) * 0.03 + (mid.ba - 0.5) * 0.1);
    float painted = smoothstep(0.55, 0.9, block.r) * seen * smoothstep(0.35, 0.55, rf.r);
    float crack = max(painted, max(vPaint.x, vPaint.y * 0.8));
    stone = mix(stone, vec3(0.3, 0.115, 0.06), smoothstep(0.5, 0.72, wide.g * 0.4 + mid.r * 0.6) * 0.5);
    float foot = smoothstep(1.5, 0.35, p.y + (mid.r - 0.5) * 0.9);
    stone = mix(stone, vec3(0.17, 0.045, 0.036), clamp(foot * 0.7 + crack * 0.75 * (0.4 + 0.6 * mid.g), 0.0, 0.9));
    // Pitted like any salt-eaten stone: the pits are dark because the sky does not reach into them.
    float pits = mix(1.0, 0.45 + 0.75 * smoothstep(0.25, 0.6, rt.r), close) * (0.72 + 0.56 * rf.r);
    stone *= pits;
    float crusted = smoothstep(0.8, 0.96, ng.y) * smoothstep(0.4, 0.75, mid.g * 0.3 + rf.r * 0.3 + rt.g * 0.4) * (1.0 - crack) * smoothstep(0.35, 0.55, mix(0.5, rt.r, close));
    stone = mix(stone, vec3(0.36, 0.33, 0.31) * (0.8 + 0.4 * lump), crusted * 0.8);
    colour = mix(colour, stone, rock);
    rough = mix(rough, mix(0.95, 0.35, crack * (1.0 - crusted)), rock);
    float pit = (1.0 - 0.2 * joint * steep) * (1.0 - 0.8 * vPaint.x) * (1.0 - 0.75 * vPaint.y) * (1.0 - 0.5 * painted);
    occ = mix(occ, pit, rock);
    bend = mix(bend, (rf.ba - 0.5) * 1.6 + (rt.ba - 0.5) * 1.8 * close, rock);
  }

  // An overcast is not the same all round: the quarter away from the rain is the brighter, and every lump and lip shows it.
  vec2 bright = vec2(-0.86, 0.5);
  colour *= 1.0 + clamp(mix(0.22, 0.45, rock) * dot(bend, bright) + 0.5 * dot(ng.xz, bright), -0.45, 0.35);

  vec3 n = normalize(ng + vec3(bend.x, 0.0, bend.y));
  vec3 lit = rigShade(p, n, v, colour, rough, occ);

  // The brine, where this ground is under it: the far channels are drawn here, the near ones are covered by the brine's own surface.
  float w = max(fwidth(f.r) * 0.75, 0.015);
  // Where the crust is thin the low ground is mud, not open brine.
  float under = smoothstep(w, -w, s) * (1.0 - rock) * (1.0 - smoothstep(0.2, 0.6, thin));
  if (under > 0.0) lit = mix(lit, brineShade(vec3(p.x, 0.0, p.z), vec3(0.0, 1.0, 0.0), v, s, 0.0), under);
  gl_FragColor = vec4(rigOut(lit), 1.0);
}`;
