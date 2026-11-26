// A swell that breaks on the foot of a blade: water thrown up its face in torn sheets, droplets on their own paths, the mist the wind takes,
// the white water that runs back down the stone and the boil it leaves at the foot. Every card is placed from the time alone (a launch,
// a speed, gravity and the drag of the air, in closed form), and drawn out along its own way across the picture.
import * as THREE from 'three';
import { RIG_GLSL, RIG_UNIFORMS_GLSL } from '../shared/glsl';
import { rand } from './spray';

/** One sea of the set breaking on a foot. */
export interface Strike {
  /** Where the swell meets the stone at the waterline. */
  x: number;
  z: number;
  /** The way out from the stone to the open water, a unit vector on the ground. */
  out: [number, number];
  /** Seconds of the place at which it strikes. */
  seconds: number;
  /** Metres of the foot the sea breaks along. */
  width: number;
  /** Metres the tallest water goes up the blade. */
  height: number;
  /** Metres the face of the blade goes sideways (x, z) for each metre up: the water climbs the stone, not the air beside it. */
  lean: [number, number];
  /** The stone's face on the side the sea strikes: x and z of it, so many metres along the foot and so high. */
  face?: (along: number, y: number) => [number, number];
  /** Tells the cards of one strike from those of another. */
  id: number;
}

