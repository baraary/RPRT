import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, CheckCircle2, X, Laptop, Terminal, WifiOff, Copy, Check } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showOfflineGuide, setShowOfflineGuide] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const handleCopyCommand = () => {
    navigator.clipboard.writeText('npm install && npm run build && npm run preview');
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  if (isInstalled) {
    return null;
  }

  return (
    <>
      {isInstallable ? (
        <button
          type="button"
          onClick={install}
          className="h-9 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white border border-teal-600 inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap shadow-2xs transition-all duration-200 active:scale-95 cursor-pointer"
          title="نصب برنامه آفلاین روی دسکتاپ یا موبایل (PWA)"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden lg:inline">نصب آفلاین</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setShowOfflineGuide(true)}
          className="h-9 px-2.5 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 hover:border-teal-300 inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer"
          title="راهنمای نصب آفلاین دسکتاپ (PWA) و اجرای محلی از گیت‌هاب"
        >
          <Download className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          <span className="hidden xl:inline">{isIOS ? 'نصب روی آیفون' : 'نصب آفلاین'}</span>
        </button>
      )}

      {showOfflineGuide && (
        <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-fadeSlideUp">
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/40 text-teal-300 flex items-center justify-center">
                  <WifiOff className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    نصب آفلاین (PWA) و اجرا از گیت‌هاب
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    آماده استفاده ۱۰۰٪ آفلاین در سیستم‌های بیمارستان و مراکز تصویربرداری
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOfflineGuide(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs leading-relaxed text-slate-700 max-h-[80vh] overflow-y-auto">
              {/* Method 1: Browser PWA Install */}
              <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-2">
                <div className="font-black text-teal-950 flex items-center gap-1.5 text-xs">
                  <Laptop className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>روش ۱: نصب مستقیم روی ویندوز / مک با کروم یا اج (بدون نیاز به کدنویسی)</span>
                </div>
                {isIOS ? (
                  <p className="text-[11px] text-teal-900">
                    ۱. در مرورگر Safari روی دکمه <strong>Share</strong> بزنید.<br />
                    ۲. گزینه <strong>Add to Home Screen</strong> را انتخاب کنید تا آیکون برنامه روی صفحه اضافه شود.
                  </p>
                ) : (
                  <p className="text-[11px] text-teal-900">
                    زمانی که برنامه را در تب مستقل مرورگر (Chrome یا Edge) باز کنید، آیکون{' '}
                    <strong>Install رادیورپورت</strong> در سمت راست نوار آدرس مرورگر ظاهر می‌شود. با یک کلیک، برنامه مانند نرم‌افزار ویندوز روی دسکتاپ نصب شده و بدون اینترنت کار می‌کند.
                  </p>
                )}
              </div>

              {/* Method 2: GitHub Local Run */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="font-black text-slate-900 flex items-center gap-1.5 text-xs">
                  <Terminal className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>روش ۲: دانلود از گیت‌هاب و اجرای آفلاین روی کامپیوتر مرکز</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  پس از دانلود پروژه از گیت‌هاب (Clone یا Download ZIP)، کافی است یک بار دستور زیر را در پوشه پروژه اجرا کنید:
                </p>
                <div className="flex items-center justify-between bg-slate-900 text-teal-300 px-3 py-2 rounded-xl font-mono text-[11px]" dir="ltr">
                  <span>npm install &amp;&amp; npm run build &amp;&amp; npm run preview</span>
                  <button
                    type="button"
                    onClick={handleCopyCommand}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCmd ? 'کپی شد' : 'کپی'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  سرویس‌ورکر (Service Worker) فعال است و فونت‌ها، قالب‌ها، شورتکات‌ها و آمار تایپیست‌ها به صورت آفلاین در سیستم ذخیره می‌شوند.
                </span>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowOfflineGuide(false)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  متوجه شدم
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
