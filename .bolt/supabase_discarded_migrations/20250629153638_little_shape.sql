/*
  # Add souvenir_images storage bucket

  1. Storage
    - `souvenir_images` bucket for storing uploaded images and metadata files

  2. Security
    - Public read access for images and metadata
    - Authenticated users can upload files
*/

-- Create storage bucket for souvenir images and metadata
INSERT INTO storage.buckets (id, name, public) 
VALUES ('souvenir_images', 'souvenir_images', true) 
ON CONFLICT (id) DO NOTHING;

-- Policies for souvenir_images storage
CREATE POLICY "Anyone can read souvenir images and metadata" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'souvenir_images');

CREATE POLICY "Authenticated users can upload souvenir images and metadata" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'souvenir_images');

CREATE POLICY "Users can update their own souvenir files" 
ON storage.objects FOR UPDATE TO authenticated 
USING (bucket_id = 'souvenir_images');

CREATE POLICY "Users can delete their own souvenir files" 
ON storage.objects FOR DELETE TO authenticated 
USING (bucket_id = 'souvenir_images');