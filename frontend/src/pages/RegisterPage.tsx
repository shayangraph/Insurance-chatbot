import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, Phone, User as UserIcon, ArrowRight, AlertCircle, Loader2, Eye, EyeOff, Building2 } from 'lucide-react';
import { insuranceService } from '../services/insuranceService';
import type { InsuranceCompany } from '../types';

export const RegisterPage: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isExpertApplicant, setIsExpertApplicant] = useState(false);
  const [requestedCompanyId, setRequestedCompanyId] = useState<number | null>(null);
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    insuranceService.getCompanies().then((comps) => setCompanies(comps)).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || !fullName || !password) {
      setError('پر کردن تمامی فیلدها الزامی است.');
      return;
    }
    if (password.length < 6) {
      setError('رمز عبور باید حداقل ۶ کاراکتر باشد.');
      return;
    }
    if (isExpertApplicant && !requestedCompanyId) {
      setError('لطفاً شرکت بیمه مورد نظر خود را انتخاب نمایید.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await register(phoneNumber, fullName, password, isExpertApplicant, isExpertApplicant ? requestedCompanyId : null);
      if (isExpertApplicant) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      const detail = err.response?.data?.phone_number?.[0] || err.response?.data?.detail || 'خطا در ثبت نام. لطفاً مجدداً بررسی فرمایید.';
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
          <h1 className="text-xl font-bold text-white mb-1">ثبت نام در بیمه هوشمند</h1>
          <p className="text-xs text-slate-400">حساب کاربری جدید خود را ایجاد کنید</p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">نام و نام خانوادگی</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="علی محمدی"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-[#0c1322] border border-[#2e3545] rounded-xl py-3 pr-4 pl-10 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

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
                placeholder="حداقل ۶ کاراکتر"
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

          {/* Expert Account Applicant Option */}
          <div className="pt-2 border-t border-[#2e3545]/60 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-300">
              <input
                type="checkbox"
                checked={isExpertApplicant}
                onChange={(e) => setIsExpertApplicant(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 bg-[#0c1322] border-[#2e3545] focus:ring-blue-500 focus:ring-offset-0"
              />
              <span>درخواست حساب کاربری «کارشناس بیمه»</span>
            </label>

            {isExpertApplicant && (
              <div className="bg-[#0c1322] border border-cyan-500/30 p-3.5 rounded-xl space-y-2.5 text-xs">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span>انتخاب شرکت بیمه مربوطه:</span>
                </div>
                <select
                  value={requestedCompanyId || ''}
                  onChange={(e) => setRequestedCompanyId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-[#191f2f] border border-[#2e3545] rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- شرکت بیمه مورد نظر خود را انتخاب کنید --</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 leading-normal">
                  * نکته: دسترسی به اطلاعات مشتریان پس از بررسی و تایید صلاحیت توسط مدیر سیستم فعال خواهد گردید.
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 mt-6"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ایجاد حساب کاربری'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          قبلاً ثبت‌نام کرده‌اید؟{' '}
          <Link to="/login" className="text-blue-400 hover:underline font-bold mr-1">
            وارد شوید
          </Link>
        </div>
      </div>
    </div>
  );
};
