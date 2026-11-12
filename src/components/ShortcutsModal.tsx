import React, { useState } from 'react';
import { MedicalShortcut, Modality } from '../types';
import { Zap, X, Plus, Search, Trash2, Check, Sparkles } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: MedicalShortcut[];
  onAddShortcut: (shortcut: Omit<MedicalShortcut, 'id'>) => void;
  onDeleteShortcut: (id: string) => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose,
  shortcuts,
  onAddShortcut,
  onDeleteShortcut,
}) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  // New shortcut form fields
  const [trigger, setTrigger] = useState('');
  const [label, setLabel] = useState('');
  const [expansion, setExpansion] = useState('');
  const [category, setCategory] = useState<MedicalShortcut['category']>('pathology');
  const [shortcutModality, setShortcutModality] = useState<Modality | 'all'>('all');

  // Interactive tester
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState('');

  if (!isOpen) return null;

  const handleTestChange = (val: string) => {
    setTestInput(val);
    let expanded = val;
    for (const sc of shortcuts) {
      if (val.includes(sc.trigger)) {
        expanded = val.replace(sc.trigger, sc.expansion);
        break;
      }
    }
    setTestResult(expanded);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trigger.trim() || !expansion.trim()) return;

    // ensure trigger starts with . or ! or custom symbol if not present
    const cleanTrigger = trigger.startsWith('.') || trigger.startsWith('!') ? trigger : `.${trigger}`;

    onAddShortcut({
      trigger: cleanTrigger,
      label: label.trim() || cleanTrigger,
      expansion: expansion.trim(),
      category,
      modality: shortcutModality,
    });

    setTrigger('');
    setLabel('');
    setExpansion('');
    setShowAddForm(false);
  };

  const filteredShortcuts = shortcuts.filter((sc) => {
    if (activeCategory !== 'all' && sc.category !== activeCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        sc.trigger.toLowerCase().includes(q) ||
        sc.label.toLowerCase().includes(q) ||
        sc.expansion.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-linear-to-r from-amber-600 to-orange-500 text-white flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Zap className="w-5 h-5 text-amber-200 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base">
                مدیریت شورتکات‌ها و ماکروهای متن پزشکی (Text Expansion)
              </h3>
              <p className="text-[11px] text-amber-100 mt-0.5">
                تعریف کدهای اختصاری برای بسط فوری جملات پرکاربرد حین تایپ گزارش
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-2.5 rounded-xl bg-black/20 hover:bg-rose-600 text-white border border-white/20 hover:border-rose-500 flex items-center gap-1 text-xs font-bold shrink-0 transition-colors cursor-pointer"
          >
            <span>بستن</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Interactive Test Playground */}
          <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>جعبه آزمایش زنده شورتکات‌ها:</span>
            </div>
            <p className="text-[11px] text-amber-800">
              در کادر زیر مثلاً تایپ کنید <kbd className="bg-amber-200/80 px-1 py-0.5 rounded font-mono text-[10px]">.norm</kbd> یا <kbd className="bg-amber-200/80 px-1 py-0.5 rounded font-mono text-[10px]">.krec</kbd> یا <kbd className="bg-amber-200/80 px-1 py-0.5 rounded font-mono text-[10px]">.fatty1</kbd> تا تبدیل فوری آن را مشاهده کنید:
            </p>
            <input
              type="text"
              value={testInput}
              onChange={(e) => handleTestChange(e.target.value)}
              placeholder="اینجا کلمه یا شورتکات مورد نظر را تست کنید..."
              className="w-full text-xs p-2 rounded-xl border border-amber-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            {testResult && testResult !== testInput && (
              <div className="text-xs p-2 bg-white rounded-xl border border-emerald-300 text-emerald-900 animate-fadeIn">
                <span className="font-bold ml-1">خروجی بسط یافته:</span>
                <span>{testResult}</span>
              </div>
            )}
          </div>

          {/* Controls: Search, Category, Add Button */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              {(['all', 'normal', 'pathology', 'impression', 'recommendation'] as const).map((cat) => {
                const names: Record<string, string> = {
                  all: 'همه',
                  normal: 'نرمال',
                  pathology: 'پاتولوژی',
                  impression: 'جمع‌بندی',
                  recommendation: 'توصیه',
                };
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      activeCategory === cat
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {names[cat]}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>تعریف شورتکات جدید</span>
            </button>
          </div>

          {/* Add New Shortcut Form (Collapsible) */}
          {showAddForm && (
            <form onSubmit={handleSave} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-fadeIn">
              <div className="text-xs font-bold text-slate-800">ایجاد شورتکات جدید</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    کد شورتکات (با نقطه یا علامت شروع شود):
                  </label>
                  <input
                    type="text"
                    required
                    value={trigger}
                    onChange={(e) => setTrigger(e.target.value)}
                    placeholder="مثال: .gall_poly"
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-mono"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    عنوان اختصاری:
                  </label>
                  <input
                    type="text"
                    required
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="مثال: پولیپ کیسه صفرا"
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  متن کامل یا جمله‌ای که باید جایگزین شود:
                </label>
                <textarea
                  required
                  rows={3}
                  value={expansion}
                  onChange={(e) => setExpansion(e.target.value)}
                  placeholder="متن کامل پزشکی را اینجا بنویسید..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-xs"
                >
                  ذخیره شورتکات
                </button>
              </div>
            </form>
          )}

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در شورتکات‌ها و تعاریف..."
              className="w-full text-xs pr-9 pl-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
            />
          </div>

          {/* Shortcuts Grid List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredShortcuts.map((sc) => (
              <div
                key={sc.id}
                className="p-3 bg-white border border-slate-200 hover:border-amber-300 rounded-xl transition-all flex flex-col justify-between gap-2 shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{sc.label}</span>
                    <kbd className="text-xs font-mono font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded shadow-2xs">
                      {sc.trigger}
                    </kbd>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1.5 line-clamp-3 leading-relaxed">
                    {sc.expansion}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400">
                    {sc.category === 'normal'
                      ? 'یافته طبیعی'
                      : sc.category === 'pathology'
                      ? 'پاتولوژی'
                      : sc.category === 'impression'
                      ? 'جمع‌بندی'
                      : 'توصیه'}
                  </span>
                  <button
                    onClick={() => onDeleteShortcut(sc.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded"
                    title="حذف شورتکات"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl shadow-xs"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
