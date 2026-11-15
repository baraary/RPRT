import React, { useRef, useState } from 'react';
import { PatientWorkspaceTab, Modality } from '../types';
import {
  Plus,
  X,
  Copy,
  UserCheck,
  FileEdit,
  FolderOpen,
  ChevronRight,
  ChevronLeft,
  Pencil,
  Check,
  LayoutGrid,
  Search,
} from 'lucide-react';

interface PatientTabsBarProps {
  tabs: PatientWorkspaceTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onAddNewTab: () => void;
  onDuplicateActiveTab: () => void;
  onCloseTab: (tabId: string, e: React.MouseEvent) => void;
  onUpdateTabPatientName?: (tabId: string, newName: string) => void;
  onOpenReports?: () => void;
  onOpenCommandPalette?: () => void;
  reportsCount?: number;
}

const MODALITY_BADGE: Record<
  Modality,
  {
    label: string;
    dotColor: string;
    activeTabCls: string;
    activeBadgeCls: string;
    inactiveBadgeCls: string;
    plusBtnCls: string;
    copyIconCls: string;
  }
> = {
  sonography: {
    label: 'سونو',
    dotColor: 'bg-sky-400',
    activeTabCls: 'bg-sky-600 text-white border-sky-400 shadow-sm shadow-sky-600/25 -translate-y-[1px]',
    activeBadgeCls: 'bg-sky-800/85 text-sky-100',
    inactiveBadgeCls: 'bg-sky-950/90 text-sky-300 border border-sky-800/60',
    plusBtnCls: 'bg-sky-500/25 hover:bg-sky-600 text-sky-300 hover:text-white border-sky-500/40',
    copyIconCls: 'text-sky-400',
  },
  mri: {
    label: 'ام‌آر‌آی',
    dotColor: 'bg-indigo-400',
    activeTabCls: 'bg-indigo-600 text-white border-indigo-400 shadow-sm shadow-indigo-600/25 -translate-y-[1px]',
    activeBadgeCls: 'bg-indigo-800/85 text-indigo-100',
    inactiveBadgeCls: 'bg-indigo-950/90 text-indigo-300 border border-indigo-800/60',
    plusBtnCls: 'bg-indigo-500/25 hover:bg-indigo-600 text-indigo-300 hover:text-white border-indigo-500/40',
    copyIconCls: 'text-indigo-400',
  },
  ct: {
    label: 'سی‌تی',
    dotColor: 'bg-emerald-400',
    activeTabCls: 'bg-emerald-600 text-white border-emerald-400 shadow-sm shadow-emerald-600/25 -translate-y-[1px]',
    activeBadgeCls: 'bg-emerald-800/85 text-emerald-100',
    inactiveBadgeCls: 'bg-emerald-950/90 text-emerald-300 border border-emerald-800/60',
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
  onUpdateTabPatientName,
  onOpenReports,
  onOpenCommandPalette,
  reportsCount = 0,
}) => {
  const tabsScrollRef = useRef<HTMLDivElement | null>(null);
  const [isMultiLineWrap, setIsMultiLineWrap] = useState(false);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingNameDraft, setEditingNameDraft] = useState<string>('');

  const activeTabObj = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const activeModBadge =
    MODALITY_BADGE[activeTabObj?.modality || 'sonography'] || MODALITY_BADGE.sonography;

  // Convert standard vertical mouse wheel scroll into horizontal scroll for hospital mice
  const handleWheelHorizontalScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    if (isMultiLineWrap || !tabsScrollRef.current) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      tabsScrollRef.current.scrollLeft -= e.deltaY * 1.3;
    }
  };

  const scrollTabsBy = (direction: 'right' | 'left') => {
    if (!tabsScrollRef.current) return;
    const offset = direction === 'right' ? 240 : -240;
    tabsScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  const startEditingTabName = (tab: PatientWorkspaceTab, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTabId(tab.id);
    setEditingNameDraft(tab.patientInfo.fullName || '');
  };

  const commitTabNameEdit = (tabId: string) => {
    if (onUpdateTabPatientName) {
      onUpdateTabPatientName(tabId, editingNameDraft.trim());
    }
    setEditingTabId(null);
  };

  return (
    <div
      id="app-patient-tabs-bar"
      style={{ top: 'var(--navbar-height, 52px)' }}
      className="group/tabsbar sticky z-30 w-full pt-0 no-print select-none transition-all duration-200"
    >
      <div className="w-full max-w-[1680px] 2xl:max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10">
        <div className="w-full bg-slate-900/95 backdrop-blur-md text-slate-200 border border-t-0 border-slate-800 rounded-b-2xl rounded-t-none group-[.is-quickbar-docked]/tabsbar:rounded-b-none px-2.5 py-1.5 flex items-center justify-between gap-1.5 shadow-xs transition-all duration-150">
          {/* Scroll Right Button (For Hospital Mice without Horizontal Scroll) */}
          {!isMultiLineWrap && tabs.length > 2 && (
            <button
              type="button"
              onClick={() => scrollTabsBy('right')}
              title="اسکرول تب‌ها به راست (با چرخ موس هم می‌توانید روی تب‌ها اسکرول کنید)"
              className="w-6.5 h-6.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Open Patient Tabs Container (Supports Mouse Wheel Horizontal Scroll + Optional Multi-line Wrap) */}
          <div
            ref={tabsScrollRef}
            onWheel={handleWheelHorizontalScroll}
            className={`flex items-center gap-1.5 flex-1 py-0.5 ${
              isMultiLineWrap
                ? 'flex-wrap'
                : 'overflow-x-auto no-scrollbar scroll-smooth'
            }`}
          >
            {tabs.map((tab, idx) => {
              const isActive = tab.id === activeTabId;
              const modInfo = MODALITY_BADGE[tab.modality] || MODALITY_BADGE.sonography;
              const displayName = tab.patientInfo.fullName.trim() || `بیمار نوبت ${idx + 1}`;
              const isEditingThisTab = editingTabId === tab.id;

              return (
                <div
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  onDoubleClick={(e) => startEditingTabName(tab, e)}
                  title={`کلید میانبر: Alt+${idx + 1} • دبل‌کلیک یا کلیک روی مداد برای نوشتن نام بیمار`}
                  className={`group h-7 inline-flex items-center gap-1.5 px-2.5 rounded-xl text-[11px] font-bold transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer shrink-0 border ${
                    isActive
                      ? modInfo.activeTabCls
                      : 'bg-slate-800/85 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:-translate-y-[0.5px]'
                  }`}
                >
                  {/* Modality Color Dot Only (No Modality Text) */}
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
                      isActive ? 'bg-white' : modInfo.dotColor
                    }`}
                  />

                  {/* Inline Patient Name Input or Display (Only Patient Name or بیمار نوبت X) */}
                  {isEditingThisTab ? (
                    <div
                      className="inline-flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        autoFocus
                        value={editingNameDraft}
                        onChange={(e) => setEditingNameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            commitTabNameEdit(tab.id);
                          } else if (e.key === 'Escape') {
                            setEditingTabId(null);
                          }
                        }}
                        onBlur={() => commitTabNameEdit(tab.id)}
                        placeholder="نام بیمار..."
                        className="w-28 h-5 px-1.5 rounded bg-white text-slate-900 text-[11px] font-bold border border-teal-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          commitTabNameEdit(tab.id);
                        }}
                        className="p-0.5 rounded bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer"
                        title="ثبت نام بیمار"
                      >
                        <Check className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="max-w-[150px] truncate">{displayName}</span>
                  )}

                  {/* Quick Inline Edit Name Button on Tab */}
                  {!isEditingThisTab && onUpdateTabPatientName && (
                    <button
                      type="button"
                      onClick={(e) => startEditingTabName(tab, e)}
                      title="نوشتن یا ویرایش سریع نام بیمار روی تب"
                      className={`p-0.5 rounded transition-colors cursor-pointer ${
                        isActive
                          ? 'hover:bg-black/20 text-white/80 hover:text-white'
                          : 'opacity-60 group-hover:opacity-100 hover:bg-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                  )}

                  {tab.studies.length > 1 && (
                    <span
                      className={`text-[9px] px-1 py-0.1 rounded font-mono ${
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

            {/* Add New Patient Tab Button */}
            <button
              type="button"
              onClick={onAddNewTab}
              title="باز کردن تب بیمار جدید و انتخاب قالب‌های همین مدالیته (Alt+N)"
              className={`w-7 h-7 flex items-center justify-center rounded-xl border transition-all duration-200 cursor-pointer shrink-0 active:scale-95 ${activeModBadge.plusBtnCls}`}
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>

          {/* Left Actions: Scroll Left + Multi-line Wrap + Spotlight Command (Ctrl+K) + Duplicate + Archive */}
          <div className="flex items-center gap-1 shrink-0">
            {!isMultiLineWrap && tabs.length > 2 && (
              <button
                type="button"
                onClick={() => scrollTabsBy('left')}
                title="اسکرول تب‌ها به چپ (با چرخ موس هم می‌توانید روی تب‌ها اسکرول کنید)"
                className="w-6.5 h-6.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}

            {tabs.length > 2 && (
              <button
                type="button"
                onClick={() => setIsMultiLineWrap((prev) => !prev)}
                title={
                  isMultiLineWrap
                    ? 'بازگشت به نمایش تک‌خطی تب‌ها'
                    : 'نمایش چندخطی همه تب‌های باز (بدون نیاز به اسکرول افقی)'
                }
                className={`h-6.5 px-2 rounded-lg border text-[10px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                  isMultiLineWrap
                    ? 'bg-teal-600 text-white border-teal-500'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                <LayoutGrid className="w-3 h-3" />
                <span className="hidden sm:inline">{isMultiLineWrap ? 'تک‌خطی' : 'همه تب‌ها'}</span>
              </button>
            )}

            {onOpenCommandPalette && (
              <button
                type="button"
                onClick={onOpenCommandPalette}
                title="جستجوگر سریع قالب‌ها، تب‌ها و دستورات (Ctrl+K)"
                className="h-6.5 inline-flex items-center justify-center gap-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[10.5px] font-semibold transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Search className="w-3 h-3 text-teal-400" />
                <span className="hidden lg:inline">فرمان سریع</span>
                <kbd className="text-[9px] font-mono bg-slate-950/70 text-slate-300 px-1 rounded">
                  Ctrl+K
                </kbd>
              </button>
            )}

            <button
              type="button"
              onClick={onDuplicateActiveTab}
              title="کپی کردن گزارش و مشخصات تب فعلی در یک تب جدید"
              className="h-6.5 inline-flex items-center justify-center gap-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10.5px] font-semibold transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Copy className={`w-3 h-3 transition-colors ${activeModBadge.copyIconCls}`} />
              <span className="hidden md:inline">کپی در تب جدید</span>
            </button>

            {onOpenReports && (
              <button
                type="button"
                onClick={onOpenReports}
                title="مشاهده آرشیو گزارش‌های ذخیره‌شده بیماران و تاریخچه نسخه‌ها"
                className="h-6.5 inline-flex items-center justify-center gap-1 px-2.5 rounded-lg bg-slate-800 hover:bg-teal-700 text-slate-200 hover:text-white border border-slate-700 hover:border-teal-500 text-[10.5px] font-bold transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <FolderOpen className="w-3 h-3 text-teal-400 shrink-0" />
                <span>آرشیو بیماران</span>
                {reportsCount > 0 && (
                  <span className="px-1 rounded bg-slate-950/70 text-teal-300 font-mono text-[9.5px]">
                    {reportsCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
