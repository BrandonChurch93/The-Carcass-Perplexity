// The water of the Eye as every folder under it needs it: how the light dies with depth, the dome that swells at the centre,
// and the mirror: the scene above the water drawn once more from under it, which the surface reflects.
import * as THREE from 'three';

/** Per metre of water: red goes first, so that the deep is blue and then black. */
export const ABSORB: [number, number, number] = [0.07, 0.024, 0.014];

export function waterUniforms(): Record<string, THREE.IUniform> {
  return {
    uAbsorb: { value: new THREE.Vector3(...ABSORB) },
    uDeep: { value: new THREE.Vector3(0.0016, 0.0058, 0.0125) },
    uDome: { value: new THREE.Vector4(0, 66, 0, 0) },
  };
}

// Needs RIG_GLSL before it.
export const WATER_GLSL = /* glsl */ `
uniform vec3 uAbsorb;
uniform vec3 uDeep;
// x: the height of the dome at its middle now, metres. y: its radius.
uniform vec4 uDome;

float domeAt(vec2 xz) {
  float u = clamp(length(xz) / uDome.y, 0.0, 1.0);
  float k = 1.0 - u * u;
  return uDome.x * k * k;
}

// The light that reaches a point under the water, as a share of the light at the surface.
vec3 sunk(vec3 p) {
  return exp(-uAbsorb * max(domeAt(p.xz) - p.y, 0.0) * 1.15);
}

// A lit colour under the water as the camera sees it: dimmed along the bent path up to the surface, with the water's own blue in its place.
vec3 throughWater(vec3 c, vec3 p) {
  float depth = max(domeAt(p.xz) - p.y, 0.0);
  vec3 toCamera = normalize(cameraPosition - p);
  float ci = clamp(toCamera.y, 0.0, 1.0);
  float ct = sqrt(1.0 - (1.0 - ci * ci) / 1.77);
  vec3 t = exp(-uAbsorb * depth / ct);
  // The blue of deep water comes from all the water round it: the shade of the brow lies on it softly, not as an edge.
  vec3 sky = skyIrradiance(vec3(0.0, 1.0, 0.0)) * mix(1.0, skyOpen(vec3(p.x, 0.0, p.z)), 0.3 * exp(-depth / 12.0) + 0.12) / 3.14159;
  return c * t + uDeep * sky * 2.2 * (1.0 - t);
}`;

export interface Mirror {
  readonly uniforms: { tMirror: THREE.IUniform; uMirrorMatrix: THREE.IUniform<THREE.Matrix4> };
  /** Draws the scene above the water as the water reflects it. `hide` is everything that is the lake itself. */
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, hide: THREE.Object3D[]): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

export function createMirror(): Mirror {
  const target = new THREE.WebGLRenderTarget(8, 8, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    generateMipmaps: false,
    depthBuffer: true,
    stencilBuffer: false,
    colorSpace: THREE.NoColorSpace,
  });
  const eye = new THREE.PerspectiveCamera();
  eye.matrixAutoUpdate = true;
  const uniforms = { tMirror: { value: target.texture }, uMirrorMatrix: { value: new THREE.Matrix4() } };
  const normal = new THREE.Vector3(0, 1, 0);
  const plane = new THREE.Plane();
  const clip = new THREE.Vector4();
  const q = new THREE.Vector4();
  const rotation = new THREE.Matrix4();
  const place = new THREE.Vector3();
  const aim = new THREE.Vector3();
  const level = new THREE.Vector3(0, 0, 0);
  const cleared = new THREE.Color();
  return {
    uniforms,
    render: (renderer, scene, camera, hide) => {
      camera.updateMatrixWorld();
      place.setFromMatrixPosition(camera.matrixWorld);
      rotation.extractRotation(camera.matrixWorld);
      aim.set(0, 0, -1).applyMatrix4(rotation).add(place);
      place.y = -place.y;
      aim.y = -aim.y;
      eye.position.copy(place);
      eye.up.set(0, 1, 0).applyMatrix4(rotation).reflect(normal);
      eye.lookAt(aim);
      eye.near = camera.near;
      eye.far = camera.far;
      eye.updateMatrixWorld();
      eye.projectionMatrix.copy(camera.projectionMatrix);
      uniforms.uMirrorMatrix.value.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1).multiply(eye.projectionMatrix).multiply(eye.matrixWorldInverse);
      // The near plane is laid on the water, so that nothing under it is drawn into the mirror.
      plane.setFromNormalAndCoplanarPoint(normal, level).applyMatrix4(eye.matrixWorldInverse);
      clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
      const p = eye.projectionMatrix.elements;
      q.x = (Math.sign(clip.x) + (p[8] as number)) / (p[0] as number);
      q.y = (Math.sign(clip.y) + (p[9] as number)) / (p[5] as number);
      q.z = -1;
      q.w = (1 + (p[10] as number)) / (p[14] as number);
      clip.multiplyScalar(2 / clip.dot(q));
      p[2] = clip.x;
      p[6] = clip.y;
      p[10] = clip.z + 1 - 0.003;
      p[14] = clip.w;
      eye.projectionMatrixInverse.copy(eye.projectionMatrix).invert();
      const was = hide.map((o) => o.visible);
      for (const o of hide) o.visible = false;
      const alpha = renderer.getClearAlpha();
      renderer.getClearColor(cleared);
      renderer.setClearColor(0x000000, 0);
      renderer.setRenderTarget(target);
      renderer.clear(true, true, false);
      renderer.render(scene, eye);
      renderer.setRenderTarget(null);
      renderer.setClearColor(cleared, alpha);
      hide.forEach((o, i) => {
        o.visible = was[i] as boolean;
      });
    },
    resize: (width, height) => {
      target.setSize(Math.max(8, Math.round(width / 2)), Math.max(8, Math.round(height / 2)));
    },
    dispose: () => target.dispose(),
  };
}
