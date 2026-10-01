import { useEffect, useState } from 'react';
import {
  X,
  Loader,
  Users,
  FileText,
  CheckCircle,
  Clock,
  Trash2,
  Trophy,
  UserCheck,
} from 'lucide-react';
import {
  fetchSubscribedStudents,
  fetchRegistrationRequests,
  deleteRegistrationRequest,
  subscribeStudentToCompetition,
  fetchPendingGuestParticipants,
  fetchCompetitionStages,
  acceptGuestParticipant,
  rejectGuestParticipant,
  deleteGuestParticipant,
} from '../../services/competitionsService';

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
  const [guestParticipants, setGuestParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const loadDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const [subsData, reqsData, guestsData] = await Promise.all([
        fetchSubscribedStudents(competition.id),
        fetchRegistrationRequests(competition.id),
        fetchPendingGuestParticipants(competition.id),
      ]);
      setSubscribers(subsData);
      setRequests(reqsData);
      setGuestParticipants(guestsData);
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء تحميل بيانات الطلاب والطلبات الخاصة بالمسابقة.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competition.id]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
      // Stages, when they exist, are managed from the main competition
      // students page; this modal stays minimal.
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

  // ── Guest participants: direct accept / reject, no account creation. ──
  const handleApproveGuest = async (guest) => {
    if (!window.confirm(`هل تريد اعتماد ${guest.student_name} في هذه المسابقة؟`)) return;

    setProcessingId(guest.id);
    try {
      // If stages exist, activate into the first stage; otherwise plain accepted.
      let firstStageId = null;
      try {
        const stages = await fetchCompetitionStages(competition.id);
        firstStageId = stages.length > 0 ? stages[0].id : null;
      } catch (stageErr) {
        console.error('Failed to load stages for guest acceptance', stageErr);
      }

      await acceptGuestParticipant(guest.id, { firstStageId });
      await loadDetails();
      alert(
        firstStageId
          ? 'تم اعتماد طلب الزائر ونقله إلى المرحلة الأولى.'
          : 'تم اعتماد طلب الزائر بنجاح.'
      );
    } catch (err) {
      console.error(err);
      alert(`فشل اعتماد طلب الزائر: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectGuest = async (guest) => {
    if (!window.confirm(`هل أنت متأكد من رفض طلب ${guest.student_name}؟`)) return;

    setProcessingId(guest.id);
    try {
      await rejectGuestParticipant(guest.id);
      await loadDetails();
    } catch (err) {
      console.error(err);
      alert(`فشل رفض الطلب: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteGuest = async (guest) => {
    if (!window.confirm('هل أنت متأكد من حذف طلب الزائر نهائياً؟')) return;

    setProcessingId(guest.id);
    try {
      await deleteGuestParticipant(guest.id);
      setGuestParticipants((prev) => prev.filter((g) => g.id !== guest.id));
    } catch (err) {
      console.error(err);
      alert(`فشل حذف الطلب: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
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

  const totalRequests = requests.length + guestParticipants.length;

  return (
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
              <span>الطلبات المعلقة ({totalRequests})</span>
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
            ) : totalRequests === 0 ? (
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
                      <th>بيانات إضافية</th>
                      <th>المستوى</th>
                      <th>تاريخ التقديم</th>
                      <th>النوع</th>
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
                        <tr key={`student-${request.id}`}>
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
                              {requestGender && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <Users size={11} className="text-amber-500" /> {requestGender}
                                </span>
                              )}
                              {requestAge !== null && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <Clock size={11} /> {requestAge} سنة
                                </span>
                              )}
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
                                <UserCheck size={10} /> طالب مسجّل
                              </span>
                            ) : (
                              <span className="admin-badge admin-badge--draft" style={{ fontSize: '0.7rem' }}>
                                طلب زائر
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="admin-row-actions" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
                              {isLinkedStudent && (
                                <button
                                  className="admin-btn admin-btn--primary admin-btn--sm"
                                  onClick={() => handleApproveLinkedStudent(request)}
                                  disabled={processingId !== null}
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                                  title="اعتماد الطلب ونقله إلى المشتركين المعتمدين"
                                >
                                  {isBusy ? <Loader size={12} className="admin-spin" /> : <CheckCircle size={12} />}
                                  اعتماد
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
                    {guestParticipants.map((guest) => {
                      const isBusy = processingId === guest.id;

                      return (
                        <tr key={`guest-${guest.id}`}>
                          <td>
                            <div>
                              <strong style={{ display: 'block' }}>{guest.student_name}</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }} dir="ltr">
                                {guest.student_phone}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="admin-muted" style={{ fontSize: '0.8rem' }}>—</span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{guest.level}</span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Clock size={11} /> {formatDateTime(guest.created_at)}
                            </span>
                          </td>
                          <td>
                            <span className="admin-badge admin-badge--draft" style={{ fontSize: '0.7rem' }}>
                              طلب زائر
                            </span>
                          </td>
                          <td>
                            <div className="admin-row-actions" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
                              <button
                                className="admin-btn admin-btn--primary admin-btn--sm"
                                onClick={() => handleApproveGuest(guest)}
                                disabled={processingId !== null}
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                                title="اعتماد طلب الزائر (بدون إنشاء حساب)"
                              >
                                {isBusy ? <Loader size={12} className="admin-spin" /> : <CheckCircle size={12} />}
                                اعتماد
                              </button>
                              <button
                                className="admin-btn admin-btn--sm"
                                onClick={() => handleRejectGuest(guest)}
                                disabled={processingId !== null}
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', background: 'var(--admin-bg-light)', color: '#dc2626', border: '1px solid #fecaca' }}
                                title="رفض الطلب"
                              >
                                <X size={12} />
                                رفض
                              </button>
                              <button
                                className="admin-icon-btn admin-icon-btn--delete"
                                onClick={() => handleDeleteGuest(guest)}
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

        <div className="admin-modal-footer" style={{ borderTop: '1px solid var(--admin-border)', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: 'var(--admin-bg-light)' }}>
          <span className="admin-muted" style={{ fontSize: '0.75rem' }}>
            لإدارة مراحل المشاركين ونقلهم بين المراحل، استخدم صفحة الطلاب الخاصة بالمسابقة.
          </span>
          <button
            onClick={onClose}
            className="admin-btn admin-btn--ghost"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
