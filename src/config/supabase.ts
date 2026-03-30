/**
 * Supabase client configuration
 *
 * SETUP STEPS:
 * 1. Go to https://supabase.com and create a free project
 * 2. In your project dashboard go to Settings → API
 * 3. Copy the Project URL and anon/public key into your .env file
 * 4. Run the SQL schema in supabase/schema.sql via the Supabase SQL editor
 *
 * The JS SDK has zero native dependencies — no CocoaPods, no gradle changes needed.
 */
import 'react-native-url-polyfill/auto';
import {createClient} from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://xhqmzryqwnbcdmwvfyev.supabase.co';
const supabaseAnonKey = 'sb_publishable_R_a0VuhwGIEp7w-2Jpf-2g_re5eo996';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** Table names — single source of truth */
export const TABLES = {
  PROFILES: 'profiles',
  MEDITATION_LOGS: 'meditation_logs',
  USER_STATS: 'user_stats',
} as const;
