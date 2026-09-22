import { useState, useCallback, useRef, useEffect } from 'react';
import { chatService } from '../services/chatService';

// Audio cache map to avoid duplicate network calls for the same chunk/text
const audioCache = new Map<string, string>();

// Global reference to ensure only one audio plays across the entire chat
let globalStopActiveAudio: (() => void) | null = null;

export interface UseTextToSpeechReturn {
  isPlaying: boolean;
  isLoading: boolean;
  speak: (text: string, messageId?: string) => Promise<void>;
  stop: () => void;
  hasSupport: boolean;
  error: string | null;
}

function cleanTextForTTS(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, '') // remove code blocks
    .replace(/[*_#`~>•]/g, ' ')      // remove markdown symbols
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // keep link text
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Splits text into logical chunks of 1 to 3 sentences (never breaking mid-sentence or mid-word).
 */
export function splitIntoTTSChunks(text: string): string[] {
  const cleaned = cleanTextForTTS(text);
  if (!cleaned) return [];

  // Match Persian/English sentences ending in punctuation or newline
  const rawSentences = cleaned.match(/[^.!؟?\n]+(?:[.!?؟\n]+|$)/g) || [cleaned];
  const sentences = rawSentences.map((s) => s.trim()).filter(Boolean);

  if (sentences.length <= 1) return [cleaned];

  const chunks: string[] = [];
  
  // First chunk: strictly 1 sentence for lowest latency and instant time-to-first-sound
  chunks.push(sentences[0]);

  let currentChunk = '';
  let sentenceCount = 0;

  for (let i = 1; i < sentences.length; i++) {
    const sentence = sentences[i];
    const wouldExceedLen = currentChunk.length + sentence.length > 220;
    const wouldExceedSentences = sentenceCount >= 2;

    if (currentChunk && (wouldExceedSentences || wouldExceedLen)) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
      sentenceCount = 1;
    } else {
      currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
      sentenceCount++;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionIdRef = useRef<number>(0);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    // Increment session ID to cancel any in-flight promises/fetches
    sessionIdRef.current++;

    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch (e) {}
      currentAudioRef.current = null;
    }

    if (globalStopActiveAudio) {
      globalStopActiveAudio = null;
    }

    setIsPlaying(false);
    setIsLoading(false);
  }, []);

  const fetchChunkAudio = useCallback(async (
    chunkText: string,
    chunkIndex: number,
    messageId: string | undefined,
    currentSession: number
  ): Promise<HTMLAudioElement | null> => {
    if (currentSession !== sessionIdRef.current) return null;

    // Cache key incorporates messageId, chunk index, and first chars
    const cacheKey = messageId
      ? `${messageId}_chunk_${chunkIndex}`
      : `tts_${chunkText.slice(0, 40)}_${chunkText.length}`;

    let audioUrl = audioCache.get(cacheKey);

    if (!audioUrl) {
      try {
        const blob = await chatService.getTTSAudio(chunkText);
        if (currentSession !== sessionIdRef.current) return null;
        audioUrl = URL.createObjectURL(blob);
        audioCache.set(cacheKey, audioUrl);
      } catch (err) {
        console.warn(`Failed to generate TTS for chunk ${chunkIndex}:`, err);
        return null;
      }
    }

    if (currentSession !== sessionIdRef.current || !audioUrl) return null;

    const audio = new Audio(audioUrl);
    audio.preload = 'auto';
    return audio;
  }, []);

  const speak = useCallback(async (text: string, messageId?: string) => {
    if (!text.trim()) return;

    // If this instance is already playing, clicking toggles Stop
    if (isPlaying || isLoading) {
      stop();
      return;
    }

    // Stop any globally playing audio from other messages
    if (globalStopActiveAudio) {
      globalStopActiveAudio();
    }

    // Setup new session token
    const currentSession = ++sessionIdRef.current;
    globalStopActiveAudio = () => {
      sessionIdRef.current++;
      if (currentAudioRef.current) {
        try {
          currentAudioRef.current.pause();
          currentAudioRef.current.currentTime = 0;
        } catch (e) {}
        currentAudioRef.current = null;
      }
      setIsPlaying(false);
      setIsLoading(false);
    };

    setError(null);
    setIsLoading(true);

    const chunks = splitIntoTTSChunks(text);
    if (chunks.length === 0) {
      setIsLoading(false);
      return;
    }

    try {
      // 1. Fetch the very first chunk for ultra-fast startup (< 2s)
      const firstAudio = await fetchChunkAudio(chunks[0], 0, messageId, currentSession);

      if (currentSession !== sessionIdRef.current) return;

      if (!firstAudio) {
        throw new Error('خطا در آماده‌سازی صدای پاسخ هوش مصنوعی.');
      }

      // Immediately transition from loading to playing
      setIsLoading(false);
      setIsPlaying(true);
      currentAudioRef.current = firstAudio;

      // Sequential playback loop with 1-chunk-ahead background prefetching
      let prefetchPromise: Promise<HTMLAudioElement | null> | null = null;
      if (chunks.length > 1) {
        // Start prefetching chunk 1 in background right away!
        prefetchPromise = fetchChunkAudio(chunks[1], 1, messageId, currentSession);
      }

      // Play audio sequentially
      let currentAudio = firstAudio;

      for (let i = 0; i < chunks.length; i++) {
        if (currentSession !== sessionIdRef.current) return;

        // Play the current chunk
        currentAudioRef.current = currentAudio;

        // Set up prefetch for chunk i + 1 if available
        let nextAudioPromise: Promise<HTMLAudioElement | null> | null = prefetchPromise;
        if (i + 1 < chunks.length) {
          if (!nextAudioPromise) {
            nextAudioPromise = fetchChunkAudio(chunks[i + 1], i + 1, messageId, currentSession);
          }
        }

        // Wait for currentAudio to finish playing
        await new Promise<void>((resolve) => {
          if (currentSession !== sessionIdRef.current) {
            resolve();
            return;
          }

          currentAudio.onended = () => resolve();
          currentAudio.onerror = () => resolve();

          currentAudio.play().catch((playErr) => {
            console.warn('Playback error on chunk', i, playErr);
            resolve();
          });
        });

        if (currentSession !== sessionIdRef.current) return;

        // Prepare next audio if there are more chunks
        if (i + 1 < chunks.length && nextAudioPromise) {
          const nextAudio = await nextAudioPromise;
          if (currentSession !== sessionIdRef.current) return;

          if (nextAudio) {
            currentAudio = nextAudio;
          } else {
            // If next chunk failed, skip it and prepare the one after
            if (i + 2 < chunks.length) {
              prefetchPromise = fetchChunkAudio(chunks[i + 2], i + 2, messageId, currentSession);
            }
          }
          prefetchPromise = null;
        }
      }

      // All chunks finished successfully
      if (currentSession === sessionIdRef.current) {
        setIsPlaying(false);
        setIsLoading(false);
        currentAudioRef.current = null;
      }
    } catch (err: any) {
      if (currentSession === sessionIdRef.current) {
        console.error('TTS playback error:', err);
        setError(err?.message || 'خطا در پخش صوت');
        setIsPlaying(false);
        setIsLoading(false);
        currentAudioRef.current = null;
      }
    }
  }, [isPlaying, isLoading, stop, fetchChunkAudio]);

  useEffect(() => {
    return () => {
      sessionIdRef.current++;
      if (currentAudioRef.current) {
        try {
          currentAudioRef.current.pause();
        } catch (e) {}
      }
    };
  }, []);

  return {
    isPlaying,
    isLoading,
    speak,
    stop,
    hasSupport: true,
    error,
  };
}

