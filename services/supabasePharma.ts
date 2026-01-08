
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lqvliyoztsgajwuvkjiq.supabase.co';
const supabaseKey = 'sb_publishable_KmAVurbIKYTBAYNab9cvUQ_x8LdY8h9';

// This client is dedicated EXCLUSIVELY to the Pharmacy and Patient Portal
// It maintains total isolation from the Doctor's medical records
export const supabasePharma = createClient(supabaseUrl, supabaseKey);