const VERTEX = /* glsl */ `
${RIG_GLSL}
attribute vec4 aAt;
attribute vec4 aVel;
attribute vec4 aLook;
varying vec2 vUv;
varying vec4 vLook;
varying vec3 vLight;
varying vec3 vBack;
varying float vKind;
varying float vLong;
varying float vBead;
void main() {
  vec4 centre = viewMatrix * vec4(aAt.xyz, 1.0);
  vec3 way = mat3(viewMatrix) * aVel.xyz;
  float kind = aVel.w;
  float fast = length(way.xy);
  // Water in flight is seen drawn out along its way for as long as the shutter stands open, and a sheet of it is long that way to begin with.
  vec2 along = fast > 0.05 ? way.xy / fast : vec2(0.0, 1.0);
  float drawn = kind < 0.5 ? 1.5 + 0.05 * fast : (kind < 1.5 ? 1.0 + 0.03 * fast : 1.0);
  // A bead is drawn out further than the handful it flies in.
  vBead = (1.0 + 0.11 * fast) / drawn;
  if (kind > 1.5) {
    float turn = aLook.w * 6.2832;
    along = kind > 2.5 ? vec2(0.0, 1.0) : vec2(sin(turn), cos(turn));
    drawn = kind > 2.5 ? aLook.w : 1.0;
  }
  vec2 across = vec2(along.y, -along.x);
  centre.xy += (across * position.x + along * position.y * drawn) * aAt.w;
  vUv = position.xy;
  vLook = aLook;
  vKind = kind;
  vLong = drawn;
  vec4 land = landAt(aAt.xz);
  float open = mix(land.g, 1.0, clamp((aAt.y - land.r) / 120.0, 0.0, 1.0));
  float sun = sunAt(aAt.xyz, land);
  // Thrown water in the open air is lit from every side: the sky all round it and the sun where it reaches.
  vLight = (skyIrradiance(vec3(0.0, 1.0, 0.0)) * (0.55 + 0.75 * open) + uSunColour * 0.75 * sun) / 3.14159;
  // Between the lens and the light it burns: the sun, or the break in the cloud, comes forward through it.
  vec3 ray = normalize(aAt.xyz - cameraPosition);
  float throughSun = pow(max(dot(ray, uSunDir), 0.0), 3.0);
  float throughBreak = pow(max(dot(ray, uSkyBreak), 0.0), 3.0);
  vBack = uSunColour * throughSun * sun * 0.3 + skyRadiance(uSkyBreak) * throughBreak * 0.22 * open;
  gl_Position = projectionMatrix * centre;
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
${RIG_UNIFORMS_GLSL}
uniform sampler2D tFoam;
uniform sampler2D tDrops;
varying vec2 vUv;
varying vec4 vLook;
varying vec3 vLight;
varying vec3 vBack;
varying float vKind;
varying float vLong;
varying float vBead;
void main() {
  float r2 = dot(vUv, vUv);
  vec2 seed = vLook.y * vec2(3.1, 7.3);
  float alpha;
  vec3 col;
  if (vKind < 0.5) {
    // A sheet of thrown water: thick where it left the sea, torn into holes and then into strings as it goes (vLook.z: how far gone).
    vec4 t = texture2D(tFoam, vUv * vec2(0.3, 0.3 * vLong * 0.45) + seed);
    vec4 fine = texture2D(tFoam, vUv * vec2(1.1, 0.42 * vLong) + seed.yx);
    float rim = 1.0 - smoothstep(0.25, 1.0, r2 + 1.1 * (t.r - 0.5) + 0.5 * (fine.g - 0.4));
    float web = 0.55 * t.g + 0.45 * fine.r + 0.35 * fine.a;
    float holes = smoothstep(vLook.z * 0.95 - 0.12, vLook.z * 0.95 + 0.2, web + 0.25 * rim);
    float thick = rim * holes;
    alpha = thick * vLook.x;
    // Thick water is grey against the light and its thin edges are bright; lit from the front it is white with the folds in shade.
    float fold = 0.55 + 0.45 * smoothstep(0.25, 0.75, fine.r) + 0.3 * (t.g - 0.4);
    col = vec3(0.95, 0.96, 0.96) * vLight * fold * (0.7 + 0.3 * vUv.y) + vBack * (1.6 - 1.1 * smoothstep(0.35, 0.9, thick * web * 1.6));
  } else if (vKind < 1.5) {
    // Droplets: a handful to a card, each its own bead, drawn out along its flight.
    vec2 q = vUv * vec2(0.12, 0.12 / vBead) + seed;
    float beads = texture2D(tDrops, q).r;
    float lobe = 1.0 - smoothstep(0.25, 1.0, r2);
    alpha = clamp(beads * 1.5, 0.0, 1.0) * lobe * vLook.x;
    col = vec3(0.97, 0.98, 0.98) * (vLight * 1.15 + vBack * 2.2);
  } else if (vKind < 2.5) {
    // What is too fine to fall: mist, grey, with the light coming through it.
    vec4 t = texture2D(tFoam, vUv * 0.19 + seed);
    float body = 1.0 - smoothstep(-0.1, 0.95, r2 + 0.3 * (t.r - 0.5));
    alpha = body * (0.55 + 0.45 * t.a) * vLook.x;
    col = vec3(0.95, 0.96, 0.96) * (vLight * vec3(0.3, 0.33, 0.35) + vBack * 0.6);
  } else {
    // White water on the stone and at its foot: heads and strings, running.
    vec4 t = texture2D(tFoam, vUv * vec2(0.5, 0.5 * vLong * 0.4) + seed);
    vec4 fine = texture2D(tFoam, vUv * vec2(1.7, 0.5 * vLong) + seed.yx);
    float eat = r2 + 1.4 * (t.r - 0.5) + 0.7 * (0.5 - fine.g);
    float body = 1.0 - smoothstep(0.15, 0.75, eat);
    alpha = body * (0.5 + 0.5 * fine.a) * vLook.x;
    col = vec3(0.95, 0.96, 0.96) * vLight * (0.6 + 0.45 * fine.g + 0.25 * vUv.y) + vBack * 0.5;
  }
  alpha = clamp(alpha, 0.0, 1.0) * (1.0 - uSolo);
  gl_FragColor = vec4(col * alpha, alpha);
}`;

