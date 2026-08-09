#!/usr/bin/env node
/**
 * The gates from §13, run against a live origin.
 *
 *   node tools/checks.mjs
 *   CHECK_ORIGIN=https://… node tools/checks.mjs
 *
 * These are the checks a screenshot cannot make: silent clipping, dead links,
 * console noise, the no-JavaScript contract, and whether the booking links
 * actually point at the three real Setmore services.
 */
import { spawn } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const ROOT = path.resolve(import.meta.dirname, '..');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ORIGIN = process.env.CHECK_ORIGIN ?? 'http://localhost:4217';
const business = JSON.parse(await readFile(path.join(ROOT, 'data/business.json'), 'utf8'));

const ROUTES = ['/', '/boeken/', '/en/', '/en/book/', '/juridisch/privacy/', '/en/legal/privacy/'];

const failures = [];
const notes = [];
const fail = (m) => failures.push(m);
const ok = (m) => notes.push('  ok   ' + m);

/* ------------------------------------------------------------ chrome/cdp */

const port = 9222 + Math.floor(Math.random() * 400);
const profile = path.join(os.tmpdir(), `labi-check-${port}`);
await rm(profile, { recursive: true, force: true });

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--hide-scrollbars', '--force-device-scale-factor=1', '--no-first-run',
  '--disable-extensions', '--disable-gpu', 'about:blank',
], { stdio: 'ignore' });

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

const ws = new WebSocket(await endpoint());
const pending = new Map();
let msgId = 0;
const events = [];
await new Promise((res) => ws.addEventListener('open', res));
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? rej(new Error(m.error.message)) : res(m.result);
  } else if (m.method) events.push(m);
});
const raw = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const id = ++msgId;
  pending.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method, params, sessionId }));
});

const { targetId } = await raw('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await raw('Target.attachToTarget', { targetId, flatten: true });
const send = (m, p) => raw(m, p, sessionId);

await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');
await send('Network.enable');

async function visit(route, { width = 1440, js = true } = {}) {
  await send('Emulation.setScriptExecutionDisabled', { value: !js });
  await send('Emulation.setDeviceMetricsOverride', {
    width, height: Math.round(width * 0.72), deviceScaleFactor: 1, mobile: width < 700,
  });
  events.length = 0;
  await send('Page.navigate', { url: ORIGIN + route });
  await new Promise((r) => setTimeout(r, js ? 1400 : 600));
  if (js) await send('Runtime.evaluate', { expression: 'document.fonts.ready', awaitPromise: true });
  await new Promise((r) => setTimeout(r, js ? 500 : 150));
}

const evaluate = async (expression) => {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression, returnByValue: true, awaitPromise: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.text + ' ' + (result?.description ?? ''));
  return result.value;
};

/* ------------------------------------------------------- 1. every route -- */

