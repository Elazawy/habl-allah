import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase
    .from('student_competition_subscriptions')
    .select('*, quran_competitions(id, slug, name, short_description, start_date), student_stage_assignments(status, level, current_stage_id, final_rank, competition_stages(name))')
    .limit(1);
  console.log(JSON.stringify(data, null, 2));
}
run();
