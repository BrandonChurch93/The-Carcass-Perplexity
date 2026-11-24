import os from 'node:os';
import { chromium } from 'playwright-core';
import { rel, readJson, writeJson, utc } from './lib/paths.mjs';
import { browserPath, FLAGS } from './lib/render.mjs';

const FILE = rel('config', 'webgl-caps.json');

const browser = await chromium.launch({ executablePath: browserPath(), headless: true, args: FLAGS });
try {
  const page = await browser.newPage();
  const found = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return null;
    const p = (name) => gl.getParameter(gl[name]);
    const pair = (name) => Array.from(p(name));
    const precision = (shader, kind) => {
      const f = gl.getShaderPrecisionFormat(gl[shader], gl[kind]);
      return { rangeMin: f.rangeMin, rangeMax: f.rangeMax, precision: f.precision };
    };
    return {
      version: p('VERSION'),
      shadingLanguage: p('SHADING_LANGUAGE_VERSION'),
      vendor: p('VENDOR'),
      renderer: p('RENDERER'),
      limits: {
        maxTextureSize: p('MAX_TEXTURE_SIZE'),
        max3dTextureSize: p('MAX_3D_TEXTURE_SIZE'),
        maxCubeMapTextureSize: p('MAX_CUBE_MAP_TEXTURE_SIZE'),
        maxArrayTextureLayers: p('MAX_ARRAY_TEXTURE_LAYERS'),
        maxRenderbufferSize: p('MAX_RENDERBUFFER_SIZE'),
        maxViewportDims: pair('MAX_VIEWPORT_DIMS'),
        maxDrawBuffers: p('MAX_DRAW_BUFFERS'),
        maxColorAttachments: p('MAX_COLOR_ATTACHMENTS'),
        maxSamples: p('MAX_SAMPLES'),
        maxTextureImageUnits: p('MAX_TEXTURE_IMAGE_UNITS'),
        maxVertexTextureImageUnits: p('MAX_VERTEX_TEXTURE_IMAGE_UNITS'),
        maxCombinedTextureImageUnits: p('MAX_COMBINED_TEXTURE_IMAGE_UNITS'),
        maxVertexAttribs: p('MAX_VERTEX_ATTRIBS'),
        maxVertexUniformVectors: p('MAX_VERTEX_UNIFORM_VECTORS'),
        maxFragmentUniformVectors: p('MAX_FRAGMENT_UNIFORM_VECTORS'),
        maxVaryingVectors: p('MAX_VARYING_VECTORS'),
        maxUniformBufferBindings: p('MAX_UNIFORM_BUFFER_BINDINGS'),
        maxElementsVertices: p('MAX_ELEMENTS_VERTICES'),
        maxElementsIndices: p('MAX_ELEMENTS_INDICES'),
        maxElementIndex: p('MAX_ELEMENT_INDEX'),
        aliasedPointSizeRange: pair('ALIASED_POINT_SIZE_RANGE'),
        aliasedLineWidthRange: pair('ALIASED_LINE_WIDTH_RANGE'),
      },
      precision: {
        fragmentHighFloat: precision('FRAGMENT_SHADER', 'HIGH_FLOAT'),
        fragmentMediumFloat: precision('FRAGMENT_SHADER', 'MEDIUM_FLOAT'),
        fragmentHighInt: precision('FRAGMENT_SHADER', 'HIGH_INT'),
      },
      extensions: (gl.getSupportedExtensions() || []).sort(),
    };
  });
  if (!found) throw new Error('This browser gave no WebGL2 context.');
  const portable = readJson(rel('config', 'portable.json')).portable;
  const out = {
    measured: utc(),
    machine: { host: os.hostname(), cores: os.cpus().length, memGb: Math.round((os.totalmem() / 2 ** 30) * 10) / 10 },
    browser: browser.version(),
    flags: FLAGS,
    version: found.version,
    shadingLanguage: found.shadingLanguage,
    vendor: found.vendor,
    renderer: found.renderer,
    limits: found.limits,
    precision: found.precision,
    portable,
    portableMissingHere: portable.filter((n) => !found.extensions.includes(n)),
    extensions: found.extensions.map((name) => ({ name, portable: portable.includes(name) })),
  };
  writeJson(FILE, out);
  console.log(`caps: ${out.renderer}`);
  console.log(`caps: largest 2D texture ${out.limits.maxTextureSize}, largest 3D texture ${out.limits.max3dTextureSize}, ${found.extensions.length} extensions, ${portable.length} marked portable`);
  if (out.portableMissingHere.length) console.log(`caps: this machine lacks ${out.portableMissingHere.join(', ')}`);
  console.log('caps: wrote config/webgl-caps.json');
} catch (e) {
  console.error(`caps: ${e.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
