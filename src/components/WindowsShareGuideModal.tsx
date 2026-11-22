import React, { useState } from 'react';
import {
  X,
  FolderPlus,
  Share2,
  HardDrive,
  FolderSync,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Monitor,
  ArrowLeftRight,
  MousePointerClick,
  ShieldCheck,
} from 'lucide-react';

interface WindowsShareGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFolderNow?: () => void;
}

export const WindowsShareGuideModal: React.FC<WindowsShareGuideModalProps> = ({
  isOpen,
  onClose,
  onSelectFolderNow,
}) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  if (!isOpen) return null;

  const faqs = [
    {
      q: 'اگر ویندوز در سیستم دوم نام کاربری و رمز عبور خواست چه کار کنیم؟',
      a: 'روی کامپیوتر اصلی (سیستم شماره ۱)، وارد Control Panel ← Network and Sharing Center ← Change advanced sharing settings شوید، بخش All Networks را باز کنید و تیک «Turn off password protected sharing» را بزنید و Save کنید. پس از این کار دیگر هیچ رمزی نمی‌خواهد.',
    },
    {
      q: 'آیا برای کار با پوشه اشتراکی به اینترنت یا دسترسی ادمین سرور نیاز است؟',
      a: 'خیر. تمام داده‌ها فقط داخل شبکه داخلی مطب یا بیمارستان (کابل لن یا وای‌فای داخلی) بین کامپیوترها جابه‌جا می‌شوند و هیچ نیازی به اینترنت یا سرور مرکزی نیست.',
    },
    {
      q: 'اگر هر دو سیستم همزمان گزارش بنویسند اطلاعات پاک یا قاطی می‌شود؟',
      a: 'خیر! سامانه رادیورپورت برای هر کامپیوتر یک فایل اختصاصی جداگانه در پوشه اشتراکی می‌سازد و هر ۲۰ ثانیه گزارش‌ها، قالب‌ها و پزشکان تمام سیستم‌ها را به‌صورت هوشمند و بدون تداخل با هم ادغام می‌کند.',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 animate-fadeIn"
      dir="rtl"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <FolderSync className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base">
                راهنمای تصویری و ساده تنظیم پوشه اشتراکی در ویندوز (مخصوص پزشکان)
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5">
                فقط در ۴ قدم ساده (کمتر از ۳ دقیقه)، تمام سیستم‌های مطب یا بخش را بدون اینترنت به هم متصل کنید
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-3 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <span>بستن</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Steps Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50">
          {/* Quick 4-step Visual Overview Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { num: '۱', title: 'ساخت پوشه', sub: 'روی کامپیوتر اصلی', color: 'bg-sky-50 border-sky-200 text-sky-900' },
              { num: '۲', title: 'اشتراک‌گذاری', sub: 'Everyone → Read/Write', color: 'bg-amber-50 border-amber-300 text-amber-950' },
              { num: '۳', title: 'ساخت درایو Z:', sub: 'روی بقیه سیستم‌ها', color: 'bg-indigo-50 border-indigo-200 text-indigo-950' },
              { num: '۴', title: 'اتصال در سامانه', sub: 'همگام‌سازی هر ۲۰ ثانیه', color: 'bg-emerald-50 border-emerald-200 text-emerald-950' },
            ].map((item) => (
              <div key={item.num} className={`rounded-2xl border p-3 flex items-center gap-2.5 ${item.color}`}>
                <span className="w-7 h-7 rounded-xl bg-white/90 border border-current/20 flex items-center justify-center font-black text-sm shrink-0">
                  {item.num}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-black truncate">{item.title}</div>
                  <div className="text-[10.5px] opacity-80 truncate">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* STEP 1 */}
          <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-xs">
                ۱
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-sky-600" />
                  <span>ساخت یک پوشه خالی روی کامپیوتر اصلی (فقط روی یک سیستم)</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  یکی از کامپیوترهایی که همیشه در ساعت کاری روشن است (مثلاً سیستم پذیرش یا سیستم اصلی اتاق پزشک) را انتخاب کنید. داخل درایو <code className="px-1.5 py-0.5 bg-slate-100 rounded font-mono font-bold text-slate-900" dir="ltr">D:</code> یا <code className="px-1.5 py-0.5 bg-slate-100 rounded font-mono font-bold text-slate-900" dir="ltr">C:</code> یک پوشه جدید بسازید و نام انگلیسی ساده مثل <code className="px-1.5 py-0.5 bg-sky-50 text-sky-900 border border-sky-200 rounded font-mono font-bold" dir="ltr">RadioReport_Sync</code> بگذارید.
                </p>
              </div>
            </div>

            {/* Visual Mockup: Windows Explorer Folder */}
            <div className="rounded-xl border border-slate-300 bg-slate-100 overflow-hidden" dir="ltr">
              <div className="bg-slate-200 px-3 py-1.5 flex items-center justify-between text-[11px] font-mono text-slate-700 border-b border-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="ml-2 font-bold">This PC &gt; Local Disk (D:)</span>
                </div>
                <span className="text-[10px] text-slate-500">Windows Explorer</span>
              </div>
              <div className="p-4 bg-white flex items-center gap-5 flex-wrap">
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-50 border-2 border-amber-400 shadow-xs">
                  <svg viewBox="0 0 36 30" className="w-9 h-8 shrink-0">
                    <path d="M2 5a3 3 0 0 1 3-3h9l3 4h14a3 3 0 0 1 3 3v16a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V5z" fill="#f59e0b" />
                    <path d="M2 10h32v15a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V10z" fill="#fbbf24" />
                  </svg>
                  <div>
                    <div className="text-xs font-mono font-black text-slate-900">RadioReport_Sync</div>
                    <div className="text-[10px] text-amber-800 font-sans" dir="rtl">← پوشه جدید شما اینجاست</div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-600 font-sans" dir="rtl">
                  💡 <strong>توصیه:</strong> بهتر است اسم پوشه بدون فاصله و انگلیسی باشد تا همه نسخه‌های ویندوز بدون خطا آن را بشناسند.
                </div>
              </div>
            </div>
          </section>

          {/* STEP 2 */}
          <section className="bg-white rounded-2xl border border-amber-300 p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-xs">
                ۲
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-amber-600" />
                  <span>اشتراک‌گذاری پوشه و دادن دسترسی خواندن و نوشتن (Read/Write)</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  روی پوشه <code className="font-mono font-bold text-slate-900" dir="ltr">RadioReport_Sync</code> <strong>راست‌کلیک</strong> کنید و مسیر زیر را مطابق تصویر انجام دهید:
                </p>
              </div>
            </div>

            {/* Visual Mockup: 3 Mini Windows Dialogs Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3" dir="ltr">
              {/* Mini Window A: Right-click -> Properties -> Sharing */}
              <div className="rounded-xl border border-slate-300 bg-slate-50 overflow-hidden flex flex-col">
                <div className="bg-slate-200 px-2.5 py-1.5 text-[10.5px] font-bold text-slate-700 border-b border-slate-300 flex items-center justify-between">
                  <span>RadioReport_Sync Properties</span>
                  <span className="text-[10px] bg-amber-600 text-white px-1.5 rounded font-sans" dir="rtl">قدم ۲-الف</span>
                </div>
                <div className="p-3 space-y-2.5 text-[11px] flex-1 bg-white">
                  <div className="flex items-center gap-1 border-b border-slate-200 pb-1.5">
                    <span className="px-2 py-0.5 text-slate-400">General</span>
                    <span className="px-2 py-0.5 rounded-t bg-amber-100 border border-amber-400 font-black text-amber-950">
                      Sharing
                    </span>
                    <span className="px-2 py-0.5 text-slate-400">Security</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                    <div className="text-[10px] text-slate-500">Network File and Folder Sharing</div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-600">Share this folder:</span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-teal-600 text-white font-bold shadow-xs ring-2 ring-teal-300">
                        <MousePointerClick className="w-3 h-3" />
                        Share...
                      </span>
                    </div>
                  </div>
                  <p className="text-[10.5px] text-slate-600 font-sans text-right" dir="rtl">
                    راست‌کلیک روی پوشه ← <strong>Properties</strong> ← تب <strong>Sharing</strong> ← دکمه <strong>Share...</strong> را بزنید.
                  </p>
                </div>
              </div>

              {/* Mini Window B: Choose people -> Everyone -> Read/Write */}
              <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50/30 overflow-hidden flex flex-col">
                <div className="bg-emerald-700 text-white px-2.5 py-1.5 text-[10.5px] font-bold flex items-center justify-between">
                  <span>Network access</span>
                  <span className="text-[10px] bg-white/20 px-1.5 rounded font-sans" dir="rtl">قدم ۲-ب (مهم!)</span>
                </div>
                <div className="p-3 space-y-2 text-[11px] flex-1 bg-white">
                  <div className="flex items-center gap-1">
                    <div className="flex-1 px-2 py-1 rounded border border-slate-300 bg-slate-50 font-bold text-slate-900">
                      Everyone ▾
                    </div>
                    <span className="px-2 py-1 rounded bg-sky-600 text-white font-bold">Add</span>
                  </div>
                  <div className="rounded-lg border border-slate-200 overflow-hidden text-[10.5px]">
                    <div className="grid grid-cols-2 bg-slate-100 px-2 py-1 font-bold text-slate-600">
                      <span>Name</span>
                      <span>Permission Level</span>
                    </div>
                    <div className="grid grid-cols-2 px-2 py-1.5 items-center bg-emerald-50 border-t border-emerald-200">
                      <span className="font-bold text-slate-900">Everyone</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-black text-center shadow-2xs">
                        Read/Write ✓
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <span className="px-3 py-1 rounded bg-slate-900 text-white font-bold">Share</span>
                  </div>
                  <p className="text-[10.5px] text-emerald-900 font-sans text-right font-semibold" dir="rtl">
                    <strong>Everyone</strong> را Add کنید و حتماً روی <strong>Read/Write</strong> بگذارید، سپس <strong>Share</strong> را بزنید.
                  </p>
                </div>
              </div>

              {/* Mini Window C: Your folder is shared! Copy path */}
              <div className="rounded-xl border border-slate-300 bg-slate-50 overflow-hidden flex flex-col">
                <div className="bg-slate-200 px-2.5 py-1.5 text-[10.5px] font-bold text-slate-700 border-b border-slate-300 flex items-center justify-between">
                  <span>Your folder is shared</span>
                  <span className="text-[10px] bg-teal-700 text-white px-1.5 rounded font-sans" dir="rtl">قدم ۲-ج</span>
                </div>
                <div className="p-3 space-y-2.5 text-[11px] flex-1 bg-white">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Folder shared successfully!</span>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-300 font-mono text-[10.5px] font-black text-amber-950 break-all">
                    \\DR-PC\RadioReport_Sync
                  </div>
                  <div className="flex justify-end">
                    <span className="px-3 py-1 rounded bg-teal-600 text-white font-bold">Done</span>
                  </div>
                  <p className="text-[10.5px] text-slate-600 font-sans text-right" dir="rtl">
                    این آدرس شبکه (مثل <code className="font-mono font-bold" dir="ltr">\\DR-PC\RadioReport_Sync</code>) را یادداشت کنید و <strong>Done</strong> را بزنید.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>نکته طلایی:</strong> اگر به اشتباه دسترسی روی <code className="font-mono font-bold" dir="ltr">Read</code> باقی بماند، کامپیوترهای دیگر فقط می‌توانند گزارش‌ها را ببینند و امکان ذخیره گزارش جدید نخواهند داشت. حتماً <code className="font-mono font-bold text-emerald-800" dir="ltr">Read/Write</code> را انتخاب کنید.
              </span>
            </div>
          </section>

          {/* STEP 3 */}
          <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-xs">
                ۳
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-indigo-600" />
                  <span>ساخت درایو شبکه <code className="font-mono" dir="ltr">Z:</code> روی بقیه کامپیوترها (توصیه‌شده)</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  روی هر کامپیوتر دیگر (اتاق تایپیست، سونوگرافی یا پذیرش)، پنجره <strong>This PC</strong> را باز کنید، از منوی بالا گزینه <strong>Map network drive</strong> (در ویندوز ۱۱ زیر دکمه سه نقطه <code dir="ltr">...</code>) را بزنید و آدرس مرحله قبل را وارد کنید:
                </p>
              </div>
            </div>

            {/* Visual Mockup: Map Network Drive Dialog */}
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3.5 sm:p-4" dir="ltr">
              <div className="max-w-lg mx-auto rounded-xl border border-slate-300 bg-white shadow-sm overflow-hidden">
                <div className="bg-slate-800 text-white px-3 py-1.5 text-[11px] font-bold flex items-center justify-between">
                  <span>Map Network Drive</span>
                  <span className="text-[10px] text-indigo-300 font-sans" dir="rtl">روی سیستم‌های دوم و سوم</span>
                </div>
                <div className="p-3.5 space-y-2.5 text-xs">
                  <div className="grid grid-cols-4 items-center gap-2">
                    <span className="text-slate-600 font-semibold">Drive:</span>
                    <div className="col-span-3 px-2.5 py-1 rounded-lg border-2 border-indigo-400 bg-indigo-50 font-mono font-black text-indigo-950 w-24">
                      Z: ▾
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-2">
                    <span className="text-slate-600 font-semibold">Folder:</span>
                    <div className="col-span-3 px-2.5 py-1 rounded-lg border-2 border-teal-400 bg-teal-50/60 font-mono font-bold text-slate-900">
                      \\DR-PC\RadioReport_Sync
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 pl-1">
                    <span className="w-4 h-4 rounded bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">
                      ✓
                    </span>
                    <span className="text-[11px] font-bold text-slate-800">
                      Reconnect at sign-in
                    </span>
                    <span className="text-[10px] text-emerald-700 font-sans" dir="rtl">(حتماً تیک بخورد)</span>
                  </div>
                  <div className="flex justify-end pt-1">
                    <span className="px-4 py-1 rounded-lg bg-indigo-600 text-white font-bold text-[11px]">
                      Finish
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* STEP 4 */}
          <section className="bg-white rounded-2xl border border-emerald-300 p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-xs">
                ۴
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>انتخاب پوشه داخل سامانه رادیورپورت روی تمام سیستم‌ها</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  در هر کامپیوتر، وارد <strong>تنظیمات سامانه ← بخش همگام‌سازی پوشه اشتراکی</strong> شوید، دکمه نارنجی <strong>«انتخاب پوشه اشتراکی شبکه»</strong> را بزنید و پوشه <code className="font-mono font-bold text-emerald-900" dir="ltr">Z:\RadioReport_Sync</code> (و روی سیستم اصلی <code className="font-mono font-bold text-emerald-900" dir="ltr">D:\RadioReport_Sync</code>) را انتخاب کرده و اجازه دسترسی مرورگر (Allow / Edit files) را تایید کنید.
                </p>
              </div>
            </div>

            {/* Visual Multi-PC Live Sync Schematic */}
            <div className="rounded-xl bg-gradient-to-l from-emerald-50 via-white to-teal-50 border border-emerald-200 p-4">
              <div className="flex flex-col sm:flex-row items-center justify-around gap-3">
                <div className="flex flex-col items-center gap-1 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs min-w-[130px]">
                  <Monitor className="w-6 h-6 text-teal-600" />
                  <span className="text-xs font-black text-slate-800">سیستم پزشک</span>
                  <span className="text-[10px] font-mono text-slate-500" dir="ltr">D:\RadioReport_Sync</span>
                </div>

                <ArrowLeftRight className="w-5 h-5 text-emerald-600 shrink-0 rotate-90 sm:rotate-0" />

                <div className="flex flex-col items-center gap-1 bg-amber-50 px-5 py-3 rounded-2xl border-2 border-amber-400 shadow-xs">
                  <FolderSync className="w-7 h-7 text-amber-600" />
                  <span className="text-xs font-black text-amber-950">پوشه مشترک شبکه</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    همگام‌سازی خودکار هر ۲۰ ثانیه
                  </span>
                </div>

                <ArrowLeftRight className="w-5 h-5 text-emerald-600 shrink-0 rotate-90 sm:rotate-0" />

                <div className="flex flex-col items-center gap-1 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs min-w-[130px]">
                  <Monitor className="w-6 h-6 text-indigo-600" />
                  <span className="text-xs font-black text-slate-800">سیستم تایپیست / پذیرش</span>
                  <span className="text-[10px] font-mono text-slate-500" dir="ltr">Z:\RadioReport_Sync</span>
                </div>
              </div>
              <p className="text-[11px] text-center text-slate-600 mt-3">
                🕒 <strong>نکته شروع شیفت صبح:</strong> به دلیل امنیت مرورگر کروم، پس از بستن و باز کردن مجدد مرورگر، کافیست یک کلیک روی دکمه <strong>«همگام‌سازی فوری / تایید دسترسی»</strong> بزنید تا ارتباط زنده دوباره فعال شود.
              </p>
            </div>
          </section>

          {/* Troubleshooting Accordion */}
          <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-black text-slate-900">
              <HelpCircle className="w-4 h-4 text-teal-600" />
              <span>پرسش‌های رایج و عیب‌یابی سریع</span>
            </div>
            <div className="space-y-2">
              {faqs.map((faq, idx) => {
                const isExpanded = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50/70"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isExpanded ? null : idx)}
                      className="w-full px-3.5 py-2.5 text-right flex items-center justify-between gap-2 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-3.5 pb-3 pt-1 text-xs text-slate-600 leading-relaxed bg-white border-t border-slate-100">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer CTA */}
        <div className="px-5 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap shrink-0">
          <span className="text-[11px] text-slate-600 font-semibold">
            پوشه را آماده کردید؟ همین الان متصلش کنید:
          </span>
          <div className="flex items-center gap-2">
            {onSelectFolderNow && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSelectFolderNow();
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <FolderSync className="w-4 h-4" />
                <span>انتخاب پوشه اشتراکی همین الان</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              متوجه شدم، بستن راهنما
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
