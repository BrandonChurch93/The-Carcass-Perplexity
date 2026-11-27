// The join with the Eye, on the side of the rise: the top of the lid of cloud the camera has just come up through, falling away under it
// and breaking up over the lake. It is laid over the whole frame, last, and is not drawn at all once the sheet is gone.
import * as THREE from 'three';
import { FPS } from '../../../config';
import { AT, HALF_TAN, RISE_FIRST, X, Z, handoff, startOffsetAt } from '../shared/anchors';
import type { Context, Piece } from '../shared/context';
import { NOISE_GLSL, RIG_GLSL } from '../shared/glsl';
import { LID_GLSL, lidAt, lidUniforms } from './lid';

// The Eye's finish is warmer and darker than the rise's, most in the deep water and least in the sunlit heads: the lid is weighed by these
// here, its shade, its water and its sunlit side each by its own, so the frame has one level and one colour on both sides of the cut.
const EYE_GRADE = [0.961, 0.894, 0.799];
const EYE_DEEP = [0.3, 0.65, 0.75];
const EYE_LIT = [1.071, 0.983, 0.856];

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
${NOISE_GLSL}
${LID_GLSL}
void main() {
  vec3 rd = normalize(vRay);
  gl_FragColor = lidOver(cameraPosition, rd, -cameraPosition.y / min(rd.y, -1e-4));
}`;

const OVER_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const OVER_FRAGMENT = /* glsl */ `
uniform sampler2D tLid;
varying vec2 vUv;
${RIG_GLSL}
void main() {
  vec4 lid = texture2D(tLid, vUv);
  gl_FragColor = vec4(rigOut(lid.rgb), mix(lid.a, 1.0, uSolo));
}`;

// Cloud is soft: it is drawn half the size of the frame and laid over it.
const SMALLER = 2.5;

export function create(ctx: Context): Piece {
  // The banks stand under the lens on the first frame of the rise, wherever rise.json has put it over the lake.
  const [offX, offZ] = startOffsetAt(RISE_FIRST);
  const lid = lidUniforms(handoff.lid, [X(AT.lake.x) + offX, Z(AT.lake.y) + offZ], handoff.revealHalfHeightKm, handoff.revealHalfHeightKm / HALF_TAN, EYE_GRADE, EYE_DEEP, EYE_LIT);
  const target = new THREE.WebGLRenderTarget(8, 8, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    generateMipmaps: false,
    depthBuffer: false,
    stencilBuffer: false,
    colorSpace: THREE.NoColorSpace,
  });
  const drawn = new THREE.ShaderMaterial({ uniforms: lid, vertexShader: VERTEX, fragmentShader: FRAGMENT, depthTest: false, depthWrite: false, blending: THREE.NoBlending });
  const small = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), drawn);
  small.frustumCulled = false;
  const smallScene = new THREE.Scene();
  smallScene.add(small);
  const material = new THREE.ShaderMaterial({
    uniforms: { ...ctx.rig.uniforms, tLid: { value: target.texture } },
    vertexShader: OVER_VERTEX,
    fragmentShader: OVER_FRAGMENT,
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
  let on = false;

  return {
    setTime: (seconds) => {
      const now = lidAt(seconds, handoff.lid, FPS);
      // Once the sheet has broken up it is not drawn: every frame after that is the rise alone.
      on = now.eroded < 1;
      sheet.visible = on;
      state.set(on ? 1 : 0, now.tau, now.eroded, on ? handoff.lid.shadow : 0);
    },
    beforeSample: (renderer, camera) => {
      if (!on || !sheet.visible) return;
      const was = renderer.getRenderTarget();
      renderer.setRenderTarget(target);
      renderer.render(smallScene, camera);
      renderer.setRenderTarget(was);
    },
    resize: (width, height) => {
      target.setSize(Math.max(8, Math.ceil(width / SMALLER)), Math.max(8, Math.ceil(height / SMALLER)));
    },
    dispose: () => {
      sheet.geometry.dispose();
      small.geometry.dispose();
      material.dispose();
      drawn.dispose();
      target.dispose();
    },
  };
}
