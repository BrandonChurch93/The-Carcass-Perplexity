// The weather of the Ribs: the sky after the storm (a dome: slate, broken cloud that moves with the wind, pale where the sun stands behind it),
// the air (haze that ends in the colour of the horizon, thicker low over the water where the spray hangs, and every source of spray and mist)
// and the cloud's light in that air (shafts: the sun reaches the haze only through the gaps of the cloud and between the blades).
import * as THREE from 'three';
import { QUAD_VERTEX, volumeUniforms } from '../../../core/engine';
import { WIND, shotSpan } from '../shared/anchors';
import type { Context, Piece, SteamSource } from '../shared/context';
import { partAtHeight, ribByName, surface } from '../layout';
import { loopPhase, stagedSeconds } from '../shared/stage';
import { RIG_GLSL } from '../shared/glsl';

export const PARTS = ['sky', 'air', 'cloud'] as const;

const MAX_SOURCES = 20;
const STEPS = 8;
const BANK_STEPS = 22;
/** Where the bank's slabs begin and end across the way in: world z, metres. */
const BANK_FAR = 1480;
const BANK_NEAR = 210;
const glslFloat = (x: number): string => (Number.isInteger(x) ? x.toFixed(1) : String(x));

const SKY_VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
  gl_Position = p.xyww;
}`;

const SKY_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vDir;
${RIG_GLSL}
uniform sampler2D tFar;
void main() {
  vec3 d = normalize(vDir);
  vec3 c = skyCloud(cameraPosition, d);
  // Beyond the last blades that are built, down the strait: the far pairs and the light at the end of them, a picture on the dome.
  float az = atan(d.x, -d.z);
  vec2 fu = vec2(0.5 + az / 0.41, 0.455 + asin(clamp(d.y, -1.0, 1.0)) / 0.2307);
  float on = smoothstep(0.25, 0.34, fu.x) * smoothstep(0.75, 0.66, fu.x) * smoothstep(0.44, 0.47, fu.y) * smoothstep(0.82, 0.6, fu.y);
  c = mix(c, texture2D(tFar, clamp(fu, 0.0, 1.0)).rgb * 1.1, on);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

const VOLUME_FRAGMENT = /* glsl */ `
precision highp float;
uniform highp sampler2D tDepth;
uniform mat4 uInvProjection;
uniform mat4 uCameraWorld;
uniform vec4 uAir;
uniform vec3 uScatter;
uniform float uShowAir;
uniform float uShowCloud;
uniform int uSourceCount;
uniform vec4 uSourceA[${MAX_SOURCES}];
uniform vec4 uSourceB[${MAX_SOURCES}];
uniform vec4 uSourceC[${MAX_SOURCES}];
// The fog bank of the opening: thickness in a metre, how far it has torn (0 whole, 1 in shreds), and how far the wind has carried it, metres.
uniform vec4 uBank;
// How far the bank has thinned over the breaking swell at the first blade's foot, 0 to 1.
uniform float uBankHole;
${RIG_GLSL}

