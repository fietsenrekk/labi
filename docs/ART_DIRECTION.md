# Art direction

## The concept

**The shop paints its own sign.**

Two artefacts decided everything, and both belong to the client.

**The badge.** A flat red disc, `#bf2b27`. A painted portrait of a man with a
hi-top fade, cut out with a hard edge. The word `labi` laid straight across the
eyes in `#fee935`, so the counters of the *a* and the *b* sit exactly where the
pupils are. No gradient, no bevel, four colours at most.

**The shopfront.** On the wall at Klapdorp 37: overlapping flat circles in
yellow, red and deep purple, painted on grey render, with **FADED** across them
in chunky cut-out letters. A barbering pun, a paint pun, and — in a photograph
taken at street level — the actual thing a visitor sees.

The grammar is identical in both: **hard-edged circles, heavy geometric type, a
tight warm palette, and no rendering tricks whatsoever.** That is the design
system. It was not invented here; it was already on the wall.

So the page is built out of discs. They cluster and overlap in the hero the way
they overlap on the render. One of them is the badge. One of them is the light.

## What this replaced, and why

The brief specified a different concept — "a soul record, pressed at night" —
built on reading the logo as a record sleeve with a yellow lozenge containing the
wordmark, and a signature moment where **the lozenge detaches on scroll and
becomes the sticky booking button**.

There is no lozenge. The wordmark sits directly on the face. The mark is a
circular badge, not a square sleeve, and the only caption in the file reads
*"brewed with grace / 7.2% vol"* — it began life as a beer label. The brief's own
§4.3 warned "do not work from the small preview", and the sleeve reading is what
happens when you do. Full evidence in `FINDINGS.md`.

The instinct underneath it was right — flat graphic fields, a cropped portrait,
one word set enormous — and that instinct is what got built. It just got built
from the real artefacts instead of from Blue Note.

**The one that got away:** the record-sleeve idea would have been good. If the
name really is a Labi Siffre reference (`CLIENT_ACTIONS.md` §2), the soul-record
thread is worth pulling properly rather than as a guess.

## The signature moment

**The light is on when the shop is on.**

The hero's yellow disc is a lit shop window. When Labi is open it is solid
`#fee935`. When Labi is closed it drops to a 13% wash and the page goes quiet.
It is driven by the same clock as the status badge, and it changes on the minute.

Then, as the hero leaves, **the red disc travels to the top of the screen and
hands over to the booking button.** One object doing two jobs: it is the badge
while you are reading, and it is the way to book once you have decided. The
header's status pill and button are hidden until that hand-over happens, so the
page never shows you the same thing twice.

Why it could not be another shop's: the disc is their badge, the yellow is their
wordmark, and the hours that decide whether the light is on are hours nobody else
in Antwerp keeps.

**The alternative that was prototyped and killed:** a scroll-scrubbed video of a
single haircut, start to finish. It was cut for a reason that is not aesthetic —
the only footage available is a close-up of an identifiable client with no
consent on file (`FINDINGS.md`). It would be the stronger idea if that footage
existed. It is first in `SHOOT_LIST.md`.

## Palette

Four values, and the three service colours are also the client's.

| Token | Value | Where it came from |
|---|---|---|
| `--press` | `#bf2b27` | the badge field — 75.4% of the master lockup's pixels |
| `--label` | `#fee935` | the wordmark, and the light in the window |
| `--wax` | `#14100e` | warm near-black — the street at night |
| `--sleeve` | `#f2ece0` | bone — paper stock, the printed price list |

| Service | Colour | Source |
|---|---|---|
| Short | `#178fa4` | teal medallion, client's media library |
| Mid-length | `#1f826c` | green medallion |
| Long | `#e2851e` | orange medallion |

The client already had nine unused medallions in three colour families organised
by hair length. Three families, three services. The site uses their system rather
than inventing a parallel one.

**On the yellow-on-red risk** the brief flagged: the pairing is only used at
display scale, where it measures **4.68:1** — above the 3:1 large-text floor and
above the 4.5:1 normal-text floor as well. Body copy never sits on red. Every
route is axe-clean at zero violations, scanned with reduced motion forced on so
that content below the fold is actually evaluated rather than skipped for being
transparent.

## Type

- **Display — Anybody**, variable, weight 800, width 112%. Chunky and geometric
  enough to sit next to cut-out letters painted on a wall, and it has a width
  axis, which matters below.
- **Text — Inter Tight.** Neutral, warm, correct Dutch diacritics.
- **Numbers** are tabular everywhere. Three prices in a column and seven rows of
  times have to line up or the set piece falls apart.

**One real constraint shaped the scale: Dutch compound nouns.** "vrouwenprijs" at
390px in an expanded heavy face overruns the line, and because an ancestor hides
horizontal overflow it is *clipped silently* rather than scrolled — it simply
disappears off the right edge and nothing reports an error. The display scale is
sized against that word, the width axis narrows to 100% under 30em, and
`hyphens: auto` catches the rest. `tools/checks.mjs` now measures every text
element's scroll width against its client width on every route so this class of
bug cannot come back unnoticed.

## Light and dark

Sections run **night, red, light, night, light, night**.

This is not dark mode. Dark-because-barbershop is the reflex the brief warns
about. Here the dark bands are outside — the street at 21:40, where the discs are
lights — and the light bands are inside: the price list and the shopfront, things
printed on paper. The rhythm carries the argument the site is making.

## Grain

A **halftone dot**, not film noise: 4px radial dots at 6% over the whole
viewport. The shop's sign is flat painted colour, and a printed dot belongs to
that world in a way that photographic grain does not. Fixed in px so it does not
scale with zoom or device pixel ratio, and it drops the blend mode on phones
where full-viewport compositing is paid on every scrolled frame.

## What was removed

§7.8 asks for a whole section to be cut before shipping. Two were.

**The work gallery.** No photography this build is entitled to publish. Removing
it was not a design decision, but the page is better for it — there is no thin
grid of borrowed images between the prices and the hours.

**The story section.** The Kicks and Cuts / Macklemore history would have gone
here. It is unverified, so it is not on the site.

What is left is six sections, and each one is doing work: the sign, the pricing
thesis, the three prices, the week, the shopfront, and the booking.
