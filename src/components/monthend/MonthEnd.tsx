'use client';

// Month-end section: the product's days-present report for one vendor, clipped on top of the reports for the other
// vendors (OpsPro splits reports by vendor, the unit businesses bill in). Per picker: shift type, full, half and
// absent days, and billable days, with the month's alerts as notes, each resolved in the app. Scrolling drifts the sheets at different speeds (no pinning). When the
// report is in view, the billable total counts up and a Verified stamp lands. The markup is the finished state, so
// reduced motion and no-JS see it complete. Names and numbers are example data; vendors are kept neutral.
import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import s from './monthend.module.css';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

const DAYS = 30; // September
type Day = 'f' | 'h' | 'a' | 'o' | 'n'; // full, half, absent, day off, not rostered
// each picker's month: weekly days off from `off`, then the absent and half days on top
const day = (off: number, absent: number[] = [], half: number[] = []): Day[] =>
  Array.from({ length: DAYS }, (_, d) => (absent.includes(d) ? 'a' : half.includes(d) ? 'h' : (d + off) % 7 === 6 ? 'o' : 'f'));
const LINES = [
  { name: 'Aisha K.', shift: '11+1', days: day(0) },
  { name: 'Nimal P.', shift: '11+1', days: day(2) },
  { name: 'Sana R.', shift: '10+1', days: day(1) },
  { name: 'Rohan T.', shift: '11+1', days: day(4, [20]) },
  { name: 'Musa B.', role: 'Reliever', shift: '11+1', days: Array.from({ length: DAYS }, (_, d) => (d === 20 ? 'f' : 'n') as Day) },
  { name: 'Faisal A.', shift: '8+1', days: day(5, [], [11, 18]) },
  { name: 'Bilal S.', shift: '10+1', days: day(3, [6, 7]) },
];
// the month's alerts, as the app names them, each resolved
const NOTES = [
  { day: '9 Sep', what: 'Nimal P. arrived 60+ min late', fix: 'Warning issued by Sara M.' },
  { day: '15 Sep', what: 'Sana R. missed clock-out', fix: 'Auto-closed at finish + 30 min.' },
  { day: '21 Sep', what: 'Rohan T. no-show', fix: 'Reliever Musa B. deployed.' },
  { day: '26 Sep', what: 'Faisal A. face flagged', fix: 'Checked and approved.' },
];

