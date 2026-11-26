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

/** True: the ground reads the material pictures. False: the cheaper painted ground of version 2. Costs of both are in HANDOVER.md. */
const MATS: boolean = true;

export const LAND_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec2 vPaint;
uniform sampler2D tPlates;
// The material pictures of the place (public/assets/marsh/mat): colour, and slope with height. With MATS false the ground is the painted
// one of version 2, which reads none of them and is cheaper.
${MATS ? '#define MATS 1' : ''}
uniform sampler2D tCrust;
uniform sampler2D tCrustN;
uniform sampler2D tMud;
uniform sampler2D tMudN;
uniform sampler2D tRock;
uniform sampler2D tRockN;
vec3 greyed(vec3 c, float keep) { return mix(vec3(dot(c, vec3(0.3, 0.5, 0.2))), c, keep); }
// Where the bank under the close lens is built finely (x, z, reach in metres): its salt stands in lumps a stride wide, not a thin line.
uniform vec3 uBank;
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
  float high = smoothstep(0.42, 0.7, wide.r * 0.55 + mid.g * 0.3 + lump * 0.15) * 0.6;

  // Wet ground and dry: wet near every shore and in the low places, dry and white on the lumps that stand out of it.
  float low = wide.g * 0.6 + mid.g * 0.25 + 0.3 * stain + 0.5 * (vast.r - 0.5);
  float wet = clamp(max(halo * 1.15, smoothstep(0.38, 0.6, low)), 0.0, 1.0);
  float film = wet * smoothstep(0.55, 0.4, lump);
  vec3 dry = mix(vec3(0.155, 0.138, 0.126), vec3(0.265, 0.245, 0.23), high * (0.25 + 0.5 * vast.r));
  dry = mix(dry, vec3(0.13, 0.09, 0.08), (0.1 + 0.3 * stain) * (1.0 - high));
  vec2 matBend = vec2(0.0);
  float matOcc = 1.0;
#ifdef MATS
  // The salt crust of the picture: broken plates with crumbling rims and red dried in the cracks, read at two sizes and bent by the wide
  // grain so that no repeat shows.
  float matSeen = smoothstep(300.0, 110.0, dist);
  if (matSeen > 0.0) {
    vec2 uBig = (vec2(p.x * 0.8 - p.z * 0.6, p.x * 0.6 + p.z * 0.8) + (wide.ba - 0.5) * 9.0) / 17.0;
    vec3 tile = texture2D(tCrust, uBig).rgb;
    float matNear = smoothstep(90.0, 30.0, dist);
    if (matNear > 0.0) {
      vec2 uSmall = (p.xz + (mid.ba - 0.5) * 1.5) / 5.0;
      vec3 c1 = texture2D(tCrust, uSmall).rgb;
      vec4 n1 = texture2D(tCrustN, uSmall);
      tile = mix(tile, c1 * (0.35 + 0.65 * tile / vec3(0.413, 0.304, 0.269)), matNear);
      matBend = -(n1.rg - 0.5) * 2.2 * matNear;
      matOcc = 1.0 - 0.45 * smoothstep(0.45, 0.12, n1.b) * matNear;
    }
    dry = mix(dry, greyed(tile, 0.55) * 0.6 * (0.82 + 0.5 * high), matSeen);
  }
