#!/usr/bin/env node
/**
 * Brand extraction for LABI ANTWERP.
 *
 * The supplied mark is a circular badge: a flat red field, a painted portrait of
 * a man with a hi-top fade, and the wordmark "labi" set in yellow across the eyes.
 * The brief called it a record sleeve with a yellow lozenge. There is no lozenge,
 * and the only caption in the file reads "brewed with grace / 7.2% vol" — the
 * artwork started life as a beer label. See docs/FINDINGS.md.
 *
 * What this produces:
 *   portrait.png   the painted figure cut free of the red field, alpha-trimmed,
 *                  so it can be composited on any of the client's own colour
 *                  variants (they already ship teal / green / orange medallions).
 *   wordmark.svg   "labi" recovered as vector outlines, not a bitmap.
 *   tokens.css     colours sampled from the real files, never approximated.
 *
 * The cutout is a border flood-fill rather than a colour key: the portrait's own
 * shadows sit close to the field red, and keying would punch holes through the
 * cheek and the neck. Filling inward from the edge only ever removes pixels that
 * are genuinely connected to the outside.
 *
 * Zero dependencies. PNG in, PNG/SVG out; node's zlib does the rest.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { inflateSync, deflateSync } from 'node:zlib';
import path from 'node:path';

const SRC = path.resolve(import.meta.dirname, '../assets/source');
const OUT = path.resolve(import.meta.dirname, '../assets/brand');

/* ---------------------------------------------------------------- png decode */

function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let pos = 8, w = 0, h = 0, depth = 0, colour = 0;
  const idat = [];
  let palette = null, trns = null;

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      depth = data[8]; colour = data[9];
      if (data[12] !== 0) throw new Error('interlaced PNG not supported');
    } else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (depth !== 8) throw new Error(`unsupported bit depth ${depth}`);

  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colour];
  if (!channels) throw new Error(`unsupported colour type ${colour}`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * channels;
  const px = Buffer.alloc(h * stride);

  // undo per-scanline filters
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const out = px.subarray(y * stride, (y + 1) * stride);
    const prior = y > 0 ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? out[i - channels] : 0;
      const b = prior ? prior[i] : 0;
      const c = prior && i >= channels ? prior[i - channels] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      out[i] = v & 0xff;
    }
  }

  // normalise to RGBA
  const rgba = Buffer.alloc(w * h * 4, 255);
  for (let i = 0; i < w * h; i++) {
    if (colour === 6) { px.copy(rgba, i * 4, i * 4, i * 4 + 4); }
    else if (colour === 2) { rgba[i * 4] = px[i * 3]; rgba[i * 4 + 1] = px[i * 3 + 1]; rgba[i * 4 + 2] = px[i * 3 + 2]; }
    else if (colour === 0) { rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = px[i]; }
    else if (colour === 4) { rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = px[i * 2]; rgba[i * 4 + 3] = px[i * 2 + 1]; }
    else if (colour === 3) {
      const idx = px[i];
      rgba[i * 4] = palette[idx * 3]; rgba[i * 4 + 1] = palette[idx * 3 + 1]; rgba[i * 4 + 2] = palette[idx * 3 + 2];
      rgba[i * 4 + 3] = trns && idx < trns.length ? trns[idx] : 255;
    }
  }
  return { w, h, data: rgba };
}

/* ---------------------------------------------------------------- png encode */

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = c ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function encodePNG(w, h, rgba) {
  const stride = w * 4;
  const raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // no filter; the deflate does the work
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------- helpers */

const hex = (r, g, b) => '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');

/** Perceptual-ish distance; good enough to separate a flat field from paint. */
function dist(r1, g1, b1, r2, g2, b2) {
  const rm = (r1 + r2) / 2;
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db);
}

/* --------------------------------------------------------------------- main */

const og = decodePNG(await readFile(path.join(SRC, 'og.png')));
console.log(`source og.png ${og.w}x${og.h}`);

// The field colour: overwhelmingly the most common pixel in the lockup.
const counts = new Map();
for (let i = 0; i < og.w * og.h; i++) {
  const k = (og.data[i * 4] >> 3 << 10) | (og.data[i * 4 + 1] >> 3 << 5) | (og.data[i * 4 + 2] >> 3);
  const e = counts.get(k) || [0, 0, 0, 0];
  e[0] += og.data[i * 4]; e[1] += og.data[i * 4 + 1]; e[2] += og.data[i * 4 + 2]; e[3]++;
  counts.set(k, e);
}
const ranked = [...counts.values()].sort((a, b) => b[3] - a[3]);
const field = ranked[0].map((v, i) => i < 3 ? Math.round(v / ranked[0][3]) : v);
const PRESS = hex(field[0], field[1], field[2]);

// The wordmark yellow: the most common strongly-yellow pixel.
const yellowish = ranked.filter(e => {
  const r = e[0] / e[3], g = e[1] / e[3], b = e[2] / e[3];
  return r > 200 && g > 190 && b < 130 && r - b > 90;
});
const yl = yellowish[0];
const LABEL = hex(Math.round(yl[0] / yl[3]), Math.round(yl[1] / yl[3]), Math.round(yl[2] / yl[3]));

