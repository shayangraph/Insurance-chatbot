import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  X,
  Layers,
  Sparkles,
  AlertCircle,
  CreditCard
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import type { InsurancePlan, InsuranceCoverage, InsuranceCompany } from '../../types';

export const AdminProductsPage: React.FC = () => {
  const [plans, setPlans] = useState<InsurancePlan[]>([]);
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Product Modal State (Create / Edit)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);


  // Coverage Management Modal State
  const [activePlanForCoverages, setActivePlanForCoverages] = useState<InsurancePlan | null>(null);
  const [coverages, setCoverages] = useState<InsuranceCoverage[]>([]);
  const [isLoadingCoverages, setIsLoadingCoverages] = useState(false);
  const [isCoverageModalOpen, setIsCoverageModalOpen] = useState(false);
  const [editingCoverage, setEditingCoverage] = useState<Partial<InsuranceCoverage> | null>(null);
  const [isSavingCoverage, setIsSavingCoverage] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [plansData, compsData] = await Promise.all([
        adminService.getProducts(selectedType || undefined),
        adminService.getCompanies(),
      ]);
      setPlans(plansData);
      setCompanies(compsData);
    } catch (err: any) {
      setError('خطا در دریافت محصولات بیمه از سرور.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedType]);

  const handleOpenCreateProduct = () => {
    setEditingPlan({
      title: '',
      insurance_type: 'third_party',
      company: companies[0]?.id || 1,
      description: '',
      base_price: 6000000,
      coverage_amount: 100000000,
      max_discount_percent: 70,
      is_active: true,
      is_installment_enabled: true,
      allow_3_months: true,
      allow_6_months: true,
      down_payment_percent: 20,
      coverage_details: [],
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (plan: InsurancePlan) => {
    const compId = typeof plan.company === 'object' ? (plan.company as any).id : plan.company;
    setEditingPlan({
      ...plan,
      company: compId,
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    if (!editingPlan.title || !editingPlan.base_price) {
      alert('لطفاً عنوان طرح و قیمت پایه را وارد کنید.');
      return;
    }

    setIsSavingProduct(true);
    try {
      if (editingPlan.id) {
        await adminService.updateProduct(editingPlan.id, editingPlan);
      } else {
        await adminService.createProduct(editingPlan);
      }
      setIsProductModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert('خطا در ذخیره اطلاعات محصول بیمه');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (planId: number) => {
    if (!window.confirm('آیا از حذف یا غیرفعال‌سازی این محصول بیمه اطمینان دارید؟')) return;
    try {
      const res = await adminService.deleteProduct(planId);
      alert(res.message);
      fetchData();
    } catch {
      alert('خطا در حذف محصول بیمه');
    }
  };

  const handleOpenManageCoverages = async (plan: InsurancePlan) => {
    setActivePlanForCoverages(plan);
    setIsLoadingCoverages(true);
    try {
      const covs = await adminService.getCoverages(plan.id);
      setCoverages(covs);
    } catch {
      alert('خطا در دریافت پوشش‌های این طرح');
    } finally {
      setIsLoadingCoverages(false);
    }
  };

  const handleOpenCreateCoverage = () => {
    if (!activePlanForCoverages) return;
    setEditingCoverage({
      plan: activePlanForCoverages.id,
      name: '',
      description: '',
      coverage_type: 'OPTIONAL',
      additional_price: 300000,
      is_active: true,
    });
    setIsCoverageModalOpen(true);
  };

  const handleOpenEditCoverage = (cov: InsuranceCoverage) => {
    setEditingCoverage(cov);
    setIsCoverageModalOpen(true);
  };

  const handleSaveCoverage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoverage || !activePlanForCoverages) return;
    if (!editingCoverage.name) {
      alert('نام پوشش الزامی است.');
      return;
    }

    setIsSavingCoverage(true);
    try {
      if (editingCoverage.id) {
        await adminService.updateCoverage(editingCoverage.id, editingCoverage);
      } else {
        await adminService.createCoverage({ ...editingCoverage, plan: activePlanForCoverages.id });
      }
      setIsCoverageModalOpen(false);
      const updatedCovs = await adminService.getCoverages(activePlanForCoverages.id);
      setCoverages(updatedCovs);
      fetchData();
    } catch {
      alert('خطا در ذخیره اطلاعات پوشش');
    } finally {
      setIsSavingCoverage(false);
    }
  };

  const handleDeleteCoverage = async (covId: number) => {
    if (!window.confirm('آیا از حذف این پوشش اطمینان دارید؟')) return;
    try {
      await adminService.deleteCoverage(covId);
      if (activePlanForCoverages) {
        const updatedCovs = await adminService.getCoverages(activePlanForCoverages.id);
        setCoverages(updatedCovs);
        fetchData();
      }
    } catch {
      alert('خطا در حذف پوشش');
    }
  };

  const formatPrice = (num: number) => {
    return Number(num || 0).toLocaleString('en-US') + ' تومان';
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-indigo-400" />
            مدیریت محصولات و پوشش‌های بیمه
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            تنظیم قیمت پایه، شرایط تخفیف، شرکت‌های ارائه‌دهنده و مدیریت پوشش‌های پایه و اختیاری
          </p>
        </div>

        <button
          onClick={handleOpenCreateProduct}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>افزودن محصول جدید</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#232a3a] pb-3">
        <button
          onClick={() => setSelectedType('')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            selectedType === ''
              ? 'bg-blue-600 text-white font-bold'
              : 'bg-[#191f2f] text-slate-300 hover:text-white border border-[#2e3545]'
          }`}
        >
          همه محصولات
        </button>
        <button
          onClick={() => setSelectedType('third_party')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            selectedType === 'third_party'
              ? 'bg-blue-600 text-white font-bold'
              : 'bg-[#191f2f] text-slate-300 hover:text-white border border-[#2e3545]'
          }`}
        >
          شخص ثالث خودرو
        </button>
        <button
          onClick={() => setSelectedType('body')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            selectedType === 'body'
              ? 'bg-blue-600 text-white font-bold'
              : 'bg-[#191f2f] text-slate-300 hover:text-white border border-[#2e3545]'
          }`}
        >
          بدنه خودرو
        </button>
        <button
          onClick={() => setSelectedType('health')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            selectedType === 'health'
              ? 'bg-blue-600 text-white font-bold'
              : 'bg-[#191f2f] text-slate-300 hover:text-white border border-[#2e3545]'
          }`}
        >
          درمان تکمیلی
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-[#191f2f] border border-[#2e3545] rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-[#2e3545] bg-[#141926] text-slate-400">
                <th className="py-3.5 pr-4 font-medium">عنوان طرح بیمه</th>
                <th className="py-3.5 px-3 font-medium">شرکت بیمه‌گر</th>
                <th className="py-3.5 px-3 font-medium">نوع بیمه</th>
                <th className="py-3.5 px-3 font-medium">قیمت پایه</th>
                <th className="py-3.5 px-3 font-medium">شرایط اقساط</th>
                <th className="py-3.5 px-3 font-medium">پوشش‌های ثبت‌شده</th>
                <th className="py-3.5 px-3 font-medium">وضعیت</th>
                <th className="py-3.5 pl-4 text-center font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232a3a]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                    در حال بارگذاری محصولات بیمه...
                  </td>
                </tr>
              ) : plans.length > 0 ? (
                plans.map((p) => (
                  <tr key={p.id} className="hover:bg-[#0c1322]/50 transition-colors">
                    <td className="py-3.5 pr-4 font-bold text-white">{p.title}</td>
                    <td className="py-3.5 px-3 text-slate-200">
                      {typeof p.company === 'object' ? (p.company as any).name : p.company_name || 'بیمه ایران'}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-bold">
                        {p.insurance_type_display || p.insurance_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-bold text-emerald-400">{formatPrice(p.base_price)}</td>
                    <td className="py-3.5 px-3">
                      {p.is_installment_enabled ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                          {p.allow_3_months && p.allow_6_months ? '۳ و ۶ ماهه' : (p.allow_3_months ? '۳ ماهه' : (p.allow_6_months ? '۶ ماهه' : 'اقساطی'))} ({p.down_payment_percent ?? 20}٪)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px]">
                          فقط نقدی
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      <button
                        onClick={() => handleOpenManageCoverages(p)}
                        className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium hover:underline text-[11px]"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        {p.coverages?.length || 0} پوشش ثبت‌شده
                      </button>
                    </td>
                    <td className="py-3.5 px-3">
                      {p.is_active ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-bold">
                          <CheckCircle className="w-3.5 h-3.5" />
                          فعال
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-400 text-[10px] font-bold">
                          <XCircle className="w-3.5 h-3.5" />
                          غیرفعال
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 pl-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenManageCoverages(p)}
                          title="مدیریت پوشش‌های طرح"
                          className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white transition-colors"
                        >
                          <Layers className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditProduct(p)}
                          title="ویرایش طرح"
                          className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          title="حذف یا غیرفعال‌سازی"
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    هیچ محصول بیمه‌ای یافت نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Create / Edit Modal */}
      {isProductModalOpen && editingPlan && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsProductModalOpen(false)}
        >
          <div
            className="bg-[#191f2f] border border-[#2e3545] w-full max-w-xl rounded-3xl p-6 shadow-2xl relative text-right"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="flex items-center justify-between pb-4 border-b border-[#2e3545] mb-5">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-400" />
                {editingPlan.id ? 'ویرایش مشخصات محصول بیمه' : 'افزودن محصول بیمه جدید'}
              </h2>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#232a3a]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">عنوان طرح بیمه</label>
                  <input
                    type="text"
                    required
                    placeholder="مثلاً طرح استاندارد ۰۲"
                    value={editingPlan.title || ''}
                    onChange={(e) => setEditingPlan({ ...editingPlan, title: e.target.value })}
                    className="w-full bg-[#0c1322] border border-[#2e3545] rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">شرکت بیمه‌گر</label>
                  <select
                    value={typeof editingPlan.company === 'object' ? (editingPlan.company as any).id : editingPlan.company}
                    onChange={(e) => setEditingPlan({ ...editingPlan, company: Number(e.target.value) })}
                    className="w-full bg-[#0c1322] border border-[#2e3545] rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-blue-500"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">نوع بیمه‌نامه</label>
                  <select
                    value={editingPlan.insurance_type || 'third_party'}
                    onChange={(e) => setEditingPlan({ ...editingPlan, insurance_type: e.target.value as any })}
                    className="w-full bg-[#0c1322] border border-[#2e3545] rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="third_party">شخص ثالث خودرو</option>
                    <option value="body">بدنه خودرو</option>
                    <option value="health">درمان تکمیلی</option>
                    <option value="travel">مسافرتی خارج از کشور</option>
                    <option value="life">عمر و سرمایه‌گذاری</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">قیمت پایه (تومان)</label>
                  <input
                    type="number"
                    required
                    step={100000}
                    value={editingPlan.base_price || 0}
                    onChange={(e) => setEditingPlan({ ...editingPlan, base_price: Number(e.target.value) })}
                    className="w-full bg-[#0c1322] border border-[#2e3545] rounded-xl py-2.5 px-3 text-emerald-400 font-bold focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">سقف تعهد مالی (تومان)</label>
                  <input
                    type="number"
                    step={10000000}
                    value={editingPlan.coverage_amount || 0}
                    onChange={(e) => setEditingPlan({ ...editingPlan, coverage_amount: Number(e.target.value) })}
                    className="w-full bg-[#0c1322] border border-[#2e3545] rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">حداکثر تخفیف عدم خسارت (٪)</label>
                  <input
                    type="number"
                    min={0}
                    max={90}
                    value={editingPlan.max_discount_percent || 70}
                    onChange={(e) => setEditingPlan({ ...editingPlan, max_discount_percent: Number(e.target.value) })}
                    className="w-full bg-[#0c1322] border border-[#2e3545] rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Installment Settings Section */}
              <div className="p-3.5 rounded-2xl bg-[#0c1322] border border-[#2e3545] space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-[#1f2638]">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-400" />
                    <span className="font-bold text-white text-xs">تنظیمات پرداخت اقساطی محصول</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_installment_enabled"
                      checked={editingPlan.is_installment_enabled ?? true}
                      onChange={(e) => setEditingPlan({ ...editingPlan, is_installment_enabled: e.target.checked })}
                      className="w-4 h-4 rounded bg-[#191f2f] border-[#2e3545] text-blue-600 focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="is_installment_enabled" className="text-xs text-blue-300 font-semibold cursor-pointer">
                      امکان پرداخت اقساطی
                    </label>
                  </div>
                </div>

                {editingPlan.is_installment_enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="allow_3_months"
                        checked={editingPlan.allow_3_months ?? true}
                        onChange={(e) => setEditingPlan({ ...editingPlan, allow_3_months: e.target.checked })}
                        className="w-4 h-4 rounded bg-[#191f2f] border-[#2e3545] text-blue-600 focus:ring-0 cursor-pointer"
                      />
                      <label htmlFor="allow_3_months" className="text-slate-300 text-xs font-medium cursor-pointer">
                        اقساط ۳ ماهه
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="allow_6_months"
                        checked={editingPlan.allow_6_months ?? true}
                        onChange={(e) => setEditingPlan({ ...editingPlan, allow_6_months: e.target.checked })}
                        className="w-4 h-4 rounded bg-[#191f2f] border-[#2e3545] text-blue-600 focus:ring-0 cursor-pointer"
                      />
                      <label htmlFor="allow_6_months" className="text-slate-300 text-xs font-medium cursor-pointer">
                        اقساط ۶ ماهه
                      </label>
                    </div>

                    <div>
                      <label className="block text-slate-300 text-[11px] font-semibold mb-1">درصد پیش‌پرداخت (٪)</label>
                      <input
                        type="number"
                        min={5}
                        max={90}
                        value={editingPlan.down_payment_percent ?? 20}
                        onChange={(e) => setEditingPlan({ ...editingPlan, down_payment_percent: Number(e.target.value) })}
                        className="w-full bg-[#191f2f] border border-[#2e3545] rounded-xl py-1.5 px-3 text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">توضیحات و مشخصات طرح</label>
                <textarea
                  rows={3}
                  value={editingPlan.description || ''}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  placeholder="شامل پوشش‌های مالی و جانی استاندارد بیمه مرکزی..."
                  className="w-full bg-[#0c1322] border border-[#2e3545] rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={editingPlan.is_active ?? true}
                  onChange={(e) => setEditingPlan({ ...editingPlan, is_active: e.target.checked })}
                  className="w-4 h-4 rounded bg-[#0c1322] border-[#2e3545] text-blue-600 focus:ring-0"
                />
                <label htmlFor="is_active" className="text-slate-300 font-medium cursor-pointer">
                  این محصول بیمه در سیستم فعال و آماده پیشنهاد به کاربران باشد
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#2e3545]">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#0c1322] text-slate-400 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/25 flex items-center gap-2"
                >
                  {isSavingProduct ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ذخیره محصول'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Coverages Modal */}
      {activePlanForCoverages && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActivePlanForCoverages(null)}
        >
          <div
            className="bg-[#191f2f] border border-[#2e3545] w-full max-w-3xl rounded-3xl p-6 shadow-2xl relative text-right max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="flex items-center justify-between pb-4 border-b border-[#2e3545] mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-400" />
                  مدیریت پوشش‌های طرح: {activePlanForCoverages.title}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  پوشش‌های اصلی (پایه) و اختیاری (با مبلغ اضافه) این محصول را مدیریت کنید
                </p>
              </div>
              <button
                onClick={() => setActivePlanForCoverages(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#232a3a]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-slate-300 font-bold">لیست پوشش‌های متصل ({coverages.length})</span>
              <button
                onClick={handleOpenCreateCoverage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن پوشش جدید</span>
              </button>
            </div>

            {isLoadingCoverages ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-400 mb-2" />
                در حال دریافت پوشش‌ها...
              </div>
            ) : coverages.length > 0 ? (
              <div className="space-y-2.5">
                {coverages.map((cov) => (
                  <div
                    key={cov.id}
                    className="bg-[#0c1322] border border-[#2e3545] p-3.5 rounded-2xl flex items-center justify-between text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{cov.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            cov.coverage_type === 'BASE'
                              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                              : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                          }`}
                        >
                          {cov.coverage_type_display || (cov.coverage_type === 'BASE' ? 'پوشش پایه' : 'پوشش اختیاری')}
                        </span>
                        {!cov.is_active && (
                          <span className="text-[10px] text-red-400 font-bold">(غیرفعال)</span>
                        )}
                      </div>
                      {cov.description && <p className="text-[11px] text-slate-400">{cov.description}</p>}
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-left font-mono">
                        {cov.coverage_type === 'OPTIONAL' ? (
                          <span className="text-emerald-400 font-bold">+{formatPrice(cov.additional_price)}</span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">شامل در قیمت پایه</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditCoverage(cov)}
                          title="ویرایش پوشش"
                          className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCoverage(cov.id)}
                          title="حذف پوشش"
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs bg-[#0c1322] rounded-2xl">
                هیچ پوششی برای این طرح ثبت نشده است. روی «افزودن پوشش جدید» کلیک کنید.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Coverage Create / Edit Sub-Modal */}
      {isCoverageModalOpen && editingCoverage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#191f2f] border border-[#2e3545] w-full max-w-md rounded-3xl p-6 shadow-2xl relative text-right">
            <div className="flex items-center justify-between pb-3 border-b border-[#2e3545] mb-4">
              <h3 className="text-sm font-bold text-white">
                {editingCoverage.id ? 'ویرایش پوشش بیمه' : 'افزودن پوشش جدید'}
              </h3>
              <button
                onClick={() => setIsCoverageModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCoverage} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">نام پوشش</label>
                <input
                  type="text"
                  required
                  placeholder="مثلاً بلایای طبیعی یا شکست شیشه"
                  value={editingCoverage.name || ''}
                  onChange={(e) => setEditingCoverage({ ...editingCoverage, name: e.target.value })}
                  className="w-full bg-[#0c1322] border border-[#2e3545] rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">نوع پوشش</label>
                <select
                  value={editingCoverage.coverage_type || 'OPTIONAL'}
                  onChange={(e) => setEditingCoverage({ ...editingCoverage, coverage_type: e.target.value as any })}
                  className="w-full bg-[#0c1322] border border-[#2e3545] rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="BASE">پوشش اصلی / پایه (بدون اضافه بها)</option>
                  <option value="OPTIONAL">پوشش اختیاری / تکمیلی (با مبلغ اضافه)</option>
                </select>
              </div>

              {editingCoverage.coverage_type === 'OPTIONAL' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">مبلغ اضافه پوشش (تومان)</label>
                  <input
                    type="number"
                    step={50000}
                    value={editingCoverage.additional_price || 0}
                    onChange={(e) => setEditingCoverage({ ...editingCoverage, additional_price: Number(e.target.value) })}
                    className="w-full bg-[#0c1322] border border-[#2e3545] rounded-xl py-2.5 px-3 text-emerald-400 font-bold focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">توضیحات پوشش</label>
                <textarea
                  rows={2}
                  value={editingCoverage.description || ''}
                  onChange={(e) => setEditingCoverage({ ...editingCoverage, description: e.target.value })}
                  placeholder="جبران خسارات ناشی از..."
                  className="w-full bg-[#0c1322] border border-[#2e3545] rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="cov_is_active"
                  checked={editingCoverage.is_active ?? true}
                  onChange={(e) => setEditingCoverage({ ...editingCoverage, is_active: e.target.checked })}
                  className="w-4 h-4 rounded bg-[#0c1322] border-[#2e3545] text-indigo-600 focus:ring-0"
                />
                <label htmlFor="cov_is_active" className="text-slate-300 font-medium cursor-pointer">
                  پوشش فعال باشد
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2e3545]">
                <button
                  type="button"
                  onClick={() => setIsCoverageModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0c1322] text-slate-400 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSavingCoverage}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/25 flex items-center gap-1.5"
                >
                  {isSavingCoverage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'ذخیره پوشش'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
