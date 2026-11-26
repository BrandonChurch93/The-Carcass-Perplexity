// The cloud as one field of the world, so that the surface that takes its shade and the sheets that draw it read the same cloud.
// Where the weather stands comes from sky/cover.png (assets-src/reveal/sky/make_cover.py); what it looks like comes from the Builder's
// photographs of cloud from orbit (public/assets/reveal/mat). Lengths are kilometres, the drift is a pure function of the time.
import { AT, KM, X, Z } from './anchors';

/** The rectangle of the world the picture of the cover lies on: x and z of its corner, one over its width and its height. */
export const COVER_RECT: [number, number, number, number] = [X(-900), Z(-820), 1 / (8500 * KM), 1 / (((8500 * 9) / 16) * KM)];
/** Height over the sea, km: the low field of small cloud, the fronts, the veil of ice. */
export const LOW_KM = 2.6;
export const HIGH_KM = 10.5;
/** Km a second: staged far faster than weather, so the held frame is seen to live. */
export const LOW_DRIFT: [number, number] = [5.4, 1.5];

const f = (n: number): string => n.toFixed(4);

export const WEATHER_GLSL = /* glsl */ `
uniform sampler2D uCloudTile;
uniform sampler2D uCover;
uniform sampler2D uMatPopcorn;
uniform sampler2D uMatStreaks;
uniform sampler2D uMatSpecks;
uniform vec4 uCoverRect;

const vec2 LOW_DRIFT = vec2(${f(LOW_DRIFT[0])}, ${f(LOW_DRIFT[1])});

vec3 coverAt(vec2 xz) {
  return texture2D(uCover, clamp((xz - uCoverRect.xy) * uCoverRect.zw, 0.0, 1.0)).rgb;
}

// The open sea west and south of the skull, where the map's low islands lie under the water: 0 on the body's side, 1 well out.
float westSea(vec2 xz) {
  vec2 fromSkull = (xz - vec2(${f(X(1350))}, ${f(Z(1566))})) / vec2(${f(330 * KM)}, ${f(270 * KM)});
  // (Its edge runs south from the skull and then south east, along the outside of the arm.)
  float limit = ${f(X(1700))} + 0.6 * max(xz.y - ${f(Z(1700))}, 0.0);
  return smoothstep(1.08, 1.6, length(fromSkull)) * (1.0 - smoothstep(limit - 130.0, limit + 130.0, xz.x));
}

// How much cloud a photograph shows at a point: its light, once the dark floor of the sea under it is taken off.
float seen(vec3 c, float least, float full) {
  return smoothstep(least, full, dot(c, vec3(0.3, 0.55, 0.15)));
}

// One layer of puffs: the sea is cut in cells of a few kilometres, and a cell holds one soft top or none. Most are tiny, some
// middling, a few large; each is lumpy, never a disc, and of its own brightness.
float puffs(vec2 w, float cell, float share) {
  // (A layer whose cells are near the size of a pixel is left out: it would only glitter.)
  float fineness = 1.0 - smoothstep(0.3, 0.7, max(fwidth(w.x), fwidth(w.y)) / cell);
  if (fineness <= 0.0) return 0.0;
  vec2 g = w / cell;
  vec2 id = floor(g);
  vec2 at = 0.5 + 0.3 * (vec2(hash12(id + 17.3), hash12(id + 41.7)) - 0.5);
  float tail = hash12(id + 71.1);
  float size = mix(0.17, 0.44, tail * tail);
  vec2 d = fract(g) - at;
  float lump = 0.5 * (vnoise(g * 3.1 + 9.0) - 0.5);
  float dist = length(d * vec2(1.0, 1.0 + 0.5 * (hash12(id + 23.9) - 0.5))) * (1.0 + lump);
  float soft = 1.0 - smoothstep(0.0, 0.92 * size, dist);
  return soft * (0.5 + 0.5 * soft) * 1.25 * step(hash12(id + 3.1), share) * (0.4 + 0.6 * hash12(id + 5.5)) * fineness;
}

// The photograph of the low field at a point of its own drifting ground: from near a field of small cumulus at its real size
// (laid at 150 km a repeat), from orbit the fine wind-drawn streaks that cover the sea (laid at 900 km a repeat). One read, two while they change over.
float lowPicture(vec2 w, float shadow) {
  float away = smoothstep(330.0, 620.0, uViewKm);
  // (The puffs are seen as specks until well up the rise; the streaks take the sea over above them.)
  float specks = 1.0 - smoothstep(330.0, 620.0, uViewKm);
  float pic = 0.0;
  if (specks > 0.0) {
    // Small cumulus stand in streets along the wind, with clear sea between: thousands of separate puffs, each a few kilometres
    // across and far smaller than a valley. Where they stand comes from the photographs (the streaks say where a street runs, the
    // popcorn field how full it is); each puff is one soft round top, of its own size, in its own place.
    vec2 pw = mat2(0.8, 0.6, -0.6, 0.8) * w;
    float street = dot(texture2D(uMatStreaks, mat2(0.9, 0.44, -0.44, 0.9) * w / vec2(880.0, 520.0) + vec2(0.4, 0.1), 1.5).rgb, vec3(0.3, 0.55, 0.15));
    float full = dot(texture2D(uMatPopcorn, pw / 260.0 + vec2(0.13, 0.4), 3.0).rgb, vec3(0.3, 0.55, 0.15));
    // (Gaps in the streets, and here and there a cluster where the puffs have grown together into cells.)
    float gap = smoothstep(0.3, 0.55, vnoise(pw / 23.0 + 5.0));
    float knot = smoothstep(0.62, 0.8, vnoise(pw / 31.0 + 40.0));
    float share = 0.008 + 0.98 * smoothstep(0.25, 0.36, street) * (0.65 + 0.35 * smoothstep(0.06, 0.26, full)) * (0.3 + 0.7 * gap);
    float puff = max(max(puffs(pw, 3.3, share), puffs(mat2(0.6, 0.8, -0.8, 0.6) * w + 31.0, 4.8, share)), puffs(mat2(0.96, -0.28, 0.28, 0.96) * w + 77.0, 2.2, share));
    puff = max(puff, puffs(mat2(0.28, 0.96, -0.96, 0.28) * w + 13.0, 5.4, max(knot * min(1.0, 2.0 * share), 0.9 * smoothstep(0.36, 0.5, street) * (0.3 + 0.7 * gap))) * 1.15);
    // (Higher up only the cells are left to see: fused clusters, ten kilometres across, where the streets are fullest.)
    puff = max(puff, puffs(mat2(0.7, -0.71, 0.71, 0.7) * w + 51.0, 9.5, smoothstep(300.0, 520.0, uViewKm) * max(knot, 0.8 * smoothstep(0.3, 0.44, street)) * (0.3 + 0.7 * gap)) * 1.3);
    // (And in the core of a street the puffs have grown into one another: a soft lumpy mass, a few kilometres across, never a disc.)
    float nearBy = 1.0 - smoothstep(280.0, 440.0, uViewKm);
    if (nearBy > 0.0) {
      float core = smoothstep(0.4, 0.56, street) * (0.25 + 0.75 * gap) * (0.5 + 0.5 * knot);
      float lumps = 0.55 * vnoise(pw / 3.4 + 3.0) + 0.3 * vnoise(pw / 1.5 + 11.0) + 0.15 * vnoise(pw / 0.7 + 23.0);
      puff = max(puff, nearBy * smoothstep(0.68 - 0.2 * core, 1.02 - 0.2 * core, lumps) * step(0.02, core) * (0.55 + 0.45 * lumps));
    }
    pic += specks * puff;
  }
  if (away > 0.0) {
    // From high up: the Builder's photograph of fields of very small cumulus (mat/specks.jpg), laid so that one of its texels is
    // about a pixel: each cloud a dot, gathered in ragged clusters and beaded streets along the wind, clear sea between. As the eye
    // rises it is laid again at twice the size, and the two lays change over. It is laid twice, turned against itself, each lay
    // in its own wide fields, so no repeat shows.
    // (Until well up the rise a cloud keeps its size on the sea, a few kilometres: a soft round top, larger than a pixel.)
    float octave = log2(uViewKm / 1415.0) + 0.15 + 1.0 * (1.0 - smoothstep(330.0, 620.0, uViewKm)) + 0.5 * (1.0 - smoothstep(500.0, 1100.0, uViewKm));
    float lower = floor(octave);
    float share = smoothstep(0.3, 0.9, octave - lower);
    float size = exp2(lower);
    vec2 sw = mat2(0.97, -0.24, 0.24, 0.97) * w;
    vec2 tw = mat2(0.64, 0.77, -0.77, 0.64) * w;
    // (Carried by another wind, the second lay crosses the first while the frame is held.)
    float held = uTime < 8.0 ? 0.125 * max(uTime - 4.0, 0.0) * max(uTime - 4.0, 0.0) : uTime - 6.0;
    vec2 mw = tw + held * vec2(9.0, -19.0);
    float dots = 0.0;
    float haze = 0.0;
    for (int i = 0; i < 2; i++) {
      float part = i == 0 ? 1.0 - share : share;
      if (part <= 0.0) continue;
      float lay = size * (i == 0 ? 1.0 : 2.0);
      // (Each lay stands in its own fields, a third of the sea, with open water between them.)
      float inA = smoothstep(0.4, 0.6, texture2D(uCloudTile, sw / (2600.0 * lay) + vec2(0.33, 0.61) * lay, 2.0).b);
      float inB = smoothstep(0.43, 0.62, texture2D(uCloudTile, mw / (1900.0 * lay) + 0.4 * lay, 2.0).g);
      // (Within a field the cloud stands in ragged groups drawn out along the wind, a hundred kilometres and more, with clear sea between.)
      inA *= 0.1 + 0.9 * smoothstep(0.44, 0.56, texture2D(uCloudTile, sw / (vec2(1400.0, 760.0) * lay) + vec2(0.17, 0.71) * lay, 3.5).g);
      inB *= 0.1 + 0.9 * smoothstep(0.44, 0.56, texture2D(uCloudTile, mw / (vec2(1150.0, 640.0) * lay) + vec2(0.53, 0.09) * lay, 3.5).b);
      vec2 ua = sw / (1050.0 * lay) + vec2(0.3, 0.7) * lay;
      vec2 ub = mw / (820.0 * lay) + vec2(0.7, 0.2) * lay;
      // (The photograph is read only where a field stands.)
      float dotA = 0.0;
      float dotB = 0.0;
      float hazeA = 0.0;
      float hazeB = 0.0;
      if (inA > 0.004) {
        if (shadow < 1.0) dotA = seen(texture2D(uMatSpecks, ua, 0.2).rgb, 0.2, 0.8) * inA;
        // (Between the dots of a cluster hangs the thin haze of the same cloud: the same photograph, out of focus.)
        hazeA = seen(texture2D(uMatSpecks, ua, 3.2).rgb, 0.1, 0.5) * inA;
      }
      if (inB > 0.004) {
        if (shadow < 1.0) dotB = 0.9 * seen(texture2D(uMatSpecks, ub, 0.2).rgb, 0.22, 0.82) * inB;
        hazeB = seen(texture2D(uMatSpecks, ub, 3.2).rgb, 0.1, 0.5) * inB;
      }
      dots += part * max(dotA, dotB);
      haze += part * max(hazeA, hazeB);
    }
    // (For the shadow it throws, from orbit, only the body of a cluster counts: a dot is too small for its shadow to be seen.)
    // (And here and there long thin wisps run with the wind: the photograph of wind-drawn streaks, soft, in a few wide fields of their own,
    // carried by a third wind.)
    vec2 ww = mat2(0.94, -0.34, 0.34, 0.94) * w + held * vec2(-13.0, -6.0);
    float wispField = smoothstep(0.42, 0.62, texture2D(uCloudTile, ww / vec2(3900.0, 2100.0) + vec2(0.81, 0.27), 2.5).r);
    float wisp = wispField > 0.0 ? wispField * seen(texture2D(uMatStreaks, ww / vec2(2500.0, 900.0) + vec2(0.37, 0.52), 0.8).rgb, 0.22, 0.9) : 0.0;
    pic += away * max(max(dots * (1.0 - shadow), mix(0.36, 0.8, shadow) * haze), 0.36 * wisp);
  }
  return pic;
}

// The ground of the low field: the world, read through a slow bend so the streets curve, and drifting.
vec2 lowGround(vec2 at) {
  // (From orbit the drift of the field is seen: it gathers way as the rise ends, and the whole field is carried on while the frame is held.)
  float held = uTime < 8.0 ? 0.125 * max(uTime - 4.0, 0.0) * max(uTime - 4.0, 0.0) : uTime - 6.0;
  return at + 90.0 * vec2(sin(at.y / 610.0 + 1.3 * sin(at.x / 1130.0)), sin(at.x / 870.0 + 1.7 * sin(at.y / 1370.0))) - uTime * LOW_DRIFT - held * vec2(7.0, 2.5);
}

// The low cloud: x how thick (0 to 1), y the photograph's own light there (the build of its tops).
// The share of the sky it takes comes from the cover and from slow noise that drifts with it: thick here, torn there, clear between.
vec2 lowFieldOf(vec2 at, float shadow) {
  vec2 w = lowGround(at);
  // The sky stands clear over the lake of the Eye, where the rise begins.
  float amount = max(coverAt(at).g, 0.6 * westSea(at)) * smoothstep(100.0, 230.0, length(at - vec2(${f(X(AT.lake.x))}, ${f(Z(AT.lake.y))})));
  float slow = 0.6 * texture2D(uCloudTile, w / 2900.0 + vec2(0.15, 0.55), 4.0).b + 0.4 * texture2D(uCloudTile, w / 1100.0 + vec2(0.7, 0.2), 3.5).b;
  // From orbit the field is seen whole: an even scatter over all the sea, a little thicker here and thinner there.
  float even = smoothstep(330.0, 760.0, uViewKm);
  float field = amount * (mix(0.45, 0.16, even) + mix(0.55, 0.84, even) * smoothstep(mix(0.34, 0.3, even), mix(0.72, 0.6, even), slow + 0.2 * (amount - 0.6)));
  // (And from there it lies in bands along the wind with long clear lanes of sea between, and thins toward the edge of the planet.)
  float lane = texture2D(uCloudTile, mat2(0.97, -0.24, 0.24, 0.97) * w / vec2(4200.0, 1150.0) + vec2(0.52, 0.18), 2.0).b;
  field *= mix(1.0, (0.3 + 0.7 * smoothstep(0.3, 0.52, lane)) * (0.45 + 0.55 * smoothstep(0.12, 0.45, limbCos(at))), even);
  float pic = lowPicture(w, shadow);
  // The field takes its share of the photograph's cloud softly: thick here, thin there, and nowhere cut to an edge.
  float thick = min(1.0, 1.25 * smoothstep(mix(0.05, 0.0, even), 0.85, pic)) * smoothstep(0.0, 0.5, field);
  return vec2(thick, pic);
}

vec2 lowField(vec2 at) {
  return lowFieldOf(at, 0.0);
}

// The share of the sun that reaches a point of the ground under the cloud.
float cloudShade(vec2 xz) {
  vec2 toSun = uSunDir.xz / max(uSunDir.y, 0.2);
  // From orbit the shadows are drawn longer than they fall, as relief is on a map, so that each height of cloud is seen to stand off the sea.
  float lift = mix(1.0, 3.0, smoothstep(150.0, 450.0, uViewKm)) * mix(1.0, 0.55, smoothstep(600.0, 1100.0, uViewKm));
  float low = lowFieldOf(xz + toSun * ${LOW_KM.toFixed(1)} * lift, smoothstep(620.0, 900.0, uViewKm)).x;
  float standing = coverAt(xz + toSun * 6.5 * lift).b;
  // The cyclone shades the sea: a soft shadow, thrown well away from the sun.
  float fromStorm = length(xz + toSun * 110.0 - vec2(${f(X(AT.cyclone.x))}, ${f(Z(AT.cyclone.y))})) / ${f(1250 * KM)};
  float stormShade = pow(1.0 - smoothstep(0.02, 0.48, fromStorm), 1.3) * uArrive;
  return (1.0 - mix(0.4, 0.5, smoothstep(300.0, 900.0, uViewKm)) * smoothstep(0.04, 0.8, low)) * (1.0 - 0.16 * standing * uArrive) * (1.0 - 0.13 * stormShade);
}`;
