// The stone of a blade. A blade is one whole thing, so it is drawn from one whole picture: the Builder's blade seen side on, rectified to
// a sheet (land/fin.jpg and its heights), laid once over each broad face by (part across, part along the spine). Its ledges, flutes and
// holes are raised out of the blade in the vertex shader, and the light falls on its slopes turned into the world by the ring's own
// frame (aAlong, aAcross): no screen derivative, so nothing hatches at a distance. The bone tile only breaks it up close.
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { openingText } from '../shared/opening';

// The beds of a blade at a place: which course, how far up it (0 at its foot, 1 under the ledge that ends it), and how strong the ledge is there.
const BEDDING = /* glsl */ `
vec3 bedding(vec3 p) {
  float b = (p.y + 0.16 * p.x - 0.11 * p.z + 14.0 * sin(p.x * 0.004 + p.z * 0.006)) / 8.5;
  float c = b + 0.3 * sin(b * 2.1) + 0.12 * sin(b * 5.3 + 1.0);
  float k = floor(c);
  float along = (p.x + p.z) * 0.021 + 0.013 * p.y;
  float strong = 0.5 + 0.5 * sin(k * 12.9898 + along + 1.3 * sin(along * 2.7 + k));
  return vec3(k, c - k, smoothstep(0.25, 0.6, strong));
}`;

