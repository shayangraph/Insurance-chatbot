import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MessageSquare, ShieldCheck, X, Sparkles, Pencil, Trash2, Check, Lock } from 'lucide-react';
import type { ChatSession } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
  onDeleteSession: (sessionId: string) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onRenameSession,
  onDeleteSession,
  isOpen,
  onCloseMobile,
}) => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN' || user?.is_staff || user?.is_superuser;
  const isExpert = user?.role === 'EXPERT';
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState<string>('');

  const handleStartRename = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitleInput(session.title || '');
  };

  const handleSaveRename = (e: React.FormEvent | React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (editTitleInput.trim()) {
      onRenameSession(sessionId, editTitleInput.trim());
    }
    setEditingSessionId(null);
  };

  const handleDelete = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (window.confirm('آیا از حذف این گفتگو اطمینان دارید؟')) {
      onDeleteSession(sessionId);
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container - Fixed Right (RTL context) */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-50 w-64 bg-[#0c1322] border-l border-[#232a3a] flex flex-col justify-between transition-transform duration-300 ease-in-out font-shabnam ${
          isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Header Block */}
        <div className="p-4 border-b border-[#191f2f] bg-gradient-to-b from-[#11192a] to-[#0c1322]">
          {/* Logo Header Card */}
          <div className={`flex items-center justify-between ${isAuthenticated ? 'mb-4' : ''}`}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <ShieldCheck className="w-5.5 h-5.5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-sm text-white tracking-tight flex items-center gap-1">
                  بیمه هوشمند
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                </span>
                <span className="text-[10px] text-slate-400 font-medium">پلتفرم استعلام و صدور</span>
              </div>
            </div>
            <button
              onClick={onCloseMobile}
              className="md:hidden text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* New Chat Button (Only for Logged-In Users) */}
          {isAuthenticated && (
            <button
              onClick={() => {
                onNewChat();
                onCloseMobile();
              }}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all transform active:scale-95 group"
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
              گفتگوی جدید
            </button>
          )}
        </div>

        {/* Middle Area */}
        {!isAuthenticated ? (
          /* Unauthenticated Clean Guest State */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-slate-400 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <div className="font-semibold text-slate-300">تاریخچه گفتگوها</div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              برای ذخیره پیام‌ها و دسترسی به گفتگوهای قبلی خود، لطفاً وارد حساب کاربری شوید.
            </p>
          </div>
        ) : (
          /* Logged In User History Sessions List */
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 px-2 mb-2 block">
              گفتگوهای اخیر
            </span>

            {sessions && sessions.length > 0 ? (
              sessions.map((session) => {
                const isActive = session.id === currentSessionId;
                const isEditing = editingSessionId === session.id;

                return (
                  <div
                    key={session.id}
                    onClick={() => {
                      if (!isEditing) {
                        onSelectSession(session.id);
                        onCloseMobile();
                      }
                    }}
                    className={`group relative w-full flex items-center justify-between p-2.5 rounded-xl text-right text-[13px] font-medium leading-relaxed transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#192236] text-white border border-blue-500/50 font-semibold shadow-sm'
                        : 'text-slate-300 hover:bg-[#151c2c] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                      <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                      
                      {isEditing ? (
                        <form onSubmit={(e) => handleSaveRename(e, session.id)} className="flex items-center gap-1 flex-1">
                          <input
                            type="text"
                            value={editTitleInput}
                            onChange={(e) => setEditTitleInput(e.target.value)}
                            autoFocus
                            className="w-full bg-[#0c1322] border border-blue-500 text-white text-[13px] px-2 py-1 rounded focus:outline-none"
                          />
                          <button
                            type="submit"
                            className="p-1 text-emerald-400 hover:text-emerald-300"
                            title="ذخیره"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      ) : (
                        <span className="truncate flex-1 font-medium">{session.title || 'گفتگوی هوشمند'}</span>
                      )}
                    </div>

                    {/* Inline Actions (Rename & Delete) */}
                    {!isEditing && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mr-1">
                        <button
                          onClick={(e) => handleStartRename(e, session)}
                          className="p-1 text-slate-400 hover:text-blue-400 hover:bg-[#232a3a] rounded transition-colors"
                          title="تغییر نام"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, session.id)}
                          className="p-1 text-slate-400 hover:text-red-400 hover:bg-[#232a3a] rounded transition-colors"
                          title="حذف گفتگو"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-[11px] text-slate-600 text-center py-6">
                هنوز گفتگویی ثبت نشده است.
              </div>
            )}
          </div>
        )}

        {isAuthenticated && (isAdmin || isExpert) && (
          <div className="p-3 border-t border-[#191f2f] bg-[#0c1322]">
            <button
              onClick={() => {
                navigate('/admin');
                onCloseMobile();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-cyan-600/20 hover:from-blue-600 hover:to-indigo-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <ShieldCheck className="w-4 h-4 text-cyan-400 group-hover:text-white" />
              <span>
                {isExpert
                  ? user?.assigned_company_name
                    ? `پنل کارشناس (${user.assigned_company_name})`
                    : 'پنل کارشناس بیمه'
                  : 'ورود به پنل مدیریت'}
              </span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
