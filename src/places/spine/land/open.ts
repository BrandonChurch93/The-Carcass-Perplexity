// The land in the open air: the rock and the snow of the ground and of the spires (KIND 0 and 1). The inside of the canal keeps its own main.
// The rock is one generated sheet of jointed granite (land/granite, 15 m by 10 m), laid at three sizes on the three planes of the beds, each lay
// turned and shifted against the others so no repeat stands; its snow lies where the rock's own relief can hold it; the snow is the generated
// wind pack (land/snowpack, 9 m by 6 m) at two sizes across the gale.
export const OPEN_UNIFORMS = /* glsl */ `
uniform sampler2D tGran;
uniform sampler2D tGranNh;
uniform sampler2D tPack;
uniform sampler2D tPackNh;
uniform sampler2D tCrop;
uniform sampler2D tCropNh;
uniform sampler2D tFrost;
uniform sampler2D tFrostNh;
const vec3 GRAN_MEAN = vec3(0.2324, 0.1975, 0.1774);
const vec3 PACK_MEAN = vec3(0.4489, 0.4965, 0.6154);
const vec3 CROP_MEAN = vec3(0.1996, 0.2158, 0.2667);
const float FROST_LUMA = 0.3075;
const vec3 LUMA = vec3(0.3, 0.5, 0.2);
`;

