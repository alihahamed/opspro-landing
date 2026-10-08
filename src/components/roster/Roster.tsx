'use client';

// Roster section: next week's roster as live HTML. Each shift chip says what it is and when (Morning 7am–4pm).
// On enter, a check sweeps across the week. Each clash it finds (no rest, double booking, a visa that runs out) gets a
// callout on its cell, which turns into the fix and then clears. The roster is published from the toolbar and the
// "seen by" count runs up. Plays once. The markup is the finished state, so reduced motion and no-JS see the fixed,
// published week. Names are invented.
import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import s from './roster.module.css';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

type Kind = 'M' | 'E' | 'N' | 'two' | 'rel';
// a cell: a shift, off, leave, or a clash shown as `was` until fixed, then `now`
type Cell = Kind | 'off' | 'leave' | { was: Kind; now: Kind; i: number };

const DAYS = [['Mon', '5'], ['Tue', '6'], ['Wed', '7'], ['Thu', '8'], ['Fri', '9'], ['Sat', '10'], ['Sun', '11']];
const ROWS: { name: string; role: string; cells: Cell[] }[] = [
  { name: 'Aisha K.', role: 'Supervisor', cells: ['M', 'M', 'off', 'M', 'M', 'M', 'off'] },
  { name: 'Nimal P.', role: 'Picker', cells: ['M', 'off', 'M', { was: 'two', now: 'M', i: 1 }, 'M', 'off', 'M'] },
  { name: 'Sana R.', role: 'Picker', cells: ['off', 'N', { was: 'M', now: 'E', i: 0 }, 'off', 'N', 'N', 'off'] },
  { name: 'Chinedu O.', role: 'Driver', cells: ['M', 'M', 'M', 'off', 'M', { was: 'M', now: 'rel', i: 2 }, 'off'] },
  { name: 'Bilal S.', role: 'Packer', cells: ['leave', 'leave', 'M', 'M', 'off', 'M', 'M'] },
];
// in column order, so the sweep finds them left to right
const ISSUES = [
  { day: 2, found: 'No rest after her night shift', fixed: 'Moved to the evening shift' },
  { day: 3, found: 'Two shifts that overlap', fixed: 'Evening shift removed' },
  { day: 5, found: 'Visa expires on Friday', fixed: 'Jomar R. covers Saturday' },
];
const SHIFT = { M: ['Morning', '7am–4pm'], E: ['Evening', '3pm–11pm'], N: ['Night', '11pm–7am'] };
const WORKERS = 58;

const I = {
  M: <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="2.6" /><path d="M8 1.8v1.4M8 12.8v1.4M1.8 8h1.4M12.8 8h1.4M3.6 3.6l1 1M11.4 11.4l1 1M3.6 12.4l1-1M11.4 4.6l1-1" /></svg>,
  E: <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 10.5a4.5 4.5 0 0 1 9 0M1.8 13h12.4M8 3v2M3.4 5.4l1.1 1.1M12.6 5.4l-1.1 1.1" /></svg>,
  N: <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8Z" /></svg>,
  rel: <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="6.5" cy="5.5" r="2.5" /><path d="M2 13.5a4.5 4.5 0 0 1 9 0M12.5 5.5v4M10.5 7.5h4" /></svg>,
  check: <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 8.4 2.6 2.6L12 5.4" /></svg>,
  alert: <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 4.6v4.2M8 11.2v.2" /></svg>,
};

function Chip({ k }: { k: Kind }) {
  if (k === 'two') return <b className={s.chip} data-k="two" data-chip><span>7am–4pm</span><span>3pm–11pm</span></b>;
  if (k === 'rel') return <b className={s.chip} data-k="rel" data-chip><small>{I.rel}Reliever</small><span>Jomar R.</span></b>;
  return <b className={s.chip} data-k={k} data-chip><small>{I[k]}{SHIFT[k][0]}</small><span>{SHIFT[k][1]}</span></b>;
}

