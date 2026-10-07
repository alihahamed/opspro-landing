'use client';

// Rules section: the payroll rules supervisors used to apply by hand, written as big sentences on a dark slab.
// Each sentence has live pieces in it (counters, chips, a struck-out time) that play when the line scrolls into view,
// and again after scrolling back up past it. No scroll lock. The rules match the OpsPro dashboard; all data is invented.
import { useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import s from './rules.module.css';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

const hm = (h: number) => { const m = Math.round(h * 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };
const hmin = (min: number) => { const m = Math.round(min); return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`; };
const num = (n: number) => Math.round(n).toLocaleString('en-US');

const OT = 135, LATE = 64, VISA_FROM = 45, VISA = 12, DAYS = 1284; // minutes over, minutes late, days left, billable days

const Check = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 8.4 2.6 2.6L12 5.4" /></svg>;
const Who = ({ i, n }: { i: string; n: string }) => <span className={s.who}><i>{i}</i>{n}</span>;
const Pill = ({ v, w, children, ...rest }: { v: string; w: string; children?: ReactNode; [k: `data-${string}`]: string | boolean }) =>
  <span className={s.pill} style={{ minWidth: w }} {...rest}><span data-v>{v}</span>{children}</span>;

export default function Rules() {
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    const el = root.current!;
    const by = (k: string) => el.querySelector<HTMLElement>(`[data-rule="${k}"]`)!;
    const [ot, miss, late, docs, proj] = ['ot', 'miss', 'late', 'docs', 'proj'].map(by);
    const set = (row: HTMLElement, v: string) => { row.querySelector('[data-v]')!.textContent = v; };
    const step = (row: HTMLElement, n: number) => { row.dataset.step = String(n); };

    const otAt = (m: number) => set(ot, hmin(m));
    const missAt = (h: number) => { set(miss, hm(h)); miss.toggleAttribute('data-over', h >= 21); };
    const lateAt = (m: number) => { set(late, `${Math.round(m)} min`); late.toggleAttribute('data-over', m >= 60); };
    const docsAt = (d: number) => set(docs, `${Math.round(d)} days`);
    const projAt = (n: number) => set(proj, num(n));

    // Plays when the line comes into view; resets only once it's fully below the screen again, so nothing vanishes while visible.
    const replay = (row: HTMLElement, tl: gsap.core.Timeline, rewind: () => void) => {
      let armed = true;
      ScrollTrigger.create({ trigger: row, start: 'top 80%', onEnter: () => { if (!armed) return; armed = false; rewind(); tl.restart(); } });
      ScrollTrigger.create({ trigger: row, start: 'top bottom', onLeaveBack: () => { tl.pause(0); rewind(); armed = true; } });
    };

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      SplitText.create(el.querySelector('[data-title]'), {
        type: 'lines', mask: 'lines', autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, { yPercent: 100, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: el, start: 'top 75%', once: true } }),
      });

      const o = { ot: 0, miss: 18, late: 0, docs: VISA_FROM, proj: 0 };
      const line = (row: HTMLElement) => gsap.timeline({ paused: true })
        .from(row.children, { y: 28, autoAlpha: 0, duration: 0.9, stagger: 0.08, ease: 'expo.out' });

      replay(ot, line(ot)
        .to(o, { ot: OT, duration: 1.4, ease: 'power2.out', onUpdate: () => otAt(o.ot) }, 0.5)
        .call(() => step(ot, 1), [], 2)
        .call(() => step(ot, 2), [], 3.3),
      () => { otAt(0); step(ot, 0); });

      // the clock runs on into the night, gets struck out, and the shift is closed at finish + 30 min
      replay(miss, line(miss)
        .to(o, { miss: 22.5, duration: 2, ease: 'power1.in', onUpdate: () => missAt(o.miss) }, 0.5)
        .call(() => step(miss, 1), [], 2.7)
        .call(() => step(miss, 2), [], 3.2),
      () => { missAt(18); step(miss, 0); });

      replay(late, line(late)
        .to(o, { late: LATE, duration: 2, ease: 'none', onUpdate: () => lateAt(o.late) }, 0.5),
      () => lateAt(0));

      replay(docs, line(docs)
        .to(o, { docs: VISA, duration: 1.8, ease: 'power2.inOut', onUpdate: () => docsAt(o.docs) }, 0.5)
        .call(() => step(docs, 1), [], 2.4),
      () => { docsAt(VISA_FROM); step(docs, 0); });

      // a shift gets cancelled after the count: the total drops by one
      replay(proj, line(proj)
        .to(o, { proj: DAYS, duration: 1.6, ease: 'power2.out', onUpdate: () => projAt(o.proj) }, 0.5)
        .call(() => { step(proj, 1); projAt(DAYS - 1); }, [], 2.6),
      () => { projAt(0); step(proj, 0); });
    });
    // reduced motion: the markup already shows the finished state
  }, { scope: root });

  return (
    <section ref={root} id="rules" className={s.section} aria-labelledby="rules-title">
      <div className={s.inner}>
        <h2 id="rules-title" className={s.title} data-title>Same rules on every shift, even the one that ends at 2am.</h2>

        <ol className={s.rules}>
          <li className={s.rule} data-rule="ot" data-step="2">
            <p className={s.meta}><b>Overtime</b>1 to 3h past the roster. Under an hour isn’t overtime.</p>
            <p className={s.line}>
              <Who i="AK" n="Aisha K." /> stays <Pill v={hmin(OT)} w="5.6ch" /> past the roster.{' '}
              <span className={s.soft}>It’s billed once <Who i="SM" n="Sara M." /> approves it.</span>{' '}
              <span className={s.flip}><em data-tone="ot">Waiting</em><em data-tone="ok"><Check />Approved</em></span>
            </p>
          </li>

          <li className={s.rule} data-rule="miss" data-step="2" data-over>
            <p className={s.meta}><b>Missed clock-out</b>No clock-out, or more than 3h over. Closed at the rostered finish plus 30 minutes.</p>
            <p className={s.line}>
              <Who i="SR" n="Sana R." /> never clocks out, and the shift runs to <Pill v="22:30" w="3.4ch" data-strike />.{' '}
              <span className={s.soft}>OpsPro closes it at <Pill v="18:30" w="3.4ch" data-fix /> and flags it before payroll.</span>
            </p>
          </li>

          <li className={s.rule} data-rule="late" data-over>
            <p className={s.meta}><b>Late arrival</b>60 minutes or more after the start.</p>
            <p className={s.line}>
              <Who i="BS" n="Bilal S." /> clocks in <Pill v={`${LATE} min`} w="4.4ch" /> after the start.{' '}
              <span className={s.soft}>You get the alert and decide if it’s a warning.</span>
            </p>
          </li>

          <li className={s.rule} data-rule="docs" data-step="1">
            <p className={s.meta}><b>Document expiry</b>Passport, visa, Emirates ID and health card, for every worker.</p>
            <p className={s.line}>
              The visa for <Who i="FA" n="Faisal A." /> runs out in <Pill v={`${VISA} days`} w="5ch" />.{' '}
              <span className={s.soft}>You see it with time left to renew.</span>
            </p>
          </li>

          <li className={s.rule} data-rule="proj" data-step="1">
            <p className={s.meta}><b>Billable days</b>Projected from the roster, one per scheduled worker-day.</p>
            <p className={s.line}>
              November comes to <Pill v={num(DAYS - 1)} w="3.8ch"><i className={s.badge}>−1</i></Pill> billable days.{' '}
              <span className={s.soft}>Cancel a shift and it drops out of the count.</span>
            </p>
          </li>
        </ol>
      </div>
    </section>
  );
}
