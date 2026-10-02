'use client';

// Face-check section: the picker's side and the supervisor's side of one clock-in. An iPhone plays the picker app
// (screens rebuilt in Figma from the real OpsPro Picker app): tap Clock in, take the selfie, on shift, shift done.
// Behind it, a MacBook shows the OpsPro dashboard's face-flag review (rebuilt from the Figma frame "OpsPro — Face flag
// review" as live HTML, so it can animate): the close call lands in the queue, a cursor clicks Approve, and the flag
// moves to "Resolved today". Plays when it scrolls into view, and again after scrolling back up past it. No scroll lock.
// People are stock photos of models; data is invented.
import { useEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import s from './facecheck.module.css';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

// where the tappable controls sit on the 390×844 phone screens (from the Figma frames)
const CLOCK_IN = { x: '50%', y: '68.96%' };
const SHUTTER = { x: '50%', y: '88.15%' };
const UI_W = 1120; // the dashboard is laid out at 1120×700 and scaled to fit the laptop screen

const PATHS: Record<string, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></>,
  cal: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></>,
  chart: <><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></>,
  trend: <><path d="m22 7-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  down: <path d="m6 9 6 6 6-6" />,
  updown: <path d="m7 15 5 5 5-5M7 9l5-5 5 5" />,
  face: <><path d="M3 7.5V5.5A2.5 2.5 0 0 1 5.5 3h2M16.5 3h2A2.5 2.5 0 0 1 21 5.5v2M21 16.5v2a2.5 2.5 0 0 1-2.5 2.5h-2M7.5 21h-2A2.5 2.5 0 0 1 3 18.5v-2" /><path d="M9 9.5v.01M15 9.5v.01M8.5 14.5a4.5 4.5 0 0 0 7 0" /></>,
  shield: <><path d="M12 3 5 6v5.5c0 4.2 2.9 7.9 7 9.5 4.1-1.6 7-5.3 7-9.5V6Z" /><path d="m9 12 2.2 2.2L15.5 10" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  cross: <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />,
};
const Icon = ({ n }: { n: string }) => <svg viewBox="0 0 24 24" aria-hidden="true">{PATHS[n]}</svg>;
// a number that changes once the flag is resolved
const Swap = ({ a, b }: { a: string; b: string }) => <><span className={s.pre}>{a}</span><span className={s.post}>{b}</span></>;

const NAV: [string, [string, string, ReactNode?, boolean?][]][] = [
  ['Operations', [['Live dashboard', 'grid'], ['Alerts', 'bell', <Swap key="n" a="47" b="46" />, true], ['Employees', 'users'], ['Locations', 'pin']]],
  ['Schedule', [['Roster', 'cal'], ['OT verification', 'clock', '10'], ['Reports', 'chart'], ['Projected days', 'trend']]],
  ['Admin', [['Add employees', 'plus']]],
];
const FILTERS: [string, ReactNode, boolean?][] = [
  ['All open', <Swap key="n" a="47" b="46" />], ['No-shows', '18'], ['Late', '14'], ['Face flagged', <Swap key="n" a="3" b="2" />, true], ['Missed clock-out', '9'], ['Document expiry', '3'],
];
const QUEUE = [
  { ini: 'OF', name: 'Omar F.', ago: '24 min', sub: 'Circle Mall JVC · out 09:41', tag: 'Not sure · 0.551', amber: true },
  { ini: 'JM', name: 'Jaya M.', ago: '1 h', sub: 'Viva JVT · first clock-in', tag: 'New photo · check ID' },
];
const RESOLVED = [
  { ini: 'RK', name: 'Rahul K.', what: 'Approved by Sara M.', at: '08:41', ok: true },
  { ini: 'AH', name: 'Ali H.', what: 'Rejected, not them', at: '07:58' },
  { ini: 'MB', name: 'Musa B.', what: 'Approved by Sara M.', at: '07:12', ok: true },
];

