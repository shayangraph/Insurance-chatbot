import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Award,
  Sparkles,
  CreditCard,
  X,
  Check,

  PlusCircle,
  CheckSquare,
  Square,
  Car,
  Home,
  Plane,
  Heart
} from 'lucide-react';
import type { Recommendation } from '../types';
import { formatPersianPrice } from '../utils/persianNumbers';
import { useAuth } from '../contexts/AuthContext';

interface RecommendationCardProps {
  recommendation: Recommendation;
  onConfirm: (recommendation: Recommendation) => void;
  onCancel: () => void;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({ recommendation, onConfirm, onCancel }) => {
  const { user } = useAuth();
  const { plan, calculated_price, original_price, discount_amount, recommendation_reason } = recommendation;
  const insType = plan.insurance_type || 'third_party';

  // Track user-selected optional coverages
  const [selectedOptionalIds, setSelectedOptionalIds] = useState<number[]>([]);
  const [showPersonalForm, setShowPersonalForm] = useState(false);

  // Common Fields
  const [nationalCode, setNationalCode] = useState(recommendation.collected_data?.national_code || '');
  const [postalCode, setPostalCode] = useState(recommendation.collected_data?.postal_code || '');

  // Vehicle Specific (Third Party & Body)
  const [plateNumber, setPlateNumber] = useState(recommendation.collected_data?.plate_number || '');
  const [chassisNumber, setChassisNumber] = useState(recommendation.collected_data?.chassis_number || '');

  // Property Specific (Fire)
  const [propertyAddress, setPropertyAddress] = useState(recommendation.collected_data?.property_address || '');
  const [propertyRegistryCode, setPropertyRegistryCode] = useState(recommendation.collected_data?.property_registry_code || '');

  // Travel Specific
  const [passportNumber, setPassportNumber] = useState(recommendation.collected_data?.passport_number || '');
  const [travelStartDate, setTravelStartDate] = useState(recommendation.collected_data?.travel_start_date || '');
  const [destination, setDestination] = useState(recommendation.collected_data?.destination || '');

  // Life Specific
  const [insuredJob, setInsuredJob] = useState(recommendation.collected_data?.insured_job || '');
  const [beneficiaryName, setBeneficiaryName] = useState(recommendation.collected_data?.beneficiary_name || '');
  const [insuredAge, setInsuredAge] = useState(recommendation.collected_data?.insured_age ? String(recommendation.collected_data.insured_age) : '');

  // Calculate dynamic additional price for checked optional coverages
  const optionalAddonTotal = (plan.coverages || [])
    .filter((c) => selectedOptionalIds.includes(c.id) && c.coverage_type === 'OPTIONAL')
    .reduce((sum, c) => sum + Number(c.additional_price || 0), 0);

  const dynamicFinalPrice = Number(calculated_price) + optionalAddonTotal;
  const dynamicOriginalPrice = Number(original_price) + optionalAddonTotal;

  // Payment Method State & Installment Calculations
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'installment_3' | 'installment_6'>('cash');
  const isInstallmentAvailable = plan.is_installment_enabled !== false;
  const allow3Months = isInstallmentAvailable && plan.allow_3_months !== false;
  const allow6Months = isInstallmentAvailable && plan.allow_6_months !== false;
  const downPaymentPercent = plan.down_payment_percent && plan.down_payment_percent > 0 ? plan.down_payment_percent : 20;

  const downPaymentAmount = Math.round(dynamicFinalPrice * (downPaymentPercent / 100));
  const remainingInstallmentBalance = dynamicFinalPrice - downPaymentAmount;
  const installment3Amount = Math.round(remainingInstallmentBalance / 3);
  const installment6Amount = Math.round(remainingInstallmentBalance / 6);

  const toggleOptionalCoverage = (id: number) => {
    setSelectedOptionalIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const getFormTitle = () => {
    switch (insType) {
      case 'fire':
        return 'تکمیل اطلاعات صدور بیمه آتش‌سوزی و زلزله (کد ملی، آدرس و کد پستی ملک)';
      case 'travel':
        return 'تکمیل اطلاعات صدور بیمه مسافرتی (کد ملی، شماره پاسپورت و تاریخ سفر)';
      case 'life':
        return 'تکمیل اطلاعات صدور بیمه عمر و سرمایه‌گذاری (کد ملی، شغل، ذینفع و کد پستی)';
      case 'body':
        return 'تکمیل اطلاعات صدور بیمه بدنه خودرو (کد ملی، شماره پلاک و کد پستی)';
      case 'third_party':
      default:
        return 'تکمیل اطلاعات صدور بیمه شخص ثالث (کد ملی، شماره پلاک و کد پستی)';
    }
  };

  const getFormIcon = () => {
    switch (insType) {
      case 'fire':
        return <Home className="w-4 h-4 text-amber-400" />;
      case 'travel':
        return <Plane className="w-4 h-4 text-sky-400" />;
      case 'life':
        return <Heart className="w-4 h-4 text-rose-400" />;
      default:
        return <Car className="w-4 h-4 text-blue-400" />;
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedOptionalNames = (plan.coverages || [])
      .filter((c) => selectedOptionalIds.includes(c.id))
      .map((c) => c.name);

    const baseNames = (plan.coverages || [])
      .filter((c) => c.coverage_type === 'BASE')
      .map((c) => c.name);

    const allSelectedCoverageNames = [...baseNames, ...selectedOptionalNames];

    const updatedCollectedData = {
      ...(recommendation.collected_data || {}),
      full_name: recommendation.collected_data?.full_name || user?.full_name || 'کاربر بیمه',
      phone_number: recommendation.collected_data?.phone_number || user?.phone_number || '09121111111',
      national_code: nationalCode.trim() || recommendation.collected_data?.national_code || '0012345678',
      postal_code: postalCode.trim() || recommendation.collected_data?.postal_code || '1987654321',
      selected_coverages: allSelectedCoverageNames,
      payment_type: paymentMethod,
      down_payment_amount: paymentMethod !== 'cash' ? downPaymentAmount : dynamicFinalPrice,
      installment_count: paymentMethod === 'installment_3' ? 3 : (paymentMethod === 'installment_6' ? 6 : 0),
      installment_amount: paymentMethod === 'installment_3' ? installment3Amount : (paymentMethod === 'installment_6' ? installment6Amount : 0),
      ...(plateNumber.trim() ? { plate_number: plateNumber.trim() } : {}),
      ...(chassisNumber.trim() ? { chassis_number: chassisNumber.trim() } : {}),
      ...(propertyAddress.trim() ? { property_address: propertyAddress.trim() } : {}),
      ...(propertyRegistryCode.trim() ? { property_registry_code: propertyRegistryCode.trim() } : {}),
      ...(passportNumber.trim() ? { passport_number: passportNumber.trim() } : {}),
      ...(travelStartDate.trim() ? { travel_start_date: travelStartDate.trim() } : {}),
      ...(destination.trim() ? { destination: destination.trim() } : {}),
      ...(insuredJob.trim() ? { insured_job: insuredJob.trim() } : {}),
      ...(beneficiaryName.trim() ? { beneficiary_name: beneficiaryName.trim() } : {}),
      ...(insuredAge.trim() ? { insured_age: insuredAge.trim() } : {}),
    };

    const updatedRecommendation: Recommendation = {
      ...recommendation,
      calculated_price: dynamicFinalPrice,
      original_price: dynamicOriginalPrice,
      collected_data: updatedCollectedData,
    };

    onConfirm(updatedRecommendation);
  };

  const baseCoverages = (plan.coverages || []).filter((c) => c.coverage_type === 'BASE');
  const optionalCoverages = (plan.coverages || []).filter((c) => c.coverage_type === 'OPTIONAL');

  return (
    <div className="my-4 p-5 rounded-2xl bg-gradient-to-b from-[#1e293b] to-[#171f33] border border-blue-500/40 shadow-xl text-right overflow-hidden relative font-vazir">
      {/* Top Badge */}
      <div className="flex items-center justify-between mb-3 border-b border-slate-700/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white">{plan.company?.name || 'بیمه‌گر رسمی'}</h4>
            <span className="text-[11px] text-slate-400">رتبه رضایت: {plan.company?.rating || 4.8} از 5</span>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          پیشنهاد برتر
        </span>
      </div>

      {/* Plan Title & Reason */}
      <h3 className="text-base font-bold text-white mb-2">{plan.title}</h3>
      <p className="text-xs text-slate-300 mb-4 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 leading-relaxed">
        {recommendation_reason}
      </p>

      {/* Coverages Section with Interactive Optional Toggles */}
      <div className="mb-4 space-y-3">
        {/* Base Coverages */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 block mb-1.5">پوشش‌های پایه و قانونی (شامل طرح):</span>
          <div className="space-y-1.5">
            {baseCoverages.length > 0 ? (
              baseCoverages.map((cov, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs text-slate-200 bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{cov.name}</span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                    پایه
                  </span>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-200 bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>پوشش حوادث جانی، مالی و خسارت‌های استاندارد طبق مقررات</span>
              </div>
            )}
          </div>
        </div>

        {/* Optional Coverages (Interactive Selection) */}
        {optionalCoverages.length > 0 && (
          <div className="pt-2 border-t border-slate-800/80">
            <span className="text-[11px] font-bold text-amber-400 block mb-1.5 flex items-center gap-1">
              <PlusCircle className="w-3.5 h-3.5" />
              پوشش‌های تکمیلی و اختیاری (قابل انتخاب):
            </span>
            <div className="space-y-1.5">
              {optionalCoverages.map((cov) => {
                const isSelected = selectedOptionalIds.includes(cov.id);
                return (
                  <div
                    key={cov.id}
                    onClick={() => toggleOptionalCoverage(cov.id)}
                    className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg border cursor-pointer transition-all select-none ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-sm'
                        : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                      <div>
                        <span className="font-medium">{cov.name}</span>
                        {cov.description && (
                          <span className="text-[10px] text-slate-400 block">{cov.description}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-amber-300">
                      +{formatPersianPrice(cov.additional_price)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Pricing Box */}
      <div className="bg-[#0c1322] p-3.5 rounded-xl border border-slate-700/80 mb-4 flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-400 block">مبلغ کل حق بیمه:</span>
          {Number(discount_amount) > 0 && (
            <span className="text-xs text-slate-500 line-through block">
              {formatPersianPrice(dynamicOriginalPrice)}
            </span>
          )}
        </div>
        <div className="text-left">
          <span className="text-lg font-extrabold text-emerald-400">
            {formatPersianPrice(dynamicFinalPrice)}
          </span>
          {optionalAddonTotal > 0 && (
            <span className="text-[10px] text-amber-400/90 block">
              (شامل {formatPersianPrice(optionalAddonTotal)} پوشش‌های اختیاری)
            </span>
          )}
        </div>
      </div>

      {/* Payment Method Selection (Cash vs 3-Month Installment vs 6-Month Installment) */}
      <div className="mb-5 bg-[#0f172a] p-3 rounded-xl border border-slate-700/70">
        <span className="text-xs font-bold text-slate-200 block mb-2">
          روش پرداخت:
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Option 1: Cash Payment */}
          <div
            onClick={() => setPaymentMethod('cash')}
            className={`p-2.5 rounded-xl border cursor-pointer transition-all select-none text-right flex flex-col justify-between ${
              paymentMethod === 'cash'
                ? 'bg-blue-600/20 border-blue-500 shadow-md text-white'
                : 'bg-[#191f2f]/60 border-slate-800 text-slate-400 hover:bg-[#191f2f]'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-white">
                پرداخت نقدی
              </span>
              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                paymentMethod === 'cash' ? 'border-blue-400 bg-blue-500 text-white' : 'border-slate-600'
              }`}>
                {paymentMethod === 'cash' && <Check className="w-2 h-2" />}
              </div>
            </div>
            <div className="text-[11px] font-bold text-emerald-400">
              {formatPersianPrice(dynamicFinalPrice)}
            </div>
          </div>

          {/* Option 2: 3-Month Installment */}
          {allow3Months && (
            <div
              onClick={() => setPaymentMethod('installment_3')}
              className={`p-2.5 rounded-xl border cursor-pointer transition-all select-none text-right flex flex-col justify-between ${
                paymentMethod === 'installment_3'
                  ? 'bg-blue-600/20 border-blue-500 shadow-md text-white'
                  : 'bg-[#191f2f]/60 border-slate-800 text-slate-400 hover:bg-[#191f2f]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-white">
                  اقساط ۳ ماهه
                </span>
                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                  paymentMethod === 'installment_3' ? 'border-blue-400 bg-blue-500 text-white' : 'border-slate-600'
                }`}>
                  {paymentMethod === 'installment_3' && <Check className="w-2 h-2" />}
                </div>
              </div>
              <div className="text-[10px] text-slate-300">
                پیش‌پرداخت: <span className="font-bold text-blue-400">{formatPersianPrice(downPaymentAmount)}</span>
              </div>
              <div className="text-[10px] text-slate-400">
                ۳ قسط: {formatPersianPrice(installment3Amount)}
              </div>
            </div>
          )}

          {/* Option 3: 6-Month Installment */}
          {allow6Months && (
            <div
              onClick={() => setPaymentMethod('installment_6')}
              className={`p-2.5 rounded-xl border cursor-pointer transition-all select-none text-right flex flex-col justify-between ${
                paymentMethod === 'installment_6'
                  ? 'bg-blue-600/20 border-blue-500 shadow-md text-white'
                  : 'bg-[#191f2f]/60 border-slate-800 text-slate-400 hover:bg-[#191f2f]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-white">
                  اقساط ۶ ماهه
                </span>
                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                  paymentMethod === 'installment_6' ? 'border-blue-400 bg-blue-500 text-white' : 'border-slate-600'
                }`}>
                  {paymentMethod === 'installment_6' && <Check className="w-2 h-2" />}
                </div>
              </div>
              <div className="text-[10px] text-slate-300">
                پیش‌پرداخت: <span className="font-bold text-blue-400">{formatPersianPrice(downPaymentAmount)}</span>
              </div>
              <div className="text-[10px] text-slate-400">
                ۶ قسط: {formatPersianPrice(installment6Amount)}
              </div>
            </div>
          )}
        </div>

        {/* Selected Plan Payment Summary Line */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            {paymentMethod === 'cash' ? 'مبلغ پرداختی:' : 'پیش‌پرداخت هم‌اکنون:'}
          </span>
          <span className="font-extrabold text-sm text-emerald-400">
            {paymentMethod === 'cash' ? formatPersianPrice(dynamicFinalPrice) : formatPersianPrice(downPaymentAmount)}
          </span>
        </div>
      </div>

      {/* Confirmation Step 1: Click button to show personal info form */}
      {!showPersonalForm ? (
        <>
          <div className="text-xs font-medium text-slate-300 mb-3">آیا این بیمه را تایید می‌کنید؟</div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowPersonalForm(true)}
              className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              تایید و تکمیل اطلاعات
            </button>
            <button
              onClick={onCancel}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold border border-slate-700 transition-all text-center"
            >
              انصراف
            </button>
          </div>
        </>
      ) : (
        /* Dynamic Personal Details Form Section Tailored to Insurance Type */
        <div className="bg-[#0f172a] border border-blue-500/40 p-4 rounded-xl text-xs space-y-3 relative animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-white flex items-center gap-1.5 text-xs">
              {getFormIcon()}
              {getFormTitle()}
            </span>
            <button
              onClick={() => setShowPersonalForm(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="بستن"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmitForm} className="space-y-3">
            {/* Auto Prefilled User Registered Info Banner */}
            <div className="bg-[#191f2f] border border-slate-700/60 p-2.5 rounded-lg flex items-center justify-between text-slate-300">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>مشخصات ثبت‌شده شما در سیستم:</span>
              </div>
              <span className="font-semibold text-white">
                {user?.full_name || 'بیمه‌گذار'} ({user?.phone_number || 'شماره ثبت‌شده'})
              </span>
            </div>

            {/* Form Fields tailored per insurance type */}

            {/* 1. Third Party & Body Insurance Fields */}
            {(insType === 'third_party' || insType === 'body') && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">کد ملی ۱۰ رقمی بیمه‌گذار:*</label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={nationalCode}
                      onChange={(e) => setNationalCode(e.target.value)}
                      placeholder="مثال: 0012345678"
                      className="w-full bg-[#191f2f] border border-blue-500/60 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-vazir"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">شماره پلاک انتظامی خودرو:*</label>
                    <input
                      type="text"
                      required
                      value={plateNumber}
                      onChange={(e) => setPlateNumber(e.target.value)}
                      placeholder="مثال: ۲۲ ب ۵۶۷ ایران ۸۸"
                      className="w-full bg-[#191f2f] border border-blue-500/60 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-vazir"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">کد پستی ۱۰ رقمی محل سکونت:*</label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="مثال: 1987654321"
                      className="w-full bg-[#191f2f] border border-blue-500/60 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-vazir"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">شماره شاسی یا موتور خودرو (اختیاری):</label>
                    <input
                      type="text"
                      value={chassisNumber}
                      onChange={(e) => setChassisNumber(e.target.value)}
                      placeholder="مثال: NAAB11..."
                      className="w-full bg-[#191f2f] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-vazir"
                    />
                  </div>
                </div>
              </>
            )}

            {/* 2. Fire & Earthquake Insurance Fields */}
            {insType === 'fire' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">کد ملی ۱۰ رقمی مالک یا مستاجر:*</label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={nationalCode}
                      onChange={(e) => setNationalCode(e.target.value)}
                      placeholder="مثال: 0012345678"
                      className="w-full bg-[#191f2f] border border-blue-500/60 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-vazir"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">کد پستی ۱۰ رقمی ملک مورد بیمه:*</label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="مثال: 1987654321"
                      className="w-full bg-[#191f2f] border border-blue-500/60 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-vazir"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">آدرس کامل ملک، پلاک و شماره واحد:*</label>
                  <input
                    type="text"
                    required
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                    placeholder="مثال: تهران، خیابان ولیعصر، کوچه نصر، پلاک ۱۲، واحد ۴"
                    className="w-full bg-[#191f2f] border border-blue-500/60 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-vazir"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">شماره پلاک ثبتی یا سند ملک (اختیاری):</label>
                  <input
                    type="text"
                    value={propertyRegistryCode}
                    onChange={(e) => setPropertyRegistryCode(e.target.value)}
                    placeholder="مثال: پلاک ثبتی ۱۲۳۴ فرعی از ۵۶ اصلی"
                    className="w-full bg-[#191f2f] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-vazir"
                  />
                </div>
              </>
            )}

            {/* 3. Travel Insurance Fields */}
            {insType === 'travel' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">کد ملی ۱۰ رقمی مسافر:*</label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={nationalCode}
                      onChange={(e) => setNationalCode(e.target.value)}
                      placeholder="مثال: 0012345678"
                      className="w-full bg-[#191f2f] border border-blue-500/60 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-vazir"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">شماره گذرنامه / پاسپورت:*</label>
                    <input
                      type="text"
                      required
                      value={passportNumber}
                      onChange={(e) => setPassportNumber(e.target.value)}
                      placeholder="مثال: A12345678"
                      className="w-full bg-[#191f2f] border border-blue-500/60 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-vazir"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">کشور یا حوزه مقصد سفر:*</label>
                    <input
                      type="text"
                      required
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="مثال: کشورهای حوزه شینگن / ترکیه / دبی"
                      className="w-full bg-[#191f2f] border border-blue-500/60 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-vazir"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">تاریخ تقریبی شروع سفر:*</label>
                    <input
                      type="text"
                      required
                      value={travelStartDate}
                      onChange={(e) => setTravelStartDate(e.target.value)}
                      placeholder="مثال: ۱۴۰۳/۰۶/۱۵"
                      className="w-full bg-[#191f2f] border border-blue-500/60 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-vazir"
                    />
                  </div>
                </div>
              </>
            )}

            {/* 4. Life & Investment Insurance Fields */}
            {insType === 'life' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">کد ملی ۱۰ رقمی بیمه‌شده:*</label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={nationalCode}
                      onChange={(e) => setNationalCode(e.target.value)}
                      placeholder="مثال: 0012345678"
                      className="w-full bg-[#191f2f] border border-blue-500/60 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-vazir"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">سن دقیق متقاضی (سال):*</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={80}
                      value={insuredAge}
                      onChange={(e) => setInsuredAge(e.target.value)}
                      placeholder="مثال: 32"
                      className="w-full bg-[#191f2f] border border-blue-500/60 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-vazir"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">شغل و حرفه متقاضی:*</label>
                    <input
                      type="text"
                      required
                      value={insuredJob}
                      onChange={(e) => setInsuredJob(e.target.value)}
                      placeholder="مثال: کارمند، مهندس، پزشک، شغل آزاد"
                      className="w-full bg-[#191f2f] border border-blue-500/60 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-vazir"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">نام و نسبت ذینفع / استفاده‌کننده:*</label>
                    <input
                      type="text"
                      required
                      value={beneficiaryName}
                      onChange={(e) => setBeneficiaryName(e.target.value)}
                      placeholder="مثال: وراث قانونی / همسر و فرزندان"
                      className="w-full bg-[#191f2f] border border-blue-500/60 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-vazir"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">کد پستی ۱۰ رقمی محل سکونت:*</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="مثال: 1987654321"
                    className="w-full bg-[#191f2f] border border-blue-500/60 rounded-lg px-2.5 py-1.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-vazir"
                  />
                </div>
              </>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPersonalForm(false)}
                className="py-2 px-3 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
              >
                بازگشت
              </button>
              <button
                type="submit"
                className="py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all"
              >
                <CreditCard className="w-4 h-4" />
                ثبت مشخصات و صدور پیش‌نمایش
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
