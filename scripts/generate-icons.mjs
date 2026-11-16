// Renders the PWA icons into public/icons and app/icon.svg.
// Run with `pnpm icons` after changing the mark or the colours.
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const INK = "#000000";
const PAPER = "#ffffff";
const SIGNAL = "#e40513";

/** Two leaning lanes on black. `scale` shrinks the mark for the maskable safe zone. */
function mark(scale = 1) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${INK}"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <path d="M88 392h96l96-272h-96z" fill="${PAPER}"/>
    <path d="M232 392h96l96-272h-96z" fill="${SIGNAL}"/>
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