#endif
  float bloom = smoothstep(0.5, 0.75, stain * 0.5 + mid.r * 0.6 + halo * 0.35 - 0.1);
  vec3 damp = mix(vec3(0.118, 0.104, 0.095), vec3(0.13, 0.042, 0.034), bloom);
  damp = mix(damp, vec3(0.2, 0.1, 0.06), smoothstep(0.6, 0.8, wide.g * 0.5 + fine.g * 0.5) * 0.2);
  vec3 colour = mix(dry, damp, wet * (1.0 - 0.6 * high * (1.0 - halo)));
  float rough = mix(1.0, 0.85, film);
  colour *= 1.0 - 0.25 * film;

  // Sheets of brine a finger deep lie on the crust beside every channel and pool, braided round the lumps that stand out of them. Their
  // edges are feathered, and seen low they give back the sky.
  float lie = mid.g * 0.42 + fine.r * 0.25 + wide.r * 0.33 + (tiny.r - 0.5) * 0.12;
  float brim = 0.35 + 0.14 * exp(-max(t, 0.0) / 3.2) + 0.1 * (vast.g - 0.5) + 0.08 * smoothstep(0.4, 0.65, low) + 0.09 * smoothstep(60.0, 300.0, dist);
  float sheet = smoothstep(brim, brim - 0.07, lie) * smoothstep(0.02, 0.2, s);
  colour = mix(colour, mix(vec3(0.1, 0.04, 0.033), vec3(0.075, 0.02, 0.017), smoothstep(brim - 0.07, brim - 0.2, lie)), sheet * 0.9);
  rough = mix(rough, 0.45, sheet);

  // The flats are terraced like rimstone: pans a few strides across, each at its own level, each with a raised rim of crystal and a dark
  // line of dried red inside it; the lowest pans hold a finger of brine.
  float pans = smoothstep(420.0, 160.0, dist) * (1.0 - sheet) * smoothstep(0.15, 0.6, s);
  if (pans > 0.0) {
    vec4 pl2 = texture2D(tPlates, (p.xz + (wide.ba - 0.5) * 9.0 + (mid.ba - 0.5) * 2.4) / 37.0);
    float rim2 = smoothstep(0.72, 0.9, pl2.r + (fine.r - 0.5) * 0.2) * smoothstep(0.35, 0.6, mid.r * 0.6 + fine.g * 0.4);
    float id2 = fract(pl2.g * 7.7);
    colour *= mix(1.0, 0.7 + 0.6 * id2, pans);
    float held = smoothstep(0.66, 0.72, id2 + 0.2 * halo + 0.2 * (stain - 0.3) + 0.15 * smoothstep(40.0, 200.0, dist)) * (1.0 - rim2) * pans;
    colour = mix(colour, vec3(0.08, 0.022, 0.018), held * 0.85);
    rough = mix(rough, 0.45, held);
    sheet = max(sheet, held);
    // Inside each rim a line of dried red, then the rim itself: pale crystal, a hand wide.
    colour = mix(colour, vec3(0.12, 0.035, 0.026), smoothstep(0.3, 0.6, pl2.r) * (1.0 - rim2) * (1.0 - held) * 0.6 * pans * smoothstep(0.3, 0.55, mid.r));
    colour = mix(colour, vec3(0.3, 0.278, 0.265), rim2 * 0.8 * pans);
  }
  // The crust is a thin salt skin over mud, cracked into plates whose edges have curled up pale as they dried; red stands in the cracks.
  float occGap = 1.0;
  float cr = smoothstep(130.0, 50.0, dist) * (1.0 - sheet);
#ifdef MATS
  cr = 0.0;
