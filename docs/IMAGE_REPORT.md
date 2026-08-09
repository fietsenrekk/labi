# Image report

## The short version

**Two images ship. Both belong to the client. Nothing was generated, nothing was
upscaled, and no credits were spent.**

The brief's §9 asks for a shot ladder topping out at 5120px, a graded body of
work pulled from Instagram, and a Higgsfield pipeline to get it there. None of
that was possible honestly, and the reason is worth stating plainly rather than
papering over: **there is almost no photography here, and what exists mostly
cannot be published.**

## What shipped

| Asset | Source | Size | Treatment |
|---|---|---|---|
| `shopfront-*` | `labiantwerp.be` media library | 1440×810 native | graded, grained, output-sharpened, AVIF + WebP at 480 / 768 / 1024 / 1440 |
| `portrait-*` | cut from the client's master lockup | 428×600 | alpha cut-out, **ungraded** |
| `og.*` | the client's master lockup | 1200×630 | re-encoded only |

Total: **585 KB** across 13 files.

### The shopfront is 1440px and is not upscaled

§9.2 wants ≥3840px for a full-bleed band. The source is 1440px. Upscaling it
2.7× would produce a smeared wall and a banded painted circle, and the honest
alternative is to **never ask the image to be bigger than it is**: the layout
caps it at `max-width: 1440px` and the `sizes` attribute tops out there. It is a
framed artefact on the page, not a full-bleed band.

This is the single biggest quality gap in the build and it is fixable in one
phone call — top of `CLIENT_ACTIONS.md` §4.

### The portrait is artwork, so it is not treated like a photograph

The cut-out was done locally with a **border flood-fill**, not a colour key. The
painting's own shadows sit close to the field red, and keying on colour punches
holes through the cheek and the neck; filling inward from the image border only
ever removes pixels genuinely connected to the outside. Edge pixels get one step
of feathering so the cut does not alias when the portrait is composited over the
lighter service colours.

It is **not graded and not grained**. Grading the logo would be retouching the
client's own mark.

### An alpha bug that would have shipped

The first pipeline wrote the portrait as AVIF and WebP. `ffprobe` reports the
AVIF as `gbrp` — **ffmpeg's libaom path silently drops the alpha plane**, and the
cut-out would have arrived as an opaque rectangle sitting inside the red disc.
WebP came through as `yuva420p`.

AVIF was dropped for anything with transparency, and `tools/images.mjs` now
**asserts** the alpha channel survives and throws if it does not, so the next
person to touch the encoder settings finds out immediately.

## The colour grade

One recipe, applied identically to every photograph so the set reads as one body
of work. Numeric, versioned, and re-runnable — `tools/images.mjs`.

```
eq=gamma=1.02:saturation=0.94
colorlevels=rimin=-0.012:gimin=-0.010:bimin=-0.008
colorbalance=rs=0.012:bs=-0.010
noise=alls=5..9:allf=t+u          scaled per output width
unsharp=5:5:0.45:5:5:0.0          output sharpening, at final size only
```

- **Saturation 0.94** pulls the environment back; the shopfront is already a very
  loud photograph.
- **Black point lifted** ~1.2% into a soft matte floor rather than clipping.
- **`rs=0.012 / bs=-0.010`** puts a whisper of the badge red into the shadows —
  single digits, enough to tie the photography to the palette.
- **Grain is luminance-only** (`allf=t+u`), 5–9 depending on output width so it
  survives at 480px instead of vanishing.
- **Sharpening runs last, at final size**, never before a resize.

**No duotone.** §9.4 suggests a two-colour treatment on background imagery. It
was considered and dropped: there is exactly one photograph, it is the shopfront,
and its own painted colours *are* the palette. Duotoning it would flatten the one
piece of real-world evidence the site has.

## The skin-tone check

§9.5 requires skin tones verified across the full range, darkest-skinned subjects
first. **No shipped image contains skin**, so the check has nothing to run
against — the shopfront is a wall and the portrait is a painting that was
deliberately left ungraded.

This is worth flagging rather than quietly ticking off. The moment real
photography arrives, this check becomes the most important one in the pipeline:
this is a barbershop whose owner and much of whose clientele are Black, and fade
work on textured hair is exactly where automatic correction fails. The grade
above was written with `saturation=0.94` on the environment and no per-channel
curve on midtones specifically so it can be applied to a portrait without pushing
skin toward orange, but that has not been tested on a real frame yet, and it must
be before any photograph of a person goes live.

## What was NOT used, and why

### Two client photographs — consent

The WordPress media library holds:

- `IMG_1333.mov` — 20.4s, 1920×1080, 30fps, 36.9 MB. A young man in the shop,
  freshly cut, close-up, being handed a styling product.
- `IMG_1456.webp` — 946×2048. The same person, a clean "after" shot of a
  mid-length cut.

Both are genuinely good, both would have carried a work section, and **neither
ships.** They are close-up, unambiguously identifiable faces, and neither is
published even on the client's own live page. Under §16.2, posting to Instagram
is not consent to appear on a commercial website.

They are the fastest win available: one message to that client turns both into
publishable assets.

### Instagram — unreachable and unresolved

`@labi_antwerp` is not readable without a login. Even if it were, §9.3's plan —
pull the grid, upscale it — runs into the same consent question on every frame
that contains a customer, and Instagram's ~1080px export is below spec for
anything full-bleed anyway.

### The nine service medallions — repurposed, not published

Nine 1024×1024 images of the same portrait on different backgrounds, named for
services that no longer exist (`beard-trim-and-line-up`, `…-with-head-wash`).
They are not used as images. **Their colours are the design system** — three
families, three services. Best thing found in the whole audit.

### Generated imagery — none

Zero. No haircut, no hairline, no fade, no person, no interior. The §9.7
permitted list (paper texture, halftone plates, light plates) was not needed
either: the halftone grain is nine lines of CSS and the "light" is a flat circle.

**No Higgsfield credits were spent.** Everything here — the cut-out, the grade,
the grain, the resizing, the encoding — is ffmpeg and a dependency-free PNG codec
running locally. The only operation that would have justified the pipeline is
upscaling the shopfront, and that is exactly the operation that would have
produced a banded, smeared wall.

## Per-asset QA

| Asset | Fade smoothness | Hair texture | Line-up crispness | Skin tone | Verdict |
|---|---|---|---|---|---|
| `shopfront-*` | n/a | n/a | n/a | n/a — no skin | **pass** |
| `portrait-*` | n/a — painting | n/a | cut-out edge clean on red, teal and yellow at 200% | n/a — painting, ungraded | **pass** |
| `og.*` | n/a | n/a | n/a | n/a | **pass** |
| `IMG_1333.mov` | not assessed | not assessed | not assessed | not assessed | **request-consent** |
| `IMG_1456.webp` | not assessed | not assessed | not assessed | not assessed | **request-consent** |
| Instagram grid | — | — | — | — | **request-original** |

The cut-out edge was checked by compositing the portrait over `--press`,
`#178fa4` and `#fee935` and inspecting at 200%: no red halo, no ringing, and the
hard bottom crop reads as intentional because it is — the original mark crops
there too.

## EXIF

Every output is re-encoded pixel-only through ffmpeg, which does not carry source
metadata into the result. Nothing shipped carries GPS. Worth keeping in mind for
whatever the client sends next: phone photos taken in a shop carry its
coordinates.
