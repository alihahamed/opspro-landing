'use client';

// Closing CTA: one blunt question, the same clock-in button as the hero. Around it, the answer: live clock-in
// notifications floating at three depths. Behind them, a line drawing of the hero's Dubai map (the same baked
// scooter routes and stores) with teal pulses running along the roads. Scrolling through moves each depth at its
// own speed (parallax, scrubbed, never pinned).
// All names and numbers are invented.
import { useRef, type CSSProperties } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { ClockInButton } from '@/components/hero/Hero';
import routes from '@/data/routes.json';
import stores from '@/data/stores.json';
import s from './cta.module.css';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

const DEMO_HREF = '#book-demo'; // opens the demo sheet

// d: depth (1 far … 3 near). x/y: % of the section (r = measured from the right). m: shown on phones, at mx/my.
type Chip = { t: string; v: string; d: 1 | 2 | 3; x: number; y: number; r?: boolean; m?: [number, number]; tone?: 'amber' };
const CHIPS: Chip[] = [
  { t: 'Aisha K. clocked in', v: '09:58', d: 3, x: 4, y: 17, m: [5, 13] },
  { t: 'Selfie matched', v: '0.94', d: 2, x: 7, y: 7, r: true, m: [8, 19] },
  { t: 'Inside the geofence', v: '38 m', d: 1, x: 27, y: 5 },
  { t: 'Marina', v: '5 of 6 in', d: 1, x: 3, y: 30, r: true },
  { t: 'Al Barsha', v: '9 of 10 in', d: 1, x: 2, y: 50 },
  { t: 'Reliever sent', v: '12 min', d: 2, x: 5, y: 56, r: true, tone: 'amber' },
  { t: 'Nimal P. clocked in', v: '10:02', d: 2, x: 9, y: 80, m: [5, 80] },
  { t: 'Overtime approved', v: '2h 15m', d: 3, x: 6, y: 76, r: true, m: [9, 86] },
  { t: 'Shift closed', v: '8h 04m', d: 1, x: 40, y: 92 },
];

// The hero's routes and stores as SVG: equirectangular, longitude scaled by cos(latitude), fitted to 1000 wide.
const ALL = [...routes.flatMap((r) => r.path), ...stores.map((x) => x.lngLat)] as [number, number][];
const LNG0 = Math.min(...ALL.map((p) => p[0])), LAT1 = Math.max(...ALL.map((p) => p[1]));
const K = Math.cos((LAT1 * Math.PI) / 180);
const SPAN = (Math.max(...ALL.map((p) => p[0])) - LNG0) * K;
const xy = ([lng, lat]: number[]) => [((lng - LNG0) * K / SPAN) * 1000, ((LAT1 - lat) / SPAN) * 1000];
const MAP_H = Math.max(...ALL.map((p) => xy(p)[1]));
const ROADS = routes.map((r) => 'M' + r.path.map((p) => xy(p).map((n) => n.toFixed(1)).join(' ')).join('L'));
const PINS = stores.map((x) => xy(x.lngLat));

const Check = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;

export default function Cta() {
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const el = root.current!;
      const q = gsap.utils.selector(el);
      const enter = { trigger: el, start: 'top 70%', once: true };
      const through = { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.8 };

      SplitText.create(el.querySelector('[data-title]'), {
        type: 'lines', mask: 'lines', autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, { yPercent: 100, duration: 1.1, ease: 'expo.out', stagger: 0.08, scrollTrigger: enter }),
      });
      gsap.timeline({ scrollTrigger: enter })
        .from(q('[data-chip] > div'), { scale: 0.7, autoAlpha: 0, duration: 0.9, ease: 'back.out(1.6)', stagger: { each: 0.09, from: 'random' } }, 0.2)
        .from(q('[data-rise]'), { y: 24, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08 }, 0.35);

      // parallax: nearer chips travel further; the map behind drifts slowly and settles
      const amp = window.innerWidth < 768 ? 28 : 90; // phones: less travel, so chips never drift over the text
      q('[data-chip]').forEach((c) => {
        const d = Number((c as HTMLElement).dataset.chip);
        gsap.fromTo(c, { y: amp * d }, { y: -amp * d, ease: 'none', scrollTrigger: through });
      });
      gsap.fromTo(q('[data-map]'), { y: 70, scale: 1.12 }, { y: -70, scale: 1, ease: 'none', scrollTrigger: through });
    });
  }, { scope: root });

  return (
    <section ref={root} id="demo" className={s.cta} aria-labelledby="cta-title">
      <div className={s.scene} aria-hidden="true">
        <div className={s.map} data-map>
          <svg viewBox={`0 0 1000 ${MAP_H.toFixed(0)}`} preserveAspectRatio="xMidYMid slice">
            {ROADS.map((d, i) => <path key={i} className={s.road} d={d} />)}
            {/* a scooter-length pulse running along each road, each on its own clock */}
            {ROADS.map((d, i) => <path key={`p${i}`} className={s.pulse} d={d} pathLength={1} style={{ animationDuration: `${7 + (i % 5) * 1.7}s`, animationDelay: `${-i * 1.3}s` }} />)}
            {PINS.map(([x, y], i) => <circle key={i} className={s.pin} cx={x} cy={y} r="9" />)}
          </svg>
        </div>
        <div className={s.field}>
        {CHIPS.map((c) => (
          <div key={c.t} className={s.chip} data-chip={c.d} data-m={c.m ? '' : undefined}
            style={{ [c.r ? 'right' : 'left']: `${c.x}%`, top: `${c.y}%`, ...(c.m && { '--mx': `${c.m[0]}%`, '--my': `${c.m[1]}%` }) } as CSSProperties}>
            <div data-tone={c.tone}>
              <i><Check /></i><b>{c.t}</b><span>{c.v}</span>
            </div>
          </div>
        ))}
        </div>
      </div>

      <h2 id="cta-title" className={s.title} data-title>
        Can you say who’s on the floor right now <span>without making a call?</span>
      </h2>
      <p className={s.sub} data-rise>
        If finding out means a round of WhatsApp messages, book a demo and we’ll show you the live view.
      </p>
      <div className={s.actions} data-rise>
        <ClockInButton href={DEMO_HREF} label="Book a live demo" next="Pick a time" />
      </div>
    </section>
  );
}