#endif
  if (cr > 0.0) {
    vec4 pl = texture2D(tPlates, (p.xz + (mid.ba - 0.5) * 1.6 + (fine.ba - 0.5) * 0.22) / 6.1);
    float patchy = smoothstep(0.36, 0.5, mid.g * 0.5 + wide.r * 0.5) * cr * (1.0 - wet * 0.4);
    float gap = smoothstep(0.6, 0.85, pl.r + (tiny.r - 0.5) * 0.25) * patchy;
    float curl = smoothstep(0.2, 0.6, pl.r) * (1.0 - gap) * patchy;
    colour *= 1.0 + 0.3 * (fract(pl.g * 5.3) - 0.5) * patchy;
    colour = mix(colour, vec3(0.28, 0.255, 0.24), curl * 0.3 * (1.0 - 0.6 * wet));
    colour = mix(colour, vec3(0.05, 0.03, 0.026), gap * 0.9);
    rough = mix(rough, 0.5, gap);
    occGap = 1.0 - 0.5 * gap;
  }
  // Far off, the red of stalks and growth too small to draw lies on the flats as a haze of colour.
  colour = mix(colour, vec3(0.13, 0.05, 0.048), smoothstep(0.44, 0.6, wide.g * 0.5 + vast.g * 0.5) * smoothstep(150.0, 500.0, dist) * 0.6);

  // Red growth in bands that follow the shore, and the thin white lips the brine left each time it stood higher.
  float band = smoothstep(0.35, 0.85, sin(t * 1.9 + mid.r * 5.0 + wide.r * 9.0)) * smoothstep(0.6, 1.4, t) * exp(-t / 7.0);
  colour = mix(colour, vec3(0.16, 0.042, 0.035), band * 0.55 * (1.0 - 0.5 * high));
  // Each old shoreline is a thin dark line of dried red, drawn sharp.
  float old = abs(fract(t * 0.8 + mid.r * 2.3 + fine.g * 0.5) - 0.5) * 2.0;
  float line = smoothstep(0.78, 0.94, old) * smoothstep(0.3, 0.9, s) * exp(-t / 9.0) * smoothstep(0.3, 0.5, wide.g * 0.5 + mid.g * 0.5);
  colour = mix(colour, vec3(0.105, 0.028, 0.021), line * 0.85);
  float tr = abs(fract(t * 1.3 + fine.r * 1.4) - 0.5) * 2.0;
  float lip = smoothstep(0.72, 0.95, tr) * smoothstep(4.5, 1.5, t) * smoothstep(0.5, 0.9, s) * smoothstep(0.35, 0.55, tiny.r * 0.5 + fine.g * 0.5);
  float thinFar = 0.3 + 0.7 * smoothstep(170.0, 50.0, dist);
  colour = mix(colour, vec3(0.3, 0.27, 0.255), lip * 0.4 * thinFar);

  // The shore itself: wet red ground at the brine, then the white frill of salt.
  float s2 = s + (fine.g - 0.5) * 0.3 + (tiny.r - 0.5) * 0.14;
  // The soak is a hand wide in one place and two strides in the next; the frill stands only where the bank is firm.
  float soak = 0.25 + 2.4 * smoothstep(0.4, 0.75, mid.r * 0.7 + fine.g * 0.3);
  float wetBand = smoothstep(soak, 0.03, s + (fine.r - 0.5) * 0.5 * smoothstep(0.2, 1.0, s));
  float frill = smoothstep(0.04, 0.1, s2) * smoothstep(0.34, 0.16, s2) * smoothstep(0.34, 0.5, mid.g * 0.5 + fine.r * 0.5);
  float onBank = smoothstep(uBank.z, uBank.z * 0.7, length(p.xz - uBank.xy));
  frill = max(frill, onBank * smoothstep(0.03, 0.1, s2) * smoothstep(0.62, 0.24, s2 + (mid.r - 0.5) * 0.6 + (fine.r - 0.5) * 0.3));
  vec3 crystal = mix(vec3(0.37, 0.34, 0.325), vec3(0.24, 0.13, 0.11), clamp(vPaint.y * 0.9 + vPaint.x * 0.6 + smoothstep(0.5, 0.25, tiny.r) * 0.5, 0.0, 1.0));
  // The soaked ground is not one skin: grains of salt stand out of it, more of them the further from the brine.
  vec3 soaked = mix(vec3(0.07, 0.02, 0.016), vec3(0.13, 0.05, 0.034), fine.r) * (0.7 + 0.6 * tiny.r);
  float grains = smoothstep(0.56, 0.7, tiny.r * 0.5 + fine.g * 0.5) * smoothstep(0.2, 1.2, s) * 0.6;
  soaked = mix(soaked, crystal * 0.85, grains);
  vec2 bankBend = vec2(0.0);
#ifdef MATS
  if (onBank > 0.0) {
    // The bank at the lens: wet red-brown mud behind the fringe, and the fringe itself rough crystal, red in its hollows.
    vec2 ub = (p.xz + (fine.ba - 0.5) * 0.1) / 0.9;
    vec3 ct = texture2D(tCrust, ub).rgb / vec3(0.413, 0.304, 0.269);
    vec4 cn = texture2D(tCrustN, ub);
    crystal *= (0.45 + 0.5 * ct) * vec3(1.0, 0.96, 0.9);
    crystal = mix(crystal, vec3(0.2, 0.06, 0.045), smoothstep(0.42, 0.12, cn.b) * 0.55);
    bankBend = -(cn.rg - 0.5) * 2.6 * onBank;
    vec3 mt = texture2D(tMud, p.xz / 2.0 + 0.3).rgb * (0.5 + 0.5 * texture2D(tMud, p.xz / 0.53).rgb / vec3(0.318, 0.179, 0.155));
    colour = mix(colour, greyed(mt, 0.75) * 0.34, onBank * smoothstep(0.05, 0.3, s));
    soaked = mix(soaked, greyed(mt, 0.9) * 0.22, onBank);
  }
