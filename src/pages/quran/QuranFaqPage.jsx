import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { fetchFaqs } from '../../services/faqService';
import QuranNav from './QuranNav';
import QuranFooter from './QuranFooter';

function AccordionItem({ faq, isOpen, onToggle }) {
  return (
    <div className="faq-accordion-item" id={`quran-faq-item-${faq.id}`}>
      <button
        className={`faq-accordion-trigger ${isOpen ? 'faq-accordion-trigger--open' : ''}`}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`quran-faq-answer-${faq.id}`}
      >
        <span className="faq-accordion-question">{faq.question}</span>
        <ChevronDown
          size={20}
          className={`faq-accordion-chevron ${isOpen ? 'faq-accordion-chevron--open' : ''}`}
        />
      </button>
      <div
        id={`quran-faq-answer-${faq.id}`}
        className={`faq-accordion-panel ${isOpen ? 'faq-accordion-panel--open' : ''}`}
        role="region"
      >
        <div className="faq-accordion-answer">{faq.answer}</div>
      </div>
    </div>
  );
}

export default function QuranFaqPage() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    fetchFaqs('quran')
      .then(setFaqs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    document.title = 'الأسئلة الشائعة — منصة حبل الله لتحفيظ القرآن';
  }, []);

  const toggleItem = (id) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div dir="rtl" className="min-h-screen" style={{ backgroundColor: 'var(--t-bg-page)', color: 'var(--t-text)' }}>
      <QuranNav />

      {/* Hero */}
      <section className="faq-hero faq-hero--quran">
        <div className="faq-hero-inner">
          <div className="faq-hero-icon-wrap faq-hero-icon-wrap--quran">
            <HelpCircle size={48} />
          </div>
          <h1 className="faq-hero-title">الأسئلة الشائعة</h1>
          <p className="faq-hero-subtitle">
            إجابات على الأسئلة الأكثر شيوعاً حول منصة حبل الله لتحفيظ القرآن الكريم
          </p>
        </div>
      </section>

      {/* FAQ Content */}
      <main className="faq-content">
        <div className="faq-content-inner">
          {loading ? (
            <div className="faq-loading">
              <div className="admin-spinner-lg" />
              <span style={{ color: 'var(--t-text-muted)' }}>جارٍ تحميل الأسئلة…</span>
            </div>
          ) : faqs.length === 0 ? (
            <div className="faq-empty">
              <HelpCircle size={48} />
              <p>لا توجد أسئلة شائعة حالياً</p>
            </div>
          ) : (
            <div className="faq-accordion">
              {faqs.map((faq) => (
                <AccordionItem
                  key={faq.id}
                  faq={faq}
                  isOpen={openId === faq.id}
                  onToggle={() => toggleItem(faq.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <QuranFooter />
    </div>
  );
}
