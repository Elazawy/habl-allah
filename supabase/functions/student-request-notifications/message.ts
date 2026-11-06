export const MAX_TELEGRAM_MESSAGE_LENGTH = 4096;

const MAX_NAME_LENGTH = 200;
const MAX_WHATSAPP_LENGTH = 40;
const MAX_TEACHER_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 4000;
const MAX_REQUEST_ID_LENGTH = 64;
const MAX_APP_ORIGIN_LENGTH = 512;

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u2028\u2029]/g;

export type StudentRequestType = 'preference' | 'subscription';

export interface PreferenceRequestView {
  id: string;
  student_name?: string | null;
  age?: number | string | null;
  whatsapp?: string | null;
  description?: string | null;
  gender_preference?: string | null;
  created_at?: string | null;
}

export interface SubscriptionRequestView {
  id: string;
  teacher_name?: string | null;
  student_name?: string | null;
  whatsapp?: string | null;
  created_at?: string | null;
}

export type StudentRequestView = PreferenceRequestView | SubscriptionRequestView;

export interface FormatRequestMessageInput {
  appOrigin: string;
  type: StudentRequestType;
  request: StudentRequestView;
}

export interface TelegramSendPayload {
  chat_id: string;
  text: string;
  disable_web_page_preview: true;
}

function truncateText(value: string, maxLength: number): string {
  if (maxLength <= 0) {
    return '';
  }

  if (value.length <= maxLength) {
    return value;
  }

  // Reserve one code unit for the ellipsis and never split a surrogate pair.
  const limit = maxLength - 1;
  let result = '';
  let used = 0;

  for (const character of value) {
    if (used + character.length > limit) {
      break;
    }

    result += character;
    used += character.length;
  }

  return `${result}…`;
}

/** Normalize user/database text to safe plain text and enforce a field cap. */
export function sanitizeText(value: unknown, maxLength: number): string {
  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value)
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_CHARACTERS, ' ')
    .trim();

  return truncateText(text, maxLength);
}

function displayField(value: unknown, maxLength: number, fallback = 'غير محدد'): string {
  const text = sanitizeText(value, maxLength);
  return text || fallback;
}

function genderSectionLabel(value: unknown): string {
  switch (value) {
    case 'male':
      return 'معلم (قسم الرجال)';
    case 'female':
      return 'معلمة (قسم النساء)';
    case 'any':
      return 'أي قسم';
    default:
      return 'غير محدد';
  }
}

function ageLabel(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return 'غير محدد';
  }

  const age = Number(value);
  if (!Number.isFinite(age)) {
    return displayField(value, 16);
  }

  return String(age);
}

/** Format the request timestamp for the request chat, expressed in Cairo time. */
export function formatSubmittedAt(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return 'غير محدد';
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return 'غير محدد';
  }

  try {
    const formatted = new Intl.DateTimeFormat('ar-EG', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);

    return `${formatted} (توقيت القاهرة)`;
  } catch {
    return `${date.toISOString()} (توقيت القاهرة)`;
  }
}

export function normalizeAppOrigin(appOrigin: unknown): string {
  const origin = String(appOrigin ?? '').trim().replace(/\/+$/, '');

  if (!origin || origin.length > MAX_APP_ORIGIN_LENGTH) {
    throw new Error('Invalid PUBLIC_APP_ORIGIN');
  }

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new Error('Invalid PUBLIC_APP_ORIGIN');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Invalid PUBLIC_APP_ORIGIN');
  }

  return origin;
}

export function buildAdminRequestUrl(
  appOrigin: string,
  type: StudentRequestType,
  requestId: string,
): string {
  const origin = normalizeAppOrigin(appOrigin);
  const id = sanitizeText(requestId, MAX_REQUEST_ID_LENGTH);
  const params = new URLSearchParams({ type, id });

  return `${origin}/admin/quran/requests?${params.toString()}`;
}

function preferenceHeader(): string {
  return 'طلب مساعدة في اختيار معلم';
}

function subscriptionHeader(teacherName: string): string {
  return `طلب اشتراك مع المعلم ${teacherName}`;
}

/**
 * Build a plain-text Telegram message. No parse_mode is used, so user-supplied
 * text cannot inject Telegram markup. All fields and the final message are
 * bounded to the Telegram limit.
 */
export function formatRequestMessage(input: FormatRequestMessageInput): string {
  const appOrigin = normalizeAppOrigin(input.appOrigin);
  const request = input.request;
  const requestId = displayField(request.id, MAX_REQUEST_ID_LENGTH);
  const studentName = displayField(request.student_name, MAX_NAME_LENGTH);
  const whatsapp = displayField(request.whatsapp, MAX_WHATSAPP_LENGTH);
  const submittedAt = formatSubmittedAt(request.created_at);
  const adminUrl = buildAdminRequestUrl(appOrigin, input.type, requestId);

  const footer = [
    `وقت الإرسال: ${submittedAt}`,
    `رقم الطلب: ${requestId}`,
    `رابط الإدارة: ${adminUrl}`,
  ].join('\n');

  if (input.type === 'subscription') {
    const teacherName = displayField(
      (request as SubscriptionRequestView).teacher_name,
      MAX_TEACHER_NAME_LENGTH,
    );

    const message = [
      subscriptionHeader(teacherName),
      '',
      `اسم الطالب: ${studentName}`,
      `رقم واتساب: ${whatsapp}`,
      '',
      footer,
    ].join('\n');

    return truncateText(message, MAX_TELEGRAM_MESSAGE_LENGTH);
  }

  const preference = request as PreferenceRequestView;
  const age = ageLabel(preference.age);
  const section = genderSectionLabel(preference.gender_preference);
  const description = sanitizeText(preference.description, MAX_DESCRIPTION_LENGTH) || 'غير محدد';

  const prefix = [
    preferenceHeader(),
    '',
    `اسم الطالب: ${studentName}`,
    `رقم واتساب: ${whatsapp}`,
    `العمر: ${age}`,
    `القسم: ${section}`,
    '',
    'وصف الاحتياج:',
  ].join('\n') + '\n';

  const suffix = `\n\n${footer}`;
  const descriptionBudget = MAX_TELEGRAM_MESSAGE_LENGTH - prefix.length - suffix.length;
  const boundedDescription = truncateText(description, Math.max(0, descriptionBudget));

  return truncateText(`${prefix}${boundedDescription}${suffix}`, MAX_TELEGRAM_MESSAGE_LENGTH);
}

export function buildTelegramPayload(chatId: string, text: string): TelegramSendPayload {
  return {
    chat_id: chatId,
    text: truncateText(text, MAX_TELEGRAM_MESSAGE_LENGTH),
    disable_web_page_preview: true,
  };
}
