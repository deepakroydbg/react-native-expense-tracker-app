// Generates square icons from the source logo without distortion:
//  - assets/images/app-icon.png   1024x1024 (app launcher icon, cream bg)
//  - assets/play-store-icon.png    512x512  (Play Store listing icon, cream bg)
//  - assets/adaptive-icon.png     1024x1024 (Android adaptive foreground, logo in 60% safe zone, transparent bg)
const Jimp = require('jimp');

const SRC = './assets/images/icon.png';
const CREAM = 0xf5f0e8ff;

async function squareCream(src, size) {
  const fitted = src.clone().scaleToFit(size, size);
  const canvas = new Jimp(size, size, CREAM);
  canvas.composite(
    fitted,
    Math.floor((size - fitted.bitmap.width) / 2),
    Math.floor((size - fitted.bitmap.height) / 2)
  );
  return canvas;
}

async function adaptiveForeground(src, size) {
  const inner = Math.floor(size * 0.6); // keep logo inside the adaptive safe zone
  const fitted = src.clone().scaleToFit(inner, inner);
  const canvas = new Jimp(size, size, 0x00000000); // transparent
  canvas.composite(
    fitted,
    Math.floor((size - fitted.bitmap.width) / 2),
    Math.floor((size - fitted.bitmap.height) / 2)
  );
  return canvas;
}

async function main() {
  const src = await Jimp.read(SRC);
  console.log(`source: ${src.bitmap.width}x${src.bitmap.height}`);
  await (await squareCream(src, 1024)).writeAsync('./assets/images/app-icon.png');
  await (await squareCream(src, 512)).writeAsync('./assets/play-store-icon.png');
  await (await adaptiveForeground(src, 1024)).writeAsync('./assets/adaptive-icon.png');
  console.log('Wrote assets/images/app-icon.png (1024), assets/play-store-icon.png (512), assets/adaptive-icon.png (1024)');
}

main().catch((e) => {
  console.error('make-icons failed:', e);
  process.exit(1);
});
