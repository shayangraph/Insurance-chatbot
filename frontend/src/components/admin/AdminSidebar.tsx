import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  Receipt,
  MessageSquare,
  LogOut,
  X
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isExpert = user?.role === 'EXPERT';
  const companyName = user?.assigned_company_name || 'شرکت بیمه';

  const navItems = isExpert
    ? [
        { to: '/admin', end: true, label: `داشبورد ${companyName}`, icon: LayoutDashboard },
        { to: '/admin/transactions', end: false, label: 'مشتریان و سفارش‌ها', icon: Receipt },
      ]
    : [
        { to: '/admin', end: true, label: 'داشبورد مدیریت', icon: LayoutDashboard },
        { to: '/admin/users', end: false, label: 'مدیریت کاربران', icon: Users },
        { to: '/admin/products', end: false, label: 'محصولات و پوشش‌ها', icon: ShieldAlert },
        { to: '/admin/transactions', end: false, label: 'تراکنش‌ها و سفارشات', icon: Receipt },
      ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 right-0 z-50 h-screen w-64 bg-[#111726] border-l border-[#232a3a] flex flex-col justify-between transition-transform duration-300 ease-in-out font-vazir text-right ${
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Header */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-[#232a3a]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white tracking-wide truncate max-w-[140px]">
                  {isExpert ? `پنل کارشناس ${companyName}` : 'پنل مدیریت بیمه'}
                </h1>
                <span className="text-[10px] text-blue-400 font-medium">
                  {isExpert ? 'دسترسی فقط‌خواندنی' : 'نسخه ۲.۴ ادمین'}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#191f2f]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="p-4 space-y-1.5">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              بخش‌های اصلی
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => onClose()}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-[#191f2f]'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#232a3a] space-y-2">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-[#191f2f] transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>ورود به چت‌بات بیمه</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-red-400 hover:text-white hover:bg-red-500/20 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>خروج از پنل</span>
          </button>
        </div>
      </aside>
    </>
  );
};
