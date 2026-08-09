# Labi Antwerp

A one-page site for a barbershop at Klapdorp 37, Antwerp, that is open until
22:00 and prices by hair length rather than by gender.

Static HTML. No framework, no build-time dependencies, no third-party requests,
no cookies. Six routes, NL and EN.

---

## The one file that matters

**`data/business.json`** is the single source of truth. The hours block in
particular:

```json
"hours": {
  "0": [["10:00", "22:00"]],   // Sunday
  "1": [["10:00", "22:00"]],   // Monday
  "2": [],                     // Tuesday - closed
  "3": [["20:00", "22:00"]],   // Wednesday
  "4": [["20:00", "22:00"]],   // Thursday
  "5": [["20:00", "22:00"]],   // Friday
  "6": []                      // Saturday - closed
}
```

Change those seven lines, run `npm run build`, and everything follows: the live
OPEN/CLOSED badge, the week chart, and the `openingHoursSpecification` that
Google reads. There is no second copy anywhere.

⚠ **These are the hours you can BOOK**, derived from Setmore's own availability,
which does not match the hours Setmore displays. That is a real contradiction in
the client's account, not a bug here — `docs/FINDINGS.md` F-011 and
`CLIENT_ACTIONS.md` §1.

Public holidays are not in the config. Nothing was guessed; they go in the same
place when the shop confirms them.

## Local development

```bash
node tools/build.mjs                    # -> dist/
powershell -File ../serve-labi.ps1      # http://localhost:4217
```

Or via the workspace launch config: `preview_start { name: "labi" }`.

## Scripts

```bash
npm run build      # render dist/
npm run test       # 25 hours-engine boundary cases, incl. both DST transitions
npm run check      # live-origin gates: console, network, clipping, no-JS, schema
npm run axe        # axe-core, all six routes, zero violations required
npm run motion     # motion runs, fails open, reduced-motion registers nothing
npm run shots      # headless screenshots -> .shots/
npm run verify     # all of the above
```

`npm run brand` and `npm run images` regenerate the brand assets and the image
ladder from `assets/source/`. Neither needs to run for a normal build.

## Deploying

`SITE_ORIGIN` sets the canonical origin and the asset base path:

```bash
SITE_ORIGIN=https://fietsenrekk.github.io/labi node tools/build.mjs
SITE_ORIGIN=http://localhost:4217 node tools/build.mjs      # local
```

Publishing is a `gh-pages` branch push of `dist/`:

```bash
SITE_ORIGIN=https://fietsenrekk.github.io/labi node tools/build.mjs
git add -A && git commit -m "build"
git subtree push --prefix dist origin gh-pages
```

An Actions workflow would be tidier, but pushing one needs a token with the
`workflow` scope, which the account used here does not have. The branch push
produces exactly the same site.

### Which domain is canonical

**`labiantwerp.be`.** It is the only one that exists — `labiantwerp.com` returns
NXDOMAIN, despite being described as a live second site with contradictory
content. There is nothing to consolidate and no redirect to write.

## Layout

```
data/business.json     hours, services, prices, contact, Setmore ids
src/hours.js           the open/closed engine - imported by the build AND the browser
src/content.js         all copy, NL + EN
src/styles.css         the design system
src/app.js             live status, header hand-over, motion
tools/brand.mjs        portrait cut-out + wordmark trace from the client's lockup
tools/images.mjs       the colour grade, the ladder, the alpha assertion
tools/build.mjs        renders the six routes
tools/{test-hours,checks,axe,motion,shot}.mjs
docs/                  FINDINGS, ART_DIRECTION, IMAGE_REPORT, MOTION_REPORT
CLIENT_ACTIONS.md      what the site needs from the shop
SHOOT_LIST.md          what to photograph, in priority order
```

## Two things to know before changing anything

**The hours engine has one implementation.** `src/hours.js` is imported by
`tools/build.mjs` to render the badge into the HTML and loaded by the browser to
keep it live. Do not add a second copy. It always resolves against
`Europe/Brussels` via `Intl`, so DST is handled by the IANA database rather than
by arithmetic — and both 2026 transitions are in the test suite.

**Nothing may be hidden by the motion layer without a way back.** The
hidden-until-animated class is added only by the script that is about to animate,
with a 2.5s failsafe and a `try/catch`. `npm run check` loads the page with
JavaScript disabled and fails if a single element is still transparent.

## Not in this build, on purpose

- **No work gallery.** No photography this build is entitled to publish. See
  `docs/IMAGE_REPORT.md`.
- **No testimonials.** The 4.7/46 rating is real but lives on a platform the shop
  does not control, and the same page carries complaints. Nothing was
  cherry-picked and nothing was invented.
- **No Kicks and Cuts / Macklemore story.** One uncited source. `CLIENT_ACTIONS.md` §3.
- **No Setmore iframe.** Framing is allowed — there is no `frame-ancestors` — but
  the Setmore page carries Google Tag Manager, Meta, Clarity and a dozen ad
  pixels, and embedding it would force a consent banner onto a site that
  otherwise sets no cookies at all. Every service deep-links instead, straight to
  its own time grid.
- **No analytics.** Booking and call taps raise a `labi:tap` DOM event so a
  measurement tool can be added later, with consent, without touching the page.
