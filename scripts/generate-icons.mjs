// Renders the PWA icons into public/icons and app/icon.svg.
// Run with `pnpm icons` after changing the mark or the colours.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const INK = "#1c1916";
const PAPER = "#ffffff";

/**
 * The app icon for now (decision L-10): the PATH wordmark, white on warm black, 64 % of the width.
 * The outlines come from src/ui/logo-path.ts, so no font is needed. `scale` shrinks it for the maskable safe zone.
 */
const src = await readFile("src/ui/logo-path.ts", "utf8");
const LOGO_PATH = src.match(/LOGO_PATH =\s*"([^"]+)"/)[1];
const [vx, vy, vw, vh] = src
  .match(/LOGO_VIEWBOX = "([^"]+)"/)[1]
  .split(" ")
  .map(Number);
function mark(scale = 1) {
  const s = (512 * 0.64) / vw;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${INK}"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <g transform="translate(${512 * 0.18} ${(512 - vh * s) / 2}) scale(${s}) translate(${-vx} ${-vy})"><path d="${LOGO_PATH}" fill="${PAPER}"/></g>
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
