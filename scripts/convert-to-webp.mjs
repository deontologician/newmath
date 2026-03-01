#!/usr/bin/env node
import sharp from "sharp";
import { readdir, rm, stat } from "fs/promises";
import { join } from "path";

const DIRS = ["public/symbols", "public/operators"];
const QUALITY = 80;
const CONCURRENCY = 20;

async function convertDir(dir) {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".png"));
  let done = 0;
  let totalSaved = 0;

  const work = files.map((file) => async () => {
    const src = join(dir, file);
    const dst = join(dir, file.replace(/\.png$/, ".webp"));
    const before = (await stat(src)).size;
    await sharp(src).webp({ quality: QUALITY }).toFile(dst);
    const after = (await stat(dst)).size;
    totalSaved += before - after;
    done++;
    if (done % 100 === 0 || done === files.length) {
      console.log(`  [${dir}] ${done}/${files.length}`);
    }
  });

  // Process with bounded concurrency
  const pool = [];
  for (const fn of work) {
    const p = fn().then(() => pool.splice(pool.indexOf(p), 1));
    pool.push(p);
    if (pool.length >= CONCURRENCY) await Promise.race(pool);
  }
  await Promise.all(pool);

  return { count: files.length, saved: totalSaved };
}

async function removeOriginals(dir) {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".png"));
  for (const f of files) await rm(join(dir, f));
  return files.length;
}

console.log("Converting PNGs to WebP …\n");

let grandSaved = 0;
for (const dir of DIRS) {
  const { count, saved } = await convertDir(dir);
  grandSaved += saved;
  console.log(
    `  [${dir}] ${count} files, saved ${(saved / 1e6).toFixed(1)} MB\n`
  );
}

console.log(`Total saved: ${(grandSaved / 1e6).toFixed(0)} MB`);
console.log("Removing original PNGs …");

for (const dir of DIRS) {
  const n = await removeOriginals(dir);
  console.log(`  [${dir}] removed ${n} PNGs`);
}

console.log("\nDone.");
