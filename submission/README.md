# Awwwards submission package

**Live:** https://fietsenrekk.github.io/labi/
**Repo:** https://github.com/fietsenrekk/labi

## Files

| File | Size | Notes |
|---|---|---|
| `thumbnail-desktop.png` | 1200×900 | The hero: wordmark, live open state, the statement, the three prices, the booking button. Everything the site argues, in one frame. |
| `thumbnail-mobile.png` | 780×1688 | Purpose-built. This site is genuinely mobile-first — most visitors are on a phone, at night, deciding in under a minute. |

## Description

> Labi is a barbershop on Klapdorp in Antwerp that is open until 22:00 — evenings
> only on Wednesday, Thursday and Friday — and prices by the length of your hair
> rather than by your gender. The site is built entirely out of the shop's own
> two artefacts: a painted badge, and the overlapping circles hand-painted on its
> shopfront under the word FADED. The yellow disc in the hero is lit only while
> the shop is actually open.

Written to survive the interchangeability test: swap "Labi" for another
barbershop and none of it stays true.

## Categories

- Business & Services
- Beauty & Wellness
- Typography
- Graphic design

Animation and Photographic are **not** claimed. The motion is deliberately two
variants and one hand-over, and there is one photograph on the whole site.
Claiming either would invite a juror to score against a category the work is not
competing in.

## Technologies

- Hand-written static HTML/CSS — no framework
- GSAP 3.13 + ScrollTrigger
- Lenis
- Node build script, zero runtime dependencies

Unicorn Studio was considered and cut — see `docs/MOTION_REPORT.md`.

## Elements (3–5 individual submissions)

The most underused route to visibility, and this build has four that stand alone:

1. **The live open/closed state.** The page knows what time it is in Brussels and
   says so — `OPEN · tot 22:00`, `OPEN · nog tot 22:00`, `OPENT VANDAAG OM 20:00`,
   `GESLOTEN · opent woensdag 20:00` — and the yellow disc in the hero is lit only
   while it is true. Correct in the HTML before any script runs, correct across
   both DST transitions, and announced rather than conveyed by colour.

2. **The week as a chart.** Seven rows on a 09:00–23:00 axis. Two long bars, three
   late-evening slivers against the 20:00 gridline, two empty rows. The shape of
   the week *is* the argument — open when the rest of the city is shut — and no
   other barbershop in Antwerp has that silhouette.

3. **The badge hand-over.** The hero's red disc is the shop's mark; scrubbed
   across the hero's exit it travels into the header and becomes the booking
   button. Re-measured on every refresh so a resize or a late font swap cannot
   strand it.

4. **The price list.** Three rows, no cards. Each row inverts to its own colour —
   the client's own teal, green and orange, taken from medallions already sitting
   unused in their media library — and links straight to that one service's time
   grid on Setmore, skipping the picker.

Capture each as a clean screen recording before submitting.

## Pre-submission checklist

Run against the **live** URL, not localhost:

```bash
CHECK_ORIGIN=https://fietsenrekk.github.io/labi node tools/checks.mjs
AXE_ORIGIN=https://fietsenrekk.github.io/labi   node tools/axe.mjs
MOTION_ORIGIN=https://fietsenrekk.github.io/labi node tools/motion.mjs
```

- [x] Zero console errors on every route
- [x] Zero axe violations, six routes, scanned with reduced motion forced so
      below-the-fold content is actually evaluated
- [x] All three price rows deep-link to their real Setmore product ids
- [x] Full week, all three prices, address, phone and a working booking link with
      JavaScript disabled
- [x] Reduced motion registers nothing at all
- [ ] Open it on a real phone, on Klapdorp, at 21:40 on a Thursday. Not done —
      and it is the test this site is actually built for.
