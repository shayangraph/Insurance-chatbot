import React, { useState, useEffect } from 'react';
import {
  Download,
  X,
  ShieldCheck,
  Car,
  Flame,
  Plane,
  HeartHandshake,
  ShieldAlert,
  Building2,
  FileCheck2,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { Order } from '../types';
import { formatPersianPrice } from '../utils/persianNumbers';

interface PurchasedPolicyCardProps {
  order: Order;
  isMobileBanner?: boolean;
}

export const PurchasedPolicyCard: React.FC<PurchasedPolicyCardProps> = ({ order, isMobileBanner = false }) => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [currentOrder, setCurrentOrder] = useState<Order>(order);

  useEffect(() => {
    setCurrentOrder(order);
  }, [order]);

  if (!currentOrder || currentOrder.status !== 'paid' || !isVisible) {
    return null;
  }

  const { plan, total_price, order_number } = currentOrder;
  const downloadUrl = `http://127.0.0.1:8000/api/orders/${currentOrder.id}/download/`;

  const isInstallment = currentOrder.payment_type && currentOrder.payment_type !== 'cash';
  const totalInstallments = currentOrder.installment_count || 1;
  const paidCount = currentOrder.paid_installments_count || 1;
  const isFullyPaid = paidCount >= totalInstallments;
  const progressPercent = Math.min(100, Math.round((paidCount / totalInstallments) * 100));

  const handlePayInstallment = () => {
    navigate(`/sandbox-payment/${currentOrder.id}?type=installment`);
  };

  const getInsuranceIcon = (small = false) => {
    const cls = small ? "w-3.5 h-3.5" : "w-5 h-5";
    switch (plan?.insurance_type) {
      case 'third_party':
        return <Car className={`${cls} text-blue-400`} />;
      case 'body':
        return <ShieldAlert className={`${cls} text-indigo-400`} />;
      case 'fire':
        return <Flame className={`${cls} text-amber-400`} />;
      case 'travel':
        return <Plane className={`${cls} text-sky-400`} />;
      case 'life':
        return <HeartHandshake className={`${cls} text-emerald-400`} />;
      default:
        return <ShieldCheck className={`${cls} text-blue-400`} />;
    }
  };

  // 1. Mobile Compact Version (Fixed right above chat input bar)
  if (isMobileBanner) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 15, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-[112px] left-3.5 right-3.5 z-30 block lg:hidden p-3 rounded-2xl bg-gradient-to-r from-[#192236]/95 via-[#131b2c]/95 to-[#0e1422]/95 border border-emerald-500/50 shadow-2xl backdrop-blur-md text-right font-vazir text-slate-200"
        >
          {/* Top Row: Title + Status + Close */}
          <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-[#25324d]/80">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                {getInsuranceIcon(true)}
              </div>
              <span className="font-bold text-xs text-white truncate">
                {plan?.title || 'بیمه‌نامه فعال'}
              </span>
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isInstallment ? (isFullyPaid ? 'تسویه کامل' : `${paidCount} از ${totalInstallments} قسط`) : 'صادر شده'}
              </span>
            </div>

            <button
              onClick={() => setIsVisible(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 shrink-0 transition-colors"
              title="بستن کارت"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bottom Row: Actions & Info */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[10px] text-slate-400 truncate">
              <span className="text-slate-300 font-medium">{plan?.company?.name || 'بیمه'}</span>
              <span>•</span>
              <span className="font-mono text-emerald-400">{order_number}</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* If Installment and not fully paid: Pay Next Installment Button */}
              {isInstallment && !isFullyPaid && (
                <button
                  onClick={handlePayInstallment}
                  className="py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-[10px] shadow-md shadow-blue-600/30 flex items-center gap-1 shrink-0 transition-transform active:scale-95"
                >
                  <CreditCard className="w-3 h-3" />
                  پرداخت قسط بعدی ({formatPersianPrice(currentOrder.installment_amount)})
                </button>
              )}

              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-[10px] shadow-md shadow-emerald-600/30 flex items-center gap-1 shrink-0 transition-transform active:scale-95"
              >
                <Download className="w-3 h-3" />
                دانلود PDF
              </a>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // 2. Desktop Version (Fixed top-left)
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -15, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="hidden lg:block fixed left-6 top-20 z-20 w-72 p-4 rounded-2xl bg-gradient-to-b from-[#192236]/95 via-[#131b2c]/95 to-[#0d1320]/95 border border-emerald-500/40 shadow-2xl backdrop-blur-md text-right font-vazir text-slate-200 select-none"
      >
        {/* Header with Close Button */}
        <div className="flex items-start justify-between pb-3 mb-3 border-b border-[#2a3854]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600/30 to-blue-600/20 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner">
              {getInsuranceIcon(false)}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-extrabold text-emerald-400 tracking-wide">
                  {isInstallment ? (isFullyPaid ? 'تسویه کامل اقساط' : 'بیمه‌نامه اقساطی فعال') : 'بیمه‌نامه فعال و صادر شده'}
                </span>
              </div>
              <h3 className="font-extrabold text-xs sm:text-sm text-white leading-tight mt-0.5">
                {plan?.title || 'بیمه‌نامه هوشمند'}
              </h3>
            </div>
          </div>

          <button
            onClick={() => setIsVisible(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="بستن کارت"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Details Grid */}
        <div className="space-y-2 mb-3.5 text-xs">
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#0b101c]/80 border border-[#202c44]">
            <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              شرکت بیمه‌گر:
            </span>
            <span className="font-bold text-white text-[11px]">{plan?.company?.name || 'شرکت بیمه'}</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-[#0b101c]/80 border border-[#202c44]">
            <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5 text-slate-500" />
              شماره سفارش:
            </span>
            <span className="font-mono text-emerald-400 font-bold text-[11px]">{order_number}</span>
          </div>

          {/* If Cash: Standard details (no changes) */}
          {!isInstallment ? (
            <>
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#0b101c]/80 border border-[#202c44]">
                <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                  سقف تعهدات مالی:
                </span>
                <span className="font-bold text-slate-200 text-[11px]">
                  {formatPersianPrice(plan?.coverage_amount)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-[#0b101c]/80 border border-[#202c44]">
                <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                  مبلغ پرداختی:
                </span>
                <span className="font-bold text-blue-400 text-[11px]">
                  {formatPersianPrice(total_price)}
                </span>
              </div>
            </>
          ) : (
            /* If Installment: Show installment status & progress */
            <>
              <div className="p-2.5 rounded-xl bg-[#0b101c]/80 border border-blue-500/30 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">وضعیت اقساط:</span>
                  <span className="font-bold text-blue-400">
                    {paidCount} از {totalInstallments} قسط پرداخت شده
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-emerald-400 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-[#0b101c]/80 border border-[#202c44]">
                <span className="text-slate-400 text-[11px]">مبلغ هر قسط:</span>
                <span className="font-bold text-slate-200 text-[11px]">
                  {formatPersianPrice(currentOrder.installment_amount)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {/* If installment and not fully paid: Pay Next Installment Button directly from card */}
          {isInstallment && !isFullyPaid && (
            <button
              onClick={handlePayInstallment}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all group active:scale-95"
            >
              <CreditCard className="w-4 h-4 group-hover:scale-110 transition-transform" />
              پرداخت قسط شماره {paidCount + 1} ({formatPersianPrice(currentOrder.installment_amount)})
            </button>
          )}

          {/* Download PDF Button */}
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all group active:scale-95"
          >
            <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
            دانلود بیمه‌نامه (PDF)
          </a>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
