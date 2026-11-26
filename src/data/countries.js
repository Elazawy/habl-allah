import { DEFAULT_LANGUAGE, LANGUAGE_LOCALE } from '../i18n/config.js';
import { normalizeLanguage } from '../i18n/routing.js';

/**
 * Country list — ISO 3166-1 alpha-2 codes with Arabic names.
 * Used by the student signup form, profile page, competition registration,
 * and admin forms. Country values are stored as the 2-letter ISO code.
 */
export const COUNTRIES = [
  { code: 'AD', nameAr: 'أندورا' },
  { code: 'AE', nameAr: 'الإمارات العربية المتحدة' },
  { code: 'AF', nameAr: 'أفغانستان' },
  { code: 'AG', nameAr: 'أنتيغوا وبربودا' },
  { code: 'AI', nameAr: 'أنغويلا' },
  { code: 'AL', nameAr: 'ألبانيا' },
  { code: 'AM', nameAr: 'أرمينيا' },
  { code: 'AO', nameAr: 'أنغولا' },
  { code: 'AQ', nameAr: 'القارة القطبية الجنوبية' },
  { code: 'AR', nameAr: 'الأرجنتين' },
  { code: 'AS', nameAr: 'ساموا الأمريكية' },
  { code: 'AT', nameAr: 'النمسا' },
  { code: 'AU', nameAr: 'أستراليا' },
  { code: 'AW', nameAr: 'أروبا' },
  { code: 'AX', nameAr: 'جزر آلاند' },
  { code: 'AZ', nameAr: 'أذربيجان' },
  { code: 'BA', nameAr: 'البوسنة والهرسك' },
  { code: 'BB', nameAr: 'بربادوس' },
  { code: 'BD', nameAr: 'بنغلاديش' },
  { code: 'BE', nameAr: 'بلجيكا' },
  { code: 'BF', nameAr: 'بوركينا فاسو' },
  { code: 'BG', nameAr: 'بلغاريا' },
  { code: 'BH', nameAr: 'البحرين' },
  { code: 'BI', nameAr: 'بوروندي' },
  { code: 'BJ', nameAr: 'بنين' },
  { code: 'BL', nameAr: 'سان بارتليمي' },
  { code: 'BM', nameAr: 'برمودا' },
  { code: 'BN', nameAr: 'بروناي' },
  { code: 'BO', nameAr: 'بوليفيا' },
  { code: 'BQ', nameAr: 'هولندا الكاريبية' },
  { code: 'BR', nameAr: 'البرازيل' },
  { code: 'BS', nameAr: 'الباهاماس' },
  { code: 'BT', nameAr: 'بوتان' },
  { code: 'BV', nameAr: 'جزيرة بوفيه' },
  { code: 'BW', nameAr: 'بوتسوانا' },
  { code: 'BY', nameAr: 'بيلاروسيا' },
  { code: 'BZ', nameAr: 'بليز' },
  { code: 'CA', nameAr: 'كندا' },
  { code: 'CC', nameAr: 'جزر كوكوس' },
  { code: 'CD', nameAr: 'جمهورية الكونغو الديمقراطية' },
  { code: 'CF', nameAr: 'جمهورية أفريقيا الوسطى' },
  { code: 'CG', nameAr: 'جمهورية الكونغو' },
  { code: 'CH', nameAr: 'سويسرا' },
  { code: 'CI', nameAr: 'ساحل العاج' },
  { code: 'CK', nameAr: 'جزر كوك' },
  { code: 'CL', nameAr: 'تشيلي' },
  { code: 'CM', nameAr: 'الكاميرون' },
  { code: 'CN', nameAr: 'الصين' },
  { code: 'CO', nameAr: 'كولومبيا' },
  { code: 'CR', nameAr: 'كوستاريكا' },
  { code: 'CU', nameAr: 'كوبا' },
  { code: 'CV', nameAr: 'الرأس الأخضر' },
  { code: 'CW', nameAr: 'كوراساو' },
  { code: 'CX', nameAr: 'جزيرة عيد الميلاد' },
  { code: 'CY', nameAr: 'قبرص' },
  { code: 'CZ', nameAr: 'التشيك' },
  { code: 'DE', nameAr: 'ألمانيا' },
  { code: 'DJ', nameAr: 'جيبوتي' },
  { code: 'DK', nameAr: 'الدنمارك' },
  { code: 'DM', nameAr: 'دومينيكا' },
  { code: 'DO', nameAr: 'جمهورية الدومينيكان' },
  { code: 'DZ', nameAr: 'الجزائر' },
  { code: 'EC', nameAr: 'الإكوادور' },
  { code: 'EE', nameAr: 'إستونيا' },
  { code: 'EG', nameAr: 'مصر' },
  { code: 'EH', nameAr: 'الصحراء الغربية' },
  { code: 'ER', nameAr: 'إريتريا' },
  { code: 'ES', nameAr: 'إسبانيا' },
  { code: 'ET', nameAr: 'إثيوبيا' },
  { code: 'FI', nameAr: 'فنلندا' },
  { code: 'FJ', nameAr: 'فيجي' },
  { code: 'FK', nameAr: 'جزر فوكلاند' },
  { code: 'FM', nameAr: 'ميكرونيزيا' },
  { code: 'FO', nameAr: 'جزر فارو' },
  { code: 'FR', nameAr: 'فرنسا' },
  { code: 'GA', nameAr: 'الغابون' },
  { code: 'GB', nameAr: 'المملكة المتحدة' },
  { code: 'GD', nameAr: 'غرينادا' },
  { code: 'GE', nameAr: 'جورجيا' },
  { code: 'GF', nameAr: 'غويانا الفرنسية' },
  { code: 'GG', nameAr: 'غيرنزي' },
  { code: 'GH', nameAr: 'غانا' },
  { code: 'GI', nameAr: 'جبل طارق' },
  { code: 'GL', nameAr: 'غرينلاند' },
  { code: 'GM', nameAr: 'غامبيا' },
  { code: 'GN', nameAr: 'غينيا' },
  { code: 'GP', nameAr: 'غوادلوب' },
  { code: 'GQ', nameAr: 'غينيا الاستوائية' },
  { code: 'GR', nameAr: 'اليونان' },
  { code: 'GS', nameAr: 'جورجيا الجنوبية وجزر ساندويتش الجنوبية' },
  { code: 'GT', nameAr: 'غواتيمالا' },
  { code: 'GU', nameAr: 'غوام' },
  { code: 'GW', nameAr: 'غينيا بيساو' },
  { code: 'GY', nameAr: 'غيانا' },
  { code: 'HK', nameAr: 'هونغ كونغ' },
  { code: 'HM', nameAr: 'جزيرة هيرد وجزر ماكدونالد' },
  { code: 'HN', nameAr: 'هندوراس' },
  { code: 'HR', nameAr: 'كرواتيا' },
  { code: 'HT', nameAr: 'هايتي' },
  { code: 'HU', nameAr: 'هنغاريا' },
  { code: 'ID', nameAr: 'إندونيسيا' },
  { code: 'IE', nameAr: 'أيرلندا' },
  { code: 'IL', nameAr: 'إسرائيل' },
  { code: 'IM', nameAr: 'جزيرة مان' },
  { code: 'IN', nameAr: 'الهند' },
  { code: 'IO', nameAr: 'إقليم المحيط الهندي البريطاني' },
  { code: 'IQ', nameAr: 'العراق' },
  { code: 'IR', nameAr: 'إيران' },
  { code: 'IS', nameAr: 'آيسلندا' },
  { code: 'IT', nameAr: 'إيطاليا' },
  { code: 'JE', nameAr: 'جيرسي' },
  { code: 'JM', nameAr: 'جامايكا' },
  { code: 'JO', nameAr: 'الأردن' },
  { code: 'JP', nameAr: 'اليابان' },
  { code: 'KE', nameAr: 'كينيا' },
  { code: 'KG', nameAr: 'قيرغيزستان' },
  { code: 'KH', nameAr: 'كمبوديا' },
  { code: 'KI', nameAr: 'كيريباتي' },
  { code: 'KM', nameAr: 'جزر القمر' },
  { code: 'KN', nameAr: 'سانت كيتس ونيفيس' },
  { code: 'KP', nameAr: 'كوريا الشمالية' },
  { code: 'KR', nameAr: 'كوريا الجنوبية' },
  { code: 'KW', nameAr: 'الكويت' },
  { code: 'KY', nameAr: 'جزر كايمان' },
  { code: 'KZ', nameAr: 'كازاخستان' },
  { code: 'LA', nameAr: 'لاوس' },
  { code: 'LB', nameAr: 'لبنان' },
  { code: 'LC', nameAr: 'سانت لوسيا' },
  { code: 'LI', nameAr: 'ليختنشتاين' },
  { code: 'LK', nameAr: 'سريلانكا' },
  { code: 'LR', nameAr: 'ليبيريا' },
  { code: 'LS', nameAr: 'ليسوتو' },
  { code: 'LT', nameAr: 'ليتوانيا' },
  { code: 'LU', nameAr: 'لوكسمبورغ' },
  { code: 'LV', nameAr: 'لاتفيا' },
  { code: 'LY', nameAr: 'ليبيا' },
  { code: 'MA', nameAr: 'المغرب' },
  { code: 'MC', nameAr: 'موناكو' },
  { code: 'MD', nameAr: 'مولدوفا' },
  { code: 'ME', nameAr: 'الجبل الأسود' },
  { code: 'MF', nameAr: 'سانت مارتن' },
  { code: 'MG', nameAr: 'مدغشقر' },
  { code: 'MH', nameAr: 'جزر مارشال' },
  { code: 'MK', nameAr: 'مقدونيا الشمالية' },
  { code: 'ML', nameAr: 'مالي' },
  { code: 'MM', nameAr: 'ميانمار' },
  { code: 'MN', nameAr: 'منغوليا' },
  { code: 'MO', nameAr: 'ماكاو' },
  { code: 'MP', nameAr: 'جزر ماريانا الشمالية' },
  { code: 'MQ', nameAr: 'مارتينيك' },
  { code: 'MR', nameAr: 'موريتانيا' },
  { code: 'MS', nameAr: 'مونتسرات' },
  { code: 'MT', nameAr: 'مالطا' },
  { code: 'MU', nameAr: 'موريشيوس' },
  { code: 'MV', nameAr: 'المالديف' },
  { code: 'MW', nameAr: 'مالاوي' },
  { code: 'MX', nameAr: 'المكسيك' },
  { code: 'MY', nameAr: 'ماليزيا' },
  { code: 'MZ', nameAr: 'موزمبيق' },
  { code: 'NA', nameAr: 'ناميبيا' },
  { code: 'NC', nameAr: 'كاليدونيا الجديدة' },
  { code: 'NE', nameAr: 'النيجر' },
  { code: 'NF', nameAr: 'جزيرة نورفولك' },
  { code: 'NG', nameAr: 'نيجيريا' },
  { code: 'NI', nameAr: 'نيكاراغوا' },
  { code: 'NL', nameAr: 'هولندا' },
  { code: 'NO', nameAr: 'النرويج' },
  { code: 'NP', nameAr: 'نيبال' },
  { code: 'NR', nameAr: 'ناورو' },
  { code: 'NU', nameAr: 'نيوي' },
  { code: 'NZ', nameAr: 'نيوزيلندا' },
  { code: 'OM', nameAr: 'عُمان' },
  { code: 'PA', nameAr: 'بنما' },
  { code: 'PE', nameAr: 'بيرو' },
  { code: 'PF', nameAr: 'بولينيزيا الفرنسية' },
  { code: 'PG', nameAr: 'بابوا غينيا الجديدة' },
  { code: 'PH', nameAr: 'الفلبين' },
  { code: 'PK', nameAr: 'باكستان' },
  { code: 'PL', nameAr: 'بولندا' },
  { code: 'PM', nameAr: 'سان بيير وميكلون' },
  { code: 'PN', nameAr: 'جزر بيتكيرن' },
  { code: 'PR', nameAr: 'بورتوريكو' },
  { code: 'PS', nameAr: 'فلسطين' },
  { code: 'PT', nameAr: 'البرتغال' },
  { code: 'PW', nameAr: 'بالاو' },
  { code: 'PY', nameAr: 'باراغواي' },
  { code: 'QA', nameAr: 'قطر' },
  { code: 'RE', nameAr: 'لا ريونيون' },
  { code: 'RO', nameAr: 'رومانيا' },
  { code: 'RS', nameAr: 'صربيا' },
  { code: 'RU', nameAr: 'روسيا' },
  { code: 'RW', nameAr: 'رواندا' },
  { code: 'SA', nameAr: 'السعودية' },
  { code: 'SB', nameAr: 'جزر سولومون' },
  { code: 'SC', nameAr: 'سيشل' },
  { code: 'SD', nameAr: 'السودان' },
  { code: 'SE', nameAr: 'السويد' },
  { code: 'SG', nameAr: 'سنغافورة' },
  { code: 'SH', nameAr: 'سانت هيلانة' },
  { code: 'SI', nameAr: 'سلوفينيا' },
  { code: 'SJ', nameAr: 'سفالبارد ويان ماين' },
  { code: 'SK', nameAr: 'سلوفاكيا' },
  { code: 'SL', nameAr: 'سيراليون' },
  { code: 'SM', nameAr: 'سان مارينو' },
  { code: 'SN', nameAr: 'السنغال' },
  { code: 'SO', nameAr: 'الصومال' },
  { code: 'SR', nameAr: 'سورينام' },
  { code: 'SS', nameAr: 'جنوب السودان' },
  { code: 'ST', nameAr: 'ساو تومي وبرينسيبي' },
  { code: 'SV', nameAr: 'السلفادور' },
  { code: 'SX', nameAr: 'سينت مارتن' },
  { code: 'SY', nameAr: 'سوريا' },
  { code: 'SZ', nameAr: 'إسواتيني' },
  { code: 'TC', nameAr: 'جزر توركس وكايكوس' },
  { code: 'TD', nameAr: 'تشاد' },
  { code: 'TF', nameAr: 'الأقاليم الفرنسية الجنوبية' },
  { code: 'TG', nameAr: 'توغو' },
  { code: 'TH', nameAr: 'تايلاند' },
  { code: 'TJ', nameAr: 'طاجيكستان' },
  { code: 'TK', nameAr: 'توكيلاو' },
  { code: 'TL', nameAr: 'تيمور الشرقية' },
  { code: 'TM', nameAr: 'تركمانستان' },
  { code: 'TN', nameAr: 'تونس' },
  { code: 'TO', nameAr: 'تونغا' },
  { code: 'TR', nameAr: 'تركيا' },
  { code: 'TT', nameAr: 'ترينيداد وتوباغو' },
  { code: 'TV', nameAr: 'توفالو' },
  { code: 'TW', nameAr: 'تايوان' },
  { code: 'TZ', nameAr: 'تنزانيا' },
  { code: 'UA', nameAr: 'أوكرانيا' },
  { code: 'UG', nameAr: 'أوغندا' },
  { code: 'UM', nameAr: 'جزر الولايات المتحدة النائية' },
  { code: 'US', nameAr: 'الولايات المتحدة' },
  { code: 'UY', nameAr: 'أوروغواي' },
  { code: 'UZ', nameAr: 'أوزبكستان' },
  { code: 'VA', nameAr: 'الفاتيكان' },
  { code: 'VC', nameAr: 'سانت فينسنت والغرينادين' },
  { code: 'VE', nameAr: 'فنزويلا' },
  { code: 'VG', nameAr: 'جزر العذراء البريطانية' },
  { code: 'VI', nameAr: 'جزر العذراء الأمريكية' },
  { code: 'VN', nameAr: 'فيتنام' },
  { code: 'VU', nameAr: 'فانواتو' },
  { code: 'WF', nameAr: 'واليس وفوتونا' },
  { code: 'WS', nameAr: 'ساموا' },
  { code: 'YE', nameAr: 'اليمن' },
  { code: 'YT', nameAr: 'مايوت' },
  { code: 'ZA', nameAr: 'جنوب أفريقيا' },
  { code: 'ZM', nameAr: 'زامبيا' },
  { code: 'ZW', nameAr: 'زيمبابوي' },
];

