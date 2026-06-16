import { useEffect, useState } from 'react';
import { fetchAllTeachers } from '../../services/adminService';
import { Users, Star, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllTeachers()
      .then(setTeachers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const maleCount = teachers.filter(t => t.gender === 'male').length;
  const femaleCount = teachers.filter(t => t.gender === 'female').length;
  const reviewCount = teachers.reduce((acc, t) => acc + (t.teacher_reviews?.length ?? 0), 0);

  const stats = [
    { label: 'إجمالي المعلمين', value: teachers.length, icon: Users, color: 'var(--admin-accent)' },
    { label: 'المعلمون', value: maleCount, icon: BookOpen, color: '#10b981' },
    { label: 'المعلمات', value: femaleCount, icon: BookOpen, color: '#f59e0b' },
    { label: 'التقييمات', value: reviewCount, icon: Star, color: '#8b5cf6' },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">لوحة التحكم</h1>
        <p className="admin-page-desc">نظرة عامة على المنصة</p>
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
            <button
              id="admin-goto-teachers-btn"
              className="admin-btn admin-btn--primary"
              onClick={() => navigate('/admin/teachers')}
            >
              <Users size={16} />
              إدارة المعلمين
            </button>
          </div>
        </>
      )}
    </div>
  );
}
