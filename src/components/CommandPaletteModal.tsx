import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Modality,
  MedicalTemplate,
  PatientWorkspaceTab,
  Doctor,
} from '../types';
import {
  Search,
  FileText,
  User,
  Printer,
  FolderOpen,
  Plus,
  Moon,
  Sun,
  Stethoscope,
  Layers,
  X,
  CornerDownLeft,
  Sparkles,
} from 'lucide-react';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  modality: Modality;
  onSelectModality: (mod: Modality) => void;
  templates: MedicalTemplate[];
  onApplyTemplate: (tpl: MedicalTemplate) => void;
  tabs: PatientWorkspaceTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onAddNewTab: () => void;
  doctors: Doctor[];
  activeDoctorId: string;
  onSelectDoctor: (docId: string) => void;
  onOpenPrintPreview: () => void;
  onSaveToArchive: () => void;
  onOpenArchive: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

interface CommandItem {
  id: string;
  category: 'پرتکرار و عملیات سریع' | 'قالب‌های آماده گزارش' | 'تب‌های بیماران باز' | 'تغییر پزشک و مدالیته';
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ReactNode;
  onExecute: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  modality,
  onSelectModality,
  templates,
  onApplyTemplate,
  tabs,
  activeTabId,
  onSelectTab,
  onAddNewTab,
  doctors,
  activeDoctorId,
  onSelectDoctor,
  onOpenPrintPreview,
  onSaveToArchive,
  onOpenArchive,
  darkMode,
  onToggleDarkMode,
}) => {
  const [rendered, setRendered] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      setIsClosing(false);
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 40);
    } else if (rendered) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setRendered(false);
        setIsClosing(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, rendered]);

  const handleSmoothClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 170);
  };

  const modalityLabels: Record<Modality, string> = {
    sonography: 'سونوگرافی',
    mri: 'ام‌آر‌آی',
    ct: 'سی‌تی‌اسکن',
  };

  const allItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      {
        id: 'act-print',
        category: 'پرتکرار و عملیات سریع',
        title: 'پیش‌نمایش چاپ سربرگ و صدور گزارش نهایی',
        subtitle: 'مشاهده برگه A4، تنظیمات سربرگ و خروجی چاپ / PDF / PNG',
        badge: 'Ctrl+P',
        badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
        icon: <Printer className="w-4 h-4 text-teal-600" />,
        onExecute: () => {
          onOpenPrintPreview();
          handleSmoothClose();
        },
      },
      {
        id: 'act-new-tab',
        category: 'پرتکرار و عملیات سریع',
        title: 'باز کردن تب بیمار جدید و انتخاب قالب',
        subtitle: 'ایجاد پرونده جدید برای بیمار بعدی در نوبت',
        badge: 'Alt+N',
        badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
        icon: <Plus className="w-4 h-4 text-sky-600" />,
        onExecute: () => {
          onAddNewTab();
          handleSmoothClose();
        },
      },
      {
        id: 'act-save-archive',
        category: 'پرتکرار و عملیات سریع',
        title: 'ذخیره فوری گزارش فعلی در آرشیو بیماران',
        subtitle: 'ثبت در پایگاه داده آفلاین مرکز',
        badge: 'Ctrl+S',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: <Sparkles className="w-4 h-4 text-emerald-600" />,
        onExecute: () => {
          onSaveToArchive();
          handleSmoothClose();
        },
      },
      {
        id: 'act-open-archive',
        category: 'پرتکرار و عملیات سریع',
        title: 'مشاهده و جستجوی آرشیو بیماران',
        subtitle: 'جستجو بر اساس نام بیمار، کد ملی و بازه تاریخ شمسی',
        icon: <FolderOpen className="w-4 h-4 text-indigo-600" />,
        onExecute: () => {
          onOpenArchive();
          handleSmoothClose();
        },
      },
      {
        id: 'act-dark-mode',
        category: 'پرتکرار و عملیات سریع',
        title: darkMode ? 'تغییر به حالت روشن (روز)' : 'تغییر به حالت تاریک اتاق رادیولوژی (Darkroom)',
        subtitle: 'تنظیم کنتراست صفحه برای محیط کاری',
        icon: darkMode ? (
          <Sun className="w-4 h-4 text-amber-500" />
        ) : (
          <Moon className="w-4 h-4 text-slate-700" />
        ),
        onExecute: () => {
          onToggleDarkMode();
          handleSmoothClose();
        },
      },
    ];

    // Open Patient Tabs
    tabs.forEach((tab, idx) => {
      const name = tab.patientInfo.fullName.trim() || `بیمار نوبت ${idx + 1}`;
      items.push({
        id: `tab-${tab.id}`,
        category: 'تب‌های بیماران باز',
        title: `پرونده: ${name}`,
        subtitle: `پذیرش: ${tab.patientInfo.admissionNumber} • ${tab.studies.length} بررسی (${modalityLabels[tab.modality]})`,
        badge: tab.id === activeTabId ? 'تب فعال' : `Alt+${idx + 1}`,
        badgeColor:
          tab.id === activeTabId
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-slate-100 text-slate-600 border-slate-200',
        icon: <User className="w-4 h-4 text-sky-600" />,
        onExecute: () => {
          onSelectTab(tab.id);
          handleSmoothClose();
        },
      });
    });

    // Modality switches
    (['sonography', 'mri', 'ct'] as Modality[]).forEach((m) => {
      items.push({
        id: `mod-${m}`,
        category: 'تغییر پزشک و مدالیته',
        title: `تغییر مدالیته فعال به ${modalityLabels[m]}`,
        badge: modality === m ? 'فعال' : undefined,
        badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
        icon: <Layers className="w-4 h-4 text-indigo-600" />,
        onExecute: () => {
          onSelectModality(m);
          handleSmoothClose();
        },
      });
    });

    // Doctors
    doctors.forEach((doc) => {
      items.push({
        id: `doc-${doc.id}`,
        category: 'تغییر پزشک و مدالیته',
        title: `انتخاب پزشک: ${doc.name}`,
        subtitle: doc.specialty,
        badge: doc.id === activeDoctorId ? 'پزشک فعال' : undefined,
        badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
        icon: <Stethoscope className="w-4 h-4 text-teal-600" />,
        onExecute: () => {
          onSelectDoctor(doc.id);
          handleSmoothClose();
        },
      });
    });

    // Templates (prioritize active modality first)
    const sortedTemplates = [...templates].sort((a, b) => {
      if (a.modality === modality && b.modality !== modality) return -1;
      if (a.modality !== modality && b.modality === modality) return 1;
      return (b.usageCount || 0) - (a.usageCount || 0);
    });

    sortedTemplates.forEach((tpl) => {
      items.push({
        id: `tpl-${tpl.id}`,
        category: 'قالب‌های آماده گزارش',
        title: `اعمال قالب: ${tpl.title}`,
        subtitle: tpl.technique || modalityLabels[tpl.modality],
        badge: modalityLabels[tpl.modality],
        badgeColor:
          tpl.modality === 'sonography'
            ? 'bg-sky-50 text-sky-700 border-sky-200'
            : tpl.modality === 'mri'
            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: <FileText className="w-4 h-4 text-slate-600" />,
        onExecute: () => {
          onApplyTemplate(tpl);
          handleSmoothClose();
        },
      });
    });

    return items;
  }, [
    modality,
    templates,
    tabs,
    activeTabId,
    doctors,
    activeDoctorId,
    darkMode,
  ]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems.slice(0, 18);
    return allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
    );
  }, [allItems, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!rendered) return null;

  return (
    <div
      onClick={handleSmoothClose}
      className={`fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 no-print transition-all duration-200 ${
        isClosing
          ? 'bg-slate-950/0 backdrop-blur-none opacity-0'
          : 'bg-slate-950/55 backdrop-blur-xs opacity-100'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200/90 shadow-[0_24px_60px_-15px_rgba(15,23,42,0.35)] overflow-hidden flex flex-col max-h-[76vh] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isClosing
            ? 'scale-95 -translate-y-3 opacity-0'
            : 'scale-100 translate-y-0 opacity-100'
        }`}
      >
        {/* Top Spotlight Search Input */}
        <div className="px-4 py-3.5 border-b border-slate-200/80 flex items-center gap-3 bg-slate-50/70">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
            style={{ backgroundColor: 'var(--modality-accent, #0284c7)' }}
          >
            <Search className="w-4 h-4" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev) =>
                  Math.min(prev + 1, Math.max(0, filteredItems.length - 1))
                );
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((prev) => Math.max(0, prev - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredItems[selectedIndex]) {
                  filteredItems[selectedIndex].onExecute();
                }
              } else if (e.key === 'Escape') {
                e.preventDefault();
                handleSmoothClose();
              }
            }}
            placeholder="جستجوی سریع قالب آماده، تب بیمار، پزشک یا فرمان (مثلاً: شکم، تیروئید، چاپ)..."
            className="flex-1 bg-transparent text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSmoothClose}
            className="h-7 px-2 rounded-lg bg-slate-200/70 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
          >
            <span>Esc</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Results List */}
        <div className="p-2.5 overflow-y-auto space-y-1 flex-1">
          {filteredItems.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 font-semibold">
              موردی مطابق با عبارت «{query}» یافت نشد.
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const prevCategory = idx > 0 ? filteredItems[idx - 1].category : null;
              const showCategoryHeader = item.category !== prevCategory;

              return (
                <React.Fragment key={item.id}>
                  {showCategoryHeader && (
                    <div className="px-2.5 pt-2 pb-1 text-[10px] font-extrabold text-slate-400">
                      {item.category}
                    </div>
                  )}
                  <button
                    type="button"
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={item.onExecute}
                    className={`w-full text-right px-3 py-2 rounded-2xl flex items-center justify-between gap-3 transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-sm translate-x-[-2px]'
                        : 'hover:bg-slate-100/90 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate">{item.title}</div>
                        {item.subtitle && (
                          <div
                            className={`text-[10.5px] truncate mt-0.5 ${
                              isSelected ? 'text-slate-300' : 'text-slate-500'
                            }`}
                          >
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.badge && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                            isSelected
                              ? 'bg-white/15 text-white border-white/20'
                              : item.badgeColor || 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      <CornerDownLeft
                        className={`w-3.5 h-3.5 transition-opacity ${
                          isSelected ? 'opacity-100 text-teal-300' : 'opacity-0'
                        }`}
                      />
                    </div>
                  </button>
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-[10.5px] text-slate-500 font-semibold">
          <div className="flex items-center gap-3">
            <span>↑↓ جابه‌جایی</span>
            <span>↵ اجرا یا درج قالب</span>
            <span>Esc بستن</span>
          </div>
          <span>جستجوگر سریع رادیورپورت (Ctrl+K)</span>
        </div>
      </div>
    </div>
  );
};
