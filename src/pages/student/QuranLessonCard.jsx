import { useTranslation } from 'react-i18next';
import {
  formatLessonAyahRef,
  resolveLessonLevel,
  resolveLessonSurah,
  useFormatters,
  useLanguage,
  useLocalizedContent,
} from '../../i18n';

function wrapBidiSurahText(resolvedSurah, language) {
  if (!resolvedSurah?.text) return '';
  if (resolvedSurah.isFallback && language !== 'ar') {
    return `\u2067${resolvedSurah.text}\u2069`;
  }
  return resolvedSurah.text;
}

export default function QuranLessonCard({
  lesson,
  lessonNumber = null,
  evalDateLabelKey = 'lessons.evalDate',
  hoverable = false,
}) {
  const { t } = useTranslation('student');
  const { language, dir } = useLanguage();
  const { formatDate, formatNumber } = useFormatters();
  const { field } = useLocalizedContent();

  const translateLevel = (key) => t(`lessons.levels.${key}`);

  const hijriDate = field(lesson, 'hijri_date');
  const recTodaySurah = resolveLessonSurah(lesson, 'recitation_today_surah', language);
  const recTodayLevel = resolveLessonLevel(
    lesson.recitation_today_level,
    language,
    translateLevel,
  );
  const recPastSurah = resolveLessonSurah(lesson, 'recitation_past_surah', language);
  const recPastLevel = resolveLessonLevel(
    lesson.recitation_past_level,
    language,
    translateLevel,
  );
  const readingSurah = resolveLessonSurah(lesson, 'reading_surah', language);
  const readingLevel = resolveLessonLevel(
    lesson.reading_level,
    language,
    translateLevel,
  );
  const tajweedLesson = field(lesson, 'tajweed_lesson');
  const interactionLevel = resolveLessonLevel(
    lesson.interaction_level,
    language,
    translateLevel,
  );
  const generalNotes = field(lesson, 'general_notes');
  const hwTodaySurah = resolveLessonSurah(lesson, 'homework_today_surah', language);
  const hwPastSurah = resolveLessonSurah(lesson, 'homework_past_surah', language);

  const recTodayFrom =
    formatLessonAyahRef(lesson.recitation_today_from, formatNumber) || formatNumber(1);
  const recTodayTo =
    formatLessonAyahRef(lesson.recitation_today_to, formatNumber) || t('lessons.toEnd');
  const readingFrom =
    formatLessonAyahRef(lesson.reading_from, formatNumber) || formatNumber(1);
  const readingTo =
    formatLessonAyahRef(lesson.reading_to, formatNumber) || t('lessons.toEnd');
  const hwTodayFrom =
    formatLessonAyahRef(lesson.homework_today_from, formatNumber) || formatNumber(1);
  const hwTodayTo =
    formatLessonAyahRef(lesson.homework_today_to, formatNumber) || t('lessons.toEnd');

  const cardClass = hoverable
    ? 'border rounded-3xl p-6 md:p-8 shadow-sm space-y-6 relative transition-all duration-300 hover:shadow-md hover:border-[var(--t-primary)]'
    : 'border rounded-3xl p-6 md:p-8 shadow-sm space-y-6 relative';

  return (
    <div
      className={cardClass}
      style={{ backgroundColor: 'var(--t-bg-card)', borderColor: 'var(--t-border)' }}
    >
      {lessonNumber !== null && lessonNumber !== undefined && (
        <span
          className="absolute top-6 end-6 text-2xl font-black"
          style={{ color: 'var(--t-primary-light)' }}
        >
          #{formatNumber(lessonNumber)}
        </span>
      )}

      {/* Hijri Date and Gregorian Date */}
      <div
        className={`flex justify-between items-start border-b pb-4 flex-wrap gap-2 ${
          lessonNumber !== null && lessonNumber !== undefined ? 'pe-12' : ''
        }`}
        style={{ borderColor: 'var(--t-border)' }}
      >
        <div>
          <span className="text-[10px] font-bold block mb-0.5" style={{ color: 'var(--t-primary)' }}>
            {t(evalDateLabelKey)}
          </span>
          <span className="text-sm font-bold" style={{ color: 'var(--t-text)' }}>
            {formatDate(lesson.lesson_date, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
        {hijriDate.text && (
          <div
            className="text-end sm:text-start px-3 py-1.5 rounded-xl border"
            style={{
              backgroundColor: 'var(--t-primary-light)',
              borderColor: 'var(--t-border)',
              color: 'var(--t-primary)',
            }}
          >
            <span dir={hijriDate.dir} className="text-xs font-bold">
              📜 {hijriDate.text}
            </span>
          </div>
        )}
      </div>

      {/* Quran performance grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recitation */}
        <div className="space-y-4">
          <h3
            className="text-xs font-black border-b pb-1"
            style={{ color: 'var(--t-primary)', borderColor: 'var(--t-border)' }}
          >
            {t('lessons.recitationTodayHeading')}
          </h3>

          {recTodaySurah.text ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm gap-2">
                <span className="font-semibold shrink-0" style={{ color: 'var(--t-text-muted)' }}>
                  {t('lessons.currentLabel')}
                </span>
                <span dir={dir} className="font-bold text-end" style={{ color: 'var(--t-text)' }}>
                  {t('lessons.surahRange', {
                    surah: wrapBidiSurahText(recTodaySurah, language),
                    from: recTodayFrom,
                    to: recTodayTo,
                  })}
                </span>
              </div>
              {recTodayLevel.text && (
                <div className="flex justify-between text-sm gap-2">
                  <span className="font-semibold shrink-0" style={{ color: 'var(--t-text-muted)' }}>
                    {t('lessons.memorizationLevelLabel')}
                  </span>
                  <span dir={recTodayLevel.dir} className="font-black" style={{ color: 'var(--t-primary)' }}>
                    {recTodayLevel.text}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--t-text-subtle)' }}>
              {t('lessons.noRecitationToday')}
            </p>
          )}

          {recPastSurah.text && (
            <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--t-border)' }}>
              <div className="flex justify-between text-sm gap-2">
                <span className="font-semibold shrink-0" style={{ color: 'var(--t-text-muted)' }}>
                  {t('lessons.pastReviewLabel')}
                </span>
                <span dir={dir} className="font-bold text-end" style={{ color: 'var(--t-text)' }}>
                  {t('lessons.surahOnly', {
                    surah: wrapBidiSurahText(recPastSurah, language),
                  })}
                </span>
              </div>
              {recPastLevel.text && (
                <div className="flex justify-between text-sm gap-2">
                  <span className="font-semibold shrink-0" style={{ color: 'var(--t-text-muted)' }}>
                    {t('lessons.pastLevelLabel')}
                  </span>
                  <span dir={recPastLevel.dir} className="font-black" style={{ color: 'var(--t-primary)' }}>
                    {recPastLevel.text}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reading & Tajweed */}
        <div className="space-y-4">
          <h3
            className="text-xs font-black border-b pb-1"
            style={{ color: 'var(--t-primary)', borderColor: 'var(--t-border)' }}
          >
            {t('lessons.readingAndTajweedHeading')}
          </h3>

          {readingSurah.text ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm gap-2">
                <span className="font-semibold shrink-0" style={{ color: 'var(--t-text-muted)' }}>
                  {t('lessons.readingLabel')}
                </span>
                <span dir={dir} className="font-bold text-end" style={{ color: 'var(--t-text)' }}>
                  {t('lessons.surahRange', {
                    surah: wrapBidiSurahText(readingSurah, language),
                    from: readingFrom,
                    to: readingTo,
                  })}
                </span>
              </div>
              {readingLevel.text && (
                <div className="flex justify-between text-sm gap-2">
                  <span className="font-semibold shrink-0" style={{ color: 'var(--t-text-muted)' }}>
                    {t('lessons.readingLevelLabel')}
                  </span>
                  <span dir={readingLevel.dir} className="font-black" style={{ color: 'var(--t-primary)' }}>
                    {readingLevel.text}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--t-text-subtle)' }}>
              {t('lessons.noReadingToday')}
            </p>
          )}

          {tajweedLesson.text && (
            <div className="flex justify-between text-sm gap-2 pt-2 border-t" style={{ borderColor: 'var(--t-border)' }}>
              <span className="font-semibold shrink-0" style={{ color: 'var(--t-text-muted)' }}>
                {t('lessons.tajweedLabel')}
              </span>
              <span dir={tajweedLesson.dir} className="font-bold text-end" style={{ color: 'var(--t-text)' }}>
                {tajweedLesson.text}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* General details */}
      {(interactionLevel.text || generalNotes.text) && (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 border rounded-2xl p-4"
          style={{ backgroundColor: 'var(--t-bg-surface-low)', borderColor: 'var(--t-border)' }}
        >
          {interactionLevel.text && (
            <div className="flex justify-between text-xs sm:text-sm gap-2">
              <span className="font-bold shrink-0" style={{ color: 'var(--t-text-muted)' }}>
                {t('lessons.interactionLabel')}
              </span>
              <span dir={interactionLevel.dir} className="font-black" style={{ color: 'var(--t-primary)' }}>
                {interactionLevel.text}
              </span>
            </div>
          )}
          {generalNotes.text && (
            <div
              className={`text-xs leading-relaxed sm:col-span-2 ${
                interactionLevel.text ? 'mt-2 pt-2 border-t' : ''
              }`}
              style={{ borderColor: 'var(--t-border)', color: 'var(--t-text)' }}
            >
              <span className="font-bold block mb-0.5" style={{ color: 'var(--t-primary)' }}>
                {t('lessons.teacherNotesLabel')}
              </span>
              <p dir={generalNotes.dir} className="italic whitespace-pre-line">
                "{generalNotes.text}"
              </p>
            </div>
          )}
        </div>
      )}

      {/* Homework section */}
      {(hwTodaySurah.text || hwPastSurah.text) && (
        <div className="border-t pt-4 space-y-3" style={{ borderColor: 'var(--t-border)' }}>
          <h3 className="text-xs font-black" style={{ color: 'var(--t-primary)' }}>
            {t('lessons.homeworkHeading')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {hwTodaySurah.text && (
              <div className="text-xs">
                <span className="font-bold" style={{ color: 'var(--t-text-muted)' }}>
                  {t('lessons.homeworkCurrentLabel')}
                </span>
                <p dir={dir} className="font-bold mt-0.5" style={{ color: 'var(--t-text)' }}>
                  {t('lessons.surahRange', {
                    surah: wrapBidiSurahText(hwTodaySurah, language),
                    from: hwTodayFrom,
                    to: hwTodayTo,
                  })}
                </p>
              </div>
            )}
            {hwPastSurah.text && (
              <div className="text-xs">
                <span className="font-bold" style={{ color: 'var(--t-text-muted)' }}>
                  {t('lessons.homeworkPastLabel')}
                </span>
                <p dir={dir} className="font-bold mt-0.5" style={{ color: 'var(--t-text)' }}>
                  {t('lessons.surahOnly', {
                    surah: wrapBidiSurahText(hwPastSurah, language),
                  })}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
