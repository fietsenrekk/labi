# For Alabi — what the site needs from you

Ordered by what it costs to leave undone. The first item is the only one that
can actively send someone to a closed door.

---

## 1. ⚠ Your opening hours contradict themselves inside Setmore

This is the one to fix first, and it takes five minutes.

Setmore stores your hours in two places, and they disagree:

| | Sunday | Monday | Wed / Thu / Fri |
|---|---|---|---|
| What your booking page **displays** | 11:00–17:00 | 10:30–22:30 | 20:00–22:30 |
| What people can actually **book** | 10:00–22:00 | 10:00–22:00 | 20:00–22:00 |

The displayed hours come from your business profile. The bookable hours come
from your staff working hours, and those are the ones that decide what a
customer sees on the calendar.

Right now someone reading your booking page on a Sunday afternoon is told you
shut at 17:00, while your calendar is quietly selling them a 20:45 slot.

**This site uses the bookable hours**, because those are the ones that were
measured and the ones a customer can act on. It also says "when you can book a
chair" rather than "opening hours", so it never claims your door is open at a
time nobody verified.

**What to do:** in Setmore, open your business profile and your staff working
hours and make them match reality. Then tell us which is right, and we change
one file — `data/business.json`, the `hours` block, seven lines — and the whole
site follows: the OPEN/CLOSED badge, the week chart, and the hours Google reads.

**Also worth knowing:** if the door really is open outside the bookable window,
say so and we will split the two on the site — "open for walk-ins" and "bookable"
are allowed to be different things, they just have to be labelled.

---

## 2. Is "Labi" a reference to Labi Siffre?

Asked because the answer changes the art direction, and because guessing at it
would be worse than asking. The badge is a painted portrait with a hi-top fade
in a style that reads 1970s soul, and the site leans on that reading. If the
name comes from somewhere else entirely, tell us and we will follow the real
story instead.

While we are here: **where does the badge artwork come from, and who painted
it?** The file on your site still carries the caption **"brewed with grace /
7.2% vol"**, which suggests it started life as a beer label. If there is an
artist to credit, they should be credited.

---

## 3. Confirm the Kicks and Cuts / Macklemore story — it is not on the site

There is a story circulating that Labi was formerly **Kicks and Cuts**, a
barbershop combined with a secondhand sneaker store, and that **Macklemore came
in shortly after it opened**.

It is a genuinely good story and it is **deliberately not on the website**,
because it traces to a single travel-aggregator page that cites no source, and
none of your own pages mention it. Publishing an unverified celebrity visit on a
real business's website is not a risk worth taking for one paragraph.

**Confirm it and we will add it** — it is the best content the brand has, and it
is about twenty minutes of work. Worth saying: is the sneaker side still
running? If it is, that belongs on the site too.

---

## 4. Original photographs — the biggest single quality win

**There is no gallery of your work on this site, because there is no photography
we are entitled to publish.**

What exists today:

- The **shopfront** photo (the FADED wall). Used. It is 1440px wide, which is
  small for a full-width image, so the layout never stretches it past its real
  size. A proper photo of that wall would let it fill the screen.
- A **20-second video** and a **portrait photo** of a client, both sitting in
  your website's media library, neither published. **Not used.** They are
  close-up, clearly identifiable faces, and posting something to Instagram is not
  the same as that person agreeing to appear on a commercial website.
- Your Instagram grid. Not reachable without a login, and the same consent
  question applies to every frame of it.

**What to send:** the original camera-roll files, not Instagram exports — the
export is about 1080px and throws away most of the detail. And for any photo with
a recognisable client in it, a yes from that client.

A shot of the back of someone's head is often the better photograph anyway: it
shows the line-up and the fade, which is what people are actually buying, and it
raises no consent question at all.

See `SHOOT_LIST.md` for what to shoot, in priority order.

---

## 5. What actually happens if someone does not show up?

Your policy currently reads, in full:

> **"No show is a no a go"**

It has voice, and the site keeps it word for word. But a customer cannot tell
what it means in practice. Is it a fee? A refusal to rebook? Nothing, just
disappointment?

**Tell us the real consequence in one sentence** and we will write it in the same
register. Nothing was invented in the meantime — the site says what is verifiably
true instead: you can cancel or move up to **4 hours** ahead, and book up to **1
month** out. Both of those came from your own Setmore settings.

---

## 6. Business details for the legal page

The privacy page currently says, in plain words, that the trading name and
company number will be added once confirmed — and explains that an invented
number would be worse than none. To finish it we need:

- The registered **trading name**
- The **ondernemingsnummer / BTW number**
- Whether you want a complaints route listed beyond phone and email

---

## 7. Fix the stale directory listings

Several sites still list your old address, **Lange Koepoortstraat 76**, and each
one lists different opening hours:

| Where | Address | Hours shown |
|---|---|---|
| Barberhead | Lange Koepoortstraat 76 | Mon–Thu 10–18, Fri 10–20, Sat 10–18, Sun 12–17 |
| Fresha | Lange Koepoortstraat | — |
| Wanderlog | Klapdorp 37 | Mon–Fri 10–14 & 15–20, Sat 10–18, Sun closed |
| Waze / revieweuro | Klapdorp 37 | 11:00–19:00, and a phone number that is not yours |

None of these is under your control, and all of them are wrong in some way. A
wrong address on Google is money walking to the wrong door. Claim the Google
Business Profile first — that is the one most people actually see.

**Also:** `revieweuro` lists **+32 492 08 03 94** as your number. Your own site
and Setmore both say **+32 468 56 23 24**. Worth knowing which is out there.

---

## 8. A branded email address

`alabivof@gmail.com` works, and it is on the site because it is the real address.
On a site built to look like this it is the one detail that undercuts the rest.
`hallo@labiantwerp.be` costs nothing and you already own the domain.

---

## 9. Smaller things

- **Setmore has zero reviews** — "Be the first to review us" — while Barberhead
  shows **4.7 out of 5 from 46 people**. Your reputation is real and it is sitting
  on a platform you do not own. Ask the next few customers to leave it where it
  helps you.
- **Public holidays are not in the hours config.** Nothing was guessed. When you
  know your closures, they go in the same file.
- **`labiantwerp.com` does not exist** — it was listed as a live second site in
  the brief, but it returns no DNS record at all. Nothing to fix; noted so nobody
  goes looking for it.
- **Two typos on your live booking page**: "Man of women" and the service names
  have stray spaces and capitals. The site writes them cleanly in Dutch and
  English; the Setmore page still shows the originals if you want to tidy them
  there too.
