import { supabase } from '../lib/supabase';

export async function fetchLectureQuestions(lectureId) {
  const { data, error } = await supabase
    .from('course_lecture_questions')
    .select('*, student_profiles(full_name)')
    .eq('lecture_id', lectureId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function submitQuestion(lectureId, questionTitle) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('يجب تسجيل الدخول لطرح سؤال.');

  const { data, error } = await supabase
    .from('course_lecture_questions')
    .insert([{ lecture_id: lectureId, student_id: user.id, question_title: questionTitle }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function replyToQuestion(questionId, reply) {
  const { data, error } = await supabase
    .from('course_lecture_questions')
    .update({
      admin_reply: reply,
      replied_at: new Date().toISOString(),
      is_answered: true,
    })
    .eq('id', questionId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchAllUnansweredQuestions() {
  const { data, error } = await supabase
    .from('course_lecture_questions')
    .select('*, student_profiles(full_name), quran_course_lectures(title, course_id, quran_courses(name))')
    .eq('is_answered', false)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
