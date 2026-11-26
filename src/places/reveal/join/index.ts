// The join with the Eye, on the side of the rise: the top of the lid of cloud the camera has just come up through, falling away under it
// and breaking up over the lake. It is laid over the whole frame, last, and is not drawn at all once the sheet is gone.
import * as THREE from 'three';
import { FPS } from '../../../config';
import { AT, HALF_TAN, X, Z, handoff } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { LID_GLSL, lidAt, lidUniforms } from './lid';

// The lid is cloud, and the rise has a part for cloud: it is drawn inside that part.
export const PARTS: readonly string[] = [];

const VERTEX = /* glsl */ `
varying vec3 vRay;
void main() {
  // The ray through this corner of the frame, in the world. The projection carries the offset of the sample within the pixel.
  vec3 v = vec3((position.x + projectionMatrix[2][0]) / projectionMatrix[0][0], (position.y + projectionMatrix[2][1]) / projectionMatrix[1][1], -1.0);
  vRay = v * mat3(viewMatrix);
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const FRAGMENT = /* glsl */ `
varying vec3 vRay;
${RIG_GLSL}
${NOISE_GLSL}
${LID_GLSL}
void main() {
  vec3 rd = normalize(vRay);
  vec4 lid = lidOver(cameraPosition, rd, -cameraPosition.y / min(rd.y, -1e-4));
  gl_FragColor = vec4(rigOut(lid.rgb), mix(lid.a, 1.0, uSolo));
}`;

export function create(ctx: Context): Piece {
  const lid = lidUniforms(handoff.lid, [X(AT.lake.x), Z(AT.lake.y)], handoff.revealHalfHeightKm, handoff.revealHalfHeightKm / HALF_TAN);
  const material = new THREE.ShaderMaterial({
    uniforms: { ...ctx.rig.uniforms, ...lid },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    // What is behind comes through by the alpha, and the light of the cloud is laid over it.
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.SrcAlphaFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
  });
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  sheet.frustumCulled = false;
  sheet.renderOrder = 60;
  sheet.visible = false;
  const cloud = ctx.parts.byId(`${ctx.parts.unit}/cloud`);
  if (cloud) {
    sheet.userData.part = cloud.id;
    cloud.objects.push(sheet);
  }
  ctx.scene.add(sheet);
  const state = (lid.uLid as THREE.IUniform<THREE.Vector4>).value;

  return {
    setTime: (seconds) => {
      const now = lidAt(seconds, handoff.lid, FPS);
      // Once the sheet has broken up it is not drawn: every frame after that is the rise alone.
      const on = now.eroded < 1;
      sheet.visible = on;
      state.set(on ? 1 : 0, now.tau, now.eroded, on ? handoff.lid.shadow : 0);
    },
    dispose: () => {
      sheet.geometry.dispose();
      material.dispose();
    },
  };
}
