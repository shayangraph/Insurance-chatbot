import React from 'react';
import { Car, ShieldAlert, Flame, Plane, HeartHandshake, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface WelcomeScreenProps {
  onSelectOption: (optionText: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectOption }) => {
  const chips = [
    {
      title: 'بیمه شخص ثالث خودرو',
      icon: Car,
      prompt: 'سلام، قصد استعلام و خرید بیمه شخص ثالث برای خودرو دارم. لطفاً راهنمایی کنید.'
    },
    {
      title: 'بیمه بدنه خودرو',
      icon: ShieldAlert,
      prompt: 'سلام، می‌خواهم شرایط و قیمت بیمه بدنه خودرو را استعلام کنم و پوشش‌های آن را بدانم.'
    },
    {
      title: 'بیمه آتش‌سوزی و زلزله',
      icon: Flame,
      prompt: 'سلام، برای استعلام و خرید بیمه آتش‌سوزی و زلزله ساختمان مسکونی راهنمایی می‌خواهم.'
    },
    {
      title: 'بیمه مسافرتی خارج از کشور',
      icon: Plane,
      prompt: 'سلام، قصد خرید و استعلام بیمه مسافرتی خارج از کشور را دارم. لطفاً اطلاعات سفر را از من بپرسید.'
    },
    {
      title: 'بیمه عمر و سرمایه‌گذاری',
      icon: HeartHandshake,
      prompt: 'سلام، درباره شرایط، پوشش‌ها و سود سرمایه‌گذاری بیمه عمر و بازنشستگی توضیح دهید.'
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 max-w-xl mx-auto py-8"
    >
      {/* Bot Avatar Icon */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-xl shadow-blue-600/30 mb-6 border border-blue-400/30">
        <Sparkles className="w-9 h-9 text-white animate-pulse" />
      </div>

      {/* Welcome Title & Description */}
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight leading-relaxed">
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400">
          دستیار خرید هوشمند بیمه
        </span>
      </h1>
      
      <p className="text-slate-300 text-sm sm:text-base mb-8 font-normal leading-relaxed">
        برای پیدا کردن بهترین بیمه فقط با من گفتگو کنید.
      </p>

      {/* Quick Option Chips */}
      <div className="w-full flex flex-col gap-2.5">
        <span className="text-xs font-semibold text-slate-400 mb-1 text-right block pr-1">
          یک موضوع را برای شروع انتخاب کنید:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {chips.map((chip, idx) => {
            const Icon = chip.icon;
            return (
              <button
                key={idx}
                onClick={() => onSelectOption(chip.prompt)}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-[#191f2f] hover:bg-[#232a3a] border border-[#2e3545] hover:border-blue-500/50 text-slate-200 hover:text-white transition-all text-right group shadow-sm"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-600/10 group-hover:bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0 transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs sm:text-sm font-medium">{chip.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
