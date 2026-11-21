import { getMissingTranslations } from '../../../i18n/content.js';

export function TranslationStatusBadge({
  record,
  specs,
  extraMissingEn = false,
  extraMissingTr = false,
  className = '',
}) {
  const { missingEn: recordMissingEn, missingTr: recordMissingTr } =
    getMissingTranslations(record, specs);

  const missingEn = Boolean(recordMissingEn || extraMissingEn);
  const missingTr = Boolean(recordMissingTr || extraMissingTr);

  if (!missingEn && !missingTr) {
    return null;
  }

  let label = 'ناقص EN / TR';
  let title = 'الترجمة الإنجليزية والتركية ناقصة';

  if (missingEn && !missingTr) {
    label = 'ناقص EN';
    title = 'الترجمة الإنجليزية ناقصة';
  } else if (!missingEn && missingTr) {
    label = 'ناقص TR';
    title = 'الترجمة التركية ناقصة';
  }

  return (
    <span
      className={`admin-badge admin-badge--warning admin-translation-badge${className ? ` ${className}` : ''}`}
      title={title}
    >
      {label}
    </span>
  );
}

export default TranslationStatusBadge;
