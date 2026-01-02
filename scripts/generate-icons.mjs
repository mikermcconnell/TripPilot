import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = join(__dirname, '..');
const iconsDir = join(projectRoot, 'public', 'icons');
const svgPath = join(iconsDir, 'logo.svg');

// Ensure icons directory exists
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

// Read SVG
const svgBuffer = readFileSync(svgPath);

// Icon sizes to generate
const sizes = [
  { name: 'favicon-16.png', size: 16 },
  { name: 'favicon-32.png', size: 32 },
  { name: 'favicon-48.png', size: 48 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
];

async function generateIcons() {
  console.log('Generating icons from SVG...\n');

  for (const { name, size } of sizes) {
    const outputPath = join(iconsDir, name);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`  Created: ${name} (${size}x${size})`);
  }

  // Generate favicon.ico (multi-size ICO file)
  // Sharp doesn't support ICO directly, so we'll create individual PNGs
  // and note that the favicon will need to be one of the PNG files

  console.log('\nAll icons generated successfully!');
  console.log('\nNote: For the favicon, use favicon-32.png or add a link in index.html');
}

generateIcons().catch(console.error);
