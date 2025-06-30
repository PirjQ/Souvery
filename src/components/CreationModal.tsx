import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AudioRecorder } from './AudioRecorder';
import { ImageUploader } from './ImageUploader';
import { LoadingOrb } from './LoadingOrb';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface CreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
  onSouvenirCreated: () => void;
}

interface ProcessingResult {
  transcript: string;
}

export function CreationModal({ 
  isOpen, 
  onClose, 
  latitude, 
  longitude, 
  onSouvenirCreated 
}: CreationModalProps) {
  const [step, setStep] = useState(1);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setStep(1);
    setAudioBlob(null);
    setAudioUrl('');
    setImageUrl('');
    setProcessingResult(null);
    setTitle('');
    setLoading(false);
    onClose();
  };

  const handleRecordingComplete = (blob: Blob) => {
    setAudioBlob(blob);
  };

  const uploadAudio = async () => {
    if (!audioBlob) return;

    setLoading(true);
    try {
      const fileName = `audio_${Date.now()}.wav`;
      const { data, error } = await supabase.storage
        .from('audio_stories')
        .upload(fileName, audioBlob);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('audio_stories')
        .getPublicUrl(fileName);

      setAudioUrl(urlData.publicUrl);
      setStep(2);
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast.error('Failed to upload audio');
    } finally {
      setLoading(false);
    }
  };

  const processAudio = async () => {
    if (!audioUrl) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-audio`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audioUrl }),
      });

      if (!response.ok) throw new Error('Failed to process audio');

      const result = await response.json();
      setProcessingResult(result);
      setStep(3); // Move to image upload step
    } catch (error) {
      console.error('Error processing audio:', error);
      toast.error('Failed to process audio');
    } finally {
      setLoading(false);
    }
  };

  const createSouvenir = async () => {
    if (!processingResult || !title || !audioUrl || !imageUrl) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-souvenir`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          audioUrl,
          imageUrl,
          transcript: processingResult.transcript,
          latitude,
          longitude,
        }),
      });

      if (!response.ok) throw new Error('Failed to create souvenir');

      toast.success('Story souvenir created successfully!');
      onSouvenirCreated();
      handleClose();
    } catch (error) {
      console.error('Error creating souvenir:', error);
      toast.error('Failed to create souvenir');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-cyan-500/20 text-white max-w-2xl z-[9999]">
        <DialogHeader>
          <DialogTitle className="text-cyan-400 text-xl">Create Your Story Souvenir</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Progress value={(step / 4) * 100} className="w-full" />

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-4">
                  <h3 className="text-lg font-medium text-cyan-400">Record Your Memory</h3>
                  <p className="text-gray-300">
                    Share a personal story or memory. It can be anything that's meaningful to you.
                  </p>
                </div>

                <AudioRecorder 
                  onRecordingComplete={handleRecordingComplete}
                  disabled={loading}
                />

                {audioBlob && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center"
                  >
                    <Button
                      onClick={uploadAudio}
                      disabled={loading}
                      className="bg-cyan-500 hover:bg-cyan-400 text-gray-900"
                    >
                      {loading ? (
                        <>
                          <LoadingOrb size="sm" className="mr-2" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload & Continue
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 text-center"
              >
                <h3 className="text-lg font-medium text-cyan-400">Processing Your Story</h3>
                <p className="text-gray-300">
                  Our AI is transcribing your audio and creating a unique visual artwork...
                </p>

                <LoadingOrb size="lg" className="my-8" />

                <Button
                  onClick={processAudio}
                  disabled={loading}
                  className="bg-cyan-500 hover:bg-cyan-400 text-gray-900"
                >
                  {loading ? 'Processing...' : 'Process Audio'}
                </Button>
              </motion.div>
            )}

            {step === 3 && processingResult && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-medium text-cyan-400 text-center">Add Your Image</h3>
                <p className="text-gray-300 text-center">
                  Upload an image that represents your memory
                </p>

                <ImageUploader
                  onImageUploaded={setImageUrl}
                  disabled={loading}
                />

                <div className="space-y-3">
                  <Label className="text-cyan-400">Your Story Transcript</Label>
                  <div className="bg-gray-800 p-4 rounded-lg border border-cyan-500/20 max-h-32 overflow-y-auto">
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {processingResult.transcript}
                    </p>
                  </div>
                </div>

                {imageUrl && (
                  <div className="flex justify-center">
                    <Button
                      onClick={() => setStep(4)}
                      disabled={loading}
                      className="bg-cyan-500 hover:bg-cyan-400 text-gray-900"
                    >
                      Continue to Review
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {step === 4 && processingResult && imageUrl && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-medium text-cyan-400 text-center">Review & Finalize</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-cyan-400">Your Image</Label>
                    <motion.img
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      src={imageUrl}
                      alt="Your uploaded image"
                      className="w-full h-48 object-cover rounded-lg border border-cyan-500/20"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-cyan-400">Transcript</Label>
                    <div className="bg-gray-800 p-4 rounded-lg border border-cyan-500/20 h-48 overflow-y-auto">
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {processingResult.transcript}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title" className="text-cyan-400">Story Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Give your story a title..."
                    className="bg-gray-800 border-cyan-500/20 focus:border-cyan-400 text-white"
                  />
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={createSouvenir}
                    disabled={loading || !title.trim() || !imageUrl}
                    className="bg-cyan-500 hover:bg-cyan-400 text-gray-900"
                  >
                    {loading ? (
                      <>
                        <LoadingOrb size="sm" className="mr-2" />
                        Creating Souvenir...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Create Souvenir
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}