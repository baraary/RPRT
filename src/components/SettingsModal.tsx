import React, { useState } from 'react';
import { AppSettings, Doctor, Modality, ModalityColors, CustomDictionaryTerm } from '../types';
import {
  Settings as SettingsIcon,
  X,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  Building2,
  SlidersHorizontal,
  Moon,
  Image as ImageIcon,
  PenTool,
  Trash2,
  HardDrive,
  Network,
  FolderSync,
  Type,
  Palette,
  BookOpen,
  Plus,
  Github,
  RefreshCw,
  CloudUpload,
  CloudDownload,
  LogOut,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { IndexedDbService } from '../services/indexedDbStorage';
import { GitHubSyncService, GitHubSyncStatus } from '../services/githubSync';
import { PWAInstallButton } from './PWAInstallButton';
import {
  DEFAULT_CLINIC_LOGO_DATA_URI,
  getOfficialClinicLogoDataUri,
  isOfficialClinicLogoUri,
} from '../services/typistUtils';

// Built-in vector sample Clinic Logos (100% offline SVG Data URIs)
const SAMPLE_CLINIC_LOGOS: { id: string; label: string; url: string }[] = [
  {
    id: 'logo-official-default',
    label: 'لوگوی رسمی مرکز (نشان اصلی)',
    url: DEFAULT_CLINIC_LOGO_DATA_URI,
  },
  {
    id: 'logo-shafa-teal',
    label: 'نشان پرتوپزشکی شفا (سبز آبی)',
    url: `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
        <rect x="6" y="6" width="108" height="108" rx="26" fill="#f0fdfa" stroke="#0f766e" stroke-width="5"/>
        <circle cx="60" cy="60" r="36" fill="none" stroke="#14b8a6" stroke-width="3" stroke-dasharray="8 4"/>
        <path d="M60 28 V92 M28 60 H92" stroke="#0f766e" stroke-width="8" stroke-linecap="round"/>
        <circle cx="60" cy="60" r="14" fill="#0f766e"/>
        <path d="M40 60 L54 60 L58 49 L63 71 L67 60 L80 60" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
    )}`,
  },
  {
    id: 'logo-mri-navy',
    label: 'نشان تخصصی ام‌آر‌آی و سی‌تی (سرمه‌ای)',
    url: `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
        <circle cx="60" cy="60" r="54" fill="#eef2ff" stroke="#1e3a8a" stroke-width="5"/>
        <circle cx="60" cy="60" r="40" fill="none" stroke="#3b82f6" stroke-width="4"/>
        <circle cx="60" cy="60" r="26" fill="none" stroke="#1d4ed8" stroke-width="3" stroke-dasharray="10 5"/>
        <path d="M60 36 V84 M36 60 H84" stroke="#1e3a8a" stroke-width="7" stroke-linecap="round"/>
        <circle cx="60" cy="60" r="8" fill="#2563eb"/>
      </svg>`
    )}`,
  },
  {
    id: 'logo-hospital-crest',
    label: 'نشان رسمی بیمارستانی (کلاسیک)',
    url: `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
        <path d="M60 10 L104 28 V62 C104 88 84 104 60 112 C36 104 16 88 16 62 V28 Z" fill="#ecfdf5" stroke="#047857" stroke-width="5"/>
        <path d="M60 32 V86 M36 59 H84" stroke="#047857" stroke-width="9" stroke-linecap="round"/>
        <circle cx="60" cy="59" r="24" fill="none" stroke="#10b981" stroke-width="3"/>
      </svg>`
    )}`,
  },
];

