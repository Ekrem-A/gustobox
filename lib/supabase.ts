import { createClient } from "@supabase/supabase-js";

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  available: boolean;
  sort_order: number;
  created_at: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const hasProjectUrl = Boolean(supabaseUrl && !supabaseUrl.includes("your-project"));
const hasPublicKey = Boolean(supabaseAnonKey && !supabaseAnonKey.includes("your-supabase"));

export const isSupabaseConfigured = hasProjectUrl && hasPublicKey;
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null;