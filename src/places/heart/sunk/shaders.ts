// The surfaces of the one that sank. Both read the relief baked in shape.ts: the crust reads its own slope and hollows from it,
// the carcass reads how high it stands over the crust, which is where the lava that climbed it stops and where it is in shade.
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { BODY } from './shape';

const COMMON = /* glsl */ `
uniform sampler2D tRelief;
uniform sampler2D tMask;
uniform sampler2D tLines;
uniform vec4 uField;
uniform vec2 uTurn;
uniform vec2 uOrigin;
uniform float uTearKelvin;
uniform sampler2D tSkin;
uniform sampler2D tSkinNh;
uniform sampler2D tRopy;
uniform sampler2D tRopyNh;

// The count of the ropes outward from the body and the width of the rope there: the sums of shape.ts.
float ropeCount(float u) {
  float th = 1.7 * u + 0.6;
  return 2.5 * u + 6.0 * (0.375 * u - 0.5 * cos(th) / 1.7 - sin(2.0 * th) / 27.2);
}
float ropeWidth(float u) {
  float g = 0.5 + 0.5 * sin(1.7 * u + 0.6);
  return 1.0 / (2.5 + 6.0 * g * g);
}
vec2 fieldUv(vec2 l) { return (l - uField.xy) * uField.z; }
// The local frame to the world, for directions on the ground.
vec2 turned(vec2 l) { return vec2(l.x * uTurn.x - l.y * uTurn.y, l.x * uTurn.y + l.y * uTurn.x); }

// The light of the place on a surface of the carcass or of its folds. The same sums as rigShade, but the sky is hidden by what
// is baked here (the hollows, the body over the crust) and not by the round shades, which are for the crust beyond.
vec3 sunkShade(vec3 p, vec3 n, vec3 v, vec3 albedo, float rough, float occ) {
  vec4 land = landAt(p.xz);
  float open = mix(land.g, 1.0, clamp((p.y - land.r) / 80.0, 0.0, 1.0)) * occ;
  vec3 e = skyIrradiance(n) * open + (lakeIrradiance(p, n) + emitterIrradiance(p, n)) * occ;
  vec3 c = albedo * e / 3.14159;
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float f = (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * (1.0 - 0.8 * rough);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  vec3 env = mix(skyRadiance(r), skyIrradiance(n) / 3.14159, rough * rough);
  return c + f * env * open;
}
`;

