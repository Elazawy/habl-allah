import { supabase } from '../lib/supabase';

export async function fetchStudentLessons(studentId) {
  const { data, error } = await supabase
    .from('student_quran_lessons')
    .select('*')
    .eq('student_id', studentId)
    .order('lesson_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchMyLessons() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  return fetchStudentLessons(user.id);
}

export async function addQuranLesson(studentId, lessonData) {
  const { data, error } = await supabase
    .from('student_quran_lessons')
    .insert([{ student_id: studentId, ...lessonData }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateQuranLesson(id, lessonData) {
  const { data, error } = await supabase
    .from('student_quran_lessons')
    .update(lessonData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteQuranLesson(id) {
  const { error } = await supabase
    .from('student_quran_lessons')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
