import { supabase } from '../lib/supabase';

export const SUBSCRIBED_STATUSES = ['accepted', 'active', 'failed', 'completed'];

export async function fetchMyCompetitionParticipants() {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) return [];
  const { data, error } = await supabase.from('competition_guest_participants')
    .select('*, quran_competitions(id, slug, name, short_description, start_date), competition_stages(id, name, sort_order)')
    .eq('student_id', user.id);
  if (error) throw error;
  return data ?? [];
}
