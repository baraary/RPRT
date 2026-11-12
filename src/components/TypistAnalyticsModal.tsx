import React, { useState, useMemo } from 'react';
import { Typist, MedicalReport } from '../types';
import {
  BarChart3,
  X,
  UserCheck,
  UserPlus,
  Trash2,
  Download,
  Calendar,
  CalendarDays,
  Clock,
  Award,
  Layers,
  FileText,
  Check,
  Users,
} from 'lucide-react';

interface TypistAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  typists: Typist[];
  activeTypistId: string;
  onSelectTypist: (typistId: string) => void;
  onAddTypist: (typist: Omit<Typist, 'id'>) => void;
  onDeleteTypist: (typistId: string) => void;
  reports: MedicalReport[];
}

type PeriodFilter = 'daily' | 'weekly' | 'monthly' | 'all';

const normalizeDigits = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1728))
    .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1584))
    .trim();
};

const TYPIST_COLOR_MAP: Record<
  string,
  { badge: string; bar: string; avatar: string; ring: string }
> = {
  sky: {
    badge: 'bg-sky-50 text-sky-800 border-sky-200',
    bar: 'bg-sky-600',
    avatar: 'bg-sky-600 text-white',
    ring: 'border-sky-500 bg-sky-50/40',
  },
  indigo: {
    badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    bar: 'bg-indigo-600',
    avatar: 'bg-indigo-600 text-white',
    ring: 'border-indigo-500 bg-indigo-50/40',
  },
  emerald: {
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    bar: 'bg-emerald-600',
    avatar: 'bg-emerald-600 text-white',
    ring: 'border-emerald-500 bg-emerald-50/40',
  },
  amber: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    bar: 'bg-amber-500',
    avatar: 'bg-amber-500 text-white',
    ring: 'border-amber-500 bg-amber-50/40',
  },
  rose: {
    badge: 'bg-rose-50 text-rose-800 border-rose-200',
    bar: 'bg-rose-600',
    avatar: 'bg-rose-600 text-white',
    ring: 'border-rose-500 bg-rose-50/40',
  },
  purple: {
    badge: 'bg-purple-50 text-purple-800 border-purple-200',
    bar: 'bg-purple-600',
    avatar: 'bg-purple-600 text-white',
    ring: 'border-purple-500 bg-purple-50/40',
  },
};

