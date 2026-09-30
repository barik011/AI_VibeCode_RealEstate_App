import { createClient } from '@supabase/supabase-js';

export const isSupabase = import.meta.env?.VITE_DATA_BACKEND === 'supabase';
const url = import.meta.env?.VITE_SUPABASE_URL;
const key =
  import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY;
export const supabase =
  isSupabase && url && key
    ? createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          // This client-only app accepts administrator invitation and recovery links.
          flowType: 'implicit',
        },
      })
    : null;
export function requireSupabase() {
  if (!supabase)
    throw new Error(
      'Supabase configuration is missing. Set the URL and publishable key in .env.local.',
    );
  return supabase;
}
export function backendError(error) {
  if (['PGRST205', 'PGRST202', '42P01'].includes(error?.code))
    return new Error(
      'The Supabase database is not initialized yet. Apply the project migrations and seed data first.',
    );
  return new Error(error?.message || 'Unable to reach Supabase. Please try again.');
}