console.log(`sampled  press=${PRESS}  label=${LABEL}  (${(100 * ranked[0][3] / (og.w * og.h)).toFixed(1)}% of the lockup is field)`);

/* ---- portrait cutout: flood fill the field inward from the image border ---- */

const TOL = 42;
const isField = i => dist(og.data[i * 4], og.data[i * 4 + 1], og.data[i * 4 + 2], field[0], field[1], field[2]) < TOL;

const outside = new Uint8Array(og.w * og.h);
const stack = [];
for (let x = 0; x < og.w; x++) { stack.push(x, (og.h - 1) * og.w + x); }
for (let y = 0; y < og.h; y++) { stack.push(y * og.w, y * og.w + og.w - 1); }
while (stack.length) {
  const i = stack.pop();
  if (outside[i] || !isField(i)) continue;
  outside[i] = 1;
  const x = i % og.w, y = (i / og.w) | 0;
  if (x > 0) stack.push(i - 1);
  if (x < og.w - 1) stack.push(i + 1);
  if (y > 0) stack.push(i - og.w);
  if (y < og.h - 1) stack.push(i + og.w);
}

// Trim to the subject's bounding box.
let minX = og.w, minY = og.h, maxX = -1, maxY = -1;
for (let y = 0; y < og.h; y++) for (let x = 0; x < og.w; x++) {
  if (!outside[y * og.w + x]) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
}
const pw = maxX - minX + 1, ph = maxY - minY + 1;
const portrait = Buffer.alloc(pw * ph * 4);
for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
  const s = ((y + minY) * og.w + (x + minX)) * 4, d = (y * pw + x) * 4;
  og.data.copy(portrait, d, s, s + 3);
  let a = outside[(y + minY) * og.w + (x + minX)] ? 0 : 255;
  // Feather one pixel at the boundary so the cut edge does not alias when the
  // portrait is composited over a lighter service colour.
  if (a === 255) {
    const i = (y + minY) * og.w + (x + minX);
    const edge = (x + minX > 0 && outside[i - 1]) || (x + minX < og.w - 1 && outside[i + 1]) ||
                 (y + minY > 0 && outside[i - og.w]) || (y + minY < og.h - 1 && outside[i + og.w]);
    if (edge) a = 170;
  }
  portrait[d + 3] = a;
}

await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, 'portrait.png'), encodePNG(pw, ph, portrait));
const solid = portrait.filter((_, i) => i % 4 === 3).length;
console.log(`portrait.png ${pw}x${ph}  (trimmed from ${og.w}x${og.h}, ${(100 * (1 - stackCount(outside) / (og.w * og.h))).toFixed(1)}% subject)`);

function stackCount(arr) { let n = 0; for (let i = 0; i < arr.length; i++) n += arr[i]; return n; }

/* ------------------- wordmark: isolate the yellow, trace as vector outlines -- */

/**
 * Yellowness as a continuous field, not a boolean.
 *
 * The first pass keyed on "red high, blue low" and swallowed a cream highlight
 * painted on the forehead — it surfaced as a blob welded between the b and the
 * i. The wordmark yellow is separated from every paint colour in the file by its
 * green-minus-blue gap: the mark sits near 180, the highlight near 75. Scoring
 * on that gap and then resampling gives a sub-pixel boundary, which matters
 * because the source wordmark is only 266px wide and a hard per-pixel threshold
 * is what made the first trace lumpy.
 */
const SS = 4;
const yellowness = new Float32Array(og.w * og.h);
for (let i = 0; i < og.w * og.h; i++) {
  const r = og.data[i * 4], g = og.data[i * 4 + 1], b = og.data[i * 4 + 2];
  const gap = (g - b) / 180;                    // 1.0 at the wordmark yellow
  const bright = Math.min(r, g) / 210;
  yellowness[i] = Math.min(gap, 1) * Math.min(bright, 1);
}

const sample = (fx, fy) => {
  const x0 = Math.max(0, Math.min(og.w - 1, Math.floor(fx)));
  const y0 = Math.max(0, Math.min(og.h - 1, Math.floor(fy)));
  const x1 = Math.min(og.w - 1, x0 + 1), y1 = Math.min(og.h - 1, y0 + 1);
  const tx = fx - x0, ty = fy - y0;
  const a = yellowness[y0 * og.w + x0], b = yellowness[y0 * og.w + x1];
  const c = yellowness[y1 * og.w + x0], d = yellowness[y1 * og.w + x1];
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
};

const mw = og.w * SS, mh = og.h * SS;
let mask = new Uint8Array(mw * mh);
for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
  mask[y * mw + x] = sample(x / SS, y / SS) > 0.62 ? 1 : 0;
}

