#!/usr/bin/env node
/**
 * Static build. Reads data/business.json + src/content.js, writes dist/.
 *
 *   node tools/build.mjs
 *
 * Routes:
 *   /                     the page
 *   /boeken/              booking, NL
 *   /en/                  the page, EN
 *   /en/book/             booking, EN
 *   /juridisch/privacy/   imprint + privacy, NL
 *   /en/legal/privacy/    imprint + privacy, EN
 *
 * Everything a visitor needs at 21:40 - the hours, the three prices, the
 * address, the phone and the booking links - is in the HTML. The scripts only
 * ever upgrade what is already correct: the open/closed state is rendered here
 * at build time and re-rendered live in the browser, and if the script never
 * arrives the page still shows the full week and every price.
 */
import { readFile, writeFile, mkdir, cp, rm, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { resolve as resolveHours, brusselsNow, toMinutes, label as statusLabel } from '../src/hours.js';
import { CONTENT } from '../src/content.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const business = JSON.parse(await readFile(path.join(ROOT, 'data/business.json'), 'utf8'));

const SITE = process.env.SITE_ORIGIN ?? 'https://fietsenrekk.github.io/labi';
const BASE = new URL(SITE).pathname.replace(/\/$/, '');   // '' or '/labi'

/** Prefixes a root-relative asset path with the deploy base path. */
const A = (p) => `${BASE}${p}`;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ------------------------------------------------------------------ brand */

const wordmarkSVG = (await readFile(path.join(ROOT, 'assets/brand/wordmark.svg'), 'utf8'))
  .replace(/<\?xml[^>]*\?>/, '')
  .replace(/\s+role="img"[^>]*/, '')
  .trim();

/** The wordmark, inline so it inherits currentColor, with an accessible name. */
function wordmark(title) {
  return wordmarkSVG
    .replace('<svg ', `<svg aria-label="${esc(title)}" role="img" focusable="false" `);
}

/* ------------------------------------------------------------------- css */

/**
 * Minify the stylesheet.
 *
 * The source is heavily commented on purpose - the comments record why a
 * measurement forced a decision, and they are worth more than the bytes. They
 * are not worth shipping in the critical path, so they are stripped here and
 * kept in src.
 *
 * Quote-aware, because `content: ''` and any future `url('...')` have to
 * survive a whitespace collapse intact.
 */
function minifyCSS(css) {
  let out = '';
  let quote = null;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (quote) {
      out += c;
      if (c === quote && css[i - 1] !== '\\') quote = null;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; out += c; continue; }
    if (c === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end === -1 ? css.length : end + 1;
      continue;
    }
    out += c;
  }
  return out
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

const cssMin = minifyCSS(await readFile(path.join(ROOT, 'src/styles.css'), 'utf8'));

/**
 * The inlined copy needs absolute font paths; the standalone file needs
 * relative ones.
 *
 * `url()` resolves against whatever contains the CSS. In dist/styles.css that
 * is the stylesheet, so `fonts/x.woff2` is right. Inlined into a page at
 * /en/legal/privacy/ it resolves against the document and asks for
 * /en/legal/privacy/fonts/x.woff2, which does not exist. Root-absolute is
 * wrong too under a project-pages base path, so the base is applied here.
 */
const cssInline = cssMin.replace(/url\('fonts\//g, `url('${A('/fonts/')}`);

/* --------------------------------------------------------------- booking */

/**
 * One place builds every booking URL. If the shop ever leaves Setmore, this
 * function changes and nothing else does (§11.4).
 *
 * The per-service deep link skips the service-picker step and drops the visitor
 * straight on the time grid for the length they chose. Product and staff ids
 * were read off the live booking page, not guessed.
 */
function bookURL(service) {
  const b = business.booking;
  if (!service) return b.base;
  const q = new URLSearchParams({
    step: 'time-slot',
    products: service.productId,
    type: 'service',
    staff: b.staffId,
    staffSelected: 'false',
  });
  return `${b.base}?${q}`;
}

const bookAttrs = 'target="_blank" rel="noopener noreferrer"';

/* ----------------------------------------------------------- hours render */

/** The week chart's axis: 09:00 to 23:00. */
const AXIS_FROM = toMinutes('09:00');
const AXIS_TO = toMinutes('23:00');
const AXIS_SPAN = AXIS_TO - AXIS_FROM;

function weekTable(t, todayIndex) {
  const rows = t.dayOrder.map((d) => {
    const intervals = business.hours[String(d)] ?? [];
    const isToday = d === todayIndex;
    const open = intervals.length > 0;

    const bars = intervals.map(([o, c]) => {
      const from = ((toMinutes(o) - AXIS_FROM) / AXIS_SPAN) * 100;
      const span = ((toMinutes(c) - toMinutes(o)) / AXIS_SPAN) * 100;
      return `<span class="week__bar" style="--from:${from.toFixed(2)}%;--span:${span.toFixed(2)}%"></span>`;
    }).join('');

    const times = open
      ? intervals.map(([o, c]) => `${o}&ndash;${c}`).join(', ')
      : `<span class="week__closed">${esc(t.closedWord)}</span>`;

    // data-day is what the runtime uses to move the marker. The "today" label is
    // rendered on EVERY row and revealed by CSS, so marking a different day is
    // an attribute flip rather than a DOM edit - and so a stale build cannot
    // leave the word "vandaag" sitting in only one row's markup.
    return `<tr data-day="${d}"${isToday ? ' data-today' : ''}>
        <th scope="row" class="week__day">${esc(t.days[d])}</th>
        <td><div class="week__track">${bars}</div></td>
        <td class="week__time tnum">${times}<span class="week__today">${esc(t.todayWord)}</span></td>
      </tr>`;
  }).join('\n      ');

  // An axis, because without one the bars are decoration. Three labelled hours
  // are enough to read the shape: midday, late afternoon, and the 20:00 line
  // that the whole argument turns on.
  const ticks = ['12:00', '16:00', '20:00'].map((h) => {
    const at = ((toMinutes(h) - AXIS_FROM) / AXIS_SPAN) * 100;
    return `<span class="week__tick" style="--at:${at.toFixed(2)}%"><span>${h}</span></span>`;
  }).join('');

  return `<table class="week">
      <caption>${esc(t.weekCaption)}</caption>
      <thead>
        <tr>
          <th scope="col">${esc(t.colDay)}</th>
          <th scope="col"><span class="visually-hidden">${esc(t.colWhen)}</span><span class="week__axis" aria-hidden="true">${ticks}</span></th>
          <th scope="col"><span class="visually-hidden">${esc(t.colTimes)}</span></th>
        </tr>
      </thead>
      <tbody>
      ${rows}
      </tbody>
    </table>`;
}

/**
 * The live badge, rendered server-side so it is correct before any script runs.
 * data-hours carries the config to the browser so the client does not refetch
 * anything, and data-open drives the one piece of colour in the design.
 */
function statusPill(t, status, extraClass = '') {
  // The live label is correct at build time and re-rendered by the browser on
  // load. With JavaScript off it can only ever be as fresh as the last build, so
  // a <noscript> swaps it for a statement that is true on any day.
  return `<p class="status ${extraClass}" data-status role="status">
      <span class="status__dot" aria-hidden="true"></span>
      <span class="status__live" data-status-text>${esc(statusLabel(status, t.status))}</span>
      <noscript><span class="status__static">${esc(t.hoursLabel)}</span></noscript>
    </p>`.replace(/\n\s+/g, ' ');
}

/* ------------------------------------------------------------ structured */

function jsonLD(t, lang) {
  const daysSchema = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const spec = [];
  for (let d = 0; d < 7; d++) {
    for (const [o, c] of business.hours[String(d)] ?? []) {
      spec.push({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: `https://schema.org/${daysSchema[d]}`,
        opens: o,
        closes: c,
      });
    }
  }

  const url = lang === 'nl' ? `${SITE}/` : `${SITE}/en/`;

  return {
    '@context': 'https://schema.org',
    '@type': ['HairSalon', 'BarberShop'],
    '@id': `${SITE}/#shop`,
    name: business.name,
    alternateName: 'Labi Antwerp',
    url,
    telephone: business.phone,
    email: business.email,
    image: `${SITE}${A('/img/og.png')}`,
    priceRange: '€35–€45',
    currenciesAccepted: 'EUR',
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.address.street,
      postalCode: business.address.postalCode,
      addressLocality: business.address.city,
      addressCountry: business.address.country,
    },
    geo: { '@type': 'GeoCoordinates', latitude: business.geo.lat, longitude: business.geo.lon },
    openingHoursSpecification: spec,
    sameAs: [business.instagramUrl],
    potentialAction: {
      '@type': 'ReserveAction',
      target: { '@type': 'EntryPoint', urlTemplate: business.booking.base },
    },
    makesOffer: business.services.map((s) => ({
      '@type': 'Offer',
      priceCurrency: 'EUR',
      price: String(s.price),
      itemOffered: {
        '@type': 'Service',
        name: s.name[lang],
        description: s.method[lang],
        serviceType: 'Haircut',
        provider: { '@id': `${SITE}/#shop` },
      },
    })),
  };
}

