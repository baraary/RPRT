import React from 'react';
import { Modality, Doctor, Typist } from '../types';
import {
  Wifi,
  WifiOff,
  User,
  PlusCircle,
  FolderOpen,
  Settings as SettingsIcon,
  Printer,
  ChevronDown,
  Activity,
  Moon,
  Sun,
  BarChart3,
  UserCheck,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  modality: Modality;
  onSelectModality: (modality: Modality) => void;
  doctors: Doctor[];
  activeDoctorId: string;
  onSelectDoctor: (doctorId: string) => void;
  typists: Typist[];
  activeTypistId: string;
  onSelectTypist: (typistId: string) => void;
  onOpenTypistAnalytics: () => void;
  smartSuggestionsEnabled?: boolean;
  onToggleSmartSuggestions?: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  isOnline: boolean;
  onOpenDoctors: () => void;
  onOpenReports: () => void;
  onOpenSettings: () => void;
  onNewReport: () => void;
  onPrintPreview: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  modality,
  onSelectModality,
  doctors,
  activeDoctorId,
  onSelectDoctor,
  typists,
  activeTypistId,
  onSelectTypist,
  onOpenTypistAnalytics,
  darkMode = false,
  onToggleDarkMode,
  isOnline,
  onOpenDoctors,
  onOpenReports,
  onOpenSettings,
  onNewReport,
  onPrintPreview,
}) => {
  const currentDoctor = doctors.find((d) => d.id === activeDoctorId) || doctors[0];
  const currentTypist = typists.find((t) => t.id === activeTypistId) || typists[0];

  const modalityNames: Record<Modality, string> = {
    sonography: 'سونوگرافی',
    mri: 'ام‌آر‌آی',
    ct: 'سی‌تی‌اسکن',
  };

  const modalityStyles: Record<
    Modality,
    {
      activeBtn: string;
      inactiveBtn: string;
      dot: string;
      badge: string;
      printBtn: string;
    }
  > = {
    sonography: {
      activeBtn: 'bg-sky-600 text-white border-sky-600 shadow-xs shadow-sky-600/25',
      inactiveBtn: 'text-slate-600 hover:text-sky-800 hover:bg-sky-50/90 border-transparent',
      dot: 'bg-sky-500',
      badge: 'text-sky-700 bg-sky-50 border-sky-200',
      printBtn: 'bg-sky-600 hover:bg-sky-700 border-sky-600',
    },
    mri: {
      activeBtn: 'bg-indigo-600 text-white border-indigo-600 shadow-xs shadow-indigo-600/25',
      inactiveBtn: 'text-slate-600 hover:text-indigo-800 hover:bg-indigo-50/90 border-transparent',
      dot: 'bg-indigo-500',
      badge: 'text-indigo-700 bg-indigo-50 border-indigo-200',
      printBtn: 'bg-indigo-600 hover:bg-indigo-700 border-indigo-600',
    },
    ct: {
      activeBtn: 'bg-emerald-600 text-white border-emerald-600 shadow-xs shadow-emerald-600/25',
      inactiveBtn: 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50/90 border-transparent',
      dot: 'bg-emerald-500',
      badge: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      printBtn: 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600',
    },
  };

  const activeModStyle = modalityStyles[modality];

  return (
    <header
      id="app-main-navbar"
      className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs no-print transition-colors duration-200"
    >
      {/* Top Bar: Brand, Modality Selector, Typist & Doctor Selectors, System Actions */}
      <div className="w-full max-w-[1680px] 2xl:max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-2">
        <div className="flex items-center justify-between gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-teal-700 to-emerald-500 text-white flex items-center justify-center shadow-xs shadow-teal-500/20 shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm sm:text-base text-slate-900 tracking-tight whitespace-nowrap">
                  رادیورپورت
                </h1>
                <span className="text-[11px] text-teal-700 font-semibold px-1.5 py-0.5 rounded-md bg-teal-50 border border-teal-200 whitespace-nowrap">
                  نسخه تخصصی
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden xl:block whitespace-nowrap">
                سامانه هوشمند گزارش‌نویسی ام‌آر‌آی، سی‌تی‌اسکن و سونوگرافی
              </p>
            </div>
          </div>

          {/* Center: Modality Tabs (Uniform Width & Height, Color-Coded per Modality) */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/90">
            {(['sonography', 'mri', 'ct'] as Modality[]).map((m) => {
              const active = modality === m;
              const mStyle = modalityStyles[m];
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => onSelectModality(m)}
                  className={`h-8 min-w-[100px] sm:min-w-[114px] px-3 rounded-lg inline-flex items-center justify-center gap-2 text-xs font-bold whitespace-nowrap border transition-all duration-200 active:scale-95 cursor-pointer ${
                    active ? mStyle.activeBtn : mStyle.inactiveBtn
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full transition-colors ${
                      active ? 'bg-white' : mStyle.dot
                    }`}
                  />
                  <span>{modalityNames[m]}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Uniform Height (h-9) Controls: PWA Install, Dark Mode, Online Status, Typist Selector, Doctor Selector */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Offline PWA Install / GitHub Guide Button (Uniform h-9) */}
            <PWAInstallButton />

            {/* Dark Mode Toggle (Uniform h-9) */}
            {onToggleDarkMode && (
              <button
                type="button"
                onClick={onToggleDarkMode}
                className={`h-9 px-2.5 rounded-xl inline-flex items-center justify-center gap-1.5 text-xs font-bold border whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer ${
                  darkMode
                    ? 'bg-amber-400/20 border-amber-400/50 text-amber-300'
                    : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-700'
                }`}
                title={
                  darkMode
                    ? 'بازگشت به حالت روشن'
                    : 'حالت تاریک مخصوص اتاق گزارش‌نویسی رادیولوژی و شیفت شب'
                }
              >
                {darkMode ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="hidden 2xl:inline">حالت روز</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                    <span className="hidden 2xl:inline">حالت شب</span>
                  </>
                )}
              </button>
            )}

            {/* Online / Offline status badge (Uniform h-9) */}
            <div
              className={`h-9 px-2.5 rounded-xl inline-flex items-center justify-center gap-1.5 text-xs font-bold border whitespace-nowrap transition-colors duration-200 ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
              title={isOnline ? 'سامانه آنلاین است' : 'سامانه در حالت آفلاین'}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="hidden 2xl:inline">آنلاین</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="hidden 2xl:inline">آفلاین</span>
                </>
              )}
            </div>

            {/* Active Typist Selector (Uniform h-9 + Smooth Dropdown) */}
            <div className="relative group">
              <button
                type="button"
                className="h-9 px-2.5 rounded-xl bg-sky-50/90 hover:bg-sky-100/80 border border-sky-200 inline-flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer whitespace-nowrap"
                title="انتخاب تایپیست فعال و مشاهده آمار داخلی"
              >
                <UserCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span className="text-xs font-bold text-sky-950 hidden md:inline">
                  {currentTypist?.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-sky-600 transition-transform duration-200 group-hover:rotate-180 shrink-0" />
              </button>

              {/* Typist Dropdown Menu */}
              <div className="absolute left-0 mt-1.5 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-50 opacity-0 invisible translate-y-1.5 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200 ease-out">
                <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-100 mb-1">
                  تایپیست فعال (آمار داخلی مرکز)
                </div>
                {typists.map((typ) => (
                  <button
                    key={typ.id}
                    type="button"
                    onClick={() => onSelectTypist(typ.id)}
                    className={`w-full text-right px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors duration-150 cursor-pointer ${
                      typ.id === activeTypistId
                        ? 'bg-sky-50 text-sky-950 font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{typ.name}</span>
                    {typ.id === activeTypistId && (
                      <span className="w-2 h-2 rounded-full bg-sky-600" />
                    )}
                  </button>
                ))}
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button
                    type="button"
                    onClick={onOpenTypistAnalytics}
                    className="w-full text-right px-2.5 py-1.5 rounded-xl text-xs font-bold text-teal-700 hover:bg-teal-50 flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-teal-600" />
                    <span>آمار کارکرد روزانه/هفتگی/ماهانه</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Doctor Selector (Uniform h-9, Single-Line Alignment + Smooth Animated Dropdown) */}
            <div className="relative group">
              <button
                type="button"
                className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 inline-flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer whitespace-nowrap"
              >
                <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                  {currentDoctor?.name.slice(5, 6) || 'پ'}
                </span>
                <span className="text-xs font-bold text-slate-800 hidden sm:inline">
                  {currentDoctor?.name}
                </span>
                <span className="text-[10px] text-slate-500 font-mono hidden 2xl:inline">
                  ({currentDoctor?.medicalCouncilId})
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 transition-transform duration-200 group-hover:rotate-180 shrink-0" />
              </button>

              {/* Smooth Animated Doctor Dropdown Menu */}
              <div className="absolute left-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-50 opacity-0 invisible translate-y-1.5 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200 ease-out">
                <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-100 mb-1">
                  پزشک متخصص رادیولوژیست
                </div>
                {doctors.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => onSelectDoctor(doc.id)}
                    className={`w-full text-right px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors duration-150 cursor-pointer ${
                      doc.id === activeDoctorId
                        ? 'bg-teal-50 text-teal-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <div>{doc.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{doc.specialty}</div>
                    </div>
                    {doc.id === activeDoctorId && (
                      <span className="w-2 h-2 rounded-full bg-teal-600" />
                    )}
                  </button>
                ))}
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button
                    type="button"
                    onClick={onOpenDoctors}
                    className="w-full text-right px-2.5 py-1.5 rounded-xl text-xs font-semibold text-teal-600 hover:bg-teal-50 flex items-center gap-1.5 transition-colors duration-150 cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>مدیریت پزشکان و مهر امضا</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Second Action Bar: Uniform Height (h-8) Buttons & Modality-Synchronized Accent */}
      <div className="w-full max-w-[1680px] 2xl:max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 pb-2">
        <div className="w-full bg-slate-50 border border-slate-200/90 rounded-xl px-3.5 py-1.5 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium flex-wrap">
            <span>مدالیته فعال:</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-xs font-bold transition-colors duration-200 ${activeModStyle.badge}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activeModStyle.dot}`} />
              <span>{modalityNames[modality]}</span>
            </span>

            <span className="text-slate-300 hidden sm:inline">•</span>
            <button
              type="button"
              onClick={onOpenTypistAnalytics}
              className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-sky-800 bg-white px-2 py-0.5 rounded-md border border-slate-200 hover:border-sky-300 transition-colors cursor-pointer"
              title="کلیک جهت تغییر تایپیست یا مشاهده آمار گزارش‌ها"
            >
              <UserCheck className="w-3 h-3 text-sky-600" />
              <span>تایپیست: {currentTypist?.name}</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              type="button"
              onClick={onOpenTypistAnalytics}
              className="h-8 px-3 bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-slate-700 hover:text-sky-900 rounded-lg inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap shadow-2xs transition-all duration-200 active:scale-95 cursor-pointer"
              title="مشاهده آمار کارکرد روزانه، هفتگی و ماهانه هر تایپیست"
            >
              <BarChart3 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>آمار تایپیست‌ها</span>
            </button>

            <button
              type="button"
              onClick={onOpenReports}
              className="h-8 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-lg inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap shadow-2xs transition-all duration-200 active:scale-95 cursor-pointer"
              title="آرشیو گزارش‌های ذخیره‌شده"
            >
              <FolderOpen className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>آرشیو بیماران</span>
            </button>

            <button
              type="button"
              onClick={onNewReport}
              className="h-8 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-lg inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap shadow-2xs transition-all duration-200 active:scale-95 cursor-pointer"
              title="ایجاد گزارش جدید خالی"
            >
              <PlusCircle className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>گزارش جدید</span>
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              className="h-8 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-lg inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap shadow-2xs transition-all duration-200 active:scale-95 cursor-pointer"
              title="تنظیمات سامانه، لوگو و سربرگ"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>تنظیمات</span>
            </button>

            <button
              type="button"
              onClick={onPrintPreview}
              className={`h-8 px-3.5 text-white border rounded-lg inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap shadow-xs transition-all duration-200 active:scale-95 cursor-pointer ${activeModStyle.printBtn}`}
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span>پیش‌نمایش چاپ و سربرگ</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
