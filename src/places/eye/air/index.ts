// The air of the Eye: the evening sky with its one thin streak of cloud, the clear air that pales the far cliffs,
// and the mist that lies at their feet and on the far water.
import * as THREE from 'three';
import { volumeUniforms } from '../../../core/engine';
import { QUAD_VERTEX } from '../../../core/post';
import { smooth } from '../layout';
import { FPS } from '../../../config';
import { LID_GLSL, lidAt, lidUniforms } from '../../reveal/join/lid';
import { FLIGHT, KEYS } from '../cameras';
import { flight } from '../flight';
import handoff from '../handoff.json';
import { during } from '../shared/anchors';
import { MIST_SUN_GLSL, mistSunTexture } from './light';
import { mistNoise } from './noise';
import { PLATES, plateFor } from './plates';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

export const PARTS: readonly string[] = ['sky', 'air', 'mist'];

// The form of the mist by the key it is seen from. a: reach over the water, sheet height, bank height, depth of the bank (metres).
// b: thickness of the sheet, of the bank, how torn the sheet is, how much leaves the top in threads.
// c: the middle and the half length of the stretch of far shore it lies along (metres from north round the picture's cylinder, 0 for all of
// it), how much of that stretch is clear, and how much of it the mirror holds. d: how far the sheet's edge goes out in tongues, how
// far the sheet thins out from the wall, how close the tongues stand, and how far the heaps are as deep as they are long.
type Four = [number, number, number, number];
const MIST: Record<'wide' | 'low' | 'edge' | 'shore' | 'centre' | 'over', { a: Four; b: Four; c: Four; d?: Four }> = {
  wide: { a: [420, 2.5, 30, 320], b: [0.3, 0.38, 1.0, 0.4], c: [60, 560, 0.15, 1] },
  low: { a: [600, 3.0, 70, 420], b: [0.4, 0.6, 0.35, 0.3], c: [0, 0, 0, 1], d: [0.7, 0, 0, 0] },
  edge: { a: [560, 2.4, 34, 320], b: [0.25, 1.5, 0.75, 0.4], c: [0, 0, 0.1, 1], d: [1, 0, 0, 0] },
  shore: { a: [520, 3.0, 30, 320], b: [0.35, 1.2, 0.9, 0.3], c: [0, 0, 0.1, 1], d: [1, 0, 0, 0] },
  // The last shot is seen from the water and then from straight above. From the water it is a low torn bank at the foot of the far wall.
  centre: { a: [520, 2.0, 22, 200], b: [0.6, 1.5, 1.0, 0.5], c: [0, 0, 0.3, 0.6], d: [0.8, 1, 1, 1] },
  // From above the same bank has to be seen down through a dozen metres of itself and not along a thousand, and what the lens holds is
  // the shallows and the pool, not the foot of the wall: so as the camera climbs the bank is drawn thicker and stands farther out over
  // the shallows, in heaps as deep as they are long (d.w), without the threads that would lie as white strokes.
  over: { a: [560, 2.0, 4.5, 800], b: [0.6, 60, 1.0, 0], c: [0, 0, 0.1, 0], d: [0, 1, 0, 1] },
};

// The heights of the camera (metres over the water) between which the bank of the last shot takes the form it has from above.
const OVER = [15, 220] as const;
const HIGH = { a: new THREE.Vector4(...MIST.over.a), b: new THREE.Vector4(...MIST.over.b), c: new THREE.Vector4(...MIST.over.c), d: new THREE.Vector4(...(MIST.over.d ?? [0, 0, 0, 0])) };

