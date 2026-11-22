import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isValidStudentPhone, normalizeStudentPhone, signUpStudent } from '../../services/studentsService';
import { getCountryOptions } from '../../data/countries';
import { useAuth } from '../../context/AuthContext';
import { LocalizedLink, useLocalizedNavigate, useLanguage } from '../../i18n';
import DarkModeToggle from '../../components/DarkModeToggle';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import logoGold from '../../assets/logo-gold.png';

function calcAgeInYears(dateString) {
  const birthDate = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return NaN;
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
}

export default function StudentSignupPage() {
  const navigate = useLocalizedNavigate();
  const { refreshStudentProfile } = useAuth();
  const { language } = useLanguage();
  const { t } = useTranslation(['student', 'common']);
  const countryOptions = getCountryOptions(language);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const normalizedPhone = normalizeStudentPhone(phone);

    // Validations
    if (fullName.trim().length < 2) {
      setError(t('validation.fullNameMin'));
      return;
    }

    if (!isValidStudentPhone(phone)) {
      setError(t('validation.invalidPhone'));
      return;
    }

    if (!country) {
      setError(t('validation.countryRequired'));
      return;
    }

    const age = calcAgeInYears(birthDate);
    if (!birthDate || Number.isNaN(age)) {
      setError(t('validation.birthDateRequired'));
      return;
    }
    if (age < 3 || age > 120) {
      setError(t('validation.ageRange'));
      return;
    }

    if (gender !== 'male' && gender !== 'female') {
      setError(t('validation.genderRequired'));
      return;
    }

    if (password.length < 6) {
      setError(t('validation.passwordMin'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('validation.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      // Sign up student
      const authData = await signUpStudent({
        phone: normalizedPhone,
        password,
        fullName: fullName.trim(),
        gender,
        country,
        birthDate,
        preferredLanguage: language,
      });

      // Refresh student states in AuthContext
      if (authData?.user) {
        await refreshStudentProfile(authData.user);
      }

      navigate('/quran/student/dashboard', { replace: true });
    } catch (err) {
      console.error(err);
      if (
        err.code === 'PHONE_ALREADY_REGISTERED' ||
        err.message?.includes('unique') ||
        err.message?.includes('already exists') ||
        err.message?.includes('has already been registered')
      ) {
        setError(t('signup.errors.phoneAlreadyRegistered'));
      } else {
        setError(err.message ?? t('signup.errors.generic'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden pt-20 pb-12 px-6" style={{ backgroundColor: 'var(--t-bg-page)' }}>
      {/* Floating controls */}
      <div className="fixed top-5 end-5 z-50 flex items-center gap-2">
        <LanguageSwitcher />
        <DarkModeToggle />
      </div>

      {/* Background Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] end-[-10%] w-[350px] h-[350px] rounded-full blur-[80px] opacity-20" style={{ background: 'radial-gradient(circle, var(--t-primary), transparent)' }} />
        <div className="absolute bottom-[-10%] start-[-10%] w-[350px] h-[350px] rounded-full blur-[80px] opacity-20" style={{ background: 'radial-gradient(circle, var(--t-secondary), transparent)' }} />
      </div>

      <div className="relative z-10 w-full max-w-md bg-white dark:bg-emerald-950/20 backdrop-blur-md border border-emerald-600/10 dark:border-emerald-400/10 rounded-3xl p-8 md:p-10 shadow-2xl shadow-emerald-900/5">
        
        {/* Brand Logo & Titles */}
        <div className="text-center mb-6">
          <LocalizedLink to="/quran">
            <img
              src={logoGold}
              alt={t('common:brand.logoAlt')}
              className="w-20 h-20 mx-auto object-contain mb-4 filter drop-shadow-md"
            />
          </LocalizedLink>
          <h1 className="text-2xl font-black mb-1 text-emerald-900 dark:text-emerald-400">{t('signup.title')}</h1>
          <p className="text-sm font-semibold text-emerald-800/60 dark:text-emerald-200/60">{t('signup.subtitle')}</p>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name-input" className="text-xs font-bold text-emerald-900 dark:text-emerald-400">
              {t('fields.fullName')}
            </label>
            <input
              id="name-input"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t('signup.fullNamePlaceholder')}
              required
              className="w-full py-2.5 px-4 rounded-xl border border-emerald-600/10 dark:border-emerald-400/10 bg-emerald-50/30 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 placeholder-emerald-800/40 dark:placeholder-emerald-200/40 text-sm font-semibold outline-none focus:border-emerald-600 dark:focus:border-emerald-400 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="phone-signup-input" className="text-xs font-bold text-emerald-900 dark:text-emerald-400">
              {t('fields.phone')}
            </label>
            <input
              id="phone-signup-input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('signup.phonePlaceholder')}
              required
              className="w-full py-2.5 px-4 rounded-xl border border-emerald-600/10 dark:border-emerald-400/10 bg-emerald-50/30 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 placeholder-emerald-800/40 dark:placeholder-emerald-200/40 text-sm font-semibold outline-none focus:border-emerald-600 dark:focus:border-emerald-400 transition-colors"
              dir="ltr"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="country-signup-input" className="text-xs font-bold text-emerald-900 dark:text-emerald-400">
              {t('fields.country')}
            </label>
            <select
              id="country-signup-input"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
              className="w-full py-2.5 px-4 rounded-xl border border-emerald-600/10 dark:border-emerald-400/10 bg-emerald-50/30 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 text-sm font-semibold outline-none focus:border-emerald-600 dark:focus:border-emerald-400 transition-colors"
            >
              <option value="">{t('signup.countryPlaceholder')}</option>
              {countryOptions.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="birthdate-signup-input" className="text-xs font-bold text-emerald-900 dark:text-emerald-400">
              {t('fields.birthDate')}
            </label>
            <input
              id="birthdate-signup-input"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
              max={new Date().toISOString().split('T')[0]}
              className="w-full py-2.5 px-4 rounded-xl border border-emerald-600/10 dark:border-emerald-400/10 bg-emerald-50/30 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 text-sm font-semibold outline-none focus:border-emerald-600 dark:focus:border-emerald-400 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-emerald-900 dark:text-emerald-400">
              {t('fields.gender')}
            </label>
            <div className="flex gap-3">
              <label className="flex-1 flex items-center gap-2 py-2.5 px-4 rounded-xl border border-emerald-600/10 dark:border-emerald-400/10 bg-emerald-50/30 dark:bg-emerald-950/40 text-sm font-semibold text-emerald-950 dark:text-emerald-100 cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  value="male"
                  checked={gender === 'male'}
                  onChange={() => setGender('male')}
                  className="accent-emerald-700 dark:accent-emerald-400"
                  required
                />
                {t('gender.male')}
              </label>
              <label className="flex-1 flex items-center gap-2 py-2.5 px-4 rounded-xl border border-emerald-600/10 dark:border-emerald-400/10 bg-emerald-50/30 dark:bg-emerald-950/40 text-sm font-semibold text-emerald-950 dark:text-emerald-100 cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  value="female"
                  checked={gender === 'female'}
                  onChange={() => setGender('female')}
                  className="accent-emerald-700 dark:accent-emerald-400"
                />
                {t('gender.female')}
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password-signup-input" className="text-xs font-bold text-emerald-900 dark:text-emerald-400">
              {t('fields.password')}
            </label>
            <input
              id="password-signup-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full py-2.5 px-4 rounded-xl border border-emerald-600/10 dark:border-emerald-400/10 bg-emerald-50/30 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 placeholder-emerald-800/40 dark:placeholder-emerald-200/40 text-sm font-semibold outline-none focus:border-emerald-600 dark:focus:border-emerald-400 transition-colors"
              dir="ltr"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm-password-input" className="text-xs font-bold text-emerald-900 dark:text-emerald-400">
              {t('fields.confirmPassword')}
            </label>
            <input
              id="confirm-password-input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full py-2.5 px-4 rounded-xl border border-emerald-600/10 dark:border-emerald-400/10 bg-emerald-50/30 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 placeholder-emerald-800/40 dark:placeholder-emerald-200/40 text-sm font-semibold outline-none focus:border-emerald-600 dark:focus:border-emerald-400 transition-colors"
              dir="ltr"
            />
          </div>

          {error && (
            <div className="flex gap-2 items-center bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold py-3 px-4 rounded-2xl" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-sm transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              t('signup.submit')
            )}
          </button>
        </form>

        {/* Switch to Login */}
        <div className="mt-6 text-center border-t border-emerald-600/10 dark:border-emerald-400/10 pt-4">
          <p className="text-xs font-bold text-emerald-900/60 dark:text-emerald-100/60">
            {t('signup.alreadyHaveAccount')}{' '}
            <LocalizedLink
              to="/quran/student/login"
              className="text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              {t('signup.loginLink')}
            </LocalizedLink>
          </p>
        </div>

      </div>
    </div>
  );
}
