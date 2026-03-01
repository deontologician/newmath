/**
 * Convert black-background webp images to transparent-background.
 * Luminance (brightness) of each pixel becomes its alpha value.
 * White pixels stay fully opaque; black pixels become fully transparent.
 *
 * Usage: node scripts/black-to-alpha.mjs
 */

import sharp from "sharp";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const dirs = ["public/symbols", "public/operators"];

async function processFile(filePath) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = info.width * info.height;
  const out = Buffer.alloc(pixels * 4);

  for (let i = 0; i < pixels; i++) {
    const off = i * 4;
    const r = data[off];
    const g = data[off + 1];
    const b = data[off + 2];
    // Luminance as alpha (ITU-R BT.601)
    const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    // Keep original RGB, set alpha to luminance
    out[off] = r;
    out[off + 1] = g;
    out[off + 2] = b;
    out[off + 3] = lum;
  }

  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .webp({ quality: 90 })
    .toFile(filePath);
}

let total = 0;
let done = 0;

for (const dir of dirs) {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".webp"));
  total += files.length;
}

console.log(`Processing ${total} images...`);

for (const dir of dirs) {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".webp"));
  const batch = 50;
  for (let i = 0; i < files.length; i += batch) {
    const slice = files.slice(i, i + batch);
    await Promise.all(
      slice.map(async (f) => {
        await processFile(join(dir, f));
        done++;
        if (done % 100 === 0) console.log(`  ${done}/${total}`);
      }),
    );
  }
}

console.log(`Done. Processed ${done} images.`);
