import React, { useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignRight,
  AlignCenter,
  AlignLeft,
  AlignJustify,
  List,
  ListOrdered,
  Table as TableIcon,
  Search,
  Mic,
  MicOff,
  RotateCcw,
  RotateCw,
  RemoveFormatting,
  Palette,
  Highlighter,
  ChevronDown,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface EditorToolbarProps {
  onExecCommand: (command: string, value?: string) => void;
  onInsertTable: (rows: number, cols: number, withHeader?: boolean) => void;
  onInsertPresetTable?: (presetId: 'kidneys' | 'thyroid' | 'fetal' | 'pelvis' | 'lesions') => void;
  onInsertSymbol: (symbol: string) => void;
  onFindReplace: (find: string, replace: string, replaceAll: boolean) => void;
  wordCount: number;
  charCount: number;
  isListening: boolean;
  onToggleVoice: () => void;
  hasSpeechSupport: boolean;
  activeDirection: 'rtl' | 'ltr';
  onToggleDirection: () => void;
  onFormatBlock: (tag: string) => void;
  fonts?: { id: string; name: string; family: string; url?: string }[];
  defaultFont?: string;
  onChangeDefaultFont?: (fontFamily: string) => void;
  onOpenFontManager?: () => void;
  editorZoom?: number;
  onChangeZoom?: (newZoom: number) => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onExecCommand,
  onInsertTable,
  onInsertPresetTable,
  onInsertSymbol,
  onFindReplace,
  wordCount,
  charCount,
  isListening,
  onToggleVoice,
  hasSpeechSupport,
  activeDirection,
  onToggleDirection,
  onFormatBlock,
  fonts = [],
  defaultFont = 'Vazirmatn',
  onChangeDefaultFont,
  onOpenFontManager,
  editorZoom = 100,
  onChangeZoom,
}) => {
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [hoverGrid, setHoverGrid] = useState<{ r: number; c: number }>({ r: 3, c: 3 });
  const [tableWithHeader, setTableWithHeader] = useState(true);
  const [showSymbolMenu, setShowSymbolMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [activeTextColor, setActiveTextColor] = useState<string>('#0f172a');
  const [activeHighlightColor, setActiveHighlightColor] = useState<string>('#fef08a');
  const colorMenuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (colorMenuRef.current && !colorMenuRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
        setShowHighlightPicker(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const defaultFontFamilies = [
    { label: 'وزیرمتن (استاندارد)', value: 'Vazirmatn' },
    { label: 'ساحل (Sahel)', value: "'Sahel', sans-serif" },
    { label: 'صمیم (Samim)', value: "'Samim', sans-serif" },
    { label: 'بی‌نازنین (B Nazanin)', value: "'B Nazanin', Tahoma, Arial" },
    { label: 'شبنم (Shabnam)', value: "'Shabnam', sans-serif" },
    { label: 'بی‌یکان (B Yekan)', value: "'B Yekan', Tahoma, Arial" },
    { label: 'ایران‌سنس (IRANSans)', value: "'IRANSans', Tahoma, sans-serif" },
    { label: 'نوتو عربیک (Noto Sans Arabic)', value: "'Noto Sans Arabic', sans-serif" },
    { label: 'تاهوما (Tahoma)', value: 'Tahoma, sans-serif' },
    { label: 'آریال (Arial)', value: 'Arial, sans-serif' },
    { label: 'تایمز (Times New Roman)', value: "'Times New Roman', serif" },
    { label: 'جت‌برینز مونو (کد/اعداد)', value: "'JetBrains Mono', monospace" },
  ];

  const availableFonts = fonts.length > 0
    ? fonts.map((f) => ({ label: f.name, value: f.family }))
    : defaultFontFamilies;

  const fontSizes = [
    { label: '۱۰ (خیلی ریز)', value: '1' },
    { label: '۱۲ (ریز)', value: '2' },
    { label: '۱۴ (متوسط - استاندارد)', value: '3' },
    { label: '۱۶ (متوسط بزرگ)', value: '4' },
    { label: '۱۸ (بزرگ)', value: '5' },
    { label: '۲۴ (عنوان)', value: '6' },
  ];

  const colors = [
    { hex: '#0f172a', label: 'مشکی استاندارد' },
    { hex: '#000000', label: 'مشکی خالص' },
    { hex: '#0f766e', label: 'سبز پزشکی' },
    { hex: '#0369a1', label: 'آبی سونوگرافی' },
    { hex: '#1d4ed8', label: 'آبی لاجوردی' },
    { hex: '#4338ca', label: 'نیلی ام‌آر‌آی' },
    { hex: '#7c3aed', label: 'بنفش' },
    { hex: '#be123c', label: 'زرشکی' },
    { hex: '#dc2626', label: 'قرمز (یافته مهم)' },
    { hex: '#c2410c', label: 'نارنجی تیره' },
    { hex: '#15803d', label: 'سبز سی‌تی' },
    { hex: '#475569', label: 'خاکستری تیره' },
  ];

  const highlightColors = [
    { hex: 'transparent', label: 'بدون هایلایت' },
    { hex: '#fef08a', label: 'زرد ملایم' },
    { hex: '#bbf7d0', label: 'سبز ملایم' },
    { hex: '#bae6fd', label: 'آبی روشن' },
    { hex: '#fed7aa', label: 'نارنجی ملایم' },
    { hex: '#fbcfe8', label: 'صورتی ملایم' },
    { hex: '#e9d5ff', label: 'بنفش ملایم' },
    { hex: '#fecaca', label: 'قرمز ملایم' },
    { hex: '#ccfbf1', label: 'فیروزه‌ای ملایم' },
  ];

  const medicalSymbols = [
    { sym: 'Ø', name: 'قطر / دایره' },
    { sym: '±', name: 'مثبت منفی' },
    { sym: '≤', name: 'کوچک‌تر مساوی' },
    { sym: '≥', name: 'بزرگ‌تر مساوی' },
    { sym: '°', name: 'درجه' },
    { sym: 'mm', name: 'میلی‌متر' },
    { sym: 'cm', name: 'سانتی‌متر' },
    { sym: 'ml', name: 'میلی‌لیتر' },
    { sym: '♂', name: 'نماد مرد' },
    { sym: '♀', name: 'نماد زن' },
    { sym: '×', name: 'ضرب در ابعاد' },
    { sym: '→', name: 'پیکان' },
    { sym: '✓', name: 'تیک تایید' },
  ];

  const preventFocusLoss = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div
      id="app-editor-toolbar"
      style={{ top: 'calc(var(--navbar-height, 102px) + var(--tabsbar-height, 44px))' }}
      className="bg-white border-b border-slate-200 sticky z-30 shadow-2xs no-print"
    >
      <div className="w-full max-w-[1680px] 2xl:max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-1.5 flex flex-wrap items-center gap-1">
        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 border-l border-slate-200 pl-1.5 ml-1">
          <button
            type="button"
            onMouseDown={preventFocusLoss}
            onClick={() => onExecCommand('undo')}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={preventFocusLoss}
            onClick={() => onExecCommand('redo')}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Font Family Selector */}
        <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5 ml-1">
          <select
            value={defaultFont || 'Vazirmatn'}
            onChange={(e) => {
              if (e.target.value === '__add_font__') {
                if (onOpenFontManager) onOpenFontManager();
              } else {
                onExecCommand('fontName', e.target.value);
                if (onChangeDefaultFont) onChangeDefaultFont(e.target.value);
              }
            }}
            className="text-xs py-1 px-2 rounded border border-slate-200 bg-slate-50 focus:border-teal-500 focus:outline-none"
            title="قلم پیش‌فرض متن گزارش"
          >
            {availableFonts.map((f, idx) => (
              <option key={idx} value={f.value}>
                {f.label}
              </option>
            ))}
            {onOpenFontManager && (
              <option value="__add_font__" className="font-bold text-teal-600">
                + افزودن و مدیریت قلم‌ها...
              </option>
            )}
          </select>
          {onOpenFontManager && (
            <button
              type="button"
              onClick={onOpenFontManager}
              className="text-[10px] text-teal-600 hover:text-teal-800 px-1 py-0.5 rounded hover:bg-teal-50 font-bold cursor-pointer"
              title="مدیریت و افزودن فونت‌های سفارشی"
            >
              + قلم
            </button>
          )}
        </div>

        {/* Font Size Selector */}
        <div className="flex items-center border-l border-slate-200 pl-1.5 ml-1">
          <select
            onChange={(e) => onExecCommand('fontSize', e.target.value)}
            className="text-xs py-1 px-2 rounded border border-slate-200 bg-slate-50 focus:border-teal-500 focus:outline-none"
            defaultValue="3"
            title="اندازه قلم"
          >
            {fontSizes.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Heading Style Select */}
        <div className="flex items-center border-l border-slate-200 pl-1.5 ml-1">
          <select
            onChange={(e) => onFormatBlock(e.target.value)}
            className="text-xs py-1 px-2 rounded border border-slate-200 bg-slate-50 focus:border-teal-500 focus:outline-none"
            defaultValue="p"
            title="نوع پاراگراف / تیتر"
          >
            <option value="p">پاراگراف عادی</option>
            <option value="h1">تیتر ۱ (اصلی)</option>
            <option value="h2">تیتر ۲ (ارگان)</option>
            <option value="h3">تیتر ۳ (زیربخش)</option>
            <option value="blockquote">نقل قول / کادر تاکید</option>
          </select>
        </div>

        {/* Bold, Italic, Underline, Strikethrough */}
        <div className="flex items-center gap-0.5 border-l border-slate-200 pl-1.5 ml-1">
          <button
            type="button"
            onMouseDown={preventFocusLoss}
            onClick={() => onExecCommand('bold')}
            className="p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded font-bold transition-colors cursor-pointer"
            title="بولد / برجسته (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={preventFocusLoss}
            onClick={() => onExecCommand('italic')}
            className="p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded italic transition-colors cursor-pointer"
            title="ایتالیک / مورب (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={preventFocusLoss}
            onClick={() => onExecCommand('underline')}
            className="p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded underline transition-colors cursor-pointer"
            title="خط زیر کلمه (Ctrl+U)"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={preventFocusLoss}
            onClick={() => onExecCommand('strikeThrough')}
            className="p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
            title="خط روی کلمه"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Text Color & Highlight (Fixed Selection Preservation + Quick Apply) */}
        <div ref={colorMenuRef} className="flex items-center gap-1 border-l border-slate-200 pl-1.5 ml-1 relative">
          {/* Text Color Button & Popover */}
          <div className="relative flex items-center">
            <button
              type="button"
              onMouseDown={preventFocusLoss}
              onClick={() => {
                setShowColorPicker((prev) => !prev);
                setShowHighlightPicker(false);
              }}
              className="p-1.5 text-slate-700 hover:bg-slate-100 rounded flex flex-col items-center justify-center gap-0.5 cursor-pointer"
              title="انتخاب رنگ متن (ابتدا متن را انتخاب کنید)"
            >
              <Palette className="w-3.5 h-3.5 text-teal-700" />
              <span
                className="w-3.5 h-1 rounded-full border border-slate-300"
                style={{ backgroundColor: activeTextColor }}
              />
            </button>

            {showColorPicker && (
              <div
                onMouseDown={preventFocusLoss}
                className="absolute right-0 top-full mt-1.5 w-52 p-2.5 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 space-y-2 animate-scaleIn"
              >
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 pb-1 border-b border-slate-100">
                  <span>رنگ متن انتخابی</span>
                  <button
                    type="button"
                    onMouseDown={preventFocusLoss}
                    onClick={() => {
                      setActiveTextColor('#0f172a');
                      onExecCommand('foreColor', '#0f172a');
                      setShowColorPicker(false);
                    }}
                    className="text-[10px] text-teal-700 hover:underline cursor-pointer"
                  >
                    رنگ پیش‌فرض
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {colors.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onMouseDown={preventFocusLoss}
                      onClick={() => {
                        setActiveTextColor(c.hex);
                        onExecCommand('foreColor', c.hex);
                        setShowColorPicker(false);
                      }}
                      title={c.label}
                      className={`w-6 h-6 rounded-lg border transition-transform hover:scale-110 cursor-pointer ${
                        activeTextColor === c.hex
                          ? 'ring-2 ring-teal-500 border-white scale-105'
                          : 'border-slate-300'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Highlight Color Button & Popover */}
          <div className="relative flex items-center">
            <button
              type="button"
              onMouseDown={preventFocusLoss}
              onClick={() => {
                setShowHighlightPicker((prev) => !prev);
                setShowColorPicker(false);
              }}
              className="p-1.5 text-slate-700 hover:bg-slate-100 rounded flex flex-col items-center justify-center gap-0.5 cursor-pointer"
              title="هایلایت کردن متن (ابتدا متن را انتخاب کنید)"
            >
              <Highlighter className="w-3.5 h-3.5 text-amber-500" />
              <span
                className="w-3.5 h-1 rounded-full border border-slate-300"
                style={{
                  backgroundColor:
                    activeHighlightColor === 'transparent' ? '#ffffff' : activeHighlightColor,
                }}
              />
            </button>

            {showHighlightPicker && (
              <div
                onMouseDown={preventFocusLoss}
                className="absolute right-0 top-full mt-1.5 w-52 p-2.5 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 space-y-2 animate-scaleIn"
              >
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 pb-1 border-b border-slate-100">
                  <span>رنگ هایلایت متن</span>
                  <button
                    type="button"
                    onMouseDown={preventFocusLoss}
                    onClick={() => {
                      setActiveHighlightColor('transparent');
                      onExecCommand('hiliteColor', 'transparent');
                      setShowHighlightPicker(false);
                    }}
                    className="text-[10px] text-rose-600 hover:underline cursor-pointer"
                  >
                    حذف هایلایت ✕
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {highlightColors.map((hc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={preventFocusLoss}
                      onClick={() => {
                        setActiveHighlightColor(hc.hex);
                        onExecCommand('hiliteColor', hc.hex);
                        setShowHighlightPicker(false);
                      }}
                      title={hc.label}
                      className={`w-7 h-7 rounded-lg border hover:scale-105 transition-transform text-[10px] flex items-center justify-center font-bold cursor-pointer ${
                        activeHighlightColor === hc.hex
                          ? 'ring-2 ring-teal-500 border-teal-600'
                          : 'border-slate-300'
                      }`}
                      style={{
                        backgroundColor: hc.hex === 'transparent' ? '#ffffff' : hc.hex,
                        color: '#0f172a',
                      }}
                    >
                      {hc.hex === 'transparent' ? '✕' : 'اب'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RTL / LTR Direction Switcher (Vital for bilingual medical reports) */}
        <div className="flex items-center gap-0.5 border-l border-slate-200 pl-1.5 ml-1">
          <button
            type="button"
            onMouseDown={preventFocusLoss}
            onClick={onToggleDirection}
            className={`px-2 py-1 text-xs font-bold rounded flex items-center gap-1 transition-colors cursor-pointer ${
              activeDirection === 'rtl'
                ? 'bg-teal-50 text-teal-700 border border-teal-200'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
            title="تغییر جهت نوشتار (راست‌به‌چپ فارسی / چپ‌به‌راست انگلیسی)"
          >
            <span>{activeDirection === 'rtl' ? 'فارسی (RTL)' : 'انگلیسی (LTR)'}</span>
          </button>
        </div>

        {/* Text Alignments */}
        <div className="flex items-center gap-0.5 border-l border-slate-200 pl-1.5 ml-1">
          <button
            onClick={() => onExecCommand('justifyRight')}
            className="p-1.5 text-slate-700 hover:bg-slate-100 rounded"
            title="راست‌چین"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onExecCommand('justifyCenter')}
            className="p-1.5 text-slate-700 hover:bg-slate-100 rounded"
            title="وسط‌چین"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onExecCommand('justifyLeft')}
            className="p-1.5 text-slate-700 hover:bg-slate-100 rounded"
            title="چپ‌چین"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onExecCommand('justifyFull')}
            className="p-1.5 text-slate-700 hover:bg-slate-100 rounded"
            title="تراز دوطرفه (Justify)"
          >
            <AlignJustify className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-0.5 border-l border-slate-200 pl-1.5 ml-1">
          <button
            onClick={() => onExecCommand('insertUnorderedList')}
            className="p-1.5 text-slate-700 hover:bg-slate-100 rounded"
            title="لیست بالت‌دار"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onExecCommand('insertOrderedList')}
            className="p-1.5 text-slate-700 hover:bg-slate-100 rounded"
            title="لیست شماره‌دار"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Enhanced Insert Table Dropdown (Visual Grid + Medical Preset Tables) */}
        <div className="relative border-l border-slate-200 pl-1.5 ml-1">
          <button
            type="button"
            onClick={() => {
              setShowTableMenu(!showTableMenu);
              setShowSymbolMenu(false);
              setShowColorPicker(false);
              setShowHighlightPicker(false);
            }}
            className="px-2 py-1 text-slate-700 hover:bg-indigo-50 hover:text-indigo-800 rounded-lg flex items-center gap-1 text-xs font-bold border border-transparent hover:border-indigo-200 transition-colors cursor-pointer"
            title="درج جدول آماده پرتوپزشکی یا جدول با ابعاد دلخواه"
          >
            <TableIcon className="w-3.5 h-3.5 text-indigo-600" />
            <span>درج جدول</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showTableMenu && (
            <div className="absolute right-0 mt-1.5 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 z-50 text-xs space-y-3 animate-fadeIn">
              {/* Section 1: Pre-built Radiology Tables with Smart Number Slots */}
              <div>
                <div className="font-black text-slate-800 mb-1.5 pb-1 border-b border-slate-100 flex items-center justify-between">
                  <span>۱. جداول آماده تخصصی (با جایگذاری عدد)</span>
                  <span className="text-[10px] text-teal-600 font-semibold">آماده تایپ</span>
                </div>
                <div className="space-y-1">
                  {[
                    { id: 'kidneys' as const, label: 'جدول مقایسه ابعاد کلیه‌ها (راست و چپ)' },
                    { id: 'thyroid' as const, label: 'جدول ابعاد لوب‌های تیروئید و ایسموس' },
                    { id: 'fetal' as const, label: 'جدول بیومتری و سن جنین (BPD, HC, AC, FL)' },
                    { id: 'pelvis' as const, label: 'جدول ابعاد رحم، آندومتر و تخمدان‌ها' },
                    { id: 'lesions' as const, label: 'جدول شماره‌گذاری ندول‌ها / ضایعات فضاگیر' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        if (onInsertPresetTable) {
                          onInsertPresetTable(preset.id);
                        } else {
                          onInsertTable(3, 4, true);
                        }
                        setShowTableMenu(false);
                      }}
                      className="w-full text-right px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-900 font-semibold border border-slate-200/70 hover:border-teal-300 transition-all block cursor-pointer"
                    >
                      + {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 2: Interactive Visual Grid Picker (Up to 6x6) */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-700">۲. انتخاب ابعاد جدول دلخواه:</span>
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    {hoverGrid.r} سطر × {hoverGrid.c} ستون
                  </span>
                </div>

                {/* 6x6 Interactive Grid */}
                <div
                  className="grid grid-cols-6 gap-1 p-2 bg-slate-50 rounded-xl border border-slate-200 justify-items-center"
                  dir="ltr"
                >
                  {Array.from({ length: 6 }).map((_, rIdx) =>
                    Array.from({ length: 6 }).map((__, cIdx) => {
                      const r = rIdx + 1;
                      const c = cIdx + 1;
                      const isHighlighted = r <= hoverGrid.r && c <= hoverGrid.c;
                      return (
                        <button
                          key={`${r}-${c}`}
                          type="button"
                          onMouseEnter={() => setHoverGrid({ r, c })}
                          onClick={() => {
                            onInsertTable(r, c, tableWithHeader);
                            setShowTableMenu(false);
                          }}
                          className={`w-7 h-6 rounded border transition-all cursor-pointer ${
                            isHighlighted
                              ? 'bg-indigo-600 border-indigo-700 shadow-2xs scale-105'
                              : 'bg-white border-slate-300 hover:border-indigo-400'
                          }`}
                          title={`درج جدول ${r} سطر در ${c} ستون`}
                        />
                      );
                    })
                  )}
                </div>

                <label className="flex items-center gap-2 mt-2.5 text-[11px] text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={tableWithHeader}
                    onChange={(e) => setTableWithHeader(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>همراه با ردیف سرستون رنگی (Header)</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Medical Symbols Dropdown */}
        <div className="relative border-l border-slate-200 pl-1.5 ml-1">
          <button
            onClick={() => setShowSymbolMenu(!showSymbolMenu)}
            className="p-1.5 text-slate-700 hover:bg-slate-100 rounded text-xs font-mono font-bold"
            title="درج نمادهای پزشکی (قطر Ø، انحراف ±، سانتی‌متر و...)"
          >
            Ø±
          </button>
          {showSymbolMenu && (
            <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50">
              <div className="font-bold text-slate-700 text-xs mb-1.5 pb-1 border-b border-slate-100">
                نمادها و واحدهای پرتکرار رادیولوژی
              </div>
              <div className="grid grid-cols-4 gap-1">
                {medicalSymbols.map((item) => (
                  <button
                    key={item.sym}
                    onClick={() => {
                      onInsertSymbol(item.sym);
                      setShowSymbolMenu(false);
                    }}
                    className="p-1.5 hover:bg-teal-50 hover:text-teal-800 rounded border border-slate-100 text-xs font-mono font-bold flex items-center justify-center transition-colors"
                    title={item.name}
                  >
                    {item.sym}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Find & Replace Toggle */}
        <div className="flex items-center gap-0.5 border-l border-slate-200 pl-1.5 ml-1">
          <button
            onClick={() => setShowFindReplace(!showFindReplace)}
            className={`p-1.5 rounded transition-colors ${
              showFindReplace ? 'bg-teal-100 text-teal-800' : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="جستجو و جایگزینی کلمات در گزارش"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onExecCommand('removeFormat')}
            className="p-1.5 text-slate-700 hover:bg-slate-100 rounded"
            title="حذف قالب‌بندی اضافی (Clear Formatting)"
          >
            <RemoveFormatting className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Editor Zoom Out / Zoom In Controls (کوچک‌نمایی و بزرگ‌نمایی متن ویرایشگر) */}
        {onChangeZoom && (
          <div className="flex items-center gap-0.5 border-l border-slate-200 pl-1.5 ml-1 bg-slate-50 rounded-lg px-1 py-0.5 border border-slate-200/80">
            <button
              type="button"
              onClick={() => onChangeZoom(Math.max(80, editorZoom - 10))}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
              title="کوچک‌نمایی متن گزارش"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onChangeZoom(100)}
              className="text-[10px] font-mono font-bold text-slate-700 px-1 hover:text-teal-700 cursor-pointer"
              title="بازنشانی اندازه نما به ۱۰۰٪"
            >
              {editorZoom}%
            </button>
            <button
              type="button"
              onClick={() => onChangeZoom(Math.min(150, editorZoom + 10))}
              className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
              title="بزرگ‌نمایی متن گزارش"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Voice Dictation (تایپ صوتی رادیولوژی) */}
        {hasSpeechSupport && (
          <div className="flex items-center border-l border-slate-200 pl-1.5 ml-1">
            <button
              onClick={onToggleVoice}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              title="تایپ صوتی پزشکی (دیکته گزارش به زبان فارسی)"
            >
              {isListening ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              <span>{isListening ? 'در حال شنیدن...' : 'تایپ صوتی'}</span>
            </button>
          </div>
        )}

        {/* Word & Character Count */}
        <div className="mr-auto flex items-center gap-2 text-[11px] text-slate-600 font-mono">
          <span>{wordCount} کلمه</span>
          <span>•</span>
          <span>{charCount} نویسه</span>
        </div>
      </div>

      {/* Find and Replace Bar (Expandable) */}
      {showFindReplace && (
        <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center gap-2">
          <div className="text-xs font-bold text-slate-700">جستجو:</div>
          <input
            type="text"
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            placeholder="کلمه مورد نظر..."
            className="text-xs px-2.5 py-1 rounded border border-slate-200 bg-white w-40 focus:border-teal-500"
          />
          <div className="text-xs font-bold text-slate-700">جایگزینی با:</div>
          <input
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            placeholder="کلمه جایگزین..."
            className="text-xs px-2.5 py-1 rounded border border-slate-200 bg-white w-40 focus:border-teal-500"
          />
          <button
            onClick={() => onFindReplace(findText, replaceText, false)}
            disabled={!findText}
            className="text-xs px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded font-medium disabled:opacity-50"
          >
            جایگزینی بعدی
          </button>
          <button
            onClick={() => onFindReplace(findText, replaceText, true)}
            disabled={!findText}
            className="text-xs px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded font-medium disabled:opacity-50"
          >
            جایگزینی همه
          </button>
          <button
            onClick={() => setShowFindReplace(false)}
            className="text-xs text-slate-600 hover:text-slate-900 mr-2"
          >
            بستن
          </button>
        </div>
      )}
    </div>
  );
};
