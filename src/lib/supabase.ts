import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * True when the build was given Supabase credentials. When false, the app shows
 * a friendly configuration notice instead of crashing — useful for local dev
 * before you have created the project.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * The shared Supabase client. Only the PUBLIC anon key is used here; security is
 * enforced server-side by Row-Level Security. The secret service-role key must
 * NEVER appear in the frontend or repository.
 */
export const supabase: SupabaseClient = createClient(
  url ?? 'https://placeholder.supabase.co',
  anonKey ?? 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'uab-invoice-auth',
    },
  },
);
