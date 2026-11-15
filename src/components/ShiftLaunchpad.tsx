import React, { useState, useEffect } from 'react';
import {
  Modality,
  Doctor,
  Typist,
  AppSettings,
  MedicalTemplate,
  ModalityColors,
} from '../types';
import {
  Stethoscope,
  UserCheck,
  ArrowLeft,
  Settings,
  BarChart3,
  Check,
  Moon,
  Sun,
  FilePlus2,
  ShieldCheck,
  Pencil,
} from 'lucide-react';
import {
  DEFAULT_CLINIC_LOGO_DATA_URI,
  getOfficialClinicLogoDataUri,
  isOfficialClinicLogoUri,
} from '../services/typistUtils';

interface ShiftLaunchpadProps {
  settings: AppSettings;
  modality: Modality;
  onSelectModality: (mod: Modality) => void;
  modalityColors?: ModalityColors;
  doctors: Doctor[];
  activeDoctorId: string;
  onSelectDoctor: (id: string) => void;
  typists: Typist[];
  activeTypistId: string;
  onSelectTypist: (id: string) => void;
  templates: MedicalTemplate[];
  reportsCount: number;
  todayReportsCount: number;
  onEnterWorkspace: (selectedModality?: Modality) => void;
  onOpenDoctors: () => void;
  onOpenTypistAnalytics: () => void;
  onOpenTypistManage?: () => void;
  onOpenReports: () => void;
  onOpenSettings: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

/**
 * 1. Bespoke Medical SVG Icon: Convex Ultrasound Transducer Probe + Acoustic Sector Waves & Doppler Flow
 */
const UltrasoundProbeIcon: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Ergonomic Probe Cable & Neck */}
    <path
      d="M32 4V10"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
    {/* Probe Body (Convex Transducer Housing) */}
    <path
      d="M23 10H41L44 23C44 26.5 38.6 29 32 29C25.4 29 20 26.5 20 23L23 10Z"
      fill="currentColor"
      fillOpacity="0.18"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinejoin="round"
    />
    {/* Probe Grip Ridges */}
    <line x1="26" y1="15" x2="38" y2="15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="25" y1="19.5" x2="39" y2="19.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    {/* Convex Piezoelectric Acoustic Lens Cap */}
    <path
      d="M19 24.5C23 28.5 41 28.5 45 24.5"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
    {/* Sector Scan Boundary Lines */}
    <path
      d="M21 29L10 54"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray="3 3"
      opacity="0.75"
    />
    <path
      d="M43 29L54 54"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray="3 3"
      opacity="0.75"
    />
    {/* Expanding Ultrasonic Acoustic Wave Arcs */}
    <path
      d="M23 35.5C28 39 36 39 41 35.5"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
    />
    <path
      d="M18 43.5C25.8 48.5 38.2 48.5 46 43.5"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
    />
    <path
      d="M13 51.5C23.5 58 40.5 58 51 51.5"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
    />
    {/* Color Doppler Pulse Accent Dots */}
    <circle cx="28" cy="42" r="2" fill="currentColor" />
    <circle cx="36" cy="49" r="2" fill="currentColor" />
  </svg>
);

/**
 * 2. Bespoke Medical SVG Icon: Superconducting MRI Cylindrical Magnet Bore & Motorized Patient Couch
 */
const MriMagnetBoreIcon: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Outer MRI Cylindrical Magnet Gantry Housing */}
    <rect
      x="8"
      y="6"
      width="48"
      height="42"
      rx="14"
      fill="currentColor"
      fillOpacity="0.14"
      stroke="currentColor"
      strokeWidth="2.8"
    />
    {/* Gantry Base Pillars */}
    <path
      d="M14 46L10 56H54L50 46"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinejoin="round"
    />
    {/* Outer Magnetic Field Coil Ring */}
    <circle
      cx="32"
      cy="26"
      r="14.5"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeDasharray="4 2.5"
    />
    {/* Inner Illuminated Magnet Bore Tunnel */}
    <circle
      cx="32"
      cy="26"
      r="9.5"
      fill="currentColor"
      fillOpacity="0.22"
      stroke="currentColor"
      strokeWidth="2.8"
    />
    {/* Patient Head/Shoulders Silhouette Inside Bore */}
    <circle cx="32" cy="24" r="3" fill="currentColor" />
    {/* Motorized Patient Couch / Table Sliding Into Bore */}
    <path
      d="M22 49L26 31H38L42 49H22Z"
      fill="currentColor"
      fillOpacity="0.28"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinejoin="round"
    />
    <path
      d="M20 49H44V58H20V49Z"
      fill="currentColor"
      fillOpacity="0.18"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 3. Bespoke Medical SVG Icon: Helical CT Scanner Ring Gantry, Rotating X-Ray Tube & Axial Laser Crosshairs
 */
