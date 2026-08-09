# Findings

Everything below was checked against a live source on **2026-08-09**. Where the build
brief and the live source disagree, the live source wins and the brief's claim is
marked ✗.

The short version: the brief is right about the business and wrong about the artwork.
The hours, the prices, the address, the policy and the reputation all check out. The
logo is not what the brief describes, one "blocking" finding does not exist, and the
opening hours have a genuine internal contradiction that the brief did not catch.

---

## The logo is not a record sleeve ✗

The brief (§4.3) describes "a deep red field, edge to edge", a "cropped, geometric,
monochrome portrait", and "a warm yellow rounded lozenge, overlapping the face, with
'labi' set lowercase inside it". §7.6 then builds the entire signature interaction on
that lozenge detaching and becoming the sticky booking button.

What the file actually contains, read at full resolution:

| Brief | Actual |
|---|---|
| Square record sleeve, red edge to edge | **Circular badge** on white |
| Geometric monochrome portrait | **Oil-painted** portrait, full warm colour |
| Yellow rounded lozenge containing "labi" | **No lozenge.** "labi" is a flat yellow wordmark laid straight across the eyes |
| "Small caption type beneath" | Caption reads **"brewed with grace / 7.2% vol"** |

That caption is the giveaway: the artwork began life as a **beer label**, not a record
sleeve. The brief's §4.3 warned "do not work from the small preview" — and then did.

The signature moment in §7.6 is therefore not buildable as written. There is no lozenge
to detach. See `docs/ART_DIRECTION.md` for what replaced it, which is derived from the
same instinct — flat graphic fields, heavy type, a portrait — but from the real assets.

**Two things the brief missed, and both are better than what it proposed:**

1. **The shop's own facade is the design system.** The one photograph on `labiantwerp.be`
   is the shopfront: overlapping flat circles in yellow, red and deep purple, painted on
   a warm grey wall, with **"FADED"** across them in chunky cut-out letters. Flat circles,
   heavy geometric type, a tight warm palette — the same grammar as the badge, and it is
   literally the thing you stand in front of on Klapdorp.

2. **The client already has a colour system.** Nine unused images in the WordPress media
   library are the same portrait medallion in different background colours, and they are
   organised by service length:

   | Family | Colours | Maps to |
   |---|---|---|
   | Teal | `#178fa4` `#1a7b8f` `#1d5f6d` | short |
   | Green | `#1f826c` `#1d685a` `#1b5349` | mid-length |
   | Orange | `#e7a12e` `#e2851e` `#c76418` | long |
   | Red | `#e6504c`, badge `#bf2b27` | the shop itself |

   Three colour families for three services. The site uses the client's own system.

