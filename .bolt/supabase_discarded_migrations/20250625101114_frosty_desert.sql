/*
  # Create storage bucket for souvenir images

  1. Storage Setup
    - Create `souvenir_images` bucket for user-uploaded images
    - Enable public access for sharing images

  2. Security
    - Allow public read access to images
    - Restrict upload/update/delete to authenticated users
    - Users can manage their own uploaded images
*/

-- Create storage bucket for souvenir images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('souvenir_images', 'souvenir_images', true) 
ON CONFLICT (id) DO NOTHING;

-- Policies for image storage
CREATE POLICY "Anyone can read souvenir images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'souvenir_images');

CREATE POLICY "Authenticated users can upload souvenir images" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'souvenir_images');

CREATE POLICY "Users can update their own souvenir images" 
ON storage.objects FOR UPDATE TO authenticated 
USING (bucket_id = 'souvenir_images');

CREATE POLICY "Users can delete their own souvenir images" 
ON storage.objects FOR DELETE TO authenticated 
USING (bucket_id = 'souvenir_images');