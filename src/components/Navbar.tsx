import React from 'react';
import { Modality, Doctor, Typist, ModalityColors } from '../types';
import {
  Wifi,
  WifiOff,
  User,
  Settings as SettingsIcon,
  ChevronDown,
  Moon,
  Sun,
  BarChart3,
  UserCheck,
  Monitor,
  Minimize2,
} from 'lucide-react';

interface NavbarProps {
  modality: Modality;
  onSelectModality: (modality: Modality) => void;
  modalityColors?: ModalityColors;
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
  desktopMode?: boolean;
  onToggleDesktopMode?: () => void;
  isOnline: boolean;
  onOpenDoctors: () => void;
  onOpenReports: () => void;
  onOpenSettings: () => void;
  onNewReport?: () => void;
  onPrintPreview?: () => void;
}

// Custom uploaded Radiology Vector Emblem (/public/assets/aistudio/Layer-1_64c7d528.svg)
// Uses fill="currentColor" so it dynamically adapts its color to the active modality!
const ModalityBrandLogo: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
  className = 'h-9 w-auto',
  style,
}) => (
  <svg
    version="1.0"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 1964.000000 2265.000000"
    preserveAspectRatio="xMidYMid meet"
    className={className}
    style={style}
    aria-label="نشان رادیورپورت"
  >
    <g
      transform="translate(0.000000,2265.000000) scale(0.100000,-0.100000)"
      fill="currentColor"
      stroke="none"
    >
      <path d="M9710 22603 c-89 -7 -227 -47 -325 -94 -325 -155 -526 -475 -528 -839 -1 -556 477 -988 1032 -931 231 24 417 116 581 288 363 379 341 979 -50 1335 -185 169 -458 262 -710 241z" />
      <path d="M9262 20408 c-9 -9 -12 -665 -12 -2890 l0 -2878 -22 -14 c-22 -13 -109 -29 -233 -41 -142 -14 -556 -99 -725 -150 -411 -122 -677 -224 -1004 -387 -663 -329 -1271 -796 -1767 -1358 -223 -252 -539 -684 -539 -735 0 -19 34 -48 183 -155 657 -472 1446 -1003 1932 -1300 31 -19 71 -44 88 -55 18 -12 111 -67 207 -124 96 -57 195 -116 220 -131 55 -34 235 -137 310 -178 30 -16 82 -44 115 -62 33 -18 74 -41 90 -50 104 -62 730 -369 800 -393 17 -5 35 -13 40 -17 13 -10 268 -113 375 -151 49 -18 94 -32 295 -96 189 -59 419 -96 595 -96 516 0 1229 277 2100 816 583 361 1303 892 1970 1451 344 289 450 384 450 405 0 18 -180 297 -286 442 -520 714 -1197 1305 -1969 1715 -367 195 -682 322 -1145 459 -169 51 -583 136 -725 150 -124 12 -211 28 -232 41 l-23 14 0 2878 c0 2225 -3 2881 -12 2890 -17 17 -1059 17 -1076 0z m917 -7058 c526 -60 1008 -404 1255 -896 194 -386 220 -861 71 -1277 -201 -559 -734 -988 -1315 -1057 -109 -13 -333 -13 -437 0 -289 36 -592 172 -828 370 -219 184 -420 480 -499 735 -64 207 -71 252 -71 510 0 255 8 310 66 495 23 70 23 71 68 172 145 329 430 625 761 792 130 66 371 140 509 156 97 11 323 11 420 0z" />
      <path d="M8519 19565 c-3 -2 -48 -9 -100 -15 -51 -5 -132 -17 -179 -25 -257 -46 -371 -68 -425 -80 -33 -8 -87 -19 -119 -26 -88 -17 -447 -108 -591 -150 -328 -96 -525 -164 -875 -299 -607 -236 -1247 -569 -1810 -944 -1565 -1040 -2792 -2489 -3549 -4189 -102 -231 -199 -467 -251 -617 -7 -19 -32 -91 -57 -160 -25 -69 -53 -153 -64 -187 -10 -35 -28 -93 -40 -130 -58 -186 -68 -224 -139 -498 -45 -177 -75 -312 -120 -545 -47 -242 -58 -309 -70 -400 -6 -47 -17 -130 -25 -185 -33 -224 -74 -728 -75 -902 0 -58 -3 -73 -15 -73 -13 0 -15 -40 -15 -299 0 -235 3 -300 13 -304 9 -3 16 -68 25 -248 23 -437 73 -845 158 -1304 14 -71 31 -155 39 -185 7 -30 16 -75 20 -100 4 -25 13 -67 21 -95 8 -27 30 -113 49 -190 20 -77 42 -167 51 -200 55 -217 228 -738 321 -964 19 -47 43 -106 53 -131 25 -65 49 -121 65 -155 8 -16 29 -64 46 -105 85 -202 251 -534 385 -774 24 -43 44 -80 44 -82 0 -6 179 -304 258 -428 896 -1419 2214 -2637 3692 -3415 206 -108 498 -250 640 -310 41 -18 82 -36 90 -40 9 -5 92 -39 185 -76 153 -60 199 -78 340 -132 68 -26 396 -134 482 -159 96 -28 228 -66 328 -93 161 -45 557 -134 669 -151 38 -6 72 -13 75 -15 7 -4 329 -55 501 -80 97 -14 288 -33 555 -56 324 -27 1119 -27 1445 1 252 21 441 40 550 56 168 23 494 75 501 79 3 2 37 9 75 15 174 26 643 140 945 228 142 42 483 155 579 192 30 12 78 30 105 40 73 27 325 128 360 145 17 8 64 29 105 46 150 63 498 233 695 339 732 393 1453 912 2045 1471 677 639 1191 1267 1668 2039 258 417 534 954 688 1340 19 47 39 94 44 105 19 41 97 242 110 283 5 15 21 59 35 97 32 87 114 335 145 435 12 41 31 102 41 135 69 229 201 793 229 980 6 39 17 106 25 150 52 287 115 865 115 1057 0 14 7 33 15 42 22 21 23 1000 1 1021 -9 9 -16 53 -20 132 -10 180 -25 360 -36 438 -5 39 -17 126 -25 195 -23 186 -72 492 -101 630 -48 232 -66 310 -79 360 -8 30 -28 111 -45 180 -93 376 -225 786 -382 1180 -17 41 -38 95 -48 120 -18 47 -76 181 -115 265 -13 28 -42 93 -66 145 -44 98 -228 465 -269 535 -13 22 -39 69 -58 105 -52 96 -233 397 -326 540 -635 981 -1426 1825 -2381 2542 -160 120 -491 348 -630 434 -27 17 -77 48 -110 68 -96 59 -270 162 -338 199 -34 19 -88 48 -119 65 -368 201 -932 454 -1325 593 -29 11 -77 28 -105 38 -87 32 -425 137 -548 171 -63 17 -126 35 -140 40 -69 25 -532 129 -730 165 -80 14 -179 32 -221 40 -128 24 -233 30 -245 14 -11 -14 -23 -672 -45 -2619 -5 -498 -12 -913 -15 -923 -12 -38 17 -49 226 -91 134 -27 308 -67 410 -96 99 -28 278 -80 345 -100 33 -10 119 -39 190 -65 72 -26 148 -53 170 -60 50 -16 310 -122 370 -150 17 -8 57 -26 90 -40 99 -44 385 -185 465 -230 41 -23 111 -62 155 -85 44 -24 91 -51 105 -60 14 -9 104 -66 200 -126 298 -185 614 -417 898 -662 145 -124 483 -441 529 -497 15 -18 77 -86 136 -150 393 -426 769 -952 1049 -1470 115 -212 285 -566 349 -727 11 -29 30 -75 41 -103 67 -169 136 -366 183 -520 15 -49 31 -103 37 -120 24 -72 129 -491 148 -590 6 -33 17 -89 25 -125 35 -162 90 -571 105 -780 26 -359 30 -437 29 -630 0 -196 -3 -264 -29 -620 -27 -363 -94 -774 -195 -1195 -51 -212 -185 -645 -250 -805 -7 -19 -34 -87 -59 -150 -84 -215 -164 -393 -285 -630 -79 -156 -216 -403 -265 -480 -13 -19 -54 -84 -92 -145 -72 -116 -95 -150 -208 -310 -715 -1017 -1715 -1870 -2836 -2422 -149 -73 -320 -153 -328 -153 -4 0 -20 -7 -36 -15 -41 -22 -226 -95 -386 -153 -338 -123 -708 -230 -1030 -297 -147 -30 -346 -66 -445 -80 -55 -7 -134 -18 -175 -24 -572 -79 -1362 -79 -1930 0 -41 6 -120 17 -175 24 -150 21 -419 72 -605 116 -355 83 -819 231 -1125 359 -55 23 -125 52 -155 65 -264 109 -707 342 -1005 529 -78 49 -387 256 -417 280 -14 11 -66 50 -115 86 -464 341 -988 849 -1364 1321 -63 79 -141 180 -173 224 -33 44 -71 96 -86 115 -44 59 -248 371 -337 515 -106 172 -290 523 -377 720 -15 33 -33 74 -41 90 -29 63 -88 202 -107 250 -152 391 -251 709 -342 1095 -42 177 -87 418 -111 595 -9 61 -20 137 -25 170 -5 33 -19 175 -31 315 -32 383 -30 880 5 1278 14 162 28 297 31 301 2 4 9 50 15 102 37 314 158 842 271 1189 9 30 22 71 27 90 18 62 98 281 155 425 445 1122 1175 2143 2102 2941 529 455 1183 872 1808 1153 26 11 66 30 90 40 53 25 109 48 167 71 25 10 74 30 110 45 36 14 83 33 105 40 22 7 99 34 170 60 72 26 157 55 190 65 33 10 101 30 150 45 100 30 135 39 315 84 289 72 537 121 763 150 31 4 61 12 66 17 6 5 4 104 -4 244 -8 129 -19 341 -25 470 -5 129 -17 354 -25 500 -9 146 -22 409 -30 585 -17 359 -28 590 -50 1000 -8 154 -20 383 -26 510 -6 128 -15 235 -21 242 -10 13 -50 18 -59 8z m-745 -1084 c123 -61 204 -170 227 -307 11 -60 10 -80 -5 -139 -31 -123 -107 -219 -220 -278 -58 -30 -67 -32 -171 -32 -104 0 -113 2 -170 32 -105 54 -180 143 -216 255 -24 76 -24 136 1 215 32 104 97 187 186 239 73 43 121 54 215 51 74 -3 96 -8 153 -36z m4394 19 c167 -59 276 -209 276 -380 0 -155 -83 -286 -229 -363 -56 -29 -67 -31 -165 -32 -98 0 -110 2 -172 32 -79 37 -141 96 -188 178 -35 60 -35 61 -35 185 0 120 1 127 30 175 66 112 133 170 239 207 70 24 172 23 244 -2z" />
      <path d="M4376 10768 c-13 -21 -75 -214 -124 -383 -37 -128 -83 -332 -126 -560 -66 -347 -97 -865 -78 -1293 7 -152 17 -306 22 -342 5 -36 17 -121 25 -190 26 -211 93 -540 152 -750 27 -95 104 -343 118 -380 7 -19 25 -69 40 -110 113 -311 346 -792 500 -1030 185 -287 216 -331 365 -525 222 -290 486 -567 815 -857 153 -135 446 -351 665 -489 239 -151 596 -343 628 -337 18 3 27 46 57 258 8 63 22 153 30 200 8 47 26 164 40 260 14 96 32 218 40 270 8 52 17 122 20 155 4 33 13 98 20 145 8 47 26 171 40 275 14 105 32 235 40 290 8 55 19 143 25 195 5 52 16 142 25 200 21 154 60 484 89 775 9 83 23 215 31 295 53 500 51 660 -11 896 -153 575 -655 1191 -1524 1870 -212 166 -500 367 -840 586 -183 118 -593 359 -795 468 -44 24 -115 63 -159 87 -89 49 -110 52 -130 21z" />
      <path d="M14933 10592 c-139 -103 -328 -243 -420 -312 -92 -68 -301 -223 -463 -344 -162 -121 -344 -256 -405 -301 -123 -91 -406 -301 -697 -518 -106 -79 -256 -190 -333 -248 -77 -57 -167 -122 -200 -144 -174 -118 -333 -322 -460 -589 -20 -44 -43 -98 -50 -120 -8 -23 -23 -68 -35 -101 -155 -443 -206 -1072 -140 -1750 20 -211 28 -273 75 -575 47 -302 138 -728 230 -1075 14 -55 30 -117 36 -138 5 -21 23 -84 40 -140 17 -56 37 -127 45 -157 8 -30 21 -73 29 -95 7 -22 39 -120 70 -217 31 -97 63 -182 70 -188 16 -13 42 0 265 124 660 367 1279 901 1740 1501 149 194 180 238 365 525 155 240 386 716 500 1030 15 41 33 91 40 110 106 284 229 799 270 1130 8 69 20 154 25 190 5 36 15 190 22 342 19 428 -12 946 -78 1293 -65 344 -122 568 -212 840 -30 88 -41 110 -57 112 -13 2 -113 -67 -272 -185z" />
    </g>
  </svg>
);