/* ------------------------------------------------------------------ shell */

function layout({ lang, t, title, description, route, altRoute, body, jsonld }) {
  const canonical = `${SITE}${route}`;
  return `<!doctype html>
<html lang="${lang}" data-open="false">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="nl-BE" href="${SITE}${lang === 'nl' ? route : altRoute}">
<link rel="alternate" hreflang="en" href="${SITE}${lang === 'nl' ? altRoute : route}">
<link rel="alternate" hreflang="x-default" href="${SITE}${lang === 'nl' ? route : altRoute}">

<meta property="og:type" content="website">
<meta property="og:site_name" content="Labi">
<meta property="og:locale" content="${lang === 'nl' ? 'nl_BE' : 'en_GB'}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}${A('/img/og.png')}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(t.ogAlt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="${business.palette.press}">

<link rel="icon" href="${A('/favicon.svg')}" type="image/svg+xml">
<link rel="apple-touch-icon" href="${A('/img/og.png')}">

<link rel="preconnect" href="https://labibookings.setmore.com" crossorigin>
<!--
  Both above-the-fold faces are preloaded, not just the display one.
  Lighthouse put LCP on the hero lede, which is set in Inter Tight: the page
  painted at 1.2s in the fallback face and only reached its largest contentful
  paint when the real font swapped in. Preloading the display face alone fixed
  the headline and left the paragraph waiting.
-->
<link rel="preload" href="${A('/fonts/anybody-latin.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${A('/fonts/inter-tight-latin.woff2')}" as="font" type="font/woff2" crossorigin>
<!--
  The stylesheet is inlined, not linked.

  It is 15.6 KB minified, about 4 KB over the wire, and as a separate file it
  was a full round trip sitting in the critical path in front of every piece of
  text on the page. GitHub Pages answers the document in roughly 700ms under
  Lighthouse's simulated mobile throttle, which is already half the LCP budget -
  there is no room for a second serial request before the first paint.

  dist/styles.css is still written for anyone who wants to read it.
-->
<style>${cssInline}</style>

<!--
  Set the motion class before first paint, so an element that is about to
  animate is never painted at full opacity and then hidden. Only decorative
  discs are affected; app.js removes this again if the motion libraries fail.
-->
<script>try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('js-motion')}catch(e){}</script>

<!--
  Anything that claims to know what day or time it is has to be suppressed when
  there is no script to keep it current. A build is a snapshot; without
  JavaScript the page would still be asserting whatever was true the moment it
  was compiled, which is how the week table came to insist it was Monday on a
  Wednesday.
-->
<noscript><style>
  .status__live { display: none; }
  .week__today { display: none !important; }
  .week tr[data-today] .week__bar { background: color-mix(in srgb, var(--sleeve) 42%, transparent); }
  .week tr[data-today] .week__day { color: inherit; }
</style></noscript>

<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<script type="application/json" id="hours-config">${JSON.stringify({
  hours: business.hours,
  status: t.status,
})}</script>
</head>
<body>
<div class="grain" aria-hidden="true"></div>
<a class="skip" href="#main">${esc(t.skip)}</a>
${body}
<script type="module" src="${A('/app.js')}"></script>
</body>
</html>
`;
}