#endif
  colour = mix(colour, soaked, wetBand);
  colour = mix(colour, crystal * (0.75 + 0.5 * lump), frill * 0.92 * thinFar);
  rough = mix(rough, 1.0, max(frill, lip));
  rough = mix(rough, mix(0.8, 1.0, grains), wetBand);

  // Dry pans far from any brine crack into polygons: far off, small in the frame, and faint.
  float pan = smoothstep(5.0, 10.0, t) * smoothstep(0.52, 0.66, vast.r * 0.6 + wide.r * 0.4) * (1.0 - wet) * smoothstep(70.0, 150.0, dist) * smoothstep(700.0, 350.0, dist);
  vec4 small = vec4(0.0, 0.5, 0.5, 0.5);
  if (pan > 0.0) small = texture2D(tPlates, p.xz / 23.0);
  colour = mix(colour, vec3(0.3, 0.285, 0.27), small.r * pan * 0.15);
  vec2 bend = (fine.ba - 0.5) * 1.3 * smoothstep(70.0, 10.0, dist) + (tiny.ba - 0.5) * 0.9 * close + (mid.ba - 0.5) * 0.15;
  bend *= (1.0 - 0.9 * film) * (1.0 - 0.8 * wetBand) * (1.0 - 0.95 * sheet);
  bend += (small.ba - 0.5) * 0.5 * pan;
  float dryShare = (1.0 - wet * 0.7) * (1.0 - sheet) * (1.0 - wetBand);
  bend += matBend * dryShare * (1.0 - onBank) + bankBend * max(frill, 0.4);
  float occ = occGap * mix(1.0, matOcc, dryShare) * (1.0 - 0.3 * smoothstep(0.5, 0.25, lump) * (1.0 - film)) * (1.0 - 0.55 * vPaint.x) * (1.0 - 0.35 * vPaint.y);

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
    vec3 top = mix(vec3(0.125, 0.108, 0.098), vec3(0.235, 0.212, 0.198), shade * 0.6 + lump * 0.4) * (0.75 + 0.5 * tiny.r);
    top = mix(top, vec3(0.14, 0.075, 0.062), smoothstep(0.3, 0.8, mid.r * 0.5 + fine.g * 0.5) * 0.3);
    top = mix(top, vec3(0.11, 0.06, 0.05), under * 0.7);
    vec3 mud = mix(vec3(0.06, 0.047, 0.04), vec3(0.125, 0.1, 0.085), fine.r * 0.5 + tiny.r * 0.5);
    vec2 mudBend = vec2(0.0);
    float mudLow = 0.0;
    vec2 topBend = vec2(0.0);
#ifdef MATS
    if (dist < 70.0) {
      float k2 = smoothstep(70.0, 35.0, dist);
      vec2 um = (p.xz + (mid.ba - 0.5) * 0.12) / 2.0;
      vec3 mt = texture2D(tMud, um).rgb * (0.4 + 0.6 * texture2D(tMud, um * 0.29 + 0.43).rgb / vec3(0.318, 0.179, 0.155));
      // Close, the same mud read small, so a hand's breadth of it has grain.
      if (dist < 14.0) mt *= mix(vec3(1.0), 0.45 + 0.55 * texture2D(tMud, um * 3.7 + 0.19).rgb / vec3(0.318, 0.179, 0.155), smoothstep(14.0, 7.0, dist));
      vec4 mn = texture2D(tMudN, um);
      mud = mix(mud, greyed(mt, 0.6) * 0.46 * (0.4 + 0.6 * smoothstep(0.15, 0.6, mn.b)), k2);
      mudLow = smoothstep(0.34, 0.16, mn.b + (fine.r - 0.5) * 0.2) * k2;
      mudBend = -(mn.rg - 0.5) * 0.5 * k2;
      vec2 ut = (vec2(p.x * 0.6 + p.z * 0.8, p.z * 0.6 - p.x * 0.8)) / 1.7;
      vec3 tt = texture2D(tCrust, ut).rgb;
      vec4 tn = texture2D(tCrustN, ut);
      top = mix(top, greyed(tt, 0.5) * 0.6 * (0.7 + 0.5 * shade) * (0.7 + 0.3 * smoothstep(0.1, 0.45, tn.b)), k2);
      top = mix(top, vec3(0.11, 0.06, 0.05), under * 0.5 * k2);
      topBend = -(tn.rg - 0.5) * 1.8 * k2;
    }
