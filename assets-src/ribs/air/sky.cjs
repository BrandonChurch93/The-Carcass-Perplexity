// Makes public/assets/ribs/air/sky.jpg from the generated sky picture: no change to the picture, JPEG only.
// node assets-src/ribs/air/sky.cjs
const sharp = require('sharp');
sharp('assets-src/ribs/air/src/sky2-1.png')
  .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
  .toFile('public/assets/ribs/air/sky.jpg')
  .then((i) => console.log('public/assets/ribs/air/sky.jpg', i.width, i.height, i.size));
