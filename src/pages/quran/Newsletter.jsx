import { useState } from 'react';
import { Send } from 'lucide-react';

export default function Newsletter() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section className="py-24 px-5 md:px-8" style={{ backgroundColor: '#f3f4f1' }}>
      <div className="max-w-xl mx-auto text-center">
        <span
          className="inline-block text-xs font-bold tracking-widest uppercase mb-4 px-4 py-1.5 rounded-full"
          style={{ backgroundColor: 'rgba(207,167,103,0.12)', color: '#CFA767' }}
        >
          النشرة البريدية
        </span>

        <h2 className="text-4xl font-black mb-4" style={{ color: '#1B4D3E' }}>
          كن أول من يعرف
        </h2>
        <p className="text-base leading-relaxed mb-10" style={{ color: '#404945' }}>
          اشترك ليصلك جديد الدورات والمسابقات القرآنية
        </p>

        {submitted ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ backgroundColor: 'rgba(27,77,62,0.08)' }}
          >
            <Send size={32} className="mx-auto mb-3" style={{ color: '#1B4D3E' }} />
            <p className="text-xl font-black" style={{ color: '#1B4D3E' }}>
              شكراً! تم الاشتراك بنجاح.
            </p>
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="الاسم الكامل"
              required
              className="w-full rounded-2xl px-6 py-4 text-base outline-none border-2 transition-all duration-200 text-right"
              style={{
                backgroundColor: '#ffffff',
                borderColor: 'rgba(207,167,103,0.25)',
                color: '#191c1b',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#CFA767')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(207,167,103,0.25)')}
            />
            <input
              type="tel"
              placeholder="رقم التواصل"
              required
              className="w-full rounded-2xl px-6 py-4 text-base outline-none border-2 transition-all duration-200 text-right"
              style={{
                backgroundColor: '#ffffff',
                borderColor: 'rgba(207,167,103,0.25)',
                color: '#191c1b',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#CFA767')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(207,167,103,0.25)')}
            />
            <button
              type="submit"
              id="newsletter-submit"
              className="w-full py-4 rounded-2xl font-bold text-lg text-white transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 shadow-md mt-2"
              style={{ backgroundColor: '#CFA767' }}
            >
              اشترك الآن
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
