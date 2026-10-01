import { useState, useEffect } from 'react';
import { X, Loader, CheckCircle, AlertCircle, User, Phone, Trophy, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  submitCompetitionRegistrationRequest,
  submitGuestCompetitionParticipant,
  recoverGuestCompetitionParticipant,
} from '../../services/competitionsService';
import { saveGuestCompetitionToken } from '../../services/guestCompetitionToken';

function normalizeLocalizedDigits(value) {
  return String(value ?? '').replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (digit) => {
    const code = digit.charCodeAt(0);

    if (code >= 0x0660 && code <= 0x0669) {
      return String(code - 0x0660);
    }

    if (code >= 0x06f0 && code <= 0x06f9) {
      return String(code - 0x06f0);
    }

    return digit;
  });
}

function normalizePhoneDigits(value) {
  return normalizeLocalizedDigits(value).replace(/\D/g, '');
}

// initialMode: 'apply' shows the application form, 'recover' opens the
// phone-only recovery panel directly (used by the page-level مسجل بالفعل entry
// point, which must stay reachable even after the deadline passes).
export default function CompetitionRegistrationModal({ competition, onClose, onSubmitted, initialMode = 'apply' }) {
  const { user, isStudent, studentProfile } = useAuth();

  // States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedLevelOption, setSelectedLevelOption] = useState('');
  const [customLevel, setCustomLevel] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  // Recovery ("مسجل بالفعل") panel
  const [recoveryOpen, setRecoveryOpen] = useState(initialMode === 'recover');
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryNotFound, setRecoveryNotFound] = useState(false);

  const isClosed = new Date(competition.registration_deadline + 'T23:59:59') < new Date();
  const availableLevels = Array.isArray(competition.available_levels)
    ? competition.available_levels.filter(lvl => typeof lvl === 'string' && lvl.trim() !== '')
    : [];
  const isStudentRequester = Boolean(user && isStudent && studentProfile?.id === user.id);

  // Initialize and default state
  useEffect(() => {
    const nextAvailableLevels = Array.isArray(competition.available_levels)
      ? competition.available_levels.filter((lvl) => typeof lvl === 'string' && lvl.trim() !== '')
      : [];

    if (nextAvailableLevels.length > 0) {
      setSelectedLevelOption(nextAvailableLevels[0]);
    } else {
      setSelectedLevelOption('custom');
    }
  }, [competition]);

  // Prefill name/phone from the signed-in student profile when available.
  useEffect(() => {
    if (isStudentRequester) {
      setName((prev) => (prev ? prev : studentProfile?.full_name || ''));
      setPhone((prev) => (prev ? prev : studentProfile?.phone || ''));
    }
  }, [isStudentRequester, studentProfile?.full_name, studentProfile?.phone]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const validate = () => {
    if (name.trim().length < 2) {
      setError('الاسم يجب أن يتكون من حرفين على الأقل.');
      return false;
    }

    const digitsPhone = normalizePhoneDigits(phone);
    if (digitsPhone.length < 10 || digitsPhone.length > 15) {
      setError('رقم الهاتف يجب أن يتكون من 10 إلى 15 رقماً.');
      return false;
    }

    const finalLevel = selectedLevelOption === 'custom' ? customLevel.trim() : selectedLevelOption.trim();
    if (!finalLevel) {
      setError('يرجى تحديد أو كتابة المستوى المطلوب.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isClosed) return;
    setError('');

    if (!validate()) return;

    setLoading(true);
    try {
      const finalLevel = selectedLevelOption === 'custom' ? customLevel.trim() : selectedLevelOption.trim();

      if (isStudent && studentProfile && !isStudentRequester) {
        throw new Error('تعذر التحقق من حساب الطالب الحالي. يرجى تسجيل الدخول مرة أخرى ثم إعادة المحاولة.');
      }

      const trimmedName = name.trim();
      const normalizedPhone = normalizePhoneDigits(phone);

      if (isStudentRequester) {
        // Signed-in students keep using the registration requests table,
        // now with the simplified name/phone/level payload.
        await submitCompetitionRegistrationRequest({
          competition_id: competition.id,
          student_id: studentProfile.id,
          student_name: trimmedName,
          student_phone: normalizedPhone,
          level: finalLevel,
        });
      } else {
        // Guests go through the anonymous RPC. Duplicate applications return
        // the existing row instead of creating a new pending request.
        const participant = await submitGuestCompetitionParticipant({
          competitionId: competition.id,
          studentName: trimmedName,
          studentPhone: normalizedPhone,
          level: finalLevel,
        });

        if (participant?.public_access_token) {
          saveGuestCompetitionToken(competition.id, participant.public_access_token, participant.student_phone);
        }
      }

      try {
        onSubmitted?.({ student_name: trimmedName, student_phone: normalizedPhone, level: finalLevel });
      } catch (callbackError) {
        console.error('[competition registration submitted callback failed]', callbackError);
      }

      setSuccessMessage(
        isStudentRequester
          ? 'تم إرسال طلب الاشتراك بنجاح، وسيتم التواصل معك قريباً.'
          : 'تم إرسال طلب الاشتراك بنجاح وهو بانتظار مراجعة الإدارة. احفظ رقم هاتفك لاستعادة حالة اشتراكك على أي جهاز.'
      );
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء إرسال طلب الاشتراك. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async (e) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoveryNotFound(false);

    const digitsPhone = normalizePhoneDigits(recoveryPhone);
    if (digitsPhone.length < 10 || digitsPhone.length > 15) {
      setRecoveryError('رقم الهاتف يجب أن يتكون من 10 إلى 15 رقماً.');
      return;
    }

    setRecoveryLoading(true);
    try {
      const participant = await recoverGuestCompetitionParticipant({
        competitionId: competition.id,
        studentPhone: digitsPhone,
      });

      if (!participant) {
        setRecoveryNotFound(true);
        return;
      }

      saveGuestCompetitionToken(competition.id, participant.public_access_token, participant.student_phone);

      try {
        onSubmitted?.(participant);
      } catch (callbackError) {
        console.error('[competition registration recovered callback failed]', callbackError);
      }

      onClose();
    } catch (err) {
      console.error(err);
      setRecoveryError(err.message || 'حدث خطأ أثناء استعادة حالة الاشتراك. يرجى المحاولة مرة أخرى.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const inputStyle = {
    backgroundColor: 'var(--t-bg-page)',
    borderColor: 'var(--t-border)',
    color: 'var(--t-text)',
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg rounded-3xl border overflow-hidden relative transition-all duration-300 animate-in fade-in zoom-in-95 duration-200"
        style={{
          backgroundColor: 'var(--t-bg-card)',
          borderColor: 'var(--t-border-gold)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
          color: 'var(--t-text)',
        }}
      >
        {/* Header */}
        <div
          className="p-6 border-b flex items-center justify-between relative"
          style={{ borderColor: 'var(--t-border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: 'var(--t-primary)' }}
            >
              <Trophy size={20} />
            </div>
            <div>
              <h3 className="font-black text-lg" style={{ color: 'var(--t-primary)' }}>
                طلب الاشتراك في المسابقة
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--t-text-muted)' }}>
                {competition.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
            style={{ color: 'var(--t-text-muted)' }}
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 md:p-8 max-h-[75vh] overflow-y-auto">
          {success ? (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle size={36} />
              </div>
              <h4 className="text-xl font-black" style={{ color: 'var(--t-primary)' }}>
                تم إرسال الطلب بنجاح!
              </h4>
              <p className="text-sm leading-relaxed max-w-sm mx-auto" style={{ color: 'var(--t-text-muted)' }}>
                {successMessage}
              </p>
              <button
                onClick={onClose}
                className="mt-6 py-3 px-8 rounded-xl font-bold text-white text-xs transition-all duration-300 hover:opacity-95"
                style={{ backgroundColor: 'var(--t-secondary)' }}
              >
                حسناً
              </button>
            </div>
          ) : recoveryOpen ? (
            <form onSubmit={handleRecover} className="space-y-5">
              <div className="text-center space-y-2">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
                  style={{ backgroundColor: 'var(--t-primary-light)', color: 'var(--t-primary)' }}
                >
                  <KeyRound size={26} />
                </div>
                <h4 className="text-lg font-black" style={{ color: 'var(--t-primary)' }}>
                  استعادة حالة الاشتراك
                </h4>
                <p className="text-xs leading-relaxed max-w-sm mx-auto" style={{ color: 'var(--t-text-muted)' }}>
                  أدخل رقم الهاتف الذي استخدمته في طلب الاشتراك.
                </p>
              </div>

              {recoveryError && (
                <div
                  className="p-4 rounded-2xl flex items-start gap-3 text-sm"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: 'rgb(239, 68, 68)',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                  }}
                  role="alert"
                >
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <div>{recoveryError}</div>
                </div>
              )}

              {recoveryNotFound && (
                <div
                  className="p-4 rounded-2xl flex items-start gap-3 text-sm"
                  style={{
                    backgroundColor: '#fffbeb',
                    color: '#92400e',
                    border: '1px solid #fde68a'
                  }}
                  role="alert"
                >
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <div>لم نجد طلب اشتراك بهذا الرقم لهذه المسابقة.</div>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="recovery_phone" className="text-xs font-black flex items-center gap-1.5" style={{ color: 'var(--t-primary)' }}>
                  <Phone size={14} className="text-amber-500" />
                  رقم الهاتف *
                </label>
                <input
                  id="recovery_phone"
                  type="tel"
                  required
                  disabled={recoveryLoading}
                  value={recoveryPhone}
                  onChange={(e) => setRecoveryPhone(e.target.value)}
                  placeholder="مثال: 201012345678"
                  dir="ltr"
                  className="w-full px-4 py-3 rounded-xl border text-sm text-right transition-all focus:outline-none focus:ring-1"
                  style={inputStyle}
                />
              </div>

              <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryOpen(false);
                    setRecoveryError('');
                    setRecoveryNotFound(false);
                  }}
                  disabled={recoveryLoading}
                  className="py-3 px-6 rounded-xl font-bold text-xs border transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800"
                  style={{ borderColor: 'var(--t-border)', color: 'var(--t-text)' }}
                >
                  رجوع لطلب جديد
                </button>
                <button
                  type="submit"
                  disabled={recoveryLoading}
                  className="py-3 px-8 rounded-xl font-bold text-white text-xs transition-all duration-300 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ backgroundColor: 'var(--t-secondary)' }}
                >
                  {recoveryLoading && <Loader size={14} className="animate-spin" />}
                  <span>{recoveryLoading ? 'جارٍ البحث...' : 'استعادة'}</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {isClosed && (
                <div
                  className="p-4 rounded-2xl flex items-start gap-3 text-sm"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: 'rgb(239, 68, 68)',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                  }}
                >
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">التسجيل مغلق:</span> انتهت فترة التسجيل لهذه المسابقة.
                  </div>
                </div>
              )}

              {error && (
                <div
                  className="p-4 rounded-2xl flex items-start gap-3 text-sm"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: 'rgb(239, 68, 68)',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                  }}
                  role="alert"
                >
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <label htmlFor="student_name" className="text-xs font-black flex items-center gap-1.5" style={{ color: 'var(--t-primary)' }}>
                  <User size={14} className="text-amber-500" />
                  الاسم الكامل *
                </label>
                <input
                  id="student_name"
                  type="text"
                  required
                  disabled={loading || isClosed}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="اكتب اسمك الكامل هنا..."
                  className="w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1"
                  style={inputStyle}
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label htmlFor="student_phone" className="text-xs font-black flex items-center gap-1.5" style={{ color: 'var(--t-primary)' }}>
                  <Phone size={14} className="text-amber-500" />
                  رقم الهاتف (مع رمز الدولة) *
                </label>
                <input
                  id="student_phone"
                  type="tel"
                  required
                  disabled={loading || isClosed}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="مثال: 201012345678"
                  dir="ltr"
                  className="w-full px-4 py-3 rounded-xl border text-sm text-right transition-all focus:outline-none focus:ring-1"
                  style={inputStyle}
                />
              </div>

              {/* Level Select */}
              <div className="space-y-1.5">
                <label htmlFor="level" className="text-xs font-black flex items-center gap-1.5" style={{ color: 'var(--t-primary)' }}>
                  <Trophy size={14} className="text-amber-500" />
                  المستوى المراد الاشتراك فيه *
                </label>

                {availableLevels.length > 0 ? (
                  <div className="space-y-3">
                    <select
                      id="level-select"
                      disabled={loading || isClosed}
                      value={selectedLevelOption}
                      onChange={(e) => setSelectedLevelOption(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1"
                      style={inputStyle}
                    >
                      {availableLevels.map((level, idx) => (
                        <option key={idx} value={level}>
                          {level}
                        </option>
                      ))}
                      <option value="custom">مستواي غير موجود (كتابة يدوية)</option>
                    </select>

                    {selectedLevelOption === 'custom' && (
                      <input
                        id="level-custom"
                        type="text"
                        required
                        disabled={loading || isClosed}
                        value={customLevel}
                        onChange={(e) => setCustomLevel(e.target.value)}
                        placeholder="اكتب مستواك هنا بالتفصيل..."
                        className="w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1 animate-in fade-in slide-in-from-top-2 duration-200"
                        style={inputStyle}
                      />
                    )}
                  </div>
                ) : (
                  <input
                    id="level"
                    type="text"
                    required
                    disabled={loading || isClosed}
                    value={customLevel}
                    onChange={(e) => setCustomLevel(e.target.value)}
                    placeholder="مثال: جزء عم، ثلاثة أجزاء، القرآن كاملاً..."
                    className="w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1"
                    style={inputStyle}
                  />
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 flex items-center justify-between gap-3 border-t" style={{ borderColor: 'var(--t-border)' }}>
                {!isStudentRequester && (
                  <button
                    type="button"
                    onClick={() => setRecoveryOpen(true)}
                    disabled={loading}
                    className="py-3 px-4 rounded-xl font-bold text-xs border transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800 flex items-center gap-2"
                    style={{ borderColor: 'var(--t-border)', color: 'var(--t-primary)' }}
                    title="استعادة حالة اشتراك سابق برقم الهاتف"
                  >
                    <KeyRound size={14} />
                    مسجل بالفعل
                  </button>
                )}
                <div className="flex items-center gap-3 mr-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="py-3 px-6 rounded-xl font-bold text-xs border transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800"
                    style={{ borderColor: 'var(--t-border)', color: 'var(--t-text)' }}
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={loading || isClosed}
                    className="py-3 px-8 rounded-xl font-bold text-white text-xs transition-all duration-300 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    style={{ backgroundColor: 'var(--t-secondary)' }}
                  >
                    {loading && <Loader size={14} className="animate-spin" />}
                    <span>{loading ? 'جاري الإرسال...' : 'إرسال الطلب'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
