'use client';

// Product section: the OpsPro live board on the MacBook photo (public/mockup-2.png), as live HTML laid over the laptop's
// screen (rebuilt from the Figma frames "Live map · Overview" and "Live map · Palm selected"). The map is a still of our MapLibre style (OpenFreeMap / OpenStreetMap data); the
// sites sit on it where they really are. On scroll-in a cursor clicks Palm Jumeirah to open its card, then clicks Cover,
// and the no-show becomes "Jomar R. is covering". Plays again each time the section comes back into view. The markup is
// the finished state, so reduced motion and no-JS see it as it ends. Names are invented.
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import s from './features.module.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const UI_W = 1280; // the dashboard is laid out at 1280×765 (the photo's screen ratio) and scaled to fit it

const P = {
  board: 'M3.5 3.5h7v7h-7zM13.5 3.5h7v7h-7zM3.5 13.5h7v7h-7zM13.5 13.5h7v7h-7z',
  cal: 'M3 4.5h18v16.5H3zM16 2.5v4M8 2.5v4M3 10h18',
  users: 'M9 4.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6',
  leave: 'M12 3a9 9 0 0 0-9 9h18a9 9 0 0 0-9-9zM12 12v8M9.5 20h5',
  money: 'M2.5 6h19v12h-19zM12 9.4a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2zM6 9.5v5M18 9.5v5',
  chart: 'M4 20v-9M10 20V5M16 20v-6M2.5 20h19',
  help: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.6M12 17v.2',
  gear: 'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7',
  search: 'M11 4.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM20 20l-4.2-4.2',
  panel: 'M3.5 4h17v16h-17zM9.5 4v16',
  updown: 'M8 9l4-4 4 4M8 15l4 4 4-4',
  pulse: 'M3 12h4l2.5-6 5 12 2.5-6h4',
  down: 'M6 9l6 6 6-6',
  clock: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM12 7.5V12l3 2',
  x: 'M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17zM9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2',
  cover: 'M10 4.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM3.5 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
};
const Ic = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>;

// sites at their projected positions on the 1012×674 map; `bad` sites carry a problem
const SITES = [
  { id: 'palm', name: 'Palm Jumeirah', x: 360, y: 106, n: 6, of: 7, bad: 'noshow' },
  { id: 'marina', name: 'Marina', x: 368, y: 387, n: 10, of: 10 },
  { id: 'jlt', name: 'JLT', x: 412, y: 475, n: 7, of: 8, bad: 'late' },
  { id: 'media', name: 'Media City', x: 500, y: 273, n: 6, of: 6 },
  { id: 'heights', name: 'Barsha Heights', x: 659, y: 246, n: 9, of: 9 },
  { id: 'barsha', name: 'Al Barsha', x: 846, y: 154, n: 12, of: 12 },
  { id: 'south', name: 'Al Barsha South', x: 874, y: 396, n: 8, of: 8, left: true },
  { id: 'jvc', name: 'JVC', x: 922, y: 598, n: 7, of: 7, left: true },
] as const;
const NAV = [['Operations', [['Live board', P.board, '2'], ['Roster', P.cal], ['People', P.users], ['Leave', P.leave, '3']]], ['Money', [['Vendor costs', P.money], ['Reports', P.chart]]]] as const;

