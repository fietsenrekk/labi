/**
 * Runtime.
 *
 * Two jobs, in this order of importance:
 *
 *   1. Keep the open/closed badge true. It is already correct in the HTML - the
 *      build renders it - so this only has to stop it going stale on a tab left
 *      open, and correct it for a visitor whose device clock disagrees with
 *      Brussels.
 *
 *   2. Motion, which is strictly optional and must never be load-bearing. The
 *      hidden-until-animated state is only ever applied when this file is
 *      running, and a failsafe removes it if the motion libraries do not
 *      arrive. A visitor on a dead 3G connection gets a static page, not a
 *      blank one.
 */
import { resolve, brusselsNow, label as statusLabel, isOpen } from './hours.js';

const html = document.documentElement;
const config = JSON.parse(document.getElementById('hours-config').textContent);

/* ----------------------------------------------------------- open / closed */

const statusNodes = [...document.querySelectorAll('[data-status-text]')];
const dayRows = [...document.querySelectorAll('.week tbody tr[data-day]')];

function paintStatus() {
  const now = brusselsNow();
  const status = resolve(config.hours, now);
  const text = statusLabel(status, config.status);
  for (const node of statusNodes) {
    if (node.textContent !== text) node.textContent = text;
  }
  html.dataset.open = String(isOpen(status));

  /*
    Move the "today" marker in the week table.

    This is not decoration, and forgetting it was a real bug: the marker was
    written into the HTML at build time and never touched again, so the table
    went on insisting it was Monday for as long as the build was old - while the
    status pill directly above it, which does re-render, correctly said
    Wednesday. Two clocks on one page, one of them stopped.

    Everything that depends on the current time is now painted from the same
    brusselsNow() call, on the same schedule.
  */
  for (const row of dayRows) {
    row.toggleAttribute('data-today', Number(row.dataset.day) === now.day);
  }
}

paintStatus();

// Re-check on the minute rather than on a timer that drifts, and again whenever
// the tab comes back - a phone in a pocket for two hours is the normal case.
let tick;
function scheduleTick() {
  clearTimeout(tick);
  const msToNextMinute = 60000 - (Date.now() % 60000) + 250;
  tick = setTimeout(() => { paintStatus(); scheduleTick(); }, msToNextMinute);
}
scheduleTick();
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { paintStatus(); scheduleTick(); }
});

/* ------------------------------------------------- header hand-over ------ */

/*
 * Hide the header's status pill and booking button while the hero's own pair is
 * on screen, and bring them in as it leaves.
 *
 * Deliberately an IntersectionObserver and not part of the GSAP timeline: this
 * is the booking button, and it is not allowed to depend on a library that may
 * fail to load. It also costs nothing under reduced motion - the class still
 * toggles, the CSS transition is simply switched off.
 */
{
  const masthead = document.querySelector('.masthead');
  const hero = document.querySelector('.sign');
  if (masthead && hero) {
    masthead.classList.add('is-top');
    new IntersectionObserver(
      ([entry]) => masthead.classList.toggle('is-top', entry.isIntersecting),
      { rootMargin: '-70px 0px 0px 0px', threshold: 0 },
    ).observe(hero);
  }
}

/* ------------------------------------------------------------- booking taps */

/**
 * No analytics ship with this build - the site sets no cookies and makes no
 * third-party requests, and it stays that way (§14, §16.3). Instead every
 * booking and call tap raises a DOM event, so a measurement tool can be added
 * later by listening for it, with consent, without touching this file.
 *
 * The number worth watching is which of the three lengths people tap.
 */
for (const el of document.querySelectorAll('[data-book], [data-call]')) {
  el.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('labi:tap', {
      detail: {
        action: el.hasAttribute('data-call') ? 'phone_click' : 'book_click',
        location: el.getAttribute('data-book') ?? 'phone',
        service: el.getAttribute('data-service') ?? null,
      },
    }));
  });
}

/* ------------------------------------------------------------------ motion */

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

/**
 * Under reduced motion nothing is registered at all - not a shorter animation,
 * not a faster one. The class that hides elements is never added, so there is
 * nothing to undo.
 */
