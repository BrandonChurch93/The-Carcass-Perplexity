// The weather of the Ribs: the sky after the storm (a dome: slate, broken cloud that moves with the wind, pale where the sun stands behind it),
// the air (haze that ends in the colour of the horizon, thicker low over the water where the spray hangs, and every source of spray and mist)
// and the cloud's light in that air (shafts: the sun reaches the haze only through the gaps of the cloud and between the blades).
import * as THREE from 'three';
import { QUAD_VERTEX, volumeUniforms } from '../../../core/engine';
import { WIND, shotSpan } from '../shared/anchors';
import type { Context, Piece, SteamSource } from '../shared/context';
import { partAtHeight, ribByName, surface } from '../layout';
import { loopPhase, stagedSeconds } from '../shared/stage';
import { STRIKE, openingWeight, strikeAge } from '../shared/opening';
import { RIG_GLSL } from '../shared/glsl';

export const PARTS = ['sky', 'air', 'cloud'] as const;

const MAX_SOURCES = 20;
const STEPS = 8;
const FOG_STEPS = 14;
/** The opening's sea fog in a metre at the water, where it lies whole. */
const FOG_THICK = 0.011;
/** The blades whose feet the opening's sea fog pools round and peels off: the two the lens opens on, and the two that stand out in the sea. */
const FOG_FEET = ['L1', 'R1', 'OL', 'OR'] as const;
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
// The sea fog of the opening: fog in a metre at the water, the seconds the wind has carried it, and how far the breaking swell has blown it off its place (0 to 1).
uniform vec3 uFog;
// The feet it pools round: x, z, the radius of the foot.
uniform vec3 uFeet[${FOG_FEET.length}];
// The breaking swell: x, z, and the radius the burst keeps clear.
uniform vec3 uFogHole;
// The approach: how far the march of the air is held still on the screen (1 as the film opens, nothing from the sixteenth second).
uniform float uStillAir;
${RIG_GLSL}

// The sea fog goes with the wind as water goes round a pile: the field is read in the coordinates of the flow itself (how far along the
// wind, and which streamline), so every lump of it bends round a blade's foot instead of passing through it. Before a foot and round it
// the fog pools; behind it, down the wind, it peels off in a tail that swings from side to side. x, y: the flow's coordinates; pool, tail: 0 to 1.
vec2 fogFlow(vec2 x, out float pool, out float tail) {
  const vec2 w = vec2(${glslFloat(WIND.to[0])}, ${glslFloat(WIND.to[1])});
  const vec2 n = vec2(${glslFloat(-WIND.to[1])}, ${glslFloat(WIND.to[0])});
  vec2 f = vec2(dot(x, w), dot(x, n));
  pool = 0.0;
  tail = 0.0;
  for (int i = 0; i < ${FOG_FEET.length}; i++) {
    vec2 d = x - uFeet[i].xy;
    float r = uFeet[i].z;
    float along = dot(d, w);
    float across = dot(d, n);
    float d2 = max(along * along + across * across, 0.6 * r * r);
    float k = r * r / d2;
    f += vec2(along, -across) * k;
    pool = max(pool, exp(-max(sqrt(d2) - r, 0.0) / (0.8 * r)));
    float lee = max(along, 0.0);
    float swing = across + 0.4 * r * sin(along / (1.6 * r) - 0.45 * uFog.y + 1.7 * float(i)) * smoothstep(0.0, 2.0 * r, along);
    float wide = r * (0.6 + lee / (6.0 * r));
    tail = max(tail, smoothstep(-0.2 * r, 1.3 * r, along) * exp(-swing * swing / (wide * wide)) * exp(-lee / (8.0 * r)));
  }
  return f;
}

