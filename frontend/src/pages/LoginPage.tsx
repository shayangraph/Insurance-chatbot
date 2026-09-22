import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, Phone, ArrowRight, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || !password) {
      setError('شماره همراه و رمز عبور الزامی است.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const loggedInUser = await login(phoneNumber, password);
      if (loggedInUser.role === 'ADMIN' || loggedInUser.is_staff || loggedInUser.is_superuser) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'شماره همراه یا رمز عبور اشتباه است.';
      setError(detail);
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-[#0c1322] flex items-center justify-center px-4 py-12 font-vazir text-right text-slate-100">
      <div className="max-w-md w-full bg-[#191f2f] border border-[#2e3545] p-8 rounded-3xl shadow-2xl relative">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-6 transition-colors">
          <ArrowRight className="w-4 h-4" />
          بازگشت به گفتگو
        </Link>

        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl mb-3">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white mb-1">ورود به بیمه هوشمند</h1>
          <p className="text-xs text-slate-400">برای مدیریت خریدهای قبلی و دریافت سوابق وارد شوید</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">شماره تلفن همراه</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="09123456789"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full bg-[#0c1322] border border-[#2e3545] rounded-xl py-3 pr-4 pl-10 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">رمز عبور</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0c1322] border border-[#2e3545] rounded-xl py-3 pr-4 pl-10 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                title={showPassword ? 'مخفی کردن رمز' : 'نمایش رمز عبور'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 mt-6"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ورود به حساب'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          حساب کاربری ندارید؟{' '}
          <Link to="/register" className="text-blue-400 hover:underline font-bold mr-1">
            ثبت‌نام کنید
          </Link>
        </div>
      </div>
    </div>
  );
};
