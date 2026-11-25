// The land of the Heart: the caldera wall, the buttress, the bench the camera stands on.
// First light, by the root: the rough shape of the layout with the alcove of the mouth, three rock textures and the light of the rig.
// A name moves into PARTS when this folder draws it; until then the part keeps its stand-in from the blockout.
// The names this folder will own: 'land', 'bench', 'sulphur-crack'.
import * as THREE from 'three';
import { BUTTRESS, MOUTH, SIZE, benchDistance, ground, smooth } from '../layout';
import type { HeartContext, HeartPiece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';

export const PARTS: readonly string[] = ['land', 'bench'];

/** The true height of the land, metres. Zero or less is lake. The rig bakes it; everything that stands on the land reads it through `ctx.rig.land`. */
export function landHeight(x: number, z: number): number {
  const g = ground(x, z);
  // The alcove the mouth opens into: the wall is cut back to the floor of the mouth, and the fall folder roofs it.
  const ax = Math.abs(x - MOUTH.x);
  if (ax < 70 && z > MOUTH.z - 60 && z < MOUTH.z + 16 && g > MOUTH.floor) {
    const k = smooth(62, 50, ax) * smooth(MOUTH.z - 56, MOUTH.z - 44, z) * smooth(MOUTH.z + 14, MOUTH.z + 4, z);
    return g + (MOUTH.floor - g) * k;
  }
  return g;
}

const VERTEX = /* glsl */ `
attribute vec3 aSlope;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vWorld = position;
  vNormal = aSlope;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec3 vNormal;
uniform sampler2D tCliff;
uniform sampler2D tTop;
uniform sampler2D tTopNh;
uniform sampler2D tTalus;
${NOISE_GLSL}
${RIG_GLSL}
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(cameraPosition - vWorld);
  float far = length(cameraPosition - vWorld);
  float steep = smoothstep(0.22, 0.55, 1.0 - n.y);
  // Steep faces: strata run level, so the picture is wrapped round the face and read by height.
  vec2 wrap = vec2(dot(vWorld.xz, normalize(vec2(-n.z, n.x) + 1e-4)), vWorld.y);
  vec3 cliff = texture2D(tCliff, wrap / 60.0 + 0.13 * vnoise(vWorld.xz / 90.0)).rgb;
  cliff *= 0.75 + 0.5 * vnoise(vec2(vWorld.y * 0.9 + 3.0 * vnoise(vWorld.xz / 25.0), 0.5));
  // Flat ground: ropy lava near the lake, rubble under the walls. Two scales so the repeat does not show.
  vec2 uvTop = vWorld.xz / 6.0;
  vec3 top = texture2D(tTop, uvTop).rgb * 0.6 + texture2D(tTop, vWorld.zx / 41.0 + 0.37).rgb * 0.6;
  vec3 talus = texture2D(tTalus, vWorld.xz / 23.0).rgb;
  float rubble = smoothstep(0.08, 0.3, 1.0 - n.y);
  vec3 albedo = mix(mix(top, talus, rubble), cliff, steep);
  vec2 slope = (texture2D(tTopNh, uvTop).rg - 0.5) * (1.0 - steep) * smoothstep(120.0, 20.0, far);
  n = normalize(n + vec3(slope.x, 0.0, slope.y) * 1.6);
  vec3 c = rigShade(vWorld, n, v, albedo, 0.9, 1.0);
  gl_FragColor = vec4(rigOut(c), 1.0);
}`;

function sheet(width: number, depth: number, columns: number, rows: number, centre: [number, number], height: (x: number, z: number) => number, keep?: (x: number, z: number) => boolean): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(width, depth, columns, rows);
  g.rotateX(-Math.PI / 2);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const slope = new Float32Array(p.count * 3);
  const e = Math.min(width / columns, depth / rows) * 0.5;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + centre[0];
    const z = p.getZ(i) + centre[1];
    const y = height(x, z);
    p.setXYZ(i, x, y, z);
    const dx = Math.max(height(x + e, z), -2) - Math.max(height(x - e, z), -2);
    const dz = Math.max(height(x, z + e), -2) - Math.max(height(x, z - e), -2);
    const l = Math.hypot(dx, 2 * e, dz);
    slope[i * 3] = -dx / l;
    slope[i * 3 + 1] = (2 * e) / l;
    slope[i * 3 + 2] = -dz / l;
  }
  g.setAttribute('aSlope', new THREE.BufferAttribute(slope, 3));
  if (keep) {
    const index = g.getIndex() as THREE.BufferAttribute;
    const kept: number[] = [];
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i);
      const b = index.getX(i + 1);
      const c = index.getX(i + 2);
      if (keep(p.getX(a), p.getZ(a)) || keep(p.getX(b), p.getZ(b)) || keep(p.getX(c), p.getZ(c))) kept.push(a, b, c);
    }
    g.setIndex(kept);
  }
  g.computeBoundingSphere();
  return g;
}

export function create(ctx: HeartContext): HeartPiece {
  ctx.rig.setLand(landHeight);

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      ...ctx.rig.uniforms,
      tCliff: { value: ctx.assets.texture('mat/cliff.jpg') },
      tTop: { value: ctx.assets.texture('mat/pahoehoe.jpg') },
      tTopNh: { value: ctx.assets.texture('mat/pahoehoe-nh.png', { kind: 'data' }) },
      tTalus: { value: ctx.assets.texture('mat/talus.jpg') },
    },
  });

  const onBench = (x: number, z: number): boolean => benchDistance(x, z) > -12 && x < -330;
  const land = (x: number, z: number): number => landHeight(x, z);
  // The wall and the far shore at 8 m, the buttress at 4 m, the country outside at 125 m, the bench at 2 m and 0.75 m by the camera's path.
  const walls = new THREE.Mesh(sheet(3000, 1840, 375, 230, [150, 60], land, (x, z) => land(x, z) > -4 && !onBench(x, z)), material);
  const outer = new THREE.Mesh(sheet(SIZE, SIZE, 96, 96, [0, 0], (x, z) => (Math.abs(x - 150) < 1420 && Math.abs(z - 60) < 840 ? -30 : land(x, z) - 3)), material);
  const [rx, rz] = BUTTRESS.root;
  const [tx, tz] = BUTTRESS.tip;
  const buttress = new THREE.Mesh(sheet(640, 760, 160, 190, [(rx + tx) / 2, (rz + tz) / 2], (x, z) => land(x, z) + 0.05, (x, z) => land(x, z) > -4), material);
  ctx.scene.add(ctx.parts.built('land', walls, outer, buttress), outer, buttress);

  const bench = new THREE.Mesh(sheet(640, 880, 320, 440, [-640, 100], (x, z) => land(x, z) + 0.1, (x, z) => onBench(x, z) && land(x, z) > -4 && !(Math.abs(x + 560) < 116 && Math.abs(z - 230) < 146)), material);
  const near = new THREE.Mesh(sheet(240, 300, 320, 400, [-560, 230], (x, z) => land(x, z) + 0.16, (x, z) => land(x, z) > -4), material);
  ctx.scene.add(ctx.parts.built('bench', bench, near), near);

  return {
    dispose: () => {
      for (const m of [walls, outer, buttress, bench, near]) m.geometry.dispose();
      material.dispose();
    },
  };
}