const SKY_VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 w = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const SKY_FRAGMENT = /* glsl */ `
varying vec3 vDir;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  vec3 d = normalize(vDir);
  // The footprint of a pixel on the far picture, taken here before any branch so that the frame repeats.
  vec4 plateSpot = plateAt(cameraPosition, d);
  vec2 plateGx = dFdx(plateSpot.xy);
  vec2 plateGy = dFdy(plateSpot.xy);
  if (uPlateTone.w > 0.5) {
    gl_FragColor = vec4(rigOut(farRadianceAt(cameraPosition, d, 0.0, plateSpot, plateGx, plateGy)), 1.0);
    return;
  }
  vec3 c = skyRadiance(d);
  // One thin streak of high cloud, lit from under by the sun that has left the ground.
  float az = atan(d.x, -d.z);
  float el = asin(clamp(d.y, -1.0, 1.0));
  float along = (az - 0.42) / 0.5;
  float lane = el - 0.2 - 0.03 * along - 0.012 * sin(along * 5.0);
  if (abs(lane) < 0.02 && abs(along) < 1.8) {
    float wisp = fbm(vec2(az * 26.0 - uTime * 0.014, lane * 240.0));
    float fine = fbm(vec2(az * 90.0 - uTime * 0.03, lane * 520.0) + 4.0);
    float streak = exp(-along * along * 1.6) * exp(-pow(lane / 0.006, 2.0)) * smoothstep(0.25, 0.7, 0.6 * wisp + 0.4 * fine);
    c += (uSunColour * 0.085 + uSkyHorizon * 0.25) * streak * 0.45;
  }
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

const VOLUME_FRAGMENT = /* glsl */ `
uniform highp sampler2D tDepth;
uniform mat4 uInvProjection;
uniform mat4 uCameraWorld;
uniform float uSeq;
uniform float uSampleIndex;
uniform float uHaze;
uniform float uMist;
uniform float uThin;
varying vec2 vUv;
${NOISE_GLSL}
${RIG_GLSL}
${LID_GLSL}

const float TOP = 150.0;

// The far shore the mist lies against: its middle on the water and its radius. With a picture hung it is the foot of the picture.
vec3 farShore() {
  return uPlateTone.w > 0.5 ? vec3(uPlateAt.x, uPlateAt.z, uPlateAt.w) : vec3(0.0, 0.0, 1000.0);
}

// The mist without its grain, at q: x metres along the far shore, y metres over the water, z metres before the wall.
// x: how thick the sheet on the water is there, y: the top of the bank there, z: how much of the place the mist covers there.
// Two axes of the noise lie on the water and the third is time: a bank swells, thins and closes where it lies. Nothing slides.
// Where the noise of the mist is read: metres along the shore and metres before the wall. Seen from above (uMistD.w) it is read flat
// on the water and not round the middle of the ring, so that no heap is drawn out toward that middle.
vec2 lie;

vec3 mistForm(vec3 q) {
  if (q.z > uMistA.x || q.z < 0.0) return vec3(0.0);
  // The edge of the sheet on the water is not one line: it goes out in tongues, and the same tongue is one all the way from the wall.
  float reach = uMistA.x;
  float tongue = 1.0;
  if (uMistD.x > 0.0) {
    // uMistD.z draws the tongues closer together (a long lens holds only a short run of shore) and leaves the water bare between them.
    tongue = smoothstep(0.3, 0.68, texture(tMistNoise, vec3(q.x / (520.0 / (1.0 + 2.0 * uMistD.z)) + 0.6, 0.21, 0.25 + uTime * 0.004)).b);
    reach *= mix(1.0, 0.1 + 0.9 * tongue, uMistD.x);
    tongue = mix(1.0, tongue, uMistD.z);
  }
  float near = 1.0 - q.z / reach;
  vec4 big = texture(tMistNoise, vec3(lie.x / 1300.0, lie.y / 1300.0, uTime * 0.0042));
  vec4 mid = texture(tMistNoise, vec3(lie.x / 410.0 + 0.31, lie.y / 900.0 + 0.17, 0.5 + uTime * 0.0085));
  float cover = smoothstep(0.0, 0.55, mix(-0.25, 1.0, near) - uMistC.z + uMistB.z * (2.6 * (big.g - 0.5) + 1.2 * (mid.a - 0.5)));
  if (uMistC.y > 0.0) cover *= smoothstep(uMistC.y, 0.3 * uMistC.y, abs(q.x - uMistC.x));
  float sheetTop = uMistA.y * (0.35 + 1.5 * mid.g);
  float ramp = smoothstep(uMistA.w, 0.0, q.z);
  // The bank does not stand along the whole wall: here it is heaped, there the foot of the wall is clear down to the sheet on the water.
  float stands = mix(0.3, 1.0, smoothstep(0.3, 0.6, 0.55 * big.a + 0.45 * mid.g + 0.25 * (1.0 - uMistB.z)));
  float top = uMistA.z * ramp * stands * (0.35 + 1.5 * mid.r) + sheetTop;
  // Where uMistD.y asks, the sheet thins all the way out from the wall, so that it has no outer edge to see from above.
  float thins = mix(1.0, pow(clamp(near, 0.0, 1.0), 1.6), uMistD.y);
  return vec3(uMistB.x * cover * thins * tongue * exp(-q.y / sheetTop), top, cover * ramp * stands);
}