#endif
    float pooled = smoothstep(0.46, 0.53, mid.g * 0.45 + fine.r * 0.25 + wide.r * 0.3);
    pooled = max(pooled, mudLow);
    mud = mix(mud, vec3(0.075, 0.02, 0.016), pooled * 0.85);
    // Far enough off, the gaps between slabs close to the eye.
    kept = max(kept, smoothstep(9.0, 22.0, dist));
    vec3 c = mix(mud, top, kept);
    float k = smoothstep(0.0, 0.5, thin) * (1.0 - wetBand * (1.0 - thin));
    colour = mix(colour, c, k);
    rough = mix(rough, mix(mix(0.9, 0.3, pooled), 1.0, kept), k);
    bend = mix(bend, mix(((fine.ba - 0.5) * 0.3 + (tiny.ba - 0.5) * 0.3 + mudBend) * (1.0 - 0.85 * pooled), (tiny.ba - 0.5) * 0.5 + (fine.ba - 0.5) * 0.4 + topBend, kept), k);
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
#ifdef MATS
    vec4 rf = fine;
    vec4 rt = tiny;
#else
    vec4 rf = mix(fine, texture2D(tGrain, q / 1.3), steep);
    vec4 rt = tiny;
    if (close > 0.0) rt = mix(tiny, texture2D(tGrain, q / 0.37 + 0.3), steep * close);
#endif
    float tone = mix(mid.g, mid.g * 0.35 + rf.g * 0.4 + rt.r * 0.25, seen);
    vec3 stone = mix(vec3(0.06, 0.044, 0.035), vec3(0.2, 0.152, 0.118), smoothstep(0.25, 0.75, tone));
    vec2 rockBend = vec2(0.0);
    float rockOcc = 1.0;
#ifdef MATS
    // The rock of the picture, laid on from above and from the two sides by how each face looks, so that no wall is smeared.
    vec3 w3 = pow(abs(ng), vec3(4.0));
    w3 /= w3.x + w3.y + w3.z;
    vec2 ru = (p.xz + (mid.ba - 0.5) * 0.2) / 4.0;
    vec3 rk = texture2D(tRock, ru).rgb * w3.y;
    if (w3.x > 0.02) rk += texture2D(tRock, vec2(p.z, p.y * 1.4) / 4.0 + 0.37).rgb * w3.x;
    if (w3.z > 0.02) rk += texture2D(tRock, vec2(p.x, p.y * 1.4) / 4.0 + 0.71).rgb * w3.z;
    if (seen > 0.0) {
      vec4 rn = texture2D(tRockN, ru);
      rockBend = -(rn.rg - 0.5) * 1.5 * w3.y * seen;
      rockOcc = 1.0 - 0.4 * smoothstep(0.45, 0.12, rn.b) * w3.y * seen;
    }
    if (close > 0.0) {
      vec2 du = w3.y > max(w3.x, w3.z) ? p.xz : (w3.x > w3.z ? vec2(p.z, p.y * 1.4) : vec2(p.x, p.y * 1.4));
      rk *= mix(vec3(1.0), 0.35 + 0.65 * texture2D(tRock, du / 1.1 + 0.21).rgb / vec3(0.439, 0.321, 0.279), close);
    }
    stone = greyed(rk, 0.85) * mix(0.5, 0.3, steep) * (0.8 + 0.4 * mid.g);
#endif
    // Beds of unlike stone, level, seen as bands on every mound however far.
    float strata = texture2D(tGrain, vec2(dot(p.xz, vec2(0.62, 0.79)) / 53.0, p.y / 1.9 + mid.r * 0.15), 4.5).r;
    stone *= 0.62 + 0.76 * strata;
    float joint = smoothstep(0.6, 0.95, abs(fract(beds / 0.26 + (rf.r - 0.5) * 0.9) - 0.5) * 2.0) * seen * smoothstep(0.4, 0.6, mid.g);
#ifdef MATS
    joint = 0.0;
#endif
    stone *= 1.0 - 0.35 * joint * steep;
    // Cracks, painted: thin, dark, wet and red.
    vec4 block = vec4(0.0, 0.5, 0.5, 0.5);
#ifndef MATS
    if (seen > 0.0) block = texture2D(tPlates, p.xz / 6.3 + (fine.ba - 0.5) * 0.03 + (mid.ba - 0.5) * 0.1);
