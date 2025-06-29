@@ .. @@
 -- Create storage bucket for audio files
 INSERT INTO storage.buckets (id, name, public) VALUES ('audio_stories', 'audio_stories', true) ON CONFLICT (id) DO NOTHING;

+-- Create storage bucket for souvenir images if not exists
+INSERT INTO storage.buckets (id, name, public) VALUES ('souvenir_images', 'souvenir_images', true) ON CONFLICT (id) DO NOTHING;
+
 -- Policies for storage
 CREATE POLICY "Anyone can read audio files" ON storage.objects FOR SELECT USING (bucket_id = 'audio_stories');
 CREATE POLICY "Authenticated users can upload audio files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'audio_stories');
+
+-- Policies for souvenir images storage
+CREATE POLICY "Anyone can read souvenir images" ON storage.objects FOR SELECT USING (bucket_id = 'souvenir_images');
+CREATE POLICY "Authenticated users can upload souvenir images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'souvenir_images');