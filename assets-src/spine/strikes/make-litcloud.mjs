// Writes the loaded picture of the lit cloud from the generated one: the same pixels, stored as a JPEG of quality 88.
// Run from the repository's root: node assets-src/spine/strikes/make-litcloud.mjs
import sharp from 'sharp';

await sharp('assets-src/spine/strikes/litcloud-1.jpg')
  .jpeg({ quality: 88, chromaSubsampling: '4:4:4' })
  .toFile('public/assets/spine/mat/litcloud.jpg');
