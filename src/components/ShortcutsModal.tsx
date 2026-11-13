import React, { useState } from 'react';
import { MedicalShortcut, MedicalTemplate, Modality } from '../types';
import { Zap, X, Plus, Search, Trash2, Sparkles, Keyboard, SpellCheck, Layers, AlertTriangle } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: MedicalShortcut[];
  templates?: MedicalTemplate[];
  onAddShortcut: (shortcut: Omit<MedicalShortcut, 'id'>) => void;
  onDeleteShortcut: (id: string) => void;
}

const PRESET_HOTKEY_COMBOS = [
  'Alt+T',
  'Alt+M',
  'Alt+B',
  'Alt+K',
  'Alt+P',
  'Alt+L',
  'Alt+R',
  'Ctrl+Shift+1',
  'Ctrl+Shift+2',
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose,
  shortcuts,
  templates = [],
  onAddShortcut,
  onDeleteShortcut,
}) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  // New shortcut form fields
  const [shortcutActionMode, setShortcutActionMode] = useState<'text' | 'template'>('text');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [trigger, setTrigger] = useState('');
  const [label, setLabel] = useState('');
  const [expansion, setExpansion] = useState('');
  const [category, setCategory] = useState<MedicalShortcut['category']>('pathology');
  const [shortcutModality, setShortcutModality] = useState<Modality | 'all'>('all');
  const [isAutocorrect, setIsAutocorrect] = useState(false);
  const [hotkey, setHotkey] = useState('');
  const [isRecordingHotkey, setIsRecordingHotkey] = useState(false);

  // Interactive tester
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState('');

  if (!isOpen) return null;

  const conflictingShortcut = hotkey
    ? shortcuts.find((s) => s.hotkey && s.hotkey.toLowerCase() === hotkey.toLowerCase())
    : undefined;

  const handleTestChange = (val: string) => {
    setTestInput(val);
    let expanded = val;
    for (const sc of shortcuts) {
      if (sc.trigger && val.toLowerCase().includes(sc.trigger.toLowerCase())) {
        const reg = new RegExp(sc.trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        expanded = val.replace(reg, sc.expansion);
        break;
      }
    }
    setTestResult(expanded);
  };

  const handleRecordKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Escape') {
      setHotkey('');
      setIsRecordingHotkey(false);
      return;
    }

    // Ignore bare modifier presses
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
      return;
    }

    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');

    // Normalize key character (handle Persian keyboard layout when Alt/Ctrl is held)
    let keyName = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    if (e.code && e.code.startsWith('Key')) {
      keyName = e.code.replace('Key', '');
    } else if (e.code && e.code.startsWith('Digit')) {
      keyName = e.code.replace('Digit', '');
    }

    if (parts.length === 0 && !/^F([1-9]|1[0-2])$/.test(keyName)) {
      // Require at least Alt or Ctrl unless it's a Function key
      parts.push('Alt');
    }

    parts.push(keyName);
    setHotkey(parts.join('+'));
    setIsRecordingHotkey(false);
  };

  const handleTemplateSelectChange = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const foundTpl = templates.find((t) => t.id === tplId);
    if (foundTpl) {
      setLabel(`درج قالب: ${foundTpl.title}`);
      setShortcutModality(foundTpl.modality);
      const plainSummary = foundTpl.findingsHtml
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      setExpansion(plainSummary);
      if (!trigger.trim()) {
        setTrigger(`.tpl_${foundTpl.id.slice(-4)}`);
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (shortcutActionMode === 'template' && !selectedTemplateId) return;
    if (shortcutActionMode === 'text' && !expansion.trim()) return;

    const rawTrig =
      trigger.trim() ||
      (hotkey ? `.${hotkey.toLowerCase().replace(/[^a-z0-9]/g, '')}` : `.sc_${Date.now().toString().slice(-3)}`);
    const cleanTrigger = isAutocorrect
      ? rawTrig.replace(/^[.!]+/, '')
      : rawTrig.startsWith('.') || rawTrig.startsWith('!')
      ? rawTrig
      : `.${rawTrig}`;

    onAddShortcut({
      trigger: cleanTrigger,
      label: label.trim() || cleanTrigger,
      expansion: expansion.trim() || 'اعمال قالب آماده',
      category: isAutocorrect ? 'general' : category,
      modality: shortcutModality,
      hotkey: hotkey.trim() || undefined,
      targetTemplateId: shortcutActionMode === 'template' ? selectedTemplateId : undefined,
      isAutocorrect,
    });

    setTrigger('');
    setLabel('');
    setExpansion('');
    setHotkey('');
    setSelectedTemplateId('');
    setShortcutActionMode('text');
    setIsAutocorrect(false);
    setShowAddForm(false);
  };

  const filteredShortcuts = shortcuts.filter((sc) => {
    if (activeCategory === 'hotkey') {
      if (!sc.hotkey) return false;
    } else if (activeCategory === 'autocorrect') {
      if (!sc.isAutocorrect && sc.trigger.startsWith('.')) return false;
    } else if (activeCategory !== 'all' && sc.category !== activeCategory) {
      return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        sc.trigger.toLowerCase().includes(q) ||
        sc.label.toLowerCase().includes(q) ||
        sc.expansion.toLowerCase().includes(q) ||
        (sc.hotkey && sc.hotkey.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const renderKeycaps = (combo: string) => {
    const keys = combo.split('+').filter(Boolean);
    return (
      <span className="inline-flex items-center gap-1" dir="ltr">
        {keys.map((k, idx) => (
          <React.Fragment key={idx}>
            <kbd className="px-2 py-0.5 text-[11px] font-mono font-black bg-white text-indigo-950 border border-b-2 border-indigo-300 rounded-md shadow-2xs">
              {k}
            </kbd>
            {idx < keys.length - 1 && <span className="text-[10px] text-indigo-400 font-bold">+</span>}
          </React.Fragment>
        ))}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-linear-to-r from-amber-600 to-orange-500 text-white flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
              <Keyboard className="w-5 h-5 text-amber-100" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base">
                ویرایشگر گرافیکی میانبرهای کیبورد (Alt+T)، شورتکات‌ها و تصحیح خودکار
              </h3>
              <p className="text-[11px] text-amber-100 mt-0.5">
                اختصاص ترکیب کلیدی دلخواه (مثل Alt+T) به عبارات متنی طولانی یا قالب‌های آماده + شورتکات‌های متنی (.abd)
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
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>جعبه آزمایش زنده شورتکات و تصحیح خودکار:</span>
              </div>
              <span className="text-[10px] font-bold text-amber-800 bg-white px-2 py-0.5 rounded-lg border border-amber-200">
                در محیط گزارش کافیست کلید میانبر (مثل Alt+T) را بفشارید یا کد را تایپ کرده و Space بزنید
              </span>
            </div>
            <input
              type="text"
              value={testInput}
              onChange={(e) => handleTestChange(e.target.value)}
              placeholder="اینجا کلمه یا کد شورتکات (.abd یا abd یا unrem) را جهت تست تایپ کنید..."
              className="w-full text-xs p-2 rounded-xl border border-amber-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            {testResult && testResult !== testInput && (
              <div className="text-xs p-2 bg-white rounded-xl border border-emerald-300 text-emerald-900 animate-fadeIn">
                <span className="font-bold ml-1">خروجی بسط یافته:</span>
                <span>{testResult}</span>
              </div>
            )}
          </div>

          {/* Controls: Category Filter & Add Button */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  'all',
                  'hotkey',
                  'autocorrect',
                  'normal',
                  'pathology',
                  'impression',
                  'recommendation',
                ] as const
              ).map((cat) => {
                const names: Record<string, string> = {
                  all: 'همه',
                  hotkey: '⌨️ میانبرهای کیبورد (Alt+T)',
                  autocorrect: '✨ تصحیح خودکار بدون نقطه',
                  normal: 'نرمال',
                  pathology: 'پاتولوژی',
                  impression: 'جمع‌بندی',
                  recommendation: 'توصیه',
                };
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
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
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>+ ویرایشگر گرافیکی میانبر کیبورد / شورتکات جدید</span>
            </button>
          </div>

          {/* Graphical Custom Keyboard Shortcut & Macro Studio */}
          {showAddForm && (
            <form
              onSubmit={handleSave}
              className="p-4 bg-slate-50 border-2 border-indigo-200 rounded-2xl space-y-3.5 animate-fadeIn"
            >
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <Keyboard className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-black text-slate-900">
                    ویرایشگر گرافیکی ساخت میانبر کیبورد (Custom Keyboard Shortcut)
                  </span>
                </div>

                {/* Action Mode Selector: Insert Long Phrase OR Apply Specific Template */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShortcutActionMode('text')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                      shortcutActionMode === 'text'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Zap className="w-3 h-3" />
                    <span>۱. جایگذاری عبارت متنی طولانی</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShortcutActionMode('template')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                      shortcutActionMode === 'template'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    <span>۲. درج کامل یک قالب آماده خاص</span>
                  </button>
                </div>
              </div>

              {/* Graphical Key Combination Recorder Box */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                    <Keyboard className="w-4 h-4 text-indigo-600" />
                    <span>گام ۱: ضبط گرافیکی ترکیب کلید کیبورد (یا انتخاب از کلیدهای پیشنهادی):</span>
                  </label>
                  {hotkey && (
                    <button
                      type="button"
                      onClick={() => setHotkey('')}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                    >
                      پاک کردن کلید ({hotkey})
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                  <div
                    tabIndex={0}
                    onFocus={() => setIsRecordingHotkey(true)}
                    onBlur={() => setIsRecordingHotkey(false)}
                    onKeyDown={handleRecordKeyDown}
                    className={`h-12 px-4 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all select-none ${
                      isRecordingHotkey
                        ? 'bg-amber-50 border-amber-500 ring-3 ring-amber-400/25'
                        : hotkey
                        ? 'bg-white border-indigo-500 shadow-2xs'
                        : 'bg-white border-dashed border-indigo-300 hover:border-indigo-500'
                    }`}
                  >
                    {isRecordingHotkey ? (
                      <span className="text-xs font-extrabold text-amber-900 animate-pulse">
                        ⌨️ هم‌اکنون ترکیب کلید دلخواه (مثلاً Alt + T) را روی کیبورد بفشارید...
                      </span>
                    ) : hotkey ? (
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-slate-600">ترکیب کلیدی ثبت‌شده:</span>
                        {renderKeycaps(hotkey)}
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-slate-500">
                        اینجا کلیک کنید و کلیدها را همزمان بفشارید (مثلاً Alt+T)
                      </span>
                    )}
                  </div>

                  {/* Quick 1-click preset key combinations */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-indigo-900">
                      یا انتخاب سریع با یک کلیک:
                    </div>
                    <div className="flex items-center gap-1 flex-wrap" dir="ltr">
                      {PRESET_HOTKEY_COMBOS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setHotkey(preset)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                            hotkey.toLowerCase() === preset.toLowerCase()
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                              : 'bg-white hover:bg-indigo-100 text-slate-700 border-indigo-200'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {conflictingShortcut && (
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900 bg-amber-100/80 px-3 py-1.5 rounded-xl border border-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>
                      توجه: کلید «{hotkey}» قبلاً برای «{conflictingShortcut.label}» ثبت شده است. با ذخیره جدید جایگزین خواهد شد.
                    </span>
                  </div>
                )}
              </div>

              {/* Step 2: Template Picker (if mode === 'template') OR Text Phrase & Trigger */}
              {shortcutActionMode === 'template' ? (
                <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2.5">
                  <label className="block text-xs font-bold text-slate-800">
                    گام ۲: انتخاب قالب آماده جهت درج با فشردن {hotkey || 'کلید میانبر'}:
                  </label>
                  <select
                    required
                    value={selectedTemplateId}
                    onChange={(e) => handleTemplateSelectChange(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-bold text-slate-900"
                  >
                    <option value="">-- یک قالب آماده از بانک قالب‌ها انتخاب کنید --</option>
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        [{tpl.modality === 'sonography' ? 'سونوگرافی' : tpl.modality === 'mri' ? 'ام‌آر‌آی' : 'سی‌تی‌اسکن'}] {tpl.title}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-slate-700">
                      گام ۲: مشخصات شورتکات و متن جایگزین:
                    </span>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAutocorrect}
                        onChange={(e) => setIsAutocorrect(e.target.checked)}
                        className="rounded text-teal-600"
                      />
                      <SpellCheck className="w-3.5 h-3.5 text-teal-600" />
                      <span>تصحیح خودکار واژه (بدون نیاز به نقطه در اول کلمه، مثل abd ⬅ abdomen)</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        {isAutocorrect
                          ? 'واژه مخفف یا املای اشتباه:'
                          : 'کد متنی شورتکات (با نقطه شروع می‌شود):'}
                      </label>
                      <input
                        type="text"
                        required={!hotkey}
                        value={trigger}
                        onChange={(e) => setTrigger(e.target.value)}
                        placeholder={isAutocorrect ? 'مثال: abd یا سونوگرفی' : 'مثال: .gall_poly'}
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white font-mono"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        عنوان راهنما:
                      </label>
                      <input
                        type="text"
                        required
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="مثال: تیروئید نرمال یا پولیپ کیسه صفرا"
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      متن کامل پزشکی یا پاراگرافی که با فشردن {hotkey || 'شورتکات'} در گزارش جایگذاری می‌شود:
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={expansion}
                      onChange={(e) => setExpansion(e.target.value)}
                      placeholder="متن کامل یا عبارت طولانی پزشکی را اینجا بنویسید..."
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white leading-relaxed"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as MedicalShortcut['category'])}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold"
                  >
                    <option value="normal">یافته نرمال</option>
                    <option value="pathology">پاتولوژی</option>
                    <option value="impression">جمع‌بندی (Impression)</option>
                    <option value="recommendation">توصیه (Recommendation)</option>
                    <option value="general">عمومی / تصحیح خودکار</option>
                  </select>

                  <select
                    value={shortcutModality}
                    onChange={(e) => setShortcutModality(e.target.value as Modality | 'all')}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold"
                  >
                    <option value="all">همه مدالیته‌ها</option>
                    <option value="sonography">سونوگرافی</option>
                    <option value="mri">ام‌آر‌آی</option>
                    <option value="ct">سی‌تی‌اسکن</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs cursor-pointer"
                  >
                    ذخیره میانبر کیبورد
                  </button>
                </div>
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
              placeholder="جستجو در میانبرهای کیبورد (Alt+T)، کدهای شورتکات و واژه‌های تصحیح خودکار..."
              className="w-full text-xs pr-9 pl-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
            />
          </div>

          {/* Shortcuts Grid List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredShortcuts.map((sc) => (
              <div
                key={sc.id}
                className="p-3 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl transition-all flex flex-col justify-between gap-2 shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      {sc.targetTemplateId && <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                      <span>{sc.label}</span>
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {sc.hotkey && renderKeycaps(sc.hotkey)}
                      {sc.trigger && (
                        <kbd
                          dir="ltr"
                          className={`text-xs font-mono font-bold px-2 py-0.5 rounded shadow-2xs border ${
                            sc.isAutocorrect || !sc.trigger.startsWith('.')
                              ? 'bg-teal-50 text-teal-900 border-teal-200'
                              : 'bg-amber-50 text-amber-900 border-amber-200'
                          }`}
                        >
                          {sc.trigger} + Space
                        </kbd>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1.5 line-clamp-3 leading-relaxed">
                    {sc.expansion}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400">
                    {sc.targetTemplateId
                      ? 'میانبر درج قالب آماده'
                      : sc.isAutocorrect || !sc.trigger.startsWith('.')
                      ? 'تصحیح خودکار پزشکی'
                      : sc.category === 'normal'
                      ? 'یافته طبیعی'
                      : sc.category === 'pathology'
                      ? 'پاتولوژی'
                      : sc.category === 'impression'
                      ? 'جمع‌بندی'
                      : 'توصیه'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteShortcut(sc.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer"
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
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl shadow-xs cursor-pointer"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};

