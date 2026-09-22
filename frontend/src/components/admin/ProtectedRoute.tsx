import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC<{ children?: React.ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly = false,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0c1322] flex flex-col items-center justify-center text-slate-300 font-vazir">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-sm">در حال بررسی سطح دسترسی...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = user?.role === 'ADMIN' || user?.is_staff || user?.is_superuser;
  const isExpert = user?.role === 'EXPERT';

  if (!isAdmin && !isExpert) {
    return <Navigate to="/" replace />;
  }

  // If page requires Admin role, but user is only Expert
  if (adminOnly && !isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // If expert is not yet approved by management or has no assigned company
  if (isExpert && !isAdmin && (!user?.is_approved_expert || !user?.assigned_company)) {
    return (
      <div className="min-h-screen bg-[#0c1322] flex flex-col items-center justify-center p-6 text-slate-200 font-vazir text-center">
        <div className="max-w-md w-full bg-[#111726] border border-amber-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <h2 className="text-lg font-bold text-white">حساب کارشناس در انتظار تایید مدیریت</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            حساب کاربری شما به عنوان <span className="text-amber-400 font-bold">کارشناس بیمه</span> ثبت گردیده است. دسترسی به اطلاعات مشتریان منوط به تایید صلاحیت و تخصیص شرکت بیمه از سوی مدیر سیستم می‌باشد.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <a
              href="/"
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
            >
              بازگشت به صفحه اصلی چت
            </a>
          </div>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};
