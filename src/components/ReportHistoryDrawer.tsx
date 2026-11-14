import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MedicalReport, ReportRevision, Modality, Typist, Doctor } from '../types';
import {
  FolderOpen,
  X,
  Search,
  Trash2,
  Calendar,
  Download,
  Check,
  Filter,
  RotateCcw,
  UserCheck,
  BarChart3,
  Lock,
  History,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

interface ReportHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  reports: MedicalReport[];
  typists?: Typist[];
  doctors?: Doctor[];
  onOpenTypistAnalytics?: () => void;
  onLoadReport: (report: MedicalReport) => void;
  onRestoreRevision?: (report: MedicalReport, revision: ReportRevision) => void;
  onDeleteReport: (id: string) => void;
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
  if (!str) return '';
  return str
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .trim();
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
  const isLeap = (((((year - 474) % 2820) + 474 + 38) * 682) % 2816) < 682;
  return isLeap ? 30 : 29;
}

// Normalize a Jalali date string like "1404/8/5" or "۱۴۰۴/۰۸/۰۵" into "YYYY/MM/DD"
const toComparableJalaliDate = (raw: string): string => {
  const norm = toEnglishDigits(raw).replace(/-/g, '/');
  const parts = norm.split('/').filter(Boolean);
  if (parts.length < 3) return norm;
  const y = parts[0].padStart(4, '0');
  const m = parts[1].padStart(2, '0');
  const d = parts[2].padStart(2, '0');
  return `${y}/${m}/${d}`;
};

