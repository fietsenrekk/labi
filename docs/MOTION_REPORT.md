# Motion report

## What shipped, and why each thing earned its place

| Library | Gzipped | Why |
|---|---|---|
| **GSAP** 3.13.0 | 28.2 KB | The hero timeline and both scroll variants. Free for commercial use since 30 April 2025. |
| **ScrollTrigger** | 17.8 KB | Every reveal, and the scrubbed hand-over. |
| **Lenis** 1.1.20 | 4.0 KB | Smooth scroll. The largest single lift in perceived quality per byte on the page. |
| **Total** | **50.0 KB** | Budget was 130 KB. |

All four files are **vendored locally**. Nothing is fetched from a CDN, because
the site's claim is that it makes no third-party requests and sets no cookies,
and a CDN request would quietly break that on the very first page load.

### Flip was downloaded and not shipped

`Flip.min.js` (9.6 KB gzip) was pulled and then left out. The hand-over needed to
be **tied to scroll position, reversible, and re-measured on resize**; Flip
animates between two recorded states on a timeline, which is the wrong shape for
that. It is done instead with function-based tween values plus
`invalidateOnRefresh`, which is a scrubbed FLIP by hand and about fifteen lines.

### Unicorn Studio: cut

§12.8 gives it one plausible job — a warm volumetric glow behind the closing CTA,
the yellow of a shop window bleeding into a dark street.

**It is not in the build**, and the honest reason is that the brief's own note
predicted it: on a one-page site the shader is the easiest thing to justify
cutting. The atmosphere it would have produced is already carried by a flat
`#fee935` disc that turns on when the shop is open — and that disc means
something, which a glow does not. Adding up to 220 KB of lazily-loaded WebGL to
restate it would have been decoration standing in for the idea.

## The vocabulary — two variants, no exceptions

```
drop     y +18 → 0, opacity 0 → 1, 0.6s, expo.out, stagger 0.05 within a section
reveal   clip-path inset(0 0 100% 0) → inset(0 0 0% 0), 0.9s, expo.out, MEDIA ONLY
```

Everything on the page is one of those two, plus the hero timeline and the
scrubbed hand-over. `expo.out` everywhere: things **land**, hard, the way paint
hits a wall.

Eight ScrollTriggers total on the home page. The reveals are registered per
section rather than per element, and the hours table is one trigger staggering
seven rows — not seven triggers.

## The signature

**The red disc becomes the booking button.**

The hero's `--press` disc is the badge. Scrubbed across the hero's exit it
translates and scales to the centre of the header's booking button and fades out,
while the button itself arrives.

Two decisions worth recording:

**The measurements are functions, not constants.** `x`, `y` and `scale` are
evaluated at refresh time from live `getBoundingClientRect()` calls, with
`invalidateOnRefresh: true`. A resize, an orientation change or a late font swap
re-measures instead of leaving the disc parked in the wrong place.

**The button's own arrival is not GSAP's job.** It is an IntersectionObserver
toggling a class, deliberately outside the motion layer, because it is the
primary call to action and **it is not allowed to depend on a library that might
fail to load.** An early version animated the button's opacity in the scrub too;
it fought the CSS class and made the booking button flicker mid-scroll.

Desktop only, above 48em. Below that the header button is not rendered at all —
the bottom dock does that job — so there is nothing to hand over to.

## Failing open

The initial hidden state lives behind a `.js-motion` class that is **only added
by the script that is about to do the animating**, and a 2.5-second failsafe
removes it if the libraries never arrive. A `try/catch` around the whole loader
does the same on error.

The consequence: with JavaScript disabled, blocked, or simply failed, no element
is ever hidden. Verified as a gate — `tools/checks.mjs` loads the page with
script execution disabled and asserts that zero `[data-anim]` elements are
transparent or clipped, alongside the full week, all three prices, the address,
the phone number and a working booking link.

A decoration that fails open is a decoration. One that fails closed is a blank
page.

## Reduced motion

`gsap.matchMedia()` wraps every animation, and under
`prefers-reduced-motion: reduce` **nothing is registered — not shorter, not
faster, nothing.** The libraries are never even fetched, so a visitor who has
asked for less motion also downloads 50 KB less JavaScript.

Verified rather than asserted: `tools/motion.mjs` loads with the media feature
emulated and checks that `window.gsap` is undefined, `ScrollTrigger.getAll()` is
empty, the `js-motion` class was never applied, and no `[data-anim]` element is
transparent or transformed.

The only always-on animation is the 2.6s pulse on the status dot, and it is
switched off by the same media query.

## Performance

| Check | Result |
|---|---|
| Long tasks (>50ms) during a full scroll, 4× CPU throttle, 360px | **0** |
| `will-change` left behind after animations settle | **0 elements** |
| Properties animated | `transform`, `opacity`, and `clip-path` on reveals only |
| Layout shift from motion | none — every image carries intrinsic `width`/`height` |

**On the frame-time number, honestly.** The brief asks for 60fps p95 at 4× CPU
throttle. The obvious measurement — p95 of the gap between `requestAnimationFrame`
callbacks — does not mean what it appears to in this environment: headless Chrome
is not vsync-locked, and the median gap measures **5.0ms**, about 195fps. Against
that baseline a 16.7ms threshold is measuring scheduling jitter, not a frame
budget. An earlier run reported "p95 20.0ms" and it was a number that sounded
like a verdict while telling us nothing.

So the gate is **main-thread blocking**, which is what actually drops frames and
which does transfer to a real device: zero long tasks through a full throttled
scroll. The rAF spread (median 5.0ms, p95 15.0ms) is reported as an observation.

Two things did come out of chasing that number and are worth keeping: on screens
under 48em the halftone grain drops `mix-blend-mode` and the header and dock drop
`backdrop-filter`. Both are full-viewport compositing work paid on every scrolled
frame, and neither is resolvable on a phone screen.

**The limit of all of this:** a headless run on a desktop at 4× throttle
approximates a mid-tier phone. It is not one. The site has not been scrolled on a
real handset at night on a real 4G connection, and that is the test the brief
actually cares about.
