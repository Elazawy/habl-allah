import { useEffect, useId, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Globe } from 'lucide-react';
import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  SWITCHER_ENABLED,
  getLanguageFromPath,
  replaceLanguageInPath,
  setStoredLanguage,
} from '../i18n';
import { useTheme } from '../context/ThemeContext';

export default function LanguageSwitcher({
  variant = 'dropdown',
  tone = 'default',
  className = '',
  onSelect,
}) {
  const { t } = useTranslation('common');
  const location = useLocation();
  const navigate = useNavigate();
  const { dark } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const itemRefs = useRef([]);
  const menuId = useId();

  const currentLang = getLanguageFromPath(location.pathname);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!SWITCHER_ENABLED) {
    return null;
  }

  const handleSelectLanguage = (targetLang) => {
    setStoredLanguage(targetLang);
    setOpen(false);
    onSelect?.(targetLang);

    const nextPath = replaceLanguageInPath(location.pathname, targetLang);
    const nextUrl = `${nextPath}${location.search}${location.hash}`;
    const currentUrl = `${location.pathname}${location.search}${location.hash}`;
    if (nextUrl !== currentUrl) {
      navigate(nextUrl);
    }
  };

  if (variant === 'compact' || variant === 'footer') {
    const isEmeraldTone = tone === 'emerald';
    return (
      <div
        role="group"
        aria-label={t('languageSwitcher.label')}
        className={`inline-flex items-center gap-2 ${className}`.trim()}
      >
        <Globe
          size={14}
          aria-hidden="true"
          className={isEmeraldTone ? 'text-emerald-400' : 'opacity-70'}
          style={isEmeraldTone ? undefined : { color: 'var(--t-text-muted)' }}
        />
        <div className="flex items-center gap-1.5">
          {SUPPORTED_LANGUAGES.map((lang, idx) => {
            const isActive = lang === currentLang;
            return (
              <span key={lang} className="inline-flex items-center gap-1.5">
                {idx > 0 && (
                  <span
                    aria-hidden="true"
                    className={isEmeraldTone ? 'text-emerald-700 text-xs' : 'text-xs opacity-35'}
                    style={isEmeraldTone ? undefined : { color: 'var(--t-text-subtle)' }}
                  >
                    ·
                  </span>
                )}
                <button
                  type="button"
                  lang={lang}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => handleSelectLanguage(lang)}
                  className={
                    isEmeraldTone
                      ? `text-xs transition-colors duration-200 cursor-pointer ${
                          isActive
                            ? 'font-bold text-amber-400 underline underline-offset-4'
                            : 'text-emerald-300 hover:text-amber-300'
                        }`
                      : `text-xs transition-opacity duration-200 cursor-pointer ${
                          isActive
                            ? 'font-bold underline underline-offset-4'
                            : 'opacity-70 hover:opacity-100'
                        }`
                  }
                  style={
                    isEmeraldTone
                      ? undefined
                      : { color: isActive ? 'var(--t-primary)' : 'var(--t-text-muted)' }
                  }
                >
                  {LANGUAGE_LABELS[lang]}
                </button>
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  const handleMenuKeyDown = (event) => {
    const currentIndex = itemRefs.current.findIndex((el) => el === document.activeElement);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = (currentIndex + 1) % SUPPORTED_LANGUAGES.length;
      itemRefs.current[next]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev =
        (currentIndex - 1 + SUPPORTED_LANGUAGES.length) % SUPPORTED_LANGUAGES.length;
      itemRefs.current[prev]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      itemRefs.current[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      itemRefs.current[SUPPORTED_LANGUAGES.length - 1]?.focus();
    }
  };

  const handleTriggerKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      if (!open && event.key === 'ArrowDown') {
        event.preventDefault();
        setOpen(true);
        requestAnimationFrame(() => {
          const activeIndex = Math.max(0, SUPPORTED_LANGUAGES.indexOf(currentLang));
          itemRefs.current[activeIndex]?.focus();
        });
      }
    }
  };

  const toggleOpen = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        requestAnimationFrame(() => {
          const activeIndex = Math.max(0, SUPPORTED_LANGUAGES.indexOf(currentLang));
          itemRefs.current[activeIndex]?.focus();
        });
      }
      return next;
    });
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`.trim()}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t('languageSwitcher.label')}
        title={t('languageSwitcher.label')}
        className="inline-flex items-center justify-center gap-1.5 h-10 px-2.5 rounded-xl transition-all duration-300 cursor-pointer"
        style={{
          backgroundColor: dark ? 'rgba(78,173,136,0.15)' : 'rgba(27,77,62,0.08)',
          color: dark ? '#4ead88' : '#1B4D3E',
          border: `1.5px solid ${dark ? 'rgba(78,173,136,0.3)' : 'rgba(27,77,62,0.15)'}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = dark
            ? 'rgba(78,173,136,0.25)'
            : 'rgba(27,77,62,0.15)';
          e.currentTarget.style.transform = 'scale(1.04)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = dark
            ? 'rgba(78,173,136,0.15)'
            : 'rgba(27,77,62,0.08)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <Globe size={18} aria-hidden="true" />
        <span className="text-xs font-bold uppercase tracking-wide">{currentLang}</span>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={t('languageSwitcher.selectLanguage')}
          onKeyDown={handleMenuKeyDown}
          className="absolute end-0 mt-2 min-w-36 rounded-xl p-1.5 shadow-lg backdrop-blur-xl z-50"
          style={{
            backgroundColor: 'var(--t-bg-card)',
            border: '1px solid var(--t-border)',
            boxShadow: '0 10px 30px var(--t-shadow-card)',
          }}
        >
          {SUPPORTED_LANGUAGES.map((lang, index) => {
            const isActive = lang === currentLang;
            return (
              <button
                key={lang}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                lang={lang}
                onClick={() => handleSelectLanguage(lang)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm text-start transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/50"
                style={{
                  backgroundColor: isActive ? 'var(--t-primary-light)' : 'transparent',
                  color: isActive ? 'var(--t-primary)' : 'var(--t-text)',
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                <span>{LANGUAGE_LABELS[lang]}</span>
                {isActive && <Check size={14} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
