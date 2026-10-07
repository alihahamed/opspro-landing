'use client';

// Footer: a dark slab with the pitch and two link columns. Across the bottom, a giant OpsPro wordmark whose O is the logo's geofence ring; it rises out of the
// slab's edge as the page ends (scrubbed with scroll), and a teal light follows the pointer across it.
import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import s from './footer.module.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const COLS = [
  { title: 'Product', links: [['Live dashboard', '#product'], ['Roster', '#roster'], ['Selfie check', '#face-check'], ['The rules', '#rules'], ['Month-end', '#month-end'], ['The four apps', '#apps']] },
  { title: 'OpsPro', links: [['Book a live demo', '#book-demo'], ['Log in', 'https://app.opspro.ae']] },
];

export default function Footer() {
  const root = useRef<HTMLElement>(null);
  const mark = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo('[data-word]', { yPercent: 55 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom bottom', scrub: 0.6 } });
    });
  }, { scope: root });

  // the light follows the pointer; with no pointer it drifts on its own (CSS)
  const follow = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const txt = mark.current!.querySelector<HTMLElement>('[data-txt]')!;
    const r = txt.getBoundingClientRect();
    mark.current!.dataset.live = '';
    txt.style.setProperty('--mx', `${e.clientX - r.left}px`);
    txt.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  const leave = () => { delete mark.current!.dataset.live; };

  return (
    <footer ref={root} className={s.foot}>
      <div className={s.inner}>
        <div className={s.top}>
          <div>
            <p className={s.pitch}>Attendance, rosters and payroll-ready hours for shift teams across the UAE.</p>
            <a className={s.demo} href="#book-demo">Book a live demo<span aria-hidden="true">→</span></a>
          </div>
          {COLS.map((c) => (
            <nav key={c.title} className={s.col} aria-label={c.title}>
              <h3>{c.title}</h3>
              {c.links.map(([label, href]) => <a key={label} href={href}>{label}</a>)}
            </nav>
          ))}
        </div>

        <div className={s.bottom}>
          <span>© 2026 OpsPro</span>
          <button type="button" className={s.up} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to top<span aria-hidden="true">↑</span></button>
        </div>
      </div>

      <div ref={mark} className={s.mark} onPointerMove={follow} onPointerLeave={leave} aria-hidden="true">
        <p className={s.word} data-word>
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.6" strokeDasharray="2.6 1.6" /><circle className={s.core} cx="12" cy="12" r="4.4" /></svg>
          <span data-txt>psPro</span>
        </p>
      </div>
    </footer>
  );
}
