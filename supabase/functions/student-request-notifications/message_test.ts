import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from 'jsr:@std/assert@1';

import {
  buildAdminRequestUrl,
  buildTelegramPayload,
  formatRequestMessage,
  MAX_TELEGRAM_MESSAGE_LENGTH,
  normalizeAppOrigin,
  sanitizeText,
} from './message.ts';

const PREFERENCE_ID = '11111111-1111-4111-8111-111111111111';
const SUBSCRIPTION_ID = '22222222-2222-4222-8222-222222222222';
const APP_ORIGIN = 'https://app.example.com/';

const preferenceRequest = {
  id: PREFERENCE_ID,
  student_name: 'أحمد محمد',
  age: 12,
  whatsapp: '201128472424',
  description: 'أريد معلماً متخصصاً في تجويد المبتدئين.',
  gender_preference: 'male',
  created_at: '2026-11-06T10:15:00.000Z',
};

Deno.test('preference message has the required heading, context and admin link', () => {
  const message = formatRequestMessage({
    appOrigin: APP_ORIGIN,
    type: 'preference',
    request: preferenceRequest,
  });

  assertStringIncludes(message, 'طلب مساعدة في اختيار معلم');
  assertStringIncludes(message, 'اسم الطالب: أحمد محمد');
  assertStringIncludes(message, 'رقم واتساب: 201128472424');
  assertStringIncludes(message, 'العمر: 12');
  assertStringIncludes(message, 'القسم: معلم (قسم الرجال)');
  assertStringIncludes(message, 'وصف الاحتياج:');
  assertStringIncludes(message, 'أريد معلماً متخصصاً في تجويد المبتدئين.');
  assertStringIncludes(message, `رقم الطلب: ${PREFERENCE_ID}`);
  assertStringIncludes(
    message,
    `https://app.example.com/admin/quran/requests?type=preference&id=${PREFERENCE_ID}`,
  );
  assertStringIncludes(message, '(توقيت القاهرة)');
});

Deno.test('subscription message names the specific teacher and has no preference fields', () => {
  const message = formatRequestMessage({
    appOrigin: APP_ORIGIN,
    type: 'subscription',
    request: {
      id: SUBSCRIPTION_ID,
      teacher_name: 'الشيخ خالد',
      student_name: 'مريم',
      whatsapp: '447700900123',
      created_at: '2026-11-06T10:15:00.000Z',
    },
  });

  assertStringIncludes(message, 'طلب اشتراك مع المعلم الشيخ خالد');
  assertStringIncludes(message, 'اسم الطالب: مريم');
  assertStringIncludes(message, 'رقم واتساب: 447700900123');
  assertStringIncludes(
    message,
    `https://app.example.com/admin/quran/requests?type=subscription&id=${SUBSCRIPTION_ID}`,
  );
  assertEquals(message.includes('العمر:'), false);
  assertEquals(message.includes('وصف الاحتياج:'), false);
});

Deno.test('optional or missing preference fields are shown as unspecified', () => {
  const message = formatRequestMessage({
    appOrigin: APP_ORIGIN,
    type: 'preference',
    request: {
      id: PREFERENCE_ID,
      student_name: null,
      age: null,
      whatsapp: '',
      description: null,
      gender_preference: null,
      created_at: null,
    },
  });

  assertStringIncludes(message, 'اسم الطالب: غير محدد');
  assertStringIncludes(message, 'رقم واتساب: غير محدد');
  assertStringIncludes(message, 'العمر: غير محدد');
  assertStringIncludes(message, 'القسم: غير محدد');
  assertStringIncludes(message, 'وقت الإرسال: غير محدد');
});

Deno.test('messages never contain old saved/status wording', () => {
  const message = formatRequestMessage({
    appOrigin: APP_ORIGIN,
    type: 'preference',
    request: preferenceRequest,
  });

  assertEquals(message.includes('تم الحفظ'), false);
  assertEquals(message.includes('تم تحديث الحالة'), false);
  assertEquals(message.includes('حالة الطلب'), false);
});

Deno.test('plain-text payload never enables Telegram parse modes', () => {
  const payload = buildTelegramPayload('123456789', '*not markup* <b>plain</b>');

  assertEquals(payload.chat_id, '123456789');
  assertEquals(payload.disable_web_page_preview, true);
  assertEquals('parse_mode' in payload, false);
});

Deno.test('long descriptions are capped while preserving the admin link', () => {
  const message = formatRequestMessage({
    appOrigin: APP_ORIGIN,
    type: 'preference',
    request: {
      ...preferenceRequest,
      description: 'س'.repeat(10_000),
    },
  });

  assert(message.length <= MAX_TELEGRAM_MESSAGE_LENGTH);
  assertStringIncludes(
    message,
    `https://app.example.com/admin/quran/requests?type=preference&id=${PREFERENCE_ID}`,
  );
});

Deno.test('emoji descriptions are capped without splitting surrogate pairs', () => {
  const message = formatRequestMessage({
    appOrigin: APP_ORIGIN,
    type: 'preference',
    request: {
      ...preferenceRequest,
      description: '😀'.repeat(5_000),
    },
  });

  assert(message.length <= MAX_TELEGRAM_MESSAGE_LENGTH);
  assert(!message.includes('\uFFFD'));
  assertStringIncludes(
    message,
    `https://app.example.com/admin/quran/requests?type=preference&id=${PREFERENCE_ID}`,
  );
});

Deno.test('field normalization removes control characters and caps text', () => {
  assertEquals(sanitizeText('سطر\u0000أول\nسطر ثان', 100), 'سطر أول\nسطر ثان');
  assertEquals(sanitizeText('abcdef', 4), 'abc…');
  assertEquals(Array.from(sanitizeText('مرحبا', 3)).length, 3);
});

Deno.test('admin URL uses the public origin and encodes query values', () => {
  assertEquals(
    buildAdminRequestUrl('https://app.example.com///', 'preference', PREFERENCE_ID),
    `https://app.example.com/admin/quran/requests?type=preference&id=${PREFERENCE_ID}`,
  );
  assertThrows(() => buildAdminRequestUrl('', 'preference', PREFERENCE_ID));
  assertThrows(() => normalizeAppOrigin('ftp://app.example.com'));
  assertEquals(normalizeAppOrigin('https://app.example.com/'), 'https://app.example.com');
});
