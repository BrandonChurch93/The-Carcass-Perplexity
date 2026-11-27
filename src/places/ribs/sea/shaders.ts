// The water of the Ribs in the light of the rig: the open sea with its surf, the pools and runnels on the floor, the bore, and thrown spray.
import { NOISE_GLSL, RIG_GLSL, RIG_UNIFORMS_GLSL } from '../shared/glsl';
import { loopAngle, loopText } from '../shared/looptext';
import { openingText } from '../shared/opening';
import { SWELL } from './tide';

const f = (v: number): string => (Number.isInteger(v) ? `${v}.0` : `${v}`);

// The swell as a sum of peaked waves: height in metres and its slope. `fine` is the spacing of whoever asks (a vertex ring, a pixel on the water):
// a wave it cannot carry is faded out between `lo` and `hi` of wave number times spacing.
export const SWELL_GLSL = /* glsl */ `
float swellAt(vec2 p, float t, float fine, float lo, float hi, out vec2 grad) {
  float h = 0.0;
  grad = vec2(0.0);
${SWELL.map(([dx, dz, length, amp]) => {
  const k = (Math.PI * 2) / length;
  const w = Math.sqrt(9.81 * k);
  return `  {
    float ph = ${f(k)} * dot(p, vec2(${f(dx)}, ${f(dz)})) - ${f(w)} * t;
    float keep = 1.0 - smoothstep(lo, hi, ${f(k)} * fine);
    h += keep * ${f(amp)} * (cos(ph) + ${f(0.9 * k * amp)} * cos(2.0 * ph));
    grad -= keep * ${f(amp * k)} * (sin(ph) + ${f(1.8 * k * amp)} * sin(2.0 * ph)) * vec2(${f(dx)}, ${f(dz)});
  }`;
}).join('\n')}
  return h;
}
// How far the water of a wave is carried toward its crest: a real sea is peaked at the top and long in the trough, not a sum of round backs.
vec2 swellPush(vec2 p, float t, float fine, float lo, float hi) {
  vec2 push = vec2(0.0);
${SWELL.map(([dx, dz, length, amp]) => {
  const k = (Math.PI * 2) / length;
  const w = Math.sqrt(9.81 * k);
  return `  push -= (1.0 - smoothstep(lo, hi, ${f(k)} * fine)) * ${f(0.72 * amp)} * sin(${f(k)} * dot(p, vec2(${f(dx)}, ${f(dz)})) - ${f(w)} * t) * vec2(${f(dx)}, ${f(dz)});`;
}).join('\n')}
  return push;
}
// White water of the wind sea: each of its waves breaks in patches along its crest and leaves a lace behind it that the wave runs out from under.
// x: the fresh break at the crest. y: the older foam trailing behind it.
vec2 whitecaps(vec2 p, float t, float px, sampler2D chop) {
  vec2 cap = vec2(0.0);
${SWELL.map(([dx, dz, length, amp], n) => {
  if (dz <= 0 || length < 20) return '';
  const k = (Math.PI * 2) / length;
  const w = Math.sqrt(9.81 * k);
  const group = (0.5 * w) / k;
  return `  {
    float ph = ${f(k)} * dot(p, vec2(${f(dx)}, ${f(dz)})) - ${f(w)} * t;
    // 0 on the crest, falling behind it; the wave runs toward +phase.
    float back = mod(ph + 0.6, 6.2832) - 0.6;
    back = back > 3.4 ? back - 6.2832 : back;
    vec2 ride = p - vec2(${f(dx)}, ${f(dz)}) * ${f(group)} * t;
    // A break is short along its crest: a few lengths of the wave's own height, never a bar from side to side.
    vec2 lay = vec2(dot(ride, vec2(${f(dx)}, ${f(dz)})) / ${f(length * 0.9)}, dot(ride, vec2(${f(-dz)}, ${f(dx)})) / ${f(length * 0.38)});
    float torn = textureLod(chop, lay + ${f(0.37 * n)}, log2(max(px * 256.0 / ${f(length * 0.38)}, 1e-6))).b;
    float keep = 1.0 - smoothstep(0.35, 1.0, ${f(k)} * px);
    // And not at every crest, nor evenly along one: whole stretches of the sea break and whole stretches do not.
    float where = textureLod(chop, lay.yx * 0.19 + ${f(0.61 * n + 0.2)}, log2(max(px * 256.0 / ${f(length * 2)}, 1e-6))).a;
    float on = smoothstep(${f(0.37 + 0.02 * n)}, ${f(0.74 + 0.02 * n)}, torn + 0.9 * (where - 0.55)) * keep;
    // Thickest in the middle of its length and thinning to nothing at its ends.
    cap.x = max(cap.x, on * smoothstep(-0.2 - 0.45 * on, -0.1, back) * (1.0 - smoothstep(0.05, 0.3, back)));
    cap.y = max(cap.y, on * smoothstep(-3.2, -0.6, back) * (1.0 - smoothstep(-0.2, 0.4, back)));
  }`;
}).join('\n')}
  return cap;
}
float swellPhase(vec2 p, float t) {
  return ${f((Math.PI * 2) / (SWELL[0] as number[])[2]!)} * dot(p, vec2(${f((SWELL[0] as number[])[0]!)}, ${f((SWELL[0] as number[])[1]!)})) - ${f(Math.sqrt((9.81 * Math.PI * 2) / (SWELL[0] as number[])[2]!))} * t;
}
// The surf on a shelving shore. The long swell slows as the bed comes up under it, so its crests close up; each stands steep in front and
// long behind, breaks, and runs in as a wall of white water that thins up the sand in tongues, further in one place than the next.
// x: metres it stands over the level sea. y: the white roller on its front. z: the foam it leaves behind it. w: how much this is the surf at all.
vec4 surfAt(vec2 p, float t, float depth, float ragged) {
  float zone = smoothstep(-0.5, -0.12, depth) * (1.0 - smoothstep(1.7, 4.2, depth));
  if (zone <= 0.0) return vec4(0.0);
  float ph = swellPhase(p, t) + 2.3 * (4.5 - clamp(depth, -0.5, 4.5)) + 0.45 * ragged;
  float b = fract(-ph / 6.2832);
  float body = exp(-4.5 * b);
  float face = smoothstep(0.9, 1.0, b);
  float tall = 0.55 * zone * (0.55 + 0.25 * ragged);
  float roller = max(smoothstep(0.92, 0.985, b), 1.0 - smoothstep(0.0, 0.05, b)) * zone;
  float left = max(exp(-3.2 * b), 0.22 * (1.0 - smoothstep(0.0, 1.3, depth))) * zone;
  return vec4(max(tall, 0.0) * max(body, face), roller, left, zone);
}`;

export const SEA_VERTEX = /* glsl */ `
${RIG_UNIFORMS_GLSL}
uniform vec3 uEye;
uniform sampler2D tChop;
uniform vec2 uWind;
varying vec3 vWorld;
${SWELL_GLSL}
void main() {
  vec2 p = position.xz + uEye.xz;
  float r = length(position.xz);
  float bed = texture2D(tLand, (p - uLandRect.xy) * uLandRect.zw).r;
  float calm = smoothstep(0.2, 4.5, -bed);
  vec2 g;
  float h = swellAt(p, uTime, r * 0.02 + 0.1, 0.5, 1.3, g) * calm;
  // The wind sea stands in the mesh as far as its rings can carry it (the same two pictures the pixel leans its faces by, in the same
  // place): a near crest has a broken top and a broken outline, not the smooth back of a sum of six waves.
  float ring = r * 0.02 + 0.1;
  float lively = (0.3 + 0.7 * smoothstep(0.0, 2.5, -bed)) * calm;
  h += lively * (0.95 * (textureLod(tChop, p / 47.0 - uTime * uWind * 0.064, log2(max(ring * 256.0 / 47.0, 1.0))).b - 0.5) * (1.0 - smoothstep(1.2, 3.5, ring))
    + 0.3 * (textureLod(tChop, vec2(p.y, -p.x) / 13.7 + uTime * vec2(uWind.y, -uWind.x) * 0.117, log2(max(ring * 256.0 / 13.7, 1.0))).b - 0.5) * (1.0 - smoothstep(0.35, 1.0, ring)));
  float rag = (textureLod(tChop, p / 173.0, 0.0).b - 0.5) * 5.0 + (textureLod(tChop, p.yx / 39.0, 0.0).b - 0.5) * 2.0;
  h += surfAt(p, uTime, -bed, rag).x;
  // No crest ever stands over a low lens: close under it the water keeps a clear metre below.
  h = min(h, mix(uEye.y - 1.4, 1e3, smoothstep(12.0, 55.0, r)));
  vec2 push = swellPush(p, uTime, r * 0.02 + 0.1, 0.5, 1.3) * calm;
  vWorld = vec3(p.x + push.x, h, p.y + push.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
}`;

