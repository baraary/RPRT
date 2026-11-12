import React, { useState } from 'react';
import { CustomFont } from '../types';
import { Type, X, Plus, Trash2, Check, Sparkles, Globe } from 'lucide-react';

interface FontManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fonts: CustomFont[];
  onAddFont: (font: Omit<CustomFont, 'id'>) => void;
  onDeleteFont: (id: string) => void;
}

export const FontManagerModal: React.FC<FontManagerModalProps> = ({
  isOpen,
  onClose,
  fonts,
  onAddFont,
  onDeleteFont,
}) => {
  const [name, setName] = useState('');
  const [family, setFamily] = useState('');
  const [url, setUrl] = useState('');
  const [previewText, setPreviewText] = useState('شواهدی از ضایعه فضاگیر یا تغییر پاتولوژیک بارز مشاهده نمی‌شود.');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !family.trim()) return;

    // If a webfont URL is provided, inject it into document.head
    if (url.trim()) {
      try {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url.trim();
        document.head.appendChild(link);
      } catch (err) {
        console.warn('Failed to inject font link', err);
      }
    }

    onAddFont({
      name: name.trim(),
      family: family.trim(),
      url: url.trim() || undefined,
    });

    setName('');
    setFamily('');
    setUrl('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Type className="w-5 h-5 text-teal-400 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base">
                مدیریت و افزودن فونت‌های سفارشی (قلم‌ها)
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5">
                افزودن فونت‌های فارسی نصب شده روی سیستم یا فونت‌های اینترنتی وب
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

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Add Font Form */}
          <form onSubmit={handleAdd} className="p-4 bg-teal-50/50 border border-teal-200 rounded-2xl space-y-3">
            <div className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-teal-700" />
              <span>افزودن فونت جدید به لیست قلم‌های گزارش‌نویسی</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  نام نمایشی فونت:
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: ایران‌یکان، رویا، دنا..."
                  className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  نام قلم در CSS (Font-Family):
                </label>
                <input
                  type="text"
                  required
                  value={family}
                  onChange={(e) => setFamily(e.target.value)}
                  placeholder="مثال: 'IRANYekan', Tahoma, sans-serif"
                  className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white font-mono focus:border-teal-500"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                لینک وب‌فونت اینترنتی (CSS URL اختیاری):
              </label>
              <div className="relative">
                <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://fonts.googleapis.com/css2?family=... (اختیاری)"
                  className="w-full text-xs pl-8 pr-2.5 py-2 rounded-xl border border-slate-300 bg-white font-mono focus:border-teal-500 text-left"
                  dir="ltr"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                نکته: اگر فونت روی رایانه شما نصب است (مانند B Nazanin یا B Yekan)، نیازی به وارد کردن لینک نیست؛ وارد کردن نام قلم کافی است.
              </p>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs transition-colors"
              >
                ثبت و فعال‌سازی فونت
              </button>
            </div>
          </form>

          {/* Live Preview Box */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
            <span className="text-[11px] font-bold text-slate-700">متن نمونه پیش‌نمایش:</span>
            <input
              type="text"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
            />
          </div>

          {/* Fonts List */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-800">
              قلم‌های فعال در سامانه ({fonts.length} فونت)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {fonts.map((f) => (
                <div
                  key={f.id}
                  className="p-3 bg-white border border-slate-200 hover:border-teal-400 rounded-xl transition-all flex flex-col justify-between gap-2 shadow-2xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{f.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5" dir="ltr">
                        {f.family}
                      </div>
                    </div>
                    {f.id.startsWith('custom-') && (
                      <button
                        onClick={() => onDeleteFont(f.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded"
                        title="حذف فونت"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Render preview text in this exact font */}
                  <div
                    className="text-xs p-2 bg-slate-50 rounded-lg text-slate-800 line-clamp-1 border border-slate-100"
                    style={{ fontFamily: f.family }}
                  >
                    {previewText}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl shadow-xs"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
