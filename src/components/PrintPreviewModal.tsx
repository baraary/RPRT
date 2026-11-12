import React, { useRef, useState, useEffect } from 'react';
import { PatientInfo, Doctor, AppSettings, ReportStudy, Modality } from '../types';
import { Printer, Copy, X, Check, FileDown, ShieldCheck, QrCode, Info } from 'lucide-react';
import QRCode from 'qrcode';
import { stripSpellHighlights } from '../services/typistUtils';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientInfo: PatientInfo;
  studies: ReportStudy[];
  doctor: Doctor;
  settings: AppSettings;
  onRecordPrintedReport?: () => void;
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
}) => {
  const [copied, setCopied] = useState(false);
  const [forcePageBreakPerStudy, setForcePageBreakPerStudy] = useState(settings.pageBreakPerStudy || false);
  const [qrMode, setQrMode] = useState<'url' | 'text'>('url');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isQrInspectOpen, setIsQrInspectOpen] = useState(false);
  const [printSuccessFeedback, setPrintSuccessFeedback] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const modalityNames: Record<Modality, string> = {
    mri: 'ام‌آر‌آی (MRI)',
    ct: 'سی‌تی‌اسکن (CT Scan)',
    sonography: 'سونوگرافی (Ultrasound)',
  };

  // Generate high-contrast, low-density QR code that smartphone cameras scan instantaneously
  useEffect(() => {
    if (!isOpen) return;
    const adm = patientInfo.admissionNumber || 'ADM-001';
    const date = patientInfo.reportDate || '1404/08/21';
    const modCode = studies.map((s) => (s.modality === 'mri' ? 'MRI' : s.modality === 'ct' ? 'CT' : 'US')).join('+');

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

  // Standalone full-fidelity HTML generator matching preview 100% (works 100% offline!)
  const getFullPrintableDocumentHtml = () => {
    const rawContent = stripSpellHighlights(printAreaRef.current?.innerHTML || '', true);

    // Extract compiled local CSS from document.styleSheets so standalone print works 100% offline
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
      margin: 0 !important; /* Eliminates browser-generated URL, Title, Date, and Page Count */
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: '${settings.defaultFont || 'Vazirmatn'}', 'Vazirmatn', -apple-system, BlinkMacSystemFont, Tahoma, Arial, sans-serif;
      direction: rtl;
      text-align: right;
      margin: 0;
      padding: 24px;
      color: #0f172a;
      background: #f1f5f9;
      font-size: 13px;
      line-height: 1.8;
    }
    .paper-sheet {
      max-width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #ffffff;
      padding: 32px 40px;
      box-shadow: 0 4px 25px rgba(0,0,0,0.1);
      border-radius: 8px;
    }
    .printable-table {
      width: 100%;
      border-collapse: collapse;
    }
    thead {
      display: table-header-group;
    }
    tfoot {
      display: table-footer-group;
    }
    tbody {
      display: table-row-group;
    }
    tr {
      page-break-inside: auto;
    }
    .study-box {
      page-break-inside: avoid;
      break-inside: avoid;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #cbd5e1;
      overflow-wrap: break-word;
      word-break: break-word;
    }
    .study-break-before {
      page-break-before: always;
      break-before: page;
    }
    .impression-box {
      background-color: #f0fdfa !important;
      border: 2px solid #0f766e !important;
      border-radius: 12px;
      padding: 14px;
      margin-top: 14px;
    }
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .paper-sheet {
        box-shadow: none !important;
        padding: 12mm 16mm 14mm 16mm !important;
        margin: 0 auto !important;
        max-width: 100% !important;
        border-radius: 0 !important;
      }
      .no-print {
        display: none !important;
      }
      thead {
        display: table-header-group !important;
      }
      tfoot {
        display: table-footer-group !important;
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
      box-shadow: 0 2px 8px rgba(13,148,136,0.4);
      transition: all 0.2s;
    }
    .btn-trigger-print:hover {
      background: #0f766e;
    }
  </style>
</head>
<body>
  <div class="floating-action-bar no-print">
    <span class="font-bold">📄 گزارش رسمی سربرگ‌دار تصویربرداری</span>
    <span class="text-xs text-teal-300">💡 نکته: در پنجره پرینت، تیک Headers and Footers را بردارید تا تاریخ و آدرس حذف شود</span>
    <button class="btn-trigger-print" onclick="window.print()">🖨️ چاپ سربرگ / ذخیره PDF (Ctrl+P)</button>
  </div>
  <div class="paper-sheet">
    ${rawContent}
  </div>
  <script>
    window.onload = function() {
      // Auto open print dialog when ready
      setTimeout(function() {
        try { window.print(); } catch(e) {}
      }, 500);
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
      // Set blank title during print so browser doesn't inject it at top
      document.title = '';

      // Try dedicated hidden iframe print
      const iframe = document.createElement('iframe');
      iframe.setAttribute('style', 'position:fixed;right:-2000px;bottom:-2000px;width:10px;height:10px;border:0;opacity:0;');
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
              try { document.body.removeChild(iframe); } catch {}
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
      } catch (err2) {
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

  const clinicNameDisplay = settings.clinicName || 'مرکز جامع تصویربرداری بیمارستان شفا';
  const clinicSubtitleDisplay =
    settings.clinicSubtitle || 'رادیولوژی، سونوگرافی، ام‌آر‌آی، ام‌آر‌آی قلب، سی‌تی‌اسکن';
  const clinicAddressDisplay =
    settings.clinicAddress || 'مازندران، ساری، کمربندی غربی، بلوار ولیعصر';
  const clinicPhoneDisplay = settings.clinicPhone || '۰۱۱-۳۳۲۰۵۰۰۶-۹';

  return (
    <div className="print-modal-backdrop fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="print-modal-container bg-slate-100 rounded-3xl shadow-2xl border border-slate-300 max-w-4xl w-full max-h-[96vh] flex flex-col overflow-hidden animate-fadeSlideUp">
        {/* Top Control Bar (Non-printed): Split into Title Row (with fixed Top-Left Close Button) + Action Toolbar Row */}
        <div className="bg-slate-900 text-white no-print shrink-0">
          {/* Row 1: Modal Title & Always-Top-Left Close Button */}
          <div className="px-4 sm:px-5 py-3.5 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 transition-colors ${
                  printSuccessFeedback
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                    : 'bg-teal-500/15 border-teal-400/30 text-teal-400'
                }`}
                title="آماده تغذیه کاغذ و چاپ سربرگ"
              >
                <PaperFeedPrinterIcon activeFeed={true} className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm sm:text-base">
                    پیش‌نمایش چاپ سربرگ رسمی و صدور گزارش (A4)
                  </h3>
                  {printSuccessFeedback && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 animate-fadeIn">
                      در حال تغذیه کاغذ و ارسال به چاپگر...
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-teal-300 flex items-center gap-1 mt-0.5">
                  <Info className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span className="truncate">
                    نکته حذف آدرس و تاریخ مرورگر: در پنجره پرینت (More settings)، تیک Headers and footers را بردارید.
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

          {/* Row 2: Dedicated Action Toolbar (Print, PDF/HTML, Word, Copy, QR) */}
          <div className="px-4 sm:px-5 py-2.5 bg-slate-800/90 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsQrInspectOpen(true)}
                className="h-8 flex items-center gap-1.5 text-xs font-semibold px-3 bg-slate-900/90 hover:bg-slate-700 text-teal-300 rounded-xl border border-slate-700 transition-colors cursor-pointer"
                title="مشاهده محتوای بارکد QR و تغییر حالت (لینک آنلاین / کارت متنی آفلاین)"
              >
                <QrCode className="w-3.5 h-3.5 text-teal-400" />
                <span>تنظیم و تست QR ({qrMode === 'url' ? 'لینک گواهی' : 'متن آفلاین'})</span>
              </button>

              {/* Page break toggle for multi-study reports */}
              {studies.length > 1 && (
                <label className="h-8 flex items-center gap-1.5 px-2.5 bg-slate-900/90 rounded-xl text-xs cursor-pointer select-none border border-slate-700">
                  <input
                    type="checkbox"
                    checked={forcePageBreakPerStudy}
                    onChange={(e) => setForcePageBreakPerStudy(e.target.checked)}
                    className="rounded text-teal-500"
                  />
                  <span className="text-[11px] text-slate-300">شکستن صفحه برای هر بررسی</span>
                </label>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleCopyText}
                className="h-8 flex items-center gap-1 text-xs font-semibold px-3 bg-slate-900/90 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'کپی شد' : 'کپی متن'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportWord}
                className="h-8 flex items-center gap-1 text-xs font-bold px-3 bg-slate-900/90 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors shadow-xs cursor-pointer"
                title="دانلود فایل Word (.doc)"
              >
                <FileDown className="w-4 h-4 text-sky-400" />
                <span>خروجی Word</span>
              </button>

              {/* Standalone Printable HTML / Direct PDF Ready File */}
              <button
                type="button"
                onClick={handleDownloadPrintHtml}
                className="h-8 flex items-center gap-1.5 text-xs font-bold px-3.5 bg-teal-800 hover:bg-teal-700 text-teal-100 rounded-xl transition-colors shadow-xs cursor-pointer"
                title="دانلود فایل اختصاصی با فرمت چاپ خودکار و استایل ۱۰۰٪ هماهنگ با پیش‌نمایش"
              >
                <FileDown className="w-4 h-4 text-teal-300" />
                <span>دانلود فایل آماده چاپ (HTML/PDF)</span>
              </button>

              {/* Standard Print Button with Paper-Feed Animation */}
              <button
                type="button"
                onClick={handlePrint}
                className="group h-8 flex items-center gap-1.5 text-xs font-bold px-4 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl transition-all duration-200 active:scale-95 shadow-xs cursor-pointer"
                title="ارسال مستقیم به پرینتر یا ذخیره به صورت PDF"
              >
                <PaperFeedPrinterIcon activeFeed={printSuccessFeedback} className="w-4 h-4" />
                <span>{printSuccessFeedback ? 'در حال چاپ سربرگ...' : 'چاپ سربرگ (Print / PDF)'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Printable Sheet Viewport */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 md:p-8 flex flex-col items-center bg-slate-300/80 min-h-0">
          {/* A4 Paper Canvas with Smooth Slide-Up Entrance */}
          <div
            ref={printAreaRef}
            className="printable-report bg-white text-slate-900 w-full max-w-[210mm] min-h-[297mm] h-auto p-6 sm:p-10 md:p-12 shadow-2xl rounded-2xl relative my-2 box-border break-words [word-break:break-word] shrink-0 animate-fadeSlideUp"
            style={{
              fontFamily: `'${settings.defaultFont || 'Vazirmatn'}', 'Vazirmatn', Arial, sans-serif`,
              direction: 'rtl',
            }}
          >
            {/* 
              TABLE WITH THEAD AND TFOOT:
              In CSS Paged Media / Browser Printing, `thead` and `tfoot` automatically repeat
              on every single printed page!
            */}
            <table className="printable-table w-full border-collapse">
              {/* REPEATED HEADER ON ALL PAGES: Clinic Letterhead + Patient Demographics */}
              <thead>
                <tr>
                  <th className="p-0 border-none font-normal text-right">
                    {/* Official Letterhead - Shafa Hospital (Clean, with optional Clinic Logo) */}
                    <div className="pb-3 border-b-2 border-teal-800 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        {settings.clinicLogoUrl && (
                          <img
                            src={settings.clinicLogoUrl}
                            alt="لوگوی مرکز"
                            className="w-16 h-16 object-contain shrink-0 rounded-lg"
                          />
                        )}
                        <div className="space-y-1">
                          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                            {clinicNameDisplay}
                          </h1>
                          <p className="text-xs font-bold text-teal-800">
                            {clinicSubtitleDisplay}
                          </p>
                          <p className="text-[10.5px] text-slate-600 font-mono">
                            {clinicAddressDisplay} • تلفن: {clinicPhoneDisplay}
                          </p>
                        </div>
                      </div>

                      {/* Header Left Demographic Summary (No English text, clean no-box) */}
                      <div className="text-left font-mono space-y-0.5">
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
                      </div>
                    </div>

                    {/* Patient Demographics Box */}
                    <div className="my-3.5 p-3.5 bg-slate-50 rounded-xl border border-slate-300 text-xs">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-4">
                        <div>
                          <span className="text-slate-500 font-medium">نام بیمار: </span>
                          <strong className="text-slate-900">{patientInfo.fullName || '---'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">کد ملی / شناسه: </span>
                          <strong className="text-slate-900 font-mono" dir="ltr">
                            {patientInfo.nationalId || '---'}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">سن و جنس: </span>
                          <strong className="text-slate-900">
                            {patientInfo.age ? `${patientInfo.age} سال` : '---'} /{' '}
                            {patientInfo.gender === 'female' ? 'زن' : patientInfo.gender === 'male' ? 'مرد' : 'نامشخص'}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">پزشک معالج: </span>
                          <strong className="text-slate-900">{patientInfo.referringPhysician || 'همکار گرامی'}</strong>
                        </div>
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>

              {/* REPORT BODY CONTENT: Studies, Findings, Impression, Recommendations */}
              <tbody>
                <tr>
                  <td className="p-0 border-none align-top pt-2 pb-6">
                    <div className="space-y-7">
                      {studies.map((study, idx) => (
                        <div
                          key={study.id}
                          className={`study-box w-full break-words [word-break:break-word] ${
                            idx > 0
                              ? forcePageBreakPerStudy
                                ? 'study-break-before pt-6'
                                : 'pt-6 border-t-2 border-dashed border-slate-300'
                              : ''
                          }`}
                        >
                          {/* Study Title & Technique Header (Clean without dividing line) */}
                          <div className="mb-2.5">
                            <h2
                              className="font-black"
                              style={{
                                fontFamily: settings.headingFont || 'Vazirmatn',
                                fontSize: settings.headingFontSize || '16px',
                                color: settings.headingColor || '#0f172a',
                                fontWeight: settings.headingBold ? 900 : 700,
                              }}
                            >
                              {study.titleAndTechnique || `گزارش ${modalityNames[study.modality]}`}
                            </h2>
                          </div>

                          {/* Comparison (if enabled) */}
                          {study.showComparison && study.comparison && (
                            <div className="mb-3 text-xs leading-relaxed">
                              <span className="font-bold text-slate-800">مقایسه با تصاویر پیشین (Comparison): </span>
                              <span className="text-slate-700">{study.comparison}</span>
                            </div>
                          )}

                          {/* Findings */}
                          <div className="mb-5 text-sm leading-loose">
                            <div
                              className="prose prose-slate max-w-none text-justify text-slate-800 text-[13px] leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: stripSpellHighlights(study.findingsHtml, true) }}
                            />
                          </div>

                          {/* Impression (if enabled) */}
                          {study.showImpression && study.impressionHtml && (
                            <div className="impression-box mb-4 p-3.5 rounded-xl border-2 border-teal-800 bg-teal-50/40 text-xs leading-relaxed">
                              <div className="font-black text-teal-950 text-sm mb-1.5 flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-teal-700" />
                                <span>نتیجه‌گیری نهایی (Impression):</span>
                              </div>
                              <div
                                className="prose prose-slate max-w-none text-slate-900 text-[13px] leading-normal font-medium"
                                dangerouslySetInnerHTML={{ __html: stripSpellHighlights(study.impressionHtml, true) }}
                              />
                            </div>
                          )}

                          {/* Recommendations (if enabled) */}
                          {study.showRecommendations && study.recommendationsHtml && (
                            <div className="mb-4 text-xs leading-relaxed p-3 bg-slate-50 rounded-xl border border-slate-200">
                              <span className="font-bold text-slate-800">توصیه‌ها (Recommendations): </span>
                              <div
                                className="inline prose prose-slate"
                                dangerouslySetInnerHTML={{ __html: stripSpellHighlights(study.recommendationsHtml, true) }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              </tbody>

              {/* REPEATED FOOTER ON ALL PAGES: Official Stamp & Signature & Verification */}
              <tfoot>
                <tr>
                  <td className="p-0 border-none pt-4 pb-2">
                    <div className="pt-4 border-t-2 border-slate-300 flex items-end justify-between break-inside-avoid w-full">
                      {/* Real Dynamic Verification QR Code (High-res 80x80px for instant phone camera scanning) */}
                      <div className="flex items-center gap-3.5">
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
                              className="w-20 h-20 block"
                              style={{ imageRendering: 'pixelated' }}
                            />
                            <span className="no-print absolute -top-2 -right-2 bg-teal-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xs">
                              تست اسکن
                            </span>
                          </button>
                        ) : (
                          <div className="w-20 h-20 bg-slate-100 border border-slate-300 rounded flex items-center justify-center shrink-0">
                            <QrCode className="w-9 h-9 text-slate-400" />
                          </div>
                        )}
                        <div className="text-[10px] text-slate-600 space-y-0.5">
                          <div className="flex items-center gap-1 font-mono font-bold text-slate-900">
                            <span>کد اصالت‌سنجی: {patientInfo.nationalId || patientInfo.admissionNumber || '88412'}-PAC</span>
                          </div>
                          <p className="text-[9.5px] text-slate-600">
                            {qrMode === 'url'
                              ? 'اسکن بارکد با دوربین موبایل جهت باز شدن گواهی رسمی اصالت گزارش'
                              : 'اسکن بارکد با دوربین موبایل جهت مشاهده کارت مشخصات تاییدشده گزارش'}
                          </p>
                          <p className="text-[9px] text-teal-800 font-bold">
                            {settings.clinicName || 'مرکز جامع تصویربرداری بیمارستان شفا'}
                          </p>
                        </div>
                      </div>

                      {/* Radiologist Stamp & Signature */}
                      <div className="text-center p-3 rounded-xl border-2 border-dashed border-teal-700/60 bg-teal-50/20 min-w-[220px]">
                        <div className="text-xs font-black text-teal-900">{doctor.name}</div>
                        <div className="text-[11px] font-medium text-slate-700 mt-0.5">{doctor.specialty}</div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                          شماره نظام پزشکی: {doctor.medicalCouncilId}
                        </div>
                        {settings.doctorSignatureUrl && (
                          <div className="my-1.5 flex items-center justify-center">
                            <img
                              src={settings.doctorSignatureUrl}
                              alt="امضای دیجیتال پزشک"
                              className="h-12 max-w-[175px] object-contain mx-auto"
                            />
                          </div>
                        )}
                        <div className="mt-1.5 text-[10px] font-semibold text-teal-700 border-t border-teal-200 pt-1">
                          [مهر و امضای دیجیتال تایید شد]
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Interactive QR Verification Certificate & Scanner Test Modal */}
        {isQrInspectOpen && (
          <div className="no-print fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-scaleIn">
              <div className="bg-teal-900 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-300" />
                  <div>
                    <h4 className="font-bold text-sm">گواهی اصالت‌سنجی دیجیتال بارکد (QR)</h4>
                    <p className="text-[11px] text-teal-200">مرکز جامع تصویربرداری بیمارستان شفا ساری</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsQrInspectOpen(false)}
                  className="text-teal-200 hover:text-white p-1 rounded-lg hover:bg-teal-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Mode Selector */}
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setQrMode('url')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      qrMode === 'url'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ۱. لینک گواهی آنلاین (پیشنهادی)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrMode('text')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      qrMode === 'text'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ۲. کارت متنی آفلاین
                  </button>
                </div>

                {/* Large Scannable QR Preview */}
                <div className="flex flex-col items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  {qrDataUrl && (
                    <img
                      src={qrDataUrl}
                      alt="Large Scannable QR"
                      className="w-44 h-44 rounded-xl border-2 border-slate-900 p-2 bg-white shadow-sm"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  )}
                  <p className="text-[11px] text-slate-600 mt-2.5 text-center leading-relaxed">
                    {qrMode === 'url'
                      ? 'هم‌اکنون دوربین موبایل خود را مقابل این بارکد بگیرید؛ لینک گواهی رسمی اصالت‌سنجی بیمارستان شفا روی گوشی باز می‌شود.'
                      : 'در حالت متنی آفلاین، با اسکن بارکد، مشخصات تاییدشده گزارش بدون نیاز به اینترنت مستقیماً روی صفحه موبایل نمایش داده می‌شود.'}
                  </p>
                </div>

                {/* Simulated Certificate Preview */}
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900 border-b border-emerald-200/80 pb-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>پیش‌نمایش خروجی پس از اسکن با موبایل:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-y-1.5 text-[11px] text-slate-700">
                    <div>
                      <span className="text-slate-500">مرکز: </span>
                      <strong className="text-slate-900">بیمارستان شفا ساری</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">شماره پذیرش: </span>
                      <strong className="font-mono text-slate-900">{patientInfo.admissionNumber || 'ADM-001'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">نام بیمار: </span>
                      <strong className="text-slate-900">{patientInfo.fullName || 'ثبت‌شده در پرونده'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">تاریخ گزارش: </span>
                      <strong className="text-slate-900">{patientInfo.reportDate}</strong>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500">پزشک تاییدکننده: </span>
                      <strong className="text-teal-900">
                        {doctor.name} (نظام پزشکی: {doctor.medicalCouncilId})
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsQrInspectOpen(false)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
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
