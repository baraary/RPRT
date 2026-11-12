import React, { useState, useMemo } from 'react';
import { MedicalReport, Modality, Typist } from '../types';
import {
  FolderOpen,
  X,
  Search,
  Trash2,
  Calendar,
  Clock,
  Download,
  CalendarDays,
  CalendarRange,
  Check,
  Filter,
  RotateCcw,
  UserCheck,
  BarChart3,
} from 'lucide-react';

interface ReportHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  reports: MedicalReport[];
  typists?: Typist[];
  onOpenTypistAnalytics?: () => void;
  onLoadReport: (report: MedicalReport) => void;
  onDeleteReport: (id: string) => void;
}

type TimeFilter = 'all' | 'daily' | 'monthly' | 'yearly';

// Persian/Arabic digit normalizer to standard ASCII digits
const normalizeDigits = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1728))
    .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1584))
    .trim();
};

export const ReportHistoryDrawer: React.FC<ReportHistoryDrawerProps> = ({
  isOpen,
  onClose,
  reports,
  typists = [],
  onOpenTypistAnalytics,
  onLoadReport,
  onDeleteReport,
}) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('daily');
  const [search, setSearch] = useState('');
  const [filterModality, setFilterModality] = useState<Modality | 'all'>('all');
  const [filterTypistId, setFilterTypistId] = useState<string>('all');

  // Specific Date Selection state for Daily tab
  const [selectedSpecificDate, setSelectedSpecificDate] = useState<string>('');
  const [customDateInput, setCustomDateInput] = useState<string>('');

  // Specific Month/Year Selection state
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Compute reference current Persian dates
  const { todayFa, yesterdayFa, thisMonthFa, thisYearFa } = useMemo(() => {
    const now = new Date();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let today = '۱۴۰۴/۰۸/۲۱';
    let yest = '۱۴۰۴/۰۸/۲۰';

    try {
      today = new Intl.DateTimeFormat('fa-IR-u-nu-latn').format(now);
      yest = new Intl.DateTimeFormat('fa-IR-u-nu-latn').format(yesterday);
    } catch {}

    const parts = today.split('/');
    const y = parts[0] || '';
    const m = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : '';

    return {
      todayFa: today,
      yesterdayFa: yest,
      thisMonthFa: m,
      thisYearFa: y,
    };
  }, []);

  // Extract all distinct dates available in the archive with report counts
  const availableDatesWithCounts = useMemo(() => {
    const map = new Map<string, number>();

    reports.forEach((rep) => {
      const date = rep.patientInfo?.reportDate?.trim() || '';
      if (date) {
        map.set(date, (map.get(date) || 0) + 1);
      }
    });

    // Convert to sorted array
    return Array.from(map.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [reports]);

  // Extract all distinct months available in the archive
  const availableMonthsWithCounts = useMemo(() => {
    const map = new Map<string, number>();

    reports.forEach((rep) => {
      const date = rep.patientInfo?.reportDate?.trim() || '';
      const parts = date.split('/');
      if (parts.length >= 2) {
        const ym = `${parts[0]}/${parts[1]}`;
        map.set(ym, (map.get(ym) || 0) + 1);
      }
    });

    return Array.from(map.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [reports]);

  // Extract all distinct years available in the archive
  const availableYearsWithCounts = useMemo(() => {
    const map = new Map<string, number>();

    reports.forEach((rep) => {
      const date = rep.patientInfo?.reportDate?.trim() || '';
      const parts = date.split('/');
      if (parts.length >= 1 && parts[0]) {
        const y = parts[0];
        map.set(y, (map.get(y) || 0) + 1);
      }
    });

    return Array.from(map.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => b.year.localeCompare(a.year));
  }, [reports]);

  // Helper to check if a report belongs to today
  const isTodayReport = (rep: MedicalReport) => {
    const rDate = rep.patientInfo?.reportDate?.trim();
    if (rDate && normalizeDigits(rDate) === normalizeDigits(todayFa)) return true;
    if (rep.createdAt && rep.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10)) return true;
    return false;
  };

  // Helper to check if a report belongs to a specific date
  const matchesSpecificDate = (rep: MedicalReport, targetDate: string) => {
    if (!targetDate) return true;
    const normTarget = normalizeDigits(targetDate);
    const rDate = normalizeDigits(rep.patientInfo?.reportDate || '');
    if (rDate.includes(normTarget)) return true;

    // Also match against createdAt ISO
    if (rep.createdAt && normalizeDigits(rep.createdAt).includes(normTarget)) return true;
    return false;
  };

  // Helper to check if a report belongs to this month
  const isThisMonthReport = (rep: MedicalReport) => {
    const rDate = rep.patientInfo?.reportDate?.trim() || '';
    if (thisMonthFa && normalizeDigits(rDate).startsWith(normalizeDigits(thisMonthFa))) return true;
    if (rep.createdAt && rep.createdAt.slice(0, 7) === new Date().toISOString().slice(0, 7)) return true;
    return false;
  };

  // Helper to check if a report belongs to this year
  const isThisYearReport = (rep: MedicalReport) => {
    const rDate = rep.patientInfo?.reportDate?.trim() || '';
    if (thisYearFa && normalizeDigits(rDate).startsWith(normalizeDigits(thisYearFa))) return true;
    if (rep.createdAt && rep.createdAt.slice(0, 4) === new Date().toISOString().slice(0, 4)) return true;
    return false;
  };

  // Main filtered reports calculation
  const filtered = useMemo(() => {
    return reports.filter((r) => {
      // 1. Time / Date Filter
      if (timeFilter === 'daily') {
        // If a specific date was chosen from dropdown or input
        const activeTargetDate = customDateInput.trim() || selectedSpecificDate;
        if (activeTargetDate) {
          if (!matchesSpecificDate(r, activeTargetDate)) return false;
        } else {
          // If no specific date selected, default daily view shows today's reports
          // (or if none today, still allow doctor to view all or pick)
          if (!isTodayReport(r)) return false;
        }
      } else if (timeFilter === 'monthly') {
        if (selectedMonth && selectedMonth !== 'all') {
          const rDate = normalizeDigits(r.patientInfo?.reportDate || '');
          if (!rDate.startsWith(normalizeDigits(selectedMonth))) return false;
        } else {
          if (!isThisMonthReport(r)) return false;
        }
      } else if (timeFilter === 'yearly') {
        if (selectedYear && selectedYear !== 'all') {
          const rDate = normalizeDigits(r.patientInfo?.reportDate || '');
          if (!rDate.startsWith(normalizeDigits(selectedYear))) return false;
        } else {
          if (!isThisYearReport(r)) return false;
        }
      }

      // 2. Modality Filter
      const mainModality = r.studies?.[0]?.modality || (r as any).modality;
      if (filterModality !== 'all' && mainModality !== filterModality) {
        if (!r.studies?.some((s) => s.modality === filterModality)) {
          return false;
        }
      }

      // 2.5 Typist Filter
      if (filterTypistId !== 'all') {
        const repTypistId = r.typistId || typists[0]?.id;
        if (repTypistId !== filterTypistId) return false;
      }

      // 3. Search Filter (Patient name, National ID, Admission No, Physician, Title, Typist)
      if (search.trim()) {
        const q = normalizeDigits(search.toLowerCase());
        const name = (r.patientInfo?.fullName || '').toLowerCase();
        const nid = normalizeDigits(r.patientInfo?.nationalId || '');
        const adm = (r.patientInfo?.admissionNumber || '').toLowerCase();
        const doc = (r.patientInfo?.referringPhysician || '').toLowerCase();
        const typName = (r.typistName || '').toLowerCase();
        const titles = (r.studies?.map((s) => s.titleAndTechnique).join(' ') || (r as any).title || '').toLowerCase();

        return (
          name.includes(q) ||
          nid.includes(q) ||
          adm.includes(q) ||
          doc.includes(q) ||
          typName.includes(q) ||
          titles.includes(q)
        );
      }

      return true;
    });
  }, [
    reports,
    timeFilter,
    selectedSpecificDate,
    customDateInput,
    selectedMonth,
    selectedYear,
    filterModality,
    filterTypistId,
    typists,
    search,
    todayFa,
    thisMonthFa,
    thisYearFa,
  ]);

  if (!isOpen) return null;

  // Export archive as CSV
  const handleExportCsv = () => {
    if (filtered.length === 0) return;
    let csv = 'شناسه,نام بیمار,کد ملی,سن,جنسیت,پزشک معالج,تاریخ گزارش,نوع تصویربرداری,تایپیست ثبت‌کننده,عنوان بررسی\n';
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
    link.download = `Archive_Reports_${timeFilter}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activeDailyDateLabel = customDateInput.trim() || selectedSpecificDate || todayFa;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-slideLeft">
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
                جستجو و فیلتر دقیق بر اساس تاریخ روز، ماه، سال و مشخصات بیمار
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-2.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white border border-slate-700 hover:border-rose-500 flex items-center gap-1 text-xs font-bold shrink-0 transition-colors cursor-pointer"
          >
            <span>بستن</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TIME FILTER TABS (Daily, Monthly, Yearly, All) */}
        <div className="bg-slate-100 p-2 border-b border-slate-200">
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
            <button
              onClick={() => {
                setTimeFilter('daily');
              }}
              className={`py-2 px-2 rounded-lg text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all ${
                timeFilter === 'daily'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>روزانه (بر اساس روز)</span>
            </button>

            <button
              onClick={() => {
                setTimeFilter('monthly');
              }}
              className={`py-2 px-2 rounded-lg text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all ${
                timeFilter === 'monthly'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>ماهانه (بر اساس ماه)</span>
            </button>

            <button
              onClick={() => {
                setTimeFilter('yearly');
              }}
              className={`py-2 px-2 rounded-lg text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all ${
                timeFilter === 'yearly'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>سالانه (بر اساس سال)</span>
            </button>

            <button
              onClick={() => {
                setTimeFilter('all');
              }}
              className={`py-2 px-2 rounded-lg text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all ${
                timeFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>کل آرشیو ({reports.length})</span>
            </button>
          </div>
        </div>

        {/* DEDICATED SPECIFIC DATE / TIME CONTROL SECTION */}
        {timeFilter === 'daily' && (
          <div className="bg-teal-50/60 p-3.5 border-b border-teal-200/80 space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-teal-700" />
                <span>انتخاب روز به‌خصوص برای مشاهده پرونده‌ها:</span>
              </span>
              <span className="text-[11px] font-mono text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded-md">
                امروز: {todayFa}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Dropdown of available recorded dates */}
              <div>
                <label className="block text-[10px] font-semibold text-teal-900 mb-1">
                  انتخاب از روزهای دارای پرونده در سامانه:
                </label>
                <select
                  value={selectedSpecificDate}
                  onChange={(e) => {
                    setSelectedSpecificDate(e.target.value);
                    setCustomDateInput('');
                  }}
                  className="w-full text-xs py-1.5 px-2.5 rounded-xl border border-teal-300 bg-white text-slate-800 focus:outline-none focus:border-teal-600 shadow-2xs"
                >
                  <option value="">امروز ({todayFa})</option>
                  {availableDatesWithCounts.map(({ date, count }) => (
                    <option key={date} value={date}>
                      {date} {date === todayFa ? '(امروز)' : date === yesterdayFa ? '(دیروز)' : ''} ({count} پرونده)
                    </option>
                  ))}
                </select>
              </div>

              {/* Direct date search or manual date input */}
              <div>
                <label className="block text-[10px] font-semibold text-teal-900 mb-1">
                  یا جستجوی دستی تاریخ یک روز خاص:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customDateInput}
                    onChange={(e) => {
                      setCustomDateInput(e.target.value);
                      if (e.target.value) setSelectedSpecificDate('');
                    }}
                    placeholder="مثال: ۱۴۰۴/۰۸/۱۸ یا 1404/08/18"
                    className="w-full text-xs py-1.5 pr-3 pl-7 rounded-xl border border-teal-300 bg-white text-slate-800 focus:outline-none focus:border-teal-600 shadow-2xs font-mono"
                    dir="ltr"
                  />
                  {customDateInput && (
                    <button
                      onClick={() => setCustomDateInput('')}
                      className="absolute left-2 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick date shortcuts */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
              <span className="text-[10px] text-slate-500">میانبرهای روز:</span>
              <button
                onClick={() => {
                  setSelectedSpecificDate('');
                  setCustomDateInput('');
                }}
                className={`px-2.5 py-0.5 rounded-lg border transition-colors ${
                  !selectedSpecificDate && !customDateInput
                    ? 'bg-teal-700 text-white border-teal-700 font-bold'
                    : 'bg-white text-teal-800 border-teal-200 hover:bg-teal-100'
                }`}
              >
                امروز
              </button>

              <button
                onClick={() => {
                  setSelectedSpecificDate(yesterdayFa);
                  setCustomDateInput('');
                }}
                className={`px-2.5 py-0.5 rounded-lg border transition-colors ${
                  selectedSpecificDate === yesterdayFa
                    ? 'bg-teal-700 text-white border-teal-700 font-bold'
                    : 'bg-white text-teal-800 border-teal-200 hover:bg-teal-100'
                }`}
              >
                دیروز ({yesterdayFa})
              </button>

              {availableDatesWithCounts
                .filter((d) => d.date !== todayFa && d.date !== yesterdayFa)
                .slice(0, 3)
                .map(({ date, count }) => (
                  <button
                    key={date}
                    onClick={() => {
                      setSelectedSpecificDate(date);
                      setCustomDateInput('');
                    }}
                    className={`px-2 py-0.5 rounded-lg border transition-colors font-mono ${
                      selectedSpecificDate === date
                        ? 'bg-teal-700 text-white border-teal-700 font-bold'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-teal-50'
                    }`}
                  >
                    {date} ({count})
                  </button>
                ))}

              {(selectedSpecificDate || customDateInput) && (
                <button
                  onClick={() => {
                    setSelectedSpecificDate('');
                    setCustomDateInput('');
                  }}
                  className="mr-auto text-teal-700 hover:text-teal-900 font-bold flex items-center gap-0.5 text-[10px]"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>بازگشت به امروز</span>
                </button>
              )}
            </div>
          </div>
        )}

        {timeFilter === 'monthly' && (
          <div className="bg-sky-50/70 p-3.5 border-b border-sky-200 space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-sky-700" />
                <span>فیلتر پرونده‌ها بر اساس ماه:</span>
              </span>
              <span className="text-[11px] font-mono text-sky-800 bg-sky-100 px-2 py-0.5 rounded-md">
                ماه جاری: {thisMonthFa}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs py-1.5 px-3 rounded-xl border border-sky-300 bg-white text-slate-800 focus:outline-none focus:border-sky-600 flex-1 shadow-2xs"
              >
                <option value="all">ماه جاری ({thisMonthFa})</option>
                {availableMonthsWithCounts.map(({ month, count }) => (
                  <option key={month} value={month}>
                    ماه {month} ({count} پرونده)
                  </option>
                ))}
              </select>

              <button
                onClick={() => setSelectedMonth('all')}
                className="text-xs font-semibold px-3 py-1.5 bg-sky-200/80 hover:bg-sky-300 text-sky-900 rounded-xl"
              >
                ماه جاری
              </button>
            </div>
          </div>
        )}

        {timeFilter === 'yearly' && (
          <div className="bg-indigo-50/70 p-3.5 border-b border-indigo-200 space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <CalendarRange className="w-4 h-4 text-indigo-700" />
                <span>فیلتر پرونده‌ها بر اساس سال:</span>
              </span>
              <span className="text-[11px] font-mono text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-md">
                سال جاری: {thisYearFa}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="text-xs py-1.5 px-3 rounded-xl border border-indigo-300 bg-white text-slate-800 focus:outline-none focus:border-indigo-600 flex-1 shadow-2xs"
              >
                <option value="all">سال جاری ({thisYearFa})</option>
                {availableYearsWithCounts.map(({ year, count }) => (
                  <option key={year} value={year}>
                    سال {year} ({count} پرونده)
                  </option>
                ))}
              </select>

              <button
                onClick={() => setSelectedYear('all')}
                className="text-xs font-semibold px-3 py-1.5 bg-indigo-200/80 hover:bg-indigo-300 text-indigo-900 rounded-xl"
              >
                سال جاری
              </button>
            </div>
          </div>
        )}

        {/* Secondary Filter & Search Bar */}
        <div className="p-3.5 bg-white border-b border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* Modality Selector */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              {(['all', 'mri', 'ct', 'sonography'] as const).map((m) => {
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
                    onClick={() => setFilterModality(m)}
                    className={`py-1 px-2.5 rounded-lg text-xs font-semibold transition-colors ${
                      filterModality === m ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Typist Filter & Export CSV buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {typists.length > 0 && (
                <select
                  value={filterTypistId}
                  onChange={(e) => setFilterTypistId(e.target.value)}
                  className="text-[11px] font-bold py-1 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:border-teal-500"
                >
                  <option value="all">همه تایپیست‌ها</option>
                  {typists.map((t) => (
                    <option key={t.id} value={t.id}>
                      تایپیست: {t.name}
                    </option>
                  ))}
                </select>
              )}

              {onOpenTypistAnalytics && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenTypistAnalytics();
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:text-sky-900 px-2.5 py-1 rounded-lg border border-sky-200 bg-sky-50 hover:bg-sky-100 transition-colors cursor-pointer"
                  title="مشاهده آمار کارکرد روزانه، هفتگی و ماهانه تایپیست‌ها"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>آمار تایپیست‌ها</span>
                </button>
              )}

              {filtered.length > 0 && (
                <button
                  onClick={handleExportCsv}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-teal-700 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50 transition-colors cursor-pointer"
                  title="خروجی فایل اکسل/CSV از آرشیو انتخاب‌شده"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>خروجی اکسل ({filtered.length})</span>
                </button>
              )}
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجوی بیمار با نام، کد ملی، شماره پذیرش، نام تایپیست یا پزشک معالج..."
              className="w-full text-xs pr-9 pl-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Current Filter Status Banner */}
        <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs text-slate-700">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-teal-600" />
            <span>
              {timeFilter === 'daily'
                ? `آرشیو روزانه: در حال نمایش پرونده‌های تاریخ [${activeDailyDateLabel}]`
                : timeFilter === 'monthly'
                ? `آرشیو ماهانه: در حال نمایش پرونده‌های [${selectedMonth === 'all' ? thisMonthFa : selectedMonth}]`
                : timeFilter === 'yearly'
                ? `آرشیو سالانه: در حال نمایش پرونده‌های سال [${selectedYear === 'all' ? thisYearFa : selectedYear}]`
                : 'در حال نمایش کل پرونده‌های سامانه'}
            </span>
          </div>

          <span className="font-bold text-teal-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
            {filtered.length} پرونده یافت شد
          </span>
        </div>

        {/* Reports List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {filtered.length === 0 ? (
            <div className="text-center py-14 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30 text-teal-600" />
              <p className="text-xs font-bold text-slate-700">هیچ پرونده‌ای برای این روز یا بازه زمانی یافت نشد.</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                {timeFilter === 'daily'
                  ? `برای تاریخ «${activeDailyDateLabel}» پرونده‌ای ثبت نشده است. می‌توانید تاریخ دیگری را از منوی بالا انتخاب کرده یا روی «کل آرشیو» کلیک کنید.`
                  : 'با تغییر فیلترها یا جستجو، پرونده‌های سایر تاریخ‌ها را مشاهده کنید.'}
              </p>
              <button
                onClick={() => {
                  setTimeFilter('all');
                  setSelectedSpecificDate('');
                  setCustomDateInput('');
                  setSearch('');
                }}
                className="mt-4 px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors inline-flex items-center gap-1"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>نمایش کل پرونده‌های سامانه</span>
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
              const displayTitle = rep.studies?.[0]?.titleAndTechnique || (rep as any).title || 'گزارش تصویربرداری';

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
                      </div>

                      <div className="text-xs text-slate-500 mt-1 font-mono flex items-center gap-3">
                        <span>کد ملی: <strong className="text-slate-800">{rep.patientInfo?.nationalId || '---'}</strong></span>
                        <span>•</span>
                        <span>تاریخ گزارش: <strong className="text-slate-800 text-teal-900">{rep.patientInfo?.reportDate || '---'}</strong></span>
                        {rep.patientInfo?.referringPhysician && (
                          <>
                            <span>•</span>
                            <span className="text-slate-600 truncate max-w-[150px]">
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
                      onClick={() => onDeleteReport(rep.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="حذف از آرشیو"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-3 flex-wrap">
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
                    </div>

                    <button
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

        {/* Footer info strip */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 px-5">
          <span>نمایش {filtered.length} مورد از {reports.length} پرونده موجود</span>
          <button
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
