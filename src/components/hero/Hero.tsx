'use client';

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { AnimatePresence, motion } from 'motion/react';
import stores from '@/data/stores.json';
import type { Card, Status } from './HeroMap';
import { fadeGradient, ZONE_DESKTOP, ZONE_MOBILE } from './zone';
import s from './hero.module.css';

gsap.registerPlugin(SplitText, ScrollTrigger, useGSAP);

const HeroMap = dynamic(() => import('./HeroMap'), { ssr: false });
const TOTAL = 188;
const STORES_ONLINE_AT = 1400; // ms, after the headline lands
const CARD_GAP = 320; // px between open notifications (card is 272 wide)
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (x: number) => Math.min(1, Math.max(0, x));

/** Simulated shift: stores come online, then a check-in, late or no-show event every ~3.5s. Never real data. */
function useShiftSim(eligible: RefObject<Map<string, number>>, dive: RefObject<number>) {
  const [statuses, setStatuses] = useState<Record<string, Status>>(
    () => Object.fromEntries(stores.map((st) => [st.id, 'idle'])),
  );
  const [cards, setCards] = useState<Record<string, Card | undefined>>({});
  const [onShift, setOnShift] = useState(96);

  useEffect(() => {
    const setStatus = (id: string, v: Status) => setStatuses((p) => ({ ...p, [id]: v }));
    const setCard = (id: string, c?: Card) => setCards((p) => ({ ...p, [id]: c }));

    const timers = new Set<number>();
    const at = (ms: number, fn: () => void) => {
      const id = window.setTimeout(() => { timers.delete(id); fn(); }, ms);
      timers.add(id);
    };
    const stop = () => timers.forEach(clearTimeout);

    if (reducedMotion()) {
      at(0, () => {
        setStatuses(Object.fromEntries(stores.map((st) => [st.id, 'active'])));
        setCards({ [stores[0].id]: { kind: 'in', state: 'Picker clocked in', store: `${stores[0].brand} ${stores[0].name}`, meta: 'Selfie verified · 6/10 on shift' } });
        setOnShift(112);
      });
      return stop;
    }

    stores.forEach((st, i) => at(STORES_ONLINE_AT + i * 450, () => setStatus(st.id, 'active')));

    let n = 96;
    const tick = () => {
      n = n < 112 ? n + 1 : Math.min(TOTAL - 3, n + (Math.random() < 0.75 ? 1 : 0));
      setOnShift(n);
      at(n < 112 ? 90 : 2200, tick);
    };
    at(STORES_ONLINE_AT, tick);

    const open = new Set<string>(); // stores currently showing a card (max 2 on screen)
    const event = () => {
      // Only stores whose pin and card sit clear of the copy's fade (reported by HeroMap each frame).
      // …and far enough (on screen) from any card already showing, so notifications never collide.
      const xs = [...open].map((id) => eligible.current.get(id)).filter((x) => x !== undefined);
      const free = stores.filter((st) => {
        const x = eligible.current.get(st.id);
        return x !== undefined && !open.has(st.id) && xs.every((ox) => Math.abs(ox - x) > CARD_GAP);
      });
      if (open.size < 2 && free.length && dive.current < 0.02) { // no new events mid-dive
        const st = free[Math.floor(Math.random() * free.length)];
        const [inCount, total] = st.roster;
        const store = `${st.brand} ${st.name}`;
        const close = (after: number) => at(after, () => { setCard(st.id); setStatus(st.id, 'active'); open.delete(st.id); });
        const roll = Math.random();
        open.add(st.id);
        // The moments OpsPro watches for: a verified clock-in, a late picker, a no-show covered by a reliever.
        if (roll < 0.5) {
          setCard(st.id, { kind: 'in', state: 'Picker clocked in', store, meta: `Selfie verified · ${Math.min(total, inCount + 1)}/${total} on shift` });
          close(3800);
        } else if (roll < 0.75) {
          setStatus(st.id, 'late');
          setCard(st.id, { kind: 'late', state: `Picker ${12 + Math.floor(Math.random() * 30)} min late`, store, meta: 'Clocked in after the 10:00 start' });
          close(4400);
        } else {
          setStatus(st.id, 'noshow');
          setCard(st.id, { kind: 'noshow', state: 'No-show on 10:00 shift', store, meta: 'Finding a reliever…' });
          at(2800, () => {
            setStatus(st.id, 'active');
            setCard(st.id, { kind: 'reliever', state: 'Reliever sent', store, meta: 'Arriving in 12 min' });
          });
          close(6400);
        }
      }
      at(3500, event);
    };
    at(STORES_ONLINE_AT + stores.length * 450 + 600, event);

    return stop;
  }, [eligible, dive]);

  return { statuses, cards, onShift };
}

