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
  float wet = clamp(max(halo * 1.15, smoothstep(0.42, 0.66, low)), 0.0, 1.0);
  float film = wet * smoothstep(0.55, 0.4, lump);
  vec3 dry = mix(vec3(0.19, 0.148, 0.136), vec3(0.33, 0.297, 0.28), high * (0.25 + 0.5 * vast.r));
  dry = mix(dry, vec3(0.215, 0.115, 0.1), (0.35 + 0.5 * stain) * (1.0 - high));
  float bloom = smoothstep(0.35, 0.7, stain * 0.5 + mid.r * 0.6 + halo * 0.35 - 0.1);
  vec3 damp = mix(vec3(0.19, 0.125, 0.115), vec3(0.17, 0.05, 0.04), bloom);
  damp = mix(damp, vec3(0.26, 0.12, 0.065), smoothstep(0.55, 0.8, wide.g * 0.5 + fine.g * 0.5) * 0.45);
  vec3 colour = mix(dry, damp, wet * (1.0 - 0.6 * high * (1.0 - halo)));
  float rough = mix(0.92, 0.1, film);
  colour *= 1.0 - 0.25 * film;

  // Red growth in bands that follow the shore, and the thin white lips the brine left each time it stood higher.
  float band = smoothstep(0.35, 0.85, sin(t * 1.9 + mid.r * 5.0 + wide.r * 9.0)) * smoothstep(0.6, 1.4, t) * exp(-t / 7.0);
  colour = mix(colour, vec3(0.19, 0.045, 0.04), band * 0.7 * (1.0 - 0.5 * high));
  float tr = abs(fract(t * 1.3 + fine.r * 1.4) - 0.5) * 2.0;
  float lip = smoothstep(0.72, 0.95, tr) * smoothstep(4.5, 1.5, t) * smoothstep(0.5, 0.9, s) * smoothstep(0.35, 0.55, tiny.r * 0.5 + fine.g * 0.5);
  colour = mix(colour, vec3(0.4, 0.385, 0.37), lip * 0.75);

  // The shore itself: wet red ground at the brine, then the white frill of salt.
  float s2 = s + (fine.g - 0.5) * 0.3 + (tiny.r - 0.5) * 0.14;
  float wetBand = smoothstep(0.4, 0.03, s);
  float frill = smoothstep(0.08, 0.24, s2) * smoothstep(0.8, 0.3, s2) * (0.4 + 0.6 * smoothstep(0.3, 0.6, mid.r * 0.6 + fine.r * 0.4));
  vec3 crystal = mix(vec3(0.45, 0.435, 0.42), vec3(0.3, 0.18, 0.15), clamp(vPaint.y * 0.9 + vPaint.x * 0.5 + smoothstep(0.55, 0.3, tiny.r) * 0.35, 0.0, 1.0));
  colour = mix(colour, crystal * (0.75 + 0.5 * lump), frill * 0.9);
  colour = mix(colour, vec3(0.13, 0.04, 0.034), wetBand);
  rough = mix(rough, 0.95, max(frill, lip));
  rough = mix(rough, 0.1, wetBand);

  // Dry pans far from any brine crack into small polygons.
  float pan = smoothstep(5.0, 10.0, t) * smoothstep(0.52, 0.66, vast.r * 0.6 + wide.r * 0.4) * (1.0 - wet) * smoothstep(120.0, 40.0, dist);
  vec4 small = vec4(0.0, 0.5, 0.5, 0.5);
  if (pan > 0.0 || thin > 0.0) small = texture2D(tPlates, p.xz / 3.7);
  colour = mix(colour, vec3(0.4, 0.385, 0.37), small.r * pan * 0.22);
  vec2 bend = (fine.ba - 0.5) * 1.3 * smoothstep(70.0, 10.0, dist) + (tiny.ba - 0.5) * 0.9 * close + (mid.ba - 0.5) * 0.5;
  bend *= (1.0 - 0.9 * film) * (1.0 - 0.8 * wetBand);
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
    float cluster = mid.r * 0.6 + wide.g * 0.4;
    float edge = 0.5 - (small.r + (tiny.r - 0.5) * 0.5 + (fine.g - 0.5) * 0.3);
    float kept = smoothstep(0.42, 0.5, fract(small.g * 7.31) * 0.6 + cluster * 0.55) * smoothstep(0.0, 0.14, edge);
    float shade = fract(small.g * 3.7);
    float under = smoothstep(0.3, 0.05, edge);
