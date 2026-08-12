/**
 * All copy, both languages, in one file.
 *
 * Rules this copy was written under:
 *
 *   - Nothing is claimed that could not be traced to a source the business
 *     controls. No "premium grooming experience", no invented history, no
 *     testimonials. The facts do the work: three prices, twenty to thirty
 *     minutes, open until 22:00, cancel up to four hours ahead.
 *   - The Kicks and Cuts / Macklemore story is NOT here. It traces to one
 *     uncited aggregator page. docs/FINDINGS.md explains; CLIENT_ACTIONS.md
 *     asks the question.
 *   - Every sentence should stop being true if you swap "Labi" for another
 *     barbershop's name (§8.2). "Open when the rest of the city has locked up"
 *     survives that test. "Where craftsmanship meets style" does not, so it
 *     is not here.
 *   - The barber's own two lines are quoted, not paraphrased: "I don't do
 *     genders, I do hair … Same prices for all" and "No show is a no a go".
 *     Only whitespace was normalised.
 */

const DAYS_NL = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** The week reads Monday-first, the way a Belgian calendar does. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const CONTENT = {
  nl: {
    title: 'Labi — kapper in Antwerpen, open tot 22:00 | Klapdorp 37',
    description:
      'Kapper op Klapdorp 37 in Antwerpen, open tot 22:00. Woensdag, donderdag en vrijdag alleen ’s avonds. €35, €40 of €45 — naar lengte, niet naar geslacht. Boek online.',

    skip: 'Naar de inhoud',
    markTitle: 'Labi — naar de startpagina',
    langNav: 'Taal',
    quickNav: 'Snelle acties',
    book: 'Boek een stoel',
    call: 'Bel',
    callFull: 'Bel',
    seePrices: 'Prijzen',
    allBooking: 'Alles over boeken',
    min: 'min',
    ogAlt: 'Het merkteken van Labi: een geschilderd portret met een hi-top fade op een rood vlak, met het woord labi in geel over de ogen.',

    status: {
      open: 'Open',
      closed: 'Gesloten',
      until: 'tot',
      stillUntil: 'nog tot',
      opensToday: 'Opent vandaag om',
      opens: 'opent',
      days: DAYS_NL,
    },

    heroWord: 'Open als<br>de rest <em>sluit</em>.',
    heroLede:
      'Kapper op Klapdorp 37. Woensdag, donderdag en vrijdag gaat de deur pas om 20:00 open — en blijft open tot 22:00. Zondag en maandag de hele dag.',

    thesisH: 'Geen mannenprijs.<br>Geen vrouwenprijs.',
    thesisQuote: 'I don’t do genders, I do hair … Same prices for all',
    thesisCite: 'Alabi, op zijn eigen boekingspagina',
    thesisBody:
      'De prijs volgt de lengte van je haar en het werk dat het vraagt: tondeuse, tondeuse en schaar, of alleen schaar. Drie prijzen, en voor iedereen dezelfde drie.',

    pricesH: 'Drie prijzen.',
    pricesBody:
      'Elke regel boekt meteen die behandeling: je slaat de keuzelijst over en komt direct bij de vrije tijden uit.',

    weekH: 'De week.',
    weekBody:
      'Vijf dagen open, en elke keer tot 22:00. Woensdag, donderdag en vrijdag begint het pas om 20:00 — het uur waarop de rest van de stad de deur al op slot heeft gedaan. Dinsdag en zaterdag gesloten.',
    weekCaption: 'Wanneer je een stoel kunt boeken. Alle tijden in Antwerpen (Europe/Brussels).',
    colDay: 'Dag',
    colWhen: 'Wanneer',
    colTimes: 'Tijden',
    closedWord: 'Gesloten',
    todayWord: 'vandaag',
    hoursLabel: 'Openingsuren',
    dayOrder: WEEK_ORDER,
    days: DAYS_NL,

    shopH: 'Klapdorp 37.',
    shopAlt:
      'De gevel van Labi op Klapdorp: overlappende cirkels in geel, rood en donkerpaars, geschilderd op een grijze muur, met het woord FADED er in witte blokletters overheen.',
    shopCaption:
      'De gevel op Klapdorp. Het woord op de muur is van de zaak zelf — en de cirkels en de kleuren op deze site komen daar vandaan.',
    shopBody:
      'Klapdorp 37, 2000 Antwerpen. Boek je stoel vooraf, dan ligt je tijd vast voor je de deur uit gaat.',

    bookH: 'Boek een stoel.',
    bookBody:
      'Kies je lengte, kies je tijd. Je kunt tot een maand vooruit boeken, en annuleren of verzetten kan tot 4 uur voor je afspraak.',
    policy:
      'Het beleid van de zaak, in zijn eigen woorden: “No show is a no a go.”',

    bookTitle: 'Boeken | Labi — Klapdorp 37, Antwerpen',
    bookDescription:
      'Boek online bij Labi op Klapdorp 37 in Antwerpen. Kort €35, halflang €40, lang €45. Open tot 22:00.',
    bookPageH: 'Boeken.',
    bookPageLede: 'Drie lengtes, drie prijzen. Elke knop opent de agenda op precies die behandeling.',
    bookPageNote:
      'Boeken loopt via Setmore en opent in een nieuw tabblad. Je kunt tot een maand vooruit boeken; annuleren of verzetten kan tot 4 uur voor je afspraak. Deze site plaatst zelf geen cookies en meet je niet — pas op de boekingspagina van Setmore gelden hun eigen voorwaarden.',
    backHome: 'Terug',

    footFind: 'Waar',
    footTalk: 'Contact',
    footSee: 'Kijken',
    footBook: 'Boeken',
    privacy: 'Privacy & juridisch',
    builtNote: 'Geen cookies, geen trackers.',

    privacyTitle: 'Privacy & juridisch | Labi',
    privacyDescription: 'Privacyverklaring en ondernemingsgegevens van Labi, Klapdorp 37, Antwerpen.',
    privacyH: 'Privacy & juridisch',
    privacyBody: `
      <h2 style="font-size:var(--step-1);margin-top:2rem">Wat deze site bijhoudt</h2>
      <p style="margin-top:.75rem">Niets. Deze site plaatst geen cookies, laadt geen lettertypen, scripts of afbeeldingen van derden, en gebruikt geen analytics. Daarom staat er ook geen cookiebanner: er valt niets te aanvaarden.</p>

      <h2 style="font-size:var(--step-1);margin-top:2rem">Boeken</h2>
      <p style="margin-top:.75rem">Een afspraak maken gebeurt bij <a href="https://www.setmore.com/privacy" target="_blank" rel="noopener noreferrer">Setmore</a>, een externe dienst. Zodra je op een boekingsknop klikt, verlaat je deze site en gelden de voorwaarden en cookies van Setmore. De gegevens die je daar invult (naam, e-mail, telefoon) komen bij Setmore en bij de zaak terecht, niet bij deze website.</p>

      <h2 style="font-size:var(--step-1);margin-top:2rem">Contact</h2>
      <p style="margin-top:.75rem">Labi — Klapdorp 37, 2000 Antwerpen<br>
      Telefoon <a href="tel:+32468562324">+32 468 56 23 24</a><br>
      E‑mail <a href="mailto:alabivof@gmail.com">alabivof@gmail.com</a></p>

      <h2 style="font-size:var(--step-1);margin-top:2rem">Ondernemingsgegevens</h2>
      <p style="margin-top:.75rem">Dit is een previewversie van de website. De juridische handelsnaam en het ondernemingsnummer worden hier toegevoegd zodra de zaak ze bevestigt; zolang dat niet gebeurd is, staan ze er bewust niet, want een verzonnen nummer is erger dan geen nummer.</p>

      <h2 style="font-size:var(--step-1);margin-top:2rem">Openingsuren</h2>
      <p style="margin-top:.75rem">De uren op deze site zijn de uren waarop je een stoel kunt boeken, afgeleid uit het boekingssysteem van de zaak zelf. Klopt er iets niet? Bel even — dat is sneller dan een formulier.</p>
    `,
  },

  en: {
    title: 'Labi — barber in Antwerp, open until 22:00 | Klapdorp 37',
    description:
      'Barber at Klapdorp 37 in Antwerp, open until 22:00. Wednesday, Thursday and Friday evenings only. €35, €40 or €45 — priced by length, not by gender. Book online.',

    skip: 'Skip to content',
    markTitle: 'Labi — back to the home page',
    langNav: 'Language',
    quickNav: 'Quick actions',
    book: 'Book a chair',
    call: 'Call',
    callFull: 'Call',
    seePrices: 'Prices',
    allBooking: 'More about booking',
    min: 'min',
    ogAlt: 'The Labi mark: a painted portrait with a hi-top fade on a red field, the word labi in yellow across the eyes.',

    status: {
      open: 'Open',
      closed: 'Closed',
      until: 'until',
      stillUntil: 'only until',
      opensToday: 'Opens today at',
      opens: 'opens',
      days: DAYS_EN,
    },

    heroWord: 'Open when<br>the rest <em>shuts</em>.',
    heroLede:
      'A barber at Klapdorp 37. Wednesday, Thursday and Friday the door opens at 20:00 — and stays open until 22:00. Sunday and Monday, all day.',

    thesisH: 'No men’s price.<br>No women’s price.',
    thesisQuote: 'I don’t do genders, I do hair … Same prices for all',
    thesisCite: 'Alabi, on his own booking page',
    thesisBody:
      'The price follows the length of your hair and the work it takes: clippers, clippers and scissors, or scissors only. Three prices, and the same three for everyone.',

    pricesH: 'Three prices.',
    pricesBody:
      'Each row books that treatment directly — it skips the service picker and drops you straight on the free times.',

    weekH: 'The week.',
    weekBody:
      'Open five days, and every one of them until 22:00. Wednesday, Thursday and Friday it only starts at 20:00 — the hour the rest of the city has already locked up. Closed Tuesday and Saturday.',
    weekCaption: 'When you can book a chair. All times in Antwerp (Europe/Brussels).',
    colDay: 'Day',
    colWhen: 'When',
    colTimes: 'Times',
    closedWord: 'Closed',
    todayWord: 'today',
    hoursLabel: 'Opening hours',
    dayOrder: WEEK_ORDER,
    days: DAYS_EN,

    shopH: 'Klapdorp 37.',
    shopAlt:
      'The Labi shopfront on Klapdorp: overlapping circles in yellow, red and deep purple painted on a grey wall, with the word FADED across them in white block letters.',
    shopCaption:
      'The shopfront on Klapdorp. The word on the wall is the shop’s own — and the circles and colours on this site come from it.',
    shopBody:
      'Klapdorp 37, 2000 Antwerp. Book your chair first and your time is fixed before you leave the house.',

    bookH: 'Book a chair.',
    bookBody:
      'Pick your length, pick your time. You can book up to a month ahead, and cancel or move an appointment up to 4 hours beforehand.',
    policy: 'The shop’s policy, in its own words: “No show is a no a go.”',

    bookTitle: 'Book | Labi — Klapdorp 37, Antwerp',
    bookDescription:
      'Book online at Labi, Klapdorp 37, Antwerp. Short €35, mid-length €40, long €45. Open until 22:00.',
    bookPageH: 'Booking.',
    bookPageLede: 'Three lengths, three prices. Each button opens the calendar on that exact treatment.',
    bookPageNote:
      'Booking runs on Setmore and opens in a new tab. You can book up to a month ahead; cancelling or moving an appointment is possible up to 4 hours beforehand. This site sets no cookies and does not measure you — Setmore’s own terms apply once you reach their booking page.',
    backHome: 'Back',

    footFind: 'Where',
    footTalk: 'Contact',
    footSee: 'Look',
    footBook: 'Booking',
    privacy: 'Privacy & legal',
    builtNote: 'No cookies, no trackers.',

    privacyTitle: 'Privacy & legal | Labi',
    privacyDescription: 'Privacy statement and business details for Labi, Klapdorp 37, Antwerp.',
    privacyH: 'Privacy & legal',
    privacyBody: `
      <h2 style="font-size:var(--step-1);margin-top:2rem">What this site collects</h2>
      <p style="margin-top:.75rem">Nothing. This site sets no cookies, loads no third-party fonts, scripts or images, and runs no analytics. That is also why there is no cookie banner: there is nothing to accept.</p>

      <h2 style="font-size:var(--step-1);margin-top:2rem">Booking</h2>
      <p style="margin-top:.75rem">Appointments are made on <a href="https://www.setmore.com/privacy" target="_blank" rel="noopener noreferrer">Setmore</a>, a third-party service. The moment you click a booking button you leave this site and Setmore’s terms and cookies apply. The details you enter there (name, email, phone) go to Setmore and to the shop, not to this website.</p>

      <h2 style="font-size:var(--step-1);margin-top:2rem">Contact</h2>
      <p style="margin-top:.75rem">Labi — Klapdorp 37, 2000 Antwerp, Belgium<br>
      Phone <a href="tel:+32468562324">+32 468 56 23 24</a><br>
      Email <a href="mailto:alabivof@gmail.com">alabivof@gmail.com</a></p>

      <h2 style="font-size:var(--step-1);margin-top:2rem">Business details</h2>
      <p style="margin-top:.75rem">This is a preview version of the website. The registered trading name and company number will be added here once the shop confirms them; until then they are deliberately absent, because an invented number is worse than no number.</p>

      <h2 style="font-size:var(--step-1);margin-top:2rem">Opening hours</h2>
      <p style="margin-top:.75rem">The hours on this site are the hours you can book a chair, derived from the shop’s own booking system. Something wrong? Give the shop a call — it is faster than a form.</p>
    `,
  },
};
