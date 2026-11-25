import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import portable from '../../config/portable.json';
import { FPS, config, formatById, samplesOf, type Format } from '../config';
import { DIAGNOSTICS, Post, QUAD_VERTEX, additivePass, halfFloatTarget, type Diagnostic } from './post';
import { frameSamples, type Sample } from './sampler';
import { partOf, type LivePart } from './place';
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

const FLAG_SOLID = new THREE.Color().setRGB(1, 0, 1);
const FLAG_EFFECT = new THREE.Color().setRGB(1, 160 / 255, 0);
const CENTRE: Sample = { px: 0, py: 0, lensX: 0, lensY: 0, shutter: 0 };

type Drawn = THREE.Mesh | THREE.Points | THREE.Line;
const isDrawn = (o: THREE.Object3D): o is Drawn => (o as THREE.Mesh).isMesh === true || (o as THREE.Points).isPoints === true || (o as THREE.Line).isLine === true;

function flagMaterial(source: THREE.Material, colour: THREE.Color): THREE.Material {
  const make = source.userData.flag as ((c: THREE.Color) => THREE.Material) | undefined;
  if (make) return make(colour);
  const m = new THREE.MeshBasicMaterial({ color: colour, side: source.side, toneMapped: false });
  m.depthTest = source.depthTest;
  m.depthWrite = source.depthWrite;
  return m;
}

