// Generates a properly padded Android adaptive icon: artwork centered in the
// safe zone (inner ~60%) on a 1024x1024 transparent canvas.
const Jimp = require('jimp');

async function main() {
  const img = await Jimp.read('./assets/images/icon.png');
  const size = 1024;
  const padding = Math.floor(size * 0.2); // 20% padding on all sides
  const inner = size - padding * 2;
  img.resize(inner, inner);
  const canvas = new Jimp(size, size, 0x00000000); // transparent
  canvas.composite(img, padding, padding);
  await canvas.writeAsync('./assets/adaptive-icon.png');
  console.log('Created assets/adaptive-icon.png (1024x1024, centered with 20% padding)');
}

main().catch((e) => {
  console.error('pad-icon failed:', e);
  process.exit(1);
});
