import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BOT_SECRET = Deno.env.get('TELEGRAM_BOT_SECRET_TOKEN') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';

// Helper to send message back to Telegram
async function sendTelegramMessage(chatId: number, text: string) {
  if (!TELEGRAM_BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
      }),
    });
  } catch (e) {
    console.error('Error sending telegram message:', e);
  }
}

// Convert Eastern Arabic Numerals (٠١٢٣٤٥٦٧٨٩) to standard digits if needed,
// but the database allows text for verses so we can store them as is or clean them.
function cleanText(val: string | null): string | null {
  if (!val) return null;
  return val.replace(/[*_~`]/g, '').trim();
}

function parseQuranLesson(text: string) {
  const getMatch = (regex: RegExp) => {
    const match = text.match(regex);
    return match ? cleanText(match[1]) : null;
  };

  // Extract Student Name
  // تقييم الأخ: أحمد حمدى
  const studentName = getMatch(/تقييم\s+الأخ[ة]?\s*[:*：]?\s*([^\n.]+)/i);

  // Extract Hijri Date (line starting with 📜 containing هـ or ه)
  const hijriMatch = text.match(/📜\s*([^\n]+[\u0660-\u0669٠-٩\s]+هـ?)/i);
  const hijriDate = hijriMatch ? cleanText(hijriMatch[1]) : null;

  // Extract Gregorian Date
  // e.g. 📜١٠ يونيو ٢٠٢٦ م
  // We can parse the date to store it as YYYY-MM-DD.
  const gregMatch = text.match(/📜\s*([^\n]+(يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر|يونية|جويلية|أوت|جوان)[^\n]+)/i);
  let lessonDate = new Date().toISOString().split('T')[0]; // fallback
  if (gregMatch) {
    const dateText = gregMatch[1];
    // Simple Arabic months mapping for parsing
    const months: { [key: string]: number } = {
      'يناير': 1, 'فبراير': 2, 'مارس': 3, 'أبريل': 4, 'مايو': 5, 'يونيو': 6, 'يونية': 6,
      'يوليو': 7, 'أغسطس': 8, 'أوت': 8, 'سبتمبر': 9, 'أكتوبر': 10, 'نوفمبر': 11, 'ديسمبر': 12
    };

    // Extract numbers from dateText
    const numbers = dateText.match(/[\u0660-\u0669٠-٩\d]+/g);
    let day = 1;
    let year = 2026;
    let month = 6;

    if (numbers && numbers.length >= 2) {
      // Helper to parse Arabic/English number string
      const parseNum = (s: string) => {
        const eng = s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
        return parseInt(eng, 10);
      };
      
      day = parseNum(numbers[0]);
      if (numbers.length >= 3) {
        year = parseNum(numbers[2]);
      } else if (numbers.length === 2) {
        year = parseNum(numbers[1]);
      }

      // Find month name in text
      for (const mName of Object.keys(months)) {
        if (dateText.includes(mName)) {
          month = months[mName];
          break;
        }
      }

      try {
        const pad = (n: number) => String(n).padStart(2, '0');
        lessonDate = `${year}-${pad(month)}-${pad(day)}`;
      } catch (e) {
        console.error('Error constructing date:', e);
      }
    }
  }

  // Today's Recitation (تسميع اليوم)
  // الحاضر: الطلاق من ١ الى ٢
  const recTodaySurah = getMatch(/الحاضر\s*[:*：]?\s*([^\nمن]+)/i);
  const recTodayFrom = getMatch(/الحاضر\s*[:*：]?[^\n]+من\s*([\u0660-\u0669٠-٩\d]+)/i);
  const recTodayTo = getMatch(/الحاضر\s*[:*：]?[^\n]+(?:الى|إلى)\s*([\u0660-\u0669٠-٩\d]+)/i);

  // level of today's recitation
  // الحاضر:جيدجدا (under مستوى الحفظ)
  // We can do a segment match to avoid mixing today's recitation with today's homework
  const levelSection = text.split(/📌\s*مستوى\s+الحفظ\s*[:*：]?/i)[1] || '';
  const levelToday = levelSection.match(/الحاضر\s*[:*：]?\s*([^\n]+)/i)?.[1]?.replace(/[*_~`]/g, '').trim() || null;
  const levelPast = levelSection.match(/الماضى\s*[:*：]?\s*([^\n]+)/i)?.[1]?.replace(/[*_~`]/g, '').trim() || null;

  // Past Recitation (الماضى)
  const recPastSurah = getMatch(/الماضى\s*[:*：]?\s*([^\n]+)/i);

  // Reading (القراءة)
  // 📌 القراءة: الطلاق من ١ الى ٥
  const readingSurah = getMatch(/القراءة\s*[:*：]?\s*([^\nمن]+)/i);
  const readingFrom = getMatch(/القراءة\s*[:*：]?[^\n]+من\s*([\u0660-\u0669٠-٩\d]+)/i);
  const readingTo = getMatch(/القراءة\s*[:*：]?[^\n]+(?:الى|إلى)\s*([\u0660-\u0669٠-٩\d]+)/i);
  
  const readingLevel = getMatch(/مستوى\s+القراءة\s*[:*：]?\s*([^\n]+)/i);

  // Tajweed (التجويد)
  const tajweed = getMatch(/التجويد\s*[:*：]?\s*([^\n]+)/i);

  // General Notes (ملاحظات عامة)
  const notes = getMatch(/ملاحظات\s+عامة\s*[:*：]?\s*([^\n🍁]+)/i);

  // Interaction (التفاعل)
  const interaction = getMatch(/التفاعل\s*[:*：]?\s*([^\n.]+)/i);

  // Homework (الواجبات)
  const hwSection = text.split(/📌\s*الواجبات\s*[:*：]?/i)[1] || '';
  const hwTodaySurah = hwSection.match(/الحاضر\s*[:*：]?\s*([^\nمن]+)/i)?.[1]?.replace(/[*_~`]/g, '').trim() || null;
  const hwTodayFrom = hwSection.match(/الحاضر\s*[:*：]?[^\n]+من\s*([\u0660-\u0669٠-٩\d]+)/i)?.[1]?.trim() || null;
  const hwTodayTo = hwSection.match(/الحاضر\s*[:*：]?[^\n]+(?:الى|إلى)\s*([\u0660-\u0669٠-٩\d]+)/i)?.[1]?.trim() || null;
  const hwPastSurah = hwSection.match(/الماضى\s*[:*：]?\s*([^\n]+)/i)?.[1]?.replace(/[*_~`]/g, '').trim() || null;

  return {
    studentName,
    hijri_date: hijriDate,
    lesson_date: lessonDate,
    recitation_today_surah: recTodaySurah,
    recitation_today_from: recTodayFrom,
    recitation_today_to: recTodayTo,
    recitation_today_level: levelToday || 'ممتاز',
    recitation_past_surah: recPastSurah,
    recitation_past_level: levelPast || 'ممتاز',
    reading_surah: readingSurah,
    reading_from: readingFrom,
    reading_to: readingTo,
    reading_level: readingLevel || 'ممتاز',
    tajweed_lesson: tajweed,
    general_notes: notes,
    interaction_level: interaction || 'ممتاز',
    homework_today_surah: hwTodaySurah,
    homework_today_from: hwTodayFrom,
    homework_today_to: hwTodayTo,
    homework_past_surah: hwPastSurah,
  };
}

serve(async (req) => {
  // Webhook verification header (if set)
  if (BOT_SECRET && req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== BOT_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response('Invalid body', { status: 400 });
  }

  const message = body?.message;
  const chatId = message?.chat?.id;
  const text = message?.text ?? '';

  if (!text || !chatId) {
    return new Response('ok');
  }

  // Only trigger on messages containing evaluation keywords
  if (!text.includes('تقييم الأخ') && !text.includes('تسميع اليوم')) {
    return new Response('ok');
  }

  try {
    const parsed = parseQuranLesson(text);
    if (!parsed.studentName) {
      await sendTelegramMessage(chatId, '❌ لم يتم العثور على اسم الطالب في الرسالة. تأكد من وجود سطر "تقييم الأخ: الاسم".');
      return new Response('ok');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Find student profile by name
    const { data: student, error: searchError } = await supabase
      .from('student_profiles')
      .select('id, full_name')
      .ilike('full_name', `%${parsed.studentName}%`)
      .maybeSingle();

    if (searchError) throw searchError;

    if (!student) {
      // Try again with word-by-word token matching
      const words = parsed.studentName.split(/\s+/).filter(w => w.length > 2);
      let query = supabase.from('student_profiles').select('id, full_name');
      if (words.length > 0) {
        query = query.ilike('full_name', `%${words[0]}%`);
      }
      const { data: altStudents } = await query.limit(5);

      if (altStudents && altStudents.length === 1) {
        // Only one alternative matches, use it
        parsed.studentName = altStudents[0].full_name;
        // Proceed with altStudents[0]
      } else {
        const optionsList = altStudents && altStudents.length > 0
          ? `\nهل تقصد:\n` + altStudents.map(s => `• ${s.full_name}`).join('\n')
          : '';
        await sendTelegramMessage(chatId, `❌ لم يتم العثور على حساب طالب بالاسم "${parsed.studentName}" في النظام.${optionsList}`);
        return new Response('ok');
      }
    }

    const resolvedStudentId = student?.id ?? '';
    const resolvedStudentName = student?.full_name ?? parsed.studentName;

    // Insert quran lesson
    const { studentName, ...insertPayload } = parsed;
    const { error: insertError } = await supabase
      .from('student_quran_lessons')
      .insert([{
        student_id: resolvedStudentId,
        ...insertPayload
      }]);

    if (insertError) throw insertError;

    await sendTelegramMessage(
      chatId,
      `✅ تم بنجاح تسجيل تقرير درس القرآن الكريم للطالب: *${resolvedStudentName}*\n📅 بتاريخ: ${parsed.lesson_date}`
    );

  } catch (err: any) {
    console.error('Error handling Telegram Webhook:', err);
    await sendTelegramMessage(chatId, `❌ خطأ في معالجة الطلب: ${err.message || err}`);
  }

  return new Response('ok');
});