export const DEFAULT_COUNTRY = 'EG';

// Sorted by Arabic name for dropdown display.
export const COUNTRY_OPTIONS = [...COUNTRIES].sort((a, b) =>
  a.nameAr.localeCompare(b.nameAr, 'ar')
);

const countryNameByCode = new Map(COUNTRIES.map((c) => [c.code, c.nameAr]));
const displayNamesCache = new Map();
const countryOptionsCache = new Map();

const TIMEZONE_TO_COUNTRY = {
  'Africa/Cairo': 'EG',
  'Asia/Riyadh': 'SA',
  'Asia/Dubai': 'AE',
  'Asia/Kuwait': 'KW',
  'Asia/Qatar': 'QA',
  'Asia/Bahrain': 'BH',
  'Asia/Muscat': 'OM',
  'Asia/Amman': 'JO',
  'Asia/Beirut': 'LB',
  'Asia/Damascus': 'SY',
  'Asia/Baghdad': 'IQ',
  'Asia/Aden': 'YE',
  'Asia/Gaza': 'PS',
  'Asia/Hebron': 'PS',
  'Africa/Tripoli': 'LY',
  'Africa/Tunis': 'TN',
  'Africa/Algiers': 'DZ',
  'Africa/Casablanca': 'MA',
  'Africa/El_Aaiun': 'MA',
  'Africa/Khartoum': 'SD',
  'Africa/Mogadishu': 'SO',
  'Africa/Djibouti': 'DJ',
  'Africa/Nouakchott': 'MR',
  'Indian/Comoro': 'KM',
  'Europe/Istanbul': 'TR',
  'Asia/Istanbul': 'TR',
  'Europe/London': 'GB',
  'Europe/Berlin': 'DE',
  'Europe/Busingen': 'DE',
  'Europe/Paris': 'FR',
  'Europe/Rome': 'IT',
  'Europe/Madrid': 'ES',
  'Atlantic/Canary': 'ES',
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'Europe/Vienna': 'AT',
  'Europe/Zurich': 'CH',
  'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK',
  'Europe/Dublin': 'IE',
  'Europe/Athens': 'GR',
  'Europe/Warsaw': 'PL',
  'Europe/Bucharest': 'RO',
  'Europe/Moscow': 'RU',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Phoenix': 'US',
  'America/Anchorage': 'US',
  'Pacific/Honolulu': 'US',
  'America/Detroit': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Montreal': 'CA',
  'America/Edmonton': 'CA',
  'America/Winnipeg': 'CA',
  'America/Halifax': 'CA',
  'Asia/Karachi': 'PK',
  'Asia/Dhaka': 'BD',
  'Asia/Jakarta': 'ID',
  'Asia/Makassar': 'ID',
  'Asia/Jayapura': 'ID',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Kuching': 'MY',
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'Asia/Singapore': 'SG',
  'Asia/Tokyo': 'JP',
  'Asia/Seoul': 'KR',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Australia/Perth': 'AU',
  'Australia/Brisbane': 'AU',
  'Pacific/Auckland': 'NZ',
};

