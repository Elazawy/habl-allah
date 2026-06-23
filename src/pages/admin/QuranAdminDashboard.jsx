import { useEffect, useState } from 'react';
import { fetchAllTeachers, fetchAllQuranReviews } from '../../services/adminService';
import { fetchAllFaqs } from '../../services/faqService';
import { Users, Star, BookOpen, HelpCircle, Image } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function QuranAdminDashboard() {
  const [teachers, setTeachers] = useState([]);
  const [faqCount, setFaqCount] = useState(0);
  const [quranReviewsCount, setQuranReviewsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      fetchAllTeachers(),
      fetchAllFaqs('quran'),
      fetchAllQuranReviews(),
    ])
      .then(([teachersData, faqsData, quranReviewsData]) => {
        setTeachers(teachersData);
        setFaqCount(faqsData.length);
        setQuranReviewsCount(quranReviewsData.length);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const maleCount = teachers.filter((t) => t.gender === 'male').length;
  const femaleCount = teachers.filter((t) => t.gender === 'female').length;
  const reviewCount = teachers.reduce((acc, t) => acc + (t.teacher_reviews?.length ?? 0), 0);

  const stats = [
    { label: 'إجمالي المعلمين', value: teachers.length, icon: Users, color: 'var(--admin-accent)' },
    { label: 'المعلمون', value: maleCount, icon: BookOpen, color: '#10b981' },
    { label: 'المعلمات', value: femaleCount, icon: BookOpen, color: '#f59e0b' },
    { label: 'مراجعات المعلمين', value: reviewCount, icon: Star, color: '#8b5cf6' },
    { label: 'مراجعات صفحة القرآن', value: quranReviewsCount, icon: Image, color: '#0ea5e9' },
    { label: 'الأسئلة الشائعة', value: faqCount, icon: HelpCircle, color: '#06b6d4' },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">لوحة تحكم منصة القرآن</h1>
        <p className="admin-page-desc">نظرة عامة على منصة تحفيظ القرآن الكريم</p>
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
                <div className="admin-stat-value">{s.value}</div>
                <div className="admin-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="admin-dashboard-quick">
            <h2 className="admin-section-title">إجراءات سريعة</h2>
            <div className="admin-quick-actions">
              <button
                id="admin-goto-quran-teachers-btn"
                className="admin-btn admin-btn--primary"
                onClick={() => navigate('/admin/quran/teachers')}
              >
                <Users size={16} />
                إدارة المعلمين
              </button>
              <button
                id="admin-goto-quran-reviews-btn"
                className="admin-btn admin-btn--ghost"
                onClick={() => navigate('/admin/quran/reviews')}
              >
                <Image size={16} />
                مراجعات صفحة القرآن
              </button>
              <button
                id="admin-goto-quran-faq-btn"
                className="admin-btn admin-btn--ghost"
                onClick={() => navigate('/admin/quran/faq')}
              >
                <HelpCircle size={16} />
                إدارة الأسئلة الشائعة
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
