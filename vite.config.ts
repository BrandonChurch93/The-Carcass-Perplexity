import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vitest/config';
import { approvedFiles, state } from './tools/lib/hash.mjs';

const outDir = process.env.CARCASS_OUT_DIR ?? 'dist';
const built = state();

export default defineConfig({
  base: './',
  define: {
    __ENGINE_HASH__: JSON.stringify(built.engine),
    __UNIT_HASHES__: JSON.stringify(built.units),
    __APPROVED_FILES__: JSON.stringify(approvedFiles()),
  },
  build: { outDir, emptyOutDir: true, target: 'es2022', chunkSizeWarningLimit: 4000 },
  plugins: [
    {
      name: 'carcass-build-record',
      closeBundle() {
        if (fs.existsSync(outDir)) fs.writeFileSync(path.join(outDir, 'build.json'), JSON.stringify(built));
      },
    },
  ],
  test: { include: ['tests/**/*.test.ts'], testTimeout: 60000 },
});
