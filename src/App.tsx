import React, { useState, useEffect, useRef } from 'react';
import {
  Modality,
  Doctor,
  Typist,
  MedicalTemplate,
  MedicalShortcut,
  MedicalReport,
  ReportRevision,
  PatientInfo,
  AppSettings,
  ReportStudy,
  CustomFont,
  PatientWorkspaceTab,
} from './types';
import { StorageService } from './services/storage';
import { IndexedDbService } from './services/indexedDbStorage';
import { AiService } from './services/aiService';
import { Navbar } from './components/Navbar';
import { PatientTabsBar } from './components/PatientTabsBar';
import { PatientHeader } from './components/PatientHeader';
import { EditorToolbar } from './components/EditorToolbar';
import { RichMedicalEditor } from './components/RichMedicalEditor';
import { TemplateDrawer } from './components/TemplateDrawer';
import { CloneTemplateModal } from './components/CloneTemplateModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { DoctorManagementModal } from './components/DoctorManagementModal';
import { TypistAnalyticsModal } from './components/TypistAnalyticsModal';
import { PrintPreviewModal } from './components/PrintPreviewModal';
import { ReportHistoryDrawer } from './components/ReportHistoryDrawer';
import { SettingsModal } from './components/SettingsModal';
import { FontManagerModal } from './components/FontManagerModal';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { PlusCircle, X, Check, Printer, Search } from 'lucide-react';
import {
  stripSpellHighlights,
  createSlotHtml,
  autoWrapNumbersAsSlotsInHtml,
  getRadiologyTablePresetHtml,
  detectGenderAnatomyMismatch,
  detectGenderFromPersianName,
  sanitizeHtmlForPatientGender,
  incrementAdmissionNumber,
} from './services/typistUtils';