export const Navbar: React.FC<NavbarProps> = ({
  modality,
  onSelectModality,
  modalityColors,
  doctors,
  activeDoctorId,
  onSelectDoctor,
  typists,
  activeTypistId,
  onSelectTypist,
  onOpenTypistAnalytics,
  darkMode = false,
  onToggleDarkMode,
  desktopMode = false,
  onToggleDesktopMode,
  isOnline,
  onOpenDoctors,
  onOpenSettings,
}) => {
  const currentDoctor = doctors.find((d) => d.id === activeDoctorId) || doctors[0];
  const currentTypist = typists.find((t) => t.id === activeTypistId) || typists[0];

  const defaultHexByModality: Record<Modality, string> = {
    sonography: '#0284c7',
    mri: '#4f46e5',
    ct: '#059669',
  };

  const activeModalityHex =
    modalityColors?.[modality] || defaultHexByModality[modality] || '#0284c7';

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
      logoColor: string;
    }
  > = {
    sonography: {
      activeBtn: 'bg-sky-600 text-white border-sky-600 shadow-xs shadow-sky-600/25',
      inactiveBtn: 'text-slate-600 hover:text-sky-800 hover:bg-sky-50/90 border-transparent',
      dot: 'bg-sky-500',
      badge: 'text-sky-700 bg-sky-50 border-sky-200',
      logoColor: 'text-sky-600 drop-shadow-[0_1px_2px_rgba(2,132,199,0.25)]',
    },
    mri: {
      activeBtn: 'bg-indigo-600 text-white border-indigo-600 shadow-xs shadow-indigo-600/25',
      inactiveBtn: 'text-slate-600 hover:text-indigo-800 hover:bg-indigo-50/90 border-transparent',
      dot: 'bg-indigo-500',
      badge: 'text-indigo-700 bg-indigo-50 border-indigo-200',
      logoColor: 'text-indigo-600 drop-shadow-[0_1px_2px_rgba(79,70,229,0.25)]',
    },
    ct: {
      activeBtn: 'bg-emerald-600 text-white border-emerald-600 shadow-xs shadow-emerald-600/25',
      inactiveBtn: 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50/90 border-transparent',
      dot: 'bg-emerald-500',
      badge: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      logoColor: 'text-emerald-600 drop-shadow-[0_1px_2px_rgba(5,150,105,0.25)]',
    },
  };

  const activeModStyle = modalityStyles[modality];

  return (
    <header
      id="app-main-navbar"
      className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs no-print transition-colors duration-200"
    >
      {/* Single Clean Header Bar: Brand with Modality-Colored Custom Emblem, Modality Tabs, Status & Selectors */}
      <div className="w-full max-w-[1680px] 2xl:max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-2">
        <div className="flex items-center justify-between gap-3">
          {/* Logo & Brand (Uploaded SVG Emblem sized to match header bar & colored by active modality) */}
          <div className="flex items-center gap-2.5 shrink-0">
            <ModalityBrandLogo
              className={`h-9 sm:h-10 w-auto shrink-0 transition-colors duration-300 ${activeModStyle.logoColor}`}
              style={{ color: activeModalityHex }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm sm:text-base text-slate-900 tracking-tight whitespace-nowrap">
                  رادیورپورت
                </h1>
                <span
                  className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md border whitespace-nowrap transition-colors duration-300 ${activeModStyle.badge}`}
                  style={{
                    color: activeModalityHex,
                    borderColor: `${activeModalityHex}40`,
                    backgroundColor: `${activeModalityHex}12`,
                  }}
                >
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
              const mHex = modalityColors?.[m] || defaultHexByModality[m];
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => onSelectModality(m)}
                  style={
                    active
                      ? {
                          backgroundColor: mHex,
                          borderColor: mHex,
                          color: '#ffffff',
                        }
                      : undefined
                  }
                  className={`h-8 min-w-[100px] sm:min-w-[114px] px-3 rounded-lg inline-flex items-center justify-center gap-2 text-xs font-bold whitespace-nowrap border transition-all duration-200 active:scale-95 cursor-pointer ${
                    active ? mStyle.activeBtn : mStyle.inactiveBtn
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full transition-colors ${
                      active ? 'bg-white' : mStyle.dot
                    }`}
                    style={!active ? { backgroundColor: mHex } : undefined}
                  />
                  <span>{modalityNames[m]}</span>
                </button>
              );
            })}
          </div>

          {/* Left: Uniform Height (h-9) Controls: Desktop Mode, Settings Icon, Dark Mode, Online Status, Typist Selector, Doctor Selector */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Native Desktop Mode Button (Uses Fullscreen + WakeLock Browser APIs & Floating Toolbars/Panels) */}
            {onToggleDesktopMode && (
              <button
                type="button"
                onClick={onToggleDesktopMode}
                className={`h-9 px-2.5 rounded-xl inline-flex items-center justify-center gap-1.5 text-xs font-bold border whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer ${
                  desktopMode
                    ? 'bg-teal-600 text-white border-teal-500 shadow-xs shadow-teal-600/25'
                    : 'bg-slate-100 hover:bg-teal-50 border-slate-200 hover:border-teal-300 text-slate-700 hover:text-teal-900'
                }`}
                title={
                  desktopMode
                    ? 'خروج از حالت دسکتاپ (Esc یا Alt+D)'
                    : 'حالت دسکتاپ (Native): تمام‌صفحه کردن مانیتور و شناورسازی نوار ابزارها و پنل‌های جانبی برای حداکثر فضای تایپ (Alt+D)'
                }
              >
                {desktopMode ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 shrink-0" />
                    <span>خروج از حالت دسکتاپ</span>
                  </>
                ) : (
                  <>
                    <Monitor className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>حالت دسکتاپ</span>
                  </>
                )}
              </button>
            )}

            {/* Settings Icon Button (Uniform h-9 right next to Dark Mode) */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="h-9 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 hover:text-slate-900 inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer"
              title="تنظیمات سامانه، مشخصات مرکز، نصب آفلاین و پشتیبان‌گیری"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-slate-700 shrink-0" />
              <span className="hidden 2xl:inline">تنظیمات</span>
            </button>

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

            {/* Active Typist Selector (Uniform h-9 + Smooth Dropdown with Analytics Access) */}
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
    </header>
  );
};