function masthead(t, lang, route, altRoute, status) {
  const home = lang === 'nl' ? `${BASE}/` : `${BASE}/en/`;
  return `<header class="masthead">
  <a class="masthead__mark" href="${home}">${wordmark(t.markTitle)}</a>
  ${statusPill(t, status)}
  <span class="masthead__spacer"></span>
  <nav class="lang" aria-label="${esc(t.langNav)}">
    <a href="${BASE}${lang === 'nl' ? route : altRoute}"${lang === 'nl' ? ' aria-current="true"' : ''} lang="nl">NL</a>
    <a href="${BASE}${lang === 'nl' ? altRoute : route}"${lang === 'en' ? ' aria-current="true"' : ''} lang="en">EN</a>
  </nav>
  <a class="btn btn--primary" href="${bookURL()}" ${bookAttrs} data-book="header">${esc(t.book)}</a>
</header>`;
}

function dock(t) {
  return `<nav class="dock" aria-label="${esc(t.quickNav)}">
  <a class="btn btn--primary" href="${bookURL()}" ${bookAttrs} data-book="dock">${esc(t.book)}</a>
  <a class="btn btn--ghost" href="tel:${business.phone}" data-call>${esc(t.call)}</a>
</nav>`;
}

function footer(t, lang) {
  const privacy = lang === 'nl' ? `${BASE}/juridisch/privacy/` : `${BASE}/en/legal/privacy/`;
  const maps = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${business.address.street}, ${business.address.postalCode} ${business.address.city}`)}`;
  return `<footer class="foot">
  <div class="shell foot__grid">
    <div>
      <h2>${esc(t.footFind)}</h2>
      <p><a href="${maps}" target="_blank" rel="noopener noreferrer">${esc(business.address.street)}<br>${esc(business.address.postalCode)} ${esc(business.address.city)}</a></p>
    </div>
    <div>
      <h2>${esc(t.footTalk)}</h2>
      <p><a href="tel:${business.phone}">${esc(business.phoneDisplay)}</a><br>
      <a href="mailto:${business.email}">${esc(business.email)}</a></p>
    </div>
    <div>
      <h2>${esc(t.footSee)}</h2>
      <p><a href="${business.instagramUrl}" target="_blank" rel="noopener noreferrer">@${esc(business.instagram)}</a></p>
    </div>
    <div>
      <h2>${esc(t.footBook)}</h2>
      <p><a href="${bookURL()}" ${bookAttrs} data-book="footer">${esc(t.book)}</a></p>
    </div>
  </div>
  <div class="shell foot__fine">
    <span>&copy; ${new Date().getFullYear()} ${esc(business.name)}</span>
    <a href="${privacy}">${esc(t.privacy)}</a>
    <span>${esc(t.builtNote)}</span>
  </div>
</footer>`;
}

