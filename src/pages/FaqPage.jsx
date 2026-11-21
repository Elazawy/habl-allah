import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, HelpCircle, ArrowLeft } from 'lucide-react';
import { fetchFaqs } from '../services/faqService';
import DarkModeToggle from '../components/DarkModeToggle';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Footer from '../components/Footer';
import logoGold from '../assets/logo-gold.png';
import { DirectionalIcon, LocalizedLink } from '../i18n';

function AccordionItem({ faq, isOpen, onToggle }) {
  return (
    <div className="faq-accordion-item" id={`faq-item-${faq.id}`}>
      <button
        className={`faq-accordion-trigger ${isOpen ? 'faq-accordion-trigger--open' : ''}`}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`faq-answer-${faq.id}`}
      >
        <span className="faq-accordion-question" dir="auto">{faq.question}</span>
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
        <div className="faq-accordion-answer" dir="auto">{faq.answer}</div>
      </div>
    </div>
  );
}

export default function FaqPage() {
  const { t } = useTranslation(['faq', 'common']);
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
    document.title = t('faq:general.pageTitle');
  }, [t]);

  const toggleItem = (id) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="faq-page-shell" style={{ backgroundColor: 'var(--t-bg)' }}>
      {/* Floating controls */}
      <div className="fixed top-5 end-5 z-50 flex items-center gap-2">
        <LanguageSwitcher />
        <DarkModeToggle />
      </div>

      {/* Header */}
      <header className="faq-header">
        <div className="faq-header-inner">
          <LocalizedLink to="/" className="faq-back-link" aria-label={t('faq:backToHomeAria')}>
            <DirectionalIcon icon={ArrowLeft} size={20} />
            <span>{t('faq:homeLink')}</span>
          </LocalizedLink>
          <LocalizedLink to="/" className="faq-logo-link">
            <img src={logoGold} alt={t('common:brand.logoAlt')} className="faq-logo-img" />
          </LocalizedLink>
        </div>
      </header>

      {/* Hero */}
      <section className="faq-hero">
        <div className="faq-hero-inner">
          <div className="faq-hero-icon-wrap">
            <HelpCircle size={48} />
          </div>
          <h1 className="faq-hero-title">{t('faq:general.heading')}</h1>
          <p className="faq-hero-subtitle">
            {t('faq:general.subtitle')}
          </p>
        </div>
      </section>

      {/* FAQ Content */}
      <main className="faq-content">
        <div className="faq-content-inner">
          {loading ? (
            <div className="faq-loading">
              <div className="admin-spinner-lg" />
              <span style={{ color: 'var(--t-text-muted)' }}>{t('faq:loading')}</span>
            </div>
          ) : faqs.length === 0 ? (
            <div className="faq-empty">
              <HelpCircle size={48} />
              <p>{t('faq:empty')}</p>
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
