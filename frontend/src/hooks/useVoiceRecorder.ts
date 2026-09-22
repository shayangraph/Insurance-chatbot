import { useState, useCallback, useRef, useEffect } from 'react';
import { chatService } from '../services/chatService';

export interface UseVoiceRecorderOptions {
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
}

export interface UseVoiceRecorderReturn {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  startListening: () => Promise<void>;
  stopListening: () => void;
  hasSupport: boolean;
  error: string | null;
}

export function useVoiceRecorder(
  optionsOrCallback?: UseVoiceRecorderOptions | ((text: string) => void)
): UseVoiceRecorderReturn {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const webSpeechResultRef = useRef<string>('');
  const latestSpokenTextRef = useRef<string>('');
  const optionsRef = useRef<UseVoiceRecorderOptions>({});
  const timeoutRef = useRef<any>(null);

  if (typeof optionsOrCallback === 'function') {
    optionsRef.current = { onFinalResult: optionsOrCallback };
  } else if (optionsOrCallback) {
    optionsRef.current = optionsOrCallback;
  }

  const hasSupport = typeof window !== 'undefined' &&
    (!!(navigator?.mediaDevices?.getUserMedia) ||
     'SpeechRecognition' in window ||
     'webkitSpeechRecognition' in window);

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      streamRef.current = null;
    }
  }, []);

  const sendAudioToBackend = useCallback(async (audioBlob: Blob) => {
    if (audioBlob.size < 1200) {
      // Audio is too short or empty
      setIsProcessing(false);
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      const res = await chatService.transcribeAudio(audioBlob);
      const transcribedText = res?.text?.trim() || '';
      if (transcribedText) {
        setTranscript(transcribedText);
        if (optionsRef.current.onFinalResult) {
          optionsRef.current.onFinalResult(transcribedText);
        }
      } else {
        setError('صدایی تشخیص داده نشد. لطفاً شفاف‌تر صحبت کنید.');
        setTimeout(() => setError(null), 4000);
      }
    } catch (err: any) {
      console.warn('Backend STT failed:', err);
      setError('خطا در تبدیل صدا به متن. لطفاً مجدداً امتحان فرمایید.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Stop MediaRecorder (triggers recorder.onstop)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    } else {
      cleanupStream();
      setIsListening(false);
    }

    // Stop recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  }, [cleanupStream]);

  const startListening = useCallback(async () => {
    if (isListening || isProcessing) return;

    setError(null);
    setTranscript('');
    webSpeechResultRef.current = '';
    latestSpokenTextRef.current = '';
    audioChunksRef.current = [];

    // Check mediaDevices support
    if (!navigator?.mediaDevices?.getUserMedia) {
      setError('مرورگر شما از دسترسی به میکروفون پشتیبانی نمی‌کند.');
      setTimeout(() => setError(null), 5000);
      return;
    }

    let mediaStream: MediaStream;
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = mediaStream;
    } catch (permErr: any) {
      console.error('Microphone access error:', permErr);
      if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
        setError('دسترسی به میکروفون مسدود است. لطفاً اجازه دسترسی میکروفون را صادر فرمایید.');
      } else {
        setError('امکان دسترسی به میکروفون وجود ندارد.');
      }
      setTimeout(() => setError(null), 6000);
      return;
    }

    setIsListening(true);

    // Initialize MediaRecorder for capturing exact audio chunks
    try {
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else {
          mimeType = '';
        }
      }

      const recorder = mimeType ? new MediaRecorder(mediaStream, { mimeType }) : new MediaRecorder(mediaStream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        setIsListening(false);

        // Small grace period for Web Speech API to finish emitting words
        await new Promise((r) => setTimeout(r, 150));

        cleanupStream();

        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (e) {}
          recognitionRef.current = null;
        }

        // Check if Web Speech API captured text (final or interim)
        const recognizedText = (webSpeechResultRef.current || latestSpokenTextRef.current || '').trim();
        if (recognizedText) {
          setTranscript(recognizedText);
          if (optionsRef.current.onFinalResult) {
            optionsRef.current.onFinalResult(recognizedText);
          }
          return;
        }

        // If Web Speech API had network error or no text, fallback to Gemini STT with recorded audio
        const recordedBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        await sendAudioToBackend(recordedBlob);
      };

      recorder.start(250); // collect 250ms chunks
    } catch (recErr) {
      console.warn('Failed to start MediaRecorder:', recErr);
    }

    // Also attempt Web Speech API in parallel (for live interim preview or instant results when online)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'fa-IR';
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const res = event.results[i];
            if (res.isFinal) {
              finalTranscript += res[0].transcript;
            } else {
              interimTranscript += res[0].transcript;
            }
          }

          const currentText = (finalTranscript || interimTranscript).trim();
          if (currentText) {
            latestSpokenTextRef.current = currentText;
            setTranscript(currentText);
          }

          if (interimTranscript && optionsRef.current.onInterimResult) {
            optionsRef.current.onInterimResult(interimTranscript);
          }

          if (finalTranscript) {
            webSpeechResultRef.current = finalTranscript;
          }
        };

        recognition.onerror = (event: any) => {
          // In Iran, Chrome speech recognition frequently throws 'network' error because Google's STT server is blocked.
          // We silently catch this and rely on our Gemini MediaRecorder fallback!
          console.log('Web Speech API status/error:', event.error, '(relying on server-side Gemini STT)');
          if (event.error === 'not-allowed') {
            setError('دسترسی به میکروفون مسدود است.');
            stopListening();
          }
        };

        recognition.onend = () => {
          // If recognition ends while still listening, stop listening so mediaRecorder can finalize
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            try {
              mediaRecorderRef.current.stop();
            } catch (e) {}
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (speechErr) {
        console.warn('Web Speech API start error (fallback to backend STT):', speechErr);
      }
    }

    // Auto-stop after 25 seconds of continuous recording to protect user
    timeoutRef.current = setTimeout(() => {
      stopListening();
    }, 25000);
  }, [isListening, isProcessing, cleanupStream, sendAudioToBackend, stopListening]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {}
      }
      cleanupStream();
    };
  }, [cleanupStream]);

  return {
    isListening,
    isProcessing,
    transcript,
    startListening,
    stopListening,
    hasSupport,
    error,
  };
}

