import React from 'react';
import { CreditCard, CheckCircle, ExternalLink, ShieldAlert, Download, FileText } from 'lucide-react';
import type { Order } from '../types';
import { formatPersianPrice } from '../utils/persianNumbers';

import { useNavigate } from 'react-router-dom';

interface PaymentCardProps {
  order: Order;
}

export const PaymentCard: React.FC<PaymentCardProps> = ({ order }) => {
  const navigate = useNavigate();
  const { plan, total_price, order_number, status } = order;

  const isPaid = status === 'paid';
  const downloadUrl = `http://127.0.0.1:8000/api/orders/${order.id}/download/`;

  return (
    <div className="my-4 p-5 rounded-2xl bg-gradient-to-br from-[#191f2f] via-[#1e293b] to-[#0f172a] border border-blue-500/40 shadow-xl text-right relative overflow-hidden font-vazir">
      {/* Decorative Gradient Glow */}
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-700/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white">صدور آنلاین بیمه‌نامه</h4>
            <span className="text-[11px] text-blue-400 font-bold font-vazir">شماره سفارش: {order_number}</span>
          </div>
        </div>


        {isPaid ? (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            پرداخت شده و صادر گردید
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            در انتظار پرداخت
          </span>
        )}
      </div>

      {/* Body Details */}
      <div className="space-y-2.5 mb-4 text-xs text-slate-300">
        <div className="flex justify-between">
          <span className="text-slate-400">عنوان بیمه‌نامه:</span>
          <span className="font-semibold text-white">{plan?.title || 'بیمه هوشمند'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">شرکت بیمه‌گر:</span>
          <span className="font-semibold text-slate-200">{plan?.company?.name || 'بیمه نوین'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">سقف تعهدات مالی:</span>
          <span className="font-semibold text-slate-200">{formatPersianPrice(plan?.coverage_amount)}</span>
        </div>
        <div className="flex justify-between border-t border-slate-700/60 pt-2">
          <span className="text-slate-400">روش پرداخت انتخابی:</span>
          <span className={`font-bold ${order.payment_type !== 'cash' ? 'text-blue-400' : 'text-emerald-400'}`}>
            {order.payment_type_display || (order.payment_type === 'cash' ? 'نقدی' : 'اقساطی')}
          </span>
        </div>
        {order.payment_type !== 'cash' && order.installment_count && order.installment_count > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-400">اقساط ماهانه:</span>
            <span className="font-semibold text-slate-200">
              {order.installment_count} قسط {formatPersianPrice(order.installment_amount)} تومانی
            </span>
          </div>
        )}
      </div>

      {/* Amount Box */}
      <div className="bg-[#0c1322] p-3.5 rounded-xl border border-slate-700/80 mb-5 space-y-1.5">
        {order.payment_type !== 'cash' && (
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>مبلغ کل حق بیمه:</span>
            <span>{formatPersianPrice(total_price)}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-300 font-medium">
            {order.payment_type !== 'cash' ? 'مبلغ پیش‌پرداخت (هم‌اکنون):' : 'مبلغ کل پرداختی:'}
          </span>
          <span className="text-base font-extrabold text-blue-400">
            {formatPersianPrice(order.initial_payable_amount || (order.payment_type !== 'cash' ? order.down_payment_amount : total_price))}
          </span>
        </div>
      </div>

      {/* Payment vs Download Actions */}
      {!isPaid ? (
        <div className="space-y-2.5">
          <button
            onClick={() => navigate(`/sandbox-payment/${order.id}`)}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 group"
          >
            <CreditCard className="w-4 h-4 group-hover:scale-110 transition-transform" />
            {order.payment_type !== 'cash'
              ? `پرداخت پیش‌پرداخت (${formatPersianPrice(order.initial_payable_amount || order.down_payment_amount)})`
              : `پرداخت آنلاین یکجا (${formatPersianPrice(total_price)})`}
            <ExternalLink className="w-4 h-4 mr-1 opacity-70" />
          </button>
        </div>
      ) : (

        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              بیمه‌نامه با موفقیت صادر شد و معتبر است.
            </span>
          </div>

          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 group"
          >
            <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
            دانلود فایل رسمی بیمه‌نامه (PDF / سند)
          </a>
        </div>
      )}
    </div>
  );
};

