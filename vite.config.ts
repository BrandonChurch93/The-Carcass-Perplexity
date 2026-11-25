import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vitest/config';
import { approvedFiles, state } from './tools/lib/hash.mjs';
import { WEB_MIX, webMix } from './tools/lib/webmix.mjs';

const outDir = process.env.CARCASS_OUT_DIR ?? 'dist';
const built = state();

export default defineConfig({
  base: './',
  define: {
    __ENGINE_HASH__: JSON.stringify(built.engine),
    __UNIT_HASHES__: JSON.stringify(built.units),
    __APPROVED_FILES__: JSON.stringify(approvedFiles()),
    __WEB_MIX__: JSON.stringify(WEB_MIX),
  },
  build: { outDir, emptyOutDir: true, target: 'es2022', chunkSizeWarningLimit: 4000 },
  plugins: [
    {
      name: 'carcass-build-record',
      closeBundle() {
        if (!fs.existsSync(outDir)) return;
        fs.writeFileSync(path.join(outDir, 'build.json'), JSON.stringify(built));
        const mix = webMix(outDir);
        if (!mix.file) console.warn(mix.why);
      },
    },
  ],
  test: { include: ['tests/**/*.test.ts'], testTimeout: 60000 },
});