export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly gl: WebGL2RenderingContext;
  readonly extensions: string[] = [];
  format: Format;
  diagnostic: Diagnostic = null;
  part: string | null = null;
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
  private shownA: THREE.WebGLRenderTarget | null = null;
  private shownB: THREE.WebGLRenderTarget | null = null;

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
    for (const t of [this.sceneTarget, this.volumeTarget, this.accumTarget, this.shownA, this.shownB]) {
      t?.depthTexture?.dispose();
      t?.dispose();
    }
    this.shownA = null;
    this.shownB = null;
    this.renderer.setSize(f.width, f.height, false);
    this.sceneTarget = halfFloatTarget(f.width, f.height, true);
    this.volumeTarget = halfFloatTarget(Math.ceil(f.width / 2), Math.ceil(f.height / 2));
    this.accumTarget = halfFloatTarget(f.width, f.height);
    this.post.setSize(f.width, f.height);
  }

  setDiagnostic(view: string | null, part: string | null = null): void {
    if (view !== null && !(DIAGNOSTICS as readonly string[]).includes(view)) throw new Error(`No such diagnostic view: ${view}`);
    if (view === 'solo' && !part) throw new Error('The solo view needs the name of a part');
    this.diagnostic = view as Diagnostic;
    this.part = view === 'solo' || view === 'standins' ? part : null;
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

  private accumulate(stage: Stage, frame: number, seq: number, samples: readonly Sample[], worldShift: number, withVolume: boolean, background: THREE.Color | null = null): void {
    const r = this.renderer;
    const scene = this.sceneTarget as THREE.WebGLRenderTarget;
    const volume = this.volumeTarget as THREE.WebGLRenderTarget;
    const accum = this.accumTarget as THREE.WebGLRenderTarget;
    const count = samples.length;
    stage.resize(this.format.width, this.format.height);
    r.setRenderTarget(accum);
    r.clear(true, false, false);
    for (let i = 0; i < count; i++) {
      const s = samples[i] as Sample;
      stage.setTime((frame + s.shutter * SHUTTER) / FPS, worldShift);
      this.aim(stage, s);
      stage.beforeSample(r);
      r.setRenderTarget(scene);
      if (background) r.setClearColor(background, 1);
      r.clear(true, true, false);
      if (background) r.setClearColor(0x000000, 0);
      r.render(stage.scene, stage.camera);
      const fume = withVolume ? stage.volume : null;
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
  }

  private show(stage: Stage, seq: number, diag: Diagnostic, target: THREE.WebGLRenderTarget | null = null, plain = false): void {
    const accum = this.accumTarget as THREE.WebGLRenderTarget;
    const scene = this.sceneTarget as THREE.WebGLRenderTarget;
    this.post.render(accum.texture, scene.depthTexture, stage.look, seq, diag, stage.camera.near, stage.camera.far, target, plain);
  }

  private shown(): [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget] {
    const { width, height } = this.format;
    const make = (): THREE.WebGLRenderTarget =>
      new THREE.WebGLRenderTarget(width, height, { type: THREE.UnsignedByteType, format: THREE.RGBAFormat, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false, depthBuffer: false, colorSpace: THREE.NoColorSpace });
    this.shownA ??= make();
    this.shownB ??= make();
    return [this.shownA, this.shownB];
  }

  private flagged(stage: Stage): { parts: Map<string, LivePart>; effect: boolean } {
    const parts = new Map<string, LivePart>();
    let effect = false;
    for (const p of stage.parts?.all() ?? []) {
      if (p.state !== 'stand-in' || (this.part !== null && p.id !== this.part)) continue;
      if (p.kind === 'effect') effect = true;
      else parts.set(p.id, p);
    }
    return { parts, effect };
  }

  private renderStandIns(stage: Stage, frame: number, seq: number): void {
    const r = this.renderer;
    const { parts, effect } = this.flagged(stage);
    const swapped: [Drawn, THREE.Material | THREE.Material[]][] = [];
    const muted = new Set<THREE.Material>();
    stage.scene.traverse((o) => {
      if (!isDrawn(o)) return;
      const id = partOf(o);
      const list = Array.isArray(o.material) ? o.material : [o.material];
      if (id !== null && parts.has(id)) {
        swapped.push([o, o.material]);
        const twins = list.map((m) => flagMaterial(m, FLAG_SOLID));
        o.material = Array.isArray(o.material) ? twins : (twins[0] as THREE.Material);
      } else {
        for (const m of list) if (m.colorWrite) muted.add(m);
      }
    });
    for (const m of muted) m.colorWrite = false;
    try {
      this.accumulate(stage, frame, seq, [CENTRE], 0, false, effect ? FLAG_EFFECT : null);
    } finally {
      for (const m of muted) m.colorWrite = true;
      for (const [o, m] of swapped) o.material = m;
    }
    this.show(stage, seq, 'standins');
  }

  private renderSolo(stage: Stage, frame: number, seq: number, samples: readonly Sample[]): void {
    const part = stage.parts?.byId(this.part ?? '');
    const hidden: THREE.Object3D[] = [];
    const solid = part?.kind === 'solid';
    stage.scene.traverse((o) => {
      if (!isDrawn(o) || !o.visible) return;
      if (solid ? partOf(o) !== part?.id : !part) {
        o.visible = false;
        hidden.push(o);
      }
    });
    stage.solo?.(part ? part.id : null);
    try {
      this.accumulate(stage, frame, seq, samples, 0, part ? part.kind === 'effect' : false);
    } finally {
      stage.solo?.(null);
      for (const o of hidden) o.visible = true;
    }
    this.show(stage, seq, null);
  }

  private renderMotion(stage: Stage, frame: number, seq: number, samples: readonly Sample[]): void {
    const [a, b] = this.shown();
    this.accumulate(stage, frame, seq, samples, 0, true);
    this.show(stage, seq, null, a, true);
    this.accumulate(stage, frame, seq, samples, config.motion.checkGapSeconds, true);
    this.show(stage, seq, null, b, true);
    this.post.difference(a.texture, b.texture);
  }

  render(stage: Stage, frame: number, seq: number, tier: string): void {
    const samples = frameSamples(seq, samplesOf(tier));
    if (this.diagnostic === 'standins') this.renderStandIns(stage, frame, seq);
    else if (this.diagnostic === 'solo') this.renderSolo(stage, frame, seq, samples);
    else if (this.diagnostic === 'motion') this.renderMotion(stage, frame, seq, samples);
    else {
      this.accumulate(stage, frame, seq, samples, 0, true);
      this.show(stage, seq, this.diagnostic);
    }
    this.finish();
  }

  finish(): void {
    this.gl.readPixels(0, 0, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, new Uint8Array(4));
  }

  pixels(): Uint8Array<ArrayBuffer> {
    const { width, height } = this.format;
    const out = new Uint8Array(new ArrayBuffer(width * height * 4));
    this.renderer.setRenderTarget(null);
    this.gl.readPixels(0, 0, width, height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, out);
    return out;
  }
}
