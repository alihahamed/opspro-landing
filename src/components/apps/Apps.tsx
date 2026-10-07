'use client';

// Apps section: one sick call at 06:12, seen in each of the four OpsPro apps. The four screens (designed in Figma,
// frames "Apps · 1–4") sit edge to edge as a full-bleed strip. A teal line draws across underneath, and each screen
// lights up as the line reaches it, with its time and one line of caption. Plays once in view; phones get a swipe row.
// The markup is the finished state (all lit), so reduced motion and no-JS see everything. Names are invented.
import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import s from './apps.module.css';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

const SHOTS = [
  { src: '/apps/worker.webp', w: 390, h: 844, at: '06:12', app: 'Worker app', line: 'Rizwan calls in sick from his phone.' },
  { src: '/apps/supervisor.webp', w: 390, h: 844, at: '06:13', app: 'Supervisor app', line: 'Omar assigns the best-fit reliever.' },
  { src: '/apps/ops.webp', w: 880, h: 620, at: '06:14', app: 'Ops dashboard', line: 'Marina is back to 10 of 10.' },
  { src: '/apps/vendor.webp', w: 880, h: 620, at: '06:16', app: 'Vendor portal', line: 'Crescent Staffing sees Jomar deployed.' },
];
const DRAW = 3.4; // seconds for the line to cross the strip

export default function Apps() {
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const el = root.current!;
      const q = gsap.utils.selector(el);
      const strip = el.querySelector<HTMLElement>('[data-strip]')!;
      const items = q('[data-item]') as HTMLElement[];
      const enter = { trigger: strip, start: 'top 75%', once: true };
      items.forEach((it) => it.removeAttribute('data-lit'));

      SplitText.create(el.querySelector('[data-title]'), {
        type: 'lines', mask: 'lines', autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, { yPercent: 100, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: el, start: 'top 70%', once: true } }),
      });

      const tl = gsap.timeline({ scrollTrigger: enter })
        .from(items, { y: 60, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.08 })
        .fromTo(q('[data-line]'), { scaleX: 0 }, { scaleX: 1, duration: DRAW, ease: 'none' }, 0.5);
      // each screen lights up when the line reaches it (a fifth of the way into the screen)
      const width = strip.offsetWidth;
      items.forEach((it, i) => {
        const t = 0.5 + DRAW * ((it.offsetLeft + it.offsetWidth * 0.2) / width);
        tl.call(() => { it.dataset.lit = ''; items.forEach((x) => x.toggleAttribute('data-current', x === it)); }, [], t)
          .from(q('[data-cap]')[i], { y: 12, autoAlpha: 0, duration: 0.6, ease: 'expo.out' }, t);
      });
    });
  }, { scope: root });

  return (
    <section ref={root} id="apps" className={s.section} aria-labelledby="apps-title">
      <div className={s.inner}>
        <h2 id="apps-title" className={s.title} data-title>Rizwan calls in sick at 06:12. <span>Marina is covered by 06:14.</span></h2>
      </div>

      <div className={s.scroller}>
        <div className={s.strip} data-strip>
          <span className={s.track} aria-hidden="true"><i className={s.line} data-line /></span>
          {SHOTS.map((x) => (
            <figure key={x.app} className={s.item} data-item data-lit>
              <div className={s.shot}>
                {/* eslint-disable-next-line @next/next/no-img-element -- static screens exported from Figma */}
                <img src={x.src} width={x.w} height={x.h} alt={`${x.app} at ${x.at}: ${x.line}`} loading="lazy" decoding="async" />
              </div>
              <figcaption className={s.cap} data-cap>
                <time>{x.at}</time>
                <b>{x.app}</b>
                <span>{x.line}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
