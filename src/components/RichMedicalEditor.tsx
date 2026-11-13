import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Modality, MedicalShortcut, PatientInfo, ReportStudy, MedicalTemplate, MedicalReport, ReportRevision } from '../types';
import {
  Sparkles,
  Zap,
  CheckCircle,
  FileText,
  Wand2,
  GitCompare,
  ShieldCheck,
  Plus,
  Trash2,
  Layers,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  LayoutGrid,
  SpellCheck,
  Check,
  X,
  Hash,
  SlidersHorizontal,
  Pin,
  BookmarkPlus,
  Maximize2,
  Minimize2,
  Columns,
  Bold,
  Italic,
  Underline,
  Eraser,
  Copy,
  AlignRight,
  AlignCenter,
  AlignLeft,
  AlignJustify,
  AlertTriangle,
  Lock,
  Unlock,
  History,
  RotateCcw,
} from 'lucide-react';
import { AiService } from '../services/aiService';
import {
  highlightRadiologyIssuesInHtml,
  detectRadiologyIssuesInPlainText,
  stripSpellHighlights,
  expandShortcutInContentEditable,
  expandShortcutInInput,
  SpellIssueItem,
  PRESET_RADIOLOGY_SLOTS,
  createSlotHtml,
  normalizeAndExtractSlots,
  autoWrapNumbersAsSlotsInHtml,
  detectLateralityMismatches,
  fixStudyLateralityMismatch,
  cleanMedicalTextWhitespaceAndDuplicates,
  paginateStudiesIntoA4Pages,
} from '../services/typistUtils';

interface RichMedicalEditorProps {
  studies: ReportStudy[];
  onUpdateStudy: (studyId: string, updates: Partial<ReportStudy>) => void;
  onAddStudy: (modality?: Modality) => void;
  onRemoveStudy: (studyId: string) => void;
  patientInfo: PatientInfo;
  shortcuts: MedicalShortcut[];
  smartSuggestionsEnabled: boolean;
  numberSlotsEnabled?: boolean;
  activeDirection: 'rtl' | 'ltr';
  onRegisterActiveEditorRef?: (el: HTMLDivElement | null) => void;
  isOnline: boolean;
  onOpenTemplates: (targetStudyId: string) => void;
  onOpenShortcuts: () => void;
  headingFont?: string;
  headingFontSize?: string;
  defaultFont?: string;
  defaultFontSize?: number;
  onChangeDefaultFontSize?: (size: number) => void;
  onShowToast?: (msg: string) => void;
  editorZoom?: number;
  templates?: MedicalTemplate[];
  onApplyPinnedTemplate?: (template: MedicalTemplate, targetStudyId: string) => void;
  onTogglePinTemplate?: (templateId: string) => void;
  onStartQuickSaveAsTemplate?: (studyId: string) => void;
  zenMode?: boolean;
  onToggleZenMode?: () => void;
  savedReports?: MedicalReport[];
  onExecCommand?: (command: string, value?: string) => void;
  // Proposal #12: Printed Report Security Lock & Version History
  isReportLocked?: boolean;
  onUnlockReportForAddendum?: () => void;
  reportRevisions?: ReportRevision[];
  onRestoreReportRevision?: (revision: ReportRevision) => void;
  editorLineHeight?: number;
  printLineHeight?: number;
}

