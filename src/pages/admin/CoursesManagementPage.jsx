import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAllCourses, deleteCourse, updateCourse, deleteCourseImage } from '../../services/coursesService';
import {
  R2_STORAGE_QUOTA_BYTES,
  R2_UPLOAD_BLOCK_THRESHOLD_BYTES,
  deleteCourseLectureVideoAssets,
  fetchCourseLecturesAdmin,
  fetchR2StorageUsage,
  formatBytesDecimalGb,
} from '../../services/courseLecturesService';
import CourseFormModal from './CourseFormModal';
import TranslationStatusBadge from './components/TranslationStatusBadge';
import { COURSE_TRANSLATION_SPECS } from '../../i18n/content.js';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  BookOpen,
  Eye,
  EyeOff,
  PlayCircle,
  RefreshCcw,
  ChevronDown,
  Users,
  HardDrive,
  AlertTriangle,
} from 'lucide-react';

function getLoadErrorMessage(error) {
  if (error?.message?.includes('Supabase is not configured')) {
    return 'تعذر تحميل الدورات لأن إعدادات قاعدة البيانات غير مكتملة.';
  }
  return 'تعذر تحميل قائمة الدورات حالياً. حاول مرة أخرى بعد قليل.';
}

export default function CoursesManagementPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalState, setModalState] = useState({ open: false, course: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [r2Usage, setR2Usage] = useState(null);
  const [r2UsageLoading, setR2UsageLoading] = useState(true);
  const [r2UsageError, setR2UsageError] = useState('');

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const loadR2Usage = useCallback(async (activeRef) => {
    setR2UsageLoading(true);
    setR2UsageError('');
    try {
      const usage = await fetchR2StorageUsage();
      if (activeRef?.current === false) return;
      setR2Usage(usage);
    } catch (err) {
      console.error('[r2 storage usage fetch failed]', err);
      if (activeRef?.current === false) return;
      setR2Usage(null);
      setR2UsageError(err?.message ?? 'تعذر قراءة مساحة Cloudflare R2 حالياً.');
    } finally {
      if (activeRef?.current !== false) {
        setR2UsageLoading(false);
      }
    }
  }, []);

  const loadCourses = useCallback(async (activeRef) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAllCourses();
      if (activeRef?.current === false) return;
      setCourses(data);
    } catch (err) {
      console.error(err);
      if (activeRef?.current === false) return;
      setCourses([]);
      setError(getLoadErrorMessage(err));
    } finally {
      if (activeRef?.current !== false) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const active = { current: true };
    loadCourses(active);
    loadR2Usage(active);
    return () => {
      active.current = false;
    };
  }, [loadCourses, loadR2Usage]);

  const handleSaved = (saved) => {
    setCourses((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      let next = [...prev];
      if (idx >= 0) {
        next[idx] = { ...prev[idx], ...saved };
      } else {
        next.push(saved);
      }
      // Sort: sort_order asc, created_at asc
      return next.sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    });
  };

  const togglePublished = async (course) => {
    try {
      const updated = await updateCourse(course.id, {
        is_published: !course.is_published,
      });
      handleSaved(updated);
    } catch (err) {
      console.error(err);
      alert('فشل تحديث الحالة: ' + err.message);
    }
  };

  const confirmDelete = (course) => setDeleteTarget(course);
  const cancelDelete = () => setDeleteTarget(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // 1. Delete image from Storage if it exists
      if (deleteTarget.image_path) {
        await deleteCourseImage(deleteTarget.image_path);
      }

      // 2. Delete any lecture R2 assets (free or paid) before the course row cascades lectures.
      const lectures = await fetchCourseLecturesAdmin(deleteTarget.id);
      await deleteCourseLectureVideoAssets(lectures);

      // 3. Delete row from DB
      await deleteCourse(deleteTarget.id);
      setCourses((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
      loadR2Usage();
    } catch (err) {
      console.error(err);
      alert('فشل الحذف: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = courses.filter((c) => {
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'published' && c.is_published) ||
      (statusFilter === 'draft' && !c.is_published);
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.short_description.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const openAdd = () => setModalState({ open: true, course: null });
  const openEdit = (course) => setModalState({ open: true, course });
  const closeModal = () => setModalState({ open: false, course: null });

  const quotaGb = formatBytesDecimalGb(r2Usage?.quotaBytes ?? R2_STORAGE_QUOTA_BYTES);
  const usedGb = r2Usage ? formatBytesDecimalGb(r2Usage.usedBytes) : '0.00';
  const usedPercent = r2Usage?.usedPercent ?? 0;
  const uploadsBlocked = Boolean(r2Usage?.uploadsBlocked);
  const barColor = uploadsBlocked
    ? 'var(--admin-danger)'
    : usedPercent >= 75
      ? '#f59e0b'
      : 'var(--admin-accent)';

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">إدارة الدورات</h1>
          <p className="admin-page-desc">لوحة التحكم لإضافة وتعديل وحذف دورات ومبادرات القرآن الكريم — {courses.length} دورة</p>
        </div>
        <button
          id="admin-add-course-btn"
          className="admin-btn admin-btn--primary"
          onClick={openAdd}
        >
          <Plus size={18} />
          إضافة دورة
        </button>
      </div>

      {/* Cloudflare R2 Storage Usage Card */}
      <div
        id="r2-storage-usage-card"
        className="rounded-2xl mb-6"
        style={{
          border: `1px solid ${uploadsBlocked ? 'rgba(248, 81, 73, 0.35)' : 'var(--admin-border)'}`,
          backgroundColor: 'var(--admin-surface)',
          padding: '1rem 1.15rem',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <HardDrive size={18} style={{ color: barColor }} />
            <div>
              <div style={{ fontWeight: 800, color: 'var(--admin-text)', fontSize: '0.95rem' }}>
                مساحة تخزين Cloudflare R2 للمحاضرات
              </div>
              <div className="admin-field-hint" style={{ marginTop: '0.15rem' }}>
                الحد المسموح {quotaGb} GB — يتوقف رفع الفيديوهات والصوتيات تلقائياً عند بلوغ {formatBytesDecimalGb(R2_UPLOAD_BLOCK_THRESHOLD_BYTES)} GB فأكثر.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {r2UsageLoading ? (
              <span className="admin-badge admin-badge--neutral">جارٍ قياس المساحة…</span>
            ) : r2Usage ? (
              <>
                <span
                  className="admin-badge"
                  style={{
                    background: uploadsBlocked
                      ? 'rgba(248, 81, 73, 0.14)'
                      : usedPercent >= 75
                        ? 'rgba(245, 158, 11, 0.14)'
                        : 'rgba(78, 173, 136, 0.14)',
                    color: barColor,
                    fontWeight: 800,
                  }}
                >
                  {usedPercent.toFixed(1)}% مستخدم
                </span>
                <span className="admin-muted" style={{ fontSize: '0.82rem', fontFamily: 'monospace' }} dir="ltr">
                  {usedGb} / {quotaGb} GB ({r2Usage.objectCount} files)
                </span>
              </>
            ) : null}

            <button
              type="button"
              id="refresh-r2-usage-btn"
              className="admin-btn admin-btn--ghost"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
              onClick={() => loadR2Usage()}
              disabled={r2UsageLoading}
            >
              <RefreshCcw size={14} className={r2UsageLoading ? 'admin-spin' : ''} />
              تحديث
            </button>
          </div>
        </div>

        {r2Usage && (
          <div
            aria-label="نسبة استخدام تخزين R2"
            style={{
              width: '100%',
              height: '9px',
              borderRadius: '999px',
              backgroundColor: 'rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${usedPercent}%`,
                height: '100%',
                backgroundColor: barColor,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        )}

        {uploadsBlocked && (
          <div className="admin-error-banner" role="alert" style={{ marginTop: '0.75rem' }}>
            <AlertTriangle size={16} />
            <span>
              تم بلوغ الحد الأقصى المسموح للرفع ({usedGb} GB من {quotaGb} GB). لن يتمكن المشرف من رفع أي فيديوهات أو ملفات صوتية جديدة حتى يتم حذف ملفات قديمة.
            </span>
          </div>
        )}

        {r2UsageError && !r2Usage && (
          <p className="admin-field-hint" style={{ color: '#f5b942', marginTop: '0.45rem' }}>
            ⚠️ {r2UsageError}
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="admin-filters">
        <div className="admin-search-wrapper">
          <Search size={16} className="admin-search-icon" />
          <input
            id="admin-course-search"
            type="text"
            className="admin-input admin-search-input"
            placeholder="بحث بالاسم أو الرابط أو الوصف…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="admin-filter-tabs">
          {[
            { val: 'all', label: 'الكل' },
            { val: 'published', label: 'المنشورة' },
            { val: 'draft', label: 'المسودات' },
          ].map(({ val, label }) => (
            <button
              key={val}
              id={`admin-filter-${val}`}
              className={`admin-filter-tab ${statusFilter === val ? 'admin-filter-tab--active' : ''}`}
              onClick={() => setStatusFilter(val)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="admin-loading">
          <div className="admin-spinner-lg" />
          <span>جارٍ التحميل…</span>
        </div>
      ) : error ? (
        <div className="admin-empty" style={{ minHeight: '300px' }}>
          <BookOpen size={48} className="mb-4 text-emerald-500 opacity-40" />
          <h3 className="text-xl font-bold mb-2">تعذر تحميل الدورات</h3>
          <p style={{ color: 'var(--admin-text-muted)' }}>{error}</p>
          <button className="admin-btn admin-btn--ghost" onClick={loadCourses}>
            <RefreshCcw size={16} />
            إعادة المحاولة
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty" style={{ minHeight: '300px' }}>
          <BookOpen size={48} className="mb-4 text-emerald-500 opacity-40" />
          <h3 className="text-xl font-bold mb-2">لا توجد دورات مطابقة</h3>
          <p style={{ color: 'var(--admin-text-muted)' }}>أضف دورة جديدة أو غيّر معايير البحث.</p>
        </div>
      ) : (
        <div className="admin-table-wrapper admin-table-wrapper--cards">
          <table className="admin-table admin-table--cards" id="courses-table">
            <thead>
              <tr>
                <th>الدورة</th>
                <th>التكلفة / السعر</th>
                <th>الترتيب</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const isExpanded = expandedIds.has(c.id);
                return (
                <tr
                  key={c.id}
                  id={`course-row-${c.id}`}
                  className={`admin-card-row--collapsible ${isExpanded ? 'admin-card-row--expanded' : ''}`}
                >
                  <td data-label="الدورة" className="admin-card-cell--summary admin-card-cell--title admin-card-cell--summary-last">
                    <div className="admin-card-title-bar">
                      <div className="admin-teacher-cell">
                        <div className="admin-card-detail-only">
                          {c.image_url ? (
                            <img
                              src={c.image_url}
                              alt={c.name}
                              className="admin-teacher-avatar"
                            />
                          ) : (
                            <div className="admin-teacher-avatar-fallback">
                              <BookOpen size={16} />
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <div className="admin-teacher-name">{c.name}</div>
                            <TranslationStatusBadge
                              record={c}
                              specs={COURSE_TRANSLATION_SPECS}
                            />
                          </div>
                          <div className="admin-muted admin-card-detail-only" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                            {c.slug}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="admin-card-toggle-btn"
                        onClick={() => toggleExpand(c.id)}
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? `إخفاء تفاصيل ${c.name}` : `عرض تفاصيل ${c.name}`}
                      >
                        <ChevronDown size={18} className="admin-card-toggle-icon" />
                      </button>
                    </div>
                  </td>
                  <td data-label="التكلفة / السعر">
                    {c.is_free ? (
                      <span className="admin-badge admin-badge--neutral">مجاني بالكامل</span>
                    ) : (
                      <span>{c.price || '—'}</span>
                    )}
                  </td>
                  <td data-label="الترتيب">{c.sort_order}</td>
                  <td data-label="الحالة">
                    <button
                      className={`admin-badge ${c.is_published ? 'admin-badge--published' : 'admin-badge--draft'}`}
                      onClick={() => togglePublished(c)}
                      title={c.is_published ? 'تغيير إلى مسودة' : 'نشر الدورة'}
                    >
                      {c.is_published ? (
                        <><Eye size={12} /> منشورة</>
                      ) : (
                        <><EyeOff size={12} /> مسودة</>
                      )}
                    </button>
                  </td>
                  <td data-label="الإجراءات">
                    <div className="admin-row-actions">
                      <button
                        id={`course-students-progress-${c.id}`}
                        className="admin-icon-btn admin-icon-btn--lesson"
                        onClick={() => navigate(`/admin/quran/courses/${c.id}/students`)}
                        aria-label={`تقدم الطلاب في ${c.name}`}
                        title="متابعة تقدم الطلاب"
                      >
                        <Users size={15} />
                      </button>
                      <button
                        id={`manage-course-lectures-${c.id}`}
                        className="admin-icon-btn admin-icon-btn--neutral"
                        onClick={() => navigate(`/admin/quran/courses/${c.id}/lectures`)}
                        aria-label={`إدارة محاضرات ${c.name}`}
                        title="إدارة المحاضرات"
                      >
                        <PlayCircle size={15} />
                      </button>
                      <button
                        id={`edit-course-${c.id}`}
                        className="admin-icon-btn admin-icon-btn--edit"
                        onClick={() => openEdit(c)}
                        aria-label={`تعديل ${c.name}`}
                        title="تعديل"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        id={`delete-course-${c.id}`}
                        className="admin-icon-btn admin-icon-btn--delete"
                        onClick={() => confirmDelete(c)}
                        aria-label={`حذف ${c.name}`}
                        title="حذف"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalState.open && (
        <CourseFormModal
          course={modalState.course}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="تأكيد الحذف"
        >
          <div className="admin-confirm-dialog">
            <div className="admin-confirm-icon">🗑️</div>
            <h3 className="admin-confirm-title">تأكيد الحذف</h3>
            <p className="admin-confirm-text">
              هل أنت متأكد من حذف دورة <strong>{deleteTarget.name}</strong>؟
              <br />
              سيتم حذف الصور والملفات المرفقة وقاعدة البيانات الخاصة بها نهائياً.
            </p>
            <div className="admin-modal-actions">
              <button
                id="admin-cancel-delete-btn"
                className="admin-btn admin-btn--ghost"
                onClick={cancelDelete}
                disabled={deleting}
              >
                إلغاء
              </button>
              <button
                id="admin-confirm-delete-btn"
                className="admin-btn admin-btn--danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'جارٍ الحذف…' : 'نعم، احذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
