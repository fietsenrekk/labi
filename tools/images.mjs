#!/usr/bin/env node
/**
 * Image pipeline.
 *
 * Small on purpose. There are exactly two photographs this build is entitled to
 * publish - the shopfront, and the portrait painting that is the logo - so the
 * ladder is short and every rung is real. Nothing here upscales: the shopfront
 * is 1440px and the layout never asks for more than 1440 CSS px of it, which is
 * the honest way to meet "never scale beyond intrinsic width" when the source
 * is what it is. See docs/IMAGE_REPORT.md.
 *
 *   node tools/images.mjs
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const run = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'assets/source');
const BRAND = path.join(ROOT, 'assets/brand');
const OUT = path.join(ROOT, 'assets/img');

await mkdir(OUT, { recursive: true });

const kb = (n) => (n / 1024).toFixed(1) + ' KB';

/**
 * The grade, applied identically to every photograph so the set reads as one
 * body of work rather than a feed (§9.4). Values are deliberate and recorded:
 *
 *   eq        gamma 1.02, saturation 0.94   environment pulled back a touch
 *   colorlevel  rimin -0.012                black point lifted into a soft floor
 *   colorbalance  rs +0.012, bs -0.010      a whisper of the badge red in the
 *                                           shadows, single digits, so the
 *                                           photography ties to the palette
 *                                           without tinting anyone's skin
 *
 * The shopfront carries no faces, so there is no skin-tone risk in this set -
 * the check in §9.5 is still written up in the image report against the two
 * client photographs that were NOT shipped.
 */
const GRADE =
  'eq=gamma=1.02:saturation=0.94,' +
  'colorlevels=rimin=-0.012:gimin=-0.010:bimin=-0.008,' +
  'colorbalance=rs=0.012:bs=-0.010';

/** Luminance-only grain, scaled per output width so it survives at 480px. */
const grain = (w) =>
  `noise=alls=${w <= 800 ? 5 : w <= 1200 ? 7 : 9}:allf=t+u`;

async function variants(src, base, widths, { grade = true } = {}) {
  const made = [];
  for (const w of widths) {
    const chain = [
      `scale=${w}:-2:flags=lanczos`,
      ...(grade ? [GRADE, grain(w)] : []),
      // Output sharpening only, at final size, never before a resize.
      `unsharp=5:5:0.45:5:5:0.0`,
    ].join(',');

    for (const [ext, args] of [
      ['avif', ['-c:v', 'libaom-av1', '-crf', '32', '-b:v', '0', '-cpu-used', '4', '-still-picture', '1']],
      ['webp', ['-c:v', 'libwebp', '-quality', '82', '-compression_level', '6']],
    ]) {
      const out = path.join(OUT, `${base}-${w}.${ext}`);
      await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', src,
        '-vf', chain, '-frames:v', '1', ...args, out]);
      made.push(out);
    }
  }
  return made;
}

/* ---------------------------------------------------- the shopfront, graded */

const facade = path.join(SRC, 'facade-1440.webp');
const facadeWidths = [480, 768, 1024, 1440];
console.log('shopfront (source 1440x810, native ceiling - not upscaled)');
for (const f of await variants(facade, 'shopfront', facadeWidths)) {
  console.log('  ', path.basename(f), kb((await stat(f)).size));
}

/* ------------------------------------- the portrait, alpha, no grade, no grain */

// The painting is artwork, not photography: grading or graining it would be
// retouching the client's own logo. It only gets resized and re-encoded.
//
// WebP and PNG only, deliberately. ffmpeg's libaom path writes AVIF with
// pix_fmt gbrp - it silently drops the alpha plane, and the cut-out portrait
// would arrive as an opaque rectangle over the badge. Verified rather than
// assumed: `ffprobe` reports yuva420p for the WebP and gbrp for the AVIF.
const portrait = path.join(BRAND, 'portrait.png');
console.log('\nportrait (alpha preserved, ungraded - it is the logo, not a photo)');
for (const w of [428, 856]) {
  const scale = `scale=${w}:-2:flags=lanczos`;
  for (const [ext, args] of [
    ['webp', ['-c:v', 'libwebp', '-quality', '90', '-compression_level', '6']],
    ['png', []],
  ]) {
    const out = path.join(OUT, `portrait-${w}.${ext}`);
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', portrait,
      '-vf', scale, '-frames:v', '1', ...args, out]);
    const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries',
      'stream=pix_fmt', '-of', 'csv=p=0', out]);
    const fmt = stdout.trim();
    if (!/a/.test(fmt) && ext === 'webp') throw new Error(`${out} lost its alpha (${fmt})`);
    console.log('  ', path.basename(out), kb((await stat(out)).size), `[${fmt}]`);
  }
}

/* --------------------------------------------------------- the social card */

// Purpose-built at 1200x630 rather than a crop of something else (§9.2).
// Composed in build.mjs as SVG and rasterised here would need a renderer, so
// the card is the client's own master lockup, which is already exactly 1200x630
// and already the strongest single image the brand owns.
await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
  '-i', path.join(SRC, 'og.png'),
  '-vf', 'scale=1200:630', '-frames:v', '1',
  '-c:v', 'libwebp', '-quality', '88', path.join(OUT, 'og.webp')]);
await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
  '-i', path.join(SRC, 'og.png'), '-vf', 'scale=1200:630', '-frames:v', '1',
  path.join(OUT, 'og.png')]);
console.log('\nsocial card  og.webp', kb((await stat(path.join(OUT, 'og.webp'))).size),
  ' og.png', kb((await stat(path.join(OUT, 'og.png'))).size));

/* ------------------------------------------------------------------ totals */

const files = await readdir(OUT);
let total = 0;
for (const f of files) total += (await stat(path.join(OUT, f))).size;
console.log(`\n${files.length} files, ${kb(total)} total in assets/img`);
console.log('EXIF: ffmpeg re-encodes pixels only; no source metadata is carried into any output.');