// The fog at a place on the water: x fog in a metre at the water, y the height it thins over, metres. Its small eddies drag on the water
// and fall behind its big lumps, so the field works as it goes and no shape in it is kept. far is the length of the march's stride there:
// what is finer than the stride is left out.
vec2 fogAt(vec2 x, float far) {
  float pool;
  float tail;
  vec2 f = fogFlow(x, pool, tail);
  vec2 q = vec2(f.x - ${glslFloat(WIND.speed)} * uFog.y, f.y);
  // The level of the picture is named: read by the screen's own slope it would change from one block of pixels to the next.
  float level = clamp(log2(far / 5.0), 0.0, 8.0);
  float big = textureLod(tCloudShade, q / 1500.0 + 0.13, 0.0).r;
  float sheet = smoothstep(0.36, 0.7, big);
  float body = 0.16 * sheet + pool * (0.3 + 0.7 * sheet) + 1.2 * tail;
  if (body < 0.02) return vec2(0.0, 1.0);
  float mid = textureLod(tCloudShade, q / 430.0 + vec2(0.37, 0.61), level).g;
  float fine = textureLod(tCloudShade, vec2(q.x + ${glslFloat(WIND.speed * 0.4)} * uFog.y, q.y) / 150.0 + 0.29, level + 1.5).g;
  float lump = mix(mid, 0.5 * mid + 0.8 * fine - 0.15, smoothstep(240.0, 70.0, far));
  float torn = smoothstep(0.3, 0.72, lump);
  vec2 h = x - uFogHole.xy;
  float blown = 1.0 - exp(-dot(h, h) / (uFogHole.z * uFogHole.z));
  return vec2(uFog.x * body * (0.12 + 1.6 * torn * torn) * blown, (3.0 + 3.0 * pool + 5.0 * tail * (0.35 + 0.65 * mid)) * (0.6 + 0.7 * torn));
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
  // In the approach a shaft of sun stands in the air between the lens and the first blade: an offset that differs from pixel to pixel
  // would lay the screen's weave over it, so there the march keeps one offset. The film's own frames keep theirs.
  if (uStillAir > 0.0) jitter = mix(jitter, 0.5, uStillAir);
  float mu = max(dot(rd, uSunDir), 0.0);
  float mu2 = mu * mu;
  float phase = 0.45 + 0.6 * mu2 * mu2 + 0.8 * mu2 * mu2 * mu2 * mu2 * mu2 * mu2;
  vec3 ambient = uHaze * uScatter.x * uShowAir;
  // The air takes the sun's own warmth only toward the sun: across its light and away from it the mist is the sky's cool silver.
  vec3 sunAir = mix(vec3(0.82, 0.93, 1.06) * dot(uSunColour, vec3(0.3, 0.5, 0.2)), uSunColour, 0.3 * smoothstep(0.8, 0.98, mu));
  vec3 sunlit = sunAir * (uScatter.y * phase) * uShowCloud;
  vec3 sum = vec3(0.0);
  float trans = 1.0;
  float t0 = 0.0;
  for (int i = 0; i < ${STEPS}; i++) {
    float f = (float(i) + 1.0) / float(${STEPS});
    float t1 = span * f * f;
    float tm = mix(t0, t1, 0.4 + 0.2 * jitter);
    vec3 p = ro + rd * tm;
    // Air shows by distance: what stands within a hundred and fifty metres keeps its blacks.
    // Low mist lies in banks over the wet floor and round the feet of the blades, and goes with the wind: a bank passes a blade in some
    // ten seconds.
    // The level of the picture is named, by the length of the stride: what a stride cannot follow is left out, or it would show as the
    // screen's weave over the far air.
    float fineness = log2(t1 - t0);
    float banks = textureLod(tCloudShade, p.xz / 640.0 - uTime * vec2(0.011, 0.019), clamp(fineness - 3.6, 1.0, 8.0)).r;
    float lumps = textureLod(tCloudShade, p.xz / 210.0 - uTime * vec2(0.033, 0.058) + 0.37, clamp(fineness - 2.6, 1.0, 8.0)).g;
    float bank = smoothstep(0.38, 0.72, banks + 0.5 * (lumps - 0.5));
    // A bank has a top, low where it is thin and some forty metres where it is thick, and the haze over it stands thicker too.
    // Between the banks a thin breath of it lies on the wet floor, half of what lies under a bank: the far flats go into the air as
    // the blades do, not black to the horizon. (Stronger banks than these show the screen's weave on the blades behind them.)
    float mist = 0.0046 * bank * exp(-max(p.y, 0.0) / (7.0 + 40.0 * bank));
    float breath = 0.0022 * (0.5 + 1.0 * bank) * exp(-max(p.y, 0.0) / (4.0 + 6.0 * bank));
    float a = 1.0 - exp(-((thickness(p.y) * (0.35 + 0.75 * bank) + mist) * smoothstep(130.0, 600.0, tm) + breath * smoothstep(90.0, 420.0, tm)) * (t1 - t0));
    // Under the shut cloud the air is the storm's slate; where the break stands over it, it takes the sky's light and the sun.
    float gap = cloudShadeMarched(p);
    // A long stride crosses many shadows of the blades: it takes their mean, not the one it happens to stand in, which would lay the
    // screen's weave over the far air.
    float lit = mix(sunBaked(p, landAt(p.xz)), 0.55, smoothstep(60.0, 220.0, t1 - t0)) * gap;
    sum += trans * a * (ambient * (0.7 + 0.5 * gap) + sunlit * lit);
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
    vec3 light = (uHaze * 1.25 * uScatter.x + sunAir * (c.x * (0.07 + 0.5 * uScatter.y * phase))) * uShowAir;
    sum = sum * (1.0 - cover * near) + light * (cover * near);
    trans *= 1.0 - cover;
  }
  // The sea fog of the opening stands nearer than the haze: it is summed on its own, only while it is up. The march runs from the lens to
  // what the ray meets or to where it leaves the fog's height, in strides that lengthen with the distance; the fog's fall with height is
  // summed whole inside each stride, so it has no level top and no slab shows.
  if (uFog.x > 0.0) {
    float t0 = 15.0;
    float t1 = min(reach, 2600.0);
    if (rd.y > 0.0) t1 = min(t1, (45.0 - ro.y) / rd.y);
    else if (ro.y > 45.0) t0 = max(t0, (ro.y - 45.0) / -rd.y);
    if (t1 > t0) {
      vec3 fogSum = vec3(0.0);
      float fogTrans = 1.0;
      float ta = t0;
      for (int i = 0; i < ${FOG_STEPS}; i++) {
        float f = (float(i) + 1.0) / float(${FOG_STEPS});
        float tb = t0 + (t1 - t0) * f * (0.3 + 0.7 * f);
        float far = tb - ta;
        vec3 p = ro + rd * (0.5 * (ta + tb));
        vec2 fog = fogAt(p.xz, far);
        if (fog.x > 0.0) {
          float ya = max(ro.y + rd.y * ta, 0.0);
          float yb = max(ro.y + rd.y * tb, 0.0);
          float k = (yb - ya) / fog.y;
          float through = far * exp(-ya / fog.y) * (abs(k) < 0.001 ? 1.0 : (1.0 - exp(-k)) / k);
          float a = 1.0 - exp(-fog.x * through);
          if (a > 0.002) {
            // The shaft of low sun stands in the fog: what lies in it burns, what lies in a blade's shadow or under the shut cloud keeps the storm's slate.
            // The shadow of a blade is read at two places in the stride: read at one, a whole stride would stand lit or dark, a block in the fog.
            vec3 pa = ro + rd * mix(ta, tb, 0.22);
            vec3 pb = ro + rd * mix(ta, tb, 0.78);
            float gap = smoothstep(0.11, 0.31, cloudBreaks(p.xz - uSunDir.xz * (p.y / uSunDir.y)));
            float lit = 0.5 * (sunBaked(pa, landAt(pa.xz)) + sunBaked(pb, landAt(pb.xz)));
            // Deep in a lump the light is the fog's own grey; its top and its torn edges take the sky and the sun.
            float top = 0.45 + 0.55 * clamp(p.y / fog.y, 0.0, 1.0);
            fogSum += fogTrans * a * top * (uHaze * 0.62 + mix(sunAir, uSunColour, 0.5) * ((0.035 + 0.09 * phase) * (0.25 + 0.75 * lit) * gap)) * uShowAir;
            fogTrans *= 1.0 - a;
          }
        }
        ta = tb;
      }
      sum = fogSum + fogTrans * sum;
      trans *= fogTrans;
    }
  }
  gl_FragColor = vec4(sum * uScatter.z, trans);
}`;

/** How much thicker the air stands at the middle of the card loop than at its ends. */
const LOOP_MIST = 0.7;

export function create(ctx: Context): Piece {
  const storm = ctx.assets.texture('air/storm.jpg');
  storm.wrapS = THREE.MirroredRepeatWrapping;
  storm.wrapT = THREE.MirroredRepeatWrapping;
  storm.needsUpdate = true;
  (ctx.rig.uniforms.tSky as THREE.IUniform).value = storm;
  const fine = ctx.assets.texture('air/storm-fine.jpg', { kind: 'data' });
  fine.wrapS = THREE.MirroredRepeatWrapping;
  fine.wrapT = THREE.MirroredRepeatWrapping;
  fine.needsUpdate = true;
  (ctx.rig.uniforms.tSkyFine as THREE.IUniform).value = fine;
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
  // Staged for the opening shot only: sea fog pools round the feet of the near blades and peels off them down the wind; it thins as the lens comes in.
  const fog = new THREE.Vector3(0, 0, 0);
  const feet = FOG_FEET.map((name) => {
    const rib = ribByName(name);
    return new THREE.Vector3(rib.x, rib.z, 0.5 * (rib.a + rib.b) + (rib.flare ?? 0));
  });
  const fogHole = new THREE.Vector3(STRIKE.foot[0], STRIKE.foot[2], 2.4 * STRIKE.half);
  const stillAir = { value: 0 };
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
      uFog: { value: fog },
      uFeet: { value: feet },
      uFogHole: { value: fogHole },
      uStillAir: stillAir,
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
      // Whole through the first five seconds, gone by the twelfth: the lens comes in over it and the strait's own haze takes over.
      const fade = Math.min(1, Math.max(0, (12 - since) / 7));
      // Each burst of the breaking swell blows the fog off its foot, and it closes again slowly.
      const burst = Math.max(...STRIKE.times.map((_, n) => {
        const age = strikeAge(seconds, n as 0 | 1);
        return age < 0 ? 0 : Math.min(1, age / 0.6) * Math.max(0, 1 - age / (2 * STRIKE.hangs));
      }));
      fog.set(up ? FOG_THICK * fade * fade * (3 - 2 * fade) : 0, since, burst);
      fogHole.set(STRIKE.foot[0], STRIKE.foot[2], (2.4 + 1.2 * burst) * STRIKE.half);
      stillAir.value = up ? Math.min(1, 3 * openingWeight(seconds)) : 0;
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
