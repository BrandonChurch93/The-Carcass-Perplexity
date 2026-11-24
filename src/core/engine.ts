import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import portable from '../../config/portable.json';
import { FPS, formatById, samplesOf, type Format } from '../config';
import { DIAGNOSTICS, Post, QUAD_VERTEX, additivePass, halfFloatTarget, type Diagnostic } from './post';
import { frameSamples, type Sample } from './sampler';
import type { Stage } from './stage';
import { SHUTTER } from './time';

const RESOLVE_FRAGMENT = /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D tVolume;
uniform float uWeight;
uniform float uHasVolume;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tScene, vUv).rgb;
  if (uHasVolume > 0.5) {
    vec4 v = texture2D(tVolume, vUv);
    c = c * v.a + v.rgb;
  }
  gl_FragColor = vec4(c * uWeight, uWeight);
}`;

export function volumeUniforms(): Record<string, THREE.IUniform> {
  return {
    tDepth: { value: null },
    uInvProjection: { value: new THREE.Matrix4() },
    uCameraWorld: { value: new THREE.Matrix4() },
    uSeq: { value: 0 },
    uSampleIndex: { value: 0 },
  };
}

export { QUAD_VERTEX };

const right = new THREE.Vector3();
const up = new THREE.Vector3();

export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly gl: WebGL2RenderingContext;
  readonly extensions: string[] = [];
  format: Format;
  diagnostic: Diagnostic = null;
  private readonly post: Post;
  private readonly quad = new FullScreenQuad();
  private readonly resolve = additivePass(RESOLVE_FRAGMENT, {
    tScene: { value: null },
    tVolume: { value: null },
    uWeight: { value: 1 },
    uHasVolume: { value: 0 },
  });
  private sceneTarget: THREE.WebGLRenderTarget | null = null;
  private volumeTarget: THREE.WebGLRenderTarget | null = null;
  private accumTarget: THREE.WebGLRenderTarget | null = null;

  constructor(readonly canvas: HTMLCanvasElement, formatId = 'hd') {
    const attributes: WebGLContextAttributes = {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    };
    const gl = canvas.getContext('webgl2', attributes);
    if (!gl) throw new Error('This browser has no WebGL2');
    const allowed = new Set<string>(portable.portable);
    const getExtension = gl.getExtension.bind(gl) as (name: string) => unknown;
    const getSupported = gl.getSupportedExtensions.bind(gl);
    gl.getExtension = ((name: string) => {
      if (!allowed.has(name)) return null;
      const ext = getExtension(name);
      if (ext && !this.extensions.includes(name)) this.extensions.push(name);
      return ext;
    }) as typeof gl.getExtension;
    gl.getSupportedExtensions = () => (getSupported() ?? []).filter((n) => allowed.has(n));
    this.gl = gl;

    this.renderer = new THREE.WebGLRenderer({ canvas, context: gl, ...attributes });
    this.renderer.setPixelRatio(1);
    this.renderer.autoClear = false;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.debug.onShaderError = (g, _program, vs, fs) => {
      const text = [g.getShaderInfoLog(vs), g.getShaderInfoLog(fs)].filter(Boolean).join('\n');
      throw new Error(`A shader did not compile:\n${text}`);
    };
    this.post = new Post(this.renderer);
    this.format = formatById(formatId);
    this.setFormat(formatId);
  }

  setFormat(id: string): void {
    const f = formatById(id);
    this.format = f;
    for (const t of [this.sceneTarget, this.volumeTarget, this.accumTarget]) {
      t?.depthTexture?.dispose();
      t?.dispose();
    }
    this.renderer.setSize(f.width, f.height, false);
    this.sceneTarget = halfFloatTarget(f.width, f.height, true);
    this.volumeTarget = halfFloatTarget(Math.ceil(f.width / 2), Math.ceil(f.height / 2));
    this.accumTarget = halfFloatTarget(f.width, f.height);
    this.post.setSize(f.width, f.height);
  }

  setDiagnostic(view: string | null): void {
    if (view !== null && !(DIAGNOSTICS as readonly string[]).includes(view)) throw new Error(`No such diagnostic view yet: ${view}`);
    this.diagnostic = view as Diagnostic;
  }

  private aim(stage: Stage, s: Sample): void {
    const cam = stage.camera;
    const { width, height } = this.format;
    cam.aspect = width / height;
    cam.updateProjectionMatrix();
    const dx = s.lensX * stage.lens.aperture;
    const dy = s.lensY * stage.lens.aperture;
    const m = cam.projectionMatrix.elements;
    m[8] = -((m[0] as number) * dx) / stage.lens.focus - (2 * s.px) / width;
    m[9] = -((m[5] as number) * dy) / stage.lens.focus - (2 * s.py) / height;
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    if (dx !== 0 || dy !== 0) {
      right.set(1, 0, 0).applyQuaternion(cam.quaternion);
      up.set(0, 1, 0).applyQuaternion(cam.quaternion);
      cam.position.addScaledVector(right, dx).addScaledVector(up, dy);
    }
    cam.updateMatrixWorld(true);
  }

  render(stage: Stage, frame: number, seq: number, tier: string): void {
    const r = this.renderer;
    const scene = this.sceneTarget as THREE.WebGLRenderTarget;
    const volume = this.volumeTarget as THREE.WebGLRenderTarget;
    const accum = this.accumTarget as THREE.WebGLRenderTarget;
    const count = samplesOf(tier);
    const samples = frameSamples(seq, count);
    stage.resize(this.format.width, this.format.height);
    r.setRenderTarget(accum);
    r.clear(true, false, false);
    for (let i = 0; i < count; i++) {
      const s = samples[i] as Sample;
      stage.setTime((frame + s.shutter * SHUTTER) / FPS);
      this.aim(stage, s);
      stage.beforeSample(r);
      r.setRenderTarget(scene);
      r.clear(true, true, false);
      r.render(stage.scene, stage.camera);
      const fume = stage.volume;
      if (fume) {
        const u = fume.uniforms;
        u.tDepth!.value = scene.depthTexture;
        (u.uInvProjection!.value as THREE.Matrix4).copy(stage.camera.projectionMatrixInverse);
        (u.uCameraWorld!.value as THREE.Matrix4).copy(stage.camera.matrixWorld);
        u.uSeq!.value = seq;
        u.uSampleIndex!.value = i;
        r.setRenderTarget(volume);
        this.quad.material = fume;
        this.quad.render(r);
      }
      const v = this.resolve.uniforms;
      v.tScene!.value = scene.texture;
      v.tVolume!.value = volume.texture;
      v.uWeight!.value = 1 / count;
      v.uHasVolume!.value = fume ? 1 : 0;
      r.setRenderTarget(accum);
      this.quad.material = this.resolve;
      this.quad.render(r);
    }
    this.post.render(accum.texture, scene.depthTexture, stage.look, seq, this.diagnostic, stage.camera.near, stage.camera.far);
    this.finish();
  }

  finish(): void {
    this.gl.readPixels(0, 0, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, new Uint8Array(4));
  }

  pixels(): Uint8Array {
    const { width, height } = this.format;
    const out = new Uint8Array(width * height * 4);
    this.renderer.setRenderTarget(null);
    this.gl.readPixels(0, 0, width, height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, out);
    return out;
  }
}