export const FIELD_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec3 vLocal;
void main() {
  vLocal = position;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const FIELD_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vLocal;
${NOISE_GLSL}
${RIG_GLSL}
${COMMON}

// What the lake's crust mirrors, as the lake folder draws it: the rim of the folds is that crust and has to shine as it does.
vec3 crustMirror(vec3 r, float rough) {
  float wall = 0.16 + 0.2 * max(-r.z, 0.0);
  float soft = 0.05 + 0.5 * rough;
  float sky = smoothstep(wall - soft, wall + soft, r.y);
  float w = max(dot(normalize(vec3(r.x, max(r.y, 0.0), r.z)), uWarmDir), 0.0);
  vec3 low = uSkyHorizon * 0.5 + uWarmColour * w * w * w * 0.8;
  return mix(low, skyRadiance(vec3(r.x, max(r.y, wall), r.z)), sky);
}

void main() {
  vec2 l = vLocal.xz;
  float halfSpan = 0.5 / uField.z;
  float r = length(l - (uField.xy + halfSpan));
  // The relief has died away well inside the rim: the last metres only hand the surface over to the lake's own crust.
  float alpha = 1.0;
  #ifdef RIM
  alpha = smoothstep(halfSpan - 2.3, halfSpan - 4.4, r + 1.2 * (vnoise(l * 0.31) - 0.5) + 0.4 * (vnoise(l * 1.7) - 0.5));
  #endif
  // The rim is level, plain crust: it reads nothing of the relief, so it costs what the lake's crust costs.
  #ifdef RIM
  vec4 rl = vec4(0.5, 0.5, 1.0, 0.0);
  vec4 mk = vec4(0.0, 0.0, 0.5, 0.0);
  vec4 ln = vec4(20.0, 0.0, 0.0, 0.0);
  #else
  vec4 rl = texture2D(tRelief, fieldUv(l));
  vec4 mk = texture2D(tMask, fieldUv(l));
  vec4 ln = texture2D(tLines, fieldUv(l));
  #endif
  vec2 grad = (rl.rg - 0.5) * 2.0 * uField.w;
  vec3 v = normalize(cameraPosition - vWorld);
  float far = length(cameraPosition - vWorld);
  float close = smoothstep(70.0, 18.0, far);

  // The skin of the lake exactly as the lake folder draws it inside its disc round the carcass (lake/index.ts: the same
  // pictures, sizes, turns, factors and fades by the size of a pixel on the ground, plate age 0.55), so the feathered rim
  // is the same stuff.
  vec2 q = uOrigin + turned(l);
  vec2 qx = dFdx(q);
  vec2 qy = dFdy(q);
  float grainSize = max(length(qx), length(qy));
  float fineSize = min(length(qx), length(qy));
  float near = 1.0 - smoothstep(0.03, 0.14, grainSize);
  float lakeClose = 1.0 - smoothstep(0.06, 0.5, grainSize);
  float mid = 1.0 - smoothstep(0.4, 2.5, grainSize);
  float streak = smoothstep(3.0, 9.0, grainSize / max(fineSize, 1e-5)) * (1.0 - smoothstep(0.01, 0.04, fineSize));
  float ropy = mid * (1.0 - 0.92 * streak);
  vec2 uvD = vec2(q.x * 0.8 - q.y * 0.6, q.x * 0.6 + q.y * 0.8) / 1.37 + 0.13;
  vec4 grainNh = vec4(0.5);
  vec3 grain = vec3(1.0 / 17.0);
  if (near > 0.0) {
    grainNh = texture2D(tSkinNh, uvD, -0.7);
    grain = texture2D(tSkin, uvD, -0.7).rgb;
  }
  vec2 uvA = q / 6.1;
  vec2 uvB = vec2(q.x * 0.391 - q.y * 0.921, q.x * 0.921 + q.y * 0.391) / 7.7 + 0.31;
  vec2 uvC = vec2(q.x * 0.5 + q.y * 0.866, -q.x * 0.866 + q.y * 0.5) / 47.0 + 0.55 * vec2(37.0, 61.0);
  float pick = smoothstep(0.38, 0.62, vnoise(q / 19.0 + 6.0));
  vec4 nhA = texture2D(tRopyNh, uvA);
  vec4 nhB = texture2D(tRopyNh, uvB);
  vec2 ropeSlope = mix(nhA.rg - 0.5, vec2(0.391 * (nhB.r - 0.5) + 0.921 * (nhB.g - 0.5), -0.921 * (nhB.r - 0.5) + 0.391 * (nhB.g - 0.5)), pick);
  float ropeHigh = mix(nhA.b, nhB.b, pick);
  vec3 rope = mix(texture2D(tRopy, uvA, -0.3).rgb, texture2D(tRopy, uvB, -0.3).rgb, pick);
  vec3 wideFolds = texture2D(tRopy, uvC).rgb;
  const float AGE = 0.55;
  vec3 plain = mix(vec3(0.057), mix(vec3(0.057), rope, 0.8), ropy) * mix(vec3(1.0), grain * 17.0, near * 0.4);
  plain *= mix(vec3(1.0), min(wideFolds * 17.0, 2.2), 0.6) * vec3(1.02, 1.0, 0.98);
  plain *= (0.45 + 1.9 * AGE) * (0.78 + 0.44 * vnoise(q / 21.0 + 13.0));
  plain = mix(plain, vec3(dot(plain, vec3(0.33))), 0.4 * AGE);

  // The folded skin: the same skin, roped. The ropes are in the relief; crests are worn paler than creases.
  float broad = vnoise(l * 0.4 + 2.0);
  float small = vnoise(l * 2.0 + 7.0);
  float folded = rl.a;
  // A second look at the skin, laid along the ropes (across them by their count, along them by the way round the body) and
  // drawn out ten times along, so its grain is the stretch of the skin.
  vec2 fromBody = l - vec2(${BODY.centre.x.toFixed(2)}, ${BODY.centre.z.toFixed(2)});
  vec2 uvF = vec2(ln.r / 0.6, atan(fromBody.x, fromBody.y) * 0.8);
  #ifdef RIM
  vec4 nhF = vec4(0.5);
  #else
  vec4 nhF = texture2D(tSkinNh, uvF);
  #endif
  float crest = clamp(mk.b * 2.0 - 0.5, 0.0, 1.3);
  vec3 old = plain * 1.3 * (0.4 + 0.95 * crest) * (0.55 + 0.9 * nhF.b) * (0.8 + 0.4 * broad);
  // Each rope is its own strip of skin, and the crease between two is a line of shade.
  float rp = ropeCount(ln.r);
  float rt = abs(2.0 * fract(rp) - 1.0);
  // Where the ropes die away into the plain skin, so do their lines.
  float seen = smoothstep(0.5, 0.15, fwidth(rp)) * smoothstep(0.2, 0.55, ln.a);
  float crease = smoothstep(0.8, 0.97, rt) * ln.a * seen * mix(0.4, 1.0, smoothstep(0.12, 0.24, ropeWidth(ln.r)));
  float ropeId = floor(rp);
  float ropeTone = fract(sin(ropeId * 12.9898) * 43758.5453);
  // Along each rope run strands a finger or two wide, each broken every few hands; where one is gone there is a dark groove.
  float across = fract(rp) * ropeWidth(ln.r) / 0.024 + 1.6 * (nhF.b - 0.5) + 0.9 * small;
  float strandId = floor(across) + ropeId * 37.0;
  float strandTone = fract(sin(strandId * 91.345) * 47453.5453);
  float lengthOf = 0.2 + 0.4 * strandTone;
  float seg = atan(fromBody.x, fromBody.y) * (3.0 + max(ln.r, 0.0)) / lengthOf + strandTone * 19.0;
  float alive = step(0.24, fract(sin((floor(seg) + strandId * 3.0) * 12.345) * 4375.85));
  float st = 2.0 * fract(across) - 1.0;
  float strandSeen = smoothstep(0.6, 0.2, fwidth(across)) * smoothstep(0.2, 0.55, ln.a) * folded * (1.0 - crease);
  float ridge = (1.0 - st * st) * alive * smoothstep(0.0, 0.1, min(fract(seg), 1.0 - fract(seg)));
  float crown = smoothstep(0.6, 0.1, rt) * ln.a * seen;
  old *= (1.0 + ln.a * seen * 0.5 * (ropeTone - 0.5)) * (1.0 - 0.9 * crease) * mix(1.0, 0.7 + 0.5 * ridge, strandSeen) * vec3(1.05, 1.0, 0.95);
  // From far off the creases are smaller than a pixel and what is seen is the ash on the crowns.
  old *= mix(1.2, 1.0, close);
  vec3 albedo = mix(plain, old, folded);

  // Ash has fallen on it since: a thin grey on whatever lies level, thick in the hollows.
  float lying = smoothstep(0.55, 0.95, inversesqrt(1.0 + dot(grad, grad)));
  albedo = mix(albedo, vec3(0.38, 0.345, 0.305), folded * lying * 0.55 * (0.3 + 0.7 * small) * (1.0 - 0.8 * crease));
  // And it has stayed on the crowns of the ropes, on the strands that stand.
  albedo = mix(albedo, vec3(0.4, 0.365, 0.325), folded * crown * 0.5 * (0.35 + 0.65 * small) * mix(1.0, ridge, strandSeen));
  // Ash drifted against the edge of the pad, and the stain of the heat round the tear.
  float fringe = smoothstep(0.0, 0.12, folded) * (1.0 - smoothstep(0.3, 0.8, folded));
  albedo = mix(albedo, vec3(0.37, 0.34, 0.3), fringe * 0.5 * smoothstep(0.4, 0.7, vnoise(l * 1.3 + 31.0)));
  albedo = mix(albedo, albedo * vec3(1.55, 0.8, 0.55) + vec3(0.02, 0.004, 0.0), clamp(mk.a * 1.3, 0.0, 0.65));
  float ash = mk.g * (0.35 + 0.65 * smoothstep(0.3, 0.7, 1.0 - small)) * folded;
  albedo = mix(albedo, vec3(0.36, 0.33, 0.295) * (0.7 + 0.5 * nhF.b), ash * 0.62);

  // The strands stand off the rope: the slope of each is across the rope.
  vec2 wr = ln.gb * (-1.0 * st * ridge * strandSeen);
  // The lake's own ropes, in the world, as the lake lays them.
  vec2 detail = ropeSlope * (0.35 + 0.55 * lakeClose) * ropy * (1.0 - 0.45 * folded);
  detail += vec2(0.8 * (grainNh.r - 0.5) + 0.6 * (grainNh.g - 0.5), -0.6 * (grainNh.r - 0.5) + 0.8 * (grainNh.g - 0.5)) * 0.3 * near * (1.0 - folded);
  vec2 fine = ln.gb * (nhF.r - 0.5) * 3.6 * close * folded;
  vec2 sw = turned(grad - fine + wr) - detail;
  vec3 n = normalize(vec3(-sw.x, 1.0, -sw.y));

  float hollow = mix(1.0, 0.86 + 0.28 * ropeHigh, ropy) * mix(1.0, 0.92 + 0.16 * grainNh.b, near) * mix(1.0, 0.5 + 0.5 * smoothstep(0.15, 0.6, ropeHigh), lakeClose * ropy);
  float occ = mix(hollow, mix(0.5 + 0.5 * rl.b, rl.b, close) * (0.72 + 0.28 * ropeHigh) * (1.0 - 0.7 * crease), folded);
  float rough = clamp(0.3 + 0.45 * AGE - 0.3 * (ropeHigh - 0.5) * ropy + 0.25 * (1.0 - mid), 0.18, 0.92);
  rough = mix(rough, 0.95, ash);
  vec4 land = landAt(vWorld.xz);
  float open = land.g * occ;
  vec3 light = skyIrradiance(n) * open + lakeIrradianceFar(vec3(vWorld.x, 1.5, vWorld.z), n) * mix(1.0, rl.b, folded) + emitterIrradiance(vWorld, n);
  vec3 c = albedo * light / 3.14159;
  // The shine is the lake's: off a surface gentler than the ropes, and gentler again on the folds, where each rope carries a
  // strip of the sky along its crown and from the bench those strips are finer than the folds are steep.
  vec2 ss = sw * mix(1.0, 0.38, folded);
  vec3 ns = normalize(vec3(-ss.x, 2.5 - 1.1 * lakeClose, -ss.y));
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float fresnel = 0.03 + 0.25 * (1.0 - rough) * (1.0 - rough) * pow(1.0 - nv, 5.0);
  vec3 rf = reflect(-v, ns);
  rf.y = abs(rf.y);
  c += fresnel * crustMirror(rf, rough) * mix(vec3(1.0), uFill / uFill.r, mix(0.75, 1.0, folded)) * open;

  // The tear: lava under a skin that has only just closed, and the little light it throws on its own lips.
  float heat = mk.r;
  float veins = small;
  // Dull on the walls, the full heat only at the bottom.
  float breath = 40.0 * (0.5 + 0.5 * sin(uTime * 1.5708 + 2.0 * small));
  float kelvin = mix(1000.0, uTearKelvin, smoothstep(0.08, 0.5, heat * (0.8 + 0.4 * veins))) - breath;
  c *= 1.0 - 0.85 * smoothstep(0.08, 0.5, heat);
  c += blackbody(kelvin) * smoothstep(0.08, 0.4, heat);
  // What it lights is the under side of the folds that hang over it.
  c += albedo * blackbody(1150.0) * mk.a * (0.2 + 1.6 * (1.0 - n.y)) * 0.5;

  gl_FragColor = vec4(rigOut(c), alpha);
  // Last, so the pixels beside a dropped one still have their derivatives.
  #ifdef RIM
  if (alpha < 0.004) discard;
  #endif
}`;

export const CARCASS_VERTEX = /* glsl */ `
attribute vec4 aMap;
attribute vec4 aSurf;
varying vec3 vWorld;
varying vec3 vLocal;
varying vec3 vNormal;
varying vec3 vLocalNormal;
varying vec4 vMap;
varying vec4 vSurf;
uniform float uTime;
void main() {
  vLocal = position;
  vLocalNormal = normal;
  vMap = aMap;
  vSurf = aSurf;
  // What hangs by one end stirs in the air that rises off the crust: most at its free end, never the same twice in eight seconds.
  float hangs = step(1.5, aMap.w) * aMap.y / 1.6;
  float stir = hangs * hangs * (0.05 * sin(uTime * 2.3562 + position.x * 1.7) + 0.025 * sin(uTime * 5.4978 + position.z * 2.3));
  vec4 w = modelMatrix * vec4(position + vec3(0.35, 0.0, 1.0) * stir, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const CARCASS_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vLocal;
varying vec3 vNormal;
varying vec3 vLocalNormal;
varying vec4 vMap;
varying vec4 vSurf;
uniform sampler2D tHide;
uniform sampler2D tHideNh;
uniform sampler2D tFlake;
uniform sampler2D tFlakeNh;
uniform sampler2D tPlates;
${NOISE_GLSL}
${RIG_GLSL}
${COMMON}
void main() {
  vec3 n = normalize(vNormal);
  vec3 nl = normalize(vLocalNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  float far = length(cameraPosition - vWorld);
  float close = smoothstep(90.0, 20.0, far);
  float isBody = step(0.5, vMap.w) * step(vMap.w, 1.5);
  float isLeg = step(vMap.w, 0.5);
  // The plates and the splits of the body, drawn finer than its mesh: r how far a plate stands off, g the shade under its
  // lifted edge, b its tone (nothing where there is no plate), a the inside of a split.
  vec4 pl = texture2D(tPlates, vec2(vMap.x, 0.5 - 0.5 * cos(vMap.y * 0.58178)));
  pl = mix(vec4(0.0, 1.0, 0.0, 0.0), pl, isBody);
  float plate = smoothstep(0.06, 0.3, pl.b);
  // A plate has thickness: its edge is a step, and the light sees it.
  float stands = pl.r * 0.12;
  vec3 dpx = dFdx(vWorld);
  vec3 dpy = dFdy(vWorld);
  vec3 r1 = cross(dpy, n);
  vec3 r2 = cross(n, dpx);
  float det = dot(dpx, r1);
  n = normalize(abs(det) * n - sign(det) * (dFdx(stands) * r1 + dFdy(stands) * r2));

  // On the body the pleats of the hide hang from the spine down the flank, and the pictures are laid near their true size.
  float lump = vnoise3(vLocal * 1.1 + 4.0);
  vec2 uvH = mix(vec2(vMap.x * vMap.z, vMap.y / 0.6), vec2(vMap.y * 0.89 + 0.15 * lump, vMap.x * 8.0), isBody);
  vec2 uvP = mix(vec2(vMap.x * vMap.z + 0.37, vMap.y / 0.52 + 0.11), vec2(vMap.y * 1.11 + 0.37, vMap.x * 10.0 + 0.11), isBody);
  vec3 hide = texture2D(tHide, uvH).rgb;
  vec4 hideNh = texture2D(tHideNh, uvH);
  vec3 flake = texture2D(tFlake, uvP).rgb;
  vec4 flakeNh = texture2D(tFlakeNh, uvP);
  float grey = dot(hide, vec3(0.33));
  // Soot and ash have taken the brown out of the hide.
  vec3 dead = mix(vec3(0.3, 0.25, 0.2), vec3(0.3, 0.215, 0.145), isBody) * (0.25 + 9.0 * grey);
  // Caked ash and dried skin, the colour of old paper, darker where the plate is thin.
  float tone = dot(flake, vec3(0.33));
  vec3 pale = mix(vec3(0.36, 0.295, 0.215), vec3(0.62, 0.53, 0.4), smoothstep(0.2, 0.8, flakeNh.b)) * (1.1 + 3.5 * tone);
  // On the body: tan to bone on the upper face of each plate.
  vec3 bodyPale = mix(vec3(0.44, 0.335, 0.21), vec3(0.68, 0.6, 0.47), smoothstep(0.4, 1.0, pl.b + 0.3 * (lump - 0.5))) * (0.55 + 2.2 * tone + 0.5 * hideNh.b);
  pale = mix(pale, bodyPale, isBody);

  // On the body the hide lifts in patches; on the legs it is the plates that are left.
  float worn = lump + 0.5 * flakeNh.b - 0.25;
  float onLeg = smoothstep(0.35, 0.6, vSurf.y);
  float lifted = mix(onLeg * smoothstep(-0.45, 0.0, flakeNh.b + 0.5 * worn), plate, 1.0 - isLeg);
  float split = isBody * pl.a;
  // And the picture of peeling skin brings a few small flakes of its own between them.
  lifted = max(lifted, isBody * 0.3 * smoothstep(0.07, 0.17, tone + 0.05 * (lump - 0.5)));
  lifted *= 1.0 - split;
  // The crests of the dried cords are rubbed pale and the creases between hold the soot.
  vec3 albedo = mix(dead * (0.5 + 1.5 * hideNh.b * hideNh.b) * mix(1.0, 1.05, isBody), pale, lifted);
  vec2 bump = mix((hideNh.rg - 0.5) * 1.6, (flakeNh.rg - 0.5) * 2.6, lifted) * (0.35 + 0.65 * close);
  float cavity = mix(0.7 + 0.3 * hideNh.b, 0.6 + 0.4 * flakeNh.b, lifted);

  // Under the hide: dried flesh, almost black, strung with pale sinew along the limb; in the splits of the body, the ribs.
  float strand = smoothstep(0.35, 0.75, vnoise(vec2(vMap.x * vMap.z * 9.0, vMap.y * 1.3)) * 0.7 + 0.3 * hideNh.b);
  // The strands of sinew: thin, long, pale, and smooth enough to carry a line of the sky.
  float cordAt = vMap.x * vMap.z * 21.0 + 1.5 * vnoise(vec2(vMap.x * vMap.z * 3.0, vMap.y * 0.9));
  float cordTone = fract(sin(floor(cordAt) * 78.233) * 43758.5453);
  float cordRun = smoothstep(0.35, 0.6, vnoise(vec2(floor(cordAt) * 7.3, vMap.y * 0.8 + cordTone * 9.0)));
  float cs = 2.0 * fract(cordAt) - 1.0;
  float cord = (1.0 - cs * cs) * cordRun * step(0.3, cordTone) * smoothstep(1.2, 0.5, fwidth(cordAt)) * isLeg;
  vec3 flesh = mix(vec3(0.06, 0.04, 0.03), vec3(0.2, 0.135, 0.09), hideNh.b) * (0.6 + 1.2 * strand);
  vec3 sinew = vec3(0.42, 0.37, 0.29) * (0.55 + 0.6 * hideNh.b);
  float bare = mix(isLeg * (1.0 - onLeg), split, isBody);
  // In the splits of the body the ribs are barely seen.
  float boney = clamp(max(vSurf.w * mix(smoothstep(0.35, 0.8, strand), 0.22 + 0.3 * strand, isBody), 0.85 * smoothstep(0.3, 0.9, cord)), 0.0, 1.0);
  albedo = mix(albedo, mix(flesh, sinew, boney), bare);
  bump = mix(bump, (hideNh.rg - 0.5) * 0.8 + vec2(-0.9 * cs * cord, 0.0), bare);
  // The torn edge of a plate of the leg stands over what is under it and shades it.
  float under = isLeg * smoothstep(0.03, 0.3, vSurf.y) * (1.0 - smoothstep(0.3, 0.62, vSurf.y));

  // The lava that climbed it and froze. Its edge is cut by the grain of the skin so it is not a drawn line.
  vec2 uvL = vec2(vMap.x * vMap.z * 0.5, vMap.y / 1.9);
  vec4 lavaNh = texture2D(tRopyNh, uvL);
  float coat = smoothstep(0.36, 0.64, vSurf.x + 0.3 * (lavaNh.b - 0.5));
  // The same skin as the folds it stands in.
  vec3 lava = (vec3(0.011) + 0.8 * texture2D(tRopy, uvL).rgb) * 1.5;
  lava = mix(lava, vec3(dot(lava, vec3(0.33))), 0.22);
  albedo = mix(albedo, lava * (0.75 + 0.5 * lavaNh.b), coat);
  bump = mix(bump, (lavaNh.rg - 0.5) * 1.2, coat);
  cavity = mix(cavity, 0.75 + 0.25 * lavaNh.b, coat);

  // Ash has settled in the hollows of the hide, and the end of the body by the tear is stained by its heat.
  albedo = mix(albedo, vec3(0.37, 0.345, 0.31), isBody * (1.0 - lifted) * (1.0 - split) * 0.4 * smoothstep(0.5, 0.2, hideNh.b) * (1.0 - coat));
  float stain = isBody * exp(-dot(vLocal.xz - vec2(-8.25, 4.75), vLocal.xz - vec2(-8.25, 4.75)) / 20.0);
  albedo *= mix(vec3(1.0), vec3(1.25, 0.82, 0.62), stain);
  // Ash lies on whatever faces up.
  float dust = smoothstep(0.35, 0.95, nl.y) * (0.35 + 0.65 * (1.0 - lump)) * (1.0 - 0.5 * coat);
  albedo = mix(albedo, vec3(0.36, 0.34, 0.315), dust * mix(0.6, 0.25, lifted));
  albedo = mix(albedo, vec3(0.27, 0.26, 0.25), coat * 0.5 * (1.0 - lump));

  // The bump is laid on the surface along its own directions.
  vec3 along = normalize(cross(n, vec3(0.31, 0.9, 0.29)));
  vec3 round2 = cross(n, along);
  n = normalize(n + (along * bump.x + round2 * bump.y) * 0.9);

  float occ = cavity * vSurf.z * pl.g * (1.0 - 0.75 * under * (1.0 - coat)) * (1.0 - 0.55 * split);
  float rough = mix(0.88 - 0.45 * cord * bare, 0.78, coat);
  vec3 c = sunkShade(vWorld, n, v, albedo, rough, occ);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

export const GLOW_VERTEX = /* glsl */ `
void main() {
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}`;

export const GLOW_FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uRadiance;
void main() {
  gl_FragColor = vec4(uRadiance, 1.0);
}`;
