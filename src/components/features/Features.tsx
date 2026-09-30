// Product section: a large two-line title, then the product mockup in a thin frame.
// The mockup is a single image (to be supplied). Drop it in public/product/ and set MOCKUP below.
import s from './features.module.css';

const MOCKUP: string | null = null; // e.g. '/product/macbook.webp'

export default function Features() {
  return (
    <section id="product" className={s.section}>
      <h2 className={s.title}>Everything your ops team used to chase on WhatsApp.</h2>
      <div className={s.frame}>
        {MOCKUP ? (
          // eslint-disable-next-line @next/next/no-img-element -- a single large static image
          <img className={s.shot} src={MOCKUP} alt="The OpsPro dashboard on a MacBook" />
        ) : (
          <div className={s.shot} aria-hidden="true" />
        )}
      </div>
    </section>
  );
}
