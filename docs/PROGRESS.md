# Progress log

## Phase 0 — verification, before any design

The brief's premises were checked against live sources first. Six of them did not
hold, and two of the six would have shaped the whole build. Full detail in
`FINDINGS.md`; the short list:

- The logo is **not a record sleeve with a yellow lozenge**. It is a circular
  badge with a painted portrait and the wordmark laid across the eyes, and its
  only caption reads *"brewed with grace / 7.2% vol"*. The brief's signature
  interaction — the lozenge detaching into the sticky button — had no lozenge to
  detach.
- **`labiantwerp.com` does not exist** (NXDOMAIN). The brief's one blocking
  finding was void, which is why the build did not stop.
- The Setmore About text is **"I don't do genders, I do hair … Same prices for
  all"**, not the sentence the brief quotes.
- **The hours contradict themselves inside Setmore** — displayed hours vs
  bookable hours — and the brief copied the wrong set. New finding, F-011.
- The **Kicks and Cuts / Macklemore** history traces to one uncited aggregator.
- Address, phone, prices, durations, policy text and the 4.7/46 rating all
  **checked out** exactly as the brief stated.

Two things the brief missed, both better than what it proposed: the shop's own
painted shopfront (overlapping circles, "FADED"), and nine unused service
medallions in three colour families that map exactly onto the three services.

## What got built

Six routes, NL and EN, static HTML. Hand-written CSS, no framework.

| Section | Why it survived |
|---|---|
| The sign | Answers *is it open / what does it cost / where do I tap* in one screen |
| No men's price, no women's price | The barber's own sentence, quoted |
| Three prices | Each row deep-links to that one Setmore service |
| The week | The hours drawn as a chart — the shape *is* the argument |
| Klapdorp 37 | The one photograph the build is entitled to publish |
| Book a chair | The badge at full size, cancellation window, the policy verbatim |

**Two whole sections were removed**, which §7.8 asks for and which turned out to
be forced rather than chosen: the work gallery (no publishable photography) and
the story (unverified).

## Bugs found and fixed

Worth recording because most of them were invisible until something was built to
catch them.

**The live site rendered in fallback fonts.** `@font-face` used root-absolute
URLs, which resolve to the domain root under a project-pages base path. Localhost
looked perfect because its base path is empty. Caught only by running the checks
against the deployed URL — the reason §14 insists on it.

**AVIF silently dropped the portrait's alpha.** ffmpeg's libaom path wrote
`gbrp`; the cut-out would have shipped as an opaque rectangle inside the red
disc. The pipeline now asserts the alpha channel survives and throws if it does
not.

**Dutch compounds were clipped, silently.** "vrouwenprijs" at 390px overran its
line, and because an ancestor hides horizontal overflow it vanished off the right
edge rather than scrolling — no error, no warning. The type scale is now sized
against that word, and `checks.mjs` measures every text element's scroll width on
every route.

**A group opacity swallowed three contrast violations.** `opacity: 0.5` on a
table header applied to the axis labels nested inside it, taking their effective
alpha to 0.36.

**axe was scanning almost nothing.** With motion on, everything below the fold
sits at opacity 0 and axe skips contrast checks on transparent elements — so the
scan came back clean while never looking at most of the page. Forcing
reduced-motion during the scan revealed two more real violations.

**The frame-time metric was meaningless.** p95 of rAF gaps in headless Chrome
measures scheduling jitter, not a frame budget, because headless is not
vsync-locked — the median is 5ms, about 195fps. Replaced with long-task counting,
which is what actually drops frames. Chasing the bogus number did produce two
real wins: dropping `mix-blend-mode` and `backdrop-filter` on phones.

**The week table was stuck on the build date.** The status pill re-rendered on
every load; the table's "vandaag" marker did not - it was baked into the HTML at
compile time and never touched again, so on a Wednesday the table still insisted
it was Monday while the pill three sections above it was right. Two clocks on one
page, one of them stopped. Everything time-dependent is now painted from a single
 call, and with JavaScript off a noscript stylesheet hides both
the day marker and the live status rather than letting a snapshot assert
something stale.

**The screenshot tool deadlocked**, twice, for two different reasons: resizing
the viewport to the document height inflated `100svh` so the hero photographed at
6000px tall, and `img.decode()` never settled on lazy images because Lenis
intercepts programmatic scroll.

## Final numbers, on the live URL

```
Performance 99 · Accessibility 100 · Best practices 100 · SEO 100
CLS 0.005 · TBT 50ms · total weight 173 KiB · JS 50 KB gzip
LCP 2.0s — misses the 1.5s target; about 720ms of it is GitHub Pages TTFB.
```

CLS is the one worth reading about: it started at a false 0, went to 0.201 the
moment the hero stopped hiding its own reflow, and took three attempts to
actually fix — the first two aimed at the element Lighthouse named rather than
the one causing it. `PERFORMANCE.md` has the whole account.

## Verification

Everything below runs against the **live** URL.

```
hours engine        25/25 boundary cases, incl. both 2026 DST transitions
                    and a check that the visitor's own timezone cannot leak in
checks              6 routes: clean console + network, no clipped content,
                    no third-party subresources, no placeholder links,
                    3 real Setmore product ids, no-JS contract, schema, 360px dock
axe                 6 routes, 0 violations, scanned with reduced motion forced
motion              fails open, reduced motion registers nothing,
                    0 long tasks at 4x CPU throttle, 0 will-change leaks
```

## Open

- The hours conflict needs the barber to resolve it (`CLIENT_ACTIONS.md` §1)
- No photography of the work, and no consent for the two files that exist
- The Labi Siffre question, which would change the art direction
- Nobody has opened this on a real phone on Klapdorp at 21:40 on a Thursday,
  which is the test it was built for
