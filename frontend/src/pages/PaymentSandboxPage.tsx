import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { insuranceService } from '../services/insuranceService';
import { paymentService } from '../services/paymentService';
import type { Order } from '../types';
import { formatPersianPrice } from '../utils/persianNumbers';

import { CreditCard, ShieldCheck, CheckCircle2, XCircle, ArrowRight, Loader2, Clock } from 'lucide-react';

export const PaymentSandboxPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isInstallmentPayment = searchParams.get('type') === 'installment';

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState('6037 9975 1234 5678');
  const [cvv2, setCvv2] = useState('892');
  const [expireMonth, setExpireMonth] = useState('08');
  const [expireYear, setExpireYear] = useState('06');
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes timer
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!orderId) return;
    const fetchOrder = async () => {
      try {
        const data = await insuranceService.getOrder(orderId);
        setOrder(data);
      } catch (e) {
        console.error('Order fetch error:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  // Timer Countdown
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleProcessPayment = async (status_action: 'success' | 'failed') => {
    if (!orderId || isProcessing) return;
    setIsProcessing(true);
    setResultMessage(null);

    try {
      if (isInstallmentPayment) {
        if (status_action === 'success') {
          const res = await insuranceService.payInstallment(orderId);
          setResultMessage({
            type: 'success',
            text: `پرداخت با موفقیت انجام شد! ${res.message}. در حال بازگشت به سامانه...`
          });
          setTimeout(() => {
            navigate('/');
          }, 1500);
        } else {
          setResultMessage({ type: 'error', text: 'پرداخت قسط لغو گردید. در حال بازگشت...' });
          setTimeout(() => {
            navigate('/');
          }, 1000);
        }
      } else {
        const res = await paymentService.processSandboxPayment(orderId, status_action);
        if (status_action === 'success') {
          setResultMessage({
            type: 'success',
            text: `پرداخت با موفقیت انجام شد! کد پیگیری: ${res.transaction_id}. در حال بازگشت به سامانه...`
          });
          setTimeout(() => {
            navigate('/');
          }, 1500);
        } else {
          setResultMessage({ type: 'error', text: 'تراکنش لغو گردید. در حال بازگشت به گفتگوی بیمه...' });
          setTimeout(() => {
            navigate('/');
          }, 1000);
        }
      }
    } catch (e: any) {
      const errText = e.response?.data?.detail || 'خطا در برقراری ارتباط با درگاه. در حال بازگشت...';
      setResultMessage({ type: 'error', text: errText });
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } finally {
      setIsProcessing(false);
    }
  };


  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0c1322] flex items-center justify-center font-vazir text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-xs text-slate-400">در حال انتقال به درگاه پرداخت...</span>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#0c1322] flex items-center justify-center font-vazir text-slate-100">
        <div className="bg-[#191f2f] p-8 rounded-2xl border border-[#2e3545] text-center max-w-sm">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-base font-bold text-white mb-2">سفارش یافت نشد</h2>
          <button onClick={() => navigate('/')} className="text-xs text-blue-400 underline">
            بازگشت به صفحه اصلی
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070e1d] flex flex-col items-center justify-center p-4 font-vazir text-right text-slate-100">
      {/* Header Info */}
      <div className="max-w-xl w-full mb-4 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white">
          <ArrowRight className="w-4 h-4" />
          انصراف و بازگشت
        </button>
        <div className="flex items-center gap-2 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded-full font-mono">
          <Clock className="w-3.5 h-3.5" />
          زمان باقی‌مانده: {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
      </div>

      {/* Main Sandbox Gateway Card */}
      <div className="max-w-xl w-full bg-[#141b2b] border border-[#2e3545] rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-6 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-6 h-6 text-cyan-300" />
              <h1 className="font-extrabold text-lg">درگاه پرداخت آزمایشی (Sandbox)</h1>
            </div>
            <p className="text-xs text-blue-100">سامانه الکترونیکی صدور بیمه‌نامه «بیمه هوشمند»</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Invoice details */}
        <div className="p-6 border-b border-[#2e3545] bg-[#191f2f]/60 space-y-2.5 text-xs text-slate-300">
          <div className="flex justify-between">
            <span className="text-slate-400">شماره سفارش:</span>
            <span className="font-mono font-bold text-white">{order.order_number}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-400">عنوان طرح:</span>
            <span className="font-semibold text-slate-100">{order.plan?.title}</span>
          </div>

          {isInstallmentPayment ? (
            <>
              <div className="flex justify-between">
                <span className="text-slate-400">موضوع تراکنش:</span>
                <span className="font-bold text-blue-400">
                  پرداخت قسط شماره {(order.paid_installments_count || 1) + 1} از {order.installment_count}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>تعداد کل اقساط:</span>
                <span>{order.installment_count} ماهه</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-700/60 items-center">
                <span className="text-slate-300 font-bold">مبلغ قسط قابل پرداخت:</span>
                <span className="font-extrabold text-emerald-400 text-base">
                  {formatPersianPrice(order.installment_amount)}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-slate-400">روش پرداخت:</span>
                <span className={`font-bold ${order.payment_type !== 'cash' ? 'text-blue-400' : 'text-emerald-400'}`}>
                  {order.payment_type_display || (order.payment_type === 'cash' ? 'نقدی (یکجا)' : 'اقساطی')}
                </span>
              </div>

              {order.payment_type !== 'cash' && order.installment_count && (
                <>
                  <div className="flex justify-between text-slate-400">
                    <span>مبلغ کل قرارداد بیمه:</span>
                    <span>{formatPersianPrice(order.total_price)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>اقساط ماهیانه:</span>
                    <span className="font-semibold">{order.installment_count} قسط {formatPersianPrice(order.installment_amount)} تومانی</span>
                  </div>
                </>
              )}

              <div className="flex justify-between pt-2 border-t border-slate-700/60 items-center">
                <span className="text-slate-300 font-bold">
                  {order.payment_type !== 'cash' ? 'مبلغ پیش‌پرداخت قابل پرداخت درگاه:' : 'مبلغ کل قابل پرداخت:'}
                </span>
                <span className="font-extrabold text-emerald-400 text-base">
                  {formatPersianPrice(order.initial_payable_amount || (order.payment_type !== 'cash' ? order.down_payment_amount : order.total_price))}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Result status alert */}
        {resultMessage && (
          <div className={`m-6 p-4 rounded-xl text-xs flex items-center gap-2 ${
            resultMessage.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-400' : 'bg-red-500/10 border border-red-500/40 text-red-400'
          }`}>
            {resultMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
            <span>{resultMessage.text}</span>
          </div>
        )}

        {/* Card Simulation Form */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">شماره کارت (آزمایشی)</label>
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="w-full bg-[#0c1322] border border-[#2e3545] rounded-xl py-3 px-4 text-sm text-center font-mono text-cyan-300 focus:outline-none focus:border-blue-500 dir-ltr"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">کد CVV2</label>
              <input
                type="text"
                value={cvv2}
                onChange={(e) => setCvv2(e.target.value)}
                className="w-full bg-[#0c1322] border border-[#2e3545] rounded-xl py-2.5 px-4 text-sm text-center font-mono text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">تاریخ انقضا (ماه / سال)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={expireMonth}
                  onChange={(e) => setExpireMonth(e.target.value)}
                  placeholder="ماه"
                  className="w-full bg-[#0c1322] border border-[#2e3545] rounded-xl py-2.5 px-2 text-sm text-center font-mono text-white focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  value={expireYear}
                  onChange={(e) => setExpireYear(e.target.value)}
                  placeholder="سال"
                  className="w-full bg-[#0c1322] border border-[#2e3545] rounded-xl py-2.5 px-2 text-sm text-center font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Action Simulation Buttons */}
          <div className="pt-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => handleProcessPayment('success')}
              disabled={isProcessing}
              className="py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              پرداخت موفقیت‌آمیز
            </button>

            <button
              onClick={() => handleProcessPayment('failed')}
              disabled={isProcessing}
              className="py-3.5 px-4 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              انصراف / پرداخت ناموفق
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0c1322] text-center border-t border-[#2e3545]">
          <span className="text-[11px] text-slate-500">
            این یک درگاه تست و شبیه‌سازی شده برای محیط توسعه است. هیچ مبلغ واقعی کسر نخواهد شد.
          </span>
        </div>

      </div>
    </div>
  );
};