// Ordered longest-prefix-first so 3-digit codes win over shorter prefixes.
const CALLING_PREFIX_TO_COUNTRY = [
  ['966', 'SA'],
  ['971', 'AE'],
  ['965', 'KW'],
  ['974', 'QA'],
  ['973', 'BH'],
  ['968', 'OM'],
  ['962', 'JO'],
  ['961', 'LB'],
  ['963', 'SY'],
  ['964', 'IQ'],
  ['967', 'YE'],
  ['970', 'PS'],
  ['218', 'LY'],
  ['216', 'TN'],
  ['213', 'DZ'],
  ['212', 'MA'],
  ['249', 'SD'],
  ['252', 'SO'],
  ['253', 'DJ'],
  ['222', 'MR'],
  ['269', 'KM'],
  ['353', 'IE'],
  ['351', 'PT'],
  ['20', 'EG'],
  ['90', 'TR'],
  ['44', 'GB'],
  ['49', 'DE'],
  ['33', 'FR'],
  ['39', 'IT'],
  ['34', 'ES'],
  ['31', 'NL'],
  ['32', 'BE'],
  ['43', 'AT'],
  ['41', 'CH'],
  ['46', 'SE'],
  ['47', 'NO'],
  ['45', 'DK'],
  ['30', 'GR'],
  ['48', 'PL'],
  ['40', 'RO'],
  ['92', 'PK'],
  ['62', 'ID'],
  ['60', 'MY'],
  ['91', 'IN'],
  ['61', 'AU'],
  ['65', 'SG'],
  ['81', 'JP'],
  ['82', 'KR'],
  ['64', 'NZ'],
];

