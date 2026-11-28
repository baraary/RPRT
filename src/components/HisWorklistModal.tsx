import React, { useState, useMemo, useRef } from 'react';
import { HisWorklistPatient, MedicalReport, Modality } from '../types';
import {
  X,
  FileSpreadsheet,
  Upload,
  ClipboardPaste,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  UserPlus,
  SlidersHorizontal,
  Download,
  Sparkles,
  Check,
  AlertCircle,
  ArrowUpLeft,
  Layers,
  Table2,
  CheckSquare,
  Square,
  FolderPlus,
} from 'lucide-react';
import {
  parseHisSpreadsheetFile,
  parseDelimitedText,
  rebuildHisTableFromHeaderRow,
  buildHisWorklistPatients,
  saveColumnMapping,
  downloadSampleHisExcel,
  HisColumnMapping,
  ParsedHisTable,
  ParsedHisWorkbook,
  normalizeDigitsToEnglish,
} from '../services/hisImport';

interface HisWorklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  worklist: HisWorklistPatient[];
  savedReports: MedicalReport[];
  onSaveWorklist: (items: HisWorklistPatient[], mode: 'replace' | 'append') => void;
  onRemovePatient: (id: string) => void;
  onRemoveMultiplePatients?: (ids: string[]) => void;
  onClearWorklist: () => void;
  onSelectPatient: (patient: HisWorklistPatient, openInNewTab: boolean) => void;
  onOpenMultiplePatients: (patients: HisWorklistPatient[]) => void;
}

const MAPPING_FIELDS: Array<{ key: keyof HisColumnMapping; label: string; hint: string }> = [
  { key: 'fullName', label: 'نام و نام خانوادگی', hint: 'اگر در یک ستون است' },
  { key: 'firstName', label: 'نام (جداگانه)', hint: 'در صورت جدا بودن از فامیل' },
  { key: 'lastName', label: 'نام خانوادگی (جداگانه)', hint: 'در صورت جدا بودن از نام' },
  { key: 'nationalId', label: 'کد ملی', hint: 'کد ملی ۱۰ رقمی' },
  { key: 'admissionNumber', label: 'شماره پذیرش / پرونده', hint: 'شماره قبض یا پذیرش HIS' },
  { key: 'age', label: 'سن', hint: 'سن بیمار' },
  { key: 'gender', label: 'جنسیت', hint: 'زن / مرد' },
  { key: 'referringPhysician', label: 'پزشک معالج', hint: 'پزشک ارجاع‌دهنده' },
  { key: 'reportDate', label: 'تاریخ پذیرش', hint: 'تاریخ شمسی' },
  { key: 'serviceName', label: 'نام خدمت / نوع بررسی', hint: 'مثلاً سونوگرافی شکم، MRI مغز' },
];