export const RichMedicalEditor: React.FC<RichMedicalEditorProps> = ({
  studies,
  onUpdateStudy,
  onAddStudy,
  onRemoveStudy,
  patientInfo,
  shortcuts,
  smartSuggestionsEnabled,
  numberSlotsEnabled = false,
  activeDirection,
  onRegisterActiveEditorRef,
  isOnline,
  onOpenTemplates,
  onOpenShortcuts,
  headingFont = 'Vazirmatn',
  headingFontSize = '16px',
  defaultFont = 'Vazirmatn',
  defaultFontSize = 14,
  onChangeDefaultFontSize,
  onShowToast,
  editorZoom = 100,
  templates = [],
  onApplyPinnedTemplate,
  onTogglePinTemplate,
  onStartQuickSaveAsTemplate,
  zenMode = false,
  onToggleZenMode,
  savedReports = [],
  onExecCommand,
  isReportLocked = false,
  onUnlockReportForAddendum,
  reportRevisions = [],
  onRestoreReportRevision,
  editorLineHeight = 1.9,
  printLineHeight = 1.75,
}) => {
  const [activeStudyId, setActiveStudyId] = useState<string>(studies[0]?.id || '');
  const [activeSuggestions, setActiveSuggestions] = useState<string[]>([]);
  const [ghostSuggestion, setGhostSuggestion] = useState<string>('');
  const [generatingImpressionId, setGeneratingImpressionId] = useState<string | null>(null);
  const [quickMacroFilter, setQuickMacroFilter] = useState<'all' | 'normal' | 'pathology'>('all');
  const [expandedMoreInfo, setExpandedMoreInfo] = useState<Record<string, boolean>>({});
  const [isVersionHistoryModalOpen, setIsVersionHistoryModalOpen] = useState(false);

  // Split-Screen Prior Report Comparison state
  const [isSplitComparisonOpen, setIsSplitComparisonOpen] = useState(false);
  const [selectedPriorReportId, setSelectedPriorReportId] = useState<string>('');

  // Floating Selection Formatting Toolbar state
  const [floatingToolbarPos, setFloatingToolbarPos] = useState<{ top: number; left: number } | null>(
    null
  );
  const [floatingFontName, setFloatingFontName] = useState<string>(defaultFont || 'Vazirmatn');
  const [floatingFontSize, setFloatingFontSize] = useState<string>('3');
  const isInteractingWithFloatingRef = useRef<boolean>(false);
  const floatingToolbarRef = useRef<HTMLDivElement | null>(null);

  // Live matched shortcut hint when typing `.xyz`
  const [pendingShortcutMatch, setPendingShortcutMatch] = useState<MedicalShortcut | null>(null);

  // Interactive Spell & Half-Space Highlight State
  const [detectedIssues, setDetectedIssues] = useState<SpellIssueItem[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<SpellIssueItem | null>(null);

  // Smart Number Slot Menu & Active Slot State
  const [showSlotInsertMenu, setShowSlotInsertMenu] = useState(false);
  const [customSlotLabel, setCustomSlotLabel] = useState('');
  const [customSlotValue, setCustomSlotValue] = useState('۱۰۰');
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const slotInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const toggleMoreInfo = (studyId: string) => {
    setExpandedMoreInfo((prev) => ({ ...prev, [studyId]: !prev[studyId] }));
  };

  // Ref map for findings contentEditable elements
  const findingsRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Ref map for title textarea elements
  const titleRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // Pinned templates horizontal scroll ref & multi-line wrap toggle (for hospital mice without horizontal scroll)
  const pinsScrollRef = useRef<HTMLDivElement | null>(null);
  const [isPinsMultiLineWrap, setIsPinsMultiLineWrap] = useState(false);

  const handleWheelPinsScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    if (isPinsMultiLineWrap || !pinsScrollRef.current) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      pinsScrollRef.current.scrollLeft -= e.deltaY * 1.3;
    }
  };

  const scrollPinsBy = (direction: 'right' | 'left') => {
    if (!pinsScrollRef.current) return;
    const offset = direction === 'right' ? 220 : -220;
    pinsScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  // Ensure activeStudyId points to an existing study
  useEffect(() => {
    if (!studies.some((s) => s.id === activeStudyId) && studies.length > 0) {
      setActiveStudyId(studies[0].id);
    }
  }, [studies, activeStudyId]);

  // Register active editor ref for toolbar execCommands
  useEffect(() => {
    const el = findingsRefs.current[activeStudyId] || null;
    if (onRegisterActiveEditorRef) {
      onRegisterActiveEditorRef(el);
    }
  }, [activeStudyId, onRegisterActiveEditorRef]);

  // Sync findings content safely without losing caret
  useEffect(() => {
    studies.forEach((study) => {
      const el = findingsRefs.current[study.id];
      if (el && el.innerHTML !== study.findingsHtml) {
        if (document.activeElement !== el) {
          el.innerHTML = study.findingsHtml;
        }
      }
    });
  }, [studies]);

  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trigger smart suggestions on typing in active study (instant offline + debounced online AI)
  const updateSuggestions = useCallback(
    (text: string, currentStudy: ReportStudy) => {
      if (!smartSuggestionsEnabled) {
        setActiveSuggestions([]);
        setGhostSuggestion('');
        return;
      }

      // 1. Immediate 0ms offline suggestions so typist never waits
      const instant = AiService.getInstantOfflineSuggestions(text, currentStudy.modality);
      setActiveSuggestions(instant);
      setGhostSuggestion(instant[0] || '');

      // 2. Debounce online AI enhancement to avoid rate limits (429) on fast typing
      if (suggestDebounceRef.current) {
        clearTimeout(suggestDebounceRef.current);
      }

      if (isOnline && text.trim().length > 12) {
        suggestDebounceRef.current = setTimeout(async () => {
          const res = await AiService.getNextSentenceSuggestions(
            text,
            currentStudy.modality,
            currentStudy.titleAndTechnique || 'یافته‌ها',
            isOnline
          );
          if (res.suggestions && res.suggestions.length > 0) {
            setActiveSuggestions(res.suggestions);
            setGhostSuggestion(res.suggestions[0]);
          }
        }, 2000);
      }
    },
    [smartSuggestionsEnabled, isOnline]
  );

  // Insert text at the current cursor in the active findings editor
  const insertSuggestionAtCursor = useCallback(
    (suggestionText: string, studyId: string) => {
      const el = findingsRefs.current[studyId];
      if (!el) return;
      el.focus();

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && el.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const node = document.createTextNode(suggestionText);
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        el.innerHTML += ` ${suggestionText}`;
      }

      const updated = el.innerHTML;
      onUpdateStudy(studyId, { findingsHtml: updated });
      setGhostSuggestion('');
    },
    [onUpdateStudy]
  );

  /**
   * FEATURE 4 (UPDATED): Scan and Highlight Spelling & Half-Space Issues (Alt + C)
   * Highlights issues in the text first; when the typist clicks/selects a highlighted item, it suggests the replacement!
   */
  const handleHighlightSpellIssues = useCallback(() => {
    const allIssues: SpellIssueItem[] = [];

    studies.forEach((study) => {
      // 1. Check Title plain text
      const titleIssues = detectRadiologyIssuesInPlainText(study.titleAndTechnique, study.id);
      allIssues.push(...titleIssues);

      // 2. Check & highlight Findings HTML
      const currentHtml = findingsRefs.current[study.id]?.innerHTML || study.findingsHtml;
      const { highlightedHtml, issues: findingsIssues } = highlightRadiologyIssuesInHtml(
        currentHtml,
        study.id
      );
      allIssues.push(...findingsIssues);

      const el = findingsRefs.current[study.id];
      if (el && el.innerHTML !== highlightedHtml) {
        el.innerHTML = highlightedHtml;
      }
      onUpdateStudy(study.id, { findingsHtml: highlightedHtml });
    });

    setDetectedIssues(allIssues);
    if (allIssues.length > 0) {
      setSelectedIssue(allIssues[0]);
      if (onShowToast) {
        onShowToast(
          `🔍 ${allIssues.length} مورد املایی/نیم‌فاصله هایلایت شد. روی هر مورد کلیک کنید تا پیشنهاد جایگزین نمایش داده شود.`
        );
      }
    } else {
      setSelectedIssue(null);
      if (onShowToast) {
        onShowToast('✓ هیچ خطای املایی یا نیم‌فاصله‌ای در گزارش یافت نشد.');
      }
    }
  }, [studies, onUpdateStudy, onShowToast]);

  // Accept a single highlighted spell/half-space suggestion
  const handleAcceptIssueSuggestion = (issue: SpellIssueItem) => {
    const study = studies.find((s) => s.id === issue.studyId);
    if (!study) return;

    if (issue.field === 'title') {
      const updatedTitle = study.titleAndTechnique.replace(issue.original, issue.suggestion);
      onUpdateStudy(study.id, { titleAndTechnique: updatedTitle });
    } else {
      const el = findingsRefs.current[study.id];
      if (el) {
        const markEl = el.querySelector(`mark[data-spell-id="${issue.id}"]`);
        if (markEl) {
          const textNode = document.createTextNode(issue.suggestion);
          markEl.replaceWith(textNode);
        } else {
          el.innerHTML = el.innerHTML.replace(issue.original, issue.suggestion);
        }
        onUpdateStudy(study.id, { findingsHtml: el.innerHTML });
      }
    }

    const remaining = detectedIssues.filter((i) => i.id !== issue.id);
    setDetectedIssues(remaining);
    setSelectedIssue(remaining[0] || null);

    if (onShowToast) {
      onShowToast(`✓ «${issue.original}» با «${issue.suggestion}» جایگزین شد.`);
    }
  };

  // Ignore/dismiss a single highlighted issue (remove highlight, keep original text)
  const handleDismissIssue = (issue: SpellIssueItem) => {
    const study = studies.find((s) => s.id === issue.studyId);
    if (study && issue.field === 'findings') {
      const el = findingsRefs.current[study.id];
      if (el) {
        const markEl = el.querySelector(`mark[data-spell-id="${issue.id}"]`);
        if (markEl) {
          const textNode = document.createTextNode(issue.original);
          markEl.replaceWith(textNode);
          onUpdateStudy(study.id, { findingsHtml: el.innerHTML });
        }
      }
    }

    const remaining = detectedIssues.filter((i) => i.id !== issue.id);
    setDetectedIssues(remaining);
    setSelectedIssue(remaining[0] || null);
  };

  // Clear all spell highlights without changing text
  const handleClearAllHighlights = () => {
    studies.forEach((study) => {
      const el = findingsRefs.current[study.id];
      const cleaned = stripSpellHighlights(el?.innerHTML || study.findingsHtml);
      if (el) {
        el.innerHTML = cleaned;
      }
      onUpdateStudy(study.id, { findingsHtml: cleaned });
    });
    setDetectedIssues([]);
    setSelectedIssue(null);
  };

  // Accept all highlighted suggestions at once
  const handleAcceptAllIssues = () => {
    studies.forEach((study) => {
      let updatedTitle = study.titleAndTechnique;
      const titleIssuesForStudy = detectedIssues.filter(
        (i) => i.studyId === study.id && i.field === 'title'
      );
      titleIssuesForStudy.forEach((iss) => {
        updatedTitle = updatedTitle.replace(iss.original, iss.suggestion);
      });

      const el = findingsRefs.current[study.id];
      if (el) {
        const marks = el.querySelectorAll('mark[data-spell-issue="true"]');
        marks.forEach((m) => {
          const sug = m.getAttribute('data-suggestion') || m.textContent || '';
          m.replaceWith(document.createTextNode(sug));
        });
        onUpdateStudy(study.id, {
          titleAndTechnique: updatedTitle,
          findingsHtml: el.innerHTML,
        });
      }
    });

    const count = detectedIssues.length;
    setDetectedIssues([]);
    setSelectedIssue(null);
    if (onShowToast) {
      onShowToast(`✓ تمامی ${count} مورد هایلایت‌شده اصلاح گردید.`);
    }
  };

  // 1-Click Automated Text Cleanup: Removes consecutive duplicate words, extra spaces, and fixes half-spaces
  const handleAutoCleanMedicalText = useCallback(() => {
    if (isReportLocked) return;

    let totalDuplicates = 0;
    let totalSpaces = 0;
    let totalSpellZwnj = 0;

    studies.forEach((study) => {
      const titleRes = cleanMedicalTextWhitespaceAndDuplicates(study.titleAndTechnique, false);
      const currentFindings = findingsRefs.current[study.id]?.innerHTML || study.findingsHtml;
      const findingsRes = cleanMedicalTextWhitespaceAndDuplicates(currentFindings, true);
      const compRes = study.comparison
        ? cleanMedicalTextWhitespaceAndDuplicates(study.comparison, false)
        : { cleaned: study.comparison, duplicateWordsRemoved: 0, extraSpacesRemoved: 0, spellAndZwnjFixed: 0, totalFixes: 0 };
      const impRes = study.impressionHtml
        ? cleanMedicalTextWhitespaceAndDuplicates(study.impressionHtml, true)
        : { cleaned: study.impressionHtml, duplicateWordsRemoved: 0, extraSpacesRemoved: 0, spellAndZwnjFixed: 0, totalFixes: 0 };
      const recRes = study.recommendationsHtml
        ? cleanMedicalTextWhitespaceAndDuplicates(study.recommendationsHtml, true)
        : { cleaned: study.recommendationsHtml, duplicateWordsRemoved: 0, extraSpacesRemoved: 0, spellAndZwnjFixed: 0, totalFixes: 0 };

      totalDuplicates +=
        titleRes.duplicateWordsRemoved +
        findingsRes.duplicateWordsRemoved +
        compRes.duplicateWordsRemoved +
        impRes.duplicateWordsRemoved +
        recRes.duplicateWordsRemoved;

      totalSpaces +=
        titleRes.extraSpacesRemoved +
        findingsRes.extraSpacesRemoved +
        compRes.extraSpacesRemoved +
        impRes.extraSpacesRemoved +
        recRes.extraSpacesRemoved;

      totalSpellZwnj +=
        titleRes.spellAndZwnjFixed +
        findingsRes.spellAndZwnjFixed +
        compRes.spellAndZwnjFixed +
        impRes.spellAndZwnjFixed +
        recRes.spellAndZwnjFixed;

      const el = findingsRefs.current[study.id];
      if (el && el.innerHTML !== findingsRes.cleaned) {
        el.innerHTML = findingsRes.cleaned;
      }

      onUpdateStudy(study.id, {
        titleAndTechnique: titleRes.cleaned,
        findingsHtml: findingsRes.cleaned,
        comparison: compRes.cleaned,
        impressionHtml: impRes.cleaned,
        recommendationsHtml: recRes.cleaned,
      });
    });

    setDetectedIssues([]);
    setSelectedIssue(null);

    const totalAll = totalDuplicates + totalSpaces + totalSpellZwnj;
    if (onShowToast) {
      if (totalAll > 0) {
        const parts: string[] = [];
        if (totalDuplicates > 0) parts.push(`${totalDuplicates} کلمه تکراری متوالی`);
        if (totalSpaces > 0) parts.push(`${totalSpaces} فاصله اضافه`);
        if (totalSpellZwnj > 0) parts.push(`${totalSpellZwnj} مورد املا و نیم‌فاصله`);
        onShowToast(`✨ پاکسازی خودکار متن انجام شد: ${parts.join('، ')} اصلاح و حذف گردید.`);
      } else {
        onShowToast('✓ متن گزارش کاملاً تمیز است (کلمه تکراری، فاصله اضافه یا خطای نیم‌فاصله یافت نشد).');
      }
    }
  }, [studies, isReportLocked, onUpdateStudy, onShowToast]);

  // Global keyboard shortcut: Alt + C -> Highlight Spell & Half-Space Issues
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'c' || e.key === 'C' || e.key === 'ز')) {
        e.preventDefault();
        handleHighlightSpellIssues();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleHighlightSpellIssues]);

  // Insert a Smart Number Slot at the cursor in the active study
  const handleInsertSlotAtCursor = (label: string, defaultValue: string, unit = '') => {
    const studyId = activeStudyId || studies[0]?.id;
    if (!studyId) return;
    const el = findingsRefs.current[studyId];
    const slotId = `slot-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const slotHtml = createSlotHtml(label, defaultValue, slotId) + (unit ? ` ${unit} ` : ' ');

    if (el) {
      el.focus();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && el.contains(selection.anchorNode)) {
        document.execCommand('insertHTML', false, slotHtml);
      } else {
        el.innerHTML += ` ${slotHtml}`;
      }
      onUpdateStudy(studyId, { findingsHtml: el.innerHTML });
    }

    setShowSlotInsertMenu(false);
    setActiveSlotId(slotId);
    setTimeout(() => {
      const inp = slotInputRefs.current[slotId];
      if (inp) {
        inp.focus();
        inp.select();
      }
    }, 60);

    if (onShowToast) {
      onShowToast(`فیلد جایگذاری «${label}» درج شد. می‌توانید عدد را در کادر بالای گزارش تایپ کنید.`);
    }
  };

  // Convert all numbers/dimensions in a study into protected fillable slots
  const handleAutoWrapStudyNumbers = (study: ReportStudy) => {
    const currentHtml = findingsRefs.current[study.id]?.innerHTML || study.findingsHtml;
    const { updatedHtml, count } = autoWrapNumbersAsSlotsInHtml(currentHtml);
    if (count > 0) {
      const el = findingsRefs.current[study.id];
      if (el) {
        el.innerHTML = updatedHtml;
      }
      onUpdateStudy(study.id, { findingsHtml: updatedHtml });
      if (onShowToast) {
        onShowToast(`⚡ ${count} عدد و اندازه در متن به فیلد جایگذاری امن تبدیل شد.`);
      }
    } else if (onShowToast) {
      onShowToast('تمامی اعداد این گزارش از قبل دارای فیلد جایگذاری هستند.');
    }
  };

  // Update a specific slot's value in-place without disturbing the rest of the HTML
  const handleUpdateSlotValue = (study: ReportStudy, slotId: string, newValue: string) => {
    const el = findingsRefs.current[study.id];
    if (el) {
      const slotSpan = el.querySelector(`span[data-slot-id="${slotId}"]`);
      if (slotSpan) {
        slotSpan.textContent = newValue || '---';
        onUpdateStudy(study.id, { findingsHtml: el.innerHTML });
        return;
      }
    }
    // Fallback regex update on HTML string
    const escapedId = slotId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const reg = new RegExp(
      `(<span\\b[^>]*data-slot-id="${escapedId}"[^>]*>)[\\s\\S]*?(<\\/span>)`,
      'i'
    );
    const updatedHtml = study.findingsHtml.replace(reg, `$1${newValue || '---'}$2`);
    if (el) {
      el.innerHTML = updatedHtml;
    }
    onUpdateStudy(study.id, { findingsHtml: updatedHtml });
  };

  // Detect if user clicked on a highlighted <mark data-spell-issue="true"> or a <span data-slot="true"> inside the editor
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>, studyId: string) => {
    setActiveStudyId(studyId);
    const target = e.target as HTMLElement;

    // 1. Check if user clicked on a Smart Number Slot (<span data-slot="true">) when enabled
    if (numberSlotsEnabled) {
      const slotEl = target.closest('span[data-slot="true"]') as HTMLElement | null;
      if (slotEl) {
        const slotId = slotEl.getAttribute('data-slot-id') || '';
        document.querySelectorAll('span.active-rad-slot').forEach((s) => s.classList.remove('active-rad-slot'));
        slotEl.classList.add('active-rad-slot');
        setActiveSlotId(slotId);
        const inp = slotInputRefs.current[slotId];
        if (inp) {
          inp.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          inp.focus();
          inp.select();
        }
        return;
      }
    }

    // 2. Check if user clicked on a Spell Issue Highlight (<mark data-spell-issue="true">)
    const markEl = target.closest('mark[data-spell-issue="true"]') as HTMLElement | null;
    if (markEl) {
      const spellId = markEl.getAttribute('data-spell-id') || '';
      const original = markEl.getAttribute('data-original') || markEl.textContent || '';
      const suggestion = markEl.getAttribute('data-suggestion') || '';
      const ruleLabel = markEl.getAttribute('data-label') || 'پیشنهاد اصلاح املا و نیم‌فاصله';

      // Highlight active mark visually
      document.querySelectorAll('mark.active-spell-issue').forEach((m) => m.classList.remove('active-spell-issue'));
      markEl.classList.add('active-spell-issue');

      const found = detectedIssues.find((i) => i.id === spellId) || {
        id: spellId,
        studyId,
        field: 'findings',
        original,
        suggestion,
        ruleLabel,
      };
      setSelectedIssue(found);
    }
  };

  // Detect if user is typing a shortcut trigger like `.abd` or `.nl` right before the cursor
  const detectPendingShortcut = (el: HTMLDivElement) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setPendingShortcutMatch(null);
      return;
    }
    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE && node.textContent) {
      const textBefore = node.textContent.slice(0, range.startOffset);
      const match = textBefore.match(/(\.[a-zA-Z0-9_]+)$/);
      if (match) {
        const typedTrigger = match[1].toLowerCase();
        const found = shortcuts.find(
          (s) => s.trigger.toLowerCase() === typedTrigger || s.trigger.toLowerCase().startsWith(typedTrigger)
        );
        setPendingShortcutMatch(found || null);
        return;
      }
    }
    setPendingShortcutMatch(null);
  };

  // Handle findings keydown:
  // 1. Space -> Instant Auto-Text Expander for `.abd`, `.nl`, `.gb`, etc. (preserving caret!)
  // 2. Tab -> Expand shortcut if matched, or accept AI ghost suggestion
  const handleFindingsKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    study: ReportStudy
  ) => {
    const el = findingsRefs.current[study.id];
    if (!el) return;

    if (e.key === ' ' || e.key === 'Tab' || e.key === 'Enter') {
      const result = expandShortcutInContentEditable(el, shortcuts);
      if (result.expanded) {
        e.preventDefault();
        setPendingShortcutMatch(null);
        onUpdateStudy(study.id, { findingsHtml: el.innerHTML });
        if (onShowToast && result.trigger) {
          onShowToast(`⚡ شورتکات «${result.trigger}» (${result.label}) جایگزین شد.`);
        }
        return;
      }
    }

    if (e.key === 'Tab' && ghostSuggestion) {
      e.preventDefault();
      insertSuggestionAtCursor(` ${ghostSuggestion} `, study.id);
      return;
    }
  };

  // Handle Title & Technique Textarea KeyDown (Supports `.abd` + Space in Title box too!)
  const handleTitleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    study: ReportStudy
  ) => {
    if (e.key === ' ' || e.key === 'Tab') {
      const el = e.currentTarget;
      const res = expandShortcutInInput(el, shortcuts);
      if (res.expanded) {
        e.preventDefault();
        onUpdateStudy(study.id, { titleAndTechnique: res.newValue });
        setTimeout(() => {
          el.setSelectionRange(res.newCursorPos, res.newCursorPos);
        }, 0);
        if (onShowToast && res.trigger) {
          onShowToast(`⚡ شورتکات «${res.trigger}» در عنوان جایگزین شد.`);
        }
      }
    }
  };

  const handleFindingsInput = (study: ReportStudy) => {
    const el = findingsRefs.current[study.id];
    if (!el) return;

    detectPendingShortcut(el);

    const html = el.innerHTML;
    onUpdateStudy(study.id, { findingsHtml: html });

    const plainText = el.innerText || '';
    updateSuggestions(plainText, study);
  };

  const insertShortcut = (shortcut: MedicalShortcut) => {
    insertSuggestionAtCursor(`${shortcut.expansion} `, activeStudyId);
  };

  const handleGenerateImpression = async (study: ReportStudy) => {
    setGeneratingImpressionId(study.id);
    try {
      const generatedHtml = await AiService.generateImpressionFromFindings(
        study.modality,
        study.findingsHtml,
        patientInfo
      );
      onUpdateStudy(study.id, {
        showImpression: true,
        impressionHtml: generatedHtml,
      });
    } finally {
      setGeneratingImpressionId(null);
    }
  };

  const activeStudy = studies.find((s) => s.id === activeStudyId) || studies[0];
  const currentModality: Modality = activeStudy?.modality || 'sonography';

  // Pinned templates filtered ONLY for the currently selected modality
  const pinnedTemplates = templates.filter(
    (t) => t.isPinned && t.modality === currentModality
  );

  // Global keyboard shortcuts:
  // 1. F1..F8 for Pinned Templates of the current modality
  // 2. Alt+F or F11 for Zen / Full Focus Typing Mode
  // 3. Custom Keyboard Hotkeys defined in ShortcutsModal (e.g., Alt+T, Alt+M, Alt+G)
  useEffect(() => {
    const handlePinnedAndCustomKeyDown = (e: KeyboardEvent) => {
      // Zen / Focus Mode: Alt+F or F11
      if (
        (e.altKey && (e.key === 'f' || e.key === 'F' || e.key === 'ب' || e.code === 'KeyF')) ||
        e.key === 'F11'
      ) {
        if (onToggleZenMode) {
          e.preventDefault();
          onToggleZenMode();
          return;
        }
      }

      // F1..F8 Pinned Templates
      if (/^F[1-8]$/.test(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const idx = parseInt(e.key.slice(1), 10) - 1;
        const targetPinned = pinnedTemplates[idx];
        if (targetPinned && onApplyPinnedTemplate) {
          e.preventDefault();
          onApplyPinnedTemplate(targetPinned, activeStudyId || studies[0]?.id || '');
          return;
        }
      }

      // Custom Hotkeys (e.g., Alt+T, Alt+M, Ctrl+Shift+1)
      if (e.altKey || e.ctrlKey || e.metaKey) {
        const parts: string[] = [];
        if (e.ctrlKey || e.metaKey) parts.push('ctrl');
        if (e.altKey) parts.push('alt');
        if (e.shiftKey) parts.push('shift');

        let keyChar = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
        if (e.code && e.code.startsWith('Key')) {
          keyChar = e.code.replace('Key', '').toLowerCase();
        } else if (e.code && e.code.startsWith('Digit')) {
          keyChar = e.code.replace('Digit', '').toLowerCase();
        }
        parts.push(keyChar);
        const pressedCombo = parts.join('+');

        const matchedShortcut = shortcuts.find(
          (sc) => sc.hotkey && sc.hotkey.toLowerCase() === pressedCombo
        );
        if (matchedShortcut) {
          e.preventDefault();
          const targetStudyId = activeStudyId || studies[0]?.id || '';
          if (matchedShortcut.targetTemplateId && onApplyPinnedTemplate) {
            const matchedTpl = templates.find((t) => t.id === matchedShortcut.targetTemplateId);
            if (matchedTpl) {
              onApplyPinnedTemplate(matchedTpl, targetStudyId);
              if (onShowToast) {
                onShowToast(
                  `⌨️ کلید میانبر «${matchedShortcut.hotkey}»: قالب «${matchedTpl.title}» اعمال شد.`
                );
              }
              return;
            }
          }
          insertSuggestionAtCursor(`${matchedShortcut.expansion} `, targetStudyId);
          if (onShowToast) {
            onShowToast(
              `⌨️ کلید میانبر «${matchedShortcut.hotkey}» (${matchedShortcut.label}) درج شد.`
            );
          }
        }
      }
    };
    window.addEventListener('keydown', handlePinnedAndCustomKeyDown);
    return () => window.removeEventListener('keydown', handlePinnedAndCustomKeyDown);
  }, [
    pinnedTemplates,
    templates,
    onApplyPinnedTemplate,
    activeStudyId,
    studies,
    shortcuts,
    insertSuggestionAtCursor,
    onShowToast,
    onToggleZenMode,
  ]);

  // Floating Selection Formatting Toolbar tracker inside active contentEditable
  useEffect(() => {
    const updateFloatingToolbar = () => {
      if (isInteractingWithFloatingRef.current) {
        return;
      }
      const sel = window.getSelection();
      const activeEl = findingsRefs.current[activeStudyId];
      if (
        !sel ||
        sel.isCollapsed ||
        sel.rangeCount === 0 ||
        !activeEl ||
        !activeEl.contains(sel.anchorNode)
      ) {
        setFloatingToolbarPos(null);
        return;
      }
      const selectedText = sel.toString().trim();
      if (!selectedText) {
        setFloatingToolbarPos(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setFloatingToolbarPos(null);
        return;
      }

      const viewportW = document.documentElement.clientWidth || window.innerWidth;
      const editorRect = activeEl.getBoundingClientRect();
      const toolbarW = floatingToolbarRef.current?.offsetWidth || 450;
      const toolbarH = floatingToolbarRef.current?.offsetHeight || 38;

      // Keep toolbar strictly inside both the viewport and the active editor horizontal boundaries
      const idealLeft = rect.left + rect.width / 2 - toolbarW / 2;
      const minLeft = Math.max(12, editorRect.left + 8);
      const maxLeft = Math.min(
        viewportW - toolbarW - 12,
        Math.max(minLeft, editorRect.right - toolbarW - 8)
      );
      const left = Math.max(12, Math.min(maxLeft, Math.max(minLeft, idealLeft)));

      // Prevent toolbar from hiding under top sticky bars when selecting the first line
      const quickbarBottom =
        document.getElementById('app-editor-quickbar')?.getBoundingClientRect().bottom || 0;
      const tabsbarBottom =
        document.getElementById('app-patient-tabs-bar')?.getBoundingClientRect().bottom || 0;
      const navbarBottom =
        document.getElementById('app-main-navbar')?.getBoundingClientRect().bottom || 0;
      const minAllowedTop = Math.max(quickbarBottom, tabsbarBottom, navbarBottom, 12) + 6;

      let top = rect.top - toolbarH - 8;
      if (top < minAllowedTop) {
        top = rect.bottom + 8;
      }

      setFloatingToolbarPos({ top, left });
    };

    document.addEventListener('selectionchange', updateFloatingToolbar);
    window.addEventListener('resize', updateFloatingToolbar);
    window.addEventListener('scroll', updateFloatingToolbar, true);
    return () => {
      document.removeEventListener('selectionchange', updateFloatingToolbar);
      window.removeEventListener('resize', updateFloatingToolbar);
      window.removeEventListener('scroll', updateFloatingToolbar, true);
    };
  }, [activeStudyId]);

  // Post-render exact pixel boundary check so the floating toolbar never overflows on the first frame
  useEffect(() => {
    if (!floatingToolbarPos || !floatingToolbarRef.current) return;
    const el = floatingToolbarRef.current;
    const r = el.getBoundingClientRect();
    const viewportW = document.documentElement.clientWidth || window.innerWidth;
    const activeEl = findingsRefs.current[activeStudyId];
    const editorRight = activeEl
      ? Math.min(viewportW - 12, activeEl.getBoundingClientRect().right - 8)
      : viewportW - 12;

    let adjustedLeft = floatingToolbarPos.left;
    if (r.right > editorRight) {
      adjustedLeft -= r.right - editorRight;
    }
    if (adjustedLeft < 12) {
      adjustedLeft = 12;
    }
    if (Math.abs(adjustedLeft - floatingToolbarPos.left) > 1) {
      setFloatingToolbarPos((prev) => (prev ? { ...prev, left: adjustedLeft } : null));
    }
  }, [floatingToolbarPos, activeStudyId]);

  const executeFloatingFormat = (command: string, value?: string) => {
    if (onExecCommand) {
      onExecCommand(command, value);
    } else {
      document.execCommand(command, false, value);
    }
  };

  // Apply direction (RTL or LTR) to the selected block/paragraph from Floating Toolbar
  const applyFloatingDirection = (dir: 'rtl' | 'ltr') => {
    const activeEl = findingsRefs.current[activeStudyId];
    if (activeEl) {
      activeEl.focus();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const node = sel.anchorNode;
        const el =
          node?.nodeType === Node.ELEMENT_NODE
            ? (node as HTMLElement)
            : node?.parentElement;
        const block = el?.closest('p, div, li, h1, h2, h3, h4, td') as HTMLElement | null;
        if (block && activeEl.contains(block) && block !== activeEl) {
          block.setAttribute('dir', dir);
          block.style.direction = dir;
          block.style.textAlign = dir === 'rtl' ? 'right' : 'left';
        } else {
          activeEl.setAttribute('dir', dir);
          activeEl.style.direction = dir;
        }
        onUpdateStudy(activeStudyId, { findingsHtml: activeEl.innerHTML });
      }
    }
  };

  // Proposal #2: Real-Time Laterality (Right vs Left) Mismatch Detection
  const lateralityMismatches = useMemo(() => {
    return detectLateralityMismatches(studies);
  }, [studies]);

  // Proposal #6: Real-Time Visual A4 Page Capacity & Multi-Page Pagination Meter (100% synchronized with PrintPreviewModal)
  const a4PageMetrics = useMemo(() => {
    return paginateStudiesIntoA4Pages(studies, {
      defaultFontSize: defaultFontSize || 14,
      printLineHeight: printLineHeight || 1.75,
    });
  }, [studies, defaultFontSize, printLineHeight]);

  const handleAutoFixLaterality = (studyId: string, expectedSide: 'right' | 'left') => {
    const target = studies.find((s) => s.id === studyId);
    if (!target) return;
    const fixedFindings = fixStudyLateralityMismatch(target.findingsHtml, expectedSide);
    const fixedImpression = fixStudyLateralityMismatch(target.impressionHtml, expectedSide);
    const el = findingsRefs.current[studyId];
    if (el) {
      el.innerHTML = fixedFindings;
    }
    onUpdateStudy(studyId, {
      findingsHtml: fixedFindings,
      impressionHtml: fixedImpression,
    });
    if (onShowToast) {
      onShowToast(
        `✓ جهت آناتومیک در متن گزارش متناسب با عنوان به «سمت ${
          expectedSide === 'right' ? 'راست' : 'چپ'
        }» اصلاح شد.`
      );
    }
  };

  // Match prior reports for the current patient (by nationalId or fullName)
  const patientPriorReports = useMemo(() => {
    const cleanNid = (patientInfo.nationalId || '').trim();
    const cleanName = (patientInfo.fullName || '').trim();
    const matched = savedReports.filter((r) => {
      if (cleanNid && r.patientInfo?.nationalId?.trim() === cleanNid) return true;
      if (cleanName.length >= 3 && r.patientInfo?.fullName?.trim() === cleanName) return true;
      return false;
    });
    return matched.length > 0 ? matched : savedReports;
  }, [savedReports, patientInfo.nationalId, patientInfo.fullName]);

  const exactPatientPriorCount = useMemo(() => {
    const cleanNid = (patientInfo.nationalId || '').trim();
    const cleanName = (patientInfo.fullName || '').trim();
    if (!cleanNid && cleanName.length < 3) return 0;
    return savedReports.filter((r) => {
      if (cleanNid && r.patientInfo?.nationalId?.trim() === cleanNid) return true;
      if (cleanName.length >= 3 && r.patientInfo?.fullName?.trim() === cleanName) return true;
      return false;
    }).length;
  }, [savedReports, patientInfo.nationalId, patientInfo.fullName]);

  const activePriorReport = useMemo(() => {
    return (
      patientPriorReports.find((r) => r.id === selectedPriorReportId) ||
      patientPriorReports[0] ||
      null
    );
  }, [patientPriorReports, selectedPriorReportId]);

  const handleCopyPriorToComparison = (priorRep: MedicalReport) => {
    const targetStudy = studies.find((s) => s.id === activeStudyId) || studies[0];
    if (!targetStudy) return;
    const priorStudy = priorRep.studies?.[0];
    const priorPlain = (priorStudy?.impressionHtml || priorStudy?.findingsHtml || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 220);
    const compText = `در مقایسه با بررسی پیشین مورخ ${priorRep.patientInfo?.reportDate || 'قبلی'}: ${priorPlain}`;
    onUpdateStudy(targetStudy.id, {
      showComparison: true,
      comparison: compText,
    });
    setExpandedMoreInfo((prev) => ({ ...prev, [targetStudy.id]: true }));
    if (onShowToast) {
      onShowToast('✓ خلاصه گزارش قبلی در بخش مقایسه (Comparison) گزارش فعلی درج شد.');
    }
  };

  const filteredShortcuts = shortcuts.filter((sc) => {
    const matchesModality = !sc.modality || sc.modality === 'all' || sc.modality === activeStudy?.modality;
    const matchesCat = quickMacroFilter === 'all' || sc.category === quickMacroFilter;
    return matchesModality && matchesCat;
  });

  const modalityNames: Record<Modality, string> = {
    sonography: 'سونوگرافی',
    mri: 'ام‌آر‌آی',
    ct: 'سی‌تی‌اسکن',
  };

  const modalityThemes: Record<
    Modality,
    {
      primaryBtn: string;
      secondaryBtn: string;
      pinStripBg: string;
      pinLabel: string;
      pinChip: string;
      pinDot: string;
      studyHeaderBg: string;
      studyBadge: string;
      activeCardRing: string;
    }
  > = {
    sonography: {
      primaryBtn: 'bg-sky-600 hover:bg-sky-700 text-white border-sky-600 shadow-xs shadow-sky-600/20',
      secondaryBtn: 'bg-sky-50 hover:bg-sky-100 text-sky-900 border-sky-200 hover:border-sky-300',
      pinStripBg: 'bg-sky-50/85 border-sky-200/90',
      pinLabel: 'text-sky-900',
      pinChip: 'bg-white hover:bg-sky-600 text-slate-700 hover:text-white border-sky-200 hover:border-sky-600',
      pinDot: 'bg-sky-500 group-hover:bg-white',
      studyHeaderBg: 'bg-gradient-to-l from-slate-900 via-slate-900 to-sky-950 border-b border-sky-900/50',
      studyBadge: 'bg-sky-500 text-white',
      activeCardRing: 'border-sky-500 ring-2 ring-sky-500/15',
    },
    mri: {
      primaryBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-xs shadow-indigo-600/20',
      secondaryBtn: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-200 hover:border-indigo-300',
      pinStripBg: 'bg-indigo-50/85 border-indigo-200/90',
      pinLabel: 'text-indigo-900',
      pinChip: 'bg-white hover:bg-indigo-600 text-slate-700 hover:text-white border-indigo-200 hover:border-indigo-600',
      pinDot: 'bg-indigo-500 group-hover:bg-white',
      studyHeaderBg: 'bg-gradient-to-l from-slate-900 via-slate-900 to-indigo-950 border-b border-indigo-900/50',
      studyBadge: 'bg-indigo-500 text-white',
      activeCardRing: 'border-indigo-500 ring-2 ring-indigo-500/15',
    },
    ct: {
      primaryBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs shadow-emerald-600/20',
      secondaryBtn: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200 hover:border-emerald-300',
      pinStripBg: 'bg-emerald-50/85 border-emerald-200/90',
      pinLabel: 'text-emerald-900',
      pinChip: 'bg-white hover:bg-emerald-600 text-slate-700 hover:text-white border-emerald-200 hover:border-emerald-600',
      pinDot: 'bg-emerald-500 group-hover:bg-white',
      studyHeaderBg: 'bg-gradient-to-l from-slate-900 via-slate-900 to-emerald-950 border-b border-emerald-900/50',
      studyBadge: 'bg-emerald-500 text-white',
      activeCardRing: 'border-emerald-500 ring-2 ring-emerald-500/15',
    },
  };

  const activeTheme = modalityThemes[currentModality];

  return (
    <div className="w-full max-w-[1680px] 2xl:max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-2 space-y-3">
      {/* 
        STICKY TYPING TOOLS, SPELL/HALF-SPACE HIGHLIGHTER & SLIM MODALITY-COLORED PINNED TEMPLATES
        Stays pinned cleanly below Navbar + EditorToolbar as the user scrolls down through the report!
      */}
      <div
        id="app-editor-quickbar"
        style={{
          top: 'calc(var(--navbar-height, 102px) + var(--tabsbar-height, 44px))',
        }}
        className="w-full sticky z-20 bg-slate-100/95 backdrop-blur-md pt-0.5 pb-1 space-y-1 border-b border-slate-200/80 shadow-2xs no-print transition-all duration-200"
      >
        {/* Slim Height (h-7) Quick Access Bar harmonized with active Modality Color */}
        <div className="bg-white rounded-xl px-2 py-1 border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => onOpenTemplates(activeStudyId)}
              className={`h-7 px-2.5 rounded-lg inline-flex items-center justify-center gap-1.5 text-[11px] font-bold border whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer ${activeTheme.primaryBtn}`}
              title="مشاهده و درج قالب‌های آماده پزشکان برای این تصویربرداری"
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>قالب‌های آماده ({modalityNames[currentModality]})</span>
            </button>

            {/* Direct 1-Click Save Current Report as Ready Template */}
            {onStartQuickSaveAsTemplate && (
              <button
                type="button"
                onClick={() => onStartQuickSaveAsTemplate(activeStudyId || studies[0]?.id || '')}
                className={`h-7 px-2.5 rounded-lg inline-flex items-center justify-center gap-1.5 text-[11px] font-bold border whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer ${activeTheme.secondaryBtn}`}
                title="ذخیره مستقیم متن تایپ‌شده فعلی به عنوان قالب آماده جدید (در یک مرحله)"
              >
                <BookmarkPlus className="w-3.5 h-3.5 shrink-0" />
                <span>+ ذخیره گزارش در قالب‌ها</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenShortcuts}
              className="h-7 px-2.5 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg inline-flex items-center justify-center gap-1.5 text-[11px] font-bold whitespace-nowrap shadow-2xs transition-all duration-200 active:scale-95 cursor-pointer"
              title="مدیریت کدهای شورتکات و جملات پرکاربرد (جایگزینی خودکار با کلید Space)"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>شورتکات‌ها و ماکروها (Space)</span>
            </button>

            {/* Insert Smart Number / Measurement Slot Dropdown (Only when enabled in Settings) */}
            {numberSlotsEnabled && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSlotInsertMenu((prev) => !prev)}
                  className="h-7 px-2.5 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 hover:border-sky-300 rounded-lg inline-flex items-center justify-center gap-1.5 text-[11px] font-bold whitespace-nowrap shadow-2xs transition-all duration-200 cursor-pointer active:scale-95"
                  title="افزودن فیلد جایگذاری عدد در متن فایل خام بدون به هم ریختن متن"
                >
                  <Hash className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>+ درج فیلد عدد</span>
                  <ChevronDown className="w-3 h-3 text-sky-600 shrink-0" />
                </button>

                {showSlotInsertMenu && (
                  <div className="absolute right-0 mt-1.5 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3.5 z-50 text-xs space-y-3 animate-scaleIn">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="font-black text-slate-800">درج جایگذاری عدد در محل نشانگر</span>
                      <button
                        type="button"
                        onClick={() => setShowSlotInsertMenu(false)}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Custom Slot Builder */}
                    <div className="bg-sky-50/70 p-2.5 rounded-xl border border-sky-200 space-y-2">
                      <div className="text-[11px] font-bold text-sky-950">ایجاد جایگذاری دلخواه در فایل خام:</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          value={customSlotLabel}
                          onChange={(e) => setCustomSlotLabel(e.target.value)}
                          placeholder="نام (مثلاً: سایز کلیه)"
                          className="text-xs px-2 py-1.5 rounded-lg border border-sky-200 bg-white"
                        />
                        <input
                          type="text"
                          value={customSlotValue}
                          onChange={(e) => setCustomSlotValue(e.target.value)}
                          placeholder="عدد اولیه (۱۱۰)"
                          dir="ltr"
                          className="text-xs px-2 py-1.5 rounded-lg border border-sky-200 bg-white font-mono text-center"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleInsertSlotAtCursor(
                            customSlotLabel.trim() || 'مقدار عددی',
                            customSlotValue.trim() || '---'
                          )
                        }
                        className="w-full py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        + درج در متن گزارش
                      </button>
                    </div>

                    {/* Preset Radiology Slots */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-600 mb-1.5">
                        فیلدهای آماده پرتکرار پرتوپزشکی:
                      </div>
                      <div className="max-h-52 overflow-y-auto space-y-1 pr-0.5">
                        {PRESET_RADIOLOGY_SLOTS.map((item, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleInsertSlotAtCursor(item.label, item.defaultValue, item.unit)}
                            className="w-full text-right px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-sky-50 text-slate-700 hover:text-sky-900 border border-slate-100 hover:border-sky-200 flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <span className="font-semibold">{item.label}</span>
                            <span className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-slate-200 text-sky-700" dir="ltr">
                              {item.defaultValue} {item.unit}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Spell & Half-Space Checker + 1-Click Automated Text Cleanup Group */}
            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={handleHighlightSpellIssues}
                className="h-7 px-2.5 hover:bg-amber-50 text-slate-700 hover:text-amber-900 inline-flex items-center justify-center gap-1.5 text-[11px] font-bold whitespace-nowrap transition-colors duration-150 cursor-pointer"
                title="هایلایت کردن غلط‌های املایی، نیم‌فاصله‌ها و کلمات تکراری در متن (Alt+C)"
              >
                <SpellCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>بررسی املا و نیم‌فاصله</span>
                <kbd className="bg-slate-100 text-slate-600 border border-slate-200 px-1 py-0.2 rounded text-[9.5px] font-mono">
                  Alt+C
                </kbd>
              </button>
              <div className="w-px h-4 bg-slate-200" />
              <button
                type="button"
                onClick={handleAutoCleanMedicalText}
                className="h-7 px-2.5 bg-teal-50/70 hover:bg-teal-600 text-teal-800 hover:text-white inline-flex items-center justify-center gap-1 text-[11px] font-bold whitespace-nowrap transition-colors duration-150 cursor-pointer"
                title="پاکسازی خودکار متن با یک کلیک: حذف کلمات تکراری متوالی، حذف فاصله‌های اضافه (Space) و اصلاح نیم‌فاصله‌ها"
              >
                <Wand2 className="w-3 h-3 shrink-0" />
                <span>پاکسازی خودکار متن</span>
              </button>
            </div>

            {/* Split-Screen Prior Report Comparison Toggle */}
            <button
              type="button"
              onClick={() => setIsSplitComparisonOpen((prev) => !prev)}
              className={`h-7 px-2.5 rounded-lg inline-flex items-center justify-center gap-1.5 text-[11px] font-bold border whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95 ${
                isSplitComparisonOpen
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : exactPatientPriorCount > 0
                  ? 'bg-indigo-50 text-indigo-900 border-indigo-300 hover:bg-indigo-100'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="نمای دوبرگه کنار هم: مشاهده گزارش قبلی بیمار در کنار گزارش فعلی و مقایسه یافته‌ها"
            >
              <Columns className="w-3.5 h-3.5 shrink-0" />
              <span>
                مقایسه گزارش قبلی
                {exactPatientPriorCount > 0 ? ` (${exactPatientPriorCount} سابقه)` : ''}
              </span>
            </button>

            {/* Zen / Full Focus Typing Mode Toggle (Alt+F) */}
            {onToggleZenMode && (
              <button
                type="button"
                onClick={onToggleZenMode}
                className={`h-7 px-2.5 rounded-lg inline-flex items-center justify-center gap-1.5 text-[11px] font-bold border whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95 ${
                  zenMode
                    ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title="حالت تمرکز کامل تایپ: مخفی کردن پنل‌های جانبی و مشخصات بیمار برای تمرکز ۱۰۰٪ روی متن (Alt+F)"
              >
                {zenMode ? (
                  <Minimize2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{zenMode ? 'خروج از تمرکز (Alt+F)' : 'حالت تمرکز تایپ (Alt+F)'}</span>
              </button>
            )}

            {/* Proposal #12: Version History Quick Button (Shown when report has saved revisions) */}
            {reportRevisions.length > 0 && (
              <button
                type="button"
                onClick={() => setIsVersionHistoryModalOpen(true)}
                className="h-7 px-2.5 rounded-lg inline-flex items-center justify-center gap-1.5 text-[11px] font-bold border bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-200 whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95"
                title="مشاهده تاریخچه نسخه‌ها و اصلاحیه‌های این گزارش و بازگردانی به نسخه قبلی"
              >
                <History className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>تاریخچه نسخه‌ها ({reportRevisions.length})</span>
              </button>
            )}
          </div>

          {/* One-Click Convert All Numbers in Current Raw Template to Safe Slots */}
          {numberSlotsEnabled && activeStudy && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAutoWrapStudyNumbers(activeStudy)}
                className="h-7 px-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg inline-flex items-center justify-center gap-1.5 text-[11px] font-bold whitespace-nowrap shadow-xs transition-all duration-200 cursor-pointer active:scale-95"
                title="تمام اعداد و اندازه‌های موجود در متن فعلی را به کادرهای جایگذاری مجزا تبدیل می‌کند"
              >
                <SlidersHorizontal className="w-3 h-3 text-sky-200 shrink-0" />
                <span>تبدیل اعداد به فیلد</span>
              </button>
            </div>
          )}
        </div>

        {/* 
          PINNED TEMPLATES STRIP (Harmonized with Active Modality Color + Hospital Mouse Scroll & Multi-Line Wrap)
        */}
        {pinnedTemplates.length > 0 && (
          <div
            className={`rounded-xl px-2.5 py-1 border flex items-center justify-between gap-1.5 transition-colors duration-200 ${activeTheme.pinStripBg}`}
          >
            {/* Scroll Right Arrow Button (for Hospital Mice) */}
            {!isPinsMultiLineWrap && pinnedTemplates.length > 3 && (
              <button
                type="button"
                onClick={() => scrollPinsBy('right')}
                title="اسکرول سنجاق‌ها به راست (با چرخ موس هم می‌توانید روی سنجاق‌ها اسکرول کنید)"
                className="w-6 h-6 rounded-md bg-white/80 hover:bg-white text-slate-700 border border-slate-200/80 flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-colors shadow-2xs"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            <div
              ref={pinsScrollRef}
              onWheel={handleWheelPinsScroll}
              className={`flex items-center gap-1 flex-1 py-0.5 ${
                isPinsMultiLineWrap
                  ? 'flex-wrap'
                  : 'overflow-x-auto no-scrollbar scroll-smooth'
              }`}
            >
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold ml-1 shrink-0 whitespace-nowrap ${activeTheme.pinLabel}`}
              >
                <Pin className="w-3 h-3 shrink-0" />
                <span>سنجاق‌های {modalityNames[currentModality]}:</span>
              </span>

              {pinnedTemplates.map((tpl, idx) => (
                <div
                  key={tpl.id}
                  className={`group h-6 inline-flex items-center rounded-md border text-[11px] font-bold transition-all duration-150 shrink-0 overflow-hidden ${activeTheme.pinChip}`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      onApplyPinnedTemplate &&
                      onApplyPinnedTemplate(tpl, activeStudyId || studies[0]?.id || '')
                    }
                    title={
                      idx < 8
                        ? `اعمال فوری قالب «${tpl.title}» (کلید میانبر: F${idx + 1})`
                        : `اعمال فوری قالب «${tpl.title}»`
                    }
                    className="h-full inline-flex items-center gap-1 px-2 cursor-pointer whitespace-nowrap"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full transition-colors ${activeTheme.pinDot}`} />
                    <span>{tpl.title}</span>
                    {idx < 8 && (
                      <span className="text-[9px] font-mono opacity-65">F{idx + 1}</span>
                    )}
                  </button>

                  {onTogglePinTemplate && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePinTemplate(tpl.id);
                      }}
                      title="برداشتن سنجاق"
                      className="h-full px-1 opacity-50 hover:opacity-100 hover:bg-rose-500 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Scroll Left Arrow Button (for Hospital Mice) */}
              {!isPinsMultiLineWrap && pinnedTemplates.length > 3 && (
                <button
                  type="button"
                  onClick={() => scrollPinsBy('left')}
                  title="اسکرول سنجاق‌ها به چپ (با چرخ موس هم می‌توانید روی سنجاق‌ها اسکرول کنید)"
                  className="w-6 h-6 rounded-md bg-white/80 hover:bg-white text-slate-700 border border-slate-200/80 flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-colors shadow-2xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Multi-Line Wrap Toggle Button */}
              {pinnedTemplates.length > 3 && (
                <button
                  type="button"
                  onClick={() => setIsPinsMultiLineWrap((prev) => !prev)}
                  title={
                    isPinsMultiLineWrap
                      ? 'بازگشت به نمایش تک‌خطی سنجاق‌ها'
                      : 'نمایش چندخطی همه سنجاق‌ها (بدون نیاز به اسکرول افقی)'
                  }
                  className={`h-6 px-1.5 rounded-md border text-[10px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                    isPinsMultiLineWrap
                      ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                      : 'bg-white/80 hover:bg-white text-slate-700 border-slate-200/80'
                  }`}
                >
                  <LayoutGrid className="w-3 h-3" />
                  <span className="hidden sm:inline">
                    {isPinsMultiLineWrap ? 'تک‌خطی' : 'همه سنجاق‌ها'}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onOpenTemplates(activeStudyId)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md hover:bg-white/70 transition-colors cursor-pointer shrink-0 whitespace-nowrap ${activeTheme.pinLabel}`}
              >
                + مدیریت
              </button>
            </div>
          </div>
        )}

        {/* 
          INTERACTIVE HIGHLIGHTED SPELL & HALF-SPACE SUGGESTION PANEL
          Appears inside the sticky header when Alt+C highlights words or when the user clicks a highlighted word!
        */}
        {(detectedIssues.length > 0 || selectedIssue) && (
          <div className="bg-amber-50/95 border-2 border-amber-300 rounded-2xl p-3 shadow-md space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
                  {detectedIssues.length}
                </div>
                <div>
                  <h4 className="text-xs font-black text-amber-950">
                    موارد هایلایت‌شده املایی و نیم‌فاصله در متن گزارش
                  </h4>
                  <p className="text-[11px] text-amber-800">
                    روی هر کلمه زردرنگ در متن (یا دکمه‌های زیر) کلیک کنید تا پیشنهاد جایگزین را مشاهده و تایید نمایید:
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleAutoCleanMedicalText}
                  className="px-3 py-1 bg-slate-900 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                  title="حذف کلمات تکراری متوالی، فاصله‌های اضافه و اصلاح یکجای املا و نیم‌فاصله‌ها"
                >
                  <Wand2 className="w-3.5 h-3.5 text-teal-300" />
                  <span>پاکسازی خودکار متن (کلمات تکراری و فاصله اضافه)</span>
                </button>
                {detectedIssues.length > 1 && (
                  <button
                    type="button"
                    onClick={handleAcceptAllIssues}
                    className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>پذیرش همه ({detectedIssues.length})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClearAllHighlights}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-amber-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>پاک کردن هایلایت‌ها</span>
                </button>
              </div>
            </div>

            {/* All Highlighted Words Pills (Click to select & inspect) */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {detectedIssues.map((iss) => {
                const isSelected = selectedIssue?.id === iss.id;
                return (
                  <button
                    key={iss.id}
                    type="button"
                    onClick={() => setSelectedIssue(iss)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs scale-105'
                        : 'bg-white text-rose-800 border-amber-300 hover:bg-amber-100/70'
                    }`}
                  >
                    <span className="underline decoration-wavy decoration-rose-500">{iss.original}</span>
                    <span className="text-[10px] opacity-75">⬅</span>
                    <span className={isSelected ? 'text-teal-300' : 'text-teal-700'}>{iss.suggestion}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Selected Highlighted Word Suggestion Box */}
            {selectedIssue && (
              <div className="bg-white rounded-xl p-2.5 border border-amber-300 flex items-center justify-between flex-wrap gap-3 shadow-2xs">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-slate-500 font-medium">
                    عبارت انتخاب‌شده ({selectedIssue.field === 'title' ? 'در عنوان' : 'در متن گزارش'}):
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 font-bold text-xs line-through">
                    {selectedIssue.original}
                  </span>
                  <span className="text-slate-400 font-bold">⬅</span>
                  <span className="text-xs text-slate-600 font-medium">پیشنهاد استاندارد:</span>
                  <span className="px-3 py-1 rounded-lg bg-teal-50 text-teal-900 border border-teal-300 font-black text-sm">
                    {selectedIssue.suggestion}
                  </span>
                  <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    {selectedIssue.ruleLabel}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAcceptIssueSuggestion(selectedIssue)}
                    className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>جایگزینی با «{selectedIssue.suggestion}»</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDismissIssue(selectedIssue)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    نادیده گرفتن
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Proposal #2: Real-Time Laterality (Right vs Left) Safety Alert Banner */}
        {lateralityMismatches.length > 0 && (
          <div className="bg-rose-50/95 border-2 border-rose-400 rounded-2xl p-2.5 shadow-sm flex items-center justify-between flex-wrap gap-2 animate-fadeIn">
            <div className="flex items-center gap-2 text-xs text-rose-950">
              <div className="w-7 h-7 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="font-black text-rose-900">
                  {lateralityMismatches[0].warningText}
                </div>
                <div className="text-[11px] text-rose-700">
                  جهت جلوگیری از خطای پزشکی (Wrong-Side Error)، لطفاً جهت چپ/راست را بررسی یا با یک کلیک اصلاح نمایید.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                handleAutoFixLaterality(
                  lateralityMismatches[0].studyId,
                  lateralityMismatches[0].expectedSide
                )
              }
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Check className="w-3.5 h-3.5" />
              <span>
                اصلاح خودکار به «سمت {lateralityMismatches[0].expectedSideLabel}»
              </span>
            </button>
          </div>
        )}

        {/* Proposal #12: Printed Report Security Lock Banner */}
        {isReportLocked && (
          <div className="bg-amber-50/95 border border-amber-300 rounded-xl px-3 py-1.5 shadow-2xs flex items-center justify-between flex-wrap gap-2 animate-fadeIn">
            <div className="flex items-center gap-2 text-xs text-amber-950">
              <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold">
                این گزارش قبلاً چاپ و نهایی شده و جهت جلوگیری از تغییر ناخواسته قفل است.
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {reportRevisions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsVersionHistoryModalOpen(true)}
                  className="h-7 px-2.5 bg-white hover:bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <History className="w-3 h-3 text-indigo-600" />
                  <span>نسخه‌های قبلی ({reportRevisions.length})</span>
                </button>
              )}
              {onUnlockReportForAddendum && (
                <button
                  type="button"
                  onClick={onUnlockReportForAddendum}
                  className="h-7 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Unlock className="w-3 h-3" />
                  <span>باز کردن قفل جهت ثبت اصلاحیه (Addendum)</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Compact Floating Selection Formatting Toolbar (نوار ابزار شناور فشرده بالای متن انتخابی) */}
      {floatingToolbarPos && (
        <div
          ref={floatingToolbarRef}
          dir="rtl"
          style={{
            position: 'fixed',
            top: `${floatingToolbarPos.top}px`,
            left: `${floatingToolbarPos.left}px`,
            right: 'auto',
            zIndex: 90,
          }}
          onMouseEnter={() => {
            isInteractingWithFloatingRef.current = true;
          }}
          onMouseLeave={() => {
            isInteractingWithFloatingRef.current = false;
          }}
          className="bg-slate-900/95 backdrop-blur-md text-white px-2 py-1 rounded-xl shadow-2xl border border-slate-700/90 flex items-center gap-1 whitespace-nowrap max-w-[calc(100vw-24px)] overflow-x-auto no-scrollbar animate-scaleIn no-print"
        >
          {/* ۱. انتخاب قلم (Font Family - فشرده) */}
          <select
            value={floatingFontName}
            onFocus={() => {
              isInteractingWithFloatingRef.current = true;
            }}
            onBlur={() => {
              isInteractingWithFloatingRef.current = false;
            }}
            onChange={(e) => {
              const chosenFont = e.target.value;
              setFloatingFontName(chosenFont);
              executeFloatingFormat('fontName', chosenFont);
            }}
            title="انتخاب قلم متن انتخاب‌شده"
            className="h-6 text-[11px] px-1.5 rounded-lg bg-slate-800 text-white border border-slate-600 focus:border-teal-400 focus:outline-none font-bold cursor-pointer"
          >
            <option value="Vazirmatn">وزیرمتن</option>
            <option value="IRANSans">ایران‌سنس</option>
            <option value="Shabnam">شبنم</option>
            <option value="Samim">صمیم</option>
            <option value="Sahel">ساحل</option>
            <option value="Noto Sans Arabic">نوتو سنس</option>
            <option value="B Nazanin">بی‌نازنین</option>
            <option value="B Mitra">بی‌میترا</option>
            <option value="B Lotus">بی‌لوتوس</option>
            <option value="B Zar">بی‌زر</option>
            <option value="Tahoma">تاهوما</option>
            <option value="Arial">Arial</option>
          </select>

          {/* ۲. سایز قلم (Font Size - فقط عدد جهت کوچک شدن نوار) */}
          <select
            value={floatingFontSize}
            onFocus={() => {
              isInteractingWithFloatingRef.current = true;
            }}
            onBlur={() => {
              isInteractingWithFloatingRef.current = false;
            }}
            onChange={(e) => {
              const val = e.target.value;
              setFloatingFontSize(val);
              executeFloatingFormat('fontSize', val);
            }}
            title="سایز قلم متن انتخاب‌شده"
            className="h-6 w-12 text-[11px] px-1 rounded-lg bg-slate-800 text-white border border-slate-600 focus:border-teal-400 focus:outline-none font-bold text-center cursor-pointer"
          >
            <option value="2">۱۲</option>
            <option value="3">۱۴</option>
            <option value="4">۱۶</option>
            <option value="5">۱۸</option>
            <option value="6">۲۰</option>
          </select>

          <div className="h-3.5 w-px bg-slate-700 mx-0.5" />

          {/* ۳. درشت، کج، زیرخط */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeFloatingFormat('bold')}
            className="w-6 h-6 rounded-lg hover:bg-slate-700 flex items-center justify-center cursor-pointer"
            title="درشت (Bold)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeFloatingFormat('italic')}
            className="w-6 h-6 rounded-lg hover:bg-slate-700 flex items-center justify-center cursor-pointer"
            title="کج (Italic)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeFloatingFormat('underline')}
            className="w-6 h-6 rounded-lg hover:bg-slate-700 flex items-center justify-center cursor-pointer"
            title="زیرخط (Underline)"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>

          <div className="h-3.5 w-px bg-slate-700 mx-0.5" />

          {/* ۴. تراز متن و جاستیفای (فقط آیکون، بدون متن اضافه) */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeFloatingFormat('justifyRight')}
            className="w-6 h-6 rounded-lg hover:bg-slate-700 flex items-center justify-center cursor-pointer"
            title="راست‌چین (Align Right)"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeFloatingFormat('justifyCenter')}
            className="w-6 h-6 rounded-lg hover:bg-slate-700 flex items-center justify-center cursor-pointer"
            title="وسط‌چین (Align Center)"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeFloatingFormat('justifyLeft')}
            className="w-6 h-6 rounded-lg hover:bg-slate-700 flex items-center justify-center cursor-pointer"
            title="چپ‌چین (Align Left)"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeFloatingFormat('justifyFull')}
            className="w-6 h-6 rounded-lg bg-teal-600/30 hover:bg-teal-600 text-teal-200 hover:text-white border border-teal-500/40 flex items-center justify-center cursor-pointer"
            title="تراز دوطرفه / جاستیفای کامل خطوط (Justify)"
          >
            <AlignJustify className="w-3.5 h-3.5" />
          </button>

          <div className="h-3.5 w-px bg-slate-700 mx-0.5" />

          {/* ۵. جهت متن (RTL / LTR) */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFloatingDirection('rtl')}
            className="h-6 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold border border-slate-600 cursor-pointer"
            title="جهت متن: راست به چپ (فارسی - RTL)"
          >
            RTL
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFloatingDirection('ltr')}
            className="h-6 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold border border-slate-600 cursor-pointer"
            title="جهت متن: چپ به راست (انگلیسی - LTR)"
          >
            LTR
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              executeFloatingFormat('removeFormat');
            }}
            className="w-6 h-6 rounded-lg hover:bg-rose-600/80 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
            title="پاک کردن فرمت متن"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Grid: Supports Standard View (9+3), Zen Full-Width View (12), or Split-Screen Comparison View (7+5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 2xl:gap-7">
        {/* Split-Screen Prior Report Comparison Panel (Shown when isSplitComparisonOpen is true) */}
        {isSplitComparisonOpen && (
          <div className="lg:col-span-5 bg-white rounded-2xl border-2 border-indigo-200 shadow-md overflow-hidden flex flex-col max-h-[820px] animate-fadeIn">
            <div className="p-3.5 bg-indigo-950 text-white flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Columns className="w-4 h-4 text-indigo-300 shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-xs font-black truncate">
                    نمای دوبرگه: مقایسه با گزارش پیشین بیمار
                  </h4>
                  <p className="text-[10px] text-indigo-200 truncate">
                    مشاهده همزمان سابقه قبلی و کپی مستقیم به بخش Comparison
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSplitComparisonOpen(false)}
                className="h-7 px-2 rounded-lg bg-white/10 hover:bg-rose-600 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>بستن</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-3 bg-indigo-50/70 border-b border-indigo-100 space-y-2">
              <label className="block text-[11px] font-bold text-indigo-950">
                انتخاب گزارش قبلی از آرشیو جهت مقایسه:
              </label>
              <select
                value={activePriorReport?.id || ''}
                onChange={(e) => setSelectedPriorReportId(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-indigo-200 bg-white font-bold text-slate-800"
              >
                {patientPriorReports.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.patientInfo?.fullName || 'بیمار'} — تاریخ: {rep.patientInfo?.reportDate} —{' '}
                    {rep.studies?.[0]?.titleAndTechnique?.slice(0, 38) || 'گزارش تصویربرداری'}
                  </option>
                ))}
              </select>
            </div>

            {activePriorReport ? (
              <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
                <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500">بیمار: </span>
                    <strong className="text-slate-900">{activePriorReport.patientInfo?.fullName}</strong>
                    <span className="mx-2 text-slate-300">|</span>
                    <span className="text-slate-500">تاریخ قبلی: </span>
                    <strong className="font-mono text-indigo-800">
                      {activePriorReport.patientInfo?.reportDate}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyPriorToComparison(activePriorReport)}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <Copy className="w-3 h-3" />
                    <span>+ درج در بخش Comparison فعلی</span>
                  </button>
                </div>

                {activePriorReport.studies?.map((st, sIdx) => (
                  <div
                    key={st.id || sIdx}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2"
                  >
                    <div className="font-black text-indigo-950 border-b border-slate-100 pb-1.5">
                      {st.titleAndTechnique}
                    </div>
                    <div
                      className="prose prose-slate max-w-none text-xs leading-relaxed text-slate-700"
                      dangerouslySetInnerHTML={{ __html: st.findingsHtml }}
                    />
                    {st.impressionHtml && (
                      <div className="p-2.5 rounded-lg bg-teal-50/70 border border-teal-200 text-teal-950 font-semibold">
                        <div className="text-[11px] font-black mb-1">نتیجه‌گیری قبلی:</div>
                        <div dangerouslySetInnerHTML={{ __html: st.impressionHtml }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500">
                گزارشی در آرشیو یافت نشد.
              </div>
            )}
          </div>
        )}

        {/* Studies List (Supports Multiple Imaging Procedures per Patient) */}
        <div
          className={`${
            isSplitComparisonOpen
              ? 'lg:col-span-7'
              : zenMode
              ? 'lg:col-span-12'
              : 'lg:col-span-9'
          } space-y-6 transition-all duration-200`}
        >
          {studies.map((study, index) => {
            const isActive = study.id === activeStudyId;
            const sTheme = modalityThemes[study.modality] || modalityThemes.sonography;

            return (
              <div
                key={study.id}
                onClick={() => setActiveStudyId(study.id)}
                className={`bg-white rounded-2xl shadow-xs border transition-all duration-200 overflow-hidden divide-y divide-slate-100 ${
                  isActive ? sTheme.activeCardRing : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Study Header Strip Harmonized with Study Modality Color + Integrated Title & Protocol */}
                <div
                  className={`px-3.5 py-2.5 text-white transition-colors duration-200 space-y-1.5 ${sTheme.studyHeaderBg}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span
                        className={`w-5 h-5 rounded-md font-black text-[11px] flex items-center justify-center shadow-2xs shrink-0 ${sTheme.studyBadge}`}
                      >
                        {index + 1}
                      </span>
                      <span className="font-bold text-xs text-white">
                        بررسی شماره {index + 1} ({modalityNames[study.modality]})
                      </span>
                    </label>

                    {/* Delete study button (only if more than 1 study exists) */}
                    {studies.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveStudy(study.id);
                        }}
                        className="h-6 w-6 flex items-center justify-center text-slate-300 hover:text-rose-400 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer shrink-0"
                        title="حذف این تصویربرداری"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <textarea
                    ref={(el) => {
                      titleRefs.current[study.id] = el;
                    }}
                    readOnly={isReportLocked}
                    value={study.titleAndTechnique}
                    onChange={(e) => {
                      if (isReportLocked) return;
                      onUpdateStudy(study.id, { titleAndTechnique: e.target.value });
                    }}
                    onKeyDown={(e) => {
                      if (isReportLocked) return;
                      handleTitleKeyDown(e, study);
                    }}
                    placeholder="عنوان دقیق تصویربرداری، پروتکل، سکانس‌ها و شرایط انجام را اینجا بنویسید..."
                    rows={
                      (study.titleAndTechnique || '').length > 90 ||
                      (study.titleAndTechnique || '').includes('\n')
                        ? 2
                        : 1
                    }
                    style={{
                      fontFamily: headingFont,
                      fontSize: `${Math.round((((parseInt(headingFontSize, 10) || 16) + 3) * editorZoom) / 100)}px`,
                    }}
                    className={`study-header-protocol-input w-full font-bold px-3 py-1.5 rounded-xl border leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-teal-400 placeholder:text-slate-400 transition-colors ${
                      isReportLocked ? 'opacity-80 cursor-not-allowed' : ''
                    }`}
                  />
                </div>

                {/* Section 2: یافته‌های تصویربرداری (طراحی تمیز، کم‌فاصله و نوار فوق‌باریک تراز کاغذ A4 در همان سطر) */}
                <div className="px-4 pt-2 pb-4 min-h-[340px] bg-white relative">
                  <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b border-slate-100 flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-teal-500" />
                      <h4 className="text-xs font-bold text-slate-600">
                        یافته‌های تصویربرداری
                      </h4>
                    </div>

                    {/* Ultra-Slim Single-Line A4 Page Capacity Indicator + Optional Number Slots Button */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {numberSlotsEnabled && (
                        <button
                          type="button"
                          onClick={() => handleAutoWrapStudyNumbers(study)}
                          className="h-6 text-[10px] bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 px-2 rounded-md font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="استخراج خودکار اعداد این گزارش در کادرهای جایگذاری بالا"
                        >
                          <Hash className="w-3 h-3 text-sky-600" />
                          <span>استخراج اعداد</span>
                        </button>
                      )}

                      {/* Compact Single-Line A4 Page Meter (Proposal #6 - Minimal & Clean) */}
                      <div
                        className={`h-6 px-2 rounded-lg border inline-flex items-center gap-2 text-[10.5px] transition-colors ${
                          a4PageMetrics.status === 'overflow'
                            ? 'bg-rose-50 border-rose-200 text-rose-900'
                            : a4PageMetrics.status === 'near-full'
                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                            : 'bg-slate-50 border-slate-200/90 text-slate-600'
                        }`}
                        title="تراز هوشمند کاغذ چاپ A4 (بر اساس سربرگ، خطوط گزارش و کادر امضای پزشک)"
                      >
                        <span className="font-bold whitespace-nowrap">
                          {a4PageMetrics.status === 'overflow'
                            ? `${a4PageMetrics.totalPages} برگه A4 (+${a4PageMetrics.overflowLinesPage2} خط در برگه ${a4PageMetrics.totalPages})`
                            : `صفحه ۱ A4 (${a4PageMetrics.remainingLinesPage1} خط مانده)`}
                        </span>

                        <div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden shrink-0">
                          <div
                            style={{ width: `${a4PageMetrics.visualBarPercent}%` }}
                            className={`h-full rounded-full transition-all duration-300 ${
                              a4PageMetrics.status === 'overflow'
                                ? 'bg-rose-500'
                                : a4PageMetrics.status === 'near-full'
                                ? 'bg-amber-500'
                                : 'bg-teal-500'
                            }`}
                          />
                        </div>

                        <span className="font-mono font-bold text-[10px]">
                          {a4PageMetrics.fillPercent}%
                        </span>

                        {(a4PageMetrics.fillPercent >= 88 || a4PageMetrics.status === 'overflow') &&
                          defaultFontSize > 12 &&
                          onChangeDefaultFontSize && (
                            <button
                              type="button"
                              onClick={() => {
                                const targetSize = a4PageMetrics.fillPercent > 112 ? 12 : 13;
                                onChangeDefaultFontSize(targetSize);
                              }}
                              className="h-4 px-1.5 rounded bg-slate-900 hover:bg-teal-700 text-white text-[9.5px] font-bold transition-colors cursor-pointer whitespace-nowrap"
                              title="فشرده‌سازی خودکار سایز قلم چاپ جهت جا شدن در ۱ برگه A4"
                            >
                              جا دادن در ۱ صفحه
                            </button>
                          )}

                        {defaultFontSize < 14 && onChangeDefaultFontSize && (
                          <button
                            type="button"
                            onClick={() => onChangeDefaultFontSize(14)}
                            className="h-4 px-1.5 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[9.5px] font-bold transition-colors cursor-pointer whitespace-nowrap"
                            title="بازگرداندن سایز قلم چاپ به ۱۴"
                          >
                            ↺ قلم ۱۴
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 
                    QUICK NUMBER & MEASUREMENT FILLER BAR (جایگذاری سریع اعداد بدون به هم ریختن متن)
                    Only shown when numberSlotsEnabled is enabled in Settings!
                  */}
                  {numberSlotsEnabled && (() => {
                    const { slots } = normalizeAndExtractSlots(study.findingsHtml);
                    if (slots.length === 0) return null;

                    return (
                      <div className="mb-3 p-2.5 bg-sky-50/80 border border-sky-200 rounded-xl space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <div className="flex items-center gap-1.5 text-xs font-extrabold text-sky-950">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-600" />
                            <span>جایگذاری سریع اعداد و اندازه‌های گزارش:</span>
                          </div>
                          <span className="text-[10px] text-sky-700 font-medium">
                            با کلید Enter یا Tab به عدد بعدی بروید
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          {slots.map((slot, sIdx) => {
                            const isSlotActive = activeSlotId === slot.id;
                            return (
                              <div
                                key={slot.id}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-all bg-white ${
                                  isSlotActive
                                    ? 'border-sky-600 ring-2 ring-sky-500/20 shadow-xs'
                                    : 'border-sky-200 hover:border-sky-400'
                                }`}
                              >
                                <label
                                  htmlFor={`input-${slot.id}`}
                                  className="text-[11px] font-bold text-slate-700 whitespace-nowrap cursor-pointer"
                                >
                                  {slot.label}:
                                </label>
                                <input
                                  id={`input-${slot.id}`}
                                  ref={(el) => {
                                    slotInputRefs.current[slot.id] = el;
                                  }}
                                  type="text"
                                  dir="ltr"
                                  value={slot.value}
                                  onFocus={(e) => {
                                    setActiveSlotId(slot.id);
                                    e.currentTarget.select();
                                  }}
                                  onChange={(e) => handleUpdateSlotValue(study, slot.id, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const nextSlot = slots[sIdx + 1];
                                      if (nextSlot && slotInputRefs.current[nextSlot.id]) {
                                        slotInputRefs.current[nextSlot.id]?.focus();
                                        slotInputRefs.current[nextSlot.id]?.select();
                                      }
                                    }
                                  }}
                                  className="w-24 text-xs font-mono font-extrabold text-sky-900 bg-sky-50/70 focus:bg-white px-2 py-0.5 rounded-lg border border-sky-200 focus:border-sky-500 text-center focus:outline-none"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Live Floating Auto-Expander Hint Banner when typing `.xyz` */}
                  {isActive && pendingShortcutMatch && (
                    <div className="mb-2 p-2 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-xs text-amber-950 shadow-xs animate-fadeIn">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="px-2 py-0.5 bg-amber-500 text-white font-mono font-bold rounded text-xs shrink-0">
                          {pendingShortcutMatch.trigger}
                        </span>
                        <span className="font-bold shrink-0">{pendingShortcutMatch.label}:</span>
                        <span className="text-slate-700 truncate italic">
                          «{pendingShortcutMatch.expansion}»
                        </span>
                      </div>
                      <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-amber-300 text-amber-900 shrink-0 mr-2">
                        کلید Space یا Tab را بزنید ↹
                      </span>
                    </div>
                  )}

                  {/* ContentEditable Area */}
                  <div
                    ref={(el) => {
                      findingsRefs.current[study.id] = el;
                    }}
                    contentEditable={!isReportLocked}
                    dir={activeDirection}
                    onClick={(e) => handleEditorClick(e, study.id)}
                    onFocus={() => setActiveStudyId(study.id)}
                    onInput={() => {
                      if (isReportLocked) return;
                      handleFindingsInput(study);
                    }}
                    onKeyDown={(e) => {
                      if (isReportLocked) return;
                      handleFindingsKeyDown(e, study);
                    }}
                    className={`max-w-none min-h-[260px] p-1.5 focus:outline-none text-slate-800 selection:bg-teal-200 border-none high-visibility-editor ${
                      isReportLocked ? 'opacity-85 cursor-not-allowed' : ''
                    }`}
                    style={{
                      fontFamily: `${defaultFont}, 'Vazirmatn', sans-serif`,
                      fontSize: `${Math.round((((defaultFontSize || 14) + 6) * editorZoom) / 100)}px`,
                      lineHeight: editorLineHeight || 1.9,
                      direction: activeDirection,
                      textAlign: activeDirection === 'rtl' ? 'right' : 'left',
                    }}
                    data-placeholder="یافته‌های این تصویربرداری را اینجا تایپ کنید..."
                  />

                  {/* Smart Next-Sentence Ghost Bar (for active study) */}
                  {smartSuggestionsEnabled && isActive && ghostSuggestion && (
                    <div className="mt-4 p-3 bg-linear-to-r from-teal-50/90 via-emerald-50/70 to-teal-50/90 border border-teal-200/90 rounded-xl flex items-center justify-between text-xs text-teal-900 shadow-2xs animate-fadeIn">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <div className="truncate">
                          <span className="font-bold text-teal-800 ml-1.5">پیشنهاد هوشمند جمله بعدی:</span>
                          <span className="text-slate-700 italic">«{ghostSuggestion}»</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => insertSuggestionAtCursor(` ${ghostSuggestion} `, study.id)}
                          className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow-2xs flex items-center gap-1 text-[11px] transition-transform active:scale-95 cursor-pointer"
                        >
                          <span>افزودن</span>
                          <kbd className="bg-teal-800 text-teal-100 px-1 rounded text-[9px] font-mono">Tab ↹</kbd>
                        </button>
                        <button
                          type="button"
                          onClick={() => setGhostSuggestion('')}
                          className="text-slate-400 hover:text-slate-600 px-1 text-xs cursor-pointer"
                          title="رد پیشنهاد"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Multiple Context Suggestions Pills */}
                  {smartSuggestionsEnabled && isActive && activeSuggestions.length > 1 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-slate-500 font-medium">سایر پیشنهادات:</span>
                      {activeSuggestions.slice(1).map((sug, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => insertSuggestionAtCursor(` ${sug} `, study.id)}
                          className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-900 text-slate-700 rounded-lg border border-slate-200 hover:border-teal-300 transition-colors text-right max-w-sm truncate cursor-pointer"
                          title={sug}
                        >
                          + {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 3: اطلاعات بیشتر و بخش‌های تکمیلی (مقایسه، نتیجه‌گیری، توصیه‌ها) - نوار فوق‌باریک تک‌خطی */}
                <div className="border-t border-slate-200 bg-slate-50/80">
                  <button
                    type="button"
                    onClick={() => toggleMoreInfo(study.id)}
                    className="w-full h-7 px-3 flex items-center justify-between text-right hover:bg-slate-100 transition-colors duration-150 cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {expandedMoreInfo[study.id] ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-800 shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-800 shrink-0" />
                      )}
                      <span className="text-[11px] font-bold text-slate-600 group-hover:text-slate-900 truncate">
                        اطلاعات بیشتر و بخش‌های تکمیلی (مقایسه، نتیجه‌گیری، توصیه‌ها)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {study.showComparison && (
                        <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 font-semibold">
                          مقایسه ✓
                        </span>
                      )}
                      {study.showImpression && (
                        <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-semibold">
                          نتیجه‌گیری ✓
                        </span>
                      )}
                      {study.showRecommendations && (
                        <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold">
                          توصیه‌ها ✓
                        </span>
                      )}
                      <span className="text-[10px] font-semibold text-slate-400 group-hover:text-teal-700">
                        {expandedMoreInfo[study.id] ? 'بستن' : 'باز کردن'}
                      </span>
                    </div>
                  </button>

                  {expandedMoreInfo[study.id] && (
                    <div className="p-4 sm:p-5 bg-white border-t border-slate-200/80 divide-y divide-slate-100 space-y-3 animate-fadeIn">
                      {/* 1. مقایسه با تصاویر پیشین */}
                      <div className="pb-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <label
                            onClick={() => onUpdateStudy(study.id, { showComparison: !study.showComparison })}
                            className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700 hover:text-slate-900"
                          >
                            <input
                              type="checkbox"
                              checked={study.showComparison}
                              onChange={(e) => onUpdateStudy(study.id, { showComparison: e.target.checked })}
                              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                            />
                            <GitCompare className="w-3.5 h-3.5 text-slate-500" />
                            <span>مقایسه با تصاویر پیشین (Comparison)</span>
                          </label>
                          <span className="text-[10px] text-slate-400">
                            {study.showComparison ? 'فعال' : 'غیرفعال (مخفی)'}
                          </span>
                        </div>

                        {study.showComparison && (
                          <div className="mt-2 animate-fadeIn">
                            <input
                              type="text"
                              value={study.comparison}
                              onChange={(e) => onUpdateStudy(study.id, { comparison: e.target.value })}
                              placeholder="شرح بررسی پیشین و مقایسه تغییرات..."
                              style={{
                                fontSize: `${Math.round((((defaultFontSize || 14) + 4) * editorZoom) / 100)}px`,
                              }}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-teal-500 bg-white high-visibility-editor"
                            />
                          </div>
                        )}
                      </div>

                      {/* 2. نتیجه‌گیری و جمع‌بندی نهایی */}
                      <div className="pt-3 pb-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <label
                            onClick={() => onUpdateStudy(study.id, { showImpression: !study.showImpression })}
                            className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-800 hover:text-slate-900"
                          >
                            <input
                              type="checkbox"
                              checked={study.showImpression}
                              onChange={(e) => onUpdateStudy(study.id, { showImpression: e.target.checked })}
                              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                            />
                            <ShieldCheck className="w-4 h-4 text-indigo-600" />
                            <span>نتیجه‌گیری و جمع‌بندی نهایی (Impression / Conclusion)</span>
                          </label>

                          {study.showImpression && (
                            <button
                              type="button"
                              onClick={() => handleGenerateImpression(study)}
                              disabled={generatingImpressionId === study.id || !study.findingsHtml}
                              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-xl bg-linear-to-r from-indigo-600 to-teal-600 text-white hover:from-indigo-700 hover:to-teal-700 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                            >
                              <Wand2
                                className={`w-3.5 h-3.5 ${generatingImpressionId === study.id ? 'animate-spin' : ''}`}
                              />
                              <span>
                                {generatingImpressionId === study.id
                                  ? 'در حال استخراج...'
                                  : 'تولید هوشمند نتیجه‌گیری از یافته‌ها'}
                              </span>
                            </button>
                          )}
                        </div>

                        {study.showImpression && (
                          <div className="mt-2 animate-fadeIn">
                            <div
                              contentEditable
                              dir={activeDirection}
                              dangerouslySetInnerHTML={{ __html: study.impressionHtml }}
                              onInput={(e) => onUpdateStudy(study.id, { impressionHtml: e.currentTarget.innerHTML })}
                              onKeyDown={(e) => {
                                if (e.key === ' ' || e.key === 'Tab') {
                                  const res = expandShortcutInContentEditable(e.currentTarget, shortcuts);
                                  if (res.expanded) {
                                    e.preventDefault();
                                    onUpdateStudy(study.id, { impressionHtml: e.currentTarget.innerHTML });
                                  }
                                }
                              }}
                              className="max-w-none min-h-[90px] p-3 rounded-xl bg-slate-50/50 border border-slate-200 focus:border-teal-500 focus:outline-none text-slate-800 shadow-inner high-visibility-editor"
                              style={{
                                fontFamily: `${defaultFont}, 'Vazirmatn', sans-serif`,
                                fontSize: `${Math.round((((defaultFontSize || 14) + 5) * editorZoom) / 100)}px`,
                                lineHeight: editorLineHeight || 1.9,
                                direction: activeDirection,
                                textAlign: activeDirection === 'rtl' ? 'right' : 'left',
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* 3. توصیه‌ها و پیگیری */}
                      <div className="pt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <label
                            onClick={() => onUpdateStudy(study.id, { showRecommendations: !study.showRecommendations })}
                            className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700 hover:text-slate-900"
                          >
                            <input
                              type="checkbox"
                              checked={study.showRecommendations}
                              onChange={(e) => onUpdateStudy(study.id, { showRecommendations: e.target.checked })}
                              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                            />
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>توصیه‌ها و پیگیری (Recommendations & Follow-up)</span>
                          </label>
                          <span className="text-[10px] text-slate-400">
                            {study.showRecommendations ? 'فعال' : 'غیرفعال (مخفی)'}
                          </span>
                        </div>

                        {study.showRecommendations && (
                          <div className="mt-2 animate-fadeIn">
                            <div
                              contentEditable
                              dir={activeDirection}
                              dangerouslySetInnerHTML={{ __html: study.recommendationsHtml }}
                              onInput={(e) => onUpdateStudy(study.id, { recommendationsHtml: e.currentTarget.innerHTML })}
                              onKeyDown={(e) => {
                                if (e.key === ' ' || e.key === 'Tab') {
                                  const res = expandShortcutInContentEditable(e.currentTarget, shortcuts);
                                  if (res.expanded) {
                                    e.preventDefault();
                                    onUpdateStudy(study.id, { recommendationsHtml: e.currentTarget.innerHTML });
                                  }
                                }
                              }}
                              className="max-w-none min-h-[60px] p-2.5 rounded-lg bg-slate-50/50 border border-slate-200 focus:border-teal-500 focus:outline-none high-visibility-editor"
                              style={{
                                fontFamily: `${defaultFont}, 'Vazirmatn', sans-serif`,
                                fontSize: `${Math.round((((defaultFontSize || 14) + 4.5) * editorZoom) / 100)}px`,
                                lineHeight: editorLineHeight || 1.9,
                                direction: activeDirection,
                                textAlign: activeDirection === 'rtl' ? 'right' : 'left',
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Ultra-Slim Single-Line Bar to Add Next Imaging Study for the Same Patient */}
          <div className="py-1.5 px-3 bg-white border border-dashed border-slate-300 hover:border-teal-400 rounded-xl flex items-center justify-between flex-wrap gap-2 shadow-2xs transition-colors">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Plus className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>افزودن تصویربرداری / گزارش بعدی برای همین بیمار:</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onAddStudy('sonography')}
                className="h-7 px-2.5 bg-sky-50 hover:bg-sky-600 text-sky-800 hover:text-white border border-sky-200 hover:border-sky-600 rounded-lg text-[11px] font-bold transition-all cursor-pointer active:scale-95"
              >
                + سونوگرافی
              </button>
              <button
                type="button"
                onClick={() => onAddStudy('mri')}
                className="h-7 px-2.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-800 hover:text-white border border-indigo-200 hover:border-indigo-600 rounded-lg text-[11px] font-bold transition-all cursor-pointer active:scale-95"
              >
                + ام‌آر‌آی
              </button>
              <button
                type="button"
                onClick={() => onAddStudy('ct')}
                className="h-7 px-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-200 hover:border-emerald-600 rounded-lg text-[11px] font-bold transition-all cursor-pointer active:scale-95"
              >
                + سی‌تی‌اسکن
              </button>
            </div>
          </div>
        </div>

        {/* Side Quick Actions & Fast Macro Sidebar (3 cols on desktop, hidden in Zen Mode or Split Comparison Mode) */}
        {!zenMode && !isSplitComparisonOpen && (
          <div
            style={{
              top: 'calc(var(--navbar-height, 102px) + var(--tabsbar-height, 44px) + var(--quickbar-height, 96px) + 12px)',
            }}
            className="lg:col-span-3 lg:sticky lg:self-start space-y-4"
          >
            {/* Quick Shortcuts & Macro Bar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <h4 className="text-xs font-bold text-slate-900">جایگزینی آنی با کلید Space</h4>
                </div>
                <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-mono">
                  کد + Space
                </span>
              </div>

              <p className="text-[11px] text-slate-500 mb-2 leading-normal">
                کد اختصاری را در متن تایپ کرده و کلید <strong>Space</strong> را بزنید (یا کلید ترکیبی مثل{' '}
                <strong>Alt+T</strong> را بفشارید):
              </p>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 mb-2.5">
                <button
                  onClick={() => setQuickMacroFilter('all')}
                  className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                    quickMacroFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  همه
                </button>
                <button
                  onClick={() => setQuickMacroFilter('normal')}
                  className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                    quickMacroFilter === 'normal'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  نرمال
                </button>
                <button
                  onClick={() => setQuickMacroFilter('pathology')}
                  className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                    quickMacroFilter === 'pathology'
                      ? 'bg-rose-700 text-white'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                  }`}
                >
                  پاتولوژی
                </button>
              </div>

              {/* Shortcut Cards List */}
              <div className="space-y-1.5 max-h-[460px] 2xl:max-h-[calc(100vh-340px)] overflow-y-auto pr-0.5">
                {filteredShortcuts.slice(0, 18).map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => insertShortcut(sc)}
                    className="w-full text-right p-2 rounded-xl border border-slate-100 hover:border-teal-300 hover:bg-teal-50/60 transition-all group flex items-start justify-between gap-2 bg-slate-50/50 cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-800 group-hover:text-teal-900 flex items-center gap-1.5">
                        <span>{sc.label}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                        {sc.expansion}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        dir="ltr"
                        className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100/80 text-amber-900 border border-amber-300"
                      >
                        {sc.trigger}
                      </span>
                      {sc.hotkey && (
                        <span
                          dir="ltr"
                          className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-indigo-50 text-indigo-800 border border-indigo-200"
                        >
                          {sc.hotkey}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Proposal #12: Version History Inspection & Restore Modal */}
      {isVersionHistoryModalOpen && (
        <div className="fixed inset-0 z-[80] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scaleIn">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-teal-400" />
                <div>
                  <h4 className="text-xs sm:text-sm font-black">
                    تاریخچه نسخه‌ها و اصلاحیه‌های گزارش ({patientInfo.fullName || 'بیمار فعلی'})
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    مشاهده تمامی نسخه‌های ذخیره‌شده و چاپ‌شده قبلی با قابلیت بازگردانی فوری
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVersionHistoryModalOpen(false)}
                className="h-7 px-2.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>بستن</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-slate-50">
              {reportRevisions.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  هنوز تاریخچه‌ای برای این گزارش ثبت نشده است.
                </div>
              ) : (
                reportRevisions
                  .slice()
                  .reverse()
                  .map((rev, idx) => (
                    <div
                      key={rev.id || idx}
                      className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[11px] font-black">
                            نسخه {rev.version}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {rev.note || 'ثبت گزارش'}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            ({rev.savedAtFa})
                          </span>
                          <span className="text-[11px] bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded font-semibold">
                            تایپیست: {rev.typistName}
                          </span>
                        </div>

                        {onRestoreReportRevision && (
                          <button
                            type="button"
                            onClick={() => {
                              onRestoreReportRevision(rev);
                              setIsVersionHistoryModalOpen(false);
                            }}
                            className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[11px] font-bold cursor-pointer flex items-center gap-1 shadow-2xs"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>بازگردانی به این نسخه</span>
                          </button>
                        )}
                      </div>

                      {rev.studies?.map((st, sIdx) => (
                        <div key={st.id || sIdx} className="text-xs space-y-1">
                          <div className="font-bold text-slate-800">{st.titleAndTechnique}</div>
                          <div
                            className="text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100"
                            dangerouslySetInnerHTML={{ __html: st.findingsHtml }}
                          />
                        </div>
                      ))}
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
