import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText } from 'lucide-react';
import { fetchPage } from '../services/pagesService';
import { renderSafeMarkdown } from '../lib/safeMarkdown';
import DarkModeToggle from '../components/DarkModeToggle';
import Footer from '../components/Footer';
import logoGold from '../assets/logo-gold.png';

export default function TermsPage() {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPage('terms')
      .then(setPage)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    document.title = 'شروط الاستخدام — أكاديمية حبل الله';
  }, []);

  return (
    <div dir="rtl" className="min-h-screen" style={{ backgroundColor: 'var(--t-bg)' }}>
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
            <FileText size={48} />
          </div>
          <h1 className="faq-hero-title">{page?.title ?? 'شروط الاستخدام'}</h1>
          <p className="faq-hero-subtitle">
            الشروط والأحكام المنظمة لاستخدام منصات أكاديمية حبل الله التعليمية
          </p>
          {page?.updated_at && (
            <p className="faq-hero-date">
              آخر تحديث: {new Date(page.updated_at).toLocaleDateString('ar-EG')}
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
              <span style={{ color: 'var(--t-text-muted)' }}>جارٍ التحميل…</span>
            </div>
          ) : page ? (
            <div className="page-content-body">
              {renderSafeMarkdown(page.content)}
            </div>
          ) : (
            <div className="faq-empty">
              <FileText size={48} />
              <p>لم يتم العثور على المحتوى</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