/* -------------------------------------------------------------- the page */

function homeBody(t, lang, status, todayIndex) {
  const route = lang === 'nl' ? '/' : '/en/';
  const altRoute = lang === 'nl' ? '/en/' : '/';
  const bookRoute = lang === 'nl' ? `${BASE}/boeken/` : `${BASE}/en/book/`;

  const priceRows = business.services.map((s) => `
      <a class="price" style="--row:${s.colour}" href="${bookURL(s)}" ${bookAttrs} data-book="prices" data-service="${s.id}">
        <span class="price__dot" aria-hidden="true"></span>
        <span class="price__name">${esc(s.name[lang])}
          <span class="price__method">${esc(s.method[lang])}</span>
        </span>
        <span class="price__meta">
          <span class="price__mins tnum">${s.minutes}&nbsp;${esc(t.min)}</span>
          <span class="price__cost tnum">&euro;${s.price}</span>
        </span>
      </a>`).join('');

  return `${masthead(t, lang, route, altRoute, status)}
<main id="main">

  <section class="sign band--night">
    <div class="sign__discs" aria-hidden="true">
      <span class="disc disc--light" data-disc="light"></span>
      <span class="disc disc--press" data-disc="press"></span>
      <span class="disc disc--ghost" data-disc="ghost"></span>
    </div>
    <div class="shell sign__inner">
      <!--
        Nothing above the fold carries data-anim, deliberately.

        The status, the headline, the hours, the three prices and the booking
        button are the entire job of this page at 21:40, and animating them in
        made them the thing that was late: Lighthouse named this paragraph as
        the LCP element, and the motion layer was hiding it *after* first paint
        and fading it back. The discs animate. The answer does not.
      -->
      ${statusPill(t, status)}
      <h1 class="display sign__word">${t.heroWord}</h1>
      <p class="lede">${t.heroLede}</p>
      <p class="sign__facts">
        ${business.services.map((s) => `<span><b>${esc(s.name[lang])}</b> &euro;${s.price}</span>`)
          .join('<span class="sep" aria-hidden="true">/</span>')}
      </p>
      <p class="actions">
        <a class="btn btn--primary" href="${bookURL()}" ${bookAttrs} data-book="hero">${esc(t.book)}</a>
        <a class="btn btn--ghost" href="#prices">${esc(t.seePrices)}</a>
      </p>
    </div>
  </section>

  <section class="band band--press" aria-labelledby="thesis-h">
    <div class="shell">
      <h2 class="display" id="thesis-h" style="font-size:var(--step-4)" data-anim="drop">${t.thesisH}</h2>
      <blockquote class="quote" data-anim="drop" style="margin-top:2rem">
        <p lang="en">&ldquo;${esc(t.thesisQuote)}&rdquo;</p>
        <cite>${esc(t.thesisCite)}</cite>
      </blockquote>
      <p class="prose" data-anim="drop" style="margin-top:2rem">${t.thesisBody}</p>
    </div>
  </section>

  <section class="band band--paper" id="prices" aria-labelledby="prices-h">
    <div class="shell">
      <h2 class="display" id="prices-h" style="font-size:var(--step-4)" data-anim="drop">${esc(t.pricesH)}</h2>
      <p class="prose" data-anim="drop" style="margin:1.5rem 0 3rem">${t.pricesBody}</p>
      <div class="prices">${priceRows}
      </div>
      <p style="margin-top:2rem"><a class="btn btn--ghost" href="${bookRoute}">${esc(t.allBooking)}</a></p>
    </div>
  </section>

  <section class="band band--night" id="week" aria-labelledby="week-h">
    <div class="shell">
      <h2 class="display" id="week-h" style="font-size:var(--step-4)" data-anim="drop">${esc(t.weekH)}</h2>
      <p class="prose" data-anim="drop" style="margin:1.5rem 0 3rem">${t.weekBody}</p>
      <div data-anim="drop">${weekTable(t, todayIndex)}</div>
    </div>
  </section>

  <section class="band band--paper" aria-labelledby="shop-h">
    <div class="shell">
      <h2 class="display" id="shop-h" style="font-size:var(--step-4)" data-anim="drop">${esc(t.shopH)}</h2>
      <figure class="shot" data-anim="reveal" style="margin-top:2.5rem">
        <picture>
          <source type="image/avif" srcset="${A('/img/shopfront-480.avif')} 480w, ${A('/img/shopfront-768.avif')} 768w, ${A('/img/shopfront-1024.avif')} 1024w, ${A('/img/shopfront-1440.avif')} 1440w" sizes="(min-width: 88rem) 1408px, 92vw">
          <img src="${A('/img/shopfront-1024.webp')}"
               srcset="${A('/img/shopfront-480.webp')} 480w, ${A('/img/shopfront-768.webp')} 768w, ${A('/img/shopfront-1024.webp')} 1024w, ${A('/img/shopfront-1440.webp')} 1440w"
               sizes="(min-width: 88rem) 1408px, 92vw"
               width="1440" height="810" loading="lazy" decoding="async"
               alt="${esc(t.shopAlt)}">
        </picture>
        <figcaption>${t.shopCaption}</figcaption>
      </figure>
      <p class="prose" data-anim="drop" style="margin-top:2.5rem">${t.shopBody}</p>
    </div>
  </section>

  <section class="band band--night" aria-labelledby="book-h">
    <div class="shell" style="display:flex;flex-wrap:wrap;gap:clamp(2rem,6vw,5rem);align-items:center">
      <div class="badge" data-anim="drop" data-badge>
        <img src="${A('/img/portrait-428.webp')}" width="428" height="600" loading="lazy" decoding="async" alt="">
      </div>
      <div style="flex:1 1 20rem">
        <h2 class="display" id="book-h" style="font-size:var(--step-4)" data-anim="drop">${esc(t.bookH)}</h2>
        <p class="prose" data-anim="drop" style="margin:1.5rem 0 2rem">${t.bookBody}</p>
        <p class="actions" data-anim="drop">
          <a class="btn btn--primary" href="${bookURL()}" ${bookAttrs} data-book="closing">${esc(t.book)}</a>
          <a class="btn btn--ghost" href="tel:${business.phone}" data-call>${esc(t.callFull)} ${esc(business.phoneDisplay)}</a>
        </p>
        <p style="margin-top:2rem;opacity:.7;font-size:var(--step--1)">${t.policy}</p>
      </div>
    </div>
  </section>

</main>
${footer(t, lang)}
${dock(t)}`;
}

