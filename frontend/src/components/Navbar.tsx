import React from 'react';
import { Menu, LogIn, UserPlus, User as UserIcon, LogOut, ShieldCheck } from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 w-full backdrop-blur-md bg-[#0c1322]/90 border-b border-[#232a3a] transition-all font-vazir">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Right side (RTL start): Mobile Menu Toggle Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSidebar}
            title="منوی گفتگوها"
            className="md:hidden p-2 rounded-xl bg-[#191f2f] border border-[#2e3545] text-slate-300 hover:text-white transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Left side (RTL end): Authentication Buttons (Login & Register / Profile) */}
        <div className="flex items-center gap-2.5">
          {isAuthenticated ? (
            <div className="flex items-center gap-2.5">
              {(user?.role === 'ADMIN' || user?.is_staff || user?.is_superuser) && (
                <button
                  onClick={() => navigate('/admin')}
                  className="relative group flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 text-blue-300 hover:text-white border border-blue-500/30 hover:border-transparent transition-all duration-300 text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-indigo-500/25"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 group-hover:bg-white animate-pulse"></span>
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400 group-hover:text-white transition-colors" />
                  <span>پنل مدیریت</span>
                </button>
              )}

              {user?.role === 'EXPERT' && (
                <button
                  onClick={() => navigate('/admin')}
                  className="relative group flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600/25 via-blue-600/25 to-indigo-600/25 hover:from-cyan-600 hover:via-blue-600 hover:to-indigo-600 text-cyan-300 hover:text-white border border-cyan-500/30 hover:border-transparent transition-all duration-300 text-xs font-bold shadow-md shadow-cyan-500/10 hover:shadow-cyan-500/25"
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-400 group-hover:bg-white animate-pulse"></span>
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 group-hover:text-white transition-colors" />
                  <span>{user.assigned_company_name ? `پنل کارشناس (${user.assigned_company_name})` : 'پنل کارشناس بیمه'}</span>
                </button>
              )}

              <div className="flex items-center gap-2 bg-[#191f2f] border border-[#2e3545] px-3 py-1.5 rounded-xl text-xs">
                <UserIcon className="w-4 h-4 text-blue-400" />
                <span className="text-slate-200 font-medium">{user?.full_name || user?.phone_number}</span>
              </div>
              <button
                onClick={logout}
                title="خروج از حساب"
                className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all text-xs flex items-center gap-1 font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">خروج</span>
              </button>
            </div>
          ) : (

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-[#191f2f] hover:bg-[#232a3a] border border-[#2e3545] text-slate-200 hover:text-white transition-all shadow-sm"
              >
                <LogIn className="w-4 h-4 text-blue-400" />
                ورود
              </button>
              <button
                onClick={() => navigate('/register')}
                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-600/20 transition-all"
              >
                <UserPlus className="w-4 h-4" />
                ثبت نام
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