export const SEA_FRAGMENT = /* glsl */ `
precision highp float;
${RIG_GLSL}
uniform sampler2D tChop;
uniform sampler2D tFeet;
uniform sampler2D tFoamPic;
uniform sampler2D tFoamNh;
uniform vec2 uWind;
uniform float uFeetReach;
varying vec3 vWorld;
${SWELL_GLSL}
// The level of a picture laid over the sea at so many metres a repeat, by the long side of the pixel's foot on the water (as the pool film reads).
// The long side is held to what level water at that range would give: the one steep face of a crest seen edge on read every picture as
// its mean, and stood in the frame as a flat pale tile.
float footLong;
float levelOf(sampler2D t, float metres) {
  float size = float(textureSize(t, 0).x) / metres;
  return log2(max(footLong * size, 1e-6));
}
void main() {
  vec2 p = vWorld.xz;
  vec2 footX = dFdx(p);
  vec2 footY = dFdy(p);
  vec3 toEye = cameraPosition - vWorld;
  float dist = length(toEye);
  vec3 v = toEye / dist;
  // Metres across a pixel at this range, and the long side of its foot on level water there.
  float pixel = dist * min(length(dFdx(v)), length(dFdy(v)));
  float level = pixel * dist / max(toEye.y, 1.5);
  footLong = min(max(length(footX), length(footY)), level);
  vec4 land = landAt(p);
  float depth = -land.r;
  float px = min(length(fwidth(p)), level + pixel);
  // Under the floor of the strait no lens ever sees the sea: nothing is worked out for it there.
  vec3 col = vec3(0.03, 0.034, 0.03);
  if (land.r < 0.6) {
  float feet = textureLod(tFeet, (p - uLandRect.xy) * uLandRect.zw, 0.0).r * uFeetReach;
  // Water shoals toward the sand and toward the foot of a blade alike.
  float ragged = (textureLod(tChop, p / 173.0, levelOf(tChop, 173.0)).b - 0.5) * 5.0 + (textureLod(tChop, p.yx / 39.0, levelOf(tChop, 39.0)).b - 0.5) * 2.0;
  float shoal = min(depth + ragged * smoothstep(0.0, 3.0, depth), 0.2 + feet * 0.4);
  float calm = smoothstep(0.2, 4.5, depth);
  vec2 g;
  float h = swellAt(p, uTime, px, 0.9, 2.4, g) * calm;
  g *= calm;

  vec4 c1 = textureLod(tChop, p / 47.0 - uTime * uWind * 0.064, levelOf(tChop, 47.0));
  vec4 c2 = textureLod(tChop, vec2(p.y, -p.x) / 13.7 + uTime * vec2(uWind.y, -uWind.x) * 0.117, levelOf(tChop, 13.7));
  vec4 c3 = textureLod(tChop, (p + (c1.xy - 0.5) * 2.0) / 3.9 - uTime * uWind * 0.23, levelOf(tChop, 3.9));
  vec2 s2 = c2.xy - 0.5;
  float lively = 0.3 + 0.7 * smoothstep(0.0, 2.5, depth);
  // The smallest faces only where the lens can hold them.
  vec4 c4 = textureLod(tChop, (vec2(-p.y, p.x) + (c2.xy - 0.5) * 0.7) / 0.97 + uTime * uWind * 0.31, levelOf(tChop, 0.97));
  float fineKeep = 1.0 - smoothstep(0.006, 0.05, px);
  // Where the swell breaks on a shelving shore the water is all at work: no mirror lies between the breakers.
  // Its front is no ruled line: it runs ahead in one place and hangs back in the next, in fingers a few metres wide.
  vec4 surf = surfAt(p, uTime, depth, ragged + 2.2 * (c2.b - 0.5) + 1.2 * (c3.b - 0.5)) * smoothstep(3.0, 10.0, feet);
  // The swash: where the sea lies thin on the sand at the floor's rim it is white, a rim of worked water against the sand and lace behind it,
  // further out in one place than the next and coming and going with the swell. Without it the waterline was the ruled cut of a plane through the shore.
  float swashDepth = depth + 0.5 * (c2.b - 0.5) + 0.3 * (c3.b - 0.5) + 0.12 * ragged;
  float swash = (1.0 - smoothstep(0.15, 1.5, swashDepth)) * smoothstep(-0.7, -0.25, depth) * smoothstep(3.0, 10.0, feet);
  float swashBeat = 0.7 + 0.3 * sin(uTime * 0.8 + 9.0 * c1.b + 0.05 * p.x);
  surf.z = max(surf.z, swash * swashBeat);
  surf.y = max(surf.y, (1.0 - smoothstep(0.0, 0.45, swashDepth)) * swash * swashBeat);
  surf.w = max(surf.w, swash);
  lively = max(lively, 0.9 * surf.w);
  vec2 chop = ((c1.xy - 0.5) * 0.55 + vec2(-s2.y, s2.x) * 0.5 + (c3.xy - 0.5) * 0.6 + (c4.xy - 0.5) * 0.6 * fineKeep) * lively;
  vec3 n = normalize(vec3(-(g.x + chop.x), 1.0, -(g.y + chop.y)));

  // What the lens cannot resolve it still sees: of all the small faces of a wind sea, the ones turned to it. Their mean leans to the eye,
  // by the rms slope when the view grazes and less as it steepens. So the far sea is no mirror: it shows the sky well over the horizon, dimly.
  float far = smoothstep(150.0, 2600.0, dist);
  float graze = max(v.y, 0.0);
  float sigma = 0.21 * lively;
  float lean = sigma * sigma / (graze + 1.25 * sigma);
  n = normalize(n + vec3(v.x, 0.0, v.z) / max(length(v.xz), 1e-4) * lean);
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float fres = 0.02 + 0.98 * pow(1.0 - nv, 5.0);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y) + 0.02;
  r = normalize(r);
  float open = land.g;
  float sun = sunAt(vWorld, land);
  // Near, the water mirrors the cloud's shapes; far, where a pixel holds a thousand faces, the mean sky.
  // The picture is read at a named level: a wind sea is no glass, and a read by the screen's own slopes inside this branch differs from one render to the next.
  // And the faces of a rough sea look many ways: at a glance half of what it mirrors is the low sky, where the light is, and not the cloud over it.
  vec3 rLow = normalize(vec3(r.x, 0.3 * r.y + 0.01, r.z));
  vec3 refl = mix(mix(skyMirror(r, 6.5), skyMirror(rLow, 7.0), 0.5 * (1.0 - smoothstep(0.1, 0.5, graze))), skyRadiance(r), far) * mix(1.0, open, 0.6);
  vec3 hv = normalize(v + uSunDir);
  float gl = pow(max(dot(n, hv), 0.0), mix(700.0, 60.0, far));
  refl += uSunColour * gl * sun * mix(6.0, 0.8, far);

  vec3 e = skyIrradiance(vec3(0.0, 1.0, 0.0)) * open + uSunColour * (uSunDir.y * sun);
  // Slate grey-green, never teal: the water of a cold strait after a storm, full of sand where it shoals.
  vec3 deep = vec3(0.088, 0.122, 0.11);
  vec3 shallow = vec3(0.17, 0.175, 0.14);
  vec3 body = mix(shallow, deep, smoothstep(0.0, 5.0, depth));
  // Light comes through the thin top of a tall wave: only the highest water of the heaviest crests, green where the sun is on it.
  float thin = smoothstep(1.3, 3.3, h + 1.6 * (c1.b - 0.5)) * calm;
  body += vec3(0.024, 0.044, 0.038) * thin * (0.5 + 0.5 * sun);
  // Seen against the light a wave is a lens: the top of a face that leans to the eye, with the break in the cloud or the sun behind it,
  // is lit from inside, cold green, brightest just under the crest where the water is a hand thick.
  vec2 vh = v.xz / max(length(v.xz), 1e-4);
  float top = smoothstep(1.7, 3.9, h + 2.0 * (c1.b - 0.5) + 0.7 * (c2.b - 0.5)) * calm;
  float leans = clamp(0.35 + 2.4 * dot(n.xz, vh), 0.0, 1.0);
  float behindBreak = pow(max(dot(-vh, normalize(uSkyBreak.xz)), 0.0), 2.0);
  float behindSun = pow(max(dot(-vh, normalize(uSunDir.xz + 1e-4)), 0.0), 2.0) * sun * (1.0 - 0.6 * uSunDir.y);
  vec3 lens = vec3(0.1, 0.15, 0.13) * top * leans * (skyRadiance(uSkyBreak) * 0.13 * behindBreak * open + uSunColour * 0.16 * behindSun);
  // A low sun goes into the water at a slant and little of it comes back: the body is lit by the sky and takes a third of the sun, cooled.
  vec3 sunCool = mix(uSunColour, vec3(dot(uSunColour, vec3(0.3333))), 0.6);
  vec3 eBody = skyIrradiance(vec3(0.0, 1.0, 0.0)) * open + sunCool * (0.33 * uSunDir.y * sun);
  col = mix(body * eBody / 3.14159 + lens, refl, fres);

  // White water. The lace is the Builder's picture of broken water seen from above, laid in metres and carried a little by the wind.
  float lacePic = dot(textureLod(tFoamPic, p / 9.0 - uTime * uWind * 0.05, levelOf(tFoamPic, 9.0)).rgb, vec3(0.3333));
  float fine = textureLod(tChop, p.yx / 1.9 + uTime * 0.05, levelOf(tChop, 1.9)).a;
  // Close under the lens the same picture is read again small: foam is bubbles and holes down to a hand's width, not a soft patch.
  // Read by the short side of the pixel, as a break's outline is: by the long side the inside of a patch seen along the water was one flat white.
  float laceFine = dot(textureLod(tFoamPic, p.yx / 2.3 + uTime * uWind * 0.11, log2(max(2.0 * pixel * float(textureSize(tFoamPic, 0).x) / 2.3, 1e-6))).rgb, vec3(0.3333));
  float lace = mix(0.72 * lacePic + 0.28 * fine, 0.5 * lacePic + 0.4 * laceFine + 0.16 * fine, 1.0 - smoothstep(0.02, 0.12, px));
  // And once more four times as large, drawn out down the wind: white water lies in rafts and rags many metres across with dark water
  // between them, not in an even grain from here to the horizon.
  vec2 across = vec2(-uWind.y, uWind.x);
  float laceWide = dot(textureLod(tFoamPic, vec2(dot(p, across), 0.6 * dot(p, uWind)) / 34.0 + (c1.xy - 0.5) * 0.05 - uTime * 0.004, levelOf(tFoamPic, 34.0)).rgb, vec3(0.3333));
  float rafts = smoothstep(0.34, 0.68, laceWide);
  lace *= mix(0.86 + 0.26 * rafts, 0.5 + 0.95 * rafts, smoothstep(0.02, 0.3, px));
  // A patch of broken water is read by the short side of the pixel: by the long side, at a glance, every crest would be one band.
  // And never by more than a few pixels' width at this range: the back of a crest seen edge on read the break's picture as its mean, and one face of the mesh stood white.
  vec2 caps = whitecaps(p, uTime, min(min(length(footX), length(footY)), 2.5 * pixel), tChop) * calm;
  // Streaks down the wind: what the breakers leave is drawn out into long lines, in drifts, thick in one stretch of sea and absent in the next.
  float streak = dot(textureLod(tFoamPic, vec2(dot(p, across) / 13.0, dot(p, uWind) / 110.0 - uTime * 0.03), levelOf(tFoamPic, 13.0)).rgb, vec3(0.3333));
  float drift = smoothstep(0.38, 0.7, textureLod(tChop, p / 290.0 + 0.11, levelOf(tChop, 290.0)).b);
  float lane = smoothstep(0.5, 0.78, streak) * (0.15 + 0.85 * drift) * calm * (1.0 - 0.6 * far);
  float ph = swellPhase(p, uTime) + 0.9 * shoal;
  float crest = pow(0.5 + 0.5 * cos(ph), 3.0);
  float wet = smoothstep(-0.25, 0.25, depth) * (1.0 - 0.85 * surf.w);
  float surfZone = smoothstep(5.5, 1.2, shoal) * wet;
  float wash = smoothstep(1.7, 0.15, shoal) * wet;
  float amount = max(0.7 * caps.y * (1.0 - smoothstep(0.05, 0.4, px)), 0.55 * lane);
  // What every break of the last minutes left: a web of old foam over the whole wind sea, in veins, thicker where the drifts lie.
  amount = max(amount, (0.6 + 0.25 * drift) * (0.35 + 0.65 * rafts) * calm * (1.0 - 0.5 * far));
  amount = max(amount, surfZone * (0.3 + 0.7 * crest) + wash * (0.55 + 0.4 * sin(ph - 1.2)));
  // Within a stone's throw a break is no white tile laid on the water: it is the same lace, thick, with the water showing in its holes.
  float nearBreak = 1.0 - smoothstep(0.08, 0.3, pixel);
  amount = max(amount, 0.58 * caps.x * caps.x * nearBreak);
  float foam = smoothstep(1.0 - amount, 1.3 - amount, lace) * smoothstep(0.0, 0.25, amount);
  // Round white water and under it the sea is full of air: milky and pale green, lit from inside, where a break has just been.
  // Less of it close under the lens: there the holes in the lace are seen each for itself, and they are dark water.
  float aired = smoothstep(0.08, 0.75, amount) * (0.3 + 0.7 * smoothstep(0.3, 0.8, lace)) * (1.0 - 0.55 * nearBreak);
  col += (1.0 - fres) * vec3(0.25, 0.32, 0.3) * aired * eBody / 3.14159;
  // Thick where it is dense, thin and grey at its rim, where the water shows through it.
  float thick = smoothstep(1.25 - amount, 1.9 - amount, lace);
  float pic = lace;
  // The surf's white is read by the short side of the pixel: seen along the sand, by the long side, it was one pale band with a ruled edge.
  if (surf.w > 0.0) {
    // Never by less than a quarter of the long side: far along the sand the short side alone drew the white out into upright bars.
    float laceS = dot(textureLod(tFoamPic, p / 7.0 + vec2(0.013, 0.02) * uTime, log2(max(max(2.0 * pixel, 0.25 * footLong) * float(textureSize(tFoamPic, 0).x) / 7.0, 1e-6))).rgb, vec3(0.3333));
    float standing = smoothstep(0.0, 0.05, vWorld.y + depth);
    float white = standing * max(surf.y * smoothstep(0.1, 0.45, laceS + 0.35 * surf.y), smoothstep(1.0 - 0.6 * surf.z, 1.3 - 0.6 * surf.z, laceS + 0.1) * smoothstep(0.0, 0.25, surf.z));
    pic = mix(pic, laceS, step(foam, white));
    thick = max(thick, max(surf.y, smoothstep(1.2 - 0.6 * surf.z, 1.7 - 0.6 * surf.z, laceS + 0.1)) * step(foam, white));
    foam = max(foam, white);
  }
  // The break itself is thick white water, ragged at its rim.
  float fresh = smoothstep(0.3, 1.0, caps.x * (0.2 + 0.9 * lacePic + 0.4 * mix(fine, 0.5, smoothstep(0.02, 0.2, px))));
  // Close under the lens a break is no tile: its rim is eaten by the bubbles' own lace and there are holes in its body.
  // Its picture is read by the short side of the pixel, as its outline is: read by the long side its inside was one flat white.
  fresh *= mix(1.0, 0.12 * smoothstep(0.25, 0.75, 1.5 * laceFine + 0.7 * fresh - 0.45), nearBreak);
  foam = max(foam, 0.82 * fresh);
  // Fresh white water is thick and white; what trails is thin, and the green shows through it.
  // Foam is white all through: it takes the sky from every side and the low sun as a standing thing does, and gives it back nearly white.
  vec3 eFoam = skyIrradiance(vec3(0.0, 1.0, 0.0)) * open * 1.15 + sunCool * ((0.3 + uSunDir.y) * sun);
  float cover = clamp(foam, 0.0, 1.0);
  if (cover > 0.002) {
    // Foam is a standing thing with a height of its own: the picture's height and slope say where each clot stands and which way it faces.
    // Read by the short side of the pixel: by the long side, on the face of a near crest, it went to its mean and the foam was a flat grey sheet.
    float texels = float(textureSize(tFoamNh, 0).x);
    vec3 big = textureLod(tFoamNh, p / 9.0 - uTime * uWind * 0.05, log2(max(2.0 * pixel * texels / 9.0, 1e-6))).rgb;
    vec3 small = textureLod(tFoamNh, p.yx / 2.3 + uTime * uWind * 0.11, log2(max(2.0 * pixel * texels / 2.3, 1e-6))).rgb;
    float close = 1.0 - smoothstep(0.03, 0.15, pixel);
    vec2 tilt = (big.rg - 0.5) * vec2(2.0, -2.0) + (small.gr - 0.5) * vec2(-1.4, 1.4) * close;
    float stands = mix(big.b, 0.6 * big.b + 0.4 * small.b, close);
    vec3 nf = normalize(n + vec3(tilt.x, 0.0, tilt.y) * (0.5 + 1.1 * cover));
    vec3 keyDir = normalize(mix(uSkyBreak, uSunDir, sun));
    float turned = 1.0 + mix(0.5, 0.85, close) * (dot(nf, keyDir) - dot(n, keyDir));
    // The hollows between clots are in their shade; a thin rim is half water, and the green shows through it.
    float hollow = mix(0.74, 0.6, close) + mix(0.26, 0.4, close) * smoothstep(0.12, 0.7, stands);
    float dense = max(thick, fresh);
    vec3 white = mix(vec3(0.62, 0.73, 0.71), vec3(0.93, 0.95, 0.95), dense);
    vec3 foamCol = white * (0.88 + 0.12 * pic) * turned * hollow * mix(0.86, 1.08, max(fresh, surfZone)) * (1.0 + 0.3 * thin) * eFoam / 3.14159;
    col = mix(col, foamCol, cover * mix(0.7, 1.0, dense));
  }
  }
  gl_FragColor = vec4(rigOut(col), 1.0);
}`;

