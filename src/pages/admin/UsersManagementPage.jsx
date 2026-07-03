import { useEffect, useState } from 'react';
import { fetchAllStudents, adminCreateStudent, generatePassword } from '../../services/studentsService';
import { fetchAllTeachers } from '../../services/adminService';
import { Plus, Search, User, Loader, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function UsersManagementPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [teachers, setTeachers] = useState([]);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
    if (!term) return true;
    return (
      s.full_name.toLowerCase().includes(term) ||
      s.phone.includes(term) ||
      (s.teachers?.name || '').toLowerCase().includes(term)
    );
  });

  const handleGeneratePassword = () => {
    const pw = generatePassword(9);
    setPassword(pw);
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setError('');

    if (fullName.trim().length < 2) {
      setError('الاسم الكامل يجب أن يكون ثنائياً على الأقل.');
      return;
    }

    if (!/^\d{10,15}$/.test(phone.trim())) {
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
        phone: phone.trim(),
        password,
        teacherId: teacherId || null,
      });

      // Reload students list
      const data = await fetchAllStudents();
      setStudents(data);
      
      // Reset form and close
      setFullName('');
      setPhone('');
      setPassword('');
      setTeacherId('');
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
      <div className="admin-filters">
        <div className="admin-search-wrapper" style={{ maxWidth: '400px' }}>
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
                <th>الدورات</th>
                <th>المسابقات</th>
                <th>تاريخ التسجيل</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => (
                <tr key={student.id} id={`student-row-${student.id}`}>
                  <td style={{ fontWeight: 600 }}>{student.full_name}</td>
                  <td dir="ltr" style={{ textAlign: 'right' }}>{student.phone}</td>
                  <td>
                    {student.teachers ? (
                      <span className="admin-badge admin-badge--neutral" style={{ color: 'var(--admin-accent)' }}>
                        {student.teachers.name}
                      </span>
                    ) : (
                      <span className="admin-muted">لا يوجد معلم</span>
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
                    <button
                      id={`view-student-${student.id}`}
                      className="admin-icon-btn admin-icon-btn--edit"
                      onClick={() => navigate(`/admin/quran/users/${student.id}`)}
                      title="عرض التفاصيل وإدارة الاشتراكات والدروس"
                      aria-label={`عرض تفاصيل ${student.full_name}`}
                    >
                      <ChevronLeft size={16} />
                    </button>
                  </td>
                </tr>
              ))}
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
                  placeholder="01xxxxxxxxx"
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
                  <option value="">— بدون معلم حالياً —</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.gender === 'male' ? 'معلم' : 'معلمة'})
                    </option>
                  ))}
                </select>
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
    </div>
  );
}
