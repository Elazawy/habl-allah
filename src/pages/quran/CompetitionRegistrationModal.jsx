import { useState, useEffect } from 'react';
import { X, Loader, CheckCircle, AlertCircle, MapPin, User, Phone, Calendar, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { submitCompetitionRegistrationRequest } from '../../services/competitionsService';
import { COUNTRY_OPTIONS } from '../../data/countries';

function normalizeLocalizedDigits(value) {
  return String(value ?? '').replace(/[٠-٩۰-۹]/g, (digit) => {
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

export default function CompetitionRegistrationModal({ competition, onClose, onSubmitted }) {
  const { user, isStudent, studentProfile } = useAuth();

  // States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [selectedLevelOption, setSelectedLevelOption] = useState('');
  const [customLevel, setCustomLevel] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

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

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const validate = () => {
    // 1. Validate guest fields
    if (!isStudentRequester) {
      const trimmedName = name.trim();
      if (trimmedName.length < 2) {
        setError('الاسم يجب أن يتكون من حرفين على الأقل.');
        return false;
      }

      const digitsPhone = normalizePhoneDigits(phone);
      if (digitsPhone.length < 10 || digitsPhone.length > 15) {
        setError('رقم الهاتف يجب أن يتكون من 10 إلى 15 رقماً.');
        return false;
      }

      if (!birthDate) {
        setError('يرجى كتابة تاريخ الميلاد.');
        return false;
      }

      if (gender !== 'male' && gender !== 'female') {
        setError('يرجى تحديد الجنس.');
        return false;
      }

      if (!country) {
        setError('يرجى اختيار الدولة.');
        return false;
      }
    } else {
      // Signed-in students: data comes from the profile — make sure it is there.
      if (!studentProfile.birth_date || !studentProfile.gender || !studentProfile.country) {
        setError('بيانات ملفك الشخصي غير مكتملة (تاريخ الميلاد / الجنس / الدولة). يرجى استكمالها من صفحة ملفي الشخصي ثم إعادة المحاولة.');
        return false;
      }
    }

    // 2. Validate level
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

      const payload = {
        competition_id: competition.id,
        student_id: isStudentRequester ? studentProfile.id : null,
        student_name: isStudentRequester ? studentProfile.full_name : name.trim(),
        student_phone: isStudentRequester ? normalizePhoneDigits(studentProfile.phone) : normalizePhoneDigits(phone),
        country: isStudentRequester ? studentProfile.country : country,
        birth_date: isStudentRequester ? studentProfile.birth_date : birthDate,
        gender: isStudentRequester ? studentProfile.gender : gender,
        level: finalLevel,
      };

      await submitCompetitionRegistrationRequest(payload);

      try {
        onSubmitted?.(payload);
      } catch (callbackError) {
        console.error('[competition registration submitted callback failed]', callbackError);
      }

      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء إرسال طلب الاشتراك. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
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
                تم إرسال طلب الاشتراك بنجاح، وسيتم التواصل معك قريباً.
              </p>
              <button
                onClick={onClose}
                className="mt-6 py-3 px-8 rounded-xl font-bold text-white text-xs transition-all duration-300 hover:opacity-95"
                style={{ backgroundColor: 'var(--t-secondary)' }}
              >
                حسناً
              </button>
            </div>
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
                  <div>
                    {error}
                    {isStudentRequester && error.includes('ملفي الشخصي') && (
                      <>
                        {' '}
                        <Link
                          to="/quran/student/profile"
                          className="font-bold underline"
                          style={{ color: 'var(--t-primary)' }}
                        >
                          اذهب لملفي الشخصي
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              )}


              {/* Guest fields */}
              {!isStudentRequester && (
                <>
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
                      style={{
                        backgroundColor: 'var(--t-bg-page)',
                        borderColor: 'var(--t-border)',
                        color: 'var(--t-text)'
                      }}
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
                      style={{
                        backgroundColor: 'var(--t-bg-page)',
                        borderColor: 'var(--t-border)',
                        color: 'var(--t-text)'
                      }}
                    />
                  </div>

                  {/* Birth date */}
                  <div className="space-y-1.5">
                    <label htmlFor="student_birth_date" className="text-xs font-black flex items-center gap-1.5" style={{ color: 'var(--t-primary)' }}>
                      <Calendar size={14} className="text-amber-500" />
                      تاريخ الميلاد *
                    </label>
                    <input
                      id="student_birth_date"
                      type="date"
                      required
                      disabled={loading || isClosed}
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1"
                      style={{
                        backgroundColor: 'var(--t-bg-page)',
                        borderColor: 'var(--t-border)',
                        color: 'var(--t-text)'
                      }}
                    />
                  </div>

                  {/* Gender */}
                  <div className="space-y-1.5">
                    <label htmlFor="student_gender" className="text-xs font-black flex items-center gap-1.5" style={{ color: 'var(--t-primary)' }}>
                      <User size={14} className="text-amber-500" />
                      الجنس *
                    </label>
                    <select
                      id="student_gender"
                      required
                      disabled={loading || isClosed}
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1"
                      style={{
                        backgroundColor: 'var(--t-bg-page)',
                        borderColor: 'var(--t-border)',
                        color: 'var(--t-text)'
                      }}
                    >
                      <option value="">اختر الجنس...</option>
                      <option value="male">ذكر</option>
                      <option value="female">أنثى</option>
                    </select>
                  </div>

                  {/* Country */}
                  <div className="space-y-1.5">
                    <label htmlFor="country" className="text-xs font-black flex items-center gap-1.5" style={{ color: 'var(--t-primary)' }}>
                      <MapPin size={14} className="text-amber-500" />
                      الدولة *
                    </label>
                    <select
                      id="country"
                      required
                      disabled={loading || isClosed}
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1"
                      style={{
                        backgroundColor: 'var(--t-bg-page)',
                        borderColor: 'var(--t-border)',
                        color: 'var(--t-text)'
                      }}
                    >
                      <option value="">اختر دولتك...</option>
                      {COUNTRY_OPTIONS.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.nameAr}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

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
                      style={{
                        backgroundColor: 'var(--t-bg-page)',
                        borderColor: 'var(--t-border)',
                        color: 'var(--t-text)'
                      }}
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
                        style={{
                          backgroundColor: 'var(--t-bg-page)',
                          borderColor: 'var(--t-border)',
                          color: 'var(--t-text)'
                        }}
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
                    style={{
                      backgroundColor: 'var(--t-bg-page)',
                      borderColor: 'var(--t-border)',
                      color: 'var(--t-text)'
                    }}
                  />
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t" style={{ borderColor: 'var(--t-border)' }}>
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
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