#endif
    float painted = smoothstep(0.55, 0.9, block.r) * seen * smoothstep(0.35, 0.55, rf.r);
    float crack = max(painted, max(vPaint.x, vPaint.y * 0.8));
    stone = mix(stone, vec3(0.3, 0.115, 0.06), smoothstep(0.5, 0.72, wide.g * 0.4 + mid.r * 0.6) * 0.5 * (0.3 + 0.7 * seen));
    float foot = smoothstep(1.5, 0.35, p.y + (mid.r - 0.5) * 0.9);
    stone = mix(stone, vec3(0.17, 0.045, 0.036), clamp(foot * 0.7 + crack * 0.35 * (0.4 + 0.6 * mid.g), 0.0, 0.9));
    // Pitted like any salt-eaten stone: the pits are dark because the sky does not reach into them.
    float pits = mix(1.0, 0.7 + 0.4 * smoothstep(0.25, 0.6, rt.r), close) * (0.88 + 0.24 * rf.r);
#ifndef MATS
    stone *= pits;
#endif
    // Rust and red where water gathers: in the clefts and under each ledge.
    stone = mix(stone, vec3(0.24, 0.085, 0.045), clamp(vPaint.y * 1.1, 0.0, 0.85) * smoothstep(0.35, 0.65, mid.g) * 0.3);
    // Whatever looks at the sky wears a crust of salt, pale against the dark of the faces under it.
    float crusted = smoothstep(0.72, 0.93, ng.y + (rf.r - 0.5) * 0.12) * mix(0.25 + 0.7 * smoothstep(0.4, 0.6, strata * 0.5 + mid.g * 0.5), 0.55 + 0.45 * smoothstep(0.3, 0.6, rt.g), seen) * (1.0 - 0.8 * crack) * mix(1.0, smoothstep(0.3, 0.55, rf.r * 0.45 + rt.g * 0.3 + mid.g * 0.25), seen);
#ifdef MATS
    crusted *= 0.3;
#endif
    stone = mix(stone, mix(vec3(0.25, 0.228, 0.212), vec3(0.34, 0.315, 0.295), seen) * (0.8 + 0.4 * lump), crusted * 0.9);
    colour = mix(colour, stone, rock);
#ifdef MATS
    rough = mix(rough, mix(0.97, 0.8, crack * (1.0 - crusted)), rock);
#else
    rough = mix(rough, mix(0.95, 0.35, crack * (1.0 - crusted)), rock);
#endif
    float pit = (1.0 - 0.2 * joint * steep) * (1.0 - 0.55 * vPaint.x) * (1.0 - 0.55 * vPaint.y) * (1.0 - 0.5 * painted) * (1.0 - 0.35 * steep);
    occ = mix(occ, pit * rockOcc, rock);
#ifdef MATS
    bend = mix(bend, (rf.ba - 0.5) * 0.5 + (rt.ba - 0.5) * 0.6 * close + rockBend, rock);
#else
    bend = mix(bend, (rf.ba - 0.5) * 1.6 + (rt.ba - 0.5) * 1.8 * close, rock);
#endif
  }

  // An overcast is not the same all round: the quarter away from the rain is the brighter, and every lump and lip shows it.
  vec2 bright = vec2(-0.86, 0.5);
  colour *= 1.0 + clamp(mix(0.22, 0.4, rock) * dot(bend, bright) + mix(0.25, 0.32, rock) * dot(ng.xz, bright), -0.45, 0.35);

  vec3 n = normalize(ng + vec3(bend.x, 0.0, bend.y));
  vec3 lit = rigShade(p, n, v, colour, rough, occ);

  // The brine, where this ground is under it: the far channels are drawn here, the near ones are covered by the brine's own surface.
  float w = max(fwidth(f.r) * 0.75, 0.015);
  // Where the crust is thin the low ground is mud, not open brine.
  float under = smoothstep(w, -w, s) * (1.0 - rock) * (1.0 - smoothstep(0.2, 0.6, thin));
  if (under > 0.0) {
    vec2 run = (texture2D(tGrain, p.xz / 7.3 + vec2(0.034, 0.019) * uTime).ba - 0.5) * 0.06 + (texture2D(tGrain, p.xz / 4.1 - vec2(0.021, 0.05) * uTime).ba - 0.5) * 0.04;
    lit = mix(lit, brineShade(vec3(p.x, 0.0, p.z), normalize(vec3(run.x, 1.0, run.y)), v, s, 0.0), under);
  }
  gl_FragColor = vec4(rigOut(lit), 1.0);
}`;
