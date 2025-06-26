import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Play, Pause } from 'lucide-react';
import { motion } from 'framer-motion';

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  disabled?: boolean;
}

export function AudioRecorder({ onRecordingComplete, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setAudioBlob(blob);
        onRecordingComplete(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Error accessing microphone. Please ensure you have granted microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  };

  const playAudio = () => {
    if (audioBlob && !isPlaying) {
      const url = URL.createObjectURL(audioBlob);
      audioRef.current = new Audio(url);
      audioRef.current.play();
      setIsPlaying(true);
      
      audioRef.current.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };
    }
  };

  const pauseAudio = () => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 relative z-50">
      <div className="flex items-center justify-center">
        {!isRecording && !audioBlob && (
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={startRecording}
              disabled={disabled}
              size="lg"
              className="bg-cyan-500 hover:bg-cyan-400 text-gray-900 rounded-full w-16 h-16 p-0 relative z-50 pointer-events-auto"
              type="button"
            >
              <Mic className="w-6 h-6" />
            </Button>
          </motion.div>
        )}

        {isRecording && (
          <div className="flex flex-col items-center gap-4">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="relative"
            >
              <Button
                onClick={stopRecording}
                size="lg"
                className="bg-red-500 hover:bg-red-400 text-white rounded-full w-16 h-16 p-0 relative z-50 pointer-events-auto"
                type="button"
              >
                <Square className="w-6 h-6" />
              </Button>
              <div className="absolute -inset-1 bg-red-500/30 rounded-full animate-pulse" />
            </motion.div>
            <div className="text-cyan-400 font-mono text-lg">
              {formatTime(recordingTime)}
            </div>
          </div>
        )}

        {audioBlob && !isRecording && (
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={isPlaying ? pauseAudio : playAudio}
                disabled={disabled}
                size="lg"
                className="bg-cyan-500 hover:bg-cyan-400 text-gray-900 rounded-full w-16 h-16 p-0 relative z-50 pointer-events-auto"
                type="button"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </Button>
            </motion.div>
            <div className="text-cyan-400">
              Recording complete ({formatTime(recordingTime)})
            </div>
          </div>
        )}
      </div>

      {audioBlob && (
        <div className="text-center">
          <Button
            onClick={() => {
              setAudioBlob(null);
              setRecordingTime(0);
            }}
            variant="outline"
            size="sm"
            className="border-cyan-500/20 hover:border-cyan-400 hover:bg-cyan-500/10 text-cyan-400 relative z-50 pointer-events-auto"
            type="button"
          >
            Record Again
          </Button>
        </div>
      )}
    </div>
  );
}