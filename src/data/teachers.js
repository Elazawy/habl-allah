/**
 * Teachers mock data — Supabase-ready schema
 * ──────────────────────────────────────────
 * When connecting Supabase, this file becomes a fallback only.
 * The teachersService.js reads from Supabase when available.
 *
 * Supabase tables to create:
 *   teachers (id, name, gender, bio, photo_url, recitation_url,
 *             recitation_type, created_at)
 *   teacher_reviews (id, teacher_id, student_name, rating, text, created_at)
 *   preference_requests (id, student_name, age, whatsapp, description,
 *                        gender_preference, created_at)
 *   subscription_requests (id, teacher_id, teacher_name, student_name,
 *                          whatsapp, created_at)
 */

// Using picsum.photos for placeholder male teacher photos
// Replace with real photos when available
export const mockTeachers = [
  // ─── Male teachers ─────────────────────────────────────────────────────
  {
    id: 'teacher-male-001',
    name: 'الشيخ أحمد محمود',
    gender: 'male',
    bio: 'حافظ لكتاب الله برواية حفص عن عاصم، حاصل على إجازة بالقراءات العشر الكبرى من شيخه الجليل. تجاوزت خبرته في تعليم القرآن الكريم خمس عشرة سنة، أشرف خلالها على تحفيظ وتصحيح أكثر من ثلاثمائة طالب وطالبة في مراحل عمرية متنوعة. متخصص في تأسيس المبتدئين وعلاج أخطاء التجويد الشائعة.',
    photo_url: 'https://i.pravatar.cc/200?img=51',
    recitation_url: null, // ضع مسار الملف هنا عند الرفع
    recitation_type: 'audio',
    reviews: [
      { id: 'r1', student_name: 'محمد علي', rating: 5, text: 'من أفضل المعلمين الذين تعلمت على يدهم، صبور جداً ومتقن', created_at: '2024-11-10' },
      { id: 'r2', student_name: 'أحمد سالم', rating: 5, text: 'تعلمت التجويد في أقل من شهرين بفضل أسلوبه الرائع', created_at: '2025-01-05' },
      { id: 'r3', student_name: 'عمر حسن', rating: 4, text: 'معلم ممتاز، مواعيده منتظمة وشرحه واضح', created_at: '2025-03-20' },
    ],
  },
  {
    id: 'teacher-male-002',
    name: 'الشيخ عمر عبد الله',
    gender: 'male',
    bio: 'معلم قرآن كريم متخصص في تعليم الأطفال والناشئين، خريج كلية القرآن الكريم بالجامعة الإسلامية. يعتمد منهجاً تفاعلياً قائماً على التكرار المنظم والتعزيز الإيجابي. آتت طريقته أُكُلها مع مئات الأطفال ممن أتموا حفظ القرآن في سن مبكرة.',
    photo_url: 'https://i.pravatar.cc/200?img=57',
    recitation_url: null,
    recitation_type: 'video',
    reviews: [
      { id: 'r4', student_name: 'والد الطالب يوسف', rating: 5, text: 'حفظ ابني عشرة أجزاء في سنة واحدة، شكراً للشيخ عمر', created_at: '2025-02-14' },
      { id: 'r5', student_name: 'أم سلمى', rating: 5, text: 'أسلوبه مع الأطفال رائع ومحفز، ابنتي تنتظر الحصة بفارغ الصبر', created_at: '2025-04-01' },
    ],
  },
  {
    id: 'teacher-male-003',
    name: 'الشيخ يوسف إبراهيم',
    gender: 'male',
    bio: 'متخصص في القراءات السبع وعلم الأداء القرآني، حاصل على سند متصل برواية ورش عن نافع ورواية حفص عن عاصم. يُعنى بتصحيح المخارج والصفات وترسيخ أحكام التجويد لدى المتوسطين والمتقدمين.',
    photo_url: 'https://i.pravatar.cc/200?img=60',
    recitation_url: null,
    recitation_type: 'audio',
    reviews: [
      { id: 'r6', student_name: 'خالد مصطفى', rating: 5, text: 'درست عنده التجويد المتقدم وما شاء الله علمه واسع', created_at: '2025-01-18' },
      { id: 'r7', student_name: 'طارق نصر', rating: 4, text: 'يشرح المخارج بطريقة علمية دقيقة وممتعة', created_at: '2025-05-10' },
    ],
  },
  {
    id: 'teacher-male-004',
    name: 'الشيخ محمد السيد',
    gender: 'male',
    bio: 'حافظ للقرآن الكريم منذ سن الثانية عشرة، حاصل على إجازة في علوم التجويد والقراءات. له خبرة واسعة في تعليم البالغين الذين يبدأون رحلة الحفظ من الصفر، ويتميز بأسلوب مرن يراعي ظروف كل طالب.',
    photo_url: 'https://i.pravatar.cc/200?img=52',
    recitation_url: null,
    recitation_type: 'audio',
    reviews: [
      { id: 'r8', student_name: 'وليد جمال', rating: 5, text: 'أفضل قرار اتخذته هو الالتحاق بالشيخ محمد، صبور جداً مع الكبار', created_at: '2025-02-20' },
      { id: 'r9', student_name: 'سامي رضا', rating: 5, text: 'بدأت من الصفر وحفظت جزء عم في ثلاثة أشهر', created_at: '2025-04-08' },
    ],
  },

  // ─── Female teachers ────────────────────────────────────────────────────
  {
    id: 'teacher-female-001',
    name: 'الأستاذة فاطمة عبد الرحمن',
    gender: 'female',
    bio: 'معلمة قرآن كريم بخبرة تزيد على اثنتي عشرة سنة في تعليم النساء والفتيات. حافظة لكتاب الله، متخصصة في تأسيس المبتدئات وتصحيح التلاوة، تجمع في أسلوبها بين الدقة العلمية واللطف والصبر.',
    photo_url: null,
    recitation_url: null,
    recitation_type: null,
    reviews: [
      { id: 'r10', student_name: 'نور أحمد', rating: 5, text: 'معلمة ممتازة وصبورة جداً، تعلمت معها من الصفر', created_at: '2025-01-22' },
      { id: 'r11', student_name: 'سارة محمود', rating: 5, text: 'أسلوبها محفز ومشجع، حفظت معها جزء عم في شهرين', created_at: '2025-03-05' },
    ],
  },
  {
    id: 'teacher-female-002',
    name: 'الأستاذة مريم حسن',
    gender: 'female',
    bio: 'خريجة كلية الدراسات الإسلامية، متخصصة في تعليم الأطفال والنساء قواعد التجويد وتحفيظ القرآن الكريم. تعتمد على الألواح الصوتية وتقنيات التعلم التفاعلي لجعل رحلة الحفظ ممتعة ومثمرة.',
    photo_url: null,
    recitation_url: null,
    recitation_type: null,
    reviews: [
      { id: 'r12', student_name: 'دينا عمر', rating: 5, text: 'شرحها للتجويد واضح جداً وتطبيقها عملي', created_at: '2025-02-28' },
      { id: 'r13', student_name: 'أم حبيبة', rating: 4, text: 'مواعيدها منتظمة وأسلوبها مريح', created_at: '2025-04-12' },
    ],
  },
  {
    id: 'teacher-female-003',
    name: 'الأستاذة زينب السيد',
    gender: 'female',
    bio: 'حافظة لكتاب الله برواية حفص، حاصلة على إجازة في التجويد. تتميز بأسلوبها المنهجي في تعليم المبتدئات والمحتاجات لتصحيح التلاوة، مع مراعاة الفروق الفردية بين الطالبات.',
    photo_url: null,
    recitation_url: null,
    recitation_type: null,
    reviews: [
      { id: 'r14', student_name: 'آية محمد', rating: 5, text: 'تعلمت معها الحروف من جديد وأصبح نطقي أفضل بكثير', created_at: '2025-03-30' },
      { id: 'r15', student_name: 'هبة أحمد', rating: 5, text: 'معلمة رائعة، تشرح وتصبر وتشجع', created_at: '2025-05-15' },
    ],
  },
  {
    id: 'teacher-female-004',
    name: 'الأستاذة رقية عبد العزيز',
    gender: 'female',
    bio: 'معلمة قرآن متخصصة في تعليم ذوي الاحتياجات الخاصة والكبار في السن. حاصلة على دبلوم التربية الخاصة إلى جانب إجازتها في القرآن الكريم، تؤمن بأن باب القرآن مفتوح للجميع في أي سن.',
    photo_url: null,
    recitation_url: null,
    recitation_type: null,
    reviews: [
      { id: 'r16', student_name: 'أم عبد الرحمن', rating: 5, text: 'بدأت التعلم وعمري ٦٠ سنة ولم أشعر بأي حرج، جزاها الله خيرا', created_at: '2025-01-10' },
      { id: 'r17', student_name: 'منى سعيد', rating: 5, text: 'تتعامل مع الجميع بصبر واحترام، استثنائية', created_at: '2025-05-20' },
    ],
  },
];
