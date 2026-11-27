// The sky panorama's windows: cuts the master (1672 x 941, 120 degrees wide, the horizon 107 px over its foot) into six windows of 45 x 25.3 degrees,
// each enlarged to 1672 x 941 as the image tool's input.   node assets-src/spine/sky/windows.cjs
const sharp = require('sharp');
const G = require('./geometry.cjs');
(async () => {
  for (const w of G.windows) {
    const left = Math.round((w.az - G.AZ0) * G.MASTER_PPD);
    const top = Math.round(G.MASTER_H - G.HORIZON_UP - (w.el + G.WIN_EL) * G.MASTER_PPD);
    const width = Math.round(G.WIN_AZ * G.MASTER_PPD);
    const height = Math.round(G.WIN_EL * G.MASTER_PPD);
    await sharp('assets-src/spine/sky/pano-master.png').extract({ left, top, width, height }).resize(1672, 941, { kernel: 'cubic' }).png().toFile(`out/work/gen/win-${w.name}-in.png`);
    console.log(w.name, left, top, width, height);
  }
})();