export const openMain = (scorch: string): string => /* glsl */ `
// One read of a sheet at a level worked from given gradients: colour, and in nh the slope (xy, toward +u and +v) and the height (z).
struct Tap { vec3 c; vec2 s; float h; };
Tap tap(sampler2D colour, sampler2D nh, vec2 at, float lod) {
  vec3 k = textureLod(nh, at, lod).rgb;
  return Tap(textureLod(colour, at, lod).rgb, vec2(0.5 - k.r, k.g - 0.5) * 2.0, k.b);
}
float lodAt(vec2 gx, vec2 gy, float texels) {
  return 0.5 * log2(max(max(dot(gx, gx), dot(gy, gy)), 1e-14)) + log2(texels);
}
// The granite on one plane of the rock. p is metres on the plane (x across, y up the beds), gx and gy its change over a pixel.
// It comes back as colour over the sheet's mean (1 is the mean), slope and height, the three sizes together.
Tap granite(vec2 p, vec2 gx, vec2 gy, float shift) {
  // The beds: 15 m by 10 m, upright as the sheet has them.
  vec2 a = p / vec2(15.0, 10.0) + shift;
  float lodA = lodAt(gx / 15.0, gy / 15.0, 1536.0);
  Tap A = tap(tGran, tGranNh, a, lodA);
  // The masses: the same rock 4.3 times larger, turned a little, so slabs of 20 to 60 m carry the face from far off.
  vec2 b = vec2(0.94 * p.x + 0.34 * p.y, -0.34 * p.x + 0.94 * p.y) / vec2(64.0, 43.0) + 0.37 + 1.7 * shift;
  Tap B = tap(tGran, tGranNh, b, lodA - 2.1);
  vec3 c = (A.c / GRAN_MEAN) * mix(vec3(1.0), B.c / GRAN_MEAN, 0.3 * smoothstep(-3.3, -1.0, lodA - 2.1));
  // (Under a lens some metres off a texel of the masses is many pixels, and what they hold is a soft stain: it is let go.)
  float far_ = smoothstep(-3.3, -1.0, lodA - 2.1);
  vec2 s = A.s * 0.7 + vec2(0.94 * B.s.x - 0.34 * B.s.y, 0.34 * B.s.x + 0.94 * B.s.y) * far_;
  float h = mix(A.h, 0.55 * A.h + 0.45 * B.h, far_);
  // Under the lens a texel of the beds is many pixels: the rock again 5.6 times finer, turned the other way, as grain and small edges.
  float fine = smoothstep(1.6, -0.4, lodA);
  if (fine > 0.01) {
    vec2 d = vec2(0.97 * p.x - 0.24 * p.y, 0.24 * p.x + 0.97 * p.y) / vec2(2.7, 1.8) + 0.61 - shift;
    Tap D = tap(tGran, tGranNh, d, lodA + 2.47);
    c *= mix(vec3(1.0), clamp(D.c / GRAN_MEAN, 0.6, 1.6), 0.4 * fine);
    s += fine * 0.6 * vec2(0.97 * D.s.x + 0.24 * D.s.y, -0.24 * D.s.x + 0.97 * D.s.y);
    h = mix(h, 0.7 * h + 0.3 * D.h, fine);
  }
  return Tap(c, s, h);
}

// The slabs: the rock cut by three sets of joints (the sheets a face is made of, the uprights across them, the beds), in pieces of no two
// lengths. Worked from the place itself, so the edge of a slab is as hard as the lens is close: no sheet and no baked map holds an edge
// under a lens that stands four metres off.
float hash1(float n, float s) {
  return fract(sin(n * 127.1 + s * 311.7) * 43758.5453);
}
// A line cut in pieces: which piece (x), metres from its low end (y) and to its high end (z).
vec3 pieceOf(float c, float mean, float seed) {
  float x = c / mean;
  float i = floor(x);
  float e0 = i + 0.7 * (hash1(i, seed) - 0.5);
  float e1 = i + 1.0 + 0.7 * (hash1(i + 1.0, seed) - 0.5);
  if (x < e0) {
    i -= 1.0;
    e1 = e0;
    e0 = i + 0.7 * (hash1(i, seed) - 0.5);
  } else if (x >= e1) {
    i += 1.0;
    e0 = e1;
    e1 = i + 1.0 + 0.7 * (hash1(i + 1.0, seed) - 0.5);
  }
  return vec3(i, (x - e0) * mean, (e1 - x) * mean);
}
// One size of slab at p (metres in the frame of the beds), on a face that looks along nl: the turn of the slab's own face (xy, -1 to 1),
// how far its nearest edge is along the face (z, metres) and its number (w, 0 to 1).
vec4 slabAt(vec3 p, vec3 nl, float tall, float wide, float deep, float key) {
  const vec3 SHEET = vec3(-0.2121, 0.0771, 0.9642);
  const vec3 ACROSS = vec3(0.9524, 0.0, 0.3048);
  const vec3 BEDS = vec3(0.2408, 0.9631, 0.0963);
  vec3 k = pieceOf(dot(p, SHEET), deep, key);
  float kk = hash1(k.x, key + 5.0) * 97.0;
  vec3 j = pieceOf(dot(p, ACROSS) + 0.37 * wide * kk, wide, kk);
  float jj = hash1(j.x, kk + 11.0) * 89.0;
  vec3 i = pieceOf(dot(p, BEDS) + tall * jj, tall, jj);
  float id = hash1(i.x, jj + 3.0);
  // A joint that meets the face aslant is far along the face for a little way through the rock. The beds are closed by the weight on
  // them: their line is half as wide.
  vec3 through = vec3(dot(nl, SHEET), dot(nl, ACROSS), dot(nl, BEDS));
  vec3 run = inversesqrt(max(1.0 - through * through, 0.03));
  float edge = min(min(min(k.y, k.z) * run.x, min(j.y, j.z) * run.y), min(i.y, i.z) * run.z * 2.0);
  return vec4(2.0 * hash1(id * 613.0, 13.0) - 1.0, 2.0 * hash1(id * 613.0, 17.0) - 1.0, edge, id);
}
// One size laid on a face, as far as a slab of it is some pixels wide (px: metres a pixel): its turn and its tone. No line is drawn for its
// joint: a joint is where two faces meet that look two ways.
void slabLevel(vec3 p, vec3 nl, float px, float tall, float wide, float deep, float key, float turn, inout vec2 t, inout float tone) {
  float seen = smoothstep(2.5, 7.0, wide / px);
  if (seen <= 0.0) return;
  vec4 s = slabAt(p, nl, tall, wide, deep, key);
  t += seen * turn * vec2(s.x, 0.5 * s.y);
  tone *= mix(1.0, 0.8 + 0.4 * s.w, seen);
}

// The bedrock where it lies level and breaks through the snow (land/outcrop, 8 m): frost-shattered, dark, with snow lodged in it.
Tap bedrock(vec2 p, vec2 gx, vec2 gy) {
  float lodA = lodAt(gx / 8.0, gy / 8.0, 1248.0);
  Tap A = tap(tCrop, tCropNh, p / 8.0, lodA);
  vec2 b = vec2(0.91 * p.x - 0.42 * p.y, 0.42 * p.x + 0.91 * p.y) / 29.0 + 0.27;
  Tap B = tap(tCrop, tCropNh, b, lodA - 1.86);
  return Tap((A.c / CROP_MEAN) * mix(vec3(1.0), B.c / CROP_MEAN, 0.45), A.s + vec2(0.91 * B.s.x + 0.42 * B.s.y, -0.42 * B.s.x + 0.91 * B.s.y), 0.6 * A.h + 0.4 * B.h);
}

void main() {
  float dCanal = vSL.x - MOUTH_S;
  vec3 smoothN = normalize(vNormal);
  if (!gl_FrontFacing) smoothN = -smoothN;
  vec3 toCamera = cameraPosition - vWorld;
  float far = length(toCamera);
  vec3 v = toCamera / far;
  const bool spire = KIND == 1;
  // The rock over the canal is the spire's own face, carried by the ground.
  float porch = 0.0;
  if (ground) porch = dCanal > 0.0 && dCanal < EXIT ? 1.0 - smoothstep(4.0, 26.0, abs(vSL.y - canalAt(dCanal)) - flareAt(dCanal)) : 0.0;
  vec3 n0 = smoothN;
  vec3 baked = vec3(1.0, 0.5, 0.5);
  float facet = 1.0;
  float across = 0.0;
  float held = 1.0;

  // The frame of the beds: up along the lean of a spire (straight up on the ground), and the two level ways across.
  vec3 up = normalize(vUp);
  vec3 bx = spire ? normalize(vec3(up.z, 0.0, -up.x)) : vec3(0.0, 0.0, 1.0);
  vec3 ax = spire ? cross(bx, up) : vec3(1.0, 0.0, 0.0);
  vec3 P = vec3(dot(vWorld, ax), dot(vWorld, up), dot(vWorld, bx));
  vec3 Px = dFdx(P);
  vec3 Py = dFdy(P);
  // (The plane a face is read on is the plane the triangle itself lies nearest: at a step the shading normal says level and the face is a wall.)
  vec3 ng = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  if (dot(ng, n0) < 0.0) ng = -ng;
  // A cliff of the ground is a few tall quads between two heights, and the round of the mesh says it is level: there the face is the
  // triangle's own, so its rock is laid on the plane it stands in and no snow lies on a wall.
  if (ground) n0 = normalize(mix(n0, ng, smoothstep(0.12, 0.4, n0.y - ng.y)));
  // (Taken here, before any branch: what a branch needs of them it is handed.)
  vec2 snowQ = vec2(dot(vWorld.xz, vec2(0.98, -0.2)), dot(vWorld.xz, vec2(0.2, 0.98))) + 7.0 * vec2(vnoise(vWorld.xz / 63.0 + 3.1), vnoise(vWorld.xz / 63.0 + 17.7));
  vec2 snowQx = dFdx(snowQ);
  vec2 snowQy = dFdy(snowQ);
  float footprint = length(fwidth(vWorld.xz));
  float slabTone = 1.0;
  // (The face before its slabs are cut: what is heaped on the rock lies on this.)
  vec3 nFace = n0;
  if (spire) {
    // The slabs smaller than the mesh can cut, in three sizes: each turns its face a little its own way.
    float px = max(length(Px), length(Py));
    float side = length(n0.xz);
    vec3 hz = vec3(n0.z, 0.0, -n0.x) / max(side, 1e-3);
    vec3 np = vec3(dot(n0, ax), dot(n0, up), dot(n0, bx));
    vec2 t = vec2(0.0);
    slabLevel(P, np, px, 15.0, 3.2, 2.4, 3.0, 0.45, t, slabTone);
    slabLevel(P, np, px, 7.0, 1.15, 0.9, 41.0, 0.38, t, slabTone);
    slabLevel(P, np, px, 3.0, 0.4, 0.33, 77.0, 0.26, t, slabTone);
    t *= smoothstep(0.15, 0.5, side);
    t.y = max(t.y, -0.08);
    n0 = normalize(n0 + hz * t.x + cross(n0, hz) * t.y);
    // The rig's lights are broad and a slab's turn of some degrees would hardly show in them: the low source is counted again on the turn.
    facet = clamp(1.0 + 2.0 * (dot(n0, KEY_DIR) - dot(smoothN, KEY_DIR)), 0.45, 1.55);
  }
  vec3 nb = normalize(n0 + ng);
  vec3 nl = vec3(dot(nb, ax), dot(nb, up), dot(nb, bx));
  // Each face takes the plane it looks at most squarely, and its neighbour only in a narrow turn between them: nothing is pulled long.
  vec3 w = pow(abs(nl), vec3(6.0));
  w /= w.x + w.y + w.z;

  // How much of this place is rock standing out of the snow, before the rock's own relief has its say.
  float rockness = spire ? 1.0 : max(clamp(vTop, 0.0, 1.0), porch);
  float lee = dot(n0.xz, uWind.xz);
  float thin = 0.0;
  if (ground) thin = smoothstep(30.0, 9.0, length(vWorld.xz - uScorch.xy));
  float steep = smoothstep(0.82, 0.5, n0.y);
  float show = spire ? 1.0 : max(rockness, max(steep, 0.55 * thin));

  vec3 rock = vec3(1.0);
  vec3 dn = vec3(0.0);
  float pit = 0.5;
  if (show > 0.01) {
    rock = vec3(0.0);
    pit = 0.0;
    if (w.x > 0.02) {
      Tap t = granite(P.zy, Px.zy, Py.zy, 0.0);
      rock += w.x * t.c;
      dn += w.x * (bx * t.s.x + up * t.s.y);
      pit += w.x * t.h;
    }
    if (w.z > 0.02) {
      Tap t = granite(P.xy + 23.7, Px.xy, Py.xy, 0.29);
      rock += w.z * t.c;
      dn += w.z * (ax * t.s.x + up * t.s.y);
      pit += w.z * t.h;
    }
    if (w.y > 0.02) {
      // What lies level is broken across its beds: the same rock from above, turned.
      vec2 q = vec2(0.8 * P.x + 0.6 * P.z, -0.6 * P.x + 0.8 * P.z);
      vec2 qx = vec2(0.8 * Px.x + 0.6 * Px.z, -0.6 * Px.x + 0.8 * Px.z);
      vec2 qy = vec2(0.8 * Py.x + 0.6 * Py.z, -0.6 * Py.x + 0.8 * Py.z);
#if KIND == 0
      Tap t = bedrock(q + 51.3, qx, qy);
#else
      Tap t = granite(q + 51.3, qx, qy, 0.63);
#endif
      rock += w.y * t.c;
      dn += w.y * ((0.8 * ax + 0.6 * bx) * t.s.x + (-0.6 * ax + 0.8 * bx) * t.s.y);
      pit += w.y * t.h;
    }
    float sum = (w.x > 0.02 ? w.x : 0.0) + (w.y > 0.02 ? w.y : 0.0) + (w.z > 0.02 ? w.z : 0.0);
    rock /= sum;
    dn /= sum;
    pit /= sum;
  }
  vec3 nRock = normalize(n0 + 0.9 * dn);
  // The grain of a sheet may tip a face up, hardly down: what looks down is in the dark of the ground, and a face so tipped grain by grain
  // is a black speckle no encoder holds. The dark of an overhang is the overhang's own, in one piece.
  nRock.y = n0.y + (max(nRock.y, n0.y - 0.06) - n0.y) * smoothstep(-0.2, 0.3, n0.y);
  nRock = normalize(nRock);
  // The face of the triangle itself: a step between two blocks is one quad of the lattice, and nothing level lies on it.
  float flat_ = abs(ng.y);

  // Colour: warm tan slabs with colder planes between, in masses larger than any sheet.
  float bed = vnoise(vec2(dot(vWorld, vec3(0.011, 0.034, 0.017)), dot(vWorld.xz, vec2(0.004, -0.003))) * 3.0);
  float blotch = vnoise(vWorld.xz * 0.021 + vWorld.y * 0.013);
  vec3 tone = mix(vec3(0.72, 0.78, 0.9), vec3(1.08, 1.0, 0.9), smoothstep(0.25, 0.75, 0.6 * bed + 0.4 * blotch));
  // Pale ochre granite: the sheet gives the breaks and the grain, less of its own colour and of its darks.
  float rockLuma = dot(rock, LUMA);
  vec3 grain = pow(mix(vec3(rockLuma), rock, ground ? 0.25 : 0.6), vec3(0.85));
  // (The sheet's own darks are soot at this size: half of them. The darks of the rock are its cracks and the faces turned from the light.)
  if (spire) grain = mix(grain, max(grain, vec3(0.92)), 0.6);
  // (The bedrock of the ground is darker than the faces of the spires: it is wet with melt and in the snow's shadow. A wall of it stands
  // clear of both and is paler.)
  vec3 albedo = min((ground ? mix(vec3(0.13, 0.135, 0.15), vec3(0.33, 0.315, 0.3), steep) : vec3(0.6, 0.56, 0.505)) * grain * tone, vec3(0.85));
  float rough = 0.9;
  // Its cracks are dark: the sky does not reach into them.
  float occ = 0.55 + 0.45 * smoothstep(0.1, 0.55, pit);
  albedo *= slabTone * facet;
  if (spire) occ *= 0.45 + 0.55 * smoothstep(-5.0, 0.5, vRelief);

  // The burn: the top of a spire is black glass where the lightning has come to it, time after time, and streaked below.
  float burn = 0.0;
  if (spire) {
    float ragged = vnoise(vWorld.xz * 0.21 + vWorld.y * 0.05) * 14.0 + vnoise(vec2(dot(vWorld.xz, vec2(0.7, 0.7)) * 0.9, vWorld.y * 0.06)) * 22.0;
    burn = smoothstep(52.0, 16.0, vTop + ragged - 12.0);
    albedo = mix(albedo, vec3(0.011, 0.011, 0.013) * (0.6 + 0.8 * pit), burn);
    rough = mix(rough, 0.45, burn);
  }
  // Staged by shot (uWet): in the long lens of the strike the struck spire is wet black rock.
  if (spire) {
    albedo *= mix(1.0, 0.3, uWet);
    rough = mix(rough, 0.3, uWet);
  }

  // Snow lies where a face leans back far enough to hold it: on every ledge and in the hollows of the rock, deeper in the lee. The rock's
  // own relief cuts its edge, so the line where snow meets stone is broken at the size of the stone.
  float drift = vnoise(vWorld.xz / 47.0 + 7.3);
  float lie = nRock.y * 0.3 + mix(n0.y, nFace.y, 0.8) * 0.7 + 0.2 * (0.5 - pit) + 0.1 * lee + 0.16 * (drift - 0.5);
  // (On the ground the snow is deep: it leaves bare only what stands well out of it, and its edge on the stone is hard.)
  // (Its edge follows the lie of the ground more than the grain of the sheet, which seen aslant is pulled into streaks.)
  if (ground) lie += 0.2 - 0.3 * rockness + 0.18 * (n0.y - nRock.y);
  float hold = spire ? 0.5 + 0.08 * smoothstep(-1.0, 2.0, vRelief) : mix(0.5, 0.86, max(rockness, steep)) + 0.1 * thin;
  float snow = show > 0.01 ? smoothstep(hold, hold + (ground ? 0.035 : 0.1), lie) : 1.0;
  snow *= 1.0 - burn;
  if (spire) snow *= mix(1.0, smoothstep(-0.15, 0.3, lee), uWet);
  // Just above the snow the rock is wet and dark, and frost stands in its cracks.
  float brim = show > 0.01 ? smoothstep(hold - 0.22, hold, lie) * (1.0 - snow) : 0.0;
  albedo *= 1.0 - 0.2 * brim;
  float frost = (1.0 - snow) * (1.0 - burn) * smoothstep(0.34, 0.16, pit) * smoothstep(-0.2, 0.5, n0.y + 0.4 * -lee) * (1.0 - 0.8 * uWet);
  albedo = mix(albedo, vec3(0.6, 0.65, 0.72), 0.5 * frost);

  // Rime: on what looks into the gale the frost has grown in plumes, thick on windward faces and on edges, none in the lee.
  vec3 nRime = nFace;
  float stripped = 1.0;
  float windward = 0.0;
  float rime = 0.0;
  if (show > 0.01) {
    float leeFace = mix(lee, dot(nFace.xz, uWind.xz), 0.75);
    float expose = clamp(0.36 - 1.0 * leeFace + 0.3 * nFace.y + 0.55 * windward, 0.0, 1.0) * (ground ? 0.45 * steep : 1.0) * (1.0 - burn) * (1.0 - 0.8 * uWet) * stripped;
    if (expose > 0.1) {
      vec2 rp = w.x >= w.z && w.x >= w.y ? P.zy : w.z >= w.y ? P.xy : P.xz;
      vec2 rx = w.x >= w.z && w.x >= w.y ? Px.zy : w.z >= w.y ? Px.xy : Px.xz;
      vec2 ry = w.x >= w.z && w.x >= w.y ? Py.zy : w.z >= w.y ? Py.xy : Py.xz;
      vec3 e0 = w.x >= w.z && w.x >= w.y ? bx : ax;
      vec3 e1 = w.x >= w.z && w.x >= w.y ? up : w.z >= w.y ? up : bx;
      float lodR = lodAt(rx / 4.5, ry / 4.5, 1024.0);
      // (Read a little soft: the plumes are clumps, and a mask cut at the size of a texel is a speckle no encoder holds.)
      // The sheet is the frost itself, plumes with the rock dark between them: it is laid as it is, in masses of some metres, thick where
      // the face looks into the gale and gone where it turns from it. Nothing is cut at the size of a texel.
      Tap F = tap(tFrost, tFrostNh, rp / vec2(6.0, 4.0) + 0.19, lodR - 0.4);
      float mass = vnoise(rp / 5.5 + 2.7) * 0.65 + vnoise(rp / 1.9 + 8.1) * 0.35;
      float plume = dot(F.c, LUMA) / FROST_LUMA;
      rime = smoothstep(0.42, 0.72, expose + 0.5 * (mass - 0.5) + 0.12 * (plume - 1.0)) * smoothstep(0.1, 0.3, expose);
      nRime = normalize(mix(n0, nFace, 0.7) + vec3(0.0, 0.45, 0.0) + 0.9 * (e0 * F.s.x + e1 * F.s.y));
      // (Heaped, it is white: the rock between the plumes is under it.)
      albedo = mix(albedo, mix(clamp(F.c / FROST_LUMA, 0.3, 1.8), clamp(0.75 * F.c / FROST_LUMA + 0.5, 0.85, 1.65), smoothstep(0.5, 1.0, expose)) * vec3(0.56, 0.585, 0.63), rime);
      rough = mix(rough, 1.0, rime);
      nRock = normalize(mix(nRock, nRime, rime));
      occ = mix(occ, max(occ, 0.8), rime);
    }
  }

  // The snow's own surface: the wind pack laid across the gale at two sizes, and the prints.
  // (Snow lies over the joints of the rock: it has the face's lean, hardly the slabs'.)
  vec3 nUnder = normalize(mix(n0, nFace, 0.8));
  vec3 nSnow = nUnder;
  float snowOcc = 1.0;
  vec3 snowTint = vec3(1.0);
  if (snow > 0.0) {
    // (No two fields of sastrugi run alike: the pack is pulled about over some 60 m, and in places the wind has polished it flat.)
    vec2 q = snowQ;
    float rippled = 0.35 + 0.65 * smoothstep(0.3, 0.7, vnoise(vWorld.xz / 41.0 + 9.2));
    vec2 qx = snowQx;
    vec2 qy = snowQy;
    // On a steep face a level picture would be pulled long: there the snow keeps its tone and loses its ripple.
    float level = smoothstep(0.45, 0.8, min(min(n0.y, smoothN.y), flat_));
    float lodP = lodAt(qx / 9.0, qy / 9.0, 1536.0);
    Tap A = tap(tPack, tPackNh, q / vec2(9.0, 6.0), lodP);
    vec2 r = vec2(0.77 * q.x - 0.64 * q.y, 0.64 * q.x + 0.77 * q.y);
    Tap B = tap(tPack, tPackNh, r / vec2(38.0, 25.0) + 0.43, lodP - 2.08);
    float field = smoothstep(0.35, 0.65, vnoise(vWorld.xz / 29.0 + 4.4));
    vec2 g = rippled * (A.s * 0.5 * (1.0 - 0.8 * field) + vec2(0.77 * B.s.x + 0.64 * B.s.y, -0.64 * B.s.x + 0.77 * B.s.y) * 0.6 * (0.35 + 0.65 * field));
    snowTint = mix(vec3(1.0), mix(vec3(1.0), A.c / PACK_MEAN, 1.0 - 0.8 * field) * mix(vec3(1.0), B.c / PACK_MEAN, 0.3 + 0.5 * field), 0.7 * level);
    snowOcc = mix(1.0, 0.72 + 0.28 * smoothstep(0.15, 0.6, 0.5 * A.h + 0.5 * B.h), level);
    float fine = smoothstep(0.012, 0.003, footprint) * level;
    if (fine > 0.01) {
      Tap D = tap(tPack, tPackNh, q.yx / vec2(1.9, 1.27) + 0.37, lodP + 2.24);
      g += fine * 0.4 * D.s.yx;
      snowTint *= mix(vec3(1.0), D.c / PACK_MEAN, 0.5 * fine);
    }
#if KIND == 0
    // The prints of the herd: a line of pits to the mouth, seen as far as a pit is wider than a pixel.
    float seen = smoothstep(0.3, 0.08, footprint);
    if (seen > 0.0) {
      vec3 p = prints(vSL);
      g += 1.6 * p.yz * seen;
      snowOcc *= 1.0 + 0.85 * min(p.x, 0.0) * seen;
    }
#endif
    // (The pack's slopes are on its own two level ways: back to the world's.)
    vec2 gw = vec2(0.98 * g.x + 0.2 * g.y, -0.2 * g.x + 0.98 * g.y);
    nSnow = normalize(nUnder + level * vec3(gw.x, 0.0, gw.y));
    // On a ledge of the rock the snow takes a little of the rock's tilt, softened: it is a cap on a block, not a sheet.
    nSnow = normalize(nSnow + mix(0.5, 0.25, level) * show * (nRock - n0));
  }
  vec3 n = normalize(mix(nRock, nSnow, snow));
  // Wind-packed snow is matt: nearly white, a little blue where the pack is glazed.
  albedo = mix(albedo, vec3(0.8, 0.83, 0.88) * clamp(snowTint, 0.55, 1.15), snow);
  rough = mix(rough, 1.0, snow);
  // Against a rock that stands out of it the snow lies in the rock's shadow.
  occ = mix(occ, snowOcc * (1.0 - 0.3 * show * smoothstep(hold + 0.25, hold + 0.05, lie)), snow);
  if (!spire) occ *= landHollow(vWorld, n0, 5.0);
${scorch}
  // The rock that stands over the canal is in the open, though the canal's roof is behind it: it is lit as from above that roof.
  vec3 lightAt = vWorld;
  if (dCanal > 0.0 && dCanal < EXIT && abs(vSL.y - canalAt(dCanal)) < 60.0) lightAt.y += 16.0;
  vec3 c = rigShade(lightAt, n, v, albedo, rough, occ);
  gl_FragColor = vec4(rigOut(c), 1.0);
}
`;
