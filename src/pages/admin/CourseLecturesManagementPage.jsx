import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Eye,
  EyeOff,
  Pencil,
  PlayCircle,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  HelpCircle,
} from 'lucide-react';
import { fetchCourseAdminById } from '../../services/coursesService';
import {
  deleteCourseLecture,
  fetchCourseLecturesAdmin,
  maybeDeleteCourseLectureVideoAsset,
  sortCourseLectures,
  updateCourseLecture,
} from '../../services/courseLecturesService';
import CourseLectureFormModal from './CourseLectureFormModal';
import LectureQuestionsModal from './LectureQuestionsModal';

function getLoadErrorMessage(error) {
  const message = error?.message ?? '';

  if (message.includes('Supabase is not configured')) {
    return 'تعذر تحميل المحاضرات لأن إعدادات قاعدة البيانات غير مكتملة.';
  }

  if (/quran_course_lectures|Could not find the table/i.test(message)) {
    return 'تعذر تحميل المحاضرات لأن بنية المحاضرات لم تُفعّل في الخلفية بعد.';
  }

  return 'تعذر تحميل محاضرات الدورة حالياً. حاول مرة أخرى بعد قليل.';
}

function getLectureSourceSummary(lecture, isFreeCourse) {
  if (isFreeCourse) {
    return lecture.youtube_url || 'رابط يوتيوب غير مضاف بعد';
  }

  if (lecture.original_file_name) {
    return `الملف: ${lecture.original_file_name}`;
  }

  if (lecture.r2_object_key) {
    return 'تم رفع فيديو MP4 لهذه المحاضرة.';
  }

  return 'لم يتم رفع ملف MP4 بعد';
}

