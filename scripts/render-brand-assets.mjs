/**
 * Renders the raster brand assets from the same vector source as the app logo.
 *
 * The SVG mark in `components/Logo.jsx` and `app/icon.svg` is the source of
 * truth; this script produces the PNGs that certain consumers insist on:
 *
 *   app/apple-icon.png      iOS home-screen icon (ignores SVG favicons)
 *   app/opengraph-image.png link previews - no scraper renders SVG reliably
 *   public/icon-48.png      fallback favicon for anything without SVG support
 *
 * Run it only when the mark changes:
 *
 *   npm install --no-save sharp && node scripts/render-brand-assets.mjs
 *
 * sharp is deliberately not a dependency: it carries platform binaries and is
 * needed once per logo change, not on every install. Next's own ImageResponse
 * was the obvious alternative, but @vercel/og crashes at prerender on Windows
 * paths containing a space - which this project's path has.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DEFS = `
  <defs>
    <linearGradient id="badge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f1b2d"/><stop offset="100%" stop-color="#0a1220"/>
    </linearGradient>
    <linearGradient id="needle" x1="0.5" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="#67e8f9"/><stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>
  </defs>`;

const MARK = `
  <rect width="32" height="32" rx="8" fill="url(#badge)"/>
  <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="7.25" fill="none" stroke="#22d3ee" stroke-opacity="0.28" stroke-width="1.5"/>
  <path d="M16 5.5 L23.8 25.5 L16 21 Z" fill="url(#needle)"/>
  <path d="M16 5.5 L16 21 L8.2 25.5 Z" fill="#22d3ee" fill-opacity="0.42"/>`;

const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${DEFS}${MARK}</svg>`;

const FONT = "Segoe UI, Helvetica Neue, Arial, sans-serif";
const CHIPS = ["Mock interviews", "Coding rounds", "Resume ATS", "Delivery coaching"];

let chipX = 80;
const chips = CHIPS.map((label) => {
  // Approximate advance width; the chips only need to not collide.
  const width = label.length * 12.2 + 40;
  const markup = `
    <rect x="${chipX}" y="500" width="${width}" height="48" rx="24" fill="#0d1626" stroke="#1e2d45" stroke-width="1"/>
    <text x="${chipX + 20}" y="531" font-family="${FONT}" font-size="21" fill="#93a4bd">${label}</text>`;
  chipX += width + 12;
  return markup;
}).join("");

// A plain space inside <tspan> is collapsed by the SVG text layout rules, so
// the wordmark uses a non-breaking space.
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  ${DEFS}
  <defs>
    <pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse">
      <path d="M64 0 L0 0 0 64" fill="none" stroke="#16233a" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="1200" height="630" fill="#080c14"/>
  <rect width="1200" height="630" fill="url(#grid)"/>

  <g transform="translate(80 64) scale(2.25)">${MARK}</g>

  <text x="176" y="112" font-family="${FONT}" font-size="34" font-weight="700" fill="#e8eef7">CareerPilot<tspan fill="#22d3ee">&#160;AI</tspan></text>

  <text x="80" y="260" font-family="${FONT}" font-size="68" font-weight="700" letter-spacing="-2" fill="#e8eef7">Practice the interview</text>
  <text x="80" y="336" font-family="${FONT}" font-size="68" font-weight="700" letter-spacing="-2" fill="#22d3ee">before it happens</text>

  <text x="80" y="404" font-family="${FONT}" font-size="27" fill="#93a4bd">Role-specific questions. Scored on what you say and how you say it.</text>

  ${chips}
</svg>`;

const outputs = [
  { file: "app/apple-icon.png", svg: markSvg, width: 180, height: 180 },
  { file: "public/icon-48.png", svg: markSvg, width: 48, height: 48 },
  // 1200x630 is the size every scraper documents; sharp would otherwise scale
  // the viewBox by the render density and emit 1600x840.
  { file: "app/opengraph-image.png", svg: ogSvg, width: 1200, height: 630 },
];

for (const { file, svg, width, height } of outputs) {
  // A high render density keeps the gradients and rounded corners smooth when
  // a 32-unit viewBox is blown up to 180px.
  await sharp(Buffer.from(svg), { density: 600 })
    .resize(width, height)
    .png()
    .toFile(path.join(ROOT, file));

  const { size: bytes } = fs.statSync(path.join(ROOT, file));
  console.log(`${file}  ${(bytes / 1024).toFixed(1)}KB`);
}
