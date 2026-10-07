'use client';

// Month-end section: September's timesheet for one store, settling itself as the month runs. A month track
// fills day by day; each problem gets a labelled flag on the day it happened and a line in the log saying what
// happened and who sorted it, the same day. The verified total counts up, and at the end the report goes to
// finance. Plays once when it scrolls into view; no scroll lock. All data is invented.
import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import s from './monthend.module.css';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

const DAYS = 30; // September
const SHIFT = 8; // rostered hours per shift

type Issue = { day: number; ver: number; problem: string; fix: string; icon: string };
const WORKERS: { name: string; initials: string; off: number; issue?: Issue }[] = [
  { name: 'Aisha K.', initials: 'AK', off: 0 },
  { name: 'Nimal P.', initials: 'NP', off: 2, issue: { day: 8, ver: 7.6, problem: 'Late 22 min', fix: 'Deducted by Sara M.', icon: 'M12 7.5V12l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' } },
  { name: 'Rohan T.', initials: 'RT', off: 4, issue: { day: 20, ver: 0, problem: 'No-show', fix: 'Musa B. covered the shift', icon: 'M15 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM17 8l4 4M21 8l-4 4' } },
  { name: 'Sana R.', initials: 'SR', off: 1, issue: { day: 14, ver: 8, problem: 'No clock-out', fix: 'Closed at 23:00 by Sara M.', icon: 'M15 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4' } },
  { name: 'Faisal A.', initials: 'FA', off: 5, issue: { day: 25, ver: 8, problem: 'Selfie didn’t match', fix: 'Checked and approved', icon: 'M3 7.5V5.5A2.5 2.5 0 0 1 5.5 3h2M16.5 3h2A2.5 2.5 0 0 1 21 5.5v2M21 16.5v2a2.5 2.5 0 0 1-2.5 2.5h-2M7.5 21h-2A2.5 2.5 0 0 1 3 18.5v-2M9 9.5v.01M15 9.5v.01M9 15.5h6' } },
  { name: 'Bilal S.', initials: 'BS', off: 3 },
];

// verified hours per picker, cumulative by day (one day off a week, the issue day at its verified hours)
const ROWS = WORKERS.map((p) => {
  const days = Array.from({ length: DAYS }, (_, d) => (p.issue?.day === d ? p.issue.ver : (d + p.off) % 7 === 6 ? null : SHIFT));
  const cum = [0];
  days.forEach((h) => cum.push(cum.at(-1)! + (h ?? 0)));
  return { ...p, cum, rostered: days.filter((h) => h !== null).length * SHIFT };
});
const ROSTERED = ROWS.reduce((a, r) => a + r.rostered, 0);
const ISSUES = WORKERS.filter((p) => p.issue).map((p) => ({ ...p.issue!, name: p.name, initials: p.initials })).sort((a, b) => a.day - b.day);

const Tick = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 8.4 2.6 2.6L12 5.4" /></svg>;
const hours = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const at = (day: number) => `${((day + 0.5) / DAYS) * 100}%`;

export default function MonthEnd() {
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    const el = root.current!;
    const stage = el.querySelector<HTMLElement>('[data-stage]')!;
    const chip = el.querySelector<HTMLElement>('[data-chip]')!;
    const total = el.querySelector<HTMLElement>('[data-total]')!;
    const flags = el.querySelectorAll<HTMLElement>('[data-flag]');
    const entries = el.querySelectorAll<HTMLElement>('[data-entry]');

    // day: how many days are checked (0..30). A problem shows up the day after it happened and is settled a day later.
    const render = (day: number) => {
      stage.style.setProperty('--p', String(day / DAYS));
      chip.textContent = day >= DAYS ? 'Ready to send' : `Checking ${day + 1} Sep`;
      total.textContent = hours(ROWS.reduce((a, r) => a + r.cum[day], 0));
      stage.dataset.done = String(day >= DAYS);
      ISSUES.forEach((x, i) => {
        const state = day > x.day + 1 ? 'settled' : day > x.day ? 'found' : '';
        flags[i].dataset.state = state;
        entries[i].dataset.state = state;
      });
    };

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      render(0);
      stage.dataset.sent = 'false';
      SplitText.create(el.querySelector('[data-title]'), {
        type: 'lines', mask: 'lines', autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, { yPercent: 100, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: el, start: 'top 75%', once: true } }),
      });
      gsap.from(el.querySelectorAll('[data-rise]'), { y: 24, autoAlpha: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 75%', once: true } });
      const o = { d: 0 };
      gsap.timeline({ scrollTrigger: { trigger: stage, start: 'top 75%', once: true } })
        .from(el.querySelector('[data-card]'), { y: 60, autoAlpha: 0, duration: 0.9, ease: 'expo.out' })
        .to(o, { d: DAYS, duration: 4.2, ease: 'none', onUpdate: () => render(Math.floor(o.d)) }, 0.4)
        .call(() => { stage.dataset.sent = 'true'; }, [], '+=0.7');
    });
    mm.add('(prefers-reduced-motion: reduce)', () => { render(DAYS); stage.dataset.sent = 'true'; });
  }, { scope: root });

  return (
    <section ref={root} id="month-end" className={s.section} aria-labelledby="monthend-title">
      <div className={s.inner}>
        <header className={s.head}>
          <h2 id="monthend-title" className={s.title} data-title>Nobody rebuilds timesheets on the 30th anymore.</h2>
          <p className={s.sub} data-rise>
            The supervisor who was there sorts out late starts, no-shows and missed clock-outs the same day.
            By the 30th, the hours are approved and ready for payroll and vendor invoices.
          </p>
        </header>

        <div className={s.stage} data-stage data-done="true" data-sent="true" aria-hidden="true">
          <div className={s.card} data-card>
            <div className={s.top}>
              <div>
                <p className={s.docTitle}>September timesheet</p>
                <p className={s.meta}>Circle Mall JVC · {WORKERS.length} workers</p>
              </div>
              <span className={s.chip}><Tick /><span data-chip>Ready to send</span></span>
            </div>

            {/* the month: fills day by day, a labelled flag on each day something went wrong */}
            <div className={s.month}>
              {ISSUES.map((x) => (
                <span key={x.day} className={s.flag} data-flag data-state="settled" style={{ left: at(x.day) }}>
                  <b><Tick />{x.day + 1} Sep</b>
                </span>
              ))}
              <div className={s.track}><i className={s.fill} /></div>
              <div className={s.axis}>{[[0, '1 Sep'], [7, '8'], [14, '15'], [21, '22'], [29, '30 Sep']].map(([d, l]) => <span key={l} style={{ left: at(d as number) }}>{l}</span>)}</div>
            </div>

            {/* what happened, and who sorted it, the same day */}
            <ol className={s.log}>
              {ISSUES.map((x) => (
                <li key={x.day} className={s.entry} data-entry data-state="settled">
                  <time>{x.day + 1} Sep</time>
                  <span className={s.who}><i>{x.initials}</i>{x.name}</span>
                  <span className={s.problem}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={x.icon} /></svg>{x.problem}</span>
                  <span className={s.fix}><Tick />{x.fix}<small>Same day</small></span>
                </li>
              ))}
            </ol>

            <div className={s.foot}>
              <p className={s.total}>
                <span>Verified hours</span>
                <b><span data-total>{hours(ROWS.reduce((a, r) => a + r.cum[DAYS], 0))}</span> h</b>
                <small>of {hours(ROSTERED)} h rostered</small>
              </p>
              <span className={s.send}>
                <em className={s.sendIdle}>Close September</em>
                <em className={s.sendDone}><Tick />Closed · statements sent to 3 vendors</em>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
