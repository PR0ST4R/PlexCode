/**
 * PlexCode — Supabase Client
 *
 * SETUP: Replace the two placeholders below with your
 * Supabase project URL and anon key from:
 * https://supabase.com/dashboard → Settings → API
 */

const SUPABASE_URL = 'https://gvtnpezcijjwyznvmach.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xTdVBdgQYYfl4QAhO7PeIg_XvkBKDYp';

// Import Supabase from CDN (loaded via importmap in index.html)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export default supabase;
