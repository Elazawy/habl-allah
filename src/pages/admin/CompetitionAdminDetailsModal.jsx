import { useEffect, useState } from 'react';
import {
  X,
  Loader,
  Users,
  FileText,
  CheckCircle,
  Clock,
  MapPin,
  Calendar,
  Trash2,
  Trophy,
  UserPlus,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import {
  fetchSubscribedStudents,
  fetchRegistrationRequests,
  deleteRegistrationRequest,
  subscribeStudentToCompetition,
} from '../../services/competitionsService';
import {
  adminCreateStudent,
  fetchStudentByPhone,
  generatePassword,
  isValidStudentPhone,
  normalizeStudentPhone,
} from '../../services/studentsService';
import { fetchAllTeachers } from '../../services/adminService';
import { getCountryName } from '../../data/countries';

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

function getGenderLabel(gender) {
  if (gender === 'male') return 'ذكر';
  if (gender === 'female') return 'أنثى';
  return null;
}

export default function CompetitionAdminDetailsModal({ competition, onClose }) {
  const [activeTab, setActiveTab] = useState('subscribers');
  const [subscribers, setSubscribers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [accountModal, setAccountModal] = useState(null);

  const loadDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const [subsData, reqsData] = await Promise.all([
        fetchSubscribedStudents(competition.id),
        fetchRegistrationRequests(competition.id),
      ]);
      setSubscribers(subsData);
      setRequests(reqsData);
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء تحميل بيانات الطلاب والطلبات الخاصة بالمسابقة.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [competition.id]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !accountModal) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [accountModal, onClose]);

  const ensureTeachersLoaded = async () => {
    if (teachers.length > 0 || loadingTeachers) return;

    setLoadingTeachers(true);
    try {
      const data = await fetchAllTeachers();
      setTeachers(data);
    } catch (err) {
      console.error(err);
      setTeachers([]);
    } finally {
      setLoadingTeachers(false);
    }
  };

  const approveRequestForStudent = async ({ request, studentId, successMessage }) => {
    await subscribeStudentToCompetition(studentId, competition.id);
    await deleteRegistrationRequest(request.id);
    await loadDetails();

    if (successMessage) {
      alert(successMessage);
    }
  };

  const handleDeleteRequest = async (requestId) => {
    if (!window.confirm('هل أنت متأكد من حذف طلب المسابقة هذا؟')) return;

    setProcessingId(requestId);
    try {
      await deleteRegistrationRequest(requestId);
      setRequests((prev) => prev.filter((request) => request.id !== requestId));
    } catch (err) {
      console.error(err);
      alert(`فشل حذف الطلب: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveLinkedStudent = async (request) => {
    if (!request.student_id) return;
    if (!window.confirm(`هل تريد اعتماد ${request.student_name} في هذه المسابقة؟`)) return;

    setProcessingId(request.id);
    try {
      await approveRequestForStudent({
        request,
        studentId: request.student_id,
        successMessage: 'تم اعتماد الطالب ونقله إلى قائمة المشتركين المعتمدين.',
      });
    } catch (err) {
      console.error(err);
      alert(`فشل اعتماد الطالب: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handlePrepareGuestApproval = async (request) => {
    setProcessingId(request.id);
    try {
      const existingStudent = await fetchStudentByPhone(request.student_phone);

      if (existingStudent) {
        const confirmed = window.confirm(
          `تم العثور على حساب طالب موجود بهذا الرقم (${existingStudent.full_name}). هل تريد اشتراك هذا الحساب في المسابقة وحذف الطلب المعلق؟`
        );

        if (!confirmed) {
          return;
        }

        await approveRequestForStudent({
          request,
          studentId: existingStudent.id,
          successMessage: 'تم اشتراك الحساب الموجود وحذف الطلب المعلق بنجاح.',
        });
        return;
      }

      await ensureTeachersLoaded();
      setAccountModal({
        request,
        fullName: request.student_name ?? '',
        phone: normalizeStudentPhone(request.student_phone),
        password: generatePassword(9),
        teacherId: '',
        gender: request.gender ?? '',
        country: request.country ?? '',
        birthDate: request.birth_date ?? '',
        error: '',
        saving: false,
      });
    } catch (err) {
      console.error(err);
      alert(`تعذر تجهيز عملية إنشاء الحساب: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleAccountField = (field, value) => {
    setAccountModal((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: value,
        error: '',
      };
    });
  };

  const setAccountModalError = (message) => {
    setAccountModal((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        error: message,
      };
    });
  };

  const closeAccountModal = () => {
    setAccountModal(null);
  };

  const handleCreateAccountAndApprove = async (event) => {
    event.preventDefault();
    if (!accountModal?.request) return;

    const trimmedName = accountModal.fullName.trim();
    const normalizedPhone = normalizeStudentPhone(accountModal.phone);

    if (trimmedName.length < 2) {
      setAccountModalError('الاسم الكامل يجب أن يحتوي على حرفين على الأقل.');
      return;
    }

    if (!isValidStudentPhone(accountModal.phone)) {
      setAccountModalError('رقم الهاتف يجب أن يتكوّن من 10 إلى 15 رقماً.');
      return;
    }

    if (accountModal.password.length < 6 || accountModal.password.length > 10) {
      setAccountModalError('كلمة المرور يجب أن تكون بين 6 و10 خانات.');
      return;
    }

    setAccountModal((prev) => ({ ...prev, saving: true, error: '' }));

    let createdPassword = null;

    try {
      let targetStudent = await fetchStudentByPhone(normalizedPhone);

      if (!targetStudent) {
        try {
          const createdUser = await adminCreateStudent({
            fullName: trimmedName,
            phone: normalizedPhone,
            password: accountModal.password,
            teacherId: accountModal.teacherId || null,
            gender: accountModal.gender || null,
            country: accountModal.country || null,
            birthDate: accountModal.birthDate || null,
          });

          targetStudent = {
            id: createdUser.id,
            full_name: trimmedName,
            phone: normalizedPhone,
          };
          createdPassword = accountModal.password;
        } catch (createError) {
          if (
            createError.message?.includes('already exists') ||
            createError.message?.includes('already registered') ||
            createError.message?.includes('مسجل بالفعل')
          ) {
            targetStudent = await fetchStudentByPhone(normalizedPhone);
          }

          if (!targetStudent) {
            throw createError;
          }
        }
      }

      await approveRequestForStudent({
        request: accountModal.request,
        studentId: targetStudent.id,
        successMessage: createdPassword
          ? `تم إنشاء حساب الطالب والاشتراك في المسابقة بنجاح. كلمة المرور: ${createdPassword}`
          : 'تم اشتراك الحساب الموجود في المسابقة بنجاح.',
      });

      closeAccountModal();
    } catch (err) {
      console.error(err);
      setAccountModal((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          saving: false,
          error: createdPassword
            ? `تم إنشاء الحساب، لكن تعذر إكمال اعتماد الاشتراك في المسابقة: ${err.message}`
            : (err.message ?? 'حدث خطأ أثناء إنشاء الحساب.'),
        };
      });
      return;
    }

    setAccountModal((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        saving: false,
      };
    });
  };

  function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('ar-EG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <>
      <div
        onClick={(event) => event.target === event.currentTarget && onClose()}
        className="admin-modal-backdrop"
        role="dialog"
        aria-modal="true"
      >
        <div className="admin-modal admin-modal--wide" style={{ maxWidth: '900px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
          <div className="admin-modal-header" style={{ flexShrink: 0 }}>
            <div>
              <h2 className="admin-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trophy size={20} className="text-amber-500" />
                <span>طلبات المسابقة والطلاب المشتركون</span>
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginTop: '0.25rem' }}>
                {competition.name} ({competition.slug})
              </p>
            </div>
            <button
              onClick={onClose}
              className="admin-modal-close"
              aria-label="إغلاق"
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', background: 'var(--admin-bg-light)', borderBottom: '1px solid var(--admin-border)', flexShrink: 0 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--admin-text)' }}>المستويات المتاحة: </span>
              {Array.isArray(competition.available_levels) && competition.available_levels.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
                  {competition.available_levels.map((level, index) => (
                    <span
                      key={index}
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '6px',
                        background: 'var(--admin-bg-card)',
                        border: '1px solid var(--admin-border)',
                        color: 'var(--admin-gold)',
                      }}
                    >
                      {level}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="admin-muted" style={{ fontSize: '0.8rem' }}>إدخال حر للمستوى</span>
              )}
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-bg)', flexShrink: 0 }}>
              <button
                onClick={() => setActiveTab('subscribers')}
                style={{
                  flex: 1,
                  padding: '1rem',
                  border: 'none',
                  background: activeTab === 'subscribers' ? 'var(--admin-bg-light)' : 'transparent',
                  borderBottom: activeTab === 'subscribers' ? '2px solid var(--admin-accent)' : 'none',
                  color: activeTab === 'subscribers' ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <Users size={16} />
                <span>المشتركون المعتمدون ({subscribers.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('requests')}
                style={{
                  flex: 1,
                  padding: '1rem',
                  border: 'none',
                  background: activeTab === 'requests' ? 'var(--admin-bg-light)' : 'transparent',
                  borderBottom: activeTab === 'requests' ? '2px solid var(--admin-accent)' : 'none',
                  color: activeTab === 'requests' ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <FileText size={16} />
                <span>الطلبات المعلقة ({requests.length})</span>
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}>
                  <Loader size={32} className="admin-spin mb-3" style={{ color: 'var(--admin-accent)' }} />
                  <span className="admin-muted" style={{ fontSize: '0.9rem' }}>جاري تحميل بيانات المسابقة...</span>
                </div>
              ) : error ? (
                <div className="admin-error-banner">{error}</div>
              ) : activeTab === 'subscribers' ? (
                subscribers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--admin-text-muted)' }}>
                    <Users size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                    <p>لا يوجد طلاب مشتركون معتمدون في هذه المسابقة حتى الآن.</p>
                  </div>
                ) : (
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>الاسم</th>
                          <th>رقم الهاتف</th>
                          <th>تاريخ الاشتراك</th>
                          <th>الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subscribers.map((subscriber) => (
                          <tr key={subscriber.id}>
                            <td>
                              <strong>{subscriber.student_profiles?.full_name || 'طالب غير معروف'}</strong>
                            </td>
                            <td dir="ltr" style={{ textAlign: 'right' }}>
                              {subscriber.student_profiles?.phone || '—'}
                            </td>
                            <td>
                              <span style={{ fontSize: '0.8rem' }}>{formatDateTime(subscriber.subscribed_at)}</span>
                            </td>
                            <td>
                              <span className="admin-badge admin-badge--published" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <CheckCircle size={10} /> نشط
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : requests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--admin-text-muted)' }}>
                  <FileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  <p>لا توجد طلبات معلقة لهذه المسابقة.</p>
                </div>
              ) : (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>مقدم الطلب</th>
                        <th>الدولة / الجنس / العمر</th>
                        <th>المستوى</th>
                        <th>تاريخ التقديم</th>
                        <th>الحساب</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((request) => {
                      const isLinkedStudent = Boolean(request.student_id);
                      const isBusy = processingId === request.id;
                      const requestAge = calcAgeInYears(request.birth_date);
                      const requestGender = getGenderLabel(request.gender);

                      return (
                          <tr key={request.id}>
                            <td>
                              <div>
                                <strong style={{ display: 'block' }}>{request.student_name}</strong>
                                <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }} dir="ltr">
                                  {request.student_phone}
                                </span>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', fontSize: '0.8rem' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <MapPin size={11} className="text-amber-500" /> {getCountryName(request.country)}
                                </span>
                                {requestGender && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Users size={11} className="text-amber-500" /> {requestGender}
                                  </span>
                                )}
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <Calendar size={11} className="text-amber-500" />{' '}
                                  {requestAge !== null ? `${requestAge} سنة` : '—'}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{request.level}</span>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Clock size={11} /> {formatDateTime(request.created_at)}
                              </span>
                            </td>
                            <td>
                              {isLinkedStudent ? (
                                <span className="admin-badge admin-badge--published" style={{ fontSize: '0.7rem' }}>
                                  طالب مسجّل
                                </span>
                              ) : (
                                <span className="admin-badge admin-badge--draft" style={{ fontSize: '0.7rem' }}>
                                  طلب زائر
                                </span>
                              )}
                            </td>
                            <td>
                              <div className="admin-row-actions" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
                                {isLinkedStudent ? (
                                  <button
                                    className="admin-btn admin-btn--primary admin-btn--sm"
                                    onClick={() => handleApproveLinkedStudent(request)}
                                    disabled={processingId !== null}
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                                    title="اعتماد الطلب ونقله إلى المشتركين المعتمدين"
                                  >
                                    {isBusy ? <Loader size={12} className="admin-spin" /> : null}
                                    اعتماد
                                  </button>
                                ) : (
                                  <button
                                    className="admin-btn admin-btn--primary admin-btn--sm"
                                    onClick={() => handlePrepareGuestApproval(request)}
                                    disabled={processingId !== null}
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                                    title="إنشاء حساب طالب ثم اعتماد الاشتراك"
                                  >
                                    {isBusy ? <Loader size={12} className="admin-spin" /> : <UserPlus size={12} />}
                                    إنشاء حساب + اعتماد
                                  </button>
                                )}
                                <button
                                  className="admin-icon-btn admin-icon-btn--delete"
                                  onClick={() => handleDeleteRequest(request.id)}
                                  disabled={processingId !== null}
                                  title="حذف الطلب"
                                  aria-label="حذف"
                                >
                                  <Trash2 size={14} />
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
            </div>
          </div>

          <div className="admin-modal-footer" style={{ borderTop: '1px solid var(--admin-border)', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'flex-end', flexShrink: 0, background: 'var(--admin-bg-light)' }}>
            <button
              onClick={onClose}
              className="admin-btn admin-btn--ghost"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>

      {accountModal && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="إنشاء حساب طالب"
          onClick={(event) => {
            if (event.target === event.currentTarget && !accountModal.saving) {
              closeAccountModal();
            }
          }}
        >
          <div className="admin-modal" style={{ maxWidth: '560px' }}>
            <div className="admin-modal-header">
              <div>
                <h2 className="admin-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UserPlus size={18} />
                  <span>إنشاء حساب طالب واعتماد الطلب</span>
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginTop: '0.25rem' }}>
                  سيتم إنشاء الحساب أولاً، ثم اشتراكه تلقائياً في هذه المسابقة.
                </p>
              </div>
              <button
                className="admin-modal-close"
                onClick={closeAccountModal}
                disabled={accountModal.saving}
                aria-label="إغلاق"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAccountAndApprove} className="admin-modal-body" style={{ display: 'grid', gap: '1rem' }}>
              <div className="admin-card" style={{ padding: '1rem', border: '1px solid var(--admin-border)', borderRadius: 'var(--admin-radius)', background: 'var(--admin-bg-light)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--admin-text)', marginBottom: '0.35rem' }}>
                  ملخص الطلب المعلق
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', lineHeight: 1.8 }}>
                  <div><strong>الاسم:</strong> {accountModal.request.student_name}</div>
                  <div><strong>رقم الهاتف:</strong> <span dir="ltr">{accountModal.request.student_phone}</span></div>
                  <div><strong>الدولة:</strong> {accountModal.request.country}</div>
                  <div><strong>العمر:</strong> {accountModal.request.age}</div>
                  <div><strong>المستوى:</strong> {accountModal.request.level}</div>
                </div>
              </div>

              <div className="admin-field-group">
                <label htmlFor="competition-student-fullname" className="admin-label">الاسم الكامل *</label>
                <input
                  id="competition-student-fullname"
                  type="text"
                  required
                  className="admin-input"
                  value={accountModal.fullName}
                  onChange={(event) => handleAccountField('fullName', event.target.value)}
                  disabled={accountModal.saving}
                />
              </div>

              <div className="admin-field-group">
                <label htmlFor="competition-student-phone" className="admin-label">رقم الهاتف *</label>
                <input
                  id="competition-student-phone"
                  type="tel"
                  required
                  className="admin-input"
                  dir="ltr"
                  value={accountModal.phone}
                  onChange={(event) => handleAccountField('phone', event.target.value)}
                  disabled={accountModal.saving}
                />
              </div>

              <div className="admin-field-group">
                <label htmlFor="competition-student-password" className="admin-label">كلمة المرور *</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    id="competition-student-password"
                    type="text"
                    required
                    className="admin-input"
                    dir="ltr"
                    value={accountModal.password}
                    onChange={(event) => handleAccountField('password', event.target.value)}
                    disabled={accountModal.saving}
                  />
                  <button
                    type="button"
                    className="admin-btn admin-btn--ghost"
                    onClick={() => handleAccountField('password', generatePassword(9))}
                    disabled={accountModal.saving}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    <RefreshCw size={14} />
                    توليد جديد
                  </button>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--admin-muted)', marginTop: '0.2rem' }}>
                  سلّم كلمة المرور هذه للطالب بعد الاعتماد.
                </p>
              </div>

              <div className="admin-field-group">
                <label htmlFor="competition-student-teacher" className="admin-label">المعلم المتابع (اختياري)</label>
                <select
                  id="competition-student-teacher"
                  className="admin-input admin-select"
                  value={accountModal.teacherId}
                  onChange={(event) => handleAccountField('teacherId', event.target.value)}
                  disabled={accountModal.saving || loadingTeachers}
                >
                  <option value="">--بدون معلم</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name} ({teacher.gender === 'male' ? 'معلم' : 'معلمة'})
                    </option>
                  ))}
                </select>
                {loadingTeachers && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--admin-muted)' }}>جاري تحميل المعلمين...</p>
                )}
              </div>

              {accountModal.error && (
                <div className="admin-error-banner" role="alert" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <KeyRound size={14} />
                  <span>{accountModal.error}</span>
                </div>
              )}

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={closeAccountModal}
                  disabled={accountModal.saving}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn--primary"
                  disabled={accountModal.saving}
                >
                  {accountModal.saving ? <Loader size={16} className="admin-spin" /> : <UserPlus size={16} />}
                  {accountModal.saving ? 'جارٍ إنشاء الحساب واعتماد الطلب...' : 'إنشاء حساب + اعتماد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
