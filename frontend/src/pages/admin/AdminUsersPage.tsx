import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  UserCheck,
  Shield,
  Phone,
  ShoppingBag,
  MessageSquare,
  X,
  Loader2,
  Calendar,
  AlertCircle,
  Eye
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import type { AdminUserListItem, AdminUserDetail, InsuranceCompany } from '../../types';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected User Modal State
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Edit Role/Company/Approval in Modal
  const [editRole, setEditRole] = useState<'USER' | 'ADMIN' | 'EXPERT'>('USER');
  const [editCompanyId, setEditCompanyId] = useState<number | null>(null);
  const [editIsApproved, setEditIsApproved] = useState<boolean>(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminService.getUsers(searchQuery, roleFilter);
      setUsers(data);
    } catch (err: any) {
      setError('خطا در دریافت لیست کاربران.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  useEffect(() => {
    adminService.getCompanies().then((comps) => setCompanies(comps)).catch(() => {});
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleSelectUser = async (userId: number) => {
    setIsLoadingDetail(true);
    setSelectedUser(null);
    try {
      const detail = await adminService.getUserDetail(userId);
      setSelectedUser(detail);
      setEditRole(detail.role || 'USER');
      setEditCompanyId(detail.assigned_company || null);
      setEditIsApproved(detail.is_approved_expert || false);
    } catch {
      alert('خطا در دریافت جزئیات کاربر');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleSaveUserAccess = async () => {
    if (!selectedUser) return;
    setIsUpdatingRole(true);
    try {
      const updated = await adminService.updateUserRoleOrStatus(selectedUser.id, {
        role: editRole,
        assigned_company_id: editRole === 'EXPERT' ? editCompanyId : null,
        is_approved_expert: editRole === 'EXPERT' ? editIsApproved : false,
      });

      setSelectedUser({
        ...selectedUser,
        role: updated.role,
        role_display: updated.role_display,
        assigned_company: updated.assigned_company,
        assigned_company_name: updated.assigned_company_name,
        is_approved_expert: updated.is_approved_expert,
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? {
                ...u,
                role: updated.role,
                role_display: updated.role_display,
                assigned_company: updated.assigned_company,
                assigned_company_name: updated.assigned_company_name,
                is_approved_expert: updated.is_approved_expert,
              }
            : u
        )
      );
      alert('سطح دسترسی و شرکت کارشناس با موفقیت ذخیره شد.');
    } catch {
      alert('خطا در بروزرسانی نقش و دسترسی کاربر');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const formatPrice = (num: number) => {
    return Number(num || 0).toLocaleString('en-US') + ' تومان';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fa-IR-u-nu-latn', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            مدیریت کاربران سامانه
          </h1>
          <p className="text-xs text-slate-400 mt-1">مشاهده لیست اعضا، نقش‌های کاربری، سوابق سفارشات و درخواست‌های بیمه</p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-[#191f2f] border border-[#2e3545] p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="جستجوی نام یا شماره همراه..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0c1322] border border-[#2e3545] rounded-xl py-2.5 pr-10 pl-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <Search className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-slate-400 shrink-0">فیلتر نقش:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-[#0c1322] border border-[#2e3545] rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="">همه کاربران</option>
            <option value="ADMIN">مدیران سیستم</option>
            <option value="EXPERT">کارشناسان بیمه</option>
            <option value="USER">کاربران عادی</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-[#191f2f] border border-[#2e3545] rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-[#2e3545] bg-[#141926] text-slate-400">
                <th className="py-3.5 pr-4 font-medium">نام و نام خانوادگی</th>
                <th className="py-3.5 px-3 font-medium">شماره همراه</th>
                <th className="py-3.5 px-3 font-medium">نقش و وضعیت</th>
                <th className="py-3.5 px-3 font-medium">تعداد سفارش‌ها</th>
                <th className="py-3.5 px-3 font-medium">تاریخ عضویت</th>
                <th className="py-3.5 pl-4 text-center font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232a3a]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                    در حال بارگذاری کاربران...
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#0c1322]/50 transition-colors">
                    <td className="py-3.5 pr-4 font-medium text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs">
                        {u.full_name ? u.full_name[0] : 'ک'}
                      </div>
                      {u.full_name || 'بدون نام'}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-300">{u.phone_number}</td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                            : u.role === 'EXPERT'
                            ? u.is_approved_expert
                              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-500/15 text-slate-300 border border-slate-500/30'
                        }`}
                      >
                        {u.role === 'ADMIN' ? (
                          <Shield className="w-3 h-3" />
                        ) : u.role === 'EXPERT' ? (
                          <UserCheck className="w-3 h-3" />
                        ) : (
                          <UserCheck className="w-3 h-3" />
                        )}
                        {u.role === 'ADMIN'
                          ? 'مدیر سیستم'
                          : u.role === 'EXPERT'
                          ? `کارشناس ${u.assigned_company_name || 'بدون شرکت'} (${u.is_approved_expert ? 'تاییدشده' : 'در انتظار تایید'})`
                          : 'کاربر عادی'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-300">{u.orders_count || 0} سفارش</td>
                    <td className="py-3.5 px-3 text-slate-400">{formatDate(u.created_at)}</td>
                    <td className="py-3.5 pl-4 text-center">
                      <button
                        onClick={() => handleSelectUser(u.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 transition-all font-medium text-[11px]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        مشاهده جزئیات
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    هیچ کاربری با این مشخصات یافت نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal Drawer */}
      {(selectedUser || isLoadingDetail) && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#191f2f] border border-[#2e3545] w-full max-w-2xl rounded-3xl p-6 max-h-[90vh] overflow-y-auto shadow-2xl relative text-right">
            {isLoadingDetail ? (
              <div className="py-16 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-3" />
                در حال دریافت مشخصات کاربر...
              </div>
            ) : selectedUser ? (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-[#2e3545]">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-lg font-bold">
                      {selectedUser.full_name ? selectedUser.full_name[0] : 'ک'}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">{selectedUser.full_name || 'کاربر بدون نام'}</h2>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-blue-400" />
                          {selectedUser.phone_number}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-emerald-400" />
                          عضویت: {formatDate(selectedUser.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#232a3a]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Access Role & Company Management Panel */}
                <div className="bg-[#0c1322] border border-[#2e3545] p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-[#232a3a] pb-3">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-bold text-white">تنظیم سطح دسترسی و تعیین شرکت بیمه</span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      نقش فعلی: <strong className="text-white">{selectedUser.role === 'ADMIN' ? 'مدیر سیستم' : selectedUser.role === 'EXPERT' ? 'کارشناس بیمه' : 'کاربر عادی'}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Role Selector */}
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">
                        نقش کاربری در سامانه
                      </label>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as any)}
                        className="w-full bg-[#191f2f] border border-[#2e3545] rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="USER">کاربر عادی</option>
                        <option value="EXPERT">کارشناس بیمه</option>
                        <option value="ADMIN">مدیر سیستم</option>
                      </select>
                    </div>

                    {/* Company Selector (Only if EXPERT) */}
                    {editRole === 'EXPERT' && (
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">
                          شرکت بیمه مربوطه (جهت مشاهده مشتریان)
                        </label>
                        <select
                          value={editCompanyId || ''}
                          onChange={(e) => setEditCompanyId(e.target.value ? Number(e.target.value) : null)}
                          className="w-full bg-[#191f2f] border border-cyan-500/40 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                        >
                          <option value="">-- انتخاب شرکت بیمه --</option>
                          {companies.map((comp) => (
                            <option key={comp.id} value={comp.id}>
                              {comp.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Approval Checkbox for Expert */}
                  {editRole === 'EXPERT' && (
                    <div className="pt-3 border-t border-[#232a3a]">
                      <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[#0c1322] border border-[#2e3545] hover:border-emerald-500/40 cursor-pointer select-none transition-all">
                        <input
                          type="checkbox"
                          checked={editIsApproved}
                          onChange={(e) => setEditIsApproved(e.target.checked)}
                          className="mt-0.5 w-5 h-5 rounded border-slate-600 bg-[#191f2f] text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer accent-emerald-500 shrink-0"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">
                              تایید صلاحیت و فعال‌سازی دسترسی کارشناس
                            </span>
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                                editIsApproved
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {editIsApproved ? '✓ تایید شده و فعال' : '⏳ در انتظار تایید'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                            {editIsApproved
                              ? 'کارشناس مجاز است مشخصات مشتریان و سفارش‌های شرکت انتخاب‌شده را مشاهده نماید.'
                              : 'برای اعطای دسترسی به پنل و مشاهده مشتریان شرکت، تیک این گزینه را فعال کنید.'}
                          </p>
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Save Access Button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleSaveUserAccess}
                      disabled={isUpdatingRole || (editRole === 'EXPERT' && !editCompanyId)}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
                    >
                      {isUpdatingRole && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>ذخیره تغییرات سطح دسترسی</span>
                    </button>
                  </div>
                </div>

                {/* Orders History Section */}
                <div>
                  <h3 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-blue-400" />
                    سفارش‌های ثبت شده کاربر ({selectedUser.orders?.length || 0})
                  </h3>
                  {selectedUser.orders && selectedUser.orders.length > 0 ? (
                    <div className="space-y-2">
                      {selectedUser.orders.map((ord) => (
                        <div
                          key={ord.id}
                          className="bg-[#0c1322] border border-[#2e3545] p-3 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-mono text-slate-300 font-bold ml-2">{ord.order_number}</span>
                            <span className="text-white">{ord.plan_title} ({ord.company_name})</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-emerald-400 font-bold">{formatPrice(ord.total_price)}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                ord.status === 'paid'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-yellow-500/10 text-yellow-400'
                              }`}
                            >
                              {ord.status_display || ord.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 bg-[#0c1322] p-4 rounded-xl text-center">
                      تاکنون هیچ سفارشی برای این کاربر ثبت نشده است.
                    </p>
                  )}
                </div>

                {/* Insurance Chat Sessions / Requests Section */}
                <div>
                  <h3 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    درخواست‌ها و گفتگوهای مشاوره‌ای ({selectedUser.chat_sessions?.length || 0})
                  </h3>
                  {selectedUser.chat_sessions && selectedUser.chat_sessions.length > 0 ? (
                    <div className="space-y-2">
                      {selectedUser.chat_sessions.map((sess) => (
                        <div
                          key={sess.id}
                          className="bg-[#0c1322] border border-[#2e3545] p-3 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="text-white font-medium">{sess.title}</p>
                            <span className="text-[10px] text-slate-400">
                              نوع بیمه: {sess.insurance_type || 'عمومی'} | تعداد پیام‌ها: {sess.messages_count || 0}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">{formatDate(sess.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 bg-[#0c1322] p-4 rounded-xl text-center">
                      هیچ سابقه گفتگویی ثبت نشده است.
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
