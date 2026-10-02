'use client';

// Face-flag section: the verification desk. A dark comparator shows today's selfie next to the photo on file,
// with a verdict bar underneath (same person / not sure / different person); a queue on the right holds the flags. When it scrolls
// into view it works through three real flag types from the product, one decision at a time. Faces are
// generated 3D scan wireframes, never photos of people; names and numbers are invented.
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import s from './facecheck.module.css';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

// Face geometry for the scan wireframe: width, nose length/size, eye spacing, jaw, and head turn (yaw, radians).
type Person = { w: number; nose: number; eyes: number; jaw: number; yaw: number };
type Flag = {
  title: string; line: string; meta: string; at: string; distance: number; verdict: 'approve' | 'reject';
  captured: Person; reference: Person | 'id'; replaced?: Person; refNote: string; photo: string; why: string; decided: string;
};

const FLAGS: Flag[] = [
  {
    title: 'Borderline match on clock-in', line: 'Distance 0.538. Compare the selfie with the reference.',
    meta: 'Clock-in · Viva JVT · 08:02', at: '08:02', distance: 0.538, verdict: 'approve', photo: '/people/picker-jm.webp', decided: '08:04',
    why: 'Close to the photo on file, but not close enough to pass on its own.',
    captured: { w: 0.8, nose: 1, eyes: 0.3, jaw: 0.95, yaw: 0.42 },
    reference: { w: 0.8, nose: 1.05, eyes: 0.31, jaw: 1, yaw: -0.06 }, refNote: 'Since 12 Mar',
  },
  {
    title: 'First clock-in, no reference on file', line: 'Today’s selfie became the reference. Check it against the Emirates ID before trusting it.',
    meta: 'Clock-in · Spinneys Circle Mall · 07:56', at: '07:56', distance: 0.712, verdict: 'reject', photo: '/people/picker-rk.webp', decided: '08:01',
    why: 'There’s no photo on file yet, so the selfie is checked against the ID card.',
    captured: { w: 0.86, nose: 0.8, eyes: 0.33, jaw: 1.15, yaw: 0.36 },
    reference: 'id', refNote: 'ID card',
  },
  {
    title: 'Reference photo replaced', line: 'Someone changed the stored face from the dashboard. Future clock-ins will match the new photo, so confirm it first.',
    meta: 'Replaced 09:14 by ops · Carrefour JVC 15', at: '09:31', distance: 0.512, verdict: 'approve', photo: '/people/picker-sv.webp', decided: '09:36',
    why: 'The photo on file was just replaced, so someone confirms it’s the same person.',
    captured: { w: 0.74, nose: 0.9, eyes: 0.28, jaw: 0.9, yaw: -0.4 },
    reference: { w: 0.74, nose: 0.92, eyes: 0.285, jaw: 0.92, yaw: 0.05 },
    replaced: { w: 0.84, nose: 1.15, eyes: 0.33, jaw: 1.1, yaw: 0.05 }, refNote: 'Replaced 09:14',
  },
];
const WAITING = 15;
const REVIEWER = 'Sara M.';
// where the pointer sits on the verdict bar: the three zones get readable widths (0–0.5, 0.5–0.6, 0.6–1 → 0–40%, 40–64%, 64–100%)
const barPos = (d: number) => d < 0.5 ? (d / 0.5) * 40 : d < 0.6 ? 40 + ((d - 0.5) / 0.1) * 24 : 64 + ((d - 0.6) / 0.4) * 36;
const zone = (d: number) => d < 0.5 ? 'Same person' : d < 0.6 ? 'Not sure' : 'Different person';