/** Beads of water scattered over a square, a few to a hand: round, of many sizes, most of them small. Worked out, not loaded. */
function dropsTexture(): THREE.DataTexture {
  const N = 256;
  const data = new Uint8Array(N * N);
  const cover = new Float32Array(N * N);
  for (let i = 0; i < 520; i++) {
    const cx = rand(7001, i) * N;
    const cy = rand(7002, i) * N;
    const s = rand(7003, i);
    const radius = 0.7 + 2.6 * s * s * s;
    const bright = 0.45 + 0.55 * rand(7004, i);
    const reach = Math.ceil(radius + 1);
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const x = (((Math.floor(cx) + dx) % N) + N) % N;
        const y = (((Math.floor(cy) + dy) % N) + N) % N;
        const d = Math.hypot(Math.floor(cx) + dx + 0.5 - cx, Math.floor(cy) + dy + 0.5 - cy);
        const v = bright * Math.min(1, Math.max(0, radius + 0.5 - d));
        const at = y * N + x;
        cover[at] = Math.max(cover[at] as number, v);
      }
    }
  }
  for (let i = 0; i < N * N; i++) data[i] = Math.round(255 * (cover[i] as number));
  const t = new THREE.DataTexture(data, N, N, THREE.RedFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

const G = 9.81;

/** Cards of one strike: sheets, droplets, mist, and white water at the foot and down the stone. */
const SHEETS = 300;
const DROPS = 1100;
const MIST = 110;
const FOOT = 190;
export const STRIKE_CARDS = SHEETS + DROPS + MIST + FOOT;
const JETS = 30;

export class Burst {
  readonly mesh: THREE.Mesh;
  private readonly at: THREE.InstancedBufferAttribute;
  private readonly vel: THREE.InstancedBufferAttribute;
  private readonly look: THREE.InstancedBufferAttribute;
  private readonly geometry: THREE.InstancedBufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly drops: THREE.DataTexture;
  private used = 0;

  constructor(readonly count: number, uniforms: Record<string, THREE.IUniform>) {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.at = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
    this.vel = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
    this.look = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
    for (const a of [this.at, this.vel, this.look]) a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aAt', this.at);
    g.setAttribute('aVel', this.vel);
    g.setAttribute('aLook', this.look);
    this.geometry = g;
    this.drops = dropsTexture();
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: { ...uniforms, tDrops: { value: this.drops } },
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    this.mesh = new THREE.Mesh(g, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
  }

  private put(x: number, y: number, z: number, size: number, vx: number, vy: number, vz: number, kind: number, alpha: number, seed: number, gone: number, spin: number): void {
    if (this.used >= this.count || alpha <= 0.004) return;
    this.at.setXYZW(this.used, x, y, z, size);
    this.vel.setXYZW(this.used, vx, vy, vz, kind);
    this.look.setXYZW(this.used, alpha, seed, gone, spin);
    this.used++;
  }

  /** Lay out every strike for a time of the place. `wind`: where it blows to, metres a second on the ground. `still`: how much of it is drawn (1 all). */
  setTime(seconds: number, strikes: readonly Strike[], wind: [number, number], still = 1): void {
    this.used = 0;
    for (const s of strikes) {
      const t = seconds - s.seconds;
      if (t < -0.2 || t > 16) continue;
      const tx = -s.out[1];
      const tz = s.out[0];
      // A place on the foot and the fingers that go up from it: tall where the sea meets the stone square, low shoulders along the rest.
      const jet = (n: number): { along: number; power: number; late: number; side: number; out: number } => {
        const id = s.id * 977 + n;
        const along = (rand(id, 1) - 0.5) * 0.95;
        const peak = Math.exp(-(along * along) / 0.06);
        const reach = rand(id, 2);
        return {
          along,
          power: Math.sqrt((0.3 + 0.7 * peak) * (0.55 + 0.45 * reach)),
          late: 0.55 * Math.abs(along) + 0.3 * rand(id, 3),
          side: (rand(id, 4) - 0.5) * 5 + 9 * along,
          out: 0.8 + 2.6 * rand(id, 5),
        };
      };
      const top = Math.sqrt(2 * G * s.height);
      // A taller burst is a bigger body of water: its sheets and heads are wider with it.
      const big = Math.sqrt(s.height / 50);
      // A body thrown with drag k in a wind: where it is and how fast, after `a` seconds, from the launch alone.
      const fly = (a: number, k: number, v0: [number, number, number], blown: number): [number, number, number, number, number, number] => {
        const e = Math.exp(-k * a);
        const q = (1 - e) / k;
        const wx = wind[0] * blown;
        const wz = wind[1] * blown;
        const fall = -G / k;
        return [wx * a + (v0[0] - wx) * q, fall * a + (v0[1] - fall) * q, wz * a + (v0[2] - wz) * q, wx + (v0[0] - wx) * e, fall + (v0[1] - fall) * e, wz + (v0[2] - wz) * e];
      };
      const launch = (j: ReturnType<typeof jet>, gain: number, wide: number, id: number): [number, number, number] => {
        const up = top * j.power * gain;
        const sx = j.side + wide * (rand(id, 21) - 0.5) * 9;
        const so = j.out + wide * (rand(id, 22) - 0.3) * 5;
        return [s.lean[0] * up + tx * sx + s.out[0] * so, up, s.lean[1] * up + tz * sx + s.out[1] * so];
      };
      const base = (j: ReturnType<typeof jet>, id: number): [number, number] => {
        const a = j.along * s.width + (rand(id, 23) - 0.5) * 3;
        const o = 0.8 + 2.5 * rand(id, 24);
        return [s.x + tx * a + s.out[0] * o, s.z + tz * a + s.out[1] * o];
      };

      // Sheets: each finger is a run of cards that leave one after another, so the column stands from the sea to its head while it is fed.
      for (let i = 0; i < SHEETS; i++) {
        const id = s.id * 100000 + i;
        const j = jet(i % JETS);
        const order = Math.floor(i / JETS) / (SHEETS / JETS);
        const a = t - j.late - 0.55 * order - 0.08 * rand(id, 6);
        if (a < 0) continue;
        const v0 = launch(j, 1 - 0.3 * order - 0.1 * rand(id, 7), 0.35, id);
        const [dx, dy, dz, vx, vy, vz] = fly(a, 0.16, v0, 0.5);
        const y = 0.6 + dy;
        if (y < -2) continue;
        const [bx, bz] = base(j, id);
        // It tears as it goes: whole as it leaves the sea, holes by its top, strings on the way down.
        const gone = Math.min(1, 0.12 + 0.3 * a + 0.2 * rand(id, 8));
        const fade = Math.min(1, a / 0.1) * Math.min(1, Math.max(0, (y + 2) / 5)) * (1 - 0.6 * Math.max(0, gone - 0.6) / 0.4);
        this.put(bx + dx, y, bz + dz, big * (1.5 + 1.5 * Math.min(a, 2.5)) * (0.6 + 0.8 * rand(id, 9)) * (0.6 + 0.5 * j.power), vx, vy, vz, 0, 0.92 * fade * still, rand(id, 10), gone, 0);
      }

      // Droplets: thrown wide of the fingers, faster than the sheets at first and slowed sooner, each card a handful of beads.
      for (let i = 0; i < DROPS; i++) {
        const id = s.id * 100000 + 20000 + i;
        const j = jet(Math.floor(rand(id, 1) * JETS));
        const a = t - j.late - 0.7 * rand(id, 6) * rand(id, 11);
        if (a < 0) continue;
        const small = rand(id, 12);
        const k = 0.12 + 0.75 * small * small;
        const v0 = launch(j, 0.55 + 0.75 * rand(id, 7), 1.6, id);
        const [dx, dy, dz, vx, vy, vz] = fly(a, k, v0, 0.9);
        const y = 0.6 + dy;
        if (y < -0.5) continue;
        const [bx, bz] = base(j, id);
        const fade = Math.min(1, a / 0.08) * Math.min(1, Math.max(0, (y + 0.5) / 1.5)) * Math.max(0, 1 - a / (5 + 5 * rand(id, 13)));
        this.put(bx + dx, y, bz + dz, big * (0.9 + 0.5 * Math.min(a, 3)) * (0.6 + 1.1 * rand(id, 9)), vx, vy, vz, 1, (0.75 + 0.25 * small) * fade * still, rand(id, 10), 0, 0);
      }

      // Mist: the finest water stops in the air near the top of its finger and goes off down the wind, thinning.
      for (let i = 0; i < MIST; i++) {
        const id = s.id * 100000 + 40000 + i;
        const j = jet(Math.floor(rand(id, 1) * JETS));
        const a = t - j.late - 1.1 - 1.6 * rand(id, 6);
        const life = 6 + 6 * rand(id, 13);
        if (a < 0 || a > life) continue;
        const v0 = launch(j, 0.75 + 0.3 * rand(id, 7), 1.2, id);
        const [dx, dy, dz, vx, vy, vz] = fly(a, 1.1 + 0.8 * rand(id, 12), [v0[0], v0[1] * 1.6, v0[2]], 0.75);
        const sink = 5.5 * a;
        const y = Math.max(0.6 + dy + sink, 1.5);
        const [bx, bz] = base(j, id);
        const fade = Math.min(1, a / 1.5) * Math.pow(1 - a / life, 1.4);
        this.put(bx + dx, y, bz + dz, big * (2.5 + 1.5 * a + 2.5 * rand(id, 9)), vx, vy, vz, 2, 0.085 * fade * still, rand(id, 10), 0, rand(id, 14));
      }

      // The foot: the sea piles white against the stone, boils out from it over the water, and what went up the face runs back down it.
      for (let i = 0; i < FOOT; i++) {
        const id = s.id * 100000 + 60000 + i;
        const along = (rand(id, 1) - 0.5) * 1.15;
        const peak = Math.exp(-(along * along) / 0.07);
        const late = 0.55 * Math.abs(along) + 0.3 * rand(id, 3);
        const stone = s.face;
        if (i % 2 === 0 && stone) {
          // Runs down the stone: born where the sheet wetted it, falling at the pace of water down a wall.
          const a = t - late - 0.8 - 2.4 * rand(id, 6);
          const life = 3.5 + 3 * rand(id, 7);
          if (a < 0 || a > life) continue;
          const from = s.height * (0.15 + 0.6 * rand(id, 8)) * (0.25 + 0.75 * peak);
          const speed = 3 + 5 * rand(id, 11);
          const y = from - speed * a - 0.8 * a * a;
          if (y < 0.5) continue;
          const o = 0.7 + 0.5 * rand(id, 24);
          const on = stone(along * s.width, y);
          const x = on[0] + s.out[0] * o;
          const z = on[1] + s.out[1] * o;
          const fade = Math.min(1, a / 0.4) * Math.pow(1 - a / life, 0.8) * Math.min(1, (y - 0.5) / 2);
          this.put(x, y, z, 0.9 + 1.3 * rand(id, 9), 0, -speed, 0, 3, 0.7 * fade * still, rand(id, 10), 0, 2.2 + 2.5 * rand(id, 12));
        } else {
          // The boil: heads of white water low on the sea, pushed out from the stone and sinking into foam.
          const a = t - late - 0.5 * rand(id, 6) + 0.15;
          const life = 3 + 4 * rand(id, 7);
          if (a < 0 || a > life) continue;
          const o = 1 + (4 + 9 * rand(id, 8)) * (1 - Math.exp(-a / 1.6));
          const lump = rand(id, 13) * rand(id, 14);
          const y = 0.3 + 2.2 * lump + (1 + 9 * lump * (0.3 + 0.7 * peak)) * Math.sin(Math.min(1, a / (1.2 + rand(id, 12))) * Math.PI) * Math.exp(-a / 2.5);
          const x = s.x + tx * along * s.width * 1.1 + s.out[0] * o;
          const z = s.z + tz * along * s.width * 1.1 + s.out[1] * o;
          const fade = Math.min(1, a / 0.15) * Math.pow(1 - a / life, 1.2);
          this.put(x, y, z, big * (0.5 + 4.5 * lump) * (0.6 + 0.4 * Math.min(a, 2)), 0, 0, 0, 3, (0.25 + 0.7 * rand(id, 9)) * fade * still, rand(id, 10), 0, 0.7 + 0.6 * rand(id, 15));
        }
      }
    }
    this.geometry.instanceCount = this.used;
    this.at.needsUpdate = true;
    this.vel.needsUpdate = true;
    this.look.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.drops.dispose();
  }
}