export const HisWorklistModal: React.FC<HisWorklistModalProps> = ({
  isOpen,
  onClose,
  worklist,
  savedReports,
  onSaveWorklist,
  onRemovePatient,
  onRemoveMultiplePatients,
  onClearWorklist,
  onSelectPatient,
  onOpenMultiplePatients,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteText, setPasteText] = useState('');

  // Multi-sheet workbook import state
  const [pendingWorkbook, setPendingWorkbook] = useState<ParsedHisWorkbook | null>(null);
  const [activeSheetIdx, setActiveSheetIdx] = useState<number>(0);
  const [activeTable, setActiveTable] = useState<ParsedHisTable | null>(null);
  const [mapping, setMapping] = useState<HisColumnMapping | null>(null);
  const [mapperView, setMapperView] = useState<'fields' | 'raw-columns' | 'closed'>('fields');
  const [columnSearch, setColumnSearch] = useState('');
  const [hideEmptyColumns, setHideEmptyColumns] = useState(true);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');

  // Multi-select state for opening multiple patients at once
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([]);

  const [statusMessage, setStatusMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(
    null
  );
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Build quick lookup sets of already-reported patients from Archive
  const reportedLookup = useMemo(() => {
    const admSet = new Set<string>();
    const nidDateSet = new Set<string>();
    savedReports.forEach((rep) => {
      const adm = normalizeDigitsToEnglish(rep.patientInfo?.admissionNumber || '').toLowerCase();
      if (adm && adm !== 'adm-001' && adm !== 'adm-2026-904') {
        admSet.add(adm);
      }
      const nid = normalizeDigitsToEnglish(rep.patientInfo?.nationalId || '');
      const dt = normalizeDigitsToEnglish(rep.patientInfo?.reportDate || '');
      if (nid) {
        nidDateSet.add(`${nid}|${dt}`);
      }
    });
    return { admSet, nidDateSet };
  }, [savedReports]);

  const isPatientReported = (p: HisWorklistPatient): boolean => {
    const adm = normalizeDigitsToEnglish(p.admissionNumber || '').toLowerCase();
    if (adm && reportedLookup.admSet.has(adm)) return true;
    const nid = normalizeDigitsToEnglish(p.nationalId || '');
    const dt = normalizeDigitsToEnglish(p.reportDate || '');
    if (nid && reportedLookup.nidDateSet.has(`${nid}|${dt}`)) return true;
    return false;
  };

  const stats = useMemo(() => {
    let done = 0;
    worklist.forEach((p) => {
      if (isPatientReported(p)) done++;
    });
    return { total: worklist.length, done, pending: Math.max(0, worklist.length - done) };
  }, [worklist, reportedLookup]);

  const filteredWorklist = useMemo(() => {
    const q = search.trim().toLowerCase();
    return worklist.filter((p) => {
      const done = isPatientReported(p);
      if (statusFilter === 'pending' && done) return false;
      if (statusFilter === 'done' && !done) return false;
      if (!q) return true;
      return (
        (p.fullName || '').toLowerCase().includes(q) ||
        (p.nationalId || '').toLowerCase().includes(q) ||
        (p.admissionNumber || '').toLowerCase().includes(q) ||
        (p.referringPhysician || '').toLowerCase().includes(q) ||
        (p.serviceName || '').toLowerCase().includes(q)
      );
    });
  }, [worklist, search, statusFilter, reportedLookup]);

  const previewImportedPatients = useMemo(() => {
    if (!activeTable || !mapping) return [];
    return buildHisWorklistPatients(activeTable.rows, mapping);
  }, [activeTable, mapping]);

  const visibleColumnMetas = useMemo(() => {
    if (!activeTable) return [];
    const q = columnSearch.trim().toLowerCase();
    return activeTable.columnMetas.filter((meta) => {
      if (hideEmptyColumns && meta.nonEmptyCount === 0) return false;
      if (!q) return true;
      return (
        meta.header.toLowerCase().includes(q) ||
        meta.excelLetter.toLowerCase().includes(q) ||
        meta.samples.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [activeTable, columnSearch, hideEmptyColumns]);

  const columnMetaByHeader = useMemo(() => {
    const map = new Map<string, { excelLetter: string; samples: string[]; nonEmptyCount: number }>();
    (activeTable?.columnMetas || []).forEach((m) => {
      map.set(m.header, {
        excelLetter: m.excelLetter,
        samples: m.samples,
        nonEmptyCount: m.nonEmptyCount,
      });
    });
    return map;
  }, [activeTable]);

  // Reverse map: which HIS field is currently assigned to a given raw column header
  const fieldByAssignedHeader = useMemo(() => {
    const map = new Map<string, keyof HisColumnMapping>();
    if (!mapping) return map;
    (Object.keys(mapping) as Array<keyof HisColumnMapping>).forEach((k) => {
      const col = mapping[k];
      if (col) map.set(col, k);
    });
    return map;
  }, [mapping]);

  const validSelectedIds = useMemo(() => {
    const worklistIdSet = new Set(worklist.map((p) => p.id));
    return selectedPatientIds.filter((id) => worklistIdSet.has(id));
  }, [selectedPatientIds, worklist]);

  if (!isOpen) return null;

  const activateWorkbook = (wb: ParsedHisWorkbook) => {
    const idx = Math.max(0, Math.min(wb.defaultSheetIndex, wb.sheets.length - 1));
    const sheet = wb.sheets[idx];
    setPendingWorkbook(wb);
    setActiveSheetIdx(idx);
    setActiveTable(sheet);
    setMapping(sheet.suggestedMapping);
    setColumnSearch('');

    const hasName = Boolean(
      sheet.suggestedMapping.fullName ||
        sheet.suggestedMapping.firstName ||
        sheet.suggestedMapping.lastName
    );
    // For complex files with many columns (>10) or if name wasn't detected, open mapper automatically so doctor can verify/pick
    if (!hasName || sheet.headers.length > 10 || wb.sheets.length > 1) {
      setMapperView('fields');
    } else {
      setMapperView('closed');
    }
    setShowPasteBox(false);
  };

  const handleSelectSheet = (idx: number) => {
    if (!pendingWorkbook) return;
    const sheet = pendingWorkbook.sheets[idx];
    if (!sheet) return;
    setActiveSheetIdx(idx);
    setActiveTable(sheet);
    setMapping(sheet.suggestedMapping);
    setColumnSearch('');
  };

  const handleChangeHeaderRow = (newHeaderRowIdx: number) => {
    if (!activeTable || !pendingWorkbook) return;
    const rebuilt = rebuildHisTableFromHeaderRow(
      activeTable.rawMatrix,
      newHeaderRowIdx,
      activeTable.sheetName,
      pendingWorkbook.fileName
    );
    const updatedSheets = pendingWorkbook.sheets.map((s, i) => (i === activeSheetIdx ? rebuilt : s));
    setPendingWorkbook({ ...pendingWorkbook, sheets: updatedSheets });
    setActiveTable(rebuilt);
    setMapping(rebuilt.suggestedMapping);
  };

  const handleFileLoad = async (file: File) => {
    setStatusMessage(null);
    try {
      const wb = await parseHisSpreadsheetFile(file);
      const anyRows = wb.sheets.some((s) => s.rawMatrix.length > 0);
      if (!anyRows) {
        setStatusMessage({
          tone: 'error',
          text: 'هیچ داده‌ای در این فایل یافت نشد. لطفاً فایل خروجی اکسل یا CSV را بررسی کنید.',
        });
        return;
      }
      activateWorkbook(wb);
    } catch (err: any) {
      setStatusMessage({
        tone: 'error',
        text: `خطا در خواندن فایل: ${err?.message || 'فرمت فایل پشتیبانی نشد.'}`,
      });
    }
  };

  const handleParsePastedExcel = () => {
    setStatusMessage(null);
    if (!pasteText.trim()) return;
    const wb = parseDelimitedText(pasteText, 'کپی مستقیم از اکسل');
    if (wb.sheets[0].rows.length === 0) {
      setStatusMessage({
        tone: 'error',
        text: 'داده معتبری پیدا نشد. لطفاً در اکسل ردیف عناوین (سرستون‌ها) + ردیف بیماران را همزمان کپی (Ctrl+C) و اینجا پیست کنید.',
      });
      return;
    }
    activateWorkbook(wb);
    setPasteText('');
  };

  const handleAssignRawColumnToField = (rawHeader: string, targetField: keyof HisColumnMapping | '') => {
    setMapping((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      // Clear any previous field pointing to this column
      (Object.keys(next) as Array<keyof HisColumnMapping>).forEach((k) => {
        if (next[k] === rawHeader) next[k] = '';
      });
      if (targetField) {
        next[targetField] = rawHeader;
        // If user explicitly picked fullName, clear split first/last; or vice versa
        if (targetField === 'fullName') {
          next.firstName = '';
          next.lastName = '';
        } else if (targetField === 'firstName' || targetField === 'lastName') {
          next.fullName = '';
        }
      }
      return next;
    });
  };

  const handleConfirmImport = () => {
    if (!activeTable || !mapping) return;
    const items = buildHisWorklistPatients(activeTable.rows, mapping);
    if (items.length === 0) {
      setStatusMessage({
        tone: 'error',
        text: 'هیچ بیماری قابل استخراج نبود. لطفاً در بخش تنظیم ستون‌ها حداقل ستون «نام و نام خانوادگی» یا «نام» را مشخص کنید.',
      });
      setMapperView('raw-columns');
      return;
    }
    saveColumnMapping(mapping, activeTable.headers);
    onSaveWorklist(items, importMode);
    setPendingWorkbook(null);
    setActiveTable(null);
    setMapping(null);
    setMapperView('closed');
    setSelectedPatientIds([]);
    setStatusMessage({
      tone: 'success',
      text: `✓ ${items.length} بیمار وارد لیست کار شد و تنظیم ستون‌های این فایل HIS برای دفعات بعد ذخیره گردید.`,
    });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const toggleSelectPatient = (id: string) => {
    setSelectedPatientIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredWorklist.map((p) => p.id);
    const allSelected =
      filteredIds.length > 0 && filteredIds.every((id) => validSelectedIds.includes(id));
    if (allSelected) {
      setSelectedPatientIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedPatientIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleSelectPendingOnly = () => {
    const pendingIds = filteredWorklist.filter((p) => !isPatientReported(p)).map((p) => p.id);
    setSelectedPatientIds(pendingIds);
  };

  const handleOpenSelectedBatch = () => {
    const selectedPatients = worklist.filter((p) => validSelectedIds.includes(p.id));
    if (selectedPatients.length === 0) return;
    onOpenMultiplePatients(selectedPatients);
    setSelectedPatientIds([]);
    onClose();
  };

  const handleRemoveSelectedBatch = () => {
    if (validSelectedIds.length === 0) return;
    if (onRemoveMultiplePatients) {
      onRemoveMultiplePatients(validSelectedIds);
    } else {
      validSelectedIds.forEach((id) => onRemovePatient(id));
    }
    setSelectedPatientIds([]);
  };

  const modalityBadge = (mod?: Modality) => {
    if (mod === 'mri')
      return <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">MRI</span>;
    if (mod === 'ct')
      return <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">CT</span>;
    if (mod === 'sonography')
      return <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold">سونو</span>;
    return null;
  };

  const allFilteredSelected =
    filteredWorklist.length > 0 &&
    filteredWorklist.every((p) => validSelectedIds.includes(p.id));

  const nonEmptyColCount = activeTable
    ? activeTable.columnMetas.filter((m) => m.nonEmptyCount > 0).length
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn"
      dir="rtl"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-6xl w-full max-h-[93vh] flex flex-col overflow-hidden animate-scaleIn">
        {/* Top Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-sm sm:text-base">
                  لیست بیماران روزانه از خروجی اکسل / CSV نرم‌افزار HIS
                </h3>
                {stats.total > 0 && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/40">
                    {stats.pending} در انتظار • {stats.done} گزارش‌شده
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 truncate">
                پشتیبانی کامل از فایل‌های چندشیته (چند تب اکسل) و شلوغ با ده‌ها ستون + انتخاب همزمان چند بیمار و باز کردن در تب‌های جداگانه
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

        {/* Upload & Quick Action Strip */}
        <div className="px-4 sm:px-5 py-2.5 bg-slate-50 border-b border-slate-200 space-y-2 shrink-0">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFileLoad(file);
            }}
            className={`rounded-2xl border-2 border-dashed p-2.5 transition-colors flex items-center justify-between flex-wrap gap-2 ${
              isDragging
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-slate-300 bg-white hover:border-teal-400'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
                <Upload className="w-4 h-4" />
              </div>
              <div className="text-xs min-w-0">
                <div className="font-bold text-slate-800">
                  ورود فایل خروجی HIS (<span dir="ltr" className="font-mono">.xlsx, .xls, .csv</span>) — تشخیص هوشمند شیت‌ها و ستون‌های پرشمار
                </div>
                <div className="text-[11px] text-slate-500">
                  چیدمان ستون‌های HIS شما یک‌بار تایید می‌شود و از فردا خودکار اعمال می‌گردد
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.txt,.tsv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileLoad(file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>انتخاب فایل اکسل / CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPasteBox((v) => !v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border cursor-pointer transition-colors ${
                  showPasteBox
                    ? 'bg-indigo-600 text-white border-indigo-700'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200'
                }`}
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>کپی و پیست از اکسل</span>
              </button>

              <button
                type="button"
                onClick={downloadSampleHisExcel}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                title="دانلود فایل نمونه اکسل جهت تست"
              >
                <Download className="w-3.5 h-3.5" />
                <span>فایل نمونه</span>
              </button>
            </div>
          </div>

          {/* Direct Copy-Paste Box from Excel */}
          {showPasteBox && (
            <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-3 space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
                <span>ردیف‌ها را در اکسل (همراه با ردیف عنوان ستون‌ها) کپی (Ctrl+C) کرده و اینجا پیست (Ctrl+V) کنید:</span>
                <button
                  type="button"
                  onClick={() => setShowPasteBox(false)}
                  className="text-indigo-500 hover:text-indigo-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                rows={4}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="مثال: ردیف‌های اکسل خروجی HIS را اینجا Ctrl+V کنید..."
                className="w-full p-2.5 rounded-xl border border-indigo-300 bg-white text-xs font-mono focus:outline-none focus:border-indigo-500"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleParsePastedExcel}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>پردازش و شناسایی ستون‌ها</span>
                </button>
              </div>
            </div>
          )}

          {statusMessage && (
            <div
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                statusMessage.tone === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}
            >
              {statusMessage.tone === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* Pending Multi-Sheet & Multi-Column Import Inspector */}
        {pendingWorkbook && activeTable && mapping && (
          <div className="p-4 sm:p-5 bg-amber-50/80 border-b-2 border-amber-300 space-y-3 overflow-y-auto max-h-[64vh] shrink-0 animate-fadeIn">
            {/* Top Summary & Confirm Bar */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="space-y-0.5">
                <h4 className="text-xs sm:text-sm font-black text-amber-950 flex items-center gap-1.5 flex-wrap">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    فایل «{pendingWorkbook.fileName}» —{' '}
                    <strong className="text-emerald-800">{previewImportedPatients.length} بیمار</strong> قابل ورود
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-white border border-amber-300 text-amber-900">
                    {activeTable.headers.length} ستون ({nonEmptyColCount} ستون دارای داده)
                  </span>
                </h4>
                <p className="text-[11px] text-amber-900/85">
                  ستون‌های مهم را با کمک «نمونه داده واقعی» بررسی یا تغییر دهید؛ نقشه این فایل ذخیره می‌شود تا فردا بدون تنظیم دوباره وارد شود.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value as 'replace' | 'append')}
                  className="h-8 px-2.5 rounded-xl bg-white border border-amber-300 text-xs font-bold text-slate-800 cursor-pointer"
                >
                  <option value="replace">جایگزینی لیست فعلی</option>
                  <option value="append">افزودن به لیست فعلی</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setPendingWorkbook(null);
                    setActiveTable(null);
                    setMapping(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  انصراف
                </button>

                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>تایید و ورود {previewImportedPatients.length} بیمار</span>
                </button>
              </div>
            </div>

            {/* Multi-Sheet (Excel Tabs) Selector — Always shown when workbook has > 1 sheet */}
            {pendingWorkbook.sheets.length > 1 && (
              <div className="bg-white rounded-2xl border border-amber-200 p-2.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-700">
                  <Layers className="w-3.5 h-3.5 text-teal-600" />
                  <span>
                    این فایل اکسل دارای {pendingWorkbook.sheets.length} تب (شیت) است — تب حاوی لیست بیماران را انتخاب کنید:
                  </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {pendingWorkbook.sheets.map((s, idx) => {
                    const isSelected = idx === activeSheetIdx;
                    return (
                      <button
                        key={`${s.sheetName}-${idx}`}
                        type="button"
                        onClick={() => handleSelectSheet(idx)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-teal-600 text-white border-teal-700 shadow-xs'
                            : 'bg-slate-50 hover:bg-teal-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span>{s.sheetName}</span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                            isSelected ? 'bg-teal-800/70 text-teal-100' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {s.rows.length} ردیف
                        </span>
                        {s.matchedFieldCount >= 2 && (
                          <CheckCircle2
                            className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-200' : 'text-emerald-600'}`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Controls Strip: Header Row Picker + Mapper View Tabs */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setMapperView(mapperView === 'fields' ? 'closed' : 'fields')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition-colors ${
                    mapperView === 'fields'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white hover:bg-amber-100 text-amber-950 border-amber-300'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>انتخاب ستون برای هر فیلد (با نمونه داده)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMapperView(mapperView === 'raw-columns' ? 'closed' : 'raw-columns')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition-colors ${
                    mapperView === 'raw-columns'
                      ? 'bg-teal-700 text-white border-teal-800'
                      : 'bg-white hover:bg-teal-50 text-teal-900 border-teal-300'
                  }`}
                >
                  <Table2 className="w-3.5 h-3.5" />
                  <span>مشاهده همه {nonEmptyColCount} ستون خام فایل و انتخاب با کلیک</span>
                </button>
              </div>

              {/* Header Row Selector (in case HIS adds 2-6 hospital banner rows on top) */}
              {activeTable.rawMatrix.length > 1 && (
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-amber-300">
                  <span className="text-[11px] font-bold text-slate-700">ردیف عنوان ستون‌ها:</span>
                  <select
                    value={activeTable.headerRowIndex}
                    onChange={(e) => handleChangeHeaderRow(Number(e.target.value))}
                    className="h-6 px-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-900 cursor-pointer max-w-[230px]"
                  >
                    {activeTable.rawMatrix.slice(0, Math.min(15, activeTable.rawMatrix.length)).map((row, rIdx) => {
                      const previewCells = row.filter(Boolean).slice(0, 3).join(' | ');
                      return (
                        <option key={rIdx} value={rIdx}>
                          ردیف {rIdx + 1}: {previewCells ? previewCells.slice(0, 42) : '(خالی)'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>

            {/* Mode 1: Field-by-Field Column Mapper with Live Sample Previews & Search */}
            {mapperView === 'fields' && (
              <div className="bg-white p-3.5 rounded-2xl border border-amber-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={columnSearch}
                      onChange={(e) => setColumnSearch(e.target.value)}
                      placeholder="جستجو در نام یا محتوای ستون‌ها (مثلاً: نام، کد، پذیرش، دکتر)..."
                      className="w-full h-7 pr-8 pl-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-[11px] focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hideEmptyColumns}
                      onChange={(e) => setHideEmptyColumns(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600"
                    />
                    <span>مخفی کردن ستون‌های کاملاً خالی</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  {MAPPING_FIELDS.map((field) => {
                    const selectedHeader = mapping[field.key];
                    const selectedMeta = selectedHeader ? columnMetaByHeader.get(selectedHeader) : undefined;
                    // Always include the currently selected header even if filtered out by columnSearch
                    const optionMetas = visibleColumnMetas.some((m) => m.header === selectedHeader)
                      ? visibleColumnMetas
                      : [
                          ...(selectedHeader && selectedMeta
                            ? [
                                {
                                  header: selectedHeader,
                                  colIndex: -1,
                                  excelLetter: selectedMeta.excelLetter,
                                  nonEmptyCount: selectedMeta.nonEmptyCount,
                                  samples: selectedMeta.samples,
                                },
                              ]
                            : []),
                          ...visibleColumnMetas,
                        ];

                    return (
                      <div
                        key={field.key}
                        className={`p-2 rounded-xl border transition-colors space-y-1 ${
                          selectedHeader
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : 'bg-slate-50/70 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <label className="text-[11px] font-black text-slate-800">{field.label}</label>
                          {selectedMeta && (
                            <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                              ستون {selectedMeta.excelLetter}
                            </span>
                          )}
                        </div>
                        <select
                          value={selectedHeader}
                          onChange={(e) =>
                            setMapping((prev) =>
                              prev ? { ...prev, [field.key]: e.target.value } : prev
                            )
                          }
                          className="w-full h-7 px-1.5 rounded-lg border border-slate-300 bg-white text-[11px] font-semibold text-slate-900"
                        >
                          <option value="">-- انتخاب نشده --</option>
                          {optionMetas.map((m) => {
                            const samplePreview = m.samples[0] ? ` ← «${m.samples[0].slice(0, 22)}»` : '';
                            return (
                              <option key={m.header} value={m.header}>
                                [{m.excelLetter}] {m.header}
                                {samplePreview}
                              </option>
                            );
                          })}
                        </select>
                        {/* Live Real Sample Values from the chosen column */}
                        <div className="text-[10px] text-slate-500 truncate min-h-[15px]">
                          {selectedMeta && selectedMeta.samples.length > 0 ? (
                            <span className="text-emerald-800 font-semibold">
                              نمونه: {selectedMeta.samples.slice(0, 2).join(' • ')}
                            </span>
                          ) : (
                            <span>{field.hint}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mode 2: Raw Columns Horizontal Visual Inspector (Click any column header to map it!) */}
            {mapperView === 'raw-columns' && (
              <div className="bg-white rounded-2xl border border-teal-200 p-3 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-[11px] font-bold text-teal-900">
                    ستون‌های فایل اکسل را به چپ/راست اسکرول کنید و از منوی بالای هر ستون مشخص کنید مربوط به کدام فیلد بیمار است:
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative w-52">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={columnSearch}
                        onChange={(e) => setColumnSearch(e.target.value)}
                        placeholder="فیلتر ستون‌ها..."
                        className="w-full h-7 pr-8 pl-2 rounded-lg border border-slate-200 bg-slate-50 text-[11px]"
                      />
                    </div>
                    <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hideEmptyColumns}
                        onChange={(e) => setHideEmptyColumns(e.target.checked)}
                      />
                      <span>حذف خالی‌ها</span>
                    </label>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="text-[11px] text-right border-collapse min-w-full">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200">
                        {visibleColumnMetas.map((meta) => {
                          const assignedField = fieldByAssignedHeader.get(meta.header) || '';
                          return (
                            <th
                              key={meta.header}
                              className={`p-2 border-l border-slate-200 min-w-[165px] max-w-[220px] align-top ${
                                assignedField ? 'bg-emerald-50' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="font-mono text-[10px] font-black px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                                  {meta.excelLetter}
                                </span>
                                <span className="text-[10px] text-slate-400 font-normal">
                                  {meta.nonEmptyCount} مقدار
                                </span>
                              </div>
                              <div className="font-black text-slate-800 truncate mb-1.5" title={meta.header}>
                                {meta.header}
                              </div>
                              <select
                                value={assignedField}
                                onChange={(e) =>
                                  handleAssignRawColumnToField(
                                    meta.header,
                                    e.target.value as keyof HisColumnMapping | ''
                                  )
                                }
                                className={`w-full h-7 px-1.5 rounded-lg border text-[10.5px] font-bold cursor-pointer ${
                                  assignedField
                                    ? 'bg-emerald-600 text-white border-emerald-700'
                                    : 'bg-white text-slate-700 border-slate-300'
                                }`}
                              >
                                <option value="" className="bg-white text-slate-700">
                                  — نادیده گرفته شود —
                                </option>
                                {MAPPING_FIELDS.map((f) => (
                                  <option key={f.key} value={f.key} className="bg-white text-slate-900">
                                    ✓ {f.label}
                                  </option>
                                ))}
                              </select>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeTable.rows.slice(0, 3).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50">
                          {visibleColumnMetas.map((meta) => {
                            const assignedField = fieldByAssignedHeader.get(meta.header);
                            return (
                              <td
                                key={meta.header}
                                className={`px-2 py-1.5 border-l border-slate-100 truncate max-w-[200px] ${
                                  assignedField
                                    ? 'bg-emerald-50/40 font-bold text-slate-900'
                                    : 'text-slate-600'
                                }`}
                                title={row[meta.header] || ''}
                              >
                                {row[meta.header] || <span className="text-slate-300">—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Final Mapped Output Preview (First 4 Patients) */}
            <div className="bg-white rounded-xl border border-amber-200 overflow-x-auto">
              <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 text-[11px] font-black text-slate-700 flex items-center justify-between">
                <span>نتیجه نهایی استخراج‌شده (پیش‌نمایش ۴ بیمار اول):</span>
                <span className="text-emerald-700">{previewImportedPatients.length} ردیف معتبر</span>
              </div>
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-1.5 px-2.5">نام بیمار</th>
                    <th className="py-1.5 px-2.5">کد ملی</th>
                    <th className="py-1.5 px-2.5">شماره پذیرش</th>
                    <th className="py-1.5 px-2.5">سن/جنس</th>
                    <th className="py-1.5 px-2.5">پزشک معالج</th>
                    <th className="py-1.5 px-2.5">خدمت / بررسی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewImportedPatients.slice(0, 4).map((p) => (
                    <tr key={p.id}>
                      <td className="py-1.5 px-2.5 font-bold text-slate-900">{p.fullName}</td>
                      <td className="py-1.5 px-2.5 font-mono text-slate-700">{p.nationalId || '---'}</td>
                      <td className="py-1.5 px-2.5 font-mono text-slate-700">{p.admissionNumber}</td>
                      <td className="py-1.5 px-2.5 text-slate-700">
                        {p.age ? `${p.age} سال` : '---'} / {p.gender === 'male' ? 'مرد' : 'زن'}
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-700">{p.referringPhysician || '---'}</td>
                      <td className="py-1.5 px-2.5 text-slate-700 flex items-center gap-1.5">
                        {modalityBadge(p.detectedModality)}
                        <span className="truncate max-w-[180px]">{p.serviceName || '---'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Active Worklist Search, Filter & Multi-Select Toolbar */}
        <div className="px-4 sm:px-5 py-2.5 bg-white border-b border-slate-200 space-y-2 shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجوی سریع بیمار (نام، کد ملی، شماره پذیرش، نام خدمت)..."
                className="w-full h-8 pr-9 pl-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-500 text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'all', label: `همه (${stats.total})` },
                { id: 'pending', label: `در انتظار گزارش (${stats.pending})` },
                { id: 'done', label: `ثبت‌شده (${stats.done})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}

              {worklist.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatientIds([]);
                    onClearWorklist();
                  }}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1 cursor-pointer"
                  title="پاک کردن کل لیست کار روزانه"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>پاک کردن لیست</span>
                </button>
              )}
            </div>
          </div>

          {/* Multi-Select Batch Controls Bar */}
          {filteredWorklist.length > 0 && (
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1.5 border-t border-slate-100">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="h-7 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {allFilteredSelected ? (
                    <CheckSquare className="w-3.5 h-3.5 text-teal-600" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>
                    {allFilteredSelected
                      ? 'لغو انتخاب همه'
                      : `انتخاب همه (${filteredWorklist.length})`}
                  </span>
                </button>

                {stats.pending > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectPendingOnly}
                    className="h-7 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold cursor-pointer"
                  >
                    انتخاب فقط در انتظارها ({stats.pending})
                  </button>
                )}

                {validSelectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedPatientIds([])}
                    className="h-7 px-2 rounded-lg text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    پاک کردن انتخاب ({validSelectedIds.length})
                  </button>
                )}
              </div>

              {validSelectedIds.length > 0 ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleOpenSelectedBatch}
                    className="h-8 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span>باز کردن {validSelectedIds.length} بیمار انتخاب‌شده در تب‌های جداگانه</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRemoveSelectedBatch}
                    className="h-8 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    title="حذف بیماران انتخاب‌شده از لیست HIS"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف انتخاب‌شده‌ها</span>
                  </button>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400 font-medium">
                  برای باز کردن همزمان چند بیمار، تیک کنار نام آن‌ها را بزنید
                </span>
              )}
            </div>
          )}
        </div>

        {/* Worklist Patients List */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/70 space-y-2">
          {filteredWorklist.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-12 px-6 text-center space-y-2">
              <FileSpreadsheet className="w-12 h-12 text-teal-600/30 mx-auto" />
              <div className="text-sm font-bold text-slate-700">
                {worklist.length === 0
                  ? 'هنوز لیست بیمارانی از خروجی HIS وارد نشده است'
                  : 'بیماری با این فیلتر یافت نشد'}
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                از نرم‌افزار HIS بیمارستان خروجی اکسل یا CSV بگیرید و فایل را اینجا انتخاب کنید. حتی اگر فایل ده‌ها ستون و چندین تب (شیت) داشته باشد، به راحتی شیت و ستون‌های مورد نظر را انتخاب می‌کنید و می‌توانید چند بیمار را همزمان در تب‌های جداگانه باز کنید.
              </p>
            </div>
          ) : (
            filteredWorklist.map((p, idx) => {
              const done = isPatientReported(p);
              const isChecked = validSelectedIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => toggleSelectPatient(p.id)}
                  className={`rounded-2xl border p-3 transition-all flex items-center justify-between flex-wrap gap-3 cursor-pointer select-none ${
                    isChecked
                      ? 'bg-teal-50/80 border-teal-500 ring-1 ring-teal-500/30 shadow-xs'
                      : done
                      ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-400'
                      : 'bg-white border-slate-200 hover:border-teal-400 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {/* Multi-select Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectPatient(p.id);
                      }}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors cursor-pointer ${
                        isChecked
                          ? 'bg-teal-600 border-teal-600 text-white'
                          : 'bg-white border-slate-300 text-transparent hover:border-teal-500'
                      }`}
                      aria-label="انتخاب بیمار"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </button>

                    <span
                      className={`w-6 h-6 rounded-lg font-mono text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5 ${
                        done
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {done ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                    </span>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm text-slate-900">{p.fullName}</span>
                        {done ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>گزارش ثبت شده</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                            <Clock className="w-3 h-3" />
                            <span>در انتظار گزارش</span>
                          </span>
                        )}
                        {modalityBadge(p.detectedModality)}
                        {p.serviceName && (
                          <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                            {p.serviceName}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center gap-2.5 flex-wrap font-mono">
                        <span>
                          پذیرش: <strong className="text-slate-800">{p.admissionNumber || '---'}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          کد ملی: <strong className="text-slate-800">{p.nationalId || '---'}</strong>
                        </span>
                        <span>•</span>
                        <span className="font-sans">
                          سن/جنس:{' '}
                          <strong className="text-slate-800">
                            {p.age ? `${p.age} سال` : '---'} / {p.gender === 'male' ? 'آقا' : 'خانم'}
                          </strong>
                        </span>
                        {p.referringPhysician && (
                          <>
                            <span>•</span>
                            <span className="font-sans">
                              معالج: <strong className="text-slate-700">{p.referringPhysician}</strong>
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span>تاریخ: {p.reportDate}</span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-1.5 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectPatient(p, false);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-transform active:scale-95 cursor-pointer"
                      title="پر کردن خودکار فرم مشخصات بیمار فعلی با اطلاعات این بیمار"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>فرم فعلی</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectPatient(p, true);
                        onClose();
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="باز کردن این بیمار در یک تب (سربرگ) جدید"
                    >
                      <ArrowUpLeft className="w-3.5 h-3.5 text-teal-300" />
                      <span>تب جدید</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemovePatient(p.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="حذف از لیست کار روزانه"
                    >
                      <Trash2 className="w-4 h-4" />
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
