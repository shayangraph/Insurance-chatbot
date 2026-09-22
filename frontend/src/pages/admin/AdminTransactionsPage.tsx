import React, { useEffect, useState } from 'react';
import {
  Receipt,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  AlertCircle,
  Calendar,
  ShieldCheck,
  X
} from 'lucide-react';


import { adminService } from '../../services/adminService';
import type { Payment } from '../../types';

export const AdminTransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Payment[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const fetchTransactions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminService.getTransactions(statusFilter || undefined, searchQuery || undefined);
      setTransactions(data);
    } catch (err: any) {
      setError('خطا در دریافت لیست تراکنش‌ها.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions();
  };

  const formatPrice = (num: number) => {
    return Number(num || 0).toLocaleString('en-US') + ' تومان';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fa-IR-u-nu-latn', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 font-vazir">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-400" />
            تراکنش‌ها و سوابق خرید کاربران
          </h1>
          <p className="text-xs text-slate-400 mt-1">مشاهده تمامی پرداخت‌های ثبت‌شده، مشخصات بیمه‌گذاران و سوابق مالی</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#191f2f] border border-[#2e3545] p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="جستجوی شناسه تراکنش یا شماره سفارش..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0c1322] border border-[#2e3545] rounded-xl py-2.5 pr-10 pl-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <Search className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-slate-400 shrink-0">وضعیت پرداخت:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0c1322] border border-[#2e3545] rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="">همه تراکنش‌ها</option>
            <option value="success">پرداخت موفق</option>
            <option value="pending">در انتظار پرداخت</option>
            <option value="failed">ناموفق / لغو شده</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-[#191f2f] border border-[#2e3545] rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-[#2e3545] bg-[#141926] text-slate-400">
                <th className="py-3.5 pr-4 font-medium">شناسه تراکنش</th>
                <th className="py-3.5 px-3 font-medium">شماره سفارش</th>
                <th className="py-3.5 px-3 font-medium">خریدار</th>
                <th className="py-3.5 px-3 font-medium">محصول بیمه</th>
                <th className="py-3.5 px-3 font-medium">مبلغ پرداختی</th>
                <th className="py-3.5 px-3 font-medium">تاریخ و زمان</th>
                <th className="py-3.5 px-3 text-center font-medium">وضعیت</th>
                <th className="py-3.5 pl-4 text-center font-medium">جزئیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232a3a]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                    در حال بارگذاری تراکنش‌ها...
                  </td>
                </tr>
              ) : transactions.length > 0 ? (
                transactions.map((tx: any) => (
                  <tr
                    key={tx.id}
                    onClick={() => setSelectedOrder(tx.order_data || tx.order)}
                    className="hover:bg-[#0c1322]/60 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 pr-4 font-mono font-bold text-slate-200">{tx.transaction_id}</td>
                    <td className="py-3.5 px-3 font-mono text-blue-400">{tx.order_number || (tx.order as any)?.order_number || '-'}</td>
                    <td className="py-3.5 px-3 text-white font-medium">
                      {tx.order_data?.collected_info?.full_name || tx.user_name || (tx.order as any)?.user?.full_name || tx.user_phone || (tx.order as any)?.user?.phone_number || 'مهمان'}
                    </td>
                    <td className="py-3.5 px-3 text-slate-300">
                      <span className="block font-semibold text-white">{tx.plan_title || (tx.order as any)?.plan?.title || '-'}</span>
                      <span className="text-[10px] text-blue-400">{tx.order_data?.company_name || 'بیمه‌گر'}</span>
                    </td>
                    <td className="py-3.5 px-3 font-bold text-emerald-400">{formatPrice(tx.amount)}</td>
                    <td className="py-3.5 px-3 text-slate-400 text-[11px]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {formatDate(tx.paid_at || tx.created_at)}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          tx.status === 'success'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : tx.status === 'pending'
                            ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                            : 'bg-red-500/15 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {tx.status === 'success' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : tx.status === 'pending' ? (
                          <Clock className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {tx.status_display || (tx.status === 'success' ? 'پرداخت موفق' : tx.status === 'pending' ? 'در انتظار' : 'ناموفق')}
                      </span>
                    </td>
                    <td className="py-3.5 pl-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(tx.order_data || tx.order);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 text-[11px] font-bold"
                      >
                        مشاهده
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    هیچ تراکنشی یافت نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comprehensive Order Details Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-[#191f2f] border border-[#2e3545] w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto font-vazir"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#2e3545] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">اطلاعات سفارش و خریدار بیمه</h3>
                  <span className="text-xs text-blue-400 font-bold font-vazir">شماره سفارش: {selectedOrder.order_number}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                title="بستن"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Information Block */}
            <div className="bg-[#0c1322] border border-[#2e3545] p-4 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-blue-400 block border-b border-slate-800 pb-2">
                👤 مشخصات هویتی و تماس خریدار / بیمه‌گذار:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400">نام و نام خانوادگی: </span>
                  <span className="text-white font-bold">
                    {selectedOrder.collected_info?.full_name || selectedOrder.user_name || 'ثبت نشده'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">شماره تماس همراه: </span>
                  <span className="text-white font-bold font-vazir">
                    {selectedOrder.collected_info?.phone_number || selectedOrder.user_phone || 'ثبت نشده'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">کد ملی بیمه‌گذار: </span>
                  <span className="text-white font-bold font-vazir">
                    {selectedOrder.collected_info?.national_code || 'ثبت نشده'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">کد پستی ۱۰ رقمی: </span>
                  <span className="text-white font-vazir">
                    {selectedOrder.collected_info?.postal_code || 'ثبت نشده'}
                  </span>
                </div>
              </div>
            </div>

            {/* Insured Item Block */}
            <div className="bg-[#0c1322] border border-[#2e3545] p-4 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-amber-400 block border-b border-slate-800 pb-2">
                🚗 مشخصات موضوع بیمه (خودرو / ملک / سفر / متقاضی):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {selectedOrder.collected_info?.plate_number && (
                  <div>
                    <span className="text-slate-400">شماره پلاک / شناسنامه: </span>
                    <span className="text-white font-bold font-vazir">{selectedOrder.collected_info.plate_number}</span>
                  </div>
                )}
                {selectedOrder.collected_info?.vehicle_type && (
                  <div>
                    <span className="text-slate-400">مدل و نوع خودرو: </span>
                    <span className="text-white font-bold">{selectedOrder.collected_info.vehicle_type}</span>
                  </div>
                )}
                {selectedOrder.collected_info?.build_year && (
                  <div>
                    <span className="text-slate-400">سال ساخت خودرو: </span>
                    <span className="text-white font-bold font-vazir">{selectedOrder.collected_info.build_year}</span>
                  </div>
                )}
                {selectedOrder.collected_info?.property_type && (
                  <div>
                    <span className="text-slate-400">نوع کاربری ملک: </span>
                    <span className="text-white font-bold">{selectedOrder.collected_info.property_type}</span>
                  </div>
                )}
                {selectedOrder.collected_info?.building_area && (
                  <div>
                    <span className="text-slate-400">متراژ بنا: </span>
                    <span className="text-white font-bold font-vazir">{selectedOrder.collected_info.building_area} متر مربع</span>
                  </div>
                )}
                {selectedOrder.collected_info?.destination && (
                  <div>
                    <span className="text-slate-400">مقصد سفر: </span>
                    <span className="text-white font-bold">{selectedOrder.collected_info.destination}</span>
                  </div>
                )}
                {selectedOrder.collected_info?.travel_duration && (
                  <div>
                    <span className="text-slate-400">مدت سفر: </span>
                    <span className="text-white font-bold font-vazir">{selectedOrder.collected_info.travel_duration}</span>
                  </div>
                )}
                {selectedOrder.collected_info?.insured_age && (
                  <div>
                    <span className="text-slate-400">سن متقاضی / بیمه‌شده: </span>
                    <span className="text-white font-bold font-vazir">{selectedOrder.collected_info.insured_age} سال</span>
                  </div>
                )}
                {selectedOrder.collected_info?.city && (
                  <div>
                    <span className="text-slate-400">شهر محل استقرار / پلاک: </span>
                    <span className="text-white font-bold">{selectedOrder.collected_info.city}</span>
                  </div>
                )}
                {selectedOrder.collected_info?.no_damage_years !== undefined && (
                  <div>
                    <span className="text-slate-400">سابقه تخفیف عدم خسارت: </span>
                    <span className="text-emerald-400 font-bold font-vazir">{selectedOrder.collected_info.no_damage_years} سال</span>
                  </div>
                )}
              </div>
            </div>

            {/* Policy & Coverages Block */}
            <div className="bg-[#0c1322] border border-[#2e3545] p-4 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-emerald-400 block border-b border-slate-800 pb-2">
                📋 مشخصات طرح بیمه‌نامه خریداری‌شده:
              </span>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400">عنوان طرح بیمه: </span>
                  <span className="text-white font-bold">{selectedOrder.plan_title || selectedOrder.plan?.title}</span>
                </div>
                <div>
                  <span className="text-slate-400">شرکت بیمه‌گر: </span>
                  <span className="text-blue-400 font-bold">{selectedOrder.company_name || selectedOrder.plan?.company?.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">پوشش‌های انتخاب‌شده:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedOrder.selected_coverages && selectedOrder.selected_coverages.length > 0 ? (
                      selectedOrder.selected_coverages.map((cov: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-vazir">
                          ✓ {cov}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 text-xs">پوشش‌های استاندارد و پایه طرح</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Total Price & Status Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#0c1322] border border-emerald-500/30">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">مبلغ کل پرداختی:</span>
                <span className="text-lg font-black text-emerald-400 font-vazir">
                  {formatPrice(selectedOrder.total_price)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">وضعیت پرداخت:</span>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold font-vazir ${
                    selectedOrder.status === 'paid'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {selectedOrder.status_display || (selectedOrder.status === 'paid' ? 'پرداخت موفق' : 'در انتظار پرداخت')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