/** Each digit sits in a fixed-width slot and rolls when it changes (no tabular-nums, see DESIGN.md §3). */
function Counter({ n }: { n: number }) {
  return (
    <span className={s.count}>
      {String(n).split('').map((c, i) => (
        <span key={i} className={s.digit}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={c} initial={{ y: '-70%', opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              exit={{ y: '70%', opacity: 0 }} transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}>
              {c}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}

/**
 * The one CTA, with a hover that acts out a clock-in: the dashed geofence ring closes, fills and
 * gets a ✓, while the label rolls letter by letter to the next step. CSS only (see hero.module.css).
 */
function ClockInButton({ href, label, next }: { href: string; label: string; next: string }) {
  const letters = (text: string) =>
    [...text].map((ch, i) => (
      <span key={i} style={{ '--i': i } as CSSProperties}>{ch === ' ' ? ' ' : ch}</span>
    ));
  return (
    <a href={href} className={`btn btn-primary btn-lg ${s.cta}`} aria-label={label}>
      <svg className={s.ctaIcon} viewBox="0 0 24 24" aria-hidden="true">
        <circle className={s.ctaRing} cx="12" cy="12" r="9" />
        <path className={s.ctaCheck} d="M8 12.5l2.6 2.6L16 9.5" />
      </svg>
      <span className={s.ctaLabels} aria-hidden="true">
        <span className={s.ctaLabel}>{letters(label)}</span>
        <span className={s.ctaLabelNext}>{letters(next)}<span className={s.ctaArrow}>→</span></span>
      </span>
    </a>
  );
}

const LINKS = [
  { href: '#product', label: 'Product' },
  { href: '#how', label: 'How it works' },
  { href: '#vendors', label: 'For vendors' },
  { href: '#contact', label: 'Contact' },
];

/** Current time in Dubai, the timezone the ops dashboard runs on. Blank until mounted (no hydration mismatch). */
function DubaiClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', hour: '2-digit', minute: '2-digit', hour12: false });
    const tick = () => setTime(fmt.format(new Date()));
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 10_000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, []);
  return <span className={s.clock}>Dubai<span className={s.clockTime}>{time || '--:--'}</span>GST</span>;
}

/** Floating nav: no bar or background. Links are centred on the page, and a glass pill slides between them on hover. */
function Nav() {
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <header className={s.nav} data-intro="nav">
      <div className={s.brand}>
        <Link href="/" className={s.logo} aria-label="OpsPro home">
          {/* Geofence ring: the store radius a clock-in has to fall inside */}
          <svg className={s.logoMark} viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" fill="none" stroke="var(--teal)" strokeWidth="2.4" strokeDasharray="4.2 2.4" />
            <circle cx="12" cy="12" r="4" fill="var(--ink)" />
          </svg>
          OpsPro
        </Link>
        <span className={s.navDivider} aria-hidden="true" />
        <DubaiClock />
      </div>

      <nav className={s.links} aria-label="Main" onMouseLeave={() => setHovered(null)}>
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} className={s.link} onMouseEnter={() => setHovered(l.href)} onFocus={() => setHovered(l.href)}>
            {hovered === l.href && (
              <motion.span layoutId="nav-hover" className={s.linkPill}
                transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }} />
            )}
            {l.label}
          </a>
        ))}
      </nav>

      <a href="https://app.opspro.ae" className={s.login}>
        Log in
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M5 11 11 5M6 5h5v5" /></svg>
      </a>
    </header>
  );
}

