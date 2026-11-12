import React, { useState, useRef, useEffect } from 'react';
import { PatientInfo, ReferringPhysicianItem } from '../types';
import {
  User,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Wand2,
  Plus,
  X,
  Calendar,
  TrendingUp,
  Check,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { detectGenderFromPersianName, GenderAnatomyMismatch } from '../services/typistUtils';
import { StorageService } from '../services/storage';

interface PatientHeaderProps {
  patientInfo: PatientInfo;
  onChange: (info: PatientInfo) => void;
  criticalAlert?: string;
  onClearCriticalAlert?: () => void;
  genderMismatch?: GenderAnatomyMismatch;
  onSanitizeGenderMismatch?: () => void;
}

const PERSIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

function toEnglishDigits(str: string): string {
  return str
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

function getTodayJalaliParts(): { year: number; month: number; day: number; formatted: string } {
  try {
    const formatted = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const clean = toEnglishDigits(formatted);
    const parts = clean.split('/').map((n) => parseInt(n, 10));
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return {
        year: parts[0],
        month: parts[1],
        day: parts[2],
        formatted: `${parts[0]}/${String(parts[1]).padStart(2, '0')}/${String(parts[2]).padStart(2, '0')}`,
      };
    }
  } catch {}
  return { year: 1404, month: 8, day: 21, formatted: '1404/08/21' };
}

function getRelativeJalaliDateFormatted(daysOffset: number): string {
  try {
    const d = new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000);
    const formatted = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
    const clean = toEnglishDigits(formatted);
    const parts = clean.split('/').map((n) => parseInt(n, 10));
    if (parts.length === 3 && !isNaN(parts[0])) {
      return `${parts[0]}/${String(parts[1]).padStart(2, '0')}/${String(parts[2]).padStart(2, '0')}`;
    }
    return formatted;
  } catch {
    return '1404/08/21';
  }
}

function getJalaliMonthDays(year: number, month: number): number {
  if (month >= 1 && month <= 6) return 31;
  if (month >= 7 && month <= 11) return 30;
  // Esfand leap year check
  const isLeap = (((((year - 474) % 2820) + 474 + 38) * 682) % 2816) < 682;
  return isLeap ? 30 : 29;
}