// Pre-approved, highly readable medical UI fonts designed to reduce eye strain during long typing shifts
const PREAPPROVED_MEDICAL_UI_FONTS: Array<{
  id: string;
  name: string;
  family: string;
  badge: string;
  sample: string;
}> = [
  {
    id: 'ui-vazirmatn',
    name: 'وزیرمتن پزشکی (Vazirmatn)',
    family: "'Vazirmatn', sans-serif",
    badge: 'استاندارد طلایی • کمترین خستگی چشم',
    sample: 'گزارش سونوگرافی و ام‌آر‌آی با وضوح بالا',
  },
  {
    id: 'ui-noto-arabic',
    name: 'نوتو سنس کلینیکال (Noto Sans Arabic)',
    family: "'Noto Sans Arabic', 'Vazirmatn', sans-serif",
    badge: 'استاندارد بین‌المللی گوگل • حروف باز',
    sample: 'گزارش سونوگرافی و ام‌آر‌آی با وضوح بالا',
  },
  {
    id: 'ui-iransans',
    name: 'ایران‌سنس (IRANSans)',
    family: "'IRANSans', 'Vazirmatn', sans-serif",
    badge: 'گرد و نرم • مناسب مانیتورهای عریض',
    sample: 'گزارش سونوگرافی و ام‌آر‌آی با وضوح بالا',
  },
  {
    id: 'ui-shabnam',
    name: 'شبنم (Shabnam)',
    family: "'Shabnam', 'Vazirmatn', sans-serif",
    badge: 'هندسی و تمیز • خوانایی سریع منوها',
    sample: 'گزارش سونوگرافی و ام‌آر‌آی با وضوح بالا',
  },
  {
    id: 'ui-samim',
    name: 'صمیم (Samim)',
    family: "'Samim', 'Vazirmatn', sans-serif",
    badge: 'کنتراست بالا • مناسب اتاق کم‌نور',
    sample: 'گزارش سونوگرافی و ام‌آر‌آی با وضوح بالا',
  },
  {
    id: 'ui-sahel',
    name: 'ساحل (Sahel)',
    family: "'Sahel', 'Vazirmatn', sans-serif",
    badge: 'ظریف و رسمی • تفکیک عالی نقطه‌ها',
    sample: 'گزارش سونوگرافی و ام‌آر‌آی با وضوح بالا',
  },
  {
    id: 'ui-tahoma',
    name: 'تاهوما کلاسیک (Tahoma System)',
    family: "Tahoma, 'Vazirmatn', Arial, sans-serif",
    badge: 'فونت کلاسیک بیمارستانی ویندوز',
    sample: 'گزارش سونوگرافی و ام‌آر‌آی با وضوح بالا',
  },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onRefreshAllData: () => void;
  onOpenDoctors?: () => void;
  doctors?: Doctor[];
  activeDoctorId?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onRefreshAllData,
  onOpenDoctors,
  doctors = [],
  activeDoctorId = 'doc-1',
}) => {
  const [clinicName, setClinicName] = useState(settings.clinicName);
  const [clinicSubtitle, setClinicSubtitle] = useState(
    settings.clinicSubtitle || 'رادیولوژی، سونوگرافی، ام‌آر‌آی، ام‌آر‌آی قلب، سی‌تی‌اسکن'
  );
  const [clinicAddress, setClinicAddress] = useState(settings.clinicAddress);
  const [clinicPhone, setClinicPhone] = useState(settings.clinicPhone);
  const [clinicLogoText, setClinicLogoText] = useState(settings.clinicLogoText);
  const [clinicLogoUrl, setClinicLogoUrl] = useState(
    settings.clinicLogoUrl || DEFAULT_CLINIC_LOGO_DATA_URI
  );
  const [doctorSignatureUrl, setDoctorSignatureUrl] = useState(settings.doctorSignatureUrl || '');
  const [smartSuggestionsEnabled, setSmartSuggestionsEnabled] = useState(settings.smartSuggestionsEnabled);
  const [numberSlotsEnabled, setNumberSlotsEnabled] = useState(settings.numberSlotsEnabled ?? false);
  const [darkMode, setDarkMode] = useState(settings.darkMode ?? false);
  const [headerFont, setHeaderFont] = useState(settings.headerFont || "'Vazirmatn', sans-serif");
  const [headerFontSize, setHeaderFontSize] = useState<number>(settings.headerFontSize || 18);
  const [defaultFont, setDefaultFont] = useState(settings.defaultFont || 'Vazirmatn');
  const [defaultFontSize, setDefaultFontSize] = useState<number>(settings.defaultFontSize || 14);
  const [editorLineHeight, setEditorLineHeight] = useState<number>(settings.editorLineHeight || 1.9);
  const [printLineHeight, setPrintLineHeight] = useState<number>(settings.printLineHeight || 1.75);
  const [modalityColors, setModalityColors] = useState<ModalityColors>(
    settings.modalityColors || {
      sonography: '#0284c7',
      mri: '#4f46e5',
      ct: '#059669',
    }
  );
  const [customDictionary, setCustomDictionary] = useState<CustomDictionaryTerm[]>(
    settings.customDictionary || []
  );
  const [newDictPhrase, setNewDictPhrase] = useState('');
  const [newDictKeyword, setNewDictKeyword] = useState('');
  const [newDictDoctorId, setNewDictDoctorId] = useState<string>(activeDoctorId || 'all');
  const [newDictModality, setNewDictModality] = useState<Modality | 'all'>('all');
  const [dictFilterDoctorId, setDictFilterDoctorId] = useState<string>('all');
  const [uiFont, setUiFont] = useState(settings.uiFont || "'Vazirmatn', sans-serif");
  const [headingFont, setHeadingFont] = useState(settings.headingFont || 'Vazirmatn');
  const [headingFontSize, setHeadingFontSize] = useState(settings.headingFontSize || '16px');
  const [headingBold, setHeadingBold] = useState(settings.headingBold ?? true);
  const [pageBreakPerStudy, setPageBreakPerStudy] = useState(settings.pageBreakPerStudy ?? false);
  const [preprintedLetterheadMode, setPreprintedLetterheadMode] = useState(
    Boolean(settings.preprintedLetterheadMode)
  );
  const [preprintedTopMarginMm, setPreprintedTopMarginMm] = useState<number>(
    settings.preprintedTopMarginMm ?? 45
  );
  const [monochromePrintMode, setMonochromePrintMode] = useState(
    Boolean(settings.monochromePrintMode)
  );
  const [lanSyncEnabled, setLanSyncEnabled] = useState(Boolean(settings.lanSyncEnabled));
  const [autoFolderBackupEnabled, setAutoFolderBackupEnabled] = useState(
    Boolean(settings.autoFolderBackupEnabled)
  );
  const [storageEstimate, setStorageEstimate] = useState<{
    usageMb: string;
    quotaGb: string;
    percentUsed: string;
    estimatedCapacityText?: string;
  }>({
    usageMb: '۱.۴۰',
    quotaGb: '۶۰.۰+',
    percentUsed: '۰.۰۰۲',
    estimatedCapacityText: 'ظرفیت بیش از ۳۰ میلیون گزارش بیمار (عملاً نامحدود تا سقف فضای هارد)',
  });
  const [lanSyncStatus, setLanSyncStatus] = useState<string>('');
  const [lanServerInfo, setLanServerInfo] = useState<{
    engine: string;
    dbPath: string;
    lanUrls: string[];
    counts: { reports: number; templates: number; typists: number };
  } | null>(null);
  const [folderBackupStatus, setFolderBackupStatus] = useState<string>('');
  const [savedFolderName, setSavedFolderName] = useState<string>(() =>
    IndexedDbService.getSavedBackupFolderName()
  );
  const [lastAutoBackupTime, setLastAutoBackupTime] = useState<string>(() =>
    IndexedDbService.getLastAutoBackupTime()
  );
  const [importStatus, setImportStatus] = useState<string>('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [githubStatus, setGithubStatus] = useState<GitHubSyncStatus | null>(null);
  const [githubBusy, setGithubBusy] = useState(false);
  const [githubMessage, setGithubMessage] = useState<string>('');
  const [githubMessageTone, setGithubMessageTone] = useState<'info' | 'success' | 'error'>('info');
  const [copiedCallbackUrl, setCopiedCallbackUrl] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setClinicLogoUrl(settings.clinicLogoUrl || DEFAULT_CLINIC_LOGO_DATA_URI);
      setHeaderFont(settings.headerFont || "'Vazirmatn', sans-serif");
      setHeaderFontSize(settings.headerFontSize || 18);
      setDefaultFont(settings.defaultFont || 'Vazirmatn');
      setDefaultFontSize(settings.defaultFontSize || 14);
      setEditorLineHeight(settings.editorLineHeight || 1.9);
      setPrintLineHeight(settings.printLineHeight || 1.75);
      setModalityColors(
        settings.modalityColors || {
          sonography: '#0284c7',
          mri: '#4f46e5',
          ct: '#059669',
        }
      );
      setCustomDictionary(settings.customDictionary || []);
      setNewDictDoctorId(activeDoctorId || 'all');
      setUiFont(settings.uiFont || "'Vazirmatn', sans-serif");
      setHeadingFont(settings.headingFont || 'Vazirmatn');
      setHeadingFontSize(settings.headingFontSize || '16px');
      setDarkMode(settings.darkMode ?? false);
      setPreprintedLetterheadMode(Boolean(settings.preprintedLetterheadMode));
      setPreprintedTopMarginMm(settings.preprintedTopMarginMm ?? 45);
      setMonochromePrintMode(Boolean(settings.monochromePrintMode));
      setLanSyncEnabled(Boolean(settings.lanSyncEnabled));
      setAutoFolderBackupEnabled(Boolean(settings.autoFolderBackupEnabled));
      setSavedFolderName(IndexedDbService.getSavedBackupFolderName());
      setLastAutoBackupTime(IndexedDbService.getLastAutoBackupTime());
      IndexedDbService.getStorageQuotaEstimate().then((est) => setStorageEstimate(est));
      IndexedDbService.getLanServerStatus().then((info) => {
        setLanServerInfo(info);
      });
      GitHubSyncService.getStatus().then((st) => {
        setGithubStatus(st);
      });
    }
  }, [isOpen, settings, activeDoctorId]);

  if (!isOpen) return null;

  const handleAddDictionaryTerm = () => {
    const cleanPhrase = newDictPhrase.trim();
    if (!cleanPhrase) return;
    const newTerm: CustomDictionaryTerm = {
      id: `dict-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      phrase: cleanPhrase,
      keyword: newDictKeyword.trim() || undefined,
      doctorId: newDictDoctorId || 'all',
      modality: newDictModality || 'all',
      createdAt: new Date().toISOString(),
    };
    const nextDict = [newTerm, ...customDictionary];
    setCustomDictionary(nextDict);
    setNewDictPhrase('');
    setNewDictKeyword('');
    // Persist immediately so smart suggestions pick it up right away
    onSaveSettings({
      ...settings,
      customDictionary: nextDict,
    });
  };

  const handleDeleteDictionaryTerm = (termId: string) => {
    const nextDict = customDictionary.filter((t) => t.id !== termId);
    setCustomDictionary(nextDict);
    onSaveSettings({
      ...settings,
      customDictionary: nextDict,
    });
  };

  // Upload custom image (Logo or Signature) and convert to base64 Data URL for offline storage
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === 'string') {
        setter(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AppSettings = {
      ...settings,
      clinicName: clinicName.trim(),
      clinicSubtitle: clinicSubtitle.trim(),
      clinicAddress: clinicAddress.trim(),
      clinicPhone: clinicPhone.trim(),
      clinicLogoText: clinicLogoText.trim(),
      clinicLogoUrl,
      doctorSignatureUrl,
      smartSuggestionsEnabled,
      numberSlotsEnabled,
      darkMode,
      uiFont,
      headerFont,
      headerFontSize,
      defaultFont,
      defaultFontSize,
      editorLineHeight,
      printLineHeight,
      modalityColors,
      customDictionary,
      headingFont,
      headingFontSize,
      headingBold,
      pageBreakPerStudy,
      preprintedLetterheadMode,
      preprintedTopMarginMm,
      monochromePrintMode,
      lanSyncEnabled,
      autoFolderBackupEnabled,
    };
    onSaveSettings(updated);
    onClose();
  };

  const handleManualLanSync = async () => {
    setLanSyncStatus('در حال همگام‌سازی با پایگاه داده SQLite سرور شبکه محلی...');
    const res = await IndexedDbService.syncWithLanServer();
    if (res.ok) {
      setLanSyncStatus(
        `✓ همگام‌سازی با پایگاه داده مرکزی (${res.engine || 'SQLite'}) انجام شد (${res.mergedReportsCount} گزارش و ${res.mergedTemplatesCount} قالب مشترک).`
      );
      const info = await IndexedDbService.getLanServerStatus();
      setLanServerInfo(info);
      onRefreshAllData();
    } else {
      setLanSyncStatus(res.error || 'خطا در اتصال به سرور شبکه محلی.');
    }
  };

  const handleGitHubConnect = async () => {
    setGithubBusy(true);
    setGithubMessageTone('info');
    setGithubMessage('در حال باز کردن پنجره امن ورود گیت‌هاب...');
    const res = await GitHubSyncService.connectWithPopup();
    if (res.ok) {
      const updatedStatus = await GitHubSyncService.getStatus();
      setGithubStatus(updatedStatus);
      setGithubMessageTone('info');
      setGithubMessage('✓ حساب گیت‌هاب متصل شد. در حال همگام‌سازی اولیه داده‌ها...');
      const syncRes = await GitHubSyncService.sync('merge');
      setGithubBusy(false);
      if (syncRes.ok) {
        const afterStatus = await GitHubSyncService.getStatus();
        setGithubStatus(afterStatus);
        setGithubMessageTone('success');
        setGithubMessage(
          `✓ همگام‌سازی ابری با گیت‌هاب با موفقیت انجام شد (${syncRes.counts?.reports ?? 0} گزارش، ${syncRes.counts?.templates ?? 0} قالب، ${syncRes.counts?.doctors ?? 0} پزشک و ${syncRes.counts?.shortcuts ?? 0} میانبر).`
        );
        onRefreshAllData();
      } else {
        setGithubMessageTone('error');
        setGithubMessage(syncRes.error || 'اتصال برقرار شد اما همگام‌سازی اولیه ناموفق بود.');
      }
    } else {
      setGithubBusy(false);
      setGithubMessageTone('error');
      setGithubMessage(res.error || 'اتصال به گیت‌هاب ناموفق بود.');
      const st = await GitHubSyncService.getStatus();
      setGithubStatus(st);
    }
  };

  const handleGitHubSync = async (mode: 'merge' | 'push' | 'pull') => {
    setGithubBusy(true);
    setGithubMessageTone('info');
    setGithubMessage(
      mode === 'push'
        ? 'در حال ارسال نسخه کامل اطلاعات به Gist خصوصی گیت‌هاب...'
        : mode === 'pull'
        ? 'در حال دریافت و بازیابی اطلاعات از گیت‌هاب...'
        : 'در حال ادغام و همگام‌سازی دوطرفه با گیت‌هاب...'
    );
    const res = await GitHubSyncService.sync(mode);
    setGithubBusy(false);
    if (res.ok) {
      const st = await GitHubSyncService.getStatus();
      setGithubStatus(st);
      setGithubMessageTone('success');
      setGithubMessage(
        `✓ ${
          mode === 'push'
            ? 'ارسال به گیت‌هاب'
            : mode === 'pull'
            ? 'دریافت از گیت‌هاب'
            : 'همگام‌سازی دوطرفه گیت‌هاب'
        } انجام شد (${res.counts?.reports ?? 0} گزارش، ${res.counts?.templates ?? 0} قالب، ${res.counts?.doctors ?? 0} پزشک).`
      );
      onRefreshAllData();
    } else {
      const st = await GitHubSyncService.getStatus();
      setGithubStatus(st);
      setGithubMessageTone('error');
      setGithubMessage(res.error || 'خطا در همگام‌سازی با گیت‌هاب.');
    }
  };

  const handleGitHubDisconnect = async () => {
    setGithubBusy(true);
    await GitHubSyncService.disconnect();
    const st = await GitHubSyncService.getStatus();
    setGithubStatus(st);
    setGithubBusy(false);
    setGithubMessageTone('info');
    setGithubMessage('اتصال حساب گیت‌هاب قطع شد (اطلاعات محلی و بکاپ گیت‌هاب دست‌نخورده باقی ماندند).');
  };

  const handleCopyCallbackUrl = async (urlToCopy: string) => {
    try {
      await navigator.clipboard.writeText(urlToCopy);
      setCopiedCallbackUrl(true);
      window.setTimeout(() => setCopiedCallbackUrl(false), 2000);
    } catch {}
  };

  const handleSelectBackupFolder = async () => {
    const res = await IndexedDbService.selectLocalBackupFolder();
    if (res.supported && res.folderName) {
      setAutoFolderBackupEnabled(true);
      setSavedFolderName(res.folderName);
      setLastAutoBackupTime(IndexedDbService.getLastAutoBackupTime());
      setFolderBackupStatus(
        `✓ پوشه «${res.folderName}» روی هارد سیستم انتخاب شد و فایل پشتیبان امروز (${res.savedFileName || 'JSON'}) به صورت خودکار ذخیره گردید.`
      );
    } else {
      handleExportBackup();
      setFolderBackupStatus(
        res.error || 'فایل پشتیبان روزانه مستقیماً در پوشه Downloads ذخیره شد.'
      );
    }
  };

  const handleExportBackup = () => {
    const jsonStr = StorageService.exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RadioReport_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const ok = StorageService.importAllData(content);
      if (ok) {
        setImportStatus('اطلاعات با موفقیت بازیابی شد.');
        onRefreshAllData();
      } else {
        setImportStatus('خطا در فایل پشتیبان.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDefaults = () => {
    StorageService.resetToDefaults();
    onRefreshAllData();
    setShowResetConfirm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleIn">
        {/* Header with Top-Left Pinned Close Button */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-400 flex items-center justify-center shrink-0">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base">تنظیمات سامانه، سربرگ مرکز، فونت پیش‌فرض و نصب آفلاین</h3>
              <p className="text-[11px] text-slate-300 mt-0.5">اطلاعات مرکز، قلم پیش‌فرض متن گزارش، لوگوی اختصاصی، نصب آفلاین و پشتیبان‌گیری</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="بستن پنجره تنظیمات"
            className="h-8 px-2.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white border border-slate-700 hover:border-rose-500 flex items-center gap-1 text-xs font-bold shrink-0 transition-colors cursor-pointer"
          >
            <span>بستن</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Clinic Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Building2 className="w-4 h-4 text-teal-600" />
              <span>مشخصات مرکز تصویربرداری (جهت چاپ در سربرگ گزارش)</span>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                نام رسمی مرکز تصویربرداری:
              </label>
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                عناوین بخش‌ها و خدمات (زیرعنوان سربرگ):
              </label>
              <input
                type="text"
                value={clinicSubtitle}
                onChange={(e) => setClinicSubtitle(e.target.value)}
                placeholder="رادیولوژی، سونوگرافی، ام‌آر‌آی، ام‌آر‌آی قلب، سی‌تی‌اسکن"
                className="w-full text-xs p-2 rounded-xl border border-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  تلفن تماس:
                </label>
                <input
                  type="text"
                  value={clinicPhone}
                  onChange={(e) => setClinicPhone(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  متن لوگو/نشانگر انگلیسی:
                </label>
                <input
                  type="text"
                  value={clinicLogoText}
                  onChange={(e) => setClinicLogoText(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 font-mono"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                آدرس مرکز:
              </label>
              <input
                type="text"
                value={clinicAddress}
                onChange={(e) => setClinicAddress(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-200"
              />
            </div>
          </div>

          {/* Clinic Logo Section (Doctor Stamp & Signature moved to DoctorManagementModal) */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                <ImageIcon className="w-4 h-4 text-teal-600" />
                <span>لوگوی اختصاصی بالای سربرگ مرکز (در فایل چاپی A4)</span>
              </div>
              {onOpenDoctors && (
                <button
                  type="button"
                  onClick={onOpenDoctors}
                  className="text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <PenTool className="w-3.5 h-3.5 text-indigo-600" />
                  <span>تنظیمات مهر و امضای پزشکان در بخش مدیریت پزشکان ←</span>
                </button>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>لوگوی بالای سربرگ مرکز</span>
                </span>
                {clinicLogoUrl && (
                  <button
                    type="button"
                    onClick={() => setClinicLogoUrl('')}
                    className="text-[10px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>حذف لوگو</span>
                  </button>
                )}
              </div>

              {/* Live Logo Preview + Upload Button */}
              <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                <div className="w-14 h-14 rounded-xl bg-slate-50 border border-dashed border-slate-300 flex items-center justify-center shrink-0 overflow-hidden p-1">
                  {clinicLogoUrl ? (
                    <img
                      src={
                        isOfficialClinicLogoUri(clinicLogoUrl)
                          ? getOfficialClinicLogoDataUri(modalityColors.sonography || '#0284c7')
                          : clinicLogoUrl
                      }
                      alt="لوگوی مرکز"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-[10px] text-slate-400 text-center leading-tight">
                      بدون لوگو
                    </span>
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="w-full py-1.5 px-2.5 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>آپلود تصویر لوگوی دلخواه</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, setClinicLogoUrl)}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-slate-500">
                    فرمت PNG، JPG یا SVG (لوگوی پیش‌فرض به صورت خودکار هم‌رنگ با مدالیته فعال چاپ می‌شود)
                  </p>
                </div>
              </div>

              {/* Preset Sample Logos */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold text-slate-600">
                  یا انتخاب سریع از میان لوگوهای نمونه آماده:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {SAMPLE_CLINIC_LOGOS.map((sample) => {
                    const isSelected =
                      clinicLogoUrl === sample.url ||
                      (sample.id === 'logo-official-default' && isOfficialClinicLogoUri(clinicLogoUrl));
                    const previewUrl =
                      sample.id === 'logo-official-default'
                        ? getOfficialClinicLogoDataUri(modalityColors.sonography || '#0284c7')
                        : sample.url;
                    return (
                      <button
                        key={sample.id}
                        type="button"
                        onClick={() => setClinicLogoUrl(sample.url)}
                        className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-teal-50 border-teal-600 ring-1 ring-teal-500/30'
                            : 'bg-white hover:bg-slate-100 border-slate-200'
                        }`}
                        title={sample.label}
                      >
                        <img src={previewUrl} alt={sample.label} className="w-9 h-9 object-contain" />
                        <span className="text-[9px] font-bold text-slate-700 text-center line-clamp-1">
                          {sample.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Custom Modality Color Picker Section (انتخاب رنگ اختصاصی هر مدالیته در برنامه و چاپ سربرگ) */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                <Palette className="w-4 h-4 text-sky-600" />
                <span>انتخاب رنگ اختصاصی مدالیته‌ها (در سربرگ برنامه، لوگو و گزارش چاپی A4)</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setModalityColors({
                    sonography: '#0284c7',
                    mri: '#4f46e5',
                    ct: '#059669',
                  })
                }
                className="text-[10px] font-bold text-slate-600 hover:text-teal-700 bg-slate-100 hover:bg-teal-50 px-2 py-0.5 rounded-lg border border-slate-200 cursor-pointer"
              >
                ↺ بازنشانی رنگ‌های استاندارد
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(
                [
                  {
                    id: 'sonography' as const,
                    label: 'سونوگرافی (Ultrasound)',
                    presets: ['#0284c7', '#0369a1', '#0d9488', '#2563eb', '#0891b2'],
                  },
                  {
                    id: 'mri' as const,
                    label: 'ام‌آر‌آی (MRI)',
                    presets: ['#4f46e5', '#4338ca', '#7c3aed', '#6d28d9', '#1d4ed8'],
                  },
                  {
                    id: 'ct' as const,
                    label: 'سی‌تی‌اسکن (CT Scan)',
                    presets: ['#059669', '#047857', '#0f766e', '#15803d', '#ca8a04'],
                  },
                ] as const
              ).map((modItem) => {
                const currentHex = modalityColors[modItem.id] || modItem.presets[0];
                return (
                  <div
                    key={modItem.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800">{modItem.label}</span>
                      <input
                        type="color"
                        value={currentHex}
                        onChange={(e) =>
                          setModalityColors((prev) => ({
                            ...prev,
                            [modItem.id]: e.target.value,
                          }))
                        }
                        className="w-7 h-7 rounded-lg border border-slate-300 cursor-pointer bg-white p-0.5"
                        title={`انتخاب رنگ دلخواه برای ${modItem.label}`}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {modItem.presets.map((sw) => (
                        <button
                          key={sw}
                          type="button"
                          onClick={() =>
                            setModalityColors((prev) => ({
                              ...prev,
                              [modItem.id]: sw,
                            }))
                          }
                          className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                            currentHex.toLowerCase() === sw.toLowerCase()
                              ? 'scale-115 ring-2 ring-slate-900 border-white'
                              : 'border-slate-300 hover:scale-105'
                          }`}
                          style={{ backgroundColor: sw }}
                        />
                      ))}
                      <span className="mr-auto font-mono text-[10px] text-slate-500" dir="ltr">
                        {currentHex}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Default Body Font & Headings Typography Settings */}
          <div className="pt-3 border-t border-slate-200 space-y-3.5">
            <div className="text-xs font-black text-slate-900 flex items-center justify-between">
              <span>تنظیم قلم سربرگ چاپی، متن گزارش و عناوین (محیط تایپ و چاپ)</span>
              <span className="text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded-full">
                نمایش خواناتر در محیط تایپ
              </span>
            </div>

            {/* Letterhead / Header Font Family & Header Font Size */}
            <div className="p-3.5 rounded-2xl bg-teal-50/50 border border-teal-200 space-y-3">
              <div className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-teal-600" />
                <span>فونت و سایز فونت سربرگ گزارش‌های چاپی (عنوان مرکز و مشخصات پذیرش بیمار)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    قلم سربرگ گزارش (Header Font):
                  </label>
                  <select
                    value={headerFont}
                    onChange={(e) => {
                      const nextFont = e.target.value;
                      setHeaderFont(nextFont);
                      onSaveSettings({
                        ...settings,
                        headerFont: nextFont,
                        headerFontSize,
                      });
                    }}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white font-semibold focus:border-teal-500 cursor-pointer"
                  >
                    {(settings.customFonts || []).map((f) => (
                      <option key={f.id} value={f.family}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    سایز عنوان سربرگ مرکز (Header Size):
                  </label>
                  <select
                    value={headerFontSize}
                    onChange={(e) => {
                      const nextSize = Number(e.target.value);
                      setHeaderFontSize(nextSize);
                      onSaveSettings({
                        ...settings,
                        headerFont,
                        headerFontSize: nextSize,
                      });
                    }}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white font-semibold focus:border-teal-500 cursor-pointer"
                  >
                    <option value={15}>۱۵ پیکسل (ظریف و فشرده)</option>
                    <option value={16}>۱۶ پیکسل (متوسط کوچک)</option>
                    <option value={18}>۱۸ پیکسل (استاندارد رسمی)</option>
                    <option value={20}>۲۰ پیکسل (درشت)</option>
                    <option value={22}>۲۲ پیکسل (بسیار درشت و برجسته)</option>
                  </select>
                </div>
              </div>

              {/* Live Letterhead Preview */}
              <div
                className="printable-header-section p-2.5 rounded-xl bg-white border border-teal-200 flex items-center justify-between gap-3"
                style={
                  {
                    '--header-font-family': headerFont || "'Vazirmatn', sans-serif",
                    fontFamily: headerFont || "'Vazirmatn', sans-serif",
                  } as React.CSSProperties
                }
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={
                      isOfficialClinicLogoUri(clinicLogoUrl)
                        ? getOfficialClinicLogoDataUri(modalityColors.sonography || '#0284c7')
                        : clinicLogoUrl || DEFAULT_CLINIC_LOGO_DATA_URI
                    }
                    alt="لوگوی سربرگ"
                    className="w-10 h-10 object-contain shrink-0"
                  />
                  <div className="min-w-0">
                    <div
                      className="font-bold text-slate-900 truncate"
                      style={{ fontSize: `${headerFontSize}px` }}
                    >
                      {clinicName || 'مرکز جامع تصویربرداری بیمارستان شفا'}
                    </div>
                    <div
                      className="font-bold text-teal-800 truncate"
                      style={{ fontSize: `${Math.max(10, Math.round(headerFontSize * 0.65))}px` }}
                    >
                      {clinicSubtitle || 'رادیولوژی، سونوگرافی، ام‌آر‌آی، سی‌تی‌اسکن'}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 shrink-0">
                  پیش‌نمایش زنده سربرگ
                </span>
              </div>
            </div>

            {/* Body Font Family & Base Font Size */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    قلم پیش‌فرض متن اصلی گزارش (Body Font):
                  </label>
                  <select
                    value={defaultFont}
                    onChange={(e) => setDefaultFont(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white font-semibold focus:border-teal-500"
                  >
                    {(settings.customFonts || []).map((f) => (
                      <option key={f.id} value={f.family}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    سایز پایه متن گزارش (استاندارد ۱۴):
                  </label>
                  <select
                    value={defaultFontSize}
                    onChange={(e) => setDefaultFontSize(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white font-semibold focus:border-teal-500"
                  >
                    <option value={12}>۱۲ (ریز)</option>
                    <option value={13}>۱۳ (متوسط کوچک)</option>
                    <option value={14}>۱۴ (استاندارد چاپی • درشت‌تر در محیط تایپ)</option>
                    <option value={15}>۱۵ (متوسط بزرگ)</option>
                    <option value={16}>۱۶ (درشت)</option>
                  </select>
                </div>
              </div>

              {/* Live Font Preview */}
              <div
                className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 leading-relaxed"
                style={{
                  fontFamily: `${defaultFont}, 'Vazirmatn', sans-serif`,
                  fontSize: `${defaultFontSize + 2}px`,
                }}
              >
                <span className="text-[10px] font-bold text-teal-700 ml-2 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                  پیش‌نمایش قلم متن:
                </span>
                <span>
                  کبد دارای ابعاد و اکوی پارانشیمال طبیعی است (اسپن ۱۴۲ میلی‌متر). شواهدی از ضایعه فضاگیر رویت نشد.
                </span>
              </div>
            </div>

            {/* Heading Font Family & Heading Size */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  قلم عناوین و تیترهای بررسی:
                </label>
                <select
                  value={headingFont}
                  onChange={(e) => setHeadingFont(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-white"
                >
                  {(settings.customFonts || []).map((f) => (
                    <option key={f.id} value={f.family}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  اندازه فونت عنوان بررسی:
                </label>
                <select
                  value={headingFontSize}
                  onChange={(e) => setHeadingFontSize(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="14px">۱۴ پیکسل (ریز)</option>
                  <option value="16px">۱۶ پیکسل (استاندارد)</option>
                  <option value="18px">۱۸ پیکسل (متوسط بزرگ)</option>
                  <option value="20px">۲۰ پیکسل (بزرگ و برجسته)</option>
                  <option value="22px">۲۲ پیکسل (بسیار بزرگ)</option>
                </select>
              </div>
            </div>

            {/* Live Heading Font Preview */}
            <div
              className="p-2.5 rounded-xl bg-white border border-slate-200 text-sky-800 leading-relaxed flex items-center gap-2 flex-wrap"
              style={{
                fontFamily: `${headingFont}, 'Vazirmatn', sans-serif`,
                fontSize: headingFontSize || '16px',
                fontWeight: headingBold ? 900 : 700,
              }}
            >
              <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 font-sans">
                پیش‌نمایش تیتر گزارش:
              </span>
              <span>سونوگرافی کامل شکم و لگن با پروب کانوکس ۳.۵ مگاهرتز</span>
            </div>

            {/* Application-Wide UI Font Family (فونت کل رابط کاربری برنامه جهت کاهش خستگی چشم در شیفت‌های طولانی) */}
            <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                  <Type className="w-4 h-4 text-indigo-600" />
                  <span>فونت کل رابط کاربری برنامه (کاهش خستگی چشم در شیفت‌های طولانی تایپ):</span>
                </label>
                <span className="text-[10px] font-bold bg-white text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                  اعمال فوری روی تمام منوها، دکمه‌ها، تب‌ها و پنل‌ها
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PREAPPROVED_MEDICAL_UI_FONTS.map((f) => {
                  const isSelected = uiFont === f.family || uiFont.includes(f.family.split(',')[0].replace(/'/g, ''));
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setUiFont(f.family);
                        document.documentElement.style.setProperty('--ui-font-family', f.family);
                      }}
                      style={{ fontFamily: f.family }}
                      className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white hover:bg-indigo-50/80 text-slate-800 border-indigo-200/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-black">{f.name}</span>
                        <span
                          className={`text-[9.5px] px-1.5 py-0.5 rounded font-semibold ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-indigo-50 text-indigo-800 border border-indigo-100'
                          }`}
                        >
                          {f.badge}
                        </span>
                      </div>
                      <div
                        className={`text-[11px] truncate ${
                          isSelected ? 'text-indigo-100' : 'text-slate-500'
                        }`}
                      >
                        {f.sample}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Multi-Study Page Break & Physical Pre-printed Letterhead Defaults */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={pageBreakPerStudy}
                  onChange={(e) => setPageBreakPerStudy(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                />
                <span>شکستن صفحه برای هر تصویربرداری (شروع هر بررسی در صفحه مجزا در چاپ A4)</span>
              </label>

              <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={preprintedLetterheadMode}
                    onChange={(e) => setPreprintedLetterheadMode(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>چاپ پیش‌فرض روی کاغذ سربرگ فیزیکی آماده (حذف هدر و فوتر چاپی)</span>
                </label>
                {preprintedLetterheadMode && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-600">فاصله از بالای کاغذ (mm):</span>
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
                      className="w-16 p-1 text-center font-mono border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200/80">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={monochromePrintMode}
                    onChange={(e) => setMonochromePrintMode(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>حالت چاپ سیاه‌وسفید لیزری (Monochrome Laser Print) به صورت پیش‌فرض</span>
                </label>
              </div>
            </div>
          </div>

          {/* Dedicated Custom Medical Dictionary Section (دیکشنری اختصاصی کلمات و جملات پزشکی با اولویت پزشک فعال) */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                <BookOpen className="w-4 h-4 text-teal-600" />
                <span>دیکشنری اختصاصی کلمات و اصطلاحات پزشکی (با اولویت پیشنهاد برای پزشک فعال)</span>
              </div>
              <span className="text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-full">
                {customDictionary.length} اصطلاح ثبت‌شده
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-teal-50/40 border border-teal-200 space-y-3">
              <p className="text-[11px] text-slate-600 leading-relaxed">
                اصطلاحات و جملات تخصصی هر پزشک را در این بخش اضافه کنید تا سیستم پیشنهاد هوشمند جملات در زمان تایپ، <strong>ابتدا اصطلاحات اختصاصی پزشک فعال</strong> و سپس اصطلاحات عمومی را در بالاترین اولویت (با کلید Tab) پیشنهاد دهد.
              </p>

              {/* Add New Dictionary Term Form */}
              <div className="p-3 rounded-xl bg-white border border-teal-200/90 space-y-2.5">
                <div className="text-[11px] font-bold text-teal-950">
                  + افزودن اصطلاح یا جمله جدید به دیکشنری هوشمند:
                </div>
                <div>
                  <input
                    type="text"
                    value={newDictPhrase}
                    onChange={(e) => setNewDictPhrase(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddDictionaryTerm();
                      }
                    }}
                    placeholder="متن کامل جمله یا اصطلاح پزشکی (مثلاً: شواهدی از دیسکوپاتی یا تنگی کانال نخاعی کمری مشهود نیست.)"
                    className="w-full text-xs p-2 rounded-xl border border-slate-300 focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      value={newDictKeyword}
                      onChange={(e) => setNewDictKeyword(e.target.value)}
                      placeholder="کلمه کلیدی ماشه (مثلاً: کمر، کبد)"
                      className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-500"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <select
                      value={newDictDoctorId}
                      onChange={(e) => setNewDictDoctorId(e.target.value)}
                      className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold"
                    >
                      <option value="all">مشترک برای همه پزشکان</option>
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          اختصاصی {d.name} {d.id === activeDoctorId ? '(پزشک فعال)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <select
                      value={newDictModality}
                      onChange={(e) => setNewDictModality(e.target.value as Modality | 'all')}
                      className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold"
                    >
                      <option value="all">همه مدالیته‌ها</option>
                      <option value="sonography">سونوگرافی</option>
                      <option value="mri">ام‌آر‌آی</option>
                      <option value="ct">سی‌تی‌اسکن</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddDictionaryTerm}
                      disabled={!newDictPhrase.trim()}
                      className="w-full py-2 px-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>افزودن</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Filter & List of Dictionary Terms */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[11px] font-bold text-slate-700">
                    فهرست اصطلاحات دیکشنری (مرتب‌شده بر اساس اولویت پزشک فعال):
                  </span>
                  <select
                    value={dictFilterDoctorId}
                    onChange={(e) => setDictFilterDoctorId(e.target.value)}
                    className="text-[11px] px-2 py-1 rounded-lg border border-slate-200 bg-white font-semibold"
                  >
                    <option value="all">نمایش همه اصطلاحات ({customDictionary.length})</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        فقط اصطلاحات {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-0.5">
                  {customDictionary
                    .filter((item) =>
                      dictFilterDoctorId === 'all' ? true : item.doctorId === dictFilterDoctorId
                    )
                    .sort((a, b) => {
                      const aIsActive = a.doctorId === activeDoctorId ? 1 : 0;
                      const bIsActive = b.doctorId === activeDoctorId ? 1 : 0;
                      return bIsActive - aIsActive;
                    })
                    .map((item) => {
                      const docObj = doctors.find((d) => d.id === item.doctorId);
                      const isForActiveDoc = item.doctorId === activeDoctorId;
                      return (
                        <div
                          key={item.id}
                          className={`p-2.5 rounded-xl border text-xs flex items-start justify-between gap-2 transition-colors ${
                            isForActiveDoc
                              ? 'bg-teal-50/90 border-teal-300'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="font-semibold text-slate-800 leading-relaxed">
                              {item.phrase}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                  isForActiveDoc
                                    ? 'bg-teal-600 text-white border-teal-600'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {docObj
                                  ? `${docObj.name}${isForActiveDoc ? ' ★ اولویت اول' : ''}`
                                  : 'عمومی (همه پزشکان)'}
                              </span>
                              {item.keyword && (
                                <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-mono">
                                  کلیدواژه: {item.keyword}
                                </span>
                              )}
                              {item.modality && item.modality !== 'all' && (
                                <span className="text-[10px] bg-sky-50 text-sky-800 border border-sky-200 px-1.5 py-0.5 rounded font-semibold">
                                  {item.modality === 'sonography'
                                    ? 'سونوگرافی'
                                    : item.modality === 'mri'
                                    ? 'ام‌آر‌آی'
                                    : 'سی‌تی‌اسکن'}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteDictionaryTerm(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                            title="حذف اصطلاح از دیکشنری"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>

          {/* AI & Typist Productivity Settings */}
          <div className="pt-3 border-t border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between p-3 bg-teal-50/70 border border-teal-200 rounded-2xl">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span>پیشنهاد هوشمند جملات بعدی</span>
                </div>
                <p className="text-[11px] text-teal-700">
                  نمایش و تکمیل خودکار هوشمند با کلید Tab حین تایپ یافته‌ها
                </p>
              </div>
              <input
                type="checkbox"
                checked={smartSuggestionsEnabled}
                onChange={(e) => setSmartSuggestionsEnabled(e.target.checked)}
                className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-sky-50/70 border border-sky-200 rounded-2xl">
              <div className="space-y-0.5 pl-3">
                <div className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-sky-600" />
                  <span>فیلدهای جایگذاری اعداد در فایل‌های خام (بدون به هم ریختن متن)</span>
                  <span className="text-[10px] font-semibold bg-white text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-md">
                    اختیاری • پیش‌فرض غیرفعال
                  </span>
                </div>
                <p className="text-[11px] text-sky-800 leading-relaxed">
                  در صورت فعال‌سازی، اعداد و اندازه‌های قالب‌های خام (سایز کلیه، سن جنین، تیروئید و...) در کادرهای مجزا قرار می‌گیرند تا بدون تغییر ساختار متن ویرایش شوند.
                </p>
              </div>
              <input
                type="checkbox"
                checked={numberSlotsEnabled}
                onChange={(e) => setNumberSlotsEnabled(e.target.checked)}
                className="w-5 h-5 rounded text-sky-600 focus:ring-sky-500 cursor-pointer shrink-0"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-900 text-slate-100 border border-slate-700 rounded-2xl">
              <div className="space-y-0.5 pl-3">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Moon className="w-4 h-4 text-amber-400" />
                  <span>حالت تاریک مخصوص اتاق گزارش‌نویسی رادیولوژی و شیفت شب (Dark Mode)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  محیط تایپ را تیره می‌کند تا چشم در محیط کم‌نور خسته نشود (کاغذ چاپ و پیش‌نمایش همچنان سفید باقی می‌ماند).
                </p>
              </div>
              <input
                type="checkbox"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
                className="w-5 h-5 rounded text-teal-500 focus:ring-teal-400 cursor-pointer shrink-0"
              />
            </div>
          </div>

          {/* IndexedDB Multi-GB Engine, LAN Sync & Automated Local Folder Backup */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-teal-600" />
                <span>موتور دیتابیس نامحدود (IndexedDB + SQLite)، سینک شبکه محلی (LAN) و بکاپ خودکار</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                فضای مصرفی: {storageEstimate.usageMb} MB از {storageEstimate.quotaGb} GB •{' '}
                {storageEstimate.estimatedCapacityText || 'ظرفیت +۳۰ میلیون گزارش بیمار (نامحدود تا سقف هارد)'}
              </span>
            </div>

            {/* LAN Multi-Typist SQLite Database Sync Box */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Network className="w-4 h-4 text-indigo-600" />
                  <span>
                    اشتراک‌گذاری شبکه محلی بین چند سیستم تایپیست (LAN Sync با پایگاه داده SQLite)
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={lanSyncEnabled}
                  onChange={(e) => setLanSyncEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                پایگاه داده سبک محلی <strong>SQLite (فایل radioreport_lan.sqlite در حالت WAL)</strong> روی سرور فعال است تا تمام تایپیست‌های مرکز از سیستم‌های خودشان به یک آرشیو بیماران، بانک قالب و آمار کارکرد واحد و مشترک متصل باشند.
              </p>

              {lanServerInfo && (
                <div className="p-2.5 bg-white rounded-xl border border-indigo-200/80 text-[11px] space-y-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-bold text-indigo-950">
                      موتور پایگاه داده سرور: <strong className="text-emerald-700">{lanServerInfo.engine}</strong>
                    </span>
                    <span className="font-mono text-[10px] text-slate-500" dir="ltr">
                      {lanServerInfo.dbPath}
                    </span>
                  </div>
                  <div className="flex items-center justify-between flex-wrap gap-2 text-slate-600">
                    <span>
                      آدرس اتصال سایر سیستم‌های تایپیست در شبکه (LAN):{' '}
                      <strong className="font-mono text-indigo-700" dir="ltr">
                        {lanServerInfo.lanUrls.join(' , ')}
                      </strong>
                    </span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded font-bold">
                      {lanServerInfo.counts.reports} گزارش • {lanServerInfo.counts.templates} قالب •{' '}
                      {lanServerInfo.counts.typists} تایپیست
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleManualLanSync}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>همگام‌سازی فوری با دیتابیس SQLite شبکه (LAN)</span>
                </button>
                {lanSyncStatus && (
                  <span className="text-[11px] font-bold text-indigo-800">{lanSyncStatus}</span>
                )}
              </div>
            </div>

            {/* GitHub Cloud Sync (OAuth + Private Secret Gist) */}
            <div className="p-3.5 bg-slate-900/[0.03] border border-slate-300 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <Github className="w-4 h-4 text-slate-900" />
                  <span>همگام‌سازی ابری با گیت‌هاب (GitHub Cloud Sync — فایل خصوصی Secret Gist)</span>
                </div>
                {githubStatus?.connected && githubStatus.user ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                    {githubStatus.user.avatarUrl && (
                      <img
                        src={githubStatus.user.avatarUrl}
                        alt={githubStatus.user.login}
                        className="w-4 h-4 rounded-full"
                      />
                    )}
                    <span dir="ltr">@{githubStatus.user.login}</span>
                    <span>متصل</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-lg">
                    متصل نیست
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed">
                تمام گزارش‌ها، قالب‌ها، لیست پزشکان، تایپیست‌ها، میانبرها و تنظیمات سربرگ را به صورت <strong>کاملاً خصوصی (Secret Gist)</strong> در حساب گیت‌هاب خودتان همگام‌سازی کنید تا بین سیستم مطب، بیمارستان و لپ‌تاپ همیشه یکپارچه باشند.
              </p>

              {githubStatus?.connected ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      disabled={githubBusy}
                      onClick={() => handleGitHubSync('merge')}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${githubBusy ? 'animate-spin' : ''}`} />
                      <span>همگام‌سازی هوشمند دوطرفه (ادغام)</span>
                    </button>
                    <button
                      type="button"
                      disabled={githubBusy}
                      onClick={() => handleGitHubSync('push')}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-60 text-slate-800 border border-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <CloudUpload className="w-3.5 h-3.5 text-teal-600" />
                      <span>ارسال به گیت‌هاب</span>
                    </button>
                    <button
                      type="button"
                      disabled={githubBusy}
                      onClick={() => handleGitHubSync('pull')}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-60 text-slate-800 border border-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <CloudDownload className="w-3.5 h-3.5 text-sky-600" />
                      <span>دریافت از گیت‌هاب</span>
                    </button>
                    <button
                      type="button"
                      disabled={githubBusy}
                      onClick={handleGitHubDisconnect}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 disabled:opacity-60 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>قطع اتصال</span>
                    </button>
                  </div>

                  {githubStatus.gistUrl && (
                    <div className="text-[11px] text-slate-600 flex items-center gap-1.5 flex-wrap">
                      <span>فایل خصوصی بکاپ در گیت‌هاب:</span>
                      <a
                        href={githubStatus.gistUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-teal-700 hover:text-teal-900 underline inline-flex items-center gap-1"
                        dir="ltr"
                      >
                        <span>مشاهده Secret Gist</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      disabled={githubBusy}
                      onClick={handleGitHubConnect}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Github className="w-3.5 h-3.5" />
                      <span>{githubBusy ? 'در حال اتصال...' : 'اتصال به حساب گیت‌هاب (GitHub)'}</span>
                    </button>
                  </div>

                  {githubStatus && !githubStatus.configured && (
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-700 space-y-1.5">
                      <div className="font-bold text-slate-900">
                        راهنمای یک‌باره فعال‌سازی OAuth گیت‌هاب (سمت سرور):
                      </div>
                      <p className="text-slate-600 leading-relaxed">
                        در تنظیمات گیت‌هاب (<span dir="ltr" className="font-mono">Developer Settings → OAuth Apps</span>) یک اپلیکیشن بسازید، آدرس زیر را به عنوان <span dir="ltr" className="font-mono">Authorization callback URL</span> قرار دهید و مقادیر <span dir="ltr" className="font-mono font-bold">GITHUB_CLIENT_ID</span> و <span dir="ltr" className="font-mono font-bold">GITHUB_CLIENT_SECRET</span> را در بخش Secrets سرور تنظیم کنید:
                      </p>
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                        <code className="text-[10.5px] font-mono text-slate-800 break-all flex-1" dir="ltr">
                          {githubStatus.callbackUrl}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopyCallbackUrl(githubStatus.callbackUrl)}
                          className="p-1 text-slate-500 hover:text-teal-700 rounded cursor-pointer shrink-0"
                          title="کپی آدرس Callback"
                        >
                          {copiedCallbackUrl ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {githubMessage && (
                <div
                  className={`text-[11px] font-bold p-2 rounded-lg border ${
                    githubMessageTone === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : githubMessageTone === 'error'
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  {githubMessage}
                </div>
              )}
            </div>

            {/* Automated Daily Local Folder Backup (File System Access API) */}
            <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                  <FolderSync className="w-4 h-4 text-amber-600" />
                  <span>
                    پشتیبان‌گیری خودکار روزانه در پوشه کامپیوتر (File System Access API در کروم و اج)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-[11px] font-bold text-amber-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoFolderBackupEnabled}
                      onChange={(e) => setAutoFolderBackupEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600"
                    />
                    <span>بکاپ خودکار شبانه / هنگام بستن</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectBackupFolder}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    {savedFolderName ? `تغییر پوشه (${savedFolderName})` : 'انتخاب پوشه روی هارد کامپیوتر'}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-amber-900/90 leading-relaxed">
                با انتخاب یک پوشه روی هارد کامپیوتر، برنامه هر شب و همچنین هنگام ذخیره یا بستن برنامه، به صورت خودکار یک فایل بکاپ از تمام گزارش‌های آن روز (<code className="font-mono">RadioReport_AutoBackup_YYYY-MM-DD.json</code>) در هارد سیستم ذخیره می‌کند.
              </p>
              {(savedFolderName || lastAutoBackupTime) && (
                <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] bg-white/90 px-3 py-1.5 rounded-xl border border-amber-200 text-slate-700">
                  <span>
                    📁 پوشه متصل هارد:{' '}
                    <strong className="text-amber-950">{savedFolderName || 'پوشه پیش‌فرض سیستم'}</strong>
                  </span>
                  {lastAutoBackupTime && (
                    <span>
                      🕒 آخرین بکاپ خودکار: <strong className="font-mono text-teal-800">{lastAutoBackupTime}</strong>
                    </span>
                  )}
                </div>
              )}
              {folderBackupStatus && (
                <div className="text-[11px] font-bold text-teal-800 bg-white p-2 rounded-lg border border-amber-200">
                  {folderBackupStatus}
                </div>
              )}
            </div>

            {/* Offline Desktop App Installation (PWA) & Local Execution */}
            <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-2xl flex items-center justify-between flex-wrap gap-3">
              <div className="space-y-1">
                <div className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-teal-600" />
                  <span>نصب برنامه به صورت آفلاین روی ویندوز / دسکتاپ (PWA) و راهنمای اجرای محلی</span>
                </div>
                <p className="text-[11px] text-teal-900/80">
                  می‌توانید برنامه را به عنوان اپلیکیشن مستقل دسکتاپ بدون نیاز به اینترنت نصب کنید یا راهنمای اجرای محلی از گیت‌هاب را مشاهده نمایید.
                </p>
              </div>
              <PWAInstallButton />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="flex-1 py-2 px-3 text-xs font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl flex items-center justify-center gap-1.5 text-slate-800 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>دانلود نسخه پشتیبان (JSON)</span>
              </button>

              <label className="flex-1 py-2 px-3 text-xs font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl flex items-center justify-center gap-1.5 text-slate-800 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>بازیابی از فایل</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
            {importStatus && (
              <div className="text-xs text-teal-700 bg-teal-50 p-2 rounded-lg font-medium">
                {importStatus}
              </div>
            )}

            <div className="pt-2">
              {!showResetConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>بازنشانی به قالب‌ها و داده‌های اولیه کارخانه</span>
                </button>
              ) : (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-2">
                  <div className="text-rose-900 font-bold">
                    آیا مطمئن هستید؟ تمام داده‌ها به حالت اولیه کارخانه بازمی‌گردند.
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetDefaults}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg"
                    >
                      بله، بازنشانی شود
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(false)}
                      className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg"
                    >
                      انصراف
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs"
            >
              ذخیره تنظیمات
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
