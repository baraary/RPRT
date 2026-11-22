import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { PatientInfo, Doctor, AppSettings, ReportStudy, Modality, MedicalReport } from '../types';
import {
  Copy,
  X,
  Check,
  FileDown,
  ShieldCheck,
  QrCode,
  Info,
  Image as ImageIcon,
  Share2,
  Type,
  Layers,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Search,
  CalendarCheck,
  Loader2,
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  stripSpellHighlights,
  paginateStudiesIntoA4Pages,
  DEFAULT_CLINIC_LOGO_DATA_URI,
  getOfficialClinicLogoDataUri,
  isOfficialClinicLogoUri,
} from '../services/typistUtils';
import {
  exportTrueVectorPdfReport,
  renderTrueVectorCanvasPage,
} from '../services/vectorPdfGenerator';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientInfo: PatientInfo;
  studies: ReportStudy[];
  doctor: Doctor;
  settings: AppSettings;
  onRecordPrintedReport?: () => void;
  onUpdateSettings?: (updates: Partial<AppSettings>) => void;
  initialAutoAction?: 'png' | 'pdf' | null;
  onAutoActionComplete?: () => void;
  savedReports?: MedicalReport[];
  doctors?: Doctor[];
  initialBatchReports?: MedicalReport[];
  onRecordBatchPrintedReports?: (reportIds: string[]) => void;
}

