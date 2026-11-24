import * as THREE from 'three';
import { volumeUniforms } from '../core/engine';
import { QUAD_VERTEX } from '../core/post';
import { stream } from '../core/rng';
import { neutralLook, type CameraState, type Lens, type Look, type Stage } from '../core/stage';
import { SUN, WORLD, bake, centre, ground } from './bake';
import { DEPTH_FRAGMENT, EMBER_FRAGMENT, EMBER_VERTEX, FUME_FRAGMENT, GROUND_FRAGMENT, GROUND_VERTEX, SKY_FRAGMENT, SKY_VERTEX } from './shaders';

const GRID = 512;
const SHADOW = 2048;
const EMBERS = 6000;
const FOV = 38;
const DENSE_Z = -850;

function gridGeometry(): THREE.BufferGeometry {
  const half = WORLD / 2;
  const curve = (u: number): number => 0.35 * u + 0.65 * u * u * u;
  const positions = new Float32Array(GRID * GRID * 3);
  for (let j = 0; j < GRID; j++) {
    const v = (j / (GRID - 1)) * 2 - 1;
    const z = DENSE_Z + (v > 0 ? half - DENSE_Z : half + DENSE_Z) * curve(v);
    for (let i = 0; i < GRID; i++) {
      const u = (i / (GRID - 1)) * 2 - 1;
      const k = (j * GRID + i) * 3;
      positions[k] = half * curve(u);
      positions[k + 1] = 0;
      positions[k + 2] = z;
    }
  }
  const index = new Uint32Array((GRID - 1) * (GRID - 1) * 6);
  let n = 0;
  for (let j = 0; j < GRID - 1; j++) {
    for (let i = 0; i < GRID - 1; i++) {
      const a = j * GRID + i;
      index[n++] = a;
      index[n++] = a + GRID;
      index[n++] = a + 1;
      index[n++] = a + 1;
      index[n++] = a + GRID;
      index[n++] = a + GRID + 1;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  return g;
}

function emberGeometry(): THREE.BufferGeometry {
  const rng = stream('spike/embers');
  const positions = new Float32Array(EMBERS * 3);
  const seeds = new Float32Array(EMBERS * 4);
  let made = 0;
  let tries = 0;
  while (made < EMBERS && tries < EMBERS * 60) {
    tries++;
    const z = rng.range(-1180, -150);
    const x = centre(z) + rng.range(-430, 430);
    const g = ground(x, z);
    if (g.lake * g.heat < 0.5 && rng.next() > 0.03) continue;
    positions[made * 3] = x;
    positions[made * 3 + 1] = g.height + 0.3;
    positions[made * 3 + 2] = z;
    seeds[made * 4] = rng.next();
    seeds[made * 4 + 1] = rng.range(3, 7.5);
    seeds[made * 4 + 2] = rng.range(2.5, 9);
    seeds[made * 4 + 3] = rng.range(0.05, 0.22);
    made++;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions.subarray(0, made * 3), 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seeds.subarray(0, made * 4), 4));
  return g;
}

export function createSpike(): Stage {
  const baked = bake();
  const time = { value: 0 };
  const sun = { value: SUN.clone() };
  const sunColor = { value: new THREE.Vector3(6.0, 3.0, 1.35) };
  const world = { value: WORLD };

  const shadowTarget = new THREE.WebGLRenderTarget(SHADOW, SHADOW, { depthBuffer: true, stencilBuffer: false, generateMipmaps: false });
  shadowTarget.depthTexture = new THREE.DepthTexture(SHADOW, SHADOW);
  const light = new THREE.OrthographicCamera(-2700, 2700, 2700, -2700, 100, 10000);
  light.position.copy(SUN).multiplyScalar(5000).add(new THREE.Vector3(0, 100, 0));
  light.lookAt(0, 100, 0);
  light.updateMatrixWorld(true);
  const shadowMatrix = { value: new THREE.Matrix4().multiplyMatrices(light.projectionMatrix, light.matrixWorldInverse) };
  const shadow = { tShadow: { value: shadowTarget.depthTexture }, uShadowMatrix: shadowMatrix, uShadowTexel: { value: 1 / SHADOW } };

  const geometry = gridGeometry();
  const groundMaterial = new THREE.ShaderMaterial({
    vertexShader: GROUND_VERTEX,
    fragmentShader: GROUND_FRAGMENT,
    uniforms: {
      tMap: { value: baked.map },
      tSlope: { value: baked.slope },
      tDetail: { value: baked.detail },
      uWorld: world,
      uTime: time,
      uSun: sun,
      uSunColor: sunColor,
      ...shadow,
    },
  });
  const land = new THREE.Mesh(geometry, groundMaterial);
  land.frustumCulled = false;

  const depthMaterial = new THREE.ShaderMaterial({
    vertexShader: GROUND_VERTEX,
    fragmentShader: DEPTH_FRAGMENT,
    uniforms: { tMap: { value: baked.map }, uWorld: world },
    colorWrite: false,
  });
  const caster = new THREE.Mesh(geometry, depthMaterial);
  caster.frustumCulled = false;
  const shadowScene = new THREE.Scene();
  shadowScene.add(caster);

  const skyGeometry = new THREE.BufferGeometry();
  skyGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const sky = new THREE.Mesh(
    skyGeometry,
    new THREE.ShaderMaterial({
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      uniforms: { tDetail: { value: baked.detail }, uTime: time, uSun: sun, uSunColor: sunColor },
      depthTest: false,
      depthWrite: false,
    }),
  );
  sky.frustumCulled = false;
  sky.renderOrder = -1;

  const pixelsPerMetre = { value: 1 };
  const embers = new THREE.Points(
    emberGeometry(),
    new THREE.ShaderMaterial({
      vertexShader: EMBER_VERTEX,
      fragmentShader: EMBER_FRAGMENT,
      uniforms: { uTime: time, uPixelsPerMetre: pixelsPerMetre },
      depthWrite: false,
      transparent: true,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
    }),
  );
  embers.frustumCulled = false;
  embers.renderOrder = 2;

  const scene = new THREE.Scene();
  scene.add(sky, land, embers);

  const volume = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERTEX,
    fragmentShader: FUME_FRAGMENT,
    uniforms: {
      ...volumeUniforms(),
      tMap: { value: baked.map },
      tSlope: { value: baked.slope },
      tNoise: { value: baked.fume },
      uWorld: world,
      uTime: time,
      uSun: sun,
      uSunColor: sunColor,
      ...shadow,
    },
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
  });

  const camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.5, 30000);
  const lens: Lens = { aperture: 0.012, focus: 320 };
  const look: Look = { ...neutralLook(), exposure: 1.1, bloom: 0.07, vignette: 0.22, grain: 0.014, contrast: 1.04 };

  const cameraAt = (seconds: number): CameraState => {
    const z = -1100 + 9 * seconds;
    const ahead = z + 700;
    return {
      position: [centre(z) + 20, 26, z],
      aim: [centre(ahead) * 0.7, 6, ahead],
      height: 26,
      lens: { fovDegrees: FOV, aperture: lens.aperture, focus: lens.focus },
    };
  };

  return {
    id: 'spike',
    unit: null,
    scene,
    camera,
    lens,
    look,
    volume,
    resize: (_width, height) => {
      pixelsPerMetre.value = height / (2 * Math.tan((FOV * Math.PI) / 360));
    },
    setTime: (seconds) => {
      time.value = seconds;
      const c = cameraAt(seconds);
      camera.position.set(...c.position);
      camera.up.set(0, 1, 0);
      camera.lookAt(...c.aim);
    },
    cameraAt,
    beforeSample: (renderer) => {
      renderer.setRenderTarget(shadowTarget);
      renderer.clear(true, true, false);
      renderer.render(shadowScene, light);
    },
  };
}
