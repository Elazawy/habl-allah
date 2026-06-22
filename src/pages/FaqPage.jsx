import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, HelpCircle, ArrowRight } from 'lucide-react';
import { fetchFaqs } from '../services/faqService';
import DarkModeToggle from '../components/DarkModeToggle';
import Footer from '../components/Footer';
import logoGold from '../assets/logo-gold.png';

function AccordionItem({ faq, isOpen, onToggle }) {
  return (
    <div className="faq-accordion-item" id={`faq-item-${faq.id}`}>
      <button
        className={`faq-accordion-trigger ${isOpen ? 'faq-accordion-trigger--open' : ''}`}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${faq.id}`}
      >
        <span className="faq-accordion-question">{faq.question}</span>
        <ChevronDown
          size={20}
          className={`faq-accordion-chevron ${isOpen ? 'faq-accordion-chevron--open' : ''}`}
        />
      </button>
      <div
        id={`faq-answer-${faq.id}`}
        className={`faq-accordion-panel ${isOpen ? 'faq-accordion-panel--open' : ''}`}
        role="region"
      >
        <div className="faq-accordion-answer">{faq.answer}</div>
      </div>
    </div>
  );
}

export default function FaqPage() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    fetchFaqs('general')
      .then(setFaqs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    document.title = 'الأسئلة الشائعة — أكاديمية حبل الله';
  }, []);

  const toggleItem = (id) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div dir="rtl" className="faq-page-shell" style={{ backgroundColor: 'var(--t-bg)' }}>
      {/* Dark mode toggle */}
      <div className="fixed top-5 left-5 z-50">
        <DarkModeToggle />
      </div>

      {/* Header */}
      <header className="faq-header">
        <div className="faq-header-inner">
          <Link to="/" className="faq-back-link" aria-label="العودة للرئيسية">
            <ArrowRight size={20} />
            <span>الرئيسية</span>
          </Link>
          <Link to="/" className="faq-logo-link">
            <img src={logoGold} alt="شعار حبل الله" className="faq-logo-img" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="faq-hero">
        <div className="faq-hero-inner">
          <div className="faq-hero-icon-wrap">
            <HelpCircle size={48} />
          </div>
          <h1 className="faq-hero-title">الأسئلة الشائعة</h1>
          <p className="faq-hero-subtitle">
            إجابات على الأسئلة الأكثر شيوعاً حول أكاديمية حبل الله ومنصاتها التعليمية
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

      <Footer />
    </div>
  );
}