const CtScannerGantryIcon: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Circular CT Ring Gantry Frame */}
    <circle
      cx="32"
      cy="27"
      r="20"
      fill="currentColor"
      fillOpacity="0.14"
      stroke="currentColor"
      strokeWidth="2.8"
    />
    {/* High-Speed Rotating Detector Arc */}
    <path
      d="M17 17C21 11.5 27.5 9 34.5 9.5"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
    <path
      d="M47 37C43 42.5 36.5 45 29.5 44.5"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
    {/* CT Aperture Ring */}
    <circle
      cx="32"
      cy="27"
      r="11.5"
      fill="currentColor"
      fillOpacity="0.2"
      stroke="currentColor"
      strokeWidth="2.6"
    />
    {/* Axial Laser Crosshairs Inside Bore */}
    <line x1="32" y1="16" x2="32" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="21" y1="27" x2="26" y2="27" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="38" y1="27" x2="43" y2="27" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    {/* X-Ray Fan Beam Cone */}
    <path
      d="M32 17L26 30H38L32 17Z"
      fill="currentColor"
      fillOpacity="0.32"
    />
    {/* CT Gantry Pedestal Base & Patient Table */}
    <path
      d="M15 44L11 56H53L49 44"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinejoin="round"
    />
    <rect
      x="23"
      y="33"
      width="18"
      height="24"
      rx="3"
      fill="currentColor"
      fillOpacity="0.25"
      stroke="currentColor"
      strokeWidth="2.6"
    />
  </svg>
);

