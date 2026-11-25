// The skeleton on the lip: one of the herd, long dead, lying where the floor stops, half of it in the water and the mats grown through it.
import * as THREE from 'three';
import { KEYS } from '../cameras';
import { DEG } from '../layout';
import { landHeight, lipAt } from '../land/height';
import { WATER_GLSL, waterUniforms } from '../lake/water';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL, RIG_VERTEX } from '../shared/glsl';

export const PARTS: readonly string[] = ['skeleton'];

/** Where it lies: on the lip, ahead and to the right of the camera of the edge shot. */
export const BONES = { ahead: 6.4, right: 21, scale: 1.05 };

const FRAGMENT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
${NOISE_GLSL}
${RIG_GLSL}
${WATER_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  // Old bone: chalk where the sun has had it, stained brown and amber where it lies in the water and the mats have taken it.
  float grain = fbm(vWorld.xz * 9.0 + vWorld.y * 7.0);
  float pit = vnoise(vWorld.xz * 60.0 + vWorld.y * 40.0);
  vec3 bone = vec3(0.6, 0.56, 0.47) * (0.6 + 0.5 * grain) * (0.84 + 0.3 * pit);
  bone = mix(bone, bone * vec3(0.8, 0.52, 0.26), smoothstep(0.4, 0.7, vnoise(vWorld.xz * 23.0 + vWorld.y * 31.0)));
  float low = smoothstep(0.26, 0.02, vWorld.y + 0.14 * (grain - 0.5));
  vec3 stain = mix(vec3(0.3, 0.17, 0.07), vec3(0.42, 0.22, 0.05), grain);
  vec3 albedo = mix(bone, stain, 0.85 * low);
  // The mats have taken most of it: amber and brown in blotches, the chalk only on the upper sides.
  float taken = smoothstep(0.35, 0.6, 0.6 * vnoise(vWorld.xz * 4.1 + vWorld.y * 3.0) + 0.4 * grain) * (1.0 - 0.6 * smoothstep(0.2, 0.9, n.y));
  albedo = mix(albedo, stain * (0.55 + 0.6 * pit), 0.55 * taken);
  albedo *= mix(1.0, 0.55, smoothstep(0.5, 0.0, n.y) * 0.5);
  vec3 c = rigShade(vWorld, n, v, albedo, mix(0.8, 0.35, low), 0.6 + 0.4 * smoothstep(-0.4, 0.5, n.y));
  if (vWorld.y < 0.0) c = throughWater(c * sunk(vWorld), vWorld);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

class Bones {
  readonly position: number[] = [];
  readonly index: number[] = [];

  /** A tube through the points, each with its radius. */
  tube(points: [number, number, number, number][], sides = 7): void {
    const base = this.position.length / 3;
    const n = points.length;
    const t = new THREE.Vector3();
    const side = new THREE.Vector3();
    const up = new THREE.Vector3();
    const ref = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const a = points[Math.max(0, i - 1)] as [number, number, number, number];
      const b = points[Math.min(n - 1, i + 1)] as [number, number, number, number];
      const p = points[i] as [number, number, number, number];
      t.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
      ref.set(0, 1, 0);
      if (Math.abs(t.y) > 0.8) ref.set(1, 0, 0);
      side.crossVectors(ref, t).normalize();
      up.crossVectors(t, side).normalize();
      for (let k = 0; k < sides; k++) {
        const phi = (k / sides) * Math.PI * 2;
        const c = Math.cos(phi) * p[3];
        const s = Math.sin(phi) * p[3];
        this.position.push(p[0] + side.x * c + up.x * s, p[1] + side.y * c + up.y * s, p[2] + side.z * c + up.z * s);
      }
    }
    for (let i = 0; i < n - 1; i++) {
      for (let k = 0; k < sides; k++) {
        const a = base + i * sides + k;
        const b = base + i * sides + ((k + 1) % sides);
        this.index.push(a, b, a + sides, b, b + sides, a + sides);
      }
    }
  }

  /** A long bone between two points: a shaft with a knuckle at each end. */
  long(from: [number, number, number], to: [number, number, number], r: number): void {
    const at = (s: number, k: number): [number, number, number, number] => [from[0] + (to[0] - from[0]) * s, from[1] + (to[1] - from[1]) * s, from[2] + (to[2] - from[2]) * s, r * k];
    this.tube([at(0, 0.2), at(0.02, 1.5), at(0.07, 1.7), at(0.13, 1.1), at(0.3, 0.85), at(0.5, 0.8), at(0.72, 0.85), at(0.88, 1.1), at(0.94, 1.6), at(0.98, 1.4), at(1, 0.2)]);
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.position, 3));
    g.setIndex(this.index);
    g.computeVertexNormals();
    return g;
  }
}

