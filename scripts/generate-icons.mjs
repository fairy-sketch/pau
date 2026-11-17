// Renders the PWA icons into public/icons and app/icon.svg.
// Run with `pnpm icons` after changing the mark or the colours.
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const INK = "#1c1916";
const PAPER = "#ffffff";

/**
 * "Just the cut" (decision L-5): a white block with the logo's cut through it, on warm black.
 * Same geometry as MARK in src/ui/logo.tsx (on a 100 grid). `scale` shrinks it for the maskable safe zone.
 */
function mark(scale = 1) {
  const u = 5.12; // 100 grid -> 512 px
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs><mask id="cut"><rect width="512" height="512" fill="#fff"/><rect x="0" y="${50.35 * u}" width="512" height="${4.3 * u}" fill="#000"/></mask></defs>
  <rect width="512" height="512" fill="${INK}"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <rect x="${24 * u}" y="${24 * u}" width="${52 * u}" height="${52 * u}" rx="${4 * u}" fill="${PAPER}" mask="url(#cut)"/>
  </g>
</svg>`;
}

const outputs = [
  { file: "public/icons/icon-192.png", size: 192, scale: 1 },
  { file: "public/icons/icon-512.png", size: 512, scale: 1 },
  { file: "public/icons/icon-maskable-512.png", size: 512, scale: 0.72 },
  { file: "public/icons/apple-touch-icon.png", size: 180, scale: 0.9 },
];

await mkdir("public/icons", { recursive: true });
for (const { file, size, scale } of outputs) {
  await sharp(Buffer.from(mark(scale)))
    .resize(size, size)
    .png()
    .toFile(file);
  console.log(`wrote ${file}`);
}
await writeFile("app/icon.svg", mark(1));
console.log("wrote app/icon.svg");
