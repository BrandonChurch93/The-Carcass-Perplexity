// The first spire's rock. Its plates and slabs are its mesh (heroRock.ts): each quad of it brings its slab's own flat face, and the walls
// between slabs are faces too. On that: the baked small rock (assets-src/spine/land/bake-hero.mts) as normals and occlusion, the granite
// sheet at its real size on each slab, snow on what a slab turns up, rime on what it turns to the gale.
import { FIN_ROOT, fin, first } from '../ridge';

// The line of the first spire's lee edge across the blade, by height over the foot: where it is at the foot, and how far it goes to
// windward for a metre of height.
const edgeAt = (y: number): number => {
  const p = fin(first, (y + FIN_ROOT) / (first.tip + FIN_ROOT));
  return p.centre + p.half;
};
const LEE_RUN = (edgeAt(110) - edgeAt(270)) / 160;
const LEE_FOOT = edgeAt(110) + LEE_RUN * 110;

export const HERO_MAIN = /* glsl */ `
varying vec2 vUv;
flat varying vec2 vSlab;
flat varying vec3 vFace;
uniform sampler2D tHeroN;
uniform sampler2D tHeroM;
void main() {
  float dCanal = vSL.x - MOUTH_S;
  // The blade's round, and the face of the slab (or of the wall between two) that is drawn here.
  vec3 Nb = normalize(vNormal);
  vec3 toCamera = cameraPosition - vWorld;
  float far = length(toCamera);
  vec3 v = toCamera / far;
  float faced = dot(vFace, vFace);
  vec3 N = faced > 0.25 ? vFace / sqrt(faced) : Nb;
  N *= dot(N, v) < 0.0 ? -1.0 : 1.0;
  // The frame the maps were baked in: level across the blade toward the lee, and up the face.
  vec3 leeward = vec3(uSheet.z, 0.0, uSheet.w);
  vec3 T1 = leeward - N * dot(leeward, N);
  float flatOn = smoothstep(0.3, 0.75, dot(T1, T1));
  T1 = normalize(T1 + 1e-5);
  vec3 T2 = cross(N, T1);
  T2 *= T2.y < 0.0 ? -1.0 : 1.0;
  vec3 nm = texture2D(tHeroN, vUv).rgb * 2.0 - 1.0;
  vec3 mm = texture2D(tHeroM, vUv).rgb;
  float id = vSlab.x;
  // (A wall between two slabs is drawn out of a hand's breadth of the maps: it has no small rock of theirs, only its own.)
  vec3 n0 = normalize(N * max(nm.z, 0.2) + flatOn * (T1 * nm.x + T2 * nm.y));
  float wall = 1.0 - flatOn;

  // The granite, on the plane of the blade this side of it stands in, its beds up the lean; each slab has its own piece of the sheet.
  vec3 up = normalize(vUp);
  vec3 bx = normalize(vec3(up.z, 0.0, -up.x));
  vec3 ax = cross(bx, up);
  float pu = dot(vWorld, up);
  float pa = dot(vWorld, ax);
  float pb = dot(vWorld, bx);
  bool broad = abs(dot(N, bx)) > abs(dot(N, ax));
  vec2 atS = broad ? vec2(pa, pu) : vec2(pb, pu);
  vec2 gSx = dFdx(atS);
  vec2 gSy = dFdy(atS);
  atS += vec2(fract(id * 0.371) * 15.0, fract(id * 0.137) * 10.0);
  vec3 across = broad ? ax : bx;
  Lay A = lay(tGran, tGranNh, atS / vec2(15.0, 10.0), gSx / vec2(15.0, 10.0), gSy / vec2(15.0, 10.0));
  vec2 atB = vec2(0.96 * atS.x + 0.28 * atS.y, 0.96 * atS.y - 0.28 * atS.x) / vec2(58.0, 39.0) + 0.37;
  Lay B = lay(tGran, tGranNh, atB, gSx / vec2(58.0, 39.0), gSy / vec2(58.0, 39.0));
  float fineA = smoothstep(2.6, 0.6, lodOf(tGran, gSx / vec2(15.0, 10.0), gSy / vec2(15.0, 10.0)));
  vec3 rock = mix(B.c, A.c * mix(vec3(1.0), B.c / GRAN_MEAN, 0.5), fineA);
  rock = mix(GRAN_MEAN, rock, 0.55);
  float pit = mix(B.pit, 0.6 * A.pit + 0.4 * B.pit, fineA);
  vec2 t = A.t * 0.7 * fineA + B.t * 0.5;
  // Under the lens a texel of the sheet is many pixels: the same rock again five and a half times finer, turned, as its grain and small edges.
  float lodS = lodOf(tGran, gSx / vec2(15.0, 10.0), gSy / vec2(15.0, 10.0));
  float grain = smoothstep(1.4, -0.6, lodS);
  vec2 atD = vec2(0.97 * atS.x - 0.24 * atS.y, 0.24 * atS.x + 0.97 * atS.y) / vec2(2.7, 1.8) + 0.61;
  Lay D = lay(tGran, tGranNh, atD, gSx / vec2(2.7, 1.8), gSy / vec2(2.7, 1.8));
  rock *= mix(vec3(1.0), clamp(D.c / GRAN_MEAN, 0.6, 1.6), 0.4 * grain);
  t += grain * 0.7 * vec2(0.97 * D.t.x + 0.24 * D.t.y, -0.24 * D.t.x + 0.97 * D.t.y);
  pit = mix(pit, 0.6 * pit + 0.4 * D.pit, grain);
  vec3 nRock = normalize(n0 + across * t.x + up * t.y);

  // Grey rock, and warm tan where a slab has split off not long ago; the sheet of the spire gives its great masses their light and dark.
  float tone = vSlab.y;
  float grey = dot(rock, vec3(0.3, 0.5, 0.2));
  vec3 albedo = mix(vec3(grey) * vec3(0.72, 0.8, 0.96) * (0.6 + 0.6 * tone), rock * vec3(1.26, 1.1, 0.92), smoothstep(0.38, 0.6, tone)) * 1.55;
  vec2 sheetUv = vec2((dot(vWorld.xz - uSheet.xy, uSheet.zw) + uSheetShear * vWorld.y) * uSheetMap.x + uSheetMap.y, vWorld.y * uSheetMap.z + uSheetMap.w);
  vec3 sheetC = textureLod(tSheet, sheetUv, lodOf(tSheet, dFdx(sheetUv), dFdy(sheetUv))).rgb;
  albedo *= mix(1.0, clamp(0.5 + 0.5 * dot(sheetC, vec3(0.33)) / 0.16, 0.7, 1.25), smoothstep(0.035, 0.1, max(sheetC.r, max(sheetC.g, sheetC.b))));
  albedo = min(albedo, vec3(0.9));
  float rough = 0.85;
  float occ = mm.r * (0.6 + 0.4 * smoothstep(0.15, 0.6, pit)) * (1.0 - 0.6 * wall);
  // How far from the lee edge of the blade, metres: by the edge the rock is wet and near black, out on the face it is dry and lit,
  // and toward the windward edge the rime has it.
  float fromLee = ${LEE_FOOT.toFixed(2)} - ${LEE_RUN.toFixed(4)} * (${first.tip.toFixed(2)} - vTop) - dot(vWorld.xz - uSheet.xy, uSheet.zw);
  float ragLee = 9.0 * (vnoise(vec2(vUv.x * 90.0, vWorld.y * 0.045)) - 0.5) + 4.0 * (vnoise(vWorld.xz * 0.9 + vWorld.y * 0.6) - 0.5);
  albedo *= mix(0.2, 1.0, smoothstep(1.0, 12.0, fromLee + ragLee));
  albedo *= 0.25 + 0.75 * smoothstep(0.08, 0.6, mm.r);

  // The lee of the blade is dark, and its top is black glass where the lightning has come to it, time after time, and streaked below.
  float lee = dot(Nb.xz, uWind.xz);
  float leeRock = dot(n0.xz, uWind.xz);
  // A wall that looks down the wind is never rimed and never dry: near black.
  albedo = mix(albedo, albedo * vec3(0.2, 0.16, 0.13), wall * (0.8 + 0.2 * smoothstep(0.0, 0.5, leeRock)));
  albedo *= mix(1.0, 0.42, smoothstep(0.1, 0.8, 0.5 * lee + 0.5 * leeRock) * smoothstep(120.0, 40.0, vTop + 30.0 * tone));
  float ragged = vnoise(vWorld.xz * 0.21 + vWorld.y * 0.05) * 14.0 + vnoise(vec2(dot(vWorld.xz, vec2(0.7, 0.7)) * 0.9, vWorld.y * 0.06)) * 22.0 + 50.0 * fract(id * 0.618);
  float burn = smoothstep(60.0, 0.0, vTop - 38.0 + 0.8 * (ragged - 43.0));
  albedo = mix(albedo, vec3(0.011, 0.011, 0.013) * (0.6 + 0.8 * pit), burn);
  rough = mix(rough, 0.45, burn);

  // Snow lies on what a slab turns up to the sky: the ledge at its head, and deeper low down and to windward. The spire stands in the drift at its foot.
  float above = vWorld.y - landAt(vWorld.xz).r;
  float low = smoothstep(280.0, 20.0, above) * smoothstep(-0.25, 0.45, -lee);
  float lip = 0.22 * (vnoise(vWorld.xz * 1.7 + vWorld.y * 0.9) - 0.5) + 0.14 * (pit - 0.5);
  float held = 0.8 * n0.y + 0.2 * nRock.y + lip - 0.08 * leeRock;
  float snow = smoothstep(0.5 - 0.22 * low, 0.66 - 0.22 * low, held) * (1.0 - burn);
  snow = max(snow, smoothstep(5.0, 0.5, above + 3.0 * (pit - 0.5)));
  occ *= 0.55 + 0.45 * smoothstep(0.0, 14.0, above);
  snow *= mix(1.0, smoothstep(-0.15, 0.3, leeRock) * smoothstep(0.55, 0.8, n0.y), uWet);
  albedo *= mix(1.0, 0.3, uWet);
  rough = mix(rough, 0.3, uWet);

  // Rime: the frost sheet at its own 6 m by 4 m, feather on feather on what looks into the gale, thin in the cracks of the lee.
  Lay F = lay(tFrost, tFrostNh, atS / vec2(6.0, 4.0) + 0.23, gSx / vec2(6.0, 4.0), gSy / vec2(6.0, 4.0));
  float frostL = dot(F.c, vec3(0.33));
  float windward = smoothstep(0.02, 0.5, -(0.35 * lee + 0.65 * leeRock));
  float meets = mm.g * (0.45 + 0.55 * smoothstep(-0.4, 0.3, -lee));
  // (Rime grows in masses, feathered at their edges: not a salting of the whole face.)
  float mass = 0.6 * vnoise(vec2(pa + pb, pu) / 7.0 + 3.7) + 0.4 * vnoise(vec2(pa + pb, pu) / 2.2 + 9.1);
  float field = mass + 0.5 * (frostL - 0.25);
  float galeWall = wall * smoothstep(0.0, 0.5, -leeRock);
  float amount = 0.02 + 1.0 * smoothstep(16.0, 44.0, fromLee + 2.0 * ragLee) + 0.25 * windward + 0.3 * meets + 0.3 * smoothstep(0.2, 0.55, n0.y) + 0.3 * galeWall - 0.45 * wall * (1.0 - vnoise(vec2(pu / 3.1, (pa + pb) * 2.0) + 5.5)) + 0.2 * smoothstep(0.5, 0.2, mm.r);
  amount *= 1.0 - 0.8 * wall * smoothstep(0.0, 0.5, leeRock);
  float cover = 0.95 * smoothstep(-0.07, 0.07, field + amount - 1.0) * (1.0 - burn) * (1.0 - 0.85 * uWet);
  albedo = mix(albedo, min(mix(vec3(0.62, 0.8, 1.0), vec3(1.0, 0.9, 0.8), wall) * (0.85 + 0.9 * frostL), vec3(0.98)), cover);
  nRock = normalize(nRock + cover * 0.6 * (across * F.t.x + up * F.t.y));
  rough = mix(rough, 0.55, cover);
  occ = mix(occ, 0.75 + 0.25 * smoothstep(0.2, 0.6, frostL), 0.8 * cover);

  vec3 nSnow = normalize(mix(Nb, n0, 0.5) + vec3(0.0, 0.35, 0.0));
  vec3 n = normalize(mix(nRock, nSnow, snow));
  albedo = mix(albedo, vec3(0.74, 0.8, 0.9) * (0.7 + 0.5 * smoothstep(0.1, 0.5, frostL)), snow);
  rough = mix(rough, 0.8, snow);
  occ = mix(occ, 0.6 + 0.4 * mm.r, snow);

  // Ice on the arch: sheeting on the lip of the near mouth, thickest over its crown and in runs down its sides.
  if (dCanal > -42.0 && dCanal < 0.5 * EXIT && vWorld.y > CANAL_FLOOR - 0.2) {
    float r = flareAt(dCanal);
    vec2 over = vec2(vSL.y - canalAt(dCanal), vWorld.y - (CANAL_FLOOR + 0.62 * r));
    if (max(abs(over.x), abs(over.y)) < r + 2.6) {
      float g = mouthEdge(over, r);
      float crown = smoothstep(-0.3, 0.6, over.y / r);
      float runs = vnoise(vec2(vSL.y * 0.55, 3.3)) * 0.6 + vnoise(vec2(vSL.y * 1.9, 7.1)) * 0.4;
      float wide = mix(0.8, 4.5, crown) * (0.4 + 1.2 * runs);
      float holds = smoothstep(0.38, 0.56, vnoise(vec2(over.x * 0.3 + 3.0, over.y * 0.3 + 1.7)) * 0.7 + 0.3 * runs);
      float ice = g < 0.0 ? 1.0 : (1.0 - smoothstep(0.45 * wide, wide, g)) * smoothstep(-0.25, 0.1, over.y / r) * holds;
      albedo = mix(albedo, vec3(0.6, 0.68, 0.79) * (0.8 + 0.4 * runs), (g < 0.0 ? 0.9 : 0.8) * ice);
      rough = mix(rough, 0.22, ice);
      occ = mix(occ, 1.0, 0.7 * ice);
    }
  }
  vec3 lightAt = vWorld;
  if (dCanal > 0.0 && dCanal < EXIT && abs(vSL.y - canalAt(dCanal)) < 60.0) lightAt.y += 16.0;
  gl_FragColor = vec4(rigOut(rigShade(lightAt, n, v, albedo, rough, occ)), 1.0);
}
`;
