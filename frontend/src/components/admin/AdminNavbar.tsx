import React from 'react';
import { Menu, ShieldCheck, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface AdminNavbarProps {
  onToggleSidebar: () => void;
}

export const AdminNavbar: React.FC<AdminNavbarProps> = ({ onToggleSidebar }) => {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 h-16 w-full bg-[#0c1322]/90 backdrop-blur-md border-b border-[#232a3a] font-vazir text-right">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        {/* Mobile menu trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl bg-[#191f2f] border border-[#2e3545] text-slate-300 hover:text-white transition-colors"
            title="منوی مدیریت"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Premium Admin / Expert Profile Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-gradient-to-l from-[#192236] to-[#121826] border border-[#2d3a54] hover:border-blue-500/40 px-3.5 py-1.5 rounded-2xl text-xs shadow-lg shadow-black/20 transition-all">
            <div className="flex flex-col text-right">
              <span className="text-white font-bold text-xs leading-snug">
                {user?.full_name || user?.phone_number || (user?.role === 'EXPERT' ? 'کارشناس بیمه' : 'مدیر سیستم')}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${user?.role === 'EXPERT' ? 'bg-cyan-400' : 'bg-emerald-400'} animate-pulse`}></span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${user?.role === 'EXPERT' ? 'text-cyan-400' : 'text-blue-400'}`}>
                  <ShieldCheck className="w-3 h-3" />
                  {user?.role === 'EXPERT'
                    ? user?.assigned_company_name
                      ? `کارشناس ${user.assigned_company_name}`
                      : 'کارشناس بیمه'
                    : 'مدیر ارشد سیستم'}
                </span>
              </div>
            </div>
            <div className={`w-8 h-8 rounded-xl ${user?.role === 'EXPERT' ? 'bg-gradient-to-tr from-cyan-600 to-blue-600 shadow-cyan-500/25' : 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 shadow-blue-500/25'} text-white flex items-center justify-center font-bold shadow-md shrink-0`}>
              <UserIcon className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
