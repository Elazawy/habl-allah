import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAllCourses, deleteCourse, updateCourse, deleteCourseImage } from '../../services/coursesService';
import { fetchCourseLecturesAdmin, deleteCourseLectureVideoAssets } from '../../services/courseLecturesService';
import CourseFormModal from './CourseFormModal';
import { Plus, Pencil, Trash2, Search, BookOpen, Eye, EyeOff, PlayCircle, RefreshCcw } from 'lucide-react';

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
    return () => {
      active.current = false;
    };
  }, [loadCourses]);

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

      // 2. Delete paid lecture assets from Cloudflare R2 before the course row cascades lectures.
      if (!deleteTarget.is_free) {
        const lectures = await fetchCourseLecturesAdmin(deleteTarget.id);
        await deleteCourseLectureVideoAssets(lectures);
      }

      // 3. Delete row from DB
      await deleteCourse(deleteTarget.id);
      setCourses((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
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
              {filtered.map((c) => (
                <tr key={c.id} id={`course-row-${c.id}`}>
                  <td data-label="الدورة">
                    <div className="admin-teacher-cell">
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
                      <div>
                        <div className="admin-teacher-name">{c.name}</div>
                        <div className="admin-muted" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                          {c.slug}
                        </div>
                      </div>
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
              ))}
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
              سيتم حذف الصور المرفقة وقاعدة البيانات الخاصة بها نهائياً.
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
