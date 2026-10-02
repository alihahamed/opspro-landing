'use client';

// Face-check section: the picker's side and the supervisor's side of one clock-in. An iPhone plays the picker app
// (screens rebuilt in Figma from the real OpsPro Picker app): tap Clock in, take the selfie, on shift, shift done.
// The selfie is checked on the server; a close call lands on the supervisor's review card, and a person decides.
// Plays when it scrolls into view (and again after scrolling back up past it), no scroll lock. People are stock photos of models; data is invented.
import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import s from './facecheck.module.css';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

// where the tappable controls sit on the 390×844 screens (from the Figma frames)
const CLOCK_IN = { x: '50%', y: '68.96%' };
const SHUTTER = { x: '50%', y: '88.15%' };

const Check = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 8.4 2.6 2.6L12 5.4" /></svg>;
const Cross = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m5 5 6 6M11 5l-6 6" /></svg>;

export default function FaceCheck() {
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    const el = root.current!;
    const q = gsap.utils.selector(el);
    const stage = el.querySelector<HTMLElement>('[data-stage]')!;
    const setState = (v: string) => { stage.dataset.state = v; };
    const flag = (name: string, on: boolean) => stage.toggleAttribute(name, on);
    const clearFlags = () => ['data-hover', 'data-press', 'data-clicked'].forEach((n) => flag(n, false));

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      SplitText.create(el.querySelector('[data-title]'), {
        type: 'lines', mask: 'lines', autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, { yPercent: 100, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: el, start: 'top 75%', once: true } }),
      });
      gsap.set(q('[data-screen]:not([data-screen="clock-in"])'), { autoAlpha: 0 });
      gsap.set(q('[data-cursor]'), { autoAlpha: 0 });
      gsap.set(q('[data-ripple]'), { autoAlpha: 0 });
      const tl = gsap.timeline({ paused: true })
        .from(q('[data-phone]'), { y: 80, rotate: -4, autoAlpha: 0, duration: 1, ease: 'expo.out' })
        .from(q('[data-review]'), { y: 40, autoAlpha: 0, duration: 0.8, ease: 'expo.out' }, 0.25)
        // 1 · tap Clock in
        .fromTo(q('[data-tap="in"]'), { scale: 0.2, autoAlpha: 0.9 }, { scale: 2.4, autoAlpha: 0, duration: 0.9, ease: 'power2.out' }, 1.8)
        // 2 · the camera slides up
        .fromTo(q('[data-screen="selfie"]'), { autoAlpha: 1, yPercent: 100 }, { yPercent: 0, duration: 0.9, ease: 'expo.out' }, 2.4)
        // 3 · shutter: tap, flash
        .fromTo(q('[data-tap="shutter"]'), { scale: 0.3, autoAlpha: 0.9 }, { scale: 2.2, autoAlpha: 0, duration: 0.8, ease: 'power2.out' }, 4.2)
        .fromTo(q('[data-flash]'), { autoAlpha: 0 }, { autoAlpha: 0.95, duration: 0.1, yoyo: true, repeat: 1, ease: 'none' }, 4.35)
        // 4 · clocked in: on shift; the selfie goes to the server and comes back a close call
        .fromTo(q('[data-screen="on-shift"]'), { autoAlpha: 0, scale: 1.04 }, { autoAlpha: 1, scale: 1, duration: 0.7, ease: 'power2.out' }, 4.7)
        .call(() => setState('flagged'), [], 5.8)
        // 5 · a person decides
        .to(q('[data-cursor]'), { autoAlpha: 1, duration: 0.3 }, 6.6)
        .fromTo(q('[data-cursor]'), { x: 190, y: 120 }, { x: 0, y: 0, duration: 1.2, ease: 'power3.inOut' }, 6.6)
        .call(() => flag('data-hover', true), [], 7.6)
        // the click: pointer and button press in, a ripple spreads from the tip, the button confirms
        .to(q('[data-cursor]'), { scale: 0.82, duration: 0.1, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 8.2)
        .call(() => flag('data-press', true), [], 8.2)
        .fromTo(q('[data-ripple]'), { scale: 0, autoAlpha: 0.55 }, { scale: 1, autoAlpha: 0, duration: 0.6, ease: 'power2.out' }, 8.24)
        .call(() => { flag('data-press', false); flag('data-hover', false); flag('data-clicked', true); }, [], 8.38)
        .to(q('[data-cursor]'), { x: 70, y: 46, autoAlpha: 0, duration: 0.55, ease: 'power2.in' }, 8.75)
        .call(() => setState('approved'), [], 9.3)
        // 6 · end of the day
        .fromTo(q('[data-screen="shift-done"]'), { autoAlpha: 0, scale: 1.04 }, { autoAlpha: 1, scale: 1, duration: 0.8, ease: 'power2.out' }, 10.2);
      // Plays when the section comes into view. It only resets once it has gone fully out of view below the
      // screen (scrolling back up), so nothing vanishes while it's still visible; the next pass plays it again.
      let armed = true;
      ScrollTrigger.create({
        trigger: stage, start: 'top 70%',
        onEnter: () => { if (!armed) return; armed = false; setState('idle'); clearFlags(); tl.restart(); },
      });
      ScrollTrigger.create({
        trigger: stage, start: 'top bottom',
        onLeaveBack: () => { tl.pause(0); setState('idle'); clearFlags(); armed = true; },
      });
    });
    mm.add('(prefers-reduced-motion: reduce)', () => setState('approved'));
  }, { scope: root });

  return (
    <section ref={root} className={s.section} aria-labelledby="facecheck-title">
      <h2 id="facecheck-title" className={s.title} data-title>When a selfie looks off,<br /> a person checks it.</h2>

      <div className={s.stage} data-stage data-state="idle">
        {/* the picker's phone */}
        <figure className={s.side}>
          <div className={s.phone} data-phone>
            <span className={s.btnL} /><span className={s.btnL2} /><span className={s.btnR} />
            <div className={s.screen}>
              {/* eslint-disable @next/next/no-img-element -- static screen captures of the app */}
              <img data-screen="clock-in" src="/app/clock-in.webp" alt="OpsPro Picker app: today's store and the Clock in button" />
              <img data-screen="selfie" src="/app/selfie.webp" alt="" />
              <img data-screen="on-shift" src="/app/on-shift.webp" alt="" />
              <img data-screen="shift-done" src="/app/shift-done.webp" alt="" />
              {/* eslint-enable @next/next/no-img-element */}
              <span className={s.tap} data-tap="in" style={{ left: CLOCK_IN.x, top: CLOCK_IN.y }} aria-hidden="true" />
              <span className={s.tap} data-tap="shutter" style={{ left: SHUTTER.x, top: SHUTTER.y }} aria-hidden="true" />
              <span className={s.flash} data-flash aria-hidden="true" />
              <span className={s.island} aria-hidden="true" />
            </div>
          </div>
          <figcaption>On the picker’s phone</figcaption>
        </figure>

        {/* the supervisor's side */}
        <figure className={s.side}>
          <div className={s.review} data-review aria-hidden="true">
            <div className={s.rHead}>
              {/* eslint-disable-next-line @next/next/no-img-element -- stock portrait */}
              <img className={s.avatar} src="/people/photo-on-file.webp" alt="" />
              <div className={s.who}>
                <b>Saeed S.</b>
                <span>Clock-in at Carrefour JVC 15 · 10:02</span>
              </div>
              <span className={s.status}>
                <em className={s.sIdle}>Checking</em><em className={s.sFlag}>Needs a look</em><em className={s.sDone}>Resolved</em>
              </span>
            </div>

            <div className={s.pair}>
              <div className={s.shot}>
                {/* eslint-disable-next-line @next/next/no-img-element -- stock portrait */}
                <img src="/people/selfie-today.webp" alt="" />
                <span>Today’s selfie</span>
              </div>
              <div className={s.shot}>
                {/* eslint-disable-next-line @next/next/no-img-element -- stock portrait */}
                <img src="/people/photo-on-file.webp" alt="" />
                <span>Photo on file</span>
              </div>
              <div className={s.verdict}><b>Not sure</b><small>0.538</small></div>
            </div>

            <p className={s.rWhy}>
              <span className={s.waiting}>Comparing today’s selfie with the photo on file…</span>
              <span className={s.close}>Close to the photo on file, but not close enough to pass on its own.</span>
            </p>

            <div className={s.meter}>
              <div className={s.track}><i className={s.tSame} /><i className={s.tUnsure} /><i className={s.tDiff} /><b className={s.knob} /></div>
              <div className={s.scale}><span>Same person</span><span>Not sure</span><span>Different person</span></div>
            </div>

            <div className={s.foot}>
              <div className={s.actions}>
                <span className={s.approve}><Check /><em className={s.lblIdle}>Approve, it’s them</em><em className={s.lblDone}>Approved</em><i className={s.ripple} data-ripple /></span>
                <span className={s.reject}><Cross />Reject</span>
              </div>
              {/* a pointer that walks over to Approve and clicks it */}
              <svg className={s.cursor} data-cursor viewBox="0 0 28 28" aria-hidden="true">
                <path d="M5.5 3.2v19.4l5.2-5 3.3 7.6 3.4-1.5-3.3-7.4h7.2Z" />
              </svg>
              <div className={s.decided}>
                <i>SM</i>
                <span><b>Approved by Sara M.</b>10:04 · hours count as normal</span>
                <em><Check /></em>
              </div>
            </div>
          </div>
          <figcaption>On the supervisor’s dashboard</figcaption>
        </figure>
      </div>
    </section>
  );
}