export default function Roster() {
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const el = root.current!;
      const q = gsap.utils.selector(el);
      const board = el.querySelector<HTMLElement>('[data-board]')!;
      const scan = el.querySelector<HTMLElement>('[data-scan]')!;
      const status = el.querySelector<HTMLElement>('[data-status]')!;
      const days = q('[data-day]') as HTMLElement[];
      const clashes = q('[data-clash]') as HTMLElement[];
      const set = (i: number, st: string) => { clashes.find((c) => c.dataset.clash === String(i))!.dataset.state = st; };
      const say = (t: string) => { status.textContent = t; };
      // start: an unchecked draft
      ISSUES.forEach((_, i) => set(i, 'idle'));
      board.dataset.published = 'false';
      say('Draft');

      SplitText.create(el.querySelector('[data-title]'), {
        type: 'lines', mask: 'lines', autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, { yPercent: 100, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: el, start: 'top 70%', once: true } }),
      });

      const SWEEP = 1.5; // seconds to cross the whole week, not counting stops
      const o = { n: 0 };
      const tl = gsap.timeline({ scrollTrigger: { trigger: board, start: 'top 75%', once: true } })
        .from(board, { y: 48, autoAlpha: 0, duration: 0.9, ease: 'expo.out' })
        .from(q('[data-chip]'), { scale: 0.85, autoAlpha: 0, duration: 0.4, ease: 'back.out(1.8)', stagger: 0.008 }, 0.25)
        .call(() => say('Checking…'), [], 0.95)
        .fromTo(scan, { x: days[0].offsetLeft, width: days[0].offsetWidth, autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 0.95);
      // the check sweeps the week and stops at each clash: found, fixed, cleared, then on
      let t = 1.1, at = 0;
      [...ISSUES, { day: 6 }].forEach((x, i) => {
        const seg = SWEEP * ((x.day - at) / 6);
        tl.to(scan, { x: days[x.day].offsetLeft, duration: seg, ease: 'none' }, t);
        t += seg; at = x.day;
        if (i === ISSUES.length) return;
        tl.call(() => { set(i, 'found'); say('Clash found'); }, [], t)
          .call(() => { set(i, 'fixed'); say(`${i + 1} of ${ISSUES.length} fixed`); }, [], t + 0.75)
          .call(() => set(i, 'done'), [], t + 1.45);
        t += 1.5;
      });
      tl.to(scan, { autoAlpha: 0, duration: 0.3 }, t)
        .call(() => say('All clear'), [], t);
      const PUB = t + 0.5;
      tl.call(() => { board.dataset.published = 'true'; }, [], PUB)
        .to(o, { n: WORKERS, duration: 1.2, ease: 'power2.out', onUpdate: () => say(`Seen by ${Math.round(o.n)} of ${WORKERS}`) }, PUB + 0.3);
    });
  }, { scope: root });

  return (
    <section ref={root} id="roster" className={s.section} aria-labelledby="roster-title">
      <div className={s.inner}>
        <h2 id="roster-title" className={s.title} data-title>A weekly roster that checks itself before your team sees it.</h2>

        <div className={s.board} data-board data-published="true">
          <header className={s.bar}>
            <span className={s.store}><i className={s.storePhoto} /><span><b>Marina dark store</b>Roster for 5–11 October</span></span>
            <span className={s.status} data-status aria-live="off">Seen by {WORKERS} of {WORKERS}</span>
            <span className={s.btn} aria-hidden="true"><em className={s.btnIdle}>Publish roster</em><em className={s.btnDone}>{I.check}Published</em></span>
          </header>

          <div className={s.scroll}>
            <div className={s.grid} role="img" aria-label="Weekly roster for five workers at Marina. Three clashes were caught and fixed before it was published.">
              <span className={s.scan} data-scan aria-hidden="true" />
              <span className={s.head} />
              {DAYS.map(([d, n]) => <span key={d} className={`${s.head} ${s.day}`} data-day><b>{d}</b>{n}</span>)}

              {ROWS.map((r) => (
                <div key={r.name} className={s.row}>
                  <span className={s.who}>
                    <i className={s.face} style={{ backgroundImage: `url(/people/${r.name.split(' ')[0].toLowerCase()}.webp)` }} />
                    <span><b>{r.name}</b>{r.role}</span>
                  </span>
                  {r.cells.map((c, j) => typeof c === 'object' ? (
                    <span key={j} className={s.cell} data-clash={c.i} data-state="done">
                      <span className={s.was}><Chip k={c.was} /></span>
                      <span className={s.now}><Chip k={c.now} /></span>
                      <span className={s.tip} aria-hidden="true">
                        <span className={s.found}>{I.alert}{ISSUES[c.i].found}</span>
                        <span className={s.fixed}>{I.check}{ISSUES[c.i].fixed}</span>
                      </span>
                    </span>
                  ) : (
                    <span key={j} className={s.cell}>
                      {c === 'off' ? <em>Off</em> : c === 'leave' ? <em className={s.leave}>On leave</em> : <Chip k={c} />}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