/**
 * The open sea in the approach. The shut cloud lies over the blades, not over the mile of water before them, which keeps more of the sky's
 * light (uOpenSea.x times what the rig gives the ground under the cloud; 1 once the cloud has opened).
 * And the look of a gale's sea from far out (uOpenSea.z, 1 as the film opens and nothing from the sixteenth second): gusts, more white
 * water, the path of light under the break in the cloud.
 */
export const SEA_OPENING_FRAGMENT = openingText(
  // More of the wind sea breaks: a gale's sea, white to the horizon in drifts.
  SEA_FRAGMENT.replace(/float on = smoothstep\(([0-9.]+), ([0-9.]+), torn/g, (_m, lo: string, hi: string) => `float on = smoothstep(${lo} - 0.3 * uOpenSea.z, ${hi} - 0.3 * uOpenSea.z, torn`),
  [
    ['uniform float uFeetReach;', 'uniform float uFeetReach;\nuniform vec4 uOpenSea;\nuniform float uOpenGlint;\nuniform vec4 uWash[2];'],
    ['  float h = swellAt(p, uTime, px, 0.9, 2.4, g) * calm;\n  g *= calm;', '  float h = swellAt(p, uTime, px, 0.9, 2.4, g) * calm * uOpenSea.w;\n  g *= calm * uOpenSea.w;'],
    [
      '  float lively = 0.3 + 0.7 * smoothstep(0.0, 2.5, depth);',
      `  float lively = 0.3 + 0.7 * smoothstep(0.0, 2.5, depth);
  // The wind does not lie evenly on a mile of water: it comes down in gusts that roughen it in dark drifts, with slicks between them.
  float gust = textureLod(tChop, (p - uTime * uWind * 11.0) / 870.0 + 0.4, 0.0).a * 0.65 + textureLod(tChop, (p - uTime * uWind * 11.0) / 310.0 + 0.7, 0.0).b * 0.35;
  lively *= mix(1.0, 0.5 + 1.0 * smoothstep(0.32, 0.68, gust), uOpenSea.z);`,
    ],
    [
      '  refl += uSunColour * gl * sun * mix(6.0, 0.8, far);',
      `  refl += uSunColour * gl * sun * mix(6.0, 0.8, far);
  // The break in the cloud stands on the water as a path of light toward it: the faces turned to it flash, and far off they run together.
  if (uOpenSea.z > 0.0) {
    vec3 hb = normalize(v + uSkyBreak);
    float turned = max(dot(n, hb), 0.0);
    refl += vec3(1.0, 0.87, 0.7) * uOpenSea.z * (1.0 + 4.0 * uOpenGlint) * (8.0 * pow(turned, mix(1100.0, 140.0, far)) + 2.6 * pow(turned, 60.0) * far);
    // And under it the whole sea is silver: every face that leans a little the break's way holds a piece of it, brightest down the middle of the path.
    vec2 toBreak = normalize(uSkyBreak.xz);
    float inPath = pow(max(dot(-v.xz / max(length(v.xz), 1e-4), toBreak), 0.0), 14.0);
    refl += skyRadiance(uSkyBreak) * vec3(1.0, 0.95, 0.88) * uOpenSea.z * inPath * (0.5 * pow(turned, 24.0) + 1.6 * pow(turned, 160.0)) * (0.35 + 0.65 * smoothstep(0.3, 0.6, c3.a));
  }`,
    ],
    ['vec3 e = skyIrradiance(vec3(0.0, 1.0, 0.0)) * open + uSunColour * (uSunDir.y * sun);', 'vec3 e = skyIrradiance(vec3(0.0, 1.0, 0.0)) * open * uOpenSea.x + uSunColour * (uSunDir.y * sun);'],
    ['0.55 * lane);', '(0.55 + 0.35 * uOpenSea.z) * lane);'],
    // The water's own body stands in that lifted light too: under the shut cloud it was lit as the ground under the blades is, and went black.
    ['vec3 eBody = skyIrradiance(vec3(0.0, 1.0, 0.0)) * open + sunCool', 'vec3 eBody = skyIrradiance(vec3(0.0, 1.0, 0.0)) * open * uOpenSea.x + sunCool'],
    // The foam of the open sea stands in the same lifted light as the water it lies on.
    ['* open * 1.15 + sunCool', '* open * 1.15 * uOpenSea.x + sunCool'],
    [
      '  float foam = smoothstep(1.0 - amount, 1.3 - amount, lace) * smoothstep(0.0, 0.25, amount);',
      `  // The heaviest crests of the long swell topple at their tops and leave white water behind them in lace.
  float toppleAt = h + 1.4 * (c1.b - 0.5) + 0.8 * (lacePic - 0.5);
  float topple = smoothstep(2.9, 4.4, toppleAt) * uOpenSea.z * calm;
  // The gale draws what they leave out down the wind: close by the lace lies in torn lines with dark water between, not in an even sheet.
  float drawn = dot(textureLod(tFoamPic, vec2(dot(p, across) / 5.0, dot(p, uWind) / 21.0 - uTime * 0.06) + (c1.xy - 0.5) * 0.14 + (c2.xy - 0.5) * 0.05, log2(max(2.0 * pixel * float(textureSize(tFoamPic, 0).x) / 5.0, 1e-6))).rgb, vec3(0.3333));
  lace *= mix(1.0, 0.45 + 1.3 * smoothstep(0.25, 0.7, drawn), uOpenSea.z * (1.0 - smoothstep(0.05, 0.4, px)));
  amount = max(amount, 0.7 * topple);
  // And a gale leaves no stretch of water clean: between the rafts the whole sea is lined with it.
  amount = max(amount, (0.6 + 0.16 * drift) * uOpenSea.z * calm * (1.0 - 0.5 * far));
  // Where a sea of the set has struck a foot the water is white round it: the wash goes out from the stone over the swell and thins to lace.
  for (int i = 0; i < 2; i++) {
    float off = length((p - uWash[i].xy) * vec2(1.0, 1.8)) / uWash[i].z;
    amount = max(amount, uWash[i].w * (1.0 - smoothstep(0.3, 1.0, off + 0.5 * (lacePic - 0.5) + 0.25 * (c1.b - 0.5))));
  }
  float foam = smoothstep(1.0 - amount, 1.3 - amount, lace) * smoothstep(0.0, 0.25, amount);`,
    ],
    [
      '  foam = max(foam, 0.82 * fresh);',
      `  // In rafts on the top, and down the face the swell runs toward, the water is heaped white: thick, in clots, the one thing in the sea that is white all through.
  float spill = max(topple * smoothstep(0.46, 0.76, laceWide + 0.6 * (c1.b - 0.5)), smoothstep(3.2, 4.2, toppleAt) * smoothstep(-0.03, 0.03, -dot(g, vec2(0.06, -0.998)))) * uOpenSea.z * calm;
  float heaped = spill * smoothstep(0.34, 0.62, 0.5 * lacePic + 0.5 * laceFine + 0.3 * spill);
  fresh = max(fresh, heaped);
  foam = max(foam, 0.82 * fresh);
  foam = max(foam, 0.95 * heaped);`,
    ],
  ],
);

/** The sea of the approach stands higher: the long swell of the open strait, uOpenSea.w times the film's, 1 from the sixteenth second. */
export const SEA_OPENING_VERTEX = openingText(SEA_VERTEX, [
  ['uniform vec3 uEye;', 'uniform vec3 uEye;\nuniform vec4 uOpenSea;'],
  ['float h = swellAt(p, uTime, r * 0.02 + 0.1, 0.5, 1.3, g) * calm;', 'float h = swellAt(p, uTime, r * 0.02 + 0.1, 0.5, 1.3, g) * calm * uOpenSea.w;'],
  ['vec2 push = swellPush(p, uTime, r * 0.02 + 0.1, 0.5, 1.3) * calm;', 'vec2 push = swellPush(p, uTime, r * 0.02 + 0.1, 0.5, 1.3) * calm * uOpenSea.w;'],
]);

export const POOL_VERTEX = /* glsl */ `
attribute float aDepth;
varying vec3 vWorld;
varying float vDepth;
varying vec2 vLens;
void main() {
  vWorld = position;
  vDepth = aDepth;
  vLens = vec2(projectionMatrix[2][2], projectionMatrix[3][2]);
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}`;

const POOL_SHEET = (rings: number): string => /* glsl */ `
precision highp float;
${RIG_GLSL}
uniform sampler2D tChop;
uniform vec2 uWind;
uniform vec4 uRings[${rings}];
uniform float uFront;
uniform float uBoreHeight;
uniform int uRingCount;
uniform float uPoolLevel;
uniform vec2 uDrain;
uniform sampler2D tFoamPic;
varying vec3 vWorld;
varying float vDepth;
// The level of a picture laid over the flat at so many metres a repeat, by the long side of the pixel's foot on the ground.
// Read so, a picture costs the software renderer a fraction of what a read by its own slopes costs, and it is the same level.
vec2 footX;
vec2 footY;
float levelOf(sampler2D t, float metres) {
  float size = float(textureSize(t, 0).x) / metres;
  return log2(max(max(length(footX), length(footY)) * size, 1e-6));
}
// Ripples seen at a glance keep their crests: read by the long side they went to glass a stone's throw out. Between the long side and the short.
float rippleLevel(sampler2D t, float metres) {
  float size = float(textureSize(t, 0).x) / metres;
  return 0.5 * log2(max(max(dot(footX, footX), dot(footY, footY)) * min(dot(footX, footX), dot(footY, footY)), 1e-12)) * 0.5 + log2(size) + 0.4;
}
// The rig's cloud shadow and contact, word for word (shared/glsl.ts: cloudShade, contactDrawn), but each picture read at a stated level:
// over the rippled sheet a read by its own slopes is several times the cost for the same picture. Keep in step with the rig.
float sunOn(vec3 at, vec4 land) {
  vec2 q = at.xz - uSunDir.xz * (at.y / uSunDir.y);
  vec2 d = q - uCloudBreak.xy;
  vec2 e = q - uCloudBreak2.xy;
  float c = textureLod(tCloudShade, q * uCloudShade.z - uCloudShade.xy, 0.0).r * 0.62 + uCloudBreak.w * exp(-dot(d, d) * uCloudBreak.z) + uCloudBreak2.w * exp(-dot(e, e) * uCloudBreak2.z);
  return land.b * mix(uCloudShade.w, 1.0, smoothstep(0.42, 0.62, c));
}
float stoodOver(vec3 at) {
  vec2 uv = (at.xz - uContactRect.xy) * uContactRect.zw;
  vec2 e = min(uv, 1.0 - uv);
  return textureLod(tContact, uv, 0.0).r * smoothstep(0.0, 0.03, min(e.x, e.y));
}
void main() {
  vec2 p = vWorld.xz;
  footX = dFdx(p);
  footY = dFdy(p);
  vec3 toEye = cameraPosition - vWorld;
  float dist = length(toEye);
  vec3 v = toEye / dist;
  // The land and its fine relief, read at a stated level (the same pictures the rig reads; a read by its own slopes costs several times this).
  vec4 land = textureLod(tLand, (p - uLandRect.xy) * uLandRect.zw, 0.0);
  float fineBed = 0.2 * (textureLod(tBedFine, p / 37.0, levelOf(tBedFine, 37.0)).r - 0.5) + 0.07 * (textureLod(tBedFine, p.yx / 9.7, levelOf(tBedFine, 9.7)).r - 0.5);
  vec4 barA = textureLod(tChop, p / 29.0, levelOf(tChop, 29.0));
  vec4 barB = textureLod(tChop, p / 7.3, levelOf(tChop, 7.3));
  // Two trains of ripples that cross, each bent by the slow water under it so that no crest runs straight or evenly spaced.
  vec2 bend = (barB.xy - 0.5) * 0.9 + (barA.xy - 0.5) * 2.2;
  // Before the bore the flat is sucked out toward it: what lies on the water is drawn to the wall, and the level falls a hand.
  // No picture is read in this branch: far from the wall the flat pays nothing for it.
  float drawn = 0.0;
  float under = 0.0;
  if (p.y - uFront < 460.0) {
    float ahead = p.y - uFront - 20.0 * sin(p.x * 0.0076 + 1.3);
    drawn = smoothstep(190.0, 80.0, ahead);
    // Under the wall the flat lies in its shade, dark slate, and only slack stretches of it still hold the sky: patches, as the bed and the wind leave them, no bands ruled across it.
    under = smoothstep(430.0, 160.0, ahead) * (1.0 - 0.8 * smoothstep(0.4, 0.66, 0.55 * barA.a + 0.45 * barB.b));
  }
  bend.y += 14.0 * drawn * drawn;
  vec4 c1 = textureLod(tChop, (p + bend) / 3.1 - uTime * uWind * 0.16, rippleLevel(tChop, 3.1));
  vec4 c2 = textureLod(tChop, (vec2(p.y, -p.x) + bend.yx * 0.4) / 0.83 + uTime * vec2(uWind.y, -uWind.x) * 0.3, rippleLevel(tChop, 0.83));
  // The true bed under this pixel: the sheet ends where the bed breaks the level, in braids.
  // Over the level of the pools it is a draining film that follows the bed and lies in its fine lows, thinner the higher the bed, and none over uDrain.y.
  float over = max(land.r - uPoolLevel, 0.0);
  float depth = uPoolLevel + uDrain.x * over - (land.r + fineBed) - 0.03 * smoothstep(0.0, 0.1, over) - 0.1 * smoothstep(0.5 * uDrain.y, uDrain.y, over);
  // The sheet is not one sheet: bars of bare wet sand break it wherever the bed comes within a hand of the level.
  // Round a wader's legs the water stays: its rings and its mirror need it.
  float waded = 1e3;
  vec2 ringSlope = vec2(0.0);
  for (int i = 0; i < ${rings}; i++) {
    if (i >= uRingCount) break;
    vec2 d = p - uRings[i].xy;
    float l = length(d) + 1e-3;
    waded = min(waded, l);
    // No ruled circles: each ring is pushed about by the ripples it crosses, and they go out in packets, a few crests and then slack water.
    float lr = l + 0.5 * (barB.b - 0.5) + 0.22 * (c1.b - 0.5);
    float packet = 0.5 + 0.5 * sin(lr * 2.3 - uTime * 2.1 + uRings[i].z * 1.7);
    float wave = sin(lr * 17.0 - uTime * 10.0 + uRings[i].z) * exp(-l * 1.9) * packet * uRings[i].w;
    ringSlope += (d / l) * wave * 0.13;
  }
  depth -= 0.16 * smoothstep(0.36, 0.62, barA.b + 0.5 * (barB.b - 0.5)) * (1.0 - smoothstep(0.0, 0.05, over)) * smoothstep(0.9, 2.4, waded);
  // No discard here: a picture read after a discard has no slope to pick its level by where a neighbour is gone, and the edge of every bar came out different on every render. The sheet is cut at the end.
  // The sheet is never still: thin water comes on and drains back round every stone and bar, a hand's breadth, each stretch in its own time.
  float tide = barA.g;
  depth += 0.004 * sin(uTime * 0.9 + tide * 19.0) + 0.004 * sin(uTime * 2.3 + p.x * 0.9 + p.y * 0.7 + tide * 7.0);
  depth -= 0.07 * drawn;
  // What the water has just left is wet and dark: a band on every stone and bar above the line.
  // Under the wall the whole flat is wet: the first thin sheet runs ahead of it and what it has left still shines.
  float film = 0.09 + 0.3 * under;
  bool dry = depth < -film;
  float wetBand = 0.42 * smoothstep(-film, -0.004, depth);
  float edge = smoothstep(0.0, 0.012, depth);
  // No branch round the work: a picture read inside one has no slope at its border, and the waterlines came out different on every page load.
  vec3 col = vec3(0.0);
  float alpha = 0.0;
  vec2 s2 = c2.xy - 0.5;
  // The wind works the sheet in cats' paws: ruffled dark stretches and slack bright ones, a few metres each, that drift.
  float paw = smoothstep(0.3, 0.7, 0.6 * barA.a + 0.4 * barB.a + 0.25 * sin(uTime * 0.35 + barA.r * 12.0));
  float gust = 0.35 + 0.65 * paw;
  float ruffle = 0.45 + 0.55 * paw;
  vec2 slope = ((c1.xy - 0.5) * 0.3 + vec2(-s2.y, s2.x) * 0.26) * ruffle * smoothstep(0.0, 0.07, depth);
  slope += ringSlope;
  vec3 n = normalize(vec3(-slope.x, 1.0, -slope.y));
  float nv = clamp(dot(n, v), 0.0, 1.0);
  float fres = 0.02 + 0.98 * pow(1.0 - nv, 5.0);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y) + 0.01;
  r = normalize(r);
  float open = land.g * (1.0 - stoodOver(vWorld));
  float sun = sunOn(vWorld, land);
  // The water of the flat is full of sand: what it mirrors it mirrors warm and a little dulled.
  // A ruffled sheet holds no sharp picture of the cloud: each ripple throws a different piece of sky at the lens, and what is seen is their sum.
  // Read sharp: each ripple throws its own piece of the sky at the lens, and the piece that is the break in the cloud it throws as silver.
  vec3 refl = skyMirror(r, 1.0);
  float piece = dot(refl, vec3(0.3333)) / max(dot(skyIrradiance(vec3(0.0, 1.0, 0.0)), vec3(0.3333)) / 3.14159, 1e-4);
  float glint = smoothstep(1.25, 2.4, piece);
  refl = mix(refl, vec3(dot(refl, vec3(0.3333))), 0.6 * glint) * (0.55 + 0.35 * smoothstep(0.3, 1.0, piece) + 1.7 * glint) * mix(1.0, open, 0.5) * vec3(0.86, 0.82, 0.78);
  // The lead draws each blade's true image on the water after this sheet (land/, MIRROR).
  // The wall of the bore stands in it as it comes: white at the foot, the dark lifted water, the white crest and the spray over it.
  float toWall = (uFront + 20.0 * sin(p.x * 0.0076 + 1.3) - p.y) / min(r.z, -1e-3);
  if (toWall > 0.0 && toWall < 1500.0) {
    float k = toWall * r.y / (uBoreHeight * (0.9 + 0.2 * c1.b));
    float wall = (1.0 - smoothstep(1.15, 1.7, k)) * smoothstep(1500.0, 700.0, toWall);
    float white = max(1.0 - smoothstep(0.1, 0.2, k), smoothstep(0.7, 0.86, k));
    vec3 lit = skyIrradiance(vec3(0.0, 0.6, 0.8)) / 3.14159;
    // Its dark face stands in the mirror between the white of its foot and of its lip.
    refl = mix(refl, mix(vec3(0.2, 0.25, 0.24), vec3(0.9), white) * lit, 0.8 * wall * mix(1.0, 0.55, smoothstep(1.0, 1.15, k)));
  }
  // Sparkle: here and there a ripple's flank finds the break in the cloud and throws it at the lens, a point at a time.
  refl += mix(uSunColour, vec3(dot(uSunColour, vec3(0.3333))), 0.75) * 0.22 * smoothstep(0.8, 0.95, c2.a) * smoothstep(0.5, 0.75, c1.a) * ruffle * sun * smoothstep(0.02, 0.08, depth);
  vec3 hv = normalize(v + uSunDir);
  // The glare path toward the sun: a hard core, and the broken glitter of the ripples round it.
  refl += uSunColour * (pow(max(dot(n, hv), 0.0), 500.0) * 4.0 + pow(max(dot(n, hv), 0.0), 90.0) * 0.9 * (0.4 + 1.2 * c2.a)) * sun;
  vec3 e = skyIrradiance(vec3(0.0, 1.0, 0.0)) * open + uSunColour * (uSunDir.y * sun);
  float murk = 1.0 - exp(-max(depth, 0.0) * 1.3);
  vec3 body = vec3(0.125, 0.11, 0.085) * e / 3.14159;
  // The meniscus: where the water climbs a stone it turns up to the sky, a bright thread along the line.
  float lip = smoothstep(0.001, 0.006, depth) * (1.0 - smoothstep(0.006, 0.028, depth));
  // A ruffled stretch throws the bright sky wide of the lens and reads dark; near the lens the eye looks down into the water and the bed shows.
  refl *= 1.0 - 0.4 * paw * (1.0 - lip);
  // Under the wall the break in the cloud over it lies down the flat as a broad bright path, worked by the ripples, with dark slate either side.
  float lane = pow(max(dot(normalize(r.xz + 1e-5), vec2(-0.12, -0.99)), 0.0), 6.0) * smoothstep(0.0, 0.3, under);
  refl = mix(refl * (1.0 - 0.35 * under), uHaze * 1.9 * (0.4 + 0.8 * c2.a), 0.85 * lane);
  fres *= mix(0.55, 1.0, smoothstep(8.0, 34.0, distance(cameraPosition, vWorld)));
  fres = mix(fres, 0.8, 0.18 * lip);
  col = fres * refl + (1.0 - fres) * murk * body;
  alpha = fres + (1.0 - fres) * murk;
  // Foam: lace left along the line where the water works against stone and sand, and in lanes the wind draws out over the open sheet.
  vec2 drift = uTime * uWind * 0.05;
  float lace = dot(textureLod(tFoamPic, p / 6.0 - drift, levelOf(tFoamPic, 6.0)).rgb, vec3(0.3333));
  float stretch = smoothstep(0.35, 0.65, barA.r);
  float lanes = smoothstep(0.62, 0.85, 0.5 * barB.g + 0.5 * barA.g) * smoothstep(0.03, 0.12, depth);
  float foamed = smoothstep(0.38, 0.7, lace) * clamp((1.0 - smoothstep(0.0, 0.07, depth)) * stretch + 0.45 * lanes * gust, 0.0, 1.0) * edge;
  col = mix(col, vec3(0.8, 0.82, 0.8) * e / 3.14159, foamed);
  alpha = mix(alpha, 1.0, foamed);
  // A bar the water has just left is wet: dark from above, and at a glance it holds the sky as the water beside it does. No hole in the mirror.
  float band = wetBand / 0.42;
  col = mix(0.85 * fres * refl * band, col, edge);
  alpha = mix(band * max(0.42, 0.85 * fres), alpha, edge);
  // The sheet of the flat does not reach the sea: down the shelving shore it thins out in tongues. It lay over the surf to its own
  // last cell, a mirror with a ruled edge, and the surf is the sea's.
  float toSea = smoothstep(-0.1, 0.6, land.r + 0.5 * (barA.b - 0.5) + 0.2 * (barB.b - 0.5));
  gl_FragColor = vec4(rigOut(col), alpha) * (1.0 - uSolo) * toSea;
  if (dry) discard;
}`;

/**
 * The film's sheet knows what stands in it. The engine draws the depth of every solid thing first (src/core/engine.ts, the place's
 * `depthFirst`); the sheet reads it (index.ts hands it over as tWetSeen) and so has the metres of water that lie along the eye's line
 * between its own surface and the first stone, weed or sand under it. Where that goes to nothing something breaks the surface: the water
 * climbs it in a bright thread and leaves lace round it, in a line as ragged as the lace, not the ruled cut of a plane through a model.
 * The card loop keeps the sheet's text as it was.
 */
const WET_EDGE: [string, string][] = [
  ['uniform sampler2D tFoamPic;\nvarying vec3 vWorld;', 'uniform sampler2D tFoamPic;\nuniform highp sampler2D tWetSeen;\nuniform float uWetSeen;\nvarying vec2 vLens;\nvarying vec3 vWorld;'],
  [
    '  float film = 0.09 + 0.3 * under;',
    `  float standing = 1e3;
  if (uWetSeen > 0.5) {
    float there = vLens.y / (2.0 * texelFetch(tWetSeen, ivec2(gl_FragCoord.xy), 0).r - 1.0 + vLens.x);
    float here = vLens.y / (2.0 * gl_FragCoord.z - 1.0 + vLens.x);
    standing = max(there - here, 0.0) * dist / here;
  }
  // Only what stands up out of the bed: over the bed itself the water thins as the land's own height says, and that edge is drawn already.
  float stone = (1.0 - smoothstep(0.3, 0.8, standing * max(v.y, 0.02) / max(depth, 0.01))) * (1.0 - smoothstep(120.0, 260.0, dist));
  float film = 0.09 + 0.3 * under;`,
  ],
  [
    '  float fineBed = 0.2 * (textureLod(tBedFine, p / 37.0, levelOf(tBedFine, 37.0)).r - 0.5) + 0.07 * (textureLod(tBedFine, p.yx / 9.7, levelOf(tBedFine, 9.7)).r - 0.5);',
    // The bed is the world's, not the lens's: read by the pixel's foot its relief flattened with distance and every pool changed its outline
    // as the lens came on. Its level is pinned at a hand and a half a texel, and gives way only where the foot is four times that.
    '  float fineBed = 0.2 * (textureLod(tBedFine, p / 37.0, max(0.0, levelOf(tBedFine, 37.0) - 2.0)).r - 0.5) + 0.07 * (textureLod(tBedFine, p.yx / 9.7, max(2.0, levelOf(tBedFine, 9.7) - 2.0)).r - 0.5);',
  ],
  [
    '  return 0.5 * log2(max(max(dot(footX, footX), dot(footY, footY)) * min(dot(footX, footX), dot(footY, footY)), 1e-12)) * 0.5 + log2(size) + 0.4;',
    `  float longSide = max(dot(footX, footX), dot(footY, footY));
  float between = 0.25 * log2(max(longSide * min(dot(footX, footX), dot(footY, footY)), 1e-12)) + log2(size) + 0.4;
  // Never much finer than the long side: read finer, every crest jumped from one frame to the next as the lens moved and the flat boiled.
  return max(between, 0.5 * log2(max(longSide, 1e-12)) + log2(size) - 1.2);`,
  ],
  [
    '  depth += 0.004 * sin(uTime * 0.9 + tide * 19.0) + 0.004 * sin(uTime * 2.3 + p.x * 0.9 + p.y * 0.7 + tide * 7.0);',
    // On a bed this flat a finger of level is metres of waterline: patches came and went. The line now works a hand's breadth.
    '  depth += 0.0015 * sin(uTime * 0.9 + tide * 19.0) + 0.0015 * sin(uTime * 2.3 + p.x * 0.9 + p.y * 0.7 + tide * 7.0);',
  ],
  [
    '  float murk = 1.0 - exp(-max(depth, 0.0) * 1.3);',
    `  float murk = 1.0 - exp(-max(depth, 0.0) * 1.3);
  // The water is full of sand: a stone's drowned foot is veiled by the length of water the eye looks through to it.
  murk = max(murk, 0.4 * stone * (1.0 - exp(-standing * 1.2)));`,
  ],
  [
    '  float ruffle = 0.45 + 0.55 * paw;',
    `  // Before the wall the flat is not still: what it pushes ahead of it runs out over the sheet in low quick swells, crest after crest, bent by the bed, and dies in a hundred metres.
  float run = p.y - uFront - 20.0 * sin(p.x * 0.0076 + 1.3);
  float pushed = exp(-max(run, 0.0) / 70.0) * smoothstep(-10.0, 5.0, run) * smoothstep(0.0, 0.06, depth);
  float runPhase = run * 0.52 + 5.0 * (barA.b - 0.5) + 1.6 * (barB.b - 0.5) - uTime * 2.4;
  float ruffle = max(0.45 + 0.55 * paw, pushed);`,
  ],
  [
    '  slope += ringSlope;',
    `  slope += ringSlope;
  slope.y += 0.07 * pushed * (cos(runPhase) + 0.5 * cos(2.3 * runPhase + 1.0));`,
  ],
  [
    '    ringSlope += (d / l) * wave * 0.13;',
    '    ringSlope += (d / l) * wave * 0.2;',
  ],
  [
    '  float lip = smoothstep(0.001, 0.006, depth) * (1.0 - smoothstep(0.006, 0.028, depth));',
    `  float lip = smoothstep(0.001, 0.006, depth) * (1.0 - smoothstep(0.006, 0.028, depth));
  lip = max(lip, stone * (1.0 - smoothstep(0.0, 0.05, standing)));`,
  ],
  [
    '  col = mix(col, vec3(0.8, 0.82, 0.8) * e / 3.14159, foamed);',
    `  float collar = stone * (1.0 - smoothstep(0.02, 0.05 + 0.6 * barB.a * barA.a, standing)) * smoothstep(0.42, 0.7, lace + 0.6 * (c1.a - 0.5)) * (0.25 + 0.75 * stretch);
  foamed = max(foamed, 0.8 * collar);
  col = mix(col, vec3(0.8, 0.82, 0.8) * e / 3.14159, foamed);`,
  ],
];
export const POOL_FRAGMENT = (rings: number): string =>
  WET_EDGE.reduce((text, [from, to]) => {
    if (text.split(from).length !== 2) throw new Error(`The sheet has no such line, or more than one: ${from}`);
    return text.replace(from, () => to);
  }, POOL_SHEET(rings));

const BORE_SHAPE_GLSL = /* glsl */ `
uniform float uFront;
uniform float uBoreHeight;
uniform sampler2D tChop;
uniform sampler2D tFoam;
// How far the front runs ahead of or behind its line at x: the wall is one wall, and it is not ruled.
float boreLine(float x) {
  return 20.0 * sin(x * 0.0076 + 1.3) + 8.0 * sin(x * 0.021 + uTime * 0.25) + 3.0 * sin(x * 0.09 - uTime * 0.6);
}
float boreHigh(float x) {
  float strait = smoothstep(950.0, 520.0, abs(x - 80.0));
  return uBoreHeight * (0.3 + 0.7 * strait) * (0.88 + 0.12 * sin(x * 0.021 + uTime * 0.7) + 0.08 * sin(x * 0.063 - uTime * 1.1));
}
// The churn of the face: round heads of white water with sharp creases between, falling down the face as the wall runs. x: big heads, y: small.
vec2 boreChurn(float x, float s) {
  // Read no finer than the sheet is meshed (0.7 m): finer would stand as a curtain of ridges down the face.
  float a = textureLod(tFoam, vec2(x * 0.8, s + uTime * 6.0) / 64.0, 2.3).g;
  float b = textureLod(tFoam, vec2(x + 2.0 * uTime, s * 1.2 + uTime * 9.0) / 21.0, 3.7).g;
  return vec2(a, b);
}
// A point of the bore: x across the strait, s metres behind the front along the bed. Returns the world place, w = s in wall heights.
vec4 boreAt(float x, float s) {
  float H = boreHigh(x);
  float u = s / H;
  float uc = clamp(u / 0.75, 0.0, 1.0);
  // A breaking face: hollow at the foot, steepest under the lip, and the lip thrown forward over it.
  float rise = pow(uc, 1.6);
  // Behind the lip the water falls away at once: from the flat nothing of the back stands over the lip.
  float back = 0.6 + 0.4 * exp(-max(u - 0.75, 0.0) / 0.3);
  float y = u < 0.0 ? 0.26 * (1.0 + s / 48.0) + 0.04 : 0.3 + (H - 0.3) * rise * back;
  float fwd = H * 0.5 * uc * uc * uc * exp(-max(u - 0.75, 0.0) / 0.25) * step(0.0, u);
  float lumpA = textureLod(tFoam, vec2(x, s + uTime * 7.0) / 83.0, 1.8).r - 0.5;
  float lumpB = textureLod(tFoam, vec2(x + 3.0 * uTime, s - uTime * 4.0) / 31.0, 3.2).r - 0.5;
  float amp = H * smoothstep(-0.02, 0.3, u) * (0.2 * exp(-max(u - 0.75, 0.0) / 0.4) + 0.03);
  y += amp * (1.3 * lumpA + 0.7 * lumpB);
  fwd += amp * 0.9 * lumpB;
  // White water piles on the face and the crest in heads.
  vec2 ch = boreChurn(x, s);
  // The heads pile at the foot and again on the lip; the hollow face between is drawn smooth.
  float churn = smoothstep(-0.01, 0.1, u) * (1.0 - 0.75 * smoothstep(0.2, 0.3, u) * smoothstep(0.75, 0.6, u)) * exp(-max(u - 0.75, 0.0) / 0.12);
  float puff = H * churn * (0.2 * ch.x + 0.09 * ch.y);
  y += puff * 0.55;
  fwd += puff;
  float z = uFront + boreLine(x) - s + fwd;
  float bed = max(texture2D(tLand, (vec2(x, z) - uLandRect.xy) * uLandRect.zw).r, 0.0);
  return vec4(x, bed + y, z, u);
}`;

export const BORE_VERTEX = /* glsl */ `
${RIG_UNIFORMS_GLSL}
${BORE_SHAPE_GLSL}
varying vec3 vWorld;
varying vec3 vNormalW;
varying vec3 vRide;
void main() {
  vec4 at = boreAt(position.x, position.y);
  vec3 ax = boreAt(position.x + 1.6, position.y).xyz - boreAt(position.x - 1.6, position.y).xyz;
  vec3 as = boreAt(position.x, position.y + 1.0).xyz - boreAt(position.x, position.y - 1.0).xyz;
  vWorld = at.xyz;
  vNormalW = normalize(cross(ax, as));
  vRide = vec3(position.x, position.y, at.w);
  gl_Position = projectionMatrix * viewMatrix * vec4(at.xyz, 1.0);
}`;

export const BORE_FRAGMENT = /* glsl */ `
precision highp float;
${NOISE_GLSL}
${RIG_GLSL}
${BORE_SHAPE_GLSL}
varying vec3 vWorld;
varying vec3 vNormalW;
varying vec3 vRide;
void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  float u = vRide.z;
  vec2 ch = boreChurn(vRide.x, vRide.y);
  // Marks ride with the wall and tumble down its face.
  // Down the face they are laid by the height (the face is too steep for the metres along the bed to carry them: they would hang as a curtain); over the back by the bed.
  float Hh = boreHigh(vRide.x);
  float down = mix(-1.1 * (Hh - vWorld.y), vRide.y - 0.75 * Hh, smoothstep(0.7, 0.85, u));
  // One speed for all of it: a scroll that changed with the place on the wall sheared the marks into a curtain of lines.
  vec2 q = vec2(vRide.x, down - uTime * 8.0);
  vec4 a = texture2D(tChop, q / 29.0);
  vec4 f1 = texture2D(tFoam, q * vec2(1.0, 0.5) / 13.0);
  // Strings of white running down the face: long down it, a hand to a metre across.
  vec4 f2 = texture2D(tFoam, vec2(q.y * 0.2, q.x * 1.3) / 3.1 + f1.rb * 0.35);
  float strings = 0.6 * f2.r + 0.4 * texture2D(tFoam, vec2(q.y * 0.3, q.x * 2.9) / 3.1 + 0.37 + f1.ga * 0.2).g;
  float fine = texture2D(tFoam, q / 4.1 + f1.rb * 0.2).r;
  float face = smoothstep(1.9, 0.7, u);
  float lace = mix(0.5 * a.a + 0.5 * texture2D(tChop, q.yx / 3.3).a, 0.2 + 0.35 * f1.r + 0.3 * fine, face);
  // Under the heads of the crest the lifted water shows dark in windows; at the foot it is all broken white.
  float big = texture2D(tFoam, vec2(vRide.x, uTime * 3.0) / 97.0).r;
  // The face is one dark band of lifted water from the churn at the foot to the heads of the crest; its edges are torn, strings of white run down it.
  float tear = 0.2 * (big - 0.5) + 0.05 * (f1.r - 0.5);
  float lifted = smoothstep(0.4 + tear, 0.54 + tear, u) * smoothstep(0.8 + 0.5 * tear, 0.68 + 0.5 * tear, u);
  // Not a band from side to side: windows, each some tens of metres long, in a wall that is otherwise broken white.
  float pane = 0.65 * vnoise(vec2(vRide.x / 34.0 + 7.0, uTime * 0.07)) + 0.35 * vnoise(vec2(vRide.x / 11.0, u * 5.0 + uTime * 0.3));
  lifted *= smoothstep(0.22, 0.44, pane + 0.22 * (f1.r - 0.45) + 0.12 * (strings - 0.45));
  float amount = mix(0.5 + 0.4 * exp(-max(u - 1.0, 0.0) * 0.1), 1.08 - 0.8 * lifted, face);
  // Ahead of the wall foam runs out over the wet flat in tongues, thinning to lace.
  float ahead = clamp(-vRide.y / 48.0, 0.0, 1.0);
  float tongue = texture2D(tFoam, vec2(vRide.x, uTime * 2.0) / 61.0).r + 0.5 * texture2D(tFoam, vec2(vRide.x, vRide.y * 0.5 + uTime * 5.0) / 23.0).r;
  amount = mix(amount, 1.25 - 2.3 * ahead / (0.25 + tongue), step(u, 0.0));
  float foam = smoothstep(1.0 - amount, mix(1.2, 1.5, face) - amount, mix(lace, 0.16 + 0.34 * strings + 0.3 * f1.r + 0.24 * fine, face * smoothstep(0.0, 0.5, lifted)));
  // Cut at the end, not here (see the pools).
  bool bare = u < 0.0 && foam < 0.35;
  vec2 bump = vec2(f2.g - f1.a, f2.a - f1.g) * 0.5 + (a.xy - 0.5) * (1.0 - face);
  // White water is not a skin: its light comes from all through it, so the folds of the sheet under it count for less.
  vec3 n = normalize(mix(vNormalW, vec3(0.0, 0.62, 0.78), mix(0.6, 0.95, smoothstep(0.55, 0.7, u)) * foam * face) + vec3(bump.x, 0.0, bump.y) * mix(0.35, 0.3, foam));
  if (dot(n, v) < 0.0) n = reflect(n, v);
  // The creases between the heads hold no light.
  float crease = smoothstep(0.02, 0.4, ch.x) * (0.5 + 0.5 * smoothstep(0.02, 0.35, ch.y));
  float pit = (0.55 + 0.45 * smoothstep(0.3, 0.62, f1.r)) * (0.7 + 0.3 * smoothstep(0.3, 0.6, f2.r)) * (0.75 + 0.25 * smoothstep(0.03, 0.3, f2.g));
  float hollow = mix(1.0, (0.5 + 0.5 * crease) * pit, face);
  // The lifted water is thick with sand: slate green, brown where it is thin at the lip.
  vec3 water = mix(vec3(0.04, 0.055, 0.046), vec3(0.11, 0.095, 0.06), smoothstep(0.55, 0.85, u) * face);
  // White water is lit all through: it holds more light than a painted wall.
  vec3 white = vec3(0.95, 0.96, 0.96);
  // Not one sheet of white: thick heads and thin runs between them, streaming down the face, grey where the dark water shows through.
  float thick = smoothstep(0.15, 0.7, 0.14 * strings + 0.5 * f1.r + 0.36 * fine);
  white *= mix(1.0, 0.42 + 0.58 * thick, face);
  vec3 albedo = mix(water, white, foam);
  vec3 col = rigShade(vWorld, n, v, albedo, mix(0.45, 1.0, foam), mix(1.0, hollow, foam));
  // Lit from behind: where the lifted water thins toward the lip the light comes through it green, and the crest's white burns.
  float behind = 0.35 + 0.65 * pow(max(dot(-v, uSunDir), 0.0), 2.0);
  float thin = smoothstep(0.5, 0.85, u) * face;
  col += (1.0 - foam) * vec3(0.05, 0.065, 0.04) * thin * behind * (uSunColour * 0.25 + skyIrradiance(vec3(0.0, 1.0, 0.0)) * 0.25);
  col += foam * hollow * white * uSunColour * 0.2 * behind * smoothstep(0.3, 0.6, u);
  col += foam * hollow * white * skyIrradiance(vec3(0.0, 1.0, 0.0)) * 0.2;
  gl_FragColor = vec4(rigOut(col), 1.0);
  if (bare) discard;
}`;

export const SPRAY_VERTEX = /* glsl */ `
${RIG_GLSL}
attribute vec4 aAt;
attribute vec4 aLook;
varying vec2 vUv;
varying vec4 vLook;
varying vec3 vLight;
varying float vMist;
void main() {
  vec4 centre = viewMatrix * vec4(aAt.xyz, 1.0);
  float turn = aLook.z;
  vec2 corner = position.xy * aAt.w;
  corner = vec2(corner.x * cos(turn) - corner.y * sin(turn), corner.x * sin(turn) + corner.y * cos(turn));
  // A stretch under zero is a single drop (under minus fifty the ring it leaves on the water); else a head of spray.
  float ring = step(aLook.w, -50.0);
  centre.xy += corner * vec2(1.0, abs(aLook.w) - 100.0 * ring);
  vUv = position.xy;
  vLook = aLook;
  vMist = step(1.0, aLook.x);
  vLook.x -= vMist;
  vec4 land = landAt(aAt.xz);
  float open = mix(land.g, 1.0, clamp((aAt.y - land.r) / 120.0, 0.0, 1.0));
  // Thrown water in the open air: lit from every side, the sky's light all round it.
  vLight = (skyIrradiance(vec3(0.0, 1.0, 0.0)) * (0.5 + 0.9 * open) + uSunColour * 0.6 * sunAt(aAt.xyz, land)) / 3.14159;
  // Mist is water too thin to be white: it holds the grey of the storm.
  vLight *= mix(vec3(1.0), vec3(0.23, 0.26, 0.28), vMist);
  // Thrown water between the lens and the sun burns: the light comes forward through it.
  float through = pow(max(dot(normalize(aAt.xyz - cameraPosition), uSunDir), 0.0), 3.0);
  vLight += uSunColour * through * mix(0.07, 0.012, vMist) * mix(0.35, 1.0, open);
  gl_Position = projectionMatrix * centre;
}`;

export const SPRAY_FRAGMENT = /* glsl */ `
precision highp float;
${RIG_UNIFORMS_GLSL}
uniform sampler2D tFoam;
varying vec2 vUv;
varying vec4 vLook;
varying vec3 vLight;
varying float vMist;
void main() {
  float r2 = dot(vUv, vUv);
  // Thrown water is ragged: the picture is laid finer over a head of spray than over a bank of mist.
  vec4 t = texture2D(tFoam, vUv * mix(0.4, 0.19, vMist) + vLook.y * vec2(3.1, 7.3));
  // A head of thrown water: eaten at the rim into lumps and strings, thick in the middle.
  float eat = r2 + mix(1.5, 0.22, vMist) * (t.r - 0.5) + mix(0.6, 0.0, vMist) * (0.5 - t.g);
  float body = 1.0 - smoothstep(mix(0.22, -0.1, vMist), mix(0.72, 0.95, vMist), eat);
  float drop = step(vLook.w, -0.001);
  float ring = step(vLook.w, -50.0);
  float bead = mix(1.0 - smoothstep(0.2, 1.0, r2), smoothstep(0.3, 0.6, r2) * (1.0 - smoothstep(0.7, 1.0, r2)), ring);
  float alpha = clamp(mix(body * (0.55 + 0.45 * t.a), bead, drop) * vLook.x, 0.0, 1.0) * (1.0 - uSolo);
  vec3 col = vec3(0.95, 0.96, 0.96) * vLight * mix((0.9 + 0.6 * t.g) * mix(0.62 + 0.3 * body + 0.42 * vUv.y + 0.25 * (t.r - 0.5), 0.6, vMist), 0.75 + 0.6 * vUv.y, drop);
  gl_FragColor = vec4(col * alpha, alpha);
}`;

/**
 * The breaker of the approach, seen from a mile out against the light: a body of thrown water is grey where it is thick (the sky behind it
 * does not come through) and bright where it is torn thin, at its rim and in what the wind takes. White water keeps more of the shut
 * sky's light than the stone behind it, as the open sea does.
 */
export const SPRAY_OPENING_FRAGMENT = openingText(SPRAY_FRAGMENT, [
  // Seen from a mile out a card is a few pixels: the picture is laid finer over it, so it is torn water and not a billow.
  ['vUv * mix(0.4, 0.19, vMist)', 'vUv * mix(0.85, 0.19, vMist)'],
  [
    '  gl_FragColor = vec4(col * alpha, alpha);',
    `  float thick = smoothstep(0.3, 0.85, body * (0.55 + 0.45 * t.a)) * smoothstep(0.4, 0.8, vLook.x) * (1.0 - vMist) * (1.0 - drop);
  col = mix(col, vLight * vec3(0.4, 0.45, 0.46) * (0.8 + 0.5 * t.g), 0.35 * thick) * 1.7;
  gl_FragColor = vec4(col * alpha, alpha);`,
  ],
]);

/**
 * The pools in the card loop: every wave of the sheet goes a whole number of turns a loop, so the water of the last frame is that of the first
 * and none of it is left to the cross-fade. And once a loop a thin sheet washes up the flats and drains back: the level of the pools comes up
 * a few fingers, each stretch in its own time, with foam at its running edge, and what it leaves stays wet a while after it. At the loop's
 * first frame it is all the way out, so that frame is the key's picture.
 */
/** Metres the level comes up; how late in the loop a stretch may be, by its own time and by how near the establishing lens it lies. */
const WASH = { rise: 0.12, late: 0.1, near: 0.14 };
/**
 * Once a loop one gust crosses the wet before the establishing lens: a ruffled dark stretch `long` metres deep that goes over a round of
 * the flats `reach` metres wide about `at`, heading `way`. At the loop's first and last frames it is outside that round.
 */
const GUST = { at: [-172, 62] as const, way: [0.94, 0.34] as const, reach: 62, long: 36 };
export const POOL_LOOP_FRAGMENT = (rings: number): string =>
  loopText(POOL_SHEET(rings), [
    ['uniform sampler2D tChop;', 'uniform sampler2D tChop;\nuniform vec2 uLoop;'],
    ['- uTime * uWind * 0.16', '- (uLoop.x * uWind * 0.16 + uLoop.y * vec2(1.0, 1.0))'],
    ['+ uTime * vec2(uWind.y, -uWind.x) * 0.3', '+ (uLoop.x * vec2(uWind.y, -uWind.x) * 0.3 + uLoop.y * vec2(2.0, -1.0))'],
    ['- uTime * 2.1 +', `- ${loopAngle('2.1', 3)} +`],
    ['- uTime * 10.0 +', `- ${loopAngle('10.0', 13)} +`],
    ['sin(uTime * 0.9 +', `sin(${loopAngle('0.9', 1)} +`],
    ['sin(uTime * 2.3 +', `sin(${loopAngle('2.3', 3)} +`],
    ['sin(uTime * 0.35 +', `sin(${loopAngle('0.35', 1)} +`],
    ['vec2 drift = uTime * uWind * 0.05;', 'vec2 drift = uLoop.x * uWind * 0.05;'],
    [
      '  depth -= 0.07 * drawn;',
      `  depth -= 0.07 * drawn;
  float washAt = fract(uLoop.y - ${f(WASH.late)} * tide - ${f(WASH.near)} * smoothstep(55.0, 112.0, p.y));
  float washUp = smoothstep(0.02, 0.24, washAt);
  float wash = washUp * (1.0 - smoothstep(0.3, 0.58, washAt));
  float washWet = washUp * (1.0 - smoothstep(0.48, 0.74, washAt));
  depth += ${f(WASH.rise)} * wash;
  float wetDepth = depth + ${f(WASH.rise)} * (washWet - wash);`,
    ],
    ['bool dry = depth < -film;', 'bool dry = wetDepth < -film;'],
    [
      '  float gust = 0.35 + 0.65 * paw;',
      `  vec2 gustAt = p - vec2(${f(GUST.at[0])}, ${f(GUST.at[1])});
  float gustAlong = dot(gustAt, vec2(${f(GUST.way[0])}, ${f(GUST.way[1])})) + 12.0 * (barA.r - 0.5) + ${f(GUST.reach)} - ${f(2 * GUST.reach + GUST.long)} * uLoop.y;
  float gustOn = smoothstep(${f(-GUST.long)}, ${f(-0.62 * GUST.long)}, gustAlong) * (1.0 - smoothstep(${f(-0.25 * GUST.long)}, 0.0, gustAlong));
  gustOn *= (1.0 - smoothstep(${f(0.62 * GUST.reach)}, ${f(GUST.reach - 2)}, length(gustAt))) * smoothstep(0.02, 0.08, uLoop.y) * (1.0 - smoothstep(0.92, 0.98, uLoop.y));
  paw = max(paw, gustOn * (0.55 + 0.45 * barB.a));
  float gust = 0.35 + 0.65 * paw;`,
    ],
    ['smoothstep(-film, -0.004, depth);', 'smoothstep(-film, -0.004, wetDepth);'],
    [
      '  col = mix(col, vec3(0.8, 0.82, 0.8) * e / 3.14159, foamed);',
      `  foamed = max(foamed, smoothstep(0.22, 0.5, lace) * (1.0 - smoothstep(0.0, 0.035, depth)) * edge * washUp * (1.0 - smoothstep(0.3, 0.56, washAt)));
  col = mix(col, vec3(0.8, 0.82, 0.8) * e / 3.14159, foamed);`,
    ],
  ]);
