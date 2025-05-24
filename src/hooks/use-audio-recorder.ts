
import { useState, useRef, useCallback } from 'react';

export interface ManualAudioRecorderControls {
  isRecording: boolean;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>; // Returns audioDataUri or null
}

export function useAudioRecorder(): ManualAudioRecorderControls {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);


  const cleanupResources = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn("Error stopping media recorder during cleanup:", e);
      }
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(e => console.warn("Error closing AudioContext:", e));
    }
    audioContextRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setError(null);
  }, []);

  const startRecording = useCallback(async (): Promise<void> => {
    if (isRecording) {
      console.warn("Recording is already in progress.");
      return;
    }
    
    cleanupResources(); // Clean up any previous instances
    setError(null);
    audioChunksRef.current = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Media Devices API not supported.");
      setIsRecording(false);
      throw new Error("Media Devices API not supported.");
    }

    try {
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

      mediaRecorderRef.current = new MediaRecorder(mediaStreamRef.current);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setError("Error during recording.");
        setIsRecording(false);
        cleanupResources();
      };
      
      mediaRecorderRef.current.onstart = () => {
        setIsRecording(true);
      };

      mediaRecorderRef.current.start();

    } catch (err) {
      console.error("Error starting recording:", err);
      if (err instanceof Error && err.name === "NotAllowedError") {
        setError("Microphone access denied. Please allow microphone access.");
      } else {
        setError("Could not access microphone.");
      }
      setIsRecording(false);
      cleanupResources();
      throw err; // Re-throw to be caught by caller if needed
    }
  }, [isRecording, cleanupResources]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!isRecording || !mediaRecorderRef.current) {
      console.warn("Recording is not in progress or recorder not initialized.");
      return null;
    }

    return new Promise((resolve) => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          if (audioBlob.size === 0 && audioChunksRef.current.length === 0) {
            resolve(null); // Resolve with null for empty recordings
          } else {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve(reader.result as string);
            };
            reader.onerror = () => {
              console.error("FileReader error while reading audio blob.");
              setError("Failed to process recorded audio.");
              resolve(null);
            };
            reader.readAsDataURL(audioBlob);
          }
          // Moved cleanup to be general and after processing
          setIsRecording(false);
          // Keep stream and context alive if we plan to record again soon,
          // but for a full stop, cleanup is better.
          // For now, let's clean up partially, keeping the stream for next start
          // If user explicitly "ends session", then full cleanup.
          // For this manual approach, we can clean up more aggressively.
          cleanupResources();
        };

        try {
            mediaRecorderRef.current.stop();
        } catch (e) {
            console.error("Error stopping MediaRecorder:", e);
            setError("Error stopping recording.");
            setIsRecording(false);
            cleanupResources();
            resolve(null);
        }
      } else {
         setIsRecording(false);
         resolve(null);
      }
    });
  }, [isRecording, cleanupResources]);
  
  return { 
    isRecording, 
    error, 
    startRecording, 
    stopRecording 
  };
}
