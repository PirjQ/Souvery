import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase-client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Mic, Square, Upload, X, CheckCircle, ImageUp, Save, MapPin } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { LoadingOrb } from './LoadingOrb';
import { useSouvenirs } from '@/hooks/useSouvenirs';
import { Souvenir } from '@/types';

interface CreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: { lat: number; lng: number };
}

export function CreationModal({ isOpen, onClose, location }: CreationModalProps) {
  const [step, setStep] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [processingResult, setProcessingResult] = useState<{ transcript: string } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');

  const { addSouvenir } = useSouvenirs();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      recorder.start();

      const audioChunks: Blob[] = [];
      recorder.ondataavailable = event => {
        audioChunks.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/wav' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop()); // Stop the microphone access
      };

      setIsRecording(true);
      setRecordingTime(0);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Microphone access denied. Please allow microphone access in your browser settings.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleUploadAndProcess = async () => {
    if (!audioBlob) return;

    setLoading(true);
    setStep(2); // Immediately go to the processing screen

    try {
      // 1. Upload Audio
      const fileName = `audio_${Date.now()}.wav`;
      const { error: uploadError } = await supabase.storage
        .from('audio_stories')
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('audio_stories')
        .getPublicUrl(fileName);

      const newAudioUrl = urlData.publicUrl;
      setAudioUrl(newAudioUrl);

      // 2. Process Audio automatically
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-audio`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audioUrl: newAudioUrl }),
      });

      if (!response.ok) {
          const errorBody = await response.text();
          console.error("Audio processing failed:", errorBody);
          throw new Error('Failed to process audio');
      }

      const result = await response.json();
      setProcessingResult(result);
      setStep(3); // Move to image upload step on success

    } catch (error) {
      console.error('Error uploading or processing audio:', error);
      toast.error('Failed to process your story. Please try again.');
      setStep(1); // Go back to the recording step on failure
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setStep(4); // Move to generate image step
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.jpg'] },
    multiple: false,
  });

  const generateImage = async () => {
    if (!processingResult?.transcript) return;
    setLoading(true);
    setStep(5); // Show generating view

    try {
      const { data: { session } } = await supabase.auth.getSession();
       if (!session?.access_token) throw new Error('Not authenticated');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: processingResult.transcript }),
      });

       if (!response.ok) {
        const errorBody = await response.text();
        console.error("Image generation failed:", errorBody);
        throw new Error('Failed to generate image');
       }

      const { imageUrl } = await response.json();
      setGeneratedImageUrl(imageUrl);
      setStep(6);
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Could not generate an image from your story. Please try again.');
      setStep(3); // Go back to transcript view
    } finally {
      setLoading(false);
    }
  };


  const handleSaveSouvenir = async () => {
    if (!processingResult || !generatedImageUrl || !audioUrl || !location) {
        toast.error('Missing some information for the souvenir.');
        return;
    }
    setLoading(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated.');

        const newSouvenir: Omit<Souvenir, 'id' | 'created_at'> = {
            user_id: user.id,
            title: title || 'My Story',
            story: story || processingResult.transcript,
            audio_url: audioUrl,
            image_url: generatedImageUrl,
            location: `POINT(${location.lng} ${location.lat})`,
            transcript: processingResult.transcript,
        };

        const { data, error } = await supabase
            .from('souvenirs')
            .insert([newSouvenir])
            .select()
            .single();

        if (error) throw error;
        
        addSouvenir(data as Souvenir);
        toast.success('Your Souvenir has been saved!');
        handleClose();

    } catch (error: any) {
        console.error('Error saving souvenir:', error);
        toast.error(`Failed to save your souvenir: ${error.message}`);
    } finally {
        setLoading(false);
    }
  };


  const resetState = () => {
    setStep(1);
    setIsRecording(false);
    setAudioBlob(null);
    setAudioUrl(null);
    setMediaRecorder(null);
    setRecordingTime(0);
    setLoading(false);
    setProcessingResult(null);
    setImageFile(null);
    setImagePreview(null);
    setGeneratedImageUrl(null);
    setTitle('');
    setStory('');
  };

  const handleClose = () => {
    if (isRecording) {
      stopRecording();
    }
    resetState();
    onClose();
  };

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const renderContent = () => {
    switch (step) {
      case 1: // Record Audio
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col items-center justify-center space-y-6"
          >
            <h3 className="text-xl font-medium text-cyan-400">Record Your Story</h3>
            {!audioBlob ? (
              <div className="flex flex-col items-center space-y-4">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${
                    isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-cyan-500 hover:bg-cyan-400'
                  }`}
                >
                  {isRecording ? <Square className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-gray-900" />}
                </button>
                <p className="text-lg font-mono text-gray-300">{formatTime(recordingTime)}</p>
                <p className="text-sm text-gray-400">{isRecording ? 'Press to stop' : 'Press to start recording'}</p>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
                <h4 className="text-lg text-gray-200">Recording complete!</h4>
                <audio src={URL.createObjectURL(audioBlob)} controls className="w-full" />
              </div>
            )}
            <div className="flex space-x-4">
              <Button variant="ghost" onClick={handleClose}>Cancel</Button>
              {audioBlob && (
                <Button
                    onClick={handleUploadAndProcess}
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
              )}
            </div>
          </motion.div>
        );

      case 2: // Processing Audio
        return (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 text-center"
            >
              <h3 className="text-lg font-medium text-cyan-400">Processing Your Story</h3>
              <p className="text-gray-300">
                Our AI is transcribing your audio. This may take a moment...
              </p>
              <LoadingOrb size="lg" className="my-8" />
            </motion.div>
        );

      case 3: // Show Transcript & Upload Image
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h3 className="text-xl font-medium text-cyan-400">Your Story Transcript</h3>
            <div className="bg-gray-800/50 p-4 rounded-md max-h-40 overflow-y-auto">
              <p className="text-gray-300">{processingResult?.transcript}</p>
            </div>
            <p className="text-sm text-gray-400 text-center pt-2">
                Use this transcript to generate an image for your Souvenir.
            </p>
            <div className="flex justify-center space-x-4 pt-4">
               <Button variant="outline" onClick={() => setStep(1)}>
                 Re-record
               </Button>
               <Button onClick={generateImage} className="bg-cyan-500 hover:bg-cyan-400 text-gray-900">
                 <ImageUp className="w-4 h-4 mr-2" />
                 Generate Image
               </Button>
            </div>
          </motion.div>
        );
      
      case 4: // This step is now skipped as we auto-generate, but keeping for reference if needed
        return (<div>Step 4 Placeholder</div>);

      case 5: // Generating Image
        return (
            <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 text-center"
            >
                <h3 className="text-lg font-medium text-cyan-400">Creating Your Image</h3>
                <p className="text-gray-300">
                    The AI is painting a picture based on your story...
                </p>
                <LoadingOrb size="lg" className="my-8" />
            </motion.div>
        );

      case 6: // Final Review and Save
        return (
            <motion.div
                key="step6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
            >
                <h3 className="text-xl font-medium text-cyan-400">Your Souvenir is Ready!</h3>
                {generatedImageUrl && (
                    <img src={generatedImageUrl} alt="Generated from story" className="rounded-lg w-full" />
                )}
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Give your souvenir a title..."
                    className="w-full bg-gray-800 text-white p-2 rounded-md border border-gray-700 focus:ring-cyan-500 focus:border-cyan-500"
                />
                 <textarea
                    value={story}
                    onChange={(e) => setStory(e.target.value)}
                    placeholder="Edit your story if you'd like..."
                    rows={3}
                    className="w-full bg-gray-800 text-white p-2 rounded-md border border-gray-700 focus:ring-cyan-500 focus:border-cyan-500"
                    defaultValue={processingResult?.transcript}
                />
                <div className="flex justify-end space-x-4 pt-4">
                    <Button variant="outline" onClick={() => setStep(3)}>
                        Go Back
                    </Button>
                    <Button
                        onClick={handleSaveSouvenir}
                        disabled={loading}
                        className="bg-cyan-500 hover:bg-cyan-400 text-gray-900"
                    >
                        {loading ? <LoadingOrb size="sm" className="mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Souvenir
                    </Button>
                </div>
            </motion.div>
        );

      default:
        return <div>Something went wrong.</div>;
    }
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 border border-cyan-500/20 rounded-2xl shadow-lg w-full max-w-md relative p-8"
      >
        <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X className="w-6 h-6" />
        </button>
        <div className="w-full min-h-[300px] flex items-center justify-center">
            <AnimatePresence mode="wait">
                {renderContent()}
            </AnimatePresence>
        </div>
        <div className="absolute bottom-4 left-4 flex items-center text-xs text-gray-500">
            <MapPin className="w-3 h-3 mr-1" />
            {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
        </div>
      </motion.div>
    </div>
  );
}