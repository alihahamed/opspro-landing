'use client';

// Apps section: one sick call, seen from both phones. The worker app sends the sick day at 06:12; a minute later the
// supervisor app has assigned the best-fit reliever. The screens (Figma frames "Apps · 1 Worker app" and "Apps · 2
// Supervisor app") sit in the same iPhone frame as the selfie section, staggered, with a dashed line drawing from
// one to the other. Plays once in view. The markup is the finished state, so reduced motion and no-JS see it all.
// Names are invented.
import { useRef, type CSSProperties } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import fc from '../facecheck/facecheck.module.css'; // the iPhone frame
import s from './apps.module.css';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

const PHONES = [
  { src: '/apps/worker.webp', at: '06:12', app: 'Worker app', line: 'Rizwan calls in sick from his phone.' },
  { src: '/apps/supervisor.webp', at: '06:13', app: 'Supervisor app', line: 'Omar assigns the best-fit reliever.' },
];

function Phone({ src, alt }: { src: string; alt: string }) {
  return (
    <div className={`${fc.phone} ${s.phone}`}>
      <span className={fc.btnL} /><span className={fc.btnL2} /><span className={fc.btnR} />
      <div className={fc.screen}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static screen exported from Figma */}
        <img src={src} alt={alt} loading="lazy" decoding="async" />
        <span className={fc.island} aria-hidden="true" />
      </div>
    </div>
  );
}

export default function Apps() {
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const el = root.current!;
      const q = gsap.utils.selector(el);
      SplitText.create(el.querySelector('[data-title]'), {
        type: 'lines', mask: 'lines', autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, { yPercent: 100, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: el, start: 'top 70%', once: true } }),
      });
      gsap.timeline({ scrollTrigger: { trigger: q('[data-stage]')[0], start: 'top 75%', once: true } })
        .from(q('[data-phone]'), { y: 80, autoAlpha: 0, duration: 1.1, ease: 'expo.out', stagger: 0.25 })
        .fromTo(q('[data-path]'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.8, ease: 'power2.inOut' }, 0.8)
        .from(q('[data-head]'), { autoAlpha: 0, duration: 0.2 }, 1.5)
        .from(q('[data-pill]'), { y: 10, scale: 0.9, autoAlpha: 0, duration: 0.5, ease: 'back.out(2)' }, 1.45);
    });
  }, { scope: root });

  return (
    <section ref={root} id="apps" className={s.section} aria-labelledby="apps-title">
      <div className={s.inner}>
        <h2 id="apps-title" className={s.title} data-title>Rizwan calls in sick at 06:12. <span>Marina is covered by 06:13.</span></h2>

        <div className={s.stage} data-stage>
          {PHONES.map((x, i) => (
            <figure key={x.app} className={s.item} data-phone style={{ '--lift': i ? '-64px' : '0px' } as CSSProperties}>
              <Phone src={x.src} alt={`${x.app} at ${x.at}: ${x.line}`} />
              <figcaption className={s.cap}><time>{x.at}</time><b>{x.app}</b><span>{x.line}</span></figcaption>
            </figure>
          ))}

          {/* from the sick call to the cover */}
          <div className={s.link} aria-hidden="true">
            <svg viewBox="0 0 160 70">
              <path className={s.path} data-path pathLength={1} d="M6 56 C 50 56, 100 50, 146 16" />
              <path className={s.head} data-head d="M136 13 L147 15 L143 25" />
            </svg>
            <span className={s.pill} data-pill>Covered in 1 min</span>
          </div>
        </div>
      </div>
    </section>
  );
}