// The face as a height field: an ellipsoid head plus gaussian bumps for brow, eye sockets, nose, lips and chin.
const g = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) => Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));
function depth(p: Person, x: number, y: number) {
  const a = p.w * (1 - 0.28 * Math.max(0, y) ** 2 * p.jaw), b = 1.08;
  const r = (x / a) ** 2 + (y / b) ** 2;
  if (r > 1) return null;
  const ax = Math.abs(x);
  return 0.62 * Math.sqrt(1 - r)
    + 0.1 * g(ax, y, p.eyes, -0.32, 0.22, 0.06)             // brow
    - 0.16 * g(ax, y, p.eyes, -0.12, 0.15, 0.09)            // eye sockets
    + 0.4 * p.nose * g(x, y, 0, 0.06 * p.nose, 0.085, 0.27) // nose ridge
    + 0.16 * g(x, y, 0, 0.3 * p.nose, 0.13, 0.09)           // nose tip
    + 0.07 * g(ax, y, 0.4, 0.2, 0.18, 0.15)                 // cheeks
    + 0.09 * g(x, y, 0, 0.56, 0.22, 0.05)                   // lips
    - 0.04 * g(x, y, 0, 0.64, 0.2, 0.03)                    // lip line
    + 0.08 * g(x, y, 0, 0.86, 0.2, 0.1);                    // chin
}
// Horizontal scan lines across the surface, seen slightly from below and turned by `yaw`, so every feature
// lifts the lines it crosses (the Face ID look). Plus the head's silhouette. Nearer lines are brighter.
function meshPaths(p: Person) {
  const S = 70, cx = 100, cy = 108, cy_ = Math.cos(p.yaw), sy_ = Math.sin(p.yaw), PITCH = 0.42, cp = Math.cos(PITCH), sp = Math.sin(PITCH);
  const proj = (x: number, y: number, z: number) => {
    const zz = -x * sy_ + z * cy_;
    return [cx + (x * cy_ + z * sy_) * S, cy + (y * cp - zz * sp) * S, zz] as const;
  };
  const out: { d: string; o: number }[] = [];
  for (let y = -1.0; y <= 1.0; y += 0.055) {
    let d = '', zs = 0, n = 0;
    for (let x = -1.1; x <= 1.1; x += 0.03) {
      const z = depth(p, x, y);
      if (z === null) continue;
      const [X, Y, Z] = proj(x, y, z);
      d += `${n ? 'L' : 'M'}${X.toFixed(1)} ${Y.toFixed(1)}`; zs += Z; n++;
    }
    if (n > 2) out.push({ d, o: Math.min(1, Math.max(0.25, 0.45 + (zs / n) * 1.2)) });
  }
  // silhouette: right edge top to bottom, then left edge back up
  const edge = (side: 1 | -1) => Array.from({ length: 41 }, (_, i) => {
    const y = side === 1 ? -1.07 + i * 0.0535 : 1.07 - i * 0.0535;
    const a = p.w * (1 - 0.28 * Math.max(0, y) ** 2 * p.jaw);
    return proj(side * a * Math.sqrt(Math.max(0, 1 - (y / 1.08) ** 2)), y, 0.02);
  });
  out.push({ d: [...edge(1), ...edge(-1)].map(([X, Y], i) => `${i ? 'L' : 'M'}${X.toFixed(1)} ${Y.toFixed(1)}`).join('') + 'Z', o: 0.55 });
  return out;
}
// Built in the browser after hydration, so the page HTML doesn't carry thousands of coordinates.
function Mesh({ p }: { p: Person }) {
  const ref = useRef<SVGGElement>(null);
  useEffect(() => {
    ref.current!.innerHTML = meshPaths(p).map((m, i) => `<path d="${m.d}" pathLength="1" style="--i:${i};opacity:${m.o.toFixed(2)}"/>`).join('');
  }, [p]);
  return (
    <svg viewBox="0 0 200 220" className={s.portrait}>
      <defs><radialGradient id="scanGlow" cx="50%" cy="48%" r="55%"><stop offset="0" stopColor="#00CCBC" stopOpacity="0.14" /><stop offset="1" stopColor="#00CCBC" stopOpacity="0" /></radialGradient></defs>
      <rect width="200" height="220" fill="url(#scanGlow)" />
      <g ref={ref} className={s.mesh} />
    </svg>
  );
}

// A generic resident ID card (deliberately not a copy of any official design). Number is masked.
function IdCard({ photo }: { photo: string }) {
  return (
    <div className={s.idCard}>
      <div className={s.idTop}><span>Resident identity card</span><i className={s.idChip} /></div>
      <div className={s.idBody}>
        {/* eslint-disable-next-line @next/next/no-img-element -- small static portrait */}
        <img src={photo} alt="" width={90} height={110} />
        <dl>
          <dt>Name</dt><dd>Rohan Kumar</dd>
          <dt>ID number</dt><dd>784-1994-•••••••-3</dd>
          <dt>Nationality</dt><dd>India</dd>
          <dt>Expiry</dt><dd>14/06/2028</dd>
        </dl>
      </div>
    </div>
  );
}

const Check = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 8.4 2.6 2.6L12 5.4" /></svg>;
const Cross = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m5 5 6 6M11 5l-6 6" /></svg>;
const Lock = () => <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="7" width="9" height="6.5" rx="1.6" /><path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7" /></svg>;

