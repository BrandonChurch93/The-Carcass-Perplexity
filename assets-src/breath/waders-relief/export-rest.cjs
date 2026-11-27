// Writes the rest shape of the three waders seen close (the same builds the film makes) for the sculpt in Blender.
// Before it: npx tsc --ignoreConfig --outDir out/work/js --module commonjs --target es2020 --skipLibCheck --noEmitOnError false src/places/breath/waders/animal.ts; echo {\"type\":\"commonjs\"} > out/work/js/package.json
// Run from the repo: node assets-src/breath/waders-relief/export-rest.cjs out/work/bake
const fs = require('fs');
const path = require('path');
const { makeBuild } = require(path.resolve('out/work/js/animal.js'));
const { buildBody } = require(path.resolve('out/work/js/body.js'));
const out = process.argv[2] || 'out/work/bake';
// Sizes of the three (shared/anchors.ts, NEAR_WADERS) and their own trunks (waders/herd.ts, OWN).
const SIZE = [1.08, 1.05, 0.98];
const OWN = [
  { chest: 1.12, belly: 0.85, sway: 0.5, gaunt: 0.7 },
  { chest: 1.0, belly: 0.95, sway: 0.7, gaunt: 0.62 },
  { chest: 0.94, belly: 1.05, sway: 0.3, gaunt: 0.55 },
];
fs.mkdirSync(out, { recursive: true });
for (let i = 0; i < 3; i++) {
  const b = makeBuild(SIZE[i] * 1.06, 11 + i * 7.31, false, 0.0125, OWN[i]);
  const body = buildBody(b, b.cell * b.k);
  const meta = { k: b.k, seed: b.seed, count: body.count, tris: body.index.length / 3, bodyLen: b.bodyLen, legLen: b.legLen, neckLen: b.neckLen };
  fs.writeFileSync(path.join(out, `rest-${i}.json`), JSON.stringify(meta));
  const w = (name, a) => fs.writeFileSync(path.join(out, `rest-${i}-${name}.bin`), Buffer.from(a.buffer, a.byteOffset, a.byteLength));
  w('pos', body.rest);
  w('nor', body.restN);
  w('idx', body.index);
  w('leg', body.legT);
  w('neck', body.neckU);
  w('rib', body.ribS);
  w('cage', body.cage);
  console.log(i, JSON.stringify(meta));
}
