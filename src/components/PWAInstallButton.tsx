import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Download,
  CheckCircle2,
  X,
  Laptop,
  Terminal,
  WifiOff,
  Copy,
  Check,
  Network,
  Globe,
} from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showOfflineGuide, setShowOfflineGuide] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
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
          title="راهنمای نصب آفلاین (PWA)، راه‌اندازی سرور شبکه داخلی بیمارستان (LAN) و انتشار روی GitHub Pages"
        >
          <Download className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          <span className="hidden xl:inline">{isIOS ? 'نصب روی آیفون' : 'نصب / راهنمای شبکه و وب'}</span>
        </button>
      )}

      {showOfflineGuide &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
            dir="rtl"
          >
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-fadeSlideUp">
              <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/40 text-teal-300 flex items-center justify-center">
                    <WifiOff className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base">
                      راهنمای جامع استقرار: سرور شبکه محلی (LAN)، گیت‌هاب پیجز و نصب آفلاین
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      ظرفیت ذخیره‌سازی نامحدود (میلیون‌ها گزارش) با موتور IndexedDB و دیتابیس SQLite
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

              <div className="p-5 space-y-4 text-xs leading-relaxed text-slate-700 max-h-[82vh] overflow-y-auto">
                {/* Method 1: Local Hospital LAN Server */}
                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2.5">
                  <div className="font-black text-indigo-950 flex items-center gap-1.5 text-xs sm:text-sm">
                    <Network className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>۱. راه‌اندازی سرور شبکه داخلی بیمارستان / کلینیک (LAN با دیتابیس مشترک SQLite)</span>
                  </div>
                  <p className="text-[11px] text-indigo-950/90 leading-relaxed">
                    برای اینکه چند سیستم تایپیست در بیمارستان بدون اینترنت به یک آرشیو بیماران، قالب‌ها و آمار کارکرد مشترک متصل شوند، پروژه را روی یک کامپیوتر مرکزی (سرور داخلی) قرار داده و دستورات زیر را اجرا کنید:
                  </p>
                  <div
                    className="flex items-center justify-between bg-slate-900 text-teal-300 px-3 py-2 rounded-xl font-mono text-[11px]"
                    dir="ltr"
                  >
                    <span>npm install &amp;&amp; npm run build &amp;&amp; NODE_ENV=production npm start</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(
                          'lan-cmd',
                          'npm install && npm run build && NODE_ENV=production npm start'
                        )
                      }
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[10px] flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedKey === 'lan-cmd' ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedKey === 'lan-cmd' ? 'کپی شد' : 'کپی'}</span>
                    </button>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-indigo-950 space-y-1">
                    <li>
                      پس از اجرا، آدرس شبکه در ترمینال نمایش داده می‌شود (مثلاً{' '}
                      <code className="font-mono font-bold bg-white px-1.5 py-0.5 rounded" dir="ltr">
                        http://192.168.1.100:3000
                      </code>
                      ).
                    </li>
                    <li>
                      در سایر کامپیوترهای بیمارستان، کافی است همان آدرس را در مرورگر کروم یا اج باز کنید.
                    </li>
                    <li>
                      در صورتی که سایر سیستم‌ها نتوانستند وصل شوند، پورت <strong>3000</strong> را در فایروال ویندوز سرور با دستور زیر (در CMD با دسترسی Administrator) باز کنید:
                    </li>
                  </ul>
                  <div
                    className="flex items-center justify-between bg-slate-900 text-amber-300 px-3 py-1.5 rounded-xl font-mono text-[10.5px]"
                    dir="ltr"
                  >
                    <span>
                      netsh advfirewall firewall add rule name=&quot;RadioReport LAN&quot; dir=in action=allow protocol=TCP localport=3000
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(
                          'fw-cmd',
                          'netsh advfirewall firewall add rule name="RadioReport LAN" dir=in action=allow protocol=TCP localport=3000'
                        )
                      }
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[10px] flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedKey === 'fw-cmd' ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedKey === 'fw-cmd' ? 'کپی شد' : 'کپی'}</span>
                    </button>
                  </div>
                </div>

                {/* Method 2: GitHub Pages Online Web Hosting */}
                <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-2">
                  <div className="font-black text-sky-950 flex items-center gap-1.5 text-xs sm:text-sm">
                    <Globe className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>۲. انتشار آنلاین رایگان روی وب با GitHub Pages (از پیش پیکربندی‌شده)</span>
                  </div>
                  <p className="text-[11px] text-sky-950/90 leading-relaxed">
                    فایل انتشار خودکار (<code className="font-mono">.github/workflows/deploy-pages.yml</code>) و مسیرهای نسبی (<code className="font-mono">base: &apos;./&apos;</code>) در پروژه آماده شده است:
                  </p>
                  <ol className="list-decimal list-inside text-[11px] text-sky-950 space-y-1">
                    <li>پروژه را در یک مخزن (Repository) گیت‌هاب آپلود یا Push کنید.</li>
                    <li>
                      در گیت‌هاب وارد بخش <strong>Settings &rarr; Pages</strong> شوید و گزینه{' '}
                      <strong>Source</strong> را روی <strong>GitHub Actions</strong> قرار دهید.
                    </li>
                    <li>
                      طی ۱ دقیقه برنامه به صورت خودکار ساخته شده و در آدرس دائمی{' '}
                      <code className="font-mono bg-white px-1.5 py-0.5 rounded" dir="ltr">
                        https://YOUR-USERNAME.github.io/REPO-NAME/
                      </code>{' '}
                      در دسترس خواهد بود.
                    </li>
                  </ol>
                </div>

                {/* Method 3: Browser PWA Install */}
                <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-1.5">
                  <div className="font-black text-teal-950 flex items-center gap-1.5 text-xs">
                    <Laptop className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>۳. نصب مستقیم روی ویندوز / مک با کروم یا اج (PWA)</span>
                  </div>
                  <p className="text-[11px] text-teal-900">
                    در مرورگر Chrome یا Edge، روی آیکون <strong>Install رادیورپورت</strong> در سمت راست نوار آدرس کلیک کنید تا برنامه دقیقاً مانند یک نرم‌افزار مستقل دسکتاپ روی ویندوز نصب شده و بدون اینترنت هم کار کند.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    ظرفیت ذخیره‌سازی با فعال بودن Persistent IndexedDB و SQLite بیش از ۳۰ میلیون گزارش بیمار (تا سقف فضای خالی هارد دیسک) است.
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
          </div>,
          document.body
        )}
    </>
  );
};