/* ------------------------------------------------------------ /boeken --- */

function bookBody(t, lang, status, todayIndex) {
  const route = lang === 'nl' ? '/boeken/' : '/en/book/';
  const altRoute = lang === 'nl' ? '/en/book/' : '/boeken/';

  const rows = business.services.map((s) => `
      <a class="book-row" style="--row:${s.colour}" href="${bookURL(s)}" ${bookAttrs} data-book="book-page" data-service="${s.id}">
        <span class="book-row__name">${esc(s.name[lang])}</span>
        <span class="book-row__meta tnum">${s.minutes}&nbsp;${esc(t.min)} &nbsp;&middot;&nbsp; &euro;${s.price}</span>
      </a>`).join('');

  return `${masthead(t, lang, route, altRoute, status)}
<main id="main">
  <section class="band band--night" style="padding-top:clamp(7rem,16vh,10rem)" aria-labelledby="bh">
    <div class="shell">
      ${statusPill(t, status)}
      <h1 class="display" id="bh" style="font-size:var(--step-4);margin-top:1.5rem">${esc(t.bookPageH)}</h1>
      <p class="lede" style="margin-top:1.5rem">${t.bookPageLede}</p>
      <div class="book-list">${rows}
      </div>
      <p style="margin-top:2.5rem;opacity:.75;font-size:var(--step--1);max-width:52ch">${t.bookPageNote}</p>
      <div style="margin-top:3.5rem">${weekTable(t, todayIndex)}</div>
      <p class="actions" style="margin-top:2.5rem">
        <a class="btn btn--ghost" href="tel:${business.phone}" data-call>${esc(t.callFull)} ${esc(business.phoneDisplay)}</a>
        <a class="btn btn--ghost" href="${lang === 'nl' ? `${BASE}/` : `${BASE}/en/`}">${esc(t.backHome)}</a>
      </p>
    </div>
  </section>
</main>
${footer(t, lang)}
${dock(t)}`;
}

