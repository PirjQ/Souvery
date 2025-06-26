/*
  # Story Souvenir Database Schema

  1. New Tables
    - `souvenirs` - Main table for storing audio-visual story memories
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `user_id` (uuid, foreign key to auth.users)
      - `title` (text)
      - `audio_url` (text)
      - `image_url` (text)
      - `transcript_text` (text)
      - `algorand_tx_id` (text, nullable)
      - `latitude` (numeric)
      - `longitude` (numeric)

  2. Storage
    - `audio_stories` bucket for storing uploaded audio files

  3. Security
    - Enable RLS on `souvenirs` table
    - Allow public read access to discover all stories
    - Restrict write operations to authenticated users for their own content
    - Public read access to audio storage for sharing
*/

-- Create the souvenirs table
CREATE TABLE IF NOT EXISTS public.souvenirs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  audio_url text NOT NULL,
  image_url text NOT NULL,
  transcript_text text NOT NULL,
  algorand_tx_id text,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.souvenirs ENABLE ROW LEVEL SECURITY;

-- Policies for souvenirs table
CREATE POLICY "Anyone can read souvenirs" ON public.souvenirs FOR SELECT USING (true);
CREATE POLICY "Users can create their own souvenirs" ON public.souvenirs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own souvenirs" ON public.souvenirs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own souvenirs" ON public.souvenirs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) VALUES ('audio_stories', 'audio_stories', true) ON CONFLICT (id) DO NOTHING;

-- Policies for storage
CREATE POLICY "Anyone can read audio files" ON storage.objects FOR SELECT USING (bucket_id = 'audio_stories');
CREATE POLICY "Authenticated users can upload audio files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'audio_stories');