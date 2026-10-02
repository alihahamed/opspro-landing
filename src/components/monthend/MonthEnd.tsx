'use client';

// Month-end section: the September timesheet report for one store. When it scrolls into view it plays once:
// the reports rise, then the month is checked day by day. The usual month-end WhatsApp messages wait in a
// stack and clear as their day is checked, problems show up in the Status column the day they happen, and it
// ends with the "Sent to finance" notice sliding up. All data is invented.
import { useRef, type CSSProperties } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import s from './monthend.module.css';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

const DAYS = 30; // September
const SHIFT = 8; // rostered hours per shift
const SCAN_END = 0.85; // the report is complete here; the rest of the pin holds the finished state

type Day = { ver: number; issue?: boolean } | null;
type Issue = { day: number; ver: number; found: string; settled: string; tip: string };

const PICKERS: { name: string; initials: string; off: number; issue?: Issue }[] = [
  { name: 'Aisha K.', initials: 'AK', off: 0 },
  { name: 'Nimal P.', initials: 'NP', off: 2, issue: { day: 8, ver: 7.6, found: 'Late 22 min on 9 Sep', settled: 'Late 22 min, deducted', tip: '9 Sep · In at 08:22, rostered 08:00. 22 min deducted by Sara M.' } },
  { name: 'Rohan T.', initials: 'RT', off: 4, issue: { day: 20, ver: 0, found: 'No-show on 21 Sep', settled: 'No-show, reliever covered', tip: '21 Sep · No clock-in. Musa B. covered the shift.' } },
  { name: 'Sana R.', initials: 'SR', off: 1, issue: { day: 14, ver: 8, found: 'No clock-out on 15 Sep', settled: 'Clock-out closed by supervisor', tip: '15 Sep · Still clocked in at 02:10. Closed at 23:00 by Sara M.' } },
  { name: 'Faisal A.', initials: 'FA', off: 5, issue: { day: 25, ver: 8, found: 'Selfie mismatch on 26 Sep', settled: 'Selfie checked, approved', tip: '26 Sep · Selfie didn’t match. Checked and approved by Sara M.' } },
  { name: 'Bilal S.', initials: 'BS', off: 3 },
];

const ROWS = PICKERS.map((p) => {
  const days: Day[] = Array.from({ length: DAYS }, (_, d) =>
    p.issue?.day === d ? { ver: p.issue.ver, issue: true } : (d + p.off) % 7 === 6 ? null : { ver: SHIFT });
  const cum = [0];
  days.forEach((x) => cum.push(cum.at(-1)! + (x ? x.ver : 0)));
  return { ...p, days, cum, rostered: days.filter(Boolean).length * SHIFT };
});
const TOTAL = ROWS.reduce((sum, row) => sum + row.cum[DAYS], 0);

// The month-end chat this replaces, as a notification stack: top card first. `clear` = the number of
// checked days after which it's dismissed. `from` 'You' = the ops manager.
const CHATS = [
  { clear: 3, from: 'You', text: 'Bro send me your hours for this week pls', time: '23:41' },
  { clear: 6, from: 'Finance', text: 'These numbers don’t match the roster again', time: '18:47' },
  { clear: 10, from: 'Store manager', text: 'Nimal came 8:20 not 8. Deduct or no?', time: '07:12' },
  { clear: 16, from: 'Sana R.', text: 'Forgot to clock out yesterday, I left at 11', time: '00:03' },
  { clear: 22, from: 'You', text: 'Did Rohan come on the 21st??', time: '22:58' },
  { clear: 27, from: 'Ops, JVC', text: 'Who approved Faisal’s photo? Doesn’t look like him', time: '13:20' },
  { clear: 30, from: 'Finance', text: 'Need final timesheets by 10am tomorrow latest', time: '21:09' },
];

const Tick = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 8.4 2.6 2.6L12 5.4" /></svg>;

