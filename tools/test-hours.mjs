#!/usr/bin/env node
/**
 * Boundary tests for the open/closed engine (§13 check 3).
 *
 * Every case is expressed as a UTC instant with its known Brussels local time in
 * the name, because that is the only way to test the DST cases honestly - a test
 * written in local time would pass by assuming exactly the thing under test.
 *
 *   node tools/test-hours.mjs
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { resolve, brusselsNow } from '../src/hours.js';

const business = JSON.parse(
  await readFile(path.resolve(import.meta.dirname, '../data/business.json'), 'utf8'),
);
const HOURS = business.hours;

let pass = 0;
const failures = [];

function check(utc, expectLocal, expected) {
  const at = new Date(utc);
  const now = brusselsNow(at);
  const got = resolve(HOURS, now);

  const localGot = `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.day]} ${String(
    Math.floor(now.minutes / 60),
  ).padStart(2, '0')}:${String(now.minutes % 60).padStart(2, '0')}`;

  const summary = got
    ? [got.state, got.closesAt ?? got.opensAt, got.day ?? ''].filter(String).join(' ')
    : 'null';

  const okLocal = localGot === expectLocal;
  const okState = summary.startsWith(expected);

  if (okLocal && okState) {
    pass++;
  } else {
    failures.push(
      `${utc}\n    local  expected ${expectLocal}  got ${localGot}` +
        `\n    state  expected ${expected}  got ${summary}`,
    );
  }
}

/* --- Monday: the long day, 10:00-22:00 (summer, Brussels = UTC+2) ---------- */
check('2026-08-10T07:59:00Z', 'Mon 09:59', 'opens-today 10:00');
check('2026-08-10T08:00:00Z', 'Mon 10:00', 'open 22:00');
check('2026-08-10T19:14:00Z', 'Mon 21:14', 'open 22:00');          // 46 min left
check('2026-08-10T19:15:00Z', 'Mon 21:15', 'closing-soon 22:00');  // 45 min left
check('2026-08-10T19:59:00Z', 'Mon 21:59', 'closing-soon 22:00');
check('2026-08-10T20:00:00Z', 'Mon 22:00', 'opens-later 20:00 3');  // shut; next is Wed

/* --- Tuesday: closed all day ---------------------------------------------- */
check('2026-08-11T10:00:00Z', 'Tue 12:00', 'opens-later 20:00 3');
check('2026-08-11T21:00:00Z', 'Tue 23:00', 'opens-later 20:00 3');

/* --- Wednesday: the evening-only day, 20:00-22:00 -------------------------- */
check('2026-08-12T17:59:00Z', 'Wed 19:59', 'opens-today 20:00');
check('2026-08-12T18:00:00Z', 'Wed 20:00', 'open 22:00');
check('2026-08-12T19:16:00Z', 'Wed 21:16', 'closing-soon 22:00');
check('2026-08-12T20:00:00Z', 'Wed 22:00', 'opens-later 20:00 4');  // next is Thu

/* --- Friday night rolls to Sunday, not Saturday --------------------------- */
check('2026-08-14T20:00:00Z', 'Fri 22:00', 'opens-later 10:00 0');
check('2026-08-15T12:00:00Z', 'Sat 14:00', 'opens-later 10:00 0');

/* --- Sunday: the case the brief's config got wrong ------------------------- */
// The displayed hours say Sunday shuts at 17:00. Setmore sells slots until
// 22:00, so 17:01 on a Sunday must read OPEN, not closed. FINDINGS F-011.
check('2026-08-09T15:01:00Z', 'Sun 17:01', 'open 22:00');
check('2026-08-09T19:59:00Z', 'Sun 21:59', 'closing-soon 22:00');
check('2026-08-09T20:00:00Z', 'Sun 22:00', 'opens-later 10:00 1');

/* --- DST. Both directions, across the actual 2026 transitions ------------- */
// Last Sunday in March: 02:00 CET -> 03:00 CEST. After it, Brussels is UTC+2,
// so 08:00Z is 10:00 local and the shop is open. A naive UTC+1 implementation
// would report 09:00 and say closed.
check('2026-03-29T08:00:00Z', 'Sun 10:00', 'open 22:00');
check('2026-03-29T07:59:00Z', 'Sun 09:59', 'opens-today 10:00');

// Last Sunday in October: 03:00 CEST -> 02:00 CET. After it Brussels is UTC+1,
// so 08:00Z is 09:00 local and the shop has not opened yet.
check('2026-10-25T08:00:00Z', 'Sun 09:00', 'opens-today 10:00');
check('2026-10-25T09:00:00Z', 'Sun 10:00', 'open 22:00');

// Immediately either side of the autumn switch, inside the repeated hour.
check('2026-10-25T00:30:00Z', 'Sun 02:30', 'opens-today 10:00');  // still CEST
check('2026-10-25T01:30:00Z', 'Sun 02:30', 'opens-today 10:00');  // now CET, same wall clock

/* --- The visitor's own timezone must not leak in --------------------------- */
// Node honours TZ at startup; this asserts the engine ignores it.
const original = process.env.TZ;
process.env.TZ = 'Pacific/Auckland';
check('2026-08-10T08:00:00Z', 'Mon 10:00', 'open 22:00');
process.env.TZ = 'America/Los_Angeles';
check('2026-08-10T08:00:00Z', 'Mon 10:00', 'open 22:00');
if (original === undefined) delete process.env.TZ; else process.env.TZ = original;

/* -------------------------------------------------------------------------- */

console.log(`hours engine: ${pass}/${pass + failures.length} boundary cases pass`);
if (failures.length) {
  console.error('\nFAILED:\n' + failures.map((f) => '  ' + f).join('\n\n'));
  process.exit(1);
}
