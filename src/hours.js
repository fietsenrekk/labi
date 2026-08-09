/**
 * The open/closed engine.
 *
 * One module, imported by the build to render the static state into the markup
 * and loaded by the browser to keep it live. There is deliberately no second
 * implementation to drift out of sync.
 *
 * Two rules it exists to enforce:
 *
 *   1. Always Europe/Brussels. Never the visitor's clock. Someone checking from
 *      London at 21:00 needs to know the shop shuts in an hour, not that it is
 *      already closed. The timezone is applied through Intl, so DST is handled
 *      by the IANA database rather than by arithmetic I would have to get right
 *      twice a year.
 *
 *   2. The times are BOOKABLE hours, derived from Setmore's own availability -
 *      not the hours Setmore displays, which disagree with it. See
 *      docs/FINDINGS.md F-011. The copy says "book" everywhere for that reason:
 *      the site only ever claims what was actually measured.
 */

/** Minutes since midnight, or null if the string is not "HH:MM". */
export function toMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function fromMinutes(mins) {
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * The current weekday and time in Brussels, whatever the host clock is set to.
 * `formatToParts` is used rather than string parsing because the en-GB long
 * format is not guaranteed stable across ICU versions.
 */
export function brusselsNow(date = new Date(), timeZone = 'Europe/Brussels') {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (t) => parts.find((p) => p.type === t)?.value;
  const days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const day = days[get('weekday')];
  // hourCycle h23 still emits "24" for midnight in some ICU builds.
  const hour = Number(get('hour')) % 24;
  const minute = Number(get('minute'));
  return { day, minutes: hour * 60 + minute };
}

const CLOSING_SOON_MINUTES = 45;

/**
 * Resolves the shop's state.
 *
 * Returns one of:
 *   { state: 'open',         closesAt }
 *   { state: 'closing-soon', closesAt, minutesLeft }
 *   { state: 'opens-today',  opensAt }
 *   { state: 'opens-later',  opensAt, day }      day is 0-6
 *
 * `hours` is the seven-key config from data/business.json.
 */
export function resolve(hours, now = brusselsNow()) {
  const intervals = (d) => (hours[String(d)] ?? []).map(([o, c]) => [toMinutes(o), toMinutes(c)]);

  for (const [open, close] of intervals(now.day)) {
    if (now.minutes >= open && now.minutes < close) {
      const minutesLeft = close - now.minutes;
      return minutesLeft <= CLOSING_SOON_MINUTES
        ? { state: 'closing-soon', closesAt: fromMinutes(close), minutesLeft }
        : { state: 'open', closesAt: fromMinutes(close) };
    }
  }

  // Later today?
  const later = intervals(now.day)
    .filter(([open]) => open > now.minutes)
    .sort((a, b) => a[0] - b[0])[0];
  if (later) return { state: 'opens-today', opensAt: fromMinutes(later[0]) };

  // The next day that has any hours at all. Bounded at 7 so a fully empty
  // config returns null rather than spinning.
  for (let step = 1; step <= 7; step++) {
    const day = (now.day + step) % 7;
    const next = intervals(day).sort((a, b) => a[0] - b[0])[0];
    if (next) return { state: 'opens-later', opensAt: fromMinutes(next[0]), day };
  }
  return null;
}

/** True if the shop can be walked into right now. Used for the "light on". */
export const isOpen = (s) => s?.state === 'open' || s?.state === 'closing-soon';

/**
 * The badge text. Kept here, next to the state machine, so a new state cannot
 * be added without someone having to write its words.
 */
export function label(status, t) {
  if (!status) return t.closed;
  switch (status.state) {
    case 'open':
      return `${t.open} · ${t.until} ${status.closesAt}`;
    case 'closing-soon':
      return `${t.open} · ${t.stillUntil} ${status.closesAt}`;
    case 'opens-today':
      return `${t.opensToday} ${status.opensAt}`;
    case 'opens-later':
      return `${t.closed} · ${t.opens} ${t.days[status.day]} ${status.opensAt}`;
  }
}
