import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface ImageUploaderProps {
  onImageUploaded: (imageUrl: string) => void;
  disabled?: boolean;
  currentImage?: string;
}

export function ImageUploader({ onImageUploaded, disabled, currentImage }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(currentImage || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      // Create preview URL
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);

      // Upload to Supabase storage
      const fileName = `souvenir_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${file.name.split('.').pop()}`;
      
      const { data, error } = await supabase.storage
        .from('souvenir_images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('souvenir_images')
        .getPublicUrl(fileName);

      onImageUploaded(urlData.publicUrl);
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      setPreviewUrl('');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl('');
    onImageUploaded('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      <AnimatePresence mode="wait">
        {!previewUrl ? (
          <motion.div
            key="upload-area"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="border-2 border-dashed border-cyan-500/30 rounded-lg p-8 text-center hover:border-cyan-400/50 transition-colors cursor-pointer"
            onClick={triggerFileSelect}
          >
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-cyan-400 mb-2">Upload Your Image</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Choose an image that represents your memory
                </p>
                <Button
                  type="button"
                  disabled={disabled || uploading}
                  className="bg-cyan-500 hover:bg-cyan-400 text-gray-900"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerFileSelect();
                  }}
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Select Image
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Supports JPG, PNG, GIF up to 5MB
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview-area"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative"
          >
            <div className="relative rounded-lg overflow-hidden border border-cyan-500/20">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-48 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              
              <button
                onClick={handleRemoveImage}
                disabled={disabled || uploading}
                className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-400 text-white rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-cyan-400">Image ready</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={triggerFileSelect}
                disabled={disabled || uploading}
                className="border-cyan-500/20 hover:border-cyan-400 hover:bg-cyan-500/10 text-cyan-400"
              >
                Change Image
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}