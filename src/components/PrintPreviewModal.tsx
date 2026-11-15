import React, { useRef, useState, useEffect, useMemo } from 'react';
import { PatientInfo, Doctor, AppSettings, ReportStudy, Modality } from '../types';
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
} from 'lucide-react';
import QRCode from 'qrcode';
import { toPng } from 'html-to-image';
import {
  stripSpellHighlights,
  paginateStudiesIntoA4Pages,
  DEFAULT_CLINIC_LOGO_DATA_URI,
  getOfficialClinicLogoDataUri,
  isOfficialClinicLogoUri,
} from '../services/typistUtils';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientInfo: PatientInfo;
  studies: ReportStudy[];
  doctor: Doctor;
  settings: AppSettings;
  onRecordPrintedReport?: () => void;
  onUpdateSettings?: (updates: Partial<AppSettings>) => void;
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
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isQrInspectOpen, setIsQrInspectOpen] = useState(false);
  const [printSuccessFeedback, setPrintSuccessFeedback] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string>('');
  const printAreaRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);

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
    }
  }, [isOpen, settings]);

  const modalityNames: Record<Modality, string> = {
    mri: 'ام‌آر‌آی (MRI)',
    ct: 'سی‌تی‌اسکن (CT Scan)',
    sonography: 'سونوگرافی (Ultrasound)',
  };

  const primaryModality: Modality = studies[0]?.modality || 'sonography';
  const getModalityColorHex = (mod: Modality): string => {
    if (monochromePrintMode) return '#000000';
    return (
      settings.modalityColors?.[mod] ||
      (mod === 'mri' ? '#4f46e5' : mod === 'ct' ? '#059669' : '#0284c7')
    );
  };
  const activeModalityColor = getModalityColorHex(primaryModality);

  // Format font-family safely without overriding custom font stacks
  const formatCssFontStack = (fontVal: string) => {
    const trimmed = (fontVal || "'Vazirmatn', sans-serif").trim();
    if (trimmed === 'Vazirmatn') {
      return "'Vazirmatn', sans-serif";
    }
    if (trimmed.includes(',') || trimmed.includes("'") || trimmed.includes('"')) {
      return trimmed;
    }
    return `'${trimmed}', sans-serif`;
  };

  const resolvedHeaderFontCss = formatCssFontStack(headerFont);
  const resolvedHeadingFontCss = formatCssFontStack(headingFont);
  const resolvedBodyFontCss = formatCssFontStack(bodyFont);

  // Shared deterministic A4 pagination engine (100% synced with RichMedicalEditor A4 meter)
  const paginationResult = useMemo(() => {
    return paginateStudiesIntoA4Pages(studies, {
      defaultFontSize: bodyFontSize || 14,
      printLineHeight: unifiedLineHeight,
      forcePageBreakPerStudy,
      preprintedLetterheadMode,
      preprintedTopMarginMm,
    });
  }, [
    studies,
    bodyFontSize,
    unifiedLineHeight,
    forcePageBreakPerStudy,
    preprintedLetterheadMode,
    preprintedTopMarginMm,
  ]);

  // Generate high-contrast, low-density QR code that smartphone cameras scan instantaneously
  useEffect(() => {
    if (!isOpen) return;
    const adm = patientInfo.admissionNumber || 'ADM-001';
    const date = patientInfo.reportDate || '1404/08/21';
    const modCode = studies
      .map((s) => (s.modality === 'mri' ? 'MRI' : s.modality === 'ct' ? 'CT' : 'US'))
      .join('+');

    let payload = '';
    if (qrMode === 'url') {
      const origin =
        typeof window !== 'undefined' && window.location.origin
          ? window.location.origin
          : 'https://shafa-imaging.ir';
      const params = new URLSearchParams({
        v: '1',
        a: adm,
        d: date,
        m: modCode,
        mc: doctor.medicalCouncilId || '45892',
      });
      if (patientInfo.fullName && patientInfo.fullName.length <= 28) {
        params.set('p', patientInfo.fullName);
      }
      payload = `${origin}/?${params.toString()}`;
    } else {
      payload = [
        'بیمارستان شفا ساری',
        `بیمار: ${patientInfo.fullName || '---'}`,
        `پذیرش: ${adm}`,
        `تاریخ: ${date}`,
        `بررسی: ${modCode}`,
        `پزشک: ${doctor.name} (ن.پ: ${doctor.medicalCouncilId})`,
        'وضعیت: تایید اصالت نهایی',
      ].join('\n');
    }

    QRCode.toDataURL(payload, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'L',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR code generation error', err));
  }, [isOpen, patientInfo, studies, doctor, qrMode]);

  if (!isOpen) return null;

  const rawLogoUrl = settings.clinicLogoUrl || DEFAULT_CLINIC_LOGO_DATA_URI;
  const effectiveLogoUrl = isOfficialClinicLogoUri(rawLogoUrl)
    ? getOfficialClinicLogoDataUri(activeModalityColor)
    : rawLogoUrl;
  const effectiveSignatureUrl = doctor.signatureUrl || '';

  // Standalone full-fidelity HTML generator matching multi-page A4 preview 100% (works 100% offline!)
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

    return `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="utf-8">
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
      height: 297mm;
      margin: 0 auto 24px auto;
      background: #ffffff;
      padding: ${preprintedLetterheadMode ? `${preprintedTopMarginMm}mm 15mm 14mm 15mm` : '12mm 15mm 12mm 15mm'};
      box-shadow: 0 8px 30px rgba(0,0,0,0.15);
      border-radius: 12px;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
    }
    .a4-sheet-page:last-of-type {
      page-break-after: auto;
      break-after: auto;
    }
    .a4-pinned-footer {
      margin-top: auto !important;
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
        height: 297mm !important;
        border-radius: 0 !important;
        ${monochromePrintMode ? 'filter: grayscale(100%) contrast(120%) !important; color: #000000 !important;' : ''}
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
    <span class="font-bold">📄 گزارش رسمی سربرگ‌دار (${paginationResult.totalPages} برگه A4)</span>
    <span class="text-xs text-teal-300">💡 در پنجره پرینت، تیک Headers and Footers را بردارید</span>
    <button class="btn-trigger-print" onclick="window.print()">🖨️ چاپ سربرگ / ذخیره PDF (Ctrl+P)</button>
  </div>
  <div>
    ${rawContent}
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        try { window.print(); } catch(e) {}
      }, 450);
    };
  </script>
</body>
</html>`;
  };

  const handlePrint = () => {
    if (onRecordPrintedReport) {
      onRecordPrintedReport();
    }
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

  // Multi-Page High-Resolution A4 PNG Image Export (exports each A4 sheet as its own PNG image)
  const handleExportPngImage = async () => {
    if (isExportingImage) return;
    setIsExportingImage(true);
    try {
      if (onRecordPrintedReport) {
        onRecordPrintedReport();
      }
      const total = paginationResult.totalPages;
      const baseName = `Report_Image_${patientInfo.nationalId || patientInfo.admissionNumber || 'Radiology'}_${
        patientInfo.fullName || 'Patient'
      }`;

      for (let i = 0; i < total; i++) {
        const sheetEl = pageRefs.current[i];
        if (!sheetEl) continue;
        const dataUrl = await toPng(sheetEl, {
          pixelRatio: 2.5,
          backgroundColor: '#ffffff',
          cacheBust: true,
          skipFonts: true,
          fontEmbedCSS: '',
        });
        const link = document.createElement('a');
        link.download = total > 1 ? `${baseName}_Page${i + 1}.png` : `${baseName}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setShareFeedback(
        total > 1
          ? `✓ ${total} برگه تصویر باکیفیت PNG (برگه ۱ تا ${total}) به صورت جداگانه دانلود شد.`
          : '✓ تصویر باکیفیت PNG برگه گزارش دانلود شد.'
      );
      setTimeout(() => setShareFeedback(''), 4000);
    } catch (err) {
      console.warn('PNG export warning:', err);
    } finally {
      setIsExportingImage(false);
    }
  };

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

      const firstSheet = pageRefs.current[0] || printAreaRef.current;
      if (typeof navigator !== 'undefined' && navigator.share && firstSheet) {
        try {
          const dataUrl = await toPng(firstSheet, {
            pixelRatio: 2,
            backgroundColor: '#ffffff',
            skipFonts: true,
            fontEmbedCSS: '',
          });
          const res = await fetch(dataUrl);
          const blob = await res.blob();
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
                    پیش‌نمایش چاپ سربرگ رسمی و صدور گزارش (A4)
                  </h3>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                      paginationResult.totalPages > 1
                        ? 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                        : 'bg-teal-500/20 text-teal-200 border-teal-400/40'
                    }`}
                  >
                    {paginationResult.totalPages === 1
                      ? `۱ برگه A4 (${paginationResult.fillPercent}% پر شده • ${paginationResult.remainingLinesPage1} خط مانده)`
                      : `${paginationResult.totalPages} برگه مجزای A4 (${paginationResult.fillPercent}%)`}
                  </span>
                </div>
                <p className="text-[11px] text-teal-300 flex items-center gap-1 mt-0.5">
                  <Info className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span className="truncate">
                    فوتر و مهر پزشک در پایین هر برگه A4 قفل شده است • در پنجره پرینت تیک Headers and footers را بردارید.
                  </span>
                </p>
              </div>
            </div>

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

              {/* Multi-Page High-Res PNG Image Export */}
              <button
                type="button"
                disabled={isExportingImage}
                onClick={handleExportPngImage}
                className="h-8 flex items-center gap-1.5 text-xs font-bold px-3 bg-indigo-900/90 hover:bg-indigo-800 text-indigo-100 border border-indigo-700 rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                title="خروجی تصویر باکیفیت (PNG) از تمام برگه‌های A4 گزارش"
              >
                <ImageIcon className="w-3.5 h-3.5 text-indigo-300" />
                <span>
                  {isExportingImage
                    ? 'در حال ساخت تصویر...'
                    : paginationResult.totalPages > 1
                    ? `خروجی تصویر (${paginationResult.totalPages} برگه PNG)`
                    : 'خروجی تصویر (PNG)'}
                </span>
              </button>

              {/* Quick Share */}
              <button
                type="button"
                disabled={isExportingImage}
                onClick={handleQuickShareReport}
                className="h-8 flex items-center gap-1.5 text-xs font-bold px-3 bg-emerald-900/90 hover:bg-emerald-800 text-emerald-100 border border-emerald-700 rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>اشتراک‌گذاری</span>
              </button>

              {/* Standalone Printable HTML */}
              <button
                type="button"
                onClick={handleDownloadPrintHtml}
                className="h-8 flex items-center gap-1.5 text-xs font-bold px-3 bg-teal-800 hover:bg-teal-700 text-teal-100 rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                <FileDown className="w-4 h-4 text-teal-300" />
                <span>دانلود فایل چاپ (HTML/PDF)</span>
              </button>

              {/* Standard Print Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="group h-8 flex items-center gap-1.5 text-xs font-bold px-4 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl transition-all duration-200 active:scale-95 shadow-xs cursor-pointer"
              >
                <PaperFeedPrinterIcon activeFeed={printSuccessFeedback} className="w-4 h-4" />
                <span>{printSuccessFeedback ? 'در حال چاپ سربرگ...' : 'چاپ سربرگ (Print / PDF)'}</span>
              </button>
            </div>
          </div>
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

        {/* Printable Multi-Page A4 Sheets Viewport */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 md:p-8 flex flex-col items-center bg-slate-300/85 min-h-0">
          <div ref={printAreaRef} className="w-full flex flex-col items-center gap-8">
            {paginationResult.pages.map((sheet, pageIdx) => (
              <div key={sheet.pageNumber} className="w-full max-w-[210mm] flex flex-col items-center">
                {/* Page Indicator Pill above each sheet in Preview (Hidden in Print) */}
                {paginationResult.totalPages > 1 && (
                  <div className="no-print mb-2 px-3.5 py-1 rounded-full bg-slate-900/90 text-white text-xs font-bold shadow-md flex items-center gap-2">
                    <span>
                      📄 برگه {sheet.pageNumber} از {paginationResult.totalPages} (کاغذ استاندارد A4)
                    </span>
                    <span className="text-teal-300 font-mono text-[11px]">
                      • {sheet.fillPercent}% ظرفیت این برگه
                    </span>
                  </div>
                )}

                {/* Discrete A4 Paper Sheet (210mm x 297mm) with Footer Pinned to Bottom (mt-auto) */}
                <div
                  ref={(el) => {
                    pageRefs.current[pageIdx] = el;
                  }}
                  className={`printable-report a4-sheet-page bg-white text-slate-900 w-full max-w-[210mm] min-h-[297mm] p-6 sm:p-10 md:p-11 shadow-2xl rounded-2xl relative box-border break-words [word-break:break-word] shrink-0 flex flex-col justify-between animate-fadeSlideUp ${
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
                      paddingTop: preprintedLetterheadMode ? `${preprintedTopMarginMm}mm` : undefined,
                    } as React.CSSProperties
                  }
                >
                  {/* TOP SECTION: Official Clinic Letterhead + Patient Demographics Box */}
                  <header
                    className="printable-header-section shrink-0"
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
                          borderColor: monochromePrintMode ? '#000000' : activeModalityColor,
                        }}
                      >
                        <div className="flex items-center gap-3.5">
                          <img
                            src={effectiveLogoUrl}
                            alt="لوگوی مرکز"
                            className="w-14 h-14 sm:w-16 sm:h-16 object-contain shrink-0 rounded-lg"
                          />
                          <div className="space-y-1">
                            <h1
                              className="font-bold text-slate-900 tracking-tight leading-snug"
                              style={{
                                fontFamily: resolvedHeaderFontCss,
                                fontSize: `${headerFontSize}px`,
                              }}
                            >
                              {clinicNameDisplay}
                            </h1>
                            <p
                              className="font-bold"
                              style={{
                                fontFamily: resolvedHeaderFontCss,
                                fontSize: `${Math.max(11, Math.round(headerFontSize * 0.67))}px`,
                                color: monochromePrintMode ? '#000000' : activeModalityColor,
                              }}
                            >
                              {clinicSubtitleDisplay}
                            </p>
                            <p
                              className="text-slate-600"
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
                          className="text-left space-y-0.5 shrink-0"
                          style={{ fontFamily: resolvedHeaderFontCss }}
                        >
                          <div className="text-[11px] font-bold text-slate-800">
                            شماره پذیرش: {patientInfo.admissionNumber || 'ADM-001'}
                          </div>
                          <div className="text-[10px] text-slate-600">
                            تاریخ: {patientInfo.reportDate || '۱۴۰۴/۰۸/۲۱'}
                          </div>
                          {patientInfo.nationalId && (
                            <div className="text-[10px] text-slate-500">
                              کد ملی: {patientInfo.nationalId}
                            </div>
                          )}
                          {paginationResult.totalPages > 1 && (
                            <div
                              className="text-[10px] font-bold pt-0.5"
                              style={{ color: monochromePrintMode ? '#000000' : activeModalityColor }}
                            >
                              برگه {sheet.pageNumber} از {paginationResult.totalPages}
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
                          پذیرش: {patientInfo.admissionNumber} | تاریخ: {patientInfo.reportDate}
                        </span>
                      </div>
                    )}

                    {/* Patient Demographics Box */}
                    <div
                      className={`my-3 p-3 rounded-xl border ${
                        monochromePrintMode
                          ? 'bg-white border-black text-black'
                          : 'bg-slate-50 border-slate-300'
                      }`}
                      style={{
                        fontFamily: resolvedHeaderFontCss,
                        fontSize: `${Math.max(11, Math.round(headerFontSize * 0.67))}px`,
                      }}
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-1.5 gap-x-4">
                        <div>
                          <span className="text-slate-500 font-medium">نام بیمار: </span>
                          <strong className="text-slate-900">{patientInfo.fullName || '---'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">کد ملی / شناسه: </span>
                          <strong className="text-slate-900" dir="ltr">
                            {patientInfo.nationalId || '---'}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">سن و جنس: </span>
                          <strong className="text-slate-900">
                            {patientInfo.age ? `${patientInfo.age} سال` : '---'} /{' '}
                            {patientInfo.gender === 'female'
                              ? 'زن'
                              : patientInfo.gender === 'male'
                              ? 'مرد'
                              : 'نامشخص'}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">پزشک معالج: </span>
                          <strong className="text-slate-900">
                            {patientInfo.referringPhysician || 'همکار گرامی'}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </header>

                  {/* MIDDLE SECTION (flex-1): Studies & Findings for this A4 Sheet */}
                  <div className="flex-1 py-2 space-y-5">
                    {sheet.slices.map((slice, sIdx) => {
                      const { study } = slice;
                      const studyModColor = getModalityColorHex(study.modality);
                      return (
                        <div
                          key={slice.sliceKey}
                          className={`study-box w-full break-words [word-break:break-word] ${
                            sIdx > 0 ? 'pt-4 border-t-2 border-dashed border-slate-300' : ''
                          }`}
                        >
                          {/* Study Title & Technique Header */}
                          <div className="mb-2">
                            <h2
                              className="study-heading font-black"
                              style={{
                                fontFamily: resolvedHeadingFontCss,
                                fontSize: `${headingFontSize}px`,
                                color: monochromePrintMode ? '#000000' : studyModColor,
                                fontWeight: settings.headingBold ? 900 : 700,
                              }}
                            >
                              {study.titleAndTechnique || `گزارش ${modalityNames[study.modality]}`}
                              {slice.isContinuation && (
                                <span
                                  className="text-xs font-bold mr-2"
                                  style={{ color: studyModColor }}
                                >
                                  (ادامه در برگه {sheet.pageNumber})
                                </span>
                              )}
                            </h2>
                          </div>

                          {/* Comparison */}
                          {slice.showComparisonSlice && study.comparison && (
                            <div
                              className="mb-2.5 text-xs"
                              style={{
                                fontFamily: resolvedBodyFontCss,
                                lineHeight: unifiedLineHeight,
                              }}
                            >
                              <span className="font-bold text-slate-800">
                                مقایسه با تصاویر پیشین (Comparison):{' '}
                              </span>
                              <span className="text-slate-700">{study.comparison}</span>
                            </div>
                          )}

                          {/* Findings HTML Slice */}
                          {slice.findingsHtmlSlice && (
                            <div className="mb-3">
                              <div
                                className="printable-findings-content prose prose-slate max-w-none text-justify text-slate-800"
                                style={{
                                  fontFamily: resolvedBodyFontCss,
                                  fontSize: `${bodyFontSize || 14}px`,
                                  lineHeight: unifiedLineHeight,
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
                              className="impression-box mb-3 p-3 rounded-xl border-2 bg-slate-50/70 text-xs"
                              style={{
                                borderColor: monochromePrintMode ? '#000000' : studyModColor,
                                lineHeight: unifiedLineHeight,
                              }}
                            >
                              <div
                                className="study-heading font-black text-sm mb-1 flex items-center gap-1.5"
                                style={{
                                  fontFamily: resolvedHeadingFontCss,
                                  fontSize: `${Math.max(13, headingFontSize - 1)}px`,
                                  color: monochromePrintMode ? '#000000' : studyModColor,
                                }}
                              >
                                <ShieldCheck className="w-4 h-4 shrink-0" />
                                <span>نتیجه‌گیری نهایی (Impression):</span>
                              </div>
                              <div
                                className="printable-findings-content prose prose-slate max-w-none text-slate-900 font-medium"
                                style={{
                                  fontFamily: resolvedBodyFontCss,
                                  fontSize: `${bodyFontSize || 14}px`,
                                  lineHeight: unifiedLineHeight,
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
                              className="mb-2 text-xs p-2.5 bg-slate-50 rounded-xl border border-slate-200"
                              style={{
                                fontFamily: resolvedBodyFontCss,
                                lineHeight: unifiedLineHeight,
                              }}
                            >
                              <span className="font-bold text-slate-800">
                                توصیه‌ها (Recommendations):{' '}
                              </span>
                              <div
                                className="printable-findings-content inline prose prose-slate"
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

                  {/* BOTTOM SECTION (mt-auto): Pinned Footer at the Very Bottom of the A4 Paper */}
                  {!preprintedLetterheadMode && (
                    <footer
                      className="a4-pinned-footer mt-auto pt-3.5 border-t-2 shrink-0 flex items-end justify-between break-inside-avoid w-full"
                      style={{
                        borderColor: monochromePrintMode ? '#000000' : `${activeModalityColor}55`,
                      }}
                    >
                      {/* Verification QR Code */}
                      <div className="flex items-center gap-3">
                        {qrDataUrl ? (
                          <button
                            type="button"
                            onClick={() => setIsQrInspectOpen(true)}
                            title="کلیک جهت مشاهده گواهی دیجیتال و تست اسکن QR"
                            className="group relative rounded-lg border-2 border-slate-900 p-1 bg-white shadow-xs shrink-0 cursor-pointer focus:outline-none"
                          >
                            <img
                              src={qrDataUrl}
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
                        <div className="text-[10px] text-slate-600 space-y-0.5">
                          <div className="flex items-center gap-1 font-mono font-bold text-slate-900">
                            <span>
                              کد اصالت‌سنجی: {patientInfo.nationalId || patientInfo.admissionNumber || '88412'}-PAC
                            </span>
                          </div>
                          <p className="text-[9.5px] text-slate-600">
                            {qrMode === 'url'
                              ? 'اسکن بارکد با دوربین موبایل جهت باز شدن گواهی رسمی اصالت گزارش'
                              : 'اسکن بارکد با دوربین موبایل جهت مشاهده کارت مشخصات تاییدشده گزارش'}
                          </p>
                          <p
                            className="text-[9px] font-bold"
                            style={{ color: monochromePrintMode ? '#000000' : activeModalityColor }}
                          >
                            {clinicNameDisplay}
                          </p>
                        </div>
                      </div>

                      {/* Radiologist Stamp & Independent Signature per Doctor */}
                      <div
                        className="text-center px-4 py-2.5 rounded-xl border-2 border-dashed min-w-[215px] bg-slate-50/40"
                        style={{
                          borderColor: monochromePrintMode ? '#000000' : activeModalityColor,
                        }}
                      >
                        <div
                          className="text-xs font-black"
                          style={{ color: monochromePrintMode ? '#000000' : activeModalityColor }}
                        >
                          {doctor.name}
                        </div>
                        <div className="text-[11px] font-medium text-slate-700 mt-0.5">
                          {doctor.specialty}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                          شماره نظام پزشکی: {doctor.medicalCouncilId}
                        </div>
                        {effectiveSignatureUrl && (
                          <div className="mt-1.5 flex items-center justify-center">
                            <img
                              src={effectiveSignatureUrl}
                              alt={`امضای دیجیتال ${doctor.name}`}
                              className="h-11 max-w-[170px] object-contain mx-auto"
                            />
                          </div>
                        )}
                      </div>
                    </footer>
                  )}
                </div>
              </div>
            ))}
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
