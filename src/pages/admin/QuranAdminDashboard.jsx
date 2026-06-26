import { useEffect, useState } from 'react';
import { fetchAllTeachers, fetchAllQuranReviews } from '../../services/adminService';
import { fetchAllFaqs } from '../../services/faqService';
import { supabase } from '../../lib/supabase';
import { Users, Star, BookOpen, HelpCircle, Image, Phone, User, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchAllCompetitions } from '../../services/competitionsService';

export default function QuranAdminDashboard() {
  const [teachers, setTeachers] = useState([]);
  const [faqCount, setFaqCount] = useState(0);
  const [quranReviewsCount, setQuranReviewsCount] = useState(0);
  const [subscribers, setSubscribers] = useState([]);
  const [competitionsCount, setCompetitionsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    async function fetchNewsletterSubscribers() {
      try {
        const { data, error } = await supabase
          .from('newsletter_subscribers')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data ?? [];
      } catch {
        return [];
      }
    }

    const withFallback = async (promise, fallback) => {
      try {
        return await promise;
      } catch (error) {
        console.error(error);
        return fallback;
      }
    };

    const loadDashboard = async () => {
      const [teachersData, faqsData, quranReviewsData, subscribersData, competitionsData] = await Promise.all([
        withFallback(fetchAllTeachers(), []),
        withFallback(fetchAllFaqs('quran'), []),
        withFallback(fetchAllQuranReviews(), []),
        withFallback(fetchNewsletterSubscribers(), []),
        withFallback(fetchAllCompetitions(), []),
      ]);

      if (!active) return;

      setTeachers(teachersData);
      setFaqCount(faqsData.length);
      setQuranReviewsCount(quranReviewsData.length);
      setSubscribers(subscribersData);
      setCompetitionsCount(competitionsData.length);
      setLoading(false);
    };

    loadDashboard();

    return () => {
      active = false;
    };
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
    { label: 'المسابقات القرآنية', value: competitionsCount, icon: Trophy, color: '#d97706' },
    { label: 'الأرقام المسجلة', value: subscribers.length, icon: Phone, color: '#ec4899' },
  ];

  // Show last 5 subscribers
  const recentSubscribers = subscribers.slice(0, 5);

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

          {/* الارقام المسجلة — Recent subscribers preview */}
          <div className="admin-dashboard-quick" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 className="admin-section-title" style={{ margin: 0 }}>
                <Phone size={18} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '0.375rem' }} />
                الأرقام المسجلة
              </h2>
              <button
                id="admin-goto-newsletter-btn"
                className="admin-btn admin-btn--ghost admin-btn--sm"
                onClick={() => navigate('/admin/quran/newsletter')}
                style={{ fontSize: '0.8rem' }}
              >
                عرض الكل ({subscribers.length})
              </button>
            </div>

            {recentSubscribers.length === 0 ? (
              <div className="admin-empty" style={{ padding: '2rem' }}>
                <Phone size={36} style={{ color: 'var(--admin-text-muted)', marginBottom: '0.75rem' }} />
                <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.9rem' }}>
                  لا يوجد مشتركون بعد
                </p>
              </div>
            ) : (
              <div className="admin-table-wrapper admin-table-wrapper--cards">
                <table className="admin-table admin-table--cards" id="dashboard-subscribers-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th><User size={14} style={{ display: 'inline', marginLeft: '0.25rem', verticalAlign: 'middle' }} /> الاسم</th>
                      <th><Phone size={14} style={{ display: 'inline', marginLeft: '0.25rem', verticalAlign: 'middle' }} /> رقم التواصل</th>
                      <th>تاريخ التسجيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSubscribers.map((sub, i) => (
                      <tr key={sub.id}>
                        <td data-label="#" style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>{i + 1}</td>
                        <td data-label="الاسم" style={{ fontWeight: 600 }}>{sub.full_name}</td>
                        <td data-label="رقم التواصل" dir="ltr" style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>{sub.phone}</td>
                        <td data-label="تاريخ التسجيل" style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>
                          {new Date(sub.created_at).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="admin-dashboard-quick" style={{ marginTop: '2rem' }}>
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
              <button
                id="admin-goto-newsletter-subscribers-btn"
                className="admin-btn admin-btn--ghost"
                onClick={() => navigate('/admin/quran/newsletter')}
              >
                <Phone size={16} />
                الأرقام المسجلة
              </button>
              <button
                id="admin-goto-quran-competitions-btn"
                className="admin-btn admin-btn--ghost"
                onClick={() => navigate('/admin/quran/competitions')}
              >
                <Trophy size={16} />
                إدارة المسابقات
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