export default function FaceCheck() {
  const root = useRef<HTMLElement>(null);

  // scale the 1120×700 dashboard to whatever width the laptop screen has
  useEffect(() => {
    const lcd = root.current?.querySelector<HTMLElement>('[data-lcd]');
    if (!lcd) return;
    const ro = new ResizeObserver(([e]) => lcd.style.setProperty('--s', String(e.contentRect.width / UI_W)));
    ro.observe(lcd);
    return () => ro.disconnect();
  }, []);

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
        .from(q('[data-mac]'), { y: 60, autoAlpha: 0, duration: 1.1, ease: 'expo.out' })
        .from(q('[data-phone]'), { x: -30, y: 80, rotate: -4, autoAlpha: 0, duration: 1, ease: 'expo.out' }, 0.3)
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
        // 5 · a person decides: the pointer walks over to Approve and clicks it
        .to(q('[data-cursor]'), { autoAlpha: 1, duration: 0.3 }, 6.6)
        .fromTo(q('[data-cursor]'), { x: 260, y: 150 }, { x: 0, y: 0, duration: 1.2, ease: 'power3.inOut' }, 6.6)
        .call(() => flag('data-hover', true), [], 7.6)
        .to(q('[data-cursor]'), { scale: 0.82, duration: 0.1, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 8.2)
        .call(() => flag('data-press', true), [], 8.2)
        .fromTo(q('[data-ripple]'), { scale: 0, autoAlpha: 0.55 }, { scale: 1, autoAlpha: 0, duration: 0.6, ease: 'power2.out' }, 8.24)
        .call(() => { flag('data-press', false); flag('data-hover', false); flag('data-clicked', true); }, [], 8.38)
        .to(q('[data-cursor]'), { x: 90, y: 60, autoAlpha: 0, duration: 0.55, ease: 'power2.in' }, 8.75)
        // the flag leaves the queue and lands in Resolved today
        .call(() => setState('approved'), [], 9.3)
        // 6 · end of the day
        .fromTo(q('[data-screen="shift-done"]'), { autoAlpha: 0, scale: 1.04 }, { autoAlpha: 1, scale: 1, duration: 0.8, ease: 'power2.out' }, 10.4);
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
        {/* the supervisor's laptop: the dashboard's face-flag review */}
        <div className={s.mac} data-mac role="img" aria-label="The OpsPro dashboard on a laptop: a supervisor reviews a clock-in selfie that didn't clearly match the photo on file, and approves it.">
          <div className={s.lid}>
            <div className={s.lcd} data-lcd>
              <div className={s.ui} aria-hidden="true">
                <aside className={s.nav}>
                  <p className={s.brand}>
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="#00CCBC" strokeWidth="2.4" strokeDasharray="4.2 2.4" /><circle cx="12" cy="12" r="4" fill="#0F1A1A" stroke="none" /></svg>
                    OpsPro
                  </p>
                  <div className={s.ws}><i>W</i><span><b>WokeWorks Ops</b>117 stores · UAE</span><Icon n="updown" /></div>
                  {NAV.map(([group, items]) => (
                    <div key={group}>
                      <p className={s.group}>{group}</p>
                      {items.map(([label, ic, count, on]) => (
                        <p key={label} className={s.item} data-on={on || undefined}><Icon n={ic} />{label}{count && <small>{count}</small>}</p>
                      ))}
                    </div>
                  ))}
                  <div className={s.me}><i>SM</i><span><b>Sara Malik</b>Ops manager</span></div>
                </aside>

                <div className={s.canvas}>
                  <div className={s.top}>
                    <b>Alerts</b><span className={s.live}>Live</span><span className={s.date}>Thu 1 Oct · 10:03 GST</span>
                    <span className={s.search}><Icon n="search" />Search pickers<kbd>⌘K</kbd></span>
                    <span className={s.sup}>All supervisors<Icon n="down" /></span>
                  </div>
                  <div className={s.filters}>
                    {FILTERS.map(([label, count, on]) => <span key={label} className={s.filter} data-on={on || undefined}>{label}<small>{count}</small></span>)}
                  </div>

                  <div className={s.body}>
                    <div className={s.queue}>
                      <p className={s.qHead}><b>Face flagged</b><span><Swap a="3" b="2" /> to review</span></p>
                      <div className={s.fold} data-saeed>
                        <div><div className={s.qItem} data-on>
                          {/* eslint-disable-next-line @next/next/no-img-element -- stock portrait */}
                          <img className={s.ava} src="/people/photo-on-file.webp" alt="" />
                          <div className={s.qText}>
                            <b>Saeed S.<small>1 min</small></b>
                            <span>Carrefour JVC 15 · in 10:02</span>
                            <span className={s.tag}><em className={`${s.tGrey} ${s.qIdle}`}>Checking</em><em className={`${s.tAmber} ${s.qFlag}`}>Not sure · 0.538</em></span>
                          </div>
                        </div></div>
                      </div>
                      {QUEUE.map((f) => (
                        <div key={f.name} className={s.fold}><div><div className={s.qItem}>
                          <i className={s.ava}>{f.ini}</i>
                          <div className={s.qText}>
                            <b>{f.name}<small>{f.ago}</small></b>
                            <span>{f.sub}</span>
                            <span className={s.tag}><em className={f.amber ? s.tAmber : s.tGrey}>{f.tag}</em></span>
                          </div>
                        </div></div></div>
                      ))}

                      <div className={s.resolved}>
                        <p className={s.rHead}><b>Resolved today</b><span><Swap a="5" b="6" /> approved · 1 rejected</span></p>
                        <div className={s.unfold}><div><p className={s.rRow}>
                          {/* eslint-disable-next-line @next/next/no-img-element -- stock portrait */}
                          <img className={s.ava} src="/people/photo-on-file.webp" alt="" />
                          <span><b>Saeed S.</b><em className={s.ok}>Approved by Sara M.</em></span>10:04
                        </p></div></div>
                        {RESOLVED.map((r) => (
                          <p key={r.name} className={s.rRow}><i className={s.ava}>{r.ini}</i><span><b>{r.name}</b><em className={r.ok ? s.ok : s.no}>{r.what}</em></span>{r.at}</p>
                        ))}
                      </div>
                    </div>

                    <div className={s.panel}>
                      <div className={s.pTop}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- stock portrait */}
                        <img src="/people/photo-on-file.webp" alt="" />
                        <p className={s.pWho}><b>Saeed S.</b>Picker · Carrefour Market JVC 15 · OP-0412</p>
                        <span className={s.status}>
                          <em className={s.sIdle}>Checking</em><em className={s.sFlag}><Icon n="face" />Needs a look</em><em className={s.sDone}><Icon n="check" />Resolved</em>
                        </span>
                      </div>
                      <p className={s.why}>
                        <span className={s.waiting}>Comparing today’s selfie with the photo on file…</span>
                        <span className={s.close}>Borderline match on clock-in at 10:02 (distance 0.538). Close to the photo on file, but not close enough to pass on its own.</span>
                      </p>
                      <div className={s.pair}>
                        <div className={s.shot}>
                          {/* eslint-disable-next-line @next/next/no-img-element -- stock portrait */}
                          <img src="/people/selfie-today.webp" alt="" />
                          <span>Captured · today 10:02</span>
                        </div>
                        <div className={s.shot}>
                          {/* eslint-disable-next-line @next/next/no-img-element -- stock portrait */}
                          <img src="/people/photo-on-file.webp" alt="" />
                          <span>Reference · on file</span>
                        </div>
                        <div className={s.verdict}><b>Not sure</b><small>0.538</small></div>
                      </div>
                      <div className={s.meter}>
                        <div className={s.track}><i className={s.tSame} /><i className={s.tUnsure} /><i className={s.tDiff} /><b className={s.knob} /></div>
                        <div className={s.scale}><span>Same person</span><span>Not sure</span><span>Different person</span></div>
                      </div>
                      <div className={s.facts}>
                        <p className={s.fact}><Icon n="pin" /><span>Location<b>Inside geofence</b></span></p>
                        <p className={s.fact}><Icon n="clock" /><span>Shift<b>10:00 to 19:00</b></span></p>
                        <p className={s.fact}><Icon n="shield" /><span>Last check<b>Matched</b></span></p>
                      </div>
                      <div className={s.foot}>
                        <div className={s.actions}>
                          <span className={s.note}>Add a note for payroll</span>
                          <span className={s.reject}><Icon n="cross" />Reject, not them</span>
                          <span className={s.approveWrap}>
                            <span className={s.approve}><Icon n="check" /><em className={s.lblIdle}>Approve, it’s them</em><em className={s.lblDone}>Approved</em><i className={s.ripple} data-ripple /></span>
                            {/* a pointer that walks over to Approve and clicks it */}
                            <svg className={s.cursor} data-cursor viewBox="0 0 28 28"><path d="M5.5 3.2v19.4l5.2-5 3.3 7.6 3.4-1.5-3.3-7.4h7.2Z" /></svg>
                          </span>
                        </div>
                        <div className={s.decided}>
                          <i>SM</i>
                          <span><b>Approved by Sara M.</b>10:04 · hours count as normal</span>
                          <em><Icon n="check" /></em>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className={s.base} />
        </div>
        <p className={s.macLabel}>On the supervisor’s dashboard</p>

        {/* the picker's phone, in front of the laptop */}
        <div className={s.phoneWrap}>
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
        <p className={s.label}>On the picker’s phone</p>
        </div>
      </div>
    </section>
  );
}