export const FIN_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vBlade;
varying vec3 vNb;
varying vec2 vLay;
varying vec3 vAlong;
varying vec3 vAcross;
varying vec3 vBase;
attribute vec4 aBlade;
attribute vec3 aNb;
attribute vec3 aAlong;
attribute vec3 aAcross;
uniform sampler2D tWideN;
uniform float uLift;
uniform float uTide;
${BEDDING}
void main() {
  vLay = uv;
  float proud = textureLod(tWideN, vec2(uv.x, 0.215 + 0.78 * uv.y), 2.0).z - 0.5;
  // The blade is bedded across: courses some eight metres thick, each standing a little over the one under it and stepping back at its
  // top, so that every course ends in a ledge. A ledge runs a way and dies out; no flute runs the length of the blade.
  vec3 bed = bedding(position);
  float lifted = proud * uLift * 0.55 + 1.7 * bed.z * (bed.y - 0.5);
  // Under the weed line the stone never stands out of its own weed: there it is only cut back.
  lifted = mix(min(lifted, 0.0), lifted, smoothstep(uTide + 6.0, uTide + 24.0, position.y));
  vBase = position;
  vec4 w = modelMatrix * vec4(position + normal * lifted, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vBlade = aBlade;
  vNb = aNb;
  vAlong = aAlong;
  vAcross = aAcross;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const FIN_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vBlade;
varying vec3 vNb;
varying vec2 vLay;
varying vec3 vAlong;
varying vec3 vAcross;
varying vec3 vBase;
${RIG_GLSL}
${NOISE_GLSL}
uniform sampler2D tRock;
uniform sampler2D tWide;
uniform sampler2D tWideN;
uniform sampler2D tWeed;
uniform float uTide;
uniform sampler2D tColony;
uniform sampler2D tColonyN;
uniform float uGrain;
uniform float uLift;
uniform float uRock;
uniform float uCap;
${BEDDING}
// The level of a picture for a pixel's foot, by its long side: a little soft at a slant, and it never crawls.
float levelOf(sampler2D t, vec2 dx, vec2 dy) {
  vec2 size = vec2(textureSize(t, 0));
  return log2(max(max(length(dx * size), length(dy * size)), 1e-6));
}
// How much of the rock's own marks the blades carry: faint, as asked. The wide view keeps its fine detail from the near ground, which the
// camera's shutter no longer smears (film.maxSmearShare): 0.96 of the approved picture's at the final tier, against a floor of 0.75.
const float BLADE_MARKS = 0.55;
void main() {
  vec3 n0 = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 w = abs(normalize(vNb));
  w *= w;
  // 0 on a broad face, 1 on the thin edge of the blade.
  float edge = smoothstep(0.3, 0.7, w.y / (w.y + w.z + 1e-4));
  // The metres one pixel covers here: every picture laid by the world takes its level from it.
  float foot = max(length(dFdx(vWorld)), length(dFdy(vWorld)));
  float macro = vnoise(vWorld.xz * 0.006 + vWorld.y * 0.004) * 0.6 + vnoise(vBlade.yx * vec2(0.06, 0.027) + 5.0) * 0.4;

  // The rock itself is laid by the world, never along the blade: on the upright plane the face looks along (z, height where it looks
  // along x; x, height where it looks along z) and on the level plane where it looks up or down. Its beds dip and wander, and the
  // picture goes to and fro up the blade so that it has no seam.
  float h2 = n0.x * n0.x + n0.z * n0.z;
  float facing = smoothstep(0.42, 0.58, n0.x * n0.x / (h2 + 1e-5));
  float level0 = smoothstep(0.62, 0.76, abs(n0.y));
  float bedY = vWorld.y + 0.16 * vWorld.x - 0.11 * vWorld.z + 22.0 * (macro - 0.5);
  float up = bedY / (0.78 * uRock);
  float fro = abs(fract(up * 0.5) * 2.0 - 1.0);
  float vq = 0.14 + 0.78 * fro;
  vec2 ucA = vec2(vWorld.z / uRock, vq);
  vec2 ucB = vec2(vWorld.x / uRock + 0.5, vq);
  vec2 ucT = vWorld.xz / uRock * vec2(1.0, 0.7) + vec2(0.0, 0.2);
  float lr = log2(max(foot * 1254.0 / uRock, 1e-6));
  vec3 rockA = vec3(0.3);
  vec3 rockB = vec3(0.3);
  vec3 rockT = vec3(0.3);
  if (facing > 0.001 && level0 < 0.999) rockA = textureLod(tColony, ucA, lr).rgb;
  if (facing < 0.999 && level0 < 0.999) rockB = textureLod(tColony, ucB, lr).rgb;
  if (level0 > 0.001) rockT = textureLod(tColony, ucT, lr).rgb;
  vec3 stone = mix(mix(rockB, rockA, facing), rockT, level0);
  // The same rock again, four times the size and turned: no repeat of the first is seen from far off.
  vec2 uf = (facing > 0.5 ? vWorld.zy : vWorld.xy) * mat2(0.83, 0.56, -0.56, 0.83) / 37.0 + 0.31;
  float far2 = 0.55 + 0.9 * vnoise(uf);
  vec2 uc = facing > 0.5 ? ucA : ucB;
  vec3 nhR = textureLod(tColonyN, uc, lr).rgb;
  float mirror = (1.0 - 2.0 * mod(floor(uc.x), 2.0));
  float froSign = fract(up * 0.5) < 0.5 ? -1.0 : 1.0;
  vec3 level1 = facing > 0.5 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);

  // The bone tile, small, only where the lens is near enough to see it: on the broad face by (across, along), on the edge by (through, along).
  vec2 a1 = vBlade.yx / uGrain;
  vec2 b1 = vBlade.zx / uGrain + 0.37;
  float la = log2(max(foot * 1024.0 / uGrain, 1e-6));
  float near = 1.0 - smoothstep(0.5, 2.5, la);
  vec3 dA = vec3(0.265);
  vec3 dB = vec3(0.265);
  if (near > 0.001 && edge < 0.999) dA = textureLod(tRock, a1, la).rgb;
  if (near > 0.001 && edge > 0.001) dB = textureLod(tRock, b1, la).rgb;
  float fineLum = mix(1.0, dot(mix(dA, dB, edge), vec3(0.333)) / 0.265, near);

  // The slopes of the sheet, turned into the world: across the face is aAcross, along the spine aAlong. And the rock's own, on its plane.
  vec2 gr = (nhR.xy - 0.5) * vec2(mirror, froSign) * (1.0 - level0);
  // The ledge at the top of a course looks up; the foot of the next one is in its shade.
  vec3 bed = bedding(vBase);
  float shelf = bed.z * smoothstep(1.0, 0.9, bed.y) * smoothstep(0.72, 0.9, bed.y);
  float shade = bed.z * smoothstep(0.16, 0.0, bed.y);
  vec3 lean = -(level1 * gr.x + vec3(0.0, 1.0, 0.0) * gr.y) * 2.0 + vec3(0.0, 0.9, 0.0) * shelf;
  lean -= n0 * dot(lean, n0);
  vec3 n = normalize(n0 + lean);

  // Pale bone-stone: the rock's own marks, grey-ivory (its rust kept only where lichen grows), under the broad lights and darks of the sheet.
  // The rock's marks are faint on the blades: the pale and the light carry them.
  stone = max(mix(vec3(0.19), stone, BLADE_MARKS - 0.6 * uCap), vec3(0.0));
  float stoneLum = dot(stone, vec3(0.333));
  float sunny = 0.5 + 0.5 * dot(n0, uSunDir);
  float field = vnoise(vWorld.xz * 0.019 + vWorld.y * 0.027 + 9.0) * 0.6 + vnoise(vWorld.xz * 0.11 + vWorld.y * 0.09) * 0.4;
  float lichen = smoothstep(0.68, 0.86, field + 0.4 * n0.y + 0.2 * (sunny - 0.5) + 0.22 * shelf + 0.04 * uCap);
  vec3 albedo = mix(vec3(stoneLum) * vec3(0.95, 1.0, 1.06), stone * vec3(1.15, 1.0, 0.85), 0.1 + 0.9 * lichen);
  albedo *= mix(1.75, 2.5, uCap) * vec3(0.97, 1.0, 1.04) * mix(1.0, clamp(far2, 0.4, 1.8), 0.45) * fineLum * (0.82 + 0.36 * macro);
  // Over hundreds of metres the stone changes: cold grey here, warm ivory there.
  albedo *= mix(vec3(0.94, 0.98, 1.04), vec3(1.07, 1.0, 0.9), smoothstep(0.3, 0.7, macro));
  // The near cliff's cap: pale layered stone, cream more than grey, its lichen in patches.
  if (uCap > 0.0) {
    vec3 cream = vec3(0.36, 0.34, 0.3) * clamp(stoneLum / 0.19, 0.55, 1.5) * fineLum * (0.85 + 0.3 * macro);
    cream = mix(cream, vec3(0.36, 0.17, 0.035) * clamp(stoneLum / 0.19, 0.6, 1.4), 0.5 * smoothstep(0.6, 0.7, field + 0.2 * shelf));
    albedo = mix(albedo, cream, 0.85 * uCap);
  }
  // White lies on the ledges and runs a little way down from them.
  float white = max(0.75 * shelf, 0.4 * bed.z * smoothstep(0.55, 0.9, bed.y) * smoothstep(0.9, 1.2, far2)) * smoothstep(0.45, 0.62, field);
  albedo = mix(albedo, vec3(0.62, 0.61, 0.58) * (0.7 + 0.5 * stoneLum / 0.19), white * (1.0 - 0.7 * lichen));

  float y = vWorld.y;
  float tide = uTide - 4.0 + 7.0 * (far2 - 1.0) + 3.0 * (field - 0.5);
  float weed = smoothstep(tide + 0.5, tide - 0.5, y);
  float band = smoothstep(tide + 5.0, tide + 0.5, y);
  float damp = smoothstep(tide + 40.0 + 30.0 * (macro - 0.5), tide + 2.0, y);
  // What runs down a face runs by the level way across it and the height.
  vec2 fall = vec2(mix(vBlade.w, vBlade.z, edge), y);
  // Seep: dark wet bands that follow the beds, a few to a blade, each broken along its length.
  float seep = smoothstep(0.6, 0.8, vnoise(vec2(bedY * 0.021, 7.0 + fall.x * 0.004)) * 0.7 + 0.3 * macro) * smoothstep(0.35, 0.6, field);
  albedo *= mix(vec3(1.0), vec3(0.6, 0.62, 0.62), 0.7 * seep);
  albedo *= mix(1.0, 0.5, damp * (1.0 - 0.85 * uCap)) * mix(1.0, 0.14, band);
  // The near cliff is one wet dark mass well above its weed: only its rim is pale.
  float wetWall = uCap * smoothstep(tide + 24.0 + 9.0 * (field - 0.5), tide + 13.0 + 9.0 * (field - 0.5), y);
  albedo = mix(albedo, vec3(0.036, 0.033, 0.026) * (0.5 + stoneLum / 0.19), 0.9 * wetWall);
  if (weed > 0.001) albedo = mix(albedo, texture2D(tWeed, fall / 7.0).rgb * 0.9, weed);
  float rough = mix(mix(0.92, 0.45, max(weed, band)), 0.72, wetWall * (1.0 - max(weed, band)));
  // The grooves and holes of the sheet hold shade; what hangs over sees the wet floor and not the sky.
  float occ = (0.8 + 0.2 * smoothstep(0.55, 1.0, fineLum)) * mix(1.0, 0.45, weed) * (1.0 - 0.5 * shade);
  occ *= 0.6 + 0.4 * smoothstep(-0.55, 0.25, n0.y);
  vec3 lit = rigShade(vWorld, n, v, albedo, rough, occ);
  // Against the light the edge of the stone burns.
  float rim = 1.0 - max(dot(n, v), 0.0);
  float back = max(dot(-v, uSunDir), 0.0);
  if (back * rim > 0.2) lit += albedo * uSunColour * (0.3 * rim * rim * rim * back * back * sunAt(vWorld, landAt(vWorld.xz)) * occ);
  gl_FragColor = vec4(rigOut(lit), 1.0);
}`;

// A stack of the gate, drawn from the Builder's own stack (land/stack-a.jpg, stack-b.jpg: 70 m of dark wet rock, its lower half hung with
// olive weed), laid round the pillar by (way round, height), mirrored where it meets itself; its seam is turned from the lens. Above the
// 70 m of the picture its upper rock goes on, to and fro.
export const STACK_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
${RIG_GLSL}
${NOISE_GLSL}
uniform sampler2D tStack;
uniform sampler2D tStackN;
uniform sampler2D tRock;
uniform sampler2D tWeed;
uniform vec4 uStack;
void main() {
  vec3 n0 = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  vec2 d = vWorld.xz - uStack.xy;
  float arc = atan(d.x, d.y) * uStack.z;
  float y = vWorld.y + 3.0 * (vnoise(vec2(arc / 23.0, 1.5)) - 0.5);
  float over = max(y - 60.0, 0.0) / 24.0;
  float vv = y < 60.0 ? 0.03 + y / 70.0 : 0.887 - 0.34 * abs(fract(over * 0.5) * 2.0 - 1.0);
  vec2 uc = vec2(arc / uStack.w, vv);
  vec2 flat0 = vec2(arc / uStack.w, vWorld.y / 70.0);
  vec2 size = vec2(textureSize(tStack, 0));
  float lv = log2(max(max(length(dFdx(flat0) * size), length(dFdy(flat0) * size)), 1e-6));
  float mirror = 1.0 - 2.0 * mod(floor(uc.x), 2.0);
  vec3 pic = textureLod(tStack, uc, lv).rgb;
  vec3 nhp = textureLod(tStackN, uc, lv).rgb;
  vec2 ud = vec2(arc, vWorld.y) / 3.0;
  vec2 sized = vec2(textureSize(tRock, 0));
  vec3 det = textureLod(tRock, ud, log2(max(max(length(dFdx(ud) * sized), length(dFdy(ud) * sized)), 1e-6))).rgb;
  float grain = dot(det, vec3(3.8));
  vec3 round0 = normalize(cross(vec3(0.0, 1.0, 0.0), n0) + vec3(1e-6, 0.0, 0.0));
  vec3 rise = normalize(cross(n0, round0));
  vec2 g = (nhp.xy - 0.5) * vec2(mirror, 1.0);
  vec3 n = normalize(n0 + (round0 * g.x - rise * g.y) * 1.1);
  float macro = vnoise(vec2(arc, vWorld.y) * 0.05) * 0.6 + vnoise(vec2(arc, vWorld.y) * 0.17 + 5.0) * 0.4;
  // The weed of the picture is wet and takes the sky; the rock over it is damp and dull.
  float weedy = smoothstep(0.02, 0.1, pic.r - pic.b) * smoothstep(48.0, 36.0, vWorld.y);
  // Close to, the picture is soft: the hanks of the weed tile and the grain of the rock tile are drawn into it.
  vec2 uw = vec2(arc, vWorld.y) / 5.0;
  float hank = dot(textureLod(tWeed, uw, log2(max(max(length(dFdx(uw) * 1024.0), length(dFdy(uw) * 1024.0)), 1e-6))).rgb, vec3(2.4));
  vec3 albedo = pic * 0.9 * mix(mix(1.0, grain, 0.6), clamp(hank, 0.3, 2.0), 0.85 * weedy) * (0.85 + 0.3 * macro);
  // Over the weed the stack is pale layered rock with lichen on it: the cap of the picture.
  float cap = smoothstep(19.0, 27.0, vWorld.y + 7.0 * (macro - 0.5));
  float lum = dot(pic, vec3(0.333));
  float rust = smoothstep(0.55, 0.68, vnoise(vec2(arc, vWorld.y) * 0.21 + 9.0) * 0.6 + vnoise(vec2(arc, vWorld.y) * 0.9) * 0.4);
  vec3 pale = vec3(0.39, 0.385, 0.365) * clamp(lum / 0.1, 0.8, 1.35) * mix(1.0, grain, 0.8) * (0.8 + 0.4 * macro);
  pale = mix(pale, vec3(0.3, 0.14, 0.03) * (0.6 + 0.6 * grain), 0.22 * smoothstep(0.1, 0.25, rust * macro));
  albedo = mix(albedo, pale, cap);
  weedy *= 1.0 - cap;
  float rough = mix(0.8, 0.42, weedy);
  float occ = 0.55 + 0.45 * smoothstep(0.25, 0.6, nhp.z);
  vec3 lit = rigShade(vWorld, n, v, albedo, rough, occ);
  vec3 fill = albedo * (skyIrradiance(vec3(0.0, 1.0, 0.0)) + 0.5 * uSunColour * cloudShade(vWorld)) * (0.2 / 3.14159) * (0.7 + 0.3 * occ);
  lit = max(lit, fill);
  float rim = 1.0 - max(dot(n, v), 0.0);
  float back = max(dot(-v, uSunDir), 0.0);
  lit += albedo * uSunColour * (0.3 * rim * rim * rim * back * back * sunAt(vWorld, landAt(vWorld.xz)) * occ);
  gl_FragColor = vec4(rigOut(lit), 1.0);
}`;

/**
 * A blade in the approach, seen from a mile out in the cloud's shade: what breaks its face at that distance is drawn in. Slabs have come away
 * and left paler stone, water has run down from the ledges and stained it, and each blade has its own (uOpenStone.y).
 * It goes with the distance (nothing of it within 300 m of the lens, where the stone's own sheet is seen) and is gone before the approach ends.
 */
export const FIN_OPENING_FRAGMENT = openingText(FIN_FRAGMENT, [
  ['uniform float uCap;', 'uniform float uCap;\nuniform vec2 uOpenStone;'],
  [
    '  vec3 bed = bedding(vBase);',
    `  vec3 bed = bedding(vBase);
  float openK = uOpenStone.x * smoothstep(300.0, 850.0, length(cameraPosition - vWorld));
  if (openK > 0.0) {
    // From a mile out the courses are not ruled up the whole blade: a stretch of ledges here, bare face there, each blade its own.
    float kept = smoothstep(0.46, 0.7, vnoise(vec2(vWorld.y * 0.015 + uOpenStone.y * 3.0, mix(vBlade.w, vBlade.z, edge) * 0.012 + uOpenStone.y)));
    bed.z *= mix(1.0, 0.1 + 0.9 * kept, openK);
  }`,
  ],
  // The first blade's pale cap is a thing of the near view. From a mile out it is rock like the rest, with the rock's own marks.
  ['BLADE_MARKS - 0.6 * uCap)', 'BLADE_MARKS - 0.6 * uCap * (1.0 - openK) - 0.07 * uCap * openK)'],
  ['albedo = mix(albedo, cream, 0.85 * uCap);', 'albedo = mix(albedo, cream, 0.85 * uCap * (1.0 - 0.9 * openK));'],
  [
    '  float y = vWorld.y;',
    `  if (openK > 0.0) {
    float sd = uOpenStone.y;
    vec2 face = vec2(mix(vBlade.w, vBlade.z, edge), vWorld.y);
    float slab = vnoise(face * vec2(0.012, 0.019) + sd * 3.7) * 0.62 + vnoise(face * vec2(0.04, 0.075) + sd * 9.1) * 0.38;
    float cutAt = 0.5 + 0.09 * fract(sd * 7.31);
    // A slab's edge is broken, never a drawn line: the finer field carries it in and out.
    float broken = vnoise(face * vec2(0.19, 0.23) + sd) - 0.5;
    float plate = smoothstep(cutAt - 0.05, cutAt + 0.07, slab + 0.11 * broken);
    float run = vnoise(vec2(face.x * 0.13 + sd * 5.0, face.y * 0.0045)) * 0.7 + vnoise(vec2(face.x * 0.41, face.y * 0.012 + sd)) * 0.3;
    float stain = smoothstep(0.5, 0.8, run + 0.2 * broken) * smoothstep(0.35, 0.6, vnoise(face * 0.006 + sd * 2.0));
    albedo *= mix(1.0, mix(0.88, 1.2, plate), openK);
    albedo *= mix(vec3(1.0), vec3(0.6, 0.62, 0.65), 0.5 * openK * stain * (1.0 - 0.5 * plate));
    // The wet foot: dark far above the weed where the swell throws its water, higher on the weather side.
    albedo *= mix(1.0, 0.34, openK * smoothstep(80.0 + 60.0 * (slab - 0.5), 14.0, vWorld.y));
  }
  float y = vWorld.y;`,
  ],
  [
    '  gl_FragColor = vec4(rigOut(lit), 1.0);',
    `  if (openK > 0.0) {
    // The break in the cloud stands behind the blades: the flank that turns from the lens toward it takes its light along the edge.
    // (By the blade's own form, not by its grooves: the light lies along the edge as one line.)
    float edge0 = 1.0 - max(dot(n0, v), 0.0);
    float edge4 = edge0 * edge0 * edge0 * edge0;
    // Only the edge on the break's side of the blade, as the lens sees them stand.
    vec3 aside = uSkyBreak - v * dot(uSkyBreak, v);
    float toBreak = smoothstep(-0.1, 0.6, dot(n0, normalize(aside)));
    lit += uSunColour * (0.24 * openK * edge4 * edge4 * edge0 * toBreak);
  }
  gl_FragColor = vec4(rigOut(lit), 1.0);`,
  ],
]);
