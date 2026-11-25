import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Circle,
  PlayCircle,
  RefreshCcw,
  Search,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import { fetchCourseAdminById } from '../../services/coursesService';
import { fetchCourseStudentsProgressAdmin } from '../../services/courseLecturesService';
import { getCountryName } from '../../data/countries';

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function CourseStudentsProgressPage() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const toggleExpand = (studentId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const courseData = await fetchCourseAdminById(id);
      if (!courseData) {
        setCourse(null);
        setLectures([]);
        setStudents([]);
        return;
      }

      const progressData = await fetchCourseStudentsProgressAdmin(id);
      const scopedStudents = courseData.is_free
        ? progressData.students.filter((item) => item.completedCount > 0)
        : progressData.students;
      setCourse(courseData);
      setLectures(progressData.lectures);
      setStudents(scopedStudents);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError?.message ?? 'تعذر تحميل تقدم الطلاب في هذه الدورة.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const totalStudents = students.length;
    const completedCount = students.filter((item) => item.status === 'completed').length;
    const avgPercent = totalStudents > 0
      ? Math.round(students.reduce((sum, item) => sum + item.percent, 0) / totalStudents)
      : 0;

    return { totalStudents, completedCount, avgPercent };
  }, [students]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return students.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      if (!term) return true;

      const s = item.student ?? {};
      return [
        s.full_name,
        s.phone,
        s.teachers?.name,
        s.country ? getCountryName(s.country) : '',
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term));
    });
  }, [students, search, statusFilter]);

  return (
    <div className="admin-page" dir="rtl">
      <div className="admin-page-header">
        <div>
          <Link
            to="/admin/quran/courses"
            className="inline-flex items-center gap-1 text-sm font-semibold mb-3"
            style={{ color: 'var(--admin-muted)' }}
          >
            <ArrowRight size={14} />
            العودة لإدارة الدورات
          </Link>

          <h1 className="admin-page-title">متابعة تقدم الطلاب</h1>
          <p className="admin-page-desc">
            {course
              ? `${course.name} — ${lectures.length} محاضرة منشورة (${course.is_free ? 'دورة مجانية' : 'دورة مدفوعة'})`
              : 'متابعة نسبة إنجاز الطلاب لمحاضرات الدورة'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {course && (
            <Link
              to={`/admin/quran/courses/${course.id}/lectures`}
              className="admin-btn admin-btn--ghost"
            >
              <PlayCircle size={16} />
              إدارة المحاضرات
            </Link>
          )}
          <button
            type="button"
            className="admin-btn admin-btn--ghost"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCcw size={16} className={loading ? 'admin-spin' : ''} />
            تحديث
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {!loading && !error && course && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div className="admin-stat-card">
            <div className="admin-stat-icon" style={{ background: 'rgba(78, 173, 136, 0.14)', color: 'var(--admin-accent)' }}>
              <Users size={20} />
            </div>
            <div>
              <div className="admin-stat-value">{stats.totalStudents}</div>
              <div className="admin-stat-label">
                {course.is_free ? 'طلاب لديهم تقدم مسجل' : 'الطلاب المشتركون / المتابعون'}
              </div>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon" style={{ background: 'rgba(207, 167, 103, 0.14)', color: 'var(--admin-gold)' }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <div className="admin-stat-value">{stats.avgPercent}%</div>
              <div className="admin-stat-label">متوسط نسبة الإنجاز</div>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.14)', color: '#60a5fa' }}>
              <Trophy size={20} />
            </div>
            <div>
              <div className="admin-stat-value">{stats.completedCount}</div>
              <div className="admin-stat-label">أتمّوا الدورة 100%</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="admin-filters">
        <div className="admin-search-wrapper">
          <Search size={16} className="admin-search-icon" />
          <input
            id="admin-course-students-search"
            type="text"
            className="admin-input admin-search-input"
            placeholder="بحث باسم الطالب أو رقم الهاتف أو المعلم…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="admin-filter-tabs">
          {[
            { val: 'all', label: 'الكل' },
            { val: 'completed', label: 'مكتمل 100%' },
            { val: 'in_progress', label: 'قيد التقدم' },
            { val: 'not_started', label: 'لم يبدأ' },
          ].map(({ val, label }) => (
            <button
              key={val}
              type="button"
              id={`progress-filter-${val}`}
              className={`admin-filter-tab ${statusFilter === val ? 'admin-filter-tab--active' : ''}`}
              onClick={() => setStatusFilter(val)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="admin-spinner-lg" />
          <span>جارٍ تحميل بيانات التقدم…</span>
        </div>
      ) : error ? (
        <div className="admin-empty" style={{ minHeight: '300px' }}>
          <BookOpen size={48} className="mb-4 text-emerald-500 opacity-40" />
          <h3 className="text-xl font-bold mb-2">تعذر تحميل البيانات</h3>
          <p style={{ color: 'var(--admin-text-muted)' }}>{error}</p>
          <button className="admin-btn admin-btn--ghost" onClick={loadData}>
            <RefreshCcw size={16} />
            إعادة المحاولة
          </button>
        </div>
      ) : !course ? (
        <div className="admin-empty" style={{ minHeight: '300px' }}>
          <BookOpen size={48} className="mb-4 text-emerald-500 opacity-40" />
          <h3 className="text-xl font-bold mb-2">تعذر العثور على الدورة</h3>
          <p style={{ color: 'var(--admin-text-muted)' }}>قد تكون الدورة قد حُذفت أو أن الرابط غير صحيح.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty" style={{ minHeight: '280px' }}>
          <Users size={48} className="mb-4 text-emerald-500 opacity-40" />
          <h3 className="text-xl font-bold mb-2">
            {students.length === 0 ? 'لا يوجد طلاب مسجلون بعد' : 'لا توجد نتائج مطابقة'}
          </h3>
          <p style={{ color: 'var(--admin-text-muted)' }}>
            {students.length === 0
              ? course.is_free
                ? 'سيظهر هنا كل طالب يبدأ بتعليم محاضرة أو أكثر في هذه الدورة المجانية.'
                : 'سيظهر هنا كل طالب لديه اشتراك مفعّل في هذه الدورة المدفوعة.'
              : 'جرّب تغيير كلمات البحث أو الفلتر.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {filtered.map((item) => {
            const student = item.student ?? {};
            const studentId = student.id;
            const isExpanded = expandedIds.has(studentId);
            const completedSet = new Set(item.completedLectureIds);

            return (
              <div
                key={studentId}
                id={`course-student-progress-row-${studentId}`}
                style={{
                  border: '1px solid var(--admin-border)',
                  backgroundColor: 'var(--admin-surface)',
                  borderRadius: '14px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '1rem 1.15rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '0.85rem',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                      <Link
                        to={`/admin/quran/users/${studentId}`}
                        style={{ fontWeight: 800, color: 'var(--admin-text)', textDecoration: 'none' }}
                      >
                        {student.full_name || 'طالب'}
                      </Link>
                      {!course.is_free && !item.isSubscribed && (
                        <span className="admin-badge admin-badge--neutral" style={{ fontSize: '0.7rem' }}>
                          سابقاً
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                      {student.phone && (
                        <span className="admin-muted" style={{ fontSize: '0.78rem' }} dir="ltr">
                          {student.phone}
                        </span>
                      )}
                      {student.teachers?.name && (
                        <span className="admin-badge admin-badge--neutral" style={{ fontSize: '0.72rem' }}>
                          {student.teachers.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.82rem' }}>
                      <span style={{ fontWeight: 800, color: item.percent === 100 ? 'var(--admin-accent)' : 'var(--admin-text)' }}>
                        {item.percent}%
                      </span>
                      <span className="admin-muted" dir="ltr">
                        {item.completedCount} / {item.totalPublished}
                      </span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '7px',
                        borderRadius: '999px',
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${item.percent}%`,
                          height: '100%',
                          backgroundColor: item.percent === 100 ? 'var(--admin-accent)' : 'var(--admin-gold)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div>
                      <div className="admin-muted" style={{ fontSize: '0.72rem' }}>آخر نشاط</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--admin-text)' }}>
                        {formatDateTime(item.lastCompletedAt)}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="admin-btn admin-btn--ghost"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
                      onClick={() => toggleExpand(studentId)}
                      aria-expanded={isExpanded}
                    >
                      <span>تفاصيل المحاضرات</span>
                      <ChevronDown
                        size={15}
                        style={{
                          transform: isExpanded ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s ease',
                        }}
                      />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div
                    style={{
                      borderTop: '1px solid var(--admin-border)',
                      backgroundColor: 'var(--admin-surface2)',
                      padding: '0.9rem 1.15rem',
                    }}
                  >
                    {lectures.length === 0 ? (
                      <p className="admin-muted" style={{ fontSize: '0.82rem', margin: 0 }}>
                        لا توجد محاضرات منشورة في هذه الدورة بعد.
                      </p>
                    ) : (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                          gap: '0.55rem',
                        }}
                      >
                        {lectures.map((lecture, idx) => {
                          const done = completedSet.has(lecture.id);
                          const completedAt = item.completedByLectureId?.[lecture.id];
                          return (
                            <div
                              key={lecture.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.5rem',
                                padding: '0.5rem 0.75rem',
                                borderRadius: '10px',
                                border: `1px solid ${done ? 'rgba(78, 173, 136, 0.3)' : 'var(--admin-border)'}`,
                                backgroundColor: done ? 'rgba(78, 173, 136, 0.08)' : 'rgba(255,255,255,0.02)',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                                {done ? (
                                  <CheckCircle2 size={15} style={{ color: 'var(--admin-accent)', flexShrink: 0 }} />
                                ) : (
                                  <Circle size={15} style={{ color: 'var(--admin-muted)', flexShrink: 0 }} />
                                )}
                                <span
                                  style={{
                                    fontSize: '0.8rem',
                                    fontWeight: done ? 700 : 500,
                                    color: done ? 'var(--admin-text)' : 'var(--admin-muted)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                  title={lecture.title}
                                >
                                  {idx + 1}. {lecture.title}
                                </span>
                              </div>
                              {done && completedAt && (
                                <span className="admin-muted" style={{ fontSize: '0.7rem', flexShrink: 0 }}>
                                  {formatDateTime(completedAt)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
