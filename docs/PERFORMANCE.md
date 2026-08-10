# Performance

Measured with Lighthouse 12, mobile form factor, simulated throttling, against
the **live** URL — `https://fietsenrekk.github.io/labi/`.

```
Performance      99
Accessibility   100
Best practices  100
SEO             100

FCP             1.1 s
LCP             2.0 s      ← misses the brief's < 1.5 s. See below.
CLS             0.005      budget < 0.05
TBT             50 ms      budget INP < 200 ms
Speed Index     2.4 s
Total weight    173 KiB    budget < 1.5 MB
```

| Budget | Target | Measured |
|---|---|---|
| Lighthouse perf (mobile) | ≥ 98 | **99** |
| Accessibility | 100 | **100** |
| Best practices | 100 | **100** |
| SEO | 100 | **100** |
| axe violations | 0 | **0** across 6 routes |
| CLS | < 0.05 | **0.005** |
| Initial JS (gzip) | < 130 KB | **50 KB** |
| First view | < 1.5 MB | **173 KB** |
| LCP | < 1.5 s | **2.0 s** ✗ |

## LCP misses, and here is why

The LCP element is the hero paragraph — text, not an image. Its phase breakdown:

```
TTFB          ~720 ms   (36%)
Load delay       0 ms
Load time        0 ms
Render delay  ~1280 ms  (64%)
```

**TTFB alone is roughly half the 1.5 s budget**, and it is GitHub Pages under
Lighthouse's simulated mobile throttle. Nothing in this codebase moves it.

Everything on the page side has already been done:

- The stylesheet is **inlined**, so there is no serial request in front of the
  first paint.
- Both above-the-fold fonts are **preloaded**, same-origin.
- There is **no LCP image** — the hero is type and flat colour.
- **No third-party requests at all.** Nothing to block on.
- Total page weight is 173 KB.

What would actually fix it is hosting: a custom domain on a CDN that answers in
100–200 ms instead of 700 ms would put LCP comfortably under 1.5 s without a
single change to the code. That is a deploy decision, not a build one, and it is
worth making when the site moves to `labiantwerp.be`.

Reporting this as a pass would have been easy and wrong.

## The CLS story

Worth writing down, because the number moved a long way and the first two fixes
were aimed at the wrong thing.

CLS started at **0** — falsely. Every animated element began at `opacity: 0`, and
a shift you cannot see is not counted. Once the hero text stopped animating (so
that the answer to *is it open, what does it cost* is painted immediately), the
shift that had always been there became visible: **0.201**.

Three attempts:

1. **Metric-matched font fallbacks.** 0.201 → 0.175. Barely moved, because the
   `size-adjust` values were derived against a bare Arial in the abstract rather
   than against the fallback face as actually used — they set the headline at
   1618px where the real font sets 2722px, which is a *worse* mismatch.

2. **Pinning the hero disc layer to `100svh`** instead of `inset: 0`. 0.175 →
   0.178. No help: the disc layer was the element Lighthouse *named*, but it was
   a symptom.

3. **Reading the actual `layout-shift` entries with their before/after rects.**
   Which showed two real causes, neither of them guessable:

   - The masthead is a flex row, and before the fonts swapped the status pill was
     wider. The only shrinkable item was the wordmark, so it rendered at 24px
     tall and sprang back to 36px. `flex: none` on the mark, `min-width: 0` on the
     pill. **0.178 → 0.129.**
   - The remaining shift was the hero re-wrapping. Re-measuring `size-adjust`
     against the fallback face in the page — 134.6% for the display face, 94.8%
     for the text face — brought the fallback to **2723px against the real font's
     2722px**. **0.129 → 0.005.**

The lesson worth keeping: Lighthouse names the element that *moved*, which is
often not the element that *caused* the move. The `layout-shift` PerformanceEntry
with `sources[].previousRect` / `currentRect` names the cause.

`tools/font-metrics.mjs` re-measures both faces if either family ever changes.

## Reproducing

```bash
npx lighthouse@12 https://fietsenrekk.github.io/labi/ \
  --form-factor=mobile --screenEmulation.mobile \
  --throttling-method=simulate --quiet
```