export const TypistAnalyticsModal: React.FC<TypistAnalyticsModalProps> = ({
  isOpen,
  onClose,
  typists,
  activeTypistId,
  onSelectTypist,
  onAddTypist,
  onDeleteTypist,
  reports,
}) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'manage'>('analytics');
  const [period, setPeriod] = useState<PeriodFilter>('daily');
  const [selectedSpecificDate, setSelectedSpecificDate] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('current');

  // New Typist form state (only name & color)
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('sky');

  // Compute current Persian dates
  const { todayFa, yesterdayFa, thisMonthFa } = useMemo(() => {
    const now = new Date();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let today = '۱۴۰۴/۰۸/۲۱';
    let yest = '۱۴۰۴/۰۸/۲۰';
    try {
      today = new Intl.DateTimeFormat('fa-IR-u-nu-latn').format(now);
      yest = new Intl.DateTimeFormat('fa-IR-u-nu-latn').format(yesterday);
    } catch {}
    const parts = today.split('/');
    const m = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : '';
    return { todayFa: today, yesterdayFa: yest, thisMonthFa: m };
  }, []);

  // Available distinct dates & months in saved reports
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => {
      const d = r.patientInfo?.reportDate?.trim();
      if (d) set.add(d);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [reports]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => {
      const d = r.patientInfo?.reportDate?.trim() || '';
      const parts = d.split('/');
      if (parts.length >= 2) set.add(`${parts[0]}/${parts[1]}`);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [reports]);

  // Filter reports by selected period (daily, weekly, monthly, all)
  const periodFilteredReports = useMemo(() => {
    const nowMs = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    const last7PersianDates = new Set<string>();
    for (let i = 0; i < 7; i++) {
      try {
        const dStr = new Intl.DateTimeFormat('fa-IR-u-nu-latn').format(
          new Date(nowMs - i * 24 * 60 * 60 * 1000)
        );
        last7PersianDates.add(normalizeDigits(dStr));
      } catch {}
    }

    return reports.filter((rep) => {
      const rDateNorm = normalizeDigits(rep.patientInfo?.reportDate || '');
      if (period === 'daily') {
        const target = normalizeDigits(selectedSpecificDate || todayFa);
        if (rDateNorm === target) return true;
        if (!selectedSpecificDate && rep.createdAt) {
          const repDay = rep.createdAt.slice(0, 10);
          const todayIsoDay = new Date().toISOString().slice(0, 10);
          if (repDay === todayIsoDay) return true;
        }
        return false;
      }

      if (period === 'weekly') {
        if (rep.createdAt) {
          const repTime = new Date(rep.createdAt).getTime();
          if (!isNaN(repTime) && nowMs - repTime <= sevenDaysMs) return true;
        }
        if (rDateNorm && last7PersianDates.has(rDateNorm)) return true;
        return false;
      }

      if (period === 'monthly') {
        const targetMonth = normalizeDigits(
          selectedMonth === 'current' ? thisMonthFa : selectedMonth
        );
        if (targetMonth && rDateNorm.startsWith(targetMonth)) return true;
        if (selectedMonth === 'current' && rep.createdAt) {
          if (rep.createdAt.slice(0, 7) === new Date().toISOString().slice(0, 7)) return true;
        }
        return false;
      }

      return true;
    });
  }, [reports, period, selectedSpecificDate, selectedMonth, todayFa, thisMonthFa]);

  // Aggregate per-typist statistics
  const typistStats = useMemo(() => {
    const statsMap = new Map<
      string,
      {
        typist: Typist;
        reportCount: number;
        studyCount: number;
        sonographyCount: number;
        mriCount: number;
        ctCount: number;
        lastReportDate: string;
      }
    >();

    typists.forEach((t) => {
      statsMap.set(t.id, {
        typist: t,
        reportCount: 0,
        studyCount: 0,
        sonographyCount: 0,
        mriCount: 0,
        ctCount: 0,
        lastReportDate: '---',
      });
    });

    const fallbackTypist = typists[0] || {
      id: 'typ-1',
      name: 'تایپیست پیش‌فرض',
      color: 'sky',
    };

    periodFilteredReports.forEach((rep) => {
      const tid = rep.typistId && statsMap.has(rep.typistId) ? rep.typistId : fallbackTypist.id;
      let entry = statsMap.get(tid);
      if (!entry) {
        entry = {
          typist: {
            id: tid,
            name: rep.typistName || fallbackTypist.name,
            color: 'sky',
          },
          reportCount: 0,
          studyCount: 0,
          sonographyCount: 0,
          mriCount: 0,
          ctCount: 0,
          lastReportDate: '---',
        };
        statsMap.set(tid, entry);
      }

      entry.reportCount += 1;
      const repStudies = rep.studies && rep.studies.length > 0 ? rep.studies : [];
      entry.studyCount += Math.max(1, repStudies.length);

      repStudies.forEach((s) => {
        if (s.modality === 'sonography') entry!.sonographyCount += 1;
        else if (s.modality === 'mri') entry!.mriCount += 1;
        else if (s.modality === 'ct') entry!.ctCount += 1;
      });

      if (entry.lastReportDate === '---' && rep.patientInfo?.reportDate) {
        entry.lastReportDate = rep.patientInfo.reportDate;
      }
    });

    return Array.from(statsMap.values()).sort(
      (a, b) => b.studyCount - a.studyCount || b.reportCount - a.reportCount
    );
  }, [typists, periodFilteredReports]);

  // All-time quick summary per typist (daily / weekly / monthly / total)
  const multiPeriodMatrix = useMemo(() => {
    const nowMs = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const normToday = normalizeDigits(todayFa);
    const normMonth = normalizeDigits(thisMonthFa);

    const last7PersianDates = new Set<string>();
    for (let i = 0; i < 7; i++) {
      try {
        const dStr = new Intl.DateTimeFormat('fa-IR-u-nu-latn').format(
          new Date(nowMs - i * 24 * 60 * 60 * 1000)
        );
        last7PersianDates.add(normalizeDigits(dStr));
      } catch {}
    }

    return typists.map((t) => {
      let dailyReports = 0;
      let dailyStudies = 0;
      let weeklyReports = 0;
      let weeklyStudies = 0;
      let monthlyReports = 0;
      let monthlyStudies = 0;
      let totalReports = 0;
      let totalStudies = 0;

      reports.forEach((rep) => {
        const repTypistId = rep.typistId || typists[0]?.id;
        if (repTypistId !== t.id) return;

        const sCount = Math.max(1, rep.studies?.length || 1);
        const rDateNorm = normalizeDigits(rep.patientInfo?.reportDate || '');
        const isToday =
          rDateNorm === normToday ||
          (rep.createdAt && rep.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10));
        const isWeek =
          (rep.createdAt && nowMs - new Date(rep.createdAt).getTime() <= sevenDaysMs) ||
          (rDateNorm && last7PersianDates.has(rDateNorm));
        const isMonth =
          (normMonth && rDateNorm.startsWith(normMonth)) ||
          (rep.createdAt && rep.createdAt.slice(0, 7) === new Date().toISOString().slice(0, 7));

        totalReports += 1;
        totalStudies += sCount;
        if (isToday) {
          dailyReports += 1;
          dailyStudies += sCount;
        }
        if (isWeek) {
          weeklyReports += 1;
          weeklyStudies += sCount;
        }
        if (isMonth) {
          monthlyReports += 1;
          monthlyStudies += sCount;
        }
      });

      return {
        typist: t,
        dailyReports,
        dailyStudies,
        weeklyReports,
        weeklyStudies,
        monthlyReports,
        monthlyStudies,
        totalReports,
        totalStudies,
      };
    });
  }, [typists, reports, todayFa, thisMonthFa]);

  if (!isOpen) return null;

  const totalPeriodReports = typistStats.reduce((acc, s) => acc + s.reportCount, 0);
  const totalPeriodStudies = typistStats.reduce((acc, s) => acc + s.studyCount, 0);
  const totalPeriodSono = typistStats.reduce((acc, s) => acc + s.sonographyCount, 0);
  const totalPeriodMri = typistStats.reduce((acc, s) => acc + s.mriCount, 0);
  const totalPeriodCt = typistStats.reduce((acc, s) => acc + s.ctCount, 0);

  const periodLabel =
    period === 'daily'
      ? `روزانه (${selectedSpecificDate || todayFa})`
      : period === 'weekly'
      ? 'هفتگی (۷ روز اخیر)'
      : period === 'monthly'
      ? `ماهانه (${selectedMonth === 'current' ? thisMonthFa : selectedMonth})`
      : 'کل دوره (تمام آرشیو)';

  const handleExportCsv = () => {
    let csv =
      'نام تایپیست,بازه زمانی,تعداد پرونده (بیمار),مجموع بررسی‌های تایپ‌شده,سونوگرافی,ام‌آر‌آی,سی‌تی‌اسکن,تعداد امروز,تعداد هفتگی,تعداد ماهانه,کل کارکرد\n';

    typistStats.forEach((st) => {
      const mat = multiPeriodMatrix.find((m) => m.typist.id === st.typist.id);
      csv += `"${st.typist.name}","${periodLabel}",${st.reportCount},${st.studyCount},${st.sonographyCount},${st.mriCount},${st.ctCount},${mat?.dailyReports || 0},${mat?.weeklyReports || 0},${mat?.monthlyReports || 0},${mat?.totalReports || 0}\n`;
    });

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Typists_Performance_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddTypist({
      name: newName.trim(),
      color: newColor,
    });
    setNewName('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-fadeSlideUp">
        {/* Header: Row 1 has Title + Always-Top-Left Close Button */}
        <div className="bg-slate-900 text-white shrink-0">
          <div className="px-4 sm:px-5 py-3.5 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/40 text-teal-300 flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base">
                  آمار عملکرد داخلی و مدیریت تایپیست‌ها
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5 truncate">
                  ثبت و شمارش روزانه، هفتگی و ماهانه گزارش‌های هر تایپیست (صرفاً جهت آمارگیری داخلی مرکز • بدون درج در برگه چاپی)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              title="بستن پنجره آمار تایپیست‌ها"
              className="h-9 px-3 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white border border-slate-700 hover:border-rose-500 flex items-center gap-1.5 text-xs font-bold shrink-0 transition-colors cursor-pointer"
            >
              <span>بستن</span>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Row 2: View Switcher Tabs + Active Typist Quick Selector */}
          <div className="px-4 sm:px-5 py-2.5 bg-slate-800/90 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
            {/* Switch between Analytics View & Typist Management */}
            <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('analytics')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-teal-500 text-slate-950 shadow-2xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>داشبورد آمار کارکرد</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('manage')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'manage'
                    ? 'bg-teal-500 text-slate-950 shadow-2xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>مدیریت تایپیست‌ها ({typists.length})</span>
              </button>
            </div>

            {/* Active Typist Quick Selector */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-teal-300 font-bold flex items-center gap-1 ml-1">
                <UserCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>تایپیست فعال:</span>
              </span>
              {typists.map((t) => {
                const active = t.id === activeTypistId;
                const cStyle = TYPIST_COLOR_MAP[t.color] || TYPIST_COLOR_MAP.sky;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSelectTypist(t.id)}
                    className={`h-7 px-2.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 border transition-all cursor-pointer ${
                      active
                        ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-xs'
                        : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-teal-500/60 hover:text-white'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        active ? 'bg-slate-950' : cStyle.bar
                      }`}
                    />
                    <span>{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {activeTab === 'analytics' ? (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/60">
            {/* Period Filter Tabs + Export CSV Button */}
            <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => setPeriod('daily')}
                  className={`h-8 px-3.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                    period === 'daily'
                      ? 'bg-teal-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>روزانه</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPeriod('weekly')}
                  className={`h-8 px-3.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                    period === 'weekly'
                      ? 'bg-teal-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>هفتگی (۷ روز اخیر)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPeriod('monthly')}
                  className={`h-8 px-3.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                    period === 'monthly'
                      ? 'bg-teal-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>ماهانه</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPeriod('all')}
                  className={`h-8 px-3.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                    period === 'all'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>کل دوره ({reports.length})</span>
                </button>
              </div>

              {/* Date / Month Sub-Selector when Daily or Monthly is active */}
              <div className="flex items-center gap-2">
                {period === 'daily' && (
                  <select
                    value={selectedSpecificDate}
                    onChange={(e) => setSelectedSpecificDate(e.target.value)}
                    className="h-8 text-xs px-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-800 focus:outline-none focus:border-teal-500"
                  >
                    <option value="">امروز ({todayFa})</option>
                    {availableDates.map((d) => (
                      <option key={d} value={d}>
                        تاریخ {d} {d === todayFa ? '(امروز)' : d === yesterdayFa ? '(دیروز)' : ''}
                      </option>
                    ))}
                  </select>
                )}

                {period === 'monthly' && (
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="h-8 text-xs px-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-800 focus:outline-none focus:border-teal-500"
                  >
                    <option value="current">ماه جاری ({thisMonthFa})</option>
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>
                        ماه {m}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="h-8 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="دانلود فایل اکسل (CSV) آمار کارکرد تایپیست‌ها"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>خروجی اکسل کارکرد</span>
                </button>
              </div>
            </div>

            {/* Summary KPI Cards for Selected Period */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                  <span>کل پرونده‌های بازه</span>
                  <FileText className="w-4 h-4 text-teal-600" />
                </div>
                <div className="text-xl font-black text-slate-900 mt-1">
                  {totalPeriodReports}{' '}
                  <span className="text-xs font-semibold text-slate-500">بیمار</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{periodLabel}</div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                  <span>مجموع بررسی‌های تایپ‌شده</span>
                  <Layers className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-xl font-black text-indigo-950 mt-1">
                  {totalPeriodStudies}{' '}
                  <span className="text-xs font-semibold text-slate-500">تصویربرداری</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  با احتساب چند بررسی در یک پرونده
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                  <span>تفکیک مدالیته بازه</span>
                  <BarChart3 className="w-4 h-4 text-sky-600" />
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                    سونو: {totalPeriodSono}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                    MRI: {totalPeriodMri}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    CT: {totalPeriodCt}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
                  <span>بیشترین ثبت در این بازه</span>
                  <Award className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-sm font-black text-slate-900 mt-1.5 truncate">
                  {totalPeriodReports > 0 && typistStats[0]
                    ? `${typistStats[0].typist.name} (${typistStats[0].studyCount} بررسی)`
                    : 'بدون ثبت در این بازه'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">بر اساس تعداد آیتم تصویربرداری</div>
              </div>
            </div>

            {/* Unified Multi-Period Comparison Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                <span className="text-xs font-bold">
                  جدول جامع کارکرد تایپیست‌ها (مقایسه روزانه، هفتگی، ماهانه و تفکیک مدالیته)
                </span>
                <span className="text-[11px] text-teal-300 font-semibold">{periodLabel}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 text-[11px]">
                      <th className="py-2.5 px-3 font-bold">نام تایپیست</th>
                      <th className="py-2.5 px-2.5 font-bold text-center bg-teal-50/70 text-teal-900">
                        پرونده در بازه
                      </th>
                      <th className="py-2.5 px-2.5 font-bold text-center bg-teal-50/70 text-teal-900">
                        بررسی در بازه
                      </th>
                      <th className="py-2.5 px-2.5 font-bold text-center">تفکیک مدالیته (بازه)</th>
                      <th className="py-2.5 px-2.5 font-bold text-center">امروز</th>
                      <th className="py-2.5 px-2.5 font-bold text-center">۷ روز اخیر</th>
                      <th className="py-2.5 px-2.5 font-bold text-center">ماه جاری</th>
                      <th className="py-2.5 px-2.5 font-bold text-center">کل آرشیو</th>
                      <th className="py-2.5 px-3 font-bold">سهم از کارکرد بازه</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {typistStats.map((st) => {
                      const cStyle = TYPIST_COLOR_MAP[st.typist.color] || TYPIST_COLOR_MAP.sky;
                      const mat = multiPeriodMatrix.find((m) => m.typist.id === st.typist.id);
                      const sharePercent =
                        totalPeriodStudies > 0
                          ? Math.round((st.studyCount / totalPeriodStudies) * 100)
                          : 0;
                      const isActive = st.typist.id === activeTypistId;

                      return (
                        <tr
                          key={st.typist.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            isActive ? 'bg-teal-50/30' : ''
                          }`}
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${cStyle.avatar}`}
                              >
                                {st.typist.name.slice(0, 1)}
                              </span>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{st.typist.name}</span>
                                {isActive && (
                                  <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                                    فعال
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-2.5 text-center font-black text-slate-900 bg-teal-50/40">
                            {st.reportCount}{' '}
                            <span className="text-[10px] font-normal text-slate-500">پرونده</span>
                          </td>

                          <td className="py-3 px-2.5 text-center font-black text-teal-800 bg-teal-50/40">
                            {st.studyCount}{' '}
                            <span className="text-[10px] font-normal text-teal-700">بررسی</span>
                          </td>

                          <td className="py-3 px-2.5 text-center">
                            <div className="inline-flex items-center gap-1">
                              <span
                                className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold"
                                title="سونوگرافی"
                              >
                                سونو: {st.sonographyCount}
                              </span>
                              <span
                                className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold"
                                title="ام‌آر‌آی"
                              >
                                MRI: {st.mriCount}
                              </span>
                              <span
                                className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold"
                                title="سی‌تی‌اسکن"
                              >
                                CT: {st.ctCount}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-2.5 text-center font-bold text-slate-700">
                            {mat?.dailyReports || 0}
                            <span className="text-[10px] text-slate-400 font-normal">
                              {' '}
                              ({mat?.dailyStudies || 0})
                            </span>
                          </td>

                          <td className="py-3 px-2.5 text-center font-bold text-slate-700">
                            {mat?.weeklyReports || 0}
                            <span className="text-[10px] text-slate-400 font-normal">
                              {' '}
                              ({mat?.weeklyStudies || 0})
                            </span>
                          </td>

                          <td className="py-3 px-2.5 text-center font-bold text-slate-700">
                            {mat?.monthlyReports || 0}
                            <span className="text-[10px] text-slate-400 font-normal">
                              {' '}
                              ({mat?.monthlyStudies || 0})
                            </span>
                          </td>

                          <td className="py-3 px-2.5 text-center font-black text-slate-900">
                            {mat?.totalReports || 0}
                            <span className="text-[10px] text-slate-400 font-normal">
                              {' '}
                              ({mat?.totalStudies || 0})
                            </span>
                          </td>

                          <td className="py-3 px-3 min-w-[130px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${cStyle.bar}`}
                                  style={{ width: `${sharePercent}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-mono font-bold text-slate-700 w-9 text-left">
                                {sharePercent}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* Manage Typists Tab (Only Name & Color) */
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/60">
            {/* Add New Typist Form */}
            <form
              onSubmit={handleAddSubmit}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3"
            >
              <div className="flex items-center gap-2 text-xs font-black text-slate-900">
                <UserPlus className="w-4 h-4 text-teal-600" />
                <span>افزودن تایپیست جدید</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    نام تایپیست:
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="مثلاً: خانم محمدی"
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    رنگ نشانگر در نمودار آمار:
                  </label>
                  <div className="flex items-center gap-1.5 py-1">
                    {(['sky', 'indigo', 'emerald', 'amber', 'rose', 'purple'] as const).map(
                      (col) => {
                        const c = TYPIST_COLOR_MAP[col];
                        return (
                          <button
                            key={col}
                            type="button"
                            onClick={() => setNewColor(col)}
                            className={`w-6 h-6 rounded-lg ${c.bar} flex items-center justify-center transition-transform cursor-pointer ${
                              newColor === col
                                ? 'scale-110 ring-2 ring-slate-900 ring-offset-1'
                                : 'opacity-65 hover:opacity-100'
                            }`}
                          >
                            {newColor === col && <Check className="w-3.5 h-3.5 text-white" />}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>ثبت تایپیست جدید</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Existing Typists List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {typists.map((t) => {
                const isActive = t.id === activeTypistId;
                const cStyle = TYPIST_COLOR_MAP[t.color] || TYPIST_COLOR_MAP.sky;
                return (
                  <div
                    key={t.id}
                    className={`p-3.5 rounded-2xl border bg-white flex items-center justify-between transition-all ${
                      isActive ? cStyle.ring : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl font-bold text-sm flex items-center justify-center ${cStyle.avatar}`}
                      >
                        {t.name.slice(0, 1)}
                      </div>
                      <div className="text-xs font-black text-slate-900">{t.name}</div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectTypist(t.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isActive ? '✓ تایپیست فعال' : 'انتخاب به عنوان فعال'}
                      </button>

                      {typists.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteTypist(t.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="حذف تایپیست"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between px-5 text-xs text-slate-600">
          <span>
            🔒 نام تایپیست صرفاً در آمار داخلی مرکز ذخیره می‌شود و هیچ‌گاه در فایل چاپی یا سربرگ بیمار نمایش داده نمی‌شود.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
