import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Avoid crashing at module load time if variables are missing.
// This will throw an error only when you actually try to use the supabase client.
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : new Proxy({} as any, {
      get: () => {
        throw new Error('Missing Supabase environment variables. Please configure SUPABASE_URL and SUPABASE_ANON_KEY in your Vercel project settings.');
      }
    });