export default function Features() {
  const root = useRef<HTMLElement>(null);

  // scale the 1280×765 dashboard to whatever width the laptop screen has in the photo
  useEffect(() => {
    const lcd = root.current?.querySelector<HTMLElement>('[data-screen]');
    if (!lcd) return;
    const ro = new ResizeObserver(([e]) => lcd.style.setProperty('--s', String(e.contentRect.width / UI_W)));
    ro.observe(lcd);
    return () => ro.disconnect();
  }, []);

  useGSAP(() => {
    const el = root.current!;
    const q = gsap.utils.selector(el);
    const board = el.querySelector<HTMLElement>('[data-board]')!;
    const ui = el.querySelector<HTMLElement>('[data-ui]')!;
    const cursor = el.querySelector<HTMLElement>('[data-cursor]')!;
    const flag = (name: string, on: boolean) => board.toggleAttribute(name, on);
    const reset = () => { flag('data-sel', false); flag('data-covered', false); gsap.set(cursor, { autoAlpha: 0 }); };
    // where a target's centre sits in the unscaled dashboard
    const spot = (sel: string) => {
      const r = el.querySelector<HTMLElement>(sel)!.getBoundingClientRect(), u = ui.getBoundingClientRect(), k = u.width / UI_W;
      return { x: (r.left + r.width / 2 - u.left) / k, y: (r.top + r.height / 2 - u.top) / k };
    };

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      reset();
      const tl = gsap.timeline({ paused: true });
      const click = (t: number) => tl.to(cursor, { scale: 0.82, duration: 0.1, yoyo: true, repeat: 1, ease: 'power1.inOut' }, t);
      tl.from(q('[data-frame]'), { y: -56, autoAlpha: 0, clipPath: 'inset(0% 0% 100% 0% round 32px)', duration: 1.3, ease: 'expo.out', clearProps: 'clipPath' })
        .from(q('[data-photo]'), { scale: 1.1, duration: 1.7, ease: 'expo.out' }, 0)
        .from(q('[data-pin]'), { scale: 0.5, autoAlpha: 0, duration: 0.5, ease: 'back.out(2)', stagger: 0.06 }, 0.5)
        .from(q('[data-over]'), { y: 10, autoAlpha: 0, duration: 0.6, ease: 'expo.out', stagger: 0.08 }, 1)
        // the cursor opens Palm Jumeirah...
        .set(cursor, { x: 1180, y: 680 }, 2.2)
        .to(cursor, { autoAlpha: 1, duration: 0.3 }, 2.2)
        .to(cursor, { x: () => spot('[data-pin="palm"] [data-badge]').x, y: () => spot('[data-pin="palm"] [data-badge]').y, duration: 1.2, ease: 'power3.inOut' }, 2.2);
      click(3.5);
      tl.call(() => flag('data-sel', true), [], 3.6)
        // ...then sends cover
        .to(cursor, { x: () => spot('[data-cover]').x, y: () => spot('[data-cover]').y, duration: 0.9, ease: 'power3.inOut' }, 4.7);
      click(5.7);
      tl.call(() => flag('data-covered', true), [], 5.8)
        .to(cursor, { x: '+=120', y: '+=90', autoAlpha: 0, duration: 0.6, ease: 'power2.in' }, 7);

      // play on the way in; reset once it's fully off screen above, so nothing vanishes while visible
      let armed = true;
      ScrollTrigger.create({ trigger: board, start: 'top 75%', onEnter: () => { if (!armed) return; armed = false; reset(); tl.restart(); } });
      ScrollTrigger.create({ trigger: board, start: 'top bottom', onLeaveBack: () => { tl.pause(0); reset(); armed = true; } });
    });
  }, { scope: root });

  return (
    <section ref={root} id="product" className={s.section}>
      <h2 className={s.title}>Everything your ops team used to chase on WhatsApp.</h2>

      <div className={s.frame} data-frame role="img" aria-label="The OpsPro live board on a laptop: eight sites on a map of Dubai. Palm Jumeirah has a no-show; the manager opens it and sends cover, and Jomar R. is on the way.">
        <div className={s.photo} data-photo>
          {/* eslint-disable-next-line @next/next/no-img-element -- a single large static photo */}
          <img className={s.shot} src="/mockup-2.png" alt="" decoding="async" />
          <div className={s.screen} data-screen>
              <div className={s.ui} data-ui aria-hidden="true">
                <div className={s.board} data-board data-sel data-covered>
                  {/* ---------- sidebar ---------- */}
                  <aside className={s.side}>
                    <div className={s.logo}>
                      <i className={s.tile}><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="#00CCBC" strokeWidth="2.4" strokeDasharray="4.2 2.4" /><circle cx="12" cy="12" r="4" fill="#fff" stroke="none" /></svg></i>
                      <b>OpsPro</b><Ic d={P.panel} />
                    </div>
                    <div className={s.search}><Ic d={P.search} /><span>Search</span><kbd>⌘K</kbd></div>
                    {NAV.map(([group, items]) => (
                      <div key={group}>
                        <p className={s.group}>{group}</p>
                        {items.map(([label, d, badge]) => (
                          <div key={label} className={s.item} {...(label === 'Live board' && { 'data-on': '' })}>
                            <Ic d={d} /><span>{label}</span>
                            {badge === '2' ? <em className={s.badgeRed}><span className={s.was}>2</span><span className={s.now}>1</span></em> : badge && <em className={s.badge}>{badge}</em>}
                          </div>
                        ))}
                      </div>
                    ))}
                    <div className={s.sideFoot}>
                      <div className={s.item}><Ic d={P.help} /><span>Help</span></div>
                      <div className={s.item}><Ic d={P.gear} /><span>Settings</span></div>
                      <div className={s.org}><i>A</i><span><b>Client A</b>8 locations</span><Ic d={P.updown} /></div>
                    </div>
                  </aside>

                  {/* ---------- main ---------- */}
                  <div className={s.main}>
                    <header className={s.head}>
                      <div><h3>Live board</h3><p>Wednesday 7 October · 10:42</p></div>
                      <span className={s.live}><Ic d={P.pulse} />Live</span>
                      <span className={s.select}><Ic d={P.users} />All managers<Ic d={P.down} /></span>
                    </header>

                    <div className={s.map}>
                      {SITES.map((x) => (
                        <div key={x.id} className={s.pin} data-pin={x.id} {...('bad' in x && { 'data-bad': x.bad })} {...('left' in x && { 'data-left': '' })} style={{ left: x.x, top: x.y }}>
                          <i className={s.badgeDot} data-badge>{x.n}</i>
                          <span className={s.pinLab}>
                            <b>{x.name}</b><span>{x.n}/{x.of}</span>
                            {'bad' in x && (x.bad === 'late' ? <em>· 1 late</em> : <><em className={s.was}>· 1 no-show</em><em className={s.now}>· cover sent</em></>)}
                          </span>
                        </div>
                      ))}

                      <div className={s.filters} data-over>
                        <span data-on>All <i>8</i></span>
                        <span>Needs attention <i data-red><span className={s.was}>2</span><span className={s.now}>1</span></i></span>
                        <span>All in <i>6</i></span>
                      </div>

                      <div className={s.stats} data-over>
                        <div><b>65<small>/67</small></b>in now</div>
                        <div><b>7</b>on break</div>
                        <div data-red><b>1</b>late</div>
                        <div data-red><b>1</b>no-show</div>
                        <div><b>9</b>later today</div>
                      </div>

                      <div className={s.alerts} data-over>
                        <div className={s.alert}>
                          <i className={s.alertIc}><Ic d={P.clock} /></i>
                          <span className={s.alertTx}><b>Ravi S. is 14 min late</b>JLT · due 10:28</span>
                          <span className={s.btnDark}><Ic d={P.phone} />Call</span>
                        </div>
                        <div className={`${s.alert} ${s.swap}`}>
                          <span className={s.was}>
                            <i className={s.alertIc}><Ic d={P.x} /></i>
                            <span className={s.alertTx}><b>Sam T. didn’t show</b>Palm Jumeirah · due 10:00</span>
                            <span className={s.btnDark}><Ic d={P.cover} />Cover</span>
                          </span>
                          <span className={s.now}>
                            <i className={s.okIc}><Ic d={P.check} /></i>
                            <span className={s.alertTx}><b>Jomar R. is covering</b>Palm Jumeirah · arrives 10:55</span>
                          </span>
                        </div>
                      </div>

                      <div className={s.zoom} data-over><Ic d={P.plus} /><Ic d={P.minus} /></div>
                      <p className={s.attr}>OpenFreeMap © OpenMapTiles · OpenStreetMap</p>

                      {/* the card that opens on Palm Jumeirah */}
                      <div className={s.pop}>
                        <div className={s.popHead}>
                          <span><b>Palm Jumeirah</b>Golden Mile · Omar H. manages</span>
                          <strong>6<small>/7 in</small></strong>
                        </div>
                        <div className={s.slots}>
                          {Array.from({ length: 6 }, (_, i) => <i key={i} />)}
                          <i data-gap><span className={s.was}><Ic d={P.clock} /></span><span className={s.now}><Ic d={P.cover} /></span></i>
                        </div>
                        <div className={`${s.row} ${s.swap}`}>
                          <span className={s.was}>
                            <i className={s.ava}>ST</i>
                            <span className={s.alertTx}><b>Sam T. · Picker</b>Due 10:00, not in</span>
                            <span className={s.btnDark} data-cover><Ic d={P.cover} />Cover</span>
                          </span>
                          <span className={s.now}>
                            <i className={s.avaOk}>JR</i>
                            <span className={s.alertTx}><b>Jomar R. · Reliever</b>On the way, arrives 10:55</span>
                            <i className={s.okIc}><Ic d={P.check} /></i>
                          </span>
                        </div>
                        <p className={s.popIn}>In: Aisha, Nimal, Chinedu, Bilal, Marco, Lena</p>
                      </div>
                    </div>
                  </div>
                </div>
                <svg className={s.cursor} data-cursor viewBox="0 0 28 28"><path d="M5.5 3.2v19.4l5.2-5 3.3 7.6 3.4-1.5-3.3-7.4h7.2Z" /></svg>
              </div>
          </div>
        </div>
      </div>
    </section>
  );
}