// Custom Paper-Feed Animated SVG Icon (mimics a sheet feeding through printer rollers)
const PaperFeedPrinterIcon: React.FC<{ activeFeed?: boolean; className?: string }> = ({
  activeFeed = false,
  className = 'w-5 h-5',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Top Paper Sheet feeding into printer */}
    <path d="M6 9V3h12v6" className="opacity-80" />
    {/* Printer Body */}
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    {/* Animated Output Paper Sheet with text lines feeding downward */}
    <g className={activeFeed ? 'animate-paperFeed' : ''}>
      <rect x="6" y="14" width="12" height="8" rx="1" fill="currentColor" fillOpacity="0.15" />
      <line x1="9" y1="17" x2="15" y2="17" strokeWidth="1.6" />
      <line x1="9" y1="19.5" x2="13" y2="19.5" strokeWidth="1.6" />
    </g>
  </svg>
);

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  patientInfo,
  studies,
  doctor,
  settings,
  onRecordPrintedReport,
  onUpdateSettings,
  initialAutoAction,
  onAutoActionComplete,
  savedReports = [],
  doctors = [],
  initialBatchReports = [],
  onRecordBatchPrintedReports,
}) => {
  const [copied, setCopied] = useState(false);
  const [forcePageBreakPerStudy, setForcePageBreakPerStudy] = useState(
    settings.pageBreakPerStudy || false
  );
  const [preprintedLetterheadMode, setPreprintedLetterheadMode] = useState(
    Boolean(settings.preprintedLetterheadMode)
  );
  const [preprintedTopMarginMm, setPreprintedTopMarginMm] = useState<number>(
    settings.preprintedTopMarginMm ?? 45
  );
  const [monochromePrintMode, setMonochromePrintMode] = useState(
    Boolean(settings.monochromePrintMode)
  );
  const [headerFont, setHeaderFont] = useState(settings.headerFont || "'Vazirmatn', sans-serif");
  const [headerFontSize, setHeaderFontSize] = useState<number>(settings.headerFontSize || 18);
  const [headingFont, setHeadingFont] = useState(
    settings.headingFont || settings.defaultFont || "'Vazirmatn', sans-serif"
  );
  const [headingFontSize, setHeadingFontSize] = useState<number>(
    parseInt(String(settings.headingFontSize || '16'), 10) || 16
  );
  const [bodyFont, setBodyFont] = useState(settings.defaultFont || "'Vazirmatn', sans-serif");
  const [bodyFontSize, setBodyFontSize] = useState<number>(settings.defaultFontSize || 14);
  const [qrMode, setQrMode] = useState<'url' | 'text'>('url');
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [isQrInspectOpen, setIsQrInspectOpen] = useState(false);
  const [printSuccessFeedback, setPrintSuccessFeedback] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string>('');
  const [batchQueue, setBatchQueue] = useState<MedicalReport[]>([]);
  const [showQueuePanel, setShowQueuePanel] = useState(false);
  const [queueSearch, setQueueSearch] = useState('');
  const [batchProgress, setBatchProgress] = useState<{
    kind: 'pdf' | 'png';
    current: number;
    total: number;
    label: string;
  } | null>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const reportBlockRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const unifiedLineHeight = settings.editorLineHeight || settings.printLineHeight || 1.8;

  useEffect(() => {
    if (isOpen) {
      setHeaderFont(settings.headerFont || "'Vazirmatn', sans-serif");
      setHeaderFontSize(settings.headerFontSize || 18);
      setHeadingFont(settings.headingFont || settings.defaultFont || "'Vazirmatn', sans-serif");
      setHeadingFontSize(parseInt(String(settings.headingFontSize || '16'), 10) || 16);
      setBodyFont(settings.defaultFont || "'Vazirmatn', sans-serif");
      setBodyFontSize(settings.defaultFontSize || 14);
      setForcePageBreakPerStudy(Boolean(settings.pageBreakPerStudy));
      setPreprintedLetterheadMode(Boolean(settings.preprintedLetterheadMode));
      setPreprintedTopMarginMm(settings.preprintedTopMarginMm ?? 45);
      setMonochromePrintMode(Boolean(settings.monochromePrintMode));
      if (initialBatchReports && initialBatchReports.length > 0) {
        setBatchQueue(initialBatchReports);
        setShowQueuePanel(true);
      } else {
        setBatchQueue([]);
        setShowQueuePanel(false);
      }
      setQueueSearch('');
      setBatchProgress(null);
    }
  }, [isOpen, settings, initialBatchReports]);

  const modalityNames: Record<Modality, string> = {
    mri: 'ام‌آر‌آی (MRI)',
    ct: 'سی‌تی‌اسکن (CT Scan)',
    sonography: 'سونوگرافی (Ultrasound)',
  };

  const getModalityColorHex = useCallback(
    (mod: Modality): string => {
      if (monochromePrintMode) return '#000000';
      return (
        settings.modalityColors?.[mod] ||
        (mod === 'mri' ? '#4f46e5' : mod === 'ct' ? '#059669' : '#0284c7')
      );
    },
    [monochromePrintMode, settings.modalityColors]
  );

  // Format font-family safely: ALWAYS prepend 'TimesNewRomanLatin' (so all English words/terms inside Persian or English reports render in Times New Roman) and append loaded Persian web fonts
  const formatCssFontStack = (fontVal: string) => {
    const trimmed = (fontVal || "'Vazirmatn', sans-serif").trim();
    const cleanName = trimmed.replace(/['"]/g, '').split(',')[0].trim();
    if (!cleanName || cleanName.toLowerCase() === 'vazirmatn') {
      return "'TimesNewRomanLatin', 'Vazirmatn', 'Times New Roman', 'Noto Naskh Arabic', Tahoma, serif";
    }
    if (cleanName.toLowerCase().includes('times')) {
      return "'TimesNewRomanLatin', 'Times New Roman', 'Vazirmatn', serif";
    }
    if (cleanName.toLowerCase().includes('titr') || cleanName.toLowerCase().includes('lalezar')) {
      return `'TimesNewRomanLatin', '${cleanName}', 'Lalezar', 'Vazirmatn', 'Times New Roman', Tahoma, sans-serif`;
    }
    if (
      cleanName.toLowerCase().includes('nazanin') ||
      cleanName.toLowerCase().includes('amiri') ||
      cleanName.toLowerCase().includes('naskh') ||
      cleanName.toLowerCase().includes('zar') ||
      cleanName.toLowerCase().includes('lotus') ||
      cleanName.toLowerCase().includes('mitra')
    ) {
      return `'TimesNewRomanLatin', '${cleanName}', 'Amiri', 'Noto Naskh Arabic', 'Vazirmatn', 'Times New Roman', Tahoma, serif`;
    }
    return `'TimesNewRomanLatin', '${cleanName}', 'Vazirmatn', 'Times New Roman', 'Noto Naskh Arabic', Tahoma, sans-serif`;
  };

  const formatStampFontStack = (fontVal: string) => {
    const trimmed = (fontVal || "'Vazirmatn', sans-serif").trim();
    const cleanName = trimmed.replace(/['"]/g, '').split(',')[0].trim();
    if (!cleanName || cleanName.toLowerCase() === 'vazirmatn') {
      return "'Vazirmatn', sans-serif";
    }
    if (trimmed.includes(',')) {
      return trimmed;
    }
    return `'${cleanName}', 'Vazirmatn', sans-serif`;
  };

  const sanitizeSignatureUrl = (rawSig?: string) => {
    const val = rawSig || '';
    if (!val.includes('RADIOLOGY')) return val;
    return val.replace(
      encodeURIComponent(
        '<text x="62" y="48" font-family="Tahoma, sans-serif" font-size="10" font-weight="bold" fill="#0f766e" text-anchor="middle" opacity="0.85">RADIOLOGY</text>'
      ),
      encodeURIComponent(
        '<path d="M62 24 L65 37 L78 37 L67 45 L71 58 L62 50 L53 58 L57 45 L46 37 L59 37 Z" fill="none" stroke="#0f766e" stroke-width="1.4" opacity="0.55"/>'
      )
    );
  };

  const resolvedHeaderFontCss = formatCssFontStack(headerFont);
  const resolvedHeadingFontCss = formatCssFontStack(headingFont);
  const resolvedBodyFontCss = formatCssFontStack(bodyFont);

  const isBatchMode = batchQueue.length > 0;

  // Build normalized render entries for either Single Editor Report or Multi-Report Batch Queue
  const renderedReports = useMemo(() => {
    const rawLogoUrl = settings.clinicLogoUrl || DEFAULT_CLINIC_LOGO_DATA_URI;

    const buildEntry = (
      key: string,
      pInfo: PatientInfo,
      stList: ReportStudy[],
      doc: Doctor,
      isCurrentEditor: boolean
    ) => {
      const safeStudies = stList && stList.length > 0 ? stList : studies;
      const mod: Modality = safeStudies[0]?.modality || 'sonography';
      const modColor = getModalityColorHex(mod);
      const logoUrl = isOfficialClinicLogoUri(rawLogoUrl)
        ? getOfficialClinicLogoDataUri(modColor)
        : rawLogoUrl;
      const sigUrl = sanitizeSignatureUrl(doc.signatureUrl || settings.doctorSignatureUrl || '');
      const stampFontCss = formatStampFontStack(doc.stampFont || headerFont || "'Vazirmatn', sans-serif");
      const stampFontSize = doc.stampFontSize || 13;
      const pagination = paginateStudiesIntoA4Pages(safeStudies, {
        defaultFontSize: bodyFontSize || 14,
        printLineHeight: unifiedLineHeight,
        forcePageBreakPerStudy,
        preprintedLetterheadMode,
        preprintedTopMarginMm,
      });

      return {
        key,
        isCurrentEditor,
        patientInfo: pInfo,
        studies: safeStudies,
        doctor: doc,
        primaryModality: mod,
        activeModalityColor: modColor,
        effectiveLogoUrl: logoUrl,
        effectiveSignatureUrl: sigUrl,
        resolvedDoctorStampFontCss: stampFontCss,
        resolvedDoctorStampFontSize: stampFontSize,
        pagination,
      };
    };

    if (!isBatchMode) {
      return [buildEntry('__current__', patientInfo, studies, doctor, true)];
    }

    return batchQueue.map((rep) => {
      const matchedDoc = doctors.find((d) => d.id === rep.doctorId) || doctor;
      return buildEntry(
        rep.id,
        rep.patientInfo,
        rep.studies && rep.studies.length > 0 ? rep.studies : [],
        matchedDoc,
        rep.id === '__current_editor__'
      );
    });
  }, [
    isBatchMode,
    batchQueue,
    doctors,
    patientInfo,
    studies,
    doctor,
    settings.clinicLogoUrl,
    settings.doctorSignatureUrl,
    headerFont,
    bodyFontSize,
    unifiedLineHeight,
    forcePageBreakPerStudy,
    preprintedLetterheadMode,
    preprintedTopMarginMm,
    getModalityColorHex,
  ]);

  const primaryEntry = renderedReports[0];
  const paginationResult = primaryEntry.pagination;
  const activeModalityColor = primaryEntry.activeModalityColor;
  const resolvedDoctorStampFontCss = primaryEntry.resolvedDoctorStampFontCss;
  const totalBatchPages = useMemo(
    () => renderedReports.reduce((sum, item) => sum + item.pagination.totalPages, 0),
    [renderedReports]
  );

  const buildQrPayloadForEntry = useCallback(
    (pInfo: PatientInfo, stList: ReportStudy[], doc: Doctor, mode: 'url' | 'text') => {
      const adm = pInfo.admissionNumber || 'ADM-001';
      const date = pInfo.reportDate || '1404/08/21';
      const modCode = stList
        .map((s) => (s.modality === 'mri' ? 'MRI' : s.modality === 'ct' ? 'CT' : 'US'))
        .join('+');

      if (mode === 'url') {
        const origin =
          typeof window !== 'undefined' && window.location.origin
            ? window.location.origin
            : 'https://shafa-imaging.ir';
        const params = new URLSearchParams({
          v: '1',
          a: adm,
          d: date,
          m: modCode,
          mc: doc.medicalCouncilId || '45892',
        });
        if (pInfo.fullName && pInfo.fullName.length <= 28) {
          params.set('p', pInfo.fullName);
        }
        return `${origin}/?${params.toString()}`;
      }

      return [
        settings.clinicName || 'مرکز جامع تصویربرداری بیمارستان شفا',
        `بیمار: ${pInfo.fullName || '---'}`,
        `پذیرش: ${adm}`,
        `تاریخ: ${date}`,
        `بررسی: ${modCode}`,
        `پزشک: ${doc.name} (ن.پ: ${doc.medicalCouncilId})`,
        'وضعیت: تایید اصالت نهایی',
      ].join('\n');
    },
    [settings.clinicName]
  );

  // Generate high-contrast, low-density QR codes for EVERY report in single or batch mode
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const generateAllQrs = async () => {
      const entries = await Promise.all(
        renderedReports.map(async (entry) => {
          try {
            const payload = buildQrPayloadForEntry(
              entry.patientInfo,
              entry.studies,
              entry.doctor,
              qrMode
            );
            const url = await QRCode.toDataURL(payload, {
              width: 320,
              margin: 2,
              errorCorrectionLevel: 'L',
              color: {
                dark: '#000000',
                light: '#ffffff',
              },
            });
            return [entry.key, url] as const;
          } catch (err) {
            console.error('QR code generation error', err);
            return [entry.key, ''] as const;
          }
        })
      );

      if (!cancelled) {
        const nextMap: Record<string, string> = {};
        entries.forEach(([k, v]) => {
          if (v) nextMap[k] = v;
        });
        setQrMap(nextMap);
      }
    };

    generateAllQrs();
    return () => {
      cancelled = true;
    };
  }, [isOpen, renderedReports, qrMode, buildQrPayloadForEntry]);

  const qrDataUrl = qrMap[primaryEntry.key] || '';

  // Batch queue manipulation helpers
  const handleAddReportToQueue = (rep: MedicalReport) => {
    setBatchQueue((prev) => {
      if (prev.some((r) => r.id === rep.id)) return prev;
      return [...prev, rep];
    });
  };

  const handleAddCurrentEditorToQueue = () => {
    const snapshot: MedicalReport = {
      id: '__current_editor__',
      patientInfo: { ...patientInfo },
      studies: JSON.parse(JSON.stringify(studies)),
      doctorId: doctor.id,
      status: 'finalized',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setBatchQueue((prev) => {
      const exists = prev.some((r) => r.id === '__current_editor__');
      if (exists) {
        return prev.map((r) => (r.id === '__current_editor__' ? snapshot : r));
      }
      return [snapshot, ...prev];
    });
  };

  const handleAddTodaysReportsToQueue = () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    let todayFa = '';
    try {
      todayFa = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
    } catch {}
    const normalizeDate = (s: string) =>
      (s || '')
        .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
        .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
        .trim();
    const normToday = normalizeDate(todayFa);

    const todays = savedReports.filter((rep) => {
      if (rep.createdAt?.slice(0, 10) === todayIso) return true;
      const rd = normalizeDate(rep.patientInfo?.reportDate || '');
      return Boolean(normToday && rd && rd === normToday);
    });

    if (todays.length === 0) {
      setShareFeedback('گزارشی با تاریخ امروز در آرشیو یافت نشد.');
      setTimeout(() => setShareFeedback(''), 3000);
      return;
    }

    setBatchQueue((prev) => {
      const existingIds = new Set(prev.map((r) => r.id));
      const additions = todays.filter((r) => !existingIds.has(r.id));
      return [...prev, ...additions];
    });
    setShareFeedback(`✓ ${todays.length} گزارش امروز به صف چاپ دسته‌ای اضافه شد.`);
    setTimeout(() => setShareFeedback(''), 3000);
  };

  const handleRemoveFromQueue = (id: string) => {
    setBatchQueue((prev) => prev.filter((r) => r.id !== id));
  };

  const handleMoveQueueItem = (index: number, delta: -1 | 1) => {
    setBatchQueue((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const filteredArchiveForPicker = useMemo(() => {
    const q = queueSearch.trim().toLowerCase();
    const list = q
      ? savedReports.filter((rep) => {
          const name = (rep.patientInfo?.fullName || '').toLowerCase();
          const adm = (rep.patientInfo?.admissionNumber || '').toLowerCase();
          const nid = (rep.patientInfo?.nationalId || '').toLowerCase();
          const dt = (rep.patientInfo?.reportDate || '').toLowerCase();
          const title = (rep.studies?.[0]?.titleAndTechnique || '').toLowerCase();
          return (
            name.includes(q) ||
            adm.includes(q) ||
            nid.includes(q) ||
            dt.includes(q) ||
            title.includes(q)
          );
        })
      : savedReports;
    return list.slice(0, 40);
  }, [savedReports, queueSearch]);

  const recordPrintedStatus = () => {
    if (isBatchMode) {
      const archiveIds = batchQueue
        .filter((r) => r.id !== '__current_editor__')
        .map((r) => r.id);
      if (archiveIds.length > 0 && onRecordBatchPrintedReports) {
        onRecordBatchPrintedReports(archiveIds);
      }
      if (batchQueue.some((r) => r.id === '__current_editor__') && onRecordPrintedReport) {
        onRecordPrintedReport();
      }
    } else if (onRecordPrintedReport) {
      onRecordPrintedReport();
    }
  };

  // Standalone full-fidelity HTML generator matching multi-page A4 preview 100% (includes Google Web Fonts & guaranteed visible footer)
  const getFullPrintableDocumentHtml = () => {
    const rawContent = stripSpellHighlights(printAreaRef.current?.innerHTML || '', true);

    let compiledCss = '';
    try {
      for (let i = 0; i < document.styleSheets.length; i++) {
        const sheet = document.styleSheets[i];
        try {
          const rules = sheet.cssRules || sheet.rules;
          if (rules) {
            for (let j = 0; j < rules.length; j++) {
              compiledCss += rules[j].cssText + '\n';
            }
          }
        } catch {
          // Cross-origin stylesheet, skip
        }
      }
    } catch {
      // Ignore stylesheet iteration errors
    }

    const baseHref =
      typeof window !== 'undefined' && window.location.origin ? `${window.location.origin}/` : '/';

    return `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="utf-8">
  <base href="${baseHref}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>&lrm;</title>
  <style>
    ${compiledCss}
    @page {
      size: A4 portrait;
      margin: 0 !important;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: ${resolvedBodyFontCss};
      direction: rtl;
      text-align: right;
      margin: 0;
      padding: 24px;
      color: #0f172a;
      background: #cbd5e1;
      font-size: ${bodyFontSize || 14}px;
      line-height: ${unifiedLineHeight};
    }
    .a4-sheet-page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto 24px auto;
      background: #ffffff;
      color: #050811;
      position: relative;
      overflow: hidden;
      padding: ${preprintedLetterheadMode ? `${preprintedTopMarginMm}mm 15mm 14mm 15mm` : '12mm 15mm 12mm 15mm'};
      box-shadow: 0 8px 30px rgba(0,0,0,0.15);
      border-radius: 12px;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      page-break-after: always;
      break-after: page;
      animation: none !important;
      transform: none !important;
      opacity: 1 !important;
    }
    .a4-watermark-logo {
      position: absolute !important;
      inset: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      pointer-events: none !important;
      z-index: 0 !important;
      overflow: hidden !important;
    }
    .a4-watermark-logo img {
      width: 92mm !important;
      height: 92mm !important;
      object-fit: contain !important;
      opacity: 0.065 !important;
    }
    .a4-sheet-page:last-of-type {
      page-break-after: auto;
      break-after: auto;
    }
    .a4-pinned-footer {
      display: flex !important;
      visibility: visible !important;
      opacity: 1 !important;
      margin-top: auto !important;
      padding-top: 14px !important;
      width: 100% !important;
      position: relative !important;
      z-index: 10 !important;
    }
    .printable-header-section,
    .printable-header-section * {
      font-family: ${resolvedHeaderFontCss} !important;
    }
    .study-heading,
    .study-box h1,
    .study-box h2,
    .study-box h3 {
      font-family: ${resolvedHeadingFontCss} !important;
      font-size: ${headingFontSize}px !important;
    }
    .doctor-stamp-box,
    .doctor-stamp-box * {
      font-family: ${resolvedDoctorStampFontCss} !important;
    }
    .impression-box {
      background-color: #f8fafc !important;
      border: 2px solid ${activeModalityColor} !important;
      border-radius: 12px;
      padding: 12px;
      margin-top: 10px;
    }
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .a4-sheet-page {
        box-shadow: none !important;
        margin: 0 auto !important;
        width: 210mm !important;
        min-height: 297mm !important;
        border-radius: 0 !important;
        ${monochromePrintMode ? 'filter: grayscale(100%) contrast(120%) !important; color: #000000 !important;' : ''}
      }
      .a4-pinned-footer {
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
        margin-top: auto !important;
      }
      .no-print {
        display: none !important;
      }
    }
    .floating-action-bar {
      position: fixed;
      top: 14px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      background: #0f172a;
      color: #ffffff;
      padding: 10px 24px;
      border-radius: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      gap: 16px;
      font-family: inherit;
      font-size: 13px;
    }
    .btn-trigger-print {
      background: #0d9488;
      color: #ffffff;
      border: none;
      padding: 8px 20px;
      border-radius: 20px;
      font-weight: bold;
      cursor: pointer;
      font-family: inherit;
    }
  </style>
</head>
<body>
  <div class="floating-action-bar no-print">
    <span class="font-bold">📄 ${
      isBatchMode
        ? `چاپ دسته‌ای (${renderedReports.length} گزارش • ${totalBatchPages} برگه A4)`
        : `گزارش رسمی سربرگ‌دار (${paginationResult.totalPages} برگه A4)`
    }</span>
    <span class="text-xs text-teal-300">💡 در پنجره پرینت، تیک Headers and Footers را بردارید</span>
    <button class="btn-trigger-print" onclick="window.print()">🖨️ چاپ سربرگ / ذخیره PDF (Ctrl+P)</button>
  </div>
  <div>
    ${rawContent}
  </div>
  <script>
    window.onload = function() {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function() {
          setTimeout(function() {
            try { window.print(); } catch(e) {}
          }, 250);
        });
      } else {
        setTimeout(function() {
          try { window.print(); } catch(e) {}
        }, 350);
      }
    };
  </script>
</body>
</html>`;
  };

  const handlePrint = () => {
    recordPrintedStatus();
    setPrintSuccessFeedback(true);
    setTimeout(() => setPrintSuccessFeedback(false), 4500);

    const originalTitle = document.title;
    try {
      document.title = '';

      const iframe = document.createElement('iframe');
      iframe.setAttribute(
        'style',
        'position:fixed;right:-2000px;bottom:-2000px;width:10px;height:10px;border:0;opacity:0;'
      );
      document.body.appendChild(iframe);

      const html = getFullPrintableDocumentHtml();
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.warn('Iframe print restricted, trying direct window.print()', e);
            window.print();
          } finally {
            setTimeout(() => {
              try {
                document.body.removeChild(iframe);
              } catch {}
              document.title = originalTitle;
            }, 3000);
          }
        }, 500);
      } else {
        window.print();
        setTimeout(() => {
          document.title = originalTitle;
        }, 3000);
      }
    } catch (err) {
      console.warn('Print routine warning', err);
      try {
        window.print();
      } catch {
        handleDownloadPrintHtml();
      } finally {
        setTimeout(() => {
          document.title = originalTitle;
        }, 3000);
      }
    }
  };

  const handleDownloadPrintHtml = () => {
    if (onRecordPrintedReport) {
      onRecordPrintedReport();
    }
    const html = getFullPrintableDocumentHtml();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Print_Report_${patientInfo.nationalId || 'Radiology'}_${patientInfo.fullName || 'Patient'}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportWord = () => {
    const headerHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>&lrm;</title>
      <style>
        body { font-family: '${settings.defaultFont || 'Vazirmatn'}', 'B Nazanin', Arial; direction: rtl; text-align: right; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 6px; }
        .study-box { margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #cbd5e1; page-break-inside: avoid; }
        .study-heading { font-family: '${settings.headingFont || 'Vazirmatn'}'; font-size: ${settings.headingFontSize || '16px'}; font-weight: bold; }
        .impression-box { background-color: #f8fafc; border: 2px solid #0f766e; padding: 12px; margin-top: 15px; }
        .a4-watermark-logo { display: none !important; }
      </style>
      </head><body dir='rtl'>
    `;
    const content = printAreaRef.current?.innerHTML || '';
    const footerHtml = '</body></html>';
    const source = headerHtml + content + footerHtml;

    const blob = new Blob(['\ufeff' + source], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Report_${patientInfo.nationalId || 'Radiology'}_${patientInfo.fullName || 'Patient'}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyText = () => {
    if (!printAreaRef.current) return;
    const text = printAreaRef.current.innerText;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Multi-Page True 300-DPI Native Canvas A4 PNG Export (Supports Single & Simultaneous Batch Multi-Report Export)
  const handleExportPngImage = async () => {
    if (isExportingImage || isExportingPdf) return;
    setIsExportingImage(true);
    try {
      recordPrintedStatus();

      const totalPagesAll = totalBatchPages;
      let exportedCount = 0;

      for (let rIdx = 0; rIdx < renderedReports.length; rIdx++) {
        const entry = renderedReports[rIdx];
        const total = entry.pagination.totalPages;
        const safeName = (entry.patientInfo.fullName || 'Patient').replace(/[\\/:*?"<>|]+/g, '_');
        const safeId = (
          entry.patientInfo.nationalId ||
          entry.patientInfo.admissionNumber ||
          `Report_${rIdx + 1}`
        ).replace(/[\\/:*?"<>|]+/g, '_');
        const baseName = `Report_Image_${safeId}_${safeName}`;

        let entryQr = qrMap[entry.key] || '';
        if (!entryQr) {
          try {
            const payload = buildQrPayloadForEntry(
              entry.patientInfo,
              entry.studies,
              entry.doctor,
              qrMode
            );
            entryQr = await QRCode.toDataURL(payload, {
              width: 320,
              margin: 2,
              errorCorrectionLevel: 'L',
              color: { dark: '#000000', light: '#ffffff' },
            });
          } catch {}
        }

        for (let i = 0; i < total; i++) {
          const sheet = entry.pagination.pages[i];
          if (!sheet) continue;

          exportedCount++;
          if (isBatchMode || totalPagesAll > 1) {
            setBatchProgress({
              kind: 'png',
              current: exportedCount,
              total: totalPagesAll,
              label: `${entry.patientInfo.fullName || 'بیمار'} (برگه ${i + 1} از ${total})`,
            });
          }

          const canvas = await renderTrueVectorCanvasPage({
            patientInfo: entry.patientInfo,
            studies: entry.studies,
            doctor: entry.doctor,
            settings,
            sheet,
            totalPages: total,
            effectiveLogoUrl: entry.effectiveLogoUrl,
            effectiveSignatureUrl: entry.effectiveSignatureUrl,
            qrDataUrl: entryQr,
            qrMode,
            monochromePrintMode,
            preprintedLetterheadMode,
            preprintedTopMarginMm,
            headerFontCss: resolvedHeaderFontCss,
            headerFontSize,
            headingFontCss: resolvedHeadingFontCss,
            headingFontSize,
            bodyFontCss: resolvedBodyFontCss,
            bodyFontSize: bodyFontSize || 14,
            doctorStampFontCss: entry.resolvedDoctorStampFontCss,
            doctorStampFontSize: entry.resolvedDoctorStampFontSize,
            lineHeight: unifiedLineHeight,
            dpiScale: 11.811, // True 300 DPI (2480 x 3508 px)
          });

          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob((b) => resolve(b), 'image/png')
          );
          const downloadUrl = blob ? URL.createObjectURL(blob) : canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = total > 1 ? `${baseName}_Page${i + 1}.png` : `${baseName}.png`;
          link.href = downloadUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          if (blob) {
            setTimeout(() => URL.revokeObjectURL(downloadUrl), 6000);
          }

          // Space out multi-file browser downloads slightly so Chrome/Edge never throttles them
          if (totalPagesAll > 1) {
            await new Promise((res) => setTimeout(res, 320));
          }
        }
      }

      setShareFeedback(
        isBatchMode
          ? `✓ ${exportedCount} فایل تصویر ۳۰۰ DPI واقعی PNG برای ${renderedReports.length} گزارش با موفقیت دانلود شد.`
          : totalPagesAll > 1
          ? `✓ ${totalPagesAll} برگه تصویر ۳۰۰ DPI واقعی PNG (برگه ۱ تا ${totalPagesAll}) با فونت کاملاً پیوسته و شارپ دانلود شد.`
          : '✓ تصویر ۳۰۰ DPI واقعی PNG برگه گزارش با فونت کاملاً پیوسته و شارپ دانلود شد.'
      );
      setTimeout(() => setShareFeedback(''), 5000);
    } catch (err) {
      console.warn('PNG export warning:', err);
    } finally {
      setBatchProgress(null);
      setIsExportingImage(false);
    }
  };

  // Direct Multi-Page True Vector A4 PDF File Download (Supports Single & Simultaneous Batch Multi-Report Export)
  const handleExportPdfFile = async () => {
    if (isExportingPdf || isExportingImage) return;
    setIsExportingPdf(true);
    try {
      recordPrintedStatus();

      for (let rIdx = 0; rIdx < renderedReports.length; rIdx++) {
        const entry = renderedReports[rIdx];
        const total = entry.pagination.totalPages;

        if (isBatchMode) {
          setBatchProgress({
            kind: 'pdf',
            current: rIdx + 1,
            total: renderedReports.length,
            label: `${entry.patientInfo.fullName || 'بیمار'} (${total} صفحه A4)`,
          });
        }

        let entryQr = qrMap[entry.key] || '';
        if (!entryQr) {
          try {
            const payload = buildQrPayloadForEntry(
              entry.patientInfo,
              entry.studies,
              entry.doctor,
              qrMode
            );
            entryQr = await QRCode.toDataURL(payload, {
              width: 320,
              margin: 2,
              errorCorrectionLevel: 'L',
              color: { dark: '#000000', light: '#ffffff' },
            });
          } catch {}
        }

        await exportTrueVectorPdfReport({
          patientInfo: entry.patientInfo,
          studies: entry.studies,
          doctor: entry.doctor,
          settings,
          pages: entry.pagination.pages,
          totalPages: total,
          effectiveLogoUrl: entry.effectiveLogoUrl,
          effectiveSignatureUrl: entry.effectiveSignatureUrl,
          qrDataUrl: entryQr,
          qrMode,
          monochromePrintMode,
          preprintedLetterheadMode,
          preprintedTopMarginMm,
          headerFontCss: resolvedHeaderFontCss,
          headerFontSize,
          headingFontCss: resolvedHeadingFontCss,
          headingFontSize,
          bodyFontCss: resolvedBodyFontCss,
          bodyFontSize: bodyFontSize || 14,
          doctorStampFontCss: entry.resolvedDoctorStampFontCss,
          doctorStampFontSize: entry.resolvedDoctorStampFontSize,
          lineHeight: unifiedLineHeight,
        });

        // Brief pause between sequential PDF downloads so browser saves every file reliably
        if (renderedReports.length > 1 && rIdx < renderedReports.length - 1) {
          await new Promise((res) => setTimeout(res, 380));
        }
      }

      setShareFeedback(
        isBatchMode
          ? `✓ ${renderedReports.length} فایل PDF مجزا (${totalBatchPages} صفحه A4) با موفقیت دانلود شد.`
          : paginationResult.totalPages > 1
          ? `✓ فایل PDF (${paginationResult.totalPages} صفحه A4) با موفقیت دانلود شد.`
          : '✓ فایل PDF گزارش A4 با موفقیت دانلود شد.'
      );
      setTimeout(() => setShareFeedback(''), 5000);
    } catch (err) {
      console.error('PDF export error:', err);
      setShareFeedback('خطا در تولید فایل PDF. لطفاً مجدداً تلاش کنید.');
      setTimeout(() => setShareFeedback(''), 4000);
    } finally {
      setBatchProgress(null);
      setIsExportingPdf(false);
    }
  };

  // Auto-trigger direct PNG or PDF export when opened from the bottom dock quick buttons
  useEffect(() => {
    if (!isOpen || !initialAutoAction || !qrDataUrl) return;
    const timer = window.setTimeout(() => {
      if (initialAutoAction === 'png') {
        handleExportPngImage();
      } else if (initialAutoAction === 'pdf') {
        handleExportPdfFile();
      }
      onAutoActionComplete?.();
    }, 60);
    return () => window.clearTimeout(timer);
  }, [isOpen, initialAutoAction, qrDataUrl]);

  // Quick Share for WhatsApp / Telegram / Native Share
  const handleQuickShareReport = async () => {
    if (!printAreaRef.current) return;
    setIsExportingImage(true);
    try {
      const summaryText = [
        `📄 گزارش رسمی تصویربرداری - ${settings.clinicName || 'مرکز تصویربرداری بیمارستان شفا'}`,
        `👤 نام بیمار: ${patientInfo.fullName || '---'} (پذیرش: ${patientInfo.admissionNumber || '---'})`,
        `📅 تاریخ: ${patientInfo.reportDate || '---'}`,
        `🩺 پزشک تاییدکننده: ${doctor.name}`,
        '',
        printAreaRef.current.innerText.slice(0, 700),
      ].join('\n');

      const firstSheet = paginationResult.pages[0];
      if (typeof navigator !== 'undefined' && navigator.share && firstSheet) {
        try {
          const canvas = await renderTrueVectorCanvasPage({
            patientInfo: primaryEntry.patientInfo,
            studies: primaryEntry.studies,
            doctor: primaryEntry.doctor,
            settings,
            sheet: firstSheet,
            totalPages: paginationResult.totalPages,
            effectiveLogoUrl: primaryEntry.effectiveLogoUrl,
            effectiveSignatureUrl: primaryEntry.effectiveSignatureUrl,
            qrDataUrl,
            qrMode,
            monochromePrintMode,
            preprintedLetterheadMode,
            preprintedTopMarginMm,
            headerFontCss: resolvedHeaderFontCss,
            headerFontSize,
            headingFontCss: resolvedHeadingFontCss,
            headingFontSize,
            bodyFontCss: resolvedBodyFontCss,
            bodyFontSize: bodyFontSize || 14,
            doctorStampFontCss: primaryEntry.resolvedDoctorStampFontCss,
            doctorStampFontSize: primaryEntry.resolvedDoctorStampFontSize,
            lineHeight: unifiedLineHeight,
            dpiScale: 10,
          });
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob((b) => resolve(b), 'image/png')
          );
          if (blob) {
            const file = new File(
              [blob],
              `Radiology_Report_${patientInfo.admissionNumber || '001'}.png`,
              { type: 'image/png' }
            );
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: `گزارش تصویربرداری ${patientInfo.fullName || ''}`,
                text: summaryText,
                files: [file],
              });
              setIsExportingImage(false);
              return;
            }
          }
          await navigator.share({
            title: `گزارش تصویربرداری ${patientInfo.fullName || ''}`,
            text: summaryText,
          });
          setIsExportingImage(false);
          return;
        } catch {}
      }

      await handleExportPngImage();
      await navigator.clipboard.writeText(summaryText);
      setShareFeedback(
        '✓ تصویر گزارش دانلود و متن خلاصه کپی شد (آماده الصاق در واتساپ / تلگرام).'
      );
      setTimeout(() => setShareFeedback(''), 4000);
    } finally {
      setIsExportingImage(false);
    }
  };

  if (!isOpen) return null;

  const clinicNameDisplay = settings.clinicName || 'مرکز جامع تصویربرداری بیمارستان شفا';
  const clinicSubtitleDisplay =
    settings.clinicSubtitle || 'رادیولوژی، سونوگرافی، ام‌آر‌آی، ام‌آر‌آی قلب، سی‌تی‌اسکن';
  const clinicAddressDisplay =
    settings.clinicAddress || 'مازندران، ساری، کمربندی غربی، بلوار ولیعصر';
  const clinicPhoneDisplay = settings.clinicPhone || '۰۱۱-۳۳۲۰۵۰۰۶-۹';

  return (
    <div className="print-modal-backdrop fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="print-modal-container bg-slate-100 rounded-3xl shadow-2xl border border-slate-300 max-w-4xl w-full max-h-[96vh] flex flex-col overflow-hidden animate-fadeSlideUp">
        {/* Top Control Bar (Non-printed) */}
        <div className="bg-slate-900 text-white no-print shrink-0">
          {/* Row 1: Modal Title, Page Count Badge & Close Button */}
          <div className="px-4 sm:px-5 py-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 transition-colors ${
                  printSuccessFeedback
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                    : 'bg-teal-500/15 border-teal-400/30 text-teal-400'
                }`}
              >
                <PaperFeedPrinterIcon activeFeed={true} className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm sm:text-base">
                    {isBatchMode
                      ? `صف چاپ و خروجی دسته‌ای (${renderedReports.length} گزارش)`
                      : 'پیش‌نمایش چاپ سربرگ رسمی و صدور گزارش (A4)'}
                  </h3>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                      isBatchMode
                        ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                        : paginationResult.totalPages > 1
                        ? 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                        : 'bg-teal-500/20 text-teal-200 border-teal-400/40'
                    }`}
                  >
                    {isBatchMode
                      ? `${renderedReports.length} بیمار • مجموعاً ${totalBatchPages} برگه A4 آماده چاپ یکجا`
                      : paginationResult.totalPages === 1
                      ? `۱ برگه A4 (${paginationResult.fillPercent}% پر شده • ${paginationResult.remainingLinesPage1} خط مانده)`
                      : `${paginationResult.totalPages} برگه مجزای A4 (${paginationResult.fillPercent}%)`}
                  </span>
                </div>
                <p className="text-[11px] text-teal-300 flex items-center gap-1 mt-0.5">
                  <Info className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span className="truncate">
                    {isBatchMode
                      ? 'با یک کلیک همه گزارش‌های صف به چاپگر ارسال می‌شوند یا همزمان فایل‌های PDF و PNG مجزا برای هر بیمار ساخته می‌شود.'
                      : 'فوتر و مهر پزشک در پایین هر برگه A4 قفل شده است • در پنجره پرینت تیک Headers and footers را بردارید.'}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowQueuePanel((v) => !v)}
                className={`h-9 px-3 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
                  showQueuePanel || isBatchMode
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 shadow-xs'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                }`}
                title="مدیریت صف چاپ، PDF و PNG دسته‌ای چند گزارش همزمان"
              >
                <Layers className="w-4 h-4" />
                <span>
                  {isBatchMode ? `صف چاپ دسته‌ای (${batchQueue.length})` : 'صف چاپ دسته‌ای'}
                </span>
              </button>

              <button
                type="button"
                onClick={onClose}
                title="بستن پنجره پیش‌نمایش چاپ (Esc)"
                className="h-9 px-3 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white border border-slate-700 hover:border-rose-500 flex items-center gap-1.5 text-xs font-bold shrink-0 transition-colors cursor-pointer"
              >
                <span>بستن</span>
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Row 2: Dedicated Action Toolbar + Live Header & Body Font/Size, Line-Height & Modality Color Controls */}
          <div className="px-4 sm:px-5 py-2.5 bg-slate-800/90 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* 1. Live Header Font & Size Controls */}
              <div className="h-8 flex items-center gap-1 px-2 bg-slate-900/90 rounded-xl text-xs border border-slate-700">
                <Type className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span className="text-[11px] text-slate-300 font-semibold">سربرگ:</span>
                <select
                  value={headerFont}
                  onChange={(e) => {
                    const nextFont = e.target.value;
                    setHeaderFont(nextFont);
                    onUpdateSettings?.({ headerFont: nextFont });
                  }}
                  className="h-6 text-[11px] bg-slate-800 text-white border border-slate-600 rounded px-1 font-bold cursor-pointer"
                >
                  {(settings.customFonts || []).map((f) => (
                    <option key={f.id} value={f.family}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <select
                  value={headerFontSize}
                  onChange={(e) => {
                    const nextSize = Number(e.target.value);
                    setHeaderFontSize(nextSize);
                    onUpdateSettings?.({ headerFontSize: nextSize });
                  }}
                  title="سایز عنوان سربرگ"
                  className="h-6 text-[11px] bg-slate-800 text-white border border-slate-600 rounded px-1 font-mono font-bold cursor-pointer"
                >
                  <option value={15}>۱۵</option>
                  <option value={16}>۱۶</option>
                  <option value={18}>۱۸</option>
                  <option value={20}>۲۰</option>
                  <option value={22}>۲۲</option>
                </select>
              </div>

              {/* 2. Live Report Title (Heading) Font & Size Controls */}
              <div className="h-8 flex items-center gap-1 px-2 bg-slate-900/90 rounded-xl text-xs border border-slate-700">
                <Type className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-[11px] text-slate-300 font-semibold">فونت تیتر گزارش:</span>
                <select
                  value={headingFont}
                  onChange={(e) => {
                    const nextFont = e.target.value;
                    setHeadingFont(nextFont);
                    onUpdateSettings?.({ headingFont: nextFont });
                  }}
                  className="h-6 text-[11px] bg-slate-800 text-white border border-slate-600 rounded px-1 font-bold cursor-pointer"
                >
                  {(settings.customFonts || []).map((f) => (
                    <option key={f.id} value={f.family}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <select
                  value={headingFontSize}
                  onChange={(e) => {
                    const nextSize = Number(e.target.value);
                    setHeadingFontSize(nextSize);
                    onUpdateSettings?.({ headingFontSize: `${nextSize}px` });
                  }}
                  title="سایز تیتر گزارش"
                  className="h-6 text-[11px] bg-slate-800 text-white border border-slate-600 rounded px-1 font-mono font-bold cursor-pointer"
                >
                  <option value={14}>۱۴</option>
                  <option value={15}>۱۵</option>
                  <option value={16}>۱۶</option>
                  <option value={18}>۱۸</option>
                  <option value={20}>۲۰</option>
                  <option value={22}>۲۲</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setIsQrInspectOpen(true)}
                className="h-8 flex items-center gap-1.5 text-xs font-semibold px-2.5 bg-slate-900/90 hover:bg-slate-700 text-teal-300 rounded-xl border border-slate-700 transition-colors cursor-pointer"
                title="مشاهده محتوای بارکد QR و تغییر حالت (لینک آنلاین / کارت متنی آفلاین)"
              >
                <QrCode className="w-3.5 h-3.5 text-teal-400" />
                <span>QR ({qrMode === 'url' ? 'لینک' : 'آفلاین'})</span>
              </button>

              {/* Pre-printed Hospital Letterhead Mode Toggle */}
              <div className="h-8 flex items-center gap-1.5 px-2.5 bg-slate-900/90 rounded-xl text-xs border border-slate-700">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={preprintedLetterheadMode}
                    onChange={(e) => setPreprintedLetterheadMode(e.target.checked)}
                    className="rounded text-teal-500"
                  />
                  <span className="text-[11px] font-bold text-amber-300">
                    کاغذ سربرگ آماده
                  </span>
                </label>
                {preprintedLetterheadMode && (
                  <div className="flex items-center gap-1 pr-1.5 border-r border-slate-700">
                    <input
                      type="number"
                      min={10}
                      max={95}
                      value={preprintedTopMarginMm}
                      onChange={(e) =>
                        setPreprintedTopMarginMm(
                          Math.min(95, Math.max(10, parseInt(e.target.value || '45', 10)))
                        )
                      }
                      className="w-11 h-6 text-[11px] font-mono text-center bg-slate-800 text-white border border-slate-600 rounded px-1"
                    />
                    <span className="text-[10px] text-slate-400">mm</span>
                  </div>
                )}
              </div>

              {/* Monochrome Laser Print Mode Toggle */}
              <label className="h-8 flex items-center gap-1.5 px-2.5 bg-slate-900/90 rounded-xl text-xs cursor-pointer select-none border border-slate-700">
                <input
                  type="checkbox"
                  checked={monochromePrintMode}
                  onChange={(e) => setMonochromePrintMode(e.target.checked)}
                  className="rounded text-teal-500"
                />
                <span className="text-[11px] font-semibold text-slate-200">
                  سیاه‌وسفید
                </span>
              </label>

              {/* Page break toggle for multi-study reports */}
              {studies.length > 1 && (
                <label className="h-8 flex items-center gap-1.5 px-2.5 bg-slate-900/90 rounded-xl text-xs cursor-pointer select-none border border-slate-700">
                  <input
                    type="checkbox"
                    checked={forcePageBreakPerStudy}
                    onChange={(e) => setForcePageBreakPerStudy(e.target.checked)}
                    className="rounded text-teal-500"
                  />
                  <span className="text-[11px] text-slate-300">هر بررسی در برگه مجزا</span>
                </label>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleCopyText}
                className="h-8 flex items-center gap-1 text-xs font-semibold px-2.5 bg-slate-900/90 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'کپی شد' : 'کپی متن'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportWord}
                className="h-8 flex items-center gap-1 text-xs font-bold px-2.5 bg-slate-900/90 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors shadow-xs cursor-pointer"
                title="دانلود فایل Word (.doc)"
              >
                <FileDown className="w-4 h-4 text-sky-400" />
                <span>Word</span>
              </button>

              {/* Multi-Page / Batch High-Res PNG Image Export */}
              <button
                type="button"
                disabled={isExportingImage || isExportingPdf}
                onClick={handleExportPngImage}
                className="h-8 flex items-center gap-1.5 text-xs font-bold px-3 bg-indigo-900/90 hover:bg-indigo-800 text-indigo-100 border border-indigo-700 rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                title={
                  isBatchMode
                    ? 'ساخت و دانلود همزمان فایل‌های PNG ۳۰۰ DPI برای همه گزارش‌های موجود در صف'
                    : 'خروجی تصویر باکیفیت و شارپ (PNG) از تمام برگه‌های A4 گزارش'
                }
              >
                {isExportingImage ? (
                  <Loader2 className="w-3.5 h-3.5 text-indigo-300 animate-spin" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-300" />
                )}
                <span>
                  {isExportingImage
                    ? batchProgress?.kind === 'png'
                      ? `ساخت PNG (${batchProgress.current}/${batchProgress.total})...`
                      : 'در حال ساخت PNG...'
                    : isBatchMode
                    ? `ذخیره همزمان ${totalBatchPages} PNG`
                    : paginationResult.totalPages > 1
                    ? `ذخیره PNG (${paginationResult.totalPages} برگه)`
                    : 'ذخیره PNG'}
                </span>
              </button>

              {/* Direct Multi-Page / Batch PDF Download */}
              <button
                type="button"
                disabled={isExportingPdf || isExportingImage}
                onClick={handleExportPdfFile}
                className="h-8 flex items-center gap-1.5 text-xs font-bold px-3 bg-rose-700 hover:bg-rose-600 text-white border border-rose-500 rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                title={
                  isBatchMode
                    ? 'ساخت و دانلود همزمان فایل‌های PDF مجزای A4 برای تک‌تک بیماران صف'
                    : 'دانلود مستقیم فایل PDF استاندارد A4 روی سیستم'
                }
              >
                {isExportingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 text-rose-200 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4 text-rose-200" />
                )}
                <span>
                  {isExportingPdf
                    ? batchProgress?.kind === 'pdf'
                      ? `ساخت PDF (${batchProgress.current}/${batchProgress.total})...`
                      : 'در حال ساخت PDF...'
                    : isBatchMode
                    ? `ذخیره همزمان ${renderedReports.length} PDF`
                    : paginationResult.totalPages > 1
                    ? `ذخیره مستقیم PDF (${paginationResult.totalPages} صفحه)`
                    : 'ذخیره مستقیم PDF'}
                </span>
              </button>

              {/* Quick Share */}
              {!isBatchMode && (
                <button
                  type="button"
                  disabled={isExportingImage || isExportingPdf}
                  onClick={handleQuickShareReport}
                  className="h-8 flex items-center gap-1.5 text-xs font-bold px-3 bg-emerald-900/90 hover:bg-emerald-800 text-emerald-100 border border-emerald-700 rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>اشتراک‌گذاری</span>
                </button>
              )}

              {/* Standalone Printable HTML */}
              <button
                type="button"
                onClick={handleDownloadPrintHtml}
                className="h-8 flex items-center gap-1.5 text-xs font-bold px-3 bg-teal-800 hover:bg-teal-700 text-teal-100 rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                <FileDown className="w-4 h-4 text-teal-300" />
                <span>فایل HTML</span>
              </button>

              {/* Standard / Batch Single-Job Print Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="group h-8 flex items-center gap-1.5 text-xs font-bold px-3.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl transition-all duration-200 active:scale-95 shadow-xs cursor-pointer"
              >
                <PaperFeedPrinterIcon activeFeed={printSuccessFeedback} className="w-4 h-4" />
                <span>
                  {printSuccessFeedback
                    ? 'در حال ارسال به چاپگر...'
                    : isBatchMode
                    ? `چاپ دسته‌ای همه (${renderedReports.length} گزارش • ${totalBatchPages} برگه)`
                    : 'چاپ مستقیم (Print)'}
                </span>
              </button>
            </div>
          </div>

          {/* Interactive Batch Print / PDF / PNG Queue Manager Panel */}
          {showQueuePanel && (
            <div className="px-4 sm:px-5 py-3 bg-slate-950/95 border-t border-slate-700 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs font-black text-amber-300">
                  <Layers className="w-4 h-4" />
                  <span>
                    مدیریت صف چاپ، PDF و PNG دسته‌ای ({batchQueue.length} گزارش در صف)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleAddCurrentEditorToQueue}
                    className="px-2.5 py-1 rounded-lg bg-teal-900/90 hover:bg-teal-800 text-teal-100 border border-teal-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>افزودن گزارش فعلی ویرایشگر</span>
                  </button>
                  {savedReports.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAddTodaysReportsToQueue}
                      className="px-2.5 py-1 rounded-lg bg-indigo-900/90 hover:bg-indigo-800 text-indigo-100 border border-indigo-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <CalendarCheck className="w-3.5 h-3.5" />
                      <span>افزودن همه گزارش‌های امروز</span>
                    </button>
                  )}
                  {batchQueue.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setBatchQueue([])}
                      className="px-2.5 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>خالی کردن صف (حالت تکی)</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Right Column: Queued Items List */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-1.5 max-h-44 overflow-y-auto">
                  <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between px-1 pb-1 border-b border-slate-800">
                    <span>لیست آماده چاپ و خروجی (به ترتیب):</span>
                    <span className="text-teal-400 font-mono">
                      {isBatchMode ? `${totalBatchPages} برگه A4` : 'حالت تکی'}
                    </span>
                  </div>
                  {batchQueue.length === 0 ? (
                    <div className="text-[11px] text-slate-400 py-4 text-center leading-relaxed">
                      صف دسته‌ای خالی است (در حال پیش‌نمایش گزارش تکی فعلی). از کادر کناری گزارش‌های آرشیو را اضافه کنید تا همگی در یک نوبت چاپ یا به چند PDF/PNG تبدیل شوند.
                    </div>
                  ) : (
                    batchQueue.map((rep, idx) => {
                      const entryMatch = renderedReports.find((e) => e.key === rep.id);
                      const pagesCount = entryMatch?.pagination.totalPages || 1;
                      return (
                        <div
                          key={rep.id}
                          className="flex items-center justify-between gap-2 bg-slate-800/90 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-[11px]"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              reportBlockRefs.current[rep.id]?.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start',
                              });
                            }}
                            className="flex items-center gap-2 min-w-0 text-right flex-1 cursor-pointer"
                            title="پرش به پیش‌نمایش این بیمار"
                          >
                            <span className="w-5 h-5 rounded-md bg-teal-500/20 text-teal-300 font-mono font-black flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-white truncate">
                                {rep.patientInfo?.fullName || 'بیمار بدون نام'}
                                {rep.id === '__current_editor__' && (
                                  <span className="mr-1.5 text-[10px] text-amber-300">(ویرایشگر فعلی)</span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono truncate">
                                پذیرش: {rep.patientInfo?.admissionNumber || '---'} • {pagesCount} برگه
                              </div>
                            </div>
                          </button>

                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveQueueItem(idx, -1)}
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                              title="انتقال به بالا"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === batchQueue.length - 1}
                              onClick={() => handleMoveQueueItem(idx, 1)}
                              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                              title="انتقال به پایین"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveFromQueue(rep.id)}
                              className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                              title="حذف از صف"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Left Column: Quick Archive Picker */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-2 max-h-44 flex flex-col">
                  <div className="relative shrink-0">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={queueSearch}
                      onChange={(e) => setQueueSearch(e.target.value)}
                      placeholder="جستجو در آرشیو (نام بیمار، شماره پذیرش، تاریخ) جهت افزودن..."
                      className="w-full h-7 pr-8 pl-2.5 rounded-lg bg-slate-800 border border-slate-700 text-[11px] text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-1">
                    {filteredArchiveForPicker.length === 0 ? (
                      <div className="text-[11px] text-slate-500 text-center py-3">
                        گزارشی در آرشیو یافت نشد.
                      </div>
                    ) : (
                      filteredArchiveForPicker.map((rep) => {
                        const inQueue = batchQueue.some((q) => q.id === rep.id);
                        return (
                          <button
                            key={rep.id}
                            type="button"
                            onClick={() =>
                              inQueue ? handleRemoveFromQueue(rep.id) : handleAddReportToQueue(rep)
                            }
                            className={`w-full px-2.5 py-1.5 rounded-lg border text-right flex items-center justify-between gap-2 text-[11px] transition-colors cursor-pointer ${
                              inQueue
                                ? 'bg-teal-950/80 border-teal-600 text-teal-100'
                                : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/80 text-slate-200'
                            }`}
                          >
                            <div className="min-w-0">
                              <span className="font-bold truncate block">
                                {rep.patientInfo?.fullName || 'بیمار بدون نام'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {rep.patientInfo?.admissionNumber || '---'} • {rep.patientInfo?.reportDate || '---'}
                              </span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                inQueue
                                  ? 'bg-teal-500 text-slate-950'
                                  : 'bg-slate-700 text-slate-200'
                              }`}
                            >
                              {inQueue ? '✓ در صف' : '+ افزودن'}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live Batch PDF / PNG Export Progress Strip */}
          {batchProgress && (
            <div className="px-5 py-2 bg-indigo-950/95 border-t border-indigo-700 text-indigo-100 text-xs font-bold flex items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2 min-w-0">
                <Loader2 className="w-4 h-4 text-indigo-300 animate-spin shrink-0" />
                <span className="truncate">
                  {batchProgress.kind === 'pdf'
                    ? `در حال ساخت فایل PDF شماره ${batchProgress.current} از ${batchProgress.total}: ${batchProgress.label}`
                    : `در حال ساخت تصویر ۳۰۰ DPI PNG شماره ${batchProgress.current} از ${batchProgress.total}: ${batchProgress.label}`}
                </span>
              </div>
              <div className="w-32 sm:w-44 h-2 bg-indigo-900 rounded-full overflow-hidden shrink-0">
                <div
                  className="h-full bg-teal-400 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.round((batchProgress.current / batchProgress.total) * 100))}%`,
                  }}
                />
              </div>
            </div>
          )}

          {shareFeedback && (
            <div className="px-5 py-1.5 bg-emerald-950/90 border-t border-emerald-800 text-emerald-200 text-xs font-bold flex items-center justify-between animate-fadeIn">
              <span>{shareFeedback}</span>
              <button
                type="button"
                onClick={() => setShareFeedback('')}
                className="text-emerald-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Printable Multi-Page A4 Sheets Viewport (Supports Single & Multi-Report Batch Print Queue) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 md:p-8 flex flex-col items-center bg-slate-300/85 min-h-0">
          <div ref={printAreaRef} className="w-full flex flex-col items-center gap-8">
            {renderedReports.map((entry, reportIdx) => {
              const entryQrDataUrl = qrMap[entry.key] || '';
              return (
                <div
                  key={entry.key}
                  ref={(el) => {
                    reportBlockRefs.current[entry.key] = el;
                  }}
                  className="w-full flex flex-col items-center gap-6"
                >
                  {/* Batch Patient Divider Banner (Preview Only - Hidden on Print) */}
                  {isBatchMode && (
                    <div className="no-print w-full max-w-[210mm] px-4 py-2 rounded-2xl bg-slate-900 text-white shadow-md border border-slate-700 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-2 py-0.5 rounded-lg bg-teal-500 text-slate-950 font-black shrink-0">
                          گزارش {reportIdx + 1} از {renderedReports.length}
                        </span>
                        <span className="font-bold truncate">
                          {entry.patientInfo.fullName || 'بیمار بدون نام'}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px] shrink-0">
                          (پذیرش: {entry.patientInfo.admissionNumber || '---'} • {entry.pagination.totalPages} برگه)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromQueue(entry.key)}
                        className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white text-[11px] font-bold transition-colors cursor-pointer shrink-0"
                      >
                        حذف از صف
                      </button>
                    </div>
                  )}

                  {entry.pagination.pages.map((sheet, pageIdx) => (
                    <div
                      key={`${entry.key}-p${sheet.pageNumber}`}
                      className="w-full max-w-[210mm] flex flex-col items-center"
                    >
                      {/* Page Indicator Pill above each sheet in Preview (Hidden in Print) */}
                      {entry.pagination.totalPages > 1 && (
                        <div className="no-print mb-2 px-3.5 py-1 rounded-full bg-slate-900/90 text-white text-xs font-bold shadow-md flex items-center gap-2">
                          <span>
                            📄 برگه {sheet.pageNumber} از {entry.pagination.totalPages} (کاغذ استاندارد A4)
                          </span>
                          <span className="text-teal-300 font-mono text-[11px]">
                            • {sheet.fillPercent}% ظرفیت این برگه
                          </span>
                        </div>
                      )}

                      {/* Discrete A4 Paper Sheet (210mm x 297mm) with Footer Pinned to Bottom (mt-auto) */}
                      <div
                        ref={(el) => {
                          if (reportIdx === 0) pageRefs.current[pageIdx] = el;
                        }}
                        className={`printable-report a4-sheet-page bg-white text-slate-950 w-full max-w-[210mm] min-h-[297mm] p-6 sm:p-10 md:p-11 shadow-2xl rounded-2xl relative overflow-hidden box-border break-words [word-break:break-word] shrink-0 flex flex-col justify-between ${
                          monochromePrintMode ? 'grayscale contrast-125' : ''
                        }`}
                        style={
                          {
                            '--heading-font-family': resolvedHeadingFontCss,
                            '--heading-font-size': `${headingFontSize}px`,
                            fontFamily: resolvedBodyFontCss,
                            fontSize: `${bodyFontSize || 14}px`,
                            lineHeight: unifiedLineHeight,
                            direction: 'rtl',
                            color: '#050811',
                            WebkitFontSmoothing: 'antialiased',
                            textRendering: 'geometricPrecision',
                            paddingTop: preprintedLetterheadMode ? `${preprintedTopMarginMm}mm` : undefined,
                          } as React.CSSProperties
                        }
                      >
                        {/* Ultra-Faint Centered Clinic Logo Watermark in the Background of the Printed Report */}
                        {!preprintedLetterheadMode && entry.effectiveLogoUrl && (
                          <div
                            aria-hidden="true"
                            className="a4-watermark-logo pointer-events-none select-none absolute inset-0 flex items-center justify-center z-0 overflow-hidden"
                            style={{
                              position: 'absolute',
                              inset: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              pointerEvents: 'none',
                              zIndex: 0,
                              overflow: 'hidden',
                            }}
                          >
                            <img
                              src={entry.effectiveLogoUrl}
                              alt=""
                              className="w-[92mm] h-[92mm] object-contain"
                              style={{
                                width: '92mm',
                                height: '92mm',
                                objectFit: 'contain',
                                opacity: 0.065,
                              }}
                            />
                          </div>
                        )}

                        {/* TOP SECTION: Official Clinic Letterhead + Patient Demographics Box */}
                        <header
                          className="printable-header-section relative z-10 shrink-0"
                          style={
                            {
                              '--header-font-family': resolvedHeaderFontCss,
                              fontFamily: resolvedHeaderFontCss,
                            } as React.CSSProperties
                          }
                        >
                          {!preprintedLetterheadMode ? (
                            <div
                              className="pb-3 border-b-2 flex items-center justify-between gap-4"
                              style={{
                                borderColor: monochromePrintMode ? '#000000' : entry.activeModalityColor,
                              }}
                            >
                              <div className="flex items-center gap-3.5">
                                <img
                                  src={entry.effectiveLogoUrl}
                                  alt="لوگوی مرکز"
                                  className="w-14 h-14 sm:w-16 sm:h-16 object-contain shrink-0 rounded-lg"
                                />
                                <div className="space-y-1">
                                  <h1
                                    className="font-black text-slate-950 leading-snug"
                                    style={{
                                      fontFamily: resolvedHeaderFontCss,
                                      fontSize: `${headerFontSize}px`,
                                    }}
                                  >
                                    {clinicNameDisplay}
                                  </h1>
                                  <p
                                    className="font-extrabold"
                                    style={{
                                      fontFamily: resolvedHeaderFontCss,
                                      fontSize: `${Math.max(11, Math.round(headerFontSize * 0.67))}px`,
                                      color: monochromePrintMode ? '#000000' : entry.activeModalityColor,
                                    }}
                                  >
                                    {clinicSubtitleDisplay}
                                  </p>
                                  <p
                                    className="text-slate-800 font-semibold"
                                    style={{
                                      fontFamily: resolvedHeaderFontCss,
                                      fontSize: `${Math.max(10, Math.round(headerFontSize * 0.58))}px`,
                                    }}
                                  >
                                    {clinicAddressDisplay} • تلفن: {clinicPhoneDisplay}
                                  </p>
                                </div>
                              </div>

                              {/* Header Left Demographic Summary */}
                              <div
                                dir="rtl"
                                className="text-left space-y-0.5 shrink-0"
                                style={{ fontFamily: resolvedHeaderFontCss }}
                              >
                                <div dir="rtl" className="text-[11px] font-extrabold text-slate-950">
                                  <span>شماره پذیرش: </span>
                                  <span dir="ltr" className="inline-block">
                                    {entry.patientInfo.admissionNumber || 'ADM-001'}
                                  </span>
                                </div>
                                <div dir="rtl" className="text-[10.5px] font-bold text-slate-800">
                                  <span>تاریخ: </span>
                                  <span dir="ltr" className="inline-block">
                                    {entry.patientInfo.reportDate || '۱۴۰۴/۰۸/۲۱'}
                                  </span>
                                </div>
                                {entry.pagination.totalPages > 1 && (
                                  <div
                                    dir="rtl"
                                    className="text-[10px] font-extrabold pt-0.5"
                                    style={{
                                      color: monochromePrintMode ? '#000000' : entry.activeModalityColor,
                                    }}
                                  >
                                    برگه {sheet.pageNumber} از {entry.pagination.totalPages}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="no-print mb-2 px-3 py-1.5 rounded-lg border border-dashed border-amber-400 bg-amber-50 text-amber-900 text-[11px] font-bold flex items-center justify-between">
                              <span>
                                📄 فضای خالی سربرگ فیزیکی بیمارستان ({preprintedTopMarginMm} میلی‌متر از بالا)
                              </span>
                              <span>
                                پذیرش: {entry.patientInfo.admissionNumber} | تاریخ: {entry.patientInfo.reportDate}
                              </span>
                            </div>
                          )}

                          {/* Patient Demographics Box */}
                          <div
                            className={`my-3 p-3 rounded-xl border ${
                              monochromePrintMode
                                ? 'bg-white border-black text-black'
                                : 'bg-slate-50/90 border-slate-400'
                            }`}
                            style={{
                              fontFamily: resolvedHeaderFontCss,
                              fontSize: `${Math.max(11, Math.round(headerFontSize * 0.67))}px`,
                            }}
                          >
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-1.5 gap-x-4">
                              <div>
                                <span className="text-slate-800 font-bold">نام بیمار: </span>
                                <strong className="text-slate-950 font-black">
                                  {entry.patientInfo.fullName || '---'}
                                </strong>
                              </div>
                              <div>
                                <span className="text-slate-800 font-bold">کد ملی / شناسه: </span>
                                <strong className="text-slate-950 font-black" dir="ltr">
                                  {entry.patientInfo.nationalId || '---'}
                                </strong>
                              </div>
                              <div>
                                <span className="text-slate-800 font-bold">سن و جنس: </span>
                                <strong className="text-slate-950 font-black">
                                  {entry.patientInfo.age ? `${entry.patientInfo.age} سال` : '---'} /{' '}
                                  {entry.patientInfo.gender === 'female'
                                    ? 'زن'
                                    : entry.patientInfo.gender === 'male'
                                    ? 'مرد'
                                    : 'نامشخص'}
                                </strong>
                              </div>
                              <div>
                                <span className="text-slate-800 font-bold">پزشک معالج: </span>
                                <strong className="text-slate-950 font-black">
                                  {entry.patientInfo.referringPhysician || 'همکار گرامی'}
                                </strong>
                              </div>
                            </div>
                          </div>
                        </header>

                  {/* MIDDLE SECTION (flex-1): Studies & Findings for this A4 Sheet */}
                  <div className="relative z-10 flex-1 py-2 space-y-5">
                    {sheet.slices.map((slice, sIdx) => {
                      const { study } = slice;
                      const studyModColor = getModalityColorHex(study.modality);
                      const studyDir: 'rtl' | 'ltr' =
                        study.direction || (study.modality === 'sonography' ? 'rtl' : 'ltr');
                      const isLtr = studyDir === 'ltr';

                      return (
                        <div
                          key={slice.sliceKey}
                          dir={studyDir}
                          style={{
                            direction: studyDir,
                            textAlign: isLtr ? 'left' : 'right',
                          }}
                          className={`study-box w-full break-words [word-break:break-word] ${
                            sIdx > 0 ? 'pt-4 border-t-2 border-dashed border-slate-400' : ''
                          }`}
                        >
                          {/* Study Title & Technique Header (Respects LTR/RTL direction of the study) */}
                          <div
                            className="mb-2"
                            dir={studyDir}
                            style={{
                              direction: studyDir,
                              textAlign: isLtr ? 'left' : 'right',
                            }}
                          >
                            <h2
                              dir={studyDir}
                              className={`study-heading font-black ${
                                isLtr ? 'text-left' : 'text-right'
                              }`}
                              style={{
                                fontFamily: resolvedHeadingFontCss,
                                fontSize: `${headingFontSize}px`,
                                color: monochromePrintMode ? '#000000' : studyModColor,
                                fontWeight: settings.headingBold ? 900 : 800,
                                direction: studyDir,
                                textAlign: isLtr ? 'left' : 'right',
                              }}
                            >
                              {study.titleAndTechnique ||
                                (isLtr
                                  ? `${study.modality.toUpperCase()} Study Report`
                                  : `گزارش ${modalityNames[study.modality]}`)}
                              {slice.isContinuation && (
                                <span
                                  className={`text-xs font-bold ${isLtr ? 'ml-2' : 'mr-2'}`}
                                  style={{ color: studyModColor }}
                                >
                                  {isLtr
                                    ? `(Continued on page ${sheet.pageNumber})`
                                    : `(ادامه در برگه ${sheet.pageNumber})`}
                                </span>
                              )}
                            </h2>
                          </div>

                          {/* Comparison */}
                          {slice.showComparisonSlice && study.comparison && (
                            <div
                              dir={studyDir}
                              className="mb-2.5 text-xs"
                              style={{
                                fontFamily: resolvedBodyFontCss,
                                lineHeight: unifiedLineHeight,
                                direction: studyDir,
                                textAlign: isLtr ? 'left' : 'right',
                              }}
                            >
                              <span className="font-extrabold text-slate-950">
                                {isLtr
                                  ? 'Comparison: '
                                  : 'مقایسه با تصاویر پیشین (Comparison): '}
                              </span>
                              <span className="text-slate-900 font-semibold">{study.comparison}</span>
                            </div>
                          )}

                          {/* Findings HTML Slice */}
                          {slice.findingsHtmlSlice && (
                            <div className="mb-3" dir={studyDir}>
                              <div
                                dir={studyDir}
                                className={`printable-findings-content prose max-w-none text-slate-950 font-medium ${
                                  isLtr ? 'text-left' : 'text-right'
                                }`}
                                style={{
                                  fontFamily: resolvedBodyFontCss,
                                  fontSize: `${bodyFontSize || 14}px`,
                                  lineHeight: unifiedLineHeight,
                                  color: '#050811',
                                  direction: studyDir,
                                  textAlign: isLtr ? 'left' : 'right',
                                }}
                                dangerouslySetInnerHTML={{
                                  __html: stripSpellHighlights(slice.findingsHtmlSlice, true),
                                }}
                              />
                            </div>
                          )}

                          {/* Impression */}
                          {slice.showImpressionSlice && study.impressionHtml && (
                            <div
                              dir={studyDir}
                              className="impression-box mb-3 p-3 rounded-xl border-2 bg-slate-50/85 text-xs"
                              style={{
                                borderColor: monochromePrintMode ? '#000000' : studyModColor,
                                lineHeight: unifiedLineHeight,
                                direction: studyDir,
                                textAlign: isLtr ? 'left' : 'right',
                              }}
                            >
                              <div
                                dir={studyDir}
                                className="study-heading font-black text-sm mb-1 flex items-center gap-1.5"
                                style={{
                                  fontFamily: resolvedHeadingFontCss,
                                  fontSize: `${Math.max(13, headingFontSize - 1)}px`,
                                  color: monochromePrintMode ? '#000000' : studyModColor,
                                  direction: studyDir,
                                }}
                              >
                                <ShieldCheck className="w-4 h-4 shrink-0" />
                                <span>
                                  {isLtr
                                    ? 'IMPRESSION:'
                                    : 'نتیجه‌گیری نهایی (Impression):'}
                                </span>
                              </div>
                              <div
                                dir={studyDir}
                                className={`printable-findings-content prose max-w-none text-slate-950 font-semibold ${
                                  isLtr ? 'text-left' : 'text-right'
                                }`}
                                style={{
                                  fontFamily: resolvedBodyFontCss,
                                  fontSize: `${bodyFontSize || 14}px`,
                                  lineHeight: unifiedLineHeight,
                                  color: '#050811',
                                  direction: studyDir,
                                  textAlign: isLtr ? 'left' : 'right',
                                }}
                                dangerouslySetInnerHTML={{
                                  __html: stripSpellHighlights(study.impressionHtml, true),
                                }}
                              />
                            </div>
                          )}

                          {/* Recommendations */}
                          {slice.showRecommendationsSlice && study.recommendationsHtml && (
                            <div
                              dir={studyDir}
                              className="mb-2 text-xs p-2.5 bg-slate-50 rounded-xl border border-slate-300"
                              style={{
                                fontFamily: resolvedBodyFontCss,
                                lineHeight: unifiedLineHeight,
                                direction: studyDir,
                                textAlign: isLtr ? 'left' : 'right',
                              }}
                            >
                              <span className="font-extrabold text-slate-950">
                                {isLtr
                                  ? 'Recommendations: '
                                  : 'توصیه‌ها (Recommendations): '}
                              </span>
                              <div
                                dir={studyDir}
                                className="printable-findings-content inline prose text-slate-950 font-medium"
                                dangerouslySetInnerHTML={{
                                  __html: stripSpellHighlights(study.recommendationsHtml, true),
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* BOTTOM SECTION (mt-auto): Pinned Footer at the Very Bottom of the A4 Paper (Uses <div> instead of <footer> so browser/PDF print rules never hide it) */}
                  {!preprintedLetterheadMode && (
                    <div
                      className="a4-pinned-footer relative z-10 mt-auto pt-3.5 border-t-2 shrink-0 flex items-end justify-between break-inside-avoid w-full"
                      style={{
                        borderColor: monochromePrintMode ? '#000000' : `${entry.activeModalityColor}77`,
                      }}
                    >
                      {/* Verification QR Code */}
                      <div className="flex items-center gap-3">
                        {entryQrDataUrl ? (
                          <button
                            type="button"
                            onClick={() => setIsQrInspectOpen(true)}
                            title="کلیک جهت مشاهده گواهی دیجیتال و تست اسکن QR"
                            className="group relative rounded-lg border-2 border-slate-900 p-1 bg-white shadow-xs shrink-0 cursor-pointer focus:outline-none"
                          >
                            <img
                              src={entryQrDataUrl}
                              alt="QR اصالت‌سنجی"
                              className="w-16 h-16 sm:w-20 sm:h-20 block"
                              style={{ imageRendering: 'pixelated' }}
                            />
                            <span className="no-print absolute -top-2 -right-2 bg-teal-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xs">
                              تست اسکن
                            </span>
                          </button>
                        ) : (
                          <div className="w-16 h-16 bg-slate-100 border border-slate-300 rounded flex items-center justify-center shrink-0">
                            <QrCode className="w-8 h-8 text-slate-400" />
                          </div>
                        )}
                        <div className="text-[10px] text-slate-800 space-y-0.5">
                          <div className="flex items-center gap-1 font-mono font-extrabold text-slate-950">
                            <span>
                              کد اصالت‌سنجی: {entry.patientInfo.nationalId || entry.patientInfo.admissionNumber || '88412'}-PAC
                            </span>
                          </div>
                          <p className="text-[9.5px] font-semibold text-slate-800">
                            {qrMode === 'url'
                              ? 'اسکن بارکد با دوربین موبایل جهت باز شدن گواهی رسمی اصالت گزارش'
                              : 'اسکن بارکد با دوربین موبایل جهت مشاهده کارت مشخصات تاییدشده گزارش'}
                          </p>
                          <p
                            className="text-[9.5px] font-extrabold"
                            style={{ color: monochromePrintMode ? '#000000' : entry.activeModalityColor }}
                          >
                            {clinicNameDisplay}
                          </p>
                        </div>
                      </div>

                      {/* Radiologist Stamp & Independent Signature per Doctor */}
                      <div
                        className="doctor-stamp-box text-center px-4 py-2.5 rounded-xl border-2 border-dashed min-w-[195px] max-w-[235px] w-fit bg-slate-50/60"
                        style={
                          {
                            borderColor: monochromePrintMode ? '#000000' : entry.activeModalityColor,
                            '--stamp-font-family': entry.resolvedDoctorStampFontCss,
                            fontFamily: entry.resolvedDoctorStampFontCss,
                          } as React.CSSProperties
                        }
                      >
                        <div
                          className="font-bold leading-snug break-words"
                          style={{
                            color: monochromePrintMode ? '#000000' : entry.activeModalityColor,
                            fontFamily: entry.resolvedDoctorStampFontCss,
                            fontSize: `${entry.resolvedDoctorStampFontSize}px`,
                          }}
                        >
                          {entry.doctor.name}
                        </div>
                        <div
                          className="font-semibold text-slate-900 mt-0.5 whitespace-pre-line leading-snug break-words"
                          style={{
                            fontFamily: entry.resolvedDoctorStampFontCss,
                            fontSize: `${Math.max(10, entry.resolvedDoctorStampFontSize - 2)}px`,
                          }}
                        >
                          {entry.doctor.specialty}
                        </div>
                        <div className="text-[10px] font-mono font-bold text-slate-800 mt-0.5">
                          شماره نظام پزشکی: {entry.doctor.medicalCouncilId}
                        </div>
                        {entry.effectiveSignatureUrl && (
                          <div className="mt-1.5 flex items-center justify-center">
                            <img
                              src={entry.effectiveSignatureUrl}
                              alt={`امضای دیجیتال ${entry.doctor.name}`}
                              className="h-11 max-w-[170px] object-contain mx-auto"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive QR Verification Certificate & Scanner Test Modal */}
        {isQrInspectOpen && (
          <div className="no-print fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-scaleIn">
              <div className="bg-teal-900 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-300" />
                  <span className="font-bold text-sm">تست اسکن بارکد QR و گواهی اصالت گزارش</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQrInspectOpen(false)}
                  className="text-teal-200 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setQrMode('url')}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                      qrMode === 'url' ? 'bg-teal-700 text-white shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    حالت ۱: لینک گواهی رسمی
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrMode('text')}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                      qrMode === 'text' ? 'bg-teal-700 text-white shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    حالت ۲: کارت متنی آفلاین
                  </button>
                </div>

                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  {qrDataUrl && (
                    <img
                      src={qrDataUrl}
                      alt="QR Code Large"
                      className="w-44 h-44 border-2 border-slate-900 rounded-xl p-2 bg-white shadow-sm"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  )}
                  <p className="text-[11px] text-slate-600 mt-2.5 text-center leading-relaxed">
                    می‌توانید همین الان دوربین گوشی موبایل خود را مقابل این بارکد بگیرید تا عملکرد واقعی آن را تست کنید.
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsQrInspectOpen(false)}
                    className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl cursor-pointer"
                  >
                    بستن
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