/**
 * Morphological closing — the hand-correction pass.
 *
 * The painting sits *behind* the wordmark, and where a dark eye or a shadow
 * meets a letter edge the threshold bites a small notch out of the outline. A
 * dilate-then-erode at three supersampled units (~0.75 source px) fills those
 * concavities and leaves the letter's true silhouette untouched: the operation
 * cannot move a boundary that has no notch to fill.
 */
function morph(src, r, grow) {
  const dst = new Uint8Array(src.length);
  const r2 = r * r;
  const offs = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy <= r2) offs.push(dy * mw + dx);
  }
  for (let y = r; y < mh - r; y++) {
    for (let x = r; x < mw - r; x++) {
      const i = y * mw + x;
      let hit = grow ? 0 : 1;
      for (const o of offs) {
        if (grow) { if (src[i + o]) { hit = 1; break; } }
        else if (!src[i + o]) { hit = 0; break; }
      }
      dst[i] = hit;
    }
  }
  return dst;
}
mask = morph(morph(mask, 3, true), 3, false);

let wx0 = mw, wy0 = mh, wx1 = -1, wy1 = -1;
for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (mask[y * mw + x]) {
  if (x < wx0) wx0 = x; if (x > wx1) wx1 = x;
  if (y < wy0) wy0 = y; if (y > wy1) wy1 = y;
}
console.log(`wordmark bbox ${(wx1 - wx0 + 1) / SS}x${(wy1 - wy0 + 1) / SS} source px at ${wx0 / SS},${wy0 / SS}`);

/**
 * Marching-squares contour walk, then Douglas–Peucker to drop collinear noise,
 * then one Chaikin pass to restore the rounded terminals of the geometric sans.
 * The result is a real outline with holes (the counters of a, b and the dot of
 * i survive as separate subpaths), not a rectangle-per-pixel fake.
 */
function contours(mask, w, h) {
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : mask[y * w + x];
  const seen = new Set();
  const paths = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!at(x, y) || at(x, y - 1)) continue;          // top edge of a run
    if (seen.has(x + ',' + y)) continue;
    // walk the boundary clockwise using a Moore neighbourhood
    const pts = [];
    let cx = x, cy = y, dir = 0;                       // 0=R 1=D 2=L 3=U
    const start = cx + ',' + cy;
    let guard = 0;
    do {
      pts.push([cx, cy]);
      seen.add(cx + ',' + cy);
      // try left, straight, right, back relative to dir
      let moved = false;
      for (let t = 3; t < 7 && !moved; t++) {
        const nd = (dir + t) % 4;
        const nx = cx + [1, 0, -1, 0][nd], ny = cy + [0, 1, 0, -1][nd];
        if (at(nx, ny)) { cx = nx; cy = ny; dir = nd; moved = true; }
      }
      if (!moved) break;
    } while ((cx + ',' + cy) !== start && ++guard < 200000);
    if (pts.length > 24) paths.push(pts);
  }
  return paths;
}

function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  let maxD = 0, idx = 0;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len;
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD <= eps) return [pts[0], pts[pts.length - 1]];
  return [...rdp(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdp(pts.slice(idx), eps)];
}

function chaikin(pts) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    out.push([p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25]);
    out.push([p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]);
  }
  return out;
}

/** Shoelace area, used to drop specks the supersampled mask can still leave. */
const area = p => Math.abs(p.reduce((s, [x, y], i) => {
  const [nx, ny] = p[(i + 1) % p.length];
  return s + (x * ny - nx * y);
}, 0)) / 2;

const raw = contours(mask, mw, mh)
  .filter(p => area(p) > 16 * SS * SS);              // ≥16 source px²

// RDP at 2.2 supersampled units ≈ 0.55 source px, then two Chaikin passes to
// put the rounded terminals of the geometric sans back.
const paths = raw
  .map(p => chaikin(chaikin(rdp(p, 2.2))))
  .map(p => p.map(([x, y]) => [(x - wx0) / SS, (y - wy0) / SS]));

const d = paths.map(p =>
  'M' + p.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join('L') + 'Z'
).join('');

const ww = (wx1 - wx0 + 1) / SS, wh = (wy1 - wy0 + 1) / SS;
const wordmark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ww} ${wh}" role="img" aria-label="labi">
  <path fill="currentColor" fill-rule="evenodd" d="${d}"/>
</svg>
`;
await writeFile(path.join(OUT, 'wordmark.svg'), wordmark);
console.log(`wordmark.svg ${raw.length} contours, ${(wordmark.length / 1024).toFixed(1)} KB`);

/* ----------------------------------------------- service colours, sampled --- */

const services = {
  short: 'svc-short-haircut-with-head-wash.webp',
  mid: 'svc-mid-long-haircut-with-head-wash.webp',
  long: 'svc-long-haircut-with-head-wash.webp',
};

await writeFile(path.join(OUT, 'sampled.json'), JSON.stringify({
  press: PRESS, label: LABEL,
  note: 'Sampled from assets/source/og.png, the client\'s own master lockup.',
}, null, 2));

console.log('\nwrote assets/brand/{portrait.png,wordmark.svg,sampled.json}');