function createDefaultStudy(slotsEnabled: boolean, mod: Modality = 'sonography'): ReportStudy {
  const rawFindings = `<p><strong>کبد:</strong> دارای ابعاد و لبه‌های طبیعی است (اسپن ۱۴۲ میلی‌متر). اکوپترن پارانشیم هموژن و یکنواخت بوده و شواهدی از کبد چرب یا ضایعه فضاگیر دیده نمی‌شود.</p>
<p><strong>کیسه صفرا و مجاری:</strong> کیسه صفرا دارای اتساع خوب و جدار نازک است. سنگ یا لجن صفراوی رویت نشد. مجرای مشترک صفراوی (CBD = ۴ میلی‌متر) کالیبر نرمال دارد.</p>
<p><strong>طحال:</strong> ابعاد و اکوی طبیعی دارد (طول ۱۰۵ میلی‌متر).</p>
<p><strong>کلیه‌ها:</strong> هر دو کلیه دارای موقعیت، اندازه و ضخامت کورتیکال طبیعی می‌باشند (طول کلیه راست ۱۱۰ میلی‌متر و کلیه چپ ۱۱۲ میلی‌متر، ضخامت کورتکس ۱۴ میلی‌متر). تصویری از سنگ یا هیدرونفروز مشاهده نشد.</p>
<p><strong>مثانه و لگن:</strong> مثانه با حجم مناسب و جدار صاف رویت شد. مایع آزاد در پریتون و کل‌دوساک خلفی مشهود نیست.</p>`;

  return {
    id: `study-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    modality: mod,
    titleAndTechnique:
      'سونوگرافی کامل شکم و لگن با پروب کانوکس ۳.۵ مگاهرتز با رعایت شرایط ناشتایی بیمار انجام شد.',
    findingsHtml: slotsEnabled
      ? autoWrapNumbersAsSlotsInHtml(rawFindings).updatedHtml
      : rawFindings,
    showComparison: false,
    comparison: '',
    showImpression: false,
    impressionHtml: `<p><strong>نتیجه‌گیری:</strong></p><ul><li>بررسی سونوگرافی شکم و لگن در حد نرمال فیزیولوژیک سن بیمار می‌باشد (Unremarkable Exam).</li><li>شواهدی از سنگ صفرا، سنگ کلیه یا کبد چرب رویت نشد.</li></ul>`,
    showRecommendations: false,
    recommendationsHtml: '',
  };
}

export default function App() {
  // System Data
  const [doctors, setDoctors] = useState<Doctor[]>(() => StorageService.getDoctors());
  const [typists, setTypists] = useState<Typist[]>(() => StorageService.getTypists());
  const [templates, setTemplates] = useState<MedicalTemplate[]>(() => StorageService.getTemplates());
  const [shortcuts, setShortcuts] = useState<MedicalShortcut[]>(() => StorageService.getShortcuts());
  const [savedReports, setSavedReports] = useState<MedicalReport[]>(() => StorageService.getSavedReports());
  const [settings, setSettings] = useState<AppSettings>(() => StorageService.getSettings());

  // Multi-Patient Open Workspace Tabs (Option 5)
  const [workspaceTabs, setWorkspaceTabs] = useState<PatientWorkspaceTab[]>(() => {
    const saved = StorageService.getOpenTabs();
    if (saved && saved.length > 0) return saved;
    const initSettings = StorageService.getSettings();
    const firstTab: PatientWorkspaceTab = {
      id: 'tab-1',
      patientInfo: {
        fullName: '',
        nationalId: '',
        age: '',
        gender: 'female',
        admissionNumber: `ADM-${Math.floor(1000 + Math.random() * 9000)}`,
        reportDate: new Intl.DateTimeFormat('fa-IR-u-nu-latn').format(new Date()),
        referringPhysician: '',
      },
      studies: [createDefaultStudy(Boolean(initSettings.numberSlotsEnabled), 'sonography')],
      modality: 'sonography',
      doctorId: initSettings.activeDoctorId || 'doc-1',
      typistId: initSettings.activeTypistId || 'typ-1',
      status: 'draft',
      updatedAt: new Date().toISOString(),
    };
    return [firstTab];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    const saved = StorageService.getOpenTabs();
    return saved && saved.length > 0 ? saved[0].id : 'tab-1';
  });

  // Active Modality, Doctor & Typist
  const [modality, setModality] = useState<Modality>(() => {
    const saved = StorageService.getOpenTabs();
    return saved && saved.length > 0 ? saved[0].modality : 'sonography';
  });
  const [activeDoctorId, setActiveDoctorId] = useState<string>(() => {
    const saved = StorageService.getOpenTabs();
    return (
      (saved && saved.length > 0 ? saved[0].doctorId : StorageService.getSettings().activeDoctorId) ||
      'doc-1'
    );
  });
  const [activeTypistId, setActiveTypistId] = useState<string>(() => {
    return StorageService.getSettings().activeTypistId || StorageService.getTypists()[0]?.id || 'typ-1';
  });
  const [editorZoom, setEditorZoom] = useState<number>(100);

  // Patient Demographics
  const [patientInfo, setPatientInfo] = useState<PatientInfo>(() => {
    const saved = StorageService.getOpenTabs();
    if (saved && saved.length > 0) return saved[0].patientInfo;
    return {
      fullName: '',
      nationalId: '',
      age: '',
      gender: 'female',
      admissionNumber: `ADM-${Math.floor(1000 + Math.random() * 9000)}`,
      reportDate: new Intl.DateTimeFormat('fa-IR-u-nu-latn').format(new Date()),
      referringPhysician: '',
    };
  });

  // Studies State (Multiple Imaging Studies per Patient)
  const [studies, setStudies] = useState<ReportStudy[]>(() => {
    const saved = StorageService.getOpenTabs();
    if (saved && saved.length > 0 && saved[0].studies.length > 0) return saved[0].studies;
    return [createDefaultStudy(Boolean(StorageService.getSettings().numberSlotsEnabled), 'sonography')];
  });

  const [criticalAlert, setCriticalAlert] = useState<string | undefined>();
  const [activeDirection, setActiveDirection] = useState<'rtl' | 'ltr'>('rtl');

  // Network Online/Offline state
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // In-App Toast System
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Target Study ID & Mode for Template Drawer
  const [targetStudyIdForTemplate, setTargetStudyIdForTemplate] = useState<string>('study-1');
  const [templateDrawerMode, setTemplateDrawerMode] = useState<'replace' | 'add-new'>('replace');

  // Modals & Drawers state
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [shortcutsModalOrganFilter, setShortcutsModalOrganFilter] = useState<string>('all');
  const [isDoctorsOpen, setIsDoctorsOpen] = useState(false);
  const [isTypistAnalyticsOpen, setIsTypistAnalyticsOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFontManagerOpen, setIsFontManagerOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [cloneTargetTemplate, setCloneTargetTemplate] = useState<MedicalTemplate | null>(null);

  // New Report Confirmation Modal
  const [isNewReportModalOpen, setIsNewReportModalOpen] = useState(false);

  // Quick Template Title Picker Modal when clicking "+" (New Patient Tab)
  const [isNewTabTemplatePickerOpen, setIsNewTabTemplatePickerOpen] = useState(false);
  const [newTabPickerModality, setNewTabPickerModality] = useState<Modality | 'all'>('all');
  const [newTabPickerSearch, setNewTabPickerSearch] = useState('');
  const [newTabPatientName, setNewTabPatientName] = useState('');
  const [newTabPickerSortBy, setNewTabPickerSortBy] = useState<'usage' | 'alphabetical'>('usage');
  const [selectedNewTabTemplates, setSelectedNewTabTemplates] = useState<MedicalTemplate[]>([]);

  // Create Template Modal (1-step direct from editor or drawer)
  const [isCreateTemplateModalOpen, setIsCreateTemplateModalOpen] = useState(false);
  const [newTemplateTitleInput, setNewTemplateTitleInput] = useState('');
  const [newTemplateDoctorId, setNewTemplateDoctorId] = useState<string>('all');

  // Voice Dictation & Zen Mode
  const [isListening, setIsListening] = useState(false);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Apply UI font family globally to documentElement (--ui-font-family) so all modals, menus, and panels adopt it
  useEffect(() => {
    const chosenUiFont = settings.uiFont || "'Vazirmatn', sans-serif";
    document.documentElement.style.setProperty('--ui-font-family', chosenUiFont);
  }, [settings.uiFont]);

  // Dynamically apply Ambient Modality Theme CSS variables (--modality-accent) across the workspace
  useEffect(() => {
    const defaultHex: Record<Modality, string> = {
      sonography: '#0284c7',
      mri: '#4f46e5',
      ct: '#059669',
    };
    const hex = settings.modalityColors?.[modality] || defaultHex[modality] || '#0284c7';
    document.documentElement.style.setProperty('--modality-accent', hex);
    document.documentElement.style.setProperty('--modality-accent-soft', `${hex}14`);
    document.documentElement.style.setProperty('--modality-accent-border', `${hex}45`);
    document.documentElement.style.setProperty('--modality-accent-glow', `${hex}30`);
  }, [modality, settings.modalityColors]);

  // Global Ctrl+K / Cmd+K shortcut for Spotlight Command Palette
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Sync with IndexedDB multi-GB storage engine, SQLite LAN Server & Automated Local Folder Backup
  useEffect(() => {
    IndexedDbService.syncWithLocalStorage().then((res) => {
      if (res.restoredFromIdb) {
        setSavedReports(StorageService.getSavedReports());
      }
    });
    if (settings.lanSyncEnabled) {
      IndexedDbService.syncWithLanServer().then((res) => {
        if (res.ok) {
          setSavedReports(StorageService.getSavedReports());
          setTemplates(StorageService.getTemplates());
          setDoctors(StorageService.getDoctors());
          setTypists(StorageService.getTypists());
          setShortcuts(StorageService.getShortcuts());
        }
      });
    }
    if (settings.autoFolderBackupEnabled) {
      IndexedDbService.writeBackupToSelectedFolder();
    }
  }, [savedReports.length, templates.length, settings.lanSyncEnabled, settings.autoFolderBackupEnabled]);

  // Automated nightly / end-of-shift & page-close local folder backup (File System Access API)
  useEffect(() => {
    if (!settings.autoFolderBackupEnabled) return;

    const handleVisibilityOrUnload = () => {
      if (document.visibilityState === 'hidden') {
        IndexedDbService.writeBackupToSelectedFolder();
      }
    };
    const dailyTimer = window.setInterval(() => {
      IndexedDbService.writeBackupToSelectedFolder();
    }, 15 * 60 * 1000); // Check/update daily backup file every 15 minutes during shift

    document.addEventListener('visibilitychange', handleVisibilityOrUnload);
    window.addEventListener('pagehide', handleVisibilityOrUnload);
    return () => {
      window.clearInterval(dailyTimer);
      document.removeEventListener('visibilitychange', handleVisibilityOrUnload);
      window.removeEventListener('pagehide', handleVisibilityOrUnload);
    };
  }, [settings.autoFolderBackupEnabled]);

  // Active Editor Element reference & Saved Selection Range for document.execCommand
  const activeEditorRef = useRef<HTMLDivElement | null>(null);
  const savedSelectionRangeRef = useRef<Range | null>(null);

  // Track selection inside active editor so toolbar commands (color, highlight, etc.) never lose selection
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (
        sel &&
        sel.rangeCount > 0 &&
        activeEditorRef.current &&
        activeEditorRef.current.contains(sel.anchorNode)
      ) {
        savedSelectionRangeRef.current = sel.getRangeAt(0).cloneRange();
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  // Online status listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Web Speech API initialization
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setHasSpeechSupport(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'fa-IR';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          insertTextAtCursor(` ${finalTranscript} `);
        }
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Speech start error', err);
      }
    }
  };

  // Sync current active patient's state into workspaceTabs & localStorage
  useEffect(() => {
    setWorkspaceTabs((prev) => {
      const next = prev.map((t) =>
        t.id === activeTabId
          ? {
              ...t,
              patientInfo,
              studies,
              modality,
              doctorId: activeDoctorId,
              updatedAt: new Date().toISOString(),
            }
          : t
      );
      StorageService.saveOpenTabs(next);
      return next;
    });
  }, [patientInfo, studies, modality, activeDoctorId, activeTabId]);

  // Dynamic Sticky Header & Toolbars Height Measurement (Prevents TabsBar, EditorToolbar & Quickbar from sliding under Navbar)
  useEffect(() => {
    const updateStickyOffsets = () => {
      const navEl = document.getElementById('app-main-navbar');
      const tabsbarEl = document.getElementById('app-patient-tabs-bar');
      const toolbarEl = document.getElementById('app-editor-toolbar');
      const quickbarEl = document.getElementById('app-editor-quickbar');

      const navH = navEl ? Math.round(navEl.getBoundingClientRect().height) : 102;
      const tabsbarH = zenMode
        ? 0
        : tabsbarEl
        ? Math.round(tabsbarEl.getBoundingClientRect().height)
        : 44;
      const toolbarH = toolbarEl ? Math.round(toolbarEl.getBoundingClientRect().height) : 46;
      const quickbarH = quickbarEl ? Math.round(quickbarEl.getBoundingClientRect().height) : 96;

      document.documentElement.style.setProperty('--navbar-height', `${navH}px`);
      document.documentElement.style.setProperty('--tabsbar-height', `${tabsbarH}px`);
      document.documentElement.style.setProperty('--toolbar-height', `${toolbarH}px`);
      document.documentElement.style.setProperty('--quickbar-height', `${quickbarH}px`);
    };

    updateStickyOffsets();
    window.addEventListener('resize', updateStickyOffsets);

    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => updateStickyOffsets())
        : null;

    const navEl = document.getElementById('app-main-navbar');
    const tabsbarEl = document.getElementById('app-patient-tabs-bar');
    const toolbarEl = document.getElementById('app-editor-toolbar');
    const quickbarEl = document.getElementById('app-editor-quickbar');

    if (observer) {
      if (navEl) observer.observe(navEl);
      if (tabsbarEl) observer.observe(tabsbarEl);
      if (toolbarEl) observer.observe(toolbarEl);
      if (quickbarEl) observer.observe(quickbarEl);
    }

    return () => {
      window.removeEventListener('resize', updateStickyOffsets);
      if (observer) observer.disconnect();
    };
  }, [studies.length, templates.length, modality, workspaceTabs.length, zenMode]);

  // 30-Second Dirty-Check Temporary Auto-Draft System in localStorage (Crash & Sudden Browser Close Protection)
  const currentDraftPayload = JSON.stringify({
    patientInfo,
    studies,
    modality,
    doctorId: activeDoctorId,
    activeTabId,
  });
  const latestDraftDataRef = useRef({
    patientInfo,
    studies,
    modality,
    doctorId: activeDoctorId,
    activeTabId,
    payload: currentDraftPayload,
  });
  const lastSavedDraftHashRef = useRef<string>(currentDraftPayload);
  const [hasUnsavedDraftChanges, setHasUnsavedDraftChanges] = useState<boolean>(false);
  const [lastAutoDraftTime, setLastAutoDraftTime] = useState<string>(() =>
    new Intl.DateTimeFormat('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date())
  );
  const [recoverableDraft, setRecoverableDraft] = useState<any | null>(() => {
    const savedDraft = StorageService.getDraft();
    if (savedDraft && savedDraft.studies && Array.isArray(savedDraft.studies) && savedDraft.studies.length > 0) {
      const openTabs = StorageService.getOpenTabs();
      const firstOpen = openTabs && openTabs[0];
      const draftJson = JSON.stringify(savedDraft.studies);
      const currentJson = firstOpen ? JSON.stringify(firstOpen.studies) : '';
      if (draftJson !== currentJson && savedDraft.savedAt) {
        return savedDraft;
      }
    }
    return null;
  });

  // Track changes to mark report as dirty for the next 30-second auto-draft cycle
  useEffect(() => {
    latestDraftDataRef.current = {
      patientInfo,
      studies,
      modality,
      doctorId: activeDoctorId,
      activeTabId,
      payload: currentDraftPayload,
    };
    if (currentDraftPayload !== lastSavedDraftHashRef.current) {
      setHasUnsavedDraftChanges(true);
    }
  }, [currentDraftPayload, patientInfo, studies, modality, activeDoctorId, activeTabId]);

  // Run 30-second interval timer: only saves to localStorage if text/report changed since last save
  useEffect(() => {
    const saveTemporaryDraftNow = () => {
      const current = latestDraftDataRef.current;
      if (current.payload !== lastSavedDraftHashRef.current) {
        const nowIso = new Date().toISOString();
        const timeFormatted = new Intl.DateTimeFormat('fa-IR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(new Date());

        StorageService.saveDraft({
          patientInfo: current.patientInfo,
          studies: current.studies,
          modality: current.modality,
          doctorId: current.doctorId,
          activeTabId: current.activeTabId,
          savedAt: nowIso,
          savedTimeFormatted: timeFormatted,
        });

        lastSavedDraftHashRef.current = current.payload;
        setHasUnsavedDraftChanges(false);
        setLastAutoDraftTime(timeFormatted);
      }
    };

    const intervalId = window.setInterval(saveTemporaryDraftNow, 30000);

    // Also flush immediately if browser/tab is suddenly closed while dirty
    const handleBeforeUnload = () => {
      saveTemporaryDraftNow();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const handleRestoreTemporaryDraft = () => {
    if (!recoverableDraft) return;
    if (recoverableDraft.patientInfo) setPatientInfo(recoverableDraft.patientInfo);
    if (recoverableDraft.studies && recoverableDraft.studies.length > 0) {
      setStudies(recoverableDraft.studies);
    }
    if (recoverableDraft.modality) setModality(recoverableDraft.modality);
    if (recoverableDraft.doctorId) setActiveDoctorId(recoverableDraft.doctorId);
    setRecoverableDraft(null);
    showToast('✓ پیش‌نویس موقت ذخیره‌شده با موفقیت بازیابی شد.');
  };

  const handleDismissTemporaryDraft = () => {
    setRecoverableDraft(null);
    StorageService.clearDraft();
  };

  // Switch between open patient tabs (0ms instant switch)
  const handleSelectWorkspaceTab = (tabId: string) => {
    const target = workspaceTabs.find((t) => t.id === tabId);
    if (!target) return;
    setActiveTabId(target.id);
    setPatientInfo(target.patientInfo);
    setStudies(target.studies);
    setModality(target.modality);
    setActiveDoctorId(target.doctorId);
    setTargetStudyIdForTemplate(target.studies[0]?.id || '');
  };

  // Open the Quick Template Title Picker when clicking "+" (New Patient Tab)
  // Default to the currently active modality so the typist immediately sees templates of the active modality
  const handleAddNewPatientTab = () => {
    setNewTabPickerModality(modality);
    setNewTabPickerSearch('');
    setNewTabPatientName('');
    setSelectedNewTabTemplates([]);
    setIsNewTabTemplatePickerOpen(true);
  };

  // Update patient name directly from a tab pill in PatientTabsBar
  const handleUpdateTabPatientName = (tabId: string, newName: string) => {
    const detectedGender = detectGenderFromPersianName(newName);
    setWorkspaceTabs((prev) => {
      const updated = prev.map((t) => {
        if (t.id !== tabId) return t;
        return {
          ...t,
          patientInfo: {
            ...t.patientInfo,
            fullName: newName,
            ...(detectedGender ? { gender: detectedGender } : {}),
          },
          updatedAt: new Date().toISOString(),
        };
      });
      StorageService.saveOpenTabs(updated);
      return updated;
    });

    if (tabId === activeTabId) {
      setPatientInfo((prev) => ({
        ...prev,
        fullName: newName,
        ...(detectedGender ? { gender: detectedGender } : {}),
      }));
    }
  };

  // Toggle selecting/deselecting a template in the New Patient Tab multi-picker
  const toggleSelectTemplateForNewTab = (tpl: MedicalTemplate) => {
    setSelectedNewTabTemplates((prev) => {
      const exists = prev.some((item) => item.id === tpl.id);
      if (exists) {
        return prev.filter((item) => item.id !== tpl.id);
      }
      return [...prev, tpl];
    });
  };

  // Finalize creating the new patient tab with one or multiple chosen templates (or a blank study)
  const finalizeCreateNewPatientTab = (chosenTemplates?: MedicalTemplate[]) => {
    const nextAdm = incrementAdmissionNumber(patientInfo.admissionNumber);
    const list = chosenTemplates && chosenTemplates.length > 0 ? chosenTemplates : [];
    const chosenMod = list.length > 0 ? list[0].modality : modality;

    let initialStudies: ReportStudy[];
    if (list.length > 0) {
      let updatedTpls = templates;
      list.forEach((tpl) => {
        updatedTpls = StorageService.incrementTemplateUsage(tpl.id);
      });
      setTemplates(updatedTpls);

      initialStudies = list.map((tpl, idx) => {
        const processedFindings = settings.numberSlotsEnabled
          ? autoWrapNumbersAsSlotsInHtml(tpl.findingsHtml).updatedHtml
          : stripSpellHighlights(tpl.findingsHtml, true);

        return {
          id: `study-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
          modality: tpl.modality,
          titleAndTechnique: tpl.title + (tpl.technique ? ` - ${tpl.technique}` : ''),
          findingsHtml: processedFindings,
          showComparison: false,
          comparison: tpl.comparison || '',
          showImpression: false,
          impressionHtml: tpl.impressionHtml || '',
          showRecommendations: false,
          recommendationsHtml: tpl.recommendationsHtml || '',
        };
      });
    } else {
      initialStudies = [
        {
          id: `study-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          modality: chosenMod,
          titleAndTechnique: `گزارش تصویربرداری (${
            chosenMod === 'mri' ? 'ام‌آر‌آی' : chosenMod === 'ct' ? 'سی‌تی‌اسکن' : 'سونوگرافی'
          })`,
          findingsHtml: '<p></p>',
          showComparison: false,
          comparison: '',
          showImpression: false,
          impressionHtml: '',
          showRecommendations: false,
          recommendationsHtml: '',
        },
      ];
    }

    const firstTemplateDocId = list[0]?.doctorId;
    const trimmedNewName = newTabPatientName.trim();
    const detectedNewGender = detectGenderFromPersianName(trimmedNewName);

    const newTab: PatientWorkspaceTab = {
      id: `tab-${Date.now()}`,
      patientInfo: {
        fullName: trimmedNewName,
        nationalId: '',
        age: '',
        gender: detectedNewGender || 'female',
        admissionNumber: nextAdm,
        reportDate: new Intl.DateTimeFormat('fa-IR-u-nu-latn').format(new Date()),
        referringPhysician: '',
      },
      studies: initialStudies,
      modality: chosenMod,
      doctorId:
        firstTemplateDocId && firstTemplateDocId !== 'all'
          ? firstTemplateDocId
          : activeDoctorId,
      status: 'draft',
      updatedAt: new Date().toISOString(),
    };

    const nextTabs = [...workspaceTabs, newTab];
    setWorkspaceTabs(nextTabs);
    StorageService.saveOpenTabs(nextTabs);
    setActiveTabId(newTab.id);
    setPatientInfo(newTab.patientInfo);
    setStudies(newTab.studies);
    setModality(newTab.modality);
    setActiveDoctorId(newTab.doctorId);
    setTargetStudyIdForTemplate(initialStudies[0].id);
    setSelectedNewTabTemplates([]);
    setNewTabPatientName('');
    setIsNewTabTemplatePickerOpen(false);
    showToast(
      list.length > 1
        ? `تب بیمار جدید با ${list.length} بررسی انتخابی آماده تایپ شد.`
        : list.length === 1
        ? `تب بیمار جدید با قالب «${list[0].title}» آماده تایپ شد.`
        : `تب بیمار جدید (${nextAdm}) باز شد.`
    );
  };

  // Duplicate active patient tab
  const handleDuplicateActiveTab = () => {
    const nextAdm = incrementAdmissionNumber(patientInfo.admissionNumber);
    const clonedStudies = studies.map((s) => ({
      ...s,
      id: `study-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    }));
    const newTab: PatientWorkspaceTab = {
      id: `tab-${Date.now()}`,
      patientInfo: {
        ...patientInfo,
        admissionNumber: nextAdm,
      },
      studies: clonedStudies,
      modality,
      doctorId: activeDoctorId,
      status: 'draft',
      updatedAt: new Date().toISOString(),
    };
    const nextTabs = [...workspaceTabs, newTab];
    setWorkspaceTabs(nextTabs);
    StorageService.saveOpenTabs(nextTabs);
    setActiveTabId(newTab.id);
    setPatientInfo(newTab.patientInfo);
    setStudies(newTab.studies);
    setTargetStudyIdForTemplate(clonedStudies[0]?.id || '');
    showToast('کپی از پرونده فعلی در تب جدید ایجاد شد.');
  };

  // Close an open patient tab
  const handleCloseWorkspaceTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (workspaceTabs.length <= 1) return;
    const idx = workspaceTabs.findIndex((t) => t.id === tabId);
    const nextTabs = workspaceTabs.filter((t) => t.id !== tabId);
    setWorkspaceTabs(nextTabs);
    StorageService.saveOpenTabs(nextTabs);

    if (tabId === activeTabId) {
      const fallback = nextTabs[Math.max(0, idx - 1)] || nextTabs[0];
      setActiveTabId(fallback.id);
      setPatientInfo(fallback.patientInfo);
      setStudies(fallback.studies);
      setModality(fallback.modality);
      setActiveDoctorId(fallback.doctorId);
      setTargetStudyIdForTemplate(fallback.studies[0]?.id || '');
    }
    showToast('تب بیمار بسته شد.');
  };

  // Keyboard shortcuts for switching tabs (Alt+1..9) and opening a new tab (Alt+N)
  useEffect(() => {
    const handleTabShortcuts = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'n' || e.key === 'N' || e.key === 'د')) {
        e.preventDefault();
        handleAddNewPatientTab();
        return;
      }
      if (e.altKey && /^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (workspaceTabs[idx]) {
          e.preventDefault();
          handleSelectWorkspaceTab(workspaceTabs[idx].id);
        }
      }
    };
    window.addEventListener('keydown', handleTabShortcuts);
    return () => window.removeEventListener('keydown', handleTabShortcuts);
  });

  // Real-Time Gender-Anatomy Mismatch Detection (Option 3)
  const genderMismatch = detectGenderAnatomyMismatch(
    patientInfo.gender,
    studies.map((s) => `${s.titleAndTechnique} ${s.findingsHtml} ${s.showImpression ? s.impressionHtml : ''}`)
  );

  const handleSanitizeGenderMismatch = () => {
    setStudies((prev) =>
      prev.map((s) => ({
        ...s,
        findingsHtml: sanitizeHtmlForPatientGender(s.findingsHtml, patientInfo.gender),
        impressionHtml: sanitizeHtmlForPatientGender(s.impressionHtml, patientInfo.gender),
      }))
    );
    showToast(
      `✓ عبارات نامرتبط با جنسیت (${patientInfo.gender === 'male' ? 'آقا' : 'خانم'}) به صورت خودکار اصلاح شد.`
    );
  };

  // Critical findings background check (debounced)
  useEffect(() => {
    const timer = setTimeout(async () => {
      const allFindings = studies
        .map((s) => s.findingsHtml + ' ' + (s.showImpression ? s.impressionHtml : ''))
        .join(' ')
        .replace(/<[^>]+>/g, ' ');

      const res = await AiService.checkCriticalFindings(allFindings, modality);
      if (res.hasCritical) {
        setCriticalAlert(res.criticalAlert);
      } else {
        setCriticalAlert(undefined);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [studies, modality]);

  // Execute formatting commands on active editor (preserving selection range & syncing state)
  const handleExecCommand = (command: string, value?: string) => {
    const editorEl = activeEditorRef.current;
    if (editorEl) {
      editorEl.focus();
      const sel = window.getSelection();
      if (
        savedSelectionRangeRef.current &&
        sel &&
        (!sel.rangeCount || !editorEl.contains(sel.anchorNode))
      ) {
        try {
          sel.removeAllRanges();
          sel.addRange(savedSelectionRangeRef.current);
        } catch {}
      }
    }

    try {
      document.execCommand('styleWithCSS', false, 'true');
    } catch {}

    if (command === 'hiliteColor' && value === 'transparent') {
      document.execCommand('hiliteColor', false, 'transparent');
      document.execCommand('backColor', false, 'transparent');
      // Also clean up any inline background-color on spans within current selection
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editorEl) {
        const range = sel.getRangeAt(0);
        const container =
          range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
            ? (range.commonAncestorContainer as HTMLElement)
            : range.commonAncestorContainer.parentElement;
        if (container && editorEl.contains(container)) {
          if (container !== editorEl && container.style?.backgroundColor) {
            container.style.backgroundColor = '';
          }
          container.querySelectorAll<HTMLElement>('[style*="background-color"]').forEach((node) => {
            if (sel.containsNode(node, true)) {
              node.style.backgroundColor = '';
            }
          });
        }
      }
    } else if (command === 'hiliteColor' && value) {
      const ok = document.execCommand('hiliteColor', false, value);
      if (!ok) {
        document.execCommand('backColor', false, value);
      }
    } else {
      document.execCommand(command, false, value);
    }

    if (editorEl) {
      editorEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  const handleFormatBlock = (tag: string) => {
    handleExecCommand('formatBlock', tag);
  };

  const insertTextAtCursor = (text: string) => {
    if (!activeEditorRef.current) return;
    activeEditorRef.current.focus();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const node = document.createTextNode(text);
      range.insertNode(node);
      range.setStartAfter(node);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      activeEditorRef.current.innerHTML += text;
    }
  };

  // Sync existing studies if user enables or disables Smart Number Slots in Settings
  useEffect(() => {
    setStudies((prev) =>
      prev.map((s) => {
        if (settings.numberSlotsEnabled) {
          return {
            ...s,
            findingsHtml: autoWrapNumbersAsSlotsInHtml(s.findingsHtml).updatedHtml,
          };
        } else {
          return {
            ...s,
            findingsHtml: stripSpellHighlights(s.findingsHtml, true),
          };
        }
      })
    );
  }, [settings.numberSlotsEnabled]);

  const handleInsertTable = (rows: number, cols: number, withHeader = true) => {
    let tableHtml = `<table style="width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; direction: rtl;">`;
    if (withHeader) {
      tableHtml += `<thead><tr style="background-color: #f0fdfa;">`;
      for (let c = 0; c < cols; c++) {
        tableHtml += `<th style="padding: 8px 10px; text-align: center; border: 1px solid #99f6e4; color: #0f766e; font-weight: 800;">ستون ${c + 1}</th>`;
      }
      tableHtml += `</tr></thead>`;
    }
    tableHtml += `<tbody>`;
    for (let r = 0; r < rows; r++) {
      tableHtml += `<tr>`;
      for (let c = 0; c < cols; c++) {
        const cellContent = settings.numberSlotsEnabled
          ? createSlotHtml(`ردیف ${r + 1} ستون ${c + 1}`, '---')
          : '---';
        tableHtml += `<td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: center;">${cellContent}</td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table><p></p>`;

    if (activeEditorRef.current) {
      activeEditorRef.current.focus();
      document.execCommand('insertHTML', false, tableHtml);
      const activeId = targetStudyIdForTemplate || studies[0]?.id;
      if (activeId) {
        handleUpdateStudy(activeId, { findingsHtml: activeEditorRef.current.innerHTML });
      }
    }
    showToast(`جدول ${rows}×${cols} در گزارش درج شد.`);
  };

  const handleInsertPresetTable = (presetId: 'kidneys' | 'thyroid' | 'fetal' | 'pelvis' | 'lesions') => {
    const rawTableHtml = getRadiologyTablePresetHtml(presetId);
    const tableHtml = settings.numberSlotsEnabled
      ? rawTableHtml
      : stripSpellHighlights(rawTableHtml, true);
    if (activeEditorRef.current) {
      activeEditorRef.current.focus();
      document.execCommand('insertHTML', false, tableHtml);
      const activeId = targetStudyIdForTemplate || studies[0]?.id;
      if (activeId) {
        handleUpdateStudy(activeId, { findingsHtml: activeEditorRef.current.innerHTML });
      }
    }
    showToast('جدول تخصصی پرتوپزشکی در گزارش درج شد.');
  };

  const handleInsertSymbol = (sym: string) => {
    insertTextAtCursor(` ${sym} `);
  };

  const handleFindReplace = (find: string, replace: string, replaceAll: boolean) => {
    if (!find || !activeEditorRef.current) return;
    const html = activeEditorRef.current.innerHTML;
    if (replaceAll) {
      const regex = new RegExp(find, 'g');
      activeEditorRef.current.innerHTML = html.replace(regex, replace);
    } else {
      activeEditorRef.current.innerHTML = html.replace(find, replace);
    }
  };

  // Word count across all studies
  const allPlainFindings = studies
    .map((s) => s.findingsHtml.replace(/<[^>]+>/g, ' '))
    .join(' ')
    .trim();
  const wordCount = allPlainFindings ? allPlainFindings.split(/\s+/).length : 0;
  const charCount = allPlainFindings.length;

  // Study management
  const handleUpdateStudy = (studyId: string, updates: Partial<ReportStudy>) => {
    setStudies((prev) =>
      prev.map((s) => (s.id === studyId ? { ...s, ...updates } : s))
    );
  };

  const handleAddStudy = (mod: Modality = modality) => {
    const modTitle =
      mod === 'mri' ? 'ام‌آر‌آی' : mod === 'ct' ? 'سی‌تی‌اسکن' : 'سونوگرافی';

    setModality(mod);
    setTemplateDrawerMode('add-new');
    setIsTemplatesOpen(true);
    showToast(`قالب آماده مورد نظر برای افزودن بررسی جدید (${modTitle}) را انتخاب نمایید.`);
  };

  const handleRemoveStudy = (studyId: string) => {
    if (studies.length <= 1) return;
    setStudies((prev) => prev.filter((s) => s.id !== studyId));
    showToast('تصویربرداری حذف شد.');
  };

  // Apply template to target study (wrapping numbers in slots only if numberSlotsEnabled is enabled in Settings)
  const applyTemplateToTargetStudy = (template: MedicalTemplate, append = false) => {
    const updatedTemplates = StorageService.incrementTemplateUsage(template.id);
    setTemplates(updatedTemplates);

    const processedFindings = settings.numberSlotsEnabled
      ? autoWrapNumbersAsSlotsInHtml(template.findingsHtml).updatedHtml
      : stripSpellHighlights(template.findingsHtml, true);

    setStudies((prev) => {
      const targetIndex = prev.findIndex((s) => s.id === targetStudyIdForTemplate);
      const idx = targetIndex >= 0 ? targetIndex : 0;
      const target = prev[idx];

      if (append) {
        const updated = {
          ...target,
          findingsHtml: target.findingsHtml + '<br/>' + processedFindings,
          impressionHtml: template.impressionHtml
            ? target.impressionHtml + '<br/>' + template.impressionHtml
            : target.impressionHtml,
        };
        const next = [...prev];
        next[idx] = updated;
        return next;
      } else {
        const updated: ReportStudy = {
          ...target,
          modality: template.modality,
          titleAndTechnique: template.title + (template.technique ? ` - ${template.technique}` : ''),
          findingsHtml: processedFindings,
          showComparison: false,
          comparison: template.comparison || '',
          showImpression: false,
          impressionHtml: template.impressionHtml || '',
          showRecommendations: false,
          recommendationsHtml: template.recommendationsHtml || '',
        };
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
    });

    showToast(`قالب «${template.title}» اعمال شد.`);
  };

  // Add template as a brand new study
  const handleAddTemplateAsNewStudy = (template: MedicalTemplate) => {
    const updatedTemplates = StorageService.incrementTemplateUsage(template.id);
    setTemplates(updatedTemplates);

    const processedFindings = settings.numberSlotsEnabled
      ? autoWrapNumbersAsSlotsInHtml(template.findingsHtml).updatedHtml
      : stripSpellHighlights(template.findingsHtml, true);
    const newStudy: ReportStudy = {
      id: `study-${Date.now()}`,
      modality: template.modality,
      titleAndTechnique: template.title + (template.technique ? ` - ${template.technique}` : ''),
      findingsHtml: processedFindings,
      showComparison: false,
      comparison: template.comparison || '',
      showImpression: false,
      impressionHtml: template.impressionHtml || '',
      showRecommendations: false,
      recommendationsHtml: template.recommendationsHtml || '',
    };
    setStudies((prev) => [...prev, newStudy]);
    showToast(`قالب «${template.title}» به عنوان تصویربرداری جدید افزوده شد.`);
  };

  // Modality change handler (updates first study or active study)
  const handleSelectModality = (newModality: Modality) => {
    setModality(newModality);
    // Find first template for new modality
    const matchingTemplate =
      templates.find((t) => t.modality === newModality && (t.doctorId === activeDoctorId || t.doctorId === 'all')) ||
      templates.find((t) => t.modality === newModality);

    if (matchingTemplate && studies.length > 0) {
      applyTemplateToTargetStudy(matchingTemplate, false);
    }
  };

  // New report action (in-app modal)
  const confirmNewReport = () => {
    setPatientInfo({
      fullName: '',
      nationalId: '',
      age: '',
      gender: 'female',
      admissionNumber: `ADM-${Math.floor(1000 + Math.random() * 9000)}`,
      reportDate: new Intl.DateTimeFormat('fa-IR-u-nu-latn').format(new Date()),
      referringPhysician: '',
    });
    setStudies([
      {
        id: `study-${Date.now()}`,
        modality,
        titleAndTechnique: `گزارش تصویربرداری (${modality === 'mri' ? 'ام‌آر‌آی' : modality === 'ct' ? 'سی‌تی‌اسکن' : 'سونوگرافی'})`,
        findingsHtml: '<p>یافته‌های تصویربرداری...</p>',
        showComparison: false,
        comparison: '',
        showImpression: false,
        impressionHtml: '<p>نتیجه‌گیری...</p>',
        showRecommendations: false,
        recommendationsHtml: '',
      },
    ]);
    setCriticalAlert(undefined);
    setIsNewReportModalOpen(false);
    showToast('گزارش جدید ایجاد شد.');
  };

  // Proposal #12: Match current report in archive to track lock state & version history
  const matchedArchivedReport = savedReports.find(
    (r) =>
      r.patientInfo?.admissionNumber &&
      r.patientInfo.admissionNumber === patientInfo.admissionNumber &&
      r.patientInfo.reportDate === patientInfo.reportDate
  );
  const isCurrentReportLocked = Boolean(matchedArchivedReport?.isLocked);
  const currentReportRevisions: ReportRevision[] = matchedArchivedReport?.revisions || [];

  const handleUnlockReportForAddendum = () => {
    if (!matchedArchivedReport) return;
    StorageService.unlockReportForAddendum(matchedArchivedReport.id);
    setSavedReports(StorageService.getSavedReports());
    showToast(
      '🔓 قفل گزارش باز شد • نسخه چاپ‌شده قبلی در تاریخچه نسخه‌ها محافظت شد و اکنون می‌توانید اصلاحیه (Addendum) را ثبت کنید.'
    );
  };

  const handleRestoreReportRevision = (rev: ReportRevision, targetRep?: MedicalReport) => {
    const baseRep = targetRep || matchedArchivedReport;
    if (baseRep) {
      setPatientInfo(baseRep.patientInfo);
      setActiveDoctorId(baseRep.doctorId);
      if (baseRep.isLocked) {
        StorageService.unlockReportForAddendum(baseRep.id);
        setSavedReports(StorageService.getSavedReports());
      }
    }
    if (rev.studies && rev.studies.length > 0) {
      setStudies(JSON.parse(JSON.stringify(rev.studies)));
      setModality(rev.studies[0].modality);
    }
    showToast(`↺ نسخه شماره ${rev.version} (${rev.savedAtFa}) در ویرایشگر بازگردانی شد.`);
  };

  // Save report to archive (attributes to active typist; updates existing report if admissionNumber matches)
  const handleSaveReportToArchive = (silent = false) => {
    const cleanedStudies = studies.map((s) => ({
      ...s,
      findingsHtml: stripSpellHighlights(s.findingsHtml),
      impressionHtml: stripSpellHighlights(s.impressionHtml),
      recommendationsHtml: stripSpellHighlights(s.recommendationsHtml),
    }));
    const currentTyp = typists.find((t) => t.id === activeTypistId) || typists[0];
    const existingForAdmission = savedReports.find(
      (r) =>
        r.patientInfo?.admissionNumber &&
        r.patientInfo.admissionNumber === patientInfo.admissionNumber &&
        r.patientInfo.reportDate === patientInfo.reportDate
    );

    if (patientInfo.referringPhysician?.trim()) {
      StorageService.addOrIncrementReferringPhysician(patientInfo.referringPhysician.trim());
    }

    StorageService.saveReport({
      id: existingForAdmission?.id,
      studies: cleanedStudies,
      doctorId: activeDoctorId,
      typistId: currentTyp?.id || 'typ-1',
      typistName: currentTyp?.name || 'تایپیست',
      patientInfo,
      status: silent ? 'printed' : 'finalized',
      isLocked: silent ? true : false,
    });
    setSavedReports(StorageService.getSavedReports());
    setWorkspaceTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, status: silent ? 'printed' : 'saved' } : t))
    );
    if (!silent) {
      showToast(
        `✓ گزارش بیمار «${patientInfo.fullName || 'جدید'}» به نام تایپیست «${currentTyp?.name || ''}» در آرشیو و تاریخچه نسخه‌ها ثبت شد.`
      );
    }
  };

  // Load report from archive
  const handleLoadReport = (rep: MedicalReport) => {
    setPatientInfo(rep.patientInfo);
    setActiveDoctorId(rep.doctorId);
    if (rep.studies && rep.studies.length > 0) {
      setStudies(rep.studies);
      setModality(rep.studies[0].modality);
    } else {
      // Legacy report fallback
      setStudies([
        {
          id: `study-${Date.now()}`,
          modality: (rep as any).modality || 'sonography',
          titleAndTechnique: (rep as any).title || 'گزارش تصویربرداری',
          findingsHtml: (rep as any).findingsHtml || '',
          showComparison: Boolean((rep as any).comparison),
          comparison: (rep as any).comparison || '',
          showImpression: Boolean((rep as any).impressionHtml),
          impressionHtml: (rep as any).impressionHtml || '',
          showRecommendations: Boolean((rep as any).recommendationsHtml),
          recommendationsHtml: (rep as any).recommendationsHtml || '',
        },
      ]);
    }
    showToast(
      rep.isLocked
        ? '🔒 گزارش چاپ‌شده از آرشیو بارگذاری شد (در حالت محافظت از تغییر ناخواسته).'
        : 'گزارش از آرشیو بازخوانی شد.'
    );
  };

  // Clone template
  const handleCloneTemplate = (templateId: string, targetDoctorId: string, newTitle: string) => {
    StorageService.cloneTemplateToDoctor(templateId, targetDoctorId, newTitle);
    setTemplates(StorageService.getTemplates());
    showToast('قالب با موفقیت برای پزشک انتخابی کپی شد.');
  };

  // Apply a template directly to a specific study
  const handleApplyPinnedTemplate = (template: MedicalTemplate, studyId: string) => {
    const updatedTemplates = StorageService.incrementTemplateUsage(template.id);
    setTemplates(updatedTemplates);

    setTargetStudyIdForTemplate(studyId);
    const processedFindings = settings.numberSlotsEnabled
      ? autoWrapNumbersAsSlotsInHtml(template.findingsHtml).updatedHtml
      : stripSpellHighlights(template.findingsHtml, true);

    setStudies((prev) =>
      prev.map((s) =>
        s.id === studyId
          ? {
              ...s,
              modality: template.modality,
              titleAndTechnique:
                template.title + (template.technique ? ` - ${template.technique}` : ''),
              findingsHtml: processedFindings,
              comparison: template.comparison || '',
              impressionHtml: template.impressionHtml || '',
              recommendationsHtml: template.recommendationsHtml || '',
            }
          : s
      )
    );
    setModality(template.modality);
    showToast(`⚡ قالب «${template.title}» اعمال شد.`);
  };

  // Delete template
  const handleDeleteTemplate = (id: string) => {
    const updated = StorageService.deleteTemplate(id);
    setTemplates(updated);
    showToast('قالب حذف شد.');
  };

  // Direct 1-step Create template from current study (from main editor or drawer)
  const handleStartCreateTemplate = (studyId?: string) => {
    const targetId = studyId || targetStudyIdForTemplate;
    if (studyId) setTargetStudyIdForTemplate(studyId);
    const active = studies.find((s) => s.id === targetId) || studies[0];
    setNewTemplateTitleInput(active?.titleAndTechnique.slice(0, 55) || 'قالب جدید');
    setNewTemplateDoctorId(activeDoctorId);
    setIsTemplatesOpen(false);
    setIsCreateTemplateModalOpen(true);
  };

  const handleSaveNewTemplate = () => {
    if (!newTemplateTitleInput.trim()) return;
    const active = studies.find((s) => s.id === targetStudyIdForTemplate) || studies[0];

    StorageService.addTemplate({
      title: newTemplateTitleInput.trim(),
      modality: active.modality,
      doctorId: newTemplateDoctorId,
      tags: [active.modality, 'سفارشی'],
      technique: active.titleAndTechnique,
      comparison: active.showComparison ? active.comparison : '',
      findingsHtml: stripSpellHighlights(active.findingsHtml, true),
      impressionHtml: active.showImpression ? stripSpellHighlights(active.impressionHtml, true) : '',
      recommendationsHtml: active.showRecommendations
        ? stripSpellHighlights(active.recommendationsHtml, true)
        : '',
    });
    setTemplates(StorageService.getTemplates());
    setIsCreateTemplateModalOpen(false);
    showToast(`✓ قالب «${newTemplateTitleInput.trim()}» ذخیره شد.`);
  };

  // Inline 1-step save directly inside TemplateDrawer without closing drawer
  const handleQuickSaveCurrentAsTemplate = (title: string, docId: string) => {
    const active = studies.find((s) => s.id === targetStudyIdForTemplate) || studies[0];
    StorageService.addTemplate({
      title,
      modality: active.modality,
      doctorId: docId,
      tags: [active.modality, 'سفارشی'],
      technique: active.titleAndTechnique,
      comparison: active.showComparison ? active.comparison : '',
      findingsHtml: stripSpellHighlights(active.findingsHtml, true),
      impressionHtml: active.showImpression ? stripSpellHighlights(active.impressionHtml, true) : '',
      recommendationsHtml: active.showRecommendations
        ? stripSpellHighlights(active.recommendationsHtml, true)
        : '',
    });
    setTemplates(StorageService.getTemplates());
    showToast(`✓ قالب جدید «${title}» در لیست قالب‌ها ثبت شد.`);
  };

  // Unified Organ Sentences & Shortcuts actions
  const handleAddShortcut = (sc: Omit<MedicalShortcut, 'id'>) => {
    StorageService.addShortcut(sc);
    setShortcuts(StorageService.getShortcuts());
    showToast(`✓ جمله / شورتکات «${sc.trigger}» در بانک یکپارچه ذخیره شد.`);
  };

  const handleUpdateShortcut = (id: string, updates: Partial<MedicalShortcut>) => {
    const updated = StorageService.updateShortcut(id, updates);
    setShortcuts(updated);
    showToast('✓ تغییرات جمله / شورتکات ذخیره شد.');
  };

  const handleDeleteShortcut = (id: string) => {
    const updated = StorageService.deleteShortcut(id);
    setShortcuts(updated);
    showToast('جمله / شورتکات حذف شد.');
  };

  const handleResetShortcutsToDefaults = () => {
    const updated = StorageService.resetShortcutsToDefaults();
    setShortcuts(updated);
    showToast('↺ بانک جملات اعضا و شورتکات‌ها به مقادیر استاندارد بازنشانی شد.');
  };

  // Doctor actions
  const handleAddDoctor = (doc: Omit<Doctor, 'id'>) => {
    StorageService.addDoctor(doc);
    setDoctors(StorageService.getDoctors());
    showToast(`پزشک «${doc.name}» افزوده شد.`);
  };

  const handleUpdateDoctor = (id: string, updates: Partial<Doctor>) => {
    const updated = StorageService.updateDoctor(id, updates);
    setDoctors(updated);
  };

  const handleDeleteDoctor = (id: string) => {
    const updated = StorageService.deleteDoctor(id);
    setDoctors(updated);
    if (activeDoctorId === id && updated.length > 0) {
      setActiveDoctorId(updated[0].id);
    }
    showToast('پزشک حذف شد.');
  };

  // Typist actions
  const handleSelectTypist = (id: string) => {
    setActiveTypistId(id);
    StorageService.saveSettings({ activeTypistId: id });
    const found = typists.find((t) => t.id === id);
    if (found) {
      showToast(`👤 تایپیست فعال به «${found.name}» تغییر یافت.`);
    }
  };

  const handleAddTypist = (typ: Omit<Typist, 'id'>) => {
    const created = StorageService.addTypist(typ);
    setTypists(StorageService.getTypists());
    setActiveTypistId(created.id);
    StorageService.saveSettings({ activeTypistId: created.id });
    showToast(`✓ تایپیست جدید «${created.name}» اضافه و فعال شد.`);
  };

  const handleDeleteTypist = (id: string) => {
    const updated = StorageService.deleteTypist(id);
    setTypists(updated);
    if (activeTypistId === id && updated.length > 0) {
      setActiveTypistId(updated[0].id);
      StorageService.saveSettings({ activeTypistId: updated[0].id });
    }
    showToast('تایپیست از لیست حذف شد.');
  };

  // Font actions
  const handleAddFont = (font: Omit<CustomFont, 'id'>) => {
    const newFont: CustomFont = {
      ...font,
      id: `custom-font-${Date.now()}`,
    };
    const currentFonts = settings.customFonts || [];
    const updatedFonts = [...currentFonts, newFont];
    const updatedSettings = { ...settings, customFonts: updatedFonts };
    setSettings(updatedSettings);
    StorageService.saveSettings(updatedSettings);
    showToast(`قلم «${font.name}» به لیست فونت‌ها اضافه شد.`);
  };

  const handleDeleteFont = (id: string) => {
    const currentFonts = settings.customFonts || [];
    const updatedFonts = currentFonts.filter((f) => f.id !== id);
    const updatedSettings = { ...settings, customFonts: updatedFonts };
    setSettings(updatedSettings);
    StorageService.saveSettings(updatedSettings);
    showToast('فونت حذف شد.');
  };

  // Refresh all data callback
  const handleRefreshAllData = () => {
    setDoctors(StorageService.getDoctors());
    setTypists(StorageService.getTypists());
    setTemplates(StorageService.getTemplates());
    setShortcuts(StorageService.getShortcuts());
    setSavedReports(StorageService.getSavedReports());
    setSettings(StorageService.getSettings());
    showToast('اطلاعات سامانه بروزرسانی شد.');
  };

  const currentDoctor = doctors.find((d) => d.id === activeDoctorId) || doctors[0];
  const currentTypist = typists.find((t) => t.id === activeTypistId) || typists[0];

  // Check if user opened a scanned QR code verification URL (?v=1&a=...&d=...&m=...&mc=...)
  const [qrVerificationParams, setQrVerificationParams] = useState<URLSearchParams | null>(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('v') === '1') {
        return sp;
      }
    }
    return null;
  });

  if (qrVerificationParams) {
    const vAdm = qrVerificationParams.get('a') || 'ADM-001';
    const vDate = qrVerificationParams.get('d') || '۱۴۰۴/۰۸/۲۱';
    const vMod = qrVerificationParams.get('m') || 'US';
    const vMc = qrVerificationParams.get('mc') || currentDoctor.medicalCouncilId;
    const vPatient = qrVerificationParams.get('p') || 'بیمار ثبت‌شده در سیستم';
    const matchedDoc = doctors.find((d) => d.medicalCouncilId === vMc) || currentDoctor;

    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans" dir="rtl">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
          <div className="bg-teal-900 text-white p-6 text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-emerald-300" />
            </div>
            <h1 className="text-base sm:text-lg font-black">
              گواهی رسمی اصالت‌سنجی گزارش تصویربرداری
            </h1>
            <p className="text-xs text-teal-200 font-semibold">
              {settings.clinicName || 'مرکز جامع تصویربرداری بیمارستان شفا'}
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center">
              <span className="text-xs font-extrabold text-emerald-800">
                ✓ اصالت این گزارش تصویربرداری در سامانه مرکز تایید شد
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2.5">
              <div className="flex justify-between py-1">
                <span className="text-slate-500">شماره پذیرش:</span>
                <strong className="font-mono text-slate-900">{vAdm}</strong>
              </div>
              <div className="flex justify-between py-1 pt-2.5">
                <span className="text-slate-500">نام بیمار:</span>
                <strong className="text-slate-900">{vPatient}</strong>
              </div>
              <div className="flex justify-between py-1 pt-2.5">
                <span className="text-slate-500">تاریخ گزارش:</span>
                <strong className="text-slate-900">{vDate}</strong>
              </div>
              <div className="flex justify-between py-1 pt-2.5">
                <span className="text-slate-500">نوع بررسی:</span>
                <strong className="text-slate-900">{vMod}</strong>
              </div>
              <div className="flex justify-between py-1 pt-2.5">
                <span className="text-slate-500">پزشک تاییدکننده:</span>
                <strong className="text-teal-900">{matchedDoc.name}</strong>
              </div>
              <div className="flex justify-between py-1 pt-2.5">
                <span className="text-slate-500">شماره نظام پزشکی:</span>
                <strong className="font-mono text-slate-900">{vMc}</strong>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
              {settings.clinicAddress || 'مازندران، ساری، کمربندی غربی، بلوار ولیعصر'} • تلفن:{' '}
              {settings.clinicPhone || '۰۱۱-۳۳۲۰۵۰۰۶-۹'}
            </p>

            <button
              type="button"
              onClick={() => {
                window.history.replaceState({}, '', window.location.pathname);
                setQrVerificationParams(null);
              }}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              ورود به محیط تایپ و گزارش‌نویسی
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen medical-desk-canvas flex flex-col text-slate-800 font-sans transition-colors ${
        settings.darkMode ? 'dark-theme' : ''
      }`}
      style={{
        fontFamily: settings.uiFont || "'Vazirmatn', sans-serif",
      }}
      dir="rtl"
    >
      {/* Toast Notification Banner (Positioned at bottom-left so it never covers top modality buttons) */}
      {toastMessage && (
        <div className="fixed bottom-16 left-6 z-[90] bg-slate-900/95 backdrop-blur-md text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5 animate-fadeSlideUp max-w-md">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="leading-relaxed">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-0.5 rounded transition-colors cursor-pointer mr-1 shrink-0"
            title="بستن اعلان"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Main Navigation */}
      <Navbar
        modality={modality}
        onSelectModality={handleSelectModality}
        doctors={doctors}
        activeDoctorId={activeDoctorId}
        onSelectDoctor={(id) => {
          setActiveDoctorId(id);
          StorageService.saveSettings({ activeDoctorId: id });
        }}
        typists={typists}
        activeTypistId={activeTypistId}
        onSelectTypist={handleSelectTypist}
        onOpenTypistAnalytics={() => setIsTypistAnalyticsOpen(true)}
        smartSuggestionsEnabled={settings.smartSuggestionsEnabled}
        onToggleSmartSuggestions={() => {
          const updated = !settings.smartSuggestionsEnabled;
          setSettings((prev) => ({ ...prev, smartSuggestionsEnabled: updated }));
          StorageService.saveSettings({ smartSuggestionsEnabled: updated });
        }}
        darkMode={Boolean(settings.darkMode)}
        onToggleDarkMode={() => {
          const nextDark = !settings.darkMode;
          setSettings((prev) => ({ ...prev, darkMode: nextDark }));
          StorageService.saveSettings({ darkMode: nextDark });
          showToast(
            nextDark
              ? '🌙 حالت تاریک (مخصوص اتاق رادیولوژی و شیفت شب) فعال شد.'
              : '☀️ حالت روشن فعال شد.'
          );
        }}
        isOnline={isOnline}
        onOpenDoctors={() => setIsDoctorsOpen(true)}
        onOpenReports={() => setIsReportsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onNewReport={() => setIsNewReportModalOpen(true)}
        onPrintPreview={() => setIsPrintOpen(true)}
        modalityColors={settings.modalityColors}
      />

      {/* Multi-Patient Open Workspace Tabs Bar (Hidden in Zen Focus Mode) */}
      {!zenMode && (
        <PatientTabsBar
          tabs={workspaceTabs}
          activeTabId={activeTabId}
          onSelectTab={handleSelectWorkspaceTab}
          onAddNewTab={handleAddNewPatientTab}
          onDuplicateActiveTab={handleDuplicateActiveTab}
          onCloseTab={handleCloseWorkspaceTab}
          onUpdateTabPatientName={handleUpdateTabPatientName}
          onOpenReports={() => setIsReportsOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          reportsCount={savedReports.length}
        />
      )}

      {/* Crash-Recovery Banner if an Unsaved Temporary Draft from Sudden Browser Closure Exists */}
      {recoverableDraft && !zenMode && (
        <div className="max-w-[1680px] 2xl:max-w-[1840px] w-full mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 pt-2.5 no-print">
          <div className="bg-amber-50 border border-amber-300 rounded-2xl px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 shadow-2xs">
            <div className="flex items-center gap-2 text-xs text-amber-950">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="font-bold">
                یک پیش‌نویس موقت از جلسه قبلی (ساعت {recoverableDraft.savedTimeFormatted || 'اخیر'}) یافت شد. آیا مایل به بازیابی آن هستید؟
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRestoreTemporaryDraft}
                className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
              >
                بازیابی پیش‌نویس
              </button>
              <button
                type="button"
                onClick={handleDismissTemporaryDraft}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-amber-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                نادیده گرفتن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Header Box (Hidden in Zen Focus Mode) */}
      {!zenMode && (
        <PatientHeader
          patientInfo={patientInfo}
          onChange={setPatientInfo}
          criticalAlert={criticalAlert}
          onClearCriticalAlert={() => setCriticalAlert(undefined)}
          genderMismatch={genderMismatch}
          onSanitizeGenderMismatch={handleSanitizeGenderMismatch}
        />
      )}

      {/* Full Word/Google Docs Medical Toolbar */}
      <EditorToolbar
        onExecCommand={handleExecCommand}
        onInsertTable={handleInsertTable}
        onInsertPresetTable={handleInsertPresetTable}
        onInsertSymbol={handleInsertSymbol}
        onFindReplace={handleFindReplace}
        wordCount={wordCount}
        charCount={charCount}
        isListening={isListening}
        onToggleVoice={toggleVoice}
        hasSpeechSupport={hasSpeechSupport}
        activeDirection={activeDirection}
        onToggleDirection={() => setActiveDirection((d) => (d === 'rtl' ? 'ltr' : 'rtl'))}
        onFormatBlock={handleFormatBlock}
        fonts={settings.customFonts || []}
        defaultFont={settings.defaultFont || 'Vazirmatn'}
        onChangeDefaultFont={(fontFamily) => {
          const updated = { ...settings, defaultFont: fontFamily };
          setSettings(updated);
          StorageService.saveSettings(updated);
        }}
        onOpenFontManager={() => setIsFontManagerOpen(true)}
        editorZoom={editorZoom}
        onChangeZoom={setEditorZoom}
        lineHeight={settings.editorLineHeight || 1.8}
        onChangeLineHeight={(lh) => {
          const updated = { ...settings, editorLineHeight: lh, printLineHeight: lh };
          setSettings(updated);
          StorageService.saveSettings(updated);
          showToast(`↕️ فاصله خطوط گزارش (ویرایشگر و چاپ) به ${lh} تنظیم شد.`);
        }}
      />

      {/* Main Medical Document Canvas (with Smooth Tab Crossfade, Multi-Study Support, Zen Focus Mode, and Split-Screen Prior Report Comparison) */}
      <main key={`${activeTabId}-${modality}`} className="flex-1 pb-20 animate-tabSwitch">
        <RichMedicalEditor
          studies={studies}
          onUpdateStudy={handleUpdateStudy}
          onAddStudy={handleAddStudy}
          onRemoveStudy={handleRemoveStudy}
          patientInfo={patientInfo}
          shortcuts={shortcuts}
          smartSuggestionsEnabled={settings.smartSuggestionsEnabled}
          numberSlotsEnabled={Boolean(settings.numberSlotsEnabled)}
          activeDirection={activeDirection}
          onRegisterActiveEditorRef={(el) => (activeEditorRef.current = el)}
          isOnline={isOnline}
          onOpenTemplates={(targetId) => {
            setTargetStudyIdForTemplate(targetId);
            setTemplateDrawerMode('replace');
            setIsTemplatesOpen(true);
          }}
          onOpenShortcuts={(initialOrgan) => {
            setShortcutsModalOrganFilter(initialOrgan || 'all');
            setIsShortcutsOpen(true);
          }}
          headingFont={settings.headingFont}
          headingFontSize={settings.headingFontSize}
          defaultFont={settings.defaultFont || 'Vazirmatn'}
          defaultFontSize={settings.defaultFontSize || 14}
          onChangeDefaultFontSize={(newSize) => {
            const updated = { ...settings, defaultFontSize: newSize };
            setSettings(updated);
            StorageService.saveSettings(updated);
            showToast(
              newSize < 14
                ? `📄 سایز قلم چاپ به ${newSize} تنظیم شد تا گزارش به صورت استاندارد در ۱ صفحه A4 جا شود.`
                : '📄 سایز قلم چاپ به حالت استاندارد (۱۴) بازگردانده شد.'
            );
          }}
          onShowToast={showToast}
          editorZoom={editorZoom}
          templates={templates}
          onApplyPinnedTemplate={handleApplyPinnedTemplate}
          onStartQuickSaveAsTemplate={handleStartCreateTemplate}
          zenMode={zenMode}
          onToggleZenMode={() => {
            setZenMode((prev) => {
              const next = !prev;
              showToast(
                next
                  ? '🧘 حالت تمرکز کامل تایپ (Zen Mode) فعال شد • برای خروج مجدداً Alt+F بزنید.'
                  : 'حالت تمرکز کامل تایپ غیرفعال شد.'
              );
              return next;
            });
          }}
          savedReports={savedReports}
          onExecCommand={handleExecCommand}
          isReportLocked={isCurrentReportLocked}
          onUnlockReportForAddendum={handleUnlockReportForAddendum}
          reportRevisions={currentReportRevisions}
          onRestoreReportRevision={(rev) => handleRestoreReportRevision(rev)}
          editorLineHeight={settings.editorLineHeight || 1.8}
          printLineHeight={settings.editorLineHeight || 1.8}
        />
      </main>

      {/* Floating Frosted-Glass Bottom Dock */}
      <footer className="fixed bottom-2.5 left-0 right-0 z-20 px-4 sm:px-6 lg:px-8 2xl:px-10 pointer-events-none no-print">
        <div className="w-full max-w-[1680px] 2xl:max-w-[1840px] mx-auto">
          <div className="pointer-events-auto bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-2xl px-4 py-2 shadow-[0_12px_36px_-10px_rgba(15,23,42,0.16)] flex items-center justify-between flex-wrap gap-2 text-xs transition-all duration-300">
            <div className="flex items-center gap-3 text-slate-500 flex-wrap">
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <span
                  className={`w-2 h-2 rounded-full transition-colors ${
                    hasUnsavedDraftChanges
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-emerald-500'
                  }`}
                />
                {hasUnsavedDraftChanges
                  ? 'تغییرات جدید شناسایی شد (ذخیره پیش‌نویس خودکار هر ۳۰ ثانیه)'
                  : `پیش‌نویس خودکار ذخیره شد (${lastAutoDraftTime})`}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsCommandPaletteOpen(true)}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/90 font-bold rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-1.5 active:scale-95"
                title="جستجوگر سریع قالب‌ها، تب‌ها و دستورات (Ctrl+K)"
              >
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">فرمان سریع</span>
                <kbd className="px-1.5 py-0.2 rounded bg-white text-slate-600 border border-slate-200 text-[10px] font-mono">
                  Ctrl+K
                </kbd>
              </button>

              <button
                type="button"
                onClick={() => setIsReportsOpen(true)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200/90 hover:border-teal-300 font-bold rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-1.5 active:scale-95"
                title="مشاهده و جستجوی آرشیو گزارش‌های ذخیره‌شده بیماران"
              >
                <span>آرشیو بیماران</span>
                <span className="px-1.5 py-0.2 rounded-md bg-slate-200/80 text-slate-700 text-[10px] font-mono tabular-nums">
                  {savedReports.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveReportToArchive(false)}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition-all duration-200 cursor-pointer active:scale-95 hover:-translate-y-[0.5px]"
              >
                ذخیره در آرشیو بیماران
              </button>
              <button
                type="button"
                onClick={() => setIsPrintOpen(true)}
                style={{ backgroundColor: 'var(--modality-accent, #0284c7)' }}
                className="px-4 py-1.5 hover:opacity-95 text-white font-bold rounded-xl shadow-sm transition-all duration-200 inline-flex items-center gap-1.5 cursor-pointer active:scale-95 hover:-translate-y-[0.5px]"
                title="مشاهده پیش‌نمایش سربرگ A4، تنظیمات چاپ و صدور گزارش نهایی"
              >
                <Printer className="w-3.5 h-3.5 shrink-0" />
                <span>پیش‌نمایش چاپ سربرگ و صدور گزارش</span>
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Confirmation Modal for New Report */}
      {isNewReportModalOpen && (
        <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <PlusCircle className="w-5 h-5 text-teal-600" />
                <span>ایجاد گزارش جدید</span>
              </div>
              <button
                type="button"
                onClick={() => setIsNewReportModalOpen(false)}
                className="h-7 px-2 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer"
              >
                <span>بستن</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              آیا مایلید گزارش جدید خالی ایجاد کنید؟ مشخصات بیمار فعلی و متن نوشته‌شده پاک خواهند شد (در صورت نیاز می‌توانید ابتدا آن را در آرشیو ذخیره نمایید).
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsNewReportModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100"
              >
                انصراف
              </button>
              <button
                onClick={confirmNewReport}
                className="px-4 py-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs"
              >
                بله، شروع گزارش جدید
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Select Template Title Picker Modal when clicking "+" (New Patient Tab) */}
      {isNewTabTemplatePickerOpen && (
        <div className="fixed inset-0 z-[80] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-scaleIn flex flex-col max-h-[86vh]">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-black">انتخاب یک یا چند قالب برای تب بیمار جدید</h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  می‌توانید یک یا چند سونوگرافی/تصویربرداری را تیک بزنید و همزمان وارد پرونده بیمار جدید شوید:
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewTabTemplatePickerOpen(false)}
                className="h-8 px-2.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white border border-slate-700 hover:border-rose-500 flex items-center gap-1 text-xs font-bold shrink-0 transition-colors cursor-pointer"
              >
                <span>بستن</span>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 border-b border-slate-200 space-y-2.5">
              {/* Modality Filter Pills (Harmonized with Top Navbar Modality Colors) */}
              <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-slate-200">
                {(['all', 'sonography', 'mri', 'ct'] as const).map((m) => {
                  const label =
                    m === 'all'
                      ? 'همه قالب‌ها'
                      : m === 'sonography'
                      ? 'سونوگرافی'
                      : m === 'mri'
                      ? 'ام‌آر‌آی'
                      : 'سی‌تی‌اسکن';
                  const active = newTabPickerModality === m;
                  const activeCls =
                    m === 'sonography'
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : m === 'mri'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : m === 'ct'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-900 text-white shadow-2xs';
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setNewTabPickerModality(m)}
                      className={`flex-1 h-8 px-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                        active
                          ? activeCls
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Quick Patient Name Input for the New Tab */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  autoFocus
                  value={newTabPatientName}
                  onChange={(e) => setNewTabPatientName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      finalizeCreateNewPatientTab(selectedNewTabTemplates);
                    }
                  }}
                  placeholder="نام بیمار برای نمایش روی تب (مثلاً: علی رضایی) — اختیاری..."
                  className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-teal-300 bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/15 focus:outline-none text-slate-900"
                />
              </div>

              {/* Search Input + Sort Toggle (Usage Frequency vs Alphabetical) */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTabPickerSearch}
                  onChange={(e) => setNewTabPickerSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && selectedNewTabTemplates.length > 0) {
                      e.preventDefault();
                      finalizeCreateNewPatientTab(selectedNewTabTemplates);
                    }
                  }}
                  placeholder="جستجوی سریع نام قالب (مثلاً: شکم، تیروئید، پستان، کلیه، کمر)..."
                  className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:border-teal-500 focus:outline-none"
                />

                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => setNewTabPickerSortBy('usage')}
                    className={`h-7 px-2.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      newTabPickerSortBy === 'usage'
                        ? 'bg-teal-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    title="مرتب‌سازی بر اساس تکرار و میزان استفاده"
                  >
                    پرتکرارترین
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTabPickerSortBy('alphabetical')}
                    className={`h-7 px-2.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      newTabPickerSortBy === 'alphabetical'
                        ? 'bg-teal-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    title="مرتب‌سازی بر اساس حروف الفبا"
                  >
                    الفبا
                  </button>
                </div>
              </div>
            </div>

            {/* Compact Multi-Selectable Titles-Only List */}
            <div className="p-3 overflow-y-auto space-y-1.5 flex-1">
              <button
                type="button"
                onClick={() => finalizeCreateNewPatientTab([])}
                className="w-full text-right px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-between transition-all duration-150 cursor-pointer border border-slate-200"
              >
                <span>📄 شروع با برگه خام (بدون قالب آماده)</span>
                <span className="text-[10px] text-slate-500">ورود مستقیم ↵</span>
              </button>

              {templates
                .filter((t) => {
                  if (newTabPickerModality !== 'all' && t.modality !== newTabPickerModality) {
                    return false;
                  }
                  if (newTabPickerSearch.trim()) {
                    return t.title.toLowerCase().includes(newTabPickerSearch.trim().toLowerCase());
                  }
                  return true;
                })
                .sort((a, b) => {
                  if (newTabPickerSortBy === 'alphabetical') {
                    return a.title.localeCompare(b.title, 'fa');
                  }
                  const diff = (b.usageCount || 0) - (a.usageCount || 0);
                  if (diff !== 0) return diff;
                  if (Boolean(b.isPinned) !== Boolean(a.isPinned)) {
                    return b.isPinned ? 1 : -1;
                  }
                  return a.title.localeCompare(b.title, 'fa');
                })
                .map((tpl) => {
                  const selectedIdx = selectedNewTabTemplates.findIndex((s) => s.id === tpl.id);
                  const isSelected = selectedIdx !== -1;

                  const modBadge =
                    tpl.modality === 'mri'
                      ? {
                          label: 'ام‌آر‌آی',
                          cls: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                          selectedRow: 'bg-indigo-50/90 border-indigo-500 text-indigo-950 ring-1 ring-indigo-500/30',
                          checkBg: 'bg-indigo-600 text-white border-indigo-600',
                          openBtn: 'hover:bg-indigo-600',
                        }
                      : tpl.modality === 'ct'
                      ? {
                          label: 'سی‌تی‌اسکن',
                          cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                          selectedRow: 'bg-emerald-50/90 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500/30',
                          checkBg: 'bg-emerald-600 text-white border-emerald-600',
                          openBtn: 'hover:bg-emerald-600',
                        }
                      : {
                          label: 'سونوگرافی',
                          cls: 'bg-sky-50 text-sky-700 border-sky-200',
                          selectedRow: 'bg-sky-50/90 border-sky-500 text-sky-950 ring-1 ring-sky-500/30',
                          checkBg: 'bg-sky-600 text-white border-sky-600',
                          openBtn: 'hover:bg-sky-600',
                        };

                  return (
                    <div
                      key={tpl.id}
                      onClick={() => toggleSelectTemplateForNewTab(tpl)}
                      className={`w-full text-right px-3 py-2 rounded-xl font-bold text-xs flex items-center justify-between gap-2 transition-all duration-150 cursor-pointer border shadow-2xs select-none ${
                        isSelected
                          ? modBadge.selectedRow
                          : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Multi-select checkbox / order badge */}
                        <span
                          className={`w-5 h-5 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 border transition-colors ${
                            isSelected
                              ? modBadge.checkBg
                              : 'bg-white border-slate-300 text-transparent'
                          }`}
                        >
                          {isSelected ? selectedIdx + 1 : '✓'}
                        </span>
                        <span className="truncate">{tpl.title}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${modBadge.cls}`}
                        >
                          {modBadge.label}
                        </span>

                        {/* 1-Click Direct Single Open Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            finalizeCreateNewPatientTab([tpl]);
                          }}
                          title="ورود مستقیم فقط با همین یک قالب"
                          className={`px-2 py-1 rounded-lg bg-slate-100 text-slate-600 hover:text-white text-[10px] font-bold transition-colors duration-150 cursor-pointer ${modBadge.openBtn}`}
                        >
                          ورود تکی ↵
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Bottom Action Bar for Confirming Multi-Selected Templates */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 space-y-2">
              {selectedNewTabTemplates.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-600">
                    انتخاب‌شده ({selectedNewTabTemplates.length}):
                  </span>
                  {selectedNewTabTemplates.map((st, i) => (
                    <span
                      key={st.id}
                      onClick={() => toggleSelectTemplateForNewTab(st)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-100 text-teal-900 border border-teal-300 text-[11px] font-bold cursor-pointer hover:bg-rose-100 hover:text-rose-900 hover:border-rose-300 transition-colors"
                      title="برای حذف از لیست کلیک کنید"
                    >
                      <span>
                        {i + 1}. {st.title}
                      </span>
                      <X className="w-3 h-3" />
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">
                  {selectedNewTabTemplates.length === 0
                    ? 'می‌توانید چند سونوگرافی/قالب را با هم تیک بزنید'
                    : `${selectedNewTabTemplates.length} قالب به ترتیب انتخاب آماده درج در پرونده جدید است`}
                </span>

                <button
                  type="button"
                  disabled={selectedNewTabTemplates.length === 0}
                  onClick={() => finalizeCreateNewPatientTab(selectedNewTabTemplates)}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-xs shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {selectedNewTabTemplates.length > 0
                      ? `شروع تایپ با ${selectedNewTabTemplates.length} قالب انتخاب‌شده`
                      : 'ابتدا قالب(ها) را انتخاب کنید'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1-Step Modal for Saving Current Study as a Ready Template */}
      {isCreateTemplateModalOpen && (
        <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between">
              <div className="text-sm font-black text-slate-900">
                ذخیره گزارش فعلی در قالب‌های آماده
              </div>
              <button
                type="button"
                onClick={() => setIsCreateTemplateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان قالب آماده:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newTemplateTitleInput}
                  onChange={(e) => setNewTemplateTitleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveNewTemplate();
                    }
                  }}
                  placeholder="عنوان قالب را وارد کنید..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-teal-500 focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اختصاص به پزشک:
                </label>
                <select
                  value={newTemplateDoctorId}
                  onChange={(e) => setNewTemplateDoctorId(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold"
                >
                  <option value="all">قالب عمومی (مشترک برای تمام پزشکان)</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      قالب اختصاصی {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreateTemplateModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSaveNewTemplate}
                className="px-5 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs cursor-pointer"
              >
                ذخیره فوری قالب
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals & Drawers */}
      <TemplateDrawer
        isOpen={isTemplatesOpen}
        onClose={() => {
          setIsTemplatesOpen(false);
          setTemplateDrawerMode('replace');
        }}
        modality={modality}
        templates={templates}
        doctors={doctors}
        activeDoctorId={activeDoctorId}
        drawerMode={templateDrawerMode}
        onSelectTemplate={applyTemplateToTargetStudy}
        onAddAsNewStudy={handleAddTemplateAsNewStudy}
        onCloneTemplate={(tpl) => setCloneTargetTemplate(tpl)}
        onDeleteTemplate={handleDeleteTemplate}
        onQuickSaveCurrentAsTemplate={handleQuickSaveCurrentAsTemplate}
        defaultSuggestedTitle={
          (studies.find((s) => s.id === targetStudyIdForTemplate) || studies[0])?.titleAndTechnique.slice(
            0,
            55
          ) || ''
        }
      />

      <CloneTemplateModal
        template={cloneTargetTemplate}
        doctors={doctors}
        onClose={() => setCloneTargetTemplate(null)}
        onClone={handleCloneTemplate}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        shortcuts={shortcuts}
        templates={templates}
        onAddShortcut={handleAddShortcut}
        onUpdateShortcut={handleUpdateShortcut}
        onDeleteShortcut={handleDeleteShortcut}
        onResetDefaults={handleResetShortcutsToDefaults}
        initialOrganFilter={shortcutsModalOrganFilter}
      />

      <DoctorManagementModal
        isOpen={isDoctorsOpen}
        onClose={() => setIsDoctorsOpen(false)}
        doctors={doctors}
        activeDoctorId={activeDoctorId}
        onSelectDoctor={(id) => {
          setActiveDoctorId(id);
          StorageService.saveSettings({ activeDoctorId: id });
        }}
        onAddDoctor={handleAddDoctor}
        onUpdateDoctor={handleUpdateDoctor}
        onDeleteDoctor={handleDeleteDoctor}
        defaultSignatureUrl={settings.doctorSignatureUrl}
        onUpdateDefaultSignatureUrl={(url) => {
          const updated = { ...settings, doctorSignatureUrl: url };
          setSettings(updated);
          StorageService.saveSettings(updated);
        }}
      />

      <TypistAnalyticsModal
        isOpen={isTypistAnalyticsOpen}
        onClose={() => setIsTypistAnalyticsOpen(false)}
        typists={typists}
        activeTypistId={activeTypistId}
        onSelectTypist={handleSelectTypist}
        onAddTypist={handleAddTypist}
        onDeleteTypist={handleDeleteTypist}
        reports={savedReports}
      />

      <PrintPreviewModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        patientInfo={patientInfo}
        studies={studies}
        doctor={currentDoctor}
        settings={settings}
        onRecordPrintedReport={() => handleSaveReportToArchive(true)}
        onUpdateSettings={(updates) => {
          const updated = { ...settings, ...updates };
          setSettings(updated);
          StorageService.saveSettings(updated);
        }}
      />

      <ReportHistoryDrawer
        isOpen={isReportsOpen}
        onClose={() => setIsReportsOpen(false)}
        reports={savedReports}
        typists={typists}
        doctors={doctors}
        onOpenTypistAnalytics={() => setIsTypistAnalyticsOpen(true)}
        onLoadReport={handleLoadReport}
        onRestoreRevision={(rep, rev) => handleRestoreReportRevision(rev, rep)}
        onDeleteReport={(id) => {
          const updated = StorageService.deleteReport(id);
          setSavedReports(updated);
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(s) => {
          setSettings(s);
          StorageService.saveSettings(s);
        }}
        onRefreshAllData={handleRefreshAllData}
        onOpenDoctors={() => {
          setIsSettingsOpen(false);
          setIsDoctorsOpen(true);
        }}
        doctors={doctors}
        activeDoctorId={activeDoctorId}
      />

      <FontManagerModal
        isOpen={isFontManagerOpen}
        onClose={() => setIsFontManagerOpen(false)}
        fonts={settings.customFonts || []}
        onAddFont={handleAddFont}
        onDeleteFont={handleDeleteFont}
      />

      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        modality={modality}
        onSelectModality={handleSelectModality}
        templates={templates}
        onApplyTemplate={(tpl) => {
          handleApplyPinnedTemplate(tpl, studies[0]?.id || '');
        }}
        tabs={workspaceTabs}
        activeTabId={activeTabId}
        onSelectTab={handleSelectWorkspaceTab}
        onAddNewTab={handleAddNewPatientTab}
        doctors={doctors}
        activeDoctorId={activeDoctorId}
        onSelectDoctor={(id) => {
          setActiveDoctorId(id);
          StorageService.saveSettings({ activeDoctorId: id });
        }}
        onOpenPrintPreview={() => setIsPrintOpen(true)}
        onSaveToArchive={() => handleSaveReportToArchive(false)}
        onOpenArchive={() => setIsReportsOpen(true)}
        darkMode={Boolean(settings.darkMode)}
        onToggleDarkMode={() => {
          const nextDark = !settings.darkMode;
          setSettings((prev) => ({ ...prev, darkMode: nextDark }));
          StorageService.saveSettings({ darkMode: nextDark });
        }}
      />
    </div>
  );
}
