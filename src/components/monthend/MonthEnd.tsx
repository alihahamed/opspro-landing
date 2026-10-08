'use client';

// Month-end section: what payroll actually gets at the end of the month, a vendor statement built from verified
// hours, clipped on top of the statements for the other vendors. The month's four exceptions are listed on the
// statement itself as adjustments, each tagged on the line it touched. Scrolling through drifts the sheets at
// different speeds (no pinning) so the stack fans out. When the statement is in view, the total counts up and a red
// Approved stamp lands on it. The markup is the finished state, so reduced motion and no-JS see it complete.
// All data is invented.
import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import s from './monthend.module.css';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

const RATE: Record<string, number> = { Picker: 28, Driver: 32, Reliever: 30, Packer: 26 }; // AED per hour
const LINES = [
  { name: 'Aisha K.', role: 'Picker', shifts: 26, hours: 208 },
  { name: 'Nimal P.', role: 'Picker', shifts: 26, hours: 207.6, note: 1 },
  { name: 'Sana R.', role: 'Picker', shifts: 26, hours: 208, note: 2 },
  { name: 'Rohan T.', role: 'Driver', shifts: 25, hours: 200, note: 3 },
  { name: 'Musa B.', role: 'Reliever', shifts: 1, hours: 8, note: 3 },
  { name: 'Faisal A.', role: 'Packer', shifts: 26, hours: 208, note: 4 },
  { name: 'Bilal S.', role: 'Packer', shifts: 24, hours: 192 },
];
// the month's exceptions, each settled the day it happened
const NOTES = [
  { n: 1, day: '9 Sep', what: 'Nimal P. clocked in 22 min late', fix: '0.4 h deducted · Sara M.' },
  { n: 2, day: '15 Sep', what: 'Sana R. didn’t clock out', fix: 'Closed at 23:00 · Sara M.' },
  { n: 3, day: '21 Sep', what: 'Rohan T. didn’t show', fix: 'Covered by Musa B.' },
  { n: 4, day: '26 Sep', what: 'Faisal A.’s selfie didn’t match', fix: 'Checked and approved' },
];
const VAT = 0.05;