Sampled, not approximated: **press `#bf2b27`** (75.4% of the master lockup's pixels) and
**label `#fee935`**.

---

## The night thesis is real, but the quote is not ✗

§0.1 quotes the Setmore About field as: *"Hair salon open at night, privé defined by hair
type, not by gender."*

The field actually reads:

> **"I don't do genders , I do hair …Same prices for all"**

with the role set to "Hair Stylist". Nothing about night, and no "privé". The brief's
`privé defined by hair type` (F-008, "mixes languages mid-sentence") is a criticism of a
sentence that does not exist.

The underlying point survives and is stronger in the real words. The site uses the real
line. The "one client at a time / full attention" claim in §0.1 could not be sourced to
anything the business controls and is **not** on the site.

---

## F-002 does not exist ✗ — `labiantwerp.com` is not a domain

The brief calls this blocking: "Two live domains with contradictory information… Both are
live and indexed."

```
labiantwerp.com      NXDOMAIN
www.labiantwerp.com  NXDOMAIN
labiantwerp.be       188.208.37.5   ✓ live
```

There is no second domain, no contradiction, and nothing to consolidate or 301. The one
genuinely blocking finding in the brief is void, which is why this build did not stop.

---

## F-011 · The hours contradict themselves — this one is real, and the brief missed it

Setmore holds the hours in two different places and **they do not agree**.

What the booking page *displays* (`company.openingHours`):

```
Sun 11:00–17:00   Mon 10:30–22:30   Tue closed
Wed 20:00–22:30   Thu 20:00–22:30   Fri 20:00–22:30   Sat closed
```

What you can actually *book*, derived from the slots Setmore offers on clean future dates:

```
Sun 10:00–22:00   Mon 10:00–22:00   Tue closed
Wed 20:00–22:00   Thu 20:00–22:00   Fri 20:00–22:00   Sat closed
```

The brief copied the first set into its §11.3 config. It is the wrong one, and it is
wrong in the direction that costs the shop money: on a Sunday afternoon a site built on
the displayed hours says **GESLOTEN** while Setmore is actively selling slots until 22:00.

**How the bookable hours were derived.** Slot counts on unbooked future dates, at the
15-minute grid Setmore uses:

- Sun 16 Aug and Mon 17 Aug: 47 slots, 10:00 → 21:30. `(21:30−10:00)/15 + 1 = 47` ✓ contiguous.
- Wed 19, Thu 20, Fri 21 Aug: 7 slots, 20:00 → 21:30. `(21:30−20:00)/15 + 1 = 7` ✓ contiguous.
- Tue 11, Tue 18, Sat 1, 8, 15, 22 Aug: date disabled — **Tuesday and Saturday are genuinely
  closed** (answers an F-010 open question).

**Closing time is pinned to 22:00 exactly**, by running the probe against two different
service durations:

- 20-minute service, last start 21:30 → closing is in [21:50, 22:00]
- 30-minute service, last start 21:30 → closing is in [22:00, 22:15)

The two intervals intersect at a single value: **22:00**. If the shop closed at 22:30 as
displayed, the 30-minute service would offer a 22:00 start. It does not.

**Decision.** The site is built on the **bookable** hours, and it says so in the words it
uses: the hours table is headed "when you can book a chair", not "when the door is open".
That framing is the only one this build can stand behind, because bookability is exactly
what was measured. Resolving the underlying conflict needs the barber — top of
`CLIENT_ACTIONS.md`.

Five other sources give five more contradictory sets of hours (Barberhead, Wanderlog,
Waze, revieweuro, a search snippet). None is controlled by the business. All ignored.

---

## Verified, and used

| Claim | Status |
|---|---|
| Klapdorp 37, 2000 Antwerpen | ✓ `labiantwerp.be` + Setmore agree. Directories still say Lange Koepoortstraat 76 (F-001 correct: stale) |
| +32 468 56 23 24 | ✓ on `labiantwerp.be`. (`revieweuro` lists +32 492 08 03 94 — outlier, ignored) |
| alabivof@gmail.com | ✓ F-007 correct, a personal Gmail |
| €35 / €40 / €45 · 20 / 25 / 30 min | ✓ exact, from the live booking page |
| Three services, priced by length and technique | ✓ |
| "No show is a no a go" | ✓ verbatim |
| `og:locale` is `en_US` on a Belgian site | ✓ F-003 correct |
| 4.7 / 5 from 46 verified visitors | ✓ on Barberhead — but see below |
| Tuesday and Saturday closed | ✓ confirmed by disabled booking dates |
| Setmore reviews empty | ✓ |

**Two extra facts, pulled from the booking page's own config and used on the site because
they are concrete where the shop's policy line is not:** cancellation is possible up to
**4 hours** ahead (`cancellationTime` = 14400000 ms), and you can book up to **1 month**
ahead (`advanceBookingTime.month` = 1).

---

## Verified, and deliberately NOT used

**The Kicks and Cuts / Macklemore history (§4.4).** The brief presents this as fact and
§17 asks for it on the site. It traces to exactly one source — a Wanderlog aggregator page
— which **cites nothing**, and no owner-controlled source mentions it. Publishing an
unverified celebrity-visit claim on a real business's live site is not a risk worth taking
for one paragraph. It is in `CLIENT_ACTIONS.md` as a question. If Alabi confirms it, it is
a good story and it takes ten minutes to add.

**Reviews and testimonials.** The 4.7/46 rating is real but lives on a platform the
business does not control, and §16.2 requires permission to quote. The same Wanderlog page
that carries the good quotes also carries a bleeding-neck complaint and a no-show
complaint; cherry-picking one and not the other would be the dishonest half of a real
picture. **No testimonial section ships.** The site makes the price, the duration and the
cancellation window do that work instead.

**Client photography.** The WordPress media library holds a 20-second 1080p video and a
946×2048 photo of the same identifiable young man, freshly cut. Neither is published on
the live site. Under §16.2, Instagram posting is not consent to appear on a commercial
website, and these are close-up, unambiguously identifiable faces. **Not shipped.** Both
are logged in `docs/IMAGE_REPORT.md` and requested in `CLIENT_ACTIONS.md`.

The consequence is honest and worth stating plainly: **there is no work gallery on this
site, because there is no photography this build is entitled to publish.** §9's shot ladder
cannot be filled from an Instagram grid that is login-walled and a media library of two
consent-unknown files. `SHOOT_LIST.md` exists to fix that, headed by the shot that matters.
