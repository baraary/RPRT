import React from 'react';
import { PatientWorkspaceTab, Modality } from '../types';
import { Plus, X, Copy, UserCheck, FileEdit } from 'lucide-react';

interface PatientTabsBarProps {
  tabs: PatientWorkspaceTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onAddNewTab: () => void;
  onDuplicateActiveTab: () => void;
  onCloseTab: (tabId: string, e: React.MouseEvent) => void;
}

const MODALITY_BADGE: Record<
  Modality,
  {
    label: string;
    dotColor: string;
    activeTabCls: string;
    activeBadgeCls: string;
    plusBtnCls: string;
    copyIconCls: string;
  }
> = {
  sonography: {
    label: 'سونو',
    dotColor: 'bg-sky-400',
    activeTabCls: 'bg-sky-600 text-white border-sky-400 shadow-xs shadow-sky-600/20',
    activeBadgeCls: 'bg-sky-800/80 text-sky-100',
    plusBtnCls: 'bg-sky-500/25 hover:bg-sky-600 text-sky-300 hover:text-white border-sky-500/40',
    copyIconCls: 'text-sky-400',
  },
  mri: {
    label: 'ام‌آر‌آی',
    dotColor: 'bg-indigo-400',
    activeTabCls: 'bg-indigo-600 text-white border-indigo-400 shadow-xs shadow-indigo-600/20',
    activeBadgeCls: 'bg-indigo-800/80 text-indigo-100',
    plusBtnCls: 'bg-indigo-500/25 hover:bg-indigo-600 text-indigo-300 hover:text-white border-indigo-500/40',
    copyIconCls: 'text-indigo-400',
  },
  ct: {
    label: 'سی‌تی',
    dotColor: 'bg-emerald-400',
    activeTabCls: 'bg-emerald-600 text-white border-emerald-400 shadow-xs shadow-emerald-600/20',
    activeBadgeCls: 'bg-emerald-800/80 text-emerald-100',
    plusBtnCls: 'bg-emerald-500/25 hover:bg-emerald-600 text-emerald-300 hover:text-white border-emerald-500/40',
    copyIconCls: 'text-emerald-400',
  },
};

export const PatientTabsBar: React.FC<PatientTabsBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onAddNewTab,
  onDuplicateActiveTab,
  onCloseTab,
}) => {
  const activeTabObj = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const activeModBadge =
    MODALITY_BADGE[activeTabObj?.modality || 'sonography'] || MODALITY_BADGE.sonography;

  return (
    <div
      id="app-patient-tabs-bar"
      style={{ top: 'var(--navbar-height, 102px)' }}
      className="sticky z-30 w-full bg-slate-100/95 backdrop-blur-md py-1.5 no-print select-none transition-colors duration-200"
    >
      <div className="w-full max-w-[1680px] 2xl:max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10">
        <div className="w-full bg-slate-900 text-slate-200 border border-slate-800 rounded-xl px-3.5 py-1.5 flex items-center justify-between gap-2 shadow-2xs">
          {/* Scrollable Open Patient Tabs (Slim h-7) */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1">
            <span className="text-[11px] font-bold text-slate-400 ml-1 shrink-0 hidden sm:inline">
              پرونده‌های باز ({tabs.length}):
            </span>

            {tabs.map((tab, idx) => {
              const isActive = tab.id === activeTabId;
              const modInfo = MODALITY_BADGE[tab.modality] || MODALITY_BADGE.sonography;
              const displayName = tab.patientInfo.fullName.trim() || `بیمار نوبت ${idx + 1}`;

              return (
                <div
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  title={`کلید میانبر: Alt+${idx + 1} • پذیرش: ${tab.patientInfo.admissionNumber}`}
                  className={`group h-7 inline-flex items-center gap-1.5 px-2.5 rounded-lg text-[11px] font-bold transition-all duration-200 cursor-pointer shrink-0 border ${
                    isActive
                      ? modInfo.activeTabCls
                      : 'bg-slate-800/90 hover:bg-slate-800 text-slate-300 border-slate-700/80'
                  }`}
                >
                  {/* Modality Color Dot */}
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                      isActive ? 'bg-white' : modInfo.dotColor
                    }`}
                  />

                  {/* Patient Name (Modality title removed — color-coded instead) */}
                  <span className="max-w-[150px] truncate">{displayName}</span>

                  {tab.studies.length > 1 && (
                    <span
                      className={`text-[9.5px] px-1 py-0.2 rounded font-mono ${
                        isActive ? modInfo.activeBadgeCls : 'bg-slate-900/80 text-slate-400'
                      }`}
                      title={`تعداد بررسی‌ها: ${tab.studies.length}`}
                    >
                      {tab.studies.length}
                    </span>
                  )}

                  {/* Saved / Draft Indicator */}
                  {tab.status === 'saved' || tab.status === 'printed' ? (
                    <span title="ذخیره شده در آرشیو">
                      <UserCheck className={`w-3 h-3 ${isActive ? 'text-white' : 'text-emerald-400'}`} />
                    </span>
                  ) : (
                    <span title="در حال تایپ">
                      <FileEdit className={`w-2.5 h-2.5 opacity-60 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    </span>
                  )}

                  {/* Close Tab Button (Only if > 1 tab exists) */}
                  {tabs.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => onCloseTab(tab.id, e)}
                      title="بستن این تب بیمار"
                      className={`p-0.5 rounded transition-colors cursor-pointer ${
                        isActive
                          ? 'hover:bg-black/20 text-white/80 hover:text-white'
                          : 'hover:bg-rose-500/20 text-slate-400 hover:text-rose-300'
                      }`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Add New Patient Tab Button (Slim h-7 w-7, Matched to Active Modality Color) */}
            <button
              type="button"
              onClick={onAddNewTab}
              title="باز کردن تب بیمار جدید و انتخاب قالب‌های همین مدالیته (Alt+N)"
              className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all duration-200 cursor-pointer shrink-0 active:scale-95 ${activeModBadge.plusBtnCls}`}
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>

          {/* Duplicate Active Patient Tab (Slim h-7) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onDuplicateActiveTab}
              title="کپی کردن گزارش و مشخصات تب فعلی در یک تب جدید"
              className="h-7 inline-flex items-center justify-center gap-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-semibold transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Copy className={`w-3 h-3 transition-colors ${activeModBadge.copyIconCls}`} />
              <span className="hidden md:inline">کپی در تب جدید</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