const hours = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default function MonthEnd() {
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    const el = root.current!;
    const stage = el.querySelector<HTMLElement>('[data-stage]')!;
    const cols = Array.from({ length: DAYS }, (_, d) => el.querySelectorAll<HTMLElement>(`[data-day="${d}"]`));
    const totals = el.querySelectorAll<HTMLElement>('[data-hours]');
    const statuses = el.querySelectorAll<HTMLElement>('[data-status]');
    const chats = el.querySelectorAll<HTMLElement>('[data-clear]');
    const grand = el.querySelector<HTMLElement>('[data-grand]')!;
    const chip = el.querySelector<HTMLElement>('[data-chip]')!;
    let last = 0;
    let front: HTMLElement | null = null;

    // p: 0..1 through the pin. Only the days that changed get touched.
    const render = (p: number) => {
      const day = Math.min(DAYS, Math.floor(Math.min(p / SCAN_END, 1) * DAYS + 1e-6)); // days checked so far
      if (day === last && p > 0) return;
      for (let d = Math.min(last, day); d < Math.max(last, day); d++) cols[d].forEach((t) => t.classList.toggle(s.checked, d < day));
      last = day;
      const done = day >= DAYS;
      stage.dataset.done = String(done);
      stage.style.setProperty('--day', String(day));
      chip.textContent = done ? 'Ready to export' : `Checking day ${day + 1} of ${DAYS}`;
      totals.forEach((t, r) => { t.textContent = hours(ROWS[r].cum[day]); });
      grand.textContent = hours(ROWS.reduce((sum, row) => sum + row.cum[day], 0));
      let k = 0; // position in the stack among the ones still waiting
      let next: HTMLElement | null = null;
      chats.forEach((c) => {
        const gone = day >= Number(c.dataset.clear);
        c.classList.toggle(s.gone, gone);
        if (!gone) { if (k === 0) next = c; c.style.setProperty('--k', String(k++)); }
      });
      // a new front card rises out of the report's bottom edge (`translate` composes with the stack's `transform`)
      if (next && front && next !== front) {
        (next as HTMLElement).animate([{ translate: '0 140%' }, { translate: '0 0' }], { duration: 650, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
      }
      front = next;
      statuses.forEach((st, r) => {
        const issue = ROWS[r].issue;
        const found = issue && day > issue.day;
        st.dataset.state = done ? (issue ? 'settled' : 'ok') : found ? 'found' : 'checking';
        st.lastElementChild!.textContent = done ? (issue ? issue.settled : 'All shifts match') : found ? issue.found : 'Checking';
      });
    };

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      render(0);
      SplitText.create(el.querySelector('[data-title]'), {
        type: 'lines', mask: 'lines', autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, { yPercent: 100, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: el, start: 'top 75%', once: true } }),
      });
      gsap.from(el.querySelectorAll('[data-rise]'), { y: 24, autoAlpha: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 75%', once: true } });
    });
    // Plays once when the report comes into view; scrolling is never held. September rises out of the desk,
    // August and July slide up from behind it (only their top edges show), then the month gets checked.
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const o = { p: 0 };
      gsap.timeline({ scrollTrigger: { trigger: stage, start: 'top 75%', once: true } })
        .from(el.querySelector('[data-front]'), { y: 140, autoAlpha: 0, duration: 0.7, ease: 'expo.out' })
        .from(el.querySelector('[data-sheet="1"]'), { y: 0, duration: 0.45, ease: 'expo.out' }, '-=0.3')
        .from(el.querySelector('[data-sheet="2"]'), { y: 0, duration: 0.45, ease: 'expo.out' }, '-=0.3')
        .to(o, { p: 1, duration: 3.6, ease: 'none', onUpdate: () => render(o.p) }, '-=0.15');
    });
    mm.add('(prefers-reduced-motion: reduce)', () => render(1));
  }, { scope: root });

  return (
    <section ref={root} className={s.section} aria-labelledby="monthend-title">
      <div className={s.inner}>
        <header className={s.head}>
          <h2 id="monthend-title" className={s.title} data-title>Nobody rebuilds timesheets on the 30th anymore.</h2>
          <p className={s.sub} data-rise>
            The supervisor who was there sorts out late starts, no-shows and forgotten clock-outs on the same day.
            By the 30th, the report just needs sending.
          </p>
        </header>

        <div className={s.stage} data-stage data-done="false" aria-hidden="true" style={{ '--day': 0 } as CSSProperties}>
          {/* last months' reports, stacked under this one */}
          <div className={`${s.sheet} ${s.sheet2}`} data-sheet="2"><span><b>July 2026</b><em><Tick />Sent to finance</em></span></div>
          <div className={`${s.sheet} ${s.sheet1}`} data-sheet="1"><span><b>August 2026</b><em><Tick />Sent to finance</em></span></div>

          <div className={s.front} data-front>
          <div className={s.report}>
            <div className={s.top}>
              <div>
                <p className={s.docTitle}>Timesheet report</p>
                <p className={s.meta}>Spinneys Circle Mall JVC · September 2026</p>
              </div>
              <span className={s.chip} data-chip>Checking day 1 of {DAYS}</span>
            </div>

            <div className={s.table}>
              <div className={`${s.tr} ${s.th}`}>
                <span>Picker</span>
                <span className={s.scale}><span>1 Sep</span><span>15 Sep</span><span>30 Sep</span></span>
                <span>Status</span>
                <span className={s.num}>Verified hours</span>
              </div>

              {ROWS.map((row) => (
                <div key={row.name} className={s.tr}>
                  <span className={s.who}><i>{row.initials}</i>{row.name}</span>
                  <span className={s.strip}>
                    {row.days.map((x, d) => x
                      ? <i key={d} data-day={d} className={x.issue ? s.issue : undefined} data-tip={x.issue ? row.issue!.tip : undefined} />
                      : <i key={d} className={s.off} />)}
                  </span>
                  <span className={s.status} data-status data-state="checking">
                    <svg viewBox="0 0 16 16">
                      <path className={s.gCheck} d="m4.5 8.3 2.2 2.2 4.8-5" />
                      <path className={s.gFound} d="M8 4.6v4M8 11.2v.2" />
                    </svg>
                    <span>Checking</span>
                  </span>
                  <span className={s.num}><span><b data-hours>0.0</b> h</span><small>of {row.rostered} h</small></span>
                </div>
              ))}
            </div>

            <div className={s.foot}>
              <p className={s.grand}><span>Total verified hours</span><b><span data-grand>0.0</span> h</b></p>
              <span className={`btn btn-primary ${s.export}`}>Export report</span>
            </div>
          </div>

          {/* one slot in the footer: the chat pile while the month is open, then the "sent" notice */}
          <div className={s.slot}>
            <ul className={s.pile} data-pile>
              {CHATS.map((c) => (
                <li key={c.clear} className={s.msg} data-clear={c.clear}>
                  <i>{c.from === 'You' ? 'You' : c.from.split(/[ ,]+/).map((w) => w[0]).join('').slice(0, 2)}</i>
                  <span><b>{c.from}<small>{c.time}</small></b><span>{c.text}</span></span>
                </li>
              ))}
            </ul>
            <div className={s.landing}>
              <div className={s.sent}>
                <span className={s.sentBadge}><Tick /></span>
                <span>
                  <b>Sent to finance<small>30 Sep, 18:04</small></b>
                  CircleMall_Sep2026.csv · {hours(TOTAL)} h
                </span>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
