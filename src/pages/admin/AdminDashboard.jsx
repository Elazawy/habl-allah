import { useEffect, useState } from 'react';
import { fetchAllFaqs } from '../../services/faqService';
import { fetchAllPages } from '../../services/pagesService';
import { HelpCircle, FileText, Shield, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [faqCount, setFaqCount] = useState(0);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      fetchAllFaqs('general'),
      fetchAllPages(),
    ])
      .then(([faqsData, pagesData]) => {
        setFaqCount(faqsData.length);
        setPages(pagesData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const privacyPage = pages.find((p) => p.slug === 'privacy-policy');
  const termsPage = pages.find((p) => p.slug === 'terms');

  const stats = [
    { label: 'الأسئلة الشائعة', value: faqCount, icon: HelpCircle, color: 'var(--admin-accent)' },
    {
      label: 'سياسة الخصوصية',
      value: privacyPage ? new Date(privacyPage.updated_at).toLocaleDateString('ar-EG') : '—',
      icon: Shield,
      color: '#8b5cf6',
      isDate: true,
    },
    {
      label: 'شروط الاستخدام',
      value: termsPage ? new Date(termsPage.updated_at).toLocaleDateString('ar-EG') : '—',
      icon: FileText,
      color: '#f59e0b',
      isDate: true,
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">لوحة التحكم</h1>
        <p className="admin-page-desc">نظرة عامة على المنصة الرئيسية</p>
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="admin-spinner-lg" />
          <span>جارٍ التحميل…</span>
        </div>
      ) : (
        <>
          <div className="admin-stats-grid">
            {stats.map((s) => (
              <div key={s.label} className="admin-stat-card">
                <div className="admin-stat-icon" style={{ color: s.color }}>
                  <s.icon size={24} />
                </div>
                <div className={`admin-stat-value ${s.isDate ? 'admin-stat-value--sm' : ''}`}>
                  {s.value}
                </div>
                <div className="admin-stat-label">{s.isDate ? 'آخر تحديث' : ''} {s.label}</div>
              </div>
            ))}
          </div>

          <div className="admin-dashboard-quick">
            <h2 className="admin-section-title">إجراءات سريعة</h2>
            <div className="admin-quick-actions">
              <button
                id="admin-goto-faq-btn"
                className="admin-btn admin-btn--primary"
                onClick={() => navigate('/admin/faq')}
              >
                <HelpCircle size={16} />
                إدارة الأسئلة الشائعة
              </button>
              <button
                id="admin-goto-pages-btn"
                className="admin-btn admin-btn--ghost"
                onClick={() => navigate('/admin/pages')}
              >
                <FileText size={16} />
                إدارة الصفحات
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