// The scroll dive tells how OpsPro works, at one real store. Each stage has a caption (left) and a
// moment on the map (the store's card and status). `at` is where the stage starts in scroll progress.
const DIVE_STORE = 'circle-mall';
const DIVE_STORE_NAME = 'Spinneys Circle Mall JVC';
const STAGES: { at: number; step: number; card: Card; status: Status }[] = [
  { at: 0.1, step: 0, status: 'active', card: { kind: 'in', state: 'Shift started · 10:00', store: DIVE_STORE_NAME, meta: '6 of 10 pickers clocked in' } },
  { at: 0.34, step: 1, status: 'active', card: { kind: 'in', state: 'Clocked in at 09:58', store: DIVE_STORE_NAME, meta: 'Selfie matched · inside the 200\u00a0m geofence' } },
  { at: 0.58, step: 2, status: 'noshow', card: { kind: 'noshow', state: 'No-show on 10:00 shift', store: DIVE_STORE_NAME, meta: 'Alert sent to the supervisor' } },
  { at: 0.69, step: 2, status: 'active', card: { kind: 'reliever', state: 'Reliever sent', store: DIVE_STORE_NAME, meta: 'Arriving in 12 min' } },
  { at: 0.8, step: 3, status: 'active', card: { kind: 'hours', state: '62.5 h verified today', store: DIVE_STORE_NAME, meta: 'Ready for billing · 0 disputes' } },
];
const STEPS = [
  { time: '09:30', title: 'The roster is set', body: 'Ten pickers due, 10:00 to 21:00.', stats: ['6 of 10 in'] },
  { time: '09:58', title: 'Every clock-in is checked', body: 'The selfie has to match and the phone has to be at the store.', stats: ['Match 0.94', '38 m away'] },
  { time: '10:01', title: 'A no-show, caught at 10:01', body: 'A reliever is on the way before the store notices.', stats: ['Reliever in 12 min'] },
  { time: '21:00', title: 'The hours are already checked', body: 'Your report and the vendor’s invoice say the same thing.', stats: ['62.5 h verified', '0 disputes'] },
];

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const fade = useRef<HTMLDivElement>(null);
  const story = useRef<HTMLDivElement>(null);
  const eligible = useRef(new Map<string, number>());
  const dive = useRef(0); // 0 = hero at rest → 1 = end of the story (scrubbed by scroll)
  const [stage, setStage] = useState(-1); // index into STAGES, -1 = not diving
  const { statuses, cards, onShift } = useShiftSim(eligible, dive);

  useGSAP(() => {
    gsap.set('[data-intro]', { autoAlpha: 1 });
    if (reducedMotion()) return;
    SplitText.create('[data-intro="title"]', {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      onSplit: (self) => gsap.from(self.lines, { yPercent: 100, duration: 1, ease: 'expo.out', stagger: 0.06 }),
    });
    gsap.from('[data-intro="rise"]', { y: 24, autoAlpha: 0, duration: 0.6, ease: 'expo.out', stagger: 0.06, delay: 0.3 });
    gsap.from('[data-intro="nav"]', { y: -8, autoAlpha: 0, duration: 0.6, ease: 'expo.out' });

    root.current!.style.setProperty('--exit', '0'); // no bottom fade until the hero starts to leave

    // Scroll dive: pin the hero for the four-step story; HeroMap reads `dive` to steer the camera.
    let current = -1;
    gsap.timeline({
      scrollTrigger: {
        trigger: root.current, start: 'top top', end: '+=320%', pin: true, scrub: 0.6,
        onUpdate: (st) => {
          dive.current = st.progress;
          const next = STAGES.findLastIndex((x) => st.progress >= x.at);
          // How far through the current step we are: fills the timeline connector below the active node.
          const step = next >= 0 ? STAGES[next].step : -1;
          const from = STAGES.find((x) => x.step === step)?.at ?? 0;
          const to = STAGES.find((x) => x.step === step + 1)?.at ?? 1;
          story.current?.style.setProperty('--sp', String(clamp((st.progress - from) / (to - from))));
          // Spotlight in as the dive starts, out over the last stretch so the handoff to the next section stays soft.
          root.current?.style.setProperty('--exit', String(clamp((st.progress - 0.93) / 0.07)));
          root.current?.style.setProperty('--dim', String(clamp((st.progress - 0.04) / 0.1) * (1 - clamp((st.progress - 0.93) / 0.07))));
          if (next !== current) setStage((current = next));
        },
      },
    })
      .to(copy.current, { y: -80, autoAlpha: 0, ease: 'power1.in', duration: 0.08 }, 0)
      .to(fade.current, { opacity: 0, ease: 'none', duration: 0.1 }, 0.02)
      .to({}, { duration: 0.9 }); // the rest of the scroll belongs to the story
  }, { scope: root });

  // While diving, the scene narrows to one store: its card and status follow the story.
  const beat = stage >= 0 ? STAGES[stage] : null;
  const shownCards = beat ? { [DIVE_STORE]: { ...beat.card, featured: true } } : cards;
  const shownStatuses = beat ? { ...statuses, [DIVE_STORE]: beat.status } : statuses;

  return (
    <section ref={root} className={s.hero}>
      <div className={s.mapLayer} role="region" aria-label="Live preview: delivery bikes across Dubai and stores lighting up as pickers clock in">
        <HeroMap statuses={shownStatuses} cards={shownCards} eligible={eligible} dive={dive} diveStore={DIVE_STORE} />
      </div>

      {/* Spotlight for the dive: the edges dim in a colour that follows the story, the store stays bright. */}
      <div className={s.diveTint} data-stage={stage} aria-hidden="true" />

      {/* The story told during the dive: a dark shift log, the one dark object on the map. Each step is a timestamped
          entry on a rail that fills with scroll; past entries collapse to a line, the current one opens. */}
      <div ref={story} className={s.story} aria-live="polite">
        <AnimatePresence>
          {beat && (
            <motion.div key="story" className={s.storyCard} data-step={beat.step}
              initial={{ opacity: 0, y: 56, scale: 0.95, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -40, scale: 0.95, filter: 'blur(6px)', transition: { duration: 0.3, ease: [0.4, 0, 1, 1] } }}
              transition={{ type: 'spring', duration: 0.6, bounce: 0.16 }}>
              <div className={s.storyHead}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" fill="none" stroke="var(--teal)" strokeWidth="2.4" strokeDasharray="4.2 2.4" />
                  <circle cx="12" cy="12" r="4" fill="#F2F6F6" />
                </svg>
                <b>Shift log</b>{DIVE_STORE_NAME}
                <span>{beat.step + 1} of {STEPS.length}</span>
              </div>
              <ol className={s.storyLog}>
                {STEPS.map((st, i) => {
                  const state = i < beat.step ? 'done' : i === beat.step ? 'active' : 'todo';
                  return (
                    <li key={st.title} className={s.storyRow} data-state={state}>
                      <time>{st.time}</time>
                      <div>
                        <h3>{st.title}</h3>
                        <AnimatePresence initial={false}>
                          {state === 'active' && (
                            <motion.div key="more" className={s.storyMore}
                              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
                              <p className={s.storyBody}>{st.body}</p>
                              <div className={s.storyStats}>{st.stats.map((x) => <span key={x} className={s.storyStat}>{x}</span>)}</div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <svg className={s.storyCheck} viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                    </li>
                  );
                })}
              </ol>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div ref={fade} className={s.fade} aria-hidden="true" style={{
        '--fade-desktop': fadeGradient(ZONE_DESKTOP),
        '--fade-mobile': fadeGradient(ZONE_MOBILE),
      } as CSSProperties} />

      {/* The map melts into the page at the bottom, so the next section starts without a hard edge. */}
      <div className={s.bottomFade} aria-hidden="true" />

      <Nav />

      <div ref={copy} className={s.copy}>
        <h1 className={s.title} data-intro="title">Know who&apos;s on the floor at every store.</h1>
        <p className={s.sub} data-intro="rise">
          OpsPro records when each picker arrives and leaves, confirmed by selfie and location, so month-end reports match what happened in the stores.
        </p>
        <div className={s.ctas} data-intro="rise">
          <ClockInButton href="#demo" label="Book a live demo" next="Pick a time" />
        </div>
        <p className={s.live} data-intro="rise">
          <span className={s.liveDot} aria-hidden="true" />
          <Counter n={onShift} />
          <span className={s.liveLabel}>&nbsp;/ {TOTAL} pickers on shift now</span>
        </p>
      </div>
    </section>
  );
}
