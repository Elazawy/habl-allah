import { supabase } from '../lib/supabase';

export const SUBSCRIBED_STATUSES = ['accepted', 'active', 'failed', 'completed'];

export async function fetchMyCompetitionParticipants() {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) return [];
  const { data, error } = await supabase.from('competition_guest_participants')
    .select('*, quran_competitions(id, slug, name, name_en, name_tr, short_description, short_description_en, short_description_tr, start_date, available_levels, available_levels_en, available_levels_tr), competition_stages(id, name, name_en, name_tr, description, description_en, description_tr, sort_order)')
    .eq('student_id', user.id);
  if (error) throw error;
  return data ?? [];
}
