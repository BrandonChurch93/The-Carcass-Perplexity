// The weather of the Ribs: the sky after the storm (a dome: slate, broken cloud that moves with the wind, pale where the sun stands behind it),
// the air (haze that ends in the colour of the horizon, thicker low over the water where the spray hangs, and every source of spray and mist)
// and the cloud's light in that air (shafts: the sun reaches the haze only through the gaps of the cloud and between the blades).
import * as THREE from 'three';
import { QUAD_VERTEX, volumeUniforms } from '../../../core/engine';
import type { Context, Piece } from '../shared/context';
import { RIG_GLSL } from '../shared/glsl';

export const PARTS = ['sky', 'air', 'cloud'] as const;

const MAX_SOURCES = 20;
const STEPS = 8;

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
void main() {
  gl_FragColor = vec4(rigOut(skyCloud(cameraPosition, normalize(vDir))), 1.0);
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
${RIG_GLSL}

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
  float span = min(reach, 9000.0);
  // The offset of the march is fixed to the pixel: it does not crawl from sample to sample.
  float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  float mu = max(dot(rd, uSunDir), 0.0);
  float mu2 = mu * mu;
  float phase = 0.45 + 1.5 * mu2 * mu2 + 3.0 * mu2 * mu2 * mu2 * mu2 * mu2 * mu2;
  vec3 ambient = uHaze * uScatter.x * uShowAir;
  vec3 sunlit = uSunColour * (uScatter.y * phase) * uShowCloud;
  vec3 sum = vec3(0.0);
  float trans = 1.0;
  float t0 = 0.0;
  for (int i = 0; i < ${STEPS}; i++) {
    float f = (float(i) + 1.0) / float(${STEPS});
    float t1 = span * f * f;
    vec3 p = ro + rd * mix(t0, t1, jitter);
    float a = 1.0 - exp(-thickness(p.y) * (t1 - t0));
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
  gl_FragColor = vec4(sum * uScatter.z, trans);
}`;

export function create(ctx: Context): Piece {
  const storm = ctx.assets.texture('air/storm.jpg');
  storm.wrapS = THREE.MirroredRepeatWrapping;
  storm.wrapT = THREE.ClampToEdgeWrapping;
  storm.needsUpdate = true;
  (ctx.rig.uniforms.tSky as THREE.IUniform).value = storm;
  const sky = new THREE.ShaderMaterial({
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    uniforms: { ...ctx.rig.uniforms },
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
  const volume = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERTEX,
    fragmentShader: VOLUME_FRAGMENT,
    uniforms: {
      ...ctx.rig.uniforms,
      ...volumeUniforms(),
      // Haze in a metre at sea level and the height it thins over; spray haze in a metre at sea level and the height it hangs to.
      uAir: { value: new THREE.Vector4(0.00011, 500, 0.00024, 7) },
      // How much of the horizon's colour a metre of air gives back, how much of the sun, and the whole.
      uScatter: { value: new THREE.Vector3(0.95, 0.2, 1) },
      uShowAir: showAir,
      uShowCloud: showCloud,
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
      // The heaviest columns first: there is room for MAX_SOURCES of them.
      const list = ctx.sources.steam.map((s, i) => ({ s, i })).sort((p, q) => q.s.strength * q.s.radius * q.s.radius - p.s.strength * p.s.radius * p.s.radius || p.i - q.i).map((p) => p.s);
      const n = Math.min(MAX_SOURCES, list.length);
      for (let i = 0; i < n; i++) {
        const s = list[i] as (typeof list)[number];
        const z = s.at[2] + (s.speed ?? 0) * (seconds - (s.since ?? 0));
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
