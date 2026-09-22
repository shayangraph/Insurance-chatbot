import React, { useEffect, useState } from 'react';
import {
  Users,
  ShieldCheck,
  ShoppingBag,
  CheckCircle2,
  Clock,
  Coins,
  Receipt,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Plus,
  X,
  XCircle
} from 'lucide-react';


import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import type { AdminDashboardData } from '../../types';

export const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const navigate = useNavigate();

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminService.getDashboardStats();
      setData(res);
    } catch (err: any) {
      setError('خطا در دریافت اطلاعات داشبورد از سرور.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            {data?.is_expert ? `داشبورد اختصاصی کارشناس (${data.company_name})` : 'داشبورد مدیریت و آمار سیستم'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {data?.is_expert
              ? `آمار و عملکرد بیمه‌نامه‌های مشتریان شرکت ${data.company_name}`
              : 'نمای کلی از عملکرد سیستم بیمه هوشمند، کاربران، سفارشات و تراکنش‌ها'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#191f2f] hover:bg-[#232a3a] border border-[#2e3545] text-xs text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>بروزرسانی داده‌ها</span>
          </button>
          {!data?.is_expert && (
            <button
              onClick={() => navigate('/admin/products')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن محصول جدید</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Users / Customers */}
        <div className="bg-[#191f2f] border border-[#2e3545] p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-medium">
              {data?.is_expert ? 'مشتریان شرکت' : 'کل کاربران'}
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {isLoading ? '...' : (data?.metrics.total_users || 0).toLocaleString('en-US')}
          </div>
          <span className="text-[10px] text-slate-400 mt-2">
            {data?.is_expert ? `خریداران بیمه ${data.company_name}` : 'ثبت‌نام شده در سامانه'}
          </span>
        </div>

        {/* Total Products */}
        <div className="bg-[#191f2f] border border-[#2e3545] p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-medium">محصولات بیمه</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {isLoading ? '...' : (data?.metrics.total_products || 0).toLocaleString('en-US')}
          </div>
          <span className="text-[10px] text-slate-400 mt-2">طرح فعال در ۵ شرکت</span>
        </div>

        {/* Total Orders */}
        <div className="bg-[#191f2f] border border-[#2e3545] p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-medium">کل سفارشات</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {isLoading ? '...' : (data?.metrics.total_orders || 0).toLocaleString('en-US')}
          </div>
          <span className="text-[10px] text-slate-400 mt-2">سفارش ثبت‌شده</span>
        </div>

        {/* Paid Orders */}
        <div className="bg-[#191f2f] border border-[#2e3545] p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-medium">سفارشات موفق</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {isLoading ? '...' : (data?.metrics.paid_orders || 0).toLocaleString('en-US')}
          </div>
          <span className="text-[10px] text-emerald-400 mt-2">پرداخت و صدور شده</span>
        </div>

        {/* Pending Orders */}
        <div className="bg-[#191f2f] border border-[#2e3545] p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-medium">در انتظار پرداخت</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400">
            {isLoading ? '...' : (data?.metrics.pending_orders || 0).toLocaleString('en-US')}
          </div>
          <span className="text-[10px] text-amber-400 mt-2">پیش‌فاکتور فعال</span>
        </div>

        {/* Total Revenue */}
        <div className="bg-[#191f2f] border border-[#2e3545] p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-medium">درآمد کل</span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base font-black text-white truncate">
            {isLoading ? '...' : formatPrice(data?.metrics.total_revenue || 0)}
          </div>
          <span className="text-[10px] text-teal-400 mt-2 flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" />
            فروش کل بیمه‌نامه‌ها
          </span>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Recent Orders */}
        <div className="bg-[#191f2f] border border-[#2e3545] rounded-3xl p-5 shadow-xl">

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-blue-400" />
              آخرین سفارشات و مشخصات خریداران
            </h2>
            <button
              onClick={() => navigate('/admin/transactions')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              مشاهده همه
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-[#2e3545] text-slate-400">
                  <th className="pb-3 pr-2 font-medium">خریدار / تلفن</th>
                  <th className="pb-3 font-medium">طرح بیمه</th>
                  <th className="pb-3 font-medium">مبلغ</th>
                  <th className="pb-3 pl-2 font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232a3a]">
                {data?.recent_orders && data.recent_orders.length > 0 ? (
                  data.recent_orders.map((order: any) => (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="hover:bg-[#0c1322]/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 pr-2 text-white font-medium">
                        {order.collected_info?.full_name || order.user_name || order.collected_info?.phone_number || order.user_phone || 'کاربر مهمان'}
                      </td>
                      <td className="py-3.5 text-slate-200 font-bold">
                        {order.plan_title || order.plan?.title}
                      </td>
                      <td className="py-3.5 text-emerald-400 font-bold">{formatPrice(order.total_price)}</td>
                      <td className="py-3.5 pl-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                          }}
                          className="px-3 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 text-xs font-bold whitespace-nowrap"
                        >
                          مشاهده
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      هیچ سفارشی تاکنون ثبت نشده است.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-[#191f2f] border border-[#2e3545] rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              آخرین تراکنش‌های بانکی
            </h2>
            <button
              onClick={() => navigate('/admin/transactions')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              مشاهده همه
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-[#2e3545] text-slate-400">
                  <th className="pb-3 pr-2 font-medium">شناسه تراکنش</th>
                  <th className="pb-3 font-medium">خریدار</th>
                  <th className="pb-3 font-medium">مبلغ</th>
                  <th className="pb-3 pl-2 font-medium">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232a3a]">
                {data?.recent_transactions && data.recent_transactions.length > 0 ? (
                  data.recent_transactions.map((tx: any) => (
                    <tr
                      key={tx.id}
                      onClick={() => setSelectedOrder(tx.order_data || tx.order)}
                      className="hover:bg-[#0c1322]/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 pr-2 font-mono text-slate-300 font-bold">{tx.transaction_id}</td>
                      <td className="py-3.5 text-slate-200">
                        {tx.order_data?.collected_info?.full_name || tx.user_name || tx.user_phone || 'کاربر مهمان'}
                      </td>
                      <td className={`py-3.5 font-bold font-vazir ${tx.status === 'success' ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {formatPrice(tx.amount)}
                      </td>
                      <td className="py-3.5 pl-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                            tx.status === 'success'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : tx.status === 'pending'
                              ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {tx.status === 'success' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : tx.status === 'pending' ? (
                            <Clock className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {tx.status_display || (tx.status === 'success' ? 'پرداخت موفق' : tx.status === 'pending' ? 'در انتظار' : 'پرداخت ناموفق')}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      هیچ تراکنشی ثبت نشده است.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>


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
                  <h3 className="text-base font-bold text-white">جزئیات کامل سفارش بیمه‌نامه</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-vazir mt-0.5">
                    <span className="text-blue-400 font-bold">شماره سفارش: {selectedOrder.order_number}</span>
                    <span>•</span>
                    <span>زمان ثبت: {formatDate(selectedOrder.created_at)}</span>
                  </div>
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
                👤 مشخصات هویتی و تماس بیمه‌گذار:
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

            {/* Insured Item Block (Car / House / Travel / Life) */}
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
                📋 مشخصات بیمه‌نامه و پوشش‌های انتخاب‌شده:
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
                  <span className="text-slate-400 block mb-1">پوشش‌های انتخاب‌شده در این سفارش:</span>
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
                <span className="text-xs text-slate-400">مبلغ کل حق بیمه:</span>
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