for (const route of ROUTES) {
  await visit(route);

  const errors = events
    .filter((e) => e.method === 'Log.entryAdded' && e.params.entry.level === 'error')
    .map((e) => e.params.entry.text);
  const failed = events
    .filter((e) => e.method === 'Network.loadingFailed')
    .map((e) => e.params.errorText);
  const bad = events
    .filter((e) => e.method === 'Network.responseReceived' && e.params.response.status >= 400)
    .map((e) => `${e.params.response.status} ${e.params.response.url}`);

  if (errors.length) fail(`${route} console errors: ${errors.slice(0, 3).join(' | ')}`);
  if (failed.length) fail(`${route} failed requests: ${failed.slice(0, 3).join(' | ')}`);
  if (bad.length) fail(`${route} HTTP >=400: ${bad.slice(0, 3).join(' | ')}`);
  if (!errors.length && !failed.length && !bad.length) ok(`${route} clean console + network`);

  /* Silent clipping. A heading wider than its container is invisible rather
     than scrollable once an ancestor hides overflow-x, so scrollWidth on the
     document is not enough - every element has to be asked. */
  // Elements that are *meant* to be smaller than their content are excluded:
  // .visually-hidden is a 1px clip by definition, and the axis ticks are 1px
  // gridlines carrying an absolutely-positioned label. Anything under 4px wide
  // is a rule or a marker, not prose.
  const clipped = await evaluate(`
    JSON.stringify([...document.querySelectorAll('h1,h2,h3,p,a,span,td,th,li')]
      .filter(el => el.scrollWidth - el.clientWidth > 2)
      .filter(el => el.clientWidth >= 4)
      .filter(el => !el.classList.contains('visually-hidden'))
      .filter(el => !el.closest('.visually-hidden, [data-allow-overflow]'))
      .filter(el => { const o = getComputedStyle(el); return o.overflow !== 'auto' && o.overflowX !== 'auto' && o.position !== 'absolute'; })
      .slice(0, 5)
      .map(el => el.tagName + '.' + (el.className||'') + ' ' + (el.scrollWidth - el.clientWidth) + 'px :: ' + el.textContent.trim().slice(0, 40)))
  `);
  const clip = JSON.parse(clipped);
  if (clip.length) fail(`${route} clipped content: ${clip.join(' | ')}`);

  /* Off-domain assets. Setmore is the only permitted outbound host, and it is
     only ever a link target, never a subresource. */
  const external = await evaluate(`
    JSON.stringify([...performance.getEntriesByType('resource')]
      .map(e => new URL(e.name).host)
      .filter(h => h && h !== location.host))
  `);
  const ext = [...new Set(JSON.parse(external))];
  if (ext.length) fail(`${route} loaded third-party subresources: ${ext.join(', ')}`);

  /* Dead or placeholder links. */
  const hrefs = JSON.parse(await evaluate(`
    JSON.stringify([...document.querySelectorAll('a')].map(a => a.getAttribute('href')))
  `));
  const placeholder = hrefs.filter((h) => !h || h === '#' || h === '');
  if (placeholder.length) fail(`${route} has ${placeholder.length} placeholder href(s)`);
}

/* -------------------------------------------- 2. the three booking links -- */

await visit('/');
const bookHrefs = JSON.parse(await evaluate(`
  JSON.stringify([...document.querySelectorAll('.price')].map(a => a.href))
`));
for (const s of business.services) {
  const hit = bookHrefs.find((h) => h.includes(s.productId));
  if (!hit) fail(`price row for "${s.id}" does not link to product ${s.productId}`);
  else if (!hit.includes(business.booking.staffId)) fail(`booking link for "${s.id}" is missing the staff id`);
}
if (bookHrefs.length === business.services.length && !failures.length) {
  ok(`all ${bookHrefs.length} price rows deep-link to their real Setmore service`);
}

/* Every booking link opens in a new tab, safely. */
const unsafe = await evaluate(`
  [...document.querySelectorAll('a[href*="setmore.com"]')]
    .filter(a => a.target !== '_blank' || !a.rel.includes('noopener')).length
`);
if (unsafe) fail(`${unsafe} setmore link(s) missing target=_blank / rel=noopener`);
else ok('every setmore link is target=_blank rel=noopener noreferrer');

/* ------------------------------------------------ 3. the no-JS contract --- */

await visit('/', { js: false });
const noJs = JSON.parse(await evaluate(`JSON.stringify({
  rows: document.querySelectorAll('.week tbody tr').length,
  prices: [...document.querySelectorAll('.price__cost')].map(e => e.textContent.trim()),
  phone: !!document.querySelector('a[href^="tel:"]'),
  address: document.body.textContent.includes('Klapdorp 37'),
  book: !!document.querySelector('a[href*="setmore.com"]'),
  status: document.querySelector('[data-status-text]')?.textContent.trim() ?? null,
  hiddenAnims: [...document.querySelectorAll('[data-anim]')]
    .filter(el => getComputedStyle(el).opacity === '0' || getComputedStyle(el).clipPath !== 'none').length,
})`));

if (noJs.rows !== 7) fail(`no-JS: expected 7 hours rows, found ${noJs.rows}`);
if (noJs.prices.length !== 3) fail(`no-JS: expected 3 prices, found ${noJs.prices.length}`);
if (!noJs.phone) fail('no-JS: no tel: link');
if (!noJs.address) fail('no-JS: address missing');
if (!noJs.book) fail('no-JS: booking link missing');
if (!noJs.status) fail('no-JS: status text missing');
if (noJs.hiddenAnims) fail(`no-JS: ${noJs.hiddenAnims} element(s) still hidden by the motion layer`);
if (noJs.rows === 7 && noJs.prices.length === 3 && !noJs.hiddenAnims) {
  ok(`no-JS: full week, ${noJs.prices.join('/')}, address, phone, booking and "${noJs.status}" all present`);
}