const count = (d: Day[], k: Day) => d.filter((x) => x === k).length;
const billable = (d: Day[]) => count(d, 'f') + count(d, 'h') / 2;
const SUM = (k: Day) => LINES.reduce((a, l) => a + count(l.days, k), 0);
const TOTAL = LINES.reduce((a, l) => a + billable(l.days), 0);
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const Mark = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="#00CCBC" strokeWidth="2.4" strokeDasharray="4.2 2.4" /><circle cx="12" cy="12" r="4" fill="#0F1A1A" /></svg>;
// the other vendors' reports: a header and a few lines of content, mostly hidden under the top sheet
const Back = ({ vendor }: { vendor: string }) => (
  <div className={s.sheet}>
    <p className={s.backHead}><Mark />Days present<b>{vendor}</b></p>
    <div className={s.backRows}>{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</div>
  </div>
);

export default function MonthEnd() {
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    const el = root.current!;
    const q = gsap.utils.selector(el);
    const stage = el.querySelector<HTMLElement>('[data-stage]')!;
    const total = el.querySelector<HTMLElement>('[data-total]')!;

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      SplitText.create(el.querySelector('[data-title]'), {
        type: 'lines', mask: 'lines', autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, { yPercent: 100, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: el, start: 'top 75%', once: true } }),
      });
      gsap.from(q('[data-rise]'), { y: 24, autoAlpha: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 75%', once: true } });

      // once the bottom of the report is in view: the billable total counts up, then the stamp lands with a thump
      const o = { v: 0 };
      gsap.timeline({ scrollTrigger: { trigger: q('[data-doc]')[0], start: 'bottom 92%', once: true } })
        .fromTo(o, { v: 0 }, { v: TOTAL, duration: 1.4, ease: 'power2.out', onUpdate: () => { total.textContent = fmt(Math.round(o.v * 2) / 2); } })
        .fromTo(q('[data-stamp]'), { scale: 1.9, rotate: -2, autoAlpha: 0 }, { scale: 1, rotate: -8, autoAlpha: 1, duration: 0.42, ease: 'back.out(1.6)' }, 1.3)
        .fromTo(q('[data-doc]'), { y: 0 }, { y: 4, duration: 0.08, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 1.64);
    });

    // the stack, tied to the scroll (no pinning). Entrance while the stage climbs to the upper third of the screen,
    // a hold, then the sheets fan apart on the way out. One timeline, so entrance and exit never fight.
    mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
      const [b2, b1, front] = ['[data-sheet="b2"]', '[data-sheet="b1"]', '[data-sheet="front"]'].map((x) => q(x)[0]);
      gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: stage, start: 'top bottom', end: 'bottom top', scrub: 1 } })
        // in: the statement rises tipped back and settles; the other two sweep in from the sides, spinning
        .fromTo(front, { y: 420, rotationX: 52, rotation: -7, scale: 0.8, autoAlpha: 0.85 }, { y: 0, rotationX: 0, rotation: -1, scale: 1, autoAlpha: 1, duration: 3.6, ease: 'power3.out' }, 0)
        .fromTo(b1, { x: 640, y: 380, rotation: 34, rotationX: 30, autoAlpha: 0 }, { x: 44, y: -38, rotation: 4, rotationX: 0, autoAlpha: 1, duration: 3.6, ease: 'power3.out' }, 0.3)
        .fromTo(b2, { x: -680, y: 460, rotation: -38, rotationX: 30, autoAlpha: 0 }, { x: -50, y: -62, rotation: -6, rotationX: 0, autoAlpha: 1, duration: 3.6, ease: 'power3.out' }, 0.5)
        .fromTo(q('[data-clip]'), { y: -140, rotation: -40, autoAlpha: 0 }, { y: 0, rotation: -4, autoAlpha: 1, duration: 1.2, ease: 'back.out(2)' }, 2.6)
        .fromTo(q('[data-doc] tbody tr, [data-doc] [data-adj] li'), { x: -28, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.5, stagger: 0.18, ease: 'power2.out' }, 1.6)
        // out: the stack fans apart at different speeds
        .to(b2, { x: -150, y: -260, rotation: -14, duration: 3 }, 7)
        .to(b1, { x: 170, y: -340, rotation: 13, duration: 3 }, 7)
        .to(front, { y: -90, rotation: 1.5, duration: 3 }, 7);
    });

    // phones: the statement alone, rising and settling with the scroll
    mm.add('(max-width: 899px) and (prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(q('[data-sheet="front"]'), { y: 160, rotationX: 28, scale: 0.92, autoAlpha: 0.3 },
        { y: 0, rotationX: 0, scale: 1, autoAlpha: 1, ease: 'power3.out', scrollTrigger: { trigger: stage, start: 'top bottom', end: 'top 30%', scrub: 1 } });
    });
  }, { scope: root });

  return (
    <section ref={root} id="month-end" className={s.section} aria-labelledby="monthend-title">
      <div className={s.inner}>
        <header className={s.head}>
          <h2 id="monthend-title" className={s.title} data-title>Nobody rebuilds timesheets on the 30th anymore.</h2>
          <p className={s.sub} data-rise>
            Late starts, no-shows and missed clock-outs get sorted the day they happen. On the 30th, the days-present
            report for every vendor is already right.
          </p>
        </header>

        <div className={s.stage} data-stage>
          {/* the reports for the other two vendors, underneath */}
          <div className={`${s.layer} ${s.back2}`} data-sheet="b2" aria-hidden="true"><Back vendor="Vendor C" /></div>
          <div className={`${s.layer} ${s.back1}`} data-sheet="b1" aria-hidden="true"><Back vendor="Vendor B" /></div>

          {/* the report on top, clipped to the stack */}
          <div className={`${s.layer} ${s.front}`} data-sheet="front">
            <svg className={s.clip} data-clip viewBox="0 0 40 110" aria-hidden="true">
              <defs><linearGradient id="clipMetal" x1="0" x2="1"><stop offset="0" stopColor="#8E9A9A" /><stop offset="0.45" stopColor="#F4F7F7" /><stop offset="1" stopColor="#7C8888" /></linearGradient></defs>
              <path d="M12 104V22a8 8 0 0 1 16 0v70a5 5 0 0 1-10 0V30" fill="none" stroke="url(#clipMetal)" strokeWidth="3.2" strokeLinecap="round" />
            </svg>
            <article className={`${s.sheet} ${s.doc}`} data-doc aria-label={`Days present report for Vendor A, September 2026: ${fmt(TOTAL)} billable days across ${LINES.length} pickers, all alerts resolved.`}>
              <header className={s.docHead}>
                <p className={s.brand}><Mark />OpsPro</p>
                <p className={s.issued}>Exported 30 Sep 2026</p>
              </header>
              <h3 className={s.docTitle}>Days present</h3>
              <p className={s.period}>Vendor A · 1–30 September 2026 · all shift types</p>

              <dl className={s.summary}>
                <div><dt>Pickers</dt><dd>{LINES.length}</dd></div>
                <div><dt>Rostered days</dt><dd>{SUM('f') + SUM('h') + SUM('a')}</dd></div>
                <div><dt>Absent</dt><dd>{SUM('a')}</dd></div>
                <div><dt>Alerts</dt><dd>{NOTES.length}<small>all resolved</small></dd></div>
              </dl>

              <table className={s.table}>
                <thead>
                  <tr><th>Picker</th><th className={s.hideSm}>Shift</th><th>Full</th><th>Half</th><th>Absent</th><th>Billable</th></tr>
                </thead>
                <tbody>
                  {LINES.map((l) => (
                    <tr key={l.name}>
                      <td>{l.name}<small>{'role' in l ? l.role : 'Picker'}</small></td>
                      <td className={s.hideSm}>{l.shift}</td>
                      <td>{count(l.days, 'f')}</td>
                      <td>{count(l.days, 'h')}</td>
                      <td>{count(l.days, 'a')}</td>
                      <td>{fmt(billable(l.days))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td>Total</td><td className={s.hideSm} /><td>{SUM('f')}</td><td>{SUM('h')}</td><td>{SUM('a')}</td><td><span data-total>{fmt(TOTAL)}</span></td></tr>
                </tfoot>
              </table>

              {/* the month's alerts, each sorted the day it happened */}
              <section className={s.notes} data-adj>
                <p className={s.label}>Notes</p>
                <ol>
                  {NOTES.map((x) => <li key={x.day}><time>{x.day}</time><span>{x.what}. {x.fix}</span></li>)}
                </ol>
              </section>

              <footer className={s.foot}>
                <span>Built from geofenced, face-checked clock-ins against the roster</span>
                <span>Page 1 of 1</span>
              </footer>
              <div className={s.stamp} data-stamp aria-hidden="true">
                <b>Verified</b>
                <span>All alerts resolved</span>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