/* ------------------------------------------------------------- privacy -- */

function privacyBody(t, lang, status) {
  const route = lang === 'nl' ? '/juridisch/privacy/' : '/en/legal/privacy/';
  const altRoute = lang === 'nl' ? '/en/legal/privacy/' : '/juridisch/privacy/';
  return `${masthead(t, lang, route, altRoute, status)}
<main id="main">
  <section class="band band--night" style="padding-top:clamp(7rem,16vh,10rem)">
    <div class="shell">
      <h1 class="display" style="font-size:var(--step-3)">${esc(t.privacyH)}</h1>
      <div class="prose" style="margin-top:2rem">${t.privacyBody}</div>
    </div>
  </section>
</main>
${footer(t, lang)}`;
}

/* ---------------------------------------------------------------- write -- */

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

const now = brusselsNow();
const status = resolveHours(business.hours, now);
const todayIndex = now.day;

const pages = [];
for (const lang of ['nl', 'en']) {
  const t = CONTENT[lang];
  const home = lang === 'nl' ? '/' : '/en/';
  const homeAlt = lang === 'nl' ? '/en/' : '/';
  const book = lang === 'nl' ? '/boeken/' : '/en/book/';
  const bookAlt = lang === 'nl' ? '/en/book/' : '/boeken/';
  const priv = lang === 'nl' ? '/juridisch/privacy/' : '/en/legal/privacy/';
  const privAlt = lang === 'nl' ? '/en/legal/privacy/' : '/juridisch/privacy/';

  pages.push(
    { route: home, html: layout({ lang, t, title: t.title, description: t.description, route: home, altRoute: homeAlt, body: homeBody(t, lang, status, todayIndex), jsonld: jsonLD(t, lang) }) },
    { route: book, html: layout({ lang, t, title: t.bookTitle, description: t.bookDescription, route: book, altRoute: bookAlt, body: bookBody(t, lang, status, todayIndex), jsonld: jsonLD(t, lang) }) },
    { route: priv, html: layout({ lang, t, title: t.privacyTitle, description: t.privacyDescription, route: priv, altRoute: privAlt, body: privacyBody(t, lang, status), jsonld: jsonLD(t, lang) }) },
  );
}

