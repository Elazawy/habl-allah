import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Shield } from 'lucide-react';
import { fetchPage } from '../services/pagesService';
import { renderSafeMarkdown } from '../lib/safeMarkdown';
import DarkModeToggle from '../components/DarkModeToggle';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Footer from '../components/Footer';
import logoGold from '../assets/logo-gold.png';
import { DirectionalIcon, LocalizedLink, useFormatters, useLocalizedContent } from '../i18n';

export default function PrivacyPolicyPage() {
  const { t } = useTranslation(['legal', 'common']);
  const { formatDate } = useFormatters();
  const { field } = useLocalizedContent();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPage('privacy-policy')
      .then(setPage)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    document.title = t('legal:privacy.pageTitle');
  }, [t]);

  const pageTitle = page ? field(page, 'title') : null;
  const pageContent = page ? field(page, 'content') : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--t-bg)' }}>
      {/* Floating controls */}
      <div className="fixed top-5 end-5 z-50 flex items-center gap-2">
        <LanguageSwitcher />
        <DarkModeToggle />
      </div>

      {/* Header */}
      <header className="faq-header">
        <div className="faq-header-inner">
          <LocalizedLink to="/" className="faq-back-link" aria-label={t('legal:backToHomeAria')}>
            <DirectionalIcon icon={ArrowLeft} size={20} />
            <span>{t('legal:homeLink')}</span>
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
            <Shield size={48} />
          </div>
          <h1 className="faq-hero-title" dir={pageTitle?.text ? pageTitle.dir : undefined}>
            {pageTitle?.text || t('legal:privacy.heading')}
          </h1>
          <p className="faq-hero-subtitle">
            {t('legal:privacy.subtitle')}
          </p>
          {page?.updated_at && (
            <p className="faq-hero-date">
              {t('legal:lastUpdated', { date: formatDate(page.updated_at) })}
            </p>
          )}
        </div>
      </section>

      {/* Content */}
      <main className="page-content-main">
        <div className="page-content-card">
          {loading ? (
            <div className="faq-loading">
              <div className="admin-spinner-lg" />
              <span style={{ color: 'var(--t-text-muted)' }}>{t('legal:loading')}</span>
            </div>
          ) : page ? (
            <div className="page-content-body" dir={pageContent.dir}>
              {renderSafeMarkdown(pageContent.text)}
            </div>
          ) : (
            <div className="faq-empty">
              <Shield size={48} />
              <p>{t('legal:notFound')}</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