export const ShiftLaunchpad: React.FC<ShiftLaunchpadProps> = ({
  settings,
  modality,
  onSelectModality,
  modalityColors,
  doctors,
  activeDoctorId,
  onSelectDoctor,
  typists,
  activeTypistId,
  onSelectTypist,
  templates,
  onEnterWorkspace,
  onOpenDoctors,
  onOpenTypistAnalytics,
  onOpenTypistManage,
  onOpenSettings,
  darkMode = false,
  onToggleDarkMode,
}) => {
  const [launchingModality, setLaunchingModality] = useState<Modality | null>(null);

  const todayFa = React.useMemo(() => {
    try {
      return new Intl.DateTimeFormat('fa-IR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date());
    } catch {
      return '۱۴۰۴/۰۸/۲۴';
    }
  }, []);

  const currentDoctor = doctors.find((d) => d.id === activeDoctorId) || doctors[0];
  const currentTypist = typists.find((t) => t.id === activeTypistId) || typists[0];

  const defaultHexByModality: Record<Modality, string> = {
    sonography: '#0284c7',
    mri: '#4f46e5',
    ct: '#059669',
  };

  const activeModalityHex =
    modalityColors?.[modality] || defaultHexByModality[modality] || '#0284c7';

  // Official Clinic Vector Emblem colored dynamically by active modality
  const rawLogoUrl = settings.clinicLogoUrl || DEFAULT_CLINIC_LOGO_DATA_URI;
  const effectiveLogoUrl = isOfficialClinicLogoUri(rawLogoUrl)
    ? getOfficialClinicLogoDataUri(activeModalityHex)
    : rawLogoUrl;

  const triggerLaunchIntoModality = (targetMod: Modality) => {
    if (launchingModality) return;
    onSelectModality(targetMod);
    setLaunchingModality(targetMod);
    setTimeout(() => {
      onEnterWorkspace(targetMod);
    }, 620);
  };

  // Allow pressing Enter on the ShiftLaunchpad to immediately launch into the selected modality
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        triggerLaunchIntoModality(modality);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modality, launchingModality]);

  const modalityCards: Array<{
    id: Modality;
    title: string;
    enSubtitle: string;
    description: string;
    badgeText: string;
    icon: React.ReactNode;
    cardSelectedCls: string;
    cardIdleCls: string;
    iconBoxSelectedCls: string;
    iconBoxIdleCls: string;
    enterBtnSelectedCls: string;
    enterBtnIdleCls: string;
    accentHex: string;
    count: number;
  }> = [
    {
      id: 'sonography',
      title: 'سونوگرافی و داپلر رنگی',
      enSubtitle: 'ULTRASOUND & COLOR DOPPLER',
      description: 'شکم و لگن، تیروئید، پستان، بارداری، نسج نرم و داپلر عروق',
      badgeText: 'پروب کانوکس و لینیر',
      icon: <UltrasoundProbeIcon className="w-20 h-20 sm:w-22 sm:h-22" />,
      cardSelectedCls:
        'bg-gradient-to-br from-sky-600 via-sky-600 to-sky-800 text-white border-sky-400 shadow-[0_22px_48px_-12px_rgba(2,132,199,0.5)] ring-4 ring-sky-500/25 -translate-y-1',
      cardIdleCls:
        'bg-white/95 hover:bg-sky-50/60 text-slate-900 border-slate-200/90 hover:border-sky-300 shadow-sm hover:shadow-lg hover:-translate-y-0.5',
      iconBoxSelectedCls:
        'bg-white/20 text-white border-2 border-white/40 shadow-inner',
      iconBoxIdleCls:
        'bg-sky-50 text-sky-600 border-2 border-sky-200 group-hover:bg-sky-600 group-hover:text-white group-hover:border-sky-600',
      enterBtnSelectedCls:
        'bg-white text-sky-900 hover:bg-sky-50 shadow-sm',
      enterBtnIdleCls:
        'bg-sky-600 hover:bg-sky-700 text-white shadow-xs',
      accentHex: '#0284c7',
      count: templates.filter((t) => t.modality === 'sonography').length,
    },
    {
      id: 'mri',
      title: 'ام‌آر‌آی تخصصی (MRI)',
      enSubtitle: 'MAGNETIC RESONANCE IMAGING',
      description: 'مغز و اعصاب، ستون فقرات، مفاصل، شکم و لگن، پستان و MRCP',
      badgeText: 'میدان مغناطیسی ۱.۵ و ۳ تسلا',
      icon: <MriMagnetBoreIcon className="w-20 h-20 sm:w-22 sm:h-22" />,
      cardSelectedCls:
        'bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-900 text-white border-indigo-400 shadow-[0_22px_48px_-12px_rgba(79,70,229,0.5)] ring-4 ring-indigo-500/25 -translate-y-1',
      cardIdleCls:
        'bg-white/95 hover:bg-indigo-50/60 text-slate-900 border-slate-200/90 hover:border-indigo-300 shadow-sm hover:shadow-lg hover:-translate-y-0.5',
      iconBoxSelectedCls:
        'bg-white/20 text-white border-2 border-white/40 shadow-inner',
      iconBoxIdleCls:
        'bg-indigo-50 text-indigo-600 border-2 border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600',
      enterBtnSelectedCls:
        'bg-white text-indigo-950 hover:bg-indigo-50 shadow-sm',
      enterBtnIdleCls:
        'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs',
      accentHex: '#4f46e5',
      count: templates.filter((t) => t.modality === 'mri').length,
    },
    {
      id: 'ct',
      title: 'سی‌تی‌اسکن (CT Scan)',
      enSubtitle: 'COMPUTED TOMOGRAPHY & HRCT',
      description: 'ریه و قفسه سینه (HRCT)، مغز، سینوس‌ها، شکم و لگن و سی‌تی آنژیوگرافی',
      badgeText: 'مولتی‌اسلایس و مقاطع نازک',
      icon: <CtScannerGantryIcon className="w-20 h-20 sm:w-22 sm:h-22" />,
      cardSelectedCls:
        'bg-gradient-to-br from-emerald-600 via-emerald-600 to-emerald-800 text-white border-emerald-400 shadow-[0_22px_48px_-12px_rgba(5,150,105,0.5)] ring-4 ring-emerald-500/25 -translate-y-1',
      cardIdleCls:
        'bg-white/95 hover:bg-emerald-50/60 text-slate-900 border-slate-200/90 hover:border-emerald-300 shadow-sm hover:shadow-lg hover:-translate-y-0.5',
      iconBoxSelectedCls:
        'bg-white/20 text-white border-2 border-white/40 shadow-inner',
      iconBoxIdleCls:
        'bg-emerald-50 text-emerald-600 border-2 border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600',
      enterBtnSelectedCls:
        'bg-white text-emerald-950 hover:bg-emerald-50 shadow-sm',
      enterBtnIdleCls:
        'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs',
      accentHex: '#059669',
      count: templates.filter((t) => t.modality === 'ct').length,
    },
  ];

  const activeModalityName =
    modality === 'mri'
      ? 'ام‌آر‌آی تخصصی (MRI)'
      : modality === 'ct'
      ? 'سی‌تی‌اسکن (CT Scan)'
      : 'سونوگرافی و داپلر رنگی';

  const activePrimaryCtaCls =
    modality === 'mri'
      ? 'bg-gradient-to-l from-indigo-600 via-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-[0_14px_34px_-8px_rgba(79,70,229,0.55)] ring-2 ring-indigo-400/40'
      : modality === 'ct'
      ? 'bg-gradient-to-l from-emerald-600 via-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-[0_14px_34px_-8px_rgba(5,150,105,0.55)] ring-2 ring-emerald-400/40'
      : 'bg-gradient-to-l from-sky-600 via-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 shadow-[0_14px_34px_-8px_rgba(2,132,199,0.55)] ring-2 ring-sky-400/40';

  const launchingCard = modalityCards.find((c) => c.id === launchingModality);

  // Official Ceremonial Font Stack for Hospital Header Title
  const officialTitleFontStack =
    "'B Titr', 'BTitrBold', 'Lalezar', 'Noto Naskh Arabic', 'Amiri', 'Vazirmatn', serif";

  return (
    <div
      className={`min-h-screen flex flex-col justify-between medical-desk-canvas text-slate-900 select-none relative overflow-x-hidden ${
        darkMode ? 'dark-theme' : ''
      }`}
      dir="rtl"
    >
      {/* Animated Modality Entry Portal Overlay (Plays for 620ms when entering workspace) */}
      {launchingModality && launchingCard && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-slate-950/80 animate-fadeIn"
          dir="rtl"
        >
          <div className="relative max-w-md w-full bg-white rounded-3xl border-2 border-slate-200 p-8 text-center shadow-2xl space-y-5 animate-scaleIn overflow-hidden">
            {/* Animated Concentric Modality Waves */}
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
              <span
                className="absolute inset-0 rounded-full animate-ping opacity-25"
                style={{ backgroundColor: launchingCard.accentHex }}
              />
              <span
                className="absolute inset-2 rounded-full animate-pulse opacity-30 border-2"
                style={{ borderColor: launchingCard.accentHex }}
              />
              <div
                className="relative w-22 h-22 rounded-2xl flex items-center justify-center text-white shadow-xl transition-transform duration-500 scale-105"
                style={{ backgroundColor: launchingCard.accentHex }}
              >
                {launchingCard.icon}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-bold text-slate-400">
                در حال آماده‌سازی میز کار و برگه گزارش خام
              </div>
              <h3
                className="text-xl sm:text-2xl font-black text-slate-900"
                style={{ fontFamily: officialTitleFontStack }}
              >
                بخش {launchingCard.title}
              </h3>
              <p className="text-xs text-slate-600 font-semibold pt-1">
                پزشک: {currentDoctor?.name} · تایپیست: {currentTypist?.name}
              </p>
            </div>

            {/* Smooth Progress Sweep Bar */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 w-full animate-pulse"
                style={{ backgroundColor: launchingCard.accentHex }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Top Institutional Utility Bar (Clean, No Archive Clutter) */}
      <header className="w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-md z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs text-slate-600">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: activeModalityHex }}
            />
            <span className="font-bold text-slate-800">{todayFa}</span>
            <span className="hidden sm:inline text-slate-300" aria-hidden="true">
              |
            </span>
            <span className="hidden sm:inline text-slate-500 font-medium">
              پورتال رسمی ثبت و صدور گزارش‌های تصویربرداری
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenTypistAnalytics}
              className="h-8 px-3 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100/80 hover:bg-slate-200/70 border border-slate-200/80 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
              <span>آمار کارکرد شیفت</span>
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              className="h-8 px-3 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100/80 hover:bg-slate-200/70 border border-slate-200/80 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>تنظیمات مرکز</span>
            </button>

            {onToggleDarkMode && (
              <button
                type="button"
                onClick={onToggleDarkMode}
                className="h-8 w-8 rounded-xl text-slate-700 hover:text-slate-900 bg-slate-100/80 hover:bg-slate-200/70 border border-slate-200/80 inline-flex items-center justify-center transition-colors cursor-pointer"
                title={darkMode ? 'حالت روز' : 'حالت تاریک اتاق رادیولوژی'}
              >
                {darkMode ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-600" />
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Centered Launchpad Content */}
      <main className="flex-1 flex flex-col justify-center max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* 1. Large, Frameless Sculptural Hospital Emblem & Ceremonial Official Title */}
        <div className="text-center space-y-3">
          {/* Frameless Hospital Emblem with Ambient Modality Halo */}
          <div className="relative inline-flex items-center justify-center">
            <span
              className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full blur-2xl opacity-25 pointer-events-none transition-colors duration-500"
              style={{ backgroundColor: activeModalityHex }}
            />
            <img
              src={effectiveLogoUrl}
              alt={settings.clinicName || 'لوگوی بیمارستان'}
              referrerPolicy="no-referrer"
              className="relative w-32 h-36 sm:w-38 sm:h-42 object-contain transition-all duration-300 hover:scale-105"
              style={{
                filter: `drop-shadow(0 14px 24px ${activeModalityHex}45) drop-shadow(0 4px 8px rgba(15, 23, 42, 0.12))`,
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = DEFAULT_CLINIC_LOGO_DATA_URI;
              }}
            />
          </div>

          {/* Official Ceremonial Hospital Title */}
          <div className="space-y-1.5">
            <h1
              className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-normal leading-tight"
              style={{ fontFamily: officialTitleFontStack }}
            >
              {settings.clinicName || 'مرکز جامع تصویربرداری بیمارستان شفا'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-bold max-w-xl mx-auto">
              {settings.clinicSubtitle || 'بخش تخصصی رادیولوژی، سونوگرافی و داپلر، ام‌آر‌آی و سی‌تی‌اسکن'}
            </p>
          </div>
        </div>

        {/* 2. Three Large Color-Coded Modality Cards with Authentic Hardware Icons */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs sm:text-sm font-black text-slate-800">
              ۱. انتخاب بخش تصویربرداری (مدالیته):
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              با انتخاب هر کارت یا زدن دکمه «ورود به بخش»، وارد یک گزارش خام و خالی می‌شوید
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {modalityCards.map((card) => {
              const isSelected = modality === card.id;
              return (
                <div
                  key={card.id}
                  onClick={() => onSelectModality(card.id)}
                  onDoubleClick={() => triggerLaunchIntoModality(card.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      triggerLaunchIntoModality(card.id);
                    }
                  }}
                  className={`group rounded-3xl border-2 p-5 sm:p-6 text-right transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[200px] ${
                    isSelected ? card.cardSelectedCls : card.cardIdleCls
                  }`}
                >
                  <div className="space-y-3.5">
                    <div className="flex items-start justify-between gap-3">
                      {/* Authentic Modality Hardware SVG Icon Container (2x Larger Icon) */}
                      <div
                        className={`w-24 h-24 sm:w-26 sm:h-26 rounded-3xl flex items-center justify-center shrink-0 transition-all duration-200 ${
                          isSelected ? card.iconBoxSelectedCls : card.iconBoxIdleCls
                        }`}
                      >
                        {card.icon}
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {card.count.toLocaleString('fa-IR')} قالب آماده
                          </span>
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                              isSelected
                                ? 'bg-white text-slate-900 border-white shadow-xs'
                                : 'border-slate-300 text-transparent group-hover:border-slate-400'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        </div>
                        <span
                          className={`text-[10.5px] font-medium ${
                            isSelected ? 'text-white/85' : 'text-slate-400'
                          }`}
                        >
                          {card.badgeText}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h2
                        className="text-lg sm:text-xl font-black tracking-tight"
                        style={{ fontFamily: officialTitleFontStack }}
                      >
                        {card.title}
                      </h2>
                      <p
                        className={`text-[10.5px] font-mono font-semibold tracking-wider mt-0.5 ${
                          isSelected ? 'text-white/80' : 'text-slate-400'
                        }`}
                        dir="ltr"
                      >
                        {card.enSubtitle}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3.5 mt-3.5 border-t border-current/15 flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] leading-snug line-clamp-1 ${
                        isSelected ? 'text-white/95 font-medium' : 'text-slate-500'
                      }`}
                    >
                      {card.description}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerLaunchIntoModality(card.id);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 inline-flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                        isSelected ? card.enterBtnSelectedCls : card.enterBtnIdleCls
                      }`}
                    >
                      <span>ورود به بخش</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. Doctor & Typist Selection Grid (with Direct Edit Buttons) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {/* Active Doctor Selection Card */}
          <div className="bg-white/95 rounded-2xl border border-slate-200/90 p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-800">
                <Stethoscope className="w-4 h-4 text-teal-600" />
                <span>۲. انتخاب پزشک متخصص رادیولوژیست:</span>
              </div>
              <button
                type="button"
                onClick={onOpenDoctors}
                className="text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>افزودن / ویرایش پزشکان و مهر</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-0.5">
              {doctors.map((doc) => {
                const active = doc.id === activeDoctorId;
                return (
                  <div
                    key={doc.id}
                    onClick={() => onSelectDoctor(doc.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectDoctor(doc.id);
                      }
                    }}
                    className={`p-3 rounded-xl border text-right transition-all duration-150 cursor-pointer flex items-center justify-between gap-2 ${
                      active
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50/80 hover:bg-slate-100 text-slate-800 border-slate-200/90'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">{doc.name}</div>
                      <div
                        className={`text-[10.5px] truncate mt-0.5 ${
                          active ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {doc.specialty} · ن.پ: {doc.medicalCouncilId}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDoctor(doc.id);
                          onOpenDoctors();
                        }}
                        title="ویرایش مشخصات، تخصص و مهر این پزشک"
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          active
                            ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                            : 'text-slate-400 hover:text-teal-700 hover:bg-teal-50'
                        }`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {active && <Check className="w-4 h-4 text-teal-400 shrink-0" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Typist Selection Card */}
          <div className="bg-white/95 rounded-2xl border border-slate-200/90 p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-800">
                <UserCheck className="w-4 h-4 text-sky-600" />
                <span>۳. انتخاب تایپیست شیفت:</span>
              </div>
              <button
                type="button"
                onClick={() => (onOpenTypistManage ? onOpenTypistManage() : onOpenTypistAnalytics())}
                className="text-xs font-bold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200/80 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>افزودن / ویرایش تایپیست‌ها</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-0.5">
              {typists.map((typ) => {
                const active = typ.id === activeTypistId;
                return (
                  <div
                    key={typ.id}
                    onClick={() => onSelectTypist(typ.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectTypist(typ.id);
                      }
                    }}
                    className={`p-3 rounded-xl border text-right transition-all duration-150 cursor-pointer flex items-center justify-between gap-1.5 ${
                      active
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50/80 hover:bg-slate-100 text-slate-800 border-slate-200/90'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">{typ.name}</div>
                      <div
                        className={`text-[10.5px] mt-0.5 ${
                          active ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        اپراتور تایپ
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTypist(typ.id);
                          if (onOpenTypistManage) {
                            onOpenTypistManage();
                          } else {
                            onOpenTypistAnalytics();
                          }
                        }}
                        title="ویرایش نام و رنگ این تایپیست"
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          active
                            ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                            : 'text-slate-400 hover:text-sky-700 hover:bg-sky-50'
                        }`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {active && <Check className="w-4 h-4 text-sky-400 shrink-0" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 4. Commanding Hero Launch CTA Bar */}
        <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-4 sm:p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-right w-full md:w-auto">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md"
              style={{ backgroundColor: activeModalityHex }}
            >
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="text-[11px] text-slate-400 font-medium">
                خلاصه شیفت انتخابی (ورود مستقیم به برگه گزارش خام و خالی):
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm flex-wrap">
                <strong className="text-white font-black">{activeModalityName}</strong>
                <span className="text-slate-600" aria-hidden="true">
                  |
                </span>
                <strong className="text-teal-300 font-bold">{currentDoctor?.name}</strong>
                <span className="text-slate-600" aria-hidden="true">
                  |
                </span>
                <span className="text-slate-300 font-semibold">تایپیست: {currentTypist?.name}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => triggerLaunchIntoModality(modality)}
            className={`w-full md:w-auto min-w-[290px] px-8 py-4 rounded-2xl text-white font-black text-sm sm:text-base inline-flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:scale-98 ${activePrimaryCtaCls}`}
          >
            <FilePlus2 className="w-5 h-5 shrink-0" />
            <span>ورود به محیط گزارش‌نویسی ({activeModalityName})</span>
            <ArrowLeft className="w-5 h-5 shrink-0" />
          </button>
        </div>
      </main>

      {/* Quiet Institutional Footer */}
      <footer className="w-full py-3 px-4 text-center text-[11px] text-slate-500 border-t border-slate-200/70 bg-white/50">
        <span>
          {settings.clinicName || 'مرکز جامع تصویربرداری بیمارستان شفا'} · {settings.clinicAddress} · تلفن:{' '}
          {settings.clinicPhone}
        </span>
      </footer>
    </div>
  );
};