export const PatientHeader: React.FC<PatientHeaderProps> = ({
  patientInfo,
  onChange,
  criticalAlert,
  onClearCriticalAlert,
  genderMismatch,
  onSanitizeGenderMismatch,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [autoDetectedGenderTag, setAutoDetectedGenderTag] = useState<string | null>(null);

  // Referring Physician Autocomplete & Frequency State
  const [referringList, setReferringList] = useState<ReferringPhysicianItem[]>(() =>
    StorageService.getReferringPhysicians()
  );
  const [showRefDropdown, setShowRefDropdown] = useState(false);
  const [highlightedRefIdx, setHighlightedRefIdx] = useState<number>(0);
  const refContainerRef = useRef<HTMLDivElement | null>(null);

  // Persian Date Picker Popover State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const todayJalali = getTodayJalaliParts();
  const [pickerYear, setPickerYear] = useState<number>(todayJalali.year);
  const [pickerMonth, setPickerMonth] = useState<number>(todayJalali.month);
  const dateContainerRef = useRef<HTMLDivElement | null>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (refContainerRef.current && !refContainerRef.current.contains(e.target as Node)) {
        setShowRefDropdown(false);
      }
      if (dateContainerRef.current && !dateContainerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync picker year/month when opening date picker from current reportDate
  const handleOpenDatePicker = () => {
    const clean = toEnglishDigits(patientInfo.reportDate || '');
    const parts = clean.split('/').map((n) => parseInt(n, 10));
    if (parts.length === 3 && parts[0] > 1300 && parts[1] >= 1 && parts[1] <= 12) {
      setPickerYear(parts[0]);
      setPickerMonth(parts[1]);
    } else {
      const current = getTodayJalaliParts();
      setPickerYear(current.year);
      setPickerMonth(current.month);
    }
    setShowDatePicker(true);
  };

  const updateField = (field: keyof PatientInfo, value: string) => {
    if (field === 'fullName') {
      const detected = detectGenderFromPersianName(value);
      if (detected && detected !== patientInfo.gender) {
        setAutoDetectedGenderTag(detected === 'male' ? 'تشخیص خودکار: آقا' : 'تشخیص خودکار: خانم');
        onChange({
          ...patientInfo,
          fullName: value,
          gender: detected,
        });
        return;
      } else if (detected) {
        setAutoDetectedGenderTag(detected === 'male' ? 'تشخیص خودکار: آقا' : 'تشخیص خودکار: خانم');
      } else {
        setAutoDetectedGenderTag(null);
      }
    }

    if (field === 'gender') {
      setAutoDetectedGenderTag(null);
    }

    onChange({
      ...patientInfo,
      [field]: value,
    });
  };

  // Filtered referring physicians (already sorted by usageCount desc from StorageService)
  const queryRef = (patientInfo.referringPhysician || '').trim();
  const filteredRefPhysicians = referringList.filter((item) => {
    if (!queryRef) return true;
    return item.name.toLowerCase().includes(queryRef.toLowerCase());
  });

  const exactMatchExists = referringList.some(
    (item) => item.name.trim().toLowerCase() === queryRef.toLowerCase()
  );

  const handleSelectReferringPhysician = (name: string) => {
    updateField('referringPhysician', name);
    const updated = StorageService.addOrIncrementReferringPhysician(name);
    setReferringList(updated);
    setShowRefDropdown(false);
  };

  const handleAddCurrentReferringPhysician = () => {
    if (!queryRef) return;
    const updated = StorageService.addOrIncrementReferringPhysician(queryRef);
    setReferringList(updated);
    setShowRefDropdown(false);
  };

  const handleDeleteReferringPhysician = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = StorageService.deleteReferringPhysician(id);
    setReferringList(updated);
  };

  const daysInPickerMonth = getJalaliMonthDays(pickerYear, pickerMonth);
  const currentSelectedClean = toEnglishDigits(patientInfo.reportDate || '');

  return (
    <div className="bg-white border-b border-slate-200 shadow-2xs no-print">
      {/* Gender-Anatomy Mismatch Warning & One-Click Sanitizer Bar */}
      {genderMismatch?.hasMismatch && (
        <div className="bg-amber-50 border-b border-amber-300 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 text-amber-950 text-xs animate-fadeIn">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{genderMismatch.warningText}</span>
          </div>
          {onSanitizeGenderMismatch && (
            <button
              type="button"
              onClick={onSanitizeGenderMismatch}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>اصلاح خودکار متن متناسب با جنسیت ({genderMismatch.genderLabel})</span>
            </button>
          )}
        </div>
      )}

      {/* Critical Alert Warning Bar */}
      {criticalAlert && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 flex items-center justify-between text-rose-800 text-xs animate-fadeIn">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-600 animate-bounce shrink-0" />
            <span>{criticalAlert}</span>
          </div>
          {onClearCriticalAlert && (
            <button
              onClick={onClearCriticalAlert}
              className="text-rose-600 hover:text-rose-900 font-semibold px-2 py-0.5 rounded hover:bg-rose-100"
            >
              متوجه شدم
            </button>
          )}
        </div>
      )}

      {/* Patient Header Section */}
      <div className="max-w-[1680px] 2xl:max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <User className="w-4 h-4 text-teal-600" />
            <h2 className="text-xs font-bold text-slate-800">
              مشخصات بیمار و پرونده
            </h2>
            {patientInfo.fullName && (
              <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                {patientInfo.fullName} {patientInfo.age ? `(${patientInfo.age} ساله)` : ''} •{' '}
                {patientInfo.gender === 'male' ? 'آقا' : patientInfo.gender === 'female' ? 'خانم' : 'کودک'}
              </span>
            )}
            {autoDetectedGenderTag && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                {autoDetectedGenderTag}
              </span>
            )}
            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              پذیرش: {patientInfo.admissionNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-colors cursor-pointer select-none"
            >
              <span>{collapsed ? 'نمایش مشخصات بیمار' : 'کوچک‌نمایی کادر بیمار'}</span>
              {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {!collapsed && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 2xl:gap-4 mt-2.5 pt-2 border-t border-slate-100">
            {/* Full Name */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                نام و نام خانوادگی (تشخیص جنسیت)
              </label>
              <input
                type="text"
                value={patientInfo.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                placeholder="مثال: علی رضایی / سارا محمدی"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 bg-slate-50/50 focus:bg-white transition-all"
              />
            </div>

            {/* National ID */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">کد ملی / شناسه</label>
              <input
                type="text"
                value={patientInfo.nationalId}
                onChange={(e) => updateField('nationalId', e.target.value)}
                placeholder="0012345678"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 bg-slate-50/50 focus:bg-white font-mono transition-all"
                dir="ltr"
              />
            </div>

            {/* Age & Gender */}
            <div className="flex gap-1.5">
              <div className="w-1/2">
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">سن</label>
                <input
                  type="text"
                  value={patientInfo.age}
                  onChange={(e) => updateField('age', e.target.value)}
                  placeholder="۴۲"
                  className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 bg-slate-50/50 focus:bg-white text-center transition-all"
                />
              </div>
              <div className="w-1/2">
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">جنسیت</label>
                <select
                  value={patientInfo.gender}
                  onChange={(e) => updateField('gender', e.target.value as any)}
                  className="w-full text-xs px-1.5 py-1.5 rounded-lg border border-slate-200 focus:border-teal-500 bg-slate-50/50 font-bold"
                >
                  <option value="female">زن (خانم)</option>
                  <option value="male">مرد (آقا)</option>
                  <option value="other">کودک/نامشخص</option>
                </select>
              </div>
            </div>

            {/* Admission Number */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">شماره پذیرش / کد تصویر</label>
              <input
                type="text"
                value={patientInfo.admissionNumber}
                onChange={(e) => updateField('admissionNumber', e.target.value)}
                placeholder="ADM-2026-904"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 bg-slate-50/50 focus:bg-white font-mono transition-all"
                dir="ltr"
              />
            </div>

            {/* Referring Physician (Searchable Combobox + Add to List + Sorted by Frequency) */}
            <div className="relative" ref={refContainerRef}>
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5 flex items-center justify-between">
                <span>پزشک ارجاع‌دهنده</span>
                <span className="text-[9.5px] text-teal-600 font-semibold">مرتب بر اساس تکرار</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={patientInfo.referringPhysician}
                  onFocus={() => {
                    setReferringList(StorageService.getReferringPhysicians());
                    setShowRefDropdown(true);
                    setHighlightedRefIdx(0);
                  }}
                  onChange={(e) => {
                    updateField('referringPhysician', e.target.value);
                    setShowRefDropdown(true);
                    setHighlightedRefIdx(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setShowRefDropdown(true);
                      setHighlightedRefIdx((prev) =>
                        Math.min(prev + 1, Math.max(0, filteredRefPhysicians.length - 1))
                      );
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setHighlightedRefIdx((prev) => Math.max(0, prev - 1));
                    } else if (e.key === 'Enter') {
                      if (showRefDropdown) {
                        e.preventDefault();
                        if (filteredRefPhysicians[highlightedRefIdx]) {
                          handleSelectReferringPhysician(filteredRefPhysicians[highlightedRefIdx].name);
                        } else if (queryRef) {
                          handleAddCurrentReferringPhysician();
                        }
                      }
                    } else if (e.key === 'Escape') {
                      setShowRefDropdown(false);
                    }
                  }}
                  placeholder="جستجو یا تایپ نام پزشک..."
                  className="w-full text-xs pr-2.5 pl-12 py-1.5 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 bg-slate-50/50 focus:bg-white transition-all"
                />

                <div className="absolute left-1 flex items-center gap-0.5">
                  {queryRef && !exactMatchExists && (
                    <button
                      type="button"
                      onClick={handleAddCurrentReferringPhysician}
                      title={`افزودن «${queryRef}» به فهرست پزشکان ارجاع‌دهنده`}
                      className="p-1 rounded-md bg-teal-600 hover:bg-teal-700 text-white transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setReferringList(StorageService.getReferringPhysicians());
                      setShowRefDropdown((prev) => !prev);
                    }}
                    title="مشاهده فهرست پزشکان ارجاع‌دهنده (مرتب بر اساس بیشترین تکرار)"
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Searchable & Frequency-Sorted Dropdown */}
              {showRefDropdown && (
                <div className="absolute right-0 left-0 sm:w-72 mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-scaleIn">
                  <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-bold">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-teal-600" />
                      <span>پزشکان ارجاع‌دهنده (به ترتیب بیشترین تکرار)</span>
                    </span>
                    <span>{filteredRefPhysicians.length} مورد</span>
                  </div>

                  {/* Add New Physician Button if typed name is not in list */}
                  {queryRef && !exactMatchExists && (
                    <div className="p-1.5 border-b border-slate-100 bg-teal-50/60">
                      <button
                        type="button"
                        onClick={handleAddCurrentReferringPhysician}
                        className="w-full text-right px-2.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span className="truncate">+ افزودن «{queryRef}» به فهرست</span>
                        <span className="text-[10px] bg-teal-800 px-1.5 py-0.5 rounded font-mono shrink-0">
                          ثبت ↵
                        </span>
                      </button>
                    </div>
                  )}

                  <div className="max-h-52 overflow-y-auto p-1 space-y-0.5">
                    {filteredRefPhysicians.length === 0 ? (
                      <div className="py-4 text-center text-[11px] text-slate-400">
                        موردی یافت نشد. با زدن دکمه + نام جدید را ثبت کنید.
                      </div>
                    ) : (
                      filteredRefPhysicians.map((item, idx) => {
                        const isSelected =
                          patientInfo.referringPhysician.trim().toLowerCase() ===
                          item.name.trim().toLowerCase();
                        const isHighlighted = idx === highlightedRefIdx;
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleSelectReferringPhysician(item.name)}
                            onMouseEnter={() => setHighlightedRefIdx(idx)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-teal-50 text-teal-950 font-bold'
                                : isHighlighted
                                ? 'bg-slate-100 text-slate-900 font-semibold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              {isSelected && <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />}
                              <span className="truncate">{item.name}</span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <span
                                className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 border border-slate-200/80"
                                title="تعداد دفعات انتخاب این پزشک"
                              >
                                {item.usageCount} بار
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteReferringPhysician(item.id, e)}
                                title="حذف از فهرست"
                                className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Report Date (Interactive Persian Shamsi Date Picker + Direct Input) */}
            <div className="relative" ref={dateContainerRef}>
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5 flex items-center justify-between">
                <span>تاریخ انجام</span>
                <span className="text-[9.5px] text-teal-600 font-semibold">تقویم شمسی</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={patientInfo.reportDate}
                  onFocus={handleOpenDatePicker}
                  onChange={(e) => updateField('reportDate', e.target.value)}
                  placeholder="1404/08/21"
                  className="w-full text-xs pl-2.5 pr-8 py-1.5 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 bg-slate-50/50 focus:bg-white text-left font-mono transition-all"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => (showDatePicker ? setShowDatePicker(false) : handleOpenDatePicker())}
                  title="انتخاب تاریخ از تقویم شمسی"
                  className="absolute right-1.5 p-1 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-md transition-colors cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Interactive Persian Calendar Popover */}
              {showDatePicker && (
                <div className="absolute left-0 mt-1 w-68 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 z-50 space-y-2.5 animate-scaleIn">
                  {/* Quick Date Presets */}
                  <div className="flex items-center gap-1 pb-2 border-b border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        const today = getTodayJalaliParts();
                        updateField('reportDate', today.formatted);
                        setShowDatePicker(false);
                      }}
                      className="flex-1 py-1 px-2 rounded-lg bg-teal-50 hover:bg-teal-600 text-teal-900 hover:text-white border border-teal-200 text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      امروز
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateField('reportDate', getRelativeJalaliDateFormatted(-1));
                        setShowDatePicker(false);
                      }}
                      className="flex-1 py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      دیروز
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateField('reportDate', getRelativeJalaliDateFormatted(-2));
                        setShowDatePicker(false);
                      }}
                      className="flex-1 py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      ۲ روز قبل
                    </button>
                  </div>

                  {/* Year & Month Controls */}
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-1.5 py-0.5">
                      <button
                        type="button"
                        onClick={() => setPickerYear((y) => y + 1)}
                        className="p-0.5 text-slate-500 hover:text-slate-900 cursor-pointer"
                        title="سال بعد"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-mono font-bold text-slate-800 px-1">
                        {pickerYear}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPickerYear((y) => y - 1)}
                        className="p-0.5 text-slate-500 hover:text-slate-900 cursor-pointer"
                        title="سال قبل"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <select
                      value={pickerMonth}
                      onChange={(e) => setPickerMonth(parseInt(e.target.value, 10))}
                      className="flex-1 text-xs py-1 px-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:border-teal-500 focus:outline-none cursor-pointer"
                    >
                      {PERSIAN_MONTHS.map((mName, idx) => (
                        <option key={mName} value={idx + 1}>
                          {mName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Days Grid (1..29/30/31) */}
                  <div className="grid grid-cols-7 gap-1 pt-0.5 text-center">
                    {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map((w) => (
                      <div key={w} className="text-[10px] font-bold text-slate-400 pb-0.5">
                        {w}
                      </div>
                    ))}
                    {Array.from({ length: daysInPickerMonth }).map((_, idx) => {
                      const dNum = idx + 1;
                      const formattedCandidate = `${pickerYear}/${String(pickerMonth).padStart(2, '0')}/${String(dNum).padStart(2, '0')}`;
                      const isSelectedDay = currentSelectedClean === formattedCandidate;
                      const isTodayDay = todayJalali.formatted === formattedCandidate;

                      return (
                        <button
                          key={dNum}
                          type="button"
                          onClick={() => {
                            updateField('reportDate', formattedCandidate);
                            setShowDatePicker(false);
                          }}
                          className={`h-7 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center ${
                            isSelectedDay
                              ? 'bg-teal-600 text-white shadow-2xs scale-105'
                              : isTodayDay
                              ? 'bg-teal-50 text-teal-800 border border-teal-300'
                              : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          {dNum}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

