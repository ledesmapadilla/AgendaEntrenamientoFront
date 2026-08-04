import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const svgPath = path.resolve(publicDir, "favicon.svg");

async function generate() {
  const svgBuffer = fs.readFileSync(svgPath);

  // 1. apple-touch-icon.png (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.resolve(publicDir, "apple-touch-icon.png"));
  console.log("apple-touch-icon.png (180x180) generado");

  // 2. icon-192.png (192x192)
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.resolve(publicDir, "icon-192.png"));
  console.log("icon-192.png (192x192) generado");

  // 3. icon-512.png (512x512)
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.resolve(publicDir, "icon-512.png"));
  console.log("icon-512.png (512x512) generado");
}

generate().catch(console.error);