// The bank lies on the sea before the shore, across the way in: a low body with a ragged top (it hides the feet of the blades and the far
// ones, never their heads), thin over the swell that breaks before the first blade, and a lane that the wind tears along the camera's way
// and widens as the camera comes. x is the fog in a metre, y how far under the top.
vec2 bankAt(vec3 p) {
  vec2 q = p.xz - uBank.zw;
  float big = texture2D(tCloudShade, q / 2900.0).r;
  float lump = texture2D(tCloudShade, q / 760.0 + 0.37 + p.y * vec2(0.0023, 0.0011)).g;
  float lane = (p.x + 325.0 - 0.07 * (1504.0 - p.z) + 110.0 * (big - 0.5)) / (24.0 + 300.0 * uBank.y);
  float open = exp(-lane * lane) * smoothstep(0.0, 0.12, uBank.y);
  float hole = (p.x + 318.0 + 60.0 * (lump - 0.5)) / (40.0 + 120.0 * uBankHole);
  open = max(open, (0.45 + 0.55 * uBankHole) * exp(-hole * hole));
  float fine = texture2D(tCloudShade, q / 410.0 + 0.11 + p.y * vec2(0.004, 0.007)).r;
  float top = (42.0 + 64.0 * smoothstep(0.2, 0.75, big)) * (1.0 - open) * (1.0 - 0.3 * uBank.y);
  float under = top - p.y + 46.0 * (lump - 0.5) + 26.0 * (fine - 0.5);
  float pz = p.z + 170.0 * (big - 0.5);
  // Not one wall from side to side: banks with clear water between them, and the one before the first blades the heaviest.
  float gaps = texture2D(tCloudShade, q / 1250.0 + 0.83).r + 0.3 * (lump - 0.5);
  float banked = max(smoothstep(0.36, 0.52, gaps), exp(-(p.x + 60.0) * (p.x + 60.0) / 250000.0) * 0.9);
  float inside = smoothstep(790.0, 660.0, pz) * smoothstep(300.0, 430.0, pz) * banked;
  float body = inside * smoothstep(0.0, 16.0, under) * (0.3 + 1.4 * lump);
  // Its seaward face is not a wall: tongues of it stand out over the water, lower the further out. (The mist that lies on the water
  // itself before the bank, through which the far sea pales into it, is the sea's: sea/shaders.ts.)
  float tongue = smoothstep(0.34, 0.66, 0.6 * fine + 0.4 * lump);
  // Some of them reach a long way out and some places stay clear to the bank's face: the water is seen to go into it at no one distance.
  float reach = 460.0 * smoothstep(0.3, 0.7, texture2D(tCloudShade, q / 1500.0 + 0.61).r);
  float near = smoothstep(1010.0 + reach, 900.0 + reach, pz + 160.0 * (lump - 0.5)) * (0.25 + 0.75 * banked);
  // Far out they lie lower than a lens nine metres up; against the bank they stand up into it.
  // And none has a level top: each thins upward from the water, and between them there is none.
  // Far out it stands higher than a lens nine metres up, so the lens is in it and sees no top of it: the sea goes pale with the distance
  // and is lost, sooner where a tongue lies and later between two.
  float lid = (15.0 + 7.0 * tongue + 34.0 * tongue * smoothstep(1010.0, 760.0, pz + 160.0 * (lump - 0.5))) * (1.0 - 0.7 * open);
  float foot = near * smoothstep(300.0, 430.0, pz) * smoothstep(lid, 0.0, p.y) * (0.22 + 0.78 * tongue) * (1.0 - open);
  return vec2(uBank.x * max(body, foot), under);
}

void viewRay(out vec3 ro, out vec3 rd, out float reach) {
  ivec2 pixel = 2 * ivec2(gl_FragCoord.xy);
  float depth = texelFetch(tDepth, pixel, 0).r;
  vec2 uv = (vec2(pixel) + 0.5) / vec2(textureSize(tDepth, 0));
  vec4 view = uInvProjection * vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec3 world = (uCameraWorld * vec4(view.xyz / view.w, 1.0)).xyz;
  ro = uCameraWorld[3].xyz;
  rd = world - ro;
  reach = length(rd);
  rd /= reach;
  if (depth >= 1.0) reach = 30000.0;
}

// The air in a metre at a height: thin haze that thins upward, and the spray that hangs low over the water.
float thickness(float y) {
  float h = max(y, 0.0);
  return uAir.x * exp(-h / uAir.y) + uAir.z * exp(-h / uAir.w);
}

float erfLike(float x) {
  return sign(x) * sqrt(1.0 - exp(-1.2732 * x * x));
}

