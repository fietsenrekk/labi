#!/usr/bin/env node
/**
 * Headless-Chrome screenshots at the breakpoints the brief validates against.
 *
 *   node tools/shot.mjs                     # home at all widths
 *   node tools/shot.mjs /team 390 1440      # one route, chosen widths
 *
 * Writes to .shots/ (gitignored). Chrome's own --screenshot only captures the
 * viewport, so full-page shots go through the DevTools protocol instead.
 */
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const run = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, '.shots');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ORIGIN = process.env.SHOT_ORIGIN ?? 'http://localhost:4217';

const args = process.argv.slice(2);
const route = args.find((a) => a.startsWith('/')) ?? '/';
const widths = args.filter((a) => /^\d+$/.test(a)).map(Number);
const WIDTHS = widths.length ? widths : [390, 768, 1440, 2560];
const full = !args.includes('--viewport');

await mkdir(OUT, { recursive: true });

const port = 9222 + Math.floor(Math.random() * 400);
const profile = path.join(os.tmpdir(), `labi-chrome-${port}`);
await rm(profile, { recursive: true, force: true });

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--no-first-run',
  '--disable-extensions',
  '--disable-gpu',
  'about:blank',
], { stdio: 'ignore' });

/** Waits for the DevTools endpoint rather than sleeping a fixed interval. */
async function endpoint() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) return (await r.json()).webSocketDebuggerUrl;
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('Chrome DevTools did not come up');
}

const wsUrl = await endpoint();

/** Minimal CDP client — one socket, sequential commands. */
function connect(url) {
  return new Promise((resolve, reject) => {
    import('node:http').then(() => {
      const ws = new WebSocket(url);
      const pending = new Map();
      let id = 0;
      ws.addEventListener('open', () =>
        resolve({
          send(method, params = {}, sessionId) {
            return new Promise((res, rej) => {
              const msgId = ++id;
              pending.set(msgId, { res, rej });
              ws.send(JSON.stringify({ id: msgId, method, params, sessionId }));
            });
          },
          close: () => ws.close(),
        }),
      );
      ws.addEventListener('error', reject);
      ws.addEventListener('message', (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.id && pending.has(msg.id)) {
          const { res, rej } = pending.get(msg.id);
          pending.delete(msg.id);
          msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
        }
      });
    });
  });
}

const cdp = await connect(wsUrl);
const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
const send = (m, p) => cdp.send(m, p, sessionId);

await send('Page.enable');
await send('Runtime.enable');

/*
 * `--reduced` emulates prefers-reduced-motion: reduce.
 *
 * It does double duty. It is the §13 check-8 pass, and it is also the only
 * honest way to review the whole page in one image: scroll-triggered sections
 * have not fired in a full-page capture, so without it every section below the
 * fold photographs as an empty band.
 */
const REDUCED = args.includes('--reduced');
if (REDUCED) {
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
}

const results = [];
for (const width of WIDTHS) {
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height: Math.round(width * 0.72),
    deviceScaleFactor: 1,
    mobile: width < 700,
  });
  await send('Page.navigate', { url: ORIGIN + route });

  // Wait for the network to settle and fonts to load, rather than guessing.
  await new Promise((r) => setTimeout(r, 900));
  await send('Runtime.evaluate', { expression: 'document.fonts.ready', awaitPromise: true });
  await new Promise((r) => setTimeout(r, 700));

  const { result } = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      h: document.documentElement.scrollHeight,
      w: document.documentElement.scrollWidth,
      overflow: document.documentElement.scrollWidth > window.innerWidth
    })`,
    returnByValue: true,
  });
  const info = JSON.parse(result.value);

  /*
   * Walk the page before capturing.
   *
   * captureBeyondViewport paints the whole document but never scrolls it, so
   * `loading="lazy"` images below the fold are still unfetched and photograph
   * as blank space - which looks exactly like a broken layout and is not one.
   * Scrolling through, waiting for every image to decode, then returning to the
   * top gives a capture of the page a visitor actually sees.
   */
  await send('Runtime.evaluate', {
    awaitPromise: true,
    expression: `(async () => {
      // Flip lazy images to eager rather than scrolling them into view.
      // Scrolling does not work here: Lenis intercepts programmatic scroll, so
      // window.scrollTo never moves the viewport, the images below the fold
      // never start loading, and awaiting decode() on them hangs forever.
      for (const img of document.querySelectorAll('img[loading="lazy"]')) {
        img.loading = 'eager';
      }
      const withTimeout = (p, ms) => Promise.race([
        p.catch(() => {}),
        new Promise(r => setTimeout(r, ms)),
      ]);
      await withTimeout(
        Promise.all([...document.images].map(i => i.decode().catch(() => {}))),
        6000,
      );
      await new Promise(r => setTimeout(r, 250));
    })()`,
  });

  // The viewport is deliberately NOT resized to the document height for a
  // full-page shot. This page sizes its hero with 100svh, and growing the
  // viewport to 6000px grows the hero to 6000px with it - the screenshot then
  // shows a layout that no visitor will ever see. captureBeyondViewport gets
  // the whole document while the viewport stays the size a phone actually is.
  const clip = full
    ? { x: 0, y: 0, width, height: Math.min(info.h, 24000), scale: 1 }
    : undefined;

  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full, clip });
  const name = `${REDUCED ? "rm-" : ""}${route.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home'}-${width}.png`;
  await writeFile(path.join(OUT, name), Buffer.from(data, 'base64'));
  results.push({ width, name, height: info.h, overflow: info.overflow });
  console.log(`  ${String(width).padStart(4)}px  ${String(info.h).padStart(6)}px tall  ${info.overflow ? '⚠ HORIZONTAL OVERFLOW' : 'ok'}  → .shots/${name}`);
}

cdp.close();
chrome.kill();
await rm(profile, { recursive: true, force: true }).catch(() => {});

if (results.some((r) => r.overflow)) {
  console.error('\nHorizontal overflow detected.');
  process.exit(1);
}
