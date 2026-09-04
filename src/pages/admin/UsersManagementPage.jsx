import { useEffect, useState } from 'react';
import {
  fetchAllStudents,
  adminCreateStudent,
  adminDeleteStudent,
  generatePassword,
  isValidStudentPhone,
  normalizeStudentPhone,
} from '../../services/studentsService';
import { fetchAllTeachers } from '../../services/adminService';
import { COUNTRY_OPTIONS, getCountryName } from '../../data/countries';
import { Plus, Search, User, Loader, ChevronLeft, Trash2, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import QuranLessonFormModal from './QuranLessonFormModal';

function calcAgeInYears(dateString) {
  if (!dateString) return null;
  const birthDate = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
}

export default function UsersManagementPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [teachers, setTeachers] = useState([]);

  // Filters
  const [genderFilter, setGenderFilter] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('');
  const [ageMinFilter, setAgeMinFilter] = useState('');
  const [ageMaxFilter, setAgeMaxFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [lessonModalStudent, setLessonModalStudent] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAllStudents();
      setStudents(data);
      const tData = await fetchAllTeachers();
      setTeachers(tData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = students.filter((s) => {
    const term = search.toLowerCase().trim();
    if (term) {
      const matchesSearch = (
        s.full_name.toLowerCase().includes(term) ||
        s.phone.includes(term) ||
        (s.teachers?.name || '').toLowerCase().includes(term)
      );
      if (!matchesSearch) return false;
    }

    if (genderFilter && s.gender !== genderFilter) return false;

    if (teacherFilter && (s.teacher_id ?? '') !== teacherFilter) return false;

    if (ageMinFilter !== '' || ageMaxFilter !== '') {
      const age = calcAgeInYears(s.birth_date);
      if (age === null) return false;
      if (ageMinFilter !== '' && age < Number(ageMinFilter)) return false;
      if (ageMaxFilter !== '' && age > Number(ageMaxFilter)) return false;
    }

    return true;
  });

  const resetFilters = () => {
    setGenderFilter('');
    setTeacherFilter('');
    setAgeMinFilter('');
    setAgeMaxFilter('');
  };

  const hasActiveFilters = Boolean(genderFilter || teacherFilter || ageMinFilter !== '' || ageMaxFilter !== '');

  const handleGeneratePassword = () => {
    const pw = generatePassword(9);
    setPassword(pw);
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setError('');
    const normalizedPhone = normalizeStudentPhone(phone);

    if (fullName.trim().length < 2) {
      setError('الاسم الكامل يجب أن يكون ثنائياً على الأقل.');
      return;
    }

    if (!isValidStudentPhone(phone)) {
      setError('رقم الهاتف يجب أن يتكون من 10 إلى 15 رقماً.');
      return;
    }

    if (password.length < 6 || password.length > 10) {
      setError('يجب أن تكون كلمة المرور بين 6 و 10 خانات.');
      return;
    }

    setSaving(true);
    try {
      await adminCreateStudent({
        fullName: fullName.trim(),
        phone: normalizedPhone,
        password,
        teacherId: teacherId || null,
        gender: gender || null,
        country: country || null,
        birthDate: birthDate || null,
      });

      // Reload students list
      const data = await fetchAllStudents();
      setStudents(data);

      // Reset form and close
      setFullName('');
      setPhone('');
      setPassword('');
      setTeacherId('');
      setGender('');
      setCountry('');
      setBirthDate('');
      setModalOpen(false);

      alert(`تم إنشاء الحساب بنجاح!\nكلمة مرور الطالب: ${password}\nيرجى إرسالها للطالب.`);
    } catch (err) {
      console.error(err);
      if (err.message?.includes('unique') || err.message?.includes('already exists')) {
        setError('رقم الهاتف هذا مسجل بالفعل لطالب آخر.');
      } else {
        setError(err.message ?? 'حدث خطأ أثناء إنشاء الحساب.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await adminDeleteStudent(deleteTarget.id);
      setStudents((prev) => prev.filter((student) => student.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      alert('فشل حذف الحساب: ' + (err.message ?? 'حدث خطأ غير متوقع.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="admin-page" dir="rtl">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">حسابات المستخدمين (الطلاب)</h1>
          <p className="admin-page-desc">{students.length} طالب مسجّل</p>
        </div>
        <button
          id="admin-add-student-btn"
          className="admin-btn admin-btn--primary"
          onClick={() => setModalOpen(true)}
        >
          <Plus size={18} />
          إضافة طالب جديد
        </button>
      </div>

      {/* Filters */}
      <div className="admin-filters admin-users-filters">
        <div className="admin-search-wrapper admin-users-search">
          <Search size={16} className="admin-search-icon" />
          <input
            id="admin-student-search"
            type="text"
            className="admin-input admin-search-input"
            placeholder="بحث باسم الطالب، الهاتف، أو المعلم…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="admin-field-group admin-filter-group-gender">
          <label htmlFor="admin-filter-gender" className="admin-label">الجنس</label>
          <select
            id="admin-filter-gender"
            className="admin-input admin-select"
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
          >
            <option value="">الكل</option>
            <option value="male">ذكر</option>
            <option value="female">أنثى</option>
          </select>
        </div>

        <div className="admin-field-group admin-filter-group-teacher">
          <label htmlFor="admin-filter-teacher" className="admin-label">المعلم</label>
          <select
            id="admin-filter-teacher"
            className="admin-input admin-select"
            value={teacherFilter}
            onChange={(e) => setTeacherFilter(e.target.value)}
          >
            <option value="">كل المعلمين</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-field-group admin-filter-group-age">
          <label htmlFor="admin-filter-age-min" className="admin-label">العمر من / إلى</label>
          <div className="admin-age-inputs-row">
            <input
              id="admin-filter-age-min"
              type="number"
              min={3}
              max={120}
              className="admin-input admin-age-input"
              placeholder="من"
              value={ageMinFilter}
              onChange={(e) => setAgeMinFilter(e.target.value)}
            />
            <span style={{ color: 'var(--admin-muted)' }}>-</span>
            <input
              id="admin-filter-age-max"
              type="number"
              min={3}
              max={120}
              className="admin-input admin-age-input"
              placeholder="إلى"
              value={ageMaxFilter}
              onChange={(e) => setAgeMaxFilter(e.target.value)}
            />
          </div>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            className="admin-btn admin-btn--ghost admin-filter-reset-btn"
            onClick={resetFilters}
          >
            مسح الفلاتر
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="admin-loading">
          <div className="admin-spinner-lg" />
          <span>جارٍ التحميل…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">
          <User size={48} />
          <p>لا يوجد طلاب مطابقون للبحث</p>
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table" id="students-table">
            <thead>
              <tr>
                <th>اسم الطالب</th>
                <th>رقم الهاتف</th>
                <th>المعلم المتابع</th>
                <th>الجنس</th>
                <th>الدولة</th>
                <th>العمر</th>
                <th>الدورات</th>
                <th>المسابقات</th>
                <th>تاريخ التسجيل</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => {
                const age = calcAgeInYears(student.birth_date);
                return (
                <tr key={student.id} id={`student-row-${student.id}`}>
                  <td style={{ fontWeight: 600 }}>{student.full_name}</td>
                  <td dir="ltr" style={{ textAlign: 'right' }}>{student.phone}</td>
                  <td>
                    {student.teachers ? (
                      <span className="admin-badge admin-badge--neutral" style={{ color: 'var(--admin-accent)' }}>
                        {student.teachers.name}
                      </span>
                    ) : (
                      <span className="admin-muted">--بدون معلم</span>
                    )}
                  </td>
                  <td>
                    {student.gender ? (
                      <span className={`admin-badge ${student.gender === 'male' ? 'admin-badge--male' : 'admin-badge--female'}`}>
                        {student.gender === 'male' ? 'ذكر' : 'أنثى'}
                      </span>
                    ) : (
                      <span className="admin-muted">--</span>
                    )}
                  </td>
                  <td>
                    {student.country ? (
                      <span className="admin-badge admin-badge--neutral">{getCountryName(student.country)}</span>
                    ) : (
                      <span className="admin-muted">--</span>
                    )}
                  </td>
                  <td>
                    {age !== null ? (
                      <span className="admin-badge admin-badge--neutral">{age} سنة</span>
                    ) : (
                      <span className="admin-muted">--</span>
                    )}
                  </td>
                  <td>
                    <span className="admin-badge admin-badge--neutral">
                      {student.student_course_subscriptions?.[0]?.count ?? 0} دورات
                    </span>
                  </td>
                  <td>
                    <span className="admin-badge admin-badge--neutral">
                      {student.student_competition_subscriptions?.[0]?.count ?? 0} مسابقات
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--admin-muted)' }}>
                    {new Date(student.created_at).toLocaleDateString('ar-EG')}
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button
                        id={`add-lesson-student-${student.id}`}
                        className="admin-icon-btn admin-icon-btn--lesson"
                        onClick={() => setLessonModalStudent(student)}
                        title="إضافة حصة قرآن جديدة للطالب"
                        aria-label={`إضافة حصة قرآن للطالب ${student.full_name}`}
                      >
                        <BookOpen size={15} />
                      </button>
                      <button
                        id={`view-student-${student.id}`}
                        className="admin-icon-btn admin-icon-btn--edit"
                        onClick={() => navigate(`/admin/quran/users/${student.id}`)}
                        title="عرض التفاصيل وإدارة الاشتراكات والدروس"
                        aria-label={`عرض تفاصيل ${student.full_name}`}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        id={`delete-student-${student.id}`}
                        className="admin-icon-btn admin-icon-btn--delete"
                        onClick={() => setDeleteTarget(student)}
                        title="حذف حساب الطالب"
                        aria-label={`حذف حساب ${student.full_name}`}
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

      {/* Add Student Modal */}
      {modalOpen && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="إضافة طالب جديد"
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div className="admin-modal" style={{ maxWidth: '500px' }}>
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">إنشاء حساب طالب جديد</h2>
              <button
                id="admin-modal-close-btn"
                className="admin-modal-close"
                onClick={() => setModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="admin-modal-body" id="create-student-form">
              <div className="admin-field-group">
                <label htmlFor="student-fullname" className="admin-label">الاسم الكامل للطالب *</label>
                <input
                  id="student-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="الاسم الثنائي أو الثلاثي…"
                  className="admin-input"
                />
              </div>

              <div className="admin-field-group">
                <label htmlFor="student-phone" className="admin-label">رقم الهاتف (رقم الدخول) *</label>
                <input
                  id="student-phone"
                  type="tel"
                  required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01xxxxxxxxx أو +201xxxxxxxxx"
                    className="admin-input"
                    dir="ltr"
                  />
              </div>

              <div className="admin-field-group">
                <label htmlFor="student-password" className="admin-label">كلمة المرور *</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    id="student-password"
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="من 6 إلى 10 خانات…"
                    className="admin-input"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    className="admin-btn admin-btn--ghost"
                    onClick={handleGeneratePassword}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    توليد عشوائي
                  </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--admin-muted)', marginTop: '0.2rem' }}>
                  ⚠️ تأكد من حفظ أو كتابة كلمة المرور لإرسالها للطالب.
                </p>
              </div>

              <div className="admin-field-group">
                <label htmlFor="student-teacher" className="admin-label">المعلم المتابع (اختياري)</label>
                <select
                  id="student-teacher"
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="admin-input admin-select"
                >
                  <option value="">--بدون معلم</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.gender === 'male' ? 'معلم' : 'معلمة'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-field-group">
                <label htmlFor="student-gender" className="admin-label">الجنس (اختياري)</label>
                <select
                  id="student-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="admin-input admin-select"
                >
                  <option value="">--غير محدد</option>
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
              </div>

              <div className="admin-field-group">
                <label htmlFor="student-country" className="admin-label">الدولة (اختياري)</label>
                <select
                  id="student-country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="admin-input admin-select"
                >
                  <option value="">--غير محددة</option>
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-field-group">
                <label htmlFor="student-birthdate" className="admin-label">تاريخ الميلاد (اختياري)</label>
                <input
                  id="student-birthdate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="admin-input"
                />
              </div>

              {error && (
                <div className="admin-error-banner" role="alert">
                  ⚠️ {error}
                </div>
              )}

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn--primary"
                  disabled={saving}
                >
                  {saving ? <Loader size={16} className="admin-spin" /> : null}
                  {saving ? 'جارٍ الإنشاء…' : 'إنشاء حساب الطالب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="تأكيد حذف حساب الطالب"
        >
          <div className="admin-confirm-dialog">
            <div className="admin-confirm-icon">🗑️</div>
            <h3 className="admin-confirm-title">تأكيد حذف حساب الطالب</h3>
            <p className="admin-confirm-text">
              هل أنت متأكد من حذف حساب <strong>{deleteTarget.full_name}</strong>؟
              <br />
              سيتم حذف بيانات الدخول والاشتراكات والدروس المرتبطة به نهائياً.
            </p>
            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--danger"
                onClick={handleDeleteStudent}
                disabled={deleting}
              >
                {deleting ? 'جارٍ الحذف…' : 'نعم، احذف الحساب'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Quran Lesson Modal */}
      {lessonModalStudent && (
        <QuranLessonFormModal
          studentId={lessonModalStudent.id}
          studentName={lessonModalStudent.full_name}
          onClose={() => setLessonModalStudent(null)}
          onSaved={() => {
            const studentName = lessonModalStudent.full_name;
            setLessonModalStudent(null);
            alert(`تمت إضافة تقرير الحصة بنجاح للطالب: ${studentName}`);
          }}
        />
      )}
    </div>
  );
}