const amount = (l: (typeof LINES)[number]) => l.hours * RATE[l.role];
const HOURS = LINES.reduce((a, l) => a + l.hours, 0);
const SUB = LINES.reduce((a, l) => a + amount(l), 0);
const TOTAL = SUB * (1 + VAT);
const money = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const hrs = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const Mark = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="#00CCBC" strokeWidth="2.4" strokeDasharray="4.2 2.4" /><circle cx="12" cy="12" r="4" fill="#0F1A1A" /></svg>;
const Tick = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 8.4 2.6 2.6L12 5.4" /></svg>;
// the other vendors' statements: a header and a few lines of content, mostly hidden under the top sheet
const Back = ({ vendor }: { vendor: string }) => (
  <div className={s.sheet}>
    <p className={s.backHead}><Mark />Vendor statement<b>{vendor}</b></p>
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

      // once the bottom of the statement is in view: the total counts up, then the stamp lands with a thump
      const o = { v: 0 };
      gsap.timeline({ scrollTrigger: { trigger: q('[data-doc]')[0], start: 'bottom 92%', once: true } })
        .fromTo(o, { v: 0 }, { v: TOTAL, duration: 1.4, ease: 'power2.out', onUpdate: () => { total.textContent = money(o.v); } })
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
            Late starts, no-shows and missed clock-outs get sorted the day they happen. On the 30th, every vendor
            gets a statement built from hours that were already checked.
          </p>
        </header>

        <div className={s.stage} data-stage>
          {/* the statements for the other two vendors, underneath */}
          <div className={`${s.layer} ${s.back2}`} data-sheet="b2" aria-hidden="true"><Back vendor="Gulf Crew Services" /></div>
          <div className={`${s.layer} ${s.back1}`} data-sheet="b1" aria-hidden="true"><Back vendor="Swift Manpower" /></div>

          {/* the statement on top, clipped to the stack */}
          <div className={`${s.layer} ${s.front}`} data-sheet="front">
            <svg className={s.clip} data-clip viewBox="0 0 40 110" aria-hidden="true">
              <defs><linearGradient id="clipMetal" x1="0" x2="1"><stop offset="0" stopColor="#8E9A9A" /><stop offset="0.45" stopColor="#F4F7F7" /><stop offset="1" stopColor="#7C8888" /></linearGradient></defs>
              <path d="M12 104V22a8 8 0 0 1 16 0v70a5 5 0 0 1-10 0V30" fill="none" stroke="url(#clipMetal)" strokeWidth="3.2" strokeLinecap="round" />
            </svg>
            <article className={`${s.sheet} ${s.doc}`} data-doc aria-label={`Vendor statement for September 2026: ${hrs(HOURS)} verified hours, AED ${money(TOTAL)} due to Crescent Staffing LLC, approved and sent.`}>
              <header className={s.docHead}>
                <div>
                  <p className={s.brand}><Mark />OpsPro</p>
                  <h3 className={s.docTitle}>Vendor statement</h3>
                  <p className={s.period}>September 2026 · Circle Mall JVC</p>
                </div>
                <dl className={s.meta}>
                  <div><dt>Statement</dt><dd>VS-2609-014</dd></div>
                  <div><dt>Period</dt><dd>1–30 Sep 2026</dd></div>
                  <div><dt>Issued</dt><dd>30 Sep 2026</dd></div>
                </dl>
              </header>

              <div className={s.parties}>
                <p><span>From</span><b>Crescent Retail</b>Circle Mall JVC, Dubai</p>
                <p><span>To</span><b>Crescent Staffing LLC</b>Al Quoz Industrial 3, Dubai</p>
              </div>

              <table className={s.table}>
                <thead>
                  <tr><th>Worker</th><th className={s.hideSm}>Role</th><th>Shifts</th><th>Verified h</th><th className={s.hideSm}>Rate</th><th>Amount</th></tr>
                </thead>
                <tbody>
                  {LINES.map((l) => (
                    <tr key={l.name}>
                      <td>{l.name}{'note' in l && <sup className={s.tag}>{l.note}</sup>}</td>
                      <td className={s.hideSm}>{l.role}</td>
                      <td>{l.shifts}</td>
                      <td>{hrs(l.hours)}</td>
                      <td className={s.hideSm}>{RATE[l.role].toFixed(2)}</td>
                      <td>{money(amount(l))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className={s.lower}>
                {/* what was adjusted this month, and who sorted it, the same day */}
                <section className={s.adj} data-adj>
                  <p className={s.label}>Adjustments, all settled the same day</p>
                  <ol>
                    {NOTES.map((x) => (
                      <li key={x.n}>
                        <sup className={s.tag}>{x.n}</sup>
                        <time>{x.day}</time>
                        <span><b>{x.what}</b>{x.fix}</span>
                      </li>
                    ))}
                  </ol>
                </section>

                <dl className={s.sums}>
                  <div><dt>Verified hours</dt><dd>{hrs(HOURS)}</dd></div>
                  <div><dt>Subtotal</dt><dd>{money(SUB)}</dd></div>
                  <div><dt>VAT 5%</dt><dd>{money(SUB * VAT)}</dd></div>
                  <div className={s.due}><dt>Total due</dt><dd>AED <span data-total>{money(TOTAL)}</span></dd></div>
                </dl>
              </div>

              <p className={s.proof}><Tick />Every hour on this statement matched a clock-in, a selfie and a rostered shift in OpsPro.</p>

              <div className={s.stamp} data-stamp aria-hidden="true">
                <b>Approved</b>
                <span>30 Sep 2026 · sent to vendor</span>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
