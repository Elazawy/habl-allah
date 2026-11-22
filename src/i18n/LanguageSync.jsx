import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_DIR,
  PREFIXED_LANGUAGES,
  SWITCHER_ENABLED,
} from './config.js';
import {
  getLanguageFromPath,
  getStoredLanguage,
  isAdminPath,
  localizePath,
} from './routing.js';

const HAS_PREFIX_PATTERN = new RegExp(
  `^\\/(?:${PREFIXED_LANGUAGES.join('|')})(?=\\/|$)`,
);

/**
 * Keeps i18next, <html lang dir>, and URL language prefixes synchronized.
 * Must be mounted inside <BrowserRouter>.
 */
export default function LanguageSync() {
  const location = useLocation();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const hasCheckedStorageRef = useRef(false);

  useEffect(() => {
    const { pathname, search, hash } = location;

    // On initial mount only, when the language switcher is enabled, honor a saved
    // non-default language preference if the user landed on an unprefixed public URL.
    if (!hasCheckedStorageRef.current) {
      hasCheckedStorageRef.current = true;

      if (
        SWITCHER_ENABLED &&
        !isAdminPath(pathname) &&
        !HAS_PREFIX_PATTERN.test(pathname)
      ) {
        const storedLang = getStoredLanguage();
        if (storedLang && storedLang !== DEFAULT_LANGUAGE) {
          const targetPath = localizePath(pathname, storedLang);
          navigate(`${targetPath}${search}${hash}`, { replace: true });
          return;
        }
      }
    }

    const lang = getLanguageFromPath(pathname);
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }

    document.documentElement.lang = lang;
    document.documentElement.dir = LANGUAGE_DIR[lang] || 'rtl';
  }, [location, navigate, i18n]);

  return null;
}
