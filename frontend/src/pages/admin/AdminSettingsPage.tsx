import React, { useEffect, useState } from 'react';
import {
  Settings,
  Database,
  Cpu,
  CheckCircle,
  Building2,
  Network
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import type { InsuranceCompany } from '../../types';

export const AdminSettingsPage: React.FC = () => {
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const comps = await adminService.getCompanies();
        setCompanies(comps);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);


  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-400" />
          وضعیت و تنظیمات سامانه
        </h1>
        <p className="text-xs text-slate-400 mt-1">مشاهده وضعیت اتصال پایگاه‌های داده، هوش مصنوعی و شرکت‌های همکار</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Knowledge & AI Status */}
        <div className="bg-[#191f2f] border border-[#2e3545] rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-[#2e3545]">
            <Cpu className="w-4 h-4 text-purple-400" />
            سرویس هوش مصنوعی و پایگاه دانش گرافی
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0c1322] border border-[#2e3545]">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-blue-400" />
                <span className="text-slate-300">گراف دیتابیس (Neo4j & Graphiti)</span>
              </div>
              <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                <CheckCircle className="w-3.5 h-3.5" />
                متصل (۳ اپیزود کامل)
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0c1322] border border-[#2e3545]">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <span className="text-slate-300">موتور تحلیل زبان (LLM Engine)</span>
              </div>
              <span className="text-slate-200 font-mono text-[11px]">Gemini 3.5 Flash-Lite</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0c1322] border border-[#2e3545]">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-teal-400" />
                <span className="text-slate-300">پایگاه داده رابطه‌ای (RDBMS)</span>
              </div>
              <span className="text-slate-200 font-mono text-[11px]">SQLite (Django ORM)</span>
            </div>
          </div>
        </div>

        {/* Insurance Companies Status */}
        <div className="bg-[#191f2f] border border-[#2e3545] rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-[#2e3545]">
            <Building2 className="w-4 h-4 text-blue-400" />
            شرکت‌های بیمه همکار در سیستم ({companies.length})
          </h2>

          <div className="space-y-2.5 text-xs">
            {companies.map((comp) => (
              <div
                key={comp.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[#0c1322] border border-[#2e3545]"
              >
                <div>
                  <span className="font-bold text-white ml-2">{comp.name}</span>
                  <span className="text-slate-400 text-[11px]">شناسه: {comp.code}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-amber-400 font-medium">★ {comp.rating}</span>
                  <span className="text-emerald-400 font-bold">{comp.complaint_satisfaction_rate}٪ رضایت</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