export default function FaceCheck() {
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    const el = root.current!;
    const desk = el.querySelector<HTMLElement>('[data-desk]')!;
    const count = el.querySelector<HTMLElement>('[data-count]')!;
    const items = el.querySelectorAll<HTMLElement>('[data-item]');
    const cases = el.querySelectorAll<HTMLElement>('[data-case]');

    // step: which flag is open; phase: 'scan' while it's being compared, 'done' once decided
    const show = (step: number, phase: 'scan' | 'done') => {
      desk.dataset.step = String(step);
      desk.dataset.phase = phase;
      desk.style.setProperty('--d', String(barPos(FLAGS[step].distance)));
      cases.forEach((c, i) => c.toggleAttribute('data-active', i === step));
      items.forEach((it, i) => { it.dataset.state = i < step || (i === step && phase === 'done') ? 'resolved' : i === step ? 'open' : 'waiting'; });
      count.textContent = String(WAITING - step - (phase === 'done' ? 1 : 0));
    };

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      desk.style.setProperty('--d', '0');
      SplitText.create(el.querySelector('[data-title]'), {
        type: 'lines', mask: 'lines', autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, { yPercent: 100, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: el, start: 'top 75%', once: true } }),
      });

      const tl = gsap.timeline({ scrollTrigger: { trigger: desk, start: 'top 70%', once: true } });
      tl.from(el.querySelectorAll('[data-enter]'), { y: 48, autoAlpha: 0, duration: 0.8, ease: 'expo.out', stagger: 0.12 });
      FLAGS.forEach((_, i) => {
        tl.call(() => show(i, 'scan'), [], i === 0 ? '-=0.2' : '+=0.9');
        tl.call(() => show(i, 'done'), [], '+=1.5');
      });
    });
    mm.add('(prefers-reduced-motion: reduce)', () => show(FLAGS.length - 1, 'done'));
  }, { scope: root });

  return (
    <section ref={root} className={s.section} aria-labelledby="facecheck-title">
      <header className={s.head}>
        <h2 id="facecheck-title" className={s.title} data-title>When a selfie looks off,<br /> a person checks it.</h2>
      </header>

      <div className={s.desk} data-desk data-step="0" data-phase="idle" aria-hidden="true">
        {/* the comparator */}
        <div className={s.panel} data-enter>
          {FLAGS.map((f, i) => (
            <div key={f.title} className={s.case} data-case={i} data-active={i === 0 ? '' : undefined}>
              <div className={s.caseHead}>
                <p className={s.caseTitle}>{f.title}</p>
                <p className={s.caseMeta}>{f.meta}</p>
              </div>

              <div className={s.compare}>
                <figure className={s.frame}>
                  <div className={s.photo}>
                    <Mesh p={f.captured} />
                    <span className={s.scan} />
                    <span className={s.stamp} data-verdict={f.verdict}>{f.verdict === 'approve' ? <><Check />Approved</> : <><Cross />Rejected</>}</span>
                  </div>
                  <figcaption>Today’s selfie<span>{f.at}</span></figcaption>
                </figure>
                <figure className={s.frame}>
                  <div className={s.photo}>
                    {f.reference === 'id' ? <IdCard photo="/people/id-rk.webp" /> : <Mesh p={f.reference} />}
                    {f.replaced && <div className={s.oldRef}><Mesh p={f.replaced} /><span>Previous photo</span></div>}
                    <span className={s.scan} />
                  </div>
                  <figcaption>{f.reference === 'id' ? 'On file' : 'Photo on file'}<span>{f.refNote}</span></figcaption>
                </figure>
              </div>

              <div className={s.verdictBar}>
                <div className={s.track}>
                  <i className={s.zSame}>Same person</i><i className={s.zUnsure}>Not sure</i><i className={s.zDiff}>Different person</i>
                  <span className={s.pointer}><b>{zone(f.distance)}</b><small>{f.distance.toFixed(3)}</small></span>
                </div>
              </div>

              <div className={s.decide}>
                <p className={s.why}>{f.why}</p>
                <span className={s.btnApprove} data-press={f.verdict === 'approve' ? '' : undefined}><Check />Approve, it’s them</span>
                <span className={s.btnReject} data-press={f.verdict === 'reject' ? '' : undefined}><Cross />Reject, not them</span>
              </div>
            </div>
          ))}
        </div>

        {/* the queue */}
        <aside className={s.queue} data-enter>
          <div className={s.qHead}>
            <p>Face flags</p>
            <span><b data-count>{WAITING}</b>waiting for a decision</span>
          </div>
          <ol className={s.list}>
            {FLAGS.map((f) => (
              <li key={f.title} className={s.item} data-item data-state="waiting">
                {/* eslint-disable-next-line @next/next/no-img-element -- tiny static avatar */}
                <img className={s.thumb} src={f.photo} alt="" width={40} height={40} />
                <span className={s.itemText}><b>{f.title}</b>{f.line}</span>
                <div className={s.itemFoot}>
                  <div>
                    <span className={s.badge} data-verdict={f.verdict}>
                      <i>{f.verdict === 'approve' ? <Check /> : <Cross />}</i>
                      <b>{f.verdict === 'approve' ? 'Approved' : 'Rejected'}</b>
                      <small>{REVIEWER} · {f.decided}</small>
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <div className={s.bulk}>
            <span className={s.bulkBtn}><Lock />Resolve all</span>
            <span>Face flags can’t be cleared in bulk.</span>
          </div>
        </aside>
      </div>
    </section>
  );
}
