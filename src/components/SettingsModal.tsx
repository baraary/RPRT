import React, { useState } from 'react';
import { AppSettings } from '../types';
import {
  Settings as SettingsIcon,
  X,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  Building2,
  SlidersHorizontal,
  Moon,
  Image as ImageIcon,
  PenTool,
  Trash2,
} from 'lucide-react';
import { StorageService } from '../services/storage';

// Built-in vector sample Clinic Logos (100% offline SVG Data URIs)
const SAMPLE_CLINIC_LOGOS: { id: string; label: string; url: string }[] = [
  {
    id: 'logo-shafa-teal',
    label: 'نشان پرتوپزشکی شفا (سبز آبی)',
    url: `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
        <rect x="6" y="6" width="108" height="108" rx="26" fill="#f0fdfa" stroke="#0f766e" stroke-width="5"/>
        <circle cx="60" cy="60" r="36" fill="none" stroke="#14b8a6" stroke-width="3" stroke-dasharray="8 4"/>
        <path d="M60 28 V92 M28 60 H92" stroke="#0f766e" stroke-width="8" stroke-linecap="round"/>
        <circle cx="60" cy="60" r="14" fill="#0f766e"/>
        <path d="M40 60 L54 60 L58 49 L63 71 L67 60 L80 60" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
    )}`,
  },
  {
    id: 'logo-mri-navy',
    label: 'نشان تخصصی ام‌آر‌آی و سی‌تی (سرمه‌ای)',
    url: `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
        <circle cx="60" cy="60" r="54" fill="#eef2ff" stroke="#1e3a8a" stroke-width="5"/>
        <circle cx="60" cy="60" r="40" fill="none" stroke="#3b82f6" stroke-width="4"/>
        <circle cx="60" cy="60" r="26" fill="none" stroke="#1d4ed8" stroke-width="3" stroke-dasharray="10 5"/>
        <path d="M60 36 V84 M36 60 H84" stroke="#1e3a8a" stroke-width="7" stroke-linecap="round"/>
        <circle cx="60" cy="60" r="8" fill="#2563eb"/>
      </svg>`
    )}`,
  },
  {
    id: 'logo-hospital-crest',
    label: 'نشان رسمی بیمارستانی (کلاسیک)',
    url: `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
        <path d="M60 10 L104 28 V62 C104 88 84 104 60 112 C36 104 16 88 16 62 V28 Z" fill="#ecfdf5" stroke="#047857" stroke-width="5"/>
        <path d="M60 32 V86 M36 59 H84" stroke="#047857" stroke-width="9" stroke-linecap="round"/>
        <circle cx="60" cy="59" r="24" fill="none" stroke="#10b981" stroke-width="3"/>
      </svg>`
    )}`,
  },
];