if (!reduced.matches) {
  // `js-motion` is set by an inline script in <head> so the hidden state exists
  // before first paint. Setting it here instead made content paint, disappear,
  // and fade back in.
  html.classList.add('js-motion');

  // If the libraries never arrive, reveal everything and carry on. Content is
  // not allowed to depend on a network request for a decoration.
  const failsafe = setTimeout(() => html.classList.remove('js-motion'), 2500);

  const load = (src) => new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });

  const base = document.currentScript?.src.replace(/\/app\.js.*$/, '') ??
    new URL('.', import.meta.url).pathname.replace(/\/$/, '');

  try {
    await load(`${base}/vendor/gsap.min.js`);
    await Promise.all([
      load(`${base}/vendor/ScrollTrigger.min.js`),
      load(`${base}/vendor/lenis.min.js`),
    ]);

    const { gsap, ScrollTrigger, Lenis } = window;
    gsap.registerPlugin(ScrollTrigger);
    clearTimeout(failsafe);

    /* --- smooth scroll ---------------------------------------------------- */

    const lenis = new Lenis({ duration: 1.05, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.config({ ignoreMobileResize: true });

    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      /* --- the two variants, and only two -------------------------------- */

      const drop = (targets, trigger) => gsap.to(targets, {
        opacity: 1, y: 0, duration: 0.6, ease: 'expo.out', stagger: 0.05,
        scrollTrigger: { trigger, start: 'top 84%', once: true },
        clearProps: 'transform',
      });

      // The hero's discs land on load. Its words do not move: they are the
      // answer to "is it open, what does it cost, where do I tap", and they are
      // painted by the browser before any of this runs.
      //
      // fromTo, not from: the CSS hides the discs pre-paint so they cannot
      // flash at full size first, which means their "current" opacity is 0 and
      // a plain .from() would animate 0 to 0.
      if (document.querySelector('[data-disc]')) {
        gsap.fromTo('[data-disc]',
          { scale: 0.55, opacity: 0 },
          { scale: 1, opacity: 1, duration: 1.1, stagger: 0.08, ease: 'expo.out' });
      }

      // Everything below the fold, batched per section rather than per element.
      for (const section of document.querySelectorAll('main section:not(.sign)')) {
        const items = section.querySelectorAll('[data-anim="drop"]');
        if (items.length) drop(items, section);

        const media = section.querySelectorAll('[data-anim="reveal"]');
        for (const el of media) {
          gsap.to(el, {
            clipPath: 'inset(0 0 0% 0)', duration: 0.9, ease: 'expo.out',
            scrollTrigger: { trigger: el, start: 'top 86%', once: true },
          });
        }
      }

      // The hours table prints row by row, like a list coming off a press.
      const rows = document.querySelectorAll('.week tbody tr');
      if (rows.length) {
        gsap.from(rows, {
          opacity: 0, y: 12, duration: 0.5, ease: 'expo.out', stagger: 0.04,
          scrollTrigger: { trigger: '.week', start: 'top 82%', once: true },
        });
      }

      return () => {};
    });

    /* --- the signature: the red disc becomes the booking button ----------- */

    /*
      The hero's red disc is the badge. As the hero leaves, it travels to the
      booking button in the header and hands over to it.

      This is a scrubbed FLIP rather than GSAP's Flip plugin: Flip animates
      between two states on a timeline, and what is wanted here is the position
      tied to scroll, reversible, and re-measured whenever the layout changes.
      invalidateOnRefresh + function-based values do that, so a resize or a font
      swap cannot leave the disc parked in the wrong place.

      Desktop only. Below 48rem the header button is not rendered - the bottom
      dock does that job - so there is nothing to hand over to.
    */
    mm.add('(min-width: 48em) and (prefers-reduced-motion: no-preference)', () => {
      const disc = document.querySelector('[data-disc="press"]');
      const target = document.querySelector('.masthead .btn');
      const hero = document.querySelector('.sign');
      if (!disc || !target || !hero) return;

      gsap.set(target, { transformOrigin: '50% 50%' });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });

      tl.to(disc, {
        // Measured at refresh time, never cached across a resize.
        x: () => {
          const d = disc.getBoundingClientRect(), t = target.getBoundingClientRect();
          return (t.left + t.width / 2) - (d.left + d.width / 2);
        },
        y: () => {
          const d = disc.getBoundingClientRect(), t = target.getBoundingClientRect();
          return (t.top + t.height / 2) - (d.top + d.height / 2);
        },
        scale: () => {
          const d = disc.getBoundingClientRect(), t = target.getBoundingClientRect();
          return Math.max(t.height / d.height, 0.04);
        },
        opacity: 0,
        ease: 'none',
      }, 0);

      // The button's own arrival is handled by the IntersectionObserver above.
      // Animating its opacity here as well would fight the CSS class and leave
      // the primary call to action flickering mid-scroll.

      return () => gsap.set(disc, { clearProps: 'all' });
    });

    // Layout settles after fonts load; measurements taken before that are wrong.
    await document.fonts?.ready;
    ScrollTrigger.refresh();
  } catch {
    clearTimeout(failsafe);
    html.classList.remove('js-motion');
  }
}
