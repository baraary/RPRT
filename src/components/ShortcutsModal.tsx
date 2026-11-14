import React, { useState, useEffect, useMemo } from 'react';
import { MedicalShortcut, MedicalTemplate, Modality } from '../types';
import { STANDARD_ORGAN_DEFINITIONS } from '../data/defaultShortcuts';
import {
  Zap,
  X,
  Search,
  Trash2,
  Sparkles,
  Keyboard,
  SpellCheck,
  Layers,
  AlertTriangle,
  Pencil,
  Check,
  RotateCcw,
  Plus,
} from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: MedicalShortcut[];
  templates?: MedicalTemplate[];
  onAddShortcut: (shortcut: Omit<MedicalShortcut, 'id'>) => void;
  onUpdateShortcut?: (id: string, updates: Partial<MedicalShortcut>) => void;
  onDeleteShortcut: (id: string) => void;
  onResetDefaults?: () => void;
  initialOrganFilter?: string;
}

const PRESET_HOTKEY_COMBOS = [
  'Alt+T',
  'Alt+M',
  'Alt+G',
  'Alt+B',
  'Alt+K',
  'Alt+P',
  'Alt+L',
  'Alt+R',
  'Ctrl+Shift+1',
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose,
  shortcuts,
  templates = [],
  onAddShortcut,
  onUpdateShortcut,
  onDeleteShortcut,
  onResetDefaults,
  initialOrganFilter = 'all',
}) => {
  const [search, setSearch] = useState('');
  const [activeOrgan, setActiveOrgan] = useState<string>(initialOrganFilter || 'all');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  // Sync initialOrganFilter whenever modal opens with a specific organ pre-selected
  useEffect(() => {
    if (isOpen) {
      setActiveOrgan(initialOrganFilter || 'all');
    }
  }, [isOpen, initialOrganFilter]);

  // Inline Editing state for any existing card
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editExpansion, setEditExpansion] = useState('');
  const [editTrigger, setEditTrigger] = useState('');
  const [editOrgan, setEditOrgan] = useState('کبد');
  const [editCategory, setEditCategory] = useState<MedicalShortcut['category']>('normal');
  const [editHotkey, setEditHotkey] = useState('');

  // New shortcut / organ sentence form fields
  const [shortcutActionMode, setShortcutActionMode] = useState<'text' | 'template'>('text');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [organ, setOrgan] = useState<string>('کبد');
  const [customOrganName, setCustomOrganName] = useState<string>('');
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

  // Compute all available organs (Standard + any custom organ names in shortcuts)
  const allOrganNames = useMemo(() => {
    const standardNames = STANDARD_ORGAN_DEFINITIONS.map((d) => d.organ);
    const dynamicSet = new Set<string>(standardNames);
    shortcuts.forEach((sc) => {
      if (sc.organ && sc.organ !== 'عمومی') {
        dynamicSet.add(sc.organ);
      }
    });
    return [...Array.from(dynamicSet), 'عمومی'];
  }, [shortcuts]);

  // Pre-fill organ in Add Form when user filters by a specific organ
  useEffect(() => {
    if (activeOrgan !== 'all') {
      setOrgan(activeOrgan);
    }
  }, [activeOrgan]);

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

    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
      return;
    }

    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');

    let keyName = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    if (e.code && e.code.startsWith('Key')) {
      keyName = e.code.replace('Key', '');
    } else if (e.code && e.code.startsWith('Digit')) {
      keyName = e.code.replace('Digit', '');
    }

    if (parts.length === 0 && !/^F([1-9]|1[0-2])$/.test(keyName)) {
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

  const startEditingShortcut = (sc: MedicalShortcut) => {
    setEditingId(sc.id);
    setEditLabel(sc.label);
    setEditExpansion(sc.expansion);
    setEditTrigger(sc.trigger || '');
    setEditOrgan(sc.organ || 'عمومی');
    setEditCategory(sc.category);
    setEditHotkey(sc.hotkey || '');
  };

  const saveEditingShortcut = (id: string) => {
    if (!onUpdateShortcut) return;
    const rawTrig = editTrigger.trim() || `.sc_${Date.now().toString().slice(-3)}`;
    const cleanTrig = rawTrig.startsWith('.') || !rawTrig.includes(' ') ? rawTrig : `.${rawTrig}`;
    onUpdateShortcut(id, {
      label: editLabel.trim() || 'جمله آماده',
      expansion: editExpansion.trim(),
      trigger: cleanTrig,
      organ: editOrgan,
      category: editCategory,
      hotkey: editHotkey.trim() || undefined,
    });
    setEditingId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (shortcutActionMode === 'template' && !selectedTemplateId) return;
    if (shortcutActionMode === 'text' && !expansion.trim()) return;

    const finalOrgan =
      organ === '__custom__' ? customOrganName.trim() || 'عمومی' : organ || 'عمومی';

    const rawTrig =
      trigger.trim() ||
      (hotkey
        ? `.${hotkey.toLowerCase().replace(/[^a-z0-9]/g, '')}`
        : `.sc_${Date.now().toString().slice(-3)}`);
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
      organ: finalOrgan,
      hotkey: hotkey.trim() || undefined,
      targetTemplateId: shortcutActionMode === 'template' ? selectedTemplateId : undefined,
      isAutocorrect,
    });

    setTrigger('');
    setLabel('');
    setExpansion('');
    setHotkey('');
    setCustomOrganName('');
    setSelectedTemplateId('');
    setShortcutActionMode('text');
    setIsAutocorrect(false);
    setShowAddForm(false);
  };

  const filteredShortcuts = shortcuts.filter((sc) => {
    // 1. Organ filter
    if (activeOrgan !== 'all') {
      const scOrgan = sc.organ || 'عمومی';
      if (scOrgan !== activeOrgan) return false;
    }

    // 2. Category filter
    if (activeCategory === 'hotkey') {
      if (!sc.hotkey) return false;
    } else if (activeCategory === 'autocorrect') {
      if (!sc.isAutocorrect && sc.trigger.startsWith('.')) return false;
    } else if (activeCategory !== 'all' && sc.category !== activeCategory) {
      return false;
    }

    // 3. Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        sc.trigger.toLowerCase().includes(q) ||
        sc.label.toLowerCase().includes(q) ||
        sc.expansion.toLowerCase().includes(q) ||
        (sc.organ && sc.organ.toLowerCase().includes(q)) ||
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
    <div
      onClick={onClose}
      className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scaleIn"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-linear-to-l from-slate-900 via-slate-900 to-teal-950 text-white flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-teal-300" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base">
                بانک یکپارچه جملات اعضا، شورتکات‌ها (Space) و میانبرهای کیبورد
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5">
                هر تغییر یا جمله جدیدی که اینجا ثبت کنید هم در «انتخابگر وضعیت اعضا»، هم در «پنل کناری» و هم با تایپ کد + Space اعمال می‌شود
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onResetDefaults && (
              <button
                type="button"
                onClick={onResetDefaults}
                className="h-8 px-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer"
                title="بازگردانی تمام جملات اعضا و شورتکات‌ها به حالت پیش‌فرض"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">بازنشانی پیش‌فرض</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 text-xs font-bold shrink-0 transition-colors cursor-pointer"
            >
              <span>بستن</span>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
          {/* Organ Filter Bar (نوار تفکیک اعضا و ارگان‌ها) */}
          <div className="p-2.5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-700">
                ۱. فیلتر بر اساس عضو / ارگان (مشترک با نوار وضعیت اعضا):
              </span>
              <span className="text-[10.5px] text-slate-500 font-semibold">
                {filteredShortcuts.length} جمله آماده
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveOrgan('all')}
                className={`text-xs px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                  activeOrgan === 'all'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-teal-50'
                }`}
              >
                همه اعضا ({shortcuts.length})
              </button>
              {allOrganNames.map((orgName) => {
                const count = shortcuts.filter((s) => (s.organ || 'عمومی') === orgName).length;
                if (count === 0 && activeOrgan !== orgName) return null;
                return (
                  <button
                    key={orgName}
                    type="button"
                    onClick={() => setActiveOrgan(orgName)}
                    className={`text-xs px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      activeOrgan === orgName
                        ? 'bg-teal-600 text-white shadow-2xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-teal-50'
                    }`}
                  >
                    <span>{orgName}</span>
                    <span
                      className={`text-[10px] font-mono px-1 rounded ${
                        activeOrgan === orgName ? 'bg-teal-800 text-teal-100' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Controls: Category Filter & Add Button */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  'all',
                  'normal',
                  'pathology',
                  'impression',
                  'recommendation',
                  'hotkey',
                  'autocorrect',
                ] as const
              ).map((cat) => {
                const names: Record<string, string> = {
                  all: 'همه نوع‌ها',
                  normal: '✓ حالت نرمال',
                  pathology: '⚠️ پاتولوژی',
                  impression: 'جمع‌بندی',
                  recommendation: 'توصیه',
                  hotkey: '⌨️ کلید ترکیبی (Alt)',
                  autocorrect: '✨ تصحیح خودکار',
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
              className="flex items-center gap-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-1.5 rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                {showAddForm
                  ? 'بستن فرم افزودن'
                  : activeOrgan !== 'all'
                  ? `+ افزودن جمله / شورتکات جدید برای «${activeOrgan}»`
                  : '+ افزودن جمله عضو / شورتکات جدید'}
              </span>
            </button>
          </div>

          {/* Add New Organ Sentence / Shortcut Studio */}
          {showAddForm && (
            <form
              onSubmit={handleSave}
              className="p-4 bg-teal-50/50 border-2 border-teal-200 rounded-2xl space-y-3.5 animate-fadeIn"
            >
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-teal-200/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-teal-700" />
                  <span className="text-xs font-black text-slate-900">
                    افزودن جمله آماده عضو، شورتکات متنی (.code) یا میانبر کیبورد (Alt+Key)
                  </span>
                </div>

                {/* Action Mode Selector */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShortcutActionMode('text')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                      shortcutActionMode === 'text'
                        ? 'bg-teal-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Zap className="w-3 h-3" />
                    <span>۱. جمله عضو / شورتکات متنی</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShortcutActionMode('template')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                      shortcutActionMode === 'template'
                        ? 'bg-teal-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    <span>۲. اتصال کلید میانبر به قالب آماده</span>
                  </button>
                </div>
              </div>

              {shortcutActionMode === 'template' ? (
                <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2.5">
                  <label className="block text-xs font-bold text-slate-800">
                    انتخاب قالب آماده جهت درج با فشردن {hotkey || 'کلید میانبر'}:
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
                  {/* Row 1: Organ, Category (Normal/Pathology), Title, Trigger */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        عضو / ارگان مربوطه:
                      </label>
                      <select
                        value={organ}
                        onChange={(e) => setOrgan(e.target.value)}
                        className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
                      >
                        {allOrganNames.map((orgName) => (
                          <option key={orgName} value={orgName}>
                            {orgName}
                          </option>
                        ))}
                        <option value="__custom__">+ تعریف عضو جدید...</option>
                      </select>
                      {organ === '__custom__' && (
                        <input
                          type="text"
                          required
                          value={customOrganName}
                          onChange={(e) => setCustomOrganName(e.target.value)}
                          placeholder="نام عضو جدید (مثلاً: پانکراس)"
                          className="mt-1.5 w-full text-xs p-2 rounded-xl border border-teal-400 bg-white font-bold"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        نوع وضعیت:
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as MedicalShortcut['category'])}
                        className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
                      >
                        <option value="normal">✓ یافته نرمال (سبز)</option>
                        <option value="pathology">⚠️ پاتولوژی (کهربایی)</option>
                        <option value="impression">جمع‌بندی (Impression)</option>
                        <option value="recommendation">توصیه (Recommendation)</option>
                        <option value="general">عمومی / تصحیح خودکار</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        عنوان گزینه (در منوی عضو):
                      </label>
                      <input
                        type="text"
                        required
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="مثال: کبد چرب گرید ۱"
                        className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        کد شورتکات با Space (اختیاری):
                      </label>
                      <input
                        type="text"
                        value={trigger}
                        onChange={(e) => setTrigger(e.target.value)}
                        placeholder="مثال: .fatty1"
                        className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white font-mono"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* Row 2: Full Medical Sentence */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      متن کامل جمله پزشکی (که در گزارش جایگزین یا درج می‌شود):
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={expansion}
                      onChange={(e) => setExpansion(e.target.value)}
                      placeholder="متن کامل یافته عضو یا عبارت پزشکی را اینجا بنویسید..."
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white leading-relaxed"
                    />
                  </div>
                </>
              )}

              {/* Optional Keyboard Hotkey Recorder + Modality */}
              <div className="p-3 bg-white/90 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <Keyboard className="w-3.5 h-3.5 text-indigo-600" />
                    <span>کلید میانبر کیبورد (اختیاری):</span>
                  </span>
                  <div
                    tabIndex={0}
                    onFocus={() => setIsRecordingHotkey(true)}
                    onBlur={() => setIsRecordingHotkey(false)}
                    onKeyDown={handleRecordKeyDown}
                    className={`h-8 px-3 rounded-lg border flex items-center gap-2 cursor-pointer text-xs font-bold select-none ${
                      isRecordingHotkey
                        ? 'bg-amber-50 border-amber-500 text-amber-900'
                        : hotkey
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-950'
                        : 'bg-slate-50 border-dashed border-slate-300 text-slate-500'
                    }`}
                  >
                    {isRecordingHotkey
                      ? 'کلیدها را بفشارید (مثلاً Alt+T)...'
                      : hotkey
                      ? renderKeycaps(hotkey)
                      : 'کلیک جهت ضبط کلید (مثل Alt+T)'}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap" dir="ltr">
                    {PRESET_HOTKEY_COMBOS.slice(0, 5).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setHotkey(preset)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border cursor-pointer ${
                          hotkey.toLowerCase() === preset.toLowerCase()
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  {hotkey && (
                    <button
                      type="button"
                      onClick={() => setHotkey('')}
                      className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      حذف کلید
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAutocorrect}
                      onChange={(e) => setIsAutocorrect(e.target.checked)}
                      className="rounded text-teal-600"
                    />
                    <SpellCheck className="w-3.5 h-3.5 text-teal-600" />
                    <span>تصحیح خودکار بدون نقطه</span>
                  </label>

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
              </div>

              {conflictingShortcut && (
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900 bg-amber-100/80 px-3 py-1.5 rounded-xl border border-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>
                    توجه: کلید «{hotkey}» قبلاً برای «{conflictingShortcut.label}» ثبت شده است.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>ذخیره در بانک جملات و شورتکات‌ها</span>
                </button>
              </div>
            </form>
          )}

          {/* Search & Quick Live Tester Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            <div className="md:col-span-7 relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو در نام عضو (کبد، کیسه صفرا...)، متن جمله یا کد شورتکات (.fatty1)..."
                className="w-full text-xs pr-9 pl-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-5 relative">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 absolute right-3 top-2.5" />
              <input
                type="text"
                value={testInput}
                onChange={(e) => handleTestChange(e.target.value)}
                placeholder="تست زنده کد شورتکات (مثلاً تایپ کنید: .liv یا .fatty1)..."
                className="w-full text-xs pr-8 pl-3 py-2 rounded-xl border border-amber-200 bg-amber-50/50 focus:bg-white focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {testResult && testResult !== testInput && (
            <div className="text-xs p-2.5 bg-emerald-50 rounded-xl border border-emerald-300 text-emerald-950 animate-fadeIn">
              <span className="font-bold ml-1">خروجی بسط‌یافته شورتکات:</span>
              <span>{testResult}</span>
            </div>
          )}

          {/* Unified Cards Grid (With Inline Edit & Delete) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredShortcuts.map((sc) => {
              const isEditing = editingId === sc.id;

              if (isEditing) {
                return (
                  <div
                    key={sc.id}
                    className="p-3.5 bg-teal-50/70 border-2 border-teal-400 rounded-2xl space-y-2.5 shadow-sm animate-fadeIn"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          عضو مربوطه:
                        </label>
                        <select
                          value={editOrgan}
                          onChange={(e) => setEditOrgan(e.target.value)}
                          className="w-full text-xs px-2 py-1 rounded-lg border border-slate-300 bg-white font-bold"
                        >
                          {allOrganNames.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          نوع یافته:
                        </label>
                        <select
                          value={editCategory}
                          onChange={(e) =>
                            setEditCategory(e.target.value as MedicalShortcut['category'])
                          }
                          className="w-full text-xs px-2 py-1 rounded-lg border border-slate-300 bg-white font-bold"
                        >
                          <option value="normal">✓ نرمال</option>
                          <option value="pathology">⚠️ پاتولوژی</option>
                          <option value="impression">جمع‌بندی</option>
                          <option value="recommendation">توصیه</option>
                          <option value="general">عمومی</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          عنوان گزینه:
                        </label>
                        <input
                          type="text"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="w-full text-xs px-2.5 py-1 rounded-lg border border-slate-300 bg-white font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                          کد شورتکات:
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={editTrigger}
                          onChange={(e) => setEditTrigger(e.target.value)}
                          className="w-full text-xs px-2 py-1 rounded-lg border border-slate-300 bg-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        متن کامل جمله پزشکی:
                      </label>
                      <textarea
                        rows={3}
                        value={editExpansion}
                        onChange={(e) => setEditExpansion(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white leading-relaxed"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        انصراف
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEditingShortcut(sc.id)}
                        className="px-3.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>ذخیره تغییرات</span>
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={sc.id}
                  className="p-3 bg-white border border-slate-200 hover:border-teal-300 rounded-2xl transition-all flex flex-col justify-between gap-2 shadow-2xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {sc.organ && (
                          <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-black shrink-0">
                            {sc.organ}
                          </span>
                        )}
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {sc.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                        {sc.hotkey && renderKeycaps(sc.hotkey)}
                        {sc.trigger && (
                          <kbd
                            dir="ltr"
                            className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded shadow-2xs border ${
                              sc.isAutocorrect || !sc.trigger.startsWith('.')
                                ? 'bg-teal-50 text-teal-900 border-teal-200'
                                : 'bg-amber-50 text-amber-900 border-amber-200'
                            }`}
                          >
                            {sc.trigger}
                          </kbd>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 mt-1.5 line-clamp-3 leading-relaxed">
                      {sc.expansion}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        sc.category === 'normal'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : sc.category === 'pathology'
                          ? 'bg-amber-50 text-amber-900 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {sc.targetTemplateId
                        ? 'میانبر درج قالب آماده'
                        : sc.isAutocorrect || !sc.trigger.startsWith('.')
                        ? 'تصحیح خودکار پزشکی'
                        : sc.category === 'normal'
                        ? '✓ حالت نرمال'
                        : sc.category === 'pathology'
                        ? 'پاتولوژی'
                        : sc.category === 'impression'
                        ? 'جمع‌بندی'
                        : 'توصیه'}
                    </span>

                    <div className="flex items-center gap-1">
                      {onUpdateShortcut && (
                        <button
                          type="button"
                          onClick={() => startEditingShortcut(sc)}
                          className="px-2 py-1 rounded-lg text-[11px] font-bold text-teal-700 hover:bg-teal-50 border border-transparent hover:border-teal-200 flex items-center gap-1 transition-colors cursor-pointer"
                          title="ویرایش متن جمله یا کد شورتکات"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>ویرایش</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteShortcut(sc.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 cursor-pointer"
                        title="حذف این مورد"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            💡 نکته: جملات هر عضو هم از طریق دکمه‌های بالای گزارش («وضعیت اعضا») و هم با تایپ کد شورتکات + Space در دسترس هستند.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-xl shadow-xs cursor-pointer"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