export default function CourseLecturesManagementPage() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modalState, setModalState] = useState({ open: false, lecture: null });
  const [questionsModalState, setQuestionsModalState] = useState({ open: false, lectureId: '', lectureTitle: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const courseData = await fetchCourseAdminById(id);
      if (!courseData) {
        setCourse(null);
        setLectures([]);
        return;
      }

      const lectureData = await fetchCourseLecturesAdmin(id);
      setCourse(courseData);
      setLectures(lectureData);
    } catch (loadError) {
      console.error(loadError);
      setCourse(null);
      setLectures([]);
      setError(getLoadErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError('');

        const courseData = await fetchCourseAdminById(id);
        if (!active) return;

        if (!courseData) {
          setCourse(null);
          setLectures([]);
          return;
        }

        const lectureData = await fetchCourseLecturesAdmin(id);
        if (!active) return;

        setCourse(courseData);
        setLectures(lectureData);
      } catch (loadError) {
        console.error(loadError);
        if (!active) return;

        setCourse(null);
        setLectures([]);
        setError(getLoadErrorMessage(loadError));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      active = false;
    };
  }, [id]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return lectures;

    return lectures.filter((lecture) => {
      return [
        lecture.title,
        lecture.description,
        lecture.youtube_url,
        lecture.original_file_name,
        lecture.r2_object_key,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [lectures, search]);

  const handleSaved = (savedLecture) => {
    setLectures((prev) => {
      const existingIndex = prev.findIndex((lecture) => lecture.id === savedLecture.id);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = { ...prev[existingIndex], ...savedLecture };
        return sortCourseLectures(next);
      }

      return sortCourseLectures([...prev, savedLecture]);
    });
  };

  const togglePublished = async (lecture) => {
    try {
      const updated = await updateCourseLecture(lecture.id, {
        is_published: !lecture.is_published,
      });
      handleSaved(updated);
    } catch (toggleError) {
      console.error(toggleError);
      alert(`فشل تحديث الحالة: ${toggleError.message}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);

    try {
      const removed = await deleteCourseLecture(deleteTarget.id);
      setLectures((prev) => prev.filter((lecture) => lecture.id !== deleteTarget.id));
      setDeleteTarget(null);

      maybeDeleteCourseLectureVideoAsset(removed).catch((cleanupError) => {
        console.error('[cleanup course lecture video failed]', cleanupError);
      });
    } catch (deleteError) {
      console.error(deleteError);
      alert(`فشل الحذف: ${deleteError.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const openAdd = () => setModalState({ open: true, lecture: null });
  const openEdit = (lecture) => setModalState({ open: true, lecture });
  const closeModal = () => setModalState({ open: false, lecture: null });

  return (
    <div className="admin-page">
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

          <h1 className="admin-page-title">إدارة المحاضرات</h1>
          <p className="admin-page-desc">
            {course
              ? `${course.name} — ${lectures.length} محاضرة ${course.is_free ? 'مجانية عبر يوتيوب' : 'مدفوعة عبر MP4'}`
              : 'إضافة وتعديل وترتيب محاضرات الدورة'}
          </p>
        </div>

        <button className="admin-btn admin-btn--primary" onClick={openAdd} disabled={!course}>
          <Plus size={18} />
          إضافة محاضرة
        </button>
      </div>

      {course && (
        <div
          className="rounded-2xl mb-6"
          style={{
            border: '1px solid var(--admin-border)',
            backgroundColor: 'var(--admin-surface)',
            padding: '1rem 1.1rem',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--admin-text)' }}>{course.name}</div>
              <div className="admin-field-hint" style={{ marginTop: '0.25rem', lineHeight: 1.8 }}>
                {course.is_free
                  ? 'هذه الدورة مجانية، لذلك كل محاضرة تتوقع رابط يوتيوب صالحاً.'
                  : 'هذه الدورة مدفوعة، لذلك كل محاضرة تتوقع رفع ملف MP4 عبر خدمة الفيديو الخلفية.'}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="admin-badge admin-badge--neutral">
                {course.is_free ? 'مجانية / YouTube' : 'مدفوعة / MP4 + R2'}
              </span>
              <Link
                to={`/quran/courses/${course.slug}/watch`}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-btn admin-btn--ghost"
              >
                <PlayCircle size={16} />
                فتح صفحة المشاهدة
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="admin-filters">
        <div className="admin-search-wrapper">
          <Search size={16} className="admin-search-icon" />
          <input
            id="admin-course-lectures-search"
            type="text"
            className="admin-input admin-search-input"
            placeholder="بحث بعنوان المحاضرة أو الوصف أو مصدر الفيديو…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="admin-spinner-lg" />
          <span>جارٍ تحميل المحاضرات…</span>
        </div>
      ) : error ? (
        <div className="admin-empty" style={{ minHeight: '300px' }}>
          <BookOpen size={48} className="mb-4 text-emerald-500 opacity-40" />
          <h3 className="text-xl font-bold mb-2">تعذر تحميل المحاضرات</h3>
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
        <div className="admin-empty" style={{ minHeight: '300px' }}>
          <PlayCircle size={48} className="mb-4 text-emerald-500 opacity-40" />
          <h3 className="text-xl font-bold mb-2">
            {lectures.length === 0 ? 'لا توجد محاضرات بعد' : 'لا توجد نتائج مطابقة'}
          </h3>
          <p style={{ color: 'var(--admin-text-muted)' }}>
            {lectures.length === 0
              ? 'ابدأ بإضافة أول محاضرة لهذه الدورة.'
              : 'جرّب تغيير كلمات البحث أو امسح الحقل الحالي.'}
          </p>

          {lectures.length === 0 && (
            <button className="admin-btn admin-btn--primary" onClick={openAdd}>
              <Plus size={16} />
              إضافة أول محاضرة
            </button>
          )}
        </div>
      ) : (
        <div className="admin-table-wrapper admin-table-wrapper--cards">
          <table className="admin-table admin-table--cards" id="course-lectures-table">
            <thead>
              <tr>
                <th>المحاضرة</th>
                <th>النوع</th>
                <th>الترتيب</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lecture) => (
                <tr key={lecture.id} id={`course-lecture-row-${lecture.id}`}>
                  <td data-label="المحاضرة">
                    <div>
                      <div className="admin-teacher-name">{lecture.title}</div>
                      <div className="admin-teacher-bio-preview" style={{ lineHeight: 1.7 }}>
                        {lecture.description || getLectureSourceSummary(lecture, course.is_free)}
                      </div>
                    </div>
                  </td>
                  <td data-label="النوع">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <span className="admin-badge admin-badge--neutral">
                        {course.is_free ? 'يوتيوب' : 'MP4 / R2'}
                      </span>
                      <span className="admin-muted" style={{ fontSize: '0.75rem' }}>
                        {course.is_free ? 'رابط عام' : lecture.r2_object_key ? 'جاهز للمشاهدة' : 'ينتظر رفع الفيديو'}
                      </span>
                    </div>
                  </td>
                  <td data-label="الترتيب">{lecture.sort_order}</td>
                  <td data-label="الحالة">
                    <button
                      className={`admin-badge ${lecture.is_published ? 'admin-badge--published' : 'admin-badge--draft'}`}
                      onClick={() => togglePublished(lecture)}
                      title={lecture.is_published ? 'إخفاء المحاضرة' : 'نشر المحاضرة'}
                    >
                      {lecture.is_published ? (
                        <><Eye size={12} /> منشورة</>
                      ) : (
                        <><EyeOff size={12} /> مسودة</>
                      )}
                    </button>
                  </td>
                  <td data-label="الإجراءات">
                    <div className="admin-row-actions">
                      <button
                        className="admin-icon-btn admin-icon-btn--neutral"
                        onClick={() => setQuestionsModalState({ open: true, lectureId: lecture.id, lectureTitle: lecture.title })}
                        aria-label={`أسئلة وأجوبة ${lecture.title}`}
                        title="الأسئلة والأجوبة"
                      >
                        <HelpCircle size={15} />
                      </button>
                      <button
                        className="admin-icon-btn admin-icon-btn--edit"
                        onClick={() => openEdit(lecture)}
                        aria-label={`تعديل ${lecture.title}`}
                        title="تعديل"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="admin-icon-btn admin-icon-btn--delete"
                        onClick={() => setDeleteTarget(lecture)}
                        aria-label={`حذف ${lecture.title}`}
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

      {modalState.open && course && (
        <CourseLectureFormModal
          course={course}
          lecture={modalState.lecture}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}

      {questionsModalState.open && (
        <LectureQuestionsModal
          lectureId={questionsModalState.lectureId}
          lectureTitle={questionsModalState.lectureTitle}
          onClose={() => setQuestionsModalState({ open: false, lectureId: '', lectureTitle: '' })}
        />
      )}

      {deleteTarget && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-label="تأكيد حذف المحاضرة">
          <div className="admin-confirm-dialog">
            <div className="admin-confirm-icon">🗑️</div>
            <h3 className="admin-confirm-title">تأكيد حذف المحاضرة</h3>
            <p className="admin-confirm-text">
              هل أنت متأكد من حذف محاضرة <strong>{deleteTarget.title}</strong>؟
              <br />
              سيتم حذف السجل من لوحة الإدارة، وأي تنظيف لملف الفيديو سيتم بشكل خلفي إن كانت الخدمة متاحة.
            </p>
            <div className="admin-modal-actions">
              <button className="admin-btn admin-btn--ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                إلغاء
              </button>
              <button className="admin-btn admin-btn--danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'جارٍ الحذف…' : 'نعم، احذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
