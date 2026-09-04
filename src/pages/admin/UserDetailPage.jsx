import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchStudentById,
  updateStudentProfile,
  adminResetStudentPassword,
  grantCourseAccess,
  revokeCourseAccess,
  subscribeStudentToCompetition,
  unsubscribeStudentFromCompetition,
  generatePassword,
} from '../../services/studentsService';
import { fetchAllTeachers } from '../../services/adminService';
import { fetchAllCourses } from '../../services/coursesService';
import { fetchAllCompetitions } from '../../services/competitionsService';
import { fetchStudentLessons, deleteQuranLesson } from '../../services/quranLessonsService';
import QuranLessonFormModal from './QuranLessonFormModal';
import { COUNTRY_OPTIONS, getCountryName } from '../../data/countries';
import { User, BookOpen, Trophy, Calendar, Pencil, Trash2, Plus, ArrowRight, Loader, KeyRound, RefreshCw } from 'lucide-react';

export default function UserDetailPage() {
  const { id: studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [lessons, setLessons] = useState([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('basic');

  // Basic info tab state
  const [fullName, setFullName] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [savingBasic, setSavingBasic] = useState(false);
  const [basicError, setBasicError] = useState('');

  // Basic info — new profile fields
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('');
  const [birthDate, setBirthDate] = useState('');

  // Password reset state
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState('');

  // Lesson management state
  const [lessonModal, setLessonModal] = useState({ open: false, lesson: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingLesson, setDeletingLesson] = useState(false);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const studentData = await fetchStudentById(studentId);
      setStudent(studentData);
      setFullName(studentData.full_name);
      setTeacherId(studentData.teacher_id ?? '');
      setGender(studentData.gender ?? '');
      setCountry(studentData.country ?? '');
      setBirthDate(studentData.birth_date ?? '');

      const teachersData = await fetchAllTeachers();
      setTeachers(teachersData);

      const coursesData = await fetchAllCourses();
      setCourses(coursesData);

      const competitionsData = await fetchAllCompetitions();
      setCompetitions(competitionsData);

      const lessonsData = await fetchStudentLessons(studentId);
      setLessons(lessonsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Tab 1: Update basic profile
  const handleUpdateBasic = async (e) => {
    e.preventDefault();
    setBasicError('');
    setSavingBasic(true);
    try {
      const updated = await updateStudentProfile(studentId, {
        full_name: fullName.trim(),
        teacher_id: teacherId || null,
        gender: gender || null,
        country: country || null,
        birth_date: birthDate || null,
      });
      setStudent((prev) => ({
        ...prev,
        full_name: updated.full_name,
        teacher_id: updated.teacher_id,
        gender: updated.gender,
        country: updated.country,
        birth_date: updated.birth_date,
      }));
      alert('تم تحديث البيانات الأساسية بنجاح.');
    } catch (err) {
      console.error(err);
      setBasicError(err.message ?? 'حدث خطأ أثناء حفظ التغييرات.');
    } finally {
      setSavingBasic(false);
    }
  };

  // Tab 1: Admin password reset
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetPasswordError('');
    if (newPassword.length < 6 || newPassword.length > 10) {
      setResetPasswordError('يجب أن تكون كلمة المرور بين 6 و 10 خانات.');
      return;
    }

    if (!window.confirm(`هل أنت متأكد من تغيير كلمة مرور الطالب ${student.full_name}؟`)) return;

    setResettingPassword(true);
    try {
      await adminResetStudentPassword(studentId, newPassword);
      setNewPassword('');
      alert(`تم تغيير كلمة المرور بنجاح!\nكلمة المرور الجديدة: ${newPassword}\nيرجى إرسالها للطالب.`);
    } catch (err) {
      console.error(err);
      setResetPasswordError(err.message ?? 'حدث خطأ أثناء تغيير كلمة المرور.');
    } finally {
      setResettingPassword(false);
    }
  };

  // Tab 2: Course Access Grant/Revoke
  const handleCourseAccessToggle = async (courseId, hasAccess) => {
    try {
      if (hasAccess) {
        await revokeCourseAccess(studentId, courseId);
      } else {
        await grantCourseAccess(studentId, courseId);
      }
      // Reload student details to refresh subscription state
      const updatedStudent = await fetchStudentById(studentId);
      setStudent(updatedStudent);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تعديل صلاحيات الدورة: ' + err.message);
    }
  };

  // Tab 3: Competition Subscription Toggle
  const handleCompetitionToggle = async (competitionId, hasSub) => {
    try {
      if (hasSub) {
        await unsubscribeStudentFromCompetition(studentId, competitionId);
      } else {
        await subscribeStudentToCompetition(studentId, competitionId);
      }
      const updatedStudent = await fetchStudentById(studentId);
      setStudent(updatedStudent);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تعديل اشتراك المسابقة: ' + err.message);
    }
  };

  // Tab 4: Lesson saved handler
  const handleLessonSaved = async () => {
    const lessonsData = await fetchStudentLessons(studentId);
    setLessons(lessonsData);
  };

  // Tab 4: Lesson deletion
  const handleDeleteLesson = async () => {
    if (!deleteTarget) return;
    setDeletingLesson(true);
    try {
      await deleteQuranLesson(deleteTarget.id);
      setLessons((prev) => prev.filter((l) => l.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      alert('فشل حذف الدرس: ' + err.message);
    } finally {
      setDeletingLesson(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading" style={{ minHeight: '60vh' }}>
        <div className="admin-spinner-lg" />
        <span>جارٍ تحميل بيانات الطالب…</span>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="admin-empty">
        <p>لم يتم العثور على الطالب المطلوب.</p>
        <button onClick={() => navigate('/admin/quran/users')} className="admin-btn admin-btn--primary">
          العودة للقائمة
        </button>
      </div>
    );
  }

  // Derived Access States
  const activeCourseSubs = student.student_course_subscriptions?.reduce((acc, sub) => {
    acc[sub.course_id] = sub.is_active;
    return acc;
  }, {}) ?? {};

  const activeCompSubs = student.student_competition_subscriptions?.reduce((acc, sub) => {
    acc[sub.competition_id] = sub.is_active;
    return acc;
  }, {}) ?? {};

  return (
    <div className="admin-page" dir="rtl">
      {/* Breadcrumb */}
      <button
        id="back-to-users-btn"
        onClick={() => navigate('/admin/quran/users')}
        className="admin-btn admin-btn--ghost"
        style={{ marginBottom: '1rem', padding: '0.4rem 0.8rem', gap: '0.25rem' }}
      >
        <ArrowRight size={16} />
        العودة لحسابات الطلاب
      </button>

      {/* Header */}
      <div className="admin-page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="admin-page-title">{student.full_name}</h1>
          <p className="admin-page-desc">الهاتف: {student.phone} | انضم في {new Date(student.created_at).toLocaleDateString('ar-EG')}</p>
        </div>
      </div>

      {/* Tabs list */}
      <div className="admin-filter-tabs admin-detail-tabs" style={{ marginBottom: '2rem' }}>
        {[
          { id: 'basic', label: 'المعلومات الأساسية', icon: User },
          { id: 'courses', label: 'الدورات والوصول', icon: BookOpen },
          { id: 'competitions', label: 'المسابقات', icon: Trophy },
          { id: 'lessons', label: 'دروس القرآن', icon: Calendar },
        ].map((t) => (
          <button
            key={t.id}
            id={`tab-btn-${t.id}`}
            className={`admin-filter-tab ${activeTab === t.id ? 'admin-filter-tab--active' : ''}`}
            onClick={() => setActiveTab(t.id)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem' }}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="admin-card admin-detail-card">
        
        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <form onSubmit={handleUpdateBasic} id="update-basic-form" className="space-y-6" style={{ maxWidth: '500px' }}>
            <div className="admin-field-group">
              <label htmlFor="edit-student-fullname" className="admin-label">الاسم الكامل للطالب *</label>
              <input
                id="edit-student-fullname"
                type="text"
                required
                className="admin-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="admin-field-group">
              <label htmlFor="edit-student-phone" className="admin-label">رقم الهاتف (اسم المستخدم للدخول - لا يمكن تعديله)</label>
              <input
                id="edit-student-phone"
                type="text"
                disabled
                className="admin-input"
                value={student.phone}
                style={{ opacity: 0.5, cursor: 'not-allowed' }}
                dir="ltr"
              />
            </div>

            <div className="admin-field-group">
              <label htmlFor="edit-student-teacher" className="admin-label">المعلم المتابع</label>
              <select
                id="edit-student-teacher"
                className="admin-input admin-select"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
              >
                <option value="">--بدون معلم</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="admin-field-group">
              <label htmlFor="edit-student-gender" className="admin-label">الجنس</label>
              <select
                id="edit-student-gender"
                className="admin-input admin-select"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">--غير محدد</option>
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </div>

            <div className="admin-field-group">
              <label htmlFor="edit-student-country" className="admin-label">الدولة</label>
              <select
                id="edit-student-country"
                className="admin-input admin-select"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="">--غير محددة</option>
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>{c.nameAr}</option>
                ))}
              </select>
              {student.country && !COUNTRY_OPTIONS.some((c) => c.code === student.country) && (
                <p style={{ fontSize: '0.75rem', color: 'var(--admin-muted)', marginTop: '0.2rem' }}>
                  القيمة الحالية المخزنة: {getCountryName(student.country)}
                </p>
              )}
            </div>

            <div className="admin-field-group">
              <label htmlFor="edit-student-birthdate" className="admin-label">تاريخ الميلاد</label>
              <input
                id="edit-student-birthdate"
                type="date"
                className="admin-input"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            {basicError && (
              <div className="admin-error-banner" role="alert">⚠️ {basicError}</div>
            )}

            <button
              type="submit"
              id="save-student-basic-btn"
              className="admin-btn admin-btn--primary"
              disabled={savingBasic}
            >
              {savingBasic ? <Loader size={16} className="admin-spin" /> : null}
              {savingBasic ? 'جارٍ الحفظ…' : 'حفظ التغيرات الأساسية'}
            </button>
          </form>
        )}

        {/* Password Reset (basic tab) */}
        {activeTab === 'basic' && (
          <form
            onSubmit={handleResetPassword}
            id="reset-student-password-form"
            className="space-y-4"
            style={{ maxWidth: '500px', marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid var(--admin-border)' }}
          >
            <h3 className="admin-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <KeyRound size={18} />
              تغيير كلمة المرور
            </h3>

            <div className="admin-field-group">
              <label htmlFor="new-student-password" className="admin-label">كلمة المرور الجديدة</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  id="new-student-password"
                  type="text"
                  className="admin-input"
                  dir="ltr"
                  placeholder="من 6 إلى 10 خانات…"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ flex: '1 1 180px', minWidth: 0 }}
                />
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={() => setNewPassword(generatePassword(9))}
                  disabled={resettingPassword}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <RefreshCw size={14} />
                  توليد عشوائي
                </button>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--admin-muted)', marginTop: '0.2rem' }}>
                ⚠️ تأكد من حفظ أو كتابة كلمة المرور لإرسالها للطالب.
              </p>
            </div>

            {resetPasswordError && (
              <div className="admin-error-banner" role="alert">⚠️ {resetPasswordError}</div>
            )}

            <button
              type="submit"
              id="reset-student-password-btn"
              className="admin-btn admin-btn--primary"
              disabled={resettingPassword}
            >
              {resettingPassword ? <Loader size={16} className="admin-spin" /> : <KeyRound size={16} />}
              {resettingPassword ? 'جاري التغيير…' : 'تغيير كلمة المرور'}
            </button>
          </form>
        )}

        {/* Courses Access Tab */}
        {activeTab === 'courses' && (
          <div>
            <h3 className="admin-section-title">صلاحيات الوصول لدورات الطالب</h3>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>اسم الدورة</th>
                    <th>نوع الدورة</th>
                    <th>حالة الوصول</th>
                    <th>التحكم</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => {
                    const hasAccess = Boolean(activeCourseSubs[course.id]);
                    return (
                      <tr key={course.id}>
                        <td style={{ fontWeight: 600 }}>{course.name}</td>
                        <td>
                          <span className={`admin-badge ${course.is_free ? 'admin-badge--neutral' : 'admin-badge--male'}`}>
                            {course.is_free ? 'مجانية' : 'مدفوعة'}
                          </span>
                        </td>
                        <td>
                          {course.is_free ? (
                            <span className="admin-badge admin-badge--male" style={{ color: 'var(--admin-accent)', background: 'rgba(78,173,136,0.1)' }}>
                              مفتوحة تلقائياً (مجانية)
                            </span>
                          ) : hasAccess ? (
                            <span className="admin-badge admin-badge--male" style={{ color: 'var(--admin-accent)', background: 'rgba(78,173,136,0.1)' }}>
                              مفتوح ✅
                            </span>
                          ) : (
                            <span className="admin-badge admin-badge--female" style={{ color: 'var(--admin-danger)', background: 'rgba(248,81,73,0.1)' }}>
                              مغلق ⛔
                            </span>
                          )}
                        </td>
                        <td>
                          {!course.is_free && (
                            <button
                              id={`toggle-course-${course.id}`}
                              type="button"
                              className={`admin-btn ${hasAccess ? 'admin-btn--danger' : 'admin-btn--primary'}`}
                              onClick={() => handleCourseAccessToggle(course.id, hasAccess)}
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                            >
                              {hasAccess ? 'إغلاق الوصول' : 'فتح الوصول'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Competitions Subscriptions Tab */}
        {activeTab === 'competitions' && (
          <div>
            <h3 className="admin-section-title">اشتراكات الطالب في المسابقات</h3>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>اسم المسابقة</th>
                    <th>الحالة</th>
                    <th>التحكم</th>
                  </tr>
                </thead>
                <tbody>
                  {competitions.map((comp) => {
                    const hasSub = Boolean(activeCompSubs[comp.id]);
                    return (
                      <tr key={comp.id}>
                        <td style={{ fontWeight: 600 }}>{comp.name}</td>
                        <td>
                          {hasSub ? (
                            <span className="admin-badge admin-badge--male" style={{ color: 'var(--admin-accent)', background: 'rgba(78,173,136,0.1)' }}>
                              مشترك ✅
                            </span>
                          ) : (
                            <span className="admin-badge admin-badge--female" style={{ color: 'var(--admin-danger)', background: 'rgba(248,81,73,0.1)' }}>
                              غير مشترك ⛔
                            </span>
                          )}
                        </td>
                        <td>
                          <button
                            id={`toggle-comp-${comp.id}`}
                            type="button"
                            className={`admin-btn ${hasSub ? 'admin-btn--danger' : 'admin-btn--primary'}`}
                            onClick={() => handleCompetitionToggle(comp.id, hasSub)}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                          >
                            {hasSub ? 'إلغاء الاشتراك' : 'تسجيل في المسابقة'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Quran Lessons Report Tab */}
        {activeTab === 'lessons' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3 className="admin-section-title" style={{ margin: 0 }}>تقارير ودروس التسميع</h3>
              <button
                id="add-lesson-btn"
                className="admin-btn admin-btn--primary"
                onClick={() => setLessonModal({ open: true, lesson: null })}
                style={{ padding: '0.5rem 1rem' }}
              >
                <Plus size={16} />
                إضافة درس قرآن جديد
              </button>
            </div>

            {lessons.length === 0 ? (
              <div className="admin-empty" style={{ padding: '2rem' }}>
                <p>لا يوجد تقارير دروس مسجلة لهذا الطالب بعد.</p>
              </div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table" id="lessons-table">
                  <thead>
                    <tr>
                      <th>التاريخ الميلادي</th>
                      <th>التاريخ الهجري</th>
                      <th>تسميع اليوم (الحاضر)</th>
                      <th>مستوى الحفظ</th>
                      <th>الماضي</th>
                      <th>التفاعل</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lessons.map((lesson) => (
                      <tr key={lesson.id} id={`lesson-row-${lesson.id}`}>
                        <td>{new Date(lesson.lesson_date).toLocaleDateString('ar-EG')}</td>
                        <td>{lesson.hijri_date ?? '—'}</td>
                        <td>
                          {lesson.recitation_today_surah ? (
                            <span>
                              {lesson.recitation_today_surah} (من {lesson.recitation_today_from || '١'} إلى {lesson.recitation_today_to || 'الآخر'})
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          {lesson.recitation_today_level ? (
                            <span className="admin-badge admin-badge--male" style={{ background: 'rgba(78,173,136,0.1)', color: 'var(--admin-accent)' }}>
                              {lesson.recitation_today_level}
                            </span>
                          ) : '—'}
                        </td>
                        <td>{lesson.recitation_past_surah ?? '—'}</td>
                        <td>{lesson.interaction_level ?? '—'}</td>
                        <td>
                          <div className="admin-row-actions">
                            <button
                              id={`edit-lesson-${lesson.id}`}
                              className="admin-icon-btn admin-icon-btn--edit"
                              onClick={() => setLessonModal({ open: true, lesson })}
                              title="تعديل تقرير الدرس"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              id={`delete-lesson-${lesson.id}`}
                              className="admin-icon-btn admin-icon-btn--delete"
                              onClick={() => setDeleteTarget(lesson)}
                              title="حذف الدرس"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Quran Lesson Form Modal */}
      {lessonModal.open && (
        <QuranLessonFormModal
          lesson={lessonModal.lesson}
          studentId={studentId}
          studentName={student?.full_name}
          onClose={() => setLessonModal({ open: false, lesson: null })}
          onSaved={handleLessonSaved}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="تأكيد حذف التقرير"
        >
          <div className="admin-confirm-dialog">
            <div className="admin-confirm-icon">🗑️</div>
            <h3 className="admin-confirm-title">تأكيد حذف تقرير الدرس</h3>
            <p className="admin-confirm-text">
              هل أنت متأكد من حذف تقرير الدرس بتاريخ <strong>{new Date(deleteTarget.lesson_date).toLocaleDateString('ar-EG')}</strong>؟
              <br />
              هذا الإجراء سيقوم بحذف الدرس نهائياً وتعديل النتائج عند الطالب.
            </p>
            <div className="admin-modal-actions">
              <button
                id="cancel-delete-lesson-btn"
                className="admin-btn admin-btn--ghost"
                onClick={() => setDeleteTarget(null)}
                disabled={deletingLesson}
              >
                إلغاء
              </button>
              <button
                id="confirm-delete-lesson-btn"
                className="admin-btn admin-btn--danger"
                onClick={handleDeleteLesson}
                disabled={deletingLesson}
              >
                {deletingLesson ? 'جارٍ الحذف…' : 'نعم، احذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
