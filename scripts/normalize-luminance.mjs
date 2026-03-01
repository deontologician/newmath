/**
 * Normalize faint glyph images by boosting their luminance.
 *
 * 1. Measure mean alpha (our luminance proxy) for every image.
 * 2. Find the 25th-percentile value.
 * 3. For each image below that threshold, apply a gamma correction
 *    to the alpha channel so its mean alpha reaches the threshold.
 *    Gamma < 1 brightens; binary search finds the right value.
 *
 * Usage: node scripts/normalize-luminance.mjs
 */

import sharp from "sharp";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const dirs = ["public/symbols", "public/operators"];

/** Measure mean alpha across all pixels. */
async function meanAlpha(filePath) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = info.width * info.height;
  let sum = 0;
  for (let i = 0; i < pixels; i++) {
    sum += data[i * 4 + 3];
  }
  return sum / pixels / 255; // normalize to 0–1
}

/** Compute mean alpha if gamma is applied to the alpha channel. */
function simulateGamma(alphaValues, gamma) {
  let sum = 0;
  for (let i = 0; i < alphaValues.length; i++) {
    sum += Math.pow(alphaValues[i], gamma);
  }
  return sum / alphaValues.length;
}

/** Find gamma that brings mean alpha to target via binary search. */
function findGamma(alphaValues, target) {
  let lo = 0.01;
  let hi = 1.0;
  for (let iter = 0; iter < 50; iter++) {
    const mid = (lo + hi) / 2;
    const result = simulateGamma(alphaValues, mid);
    if (result < target) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return (lo + hi) / 2;
}

/** Apply gamma to alpha channel and rewrite the file. */
async function applyGamma(filePath, gamma) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = info.width * info.height;
  const out = Buffer.alloc(pixels * 4);

  for (let i = 0; i < pixels; i++) {
    const off = i * 4;
    out[off] = data[off];
    out[off + 1] = data[off + 1];
    out[off + 2] = data[off + 2];
    out[off + 3] = Math.round(255 * Math.pow(data[off + 3] / 255, gamma));
  }

  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .webp({ quality: 90 })
    .toFile(filePath);
}

// --- Main ---

// Collect all file paths
const files = [];
for (const dir of dirs) {
  const names = (await readdir(dir)).filter((f) => f.endsWith(".webp"));
  for (const name of names) {
    files.push(join(dir, name));
  }
}

console.log(`Measuring luminance for ${files.length} images...`);

// Phase 1: measure mean alpha for every image
const measurements = [];
const batch = 50;
for (let i = 0; i < files.length; i += batch) {
  const slice = files.slice(i, i + batch);
  const results = await Promise.all(
    slice.map(async (f) => ({ file: f, mean: await meanAlpha(f) })),
  );
  measurements.push(...results);
  if (measurements.length % 200 < batch) {
    console.log(`  measured ${measurements.length}/${files.length}`);
  }
}

// Sort by mean alpha to find percentile
const sorted = measurements.map((m) => m.mean).sort((a, b) => a - b);
const p25Index = Math.floor(sorted.length * 0.25);
const threshold = sorted[p25Index];

const below = measurements.filter((m) => m.mean < threshold);

console.log(`\nStatistics:`);
console.log(`  min:  ${sorted[0].toFixed(4)}`);
console.log(`  p25:  ${threshold.toFixed(4)}`);
console.log(`  p50:  ${sorted[Math.floor(sorted.length * 0.5)].toFixed(4)}`);
console.log(`  p75:  ${sorted[Math.floor(sorted.length * 0.75)].toFixed(4)}`);
console.log(`  max:  ${sorted[sorted.length - 1].toFixed(4)}`);
console.log(`\nImages below p25: ${below.length}`);

if (below.length === 0) {
  console.log("Nothing to adjust.");
  process.exit(0);
}

// Phase 2: for each image below threshold, find gamma and apply
console.log(`\nAdjusting ${below.length} images to reach mean alpha ${threshold.toFixed(4)}...`);

let done = 0;
for (let i = 0; i < below.length; i += batch) {
  const slice = below.slice(i, i + batch);
  await Promise.all(
    slice.map(async ({ file, mean }) => {
      // Read alpha values normalized to 0–1
      const { data, info } = await sharp(file)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const pixels = info.width * info.height;
      const alphas = new Float64Array(pixels);
      for (let j = 0; j < pixels; j++) {
        alphas[j] = data[j * 4 + 3] / 255;
      }

      const gamma = findGamma(alphas, threshold);
      await applyGamma(file, gamma);
      done++;
      if (done % 50 === 0) console.log(`  adjusted ${done}/${below.length} (gamma=${gamma.toFixed(3)} for last)`);
    }),
  );
}

console.log(`Done. Adjusted ${done} images.`);