function getRegionDisplayNames(lang) {
  const normalized = normalizeLanguage(lang);
  if (normalized === DEFAULT_LANGUAGE) return null;
  if (displayNamesCache.has(normalized)) {
    return displayNamesCache.get(normalized);
  }
  const locale = LANGUAGE_LOCALE[normalized] || normalized;
  let displayNames = null;
  if (typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function') {
    try {
      displayNames = new Intl.DisplayNames([locale], { type: 'region' });
    } catch {
      displayNames = null;
    }
  }
  displayNamesCache.set(normalized, displayNames);
  return displayNames;
}

/**
 * Returns the localized country name for an ISO alpha-2 code, or the raw code.
 * Defaults to Arabic ('ar') so admin pages and legacy callers remain Arabic-only.
 */
export function getCountryName(code, lang = DEFAULT_LANGUAGE) {
  if (!code) return '';
  const upper = String(code).toUpperCase();
  const normalized = normalizeLanguage(lang);

  if (normalized !== DEFAULT_LANGUAGE) {
    const displayNames = getRegionDisplayNames(normalized);
    if (displayNames) {
      try {
        const localized = displayNames.of(upper);
        if (localized && localized !== upper) {
          return localized;
        }
      } catch {
        // Fall back to Arabic name or raw code below
      }
    }
  }

  return countryNameByCode.get(upper) ?? code;
}

