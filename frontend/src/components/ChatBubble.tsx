import React, { useState } from 'react';
import { Bot, User as UserIcon, Volume2, VolumeX, Copy, Check, Sparkles, Loader2 } from 'lucide-react';
import type { ChatMessage, Recommendation } from '../types';
import { formatPersianTime } from '../utils/persianNumbers';

import { RecommendationCard } from './RecommendationCard';
import { PaymentCard } from './PaymentCard';
import { useTextToSpeech } from '../hooks/useTextToSpeech';

interface ChatBubbleProps {
  message: ChatMessage;
  onConfirmRecommendation?: (recommendation: Recommendation) => void;
  onCancelRecommendation?: () => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, onConfirmRecommendation, onCancelRecommendation }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const { isPlaying, isLoading, speak, stop } = useTextToSpeech();

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeechToggle = () => {
    if (isPlaying) {
      stop();
    } else {
      speak(message.content, String(message.id));
    }
  };

  return (
    <div className={`flex w-full my-3 ${isUser ? 'justify-start' : 'justify-end'} text-right`}>
      <div className={`flex gap-3 max-w-[85%] sm:max-w-[75%] ${isUser ? 'flex-row' : 'flex-row-reverse'}`}>
        
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gradient-to-tr from-indigo-600 to-blue-600 text-white border border-blue-400/20'
        }`}>
          {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>

        {/* Message Bubble Content */}
        <div className="flex flex-col">
          <div className={`p-4 rounded-2xl text-sm leading-relaxed relative group shadow-sm ${
            isUser
              ? 'bg-blue-600 text-white rounded-tr-none'
              : 'bg-[#191f2f] text-slate-100 border border-[#2e3545] rounded-tl-none'
          }`}>

            {/* AI Badge for Assistant */}
            {!isUser && (
              <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 mb-1.5 border-b border-[#2e3545] pb-1">
                <Sparkles className="w-3 h-3" />
                دستیار هوشمند بیمه
              </div>
            )}

            {/* Text Message */}
            <div className="whitespace-pre-wrap font-vazir tracking-normal">
              {message.content}
            </div>


            {/* Embedded Recommendation Card if attached */}
            {message.recommendation && onConfirmRecommendation && onCancelRecommendation && (
              <RecommendationCard
                recommendation={message.recommendation}
                onConfirm={onConfirmRecommendation}
                onCancel={onCancelRecommendation}
              />
            )}

            {/* Embedded Payment Card if attached */}
            {message.order && (
              <PaymentCard order={message.order} />
            )}

            {/* Bubble Footer & Actions with Send Time */}
            <div className={`flex items-center justify-between mt-2.5 pt-1.5 gap-4 text-[10px] border-t ${
              isUser ? 'border-blue-500/40 text-blue-100/70' : 'border-[#2e3545]/60 text-slate-400/80'
            }`}>
              <span className="font-sans tracking-wide">
                {formatPersianTime(message.timestamp)}
              </span>

              <div className="flex items-center gap-1.5">
                {/* Speaker Button (Gemini TTS) for AI messages */}
                {!isUser && (
                  <button
                    onClick={handleSpeechToggle}
                    disabled={isLoading}
                    title={isPlaying ? 'توقف پخش صدا' : 'شنیدن پاسخ با صدای هوش مصنوعی (Gemini TTS)'}
                    className={`flex items-center gap-1 py-1 px-2 rounded-lg transition-all text-[11px] font-medium ${
                      isPlaying
                        ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 shadow-sm shadow-blue-500/20'
                        : isLoading
                        ? 'bg-[#232a3a] text-slate-400 cursor-wait'
                        : 'bg-[#232a3a]/70 hover:bg-[#2e374b] text-slate-300 hover:text-white border border-[#2e3545]'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                        <span className="text-[10px] text-blue-300">آماده‌سازی صدا...</span>
                      </>
                    ) : isPlaying ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                        <span className="text-[10px] text-blue-300">توقف</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400" />
                        <span className="text-[10px] text-slate-400">شنیدن پاسخ</span>
                      </>
                    )}
                  </button>
                )}

                {/* Copy Button */}
                <button
                  onClick={handleCopy}
                  title="کپی متن"
                  className="hover:text-blue-300 transition-colors p-1.5 rounded-lg hover:bg-[#232a3a]"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