// In its own frame: the spine lies along z with the skull at +z, y is up from the rock, metres at the size of a living animal of size 1.
function skeletonGeometry(): THREE.BufferGeometry {
  const b = new Bones();
  const spineY = (z: number): number => 0.34 - 0.2 * Math.max(0, z - 0.7) - 0.14 * Math.max(0, -z - 0.7) + 0.03 * Math.sin(z * 3);
  const spineX = (z: number): number => 0.1 * Math.sin(z * 1.3) + 0.3 * Math.max(0, z - 1.1) ** 2;
  // The spine: vertebrae as knots on a cord, from the tail to the skull.
  const spine: [number, number, number, number][] = [];
  for (let i = 0; i <= 150; i++) {
    const z = -0.95 + (2.3 * i) / 150;
    const knot = 0.5 + 0.5 * Math.cos((z * Math.PI * 2) / 0.115);
    const r = (z > 1.0 ? 0.03 : 0.04) * (0.62 + 0.55 * knot ** 2) * (i === 0 || i === 150 ? 0.2 : 1);
    spine.push([spineX(z), spineY(z), z, r]);
  }
  b.tube(spine, 8);
  // The ribs: eleven pairs standing from the spine, the near ones broken short, the cage fallen a little to one side.
  for (let i = 0; i < 11; i++) {
    const z = -0.2 + i * 0.105;
    const size = 0.36 * (0.72 + 0.28 * Math.sin((i / 10) * Math.PI));
    for (const side of [-1, 1]) {
      const broken = [1, 0.5, 0.9, 1, 0.3, 0.8, 1, 0.62, 1, 0.45, 0.85][(i * 7 + (side > 0 ? 3 : 0)) % 11] as number;
      const rib: [number, number, number, number][] = [];
      for (let k = 0; k <= 12; k++) {
        const u = (k / 12) * broken;
        const a = u * 2.5;
        const lean = side > 0 ? 0.32 : -0.12;
        rib.push([spineX(z) + side * size * Math.sin(a) + lean * size * (1 - Math.cos(a)), spineY(z) - size * (1 - Math.cos(a)) * 0.82, z - 0.1 * u, 0.017 * (1 - 0.45 * u) * (k === 12 ? 0.3 : 1)]);
      }
      b.tube(rib, 6);
    }
  }
  // The skull: long, tapering, no sockets for eyes.
  const sx = spineX(1.35) - 0.12;
  const sy = 0.11;
  const skull: [number, number, number, number][] = [];
  const profile: [number, number][] = [
    [0, 0.02],
    [0.03, 0.085],
    [0.1, 0.115],
    [0.2, 0.11],
    [0.3, 0.085],
    [0.42, 0.062],
    [0.52, 0.048],
    [0.6, 0.036],
    [0.65, 0.012],
  ];
  for (const [along, r] of profile) skull.push([sx + 0.45 * along, sy - 0.06 * along, 1.5 + 0.9 * along, r]);
  b.tube(skull, 10);
  b.tube(profile.slice(3).map(([along, r]) => [sx + 0.45 * along + 0.13, sy - 0.06 - 0.04 * along, 1.46 + 0.9 * along, r * 0.5] as [number, number, number, number]), 6);
  // The pelvis and the shoulder blades: flat plates, as short thick tubes.
  b.tube([[-0.24, 0.2, -0.86, 0.02], [-0.2, 0.3, -0.8, 0.07], [-0.08, 0.36, -0.74, 0.085], [0.08, 0.36, -0.74, 0.085], [0.2, 0.3, -0.8, 0.07], [0.24, 0.2, -0.86, 0.02]], 7);
  b.tube([[0.3, 0.08, 0.5, 0.02], [0.4, 0.1, 0.62, 0.075], [0.5, 0.08, 0.8, 0.06], [0.56, 0.06, 0.95, 0.02]], 7);
  // The long bones of the legs, fallen apart and lying where they fell; one hind leg hangs over the lip.
  b.long([0.35, 0.07, 0.95], [0.95, 0.06, 1.45], 0.03);
  b.long([0.98, 0.05, 1.5], [1.25, 0.04, 2.2], 0.024);
  b.long([-0.3, 0.07, 0.75], [-0.95, 0.05, 1.2], 0.03);
  b.long([-1.0, 0.05, 1.25], [-1.7, 0.03, 1.2], 0.024);
  b.long([0.22, 0.14, -0.9], [0.8, 0.06, -1.5], 0.034);
  b.long([0.84, 0.05, -1.55], [1.6, -0.12, -1.75], 0.026);
  b.long([-0.22, 0.14, -0.9], [-0.75, 0.0, -1.35], 0.034);
  b.long([-0.8, -0.05, -1.38], [-1.05, -0.75, -1.6], 0.026);
  return b.build();
}

export function create(ctx: Context): Piece {
  const material = new THREE.ShaderMaterial({ uniforms: { ...ctx.rig.uniforms, ...waterUniforms() }, vertexShader: RIG_VERTEX, fragmentShader: FRAGMENT });
  const mesh = new THREE.Mesh(skeletonGeometry(), material);
  // Ahead and to the right of the camera of the edge shot, then out to the rim of the lip from there.
  const from = KEYS.edge.position;
  const px = from[0] + Math.sin(BONES.right * DEG) * BONES.ahead;
  const pz = from[2] - Math.cos(BONES.right * DEG) * BONES.ahead;
  const a = Math.atan2(px, -pz);
  const r = lipAt(a) + 0.75;
  const x = Math.sin(a) * r;
  const z = -Math.cos(a) * r;
  mesh.position.set(x, landHeight(x, z) - 0.07, z);
  // Along the lip, the skull toward the left of the edge shot.
  const heading = Math.atan2(KEYS.edge.aim[0] - KEYS.edge.position[0], -(KEYS.edge.aim[2] - KEYS.edge.position[2]));
  mesh.rotation.y = Math.PI - (heading - 78 * DEG);
  mesh.scale.setScalar(BONES.scale);
  ctx.scene.add(ctx.parts.built('skeleton', mesh));
  const shade = ctx.rig.contactDiscs(1);
  ctx.rig.setDisc(shade, 0, x, z, 1.5, 0.45, 1.6, ctx.rig.sun.shadowYaw);
  return {
    dispose: () => {
      mesh.geometry.dispose();
      material.dispose();
    },
  };
}
