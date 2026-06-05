import { useState } from 'react';
import { Send } from 'lucide-react';
import { useReveal } from '../../hooks/useReveal';

export default function Newsletter() {
  const [submitted, setSubmitted] = useState(false);
  const ref = useReveal();

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section ref={ref} className="py-24 px-5 md:px-8" style={{ backgroundColor: 'var(--t-bg-surface-low)' }}>
      <div className="max-w-xl mx-auto text-center">
        <span
          className="reveal inline-block text-xs font-bold tracking-widest uppercase mb-4 px-4 py-1.5 rounded-full"
          style={{ backgroundColor: 'rgba(207,167,103,0.12)', color: 'var(--t-secondary)' }}
        >
          النشرة البريدية
        </span>

        <h2 className="reveal reveal-d1 text-4xl font-black mb-4" style={{ color: 'var(--t-primary)' }}>
          كن أول من يعرف
        </h2>
        <p className="reveal reveal-d2 text-base leading-relaxed mb-10" style={{ color: 'var(--t-text-muted)' }}>
          اشترك ليصلك جديد الدورات والمسابقات القرآنية
        </p>

        {submitted ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ backgroundColor: 'var(--t-newsletter-success)' }}
          >
            <Send size={32} className="mx-auto mb-3" style={{ color: 'var(--t-primary)' }} />
            <p className="text-xl font-black" style={{ color: 'var(--t-primary)' }}>
              شكراً! تم الاشتراك بنجاح.
            </p>
          </div>
        ) : (
          <form className="reveal reveal-d3 flex flex-col gap-4" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="الاسم الكامل"
              required
              className="w-full rounded-2xl px-6 py-4 text-base outline-none border-2 transition-all duration-200 text-right"
              style={{
                backgroundColor: 'var(--t-input-bg)',
                borderColor: 'var(--t-border-gold)',
                color: 'var(--t-text)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--t-secondary)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--t-border-gold)')}
            />
            <input
              type="tel"
              placeholder="رقم التواصل"
              required
              className="w-full rounded-2xl px-6 py-4 text-base outline-none border-2 transition-all duration-200 text-right"
              style={{
                backgroundColor: 'var(--t-input-bg)',
                borderColor: 'var(--t-border-gold)',
                color: 'var(--t-text)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--t-secondary)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--t-border-gold)')}
            />
            <button
              type="submit"
              id="newsletter-submit"
              className="w-full py-4 rounded-2xl font-bold text-lg text-white transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 shadow-md mt-2"
              style={{ backgroundColor: 'var(--t-secondary)' }}
            >
              اشترك الآن
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
