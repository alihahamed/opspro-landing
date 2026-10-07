'use client';

// Product section: a large two-line title, then the product mockup in a thin frame.
// The mockup is a single image in public/ (dashboard on a MacBook, made from the Figma file).
// Callout cards sit around the frame, each wired to the part of the dashboard it describes.
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import s from './features.module.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const MOCKUP = '/mockup-2.png';
const FRAME_INSET = 6; // 5px padding + 1px border between the frame edge and the image

// `at` is the anchor on the mockup, in % of the image (the image is exactly 3:2, like the frame).
// `top` is where the card sits, in % of the frame height.
const CALLOUTS = [
  { side: 'left', top: 18, at: [27.4, 27.6], label: 'On the floor now', body: 'See who’s clocked in at every location, updated the moment each worker arrives.' },
  { side: 'left', top: 72, at: [40.5, 74.4], label: 'Selfie check', body: 'Workers clock in with a selfie on site. If the face doesn’t match, the clock-in waits for a person to check it.' },
  { side: 'right', top: 14, at: [76, 27.5], label: 'Verified hours', body: 'Each shift is checked against the roster when it ends, so the month-end report is already done.' },
  { side: 'right', top: 58, at: [82.8, 52.5], label: 'No-show', body: 'If someone misses a shift, you hear about it within minutes and can send cover.' },
] as const;

export default function Features() {
  const stage = useRef<HTMLDivElement>(null);

  // Wires run from each card's inner edge to its anchor. Layout offsets ignore transforms,
  // so the paths are measured at their final positions even mid-animation.
  useEffect(() => {
    const st = stage.current;
    if (!st) return;
    const measure = () => {
      const svg = st.querySelector<SVGSVGElement>('svg[data-wires]');
      const frame = st.querySelector<HTMLElement>('[data-frame]');
      if (!svg || !frame || getComputedStyle(svg).display === 'none') return;
      svg.setAttribute('viewBox', `0 0 ${st.offsetWidth} ${st.offsetHeight}`);
      const w = frame.offsetWidth - FRAME_INSET * 2, h = frame.offsetHeight - FRAME_INSET * 2;
      st.querySelectorAll<HTMLElement>('[data-card]').forEach((card, i) => {
        const left = card.dataset.side === 'left';
        const x1 = card.offsetLeft + (left ? card.offsetWidth : 0), y1 = card.offsetTop + card.offsetHeight / 2;
        const [ax, ay] = CALLOUTS[i].at;
        const x2 = frame.offsetLeft + FRAME_INSET + (ax / 100) * w, y2 = frame.offsetTop + FRAME_INSET + (ay / 100) * h;
        const mx = (x1 + x2) / 2;
        const d = `M${x1.toFixed(1)} ${y1.toFixed(1)} C${mx.toFixed(1)} ${y1.toFixed(1)} ${mx.toFixed(1)} ${y2.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
        svg.querySelectorAll(`[data-wire="${i}"]`).forEach((p) => p.setAttribute('d', d));
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(st);
    return () => ro.disconnect();
  }, []);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    const q = gsap.utils.selector(stage);
    const trigger = { trigger: stage.current, start: 'top 80%', once: true };

    mm.add('(min-width: 1280px) and (prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({ scrollTrigger: trigger });
      tl.from(q('[data-frame]'), { y: -96, autoAlpha: 0, clipPath: 'inset(0% 0% 100% 0% round 32px)', duration: 1.4, ease: 'expo.out', clearProps: 'clipPath' })
        .from(q('[data-frame] img'), { scale: 1.14, duration: 1.8, ease: 'expo.out' }, 0)
        .from(q('[data-pin]'), { scale: 0, autoAlpha: 0, duration: 0.5, stagger: 0.12, ease: 'back.out(2.2)' }, 0.85)
        .fromTo(q('[data-line]'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.9, stagger: 0.12, ease: 'power2.inOut' }, 0.95)
        .from(q('[data-card]'), {
          autoAlpha: 0, x: (_, el) => ((el as HTMLElement).dataset.side === 'left' ? 40 : -40), filter: 'blur(8px)',
          duration: 0.9, stagger: 0.12, ease: 'expo.out', clearProps: 'filter',
        }, 1.3)
        .from(q('[data-flow]'), { autoAlpha: 0, duration: 0.6 }, '>-0.2');
    });

    mm.add('(max-width: 1279px) and (prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({ scrollTrigger: trigger });
      tl.from(q('[data-frame]'), { y: -56, autoAlpha: 0, clipPath: 'inset(0% 0% 100% 0% round 24px)', duration: 1.2, ease: 'expo.out', clearProps: 'clipPath' })
        .from(q('[data-frame] img'), { scale: 1.12, duration: 1.6, ease: 'expo.out' }, 0)
        .from(q('[data-card]'), { autoAlpha: 0, y: 24, duration: 0.8, stagger: 0.1, ease: 'expo.out' }, 0.6);
    });
  }, { scope: stage });

  return (
    <section id="product" className={s.section}>
      <h2 className={s.title}>Everything your ops team used to chase on WhatsApp.</h2>
      <div className={s.stage} ref={stage}>
        <div className={s.frame} data-frame>
          {/* eslint-disable-next-line @next/next/no-img-element -- a single large static image */}
          <img className={s.shot} src={MOCKUP} alt="The OpsPro dashboard on a MacBook" decoding="async" />
          <div className={s.pins} aria-hidden="true">
            {CALLOUTS.map((c, i) => <span key={i} className={s.pin} data-pin style={{ left: `${c.at[0]}%`, top: `${c.at[1]}%` }} />)}
          </div>
        </div>

        <svg className={s.wires} data-wires aria-hidden="true">
          {CALLOUTS.map((_, i) => (
            <g key={i}>
              <path className={s.line} data-wire={i} data-line pathLength={1} />
              <path className={s.flow} data-wire={i} data-flow pathLength={1} style={{ animationDelay: `${i * -0.7}s` }} />
            </g>
          ))}
        </svg>

        <ul className={s.cards}>
          {CALLOUTS.map((c, i) => (
            <li key={i} className={s.card} data-card data-side={c.side} style={{ top: `${c.top}%` }}>
              <span className={s.label}>{c.label}</span>
              {c.body}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