/**
 * Returns country options `{ code, name, nameAr }` localized and sorted for `lang`.
 */
export function getCountryOptions(lang = DEFAULT_LANGUAGE) {
  const normalized = normalizeLanguage(lang);
  if (countryOptionsCache.has(normalized)) {
    return countryOptionsCache.get(normalized);
  }

  const locale = LANGUAGE_LOCALE[normalized] || normalized;
  const options = COUNTRIES.map((country) => ({
    code: country.code,
    name: getCountryName(country.code, normalized),
    nameAr: country.nameAr,
  })).sort((a, b) => a.name.localeCompare(b.name, locale));

  countryOptionsCache.set(normalized, options);
  return options;
}

/** True when the value is a known ISO 3166-1 alpha-2 code. */
export function isValidCountryCode(code) {
  return typeof code === 'string' && countryNameByCode.has(code.toUpperCase());
}

export function normalizeCountrySearchText(value) {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function filterCountryOptions(options = [], query = '') {
  const normalizedQuery = normalizeCountrySearchText(query);
  if (!normalizedQuery) {
    return options;
  }

  return options.filter((option) => {
    const code = String(option?.code ?? '');
    const candidates = [
      option?.name,
      option?.nameAr,
      code ? getCountryName(code, 'en') : '',
      code,
    ];

    return candidates.some((candidate) =>
      normalizeCountrySearchText(candidate).includes(normalizedQuery)
    );
  });
}

export function guessCountryFromTimezone(timeZone) {
  let resolvedTimeZone = typeof timeZone === 'string' ? timeZone.trim() : '';

  if (!resolvedTimeZone && typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
    try {
      resolvedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch {
      resolvedTimeZone = '';
    }
  }

  if (!resolvedTimeZone) {
    return null;
  }

  const code = TIMEZONE_TO_COUNTRY[resolvedTimeZone] ?? null;
  return code && isValidCountryCode(code) ? code : null;
}

export function guessCountryFromPhone(rawPhone) {
  const normalizedDigitsInput = String(rawPhone ?? '')
    .replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (digit) => {
      const code = digit.charCodeAt(0);
      return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
    })
    .trim();

  if (!normalizedDigitsInput) {
    return null;
  }

  const digits = normalizedDigitsInput.replace(/\D/g, '');
  if (!digits) {
    return null;
  }

  const hasPlus = normalizedDigitsInput.startsWith('+');
  const hasDoubleZero = !hasPlus && digits.startsWith('00');

  if (!hasPlus && !hasDoubleZero) {
    return /^01[0125]/.test(digits) ? 'EG' : null;
  }

  const intlDigits = hasPlus ? digits : digits.slice(2);
  if (!intlDigits) {
    return null;
  }

  for (const [prefix, countryCode] of CALLING_PREFIX_TO_COUNTRY) {
    if (intlDigits.startsWith(prefix) && isValidCountryCode(countryCode)) {
      return countryCode;
    }
  }

  return null;
}

export async function fetchCountryFromEdgeGeo({ signal } = {}) {
  try {
    const response = await fetch('/api/geo', {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal,
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return null;
    }

    const data = await response.json();
    const code = typeof data?.country === 'string' ? data.country.trim().toUpperCase() : '';
    return isValidCountryCode(code) ? code : null;
  } catch {
    return null;
  }
}
