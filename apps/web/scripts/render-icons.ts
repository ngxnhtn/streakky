/**
 * Renders the web app's icons into public/ from the Streakky mark (the open ring in the design
 * playground's header), in the teal palette's dark colours: a ground-coloured ring on ink.
 *
 *   vpx scripts/render-icons.ts      (from apps/web; set CHROME to use another Chrome binary)
 *
 * PNGs are screenshots of the SVGs taken by headless Chrome, so nothing needs installing.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ink = "#06525c";
const ground = "#f7f9f8";
const chrome = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const publicDir = join(import.meta.dirname, "../public");

/**
 * The mark on a 512 square: the playground's 24-unit ring scaled 12 times, so it spans about half
 * the icon and stays inside a maskable icon's safe zone. It sits 8 below centre because the ring
 * is open at the bottom. `corner` rounds the square.
 */
const icon = (corner: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${corner}" fill="${ink}"/>
  <g transform="translate(256 264) scale(12) translate(-12 -12)">
    <path d="M5.64 18.36A9 9 0 1 1 18.36 18.36" fill="none" stroke="${ground}" stroke-width="3" stroke-linecap="round"/>
  </g>
</svg>
`;

const rounded = icon(112);
const fullBleed = icon(0);
const renders = [
  { file: "icon-192.png", svg: rounded, size: 192 },
  { file: "icon-512.png", svg: rounded, size: 512 },
  // launchers cut maskable icons to their own shape, and iOS rounds touch icons itself
  { file: "icon-maskable-512.png", svg: fullBleed, size: 512 },
  { file: "apple-touch-icon.png", svg: fullBleed, size: 180 },
];

const scratch = mkdtempSync(join(tmpdir(), "streakky-icons-"));
try {
  writeFileSync(join(publicDir, "favicon.svg"), rounded);
  for (const { file, svg, size } of renders) {
    // a page at the icon's pixel size, since Chrome won't make a window narrower than about 500
    const source = join(scratch, `${file}.html`);
    const sized = svg.replace("<svg ", `<svg width="${size}" height="${size}" `);
    writeFileSync(source, `<body style="margin:0;background:transparent">${sized}</body>`);
    execFileSync(chrome, [
      "--headless=new",
      `--user-data-dir=${join(scratch, "profile")}`,
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--default-background-color=00000000",
      `--window-size=${size},${size}`,
      `--screenshot=${join(publicDir, file)}`,
      pathToFileURL(source).href,
    ]);
    console.log(`public/${file}`);
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