for (const { route, html } of pages) {
  const dir = path.join(DIST, route);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.html'), html);
}

/* assets */
await writeFile(path.join(DIST, 'styles.css'), cssMin);
await cp(path.join(ROOT, 'src/hours.js'), path.join(DIST, 'hours.js'));
await cp(path.join(ROOT, 'src/app.js'), path.join(DIST, 'app.js'));
await cp(path.join(ROOT, 'assets/fonts'), path.join(DIST, 'fonts'), { recursive: true });
await cp(path.join(ROOT, 'assets/img'), path.join(DIST, 'img'), { recursive: true });
await cp(path.join(ROOT, 'src/vendor'), path.join(DIST, 'vendor'), { recursive: true });

/* The favicon is the badge: a red disc with the wordmark. Drawn, not exported. */
await writeFile(path.join(DIST, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="32" fill="${business.palette.press}"/>
  <g transform="translate(8 21) scale(0.181)" fill="${business.palette.label}">
    ${wordmarkSVG.replace(/^[\s\S]*?<path/, '<path').replace(/<\/svg>\s*$/, '').replace(/fill="currentColor"/, '')}
  </g>
</svg>
`);

/* robots + sitemap */
await writeFile(path.join(DIST, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

await writeFile(path.join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.w3.org/1999/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pages.map(({ route }) => `  <url><loc>${SITE}${route}</loc></url>`).join('\n')}
</urlset>
`.replace('http://www.w3.org/1999/sitemap/0.9', 'http://www.sitemaps.org/schemas/sitemap/0.9'));

/* GitHub Pages must not run the output through Jekyll. */
await writeFile(path.join(DIST, '.nojekyll'), '');

/* ---------------------------------------------------------------- report */

async function weigh(dir, prefix = '') {
  let total = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    total += entry.isDirectory() ? await weigh(p, prefix + entry.name + '/') : (await stat(p)).size;
  }
  return total;
}

const homeHtml = pages[0].html;
console.log(`built ${pages.length} routes -> dist/`);
console.log(`  status rendered at build: ${statusLabel(status, CONTENT.nl.status)}`);
console.log(`  / html ${(Buffer.byteLength(homeHtml) / 1024).toFixed(1)} KB`);
console.log(`  dist total ${(await weigh(DIST) / 1024 / 1024).toFixed(2)} MB`);