#endif
    vec3 top = mix(vec3(0.23, 0.21, 0.2), vec3(0.36, 0.34, 0.325), shade) * (0.72 + 0.56 * lump);
    top = mix(top, vec3(0.22, 0.135, 0.12), smoothstep(0.5, 0.75, mid.r * 0.5 + fine.g * 0.5) * 0.35);
    top = mix(top, vec3(0.15, 0.05, 0.042), under * 0.65);
    vec3 mud = mix(vec3(0.058, 0.05, 0.046), vec3(0.115, 0.1, 0.09), fine.r * 0.5 + tiny.r * 0.5);
    float pooled = smoothstep(0.5, 0.58, mid.g * 0.45 + fine.r * 0.25 + wide.r * 0.3);
    mud = mix(mud, vec3(0.085, 0.02, 0.017), pooled * 0.9);
    vec3 c = mix(mud, top, kept);
    float k = thin * (1.0 - wetBand);
    colour = mix(colour, c, k);
    rough = mix(rough, mix(mix(0.82, 0.05, pooled), 0.9, kept), k);
    bend = mix(bend, mix(((fine.ba - 0.5) * 1.3 + (tiny.ba - 0.5) * 1.5) * (1.0 - pooled), (tiny.ba - 0.5) * 0.9 + (fine.ba - 0.5) * 0.6, kept), k);
    // The mud right under a slab's lip sees little sky.
    occ = mix(occ, mix(1.0 - 0.5 * smoothstep(-0.03, 0.004, edge), 1.0, kept), k);
  }

  // Rock: thin beds of tan and brown stone with dark joints between them, rust where water runs down the faces, red at the foot where the
  // brine has wicked up, and a crust of salt on everything that looks at the sky.
  if (rock > 0.0) {
    float beds = p.y + (mid.r - 0.5) * 0.6;
    vec4 bed = texture2D(tGrain, vec2(dot(p.xz, vec2(0.031, 0.017)), beds / 0.9));
    vec4 streak = texture2D(tGrain, vec2(dot(p.xz, vec2(0.82, 0.57)) / 9.0, dot(p.xz, vec2(-0.57, 0.82)) / 1.3));
    vec3 stone = mix(vec3(0.105, 0.078, 0.06), vec3(0.33, 0.26, 0.2), smoothstep(0.3, 0.7, bed.r * 0.6 + streak.r * 0.4));
    float steep = smoothstep(0.95, 0.6, ng.y);
    float seen = smoothstep(90.0, 30.0, dist);
    float joint = smoothstep(0.5, 0.92, abs(fract(beds / 0.34 + (fine.r - 0.5) * 0.4) - 0.5) * 2.0) * seen;
    stone *= 1.0 - 0.5 * joint * steep;
    stone = mix(stone, vec3(0.3, 0.115, 0.06), smoothstep(0.48, 0.72, bed.g * 0.5 + mid.r * 0.5) * 0.6);
    stone = mix(stone, vec3(0.2, 0.055, 0.045), smoothstep(1.5, 0.35, p.y + (mid.r - 0.5) * 0.9) * 0.7);
    stone *= 0.72 + 0.56 * mix(fine.r, tiny.r, 0.6 * close);
    float crusted = smoothstep(0.78, 0.95, ng.y) * smoothstep(0.34, 0.52, mid.g * 0.5 + fine.r * 0.5) * (1.0 - vPaint.x) * (1.0 - 0.8 * vPaint.y);
    stone = mix(stone, vec3(0.43, 0.41, 0.39) * (0.8 + 0.4 * lump), crusted * 0.8);
    colour = mix(colour, stone, rock);
    rough = mix(rough, 0.95, rock);
    float pit = (1.0 - 0.3 * joint * steep) * (1.0 - 0.8 * vPaint.x) * (1.0 - 0.75 * vPaint.y);
    occ = mix(occ, pit, rock);
    bend = mix(bend, (fine.ba - 0.5) * 1.6 + (tiny.ba - 0.5) * 1.6 * close, rock);
  }

  vec3 n = normalize(ng + vec3(bend.x, 0.0, bend.y));
  vec3 lit = rigShade(p, n, v, colour, rough, occ);

  // The brine, where this ground is under it: the far channels are drawn here, the near ones are covered by the brine's own surface.
  float w = max(fwidth(f.r) * 0.75, 0.015);
  float under = smoothstep(w, -w, s) * (1.0 - rock);
  if (under > 0.0) lit = mix(lit, brineShade(vec3(p.x, 0.0, p.z), vec3(0.0, 1.0, 0.0), v, s, 0.0), under);
  gl_FragColor = vec4(rigOut(lit), 1.0);
}`;