// Reusable compact Persian Calendar Popover Input (identical to PatientHeader)
const CompactJalaliDateInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
  highlightedDatesSet?: Set<string>;
}> = ({ value, onChange, placeholder = 'همه تاریخ‌ها...', label, highlightedDatesSet }) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const todayJalali = getTodayJalaliParts();
  const [pickerYear, setPickerYear] = useState<number>(todayJalali.year);
  const [pickerMonth, setPickerMonth] = useState<number>(todayJalali.month);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenDatePicker = () => {
    const clean = toEnglishDigits(value || '');
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

  const daysInPickerMonth = getJalaliMonthDays(pickerYear, pickerMonth);
  const currentSelectedComp = value ? toComparableJalaliDate(value) : '';

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-[10px] font-bold text-slate-600 mb-1 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[9.5px] text-teal-600 font-semibold">تقویم شمسی</span>
        </label>
      )}
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onFocus={handleOpenDatePicker}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full text-xs pl-6 pr-8 py-1.5 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 bg-white text-left font-mono transition-all focus:outline-none"
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
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setShowDatePicker(false);
            }}
            title="پاک کردن تاریخ"
            className="absolute left-1.5 p-0.5 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Compact Floating Persian Calendar Popover (Same design & size as PatientHeader) */}
      {showDatePicker && (
        <div className="absolute left-0 mt-1 w-68 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 z-50 space-y-2.5 animate-scaleIn">
          {/* Quick Date Presets */}
          <div className="flex items-center gap-1 pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setShowDatePicker(false);
              }}
              className="flex-1 py-1 px-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition-colors cursor-pointer"
            >
              همه
            </button>
            <button
              type="button"
              onClick={() => {
                const today = getTodayJalaliParts();
                onChange(today.formatted);
                setShowDatePicker(false);
              }}
              className="flex-1 py-1 px-1.5 rounded-lg bg-teal-50 hover:bg-teal-600 text-teal-900 hover:text-white border border-teal-200 text-[10px] font-bold transition-colors cursor-pointer"
            >
              امروز
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(getRelativeJalaliDateFormatted(-1));
                setShowDatePicker(false);
              }}
              className="flex-1 py-1 px-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition-colors cursor-pointer"
            >
              دیروز
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(getRelativeJalaliDateFormatted(-2));
                setShowDatePicker(false);
              }}
              className="flex-1 py-1 px-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition-colors cursor-pointer"
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
              const formattedCandidate = `${pickerYear}/${String(pickerMonth).padStart(2, '0')}/${String(
                dNum
              ).padStart(2, '0')}`;
              const isSelectedDay = currentSelectedComp === formattedCandidate;
              const isTodayDay = todayJalali.formatted === formattedCandidate;
              const hasReportOnDay = highlightedDatesSet?.has(formattedCandidate);

              return (
                <button
                  key={dNum}
                  type="button"
                  onClick={() => {
                    onChange(formattedCandidate);
                    setShowDatePicker(false);
                  }}
                  className={`relative h-7 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center ${
                    isSelectedDay
                      ? 'bg-teal-600 text-white shadow-2xs scale-105'
                      : isTodayDay
                      ? 'bg-teal-50 text-teal-800 border border-teal-300'
                      : hasReportOnDay
                      ? 'bg-sky-50 text-slate-900 border border-sky-200 hover:bg-sky-100'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span>{dNum}</span>
                  {hasReportOnDay && !isSelectedDay && (
                    <span className="w-1 h-1 rounded-full bg-teal-600 absolute bottom-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const ReportHistoryDrawer: React.FC<ReportHistoryDrawerProps> = ({
  isOpen,
  onClose,
  reports,
  typists = [],
  doctors = [],
  onOpenTypistAnalytics,
  onLoadReport,
  onRestoreRevision,
  onDeleteReport,
}) => {
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  // Advanced Search Filters
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [findingsQuery, setFindingsQuery] = useState('');
  const [referringPhysicianQuery, setReferringPhysicianQuery] = useState('');
  const [filterModality, setFilterModality] = useState<Modality | 'all'>('all');
  const [filterTypistId, setFilterTypistId] = useState<string>('all');
  const [filterDoctorId, setFilterDoctorId] = useState<string>('all');
  const [filterGender, setFilterGender] = useState<'all' | 'female' | 'male'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'printed' | 'finalized'>('all');

  const [inspectingHistoryReport, setInspectingHistoryReport] = useState<MedicalReport | null>(null);

  const todayFormatted = useMemo(() => getTodayJalaliParts().formatted, []);

  // Set of comparable dates ("YYYY/MM/DD") that have saved reports
  const recordedDatesSet = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((rep) => {
      const raw = rep.patientInfo?.reportDate?.trim() || '';
      if (raw) {
        set.add(toComparableJalaliDate(raw));
      }
    });
    return set;
  }, [reports]);

  const isTodayReport = (rep: MedicalReport) => {
    const rDate = rep.patientInfo?.reportDate?.trim();
    if (rDate && toComparableJalaliDate(rDate) === toComparableJalaliDate(todayFormatted)) return true;
    if (rep.createdAt && rep.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10)) return true;
    return false;
  };

  const resetAllFilters = () => {
    setSearch('');
    setSelectedDate('');
    setDateFrom('');
    setDateTo('');
    setFindingsQuery('');
    setReferringPhysicianQuery('');
    setFilterModality('all');
    setFilterTypistId('all');
    setFilterDoctorId('all');
    setFilterGender('all');
    setFilterStatus('all');
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (selectedDate.trim()) count++;
    if (dateFrom.trim() || dateTo.trim()) count++;
    if (findingsQuery.trim()) count++;
    if (referringPhysicianQuery.trim()) count++;
    if (filterModality !== 'all') count++;
    if (filterTypistId !== 'all') count++;
    if (filterDoctorId !== 'all') count++;
    if (filterGender !== 'all') count++;
    if (filterStatus !== 'all') count++;
    return count;
  }, [
    search,
    selectedDate,
    dateFrom,
    dateTo,
    findingsQuery,
    referringPhysicianQuery,
    filterModality,
    filterTypistId,
    filterDoctorId,
    filterGender,
    filterStatus,
  ]);

  // Main filtered reports calculation
  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const repDateComp = toComparableJalaliDate(r.patientInfo?.reportDate || '');

      // 1. Exact Date Filter (from top compact date picker)
      if (selectedDate.trim()) {
        const targetComp = toComparableJalaliDate(selectedDate.trim());
        if (
          repDateComp !== targetComp &&
          !toEnglishDigits(r.patientInfo?.reportDate || '').includes(toEnglishDigits(selectedDate.trim()))
        ) {
          return false;
        }
      }

      // 2. Date Range Filter ("از تاریخ ... تا تاریخ ...")
      if (dateFrom.trim()) {
        const fromComp = toComparableJalaliDate(dateFrom.trim());
        if (repDateComp < fromComp) return false;
      }
      if (dateTo.trim()) {
        const toComp = toComparableJalaliDate(dateTo.trim());
        if (repDateComp > toComp) return false;
      }

      // 3. Modality Filter
      const mainModality = r.studies?.[0]?.modality || (r as any).modality;
      if (filterModality !== 'all' && mainModality !== filterModality) {
        if (!r.studies?.some((s) => s.modality === filterModality)) {
          return false;
        }
      }

      // 4. Typist Filter
      if (filterTypistId !== 'all') {
        const repTypistId = r.typistId || typists[0]?.id;
        if (repTypistId !== filterTypistId) return false;
      }

      // 5. Radiologist Doctor Filter
      if (filterDoctorId !== 'all') {
        if (r.doctorId !== filterDoctorId) return false;
      }

      // 6. Patient Gender Filter
      if (filterGender !== 'all') {
        if (r.patientInfo?.gender !== filterGender) return false;
      }

      // 7. Report Status Filter
      if (filterStatus !== 'all') {
        if (filterStatus === 'printed') {
          if (r.status !== 'printed' && !r.isLocked) return false;
        } else if (filterStatus === 'finalized') {
          if (r.status === 'printed' || r.isLocked) return false;
        }
      }

      // 8. Referring Physician Specific Filter
      if (referringPhysicianQuery.trim()) {
        const refQ = toEnglishDigits(referringPhysicianQuery.toLowerCase());
        const doc = toEnglishDigits((r.patientInfo?.referringPhysician || '').toLowerCase());
        if (!doc.includes(refQ)) return false;
      }

      // 9. Full-Text Medical Findings & Impression Search
      if (findingsQuery.trim()) {
        const fq = toEnglishDigits(findingsQuery.toLowerCase());
        const fullReportText = toEnglishDigits(
          (
            r.studies
              ?.map(
                (s) =>
                  `${s.titleAndTechnique || ''} ${s.findingsHtml || ''} ${s.impressionHtml || ''} ${
                    s.recommendationsHtml || ''
                  }`
              )
              .join(' ') || ''
          )
            .replace(/<[^>]+>/g, ' ')
            .toLowerCase()
        );
        if (!fullReportText.includes(fq)) return false;
      }

      // 10. Quick General Search (Patient name, National ID, Admission No, Physician, Title, Typist, Date)
      if (search.trim()) {
        const q = toEnglishDigits(search.toLowerCase());
        const name = (r.patientInfo?.fullName || '').toLowerCase();
        const nid = toEnglishDigits(r.patientInfo?.nationalId || '');
        const adm = toEnglishDigits((r.patientInfo?.admissionNumber || '').toLowerCase());
        const doc = (r.patientInfo?.referringPhysician || '').toLowerCase();
        const repDate = toEnglishDigits(r.patientInfo?.reportDate || '');
        const typName = (r.typistName || '').toLowerCase();
        const titles = (
          r.studies?.map((s) => s.titleAndTechnique).join(' ') ||
          (r as any).title ||
          ''
        ).toLowerCase();

        return (
          name.includes(q) ||
          nid.includes(q) ||
          adm.includes(q) ||
          doc.includes(q) ||
          repDate.includes(q) ||
          typName.includes(q) ||
          titles.includes(q)
        );
      }

      return true;
    });
  }, [
    reports,
    selectedDate,
    dateFrom,
    dateTo,
    filterModality,
    filterTypistId,
    filterDoctorId,
    filterGender,
    filterStatus,
    referringPhysicianQuery,
    findingsQuery,
    typists,
    search,
  ]);

  const [rendered, setRendered] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      setIsClosing(false);
    } else if (rendered) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setRendered(false);
        setIsClosing(false);
      }, 240);
      return () => clearTimeout(timer);
    }
  }, [isOpen, rendered]);

  const handleSmoothClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 220);
  };

  if (!rendered) return null;

  // Export archive as CSV
  const handleExportCsv = () => {
    if (filtered.length === 0) return;
    let csv =
      'شناسه,نام بیمار,کد ملی,سن,جنسیت,پزشک معالج,تاریخ گزارش,نوع تصویربرداری,تایپیست ثبت‌کننده,عنوان بررسی\n';
    filtered.forEach((r) => {
      const p = r.patientInfo;
      const mod = r.studies?.[0]?.modality || 'sonography';
      const title = (r.studies?.[0]?.titleAndTechnique || '').replace(/,/g, ' ');
      const typName =
        r.typistName || typists.find((t) => t.id === r.typistId)?.name || typists[0]?.name || '---';
      csv += `"${r.id}","${p.fullName}","${p.nationalId}","${p.age}","${p.gender}","${p.referringPhysician}","${p.reportDate}","${mod}","${typName}","${title}"\n`;
    });
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Archive_Reports_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      onClick={handleSmoothClose}
      className={`fixed inset-0 z-50 overflow-hidden flex justify-end transition-all duration-250 ${
        isClosing
          ? 'bg-slate-900/0 backdrop-blur-none opacity-0'
          : 'bg-slate-900/60 backdrop-blur-xs opacity-100'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isClosing ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100 animate-slideLeft'
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-900 text-white flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center shrink-0">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base">
                آرشیو پرونده‌ها و سوابق بیماران
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5">
                جستجو بر اساس مشخصات بیمار، تقویم شمسی و فیلترهای پیشرفته
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSmoothClose}
            className="h-8 px-2.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white border border-slate-700 hover:border-rose-500 flex items-center gap-1 text-xs font-bold shrink-0 transition-colors cursor-pointer"
          >
            <span>بستن</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Compact Top Search + Same Popover Date Picker as PatientHeader + Advanced Toggle */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2.5 shrink-0">
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجوی نام بیمار، کد ملی، پذیرش..."
                className="w-full text-xs pr-9 pl-7 py-1.5 rounded-xl border border-slate-200 bg-white focus:border-teal-500 focus:outline-none font-medium"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute left-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Compact Popover Jalali Date Picker (Exact same style & size as PatientHeader) */}
            <div className="w-40 shrink-0">
              <CompactJalaliDateInput
                value={selectedDate}
                onChange={(val) => {
                  setSelectedDate(val);
                  if (val) {
                    setDateFrom('');
                    setDateTo('');
                  }
                }}
                placeholder="انتخاب تاریخ..."
                highlightedDatesSet={recordedDatesSet}
              />
            </div>

            {/* Advanced Search Toggle Button */}
            <button
              type="button"
              onClick={() => setShowAdvancedSearch((prev) => !prev)}
              className={`h-8 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-colors cursor-pointer shrink-0 ${
                showAdvancedSearch
                  ? 'bg-teal-700 text-white border-teal-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>جستجوی پیشرفته</span>
              {activeFiltersCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="h-8 px-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                title="پاکسازی فیلترها"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Modality Filter Pills */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 p-0.5 bg-white rounded-xl border border-slate-200">
              {(['all', 'sonography', 'mri', 'ct'] as const).map((m) => {
                const label =
                  m === 'all'
                    ? 'همه روش‌ها'
                    : m === 'mri'
                    ? 'ام‌آر‌آی'
                    : m === 'ct'
                    ? 'سی‌تی‌اسکن'
                    : 'سونوگرافی';
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFilterModality(m)}
                    className={`py-1 px-2.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      filterModality === m
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setSelectedDate('');
                  setDateFrom('');
                  setDateTo('');
                }}
                className={`px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                  !selectedDate && !dateFrom && !dateTo
                    ? 'bg-teal-600 text-white border-teal-600 font-bold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                کل آرشیو ({reports.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(todayFormatted);
                  setDateFrom('');
                  setDateTo('');
                }}
                className={`px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                  selectedDate === todayFormatted
                    ? 'bg-teal-600 text-white border-teal-600 font-bold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                امروز
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(getRelativeJalaliDateFormatted(-1));
                  setDateFrom('');
                  setDateTo('');
                }}
                className={`px-2 py-1 rounded-lg border transition-colors cursor-pointer ${
                  selectedDate === getRelativeJalaliDateFormatted(-1)
                    ? 'bg-teal-600 text-white border-teal-600 font-bold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                دیروز
              </button>
            </div>
          </div>

          {/* Collapsible Advanced Search Drawer (Compact & Clean) */}
          {showAdvancedSearch && (
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2.5 animate-fadeIn">
              {/* Row 1: Date Range ("از تاریخ ... تا تاریخ ...") using the exact same compact popover calendar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <CompactJalaliDateInput
                  label="از تاریخ (شروع بازه):"
                  value={dateFrom}
                  onChange={(val) => {
                    setDateFrom(val);
                    if (val) setSelectedDate('');
                  }}
                  placeholder="1404/08/01"
                  highlightedDatesSet={recordedDatesSet}
                />
                <CompactJalaliDateInput
                  label="تا تاریخ (پایان بازه):"
                  value={dateTo}
                  onChange={(val) => {
                    setDateTo(val);
                    if (val) setSelectedDate('');
                  }}
                  placeholder={todayFormatted}
                  highlightedDatesSet={recordedDatesSet}
                />
              </div>

              {/* Row 2: Search inside Findings + Referring Physician */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    جستجو در متن یافته‌ها و تشخیص:
                  </label>
                  <input
                    type="text"
                    value={findingsQuery}
                    onChange={(e) => setFindingsQuery(e.target.value)}
                    placeholder="مثلاً: سنگ کلیه، کبد چرب، کیست..."
                    className="w-full text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    پزشک معالج ارجاع‌دهنده:
                  </label>
                  <input
                    type="text"
                    value={referringPhysicianQuery}
                    onChange={(e) => setReferringPhysicianQuery(e.target.value)}
                    placeholder="نام پزشک معالج..."
                    className="w-full text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 3: Radiologist, Typist, Gender & Status */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                    پزشک رادیولوژیست:
                  </label>
                  <select
                    value={filterDoctorId}
                    onChange={(e) => setFilterDoctorId(e.target.value)}
                    className="w-full text-xs py-1 px-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700"
                  >
                    <option value="all">همه پزشکان</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                    تایپیست ثبت‌کننده:
                  </label>
                  <select
                    value={filterTypistId}
                    onChange={(e) => setFilterTypistId(e.target.value)}
                    className="w-full text-xs py-1 px-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700"
                  >
                    <option value="all">همه تایپیست‌ها</option>
                    {typists.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">جنسیت:</label>
                  <select
                    value={filterGender}
                    onChange={(e) => setFilterGender(e.target.value as 'all' | 'female' | 'male')}
                    className="w-full text-xs py-1 px-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700"
                  >
                    <option value="all">همه</option>
                    <option value="female">زن</option>
                    <option value="male">مرد</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                    وضعیت گزارش:
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) =>
                      setFilterStatus(e.target.value as 'all' | 'printed' | 'finalized')
                    }
                    className="w-full text-xs py-1 px-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700"
                  >
                    <option value="all">همه</option>
                    <option value="printed">چاپ‌شده</option>
                    <option value="finalized">ذخیره عادی</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Current Filter Status & Actions Strip */}
        <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-700 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span className="font-semibold">
              {selectedDate
                ? `فیلتر تاریخ: [${selectedDate}]`
                : dateFrom || dateTo
                ? `بازه تاریخ: [${dateFrom || 'ابتدا'} تا ${dateTo || 'انتها'}]`
                : 'نمایش کل پرونده‌های آرشیو'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {onOpenTypistAnalytics && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTypistAnalytics();
                }}
                className="flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:text-sky-900 px-2 py-0.5 rounded-lg border border-sky-200 bg-sky-50 hover:bg-sky-100 transition-colors cursor-pointer"
              >
                <BarChart3 className="w-3 h-3" />
                <span>آمار تایپیست‌ها</span>
              </button>
            )}

            {filtered.length > 0 && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-teal-700 px-2 py-0.5 rounded-lg border border-slate-200 bg-white hover:border-teal-300 transition-colors cursor-pointer"
                title="خروجی فایل اکسل/CSV از نتایج فیلترشده"
              >
                <Download className="w-3 h-3" />
                <span>اکسل ({filtered.length})</span>
              </button>
            )}

            <span className="font-bold text-teal-900 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
              {filtered.length} پرونده
            </span>
          </div>
        </div>

        {/* Reports List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30 text-teal-600" />
              <p className="text-xs font-bold text-slate-700">
                هیچ پرونده‌ای با شرایط و تاریخ انتخابی یافت نشد.
              </p>
              <button
                type="button"
                onClick={resetAllFilters}
                className="mt-4 px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>نمایش کل آرشیو ({reports.length})</span>
              </button>
            </div>
          ) : (
            filtered.map((rep) => {
              const mainModality = rep.studies?.[0]?.modality || (rep as any).modality || 'sonography';
              const modalityFa =
                mainModality === 'mri'
                  ? 'ام‌آر‌آی'
                  : mainModality === 'ct'
                  ? 'سی‌تی‌اسکن'
                  : 'سونوگرافی';
              const studyCount = rep.studies?.length || 1;
              const displayTitle =
                rep.studies?.[0]?.titleAndTechnique || (rep as any).title || 'گزارش تصویربرداری';
              const matchedDoctor = doctors.find((d) => d.id === rep.doctorId);

              const isToday = isTodayReport(rep);

              return (
                <div
                  key={rep.id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-teal-400 p-4 space-y-2 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900">
                          {rep.patientInfo?.fullName || 'بیمار بدون نام'}
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                          {modalityFa}
                        </span>
                        {studyCount > 1 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {studyCount} تصویربرداری
                          </span>
                        )}
                        {isToday && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300">
                            ثبت امروز
                          </span>
                        )}
                        {(rep.status === 'printed' || rep.isLocked) && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300">
                            <Lock className="w-2.5 h-2.5 text-amber-700" />
                            <span>چاپ‌شده (قفل امنیتی)</span>
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 mt-1 font-mono flex items-center gap-2.5 flex-wrap">
                        <span>
                          کد ملی:{' '}
                          <strong className="text-slate-800">{rep.patientInfo?.nationalId || '---'}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          تاریخ گزارش:{' '}
                          <strong className="text-teal-900">{rep.patientInfo?.reportDate || '---'}</strong>
                        </span>
                        {matchedDoctor && (
                          <>
                            <span>•</span>
                            <span className="text-slate-700 font-sans font-semibold">
                              رادیولوژیست: {matchedDoctor.name}
                            </span>
                          </>
                        )}
                        {rep.patientInfo?.referringPhysician && (
                          <>
                            <span>•</span>
                            <span className="text-slate-600 font-sans truncate max-w-[160px]">
                              معالج: {rep.patientInfo.referringPhysician}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="text-xs text-slate-700 font-semibold mt-1.5 line-clamp-1 group-hover:text-teal-900 transition-colors">
                        {displayTitle}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteReport(rep.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="حذف از آرشیو"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-slate-400 font-mono">
                        پذیرش: {rep.patientInfo?.admissionNumber || 'ADM-001'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                        <UserCheck className="w-3 h-3 text-sky-600" />
                        <span>
                          تایپیست:{' '}
                          {rep.typistName ||
                            typists.find((t) => t.id === rep.typistId)?.name ||
                            typists[0]?.name ||
                            'ثبت‌شده'}
                        </span>
                      </span>

                      {rep.revisions && rep.revisions.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setInspectingHistoryReport(rep)}
                          className="inline-flex items-center gap-1 text-[10.5px] font-bold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200 transition-colors cursor-pointer"
                          title="مشاهده تاریخچه تغییرات و نسخه‌های قبلی این گزارش"
                        >
                          <History className="w-3 h-3 text-indigo-600" />
                          <span>تاریخچه نسخه‌ها ({rep.revisions.length})</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onLoadReport(rep);
                        onClose();
                      }}
                      className="text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 text-teal-200" />
                      <span>بارگذاری در ویرایشگر</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Version History Modal inside Drawer (Proposal #12) */}
        {inspectingHistoryReport && (
          <div className="fixed inset-0 z-[60] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scaleIn">
              <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-teal-400" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-black">
                      تاریخچه نسخه‌ها و اصلاحیه‌های گزارش ({inspectingHistoryReport.patientInfo?.fullName})
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      مشاهده تغییرات ثبت‌شده و امکان بازگردانی به هر نسخه قبلی
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectingHistoryReport(null)}
                  className="h-7 px-2.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>بستن</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-slate-50">
                {(inspectingHistoryReport.revisions || [])
                  .slice()
                  .reverse()
                  .map((rev, idx) => (
                    <div
                      key={rev.id || idx}
                      className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[11px] font-black">
                            نسخه {rev.version}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {rev.note || 'ثبت گزارش'}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            ({rev.savedAtFa})
                          </span>
                          <span className="text-[11px] bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded font-semibold">
                            تایپیست: {rev.typistName}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (onRestoreRevision) {
                              onRestoreRevision(inspectingHistoryReport, rev);
                            } else {
                              onLoadReport({
                                ...inspectingHistoryReport,
                                studies: rev.studies,
                              });
                            }
                            setInspectingHistoryReport(null);
                            onClose();
                          }}
                          className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[11px] font-bold cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>بارگذاری این نسخه</span>
                        </button>
                      </div>

                      {rev.studies?.map((st, sIdx) => (
                        <div key={st.id || sIdx} className="text-xs space-y-1">
                          <div className="font-bold text-slate-800">{st.titleAndTechnique}</div>
                          <div
                            className="text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100"
                            dangerouslySetInnerHTML={{ __html: st.findingsHtml }}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer info strip */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 px-5 shrink-0">
          <span>
            نمایش {filtered.length} مورد از {reports.length} پرونده موجود
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer"
          >
            بستن آرشیو
          </button>
        </div>
      </div>
    </div>
  );
};