// How thick the mist is at q. h is how high the point stands in the bank, 0 at the water and 1 at its top.
float mistAt(vec3 q, out float h) {
  h = 0.0;
  vec3 form = mistForm(q);
  if (form.y <= 0.0) return 0.0;
  float d = form.x;
  h = q.y / form.y;
  // The grain is the bank's: the sheet on the water alone has none, and is not asked for it.
  if (h < 3.0 && form.z > 0.0) {
    // The grain: heaps and hollows read along the shore and by height, and drawn out the way the lens looks through the bank, so that a
    // look through its depth finds one heap and not the sum of many. They are carried up slowly and pushed through that depth, so what
    // is seen of them turns over and is never the same shape carried sideways.
    // From above (uMistD.w) the same heaps are as deep as they are long, since the lens then looks down on them and not through them.
    vec4 g = texture(tMistNoise, vec3(lie.x / 130.0, q.y / 50.0 - uTime * 0.01, lie.y / mix(1100.0, 150.0, uMistD.w) + uTime * 0.004));
    vec4 fine = texture(tMistNoise, vec3(lie.x / 37.0 + 0.4, q.y / 21.0 - uTime * 0.022, lie.y / mix(420.0, 44.0, uMistD.w) - uTime * 0.007));
    float heap = 0.05 + 1.9 * pow(smoothstep(0.3, 0.72, mix(g.g, g.r, 0.4)), 1.5);
    h /= heap;
    float body = pow(clamp(1.0 - h - 0.45 * (fine.b - 0.3) * smoothstep(0.15, 0.9, h), 0.0, 1.0), 1.6);
    // What leaves the top: thin threads that stand up out of the bank and lean over as they go.
    float thread = smoothstep(0.55, 0.8, texture(tMistNoise, vec3(lie.x / 64.0 + 0.25 * h, q.y / 170.0 - uTime * 0.007, lie.y / mix(800.0, 90.0, uMistD.w) + uTime * 0.003)).g + 0.3 * (fine.g - 0.5));
    d += uMistB.y * form.z * smoothstep(0.2, 0.9, heap) * (body + uMistB.w * thread * smoothstep(3.0, 0.9, h) * smoothstep(0.3, 0.9, h));
  }
  return d;
}
${MIST_SUN_GLSL}

