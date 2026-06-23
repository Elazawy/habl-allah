import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useReveal } from '../../hooks/useReveal';
import { supabase } from '../../lib/supabase';

export default function Newsletter() {
  const [values, setValues] = useState({ full_name: '', phone: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const ref = useReveal();

  function handleChange(e) {
    setValues((v) => ({ ...v, [e.target.name]: e.target.value }));
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!values.full_name.trim()) {
      setError('من فضلك أدخل اسمك.');
      return;
    }
    if (!values.phone.trim()) {
      setError('من فضلك أدخل رقم التواصل.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (supabase) {
        const { error: insertError } = await supabase
          .from('newsletter_subscribers')
          .insert([{ full_name: values.full_name.trim(), phone: values.phone.trim() }]);
        if (insertError) throw insertError;
      }
      setSubmitted(true);
    } catch (err) {
      console.error('[newsletter] save error', err);
      setError('حدث خطأ، حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
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
              name="full_name"
              placeholder="الاسم الكامل"
              required
              value={values.full_name}
              onChange={handleChange}
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
              name="phone"
              placeholder="رقم التواصل"
              required
              value={values.phone}
              onChange={handleChange}
              className="w-full rounded-2xl px-6 py-4 text-base outline-none border-2 transition-all duration-200 text-right"
              style={{
                backgroundColor: 'var(--t-input-bg)',
                borderColor: 'var(--t-border-gold)',
                color: 'var(--t-text)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--t-secondary)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--t-border-gold)')}
            />

            {error && (
              <p className="text-xs text-center font-semibold" style={{ color: '#ef4444' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              id="newsletter-submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl font-bold text-lg text-white transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 shadow-md mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ backgroundColor: 'var(--t-secondary)' }}
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : null}
              {loading ? 'جارٍ الإرسال…' : 'اشترك الآن'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