void main() {
  vec3 ro;
  vec3 rd;
  float reach;
  viewRay(ro, rd, reach);
  float span = min(reach, 3200.0);
  // The offset of the march is fixed to the pixel: it does not crawl from sample to sample.
  float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  float mu = max(dot(rd, uSunDir), 0.0);
  float mu2 = mu * mu;
  float phase = 0.45 + 0.6 * mu2 * mu2 + 0.8 * mu2 * mu2 * mu2 * mu2 * mu2 * mu2;
  vec3 ambient = uHaze * uScatter.x * uShowAir;
  vec3 sunlit = uSunColour * (uScatter.y * phase) * uShowCloud;
  vec3 sum = vec3(0.0);
  float trans = 1.0;
  float t0 = 0.0;
  for (int i = 0; i < ${STEPS}; i++) {
    float f = (float(i) + 1.0) / float(${STEPS});
    float t1 = span * f * f;
    float tm = mix(t0, t1, 0.25 + 0.5 * jitter);
    vec3 p = ro + rd * tm;
    // Air shows by distance: what stands within a hundred and fifty metres keeps its blacks.
    // Low mist lies in banks over the wet floor and round the feet of the blades, and goes with the wind: a bank passes a blade in some
    // ten seconds.
    float banks = texture2D(tCloudShade, p.xz / 640.0 - uTime * vec2(0.011, 0.019)).r;
    float mist = 0.0022 * exp(-max(p.y, 0.0) / 24.0) * smoothstep(0.3, 0.8, banks);
    float a = 1.0 - exp(-(thickness(p.y) + mist) * (t1 - t0) * smoothstep(130.0, 600.0, tm));
    float lit = sunAt(p, landAt(p.xz));
    sum += trans * a * (ambient + sunlit * lit);
    trans *= 1.0 - a;
    t0 = t1;
  }

  // Spray and mist: each source is a soft column, lit by the sky and by the sun where the sun reaches its foot.
  for (int i = 0; i < ${MAX_SOURCES}; i++) {
    if (i >= uSourceCount) break;
    vec4 a = uSourceA[i];
    vec4 b = uSourceB[i];
    vec4 c = uSourceC[i];
    vec3 size = vec3(a.w * 1.4, 0.5 * b.y + 0.5 * a.w, a.w * 1.4);
    vec3 centre = a.xyz + vec3(b.z, 1.0, b.w) * (0.4 * b.y);
    vec3 o = (ro - centre) / size;
    vec3 dd = rd / size;
    float dl = length(dd);
    dd /= dl;
    float tm = -dot(o, dd);
    float miss = dot(o, o) - tm * tm;
    float tau = b.x * c.y * exp(-miss) * 0.886 * (erfLike(reach * dl - tm) - erfLike(-tm)) / dl;
    float cover = 1.0 - exp(-tau);
    // The air between the lens and the column dims it; the air behind it is hidden by it.
    float near = exp(-thickness(0.5 * (ro.y + centre.y)) * clamp(tm, 0.0, reach));
    vec3 light = (uHaze * 1.25 * uScatter.x + uSunColour * (c.x * (0.22 + 0.5 * uScatter.y * phase))) * uShowAir;
    sum = sum * (1.0 - cover * near) + light * (cover * near);
    trans *= 1.0 - cover;
  }
  // The bank of the opening stands nearer than the haze: it is summed on its own, only while it is up. Its slabs are fixed in the world
  // (planes across the way in), never set off by the pixel: a sum that is jittered by the screen leaves the screen's grain in the fog.
  if (uBank.x > 0.0 && rd.z < -0.02) {
    vec3 bankSum = vec3(0.0);
    float bankTrans = 1.0;
    float deepZ = ${glslFloat((BANK_FAR - BANK_NEAR) / BANK_STEPS)};
    float len = min(deepZ / -rd.z, 420.0);
    float ahead = smoothstep(0.02, 0.2, -rd.z);
    for (int i = 0; i < ${BANK_STEPS}; i++) {
      float tm = (${glslFloat(BANK_FAR)} - (float(i) + 0.5) * deepZ - ro.z) / rd.z;
      // How much of the slab lies before the lens and before what the ray meets.
      float part = clamp((reach - tm) / len + 0.5, 0.0, 1.0) * smoothstep(30.0, 200.0, tm) * ahead;
      if (part <= 0.0) continue;
      vec3 p = ro + rd * tm;
      if (p.y > 190.0) continue;
      vec2 fog = bankAt(p);
      float a = 1.0 - exp(-fog.x * len * part);
      if (a > 0.0005) {
        // The shaft of sun that walks over the water stands in the bank as a pool of light with no drawn edge.
        vec2 fromShaft = p.xz - uCloudBreak2.xy;
        float lit = exp(-1.7 * dot(fromShaft, fromShaft) * uCloudBreak2.z) * cloudShade(vec3(uCloudBreak2.x, 0.0, uCloudBreak2.y));
        // Deep in the bank the light is the bank's own grey; its top and its torn edges take the sky and the sun.
        float deep = 0.42 + 0.58 * smoothstep(60.0, 4.0, fog.y);
        bankSum += bankTrans * a * (uHaze * (0.7 * deep) + uSunColour * (0.26 * phase * lit * deep)) * uShowAir;
        bankTrans *= 1.0 - a;
      }
    }
    sum = bankSum + bankTrans * sum;
    trans *= bankTrans;
  }
  gl_FragColor = vec4(sum * uScatter.z, trans);
}`;

/** How much thicker the air stands at the middle of the card loop than at its ends. */
const LOOP_MIST = 0.7;

export function create(ctx: Context): Piece {
  const storm = ctx.assets.texture('mat/sky.jpg');
  storm.wrapS = THREE.MirroredRepeatWrapping;
  storm.wrapT = THREE.ClampToEdgeWrapping;
  storm.needsUpdate = true;
  (ctx.rig.uniforms.tSky as THREE.IUniform).value = storm;
  const sky = new THREE.ShaderMaterial({
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    uniforms: { ...ctx.rig.uniforms, tFar: { value: ctx.assets.texture('mat/far.jpg', { repeat: false }) } },
    side: THREE.BackSide,
    depthTest: false,
    depthWrite: false,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), sky);
  dome.frustumCulled = false;
  dome.renderOrder = -10;
  ctx.scene.add(ctx.parts.built('sky', dome));

  const showAir = { value: 1 };
  const showCloud = { value: 1 };
  const sourceA: THREE.Vector4[] = [];
  const sourceB: THREE.Vector4[] = [];
  const sourceC: THREE.Vector4[] = [];
  for (let i = 0; i < MAX_SOURCES; i++) {
    sourceA.push(new THREE.Vector4());
    sourceB.push(new THREE.Vector4());
    sourceC.push(new THREE.Vector4());
  }
  const count = { value: 0 };
  // Staged for the opening shot only: a bank of sea fog lies across the way in, tears open in the first two seconds and is flown through in shreds.
  const bank = new THREE.Vector4(0, 0, 0, 0);
  const bankHole = { value: 0 };
  const openingShot = shotSpan('ribs-01');
  // Staged for the colony's shot only: the air itself stands thicker, so that the blade behind the colony's rock is a pale shape far off
  // and the roosts read against it. (It was a column of mist round that blade, which read as a flat card.)
  const colonyShot = shotSpan('ribs-03');
  const air = new THREE.Vector4(0.0013, 75, 0.0003, 12);
  const volume = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERTEX,
    fragmentShader: VOLUME_FRAGMENT,
    uniforms: {
      ...ctx.rig.uniforms,
      ...volumeUniforms(),
      // Haze in a metre at sea level and the height it thins over; spray haze in a metre at sea level and the height it hangs to.
      uAir: { value: air },
      // How much of the horizon's colour a metre of air gives back, how much of the sun, and the whole.
      uScatter: { value: new THREE.Vector3(0.8, 0.085, 1) },
      uShowAir: showAir,
      uShowCloud: showCloud,
      uBank: { value: bank },
      uBankHole: bankHole,
      uSourceCount: count,
      uSourceA: { value: sourceA },
      uSourceB: { value: sourceB },
      uSourceC: { value: sourceC },
    },
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
    toneMapped: false,
  });
  ctx.parts.effect('air', 'built');
  ctx.parts.effect('cloud', 'built');


  return {
    volume,
    setTime: (seconds) => {
      const staged = stagedSeconds();
      const up = staged >= openingShot.from && staged < openingShot.to;
      const since = seconds - openingShot.from;
      const fade = Math.min(1, Math.max(0, (13 - since) / 6));
      // The lane opens slowly at first (the bank is whole in the first frames) and is wide by the time the camera is in it.
      const torn = Math.min(1, Math.max(0, (since - 1.2) / 6.5));
      const holed = Math.min(1, Math.max(0, (since + 3) / 3.2));
      bank.set(up ? 0.0085 * fade : 0, torn * torn * (3 - 2 * torn), WIND.to[0] * 20 * since, WIND.to[1] * 20 * since);
      bankHole.value = holed * holed * (3 - 2 * holed);
      const thick = staged >= colonyShot.from && staged <= colonyShot.to;
      // In the card loop the mist between the blades thickens once and thins again.
      const phase = loopPhase();
      const mist = phase === null ? 1 : 1 + LOOP_MIST * (1 - Math.cos(phase * Math.PI * 2)) * 0.5;
      air.set((thick ? 0.006 : 0.0013) * mist, thick ? 160 : 75, 0.0003, 12);
      const steam = ctx.sources.steam;
      // In the card loop what travels one way stands where the loop's first frame has it.
      const run = loopPhase() === null ? seconds : staged;
      // The heaviest columns first: there is room for MAX_SOURCES of them.
      const list = steam.map((s, i) => ({ s, i })).sort((p, q) => q.s.strength * q.s.radius * q.s.radius - p.s.strength * p.s.radius * p.s.radius || p.i - q.i).map((p) => p.s);
      const n = Math.min(MAX_SOURCES, list.length);
      for (let i = 0; i < n; i++) {
        const s = list[i] as (typeof list)[number];
        const z = s.at[2] + (s.speed ?? 0) * (run - (s.since ?? 0));
        (sourceA[i] as THREE.Vector4).set(s.at[0], s.at[1], z, s.radius);
        (sourceB[i] as THREE.Vector4).set(s.strength, s.rise, s.lean?.[0] ?? 0, s.lean?.[1] ?? 0);
        const lit = ctx.rig.land.sun(s.at[0], z) * ctx.rig.cloudShade(s.at[0], z, seconds);
        (sourceC[i] as THREE.Vector4).set(lit, s.kind === 'spray' ? 0.045 : 0.02, 0, 0);
      }
      count.value = n;
    },
    solo: (part) => {
      showAir.value = part === 'ribs/cloud' ? 0 : 1;
      showCloud.value = part === 'ribs/air' ? 0 : 1;
    },
    dispose: () => {
      dome.geometry.dispose();
      sky.dispose();
      volume.dispose();
    },
  };
}