void main() {
  ivec2 pixel = 2 * ivec2(gl_FragCoord.xy);
  float depth = texelFetch(tDepth, pixel, 0).r;
  vec2 uv = (vec2(pixel) + 0.5) / vec2(textureSize(tDepth, 0));
  vec4 view = uInvProjection * vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec3 world = (uCameraWorld * vec4(view.xyz / view.w, 1.0)).xyz;
  vec3 ro = uCameraWorld[3].xyz;
  vec3 rd = world - ro;
  float far = length(rd);
  rd /= far;
  // The far world is a picture with its own air in it: the air of the place is laid over it only as far as its cylinder stands.
  vec3 shore = farShore();
  vec2 o = ro.xz - shore.xy;
  float qa = max(dot(rd.xz, rd.xz), 1e-6);
  float qb = dot(o, rd.xz);
  float qc = dot(o, o);
  float wall = (-qb + sqrt(max(qb * qb - qa * (qc - shore.z * shore.z), 0.0))) / qa;
  far = min(far, uPlateTone.w > 0.5 ? wall : 20000.0);
  // An ordered scatter, not a random one: each sample of a frame takes the next place of the golden ratio in a pixel's step, so that
  // the samples of a pixel stand evenly through it and the weave closes in two.
  float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))) + 0.6180339887 * uSampleIndex);

  // The clear air: thickest at the water, gone by the top of the walls. It takes the colour of the low sky it is seen against, and where the
  // way through it lies in the sun it takes the sun too: the air over the shaded water is blue and the air under the lit rim is warm.
  float k0 = 0.00005 * uHaze * uThin;
  float scale = 150.0;
  float y1 = ro.y + rd.y * far;
  float od = abs(rd.y) > 1e-4 ? k0 * scale * (exp(-max(ro.y, 0.0) / scale) - exp(-max(y1, 0.0) / scale)) / rd.y : k0 * exp(-max(ro.y, 0.0) / scale) * far;
  od = max(od, 0.0);
  float through = exp(-od);
  vec3 low = skyRadiance(normalize(vec3(rd.x, 0.05, rd.z)));
  float toSun = dot(rd, uSunDir);
  // Where the air is too thin to show, the sun in it is not asked after. Six looks along the way, which the samples of a frame fill in.
  float inSun = 0.0;
  if (through < 0.997) {
    for (int i = 0; i < 6; i++) inSun += mistSun(ro + rd * (min(far, 2600.0) * (float(i) + jitter) / 6.0));
    inSun /= 6.0;
  }
  vec3 light = (low * vec3(0.8, 0.8, 0.84) + uSunColour * (0.016 + 0.03 * toSun * toSun + 0.05 * pow(max(toSun, 0.0), 6.0)) * inSun) * (1.0 - through);

  // The mist, marched through the ring of water it lies on.
  float mistOn = uMist * uThin;
  if (mistOn > 0.0 && uMistA.x > 0.0) {
    // Two rings: the sheet lies low over the whole reach, the bank stands only before the wall. A ray is marched from where it first
    // comes under the one or the other, so that the steps are spent where there is mist.
    float inner = max(shore.z - uMistA.x, 0.0);
    float before = max(shore.z - uMistA.w, 0.0);
    float tSheet = qc < inner * inner ? (-qb + sqrt(max(qb * qb - qa * (qc - inner * inner), 0.0))) / qa : 0.0;
    float tBank = qc < before * before ? (-qb + sqrt(max(qb * qb - qa * (qc - before * before), 0.0))) / qa : 0.0;
    float ry = abs(rd.y) < 1e-5 ? 1e-5 : rd.y;
    float atWater = -ro.y / ry;
    float atSheetTop = (6.5 * uMistA.y - ro.y) / ry;
    float atTop = (min(TOP, 5.0 * uMistA.z) - ro.y) / ry;
    float end = min(far, wall);
    float a0 = max(tSheet, min(atWater, atSheetTop));
    float a1 = min(min(tBank, end), max(atWater, atSheetTop));
    float b0 = max(tBank, min(atWater, atTop));
    float b1 = min(end, max(atWater, atTop));
    float t0 = max(a1 > a0 ? a0 : b0, 0.0);
    float t1 = b1 > b0 ? b1 : a1;
    if (t1 > t0) {
      // Twelve steps where the way goes through the bank before the wall, half of them where it meets only the thin sheet on the water.
      int steps = b1 > b0 ? 12 : 6;
      // The low sun comes through the mist from the side: forward of it the mist is bright, and a little again straight back.
      float phase = 0.62 + 0.9 * pow(max(toSun, 0.0), 3.0) + 0.38 * toSun * toSun;
      vec3 skyLight = mistSkyLight(low);
      // The mist stands in the light of the wall behind it: where the foot of the wall in the picture is in the sun the mist before it is, and
      // where the picture's wall is in shade the mist is the blue grey of the sky. The picture is read wide and soft, so no edge of it shows.
      float wallSun = 1.0;
      if (uPlateTone.w > 0.5) {
        vec3 foot = farRadianceLevel(ro, normalize(vec3(rd.x, 0.0, rd.z) * wall + vec3(0.0, 0.05 * shore.z - ro.y, 0.0)), 7.5);
        wallSun = smoothstep(0.06, 0.34, (foot.r - foot.b) / max(foot.r + foot.b, 1e-3)) * smoothstep(0.04, 0.2, foot.r);
      }
      vec3 sum = vec3(0.0);
      float tr = 1.0;
      for (int i = 0; i < 12; i++) {
        if (i >= steps) break;
        // The steps stand closer toward the wall, where the bank is.
        float u0 = sqrt(float(i) / float(steps));
        float u1 = sqrt(float(i + 1) / float(steps));
        float dt = (t1 - t0) * (u1 - u0);
        vec3 p = ro + rd * (t0 + (t1 - t0) * mix(u0, u1, jitter));
        vec2 r = p.xz - shore.xy;
        float d = length(r);
        vec2 out2 = r / max(d, 1.0);
        float az = atan(r.x, -r.y);
        // Only against the wall the lens looks at: the shore behind the camera has none.
        float faced = smoothstep(-0.1, 0.5, cos(az - (uPlateTone.w > 0.5 ? uPlateLens.x : 0.0)));
        if (faced <= 0.0) continue;
        vec3 q = vec3(az * shore.z, p.y, shore.z - d);
        float bearing = uPlateTone.w > 0.5 ? uPlateLens.x : 0.0;
        vec2 toWall = vec2(sin(bearing), -cos(bearing));
        vec2 flat2 = vec2(dot(r, vec2(-toWall.y, toWall.x)) + bearing * shore.z, shore.z - dot(r, toWall));
        lie = mix(q.xz, flat2, uMistD.w);
        float h;
        float thick = mistAt(q, h) * faced * 0.006 * mistOn;
        if (thick <= 0.0) continue;
        float a = 1.0 - exp(-thick * dt);
        // A step that holds next to nothing is not lit.
        if (a < 0.0015) continue;
        // The sun reaches a point of the mist through the mist that lies toward it, and the long shade of the rim lies in it too.
        float sun = mix(mistSun(p), wallSun, smoothstep(320.0, 60.0, q.z));
        if (sun > 0.01) {
          vec3 sq = vec3(dot(uSunDir.xz, vec2(-out2.y, out2.x)), uSunDir.y, -dot(uSunDir.xz, out2));
          lie += 45.0 * mix(sq.xz, vec2(dot(uSunDir.xz, vec2(-toWall.y, toWall.x)), -dot(uSunDir.xz, toWall)), uMistD.w);
          vec3 toward = mistForm(q + sq * 45.0);
          float between = toward.x + uMistB.y * toward.z * smoothstep(1.0, 0.3, (q.y + sq.y * 45.0) / max(toward.y, 0.5));
          sun *= exp(-1.5 * between) * mix(0.7, 1.0, smoothstep(0.1, 1.0, h));
        }
        vec3 lit = skyLight * mix(0.88, 1.0, smoothstep(0.0, 1.0, h)) + uSunColour * (0.2 * sun * phase);
        sum += tr * a * lit / 3.14159 * 2.5;
        tr *= 1.0 - a;
        if (tr < 0.02) break;
      }
      light = light * tr + sum;
      through *= tr;
    }
  }
  // The lid of cloud over the socket, once the lens has climbed into it: it is nearer than everything else in the air.
  if (uLid.x > 0.0 && rd.y < 0.0) {
    vec4 lid = lidOver(ro, rd, length(world - ro));
    light = light * lid.a + lid.rgb * (1.0 - uSolo);
    through *= lid.a;
  }
  gl_FragColor = vec4(light, through);
}`;

export function create(ctx: Context): Piece {
  const skyMaterial = new THREE.ShaderMaterial({ uniforms: { ...ctx.rig.uniforms }, vertexShader: SKY_VERTEX, fragmentShader: SKY_FRAGMENT, side: THREE.BackSide });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(20000, 64, 32), skyMaterial);
  sky.frustumCulled = false;
  ctx.scene.add(ctx.parts.built('sky', sky));
  ctx.parts.effect('air', 'built');
  ctx.parts.effect('mist', 'built');

  const show = { uHaze: { value: 1 }, uMist: { value: 1 }, uThin: { value: 1 } };
  // The lid is measured from the camera of the last frame of the place: straight over the centre, the view on the water 424 m high.
  const lid = lidUniforms(handoff.lid, [0, 0], handoff.eyeHalfHeightMetres, handoff.eyeHalfHeightMetres / Math.tan((FLIGHT.endFov * Math.PI) / 360));
  const lidState = (lid.uLid as THREE.IUniform<THREE.Vector4>).value;
  const lidBase = 0.79 * (lid.uLidFrame as THREE.IUniform<THREE.Vector4>).value.w;
  const volume = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERTEX,
    fragmentShader: VOLUME_FRAGMENT,
    uniforms: { ...ctx.rig.uniforms, ...volumeUniforms(), ...show, ...lid },
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
    toneMapped: false,
  });
  const end = ctx.events.end;
  const pictures = PLATES.map((p) => ctx.assets.texture(p.file, { repeat: false, anisotropy: 2 }));
  const rig = ctx.rig.uniforms;
  const mistSun = mistSunTexture(ctx.rig.land.sunlit);
  volume.uniforms.tMistSun = { value: mistSun };
  const noise = mistNoise(ctx.rng('air/mist'));
  (rig.tMistNoise as THREE.IUniform).value = noise;

  return {
    volume,
    setTime: (t) => {
      // The air clears as the camera leaves: the last frames are the flat picture the rise begins with.
      show.uThin.value = 1 - smooth(end - 3, end - 1.3, t);
      // The lid is read only once the camera has climbed to its foot: below that it is over and behind the lens.
      const now = lidAt(t - end, handoff.lid, FPS);
      const high = during('eye-05') && flight(FLIGHT.riseFrame + (t - end) * FPS, FLIGHT).y > lidBase;
      lidState.set(high ? 1 : 0, now.tau, now.eroded, 0);
      // The mist as each key has it: a veil spreading out over the water from the rim, a broad soft bank from the shallows,
      // a thin ribbon tight to the lake under the long lens.
      const form = MIST[during('eye-01') ? 'wide' : during('eye-03') ? 'edge' : during('eye-04') ? 'shore' : during('eye-05') ? 'centre' : 'low'];
      (rig.uMistA as THREE.IUniform<THREE.Vector4>).value.fromArray(form.a);
      (rig.uMistB as THREE.IUniform<THREE.Vector4>).value.fromArray(form.b);
      // A bank that is looked down through is a dozen metres deep and not a thousand: as the camera of the last shot climbs over it the
      // bank is drawn thicker, so that the same banks that close the far shore from the water still show from above. Its form is not moved.
      (rig.uMistC as THREE.IUniform<THREE.Vector4>).value.fromArray(form.c);
      (rig.uMistD as THREE.IUniform<THREE.Vector4>).value.fromArray(form.d ?? [0, 0, 0, 0]);
      if (during('eye-05')) {
        // By the height of the camera over the water, so that the bank is one thing at every frame of the climb.
        const over = smooth(OVER[0], OVER[1], flight(FLIGHT.riseFrame + (t - end) * FPS, FLIGHT).y);
        (rig.uMistA as THREE.IUniform<THREE.Vector4>).value.lerp(HIGH.a, over);
        (rig.uMistB as THREE.IUniform<THREE.Vector4>).value.lerp(HIGH.b, over);
        (rig.uMistC as THREE.IUniform<THREE.Vector4>).value.lerp(HIGH.c, over);
        (rig.uMistD as THREE.IUniform<THREE.Vector4>).value.lerp(HIGH.d, over);
      }
      (rig.uMistOn as THREE.IUniform<number>).value = show.uThin.value;
      // The evening shade over the south shore and the spur is laid for the wide shot alone.
      (rig.uShade as THREE.IUniform<THREE.Vector4>).value.w = during('eye-01') ? 0.55 : 0;
      (rig.uPlateShade as THREE.IUniform<THREE.Vector2>).value.x = during('eye-01') ? 1 : 0;
      // The far world of the shot the camera stands in.
      const i = plateFor();
      const tone = (rig.uPlateTone as THREE.IUniform<THREE.Vector4>).value;
      const near = (rig.uNear as THREE.IUniform<THREE.Vector4>).value;
      if (i < 0) {
        tone.w = 0;
        near.w = 0;
      } else {
        const p = PLATES[i] as (typeof PLATES)[number];
        (rig.tPlate as THREE.IUniform).value = pictures[i];
        (rig.uPlateAt as THREE.IUniform<THREE.Vector4>).value.set(p.at[0], p.at[1], p.at[2], p.radius);
        (rig.uPlateLens as THREE.IUniform<THREE.Vector4>).value.set((p.bearing * Math.PI) / 180, p.tanAcross, p.tanUp, p.horizon);
        tone.set(p.tone[0], p.tone[1], p.tone[2], p.wall ? 2 : 1);
        (rig.uPlateAir as THREE.IUniform<THREE.Vector4>).value.fromArray(p.air ?? [1, 0.3, 0, 0.1]);
        (rig.uPlateSoft as THREE.IUniform<number>).value = p.soft ?? 0;
        (rig.uPlateDraw as THREE.IUniform<number>).value = p.drawn ?? 1;
        // The streaks are given in the picture's u and v and handed on in tan from its middle and its waterline.
        const streaks = [rig.uCirrusA, rig.uCirrusB] as THREE.IUniform<THREE.Vector4>[];
        const shown = (rig.uCirrus as THREE.IUniform<THREE.Vector2>).value.set(0, 0);
        (p.cirrus ?? []).slice(0, 2).forEach((c, k) => {
          (streaks[k] as THREE.IUniform<THREE.Vector4>).value.set((c[0] - 0.5) * 2 * p.tanAcross, (c[1] - p.horizon) * 2 * p.tanUp, c[2] * 2 * p.tanAcross, (c[3] * p.tanUp) / p.tanAcross);
          shown.setComponent(k, c[4]);
        });
        near.set(KEYS[p.key].position[0], KEYS[p.key].position[2], p.near, 1);
      }
    },
    beforeSample: (_renderer, camera) => {
      sky.position.copy(camera.position);
    },
    solo: (part) => {
      show.uHaze.value = part === null || part === 'eye/air' ? 1 : 0;
      show.uMist.value = part === null || part === 'eye/mist' ? 1 : 0;
    },
    dispose: () => {
      sky.geometry.dispose();
      skyMaterial.dispose();
      volume.dispose();
      mistSun.dispose();
      noise.dispose();
    },
  };
}