// Built-in vector sample Doctor Digital Signatures (100% offline SVG Data URIs)
const SAMPLE_DOCTOR_SIGNATURES: { id: string; label: string; url: string }[] = [
  {
    id: 'sig-blue-classic',
    label: 'امضای رسمی پزشکی (جوهر آبی)',
    url: `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 90" width="260" height="90">
        <path d="M35 66 C55 22, 85 18, 92 54 C96 72, 72 76, 82 46 C94 18, 134 26, 128 58 C124 72, 148 35, 168 42 C186 48, 198 30, 224 24" fill="none" stroke="#1d4ed8" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M26 74 Q130 56 236 64" fill="none" stroke="#1e40af" stroke-width="2" stroke-linecap="round"/>
        <circle cx="195" cy="50" r="2.2" fill="#1d4ed8"/>
        <circle cx="204" cy="47" r="2.2" fill="#1d4ed8"/>
      </svg>`
    )}`,
  },
  {
    id: 'sig-teal-seal',
    label: 'امضا و مهر تایید رادیولوژی',
    url: `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 90" width="260" height="90">
        <circle cx="62" cy="45" r="34" fill="none" stroke="#0f766e" stroke-width="2.2" stroke-dasharray="5 3" opacity="0.75"/>
        <circle cx="62" cy="45" r="28" fill="none" stroke="#0f766e" stroke-width="1.2" opacity="0.6"/>
        <text x="62" y="48" font-family="Tahoma, sans-serif" font-size="10" font-weight="bold" fill="#0f766e" text-anchor="middle" opacity="0.85">RADIOLOGY</text>
        <path d="M44 62 C78 16, 114 24, 108 58 C104 76, 138 24, 158 52 C172 70, 195 28, 232 34" fill="none" stroke="#0f172a" stroke-width="3" stroke-linecap="round"/>
        <path d="M40 70 Q145 58 238 62" fill="none" stroke="#0f766e" stroke-width="2.2" stroke-linecap="round"/>
      </svg>`
    )}`,
  },
  {
    id: 'sig-navy-exec',
    label: 'امضای خط شکسته (سرمه‌ای)',
    url: `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 90" width="260" height="90">
        <path d="M48 68 C42 30, 88 12, 105 46 C118 72, 134 22, 154 44 C168 60, 185 35, 218 28 C200 52, 150 74, 34 74" fill="none" stroke="#1e293b" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
    )}`,
  },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onRefreshAllData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onRefreshAllData,
}) => {
  const [clinicName, setClinicName] = useState(settings.clinicName);
  const [clinicSubtitle, setClinicSubtitle] = useState(
    settings.clinicSubtitle || 'رادیولوژی، سونوگرافی، ام‌آر‌آی، ام‌آر‌آی قلب، سی‌تی‌اسکن'
  );
  const [clinicAddress, setClinicAddress] = useState(settings.clinicAddress);
  const [clinicPhone, setClinicPhone] = useState(settings.clinicPhone);
  const [clinicLogoText, setClinicLogoText] = useState(settings.clinicLogoText);
  const [clinicLogoUrl, setClinicLogoUrl] = useState(settings.clinicLogoUrl || '');
  const [doctorSignatureUrl, setDoctorSignatureUrl] = useState(settings.doctorSignatureUrl || '');
  const [smartSuggestionsEnabled, setSmartSuggestionsEnabled] = useState(settings.smartSuggestionsEnabled);
  const [numberSlotsEnabled, setNumberSlotsEnabled] = useState(settings.numberSlotsEnabled ?? false);
  const [darkMode, setDarkMode] = useState(settings.darkMode ?? false);
  const [defaultFont, setDefaultFont] = useState(settings.defaultFont || 'Vazirmatn');
  const [defaultFontSize, setDefaultFontSize] = useState<number>(settings.defaultFontSize || 14);
  const [headingFont, setHeadingFont] = useState(settings.headingFont || 'Vazirmatn');
  const [headingFontSize, setHeadingFontSize] = useState(settings.headingFontSize || '16px');
  const [headingBold, setHeadingBold] = useState(settings.headingBold ?? true);
  const [pageBreakPerStudy, setPageBreakPerStudy] = useState(settings.pageBreakPerStudy ?? false);
  const [importStatus, setImportStatus] = useState<string>('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setDefaultFont(settings.defaultFont || 'Vazirmatn');
      setDefaultFontSize(settings.defaultFontSize || 14);
      setHeadingFont(settings.headingFont || 'Vazirmatn');
      setHeadingFontSize(settings.headingFontSize || '16px');
      setDarkMode(settings.darkMode ?? false);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  // Upload custom image (Logo or Signature) and convert to base64 Data URL for offline storage
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === 'string') {
        setter(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AppSettings = {
      ...settings,
      clinicName: clinicName.trim(),
      clinicSubtitle: clinicSubtitle.trim(),
      clinicAddress: clinicAddress.trim(),
      clinicPhone: clinicPhone.trim(),
      clinicLogoText: clinicLogoText.trim(),
      clinicLogoUrl,
      doctorSignatureUrl,
      smartSuggestionsEnabled,
      numberSlotsEnabled,
      darkMode,
      defaultFont,
      defaultFontSize,
      headingFont,
      headingFontSize,
      headingBold,
      pageBreakPerStudy,
    };
    onSaveSettings(updated);
    onClose();
  };

  const handleExportBackup = () => {
    const jsonStr = StorageService.exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RadioReport_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const ok = StorageService.importAllData(content);
      if (ok) {
        setImportStatus('اطلاعات با موفقیت بازیابی شد.');
        onRefreshAllData();
      } else {
        setImportStatus('خطا در فایل پشتیبان.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDefaults = () => {
    StorageService.resetToDefaults();
    onRefreshAllData();
    setShowResetConfirm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleIn">
        {/* Header with Top-Left Pinned Close Button */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-400 flex items-center justify-center shrink-0">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base">تنظیمات سامانه، فونت پیش‌فرض، لوگو و امضای سربرگ</h3>
              <p className="text-[11px] text-slate-300 mt-0.5">اطلاعات مرکز، قلم پیش‌فرض متن گزارش، لوگوی اختصاصی و پشتیبان‌گیری</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="بستن پنجره تنظیمات"
            className="h-8 px-2.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white border border-slate-700 hover:border-rose-500 flex items-center gap-1 text-xs font-bold shrink-0 transition-colors cursor-pointer"
          >
            <span>بستن</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Clinic Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Building2 className="w-4 h-4 text-teal-600" />
              <span>مشخصات مرکز تصویربرداری (جهت چاپ در سربرگ گزارش)</span>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                نام رسمی مرکز تصویربرداری:
              </label>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                عناوین بخش‌ها و خدمات (زیرعنوان سربرگ):
              </label>
              <input
                type="text"
                value={clinicSubtitle}
                onChange={(e) => setClinicSubtitle(e.target.value)}
                placeholder="رادیولوژی، سونوگرافی، ام‌آر‌آی، ام‌آر‌آی قلب، سی‌تی‌اسکن"
                className="w-full text-xs p-2 rounded-xl border border-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  تلفن تماس:
                </label>
                <input
                  type="text"
                  value={clinicPhone}
                  onChange={(e) => setClinicPhone(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  متن لوگو/نشانگر انگلیسی:
                </label>
                <input
                  type="text"
                  value={clinicLogoText}
                  onChange={(e) => setClinicLogoText(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                آدرس مرکز:
              </label>
              <input
                type="text"
                value={clinicAddress}
                onChange={(e) => setClinicAddress(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-200"
              />
            </div>
          </div>

          {/* NEW SECTION: Clinic Logo & Doctor Digital Signature (Upload or Choose from Samples) */}
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                <ImageIcon className="w-4 h-4 text-teal-600" />
                <span>لوگوی اختصاصی مرکز و امضای دیجیتال پزشک (در فایل چاپی A4)</span>
              </div>
              <span className="text-[10px] bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-full font-semibold">
                ذخیره آفلاین در مرورگر
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. Clinic Logo Box */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-teal-600" />
                    <span>۱. لوگوی بالای سربرگ مرکز</span>
                  </span>
                  {clinicLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setClinicLogoUrl('')}
                      className="text-[10px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>حذف لوگو</span>
                    </button>
                  )}
                </div>

                {/* Live Logo Preview + Upload Button */}
                <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                  <div className="w-14 h-14 rounded-xl bg-slate-50 border border-dashed border-slate-300 flex items-center justify-center shrink-0 overflow-hidden p-1">
                    {clinicLogoUrl ? (
                      <img
                        src={clinicLogoUrl}
                        alt="لوگوی مرکز"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400 text-center leading-tight">
                        بدون لوگو
                      </span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <label className="w-full py-1.5 px-2.5 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>آپلود تصویر لوگوی دلخواه</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, setClinicLogoUrl)}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-slate-500">
                      فرمت PNG، JPG یا SVG (نمایش در سمت راست بالای سربرگ)
                    </p>
                  </div>
                </div>

                {/* Preset Sample Logos */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-600">
                    یا انتخاب سریع از میان لوگوهای نمونه آماده:
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {SAMPLE_CLINIC_LOGOS.map((sample) => {
                      const isSelected = clinicLogoUrl === sample.url;
                      return (
                        <button
                          key={sample.id}
                          type="button"
                          onClick={() => setClinicLogoUrl(sample.url)}
                          className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-teal-50 border-teal-600 ring-1 ring-teal-500/30'
                              : 'bg-white hover:bg-slate-100 border-slate-200'
                          }`}
                          title={sample.label}
                        >
                          <img src={sample.url} alt={sample.label} className="w-9 h-9 object-contain" />
                          <span className="text-[9px] font-bold text-slate-700 text-center line-clamp-1">
                            {sample.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 2. Doctor Digital Signature Box */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-indigo-600" />
                    <span>۲. امضای دیجیتال پزشک (پای گزارش)</span>
                  </span>
                  {doctorSignatureUrl && (
                    <button
                      type="button"
                      onClick={() => setDoctorSignatureUrl('')}
                      className="text-[10px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>حذف امضا</span>
                    </button>
                  )}
                </div>

                {/* Live Signature Preview + Upload Button */}
                <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                  <div className="w-20 h-14 rounded-xl bg-slate-50 border border-dashed border-slate-300 flex items-center justify-center shrink-0 overflow-hidden p-1">
                    {doctorSignatureUrl ? (
                      <img
                        src={doctorSignatureUrl}
                        alt="امضای دیجیتال پزشک"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400 text-center leading-tight">
                        بدون تصویر امضا
                      </span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <label className="w-full py-1.5 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>آپلود تصویر امضا / مهر</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, setDoctorSignatureUrl)}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-slate-500">
                      چاپ خودکار در کادر مهر و امضای پزشک در پایین برگه A4
                    </p>
                  </div>
                </div>

                {/* Preset Sample Signatures */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-600">
                    یا انتخاب سریع از میان امضاهای دیجیتال نمونه:
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {SAMPLE_DOCTOR_SIGNATURES.map((sample) => {
                      const isSelected = doctorSignatureUrl === sample.url;
                      return (
                        <button
                          key={sample.id}
                          type="button"
                          onClick={() => setDoctorSignatureUrl(sample.url)}
                          className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-600 ring-1 ring-indigo-500/30'
                              : 'bg-white hover:bg-slate-100 border-slate-200'
                          }`}
                          title={sample.label}
                        >
                          <img src={sample.url} alt={sample.label} className="w-14 h-9 object-contain" />
                          <span className="text-[9px] font-bold text-slate-700 text-center line-clamp-1">
                            {sample.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Default Body Font & Headings Typography Settings */}
          <div className="pt-3 border-t border-slate-200 space-y-3.5">
            <div className="text-xs font-black text-slate-900 flex items-center justify-between">
              <span>تنظیم قلم پیش‌فرض متن گزارش و عناوین (محیط تایپ و چاپ)</span>
              <span className="text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded-full">
                نمایش خواناتر در محیط تایپ
              </span>
            </div>

            {/* Body Font Family & Base Font Size */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    قلم پیش‌فرض متن اصلی گزارش (Body Font):
                  </label>
                  <select
                    value={defaultFont}
                    onChange={(e) => setDefaultFont(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white font-semibold focus:border-teal-500"
                  >
                    {(settings.customFonts || []).map((f) => (
                      <option key={f.id} value={f.family}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    سایز پایه متن گزارش (استاندارد ۱۴):
                  </label>
                  <select
                    value={defaultFontSize}
                    onChange={(e) => setDefaultFontSize(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white font-semibold focus:border-teal-500"
                  >
                    <option value={12}>۱۲ (ریز)</option>
                    <option value={13}>۱۳ (متوسط کوچک)</option>
                    <option value={14}>۱۴ (استاندارد چاپی • درشت‌تر در محیط تایپ)</option>
                    <option value={15}>۱۵ (متوسط بزرگ)</option>
                    <option value={16}>۱۶ (درشت)</option>
                  </select>
                </div>
              </div>

              {/* Live Font Preview */}
              <div
                className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 leading-relaxed"
                style={{
                  fontFamily: `${defaultFont}, 'Vazirmatn', sans-serif`,
                  fontSize: `${defaultFontSize + 2}px`,
                }}
              >
                <span className="text-[10px] font-bold text-teal-700 ml-2 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                  پیش‌نمایش قلم متن:
                </span>
                <span>
                  کبد دارای ابعاد و اکوی پارانشیمال طبیعی است (اسپن ۱۴۲ میلی‌متر). شواهدی از ضایعه فضاگیر رویت نشد.
                </span>
              </div>
            </div>

            {/* Heading Font Family & Heading Size */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  قلم عناوین و تیترهای بررسی:
                </label>
                <select
                  value={headingFont}
                  onChange={(e) => setHeadingFont(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-white"
                >
                  {(settings.customFonts || []).map((f) => (
                    <option key={f.id} value={f.family}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  اندازه فونت عنوان بررسی:
                </label>
                <select
                  value={headingFontSize}
                  onChange={(e) => setHeadingFontSize(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="14px">۱۴ پیکسل (ریز)</option>
                  <option value="16px">۱۶ پیکسل (استاندارد)</option>
                  <option value="18px">۱۸ پیکسل (متوسط بزرگ)</option>
                  <option value="20px">۲۰ پیکسل (بزرگ و برجسته)</option>
                  <option value="22px">۲۲ پیکسل (بسیار بزرگ)</option>
                </select>
              </div>
            </div>

            {/* Multi-Study Page Break Setting */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={pageBreakPerStudy}
                  onChange={(e) => setPageBreakPerStudy(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                />
                <span>شکستن صفحه برای هر تصویربرداری (شروع هر بررسی در صفحه مجزا در چاپ A4)</span>
              </label>
              <p className="text-[10px] text-slate-500 mr-6">
                در صورت فعال نبودن، سیستم به صورت پیش‌فرض مانع نصف شدن گزارش در انتهای صفحه می‌شود و اگر کل گزارش در صفحه جاری جا نشود، تمام آن را به صفحه بعدی می‌برد.
              </p>
            </div>
          </div>

          {/* AI & Typist Productivity Settings */}
          <div className="pt-3 border-t border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between p-3 bg-teal-50/70 border border-teal-200 rounded-2xl">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span>پیشنهاد هوشمند جملات بعدی</span>
                </div>
                <p className="text-[11px] text-teal-700">
                  نمایش و تکمیل خودکار هوشمند با کلید Tab حین تایپ یافته‌ها
                </p>
              </div>
              <input
                type="checkbox"
                checked={smartSuggestionsEnabled}
                onChange={(e) => setSmartSuggestionsEnabled(e.target.checked)}
                className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-sky-50/70 border border-sky-200 rounded-2xl">
              <div className="space-y-0.5 pl-3">
                <div className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-sky-600" />
                  <span>فیلدهای جایگذاری اعداد در فایل‌های خام (بدون به هم ریختن متن)</span>
                  <span className="text-[10px] font-semibold bg-white text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-md">
                    اختیاری • پیش‌فرض غیرفعال
                  </span>
                </div>
                <p className="text-[11px] text-sky-800 leading-relaxed">
                  در صورت فعال‌سازی، اعداد و اندازه‌های قالب‌های خام (سایز کلیه، سن جنین، تیروئید و...) در کادرهای مجزا قرار می‌گیرند تا بدون تغییر ساختار متن ویرایش شوند.
                </p>
              </div>
              <input
                type="checkbox"
                checked={numberSlotsEnabled}
                onChange={(e) => setNumberSlotsEnabled(e.target.checked)}
                className="w-5 h-5 rounded text-sky-600 focus:ring-sky-500 cursor-pointer shrink-0"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-900 text-slate-100 border border-slate-700 rounded-2xl">
              <div className="space-y-0.5 pl-3">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Moon className="w-4 h-4 text-amber-400" />
                  <span>حالت تاریک مخصوص اتاق گزارش‌نویسی رادیولوژی و شیفت شب (Dark Mode)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  محیط تایپ را تیره می‌کند تا چشم در محیط کم‌نور خسته نشود (کاغذ چاپ و پیش‌نمایش همچنان سفید باقی می‌ماند).
                </p>
              </div>
              <input
                type="checkbox"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
                className="w-5 h-5 rounded text-teal-500 focus:ring-teal-400 cursor-pointer shrink-0"
              />
            </div>
          </div>

          {/* Backup & Restore */}
          <div className="pt-3 border-t border-slate-200 space-y-2.5">
            <div className="text-xs font-bold text-slate-800">
              پشتیبان‌گیری و انتقال داده‌ها (آفلاین کامل)
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="flex-1 py-2 px-3 text-xs font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl flex items-center justify-center gap-1.5 text-slate-800 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>دانلود نسخه پشتیبان (JSON)</span>
              </button>

              <label className="flex-1 py-2 px-3 text-xs font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl flex items-center justify-center gap-1.5 text-slate-800 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>بازیابی از فایل</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
            {importStatus && (
              <div className="text-xs text-teal-700 bg-teal-50 p-2 rounded-lg font-medium">
                {importStatus}
              </div>
            )}

            <div className="pt-2">
              {!showResetConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>بازنشانی به قالب‌ها و داده‌های اولیه کارخانه</span>
                </button>
              ) : (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-2">
                  <div className="text-rose-900 font-bold">
                    آیا مطمئن هستید؟ تمام داده‌ها به حالت اولیه کارخانه بازمی‌گردند.
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetDefaults}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg"
                    >
                      بله، بازنشانی شود
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(false)}
                      className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg"
                    >
                      انصراف
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs"
            >
              ذخیره تنظیمات
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
