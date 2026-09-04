import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

const supabaseUrl = PUBLIC_SUPABASE_URL || 'https://cinqnzdshgvrsntvltvm.supabase.co';
const supabaseKey = PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_TtHgHEzWtYcPG7wK9HE3Jw_y6O1k88J';

export const supabase = createClient(supabaseUrl, supabaseKey);
