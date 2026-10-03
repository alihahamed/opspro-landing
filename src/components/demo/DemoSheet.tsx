'use client';

// "Book a demo" sheet: a native <dialog> (focus trap, Esc to close, inert page) that slides up from the bottom.
// Any link to #book-demo opens it. Left: OpsPro and what the demo covers, on a teal wash. Right: the request form.
// The form posts JSON to NEXT_PUBLIC_DEMO_ENDPOINT; until that's set it says booking isn't on yet, so a request is
// never silently dropped.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import s from './demosheet.module.css';

const ENDPOINT = process.env.NEXT_PUBLIC_DEMO_ENDPOINT;
const TOPICS = ['Live attendance', 'Selfie check', 'Rosters', 'Overtime', 'Month-end reports', 'Relievers'];

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function DemoSheet() {
  const ref = useRef<HTMLDialogElement>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [name, setName] = useState('');

  // open on any click to #book-demo (capture phase, so the smooth-scroll anchor handler never sees it)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.('a[href="#book-demo"]');
      if (!a) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      ref.current?.showModal();
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // slide down before closing (Esc, the close button, or a click on the backdrop)
  const close = () => {
    const d = ref.current;
    if (!d?.open || d.dataset.closing !== undefined) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return d.close();
    d.dataset.closing = '';
    d.addEventListener('animationend', () => { delete d.dataset.closing; d.close(); }, { once: true });
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setName(String(data.name ?? '').trim().split(' ')[0]);
    if (!ENDPOINT) {
      setStatus('error');
      setError('Booking isn’t switched on yet. Please try again soon.');
      return;
    }
    setStatus('sending');
    try {
      const res = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, topics }) });
      if (!res.ok) throw new Error(String(res.status));
      setStatus('sent');
    } catch {
      setStatus('error');
      setError('That didn’t go through. Check your connection and try again.');
    }
  };

  return (
    <dialog ref={ref} className={s.sheet} aria-labelledby="demo-title" data-lenis-prevent
      onCancel={(e) => { e.preventDefault(); close(); }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className={s.grid}>
        <section className={s.intro}>
          <div className={s.top}>
            <div className={s.brand}>
              <span className={s.mark} aria-hidden="true">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="var(--teal)" strokeWidth="2.4" strokeDasharray="4.2 2.4" /><circle cx="12" cy="12" r="4" fill="var(--ink)" /></svg>
              </span>
              <p><b>OpsPro</b>We’ll walk you through a day in OpsPro, from the morning roster to the month-end report.</p>
            </div>
          </div>

          <div>
            <h2 id="demo-title" className={s.title}>See a shift run, <span>start to finish.</span></h2>
            <ul className={s.pills}>
              {['Live dashboard', 'Selfie check', 'Month-end reports'].map((x) => <li key={x}>{x}</li>)}
            </ul>
          </div>
        </section>

        <section className={s.panel}>
          <button type="button" className={s.close} onClick={close} aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>

          {status === 'sent' ? (
            <div className={s.done} role="status">
              <span className={s.doneIcon} aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg></span>
              <h3>Thanks{name ? `, ${name}` : ''}.</h3>
              <p>We’ll be in touch to set a time.</p>
            </div>
          ) : (
            <form className={s.form} onSubmit={submit}>
              <h3 className={s.ask}>What should we <span>show you first?</span></h3>

              <fieldset className={s.topics}>
                <legend>I’m most interested in</legend>
                <div>
                  {TOPICS.map((t) => {
                    const on = topics.includes(t);
                    return (
                      <button key={t} type="button" aria-pressed={on} className={s.topic}
                        onClick={() => setTopics(on ? topics.filter((x) => x !== t) : [...topics, t])}>{t}</button>
                    );
                  })}
                </div>
              </fieldset>

              <div className={s.fields}>
                <label className={s.field}><span>Your name</span><input name="name" required autoComplete="name" /></label>
                <label className={s.field}><span>Work email</span><input name="email" type="email" required autoComplete="email" /></label>
                <label className={s.field}><span>Phone (optional)</span><input name="phone" type="tel" autoComplete="tel" /></label>
                <label className={s.field}><span>How many stores?</span><input name="stores" type="number" min={1} inputMode="numeric" /></label>
                <label className={`${s.field} ${s.wide}`}><span>Anything we should know?</span><textarea name="message" rows={3} /></label>
              </div>

              {status === 'error' && <p className={s.error} role="alert">{error}</p>}
              <button type="submit" className={s.submit} disabled={status === 'sending'}>
                {status === 'sending' ? 'Sending…' : 'Book the demo'}
              </button>
            </form>
          )}
        </section>
      </div>
    </dialog>
  );
}
