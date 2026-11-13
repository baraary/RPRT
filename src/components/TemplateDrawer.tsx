import React, { useState, useEffect } from 'react';
import { Modality, MedicalTemplate, Doctor } from '../types';
import {
  Layers,
  X,
  Search,
  User,
  Copy,
  Plus,
  Trash2,
  Check,
  Pin,
  BookmarkPlus,
} from 'lucide-react';

interface TemplateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  modality: Modality;
  templates: MedicalTemplate[];
  doctors: Doctor[];
  activeDoctorId: string;
  drawerMode?: 'replace' | 'add-new';
  onSelectTemplate: (template: MedicalTemplate, append: boolean) => void;
  onAddAsNewStudy?: (template: MedicalTemplate) => void;
  onCloneTemplate: (template: MedicalTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onTogglePinTemplate?: (templateId: string) => void;
  onQuickSaveCurrentAsTemplate?: (title: string, doctorId: string, pin: boolean) => void;
  defaultSuggestedTitle?: string;
}

export const TemplateDrawer: React.FC<TemplateDrawerProps> = ({
  isOpen,
  onClose,
  modality,
  templates,
  doctors,
  activeDoctorId,
  drawerMode = 'replace',
  onSelectTemplate,
  onAddAsNewStudy,
  onCloneTemplate,
  onDeleteTemplate,
  onTogglePinTemplate,
  onQuickSaveCurrentAsTemplate,
  defaultSuggestedTitle = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('all');
  const [selectedModalityFilter, setSelectedModalityFilter] = useState<Modality | 'all'>(modality);
  const [sortBy, setSortBy] = useState<'usage' | 'alphabetical'>('usage');

  // Inline 1-Step Save Current Report as Template State (No need to close drawer!)
  const [showInlineSaveBox, setShowInlineSaveBox] = useState(false);
  const [inlineTitle, setInlineTitle] = useState('');
  const [inlineDoctorId, setInlineDoctorId] = useState(activeDoctorId);
  const [inlinePin, setInlinePin] = useState(true);

  // Sync modality filter whenever drawer opens or active modality changes
  useEffect(() => {
    if (isOpen) {
      setSelectedModalityFilter(modality);
      setInlineDoctorId(activeDoctorId);
      setInlineTitle(defaultSuggestedTitle);
    }
  }, [modality, isOpen, activeDoctorId, defaultSuggestedTitle]);

  if (!isOpen) return null;

  const handleInlineSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineTitle.trim() || !onQuickSaveCurrentAsTemplate) return;
    onQuickSaveCurrentAsTemplate(inlineTitle.trim(), inlineDoctorId, inlinePin);
    setInlineTitle('');
    setShowInlineSaveBox(false);
  };

  // Filter and sort templates (default: by usage frequency, optional: alphabetical)
  const filteredTemplates = templates
    .filter((t) => {
      // Modality filter
      if (selectedModalityFilter !== 'all' && t.modality !== selectedModalityFilter) {
        return false;
      }
      // Doctor filter
      if (selectedDoctorFilter !== 'all' && t.doctorId !== selectedDoctorFilter && t.doctorId !== 'all') {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = t.title.toLowerCase().includes(q);
        const inTags = t.tags.some((tag) => tag.toLowerCase().includes(q));
        const inText = (t.technique + t.findingsHtml + t.impressionHtml).toLowerCase().includes(q);
        return inTitle || inTags || inText;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'alphabetical') {
        return a.title.localeCompare(b.title, 'fa');
      }
      // Default: sort by usageCount descending, then pinned status, then Persian alphabetical
      const countDiff = (b.usageCount || 0) - (a.usageCount || 0);
      if (countDiff !== 0) return countDiff;
      if (Boolean(b.isPinned) !== Boolean(a.isPinned)) {
        return b.isPinned ? 1 : -1;
      }
      return a.title.localeCompare(b.title, 'fa');
    });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col animate-slideLeft">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-900 text-white flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Layers className="w-5 h-5 text-teal-400 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base">
                {drawerMode === 'add-new'
                  ? 'انتخاب قالب برای افزودن تصویربرداری جدید'
                  : 'بانک قالب‌های تخصصی گزارش‌نویسی'}
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {drawerMode === 'add-new'
                  ? 'قالب مورد نظر را انتخاب کنید تا به عنوان بررسی جدید به پرونده همین بیمار اضافه شود'
                  : 'تفکیک‌شده بر اساس مدالیته و پزشکان متخصص • با قابلیت سنجاق در نوار سریع'}
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

        {drawerMode === 'add-new' && (
          <div className="px-4 py-2.5 bg-indigo-50 border-b border-indigo-200 flex items-center gap-2 text-xs font-bold text-indigo-950">
            <Plus className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              حالت افزودن بررسی جدید فعال است: با کلیک روی دکمه هر قالب، آن گزارش به صورت مجزا به پایین پرونده اضافه می‌شود (بدون ایجاد گزارش خالی).
            </span>
          </div>
        )}

        {/* Filters Bar: Modality, Doctor, Sort Order & Search */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-2.5">
          {/* Modality Filter Pills (Harmonized with Top Navbar Modality Colors) */}
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200">
            {(['all', 'sonography', 'mri', 'ct'] as const).map((m) => {
              const label =
                m === 'all'
                  ? 'همه مدالیته‌ها'
                  : m === 'mri'
                  ? 'ام‌آر‌آی'
                  : m === 'ct'
                  ? 'سی‌تی‌اسکن'
                  : 'سونوگرافی';
              const active = selectedModalityFilter === m;
              const activeCls =
                m === 'sonography'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : m === 'mri'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : m === 'ct'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-900 text-white shadow-xs';
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedModalityFilter(m)}
                  className={`flex-1 h-8 px-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                    active ? activeCls : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Doctor Filter Dropdown + Sort Mode Toggle */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
              <span className="text-xs font-semibold text-slate-600 shrink-0">پزشک:</span>
              <select
                value={selectedDoctorFilter}
                onChange={(e) => setSelectedDoctorFilter(e.target.value)}
                className="flex-1 text-xs p-2 rounded-xl border border-slate-200 bg-white font-medium focus:border-teal-500"
              >
                <option value="all">همه پزشکان (نمایش مشترک)</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    قالب‌های اختصاصی {doc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By Toggle: Usage Frequency (Default) vs Alphabetical */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setSortBy('usage')}
                className={`h-7 px-2.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  sortBy === 'usage'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="مرتب‌سازی بر اساس بیشترین تکرار و میزان استفاده (پیش‌فرض)"
              >
                پرتکرارترین
              </button>
              <button
                type="button"
                onClick={() => setSortBy('alphabetical')}
                className={`h-7 px-2.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                  sortBy === 'alphabetical'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="مرتب‌سازی بر اساس حروف الفبا (الف تا ی)"
              >
                حروف الفبا
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در نام قالب، ارگان یا کلمات کلیدی (مغز، کبد، زانو...)"
              className="w-full text-xs pr-9 pl-3 py-2 rounded-xl border border-slate-200 bg-white focus:border-teal-500"
            />
          </div>
        </div>

        {/* Inline 1-Step Save Current Report as New Template (No need to close drawer!) */}
        <div className="px-4 py-2.5 bg-teal-50/70 border-b border-teal-200/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-teal-950 font-bold">
              تعداد قالب‌ها: {filteredTemplates.length} مورد ({sortBy === 'usage' ? 'مرتب بر اساس تکرار' : 'مرتب بر اساس الفبا'})
            </span>
            <button
              type="button"
              onClick={() => {
                setShowInlineSaveBox((prev) => !prev);
                if (!inlineTitle) setInlineTitle(defaultSuggestedTitle);
              }}
              className="h-8 inline-flex items-center gap-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 px-3 rounded-lg shadow-2xs transition-all duration-200 cursor-pointer"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>{showInlineSaveBox ? 'بستن کادر ذخیره قالب' : '+ ذخیره متن فعلی به عنوان قالب آماده'}</span>
            </button>
          </div>

          {showInlineSaveBox && (
            <form
              onSubmit={handleInlineSaveSubmit}
              className="bg-white p-3 rounded-2xl border border-teal-300 shadow-sm space-y-2.5 animate-scaleIn"
            >
              <div className="text-xs font-extrabold text-slate-800">
                ثبت فوری متن تایپ‌شده فعلی در لیست قالب‌های آماده:
              </div>
              <input
                type="text"
                autoFocus
                value={inlineTitle}
                onChange={(e) => setInlineTitle(e.target.value)}
                placeholder="عنوان قالب جدید را بنویسید (مثلاً: سونوگرافی شکم و لگن نرمال دکتر کیانی)..."
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:border-teal-500 focus:outline-none font-bold"
              />
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <select
                  value={inlineDoctorId}
                  onChange={(e) => setInlineDoctorId(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold"
                >
                  <option value="all">عمومی (برای همه پزشکان)</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      اختصاصی {d.name}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={inlinePin}
                    onChange={(e) => setInlinePin(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <span>سنجاق شود بالای ویرایشگر (دسترسی تک‌کلیکی)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowInlineSaveBox(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>ذخیره فوری قالب</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Templates List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Layers className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-xs">قالبی با مشخصات فیلتر شده یافت نشد.</p>
            </div>
          ) : (
            filteredTemplates.map((template) => {
              const doc = doctors.find((d) => d.id === template.doctorId);
              const modalityFa =
                template.modality === 'mri'
                  ? 'ام‌آر‌آی'
                  : template.modality === 'ct'
                  ? 'سی‌تی‌اسکن'
                  : 'سونوگرافی';

              const modCardTheme =
                template.modality === 'mri'
                  ? {
                      border: 'border-indigo-200/90 hover:border-indigo-400',
                      applyBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white',
                      badge: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
                    }
                  : template.modality === 'ct'
                  ? {
                      border: 'border-emerald-200/90 hover:border-emerald-400',
                      applyBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
                      badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                    }
                  : {
                      border: 'border-sky-200/90 hover:border-sky-400',
                      applyBtn: 'bg-sky-600 hover:bg-sky-700 text-white',
                      badge: 'bg-sky-50 text-sky-700 border border-sky-200',
                    };

              return (
                <div
                  key={template.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 p-4 space-y-2.5 hover:shadow-md ${modCardTheme.border}`}
                >
                  {/* Title and Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          {template.title}
                        </h4>
                        {template.isPinned && (
                          <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded-md flex items-center gap-0.5">
                            <Pin className="w-2.5 h-2.5 fill-amber-500 text-amber-600" />
                            <span>سنجاق</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${modCardTheme.badge}`}>
                          {modalityFa}
                        </span>

                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{doc ? doc.name : 'قالب عمومی تمام پزشکان'}</span>
                        </span>

                        {typeof template.usageCount === 'number' && template.usageCount > 0 && (
                          <span
                            className="text-[10px] font-mono font-bold text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.2 rounded-md"
                            title="تعداد دفعات استفاده از این قالب"
                          >
                            {template.usageCount} بار استفاده
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Pin / Unpin to Top Bar Button */}
                      {onTogglePinTemplate && (
                        <button
                          type="button"
                          onClick={() => onTogglePinTemplate(template.id)}
                          className={`h-7 text-xs font-bold px-2.5 rounded-lg border inline-flex items-center gap-1 transition-all duration-150 cursor-pointer ${
                            template.isPinned
                              ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300'
                          }`}
                          title={
                            template.isPinned
                              ? 'برداشتن سنجاق از نوار بالای ویرایشگر'
                              : 'سنجاق کردن در نوار بالای ویرایشگر برای دسترسی تک‌کلیکی'
                          }
                        >
                          <Pin className={`w-3 h-3 ${template.isPinned ? 'fill-white' : ''}`} />
                          <span>{template.isPinned ? 'سنجاق‌شده' : 'سنجاق'}</span>
                        </button>
                      )}

                      {/* Clone button */}
                      <button
                        type="button"
                        onClick={() => onCloneTemplate(template)}
                        className="h-7 text-xs font-semibold text-slate-600 hover:text-teal-700 bg-slate-100 hover:bg-teal-50 px-2.5 rounded-lg border border-slate-200 hover:border-teal-300 inline-flex items-center gap-1 transition-all duration-150 cursor-pointer"
                        title="کپی کردن این قالب برای پزشک دیگر"
                      >
                        <Copy className="w-3 h-3" />
                        <span>کپی</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Preview */}
                  <div className="text-[11px] text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 line-clamp-2 leading-relaxed">
                    {template.findingsHtml.replace(/<[^>]+>/g, ' ').slice(0, 150)}...
                  </div>

                  {/* Action Buttons: Apply / Add as Next Study / Append / Delete */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {drawerMode === 'add-new' && onAddAsNewStudy ? (
                        <button
                          type="button"
                          onClick={() => {
                            onAddAsNewStudy(template);
                            onClose();
                          }}
                          className={`h-8 text-xs font-bold px-3.5 rounded-lg shadow-2xs inline-flex items-center gap-1.5 transition-all duration-200 active:scale-95 cursor-pointer ${modCardTheme.applyBtn}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ افزودن این قالب به عنوان گزارش جدید</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectTemplate(template, false);
                              onClose();
                            }}
                            className={`h-8 text-xs font-bold px-3 rounded-lg shadow-2xs inline-flex items-center gap-1 transition-all duration-200 active:scale-95 cursor-pointer ${modCardTheme.applyBtn}`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>جایگزینی در بررسی فعال</span>
                          </button>

                          {onAddAsNewStudy && (
                            <button
                              type="button"
                              onClick={() => {
                                onAddAsNewStudy(template);
                                onClose();
                              }}
                              className="text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                              title="افزودن این قالب به عنوان تصویربرداری بعدی برای همین بیمار"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ درج به عنوان بررسی بعدی</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              onSelectTemplate(template, true);
                              onClose();
                            }}
                            className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                            title="افزودن به انتهای گزارش فعلی"
                          >
                            الحاق به انتها
                          </button>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteTemplate(template.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="حذف قالب"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