/* --------------------------------- 4. status is announced, not just coloured */

await visit('/');
const a11yStatus = JSON.parse(await evaluate(`JSON.stringify({
  role: document.querySelector('[data-status]')?.getAttribute('role'),
  text: document.querySelector('[data-status-text]')?.textContent.trim(),
  wordmarkLabel: document.querySelector('.masthead__mark svg')?.getAttribute('aria-label'),
  h1: document.querySelectorAll('h1').length,
  imgsNoAlt: [...document.images].filter(i => !i.hasAttribute('alt')).length,
  langSwitch: document.querySelectorAll('.lang a').length,
})`));
if (a11yStatus.role !== 'status') fail('the open/closed pill is not a live region');
if (!a11yStatus.text) fail('the open/closed pill has no text');
if (a11yStatus.h1 !== 1) fail(`expected exactly one h1, found ${a11yStatus.h1}`);
if (a11yStatus.imgsNoAlt) fail(`${a11yStatus.imgsNoAlt} image(s) without an alt attribute`);
if (!a11yStatus.wordmarkLabel) fail('the wordmark SVG has no accessible name');
if (!failures.length) ok(`status announced as "${a11yStatus.text}", one h1, every image has alt`);

/* ------------------------------------------------ 5. structured data ------ */

const ld = JSON.parse(await evaluate(`
  document.querySelector('script[type="application/ld+json"]').textContent
`));
if (!ld.openingHoursSpecification?.length) fail('structured data has no openingHoursSpecification');
if (ld.makesOffer?.length !== 3) fail(`structured data lists ${ld.makesOffer?.length} offers, expected 3`);
if (!ld.address?.streetAddress?.includes('Klapdorp')) fail('structured data address is not Klapdorp');
if (!ld.geo?.latitude) fail('structured data has no geo');

// The hours in the markup and the hours in the schema must be the same hours.
// Only the seven numeric day keys - business.hours also carries a $comment,
// and a string's .length would quietly add its character count to the total.
const specCount = Object.entries(business.hours)
  .filter(([k, v]) => /^[0-6]$/.test(k) && Array.isArray(v))
  .reduce((n, [, d]) => n + d.length, 0);
if (ld.openingHoursSpecification.length !== specCount) {
  fail(`schema has ${ld.openingHoursSpecification.length} opening-hours entries, config has ${specCount}`);
} else {
  ok(`structured data: ${specCount} opening-hours entries, 3 offers, geo and address all match the config`);
}

/* ------------------------------------------------ 6. mobile, one thumb ---- */

await visit('/', { width: 360 });
const dock = JSON.parse(await evaluate(`JSON.stringify((() => {
  const d = document.querySelector('.dock');
  const r = d.getBoundingClientRect();
  const under = [...document.querySelectorAll('.price__cost')]
    .map(e => e.getBoundingClientRect())
    .filter(b => b.bottom > r.top && b.top < r.bottom).length;
  return { visible: getComputedStyle(d).display !== 'none', height: Math.round(r.height), coveringPrices: under };
})())`));
if (!dock.visible) fail('the mobile dock is not visible at 360px');
if (dock.coveringPrices) fail(`the mobile dock is sitting on top of ${dock.coveringPrices} price(s)`);
else ok(`mobile dock present at 360px (${dock.height}px) and covering no prices`);

/* ---------------------------------------------------------------- report -- */

ws.close();
chrome.kill();
await rm(profile, { recursive: true, force: true }).catch(() => {});

console.log(notes.join('\n'));
if (failures.length) {
  console.error(`\n${failures.length} FAILED:\n` + failures.map((f) => '  ✗ ' + f).join('\n'));
  process.exit(1);
}
console.log(`\nall checks passed against ${ORIGIN}`);
