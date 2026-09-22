import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal, Mic, Pause, Loader2, Lock, LogIn, UserPlus } from 'lucide-react';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface ChatInputProps {
  onSendMessage: (messageText: string) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSpeechInterim = (_interimText: string) => {
    // No text display during recording per user request
  };

  const handleSpeechFinal = (finalText: string) => {
    if (finalText.trim()) {
      setText(finalText);
      // Auto-send recognized Persian speech
      onSendMessage(finalText.trim());
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const { isListening, isProcessing, startListening, stopListening, error: voiceError } = useVoiceRecorder({
    onInterimResult: handleSpeechInterim,
    onFinalResult: handleSpeechFinal
  });

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || isLoading) return;
    if (isListening) {
      stopListening();
    }
    onSendMessage(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleVoiceRecording = () => {
    if (isProcessing) return;
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  return (
    <div className="fixed bottom-0 left-0 right-0 md:right-64 z-30 bg-gradient-to-t from-[#0c1322] via-[#0c1322]/95 to-transparent pb-4 pt-6 px-4 font-vazir">
      <div className="max-w-3xl mx-auto relative">

        {!isAuthenticated ? (
          /* Unauthenticated Disabled Input Box Banner */
          <div className="bg-gradient-to-r from-[#191f2f] to-[#1e293b] border border-blue-500/40 rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-right">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h5 className="font-bold text-sm text-white">جهت گفتگو وارد حساب شوید</h5>
                <p className="text-xs text-slate-400 mt-0.5">
                  برای مشاوره اختصاصی و استعلام صدور بیمه‌نامه، لطفاً ابتدا وارد حساب کاربری خود شوید.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                onClick={() => navigate('/login')}
                className="flex-1 sm:flex-initial py-2 px-4 rounded-xl bg-[#232a3a] hover:bg-[#2e3545] text-xs font-bold text-slate-200 hover:text-white transition-all flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-4 h-4 text-blue-400" />
                ورود
              </button>
              <button
                onClick={() => navigate('/register')}
                className="flex-1 sm:flex-initial py-2 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-bold text-white shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                ثبت نام
              </button>
            </div>
          </div>
        ) : (
          /* Main Authenticated Form Input */
          <>
            {/* Microphone error message only (only when denied or error, no banner during normal recording) */}
            {voiceError && !isListening && !isProcessing && (
              <div className="absolute -top-10 right-3 left-3 bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] px-3 py-1.5 rounded-xl text-center">
                {voiceError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-[#191f2f] border border-[#2e3545] focus-within:border-blue-500/60 focus-within:ring-2 focus-within:ring-blue-500/20 rounded-2xl p-2 shadow-2xl transition-all">
              
              {/* Voice Input Button on the RIGHT (first element in RTL layout) */}
              <button
                type="button"
                onClick={toggleVoiceRecording}
                disabled={isLoading || isProcessing}
                title={
                  isProcessing
                    ? 'در حال پردازش گفتار'
                    : isListening
                    ? 'توقف ضبط گفتار'
                    : 'ضبط صدا و تبدیل به متن (میکروفون)'
                }
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/40 ring-2 ring-red-400'
                    : isProcessing
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                    : 'bg-[#232a3a] text-slate-300 hover:text-white hover:bg-blue-600/20 hover:text-blue-400 border border-slate-700/60'
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                ) : isListening ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Mic className="w-5 h-5 text-blue-400 hover:text-blue-300" />
                )}
              </button>

              {/* Textarea Input (Center) */}
              <textarea
                ref={textareaRef}
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="پیام خود را بنویسید یا از دکمه میکروفون استفاده کنید..."
                disabled={isLoading || isProcessing}
                className="flex-1 bg-transparent border-0 outline-none focus:ring-0 text-slate-100 text-sm placeholder:text-slate-500 resize-none font-vazir py-2 px-2 max-h-32 leading-relaxed"
              />

              {/* Send Button on the LEFT (last element in RTL layout) */}
              <button
                type="submit"
                disabled={!text.trim() || isLoading || isProcessing}
                title="ارسال پیام"
                className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white flex items-center justify-center shrink-0 transition-all shadow-md shadow-blue-600/20"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <SendHorizontal className="w-5 h-5 rotate-180" />
                )}
              </button>

            </form>
          </>
        )}


        <span className="text-[11px] text-slate-500 text-center block mt-2 font-medium">
          دستیار بیمه هوشمند
        </span>

      </div>
    </div>
  );
};
