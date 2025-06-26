import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Souvenir = {
  id: string;
  created_at: string;
  user_id: string;
  title: string;
  audio_url: string;
  image_url: string;
  transcript_text: string;
  algorand_tx_id: string | null;
  latitude: number;
  longitude: number;
};

export type Profile = {
  id: string;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
};